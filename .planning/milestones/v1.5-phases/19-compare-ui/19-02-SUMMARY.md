---
phase: 19-compare-ui
plan: 02
subsystem: compare-ui
tags: [a11y, i18n, calculator, css]
requires: []
provides:
  - "Locale-aware calculator numbers (inputs stay ko-KR comma)"
  - "Single announcer (#cmp-live) for calculator headline"
  - "Sticky ETF-name column + unclipped gap column at <=639px"
affects: [19-03]
key-files:
  modified:
    - compare-calculator.js
    - compare.css
    - tests/compare_calculator_check.js
    - tests/compare_css_check.js
key-decisions:
  - "Gap column selector th.cmp-calc-gap / td.cmp-calc-gap placed after th[scope=col] rule: equal specificity, later wins, so min-width 96px applies"
  - "Language switch changes translated headline text, so one CompareView.announce on language change is acceptable"
metrics:
  tasks: 2
  files: 4
  completed: 2026-11-10
requirements-completed: [CMP-09, CMP-11]
---

# Phase 19 Plan 02: calculator locale, announcer, 320px table Summary

Calculator numbers follow the active language locale (en 1,234,567 / vi 1.234.567, ko-KR fallback), inputs keep comma grouping, aria-live/role=status removed from output with a single announcement via `CompareView.announce`, and the rank table has a sticky opaque ETF-name column plus a nowrap 96px 최저 대비 column at <=639px.

## Tasks

| Task | Commit |
|------|--------|
| 1 Locale-aware numbers + single announcer (CMP-09) | 0dc01e3 |
| 2 320px rank table (CMP-11) | 0dc01e3 |

Both tasks touch compare-calculator.js and the same tests, so they landed in one commit.

## Verification

All `tests/compare_*_check.js`, `tests/a11y_*_check.js`, `tests/fee_chart_check.js` pass; `python -m pytest tests/ -q` 408 passed.

## Deviations from Plan

- Single commit instead of two (shared files).
- Plan-checker warning applied: CSS test asserts the `th.cmp-calc-gap, td.cmp-calc-gap` selector form so min-width: 96px beats `th[scope="col"] { min-width: 0 }`.

## Notes

- First render and unchanged headline text are silent; a language switch changes the headline text, so it announces once (accepted).
- `CompareView.updateScrollable` call is guarded (exists from 19-01).
- Human verification pending: 320px viewport sticky column, screen reader single announcement.
- CMP-09 stays open until 19-03 (chart retry focus). CMP-11 covered by 19-01 + 19-02.

## Self-Check: PASSED
