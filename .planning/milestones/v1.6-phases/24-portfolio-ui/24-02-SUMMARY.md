---
phase: 24-portfolio-ui
plan: 02
subsystem: portfolio-ui
tags: [svg, chart, a11y, keyboard]
requires: []
provides:
  - "PortfolioChart UMD global: niceTicks, sampleIndexes, buildModel, nearestIndex, moveCursor, render"
affects: [24-08]
key-files:
  created:
    - portfolio/portfolio-chart.js
    - tests/portfolio_chart_check.js
decisions:
  - "Points spaced evenly by source index (not calendar time)"
  - "Flat series domain built by niceTicks fallback; no NaN for empty/single/flat/zero"
requirements-completed: [PF-02, A11Y-11]
metrics:
  tasks: 2
  files: 2
completed: 2026-11-21
---

# Phase 24 Plan 02: Portfolio chart Summary

Pure-SVG single-series line/area chart with NaN-free geometry, 400-point sampling, and keyboard/pointer cursor readout (no live region, no innerHTML).

## Deviations from Plan

Both tasks share two files and were written together, so one commit (4ce81cd) covers Task 1 and Task 2. Otherwise none.

## Verification

- `node tests/portfolio_chart_check.js` prints OK; all `tests/*_check.js` pass.
- `python -m pytest tests/ -q`: 5 failures, all in `test_i18n_portfolio.py` / `test_i18n_a11y.py` (i18n keys owned by another wave-1 plan, not touched here).

## Known Stubs

None.

## Self-Check: PASSED
