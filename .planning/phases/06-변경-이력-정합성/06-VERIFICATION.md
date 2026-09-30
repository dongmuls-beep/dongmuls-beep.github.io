---
phase: 06-변경-이력-정합성
verified: 2026-09-30T00:00:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 6: 변경 이력 정합성 Verification Report

**Phase Goal:** 변경 이력에 실제 수수료 변동만 표시되고, 데이터 보정 실행이 가짜 변동을 남기지 않는다.
**Status:** passed
**Re-verification:** No (initial)

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Production has no updatedAt 2026-05-27 | VERIFIED | Fetched https://etfsave.life/changelog.json (cache-busted): entries are 2026-03-11, 04-13, 05-12, 06-11, 07-11, 08-10, 09-10 |
| 2 | Exactly one month 2026-05 entry | VERIFIED | Only the 2026-05-12 entry has month 2026-05 |
| 3 | The other entries remain (7 total) | VERIFIED | 7 entries returned, matching the expected list |
| 4 | Bulk run (>=50% on 총보수/기타비용) prints [WARNING] DATA-06, appends nothing, returns 0 | VERIFIED | scripts/build_changelog.py main() lines 205-213 call detect_bulk_correction and return 0. BULK_CORRECTION_RATIO = 0.5. Covered by tests in tests/test_changelog.py |
| 5 | Idempotent cleanup runs every CI run, before the early returns | VERIFIED | Lines 189-200 run filter_bulk_entries and write_changelog before build_changes and before the "no changes" return |

**Score:** 5/5

## Post-review fix (c96aa0f)

The `if current_data:` guard at lines 189-192 skips the retroactive filter when data.json is empty or corrupt. Without it the denominator would fall back to per-entry distinct counts and could delete legitimate entries. This does not weaken must-haves 1-5. When data.json is populated, which is the production case, the filter runs as planned. `test_main_empty_data_keeps_history` covers the guard.

## Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| scripts/build_changelog.py | VERIFIED | Defines BULK_CORRECTION_RATIO, count_compared, detect_bulk_correction and filter_bulk_entries. All are wired into main(). The total_count <= 0 guard prevents division by zero |
| tests/test_changelog.py | VERIFIED | 137 lines, 12 test functions (plan required >=60 lines and >=8 tests) |

## Behavioral Spot-Checks

| Check | Command | Result |
|-------|---------|--------|
| Test suite | `python -m pytest tests/ -q` | 56 passed |
| Production data | fetch changelog.json | No 2026-05-27 entry, one 2026-05 entry |

## Requirements Coverage

| ID | Plan | Status | Evidence |
|----|------|--------|----------|
| DATA-05 | 06-01 | SATISFIED | The fake entry is gone from production, with no duplicate 2026-05 card. REQUIREMENTS.md marks it [x] and Complete |
| DATA-06 | 06-01 | SATISFIED | Bulk detection with a warning and no recorded entry is implemented and tested. REQUIREMENTS.md marks it [x] and Complete |

Both IDs in the PLAN frontmatter (DATA-05, DATA-06) appear in REQUIREMENTS.md, and no other requirement is mapped to Phase 6, so there are no orphans.

## Anti-Patterns

No TBD, FIXME or XXX markers, no stubs and no hardcoded empty returns were found in scripts/build_changelog.py.

## Human Verification

None required. I did not re-check the CI run log for the removal warning. The production result shows the cleanup took effect.

## Gaps

None.

_Verifier: Claude (gsd-verifier)_
