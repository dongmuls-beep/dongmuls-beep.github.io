---
phase: 14-mobile-a11y
plan: 03
subsystem: html
tags: [a11y, html, aria, pytest]
requires: [14-02]
provides: [skip link + main#main-content on 7 pages, theme-color #e8edf5, data-i18n-aria, table ARIA roles, #tableStatus, #etfTableContainer, #changelogStatus]
key-files:
  modified: [index.html, changelog/index.html, fomo/index.html, guide/index.html, isa/index.html, methodology/index.html, pension/index.html]
  created: [tests/test_html_a11y.py]
requirements: [A11Y-05, A11Y-06, A11Y-07, A11Y-08, A11Y-09]
metrics:
  completed: 2026-09-30
---

# Phase 14 Plan 03: HTML a11y markup Summary

Skip link, focusable main target, unified theme-color, translatable aria labels, ARIA table roles and live-region anchors added to all 7 pages by byte-level edits (CRLF preserved).

## Commit
- 8979612 feat(14-03): 8 files, +188/-45

## Tests
- tests/test_html_a11y.py: 37 passed. Full `python -m pytest -q`: 326 passed. `node tests/fee_chart_check.js`: OK.

## Deviations
- None to the plan. index.html had no foreign uncommitted hunks (verified via git diff before commit).
- Note: `.sr-only` is not yet defined in style.css (plan 14-01 territory); #tableStatus/#changelogStatus depend on it.
- STATE/ROADMAP/REQUIREMENTS not updated (per orchestrator instruction).

## Pending human verification (end of Phase 16)
- Real screen-reader/keyboard pass: skip link focus, main focus target, aria labels in 8 languages.

## Self-Check: PASSED
