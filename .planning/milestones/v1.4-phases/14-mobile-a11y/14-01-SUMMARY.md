---
phase: 14-mobile-a11y
plan: 01
subsystem: ui
tags: [css, a11y, wcag, touch-targets, skeleton]
requires: []
provides:
  - "style.css Accessibility (Phase 14) section: skip-link, .sr-only, .cell-label, skeleton, state-box, changelog scroll region, header focus guard"
affects: [14-03, 14-04, 14-05]
key-files:
  modified: [style.css]
decisions:
  - "h1 solid var(--text) (user-approved); no gradient-clip anywhere"
  - "Accessibility section appended at EOF of style.css so it wins the cascade"
  - "Single commit for all 3 tasks (edits applied in one byte-safe python pass)"
metrics:
  completed: 2026-09-30
---

# Phase 14 Plan 01: style.css accessibility rewrite Summary

Deleted the "Additive UI Refinements" block first, relocated its skip-link, th color and tabular-nums rules into a new "Accessibility (Phase 14)" section, and added contrast, header-focus, 44px touch-target, changelog-scroll, `.cell-label`, skeleton and state-box CSS in one byte-safe edit of style.css.

## Commit
- 6bb29f0 feat(14-01): style.css a11y ... (style.css only, +204/-76; tasks 1-3 combined)

## What changed
- Contrast: h1 solid `--text` (base rule; gradient removed with block); `.fee-change` 0.8rem/700/tabular-nums, `.down` #166534; th and `.loading-text` use `--text-muted`; scrollbar thumb rgba(15,23,42,.25/.4).
- Header: `.site-header.header-hidden:focus-within {transform:none}`, `html{scroll-padding-top}`, `.site-header{transition:none}` under reduced motion.
- Touch: 479px select min-height 44px; tab/cta gaps 0.5rem (breadcrumbs 0.45rem untouched); `.share-button` min-width 44px; mobile code/name cells, `.stock-link`, footer/breadcrumb links 44px; `button.btn-link`, `.state-box .btn-link`.
- Changelog: mobile `.table-container` horizontal scroll with fade, nowrap cells, col 2 wraps min 160px; `.table-container:focus-visible` ring (offset -2px). Existing 560px min-width kept.
- Cards: `td::before` label rules (mobile and 479px) removed; `.cell-label` hidden by default, visible at <=767px. Mobile cards show no column labels until plan 14-04 adds the spans (expected).
- States: `.skeleton-bar`/`skeleton-shimmer`, `.skeleton-card`, `tr.skeleton-row`, `td.state-cell`, `.state-box*`, `.state-hint`, reduced-motion fallback.
- Single `:focus-visible` (duplicate removed); `.language-selector select:focus-visible` added.

## Verification
- BOM EF BB BF intact, no bare LF (b"\n" count == b"\r\n" count); diff +204/-76 (no whole-file churn).
- Plan automated asserts pass (no Additive block, background-clip, 38bdf8, a1a1aa, scale(1.005), 0.87rem, attr(data-label), min-height 38px, gap 0.55rem; single `.skip-link:focus`, single `^:focus-visible`).
- `node tests/fee_chart_check.js` -> fee_chart_check OK.
- `python -m pytest -q` -> 326 passed.

## Deviations from Plan
- [Rule 3 - consistency] `0.87rem` also existed in the tablet `.info-table th, .info-table td` rule (line ~1146); changed to 0.875rem so the "0 hits of 0.87rem" acceptance criterion holds.
- Tasks committed as one commit instead of three (single-pass edit; same file).

## Pending human verification (end of Phase 16)
- Visual check at 320/375px: 44px targets and 8px gaps, card layout, changelog scroll fade and focus ring.
- Header stays visible on Tab focus / no slide under reduced motion; skip-link focus appearance.
- Skeleton and state-box appearance (visible only after 14-04/14-05).
- h1 solid color look (user already approved the decision).

## Self-Check: PASSED
