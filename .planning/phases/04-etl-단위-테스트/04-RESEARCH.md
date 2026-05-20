# Phase 4: ETL 단위 테스트 - Research

**Researched:** 2026-05-20
**Domain:** Python pytest / openpyxl Excel fixture / CI 통합
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `p_float(v)`를 `process_data()` 내부 중첩 함수에서 **모듈 수준 함수로 추출**. `from etl_process import p_float` 가능해짐. 최소 리팩토링 — 함수 위치만 이동, 동작 변경 없음.
- **D-02:** 실부담비용 계산 로직(`ter = total + other`, `real_cost = ter + sell`)도 별도 단위 테스트 작성 (TEST-01 완전 충족).
- **D-03:** 테스트 케이스 범위: 정상값 + 엣지 케이스 모두 커버 — `"0.05%"`, `"1,234"`, `None`, `""`, `"N/A"` → 0.0 반환 검증.
- **D-04:** openpyxl로 코드에서 fixture 생성 — `tests/conftest.py`에 pytest fixture로 정의, `tmp_path` 활용. 실제 KOFIA 파일 코드베이스 보관 없음.
- **D-05:** fixture 2종류:
  - **주 전략 fixture**: 상위 3행 메타, 4행이 `합계(A)` + `표준코드` 포함 헤더 (`header_idx = 3`)
  - **fallback fixture**: 헤더 행에 `합계(A)` 없고 `매매·수수료` 포함 (`header_idx` fallback 검증용)
- **D-06:** 각 fixture에 데이터 행 2~3개 포함 (매칭 성공 + 미매칭 시나리오 포함).
- **D-07:** Phase 4 테스트 범위에 `validate_etl_results()` 포함 — Phase 2에서 순수 함수로 설계됨, 직접 import 테스트 가능.
- **D-08:** 커버리지: DATA-01/02/03 정상 케이스(경고 없음) + 각 경고 케이스 1개씩.
- **D-09:** 경고 확인 방법은 Claude 재량 — `capsys` 또는 `unittest.mock.patch('builtins.print')` 중 선택.
- **D-10:** `.github/workflows/daily_update.yml`에 pytest 단계 추가. ETL 실행 단계 **앞에** 배치.
- **D-11:** 테스트 실패 시 ETL 중단 — 단계 순서 배치로 자동 보장 (별도 조건 불필요).
- **D-12:** `requirements.txt`에 `pytest` 추가.

### Claude's Discretion

- `validate_etl_results()` 경고 출력 확인 방법: `capsys` vs `mock.patch('builtins.print')` — 구현 시 판단.
- `tests/` 디렉토리 내 파일 구조 (예: `test_p_float.py` vs `test_etl.py` 통합 파일) — 구현 시 판단.
- `conftest.py`의 fixture 재사용 범위 — 구현 시 판단.

### Deferred Ideas (OUT OF SCOPE)

- **E2E / 브라우저 테스트**: v2 REQUIREMENTS.md에 Playwright 평가 예정.
- **Selenium 다운로드 테스트**: 외부 의존성 높음 — 별도 integration 테스트 phase로.
- **JavaScript 단위 테스트** (script.js): 바닐라 JS, 빌드 과정 없음 — 별도 phase 필요.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | ETL 수수료 계산 로직 단위 테스트가 존재한다 | p_float() 모듈 추출 후 직접 import 테스트 가능. ter/real_cost 계산도 동일 테스트 파일에서 검증. |
| TEST-02 | ETL 헤더 감지 로직 단위 테스트가 존재한다 | openpyxl로 주 전략(합계(A)) + fallback(매매·수수료) fixture 생성 후 process_data() 호출. header_idx 값으로 감지 경로 검증. |
| TEST-03 | 데이터 매칭(표준코드 기준) 단위 테스트가 존재한다 | fixture에 매칭 성공 행 + 미매칭 행 포함. process_data() 반환값의 종목코드 목록으로 검증. |
</phase_requirements>

---

## Summary

Phase 4는 신규 테스트 인프라를 처음부터 구축하는 작업이다. 현재 `etl_process.py`에는 pytest가 없고 `tests/` 디렉토리도 존재하지 않는다 [VERIFIED: 프로젝트 파일 시스템 직접 확인]. 세 가지 핵심 작업이 필요하다: (1) `p_float()` 함수를 중첩 함수에서 모듈 수준으로 이동, (2) openpyxl로 KOFIA 형식 Excel 파일을 생성하는 pytest fixture 작성, (3) GitHub Actions 워크플로우에 pytest 단계 추가.

`p_float()` 이동은 단순 위치 이동이다 — line 330의 `def p_float(v):` 블록을 `process_data()` 정의 바깥, 모듈 최상단으로 옮기면 된다. 함수 본문(`str(v).replace(',', '').replace('%', '')`)은 변경 없음. `process_data()` 내부의 기존 호출자(`total = p_float(...)`)들은 모듈 수준 함수를 자동으로 참조하므로 추가 수정 불필요.

`validate_etl_results(results, prev_data)`는 Phase 2에서 이미 순수 함수로 설계되어 있어 (파일 I/O 없음, 반환값 None, print로만 경고 출력) 테스트가 간단하다. `capsys` fixture를 사용하면 `print()` 출력을 `readouterr().out`으로 캡처하여 `[WARNING] DATA-0N:` 문자열 포함 여부를 assert로 검증할 수 있다.

**Primary recommendation:** Wave 1 — 환경 구성 + p_float 이동. Wave 2 — 수수료 계산 테스트. Wave 3 — Excel fixture + 헤더/매칭 테스트 + CI 통합. 모두 독립적이므로 Wave 1 완료 후 Wave 2/3 병렬 가능.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| p_float() 단위 테스트 | Python 모듈 | — | 순수 함수, 외부 의존성 없음 |
| 수수료 계산 (ter, real_cost) 테스트 | Python 모듈 | — | 산술 로직만, 파일 I/O 없음 |
| 헤더 감지 테스트 | Python ETL (process_data) | 파일 시스템 (tmp_path) | process_data()가 file_path 문자열 요구 — 실제 임시 파일 필요 |
| 데이터 매칭 테스트 | Python ETL (process_data) | 파일 시스템 (tmp_path) | 동일 — process_data() 입력이 DataFrame + file_path |
| validate_etl_results() 테스트 | Python 모듈 | — | 순수 함수, 직접 import 가능 |
| CI pytest 단계 | GitHub Actions | — | daily_update.yml에 step 추가 |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pytest | 9.0.3 | 테스트 프레임워크 | Python 생태계 표준. `tmp_path`, `capsys` 내장 fixture 포함. [VERIFIED: pip index versions pytest] |
| openpyxl | 3.1.5 | Excel fixture 생성 | 이미 requirements.txt에 포함. pandas의 `.xlsx` 읽기도 openpyxl 엔진 사용. [VERIFIED: 프로젝트 requirements.txt] |
| pandas | (이미 설치) | process_data() 내부 사용 | ETL 코드가 이미 의존 — 테스트 시 별도 설치 불필요. [VERIFIED: requirements.txt] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unittest.mock | stdlib | builtins.print mock | capsys 대신 선택 시 (D-09 재량). Python 표준 라이브러리 포함. [VERIFIED: Python 표준 라이브러리] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pytest | unittest | pytest가 fixture 시스템, 더 간결한 assert, 더 나은 출력 제공. D-12 이미 pytest로 결정됨. |
| openpyxl fixture | 실제 KOFIA 파일 | 실제 파일은 저작권·형식 변경 위험. D-04 이미 openpyxl fixture로 결정됨. |
| capsys | mock.patch('builtins.print') | capsys가 pytest 네이티브로 더 간결. mock은 call_args 검사에 유리. |

**Installation:**
```bash
pip install pytest
```

(`openpyxl`, `pandas`는 이미 requirements.txt에 포함)

**Version verification:**
```
pytest: 9.0.3 (최신) [VERIFIED: pip index versions pytest, 2026-05-20]
openpyxl: 3.1.5 (최신) [VERIFIED: pip index versions openpyxl, 2026-05-20]
```

---

## Architecture Patterns

### System Architecture Diagram

```
[conftest.py]
    |-- kofia_excel_primary fixture  ──→ openpyxl 생성 → tmp_path/*.xlsx (합계(A) 헤더)
    |-- kofia_excel_fallback fixture ──→ openpyxl 생성 → tmp_path/*.xlsx (매매·수수료 헤더)
    |-- managed_df fixture           ──→ pd.DataFrame (표준코드 포함 2~3행)
         |
         ↓
[test_etl.py 또는 분리 파일]
    |-- test_p_float_*()             ──→ from etl_process import p_float → assert
    |-- test_fee_calculation_*()     ──→ ter/real_cost 산술 assert
    |-- test_header_detection_*()    ──→ process_data(managed_df, primary_path) → 반환값 검증
    |-- test_header_fallback_*()     ──→ process_data(managed_df, fallback_path) → 반환값 검증
    |-- test_validate_*()            ──→ validate_etl_results(results, prev_data) → capsys 검증
         |
         ↓
[daily_update.yml]
    Step 1: Install dependencies (pytest 포함)
    Step 2: Run pytest tests/            ← ETL 실행 전 삽입
    Step 3: Run ETL Script               ← 테스트 실패 시 여기 도달 안 함
```

### Recommended Project Structure

```
tests/
├── conftest.py          # openpyxl fixture 정의 (primary + fallback + managed_df)
├── test_p_float.py      # p_float() 단위 테스트 (TEST-01 일부)
├── test_fee_calc.py     # ter/real_cost 계산 테스트 (TEST-01 나머지)
├── test_process_data.py # 헤더 감지 + 데이터 매칭 테스트 (TEST-02, TEST-03)
└── test_validate.py     # validate_etl_results() 테스트 (DATA-01/02/03)
```

> 대안: `test_etl.py` 단일 파일로 통합 — Claude 재량(D-09).

### Pattern 1: p_float() 모듈 수준 추출

**What:** `process_data()` for 루프 내부에 중첩 정의된 `p_float()`를 모듈 최상단으로 이동.

**When to use:** `from etl_process import p_float` import가 필요한 경우.

**현재 코드 위치 (변경 전):**
```python
# etl_process.py, line 330 — process_data() 내부 for 루프 안
def p_float(v):
    try:
        return float(str(v).replace(',', '').replace('%', ''))
    except (ValueError, TypeError, AttributeError):
        return 0.0
```
[VERIFIED: etl_process.py line 330 직접 확인]

**이동 후 위치:**
```python
# etl_process.py — 모듈 수준, process_data() 정의 직전 또는 상단 import 블록 아래
def p_float(v):
    try:
        return float(str(v).replace(',', '').replace('%', ''))
    except (ValueError, TypeError, AttributeError):
        return 0.0

def process_data(managed_df, file_path):
    ...
    # line 345: total = p_float(row.get(col_total, 0)) if col_total else 0
    # (변경 없음 — 이미 p_float를 이름으로 참조)
```

**주의:** `p_float`은 for 루프 안에서 매 반복마다 재정의되지만 Python은 이를 허용한다. 모듈 수준으로 이동 후에도 `process_data()` 내부 호출(`p_float(row.get(...))`)은 모듈 수준 함수를 참조하므로 동작 동일.

### Pattern 2: openpyxl로 KOFIA 형식 Excel fixture 생성

**What:** `conftest.py`에서 pytest fixture가 openpyxl로 임시 Excel 파일 생성.

**When to use:** `process_data()`에 전달할 KOFIA 형식 파일이 필요한 테스트.

```python
# Source: docs.pytest.org/en/stable/how-to/tmp_path.html + openpyxl 공식 문서
# tests/conftest.py

import pytest
import pandas as pd
from openpyxl import Workbook

@pytest.fixture
def kofia_excel_primary(tmp_path):
    """
    주 전략 fixture: 상위 3행 메타, 4행(index 3)에 합계(A) + 표준코드 헤더.
    header_idx = 3 경로를 테스트.
    """
    wb = Workbook()
    ws = wb.active

    # 행 1~3: 메타데이터 (ETL 코드가 head(10) 중 합계(A) 검색)
    ws.append(["KOFIA 펀드별 보수비용비교"])
    ws.append(["기준일: 2026-01-31"])
    ws.append(["(단위: %)"])

    # 행 4(index 3): 헤더 행 — 합계(A) + 표준코드 포함
    ws.append(["표준코드", "펀드명", "합계(A)", "기타비용(B)", "매매·수수료율(D)"])

    # 데이터 행: 매칭 성공 케이스
    ws.append(["KR7360750004", "TIGER 미국S&P500증권상장지수투자신탁", "0.07", "0.0001", "0.0050"])
    # 데이터 행: 매칭 실패 케이스 (managed_df에 없는 표준코드)
    ws.append(["KR7999999999", "존재하지않는ETF", "0.10", "0.0000", "0.0000"])

    path = tmp_path / "kofia_primary.xlsx"
    wb.save(str(path))
    return str(path)


@pytest.fixture
def kofia_excel_fallback(tmp_path):
    """
    Fallback fixture: 합계(A) 없음, 매매·수수료만 있는 헤더.
    header_idx fallback 경로(line 244-249)를 테스트.
    """
    wb = Workbook()
    ws = wb.active

    # 행 1~3: 메타데이터
    ws.append(["KOFIA 펀드별 보수비용비교"])
    ws.append(["기준일: 2026-01-31"])
    ws.append(["(단위: %)"])

    # 행 4(index 3): 합계(A) 없는 헤더 — 매매·수수료만 포함
    ws.append(["표준코드", "펀드명", "총보수", "기타비용", "매매·수수료"])

    # 데이터 행
    ws.append(["KR7360750004", "TIGER 미국S&P500증권상장지수투자신탁", "0.07", "0.0001", "0.0050"])

    path = tmp_path / "kofia_fallback.xlsx"
    wb.save(str(path))
    return str(path)


@pytest.fixture
def managed_df():
    """
    process_data()의 첫 번째 인수 — 관리 종목 DataFrame.
    get_mock_managed_items() 반환값과 동일 구조.
    """
    return pd.DataFrame([
        {
            '구분': '국내주식형',
            '종목코드': '360750',
            '종목명': 'TIGER 미국S&P500',
            '표준코드': 'KR7360750004',
            '펀드명': 'TIGER 미국S&P500증권상장지수투자신탁',
        },
    ])
```
[VERIFIED: tmp_path 패턴 — docs.pytest.org; openpyxl Workbook.save — openpyxl 공식 문서]

### Pattern 3: capsys로 print 출력 검증

**What:** `validate_etl_results()`의 `print()` 경고 출력을 `capsys.readouterr().out`으로 검증.

**When to use:** 반환값이 `None`인 함수의 side-effect(print)를 테스트할 때.

```python
# Source: docs.pytest.org/en/stable/reference/fixtures.html#capsys [VERIFIED]
# tests/test_validate.py

from etl_process import validate_etl_results

def test_data01_warning_when_cost_exceeds_5pct(capsys):
    results = [
        {'종목코드': '360750', '종목명': 'TIGER 미국S&P500', '실부담비용': 6.0}
    ]
    validate_etl_results(results, prev_data=None)
    captured = capsys.readouterr()
    assert "[WARNING] DATA-01:" in captured.out

def test_no_warning_when_all_valid(capsys):
    results = [
        {'종목코드': '360750', '종목명': 'TIGER 미국S&P500', '실부담비용': 0.07}
    ]
    validate_etl_results(results, prev_data=None)
    captured = capsys.readouterr()
    assert "[WARNING]" not in captured.out
```

### Pattern 4: daily_update.yml pytest 단계 삽입

**What:** ETL 실행 전에 pytest를 실행하여 테스트 실패 시 ETL 자동 중단.

**현재 yml 구조** (변경 전):
```yaml
- name: Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install pandas selenium webdriver-manager requests openpyxl xlrd

- name: Run ETL Script
  ...
```

**변경 후:**
```yaml
- name: Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install -r requirements.txt   # pytest 포함됨

- name: Run unit tests         # ← 새 단계 (ETL 앞에)
  run: pytest tests/ -v

- name: Run ETL Script         # ← 테스트 실패 시 여기 도달 안 함
  ...
```

> **주의:** 현재 yml은 `pip install -r requirements.txt`가 아닌 패키지 직접 나열. `requirements.txt`에 pytest 추가 후 yml도 `-r requirements.txt`로 전환하면 일관성 확보 (D-12).

[VERIFIED: .github/workflows/daily_update.yml 직접 확인]

### Anti-Patterns to Avoid

- **실제 KOFIA Excel 파일 커밋:** 저작권 문제 + 형식 변경 시 fixture가 구식화됨. D-04 결정대로 openpyxl로 코드 생성.
- **p_float를 이동하지 않고 중첩 함수 테스트 시도:** Python은 중첩 함수를 외부에서 import할 수 없음. `from etl_process import p_float`는 `p_float`가 모듈 수준에 있어야 동작.
- **BytesIO로 process_data() 우회:** `process_data()`가 내부에서 `pd.read_excel(file_path, ...)`를 문자열 경로로 호출. BytesIO는 현재 코드와 호환되지 않음 (D-04 코드 컨텍스트 참조).
- **Selenium 의존 코드를 테스트에 포함:** `download_kofia_excel()`은 Selenium이 필요 — Phase 4 범위 외. 테스트 대상을 `process_data()`, `p_float()`, `validate_etl_results()`로 한정.
- **테스트에서 GAS_WEB_APP_URL 환경변수 요구:** `process_data()`와 `validate_etl_results()`는 네트워크 없이 동작. `fetch_managed_items()` 대신 `managed_df` fixture를 직접 전달.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 임시 Excel 파일 경로 관리 | `tempfile.mkstemp()` 수동 관리 | `tmp_path` pytest fixture | 테스트 후 자동 정리, 경쟁 조건 없음 |
| stdout 캡처 | `sys.stdout` 리다이렉션 | `capsys` pytest fixture | 스레드 안전, 자동 복원 |
| Excel 파일 생성 | 수동 바이너리 작성 | openpyxl Workbook | KOFIA 형식 정확히 재현 가능 |
| print mock | `print = lambda *a: None` | `capsys` 또는 `mock.patch` | 격리 보장, assert 가능 |

**Key insight:** pytest 내장 fixture(`tmp_path`, `capsys`)가 테스트 격리와 정리를 자동으로 처리한다. 수동 구현은 레이스 컨디션과 파일 잔재를 남긴다.

---

## Common Pitfalls

### Pitfall 1: p_float 중첩 함수 — import 불가

**What goes wrong:** `from etl_process import p_float`가 `ImportError` 발생.

**Why it happens:** Python에서 중첩 함수(다른 함수 내부에 정의된 `def`)는 모듈의 네임스페이스에 등록되지 않는다. 현재 `p_float`는 `process_data()` 내부 for 루프에 정의되어 있어 (line 330) import 불가.

**How to avoid:** D-01 결정대로 — `p_float` 블록을 `process_data()` 정의 **위로** 이동. `process_data()` 내부 호출자는 수정 불필요 (Python 스코프 체인으로 모듈 수준 함수 참조).

**Warning signs:** `pytest`에서 `ImportError: cannot import name 'p_float' from 'etl_process'`.

### Pitfall 2: process_data()가 __main__ 블록의 환경 변수를 검사함

**What goes wrong:** `process_data()`를 직접 import해서 호출할 때 `GAS_WEB_APP_URL` 체크로 `sys.exit(1)` 발생.

**Why it happens:** `__name__ == "__main__"` 블록에 `if not GAS_WEB_APP_URL: sys.exit(1)` 가드가 있다 (line 561-565). 하지만 이는 `if __name__ == "__main__":` 내부이므로 **import 시에는 실행되지 않는다.**

**How to avoid:** `from etl_process import process_data, validate_etl_results, p_float` — 정상 동작. `__main__` 블록은 직접 실행 시에만 동작.

**Warning signs:** 없음 — 이 pitfall은 실제로 문제가 되지 않는다. 문서화 목적으로 포함.

### Pitfall 3: openpyxl로 쓴 파일을 pandas가 읽을 때 컬럼명 불일치

**What goes wrong:** `process_data()`에서 `next((c for c in df.columns if '합계' in c and '(A)' in c), None)`이 `None` 반환 → `ValueError: KOFIA Excel 필수 컬럼 누락` 발생.

**Why it happens:** openpyxl로 작성한 헤더 문자열과 코드의 컬럼 감지 조건(`'합계' in c and '(A)' in c`)이 정확히 일치해야 한다. 공백, 특수문자(·, ×) 인코딩 차이로 감지 실패 가능.

**How to avoid:** fixture에서 컬럼명을 코드의 감지 로직과 역방향으로 설계:
- 코드가 `'합계' in c and '(A)' in c`를 검사 → fixture 헤더: `"합계(A)"` (공백 없음)
- 코드가 `'매매' in c and '수수료' in c`를 검사 → fixture 헤더: `"매매·수수료"` (가운데 점 U+00B7)
- 코드가 `'표준코드' in c`를 검사 → fixture 헤더: `"표준코드"` (변환 없음)

**Warning signs:** `ValueError: KOFIA Excel 필수 컬럼 누락` with `header_idx=3` — fixture 헤더 문자열 재확인.

### Pitfall 4: process_data() 반환값이 빈 리스트인데 헤더 감지 실패로 오해

**What goes wrong:** 테스트에서 `process_data()` 반환값이 `[]`이지만 이유를 알 수 없음.

**Why it happens:** 두 가지 이유로 빈 리스트 반환:
1. `managed_df`의 `표준코드`가 KOFIA fixture의 `표준코드` 컬럼 값과 불일치 (매칭 실패)
2. `ValueError` 발생 후 caller에서 catch (컬럼 누락)

**How to avoid:** fixture의 데이터 행 `표준코드` 값과 `managed_df` fixture의 `표준코드` 값을 정확히 일치시킨다. 예: fixture 데이터 행 `"KR7360750004"` ↔ managed_df `'표준코드': 'KR7360750004'`.

**Warning signs:** `[MISSING] TIGER 미국S&P500 (Std: KR7360750004) - Not found in KOFIA data` print 출력.

### Pitfall 5: daily_update.yml에서 pytest가 Selenium 테스트를 시도

**What goes wrong:** CI에서 pytest가 `download_kofia_excel()` 관련 코드를 실행하려다 ChromeDriver 없음으로 실패.

**Why it happens:** `tests/` 디렉토리의 모든 `test_*.py`를 pytest가 자동 수집. 실수로 Selenium 의존 코드를 테스트에 포함하면 CI 실패.

**How to avoid:** 테스트 대상을 `process_data()`, `p_float()`, `validate_etl_results()`로 한정. `download_kofia_excel()`, `setup_driver()`는 테스트에서 호출하지 않음. `conftest.py`에서 managed_df를 직접 생성 (fetch_managed_items() 호출 안 함).

---

## Code Examples

### p_float() 테스트 전체 케이스

```python
# Source: CONTEXT.md D-03 + etl_process.py line 330-334 직접 확인
# tests/test_p_float.py

from etl_process import p_float
import pytest

@pytest.mark.parametrize("input_val, expected", [
    ("0.05%",  0.05),     # % 포함 문자열
    ("0.07",   0.07),     # 정상 소수점 문자열
    ("1,234",  1234.0),   # 쉼표 포함 정수
    (None,     0.0),      # None
    ("",       0.0),      # 빈 문자열
    ("N/A",    0.0),      # 완전 비숫자
    (0,        0.0),      # 정수 0
    (0.07,     0.07),     # float 직접 전달
])
def test_p_float(input_val, expected):
    assert p_float(input_val) == pytest.approx(expected)
```

### 수수료 계산 로직 테스트

```python
# Source: etl_process.py line 349-365 직접 확인
# tests/test_fee_calc.py

def test_real_cost_calculation():
    """ter = total + other, real_cost = ter + sell — 정수 케이스"""
    total = 0.07   # 합계(A)
    other = 0.0001 # 기타비용(B)
    sell  = 0.0050 # 매매·수수료

    ter = total + other
    real_cost = round(ter + sell, 4)

    assert ter == pytest.approx(0.0701)
    assert real_cost == pytest.approx(0.0751)

def test_real_cost_all_zero():
    """모든 수수료가 0일 때 실부담비용 = 0"""
    total, other, sell = 0.0, 0.0, 0.0
    real_cost = round((total + other) + sell, 4)
    assert real_cost == 0.0
```

### validate_etl_results() 테스트

```python
# Source: etl_process.py line 389-439 직접 확인
# tests/test_validate.py

from etl_process import validate_etl_results

# DATA-01: 범위 이탈 경고
def test_data01_warns_when_cost_exceeds_max(capsys):
    results = [{'종목코드': 'A', '종목명': 'Test', '실부담비용': 6.0}]
    validate_etl_results(results, prev_data=None)
    assert "[WARNING] DATA-01:" in capsys.readouterr().out

def test_data01_no_warning_for_valid(capsys):
    results = [{'종목코드': 'A', '종목명': 'Test', '실부담비용': 0.07}]
    validate_etl_results(results, prev_data=None)
    assert "[WARNING]" not in capsys.readouterr().out

# DATA-02: 중복 종목코드
def test_data02_warns_on_duplicate_code(capsys):
    results = [
        {'종목코드': 'A', '종목명': 'Test1', '실부담비용': 0.07},
        {'종목코드': 'A', '종목명': 'Test2', '실부담비용': 0.08},
    ]
    validate_etl_results(results, prev_data=None)
    assert "[WARNING] DATA-02:" in capsys.readouterr().out

# DATA-03: 이상치 감지
def test_data03_warns_on_large_delta(capsys):
    results = [{'종목코드': 'A', '종목명': 'Test', '실부담비용': 1.5}]
    prev    = [{'종목코드': 'A', '실부담비용': 0.07}]  # delta = 1.43 >= 1.0
    validate_etl_results(results, prev_data=prev)
    assert "[WARNING] DATA-03:" in capsys.readouterr().out

def test_data03_skipped_when_prev_none(capsys):
    results = [{'종목코드': 'A', '종목명': 'Test', '실부담비용': 9.0}]  # 범위 이탈로 DATA-01 경고는 발생
    validate_etl_results(results, prev_data=None)
    out = capsys.readouterr().out
    assert "[WARNING] DATA-03:" not in out  # DATA-03은 스킵
```

### process_data() 헤더 감지 테스트

```python
# Source: etl_process.py line 228-283 직접 확인
# tests/test_process_data.py

from etl_process import process_data

def test_header_primary_strategy(managed_df, kofia_excel_primary):
    """합계(A) 헤더 감지 경로(line 238-241)를 통해 데이터를 정상 처리."""
    results = process_data(managed_df, kofia_excel_primary)
    assert len(results) == 1
    assert results[0]['종목코드'] == '360750'
    assert results[0]['실부담비용'] == pytest.approx(0.0751, abs=1e-4)

def test_header_fallback_strategy(managed_df, kofia_excel_fallback):
    """합계(A) 없는 경우 매매·수수료 감지 fallback(line 244-249) 동작."""
    results = process_data(managed_df, kofia_excel_fallback)
    assert len(results) == 1

def test_missing_standard_code_returns_no_match(managed_df, tmp_path):
    """managed_df 표준코드가 KOFIA 데이터에 없으면 빈 리스트 반환."""
    from openpyxl import Workbook
    wb = Workbook(); ws = wb.active
    ws.append(["메타"]); ws.append(["메타"]); ws.append(["메타"])
    ws.append(["표준코드", "펀드명", "합계(A)", "기타비용(B)", "매매·수수료율(D)"])
    ws.append(["KR7999999999", "다른ETF", "0.10", "0.0", "0.0"])
    path = tmp_path / "no_match.xlsx"
    wb.save(str(path))
    results = process_data(managed_df, str(path))
    assert results == []
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| unittest (Python 표준) | pytest | 2010년대 중반 이후 커뮤니티 표준 | 더 간결한 assert, fixture 시스템, parametrize |
| 실제 파일 fixture | openpyxl/tmp_path 코드 생성 | pytest 6+ tmp_path 안정화 이후 | 저장소 오염 없음, 형식 자유롭게 제어 가능 |
| `print()` 직접 확인 | `capsys.readouterr()` | pytest 3+ | 스레드 안전, 자동 복원 |

**Deprecated/outdated:**
- `tmpdir` fixture: `tmp_path`(pathlib.Path)로 대체됨. 신규 코드는 `tmp_path` 사용. [CITED: docs.pytest.org/en/stable/how-to/tmp_path.html]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `process_data()` 내부 `p_float` 재정의가 for 루프 매 반복마다 일어나지만 동작에는 문제 없음 | Pattern 1 | 낮음 — Python에서 합법적 패턴, 성능 낭비만 있음 |
| A2 | CI (ubuntu-latest) Python 환경에서 pytest를 pip install 후 바로 사용 가능 | Pattern 4 | 낮음 — pytest는 표준 pip 패키지 |

**→ 2개 ASSUMED 항목 모두 위험도 낮음 — 사용자 확인 불필요.**

---

## Open Questions

1. **테스트 파일 분리 vs 통합**
   - What we know: CONTEXT.md D-09에서 Claude 재량
   - What's unclear: `test_p_float.py` + `test_fee_calc.py` + `test_process_data.py` + `test_validate.py` 4개 vs `test_etl.py` 1개
   - Recommendation: 4개 분리 파일 — 각 테스트 그룹이 독립적으로 실패/통과 가능, CI 출력에서 어느 요구사항이 실패했는지 명확

2. **capsys vs mock.patch 선택 (D-09 재량)**
   - What we know: 두 방법 모두 print() 출력 검증 가능
   - What's unclear: CONTEXT.md에서 Claude 재량으로 명시
   - Recommendation: `capsys` — pytest 네이티브, 별도 import 불필요, 더 간결한 코드

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | 모든 테스트 | ✓ | 3.14.2 (로컬) / 3.11 (CI) | — |
| pytest | 테스트 러너 | ✗ (미설치) | — | requirements.txt에 추가 후 pip install |
| openpyxl | Excel fixture | ✓ | 3.1.5 | — |
| pandas | process_data() | ✓ | (설치됨) | — |

**Missing dependencies with no fallback:**
- pytest: requirements.txt에 추가 + `pip install pytest` — Wave 0 작업

**Missing dependencies with fallback:**
- 없음

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 9.0.3 |
| Config file | 없음 — Wave 0에서 생성 (선택적: `pytest.ini` 또는 `pyproject.toml`) |
| Quick run command | `pytest tests/ -q` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | p_float() 문자열 파싱 | unit | `pytest tests/test_p_float.py -v` | ❌ Wave 0 |
| TEST-01 | ter/real_cost 계산 | unit | `pytest tests/test_fee_calc.py -v` | ❌ Wave 0 |
| TEST-02 | 헤더 감지 (주 전략) | unit | `pytest tests/test_process_data.py::test_header_primary_strategy -v` | ❌ Wave 0 |
| TEST-02 | 헤더 감지 (fallback) | unit | `pytest tests/test_process_data.py::test_header_fallback_strategy -v` | ❌ Wave 0 |
| TEST-03 | 표준코드 매칭 성공 | unit | `pytest tests/test_process_data.py::test_header_primary_strategy -v` | ❌ Wave 0 |
| TEST-03 | 표준코드 매칭 실패 | unit | `pytest tests/test_process_data.py::test_missing_standard_code_returns_no_match -v` | ❌ Wave 0 |
| DATA-01 | validate 범위 경고 | unit | `pytest tests/test_validate.py -v` | ❌ Wave 0 |
| DATA-02 | validate 중복 경고 | unit | `pytest tests/test_validate.py -v` | ❌ Wave 0 |
| DATA-03 | validate 이상치 경고 | unit | `pytest tests/test_validate.py -v` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pytest tests/ -q`
- **Per wave merge:** `pytest tests/ -v`
- **Phase gate:** 전체 통과 후 `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/conftest.py` — openpyxl fixture 3종 (primary, fallback, managed_df)
- [ ] `tests/test_p_float.py` — TEST-01 (p_float 파싱)
- [ ] `tests/test_fee_calc.py` — TEST-01 (ter/real_cost 계산)
- [ ] `tests/test_process_data.py` — TEST-02, TEST-03 (헤더 감지, 매칭)
- [ ] `tests/test_validate.py` — DATA-01/02/03
- [ ] `etl_process.py` 수정 — p_float 모듈 수준으로 이동 (D-01)
- [ ] `requirements.txt` 수정 — `pytest` 추가 (D-12)
- [ ] `.github/workflows/daily_update.yml` 수정 — pytest 단계 추가 (D-10)

---

## Security Domain

해당 없음 — 이 Phase는 테스트 코드만 추가하고 프로덕션 코드 동작을 변경하지 않는다. 외부 입력 처리, 인증, 암호화 없음.

---

## Sources

### Primary (HIGH confidence)
- etl_process.py (직접 확인) — p_float line 330, process_data line 218-388, validate_etl_results line 389-439
- .github/workflows/daily_update.yml (직접 확인) — CI 구조, Install/Run ETL 단계
- requirements.txt (직접 확인) — openpyxl 포함 확인, pytest 미포함 확인
- 04-CONTEXT.md (직접 확인) — 모든 Locked Decisions (D-01~D-12)

### Secondary (MEDIUM confidence)
- docs.pytest.org/en/stable/how-to/tmp_path.html — tmp_path fixture 패턴 [CITED]
- docs.pytest.org/en/stable/reference/fixtures.html#capsys — capsys.readouterr() 패턴 [CITED]
- docs.pytest.org/en/stable/how-to/fixtures.html — conftest.py scope, fixture 정의 [CITED]
- openpyxl.readthedocs.io/en/stable/tutorial.html — Workbook.save(), ws.append() 패턴 [CITED]

### Tertiary (LOW confidence)
- 없음

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pytest 9.0.3, openpyxl 3.1.5 pip registry 직접 확인
- Architecture: HIGH — etl_process.py 코드 직접 확인, CONTEXT.md 결정 사항 기반
- Pitfalls: HIGH — 코드 직접 확인으로 도출 (p_float 중첩, __main__ 가드, 컬럼명 일치)

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (stable stack — pytest, openpyxl 모두 안정 버전)
