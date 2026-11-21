---
phase: 24-portfolio-ui
plan: 05
subsystem: i18n
tags: [i18n, portfolio, parity-test]
requires: []
provides:
  - "116 pf_ keys in ko, en, vi, zh (contiguous after calc_disclaimer)"
  - "tests/test_i18n_portfolio.py (ko/en/vi/zh; plan 06 extends to 8 langs)"
affects: [24-06]
key-files:
  created: [tests/test_i18n_portfolio.py]
  modified: [i18n/ko.json, i18n/en.json, i18n/vi.json, i18n/zh.json]
decisions:
  - "vi/zh reuse existing pack terms: vi Tong phi / Chi phi thuc; zh 总报酬 / 实际成本"
metrics:
  tasks: 2
  files: 5
requirements-completed: [I18N-01]
completed: 2026-11-21
---

# Phase 24 Plan 05: pf_ i18n block (ko/en/vi/zh) Summary

116 pf_ keys added to ko, en, vi, zh with exact ko copy from the UI-SPEC, frozen en copy, and a parity test (order, placeholders, no "<", not-fallback).

## Commits
- 6cf3eaf: ko + en blocks and tests/test_i18n_portfolio.py
- e7388ac: vi + zh blocks

## Deviations from Plan
None. New file had to be `git add`ed before `git commit --only`.

## Known transient failure
`tests/test_i18n_a11y.py::test_key_set_parity` fails (ja/th/tl/km lack the pf_ keys) until plan 24-06 adds them. Expected by wave design.

## Verification
- `tests/test_i18n_portfolio.py`: 10 passed
- full `pytest tests/`: 455 passed, 1 failed (the parity test above)
- all `tests/*_check.js`: OK

## Self-Check: PASSED
