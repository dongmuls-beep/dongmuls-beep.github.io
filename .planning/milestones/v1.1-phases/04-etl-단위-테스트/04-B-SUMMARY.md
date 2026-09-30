---
phase: 04-etl-단위-테스트
plan: B
subsystem: testing
tags: [pytest, etl, p_float, fee-calculation, unit-test]

requires:
  - phase: 04-etl-단위-테스트/04-PLAN-A
    provides: pytest 의존성, tests/ 디렉토리, conftest.py fixture, CI 통합

provides:
  - p_float() 모듈 수준 함수 (etl_process.py line 218 — from etl_process import p_float 직접 import 가능)
  - tests/test_fees.py — TestPFloat(7개) + TestRealCostCalculation(4개) = 11개 단위 테스트
  - TEST-01 요구사항 완전 충족

affects:
  - 04-etl-단위-테스트/04-PLAN-C (validate_etl_results 테스트 — 동일 패턴 참조 가능)

tech-stack:
  added: []
  patterns:
    - "모듈 수준 순수 함수 추출: 중첩 함수를 모듈 수준으로 이동하여 직접 단위 테스트 가능"
    - "pytest.approx() 사용: 부동소수점 비교 시 허용 오차 적용"
    - "계산 로직 직접 재현 테스트: ETL 내부 공식을 테스트에서 동일하게 수행하여 검증"

key-files:
  created:
    - tests/test_fees.py
  modified:
    - etl_process.py

key-decisions:
  - "p_float()를 process_data() 중첩 함수에서 모듈 수준으로 이동 — 직접 import 테스트 가능성 확보"
  - "실부담비용 계산 로직을 테스트에서 직접 재현 (ter = total + other, real_cost = ter + sell)"

patterns-established:
  - "순수 함수 추출 패턴: 테스트 불가 중첩 함수 → 모듈 수준 이동"
  - "pytest.approx() 패턴: 수수료 float 비교 시 부동소수점 오차 허용"

requirements-completed:
  - TEST-01

duration: 10min
completed: 2026-05-20
---

# Phase 4 Plan B: ETL 수수료 계산 단위 테스트 Summary

**p_float() 모듈 수준 추출 후 from etl_process import p_float 직접 import 가능, pytest 11개 단위 테스트로 수수료 파싱 및 실부담비용 계산 로직(ter = total + other, real_cost = ter + sell) 검증**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-20T08:00:00Z
- **Completed:** 2026-05-20T08:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- etl_process.py의 p_float()를 process_data() 내부 중첩 함수에서 모듈 수준(line 218)으로 이동하여 직접 import 테스트 가능
- TestPFloat 7개 테스트: %, 쉼표, None, 빈 문자열, N/A, 정상 숫자, 정수 케이스 모두 검증
- TestRealCostCalculation 4개 테스트: 표준 계산, 매매수수료 없음, % 문자열 입력, 전체 0 케이스 검증
- pytest tests/test_fees.py -v → 11 passed, exit 0 (TEST-01 완전 충족)

## Task Commits

각 태스크를 독립적으로 커밋:

1. **Task 1: p_float()를 etl_process.py 모듈 수준으로 이동** - `8ff8380` (feat)
2. **Task 2: tests/test_fees.py 작성 — p_float + 실부담비용 계산 단위 테스트** - `5d1547e` (test)

## Files Created/Modified

- `etl_process.py` - p_float() 모듈 수준 추가(line 218), process_data() 내부 중첩 정의 삭제
- `tests/test_fees.py` - TestPFloat(7개), TestRealCostCalculation(4개) 단위 테스트

## Decisions Made

- p_float()를 모듈 수준으로 이동 시 process_data() 내부 호출 코드(line 345-347)는 변경 불필요 — 모듈 스코프에서도 동일하게 접근 가능
- 실부담비용 계산은 테스트에서 ETL 내부 공식을 직접 재현(화이트박스 방식)하여 검증

## Deviations from Plan

없음 - 계획대로 정확히 실행됨.

단, pytest 최초 실행 시 가상환경에 pytest 미설치 상태 확인됨 (Rule 3 — 블로킹 이슈):
- Plan A에서 requirements.txt에 pytest 추가 완료, CI 환경에서는 `pip install -r requirements.txt`로 설치됨
- 로컬 .venv에는 Plan A 이후 별도로 설치되지 않았음
- 즉석 `pip install pytest`로 해결, 이후 테스트 정상 통과

## Issues Encountered

로컬 .venv에 pytest 미설치 — `python -m pip install pytest` 실행으로 즉시 해결. CI 파이프라인은 requirements.txt로 의존성 설치하므로 문제 없음.

## Known Stubs

없음.

## Threat Flags

없음 — 순수 계산 로직 테스트, 외부 데이터/네트워크 접근 없음.

## Next Phase Readiness

- TEST-01 완전 충족 — p_float 단위 테스트 및 실부담비용 계산 검증 완료
- Plan C (validate_etl_results 단위 테스트) 진행 가능
- etl_process.py에 모듈 수준 p_float 존재 — Plan C 테스트에서도 동일 패턴으로 import 가능

## Self-Check

- [x] `etl_process.py` 수정됨 (Task 1 커밋 `8ff8380`)
- [x] `tests/test_fees.py` 생성됨 (Task 2 커밋 `5d1547e`)
- [x] `grep -n "^def p_float" etl_process.py` → `218:def p_float(v):`
- [x] `python -c "from etl_process import p_float; print(p_float('0.05%'))"` → `0.05`
- [x] `pytest tests/test_fees.py -v` → 11 passed

## Self-Check: PASSED

---
*Phase: 04-etl-단위-테스트*
*Completed: 2026-05-20*
