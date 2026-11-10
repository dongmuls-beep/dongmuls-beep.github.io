# 17-03 CI Run Evidence (CI-01, DATA-11)

**Passing run:** https://github.com/dongmuls-beep/dongmuls-beep.github.io/actions/runs/42822562694
**Run id:** 42822562694 (workflow_dispatch, daily_update.yml, conclusion: success)
**headSha:** 536e704847f47d48e3d744d6672c22b9e8a2d154
**Date:** 2026-11-10

## Step conclusions

| Step | Conclusion |
|------|-----------|
| Run unit tests | success (396 passed) |
| Run fee chart check | success |
| Run compare and a11y node checks | success |
| Run ETL Script | success |
| Build Changelog | success |
| Build RSS Feed | success |
| Build Fee History | success |
| Commit and Push changes | success |
| Fail if RSS build failed | skipped (RSS succeeded, as designed) |

## Node check files that ran (from log)

compare_calc_check.js, compare_calculator_check.js, compare_chart_check.js, compare_css_check.js, compare_select_check.js, compare_view_check.js, a11y_states_check.js, a11y_table_check.js. `fee_chart_check OK`.

## Finding: daily runs were failing before this phase

Run 42822347993 (same code, headSha 0c5345f) failed in "Run unit tests": 7 failures of `tests/test_html_a11y.py::test_crlf_no_bom[*]`. Scheduled runs failed every day from at least 2026-10-31 through 2026-11-10 (12 consecutive failures listed by `gh run list`), so data.json was not refreshed in that period.

**Cause:** the test required every "\n" to be part of "\r\n". The repository stores LF; the local Windows checkout (core.autocrlf=true) is CRLF, the CI Linux checkout is LF.
**Fix (commit 536e704, tests/test_html_a11y.py only):** accept all-CRLF or all-LF; mixed endings and BOM still fail.
The failure-path of "Fail if RSS build failed" was not exercised on GitHub (no RSS failure occurred); it is covered by the unit tests in tests/test_rss.py.
