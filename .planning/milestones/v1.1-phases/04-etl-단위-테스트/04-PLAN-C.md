---
phase: 04-etl-단위-테스트
plan: C
type: execute
wave: 2
depends_on:
  - 04-PLAN-A
files_modified:
  - tests/test_process_data.py
  - tests/test_validate.py
autonomous: true
requirements:
  - TEST-02
  - TEST-03

must_haves:
  truths:
    - "헤더 감지 테스트: primary fixture에서 header_idx=3이 감지된다"
    - "헤더 감지 테스트: fallback fixture에서 fallback 경로로 header_idx가 감지된다"
    - "데이터 매칭 테스트: 표준코드 KR7360750004 기준으로 매칭이 성공한다"
    - "데이터 매칭 테스트: 매칭 결과에 실부담비용 0.10이 포함된다 (0.07+0.01+0.02)"
    - "데이터 매칭 테스트: KR9999999999 (더미) 항목은 결과에 포함되지 않는다"
    - "validate_etl_results DATA-01 테스트: 6% 항목 포함 시 [WARNING] DATA-01 출력된다"
    - "validate_etl_results DATA-02 테스트: 중복 종목코드 시 [WARNING] DATA-02 출력된다"
    - "validate_etl_results DATA-03 테스트: ±1.0%p 초과 변동 시 [WARNING] DATA-03 출력된다"
    - "validate_etl_results DATA-03 추가: prev_data=None 시 경고 없이 정상 완료된다"
    - "pytest tests/ 전체 실행 시 모든 테스트 통과한다"
  artifacts:
    - path: "tests/test_process_data.py"
      provides: "헤더 감지(TEST-02) + 데이터 매칭(TEST-03) 테스트"
      exports: ["test_header_detection_primary", "test_header_detection_fallback", "test_matching_by_standard_code", "test_unmatched_item_excluded"]
    - path: "tests/test_validate.py"
      provides: "validate_etl_results DATA-01/02/03 테스트"
      exports: ["test_data01_out_of_range", "test_data02_duplicate_code", "test_data03_anomaly_detection", "test_data03_no_prev_data"]
  key_links:
    - from: "tests/test_process_data.py"
      to: "etl_process.py:process_data()"
      via: "kofia_primary_xlsx, kofia_fallback_xlsx, managed_df_primary fixtures"
      pattern: "from etl_process import process_data"
    - from: "tests/test_validate.py"
      to: "etl_process.py:validate_etl_results()"
      via: "from etl_process import validate_etl_results"
      pattern: "from etl_process import validate_etl_results"
---

<objective>
헤더 감지·데이터 매칭 테스트 + validate_etl_results 검증 테스트 (TEST-02, TEST-03 충족).

Purpose: process_data()의 Excel 헤더 감지 로직과 표준코드 기준 데이터 매칭 로직을 테스트로 검증하고, validate_etl_results()의 DATA-01/02/03 경고 출력도 검증한다.
Output:
- tests/test_process_data.py: 헤더 감지 2종 + 표준코드 매칭 + 미매칭 배제 테스트
- tests/test_validate.py: DATA-01/02/03 경고 케이스 + 정상 케이스 테스트
</objective>

<execution_context>
@C:\Users\godpierland\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\godpierland\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-etl-단위-테스트/04-CONTEXT.md
@.planning/phases/02-데이터-무결성-검증/02-CONTEXT.md
@.planning/phases/04-etl-단위-테스트/04-A-SUMMARY.md

<interfaces>
<!-- etl_process.py에서 추출한 핵심 인터페이스 -->

process_data(managed_df, file_path) → List[dict]:
  - 정상 반환: [{'구분', '종목코드', '종목명', '총보수', '기타비용', '매매중개수수료', '실부담비용'}, ...]
  - 매칭 실패 항목은 결과에서 제외됨 (continue로 skip)
  - file_path가 없거나 존재하지 않으면 [] 반환

헤더 감지 로직 (etl_process.py line 236-253):
  Primary 조건:
    any('(A)' in s for s in row_str) and any('합계' in s for s in row_str)
    → header_idx = i (해당 행 인덱스)
  Fallback 조건:
    any('매매' in s and '수수료' in s for s in row_str)
    → header_idx = i
  최종 fallback: header_idx = 0

conftest.py에서 제공하는 fixture:
  - kofia_primary_xlsx: primary fixture xlsx 파일 경로 (str)
    - row 0~2: 메타데이터
    - row 3 (index=3): 헤더 — ['표준코드', '펀드명', '합계(A)', '기타비용(B)', '매매·중개수수료율(D)']
    - row 4~6: 데이터 — KR7360750004(0.07/0.01/0.02), KR7133690008(0.12/0.02/0.01), KR9999999999(더미)
  - kofia_fallback_xlsx: fallback fixture xlsx 파일 경로 (str)
    - row 3 (index=3): 헤더 — ['표준코드', '펀드명', '총보수', '기타비용', '매매수수료율']
  - managed_df_primary: pd.DataFrame — KR7360750004, KR7133690008 두 항목

validate_etl_results(results, prev_data) → None:
  출력 패턴:
    DATA-01: "[WARNING] DATA-01: {종목명} 실부담비용 {cost:.4f}% — 정상 범위(0~5%) 이탈"
    DATA-02: "[WARNING] DATA-02: 중복 종목코드 발견 ({n}건): {codes}"
    DATA-03: "[WARNING] DATA-03: {종목명} 실부담비용 급변 감지 — 이전: {prev:.4f}%, 현재: {new:.4f}%, 변동폭: {delta:.4f}%p (임계값: ±1.0%p)"

final_data 구조 (validate_etl_results 입력):
  [{'구분': str, '종목코드': str, '종목명': str, '총보수': float,
    '기타비용': float, '매매중개수수료': float, '실부담비용': float}, ...]
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: tests/test_process_data.py — 헤더 감지 + 데이터 매칭 테스트</name>
  <read_first>
    - tests/conftest.py (fixture 이름, 반환 타입, 데이터 구조 확인)
    - etl_process.py line 218-260 (process_data 헤더 감지 로직)
    - etl_process.py line 305-370 (데이터 매칭 및 실부담비용 계산 로직)
  </read_first>
  <files>tests/test_process_data.py</files>
  <behavior>
    헤더 감지 (TEST-02):
    - test_header_detection_primary: kofia_primary_xlsx 처리 시 결과 길이 2 (KR7360750004, KR7133690008 매칭)
    - test_header_detection_fallback: kofia_fallback_xlsx 처리 시 결과 길이 2 이상 (fallback 경로로 헤더 감지 성공)

    데이터 매칭 (TEST-03):
    - test_matching_by_standard_code: 결과에 종목코드 '360750' 항목 존재, 실부담비용 0.10 (0.07+0.01+0.02)
    - test_unmatched_item_excluded: managed_df에 KR9999999999 없으므로 결과에 3개 항목 없음 (결과 2개만)
    - test_matching_result_fields: 결과 항목에 필수 키 ['구분', '종목코드', '종목명', '총보수', '기타비용', '매매중개수수료', '실부담비용'] 존재
  </behavior>
  <action>
    tests/test_process_data.py를 다음 내용으로 생성한다:

    ```python
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
    ```

    주의사항:
    - process_data()는 내부적으로 print()를 많이 호출하지만 테스트에서 capsys 필요 없음 — 반환값만 검증한다.
    - managed_df_primary fixture에는 KR9999999999가 없으므로, fixture의 더미 행은 매칭 대상 자체가 아니다.
    - 실부담비용 계산: 0.07 + 0.01 + 0.02 = 0.10이며, etl_process.py에서 round(real_cost, 4)가 적용된다.
  </action>
  <verify>
    <automated>cd "C:\Users\godpierland\OneDrive\Antigravity\ETF비교사이트" && python -m pytest tests/test_process_data.py -v</automated>
  </verify>
  <acceptance_criteria>
    - tests/test_process_data.py 파일이 존재한다
    - `from etl_process import process_data` 행이 존재한다
    - `class TestHeaderDetectionPrimary` 정의가 존재한다
    - `class TestHeaderDetectionFallback` 정의가 존재한다
    - `class TestDataMatchingByStandardCode` 정의가 존재한다
    - `pytest tests/test_process_data.py -v` 실행 시 모든 테스트 PASSED, exit code 0
    - PASSED 테스트 수 9개 이상
  </acceptance_criteria>
  <done>pytest tests/test_process_data.py 전체 통과, TEST-02(헤더 감지)와 TEST-03(데이터 매칭) 요구사항 충족</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: tests/test_validate.py — validate_etl_results DATA-01/02/03 테스트</name>
  <read_first>
    - etl_process.py line 389-438 (validate_etl_results() 전체 구현 — 경고 출력 패턴 확인)
    - .planning/phases/04-etl-단위-테스트/04-CONTEXT.md (D-07, D-08, D-09 결정)
    - .planning/phases/02-데이터-무결성-검증/02-CONTEXT.md (D-04, D-05 임계값 확인)
  </read_first>
  <files>tests/test_validate.py</files>
  <behavior>
    DATA-01 (수수료 범위 검증):
    - test_data01_normal_case: 실부담비용 0~5% 범위 내 → [WARNING] DATA-01 출력 없음
    - test_data01_out_of_range: 실부담비용 6.0% 항목 포함 → "[WARNING] DATA-01:" 출력 포함

    DATA-02 (중복 종목코드):
    - test_data02_no_duplicates: 중복 없음 → [WARNING] DATA-02 출력 없음
    - test_data02_duplicate_code: 동일 종목코드 2개 → "[WARNING] DATA-02:" 출력 포함

    DATA-03 (이상치 감지):
    - test_data03_no_prev_data: prev_data=None → 경고 없이 정상 완료 (예외 없음)
    - test_data03_no_anomaly: ±1.0%p 미만 변동 → [WARNING] DATA-03 출력 없음
    - test_data03_anomaly_detected: ±1.0%p 초과 변동 → "[WARNING] DATA-03:" 출력 포함

    정상 케이스:
    - test_all_normal: 범위 내, 중복 없음, 이상치 없음 → 경고 없음, 반환값 None
  </behavior>
  <action>
    tests/test_validate.py를 다음 내용으로 생성한다 (D-07, D-08, D-09):

    ```python
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
    ```
  </action>
  <verify>
    <automated>cd "C:\Users\godpierland\OneDrive\Antigravity\ETF비교사이트" && python -m pytest tests/test_validate.py -v</automated>
  </verify>
  <acceptance_criteria>
    - tests/test_validate.py 파일이 존재한다
    - `from etl_process import validate_etl_results` 행이 존재한다
    - capsys를 사용하여 print 출력을 검증한다 (grep "capsys" tests/test_validate.py)
    - `class TestData01FeeRange` 정의가 존재한다
    - `class TestData02DuplicateCode` 정의가 존재한다
    - `class TestData03AnomalyDetection` 정의가 존재한다
    - `pytest tests/test_validate.py -v` 실행 시 모든 테스트 PASSED, exit code 0
    - PASSED 테스트 수 12개 이상
    - `pytest tests/ -v` 전체 실행 시 모든 테스트 PASSED, exit code 0
  </acceptance_criteria>
  <done>pytest tests/test_validate.py 전체 통과, pytest tests/ 전체 통과, DATA-01/02/03 경고 패턴 모두 검증됨</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 테스트 입력 → validate_etl_results | 하드코딩 fixture 데이터 — 외부 입력 없음 |
| test_process_data → 임시 Excel 파일 | tmp_path를 통한 격리된 임시 파일, 테스트 후 자동 삭제 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04C-01 | Information Disclosure | capsys로 print 출력 캡처 | accept | 테스트 환경 내부, 민감 데이터 없음 |
| T-04C-02 | Tampering | process_data() 실제 Excel 파일 의존 | mitigate | conftest.py tmp_path fixture 사용으로 각 테스트 격리, 파일 충돌 없음 |
</threat_model>

<verification>
- `grep -c "def test_" tests/test_process_data.py` → 9 이상
- `grep -c "def test_" tests/test_validate.py` → 12 이상
- `python -m pytest tests/test_process_data.py -v` → 전체 PASSED, exit 0
- `python -m pytest tests/test_validate.py -v` → 전체 PASSED, exit 0
- `python -m pytest tests/ -v` → 전체 PASSED, exit 0
</verification>

<success_criteria>
- tests/test_process_data.py: Primary/Fallback 헤더 감지 + 표준코드 매칭 + 미매칭 배제 테스트 존재
- tests/test_validate.py: DATA-01 (범위 이탈), DATA-02 (중복 코드), DATA-03 (이상치 + prev_data=None) 테스트 존재
- pytest tests/ 전체 실행 시 모든 테스트 통과
- TEST-02 (헤더 감지), TEST-03 (데이터 매칭) 요구사항 충족
</success_criteria>

<output>
완료 후 `.planning/phases/04-etl-단위-테스트/04-C-SUMMARY.md` 생성
</output>
