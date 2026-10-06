---
phase: 14-mobile-a11y
verified: 2026-09-30T00:00:00Z
status: passed
human_verification_resolved: "2026-10-06 — all items passed in 16-HUMAN-UAT.md (15/15)"
score: 5/5 roadmap success criteria verified (automated); 9/9 requirements code-evidenced
overrides_applied: 0
gaps: []
human_verification:
  - test: "Visual contrast/layout, real-device touch targets, header hide/show on scroll, changelog horizontal scroll and fade on a phone"
    expected: "h1 solid and readable, arrows AA, targets >=44px, header hides on scroll-down and returns on scroll-up/focus"
    why_human: "Visual/device behavior. Deferred to end of Phase 16."
  - test: "Screen reader (VoiceOver/TalkBack/NVDA) pass on mobile card table, copy-code button, status announcements"
    expected: "Each value read with its column name; loading/error/empty/count announced"
    why_human: "Cannot be automated. Deferred to end of Phase 16."
  - test: "Native-speaker review of th/tl/km/vi translation drafts (and aria strings in all 8 languages)"
    expected: "Natural, correct wording"
    why_human: "Drafts accepted for now by user. Deferred to end of Phase 16."
---

# Phase 14: Mobile A11y Verification Report

**Goal:** Mobile users can read and operate the table and history without contrast, touch, screen-reader or keyboard barriers.
**Status:** human_needed (no gaps). **Re-verification:** No.

## Test runs (executed by verifier)
| Command | Result |
|---|---|
| `python -m pytest -q` | 367 passed |
| `node tests/fee_chart_check.js` | OK |
| `node tests/a11y_table_check.js` | OK |
| `node tests/a11y_states_check.js` | OK |

## Success criteria
| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | AA contrast for h1/arrows; duplicate CSS/tokens/theme-color cleaned | VERIFIED | No `background-clip`/`text-fill` in style.css; `.fee-change.up #b91c1c`, `.down #166534`; "Additive UI Refinements" block gone; all 7 pages `theme-color #e8edf5`, 0 occurrences of `#0f172a` |
| 2 | Header hides on scroll-down, shows on scroll-up; not while menu open / focus inside | VERIFIED (code) | style.css `.header-hidden` + `:focus-within` override; script.js `focusin` handler removes hidden class; Escape closes drawer (script.js:161,1403). Real scroll behavior -> human |
| 3 | Changelog table horizontally scrollable; touch targets >=44px | VERIFIED (code) | script.js:1263 scroll region `tabindex=0 role=region` with label; changelog `td::before` neutralised; 19 `44px` rules in style.css. Device check -> human |
| 4 | Card cells announce column; code button labelled; aria-label/title translated in 8 langs | VERIFIED | script.js:1022-1032 real `.cell-label` spans, ARIA roles, `data-i18n-aria` pass (359); sr-only fee up/down (1871); `table_value_missing` = "-" in 8 packs; parity + a11y i18n pytest pass; `data-i18n-aria` present on all 7 pages |
| 5 | Skip-link; skeleton / error+retry / empty states announced | VERIFIED | All 7 pages have `href="#main-content"` and `id="main-content"`; `#tableStatus` role=status, `#etfTableContainer` aria-busy; script.js 691-737 error box role=alert + retry, empty state, changelog status/retry; a11y_states_check passes |

## Requirements
A11Y-01..A11Y-09: all SATISFIED per code evidence above (01: SC1; 02: SC2; 03/04: SC3; 05/06: SC4; 07/08: SC5; 09: SC1). No orphaned requirements.

## Anti-patterns / integrity
- script.js and style.css retain UTF-8 BOM and CRLF (all newlines are CRLF).
- Phase 11 seam events still emitted (fee_chart_check passes).
- No TBD/FIXME blockers examined beyond spot checks; none surfaced.

## Notes
- REQUIREMENTS.md still shows A11Y-01..09 as Pending and ROADMAP plans unchecked; orchestrator should update on closing the phase (not edited by verifier).
- Phase 15 (compare*) files ignored per instruction.

## Gaps
None.
