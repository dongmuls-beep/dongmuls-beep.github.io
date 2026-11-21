---
phase: 25-finish-verify
plan: 03
subsystem: portfolio
tags: [safe-01, safe-02, notice, disclaimer, backup-status]
requires: [25-01, 25-02]
provides: [pf-notice, pf-backup-status, pf-disclaimer]
affects: [25-04]
key-files:
  modified:
    - portfolio/index.html
    - portfolio.css
    - portfolio/portfolio-view.js
    - tests/test_html_a11y.py
requirements-completed: [SAFE-01, SAFE-02]
metrics:
  completed: 2026-11-21
---

# Phase 25 Plan 03: Notice, backup status and disclaimer on /portfolio/ Summary

Dismissible first-visit storage notice (pf_v1_noticeDismissed, session-only if storage fails), one-shot navigator.storage.persist() after the first successful save with rows, backup age line (never/today/N days/stale with danger border), and an always-visible disclaimer with data as-of date. All text via t() + textContent; single live region #pf-live kept.

## Commits
- 460cf4a feat(25-03): storage notice, persist request, backup age and disclaimer on /portfolio/

## Browser verification (headless Chrome, http.server 8765, stopped afterwards)
1. First visit: notice shown with "이 브라우저에만 저장" - PASS
2. Close hides it, localStorage pf_v1_noticeDismissed == "1", stays hidden after reload - PASS
3. Disclaimer visible with "분배금·분할·병합" and "투자 자문이 아니며" - PASS
4. Add 360750 x1 from 2024-01-02: backup status "아직 백업하지 않았어요.", as-of "데이터 기준일: 2026-11-19." - PASS
5. lastBackup 10 days old: "백업이 오래됐어요. 마지막 백업 10일 전" with class pf-backup-stale - PASS
6. ?lang=en disclaimer contains "not investment advice" - PASS
7. No googlesyndication/googletagmanager/google-analytics resources, no SEVERE console entries - PASS
Script lived in the session scratchpad only; no repo files added.

## Verification
`python -m pytest tests/ -q`: 464 passed; every `tests/*_check.js` passes; innerHTML count in portfolio-view.js is 0; navigator.storage appears once.

## Deviations from Plan
None. Threats T-25-04 (static + browser checks), T-25-05 (only "1" dismisses, textContent only), T-25-06 (setItem in try/catch) mitigated.

## Not covered
navigator.storage.persist() denial path and its persist-denied line not exercised in a browser (headless Chrome grants/ignores); covered only by 25-02 helper tests.

## Self-Check: PASSED
