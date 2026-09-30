---
phase: 10-data-reliability
plan: 03
subsystem: testing
tags: [pytest, etl, changelog, fee-history, null-safety]
requires: [10-01, 10-02]
provides:
  - end-to-end null chain regression test (SC-1..SC-4)
key-files:
  created: [tests/test_null_chain.py]
metrics:
  tasks: 2
  completed: 2026-09-30
---

# Phase 10 Plan 03: Null chain e2e test Summary

Fixture-only e2e test proving blank/"-"/"nan" fee cells become JSON null (strict, no NaN) and produce zero changelog / fee-history changes, while a legitimate 0 remains a real change.

## Commits
- cd73b6a: test(10-03): end-to-end null chain regression test

## Results
- tests/test_null_chain.py: 6 passed (fixture xlsx in tmp_path, no git, no repo JSON).
- Full suite: 221 passed (baseline 145); test_rss.py also passed at run time.
- CRLF/BOM preserved: etl_process.py, tests/test_fees.py, test_process_data.py, test_validate.py CRLF; scripts/build_changelog.py BOM+CRLF. New test file is LF, no BOM (git warns it will convert to CRLF on checkout per autocrlf; harmless).

## A3 consumer audit
- scripts/backfill_fee_history.py: imports `to_float` (None/non-finite tolerant). L81 `value = to_float(...)` with `is not None` guard: null-safe. L89 `blank = sum(1 for r in data if not to_float(r.get(field)))` treats null as blank (desired) but also legit 0.0 as blank (pre-existing, not caused by this phase). No crash path.
- scripts/sync_server_changelog.py: no fee-field arithmetic or formatting; only fetches/compares changelog.json. No impact.
- No edits made to either script.

## Out-of-scope follow-ups
- backfill_fee_history.py L89: `not to_float(...)` counts 0.0 as blank; could trigger a spurious "field-blank-or-zero" rejection if >= ROW_COLLAPSE_RATIO of rows legitimately have 0.0 in a bulk field. Consider `to_float(...) is None` (but zero-glitch guard comment says zero is intentional; decide separately).

## Phase 11 seam contract
- data.json fee fields (총보수, 기타비용, 매매중개수수료, 실부담비용) may be JSON null.
- changelog.json never contains a change with null before/after.
- fee-history.json points are always finite numbers.
- Frontend must guard with Number.isFinite before formatting/charting.

## Deviations from Plan
None. Task 2 required no additional tests or edits (audit found no crash path); no production fixes needed.

## Self-Check: PASSED
