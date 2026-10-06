---
status: testing
phase: 16-integration
source: [16-02-PLAN.md Task 2, 14-VERIFICATION.md human_verification, 15-HUMAN-UAT.md]
started: 2026-09-30T00:00:00Z
updated: 2026-10-02T00:00:00Z
---

# v1.4 Human UAT (Phase 14 + 15 + 16)

Setup: `python -m http.server 8080` from project root, open http://localhost:8080. DevTools widths 320, 375, 1280.

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 8
name: B3. Overlay chart
expected: |
  Series have dash/marker styles and a legend; metric switch works; "숫자로 보기" works.
awaiting: user response

## Tests

### 1. A1. Layout at 320/375/1280
expected: At 320, 375 and 1280, none of `/`, `/compare/?compare=<2-4 codes>`, `/changelog/`, `/isa/`, `/pension/` has broken layout or a horizontal page scroll.
result: skipped
reason: "건너뛰고 계속진행" (user skipped)

### 2. A2. Compare selection on main table
expected: Checking 2-4 boxes (incl. mobile card view) shows the compare bar; bar button opens /compare/; toast (e.g. "copied") appears above the bar, not on top; bar does not cover the footer.
result: pass

### 3. A3. Compare bar on /isa/ and /pension/
expected: Bar appears only when an existing selection exists. These pages have no checkboxes.
result: issue
reported: "보이는데 갑자기 비교 바가 로케일이 영문으로바뀌었음 compare_bar_count compare_bar_clear compare_bar_go 이렇게 나옴"
severity: major

### 4. A4. RSS link
expected: Footer RSS link on `/` and `/changelog/` opens `/feed.xml`; on /changelog/ the two footer links are visibly separated; page source has `<link rel="alternate" type="application/rss+xml">`; RSS label translates after language switch.
result: pass
note: "feed.xml valid; <script/> in viewer = browser extension (none in file). Side observation: suspicious 총보수 values in feed (269540 0.3→0.0062, 433330 0.05→0.0047, 476030 0.05→0.0055) — check data separately."

### 5. A5. /compare/ skip link and header
expected: Tab then Enter on skip link moves focus to main. Header, nav and hamburger behave as on main page.
result: skipped
reason: "건너뛰기" (user skipped; local server stopped)

### 6. B1. Compare bar behavior
expected: With 1 selected, go link disabled; selecting a 5th ETF is blocked with a notice; selection kept across tabs and after language switch.
result: pass

### 7. B2. /compare/ table
expected: "최저" badges show; invalid/short codes show a notice; fewer than 2 ETFs shows guidance; first column sticky at 320.
result: pass

### 8. B3. Overlay chart
expected: Series have dash/marker styles and a legend; metric switch works; "숫자로 보기" works.
result: [pending]

### 9. B4. Calculator
expected: Input is full width; values round-trip through URL; disclaimer sits below the headline.
result: [pending]

### 10. B5. Non-color distinction
expected: Lowest badge and each chart series distinguishable without color; contrast OK.
result: [pending]

### 11. C1. Real phone check
expected: h1 solid and readable, arrows meet AA contrast; touch targets >= 44px; header hides on scroll-down and returns on scroll-up/focus; changelog table scrolls horizontally with fade.
result: [pending]

### 12. C2. Screen reader
expected: (VoiceOver/TalkBack/NVDA) Mobile card table reads each value with column name; copy-code button works; loading/error/empty/count states announced; note whether non-code `.cell-label` spans are read twice (14-REVIEW IN-01).
result: [pending]

### 13. D1. Translations on /compare/
expected: `/compare/?lang=` en, vi, zh, ja, th, tl (km if possible): compare and calculator strings read naturally, not cut off — esp. calc_disclaimer, compare_bar_limit, calc_return.
result: [pending]

### 14. D2. Native speaker review
expected: Native speaker reviews th, tl, km, vi drafts plus aria strings in all 8 languages.
result: [pending]

### 15. D3. footer_rss label
expected: `footer_rss` label reads naturally in all 8 languages.
result: [pending]

## Summary

total: 15
passed: 4
issues: 1
pending: 8
skipped: 2
blocked: 0

## Gaps

- truth: "On /isa/ and /pension/, compare bar appears only with existing selection and shows translated labels"
  status: failed
  reason: "User reported: compare bar shows raw i18n keys (compare_bar_count, compare_bar_clear, compare_bar_go) instead of translated text on /isa/, /pension/"
  severity: major
  test: 3
  root_cause: "/isa/, /pension/ have no table so etf:table-rendered never fires; bar rendered once at DOMContentLoaded before language pack fetch resolved"
  fix: "script.js updateLanguage emits etf:lang-changed; compare-select.js re-syncs on it"
  status_after_fix: fixed (needs re-test)
  artifacts: [script.js, compare-select.js]
  missing: []
