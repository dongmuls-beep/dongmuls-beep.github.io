---
phase: 15-ui
plan: 01
subsystem: i18n
tags: [i18n, compare, calculator, pytest]
requires: []
provides:
  - "68-key compare_/calc_/seo_compare_ block in all 8 i18n packs, contiguous after fee_history_chart_aria"
  - "tests/test_i18n_compare.py block parity test"
affects: [15-02, 15-03, 15-04, 15-05, 15-06, 15-07, 16]
key-files:
  created: [tests/test_i18n_compare.py]
  modified: [i18n/ko.json, i18n/en.json, i18n/ja.json, i18n/zh.json, i18n/vi.json, i18n/th.json, i18n/tl.json, i18n/km.json]
requirements-completed: [CMP-06, CALC-04]
duration: 20min
completed: 2026-09-30
---

# Phase 15 Plan 01: Compare/Calculator i18n Block Summary

68 compare/calculator/SEO keys added to all 8 language packs as one contiguous block after `fee_history_chart_aria`, guarded by a new parity pytest.

## Commits
- RED: test(15-01) test_i18n_compare.py (failing before packs were edited: 32 failed)
- GREEN: feat(15-01) 8 packs, each +69/-1 lines (CRLF preserved, text insertion only, Phase 14 keys untouched)

## Tests
- `pytest tests/test_i18n_compare.py tests/test_i18n_fee_history.py tests/test_i18n_a11y.py`: 108 passed
- node: fee_chart_check, compare_calc_check, compare_css_check, compare_select_check, compare_view_check: all OK
- all 8 packs parse as JSON

## Deviations / decisions
- Commits made with `git commit --only -- <paths>` per the orchestrator rules instead of the plan's index-blob procedure (index held another stream's staged tests/test_html_a11y.py). `git status --porcelain i18n/` was clean before editing, so no foreign i18n hunks were committed.
- Added 4 keys not in the UI-SPEC table (as planned): seo_compare_title, seo_compare_description, compare_table_title, compare_chart_error (assumed copy per plan).
- In-value straight quotes in compare_intro/compare_empty_body are kept in ko/en as spec; translations use localized quotes where natural.

## Pending
- Translations for ja, zh, vi, th, tl, km (especially calc_disclaimer, compare_bar_limit, calc_return) are machine-drafted and need human/native review, deferred to Phase 16 (legal disclaimer).

## Known Stubs
None.

## Self-Check: PASSED
