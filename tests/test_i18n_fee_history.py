"""Parity test: fee_history_* i18n keys exist in all 8 language packs (CHART-06)."""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["ko", "en", "vi", "zh", "ja", "th", "tl", "km"]

NEW_KEYS = [
    "fee_history_hint",
    "fee_history_open_label",
    "fee_history_loading",
    "fee_history_error",
    "fee_history_empty",
    "fee_history_no_change",
    "fee_history_start",
    "fee_history_list_title",
    "fee_history_chart_aria",
]

KO_EXPECTED = {
    "fee_history_hint": "수수료를 누르면 변동 그래프를 볼 수 있습니다",
    "fee_history_open_label": "{name} {field} 변동 그래프 보기",
    "fee_history_loading": "수수료 변동 내역을 불러오는 중…",
    "fee_history_error": "변동 내역을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요.",
    "fee_history_empty": "이 항목의 변동 기록이 아직 없습니다.",
    "fee_history_no_change": "{date} 이후 변동 없음",
    "fee_history_start": "기록 시작",
    "fee_history_list_title": "변동 내역",
    "fee_history_chart_aria": "{field} 변동 그래프, {start}부터 {end}까지, 변동 {count}회, 현재 {value}",
}

PLACEHOLDER_RE = re.compile(r"\{[a-z]+\}")


def _load(lang):
    path = ROOT / "i18n" / f"{lang}.json"
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


@pytest.mark.parametrize("lang", LANGS)
def test_keys_present_and_plain(lang):
    pack = _load(lang)
    for key in NEW_KEYS:
        assert key in pack, f"{lang}: missing {key}"
        value = pack[key]
        assert isinstance(value, str) and value.strip(), f"{lang}: empty {key}"
        assert "<" not in value, f"{lang}: {key} contains HTML"


@pytest.mark.parametrize("lang", LANGS)
def test_placeholders_match_ko(lang):
    pack = _load(lang)
    ko = _load("ko")
    for key in NEW_KEYS:
        assert key in pack, f"{lang}: missing {key}"
        assert set(PLACEHOLDER_RE.findall(pack[key])) == set(
            PLACEHOLDER_RE.findall(ko[key])
        ), f"{lang}: placeholder mismatch in {key}"


def test_ko_copy_exact():
    ko = _load("ko")
    for key, expected in KO_EXPECTED.items():
        assert ko.get(key) == expected, f"ko: {key} differs from UI-SPEC"
