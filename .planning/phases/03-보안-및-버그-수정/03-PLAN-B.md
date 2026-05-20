---
phase: 3
plan: B
type: execute
wave: 1
depends_on: []
files_modified:
  - script.js
autonomous: true
requirements:
  - BUG-01
must_haves:
  truths:
    - "네비게이션이 열린 상태(nav-open)에서 스크롤해도 헤더에 header-hidden 클래스가 추가되지 않는다"
    - "네비게이션이 닫힌 상태에서 아래로 스크롤 시 기존 header-hidden 동작이 그대로 유지된다"
    - "RAF 콜백 최상단에서 nav-open 체크 후 early return — lastScroll도 업데이트되지 않는다"
  artifacts:
    - path: "script.js"
      provides: "initSmartHeader() BUG-01 수정"
      contains: "nav-open"
  key_links:
    - from: "scroll 이벤트 → requestAnimationFrame 콜백"
      to: "document.body.classList.contains(\"nav-open\")"
      via: "콜백 최상단 early return"
      pattern: "nav-open.*return"
---

<objective>
`initSmartHeader()`의 `requestAnimationFrame` 콜백 최상단에 `nav-open` 상태 체크를 추가하여, 모바일 네비게이션이 열린 동안 헤더 숨김 글리치를 방지한다.

Purpose: BUG-01 충족. 현재 버그: nav가 열린 상태에서 스크롤하면 `else` 분기가 실행되어 `header-hidden`이 제거되고 `lastScroll`이 업데이트된다. early return으로 콜백 전체를 스킵한다.

Output: 수정된 script.js — RAF 콜백 최상단에 early return 1줄 추가.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-보안-및-버그-수정/03-CONTEXT.md

<interfaces>
<!-- initSmartHeader() 현재 코드 (script.js:165-186) -->
```javascript
function initSmartHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    let lastScroll = window.scrollY || document.documentElement.scrollTop;
    let rafPending = false;

    window.addEventListener("scroll", () => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            const currentScroll = window.scrollY || document.documentElement.scrollTop;
            if (currentScroll > lastScroll && currentScroll > 60 && !document.body.classList.contains("nav-open")) {
                header.classList.add("header-hidden");
            } else {
                header.classList.remove("header-hidden");
            }
            lastScroll = currentScroll <= 0 ? 0 : currentScroll;
            rafPending = false;
        });
    }, { passive: true });
}
```

<!-- 버그 원인 분석 (D-05) -->
<!--
현재 조건문의 문제:
- nav-open이 true면 if 조건 false → else 분기 실행
- else에서 header.classList.remove("header-hidden") 실행 → 헤더 강제 표시
- lastScroll도 업데이트됨 → nav 닫힌 후 스크롤 방향 계산이 틀어짐

수정 방법 (D-04):
- RAF 콜백 최상단에 early return 추가
- nav-open 동안은 header-hidden과 lastScroll 모두 건드리지 않음
-->

<!-- 수정 후 목표 코드 -->
```javascript
requestAnimationFrame(() => {
    // BUG-01: skip scroll handling while mobile nav is open (D-04)
    if (document.body.classList.contains("nav-open")) return;

    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    if (currentScroll > lastScroll && currentScroll > 60) {
        header.classList.add("header-hidden");
    } else {
        header.classList.remove("header-hidden");
    }
    lastScroll = currentScroll <= 0 ? 0 : currentScroll;
    rafPending = false;
});
```

주의:
1. rafPending = false를 early return 전에 실행해야 하는지 검토:
   early return 시 rafPending이 true로 남으면 이후 scroll 이벤트가 무시됨.
   → early return 전에 `rafPending = false;`를 실행하거나,
     early return 라인을 `if (...) { rafPending = false; return; }` 형태로 작성.
2. 기존 if 조건에서 `!document.body.classList.contains("nav-open")` 부분은 제거한다
   (early return이 이를 대체).
</interfaces>
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| DOM classList → 스크롤 핸들러 | classList.contains("nav-open") 읽기 — 내부 DOM 상태, 외부 입력 없음 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03B-01 | Tampering | classList.contains("nav-open") 체크 | accept | DOM 상태 읽기. 외부 입력 없음. 공격 벡터 없음. |
| T-03B-02 | Denial of Service | rafPending 플래그 누출 | accept | early return 전 rafPending = false 처리로 스크롤 핸들러 동결 방지. 구현 시 확인 필요. |
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: initSmartHeader RAF 콜백에 nav-open early return 추가</name>
  <files>script.js</files>

  <read_first>
  - script.js lines 165-186 (initSmartHeader 전체 함수)
  </read_first>

  <action>
  `requestAnimationFrame(() => {` 콜백의 첫 번째 문장으로 early return을 추가한다.

  **정확한 수정 위치:** script.js line 175 (`requestAnimationFrame(() => {`) 바로 다음 줄

  **수정 전 (lines 175-184):**
  ```javascript
          requestAnimationFrame(() => {
              const currentScroll = window.scrollY || document.documentElement.scrollTop;
              if (currentScroll > lastScroll && currentScroll > 60 && !document.body.classList.contains("nav-open")) {
                  header.classList.add("header-hidden");
              } else {
                  header.classList.remove("header-hidden");
              }
              lastScroll = currentScroll <= 0 ? 0 : currentScroll;
              rafPending = false;
          });
  ```

  **수정 후:**
  ```javascript
          requestAnimationFrame(() => {
              // BUG-01: skip scroll handling while mobile nav is open (D-04)
              if (document.body.classList.contains("nav-open")) {
                  rafPending = false;
                  return;
              }
              const currentScroll = window.scrollY || document.documentElement.scrollTop;
              if (currentScroll > lastScroll && currentScroll > 60) {
                  header.classList.add("header-hidden");
              } else {
                  header.classList.remove("header-hidden");
              }
              lastScroll = currentScroll <= 0 ? 0 : currentScroll;
              rafPending = false;
          });
  ```

  **변경 사항 요약:**
  1. RAF 콜백 최상단에 nav-open 체크 + early return 블록 추가 (rafPending = false 포함)
  2. 기존 if 조건에서 `&& !document.body.classList.contains("nav-open")` 제거 (early return이 대체)
  3. 들여쓰기는 기존 코드와 동일하게 유지 (공백 12칸)
  </action>

  <acceptance_criteria>
  1. `grep -n "nav-open" script.js` 결과에 early return 체크가 포함된다:
     출력 예시: `176:              if (document.body.classList.contains("nav-open")) {`
  2. `grep -n "nav-open" script.js` 결과에 기존 if 조건의 `!document.body.classList.contains("nav-open")` 패턴이 없다 (제거 확인).
  3. `grep -n "rafPending = false" script.js` 결과가 2줄 이상이다 (early return 경로와 정상 경로 모두).
  4. `grep -n "BUG-01" script.js` 결과가 1줄 이상이다 (주석 존재 확인).
  5. script.js를 브라우저에서 로드 시 JavaScript 파싱 오류가 없다.
  </acceptance_criteria>

  <done>
  - RAF 콜백 최상단에 `if (document.body.classList.contains("nav-open")) { rafPending = false; return; }` 블록 존재
  - 기존 if 조건에서 `!document.body.classList.contains("nav-open")` 부분 제거됨
  - rafPending = false가 early return 경로와 정상 경로 양쪽에 존재
  - nav-open 상태에서 스크롤 시 header-hidden 클래스와 lastScroll이 변경되지 않음
  </done>
</task>

</tasks>

<verification>
BUG-01 수동 검증 (모바일 or 브라우저 DevTools 모바일 에뮬레이션):
1. 사이트를 모바일 뷰포트(375px)로 열기
2. 햄버거 메뉴 클릭 → nav-open 클래스가 body에 추가됨 확인
3. 메뉴가 열린 상태에서 페이지 스크롤
4. 헤더에 `header-hidden` 클래스가 추가되지 않아야 함 (헤더 숨김 없음)
5. 메뉴 닫기 → 스크롤 방향이 정상 감지됨 확인

코드 검증:
```
grep -n "nav-open" script.js
```
→ early return 체크가 RAF 콜백 최상단에 위치함 (if 조건 내 `!...contains` 패턴 없음).

```
grep -n "rafPending = false" script.js
```
→ 2개 이상 (early return + 정상 종료).
</verification>

<success_criteria>
- script.js RAF 콜백 최상단에 nav-open early return 블록 존재
- 기존 if 조건의 `!document.body.classList.contains("nav-open")` 제거됨
- rafPending = false가 early return 경로 포함 모든 종료 경로에 존재
- BUG-01: 모바일 네비 열림 상태에서 스크롤 시 header-hidden 글리치 없음
</success_criteria>

<output>
완료 후 `.planning/phases/03-보안-및-버그-수정/03-B-SUMMARY.md` 를 생성한다.
</output>
