# Roadmap: ETF 실부담비용 비교 사이트

## Milestones

- ✅ **v1.1 안정성·보안·품질 개선** — Phases 1-4 (shipped 2026-09-30)
- ✅ **v1.2 데이터 정확성 보강** — Phases 5-6 (shipped 2026-09-30)
- ✅ **v1.3 수수료 변동 그래프** — Phases 7-9 (shipped 2026-09-30)
- ✅ **v1.4 신뢰성·접근성·비교 도구** — Phases 10-16 (shipped 2026-10-06)
- ✅ **v1.5 기술 부채 정리** — Phases 17-20 (shipped 2026-11-11)
- 🚧 **v1.6 ETF 평가금액 추이 대시보드** — Phases 21-25 (in progress)

## Phases

<details>
<summary>✅ v1.1 안정성·보안·품질 개선 (Phases 1-4) — SHIPPED 2026-09-30</summary>

- [x] Phase 1: ETL 안정성 강화 (4/4 plans) — completed 2026-04-30
- [x] Phase 2: 데이터 무결성 검증 (1/1 plan) — completed 2026-05-20
- [x] Phase 3: 보안 및 버그 수정 (3/3 plans) — completed 2026-05-20, UAT/SECURITY 2026-09-30
- [x] Phase 4: ETL 단위 테스트 (3/3 plans) — completed 2026-05-20

Full details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 데이터 정확성 보강 (Phases 5-6) — SHIPPED 2026-09-30</summary>

- [x] Phase 5: 신규 코드 시장데이터 매칭 (1/1 plan) — completed 2026-09-30
- [x] Phase 6: 변경 이력 정합성 (1/1 plan) — completed 2026-09-30

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3 수수료 변동 그래프 (Phases 7-9) — SHIPPED 2026-09-30</summary>

- [x] Phase 7: 수수료 이력 저장소 및 일일 추가 (1/1 plan) — completed 2026-09-30
- [x] Phase 8: Git 히스토리 과거 복원 (1/1 plan) — completed 2026-09-30
- [x] Phase 9: 수수료 변동 그래프 모달 (3/3 plans) — completed 2026-09-30

Full details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

</details>

<details>
<summary>✅ v1.4 신뢰성·접근성·비교 도구 (Phases 10-16) — SHIPPED 2026-10-06</summary>

- [x] Phase 10: 데이터 신뢰성 (3/3 plans) — completed 2026-09-30
- [x] Phase 11: script.js seam + null-safe 프런트엔드 (1/1 plan) — completed 2026-09-30
- [x] Phase 12: RSS 피드 (2/2 plans) — completed 2026-09-30
- [x] Phase 13: 계산기 엔진 (1/1 plan) — completed 2026-09-30
- [x] Phase 14: 모바일 접근성 (5/5 plans) — completed 2026-09-30
- [x] Phase 15: 직접 비교 + 계산기 UI (7/7 plans) — completed 2026-09-30
- [x] Phase 16: 통합·검증 (2/2 plans) — completed 2026-09-30, human UAT 2026-10-06

Full details: [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)

</details>

<details>
<summary>✅ v1.5 기술 부채 정리 (Phases 17-20) — SHIPPED 2026-11-11</summary>

- [x] Phase 17: 데이터·CI 신뢰성 (3/3 plans) — completed 2026-11-10
- [x] Phase 18: RSS 피드 품질 (1/1 plan) — completed 2026-11-10
- [x] Phase 19: /compare/ UI·접근성 정리 (3/3 plans) — completed 2026-11-10
- [x] Phase 20: 소소한 정리·문서 보정 (2/2 plans) — completed 2026-11-10

Full details: [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md)

</details>

### 🚧 v1.6 ETF 평가금액 추이 대시보드 (Phases 21-25) — IN PROGRESS

- [x] **Phase 21: 게이트 0 스파이크** - API 이용조건·과거 범위·수정주가, 59개 종목 조회, 백필 규모, 스택 결정, 분할 불연속 (completed 2026-11-11)
- [ ] **Phase 22: 가격 수집 파이프라인** - prices/{code}.json 계약, 백필, 별도 일일 워크플로, 누락 임계 실패, 테스트
- [ ] **Phase 23: 계산·저장 코어** - 순수 JS 평가금액 모듈, 로컬 저장 스키마, 내보내기·가져오기 검증
- [ ] **Phase 24: /portfolio/ UI·i18n** - 입력, 추이 그래프, 합계·비중·기간, 가중평균 보수, 8개 언어, a11y
- [ ] **Phase 25: 마감·배포 검증** - 고지·백업 유도·기준일, 내비/sitemap/RSS, 실제 CI 통과

## Phase Details

### Phase 21: 게이트 0 스파이크
**Goal**: 비영리·무광고 공개 이용 전제로 데이터 소스가 성립하는지 코드 작성 전에 근거로 판정한다
**Depends on**: Nothing (first phase of v1.6)
**Requirements**: SPIKE-01, SPIKE-02, SPIKE-03, SPIKE-04, SPIKE-05
**Success Criteria** (what must be TRUE):
  1. API 이용허락·호출 한도·과거 조회 범위·수정주가 여부가 근거(문서·실제 호출)와 함께 기록된다
  2. 59개 종목(영숫자 코드 포함) 조회 가능 여부와 코드 표기 규칙이 기록된다
  3. 백필 호출량·시간 추정과 프런트 스택(React UMD vs 바닐라) 결정이 기록된다
  4. 분할 ETF의 종가 불연속 확인 결과와 처리 방침이 기록된다
  5. 불허이거나 과거 조회 불가면 이후 단계 계획을 멈추고 사용자에게 대안을 묻는다
**Plans:** 2/2 plans complete
- [x] 21-01-PLAN.md — 공개문서 판정(이용허락·한도), 백필 추정, 스택 결정
- [x] 21-02-PLAN.md — 서비스키 체크포인트, 마스킹 실호출(59개·분할), 종합 판정
**Owns**: .planning/phases/21-*/ (문서만, 서비스키는 저장·커밋 금지)

### Phase 22: 가격 수집 파이프라인
**Goal**: 59개 종목 일별 종가가 정적 JSON으로 매일 안전하게 쌓인다
**Depends on**: Phase 21 (게이트 통과)
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05
**Success Criteria** (what must be TRUE):
  1. prices/{code}.json과 prices-meta.json이 문서화된 계약대로 생성된다
  2. 백필 1회로 보관 기간 상한 안의 과거 이력이 채워진다
  3. 별도 워크플로가 매일 추가하고 기존 Selenium ETL과 실패가 묶이지 않는다
  4. 누락 비율 초과 시 기존 파일이 유지되고 job이 실패한다
  5. 로그·예외에 serviceKey/URL이 노출되지 않고, 테스트는 실제 API 없이 통과한다
**Plans**: TBD
**Owns**: scripts/ 가격 스크립트, 새 워크플로, prices/, tests/test_price_*.py

### Phase 23: 계산·저장 코어
**Goal**: UI 없이 검증 가능한 평가금액 계산과 안전한 로컬 저장이 있다
**Depends on**: Phase 22 (데이터 계약)
**Requirements**: CALC-06, STORE-01, STORE-02
**Success Criteria** (what must be TRUE):
  1. 수량·휴장일·상장폐지·±40% 경고·영숫자 코드 케이스가 node 테스트로 검증된다
  2. 저장은 행 목록과 schemaVersion을 쓰고 저장 실패가 사용자에게 보인다
  3. 가져오기가 잘못된 수량·형식을 거부하고 덮어쓰기 전 확인한다
**Plans**: TBD
**Owns**: portfolio/ 순수 JS 모듈, tests/*_check.js

### Phase 24: /portfolio/ UI·i18n
**Goal**: 방문자가 /portfolio/에서 입력부터 추이 확인까지 한다
**Depends on**: Phase 23
**Requirements**: PF-01, PF-02, PF-03, I18N-01, A11Y-11
**Success Criteria** (what must be TRUE):
  1. 종목 검색·수량·시작일 입력, 같은 종목 여러 행, 목록 밖 코드 거절이 동작한다
  2. 추이 그래프·합계·전일 대비·비중·기간 선택이 표시된다
  3. 가중평균 총보수와 연간 예상 비용이 한 줄로 표시된다
  4. 8개 언어 패리티 테스트와 a11y 검사를 통과한다
**Plans**: TBD
**UI hint**: yes
**Owns**: portfolio/index.html·JS·CSS, i18n/*.json

### Phase 25: 마감·배포 검증
**Goal**: 고지·백업·관측성을 갖추고 실제 CI에서 검증된 상태로 공개 가능하다
**Depends on**: Phase 24
**Requirements**: SAFE-01, SAFE-02, NAV-01, VERIFY-01
**Success Criteria** (what must be TRUE):
  1. 첫 진입 고지, persist 요청, 마지막 백업 경과 표시가 있다
  2. 종가 기준·분배금/분할 미반영·데이터 기준일·투자 자문 아님이 상시 표시된다
  3. 보유 정보는 분석 이벤트로 가지 않고 이 페이지에 AdSense가 없다
  4. 내비·sitemap·RSS·structuredData 링크가 마지막에 추가되고 링크 제거로 롤백된다
  5. 새 코드가 실제 CI(pytest·node·새 워크플로 1회)에서 통과한다
**Plans**: TBD
**Owns**: 내비·sitemap·RSS, 관측·고지 문구

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. ETL 안정성 강화 | v1.1 | 4/4 | Complete | 2026-04-30 |
| 2. 데이터 무결성 검증 | v1.1 | 1/1 | Complete | 2026-05-20 |
| 3. 보안 및 버그 수정 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 4. ETL 단위 테스트 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 5. 신규 코드 시장데이터 매칭 | v1.2 | 1/1 | Complete | 2026-09-30 |
| 6. 변경 이력 정합성 | v1.2 | 1/1 | Complete | 2026-09-30 |
| 7. 수수료 이력 저장소 및 일일 추가 | v1.3 | 1/1 | Complete | 2026-09-30 |
| 8. Git 히스토리 과거 복원 | v1.3 | 1/1 | Complete | 2026-09-30 |
| 9. 수수료 변동 그래프 모달 | v1.3 | 3/3 | Complete | 2026-09-30 |
| 10. 데이터 신뢰성 | v1.4 | 3/3 | Complete | 2026-09-30 |
| 11. script.js seam + null-safe 프런트엔드 | v1.4 | 1/1 | Complete | 2026-09-30 |
| 12. RSS 피드 | v1.4 | 2/2 | Complete | 2026-09-30 |
| 13. 계산기 엔진 | v1.4 | 1/1 | Complete | 2026-09-30 |
| 14. 모바일 접근성 | v1.4 | 5/5 | Complete | 2026-09-30 |
| 15. 직접 비교 + 계산기 UI | v1.4 | 7/7 | Complete | 2026-09-30 |
| 16. 통합·검증 | v1.4 | 2/2 | Complete | 2026-10-06 |
| 17. 데이터·CI 신뢰성 | v1.5 | 3/3 | Complete   | 2026-11-10 |
| 18. RSS 피드 품질 | v1.5 | 1/1 | Complete   | 2026-11-10 |
| 19. /compare/ UI·접근성 정리 | v1.5 | 3/3 | Complete   | 2026-11-10 |
| 20. 소소한 정리·문서 보정 | v1.5 | 2/2 | Complete   | 2026-11-10 |
| 21. 게이트 0 스파이크 | v1.6 | 2/2 | Complete    | 2026-11-11 |
| 22. 가격 수집 파이프라인 | v1.6 | 0/? | Not started | - |
| 23. 계산·저장 코어 | v1.6 | 0/? | Not started | - |
| 24. /portfolio/ UI·i18n | v1.6 | 0/? | Not started | - |
| 25. 마감·배포 검증 | v1.6 | 0/? | Not started | - |
