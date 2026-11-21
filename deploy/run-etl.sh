#!/usr/bin/env bash
# Daily ETL on the home server. Mirrors .github/workflows/daily_update.yml.
# DRY_RUN=1 skips pull/commit/push.
set -euo pipefail
REPO=/var/www/etfsave
cd "$REPO"
exec 9>/tmp/etf-etl.lock
flock -n 9 || { echo "another run in progress"; exit 0; }
set -a; . "$HOME/.etf-env"; set +a
export PYTHONUNBUFFERED=1
PY="$REPO/.venv/bin/python"

[ -n "${DRY_RUN:-}" ] || git pull --rebase --autostash -q origin main

"$PY" -m pytest tests/ -q
node tests/fee_chart_check.js
for f in tests/compare_*_check.js tests/a11y_*_check.js tests/portfolio_*_check.js; do node "$f"; done

xvfb-run --server-args="-screen 0 1920x1080x24" "$PY" etl_process.py
"$PY" scripts/build_changelog.py
RSS_FAIL=0
"$PY" scripts/build_rss.py || RSS_FAIL=1
"$PY" scripts/build_fee_history.py

if [ -z "${DRY_RUN:-}" ]; then
  git add data.json changelog.json update-meta.json fee-history.json feed.xml
  if ! git diff --cached --quiet; then
    git commit -q -m "Auto-update ETF data (Daily)"
    git pull --rebase -q origin main
    git push -q origin HEAD:main
  fi
fi
[ "$RSS_FAIL" = 0 ] || { echo "RSS build failed"; exit 1; }
echo "ETL OK $(date -Is)"
