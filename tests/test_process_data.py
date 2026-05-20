"""
TEST-02: ETL 헤더 감지 로직 단위 테스트
TEST-03: 데이터 매칭(표준코드 기준) 단위 테스트
"""
import pytest
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
