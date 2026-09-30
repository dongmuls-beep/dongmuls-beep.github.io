"""Unit tests for scripts/build_changelog.py bulk-correction detection (DATA-05/06)."""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))

import build_changelog as bc  # noqa: E402


def row(i, total=0.1, other=0.05, sell=0.02, real=0.17):
    return {
        "종목코드": f"C{i:03d}",
        "종목명": f"ETF{i}",
        "총보수": total,
        "기타비용": other,
        "매매중개수수료": sell,
        "실부담비용": real,
    }


def rows(n, **kw):
    return [row(i, **kw) for i in range(n)]


def change(code, field):
    return {"code": code, "name": code, "field": field, "before": 1.0, "after": 2.0}


def test_count_compared_only_shared_keys():
    prev = rows(3)
    curr = rows(4)
    assert bc.count_compared(prev, curr) == 3


def test_detect_exactly_half_triggers():
    changes = [change(f"C{i}", "기타비용") for i in range(5)]
    assert bc.detect_bulk_correction(changes, 10) == [("기타비용", 5)]


def test_detect_below_threshold():
    changes = [change(f"C{i}", "기타비용") for i in range(4)]
    assert bc.detect_bulk_correction(changes, 10) == []


def test_detect_excluded_fields_ignored():
    changes = []
    for i in range(10):
        changes.append(change(f"C{i}", "매매중개수수료"))
        changes.append(change(f"C{i}", "실부담비용"))
    assert bc.detect_bulk_correction(changes, 10) == []


def test_detect_zero_total():
    assert bc.detect_bulk_correction([change("C1", "총보수")], 0) == []


def test_detect_distinct_codes_count_once():
    changes = [change("C1", "총보수")] * 6
    assert bc.detect_bulk_correction(changes, 10) == []


def test_build_changes_integration_flags_fee():
    prev = rows(10, total=0.1)
    curr = rows(10, total=0.2)
    changes = bc.build_changes(prev, curr)
    flagged = bc.detect_bulk_correction(changes, bc.count_compared(prev, curr))
    assert ("총보수", 10) in flagged


def _legit_entry():
    return {
        "month": "2026-05",
        "updatedAt": "2026-05-12",
        "changes": [change(f"C{i}", "기타비용") for i in range(3)],
    }


def _bulk_entry():
    return {
        "month": "2026-05",
        "updatedAt": "2026-05-27",
        "changes": [change(f"C{i}", "총보수") for i in range(10)],
    }


def test_filter_bulk_entries_and_idempotent():
    kept, removed = bc.filter_bulk_entries([_legit_entry(), _bulk_entry()], 10)
    assert [e["updatedAt"] for e in kept] == ["2026-05-12"]
    assert len(removed) == 1
    kept2, removed2 = bc.filter_bulk_entries(kept, 10)
    assert kept2 == kept and removed2 == []


def test_filter_keeps_malformed_entries():
    entries = ["junk", {"month": "x"}, {"changes": "nope"}]
    kept, removed = bc.filter_bulk_entries(entries, 10)
    assert kept == entries and removed == []


def _setup_main(monkeypatch, tmp_path, prev, curr, existing):
    data = tmp_path / "data.json"
    log = tmp_path / "changelog.json"
    data.write_text(json.dumps(curr, ensure_ascii=False), encoding="utf-8")
    log.write_text(json.dumps(existing, ensure_ascii=False), encoding="utf-8")
    monkeypatch.setattr(bc, "DATA_FILE", data)
    monkeypatch.setattr(bc, "CHANGELOG_FILE", log)
    monkeypatch.setattr(bc, "read_previous_data_from_git", lambda: prev)
    return log


def test_main_bulk_run_records_nothing(monkeypatch, tmp_path, capsys):
    log = _setup_main(
        monkeypatch, tmp_path, rows(10, total=0.1), rows(10, total=0.2), [_legit_entry()]
    )
    assert bc.main() == 0
    assert "[WARNING] DATA-06" in capsys.readouterr().out
    assert json.loads(log.read_text(encoding="utf-8")) == [_legit_entry()]


def test_main_no_change_removes_existing_bulk_entry(monkeypatch, tmp_path, capsys):
    log = _setup_main(
        monkeypatch, tmp_path, rows(10), rows(10), [_legit_entry(), _bulk_entry()]
    )
    assert bc.main() == 0
    assert "[WARNING] DATA-06: removed bulk-correction entry" in capsys.readouterr().out
    assert json.loads(log.read_text(encoding="utf-8")) == [_legit_entry()]
