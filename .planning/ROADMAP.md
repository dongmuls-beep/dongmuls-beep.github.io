# Roadmap: ETF 실부담비용 비교 사이트

## Milestones

- ✅ **v1.1 안정성·보안·품질 개선** — Phases 1-4 (shipped 2026-09-30)
- 🚧 **v1.2 데이터 정확성 보강** — Phases 5-6 (planned)

## Phases

<details>
<summary>✅ v1.1 안정성·보안·품질 개선 (Phases 1-4) — SHIPPED 2026-09-30</summary>

- [x] Phase 1: ETL 안정성 강화 (4/4 plans) — completed 2026-04-30
- [x] Phase 2: 데이터 무결성 검증 (1/1 plan) — completed 2026-05-20
- [x] Phase 3: 보안 및 버그 수정 (3/3 plans) — completed 2026-05-20, UAT/SECURITY 2026-09-30
- [x] Phase 4: ETL 단위 테스트 (3/3 plans) — completed 2026-05-20

Full details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

### 🚧 v1.2 데이터 정확성 보강 (Planned)

**Goal:** 운영 점검(2026-09-30)에서 발견된 AUM 누락과 변경 이력 가짜 변동을 해소한다.

### Phase 5: 신규 코드 시장데이터 매칭

**Goal:** 영숫자 KRX 종목코드 ETF도 AUM·거래량이 표시된다.

**Requirements:** DATA-04

**Success criteria:**
- data.json에서 `0026S0`, `0069M0`의 AUM·거래량이 null이 아니다
- 영숫자 코드 매칭 단위 테스트 추가, `pytest tests/` 통과

**Plans:** 1 plans

Plans:
- [ ] 05-01-PLAN.md — 영숫자 코드 NAVER 매칭 + DATA-04 누락 경고 + 테스트 + 배포 검증

---

### Phase 6: 변경 이력 정합성

**Goal:** 변경 이력에 실제 수수료 변동만 표시되고, 데이터 보정 실행이 가짜 변동을 남기지 않는다.

**Requirements:** DATA-05, DATA-06

**Depends on:** Phase 5 (AUM 채움이 changelog 대상 필드에 영향 없는지 확인)

**Success criteria:**
- 운영 changelog.json에 `2026-05-27` 보정 항목 없음, 월별 카드 중복 없음
- 대량 보정성 변동 시 build_changelog가 경고만 출력하고 항목을 추가하지 않음 (테스트로 확인)
- 제거가 자동 업데이트 이후에도 유지됨 (재유입 경로 차단)

**Plans:** 0 plans

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. ETL 안정성 강화 | v1.1 | 4/4 | Complete | 2026-04-30 |
| 2. 데이터 무결성 검증 | v1.1 | 1/1 | Complete | 2026-05-20 |
| 3. 보안 및 버그 수정 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 4. ETL 단위 테스트 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 5. 신규 코드 시장데이터 매칭 | v1.2 | 0/0 | Not started | - |
| 6. 변경 이력 정합성 | v1.2 | 0/0 | Not started | - |
