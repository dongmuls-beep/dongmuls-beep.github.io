"""End-to-end null chain: fixture xlsx -> process_data -> data.json text -> changelog -> fee-history.

Fixture-only (tmp_path openpyxl); no git, no repo JSON files (DATA-07/08/09).
"""

import json
import os
import sys

import openpyxl
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))

import build_changelog as bc  # noqa: E402
import build_fee_history as fh  # noqa: E402
from etl_process import process_data  # noqa: E402

SP = "KR7360750004"
NQ = "KR7133690008"

DAY1 = [(SP, "0.07", "0.01", "0.02"), (NQ, "0.12", "0.02", "0.01")]
DAY2 = [(SP, None, "0.01", "0.02"), (NQ, "0.12", "-", "nan")]
DAY3 = [(SP, "0.07", 0, "0.02"), (NQ, "0.12", "0.02", "0.01")]


def _kofia_xlsx(tmp_path, data_rows, name="kofia.xlsx"):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["KOFIA 펀드 보수·비용 현황", None, None, None, None])
    ws.append(["기준일: 2026-10-01", None, None, None, None])
    ws.append([None, None, None, None, None])
    ws.append(["표준코드", "펀드명", "합계(A)", "기타비용(B)", "매매·중개수수료율(D)"])
    for code, total, other, sell in data_rows:
        ws.append([code, "펀드", total, other, sell])
    path = tmp_path / name
    wb.save(str(path))
    return str(path)


def strict_loads(text):
    def _bad(tok):
        raise ValueError(f"non-strict JSON constant: {tok}")

    return json.loads(text, parse_constant=_bad)


def _dump(results):
    return json.dumps(results, ensure_ascii=False, indent=4, allow_nan=False)


def _run(tmp_path, managed_df, data_rows, name):
    return process_data(managed_df, _kofia_xlsx(tmp_path, data_rows, name))


def _by_code(results):
    return {str(r["종목코드"]): r for r in results}


@pytest.fixture
def day1(tmp_path, managed_df_primary):
    return _run(tmp_path, managed_df_primary, DAY1, "d1.xlsx")


@pytest.fixture
def day2(tmp_path, managed_df_primary):
    return _run(tmp_path, managed_df_primary, DAY2, "d2.xlsx")


def test_day2_json_has_null_and_is_strict(day2):
    text = _dump(day2)
    strict_loads(text)
    assert "null" in text
    assert "NaN" not in text
    assert len(day2) == 2
    rows = _by_code(day2)
    sp, nq = rows["360750"], rows["133690"]
    assert sp["총보수"] is None and sp["실부담비용"] is None
    assert nq["기타비용"] is None and nq["매매중개수수료"] is None
    assert nq["실부담비용"] is None
    assert nq["총보수"] == pytest.approx(0.12)


def test_missing_warns_but_does_not_raise(tmp_path, managed_df_primary, capsys):
    _run(tmp_path, managed_df_primary, DAY2, "d2.xlsx")
    out = capsys.readouterr().out
    assert "[WARNING] DATA-07" in out
    assert "[WARNING] DATA-08" in out


def test_changelog_records_no_fake_change(day1, day2):
    prev = strict_loads(_dump(day1))
    curr = strict_loads(_dump(day2))
    changes = bc.build_changes(prev, curr)
    assert all(c["before"] is not None and c["after"] is not None for c in changes)
    assert changes == []
    assert bc.build_changes(curr, prev) == []


def test_changelog_main_writes_nothing_for_null_pair(monkeypatch, tmp_path, day1, day2):
    data = tmp_path / "data.json"
    log = tmp_path / "changelog.json"
    data.write_text(_dump(day2), encoding="utf-8")
    log.write_text("[]", encoding="utf-8")
    prev = strict_loads(_dump(day1))
    monkeypatch.setattr(bc, "DATA_FILE", data)
    monkeypatch.setattr(bc, "CHANGELOG_FILE", log)
    monkeypatch.setattr(bc, "read_previous_data_from_git", lambda: prev)
    assert bc.main() == 0
    entries = json.loads(log.read_text(encoding="utf-8"))
    for e in entries:
        for c in e.get("changes", []):
            assert c["before"] is not None and c["after"] is not None
    assert entries == []


def test_fee_history_appends_no_point(day1, day2):
    h1, _ = fh.apply_snapshot(fh.empty_history(), strict_loads(_dump(day1)), "2026-10-01")
    h2, n = fh.apply_snapshot(h1, strict_loads(_dump(day2)), "2026-10-02")
    assert n == 0
    assert h2["series"] == h1["series"]
    strict_loads(fh.dump_history(h2))
    for fields in h2["series"].values():
        for points in fields.values():
            assert all(p[1] is not None for p in points)


def test_legit_zero_is_a_real_change(tmp_path, managed_df_primary, day1):
    day3 = _run(tmp_path, managed_df_primary, DAY3, "d3.xlsx")
    changes = bc.build_changes(strict_loads(_dump(day1)), strict_loads(_dump(day3)))
    got = {(c["code"], c["field"]) for c in changes}
    assert got == {("360750", "기타비용"), ("360750", "실부담비용")}
    other = next(c for c in changes if c["field"] == "기타비용")
    assert other["before"] == pytest.approx(0.01)
    assert other["after"] == 0.0
    assert all(isinstance(c["after"], float) for c in changes)
