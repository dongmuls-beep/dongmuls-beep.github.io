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

관리자 전용 로컬 앱. 종가 데이터는 공개 저장소에 올리지 않는다 (공공누리 4유형 재배포 금지).

- [ ] **Phase 21: 게이트 0 스파이크** - API 이용허락 원문·한도·과거 범위, 59개 종목 조회, 백필 규모, 스택 결정, 분할 불연속
- [ ] **Phase 22: 로컬 가격 수집** - 종가 파일 계약, 백필·증분 스크립트, 키 보호, 누락 임계, 테스트
- [ ] **Phase 23: 계산·저장 코어** - 순수 JS 평가금액 모듈, 로컬 저장 스키마, 내보내기·가져오기
- [ ] **Phase 24: 로컬 대시보드 UI** - 입력, 추이 그래프, 합계·비중·기간, 가중평균 보수 (한국어)
- [ ] **Phase 25: 마감·검증** - gitignore 보호, 공개 사이트 비노출, 실행 문서, 로컬 실검증

## Phase Details

### Phase 21: 게이트 0 스파이크
**Goal**: 관리자 개인 로컬 이용 전제로 데이터 소스가 성립하는지 근거로 판정한다
**Depends on**: Nothing (first phase of v1.6)
**Requirements**: SPIKE-01, SPIKE-02, SPIKE-03, SPIKE-04, SPIKE-05
**Success Criteria** (what must be TRUE):
  1. 이용허락 원문과 "개인 로컬 이용" 적합성 판정, 한도·과거 범위·수정주가 여부가 근거와 함께 기록된다
  2. 59개 종목(영숫자 코드 포함) 조회 가능 여부가 기록된다 (서비스키 필요, 없으면 "미확인"과 사용자 조치 명시)
  3. 백필 호출량·시간과 스택 결정이 기록된다
  4. 분할 ETF 종가 불연속 확인과 처리 방침이 기록된다
**Plans:** 2 plans
- [ ] 21-01-PLAN.md — 공개문서 판정(이용허락·한도), 백필 추정, 스택 결정
- [ ] 21-02-PLAN.md — 서비스키 체크포인트, 마스킹 실호출(59개·분할), 종합 판정

### Phase 22: 로컬 가격 수집
**Goal**: 59개 종목 일별 종가가 로컬 파일로 안전하게 쌓인다
**Depends on**: Phase 21
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04
**Success Criteria** (what must be TRUE):
  1. 종가 파일과 메타가 문서화된 계약대로 `local/portfolio/data/`에 생기고 git에서 제외된다
  2. 백필 후 증분 갱신이 동작하고 키가 로그·예외에 노출되지 않는다
  3. 누락 비율 초과 시 기존 파일이 유지되고 실패한다
  4. 테스트는 실제 API 없이 통과한다
**Plans**: TBD

### Phase 23: 계산·저장 코어
**Goal**: UI 없이 검증되는 평가금액 계산과 안전한 로컬 저장
**Depends on**: Phase 22
**Requirements**: CALC-06, STORE-01, STORE-02
**Success Criteria** (what must be TRUE):
  1. 수량·휴장일·상장폐지·±40% 경고·영숫자 코드 케이스가 node 테스트로 검증된다
  2. 저장은 행 목록과 schemaVersion을 쓰고 실패가 화면에 보인다
  3. 가져오기가 잘못된 값을 거부하고 덮어쓰기 전 확인한다
**Plans**: TBD

### Phase 24: 로컬 대시보드 UI
**Goal**: 관리자가 로컬 페이지에서 입력부터 추이 확인까지 한다
**Depends on**: Phase 23
**Requirements**: PF-01, PF-02, PF-03
**Success Criteria** (what must be TRUE):
  1. 종목 검색·수량·시작일 입력, 같은 종목 여러 행, 목록 밖 코드 거절
  2. 추이 그래프·합계·전일 대비·비중·기간 선택·데이터 기준일·고지 표시
  3. 가중평균 총보수와 연간 예상 비용 한 줄
**Plans**: TBD
**UI hint**: yes

### Phase 25: 마감·검증
**Goal**: 데이터가 새지 않고 로컬에서 실제로 돌아간다
**Depends on**: Phase 24
**Requirements**: SAFE-01, SAFE-02, VERIFY-01
**Success Criteria** (what must be TRUE):
  1. 보유·종가·.env가 gitignore되고 검사 테스트가 있으며 공개 사이트에서 링크되지 않는다
  2. 실행 문서와 마지막 백업 경과 표시가 있다
  3. pytest·node 통과, 로컬에서 갱신·표시 실확인
**Plans**: TBD

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
| 21. 게이트 0 스파이크 | v1.6 | 0/? | Not started | - |
| 22. 가격 수집 파이프라인 | v1.6 | 0/? | Not started | - |
| 23. 계산·저장 코어 | v1.6 | 0/? | Not started | - |
| 24. /portfolio/ UI·i18n | v1.6 | 0/? | Not started | - |
| 25. 마감·배포 검증 | v1.6 | 0/? | Not started | - |
