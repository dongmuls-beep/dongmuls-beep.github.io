---
phase: 04-etl-단위-테스트
plan: C
subsystem: testing
tags: [pytest, etl, process_data, validate_etl_results, header-detection, data-matching, unit-test]
dependency_graph:
  requires:
    - phase: 04-etl-단위-테스트/04-PLAN-A
      provides: pytest 환경, conftest.py fixture (kofia_primary_xlsx, kofia_fallback_xlsx, managed_df_primary)
    - phase: 04-etl-단위-테스트/04-PLAN-B
      provides: p_float() 모듈 수준 함수, tests/test_fees.py
  provides:
    - tests/test_process_data.py (TEST-02 헤더 감지 + TEST-03 데이터 매칭, 9개 테스트)
    - tests/test_validate.py (DATA-01/02/03 경고 패턴 검증, 13개 테스트)
    - pytest tests/ 전체 33 passed (test_fees 11 + test_process_data 9 + test_validate 13)
  affects:
    - etl_process.py (헤더 감지 버그 수정 — Rule 1)
tech_stack:
  added: []
  patterns:
    - "capsys로 print() 출력 캡처 및 경고 패턴 검증 (D-09 결정)"
    - "pytest.approx() 부동소수점 비교 (abs=1e-4 허용 오차)"
    - "make_item() 헬퍼 함수로 테스트 데이터 생성 간소화"
key_files:
  created:
    - tests/test_process_data.py
    - tests/test_validate.py
  modified:
    - etl_process.py
decisions:
  - "capsys를 사용하여 validate_etl_results() print 출력 검증 (D-09 — pytest-native, mock.patch 불필요)"
  - "make_item() 헬퍼 함수로 final_data 항목 생성 — 테스트 코드 중복 최소화"
  - "[Rule 1 Bug] etl_process.py 헤더 감지 row_str 변환: row.astype(str).values → [str(x) for x in row]"
metrics:
  duration: "2m 25s"
  completed_date: "2026-05-20"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 04 Plan C: ETL 프로세스·검증 단위 테스트 Summary

**One-liner:** process_data() 헤더 감지(primary/fallback) + 표준코드 매칭 9개 테스트, validate_etl_results() DATA-01/02/03 경고 패턴 13개 테스트로 TEST-02/TEST-03 요구사항 충족 — etl_process.py 헤더 감지 TypeError 버그도 함께 수정

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | tests/test_process_data.py — 헤더 감지 + 데이터 매칭 테스트 | 8aafe19 | tests/test_process_data.py, etl_process.py |
| 2 | tests/test_validate.py — validate_etl_results DATA-01/02/03 테스트 | 5c85c95 | tests/test_validate.py |

## What Was Built

### Task 1: tests/test_process_data.py (9개 테스트)

**TestHeaderDetectionPrimary (3개):**
- `test_returns_nonempty_results`: Primary fixture 처리 시 결과 비어있지 않음 (헤더 감지 성공)
- `test_matches_two_items`: KR7360750004, KR7133690008 두 항목 매칭 확인
- `test_result_contains_standard_code_360750`: 결과에 '360750' 종목코드 포함 확인

**TestHeaderDetectionFallback (2개):**
- `test_fallback_returns_nonempty_results`: Fallback fixture에서 결과 비어있지 않음
- `test_fallback_matches_two_items`: Fallback fixture에서도 2개 항목 매칭

**TestDataMatchingByStandardCode (4개):**
- `test_real_cost_is_correct`: 실부담비용 0.07+0.01+0.02=0.10 검증 (pytest.approx)
- `test_result_fields_complete`: 필수 키 7개 모두 존재 확인
- `test_unmatched_dummy_excluded`: KR9999999999 더미 항목 결과에서 배제 확인
- `test_empty_file_returns_empty`: 존재하지 않는 파일 경로 시 [] 반환 확인

### Task 2: tests/test_validate.py (13개 테스트)

**TestData01FeeRange (3개):**
- 정상 범위(0~5%) → DATA-01 경고 없음
- 6.0% 항목 → `[WARNING] DATA-01:` 출력 포함
- 경고 메시지에 이상 항목 정보 포함 확인

**TestData02DuplicateCode (3개):**
- 중복 없음 → DATA-02 경고 없음
- 동일 종목코드 2개 → `[WARNING] DATA-02:` 출력 포함
- 경고 메시지에 중복 종목코드 포함 확인

**TestData03AnomalyDetection (5개):**
- `prev_data=None` → 예외 없이 정상 완료, DATA-03 경고 없음
- ±0.01%p 변동 → DATA-03 경고 없음
- ±1.4%p 변동 → `[WARNING] DATA-03:` 출력 포함
- 경고 메시지에 ETF 정보 포함 확인
- 경계값 정확히 1.0%p → 경고 발생 (>= 조건)

**TestAllNormalCase (2개):**
- `validate_etl_results()` 반환값 None 확인 (순수 함수)
- 모든 항목 유효 → `[WARNING]` 문자열 전혀 없음

## Verification Results

```
grep -c "def test_" tests/test_process_data.py  → 9
grep -c "def test_" tests/test_validate.py       → 13
python -m pytest tests/test_process_data.py -v  → 9 passed, exit 0
python -m pytest tests/test_validate.py -v      → 13 passed, exit 0
python -m pytest tests/ -v                      → 33 passed, exit 0
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] etl_process.py 헤더 감지 로직 TypeError 수정**
- **Found during:** Task 1 테스트 실행 (RED 단계)
- **Issue:** `row.astype(str).values`가 mixed-type 행(None, float, str 혼재)에서 numpy array를 반환할 때, `in` 연산자가 numpy scalar에 대해 `TypeError: argument of type 'float' is not a container or iterable` 오류 발생
- **Fix:** `row.astype(str).values` → `[str(x) for x in row]` — Python list comprehension으로 각 요소를 명시적으로 str 변환
- **Files modified:** `etl_process.py` (line 250, 259)
- **Commit:** 8aafe19 (Task 1 커밋에 포함)

## Known Stubs

없음. 모든 테스트가 실제 구현 함수(process_data, validate_etl_results)를 호출하며 실제 동작을 검증한다.

## Threat Flags

해당 없음 — 새로 추가된 네트워크 엔드포인트, 인증 경로, 파일 접근 패턴 없음.
테스트 파일 자체는 신뢰 경계 내부(테스트 환경)에서만 실행되며 외부 입력 없음.

## Self-Check: PASSED

- [x] tests/test_process_data.py 존재: FOUND (C:\Users\godpierland\OneDrive\Antigravity\ETF비교사이트\tests\test_process_data.py)
- [x] tests/test_validate.py 존재: FOUND
- [x] `from etl_process import process_data` 포함: CONFIRMED
- [x] `from etl_process import validate_etl_results` 포함: CONFIRMED
- [x] capsys 사용: CONFIRMED (grep "capsys" tests/test_validate.py → 10줄 이상)
- [x] TestHeaderDetectionPrimary 정의: CONFIRMED
- [x] TestHeaderDetectionFallback 정의: CONFIRMED
- [x] TestDataMatchingByStandardCode 정의: CONFIRMED
- [x] TestData01FeeRange 정의: CONFIRMED
- [x] TestData02DuplicateCode 정의: CONFIRMED
- [x] TestData03AnomalyDetection 정의: CONFIRMED
- [x] Task 1 커밋 8aafe19: FOUND
- [x] Task 2 커밋 5c85c95: FOUND
- [x] pytest tests/test_process_data.py -v → 9 passed: CONFIRMED
- [x] pytest tests/test_validate.py -v → 13 passed: CONFIRMED
- [x] pytest tests/ -v → 33 passed: CONFIRMED
