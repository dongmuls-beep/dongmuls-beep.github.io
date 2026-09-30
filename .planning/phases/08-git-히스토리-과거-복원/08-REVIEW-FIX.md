---
phase: 08-git-히스토리-과거-복원
fixed_at: 2026-09-30T00:00:00Z
review_path: .planning/phases/08-git-히스토리-과거-복원/08-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-09-30
**Source review:** .planning/phases/08-git-히스토리-과거-복원/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (critical_warning scope; IN-01..IN-06 not in scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: A one-day blank or zero glitch triggers a bulk re-baseline that wipes all earlier history

**Files modified:** `scripts/backfill_fee_history.py`, `tests/test_backfill_fee_history.py`
**Commit:** c06d6e6
**Applied fix:** `check_rows` now rejects a snapshot when any `BULK_CORRECTION_FIELDS` field (총보수/기타비용) is blank, None, or 0 for at least `ROW_COLLAPSE_RATIO` (half) of the rows. The skip reason is `field-blank-or-zero: <field>`. Added the parametrized regression test `test_blank_or_zero_bulk_field_skipped_not_rebaselined` (None / 0.0 / ""). It checks that the glitch day is skipped, no re-baseline happens, and earlier points are kept. In the real history the highest blank/zero ratio is 1.7% (기타비용), so nothing is rejected.
**Status:** fixed: requires human verification (logic change)

### WR-02: If a day's last commit fails validation, an earlier intermediate commit wins silently

**Files modified:** `scripts/backfill_fee_history.py`, `tests/test_backfill_fee_history.py`
**Commit:** cb8e07c
**Applied fix:** `replay` Pass 1 now drops date-backwards commits and keeps only the last commit of each KST day. Earlier same-day commits are reported as superseded. Pass 2 validates only that last commit (parse error / `check_rows`). If it fails, the whole day is skipped and reported under `skipped`, with no fallback to an earlier commit. Added the regression test `test_rejected_last_commit_skips_whole_day`.
Report change on real data: 59b9a86 (2026-05-27) now shows as superseded instead of skipped (out-of-range), because it is no longer validated. The counts go from superseded 9 / skipped 1 to superseded 10 / skipped 0.
**Status:** fixed: requires human verification (logic change)

## Verification

- `python -m pytest tests/ -q`: 128 passed
- `python scripts/backfill_fee_history.py --dry-run` then a real run: fee-history.json sha256 `b73a49d0…492ec` is the same before and after, so the committed file is byte-identical
- `python scripts/build_fee_history.py`: `no changes; kept existing fee-history.json`
- The script does not contain `KNOWN_REBASELINES` or `2026-05-27`

---

_Fixed: 2026-09-30_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
