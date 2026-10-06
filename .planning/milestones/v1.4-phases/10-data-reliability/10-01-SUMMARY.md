---
phase: 10-data-reliability
plan: 01
subsystem: etl
tags: [etl, null-safety, json, p_float, validation]
requires: []
provides:
  - "p_float finite-or-None contract"
  - "process_data null propagation (실부담비용 null when any component missing)"
  - "NaN-safe data.json writer (allow_nan=False, no truncation)"
  - "None-aware validate_etl_results"
  - "fetch_market_data_batch returns None for non-finite AUM/volume"
affects: [phase-11 frontend null guards, 10-02 changelog]
tech-stack:
  added: []
  patterns: ["finite-or-None coercion", "serialize-then-write"]
key-files:
  modified:
    - etl_process.py
    - tests/test_fees.py
    - tests/test_process_data.py
    - tests/test_validate.py
decisions:
  - "A1: '-' / blank / nan / inf / bool -> None; numeric 0 -> 0.0"
  - "Rows with missing components are emitted with 실부담비용 null (not skipped/carried forward)"
requirements-completed: [DATA-07, DATA-08]
duration: ~15min
completed: 2026-09-30
---

# Phase 10 Plan 01: ETL null-safe fees Summary

p_float now yields a finite float or None, missing fee components propagate to a null 실부담비용 with soft DATA-07/08 warnings, and data.json is written via `json.dumps(allow_nan=False)` before opening the file.

## Commits
- 156ccfa feat(10-01): etl_process.py (all logic) + tests/test_fees.py (Task 1 tests)
- 66fc967 test(10-01): tests/test_process_data.py (TestMissingFeeNull, TestJsonWriter, TestMarketDataFinite)
- 5dbf81c test(10-01): tests/test_validate.py (TestNullCost)

## Tests
Full suite excluding tests/test_rss.py (Phase 12, in progress): 200 passed. CRLF preserved in all four files; diff stat small (etl_process.py 88 lines).

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality, orchestrator-requested] fetch_market_data_batch NaN safety**
- Verified: it could emit non-finite values (Python `json` accepts `NaN`/`Infinity` literals in the NAVER response; string values such as "abc" also passed through unchanged), which would break `allow_nan=False` on write.
- Fix: added local `_finite_or_none` in etl_process.py applied to `marketSum` and `quant` (non-finite / non-numeric / bool -> None; numeric strings like "5,678" -> float).
- Test: `TestMarketDataFinite` in tests/test_process_data.py.
- Commit: 156ccfa (code), 66fc967 (test).

**2. [Process] Commit granularity**
- All etl_process.py changes were made in a single pass, so Tasks 1-3 code landed in one commit (156ccfa) rather than three; tests were committed per file.

No auth gates, no stubs, no checkpoints. Threat mitigations T-10-01..04 implemented.

## Self-Check: PASSED
Commits 156ccfa, 66fc967, 5dbf81c exist; four files modified as listed.
