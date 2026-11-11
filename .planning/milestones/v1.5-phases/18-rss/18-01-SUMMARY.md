---
phase: 18-rss
plan: 01
subsystem: rss
tags: [rss, determinism, dedup, gitattributes]
requires: []
provides:
  - duplicate-free, exact-number, deterministic feed.xml build
affects: [scripts/build_rss.py, tests/test_rss.py, .gitattributes]
tech-stack:
  added: []
  patterns: [stdlib only, tmp_path fixtures, subprocess hash-seed determinism test]
key-files:
  created: [.gitattributes]
  modified: [scripts/build_rss.py, tests/test_rss.py]
key-decisions:
  - "Later row wins per (date, code, field), matching build_changelog same-day replace"
  - "Empty items never overwrite a feed.xml containing <item>; exit 1"
requirements-completed: [FEED-05, FEED-06, FEED-07, FEED-08]
duration: short
completed: 2026-11-10
---

# Phase 18 Plan 01: RSS dedup, exact numbers, determinism Summary

Feed build now dedups per (date, code, field) with later-wins, prints exact fee numbers via `fmt_num` (repr + Decimal "f"), uses ASCII-only DATE_RE and escaped CONTROL_RE, guards against empty-overwrite, always removes stale `feed.xml.tmp`, and `.gitattributes` pins feed.xml to LF.

## Tasks / Commits
All three tasks committed together in e72eab4 (`fix(18-01): dedup, exact numbers, deterministic feed, feed.xml eol`) because the files overlap across tasks (build_rss.py and test_rss.py).

## Verification
- `python -m pytest tests/ -q`: 408 passed.
- Local `build_rss.py` run twice against repo inputs: "written" then "unchanged"; `git diff feed.xml` empty (no content change from new format/dedup). feed.xml was unmodified before; restored via `git checkout -- feed.xml` (git status showed a stat-only M after the .gitattributes commit; content identical).
- `git ls-files --eol feed.xml`: `i/lf w/lf attr/text eol=lf`; `check-attr eol script.js`: unspecified.

## Deviations from Plan
- Task commits merged into one commit (see above).
- CONTROL_RE uses ASCII escape text `￾￿` per orchestrator instruction; tests build the characters with chr().
- test_byte_identical_rerun renamed test_no_clock_calls (as planned).

## Known Stubs
None.

## Self-Check: PASSED
