# Roadmap: ETF 실부담비용 비교 사이트

## Milestones

- ✅ **v1.1 안정성·보안·품질 개선** — Phases 1-4 (shipped 2026-09-30)
- ✅ **v1.2 데이터 정확성 보강** — Phases 5-6 (shipped 2026-09-30)
- ✅ **v1.3 수수료 변동 그래프** — Phases 7-9 (shipped 2026-09-30)
- 🚧 **v1.4 신뢰성·접근성·비교 도구** — Phases 10-16 (in progress)

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

### 🚧 v1.4 신뢰성·접근성·비교 도구 (In Progress)

**Milestone Goal:** 데이터 신뢰성·모바일 접근성을 보강하고, 투자자용 비교 도구(직접 비교·누적 비용 계산기·RSS)를 추가한다.

#### Execution Waves (최대 병렬 실행)

파일 소유권(file-ownership) 기준으로 스트림을 분리한다. 같은 작업 트리에서 동시에 실행해도 충돌하지 않도록 각 Phase는 배타적 파일을 소유한다.

| Wave | Phases (동시 실행) | 선행 조건 |
|------|--------------------|-----------|
| 0 (4-way 병렬) | Phase 10 (데이터 신뢰성), Phase 11 (script.js seam + null-safe), Phase 12 (RSS 피드), Phase 13 (계산기 엔진) | 없음 |
| 1 (2-way 병렬) | Phase 14 (모바일 접근성), Phase 15 (비교 + 계산기 UI) | Phase 11 완료 (Phase 15는 Phase 13도) |
| 2 (직렬) | Phase 16 (통합·검증) | Phase 10-15 모두 완료 |

**실행 제약:**
- OneDrive 환경 → git worktree 사용 불가. 모든 병렬 스트림은 main 작업 트리에서 배타적 파일만 수정한다.
- `script.js` / `style.css`는 UTF-8 BOM + CRLF. 편집 후 `git diff --stat` 및 BOM/CRLF 확인 필수. 신규 파일은 LF, BOM 없음.
- `fee-history.json`은 CI만 쓴다 (로컬 수정 금지). pre-commit 훅이 로컬 `data.json`/`changelog.json`을 덮어쓰므로 테스트는 fixture JSON 사용.
- `daily_update.yml` 단일 소유자는 Phase 12 (Phase 16의 CI node 단계 추가는 Phase 12 완료 후 직렬).
- i18n 키는 EOF에 append 금지. Phase 14는 `aria_copy_code` 근처, Phase 15는 `fee_history_*` 뒤에 삽입. 키 패리티 테스트 확장.
- `document.dispatchEvent`는 `fetchData`/`renderTable` 안에서만 사용 (`tests/fee_chart_check.js` vm stub에 없음).

- [x] **Phase 10: 데이터 신뢰성** - 결측 수수료를 0.0이 아닌 null로 처리하고 가짜 변동을 차단 — completed 2026-09-30
- [x] **Phase 11: script.js seam + null-safe 프런트엔드** - 결측 표시·정렬·배지 처리와 신규 스크립트용 이음새 (직렬 게이트) — completed 2026-09-30
- [x] **Phase 12: RSS 피드** - 총보수/기타비용 변동만 담은 결정적 RSS 2.0 feed.xml 생성 — completed 2026-09-30
- [x] **Phase 13: 계산기 엔진** - 누적 비용 순수 함수와 node 테스트 — completed 2026-09-30
- [x] **Phase 14: 모바일 접근성** - Critical/Major 모바일 a11y·UI 수정과 8개 언어 ARIA — completed 2026-09-30 (human UAT deferred to Phase 16)
- [x] **Phase 15: 직접 비교 + 계산기 UI** - 2~4개 ETF 선택, /compare/ 페이지, 겹침 차트, 계산기 UI — completed 2026-09-30 (human UAT deferred to Phase 16)
- [ ] **Phase 16: 통합·검증** - 피드 구독 링크, 사이트맵/태그 연결, CI 단계, 8개 언어·기기 스모크

## Phase Details

### Phase 10: 데이터 신뢰성
**Goal**: 파싱 불가한 수수료가 0.0이나 NaN 대신 null로 흘러, 가짜 최저가와 가짜 변동이 어디에도 나타나지 않는다
**Depends on:** Nothing (Wave 0)
**Parallel with:** Phase 11, Phase 12, Phase 13
**Owns files:** `etl_process.py`, `scripts/build_changelog.py`, `tests/test_*.py` (기존 `tests/test_fees.py`의 `p_float == 0.0` 단언 의도적 갱신 포함)
**Requirements**: DATA-07, DATA-08, DATA-09
**Success Criteria** (what must be TRUE):
  1. 수수료 셀이 파싱 불가/NaN/inf인 fixture로 ETL을 돌리면 `data.json`에 해당 값이 `null`로 기록되고 결과가 유효한 JSON이다
  2. 구성요소 하나라도 결측인 종목은 실부담비용도 `null`이며, ETL은 중단 없이 soft-warning만 출력한다
  3. 결측이 낀 전·후 쌍은 changelog와 fee-history 어디에도 변동으로 기록되지 않는다 (e2e 체인 테스트 통과)
  4. 모든 신규/갱신 pytest가 fixture JSON만 사용하고 통과한다
**Plans**: 3 plans
- [x] 10-01-PLAN.md — p_float None + process_data/validate None-aware + allow_nan=False
- [x] 10-02-PLAN.md — build_changelog None 쌍 skip
- [x] 10-03-PLAN.md — e2e null chain 테스트 (wave 2)

### Phase 11: script.js seam + null-safe 프런트엔드
**Goal**: 사용자가 결측 수수료를 "-"로 보고, 결측 종목이 정렬 맨 뒤에 놓이며 가짜 배지가 없고, 이후 스크립트가 붙을 이음새가 준비된다
**Depends on:** Nothing (Wave 0, fixture null 데이터로 독립 개발; 직렬 게이트 — Phase 14·15의 선행 조건)
**Parallel with:** Phase 10, Phase 12, Phase 13 (짧은 단일 커밋으로 완료)
**Owns files:** `script.js` (seam ~10줄 + null-safe hunk만: 표 렌더 이벤트, `tr.dataset.code`, `buildFeeLinePath(..., startDate)`, `Number.isFinite` 가드, null-last 정렬, `table_value_missing` 렌더 키, `isValidFee`), `tests/fee_chart_check.js` 관련 fixture
**Requirements**: DATA-10
**Success Criteria** (what must be TRUE):
  1. null 수수료 종목은 표에서 "-"(번역된 표시)로 보인다
  2. 어떤 열로 정렬해도 결측 종목은 항상 맨 뒤에 위치한다
  3. 결측 종목은 최저 표시와 변동(하락/상승) 배지를 받지 않는다
  4. 기존 `tests/fee_chart_check.js`가 통과하고 `script.js`의 BOM+CRLF가 보존된다
**Plans**: 1 plans
- [x] 11-01-PLAN.md — script.js seam + null-safe 표시/정렬/배지
**UI hint**: yes

### Phase 12: RSS 피드
**Goal**: 사용자가 구독할 수 있는 유효하고 안정적인 RSS 피드가 매일 CI에서 생성된다
**Depends on:** Nothing (Wave 0)
**Parallel with:** Phase 10, Phase 11, Phase 13
**Owns files:** `scripts/build_rss.py`, `feed.xml`, `tests/test_rss.py`, `.github/workflows/daily_update.yml`
**Requirements**: FEED-01, FEED-02, FEED-03
**Success Criteria** (what must be TRUE):
  1. `feed.xml`이 유효한 RSS 2.0이며 총보수·기타비용 변동(인상·인하)만 항목화되고, 결측·대량 보정 항목은 없다
  2. 재실행해도 항목 GUID와 날짜가 같고, 변동이 없으면 `feed.xml`이 바이트 단위로 동일하다
  3. `1Q 미국S&P500` 같은 종목명이 올바르게 이스케이프되어 XML 파서로 읽힌다
  4. CI 워크플로가 Build Changelog 다음 단계에서 피드를 만들고 `feed.xml`을 커밋 대상에 포함한다
**Plans**: 2 plans
- [x] 12-01-PLAN.md — build_rss.py + test_rss.py (TDD)
- [x] 12-02-PLAN.md — workflow 단계 + 첫 feed.xml (wave 2)

### Phase 13: 계산기 엔진
**Goal**: 실부담비용으로 누적 비용과 비용 감소액을 정확하게 계산하는 순수 함수가 테스트와 함께 준비된다
**Depends on:** Nothing (Wave 0)
**Parallel with:** Phase 10, Phase 11, Phase 12
**Owns files:** `compare-calc.js` (신규, 순수 함수, DOM 없음), `tests/compare_calc_check.js`
**Requirements**: CALC-02
**Success Criteria** (what must be TRUE):
  1. 일시금·보유기간·월 적립금·기대수익률을 넣으면 종목별 총 부담 비용(원)과 비용으로 줄어든 금액이 월 복리(월말 납입, 실부담비용 연율의 월 환산) 기준으로 반환된다
  2. 수수료율은 퍼센트(÷100)로 처리되며 알려진 손계산 값과 node 테스트가 일치한다
  3. 수수료 0%·기대수익률 0%·1년/50년 경계 입력이 올바르게 처리된다
  4. 결측(null) 수수료 종목은 계산에서 제외 표시가 반환된다
**Plans**: 1 plans
- [x] 13-01-PLAN.md — compare-calc.js 순수 함수 + node 테스트 (TDD)

### Phase 14: 모바일 접근성
**Goal**: 모바일 사용자가 대비·터치·스크린리더·키보드 장벽 없이 표와 이력을 읽고 조작할 수 있다
**Depends on:** Phase 11 (script.js 이음새 반영 후 나머지 hunk 편집)
**Parallel with:** Phase 15
**Owns files:** `style.css`, `script.js` (Phase 11 이외 hunk), 기존 7개 HTML(`index.html`, ISA/연금/계좌 가이드, changelog 등), `i18n` aria/skip/retry/missing 키 (`aria_copy_code` 근처)
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07, A11Y-08, A11Y-09
**Success Criteria** (what must be TRUE):
  1. 제목과 수수료 변동 화살표가 AA 대비(4.5:1)를 충족하고, 중복 CSS 블록·색 토큰·theme-color 불일치가 정리되어 수정이 덮어써지지 않는다
  2. 스크롤 내리면 헤더가 숨고 올리면 나타나며, 메뉴가 열렸거나 헤더에 포커스가 있으면 숨지 않는다
  3. 모바일에서 변경 이력 표가 가로 스크롤로 읽히고, 모든 터치 대상이 44×44px 이상이다
  4. 스크린리더가 카드형 표의 각 값을 열 이름과 함께 읽고, 코드 버튼에 설명 라벨이 있으며, 언어 전환 시 aria-label·title이 8개 언어로 바뀐다
  5. skip-link로 본문에 이동할 수 있고, 표는 로딩 스켈레톤·재시도 버튼 있는 에러 상태·빈 상태를 보여주며 스크린리더에 안내된다
**Plans**: 5 plans
- [x] 14-01-PLAN.md — style.css 정리·대비·터치·상태 CSS (wave 1)
- [x] 14-02-PLAN.md — i18n 19키 + parity 테스트 (wave 1)
- [x] 14-03-PLAN.md — 7개 HTML skip-link/main/theme-color/ARIA (wave 1)
- [x] 14-04-PLAN.md — script.js 헤더 포커스·셀 레이블·배지 sr-only (wave 2)
- [x] 14-05-PLAN.md — script.js 스켈레톤·재시도·빈 상태 (wave 3)
**UI hint**: yes

### Phase 15: 직접 비교 + 계산기 UI
**Goal**: 사용자가 ETF 2~4개를 골라 공유 가능한 비교 페이지에서 수수료·추이·누적 비용 차이를 한눈에 본다
**Depends on:** Phase 11 (seam/이벤트/null-safe), Phase 13 (계산 엔진)
**Parallel with:** Phase 14
**Owns files:** `compare-select.js`, `compare-view.js`, `compare.css`, `compare/index.html` (초안 — 최종 태그·template 정렬은 Phase 16), `i18n` `compare_*`/`calc_*` 블록 (`fee_history_*` 뒤에 삽입)
**Requirements**: CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CALC-01, CALC-03, CALC-04, CALC-05
**Success Criteria** (what must be TRUE):
  1. 메인·계좌 가이드 표에서 체크박스로 2~4개 선택 가능하고 5번째는 막히며, 선택은 카테고리 탭 전환 후에도 유지되고 하단 비교 바에 선택 수와 "비교하기" 링크가 보인다
  2. `/compare/?compare=코드,코드`가 총보수·기타비용·매매중개수수료·실부담비용·AUM 나란한 표를 보이고 항목별 최저값이 색 외 표시로도 구분되며, 잘못된·중복·미존재 코드는 무시되고 유효 종목 2개 미만이면 안내가 나온다
  3. 선택 ETF들의 수수료 추이가 한 차트에 겹쳐(항목 선택, 기본 실부담비용) 색+선 모양+범례로 구분되고 텍스트 대안이 있다
  4. 일시금·보유기간(1~50년)·월 적립금·기대수익률(기본 0%, "가정")을 쉼표·전각 숫자로 입력할 수 있고, "N년간 A보다 B가 약 X원 더 부담" 결과와 면책 문구가 표시되며 결측 종목은 제외·안내된다
  5. 비교 URL과 계산기 입력이 URL에 담겨 공유하면 같은 결과가 재현되고, 페이지 문구는 8개 언어로 표시된다
**Plans**: 7 plans
- [x] 15-01-PLAN.md — i18n compare/calc 68키 (wave 1)
- [x] 15-02-PLAN.md — compare-select.js 선택·비교 바 (wave 1)
- [x] 15-03-PLAN.md — compare.css (wave 1)
- [x] 15-04-PLAN.md — compare-view.js + compare/index.html 표 (wave 1)
- [x] 15-05-PLAN.md — 겹침 차트 compare-chart.js (wave 2)
- [x] 15-06-PLAN.md — 계산기 UI compare-calculator.js (wave 2)
- [x] 15-07-PLAN.md — 전체 검증 + 사람 확인 (wave 3)
**UI hint**: yes

### Phase 16: 통합·검증
**Goal**: 모든 스트림 결과가 사이트 전체에서 연결되고 8개 언어·실기기에서 일관되게 동작함이 확인된다
**Depends on:** Phase 10, 11, 12, 13, 14, 15 (전부 완료 후 직렬 실행)
**Parallel with:** 없음 (직렬)
**Owns files:** 모든 HTML(RSS `<link>`, `/compare/` 태그), `sitemap.xml`, `compare/index.html`(A11y 정리 후 템플릿 정렬), `.github/workflows/daily_update.yml`(CI node 단계, Phase 12 완료 후), i18n 키 패리티 테스트
**Requirements**: FEED-04
**Success Criteria** (what must be TRUE):
  1. 메인·변경 이력 페이지에서 autodiscovery `<link>`와 보이는 링크로 피드를 발견·구독할 수 있다
  2. 메인·ISA·연금 페이지에서 비교 페이지로 진입할 수 있고 `/compare/`가 sitemap 정책(noindex,follow, canonical)에 맞게 설정되어 있다
  3. CI가 node 테스트(`fee_chart_check.js`, `compare_calc_check.js`)와 pytest를 모두 실행하고 i18n 8개 언어 키 패리티가 통과한다
  4. 비교 페이지가 Phase 14의 최종 a11y 토큰(44px, 대비, 키보드)을 따르고, 8개 언어·모바일 실기기 스모크와 BOM/CRLF 감사(`script.js`, `style.css`, `build_changelog.py`)를 통과한다
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
| 7. 수수료 이력 저장소 및 일일 추가 | v1.3 | 1/1 | Complete | 2026-09-30 |
| 8. Git 히스토리 과거 복원 | v1.3 | 1/1 | Complete | 2026-09-30 |
| 9. 수수료 변동 그래프 모달 | v1.3 | 3/3 | Complete | 2026-09-30 |
| 10. 데이터 신뢰성 | v1.4 | 0/TBD | Not started | - |
| 11. script.js seam + null-safe 프런트엔드 | v1.4 | 0/TBD | Not started | - |
| 12. RSS 피드 | v1.4 | 0/TBD | Not started | - |
| 13. 계산기 엔진 | v1.4 | 0/TBD | Not started | - |
| 14. 모바일 접근성 | v1.4 | 0/TBD | Not started | - |
| 15. 직접 비교 + 계산기 UI | v1.4 | 0/TBD | Not started | - |
| 16. 통합·검증 | v1.4 | 0/TBD | Not started | - |
