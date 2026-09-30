"""
TEST-02: ETL 헤더 감지 로직 단위 테스트
TEST-03: 데이터 매칭(표준코드 기준) 단위 테스트
"""
import json

import openpyxl
import pytest

import etl_process
from etl_process import process_data


class TestHeaderDetectionPrimary:
    """
    TEST-02: Primary 헤더 감지 — '합계(A)' + '표준코드' 포함 행에서
    header_idx=3으로 정확히 감지한다.
    """

    def test_returns_nonempty_results(self, kofia_primary_xlsx, managed_df_primary):
        """Primary fixture 처리 시 결과가 비어있지 않다 (헤더 감지 성공 증거)"""
        results = process_data(managed_df_primary, kofia_primary_xlsx)
        assert len(results) > 0, "헤더 감지 실패 — 결과가 비어있음"

    def test_matches_two_items(self, kofia_primary_xlsx, managed_df_primary):
        """managed_df의 KR7360750004, KR7133690008 두 항목이 매칭된다"""
        results = process_data(managed_df_primary, kofia_primary_xlsx)
        assert len(results) == 2, f"예상 2개, 실제 {len(results)}개"

    def test_result_contains_standard_code_360750(self, kofia_primary_xlsx, managed_df_primary):
        """결과에 종목코드 '360750' 항목이 포함된다"""
        results = process_data(managed_df_primary, kofia_primary_xlsx)
        codes = [r['종목코드'] for r in results]
        assert '360750' in codes, f"360750 없음 — 결과: {codes}"


class TestHeaderDetectionFallback:
    """
    TEST-02: Fallback 헤더 감지 — '합계(A)' 없고 '매매수수료' 포함 행에서
    fallback 경로로 헤더가 감지된다.
    """

    def test_fallback_returns_nonempty_results(self, kofia_fallback_xlsx, managed_df_primary):
        """Fallback fixture 처리 시 결과가 비어있지 않다 (fallback 경로 성공 증거)"""
        results = process_data(managed_df_primary, kofia_fallback_xlsx)
        assert len(results) > 0, "Fallback 헤더 감지 실패 — 결과가 비어있음"

    def test_fallback_matches_two_items(self, kofia_fallback_xlsx, managed_df_primary):
        """Fallback fixture에서도 KR7360750004, KR7133690008 두 항목이 매칭된다"""
        results = process_data(managed_df_primary, kofia_fallback_xlsx)
        assert len(results) == 2, f"예상 2개, 실제 {len(results)}개"


class TestDataMatchingByStandardCode:
    """
    TEST-03: 표준코드 기준 데이터 매칭.
    """

    def test_real_cost_is_correct(self, kofia_primary_xlsx, managed_df_primary):
        """
        KR7360750004: 총보수 0.07 + 기타비용 0.01 + 매매수수료 0.02 = 0.10
        round(..., 4) = 0.1 (또는 0.10)
        """
        results = process_data(managed_df_primary, kofia_primary_xlsx)
        item_360750 = next((r for r in results if r['종목코드'] == '360750'), None)
        assert item_360750 is not None, "종목코드 360750 결과 없음"
        assert item_360750['실부담비용'] == pytest.approx(0.10, abs=1e-4)

    def test_result_fields_complete(self, kofia_primary_xlsx, managed_df_primary):
        """결과 각 항목에 필수 키 7개가 모두 존재한다"""
        results = process_data(managed_df_primary, kofia_primary_xlsx)
        required_keys = {'구분', '종목코드', '종목명', '총보수', '기타비용', '매매중개수수료', '실부담비용'}
        for item in results:
            missing = required_keys - set(item.keys())
            assert not missing, f"항목 {item.get('종목코드')}에 누락 키: {missing}"

    def test_unmatched_dummy_excluded(self, kofia_primary_xlsx, managed_df_primary):
        """
        managed_df에 KR9999999999가 없으므로 fixture의 더미 행은 결과에 포함되지 않는다.
        (결과는 managed_df 기준 매칭이므로 managed_df에 없는 표준코드는 무시됨)
        """
        results = process_data(managed_df_primary, kofia_primary_xlsx)
        # managed_df에 두 항목이므로 결과도 최대 2개
        assert len(results) <= 2

    def test_empty_file_returns_empty(self, tmp_path, managed_df_primary):
        """존재하지 않는 파일 경로 시 빈 리스트 반환"""
        fake_path = str(tmp_path / "nonexistent.xlsx")
        results = process_data(managed_df_primary, fake_path)
        assert results == []


def _write_kofia_xlsx(tmp_path, header, rows, name="kofia_custom.xlsx"):
    """3 메타 행 + 헤더 + 데이터 행 xlsx fixture (conftest kofia_primary_xlsx와 동일 레이아웃)."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["KOFIA 펀드 보수·비용 현황"] + [None] * (len(header) - 1))
    ws.append(["기준일: 2026-05-01"] + [None] * (len(header) - 1))
    ws.append([None] * len(header))
    ws.append(header)
    for r in rows:
        ws.append(r)
    path = tmp_path / name
    wb.save(str(path))
    return str(path)


HEADER = ["표준코드", "펀드명", "합계(A)", "기타비용(B)", "매매·중개수수료율(D)"]
CODE_A, CODE_B = "KR7360750004", "KR7133690008"


def _by_code(results, code):
    return next(r for r in results if r['종목코드'] == code)


def _reject_const(c):
    raise ValueError(f"non-standard JSON constant: {c}")


class TestMissingFeeNull:
    """DATA-07/08: 결측 수수료 -> null, 실부담비용 null, 행은 유지"""

    def test_blank_total_is_null(self, tmp_path, managed_df_primary, capsys):
        path = _write_kofia_xlsx(tmp_path, HEADER, [
            [CODE_A, "A", None, "0.01", "0.02"],
            [CODE_B, "B", "0.12", "0.02", "0.01"],
        ])
        results = process_data(managed_df_primary, path)
        assert len(results) == 2
        a = _by_code(results, '360750')
        assert a['총보수'] is None
        assert a['실부담비용'] is None
        assert _by_code(results, '133690')['실부담비용'] == pytest.approx(0.15, abs=1e-4)
        assert "[WARNING] DATA-07" in capsys.readouterr().out

    def test_dash_other_is_null_and_warning_has_raw_token(self, tmp_path, managed_df_primary, capsys):
        path = _write_kofia_xlsx(tmp_path, HEADER, [
            [CODE_A, "A", "0.07", "-", "0.02"],
            [CODE_B, "B", "0.12", "0.02", "0.01"],
        ])
        results = process_data(managed_df_primary, path)
        a = _by_code(results, '360750')
        assert a['기타비용'] is None
        assert a['실부담비용'] is None
        out = capsys.readouterr().out
        assert "[WARNING] DATA-07" in out
        assert "'-'" in out
        assert "[WARNING] DATA-08" in out

    def test_nan_string_sell_is_null(self, tmp_path, managed_df_primary):
        path = _write_kofia_xlsx(tmp_path, HEADER, [
            [CODE_A, "A", "0.07", "0.01", "nan"],
            [CODE_B, "B", "0.12", "0.02", "0.01"],
        ])
        results = process_data(managed_df_primary, path)
        a = _by_code(results, '360750')
        assert a['매매중개수수료'] is None
        assert a['실부담비용'] is None

    def test_numeric_zero_preserved(self, tmp_path, managed_df_primary):
        path = _write_kofia_xlsx(tmp_path, HEADER, [
            [CODE_A, "A", 0.07, 0, 0.02],
            [CODE_B, "B", "0.12", "0.00", "0.01"],
        ])
        results = process_data(managed_df_primary, path)
        a = _by_code(results, '360750')
        assert a['기타비용'] == 0.0 and a['기타비용'] is not None
        assert a['실부담비용'] == pytest.approx(round(0.07 + 0 + 0.02, 4))
        b = _by_code(results, '133690')
        assert b['기타비용'] == 0.0
        assert b['실부담비용'] == pytest.approx(0.13, abs=1e-4)

    def test_absent_column_is_null(self, tmp_path, managed_df_primary):
        header = ["표준코드", "펀드명", "합계(A)", "매매·중개수수료율(D)"]
        path = _write_kofia_xlsx(tmp_path, header, [
            [CODE_A, "A", "0.07", "0.02"],
            [CODE_B, "B", "0.12", "0.01"],
        ])
        results = process_data(managed_df_primary, path)
        assert len(results) == 2
        for r in results:
            assert r['기타비용'] is None
            assert r['실부담비용'] is None

    def test_results_dump_without_nan(self, tmp_path, managed_df_primary):
        path = _write_kofia_xlsx(tmp_path, HEADER, [
            [CODE_A, "A", None, "-", "nan"],
            [CODE_B, "B", "0.12", "0.02", "0.01"],
        ])
        results = process_data(managed_df_primary, path)
        text = json.dumps(results, ensure_ascii=False, allow_nan=False)
        assert "null" in text
        json.loads(text, parse_constant=_reject_const)


class TestJsonWriter:
    """update_google_sheets: allow_nan=False, 실패 시 기존 data.json 보존"""

    def test_none_written_as_null(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        monkeypatch.setattr(etl_process, "write_update_meta", lambda: False)
        payload = [{'종목코드': '1', '총보수': None, '실부담비용': None}]
        etl_process.update_google_sheets(payload)
        text = (tmp_path / "data.json").read_text(encoding="utf-8")
        assert "null" in text
        assert json.loads(text, parse_constant=_reject_const) == payload

    def test_nan_rejected_without_truncation(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        monkeypatch.setattr(etl_process, "write_update_meta", lambda: False)
        target = tmp_path / "data.json"
        target.write_bytes(b'[{"old": 1}]')
        ok = etl_process.update_google_sheets([{'종목코드': '1', '실부담비용': float('nan')}])
        assert ok is False
        assert target.read_bytes() == b'[{"old": 1}]'


class TestMarketDataFinite:
    """fetch_market_data_batch: 비유한/결측 AUM/거래량은 None (allow_nan=False 대비)"""

    def test_non_finite_coerced_to_none(self, monkeypatch):
        class Resp:
            def raise_for_status(self):
                pass

            def json(self):
                return {"result": {"etfItemList": [
                    {"itemcode": "360750", "marketSum": float("nan"), "quant": float("inf")},
                    {"itemcode": "133690", "marketSum": 1234, "quant": "5,678"},
                    {"itemcode": "069500", "marketSum": None, "quant": "abc"},
                ]}}

        monkeypatch.setattr(etl_process.requests, "get", lambda *a, **k: Resp())
        out = etl_process.fetch_market_data_batch(["360750", "133690", "069500", "999999"])
        assert out["360750"] == {"AUM": None, "거래량": None}
        assert out["133690"] == {"AUM": 1234, "거래량": 5678.0}
        assert out["069500"] == {"AUM": None, "거래량": None}
        assert out["999999"] == {"AUM": None, "거래량": None}
        json.dumps(out, allow_nan=False)
