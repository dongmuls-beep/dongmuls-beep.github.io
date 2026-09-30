# Feature Landscape: Fee-History Popup (v1.3)

**Domain:** Fee/price history popup on a finance comparison table
**Researched:** 2026-09-30
**Confidence:** MEDIUM. This rests on general knowledge of Naver 증권, funetf, etfcheck, Morningstar and WAI-ARIA dialog practice. I did not do live web verification of those sites. The WAI-ARIA dialog guidance is well established (HIGH). The claims about specific competitor behavior are LOW to MEDIUM.

## Context from codebase
- The cells are plain `<td class="text-right" data-label=...>` at script.js ~886-889. Only the code cell is clickable, and it copies the code. Each row already carries `data-label` for mobile card layout.
- An existing modal, `#privacyModal`, uses a `hidden` attribute and an ESC handler (script.js ~152). Reuse or generalize this pattern.
- Fee data is fetched from `data.json`. `changelog.json` is fetched in parallel (~631). The new history JSON should be lazy-fetched on first click, not added to the initial load.
- `formatPercent` and the i18n `getTranslation` helper exist. There are 8 languages, so every new string needs 8 translations.

## Table Stakes
| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Modal with title (ETF name + code + field name) | Users must know which series they are looking at | Low | Field label reuses the existing `table_fee/other/trade/real` i18n keys |
| Step line chart (stepAfter) of the single field | Fees are piecewise constant, so a smooth line would imply interpolation | Med | Hand-built SVG path with `H`/`V` segments |
| Y axis in % with fixed precision (2 to 3 decimals, matching `formatPercent`), with 3 to 5 ticks | Convention on all fee sites | Low | Pad the range. A flat series needs an artificial min/max, for example value +/-0.05, or the line sits on the axis |
| X axis in dates, `YYYY-MM` or `YY.MM.DD`, localized | Standard | Low | Use a time-proportional scale, not an index scale, because change-only records are unevenly spaced |
| Line extends to "today" (the last value is held to the latest data date) | Otherwise the last change looks like the end of the data | Low | Common bug: the chart ends at the last change point |
| Point markers at change dates with tooltip or readout (date + value, plus the delta from the previous value) | Users want the exact value and when it changed | Med | Tap or hover shows the readout. The delta is cheap because the data is change-only |
| Empty and single-point state: "변동 없음 since {date}" showing the current value, with a flat line or a text card, not a broken chart | Most ETFs will have 0 to 1 changes since 2026-02, so this is the **common case** | Low | Design it first. Show a flat line plus the caption "기록 시작일(2026-02) 이후 변동 없음" |
| Explicit data-start disclosure ("기록은 2026-02부터") | Honesty about backfill limits, and it avoids implying the fee was constant before that | Low | Applies to the backfilled data |
| Close via X button, ESC, backdrop click | Universal | Low | Mirror the privacyModal pattern |
| Keyboard: open with Enter/Space on the cell, focus moves into the dialog, focus returns to the triggering cell on close, Tab trap | WAI-ARIA dialog pattern | Med | `role="dialog" aria-modal="true" aria-labelledby`. Alternatively use the native `<dialog>.showModal()`, which gives ESC, the focus trap and inertness for free. Prefer this. |
| Cells made focusable: `tabindex="0"`, `role="button"` (or a real `<button>` inside the td), `aria-label` such as "총보수 변동 그래프 보기" | Keyboard and screen-reader access | Low | Add the click handler through delegation on tbody, not per cell |
| Discoverability affordance: dotted underline or small sparkline/chart icon, `cursor:pointer`, hover background, and a one-line hint above the table ("숫자를 누르면 변동 그래프") | Users don't guess that numbers are clickable. Morningstar and Naver use link-styled values or icons. | Low | On mobile there is no hover, so the visible icon or underline is required |
| Mobile: bottom-sheet or full-width modal, tap target of at least 44px, no hover dependency, tap point to pin the tooltip | Site is mobile-first | Med | The chart must be responsive. Use SVG `viewBox` with `width:100%`. Lock body scroll while open. |
| Text alternative for the chart: `role="img"` with `aria-label` summarizing it, plus a visible or sr-only table of (date, value) | A11y for SVG charts | Low | The list of changes can double as a visible "변동 내역" below the chart, which doubles as the tooltip fallback |
| i18n of all new strings and date/number formats (8 languages) | Existing site requirement | Med | Effort is mostly translation volume, not code |
| Loading and error states for the history fetch | Consistent with the table's loading/error states | Low | Reuse the `table_loading`/`table_error` pattern |

## Differentiators
| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Delta badges between steps on the chart (e.g. "-0.02%p") | Answers "did it get cheaper?" at a glance | Low | Data is already change-only |
| Red/blue colouring following Korean convention (up vs down) | Matches user expectations. For fees, a decrease is good. | Low | Existing changelog badge (`changeHtml`) likely already does this. Reuse its style. |
| Compare-with-category-average overlay | Context on whether the fee is high | High | Defer |
| Show all four fields as tabs in one modal | Fewer clicks. The user's spec is one field per modal, but tabs can be added cheaply once the modal exists. | Med | Nice-to-have. Keep out of MVP. |
| Small "변동 N회" indicator on cells that have history | Signals which cells are worth clicking and helps discoverability | Low | Needs the history index loaded up front (small file) or a derived count |
| Deep link `#history=CODE:field` | Shareable, and good for SEO or social sharing | Med | Defer |
| Link from the changelog page rows to the modal | Connects the existing feature to the new one | Low | Only if the modal is on a shared script |

## Anti-Features
| Anti-Feature | Why Avoid | Instead |
|---|---|---|
| Chart library (Chart.js, D3, etc.) | Static vanilla site, and a single simple step line does not justify the weight | ~100 lines of hand-built SVG |
| Zoom, pan, brush, range selector (1M/3M/1Y) | Data spans about 8 months with a handful of points. Range buttons add nothing. | Show the full history and the data-start note |
| Smoothed or interpolated lines | Misrepresents step-function fees | Step line |
| Crosshair drag-scrubbing | Overkill with few points, and it conflicts with touch scrolling | Tap-to-select points, or the list of changes |
| Price/NAV history charts | Out of scope. This is a fee-history feature. | None |
| Multi-ETF overlay compare | Scope creep | Later milestone |
| Hover-only tooltips | Breaks on mobile and on keyboard | Tap/focus plus an always-visible value list |
| Loading the full history in the initial page load | Hurts the mobile first render | Lazy-fetch on first click and cache in memory |
| Y-axis autoscale that hides scale (zooming into 0.001%) | Exaggerates trivial changes | Pad the range, and optionally include 0 |
| Making the entire row clickable | Conflicts with the existing code-cell copy and mobile card taps | Only the four fee cells |

## Feature Dependencies
```
History JSON schema + backfill script -> lazy fetch/cache
History fetch -> chart renderer (SVG step) -> tooltip/point readout
Modal shell (native <dialog> or generalized privacyModal) -> chart, empty state, a11y
Clickable-cell affordance (CSS + tabindex + delegation) -> modal open
i18n strings (8 langs) -> every UI element
Empty/single-point state -> needs the backfill to tell "no change" apart from "no data"
Nightly/monthly update job -> must append a change-only record (else chart goes stale)
```

## Dependencies on existing code
- `renderTable` (~870-891): add `data-field` and `data-code`, `tabindex`, and the affordance class to the four fee cells. Keep the existing `data-label`.
- Table `tbody` delegation: one click/keydown listener. Sort and filter re-render the tbody, so per-cell listeners would be lost.
- `formatPercent`: reuse for axis and tooltip formatting so the chart matches the table.
- The existing modal/ESC handler at ~152: generalize it, and beware that ESC may close the wrong modal if two are open.
- i18n dictionary: add keys x 8 languages.
- The changelog badge style can be reused for the deltas.
- The `data.json` update pipeline must also write history records, or the chart becomes stale after v1.3.

## MVP Recommendation
Prioritize, in order:
1. Snapshot store schema, and the backfill from git (the single-point case dominates, so verify how many ETFs have more than one point).
2. Modal shell with a11y (`<dialog>`, focus return, ESC, backdrop) and the clickable-cell affordance plus hint.
3. SVG step chart with time-scaled X axis, padded Y axis, held-to-today, point markers, and tap-to-read tooltip, plus the visible list of changes as the text alternative.
4. Empty/single-point state with the data-start disclosure.
5. i18n across all 8 languages.

Defer: field tabs, "변동 N회" indicator (a good second pass), deep links, category-average overlay, range selectors.

## Sources
- WAI-ARIA Authoring Practices, Dialog (Modal) pattern (HIGH): https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- MDN `<dialog>` element and `showModal()` (HIGH)
- Codebase read: script.js (table render ~870-891, modal ESC ~152, changelog ~1050+)
- Competitor behavior (Naver 증권, funetf, etfcheck, Morningstar TER history): general knowledge, not live-verified (LOW). Treat as convention, not a spec.
