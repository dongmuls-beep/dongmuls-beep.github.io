# Requirements — v1.6 ETF 평가금액 추이 대시보드 (관리자 전용 로컬 앱)

시드: `.planning/seeds/SEED-001-portfolio-dashboard.md`. **2026-11-11 재범위:** 공공데이터포털 이용허락이 재배포 금지(공공누리 4유형)라 공개 사이트에 종가를 올리지 않는다. 관리자(사용자 1명)만 이 PC에서 로컬로 쓴다. 로그인·다국어·공개 내비·CI 수집은 범위에서 뺀다.

## v1.6 Requirements

### 스파이크 (SPIKE)

- [ ] **SPIKE-01**: API(증권상품시세정보 ETF시세) 이용허락 원문, 일 호출 한도, `basDt` 과거 조회 범위, 수정주가 여부, 응답 필드, `numOfRows` 상한, `serviceKey` 인코딩이 근거와 함께 기록되고, "관리자 개인 로컬 이용(재배포 없음)" 전제가 이용허락과 맞는지 판정된다
- [ ] **SPIKE-02**: 영숫자 코드 포함 `data.json` 59개 종목이 모두 조회되는지 확인한다 (서비스키 필요)
- [ ] **SPIKE-03**: 백필 호출량·시간을 계산한다
- [ ] **SPIKE-04**: 프런트 스택을 결정한다 (권고: 바닐라 JS, React 제외)
- [ ] **SPIKE-05**: 분할이 있었던 ETF로 종가 불연속을 확인하고 처리 방침을 기록한다

### 가격 데이터 (PRICE)

- [ ] **PRICE-01**: 종목별 종가 파일(날짜·종가 배열, `version`) 계약이 문서화되고 코드가 따른다. 파일은 `local/portfolio/data/`에 저장되고 git에서 제외된다
- [ ] **PRICE-02**: 로컬 스크립트가 백필하고 이어서 증분 갱신한다. `serviceKey`는 환경변수 또는 gitignore된 `.env`에서만 읽고 로그·예외에 노출하지 않는다
- [ ] **PRICE-03**: 누락 비율이 임계값을 넘으면 기존 파일을 덮어쓰지 않고 실패한다. 기준일 메타(`prices-meta.json`)를 남긴다
- [ ] **PRICE-04**: 수집·병합·검증이 실제 API 호출 없이(monkeypatch) 단위 테스트된다

### 계산·저장 (CALC / STORE)

- [ ] **CALC-06**: 평가금액 계산이 UI와 분리된 순수 JS 모듈이다 — 수량(문자열, 소수 최대 8자리) 변환, 휴장일 forward-fill, 상장폐지 마지막 종가 고정, 전일 대비 ±40% 경고, 영숫자 코드. node 테스트 포함
- [ ] **STORE-01**: 보유 행 목록 `{code, qty(string), startDate}`와 `schemaVersion`을 브라우저 로컬 저장에 두고, 저장 실패는 화면에 보인다
- [ ] **STORE-02**: JSON 내보내기·가져오기가 검증(`1e-7` 표기·음수·NaN·Infinity·쉼표 소수점 거부)과 덮어쓰기 확인을 갖는다

### 화면 (PF)

- [ ] **PF-01**: `local/portfolio/` 한국어 페이지에서 종목 검색, 수량, 보유 시작일 입력, 같은 종목 여러 행, 목록 밖 코드 거절
- [ ] **PF-02**: 시작일부터 오늘까지 평가금액 추이 그래프, 현재 합계, 전일 대비, 종목별 비중, 기간 선택, 데이터 기준일, "종가 기준·분배금·분할 미반영" 표시
- [ ] **PF-03**: 가중평균 총보수와 연간 예상 비용 한 줄 표시

### 마감 (SAFE)

- [ ] **SAFE-01**: 보유 정보·종가 파일·`.env`가 git에 올라가지 않도록 `.gitignore`와 검사 테스트가 있고, 공개 사이트(sitemap·내비·Pages 진입점)에서 링크되지 않는다
- [ ] **SAFE-02**: 실행 방법(`python -m http.server` + 갱신 스크립트) 문서와 "마지막 백업 N일 전" 표시가 있다
- [ ] **VERIFY-01**: pytest와 node 테스트가 통과하고 로컬에서 실제 한 번 갱신·표시를 확인한다

## Out of Scope

- 로그인·인증 (로컬 전용이라 불필요), 8개 언어, 공개 내비·sitemap·RSS, GitHub Actions 수집, 종가 데이터 커밋
- 수익률, 세금, 매매기록, 알림, 59개 밖 전체 ETF, 분배금·분할 보정, 벤치마크 비교, PWA, URL 해시 공유, ETF 외 자산, Drive 저장

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPIKE-01..05 | Phase 21 | Pending |
| PRICE-01..04 | Phase 22 | Pending |
| CALC-06, STORE-01, STORE-02 | Phase 23 | Pending |
| PF-01, PF-02, PF-03 | Phase 24 | Pending |
| SAFE-01, SAFE-02, VERIFY-01 | Phase 25 | Pending |
