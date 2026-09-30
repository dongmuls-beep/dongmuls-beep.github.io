"""
fetch_market_data_batch() / validate_market_data() 단위 테스트 (DATA-04).
NAVER 응답은 monkeypatch로 대체 — 실제 네트워크 호출 없음.
"""
import pytest
import requests

import etl_process
from etl_process import fetch_market_data_batch


NAVER_ITEMS = [
    {"itemcode": "0026S0", "marketSum": 3391, "quant": 5444},
    {"itemcode": "0069M0", "marketSum": 1976, "quant": 2477},
    {"itemcode": "360750", "marketSum": 100, "quant": 200},
    {"itemcode": "005930", "marketSum": 500, "quant": 600},
]


class FakeResponse:
    def __init__(self, items):
        self._items = items

    def raise_for_status(self):
        pass

    def json(self):
        return {"result": {"etfItemList": self._items}}


def make_naver_response(items):
    return FakeResponse(items)


@pytest.fixture
def patch_naver(monkeypatch):
    def fake_get(*args, **kwargs):
        return make_naver_response(NAVER_ITEMS)

    monkeypatch.setattr(etl_process.requests, "get", fake_get)


class TestFetchMarketDataBatch:
    def test_alphanumeric_codes_matched(self, patch_naver):
        """Test A: 영숫자 코드 매칭"""
        r = fetch_market_data_batch(["0026S0", "0069M0", "360750"])
        assert r["0026S0"] == {"AUM": 3391, "거래량": 5444}
        assert r["0069M0"] == {"AUM": 1976, "거래량": 2477}
        assert r["360750"] == {"AUM": 100, "거래량": 200}

    def test_short_numeric_code_zfilled(self, patch_naver):
        """Test B: 6자리 미만 숫자 코드는 zfill(6) 후 매칭, 키는 원본"""
        r = fetch_market_data_batch(["5930"])
        assert r["5930"] == {"AUM": 500, "거래량": 600}

    def test_lowercase_and_whitespace_normalized(self, patch_naver):
        """Test C: 소문자/공백 포함 코드도 매칭, 키는 원본 입력값"""
        r = fetch_market_data_batch([" 0026s0 "])
        assert r[" 0026s0 "] == {"AUM": 3391, "거래량": 5444}

    def test_missing_code_is_none(self, patch_naver):
        """Test D: NAVER 목록에 없는 코드는 None"""
        r = fetch_market_data_batch(["0099Z0"])
        assert r["0099Z0"] == {"AUM": None, "거래량": None}

    def test_api_failure_all_none(self, monkeypatch):
        """Test E: API 예외 시 전부 None, 예외 전파 없음"""

        def boom(*args, **kwargs):
            raise requests.exceptions.ConnectionError("down")

        monkeypatch.setattr(etl_process.requests, "get", boom)
        r = fetch_market_data_batch(["0026S0", "360750"])
        assert r["0026S0"] == {"AUM": None, "거래량": None}
        assert r["360750"] == {"AUM": None, "거래량": None}

    def test_no_nonstandard_message(self, patch_naver, capsys):
        """Test F: '비표준 코드' 출력 없음"""
        fetch_market_data_batch(["0026S0"])
        assert "비표준 코드" not in capsys.readouterr().out


def item(code, name, aum, vol):
    return {"종목코드": code, "종목명": name, "AUM": aum, "거래량": vol}


class TestValidateMarketData:
    def test_all_present_no_warning(self, capsys):
        """Test G"""
        validate_market_data([item("360750", "A", 1, 2), item("0026S0", "B", 0, 0)])
        assert "[WARNING] DATA-04" not in capsys.readouterr().out

    def test_aum_none_warns(self, capsys):
        """Test H"""
        validate_market_data([item("0099Z0", "테스트ETF", None, 5)])
        out = capsys.readouterr().out
        assert "[WARNING] DATA-04" in out
        assert "0099Z0" in out and "테스트ETF" in out

    def test_volume_none_warns(self, capsys):
        """Test I"""
        validate_market_data([item("111111", "V", 10, None)])
        assert "[WARNING] DATA-04" in capsys.readouterr().out

    def test_two_missing_both_listed(self, capsys):
        """Test J"""
        ret = validate_market_data([item("AAA111", "X", None, None), item("BBB222", "Y", None, 1)])
        out = capsys.readouterr().out
        assert ret is None
        assert "AAA111" in out and "BBB222" in out

    def test_missing_key_warns(self, capsys):
        """Test K"""
        validate_market_data([{"종목코드": "CCC333", "종목명": "Z"}])
        out = capsys.readouterr().out
        assert "[WARNING] DATA-04" in out and "CCC333" in out
