---
phase: 05-신규-코드-시장데이터-매칭
plan: 01
subsystem: etl
tags: [naver, market-data, krx, data-04]
requires: []
provides:
  - alphanumeric KRX code matching in fetch_market_data_batch
  - validate_market_data DATA-04 soft-warning
affects: [etl_process.py, data.json]
key-files:
  created: [tests/test_market_data.py]
  modified: [etl_process.py]
decisions:
  - "Separate pure validate_market_data() instead of extending validate_etl_results (which runs before market data fetch)"
metrics:
  completed: 2026-09-30
requirements-completed: [DATA-04]
---

# Phase 5 Plan 01: Alphanumeric code market data matching Summary

Alphanumeric KRX codes (0026S0, 0069M0) now match NAVER etfItemList via strip().upper() normalization (digits still zfill(6)), with a DATA-04 soft-warning for missing AUM/volume.

## Tasks

1. fetch_market_data_batch: removed isdigit() prefilter and "비표준 코드" skip; added normalized matching; 6 mocked tests. Commit 470142b.
2. validate_market_data + main wiring after market-data assignment; step 4 log text corrected to NAVER; 5 tests (44 total pass). Commit 0efb6a1.
3. Deployed: pushed to origin/main, dispatched "Daily ETF Data Update" (run 36651110270, success). ETL log: 0026S0 AUM=3397억/거래량=8511, 0069M0 AUM=1981억/거래량=4245; zero DATA-04 warnings. Production https://etfsave.life/data.json verified non-null for both codes. CI auto-commit f93a4a4 pulled locally.

## Deviations from Plan

- First `git pull --rebase` failed because of the pre-existing unstaged .planning/config.json; the push was a fast-forward and succeeded. Final pull used `--autostash`; config.json remains modified and uncommitted.
- The production check command failed on Windows because of console encoding of Korean keys; verified with an equivalent script using unicode escapes.

## Known Stubs

None.

## Self-Check: PASSED
