# Roadmap: ETF 실부담비용 비교 사이트

**Milestone:** v1.1 — 안정성·보안·품질 개선
**Goal:** 운영 중인 사이트의 기술 부채를 해소하고, ETL 파이프라인의 신뢰성과 보안을 강화한다.

---

## Phase 1 — ETL 안정성 강화

**Goal:** ETL 파이프라인이 설정 변경·네트워크 장애·KOFIA 데이터 형식 오류에도 안정적으로 동작한다.

**Requirements:** ETL-01, ETL-02, ETL-03, ETL-04

### Plans

1. **환경 변수화** — `etl_process.py`의 GAS Web App URL과 KOFIA URL을 환경 변수로 분리, GitHub Actions secrets 연동
2. **Selenium 재시도 개선** — 고정 sleep 제거, 지수 백오프 + 다운로드 완료 감지 로직 구현
3. **에러 처리 강화** — 일반 except 대신 구체적 예외 타입, 컬럼 유효성 검사, 상세 로깅

**Verification:** GitHub Actions에서 ETL이 성공적으로 실행되고, 환경 변수 없이 실행 시 명확한 에러 메시지가 출력된다.

---

## Phase 2 — 데이터 무결성 검증

**Goal:** ETL 결과 데이터가 유효한지 자동으로 검증하여 잘못된 데이터가 사이트에 배포되는 것을 방지한다.

**Requirements:** DATA-01, DATA-02, DATA-03

**Depends on:** Phase 1

### Plans

1. **수수료 범위 검증** — `process_data()` 후 각 ETF 수수료값이 0~5% 범위 내인지 검사, 벗어나면 경고 출력
2. **중복·이상치 감지** — 종목코드 중복 감지, 이전 data.json 대비 급격한 변동(±1% 이상) 경고

**Verification:** 의도적으로 잘못된 데이터 입력 시 ETL이 경고를 출력하고 기존 data.json을 보존한다.

---

## Phase 3 — 보안 및 버그 수정

**Goal:** XSS 취약점을 줄이고, 알려진 UI 버그를 수정한다.

**Requirements:** SEC-01, SEC-02, BUG-01, BUG-02

### Plans

1. **innerHTML 감사 및 수정** — `script.js` 내 사용자 데이터 렌더링 위치 전수 검사, `escapeHtml()` 일관 적용, 텍스트 전용 위치는 `textContent`로 전환
2. **모바일 헤더 글리치 수정** — `initSmartHeader()`가 네비 열림 상태를 고려하도록 수정
3. **빈 변경 이력 테이블 버그 수정** — 빈 배열 시 테이블 헤더 조건부 렌더링

**Verification:** 번역 JSON에 HTML 태그 삽입 시 태그가 렌더링되지 않는다. 모바일에서 메뉴 열고 스크롤 시 헤더가 올바르게 동작한다.

---

## Phase 4 — ETL 단위 테스트

**Goal:** ETL 핵심 로직에 대한 단위 테스트를 추가하여 KOFIA 형식 변경 시 즉시 감지할 수 있다.

**Requirements:** TEST-01, TEST-02, TEST-03

**Depends on:** Phase 1, Phase 2

### Plans

1. **테스트 환경 구성** — pytest 설치, `tests/` 디렉토리 구조, 샘플 KOFIA Excel fixture 준비
2. **수수료 계산 테스트** — `p_float()`, 실부담비용 계산 로직 단위 테스트
3. **헤더 감지·데이터 매칭 테스트** — Excel 헤더 행 감지, 표준코드 기준 종목 매칭 테스트

**Verification:** `pytest tests/` 실행 시 모든 테스트 통과. GitHub Actions에 테스트 단계 추가.

---

## Milestone Summary

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 | ETL 안정성 | ETL-01~04 | Pending |
| 2 | 데이터 무결성 | DATA-01~03 | Pending |
| 3 | 보안·버그 수정 | SEC-01~02, BUG-01~02 | Pending |
| 4 | ETL 테스트 | TEST-01~03 | Pending |

---
*Roadmap created: 2026-04-07*
*Milestone: v1.1 안정성·보안·품질 개선*
