---
phase: 15-ui
plan: 04
subsystem: ui
tags: [compare, vanilla-js, i18n, a11y]
requires: [compare-calc.js, script.js globals]
provides: [CompareView global, /compare/ draft page]
affects: [15-05 chart, 15-06 calculator, Phase 16]
key-files:
  created: [compare-view.js, compare/index.html, tests/compare_view_check.js]
  modified: []
key-decisions:
  - "script.js is loaded unmodified on /compare/; cross-script global visibility proven by executed vm assertion (hasScriptGlobals)"
  - "Dropped-code notice is escaped with escapeHtml but NOT stripHtmlTags-ed, so the offending token stays visible (stripping removed <SCRIPT>)"
requirements-completed: [CMP-03, CMP-04, CMP-06]
duration: 25min
completed: 2026-09-30
---

# Phase 15 Plan 04: compare page draft and compare-view Summary

`compare-view.js` (IIFE, global `CompareView`) plus the noindex `/compare/` draft page: whitelisted `?compare=` parsing, side-by-side metric table with text "최저" badges, loading/empty/error/ready states, copy-link, MutationObserver-based language re-render and the `onRender` registry for 15-05/15-06.

## Commits
- 22cfc6e: pure functions + global-scope spike + tests (Task 1)
- 9b9710d: runtime (fetch, states, notices, copy, i18n re-render, onRender) + runtime tests (Task 2)
- 36e4123: compare/index.html draft page

## Tests
- `node tests/compare_view_check.js`: OK (spike, parse/whitelist/cap/dedupe, lowest, escaping, states a-d, static page assertions)
- `node tests/fee_chart_check.js`: OK
- `node tests/compare_calc_check.js`: OK

## Deviations from Plan
- Task 2 commit contains the test file with the Task 3 static-page assertions already included (single test file); the page was created before running it, so Task 3's commit is the page only. Both commits pass together.
- Spec said "2 th[scope=col]" for scenario (a); asserted 2 ETF headers (the table also has an empty corner th[scope=col]).
- [Rule 1] Dropped-notice originally went through stripHtmlTags, which deleted `<SCRIPT>`-like tokens; now escapeHtml only (still safe).
- Test 15-01 i18n keys are stubbed in the test; page relies on getTranslation fallback until 15-01 lands (missing keys render as key names).

## Known Stubs
None. compare-chart.js / compare-calculator.js script tags 404 until 15-05/15-06 (intended).

## Self-Check: PASSED
