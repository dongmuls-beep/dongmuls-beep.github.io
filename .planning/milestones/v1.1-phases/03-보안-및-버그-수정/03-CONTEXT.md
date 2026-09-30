# Phase 3: 보안 및 버그 수정 - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

`script.js` 내 XSS 취약점을 줄이고 알려진 UI 버그 2개를 수정한다. 새 기능 추가 없이 기존 코드의 보안성과 안정성을 높이는 것이 목표다.

요구사항: SEC-01, SEC-02, BUG-01, BUG-02

</domain>

<decisions>
## Implementation Decisions

### 번역 innerHTML 처리 (SEC-01, SEC-02)

- **D-01:** `applyTranslations()`의 `el.innerHTML = translated` 유지. 번역 JSON(`i18n/*.json`)에 `<br>`, `<strong>` 등 의도적 HTML 태그가 포함되어 있어 `textContent`로 바꾸면 서식이 깨짐. 이 패턴은 의도적임을 명시하는 주석 추가.
- **D-02:** `renderTable()`의 `row.innerHTML` (line 872)과 `renderChangelog()`의 `card.innerHTML` (line 1092)은 이미 `escapeHtml()` 완전 적용 중 (ETF 코드, 이름, 변경 이력 모두). 누락 위치가 있다면 보완.
- **D-03:** `getTranslation()` 반환값을 직접 사용하는 innerHTML(로딩/에러 상태 메시지)은 번역 JSON이 시스템 통제 소스이므로 현행 유지. SEC-01/02는 **외부 데이터(ETF 데이터, changelog JSON)** 렌더링 위치에 집중 적용.

### 헤더 글리치 수정 (BUG-01)

- **D-04:** `initSmartHeader()`의 RAF 콜백 **최상단**에서 `document.body.classList.contains("nav-open")`를 체크하여 early return. nav가 열린 동안은 헤더 클래스(`header-hidden`)와 `lastScroll` 모두 건드리지 않음.
- **D-05:** 현재 조건문(`if ... && !nav-open` → else)에서 else 분기가 nav-open 시에도 `header-hidden`을 제거하며 `lastScroll`을 업데이트하는 것이 버그 원인. early return으로 스크롤 핸들러 전체를 스킵.

### 빈 변경 이력 테이블 처리 (BUG-02)

- **D-06:** `renderChangelog()`에서 `changes.length === 0` 시 `<thead>` 생략. `rowsHtml`이 `<tr><td colspan="5">…</td></tr>` 하나뿐이므로 `<thead>` 없이 `<tbody>` 단독으로 표시하거나, 테이블 전체를 제거하고 메시지 행만 렌더링.
- **D-07:** 선호 방식: `changes.length === 0`일 때 테이블 블록 자체를 건너뛰고 `<p>` 메시지만 렌더링 (테이블 구조가 불필요). 테이블이 있는 경우에만 `<thead>` 포함.

### Claude's Discretion

- `getTranslation()` 호출에 `escapeHtml()` 추가 여부 (로딩/에러 메시지): 번역 소스가 통제되어 있으므로 Claude 판단에 맡김. 추가하면 `<br>`이 깨지므로 추가하지 않는 쪽 권장.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` — SEC-01, SEC-02, BUG-01, BUG-02 요구사항 정의 및 검증 기준

### 수정 대상 파일
- `script.js` — 모든 수정이 이 파일에 집중됨
  - `escapeHtml()`: line 1345 (완전한 HTML 이스케이핑 유틸리티)
  - `applyTranslations()`: line 303 (번역 적용, innerHTML 유지 결정)
  - `initSmartHeader()`: line 165 (BUG-01 수정 대상)
  - `renderTable()`: line 829 (ETF 테이블 렌더링, 이미 escapeHtml 적용)
  - `renderChangelog()`: line 1040 (BUG-02 수정 대상, 이미 escapeHtml 적용)

### 보안 분석
- `.planning/codebase/CONCERNS.md` §보안-고려사항, §알려진-버그 — innerHTML 위치 목록(line 308, 618, 672, 750, 756, 833, 836, 872, 1044, 1054, 1065, 1092, 1117) 및 버그 재현 조건

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `escapeHtml(raw)` (script.js:1345): `&`, `<`, `>`, `"`, `'` 모두 이스케이핑. 모든 외부 데이터 렌더링에 적용 가능.
- `stripHtmlTags(raw)` (script.js:1354): HTML 태그 제거 유틸리티. 텍스트만 필요한 경우 대안으로 활용 가능.
- `getTranslation(key)` (script.js:~582): 현재 언어팩에서 번역 반환. 반환값에 의도적 HTML(`<br>`, `<strong>`) 포함 가능.

### Established Patterns
- **ETF 데이터 렌더링 패턴**: `row.innerHTML = \`...\${escapeHtml(value)}...\`` — 템플릿 리터럴 + escapeHtml() 조합. `renderTable()`(line 872), `renderChangelog()`(line 1092)에서 사용 중.
- **DOM 클리어 패턴**: `element.innerHTML = ""` — 컨테이너 초기화 시 사용. 보안 무관.
- **RAF 스크롤 패턴**: `requestAnimationFrame()`으로 래핑된 스크롤 핸들러 (`initSmartHeader()` line 175).
- **nav-open 상태**: `document.body.classList.contains("nav-open")` — 네비게이션 열림 여부 확인 방법.

### Integration Points
- `initSmartHeader()` — scroll 이벤트 리스너 내부 RAF 콜백 수정 (early return 추가)
- `renderChangelog()` — `changes.length === 0` 분기에서 카드 innerHTML 템플릿 수정
- `applyTranslations()` — 주석만 추가, 로직 변경 없음

</code_context>

<specifics>
## Specific Ideas

- 헤더 early return: `requestAnimationFrame` 콜백 최상단에 `if (document.body.classList.contains("nav-open")) return;` 한 줄 추가로 충분.
- 빈 변경 이력: `changes.length === 0`일 때 테이블 블록 전체 대신 `<p class="changelog-no-changes">...</p>` 또는 기존 스타일 클래스 활용.

</specifics>

<deferred>
## Deferred Ideas

- **언어팩 폴백 묵시적 실패** (script.js:582-600) — `getTranslation()`이 키 이름 반환, 경고 미로깅. Phase 4 이후 또는 별도 phase로.
- **클립보드 레거시 폴백 제거** (script.js:902-917) — `document.execCommand("copy")` — 보안 고려사항이지만 이 phase 범위 밖.
- **PERF 이슈** — 카테고리 필터 전체 DOM 재생성, 변경 이력 페이지네이션 — v2 요구사항.

None — 논의가 Phase 3 범위 내에 머뭄.

</deferred>

---

*Phase: 3-보안-및-버그-수정*
*Context gathered: 2026-05-20*
