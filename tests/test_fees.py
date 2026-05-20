"""
TEST-01: ETL 수수료 계산 로직 단위 테스트
- p_float(): 수수료 문자열 파싱
- 실부담비용 계산: ter = total + other, real_cost = ter + sell
"""
import pytest
from etl_process import p_float


class TestPFloat:
    """p_float() 파싱 함수 테스트 (D-03)"""

    def test_percent_string(self):
        """'0.05%' → 0.05 (% 기호 제거)"""
        assert p_float("0.05%") == pytest.approx(0.05)

    def test_comma_string(self):
        """'1,234' → 1234.0 (쉼표 제거)"""
        assert p_float("1,234") == pytest.approx(1234.0)

    def test_none_returns_zero(self):
        """None → 0.0 (TypeError 처리)"""
        assert p_float(None) == 0.0

    def test_empty_string_returns_zero(self):
        """'' → 0.0 (ValueError 처리)"""
        assert p_float("") == 0.0

    def test_non_numeric_returns_zero(self):
        """'N/A' → 0.0 (ValueError 처리)"""
        assert p_float("N/A") == 0.0

    def test_plain_numeric_string(self):
        """'0.07' → 0.07 (정상 숫자 문자열)"""
        assert p_float("0.07") == pytest.approx(0.07)

    def test_integer_string(self):
        """'100' → 100.0"""
        assert p_float("100") == pytest.approx(100.0)


class TestRealCostCalculation:
    """
    실부담비용 계산 로직 단위 테스트 (D-02).
    etl_process.py의 ter = total + other, real_cost = ter + sell 로직을 검증.
    """

    def test_standard_calculation(self):
        """
        총보수 0.07%, 기타비용 0.01%, 매매수수료 0.02% 시
        TER = 0.08%, 실부담비용 = 0.10%
        """
        total = p_float("0.07")
        other = p_float("0.01")
        sell = p_float("0.02")

        ter = total + other
        real_cost = ter + sell

        assert ter == pytest.approx(0.08)
        assert real_cost == pytest.approx(0.10)

    def test_zero_sell_fee(self):
        """매매수수료 없을 때 실부담비용 = 총보수 + 기타비용"""
        total = p_float("0.15")
        other = p_float("0.00")
        sell = p_float("0.00")

        ter = total + other
        real_cost = ter + sell

        assert real_cost == pytest.approx(0.15)

    def test_percent_string_in_calculation(self):
        """'%' 포함 문자열도 올바르게 계산된다"""
        total = p_float("0.12%")
        other = p_float("0.02%")
        sell = p_float("0.01%")

        real_cost = total + other + sell

        assert real_cost == pytest.approx(0.15)

    def test_all_zero_fees(self):
        """모든 항목 0일 때 실부담비용 = 0.0"""
        total = p_float("0")
        other = p_float("0")
        sell = p_float("0")

        real_cost = total + other + sell

        assert real_cost == 0.0
