---
phase: 06-변경-이력-정합성
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/build_changelog.py
  - tests/test_changelog.py
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: resolved
---

# Phase 6: Code Review Report

**Reviewed:** 2026-09-30
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Detection logic (count_compared, detect_bulk_correction) is correct and matches the locked decisions. The main risk is the retroactive filter. Its denominator comes from `len(current_data)`, which falls back to `[]` on any read or parse failure. That turns the filter into a mass-delete of legitimate history. This is a data-loss path in CI, and the tests do not cover it.

## Critical Issues

### CR-01: Retroactive filter wipes the entire changelog when data.json is missing, corrupt, or empty

**File:** `scripts/build_changelog.py:181-197` (with `160-164`)
**Issue:** `read_json_file(DATA_FILE, [])` returns `[]` when data.json is absent, unparsable, or not a list. `main()` then calls `filter_bulk_entries(changelog_entries, 0)`. There, `total = max(0, distinct)` equals `distinct`, so any entry with at least one 총보수 or 기타비용 change gets ratio 1.0 and is classified as bulk. Every such historical entry is removed, and `write_changelog` persists the deletion. A partial or truncated ETL output has the same effect. For example, if data.json has 3 rows, every historical entry with 2 or more changed codes exceeds the 50% ratio. CI's git-auto-commit then commits the wiped changelog.json to production. The comparison between the run and history is made against an unreliable denominator.
**Fix:** Do not run the retroactive filter unless the denominator is trustworthy. Skip it when `current_data` is empty, and better, when it is much smaller than expected. A sanity floor is also reasonable.
```python
MIN_TOTAL_FOR_FILTER = 30  # or derive from max historical distinct codes

if len(current_data) >= MIN_TOTAL_FOR_FILTER:
    changelog_entries, removed = filter_bulk_entries(changelog_entries, len(current_data))
else:
    removed = []
    print("[WARNING] DATA-06: data.json too small; skipped retroactive filter")
```
Also drop the `max(total_hint, distinct)` fallback in `filter_bulk_entries`, or make `total_hint <= 0` return the entries unchanged. Add a test with `main()` and an empty or corrupt data.json plus a legit history, and assert nothing is removed.

## Warnings

### WR-01: Unhashable or malformed `code` values crash CI

**File:** `scripts/build_changelog.py:140, 160`
**Issue:** `{c.get("code") for c in changes ...}` raises `TypeError` if a historical entry has a non-hashable code (list or dict). The filter runs on untrusted existing JSON and is not wrapped in a try/except, so one malformed entry aborts the script. That breaks the CI step, since the following git-auto-commit depends on it. The "kept malformed entries" test covers only non-list `changes`, not malformed items inside `changes`.
**Fix:** Coerce with `str(c.get("code"))`, or skip changes whose code is not a `str`. Wrap the per-entry evaluation in try/except and keep the entry on error.

### WR-02: Bulk-run early return skips all recording and hides same-day real changes

**File:** `scripts/build_changelog.py:203-210`
**Issue:** When a run is flagged, `return 0` discards all changes, including legitimate 매매중개수수료 and 실부담비용 changes and non-bulk 총보수 changes. This follows the locked decision, so it is not a bug in itself. However, because data.json is committed anyway, the next run diffs against the already-corrected HEAD and the changes are lost permanently. The only trace is a WARNING line in the CI log. Note the risk for whoever verifies production.
**Fix:** Accepted by decision. Optionally, record the non-bulk fields or persist a flag in update-meta.json.

## Info

### IN-01: Test gaps

**File:** `tests/test_changelog.py`
**Issue:** There is no test for main() with empty or corrupt data.json (see CR-01). There is no test for a legitimate append in main(), and none for the same-day replace path. There is no test for the 2026-05-27 shape, which is the whole 59/59 case. `test_detect_distinct_codes_count_once` passes for the wrong reason if the set logic is removed, since 1/10 is below the threshold either way. Use 6 distinct-looking duplicates against a total of 2 to make it meaningful.
**Fix:** Add the tests above.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Dispositions (orchestrator, 2026-09-30)

| ID | Decision | Rationale |
|----|----------|-----------|
| CR-01 | fixed | `main()`: data.json이 비면 소급 정리 skip (`if current_data:`). 실제 기존 항목은 매매중개수수료로 distinct≈58이라 전멸은 아니지만, 총보수/기타비용만 바뀐 소규모 항목은 100%로 삭제될 수 있었음. 회귀 테스트 `test_main_empty_data_keeps_history` 추가 (수정 전 실패 확인) |
| WR-01 | won't fix | changelog 항목의 code는 build_changes가 쓰는 str만 존재 |
| WR-02 | won't fix | CONTEXT 잠금 결정 (대량 보정 실행은 항목 미기록) |
| IN-01 | partial | 빈 data.json 케이스 테스트 추가; 나머지는 기존 경로 |
