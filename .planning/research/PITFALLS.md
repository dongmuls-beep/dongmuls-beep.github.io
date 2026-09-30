# Domain Pitfalls: v1.3 Fee History Snapshots + Step Chart

**Domain:** Adding change-only fee history store, git backfill, and SVG modal to an existing static GitHub Pages + daily-ETL site
**Researched:** 2026-09-30
**Confidence:** MEDIUM-HIGH (code-verified against build_changelog.py, daily_update.yml, pre-commit hook; UI/a11y items are standard practice, not verified against this codebase's script.js)

Verified facts from the repo: data.json has 156 commits of history. Fees are JSON floats (총보수 0.0047, 기타비용 0.06). build_changelog.py compares with exact `!=` after `to_float`, keys ETFs by `(종목코드, 종목명)`, and stamps dates with `datetime.now()`. The workflow uses `actions/checkout@v4` with default depth (1) and `git-auto-commit-action` with `file_pattern: "data.json changelog.json update-meta.json"`. The pre-commit hook only syncs changelog.json from production.

## Critical Pitfalls

### 1. Spurious change records from float noise and the wrong field set
**What goes wrong:** History fills with points that are not real fee changes. 매매중개수수료 and 실부담비용 change for nearly every ETF every month (the code comment in build_changelog.py says so). If they are snapshotted "change-only", nearly every ETF gets a new point each month, and the store grows and the chart looks noisy. Values computed or scraped upstream (e.g. 0.30000000000000004 vs 0.3) also trip exact `!=`.
**Prevention:**
- Decide fields explicitly. Recommended: chart 총보수 and 실부담비용 (or 총보수 only for v1.3), and treat 매매중개수수료 as a separate, noisy series or omit it.
- Normalize before compare: `round(x, 6)` (or Decimal from `str`) on both sides, compare with a tolerance of about 1e-9. Store the rounded value.
- Reuse `to_float`; treat None to value transitions carefully (a missing value must not create a "0" point or a change).
**Detection:** After backfill, count records per ETF. A median much greater than 2-3 means noise. Unit test: 0.1+0.2 vs 0.3 produces no record.
**Phase:** Snapshot-store design/ETL phase (the first phase).

### 2. Backfill ingests the known-bad history (2026-05-27 mapping correction, malformed commits)
**What goes wrong:** Replaying 156 commits of data.json reproduces the column-remap fake changes. Old commits may also contain partial or malformed JSON, an empty list, a dict instead of a list, or a truncated ETF set (scrape failure). A partial commit followed by a full one yields a fake "delist then relist", or a value that flips and flips back.
**Prevention:**
- Backfill is a one-time local script (`git log --follow -- data.json`, `git show <sha>:data.json`), never run in Actions.
- Wrap every `json.loads` in try/except and skip the commit. Require `isinstance(list)` and row count at least ~50% of the median, else skip.
- Reuse `detect_bulk_correction` (BULK_CORRECTION_RATIO 0.5 on 총보수/기타비용): when a commit-to-commit diff is flagged, do NOT add the changes. Re-baseline instead (set the new value silently, or drop the pre-correction series for those ETFs). The 2026-05-27 commit needs a hard-coded explicit exclusion, since the ratio heuristic was tuned for monthly runs.
- Compare each commit to the last accepted state, not to the immediate parent.
- Dry-run mode that prints per-ETF series for spot-checking against the real fee (the scripts/_check_fees.py in the working tree hints this was already done manually).
**Detection:** Many ETFs sharing an identical change date; a step on 2026-05-27; series with values that revert within a commit or two.
**Phase:** Backfill phase (after the store schema exists).

### 3. Shallow checkout, and a history store that depends on git
**What goes wrong:** `actions/checkout@v4` defaults to `fetch-depth: 1`. If the daily job (or the store builder) uses `git log`/`git show HEAD~1`, it silently gets nothing and either wipes the store or re-emits all history. Note build_changelog.py only needs `HEAD:data.json`, which exists in a depth-1 clone, so it works today. That masks the problem for anything deeper.
**Prevention:**
- Daily job must be incremental against the committed history file (read history JSON, compare with today's data.json, append only on difference). Zero git-history dependency in Actions.
- Do not change the checkout to `fetch-depth: 0` just for this.
- The updater must fail loudly (non-zero exit) if the history file is missing/unparseable, instead of creating an empty one that gets committed over the real one. Read errors in `read_json_file` currently return the default silently; do not copy that pattern for the history store.
**Detection:** History file shrinks in a commit diff; CI test asserting record count is non-decreasing.
**Phase:** ETL integration phase.

### 4. Workflow does not commit the new file, and local vs origin divergence
**What goes wrong:** (a) `file_pattern` lists three files; a new history file (or directory of per-ETF files) is never committed, so the store never persists on Pages. (b) Local main diverges from origin daily and the pre-commit hook overwrites changelog.json with production. The history file will have the same problem: if it is edited locally (backfill, tests) and origin appends daily, every pull conflicts; a big single JSON conflicts on every line touch.
**Prevention:**
- Add the file(s) to `file_pattern` (glob if per-ETF files, e.g. `fee-history/*.json` or a single `fee-history.json`).
- Extend `sync_server_changelog.py` (or a sibling) to sync the history file from production in the pre-commit hook, or add a documented rule: the backfilled file is committed once, then only Actions writes it. Do the backfill on a fresh `git pull` state and push promptly.
- Put the history-build step AFTER the Build Changelog step and BEFORE auto-commit, with `--allow-fail` semantics not applied (a failure should block the commit rather than commit stale files).
- Prefer stable key ordering and `sort_keys`, indent-free or consistent format so diffs stay small and rebase conflicts are resolvable.
**Detection:** Pages shows no history after first daily run; `git pull` conflicts in the history file.
**Phase:** ETL integration phase; hook change in the same phase.

### 5. Identity: renames, delisting, new listings, code reuse
**What goes wrong:** build_changelog.py keys on `(code, name)`. An ETF rename (common for Korean ETFs: brand changes like KODEX/ACE prefix changes) looks like delist + new listing, splitting the series. Keying history on name orphans the old series. Delisted ETFs remain in the store forever and may render as a stale flat line; newly listed ETFs have a single point, which a step chart cannot draw. A null fee on one day (scrape gap) may create a phantom end or "0.00%" point.
**Prevention:**
- Key history by 종목코드 only; store the latest name as metadata (and optionally a names list).
- Retain delisted ETF series but mark `lastSeen`; the UI only opens the chart from rows that exist in data.json, so orphan series are inert.
- Single-point series: render a "no changes recorded since <date>" flat line/annotation, not an empty or broken SVG.
- Never append a point when the new value is None; keep the last known value.
- Do not reuse the (code,name) pair logic for the store; note this differs from the changelog and document why.
**Detection:** Tests with fixtures: rename, delist, relist, null value, first appearance.
**Phase:** Store design phase; single-point rendering in the chart phase.

### 6. Timezone and date semantics
**What goes wrong:** The cron is 00:00 UTC (09:00 KST). `datetime.now()` on the Actions runner returns UTC; on the local Windows machine it returns KST. The same run can produce different "today" strings around 15:00-24:00 UTC vs KST, giving off-by-one dates, local-vs-CI mismatch, and duplicate/skipped dates. Backfill dates from `git log` commit timestamps carry their own offsets. Also, the data date is not the same as the commit date (ETL runs at 09:00 KST, before the Korean market opens, so the data reflects the previous trading day/fee announcement).
**Prevention:**
- One helper: `datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()` everywhere (store, backfill via `%cI` converted to KST). Add `tzdata` to requirements.txt if not present (Windows has no system tz database; ZoneInfo fails without it).
- Store plain `YYYY-MM-DD` strings, no time. Label as "recorded on" (fee first observed), not "effective date". Say so in the modal.
- Same-day rerun (workflow_dispatch) must be idempotent: replace, not append (mirror the existing "updated today's existing entry" logic).
**Detection:** Two entries for the same date, or dates differing by one between local and CI runs.
**Phase:** Store design phase.

### 7. JSON growth and payload cost for a static site
**What goes wrong:** One monolithic history file for all ETFs is fetched for every page view even though only one chart is ever opened; growth is small with change-only records but backfill noise (pitfall 1) can inflate it. GitHub Pages gzips but the file still competes with data.json on mobile.
**Prevention:**
- Lazy-load: fetch history only on first fee-cell click, cache in memory after.
- Compact schema: `{code: [[date, fee], ...]}` or per-field arrays, not verbose objects with repeated keys. Estimate size after backfill (target: tens of KB gz).
- Alternative if it exceeds about 200 KB raw: per-ETF files loaded on demand; note this raises the file_pattern glob need (pitfall 4).
**Detection:** Check file size in a CI assertion or the backfill report.
**Phase:** Store design phase (schema), chart phase (lazy load).

### 8. Browser cache staleness of the history file on GitHub Pages
**What goes wrong:** Pages serves with `Cache-Control: max-age=600`. A user can see yesterday's history against today's data.json, or a chart missing the latest point. Query-string versions do not exist for fetched JSON unless the code adds them. Service worker/PWA (site.webmanifest exists) caching may pin an old copy.
**Prevention:**
- Fetch with a version key derived from data already loaded, e.g. `fee-history.json?v=<update-meta.json updatedAt>`; follow whatever mechanism the site already uses for data.json/changelog.json (check script.js and match it, do not invent a second scheme).
- If a service worker exists, confirm it does not cache-first the history file.
- Chart must tolerate the last point being older than data.json's current fee: append the current data.json value client-side as the "now" point, so the chart never contradicts the table cell.
**Detection:** Chart's latest value differs from the cell that was clicked.
**Phase:** Chart/frontend integration phase.

## Moderate Pitfalls

### 9. SVG scaling with tiny fees (0.0047%)
**What goes wrong:** A y-axis from 0 to max with fees like 0.0047 vs 0.06 vs 0.3 shows either flat lines or overlapping labels. Steps of 0.0001 are invisible; auto "nice ticks" logic written for integers gives 0, 0, 0 labels; `toFixed(2)` prints 0.00%. Floating ticks print 0.30000000000000004%.
**Prevention:** Compute the range per ETF from min/max of that series with padding (min-span floor, e.g. treat a span less than 1e-4 as centered flat). Format with adaptive precision: `toFixed(4)` or as many decimals as the underlying value needs (trim trailing zeros, cap at 4). Ticks: derive from step size via `10^floor(log10(span))` rounding, then round each tick value before printing. Never draw NaN paths when min==max (division by zero); handle that case explicitly. Render flat single-value series as a horizontal line.
**Phase:** Chart phase. Test fixtures: 0.0047 constant, 0.0047 to 0.0050, 0.05 to 0.045 to 0.0453, and one-point series.

### 10. Modal accessibility and focus, especially on mobile
**What goes wrong:** Clickable `<td>` is not keyboard reachable, has no role, and screen readers skip it. Modal opens without moving focus, so Tab continues behind it; Esc does not close; focus is not restored to the clicked cell; background scrolls (iOS scroll-through); the modal is taller than the viewport with a landscape keyboard; SVG chart has no text alternative.
**Prevention:** Use `<dialog>` with `showModal()` (native focus trap, Esc, inert background) or add `role="dialog" aria-modal="true" aria-labelledby`, focus close button, restore focus to the trigger on close. Make the fee cell contain a real `<button>` (styled as text) rather than making the `td` clickable. Lock body scroll while open (`overflow: hidden` on body; verify on iOS Safari). Provide `<svg role="img" aria-label>` plus a visually available table/list of dates and values as text fallback (also useful for SEO/i18n). Use `max-height: 90dvh` with internal scroll. Respect `prefers-reduced-motion`.
**Phase:** Chart/modal phase.

### 11. Touch target and layout conflicts with the mobile card-table layout
**What goes wrong:** The mobile view turns table rows into cards; existing row-level tap handlers (expand, link to detail, sort headers) may swallow or double-fire the fee-cell tap. Fee text is small, giving a target under 44 px. Adding an icon/underline breaks the card grid alignment. Event delegation on `tbody` may attribute clicks to the wrong row after sort/filter re-render, opening the wrong ETF (code taken from an index rather than a `data-code` attribute).
**Prevention:** Store `data-code` on the trigger button, not row index. Use one delegated listener with `stopPropagation` only on the button. Give the button min 44x44 px hit area (padding) without changing visible layout in the card mode; test at 360 px and 768 px. Do not add a new column: desktop table width and the 8-language headers are already tight. Only show the affordance (dotted underline) on fields that have history.
**Phase:** Chart/UI integration phase; verify with the existing ui-review workflow (.planning/ui-review.md exists).

### 12. i18n of chart labels and dates (8 languages)
**What goes wrong:** Hard-coded Korean/English strings in the modal ("총보수", "변경 없음", axis text); dates formatted `YYYY-MM-DD` vs locale; long translations (German, Vietnamese/Thai if present) overflow the modal title; number format with comma decimals in de/fr/es locales while other site numbers use dots; RTL if Arabic is among the 8 languages breaks SVG axis direction (SVG text-anchor, x-axis should remain chronological LTR).
**Prevention:** Add all new strings to translations.js in all 8 languages in one pass (a missing-key test if the repo has one under tests/). Format dates with `Intl.DateTimeFormat(currentLang, {timeZone:'Asia/Seoul', ...})` on the parsed `YYYY-MM-DD` as UTC to avoid day shift (`new Date('2026-05-27')` parses as UTC, and local-time formatting in a negative-offset timezone shows the previous day; pass `timeZone:'UTC'`). Keep the numeric fee format consistent with the table's existing formatter. Language changes while the modal is open must re-render it. Force `dir="ltr"` on the SVG container.
**Phase:** Chart phase; a final i18n pass task.

### 13. Interaction with changelog dedup and DATA-06 logic
**What goes wrong:** Building history from the same diff pass but skipping rows that DATA-06 suppresses makes the two views disagree (changelog says no change, chart shows a step), or history builds after a bulk correction and records it. build_changelog.py returns early on flagged bulk corrections, so an implementation hooked in after `return 0` never runs, or one hooked in before records the false changes.
**Prevention:** Make the history updater a separate script/step with its own bulk-correction guard using the shared `detect_bulk_correction` (import it, do not copy). On bulk correction: re-baseline silently (update the current value, add no point) and log a warning, matching DATA-06 semantics.
**Phase:** ETL integration phase.

## Minor Pitfalls

### 14. Steps drawn as diagonals
Use the horizontal-then-vertical path (`H x2 V y2`, or `stepAfter` semantics), extending the last segment to "today" so an unchanged fee shows as a line to the right edge.

### 15. Test suite gates the daily run
`pytest tests/` runs before the ETL in the workflow, so a failing new test blocks the daily update. Keep new tests fast, network-free, and independent of the real history file's contents (use fixtures).

### 16. Windows path/encoding issues in the local backfill
`git show` output must be decoded as UTF-8 (`encoding="utf-8"` as build_changelog.py does; default cp949 on Korean Windows corrupts 종목명). Write output with `ensure_ascii=False`, UTF-8, and `\n` newlines (avoid CRLF diffs from OneDrive/Windows).

### 17. OneDrive-synced working directory
The repo is in OneDrive; large backfill loops touching many files can trigger sync locks. Run `git show` to memory, not to temp files in the repo.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema/store design | Float noise, wrong field set, code-keyed identity, KST dates, size (1, 5, 6, 7) | Round + tolerance, key by code, ZoneInfo Asia/Seoul, compact schema, fixtures |
| Backfill from git | Bad commits, 2026-05-27 correction, partial data (2) | Local one-time script, validate each commit, reuse bulk detector, explicit exclusion, dry-run report |
| ETL/Actions integration | Shallow clone, file_pattern, local divergence, DATA-06 interplay (3, 4, 13) | Incremental from committed file, extend file_pattern, extend hook sync, separate guarded step |
| Chart + modal | Tiny-value scaling, a11y, touch conflicts, cache, i18n (8-12) | Per-series range, native dialog + real button, data-code, versioned fetch, all-language strings |

## Research flags
- Needs a look at script.js before planning the frontend phase: how data.json/changelog.json are currently fetched and cache-busted, whether a service worker exists, and which locales (RTL?) are among the 8.
- Needs a look at `scripts/sync_server_changelog.py` to decide how to extend the hook for the history file.
- Backfill phase should start with a dry run and manual verification on a handful of known ETFs (e.g. 360200 ACE 미국S&P500) before writing the file.

## Sources
- Repo inspection (HIGH): scripts/build_changelog.py, .github/workflows/daily_update.yml, .githooks/pre-commit, data.json (156 commits touching it)
- actions/checkout default fetch-depth 1 (HIGH, documented behavior)
- GitHub Pages default cache headers max-age=600 (MEDIUM, common knowledge, not re-verified this session)
- Modal/dialog, touch target (44 px), Intl date and timezone behavior (MEDIUM, standard web practice)
