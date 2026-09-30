# Roadmap: ETF 실부담비용 비교 사이트

## Milestones

- ✅ **v1.1 안정성·보안·품질 개선** — Phases 1-4 (shipped 2026-09-30)
- ✅ **v1.2 데이터 정확성 보강** — Phases 5-6 (shipped 2026-09-30)
- 🚧 **v1.3 수수료 변동 그래프** — Phases 7-9 (in progress)

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

### 🚧 v1.3 수수료 변동 그래프 (In Progress)

- [x] **Phase 7: 수수료 이력 저장소 및 일일 추가** - 매일 ETL 후 변동된 수수료만 fee-history.json에 기록 (completed 2026-09-30)
- [ ] **Phase 8: Git 히스토리 과거 복원** - data.json git 히스토리로부터 2026-02 이후 시계열 backfill
- [ ] **Phase 9: 수수료 변동 그래프 모달** - 수수료 셀 클릭 시 계단형 SVG 차트 모달 표시

## Phase Details

### Phase 7: 수수료 이력 저장소 및 일일 추가
**Goal**: 매일 ETL이 실행될 때마다 수수료 변동이 종목코드 기준으로 안전하게 fee-history.json에 누적된다
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04
**Success Criteria** (what must be TRUE):
  1. 수수료가 바뀐 ETF의 바뀐 항목만 KST 날짜와 함께 fee-history.json에 추가되고, 같은 날 ETL을 재실행해도 중복 항목이 생기지 않는다
  2. 신규 상장 종목은 첫 관측값으로 시계열이 시작되고, 종목명이 바뀌어도 종목코드 기준으로 같은 시계열이 이어진다
  3. fee-history.json이 없거나 파싱 불가한 상태에서 CI 단계가 실패하며 기존 파일은 덮어써지지 않는다
  4. 일일 자동 커밋에 fee-history.json 변경분이 포함된다
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — build_fee_history.py (apply_snapshot, fail-closed load) + tests, seed fee-history.json, workflow step + file_pattern

### Phase 8: Git 히스토리 과거 복원
**Goal**: 운영자가 1회 실행으로 data.json git 히스토리에서 신뢰할 수 있는 과거 수수료 시계열을 만들 수 있다
**Depends on**: Phase 7
**Requirements**: BACK-01, BACK-02, BACK-03
**Success Criteria** (what must be TRUE):
  1. 운영자가 로컬에서 backfill 스크립트를 실행하면 2026-02 이후 시계열이 fee-history.json 형식으로 생성된다
  2. 2026-05-27 매핑 보정 이전의 잘못된 값이 시계열에 남지 않고 보정일 기준으로 재기준화된다
  3. 실행 후 리포트에 항목별 변동 수, 건너뛴 커밋, A→B→A 의심 패턴이 출력된다
**Plans**: 1 plan

Plans:
- [ ] 08-01-PLAN.md — backfill_fee_history.py (pure replay + report + --dry-run), tests, regenerated fee-history.json

### Phase 9: 수수료 변동 그래프 모달
**Goal**: 사용자가 ETF 수수료 셀을 클릭하면 해당 항목의 과거 변동 추이를 그래프와 내역으로 볼 수 있다
**Depends on**: Phase 8
**Requirements**: CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06
**Success Criteria** (what must be TRUE):
  1. 사용자가 테이블 수수료 셀을 클릭/탭/키보드로 열 수 있고, 클릭 가능함이 시각적으로 표시된다
  2. 모달에 해당 ETF·항목의 계단형 SVG 차트가 표시되고 마지막 값이 오늘까지 연장되며, 아래에 변동 내역 리스트(날짜·값·변동폭)가 나온다
  3. 변동이 없거나 포인트가 하나면 평평한 선과 "기록 시작(2026-02) 이후 변동 없음" 안내가 보이고, 로딩·에러 상태도 표시된다
  4. ESC/닫기 버튼으로 모달이 닫히고 포커스가 원래 셀로 돌아오며, 모바일에서도 정상 동작한다
  5. 모달 문구가 8개 언어(ko, en, vi, zh, ja, th, tl, km)로 표시된다
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. ETL 안정성 강화 | v1.1 | 4/4 | Complete | 2026-04-30 |
| 2. 데이터 무결성 검증 | v1.1 | 1/1 | Complete | 2026-05-20 |
| 3. 보안 및 버그 수정 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 4. ETL 단위 테스트 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 5. 신규 코드 시장데이터 매칭 | v1.2 | 1/1 | Complete | 2026-09-30 |
| 6. 변경 이력 정합성 | v1.2 | 1/1 | Complete | 2026-09-30 |
| 7. 수수료 이력 저장소 및 일일 추가 | v1.3 | 1/1 | Complete    | 2026-09-30 |
| 8. Git 히스토리 과거 복원 | v1.3 | 0/0 | Not started | - |
| 9. 수수료 변동 그래프 모달 | v1.3 | 0/0 | Not started | - |
