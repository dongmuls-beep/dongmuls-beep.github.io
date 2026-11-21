# Phase 24: /portfolio/ UI·i18n - Context

**Gathered:** 2026-11-21
**Status:** Ready for planning
**Mode:** Autonomous smart discuss — 권장 답 일괄 수락(사용자 지시: 알아서 자동 진행). 근거: SEED-001, Phase 21~23 결정, 기존 `/compare/` 페이지 패턴.

<domain>
## Phase Boundary

방문자가 `/portfolio/`에서 보유 ETF(종목·수량·보유 시작일)를 입력하고 일별 평가금액 추이를 확인한다. 요구사항: PF-01, PF-02, PF-03, I18N-01, A11Y-11. Phase 23의 `PortfolioCalc`/`PortfolioStore`와 Phase 22의 `prices/{code}.json`, `/data.json`을 소비한다. 고지·백업 유도·`storage.persist()`·내비/sitemap/RSS/structuredData는 Phase 25 범위(이 phase는 내비 링크를 추가하지 않는다).
</domain>

<decisions>
## Implementation Decisions

### 페이지 구성
- 파일: `portfolio/index.html`, `portfolio/portfolio.css`(또는 루트 `portfolio.css`, `compare.css`가 루트에 있으므로 같은 위치 관례를 따름), `portfolio/portfolio-view.js`(DOM·데이터 로딩·i18n), `portfolio/portfolio-chart.js`(SVG 차트, `compare-chart.js` 패턴 재사용·참고). 기존 `script.js`는 로드하지 않는다(분석 이벤트 `trackEvent` 차단). `/data.json`과 `/i18n/{lang}.json`만 읽는다.
- `<body data-page="portfolio">`, `robots noindex,follow`(내비 노출 전까지 `/compare/`와 동일), canonical·hreflang은 `/compare/` 헤더 구조를 따른다. **AdSense 스크립트·광고 슬롯을 넣지 않는다** (SAFE-02 전제).
- 헤더·푸터·언어 선택·다크모드는 `/compare/index.html`과 `style.css`를 재사용한다.
- 신규 파일은 LF, BOM 없음.

### 입력 (PF-01)
- 종목 선택: `/data.json` 59개 종목을 이름·코드로 검색하는 콤보박스(키보드 조작·`aria-*` 포함). 목록 밖 입력은 인라인 오류로 명시적으로 거절한다.
- 수량: `type="text" inputmode="decimal"`, 소수 최대 8자리(`PortfolioCalc.validateQty`로 검증), 쉼표 소수점 거부. 보유 시작일: `type="date"`, `max`=오늘, 상장 이전 날짜 입력은 허용하되 해당 기간은 0으로 표시되고 안내 문구를 띄운다.
- 같은 종목 여러 행 허용. 행 목록은 표(`<table>`)로 보여주고 행별 삭제·수정(수정은 삭제 후 재추가 또는 인라인 편집 중 단순한 쪽, Claude 재량).
- 저장은 `PortfolioStore`에 `window.localStorage`를 주입해 호출. 저장 실패(`STORAGE_UNAVAILABLE`/`QUOTA_EXCEEDED`/`CORRUPT`)는 화면에 보이는 오류로 표시하고 메모리 상태로는 계속 동작한다.
- 내보내기·가져오기 최소 UI: 내보내기 버튼(Blob 다운로드), 가져오기(파일 선택) + 덮어쓰기 확인 대화상자(`CONFIRM_REQUIRED` 처리) + 행 번호별 오류 목록 표시. 백업 유도·경과일 표시는 Phase 25.

### 데이터 로딩·상태
- 보유 종목의 `prices/{code}.json`만 병렬 fetch한다. 상태 4종(로딩·오류·빈 목록·정상)을 `role="status"`/단일 live region으로 알린다(v1.4 a11y 패턴 재사용). 개별 종목 fetch 실패는 해당 종목만 경고로 표시하고 나머지는 계산한다. 재시도 버튼은 포커스를 유지한다.
- 데이터 기준일은 `PortfolioCalc.compute`의 `asOf`를 표시한다(SAFE-02의 상시 고지 문구 전체는 Phase 25).

### 그래프·요약 (PF-02, PF-03)
- 그래프: 순수 SVG 선 차트(`compare-chart.js` 스타일), 호버·키보드 포커스로 날짜별 값 확인, 차트 데이터 표(스크린리더·폭 넘침 방지 처리 포함). 기간 선택: 1개월·3개월·6개월·1년·전체(보유 시작일부터). 기간 버튼은 `aria-pressed` 토글.
- 요약: 현재 평가금액 합계, 전일 대비(금액·%, 증감 색에만 의존하지 않고 부호·화살표 텍스트 병기), 종목별 비중(막대+수치), `warnings`(delisted/jump/no_data/invalid_row/non_finite) 목록.
- PF-03: 보유분 가중평균 **총보수**와 연간 예상 비용(원)을 한 줄로 표시한다. 가중치는 최신 평가금액 비중, 보수는 `/data.json`의 해당 종목 값. 총보수가 null인 종목은 계산에서 제외하고 "일부 종목 보수 정보 없음"을 표시한다(가짜 0 금지). 가능하면 실부담비용 가중평균도 함께 보여준다(핵심 가치와 연결, Claude 재량).
- 금액은 `Intl.NumberFormat`(현재 언어) 원 단위 정수 표시.

### i18n·a11y (I18N-01, A11Y-11)
- 새 문자열은 `pf_` 접두사 키로 8개 언어 JSON(ko,en,vi,zh,ja,th,tl,km)에 모두 추가하고 기존 패리티 테스트(키 순서·`{placeholder}`)를 통과시킨다. `tests/test_i18n_compare.py` 패턴으로 `tests/test_i18n_portfolio.py` 추가. 번역은 ko·en 우선 작성 후 나머지 언어도 같은 PR에서 채운다.
- a11y: `tests/test_html_a11y.py`·`tests/a11y_*_check.js`가 검사하는 기준(표 헤더 `scope`, live region 단일, 포커스 순서, `aria-label`, 터치 타깃 44px, skip link, 대비)을 `/portfolio/`에도 적용하고, 필요한 검사 케이스를 확장한다.

### 테스트
- node: `tests/portfolio_view_check.js`(포맷·기간 슬라이스·가중평균·비중 계산 등 DOM 없는 헬퍼), `tests/portfolio_chart_check.js`(차트 좌표·스케일·빈 데이터 기하). 파일명이 `tests/portfolio_*_check.js`라 Phase 23에서 추가한 CI 글롭에 자동으로 걸린다.
- DOM 의존 코드는 헬퍼와 분리해 순수 함수로 테스트하고, 렌더링은 a11y 정적 검사로 보완한다.

### Claude's Discretion
- 레이아웃·간격·색상은 `style.css`/`compare.css` 토큰과 글래스모피즘 테마를 재사용(UI-SPEC가 확정), 행 편집 방식, 차트 세부(축 눈금·툴팁 모양), 헬퍼 모듈 경계.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `compare/index.html`, `compare.css`, `compare-view.js`(i18n 로더·상태 관리), `compare-chart.js`(SVG 선 차트·데이터 표), `compare-select.js`(선택 UI), `compare-calculator.js`
- `portfolio/portfolio-calc.js`(`compute`, `validateQty`, `validateDate`, `normalizeCode`, `LIMITS`), `portfolio/portfolio-store.js`(`load/save/exportText/importText/lastBackup`)
- `i18n/{lang}.json` 8개 언어, 패리티 테스트 `tests/test_i18n_*.py`

### Established Patterns
- 바닐라 JS, 빌드 없음, 전역 UMD 모듈, 이벤트 `etf:lang-changed`로 언어 변경 통지
- 결측은 null, 소비 측 `Number.isFinite` 가드, 신규 의존성 0

### Integration Points
- `/data.json`(종목 목록·보수), `/prices/{code}.json`, `/i18n/*.json`
- 내비·sitemap·RSS 연결은 Phase 25
</code_context>

<specifics>
## Specific Ideas

- 화면 제목은 "총자산"이 아니라 "ETF 평가금액 추이"(SEED-001).
- 분석 이벤트로 보유 수량·종목을 보내지 않는다(이 페이지는 `script.js`를 로드하지 않음).
</specifics>

<deferred>
## Deferred Ideas

- 첫 진입 고지, `storage.persist()`, 마지막 백업 경과일, 종가 기준·분배금/분할 미반영 상시 문구 (Phase 25, SAFE-01/02)
- 내비 링크·sitemap·RSS·structuredData (Phase 25, NAV-01)
- 분할·병합 보정, 분배금 반영, 수익률·세금 (범위 밖)
</deferred>

---
*Phase: 24-portfolio-ui*
