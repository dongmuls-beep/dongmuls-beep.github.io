---
phase: 16-integration
verified: 2026-09-30T00:00:00Z
status: passed
human_verification_resolved: "2026-10-06 — all items passed in 16-HUMAN-UAT.md (15/15)"
score: 6/6 16-01 must-have truths verified in code; 5/5 automated audit items passed
overrides_applied: 0
gaps: []
human_verification:
  - test: "The v1.4 human UAT checklist (browser smoke at 320/375/1280, compare/calculator, screen reader, translation review)"
    file: ".planning/phases/16-integration/16-HUMAN-UAT.md"
    why_human: "Visual, device, screen-reader and native-language checks cannot be automated. Deferred by the user."
---

# Phase 16: Integration Verification Report

**Status:** human_needed. There are no automated gaps.

## Must-haves (16-01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | RSS autodiscovery on / and /changelog/ | VERIFIED | There is one `application/rss+xml` link per page (test_i18n_feed) |
| 2 | Footer RSS link translated into 8 languages | VERIFIED | `a[href="/feed.xml"][data-i18n="footer_rss"]` is on /, /changelog/ and /compare/. `footer_rss` follows `footer_privacy` in all 8 packs |
| 3 | Main page has checkboxes and the bar; isa/pension have the bar only | VERIFIED (code) | compare-select.js is loaded on all three pages. Its `sync()` injects checkboxes only when `#tableBody` exists |
| 4 | compare/index.html matches the template | VERIFIED | It has the skip link, `main#main-content[tabindex=-1]`, theme-color #e8edf5, `aria_primary_nav` on the nav, and the canonical link |
| 5 | CI runs the compare/a11y node checks | VERIFIED | daily_update.yml has the step after the fee chart check and before ETL |
| 6 | Floating elements are not hidden by the bar | VERIFIED (code) | The only fixed bottom element is `.toast`. compare.css lifts it by `--cmp-bar-h` when `body.has-compare-bar` is set. Visual confirmation is in UAT A2 |

## Code review (Phase 16 diff, 2163b6c..HEAD)

The directive was to fix critical issues only; there were no critical findings.

| ID | Severity | Finding | Disposition |
|----|----------|---------|-------------|
| WR-01 | Warning | The compressed footer on changelog/index.html put the privacy and RSS anchors side by side with no whitespace, so they would render as one run of text | FIXED in `fix(16-01)`: a single space was added |
| IN-01 | Info | style.css has no gap rule for `.footer-links a`, so on all pages the links are separated only by whitespace | DEFERRED; style.css is out of scope for Phase 16 |
| IN-02 | Info | The new CI step was not YAML-parsed locally because PyYAML is not installed. It follows the existing step structure | DEFERRED; confirm on the next CI run |
| IN-03 | Info | compare/index.html does not load compare-select.js, so there is no bar on the compare page itself | By design (/compare/ has its own selection UI); no change |

## Carried-over deferred review items

- 14-REVIEW IN-01: the `.cell-label` aria handling. It is checked by screen reader in UAT C2.
- 15-REVIEW IN-01 to IN-05 are informational and remain deferred:
  - unused chart code
  - no chart redraw on resize
  - an empty `<th>`
  - a truncated `?compare=` value
  - a11y/i18n nits: ko-KR locale in the calculator, the <2-fee message, focus after retry, and a duplicate live region

## Automated audit

See 16-02-SUMMARY.md:
- pytest: 387 passed
- node: 9 of 9 passed
- BOM/CRLF: OK
- i18n parity: 385 keys in each pack
- commit range: clean
