---
phase: 24-portfolio-ui
plan: 09
subsystem: portfolio-ui
tags: [portfolio, export, import, dialog]
requires: [24-01, 24-08]
provides: [export from memory, validated import, overwrite confirm dialog, storage-failure memory fallback]
affects: [portfolio/portfolio-view.js]
key-files:
  modified: [portfolio/portfolio-view.js]
requirements-completed: [PF-01]
metrics:
  completed: 2026-11-21
---

# Phase 24 Plan 09: Export/import Summary

Export builds etfsave-portfolio-YYYY-MM-DD.json from on-screen rows (aria-disabled + pf_export_empty when empty). Import is all-or-nothing: handleImport opens the native confirm dialog before importRows whenever rows are on screen, shows row-numbered errors (max 20 + more), leaves edit mode before replacing rows, and applies validated rows in memory on STORAGE_UNAVAILABLE/QUOTA_EXCEEDED.

## Deviations from Plan
None.

## Verification
File parses; all tests/*_check.js pass; pytest 464 passed; grep gates met; no innerHTML. No browser run; static gates only.

## Known Stubs
None.

## Self-Check: PASSED
