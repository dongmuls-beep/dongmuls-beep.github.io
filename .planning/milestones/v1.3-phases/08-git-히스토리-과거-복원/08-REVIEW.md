---
phase: 08-git-히스토리-과거-복원
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/backfill_fee_history.py
  - tests/test_backfill_fee_history.py
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-09-30
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

I reviewed `scripts/backfill_fee_history.py` and its tests against the locked decisions in 08-CONTEXT.md. I also read the imported helpers in `build_fee_history.py` and `build_changelog.py` for context. I ran `--dry-run` against the real git history, which is read-only.

- Real-data result: 146 days, 0 re-baselines, 9 superseded commits, and 1 skipped commit (59b9a86, out-of-range). The same 6 orphan codes named in CONTEXT were dropped.
- No-op check: applying the current `data.json` to the replayed history through `apply_snapshot` gives 0 changes. The "build_fee_history is a no-op afterwards" requirement holds.
- Code normalization: the only short code in history is `69500`, and the current `data.json` has no codes that need zfill, so the daily script and the backfill agree on keys.
- Daily ratios: no day comes near the bulk threshold. The highest was 18/59 for 기타비용.

No blockers. The two warnings are latent robustness gaps in the re-baseline and day-selection logic. Neither one fires on the current history, but both could silently corrupt the output if the script is run again on different history.

## Warnings

### WR-01: A one-day blank or zero glitch triggers a bulk re-baseline that wipes all earlier history

**File:** `scripts/backfill_fee_history.py:151-167` (with `check_rows` at 73-83)
**Issue:** `build_changes` counts `value -> None` and `None -> value` as changes. `check_rows` accepts 0.0, and it accepts missing or blank fields. Suppose one daily snapshot has 총보수 blank for all rows, or 0.0 for all rows (the known `etl_process.p_float` failure mode, deferred WR-04). Then `detect_bulk_correction` flags 총보수. All earlier 총보수 and 실부담비용 points for every code are deleted. When the values come back the next day, the field is flagged again and wiped again. Reproduced with the test fixtures: `four()` -> all 총보수=None (or 0.0) -> `four()` gives 2 re-baselines, and 총보수 is left with only `[["2026-03-04", 0.1]]`. The earlier points are lost. The report does list the re-baselines, but the design treats them as real corrections, so this reads as legitimate. The current history has none of these days, so the committed output is not affected.
**Fix:** Count a field toward bulk detection only when both sides have a non-zero value. Reject or skip snapshots where a bulk field is missing or zero for most rows.
```python
def check_rows(data, prev_len):
    ...
    for field in BULK_CORRECTION_FIELDS:
        vals = [to_float(r.get(field)) for r in data]
        if data and sum(1 for v in vals if not v) / len(data) >= ROW_COLLAPSE_RATIO:
            return f"field-blank-or-zero: {field}"
    return None
```
Alternatively, before calling `detect_bulk_correction`, filter `build_changes` output down to `c["before"] and c["after"]`.

### WR-02: If a day's last commit fails validation, an earlier intermediate commit wins silently

**File:** `scripts/backfill_fee_history.py:121-145`
**Issue:** Pass 1 drops invalid commits before Pass 2 picks the last commit of each day. If the true last commit of a day fails `check_rows`, the previous commit from the same day takes over without any report. That fallback is exactly the class of commit the rule exists to exclude: on 2026-05-27, 59b9a86 and 9a8f04c are known-bad intermediate commits. The report shows the skip and the superseded entries separately, so the operator would have to correlate them by hand to notice. 9a8f04c passes `check_rows` today, so the current output uses 095948f. If 095948f had been rejected, 9a8f04c's bad values would have been backfilled with no rebaseline and no warning.
**Fix:** Choose the last commit per day first, then validate it. If it fails, skip the whole day rather than falling back. At minimum, add a report line when the chosen commit for a day is not that day's last commit:
```python
last_sha_by_date = {}
for s in snapshots:
    last_sha_by_date[to_kst_date(s["committed"])] = s["sha"]
# ... after Pass 2:
for d in days:
    if d["sha"] != last_sha_by_date[d["date"]]:
        report.setdefault("fallback_days", []).append({"date": d["date"], "sha": d["sha"]})
```

## Info

### IN-01: The range check runs before typo-field normalization

**File:** `scripts/backfill_fee_history.py:129-133`
**Issue:** `check_rows` sees the raw rows, so values under the pre-2026-02-13 typo key `매매중계수수료` are never range-checked. `normalize_rows` then aliases those values into `매매중개수수료`, and they reach history unchecked.
**Fix:** Normalize first, then check: `rows = normalize_rows(s["data"])` (guarded by the list/dict check) and pass `rows` to `check_rows`.

### IN-02: zfill can create duplicate codes, and the duplicate warning goes to the report without a prefix

**File:** `scripts/backfill_fee_history.py:64-68`
**Issue:** If one snapshot contains both `69500` and `069500`, normalization collapses them. `apply_snapshot` keeps the last row and prints `[WARNING] fee-history: ...` to stdout, which breaks the rule that every report line starts with `[backfill]`. This does not happen in the current history (0 warnings emitted), but the backfill report does not record it.
**Fix:** Detect duplicates after normalization in `replay` and add them to `report` (for example `report["duplicate_codes"]`).

### IN-03: Report key `codes` holds a field-to-count mapping, not codes

**File:** `scripts/backfill_fee_history.py:166`, `243`
**Issue:** `"codes": dict(flagged)` is `{field: changed_count}`, so `codes={'총보수': 4}` in the report is misleading.
**Fix:** Rename it to `changed_counts`, or record the compared total as well (`{"총보수": "4/59"}`).

### IN-04: Redundant deepcopy

**File:** `scripts/backfill_fee_history.py:159`
**Issue:** `apply_snapshot` already deep-copies its input, and `history` is a local object that nothing else references. The extra `copy.deepcopy` does nothing.
**Fix:** Remove it, along with the `copy` import.

### IN-05: Empty-list snapshots are accepted and disable the collapse guard

**File:** `scripts/backfill_fee_history.py:76`, `135`
**Issue:** `[]` passes `check_rows` when `prev_len` is `None`. After that, `prev_len = 0`, and the `if prev_len and ...` guard stays off until a non-empty snapshot is accepted. If every accepted snapshot were empty, `main` would write an empty history, because `days.count > 0`. This does not happen on the current history.
**Fix:** Reject empty lists in `check_rows`: `if not data: return "empty"`.

### IN-06: Weak or missing test assertions

**File:** `tests/test_backfill_fee_history.py:69-71`, `175-181`
**Issue:**
- `max(vals) <= 5` in `test_same_day_last_commit_wins` is almost vacuous. The next assertion carries the real check.
- `test_find_aba` does not test the `gap == ABA_MAX_DAYS` boundary.
- No test covers the WR-01 or WR-02 scenarios, or a snapshot that is the last of its day and gets skipped.
**Fix:** Add a boundary case at 2 days and 3 days. Add a regression test for all-None or all-0.0 bulk fields and for a rejected last-of-day commit.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
