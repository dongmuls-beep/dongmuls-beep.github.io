#!/usr/bin/env python3
"""Append changed fee values from data.json to fee-history.json (keyed by 종목코드)."""

from __future__ import annotations

import copy
import json
import math
import sys
from datetime import date as date_cls
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from build_changelog import FIELDS, to_float

DATA_FILE = Path("data.json")
HISTORY_FILE = Path("fee-history.json")
SCHEMA_VERSION = 1
KST = timezone(timedelta(hours=9))
ROUND_DIGITS = 6


def kst_today() -> str:
    return datetime.now(KST).date().isoformat()


def empty_history() -> dict[str, Any]:
    return {"version": SCHEMA_VERSION, "updatedAt": "", "names": {}, "series": {}}


def normalize(value: Any) -> float | None:
    number = to_float(value)
    if number is None or not math.isfinite(number):
        return None
    return round(number, ROUND_DIGITS)


def is_iso_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return date_cls.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def apply_snapshot(
    history: dict[str, Any], rows: list[dict[str, Any]], date: str
) -> tuple[dict[str, Any], int]:
    new = copy.deepcopy(history)
    names = new["names"]
    series = new["series"]
    count = 0

    by_code: dict[str, dict[str, Any]] = {}
    duplicates: set[str] = set()
    for row in rows:
        code = str(row.get("종목코드", "") or "").strip()
        if not code:
            continue
        if code in by_code:
            duplicates.add(code)
        by_code[code] = row  # last row wins
    if duplicates:
        print(
            f"[WARNING] fee-history: duplicate 종목코드 (last row wins): "
            f"{', '.join(sorted(duplicates))}"
        )

    for code, row in by_code.items():
        name = str(row.get("종목명", "") or "").strip()
        if name:
            names[code] = name

        for field in FIELDS:
            value = normalize(row.get(field))
            if value is None:
                continue
            points = series.get(code, {}).get(field)
            if points and date < points[-1][0]:
                raise ValueError(
                    f"snapshot date {date} is before last point {points[-1][0]} "
                    f"in series[{code}][{field}]"
                )
            if points and points[-1][0] == date:
                if points[-1][1] == value:
                    continue
                if len(points) >= 2 and points[-2][1] == value:
                    points.pop()
                else:
                    points[-1] = [date, value]
                count += 1
            elif not points or points[-1][1] != value:
                if points is None:
                    points = series.setdefault(code, {}).setdefault(field, [])
                points.append([date, value])
                count += 1

    if count > 0:
        new["updatedAt"] = date
    return new, count


def validate_history(obj: Any) -> None:
    if not isinstance(obj, dict):
        raise ValueError("history must be a JSON object")
    if obj.get("version") != SCHEMA_VERSION or isinstance(obj.get("version"), bool):
        raise ValueError(f"unsupported version: {obj.get('version')!r}")
    if not isinstance(obj.get("updatedAt"), str):
        raise ValueError("updatedAt must be a string")
    if not isinstance(obj.get("names"), dict):
        raise ValueError("names must be an object")
    if not isinstance(obj.get("series"), dict):
        raise ValueError("series must be an object")
    for code, fields in obj["series"].items():
        if not isinstance(fields, dict):
            raise ValueError(f"series[{code}] must be an object")
        for field, points in fields.items():
            if not isinstance(points, list):
                raise ValueError(f"series[{code}][{field}] must be a list")
            prev_date = ""
            for point in points:
                if (
                    not isinstance(point, list)
                    or len(point) != 2
                    or not is_iso_date(point[0])
                    or point[0] <= prev_date
                    or isinstance(point[1], bool)
                    or not isinstance(point[1], (int, float))
                    or not math.isfinite(point[1])
                ):
                    raise ValueError(f"invalid point in series[{code}][{field}]: {point!r}")
                prev_date = point[0]


def load_history(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"{path} not found")
    obj = json.loads(path.read_text(encoding="utf-8"))
    validate_history(obj)
    return obj


def dump_history(history: dict[str, Any]) -> str:
    return (
        json.dumps(
            history,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
        + "\n"
    )


def load_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"{path} not found")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"{path} must contain a JSON list")
    return payload


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    init = "--init" in args
    try:
        if init:
            if HISTORY_FILE.exists():
                raise ValueError(f"refusing to overwrite existing {HISTORY_FILE}")
            history = empty_history()
        else:
            history = load_history(HISTORY_FILE)
        rows = load_rows(DATA_FILE)
        date = kst_today()
        new, count = apply_snapshot(history, rows, date)
    except (OSError, ValueError) as exc:  # JSONDecodeError is a ValueError
        print(f"[ERROR] fee-history: {exc}", file=sys.stderr)
        return 1

    text = dump_history(new)
    existing = HISTORY_FILE.read_text(encoding="utf-8") if HISTORY_FILE.exists() else None
    if init or text != existing:
        HISTORY_FILE.write_text(text, encoding="utf-8", newline="\n")
        print(f"[fee-history] recorded {count} changes for {date}")
    else:
        print("[fee-history] no changes; kept existing fee-history.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
