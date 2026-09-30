---
phase: 09-수수료-변동-그래프-모달
fixed_at: 2026-09-30T00:00:00Z
review_path: .planning/phases/09-수수료-변동-그래프-모달/09-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-09-30
**Source review:** .planning/phases/09-수수료-변동-그래프-모달/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, WR-01..WR-07)
- Fixed: 8
- Skipped: 0

Checks after all fixes: `python -m pytest tests/ -q` (145 passed), `node tests/fee_chart_check.js` (OK), `node --check script.js` (OK). script.js still has its BOM and CRLF line endings.

## Fixed Issues

### CR-01: Trigger `aria-label` replaces the visible fee value

**Files modified:** `script.js`
**Commit:** 9dbbc4a
**Applied fix:** In `feeCellHtml`, the aria-label is now `"{value} {translated open label}"`, e.g. "0.0470% KODEX 200 총보수 변동 그래프 보기". The visible value comes first, which satisfies Label in Name. No i18n packs were changed.

### WR-01: Double-clicking a fee value opens the modal and closes it straight away

**Files modified:** `script.js`
**Commit:** 509c561
**Applied fix:** Added a shared helper, `bindModalOverlayClose(modal, onClose)`, used by both the privacy modal and the fee modal. It closes the modal only when the pointerdown also landed on the overlay and `event.detail <= 1`.

### WR-02: A zero delta is shown as a decrease

**Files modified:** `script.js`, `tests/fee_chart_check.js`
**Commit:** b925336
**Applied fix:** `buildFeeHistoryPoints` now removes adjacent points whose values are equal at 4 decimals. The list shows a zero diff as a neutral `0.0000%p` with no glyph (base `.fee-history-delta` class only). Added asserts for the case where replacing "today" makes it equal to the previous value, and for duplicate history values.
**Status:** fixed: requires human verification (logic)

### WR-03: A client clock behind the latest history date breaks the point order

**Files modified:** `script.js`, `tests/fee_chart_check.js`
**Commit:** 67ed942
**Applied fix:** If today is earlier than the last history date, no "today" point is added or replaced. `renderFeeHistoryModal` passes `max(lastDate, today)` as the chart end, which feeds the X-axis end label, the aria-label and the path. Added an assert for this case.
**Status:** fixed: requires human verification (logic)

### WR-04: The focus trap can be escaped with Shift+Tab

**Files modified:** `script.js`
**Commit:** bae050d
**Applied fix:** In `handleModalFocusTrap`, Shift+Tab now wraps to the last focusable element when focus is on either the first focusable element or the `.modal-content` container.

### WR-05: Focus is not returned to the originating button in Safari

**Files modified:** `script.js`
**Commit:** 8d054a5
**Applied fix:** `openModal` no longer records `document.body` as `lastFocusedBeforeModal`. When that happens, `closeModal` uses the fallback computed by `closeFeeHistoryModal` (the matching `.fee-history-btn`, or the hint).

### WR-06: An exception during rendering leaves the modal stuck on "loading"

**Files modified:** `script.js`
**Commit:** 24532e4
**Applied fix:** Moved the post-load rendering into `renderFeeHistoryContent(...)`. It is called inside try/catch, and the catch shows the `fee_history_error` state if the same target is still open.

### WR-07: Y-axis tick labels probably get clipped at the left edge

**Files modified:** `script.js`, `tests/fee_chart_check.js`
**Commit:** 3ccebe1
**Applied fix:** `FEE_CHART.left` goes from 48 to 56, and the Y labels are now at `FEE_CHART.left - 4` (x=52). This is a small change from the UI-SPEC plot area (48..308 becomes 56..308), made because it was cheap to do. The test's expected `M48` values were updated to `M56`.

---

_Fixed: 2026-09-30_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
