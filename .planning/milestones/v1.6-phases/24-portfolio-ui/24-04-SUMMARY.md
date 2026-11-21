---
phase: 24-portfolio-ui
plan: 04
subsystem: ui
tags: [i18n, header, modal, vanilla-js]
requires: []
provides:
  - "PortfolioShell UMD global: SUPPORTED, LANG_META, resolveLang, interp, makeT, isHtmlKey, t, lang, htmlLang, ready, init"
  - "document event etf:lang-changed after every apply"
affects: [24-07, 24-08, 24-09]
tech-stack:
  added: []
  patterns: ["UMD IIFE", "vm sandbox node test"]
key-files:
  created: [portfolio/portfolio-shell.js, tests/portfolio_shell_check.js]
  modified: []
key-decisions:
  - "textContent for all i18n keys except modal_policy_* and footer_* (innerHTML, single assignment)"
requirements-completed: [I18N-01, A11Y-11]
metrics:
  tasks: 2
  files: 2
  completed: 2026-11-21
---

# Phase 24 Plan 04: Portfolio shell Summary

i18n/header shell for /portfolio/ without script.js: lang resolution (?lang > localStorage > navigator > ko), en+ko per-key fallback, language select with history.replaceState, hamburger, privacy modal with focus trap, guarded localStorage, no analytics.

## Deviations from Plan

None in code. Both tasks were committed together in one commit (db014ad) because the second task extends the same two files.

## Notes

- Unrelated failures: `tests/test_i18n_portfolio.py` (5 failures, missing pf_* keys in vi/zh i18n) belongs to another wave-1 plan's in-progress i18n work. Not touched.
- Verified LF line endings and no BOM.

## Self-Check: PASSED
