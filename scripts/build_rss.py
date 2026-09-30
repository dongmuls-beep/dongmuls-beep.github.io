#!/usr/bin/env python3
"""Build a deterministic RSS 2.0 feed.xml from changelog.json (stdlib only)."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path
from typing import Any

# Constants mirrored from build_changelog.py (not imported on purpose).
# The bulk guard here is a backstop, not an exact mirror: it counts only valid
# rows against len(data.json), while build_changelog.py counts all rows and uses
# max(total, distinct). The changelog filter runs first and is the stricter one.
TRIGGER_FIELDS = ("총보수", "기타비용")
SUPPORT_FIELDS = ("매매중개수수료", "실부담비용")
BULK_CORRECTION_RATIO = 0.5
FEED_ITEM_LIMIT = 50
SITE = "https://etfsave.life"
FEED_URL = SITE + "/feed.xml"
CHANGELOG_URL = SITE + "/changelog/"
KST = timezone(timedelta(hours=9))
ATOM_NS = "http://www.w3.org/2005/Atom"
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")  # use with fullmatch (no "\n" leak)
# XML 1.0 illegal: C0 controls (except tab/LF/CR), lone surrogates, U+FFFE/U+FFFF.
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff￾￿]")
CODE_MAX_LEN = 32

ET.register_namespace("atom", ATOM_NS)


def valid_number(v: Any) -> float | None:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    try:
        f = float(v)
    except OverflowError:
        return None
    return f if math.isfinite(f) else None


def clean_code(v: Any) -> str | None:
    """Normalised ETF code, or None for non-str/int, empty or oversized values."""
    if isinstance(v, bool) or not isinstance(v, (str, int)):
        return None
    if isinstance(v, int) and abs(v) >= 10 ** CODE_MAX_LEN:
        return None
    code = clean_text(v)
    return code if code and len(code) <= CODE_MAX_LEN else None


def valid_change(row: Any) -> bool:
    if not isinstance(row, dict) or clean_code(row.get("code")) is None:
        return False
    before, after = valid_number(row.get("before")), valid_number(row.get("after"))
    return before is not None and after is not None and before != after


def clean_text(s: Any) -> str:
    return CONTROL_RE.sub("", str(s)).strip()


def valid_rows(entry: dict) -> list[dict]:
    changes = entry.get("changes")
    return [r for r in changes if valid_change(r)] if isinstance(changes, list) else []


def is_bulk_entry(entry: dict, total_count: int | None) -> bool:
    if not total_count:
        return False
    rows = valid_rows(entry)
    for field in TRIGGER_FIELDS:
        codes = {clean_code(r.get("code")) for r in rows if r.get("field") == field}
        if len(codes) / total_count >= BULK_CORRECTION_RATIO:
            return True
    return False


def direction(row: dict) -> str:
    return "인상" if row["after"] > row["before"] else "인하"


def pub_date(updated_at: str) -> str:
    y, m, d = (int(x) for x in updated_at.split("-"))
    return format_datetime(datetime(y, m, d, 9, 0, tzinfo=KST))


def make_item(updated_at: str, code: str, rows: list[dict]) -> dict:
    triggers = [r for f in TRIGGER_FIELDS for r in rows if r["field"] == f]
    support = [r for f in SUPPORT_FIELDS for r in rows if r["field"] == f]
    name = clean_text(next((r.get("name") for r in rows if r.get("name")), code))
    kinds = ", ".join("%s %s" % (r["field"], direction(r)) for r in triggers)
    lines = [
        "%s: %s%% → %s%% (%s)"
        % (r["field"], format(r["before"], "g"), format(r["after"], "g"), direction(r))
        for r in triggers + support
    ]
    return {
        "guid": "tag:etfsave.life,%s:%s" % (updated_at, code),
        "title": "%s (%s) %s" % (name, code, kinds),
        "description": "\n".join(lines),
        "pubDate": pub_date(updated_at),
        "updatedAt": updated_at,
        "code": code,
    }


def build_items(entries: list, total_count: int | None) -> list[dict]:
    groups: dict[tuple[str, str], list[dict]] = {}
    for entry in entries if isinstance(entries, list) else []:
        if not isinstance(entry, dict):
            continue
        updated_at = entry.get("updatedAt")
        if not isinstance(updated_at, str) or not DATE_RE.fullmatch(updated_at):
            continue
        try:
            pub_date(updated_at)
        except ValueError:
            continue
        if is_bulk_entry(entry, total_count):
            continue
        for row in valid_rows(entry):
            code = clean_code(row["code"])  # WR-01: one normalised code for key/guid/title
            if row.get("field") in TRIGGER_FIELDS + SUPPORT_FIELDS:
                key = (updated_at, code)
                groups.setdefault(key, []).append(
                    {**row, "before": valid_number(row["before"]), "after": valid_number(row["after"])}
                )
    items = [
        make_item(d, c, rows)
        for (d, c), rows in groups.items()
        if any(r["field"] in TRIGGER_FIELDS for r in rows)
    ]
    items.sort(key=lambda i: i["code"])
    items.sort(key=lambda i: i["updatedAt"], reverse=True)
    return items[:FEED_ITEM_LIMIT]


def sub(parent: ET.Element, tag: str, text: str) -> ET.Element:
    el = ET.SubElement(parent, tag)
    el.text = text
    return el


def build_feed_bytes(items: list) -> bytes:
    root = ET.Element("rss", {"version": "2.0"})
    ch = ET.SubElement(root, "channel")
    sub(ch, "title", "etfsave.life 수수료 변동")
    sub(ch, "link", CHANGELOG_URL)
    sub(ch, "description", "국내 ETF 총보수·기타비용 변동 알림")
    sub(ch, "language", "ko")
    ET.SubElement(
        ch, "{%s}link" % ATOM_NS,
        {"href": FEED_URL, "rel": "self", "type": "application/rss+xml"},
    )
    if items:
        sub(ch, "lastBuildDate", items[0]["pubDate"])
    for item in items:
        el = ET.SubElement(ch, "item")
        sub(el, "title", item["title"])
        sub(el, "link", CHANGELOG_URL)
        guid = sub(el, "guid", item["guid"])
        guid.set("isPermaLink", "false")
        sub(el, "pubDate", item["pubDate"])
        sub(el, "description", item["description"])
    ET.indent(root, space="  ")
    data = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return data.replace(b"\r\n", b"\n") + b"\n"


def write_if_changed(path: Path, data: bytes) -> bool:
    path = Path(path)
    if path.exists() and path.read_bytes() == data:
        return False
    tmp = path.with_name(path.name + ".tmp")
    try:
        tmp.write_bytes(data)
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()
    return True


def read_json(path: str) -> Any:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError) as exc:
        print("[build_rss] warning: cannot read %s: %s" % (path, exc), file=sys.stderr)
        return None


def main(argv: list | None = None) -> int:
    # WR-04: RSS is a derived, non-critical artifact; never fail the daily
    # data pipeline. On any unexpected error, log and leave feed.xml untouched.
    try:
        return _run(argv)
    except Exception as exc:  # noqa: BLE001
        print("[build_rss] error: %s: %s (feed.xml left untouched)"
              % (type(exc).__name__, exc), file=sys.stderr)
        return 0


def _run(argv: list | None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--changelog", default="changelog.json")
    p.add_argument("--data", default="data.json")
    p.add_argument("--output", default="feed.xml")
    args = p.parse_args(argv)
    entries = read_json(args.changelog)
    data = read_json(args.data)
    total = len(data) if isinstance(data, list) else None
    items = build_items(entries if isinstance(entries, list) else [], total)
    changed = write_if_changed(Path(args.output), build_feed_bytes(items))
    print("[build_rss] %d items, %s" % (len(items), "written" if changed else "unchanged"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
