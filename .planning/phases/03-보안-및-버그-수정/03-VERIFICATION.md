---
phase: 03-보안-및-버그-수정
verified: 2026-05-20T07:30:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "모바일 뷰포트(375px)에서 햄버거 메뉴를 열고, 열린 상태에서 스크롤한다"
    expected: "헤더에 header-hidden 클래스가 추가되지 않는다. 메뉴를 닫은 후 아래로 스크롤하면 헤더가 정상적으로 숨겨진다."
    why_human: "DOM classList 상태와 scroll 이벤트 타이밍은 브라우저 에뮬레이션 없이 프로그래매틱 검증 불가"
  - test: "변경 이력 페이지에서 changes 배열이 비어있는 항목을 확인한다"
    expected: "테이블과 thead가 표시되지 않고, <p class=\"changelog-no-changes\"> 요소만 렌더링된다. changes가 있는 항목은 정상적으로 thead를 포함한 테이블이 렌더링된다."
    why_human: "실제 changelog JSON 응답 데이터 없이는 두 렌더링 분기를 동시에 확인할 수 없음"
---

# Phase 3: 보안 및 버그 수정 Verification Report

**Phase Goal:** XSS 취약점을 줄이고, 알려진 UI 버그를 수정한다.
**Verified:** 2026-05-20T07:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | applyTranslations()의 el.innerHTML = translated 라인에 의도적 HTML임을 명시하는 주석이 있다 | VERIFIED | script.js line 313-315: `// SECURITY: innerHTML is intentional — i18n JSON contains deliberate HTML` |
| 2 | renderTable() row.innerHTML은 모든 외부 데이터 값에 escapeHtml()을 적용하고 있다 | VERIFIED | script.js lines 881-890: code, name, 모든 data-label 속성에 escapeHtml() 래핑 확인. formatPercent/AUM/Volume은 수치 계산 반환값(공격 벡터 없음) |
| 3 | renderChangelog() card.innerHTML은 month, updatedAt, change 필드 모두에 escapeHtml()을 적용하고 있다 | VERIFIED | script.js lines 1079-1080: month/updatedAt pre-escape; lines 1099-1101: change.code/name/field escapeHtml() |
| 4 | getTranslation() 반환값을 직접 사용하는 innerHTML 위치(loading/error 메시지)는 현행 유지된다 | VERIFIED | lines 626, 680, 844, 1052, 1062, 1134: 모두 getTranslation() 반환값 직접 사용 — 시스템 통제 소스 |
| 5 | 네비게이션이 열린 상태(nav-open)에서 RAF 콜백 최상단에서 early return하며 rafPending도 false로 리셋된다 | VERIFIED | script.js lines 176-180: `if (document.body.classList.contains("nav-open")) { rafPending = false; return; }` |
| 6 | 기존 if 조건에서 `!document.body.classList.contains("nav-open")` 부분이 제거되었다 | VERIFIED | grep으로 해당 패턴 없음 확인. line 182: `if (currentScroll > lastScroll && currentScroll > 60)` — nav-open 조건 없음 |
| 7 | changes.length === 0인 경우 테이블 블록이 생략되고 `<p class="changelog-no-changes">` 만 렌더링된다 | VERIFIED | script.js lines 1083-1091: if 분기에서 카드 헤더 + p 단독 렌더링; else 분기(line 1092-1128)에서만 thead 포함 테이블 |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `script.js` | innerHTML 감사 완료 + applyTranslations SECURITY 주석 (SEC-01, SEC-02) | VERIFIED | line 313: SECURITY 주석 존재; 외부 데이터 렌더링 13개 위치 전수 확인 |
| `script.js` | initSmartHeader() BUG-01 수정 — nav-open guard clause | VERIFIED | lines 176-180: BUG-01 주석 + early return 블록 존재 |
| `script.js` | renderChangelog() BUG-02 수정 — changelog-no-changes p 렌더링 | VERIFIED | lines 1083-1091: changelog-no-changes 클래스 p 태그 존재 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| applyTranslations() line 316 | i18n/*.json | getTranslation() → el.innerHTML | VERIFIED | SECURITY 주석(lines 313-315)이 el.innerHTML = translated 바로 위에 위치 |
| renderTable() line 880 | escapeHtml() | row.innerHTML template literal | VERIFIED | code, name, 모든 data-label 속성 escapeHtml() 래핑 확인 |
| renderChangelog() line 1079 | escapeHtml() | month/updatedAt pre-escape | VERIFIED | lines 1079-1080에서 변수에 미리 이스케이핑 후 템플릿 삽입 |
| renderChangelog() line 1083 | card.innerHTML (조건 분기) | changes.length === 0 if/else | VERIFIED | ternary rowsHtml 제거됨; if 분기에 table/thead 없음 확인 |
| scroll event → RAF callback | document.body.classList.contains("nav-open") | 콜백 최상단 early return | VERIFIED | line 177: if 최상단 위치; rafPending = false 포함 (line 178) |

### Data-Flow Trace (Level 4)

이 phase는 렌더링 로직 수정이 주 목적이며, 신규 데이터 소스 연결 없음. 기존 데이터 파이프라인(ETF JSON, changelog JSON → DOM)은 Phase 2에서 검증됨.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| script.js renderTable() row.innerHTML | code, name (외부 ETF JSON) | fetchData() → allData | 기존 파이프라인 (Phase 2 검증) | FLOWING (기존 유지) |
| script.js renderChangelog() card.innerHTML | entry.month, entry.changes | fetchChangelog() | 기존 파이프라인 | FLOWING (기존 유지) |

### Behavioral Spot-Checks

Step 7b: 서버 실행 불필요 — script.js는 브라우저 전용 바닐라 JS. 정적 분석으로 확인 가능한 항목만 검증.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| SECURITY 주석 존재 | grep "SECURITY" script.js | line 313 출력 | PASS |
| BUG-01 주석 존재 | grep "BUG-01" script.js | line 176 출력 | PASS |
| BUG-02 주석 존재 | grep "BUG-02" script.js | line 1084 출력 | PASS |
| rafPending 두 경로 모두 false | grep "rafPending = false" script.js | line 178(early return), line 188(정상 종료) — 2개 | PASS |
| !nav-open 중복 조건 제거 | grep "!document.body.classList.contains.*nav-open" script.js | 0 matches | PASS |
| changelog-no-changes p 태그 | grep "changelog-no-changes" script.js | line 1090 | PASS |
| rowsHtml 삼항 분기 제거 | grep "rowsHtml" script.js | else 블록 내부 2회만 (line 1093, 1124) — 삼항 없음 | PASS |
| el.innerHTML = translated 정확히 1줄 | grep "el.innerHTML = translated" script.js | line 316, 1건 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 03-PLAN-A | script.js 내 사용자 데이터 렌더링 위치 모두 escapeHtml() 일관 적용 | SATISFIED | renderTable() line 880-890, renderChangelog() lines 1079-1080, 1099-1101 escapeHtml() 확인 |
| SEC-02 | 03-PLAN-A | 순수 텍스트 콘텐츠는 innerHTML 대신 textContent 사용 | SATISFIED | 감사 결과 순수 텍스트만 다루는 innerHTML 위치 없음 확인. line 308 applyTranslations는 의도적 HTML(D-01), 나머지는 getTranslation() 또는 DOM 클리어 |
| BUG-01 | 03-PLAN-B | 모바일 네비 열린 상태에서 스크롤 시 헤더 숨김 글리치 수정 | SATISFIED (human verify) | 코드 변경 확인됨(lines 176-180). 실제 동작은 브라우저 테스트 필요 |
| BUG-02 | 03-PLAN-C | 변경 이력 빈 배열 시 테이블 헤더가 렌더링되지 않음 | SATISFIED (human verify) | 코드 변경 확인됨(lines 1083-1128). 실제 렌더링은 브라우저 테스트 필요 |

모든 4개 요구사항(SEC-01, SEC-02, BUG-01, BUG-02)이 Phase 3 Plans A/B/C에 할당됨. 고아 요구사항 없음.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| script.js | 877 | changeHtml에 escapeHtml() 없음 | Info | changeHtml은 diff 수치(toFixed), 리터럴 CSS 클래스명, 리터럴 화살표 문자만 포함 — 외부 데이터 없음. 보안 위험 없음 |
| script.js | 1094-1095 | beforeValue/afterValue에 escapeHtml() 없음 | Info | formatChangeValue()는 number.toFixed(4)+"%" 또는 "-" 반환. 수치 계산 결과만 삽입 — 외부 데이터 비경유 |

두 항목 모두 실제 스텁/취약점 아님 — 외부 사용자 데이터가 escapeHtml 없이 DOM에 삽입되는 경로 없음.

### Human Verification Required

#### 1. BUG-01: 모바일 네비 열림 상태 스크롤 헤더 동작

**Test:** 모바일 뷰포트(375px, 또는 브라우저 DevTools 모바일 에뮬레이션)에서 사이트를 연다. 햄버거 메뉴를 클릭하여 네비게이션을 열고(body에 nav-open 클래스 추가 확인), 메뉴가 열린 상태에서 페이지를 스크롤한다. 메뉴를 닫고 아래로 스크롤한다.

**Expected:** 메뉴가 열린 상태에서 스크롤 시 헤더에 header-hidden 클래스가 추가되지 않는다. 메뉴를 닫은 후 아래로 스크롤하면 정상적으로 header-hidden이 적용된다.

**Why human:** requestAnimationFrame 타이밍, classList 상태 전이, scroll 이벤트 발사 시퀀스는 실제 브라우저 환경 없이 검증 불가.

#### 2. BUG-02: 빈 changes 배열 changelog 카드 렌더링

**Test:** 변경 이력 페이지(changelog)를 열어 `changes: []`인 항목을 확인한다. 없으면 브라우저 DevTools에서 fetchChangelog 응답을 인터셉트하여 빈 changes 항목이 포함된 테스트 데이터를 주입한다.

**Expected:** changes가 없는 카드는 thead/table 없이 `<p class="changelog-no-changes">` 메시지만 표시된다. changes가 있는 카드는 thead를 포함한 전체 테이블이 정상 렌더링된다.

**Why human:** 실제 changelog JSON 응답 데이터 없이는 두 분기 렌더링을 동시에 확인 불가.

### Gaps Summary

gaps 없음 — 7/7 must-haves 모두 코드에서 확인됨.

브라우저 인터랙션 검증(BUG-01 실제 동작, BUG-02 실제 렌더링 분기)만 인간 확인이 필요하다. 정적 코드 분석으로 확인 가능한 모든 항목은 VERIFIED 상태다.

---

_Verified: 2026-05-20T07:30:00Z_
_Verifier: Claude (gsd-verifier)_
