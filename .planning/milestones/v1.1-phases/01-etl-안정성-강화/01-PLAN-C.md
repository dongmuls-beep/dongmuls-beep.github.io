---
phase: 1
plan: C
type: execute
wave: 2
depends_on:
  - 01-PLAN-A
files_modified:
  - etl_process.py
autonomous: true
requirements:
  - ETL-03
  - ETL-04
must_haves:
  truths:
    - "ETL 실행 중 예외 발생 시 bare except 대신 구체적 예외 타입(requests.exceptions.*, selenium.common.exceptions.*, pd.errors.*, OSError 등)을 사용하여 잡는다"
    - "process_data()가 Excel 처리 중 예외를 잡을 때 트레이스백 전체를 출력하고 빈 리스트 대신 예외를 재발생시킨다"
    - "header_idx 결정 후 필수 컬럼(표준코드, 합계(A))이 실제로 존재하는지 검사하고, 없으면 ValueError를 발생시킨다"
    - "컬럼 유효성 검사 실패 시 실제로 발견된 컬럼 목록을 에러 메시지에 포함한다"
  artifacts:
    - path: "etl_process.py"
      provides: "구체적 예외 처리 + 컬럼 유효성 검사"
      contains: "REQUIRED_COLUMNS"
  key_links:
    - from: "process_data()"
      to: "KOFIA Excel 컬럼"
      via: "REQUIRED_COLUMNS 검사 후 ValueError 발생"
      pattern: "REQUIRED_COLUMNS"
    - from: "fetch_managed_items()"
      to: "GAS API"
      via: "requests.exceptions.RequestException"
      pattern: "requests\\.exceptions"
---

<objective>
etl_process.py의 bare except 블록들을 구체적 예외 타입으로 교체하고, process_data()에 KOFIA Excel 컬럼 유효성 검사를 추가한다.

Purpose: 실패 원인을 숨기는 침묵 오류를 제거하고, KOFIA 형식 변경 시 즉각적인 알림을 보장한다. ETL-03(구체적 예외)과 ETL-04(컬럼 검증)를 동시에 처리한다.
Output: 구체적 예외 처리 + 컬럼 유효성 검사가 적용된 etl_process.py
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

<interfaces>
<!-- 수정 대상 bare except 위치 요약 -->
```python
# [ETL-03 대상 1] line 77-79 — fund name 입력
except Exception as e:
    print(f"Error entering fund name: {e}")
    return None

# [ETL-03 대상 2] line 143-150 — GAS fetch
except Exception as e:
    print(f"Error fetching items from GAS: {e}")
    return get_mock_managed_items()

# [ETL-03 대상 3] line 300-302 — Excel 처리 전체
except Exception as e:
    print(f"Error processing Excel: {e}")
    return []

# [ETL-04 대상] line 206-211 — header_idx 결정 후 컬럼 사용 (검사 없음)
if header_idx == -1:
     print("Warning: Could not identify header row. Using default 0.")
     header_idx = 0
df = pd.read_excel(file_path, header=header_idx)
df.columns = df.columns.astype(str)...
# 바로 c_code_std, c_total 등을 찾지만 존재 여부를 검증하지 않음
```

<!-- 사용 가능한 예외 타입 -->
```python
import requests  # requests.exceptions.RequestException, requests.exceptions.HTTPError
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
import pandas as pd  # pd.errors.EmptyDataError, pd.errors.ParserError
# OSError — 파일 I/O 오류
# ValueError — 데이터 형식/컬럼 오류
# import traceback — 전체 스택 트레이스 출력용
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: bare except를 구체적 예외 타입으로 교체 (ETL-03)</name>
  <files>etl_process.py</files>
  <read_first>
    - etl_process.py (line 1-15 imports, line 70-80, line 88-100, line 134-155, line 295-305)
  </read_first>
  <action>
다음 3곳의 `except Exception as e` 블록을 구체적 예외 타입으로 교체한다.

**변경 1: import 블록 상단에 추가 (line 1-15 사이)**

```python
import traceback
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
```

**변경 2: fund name 입력 오류 (현재 line 77-79)**

교체 전:
```python
        except Exception as e:
             print(f"Error entering fund name: {e}")
             return None
```

교체 후:
```python
        except (TimeoutException, NoSuchElementException) as e:
            print(f"Error: Fund name input field not found or not interactable: {e}")
            return None
        except WebDriverException as e:
            print(f"WebDriver error while entering fund name: {e}")
            return None
```

**변경 3: GAS fetch 오류 (현재 line 143-150)**

교체 전:
```python
    except Exception as e:
        print(f"Error fetching items from GAS: {e}")
        return get_mock_managed_items()
```

교체 후:
```python
    except requests.exceptions.HTTPError as e:
        print(f"GAS API HTTP error (status {e.response.status_code if e.response else 'unknown'}): {e}")
        print("Falling back to mock data.")
        return get_mock_managed_items()
    except requests.exceptions.RequestException as e:
        print(f"GAS API network error: {e}")
        print("Falling back to mock data.")
        return get_mock_managed_items()
    except (ValueError, KeyError) as e:
        print(f"GAS API response parse error: {e}")
        print("Falling back to mock data.")
        return get_mock_managed_items()
```

**변경 4: Excel 처리 전체 예외 (현재 line 300-302)**

교체 전:
```python
    except Exception as e:
        print(f"Error processing Excel: {e}")
        return []
```

교체 후:
```python
    except (pd.errors.EmptyDataError, pd.errors.ParserError) as e:
        print(f"Excel parse error — KOFIA file may be corrupted or empty: {e}")
        traceback.print_exc()
        raise
    except ValueError as e:
        # 컬럼 유효성 검사 실패 포함 (Task 2에서 추가)
        print(f"Excel column validation error: {e}")
        traceback.print_exc()
        raise
    except OSError as e:
        print(f"File I/O error while reading Excel ({e.filename}): {e}")
        traceback.print_exc()
        raise
    except Exception as e:
        print(f"Unexpected error processing Excel: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise
```

주의:
- `process_data()`의 Exception은 이제 `return []` 대신 `raise`로 재발생시킨다.
- 호출부(`__main__` 블록)에서 이 예외를 잡아서 `exit_code = 1`로 처리하는 코드를 추가해야 한다. `__main__` 블록의 `final_data = process_data(targets, excel_file)` 호출을 아래와 같이 감싼다:

```python
        # 3. Process
        try:
            final_data = process_data(targets, excel_file)
        except Exception as etl_err:
            print(f"ETL aborted: {etl_err}")
            exit_code = 1
            final_data = []
```
  </action>
  <verify>
    <automated>grep -n "requests.exceptions\|TimeoutException\|NoSuchElementException\|pd.errors\|traceback.print_exc" /c/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/etl_process.py</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "requests.exceptions" etl_process.py` 결과가 2 이상이어야 한다 (HTTPError + RequestException)
    - `grep -c "TimeoutException" etl_process.py` 결과가 2 이상이어야 한다 (import + except)
    - `grep -c "pd.errors.EmptyDataError" etl_process.py` 결과가 1 이상이어야 한다
    - `grep -c "traceback.print_exc" etl_process.py` 결과가 1 이상이어야 한다
    - `grep -c "import traceback" etl_process.py` 결과가 1이어야 한다
    - `grep -n "return \[\]" etl_process.py | grep -v "get_mock_managed_items\|results" | wc -l` 결과가 0이어야 한다 (process_data 내 return [] 제거)
    - `python -c "import ast; ast.parse(open('etl_process.py').read()); print('ok')"` 가 "ok"를 출력해야 한다
  </acceptance_criteria>
  <done>etl_process.py의 모든 bare except Exception 블록이 구체적 예외 타입으로 교체되었고, process_data()의 예외는 traceback 출력 후 재발생한다.</done>
</task>

<task type="auto">
  <name>Task 2: KOFIA Excel 컬럼 유효성 검사 추가 (ETL-04)</name>
  <files>etl_process.py</files>
  <read_first>
    - etl_process.py (line 180-230 — process_data() 내 header 감지 및 컬럼 매핑 블록)
  </read_first>
  <action>
`process_data()` 함수 내에서 `df = pd.read_excel(file_path, header=header_idx)` 이후, 컬럼 정제(`df.columns = ...`) 다음 위치에 컬럼 유효성 검사 블록을 추가한다.

추가할 코드 — `df.columns` 정제 직후 (현재 line 214-215 근처):

```python
        # 컬럼 정제 완료 후 — 필수 컬럼 유효성 검사 (ETL-04)
        REQUIRED_COLUMNS = {
            "표준코드": lambda cols: any("표준코드" in c for c in cols),
            "합계(A) 또는 총보수": lambda cols: (
                any("합계" in c and "(A)" in c for c in cols) or
                any("총보수" in c for c in cols)
            ),
        }

        missing_required = [
            name
            for name, checker in REQUIRED_COLUMNS.items()
            if not checker(df.columns)
        ]

        if missing_required:
            actual_cols = df.columns.tolist()
            raise ValueError(
                f"KOFIA Excel 필수 컬럼 누락: {missing_required}\n"
                f"실제 발견된 컬럼 ({len(actual_cols)}개): {actual_cols}\n"
                f"원인: KOFIA 파일 형식이 변경되었거나 헤더 행 감지가 실패했을 수 있습니다. "
                f"header_idx={header_idx}를 확인하세요."
            )

        print(f"Column validation passed. Required columns found.")
```

이 블록은 기존의 Debug 컬럼 확인 코드(`c_code_std`, `c_total` 등을 print하는 line 221-225) 바로 앞에 위치시킨다.

주의:
- `REQUIRED_COLUMNS`는 딕셔너리로 검사 로직을 캡슐화하여 향후 컬럼 추가가 쉽다.
- `ValueError`를 발생시키므로 Task 1에서 추가한 `except ValueError` 블록이 이를 잡아서 traceback을 출력한 뒤 재발생시킨다.
- `header_idx == -1`에서 0으로 폴백하는 기존 경고 메시지(`Warning: Could not identify header row. Using default 0.`)는 유지하되, 이후 컬럼 검사가 실패 여부를 보완한다.
  </action>
  <verify>
    <automated>grep -n "REQUIRED_COLUMNS\|missing_required\|필수 컬럼 누락" /c/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/etl_process.py</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "REQUIRED_COLUMNS" etl_process.py` 결과가 2 이상이어야 한다 (정의 + 사용)
    - `grep -c "missing_required" etl_process.py` 결과가 2 이상이어야 한다 (생성 + 조건문)
    - `grep -c "필수 컬럼 누락" etl_process.py` 결과가 1이어야 한다
    - `grep -c "header_idx" etl_process.py` 결과가 에러 메시지에 포함되어야 한다: `grep -c "header_idx=" etl_process.py` >= 1
    - `grep -c "Column validation passed" etl_process.py` 결과가 1이어야 한다
    - `python -c "import ast; ast.parse(open('etl_process.py').read()); print('ok')"` 가 "ok"를 출력해야 한다
    - 검사 블록이 `df.columns = df.columns.astype(str)` 이후, `c_code_std` 변수 정의 이전에 위치해야 한다: `grep -n "REQUIRED_COLUMNS\|c_code_std = " etl_process.py` 출력에서 REQUIRED_COLUMNS 줄 번호 < c_code_std 줄 번호
  </acceptance_criteria>
  <done>process_data()가 헤더 감지 후 표준코드·합계(A)/총보수 컬럼 존재 여부를 검사하고, 없으면 실제 컬럼 목록을 포함한 ValueError를 발생시킨다.</done>
</task>

</tasks>

<threat_model>
## Threat Model (ASVS L1)

### Assets
- data.json (잘못된 데이터로 덮어쓰기되면 사이트에 오류 정보 표시)
- ETL 실행 로그 (원인 파악의 핵심 자산)

### Threats
| Threat | Severity | Mitigation |
|--------|----------|------------|
| 빈 배열 반환으로 data.json이 빈 파일로 교체됨 | HIGH | process_data()가 예외를 raise하여 __main__에서 exit_code=1 처리 — mitigate |
| KOFIA 형식 변경이 침묵으로 넘어가 잘못된 수수료 데이터 게시 | HIGH | ETL-04 컬럼 검사 + ValueError로 ETL 즉시 중단 — mitigate |
| 스택 트레이스가 GitHub Actions 로그에 노출 | LOW | 로그는 비공개 Actions 로그에만 남음, 공개 페이지 미노출 — accept |
| requests 예외 세분화로 catch 누락 가능성 | LOW | 최종 `except Exception`을 유지하여 미처리 예외 잡음 — accept |

### Residual Risk
- `get_mock_managed_items()`로 폴백하는 GAS 오류 경로는 여전히 ETL을 계속 진행한다. mock 데이터로 생성된 data.json은 실제 데이터와 다를 수 있다. 이는 설계상 의도된 동작이며 (GAS 장애 시에도 사이트를 업데이트할 수 있어야 함), Phase 2의 데이터 무결성 검증에서 추가 보호가 추가된다.
</threat_model>

<verification>
- `grep -c "requests.exceptions" etl_process.py` >= 2
- `grep -c "REQUIRED_COLUMNS" etl_process.py` >= 2
- `grep -c "필수 컬럼 누락" etl_process.py` == 1
- `grep -c "traceback.print_exc" etl_process.py` >= 1
- `python -c "import ast; ast.parse(open('etl_process.py').read())"` 오류 없음
</verification>

<success_criteria>
- etl_process.py의 모든 bare except가 구체적 예외 타입으로 교체되었다
- process_data()가 Excel 처리 실패 시 빈 리스트 대신 예외를 재발생시킨다
- 표준코드·합계(A)/총보수 컬럼 부재 시 실제 컬럼 목록을 포함한 ValueError가 발생한다
- 파이썬 파일 문법 오류가 없다
</success_criteria>

<output>
완료 후 `.planning/phases/01-etl-안정성-강화/01-C-SUMMARY.md` 생성.
</output>
