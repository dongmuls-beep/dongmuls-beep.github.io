# Phase 3: 보안 및 버그 수정 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 3-보안-및-버그-수정
**Areas discussed:** 헤더 글리치 수정 방법, 번역 innerHTML 처리

---

## 헤더 글리치 수정 방법 (BUG-01)

| Option | Description | Selected |
|--------|-------------|----------|
| nav-open 시 전체 스킵 | RAF 콜백 최상단에서 nav-open 체크 → return. 헤더·lastScroll 모두 건드리지 않음. | ✓ |
| nav-close 시 lastScroll 리셋 | nav 닫힘 이벤트 시 lastScroll = window.scrollY 리셋. 스크롤 핸들러 구조 유지. | |
| 둘 다 적용 | nav-open 스킵 + nav-close 리셋. 가장 철저하지만 코드 복잡도 증가. | |

**User's choice:** nav-open 시 전체 스킵 (Recommended)
**Notes:** 단순하고 충분함. `requestAnimationFrame` 콜백 최상단에 `if (nav-open) return;` 한 줄 추가.

---

## 번역 innerHTML 처리 (SEC-01, SEC-02)

*사전 조사 결과: `i18n/ko.json`에 `<br>`, `<strong>` 등 의도적 HTML 태그 확인됨.*

| Option | Description | Selected |
|--------|-------------|----------|
| innerHTML 유지 + 주석 | 번역 값에 HTML 서식 의도적 포함. 주석으로 명시. ETF 데이터 렌더링에 escapeHtml() 집중 적용. | ✓ |
| DOMPurify 미니 화이트리스트 | br, strong, em, a만 허용하는 ~20줄 구현. 범위 관리 명확, 복잡도 증가. | |
| innerHTML 유지 (주석 없이) | 현상 유지. ETF 데이터 렌더링에만 escapeHtml() 집중. | |

**User's choice:** innerHTML 유지 + 주석 (Recommended)
**Notes:** `renderTable()`, `renderChangelog()`는 이미 escapeHtml() 완전 적용 중으로 확인됨. 추가 보완만 필요.

---

## 빈 변경 이력 테이블 (BUG-02)

*사용자가 이 영역 선택 안 함 — 요구사항(BUG-02)이 명확하므로 Claude 판단으로 CONTEXT에 포함.*

**Claude's determination:** `changes.length === 0` 시 테이블 블록 전체 제거, 메시지만 렌더링. 테이블이 있는 경우에만 `<thead>` 포함.

---

## Claude's Discretion

- `getTranslation()` 반환값에 `escapeHtml()` 추가 여부: 번역 소스가 통제되어 있고 `<br>` 등이 깨질 수 있으므로 추가하지 않는 쪽 권장.
- 빈 변경 이력 카드의 정확한 CSS 클래스/마크업: 기존 스타일 클래스 활용.

## Deferred Ideas

- 언어팩 폴백 묵시적 실패 — Phase 4 이후
- 클립보드 레거시 폴백 제거 — 이 phase 범위 밖
- PERF 이슈 (DOM 재생성, 페이지네이션) — v2 요구사항
