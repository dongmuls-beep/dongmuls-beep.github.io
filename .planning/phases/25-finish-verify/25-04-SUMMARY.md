---
phase: 25-finish-verify
plan: 04
subsystem: nav
tags: [nav, i18n, css, selenium]
requires: [25-03]
provides: [header link to /portfolio/ on all 9 nav pages]
affects: [25-05]
key-files:
  created: [tests/test_nav_portfolio.py]
  modified: [9 HTML nav pages, i18n/*.json (8), tests/test_html_a11y.py, style.css]
requirements-completed: [NAV-01]
metrics:
  completed: 2026-11-21
---

# Phase 25 Plan 04: NAV-01 header link Summary

OVERFLOW: none (new vs baseline)

NAV commit: 235188e1173066c1a3384facaf71f2caab4eb13c

The /portfolio/ link now sits between /fomo/ and /guide/ in all 9 header navs. The `nav_portfolio` key is in 8 packs, right after `nav_changelog`. One commit with 20 paths (the 19 planned plus `style.css`). `changelog.json` is not in it.

## Overflow (Selenium headless Chrome, 9 pages x 768/900/1024/1280 x ko/en = 72 cases)
- Baseline (before edits): 17 overflowed. All were 900px cases, on every page except `/` in ko. This was pre-existing.
- After link only: 52 overflowed. 35 were new, mostly at 1024 and 1280. The 7th link did not fit.
- `style.css` fix, in the same commit:
  - New `@media (min-width:768px) and (max-width:1279px)` block: `.main-nav ul` gets `flex-wrap: wrap`, `justify-content: flex-end` and `gap: 0 0.6rem`. `.nav-link` gets `min-height: 30px`. Two rows fit inside the 64px header.
  - In the existing 768-1023 block, `gap: 0.8rem` became `gap: 0 0.8rem`, so the row gap stays 0.
  - The <=767px hamburger layout is untouched.
- After fix: 0 of 72 overflow. The pre-existing 900px overflow is fixed too. The nav `ul` is 60px tall at 900/1024/1280, inside the 64px header.
- Link displayed in all 72 cases. English text is "ETF Value Over Time".
- 375x812 on `/`: the link shows in the hamburger menu. Clicking it goes to `/portfolio/`, and `#pf-title` is present.
- Caveat: headless `innerWidth` is about 26px below the window width. The "768" case therefore runs the <=767 mobile layout.

## Tests
- `python -m pytest tests/ -q`: 483 passed.
- All `tests/*_check.js` pass.
- Revert dry run (`git revert --no-commit`, then pytest on `test_html_a11y.py` and `test_i18n_a11y.py`: 93 passed, then `--abort`): no tracked modifications left.

## Deviations
- [Rule 3 - Blocking] Added the `style.css` overflow fix, as the plan allows, in the same NAV commit.
- Two helper edits were redone: the first insert doubled indentation, so I reverted only those 9 HTML files and re-applied.
- `sync_server_changelog.py` reported "already up to date", so there was no separate changelog commit.

## Known Stubs
None.

## Self-Check: PASSED
