# Project Research Summary

**Project:** etfsave.life — Milestone v1.4 "신뢰성·접근성·비교 도구"
**Researched:** 2026-09-30
**Confidence:** MEDIUM-HIGH (architecture/pitfalls code-verified; competitor UX and feed-reader behavior not live-verified)

## Executive Summary

v1.4 adds five things to a shipped static site: (1) ETL missing-value handling (`p_float` → `None`, not `0.0`/NaN), (2) Critical+Major mobile a11y fixes from `ui-review.md`, (3) 2–4 ETF compare with shareable `?compare=` URL and overlaid fee-history chart, (4) cumulative cost (fee drag) calculator, (5) CI-generated static feed.

All four research files agree: **zero new dependencies** (Python stdlib + browser APIs), extend the existing custom SVG chart, and do the data-trust fix first — a fake `0.0` fee ranks as "cheapest" everywhere and a NaN in `json.dump` breaks the whole site.

Biggest lever for speed is **file ownership**. `script.js`/`style.css` (UTF-8 BOM + CRLF) are the only collision hotspots. Compare/calculator code goes in new files; `script.js` gets only a ~10-line seam + null-safe hunks. Only two short serial gates remain.

## Parallel Build Order

OneDrive breaks git worktrees → parallel streams must own **disjoint files** on the main tree.

```
t0 ─────────────────────────────────────────────────────────────────────────►
P1   [p_float ETL + validators + changelog None-skip + pytest contract]─────┐
P2   [build_rss.py + feed.xml + tests/test_rss.py + workflow step]──────────┤
C-A  [compare-calc.js pure fn + tests/compare_calc_check.js]────────────────┼─► [Integration]
F-0  [script.js seam + null-safe hunks: ONE short commit]──┐                │
                                                           ├─► A11y  [style.css, script.js other hunks, 7 HTML, i18n aria_*]
                                                           └─► C-B   [compare-select/view.js, compare.css, i18n compare_*/calc_*]
```

| Wave | Streams | Precondition | Owns exclusively |
|------|---------|--------------|------------------|
| 0 (4-way) | P1, P2, C-A, F-0 | none | P1: `etl_process.py`, `scripts/build_changelog.py`, `tests/test_*.py`. P2: `scripts/build_rss.py`, `feed.xml`, `tests/test_rss.py`, `daily_update.yml`. C-A: `compare-calc.js`, its node test. F-0: `script.js` seam + 2 null hunks |
| 1 (2-way) | A11y, C-B | F-0 landed | A11y: `style.css`, other `script.js` hunks, 7 HTML, i18n aria/skip/retry/missing keys. C-B: new compare files, i18n `compare_*`/`calc_*` block |
| Integration (serial) | — | all above | RSS `<link>`, `sitemap.xml`, `/compare/` tags on index/isa/pension, `compare/index.html` from post-sweep template, CI node steps, 8-lang + device smoke |

Safety rules:
- `compare/index.html` and new tags on existing HTML only after A11y HTML sweep.
- i18n: A11y inserts near `aria_copy_code`; C-B inserts one block after `fee_history_*`; P1's `table_value_missing` coordinated with A11y; never append at EOF. Extend key-parity test.
- `daily_update.yml` single owner (P2).
- `document.dispatchEvent` only inside `fetchData`/`renderTable` — `tests/fee_chart_check.js` vm stub has no `dispatchEvent`.
- Done-criteria: `git diff --stat` + BOM/CRLF check on `script.js`/`style.css`/`build_changelog.py`. New files LF, no BOM.
- Tests use fixture JSON (pre-commit hook overwrites local `data.json`/`changelog.json`). CI stays sole writer of `fee-history.json`.
- Compare UI built at 44px / keyboard / translated from day one in `compare.css` using `var(--primary)`; re-verify against final a11y tokens in Integration.

## Key Findings

### Stack
- `p_float`: `None` sentinel + `math.isfinite`; `json.dump(allow_nan=False)`. Distinguish "column absent" (currently int 0) from "cell unparseable".
- Feed: `xml.etree.ElementTree` + `email.utils.format_datetime`. Never f-string XML (`1Q 미국S&P500` has `&`).
- Compare: `URLSearchParams` + `history.replaceState`, one shared URL helper (coexists with `lang`, `category`).
- Chart: extend SVG to N series; union date axis, step-hold carry-forward, Okabe-Ito + dash + legend (WCAG 1.4.1).
- `Intl.NumberFormat` for KRW (lang→BCP-47: `tl`→`fil`, `zh`→`zh-CN`); plain doubles, round at display only.
- A11y: `transform: translateY(-100%)`, rAF throttle, `data-i18n-aria-label`, CSS skeleton under `prefers-reduced-motion`. No axe/Playwright in CI.
- Python 3.9-compatible (CI uses 3.11).

### Features
**Table stakes:**
- D. Missing handling (blocks A–C).
- A. Compare: 2–4 checkboxes (real `<label>`, 44px), sticky compare bar, selection survives tab switch, real `<table>` with sticky first column + non-color "최저" marker, `?compare=` + copy-link, overlay chart with metric selector (default 실부담비용), empty/edge states.
- B. Calculator: lump sum, years, monthly contribution, annual return → total fees, cost drag (원/%), cheapest-vs-others diff; adjacent disclaimer; clamping; live recalc.
- C. Korean-only feed, stable GUIDs, autodiscovery + footer link, ≤50–100 items.
- E. a11y C1–C6 + H-items, 44px, translated ARIA.

**Differentiators:** "10년간 A보다 B가 약 N원 더 부담" headline; calculator params in URL (`amt/yrs/mon/ret`); year-by-year table.

**Anti-features / defer:** performance/tracking-error compare, tax modeling, chart library, per-language feeds, server-side saved comparisons, >4 ETFs.

### Architecture
- Compare = new static page `/compare/` (`noindex,follow`, canonical `/compare/`).
- New files: `compare-select.js` (checkbox in `.name-cell`, never new column, never inside role=button code cell; Set + compare bar; "비교하기" plain `<a href>`), `compare-view.js` (URL parse/validate, table, overlay chart, calculator UI; fetches `/data.json` itself), `compare-calc.js` (pure, node-testable), `compare.css`, `compare/index.html`.
- Reuses `script.js` globals (`allData`, `escapeHtml`, `loadFeeHistory`, `buildFeeHistoryPoints`, `computeFeeChartScale`, `buildFeeLinePath`, `FEE_CHART`) — verify cross-script visibility of top-level `const` in first spike.
- Feed: `scripts/build_rss.py` after Build Changelog in workflow; `feed.xml` added to `file_pattern`.

### Critical Pitfalls
1. NaN passes `float()` → invalid JSON → site-wide breakage.
2. None crashes `total + other`, `COST_MIN <= cost`, `:.4f`, DATA-03 delta → whole ETL aborts. Any None component → 실부담비용 None.
3. `build_changes` records one-sided None → fake changelog/RSS entries; `script.js` ~L675 `after - before` coerces null → fake drop; null sorts cheapest.
4. `?compare=` untrusted: uppercase, `/^[0-9A-Z]{6}$/` (0026S0, 0069M0), whitelist against `allData`, dedupe, cap 4, render only filtered objects.
5. Feed: unstable GUIDs, locale dates, `datetime.now()` churn, missing `file_pattern`.
6. Calculator: fees are percent (÷100); `(1+r)^(1/12)`; stated contribution timing; no forecast-looking default; disclaimer in 8 langs; frame as cost difference.
7. BOM/CRLF damage; duplicated "Additive UI Refinements" CSS block (delete first); `aria-live` on separate element, not `#tableBody`; duplicate listeners on retry.
8. `tests/test_fees.py` asserts `p_float(...) == 0.0` — update deliberately.

## Conflicts Resolved (recommendations)

| # | Topic | Recommendation |
|---|-------|----------------|
| 1 | Compare page vs modal | `/compare/` page |
| 2 | Selection storage | Table pages: in-memory Set + `sessionStorage` (try/catch); `/compare/`: URL authoritative. No `localStorage` |
| 3 | RSS 2.0 vs Atom | RSS 2.0 + `atom:link rel=self`, file `feed.xml`, `application/rss+xml` |
| 4 | GUID / granularity | One item per (code, updatedAt); `tag:etfsave.life,{updatedAt}:{code}`, `isPermaLink="false"`; fold fields; cap ~50 |
| 5 | Feed scope (spam) | **Decide at requirements.** Rec: items triggered by 총보수/기타비용 changes (both directions); 실부담비용/매매중개수수료 as support text only; never None transitions or bulk-correction entries |
| 6 | Missing value in data.json | `null` (row kept); frontend guards every consumer with `Number.isFinite` |
| 7 | Calculator conventions | Monthly loop, `g=(1+r)^(1/12)`, `h=(1-f)^(1/12)`, `f=실부담비용/100`, end-of-month contribution; years 1–50; return default 0% or user-entered, labelled hypothetical |
| 8 | Input type | `type="text" inputmode="numeric"`, strip commas/full-width, clamp |
| 9 | A11y ordering | Parallel + reconciliation check in Integration |
| 10 | Feed item link | `/changelog/` only |
| 11 | Script name / sitemap | `scripts/build_rss.py`; feed not in sitemap |
| 12 | Feed date source | `updatedAt` only; UTC/KST debt → backlog |

## Implications for Roadmap (6 phases)

1. **데이터 신뢰성** (Wave 0, P1) — p_float None, None-aware validators, `allow_nan=False`, changelog None-skip, fee-history no-point-on-None test, e2e chain test. Research flag: KOFIA `-`/blank semantics (no sample xlsx in repo; current data.json has one 0 value — WON 200 기타비용).
2. **script.js seam + null-safe frontend** (serial gate F-0, Wave 0) — events, `tr.dataset.code`, `buildFeeLinePath(..., startDate)`, `Number.isFinite` guard, null-last sort, missing render key, `isValidFee`.
3. **RSS feed** (Wave 0, P2) — build_rss.py, feed.xml, fixture tests (GUID stability, `&`, empty, None, byte-identical rerun), workflow step.
4. **모바일 접근성/UI** (Wave 1) — C1–C6 + H-items, ARIA i18n, loading/error/empty states. Flag: C5 table semantics decision.
5. **직접 비교 + 계산기** (C-A at Wave 0, C-B at Wave 1) — overlay chart as own plan. Flags: chart design, disclaimer wording, globals spike.
6. **통합·검증** (serial) — links, sitemap, tags, CI node steps, 8-lang/device smoke, BOM/CRLF audit.

## Gaps
- KOFIA `-` vs blank semantics (Phase 1 research).
- Feed scope decision (conflict 5).
- Calculator disclaimer wording (no legal review).
- `ui-review.md` line numbers may have drifted since v1.3.
- Sparse/single-point histories in overlay chart need defined rendering.
- Backlog debt: `build_changelog.py` UTC `datetime.now()`, unpinned requirements, stale sitemap lastmod.

Detail: `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`.

---
*Research completed: 2026-09-30*
