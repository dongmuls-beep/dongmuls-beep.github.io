# Architecture: v1.3 Fee History (snapshot store + backfill + step chart)

**Researched:** 2026-09-30 | **Confidence:** HIGH on integration points (read code), MEDIUM on size estimate (derived, not measured)

## Facts from the code that constrain the design

- data.json: 59 rows, 18 KB. Two codes are alphanumeric (`0026S0`, `0069M0`), so code keys must always be strings. No row currently has AUM null.
- Tracked fields (build_changelog.FIELDS): 총보수, 기타비용, 매매중개수수료, 실부담비용. Only these four go in history. AUM is not tracked, so AUM-null rows are irrelevant except that the row must not be skipped.
- changelog.json is 164 KB and diffs against `git show HEAD:data.json`. That is fragile: it depends on git state and on the once-per-run assumption.
- `.githooks/pre-commit` overwrites local changelog.json with the production copy. **history.json must not be touched by this hook.** If it were synced the same way, a local commit could clobber CI-produced history.
- The workflow commits only `data.json changelog.json update-meta.json` (git-auto-commit `file_pattern`). history.json must be added there or it is never committed.
- 매매중개수수료 and 실부담비용 change for nearly every ETF monthly. Those two fields dominate point counts.

## Recommended architecture

```
etl_process.py -> data.json
        |
        +-> scripts/build_changelog.py -> changelog.json   (UNCHANGED)
        |
        +-> scripts/build_fee_history.py -> history.json   (NEW, CI-owned)
                  ^ shared helpers imported from build_changelog
                    (to_float, FIELDS, detect_bulk_correction)
scripts/backfill_fee_history.py (NEW, one-shot, local) -> history.json
browser: script.js fee-cell click -> lazy fetch /history.json (once, cached) -> SVG step chart modal
```

### Component boundaries

| Component | New/Mod | Responsibility |
|---|---|---|
| scripts/build_fee_history.py | NEW | Read data.json + history.json, append only on change, write. Pure function `apply_snapshot(history, rows, date)` plus a thin `main()`. |
| scripts/backfill_fee_history.py | NEW | Replay `git log --reverse -- data.json`, feed each commit's data through the same `apply_snapshot`. One-shot. Output is reviewed, then committed. |
| Shared helpers | MOD (light) | Import `to_float`, `FIELDS`, `detect_bulk_correction` from build_changelog, or extract them to `scripts/_common.py`. Prefer importing. Do not refactor build_changelog behavior. |
| daily_update.yml | MOD | Add step `python scripts/build_fee_history.py` after "Build Changelog". Add `history.json` to `file_pattern`. |
| tests/test_fee_history.py | NEW | Change-only, idempotent rerun, null handling, bulk skip, alphanumeric codes. The workflow already runs `pytest tests/`. |
| script.js / style.css | MOD | Make fee cells clickable, add modal, SVG renderer, lazy loader. |
| .githooks/pre-commit | NONE | Leave as is. Do not add history.json to the sync. |
| build_changelog.py, changelog.json, etl_process.py | NONE | No change. |

## Schema and layout

Single `history.json`, keyed by code then field, with points as `[date, value]` pairs:

```json
{
  "version": 1,
  "updatedAt": "2026-09-30",
  "names": {"360200": "ACE 미국S&P500"},
  "series": {
    "360200": {
      "총보수": [["2026-02-12", 0.0047]],
      "기타비용": [["2026-02-12", 0.06], ["2026-05-27", 0.07]],
      "매매중개수수료": [["2026-02-12", 0.0253]],
      "실부담비용": [["2026-02-12", 0.09]]
    }
  }
}
```

- Each series begins with its baseline point (first observed value), then holds one point per change. A step chart extends the last value to "today" client-side, so no daily points are written.
- Keep `names` (latest name) in the file. Keying is by code only, so ETF renames do not fork series. Note that changelog keys on (code, name) and will treat a rename as a new ETF, while history will not.
- **Single file, not per-code.** Size estimate: about 59 codes x 4 fields. Fee fields change rarely (a handful of points). The two monthly fields have about 8 months x 59 x 2, roughly 950 points, plus baselines of 236. That is about 1,200-1,500 points at ~20 B each, so ~30-50 KB unminified (~10 KB gzip). This is below changelog.json's 164 KB. Write compact (`separators=(",",":")` or indent=None per series) to keep git diffs small and to avoid 59 files that each make a commit diff. Per-code files would need 59 requests or an index, and add nothing at this size. Revisit only if it exceeds ~500 KB.
- Write with `sort_keys` and codes in a stable order so reruns are byte-identical (needed for idempotency and for auto-commit to see "no change").

## Idempotency rules for apply_snapshot

1. Compare against the **last point in history**, not git HEAD. This makes reruns, missed days and manual dispatches safe.
2. `to_float(value) is None` means skip (carry forward). Never record a null as a change. A transient scrape gap would otherwise produce a fake change and a fake change back.
3. Append `[date, v]` only if `v != last_v`. If the last point already has the same date and the value differs, replace it (same-day rerun with corrected data). Same value means no-op.
4. Date is the KST data date (use the date already in update-meta.json if it exists, otherwise `datetime.now(KST)`). CI runs at 00:00 UTC (09:00 KST) and `datetime.now()` on the runner gives UTC, which can differ from the KST date. Check what build_changelog's `datetime.now()` does; it is UTC on the runner. Pick one convention and document it. Both dates fall on the same calendar day at 00:00 UTC, so this is low risk.
5. New code appears: seed baseline. Code disappears: leave the series untouched (do not delete history).
6. Float compare: values come from JSON floats round-tripped, so `!=` is fine. If ETL ever computes them, round to 4 decimals first.
7. Apply DATA-06 live: if `detect_bulk_correction` fires against history-last values (>=50% of ETFs change 총보수/기타비용), log a warning and skip the write for that run, matching changelog behavior. This protects future mapping corrections.

## Relation to changelog.json

Keep them independent. Do not derive changelog from history in v1.3. The UI (table change badges, `/changelog/` page) depends on the existing shape, the pre-commit hook syncs it, and the bulk filter has already cleaned it. Deriving would couple a working system to a new one. A later cleanup milestone could generate changelog from history, which would also remove the git-HEAD dependency. History is the more robust source because it does not need `git show`.

The one-way sanity check worth adding to the backfill: for non-bulk fields, the number of history change points per day should match the changelog entries for the same day. Use it as a test, not a dependency.

## Backfill and known-bad data

Approach: `git log --reverse --format=%H%x09%ad --date=short -- data.json`, then `git show <sha>:data.json` for each of the ~156 commits. Take the last commit per calendar day, feed each day through `apply_snapshot` in order. Handle bad data as follows.

- **2026-05-27 mapping correction.** Before the correction, 총보수/기타비용 were wrongly mapped, so those "before" values are wrong, not just the change. Recording the wrong to right jump is a fake change, and keeping the wrong earlier points gives a misleading chart. Recommended: detect the commit with `detect_bulk_correction` (reusing the 0.5 rule), and for each flagged field **rebaseline**: drop all points before that commit for that field across all codes and start the series at the corrected value on that date. Log this loudly. The alternative of skipping the commit only leaves stale wrong values. Verify the wrong-mapping era by diffing the commit's parent and child before hard-coding a date. If other flagged commits exist, the same rule applies. Add a small `KNOWN_REBASELINES = {"2026-05-27": [...]}` override only if the 0.5 rule misses it.
- **Transient scrape failures** (a commit whose data.json has nulls, zeros or a shorter row set). Null skip handles nulls. Zero in a fee field for a previously nonzero fee is suspicious, so have backfill emit a report (not silently fix) of any A to B to A pattern within 2 days, and review by hand.
- **Alphanumeric codes** (`0026S0`, `0069M0`). Treat every code as `str`. These likely have short histories because the ETFs are new. The backfill must not `int()` them. Test with them explicitly.
- **AUM null.** Not tracked, so no effect. The row must still be processed for fee fields, so do not gate on AUM.
- **Old data.json shapes.** Early commits may have different field names or a list vs dict shape. Wrap each `json.loads` in try/except and skip with a warning. Report the number of skipped commits.
- **Typo commit (2026-02-13, 중계 to 중개).** A field-name change, so early commits may use 매매중계수수료. Map the alias in backfill only.
- Backfill is run locally once, output reviewed (counts per field, list of rebaselines, A-B-A report), committed, and never run in CI. Running `build_fee_history.py` afterwards must be a no-op for the same data (idempotency check).

## Browser: lazy loading

- No fetch at page load. The main table is unchanged, so no regression to first paint.
- On first fee-cell click: `historyPromise ??= fetch("/history.json").then(r => r.json())`. Cache the promise, so the second click is instant. Optionally `<link rel=prefetch>` or a fetch on `requestIdleCallback` later, not in v1.3.
- Cell click needs `data-code` and `data-field` on the fee cells (script.js lines ~876-886 render the row; the field keys come from `dataKeys`). Use event delegation on the table body, since the table re-renders on sort and filter.
- Modal: one `<dialog>` element (native focus trap and Esc), an SVG built with `createElementNS`, and no library. Step path: `M x0,y0 H x1 V y1 H x2 ...`, extended horizontally to today. Add axis labels, a point tooltip or a `<title>` per point, and a fallback for single-point series ("변동 없음, 기준일 YYYY-MM-DD 값 X%"). Reuse `formatPercent` and i18n via translations.js (add keys for modal title and empty state, otherwise Korean-only breaks the existing i18n).
- Y axis: do not always start at 0 for tiny changes, but flag a truncated axis. Percent units follow the table (values are already in % units).
- Failure: if the fetch fails, show a message in the modal, do not throw.
- Caching: GitHub Pages sets `max-age=600`. Acceptable. Add no query-string cache buster unless stale data is reported.

## Anti-patterns to avoid

- Reusing `git show HEAD:data.json` diff as the source for history (breaks on reruns and on locally staged data).
- Writing one point per day per field (bloat, and it defeats "record only on change").
- Syncing history.json in the pre-commit hook (would overwrite CI's history with a stale production copy or a 404).
- Letting the live job and the backfill use separate change logic. Share `apply_snapshot`.
- Recording null or empty as a value.

## Suggested build order (3 phases)

1. **Store and live append.** `apply_snapshot`, `build_fee_history.py`, `history.json` schema, tests (idempotent, null, bulk skip, alphanumeric), workflow step and `file_pattern`. Seed from the current data.json only. This delivers the store safely and starts collecting from day one, and it has no UI risk. Includes confirming the hook does not touch history.json.
2. **Backfill.** `backfill_fee_history.py` on top of the phase 1 function, with rebaseline for the 05-27 correction, the report, manual review, and a commit of the result. Depends on phase 1 only. Needs the most care, so give it a dedicated verify step: compare to changelog and check spot values against the KOFIA numbers.
3. **Chart UI.** Cell click delegation, `<dialog>`, SVG step renderer, lazy fetch, i18n keys, mobile layout, empty/single-point/error states. Depends on the phase 1 schema only, so it can develop against a small fixture before the backfill lands, but ship after phase 2 so the chart is not empty.

## Research flags

- Phase 2: needs hands-on inspection of the actual git history (commit shapes, exact correction commit, field aliases). Not solvable from docs.
- Phase 1 and 3: standard patterns, no further research needed.
- Open decision for the user: rebaseline (recommended) vs skip for the 05-27 correction. And whether a rename should fork the series (recommended no, key by code).

## Sources

- Repo files read: scripts/build_changelog.py, scripts/sync_server_changelog.py, .githooks/pre-commit, .github/workflows/daily_update.yml, script.js, data.json (HIGH).
- Size estimate is calculated from the field-change behavior described in the code comments (MEDIUM). Measure after backfill.
