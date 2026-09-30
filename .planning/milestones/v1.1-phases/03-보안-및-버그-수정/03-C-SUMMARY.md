---
phase: 3
plan: C
subsystem: frontend
tags: [bug-fix, rendering, changelog]
dependency_graph:
  requires: []
  provides: [BUG-02]
  affects: [script.js, renderChangelog]
tech_stack:
  added: []
  patterns: [conditional-innerHTML, escapeHtml]
key_files:
  created: []
  modified:
    - script.js
decisions:
  - "D-06/D-07: changes.length === 0 시 테이블 블록 전체 생략, <p> 단독 렌더링"
  - "changelog_no_changes 번역값에 escapeHtml() 추가 적용 (선택 사항 — 적용)"
metrics:
  duration: "54s"
  completed_date: "2026-05-20T06:47:15Z"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 3 Plan C: renderChangelog() 빈 changes 처리 Summary

BUG-02 수정: `changes.length === 0`인 changelog 항목에서 `<thead>`를 포함한 테이블 블록 전체를 생략하고 `<p class="changelog-no-changes">` 단독 렌더링으로 교체.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | renderChangelog() 빈 changes 처리 — 테이블 블록 건너뛰고 p 단독 렌더링 | 5178873 | script.js |

## What Was Built

`renderChangelog()` 내 `sorted.forEach()` 블록에서 `rowsHtml` 삼항 연산자 + 단일 `card.innerHTML` 패턴을 `if/else` 분기로 교체했다.

- **변경 전**: `rowsHtml`이 `changes.length === 0`이면 `<tr><td colspan="5">…</td></tr>` 단일 행을 생성, `card.innerHTML`에 `<thead>` 포함 전체 테이블이 항상 렌더링 → 빈 헤더 행 노출
- **변경 후**:
  - `changes.length === 0`: `card.innerHTML`에 헤더(`<header>`) + `<p class="changelog-no-changes">` 만 렌더링 (테이블 없음)
  - `changes.length > 0`: 기존과 동일하게 `<thead>` 포함 전체 테이블 렌더링

`escapeHtml(getTranslation("changelog_no_changes"))` 적용으로 번역값 이스케이핑도 추가됨.

## Acceptance Criteria Verification

1. `grep -n "changelog-no-changes" script.js` → line 1090: `<p class="changelog-no-changes">` 패턴 존재 ✓
2. `grep -n "BUG-02" script.js` → line 1084: 주석 존재 ✓
3. `grep -n "changes.length === 0" script.js` → line 1083: `if` 조건문으로 존재 ✓
4. `changes.length === 0` 분기에 `<thead>` 또는 `<table>` 없음 ✓
5. `changes.length > 0` 분기에 `<thead>` 존재 (line 1115) ✓
6. `grep -n "rowsHtml" script.js` → `changes.length === 0` 삼항 분기 없음 (rowsHtml은 else 블록 내부에만 존재) ✓

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — 조건부 렌더링 로직만 변경, 새 네트워크 엔드포인트/인증 경로/파일 접근 패턴 없음. T-03C-01/T-03C-02 위협은 기존 `escapeHtml()` 유지로 accept 처리됨.

## Self-Check: PASSED

- `script.js` exists: FOUND
- Commit `5178873` exists: FOUND (`git log --oneline | grep 5178873`)
