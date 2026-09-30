---
phase: 9
slug: 수수료-변동-그래프-모달
status: approved
reviewed_at: 2026-09-30
shadcn_initialized: false
preset: none
created: 2026-09-30
---

# Phase 9 — UI Design Contract

> Step chart + change list in a modal, opened from 4 fee cells. Vanilla JS/SVG, existing tokens only. Source of decisions: 09-CONTEXT.md (locked).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (vanilla HTML/CSS/JS; shadcn gate N/A, not React) |
| Preset | not applicable |
| Component library | none (reuse `.modal-overlay` / `.modal-content` / `.modal-title` / `.modal-body` / `.modal-close-btn`, style.css:591-695) |
| Icon library | none (text glyphs ▲ ▼ only; no new icons) |
| Font | inherited body stack ("Outfit", "Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", sans-serif); no new fonts. SVG text uses `font-family: inherit` |

---

## Spacing Scale

Existing tokens `--space-1..--space-10` (0.25rem step). Use only these in new CSS:

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs `--space-1` | 4px | gap between date and value in list row, dot-to-label gap |
| sm `--space-2` | 8px | list row vertical padding, gap between chart and list heading |
| md `--space-4` | 16px | gap chart to list, modal-body padding (existing 1rem) |
| lg `--space-6` | 24px | gap between title and chart block on mobile |
| xl `--space-8` | 32px | not used |

Exceptions:
- `.fee-history-btn` `min-height: 44px` and `min-width: 44px` (touch target, per ui-review lessons). Achieve by padding (`--space-2` vertical) plus `display:inline-flex; align-items:center; justify-content:flex-end` so the table row height does not visibly grow beyond 44px.
- Existing modal paddings (1.2rem horizontal) left as is.
- SVG internal coordinates are unitless viewBox units (not spacing tokens).

---

## Typography

Reuse existing rem scale; declare only these 4 sizes / 2 weights for new elements.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body (list rows, states, hint) | 0.86rem (~14px) | 400 | 1.5 |
| Label (axis ticks, aria/legend text, list date) | 0.75rem (12px) | 400 | 1.4 |
| Emphasis (list value, change delta) | 0.86rem | 600 | 1.5 |

Notes: weights are 400 + 600 for new elements (the existing `.modal-title` 700 is inherited, not new). SVG axis text: `font-size: 12` in viewBox units (viewBox 320 wide renders approx 12px at 320px viewport; do not go below 10 rendered px). Numbers use `font-variant-numeric: tabular-nums`. Hint line reuses `.table-note` sizing.

---

## Color

Only existing variables. No new hex values.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surface` #ffffff / `--glass-bg-desktop` | modal surface, chart background transparent |
| Secondary (30%) | `--surface-soft` #f5f8fd, `--border` #d2dbe7, `--text-muted` #475569, `--text-soft` #64748b | list row separators, gridlines, axis labels, "기록 시작" row |
| Accent (10%) | `--primary` #0b57d0 | see list below |
| Destructive | `--danger` #dc2626 | ▲ (fee increase) delta text and error message only |

Accent (`--primary`) reserved for:
1. Step line stroke (2px, `stroke-linejoin: round`, `stroke-linecap: butt`)
2. Change-point dots (r=4, fill `--primary`, stroke `--surface` 2px)
3. Dotted underline + hover/focus color of `.fee-history-btn`
4. `:focus-visible` outline of `.fee-history-btn` (2px solid `--primary`, offset 2px)

Chart chrome: gridlines `--border` 1px (dash none), axis tick labels `--text-soft` (4.7:1 on white, passes AA; do NOT use `--accent` #0ea5a4 for text or lines, it fails contrast ~2.9:1). Delta colors: ▲ (fee increase) `--danger`, ▼ (fee decrease) `--text`; direction is always conveyed by the glyph too (ui-review found `.fee-change.up/.down` failing AA, so do not reuse those classes; define `.fee-history-delta.up/.down`). Danger #dc2626 on white is 4.8:1, passes.

`.fee-history-btn` idle: `color: inherit; background: none; border: 0; text-decoration: underline dotted var(--text-soft); text-underline-offset: 3px; font: inherit; cursor: pointer`. Hover: `color: var(--primary); text-decoration-color: var(--primary)`.

---

## Layout and Components

### Table trigger
- Each of 4 fee `<td>` (총보수, 기타비용, 매매중개수수료, 실부담비용) wraps value in `<button type="button" class="fee-history-btn" data-code data-field>`. Accessible name via `aria-label` = i18n `fee_history_open_label` with `{name} {field}` (e.g. "KODEX 200 총보수 변동 그래프 보기"). Value text remains visible inside button.
- Numeric alignment of the cell unchanged (right-aligned as existing).
- Mobile card-table layout: button stays inline in the cell; min 44px height still applies.

### Hint line
- New `<p class="table-note" data-i18n="fee_history_hint">` placed directly ABOVE the table (before table wrapper, near `.table-note` at index.html:263 which is below); style: existing `.table-note`. Text: "수수료를 누르면 변동 그래프를 볼 수 있습니다".

### Modal (second instance, id `feeHistoryModal`)
- Markup mirrors privacy modal: `.modal-overlay[hidden] > .modal-content[role=dialog][aria-modal=true][aria-labelledby=feeHistoryTitle]`; `h3.modal-title#feeHistoryTitle`; `.modal-body#feeHistoryBody`; `button.modal-close-btn` ("닫기", existing i18n key reuse).
- Width: existing `min(680px,100%)`; add modifier none. Chart max-width fills body.
- Close: button, overlay click, ESC (only topmost open modal). Focus trap shared; focus returns to the originating `.fee-history-btn` (`lastFocusedBeforeModal`). Note: table re-render on filter can detach the button; fall back to `#tableBody`-adjacent focusable (hint or table) if the element is disconnected.
- Title: "{종목명} ({코드}) · {항목명}" set via textContent.

### Modal body order
1. Chart block (`<figure class="fee-history-chart">`)
2. Summary caption (only for no-change state, see Copy)
3. Change list `<ol class="fee-history-list">`

### Chart (SVG)
- `viewBox="0 0 320 180"`, `width:100%; height:auto; display:block`, `role="img"`, `aria-label` (summary), `dir="ltr"`, `preserveAspectRatio="xMidYMid meet"`.
- Plot area: left 48 (Y labels, room for `0.0000%` at 12 size, text-anchor end at x=44), right 12, top 12, bottom 28 → plot x 48..308, y 12..152.
- Y axis: 3 ticks (min, mid, max of padded range) with horizontal gridlines `--border` 1px; labels via `formatPercent` (4 decimals) in `--text-soft`, `text-anchor:end`, baseline centered (`dominant-baseline: middle`).
- X axis: 2 labels only: start date at x=48 (`text-anchor:start`), today at x=308 (`text-anchor:end`), y=172; format `YYYY-MM-DD`. Time-proportional positions.
- Line: horizontal-then-vertical step path, extended horizontally to today. Dots at each change point (including the appended "today" point only if it differs from the last history value; the appended point is drawn as dot too).
- Flat/single-point: horizontal line vertically centered, one dot at start, Y range value ±50%, still 3 ticks.
- Last-value emphasis: none beyond the dot (no tooltips, deferred).
- Non-interactive chart (no hover/focus); list is the accessible equivalent.
- Reduced motion: no animation at all (no transitions), so `prefers-reduced-motion` needs nothing.

### Change list
- `<ol class="fee-history-list">`, newest first; each `li`: row `display:flex; gap: --space-2; padding: --space-2 0; border-bottom: 1px solid var(--border)`; pieces: date (Label style, `--text-soft`), value (Emphasis, `--text`), delta span `.fee-history-delta up|down` "▲ 0.0200%p" / "▼ 0.0100%p" (Emphasis; delta uses `formatPercent` numeric + "%p").
- Delta wraps below on width < 360px (`flex-wrap: wrap`).
- Last row (oldest): "{date} · {value} · 기록 시작" with muted `--text-soft` label instead of delta.
- List `max-height` none (modal-body already scrolls, `overflow-y:auto`).

### States
| State | Behavior |
|-------|----------|
| Loading | body shows one line "수수료 변동 내역을 불러오는 중…" (`fee_history_loading`) (`role="status"`, `aria-live="polite"`), `--text-muted`, centered, min-height 180px (matches chart height, no layout jump) |
| Error | body shows error text in `--danger` with `role="alert"` + existing 닫기 button; no retry button (close and re-click retriggers fetch; clear the failed promise cache) |
| Data missing for code/field | Empty: `fee_history_empty` message replaces chart AND list (no SVG rendered) |
| Single point / no change | flat line + caption "{첫 기록일} 이후 변동 없음" (Body, `--text-muted`, centered) above list; list shows only the "기록 시작" row |
| Multi point | chart + list |

### Responsive
- >=768px: modal as-is; chart natural size up to ~600px wide.
- <768px: existing mobile modal CSS untouched (style.css:988+, 1210+); chart scales via width:100% (min rendered width 288px at 320px viewport, text still >=10.5px). No horizontal scroll inside modal.
- Touch target: `.fee-history-btn` >= 44px; close button already 44px.

### Accessibility
- `aria-label` of SVG: "{항목명} 변동 그래프, {시작일}부터 {오늘}까지, 변동 {N}회, 현재 {값}" (i18n key with placeholders).
- Dialog labelled by title; loading/error live regions as above.
- Dynamic text through `textContent` / `escapeHtml` only (v1.1 SEC).
- Color is never the sole carrier (▲/▼ glyphs, text labels).
- All new `aria-label`/`title` strings must go through i18n (ui-review: hard-coded ARIA labels never re-translate); re-apply on language switch, including the open-modal title/list if the language changes while open (or close modal on language change).

---

## Copywriting Contract

| Element | Copy (ko) | i18n key |
|---------|-----------|----------|
| Table hint | 수수료를 누르면 변동 그래프를 볼 수 있습니다 | `fee_history_hint` |
| Trigger aria-label | {name} {field} 변동 그래프 보기 | `fee_history_open_label` |
| Modal title | {종목명} ({코드}) · {항목명} | (built from names + field label; no new key) |
| Field labels | 총보수 / 기타비용 / 매매중개수수료 / 실부담비용 | reuse existing column-header keys (Korean original keys) |
| Loading | 수수료 변동 내역을 불러오는 중… | `fee_history_loading` |
| Error state | 변동 내역을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요. | `fee_history_error` |
| Empty (no series for code/field) | 이 항목의 변동 기록이 아직 없습니다. | `fee_history_empty` |
| No change | {date} 이후 변동 없음 | `fee_history_no_change` |
| List start row label | 기록 시작 | `fee_history_start` |
| List heading (visually hidden or h4 `.policy-section h4` style) | 변동 내역 | `fee_history_list_title` |
| Chart aria-label | {field} 변동 그래프, {start}부터 {end}까지, 변동 {count}회, 현재 {value} | `fee_history_chart_aria` |
| Delta unit | %p | (literal, not translated) |
| Primary CTA | 없음 (trigger is the fee value itself); close = 닫기 | reuse existing close key |
| Destructive actions | none in this phase | n/a |

New i18n keys (add to all 8 files: ko, en, vi, zh, ja, th, tl, km): `fee_history_hint`, `fee_history_open_label`, `fee_history_loading`, `fee_history_error`, `fee_history_empty`, `fee_history_no_change`, `fee_history_start`, `fee_history_list_title`, `fee_history_chart_aria`. Placeholders `{name}`, `{field}`, `{date}`, `{start}`, `{end}`, `{count}`, `{value}` must be preserved verbatim in translations.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable (no shadcn) |
| third-party | none | not applicable |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending


## Focal Point

Primary anchor: the step line + latest-value dot (rightmost). The change list below is secondary.
