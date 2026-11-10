---
phase: 19-compare-ui
plan: 01
subsystem: compare-ui
tags: [a11y, i18n, compare-view]
requires: []
provides:
  - "CompareView.updateScrollable (all .cmp-table-wrap)"
  - "etf:lang-changed driven re-render on /compare/"
affects: [19-02, 19-03]
key-files:
  modified:
    - compare-view.js
    - tests/compare_view_check.js
key-decisions:
  - "Reuse i18n key compare_chart_metric_label for corner th (no new key)"
  - "Token cut by 200-char bound is dropped, not parsed"
metrics:
  tasks: 2
  files: 2
  completed: 2026-11-10
---

# Phase 19 Plan 01: compare-view fixes Summary

Corner th labelled, ?compare= never builds a code from a cut token, language change re-renders via `etf:lang-changed` (MutationObserver removed), focus survives Retry, scroll hint covers every table wrap.

## Tasks

| Task | Commit |
|------|--------|
| 1 Corner th + safe truncation (CMP-08) | a064244 |
| 2 lang-changed, retry focus, updateScrollable (CMP-10, CMP-09 focus, CMP-11 support) | 4357f48 |

## Verification

All `tests/compare_*_check.js`, `tests/a11y_*_check.js`, `tests/fee_chart_check.js` pass; `python -m pytest tests/ -q` 408 passed.

## Deviations from Plan

None in behavior. Test file avoids the literal word MutationObserver (assertion built via string concat) to satisfy the 0-grep acceptance criterion.

## Notes

- Retry focus: #cmp-state (tabindex -1) on click, #cmp-table-h on success; empty/error paths clear the refocus flag.
- Human verification still pending (real browser: language switch, Retry focus ring).
- CMP-09 and CMP-11 remain open pending plans 19-02/19-03.

## Self-Check: PASSED
