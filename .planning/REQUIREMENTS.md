# Requirements: ETF 실부담비용 비교 사이트

**Defined:** 2026-04-07
**Core Value:** 투자자가 ETF 실질 부담 비용을 한눈에 비교할 수 있어야 한다

## v1 Requirements (개선 마일스톤)

기존 사이트가 동작 중인 상태에서, 안정성·보안·품질을 높이기 위한 개선 요구사항.

### ETL 안정성

- [ ] **ETL-01**: GAS Web App URL이 환경 변수(`GAS_WEB_APP_URL`)로 관리된다
- [ ] **ETL-02**: Selenium 다운로드 재시도 로직이 지수 백오프를 사용한다
- [ ] **ETL-03**: ETL 에러 시 구체적인 예외 타입과 컨텍스트가 로깅된다
- [ ] **ETL-04**: KOFIA Excel 헤더 행 감지 전 예상 컬럼명 유효성 검사를 수행한다

### 데이터 무결성

- [ ] **DATA-01**: ETL 처리 후 수수료 값이 유효 범위(0~5%)인지 검증한다
- [ ] **DATA-02**: 중복 종목코드 감지 및 경고 로직이 존재한다
- [ ] **DATA-03**: ETL 결과가 이전 data.json과 비교하여 이상치(급격한 변동)를 감지한다

### 보안

- [ ] **SEC-01**: `script.js` 내 사용자 데이터를 렌더링하는 모든 위치에서 `escapeHtml()`이 일관 적용된다
- [ ] **SEC-02**: 순수 텍스트 콘텐츠는 `innerHTML` 대신 `textContent`를 사용한다

### 버그 수정

- [ ] **BUG-01**: 모바일 네비 열린 상태에서 스크롤 시 헤더 숨김 글리치가 수정된다
- [ ] **BUG-02**: 변경 이력 빈 배열 시 테이블 헤더가 렌더링되지 않는다

### 테스트

- [ ] **TEST-01**: ETL 수수료 계산 로직 단위 테스트가 존재한다
- [ ] **TEST-02**: ETL 헤더 감지 로직 단위 테스트가 존재한다
- [ ] **TEST-03**: 데이터 매칭(표준코드 기준) 단위 테스트가 존재한다

## v2 Requirements

### 성능

- **PERF-01**: 카테고리 필터 시 전체 DOM 재생성 대신 증분 업데이트
- **PERF-02**: 변경 이력 페이지 월별 페이지네이션 또는 지연 로딩
- **PERF-03**: 중요 언어팩 사전 캐싱으로 초기 로딩 속도 개선

### 오프라인 지원

- **PWA-01**: 서비스 워커로 오프라인 폴백 구현

### 번역 품질

- **I18N-01**: 누락 번역 키 감지 CI 검사 추가
- **I18N-02**: 언어팩 커버리지 리포팅

## Out of Scope

| Feature | Reason |
|---------|--------|
| 사용자 계정/로그인 | 공개 서비스, 개인화 기능 불필요 |
| 실시간 데이터 | 월 1회 업데이트로 충분, 인프라 복잡도 증가 |
| 자체 백엔드 API 서버 | GitHub Pages 무료 호스팅 유지가 핵심 제약 |
| 모바일 네이티브 앱 | 반응형 웹으로 충분 |
| React/Vue 등 프레임워크 도입 | 바닐라 JS 원칙 유지, 빌드 과정 없음 |
| Playwright 마이그레이션 | v2에서 평가 예정 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ETL-01 | Phase 1 | Pending |
| ETL-02 | Phase 1 | Pending |
| ETL-03 | Phase 1 | Pending |
| ETL-04 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |
| BUG-01 | Phase 3 | Pending |
| BUG-02 | Phase 3 | Pending |
| TEST-01 | Phase 4 | Pending |
| TEST-02 | Phase 4 | Pending |
| TEST-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after initial GSD setup*
