---
phase: 17-ci
reviewed: 2026-11-10T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - scripts/build_rss.py
  - tests/test_rss.py
  - .github/workflows/daily_update.yml
  - etl_process.py
  - tests/test_validate.py
  - tests/test_html_a11y.py
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 17: Code Review Report

**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

No blockers. RSS builder is defensive (atomic write, input validation, fail-closed on bad input). DATA-12 check and the tests are correct. Three robustness warnings and three info items.

## Warnings

### WR-01: DATE_RE accepts non-ASCII digits

**File:** `scripts/build_rss.py:31`
**Issue:** `\d` matches Unicode digits in str patterns. `"٢٠٢٤-٠١-٠١"` passes `fullmatch`, `int()` parses it, and the non-ASCII date lands in guid and pubDate source. Verified with python.
**Fix:** `DATE_RE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")` (or `re.ASCII`).

### WR-02: Duplicate description lines when the same (date, code) appears in several entries

**File:** `scripts/build_rss.py:129-135`
**Issue:** Rows from multiple entries sharing one `updatedAt` are appended to one group with no dedup. Description and title `kinds` then repeat the same field/line. Item guid stays unique, but the content is wrong.
**Fix:** Dedup by `(field, before, after)` before `make_item`, or keep the last row per field.

### WR-03: Empty or garbage changelog silently wipes feed.xml

**File:** `scripts/build_rss.py:220-225`
**Issue:** `[]` passes the `isinstance(list)` check, so an empty feed is written over a good one. This happens if changelog.json is truncated to `[]`. The bulk filter can also empty it. The empty-feed result is committed.
**Fix:** If `items` is empty but the existing output file has items, keep the old file and warn. Or log a loud warning when `len(entries) > 0 and not items`.

## Info

### IN-01: Literal noncharacters in CONTROL_RE source

**File:** `scripts/build_rss.py:33`
**Issue:** U+FFFE/U+FFFF are embedded as raw characters. Editors and tools may strip them, which silently breaks the filter.
**Fix:** Use escapes: `￾￿`.

### IN-02: `format(x, "g")` loses precision and may switch to exponent

**File:** `scripts/build_rss.py:102`
**Issue:** `g` keeps 6 significant digits. Tiny fee changes can render as "0.05% → 0.05% (인상)". Values below 1e-4 render as `1e-05`.
**Fix:** Use `repr(float)`, or `format(x, ".4f").rstrip("0").rstrip(".")`.

### IN-03: DATA-12 boundary untested, constant defined inside the function

**File:** `etl_process.py:702`, `tests/test_validate.py:195`
**Issue:** There is no case at exactly 5x (float edge, for example 0.05 vs 0.01). `FEE_RATIO_THRESHOLD` is a function-local constant, matching `ANOMALY_THRESHOLD`, but it cannot be imported by tests. A non-numeric fee (str) would raise `TypeError` at line 709. The same assumption already exists in DATA-03.
**Fix:** Add a boundary parametrize case. Hoist the constant to module level.

---

_Reviewed: 2026-11-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
