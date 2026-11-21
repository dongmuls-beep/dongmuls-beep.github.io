"""NAV-01: /portfolio/ header link on every nav page; noindex precedent kept."""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
NAV_PAGES = [
    "index.html",
    "pension/index.html",
    "isa/index.html",
    "changelog/index.html",
    "fomo/index.html",
    "guide/index.html",
    "methodology/index.html",
    "compare/index.html",
    "portfolio/index.html",
]
LANGS = ["ko", "en", "vi", "zh", "ja", "th", "tl", "km"]
LI = '<li><a href="/portfolio/" class="nav-link" data-i18n="nav_portfolio">ETF 평가금액 추이</a></li>'


def _text(page):
    return (ROOT / page).read_text(encoding="utf-8")


def test_nav_page_set_is_complete():
    found = {
        p.relative_to(ROOT).as_posix()
        for pat in ("*.html", "*/index.html")
        for p in ROOT.glob(pat)
        if 'id="primaryNav"' in p.read_text(encoding="utf-8")
    }
    assert found == set(NAV_PAGES)


@pytest.mark.parametrize("page", NAV_PAGES)
def test_link_present_once_and_ordered(page):
    text = _text(page)
    assert text.count(LI) == 1
    fomo = text.index('href="/fomo/" class="nav-link"')
    port = text.index('href="/portfolio/" class="nav-link"')
    guide = text.index('href="/guide/" class="nav-link"')
    assert fomo < port < guide


@pytest.mark.parametrize("lang", LANGS)
def test_nav_portfolio_key(lang):
    pairs = json.loads((ROOT / "i18n" / f"{lang}.json").read_text(encoding="utf-8-sig"), object_pairs_hook=list)
    keys = [k for k, _ in pairs]
    assert keys[keys.index("nav_changelog") + 1] == "nav_portfolio"
    value = dict(pairs)["nav_portfolio"]
    assert value and "<" not in value
    if lang == "ko":
        assert value == "ETF 평가금액 추이"
    if lang == "en":
        assert value == "ETF Value Over Time"


def test_noindex_precedent_kept():
    assert "/portfolio/" not in (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    assert "/portfolio/" not in (ROOT / "feed.xml").read_text(encoding="utf-8")
    text = _text("portfolio/index.html")
    assert 'content="noindex,follow"' in text
    assert "structuredData" not in text and "application/ld+json" not in text
