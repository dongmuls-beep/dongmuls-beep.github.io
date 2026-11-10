---
phase: 17-ci
plan: 02
subsystem: data-validation
tags: [DATA-12, etl, validation]
requires: []
provides: [DATA-12 evidence, DATA-12 recurrence warning]
affects: [etl_process.py, tests/test_validate.py]
key-files:
  created: [.planning/phases/17-ci/17-DATA12-EVIDENCE.md]
  modified: [etl_process.py, tests/test_validate.py]
decisions:
  - "269540, 433330, 476030 총보수 drops are genuine sector fee cuts; no data change"
requirements-completed: [DATA-12]
completed: 2026-11-10
---

# Phase 17 Plan 02: DATA-12 총보수 drop investigation Summary

Three 총보수 drops judged genuine fee cuts from git history and peer comparison; added a 5x bidirectional DATA-12 soft warning in `validate_etl_results`.

## Verdicts

| Code | Verdict | Key evidence |
|---|---|---|
| 269540 | genuine fee cut | sibling 429760 fell to same 0.0062 in same commit b7ebaf4; matches KODEX 0.0062 |
| 433330 | genuine fee cut | 0.0047 equals ACE/RISE peers, same commit a006cf9 as 476030 |
| 476030 | genuine fee cut | 0.0055 equals 1Q 나스닥100, inside peer band 0.0055-0.0068 |

Limit: external web sources and CI logs were unavailable (no web-fetch tool, `gh` unauthenticated), so evidence is internal only. Recorded in the evidence file.

## Data edits

fee-history.json, data.json and changelog.json were NOT edited. No process_data change.

## Tasks

1. Evidence file 17-DATA12-EVIDENCE.md (3 verdicts, Fix decision).
2. DATA-12 block in `validate_etl_results` (`FEE_RATIO_THRESHOLD = 5.0`, skips None/zero/prev_data None) plus `TestFeeRatioAnomaly` (8 cases).

Test result: `python -m pytest tests/ -q` -> 396 passed.

## Deviations

- [Rule 3] pytest/openpyxl were missing locally; installed from requirements.txt (declared deps). No repo change.
- Side finding: 2026-05-27 commits 59b9a86/9a8f04c briefly held corrupt 총보수 for the same three codes (20170511.0, 0.215...); reverted same day by 095948f. Not fixed further.

## Self-Check: PASSED
