---
phase: 07-수수료-이력-저장소-및-일일-추가
fixed_at: 2026-09-30T00:00:00Z
review_path: .planning/phases/07-수수료-이력-저장소-및-일일-추가/07-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-09-30
**Source review:** .planning/phases/07-수수료-이력-저장소-및-일일-추가/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, WR-01..WR-05)
- Fixed: 5
- Skipped: 1 (WR-04, on orchestrator instruction)

Verification: `python -m pytest tests/ -q` gives 105 passed. Re-running `scripts/build_fee_history.py` against the current `data.json` leaves `fee-history.json` byte-identical. The existing `fee-history.json` passes the stricter `validate_history`. `data.json` has no duplicate codes.

## Fixed Issues

### CR-01: NaN/Infinity get into fee-history, are appended again every day, and are written as invalid JSON

**Files modified:** `scripts/build_fee_history.py`, `tests/test_fee_history.py`
**Commit:** 26be379
**Applied fix:** `normalize()` now returns None for non-finite numbers (`math.isfinite`), so they are skipped the same way null is. `validate_history` rejects non-finite point values. `dump_history` uses `allow_nan=False` and raises instead of writing invalid JSON. Tests cover "nan", float nan, "inf", "Infinity", and -inf as row values (no point recorded, stable across days), NaN/inf points in `validate_history`, and dump rejecting NaN.

### WR-01: Duplicate 종목코드 rows cause last-row-wins overwrites and fake daily "changes"

**Files modified:** `scripts/build_fee_history.py`, `tests/test_fee_history.py`
**Commit:** acaa5c3
**Applied fix:** `apply_snapshot` first collapses rows by code, with the last row winning. It prints `[WARNING] fee-history: duplicate 종목코드 (last row wins): ...` and does not fail. A stable duplicate set is now a no-op on later days: count 0, history unchanged. A test was added.

### WR-02: Chronological order is assumed but never checked; a backwards date corrupts series order

**Files modified:** `scripts/build_fee_history.py`, `tests/test_fee_history.py`
**Commit:** aaa9ff5
**Applied fix:** A new helper, `is_iso_date`, uses `date.fromisoformat` plus a canonical round-trip, so the check behaves the same on 3.9 and 3.11+. `validate_history` requires canonical ISO dates that strictly increase within each series. `apply_snapshot` raises `ValueError` when the snapshot date is before a series' last point. `main` now calls `apply_snapshot` inside the fail-closed try block, so this shows up as `[ERROR] fee-history:` with exit 1. Tests cover bad date formats, descending and duplicate dates, and a backwards snapshot.

### WR-03: Non-atomic write can leave a truncated fee-history.json

**Files modified:** `scripts/build_fee_history.py`, `tests/test_fee_history.py`
**Commit:** 8a8774d
**Applied fix:** A new `write_atomic()` writes to `fee-history.json.tmp` in the same directory, using `open(..., newline="\n")` to stay compatible with Python 3.9, then calls `os.replace`. If anything fails, the temp file is removed. This also replaces `Path.write_text(newline=...)`, which only exists on 3.10+. A test simulates `os.replace` failing and checks that the original file is unchanged and no .tmp file is left.

### WR-05: Row and name contents are not validated, so bad input bypasses the fail-closed error path

**Files modified:** `scripts/build_fee_history.py`, `tests/test_fee_history.py`
**Commit:** b772452
**Applied fix:** `load_rows` rejects any list element that is not a dict, raising `ValueError`, which leads to `[ERROR]` and exit 1. `validate_history` requires every `names` value to be a string and every series field key to be in `FIELDS`. Tests cover `names` values that are not strings, unknown field keys, and a `[1, "x"]` data.json in `main`.

## Skipped Issues

### WR-04: The ETL turns unparseable fees into 0.0, which defeats the "null keeps previous value" rule

**File:** `scripts/build_fee_history.py:54-56` (root cause `etl_process.py:427-437`)
**Reason:** Skipped on orchestrator instruction. The current data.json contains a real fee of 0, so fee-history cannot treat 0.0 as null. The root cause is `etl_process.p_float`, which is outside this phase's scope (only build_fee_history.py and its tests may be touched). This should be tracked in the backlog as an ETL change.
**Original issue:** `etl_process.p_float` returns 0.0 on any parse failure, so data.json holds 0.0 instead of null, and fee-history records fake drops to 0.0 that stay in the append-only history.

---

_Fixed: 2026-09-30_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
