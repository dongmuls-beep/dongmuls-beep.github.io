# Phase 24 — UI Review

**Audited:** 2026-11-21
**Baseline:** 24-UI-SPEC.md (approved)
**Screenshots:** captured (headless Chrome, seeded `pf_v1` with 2 rows; desktop 1440, tablet 768, mobile ~500 px min window). Stored in scratchpad, not in repo. True 320 px not testable in headless Chrome.
**Advisory only. No source changed.**

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All 116 `pf_` keys wired via `data-i18n`; polite 해요체; no raw keys; states match contract |
| 2. Visuals | 2/4 | Desktop holdings table is clipped: 평가금액 and 관리 (수정/삭제) are off-screen, no scroll cue at >=640px |
| 3. Color | 4/4 | Accent/danger confined to the reserved list; no hardcoded colors in JS; up/down never color-only |
| 4. Typography | 3/4 | Only 14/16/20/28 and 400/600 in CSS, but `.pf-asof-note`, `.pf-weights-title`, `.pf-weight-name` have no rules; "종가 기준" renders 16px dark, not 14px muted |
| 5. Spacing | 3/4 | Scale respected; empty `.cmp-field-error` slots leave ~60px dead gaps between form fields |
| 6. Experience Design | 3/4 | State matrix, aria-disabled, single live region all present; key flows (edit/delete, keyboard, 320px, download) never exercised |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Holdings table clipped on desktop** — at >=1024px the left column is 5fr (~320 px inner); `.pf-rows-table td{white-space:nowrap}` plus `th[scope=row]{min-width:128px}` pushes 평가금액 and 관리 off-screen. Users cannot see the per-row value or find 수정/삭제 without discovering a horizontal scroll, and `.cmp-scroll-hint` is hidden at >=640px. Fix: allow wrapping in the date/qty cells, drop nowrap on desktop, or show the scroll hint whenever `.cmp-table-wrap` overflows (not only <640px); consider stacking actions under the name.
2. **Unstyled classes emitted by the view** — `pf-asof-note`, `pf-weights-title`, `pf-weight-name`, `pf-weights-title` margin (spec: 24px) have no CSS (`portfolio.css`; emitted at `portfolio-view.js:367,372,377`). 기준일 note shows 16px/dark instead of 14/400 `--text-muted`. Fix: add the three rules per UI-SPEC B1.
3. **Dead vertical space in the form** — every `.cmp-field` reserves an empty `.cmp-field-error` `<p>` plus the hint, so 종목 → 수량 gap is ~60px and the submit button floats far from the fields (desktop and mobile). Fix: `.cmp-field-error:empty{display:none}` (keep `aria-describedby` target in DOM) or `min-height:0; margin:0`.

Further (WARNING): chart y-axis label "20만" sits on top of the line/area at the left edge (chart `.pf-axis` start-anchored over data); chart cursor line at the last point is drawn on the plot edge and looks like a border; `.pf-btn-primary` has no hover state while `.cmp-btn` neighbors may.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- `portfolio/index.html` uses `data-i18n` for every visible string; `i18n/ko.json` has 116 `pf_` entries. Empty/error/confirm copy matches the contract. Dialog buttons use the i18n-table strings (`그대로 두기` / `파일로 덮어쓰기`) rather than the Copywriting Contract line (`취소` / `덮어쓰기`); the spec contradicts itself, implementation followed the key table. Not a defect.
- Edit cancel reads `수정 취소` (key `pf_cancel_edit`), consistent with table.
- Desktop screenshot of intro shows `종목수량보유` with middle dots not visibly rendered (likely font glyph at that size); string in HTML is correct. Needs human glance.

### Pillar 2: Visuals (2/4)
- Focal point is clear: 합계 stat then chart; empty state uses form. Weight bars, stat cards, chips look as specified.
- BLOCKER-lite: holdings table clipped on desktop (screenshot: header cut at "평가금액"/"관...", action buttons invisible). On mobile (~500 px) 관리 column is also out of view, scroll hint present there.
- Chart: y labels overlay the area at left; 4 ticks readable but "20만" collides with line. Gap between period chips and chart is ~40px, larger than the 16px spec (`.pf-chart-focus margin-top:16px` plus `#pf-chart-body`).
- Data table `<summary>` renders as plain bold text on desktop screenshot with no visible disclosure affordance (open by default, so low impact).
- Icon-only buttons: none; glyph `▲` is aria-hidden with sr-only word. Good.

### Pillar 3: Color (4/4)
- `--primary` used only on: `.pf-btn-primary`, focus rings, `.pf-line/.pf-area/.pf-cursor-dot`, `.pf-bar > span`, `.pf-option[aria-selected]` (plus compare.css chip pressed). `--danger`: `.pf-btn-danger`, `.pf-storage-msg` border (spec-listed), field errors via compare.css.
- `--pf-up/--pf-down` page-scoped; screenshot shows red ▲ with sign and percent. No hex colors in `portfolio/*.js`; only `#fff` and `rgba(15,23,42,.5)` in CSS, both per spec.
- Forced-colors block present for line, area, bar, chip, option.
- Minor: `.pf-btn-primary[aria-disabled]` uses `opacity:.6` (white on primary falls below 4.5:1; disabled state, acceptable).

### Pillar 4: Typography (3/4)
- CSS sizes: 14/16/20/28 only; weights 400/600 only. h1 28/600; stat values 20/600; axis 14.
- Deviation: `.pf-asof-note` has no rule (spec 14/400 `--text-muted`); `.pf-weights-title` (h3) relies on global h3 styles, spec says 16/600; `.pf-weight-name` code part uses `.cmp-etf-code` but name weight is inherited from head 600 (ok).
- Fee line wraps to 2 lines at desktop width; acceptable.

### Pillar 5: Spacing (3/4)
- All margins/gaps are multiples of 4 (4/8/16/24/32/48); breakpoints 640/1024 as spec; card padding from `.cmp-card`.
- Empty error `<p>`s inflate form spacing (see fix 3). 
- `.pf-weights` margin-top is 8px; spec wants title margin-top 24px (title unstyled).
- No arbitrary px values outside spec exceptions (352px listbox, 240/320 chart height).

### Pillar 6: Experience Design (3/4)
- Present: loading skeleton state, page error with retry, empty state, prices-loading `aria-busy`, no-result state, storage banner, retry with `aria-disabled`, `aria-disabled` (not `disabled`) on export/submit-at-limit/delete-while-editing, `date max` set at `portfolio-view.js:126`, native `<dialog>` for overwrite, one live region only.
- Gaps: per 24-10-SUMMARY and 24-HUMAN-CHECK, never verified in a browser: keyboard-only Tab order, ArrowLeft/Right chart readout, edit and delete flows with focus return, 1년/전체 chips, `1,5` quantity error, overwrite-confirm path, Khmer, real 320px, file download. Human check still pending, so these are unproven rather than failing.
- Delete has no confirm (by design). Row actions hidden on desktop (fix 1) harms discoverability of the core edit/delete flow.

---

## Files Audited
`.planning/phases/24-portfolio-ui/24-UI-SPEC.md`, `24-HUMAN-CHECK.md`, `24-10-SUMMARY.md`, `portfolio/index.html`, `portfolio.css`, `portfolio/portfolio-view.js` (grep), `portfolio/portfolio-chart.js` (grep), `portfolio/portfolio-format.js` (grep), `portfolio/portfolio-store.js` (storage key), `compare.css` (selected rules). Live screenshots at 1440/768/500 px.
