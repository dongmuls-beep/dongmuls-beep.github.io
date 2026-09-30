# Domain Pitfalls: v1.4 신뢰성·접근성·비교 도구

**Domain:** Adding missing-value handling, mobile a11y fixes, ETF compare, cost calculator and RSS to an existing static GitHub Pages + daily-ETL vanilla-JS site (8 languages)
**Researched:** 2026-09-30
**Confidence:** MEDIUM-HIGH. ETL/changelog/fee-history items are code-verified (etl_process.py, scripts/build_changelog.py, scripts/build_fee_history.py, script.js, daily_update.yml, pre-commit hook). Financial-math, RSS and a11y items are standard practice and not verified against a running build. The KOFIA "-"/blank semantics are unverified (see Gaps).

Units to remember: all fee fields in data.json are percent numbers (0.09 means 0.09%), not fractions. Codes can be alphanumeric (0026S0, 0069M0), so never `parseInt`/`Number()` a code.

---

## Critical Pitfalls

### Pitfall 1: p_float returns NaN for blank Excel cells, so the "None" fix misses the real failure case
**What goes wrong:** `p_float` does `float(str(v)...)`. A blank pandas cell is `float('nan')`, `str()` gives `'nan'`, and `float('nan')` succeeds, so no exception fires. NaN flows into `total + other`, then `round(nan, 4)`, then `json.dump`, which emits bare `NaN` (invalid JSON; `JSON.parse` fails and the whole site shows the error state). Strings like `'inf'`, `'-'` and `'—'` behave differently again. Only true junk hits the `except`.
**Why it happens:** The v1.3 debt note says "parse failure returns 0.0", but only some failures do. NaN and inf need an explicit `math.isfinite` check.
**Consequences:** Either a site-wide JSON parse break, or (after a naive None fix) NaN slips through `is None` checks.
**Prevention:**
- Return None for anything that is not `math.isfinite(result)`. Add tests for `float('nan')`, `'nan'`, `'-'`, `'inf'`, `'1e400'`, `'0,05 %'`.
- Write data.json with `json.dump(..., allow_nan=False)` so any leak fails CI loudly.
- Keep "column absent" distinct from "cell unparseable". Today an absent column silently becomes int `0` (`if col_total else 0`), which is the same bug in a different branch.
**Detection:** `grep -c NaN data.json`; a `JSON.parse` error on the live site; pytest with an all-blank row.
**Phase:** p_float / data-integrity phase (first).

### Pitfall 2: None crashes the ETL arithmetic and validators, or gets re-coerced to 0
**What goes wrong:**
- `ter = total + other` and `real_cost = ter + sell` raise TypeError on None.
- `validate_etl_results` does `COST_MIN <= cost <= COST_MAX` and `f"{cost:.4f}"`, and DATA-03 does `abs(new_cost - prev_cost)`. All raise TypeError on None.
- The `except Exception: raise` at the end of `process_data` turns one bad cell into a whole-ETL failure (no data update at all).
- The opposite mistake is `total or 0`, which reintroduces the exact bug.
**Prevention:** Decide the contract once. Recommended: if 총보수 is None, skip the row (or carry forward the previous day's row) and log a WARNING. Never emit a partial `실부담비용`. If only 기타비용 or 매매중개수수료 is None, set `실부담비용` to None too (do not sum the known parts). Make the validators None-aware ("missing" warning, not crash). Carry-forward beats emitting null because it keeps every downstream consumer unchanged.
**Detection:** Unit test that feeds process_data one row with a blank fee and asserts (a) no exception, (b) no 0.0 in output, (c) validators pass.
**Phase:** p_float phase.

### Pitfall 3: Null in data.json creates a fake changelog entry and a fake fee-history point
**What goes wrong:** `build_changes` skips only when both sides are None. If yesterday was 0.09 and today is None, `before != after` is true, so it records `{before: 0.09, after: null}`. The next day it records `{before: null, after: 0.09}`. That is two junk entries, and the RSS feed will publish them as a "fee change". In `script.js` line 675, `Number((change.after - change.before).toFixed(4))` computes `null - 0.09`, which silently coerces null to 0 and shows a fake "-0.09%p" drop.
**Why it happens:** to_float already returns None for empty values, so the diff logic looks null-safe but is not null-transition-safe.
**Prevention:**
- In `build_changes`: `if before is None or after is None: continue`.
- Carry the last known value forward in fee-history. `normalize()` returning None must mean "skip this point", never "record a drop".
- Frontend: guard with `Number.isFinite(change.before) && Number.isFinite(change.after)` before computing diff; render "-" for missing values.
- The v1.2 50% bulk-correction rule does not catch this (one code, not 50%).
**Detection:** grep changelog.json for `null`; a test asserting `build_changes` yields nothing for a None transition and that fee-history gets no new point.
**Phase:** p_float phase (same phase as Pitfall 2; test the whole chain ETL -> changelog -> fee-history).

### Pitfall 4: Sorting and rendering with null/NaN silently reorders the "cheapest ETF" table
**What goes wrong:** The table sorts by `실부담비용` ascending (script.js ~871). `null` compares as 0 in `a - b`, so a missing-fee ETF jumps to rank 1 as "cheapest", which is the fake-zero bug moved to the frontend. `.toFixed` on null throws and kills the whole render. The same applies to the compare view (best-value highlight) and the calculator (null becomes 0% fee, so the tool says the ETF is free).
**Prevention:** One shared `isValidFee(x)` helper (`Number.isFinite`). Sort invalid values last, render "-" (or a localized "N/A" via i18n), and exclude them from "lowest" highlights, compare rows and calculator inputs (disable with a message). Prefer the ETL carry-forward so this is defense in depth only.
**Detection:** Test fixture with one null fee; screenshot the sorted table.
**Phase:** p_float phase for the table; re-check in the compare and calculator phases.

### Pitfall 5: `?compare=` URL is untrusted input, and it collides with the existing URL sync code
**What goes wrong:**
- Unknown or malicious codes: `?compare=<img src=x onerror=...>` is injected via innerHTML. The codebase has many innerHTML sites; `escapeHtml` exists but is not applied everywhere.
- Shape assumptions: `parseInt(code)` or `/^\d{6}$/` breaks 0026S0 and 0069M0, so the alphanumeric ETFs (the ones already fixed in v1.2 DATA-04) become uncompare-able. Case: `0026s0` in a hand-typed URL will not match.
- Duplicates (`a,a,a`), more than 4 codes, or 1 code all need defined behavior.
- `syncLanguageParam` / `syncCategoryParam` use `new URL` + `replaceState`, so a naive `history.replaceState({}, "", "?compare=...")` deletes `lang` and `category`; language switching does the reverse and drops `compare`.
- Category presets: on category-preset pages `syncCategoryParam` returns early. Compare must define whether it works on those pages.
**Prevention:**
- Never render code strings from the URL. Build the selection as `allData.filter(d => wanted.has(d.종목코드))`, so only known data objects reach the DOM, and still `escapeHtml` any text.
- Validate with `/^[0-9A-Z]{6}$/` after `.toUpperCase()`, dedupe, cap at 4 (ties to the 2~4 requirement), and silently drop unknown codes with a small localized notice ("N codes not found"). Fewer than 2 valid codes means show the normal table, not an error.
- Use one shared `updateUrlParams({compare, lang, category})` helper built on `URL.searchParams` (never string concat). Use comma-separated values with `encodeURIComponent` not needed for `[0-9A-Z,]`.
- Use `replaceState` for selection changes (avoid flooding history); parse once on load and again on `popstate`.
- Selection state must survive re-render: `filterAndRenderTable` rebuilds every row, so checkbox `checked` state must be derived from a `Set`, not from the DOM. Also selected ETFs may be hidden by the category filter, so keep them in the sticky compare bar.
**Detection:** Manual URLs: `?compare=0026S0,360750`, `?compare=zzz`, `?compare="><script>`, `?compare=` with 6 codes, `?lang=en&compare=...` then switch language.
**Phase:** Compare phase.

### Pitfall 6: Cost-calculator compounding mistakes (fee as annual %, applied monthly)
**What goes wrong:**
- Fees are percent (0.09), so using `0.09` as a rate instead of `0.0009` overstates cost 100x.
- Annual fee subtracted from annual return, then compounded monthly with the wrong periodization: `(1+r/12)^12` is not `1+r`. Use `(1+r)^(1/12)-1` consistently, or state the convention.
- Contributions timing (start vs end of month) changes results by about one month of return; pick one and label it.
- Fee drag definition is ambiguous: "total cost" as (gross final value - net final value) needs the same contribution stream on both paths; comparing against 0% fee vs against another ETF are different numbers.
- Mixing 실부담비용 (already includes 매매중개수수료, which is a transaction-cost estimate, not an annual holding fee) as if it were a pure annual expense ratio. Users may read the output as an exact figure.
- Float accumulation over 360 monthly steps is fine for display, but do not round inside the loop; round only at output. Do not use `toFixed` for currency (returns strings, banker-ish edge cases); use `Math.round` then `Intl.NumberFormat`.
- Input handling: empty string becomes 0, negative, `NaN`, 1e21 lump sums, decimal "1,000,000" pasted with commas, and full-width digits from Korean IMEs. Use `type="text" inputmode="numeric"`, strip commas, clamp (for example 0..1e12 KRW, years 1..50).
- Formatting: `toLocaleString("ko-KR")` is hard-coded in existing code; the calculator serves 8 languages, but KRW amounts should keep KRW (with 원 / 만원 / 억 units localized via i18n, not hard-coded Korean strings). Do not localize the currency itself.
**Prevention:** Put the pure math in a separate function (no DOM) and unit test it with hand-computed cases (lump sum 1,000,000 x 10y x 0% fee equals a known value; 0% return equals sum of contributions minus simple fee). The repo has a node test precedent (`tests/fee_chart_check.js`), so add a node check to CI.
**Detection:** Compare with a spreadsheet for 3 scenarios before shipping.
**Phase:** Calculator phase.

### Pitfall 7: Calculator reads as financial advice (legal/trust risk in Korea)
**What goes wrong:** Presenting a projected final amount with an "expected return" default (for example 7%) can be read as return prediction or investment solicitation. Korean regulation (Capital Markets Act, unregistered investment advice) makes this a real concern for a finance site, and the site already has a footer disclaimer.
**Prevention:** Frame the output as "cost difference" (fee drag), not "expected wealth". No pre-filled return that looks like a forecast: default it to a clearly labelled hypothetical, or make the user enter it. Put a disclaimer adjacent to the result (not only in the footer), translated in all 8 packs. Show that past fee data is not a forecast, that 매매중개수수료 is an estimate, and that taxes/FX/tracking error are excluded.
**Phase:** Calculator phase (copy review as an explicit task).

### Pitfall 8: RSS feed built in CI misses the CI-only writer rules and creates unstable GUIDs
**What goes wrong:**
- **Generating locally or in a step that the pre-commit hook affects.** The hook restores `data.json` from HEAD; `changelog.json` locally is stale/overwritten. Generate `feed.xml` only in the workflow after `Build Changelog` and add `feed.xml` to `file_pattern` in git-auto-commit-action, otherwise the file is generated but never committed (silent no-op). Never add it to the local sync path.
- **Unstable GUIDs.** changelog.json has no per-change ID; entries are grouped by `month` with an `updatedAt`. Using `updatedAt` or an array index as GUID changes when the entry is regrouped or the v1.2 idempotent cleanup rewrites it, and every subscriber sees all items as new. Use a deterministic GUID: `sha1(code|field|after|month)` or `tag:etfsave.life,YYYY-MM-DD:{code}-{field}`, with `isPermaLink="false"`. Do not include `before` if the pre-cleanup corrections might change it (decide and document).
- **pubDate.** RFC 822 requires English day/month names; `strftime('%a, %d %b %Y')` is locale-dependent (a Korean locale on a dev machine outputs Korean). Use `email.utils.format_datetime(dt)` with tz-aware KST (`+0900`) or UTC. Changelog dates are date-only (`updatedAt`), so pick a fixed time (for example 09:00 KST, matching the cron) and do not use `datetime.now()` (feed changes every run, and creates a commit every day).
- **Byte-identical output.** The daily workflow commits on any diff. If `lastBuildDate` is now(), the feed creates a daily noise commit and cache churn. Derive `lastBuildDate` from the newest item, and write only if content changed (same idempotent pattern as fee-history).
- **XML escaping.** Names like `S&P500` are in the data (`1Q 미국S&P500`); an unescaped `&` makes the feed invalid XML and readers drop the whole feed. Build with `xml.etree.ElementTree` or `xml.sax.saxutils.escape`, not f-strings. Write UTF-8 with an XML declaration; strip control characters.
- **Junk items.** Feed only genuine fee decreases (per the milestone goal), not null transitions (Pitfall 3), not v1.2 bulk-correction entries, and only real `실부담비용`/`총보수` changes; cap at about 50 items or 6 months so the file stays small.
- **Discovery and content type.** Add `<link rel="alternate" type="application/rss+xml" title="..." href="/feed.xml">` to every page head (not only index). GitHub Pages serves `.xml` as `application/xml`, which readers accept; do not rely on a custom Content-Type. Use absolute `https://etfsave.life/...` links (feed readers have no base URL), a valid `atom:link rel="self"`, and item links that resolve (`/changelog/` plus an anchor, since per-item pages do not exist).
- **Language.** The feed is Korean-only; state `<language>ko</language>` and do not promise 8 languages.
- Add feed.xml to sitemap.xml and robots (optional). Validate with the W3C feed validator or `feedparser` in a pytest.
**Phase:** RSS phase (last; depends on Pitfall 3 clean data).

---

## Moderate Pitfalls

### Pitfall 9: A11y "fixes" that regress the existing behavior
**What goes wrong and prevention (from ui-review.md):**
- **Sticky header (C2).** Switching `top:-80px` to `transform: translateY(-100%)` on a `position: sticky; backdrop-filter` element can create a new stacking context and change how the mobile nav dropdown positions; test with the hamburger open. The existing bug (nav open + scroll) is the same code path, so the fix should suppress hide while the nav is open or the header has focus (`:focus-within`, H5). Wrap the scroll handler in rAF (H10) in the same change, once.
- **Table min-width (C3).** `min-width: 560px` on the changelog table requires `.table-container { overflow-x: auto }` to be the actual scrolling ancestor; check that a parent `overflow: hidden` (glass card) does not clip it. Apply it inside the mobile media query only.
- **Touch targets (C4).** Raising `.tab-button`, `.share-button`, `.btn-link`, `.code-cell` to 44px makes wrapped tabs push the table down on 320px screens and can break the 2-column CTA layout; check at 320/375/414. The new compare checkboxes and calculator inputs must be built at 44px from the start, not retrofitted; the checkbox needs a 44px label hit area, not a 16px box.
- **Contrast (C1/H3/H9).** Removing the h1 gradient means also deleting the duplicated "Additive UI Refinements" block (H8, `style.css:1436-1525`); editing one copy is silently overridden by the other. Delete the duplicate first, then edit. Replacing `#38bdf8` with a token needs the token to exist (`--primary`) and to pass 4.5:1 on the real backgrounds (compute, do not eyeball).
- **ARIA i18n (C6).** Adding `data-i18n-aria-label` needs the keys in all 8 packs (`ko, en, vi, zh, ja, th, tl, km`) or the existing behavior shows the key name (the known `getTranslation` fallback bug). There is an i18n test in tests/, so extend it to assert key parity across the 8 files; also call the new attribute pass in the same `applyTranslations()` path that language switching calls, otherwise labels stay stale after switching.
- **Mobile table semantics (C5).** The card-stack pattern hides `<thead>`. Adding `aria-label` per `<td>` bloats the DOM and is re-applied on every filter re-render; if compare/calculator introduce new tables, choose "real table + horizontal scroll" and do not extend the CSS-generated-label pattern.
- **Loading/error states (H4).** `role="status" aria-live` on `#tableBody` announces the entire table on every re-render; put the live region on a separate status element, not on the tbody.
- **Verification gap.** There is no live-browser or axe test. Add at least a contrast computation script and a manual 320px/VoiceOver/TalkBack checklist per phase.
**Phase:** A11y phase. Do it before compare/calculator so their new UI inherits the fixed tokens and touch sizes.

### Pitfall 10: Editing script.js / style.css with the wrong encoding, and the OneDrive/hook traps
**What goes wrong:** script.js and style.css are UTF-8 BOM + CRLF. Editing tools that rewrite whole files as LF/no-BOM produce a whole-file diff, break blame, and can garble Korean if re-encoded. New files (feed generator, calculator module) must follow repo convention deliberately, not accidentally. OneDrive breaks git worktrees, so do not use worktree-based parallel execution. The pre-commit hook overwrites local `data.json`, and `changelog.json` is overwritten by a local sync, so any local test of the RSS/ETL chain must use fixtures or temp copies and never commit regenerated data files. fee-history.json has CI as sole writer; do not have any new script (feed, backfill "fix" for None) write to it.
**Prevention:** After every edit, `git diff --stat` should show small line counts; check BOM and CRLF are intact (`file script.js`). Keep new logic in separate new files where reasonable (for example `compare.js`, `calculator.js`) to shrink the CRLF blast radius, but note each needs a `<script>` tag on each page that uses it plus service worker/sitemap considerations (none exist).
**Phase:** All phases.

### Pitfall 11: New features add pages/keys without i18n, SEO and analytics parity
**What goes wrong:** Compare and calculator UI strings need 8 translations; missing keys render as raw key names (existing bug). If the calculator is a new page (`/calculator/`), it needs the shared header/footer/hamburger, hreflang alternates, sitemap entry, canonical, and structured data consistent with other pages (all pages duplicate the template, no partials, so changes need 6+ files). If compare is in-page, the `?compare=` URL is not indexable and should not create duplicate canonical URLs (canonical stays `https://etfsave.life/`).
**Prevention:** Decide page vs in-page early. Add a CI check that every key used by `data-i18n` exists in all 8 packs. Use `trackEvent` consistent with existing events, not new ad-hoc ones.
**Phase:** Compare and calculator phases.

### Pitfall 12: Overlaid comparison chart reuses the single-series chart with wrong assumptions
**What goes wrong:** The v1.3 chart is single-series, monotone curve, and each ETF has different change dates and history starts (backfill from 2026-02, only 59 ETFs). Overlaying needs a shared x-domain and step-carry-forward per series; naive concatenation misaligns. Series with a single point draw nothing. Y-axis auto-scale with fees in 0.01 to 0.5 range makes near-identical ETFs indistinguishable. Color-only series distinction fails contrast/color-blind rules (the exact a11y issues being fixed), so add direct labels, distinct dash patterns or markers, and a text legend. Reuse the existing SVG escape/format helpers; monotone interpolation with different x-samples per series can visually cross incorrectly. Cap at 4 series so colors stay distinguishable. Also fetch `fee-history.json` once (cache), not per compare toggle. Extend `tests/fee_chart_check.js`.
**Phase:** Compare phase (chart sub-step, after table compare works).

### Pitfall 13: Loading/error state and retry loops
**What goes wrong:** Adding a retry button that re-runs `init` twice registers duplicate event listeners (the code has many `addEventListener` without removal), so one click fires N times. Compare selection and the calculator rely on `allData`; on fetch failure they must be disabled, not throw.
**Prevention:** Use event delegation and idempotent init; test failure by blocking data.json.
**Phase:** A11y phase (H4) and again for the features.

---

## Minor Pitfalls

### Pitfall 14: Existing tests hard-code the buggy contract
`tests/test_fees.py` asserts `p_float(None) == 0.0`, `p_float("") == 0.0`, `p_float("N/A") == 0.0`. These will fail after the fix; update them deliberately (they are the spec change), and do not "fix" the fix to satisfy stale tests. Also other tests (`test_process_data.py`, `test_validate.py`) may build rows via p_float; run the full suite (145 tests) before/after.

### Pitfall 15: Sitemap and lastmod staleness
sitemap.xml has all `lastmod` 2026-02-14. New pages or the feed should be added; do not add a hand-edited lastmod that goes stale. Low priority.

### Pitfall 16: Copy-to-clipboard share link for compare
The existing share button and clipboard fallback use `execCommand`. A compare share link must include the current `lang` param and use the shared URL helper; `navigator.clipboard` fails on non-secure/older in-app browsers (KakaoTalk in-app browser is a primary Korean channel), so keep the fallback and test in it. Also `Intl`/`replaceAll` are fine, but avoid newer syntax the older Samsung/Kakao webviews may not support.

---

## Phase-Specific Warnings

| Phase topic | Likely pitfall | Mitigation |
|-------------|---------------|------------|
| p_float / None (do first; data foundation) | NaN passes through (P1); TypeError in sum/validators (P2); null creates fake changelog and fee-history entries (P3); null sorts as cheapest (P4); stale tests (P14) | isfinite check, carry-forward contract, `allow_nan=False`, end-to-end test ETL -> build_changelog -> build_fee_history, shared `isValidFee` in JS |
| Mobile a11y/UI (before new UI) | Sticky/transform stacking, duplicate CSS block override (P9), CRLF/BOM churn (P10), missing translation keys, aria-live on tbody | Delete duplicate block first, key-parity test for 8 packs, verify at 320/375/414, contrast computed |
| ETF compare | URL injection and alphanumeric codes (P5), lang/category param clobbering, selection lost on re-render, chart series misalignment (P12), null fees (P4) | Whitelist against `allData`, shared URL helper, Set-based state, cap at 4, extend node chart check |
| Cost calculator | Percent vs fraction and monthly compounding (P6), advice framing (P7), locale/currency formatting, input parsing | Pure tested function, hand-computed cases, adjacent translated disclaimer, cost-difference framing |
| RSS | Feed never committed (file_pattern), unstable GUID, non-English/locale dates, `&` escaping, daily noise commit, junk null/bulk items (P8, P3) | Generate only in CI after Build Changelog, hash GUID, `email.utils.format_datetime`, ElementTree, deterministic lastBuildDate, validate with feedparser in pytest |
| Cross-cutting | OneDrive worktrees, pre-commit hook overwrites, fee-history CI-only writer (P10); i18n/SEO parity (P11) | No worktrees, fixtures not live data, no new writers of fee-history.json |

## Suggested Ordering (from pitfall dependencies)

1. p_float/None chain (RSS and compare both consume this data)
2. Mobile a11y/UI fixes (new UI inherits tokens and 44px targets)
3. Compare (table then chart)
4. Calculator (independent; reuse the fee validity helper and URL helper)
5. RSS (needs clean changelog; CI-only)

Phases flagged for deeper research: Calculator (Korean regulatory wording and compounding convention decision), RSS (GUID scheme vs changelog regrouping; confirm the feed reader behaviors), p_float (what KOFIA actually emits for legitimately-zero versus missing 매매중개수수료: check `downloads/` sample files).

## Gaps

- Whether KOFIA uses "-" or blank for a legitimately zero fee (for example brand-new ETFs with no 매매중개수수료 yet). If "-" means 0, returning None for it would drop valid ETFs; inspect real Excel samples in `downloads/` before finalizing the per-field policy. (Not verified.)
- Regulatory guidance on the calculator disclaimer is a general concern, not legal advice; not researched with a legal source.
- Feed-reader behaviors (GUID handling, GitHub Pages `application/xml` type) are from standard practice, not tested against this deployment.
- No live-device a11y test results exist; ui-review.md is a static code audit only.

## Sources

- Code reads (HIGH): `etl_process.py` (p_float, process_data, validate_etl_results), `scripts/build_changelog.py` (to_float, build_changes), `scripts/build_fee_history.py` (normalize), `script.js` (changelog diff ~L668-675, escapeHtml, URL param sync), `.github/workflows/daily_update.yml` (file_pattern, step order), `.git/hooks/pre-commit`.
- `.planning/ui-review.md`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md` (HIGH for the project facts).
- Python `float('nan')` behavior, RFC 822 / `email.utils.format_datetime`, RSS 2.0 GUID semantics, WCAG 2.5.5/2.5.8 (MEDIUM: standard knowledge, not re-fetched in this session).
