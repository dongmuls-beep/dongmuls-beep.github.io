---
phase: 25-finish-verify
plan: 01
subsystem: i18n
tags: [i18n, safety-copy]
requires: []
provides: [pf_notice_*, pf_backup_* status, pf_disclaimer_* keys in 8 packs]
affects: [25-03]
key-files:
  modified: [i18n/ko.json, i18n/en.json, i18n/vi.json, i18n/zh.json, i18n/ja.json, i18n/th.json, i18n/tl.json, i18n/km.json, tests/test_i18n_portfolio.py]
requirements-completed: [SAFE-01, SAFE-02]
metrics:
  completed: 2026-11-21
---

# Phase 25 Plan 01: Safety copy i18n Summary

9 new pf_ keys (first-visit storage notice, persist-denied, backup age status, disclaimer + as-of) added after pf_warn_pre_listing in all 8 language packs; parity test now expects 126 keys.

## Deviations from Plan

None. Both tasks committed together as the plan specifies. Native review of vi/zh/ja/th/tl/km copy remains deferred.

## Verification

`python -m pytest tests/ -q`: 464 passed; all `tests/*_check.js` pass.

## Self-Check: PASSED
