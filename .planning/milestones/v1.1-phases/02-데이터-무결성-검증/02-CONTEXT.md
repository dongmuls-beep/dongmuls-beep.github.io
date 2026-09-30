# Phase 2: 데이터 무결성 검증 - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

ETL이 `process_data()` 완료 후 `data.json`에 쓰기 전에, 계산된 수수료 데이터의 유효성을 자동으로 검사한다.

**목적:** KOFIA 데이터 자체의 신뢰성이 아닌, ETL 파싱 오류(컬럼 매핑 실패, 형식 변경으로 인한 잘못된 파싱 등)를 조기 감지.
**범위:** `etl_process.py`에 `validate_etl_results()` 함수 추가, DATA-01/02/03 요구사항 충족. 프론트엔드 변경 없음.

</domain>

<decisions>
## Implementation Decisions

### 검증 실패 동작 (Failure Behavior)
- **D-01:** DATA-01 (수수료 범위 이탈) 감지 시 → 경고 print 출력 후 계속 진행, data.json에 쓰기
- **D-02:** DATA-02 (중복 종목코드) 감지 시 → 경고 print 출력 후 계속 진행
- **D-03:** DATA-03 (이상치 감지) 감지 시 → 경고 print 출력 후 새 데이터로 덮어쓰기
- 모든 검증은 soft-warning 방식: ETL을 중단하거나 기존 data.json을 보존하지 않음

### 검증 대상 필드 및 임계값
- **D-04:** DATA-01 범위 검증: `실부담비용` 필드만 0~5% 범위 확인 (총보수/기타비용/매매중개수수료 개별 검증 제외)
- **D-05:** DATA-03 이상치 기준: `실부담비용` 절대 변동폭 ±1%p 이상 → 경고 (상대 변동률 아님, ROADMAP 원래 기준)
- **D-06:** DATA-02 중복 확인 대상: `process_data()` 반환 결과(`final_data`) 내 `종목코드` 중복

### 코드 구조
- **D-07:** 검증 로직은 `validate_etl_results(results, prev_data)` 별도 함수로 분리
  - `results`: `process_data()` 반환값 (`final_data`)
  - `prev_data`: 기존 `data.json` 로드 결과 (없으면 `None`)
  - 반환값: 없음 (경고는 print로만 출력)
- **D-08:** 호출 위치: `__main__` 블록에서 `fetch_market_data_batch()` 호출 직전 (`etl_process.py` 536~542번째 줄 사이)
- **D-09:** `prev_data` 로드: `update_google_sheets()` 이전에 기존 `data.json` 읽기 시도, 파일 없으면 `None`

### 검증 결과 기록
- **D-10:** print 로그만 (기존 Phase 1 패턴 유지) — `update-meta.json`이나 별도 파일 추가 없음

### Claude's Discretion
- 검증 경고 메시지 형식 (예: `[WARNING] DATA-01: 실부담비용 6.2% — 정상 범위(0~5%) 초과`)
- 중복 항목을 리스트로 출력하는 방식
- 이상치 항목이 많을 때 요약 vs 개별 출력 여부

</decisions>

<specifics>
## Specific Ideas

- 없음 — 구체적인 레퍼런스나 "X처럼 만들어 달라"는 요청 없음
- 사용자 의도: ETL 파이프라인 자체 버그(파싱 실패, 컬럼 매핑 오류)를 조기 감지하는 것이 핵심

</specifics>

<canonical_refs>
## Canonical References

**외부 스펙 문서 없음** — 이 프로젝트는 외부 ADR이나 설계 문서를 별도로 관리하지 않는다. 요구사항은 아래 파일에 모두 정의되어 있다.

### 요구사항
- `.planning/REQUIREMENTS.md` — DATA-01, DATA-02, DATA-03 정의 및 검증 기준
- `.planning/ROADMAP.md` — Phase 2 목표, 계획 항목, 검증 조건

### 구현 대상 파일
- `etl_process.py` — 전체 ETL 파이프라인. `process_data()` (218번째 줄), `__main__` 블록 (506번째 줄~) 참조
- `data.json` — ETL 결과물. DATA-03 이상치 감지를 위한 이전 데이터 비교 소스

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `p_float(v)` (etl_process.py:330): 수수료 파싱 함수 — `validate_etl_results()`에서 이미 파싱된 float 값을 받으므로 재사용 불필요
- `final_data` 구조: `[{구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용, AUM, 거래량}]` — 검증 함수가 이 구조를 입력으로 받음

### Established Patterns
- 에러/경고 출력: `print(f"[PREFIX] ...")` 패턴 — Phase 1에서 확립, 동일하게 사용
- 실패 처리: `exit_code = 1`로 종료하는 패턴이 있지만 이번엔 soft-warning이므로 exit_code 변경 없음
- 파일 읽기: `json.load(f, encoding='utf-8')` 패턴 사용

### Integration Points
- 삽입 위치: `etl_process.py` `__main__` 블록, `final_data` 생성(540번째 줄) 직후, `fetch_market_data_batch()` 호출(539번째 줄) 전
- `data.json` 읽기: `update_google_sheets()` 내에서 쓰기만 하므로, 읽기는 `__main__`에서 `validate_etl_results()` 호출 직전에 별도로 수행

</code_context>

<deferred>
## Deferred Ideas

- **전일 종가 수집**: ETF 수수료 데이터와 함께 전일 종가를 수집하면 외부 기준으로 데이터 신뢰성을 보완할 수 있다는 아이디어. 새로운 데이터 수집 기능이므로 별도 Phase로 분리. 백로그에 추가.

</deferred>

---

*Phase: 02-데이터-무결성-검증*
*Context gathered: 2026-05-20*
