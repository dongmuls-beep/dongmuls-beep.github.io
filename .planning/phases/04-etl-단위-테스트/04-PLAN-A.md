---
phase: 04-etl-단위-테스트
plan: A
type: execute
wave: 1
depends_on: []
files_modified:
  - requirements.txt
  - .github/workflows/daily_update.yml
  - tests/__init__.py
  - tests/conftest.py
autonomous: true
requirements:
  - TEST-01
  - TEST-02
  - TEST-03

must_haves:
  truths:
    - "pytest tests/ 명령이 로컬에서 실행 가능하다"
    - "conftest.py에 primary fixture와 fallback fixture 두 종류가 정의되어 있다"
    - "primary fixture는 4행(index=3)에 합계(A) + 표준코드 헤더를 가진 실제 Excel 파일을 생성한다"
    - "fallback fixture는 합계(A) 없이 매매·수수료 컬럼만 있는 Excel 파일을 생성한다"
    - "CI daily_update.yml에서 pytest 단계가 ETL 실행 단계보다 앞에 위치한다"
    - "requirements.txt에 pytest가 포함되어 있다"
  artifacts:
    - path: "requirements.txt"
      provides: "pytest 의존성 선언"
      contains: "pytest"
    - path: ".github/workflows/daily_update.yml"
      provides: "CI pytest 단계"
      contains: "pytest tests/"
    - path: "tests/conftest.py"
      provides: "openpyxl Excel fixture 2종 + managed_df fixture"
      exports: ["kofia_primary_xlsx", "kofia_fallback_xlsx", "managed_df_primary"]
    - path: "tests/__init__.py"
      provides: "tests 패키지 마커"
  key_links:
    - from: "tests/conftest.py"
      to: "etl_process.py:process_data()"
      via: "kofia_primary_xlsx/kofia_fallback_xlsx fixture → tmp_path 임시 파일"
      pattern: "tmp_path"
    - from: ".github/workflows/daily_update.yml"
      to: "pytest tests/"
      via: "Run pytest step before Run ETL Script step"
      pattern: "pytest tests/"
---

<objective>
테스트 환경 기반 구성 — pytest 의존성, tests/ 디렉토리, openpyxl Excel fixture, CI 통합.

Purpose: PLAN-B와 PLAN-C의 모든 테스트가 공통으로 의존하는 fixture와 환경을 선행 구성한다.
Output:
- requirements.txt에 pytest 추가
- tests/__init__.py (빈 패키지 마커)
- tests/conftest.py (primary/fallback Excel fixture + managed_df fixture)
- .github/workflows/daily_update.yml (pytest 단계 삽입)
</objective>

<execution_context>
@C:\Users\godpierland\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\godpierland\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-etl-단위-테스트/04-CONTEXT.md

<interfaces>
<!-- etl_process.py에서 추출한 핵심 구조 — executor가 fixture를 설계할 때 필요 -->

process_data(managed_df, file_path) 입력 형식:
  - managed_df: pd.DataFrame — 컬럼: [구분, 종목코드, 종목명, 표준코드, 펀드명]
  - file_path: str — .xlsx 파일 경로 (pd.read_excel로 직접 읽음)

헤더 감지 로직 (etl_process.py line 236-253):
  - Primary: row_str에 '(A)'와 '합계' 모두 포함되면 header_idx = i
  - Fallback: '매매'와 '수수료' 모두 포함된 셀이 있으면 header_idx = i
  - KOFIA 표준 구조: 상위 3행 메타데이터, 4번째 행(index=3)이 헤더

컬럼 매핑 (etl_process.py line 292-295):
  - c_code_std: '표준코드' 포함 컬럼
  - c_total: '합계'+'(A)' 포함 컬럼 (또는 '총보수')
  - c_other: '기타'+'비용' 포함 컬럼
  - c_sell: '매매'+'수수료' 포함 컬럼

validate_etl_results(results, prev_data) 입력 형식:
  - results: List[dict] — 각 항목: {구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용}
  - prev_data: List[dict] | None — 이전 data.json 구조와 동일

get_mock_managed_items() 반환값 (fallback):
  [
    {'구분': '국내주식형', '종목코드': '360750', '종목명': 'TIGER 미국S&P500',
     '표준코드': 'KR7360750004', '펀드명': '미래에셋 TIGER 미국S&P500...'},
    {'구분': '국내주식형', '종목코드': '133690', '종목명': 'TIGER 미국나스닥100',
     '표준코드': 'KR7133690008', '펀드명': '미래에셋 TIGER 미국나스닥100...'},
  ]
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: requirements.txt에 pytest 추가 + CI 파이프라인 수정</name>
  <read_first>
    - requirements.txt (현재 내용 확인 — pytest 없음 검증)
    - .github/workflows/daily_update.yml (현재 단계 순서 확인)
  </read_first>
  <files>requirements.txt, .github/workflows/daily_update.yml</files>
  <action>
    **requirements.txt 수정 (D-12):**
    현재 파일 맨 아래에 `pytest` 한 줄 추가. 다른 항목은 변경하지 않는다.
    결과:
    ```
    pandas
    requests
    openpyxl
    beautifulsoup4
    lxml
    selenium
    webdriver-manager
    xlrd
    yfinance
    pytest
    ```

    **daily_update.yml 수정 (D-10, D-11):**

    1. "Install dependencies" 단계를 `pip install -r requirements.txt`로 교체:
    ```yaml
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    ```

    2. "Run ETL Script" 단계 **바로 앞**에 새 pytest 단계 삽입:
    ```yaml
    - name: Run unit tests
      run: pytest tests/ -v

    - name: Run ETL Script
      env:
        GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }}
      run: python etl_process.py
    ```

    주의: "Run unit tests" 단계가 "Run ETL Script" 단계보다 반드시 앞에 위치해야 한다.
    단계 실패 시 GitHub Actions가 이후 단계를 자동으로 건너뛰므로 별도 조건 불필요 (D-11).
  </action>
  <verify>
    <automated>
      grep "pytest" requirements.txt
      grep -A2 "Run unit tests" .github/workflows/daily_update.yml
      grep "pip install -r requirements.txt" .github/workflows/daily_update.yml
    </automated>
  </verify>
  <acceptance_criteria>
    - requirements.txt에 `pytest` 행이 존재한다 (grep "^pytest$" requirements.txt 성공)
    - daily_update.yml에 `pip install -r requirements.txt` 행이 존재한다
    - daily_update.yml에 `pytest tests/ -v` 행이 존재한다
    - daily_update.yml 파일에서 `Run unit tests` 단계가 `Run ETL Script` 단계보다 앞(낮은 줄 번호)에 위치한다
    - daily_update.yml에 `pip install pandas selenium webdriver-manager requests openpyxl xlrd` 형태의 직접 pip install 행이 더 이상 존재하지 않는다
  </acceptance_criteria>
  <done>requirements.txt에 pytest 포함, CI가 -r requirements.txt로 설치하고, pytest 단계가 ETL 단계 앞에 배치됨</done>
</task>

<task type="auto">
  <name>Task 2: tests/ 디렉토리 생성 및 conftest.py 작성</name>
  <read_first>
    - .planning/phases/04-etl-단위-테스트/04-CONTEXT.md (D-04, D-05, D-06 결정 확인)
    - etl_process.py line 218-260 (process_data 헤더 감지 로직 — fixture 구조 설계 기준)
    - etl_process.py line 197-216 (get_mock_managed_items — managed_df 구조 기준)
  </read_first>
  <files>tests/__init__.py, tests/conftest.py</files>
  <action>
    **tests/__init__.py:**
    빈 파일 생성 (Python 패키지 마커).

    **tests/conftest.py:**
    다음 세 개의 fixture를 정의한다. openpyxl과 tmp_path를 사용한다 (D-04).

    ```python
    import pytest
    import openpyxl
    import pandas as pd


    @pytest.fixture
    def kofia_primary_xlsx(tmp_path):
        """
        Primary fixture: KOFIA 표준 구조.
        - 상위 3행: 메타데이터 (빈 행 또는 임의 텍스트)
        - 4행(index=3): 헤더 — '합계(A)', '표준코드' 포함 (D-05)
        - 5~7행(index=4~6): 데이터 3개 (D-06)
          - index=4: KR7360750004 → 총보수 0.07%, 기타비용 0.01%, 매매수수료 0.02%
          - index=5: KR7133690008 → 총보수 0.12%, 기타비용 0.02%, 매매수수료 0.01%
          - index=6: KR9999999999 → 매칭 안 되는 더미 행
        """
        wb = openpyxl.Workbook()
        ws = wb.active

        # 메타데이터 행 (row 1~3)
        ws.append(["KOFIA 펀드 보수·비용 현황", None, None, None, None])
        ws.append(["기준일: 2026-05-01", None, None, None, None])
        ws.append([None, None, None, None, None])

        # 헤더 행 (row 4, index=3) — '합계(A)'와 '표준코드' 포함 (primary 감지 조건)
        ws.append(["표준코드", "펀드명", "합계(A)", "기타비용(B)", "매매·중개수수료율(D)"])

        # 데이터 행 (row 5~7)
        ws.append(["KR7360750004", "미래에셋 TIGER 미국S&P500", "0.07", "0.01", "0.02"])
        ws.append(["KR7133690008", "미래에셋 TIGER 미국나스닥100", "0.12", "0.02", "0.01"])
        ws.append(["KR9999999999", "더미펀드", "0.50", "0.05", "0.03"])

        path = tmp_path / "kofia_primary.xlsx"
        wb.save(str(path))
        return str(path)


    @pytest.fixture
    def kofia_fallback_xlsx(tmp_path):
        """
        Fallback fixture: '합계(A)' 없이 '매매·수수료' 포함 헤더 (D-05 fallback 검증).
        - 상위 3행: 메타데이터
        - 4행(index=3): 헤더 — '합계(A)' 없음, '매매수수료' 포함
        - 5~6행(index=4~5): 데이터 2개 (D-06)
        """
        wb = openpyxl.Workbook()
        ws = wb.active

        # 메타데이터 행 (row 1~3)
        ws.append(["KOFIA 펀드 보수·비용 현황 (구형식)", None, None, None, None])
        ws.append(["기준일: 2026-05-01", None, None, None, None])
        ws.append([None, None, None, None, None])

        # 헤더 행 (row 4) — '합계(A)' 없고 '매매수수료' 포함 (fallback 감지 조건)
        ws.append(["표준코드", "펀드명", "총보수", "기타비용", "매매수수료율"])

        # 데이터 행 (row 5~6)
        ws.append(["KR7360750004", "미래에셋 TIGER 미국S&P500", "0.07", "0.01", "0.02"])
        ws.append(["KR7133690008", "미래에셋 TIGER 미국나스닥100", "0.12", "0.02", "0.01"])

        path = tmp_path / "kofia_fallback.xlsx"
        wb.save(str(path))
        return str(path)


    @pytest.fixture
    def managed_df_primary():
        """
        process_data() 테스트용 managed_df.
        primary fixture의 KR7360750004, KR7133690008과 매칭되고,
        KR9999999999은 매칭 안 되도록 설계.
        """
        return pd.DataFrame([
            {
                '구분': '국내주식형',
                '종목코드': '360750',
                '종목명': 'TIGER 미국S&P500',
                '표준코드': 'KR7360750004',
                '펀드명': '미래에셋 TIGER 미국S&P500증권상장지수투자신탁(주식)',
            },
            {
                '구분': '국내주식형',
                '종목코드': '133690',
                '종목명': 'TIGER 미국나스닥100',
                '표준코드': 'KR7133690008',
                '펀드명': '미래에셋 TIGER 미국나스닥100증권상장지수투자신탁(주식)',
            },
        ])
    ```

    주의사항:
    - openpyxl.Workbook() 생성 후 ws.append()로 행을 추가한다. 헤더 행의 문자열이 etl_process.py의 컬럼 감지 조건과 정확히 일치해야 한다.
    - primary fixture 헤더: '합계(A)' 문자열은 `any('(A)' in s for s in row_str) and any('합계' in s for s in row_str)` 조건을 만족해야 한다.
    - fallback fixture 헤더: '매매수수료율' 문자열은 `any('매매' in s and '수수료' in s for s in row_str)` 조건을 만족해야 한다.
  </action>
  <verify>
    <automated>cd "C:\Users\godpierland\OneDrive\Antigravity\ETF비교사이트" && python -c "import pytest; import openpyxl; print('imports OK')"</automated>
  </verify>
  <acceptance_criteria>
    - tests/__init__.py 파일이 존재한다 (빈 파일 또는 최소 0바이트)
    - tests/conftest.py 파일이 존재한다
    - conftest.py에 `kofia_primary_xlsx` fixture 정의가 존재한다 (grep "def kofia_primary_xlsx" tests/conftest.py)
    - conftest.py에 `kofia_fallback_xlsx` fixture 정의가 존재한다 (grep "def kofia_fallback_xlsx" tests/conftest.py)
    - conftest.py에 `managed_df_primary` fixture 정의가 존재한다 (grep "def managed_df_primary" tests/conftest.py)
    - conftest.py에 `합계(A)` 문자열이 포함된다 (primary fixture 헤더 검증)
    - conftest.py에 `매매수수료율` 문자열이 포함된다 (fallback fixture 헤더 검증)
    - conftest.py에 `KR7360750004`와 `KR7133690008` 표준코드가 포함된다
    - `python -m pytest tests/ --collect-only` 실행 시 에러 없이 완료된다 (테스트 파일 없어도 conftest 로드 확인)
  </acceptance_criteria>
  <done>tests/ 디렉토리에 __init__.py와 conftest.py 존재, conftest.py에 3개 fixture 정의, pytest --collect-only 에러 없음</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CI 환경 → pytest | GitHub Actions에서 테스트 실행 — 외부 입력 없음, 신뢰 경계 없음 |
| conftest.py fixture → tmp_path | pytest tmp_path 사용으로 시스템 temp 디렉토리에 파일 생성 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04A-01 | Tampering | conftest.py fixture Excel 파일 | accept | tmp_path는 테스트별 격리 디렉토리, 테스트 종료 후 자동 삭제 |
| T-04A-02 | Denial of Service | CI pytest 단계 실패 시 ETL 중단 | accept | 설계 의도 — 테스트 실패 시 ETL 자동 차단이 요구사항 (D-11) |
</threat_model>

<verification>
- `grep "^pytest$" requirements.txt` → 출력: `pytest`
- `grep "pip install -r requirements.txt" .github/workflows/daily_update.yml` → 성공
- `grep "pytest tests/ -v" .github/workflows/daily_update.yml` → 성공
- `grep "def kofia_primary_xlsx\|def kofia_fallback_xlsx\|def managed_df_primary" tests/conftest.py` → 3줄 출력
- `python -m pytest tests/ --collect-only` → 에러 없이 완료
</verification>

<success_criteria>
- requirements.txt에 pytest 포함
- tests/__init__.py 존재 (빈 파일)
- tests/conftest.py에 primary fixture, fallback fixture, managed_df fixture 3개 정의
- daily_update.yml: pip install -r requirements.txt 사용, Run unit tests 단계가 Run ETL Script 단계 앞에 위치
- pytest --collect-only 에러 없음 (conftest.py 로드 정상)
</success_criteria>

<output>
완료 후 `.planning/phases/04-etl-단위-테스트/04-A-SUMMARY.md` 생성
</output>
