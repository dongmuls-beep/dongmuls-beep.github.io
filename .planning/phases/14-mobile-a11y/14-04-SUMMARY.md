---
phase: 14-mobile-a11y
plan: 04
subsystem: frontend-a11y
tags: [a11y, script.js, i18n, table, header]
requires: [14-01, 14-02, 14-03]
provides: [A11Y-02, A11Y-03, A11Y-05, A11Y-06]
key-files:
  modified: [script.js]
  created: [tests/a11y_table_check.js]
metrics:
  completed: 2026-09-30
---

# Phase 14 Plan 04: script.js a11y behaviour Summary

Header focus guard with hysteresis, ESC focus return, data-i18n-title and hamburger label sync, table cell-label spans and ARIA roles, spoken missing-value and fee-badge text, and a labelled focusable changelog scroll region.

## Commit
- 18173b4 feat(14-04): script.js (75 lines changed: 60 ins / 15 del) plus tests/a11y_table_check.js. Both tasks are in one commit because they were edited together.

## Changes
- initSmartHeader: `header.contains(document.activeElement)` guard, 4px hysteresis, `focusin` reveal. rAF throttle and passive listener kept.
- ESC handler: `hamburger.focus()` after closeNav (Escape path only).
- applyTranslations: `[data-i18n-title]` loop, hamburger aria-label sync (aria_menu_open/close).
- renderTable: `role="row"`, 8 `role="cell"`, `.cell-label` spans (labels built once per call; code-cell label aria-hidden), `withMissingAlt()` wrapper (aria-hidden "-" plus sr-only aria_value_missing).
- buildChangeBadgeHtml: additive aria-hidden arrow plus sr-only aria_fee_up/down text. Classes, glyphs and return rules unchanged.
- renderChangelog: `scope="col"` on 5 th, and `tabindex=0 role=region aria-label` (escaped month plus aria_table_scroll) on `.table-container`.

## Tests
- `node tests/a11y_table_check.js`: OK. `node tests/fee_chart_check.js`: OK.
- `node tests/compare_{calc,css,select,view}_check.js`: all pass.
- `python -m pytest -q`: 367 passed. One earlier run showed 32 failures while Phase 15 was mid-edit on i18n/*.json. They cleared on rerun and are not from this plan.
- script.js keeps its BOM, has no bare LF, and its diff is sane. The new test file has no BOM and no CR.
- Phase 11 seam: `emitEtfEvent("etf:table-rendered")` count is 4 and `document.dispatchEvent` count is 1, both unchanged. `trackEvent("...")` calls are unchanged (6 call sites). feeCellHtml, missingValueText and the other Phase 11 helpers were not touched.

## Phase 15 interaction
compare-select.js hooks in via the `etf:table-rendered` event and `tbody tr[data-code]`, `td.name-cell` and `.stock-link`. It wraps the link in `.cmp-name-wrap` and inserts the checkbox label. All of those hooks are preserved. The new `.cell-label` span sits before the link inside the name cell, so it is unaffected. The checkbox is injected after the row has its role="cell" attributes.

## Deviations from Plan
- The diff stayed within the 90 ins / 25 del bounds. No other rule deviations.
- Test sandbox needed extra stubs (document.body, window.location, innerWidth) because renderTable calls trackEvent. This is test-only.
- Plan assumptions A1-A4 were followed as written (sr-only span instead of aria-label on the badge).

## Pending human verification (end of Phase 16)
- Screen reader check of card mode: column name then value, missing value announcement, fee up/down announcement.
- Keyboard check: Shift-Tab from main reveals the hidden header, and Escape returns focus to the hamburger.
- Check the changelog scroll region is reachable by Tab and labelled.
- Check that switching language updates title/aria-label and the hamburger label in both open and closed states.

## Self-Check: PASSED
