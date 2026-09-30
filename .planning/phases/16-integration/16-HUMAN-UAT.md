---
status: partial
phase: 16-integration
source: [16-02-PLAN.md Task 2, 14-VERIFICATION.md human_verification, 15-HUMAN-UAT.md]
started: 2026-09-30T00:00:00Z
updated: 2026-09-30T00:00:00Z
---

# v1.4 Human UAT Checklist (Phase 14 + 15 + 16)

## Setup

From the project root, run `python -m http.server 8080`, then open http://localhost:8080.

Use DevTools device widths 320, 375 and desktop (1280). Mark each item `[x]` when it passes, or write the problem (page, width, language) under it.

## Current Test

[awaiting human testing]

## A. Layout and integration (Phase 16)

- [ ] **A1.** At 320, 375 and 1280, none of these pages has broken layout or a horizontal page scroll: `/`, `/compare/?compare=<2-4 codes>`, `/changelog/`, `/isa/`, `/pension/`.
- [ ] **A2.** Compare selection on the main table:
  - Check 2 to 4 boxes, including in the mobile card view. The compare bar appears.
  - The bar button opens /compare/.
  - A toast, such as "copied", appears above the bar, not on top of it.
  - The bar does not cover the footer.
- [ ] **A3.** On `/isa/` and `/pension/`, the bar appears only when there is an existing selection. These pages have no checkboxes.
- [ ] **A4.** RSS link:
  - The footer RSS link on `/` and `/changelog/` opens `/feed.xml`.
  - On /changelog/, the two footer links are visibly separated.
  - The page source has `<link rel="alternate" type="application/rss+xml">`.
  - The RSS label is translated after a language switch.
- [ ] **A5.** On `/compare/`, the skip link works: Tab, then Enter, moves focus to main. The header, nav and hamburger behave the same as on the main page.

## B. Compare / calculator (from 15-HUMAN-UAT)

- [ ] **B1.** Compare bar behavior:
  - With 1 selected, the go link is disabled.
  - Selecting a 5th ETF is blocked, with a notice.
  - The selection is kept across tabs and after a language switch.
- [ ] **B2.** The /compare/ table:
  - The "최저" (lowest) badges show.
  - Invalid or short codes show a notice.
  - With fewer than 2 ETFs, the page shows guidance.
  - The first column stays fixed (sticky) at 320.
- [ ] **B3.** The overlay chart:
  - Series have dash/marker styles and a legend.
  - The metric switch works.
  - "숫자로 보기" (show as numbers) works.
- [ ] **B4.** The calculator:
  - The input is full width.
  - Values round-trip through the URL.
  - The disclaimer sits below the headline.
- [ ] **B5.** Without relying on color, you can tell the lowest badge and each chart series apart. Contrast is OK.

## C. Mobile a11y (from 14-VERIFICATION)

- [ ] **C1.** On a real phone:
  - The h1 is solid and readable, and the arrows meet AA contrast.
  - Touch targets are at least 44px.
  - The header hides on scroll-down and comes back on scroll-up or focus.
  - The changelog table scrolls horizontally, with the fade.
- [ ] **C2.** Screen reader (VoiceOver, TalkBack or NVDA):
  - In the mobile card table, each value is read with its column name.
  - The copy-code button works.
  - Loading, error, empty and count states are announced.
  - Check 14-REVIEW IN-01 here: whether the non-code `.cell-label` spans are read twice.

## D. Translation review

- [ ] **D1.** Open `/compare/` with `?lang=` set to en, vi, zh, ja, th, tl (and km if possible). The compare and calculator strings read naturally and are not cut off. Check these especially:
  - calc_disclaimer (legal text)
  - compare_bar_limit
  - calc_return
- [ ] **D2.** A native speaker reviews the th, tl, km and vi drafts, plus the aria strings in all 8 languages.
- [ ] **D3.** The new `footer_rss` label reads naturally in all 8 languages.

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0
blocked: 0

## Gaps
