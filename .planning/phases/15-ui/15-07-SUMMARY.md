---
phase: 15-ui
plan: 07
subsystem: compare-ui
tags: [verification, audit, human-checkpoint-deferred]
requires: [15-01, 15-02, 15-03, 15-04, 15-05, 15-06]
provides: [phase-15-automated-gate]
key-files:
  created: []
  modified: []
decisions:
  - "Task 2 (browser smoke + 6-language translation review) DEFERRED to end of Phase 16 per user decision; recorded as pending, not approved."
metrics:
  completed: 2026-09-30
---

# Phase 15 Plan 07: Final Gate Summary

Every automated check passed and the ownership and encoding audits are clean. The human browser smoke test and translation review are deferred to the end of Phase 16, as the user decided.

## Task 1: Automated suite + audits

The node checks all print OK:
- fee_chart_check
- compare_calc_check
- compare_select_check
- compare_css_check
- compare_view_check
- compare_chart_check
- compare_calculator_check

`python -m pytest tests/ -q` gave **367 passed**.

### Phase 15 commits

b96c275, 22cfc6e, f679900, ae3fd0d, b7d7829, 1feaa30, 1670982, 9b9710d, 36e4123, a029773, 6518475, 87c843f, 1c0d3c5, df68113, 7f6805f, b33c4f5, ae2a911

### Files touched by those commits (all inside the ownership list)

- compare-select.js, compare-view.js, compare-chart.js, compare-calculator.js
- compare.css, compare/index.html
- tests/compare_{select,css,view,chart,calculator}_check.js, tests/test_i18n_compare.py, tests/fixtures/compare-select.html
- i18n/{ko,en,ja,zh,vi,th,tl,km}.json (+69/-1 per pack, commit 87c843f)
- .planning/phases/15-ui/*

No Phase 15 commit touches script.js, style.css, translations.js, compare-calc.js, sitemap.xml, or any existing index.html.

### Encoding

- script.js and style.css still start with a BOM (EF BB BF), which is expected.
- All new Phase 15 files are i/lf and none starts with a BOM.

## Task 2: Human checkpoint (PENDING, deferred to end of Phase 16)

These items still need a person:
- The 7-step browser smoke test in 15-07-PLAN.md Task 2. It covers the fixture bar, the /compare/ table and "최저" badge, invalid and short code handling, the chart, the calculator with the URL round-trip, and the 320px layout.
- A translation review in ja, zh, vi, th, tl and km of calc_disclaimer (legal), compare_bar_limit and calc_return. These translations are drafts that nobody has reviewed yet.

## Hand-offs owned by Phase 16

- Add `<script src="/compare-select.js" defer>` and `<link rel="stylesheet" href="/compare.css">` to index, isa and pension. isa and pension have no #tableBody table, so there the module only shows the bar for an existing selection. Phase 16 also decides whether the guide pages get a table.
- Add `/compare/` to the sitemap.
- Align compare/index.html with the site template.
- Move the scroll-top and floating controls up so they sit above the compare bar.
- Add the new node tests to the CI node step.
- Re-check compare-select.js injection against the final post-Phase-14 table markup (span.cell-label, role="cell"). There should be one checkbox per row, span.cell-label should be untouched, and the mobile card layout should still work.

## Deviations

- The human checkpoint was deferred (user decision) instead of blocking.
- Wave 2 (15-05, 15-06) started in parallel with 15-01 to meet the deadline. The files do not overlap, and the tests stub the i18n keys.
- Wave 1 plans ran in parallel on the main tree instead of serially, because their files do not overlap and every commit used `commit --only`.

## Self-Check: PASSED
