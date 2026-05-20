# Phase 4: ETL 단위 테스트 - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

`etl_process.py` 핵심 로직에 pytest 단위 테스트를 추가하여 KOFIA 형식 변경 시 즉시 감지할 수 있다.

**대상 요구사항:** TEST-01 (수수료 계산), TEST-02 (헤더 감지), TEST-03 (데이터 매칭)
**추가 범위:** validate_etl_results() 테스트 (Phase 2 순수 함수 활용)
**범위 외:** 프론트엔드 테스트, E2E 테스트, Selenium 자동화 테스트

</domain>

<decisions>
## Implementation Decisions

### p_float 테스트 접근법 (TEST-01)

- **D-01:** `p_float(v)`를 `process_data()` 내부 중첩 함수에서 **모듈 수준 함수로 추출**. `from etl_process import p_float` 가능해짐. 최소 리팩토링 — 함수 위치만 이동, 동작 변경 없음.
- **D-02:** 실부담비용 계산 로직(`ter = total + other`, `real_cost = ter + sell`)도 별도 단위 테스트 작성 (TEST-01 완전 충족).
- **D-03:** 테스트 케이스 범위: 정상값 + 엔지 케이스 모두 커버 — `%` 포함 문자열(`"0.05%"`), 쉼표 포함(`"1,234"`), `None`, 빈 문자열(`""`), 완전 비숫자(`"N/A"`) → 0.0 반환 검증.

### Excel fixture 방식 (TEST-02, TEST-03)

- **D-04:** openpyxl로 코드에서 fixture 생성 — `tests/conftest.py`에 pytest fixture로 정의, `tmp_path` 활용. 실제 KOFIA 파일 코드베이스 보관 없음.
- **D-05:** fixture 2종류:
  - **주 전략 fixture**: 상위 3행 메타, 4행이 `합계(A)` + `표준코드` 포함 헤더 (`header_idx = 3`)
  - **fallback fixture**: 헤더 행에 `합계(A)` 없고 `매매·수수료` 포함 (`header_idx` fallback 검증용)
- **D-06:** 각 fixture에 데이터 행 2~3개 포함 (매칭 성공 + 미매칭 시나리오 포함).

### validate_etl_results 테스트

- **D-07:** Phase 4 테스트 범위에 `validate_etl_results()` 포함 — Phase 2에서 순수 함수로 설계됨 (파일 I/O 없음), 직접 import 테스트 가능.
- **D-08:** 커버리지: DATA-01/02/03 정상 케이스(경고 없음) + 각 경고 케이스 1개씩:
  - DATA-01: `실부담비용` 6% 항목 포함 → 경고 발생
  - DATA-02: 중복 `종목코드` 2개 포함 → 경고 발생
  - DATA-03: `prev_data`와 ±1.0%p 초과 변동 항목 → 경고 발생
  - DATA-03 추가: `prev_data=None` 시 정상 완료
- **D-09:** 경고 확인 방법은 Claude 재량 — 함수 반환값이 None이므로 `capsys` 또는 `unittest.mock.patch('builtins.print')` 중 적합한 방법 선택.

### CI 통합

- **D-10:** `.github/workflows/daily_update.yml`에 pytest 단계 추가. ETL 실행 단계 **앞에** 배치하여 테스트 실패 시 ETL 자동 중단.
- **D-11:** 테스트 실패 시 ETL 중단 — 단계 순서 배치로 자동 보장 (별도 조건 불필요).
- **D-12:** `requirements.txt`에 `pytest` 추가. CI와 로컬 개발 환경 모두 `pip install -r requirements.txt`로 일괄 설치.

### Claude's Discretion

- `validate_etl_results()` 경고 출력 확인 방법: `capsys` vs `mock.patch('builtins.print')` — 구현 시 판단.
- `tests/` 디렉토리 내 파일 구조 (예: `test_p_float.py` vs `test_etl.py` 통합 파일) — 구현 시 판단.
- `conftest.py`의 fixture 재사용 범위 — 구현 시 판단.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` — TEST-01, TEST-02, TEST-03 정의 및 검증 기준
- `.planning/ROADMAP.md` — Phase 4 목표, 계획 항목, Verification 조건

### 구현 대상 파일
- `etl_process.py` — 전체 ETL 파이프라인
  - `p_float(v)`: 현재 line 330 (중첩 함수 → 모듈 수준으로 이동 예정)
  - 헤더 감지 로직: line 228–253 (process_data() 내부)
  - 데이터 매칭 로직: line 292–388 (process_data() 내부, 표준코드 기준)
  - `validate_etl_results(results, prev_data)`: line 389–430 (모듈 수준 순수 함수)
- `requirements.txt` — pytest 추가 대상
- `.github/workflows/daily_update.yml` — pytest 단계 추가 대상

### 이전 Phase 설계 결정
- `.planning/phases/02-데이터-무결성-검증/02-CONTEXT.md` — validate_etl_results() 순수 함수 설계, soft-warning 방식, final_data 구조 정의

### 테스트 현황
- `.planning/codebase/TESTING.md` — 현재 테스트 없음 확인, 고위험 미테스트 영역 목록

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `validate_etl_results(results, prev_data)` (etl_process.py:389): 순수 함수, 직접 import 테스트 가능
- `get_mock_managed_items()` (etl_process.py:197): 테스트용 모의 관리 종목 데이터. `process_data()` 테스트 시 managed_df 입력으로 재활용 가능.
- `openpyxl`: 이미 requirements.txt에 포함 — Excel fixture 생성에 바로 사용 가능

### Established Patterns
- **print 로그 패턴**: `print(f"[PREFIX] ...")` — Phase 1~3에서 확립. validate 경고도 동일 패턴.
- **final_data 구조**: `[{구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용}]` — validate_etl_results() 입력 형식.
- **soft-warning 방식**: 모든 DATA 검증은 경고 출력 후 계속 진행 (ETL 중단 없음).

### Integration Points
- `p_float` 이동: `process_data()` 루프(line 305) 진입 전, `validate_etl_results()` 직전 — 모듈 수준 위치 권장
- `conftest.py`: `tests/conftest.py`로 생성, openpyxl fixture + managed_df fixture 정의
- CI: `daily_update.yml`의 ETL 실행 단계 직전에 `pytest tests/` 단계 삽입

### Key Constraint
- `process_data()`는 file_path를 입력으로 받으므로 테스트 시 실제 임시 Excel 파일 필요 (BytesIO 불가 — pd.read_excel은 path 또는 파일 객체 모두 지원하나 현재 코드가 path 문자열 사용)

</code_context>

<specifics>
## Specific Ideas

- `p_float` 테스트: `"0.05%"` → `0.05`, `"1,234"` → `1234.0`, `None` → `0.0`, `""` → `0.0`, `"N/A"` → `0.0`
- 헤더 감지 fallback 케이스: `합계(A)` 없는 fixture에서 `매매·수수료` 헤더로 fallback 경로 검증
- validate DATA-03: `prev_data` 없을 때(`None`) 조기 종료 검증

</specifics>

<deferred>
## Deferred Ideas

- **E2E / 브라우저 테스트**: v2 REQUIREMENTS.md에 Playwright 평가 예정으로 이미 기록됨.
- **Selenium 다운로드 테스트**: 외부 의존성 높음 — 별도 integration 테스트 phase로.
- **JavaScript 단위 테스트** (script.js): 바닐라 JS, 빌드 과정 없음 — 별도 phase 필요.

None — 논의가 Phase 4 범위 내에 머뭄.

</deferred>

---

*Phase: 04-etl-단위-테스트*
*Context gathered: 2026-05-20*
