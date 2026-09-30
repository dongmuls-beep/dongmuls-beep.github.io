---
phase: 06-변경-이력-정합성
plan: 01
subsystem: changelog
tags: [changelog, data-integrity, ci, pytest]
requires: []
provides:
  - "Bulk-correction detection (>=50% of ETFs change 총보수/기타비용) in build_changelog.py"
  - "Idempotent cleanup of bulk entries from existing changelog on every CI run"
affects: [changelog.json, daily_update workflow]
tech-stack:
  added: []
  patterns: ["pure-function detection + soft [WARNING] DATA-06, exit 0"]
key-files:
  created: [tests/test_changelog.py]
  modified: [scripts/build_changelog.py]
key-decisions:
  - "Same detector applied to existing entries (no hardcoded date denylist); runs every execution before early returns"
  - "Denominator for existing entries = max(data.json row count, distinct codes in entry)"
requirements-completed: [DATA-05, DATA-06]
duration: 5min
completed: 2026-09-30
---

# Phase 6 Plan 01: 변경 이력 정합성 Summary

One detector (count_compared / detect_bulk_correction / filter_bulk_entries) removes the fake 2026-05-27 entry from production and blocks bulk-correction runs from being recorded.

## Tasks

1. Task 1 (TDD): detection, cleanup, 11 unit tests - commit 467cdf7. Full suite 55 passed. Dry run against real changelog removed only 2026-05-27, kept 7.
2. Task 2: pushed, ran "Daily ETF Data Update" (run 36652830308, success). CI log: `[WARNING] DATA-06: removed bulk-correction entry 2026-05-27 (총보수 59/59, 기타비용 59/59)`. Auto-commit 6eff1ab. Production https://etfsave.life/changelog.json verified: 7 entries, no 2026-05-27, exactly one 2026-05 entry; origin/main changelog.json has no 2026-05-27.

## Deviations from Plan

- Tests import via `sys.path` insert of scripts/ (`import build_changelog`), the plan's sanctioned fallback.
- filter_bulk_entries returns removed as (entry, flagged, total) tuples rather than bare entries (needed for warning output); test asserts length only.

## Known Stubs

None.

## Self-Check: PASSED
