---
phase: 24-portfolio-ui
verified: 2026-11-21T00:00:00Z
status: human_needed
score: 4/4 roadmap criteria verified (automated); browser-only items pending
gaps: []
human_verification:
  - test: "Keyboard Tab order and combobox flow (Tab from skip link, type kodex, ArrowDown/Enter, add row)"
    expected: "Row, summary, fee line and chart appear; focus order sensible"
    why_human: "Real keyboard focus order not machine-checkable"
  - test: "320px viewport layout"
    expected: "One column, tables scroll horizontally, no page-level horizontal scroll"
    why_human: "Visual layout"
  - test: "Export JSON then import (overwrite dialog, Escape, overwrite)"
    expected: "Real file downloads; dialog focus on keep-as-is"
    why_human: "Real file download/upload"
  - test: "Switch to English and Khmer"
    expected: "All text changes, no raw pf_ keys, Khmer renders correctly"
    why_human: "Font/glyph rendering"
  - test: "Network tab"
    expected: "No AdSense/analytics requests"
    why_human: "Runtime confirmation (static check already clean)"
---

# Phase 24: /portfolio/ UI/i18n Verification

**Goal:** visitor goes from input to trend view on /portfolio/. **Status:** human_needed (no gaps found).

## Automated evidence
- `python -m pytest tests/ -q`: 464 passed.
- All 15 `tests/*_check.js` exit 0 (incl. portfolio_calc/chart/css/shell/store/view, a11y_states, a11y_table).

## Success criteria
1. Input/combobox/rows, multiple rows per ETF, out-of-list code rejected (PF-01): VERIFIED. portfolio-calc.js validates code/qty/date; portfolio-view.js 901 lines with combobox, pf_err_code; store and view checks pass.
2. Chart, totals, day change, weights, period chips (PF-02): VERIFIED via portfolio-chart.js, portfolio-view.js and passing chart/view checks; summary and chart tables in index.html.
3. Weighted-average fee and annual cost on one line (PF-03): VERIFIED. `Format.weightedFee` (portfolio-format.js:102) excludes null/non-finite fees from numerator and base (never counts as 0), returns null if none; `feeLine` renders pf_fee_line and pf_fee_partial listing excluded names. Unit-tested in portfolio_view_check.js:70-75.
4. i18n parity and a11y (I18N-01, A11Y-11): VERIFIED. 116 pf_ keys in each of ko/en/vi/zh/ja/th/tl/km, identical key sets, none empty; test_i18n_portfolio.py passes. One live region (`#pf-live`, role=status, aria-live=polite) in index.html:96; all `<th>` have scope="col"; 44px min-height/width on buttons and options in portfolio.css; test_html_a11y.py portfolio test passes.

## Constraints
- No /script.js, analytics, gtag or AdSense on page or portfolio/*.js (grep clean). Scripts are the six portfolio/*.js only. Network calls only same-origin (/i18n, /data.json, /prices).
- No link to /portfolio/ in nav, sitemap.xml, feed or other pages (grep clean; deferred to Phase 25).
- Nothing pushed by this phase: `main` is 41 commits ahead of origin/main, all local.

## Gaps
None.

## Notes
44px coverage in portfolio.css is limited to `.pf-btn-*` and `.pf-option` plus compare.css shared classes; inputs/chips/icon buttons were not individually audited here (css check passes). Browser items above are in 24-HUMAN-CHECK.md.
