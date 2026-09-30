---
phase: 04-etl-단위-테스트
plan: B
type: execute
wave: 2
depends_on:
  - 04-PLAN-A
files_modified:
  - etl_process.py
  - tests/test_fees.py
autonomous: true
requirements:
  - TEST-01

must_haves:
  truths:
    - "p_float()가 etl_process 모듈에서 직접 import 가능하다 (from etl_process import p_float)"
    - "p_float('0.05%') 는 0.05를 반환한다"
    - "p_float('1,234') 는 1234.0을 반환한다"
    - "p_float(None), p_float(''), p_float('N/A') 는 모두 0.0을 반환한다"
    - "실부담비용 계산 로직 (ter = total + other, real_cost = ter + sell) 단위 테스트가 존재한다"
    - "pytest tests/test_fees.py 실행 시 모든 테스트 통과한다"
  artifacts:
    - path: "etl_process.py"
      provides: "모듈 수준 p_float() 함수"
      contains: "def p_float(v):"
    - path: "tests/test_fees.py"
      provides: "p_float 단위 테스트 + 실부담비용 계산 테스트"
      exports: ["test_p_float_percent", "test_p_float_comma", "test_p_float_edge_cases", "test_real_cost_calculation"]
  key_links:
    - from: "tests/test_fees.py"
      to: "etl_process.py"
      via: "from etl_process import p_float"
      pattern: "from etl_process import p_float"
---

<objective>
p_float() 모듈 수준 추출 + 수수료 계산 단위 테스트 (TEST-01 완전 충족).

Purpose: p_float()를 모듈 수준으로 이동하여 직접 import 테스트 가능하게 만들고, 수수료 파싱 및 실부담비용 계산 로직을 테스트로 검증한다.
Output:
- etl_process.py: p_float() 함수를 process_data() 중첩 함수에서 모듈 수준으로 이동
- tests/test_fees.py: p_float() 테스트 케이스 5개 + 실부담비용 계산 테스트
</objective>

<execution_context>
@C:\Users\godpierland\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\godpierland\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-etl-단위-테스트/04-CONTEXT.md
@.planning/phases/04-etl-단위-테스트/04-A-SUMMARY.md

<interfaces>
<!-- etl_process.py에서 추출한 p_float 현재 위치 및 구조 -->

현재 p_float 위치 (etl_process.py line 330 — process_data() 내부 중첩 함수):
```python
def p_float(v):
    try:
        return float(str(v).replace(',', '').replace('%', ''))
    except (ValueError, TypeError, AttributeError):
        return 0.0
```

p_float를 호출하는 코드 (etl_process.py line 345-347):
```python
total = p_float(row.get(col_total, 0)) if col_total else 0
other = p_float(row.get(col_other, 0)) if col_other else 0
sell = p_float(row.get(col_sell, 0)) if col_sell else 0
```

실부담비용 계산 로직 (etl_process.py line 349-353):
```python
# TER = 총보수 + 기타비용
ter = total + other

# Final Real Cost
real_cost = ter + sell
```

이동 후 목표 위치: validate_etl_results() 함수 정의(line 389) 바로 위,
process_data() 함수 정의(line 218) 바로 위 영역이 적합.
이동 후 process_data() 내부 호출 코드(line 345-347)는 변경 불필요 — 모듈 수준에서도 동일하게 접근 가능.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: p_float()를 etl_process.py 모듈 수준으로 이동</name>
  <read_first>
    - etl_process.py line 218-390 (process_data() 전체 — p_float 위치와 호출 지점 파악)
    - etl_process.py line 1-20 (import 영역 확인)
  </read_first>
  <files>etl_process.py</files>
  <behavior>
    - `from etl_process import p_float` 가 ImportError 없이 성공한다
    - `p_float("0.05%")` == 0.05
    - `p_float("1,234")` == 1234.0
    - `p_float(None)` == 0.0
    - `p_float("")` == 0.0
    - `p_float("N/A")` == 0.0
  </behavior>
  <action>
    **변경 내용 (D-01):**

    etl_process.py에서 다음 변경을 수행한다:

    1. process_data() 함수 내부 line 330~334의 중첩 함수 정의를 삭제:
    ```python
    # 삭제할 코드 (process_data 내부, "Robust Fee Calculation" 주석 직후):
    def p_float(v):
        try:
            return float(str(v).replace(',', '').replace('%', ''))
        except (ValueError, TypeError, AttributeError):
            return 0.0
    ```

    2. process_data() 함수 정의(`def process_data(managed_df, file_path):`) 바로 위, 즉 line 218 직전에 모듈 수준 함수로 추가:
    ```python
    def p_float(v):
        """
        수수료 문자열을 float로 파싱한다.
        - '%' 제거: "0.05%" → 0.05
        - ',' 제거: "1,234" → 1234.0
        - 파싱 불가 (None, "", "N/A" 등) → 0.0
        """
        try:
            return float(str(v).replace(',', '').replace('%', ''))
        except (ValueError, TypeError, AttributeError):
            return 0.0


    ```

    3. process_data() 내부 p_float 호출 코드(line 345-347)는 변경하지 않는다.
    모듈 수준으로 이동해도 동일하게 동작한다.

    **검증:** 이동 후 `python -c "from etl_process import p_float; print(p_float('0.05%'))"` 출력이 `0.05`여야 한다.
  </action>
  <verify>
    <automated>cd "C:\Users\godpierland\OneDrive\Antigravity\ETF비교사이트" && python -c "from etl_process import p_float; assert p_float('0.05%') == 0.05; assert p_float('1,234') == 1234.0; assert p_float(None) == 0.0; assert p_float('') == 0.0; assert p_float('N/A') == 0.0; print('p_float OK')"</automated>
  </verify>
  <acceptance_criteria>
    - etl_process.py에 `def p_float(v):` 정의가 존재한다 (grep 검증: `grep -n "^def p_float" etl_process.py`)
    - 위 grep 결과의 줄 번호가 process_data() 정의 줄 번호보다 작다 (모듈 수준 위치 확인)
    - process_data() 내부에 `def p_float` 중첩 함수 정의가 더 이상 존재하지 않는다
    - `python -c "from etl_process import p_float; print(p_float('0.05%'))"` 출력: `0.05`
    - `python -c "from etl_process import p_float; print(p_float('1,234'))"` 출력: `1234.0`
    - `python -c "from etl_process import p_float; print(p_float(None))"` 출력: `0.0`
  </acceptance_criteria>
  <done>p_float()가 etl_process 모듈 수준에 존재하고 from etl_process import p_float로 직접 import 가능</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: tests/test_fees.py 작성 — p_float + 실부담비용 계산 테스트</name>
  <read_first>
    - tests/conftest.py (fixture 이름 및 구조 확인)
    - etl_process.py line 344-366 (p_float 호출 및 실부담비용 계산 로직 확인)
    - .planning/phases/04-etl-단위-테스트/04-CONTEXT.md (D-02, D-03 테스트 케이스 목록)
  </read_first>
  <files>tests/test_fees.py</files>
  <behavior>
    p_float 테스트:
    - test_p_float_percent: "0.05%" → 0.05
    - test_p_float_comma: "1,234" → 1234.0
    - test_p_float_none: None → 0.0
    - test_p_float_empty: "" → 0.0
    - test_p_float_non_numeric: "N/A" → 0.0

    실부담비용 계산 테스트:
    - test_real_cost_calculation: total=0.07, other=0.01, sell=0.02 → ter=0.08, real_cost=0.10
    - test_real_cost_zero_sell: total=0.15, other=0.00, sell=0.00 → real_cost=0.15
  </behavior>
  <action>
    tests/test_fees.py 파일을 다음 내용으로 생성한다 (D-02, D-03):

    ```python
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
    ```
  </action>
  <verify>
    <automated>cd "C:\Users\godpierland\OneDrive\Antigravity\ETF비교사이트" && python -m pytest tests/test_fees.py -v</automated>
  </verify>
  <acceptance_criteria>
    - tests/test_fees.py 파일이 존재한다
    - `from etl_process import p_float` 행이 존재한다 (grep "from etl_process import p_float" tests/test_fees.py)
    - `class TestPFloat` 정의가 존재한다
    - `class TestRealCostCalculation` 정의가 존재한다
    - `pytest tests/test_fees.py -v` 실행 시 모든 테스트 PASSED, exit code 0
    - PASSED 테스트 수 7개 이상 (TestPFloat 7개 + TestRealCostCalculation 4개 = 11개)
  </acceptance_criteria>
  <done>pytest tests/test_fees.py -v 실행 시 11개 이상 테스트 모두 PASSED, TEST-01 요구사항 충족</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| test input → p_float() | 테스트 코드에서 고정 리터럴 입력 — 신뢰 경계 없음 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04B-01 | Tampering | p_float() 이동으로 process_data() 동작 변경 | mitigate | Task 1 acceptance_criteria에 process_data 내부 중첩 함수 삭제 확인 포함, 이동 후 동일 동작 검증 |
| T-04B-02 | Information Disclosure | 없음 — 순수 계산 로직, 외부 데이터 없음 | accept | 테스트는 하드코딩 값만 사용 |
</threat_model>

<verification>
- `grep -n "^def p_float" etl_process.py` → `218:def p_float(v):` (process_data 위의 줄 번호)
- `python -c "from etl_process import p_float; print(p_float('0.05%'))"` → `0.05`
- `python -m pytest tests/test_fees.py -v` → 11개 이상 PASSED, exit 0
</verification>

<success_criteria>
- etl_process.py에 모듈 수준 p_float() 정의 존재 (process_data() 위)
- process_data() 내부 중첩 p_float 정의 삭제됨
- tests/test_fees.py에 TestPFloat (7개), TestRealCostCalculation (4개) 테스트 존재
- pytest tests/test_fees.py 전체 통과
- TEST-01 요구사항 (ETL 수수료 계산 로직 단위 테스트) 충족
</success_criteria>

<output>
완료 후 `.planning/phases/04-etl-단위-테스트/04-B-SUMMARY.md` 생성
</output>
