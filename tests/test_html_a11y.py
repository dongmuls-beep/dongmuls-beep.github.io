"""Structure checks for keyboard/screen-reader/theme markup on the 7 pages (Phase 14-03)."""
import re
from html.parser import HTMLParser
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
PAGES = [
    "index.html",
    "changelog/index.html",
    "fomo/index.html",
    "guide/index.html",
    "isa/index.html",
    "methodology/index.html",
    "pension/index.html",
]
FOCUSABLE = {"a", "button", "select", "input", "textarea"}


class Collector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []  # (tag, attrs dict)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, {k: (v if v is not None else "") for k, v in attrs}))


def parse(page):
    c = Collector()
    c.feed((ROOT / page).read_bytes().decode("utf-8"))
    return c.tags


def by_id(tags, i):
    return [(t, a) for t, a in tags if a.get("id") == i]


def classes(a):
    return a.get("class", "").split()


@pytest.mark.parametrize("page", PAGES)
def test_theme_color(page):
    tags = parse(page)
    metas = [a for t, a in tags if t == "meta" and a.get("name") == "theme-color"]
    assert len(metas) == 1 and metas[0]["content"] == "#e8edf5"
    assert 'name="theme-color" content="#0f172a"' not in (ROOT / page).read_text(encoding="utf-8")


def _is_focusable(tag, a):
    if tag == "a" and "href" in a:
        return True
    if tag in FOCUSABLE - {"a"}:
        return True
    ti = a.get("tabindex")
    return ti is not None and ti.lstrip("-").isdigit() and int(ti) >= 0


@pytest.mark.parametrize("page", PAGES)
def test_skip_link_first_focusable(page):
    tags = parse(page)
    idx = next(i for i, (t, _) in enumerate(tags) if t == "body")
    first = next((t, a) for t, a in tags[idx + 1:] if _is_focusable(t, a))
    t, a = first
    assert t == "a"
    assert a.get("href") == "#main-content"
    assert "skip-link" in classes(a)
    assert a.get("data-i18n") == "aria_skip_to_content"


@pytest.mark.parametrize("page", PAGES)
def test_main_target(page):
    mains = [a for t, a in parse(page) if t == "main"]
    assert len(mains) == 1
    assert mains[0].get("id") == "main-content"
    assert mains[0].get("tabindex") == "-1"


@pytest.mark.parametrize("page", PAGES)
def test_header_aria_i18n(page):
    tags = parse(page)
    hb = [a for t, a in tags if "hamburger-menu" in classes(a)]
    assert hb and all(a.get("data-i18n-aria") == "aria_menu_open" for a in hb)
    sel = by_id(tags, "languageSelect")
    assert len(sel) == 1 and sel[0][1].get("data-i18n-aria") == "aria_lang_select"
    nav = by_id(tags, "primaryNav")
    assert len(nav) == 1 and nav[0][1].get("data-i18n-aria") == "aria_primary_nav"
    for t, a in tags:
        if t == "nav" and "breadcrumbs" in classes(a):
            assert a.get("data-i18n-aria") == "aria_breadcrumb"
        assert a.get("aria-label") != "Language"


@pytest.mark.parametrize("page", PAGES)
def test_crlf_no_bom(page):
    raw = (ROOT / page).read_bytes()
    assert not raw.startswith(b"\xef\xbb\xbf")
    assert raw.count(b"\n") == raw.count(b"\r\n")


def _pos(tags, i):
    return next(n for n, (_, a) in enumerate(tags) if a.get("id") == i)


def test_index_table_semantics():
    tags = parse("index.html")
    table = by_id(tags, "etfTable")
    assert len(table) == 1 and table[0][1].get("role") == "table"
    ths = [a for t, a in tags if t == "th"]
    assert len(ths) == 8
    assert all(a.get("role") == "columnheader" and a.get("scope") == "col" for a in ths)
    tb = by_id(tags, "tableBody")
    assert len(tb) == 1 and tb[0][1].get("role") == "rowgroup"
    st = by_id(tags, "tableStatus")
    assert len(st) == 1
    a = st[0][1]
    assert a.get("role") == "status" and a.get("aria-live") == "polite"
    assert a.get("aria-atomic") == "true" and "sr-only" in classes(a)
    ct = by_id(tags, "etfTableContainer")
    assert len(ct) == 1
    assert ct[0][1].get("tabindex") == "-1" and ct[0][1].get("aria-busy") == "false"
    assert _pos(tags, "tableStatus") < _pos(tags, "etfTableContainer")
    ul = [a for t, a in tags if t == "ul" and "seo-metrics" in classes(a)]
    assert len(ul) == 1 and ul[0].get("data-i18n-aria") == "aria_key_metrics"


def test_changelog_status():
    tags = parse("changelog/index.html")
    st = by_id(tags, "changelogStatus")
    assert len(st) == 1
    assert st[0][1].get("role") == "status" and st[0][1].get("aria-live") == "polite"
    lst = by_id(tags, "changelogList")
    assert len(lst) == 1 and lst[0][1].get("aria-busy") == "false"
    assert _pos(tags, "changelogStatus") < _pos(tags, "changelogList")
