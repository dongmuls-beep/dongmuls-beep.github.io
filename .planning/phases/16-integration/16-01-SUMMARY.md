---
phase: 16-integration
plan: 01
subsystem: integration
tags: [rss, feed-04, compare, ci, template]
requires: [14-05, 15-07]
provides: [feed-discovery, compare-wiring, ci-node-checks]
key-files:
  created:
    - tests/test_i18n_feed.py
  modified:
    - index.html
    - changelog/index.html
    - compare/index.html
    - isa/index.html
    - pension/index.html
    - i18n/{ko,en,vi,zh,ja,th,tl,km}.json
    - .github/workflows/daily_update.yml
    - compare.css
decisions:
  - "A1: compare/index.html is still robots noindex,follow, so sitemap.xml was not changed."
  - "A2: compare-select.js sync() skips row injection when #tableBody is missing, so isa/pension get the bar only. Both pages load compare.css and compare-select.js; the script is unchanged."
  - "The page has no scroll-top button. The only fixed bottom element is .toast (style.css, bottom 24px, z-index 1700), which sat on top of the bar. compare.css now moves it above the bar when body.has-compare-bar is set. style.css is unchanged."
metrics:
  completed: 2026-09-30
---

# Phase 16 Plan 01: Integration Wiring Summary

All three tasks are done and committed. The targeted pytest and node checks pass, and every file kept its original encoding.

## Commits

| Task | Commit | What |
|------|--------|------|
| 1 | 2163b6c | FEED-04: an RSS autodiscovery `<link>` on / and /changelog/ (placed after the hreflang block), a footer link `a[href="/feed.xml"][data-i18n="footer_rss"]`, `footer_rss` in 8 packs right after `footer_privacy`, and the new tests/test_i18n_feed.py (RED, then GREEN) |
| 2 | fcf2f7d | compare.css and compare-select.js loaded on index, isa and pension. compare/index.html aligned to the template: the DRAFT comment is gone, theme-color is #e8edf5, nav has `data-i18n-aria="aria_primary_nav"`, main has `tabindex="-1"`, and the footer has the RSS link |
| 3 | 6a13f46 | CI step "Run compare and a11y node checks" added after the fee chart check and before ETL. compare.css lifts `.toast` above the compare bar |

## Verification

- `pytest tests/test_i18n_feed.py test_i18n_compare.py test_i18n_a11y.py test_rss.py`: 131 passed
- `pytest tests/test_html_a11y.py`: 37 passed
- Every node check exits 0: fee_chart, compare_*, a11y_*
- Encodings are unchanged:
  - index, changelog, isa and pension: CRLF, no BOM
  - compare/index.html: LF, no BOM
  - i18n/*.json: CRLF, no BOM (the plan assumed LF; the actual encoding was CRLF and was kept)
  - daily_update.yml: CRLF
  - compare.css: LF
- The canonical link on compare/index.html was already present and correct.
- script.js and style.css were not touched.

## Deviations

- sitemap.xml was not changed (A1, noindex).
- i18n packs turned out to be CRLF, not LF as planned; CRLF was kept.
- A new test file needed `git add -- tests/test_i18n_feed.py`, a single explicit path, before `commit --only`.
- PyYAML is not installed locally, so the YAML was not parsed. The new step copies the indentation of the existing steps and uses `shell: bash`.

## Self-Check: PASSED
