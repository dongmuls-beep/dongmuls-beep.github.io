"""Fixture-only tests for scripts/build_rss.py (FEED-01..03)."""

import inspect
import json
import os
import subprocess
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


def test_no_clock_calls():
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
    assert br.main(["--changelog", str(tmp_path / "missing.json"), "--data", str(dt), "--output", str(out2)]) == 1
    assert not out2.exists()


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


def test_main_fails_and_keeps_feed(tmp_path, monkeypatch, capsys):  # WR-04
    out = tmp_path / "feed.xml"
    out.write_bytes(b"OLD")
    (tmp_path / "x.json").write_text("[]", encoding="utf-8")
    (tmp_path / "y.json").write_text("[]", encoding="utf-8")

    def boom(*a, **k):
        raise RuntimeError("kaboom")

    monkeypatch.setattr(br, "build_items", boom)
    argv = ["--changelog", str(tmp_path / "x.json"), "--data", str(tmp_path / "y.json"), "--output", str(out)]
    assert br.main(argv) == 1
    assert out.read_bytes() == b"OLD"
    assert "kaboom" in capsys.readouterr().err
    assert not (tmp_path / "feed.xml.tmp").exists()


def test_main_bad_inputs_keep_feed(tmp_path):
    good = tmp_path / "good.json"
    good.write_text("[]", encoding="utf-8")
    bad = tmp_path / "bad.json"
    bad.write_text("{not json", encoding="utf-8")
    obj = tmp_path / "obj.json"
    obj.write_text("{}", encoding="utf-8")
    missing = tmp_path / "missing.json"
    out = tmp_path / "feed.xml"
    for cl, dt in [(bad, good), (obj, good), (good, missing)]:
        out.write_bytes(b"OLD")
        assert br.main(["--changelog", str(cl), "--data", str(dt), "--output", str(out)]) == 1
        assert out.read_bytes() == b"OLD"
        assert not (tmp_path / "feed.xml.tmp").exists()


def test_date_trailing_newline_rejected():  # WR-05
    bad = {"month": "2026-03", "updatedAt": "2026-03-11\n",
           "changes": [change("A", "n", "총보수", 0.1, 0.2)]}
    assert br.build_items([bad], 100) == []


# --- Phase 18 (FEED-05..08) ---

ROOT = os.path.dirname(os.path.dirname(__file__))
SCRIPT = os.path.join(ROOT, "scripts", "build_rss.py")
GITATTR = os.path.join(ROOT, ".gitattributes")


def test_duplicate_rows_once():
    row1 = change("A", "n", "총보수", 0.1, 0.2)
    row2 = change("A", "n", "실부담비용", 0.2, 0.3)
    items = br.build_items([entry("2026-03-11", [row1, row2]), entry("2026-03-11", [row1, row2])], 100)
    assert len(items) == 1
    assert items[0]["description"].count("총보수:") == 1
    assert items[0]["description"].count("실부담비용:") == 1
    assert items[0]["title"].count("총보수") == 1


def test_duplicate_rows_later_wins():
    items = br.build_items([
        entry("2026-03-11", [change("A", "n", "총보수", 0.1, 0.2)]),
        entry("2026-03-11", [change("A", "n", "총보수", 0.1, 0.3)]),
    ], 100)
    assert items[0]["description"] == "총보수: 0.1% → 0.3% (인상)"


def test_duplicate_within_one_entry():
    r = change("A", "n", "총보수", 0.1, 0.2)
    items = br.build_items([entry("2026-03-11", [r, dict(r)])], 100)
    assert items[0]["description"].count("총보수:") == 1


def test_exact_numbers():
    def desc(b, a):
        e = entry("2026-03-11", [change("A", "n", "총보수", b, a)])
        return br.build_items([e], 100)[0]["description"]
    assert "0.1234567% → 0.1234568%" in desc(0.1234567, 0.1234568)
    d = desc(0.00001, 0.00002)
    assert "0.00001%" in d and "e-" not in d
    assert "1% → 2%" in desc(1.0, 2)
    assert "0.07% → 0.05%" in desc(0.07, 0.05)


def test_date_non_ascii_digits_rejected():
    e = entry("٢٠٢٦-٠٣-١١", [change("A", "n", "총보수", 0.1, 0.2)])
    assert br.build_items([e], 100) == []


def test_control_re_escaped():
    src = inspect.getsource(br)
    assert chr(0xFFFE) not in src and chr(0xFFFF) not in src
    assert br.clean_text("a%sb%sc" % (chr(0xFFFE), chr(0xFFFF))) == "abc"


def _fixture(tmp_path):
    entries = []
    for d, codes in (("2026-03-11", "ABC"), ("2026-03-12", "BCD"), ("2026-03-13", "AD")):
        ch = [change(c, "이름" + c, f, 0.1, 0.2)
              for c in codes for f in ("총보수", "기타비용", "매매중개수수료", "실부담비용")]
        entries.append(entry(d, ch))
    entries[0]["changes"].append(change("A", "이름A", "총보수", 0.1, 0.2))  # duplicate
    entries[1]["changes"].append(change("Z", "한글 ETF & 이름", "총보수", 0.05, 0.04))
    cl = tmp_path / "changelog.json"
    dt = tmp_path / "data.json"
    cl.write_text(json.dumps(entries, ensure_ascii=False), encoding="utf-8")
    dt.write_text(json.dumps([{"종목코드": str(i)} for i in range(100)]), encoding="utf-8")
    return cl, dt


def test_deterministic_build_subprocess(tmp_path, capsys):
    cl, dt = _fixture(tmp_path)
    outs = []
    for seed in ("0", "12345"):
        out = tmp_path / ("out%s.xml" % seed)
        r = subprocess.run(
            [sys.executable, SCRIPT, "--changelog", str(cl), "--data", str(dt), "--output", str(out)],
            env={**os.environ, "PYTHONHASHSEED": seed}, capture_output=True,
        )
        assert r.returncode == 0
        outs.append(out)
    b1, b2 = outs[0].read_bytes(), outs[1].read_bytes()
    assert b1 == b2
    assert b"\r" not in b1 and b1.endswith(b"</rss>\n")
    assert len(ET.fromstring(b1).findall("channel/item")) >= 3
    capsys.readouterr()
    assert br.main(["--changelog", str(cl), "--data", str(dt), "--output", str(outs[0])]) == 0
    assert "unchanged" in capsys.readouterr().out
    assert outs[0].read_bytes() == b1


def test_items_order_independent():
    es = [
        entry("2026-03-11", [change("A", "n", "총보수", 0.1, 0.2), change("A", "n", "실부담비용", 0.2, 0.3),
                             change("B", "m", "기타비용", 0.1, 0.2)]),
        entry("2026-03-12", [change("C", "k", "총보수", 0.3, 0.2), change("C", "k", "매매중개수수료", 0.1, 0.2)]),
    ]
    rev = [{**e, "changes": list(reversed(e["changes"]))} for e in es]
    assert br.build_feed_bytes(br.build_items(es, 100)) == br.build_feed_bytes(br.build_items(rev, 100))


def test_no_tmp_left_after_success(tmp_path):
    cl, dt = _fixture(tmp_path)
    out = tmp_path / "feed.xml"
    argv = ["--changelog", str(cl), "--data", str(dt), "--output", str(out)]
    for _ in range(2):  # written, then unchanged
        (tmp_path / "feed.xml.tmp").write_bytes(b"stale")
        assert br.main(argv) == 0
        assert list(tmp_path.glob("*.tmp")) == []


def _empty_inputs(tmp_path):
    (tmp_path / "c.json").write_text("[]", encoding="utf-8")
    (tmp_path / "d.json").write_text("[]", encoding="utf-8")
    return ["--changelog", str(tmp_path / "c.json"), "--data", str(tmp_path / "d.json")]


def test_empty_items_keep_existing_feed(tmp_path, capsys):
    out = tmp_path / "feed.xml"
    e = entry("2026-03-11", [change("A", "n", "총보수", 0.1, 0.2)])
    out.write_bytes(br.build_feed_bytes(br.build_items([e], 100)))
    before = out.read_bytes()
    assert br.main(_empty_inputs(tmp_path) + ["--output", str(out)]) == 1
    assert out.read_bytes() == before
    assert "no items" in capsys.readouterr().err
    assert list(tmp_path.glob("*.tmp")) == []


def test_empty_items_fresh_output(tmp_path):
    out = tmp_path / "feed.xml"
    assert br.main(_empty_inputs(tmp_path) + ["--output", str(out)]) == 0
    assert ET.fromstring(out.read_bytes()).findall("channel/item") == []


def test_gitattributes_feed_lf():
    with open(GITATTR, encoding="utf-8") as f:
        lines = [ln.strip() for ln in f.read().splitlines()]
    assert "feed.xml text eol=lf" in lines
