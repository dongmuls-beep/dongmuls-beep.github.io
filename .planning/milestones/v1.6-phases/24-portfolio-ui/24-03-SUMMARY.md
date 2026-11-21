---
phase: 24-portfolio-ui
plan: 03
subsystem: ui
tags: [html, css, a11y, portfolio]
requires: []
provides:
  - portfolio/index.html static shell with the pf-* id contract
  - portfolio.css page styles (pf-* tokens, focus-visible, forced-colors)
  - a11y static checks for /portfolio/
affects: [24-04, 24-07, 24-08, 24-09]
tech-stack:
  added: []
  patterns: [compare.css reuse, page-scoped --pf-* tokens]
key-files:
  created: [portfolio/index.html, portfolio.css, tests/portfolio_css_check.js]
  modified: [tests/test_html_a11y.py]
key-decisions:
  - "Header comment of portfolio.css avoids the words animation/transition so the plan grep stays clean"
  - "Tables carry both data-i18n-aria and a ko aria-label (UI-SPEC a11y checklist)"
requirements-completed: [PF-01, A11Y-11]
duration: 15min
completed: 2026-11-21
---

# Phase 24 Plan 03: Portfolio page shell, CSS, a11y checks Summary

Static `/portfolio/` shell (compare header/footer/modal, noindex,follow, one aria-live, no tracking), `portfolio.css` with UI-SPEC tokens, and static a11y/CSS gates.

## Commits
- ad9afd3 feat: portfolio/index.html
- 795ffa2 feat: portfolio.css + tests/portfolio_css_check.js
- ae8f993 test: portfolio in PAGES + test_portfolio_static

## Deviations from Plan
None. Plan executed as written.

## Known Stubs
None. Empty regions (#pf-state, #pf-summary-body, etc.) are filled by view plans 07-09.

## Verification
- `node tests/portfolio_css_check.js` and `compare_css_check.js` OK; `pytest tests/test_html_a11y.py` 43 passed.
- Full `pytest tests/`: 451 passed, 5 failed, all in i18n files owned by other wave-1 plans (test_i18n_portfolio.py vi/zh, test_i18n_a11y key parity vi). Not touched here.
- All `tests/*_check.js` OK.

## Self-Check: PASSED
