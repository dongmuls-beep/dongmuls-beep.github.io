"""Static wiring assertions for price_update.yml (no network, no yaml dep)."""

import os
import re

ROOT = os.path.dirname(os.path.dirname(__file__))
WF = os.path.join(ROOT, ".github", "workflows")


def read(name):
    with open(os.path.join(WF, name), encoding="utf-8") as f:
        return f.read()


def cron(text):
    return re.search(r"cron:\s*'([^']+)'", text).group(1)


def test_cron_distinct():
    assert cron(read("price_update.yml")) != cron(read("daily_update.yml"))


def test_concurrency_and_secret():
    t = read("price_update.yml")
    assert "concurrency:" in t and "price-update" in t
    assert "secrets.DATA_GO_KR_KEY" in t
    assert "build_price_history.py --mode" in t


def test_file_pattern_restricted():
    m = re.search(r'file_pattern:\s*"([^"]*)"', read("price_update.yml"))
    assert m.group(1).split() == ["prices/*.json", "prices-meta.json"]


def test_no_unsafe_constructs():
    t = read("price_update.yml")
    assert "continue-on-error" not in t
    assert "set -x" not in t


def test_mode_input_safe():
    t = read("price_update.yml")
    assert "type: choice" in t
    assert "- incremental" in t and "- backfill" in t
    assert "MODE:" in t
    for line in t.splitlines():
        if line.strip().startswith("run:"):
            assert "${{ inputs.mode" not in line


def test_daily_update_separate():
    assert "prices" not in read("daily_update.yml")
