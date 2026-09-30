# Phase 9: 수수료 변동 그래프 모달 - Context

**Gathered:** 2026-09-30
**Status:** Ready for planning

<domain>
## Phase Boundary

메인 비교 테이블(index.html)의 4개 수수료 셀(총보수·기타비용·매매중개수수료·실부담비용)을 클릭/탭/키보드로 열면 모달에 해당 ETF·항목 1개의 계단형 SVG 차트와 변동 내역 리스트를 표시한다. 데이터는 `fee-history.json` (Phase 7/8). 툴팁·배지·다중 항목은 범위 밖.

Requirements: CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06

</domain>

<decisions>
## Implementation Decisions

### 열기·모달
- 4개 수수료 `<td>` 안의 값을 `<button type="button" class="fee-history-btn" data-code data-field>`로 감쌈; `tbody`에 위임 리스너 1개 (renderTable이 필터 시 재렌더)
- 클릭 가능 표시: 점선 밑줄 + 표 위 힌트 한 줄 ("수수료를 누르면 변동 그래프")
- 모달: 기존 `.modal-overlay`/`.modal-content` 마크업·CSS 재사용. `openPrivacyModal`/`closePrivacyModal`/`handleModalFocusTrap`을 모달 요소 인자로 일반화해 두 모달이 공유 (ESC는 열린 모달만 닫음)
- 모바일: 기존 모달 반응형 CSS 그대로, 버튼 탭 영역 최소 44px 높이

### 차트
- SVG `viewBox` 고정(예: 320×180), `width:100%` 반응형, `createElementNS`로 생성, `dir="ltr"`
- Y축: 시리즈 min/max ±10% 패딩, 눈금 3개, 값 표기는 기존 `formatPercent`(4자리); min=max면 값 ±50% 범위로 평평한 선 중앙
- X축: 시간 비례, 라벨은 시작일·오늘 2개 (`YYYY-MM-DD`)
- 계단형 실선(수평→수직), 변동 지점에 점, 마지막 값 오늘까지 연장
- 표의 현재 data.json 값이 이력 마지막 값과 다르면 오늘 포인트로 추가 (차트가 클릭한 셀과 모순되지 않게)

### 내역·문구·로딩
- 변동 내역 리스트: 최신순, `날짜 · 값 · ▲/▼ 변동폭 %p`, 맨 아래 "기록 시작" 행 (차트 대체 텍스트 역할)
- 변동 없음/단일 포인트: 평평한 선 + "{첫 기록일} 이후 변동 없음"
- 새 문구 키를 `i18n/*.json` 8개(ko, en, vi, zh, ja, th, tl, km) 모두 추가, ko 외는 Claude 번역
- 첫 클릭 시 `/fee-history.json`을 `cache:"no-store"`로 fetch (기존 data.json 패턴), promise 캐시; 로딩 중 표시, 실패 시 모달에 에러 문구 + 닫기
- SVG에 `role="img"` + `aria-label` (항목·기간·변동 횟수 요약)

### Claude's Discretion
- 차트 색상은 기존 CSS 변수/토큰 사용 (새 색 도입 최소화)
- 모달 제목 형식: "{종목명} ({코드}) · {항목명}"
- 모든 동적 텍스트는 기존 `escapeHtml` 또는 textContent (XSS 규칙, v1.1 SEC)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `script.js`: `renderTable(rows)` (838), `formatPercent`, `escapeHtml`, `getTranslation(key)`, `toNumber`, `dataKeys` (fee/other/trade/real/code/name), `initModal`/`openPrivacyModal`/`closePrivacyModal`/`handleModalFocusTrap` (1180-1263), `lastFocusedBeforeModal`, `trackEvent`
- `index.html:323` privacy modal markup; `style.css:591` `.modal-overlay`, `.modal-content`, `body.modal-open`
- 코드셀 복사 버튼 패턴 (role/tabindex/keydown) — 참고용

### Established Patterns
- fetch는 `cache: "no-store"`, URL 상수 (`GAS_API_URL`, `CHANGELOG_URL`, `UPDATE_META_URL`) 상단 정의
- i18n: `data-i18n` 속성 + `getTranslation`, 번역 JSON에 한국어 원문 키
- 바닐라 JS, 프레임워크·라이브러리 금지

### Integration Points
- `fee-history.json` 스키마: `{version, updatedAt, names:{code:name}, series:{code:{field:[[date,value],...]}}}`, field 키는 한국어 (총보수/기타비용/매매중개수수료/실부담비용) — `dataKeys` 매핑 필요
- index.html 테이블(`#tableBody`), 표 위 힌트 위치 `table-note` 근처

</code_context>

<specifics>
## Specific Ideas

- 대부분 종목 총보수는 변동 1회 이하 → 단일 포인트 상태가 흔함 (총보수 multi-point 5종목뿐)
- 매매중개수수료·실부담비용은 월별 변동 → 8~9 포인트

</specifics>

<deferred>
## Deferred Ideas

- 포인트 툴팁, '변동 N회' 배지, 항목 탭, 딥링크
- etl_process.p_float 0.0 반환 (Phase 7 WR-04)

</deferred>
