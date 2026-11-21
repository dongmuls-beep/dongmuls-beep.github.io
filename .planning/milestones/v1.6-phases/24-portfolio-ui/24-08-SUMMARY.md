---
phase: 24-portfolio-ui
plan: 08
subsystem: portfolio-ui
tags: [portfolio, chart, fees, a11y]
requires: [24-01, 24-02, 24-07]
provides: [price loading, summary, fee line, weights, chart with period chips, data table, warnings with retry]
affects: [portfolio/portfolio-view.js]
key-files:
  modified: [portfolio/portfolio-view.js]
requirements-completed: [PF-02, PF-03, A11Y-11]
metrics:
  completed: 2026-11-21
---

# Phase 24 Plan 08: Portfolio results view Summary

Results half of portfolio-view.js: parallel per-code price fetch, PortfolioCalc.compute, summary with day change (arrow, sign, sr-only word), weighted fee line that excludes null fees, weights bars, chart with period chips and data table, warnings with focus-keeping retry.

## Commits
- Tasks 1 and 2 were committed together as one commit (both edit one file in one pass): see git log `feat(24-08)`.

## Deviations from Plan
None for behavior. Single combined commit instead of two per-task commits.

## Verification
All tests/*_check.js pass; pytest 464 passed; file parses; grep gates met (two weightedFee calls, no aria-live/alert/innerHTML/`|| 0`).

## Known Stubs
None. No browser run was done; behavior is checked by static gates only.

## Self-Check: PASSED
