#!/usr/bin/env python3
"""Core library for ETF daily close collection (data.go.kr getETFPriceInfo).

Stdlib only. Contract: .planning/phases/22-price-pipeline/PRICES-CONTRACT.md
"""

from __future__ import annotations

import datetime as dt
import json
import logging
import math
import os
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable

ENDPOINT = ("https://apis.data.go.kr/1160100/service/"
            "GetSecuritiesProductInfoService/getETFPriceInfo")
BEGIN_BASDT = "20210101"
NUM_ROWS = 10000
TIMEOUT = 30
RETRIES = 3
BACKOFF = (2, 4)
SLEEP_BETWEEN = 0.2
DEFAULT_THRESHOLD = 0.10
SOURCE = "data.go.kr getETFPriceInfo"
KEY_ENV = "DATA_GO_KR_KEY"
BASDT_RE = re.compile(r"[0-9]{8}")
URL_RE = re.compile(r"https?://apis\.data\.go\.kr[^\s'\"<>]*")

log = logging.getLogger("build_price_history")


class FetchError(Exception):
    """Carries only code + exception class name + HTTP status (never URL/key)."""

    def __init__(self, code: str, kind: str):
        super().__init__("fetch failed code=%s kind=%s" % (code, kind))
        self.code = code
        self.kind = kind


def mask(text: Any, key: str | None = None) -> str:
    s = str(text)
    s = URL_RE.sub(lambda m: m.group(0).split("?", 1)[0] + "?<masked>", s)
    if key:
        for k in {key, urllib.parse.quote(key), urllib.parse.quote(key, safe="")}:
            if k:
                s = s.replace(k, "***")
    return s


def normalize_code(v: Any) -> str:
    s = str(v).strip()
    return s.zfill(6) if s.isdigit() else s.upper()


def load_codes(path: str | Path = "data.json") -> list[str]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    seen: dict[str, None] = {}
    for row in data:
        c = row.get("종목코드") if isinstance(row, dict) else None
        if c is None or str(c).strip() == "":
            continue
        seen.setdefault(normalize_code(c), None)
    return list(seen)


def fetch_rows(code: str, begin: str = BEGIN_BASDT, key: str | None = None,
               opener: Callable = urllib.request.urlopen) -> Any:
    """Return the parsed JSON payload for one code. Raises FetchError (key-safe)."""
    key = key if key is not None else os.environ[KEY_ENV]
    query = urllib.parse.urlencode({
        "serviceKey": key, "resultType": "json", "numOfRows": NUM_ROWS,
        "pageNo": 1, "likeSrtnCd": code, "beginBasDt": begin,
    })
    url = ENDPOINT + "?" + query
    kind = "Unknown"
    for attempt in range(RETRIES):
        try:
            with opener(url, timeout=TIMEOUT) as resp:
                body = resp.read()
            payload = json.loads(body.decode("utf-8"))
            header = payload.get("response", {}).get("header", {})
            if str(header.get("resultCode")) != "00":
                kind = "ApiResult%s" % mask(header.get("resultCode"), key)[:8]
                raise ValueError("api error")
            return payload
        except urllib.error.HTTPError as exc:
            kind = "HTTPError%s" % exc.code
        except (urllib.error.URLError, socket.timeout, TimeoutError, OSError) as exc:
            kind = type(exc).__name__
        except Exception as exc:  # noqa: BLE001 - parse errors etc.; message dropped on purpose
            if not kind.startswith("ApiResult"):
                kind = type(exc).__name__
        if attempt < RETRIES - 1:
            time.sleep(BACKOFF[min(attempt, len(BACKOFF) - 1)])
    raise FetchError(code, kind) from None


def _to_number(v: Any) -> float | int | None:
    try:
        f = float(str(v).replace(",", "").strip())
    except (ValueError, TypeError):
        return None
    if not math.isfinite(f):
        return None
    return int(f) if f == int(f) else f


def parse_rows(payload: Any, code: str) -> list[tuple[str, float | int]]:
    try:
        items = payload["response"]["body"]["items"]
    except (KeyError, TypeError):
        return []
    item = items.get("item") if isinstance(items, dict) else None
    if isinstance(item, dict):
        item = [item]
    if not isinstance(item, list):
        return []
    want = normalize_code(code)
    out: dict[str, float | int] = {}
    for r in item:
        if not isinstance(r, dict) or normalize_code(r.get("srtnCd", "")) != want:
            continue
        d = str(r.get("basDt", ""))
        if not BASDT_RE.fullmatch(d):
            continue
        try:
            date = dt.date(int(d[:4]), int(d[4:6]), int(d[6:]))
        except ValueError:
            continue
        close = _to_number(r.get("clpr"))
        if close is None:
            continue
        out[date.isoformat()] = close
    return sorted(out.items())


def _cutoff(latest: str) -> str:
    d = dt.date.fromisoformat(latest)
    try:
        c = d.replace(year=d.year - 5)
    except ValueError:  # Feb 29
        c = d.replace(year=d.year - 5, day=28)
    return c.isoformat()


def merge_series(existing: list[tuple[str, Any]], new: list[tuple[str, Any]]
                 ) -> list[tuple[str, Any]]:
    merged = dict(existing)
    merged.update(dict(new))  # new wins
    if not merged:
        return []
    items = sorted(merged.items())
    cut = _cutoff(items[-1][0])
    return [(d, c) for d, c in items if d >= cut]


def check_missing(expected: int, missing: int, threshold: float = DEFAULT_THRESHOLD) -> bool:
    """True when the guard trips (missing ratio exceeds threshold)."""
    return expected > 0 and missing / expected > threshold


def serialize(obj: Any) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            + "\n").encode("utf-8")


def write_atomic(path: str | Path, obj: Any) -> bool:
    path = Path(path)
    data = serialize(obj)
    tmp = path.with_name(path.name + ".tmp")
    tmp.unlink(missing_ok=True)
    if path.exists() and path.read_bytes() == data:
        return False
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_bytes(data)
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()
    return True


def build_meta(expected: int, collected: int, missing: list[str], as_of: str | None,
               threshold: float, now: dt.datetime | None = None) -> dict:
    now = now or dt.datetime.now(dt.timezone.utc)
    return {
        "version": 1,
        "as_of": as_of,
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "expected": expected,
        "collected": collected,
        "missing": sorted(missing),
        "missing_ratio": (len(missing) / expected) if expected else 0.0,
        "threshold": threshold,
    }


def _price_obj(code: str, series: list[tuple[str, Any]]) -> dict:
    return {"version": 1, "code": code, "source": SOURCE,
            "dates": [d for d, _ in series], "close": [c for _, c in series]}


def _read_existing(path: Path) -> list[tuple[str, Any]] | None:
    """[] when absent, None when corrupt."""
    if not path.exists():
        return []
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        dates, close = obj["dates"], obj["close"]
        if not (isinstance(dates, list) and isinstance(close, list) and len(dates) == len(close)):
            return None
        for d, c in zip(dates, close):
            dt.date.fromisoformat(d)
            if isinstance(c, bool) or not isinstance(c, (int, float)):
                return None
        return list(zip(dates, close))
    except (OSError, ValueError, KeyError, TypeError):
        return None


def _meta_same(path: Path, new: dict) -> bool:
    try:
        old = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False
    strip = lambda m: {k: v for k, v in m.items() if k != "generated_at"}  # noqa: E731
    return isinstance(old, dict) and strip(old) == strip(new)


def collect(codes: list[str], fetcher: Callable[[str], list], out_dir: str | Path,
            meta_path: str | Path, begin: str = BEGIN_BASDT,
            threshold: float = DEFAULT_THRESHOLD, now: dt.datetime | None = None) -> int:
    """Gather in memory, guard, then write codes first and meta last. Returns 0 or 2."""
    out_dir, meta_path = Path(out_dir), Path(meta_path)
    results: dict[str, list[tuple[str, Any]]] = {}
    missing: list[str] = []
    for code in codes:
        try:
            rows = fetcher(code)
        except FetchError as exc:
            log.warning("%s", mask(exc))
            rows = []
        if not rows:
            missing.append(code)
            continue
        existing = _read_existing(out_dir / (code + ".json"))
        if existing is None:
            log.warning("corrupt existing file for %s, skipped", code)
            missing.append(code)
            continue
        results[code] = merge_series(existing, rows)

    if check_missing(len(codes), len(missing), threshold):
        log.error("missing %d/%d exceeds threshold %s, nothing written",
                  len(missing), len(codes), threshold)
        return 2

    for code in codes:
        if code in results:
            write_atomic(out_dir / (code + ".json"), _price_obj(code, results[code]))
    as_of = max((s[-1][0] for s in results.values()), default=None)
    meta = build_meta(len(codes), len(results), missing, as_of, threshold, now)
    if not _meta_same(meta_path, meta):
        write_atomic(meta_path, meta)
    return 0


# ---------------------------------------------------------------- CLI

ROOT = Path(__file__).resolve().parents[1]


def fetch_series(code: str, begin: str) -> list[tuple[str, Any]]:
    """Network fetch + parse for one code (monkeypatched in tests)."""
    time.sleep(SLEEP_BETWEEN)
    return parse_rows(fetch_rows(code, begin), code)


def incremental_begin(path: Path, fallback: str) -> str:
    existing = _read_existing(path)
    if not existing:
        return fallback
    d = dt.date.fromisoformat(existing[-1][0]) - dt.timedelta(days=7)
    return d.strftime("%Y%m%d")


def main(argv: list[str] | None = None) -> int:
    import argparse
    ap = argparse.ArgumentParser(description="ETF daily close collector")
    ap.add_argument("--mode", required=True, choices=["backfill", "incremental"])
    ap.add_argument("--data", default="data.json")
    ap.add_argument("--out", default="prices")
    ap.add_argument("--meta", default="prices-meta.json")
    ap.add_argument("--begin", default=BEGIN_BASDT)
    ap.add_argument("--max-missing-ratio", type=float, default=DEFAULT_THRESHOLD)
    ap.add_argument("--codes", default=None)
    args = ap.parse_args(argv)

    if not os.environ.get(KEY_ENV):
        print("DATA_GO_KR_KEY not set")
        return 1

    def rp(p: str) -> Path:
        pp = Path(p)
        return pp if pp.is_absolute() else ROOT / pp

    out_dir, meta_path = rp(args.out), rp(args.meta)
    if args.codes:
        codes = [normalize_code(c) for c in args.codes.split(",") if c.strip()]
    else:
        codes = load_codes(rp(args.data))

    if args.mode == "backfill":
        fetcher = lambda code: fetch_series(code, args.begin)  # noqa: E731
    else:
        fetcher = lambda code: fetch_series(  # noqa: E731
            code, incremental_begin(out_dir / (code + ".json"), args.begin))

    return collect(codes, fetcher, out_dir, meta_path, args.begin,
                   args.max_missing_ratio)


def _run(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    try:
        return main(argv)
    except SystemExit:
        raise
    except BaseException as exc:  # noqa: BLE001
        print(mask(type(exc).__name__ + ": " + str(exc), os.environ.get(KEY_ENV)))
        return 1


if __name__ == "__main__":
    raise SystemExit(_run())
