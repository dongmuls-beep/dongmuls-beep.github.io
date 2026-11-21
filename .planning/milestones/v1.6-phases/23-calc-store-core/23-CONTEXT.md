# Phase 23: 계산·저장 코어 - Context

**Gathered:** 2026-11-21
**Status:** Ready for planning
**Mode:** Autonomous smart discuss — 권장 답 일괄 수락(사용자 지시: 알아서 자동 진행). 근거는 SEED-001, 22-CONTEXT, PRICES-CONTRACT, 기존 `compare-calc.js` 패턴.

<domain>
## Phase Boundary

UI 없이 검증 가능한 (1) 평가금액 계산 순수 JS 모듈, (2) 브라우저 로컬 저장 스키마와 오류 처리, (3) JSON 내보내기·가져오기 검증을 만든다. 요구사항: CALC-06, STORE-01, STORE-02. 화면(`/portfolio/` DOM·그래프·i18n)은 Phase 24, 고지·내비·CI 실검증은 Phase 25. 이 phase는 DOM·fetch·`localStorage` 직접 접근을 계산 모듈에 넣지 않는다.
</domain>

<decisions>
## Implementation Decisions

### 모듈 구조 (CALC-06)
- 파일: `portfolio/portfolio-calc.js`(계산, DOM·네트워크 없음), `portfolio/portfolio-store.js`(저장·내보내기·가져오기). 둘 다 `compare-calc.js`와 같은 UMD형: node는 `module.exports`, 브라우저는 전역(`PortfolioCalc`, `PortfolioStore`). 바닐라 JS, 신규 의존성 0 (SPIKE-04 결정: 바닐라 JS).
- 저장소 접근은 주입한다: `PortfolioStore`는 `storage` 객체(`getItem/setItem/removeItem`)를 인자로 받아 node 테스트에서 가짜 storage를 쓴다.
- 파일 인코딩: 신규 파일은 LF, BOM 없음 (STATE 제약).

### 수량·계산 (CALC-06)
- 수량은 문자열로 저장·입력하고 계산 시점에만 숫자로 변환한다. 소수 최대 8자리, 양수만. `1e-7` 표기·음수·NaN·Infinity·쉼표 소수점은 거부한다 (STORE-02와 같은 검증 함수 공유).
- 평가금액 = 날짜별 Σ(해당 행의 수량 × 그날 종가). 행은 `startDate` 이전 날짜에는 0으로 기여한다.
- 휴장일은 직전 영업일 종가로 forward-fill (모든 달력일이 아니라 `prices/{code}.json`의 `dates` 합집합 기준 영업일 축을 쓰고, 한 종목에 그날 값이 없으면 그 종목의 직전 값을 이어 쓴다).
- 상장폐지(시리즈가 기준일 전에 끝남)는 마지막 종가로 고정하고 결과에 `delisted` 경고 플래그를 남긴다.
- 전일 대비 ±40% 초과 변동은 해당 날짜에 `warnings`(코드 `jump`)로 표시한다 (분할·병합 미보정 고지용; 값은 수정하지 않는다).
- 영숫자 코드(`0026S0`, `0069M0`)는 `normalizeCode`(숫자만이면 6자리 0 채움, 아니면 대문자)로 정규화해 키로 쓴다.
- 입력: 종가 데이터는 호출자가 `{ [code]: { dates:[...], close:[...] } }`로 넘긴다(Phase 22 `prices/{code}.json` 그대로). 출력: `{ dates, total, byCode, warnings, asOf }` — 순수 함수, 입력 불변.
- 유한 수 가드: 결과가 `Number.isFinite`가 아니면 해당 행을 제외하고 경고로 남긴다 (CMP/CALC 기존 규칙).

### 저장 스키마 (STORE-01)
- 키 접두사 `pf_v1`, 값은 `{ schemaVersion: 1, rows: [{ code, qty, startDate }], updatedAt }`. `qty`는 문자열, `startDate`는 `YYYY-MM-DD`.
- 같은 종목 여러 행 허용. 행 수 상한 200, 코드는 호출자가 넘긴 허용 목록(`data.json` 59개) 안에 있어야 한다 (목록 밖 코드는 거부).
- `setItem` 예외(시크릿 모드·용량 초과·접근 차단)는 던지지 않고 `{ ok:false, error:"STORAGE_UNAVAILABLE"|"QUOTA_EXCEEDED" }`로 돌려준다. 읽기 실패·손상 JSON은 빈 목록 + `{ ok:false, error:"CORRUPT" }`이고 손상본은 덮어쓰기 전에 `pf_v1_corrupt_backup`에 보존한다.
- 마이그레이션 경로: `schemaVersion`이 알려지지 않은 값이면 거부(자동 변환 없음). 향후 버전용 `migrate(obj)` 훅만 두고 v1은 항등.

### 내보내기·가져오기 (STORE-02)
- 내보내기: `{ app:"etfsave-portfolio", schemaVersion:1, exportedAt, rows }` 문자열(2칸 들여쓰기 JSON) 반환 — 파일 다운로드 자체는 Phase 24 UI가 한다. 마지막 백업 시각은 `pf_v1_lastBackup`에 기록(SAFE-01에서 표시).
- 가져오기: 파싱 → 스키마·행 검증(수량 규칙, 날짜 실존·미래 거부, 허용 코드, 행 수 상한) → 전부 통과해야만 적용. 하나라도 실패하면 아무것도 바꾸지 않고 행 번호별 오류 목록을 돌려준다.
- 덮어쓰기 확인: `importRows(text, { replace })` — 기존 행이 있고 `replace`가 true가 아니면 `{ ok:false, error:"CONFIRM_REQUIRED", existing:n }`를 돌려준다. 확인 UI는 Phase 24.
- 크기 상한: 가져오기 텍스트 1MB 초과 거부.

### 테스트·CI
- node 테스트: `tests/portfolio_calc_check.js`, `tests/portfolio_store_check.js` (기존 `*_check.js` 어서션 스타일). CI 글롭에 걸리도록 `.github/workflows/daily_update.yml`의 for 루프에 `tests/portfolio_*_check.js`를 추가하고, 서버 러너 `deploy/run-etl.sh`도 같은 글롭을 쓴다(서버 사본 `~/etf-deploy/run-etl.sh`는 push 후 같은 변경 필요 — Phase 25에서 확인).
- 필수 케이스: 소수 수량, 휴장일 forward-fill, 상장폐지 고정, ±40% 경고, 영숫자 코드, 같은 종목 다행, 시작일 이전 0 기여, 가짜 storage 예외 3종, 손상 JSON, 가져오기 거부 사례(`1e-7`, 음수, NaN, Infinity, 쉼표), 덮어쓰기 확인.

### Claude's Discretion
- 내부 함수 분할, 에러 코드 문자열 세부, 날짜 유틸 구현(UTC 기준 파싱), 테스트 fixture 크기.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `compare-calc.js`: UMD 패턴, `LIMITS` 동결 객체, `toNum`/`isFiniteNumber`/`clamp` 헬퍼, 유한 수 가드 관례
- `tests/compare_calc_check.js`: node `assert` 기반 어서션 스타일, `approx` 헬퍼
- `prices/{code}.json` 계약: `.planning/phases/22-price-pipeline/PRICES-CONTRACT.md`

### Established Patterns
- 바닐라 JS, 빌드 없음, UTF-8 BOM은 `script.js`/`style.css`만 (신규는 LF·BOM 없음)
- 결측은 0이 아닌 null, 소비 측은 `Number.isFinite` 가드

### Integration Points
- Phase 24가 `PortfolioCalc.compute`/`PortfolioStore.*`를 호출하고 `/data.json`(종목 목록·보수)와 `/prices/{code}.json`을 fetch한다.
- CI: `daily_update.yml` node 검사 루프 글롭, 서버 `deploy/run-etl.sh`
</code_context>

<specifics>
## Specific Ideas

No specific requirements — SEED-001 9번 구현 규칙을 그대로 따른다.
</specifics>

<deferred>
## Deferred Ideas

- 분할·병합 보정, 분배금 반영, 벤치마크 비교 (마일스톤 범위 밖)
- 구글 Drive 저장·로그인 (Future Requirements)
- 백업 유도 문구·고지 UI (Phase 25)
</deferred>

---
*Phase: 23-calc-store-core*
