---
phase: 15-ui
verified: 2026-09-30T00:00:00Z
status: human_needed
score: 10/10 requirements verified (automated)
gaps: []
human_verification:
  - test: "Browser smoke on /compare/ and main table (select 2-4 ETFs, 5th blocked, tab switch persistence, compare bar, copy link, calculator URL reproduction, chart overlay)"
    expected: "All flows work at desktop and mobile widths; no console errors"
    why_human: "Needs a real browser; deferred to end of Phase 16"
  - test: "6-language review of compare/calc disclaimer and compare copy (ja, zh, vi, th, tl, km)"
    expected: "Natural, non-advisory translations"
    why_human: "Translation quality is not machine-verifiable; deferred to end of Phase 16"
  - test: "Visual check of lowest-value badge, chart line/marker distinction, contrast"
    expected: "Distinguishable without color"
    why_human: "Visual"
---

# Phase 15 Verification (direct compare + calculator UI)

**Result:** all automated checks pass; the only open items are human checks deferred to Phase 16.

## Tests run (this session)
| Test | Result |
|---|---|
| fee_chart_check.js | OK |
| compare_calc_check.js | OK |
| compare_select_check.js | OK |
| compare_css_check.js | OK |
| compare_view_check.js | OK |
| compare_chart_check.js | OK |
| compare_calculator_check.js | OK |
| pytest tests/test_i18n_compare.py | 41 passed |

## Requirements
| ID | Status | Evidence |
|---|---|---|
| CMP-01 | SATISFIED (main table only, per user decision) | compare-select.js: MAX=4, limit reject, sessionStorage persistence, hooks `etf:table-rendered` emitted by script.js |
| CMP-02 | SATISFIED | compare-select.js compare bar with count, clear, go link (aria-disabled when <2) |
| CMP-03 | SATISFIED | compare-view.js side-by-side table, findLowestIndexes plus text badge (not color only) |
| CMP-04 | SATISFIED | compare-view.js state and notices, copy link; covered by compare_view_check |
| CMP-05 | SATISFIED | compare-chart.js overlay SVG, distinct marker shapes and legend; compare_chart_check |
| CMP-06 | SATISFIED | 8 i18n packs, parity test passes; translation quality is a human item |
| CALC-01 | SATISFIED | compare-calculator.js inputs with normalization; compare_calculator_check |
| CALC-03 | SATISFIED | calculator difference output, missing-fee exclusion; tests pass |
| CALC-04 | SATISFIED (structure) | `calc_disclaimer` rendered next to results; 8-language keys present |
| CALC-05 | SATISFIED | readCalcParams/buildCalcSearch with history.replaceState |

No orphaned requirements. No TBD/FIXME/XXX markers in the compare-*.js files.

## Deferred to Phase 16 (not gaps)
- Wiring script/link tags into existing pages, sitemap, CI.
- compare/index.html is a noindex draft.

## Caveats
Verification was time-boxed. It relied on the passing node and pytest suites plus targeted code inspection. REQUIREMENTS.md checkboxes for Phase 15 are still unchecked (orchestrator to update).
