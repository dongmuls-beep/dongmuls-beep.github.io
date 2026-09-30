---
phase: 09-수수료-변동-그래프-모달
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - script.js
  - index.html
  - style.css
  - tests/fee_chart_check.js
  - tests/test_i18n_fee_history.py
findings:
  critical: 1
  warning: 7
  info: 5
  total: 13
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-09-30
**Depth:** standard
**Files Reviewed:** 5 (diff scope `2bd62aa..HEAD`)
**Status:** issues_found

## Summary

I reviewed the fee history modal: the trigger buttons in `renderTable`, `loadFeeHistory`, the modal open/close/focus-trap functions that now cover both modals, chart and list rendering, the scale and path math, the CSS, and both tests. Both tests pass (`node tests/fee_chart_check.js`, and 17 pytest cases). I also checked the live `fee-history.json` against `data.json`. The history is sorted, has no consecutive duplicate values, no future dates, and its last values match every current value.

**XSS:** I found no issues. All dynamic text goes through `textContent`/`setAttribute`. The one interpolated `innerHTML` (`feeCellHtml`) escapes `code` and the aria-label, and `data-field` is always a hard-coded constant.

**Privacy modal regression:** I found none. Open, close, overlay click, ESC and focus return behave the same as before the refactor.

**Main concerns:**
- The new `aria-label` hides the fee value from screen readers.
- Double-clicking a fee cell opens the modal and closes it straight away.
- A diff of zero is shown as a decrease (`▼ 0.0000%p`).
- Some edge cases (client clock behind, errors thrown during render) leave the chart wrong or the modal stuck on "loading".
- The Y-axis labels likely get clipped at the left edge.

## Critical Issues

### CR-01: Trigger `aria-label` replaces the visible fee value, so screen readers no longer hear the number

**File:** `script.js:1310-1318` (`feeCellHtml`)
**Issue:** An `aria-label` overrides the button's content as its accessible name. The label is `fee_history_open_label` ("{name} {field} 변동 그래프 보기"). It never includes `text` (e.g. `0.0470%`). A screen reader user moving through the comparison table used to hear the fee in each of the 4 cells. Now they hear "KODEX 200 총보수 변동 그래프 보기" and never the value, which is the main content of the page. This also fails WCAG 2.5.3 (Label in Name), because the visible text is not part of the accessible name, so voice-control users cannot say "click 0.0470%". Before this phase the value was read correctly, so this is a regression.
**Fix:** Keep the value in the accessible name, and put the action text in a description or in visually hidden text:
```js
return `<button type="button" class="fee-history-btn" data-code="${escapeHtml(code)}" data-field="${field}">`
    + `${text}<span class="sr-only"> ${escapeHtml(label)}</span></button>`;
```
Alternatively, add a `{value}` placeholder at the start of `fee_history_open_label` in all 8 packs and pass `value: text`.

## Warnings

### WR-01: Double-clicking a fee value opens the modal and closes it straight away

**File:** `script.js:1356-1360` (overlay click in `initFeeHistoryModal`); `script.js:1216-1220` has the same pattern for the privacy modal
**Issue:** The first click opens the modal synchronously by removing `hidden`. The second click of the double-click then lands on `.modal-overlay` at the same point (the table cell is almost never under `.modal-content`), so `event.target === modal` and the modal closes. People often double-click numbers to select them, and a fee cell now looks like text with a dotted underline. The modal flashes and disappears.
**Fix:** Ignore multi-clicks, and only close when the press also started on the overlay:
```js
let downOnOverlay = false;
modal.addEventListener("pointerdown", (e) => { downOnOverlay = e.target === modal; });
modal.addEventListener("click", (e) => {
    if (e.target === modal && downOnOverlay && e.detail <= 1) closeFeeHistoryModal();
});
```

### WR-02: A zero delta is shown as a decrease (`▼ 0.0000%p`), and the "today" replacement can create a no-change point

**File:** `script.js:1535-1540` (`renderFeeHistoryList`); `script.js:1677-1686` (`buildFeeHistoryPoints`)
**Issue:** `diff > 0 ? up : down` sends `diff === 0` to the "down" branch. There are three ways to get `diff === 0`:
1. **Today replacement:** history ends with `[today, X]` and the current value equals the previous point. Line 1680 then sets `last.value = currentValue`, so two adjacent points have the same value. The list shows a "▼ 0.0000%p" change, the chart draws an extra dot, and the aria `count` counts a change that never happened.
2. **Duplicate values:** any consecutive duplicate values in future ETL output.
3. **Rounding:** two values that differ only after the 4th decimal, since the diff is rounded to 4 places.
**Fix:** After the append/replace step, remove adjacent points whose values are equal at 4 decimals. In the list, render a zero diff as a neutral "0.0000%p" with no arrow:
```js
const deduped = points.filter((p, i) => i === 0 || p.value.toFixed(4) !== points[i - 1].value.toFixed(4));
```

### WR-03: A client clock behind the latest history date breaks the point order, the step path and the list

**File:** `script.js:1675-1686`, `script.js:1720-1731`, `script.js:1481-1484`
**Issue:** `today` comes from the device clock. If that date is earlier than the last history date (clock set wrong, or history written ahead of the device), `points.push({ date: today, ... })` adds a point with a date before its neighbour. The list is not re-sorted:
- **List:** it is built by index as "newest first", so an older date appears above a newer one, and the deltas are computed against the wrong neighbour.
- **Chart:** `feeChartX` clamps both dates to the right edge. The X-axis "end" label shows a date earlier than points that are drawn.
**Fix:** Clamp the reference date first, e.g. `const effectiveToday = last.date > today ? last.date : today;`. Use `effectiveToday` for the append/replace comparison and pass it to the chart and aria label.

### WR-04: The focus trap can be escaped with Shift+Tab right after the modal opens (inherited by the new modal)

**File:** `script.js:1234-1236`, `script.js:1270-1292` (`openModal` / `handleModalFocusTrap`)
**Issue:** `openModal` puts focus on `.modal-content`, which has `tabindex="-1"` and so is not in the `focusable` list. The only focusable element in the fee modal is the close button, so `first === last === closeBtn`. When Shift+Tab is pressed from `.modal-content`, `active !== first`, so the handler never calls `preventDefault`. The browser then moves focus to whatever comes before the dialog in the DOM, which is page content behind the `aria-modal` overlay. This bug already existed for the privacy modal, but this phase generalised the trap and the spec requires a working trap for the new modal.
**Fix:** Treat the container as part of the cycle:
```js
if (event.shiftKey && (active === first || active === modal.querySelector(".modal-content"))) {
    event.preventDefault(); last.focus();
}
```
Alternatively, set `inert` on `main` while any modal is open.

### WR-05: Focus is not returned to the originating button in Safari

**File:** `script.js:1231`, `script.js:1249-1253`, `script.js:1371-1386`
**Issue:** Safari on macOS and iOS does not focus a `<button>` when it is clicked. `document.activeElement` is therefore `<body>`, which is an `HTMLElement` and is connected. `lastFocusedBeforeModal` becomes `body`, so `closeModal` focuses `body`. The `fallbackFocus` that `closeFeeHistoryModal` works out (the matching `.fee-history-btn`, or the hint) is never used. The spec requires focus to return to the originating `.fee-history-btn`.
**Fix:** In `openModal`, ignore `document.body`:
```js
const active = document.activeElement;
lastFocusedBeforeModal = active instanceof HTMLElement && active !== document.body ? active : null;
```
Alternatively, have `closeFeeHistoryModal` always prefer its computed button.

### WR-06: An exception during rendering leaves the modal stuck on "loading" and causes an unhandled promise rejection

**File:** `script.js:1418-1448` (`renderFeeHistoryModal`), called as `void renderFeeHistoryModal()` at lines 1368 and 322
**Issue:** Only `await loadFeeHistory()` is inside `try/catch`. Anything that throws later leaves the loading `role=status` message on screen forever, with an unhandled rejection. Examples: a malformed `series[code]` shape, a `getTranslation` edge case, or `Intl` `timeZone: "Asia/Seoul"` throwing `RangeError` in an old or embedded WebView inside `getKstToday`. The user never sees the error state that the spec defines.
**Fix:** Wrap everything after the load in `try { ... } catch (e) { if (feeHistoryTarget === target) setFeeHistoryState(body, getTranslation("fee_history_error"), true); }`.

### WR-07: Y-axis tick labels probably overflow the left edge of the viewBox and get clipped

**File:** `script.js:1476-1482` (label at `x: 44`, `text-anchor: end`); `style.css` `.fee-chart-label` (12px, tabular-nums, Outfit)
**Issue:** Every tick label is 7 characters, such as `0.0470%` or `0.9223%`. In Outfit at 12 units, tabular digits are about 7 units each and `%` is about 9, so a label is roughly 46-49 units wide. With `text-anchor:end` at x=44, the label starts at about x=-2 to -5. An inline `<svg>` has `overflow:hidden` by default in the UA stylesheet, so the leading "0" is likely partly cut off. This is an estimate; I did not measure it in a browser. The UI-SPEC's "room for `0.0000%`" assumption looks too tight.
**Fix:** Widen the left gutter, e.g. `left: 56` with labels at `x: 52`, and update the expected `M48` values in `tests/fee_chart_check.js`. Or set `overflow: visible` on `.fee-history-chart svg` and add `padding-left` to the figure.

## Info

### IN-01: Y-tick labels can repeat for small ranges

**File:** `script.js:1692-1710` (`computeFeeChartScale`)
**Issue:** When min and max differ only in the 4th decimal (e.g. 0.0253 and 0.0254), the padded ticks all round to the same or adjacent values with `formatPercent` at 4 decimals. The labels then read "0.0253%, 0.0253%, 0.0254%".
**Fix:** Enforce a minimum padded range of 0.0002 (2 × 0.0001) so that the 3 ticks are always distinct at 4 decimals.

### IN-02: Live regions are inserted together with their text, so screen readers may not announce them

**File:** `script.js:1397-1404` (`setFeeHistoryState`)
**Issue:** A new `<p role="status">` is created with its text already set and swapped in with `replaceChildren`. Many screen readers only announce changes inside a live region that already exists. The loading message is often not announced; `role="alert"` is more reliable.
**Fix:** Keep one persistent status element in `#feeHistoryBody`'s parent and update only its `textContent`.

### IN-03: The fee modal title is `h3` but the privacy modal title is `h2`

**File:** `index.html:339` vs `index.html:327`
**Issue:** The headings are inconsistent, and a dialog's top heading should not skip a level (the list heading is `h4`).
**Fix:** Use `h2` for `#feeHistoryTitle` and `h3` for `.fee-history-list-title`.

### IN-04: In the mobile card layout, the value no longer lines up with its label

**File:** `style.css` (`.fee-history-btn` `min-height: 44px; align-items: center`) together with the mobile `.data-table td { align-items: flex-start }` rule (`style.css:1312-1320`)
**Issue:** The `::before` label is aligned to the top of the cell, while the value sits in the vertical centre of a 44px button. The value therefore sits about 10-12px lower than its label, in 4 cells of every card.
**Fix:** Inside the mobile media query, set `.data-table td { align-items: center; }`, or give the button `align-items: flex-start` there.

### IN-05: The tests do not cover the DOM or modal behaviour, and `fee_chart_check.js` does not run automatically

**File:** `tests/fee_chart_check.js`
**Issue:** It is a standalone node script with no package.json or CI hook, so it only runs when invoked by hand. Nothing tests:
- open and close, focus return, or ESC with two modals;
- the zero-diff rendering (WR-02);
- a `today` earlier than the last history date (WR-03).
**Fix:** Add cases for WR-02 and WR-03 to `buildFeeHistoryPoints`, and call the script from the existing pytest suite through `subprocess` so that it runs with the other tests.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
