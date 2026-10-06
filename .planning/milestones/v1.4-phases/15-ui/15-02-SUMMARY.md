---
phase: 15-ui
plan: 02
subsystem: ui
tags: [compare, selection, sessionStorage, a11y]
requires: []
provides:
  - compare-select.js (global CompareSelect; row checkboxes, cap-4 selection, sticky compare bar)
affects: [phase-16 wiring (add one defer script tag)]
key-files:
  created: [compare-select.js, tests/compare_select_check.js, tests/fixtures/compare-select.html]
  modified: []
key-decisions:
  - "Single commit for both tasks (plan verification specifies one commit); module written complete in one pass."
  - "Announced item name is read from the row's .stock-link text, not the aria-label."
metrics:
  completed: 2026-09-30
---

# Phase 15 Plan 02: compare-select Summary

ES5 IIFE `compare-select.js` injects one checkbox per ETF row into td.name-cell (phase-14-markup safe), caps selection at 4 persisted in sessionStorage (`etf.compare.selection.v1`), re-syncs on `etf:table-rendered`, and renders a fixed compare bar with a plain-link "비교하기" (`/compare/?compare=A,B[&lang=xx]`).

## Commits
- 1feaa30: feat(15-02): compare selection checkboxes and bar (3 files)

## Tests
- `node tests/compare_select_check.js`: OK (pure helpers + fake-DOM: injection, idempotence, post-Phase-14 cell-label markup, cap 4 with revert + notice, dimming, tab-switch restore, bar 0/1/2 states, disabled link preventDefault, clear + focus, bar-only pages)
- `node tests/fee_chart_check.js`: OK; `node tests/compare_calc_check.js`: OK
- Gates: innerHTML 0, code-cell 0, top-level declarations 0.

## Deviations from Plan
- Tasks 1 and 2 were delivered in one commit rather than two (plan's verification block prescribes one commit). No TDD red-only commit.
- Test uses JSON round-trip for cross-realm arrays from the vm context.

## Notes
- Git warns LF->CRLF on new files (autocrlf); pre-existing repo config.
- i18n keys compare_* are stubbed in tests; supplied by 15-01. No shared files touched.

## Self-Check: PASSED
