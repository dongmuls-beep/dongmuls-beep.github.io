# Project Research Summary

**Project:** etfsave.life — milestone v1.3 수수료 변동 그래프
**Researched:** 2026-09-30 | **Confidence:** MEDIUM-HIGH

## Executive Summary

v1.3 adds a change-only fee history store, a backfill from data.json git history, and a click-to-open modal with a vanilla SVG step chart (one field per click, all 4 fee fields clickable). No new dependencies: Python stdlib, native `<dialog>`, ~100 lines of hand-built SVG.

Shape: single CI-owned `fee-history.json`, keyed 종목코드 → field → `[date, value]` points. One pure `apply_snapshot` function serves both the daily incremental step and the one-shot local backfill. Daily job compares against the last stored point (never git), so default shallow checkout works. Browser lazy-fetches on first click and holds the last value to today.

Main risks are data quality/integration, not UI:
- Backfill replaying the 2026-05-27 column-remap correction as fake steps
- `file_pattern` omitting the new file → never committed
- UTC vs KST date mismatch
- Float noise / nulls creating false points
- Most ETFs have 0–1 changes since 2026-02 → "no change since X" is the common state; design it first

## Conflicts Resolved

| Topic | Decision |
|---|---|
| File name | **`fee-history.json`** everywhere (matches `build_fee_history.py` / `backfill_fee_history.py`) |
| Which fields to chart | **All 4 clickable** (user choice). Round before compare; measure points per series after backfill |
| Timezone | **Fixed KST offset helper** `datetime.now(timezone(timedelta(hours=9))).date().isoformat()` — no DST in Korea, no tzdata needed. Backfill converts `%cI` with same offset. Label date "recorded on" (first observed) |
| Pre-commit hook | **Do not sync; leave hook unchanged.** Rule: commit backfilled file once after fresh pull; afterwards CI-only writer |
| 2026-05-27 bad data | **Rebaseline**: for fields flagged by `detect_bulk_correction`, drop earlier points across all codes, restart at corrected value. `KNOWN_REBASELINES` override for 2026-05-27. Verify commit via parent/child diff first |
| Float noise | **Round to 6 decimals** before compare/store; unit test `0.1+0.2` vs `0.3` |
| Cache staleness | Match existing data.json/changelog.json fetch scheme; append current data.json value client-side as "now" point |

## Key Findings

**Stack (no new packages):** `subprocess` git (`git log --reverse`, `git show <sha>:data.json`, `encoding="utf-8"`); `json` with `ensure_ascii=False`, `sort_keys`, compact output; new `scripts/build_fee_history.py` (daily) + `scripts/backfill_fee_history.py` (one-shot local); native `<dialog>.showModal()` + SVG via `createElementNS`; workflow keeps `fetch-depth: 1`, adds build step after "Build Changelog", adds `fee-history.json` to `file_pattern`.

**Features — must have:** modal title (ETF name, code, field); step line with time-proportional x, padded y, adaptive precision; last value held to today; point readouts; single-point/no-change state + data-start disclosure (2026-02); real `<button>` in fee cells with `data-code`/`data-field`, focus return; `role="img"` chart + visible change list as text alternative; discoverability cue + hint line; 44px tap target, scroll lock on mobile; loading/error states; 8-language i18n.
**Should have:** delta badges, "변동 N회" indicator. **Defer:** field tabs, deep links, category-average overlay, range/zoom, multi-ETF compare, deriving changelog from history.

**Architecture:** `apply_snapshot(history, rows, date)` — append only on change; same-day different value replaces; null skipped/carried; new code seeds baseline; vanished code untouched; live bulk-correction guard warns and skips. `build_fee_history.py` fails loudly on missing/unparseable file (never overwrite with empty). Backfill: try/except per commit, alias 매매중계수수료 (typo era), last commit per KST day, report (counts, rebaselines, A→B→A within 2 days, skipped commits). Frontend: delegated click/keydown on `tbody`, cached fetch promise, single `<dialog>`. Schema `{version, updatedAt, names, series:{code:{field:[[date,value],...]}}}`, codes always strings. Import `to_float`, `FIELDS`, `detect_bulk_correction` from build_changelog; don't touch changelog/hook/ETL.

**Top pitfalls:**
1. Backfill ingests correction/malformed commits → rebaseline, validate, dry-run
2. File not committed/clobbered → `file_pattern`, hook untouched, backfill-once rule
3. Date off-by-one → one KST helper, idempotent reruns, `timeZone:'UTC'` in browser formatting
4. Spurious points → round, never record null, never gate on AUM
5. Chart with tiny values (0.0047%) → min==max guard, rounded ticks, flat single-point line, `dir="ltr"`

Also: pytest gate blocks the daily run — keep new tests fast, fixture-based. UTF-8 + `\n` on Windows/OneDrive.

## Implications for Roadmap

1. **Snapshot store + live append** — `apply_snapshot`, `build_fee_history.py`, seeded file, tests, workflow step + `file_pattern`. Standard patterns, skip research.
2. **Git-history backfill** — `backfill_fee_history.py` with rebaseline, review report, spot checks (e.g. 360200), committed result; daily build becomes no-op afterwards. Measure size and multi-point ETF share. Needs research (real git history inspection).
3. **Chart modal UI** — clickable cells, `<dialog>`, SVG step chart, lazy fetch, states, change list, mobile, i18n. Short script.js read first (cache scheme, service worker, `#privacyModal` ESC handler, card tap handlers). Ship after phase 2.

## Confidence

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | Existing repo patterns; `<dialog>` support MEDIUM |
| Features | MEDIUM | a11y solid; competitor behavior unverified |
| Architecture | HIGH | Read from code; size estimate derived |
| Pitfalls | MEDIUM-HIGH | ETL/workflow code-verified; UI not checked against script.js |

**Gaps:** exact 2026-05-27 correction commit; old data.json shapes/aliases; single-point share; actual file size (per-code split only if >500 KB); script.js cache scheme / service worker; rename forking (decided no, key by code).
