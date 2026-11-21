---
phase: 23-calc-store-core
plan: 02
subsystem: portfolio-store
tags: [store, import-export, validation]
requires: [23-01]
provides:
  - PortfolioStore (KEYS, LIMITS, migrate, validateRows, create)
affects: [24, 25]
key-files:
  created:
    - portfolio/portfolio-store.js
    - tests/portfolio_store_check.js
requirements-completed: [STORE-01, STORE-02]
decisions:
  - "Validation delegated to PortfolioCalc validators; store has no qty/date regex"
  - "Import validates before the CONFIRM_REQUIRED step, so invalid files never prompt"
metrics:
  tasks: 2
  completed: 2026-11-21
---

# Phase 23 Plan 02: PortfolioStore Summary

UMD store with injected storage: schemaVersion-1 save/load under `pf_v1`, error codes (STORAGE_UNAVAILABLE, QUOTA_EXCEEDED, CORRUPT, UNSUPPORTED_VERSION) that never throw, corrupt raw text preserved in `pf_v1_corrupt_backup`, JSON export with `pf_v1_lastBackup`, and all-or-nothing import with size/row/code/qty/date checks and overwrite confirmation.

## Commits
- 701c6be feat: store core (module incl. export/import) + load/save checks
- a2ff572 test: export, lastBackup, import, confirm cases
- b1d284d chore: comment tweak so `grep localStorage` is empty

## Deviations from Plan
The whole module was written in the Task 1 commit (export/import included); Task 2 commit adds only its tests. `portfolio/portfolio-calc.js` unchanged (verified via `git status --short portfolio tests`, clean).

## Verification
- `node tests/portfolio_store_check.js`, `node tests/portfolio_calc_check.js`: OK
- all `tests/*_check.js`: no failures
- `python -m pytest tests/ -q`: 440 passed
- New files ASCII, LF, no BOM

## Known Stubs
None.

## Self-Check: PASSED
