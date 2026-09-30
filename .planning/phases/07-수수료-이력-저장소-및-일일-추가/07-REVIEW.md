---
phase: 07-수수료-이력-저장소-및-일일-추가
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - scripts/build_fee_history.py
  - tests/test_fee_history.py
  - .github/workflows/daily_update.yml
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-09-30
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

I reviewed `scripts/build_fee_history.py`, its tests, and the daily workflow wiring against the locked decisions in 07-CONTEXT.md. I also read `scripts/build_changelog.py` and `etl_process.py` for context. The pure-function split, fail-closed loading, and deterministic dump all match the decisions. However, I ran probes against `apply_snapshot` and they show that non-finite values (NaN/inf) get past every guard. The upstream ETL really does produce these values. Once in, they are appended again on every run and written as invalid JSON. The probes also showed that duplicate codes, dates that go backwards, and a non-atomic write can each corrupt or confuse the append-only history. The tests do not cover any of these cases.

## Critical Issues

### CR-01: NaN/Infinity get into fee-history, are appended again every day, and are written as invalid JSON

**File:** `scripts/build_fee_history.py:30-34, 66, 95-101, 113-117`
**Issue:** `normalize()` relies on `build_changelog.to_float`, which calls `float(cleaned)`. That accepts `"nan"`, `"inf"`, `"Infinity"`, and real float NaN. This happens in practice: `etl_process.p_float` (etl_process.py:427-437) returns `float("nan")` for an empty pandas Excel cell, because `str(nan) == "nan"` parses without error. `json.dump` (etl_process.py:766, `allow_nan=True` by default) then writes `NaN` into data.json. What follows:
1. `NaN != NaN`, so `points[-1][1] != value` (line 66) is always True. A new `[date, NaN]` point is appended on **every** run, and `count` goes up every day. The history grows with no limit, which breaks the "record only changes" rule (HIST-02).
2. On a same-day rerun, `points[-1][1] == value` (line 59) is False for NaN, so the idempotence rule is also broken.
3. `dump_history` writes the bare literal `NaN`. That is not valid JSON, so browser `JSON.parse` rejects the whole file. Phase 9 UI would fail to load all fee history.
4. `validate_history` accepts NaN/inf (`isinstance(nan, float)`), and `json.loads` parses `NaN`. The fail-closed gate never triggers, so the bad file stays in place indefinitely.

I confirmed this by running `apply_snapshot` twice with `총보수="nan"` on two dates. It produced `[['2026-10-01', nan], ['2026-10-02', nan]]`, and `dump_history` printed `NaN`.
**Fix:**
```python
import math

def normalize(value: Any) -> float | None:
    number = to_float(value)
    if number is None or not math.isfinite(number):
        return None
    return round(number, ROUND_DIGITS)

# validate_history point check: add
    or not math.isfinite(point[1])

# dump_history: fail loudly instead of emitting invalid JSON
json.dumps(history, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
```
Add tests for `"nan"`, `float("nan")`, `"inf"` as row values, and for a NaN point in `validate_history`.

## Warnings

### WR-01: Duplicate 종목코드 rows cause last-row-wins overwrites and fake daily "changes"

**File:** `scripts/build_fee_history.py:45-70`
**Issue:** `apply_snapshot` processes rows in order and never checks for duplicate codes. If data.json has two rows with the same code (build_changelog keys by `(code, name)`, which suggests this can happen), the second row replaces the first row's same-day point. The result depends on row order. Worse, it is not idempotent in any useful sense. My probe used rows `[A:0.1, A:0.2]` on day 1, which gives `[[D1, 0.2]]` with count=2. The same rows on day 2 append `[D2, 0.1]` and then pop it. The series ends unchanged, but `count=2`, `updatedAt` is moved to D2, the file is rewritten, and the log reports "recorded 2 changes". This repeats every day.
**Fix:** Before the loop, detect duplicate codes. Either fail closed (`raise ValueError(f"duplicate 종목코드 {code}")`, handled in `main`) or merge deterministically and log a `[WARNING]`. Add a test for duplicate codes.

### WR-02: Chronological order is assumed but never checked; a backwards date corrupts series order

**File:** `scripts/build_fee_history.py:57-70, 94-102`
**Issue:** The logic treats `points[-1]` as the latest point, but nothing guarantees it. `validate_history` only checks that `point[0]` is a `str`. It does not check ISO date format or ascending order. `apply_snapshot` also does not reject a `date` earlier than `points[-1][0]`. A probe with an existing `[['2026-12-01', 0.1]]` and a snapshot dated `2026-10-01` produced `[['2026-12-01', 0.1], ['2026-10-01', 0.2]]`, which is out of order. Ways this can happen: the Phase 8 backfill rewrites the file (it is designed to reuse `apply_snapshot`), a manual edit, or clock skew. After that, the "previous value" comparisons are wrong for good.
**Fix:** In `validate_history`, parse each date with `date.fromisoformat(point[0])` and require strictly increasing dates within each series. In `apply_snapshot`, raise `ValueError` when `points and date < points[-1][0]`.

### WR-03: Non-atomic write can leave a truncated fee-history.json

**File:** `scripts/build_fee_history.py:149`
**Issue:** `HISTORY_FILE.write_text(...)` truncates the file and then writes into it. If the process is interrupted (runner cancellation, disk full) partway through, a partial file is left behind. The next run then fails closed permanently. Every daily job keeps failing until someone repairs the file by hand, and this history cannot be regenerated from data.json.
**Fix:** Write to a temp file in the same directory, then swap it in:
```python
tmp = HISTORY_FILE.with_suffix(".json.tmp")
tmp.write_text(text, encoding="utf-8", newline="\n")
os.replace(tmp, HISTORY_FILE)
```

### WR-04: The ETL turns unparseable fees into 0.0, which defeats the "null keeps previous value" rule

**File:** `scripts/build_fee_history.py:54-56` (depends on `etl_process.py:427-437`)
**Issue:** The locked decision says a null or blank value must never be recorded as a change. `normalize` handles `None`/`""`/`"-"` correctly. But `etl_process.p_float` returns `0.0` for any parse failure (`"N/A"`, `None`, etc.), so data.json holds `0.0`, not null. fee-history then records a real-looking drop to 0.0, and a jump back the next time parsing works. These fake points stay in the append-only history for good, and Phase 9 will show them to users. The null-skip tests pass only because they feed values the ETL never actually produces.
**Fix:** Make `p_float` return `None` on failure and on non-finite values, so data.json carries `null`. Check that the other data.json consumers accept null. If that is out of scope, at least log a `[WARNING]` when a field goes from nonzero to exactly 0.0, and track the ETL change in the backlog.

### WR-05: Row and name contents are not validated, so bad input bypasses the fail-closed error path

**File:** `scripts/build_fee_history.py:84-85, 120-126`
**Issue:** `load_rows` checks only that the payload is a list. A non-dict element (for example `[1, "x"]`) raises `AttributeError` at `row.get` (line 46). That is outside the `try/except (OSError, ValueError)` block, so the user gets a raw traceback, not the `[ERROR] fee-history:` message the contract requires. `validate_history` also accepts non-string values in `names` (e.g. `{"C001": 123}`) and does not check that `series` field keys belong to `FIELDS`.
**Fix:** In `load_rows`, `if not all(isinstance(r, dict) for r in payload): raise ValueError(...)`. In `validate_history`, require `isinstance(name, str)` for every entry in `names`, and optionally `field in FIELDS`.

## Info

### IN-01: Tests do not cover the failure modes above

**File:** `tests/test_fee_history.py:147-164`
**Issue:** There are no tests for NaN/inf values (CR-01), duplicate codes (WR-01), backwards or badly formatted dates (WR-02), or non-dict rows (WR-05). `test_validate_rejects` does not include a NaN point or a non-ISO date string.
**Fix:** Add parametrized cases for each of these.

### IN-02: Same-day revert moves updatedAt forward and counts a change even when the net state is unchanged

**File:** `scripts/build_fee_history.py:61-65, 72-73`
**Issue:** After the `pop()` revert, the series matches the previous day exactly, but `count` is incremented and `updatedAt` becomes today. The log says "recorded 1 changes", although net history did not change compared with yesterday.
**Fix:** Either document this as intended or track the net change separately. The test at line 120 currently asserts `n == 1`.

### IN-03: Unknown CLI arguments are silently ignored

**File:** `scripts/build_fee_history.py:130-131`
**Issue:** A typo such as `--int` runs normal mode with no warning.
**Fix:** Use `argparse`, or reject any argument other than `--init`.

### IN-04: Date basis differs between changelog (UTC) and fee-history (KST)

**File:** `.github/workflows/daily_update.yml:52-56` (with `scripts/build_changelog.py:223`)
**Issue:** `build_changelog` uses naive `datetime.now()`, which is UTC on the runner, while fee-history uses KST. The scheduled 00:00 UTC run gives the same date for both. A `workflow_dispatch` run between 00:00 and 09:00 KST writes the previous day's date to changelog.json but today's date to fee-history.json.
**Fix:** Put this in the backlog: switch build_changelog to the same KST helper.

### IN-05: A fee-history failure now blocks the whole daily data commit; no concurrency guard

**File:** `.github/workflows/daily_update.yml:55-62`
**Issue:** Failing CI on corruption is the locked decision. Note, though, that any `build_fee_history` failure (including the traceback cases in WR-05) now skips the commit step, so data.json, changelog.json, and update-meta.json are not updated either. The workflow also has no `concurrency:` group. A manual dispatch that overlaps the scheduled run can race on fee-history.json and on the auto-commit push.
**Fix:** Add `concurrency: { group: daily-update, cancel-in-progress: false }`. Also state in the ops docs that a fee-history failure stops the whole daily publish.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
