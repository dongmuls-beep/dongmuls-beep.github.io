# Requirements — v1.6 ETF 평가금액 추이 대시보드

시드: `.planning/seeds/SEED-001-portfolio-dashboard.md` (범위·결정·리스크 전문). 기존 요구사항 ID에서 이어 번호를 매긴다.

**2026-11-11 결정(사용자):** 비영리·`/portfolio/`에 광고 없음을 전제로 원래 설계(공개 사이트, 종가 정적 JSON 커밋, 일일 워크플로)대로 진행한다. 관리자 전용 로컬 앱 재범위는 철회. **위험(미해결):** 이용허락 원문은 재배포를 상업 여부와 무관하게 금지하므로 공개 JSON 커밋이 재배포로 해석될 수 있다. 완화: 종가는 `prices/`로 분리해 문제 시 삭제만 하면 되고, 출처표시를 화면에 넣고, 금융위/KRX 확인은 사용자 몫으로 열어 둔다.

## v1.6 Requirements

### 스파이크 (SPIKE) — 게이트 0, 코드 작성 전

- [x] **SPIKE-01**: 공공데이터포털(금융위 주식시세) API의 이용허락(재배포·출처 표시·광고 사이트 사용), 일 호출 한도, `basDt` 과거 조회 범위, 수정주가 여부, 응답 필드·`numOfRows` 상한·`serviceKey` 인코딩이 근거와 함께 기록된다. 비영리·무광고 공개 이용의 적합성(재배포 위험 포함)을 판정해 기록한다. 과거 조회 불가면 계획을 멈추고 사용자에게 대안을 묻는다
- [x] **SPIKE-02**: 영숫자 코드(예: `0026S0`) 포함 `data.json` 59개 종목이 모두 조회되는지 확인하고 코드 표기 규칙을 기록한다
- [x] **SPIKE-03**: 백필 호출량(종목 수 × 기간 ÷ 페이지 크기)과 실행 시간을 계산해 기록한다
- [x] **SPIKE-04**: 프런트 스택(React 18 UMD 고정+SRI vs 바닐라 JS)을 비교해 결정을 기록한다
- [x] **SPIKE-05**: 분할이 있었던 실제 ETF로 종가 불연속을 확인하고 처리 방침을 기록한다

### 가격 데이터 (PRICE)

- [x] **PRICE-01**: 종목별 `prices/{code}.json`(날짜·종가 배열, `version` 필드, 최대 5년)과 `prices-meta.json`(기준일·수집 종목 수·누락 목록) 계약이 문서화되고 코드가 이를 따른다
- [x] **PRICE-02**: 과거 이력 백필 스크립트가 59개 종목을 1회 채운다
- [x] **PRICE-03**: 별도 워크플로가 매일 종가를 추가한다 (`concurrency` 그룹, 기존 Selenium ETL과 cron 분리, `serviceKey`는 GitHub secret, 로그·예외에 URL 마스킹)
- [x] **PRICE-04**: 누락 비율이 임계값을 넘으면 기존 파일을 덮어쓰지 않고 job이 실패한다
- [x] **PRICE-05**: 수집·병합·검증이 실제 API 호출 없이(monkeypatch) 단위 테스트된다

### 계산·저장 (CALC / STORE)

- [ ] **CALC-06**: 평가금액 계산이 UI와 분리된 순수 JS 모듈이다 — 수량(문자열, 소수 최대 8자리) 변환, 휴장일 forward-fill, 상장폐지 마지막 종가 고정, 전일 대비 ±40% 경고, 영숫자 코드 처리. node 테스트가 CI 글롭에 걸린다
- [x] **STORE-01**: 브라우저 로컬 저장이 행 목록 `{code, qty(string), startDate}`와 `schemaVersion`(키 접두사 `pf_v1`)이고, `setItem` 예외(시크릿 모드·용량 초과)가 사용자에게 보이는 오류로 처리된다
- [x] **STORE-02**: JSON 내보내기·가져오기가 검증(`1e-7` 표기·음수·NaN·Infinity·쉼표 소수점 거부)과 덮어쓰기 확인을 갖는다

### 화면 (PF / I18N / A11Y)

- [ ] **PF-01**: `/portfolio/` 독립 페이지에서 종목 검색(이름·코드), 수량, 보유 시작일을 입력하고 같은 종목 여러 행을 허용하며, 목록 밖 코드는 명시적으로 거절한다
- [ ] **PF-02**: 시작일부터 오늘까지 평가금액 추이 그래프, 현재 합계, 전일 대비, 종목별 비중, 기간 선택이 표시된다
- [ ] **PF-03**: 보유분 가중평균 총보수와 연간 예상 비용이 한 줄로 표시된다
- [ ] **I18N-01**: 새 UI 문자열이 8개 언어 JSON에 들어가고 기존 패리티 테스트를 통과한다
- [ ] **A11Y-11**: 새 페이지가 기존 a11y 검사 기준(표·live region·포커스·aria)을 통과한다

### 마감 (SAFE / NAV)

- [ ] **SAFE-01**: 첫 진입 고지("이 브라우저에만 저장됩니다"), `navigator.storage.persist()` 요청, "마지막 백업 N일 전" 표시가 있다
- [ ] **SAFE-02**: 화면에 "종가 기준, 분배금·분할 미반영", 데이터 기준일, 투자 자문 아님 고지가 상시 표시된다. 보유 수량·종목은 분석 이벤트로 보내지 않고 이 페이지에 AdSense를 싣지 않는다
- [ ] **NAV-01**: 내비 링크·sitemap·RSS·structuredData 수정이 마지막 단계로 들어가고 링크 제거로 롤백된다
- [ ] **VERIFY-01**: 새 코드가 실제 CI에서 통과한다(pytest + node + 새 워크플로 1회 실행)

## v1.7 Requirements — 홈 서버 이전 (queued, v1.6과 독립)

### 서버 실행 (SRV)

- [x] **SRV-01**: 서버에서 `etl_process.py`가 실제 GAS URL로 종료 코드 0, `data.json`·`update-meta.json` 갱신까지 성공한다 (2026-11-21 수동 실행으로 확인)
- [x] **SRV-02** (서버 로컬 보관 `~/etf-prices`, GitHub push 보류, user systemd timer 14:30 KST): 서버에서 `scripts/build_price_history.py --mode incremental`이 `DATA_GO_KR_KEY`로 성공한다
- [x] **SRV-03** (ETL 한정, 시세 수집은 push 보류로 미이전): 일일 ETL과 시세 수집이 systemd timer로 실행된다 (KST 09:00 / 14:30, `EnvironmentFile=~/.etf-env`, `Persistent=true`, 동시 실행 방지, 실패 시 비정상 종료와 로그)
- [x] **SRV-04**: 서버 실행도 기존 CI와 같은 순서(pytest·node 검사 → ETL → changelog·RSS·fee-history 빌드)를 따른다
- [x] **SRV-05** (ETL 한정, deploy key로 push, GitHub `Daily ETF Data Update` 비활성화): 서버 결과를 GitHub와 동기화하는 방식(서버 push 또는 pull)이 정해져 구현되고, GitHub Actions 일일 워크플로와 이중 실행되지 않는다

### 공개·보안 (OPS)

- [x] **OPS-01**: 사이트는 GitHub Pages 유지, 서버는 Tailscale ssh로만 외부 접속(공개 서빙 안 함, 키 만료 해제). 2026-11-21 결정
- [x] **OPS-02**: 임시 `NOPASSWD` sudo 제거, ssh 비밀번호 로그인 차단, 자동 보안 업데이트 확인이 끝난다
- [x] **OPS-03** (`server_ops.md`, `deploy/`): 서버 운영 문서(접속·배포·복구·타이머 확인·비밀 값 위치)가 저장소에 있다 (비밀 값 자체는 커밋 금지)

## Future Requirements

- 구글 Drive 저장·로그인 (다음 마일스톤 후보)

## Out of Scope

- 수익률, 세금, 매매기록, 알림
- 59개 밖의 전체 상장 ETF
- 분배금 반영, 분할·병합 보정, 벤치마크 비교
- 오프라인·PWA·서비스워커
- URL 해시 기반 상태 공유
- 현금·예금·개별 주식 등 ETF 외 자산

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPIKE-01 | Phase 21 | Complete |
| SPIKE-02 | Phase 21 | Complete |
| SPIKE-03 | Phase 21 | Complete |
| SPIKE-04 | Phase 21 | Complete |
| SPIKE-05 | Phase 21 | Complete |
| PRICE-01 | Phase 22 | Complete |
| PRICE-02 | Phase 22 | Complete |
| PRICE-03 | Phase 22 | Complete |
| PRICE-04 | Phase 22 | Complete |
| PRICE-05 | Phase 22 | Complete |
| CALC-06 | Phase 23 | Pending |
| STORE-01 | Phase 23 | Complete |
| STORE-02 | Phase 23 | Complete |
| PF-01 | Phase 24 | Pending |
| PF-02 | Phase 24 | Pending |
| PF-03 | Phase 24 | Pending |
| I18N-01 | Phase 24 | Pending |
| A11Y-11 | Phase 24 | Pending |
| SAFE-01 | Phase 25 | Pending |
| SAFE-02 | Phase 25 | Pending |
| NAV-01 | Phase 25 | Pending |
| VERIFY-01 | Phase 25 | Pending |
| SRV-01 | Phase 26 | Complete |
| SRV-02 | Phase 26 | Complete |
| SRV-03 | Phase 27 | Complete |
| SRV-04 | Phase 27 | Complete |
| SRV-05 | Phase 27 | Complete |
| OPS-01 | Phase 28 | Complete |
| OPS-02 | Phase 28 | Complete |
| OPS-03 | Phase 28 | Complete |
