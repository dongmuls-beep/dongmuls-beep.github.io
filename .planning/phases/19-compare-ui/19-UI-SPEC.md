---
phase: 19
slug: compare-ui
status: draft
shadcn_initialized: false
preset: none
created: 2026-11-10
---

# Phase 19 — UI Design Contract

> Defect-fix phase on existing `/compare/`. No new screens, no redesign. Target state per fix, grounded in existing tokens.

## Design System

| Property | Value |
|----------|-------|
| Tool | none (vanilla JS/CSS; no React, no `components.json`; shadcn gate N/A) |
| Preset | not applicable |
| Component library | none (hand-written `.cmp-*` classes in `/compare.css`, tokens from `/style.css`) |
| Icon library | none (inline SVG only) |
| Font | `Outfit` + `Pretendard Variable` (existing; no new font, no new dependency) |
| Registry | official shadcn: none; third-party: none (vetting gate N/A) |

## Spacing Scale (existing; unchanged)

4, 8, 16, 24, 32, 48, 64. Exceptions already in use: touch targets min 44px. Table cell padding 8px 16px; `.compare-page` side padding 16px at <=639px. New rules in this phase use only these values.

## Typography (existing; unchanged)

Sizes in compare.css: 14, 16, 20, 28 px (4 sizes). Weights: 400, 600 (2). Line height body 1.5, headings 1.2. No new size or weight may be introduced; the `.cell-label` rule in style.css uses 0.8rem/700 for the main page only and is not touched.

## Color (existing tokens; unchanged)

| Role | Token |
|------|-------|
| 60% dominant | `--bg` #e8edf5, `--surface` #fff |
| 30% secondary | `--surface-soft` #f5f8fd (th cells, sticky column), `--surface-muted` |
| 10% accent | `--primary` #0b57d0: focus outline (2px), links, primary buttons only |
| Destructive | `--danger` #dc2626: error text only; no destructive actions this phase |

Sticky ETF-name column must use an opaque `--surface-soft`/`--surface` background (no transparency) so scrolled cells do not show through.

## Per-fix Interaction and A11y Contract

| Req | Target state | Assertion test |
|-----|--------------|----------------|
| CMP-07 chart | Unused chart code removed (no dead exports/functions in `compare-chart.js`). On `window` `resize` (debounced 150ms, bound once, matching `compare-view.js` `resizeBound` pattern) the SVG re-renders using `figure.clientWidth`; min width 260 kept. Series data and selected metric unchanged by redraw. | `compare_chart_check.js`: stub window, dispatch `resize`, assert re-render called with new width, listener added once; grep assert removed symbols absent. |
| CMP-08 th | Metric table corner `<th scope="col">` (compare-view.js:118) is never empty: visible or visually-hidden text from an existing i18n key (reuse the table-title/metric label key; add a key only if none fits, in all 8 languages). | `compare_view_check.js` + `test_html_a11y.py`: no `<th` with empty text in rendered output. |
| CMP-08 URL | `?compare=` parsing keeps the full selection (all valid codes up to the 4 cap; no truncation of the value, e.g. by a length slice or first-comma split). Over-cap keeps existing cap notice. | `compare_select_check.js`: 4 codes and long value round-trip to the same ordered list. |
| CMP-09 locale | Calculator numbers (`toLocaleString` at compare-calculator.js:29, 119, 254) use the active language locale (ko-KR, en-US, vi-VN, zh-CN, ja-JP, th-TH, fil-PH, km-KH), not hard-coded `ko-KR`. Fallback to ko-KR if locale unsupported. | `compare_calculator_check.js`: set lang `en`, assert `1,234,567` format; set `vi`, assert vi grouping. |
| CMP-09 focus | After a retry (error state -> reload), focus stays on a live element: if the retry button is removed, focus moves to the new state container/first result heading (`tabindex="-1"`), never `document.body`. Visible focus ring = existing 2px `--primary` outline. | `compare_select_check.js`: stub DOM, activate retry, assert `document.activeElement` is not body and is inside `#cmp-app`. |
| CMP-09 live | Exactly one polite announcement per update: a single live region (`#cmp-live`, `role="status"`) is the announcer. The duplicate `role="status" aria-live="polite"` on `#cmp-calc-headline` (calculator.js:124) and the extra live node created in compare-select.js:152 are removed or merged; headline text is written to the one region. | `compare_calculator_check.js` / `a11y_states_check.js`: count nodes with `aria-live`/`role=status` in rendered output used for the same message = 1. |
| CMP-10 lang | Remove the title `MutationObserver` (compare-view.js:438). Re-render on `document` `etf:lang-changed` (already used by compare-select.js:341). One listener per module; no double render. | `compare_view_check.js`: assert no `MutationObserver` in source; dispatch event, assert re-render with new strings. |
| CMP-11 rank table @<=360px | Calculator rank table (`calc_col_rank/etf/fees/gap`): inside a horizontal-scroll wrapper (`overflow-x:auto`); ETF-name `th/td` is `position: sticky; left: 0` with opaque background and 1px `--border` right edge; the "최저 대비" (`calc_col_gap`) column has `min-width` large enough for its label and a 7-digit amount without clipping (`white-space: nowrap`, min-width >= 96px, multiple of 4), and is reachable by scroll with the existing scroll-hint gradient. No page-level horizontal scroll at 320px. | `compare_css_check.js`: assert CSS rules for sticky first-data column, `overflow-x:auto` wrapper, nowrap and min-width on gap column inside `@media (max-width: 639px)`. Visual 320px check is a human item in VERIFICATION. |
| A11Y-10 | Every `.cell-label` span except the code cell is consistent: all `.cell-label` spans (script.js:1027-1037, includes the unmarked one at 1029) carry `aria-hidden="true"`, because the `<td data-label>` and column header already convey the name. The code-cell spans keep their existing treatment (it already has `aria-hidden`); "non-code" spans gain it. No visible change (label shows only <=mobile via CSS). | `a11y_table_check.js`: every rendered `.cell-label` has `aria-hidden="true"`; count of spans without it = 0. |

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | existing `compare_copy_link` ("링크 복사") and `compare_change_selection` ("다른 ETF 고르기"); unchanged |
| Empty state | existing keys; unchanged |
| Error state | existing keys + retry button; unchanged |
| Destructive actions | none |

i18n: all strings via `data-i18n`/`tr()`. Reuse existing keys. Any added key (e.g. corner-th label) must be added to all 8 JSON files (ko, en, vi, zh, ja, th, tl, km) and pass `tests/test_i18n_compare.py` parity. Locale tags map: ko, en, vi, zh->zh-CN, ja, th, tl->fil-PH, km.

## Verification and Constraints

- Existing suites must pass: `tests/compare_*_check.js`, `tests/a11y_*_check.js`, `tests/test_html_a11y.py`, `tests/test_i18n_compare.py`. New JS tests named `compare_*_check.js`/`a11y_*_check.js` so the CI glob runs them.
- Human-only (VERIFICATION): 320px visual check of sticky column and un-clipped gap column; real-browser resize redraw; screen-reader single announcement.
- Do not edit `.footer-links` (Phase 20). Keep UTF-8 BOM on `script.js`/`style.css`; new files LF, no BOM.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting  - [ ] 2 Visuals  - [ ] 3 Color  - [ ] 4 Typography  - [ ] 5 Spacing  - [ ] 6 Registry Safety

**Approval:** pending
