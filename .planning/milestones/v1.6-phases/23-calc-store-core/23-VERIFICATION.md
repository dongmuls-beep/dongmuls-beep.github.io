---
phase: 23-calc-store-core
verified: 2026-11-21T00:00:00Z
status: passed
score: 3/3 roadmap success criteria verified (CALC-06, STORE-01, STORE-02)
gaps: []
---

# Phase 23: calc-store-core Verification Report

**Goal:** UI 없이 검증 가능한 평가금액 계산과 안전한 로컬 저장이 있다
**Re-verification:** No (initial)

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | qty / holiday forward-fill / delisted / +-40% jump / alnum code covered by node tests | VERIFIED | `node tests/portfolio_calc_check.js` prints OK; compute() logic read: forward-fill via pointer, `delisted` and `jump` warnings emitted, `normalizeCode` handles `0026S0` |
| 2 | Save writes rows + schemaVersion; failures surface as codes | VERIFIED | Probe: quota -> `QUOTA_EXCEEDED`, SecurityError -> `STORAGE_UNAVAILABLE`, getItem throw -> load/export `STORAGE_UNAVAILABLE`; corrupt JSON -> `CORRUPT` and `pf_v1_corrupt_backup` kept after later save |
| 3 | Import rejects bad qty/format and requires confirm before overwrite | VERIFIED | Probe: `1e-7`, 9 decimals, neg, comma, NaN, Infinity, number type -> rejected; mixed good/bad import leaves storage byte-identical; replace undefined/false -> `CONFIRM_REQUIRED`; true -> applied; v2 -> `UNSUPPORTED_VERSION`; >1MB -> `TOO_LARGE`; future date, unknown code, rows missing -> rejected |

## Commands run

| Command | Result |
|---------|--------|
| `node tests/portfolio_calc_check.js` | `portfolio_calc_check OK` |
| `node tests/portfolio_store_check.js` | `portfolio_store_check OK` |
| `python -m pytest tests/ -q` | 440 passed |
| glob in CI | `.github/workflows/daily_update.yml:41` and `deploy/run-etl.sh:17` both contain `tests/portfolio_*_check.js` |

## Independent edge probes (not in tests)

- Unsorted + duplicate dates: axis sorted and deduped, later duplicate wins (qty 2 x 25 = 50). OK.
- qty `"0"` -> `QTY_NONPOSITIVE`; 8 decimals accepted; 9 decimals -> `QTY_FORMAT`.
- startDate after last price date: empty result, `asOf: null`, no throw (minor: `byCode` holds an empty array and no warning; UI concern for Phase 24).
- 200 rows saved OK; 201 -> `ROWS_LIMIT`.
- Inputs not mutated by compute().
- `__proto__` key in imported row: harmless (row rebuilt from whitelisted fields).

## Hygiene

- No `document`, `window.` (only UMD global fallback), `fetch`, `localStorage`, XHR use in either module (grep: no matches; window appears only in UMD fallback and does not match `window\.`).
- All four files: no BOM, 0 CR bytes (LF).
- Nothing pushed: `git log origin/main..HEAD` shows only the local phase commits (phase 23 docs/test/feat commits) pending; no push performed by this verification.

## Requirements Coverage

| Req | Status | Note |
|-----|--------|------|
| CALC-06 | SATISFIED | Implemented and tested. `.planning/REQUIREMENTS.md` still shows `[ ]` and traceability `Pending` (lines 27, 89): doc bookkeeping only, should be flipped to Complete. |
| STORE-01 | SATISFIED | Marked Complete. |
| STORE-02 | SATISFIED | Marked Complete. |

## Anti-patterns

None found (no TBD/FIXME/XXX/TODO in the two modules).

## Gaps Summary

No blocking gaps. Housekeeping: tick CALC-06 in REQUIREMENTS.md. Server copy `~/etf-deploy/run-etl.sh` needs the same glob after push (planned for Phase 25).

_Verifier: Claude (gsd-verifier)_
