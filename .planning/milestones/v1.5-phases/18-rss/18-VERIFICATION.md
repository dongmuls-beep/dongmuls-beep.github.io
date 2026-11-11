---
phase: 18-rss
verified: 2026-11-10T00:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 18: RSS 피드 품질 Verification Report

**Phase Goal:** feed.xml이 중복 없이 정확한 수치로 결정적으로 생성된다
**Status:** passed. Re-verification: No.

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Same date/code/field row appears once (FEED-05) | VERIFIED | `build_items` groups by `(updated_at, code)` and keys rows by field (later wins), build_rss.py:136-143. Tests `test_duplicate_rows_once`, `_later_wins`, `_within_one_entry` |
| 2 | Numbers not truncated to 6 sig digits (FEED-06) | VERIFIED | `fmt_num` uses `Decimal(repr(x))` "f" format, no `%g`, build_rss.py:50-53. `test_exact_numbers` covers 0.1234567, 0.00001 (no exponent), 1.0 to 1 |
| 3 | Same input gives byte-identical output; test compares bytes (FEED-07) | VERIFIED | Items sorted by code then date; LF-normalized bytes. `test_deterministic_build_subprocess` runs real subprocesses under PYTHONHASHSEED 0 and 12345 and asserts `b1 == b2` on `read_bytes()`. `test_items_order_independent` compares bytes too |
| 4 | .gitattributes applies to feed.xml; no leftover .tmp (FEED-08) | VERIFIED | `.gitattributes` has `feed.xml text eol=lf`; `git ls-files --eol feed.xml` gives `i/lf w/lf attr/text eol=lf`. `write_if_changed` unlinks stale tmp up front and in `finally`. `test_no_tmp_left_after_success` asserts no `*.tmp`; none in repo |

## Phase 17 regression

- `python scripts/build_rss.py --changelog nope.json` returns exit 1 and `feed.xml` is untouched (git status clean).
- Tests `test_main_fails_and_keeps_feed`, `test_main_bad_inputs_keep_feed`, `test_empty_items_keep_existing_feed` pass.
- Real build: `50 items, unchanged`, exit 0, so committed feed.xml equals the current builder output.

## Behavioral checks

- `python -m pytest tests/ -q`: 408 passed.
- Debt markers (TBD/FIXME/XXX/TODO) in build_rss.py: none.
- Requirements FEED-05..08: all satisfied; no orphaned requirements.

## Human verification

None required.

## Gaps

None.
