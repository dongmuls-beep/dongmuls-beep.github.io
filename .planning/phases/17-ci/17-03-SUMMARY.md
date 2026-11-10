---
phase: 17-ci
plan: 03
requirements-completed: [CI-01, DATA-11]
completed: 2026-11-10
---

# Plan 17-03 Summary

CI-01 confirmed in a real GitHub Actions run (workflow_dispatch run 42822562694, headSha 536e704): "Run unit tests", "Run fee chart check" and "Run compare and a11y node checks" all succeeded; "Build RSS Feed" succeeded and "Fail if RSS build failed" was skipped as designed.

## Deviation (found during run)

The first dispatched run (42822347993) failed in "Run unit tests": 7 `test_crlf_no_bom` failures. Daily scheduled runs had been failing since at least 2026-10-31, so data.json was not refreshed. Cause: the test required CRLF, but the repo stores LF and CI checks out LF. Fixed in `tests/test_html_a11y.py` (commit 536e704): all-CRLF or all-LF passes, mixed endings and BOM still fail.

## Commits

- 536e704 test(17-03): accept LF or CRLF in html line-ending check
- f56ad11 docs(17-03): record real CI run evidence for CI-01
- 00f7456 Auto-update ETF data (Daily) — written by CI from the passing run

## Notes

- Push and workflow dispatch ran with user approval ("gh 로그인 후 전부 진행").
- The RSS failure path was not exercised on GitHub; it is covered by tests/test_rss.py.
- Evidence: 17-CI-RUN-EVIDENCE.md
