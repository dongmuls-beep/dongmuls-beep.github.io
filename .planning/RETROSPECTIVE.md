# Retrospective

## Milestone: v1.1 — 안정성·보안·품질 개선

**Shipped:** 2026-09-30
**Phases:** 4 | **Plans:** 11

### What Was Built
- ETL 환경변수화·재시도·구체적 예외 처리·KOFIA 컬럼 검증
- ETL 결과 soft-warning 검증 (`validate_etl_results`)
- 프론트엔드 innerHTML 감사, 모바일 헤더/빈 changelog 버그 수정
- pytest 33개 + CI 테스트 게이트

### What Worked
- 기존 codebase 분석(.planning/codebase/) 기반으로 research 없이 빠르게 계획
- 순수 함수 설계(validate_etl_results) → Phase 4 테스트 용이

### What Was Inefficient
- Phase 3 브라우저 UAT가 4개월간 pending으로 남음
- 로컬 저장소가 origin 자동 업데이트와 4개월 갈라짐 → 로컬 커밋 미배포
- 플랜 파일명(`NN-PLAN-X.md`)이 gsd-sdk 패턴과 달라 진행률/통계가 0으로 집계

### Patterns Established
- soft-warning 검증 (데이터 손실 없이 경고만)
- pre-commit hook이 운영 changelog.json을 동기화

### Key Lessons
- 데이터 매핑 수정(`_KOFIA_17_COLS`)은 changelog에 가짜 변동을 남김 → 보정 실행은 이력에서 분리해야 함
- 신규 KRX 영숫자 코드(예: 0026S0)를 숫자 코드 가정이 놓침

## Milestone: v1.2 — 데이터 정확성 보강

**Shipped:** 2026-09-30
**Phases:** 2 | **Plans:** 2

### What Was Built
- 영숫자 KRX 코드 AUM/거래량 매칭 + DATA-04 누락 경고
- changelog 대량 보정 감지(DATA-06) + 기존 가짜 항목 멱등 정리(DATA-05)

### What Worked
- 운영 사이트 실측 점검 → 요구사항 → 당일 배포·검증까지 한 세션 (autonomous)
- 배포 확인을 plan의 마지막 task로 둬 운영 결과로 검증

### What Was Inefficient
- 로컬 편집이 pre-commit hook에 덮어써지는 구조를 늦게 발견 (v1.1 때 삭제가 무효화된 원인)
- code review CR-01(빈 data.json 시 이력 삭제)을 plan/checker가 놓침 → 리뷰 단계에서 수정

### Key Lessons
- 소급 정리 로직은 "입력이 비었을 때" 가드를 기본으로
- 운영 데이터가 정본인 파일은 CI에서만 고친다

## Milestone: v1.3 — 수수료 변동 그래프

**Shipped:** 2026-09-30
**Phases:** 3 | **Plans:** 5

### What Was Built
- fee-history.json 변동분 일일 누적 (fail-closed, 원자적 쓰기, CI 자동 커밋)
- data.json git 히스토리 backfill (146일, 59종목 1169포인트, changelog 912/912 일치)
- 수수료 셀 클릭 → 곡선 SVG 차트 + 변동 내역 모달, 8개 언어

### What Worked
- Phase 8 전 실제 git 히스토리 조사 → 하드코딩 재기준화가 정상 이력 36종목을 지울 뻔한 것을 사전 발견
- 코드 리뷰가 매 Phase 실제 버그 발견 (NaN 직렬화, 대량 0값 오탐, 스크린리더 값 누락)
- 브라우저 UAT에서 사용자 디자인 피드백 즉시 반영

### What Was Inefficient
- UI-SPEC의 고정 320 viewBox가 680px 모달에서 2배 확대 → 사용자 지적 후 재작업
- 리뷰 수정이 UAT 이후라 UAT 2회
- OneDrive + git worktree 권한 문제로 병렬 실행 불가 → 순차 실행

### Key Lessons
- SVG 차트는 실제 컨테이너 폭 기준으로 그린다 (고정 viewBox 확대 금지)
- 하드코딩 데이터 보정은 실제 히스토리 측정 후 결정
- 코드 리뷰를 UAT 전에 돌리면 UAT 1회로 끝남

## Milestone: v1.4 — 신뢰성·접근성·비교 도구

**Shipped:** 2026-10-06
**Phases:** 7 | **Plans:** 21

### What Was Built
- 결측 수수료 null 파이프라인 (ETL → data.json → 표·비교·차트·계산기·RSS 모두 결측 인지)
- 결정적 RSS 2.0 feed.xml + 구독 링크
- 모바일 접근성 Critical/Major 일괄 수정, 8개 언어 ARIA
- /compare/ 직접 비교 + 겹침 차트 + 누적 비용 계산기(전 종목 순위표)

### What Worked
- 파일 소유권 분리로 Wave 0 4-way, Wave 1 2-way 병렬 실행 — OneDrive라 worktree 없이도 충돌 없음
- 사람 UAT를 Phase 16 끝으로 몰아 한 번에 처리
- 헤드리스 Chrome + CDP(node 내장 WebSocket)로 UAT 레이아웃·대비·번역 항목을 직접 측정 — 사람 확인을 실제 기기·스크린리더·원어민 항목으로 좁힘

### What Was Inefficient
- 단위 테스트가 놓친 통합 버그 3건을 UAT에서 발견: 표 없는 페이지에서 비교 바가 언어팩 로드 전 렌더(번역 키 노출), "숫자로 보기" 펼침 시 320px 페이지 넘침, 계산기 2개 고정 비교의 UX 한계
- SUMMARY frontmatter `requirements-completed` 누락/키 불일치로 감사에서 수동 교차 확인 필요
- 감사 도구 자동 성과 추출이 deviation 메모를 성과로 잡음 → 수동 작성

### Patterns Established
- `etf:*` 커스텀 이벤트 seam (table-rendered / data-ready / data-error / lang-changed)
- 비동기 의존(언어팩 등)에 반응하는 UI는 "준비 완료" 이벤트를 구독, DOMContentLoaded 1회 렌더에 의존 금지
- UAT 레이아웃 판정은 scrollWidth vs clientWidth 측정 (헤드리스 --window-size 스크린샷은 착시)

### Key Lessons
- 표가 있는 페이지에서만 테스트된 공용 스크립트는 표 없는 페이지에서 따로 확인해야 한다
- 접히는 UI(details)는 펼친 상태로 폭 테스트할 것
- 비교 도구는 N개 비교가 기본 기대치 — 2개 고정 비교는 처음부터 피할 것

## Cross-Milestone Trends

| Milestone | Phases | Plans | Requirements | Deferred |
|-----------|--------|-------|--------------|----------|
| v1.1 | 4 | 11 | 14/14 | 1 |
| v1.2 | 2 | 2 | 3/3 | 1 |
| v1.3 | 3 | 5 | 13/13 | 1 |
| v1.4 | 7 | 21 | 28/28 | 1 |
