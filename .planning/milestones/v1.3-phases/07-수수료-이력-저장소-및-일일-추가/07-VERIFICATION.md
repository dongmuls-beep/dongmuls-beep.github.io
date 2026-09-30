---
phase: 07-수수료-이력-저장소-및-일일-추가
verified: 2026-09-30T00:00:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 7 Verification Report

**Goal:** 매일 ETL이 실행될 때마다 수수료 변동이 종목코드 기준으로 안전하게 fee-history.json에 누적된다
**Status:** passed (initial verification, after review fixes; WR-04 deliberately skipped, out of scope)

## Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Only changed (6-decimal rounded) fee fields get a [KST date, value] point; same-day rerun idempotent (HIST-01) | VERIFIED | `apply_snapshot` in scripts/build_fee_history.py: normalize with round(6), append only on change, same-day replace/pop/no-op. `kst_today` uses a fixed +9 timezone. Rerun on the real data left the sha256 unchanged (4da86db7...). |
| 2 | New code starts with first observation; rename keeps the series, only names[code] updates (HIST-02) | VERIFIED | Series keyed by str 종목코드. Series is created lazily on first non-null value. names[code] is set independently. fee-history.json holds 59 series for 59 data.json rows, including 0026S0 and 0069M0. |
| 3 | Missing, corrupt, or schema-invalid history gives non-zero exit and no write (HIST-03) | VERIFIED | `load_history` raises FileNotFoundError or ValueError. `main` catches these, prints [ERROR], and returns 1 before any write. Writes are atomic (temp file plus os.replace). Stricter validation added by the review fixes (ISO ascending dates, finite numbers, known fields). |
| 4 | Workflow runs the script after Build Changelog and auto-commits fee-history.json (HIST-04) | VERIFIED | daily_update.yml: "Build Fee History" (line 55) runs `python scripts/build_fee_history.py` after "Build Changelog" (52) and before the commit step (58). file_pattern includes fee-history.json. A non-zero exit fails the job and skips the commit. |
| 5 | Seeded baseline exists and is canonical | VERIFIED | version 1, updatedAt 2026-09-30, bytes equal `dump_history(load_history(...))`, tracked and unmodified in git. |

## Key links

- build_fee_history.py imports `FIELDS, to_float` from build_changelog: WIRED (line 16).
- Workflow step and file_pattern: WIRED.
- The old read_json_file is not used.

## Spot checks

- `python -m pytest tests/ -q`: 105 passed. The workflow also runs pytest before the ETL.
- `python scripts/build_fee_history.py`: prints "no changes", file byte-identical.
- requirements.txt and .githooks/pre-commit unchanged.

## Requirements coverage

| ID | Status |
|----|--------|
| HIST-01 | SATISFIED |
| HIST-02 | SATISFIED |
| HIST-03 | SATISFIED |
| HIST-04 | SATISFIED |

All four IDs appear in the PLAN frontmatter and REQUIREMENTS.md (mapped to Phase 7). No orphaned requirements.

## Anti-patterns

No TBD, FIXME, or XXX markers in the phase files. The untracked scripts/_check_fees.py is outside the phase files, so it is informational only.

## Human verification

None required. A live GitHub Actions run cannot be observed locally, but the workflow wiring is verified by file inspection and the script behavior by tests and a local run.

## Gaps

None.
