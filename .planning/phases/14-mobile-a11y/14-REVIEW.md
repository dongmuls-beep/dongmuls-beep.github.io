---
phase: 14-mobile-a11y
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - script.js
  - style.css
  - index.html
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 14: Code Review Report

Time-boxed review of script.js, style.css and index.html diffs. Not fully covered: the other HTML pages, i18n (0d11128) and the tests. No critical bugs found. `etf:table-rendered` is still emitted on every path (loading, error, empty, success), so compare-select.js keeps working. It only touches `tr[data-code]` and `td.name-cell .stock-link`, and the new `.cell-label` span does not disturb `link.textContent`. Pages without the table are safe: `initStateActions`, `setStatus` and `setBusy` all null-guard.

## Warnings

### WR-01: Unescaped translation strings in innerHTML
**File:** `script.js:707` and `script.js:1287`
**Issue:** `${getTranslation("table_error")}` and `${getTranslation("changelog_error")}` are inserted into innerHTML without `escapeHtml`. The other new state strings are escaped, so this is inconsistent. The old code did the same, but the new state builders keep the pattern. If the i18n JSON ever contains markup or a user-controlled pack is loaded, this is XSS. `stripHtmlTags` is applied elsewhere, which suggests some strings carry tags.
**Fix:** Use `escapeHtml(stripHtmlTags(getTranslation(...)))`, or a sanitized allow-list if the tags are intended.

### WR-02: reset-filter leaves no tab active and ignores presets
**File:** `script.js:733-737`
**Issue:** The handler sets `currentCategory = ""` and removes `active` from all tabs. The tabs are built from `categories` only, with no "all" tab, so afterwards no tab shows as selected while all rows are shown. `filterAndRenderTable()` also overrides `currentCategory` with `getCategoryPreset()` on preset pages. There, reset is a no-op and the empty state comes back, with focus jumping to the first tab.
**Fix:** Hide the reset button when a preset exists. Otherwise reset to `categories[0]` and re-add `active` to the matching tab, or add a real "all" tab.

### WR-03: Stale or incomplete live-region status on fetch error
**File:** `script.js:811-817`
**Issue:** Loading sets `#tableStatus` to the loading text. The catch branch never updates or clears it (it relies on `role="alert"` in the box). The polite region keeps saying "loading" after a failure. `setBusy` is also only reset in the catch and in `renderTable`, so any earlier throw before `renderTable` (for example a parse error outside the try) leaves `aria-busy="true"`.
**Fix:** In the catch, call `setTableStatus(stripHtmlTags(getTranslation("table_error")))`. Set `setBusy(..., false)` in a `finally`.

### WR-04: Removal of the global `:focus-visible` rule
**File:** `style.css` (removed at about line 1102)
**Issue:** The global `:focus-visible { outline }` was deleted. Only `.language-selector select` and `.table-container` are explicitly re-added, plus an existing "Focus rings" block. Verify that the existing block covers `a`, `button`, `.tab-button`, `[role=button]` (the code cell) and `.cmp-check`. If it does not, those elements lose their keyboard focus indicator, which is a WCAG 2.4.7 regression.
**Fix:** Restore a baseline `:focus-visible` rule, or confirm coverage by grepping the "Focus rings" block.

## Info

### IN-01: Inconsistent `.cell-label` hiding from assistive technology
**File:** `script.js:1022-1032`
**Issue:** The code cell's label span is `aria-hidden`, but the other labels are not. Meanwhile `td::before` was removed and `.cell-label` is `display:none` on desktop, so screen readers read the label only on mobile. That is inconsistent with the redundant `role="cell"`/`role="row"` and the header association. On mobile the label is announced twice: once from the column header and once as the cell content.
**Fix:** Use `aria-hidden="true"` on all `.cell-label` spans, since the `th` provides the column name.

### IN-02: Theme color changed to a light value while body styling may remain dark
**File:** `index.html:10`
**Issue:** `theme-color` changed from `#0f172a` to `#e8edf5`. The other pages were not checked. Confirm all pages were changed consistently.
**Fix:** Grep every page for `theme-color`.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Disposition (orchestrator, 2026-09-30)

Per coordinator deadline directive: fix only critical issues. 0 critical found → no source changes.

| ID | Status |
|----|--------|
| WR-01 | Deferred — escape `table_error`/`changelog_error` before innerHTML (i18n packs are first-party; low practical risk) |
| WR-02 | Deferred — reset-filter on category-preset pages / no "all" tab selected state |
| WR-03 | Deferred — clear `#tableStatus` loading text on fetch error (use finally) |
| WR-04 | Resolved (false positive) — global `:focus-visible` rule still present at style.css:1035; only the duplicate from the Additive block was removed |
| IN-01 | Deferred — aria-hidden on non-code `.cell-label` spans (verify with screen reader in Phase 16 human pass) |
| IN-02 | Resolved — verifier confirmed all 7 pages use theme-color #e8edf5 |

Review coverage was partial (other HTML pages, i18n commit, test files not reviewed).
