---
phase: 11-script-js-seam-null-safe
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - script.js
  - tests/fee_chart_check.js
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-30
**Depth:** standard
**Files Reviewed:** 2 (only the script.js and tests/fee_chart_check.js hunks of commit 4a43089; scripts/build_rss.py and tests/test_rss.py are out of scope, since they belong to Phase 12)
**Status:** issues_found

## Summary

The commit does what the plan asked: five helpers, the changelog guard, a sort that puts nulls last, badge suppression, the early return in feeCellHtml for missing values, `tr.dataset.code`, three guarded CustomEvent dispatches and the optional 4th `startDate` argument for `buildFeeLinePath`. `node tests/fee_chart_check.js` passes.

**Checks that came back clean:**
- **Encoding.** The UTF-8 BOM is preserved. `core.autocrlf=true`, so the index stores LF (blob: 1888 LF / 0 CRLF, the same as the parent commit's 1856 / 0). The working tree has 1888 CRLF / 1888 LF, so no bare LF. The test file is also consistent (i/lf, w/crlf, no BOM).
- **XSS.** No new XSS path:
  - `missingValueText()` is escaped.
  - The badge interpolates only a finite number and fixed literals.
  - `dataset.code` is set through the DOM API.
- **Regressions.** None found in sort, badge, feeCellHtml or the 3-arg `buildFeeLinePath`. A fee of `0` still renders `0.0000%` with the history button.

**Problems:** they are in the new seam's contract: event coverage, and `startDate` validation and consistency. There is also a gap in how the "missing" predicate is defined.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `etf:table-rendered` is not fired when tbody is replaced by the loading or error row

**File:** `script.js:649,700-702` (fetchData), `script.js:866,926` (renderTable)
**Issue:** The event only fires from `renderTable`. `fetchData` also rewrites `tbody.innerHTML`: to the loading row at L649 and to the error row at L701. Neither path fires an event. Later listeners (Phase 14 a11y, Phase 15 compare selection) that react to `etf:table-rendered` would keep stale state after rows vanish, for example selected codes whose `tr[data-code]` no longer exists, or focus that was moved into a removed row. Also, there is no `etf:data-error` event, so a listener that waits for `etf:data-ready` has no signal on failure.
**Fix:** Either document that the event means "data rows rendered" only, or fire it (or an explicit error event) in the error path as well:
```js
} catch (error) {
    ...
    tbody.innerHTML = `<tr>...table_error...</tr>`;
    updateLastUpdated(true);
    emitEtfEvent("etf:table-rendered"); // or "etf:data-error"
}
```

### WR-02: `buildFeeLinePath` startDate is not validated, so bad input yields a NaN path or a collapsed chart

**File:** `script.js:1831-1832`
**Issue:** `const start = startDate || points[0].date;` accepts any truthy value. I probed it:
- `startDate = "2026/01/01"` gives `MNaN 47.33CNaN NaN ...`, because `feeChartDayNumber` returns NaN. The SVG path is invalid and the line and area vanish.
- `startDate` later than `today` (for example `"2026-12-01"`) clamps every x to 12. The line becomes a vertical cliff at the left edge.
- `startDate` later than `points[0].date` also collapses the earlier points to x=12.

Phase 15 is expected to pass this argument, and the plan's threat T-11-05 ("tests assert no NaN/Infinity in path") only covers the happy path.
**Fix:** Fall back unless the value is a valid ISO date that is not later than the first point:
```js
const first = points[0].date;
const start = (typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate <= first) ? startDate : first;
```
Add test cases for an invalid format and for a start later than `today`.

### WR-03: `startDate` only moves the line; dots, area origin labels and the x-axis start label still use `points[0].date`

**File:** `script.js:1480` (`toX`), `script.js:1512` (start label), `script.js:1527` (the only caller)
**Issue:** In `renderFeeHistoryChart`, `toX` is `feeChartX(date, points[0].date, today)` and the start label is `formatFeeAxisDate(points[0].date)`. If a caller passes `startDate` to `buildFeeLinePath`, the curve is re-projected but the dots (L1532-1534) are not. They would sit off the line, and the axis label would be wrong. The seam is half-implemented and only safe today because the one caller still passes 3 arguments.
**Fix:** Add a `startDate` parameter to `renderFeeHistoryChart`. Compute `const start = startDate || points[0].date` once there and use it for `toX`, the start label, the aria-label `start`, and the `buildFeeLinePath(points, scale, today, start)` call.

### WR-04: The "missing" predicate accepts partly numeric garbage (`"12-34"`, `"0.05 garbage"`)

**File:** `script.js:1687-1689` (isValidFee) via `toNumber` at L1673-1678
**Issue:** DATA-10 says a non-numeric fee must show the missing text. `toNumber` uses `Number.parseFloat`, which parses a numeric prefix, so:
- `isValidFee("12-34")` returns true, and `feeCellHtml` renders `12.0000%` with a fee-history button.
- `"0.05 garbage"` sorts as a valid 0.05 value.

The plan's A3 defines "missing" as "non-numeric strings", but these are non-numeric strings that still count as valid.
**Fix:** Use a strict parse in `isValidFee` and `compareFeeNullLast`, and leave `toNumber` unchanged for other callers:
```js
function toFeeNumber(value) {
    if (value === null || value === undefined) return NaN;
    const s = String(value).replaceAll(",", "").replace("%", "").trim();
    if (s === "") return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
}
```

## Info

### IN-01: The guarded dispatch one-liner is copied 3 times

**File:** `script.js:698,866,926`
**Issue:** The same ~150-char guard plus dispatch is repeated. This makes it easy to diverge when Phase 14/15 add events or a `detail` payload.
**Fix:** `function emitEtfEvent(name, detail) { if (typeof document.dispatchEvent === "function" && typeof CustomEvent === "function") document.dispatchEvent(new CustomEvent(name, { detail })); }`

### IN-02: Event order is `etf:table-rendered` first, then `etf:data-ready`

**File:** `script.js:696-698`
**Issue:** `filterAndRenderTable()` (which fires table-rendered) runs before data-ready. A consumer that subscribes to table-rendered inside a data-ready handler will miss the first render. This is not a bug, but the seam contract should document the order.
**Fix:** Add a comment at L698 stating the order, or fire data-ready before `filterAndRenderTable()`.

### IN-03: A negative fee is "valid" and sorts first

**File:** `script.js:1687-1701`
**Issue:** `compareFeeNullLast` ranks `-0.01` above every real fee, so the bad value shows as the cheapest fund. SC3 ("a bad value can never look lowest") is only enforced for non-finite values.
**Fix:** Optionally treat `n < 0` as missing in the fee predicate, or leave this to ETL validation (Phase 10) and document it.

### IN-04: `changelogEntryFromChange` keeps raw `before`/`after` while `diff` is numeric

**File:** `script.js:1713`
**Issue:** `before`/`after` may be strings such as `"0.05%"` while `diff` is computed from parsed numbers. Nothing reads `.before`/`.after` from `changelogLatestByCode` today (grep confirms), so these fields are dead weight with mixed types.
**Fix:** Store the parsed numbers (`{ before, after, diff }` using the local `before`/`after`) or drop the unused fields.

### IN-05: The badge does not check that the changelog `after` matches the current real value

**File:** `script.js:1716-1724`
**Issue:** This existed before the change. If data.json is newer than the latest changelog month, a badge from a stale change still shows next to a different current fee. `buildChangeBadgeHtml` now receives `realValue` and could cheaply compare it with `changeData.after`.
**Fix:** Optionally `if (Math.abs(toNumber(realValue) - toNumber(changeData.after)) > 1e-6) return "";`

### IN-06: The new DOM seams are not exercised by tests

**File:** `tests/fee_chart_check.js:115-159`
**Issue:** The sandbox `getElementById` returns null, so `renderTable`, the three dispatches and `row.dataset.code` never run in tests. The test suite does not check the event names or the dataset attribute, so a typo there would not be caught. The string-level asserts are fine.
**Fix:** Add a minimal fake `tableBody` and `createElement` stub, plus `dispatchEvent`/`CustomEvent` in a second vm context. Then assert the event names and that `dataset.code` is set only for codes other than `-`.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
