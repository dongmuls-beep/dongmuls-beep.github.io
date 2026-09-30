"""Unit tests for scripts/build_fee_history.py (HIST-01..03)."""

import copy
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))

import build_fee_history as fh  # noqa: E402

D1 = "2026-10-01"
D2 = "2026-10-02"


def row(code="C001", name="ETF1", total=0.1, other=0.05, sell=0.02, real=0.17):
    return {
        "종목코드": code,
        "종목명": name,
        "총보수": total,
        "기타비용": other,
        "매매중개수수료": sell,
        "실부담비용": real,
    }


def seeded(rows=None, date=D1):
    h, _ = fh.apply_snapshot(fh.empty_history(), rows or [row()], date)
    return h


def test_first_snapshot_creates_all_fields():
    h, n = fh.apply_snapshot(fh.empty_history(), [row()], D1)
    assert n == 4
    assert h["names"]["C001"] == "ETF1"
    assert h["series"]["C001"]["총보수"] == [[D1, 0.1]]
    assert h["updatedAt"] == D1
    assert set(h["series"]["C001"]) == set(fh.FIELDS)


def test_next_day_same_values_no_change():
    h = seeded()
    h2, n = fh.apply_snapshot(h, [row()], D2)
    assert n == 0
    assert h2["series"] == h["series"]


def test_only_changed_field_gets_point():
    h = seeded()
    h2, n = fh.apply_snapshot(h, [row(other=0.06)], D2)
    assert n == 1
    s = h2["series"]["C001"]
    assert s["기타비용"] == [[D1, 0.05], [D2, 0.06]]
    for f in ("총보수", "매매중개수수료", "실부담비용"):
        assert len(s[f]) == 1
    assert h2["updatedAt"] == D2


def test_float_noise_ignored():
    h = seeded([row(total=0.3)])
    h2, n = fh.apply_snapshot(h, [row(total=0.1 + 0.2)], D2)
    assert n == 0


def test_string_inputs_parsed():
    h, _ = fh.apply_snapshot(
        fh.empty_history(), [row(total="0.05%", other="1,000")], D1
    )
    assert h["series"]["C001"]["총보수"] == [[D1, 0.05]]
    assert h["series"]["C001"]["기타비용"] == [[D1, 1000.0]]


def test_null_values_skipped_and_previous_kept():
    h = seeded()
    h2, n = fh.apply_snapshot(h, [row(total=None, other="", sell="-")], D2)
    assert n == 0
    assert h2["series"] == h["series"]


def test_null_first_value_creates_no_field():
    h, n = fh.apply_snapshot(fh.empty_history(), [row(total=None)], D1)
    assert "총보수" not in h["series"]["C001"]
    assert n == 3
    h, n = fh.apply_snapshot(
        fh.empty_history(), [row(total=None, other=None, sell=None, real=None)], D1
    )
    assert "C001" not in h["series"]
    assert n == 0


def test_missing_code_untouched():
    h = seeded([row("C001"), row("C002", "ETF2")])
    h2, n = fh.apply_snapshot(h, [row("C001")], D2)
    assert n == 0
    assert h2["series"]["C002"] == h["series"]["C002"]
    assert h2["names"]["C002"] == "ETF2"


def test_same_day_rerun_same_value_noop():
    h = seeded()
    h2, n = fh.apply_snapshot(h, [row()], D1)
    assert n == 0
    assert h2 == h


def test_same_day_rerun_different_value_replaces():
    h = seeded()
    h, _ = fh.apply_snapshot(h, [row(other=0.06)], D2)
    h2, n = fh.apply_snapshot(h, [row(other=0.07)], D2)
    assert n == 1
    assert h2["series"]["C001"]["기타비용"] == [[D1, 0.05], [D2, 0.07]]


def test_same_day_rerun_reverting_removes_point():
    h = seeded()
    h, _ = fh.apply_snapshot(h, [row(other=0.06)], D2)
    h2, n = fh.apply_snapshot(h, [row(other=0.05)], D2)
    assert n == 1
    assert h2["series"]["C001"]["기타비용"] == [[D1, 0.05]]


def test_rename_updates_names_only():
    h = seeded()
    h2, n = fh.apply_snapshot(h, [row(name="NEW")], D2)
    assert n == 0
    assert h2["names"]["C001"] == "NEW"
    assert h2["series"] == h["series"]


def test_alphanumeric_code_and_blank_skipped():
    h, _ = fh.apply_snapshot(
        fh.empty_history(), [row("0026S0"), row(" "), row(None)], D1
    )
    assert list(h["series"]) == ["0026S0"]
    assert list(h["names"]) == ["0026S0"]


def test_duplicate_codes_last_row_wins_and_stable(capsys):
    rows = [row(total=0.1, name="A"), row(total=0.2, name="B")]
    h, n = fh.apply_snapshot(fh.empty_history(), rows, D1)
    assert h["series"]["C001"]["총보수"] == [[D1, 0.2]]
    assert h["names"]["C001"] == "B"
    assert n == 4
    assert "[WARNING]" in capsys.readouterr().out
    h2, n2 = fh.apply_snapshot(h, rows, D2)
    assert n2 == 0
    assert h2 == h


def test_backwards_date_rejected():
    h = seeded(date=D2)
    with pytest.raises(ValueError):
        fh.apply_snapshot(h, [row(total=0.2)], D1)


def test_input_not_mutated():
    h = seeded()
    snap = copy.deepcopy(h)
    fh.apply_snapshot(h, [row(total=0.9, name="X")], D2)
    assert h == snap


@pytest.mark.parametrize("bad_value", ["nan", float("nan"), "inf", "Infinity", float("-inf")])
def test_non_finite_values_skipped(bad_value):
    h, n = fh.apply_snapshot(fh.empty_history(), [row(total=bad_value)], D1)
    assert "총보수" not in h["series"]["C001"]
    assert n == 3
    h2, n2 = fh.apply_snapshot(h, [row(total=bad_value)], D2)
    assert n2 == 0
    assert h2["series"] == h["series"]
    assert "NaN" not in fh.dump_history(h2)


def test_dump_rejects_non_finite():
    h = seeded()
    h["series"]["C001"]["총보수"].append([D2, float("nan")])
    with pytest.raises(ValueError):
        fh.dump_history(h)


@pytest.mark.parametrize(
    "bad",
    [
        [],
        {"version": 2, "updatedAt": "", "names": {}, "series": {}},
        {"version": 1, "names": {}, "series": {}},
        {"version": 1, "updatedAt": 5, "names": {}, "series": {}},
        {"version": 1, "updatedAt": "", "names": [], "series": {}},
        {"version": 1, "updatedAt": "", "names": {}, "series": []},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [["d"]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [[1, 0.1]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [["d", "x"]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [["d", True]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [["d", float("nan")]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [["d", float("inf")]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [["2026/10/01", 0.1]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [["20261001", 0.1]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [[D2, 0.1], [D1, 0.2]]}}},
        {"version": 1, "updatedAt": "", "names": {}, "series": {"C": {"총보수": [[D1, 0.1], [D1, 0.2]]}}},
    ],
)
def test_validate_rejects(bad):
    with pytest.raises(ValueError):
        fh.validate_history(bad)


def test_validate_accepts_good():
    fh.validate_history(seeded())
    fh.validate_history(fh.empty_history())


def test_dump_deterministic_roundtrip():
    h = seeded([row("0026S0", "한글")])
    text = fh.dump_history(h)
    assert text.endswith("\n") and text.count("\n") == 1
    assert "한글" in text and ", " not in text
    assert fh.dump_history(json.loads(text)) == text


@pytest.fixture
def env(tmp_path, monkeypatch):
    data = tmp_path / "data.json"
    hist = tmp_path / "fee-history.json"
    data.write_text(json.dumps([row()], ensure_ascii=False), encoding="utf-8")
    monkeypatch.setattr(fh, "DATA_FILE", data)
    monkeypatch.setattr(fh, "HISTORY_FILE", hist)
    monkeypatch.setattr(fh, "kst_today", lambda: D1)
    return data, hist


def test_main_missing_history_fails(env):
    _, hist = env
    assert fh.main([]) != 0
    assert not hist.exists()


@pytest.mark.parametrize(
    "content",
    ["{bad json", json.dumps({"version": 9, "updatedAt": "", "names": {}, "series": {}})],
)
def test_main_corrupt_history_untouched(env, content):
    _, hist = env
    hist.write_text(content, encoding="utf-8")
    before = hist.read_bytes()
    assert fh.main([]) != 0
    assert hist.read_bytes() == before


def test_main_valid_and_idempotent(env):
    _, hist = env
    hist.write_text(fh.dump_history(fh.empty_history()), encoding="utf-8")
    assert fh.main([]) == 0
    first = hist.read_bytes()
    assert b"C001" in first
    assert fh.main([]) == 0
    assert hist.read_bytes() == first


def test_main_bad_data_leaves_history(env):
    data, hist = env
    hist.write_text(fh.dump_history(fh.empty_history()), encoding="utf-8")
    before = hist.read_bytes()
    data.write_text('{"a": 1}', encoding="utf-8")
    assert fh.main([]) != 0
    data.unlink()
    assert fh.main([]) != 0
    assert hist.read_bytes() == before


def test_main_init(env):
    _, hist = env
    assert fh.main(["--init"]) == 0
    assert hist.exists()
    fh.validate_history(json.loads(hist.read_text(encoding="utf-8")))
    before = hist.read_bytes()
    assert fh.main(["--init"]) != 0
    assert hist.read_bytes() == before
