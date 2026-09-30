---
phase: 09-수수료-변동-그래프-모달
verified: 2026-09-30T00:00:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Desktop and 320/375px: open a fee modal for a series with history and check the chart's left edge"
    expected: "Y-axis tick labels are fully visible, not clipped. The plot area starts at x=56 instead of the UI-SPEC's 48, and nothing overlaps."
    why_human: "WR-07 changed the chart geometry after the user's UAT. Only a visual check can confirm the layout."
  - test: "Keyboard: open the modal, press Shift+Tab repeatedly, then close with ESC and with the close button, in Chrome and Safari if available"
    expected: "Focus stays inside the modal. After closing, focus returns to the originating fee button."
    why_human: "WR-04 and WR-05 changed the focus-trap and focus-return logic after UAT. Safari behavior can't be checked by grep."
  - test: "Double-click a fee value, then press-drag from inside the modal onto the overlay and release"
    expected: "A double-click opens the modal and it stays open. A drag that starts inside and ends on the overlay doesn't close it. A plain click on the overlay closes it."
    why_human: "WR-01 rewrote the overlay-close logic, which is shared with the privacy modal. Check the privacy modal too."
  - test: "Screen reader or accessibility inspector on a fee cell"
    expected: "The accessible name reads '<value> <translated open label>' in every language."
    why_human: "CR-01 changed the aria-label. Confirming it needs assistive tech."
  - test: "Open a series whose latest history value equals the current value, and look at the change list"
    expected: "Zero-change rows show a neutral 0.0000%p with no arrow or glyph. No duplicate adjacent points appear."
    why_human: "WR-02 changed the list's visible content and the data-dependent display."
---

# Phase 9: Fee Change Chart Modal Verification Report

**Phase Goal:** A user can click an ETF fee cell and see the item's past changes as a chart and a change list.
**Verified:** 2026-09-30
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth (CHART-xx) | Status | Evidence |
|---|---|---|---|
| 1 | CHART-01: The fee cells are clickable, tappable and keyboard-operable, and look clickable. | VERIFIED | `feeCellHtml` (script.js:1317) renders `<button class="fee-history-btn" data-code data-field aria-label>`. It is used for the fee, other, trade and real columns (script.js:908-911). There is a delegated click handler (script.js:1359-1361). `.fee-history-btn` and its hover and `:focus-visible` styles are in style.css:698-721. The hint `#feeHistoryHint` is in index.html:245. |
| 2 | CHART-02: The modal shows a step-line SVG chart, and the last value extends to today. | VERIFIED | `renderFeeHistoryChart` (script.js:1479) builds the SVG with a viewBox. `buildFeeHistoryPoints` adds or replaces a today point. `tests/fee_chart_check.js` passes (OK) and covers the today extension, the clock-behind case and the M56 path. |
| 3 | CHART-03: No-change or single-point series get a flat line and a notice. Loading and error states are shown. | VERIFIED | `setFeeHistoryState` is used for loading, error and empty (script.js:1423-1462). The fetch/schema failure path and the render try/catch both show `fee_history_error`. `fee-history.json` exists (32 KB). |
| 4 | CHART-04: A change list (date, value, delta) is shown under the chart. | VERIFIED | `renderFeeHistoryList(points)` is appended in `renderFeeHistoryContent` (script.js:1475). WR-02 also handles zero deltas. |
| 5 | CHART-05: ESC and the close button close the modal, and focus returns to the cell. It works on mobile. | VERIFIED | The ESC handler calls `closeFeeHistoryModal` (script.js:165). The close button is bound (script.js:1355-1366). The fallback focus target is the matching `.fee-history-btn` or the hint (script.js:1390-1394). `handleModalFocusTrap` is present. Mobile was UAT-approved at 320/375px. |
| 6 | CHART-06: The modal text is available in all 8 languages. | VERIFIED | `grep -c fee_history` returns 9 keys in each of ko, en, vi, zh, ja, th, tl and km. A language change re-renders an open modal (script.js:319-322). |

**Score:** 6/6 truths verified

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|---|---|---|---|
| CHART-06 | 09-01 | SATISFIED | i18n keys in all 8 packs. |
| CHART-01 | 09-02 | SATISFIED | See truth 1. |
| CHART-03 | 09-02, 09-03 | SATISFIED | See truth 3. |
| CHART-04 | 09-02 | SATISFIED | See truth 4. |
| CHART-05 | 09-02 | SATISFIED | See truth 5. |
| CHART-02 | 09-03 | SATISFIED | See truth 2. |

All six IDs appear in the plan frontmatter and are marked Complete in REQUIREMENTS.md (lines 24-29 and 57-62). There are no orphaned requirements.

### Behavioral Spot-Checks

| Check | Command | Result | Status |
|---|---|---|---|
| Fee chart logic | `node tests/fee_chart_check.js` | fee_chart_check OK | PASS |
| Syntax | `node --check script.js` | ok | PASS |
| Test suite | `python -m pytest tests/ -q` | 145 passed | PASS |

### Anti-Patterns Found

None. There are no TBD, FIXME or XXX markers in script.js.

### Human Verification Required

The user's UAT was done before the review fixes. The core flow is unchanged, but several fixes change what the user sees or how the interaction behaves. A short re-check is recommended for the five items in the frontmatter. The most visible ones are WR-07 (chart left margin 48 to 56), the WR-04 and WR-05 focus behavior, and the WR-01 overlay-close change. WR-01 also affects the privacy modal.

### Gaps Summary

There are no code gaps. All six requirements are implemented and wired, and the automated checks pass. The status is human_needed only because post-UAT fixes touched visible and interaction behavior.

---

_Verified: 2026-09-30_
_Verifier: Claude (gsd-verifier)_


## Post-verification update (2026-09-30)

- Human re-check of 5 review-fix items: all pass (09-HUMAN-UAT.md).
- User-requested visual polish (deviation from UI-SPEC geometry/step line): chart drawn at modal width, monotone cubic smooth line instead of step, gradient area, inline Y labels, YYYY.MM x labels, end-value highlight. User approved in browser. Change-date precision preserved in the change list.
