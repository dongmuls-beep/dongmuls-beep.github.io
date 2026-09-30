---
phase: 10-data-reliability
verified: 2026-09-30T00:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 10: 데이터 신뢰성 Verification Report

**Phase Goal:** 파싱 불가한 수수료가 0.0이나 NaN 대신 null로 흘러, 가짜 최저가와 가짜 변동이 어디에도 나타나지 않는다
**Status:** passed (re-verification: No)

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 파싱불가/NaN/inf 수수료 -> data.json에 null, 유효 JSON | VERIFIED | `etl_process.py` p_float (L428-448) returns None for None/bool/blank/"-"/NaN/inf; live check: `p_float("-")`, NaN, "inf" -> None, "0.00" -> 0.0, "0.05%" -> 0.05. Writer uses `json.dumps(..., allow_nan=False)` (L808). test_null_chain `test_day2_json_has_null_and_is_strict` passes. |
| 2 | 구성요소 하나라도 결측 -> 실부담비용 null, ETL은 soft-warning만 | VERIFIED | process_data L576-593: any missing part -> `real_cost=None` + `[WARNING] DATA-07`, aggregate DATA-08 warning; validate_etl_results skips None cost with warning, no raise; DATA-03 guards both sides for None. `test_missing_warns_but_does_not_raise` passes. |
| 3 | 결측 전·후 쌍은 changelog/fee-history에 변동 기록 없음 | VERIFIED | `scripts/build_changelog.py` L107 skips pair if either side None (to_float filters non-finite). `scripts/build_fee_history.py` normalize -> None, no point appended. test_null_chain: changelog no fake change, main writes nothing, fee-history appends no point, legit 0.0 change still recorded. |
| 4 | 신규/갱신 pytest가 fixture JSON만 사용, 통과 | VERIFIED | `python -m pytest -q --ignore=tests/test_rss.py`: 206 passed. Null-chain + market_data tests: 17 passed. |

**Score:** 4/4

## Additional check: fetch_market_data_batch never yields NaN

VERIFIED. `_finite_or_none` (L725-736) maps None/bool/non-numeric/NaN/inf to None and is applied to both `marketSum` (AUM) and `quant` (volume) (L761-762); missing item and API-exception paths yield explicit None. Writer additionally uses allow_nan=False. tests/test_market_data.py passes.

## Requirements Coverage

| Req | Status | Evidence |
|-----|--------|----------|
| DATA-07 | SATISFIED | p_float None + allow_nan=False |
| DATA-08 | SATISFIED | any-missing -> null real cost; validate soft-warning |
| DATA-09 | SATISFIED | build_changelog and build_fee_history skip null pairs; e2e test |

No orphaned requirements.

## Anti-Patterns

None found (no TBD/FIXME/XXX in verified code regions). Note: "-" treated as missing is documented assumption A1 in p_float docstring (non-blocking).

## Human Verification

None required (backend/data logic, fully covered by automated tests).

## Gaps

None. Note: REQUIREMENTS.md/ROADMAP.md still show DATA-07..09 as Pending/unchecked; bookkeeping left to orchestrator (not edited here).

_Verifier: Claude (gsd-verifier)_
