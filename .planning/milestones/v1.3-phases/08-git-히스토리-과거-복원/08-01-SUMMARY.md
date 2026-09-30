---
phase: 08-git-히스토리-과거-복원
plan: 01
subsystem: data
tags: [python, git-history, fee-history, backfill]
requires:
  - phase: 07
    provides: build_fee_history apply_snapshot/validate_history/dump_history/write_atomic
provides:
  - scripts/backfill_fee_history.py (one-off local replay of data.json git history)
  - fee-history.json regenerated (59 series, 1169 points, since 2026-02-12)
affects: [09 charts]
tech-stack:
  added: []
  patterns: [pure replay(snapshots)->(history, report) separated from git reader]
key-files:
  created: [scripts/backfill_fee_history.py, tests/test_backfill_fee_history.py]
  modified: [fee-history.json]
key-decisions:
  - "Detection-driven re-baseline only (no hardcoded date wipe); real data yields 0 re-baselines"
  - "MAX_FEE=5 sanity cap applied before same-day selection"
requirements-completed: [BACK-01, BACK-02, BACK-03]
duration: 20min
completed: 2026-09-30
---

# Phase 8 Plan 01: Git history backfill Summary

Replay of 156 data.json commits (146 KST days, last-commit-of-day, zfill(6), typo alias, orphan pruning) into a regenerated fee-history.json with a stdout review report and `--dry-run`.

## Tasks and commits
- Tasks 1+2 (replay core, git reader, report, main, 20 tests): a55b04c
- Task 3 (real-data run, regenerated fee-history.json): 99a8357

## Real-run report
```
days replayed: 146 (2026-02-12..2026-09-30)
points per field: 총보수=64, 기타비용=151, 매매중개수수료=467, 실부담비용=487, total=1169
changes per field: 총보수=5, 기타비용=92, 매매중개수수료=408, 실부담비용=428, total=933
re-baselines: 0
superseded same-day commits: 9 (e808192 c5768b8 35b57f6 6467c71 895ea7c 8102483 2ebc808 9a8f04c f93a4a4)
skipped commits: 1 (59b9a86 2026-05-27 out-of-range)
dropped codes (absent from latest snapshot): 6 (304660, 304670, 426020, 458250, 472870, 476750)
A->B->A within 2 days: 0
```

## Verification
- Full suite: 124 passed.
- Stats: 59 series, 59 names, 1169 points, updatedAt 2026-09-10, values within [0,5], 360200 실부담비용 series matches research; 36 series with multi-point 기타비용; 32,490 bytes; no `20200804`.
- Changelog cross-check: 912 changes, 0 mismatches.
- `build_fee_history.py` after backfill: "no changes", sha256 identical.
- Workflow files untouched; no `shell=True`; forbidden strings absent from script.
- Unpushed: `git log origin/main..HEAD` lists both new commits (local `origin/main` ref is stale, so the list also includes earlier local commits; nothing was pushed).

## Deviations from Plan
- Tasks 1 and 2 were committed together in a55b04c (code written in one pass), and fee-history.json committed separately in 99a8357 rather than all 3 files in one commit. No RED-only test commit was made.
- Skipped/superseded split is 1/9 as planned (59b9a86 skipped as out-of-range; 9a8f04c superseded).
- Test fixture adjusted: the same-day garbage test uses in-range values for the middle commit (out-of-range ones are skipped rather than superseded); the report-count test uses 4 codes so a single-code change is not a bulk correction.

## Known Stubs
None.

## Self-Check: PASSED
