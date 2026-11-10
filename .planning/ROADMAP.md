# Roadmap: ETF 실부담비용 비교 사이트

## Milestones

- ✅ **v1.1 안정성·보안·품질 개선** — Phases 1-4 (shipped 2026-09-30)
- ✅ **v1.2 데이터 정확성 보강** — Phases 5-6 (shipped 2026-09-30)
- ✅ **v1.3 수수료 변동 그래프** — Phases 7-9 (shipped 2026-09-30)
- ✅ **v1.4 신뢰성·접근성·비교 도구** — Phases 10-16 (shipped 2026-10-06)
- 🚧 **v1.5 기술 부채 정리** — Phases 17-20 (in progress)

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

### 🚧 v1.5 기술 부채 정리 (Phases 17-20) — IN PROGRESS

- [x] **Phase 17: 데이터·CI 신뢰성** - RSS 빌드 실패 시 CI 실패 표시, 수수료 급락 3건 검증, node 검사 단계 CI 확인 (completed 2026-11-10)
- [x] **Phase 18: RSS 피드 품질** - 중복 행 제거, 정확한 수치, 실효성 있는 결정성 테스트, .gitattributes/.tmp 정리 (completed 2026-11-10)
- [ ] **Phase 19: /compare/ UI·접근성 정리** - 차트 리사이즈, th/절단 수정, 계산기 로케일·포커스, 언어 이벤트 통일, 320px 순위표
- [ ] **Phase 20: 소소한 정리·문서 보정** - footer gap, SUMMARY frontmatter, VERIFICATION status

## Phase Details

### Phase 17: 데이터·CI 신뢰성
**Goal**: CI가 피드 빌드 실패와 데이터 이상을 숨기지 않고 드러낸다
**Depends on**: Nothing (first phase of v1.5)
**Requirements**: DATA-11, DATA-12, CI-01
**Success Criteria** (what must be TRUE):
  1. RSS 빌드가 실패하면 CI 실행이 실패로 표시되고 기존 feed.xml은 그대로 남는다
  2. 269540, 433330, 476030의 총보수 급락이 원천 오류인지 여부가 근거와 함께 기록된다
  3. 원천 오류로 확인된 건은 데이터가 수정되고 재발 방지 검사가 추가된다
  4. 실제 CI 실행 로그에서 daily_update.yml의 node 검사 단계가 통과한 것이 확인된다
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md — build_rss.py exit 1 on failure, feed.xml kept; workflow fails run after commit (DATA-11)
- [x] 17-02-PLAN.md — 총보수 급락 3건 evidence + DATA-12 recurrence warning (DATA-12)
- [x] 17-03-PLAN.md — push (user-approved) + real CI run evidence for node checks (CI-01)

**Owns**: .github/workflows/daily_update.yml, scripts/ ETL, fee-history.json

### Phase 18: RSS 피드 품질
**Goal**: feed.xml이 중복 없이 정확한 수치로 결정적으로 생성된다
**Depends on**: Phase 17 (워크플로 feed 단계 변경 후 피드 스크립트 수정)
**Requirements**: FEED-05, FEED-06, FEED-07, FEED-08
**Success Criteria** (what must be TRUE):
  1. 같은 날짜·코드·필드 행이 피드에 한 번만 나온다
  2. 수치가 6자리 유효숫자로 잘리지 않고 원래 값 그대로 표시된다
  3. 같은 입력으로 두 번 빌드하면 byte 단위로 동일한 출력이 나오고 테스트가 이를 실제로 비교한다
  4. feed.xml에 .gitattributes가 적용되고 빌드 후 잔여 .tmp 파일이 없다
**Plans**: 1 plan
Plans:
- [x] 18-01-PLAN.md — 중복 제거·정확한 수치·결정성 테스트·빈 피드 보호·.gitattributes(feed.xml)
**Owns**: RSS 빌드 스크립트, 피드 테스트, .gitattributes

### Phase 19: /compare/ UI·접근성 정리
**Goal**: /compare/ 페이지가 모든 창 크기·언어·보조기기에서 일관되게 동작한다
**Depends on**: Nothing (Phase 17-18과 파일 분리)
**Requirements**: CMP-07, CMP-08, CMP-09, CMP-10, CMP-11, A11Y-10
**Success Criteria** (what must be TRUE):
  1. 창 크기를 바꾸면 차트가 다시 그려지고 미사용 차트 코드가 없다
  2. 표에 빈 `<th>`가 없고 `?compare=` 값이 잘리지 않고 전부 선택된다
  3. 계산기 숫자가 선택 언어 로케일로 표시되고, 재시도 후 포커스가 유지되며, live region 안내가 중복되지 않는다
  4. 언어를 바꾸면 `etf:lang-changed`로 /compare/가 갱신된다 (title MutationObserver 없음)
  5. 320px에서 순위표 "최저 대비" 열이 잘리지 않고 ETF명 열이 고정된다
  6. 코드 외 `.cell-label` span이 일관되게 aria-hidden 처리된다
**Plans**: 3 plans
Plans:
- [x] 19-01-PLAN.md — compare-view: corner th, ?compare= truncation, etf:lang-changed, retry focus, scroll hint for all wraps
- [x] 19-02-PLAN.md — calculator locale + single live region, 320px rank table (sticky name, gap column)
- [ ] 19-03-PLAN.md — chart dead code + resize redraw + retry focus, .cell-label aria-hidden
**UI hint**: yes
**Owns**: compare/ 페이지 JS·HTML, script.js, style.css (compare 영역)

### Phase 20: 소소한 정리·문서 보정
**Goal**: 남은 스타일 사소 건과 계획 문서 메타데이터가 실제 결과와 일치한다
**Depends on**: Phase 19 (style.css 충돌 방지)
**Requirements**: POLISH-01, POLISH-02
**Success Criteria** (what must be TRUE):
  1. `.footer-links a` 링크 사이에 gap이 적용되어 보인다
  2. 모든 SUMMARY frontmatter에 `requirements-completed`가 있다
  3. Phase 14~16 VERIFICATION status가 UAT 결과와 일치한다
**Plans**: TBD
**UI hint**: yes
**Owns**: style.css (.footer-links), .planning/milestones 및 phase 디렉터리 문서

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
| 19. /compare/ UI·접근성 정리 | v1.5 | 2/3 | In Progress|  |
| 20. 소소한 정리·문서 보정 | v1.5 | 0/0 | Not started | - |
