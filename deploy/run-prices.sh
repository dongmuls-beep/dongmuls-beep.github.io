#!/usr/bin/env bash
# Daily ETF close collection on the home server. Mirrors .github/workflows/price_update.yml
# and pushes prices/*.json + prices-meta.json to main.
set -euo pipefail
REPO=/var/www/etfsave
cd "$REPO"
exec 9>/tmp/etf-etl.lock
flock -w 900 9 || { echo "lock busy"; exit 1; }
set -a; . "$HOME/.etf-env"; set +a
export PYTHONUNBUFFERED=1

git pull --rebase --autostash -q origin main
.venv/bin/python scripts/build_price_history.py --mode incremental

git add prices prices-meta.json
if ! git diff --cached --quiet; then
  git commit -q -m "Auto-update ETF prices (Daily)"
  git pull --rebase -q origin main
  git push -q origin HEAD:main
fi
echo "PRICES OK $(date -Is)"
