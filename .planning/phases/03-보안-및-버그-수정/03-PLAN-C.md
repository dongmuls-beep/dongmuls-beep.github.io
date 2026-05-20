---
phase: 3
plan: C
type: execute
wave: 1
depends_on: []
files_modified:
  - script.js
autonomous: true
requirements:
  - BUG-02
must_haves:
  truths:
    - "changes.length === 0인 변경 이력 항목 렌더링 시 <thead>가 DOM에 나타나지 않는다"
    - "changes.length === 0일 때 테이블 블록 전체가 생략되고 <p class=\"changelog-no-changes\"> 요소만 렌더링된다"
    - "changes.length > 0인 항목은 기존과 동일하게 <thead>를 포함한 전체 테이블로 렌더링된다"
  artifacts:
    - path: "script.js"
      provides: "renderChangelog() BUG-02 수정"
      contains: "changelog-no-changes"
  key_links:
    - from: "renderChangelog() line 1075 (changes.length === 0 분기)"
      to: "card.innerHTML template"
      via: "조건부 테이블 블록 렌더링"
      pattern: "changes\\.length === 0"
---

<objective>
`renderChangelog()`에서 `changes.length === 0`인 경우 테이블 블록 전체를 건너뛰고 `<p>` 메시지만 렌더링하도록 수정한다.

Purpose: BUG-02 충족. 현재 버그: 빈 changes 배열 시 `rowsHtml`이 colspan td 하나뿐이지만 `<thead>`가 그대로 렌더링되어 빈 헤더 행이 노출된다.

Output: 수정된 script.js — `card.innerHTML` 템플릿에서 changes가 없을 때 테이블 블록을 `<p>` 단독으로 교체.
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
<!-- renderChangelog() 현재 코드 (script.js:1067-1113) -->
```javascript
sorted.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "changelog-card";

    const month = escapeHtml(String(entry.month || ""));
    const updatedAt = escapeHtml(String(entry.updatedAt || ""));
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    const rowsHtml = changes.length === 0
        ? `<tr><td colspan="5">${escapeHtml(getTranslation("changelog_no_changes"))}</td></tr>`
        : changes.map((change) => {
            const beforeValue = formatChangeValue(change.before);
            const afterValue = formatChangeValue(change.after);

            return `
                <tr>
                    <td>${escapeHtml(String(change.code || "-"))}</td>
                    <td>${escapeHtml(String(change.name || "-"))}</td>
                    <td>${escapeHtml(String(change.field || "-"))}</td>
                    <td class="text-right">${beforeValue}</td>
                    <td class="text-right">${afterValue}</td>
                </tr>
            `;
        }).join("");

    card.innerHTML = `
        <header class="changelog-head">
            <h3>${month}</h3>
            <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
        </header>
        <div class="table-container">
            <table class="data-table changelog-table">
                <thead>
                    <tr>
                        <th>${getTranslation("table_code")}</th>
                        <th>${getTranslation("table_name")}</th>
                        <th>${getTranslation("changelog_field")}</th>
                        <th>${getTranslation("changelog_before")}</th>
                        <th>${getTranslation("changelog_after")}</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
    `;

    container.appendChild(card);
});
```

<!-- 버그 원인 (D-06, D-07) -->
<!--
changes.length === 0일 때:
- rowsHtml = <tr><td colspan="5">...</td></tr> (단일 행)
- card.innerHTML에는 <thead>가 그대로 포함됨 → 빈 헤더 행 표시

수정 방향 (D-07):
- changes.length === 0이면 테이블 블록 자체를 건너뛰고 <p> 메시지만 렌더링
- changes.length > 0이면 기존처럼 <thead>를 포함한 전체 테이블 렌더링
-->

<!-- 수정 후 목표 구조 -->
```javascript
// changes.length === 0일 때 card.innerHTML에 들어갈 내용:
`<header class="changelog-head">
    <h3>${month}</h3>
    <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
</header>
<p class="changelog-no-changes">${escapeHtml(getTranslation("changelog_no_changes"))}</p>`

// changes.length > 0일 때 card.innerHTML에 들어갈 내용:
`<header class="changelog-head">
    <h3>${month}</h3>
    <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
</header>
<div class="table-container">
    <table class="data-table changelog-table">
        <thead>
            <tr>
                <th>${getTranslation("table_code")}</th>
                ...
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
    </table>
</div>`
```
</interfaces>
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| changelog JSON → card.innerHTML | 외부 서버에서 수신한 데이터. 조건부 렌더링 로직 변경만 수행. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03C-01 | Tampering | changelog_no_changes 번역 → innerHTML | accept | getTranslation() 반환값. 번역 JSON은 시스템 통제 소스. escapeHtml() 추가 적용 가능 (선택). |
| T-03C-02 | Tampering | card.innerHTML 조건 분기 | accept | 조건부 렌더링 로직만 변경. 데이터 이스케이핑은 기존 escapeHtml() 유지. |
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: renderChangelog() 빈 changes 처리 — 테이블 블록 건너뛰고 p 단독 렌더링</name>
  <files>script.js</files>

  <read_first>
  - script.js lines 1067-1114 (renderChangelog forEach 블록 전체 — entry 처리 로직)
  - script.js lines 1075-1090 (rowsHtml 생성 분기)
  - script.js lines 1092-1111 (card.innerHTML 템플릿)
  </read_first>

  <action>
  `sorted.forEach((entry) => { ... })` 블록 내에서 `card.innerHTML` 할당 부분을 재구성한다.

  **변경 전 — rowsHtml 계산 + 단일 card.innerHTML:**
  ```javascript
  const rowsHtml = changes.length === 0
      ? `<tr><td colspan="5">${escapeHtml(getTranslation("changelog_no_changes"))}</td></tr>`
      : changes.map((change) => {
          /* ... */
      }).join("");

  card.innerHTML = `
      <header class="changelog-head">
          <h3>${month}</h3>
          <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
      </header>
      <div class="table-container">
          <table class="data-table changelog-table">
              <thead>
                  <tr>
                      <th>${getTranslation("table_code")}</th>
                      <th>${getTranslation("table_name")}</th>
                      <th>${getTranslation("changelog_field")}</th>
                      <th>${getTranslation("changelog_before")}</th>
                      <th>${getTranslation("changelog_after")}</th>
                  </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
          </table>
      </div>
  `;
  ```

  **변경 후 — changes.length 기반 조건 분기:**
  ```javascript
  if (changes.length === 0) {
      // BUG-02: skip table entirely when no changes — avoids orphaned thead (D-06, D-07)
      card.innerHTML = `
          <header class="changelog-head">
              <h3>${month}</h3>
              <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
          </header>
          <p class="changelog-no-changes">${escapeHtml(getTranslation("changelog_no_changes"))}</p>
      `;
  } else {
      const rowsHtml = changes.map((change) => {
          const beforeValue = formatChangeValue(change.before);
          const afterValue = formatChangeValue(change.after);

          return `
              <tr>
                  <td>${escapeHtml(String(change.code || "-"))}</td>
                  <td>${escapeHtml(String(change.name || "-"))}</td>
                  <td>${escapeHtml(String(change.field || "-"))}</td>
                  <td class="text-right">${beforeValue}</td>
                  <td class="text-right">${afterValue}</td>
              </tr>
          `;
      }).join("");

      card.innerHTML = `
          <header class="changelog-head">
              <h3>${month}</h3>
              <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
          </header>
          <div class="table-container">
              <table class="data-table changelog-table">
                  <thead>
                      <tr>
                          <th>${getTranslation("table_code")}</th>
                          <th>${getTranslation("table_name")}</th>
                          <th>${getTranslation("changelog_field")}</th>
                          <th>${getTranslation("changelog_before")}</th>
                          <th>${getTranslation("changelog_after")}</th>
                      </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
              </table>
          </div>
      `;
  }
  ```

  **들여쓰기:** 기존 코드의 들여쓰기(공백 12칸)와 맞춘다.

  **중요:** `container.appendChild(card);`는 변경하지 않는다 (if/else 블록 밖에 위치).
  </action>

  <acceptance_criteria>
  1. `grep -n "changelog-no-changes" script.js` 결과에 `<p class="changelog-no-changes">` 패턴이 포함된다.
  2. `grep -n "BUG-02" script.js` 결과가 1줄 이상이다 (주석 존재).
  3. `grep -n "changes.length === 0" script.js` 결과가 존재한다 (if 조건문으로).
  4. changes.length === 0 분기의 card.innerHTML에 `<thead>` 또는 `<table>` 패턴이 없다:
     — script.js의 해당 분기를 읽었을 때 `<p class="changelog-no-changes">` 이후 테이블 관련 태그가 없어야 한다.
  5. changes.length > 0 분기에는 `<thead>`가 존재한다 (기존 테이블 구조 유지).
  6. `grep -n "rowsHtml" script.js` 결과에 `changes.length === 0` 삼항 분기가 없다 (제거 확인).
  </acceptance_criteria>

  <done>
  - changes.length === 0 시: `<p class="changelog-no-changes">` 단독 렌더링, 테이블 블록 없음
  - changes.length > 0 시: 기존과 동일하게 `<thead>` 포함 전체 테이블 렌더링
  - BUG-02 주석 존재
  - escapeHtml() 적용 유지 (changelog_no_changes 번역값에 escapeHtml() 추가 적용)
  </done>
</task>

</tasks>

<verification>
BUG-02 코드 검증:
```
grep -n "changelog-no-changes" script.js
```
→ `<p class="changelog-no-changes">` 패턴이 존재한다.

```
grep -n "changes.length === 0" script.js
```
→ if 조건문으로 존재한다 (삼항 연산자 rowsHtml 분기는 없음).

BUG-02 수동 검증:
1. `changes: []`인 항목이 포함된 changelog JSON 사용 (또는 로컬에서 테스트 데이터 준비)
2. 변경 이력 페이지에서 해당 항목 확인
3. 테이블 헤더(코드 / 종목명 / 변경 항목 / 변경 전 / 변경 후)가 표시되지 않아야 함
4. `<p class="changelog-no-changes">` 요소만 표시됨 확인
5. changes가 있는 다른 항목은 정상적으로 테이블 + 헤더가 표시됨 확인
</verification>

<success_criteria>
- changes.length === 0인 카드: 테이블 없음, `<p class="changelog-no-changes">` 단독
- changes.length > 0인 카드: 기존과 동일하게 `<thead>` 포함 전체 테이블
- BUG-02: 빈 변경 배열 시 테이블 헤더 렌더링 안 됨
</success_criteria>

<output>
완료 후 `.planning/phases/03-보안-및-버그-수정/03-C-SUMMARY.md` 를 생성한다.
</output>
