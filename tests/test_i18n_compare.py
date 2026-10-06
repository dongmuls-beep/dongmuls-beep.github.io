"""Parity test: compare_/calc_/seo_compare_ i18n block in all 8 language packs (CMP-06, CALC-04).

Checks ONLY the Phase 15 block; full-pack parity is owned by Phase 16.
"""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["ko", "en", "vi", "zh", "ja", "th", "tl", "km"]
OTHER = ["ja", "zh", "vi", "th", "tl", "km"]
ANCHOR = "fee_history_chart_aria"
PLACEHOLDER_RE = re.compile(r"\{[a-z]+\}")

NEW_KEYS = ['seo_compare_title',
 'seo_compare_description',
 'compare_select_label',
 'compare_bar_count',
 'compare_bar_need_more',
 'compare_bar_limit',
 'compare_bar_go',
 'compare_bar_clear',
 'compare_bar_label',
 'compare_live_added',
 'compare_live_removed',
 'compare_live_cleared',
 'compare_page_title',
 'compare_page_desc',
 'compare_intro',
 'compare_table_title',
 'compare_table_caption',
 'compare_table_region',
 'compare_scroll_hint',
 'compare_best_badge',
 'compare_empty_title',
 'compare_empty_body',
 'compare_back_to_list',
 'compare_change_selection',
 'compare_dropped_notice',
 'compare_cap_notice',
 'compare_load_error',
 'compare_retry',
 'compare_copy_link',
 'compare_copy_done',
 'compare_copy_fail',
 'compare_noscript',
 'compare_chart_title',
 'compare_chart_metric_label',
 'compare_chart_legend',
 'compare_chart_legend_item',
 'compare_chart_no_history',
 'compare_chart_excluded',
 'compare_chart_aria',
 'compare_chart_switched',
 'compare_chart_error',
 'compare_chart_table_title',
 'compare_chart_tbl_etf',
 'compare_chart_tbl_start',
 'compare_chart_tbl_first',
 'compare_chart_tbl_now',
 'compare_chart_tbl_changes',
 'calc_title',
 'calc_intro',
 'calc_lump',
 'calc_years',
 'calc_years_hint',
 'calc_monthly',
 'calc_return',
 'calc_return_hint',
 'calc_col_rank',
 'calc_col_etf',
 'calc_result',
 'calc_result_same',
 'calc_col_fees',
 'calc_col_gap',
 'calc_col_final',
 'calc_table_caption',
 'calc_contributed',
 'calc_excluded',
 'calc_fee_high',
 'calc_err_amount',
 'calc_err_years',
 'calc_err_return',
 'calc_clamped',
 'calc_disclaimer']

KO_EXPECTED = {'calc_col_rank': '순위',
 'calc_col_etf': 'ETF',
 'calc_col_fees': '누적 수수료 (원)',
 'calc_col_gap': '최저 대비 (원)',
 'calc_col_final': '최종 평가금액 (원)',
 'calc_table_caption': '보유기간 누적 수수료가 적은 순서',
 'calc_clamped': '최대 {limit}까지만 계산해요.',
 'calc_contributed': '총 납입 원금 {amount}원',
 'calc_disclaimer': '이 계산은 입력한 가정에 따른 단순 추정이며 투자 권유나 수익 보장이 아니에요. 실제 수수료, 세금, 수익률은 달라질 수 있어요.',
 'calc_err_amount': '0원 이상의 숫자를 입력해 주세요.',
 'calc_err_return': '-99~100 사이의 숫자를 입력해 주세요.',
 'calc_err_years': '1~50 사이의 숫자를 입력해 주세요.',
 'calc_excluded': '{names}은(는) 수수료 값이 없어 계산에서 제외했어요.',
 'calc_fee_high': '{name}: 실부담비용이 {limit}%를 넘어 입력 오류일 수 있어요.',
 'calc_intro': '보수와 비용 차이가 오래 쌓이면 얼마나 벌어지는지 계산해 볼 수 있어요. 아래 수익률은 실제 전망이 아닌 가정이에요.',
 'calc_lump': '일시금 (원)',
 'calc_monthly': '월 적립금 (원)',
 'calc_result': '{years}년간 {a}보다 {b}가 약 {amount}원 더 부담해요',
 'calc_result_same': '{years}년간 ETF 간 누적 비용 차이는 거의 없어요',
 'calc_return': '기대수익률 (연 %, 가정)',
 'calc_return_hint': '가정 값이에요. 기본은 0%예요.',
 'calc_title': '누적 비용 계산기',
 'calc_years': '보유기간 (년)',
 'calc_years_hint': '1~50년',
 'compare_back_to_list': 'ETF 목록으로 돌아가기',
 'compare_bar_clear': '선택 해제',
 'compare_bar_count': '{count}개 선택됨',
 'compare_bar_go': '비교하기',
 'compare_bar_label': 'ETF 비교 선택 바',
 'compare_bar_limit': '최대 4개까지 비교할 수 있어요',
 'compare_bar_need_more': '2개 이상 선택해 주세요',
 'compare_best_badge': '최저',
 'compare_cap_notice': '최대 4개까지만 비교해요. 앞의 4개를 보여드려요.',
 'compare_change_selection': '다른 ETF 고르기',
 'compare_chart_aria': '{metric} 추이 비교 그래프, {start}부터 {end}까지, ETF {count}개',
 'compare_chart_error': '수수료 추이를 불러오지 못했어요. 표의 수치는 그대로 볼 수 있어요.',
 'compare_chart_excluded': '{name}: 값이 없어 그래프에서 제외했어요',
 'compare_chart_legend': '범례',
 'compare_chart_legend_item': '{name} ({code}) 현재 {value}',
 'compare_chart_metric_label': '비교 항목',
 'compare_chart_no_history': '변동 기록 없음 (현재 값만 표시)',
 'compare_chart_switched': '{metric} 그래프로 바꿨어요',
 'compare_chart_table_title': '숫자로 보기',
 'compare_chart_tbl_changes': '변동 횟수',
 'compare_chart_tbl_etf': 'ETF',
 'compare_chart_tbl_first': '시작 값',
 'compare_chart_tbl_now': '현재 값',
 'compare_chart_tbl_start': '기록 시작일',
 'compare_chart_title': '수수료 추이 비교',
 'compare_copy_done': '복사했어요',
 'compare_copy_fail': '복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요.',
 'compare_copy_link': '링크 복사',
 'compare_dropped_notice': '일부 종목코드는 목록에 없거나 형식이 맞지 않아 제외했어요: {codes}',
 'compare_empty_body': '목록에서 ETF 2~4개를 체크한 뒤 "비교하기"를 누르면 여기서 수수료를 나란히 볼 수 있어요.',
 'compare_empty_title': '비교할 ETF를 2개 이상 선택해 주세요',
 'compare_intro': '수수료가 가장 낮은 항목은 "최저"로 표시돼요. 값이 없는 항목은 "-"로 보이며 비교에서 제외돼요.',
 'compare_live_added': '{name} 선택됨, 현재 {count}개',
 'compare_live_cleared': '선택을 모두 해제했어요',
 'compare_live_removed': '{name} 선택 해제, 현재 {count}개',
 'compare_load_error': '데이터를 불러오지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
 'compare_noscript': '이 페이지는 JavaScript가 필요해요. 메인 목록으로 이동해 주세요.',
 'compare_page_desc': '선택한 ETF 2~4개의 총보수, 기타비용, 매매중개수수료, 실부담비용, 순자산을 한 표로 나란히 비교합니다.',
 'compare_page_title': 'ETF 직접 비교',
 'compare_retry': '다시 시도',
 'compare_scroll_hint': '좌우로 밀어 보세요',
 'compare_select_label': '{name} 비교 선택',
 'compare_table_caption': '선택한 ETF 수수료 비교표',
 'compare_table_region': '비교표 (가로로 스크롤할 수 있어요)',
 'compare_table_title': '비교 지표',
 'seo_compare_description': '선택한 ETF 2~4개의 총보수, 기타비용, 매매중개수수료, 실부담비용, 순자산을 한 표로 나란히 비교합니다.',
 'seo_compare_title': 'ETF 직접 비교 | etfsave.life'}

EN_EXPECTED = {'calc_col_rank': 'Rank',
 'calc_col_etf': 'ETF',
 'calc_col_fees': 'Total fees (KRW)',
 'calc_col_gap': 'vs. lowest (KRW)',
 'calc_col_final': 'Final value (KRW)',
 'calc_table_caption': 'ETFs ranked by total fees over the holding period',
 'calc_clamped': 'Values are capped at {limit}.',
 'calc_contributed': 'Total contributed {amount} KRW',
 'calc_disclaimer': 'This is a simple estimate based on your assumptions, not investment advice or '
                    'a guarantee. Actual fees, taxes and returns may differ.',
 'calc_err_amount': 'Enter a number of 0 or more.',
 'calc_err_return': 'Enter a number from -99 to 100.',
 'calc_err_years': 'Enter a number from 1 to 50.',
 'calc_excluded': '{names} excluded: no fee value.',
 'calc_fee_high': '{name}: real cost exceeds {limit}%, which may be a data error.',
 'calc_intro': 'See how small cost gaps add up over time. The return below is an assumption, not a '
               'forecast.',
 'calc_lump': 'Lump sum (KRW)',
 'calc_monthly': 'Monthly contribution (KRW)',
 'calc_result': 'Over {years} years, {b} costs about {amount} KRW more than {a}',
 'calc_result_same': 'Over {years} years these ETFs cost almost the same',
 'calc_return': 'Expected return (% per year, assumption)',
 'calc_return_hint': 'This is an assumption. Default is 0%.',
 'calc_title': 'Cumulative Cost Calculator',
 'calc_years': 'Holding period (years)',
 'calc_years_hint': '1-50 years',
 'compare_back_to_list': 'Back to ETF list',
 'compare_bar_clear': 'Clear',
 'compare_bar_count': '{count} selected',
 'compare_bar_go': 'Compare',
 'compare_bar_label': 'ETF comparison selection bar',
 'compare_bar_limit': 'You can compare up to 4',
 'compare_bar_need_more': 'Select at least 2',
 'compare_best_badge': 'Lowest',
 'compare_cap_notice': 'Only up to 4 ETFs are compared. Showing the first 4.',
 'compare_change_selection': 'Choose different ETFs',
 'compare_chart_aria': '{metric} comparison chart, {start} to {end}, {count} ETFs',
 'compare_chart_error': 'Could not load fee history. The table values are still available.',
 'compare_chart_excluded': '{name}: excluded from chart (no value)',
 'compare_chart_legend': 'Legend',
 'compare_chart_legend_item': '{name} ({code}) now {value}',
 'compare_chart_metric_label': 'Metric',
 'compare_chart_no_history': 'No changes recorded (current value only)',
 'compare_chart_switched': 'Chart switched to {metric}',
 'compare_chart_table_title': 'View as numbers',
 'compare_chart_tbl_changes': 'Changes',
 'compare_chart_tbl_etf': 'ETF',
 'compare_chart_tbl_first': 'First value',
 'compare_chart_tbl_now': 'Current value',
 'compare_chart_tbl_start': 'Tracked since',
 'compare_chart_title': 'Fee History Comparison',
 'compare_copy_done': 'Copied',
 'compare_copy_fail': 'Copy failed. Please copy the link from the address bar.',
 'compare_copy_link': 'Copy link',
 'compare_dropped_notice': 'Some codes were ignored because they are invalid or not listed: '
                           '{codes}',
 'compare_empty_body': 'Tick 2-4 ETFs in the list and press "Compare" to see their fees side by '
                       'side here.',
 'compare_empty_title': 'Select at least 2 ETFs to compare',
 'compare_intro': 'The lowest fee in each row is marked "Lowest". Missing values show "-" and are '
                  'excluded.',
 'compare_live_added': '{name} selected, {count} total',
 'compare_live_cleared': 'Selection cleared',
 'compare_live_removed': '{name} removed, {count} total',
 'compare_load_error': 'Could not load data. Check your connection and try again.',
 'compare_noscript': 'This page needs JavaScript. Please return to the main list.',
 'compare_page_desc': 'Compare total expense ratio, other costs, brokerage fee, real cost and AUM '
                      'of 2-4 ETFs in one table.',
 'compare_page_title': 'Compare ETFs Side by Side',
 'compare_retry': 'Retry',
 'compare_scroll_hint': 'Swipe sideways to see more',
 'compare_select_label': 'Select {name} to compare',
 'compare_table_caption': 'Fee comparison of selected ETFs',
 'compare_table_region': 'Comparison table (scrolls horizontally)',
 'compare_table_title': 'Key metrics',
 'seo_compare_description': 'Compare total expense ratio, other costs, brokerage fee, real cost '
                            'and AUM of 2-4 ETFs in one table.',
 'seo_compare_title': 'Compare ETFs Side by Side | etfsave.life'}


def _pairs(lang):
    path = ROOT / "i18n" / f"{lang}.json"
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f, object_pairs_hook=lambda pairs: pairs)


def _load(lang):
    return dict(_pairs(lang))


def test_new_keys_count():
    assert len(NEW_KEYS) == 71
    assert len(set(NEW_KEYS)) == 71
    assert set(KO_EXPECTED) == set(NEW_KEYS) == set(EN_EXPECTED)


@pytest.mark.parametrize("lang", LANGS)
def test_keys_present_and_plain(lang):
    data = _load(lang)
    for key in NEW_KEYS:
        assert key in data, f"{lang}: missing {key}"
        assert isinstance(data[key], str) and data[key].strip(), f"{lang}: empty {key}"
        assert "<" not in data[key], f"{lang}: HTML in {key}"


@pytest.mark.parametrize("lang", LANGS)
def test_placeholders_match_ko(lang):
    data = _load(lang)
    ko = _load("ko")
    for key in NEW_KEYS:
        assert set(PLACEHOLDER_RE.findall(data[key])) == set(PLACEHOLDER_RE.findall(ko[key])), f"{lang}: tokens differ in {key}"


def test_ko_copy_exact():
    data = _load("ko")
    for key, expected in KO_EXPECTED.items():
        assert data[key] == expected, key


def test_en_copy_exact():
    data = _load("en")
    for key, expected in EN_EXPECTED.items():
        assert data[key] == expected, key


@pytest.mark.parametrize("lang", LANGS)
def test_block_contiguous_after_fee_history(lang):
    keys = [k for k, _ in _pairs(lang)]
    i = keys.index(ANCHOR)
    assert keys[i + 1 : i + 1 + len(NEW_KEYS)] == NEW_KEYS


@pytest.mark.parametrize("lang", LANGS)
def test_no_duplicate_keys(lang):
    keys = [k for k, _ in _pairs(lang)]
    dupes = {k for k in keys if keys.count(k) > 1}
    assert not dupes, f"{lang}: duplicate keys {sorted(dupes)}"


@pytest.mark.parametrize("lang", OTHER)
def test_mandatory_translations_not_fallback(lang):
    data = _load(lang)
    ko = _load("ko")
    en = _load("en")
    for key in ("calc_disclaimer", "compare_bar_limit", "calc_return"):
        assert data[key] != ko[key], f"{lang}: {key} left as ko"
        assert data[key] != en[key], f"{lang}: {key} left as en"
