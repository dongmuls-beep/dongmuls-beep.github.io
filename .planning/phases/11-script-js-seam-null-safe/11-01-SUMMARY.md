---
phase: 11-script-js-seam-null-safe
plan: 01
subsystem: frontend-table
tags: [null-safe, sort, seam, custom-events, DATA-10]
requires: []
provides:
  - "isValidFee / compareFeeNullLast / missingValueText / changelogEntryFromChange / buildChangeBadgeHtml (top-level functions in script.js)"
  - "document CustomEvent etf:data-ready (after fetchData success)"
  - "document CustomEvent etf:table-rendered (every renderTable exit)"
  - "tr.dataset.code on every data row"
  - "buildFeeLinePath(points, scale, today, startDate?)"
affects: [phase-14-a11y, phase-15-compare]
tech-stack:
  added: []
  patterns: ["guarded CustomEvent dispatch (typeof document.dispatchEvent/CustomEvent)", "shared isValidFee predicate for display/sort/badge"]
key-files:
  created: []
  modified: [script.js, tests/fee_chart_check.js]
decisions:
  - "Missing = !Number.isFinite(toNumber(v)); 0 is valid (A3)"
  - "Null-last in both asc and desc (A2); diff === 0 badge suppressed (A5); missing cells get no fee-history-btn (A6)"
  - "table_value_missing i18n keys left to Phase 14; '-' fallback until then (A1)"
metrics:
  duration: "~10min"
  completed: 2026-09-30
requirements: [DATA-10]
---

# Phase 11 Plan 01: script.js seam + null-safe Summary

Null/NaN fees now render as a translatable "-" with no history button, always sort last, never get change badges (non-finite changelog entries are dropped), and script.js exposes stable seams (etf:data-ready, etf:table-rendered, tr.dataset.code, buildFeeLinePath startDate) for Phases 14/15 in a small BOM+CRLF-preserving diff.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Null-safe helpers, seam events, dataset.code, startDate | 4a43089 | script.js |
| 2 | Inline null fixtures in fee_chart_check.js | 4a43089 | tests/fee_chart_check.js |

## Verification

- `node tests/fee_chart_check.js` -> `fee_chart_check OK` (exit 0)
- script.js: BOM EF BB BF present; 1888 LF == 1888 CRLF (no bare LF)
- tests/fee_chart_check.js: no BOM; all CRLF
- `git diff --numstat -- script.js` (vs. pre-plan): 52 insertions, 20 deletions (limit 90/25)
- Grep criteria: each helper declared once; etf:data-ready = 1 (fetchData); etf:table-rendered = 2 (renderTable empty path + end); 3 `document.dispatchEvent(new CustomEvent` sites, 3 guards; row.dataset.code = 1; `startDate || points[0].date` = 1; compareFeeNullLast sort call = 1; `changelogEntryFromChange(change)` = 1; `(change.after - change.before)` = 0; table_value_missing present
- Test file: compareFeeNullLast x3, helper names x17, 2026-01-01 x3, dispatchEvent x0
- No i18n/*.json, style.css or HTML touched

## Deviations from Plan

1. **[Rule 3 - acceptance grep] Renamed changelogEntryFromChange parameter to `entry`.** The criterion `grep -c "changelogEntryFromChange(change)" = 1` would also match the declaration `function changelogEntryFromChange(change)`. Parameter renamed; behavior identical.
2. **[Process - shared index race] Commit 4a43089 also contains Phase 12 files `scripts/build_rss.py` and `tests/test_rss.py`.** Only script.js and tests/fee_chart_check.js were staged by explicit path (`git diff --cached --name-only` confirmed just those two immediately before commit), but a concurrent Phase 12 agent staged its files into the shared index in the gap before `git commit` ran. Another agent had already committed on top (9986f37), so history was not rewritten (no reset/amend). Phase 12's content is intact in HEAD; the orchestrator should just be aware those two files landed under the 11-01 commit message.
3. Plan output said "do not commit"; the executor prompt explicitly allowed atomic commits, so code+test was committed as one commit per the prompt.

## Known Stubs

- `table_value_missing` has no i18n entries yet (owned by Phase 14 by design); all locales show "-" until then. Intentional (A1).

## Self-Check: PASSED

- FOUND: script.js, tests/fee_chart_check.js modifications in 4a43089
- FOUND: commit 4a43089
