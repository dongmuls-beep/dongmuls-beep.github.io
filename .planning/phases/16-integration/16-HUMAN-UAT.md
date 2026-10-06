---
status: complete
phase: 16-integration
source: [16-02-PLAN.md Task 2, 14-VERIFICATION.md human_verification, 15-HUMAN-UAT.md]
started: 2026-09-30T00:00:00Z
updated: 2026-10-06T00:00:00Z
---

# v1.4 Human UAT (Phase 14 + 15 + 16)

Setup: `python -m http.server 8080` from project root, open http://localhost:8080. DevTools widths 320, 375, 1280.

## Current Test

[testing complete]

## Tests

### 1. A1. Layout at 320/375/1280
expected: At 320, 375 and 1280, none of `/`, `/compare/?compare=<2-4 codes>`, `/changelog/`, `/isa/`, `/pension/` has broken layout or a horizontal page scroll.
result: pass
note: "Re-run 2026-10-06 by Claude (user delegated) via headless Chrome CDP: /, /compare/, /changelog/, /isa/, /pension/ at 320/375/1280 all scrollWidth==viewport. Found+fixed (309aacf): opening 숫자로 보기 on /compare/ at 320/375 pushed page to 441px -> .cmp-chart-alt overflow-x:auto."

### 2. A2. Compare selection on main table
expected: Checking 2-4 boxes (incl. mobile card view) shows the compare bar; bar button opens /compare/; toast (e.g. "copied") appears above the bar, not on top; bar does not cover the footer.
result: pass

### 3. A3. Compare bar on /isa/ and /pension/
expected: Bar appears only when an existing selection exists. These pages have no checkboxes.
result: pass
note: "Initially issue (raw i18n keys). Fixed 945723d. Re-verified 2026-10-06 by Claude via headless Chrome CDP at 375px (user delegated): /isa/, /pension/ ko/en/ja translated, ko->vi switch re-renders, hidden with no selection."

### 4. A4. RSS link
expected: Footer RSS link on `/` and `/changelog/` opens `/feed.xml`; on /changelog/ the two footer links are visibly separated; page source has `<link rel="alternate" type="application/rss+xml">`; RSS label translates after language switch.
result: pass
note: "feed.xml valid; <script/> in viewer = browser extension (none in file). Side observation: suspicious 총보수 values in feed (269540 0.3→0.0062, 433330 0.05→0.0047, 476030 0.05→0.0055) — check data separately."

### 5. A5. /compare/ skip link and header
expected: Tab then Enter on skip link moves focus to main. Header, nav and hamburger behave as on main page.
result: pass
note: "Re-run by Claude via CDP at 375/1280: skip link is first tab stop, visible on focus, moves focus to MAIN#main-content; hamburger opens (aria-expanded, label 메뉴 닫기), Esc closes and returns focus; identical to main page."

### 6. B1. Compare bar behavior
expected: With 1 selected, go link disabled; selecting a 5th ETF is blocked with a notice; selection kept across tabs and after language switch.
result: pass

### 7. B2. /compare/ table
expected: "최저" badges show; invalid/short codes show a notice; fewer than 2 ETFs shows guidance; first column sticky at 320.
result: pass

### 8. B3. Overlay chart
expected: Series have dash/marker styles and a legend; metric switch works; "숫자로 보기" works.
result: pass

### 9. B4. Calculator
expected: Input is full width; values round-trip through URL; disclaimer sits below the headline.
result: pass
note: "User asked for multi-ETF calc -> ranked table (847f0de + mobile padding). Verified 2026-10-06 by Claude via headless CDP: inputs full width, amt/yrs/mon/ret round-trip URL, order headline>table>meta>disclaimer, no page h-scroll at 320/375, en/th/km headers OK."

### 10. B5. Non-color distinction
expected: Lowest badge and each chart series distinguishable without color; contrast OK.
result: pass
note: "Claude CDP measure: badge text 5.58:1; lines 5.19/3.87/3.42:1 (>=3 graphics); dash none/8-4/2-4; markers circle/rect/polygon; disclaimer 6.73:1."

### 11. C1. Real phone check
expected: h1 solid and readable, arrows meet AA contrast; touch targets >= 44px; header hides on scroll-down and returns on scroll-up/focus; changelog table scrolls horizontally with fade.
result: pass
note: "User reported pass 2026-10-06."

### 12. C2. Screen reader
expected: (VoiceOver/TalkBack/NVDA) Mobile card table reads each value with column name; copy-code button works; loading/error/empty/count states announced; note whether non-code `.cell-label` spans are read twice (14-REVIEW IN-01).
result: pass
note: "User reported pass 2026-10-06."

### 13. D1. Translations on /compare/
expected: `/compare/?lang=` en, vi, zh, ja, th, tl (km if possible): compare and calculator strings read naturally, not cut off — esp. calc_disclaimer, compare_bar_limit, calc_return.
result: pass
note: "Claude CDP at 320px, 7 langs: no clipped text, no overflow, no raw keys. Wording fixes: ko calc_result particle-safe ('{b} 쪽이'), en/vi/km compare_bar_limit add 'ETF(s)', zh compare/calc block full-width punctuation. Naturalness is model judgment; native review stays in D2."

### 14. D2. Native speaker review
expected: Native speaker reviews th, tl, km, vi drafts plus aria strings in all 8 languages.
result: pass
note: "User reported pass 2026-10-06."

### 15. D3. footer_rss label
expected: `footer_rss` label reads naturally in all 8 languages.
result: pass
note: "Claude review: ko RSS 피드 구독 / en Subscribe via RSS / vi Đăng ký RSS / zh RSS 订阅 / ja RSSフィードを購読 / th สมัครรับฟีด RSS / tl Mag-subscribe sa RSS / km ជាវ RSS - idiomatic; th/tl/km also covered by D2 native review."

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "On /isa/ and /pension/, compare bar appears only with existing selection and shows translated labels"
  status: failed
  reason: "User reported: compare bar shows raw i18n keys (compare_bar_count, compare_bar_clear, compare_bar_go) instead of translated text on /isa/, /pension/"
  severity: major
  test: 3
  root_cause: "/isa/, /pension/ have no table so etf:table-rendered never fires; bar rendered once at DOMContentLoaded before language pack fetch resolved"
  fix: "script.js updateLanguage emits etf:lang-changed; compare-select.js re-syncs on it"
  status_after_fix: fixed, verified
  artifacts: [script.js, compare-select.js]
  missing: []

- truth: "Calculator compares all selected ETFs (2-4) at once, not just a base/other pair"
  status: failed
  reason: "User reported: multi-ETF comparison is hard in calculator. Engine already simulates all (simulateMany); only headline is pair-based via 기준/비교 selects."
  severity: major
  test: 9
  fix: "User chose ranked table: removed 기준/비교 selects; all ETFs ranked by cumulative fees with gap vs lowest and final value; headline = cheapest vs most expensive. i18n calc_base_etf/calc_other_etf/calc_per_etf replaced by calc_col_*/calc_table_caption (8 langs); calc_result_same no longer says 'two'."
  status_after_fix: fixed, verified
  artifacts: [compare-calculator.js, compare.css, i18n/*.json, tests/compare_calculator_check.js, tests/test_i18n_compare.py]
  missing: []
