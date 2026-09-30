# Architecture Patterns — v1.4 통합 설계

**Domain:** 정적 ETF 수수료 비교 사이트 (vanilla JS, GitHub Pages, Python ETL) 에 신뢰성·접근성·비교 도구 추가
**Researched:** 2026-09-30
**Confidence:** HIGH (코드 직접 확인: etl_process.py, script.js, build_changelog.py, build_fee_history.py, daily_update.yml, tests/fee_chart_check.js). 브라우저별 동작(접근성 SR)은 MEDIUM.

기존 구조는 `.planning/codebase/ARCHITECTURE.md` 참고. 이 문서는 v1.4의 **신규/변경 지점만** 다룬다.

---

## 0. 핵심 결론 (로드맵 입력)

1. **직접 비교는 모달이 아니라 새 정적 페이지 `/compare/`** (`?compare=코드1,코드2,...`). 공유 URL·SEO noindex 제어·포커스 트랩 복잡도 회피·계산기 배치에 유리.
2. **script.js/style.css 를 건드리는 신규 기능 코드를 최소화**: 비교/계산기는 **신규 파일**(`compare-select.js`, `compare-view.js`, `compare-calc.js`, `compare.css`)로 만들고, script.js 에는 ~10줄짜리 "seam"(이벤트 발행 + `data-code` + `buildFeeLinePath` startDate 인자)만 넣는다. 이렇게 하면 접근성 작업(style.css, script.js 다수 hunk)과 파일 충돌이 사실상 사라진다.
3. **script.js 는 classic script(모듈 아님)** → 최상위 `function`/`const`/`let` 는 다른 classic script 에서 전역 렌지컬 스코프로 접근 가능(`window.` 속성은 아님, `const`/`let` 도 접근 가능). `compare-*.js` 가 `allData`, `dataKeys`, `getTranslation`, `toNumber`, `formatPercent`, `escapeHtml`, `loadFeeHistory`, `buildFeeHistoryPoints`, `computeFeeChartScale`, `feeChartX/Y`, `buildFeeLinePath`, `FEE_CHART` 를 그대로 재사용한다. 차트 코드 이동/리팩터링 불필요 → `tests/fee_chart_check.js`(vm 으로 script.js 로드) 깨지지 않음.
4. **p_float 결측 처리는 ETL 한 곳만 바꾸면 끝나지 않는다.** 소비자 6곳에 null 전파를 확인해야 하며, 특히 (a) `NaN` 이 `json.dump` 로 `NaN` 리터럴(무효 JSON)이 되는 문제, (b) `script.js` fetchData 의 `change.after - change.before` 가 null 을 0 으로 계산해 **가짜 변동을 프런트에서 재생성**하는 문제, (c) changelog 가 `None→값` 을 "변경"으로 기록해 RSS 에 노이즈를 만드는 문제가 숨어 있다.
5. **병렬화**: Python/CI 트랙(p_float, RSS)은 프런트 트랙과 파일이 완전히 분리. 프런트는 "seam 커밋 → (접근성 | 비교 | 계산기) 병렬" 구조.

---

## 1. p_float 결측 처리 — 소비자 추적 (WR-04)

현재: `etl_process.p_float` → 파싱 실패 시 `0.0` (etl_process.py:427-437). `process_data` 가 3회 호출(561-563)하고 `ter = total+other`, `real_cost = ter+sell` 합산(566-569).

### 데이터 경로별 영향표

| # | 소비자 | 위치 | 현재 동작 | None/null 도입 시 | 필요 조치 |
|---|--------|------|-----------|-------------------|-----------|
| 1 | `process_data` 합산 | etl_process.py:561-582 | 0.0 이 합산에 섞임 → 가짜 실부담비용 | `None + float` TypeError | 하나라도 None 이면 `실부담비용=None`(부분합 금지). 컬럼 자체가 없는 경우(`col_* is None`)와 파싱 실패를 구분 |
| 2 | 신규 값 NaN | pandas `row.get()` | `float('nan')` 은 `float()` 성공 → NaN 통과 | `json.dump` 가 `NaN` 리터럴 출력 → **브라우저 `JSON.parse` 실패, 사이트 전체 다운** | `p_float` 에서 `math.isnan/isinf` → None. 추가로 `json.dump(..., allow_nan=False)` 로 재발 시 ETL 이 즉시 실패하게 |
| 3 | `validate_etl_results` | etl_process.py:616-655 | `item.get('실부담비용', 0.0)` | None 이면 `COST_MIN <= None` TypeError, DATA-03 `abs(new-prev)` TypeError → soft-warning 계층이 오히려 ETL 을 죽임 | None 이면 `[WARNING] DATA-0x: 결측` 출력 후 continue. prev_cost 가 None 인 경우도 스킵 |
| 4 | `data.json` 스키마 | etl_process.py:764-767 | 숫자만 | `null` 허용 필드 4개(총보수/기타비용/매매중개수수료/실부담비용) | 스키마 문서화. AUM/거래량은 이미 null 허용(선례) |
| 5 | `build_changelog.py` | `to_float`(55-65) None 안전, `build_changes` 104-107 | `before/after` 둘 다 None 이면 skip, **한쪽만 None 이면 change 기록** | 값→None, None→값 이 "변경"으로 기록됨 → changelog 페이지·RSS·프런트 배지 오염. 또 결측일에 발생한 실제 인하는 다음 날 `None→값` 이라 어차피 못 잡음 | `before is None or after is None` 이면 skip (기록하지 않음). 실제 이력은 fee-history 가 진실의 원천이라는 점을 문서화 |
| 6 | `build_fee_history.py` | `normalize()` None → `continue` (안전) | 결측일은 시리즈 갱신 안 함(마지막 정상값 유지) | 변경 불필요 | 테스트로 "None 은 포인트 추가 안 함" 고정 |
| 7 | 프런트 fetchData | script.js:668-677 | `change.after - change.before` | `null` 은 산술에서 0 → **`0.09 - null = 0.09` 가짜 diff 배지** | (5)에서 걸러지므로 이중 방어: `Number.isFinite(before)&&Number.isFinite(after)` 아니면 매핑 제외 |
| 8 | 프런트 정렬 | script.js:871-875 | `toNumber(a)-toNumber(b)` | `NaN` 반환 → 정렬 불안정 | null-last 비교자 (`Number.isFinite` 기준) |
| 9 | 프런트 렌더 | `feeCellHtml`→`formatPercent` | `toNumber(null)`=NaN → `"-"` | 이미 안전. 단 `"-"` 는 "0" 과 구분 안 됨, 스크린리더는 "하이픈" 낭독 | 결측 표시를 번역 키(`table_value_missing` 등) + `aria-label` 로 (접근성 스트림과 키 공유), `.fee-history-btn` 은 결측 시 비활성 |
| 10 | 프런트 changelog 페이지 | `formatChangeValue` | NaN→`"-"` | 안전 (5로 대부분 안 도달) | 없음 |
| 11 | 차트 | `buildFeeHistoryPoints` currentValue NaN 처리 | 이미 `Number.isFinite` 가드 | 안전: 결측이면 "오늘" 포인트를 붙이지 않고 마지막 정상값에서 끝 | 없음 (테스트만 추가) |
| 12 | 단위 테스트 | tests/test_fees.py:23-31 | `p_float(None)==0.0` 등이 **현행 계약을 고정** | 계약 변경 → 테스트 수정 필수 | `None/""/"N/A"/nan` → None 으로 갱신. `"-"`, `"0"`, `"0.00%"` 케이스 명시 |

### 미결 결정 (PITFALLS/요구사항에서 결론 필요)

- **`"-"` 는 결측인가 0 인가?** KOFIA 는 해당 없는 비용을 `-` 로 표기할 가능성이 있음(코드에서 미확인, LOW). 현재는 0.0 으로 처리되어 정상 동작 중일 수 있음. 실제 KOFIA 엑셀에서 `-` 발생 여부를 로그/`tests/conftest.py` 픽스처로 확인한 뒤, 발생한다면 "`-`=0(명시 허용), 그 외 실패=None" 으로 분리. 이 확인 없이 `-` 를 None 으로 바꾸면 정상 종목이 대량 null 이 되어 DATA-06 대량 보정 가드와 충돌.
- 결측 종목을 data.json 에 `null` 로 남길지, 행 자체를 제외할지: **null 로 남기기 권장**(행 제외는 `count_compared`/백필/탭 카운트 등을 흔들고 changelog 가 "삭제"로 오해). 요구사항(“0.0 대신 결측”)과도 일치.

### 변경 파일

| 파일 | 상태 | 내용 |
|------|------|------|
| `etl_process.py` | 수정 | p_float→None, 합산 규칙, validate 가드, `allow_nan=False` |
| `scripts/build_changelog.py` | 수정 | None 쌍 skip (한 함수) |
| `tests/test_fees.py`, `test_process_data.py`, `test_validate.py`, `test_changelog.py`, `test_fee_history.py` | 수정 | 계약 갱신 + 결측 회귀 테스트 |
| `script.js` | 수정 (작은 hunk 2곳 + 렌더 결측 표시) | #7, #8, #9 — seam 커밋에 포함 |

---

## 2. 접근성/UI (ui-review.md Critical+Major)

이 스트림은 **공유 핫스팟 파일(style.css, script.js, 모든 HTML, i18n/*.json) 전부**를 건드린다. 그래서 다른 스트림이 이 파일들을 가능한 한 건드리지 않게 설계하는 것이 병렬화의 핵심.

### 파일별 편집 지점

| 파일 | 항목 | 비고 |
|------|------|------|
| `style.css` (BOM+CRLF, 1687줄) | C1 h1 그라디언트, C2 header-hidden(`transform`), C3 changelog `min-width`, C4 터치 44px, H3 fee-change 색, H5 focus-within, H8 중복 블록 삭제, H9 `#38bdf8`→토큰, M10 중복 `:focus-visible`, H1 skip-link, 스켈레톤/에러 재시도 스타일 | 한 사람이 한 번에. 중복 블록 삭제(H8)는 라인 번호를 크게 이동시키므로 **CSS 는 단독 소유자 1명** |
| `script.js` (BOM+CRLF) | C2/H10 initSmartHeader(180-207: rAF 스로틀, focus 시 미숨김), C6 `applyTranslations`(331) 에 `data-i18n-aria-label`/`title` 속성 처리, H2 code-cell aria-label(이미 `aria_copy_code` 사용 중—확인 필요), H4 로딩/에러/빈 상태(649, 703, 867) + `role=status`, C5 모바일 테이블 SR(renderTable 903-914 template), M8 localStorage try/catch(≈272) | renderTable 의 template 과 정렬(871) 이 seam/결측 hunk 와 인접 → **seam 커밋을 먼저 랜딩** |
| 모든 HTML (index, isa, pension, guide, fomo, changelog, methodology) | H1 skip-link + `<main id="main">`, H6 theme-color, M4 viewport-fit, C6 `data-i18n-aria-label`, M1, H7 orb div 삭제, L7/L8 | 7개 파일 동일 패턴 수정(스크립트로 일괄 적용 권장). CRLF 여부 파일별 확인(index.html CRLF, BOM 없음) |
| `i18n/*.json` ×8 | `aria_open_menu`, `aria_language`, `skip_to_content`, `table_retry`, `table_reset_filter`, `table_value_missing` 등 | 키 추가 위치: 기존 `aria_copy_code` 근처(블록 단위)로 고정해 다른 스트림의 삽입과 인접하지 않게 |

### 비교 기능과의 교차점 (접근성 요구를 비교 UI 에 선반영)

- 비교 체크박스·비교 바·계산기 입력: **처음부터 44px, 키보드, `aria-live` 상태, 번역된 aria-label** — 접근성 스트림이 끝나길 기다리지 말고 `compare.css` 에 자체 규칙으로 구현.
- 색상은 **`var(--primary)` 토큰만** 사용 (H9 재발 방지). 차트 시리즈 색은 `--chart-1..4` 커스텀 프로퍼티를 `compare.css` 에 정의하고 색약 대비를 위해 **선 스타일(dash)·끝점 라벨**을 병행.
- 신규 `/compare/index.html` 은 접근성 HTML 일괄 수정 **이후** 템플릿을 복제해서 만든다(또는 접근성 스크립트 대상에 포함).

---

## 3. ETF 직접 비교 (2~4개)

### 3.1 모달 vs 신규 페이지 → **신규 페이지 `/compare/`**

| 기준 | 모달 | `/compare/` 페이지 (권장) |
|------|------|--------------------------|
| 공유 URL(`?compare=`) | 홈 URL 에 상태 추가, 로드시 모달 자동 오픈 필요 | 자연스러움. 링크 자체가 결과 |
| 모바일 4종목×지표 비교표 + 차트 + 계산기 | 모달 안에 스크롤 지옥, 기존 `handleModalFocusTrap` 이 콘텐츠 길이에 취약 | 전체 페이지 레이아웃 사용 |
| SEO | 없음 | `noindex,follow` + canonical=`/compare/` (파라미터 조합 무한 → 색인 금지). sitemap 에는 `/compare/` 1개만 |
| script.js 충돌 | 모달 로직이 script.js 의 initModal/openModal 과 얽힘 | 신규 파일에 격리 |
| 뒤로가기/북마크 | 어려움 | 자연스러움 |

단점: 페이지 전환 발생 → 선택 상태를 페이지 간 전달해야 함(§3.3). 비교 바의 "비교하기" 버튼은 링크(`<a href="/compare/?compare=...">`)로 구현해 JS 없이도 동작·새 탭 열기 가능.

### 3.2 컴포넌트 (전부 신규)

| 컴포넌트 | 파일 | 로드되는 페이지 | 책임 |
|----------|------|-----------------|------|
| 선택 모듈 | `compare-select.js` | index, isa, pension (테이블 있는 페이지) | 체크박스 주입, 선택 상태(2~4), 비교 바(하단 고정) 렌더, 저장소 동기화 |
| 비교 뷰 | `compare-view.js` | `/compare/` | URL 파싱·검증, 지표 비교표, 오버레이 차트, 계산기 UI 바인딩 |
| 계산 로직 | `compare-calc.js` (순수 함수, DOM 무의존) | `/compare/` (+ node 테스트) | 누적 비용 계산 |
| 스타일 | `compare.css` | index, isa, pension, compare (선택 UI 는 테이블 페이지에도 필요) | 체크박스, 비교 바, 비교표, 계산기, 차트 색 |
| 페이지 | `compare/index.html` | — | `data-page="compare"`, 헤더/푸터 공통 템플릿 |
| 테스트 | `tests/compare_calc_check.js`, `tests/compare_url_check.js` | CI (`node`) | `fee_chart_check.js` 와 동일한 vm 방식 |

### 3.3 script.js seam (유일한 script.js 변경, ~10줄, 최초 랜딩)

```js
// fetchData 성공 끝: filterAndRenderTable() 다음
document.dispatchEvent(new CustomEvent("etf:data-ready"));

// renderTable 끝(tbody 채운 뒤) — 필터/탭 전환마다 발생
document.dispatchEvent(new CustomEvent("etf:table-rendered"));

// renderTable: row.dataset.code = code;  (tr 에 data-code)

// buildFeeLinePath(points, scale, today, startDate = points[0].date)  // 오버레이 공통 시작일
```

`compare-select.js` 는 `etf:table-rendered` 마다 `tr[data-code]` 의 `.name-cell` 앞에 `<label class="compare-check"><input type="checkbox" …></label>` 을 주입하고 저장된 선택 상태를 복원한다. **컬럼을 추가하지 않는다** (colspan="8" 로딩/에러/빈 행, 모바일 카드 CSS `td::before` 라벨 구조 유지). 코드 셀에는 넣지 않는다 (`role=button` 복사 컨트롤 안에 체크박스 중첩 = 접근성 위반).

`/compare/` 페이지에서는 `hasDataTable()` 이 false 이므로 `fetchData()` 가 실행되지 않는다 → `compare-view.js` 가 `/data.json` 과 `loadFeeHistory()`(재사용, 전역) 를 **직접 fetch**. (대안: `fetchData` 를 페이지 타입 compare 에서도 호출하도록 script.js 수정 — 하지 마라. 로딩/에러 UI 가 `#tableBody` 전제이기 때문.) `resolveDataKeys`/`dataKeys` 는 `compare-view.js` 가 `allData = ...; resolveDataKeys(allData[0])` 로 직접 호출 가능(전역 재할당 `let allData` 는 다른 스크립트에서 대입 가능 — 단 script.js 의 선언이 먼저 평가되어야 하므로 두 스크립트 모두 `defer`, 순서 script.js → compare-view.js).

### 3.4 상태 & URL 계약

- **선택 상태 저장소**: `sessionStorage["etf_compare"]` (JSON 배열, 코드 문자열). `try/catch` 필수(Safari 프라이빗 — 접근성 M8 과 동일 이슈). localStorage 는 쓰지 마라(오래된 선택이 재방문 시 남는 것이 불친절).
- **URL**: `/compare/?compare=360200,0026S0,...&lang=xx`
  - 파싱: `split(",")` → trim → 중복 제거 → **`allData` 의 종목코드 화이트리스트로 검증**(영숫자 KRX 코드 존재: 0026S0) → 4개 초과는 앞 4개만(또는 경고). 검증 실패 코드는 무시하고 안내 문구. 유효 코드 <2 이면 "종목 선택" 빈 상태 + 홈 링크. `escapeHtml` 을 거치지 않은 URL 값을 DOM 에 넣지 않는다 (v1.1 XSS 감사 결과 유지).
  - 쓰기: 비교 바의 링크 href 는 코드 순서를 **선택 순서**로 유지(사용자가 보는 열 순서). `history.replaceState` 로 비교 페이지에서 종목 제거 시 URL 갱신.
  - 기존 `buildShareUrl()`(script.js:959) 은 `URL` 객체로 기존 searchParams 를 보존하므로 `?compare=` 를 잃지 않는다 → 비교 페이지에서 기존 공유 버튼 재사용 가능(버튼 마크업만 복제). `syncLanguageParam`, `buildCanonicalUrlForLanguage` 도 파라미터 보존/canonical 은 `compare` 제거 — 동작 OK.
- **카테고리 교차 선택**: 탭 전환 시 tbody 재렌더되어도 선택은 코드 기준이므로 유지. 선택 개수 4 초과 시 나머지 체크박스 `disabled` + 안내(`aria-live`).

### 3.5 오버레이 수수료 이력 차트 (기존 SVG 코드 재사용)

재사용 가능(전역): `computeFeeChartScale(values)`(값 배열 합집합 지원), `feeChartX/Y`, `buildFeeLinePath`(monotone 곡선), `FEE_CHART`, `formatFeeAxisValue/Date`, `buildFeeHistoryPoints`.

새로 필요(compare-view.js): `renderFeeCompareChart(seriesList, fieldLabel, today, width)`
1. 종목별 `buildFeeHistoryPoints(history.series[code][historyKey], currentValue, today)`.
2. **공통 X 축**: `startDate = min(각 시리즈 첫 날짜)`, `end = max(today, 각 마지막 날짜)`; 각 시리즈는 `buildFeeLinePath(points, scale, end, startDate)` (seam 의 4번째 인자). 시리즈 시작이 더 늦으면 그 지점부터 시작(값 외삽 금지).
3. **공통 Y 축**: `computeFeeChartScale(모든 시리즈 값 concat)`.
4. 기존 함수의 **전역 `FEE_CHART.width/right` 변이** (renderFeeHistoryChart 1488-1489)와 `linearGradient id="feeChartFill"` 고정 ID 에 주의: 오버레이는 영역 채우기(area) 없이 선만, 그래디언트 정의 재사용 안 함. 모달과 동시에 열리지 않으므로 FEE_CHART 변이 충돌 없음.
5. 지표 토글(총보수/기타/매매/실부담 – `FEE_HISTORY_FIELDS` 재사용) 라디오 그룹 1개, 기본은 실부담비용.
6. 접근성: `<svg role="img" aria-label>` 요약 + **시리즈 범례(색 + 선 스타일 + 종목명 + 현재값)** + 기존 `renderFeeHistoryList` 처럼 종목별 변경 내역 리스트(접근 가능한 대체 표현). 색만으로 구분 금지.
7. 결측(null) 종목은 시리즈에서 제외하고 "데이터 없음" 표기.

### 3.6 비교 지표 표

행=지표(총보수/기타/매매/실부담/AUM/거래량), 열=종목(2~4). 최저값 강조는 색+텍스트(“최저”)로. 모바일에서는 가로 스크롤(`overflow-x:auto`, 첫 열 sticky) — 카드 스택 패턴(C5 문제) 사용 금지. `<th scope="col|row">` 실제 헤더 사용.

---

## 4. 누적 비용 계산기

### 4.1 위치 & 결합
비교 뷰 **하단 섹션**. 입력: 투자금(원), 보유기간(년), (선택) 연 수익률 가정(기본 0%). 출력: 종목별 누적 비용(원), 최저 대비 차액, 기간별 표(1/3/5/10년). 종목 목록은 비교 뷰와 동일 상태 공유(같은 `compare-view.js` 내부 모듈 상태).

### 4.2 `compare-calc.js` (순수 로직, 부작용 없음)
```js
// annualCostPct: 실부담비용(%) — 예 0.09
// returnPct: 연 수익률 가정(%) (기본 0)
function cumulativeCost(principal, years, annualCostPct, returnPct = 0) { /* 연 단위 루프 */ }
```
- 0% 수익률일 때 `principal × rate × years` 와 일치하는지, 수익률>0 일 때 비용이 잔고 증가분에 비례해 커지는지 node 테스트로 고정.
- 부동소수: 원 단위 반올림은 **표시 시점만**, 내부는 float. 입력 검증(음수/NaN/상한: 투자금 ≤ 1e12, 기간 1~50)은 이 모듈에서.
- **실부담비용에 이미 매매중개수수료가 포함**돼 있음(정의상 총보수+기타비용+매매중개수수료) → 매수 시점 1회성 비용이 아니라 연 반복 비용으로 근사하는 것은 모델 단순화. UI 문구에 "현재 수수료율이 유지된다는 가정, 세금·환율 제외, 투자 조언 아님" 명시 (Core Value 가 "실질 비용 비교"이므로 가정 표기 필수, 번역 8개 언어).
- 입력 포맷: 한국어 `Intl.NumberFormat`, 숫자 전용 `inputmode="numeric"`, `<label>` 연결(접근성 L3 재발 방지).

### 4.3 i18n
계산기·비교 문구 키는 `compare_*` / `calc_*` 접두사로 **연속 블록 1개**를 8개 파일에 삽입 (fee_history_* 블록 바로 뒤). 접근성 스트림의 `aria_*` 삽입 지점과 떨어뜨려 JSON 병합 충돌 방지. `tests/test_i18n_fee_history.py` 와 같은 키 패리티 테스트를 `compare_`/`calc_` 에 확장.

---

## 5. RSS 피드

### 5.1 흐름
`changelog.json`(일 단위 entry: `{month, updatedAt, changes[{code,name,field,before,after}]}`, build_changelog.py:226-230) → `scripts/build_rss.py` → `feed.xml`(루트) → CI 커밋.

### 5.2 컴포넌트

| 파일 | 상태 | 내용 |
|------|------|------|
| `scripts/build_rss.py` | 신규 | 표준 라이브러리만(`xml.etree.ElementTree`, `email.utils`) — requirements.txt 변경 없음. RSS 2.0 + `atom:link rel=self`. `channel` 언어 `ko`, 최신 N개(예: 30) entry |
| `feed.xml` | 신규(생성물) | 루트 배치 → `https://etfsave.life/feed.xml` |
| `tests/test_rss.py` | 신규 | 인하 필터, guid 안정성, XML 이스케이프(`&` in "S&P500"), 빈 changelog, None 값 |
| `.github/workflows/daily_update.yml` | 수정 | "Build Changelog" 다음 `python scripts/build_rss.py` 스텝 + `file_pattern` 에 `feed.xml` 추가. **반드시 changelog 스텝 뒤, 커밋 스텝 앞** |
| `index.html`, `changelog/index.html` | 수정(1줄씩) | `<link rel="alternate" type="application/rss+xml" title="…" href="/feed.xml">` — HTML 충돌 최소화를 위해 접근성 HTML 일괄 수정 후 적용 |
| `robots.txt`/`sitemap.xml` | 선택 | sitemap 에 feed 넣지 않음(비-HTML). robots 는 변경 불필요 |

### 5.3 설계 결정
- **item 단위 = changelog entry 1개(=1일)**; `guid isPermaLink="false"` = `etfsave-fee-YYYY-MM-DD`(entry 의 `updatedAt`). 같은 날 재실행으로 entry 가 교체돼도 guid 가 같아 리더 중복 알림 없음. `pubDate` = `updatedAt` 09:00 +0900 (RFC 822, `email.utils.format_datetime`).
- **"수수료 인하"의 정의(제품 결정 필요)**: build_changelog.py:22-27 주석대로 **매매중개수수료/실부담비용은 거의 모든 ETF 가 매월 변동**하므로 실부담비용 감소를 전부 피드에 넣으면 잡음. 권장: **총보수·기타비용 감소를 헤드라인**, 실부담비용 감소는 본문에 보조 표기. 값이 None 이거나 증가뿐이면 item 생성 안 함.
- 링크는 `https://etfsave.life/changelog/`(앵커 없음 — changelog 페이지에 날짜 앵커 id 가 없음. 추가하면 script.js 수정이 필요하므로 v1.4 범위에서는 페이지 링크만).
- 날짜 계산: `datetime.now()` 를 쓰는 build_changelog.py 와 달리 RSS 는 changelog 의 `updatedAt` 만 사용(결정적, 테스트 용이). UTC 러너에서 KST 날짜 어긋남 문제(build_changelog 의 `datetime.now()`가 UTC 기준)는 기존 부채 — RSS 가 그 값을 그대로 신뢰하므로 PITFALLS 로 기록.
- 피드 유효성: W3C validator 는 CI 에서 못 돌리므로 파이썬 테스트에서 well-formed 파싱 + 필수 필드(title/link/description, item guid) 검사.

---

## 6. 파일 충돌 매트릭스

● = 주로 수정(다수 hunk), ○ = 소규모 수정(1~3 hunk), N = 신규

| 파일 | p_float | 접근성 | 비교+계산기 | RSS |
|------|:------:|:------:|:----------:|:---:|
| `etl_process.py` | ● | | | |
| `scripts/build_changelog.py` | ○ | | | |
| `scripts/build_rss.py`, `feed.xml`, `tests/test_rss.py` | | | | N |
| `.github/workflows/daily_update.yml` | | | | ○ |
| `tests/test_*.py` (기존) | ● | | | |
| **`script.js`** (BOM+CRLF) | ○ (2 hunk) | ● | ○ (seam 3 hunk) | |
| **`style.css`** (BOM+CRLF) | | ● | | |
| **`index.html`** 및 서브 HTML | | ● (7개 전부) | ○ (script/css 태그: index, isa, pension) | ○ (index, changelog `<link>`) |
| **`i18n/*.json` ×8** | ○ (`table_value_missing`) | ● | ● | |
| `compare/index.html`, `compare-*.js`, `compare.css` | | | N | |
| `tests/compare_*_check.js` | | | N | |
| `.github/workflows/daily_update.yml` (node 검사 스텝 추가) | | | ○ | ○ |
| `sitemap.xml` | | | ○ | |

**진짜 충돌 지점 (순서 필요):**
1. `script.js`: p_float(2 hunk) ↔ 접근성(다수) ↔ 비교 seam(3 hunk) → **seam+결측 hunk 를 먼저 하나의 커밋으로 랜딩**한 뒤 접근성이 그 위에서 작업. hunk 가 겹치지 않아 git 3-way merge 가 통과할 가능성이 높지만, BOM+CRLF 파일이므로 아래 §8 규칙 필수.
2. 모든 HTML: 접근성 일괄 수정 ↔ 비교의 태그 추가 ↔ RSS `<link>` → **접근성 → 나머지** 순, 또는 나머지 변경을 마지막 "통합" 단계에 몰아넣기.
3. `i18n/*.json`: 세 스트림이 각자 **서로 다른 연속 블록**에 삽입(§4.3). 파일 끝 삽입 금지(마지막 키 trailing comma 충돌).
4. `daily_update.yml`: RSS 스텝 + node 테스트 스텝 → 한 명이 두 변경 처리하거나 RSS 스트림 소유.

`style.css` 는 접근성 단독 소유 → 비교 스타일을 `compare.css` 로 분리한 이유. (대안으로 style.css 끝에 append 하면 H8 중복 블록 삭제로 라인이 밀려도 hunk 자체는 안 겹치지만, CRLF+BOM 편집 실수 위험과 로드 비용 때문에 비권장. 단 `compare.css` 는 테이블 페이지 3개에 `<link>` 1줄 추가 필요.)

---

## 7. 빌드 순서 / 병렬 그룹

```
t0 ───────────────────────────────────────────────────────────────►
Track P1  [P-1 p_float ETL+테스트]────────────┐
Track P2  [P-2 RSS 스크립트+CI+테스트]────────┼──► [통합] RSS <link>, sitemap, CI node 스텝, E2E
Track F0  [F-0 seam+결측 hunk 커밋 (짧음)]─┐   │
                                            ├─► Track F1 [A-1 접근성 CSS+JS+HTML+i18n]
                                            ├─► Track F2 [C-1 compare-calc.js + 테스트] (t0 부터 가능, seam 무관)
                                            └─► Track F3 [C-2 compare-select/view/css + compare/index.html] ─► [통합]
```

### 권장 페이즈 (roadmap 입력)

| Phase | 내용 | 병렬 가능 여부 | 선행 조건 | 주 소유 파일 |
|-------|------|----------------|-----------|--------------|
| **P1. 데이터 신뢰성** | p_float→None, validate 가드, changelog None-skip, NaN 방어, 프런트 결측 소비자 2곳(script.js 작은 hunk) | Python/테스트 부분은 **P2 RSS·C-1 계산기와 완전 병렬** | 없음 | etl_process.py, build_changelog.py, tests/, (script.js seam 커밋에 동승) |
| **P2. RSS 피드** | build_rss.py, feed.xml, CI 스텝, 테스트 | **P1·A11y·Compare 전부와 병렬** (파일 분리) | 없음. 단 "인하" 정의에 P1 의 None 규칙 반영 → P1 의 changelog 계약(“None 쌍 미기록”)만 합의하면 코드는 독립 | scripts/build_rss.py, workflow |
| **F-0. script.js seam** (P1 프런트 hunk 포함) | 이벤트 2개, `tr[data-code]`, `buildFeeLinePath` startDate, null-safe diff/정렬 | 짧은 직렬 게이트(~수십 분). **이후 A11y·Compare 가 동시에 시작** | 없음 | script.js |
| **A11y. 모바일 접근성/UI** | §2 전체 | Compare 신규 파일 작업과 **병렬** (파일 겹침 없음: style.css/HTML/i18n aria 블록/script.js 다른 hunk) | F-0 랜딩 | style.css, script.js, 모든 HTML, i18n |
| **Compare-A. 계산 로직** | compare-calc.js + node 테스트 | **t0 부터** 병렬 | 없음 | 신규 파일만 |
| **Compare-B. 선택+비교뷰+차트** | compare-select.js, compare-view.js, compare.css, `/compare/index.html`, i18n `compare_*` 블록 | A11y 와 병렬 진행 가능. **`compare/index.html` 생성과 3개 페이지 `<script>/<link>` 추가는 A11y HTML 일괄 수정 이후** | F-0 (이벤트 계약), Compare-A(계산기 UI 붙일 때) | 신규 + i18n 블록 |
| **Integration** | RSS `<link>`, sitemap, CI 에 compare node 테스트 추가, 수동 모바일 검증, 8개 언어 스모크 | 직렬(짧음) | 위 전부 | HTML 소규모, workflow, sitemap |

**최대 병렬도**: t0 에 P1(Python), P2(RSS), Compare-A, F-0 네 개 동시 시작. F-0 종료 후 A11y, Compare-B 동시. 실제 직렬 병목은 F-0(짧음)과 Integration(짧음)뿐.

**계산기를 Compare-B 와 합칠지**: 계산 로직은 분리(Compare-A)해 병렬화하고, 계산기 **UI 섹션**은 `compare-view.js` 안에서 Compare-B 소유자가 붙인다(같은 파일 동시 편집 금지).

---

## 8. 편집 안전 규칙 (BOM + CRLF 핫스팟)

- `script.js`, `style.css` 는 **UTF-8 BOM + CRLF** (확인: `file` 결과). `scripts/build_changelog.py` 도 BOM+CRLF, `build_fee_history.py`·`backfill_fee_history.py` 는 CRLF(BOM 없음), `index.html` CRLF. → 편집 도구가 LF 로 정규화하거나 BOM 을 떨구면 **전체 파일 diff → 병합 충돌 폭발**. 각 스트림 완료 조건에 `git diff --stat` 로 변경 라인 수가 의도 범위인지 확인, `file`/`head -c3` 로 BOM·CRLF 유지 검증 포함.
- `tests/fee_chart_check.js` 는 BOM 을 직접 제거하고 vm 로 script.js 를 실행 → script.js 최상위에서 DOM 접근 시 샌드박스 스텁(`getElementById→null`)에 의존. **seam 에서 `document.dispatchEvent` 는 함수 내부(fetchData/renderTable)에만** 두고 최상위 실행 코드에 두지 말 것(스텁 `document` 에 `dispatchEvent` 없음).
- 신규 파일(`compare*.js`, `compare.css`, `build_rss.py`)은 **LF, BOM 없음**으로 시작 (혼합 규칙이지만 신규 파일까지 CRLF 로 만들 이유 없음). `.gitattributes` 가 없으므로 저장소 정책을 새로 만들지 마라(범위 밖).
- `.githooks/pre-commit` 은 `sync_server_changelog.py --stage` 로 changelog.json 을 운영본으로 덮어쓴다(PROJECT.md Key Decision). 로컬에서 changelog.json 을 손으로 고쳐 테스트한 결과가 커밋에서 사라질 수 있음 → RSS 테스트는 **픽스처 JSON** 으로, 실제 changelog.json 에 의존 금지.
- 워크스페이스 미추적 파일(`scripts/_check_fees.py`, `.debug-*`)은 스크래치 — 커밋 대상 아님.

---

## 9. 데이터 흐름 (v1.4 후)

```
KOFIA xlsx ──► process_data ──► p_float(None 허용) ──► 합산(하나라도 None ⇒ 실부담비용 None)
                                     │
                                     ▼
                          data.json (null 허용, NaN 금지: allow_nan=False)
              ┌──────────────┼───────────────────────────────┐
              ▼              ▼                               ▼
     build_changelog     build_fee_history            (프런트 fetch)
     (None 쌍 skip)      (None skip, 기존 유지)              │
              │              │                               │
              ▼              ▼                               │
        changelog.json   fee-history.json                    │
              │              │                               │
              ▼              └───────────┐                   │
        build_rss.py                     │                   │
              │                          │                   │
              ▼                          ▼                   ▼
          feed.xml            /compare/ (오버레이 차트) ◄── 브라우저: index/isa/pension 테이블
                                   ▲                        체크박스 → sessionStorage → 비교 바 → 링크
                                   └────── ?compare=코드,코드 ────────┘
```

CI 스텝 순서: pytest → `node tests/fee_chart_check.js` → (신규) `node tests/compare_calc_check.js` → ETL → build_changelog → build_fee_history → **build_rss** → commit(`data.json changelog.json update-meta.json fee-history.json feed.xml`).

---

## 10. 피해야 할 안티패턴

| 안티패턴 | 이유 | 대신 |
|----------|------|------|
| 비교 로직을 script.js 에 추가 | 1856줄 단일 파일에 접근성과 동시 편집 → 충돌, BOM/CRLF 위험 | 신규 파일 + seam 이벤트 |
| 비교 체크박스를 새 `<th>/<td>` 컬럼으로 추가 | colspan="8" 다수, 모바일 `data-label` 카드 CSS 깨짐 | `.name-cell` 내부 주입 |
| 체크박스를 code-cell(role=button) 안에 삽입 | 중첩 인터랙티브 컨트롤 | name-cell 앞 별도 label |
| 비교 페이지에서 `fetchData()` 재사용 | `#tableBody` 전제 UI | 직접 fetch + 전역 헬퍼 재사용 |
| 0.0 을 "결측"의 대체값으로 유지하면서 UI 에서만 숨김 | 근본 원인(가짜 변동) 잔존 | ETL 에서 None |
| 실부담비용을 부분 합으로 계산 (결측 항목 0 취급) | 다시 가짜 값 | 하나라도 None ⇒ 전체 None |
| RSS 를 실부담비용 감소 전체로 생성 | 매월 거의 모든 ETF 변동 → 스팸 | 총보수·기타비용 감소 중심 |
| 차트 함수를 별도 파일로 이동 리팩터링 | `fee_chart_check.js` 및 병렬 편집 충돌 | 전역 재사용 + 인자 하나 추가 |
| `?compare=` 코드를 검증 없이 DOM/HTML 에 삽입 | XSS (v1.1 감사 취지 위반) | 화이트리스트 매칭 + escapeHtml |

---

## 11. 확장성 (정적 사이트 기준)

| 관심사 | 현재(59종목) | 500종목 | 비고 |
|--------|-------------|---------|------|
| 비교 페이지 데이터 로딩 | data.json + fee-history.json 전체 fetch (수십 KB) | 수백 KB — 여전히 허용 | 종목 수가 늘면 fee-history 를 종목별 분할 고려(범위 밖) |
| 선택 상태 | sessionStorage 배열 4개 | 동일 | — |
| RSS | 최신 30 entry | 동일 | entry 당 인하 종목 상한(예: 20) 두고 “외 N건” |
| 오버레이 차트 | 4시리즈 × 수십 포인트 | 동일 | 시리즈 수는 UI 상한 4 |

---

## 12. Research Flags (페이즈별 심화 필요 여부)

| 페이즈 | 플래그 |
|--------|--------|
| P1 p_float | **심화 필요**: KOFIA 엑셀의 `-` / 빈 셀 / 실제 NaN 발생 실태 확인(로그·백업 xlsx), "결측 vs 0" 구분 규칙 확정. 그 외 구현은 표준 |
| RSS | 제품 결정(어떤 변화를 "인하"로 볼지) 1개. 구현은 표준 |
| A11y | 표준 패턴. 단 C5(모바일 테이블 SR 구조) 접근 방식—가로 스크롤 유지 vs `aria-label` 보강—결정 필요. 실기기(VoiceOver/TalkBack) 검증은 자동화 불가 |
| Compare-B | 모바일 4열 비교표 레이아웃, 오버레이 차트 가독성(4선 겹침) 디자인 검증 필요. 아키텍처는 확정 |
| Compare-A | 수익률 가정 포함 여부(단순 vs 복리) 제품 결정. 로직은 표준 |

## Sources

- 코드 직접 분석: `etl_process.py`(p_float 427, process_data 440-603, validate 605-655, json.dump 764), `scripts/build_changelog.py`(to_float 55, build_changes 86, main 180), `scripts/build_fee_history.py`(normalize, apply_snapshot), `script.js`(fetchData 645, renderTable 860, feeCellHtml 1317, 차트 1479-1830, buildShareUrl 959), `.github/workflows/daily_update.yml`, `tests/fee_chart_check.js` — HIGH
- `.planning/ui-review.md`(2026-04-30 정적 감사; 라인 번호는 이후 v1.3 변경으로 이동했을 수 있음 — 착수 시 재확인), `.planning/PROJECT.md` — HIGH
- classic script 전역 스코프 공유(top-level const/let 은 window 속성이 아니지만 다른 classic script 에서 접근 가능): 웹 표준 동작, 훈련 지식 기반 — MEDIUM (구현 첫 스파이크에서 브라우저로 확인 권장)
- RSS 2.0/`atom:link` 요구 필드: 훈련 지식 기반 — MEDIUM (validator 로 1회 수동 검증 권장)
