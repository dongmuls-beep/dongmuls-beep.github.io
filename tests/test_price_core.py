"""Offline tests for scripts/build_price_history.py (PRICE-01/04/05). No network."""

import datetime as dt
import io
import json
import logging
import os
import sys
import urllib.error
import urllib.parse

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))
import build_price_history as bph  # noqa: E402

KEY = "ab12" * 16
ROOT = os.path.dirname(os.path.dirname(__file__))


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr(bph.time, "sleep", lambda *_: None)


def item(code, d, clpr="100"):
    return {"srtnCd": code, "basDt": d, "clpr": clpr}


def payload(items):
    return {"response": {"header": {"resultCode": "00"}, "body": {"items": {"item": items}}}}


def rows(*pairs):
    return [(d, c) for d, c in pairs]


def test_normalize_code():
    assert bph.normalize_code(360200) == "360200"
    assert bph.normalize_code("69500") == "069500"
    assert bph.normalize_code("0026s0") == "0026S0"


def test_load_codes_real_data():
    codes = bph.load_codes(os.path.join(ROOT, "data.json"))
    assert len(codes) == 59 and len(set(codes)) == 59


def test_mask_key_and_url():
    q = urllib.parse.quote("a/b+c=")
    s = bph.mask("x %s y https://apis.data.go.kr/p/q?serviceKey=%s&a=1 z" % (q, q), "a/b+c=")
    assert q not in s and "serviceKey" not in s and "a=1" not in s
    assert KEY not in bph.mask("..%s.." % KEY, KEY)


def test_parse_rows_variants():
    p = payload([item("360200", "20240102", "1,050"), item("3602001", "20240102"),
                 item("360200", "20240101", "abc"), item("360200", "20240103", "11"),
                 item("360200", "20240103", "12"), item("360200", "2024-1", "1")])
    assert bph.parse_rows(p, "360200") == [("2024-01-02", 1050), ("2024-01-03", 12)]
    assert bph.parse_rows(payload(item("360200", "20240102")), "360200") == [("2024-01-02", 100)]
    assert bph.parse_rows({"response": {"body": {"items": ""}}}, "360200") == []
    assert bph.parse_rows(payload(item("0026S0", "20250318", "1.5")), "0026s0") == [("2025-03-18", 1.5)]


def test_merge_series_new_wins_sorted_trim():
    old = [("2018-01-01", 1), ("2020-06-01", 2), ("2024-01-01", 3)]
    new = [("2024-01-01", 9), ("2025-06-02", 4)]
    out = bph.merge_series(old, new)
    assert out == [("2024-01-01", 9), ("2025-06-02", 4)]


def test_check_missing():
    assert bph.check_missing(59, 7, 0.1) is True
    assert bph.check_missing(59, 5, 0.1) is False


class FakeResp:
    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def read(self):
        return self.body


def test_fetch_retries_and_no_key_leak(monkeypatch, capsys, caplog):
    monkeypatch.setenv("DATA_GO_KR_KEY", KEY)
    calls = []

    def opener(url, timeout=None):
        calls.append(url)
        raise urllib.error.HTTPError(url, 500, "boom " + KEY, {}, io.BytesIO(b""))

    with caplog.at_level(logging.DEBUG):
        with pytest.raises(bph.FetchError) as ei:
            bph.fetch_rows("360200", opener=opener)
    assert len(calls) == 3
    text = str(ei.value) + repr(ei.value) + str(ei.value.args)
    assert KEY not in text and "apis.data.go.kr" not in text and "500" in text
    out = capsys.readouterr()
    assert KEY not in out.out + out.err + caplog.text


def test_fetch_ok_and_api_error(monkeypatch):
    monkeypatch.setenv("DATA_GO_KR_KEY", KEY)
    good = json.dumps(payload([item("360200", "20240102")])).encode()
    assert bph.fetch_rows("360200", opener=lambda u, timeout=None: FakeResp(good))
    bad = json.dumps({"response": {"header": {"resultCode": "30"}}}).encode()
    with pytest.raises(bph.FetchError):
        bph.fetch_rows("360200", opener=lambda u, timeout=None: FakeResp(bad))


CODES = ["%06d" % i for i in range(1, 21)]


def fake(missing=(), date="2025-01-02", close=10):
    def f(code):
        return [] if code in missing else [(date, close)]
    return f


def test_write_order_meta_last(tmp_path, monkeypatch):
    order = []
    real = bph.write_atomic
    monkeypatch.setattr(bph, "write_atomic", lambda p, o: (order.append(os.path.basename(p)), real(p, o))[1])
    assert bph.collect(CODES, fake(), tmp_path / "prices", tmp_path / "prices-meta.json") == 0
    assert order[-1] == "prices-meta.json" and len(order) == 21
    assert "prices-meta.json" not in order[:-1]


def test_missing_keeps_existing(tmp_path):
    out = tmp_path / "prices"
    meta = tmp_path / "m.json"
    bph.collect(CODES, fake(), out, meta)
    before = (out / "000001.json").read_bytes()
    assert bph.collect(CODES, fake(missing={"000001"}, date="2025-01-03"), out, meta) == 0
    assert (out / "000001.json").read_bytes() == before
    assert "000001" in json.loads(meta.read_text())["missing"]


def test_corrupt_existing_skipped(tmp_path):
    out = tmp_path / "prices"
    meta = tmp_path / "m.json"
    out.mkdir()
    (out / "000002.json").write_bytes(b"{not json")
    assert bph.collect(CODES, fake(), out, meta) == 0
    assert (out / "000002.json").read_bytes() == b"{not json"
    assert "000002" in json.loads(meta.read_text())["missing"]


def test_meta_not_rewritten_on_clock_only(tmp_path):
    out, meta = tmp_path / "prices", tmp_path / "m.json"
    t1 = dt.datetime(2025, 1, 3, tzinfo=dt.timezone.utc)
    t2 = dt.datetime(2025, 1, 4, tzinfo=dt.timezone.utc)
    bph.collect(CODES, fake(), out, meta, now=t1)
    first = meta.read_bytes()
    bph.collect(CODES, fake(), out, meta, now=t2)
    assert meta.read_bytes() == first


def test_guard_trips_files_untouched(tmp_path):
    out, meta = tmp_path / "prices", tmp_path / "m.json"
    bph.collect(CODES, fake(), out, meta)
    snap = {p.name: p.read_bytes() for p in list(out.iterdir()) + [meta]}
    bad = set(CODES[:5])  # 5/20 = 0.25 > 0.1
    assert bph.collect(CODES, fake(missing=bad, date="2025-02-02"), out, meta) == 2
    assert snap == {p.name: p.read_bytes() for p in list(out.iterdir()) + [meta]}


def test_guard_on_fresh_dir_writes_nothing(tmp_path):
    out, meta = tmp_path / "prices", tmp_path / "m.json"
    assert bph.collect(CODES, fake(missing=set(CODES)), out, meta) == 2
    assert not out.exists() and not meta.exists()


def test_write_twice_unchanged(tmp_path):
    p = tmp_path / "x.json"
    assert bph.write_atomic(p, {"a": 1}) is True
    b = p.read_bytes()
    assert bph.write_atomic(p, {"a": 1}) is False
    assert p.read_bytes() == b
