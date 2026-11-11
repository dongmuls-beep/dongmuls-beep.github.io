"""Offline CLI tests for scripts/build_price_history.py (PRICE-02/03). No network."""

import json
import os
import subprocess
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))
import build_price_history as bph  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(__file__))


@pytest.fixture
def env(monkeypatch, tmp_path):
    monkeypatch.setenv("DATA_GO_KR_KEY", "k" * 32)
    data = tmp_path / "data.json"
    data.write_text(json.dumps([{"종목코드": "360200"}, {"종목코드": "0026S0"}]),
                    encoding="utf-8")
    return tmp_path


def argv(tmp, mode, *extra):
    return ["--mode", mode, "--data", str(tmp / "data.json"), "--out", str(tmp / "prices"),
            "--meta", str(tmp / "meta.json"), *extra]


def test_backfill_begin_and_files(env, monkeypatch):
    calls = []

    def fake(code, begin):
        calls.append((code, begin))
        return [("2026-01-02", 100), ("2026-01-05", 101)]

    monkeypatch.setattr(bph, "fetch_series", fake)
    assert bph.main(argv(env, "backfill")) == 0
    assert calls == [("360200", "20210101"), ("0026S0", "20210101")]
    assert (env / "prices" / "360200.json").exists()
    assert json.loads((env / "meta.json").read_text())["collected"] == 2


def test_incremental_begin_union_and_no_rewrite(env, monkeypatch):
    monkeypatch.setattr(bph, "fetch_series",
                        lambda c, b: [("2026-01-02", 100), ("2026-01-05", 101)])
    bph.main(argv(env, "backfill", "--codes", "360200"))
    f = env / "prices" / "360200.json"
    before = f.read_bytes()
    calls = []

    def fake(code, begin):
        calls.append((code, begin))
        return [("2026-01-05", 101)]

    monkeypatch.setattr(bph, "fetch_series", fake)
    assert bph.main(argv(env, "incremental")) == 0
    assert calls == [("360200", "20251229"), ("0026S0", "20210101")]
    assert f.read_bytes() == before
    assert (env / "prices" / "0026S0.json").exists()


def test_incremental_union(env, monkeypatch):
    monkeypatch.setattr(bph, "fetch_series", lambda c, b: [("2026-01-02", 100)])
    bph.main(argv(env, "backfill", "--codes", "360200"))
    monkeypatch.setattr(bph, "fetch_series", lambda c, b: [("2026-01-06", 105)])
    bph.main(argv(env, "incremental", "--codes", "360200"))
    obj = json.loads((env / "prices" / "360200.json").read_text())
    assert obj["dates"] == ["2026-01-02", "2026-01-06"]


def test_missing_key_exit1(env, monkeypatch, capsys):
    monkeypatch.delenv("DATA_GO_KR_KEY")
    assert bph._run(argv(env, "incremental")) == 1
    assert capsys.readouterr().out.strip() == "DATA_GO_KR_KEY not set"


def test_guard_trip_exit2(env, monkeypatch):
    monkeypatch.setattr(bph, "fetch_series", lambda c, b: [])
    assert bph.main(argv(env, "backfill")) == 2
    assert not (env / "prices").exists() and not (env / "meta.json").exists()


def test_codes_and_ratio_override(env, monkeypatch):
    calls = []

    def fake(code, begin):
        calls.append(code)
        return [] if code == "0026S0" else [("2026-01-02", 1)]

    monkeypatch.setattr(bph, "fetch_series", fake)
    assert bph.main(argv(env, "backfill", "--codes", "360200")) == 0
    assert calls == ["360200"]
    assert bph.main(argv(env, "backfill", "--max-missing-ratio", "0.6")) == 0


def test_run_masks_exception(env, monkeypatch, capsys):
    def boom(code, begin):
        raise RuntimeError("https://apis.data.go.kr/x?serviceKey=" + "k" * 32)

    monkeypatch.setattr(bph, "fetch_series", boom)
    assert bph._run(argv(env, "backfill")) == 1
    out = capsys.readouterr().out
    assert "k" * 32 not in out


def test_subprocess_no_key_exits_1():
    e = {k: v for k, v in os.environ.items() if k != "DATA_GO_KR_KEY"}
    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build_price_history.py"),
                        "--mode", "incremental"], env=e, capture_output=True, text=True)
    assert r.returncode == 1
