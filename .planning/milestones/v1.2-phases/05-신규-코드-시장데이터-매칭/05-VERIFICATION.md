---
phase: 05-신규-코드-시장데이터-매칭
verified: 2026-09-30T00:00:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 5: 신규 코드 시장데이터 매칭 Verification Report

**Phase Goal:** 영숫자 KRX 종목코드 ETF도 AUM·거래량이 표시된다.
**Status:** passed
**Re-verification:** No

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 영숫자 코드 매칭 (NAVER marketSum/quant) | VERIFIED | etl_process.py:694-716 `_normalize_code` + `naver_map.get`; isdigit 필터 제거; "비표준 코드" 0건 |
| 2 | 숫자 코드 zfill(6) 유지 | VERIFIED | line 696 `zfill(6) if isdigit()`; 테스트 통과 |
| 3 | 미발견/API 실패 시 None, ETL 계속 | VERIFIED | 테스트 44개 전체 통과 (미발견/예외 케이스 포함) |
| 4 | DATA-04 경고, exit_code 불변 | VERIFIED | `validate_market_data` (line 658) print만 수행; main line 839에서 fetch(832) 이후 호출 |
| 5 | 운영 data.json 0026S0, 0069M0 non-null | VERIFIED | 0026S0: AUM=3397, 거래량=8511; 0069M0: AUM=1981, 거래량=4245 (https://etfsave.life/data.json 직접 조회) |

**Score:** 5/5

## Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `etl_process.py` | VERIFIED | validate_market_data 존재, 배선됨 (line 839) |
| `tests/test_market_data.py` | VERIFIED | 116 lines (>=60), monkeypatch.setattr 사용 (네트워크 차단) |

## Key Links

| From | To | Status |
|------|----|--------|
| main step 4 | validate_market_data(final_data) | WIRED (line 839 > 832) |
| fetch_market_data_batch | naver_map 정규화 키 (strip().upper()) | WIRED (line 710) |

## Behavioral Spot-Checks

| Check | Result |
|-------|--------|
| `python -m pytest tests/ -q` | 44 passed |
| Production data.json | 59 items, 두 대상 코드 AUM/거래량 non-null |

## Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| DATA-04 | 05-01-PLAN (requirements: [DATA-04]) | SATISFIED | REQUIREMENTS.md line 12 [x], traceability row Phase 5 Complete; 코드/테스트/운영 데이터 확인. 고아 요구사항 없음 |

## Anti-Patterns

TBD/FIXME/XXX 마커 없음 (etl_process.py, tests/test_market_data.py).

## Human Verification Required

None.

## Gaps Summary

None. Goal achieved: alphanumeric-code ETFs show AUM and volume in production.

_Verifier: Claude (gsd-verifier)_
