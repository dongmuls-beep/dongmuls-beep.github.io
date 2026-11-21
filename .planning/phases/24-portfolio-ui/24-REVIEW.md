---
phase: 24-portfolio-ui
reviewed: 2026-11-21T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - portfolio/index.html
  - portfolio.css
  - portfolio/portfolio-view.js
  - portfolio/portfolio-format.js
  - portfolio/portfolio-chart.js
  - portfolio/portfolio-shell.js
  - portfolio/portfolio-store.js
  - tests/test_i18n_portfolio.py
  - tests/test_html_a11y.py
  - i18n/ko.json
  - i18n/en.json
  - i18n/ja.json
  - i18n/vi.json
findings:
  critical: 3
  warning: 6
  info: 5
  total: 14
status: fixes_applied
fixes_applied: 2026-11-21
---

# Phase 24: Code Review Report

**Reviewed:** 2026-11-21
**Depth:** standard
**Files Reviewed:** 13 (all 8 i18n packs checked programmatically for pf_ key parity and placeholder parity; clean)

## Summary

No XSS found: all user, file and data.json strings reach the DOM via textContent or setAttribute. The only innerHTML sits behind a fixed `modal_policy_*` / `footer_*` allow-list. `interp` is single-pass and uses a function replacer, so `$&` and placeholder re-scan injection are not possible. Hostile `__proto__` import JSON is harmless: rows are rebuilt field by field, and the code is checked against an allow-list. i18n pf_ blocks: 116 keys in every language, identical placeholders, no HTML.

Real defects are in storage validation, focus handling, and async state. Test files (`tests/portfolio_*_check.js`, `tests/test_i18n_portfolio.py`) were only skimmed. The a11y additions were checked for scope only.

## Critical Issues

### CR-01: Stored rows are never validated on load, and a failing save is silently swallowed

**File:** `portfolio/portfolio-view.js:163` (with `portfolio/portfolio-store.js:62-66,111-115,119-120`)
**Issue:** `load()` only checks shape (strings). It does not run `validateRows`. Any row whose code is no longer in `/data.json` (a delisted ETF is the realistic case), or any tampered or oversized list, loads into `state.rows`. After that, every `store.save()` returns `{ok:false,error:"INVALID_ROWS"}`. `saveRows()` passes it to `showStorage`, and `Format.storageErrorKey("INVALID_ROWS")` returns null, so the banner is cleared. Result: the user adds or deletes rows, sees success, nothing persists, and no message appears. Data loss on reload. Stored rows also bypass the 200-row cap and the code normalization used elsewhere (the view looks up `state.byCode[row.code]` raw, while Calc normalizes).
**Fix:** In `load()`, run `validateRows(m.rows, {allowedCodes, todayIso})`. Drop or flag invalid rows (keep the raw backup via `backupCorrupt`) instead of returning them. In the view, handle `INVALID_ROWS` from `save` by showing a banner key. Add a `pf_storage_invalid` key to all 8 packs and map it in `STORAGE_KEYS`.

### CR-02: Table is re-rendered asynchronously after every action, destroying keyboard focus

**File:** `portfolio/portfolio-view.js:227-231, 307-312, 315-320, 539-540, 737-738`
**Issue:** `rowsChanged()` calls `renderRows()` and `updateResults()`. `updateResults()` always ends in `loadPrices(...).then(recompute)`, even when `need` is empty (resolves on a microtask), and `recompute()` calls `renderRows()` again. That empties `#pf-rows-body` and rebuilds it. The `focus()` calls in `onRowsClick` (next delete button) and `onSubmit` (edit button after save) run synchronously before the microtask. The focused node is then detached, and focus falls to `<body>`. The same happens on a language change (`renderAll`) and when late prices arrive while a row button is focused. Keyboard and screen-reader users are thrown to the top of the page after every delete or edit-save. A node-based fake DOM does not model focus loss on detach, so the checks pass.
**Fix:** Do not rebuild rows in `recompute`. Update only the value cells (keep the `<tr>`s and update `td[3]` text), or restore focus after the rebuild:
```js
var ae = document.activeElement, act = ae && ae.getAttribute && ae.getAttribute("data-action"), idx = ae && ae.getAttribute && ae.getAttribute("data-index");
// ...after rebuild:
if (act) { var b = rowBtn(idx, act); if (b) b.focus(); }
```

### CR-03: Import file is read fully into memory with no size guard or error handling

**File:** `portfolio/portfolio-view.js:842-858`
**Issue:** `file.text()` / `FileReader` reads the whole file before `importRows` applies `MAX_IMPORT_CHARS` (1 MiB). A multi-hundred-MB file freezes or crashes the tab. `file.text().then(done)` has no `.catch`, and `fr.onerror` is not set. A read failure leaves an unhandled rejection with no user feedback. Any exception thrown inside `done` / `handleImport` is also swallowed there. The `input.value=""` reset therefore never happens, and re-selecting the same file will not fire `change`.
**Fix:**
```js
if (file.size > 2 * 1048576) { input.value = ""; resultMsg("pf_import_too_large"); announce(t("pf_import_too_large")); return; }
// and: file.text().then(done).catch(function(){ input.value=""; resultMsg("pf_import_format"); });
// fr.onerror = same handler
```

## Warnings

### WR-01: `onRetryPrices` bypasses the `fetchSeq` guard and clobbers newer state

**File:** `portfolio/portfolio-view.js:428-449`
**Issue:** The retry path is not sequenced. While it is in flight, the user can add or delete a row, which starts `updateResults` (new `seq`, its own `state.failed`). When the retry resolves, it overwrites `state.failed` with only its own subset, which drops failures from the newer fetch, then calls `recompute()` and `announce`. It also sets `aria-busy="false"` while a newer skeleton load is still pending. `state.failed = []` at line 435 also makes the warnings list lose entries immediately.
**Fix:** Take `var seq = ++fetchSeq` in `onRetryPrices` and bail if `seq !== fetchSeq`. Reconcile the button state first, so it is not left `aria-disabled`. Or merge: `state.failed = state.failed.filter(notRetried).concat(failed)`.

### WR-02: No timeout or abort on fetches, so a hung request wedges the page

**File:** `portfolio/portfolio-view.js:84-113, 251-262`
**Issue:** `loadingData` stays true and the retry button stays `aria-disabled` forever if `/data.json` hangs. `loadPrices` never resolves for a hung price file, so the summary skeleton and `aria-busy="true"` stay indefinitely. `updateResults`'s `.then` also has no `.catch`; an exception in `recompute` leaves the skeleton up with no error.
**Fix:** Use `AbortController` with a timeout (about 15 s) in both fetch helpers. Add `.catch` to the `updateResults` chain that sets `aria-busy=false` and shows the load error.

### WR-03: Chart cursor readout is silent for screen-reader users

**File:** `portfolio/portfolio-chart.js:184-209`
**Issue:** The group takes ArrowLeft/Right/Home/End/PageUp/PageDown, but the readout `<p class="pf-readout">` has no `aria-live`. The SVG is `role="img"`, so its content is not read either. Keyboard SR users get no feedback when moving the cursor. The only fallback is the details table, which is collapsed by default on narrow screens.
**Fix:** Add `readout.setAttribute("aria-live","polite")` (or `role="status"`), or give the group `aria-roledescription` and move the readout text into `aria-valuetext` via `role="slider"`.

### WR-04: `todayIso` is frozen at page load

**File:** `portfolio/portfolio-view.js:125-131`, `portfolio/portfolio-store.js:70`
**Issue:** `state.todayIso`, the `max` on the date input, and the store's `todayIso` are computed once. If the tab stays open across local midnight (KST users leave it open overnight), today's date is rejected as `DATE_FUTURE`, and the export filename carries yesterday's date. The fixed value is also used inside `Calc.compute`.
**Fix:** Recompute on `visibilitychange` / on submit and import (`state.todayIso = Format.localTodayIso()`), and pass a getter (`todayIso: function(){...}`) or recreate the store.

### WR-05: Language switch leaves the loading and error panels untranslated

**File:** `portfolio/portfolio-view.js:57-82, 861-870`
**Issue:** `renderAll` returns early when `!booted`. The load-error text and retry button are built once with `t()` and are never refreshed. A user who switches language while seeing the error keeps the old-language message. The same goes for the `pf-import-result` box, which holds already-translated text and is not re-rendered by `renderAll`.
**Fix:** Store the last result or error key and re-render it in `renderAll` (as `errKeys` does for form errors). For the pre-boot panels, re-call `renderError()` if the error is showing.

### WR-06: Blob URL revoked on a zero-delay timeout

**File:** `portfolio/portfolio-view.js:760`
**Issue:** `URL.revokeObjectURL(url)` after `setTimeout(...,0)` can cancel the download in Firefox and Safari. They start the fetch asynchronously after `click()`. Node checks cannot show this.
**Fix:** `setTimeout(..., 1000)` (or 4000) before revoking.

## Info

### IN-01: Magic numbers duplicated in the view

**File:** `portfolio/portfolio-view.js:813` (`{ max: 200 }`), `:807` (20), `:507` (`640px`), `:526` (150)
**Issue:** `{max:200}` hardcodes `Calc.LIMITS.MAX_ROWS`. `importErrorItems` already supplies `vars.max`, so the override is redundant and drifts if the limit changes.
**Fix:** Use `it.vars` directly and name the other constants.

### IN-02: Missing or odd data fields render as the literal "undefined"

**File:** `portfolio/portfolio-view.js:37, 123`
**Issue:** `String(r["종목명"])` yields "undefined" or "null" for a data row without a name. `nameOf` of a code not in `byCode` (e.g. `__proto__`) returns the string "undefined", because `byCode["__proto__"]` is `Object.prototype`.
**Fix:** Create `byCode` with `Object.create(null)` and fall back to the code when the name is not a non-empty string.

### IN-03: `exportText(rows)` exports unvalidated memory rows

**File:** `portfolio/portfolio-store.js:129-133`
**Issue:** Rows are not validated or normalized before export, so a file can be produced that this same importer rejects. It also writes `LAST_BACKUP` even though `lastBackup()` is never used by the UI (dead feature).
**Fix:** Validate or normalize first, or document that export mirrors the in-memory rows. Either wire the `lastBackup` display or drop it.

### IN-04: Combobox option ids built from raw codes

**File:** `portfolio/portfolio-view.js:568`
**Issue:** `"pf-opt-" + code` is used as an IDREF in `aria-activedescendant`. A code containing whitespace (not an issue for current KRX codes) would break the reference.
**Fix:** Use an index-based id: `"pf-opt-" + i`.

### IN-05: Scroll hint is shown while the table is hidden

**File:** `portfolio/index.html:149`
**Issue:** `.cmp-scroll-hint` is always visible, including when `#pf-rows-wrap` is hidden (no rows), where it is irrelevant noise for screen readers.
**Fix:** Toggle it together with `pf-rows-wrap` in `renderRows`.

---

_Reviewed: 2026-11-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Fixes applied

Fixed (one commit each, `git log --grep "fix(24)"`):

- CR-01: `load()` drops rows no longer valid (unknown code, over cap), backs up the raw value and returns `ROWS_DROPPED`; `storageErrorKey` maps `ROWS_DROPPED` and `INVALID_ROWS` to the new key `pf_storage_invalid` (all 8 packs, parity tests updated to 117 keys). Valid rows stay saveable.
- CR-02: `renderRows()` remembers the focused row button and refocuses the same action/index after the rebuild (delete, edit-save, language change, late prices). Verified in headless Chrome.
- CR-03: size cap (1 MiB) checked before reading; read error and handler exceptions show `pf_import_format`, input is reset.
- WR-01: `onRetryPrices` captures `fetchSeq`, releases the button when superseded, and merges failed codes instead of overwriting. Deviation: it does not bump `fetchSeq` (bumping would discard an in-flight `updateResults` and leave the skeleton up).
- WR-02: `fetchJson` with `AbortController` (15 s); `.catch` on the `updateResults` chain shows `pf_load_error`.
- WR-03: chart `onCursor` callback (keyboard only); view announces through `#pf-live`, throttled 400 ms. No second live region.
- WR-04: `refreshToday()` at submit, import, export, recompute and `visibilitychange`; store accepts a `todayIso` getter (bundled into the CR-01 commit).
- WR-05: load-error panel retranslated in place; import-result box rebuilt from a stored renderer on language change.
- WR-06: Blob URL revoked after 4000 ms.
- UI review: holdings table fits at >=1024px (tight padding, stacked actions, scroll hint whenever `.is-scrollable`); `pf-asof-note` / `pf-weights-title` / `pf-weight-name` styled; `.cmp-field-error:empty` hidden on the portfolio page; axis label halo.

Skipped:

- Info IN-01..IN-05: out of scope (critical and warning only).
- UI: chart gap above the plot. The CSS gap between chips and chart is already 16 px (measured); the remaining space is the SVG's internal top padding in `portfolio-chart.js`.
- UI: `.pf-btn-primary` hover state and cursor-line-on-edge: not in the requested list.
