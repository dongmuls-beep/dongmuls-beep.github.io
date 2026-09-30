---
phase: 15-ui
plan: 05
subsystem: ui
tags: [compare, svg-chart, a11y, i18n]
requires: [15-01, 15-03, 15-04]
provides: [CompareChart global, overlay fee-history chart]
affects: [compare/index.html runtime]
key-files:
  created: [compare-chart.js, tests/compare_chart_check.js]
  modified: []
key-decisions:
  - "Template-only tag stripping (plainT): markup is stripped from the i18n template, interpolated names are escaped afterwards, so a name like <b>X</b> stays visible but inert"
  - "No resize redraw, matching the existing modal chart behaviour"
requirements-completed: [CMP-05, CMP-06]
duration: 20min
completed: 2026-09-30
---

# Phase 15 Plan 05: overlay fee-history chart Summary

`compare-chart.js` (IIFE, global `CompareChart`) overlays up to 4 ETFs' fee history on a shared Y scale and shared start date. It reuses the script.js primitives unmodified, has a 4-chip metric selector (default 실부담비용), a color+dash+marker legend, a text-alternative table, and error/retry.

## Commit
- df68113: feat(15-05): overlay fee-history chart on compare page (compare-chart.js, tests/compare_chart_check.js). Both tasks were built and tested together, so there is one commit rather than two.

## Tests (all OK)
- node tests/compare_chart_check.js
- node tests/fee_chart_check.js
- node tests/compare_calc_check.js
- node tests/compare_view_check.js

The chart test covers: WR-03 startDate on the script.js primitives (earlier start moves the first x right of 12, same start gives M12, path ends at the right edge), overlay model cases (shared start/end/scale, flat no-history line, excluded null-value series, no-history-at-all, metric "fee", no mutation), SVG (viewBox, aria, grid, markers circle/rect/polygon x2, no NaN, FEE_CHART.height stays 200, min width 260), legend/table escaping, chip focus and announce, single listeners, and error then retry then success.

## Deviations
- One commit instead of two (tasks share the two files).
- [Rule 1] Legend/table text originally stripped tags after interpolation, which removed names like `<b>X</b>`. Fixed by stripping only the template.
- Test stubs the 15-01 i18n keys in currentTranslations and stubs CompareView.onRender/announce.
- Retry and error UI live in #cmp-chart-status inside #cmp-chart-body (delegated retry listener on the body, bound once).

## Issues / notes for others
- No resize redraw: the chart is drawn at the container width at render time.
- Chips carry no visible text until compare.css classes apply; markup follows the 15-03 class contract.
- compare/index.html must load compare-chart.js after compare-view.js (it already references it).

## Known Stubs
None.

## Self-Check: PASSED
