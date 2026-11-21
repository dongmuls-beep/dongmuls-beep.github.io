---
phase: 25-finish-verify
plan: 02
subsystem: portfolio
tags: [safe-01, pure-helpers, tdd]
requires: []
provides: [backupAgeDays, backupStatus, noticeLines, BACKUP_STALE_DAYS]
affects: [25-03]
key-files:
  modified:
    - portfolio/portfolio-format.js
    - tests/portfolio_view_check.js
requirements-completed: [SAFE-01]
metrics:
  completed: 2026-11-21
---

# Phase 25 Plan 02: Backup/notice helpers Summary

DOM-free `backupAgeDays` (local calendar days via `localTodayIso`, clamped at 0, invalid input returns null), `backupStatus` (never/today/days/stale at 7 days) and `noticeLines` added to PortfolioFormat with node assertions (RED then GREEN).

## Commits
- e00176a test(25-02): failing checks
- 9adbca7 feat(25-02): helpers

## Deviations from Plan
None. Threat T-25-03 mitigated (invalid to null, future clamps to 0, tested).

## Verification
All `tests/*_check.js` pass; `python -m pytest tests/ -q` 464 passed.

## Self-Check: PASSED
