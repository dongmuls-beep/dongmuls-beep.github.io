---
phase: 23-calc-store-core
plan: 01
subsystem: portfolio-calc
tags: [calc, validators, ci]
requires: []
provides:
  - PortfolioCalc (LIMITS, normalizeCode, validateQty, qtyToNumber, validateDate, compute)
  - tests/portfolio_*_check.js glob in CI and server runner
affects: [23-02, 24]
key-files:
  created:
    - portfolio/portfolio-calc.js
    - tests/portfolio_calc_check.js
  modified:
    - .github/workflows/daily_update.yml
    - deploy/run-etl.sh
requirements-completed: [CALC-06]
decisions:
  - "Series empty after dropping non-finite closes emits no_data (per row), not zero"
  - "Non-finite row warning also carries code"
metrics:
  tasks: 2
  completed: 2026-11-21
---

# Phase 23 Plan 01: PortfolioCalc Summary

Pure UMD valuation module (sum qty x close, forward-fill, delisted hold, +/-40% jump warnings) with shared qty/date/code validators, node check, and CI/server glob for `tests/portfolio_*_check.js`.

## Commits
- 29d8683 feat: portfolio-calc.js + tests/portfolio_calc_check.js
- ee20d16 chore: CI workflow and deploy/run-etl.sh loops

## Deviations from Plan
Added per plan-checker note: empty clean series emits `no_data`. Unsorted price input handled via sorted copy (inputs never mutated). Otherwise as written.

## Verification
- `node tests/portfolio_calc_check.js`: OK
- all `tests/*_check.js` loop and `bash -n deploy/run-etl.sh`: OK
- `python -m pytest tests/ -q`: 440 passed
- New files LF, no BOM; only DOM-ish token is the `window` UMD fallback.

## Known Stubs
None.

## Self-Check: PASSED
