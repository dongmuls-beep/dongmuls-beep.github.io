---
phase: 10-data-reliability
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - etl_process.py
  - scripts/build_changelog.py
  - tests/test_fees.py
  - tests/test_process_data.py
  - tests/test_validate.py
  - tests/test_changelog.py
  - tests/test_null_chain.py
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 10: Code Review Report

**Depth:** standard. The 106 tests in the 5 test files pass. I ran `p_float` by hand on edge inputs. Results: `"-"`, `" "`, `"1e400"`, `nan` and `True` give None, and `"0"` and `"0%"` give 0.0.

## Summary

The core requirements hold.
- `p_float` returns a finite float or None, and a real 0.0 is preserved.
- `process_data` produces a null 실부담비용 whenever any component is missing.
- `data.json` is serialized with `allow_nan=False` before the file is opened, so a serialization failure cannot truncate the existing file.
- `fetch_market_data_batch` returns None, not NaN.
- The changelog skips a pair when either side is None, and `to_float` rejects nan/inf.
- The frontend (`script.js`, `toNumber` and `compareFeeNullLast`) already handles null.

No blockers. The warnings below are design-level risks.

## Warnings

### WR-01: `"-"` is treated as missing, which may null many ETFs (assumption A1)

**File:** `etl_process.py:428-449`, `etl_process.py:572-590`
**Issue:**
- In KOFIA disclosures, `"-"` in 매매·중개수수료율 or 기타비용 often means "none", that is 0. The phase treats it as missing, so any ETF with one `"-"` component gets a null 실부담비용. The frontend then shows "-" and sorts the ETF last.
- The change is invisible until real data is run. The only signal is a DATA-08 print.
**Fix:**
- Before shipping, count how many rows in the real xlsx have `"-"` per column, and confirm the semantics.
- If `"-"` means 0 for 기타/매매, add a per-column `dash_as_zero` option to `p_float` rather than a global change.

### WR-02: No gate on the null ratio, so a parse regression publishes an all-null data.json

**File:** `etl_process.py:605-607`, `etl_process.py:641-655`
**Issue:**
- DATA-07 and DATA-08 only print warnings. `validate_etl_results` skips null costs entirely.
- If a KOFIA column-header change makes `col_total`, `col_other` or `col_sell` None for every row, every 실부담비용 becomes null. That is a silent full-data outage that gets committed and deployed. Before this change it would have been all 0.0, which the DATA-01 range check does not catch either, so it is not a regression. But this phase's stated goal is reliability.
**Fix:** Add a threshold. For example, if null_cost/len(results) is greater than 0.2 (or an absolute count above N), have `validate_etl_results` return failure or set a non-zero exit code. Also warn or fail when a column resolves to None ("column absent").

### WR-03: Changelog permanently loses a change when a value goes null in between

**File:** `scripts/build_changelog.py:106-108`
**Issue:**
- The diff compares only against `git HEAD:data.json`. If a fee goes A -> null, nothing is logged, and that is intended.
- If it then goes null -> B in the next run, that is skipped too. The A -> B change is never recorded, and neither is the null -> A initial value. A fee change that straddles a temporary null gap is silently dropped from the changelog and RSS.
- This is a consequence of DATA-09 and probably acceptable, but it is undocumented.
**Fix:** Either document the limitation in the SUMMARY and code comment, or compare against the last non-null value from `fee-history.json`.

## Info

### IN-01: `_finite_or_none` has an inconsistent return type

**File:** `etl_process.py:725-735`
**Issue:**
- A str input returns a float. A non-str input returns the original `v`, which is not normalized. A numpy int64 passes through, and `json.dumps` cannot serialize it.
- The bool guard is fine.
**Fix:** Return `x` in both cases, or `int(x)` when integral.

### IN-02: Python accepts underscores in float strings

**File:** `etl_process.py:441-443`, `scripts/build_changelog.py:64`
**Issue:** `float("1_0")` returns 10.0, and `"infinity"` is handled by isfinite. This is unlikely to occur in real data.
**Fix:** Optionally reject strings that do not match `^-?\d+(\.\d+)?$`.

### IN-03: Duplicate parsing logic

**File:** `etl_process.py:428`, `scripts/build_changelog.py:57`
**Issue:** There are three near-identical finite-float parsers (`p_float`, `to_float`, `_finite_or_none`) with subtly different semantics. `to_float(True)` is None only by accident, via `float("True")` failing.
**Fix:** Consolidate them, or add a comment that `to_float` is intentionally independent.
