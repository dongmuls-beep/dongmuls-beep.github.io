# Phase 8: Git 히스토리 과거 복원 - Research

**Researched:** 2026-09-30
**Domain:** git-history replay of data.json into fee-history.json (stdlib Python)
**Confidence:** HIGH (all numbers below come from running read-only git commands and a throwaway script against this repo's real history)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multiple commits per day: use only the last commit of that day in KST (commit time `%cI` -> fixed +9 offset date)
- Bulk correction: auto-detect between consecutive snapshots with `build_changelog.detect_bulk_correction` + hardcoded backup `KNOWN_REBASELINES = {"2026-05-27": [...]}`. For detected fields (총보수/기타비용), **delete all earlier points of that field for ALL codes**, start a new baseline from the correction-day value
- Typo field `매매중계수수료` (through 2026-02-13) -> alias to `매매중개수수료`
- Unparseable / not-a-list / row-count-collapse commits are skipped and recorded in the report
- Order: `git log --reverse -- data.json` order + commit time -> KST date; commits whose date goes backwards are skipped and reported
- Result: regenerate `fee-history.json` whole; afterwards `python scripts/build_fee_history.py` must be a no-op (matches current data.json)
- `--dry-run`: report only, no file write
- Report is stdout text: per-field change counts, re-baseline details, skipped commits (reason), A->B->A suspicious patterns (within 2 days)
- A->B->A: report only, no auto-fix
- Run once locally, commit result; NOT added to CI workflow (no `fetch-depth` change)

### Claude's Discretion
- Reuse Phase 7 `build_fee_history.py` `apply_snapshot`, `dump_history`, `validate_history`, `normalize` (import); new logic only in backfill script
- git calls via `subprocess` + `encoding="utf-8"` (avoid Windows cp949)
- Tests: pure function taking a snapshot list (e.g. `replay(snapshots) -> (history, report)`), fixture-based, no git

### Deferred Ideas (OUT OF SCOPE)
- etl_process.p_float returning 0.0 on parse failure (Phase 7 WR-04)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BACK-01 | Operator runs backfill locally once to build series from data.json git history | History is fully local (non-shallow), 156 commits, loads in ~3.4 s; replay via `apply_snapshot` verified to produce valid history (validate_history passes) |
| BACK-02 | Wrong values before the 2026-05-27 mapping correction do not remain | KEY FINDING: garbage only exists in intermediate 05-27 commits, which the "last commit of day" rule already drops. See Finding 2. Re-baselining is a no-op on real data |
| BACK-03 | Report: per-field change counts, skipped commits, A->B->A | Verified numbers below give expected report content for test/acceptance |
</phase_requirements>

## Summary

The real history is much cleaner than the CONTEXT assumptions in most respects, but has three surprises the plan must handle. (1) The "2026-05-27 mapping correction" is NOT visible as a value shift between per-day snapshots: on 05-27 there were 4 data.json commits; the two middle ones (59b9a86, 9a8f04c) contain garbage (설정일 date parsed as 총보수, e.g. 360200 총보수=20200804.0, 기타비용=0.4421), and the LAST commit of that day (095948f) restores values identical to 05-26. So taking only the last commit per KST day removes the garbage automatically, `detect_bulk_correction` on consecutive per-day snapshots flags NOTHING (on any date), and applying KNOWN_REBASELINES would only delete legit history for no benefit. (2) Early history has leading-zero loss: code `69500` (02-12..02-13) vs `069500` (from 02-14) creates a duplicate series unless codes are zero-padded. (3) Six ETFs (304660, 304670, 426020, 458250, 472870, 476750) exist in 02-12..02-13 and vanish at commit 4fee3c3 (61 -> 59 rows), leaving 6 orphan single-point series.

Replay stats (per-day-last, typo alias, zfill(6), orphans pruned): 1169 points, 32,490 bytes, valid schema, next-day `apply_snapshot` against current data.json yields 0 changes (no-op invariant holds). The replay cross-checks perfectly against changelog.json: all 912 changelog entries (7 months, counts 134/127/134/125/130/132/130) match replay points exactly (0 mismatches).

**Primary recommendation:** Implement `replay(snapshots)` = per-KST-day-last -> alias typo -> zfill(6) numeric codes -> `apply_snapshot` per day; keep `detect_bulk_correction` + KNOWN_REBASELINES logic in place as safety net but expect it to fire zero times (report "0 re-baselines; garbage 05-27 commits dropped by last-of-day rule"); prune codes absent from the final snapshot.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read history from git | Local operator script (subprocess) | — | One-off, not CI |
| Replay / rebaseline / report | Pure function in backfill script | build_fee_history (apply_snapshot) | Testable without git |
| Persist fee-history.json | Static file in repo (atomic write) | Daily CI (build_fee_history) continues appending | Unchanged from Phase 7 |

## Standard Stack

stdlib only: `subprocess`, `json`, `datetime`, `argparse`/manual argv (project pattern `main(argv) -> int`), plus imports from `build_fee_history` (`apply_snapshot`, `empty_history`, `validate_history`, `dump_history`, `write_atomic`, `KST`) and `build_changelog` (`FIELDS`, `build_changes`, `count_compared`, `detect_bulk_correction`). Python 3.14.2 locally [VERIFIED: python --version]. No external packages -> no Package Legitimacy Audit needed.

## Findings (evidence)

### 1. Data shapes across history [VERIFIED: git log/git show + script]
- 156 commits touched data.json; 146 distinct KST dates (2026-02-12 .. 2026-09-30). Repo is not shallow.
- All 156 parse as UTF-8 JSON lists of dicts. No malformed/partial commits, no non-list, no blank codes, no duplicate codes within any commit.
- `종목코드` is always `str`. All fee values are `float` (no strings) in every commit.
- Three key-set eras:
  - commits idx 0-1 (7e07f8d, e808192; 02-12, 02-13): field `매매중계수수료` (typo). NOTE: e808192 ("Fix typo") STILL has the typo in data.json; the data fix is in c5768b8 (02-13, idx 2). So the alias is needed for 2 commits, and both of them are superseded by later same-day commits (see below).
  - idx 2-5 (02-13 .. 03-11): `구분,종목코드,종목명,총보수,기타비용,매매중개수수료,실부담비용`
  - idx 6+ (from 04-09): adds `AUM`, `거래량` (ignored by FIELDS)
- Row counts: 61 (idx 0-2), then 59 from 4fee3c3 (02-13 16:16 KST) onward. No commit with >10% drop relative to previous (61->59 = 3%); a "row-count collapse" guard (e.g. <50% of previous) is never triggered on real data.
- Per-day last commits on 02-13: 4fee3c3 (59 rows, correct field name). So typo alias never actually affects the final replay, but implement it anyway (locked decision; costs one line, tested via fixture).

### 2. The 2026-05-27 event [VERIFIED]
Per-commit diffs (after typo alias):

| commit | KST/UTC time | vs previous commit | detect_bulk_correction |
|--------|--------------|--------------------|------------------------|
| 2ebc808 | 15:29 KST | no change | [] |
| 59b9a86 | 07:35Z | 총보수 59, 기타비용 59, 실부담비용 59 changed (总보수=20200804.0 = 설정일 date, 기타비용=0.4421) | flags 총보수(59), 기타비용(59) |
| 9a8f04c | 07:45Z | 총보수 59, 실부담비용 59 (총보수=0.0001, 기타비용 stays 0.4421) | flags 총보수(59) |
| 095948f | 08:06Z | 총보수, 기타비용, 실부담비용 59 each (back to pre-59b9a86 values) | flags 총보수, 기타비용 |

- 095948f values are IDENTICAL to 05-26 / 05-23 (360200: 0.0047 / 0.06 / 0.0221 / 0.0868 in all of 10822ef, 2ebc808, 095948f, 08ad57e, 4050278). Same for 069500, 133690.
- Therefore with per-day-last snapshots: 05-26 -> 05-27 has ZERO 총보수/기타비용 changes; `detect_bulk_correction` returns [] on every consecutive day pair in the entire history. Only `매매중개수수료`/`실부담비용` change en masse (monthly, ~58/59 ETFs), and those are deliberately outside BULK_CORRECTION_FIELDS.
- Days with non-zero 총보수/기타비용 changes (all legit monthly, never near the 0.5 ratio): 03-11 (기타 18), 04-13 (총보수 1, 기타 10), 05-12 (기타 18), 06-11 (총보수 2, 기타 9), 07-11 (기타 12), 08-10 (기타 15), 09-10 (총보수 2, 기타 10). Max ratio ~0.31 (18/59) < 0.5. No false positives.
- Consequence for BACK-02: the requirement is satisfied by the last-of-day rule. The REBASELINE code path must be implemented (locked) but on real data it must fire 0 times; if KNOWN_REBASELINES["2026-05-27"] were applied unconditionally it would delete pre-05-27 총보수/기타비용 points that are correct (e.g. 기타비용 changes on 03-11, 04-13, 05-12). RECOMMENDATION: make KNOWN_REBASELINES apply only when the detected/declared fields actually show a bulk change between the previous day's snapshot and that day's snapshot (i.e. it is a backup for detection, not an unconditional wipe), or set it to an empty/commented-out entry with a note. Surface this discrepancy to the user (Open Question 1).
- Unit-test the rebaseline logic with a synthetic fixture (bulk change on 총보수 across all codes) since real data does not exercise it. Also add a test that a garbage middle commit followed by a restoring last commit on the same day yields no garbage points.
- Additional defensive option (optional): a sanity bound rejecting values > 5 (garbage was 2.0e7). Real data max is below this: an OUTLIER scan over all per-day-last snapshots found none (>5 or <0).

### 3. Date ordering [VERIFIED]
`git log --reverse --format=%H%x09%cI -- data.json` never goes backwards in KST date across all 156 commits (no rebase/cherry-pick reordering effects). Note `%cI` offsets are mixed: `+09:00` (local commits) and `Z` (Actions). Parse with `datetime.fromisoformat(...).astimezone(KST)`; on Python >= 3.11 `Z` parses natively (3.14 here); on older Pythons replace `Z` with `+00:00` (cheap, do it). The skip-backwards guard still needs to exist (locked), with a fixture test. Note `apply_snapshot` raises ValueError if a date goes backwards, so the guard must be BEFORE calling it.
- Multiple-per-day: 04-09 has 4 commits, 04-30 has 2, 05-27 has 4, 09-30 has 2, 02-13 has 3. Last-of-day = later in list order (since order is monotone).

### 4. Replay result [VERIFIED]
Variant used: per-day-last, typo alias, `zfill(6)` for all-digit codes shorter than 6, prune codes not in final snapshot.
- 1169 points total, `dump_history` size 32,490 bytes (unpruned/unpadded: 1197 pts, 34,038 bytes). `validate_history` passes. updatedAt = 2026-09-10 (last day with a change; `apply_snapshot` only bumps updatedAt on count>0). Daily `build_fee_history.py` on 2026-09-30 data.json yields 0 changes, so the no-op requirement holds (the file text is unchanged).
- Unpruned unpadded points per field: 총보수 71, 기타비용 158, 매매중개수수료 474, 실부담비용 494.
- ETFs with >1 point per field (unpruned): 매매중개수수료 59, 실부담비용 59, 기타비용 36, 총보수 5. (59 = all current ETFs have monthly-changing 매매중개수수료 and 실부담비용.)
- Change dates (points after the first): 02-13 (21, all 실부담비용), 03-11 (134), 04-13 (127), 05-12 (134), 06-11 (125), 07-11 (130), 08-10 (132), 09-10 (130). The 02-13 batch is a 실부담비용 recomputation between 7e07f8d/e808192 and 4fee3c3 (component fields unchanged; e.g. 360200 0.1012 -> 0.0959 while 총보수/기타비용/중개수수료 constant... 중개수수료 0.0312 stays). This is a real value change in the source data (formula/rounding), not an error; it will simply appear as a point. Optional: mention in report.
- Points per series length distribution (pruned): 1 pt: 77 series-fields, 8 pts: 90, 9 pts: 19, 2: 17, others small.
- A->B->A patterns (a value returns to the value two points earlier): 23 total (기타비용 17, 매매중개수수료 3, 실부담비용 3). ZERO within 2 days; all are month-scale reversions (points are ~monthly apart). Under the locked "within 2 days" rule the report will show 0 suspicious patterns on the real data, which is expected. Implement by checking points i-2/i-1/i with (date_i - date_{i-1}) <= 2 days; the informational count of "value returns to earlier value" can also be printed as a secondary line but is optional.

### 5. Cross-check with changelog.json [VERIFIED]
- changelog.json is a list of `{month, updatedAt, changes:[{code,name,field,before,after}]}`, 7 entries (2026-03 .. 2026-09) with 134/127/134/125/130/132/130 changes.
- For every one of the 912 changes, replay `series[code][field]` has a point exactly at `updatedAt` with value == `after` (tol 1e-6): 0 mismatches. Replay change counts per month equal changelog counts exactly.
- 360200 (ACE 미국S&P500) replay: 총보수 [02-12 0.0047]; 기타비용 [02-12 0.06]; 매매중개수수료 02-12 0.0312, 03-11 0.027, 04-13 0.024, 05-12 0.0221, 06-11 0.0235, 07-11 0.0262, 08-10 0.0258, 09-10 0.0253; 실부담비용 02-12 0.1012, 02-13 0.0959, 03-11 0.0917, 04-13 0.0887, 05-12 0.0868, 06-11 0.0882, 07-11 0.0909, 08-10 0.0905, 09-10 0.09. Good spot-check fixture/assertion for a real-data acceptance script.
- Note the changelog has no 02-13 entry (changelog starts at 03); the 21 changes on 02-13 exist only in the replay.

### 6. Gotchas [VERIFIED unless noted]
- **Leading-zero loss:** `69500` in 02-12..02-13 (all first 4 commits) becomes `069500` from 02-14 (396eab1). They never coexist in one snapshot. Without normalization: two series for KODEX 200 (69500 with 1 pt each field, 069500 starting 02-14). With `zfill(6)` on all-digit codes shorter than 6, 069500 gets one continuous series starting 02-12. This affects the codes' point count (069500 총보수 [02-12, 0.15]). Alphanumeric codes such as 0026S0 / 0069M0 are stored as strings and present from 02-12 (not "appearing later"); no fix needed. Codes that first appear later: 283580, 168580, 192090, 463300 (02-13, from 4fee3c3 swap) and 069500/69500 (02-14). Not a problem for apply_snapshot (new codes just start a series).
- **Delisted/removed ETFs:** 304660, 304670, 426020, 458250, 472870, 476750 are in the first 3 commits and vanish at 4fee3c3. Replay leaves 6 orphan series (1 pt per field) and 6 names entries. The current fee-history.json has exactly 59 series/59 names (current data.json codes). Recommend: prune series/names for codes absent from the final snapshot so backfill output is consistent with the current seeded file, and print them in the report ("dropped codes"). (Open Question 2.)
- **Windows UTF-8:** `git show` output must be decoded as UTF-8. Use `subprocess.run(..., capture_output=True)` and `.decode("utf-8")` on bytes (used in the analysis, worked flawlessly), or `text=True, encoding="utf-8"` as `build_changelog.read_previous_data_from_git` does. Don't rely on the default cp949. Also pass `encoding="utf-8"` when reading `git log` output (Korean commit subjects are not requested, only sha+date, so ASCII-safe either way).
- **Performance:** 156 `git show` calls + JSON parsing = 3.4 s total on this machine. No optimization/batching needed (could restrict to last-of-day commits first, giving ~146 calls; trivial either way). `git cat-file --batch` is unnecessary.
- **Path quoting:** `git show <sha>:data.json` works with cwd = repo root; the repo path contains Korean characters + OneDrive, no issue. Run script from repo root (constants like `Path("fee-history.json")` are relative).
- **Import path:** `build_fee_history` does `from build_changelog import ...` (flat imports), so the backfill script in `scripts/` should use the same flat imports `from build_fee_history import ...`; the tests already handle sys.path (see tests/test_fee_history.py pattern).
- **apply_snapshot prints** `[WARNING] fee-history: duplicate 종목코드` (none in real data) and raises ValueError on backwards dates: catch/guard.
- **apply_snapshot semantic:** same-date re-application with changed value replaces or pops the last point; since replay feeds each date once, not relevant. `updatedAt` = last day with changes, not last day replayed: fine, matches daily behaviour.
- **Rounding:** `normalize` rounds to 6 digits; garbage values like 20200804.0 pass `normalize`, so they must be excluded by the last-of-day rule (or by an optional sanity cap), not by normalize.
- **Working tree:** git status shows untracked `.planning/` reports etc., not relevant. fee-history.json is committed daily by CI; pull --rebase before pushing as CONTEXT says.

## Architecture Patterns

### Flow
```
git log --reverse --format=%H%x09%cI -- data.json
   -> [(sha, iso)]  --KST date-->  keep last per date (skip backwards dates -> report)
   -> git show sha:data.json  --utf-8 JSON-->  skip if not list-of-dicts / parse error / row count collapse (-> report)
   -> normalize rows: alias 매매중계수수료 -> 매매중개수수료; zfill(6) all-digit 종목코드
   -> replay(snapshots): for each (date, rows):
        changes = build_changes(prev_rows, rows); bulk = detect_bulk_correction(changes, count_compared)
        if bulk (or KNOWN_REBASELINES date) -> drop those fields' earlier points for all codes
        history, n = apply_snapshot(history, rows, date)
   -> prune codes absent from final snapshot
   -> validate_history; report; (unless --dry-run) write_atomic(fee-history.json, dump_history)
```

### Recommended structure
`scripts/backfill_fee_history.py`: `read_git_snapshots()` (only impure part), `to_kst_date(iso)`, `select_daily(commits)`, `normalize_rows(rows)`, `replay(snapshots) -> (history, report_dict)`, `format_report(report) -> str`, `main(argv) -> int` with `--dry-run`. `tests/test_backfill_fee_history.py`: fixture snapshot lists.

### Rebaseline mechanics
Detection compares consecutive REPLAYED snapshots (post-selection, post-normalization) with `build_changes`/`count_compared` (same matching as changelog: key = (code, name)). Note: the (code,name) key means an ETF renamed between days is not "compared" (skipped) — fine. On detection of fields F on date D: for every code, for f in F: `series[code][f] = []` before applying snapshot D, so `apply_snapshot` then adds the D value as the first point. Only fields in F are wiped (not 실부담비용 etc.)... but 실부담비용 is derived from 총보수/기타비용, so real corrections also change it. Decide whether to include 실부담비용 in the wipe (CONTEXT says only detected 총보수/기타비용; in the observed garbage event 실부담비용 was wrong too, 20200804.4642). Recommend wiping 실부담비용 together with any wiped field because a bad 총보수/기타비용 mapping poisons it. (Open Question 3; moot for real data.)

### Anti-patterns
- Replaying every commit (not last-of-day): would ingest the garbage 59b9a86/9a8f04c values and produce points like 20200804.0.
- Applying KNOWN_REBASELINES unconditionally (see Finding 2).
- Not zero-padding codes (duplicate 69500/069500 series).
- Reading git output with default locale encoding.

## Don't Hand-Roll

| Problem | Don't build | Use instead |
|---------|-------------|-------------|
| Point-appending / change-only dedupe / rounding | new series logic | `apply_snapshot` + `normalize` |
| Schema validation & deterministic dump | new serializer | `validate_history`, `dump_history`, `write_atomic` |
| Bulk change detection | new ratio calc | `detect_bulk_correction`, `build_changes`, `count_compared` |
| Date/tz conversion | manual offset parsing | `datetime.fromisoformat().astimezone(KST)` |

## Common Pitfalls

1. **Garbage 05-27 middle commits leaking in** if last-of-day is per-commit-order wrong. Guard: unit test with fixture (garbage, garbage, restored on same date). Warning sign: any point > 5 in output; assert max value in acceptance script.
2. **Unconditional rebaseline destroys legit data.** Warning sign: after backfill, 기타비용 series have only 1 point per code (real: 36 codes have >1).
3. **Duplicate 69500/069500.** Warning sign: 66 vs 59 series (65 after padding but before prune).
4. **No-op invariant broken** if the last replayed snapshot != current data.json (e.g. data.json modified in working tree, or pruning wrongly). Acceptance check: run `python scripts/build_fee_history.py` after backfill and confirm "no changes; kept existing" (note: run it against committed HEAD data.json; today's re-run updates only if data changed).
5. **updatedAt** will be 2026-09-10 (last change date), not today — expected; not an error.
6. **Backwards date guard vs apply_snapshot ValueError** — guard must precede.

## Code Examples

```python
# Source: verified in throwaway analysis against real history (scratchpad)
KST = timezone(timedelta(hours=9))
def to_kst_date(iso: str) -> str:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(KST).date().isoformat()

def normalize_rows(rows):
    out = []
    for r in rows:
        r = dict(r)
        if "매매중계수수료" in r and "매매중개수수료" not in r:
            r["매매중개수수료"] = r.pop("매매중계수수료")
        code = str(r.get("종목코드", "") or "").strip()
        if code.isdigit() and len(code) < 6:
            r["종목코드"] = code.zfill(6)
        out.append(r)
    return out

def read_git(sha):  # impure part, keep tiny
    p = subprocess.run(["git", "show", f"{sha}:data.json"], capture_output=True, check=True)
    return json.loads(p.stdout.decode("utf-8"))
```

## State of the Art
Not applicable (project-internal one-off). `KNOWN_REBASELINES` premise ("mapping correction changed values on 05-27") is contradicted by data: the ETL mapping was fixed on 05-27 and data.json was regenerated, but the committed final values equal the previous days' values.

## Runtime State Inventory (migration-like regeneration)
| Category | Items | Action |
|----------|-------|--------|
| Stored data | `fee-history.json` (59 series, seeded 2026-09-30, 236 pts) is overwritten wholesale by backfill | Code + one-time data regeneration; commit result |
| Live service config | None (CI workflow unchanged, no fetch-depth change) | none |
| OS-registered state | None | none |
| Secrets/env | None | none |
| Build artifacts | None | none |
CI daily job commits fee-history.json: pull --rebase before pushing; if conflict, keep backfill result and rerun `build_fee_history.py`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Optional sanity cap of 5 on fee values is safe for future data (real max below 5) | Finding 2 | A legit value > 5 would be rejected; low risk (fees are percentages) |

All other claims verified by running commands on the repo history this session.

## Open Questions

1. **KNOWN_REBASELINES semantics (BACK-02).**
   - Known: last-of-day already excludes garbage; per-day detection flags nothing; unconditional wipe would delete correct 기타비용/총보수 history.
   - Recommendation: implement detection-driven re-baseline; keep KNOWN_REBASELINES as a backup that only takes effect if a bulk change actually occurs between the adjacent days; report "re-baselines: 0" and explicitly note the 05-27 garbage commits as skipped/superseded. Ask user to confirm this reinterpretation (it does not change locked outcome "no wrong values remain").
2. **Orphan/delisted codes** (6) and `69500`: recommend prune codes not in final snapshot and zfill(6). Confirm.
3. **Include 실부담비용 in rebaseline wipe?** Recommend yes when 총보수 or 기타비용 wiped (moot on real data).
4. **Intermediate garbage commits in report:** since per-day-last drops 59b9a86/9a8f04c/2ebc808 silently, consider listing superseded same-day commits count in report ("N commits superseded by later same-day commit") rather than as "skipped" errors.

## Environment Availability

| Dependency | Required by | Available | Version |
|------------|-------------|-----------|---------|
| git (full, non-shallow history) | history read | yes | repo not shallow, 156 data.json commits |
| Python | script | yes | 3.14.2 |
| pytest | tests | yes (existing tests/) | — |

## Validation Architecture
Skipped: `workflow.nyquist_validation` is false in .planning/config.json. (Existing tests: tests/test_fee_history.py, tests/test_changelog.py use pytest; add tests/test_backfill_fee_history.py with fixtures for: last-of-day selection, typo alias, zfill, backwards-date skip, non-list/parse-error/row-collapse skip, bulk rebaseline on synthetic data, garbage-then-restore same-day, A->B->A within 2 days, `--dry-run` no write, prune.) Acceptance script values to assert on real repo: 1169 points (if prune+zfill adopted), 59 series/names, 32,490 bytes, 0 re-baselines, 0 A->B->A within 2 days, subsequent build_fee_history no-op, changelog cross-check 912/912.

## Security Domain
Local one-off script; no network, no user input beyond argv flags. Inputs are repo-local git objects, parsed with `json.loads`; subprocess uses list args (no shell), sha from `git log` output. No ASVS categories materially apply. Keep atomic write (temp + os.replace) to avoid corrupting fee-history.json.

## Sources
Primary (HIGH): direct execution against this repo (`git log`, `git show`, throwaway scripts in the session scratchpad, not added to repo); `scripts/build_fee_history.py`, `scripts/build_changelog.py`, `.planning/phases/08-*/08-CONTEXT.md`, `changelog.json`, `fee-history.json`.

## Metadata
Confidence: stack HIGH, architecture HIGH, pitfalls HIGH (all empirical). Valid until: data.json history changes (new commits only append; findings stay valid).
