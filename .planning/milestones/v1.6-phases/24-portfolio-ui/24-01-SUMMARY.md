---
phase: 24-portfolio-ui
plan: 01
subsystem: portfolio
tags: [portfolio, format, store, node-checks]
requires: [portfolio-calc, portfolio-store]
provides: [PortfolioFormat, PortfolioStore.exportText(rows)]
affects: [24-07, 24-08, 24-09]
tech-stack:
  added: []
  patterns: [UMD global + module.exports, DOM-free helpers returning i18n keys + vars]
key-files:
  created: [portfolio/portfolio-format.js, tests/portfolio_view_check.js]
  modified: [portfolio/portfolio-store.js, tests/portfolio_store_check.js]
requirements-completed: [PF-01, PF-02, PF-03]
duration: short
completed: 2026-11-21
---

# Phase 24 Plan 01: PortfolioFormat helpers Summary

DOM-free `PortfolioFormat` (17 helpers: money/percent/fee formats, period slicing, table rows, weights, null-safe weighted fee, combobox matching, warning/import/storage error key mapping) plus `exportText(rows)` so export works from memory when storage throws.

## Commits
- 5cc3297 feat(24-01): exportText(rows) in-memory export
- ae8f993 feat(24-01): PortfolioFormat DOM-free view helpers (Tasks 2 and 3 in one commit; same file)

## Deviations from Plan
None. Tasks 2 and 3 were committed together because they edit the same two files.

## Notes
- Weighted fee excludes null/non-finite fees and lists them in `excluded` (T-24-01).
- Import error items use key `pf_import_row_error`; `withRow` false for row 0 or field "rows".
- Out-of-scope failures (other agents' in-progress i18n work): tests/test_i18n_a11y.py::test_key_set_parity, tests/test_i18n_portfolio.py (vi/zh) fail at time of run.

## Self-Check: PASSED
All files exist, commits present, node checks green.
