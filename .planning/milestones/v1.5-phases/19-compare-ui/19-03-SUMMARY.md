---
phase: 19-compare-ui
plan: 03
subsystem: compare-ui
tags: [chart, a11y, resize, focus]
requires: []
provides:
  - overlay chart redraws on resize (single 150ms-debounced listener)
  - chart Retry keeps focus on #cmp-chart-status
  - all 8 main-table .cell-label spans aria-hidden
affects: [compare-chart.js, script.js]
tech-stack:
  added: []
  patterns: [resizeBound flag + clearTimeout/setTimeout(150) as in compare-view.js]
key-files:
  modified:
    - compare-chart.js
    - script.js
    - tests/compare_chart_check.js
    - tests/a11y_table_check.js
key-decisions:
  - "Resize handler calls draw() directly; it already no-ops without ctx/history so error state is untouched"
requirements-completed: [CMP-07, CMP-09, A11Y-10]
duration: 10min
completed: 2026-11-10
---

# Phase 19 Plan 03: Chart resize, retry focus, cell-label aria-hidden Summary

Overlay chart now re-lays out on window resize with one debounced listener, chart Retry keeps focus on the status container, dead `t()` helper removed, and every main-table `.cell-label` is aria-hidden.

## Tasks

1. Chart cleanup, resize redraw, retry focus (CMP-07, CMP-09) - commit 55e2fd4
2. aria-hidden on all 8 `.cell-label` spans (A11Y-10) - commit 18307ed

## Verification

- All compare_*/a11y_*/fee_chart node checks pass; pytest 408 passed.
- script.js BOM kept, CRLF uniform in working copy; diff is 7 changed lines in script.js.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
