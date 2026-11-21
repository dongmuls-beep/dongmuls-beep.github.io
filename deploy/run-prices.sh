#!/usr/bin/env bash
# Daily ETF close collection on the home server. Results stay on the server
# (~/etf-prices); nothing is pushed to GitHub.
set -euo pipefail
cd "$HOME/etf-prices"
exec 9>/tmp/etf-prices.lock
flock -n 9 || { echo "another run in progress"; exit 0; }
set -a; . "$HOME/.etf-env"; set +a
export PYTHONUNBUFFERED=1
/var/www/etfsave/.venv/bin/python scripts/build_price_history.py --mode incremental \
  --data /var/www/etfsave/data.json --out prices --meta prices-meta.json
echo "PRICES OK $(date -Is)"
