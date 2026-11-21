---
phase: 22-price-pipeline
verified: 2026-11-21T00:00:00Z
status: human_needed
score: 5/5 roadmap success criteria verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "Confirm data.go.kr terms permit the public prices/ data (carried from Phase 21 SPIKE-01)"
    expected: "Written agency answer, or withdrawal by deleting prices/ and prices-meta.json"
    why_human: "Published prices/ is redistributed data under a license that forbids redistribution. The risk is owner-accepted (REQUIREMENTS.md, 2026-11-11), not resolved."
  - test: "Confirm the daily server run (etf-prices.timer running deploy/run-prices.sh) works in production"
    expected: "journalctl shows 'PRICES OK' daily and prices-meta.json as_of advances"
    why_human: "The GitHub workflow price_update.yml is disabled. The server timer replaced it. The server was not inspected here. Indirect evidence only: prices-meta.json as_of 2026-11-19 and generated_at 2026-11-21T11:43:53Z are later than the 22-03 backfill (as_of 2026-11-10), so an incremental run did happen after the backfill."
  - test: "Decide whether the two copies of the daily job (price_update.yml and run-prices.sh) should be merged or the workflow removed"
    expected: "Owner decision"
    why_human: "Drift risk; a design preference."
---

# Phase 22: Price Collection Pipeline Verification Report

**Phase Goal:** Daily closes for the 59 tickers pile up safely as static JSON every day.
**Verified:** 2026-11-21
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement: ROADMAP success criteria

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | prices/{code}.json and prices-meta.json are produced per the documented contract | VERIFIED | Ran a stdlib check over all prices/*.json: 59 files, each `version==1`, `len(dates)==len(close)`, dates ascending and unique. prices-meta.json = `{as_of 2026-11-19, collected 59, expected 59, missing [], missing_ratio 0.0, threshold 0.1, version 1, generated_at}`, the exact PRICES-CONTRACT.md shape. 59 files tracked by git. |
| 2 | One backfill fills history within the retention cap | VERIFIED | Earliest date across files is 2021-11-19 (the 5-year window relative to latest 2026-11-19, as in the contract trim). 22-03-SUMMARY: backfill rc=0, 59/59, idempotent rerun byte-identical. `--mode backfill` and `--mode incremental` present in `main()`. |
| 3 | Separate workflow adds daily and is not tied to the Selenium ETL | VERIFIED (production path moved) | `.github/workflows/price_update.yml` (cron `30 5 * * *`, own concurrency group, secret `DATA_GO_KR_KEY`) is separate from daily_update.yml; tests/test_price_workflow.py passes. daily_update.yml was untouched by Phase 22 (its later change is 23-01's CI glob). The workflow is disabled in practice. The server `etf-prices.timer` with `deploy/run-prices.sh` runs incremental on its own, with the lock shared with the ETL. Independence is preserved. |
| 4 | Over-threshold missing ratio keeps existing files and fails the job | VERIFIED | `collect()` returns 2 before any write when the guard trips (build_price_history.py line 267). Tests test_guard_trips_files_untouched, test_guard_on_fresh_dir_writes_nothing, test_missing_keeps_existing, test_corrupt_existing_skipped pass. Contract: meta written last. |
| 5 | No serviceKey/URL in logs/exceptions; tests run without the real API | VERIFIED | `mask()` strips URL query and key variants; `FetchError` carries only code, kind. test_mask_key_and_url and test_fetch_retries_and_no_key_leak pass with monkeypatch. No 64-hex string in tracked py/md/yml/sh/js files (outside .venv). 38 test functions in tests/test_price_*.py. |

**Score:** 5/5

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite | `python -m pytest tests/ -q` | 483 passed in 4.30s | PASS |
| Live data matches contract | stdlib check over prices/*.json and prices-meta.json | 59/59 valid, meta matches contract | PASS |
| Probe scripts | none declared in plans | n/a | SKIPPED |

## Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `PRICES-CONTRACT.md` | VERIFIED | Schema, guard, normalization, withdrawal, determinism. Matches the live files. |
| `scripts/build_price_history.py` | VERIFIED | Core functions (mask, normalize_code, load_codes, fetch_rows, parse_rows, merge_series, check_missing, write_atomic, build_meta), CLI modes, guard. Substantive, wired to tests and run-prices.sh. |
| `tests/test_price_core.py`, `test_price_cli.py`, `test_price_workflow.py` | VERIFIED | Pass offline. |
| `.github/workflows/price_update.yml` | VERIFIED (disabled) | Exists, tested; kept as reference. |
| `prices/` (59) and `prices-meta.json` | VERIFIED | Live and consistent. Data flows: portfolio-calc.js (Phase 23) reads dates/close from these files. |
| `deploy/run-prices.sh` | VERIFIED (static) | incremental, `git add prices prices-meta.json`, commit, push to main, with flock. |

## Requirements Coverage

| Requirement | Source Plan (plan `requirements` field) | Status | Evidence |
|---|---|---|---|
| PRICE-01 | 22-01 | SATISFIED | Contract documented; code and 59 live files follow it. |
| PRICE-02 | 22-02 (CLI), 22-03 (real backfill) | SATISFIED | backfill mode plus the real 59/59 run. |
| PRICE-03 | 22-02 | SATISFIED in code; production moved to server timer, unverified here | Workflow exists with concurrency group, secret, scoped commit, tests. Daily execution now runs from the server. See human_verification. |
| PRICE-04 | 22-01, 22-02 | SATISFIED | Guard exit 2 before any write; tested. |
| PRICE-05 | 22-01, 22-02 | SATISFIED | Offline monkeypatch tests, 483 total passing. |

Orphaned requirements: none.

## Anti-Patterns

| File | Pattern | Severity | Impact |
|---|---|---|---|
| scripts/build_price_history.py, workflow, tests | No TBD/FIXME/XXX found in the Phase 22 files | none | n/a |
| price_update.yml vs deploy/run-prices.sh | Two copies of the daily job | Info | Drift risk, tracked as tech debt. |

## Gaps Summary

No blocking gaps. Code, contract, tests and live data are consistent. Remaining items need a human or the owner: the redistribution license (accepted risk), a production check of the server timer, and the duplicate-job cleanup. Not measured: operating-account daily quota.

---

_Verified: 2026-11-21_
_Verifier: Claude (gsd-verifier)_
