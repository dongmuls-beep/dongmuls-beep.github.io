---
phase: 22-price-pipeline
plan: 02
subsystem: price-pipeline
tags: [cli, github-actions]
requires: [22-01]
provides: [backfill/incremental CLI, price_update.yml]
key-files:
  created: [.github/workflows/price_update.yml, tests/test_price_cli.py, tests/test_price_workflow.py]
  modified: [scripts/build_price_history.py]
metrics:
  completed: 2026-11-11
requirements-completed: [PRICE-02, PRICE-03, PRICE-04, PRICE-05]
---

# Phase 22 Plan 02: CLI modes and daily workflow Summary

argparse CLI (backfill / incremental with max-stored-date minus 7 days per code) and a separate `price_update.yml` workflow (cron 30 5 * * *, own concurrency group, secret via env, commit scoped to prices).

## Deviations from Plan

None. Tests: 440 passed (baseline 426 + 14 new). daily_update.yml unchanged.

## Verification
- Verified: offline pytest, daily_update.yml diff empty, no-key exit 1.
- Assumed: real workflow run / secret DATA_GO_KR_KEY configured in repo (not tested).

## Self-Check: PASSED
