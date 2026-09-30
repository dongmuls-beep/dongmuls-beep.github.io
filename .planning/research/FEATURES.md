# Feature Landscape: v1.4 Compare, Cost Calculator, RSS

**Domain:** Static Korean ETF fee comparison site, adding direct ETF compare, cumulative cost calculator, RSS feed (plus data/a11y hardening)
**Researched:** 2026-09-30
**Confidence:** MEDIUM. Compare/calculator behavior rests on general knowledge of funetf, etfcheck, Naver 증권, ETF.com, Morningstar, Vanguard, FINRA Fund Analyzer. I did not do live verification of those sites (competitor behavior is LOW-MEDIUM). Cost-drag math and RSS 2.0/Atom specs are standard (HIGH). Data shape checked against local data.json / fee-history.json / changelog.json.

Scope: only what the NEW v1.4 features need. Existing table, chart modal, i18n, changelog are dependencies, not deliverables.

## Existing Assets Reused (verified in repo)

- data.json: array of {구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용, AUM, 거래량}. Fee values are in percent units (0.0047 means 0.0047%), so calculators must divide by 100.
- fee-history.json: {names:{code:name}, ...} change-point history per code (59 codes), already drives the v1.3 SVG monotone chart.
- changelog.json: [{month, updatedAt, changes:[{code,name,field,before,after}]}], the RSS source (up and down).
- Chart modal renderer (v1.3): reuse for the overlaid compare chart.
- translations.js / i18n: 8 languages; new strings needed for compare and calculator.
- escapeHtml discipline (v1.1 XSS work) applies to URL-param codes.

## Table Stakes

### A. ETF direct compare

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Checkbox per row in main table, select 2-4 | Naver/funetf/Morningstar all cap selection (typically 3-5) and use checkboxes | Med | Must be a real `<label>`/aria-labelled checkbox with 44px hit area (ties to ui-review C4). Mobile card layout has no header semantics (C5), so aria-label is required. Disable remaining boxes at 4 with a status message rather than silent failure |
| Sticky compare bar showing selected names, count, "비교하기" and clear | Universal pattern; users need to see selection state while scrolling/filtering | Med | Bar appears at 1+ selected; button disabled until 2. Must not overlap the footer or mobile safe area (ui-review M4). Add `role="status"`/aria-live for count |
| Selection persists across category filter tab changes | Users compare across categories (e.g. KODEX 200 vs TIGER 200 fine, but S&P vs Nasdaq crosses tabs) | Low | Keep selected codes in a Set in memory, not derived from DOM. Re-render must re-check boxes |
| Side-by-side compare view: rows = 총보수, 기타비용, 매매중개수수료, 실부담비용, AUM, 거래량, 구분 | Core of every compare tool | Med | Columns = ETFs. On mobile 4 columns is too wide: use horizontal scroll with sticky first column, real `<table>` semantics (do NOT repeat the data-label card pattern flagged in C5) |
| Highlight best (lowest) value per fee row, show delta vs lowest | Standard "winner" cue in Morningstar/ETF.com compare | Low | Do not use color alone (a11y H3): add a text/icon marker. Higher AUM/volume is "better" but display neutral, don't rank |
| Shareable URL ?compare=code1,code2 | Explicit requirement; standard for compare tools | Med | Parse on load, validate: whitelist against data.json codes, dedupe, cap at 4, drop unknown silently or show "종목을 찾을 수 없습니다". Alphanumeric KRX codes (e.g. 0026S0) must pass. Works on GitHub Pages only if compare view lives on the same index.html (query param) or compare/index.html; GitHub Pages has no rewrites. Use history.pushState/replaceState so back button closes the view |
| Copy-link / share button on compare view | Sharing is the point of the URL | Low | Reuse the existing .share-button; clipboard with try/catch fallback |
| Overlaid fee-history chart for selected ETFs | Explicit requirement; every price-compare tool overlays lines | High | Extend v1.3 monotone-curve SVG to N series. Needs a metric selector (default 실부담비용 or 총보수; fee-history holds per-field change points, confirm which fields) since lines per field x ETF gets unreadable. Series need distinct colors AND distinct dash/marker (color-only fails a11y). Step-hold each series to a shared date axis; ETFs with different start dates (backfill from 2026-02, some later) start late, do not extrapolate. Include legend and a text/table alternative |
| Empty/edge states | Missing data must not break | Low | ETF without history: show "이력 없음" in chart, still show table. Fewer than 2 valid codes from URL: fall back to table with hint |

### B. Cumulative cost calculator

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Inputs: lump sum (원), holding period (years), optional monthly contribution (원), expected annual return (%) | Vanguard, FINRA, Morningstar, every Korean 적립식 calc have these four | Med | Number inputs with inputmode="numeric", thousands separators, sane min/max, defaults (e.g. 1,000만원 / 10년 / 0 / 5%). Labels visible, not placeholder-only |
| Cost per ETF computed from data.json fee (실부담비용) | Site's core value | Low | Use 실부담비용 (already 총보수+기타+매매중개). Note: 매매중개수수료 is really a one-time trading cost in some models, but this site's definition treats it as annual-equivalent; keep consistent with existing "실부담비용" and state assumption in disclaimer |
| Result: ending balance with vs without costs, total fees paid, cost drag (원 and %) | FINRA/Vanguard show ending balance and total cost | Med | See formula section |
| Compare-linked: cost difference between selected ETFs (cheapest vs others) over the period | Explicit requirement | Med | Show per-ETF total cost and "A 대비 B는 N원 더 부담". Difference = balance_lowfee - balance_highfee, not simple difference of cost sums |
| Disclaimer: hypothetical, returns not guaranteed, excludes tax/spread/tracking difference/FX, fee held constant | Regulatory expectation (FINRA tool carries one); Korean financial-info norms | Low | Add to all 8 languages. Site currently is information-only; keep wording "참고용" |
| Immediate recalculation on input (no submit) or clear button | Modern norm | Low | Debounce not needed; pure O(months) loop |
| Input validation and clear errors | Negative/blank/NaN inputs | Low | Treat blank as 0; clamp period to 1-50 years; never show NaN/Infinity |
| Currency formatting via Intl.NumberFormat per language | 8 languages | Low | KRW for all; formatting locale follows UI language |

### C. RSS feed

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Static /feed.xml (RSS 2.0) generated in CI ETL, Korean only | Explicit requirement; static host means build-time generation | Med | Generated from changelog.json (and/or fee-history) in the same idempotent CI step; CI is sole writer (matches v1.3 decision, avoid pre-commit hook overwrite) |
| One item per change event (or per ETF per day), including up and down | Requirement changed from "인하 only" to all changes | Med | Title like "[KODEX 200] 총보수 0.0015% → 0.0010% (인하)". Group multiple field changes of the same ETF/date into one item to avoid flooding |
| Stable `<guid isPermaLink="false">` (code+date+field hash) | Readers dedupe on guid; unstable guid causes re-delivery of every item | Low | Highest-risk detail. Never derive from array index or generation time |
| Valid RFC-822 `pubDate`, `lastBuildDate`, channel title/link/description, `atom:link rel=self` | Feed validators (W3C) and readers require them | Low | Note changelog is monthly-granular (month + updatedAt) so pubDate = updatedAt date, not true change day; fee-history has finer dates |
| `<link rel="alternate" type="application/rss+xml">` in HTML head and a visible RSS link in footer | Autodiscovery | Low | Add to index.html and sub-pages; Naver/most readers use it |
| XML escaping, UTF-8 declaration | Korean names and `&` in names | Low | Use proper escape, not string concat; test with a name containing `&`/`<` |
| Bounded size (latest N items, e.g. 50-100) | Feed bloat | Low | |
| Add feed.xml to sitemap? | Optional | Low | Usually not needed |

### D. Data trust (enabling task, blocks A-C)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| p_float parse failure returns missing (None/NaN → null in JSON), not 0.0 | Prevents fake "fee 0 → x" changes appearing in changelog, RSS, chart, and compare; a 0.0 fee would rank as cheapest in compare | Med | Must land FIRST. Downstream: real-cost sum with missing component should be missing (or flagged), frontend must render "-" and exclude from best-value highlight and cost calc; changelog/fee-history must skip transitions to/from missing. Validation layer (v1.1) already has soft-warnings to extend. Update 145 tests |

### E. Mobile a11y (from ui-review.md), only the parts touching new UI

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| C1 h1 contrast, C2 header hide via transform, C3 changelog min-width scroll, C4 44px targets, C5 table semantics, C6 ARIA i18n, H4 loading/error states | Milestone item 2 | Low-Med each | New compare checkboxes, compare bar buttons, calculator inputs must meet 44px and translated aria-labels from day one. Do C4/C5/C6 before compare UI so the new controls are built on fixed patterns. H5 (focus-within reveals header) matters for compare bar keyboard flow |

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Compare view shows real-cost breakdown as stacked bar (총보수/기타/매매중개) | Makes "hidden costs" core value visible; most Korean sites show only 총보수 | Med | Small inline SVG, reuse chart utilities |
| Cost-drag "in 원 over N years" headline ("10년간 A보다 B가 약 87만원 더 부담") | Turns basis points into felt money; the strongest competitive angle vs FINRA-style tables | Low | Depends on calculator engine |
| Calculator prefilled from compare selection and URL params (?compare=a,b&amt=..&yrs=..&mo=..&r=..) | Whole scenario shareable | Low-Med | Same validation as compare; clamp inputs |
| Year-by-year cost table/chart (cumulative fee paid per ETF) | Vanguard/FINRA show growth curve; visual of divergence | Med | Reuse chart engine; provide table fallback for a11y |
| Past fee changes considered in calculator ("fee-history applied") | Uses unique v1.3 data asset | High | Defer; a forward-looking constant-fee model is standard |
| 절감액 badge on compare bar ("가장 낮은 실부담비용: X") | Cheap, actionable | Low | |
| ETF in-compare "similar ETF" suggestion by 구분 | Discovery | Med | Defer |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Return/performance/tracking-error comparison | No data source; risks looking like investment advice; out of core value | Compare cost only; link out to funetf/etfcheck for performance |
| Assuming ETF-specific expected return | Implies prediction | One user-entered return applied identically to all ETFs; default with disclaimer |
| Tax (배당소득세, 양도세, ISA/pension effects) in calculator | Complex, wrong quickly, liability | Link to existing ISA/pension guide pages |
| Server-side share links / short URLs / saved comparisons | No backend, no accounts (Out of Scope) | Query-string URL only |
| Compare of more than 4 or a full-table "compare all" | Unreadable on mobile; per requirement | Hard cap 4 |
| Separate per-language RSS feeds | Requirement says Korean single feed; multiplies guid/validation burden | One /feed.xml |
| Push notifications / email alerts | Needs backend | RSS only |
| Charting library (Chart.js etc.) for overlay | Violates vanilla/no-deps constraint | Extend existing SVG renderer |
| Client-side feed generation | Readers need a static XML file | Generate in CI |
| Rounding fees to 2 decimals before calculation | Fees are like 0.0047%; rounding destroys differences | Compute with full precision, round only for display |

## Cost-Drag Formula (verified reasoning, HIGH confidence on math)

Notation: fee f = 실부담비용 % / 100 (annual expense ratio as a fraction), gross annual return r, period N years, lump sum L, monthly contribution C, months n = 12N.

Standard monthly model (what Vanguard/FINRA-style tools effectively do, though FINRA applies fees on the running balance):

1. Convert annual to monthly with geometric conversion (preferred, consistent with an annual rate):
   - Net annual return r_net = (1 + r) * (1 - f) - 1 or the simpler r - f. Difference is O(r*f), negligible (e.g. 5% and 0.1%: 4.895% vs 4.9%). Recommend `r_net = r - f` for explainability, OR apply fee as a separate monthly deduction. Pick one and document it. Recommended: monthly growth factor g = (1 + r)^(1/12), monthly fee factor h = (1 - f)^(1/12); each month balance = (balance_prev + contribution) * g * h, or contribution added at end of month.
2. Balance with cost: B_n = L * (g h)^n + C * sum_{k=1..n}(g h)^(n-k) (contribution at month end) = L*q^n + C*(q^n - 1)/(q - 1), q = g*h; if q == 1 use L + C*n.
3. Balance without cost: same with q0 = g.
4. Cost drag (원) = B_no_fee - B_fee. Cost drag % = drag / B_no_fee.
5. Comparing ETF A (fee fa) vs B (fee fb): difference = B_fee(fa) - B_fee(fb). This is the correct number for "how much more does B cost me", including lost compounding, not sum of fees.
6. Total fees paid (nominal) can be shown as sum over months of balance_month_start * (1 - h) (fee charged each month on the running balance); this differs from cost drag because drag includes forgone growth. Show both, labeled clearly.

Conventions to pin down in the requirements doc:
- Contribution timing: end of month (simple) vs start (annuity-due). Choose one; state it. Recommended end-of-month with iterative loop (avoids closed-form q==1 and r==0 edge cases entirely; 600 iterations max at 50 years, trivial).
- Fee timing: continuous daily NAV deduction in reality; monthly application is a fine approximation.
- Unit: data.json fees are percent, divide by 100 (a common bug: using 0.0047 as fraction gives 0.47%).
- 매매중개수수료 is a trading cost in the site's real-cost definition; treat the whole 실부담비용 as annual carrying cost for simplicity, and disclose.
- Floating point: KRW amounts up to ~1e11; doubles fine, round only on display.
- Sanity test cases for a unit test (node CI, same as chart check): r=0, f=0 → B = L + C*n; C=0,f=0.01,r=0 → L*(1-f) after 1 year; drag monotonic in f; A vs B difference sign matches fee order.

## Feature Dependencies

```
D p_float missing handling → (safe data for) A compare best-highlight, B calculator, C RSS, changelog/chart
E a11y C4/C5/C6 patterns → A checkbox + compare bar + compare table, B inputs
A compare selection + ?compare= URL parser → B compare-linked cost difference
A compare view → overlay chart (needs v1.3 chart renderer refactored to multi-series)
B calculator engine (pure function, node-testable) → B UI → B share params
changelog.json / fee-history.json (existing) → C RSS generator (CI ETL step)
C RSS generator → head autodiscovery links on all pages (cross-page HTML edit)
translations.js 8 langs → A, B strings (RSS is Korean only)
```

## MVP Recommendation (ordering for roadmap)

1. p_float missing handling (D): prerequisite; small, testable.
2. Mobile a11y Critical+Major (E): establishes patterns and 44px/ARIA before new UI.
3. Compare selection + compare table + ?compare= URL (A, minus chart).
4. Overlay chart (A): the highest-complexity item; isolate in its own phase (multi-series refactor of v1.3 renderer).
5. Cost calculator engine + UI linked to compare (B).
6. RSS generation in CI + autodiscovery links (C): independent, can run in parallel at any point after D.

Defer: fee-history-aware calculator, similar-ETF suggestions, stacked-bar cost breakdown (only if time), per-year table if chart is tight.

## Research Flags

- Overlay chart: needs phase-level research/design (which field, shared axis, legend, a11y alternative).
- Calculator: pin down conventions (timing, fee model) as explicit requirements; low research risk otherwise.
- RSS: guid stability and item grouping policy; validate with W3C feed validator; confirm changelog date granularity (monthly `updatedAt`) vs fee-history daily dates.
- GitHub Pages: no rewrite rules, so ?compare= must be served by a real page (index.html or /compare/index.html), and sitemap/canonical must avoid indexing param variants (canonical to base page).

## Sources

- Local repo: data.json, fee-history.json, changelog.json, .planning/PROJECT.md, .planning/ui-review.md (HIGH for data shapes)
- RSS 2.0 spec (cyber.harvard.edu/rss/rss.html), W3C Feed Validation Service (standard, HIGH, from prior knowledge, not re-fetched)
- Compare-tool and calculator UX (funetf, etfcheck, Naver 증권, ETF.com, Morningstar, Vanguard, FINRA Fund Analyzer): general knowledge, not live-verified (LOW-MEDIUM)
- WCAG 2.1/2.2 target size and non-color cues (HIGH, general)
