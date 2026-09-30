# Technology Stack — v1.4 Additions

**Project:** etfsave.life (ETF fee comparison, static)
**Milestone:** v1.4 신뢰성·접근성·비교 도구
**Researched:** 2026-09-30
**Scope:** Only NEW capabilities. Existing KOFIA ETL, data/fee-history/changelog JSON, i18n, SVG chart, pytest + node CI are NOT re-researched.

## Verdict

**Zero new dependencies (Python or JS, runtime or dev).** Every v1.4 feature is covered by the Python stdlib and by browser platform APIs that are Baseline-widely-available. Do NOT touch requirements.txt or add a `<script src>`.
Confidence: HIGH for the platform APIs (long-stable, MDN/CPython documented; not re-verified live this session, since none are new). MEDIUM for the exact Atom details (from RFC 4287 knowledge).

Note: the codebase STACK.md says "Python 3.9", but `.github/workflows` sets `python-version: '3.11'`. Write feed and ETL code to be 3.9-compatible anyway (no `match`, no `X | Y` type hints, no `datetime.UTC`). `ET.indent()` is 3.9+, so it is safe.

## Recommended Stack (per feature)

### 1. p_float missing-value handling (Python, stdlib only)
| Technology | Version | Purpose | Why |
|---|---|---|---|
| `None` sentinel (+ `math.isfinite`) | stdlib | Return `None` on parse failure instead of `0.0` | `json.dump` writes `None` as `null` (valid JSON). NaN would be emitted as bare `NaN`, which is INVALID JSON and breaks `fetch().json()` in browsers. |

Integration points and traps:
- Change `p_float` to return `None` for unparseable input. Also reject `nan`/`inf`: `float("nan")` and `float("inf")` parse successfully, so guard with `math.isfinite`.
- Fee summation (총보수 + 기타비용 + 매매중개수수료 = 실부담비용): if any component is `None`, the total must be `None`. Never let `None` reach `+`, and never `or 0`.
- Changelog/fee-history diffing must skip a field when before or after is `None`. This is the point of the whole item: it stops fake 0 fee changes. Treat "None to number" as "no change recorded, keep the last known value."
- Do not use `float('nan')` or pandas `NaN` in the output dict. If a DataFrame is used, convert with `df.where(df.notnull(), None)` before dumping.
- Frontend: JS `Number(null) === 0` and `null + 1 === 1`, so `null` silently becomes 0 in arithmetic. Every render path (table, sort, chart, compare, calculator) needs an explicit `v == null` check that renders "–" or "N/A". Add a i18n key for it (8 packs).
- Tests: extend the existing pytest suite with parametrized cases ("N/A", "", None, "nan", "inf", "-", "1,234", "0.05%").

### 2. Mobile a11y / UI fixes (CSS + vanilla JS, no library)
| Technology | Purpose | Why |
|---|---|---|
| `transform: translateY(-100%)` on sticky header | C2 header hide | `top` on a sticky element is not a translation. Transform is compositor-friendly. Add `.site-header:focus-within { transform:none }`. |
| `requestAnimationFrame` throttle | H10 scroll handler | Built in. |
| `min-height: 44px`, `min-width` on `.changelog-table` | C3/C4 | Plain CSS. |
| `data-i18n-aria-label` attribute + small loop in existing `applyTranslations()` | C6 ARIA i18n | Extends the existing `data-i18n` convention, so no new mechanism. Generalize as `data-i18n-attr="aria-label:key,title:key2"` if more than aria-label is needed. |
| CSS-only skeleton (`@keyframes` shimmer, wrapped in `prefers-reduced-motion`) | H4 loading state | No spinner or skeleton library. |
| `role="status" aria-live="polite"` on the table region | H4 | Native ARIA. |
| `@media (hover:hover)`, `env(safe-area-inset-*)`, `viewport-fit=cover` | L4/M4 | Native. |

Not needed: axe-core, Lighthouse-CI, or a focus-trap library. axe-core could be used as a one-off manual audit outside the repo, but do not add it to CI or package.json. Scope was "Critical+Major" only, so skip the Medium/Low cleanup unless it is free.
Contrast: verify the replacement colors with a quick manual ratio calculation (WCAG formula) or the browser devtools. Do not add a dependency.

### 3. ETF direct compare (browser platform APIs)
| API | Purpose | Why / Notes |
|---|---|---|
| `URLSearchParams` + `history.replaceState` | Shareable `?compare=069500,102110` and `?lang=` coexistence | Read: `new URLSearchParams(location.search).get('compare')?.split(',')`. Write with `params.set('compare', codes.join(','))` (this also preserves the existing `lang` param). Do not hand-concatenate query strings. The comma is fine unescaped in a query value, and `URLSearchParams` encodes it as `%2C`. Both decode identically, but the encoded form looks uglier when shared, so build the string manually only for that key if pretty URLs matter. |
| `replaceState` (not `pushState`) for checkbox toggles | Avoid history spam | Use `pushState`/`popstate` only if "compare view" is a distinct navigable view. Recommended: compare view opens on the same page (no new HTML page, so no sitemap or SEO surface), and back button closes it. |
| Validate codes against loaded `data.json` | Security and robustness | Codes in the URL are untrusted. Whitelist against known codes, clamp to 2-4, dedupe, ignore unknown, and go through the existing `escapeHtml` for any echo. This matters because v1.1 was an XSS-hardening milestone. |
| `navigator.clipboard.writeText` (+ `execCommand('copy')` fallback, which the existing code-copy likely already has) | "Copy share link" button | Requires secure context (GitHub Pages is https). Reuse the existing copy helper. |
| Native `<dialog>` + `showModal()` | Optional for compare view | Baseline widely available (since 2022): gives focus trap, Esc, `::backdrop`, and inert background for free. Recommended for NEW UI (compare view) only if the existing fee modal is not already `<dialog>`. Do not migrate the existing modal (out of scope). If the existing modal has its own pattern, follow it for consistency. |
| localStorage | Do NOT persist selection | The URL is the single source of truth. It also avoids the M8 Safari private-mode throw. If persisting anyway, wrap in try/catch. |

Compare bar: a fixed-position `<div role="region" aria-label>` with `env(safe-area-inset-bottom)` padding. Checkboxes need real `<label>` + 44px hit area. Announce "N selected (max 4)" via `aria-live`. Disable unchecked boxes at 4, and explain why with text (not just disabled styling).

**Overlaid fee-history chart (existing custom SVG, extend it):**
- Reuse the existing monotone-curve path builder; refactor it to accept N series.
- fee-history.json records only change points (sparse). Build a UNION date axis across selected ETFs and carry-forward (step-hold) each series' last value into the shared x-scale before drawing. Otherwise series with different start dates misalign. Series starting later than the axis start begin at their first point (do not backfill with 0 or the first value). This is also where the `null` handling from item 1 matters.
- Series identification must not rely on color alone (WCAG 1.4.1): use the Okabe-Ito palette (`#0072B2 #D55E00 #009E73 #CC79A7`, colorblind-safe, 4 colors = the 2-4 cap) PLUS distinct dash patterns / end-of-line labels or a legend with matching markers.
- Add an `aria-label`/`<title>` + `<desc>` summary and a text table fallback (the change list already exists in the modal).
- Extend `tests/fee_chart_check.js` with a multi-series case (different start dates, one series null). No test framework: keep plain node `assert`.

**Number formatting:** `Intl.NumberFormat(locale, {style:'currency', currency:'KRW', maximumFractionDigits:0})`. Fee percentages: `{minimumFractionDigits:2, maximumFractionDigits:4}`. Map the site lang code to a BCP-47 locale (`zh` to `zh-CN`, `tl` to `fil`, others as is). `km` and `th` are supported in modern engines, but older Android WebViews may fall back to the default locale digits (LOW confidence; acceptable). Never hand-roll thousands separators. Check whether the site already has a helper (it likely formats via toFixed) and reuse or replace it with one shared formatter so the table, calculator, and compare view agree.
Optional: `notation:'compact'` for big KRW totals (e.g. "1.2억" in ko). Compact output is locale-specific, so check the output in all 8 langs before shipping, or skip it and use full numbers.

### 4. Cumulative cost calculator (pure JS, no library)
| Choice | Why |
|---|---|
| Plain `Number` (IEEE-754 double) | Displayed values are rounded to whole won; error at 1e-12 relative is irrelevant. Do NOT add decimal.js/big.js. |
| Closed-form future value, not a per-month loop, as the primary path | Deterministic and testable. A monthly loop is fine for ≤600 months and is easier to explain in code, so either works. Recommend the loop so the same code yields the per-year table/chart points. |
| Native `<input type="number" inputmode="decimal">` + `<input type="range">` optional | Mobile numeric keypad. Add `min/max/step` and `<label for>`. Parse with `Number()`, reject `NaN`/negative/`Infinity`, clamp horizons (e.g. 1-50 years) and return rates. No masking library. |
| Put the math in a pure function file/section with no DOM access | So `tests/*.js` can `require` it under node exactly like the existing chart check. If script.js is not importable from node (the existing chart check should show how it loads the chart code), extract the calculator to its own small `calc.js` guarded with `if (typeof module !== 'undefined') module.exports = ...`. That is a plain script, not a bundler or ES module change. |

Model (state it in the UI as an assumption, since finance):
- Monthly rate `rm = (1 + r_annual)^(1/12) - 1`. Compare gross return `r` versus net `r - fee`, where `fee` is 실부담비용 (annual %).
- Balance loop per month: `B = (B + contribution) * (1 + rm_net)` (define the contribution timing, start or end of month, and document it).
- Cumulative cost per ETF = FV(no fee) - FV(with fee). This "fee drag" is what differentiates ETFs, and it is a difference of two near-equal large numbers, so keep doubles and only round at display.
- Use the CURRENT 실부담비용 held constant (fees change rarely; do not extrapolate history). Say so on screen. If the fee is `null` (item 1), show "N/A" and exclude that ETF from the cost ranking rather than computing with 0.
- Sync with compare: read the same `compare` codes; the calculator inputs may also go in the URL (`&amt=&yrs=&mon=&ret=`) via the same URLSearchParams code path so results are shareable. Clamp/validate on read.
- Disclaimer text is required (investment-info site, Korean regulatory sensitivity): "expected returns are assumptions, not guarantees." Add to the 8 i18n packs.

### 5. Static RSS/Atom feed (Python stdlib, generated in CI)
| Technology | Version | Purpose | Why |
|---|---|---|---|
| `xml.etree.ElementTree` | stdlib (3.9) | Build the Atom document | Handles escaping of `& < >` in ETF names. No f-string XML building, which produces invalid XML on `&` (e.g. names containing "&"). Use `ET.indent(tree)` (3.9+) for a readable diff-friendly file. |
| `datetime` (+ `timezone.utc`) | stdlib | RFC 3339 timestamps (`2026-03-11T00:00:00Z`) | Atom requires RFC 3339. |
| `email.utils.format_datetime` | stdlib | Only if RSS 2.0 is chosen (RFC 822 dates) | Not needed for Atom. |
| `hashlib` (sha1) | stdlib | Stable per-entry IDs | See below. |

**Recommendation: emit Atom 1.0 (`feed.xml`), not RSS 2.0.** Reasons: unambiguous date format (RFC 3339 vs RFC 822 pitfalls), mandatory unique `<id>`, explicit `xml:lang`, and every modern reader (Feedly, Inoreader, NetNewsWire, Thunderbird) supports it. If Korean users on legacy readers (rare) matter, RSS 2.0 could be added later from the same entry list. Serving `.xml` is safe on GitHub Pages (correct XML content type); avoid the `.atom` extension since its MIME mapping is not guaranteed (LOW confidence).

Build details:
- Namespace: `ET.register_namespace('', 'http://www.w3.org/2005/Atom')` then create elements as `{http://www.w3.org/2005/Atom}feed`, else you get `ns0:` prefixes. Write with `tree.write(path, encoding='utf-8', xml_declaration=True)`. Korean is fine as UTF-8.
- Feed-level: `<id>`, `<title>`, `<updated>`, `<link rel="self" href="https://etfsave.life/feed.xml">`, `<link rel="alternate" href="https://etfsave.life/changelog/">`.
- Entry `<id>`: must be stable across regenerations, or readers show duplicates on every daily CI run. Use a `tag:` URI or a hash of `(month, code, field, before, after)` (e.g. `tag:etfsave.life,2026-03-11:0026S0-실부담비용`), NOT the run time or list index. `<updated>`: from the changelog `updatedAt` (date only, so use `T00:00:00+09:00` or `Z`). Never `datetime.now()`. The feed `<updated>` = max entry updated, so the file is byte-identical when nothing changed (avoids a pointless daily commit; verify that the workflow's commit step is diff-gated).
- Group entries: one entry per (code, date) with the fee fields folded into the summary, rather than one per field row (a single change emits 3-4 rows in changelog.json: 기타비용, 매매중개수수료, 실부담비용). Focus on 실부담비용 changes; drop noise rows. Direction: the requirement calls it a "수수료 인하 RSS" (cuts) in PROJECT.md but "all fee changes" in the milestone brief. Recommend all changes with the direction (인하/인상) in the entry title. This is a product decision, so confirm at requirements time.
- Limit to the most recent N entries (e.g. 50-100) to keep the file small.
- Content is Korean only (do not attempt per-language feeds; the changelog data has no translations). `<summary type="text">`, plain text, so no HTML escaping surprises.
- Data source: read `changelog.json` only. Skip entries with `null` before/after (item 1 dependency).
- Where: a new `scripts/generate_feed.py` (the repo already has `scripts/`), called by the daily workflow after the ETL step and before the commit step; add `feed.xml` to the commit's `git add`. Testable under pytest: parse the output with `ET.parse`, assert the ID stability across two runs, escape of `&`, and the entry count.
- Discovery: add `<link rel="alternate" type="application/atom+xml" title="etfsave.life 수수료 변동" href="/feed.xml">` to `<head>` of index.html and changelog/index.html (the hreflang `rel=alternate` links already coexist fine, since `type` differentiates), a visible "RSS" link in the changelog page footer, and a `feed.xml` line in sitemap.xml (optional).
- Validation: run the W3C Feed Validator (validator.w3.org/feed) manually once. Do not add a feed library (feedgen, feedparser); `feedparser` as a test-only dep is tempting but unnecessary because `ET.parse` covers well-formedness.

## What NOT to add

| Do not add | Why |
|---|---|
| Any charting lib (Chart.js, D3, uPlot) | The custom SVG chart exists and was a deliberate decision (monotone curves, v1.3). Extend it to N series. |
| feedgen / feedparser / PyRSS2Gen / jinja2 | ~60 lines of ElementTree do this; avoids new pip installs in the CI hot path. |
| Any JS framework, lit, alpine, htmx, preact | Project constraint. |
| decimal.js / big.js / numeral.js / accounting.js | Doubles suffice; `Intl.NumberFormat` handles formatting. |
| A URL/router library | `URLSearchParams` + `history.replaceState`. |
| Modal/dialog polyfills (a11y-dialog, micromodal) | Native `<dialog>` is broadly supported; the existing modal pattern suffices. |
| Skeleton/spinner packages | ~15 lines of CSS. |
| axe-core / pa11y / Playwright in CI | Heavy for a static site; `ui-review.md` is code-audit based. A manual real-device check (iOS VoiceOver, TalkBack) is the better use of time. Consider Playwright only if future milestones need e2e. |
| pandas NaN as the missing marker | Produces invalid JSON (`NaN`). Use `None`. |
| Server-side share links / URL shorteners | No backend. The long `?compare=` URL is fine (short with max 4 codes). |
| Bundler / TypeScript / npm package.json | The node CI check runs bare scripts. Keep that. |

## Version notes (nothing to install)

| Item | Version | Note |
|---|---|---|
| Python | 3.9 target (CI runs 3.11) | `xml.etree.ElementTree.indent` needs ≥3.9. |
| pytest | already in requirements.txt (unpinned) | Reuse. No new test dep. |
| Node | whatever CI's runner has (`node tests/fee_chart_check.js`) | Do not use `node:test` unless the runner's Node is ≥18. Plain `assert` works everywhere. |
| Browsers | Evergreen Chrome/Safari/Firefox/Samsung Internet | `<dialog>`, `URLSearchParams`, `Intl.NumberFormat`, `clipboard` all Baseline. Avoid `Intl.DurationFormat`, `:has()` for critical logic, and `structuredClone` polyfill worries. Optional chaining is fine. |

Installation:
```bash
# No changes. requirements.txt untouched. No package.json.
```

Housekeeping observation (not v1.4 scope): requirements.txt is unpinned and lists `beautifulsoup4`/`lxml`/`yfinance`, which the older codebase notes call possibly unused. Adding nothing new is consistent with the constraint; pinning is a separate cleanup and should go to the backlog, not this milestone.

## Sources

- CPython stdlib docs, `xml.etree.ElementTree` (`indent` added in 3.9, `register_namespace`), `datetime`, `email.utils`, `json` (NaN handling; `allow_nan`): docs.python.org (training knowledge, not re-fetched; MEDIUM-HIGH)
- RFC 4287 (Atom Syndication Format), RFC 3339 (timestamps): ietf.org (MEDIUM; knowledge-based)
- MDN: URLSearchParams, History.replaceState, `<dialog>`, Intl.NumberFormat, Clipboard API, `env(safe-area-inset-*)`: developer.mozilla.org (MEDIUM-HIGH; long-stable APIs)
- WCAG 2.1: 1.4.1 Use of Color, 1.4.3 Contrast, 2.4.1 Bypass Blocks, 2.5.5 Target Size; Okabe-Ito palette (Okabe & Ito, colorblind-safe palette)
- Project files read: `.planning/PROJECT.md`, `.planning/codebase/STACK.md`, `.planning/ui-review.md`, `etl_process.py:427` (p_float), `requirements.txt`, `.github/workflows` (Python 3.11, `pytest tests/`, `node tests/fee_chart_check.js`), `changelog.json` schema (month/updatedAt/changes[code,name,field,before,after])
- No live web verification was run this session, because every recommendation is a long-stable stdlib/platform API. The main LOW-confidence item is `.atom` MIME handling on GitHub Pages (avoided by using `.xml`).
