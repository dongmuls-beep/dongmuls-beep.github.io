---
phase: 19-compare-ui
verified: 2026-11-10T00:00:00Z
status: human_needed
score: 6/6 must-haves verified (code level)
human_verification:
  - test: "320px viewport: open /compare/ rank table"
    expected: "'최저 대비' column not clipped; ETF-name column sticky/fixed while scrolling"
    why_human: "Visual layout, CSS sticky/min-width cannot be asserted"
  - test: "Resize browser window with chart shown"
    expected: "Chart redraws to new width (debounced 150ms)"
    why_human: "Real-browser resize behavior"
  - test: "Screen reader: change calculator inputs / selection"
    expected: "Live region announces once, not duplicated"
    why_human: "Needs assistive tech"
  - test: "Chart error state: press Retry"
    expected: "Focus stays on status/retry with visible focus ring"
    why_human: "Focus ring visibility"
---

# Phase 19: /compare/ UI·접근성 정리 Verification

**Goal:** /compare/ 페이지가 모든 창 크기·언어·보조기기에서 일관되게 동작한다

## Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Resize redraws chart, no dead chart code | VERIFIED (code) | compare-chart.js:316-320 debounced resize -> draw; resizeBound guard |
| 2 | No empty th; ?compare= not truncated | VERIFIED | compare-view.js:125 corner th has sr-only text; param cut at comma boundary (lines 69-72) |
| 3 | Calculator locale numbers, focus after retry, one live region | VERIFIED (code) | compare-calculator.js:35 toLocaleString(locale()); compare-chart.js:310 status.focus(); single #cmp-live in index.html:97 |
| 4 | etf:lang-changed updates view, no title MutationObserver | VERIFIED | compare-view.js:432, compare-select.js:341; zero MutationObserver in compare* |
| 5 | 320px rank table not clipped | VERIFIED (CSS) / human | compare.css:644-657 sticky name column, min-width 96px; visual check needed |
| 6 | .cell-label spans aria-hidden | VERIFIED | script.js:1027-1037 all cell-label spans aria-hidden="true" |

## Checks run
- `python -m pytest tests/ -q`: 408 passed
- All `node tests/compare_*_check.js`, `a11y_*_check.js`, `fee_chart_check.js`: exit 0 (9/9)
- script.js BOM: present (efbbbf)
- No TBD/FIXME debt markers examined beyond grep scope (not exhaustively scanned).

## Gaps
None found at code level. Remaining items need human verification (see frontmatter).
