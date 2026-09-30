# Requirements — v1.3 수수료 변동 그래프

**Milestone goal:** 사용자가 ETF 수수료 셀을 클릭하면 해당 항목의 과거 변동 추이 그래프를 볼 수 있다.

**Locked decisions:** JSON 스냅샷(`fee-history.json`, SQLite 아님), 변동 시에만 기록, git 히스토리 backfill, 바닐라 SVG(라이브러리 없음), 클릭한 항목 1개만 표시. See `.planning/research/SUMMARY.md`.

## v1.3 Requirements

### 스냅샷 저장소 (HIST)

- [x] **HIST-01**: 매일 ETL 후 4개 수수료 항목(총보수·기타비용·매매중개수수료·실부담비용) 중 값이 바뀐 것만 `fee-history.json`에 KST 날짜와 함께 추가된다 (같은 날 재실행 시 중복 없음)
- [x] **HIST-02**: 종목은 종목코드로 식별된다 — 신규 상장은 첫 관측값으로 시작하고, 종목명이 바뀌어도 같은 시계열이 유지된다
- [x] **HIST-03**: `fee-history.json`이 없거나 파싱 불가하면 CI 단계가 실패하고 기존 파일을 덮어쓰지 않는다
- [x] **HIST-04**: 일일 자동 커밋에 `fee-history.json`이 포함된다

### 과거 복원 (BACK)

- [x] **BACK-01**: 운영자가 로컬에서 backfill 스크립트를 1회 실행해 2026-02 이후 data.json git 히스토리로부터 시계열을 생성할 수 있다
- [x] **BACK-02**: 2026-05-27 매핑 보정 이전의 잘못된 값이 시계열에 남지 않는다 (그날 마지막 커밋 규칙 + 감지 기반 재기준화 — Phase 8 CONTEXT 결정)
- [x] **BACK-03**: backfill 실행 시 리포트가 출력된다 — 항목별 변동 수, 건너뛴 커밋, A→B→A 의심 패턴

### 그래프 UI (CHART)

- [ ] **CHART-01**: 사용자가 테이블 수수료 셀을 클릭/탭/키보드로 열 수 있고, 클릭 가능함이 시각적으로 표시된다
- [ ] **CHART-02**: 모달에 해당 ETF·항목의 계단형 SVG 차트가 표시되고 마지막 값은 오늘까지 연장된다
- [ ] **CHART-03**: 변동 없음/단일 포인트면 평평한 선과 "기록 시작(2026-02) 이후 변동 없음" 안내가 표시되고, 로딩·에러 상태가 표시된다
- [ ] **CHART-04**: 차트 아래 변동 내역 리스트(날짜·값·변동폭)가 표시된다
- [ ] **CHART-05**: ESC/닫기 버튼으로 모달이 닫히고 원래 셀로 포커스가 돌아가며, 모바일에서 정상 동작한다
- [ ] **CHART-06**: 모달 문구가 8개 언어(ko, en, vi, zh, ja, th, tl, km)로 표시된다

## Future Requirements

- 일일 ETL 대량 보정 가드 (DATA-06 50% 규칙을 fee-history에도 적용)
- 차트 포인트 툴팁 (탭/포커스 시 날짜·값·이전 대비)
- 테이블 셀 '변동 N회' 배지
- changelog.json을 fee-history에서 파생

## Out of Scope

- SQLite DB — 정적 호스팅, JSON으로 충분 (사용자 결정)
- 차트 라이브러리(Chart.js/D3) — 의존성 최소화 원칙
- 다중 항목 동시 차트 / 항목 탭 — 사용자가 클릭한 항목 1개로 결정
- 줌·기간 선택·다중 ETF 비교 — 데이터 포인트 적어 불필요
- pre-commit hook의 fee-history 동기화 — CI 단독 writer 규칙으로 대체

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| HIST-01 | Phase 7 | Complete |
| HIST-02 | Phase 7 | Complete |
| HIST-03 | Phase 7 | Complete |
| HIST-04 | Phase 7 | Complete |
| BACK-01 | Phase 8 | Complete |
| BACK-02 | Phase 8 | Complete |
| BACK-03 | Phase 8 | Complete |
| CHART-01 | Phase 9 | Pending |
| CHART-02 | Phase 9 | Pending |
| CHART-03 | Phase 9 | Pending |
| CHART-04 | Phase 9 | Pending |
| CHART-05 | Phase 9 | Pending |
| CHART-06 | Phase 9 | Pending |

**Coverage:** 13/13 v1.3 requirements mapped
