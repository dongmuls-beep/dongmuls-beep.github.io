---
phase: 3
plan: A
type: execute
wave: 1
depends_on: []
files_modified:
  - script.js
autonomous: true
requirements:
  - SEC-01
  - SEC-02
must_haves:
  truths:
    - "applyTranslations()의 el.innerHTML = translated 라인에 의도적 HTML임을 명시하는 주석이 있다"
    - "renderTable() line 872의 row.innerHTML은 모든 외부 데이터 값에 escapeHtml()을 적용하고 있다"
    - "renderChangelog() line 1092의 card.innerHTML은 month, updatedAt, change 필드 모두에 escapeHtml()을 적용하고 있다"
    - "getTranslation() 반환값을 직접 사용하는 innerHTML 위치(loading/error 메시지)는 현행 유지 — 번역 JSON은 시스템 통제 소스"
    - "`innerHTML = ''`(DOM 클리어) 패턴은 보안 무관 — 현행 유지"
  artifacts:
    - path: "script.js"
      provides: "innerHTML 감사 완료 + applyTranslations 주석"
      contains: "SECURITY: intentional HTML"
  key_links:
    - from: "applyTranslations() line 308"
      to: "i18n/*.json"
      via: "getTranslation() → el.innerHTML"
      pattern: "SECURITY.*intentional HTML"
    - from: "renderTable() line 872"
      to: "escapeHtml()"
      via: "row.innerHTML template literal"
      pattern: "escapeHtml\\(code\\)"
    - from: "renderChangelog() line 1092"
      to: "escapeHtml()"
      via: "card.innerHTML — month/updatedAt pre-escaped at lines 1071-1072"
      pattern: "escapeHtml\\(String\\(entry\\.month"
---

<objective>
`script.js` 내 모든 `innerHTML` 사용 위치를 전수 감사하고, 외부 데이터 렌더링 위치의 보안 상태를 분류·문서화한다.

Purpose: SEC-01(escapeHtml 일관 적용)과 SEC-02(텍스트 전용 위치는 textContent 사용)를 충족한다. 코드 감사 결과 외부 데이터를 다루는 핵심 렌더링 위치(renderTable line 872, renderChangelog line 1092)는 이미 escapeHtml()을 완전 적용 중이다. 유일하게 필요한 변경은 applyTranslations()의 의도적 HTML 주석 추가다.

Output: 주석이 추가된 script.js, innerHTML 감사 결과 문서화 (이 PLAN의 verification 섹션)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/03-보안-및-버그-수정/03-CONTEXT.md
@.planning/codebase/CONCERNS.md

<interfaces>
<!-- 감사 대상 innerHTML 위치 전체 목록 (현재 script.js 기준) -->
<!--
Line 308  — applyTranslations(): el.innerHTML = translated
             → i18n JSON에 의도적 HTML(<br>, <strong>) 포함. D-01: 주석 추가, 로직 유지.

Line 618  — fetchData(): tbody.innerHTML = `...\${getTranslation("table_loading")}...`
             → getTranslation() 반환값. D-03: 통제 소스, 현행 유지.

Line 672  — fetchData() catch: tbody.innerHTML = `...\${getTranslation("table_error")}...`
             → getTranslation() 반환값. D-03: 현행 유지.

Line 750  — renderCategoryTabs(): tabsContainer.innerHTML = ""
             → DOM 클리어. 데이터 없음. 보안 무관.

Line 756  — renderCategoryTabs(): tabsContainer.innerHTML = ""
             → DOM 클리어. 보안 무관.

Line 833  — renderTable(): tbody.innerHTML = ""
             → DOM 클리어. 보안 무관.

Line 836  — renderTable(): tbody.innerHTML = `...\${getTranslation("table_empty")}...`
             → getTranslation() 반환값. D-03: 현행 유지.

Line 872  — renderTable(): row.innerHTML = `...`
             → 외부 데이터(ETF JSON). escapeHtml() 이미 전체 적용 중.
               code, name, getTranslation() 키 모두 escapeHtml() 래핑됨. D-02: 확인 완료.

Line 1044 — renderChangelog(): container.innerHTML = `...\${getTranslation("changelog_loading")}...`
             → D-03: 현행 유지.

Line 1054 — renderChangelog(): container.innerHTML = `...\${getTranslation("changelog_empty")}...`
             → D-03: 현행 유지.

Line 1065 — renderChangelog(): container.innerHTML = ""
             → DOM 클리어. 보안 무관.

Line 1092 — renderChangelog(): card.innerHTML = `...`
             → 외부 데이터(changelog JSON). month, updatedAt은 lines 1071-1072에서
               escapeHtml()로 미리 이스케이핑. rowsHtml의 change 필드도 전부 escapeHtml().
               thead의 getTranslation() 호출은 통제 소스. D-02: 확인 완료.

Line 1117 — renderChangelog() catch: container.innerHTML = `...\${getTranslation("changelog_error")}...`
             → D-03: 현행 유지.
-->

<!-- escapeHtml() 구현 (script.js:1345) -->
```javascript
function escapeHtml(raw) {
    return String(raw)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
```

<!-- applyTranslations() 현재 코드 (script.js:303-319) -->
```javascript
function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const translated = getTranslation(key);
        if (translated && translated !== key) {
            el.innerHTML = translated; // ← 이 줄에 주석 추가 대상
        }
    });
    // ...
}
```
</interfaces>
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| changelog JSON → DOM | 외부 서버(GAS)에서 수신한 ETF 변경 이력 데이터가 card.innerHTML에 삽입됨 |
| ETF data JSON → DOM | 외부 서버(GAS)에서 수신한 ETF 수수료 데이터가 row.innerHTML에 삽입됨 |
| i18n JSON → DOM | 로컬 번역 파일에서 로드된 번역 문자열이 el.innerHTML에 삽입됨 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03A-01 | Tampering | changelog JSON → card.innerHTML (line 1092) | mitigate | escapeHtml()이 month, updatedAt, 모든 change 필드에 적용됨 (lines 1071-1072, 1083-1087). 감사 완료. |
| T-03A-02 | Tampering | ETF data JSON → row.innerHTML (line 872) | mitigate | escapeHtml()이 code, name, 모든 data-label 속성에 적용됨. 감사 완료. |
| T-03A-03 | Tampering | i18n JSON → el.innerHTML (line 308) | accept | 번역 JSON은 시스템 통제 소스(로컬 파일). 의도적 HTML(<br>, <strong>) 포함 — textContent 전환 불가. 주석으로 의도 명시. |
| T-03A-04 | Tampering | getTranslation() → tbody/container.innerHTML | accept | 로딩/에러 메시지는 getTranslation() 반환값. 번역 JSON은 시스템 통제 소스. escapeHtml() 추가 시 <br> 깨짐 — 현행 유지. |
| T-03A-05 | Information Disclosure | DOM 클리어 innerHTML = "" | accept | 데이터 없음. 보안 위험 없음. |
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: innerHTML 전수 감사 및 applyTranslations 주석 추가</name>
  <files>script.js</files>

  <read_first>
  - script.js lines 303-319 (applyTranslations 전체)
  - script.js lines 610-680 (fetchData — loading/error innerHTML)
  - script.js lines 745-760 (renderCategoryTabs — DOM 클리어)
  - script.js lines 829-884 (renderTable — row.innerHTML)
  - script.js lines 1040-1120 (renderChangelog — card.innerHTML)
  - script.js lines 1345-1352 (escapeHtml 구현 확인)
  </read_first>

  <action>
  **Step 1 — 감사 수행 (변경 없음 위치 확인)**

  아래 위치들은 이미 안전하거나 현행 유지 결정이 내려졌으므로 수정하지 않는다:
  - Lines 618, 672, 836, 1044, 1054, 1117: `getTranslation()` 반환값 → D-03 현행 유지
  - Lines 750, 756, 833, 1065: `= ""` DOM 클리어 → 보안 무관
  - Line 872: `row.innerHTML` → escapeHtml() 완전 적용 확인 (code, name, data-label 모두)
  - Line 1092: `card.innerHTML` → month/updatedAt lines 1071-1072에서 escapeHtml() pre-escape 확인, change 필드 lines 1083-1087 escapeHtml() 확인

  **Step 2 — applyTranslations() 주석 추가 (line 308 근방)**

  현재 코드:
  ```javascript
  if (translated && translated !== key) {
      el.innerHTML = translated;
  }
  ```

  수정 후 코드:
  ```javascript
  if (translated && translated !== key) {
      // SECURITY: innerHTML is intentional — i18n JSON contains deliberate HTML
      // (e.g., <br>, <strong>) that must render as markup. Source is
      // system-controlled (local i18n/*.json files), not user input. (D-01)
      el.innerHTML = translated;
  }
  ```

  주석을 `el.innerHTML = translated;` 바로 위 줄(들)에 삽입한다. 들여쓰기는 기존 코드의 들여쓰기(공백 12칸)와 맞춘다.

  **중요:** 로직을 변경하지 않는다. 주석만 추가한다.
  </action>

  <acceptance_criteria>
  1. `grep -n "SECURITY.*intentional HTML" script.js` 결과가 정확히 1줄을 출력한다 (line 308 근방).
  2. `grep -n "el.innerHTML = translated" script.js` 결과가 정확히 1줄을 출력한다 (로직 미변경).
  3. `grep -n "escapeHtml" script.js` 결과에 line 872와 line 1071, 1072, 1083, 1084, 1085, 1086, 1087 (±5줄 허용) 근방이 모두 포함된다.
  4. `grep -c "innerHTML" script.js` 결과가 변경 전과 동일하다 (새 innerHTML 추가 없음).
  5. applyTranslations() 함수가 주석 추가 후에도 동일하게 동작한다 (브라우저에서 번역이 정상 적용됨).
  </acceptance_criteria>

  <done>
  - script.js line 308 근방에 D-01 주석 3줄이 삽입됨
  - 전체 innerHTML 위치(13개) 감사 완료, 누락된 escapeHtml() 위치 없음 확인
  - 외부 데이터 렌더링 위치(line 872, 1092) escapeHtml() 완전 적용 확인됨
  - getTranslation() innerHTML 위치(lines 618, 672, 836, 1044, 1054, 1117) D-03 근거로 현행 유지
  - DOM 클리어 innerHTML 위치(lines 750, 756, 833, 1065) 보안 무관 확인됨
  </done>
</task>

</tasks>

<verification>
SEC-01 검증:
```
grep -n "escapeHtml" script.js
```
→ line 872(renderTable row.innerHTML)와 lines 1071-1072, 1083-1087(renderChangelog card.innerHTML)에 escapeHtml() 호출이 확인된다.

SEC-02 검증:
```
grep -n "innerHTML" script.js | grep -v "escapeHtml\|getTranslation\|= \"\"\|= ''\|SECURITY\|<!--"
```
→ 외부 데이터를 직접(이스케이핑 없이) 삽입하는 innerHTML 할당이 없어야 한다. 결과가 비어있거나, 결과가 있다면 모두 D-01/D-02/D-03 결정의 근거가 있는 위치여야 한다.

주석 검증:
```
grep -n "SECURITY.*intentional HTML" script.js
```
→ 정확히 1줄 출력.
</verification>

<success_criteria>
- applyTranslations() line 308 근방에 SECURITY 주석 3줄 존재
- 전체 innerHTML 위치 13개 감사 완료 — 누락 escapeHtml() 없음
- SEC-01: 외부 데이터 렌더링 위치(line 872, 1092) escapeHtml() 완전 적용 확인
- SEC-02: 순수 텍스트만 다루는 innerHTML 위치는 현재 없음 (line 308은 의도적 HTML, 나머지는 getTranslation() 또는 DOM 클리어)
</success_criteria>

<output>
완료 후 `.planning/phases/03-보안-및-버그-수정/03-A-SUMMARY.md` 를 생성한다.
</output>
