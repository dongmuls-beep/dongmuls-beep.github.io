"""FEED-04: RSS autodiscovery + footer RSS link + footer_rss i18n parity (Phase 16)."""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["ko", "en", "vi", "zh", "ja", "th", "tl", "km"]
PAGES = ["index.html", "changelog/index.html"]


def _pack(lang):
    return json.loads((ROOT / "i18n" / f"{lang}.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("lang", LANGS)
def test_footer_rss_present(lang):
    val = _pack(lang).get("footer_rss")
    assert isinstance(val, str) and val.strip()


@pytest.mark.parametrize("lang", LANGS)
def test_footer_rss_follows_footer_privacy(lang):
    keys = list(_pack(lang).keys())
    assert "footer_privacy" in keys and "footer_rss" in keys
    assert keys.index("footer_rss") == keys.index("footer_privacy") + 1


@pytest.mark.parametrize("page", PAGES)
def test_rss_autodiscovery_link(page):
    html = (ROOT / page).read_text(encoding="utf-8")
    links = re.findall(r'<link rel="alternate" type="application/rss\+xml"[^>]*>', html)
    assert len(links) == 1
    assert 'href="/feed.xml"' in links[0]


@pytest.mark.parametrize("page", PAGES)
def test_footer_rss_anchor(page):
    html = (ROOT / page).read_text(encoding="utf-8")
    m = re.search(r'<div class="footer-links">(.*?)</div>', html, re.S)
    assert m
    assert re.search(r'<a href="/feed.xml" data-i18n="footer_rss">', m.group(1))
