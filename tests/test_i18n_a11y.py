"""Phase 14 a11y i18n key contract: parity, placement, plain values."""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["ko", "en", "vi", "zh", "ja", "th", "tl", "km"]
GROUP_A = [
    "aria_menu_open", "aria_menu_close", "aria_lang_select", "aria_copy_code",
    "aria_skip_to_content", "table_value_missing", "aria_value_missing",
    "table_retry", "table_reset_filter", "table_empty_hint", "aria_primary_nav",
    "aria_breadcrumb", "aria_key_metrics", "aria_table_scroll", "aria_fee_up",
    "aria_fee_down", "aria_table_rows",
]
GROUP_B = ["table_aum", "table_volume"]
NEW_KEYS = GROUP_A[5:]
PLACEHOLDER_RE = re.compile(r"\{[a-z]+\}")

KO_EXPECTED = {
    "table_value_missing": "-", "aria_value_missing": "데이터 없음",
    "table_retry": "다시 시도", "table_reset_filter": "전체 ETF 보기",
    "table_empty_hint": "잠시 후 새로고침해 주세요.",
    "aria_primary_nav": "주요 메뉴", "aria_breadcrumb": "현재 위치 경로",
    "aria_key_metrics": "핵심 데이터",
    "aria_table_scroll": "변경이력 표 (가로로 스크롤할 수 있습니다)",
    "aria_fee_up": "실부담비용 상승", "aria_fee_down": "실부담비용 하락",
    "aria_table_rows": "{count}개 종목이 표시되었습니다",
}
EN_EXPECTED = {
    "table_value_missing": "-", "aria_value_missing": "No data",
    "table_retry": "Try again", "table_reset_filter": "Show all ETFs",
    "table_empty_hint": "Please refresh the page in a moment.",
    "aria_primary_nav": "Primary navigation", "aria_breadcrumb": "Breadcrumb",
    "aria_key_metrics": "Key metrics",
    "aria_table_scroll": "Change history table (scrolls horizontally)",
    "aria_fee_up": "Real cost increased", "aria_fee_down": "Real cost decreased",
    "aria_table_rows": "{count} ETFs shown",
    "table_aum": "Net assets (KRW 100M)", "table_volume": "Volume",
}


def _pairs_hook(pairs):
    keys = [k for k, _ in pairs]
    dup = {k for k in keys if keys.count(k) > 1}
    if dup:
        raise ValueError(f"duplicate keys: {sorted(dup)}")
    return pairs


def load_pairs(lang):
    text = (ROOT / "i18n" / f"{lang}.json").read_text(encoding="utf-8-sig")
    return json.loads(text, object_pairs_hook=_pairs_hook)


@pytest.mark.parametrize("lang", LANGS)
def test_no_duplicate_keys_and_valid_json(lang):
    assert load_pairs(lang)


def test_key_set_parity():
    ref = {k for k, _ in load_pairs("ko")}
    for lang in LANGS:
        keys = {k for k, _ in load_pairs(lang)}
        assert keys == ref, f"{lang}: diff {sorted(keys ^ ref)}"


@pytest.mark.parametrize("lang", LANGS)
def test_group_a_contiguous_after_copy_code(lang):
    keys = [k for k, _ in load_pairs(lang)]
    i = keys.index("aria_menu_open")
    assert keys[i:i + len(GROUP_A)] == GROUP_A
    assert i + len(GROUP_A) < len(keys)


@pytest.mark.parametrize("lang", LANGS)
def test_group_b_after_table_real(lang):
    keys = [k for k, _ in load_pairs(lang)]
    i = keys.index("table_real")
    assert keys[i + 1] == "table_aum"
    assert keys[i + 2] == "table_volume"


@pytest.mark.parametrize("lang", LANGS)
def test_values_plain(lang):
    d = dict(load_pairs(lang))
    for k in GROUP_A + GROUP_B:
        v = d[k]
        assert isinstance(v, str) and v and "<" not in v, k
    assert d["table_value_missing"] == "-"


@pytest.mark.parametrize("lang", LANGS)
def test_placeholders_match_ko(lang):
    d = dict(load_pairs(lang))
    assert set(PLACEHOLDER_RE.findall(d["aria_table_rows"])) == {"{count}"}
    for k in NEW_KEYS + GROUP_B:
        if k != "aria_table_rows":
            assert not PLACEHOLDER_RE.findall(d[k]), k


def test_ko_en_values():
    ko, en = dict(load_pairs("ko")), dict(load_pairs("en"))
    for k, v in KO_EXPECTED.items():
        assert ko[k] == v, k
    for k, v in EN_EXPECTED.items():
        assert en[k] == v, k


@pytest.mark.parametrize("lang", LANGS)
def test_file_bytes(lang):
    raw = (ROOT / "i18n" / f"{lang}.json").read_bytes()
    assert not raw.startswith(b"\xef\xbb\xbf")
    # working tree may be CRLF (core.autocrlf); require consistent endings
    assert raw.count(b"\r\n") in (0, raw.count(b"\n"))
