---
phase: 09-수수료-변동-그래프-모달
plan: 02
subsystem: ui
tags: [vanilla-js, modal, a11y, fee-history]
requires:
  - phase: 09-01
    provides: fee_history_* i18n keys in all 8 language packs
provides:
  - Fee cell trigger buttons (4 fee columns) opening #feeHistoryModal
  - Shared openModal/closeModal/handleModalFocusTrap for privacy + fee modals
  - loadFeeHistory (cached promise, reset on failure), buildFeeHistoryPoints, change list
  - tests/fee_chart_check.js node vm harness
affects: [09-03]
tech-stack:
  added: []
  patterns: [delegated tbody click listener, textContent-only DOM building, vm harness over script.js]
key-files:
  created: [tests/fee_chart_check.js]
  modified: [script.js, index.html, style.css]
key-decisions:
  - "Document-level ESC handler now closes the topmost open .modal-overlay (skips when the modal keydown already handled it via defaultPrevented)"
  - "Mobile flex-td override not added; button stays an inline flex item in the card layout"
requirements-completed: [CHART-01, CHART-03, CHART-04, CHART-05]
duration: 20min
completed: 2026-09-30
---

# Phase 9 Plan 02: Fee History Modal Summary

Fee cells (총보수, 기타비용, 매매중개수수료, 실부담비용) are now dotted-underline buttons that open a shared-plumbing modal showing loading, error, empty, or a newest-first change list with ▲/▼ %p deltas.

## Tasks

| Task | Commit | Notes |
|------|--------|-------|
| 1 Pure helpers + harness | 84e5377 | RED confirmed (build not a function), then GREEN; TDD |
| 2 Modal generalization, markup, buttons, states, list | 9f7e29c | script.js, index.html |
| 3 Styles | 17980cc | existing tokens only, no transitions |

## Verification
- `python -m pytest tests/ -q`: 145 passed
- `node tests/fee_chart_check.js`: OK; `node --check script.js`: OK
- BOM and CRLF preserved in script.js, style.css, index.html
- Grep gates: no innerHTML in renderFeeHistoryModal/List; no openPrivacyModal/closePrivacyModal left; no new hex colors in CSS
- Not done: in-browser click-through (no browser automation available in this environment); manual check recommended per plan verification section.

## Deviations from Plan

**[Rule 3 - Blocking] Document-level ESC handler** in initNavigation also called the removed closePrivacyModal; updated to close the topmost open modal generically. No other deviations.

## Known Stubs
None. The SVG chart and no-change caption are intentionally deferred to 09-03.

## Self-Check: PASSED
