---
phase: 24-portfolio-ui
plan: 06
subsystem: i18n
tags: [i18n, portfolio, ja, th, tl, km]
requires: [24-05]
provides: [pf_ block (116 keys) in ja, th, tl, km; 8-language parity test]
affects: [i18n/ja.json, i18n/th.json, i18n/tl.json, i18n/km.json, tests/test_i18n_portfolio.py]
key-files:
  modified: [i18n/ja.json, i18n/th.json, i18n/tl.json, i18n/km.json, tests/test_i18n_portfolio.py]
requirements-completed: [I18N-01]
metrics:
  tasks: 2
  files: 5
completed: 2026-11-21
---

# Phase 24 Plan 06: ja/th/tl/km pf_ translations Summary

116 pf_ keys translated into Japanese, Thai, Tagalog and Khmer, inserted after calc_disclaimer in NEW_KEYS order; test LANGS/OTHER extended to all 8 languages. All packs now have 504 keys.

## Terminology
Reused each pack's existing terms: ja 総報酬 / 実質コスト, th ค่าธรรมเนียมรวม / ต้นทุนจริง, tl Kabuuang Bayad / Tunay na Gastos, km ថ្លៃសេវាសរុប / ថ្លៃដើមពិត. Won rendered as ウォン / วอน / won / វ៉ុន.

## Commits
- f46d15e: ja and th
- b6b5bd5: tl, km, test extended to 8 languages

## Verification
`python -m pytest tests/ -q`: 464 passed. All tests/*_check.js pass. Diff per file: 117 insertions, 1 deletion (comma on calc_disclaimer).

## Deviations from Plan
None.

## Self-Check: PASSED
