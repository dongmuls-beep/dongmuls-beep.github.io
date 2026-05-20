# Phase 4: ETL 단위 테스트 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 04-etl-단위-테스트
**Areas discussed:** p_float 테스트 접근법, Excel fixture 방식, validate_etl_results 포함 여부, CI 통합 방식

---

## p_float 테스트 접근법

### 접근 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 모듈 수준으로 추출 | p_float을 process_data() 바깥으로 이동. from etl_process import p_float 가능해짐. 최소 리팩토링. | ✓ |
| process_data() 통해 간접 테스트 | p_float 위치 변경 없이 Excel fixture를 입력해 process_data() 결과로 계산 정확성 확인. | |

**User's choice:** 모듈 수준으로 추출

### 테스트 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 계산 로직도 테스트 | p_float 파싱 + TER/실부담비용 계산 모두 단위 테스트 (TEST-01 완전 충족). | ✓ |
| p_float만 테스트 | float 변환 로직만 확인. 산술은 별도 체크 불필요. | |

**User's choice:** 계산 로직도 테스트

### 케이스 커버리지

| Option | Description | Selected |
|--------|-------------|----------|
| 정상값 + 엔지 케이스 | %, 쉼표 포함 문자열, None, 빈 문자열, 완전 비숫자 입력 등 실제 KOFIA 데이터 형태. | ✓ |
| 정상값만 | 단순 float 변환만 확인. 엔지 케이스 미커버. | |

**User's choice:** 정상값 + 엔지 케이스

---

## Excel fixture 방식

### 생성 방법

| Option | Description | Selected |
|--------|-------------|----------|
| openpyxl로 코드에서 생성 | conftest.py에 pytest fixture로 정의. tmp_path + openpyxl로 KOFIA 헤더 형식 포함 최소 Excel 생성. | ✓ |
| 실제 KOFIA 파일 샘플 보관 | tests/fixtures/에 실제 Excel 일부 저장. 실제 형식에 수렴, 별도 관리 필요. | |

**User's choice:** openpyxl로 코드에서 생성

### 헤더 전략 커버리지

| Option | Description | Selected |
|--------|-------------|----------|
| 주 전략 + fallback 1개 | 합계(A) 헤더 전략 + 매매·수수료 fallback 전략. KOFIA 실제 변형 테스트 가능. | ✓ |
| 주 전략만 | 합계(A) 코드만 커버. fallback 체크 안 됨. | |

**User's choice:** 주 전략 + fallback 1개

### 데이터 행 수

| Option | Description | Selected |
|--------|-------------|----------|
| 2~3개 | 매칭 성공 + 미매칭 시나리오 포함. 간결하게 유지됨. | ✓ |
| 1개만 | 매우 간결하지만 다중 매칭 시나리오 테스트 불가. | |

**User's choice:** 2~3개

---

## validate_etl_results 포함 여부

### 범위 포함 여부

| Option | Description | Selected |
|--------|-------------|----------|
| 포함 | 순수 함수로 가장 테스트하기 쉬운 코드. DATA-01/02/03 동작을 코드로 검증. Phase 2 설계 의도 활용. | ✓ |
| 제외 | TEST-01~03에만 집중. validate는 높은 우선순위 아님. | |

**User's choice:** 포함

### 케이스 커버리지

| Option | Description | Selected |
|--------|-------------|----------|
| DATA-01/02/03 정상 케이스 + 갯 1개씩 | 범위 내 정상 데이터, 범위 이탈 경고, 중복 코드 경고, prev_data=None (첫 실행), 이상치 경고. | ✓ |
| 정상 케이스만 | 경고 없는 정상 데이터만 테스트. 코너 케이스 미커버. | |

**User's choice:** DATA-01/02/03 정상 케이스 + 각 1개씩

### 경고 확인 방법

| Option | Description | Selected |
|--------|-------------|----------|
| 주의 발생 여부만 (반환값 비교) | 함수가 예외 없이 완료됨을 확인. print 내용은 체크하지 않음. | ✓ |
| capsys로 print 캡처링 | pytest의 capsys fixture로 stdout을 캡처해 [WARNING] 태그 포함 여부 확인. | |

**User's choice:** 주의 발생 여부만 → Claude 재량으로 실제 구현 방법 결정

---

## CI 통합 방식

### 추가 위치

| Option | Description | Selected |
|--------|-------------|----------|
| daily_update.yml에 테스트 단계 추가 | ETL 실행 전 pytest 단계 포함. 테스트 실패 시 ETL 자동 중단. 별도 workflow 미필요. | ✓ |
| 별도 test.yml 생성 | PR/push 트리거 별도 workflow. daily_update와 독립적. | |
| 둘 다 | 테스트 workflow + daily에도 추가. 가장 완전하지만 두 파일 수정 필요. | |

**User's choice:** daily_update.yml에 테스트 단계 추가

### 실패 시 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 실패 시 ETL 중단 | pytest 단계를 ETL 앞에 배치. 테스트 실패 → 다음 단계(ETL) 실행 안 됨. 잘못된 데이터 배포 방지. | ✓ |
| ETL과 독립적으로 실행 | 테스트 실패해도 ETL은 계속 실행. 테스트 실패가 alert만 생성. | |

**User's choice:** 실패 시 ETL 중단

### pytest 설치 방식

| Option | Description | Selected |
|--------|-------------|----------|
| requirements.txt에 pytest 추가 | pip install -r requirements.txt로 일괄 설치. CI와 로컬 환경 동일하게 설치됨. | ✓ |
| pytest만 별도 설치 | CI에서 pip install pytest만 따로 실행. requirements.txt 변경 없음. | |

**User's choice:** requirements.txt에 pytest 추가

---

## Claude's Discretion

- `validate_etl_results()` 경고 출력 확인 방법: `capsys` vs `mock.patch('builtins.print')` — 구현 시 판단.
- `tests/` 디렉토리 내 파일 구조 (예: `test_p_float.py` vs `test_etl.py` 통합 파일) — 구현 시 판단.
- `conftest.py`의 fixture 재사용 범위 — 구현 시 판단.

## Deferred Ideas

- E2E / 브라우저 테스트 — v2에서 Playwright 평가 예정 (REQUIREMENTS.md 기록)
- Selenium 다운로드 테스트 — 외부 의존성 높음, 별도 integration 테스트 phase로
- JavaScript 단위 테스트 (script.js) — 바닐라 JS, 빌드 과정 없음, 별도 phase 필요
