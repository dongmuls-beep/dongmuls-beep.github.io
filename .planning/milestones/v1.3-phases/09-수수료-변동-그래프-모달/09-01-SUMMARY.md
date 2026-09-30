---
phase: 09-수수료-변동-그래프-모달
plan: 01
subsystem: i18n
tags: [i18n, pytest, fee-history]
requires:
  - phase: 08
    provides: fee-history.json data
provides:
  - 9 fee_history_* plain-text keys in all 8 language packs
  - pytest parity test for keys and placeholders
affects: [09-02, 09-03]
tech-stack:
  added: []
  patterns: ["i18n parity pytest with utf-8-sig tolerant loading"]
key-files:
  created: [tests/test_i18n_fee_history.py]
  modified: [i18n/ko.json, i18n/en.json, i18n/vi.json, i18n/zh.json, i18n/ja.json, i18n/th.json, i18n/tl.json, i18n/km.json]
key-decisions:
  - "Appended keys via byte-level edit preserving CRLF, no BOM, 2-space indent"
requirements-completed: [CHART-06]
duration: 10min
completed: 2026-09-30
---

# Phase 9 Plan 01: Fee History i18n Summary

Nine fee_history_* modal strings added to all 8 language packs (ko exact per UI-SPEC, others translated) with placeholders preserved and a pytest parity test.

## Tasks
1. Parity test (RED, 17 failures before keys): dbd007c
2. Keys added to 8 packs (GREEN): 825245e

## Verification
- `python -m pytest tests -q`: 145 passed
- Each i18n file diff: 10 insertions, 1 deletion (comma on old last line)

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None.

## Self-Check: PASSED
