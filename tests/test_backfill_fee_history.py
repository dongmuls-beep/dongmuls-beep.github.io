"""Unit tests for scripts/backfill_fee_history.py (BACK-01..03). No git access."""

import copy
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))

import backfill_fee_history as bf  # noqa: E402
import build_fee_history as fh  # noqa: E402

FIELDS = ["총보수", "기타비용", "매매중개수수료", "실부담비용"]


def row(code="C001", name="ETF1", total=0.1, other=0.05, sell=0.02, real=0.17):
    return {
        "종목코드": code,
        "종목명": name,
        "총보수": total,
        "기타비용": other,
        "매매중개수수료": sell,
        "실부담비용": real,
    }


def snap(sha, committed, rows, error=None):
    return {"sha": sha, "committed": committed, "data": rows, "error": error}


def day(n):
    return f"2026-03-{n:02d}T10:00:00+09:00"


def test_to_kst_date():
    assert bf.to_kst_date("2026-05-27T07:35:00Z") == "2026-05-27"
    assert bf.to_kst_date("2026-05-27T15:30:00+00:00") == "2026-05-28"
    assert bf.to_kst_date("2026-02-12T23:59:00+09:00") == "2026-02-12"


def test_normalize_rows_typo_and_zfill():
    rows = [
        {"종목코드": "69500", "매매중계수수료": 0.1},
        {"종목코드": "0026S0", "매매중개수수료": 0.2, "매매중계수수료": 9.0},
        {"종목코드": "360200"},
    ]
    orig = copy.deepcopy(rows)
    out = bf.normalize_rows(rows)
    assert rows == orig
    assert out[0]["종목코드"] == "069500"
    assert out[0]["매매중개수수료"] == 0.1
    assert "매매중계수수료" not in out[0]
    assert out[1]["종목코드"] == "0026S0"
    assert out[1]["매매중개수수료"] == 0.2
    assert out[2]["종목코드"] == "360200"


def test_same_day_last_commit_wins():
    good = [row(total=0.1)]
    snaps = [
        snap("a" * 40, day(1), good),
        snap("b" * 40, "2026-03-02T09:00:00+09:00", [row(total=4.0)]),
        snap("c" * 40, "2026-03-02T09:10:00+09:00", [row(total=0.0001)]),
        snap("d" * 40, "2026-03-02T09:20:00+09:00", good),
    ]
    h, rep = bf.replay(snaps)
    assert [s["sha"] for s in rep["superseded"]] == ["b" * 40, "c" * 40]
    vals = [p[1] for f in h["series"]["C001"].values() for p in f]
    assert max(vals) <= 5
    assert h["series"]["C001"]["총보수"] == [["2026-03-01", 0.1]]


def test_date_backwards_skipped():
    snaps = [
        snap("a" * 40, day(5), [row()]),
        snap("b" * 40, day(3), [row(total=0.2)]),
    ]
    h, rep = bf.replay(snaps)
    assert rep["skipped"] == [{"sha": "b" * 40, "date": "2026-03-03", "reason": "date-backwards"}]
    assert h["series"]["C001"]["총보수"] == [["2026-03-05", 0.1]]


def test_parse_error_reason():
    snaps = [snap("a" * 40, day(1), [row()]), snap("b" * 40, day(2), None, error="boom")]
    _, rep = bf.replay(snaps)
    assert rep["skipped"][0]["reason"] == "parse-error: boom"


def test_not_a_list_reason():
    snaps = [
        snap("a" * 40, day(1), [row()]),
        snap("b" * 40, day(2), {"a": 1}),
        snap("c" * 40, day(3), [row(), "x"]),
    ]
    _, rep = bf.replay(snaps)
    assert [s["reason"] for s in rep["skipped"]] == ["not-a-list", "not-a-list"]


def test_row_count_collapse():
    many = [row(code=f"C{i:03d}") for i in range(10)]
    snaps = [snap("a" * 40, day(1), many), snap("b" * 40, day(2), many[:4])]
    _, rep = bf.replay(snaps)
    assert rep["skipped"][0]["reason"] == "row-count-collapse"


def test_out_of_range_reason():
    snaps = [
        snap("a" * 40, day(1), [row()]),
        snap("b" * 40, day(2), [row(total=6.0)]),
        snap("c" * 40, day(3), [row(other=-0.1)]),
    ]
    _, rep = bf.replay(snaps)
    assert [s["reason"] for s in rep["skipped"]] == ["out-of-range", "out-of-range"]


def four(total=0.1, other=0.05, extra_other=None):
    rows = []
    for i in range(4):
        o = other
        if extra_other is not None and i == 0:
            o = extra_other
        rows.append(row(code=f"C00{i}", name=f"E{i}", total=total, other=o))
    return rows


def test_bulk_correction_rebaselines():
    snaps = [
        snap("a" * 40, day(1), four()),
        snap("b" * 40, day(2), four(extra_other=0.06)),
        snap("c" * 40, day(3), four(total=0.2, extra_other=0.06)),
    ]
    h, rep = bf.replay(snaps)
    for i in range(4):
        s = h["series"][f"C00{i}"]
        assert s["총보수"] == [["2026-03-03", 0.2]]
        assert s["실부담비용"] == [["2026-03-03", 0.17]]
    assert h["series"]["C000"]["기타비용"] == [["2026-03-01", 0.05], ["2026-03-02", 0.06]]
    assert len(rep["rebaselines"]) == 1
    rb = rep["rebaselines"][0]
    assert rb["date"] == "2026-03-03"
    assert rb["fields"] == ["총보수", "실부담비용"]


def test_partial_change_no_rebaseline():
    r3 = four()
    r3[0]["총보수"] = 0.3
    snaps = [snap("a" * 40, day(1), four()), snap("b" * 40, day(2), r3)]
    h, rep = bf.replay(snaps)
    assert rep["rebaselines"] == []
    assert h["series"]["C000"]["총보수"] == [["2026-03-01", 0.1], ["2026-03-02", 0.3]]


def test_dropped_codes_pruned():
    snaps = [
        snap("a" * 40, day(1), [row(code="OLD", name="Old"), row()]),
        snap("b" * 40, day(2), [row()]),
    ]
    h, rep = bf.replay(snaps)
    assert "OLD" not in h["series"] and "OLD" not in h["names"]
    assert rep["dropped_codes"] == ["OLD"]


def test_zfill_merges_series():
    snaps = [
        snap("a" * 40, day(1), [row(code="69500", real=0.1)]),
        snap("b" * 40, day(2), [row(code="069500", real=0.2)]),
    ]
    h, rep = bf.replay(snaps)
    assert list(h["series"]) == ["069500"]
    assert h["series"]["069500"]["실부담비용"][0] == ["2026-03-01", 0.1]
    assert rep["dropped_codes"] == []


def test_find_aba():
    def hist(dates):
        return {"series": {"C": {"총보수": [[dates[0], 1.0], [dates[1], 2.0], [dates[2], 1.0]]}}}

    hits = bf.find_aba(hist(["2026-03-01", "2026-03-10", "2026-03-11"]))
    assert len(hits) == 1 and hits[0]["code"] == "C" and hits[0]["field"] == "총보수"
    assert bf.find_aba(hist(["2026-03-01", "2026-03-10", "2026-03-20"])) == []


def test_report_counts_and_validity():
    def rows(**kw):
        return [row(**kw)] + [row(code=f"S{i}", name=f"S{i}") for i in range(3)]

    snaps = [
        snap("a" * 40, day(1), rows()),
        snap("b" * 40, day(2), rows(total=0.2)),
        snap("c" * 40, day(3), rows(total=0.3, sell=0.03)),
    ]
    h, rep = bf.replay(snaps)
    fh.validate_history(h)
    assert rep["points"]["총보수"] == 6
    assert rep["changes"]["총보수"] == 2
    assert rep["changes"]["매매중개수수료"] == 1
    assert rep["days"] == {"count": 3, "first": "2026-03-01", "last": "2026-03-03"}
    _, n = fh.apply_snapshot(h, rows(total=0.3, sell=0.03), "2026-03-04")
    assert n == 0


# ---- Task 2: main / format_report ----


def fixture_snaps():
    return [
        snap("a" * 40, day(1), [row()]),
        snap("b" * 40, day(2), [row(total=0.2)]),
    ]


def test_main_dry_run(monkeypatch, tmp_path, capsys):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(bf, "read_git_snapshots", fixture_snaps)
    assert bf.main(["--dry-run"]) == 0
    assert not (tmp_path / "fee-history.json").exists()
    out = capsys.readouterr().out
    assert "[backfill]" in out and "dry-run" in out


def test_main_writes(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(bf, "read_git_snapshots", fixture_snaps)
    assert bf.main([]) == 0
    text = (tmp_path / "fee-history.json").read_text(encoding="utf-8")
    assert text == fh.dump_history(bf.replay(fixture_snaps())[0])
    import json

    fh.validate_history(json.loads(text))


def test_main_no_usable(monkeypatch, tmp_path, capsys):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        bf, "read_git_snapshots", lambda: [snap("a" * 40, day(1), None, error="bad")]
    )
    assert bf.main([]) == 1
    assert "[ERROR]" in capsys.readouterr().err
    assert not (tmp_path / "fee-history.json").exists()


def test_main_bad_arg(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(bf, "read_git_snapshots", fixture_snaps)
    assert bf.main(["--bogus"]) == 2
    assert not (tmp_path / "fee-history.json").exists()


def test_format_report_sections():
    snaps = [
        snap("a" * 40, day(1), [row(code="OLD", name="Old"), row()]),
        snap("b" * 40, day(2), None, error="boom"),
        snap("c" * 40, day(3), [row()]),
        snap("d" * 40, day(3), [row()]),
    ]
    _, rep = bf.replay(snaps)
    text = bf.format_report(rep)
    for token in [
        "points per field",
        "changes per field",
        "re-baselines: 0",
        "superseded same-day commits: 1",
        "skipped commits: 1",
        "parse-error: boom",
        "dropped codes (absent from latest snapshot): 1",
        "A->B->A within 2 days: 0",
    ]:
        assert token in text
    assert all(line.startswith("[backfill] ") for line in text.splitlines())
