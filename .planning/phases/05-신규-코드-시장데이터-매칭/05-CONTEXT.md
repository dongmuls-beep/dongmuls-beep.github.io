# Phase 5: 신규 코드 시장데이터 매칭 - Context

**Gathered:** 2026-09-30
**Status:** Ready for planning

<domain>
## Phase Boundary

영숫자 KRX 종목코드(예: `0026S0` 1Q 미국S&P500, `0069M0` 1Q 미국나스닥100) ETF도 NAVER etfItemList API에서
AUM(억원)·거래량을 매칭해 data.json에 채운다 (DATA-04). 데이터 소스 교체나 새 필드 추가는 범위 밖.

</domain>

<decisions>
## Implementation Decisions

### NAVER에 없는 종목 처리
- 코드 매칭: 순수 숫자 코드는 기존대로 `str(code).zfill(6)`, 영숫자 코드는 `str(code).strip().upper()` 그대로 NAVER `itemcode`와 비교. `isdigit()` 사전 필터("비표준 코드 → 건너뜀") 제거
- 특정 종목이 NAVER 목록에 없으면 `{"AUM": None, "거래량": None}` 유지 → 프론트 `formatAUM`/`formatVolume`이 `-` 표시 (현행)
- NAVER API 전체 실패 시 현행 유지: 전 종목 None, ETL 계속 진행 (이전 data.json 값 재사용 안 함)

### 누락 감지 경고
- AUM 또는 거래량이 None인 종목을 `[WARNING] DATA-04: ...` 형식으로 코드·이름과 함께 출력 (v1.1 DATA-01~03 soft-warning 패턴)
- 경고만 출력, exit_code 변경 없음 (CI 통과)
- 주의: 현재 `validate_etl_results()`는 main 흐름에서 시장데이터 조회(step 4) **이전**(step 3.6)에 호출됨 → 경고는 step 4 이후에서 실행되어야 함 (위치/함수 분리는 planner 재량)

### 배포 타이밍
- 수정 push 후 `gh workflow run` 으로 Daily ETF Data Update(`workflow_dispatch` 지원)를 즉시 실행해 운영 data.json 반영 확인

### Claude's Discretion
- 경고 로직을 별도 함수로 둘지 validate 함수 확장할지
- 테스트 구성 (NAVER 응답은 mock, 실제 네트워크 호출 금지)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `etl_process.py:658` `fetch_market_data_batch(codes)` — NAVER etfItemList 단일 요청, `naver_map[itemcode]`
- `etl_process.py:605` `validate_etl_results(results, prev_data)` — `[WARNING] DATA-0N:` print 패턴
- `tests/conftest.py` fixtures, `tests/test_validate.py` — capsys로 경고 출력 검증 (v1.1 D-09)

### Established Patterns
- soft-warning: print만, 예외/exit 없음
- 테스트는 파일 I/O·네트워크 없이 (tmp_path, 순수 함수)

### Integration Points
- `etl_process.py` main: step 4 (`fetch_market_data_batch` 호출 후 item["AUM"]/["거래량"] 대입, ~819행)
- CI `.github/workflows/daily_update.yml`: pytest → ETL → commit data.json

</code_context>

<specifics>
## Specific Ideas

- 운영 확인 기준: https://etfsave.life/data.json 에서 `0026S0`, `0069M0`의 AUM·거래량 non-null
- 2026-09-30 NAVER 응답 기준 값: 0026S0 marketSum 3391 / quant 5444, 0069M0 marketSum 1976 / quant 2477 (변동 가능)
- NAVER 응답 인코딩은 EUC-KR (requests `resp.json()`은 현재 동작 중이므로 변경 불필요)

</specifics>

<deferred>
## Deferred Ideas

- 이전 data.json 값으로 AUM 폴백, pykrx 보조 소스 — 필요 시 별도 phase

</deferred>
