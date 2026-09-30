---
phase: 10-data-reliability
review: 10-REVIEW.md
fixed_at: 2026-09-30
status: resolved
---

# Phase 10: Review Fix Report

| ID | Status | Resolution |
|----|--------|------------|
| WR-01 | Accepted | I checked the real KOFIA sample in `.debug-artifacts/downloads`. It has no `"-"` cells, so treating `"-"` as missing does not null anything in practice. I did not add a `dash_as_zero` option. DATA-08 still warns if `"-"` cells appear later. |
| WR-02 | Fixed | Added a fail-closed gate in `update_google_sheets` (`etl_process.py`). If the share of null 실부담비용 values is above `NULL_COST_MAX_RATIO`, it prints an `[ERROR] DATA-08` line and returns False before it opens `data.json`. That means `data.json` and `update-meta.json` stay as they were, nothing is POSTed to GAS, and the ETL exits with 1 through the same path as an allow_nan write failure. The default is 0.5; the `NULL_COST_MAX_RATIO` env var can override it with a value from 0 to 1, and an invalid value falls back to the default. Tests are in `tests/test_null_gate.py`. |
| WR-03 | Accepted (by design) | Skipping pairs where one side is null is how DATA-09 is meant to work. A change that spans a temporary null gap is not added to the changelog. `fee-history.json` still records the non-null values. |
| IN-01..03 | Deferred | Info only. |

## Related follow-up (phase 08 backfill)

`scripts/backfill_fee_history.py` `check_rows`: the truthiness test `not to_float(...)` has been replaced by an explicit `value is None or value == 0.0`.

I kept counting 0.0 on purpose:
- Snapshots from before phase 10 recorded missing values as 0.0, and an all-0.0 glitch day has to be skipped rather than trigger a re-baseline. This is the 08 WR-01 fix, and `test_blank_or_zero_bulk_field_skipped_not_rebaselined[0.0]` covers it.
- A real 0.0 on a minority of rows stays below the 50% ratio and is accepted. The new test `test_minority_real_zero_accepted` covers this.

Tests: full `pytest tests` passes.
