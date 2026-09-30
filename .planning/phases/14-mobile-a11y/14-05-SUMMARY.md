---
phase: 14-mobile-a11y
plan: 05
subsystem: frontend-a11y
tags: [a11y, states, skeleton, aria-live]
requires: [14-01, 14-02, 14-03, 14-04]
provides: [A11Y-08]
key-files:
  modified: [script.js]
  created: [tests/a11y_states_check.js]
metrics:
  completed: 2026-09-30
---

# Phase 14 Plan 05: Accessible loading/error/empty states Summary

Main table and changelog now show skeletons, an error box with a Retry button, and an empty box (Show-all button or hint). Loading, row count and empty are announced politely through `#tableStatus` / `#changelogStatus`, and `aria-busy` toggles. The Phase 11 event seam is unchanged.

## Commit
- 5247bef feat(14-05): script.js (+97/-6) and tests/a11y_states_check.js (new)

## Tests
- a11y_states_check, a11y_table_check, fee_chart_check: OK
- compare_*_check (calc, chart, css, select, view): OK
- `python -m pytest -q`: 367 passed
- Seam counts unchanged: `emitEtfEvent("etf:table-rendered")` = 4, `document.dispatchEvent` = 1, `trackEvent("` = 6.
- script.js keeps BOM and CRLF, with no bare LF. The test file is LF with no BOM.

## Decisions and assumptions
- Followed the plan's assumptions A1-A4: no "All" tab, so reset-filter sets `currentCategory = ""` and focuses the first tab.
- Changelog success clears `#changelogStatus`.
- compare-select.js keeps working: skeleton, error and empty rows carry no `data-code` and use `td.state-cell`, so they are not mistaken for data rows. The event still fires after each render.

## Deviations
- The loading announcement uses `stripHtmlTags(getTranslation("table_loading"))` rather than the raw string, for textContent safety (minor).
- The changelog retry focus falls back to `document.querySelector("#changelogList .table-container")`, then the new retry button, then the list.
- The test's fake DOM needed `body`, `window.location`, `querySelector` and similar stubs so that the real `renderTable` and `trackEvent` could run. This is test-only.
- Nothing else deviated.

## Pending human verification (end of Phase 16)
- Real-browser check of skeleton, error and retry (block the network), reset-filter focus, and screen-reader announcements of `#tableStatus` / `#changelogStatus`.
- Retry focus behavior on the changelog page.

## Self-Check: PASSED
