"""Fixture-only tests for scripts/build_rss.py (FEED-01..03)."""

import inspect
import json
import os
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))
import build_rss as br  # noqa: E402

ATOM = "{http://www.w3.org/2005/Atom}"


def change(code, name, field, before, after):
    return {"code": code, "name": name, "field": field, "before": before, "after": after}


def entry(updated_at, changes):
    return {"month": updated_at[:7], "updatedAt": updated_at, "changes": changes}


def parse(items):
    return ET.fromstring(br.build_feed_bytes(items))


def titles(items):
    return [i["title"] for i in items]


def test_only_fee_fields_trigger_items():
    e = entry("2026-03-11", [
        change("A", "에이", "총보수", 0.07, 0.05),
        change("B", "비", "기타비용", 0.11, 0.12),
        change("C", "씨", "실부담비용", 0.2, 0.3),
        change("C", "씨", "매매중개수수료", 0.01, 0.02),
    ])
    items = br.build_items([e], 100)
    assert len(items) == 2
    assert not any("씨" in t for t in titles(items))


def test_both_directions():
    e = entry("2026-03-11", [
        change("A", "에이", "총보수", 0.07, 0.05),
        change("B", "비", "기타비용", 0.11, 0.12),
    ])
    t = titles(br.build_items([e], 100))
    assert any("인하" in x for x in t) and any("인상" in x for x in t)


def test_supporting_fields_in_description():
    e = entry("2026-03-11", [
        change("A", "에이", "기타비용", 0.11, 0.12),
        change("A", "에이", "실부담비용", 0.2, 0.3),
        change("A", "에이", "매매중개수수료", 0.01, 0.02),
    ])
    items = br.build_items([e], 100)
    assert len(items) == 1
    for f in ("기타비용", "실부담비용", "매매중개수수료"):
        assert f in items[0]["description"]


def test_none_transitions_skipped():
    e = entry("2026-03-11", [
        change("A", "에이", "총보수", None, 0.1),
        change("B", "비", "총보수", 0.1, None),
        change("D", "디", "총보수", 0.1, 0.2),
        change("D", "디", "실부담비용", None, 0.3),
    ])
    items = br.build_items([e], 100)
    assert len(items) == 1
    assert "실부담비용" not in items[0]["description"]


def test_bulk_entry_skipped():
    e = entry("2026-03-11", [change(c, c, "기타비용", 0.1, 0.2) for c in "ABC"])
    assert br.is_bulk_entry(e, 4) is True
    assert br.build_items([e], 4) == []
    assert br.is_bulk_entry(e, 100) is False
    assert len(br.build_items([e], 100)) == 3


def test_guid_format_and_stability():
    e = entry("2026-03-11", [change("0026S0", "n", "기타비용", 0.11, 0.12)])
    items = br.build_items([e], 100)
    assert items[0]["guid"] == "tag:etfsave.life,2026-03-11:0026S0"
    guid = parse(items).find("channel/item/guid")
    assert guid.text == "tag:etfsave.life,2026-03-11:0026S0"
    assert guid.get("isPermaLink") == "false"
    assert [i["guid"] for i in br.build_items([e], 100)] == [i["guid"] for i in items]


def test_pubdate_rfc822_fixed():
    e = entry("2026-03-11", [change("A", "n", "총보수", 0.1, 0.2)])
    ch = parse(br.build_items([e], 100)).find("channel")
    assert ch.find("item/pubDate").text == "Wed, 11 Mar 2026 09:00:00 +0900"
    assert ch.find("lastBuildDate").text == ch.find("item/pubDate").text


def test_byte_identical_rerun():
    e = entry("2026-03-11", [change("A", "n", "총보수", 0.1, 0.2)])
    items = br.build_items([e], 100)
    assert br.build_feed_bytes(items) == br.build_feed_bytes(items)
    src = inspect.getsource(br)
    for banned in ("datetime.now", "date.today", "time.time"):
        assert banned not in src


def test_escaping_ampersand():
    e = entry("2026-03-11", [
        change("A", "1Q 미국S&P500", "총보수", 0.1, 0.2),
        change("B", "A<B>", "총보수", 0.1, 0.2),
    ])
    items = br.build_items([e], 100)
    data = br.build_feed_bytes(items)
    assert b"S&amp;P500" in data
    root = ET.fromstring(data)
    texts = [t.text for t in root.findall("channel/item/title")]
    assert any("1Q 미국S&P500" in t for t in texts)
    assert any("A<B>" in t for t in texts)


def test_control_chars_stripped():
    e = entry("2026-03-11", [change("A", "x\x01y\x0bz", "총보수", 0.1, 0.2)])
    data = br.build_feed_bytes(br.build_items([e], 100))
    root = ET.fromstring(data)
    title = root.find("channel/item/title").text
    assert "\x01" not in title and "\x0b" not in title


def test_empty_changelog():
    root = parse(br.build_items([], 100))
    assert root.find("channel") is not None
    assert root.findall("channel/item") == []
    assert root.find("channel/lastBuildDate") is None


def test_cap_50():
    entries = []
    for d in range(1, 61):
        day = "2026-%02d-%02d" % (1 + (d - 1) // 28, 1 + (d - 1) % 28)
        entries.append(entry(day, [change("C%d" % d, "n", "총보수", 0.1, 0.2)]))
    items = br.build_items(entries, 1000)
    assert len(items) == 50
    dates = [i["guid"].split(",")[1].split(":")[0] for i in items]
    assert dates == sorted(dates, reverse=True)


def test_rss_structure():
    data = br.build_feed_bytes([])
    assert data.startswith(b"<?xml") and b"ns0:" not in data
    root = ET.fromstring(data)
    assert root.tag == "rss" and root.get("version") == "2.0"
    ch = root.find("channel")
    for tag in ("title", "link", "description"):
        assert ch.find(tag) is not None
    assert ch.find("language").text == "ko"
    link = ch.find(ATOM + "link")
    assert link.get("href") == "https://etfsave.life/feed.xml"
    assert link.get("rel") == "self"
    assert link.get("type") == "application/rss+xml"


def test_write_if_changed(tmp_path):
    p = tmp_path / "feed.xml"
    assert br.write_if_changed(p, b"abc") is True
    mtime = p.stat().st_mtime_ns
    assert br.write_if_changed(p, b"abc") is False
    assert p.read_bytes() == b"abc" and p.stat().st_mtime_ns == mtime


def test_main_uses_given_paths(tmp_path):
    cl = tmp_path / "changelog.json"
    dt = tmp_path / "data.json"
    out = tmp_path / "out.xml"
    cl.write_text(json.dumps([entry("2026-03-11", [change("A", "n", "총보수", 0.1, 0.2)])]), encoding="utf-8")
    dt.write_text(json.dumps([{"종목코드": str(i)} for i in range(100)]), encoding="utf-8")
    argv = ["--changelog", str(cl), "--data", str(dt), "--output", str(out)]
    assert br.main(argv) == 0
    assert len(ET.fromstring(out.read_bytes()).findall("channel/item")) == 1
    out2 = tmp_path / "out2.xml"
    assert br.main(["--changelog", str(tmp_path / "missing.json"), "--data", str(dt), "--output", str(out2)]) == 0
    assert ET.fromstring(out2.read_bytes()).findall("channel/item") == []


# --- Phase 12 review fixes (WR-01..WR-05) ---


def test_code_control_chars_sanitised_in_guid():  # WR-01
    e = entry("2026-03-11", [
        change("A\x01", "n", "총보수", 0.1, 0.2),
        change(" A ", "n", "기타비용", 0.1, 0.2),
    ])
    items = br.build_items([e], 100)
    root = ET.fromstring(br.build_feed_bytes(items))
    assert len(items) == 1
    assert root.find("channel/item/guid").text == "tag:etfsave.life,2026-03-11:A"
    assert "(A)" in root.find("channel/item/title").text


def test_xml_illegal_chars_stripped():  # WR-02
    e = entry("2026-03-11", [
        change("A", "x￾y￿z\ud800w", "총보수", 0.1, 0.2),
        change("B\udfff", "n", "총보수", 0.1, 0.2),
    ])
    data = br.build_feed_bytes(br.build_items([e], 100))
    root = ET.fromstring(data)
    titles_ = [t.text for t in root.findall("channel/item/title")]
    assert any(t.startswith("xyzw (A)") for t in titles_)
    assert b"&#55296;" not in data and b"&#57343;" not in data


def test_malformed_code_and_huge_numbers_skipped():  # WR-03
    e = entry("2026-03-11", [
        change(["A"], "n", "총보수", 0.1, 0.2),
        change({"x": 1}, "n", "총보수", 0.1, 0.2),
        change(True, "n", "총보수", 0.1, 0.2),
        change(None, "n", "총보수", 0.1, 0.2),
        change("X" * 100, "n", "총보수", 0.1, 0.2),
        change(10 ** 400, "n", "총보수", 0.1, 0.2),
        change("C", "n", "총보수", 10 ** 400, 0.2),
        change(12345, "n", "총보수", 0.1, 0.2),
        change("D", "n", "총보수", 0.1, 0.2),
    ])
    items = br.build_items([e], 100)
    assert [i["code"] for i in items] == ["12345", "D"]
    ET.fromstring(br.build_feed_bytes(items))


def test_main_never_fails_and_keeps_feed(tmp_path, monkeypatch, capsys):  # WR-04
    out = tmp_path / "feed.xml"
    out.write_bytes(b"OLD")

    def boom(*a, **k):
        raise RuntimeError("kaboom")

    monkeypatch.setattr(br, "build_items", boom)
    argv = ["--changelog", str(tmp_path / "x.json"), "--data", str(tmp_path / "y.json"), "--output", str(out)]
    assert br.main(argv) == 0
    assert out.read_bytes() == b"OLD"
    assert "kaboom" in capsys.readouterr().err
    assert not (tmp_path / "feed.xml.tmp").exists()


def test_date_trailing_newline_rejected():  # WR-05
    bad = {"month": "2026-03", "updatedAt": "2026-03-11\n",
           "changes": [change("A", "n", "총보수", 0.1, 0.2)]}
    assert br.build_items([bad], 100) == []
