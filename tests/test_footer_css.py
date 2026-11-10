"""POLISH-01: .footer-links is a wrapping flex row with a token gap (Phase 20)."""
import re
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "style.css"


def _footer_links_rule():
    text = CSS.read_bytes().decode("utf-8-sig")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    m = re.search(r"(?:^|\})\s*\.footer-links\s*\{([^{}]*)\}", text)
    assert m, ".footer-links rule not found"
    return re.sub(r"\s+", " ", m.group(1))


def test_style_css_has_bom():
    assert CSS.read_bytes()[:3] == b"\xef\xbb\xbf"


def test_footer_links_is_wrapping_flex_row():
    rule = _footer_links_rule()
    assert "display: flex" in rule
    assert "flex-wrap: wrap" in rule
    assert re.search(r"gap:\s*var\(--space-\d+\)", rule)


def test_footer_links_keeps_margin():
    assert "margin-top: var(--space-4)" in _footer_links_rule()
