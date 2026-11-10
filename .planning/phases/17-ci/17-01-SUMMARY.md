---
phase: 17-ci
plan: 01
subsystem: ci
tags: [rss, github-actions, reliability]
requires: []
provides:
  - build_rss.py exits 1 on failure, feed.xml untouched
  - daily_update.yml fails run after data commit when RSS step fails
affects: [scripts/build_rss.py, tests/test_rss.py, .github/workflows/daily_update.yml]
key-files:
  modified:
    - scripts/build_rss.py
    - tests/test_rss.py
    - .github/workflows/daily_update.yml
decisions:
  - "RSS step keeps continue-on-error so data commits; final step fails run via steps.rss.outcome"
metrics:
  completed: 2026-11-10
---

# Phase 17 Plan 01: RSS failure visibility Summary

build_rss.py now returns 1 on exceptions or non-list changelog/data (feed.xml untouched); workflow commits data, then fails the run with an ::error:: annotation.

## Tasks

1. build_rss.py + tests: commit 83da229
2. daily_update.yml (`id: rss`, final "Fail if RSS build failed" step): commit 9ffaaf7

## Deviations from Plan

- test_main_fails_and_keeps_feed: now writes valid empty `[]` x.json/y.json so the injected build_items error is reached (otherwise the new input guard returns 1 first and "kaboom" never appears in stderr). Minor test fixture fix.
- pytest is not installed in the local Python (installing not allowed). Ran all tests/test_rss.py functions via a small ad-hoc harness (tmp_path/monkeypatch/capsys emulation): 0 failures. Full `pytest tests/` not run locally; real run happens in CI (17-03). YAML not parsed (no PyYAML); grep checks only. No CRLF.

## Known Stubs

None.

## Self-Check: PASSED
