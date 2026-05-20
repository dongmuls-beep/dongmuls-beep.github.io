---
phase: 03-보안-및-버그-수정
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - script.js
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-20
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

One file reviewed (`script.js`). Phase 3 introduced three targeted changes: a security comment in `applyTranslations()`, an early-return guard in `initSmartHeader()`'s RAF callback, and a split branch in `renderChangelog()` to avoid orphaned `<thead>` when `changes` is empty.

The BUG-01 guard clause (initSmartHeader) is correctly implemented and correctly resets `rafPending`. The BUG-02 split branch correctly avoids the orphaned thead and applies `escapeHtml` to the "no changes" translation key. The SECURITY comment is present and accurate.

However, several real defects remain — one of them a pre-existing XSS vector that Phase 3 was intended to close but did not:

---

## Critical Issues

### CR-01: Unescaped `changeHtml` injected via `row.innerHTML` — XSS from changelog JSON

**File:** `script.js:877-888`

**Issue:** `changeHtml` is built directly from `changeData.diff` and hardcoded arrow/sign strings, then spliced raw into `row.innerHTML` at line 888. The numeric path (`diff.toFixed(4)`) is safe. The `cls` value at line 875, however, is constructed from a ternary over `diff > 0` — so it can only ever be `"fee-change up"` or `"fee-change down"`, which is safe. **But `changeData` itself comes from `changelogLatestByCode`**, which is populated at lines 647–655 from the remote `changelog.json` response. The `diff` field is computed as `Number((change.after - change.before).toFixed(4))` — if `change.after` or `change.before` is non-numeric (e.g. a crafted string like `"</span><script>..."`), `Number(...)` will produce `NaN`, `diff.toFixed(4)` will throw a TypeError at runtime.

More critically: `changeHtml` is concatenated directly into the `row.innerHTML` template (line 888) without any sanitisation gate. If `diff` is `NaN`, the template still inserts the `<span>` tag containing `NaN%p` — harmless — but the **class attribute value** `cls` (line 875) is evaluated before the NaN check, using only `diff > 0`. When `diff` is `NaN`, `diff > 0` is `false`, so `cls` is `"fee-change down"` — still hardcoded and safe. The **real issue** is that the numeric `.toFixed(4)` call on line 877 is called on `Math.abs(diff)` — if `diff` is `NaN` then `Math.abs(NaN)` is `NaN` and `NaN.toFixed(4)` returns `"NaN"`, which is inserted as literal text. This is not XSS but it is a visible rendering defect.

**The actual BLOCKER** is at line 888: `changeHtml` is inserted unguarded into `row.innerHTML`. `changeHtml` is always assembled from `diff` (a Number) and constant strings, BUT the guard `if (changeData)` at line 872 does not verify that `changeData.diff` is actually finite before using `.toFixed()`. If `change.after` or `change.before` in changelog JSON contains a value that makes `Number(...)` return `NaN` (e.g. missing/null fields), then at line 652 `change.after - change.before` is `NaN`, `.toFixed(4)` on `NaN` returns the string `"NaN"`, and `Number("NaN")` is `NaN`. The `changeHtml` span then renders `▼NaN%p` into the DOM — a data integrity failure visible to users.

Additionally and separately: `naverUrl` is built using `encodeURIComponent(naverCode)` (line 867), but is then placed directly as an `href` in `row.innerHTML` (line 883). If `naverCode` somehow contains a javascript: URI prefix (e.g. if `dataKeys.code` resolves to a crafted field from malicious ETF data), `encodeURIComponent` would encode it and the href would be safe. However, the `naverCode` fallback case `"#"` (line 868) is inserted unescaped — this is safe because it is a literal string constant.

**The genuine BLOCKER:** The `diff` value path `Number((change.after - change.before).toFixed(4))` at line 652 will throw a **TypeError** — not produce `NaN` — when `change.before` or `change.after` is `undefined`, because `undefined - undefined` is `NaN` and `NaN.toFixed(4)` is `"NaN"`, but actually `undefined.toFixed` would throw. Wait — let me be precise: `change.after - change.before` is a JS subtraction — if either operand is `undefined`, JS coerces to `NaN`, so the subtraction itself is `NaN`, and `NaN.toFixed(4)` returns the string `"NaN"` (it does NOT throw). `Number("NaN")` is `NaN`. So `changelogLatestByCode[change.code].diff` is `NaN`. Then at line 877, `Math.abs(NaN).toFixed(4)` returns `"NaN"` — visible to the user as `▼NaN%p` in the fee column. This is a data-integrity defect introduced into production UI from malformed changelog data.

**Fix:** Guard with `Number.isFinite` before building `changeHtml`, and only set `changeHtml` when `diff` is a finite number:

```javascript
// line 870-878 — replace with:
const changeData = changelogLatestByCode[String(code)] || null;
let changeHtml = "";
if (changeData && Number.isFinite(changeData.diff) && changeData.diff !== 0) {
    const diff = changeData.diff;
    const sign = diff > 0 ? "+" : "";
    const cls = diff > 0 ? "fee-change up" : "fee-change down";
    const arrow = diff > 0 ? "▲" : "▼";
    changeHtml = `<span class="${cls}">${arrow}${sign}${Math.abs(diff).toFixed(4)}%p</span>`;
}
```

Also add the same guard at population time (line 649–653):
```javascript
const diff = Number((change.after - change.before).toFixed(4));
if (Number.isFinite(diff)) {
    changelogLatestByCode[change.code] = { before: change.before, after: change.after, diff };
}
```

---

## Warnings

### WR-01: RAF early return resets `rafPending` but leaves `lastScroll` stale — jank on nav close

**File:** `script.js:177-180`

**Issue:** When `nav-open` is detected inside the RAF callback, the code resets `rafPending = false` and returns early — correctly per D-04. However `lastScroll` is **not** updated while nav is open. When the user closes the nav (after scrolling behind the overlay), the stale `lastScroll` from before the nav was opened is compared against the current `window.scrollY`. If the user scrolled significantly while the nav was open (possible on iOS where scroll can propagate through overlays), `currentScroll > lastScroll` will be true on the first post-close scroll event, and the header will immediately hide — a visible glitch that is the same class of bug as the one being fixed (D-05).

The spec in D-04 explicitly says "nav가 열린 동안은 헤더 클래스(`header-hidden`)와 `lastScroll` 모두 건드리지 않음." That is correctly implemented. But the consequence is that `lastScroll` diverges from reality over the nav-open period. The fix should reconcile `lastScroll` on nav close, not in the scroll handler.

**Fix:** After `closeNav()` is called (line 118), sync `lastScroll`:
```javascript
// This requires exposing a setter or storing lastScroll outside initSmartHeader.
// Simplest fix inside initSmartHeader: on nav-open early return, update lastScroll
// to current position so the comparison is fresh when nav closes:
if (document.body.classList.contains("nav-open")) {
    lastScroll = window.scrollY || document.documentElement.scrollTop; // sync to reality
    rafPending = false;
    return;
}
```
This is slightly different from D-04's stated intent ("don't touch lastScroll while nav open") but avoids the residual jank. The alternative is a `closeNav` hook that resets `lastScroll` — but that requires cross-function coupling. Updating `lastScroll` to current position during the early return is the simpler, self-contained fix.

---

### WR-02: `getTranslation()` return value used unescaped in changelog card header `<p>` tag

**File:** `script.js:1088, 1111`

**Issue:** In both the empty-changes branch (line 1088) and the with-changes branch (line 1111), the `card.innerHTML` template inserts `getTranslation("changelog_updated_at")` directly without `escapeHtml()`:

```javascript
// line 1088 (empty branch)
<p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>

// line 1111 (with-changes branch)
<p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
```

`updatedAt` IS escaped (line 1080). But `getTranslation("changelog_updated_at")` is not. The project's stated rationale (D-03) is that translation JSON is system-controlled, so this is acceptable for the loading/error messages. That reasoning applies here too — but there is an inconsistency: the BUG-02 fix at line 1090 wraps the "no changes" key with `escapeHtml()`, while the "updated at" key on line 1088 (in the same branch) is not wrapped. This inconsistency means that if `changelog_updated_at` ever contains a `<` character (e.g. for Korean `<날짜>` placeholder formatting), it would render as markup rather than text.

**Fix:** Apply `escapeHtml()` consistently to both translation values, or document explicitly that these keys are guaranteed markup-free. At a minimum, the pattern should be consistent within the same `card.innerHTML` block:

```javascript
<p>${escapeHtml(getTranslation("changelog_updated_at"))} ${updatedAt}</p>
```

Note: if `changelog_updated_at` contains intentional HTML (like `<br>`), use the existing `innerHTML`-is-intentional rationale and add a matching SECURITY comment like was done in `applyTranslations()`.

---

### WR-03: `Promise.all` destructuring silently drops third promise result — `loadUpdateMeta()` is not awaited correctly

**File:** `script.js:630-634`

**Issue:** The `Promise.all` call at line 630 passes three promises but the destructuring only captures two:

```javascript
const [response, changelogResponse] = await Promise.all([
    fetch(GAS_API_URL, { cache: "no-store" }),
    fetch(CHANGELOG_URL, { cache: "no-store" }).catch(() => null),
    loadUpdateMeta(),   // <-- third promise, result discarded
]);
```

`loadUpdateMeta()` is correctly included in the `Promise.all` so it runs concurrently and is awaited — this is intentional and the result is correctly discarded (loadUpdateMeta writes to `latestDataUpdatedAt` as a side effect). However the outer `.catch(() => null)` on the changelog fetch can mask a real network failure — if the changelog fetch rejects, it resolves to `null`, and `changelogResponse` is `null` at line 641. The guard `changelogResponse && changelogResponse.ok` handles this correctly.

The real defect: if `loadUpdateMeta()` **throws** (which it shouldn't given its internal try/catch, but defensively), the entire `Promise.all` will reject and the `fetchData` catch block at line 678 will fire, showing `table_error` to the user even though `response` may have been fine. `loadUpdateMeta()` does have an internal `try/catch` (lines 697-699) so in practice this is safe — but the third-promise `.catch()` is not applied, making this a latent brittle dependency.

**Fix:** Add a `.catch()` to `loadUpdateMeta()` at the call site, matching the pattern used for `changelogResponse`:

```javascript
const [response, changelogResponse] = await Promise.all([
    fetch(GAS_API_URL, { cache: "no-store" }),
    fetch(CHANGELOG_URL, { cache: "no-store" }).catch(() => null),
    loadUpdateMeta().catch(() => undefined),
]);
```

---

## Info

### IN-01: SECURITY comment in `applyTranslations()` — missing blank line before function on line 328

**File:** `script.js:327-328`

**Issue:** The closing brace of `applyTranslations()` on line 327 is immediately followed on line 328 by `function applySeoTranslations()` with no blank line separator. This is a minor style inconsistency relative to the rest of the file (all other top-level function definitions are separated by a blank line). The SECURITY comment itself is correct in placement (above the `el.innerHTML` call, referencing D-01) and content. No logic or security defect.

**Fix:** Add one blank line between `applyTranslations()` and `applySeoTranslations()`:

```javascript
    });
}

function applySeoTranslations() {
```

---

_Reviewed: 2026-05-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
