---
phase: 11-script-js-seam-null-safe
fixed_at: 2026-09-30T00:00:00Z
review_path: .planning/phases/11-script-js-seam-null-safe/11-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fix commit:** a119b16
**Test:** `node tests/fee_chart_check.js` passes (`fee_chart_check OK`)

## Fixed

- **WR-01.** Added the `emitEtfEvent(name)` helper, guarded by `typeof document.dispatchEvent === "function"` and `CustomEvent`. It replaces the 3 inline dispatches (which also covers IN-01). The loading row and the error row in `fetchData` now fire `etf:table-rendered`. A failed fetch also fires `etf:data-error`. The event order is documented in a comment (which also covers IN-02).
- **WR-02.** Added `resolveFeeChartStart(startDate, firstDate)`. It accepts only a string that is a real `YYYY-MM-DD` date (round-trip checked, so `2026-02-30` is rejected) and is not later than the first point. Any other value falls back to `points[0].date`.
- **WR-03.** `renderFeeHistoryChart` takes an optional 5th argument, `startDate`. The resolved start is used for `toX`, the aria `start`, the x-axis start label and `buildFeeLinePath`. When the start precedes the first point, the first point also gets a dot, so the dots sit on the line.
- **WR-04.** Added `toFeeNumber`, a strict parse: `Number()` must succeed on the whole string after the `,` and `%` characters are stripped. `isValidFee` and `compareFeeNullLast` use it. `toNumber` is unchanged for its other callers.
- **IN-03.** A negative fee is now treated as missing, so it renders `-` and sorts last.

## Tests added (tests/fee_chart_check.js)

- Strict or negative inputs are invalid (`"12-34"`, `"0.05 garbage"`, `-0.01`, and others), and valid inputs still pass. `feeCellHtml` returns `-` for these inputs. Negative and garbage values sort last.
- An invalid `startDate`, or one later than the first point, gives the same path as the default and contains no NaN.
- A fake-DOM vm context checks the chart with `startDate`: the line start, the first dot's cx, the start label and the aria label all agree. It also checks the events: a failed fetch fires `table-rendered`, then `table-rendered`, then `data-error`, and an empty `renderTable` fires `table-rendered`.

## Not in scope

IN-04, IN-05 and IN-06 (partly covered by the new fake-DOM tests; `renderTable` with data rows and `dataset.code` are still not exercised).
