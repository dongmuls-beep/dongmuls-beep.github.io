---
phase: 25-finish-verify
plan: 05
subsystem: verify
tags: [push, server-dryrun, prices, live-check]
requires: [25-04]
requirements-completed: [VERIFY-01, NAV-01]
metrics:
  completed: 2026-11-21
---

# Phase 25 Plan 05: push, server verification, live checks

PUSHED_SHA: 3037bdaf7eff9dfe619586602db1b74ac687baa0 (origin 501ef94..3037bda, normal push, no force)
NAV commit SHA (post-rebase): 235188e1173066c1a3384facaf71f2caab4eb13c (the pull --rebase was a no-op: "Current branch main is up to date", so the SHA did not change)

## Local gate (before and after the rebase, same tree)
pytest 483 passed; fee_chart, compare_*, a11y_*, portfolio_* node checks all ok.

## Server (dongmul@172.30.1.27, no sudo)
- Busy check clear. Clone pulled, PUSHED_SHA is an ancestor of HEAD, clone was clean.
- Runner copies: `run-prices.sh` identical. `run-etl.sh` differed; diff:
  `17c17` old `for f in tests/compare_*_check.js tests/a11y_*_check.js; do node "$f"; done`
  new `... tests/a11y_*_check.js tests/portfolio_*_check.js; do node "$f"; done`.
  Backup `~/etf-deploy/run-etl.sh.bak-phase25`, replaced via `install -m 755` from the clone. `bash -n` ok, glob count 1.
- DRY_RUN=1 run-etl.sh: exit=0, pytest "483 passed", log ends `ETL OK 2026-11-21T22:26:08+09:00`, no "another run in progress". Note: the DRY_RUN ETL still POSTs to GAS_WEB_APP_URL (documented in server_ops.md; "Update Status: 200 Success Result Update").
- Dry-run outputs restored with git checkout; no tracked changes.
- run-prices.sh: exit=0, `PRICES OK 2026-11-21T22:26:36+09:00`. Clone `## main...origin/main`, HEAD `3037bda docs(25-04): summary` (no price changes to commit), prices-meta as_of 2026-11-19.
- Next timers: etf-etl 2026-11-22 09:00 KST, etf-prices 2026-11-22 14:30 KST.

## Live (etfsave.life)
| URL | Result |
|---|---|
| / | contains href="/portfolio/" |
| /portfolio/ | 200; noindex,follow present; pf-disclaimer present; data-i18n="nav_portfolio" present; no adsbygoogle, no gtag |
| /portfolio/portfolio-view.js | 200 |
| /prices/360750.json | 200 |
| /prices-meta.json | 200 |
| /sitemap.xml, /feed.xml | no "/portfolio/" |

## Rollback
- Nav: `git pull --rebase origin main; git revert 235188e1173066c1a3384facaf71f2caab4eb13c`; run the local gate; `git push origin HEAD:main`. Page stays reachable by URL, unlinked (noindex already).
- Data withdrawal (PRICES-CONTRACT): on the server `systemctl --user disable --now etf-prices.timer`; locally `git rm -r prices prices-meta.json`, commit, pull --rebase, push. Page then shows its price-load error state.
- Server runner: `cp ~/etf-deploy/run-etl.sh.bak-phase25 ~/etf-deploy/run-etl.sh`.

GitHub Actions daily workflows remain disabled (intended); VERIFY-01 "new workflow once" is satisfied by the server runner per CONTEXT.

## Deviations
None.

## Self-Check: PASSED
