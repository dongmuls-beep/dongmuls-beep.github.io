"""WR-02 (phase 10 review): fail-closed gate on the 실부담비용 null ratio.

Fixture-only. The working dir is tmp_path, and requests.post is stubbed.
"""
import json

import pytest

import etl_process
from etl_process import update_google_sheets


def rows(n_null, n_ok):
    out = [{"종목코드": f"N{i:03d}", "실부담비용": None} for i in range(n_null)]
    out += [{"종목코드": f"K{i:03d}", "실부담비용": 0.1} for i in range(n_ok)]
    return out


@pytest.fixture
def workdir(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    posts = []
    monkeypatch.setattr(etl_process.requests, "post", lambda *a, **k: posts.append(a))
    monkeypatch.setattr(etl_process, "NULL_COST_MAX_RATIO", 0.5)
    existing = tmp_path / "data.json"
    existing.write_text('[{"old": true}]', encoding="utf-8")
    return tmp_path, existing, posts


def test_over_threshold_fails_closed(workdir, capsys):
    tmp_path, existing, posts = workdir
    assert update_google_sheets(rows(3, 1)) is False
    assert existing.read_text(encoding="utf-8") == '[{"old": true}]'
    assert not (tmp_path / "update-meta.json").exists()
    assert posts == []
    out = capsys.readouterr().out
    assert "[ERROR]" in out and "3/4" in out


def test_all_null_fails_closed(workdir):
    _, existing, _ = workdir
    assert update_google_sheets(rows(5, 0)) is False
    assert existing.read_text(encoding="utf-8") == '[{"old": true}]'


def test_exactly_threshold_writes(workdir):
    tmp_path, existing, _ = workdir
    data = rows(2, 2)
    assert update_google_sheets(data) is True
    assert json.loads(existing.read_text(encoding="utf-8")) == data
    assert (tmp_path / "update-meta.json").exists()


def test_under_threshold_writes(workdir, capsys):
    _, existing, _ = workdir
    data = rows(1, 3)
    assert update_google_sheets(data) is True
    assert json.loads(existing.read_text(encoding="utf-8")) == data
    assert "[ERROR]" not in capsys.readouterr().out


def test_threshold_override(workdir, monkeypatch):
    _, existing, _ = workdir
    monkeypatch.setattr(etl_process, "NULL_COST_MAX_RATIO", 0.2)
    assert update_google_sheets(rows(1, 3)) is False
    assert existing.read_text(encoding="utf-8") == '[{"old": true}]'


@pytest.mark.parametrize(
    "env, expected",
    [(None, 0.5), ("0.3", 0.3), ("0", 0.0), ("1", 1.0), ("abc", 0.5), ("1.5", 0.5), ("-0.1", 0.5)],
)
def test_env_ratio(monkeypatch, env, expected):
    if env is None:
        monkeypatch.delenv("NULL_COST_MAX_RATIO", raising=False)
    else:
        monkeypatch.setenv("NULL_COST_MAX_RATIO", env)
    assert etl_process._env_ratio("NULL_COST_MAX_RATIO", 0.5) == expected
