---
phase: 07-수수료-이력-저장소-및-일일-추가
plan: 01
subsystem: data-pipeline
tags: [fee-history, etl, github-actions, python]
requires: []
provides:
  - scripts/build_fee_history.py (apply_snapshot pure core, fail-closed IO)
  - fee-history.json seed baseline (version 1)
  - daily workflow step Build Fee History + auto-commit of fee-history.json
affects: [phase-08-backfill, phase-09-ui]
tech-stack:
  added: []
  patterns: [pure-core apply_snapshot, fail-closed strict JSON load, deterministic compact JSON dump]
key-files:
  created:
    - scripts/build_fee_history.py
    - tests/test_fee_history.py
    - fee-history.json
  modified:
    - .github/workflows/daily_update.yml
key-decisions:
  - "Stdlib only; reuses FIELDS/to_float from build_changelog; strict load (no read_json_file)"
  - "Fixed KST +9 date helper; values rounded to 6 decimals before compare"
requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-04]
duration: 10min
completed: 2026-09-30
---

# Phase 7 Plan 01: Fee History Store Summary

Stdlib-only `build_fee_history.py` appends only changed, 6-decimal-rounded fee values per 종목코드 with KST dates to `fee-history.json`, fails closed on missing/corrupt/invalid files, is byte-idempotent on same-day rerun, and is wired into the daily workflow.

## Tasks
1. Core + fail-closed IO + 25 tests (commit 2509c41)
2. Seed fee-history.json (59 codes, 236 points, baseline 2026-09-30) and workflow wiring (commit a59be4b)

## Verification
- `pytest tests/ -q`: 88 passed
- Re-running the script after seeding: sha256 unchanged
- Workflow order: Build Changelog -> Build Fee History -> Commit; file_pattern includes fee-history.json

## Deviations from Plan
None - plan executed as written. Tests and implementation were committed together in one commit (no separate RED commit). `git pull --rebase` was not run per orchestrator instruction.

## Known Stubs
None.

## Self-Check: PASSED
