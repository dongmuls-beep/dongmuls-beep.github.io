"""
validate_etl_results() 단위 테스트.
Phase 2에서 순수 함수로 설계됨 — 파일 I/O 없음, 직접 import 테스트 가능.
경고 확인 방법: capsys (D-09 결정 — capsys가 mock.patch보다 pytest-native)
"""
import pytest
from etl_process import validate_etl_results


def make_item(code, name, cost):
    """테스트용 final_data 항목 생성 헬퍼"""
    return {
        '구분': '국내주식형',
        '종목코드': code,
        '종목명': name,
        '총보수': cost,
        '기타비용': 0.0,
        '매매중개수수료': 0.0,
        '실부담비용': cost,
    }


class TestData01FeeRange:
    """DATA-01: 실부담비용 0~5% 범위 검증"""

    def test_normal_case_no_warning(self, capsys):
        """정상 범위 내 → [WARNING] DATA-01 출력 없음"""
        results = [
            make_item('360750', 'TIGER 미국S&P500', 0.10),
            make_item('133690', 'TIGER 미국나스닥100', 0.15),
        ]
        validate_etl_results(results, None)
        captured = capsys.readouterr()
        assert '[WARNING] DATA-01' not in captured.out

    def test_out_of_range_triggers_warning(self, capsys):
        """실부담비용 6.0% → [WARNING] DATA-01 포함"""
        results = [
            make_item('360750', 'TIGER 미국S&P500', 0.10),
            make_item('999999', '이상ETF', 6.0),  # 5% 초과
        ]
        validate_etl_results(results, None)
        captured = capsys.readouterr()
        assert '[WARNING] DATA-01' in captured.out

    def test_warning_contains_item_info(self, capsys):
        """경고 메시지에 이상치 항목 정보가 포함된다"""
        results = [make_item('999999', '이상ETF', 6.0)]
        validate_etl_results(results, None)
        captured = capsys.readouterr()
        assert '이상ETF' in captured.out or '999999' in captured.out


class TestData02DuplicateCode:
    """DATA-02: 중복 종목코드 감지"""

    def test_no_duplicates_no_warning(self, capsys):
        """중복 없음 → [WARNING] DATA-02 출력 없음"""
        results = [
            make_item('360750', 'TIGER 미국S&P500', 0.10),
            make_item('133690', 'TIGER 미국나스닥100', 0.15),
        ]
        validate_etl_results(results, None)
        captured = capsys.readouterr()
        assert '[WARNING] DATA-02' not in captured.out

    def test_duplicate_code_triggers_warning(self, capsys):
        """동일 종목코드 2개 → [WARNING] DATA-02 포함"""
        results = [
            make_item('360750', 'TIGER 미국S&P500', 0.10),
            make_item('360750', 'TIGER 미국S&P500 (중복)', 0.11),
        ]
        validate_etl_results(results, None)
        captured = capsys.readouterr()
        assert '[WARNING] DATA-02' in captured.out

    def test_warning_contains_duplicate_code(self, capsys):
        """경고 메시지에 중복된 종목코드가 포함된다"""
        results = [
            make_item('360750', 'A', 0.10),
            make_item('360750', 'B', 0.11),
        ]
        validate_etl_results(results, None)
        captured = capsys.readouterr()
        assert '360750' in captured.out


class TestData03AnomalyDetection:
    """DATA-03: 이상치 감지 (이전 data.json 대비 ±1.0%p 초과)"""

    def test_no_prev_data_no_error(self, capsys):
        """prev_data=None → 예외 없이 정상 완료, DATA-03 경고 없음 (D-08 추가 케이스)"""
        results = [make_item('360750', 'TIGER 미국S&P500', 0.10)]
        validate_etl_results(results, None)  # 예외 발생 시 테스트 실패
        captured = capsys.readouterr()
        assert '[WARNING] DATA-03' not in captured.out

    def test_no_anomaly_no_warning(self, capsys):
        """±1.0%p 미만 변동 → [WARNING] DATA-03 출력 없음"""
        results = [make_item('360750', 'TIGER 미국S&P500', 0.10)]
        prev_data = [make_item('360750', 'TIGER 미국S&P500', 0.09)]  # 0.01%p 변동
        validate_etl_results(results, prev_data)
        captured = capsys.readouterr()
        assert '[WARNING] DATA-03' not in captured.out

    def test_anomaly_triggers_warning(self, capsys):
        """±1.0%p 초과 변동 → [WARNING] DATA-03 포함"""
        results = [make_item('360750', 'TIGER 미국S&P500', 1.5)]   # 새 값: 1.5%
        prev_data = [make_item('360750', 'TIGER 미국S&P500', 0.1)]  # 이전 값: 0.1%
        # 변동폭: |1.5 - 0.1| = 1.4%p → 임계값 1.0%p 초과
        validate_etl_results(results, prev_data)
        captured = capsys.readouterr()
        assert '[WARNING] DATA-03' in captured.out

    def test_anomaly_warning_contains_code(self, capsys):
        """경고 메시지에 해당 ETF 정보가 포함된다"""
        results = [make_item('360750', 'TIGER 미국S&P500', 1.5)]
        prev_data = [make_item('360750', 'TIGER 미국S&P500', 0.1)]
        validate_etl_results(results, prev_data)
        captured = capsys.readouterr()
        # 종목명 또는 변동폭 정보가 포함된다
        assert 'TIGER' in captured.out or '360750' in captured.out

    def test_boundary_exactly_1p_triggers_warning(self, capsys):
        """변동폭 정확히 1.0%p → 경고 발생 (>= 임계값이므로 경계값 포함)"""
        results = [make_item('360750', 'TIGER 미국S&P500', 1.1)]
        prev_data = [make_item('360750', 'TIGER 미국S&P500', 0.1)]
        # 변동폭: |1.1 - 0.1| = 1.0%p → 임계값 == 1.0%p, delta >= ANOMALY_THRESHOLD
        validate_etl_results(results, prev_data)
        captured = capsys.readouterr()
        assert '[WARNING] DATA-03' in captured.out


class TestAllNormalCase:
    """정상 케이스 통합 — 모든 검증 통과 시 경고 없음, 반환값 None"""

    def test_returns_none(self):
        """validate_etl_results()는 항상 None을 반환한다 (순수 함수 설계)"""
        results = [make_item('360750', 'TIGER 미국S&P500', 0.10)]
        return_value = validate_etl_results(results, None)
        assert return_value is None

    def test_no_warnings_when_all_valid(self, capsys):
        """모든 항목이 유효 범위 내, 중복 없음, 이상치 없음 → 경고 없음"""
        results = [
            make_item('360750', 'TIGER 미국S&P500', 0.10),
            make_item('133690', 'TIGER 미국나스닥100', 0.15),
        ]
        prev_data = [
            make_item('360750', 'TIGER 미국S&P500', 0.10),
            make_item('133690', 'TIGER 미국나스닥100', 0.15),
        ]
        validate_etl_results(results, prev_data)
        captured = capsys.readouterr()
        assert '[WARNING]' not in captured.out
