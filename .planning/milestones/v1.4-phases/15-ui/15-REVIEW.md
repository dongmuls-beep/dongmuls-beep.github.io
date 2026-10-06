---
phase: 15-ui
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - compare-select.js
  - compare-view.js
  - compare-chart.js
  - compare-calculator.js
  - compare.css
  - compare/index.html
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 15: Code Review Report

**Depth:** standard. **Status:** issues_found

## Summary

No XSS found. Every URL-derived or data-derived string (`?compare=` tokens, ETF names, calculator values) is escaped with `escapeHtml` exactly once before it reaches `innerHTML`. `formatFeeTemplate` does not escape, so there is no double escaping. `amt`, `yrs`, `mon` and `ret` are parsed to numbers and clamped by `CompareCalc.normalizeInputs`. The `?compare=` whitelist plus `CODE_RE` limits the codes. Calculator output goes through `renderResultHtml` with `esc()`. The issues below are logic and UI defects.

## Warnings

### WR-01: `.cmp-toolbar { display:flex }` overrides the `hidden` attribute
**File:** `compare.css:224`, `compare/index.html:101`, `compare-view.js:172-177`
**Issue:** `.cmp-toolbar` sets `display:flex`, which beats the UA `[hidden]{display:none}` rule. The repo has no global `[hidden]` rule (style.css only has `.modal-overlay[hidden]`; compare.css only has `.cmp-bar[hidden]`). The toolbar ("Copy link" / "Choose other ETFs") therefore shows during loading, on the error state and on the empty state (<2 valid ETFs). "Copy link" in those states copies a useless URL. `hideResults()` has no visual effect on the toolbar.
**Fix:** Add `.cmp-toolbar[hidden] { display: none; }` to compare.css. Better, add a scoped `.compare-page [hidden] { display: none !important; }`.

### WR-02: Calculator `onBlur` overwrites a valid field with its default when any other field is invalid
**File:** `compare-calculator.js:298-304, 306-316`
**Issue:** `onBlur` calls `rawFromInputs()`. That returns `null` if ANY field is NaN, so the code falls back to `normalizeInputs(DEFAULTS)`. Example: the user types "abc" in years, then types 5,000,000 in the amount field and blurs it. The amount is silently reset to 10,000,000, because `norm[f.key]` comes from DEFAULTS.
**Fix:** Normalize only the blurred field, e.g. `var raw = {}; raw[f.key] = n; var norm = CompareCalc.normalizeInputs(Object.assign({}, DEFAULTS, raw));`.

### WR-03: False "clamped" note for fractional years, and wrong limit shown
**File:** `compare-calculator.js:318-323, 359-364`
**Issue:** `normalizeInputs` rounds years (5.5 becomes 6), so `raw.years !== n.years` shows the "clamped to limit" note. `clampLimit` then reports `MIN_YEARS` (1), because the value is not greater than the maximum. The same happens for any non-integer year value, and for a monthly amount that needs no clamp.
**Fix:** Show the note only when the value was actually clamped, e.g. `raw > MAX || raw < MIN`. For years, show a separate "rounded" message, or none.

### WR-04: The shared `copyTimer` leaves the other copy button stuck on "Copied"
**File:** `compare-view.js:354-388`, `compare-calculator.js:246-248`
**Issue:** The toolbar button and the calculator button both call `copyCurrentUrl`, which does `clearTimeout(state.copyTimer)`. If the user clicks button A and then button B within 2 seconds, A's reset timer is cancelled. A stays on "Link copied" or "Copy failed" permanently until re-render.
**Fix:** Track the timer per button, e.g. `button._cmpTimer`, or use a `WeakMap`.

### WR-05: Initial render can be delayed 3 seconds, and the language observer is fragile
**File:** `compare-view.js:415-434`
**Issue:** When `currentTranslations` is empty at init, rendering waits for a mutation of `#cmp-title` or a 3 s timeout. In the default Korean case, applying translations may write identical text. That produces no `characterData` or `childList` mutation, so the user sees the skeleton for a full 3 s. The 3 s timer also fires after normal rendering and re-runs `renderAll`, which re-fires all subscribers. The calculator then rewrites its result `aria-live` headline, and the chart redraws. Screen-reader users hear a duplicate announcement. Using the DOM title node as an i18n-ready signal is fragile.
**Fix:** Expose a real hook from script.js, for example dispatch `etf:i18n-ready` after applying translations. Otherwise, in the timer callback, skip `markI18nReady` if `state.i18nReady` is already set.

## Info

### IN-01: Unused code in compare-chart.js
**File:** `compare-chart.js:13-18`
**Issue:** The `t()` helper is never called; only `plainT` is used. Dead code.
**Fix:** Remove it.

### IN-02: Chart is not redrawn on resize
**File:** `compare-chart.js:342-353`
**Issue:** Width is measured once in `draw()`. Rotating a phone or resizing leaves a stale `viewBox` width. `preserveAspectRatio` makes it scale, but the label/tick layout is computed for the old width.
**Fix:** Add a debounced `resize` listener that calls `draw()`.

### IN-03: Empty `<th scope="col"></th>` in the metric table header
**File:** `compare-view.js:118`
**Issue:** The empty corner header cell is announced as a blank header by screen readers.
**Fix:** Put a visually hidden label in it, e.g. `<span class="cmp-sr-only">` with the metric column name.

### IN-04: A truncated `?compare=` value can produce a bogus code
**File:** `compare-view.js:68`
**Issue:** `slice(0, 200)` can cut a longer token so that its first 6 characters form a valid whitelisted code. Very low likelihood, and not exploitable.
**Fix:** Drop the last token if the raw string was truncated, or reject inputs longer than the limit.

### IN-05: Miscellaneous a11y and i18n nits
**File:** `compare-calculator.js:28-30, 131, 356`, `compare-view.js:230-233`
**Issue:**
- `fmt` and `toLocaleString` are hardcoded to "ko-KR", so numbers in the calculator do not follow the selected language.
- With fewer than 2 valid-fee ETFs, the calculator silently shows no headline and no explanation.
- After the error state's Retry button is clicked, the button is replaced and focus is lost.
- The calculator has two overlapping live regions (`#cmp-calc-headline` and `CompareView.announce` for errors).
**Fix:** Use `currentLanguage` for locale. Show a "need at least two ETFs with a fee" message. Move focus to `#cmp-state` after retry. Keep a single live region.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Disposition (orchestrator, 2026-09-30)

Deadline directive: fix critical issues only. There were 0 critical findings.
- WR-01 to WR-05: **DEFERRED** to Phase 16 (or a gap-closure pass). They are recommended before public launch, and WR-01 (`.cmp-toolbar[hidden]{display:none}`) is a one-line fix.
- IN-01 to IN-05: **DEFERRED** (informational).

## Fix log (2026-09-30)
- WR-01 FIXED: `.cmp-toolbar[hidden] { display: none; }` added to compare.css (asserted in compare_css_check).
- WR-02 FIXED: `onBlur` normalizes only the blurred field over DEFAULTS; dead `rawFromInputs` removed (compare_calculator_check).
- WR-03 FIXED: years are compared after `Math.round`, so fractional years round silently with no clamp note; the note appears only on a real clamp (compare_calculator_check).
- WR-04 FIXED: per-button `button._cmpTimer` replaces the shared `state.copyTimer` (compare_view_check: A and B both reset).
- WR-05 FIXED (fallback path): the fixed 3 s timer is replaced by a 100 ms poll of `currentTranslations` (max ~3 s) that returns early once `state.i18nReady` is set, so there is no late duplicate `renderAll`. No `etf:i18n-ready` event was added, because script.js is out of scope.
