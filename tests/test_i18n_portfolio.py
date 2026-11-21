"""Parity test: pf_ i18n block in the language packs (I18N-01).

Plan 24-05 fills ko, en, vi, zh; plan 24-06 extends LANGS/OTHER to all 8 languages.
"""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["ko", "en", "vi", "zh", "ja", "th", "tl", "km"]
OTHER = ["ja", "zh", "vi", "th", "tl", "km"]
ANCHOR = "calc_disclaimer"
PLACEHOLDER_RE = re.compile(r"\{[a-z]+\}")

KO_EXPECTED = {
    'pf_doc_title': 'ETF 평가금액 추이 | etfsave.life',
    'pf_page_title': 'ETF 평가금액 추이',
    'pf_intro': '보유한 ETF의 종목·수량·보유 시작일을 넣으면 날짜별 평가금액을 보여줘요. 입력한 내용은 이 브라우저에만 저장돼요.',
    'pf_noscript': '이 페이지는 JavaScript가 필요해요.',
    'pf_holdings_title': '보유 종목',
    'pf_code_label': '종목',
    'pf_code_hint': '종목명이나 종목코드로 검색해 목록에서 골라 주세요.',
    'pf_combo_no_match': '일치하는 종목이 없어요',
    'pf_qty_label': '수량',
    'pf_qty_hint': '소수점은 마침표(.)로, 8자리까지 입력할 수 있어요.',
    'pf_date_label': '보유 시작일',
    'pf_date_hint': '오늘까지 고를 수 있어요. 상장 전 기간은 0원으로 표시돼요.',
    'pf_add': '종목 추가',
    'pf_save_edit': '변경 저장',
    'pf_cancel_edit': '수정 취소',
    'pf_err_code': '목록에 있는 종목을 골라 주세요.',
    'pf_err_qty_format': '수량은 숫자로 입력해 주세요. 쉼표는 쓸 수 없고 소수는 8자리까지예요.',
    'pf_err_qty_nonpositive': '수량은 0보다 커야 해요.',
    'pf_err_date_format': '날짜를 YYYY-MM-DD 형식으로 입력해 주세요.',
    'pf_err_date_invalid': '존재하지 않는 날짜예요.',
    'pf_err_date_future': '오늘 이후 날짜는 입력할 수 없어요.',
    'pf_err_rows_limit': '최대 {max}개 행까지 추가할 수 있어요.',
    'pf_form_invalid': '입력값을 확인해 주세요.',
    'pf_added': '{name} 행을 추가했어요.',
    'pf_updated': '{name} 행을 수정했어요.',
    'pf_deleted': '{name} 행을 삭제했어요.',
    'pf_rows_region': '보유 종목 표, 가로로 스크롤할 수 있어요',
    'pf_rows_caption': '보유 종목 목록',
    'pf_rows_empty': '추가한 종목이 아직 없어요.',
    'pf_col_name': '종목',
    'pf_col_qty': '수량',
    'pf_col_start': '보유 시작일',
    'pf_col_value': '평가금액',
    'pf_col_actions': '관리',
    'pf_edit': '수정',
    'pf_delete': '삭제',
    'pf_edit_row_aria': '{row}행 {name} 수정',
    'pf_delete_row_aria': '{row}행 {name} 삭제',
    'pf_scroll_hint': '표를 옆으로 밀어서 더 볼 수 있어요.',
    'pf_backup_title': '백업',
    'pf_backup_hint': '다른 기기로 옮기거나 보관하려면 파일로 내보내세요.',
    'pf_export': '내보내기(JSON)',
    'pf_export_done': '파일을 내보냈어요.',
    'pf_export_empty': '내보낼 종목이 없어요.',
    'pf_import': '파일 가져오기',
    'pf_import_done': '{count}개 행을 가져왔어요.',
    'pf_import_cancelled': '가져오기를 취소했어요.',
    'pf_import_parse': '파일을 읽을 수 없어요. 이 사이트에서 내보낸 JSON 파일인지 확인해 주세요.',
    'pf_import_format': '이 사이트에서 내보낸 파일이 아니에요.',
    'pf_import_too_large': '파일이 너무 커요. 1MB 이하 파일만 가져올 수 있어요.',
    'pf_import_version': '지원하지 않는 파일 버전이에요.',
    'pf_import_invalid': '가져오지 못했어요. 아래 행을 고친 뒤 다시 시도해 주세요.',
    'pf_import_row_error': '{row}행 · {field}: {message}',
    'pf_import_more': '외 {count}건',
    'pf_import_rows_format': '파일의 행 목록 형식이 올바르지 않아요.',
    'pf_import_rows_limit': '행이 너무 많아요. 최대 {max}개까지 가져올 수 있어요.',
    'pf_field_code': '종목',
    'pf_field_qty': '수량',
    'pf_field_date': '보유 시작일',
    'pf_confirm_title': '보유 목록을 덮어쓸까요?',
    'pf_confirm_body': '지금 목록의 {count}개 행이 지워지고 파일 내용으로 바뀌어요. 되돌릴 수 없으니 필요하면 먼저 내보내기로 보관해 두세요.',
    'pf_confirm_cancel': '그대로 두기',
    'pf_confirm_ok': '파일로 덮어쓰기',
    'pf_storage_unavailable': '이 브라우저에 저장할 수 없어요. 창을 닫으면 입력한 내용이 사라지니 내보내기로 보관해 주세요.',
    'pf_storage_quota': '저장 공간이 부족해 저장하지 못했어요. 화면의 내용은 그대로지만 창을 닫으면 사라지니 내보내기로 보관해 주세요.',
    'pf_storage_corrupt': '저장된 데이터가 손상돼 불러오지 못했어요. 가능하면 원본을 따로 보관해 두었어요. 백업 파일이 있으면 가져오기로 복원해 주세요.',
    'pf_storage_version': '저장된 데이터의 버전을 읽을 수 없어요. 백업 파일이 있으면 가져오기로 복원해 주세요.',
    'pf_storage_invalid': '저장된 행 중 일부가 더 이상 유효하지 않아(상장폐지 등) 제외했어요. 원본은 따로 보관해 두었어요.',
    'pf_loading': '종목 정보를 불러오는 중이에요…',
    'pf_loading_prices': '시세를 불러오는 중이에요…',
    'pf_loading_short': '불러오는 중…',
    'pf_load_error': '종목 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    'pf_retry': '목록 다시 불러오기',
    'pf_retry_prices': '실패한 종목 다시 불러오기',
    'pf_ready': '평가금액 합계 {total}, {asof} 기준이에요.',
    'pf_empty_title': '아직 추가한 종목이 없어요',
    'pf_empty_body': "종목, 수량, 보유 시작일을 입력하고 '종목 추가'를 누르면 평가금액 추이가 보여요.",
    'pf_no_result': '계산할 수 있는 종목이 없어요. 아래 확인이 필요한 항목을 봐 주세요.',
    'pf_summary_title': '요약',
    'pf_stat_total': '평가금액 합계',
    'pf_stat_change': '전일 대비',
    'pf_stat_asof': '기준일',
    'pf_asof_note': '종가 기준',
    'pf_up': '상승',
    'pf_down': '하락',
    'pf_flat': '변동 없음',
    'pf_won': '{amount}원',
    'pf_fee_line': '가중평균 총보수 {fee}% · 연간 예상 비용 약 {cost}',
    'pf_fee_real': '(실부담비용 기준 {fee}% · 약 {cost})',
    'pf_fee_partial': '일부 종목 보수 정보 없음({names}) — 계산에서 제외했어요.',
    'pf_fee_none': '보유 종목의 보수 정보가 없어 계산할 수 없어요.',
    'pf_weights_title': '종목별 비중',
    'pf_chart_title': '평가금액 추이',
    'pf_period_label': '기간',
    'pf_period_1m': '1개월',
    'pf_period_3m': '3개월',
    'pf_period_6m': '6개월',
    'pf_period_1y': '1년',
    'pf_period_all': '전체',
    'pf_period_changed': '{period} 기간으로 바꿨어요.',
    'pf_chart_aria': '{start}부터 {end}까지 평가금액 추이 선 그래프. 시작 {first}, 마지막 {last}. 자세한 값은 아래 표에 있어요.',
    'pf_chart_keys': '평가금액 그래프. 왼쪽·오른쪽 화살표로 날짜별 값을 볼 수 있어요.',
    'pf_readout': '{date} · {amount}',
    'pf_table_title': '날짜별 평가금액 표',
    'pf_table_region': '날짜별 평가금액 표, 가로로 스크롤할 수 있어요',
    'pf_table_caption': '날짜별 평가금액과 전일 대비',
    'pf_table_monthly': '기간이 길어 월말 값만 보여줘요.',
    'pf_col_date': '날짜',
    'pf_col_change': '전일 대비',
    'pf_warn_title': '확인이 필요한 항목',
    'pf_warn_fetch': '{name}({code}): 시세를 불러오지 못해 계산에서 뺐어요.',
    'pf_warn_no_data': '{row}행 {name}({code}): 시세 데이터가 없어 계산에서 뺐어요.',
    'pf_warn_invalid_row': '{row}행: 입력값이 올바르지 않아 계산에서 뺐어요.',
    'pf_warn_non_finite': '{row}행 {name}({code}): 계산할 수 없는 값이 있어 뺐어요.',
    'pf_warn_delisted': '{name}({code}): {date} 이후 시세가 없어 마지막 종가로 계산했어요.',
    'pf_warn_jump': '{name}({code}): {date}에 종가가 40% 넘게 바뀌었어요. 분할·병합일 수 있으니 확인해 주세요.',
    'pf_warn_pre_listing': '{name}({code}): 상장일({date}) 이전 기간은 0원으로 표시돼요.',
}

EN_EXPECTED = {
    'pf_doc_title': 'ETF Value Over Time | etfsave.life',
    'pf_page_title': 'ETF Value Over Time',
    'pf_intro': 'Enter the ETF, quantity and start date of your holdings to see their value day by day. What you enter is saved only in this browser.',
    'pf_noscript': 'This page requires JavaScript.',
    'pf_holdings_title': 'Holdings',
    'pf_code_label': 'ETF',
    'pf_code_hint': 'Search by ETF name or code and pick one from the list.',
    'pf_combo_no_match': 'No matching ETF',
    'pf_qty_label': 'Quantity',
    'pf_qty_hint': 'Use a period (.) for decimals, up to 8 decimal places.',
    'pf_date_label': 'Holding start date',
    'pf_date_hint': 'You can pick up to today. Periods before listing are shown as 0 KRW.',
    'pf_add': 'Add ETF',
    'pf_save_edit': 'Save changes',
    'pf_cancel_edit': 'Cancel editing',
    'pf_err_code': 'Please pick an ETF from the list.',
    'pf_err_qty_format': 'Enter the quantity as a number. Commas are not allowed and decimals are limited to 8 places.',
    'pf_err_qty_nonpositive': 'Quantity must be greater than 0.',
    'pf_err_date_format': 'Enter the date in YYYY-MM-DD format.',
    'pf_err_date_invalid': 'That date does not exist.',
    'pf_err_date_future': 'Dates after today are not allowed.',
    'pf_err_rows_limit': 'You can add up to {max} rows.',
    'pf_form_invalid': 'Please check your entries.',
    'pf_added': 'Added the {name} row.',
    'pf_updated': 'Updated the {name} row.',
    'pf_deleted': 'Deleted the {name} row.',
    'pf_rows_region': 'Holdings table, scrollable horizontally',
    'pf_rows_caption': 'Holdings list',
    'pf_rows_empty': 'No ETFs added yet.',
    'pf_col_name': 'ETF',
    'pf_col_qty': 'Quantity',
    'pf_col_start': 'Start date',
    'pf_col_value': 'Value',
    'pf_col_actions': 'Actions',
    'pf_edit': 'Edit',
    'pf_delete': 'Delete',
    'pf_edit_row_aria': 'Edit row {row}, {name}',
    'pf_delete_row_aria': 'Delete row {row}, {name}',
    'pf_scroll_hint': 'Swipe the table sideways to see more.',
    'pf_backup_title': 'Backup',
    'pf_backup_hint': 'Export to a file to move your list to another device or keep a copy.',
    'pf_export': 'Export (JSON)',
    'pf_export_done': 'File exported.',
    'pf_export_empty': 'There are no ETFs to export.',
    'pf_import': 'Import file',
    'pf_import_done': 'Imported {count} rows.',
    'pf_import_cancelled': 'Import cancelled.',
    'pf_import_parse': 'The file could not be read. Check that it is a JSON file exported from this site.',
    'pf_import_format': 'This is not a file exported from this site.',
    'pf_import_too_large': 'The file is too large. Only files up to 1MB can be imported.',
    'pf_import_version': 'This file version is not supported.',
    'pf_import_invalid': 'Import failed. Fix the rows below and try again.',
    'pf_import_row_error': 'Row {row} · {field}: {message}',
    'pf_import_more': 'and {count} more',
    'pf_import_rows_format': 'The row list in the file is not in the right format.',
    'pf_import_rows_limit': 'Too many rows. You can import up to {max}.',
    'pf_field_code': 'ETF',
    'pf_field_qty': 'Quantity',
    'pf_field_date': 'Start date',
    'pf_confirm_title': 'Overwrite your holdings?',
    'pf_confirm_body': 'The {count} rows in your current list will be erased and replaced with the file contents. This cannot be undone, so export your list first if you need a copy.',
    'pf_confirm_cancel': 'Keep current list',
    'pf_confirm_ok': 'Overwrite with file',
    'pf_storage_unavailable': 'Cannot save in this browser. What you entered will be lost when you close the window, so please keep a copy with Export.',
    'pf_storage_quota': 'Not enough storage to save. What is on screen is unchanged but will be lost when you close the window, so please keep a copy with Export.',
    'pf_storage_corrupt': 'The saved data is damaged and could not be loaded. We kept a separate copy of the original where possible. If you have a backup file, restore it with Import.',
    'pf_storage_version': 'The version of the saved data cannot be read. If you have a backup file, restore it with Import.',
    'pf_storage_invalid': 'Some saved rows are no longer valid (for example, a delisted ETF) and were left out. We kept a separate copy of the original.',
    'pf_loading': 'Loading ETF information…',
    'pf_loading_prices': 'Loading prices…',
    'pf_loading_short': 'Loading…',
    'pf_load_error': 'Could not load the ETF list. Please try again in a moment.',
    'pf_retry': 'Reload list',
    'pf_retry_prices': 'Retry failed ETFs',
    'pf_ready': 'Total value {total}, based on {asof}.',
    'pf_empty_title': 'No ETFs added yet',
    'pf_empty_body': "Enter an ETF, quantity and start date and press 'Add ETF' to see how the value changes.",
    'pf_no_result': 'No ETFs can be calculated. See the items to check below.',
    'pf_summary_title': 'Summary',
    'pf_stat_total': 'Total value',
    'pf_stat_change': 'Vs. previous day',
    'pf_stat_asof': 'As of',
    'pf_asof_note': 'Based on closing prices',
    'pf_up': 'Up',
    'pf_down': 'Down',
    'pf_flat': 'No change',
    'pf_won': '{amount} KRW',
    'pf_fee_line': 'Weighted average total expense ratio {fee}% · estimated annual cost about {cost}',
    'pf_fee_real': '(Real cost basis {fee}% · about {cost})',
    'pf_fee_partial': 'Expense data missing for some ETFs ({names}); they were left out of the calculation.',
    'pf_fee_none': 'Cannot calculate because your ETFs have no expense data.',
    'pf_weights_title': 'Weight by ETF',
    'pf_chart_title': 'Value over time',
    'pf_period_label': 'Period',
    'pf_period_1m': '1 month',
    'pf_period_3m': '3 months',
    'pf_period_6m': '6 months',
    'pf_period_1y': '1 year',
    'pf_period_all': 'All',
    'pf_period_changed': 'Switched to the {period} period.',
    'pf_chart_aria': 'Line chart of value from {start} to {end}. Start {first}, end {last}. Detailed values are in the table below.',
    'pf_chart_keys': 'Value chart. Use the left and right arrow keys to see the value for each date.',
    'pf_readout': '{date} · {amount}',
    'pf_table_title': 'Value by date table',
    'pf_table_region': 'Value by date table, scrollable horizontally',
    'pf_table_caption': 'Value by date and change from the previous day',
    'pf_table_monthly': 'The period is long, so only month-end values are shown.',
    'pf_col_date': 'Date',
    'pf_col_change': 'Vs. previous day',
    'pf_warn_title': 'Items to check',
    'pf_warn_fetch': '{name} ({code}): prices could not be loaded, so it was left out of the calculation.',
    'pf_warn_no_data': 'Row {row} {name} ({code}): no price data, so it was left out of the calculation.',
    'pf_warn_invalid_row': 'Row {row}: the entries are not valid, so it was left out of the calculation.',
    'pf_warn_non_finite': 'Row {row} {name} ({code}): contains a value that cannot be calculated, so it was left out.',
    'pf_warn_delisted': '{name} ({code}): no prices after {date}, so the last closing price was used.',
    'pf_warn_jump': '{name} ({code}): the closing price changed by more than 40% on {date}. This may be a split or merger, so please check.',
    'pf_warn_pre_listing': '{name} ({code}): the period before the listing date ({date}) is shown as 0 KRW.',
}

NEW_KEYS = list(KO_EXPECTED)


def _pairs(lang):
    with open(ROOT / "i18n" / f"{lang}.json", encoding="utf-8-sig") as f:
        return json.load(f, object_pairs_hook=lambda pairs: pairs)


def _load(lang):
    return dict(_pairs(lang))


def test_new_keys_count():
    assert len(NEW_KEYS) == 117
    assert len(set(NEW_KEYS)) == 117
    assert set(KO_EXPECTED) == set(NEW_KEYS) == set(EN_EXPECTED)


@pytest.mark.parametrize("lang", LANGS)
def test_lang_block(lang):
    pairs = _pairs(lang)
    keys = [k for k, _ in pairs]
    assert len(keys) == len(set(keys)), f"{lang}: duplicate keys"
    i = keys.index(ANCHOR)
    assert keys[i + 1 : i + 1 + len(NEW_KEYS)] == NEW_KEYS
    data, ko = dict(pairs), _load("ko")
    for key in NEW_KEYS:
        assert isinstance(data[key], str) and data[key].strip(), f"{lang}: empty {key}"
        assert "<" not in data[key], f"{lang}: HTML in {key}"
        assert set(PLACEHOLDER_RE.findall(data[key])) == set(PLACEHOLDER_RE.findall(ko[key])), f"{lang}: tokens differ in {key}"


def test_ko_copy_exact():
    data = _load("ko")
    for key, expected in KO_EXPECTED.items():
        assert data[key] == expected, key


def test_en_copy_exact():
    data = _load("en")
    for key, expected in EN_EXPECTED.items():
        assert data[key] == expected, key


def test_ko_wording():
    for key, value in _load("ko").items():
        if key.startswith("pf_"):
            assert "총자산" not in value and "!" not in value, key


@pytest.mark.parametrize("lang", OTHER)
def test_not_fallback(lang):
    data, ko, en = _load(lang), _load("ko"), _load("en")
    for key in ("pf_page_title", "pf_intro", "pf_fee_line", "pf_confirm_body"):
        assert data[key] != ko[key], f"{lang}: {key} left as ko"
        assert data[key] != en[key], f"{lang}: {key} left as en"
