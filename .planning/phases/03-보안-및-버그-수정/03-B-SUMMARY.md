---
phase: 03-보안-및-버그-수정
plan: B
subsystem: ui
tags: [vanilla-js, scroll, requestAnimationFrame, mobile-nav, header]

# Dependency graph
requires:
  - phase: 03-A
    provides: XSS innerHTML 감사 및 escapeHtml 적용 완료
provides:
  - initSmartHeader() BUG-01 수정 — nav-open early return으로 모바일 헤더 숨김 글리치 방지
affects: [03-C, future-mobile-nav-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RAF 콜백 최상단 guard clause: nav 상태 체크 후 rafPending 리셋 후 return"

key-files:
  created: []
  modified:
    - script.js

key-decisions:
  - "RAF 콜백 early return 전에 rafPending = false 실행 — 스크롤 핸들러 동결 방지 (T-03B-02)"
  - "기존 if 조건의 !nav-open 부분 제거 — early return이 완전히 대체하므로 중복 제거"

patterns-established:
  - "Guard clause pattern: if (blocking-condition) { reset-flags; return; } — 상태 플래그는 early return 전에 반드시 리셋"

requirements-completed: [BUG-01]

# Metrics
duration: 5min
completed: 2026-05-20
---

# Phase 3 Plan B: initSmartHeader BUG-01 Summary

**RAF 콜백 최상단 nav-open guard clause 추가로 모바일 네비 열림 상태에서 header-hidden 글리치 및 lastScroll 오염 방지**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-20T06:41:38Z
- **Completed:** 2026-05-20T06:46:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `initSmartHeader()` RAF 콜백 최상단에 `nav-open` guard clause 추가 (BUG-01 충족)
- `rafPending = false`를 early return 전에 실행하여 스크롤 핸들러 동결 방지 (T-03B-02 대응)
- 기존 if 조건의 `!document.body.classList.contains("nav-open")` 중복 조건 제거

## Task Commits

Each task was committed atomically:

1. **Task 1: initSmartHeader RAF 콜백에 nav-open early return 추가** - `cee1d63` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `script.js` — initSmartHeader() RAF 콜백 수정: nav-open early return + rafPending 리셋 추가, 기존 if 조건 정리

## Decisions Made

- rafPending = false를 early return 라인 앞에 배치 — nav-open 상태에서 스크롤 이벤트 후 rafPending이 true로 남으면 이후 모든 scroll 이벤트가 무시됨. early return 전 리셋 필수.
- 기존 if 조건의 `!document.body.classList.contains("nav-open")` 제거 — early return이 해당 가드를 완전히 대체. 조건 중복 유지 시 코드 가독성 저하.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BUG-01 완료. Phase 3 Plan C (BUG-02: 빈 변경 이력 테이블 처리) 실행 가능.
- script.js renderChangelog() 함수의 changes.length === 0 분기 처리가 다음 대상.

---
*Phase: 03-보안-및-버그-수정*
*Completed: 2026-05-20*
