#!/usr/bin/env python3
"""One-off local backfill: replay data.json git history into a fresh fee-history.json.

Run from the repository root:

    python scripts/backfill_fee_history.py [--dry-run]

Only the last data.json commit of each KST day is used. Bulk corrections are
re-baselined only when detected between consecutive daily snapshots.
"""

from __future__ import annotations

import copy
import json
import re
import subprocess
import sys
from datetime import date as date_cls
from datetime import datetime
from typing import Any

from build_changelog import (
    FIELDS,
    build_changes,
    count_compared,
    detect_bulk_correction,
    to_float,
)
from build_fee_history import (
    HISTORY_FILE,
    KST,
    apply_snapshot,
    dump_history,
    empty_history,
    validate_history,
    write_atomic,
)

TYPO_FIELD = "매매중계수수료"
FIXED_FIELD = "매매중개수수료"
MAX_FEE = 5.0  # discretionary sanity cap; real fee percentages stay below this
ROW_COLLAPSE_RATIO = 0.5
ABA_MAX_DAYS = 2
REBASELINE_EXTRA_FIELDS = ["실부담비용"]
SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def to_kst_date(iso: str) -> str:
    text = iso.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    return datetime.fromisoformat(text).astimezone(KST).date().isoformat()


def normalize_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for src in rows:
        r = dict(src)
        if TYPO_FIELD in r:
            typo_value = r.pop(TYPO_FIELD)
            if FIXED_FIELD not in r:
                r[FIXED_FIELD] = typo_value
        code = str(r.get("종목코드", "") or "").strip()
        if code.isdigit() and len(code) < 6:
            code = code.zfill(6)
        if "종목코드" in r:
            r["종목코드"] = code
        out.append(r)
    return out


def check_rows(data: Any, prev_len: int | None) -> str | None:
    if not isinstance(data, list) or not all(isinstance(r, dict) for r in data):
        return "not-a-list"
    if prev_len and len(data) < prev_len * ROW_COLLAPSE_RATIO:
        return "row-count-collapse"
    for r in data:
        for field in FIELDS:
            value = to_float(r.get(field))
            if value is not None and not (0 <= value <= MAX_FEE):
                return "out-of-range"
    return None


def find_aba(history: dict[str, Any]) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    for code in sorted(history["series"]):
        for field in FIELDS:
            points = history["series"][code].get(field, [])
            for i in range(2, len(points)):
                a0, b, a1 = points[i - 2], points[i - 1], points[i]
                if a1[1] == a0[1] and a0[1] != b[1]:
                    gap = (
                        date_cls.fromisoformat(a1[0]) - date_cls.fromisoformat(b[0])
                    ).days
                    if gap <= ABA_MAX_DAYS:
                        found.append(
                            {
                                "code": code,
                                "field": field,
                                "dates": [a0[0], b[0], a1[0]],
                                "values": [a0[1], b[1]],
                            }
                        )
    return found


def replay(snapshots: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    report: dict[str, Any] = {
        "skipped": [],
        "superseded": [],
        "rebaselines": [],
        "dropped_codes": [],
    }

    # Pass 1: accept / skip in order
    accepted: list[dict[str, Any]] = []
    last_date = ""
    prev_len: int | None = None
    for s in snapshots:
        date = to_kst_date(s["committed"])
        reason: str | None = None
        if last_date and date < last_date:
            reason = "date-backwards"
        elif s.get("error"):
            reason = f"parse-error: {s['error']}"
        else:
            reason = check_rows(s.get("data"), prev_len)
        if reason:
            report["skipped"].append({"sha": s["sha"], "date": date, "reason": reason})
            continue
        accepted.append({"sha": s["sha"], "date": date, "rows": normalize_rows(s["data"])})
        last_date = date
        prev_len = len(s["data"])

    # Pass 2: last commit of each KST day wins
    days: list[dict[str, Any]] = []
    for item in accepted:
        if days and days[-1]["date"] == item["date"]:
            old = days[-1]
            report["superseded"].append({"sha": old["sha"], "date": old["date"]})
            days[-1] = item
        else:
            days.append(item)

    # Pass 3: replay with detection-driven re-baselining
    history = empty_history()
    for idx, item in enumerate(days):
        rows = item["rows"]
        if idx > 0:
            prev_rows = days[idx - 1]["rows"]
            flagged = detect_bulk_correction(
                build_changes(prev_rows, rows), count_compared(prev_rows, rows)
            )
            if flagged:
                wipe = {name for name, _ in flagged} | set(REBASELINE_EXTRA_FIELDS)
                wipe_fields = [f for f in FIELDS if f in wipe]
                history = copy.deepcopy(history)
                for code in list(history["series"]):
                    for f in wipe_fields:
                        history["series"][code].pop(f, None)
                    if not history["series"][code]:
                        del history["series"][code]
                report["rebaselines"].append(
                    {"date": item["date"], "fields": wipe_fields, "codes": dict(flagged)}
                )
        history, _ = apply_snapshot(history, rows, item["date"])

    # Pass 4: prune codes absent from the latest snapshot
    if days:
        final_codes = {str(r.get("종목코드", "") or "").strip() for r in days[-1]["rows"]}
        stale = sorted(
            (set(history["series"]) | set(history["names"])) - final_codes
        )
        for code in stale:
            history["series"].pop(code, None)
            history["names"].pop(code, None)
        report["dropped_codes"] = stale
    validate_history(history)

    report["days"] = {
        "count": len(days),
        "first": days[0]["date"] if days else "",
        "last": days[-1]["date"] if days else "",
    }
    report["points"] = {
        f: sum(len(fl.get(f, [])) for fl in history["series"].values()) for f in FIELDS
    }
    report["changes"] = {
        f: sum(max(len(fl.get(f, [])) - 1, 0) for fl in history["series"].values())
        for f in FIELDS
    }
    report["aba"] = find_aba(history)
    return history, report


def read_git_snapshots() -> list[dict[str, Any]]:
    log = subprocess.run(
        ["git", "log", "--reverse", "--format=%H%x09%cI", "--", "data.json"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    snapshots: list[dict[str, Any]] = []
    for line in log.stdout.splitlines():
        if not line.strip():
            continue
        sha, committed = line.split("\t", 1)
        if not SHA_RE.match(sha):
            raise ValueError(f"unexpected commit id from git log: {sha!r}")
        data: Any = None
        error: str | None = None
        proc = subprocess.run(["git", "show", f"{sha}:data.json"], capture_output=True, check=False)
        if proc.returncode != 0:
            error = f"git show failed ({proc.returncode})"
        else:
            try:
                data = json.loads(proc.stdout.decode("utf-8"))
            except UnicodeDecodeError:
                error = "invalid utf-8"
            except json.JSONDecodeError as exc:
                error = f"invalid json ({exc.msg})"
        snapshots.append(
            {"sha": sha, "committed": committed.strip(), "data": data, "error": error}
        )
    return snapshots


def format_report(report: dict[str, Any]) -> str:
    p = "[backfill] "
    lines: list[str] = []
    d = report["days"]
    lines.append(f"days replayed: {d['count']} ({d['first']}..{d['last']})")
    for key, label in (("points", "points per field"), ("changes", "changes per field")):
        vals = report[key]
        pairs = ", ".join(f"{f}={vals[f]}" for f in FIELDS)
        lines.append(f"{label}: {pairs}, total={sum(vals.values())}")
    rbs = report["rebaselines"]
    lines.append(f"re-baselines: {len(rbs)}")
    for rb in rbs:
        lines.append(f"  {rb['date']} fields={','.join(rb['fields'])} codes={rb['codes']}")
    if not rbs:
        lines.append(
            "  note: bad same-day commits are excluded by the last-commit-of-day rule"
        )
    sup = report["superseded"]
    lines.append(f"superseded same-day commits: {len(sup)}")
    for s in sup:
        lines.append(f"  {s['sha'][:7]} {s['date']}")
    skipped = report["skipped"]
    lines.append(f"skipped commits: {len(skipped)}")
    for s in skipped:
        lines.append(f"  {s['sha'][:7]} {s['date']} {s['reason']}")
    dropped = report["dropped_codes"]
    lines.append(f"dropped codes (absent from latest snapshot): {len(dropped)}")
    if dropped:
        lines.append(f"  {', '.join(dropped)}")
    aba = report["aba"]
    lines.append(f"A->B->A within {ABA_MAX_DAYS} days: {len(aba)}")
    for a in aba:
        lines.append(f"  {a['code']} {a['field']} {a['dates']} values={a['values']}")
    return "\n".join(p + line for line in lines)


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    unknown = [a for a in args if a != "--dry-run"]
    if unknown:
        print(
            f"[ERROR] backfill: unknown argument(s): {' '.join(unknown)} "
            "(usage: backfill_fee_history.py [--dry-run])",
            file=sys.stderr,
        )
        return 2
    dry_run = "--dry-run" in args
    try:
        history, report = replay(read_git_snapshots())
        if report["days"]["count"] == 0:
            raise ValueError("no usable data.json snapshots in git history")
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"[ERROR] backfill: {exc}", file=sys.stderr)
        return 1
    print(format_report(report))
    if dry_run:
        print("[backfill] dry-run: fee-history.json not written")
        return 0
    text = dump_history(history)
    write_atomic(HISTORY_FILE, text)
    total = sum(report["points"].values())
    print(
        f"[backfill] wrote fee-history.json ({len(text.encode('utf-8'))} bytes, "
        f"{total} points, updatedAt {history['updatedAt']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
