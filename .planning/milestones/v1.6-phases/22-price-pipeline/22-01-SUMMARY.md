---
phase: 22-price-pipeline
plan: 01
subsystem: price-pipeline
tags: [prices, data.go.kr, stdlib, guard]
requires: [21-spike]
provides: [PRICES-CONTRACT, build_price_history core]
affects: [22-02]
key-files:
  created:
    - .planning/phases/22-price-pipeline/PRICES-CONTRACT.md
    - scripts/build_price_history.py
    - tests/test_price_core.py
metrics:
  tests_added: 15
  tests_total: 426
completed: 2026-11-11
requirements-completed: [PRICE-01, PRICE-04, PRICE-05]
---

# Phase 22 Plan 01: Price core Summary

Stdlib-only core (fetch/parse/normalize/merge/guard/atomic write) for prices/{code}.json and prices-meta.json, with a documented contract and 15 offline tests.

## Commits
- Task 1: contract doc (docs(22-01))
- Task 2: feat(22-01) core module and tests

## Behavior
- collect() gathers in memory, trips guard (exit 2) before any write, writes codes first and meta last; missing codes keep existing files; corrupt existing files are skipped and counted missing; meta is not rewritten when only generated_at differs.
- FetchError carries only code, exception class and HTTP status; mask() strips the key (raw and quoted forms) and query strings of apis.data.go.kr URLs; URL is never logged.

## Deviations
None. No CLI/main yet (plan 22-02).

## Known Stubs
None.

## Self-Check: PASSED
