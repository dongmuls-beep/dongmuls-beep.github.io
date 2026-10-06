---
phase: 14-mobile-a11y
plan: 02
subsystem: i18n
tags: [i18n, a11y, json, pytest]
requires: []
provides: [17-key aria group + table_aum/table_volume in all 8 packs, tests/test_i18n_a11y.py]
affects: [14-03, 14-04, 14-05, phase-15 i18n edits]
key-files:
  modified: [i18n/ko.json, i18n/en.json, i18n/ja.json, i18n/zh.json, i18n/vi.json, i18n/th.json, i18n/tl.json, i18n/km.json]
  created: [tests/test_i18n_a11y.py]
requirements: [A11Y-05, A11Y-06, A11Y-07, A11Y-08]
metrics:
  completed: 2026-09-30
---

# Phase 14 Plan 02: A11y i18n keys Summary

Group A (17 aria_*/table_* keys) inserted contiguously after aria_copy_code / aria_skip_to_content (or after seo_changelog_description in the 6 packs lacking the group), Group B (table_aum, table_volume) directly after table_real, in all 8 packs by line-level insertion; values copied from UI-SPEC section 12.

## Commit
- 0d11128 feat(14-02): i18n keys + tests/test_i18n_a11y.py (9 files, +256)

## Tests
- tests/test_i18n_a11y.py + full `python -m pytest -q`: 289 passed. `node tests/fee_chart_check.js`: OK.

## Deviations
- [Rule 1] Working-tree JSON files are CRLF (core.autocrlf=true; index is LF), not LF as the plan assumed. Insertions preserved CRLF; test_file_bytes asserts consistent line endings instead of "no \r".
- No foreign (Phase 15) hunks were present in i18n/ at commit time.
- STATE/ROADMAP/REQUIREMENTS not updated (per orchestrator instruction).

## Pending human verification (end of Phase 16)
- Native review of machine-drafted th/tl/km/vi strings (non-blocking).

## Self-Check: PASSED
