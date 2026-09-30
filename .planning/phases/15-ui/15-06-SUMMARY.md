---
phase: 15-ui
plan: 06
subsystem: ui
tags: [calculator, compare, i18n, url-sync, a11y]
requires: [compare-calc.js, compare-view.js, compare.css, 15-01 i18n keys]
provides: [CompareCalculatorUI global, calculator on /compare/]
key-files:
  created: [compare-calculator.js, tests/compare_calculator_check.js]
  modified: []
key-decisions:
  - "'더 부담' = cumulative fees paid (totalFees difference), not final-value difference"
  - "Headline b is the higher-fee ETF regardless of which is base/other"
requirements-completed: [CALC-01, CALC-03, CALC-04, CALC-05]
duration: 25min
completed: 2026-09-30
---

# Phase 15 Plan 06: Calculator UI Summary

`compare-calculator.js` (IIFE, global `CompareCalculatorUI`) builds the cumulative-cost calculator on top of `CompareCalc`: tolerant parser (NFKC, U+2212, strips comma/space/원/%/년, 32-char cap), live headline "N년간 A보다 B가 약 X원 더 부담해요", per-ETF totals, missing-fee exclusion notice, fee_high warnings, disclaimer as the last child of the same `role=group`, and debounced `replaceState` URL sync for amt/yrs/mon/ret (non-defaults only, `?compare=` and `lang` preserved, commas unencoded).

## Commit
- b33c4f5: feat(15-06): calculator UI + tests (all three tasks in one commit, per plan's verification section)

## Tests
- compare_calculator_check.js OK (parser, URL round-trip, result logic vs CompareCalc, XSS escape, disclaimer order, fake-DOM wiring, invalid/clamp, re-render without duplicate form/listeners)
- compare_calc_check.js OK, fee_chart_check.js OK, compare_view_check.js OK

## Deviations from Plan
- Tasks 1-3 committed as a single commit (plan's verification specifies one commit for both files).
- Clamp notice is a per-field `p.cmp-notice` (created hidden at build time); shown when the parsed value differs from the normalized one.
- Test stubs the calc_* i18n keys and replaces `CompareView.onRender/announce` in the vm context to drive the render callback; timers are synchronous in the test.
- Tooling note: the editor converted `\uXXXX` escapes in source to literal characters (U+2212, 원, 년 appear literally in the regex); functionally identical, file is UTF-8/LF (`i/lf`).

## Issues for other plans
- compare/index.html already loads compare-calculator.js after compare-calc.js/compare-view.js (defer); no change needed.

## Known Stubs
None.

## Self-Check: PASSED
