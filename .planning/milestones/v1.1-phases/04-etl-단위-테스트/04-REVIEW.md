---
phase: 04-etl-단위-테스트
reviewed: 2026-05-20T00:00:00+09:00
depth: standard
files_reviewed: 8
files_reviewed_list:
  - tests/__init__.py
  - tests/conftest.py
  - tests/test_fees.py
  - tests/test_process_data.py
  - tests/test_validate.py
  - etl_process.py
  - requirements.txt
  - .github/workflows/daily_update.yml
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 04: 코드 리뷰 보고서

**검토일:** 2026-05-20
**깊이:** standard
**검토 파일 수:** 8
**상태:** issues_found

## 요약

ETL 파이프라인(etl_process.py)과 단위 테스트(tests/)를 검토했습니다. 핵심 비즈니스 로직(`p_float`, `process_data`, `validate_etl_results`)은 전반적으로 구조가 명확합니다. 그러나 세 가지 심각한 문제가 발견되었습니다: (1) `p_float("None")` 입력 시 `0.0`이 아니라 예외 없이 파싱이 성공해버리는 잠재적 오분류, (2) `update_google_sheets`에서 GAS POST 실패가 전체 성공 여부에 영향을 미치지 않는 silent failure, (3) `requirements.txt`에 버전 고정이 전혀 없어 CI/CD 재현성이 깨질 수 있는 문제입니다. 또한 GitHub Actions 워크플로에서 단위 테스트 실패 시에도 ETL 스크립트가 계속 실행되는 제어 흐름 결함이 존재합니다.

---

## Critical Issues

### CR-01: `p_float("None")` — 문자열 `"None"`이 `0.0`이 아닌 `float("None")` 예외를 거쳐 `0.0`으로 처리되지만, 실제로는 예외가 발생해야 할 상황이 아닌 곳에서 묵묵히 0을 반환한다

**File:** `etl_process.py:226`

**Issue:** `p_float` 구현은 `str(v).replace(...)` 체인을 사용하므로, `v=None`을 넣으면 `str(None)` → `"None"` → `float("None")` → `ValueError` → `0.0`을 반환합니다. 테스트 `test_none_returns_zero`는 이 동작이 "올바르다"고 검증하지만, 실제로는 None 입력은 데이터 누락(missing value)을 의미하는데 0.0으로 처리됨으로써 수수료가 0%인 것처럼 계산됩니다. KOFIA Excel에서 셀이 비어 있는 경우(`None` 반환)와 실제로 0인 경우를 구별할 수 없게 됩니다.

더 심각한 문제는 `process_data` 내부 (line 352-354)에서:
```python
total = p_float(row.get(col_total, 0)) if col_total else 0
```
`col_total`이 None이면 정수 `0`을 반환하고, `col_total`이 있더라도 셀값이 pandas `NaN`인 경우 `str(NaN)` → `"nan"` → `float("nan")` → `NaN` 을 반환하여 이후 합산에서 `NaN`이 전파됩니다. `p_float`는 `NaN`을 `0.0`으로 처리하지 않습니다.

**Fix:**
```python
import math

def p_float(v):
    """
    수수료 문자열을 float로 파싱한다.
    - None, NaN, 빈 문자열, 비숫자 → 0.0
    """
    if v is None:
        return 0.0
    try:
        result = float(str(v).replace(',', '').replace('%', '').strip())
        return 0.0 if math.isnan(result) else result
    except (ValueError, TypeError, AttributeError):
        return 0.0
```

---

### CR-02: `update_google_sheets`에서 GAS POST 실패가 전체 반환값에 반영되지 않는 silent failure

**File:** `etl_process.py:557-562`

**Issue:** GAS(Google Apps Script) 업로드 실패 시 예외를 잡아 print만 하고 `return True`를 이미 반환합니다. 즉, 로컬 JSON 저장에 성공하면 GAS 업로드가 실패해도 함수는 `True`를 반환하여 GitHub Actions 워크플로에서 성공으로 간주됩니다.

```python
    # 2. Upload to GAS (Optional / Backup)
    try:
        resp = requests.post(GAS_WEB_APP_URL, json=data, ...)
        print("Update Status:", resp.status_code, resp.text)
        # resp.raise_for_status() 호출 없음!
    except Exception as e:
        print(f"Update Error: {e}")
    # GAS 실패 여부와 무관하게 True 반환 (line 564)
    return True
```

추가로 `resp.raise_for_status()`가 없어 HTTP 4xx/5xx 응답도 성공으로 처리됩니다.

**Fix:**
```python
    # 2. Upload to GAS (Optional / Backup)
    try:
        resp = requests.post(
            GAS_WEB_APP_URL, json=data,
            headers={'Content-Type': 'application/json'},
            timeout=30,  # timeout 추가
        )
        resp.raise_for_status()  # HTTP 오류 명시적 처리
        print("Update Status:", resp.status_code, resp.text)
    except requests.exceptions.RequestException as e:
        print(f"GAS Upload Error (non-fatal): {e}")
        # GAS 업로드는 선택적 백업 — 로컬 저장 성공 시 계속 진행

    return True
```

---

### CR-03: `requirements.txt` — 버전 고정 없음으로 CI/CD 재현성 파괴

**File:** `requirements.txt:1-10`

**Issue:** 모든 의존성이 버전 범위 없이 지정되어 있어 `pip install -r requirements.txt` 실행 시점마다 다른 버전이 설치될 수 있습니다. 특히:
- `pandas`: 2.x와 3.x는 `read_excel` API 동작 차이가 있습니다.
- `selenium`: 4.x 마이너 버전별 WebDriver API 변경이 빈번합니다.
- `openpyxl`: 헤더 파싱 동작이 버전마다 다를 수 있습니다.

GitHub Actions에서 오늘 통과한 테스트가 내일 패키지 업데이트로 실패할 수 있으며, 실제 데이터 파싱 결과가 달라질 수 있습니다.

**Fix:**
```
pandas==2.2.3
requests==2.32.3
openpyxl==3.1.5
beautifulsoup4==4.12.3
lxml==5.3.0
selenium==4.27.1
webdriver-manager==4.0.2
xlrd==2.0.1
yfinance==0.2.51
pytest==8.3.4
```

---

## Warnings

### WR-01: `process_data` — ValueError 발생 시 예외가 호출자에게 전파되어 ETL이 중단되지만 테스트는 이를 검증하지 않는다

**File:** `etl_process.py:382-394`, `tests/test_process_data.py:81-85`

**Issue:** `process_data`에서 필수 컬럼 누락 시 `ValueError`를 `raise`합니다 (line 291). 그러나 테스트 `test_empty_file_returns_empty`는 "존재하지 않는 파일 경로 → 빈 리스트 반환"만 검증하고, "컬럼 구조가 잘못된 파일 → ValueError 전파"는 검증하지 않습니다. 또한 `__main__` 블록(line 590-594)은 `process_data` 예외를 잡아 `exit_code=1`로 처리하지만, `validate_etl_results`와 `update_google_sheets`를 건너뜀으로써 `data.json`이 갱신되지 않습니다. 이것이 의도된 동작인지 테스트로 보장되지 않습니다.

**Fix:** 컬럼 누락 파일에 대한 테스트 케이스를 추가해야 합니다:
```python
def test_invalid_column_structure_raises(self, tmp_path, managed_df_primary):
    """필수 컬럼 없는 Excel → ValueError 발생"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["잘못된컬럼A", "잘못된컬럼B"])
    ws.append(["val1", "val2"])
    path = str(tmp_path / "bad_structure.xlsx")
    wb.save(path)
    with pytest.raises(ValueError, match="필수 컬럼"):
        process_data(managed_df_primary, path)
```

---

### WR-02: `process_data` — `row.get(col_total, 0)`에서 pandas Series의 `.get()` 사용

**File:** `etl_process.py:352-354`

**Issue:** `row`는 `pd.Series` 객체입니다. `pd.Series.get(key, default)`는 동작하지만, 존재하지 않는 컬럼 키에 대해 `default=0`(정수)를 반환합니다. 이후 `p_float(0)` → `float("0")` → `0.0`으로는 정상이지만, `col_total`이 None이면 `if col_total else 0` 분기에서 정수 `0`을 직접 반환합니다. 이 경우 `p_float` 없이 바로 `total=0`이 되어 타입 일관성은 유지되지만, 코드 의도가 불명확합니다. `col_total`이 None인데 컬럼 유효성 검사를 통과했다면(line 276-296 REQUIRED_COLUMNS가 `합계` or `총보수`를 보장), 이는 논리적 모순입니다.

**Fix:** 컬럼 유효성 검사 통과 후에는 `col_total`이 None일 수 없으므로 방어 코드를 제거하거나 단언을 추가:
```python
# 유효성 검사 통과 후이므로 col_total은 None이 될 수 없음
assert col_total is not None, "컬럼 유효성 검사 통과 후 col_total이 None — 내부 오류"
total = p_float(row[col_total])
```

---

### WR-03: GitHub Actions — 단위 테스트 실패해도 ETL 스크립트 계속 실행

**File:** `.github/workflows/daily_update.yml:31-37`

**Issue:** 워크플로는 `pytest tests/ -v` 단계(line 32)와 `python etl_process.py` 단계(line 35)가 순차적으로 정의되어 있지만, 각 step의 `continue-on-error`가 명시되어 있지 않습니다. GitHub Actions 기본 동작에서는 한 step이 실패하면 이후 step이 실행되지 않으므로 이 자체는 문제가 없어 보이지만, `pytest`가 exit code 5(테스트 없음)를 반환하면 성공으로 간주됩니다. 더 중요하게는 `Run ETL Script` step이 실패해도 `Commit and Push changes` step이 실행되어 불완전한 `data.json`을 커밋할 수 있습니다.

**Fix:**
```yaml
      - name: Commit and Push changes
        if: success()  # 이전 모든 step이 성공한 경우에만 커밋
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Auto-update ETF data (Daily)"
          file_pattern: "data.json changelog.json update-meta.json"
```

---

### WR-04: `validate_etl_results` — `results`가 빈 리스트일 때 호출되지 않는다

**File:** `etl_process.py:608-609`

**Issue:** `if final_data:` 조건으로 `validate_etl_results`를 감쌉니다. ETL 처리 후 매칭된 항목이 0건이면 검증을 완전히 건너뜁니다. 이 경우 DATA-02(중복 감지)나 DATA-01(범위 검증)은 의미가 없으나, DATA-03(이전 대비 이상치) 검사는 "새 데이터에서 모든 종목이 사라졌다"는 이상 상황을 감지해야 합니다. 빈 결과도 유효한 검증 대상입니다.

**Fix:**
```python
        # 3.6. Validate ETL results — 빈 리스트도 검증 수행 (이상 상황 감지)
        validate_etl_results(final_data, prev_data)
        if not final_data:
            print("[WARNING] ETL: 매칭된 항목이 0건입니다. KOFIA 파일 또는 관리 목록을 확인하세요.")
```

---

### WR-05: `_wait_for_download` — `max_retries` 루프 내에서 `timeout` 초 전체 재대기 후 백오프 적용

**File:** `etl_process.py:29-53`

**Issue:** 최악의 경우 총 대기 시간이 `max_retries * timeout + 누적 백오프` = `3 * 90 + (2+4) = 276초`가 됩니다. GitHub Actions는 job timeout이 기본 6시간이므로 이 자체가 하드 리밋을 초과하진 않지만, `download_kofia_excel` 전체가 최대 ~5분 이상 블로킹될 수 있습니다. 더 심각한 문제는 `all_files`에 이전 실행에서 남은 오래된 파일이 있으면, 그 파일의 `os.path.getmtime`이 90초 이내가 아니어서 `if time.time() - os.path.getmtime(latest) < 90` 조건에 걸리지 않아 새 파일을 못 찾는 것처럼 동작할 수 있습니다. DOWNLOAD_DIR이 정리되지 않은 상태라면 이전 Excel 파일이 감지를 방해합니다.

**Fix:** 다운로드 시작 전 DOWNLOAD_DIR의 기존 Excel 파일을 정리하거나, 기준 시점(다운로드 시작 시각)을 기록하여 그 이후에 생성된 파일만 감지:
```python
def _wait_for_download(download_dir: str, timeout: int = 90, max_retries: int = 3,
                        started_at: float = None) -> str | None:
    started_at = started_at or time.time()
    # ... 내부에서 os.path.getmtime(latest) > started_at 조건으로 변경
```

---

## Info

### IN-01: `tests/conftest.py` — fixture가 `conftest.py`에 정의되어 있으나 `test_validate.py`는 이를 사용하지 않는다

**File:** `tests/conftest.py:6-88`

**Issue:** `kofia_primary_xlsx`, `kofia_fallback_xlsx`, `managed_df_primary` fixture는 `test_process_data.py`에서 사용되지만 `test_validate.py`는 로컬 `make_item()` 헬퍼를 직접 사용합니다. 이 자체는 문제가 없으나, `conftest.py`가 파일 I/O fixture와 순수 데이터 fixture를 혼합하고 있어 테스트 범주가 섞입니다. `managed_df_primary`는 순수 데이터 fixture이므로 별도 파일로 분리하면 응집도가 높아집니다.

**Fix:** `conftest.py`를 파일 fixture 전용으로 유지하고, 순수 데이터 fixture를 `tests/fixtures.py`로 분리하는 것을 고려하세요.

---

### IN-02: `etl_process.py` — 주석 처리된 코드 잔존

**File:** `etl_process.py:67-68`, `etl_process.py:581-582`

**Issue:**
- line 67-68: `# options.add_argument("--headless") # Uncomment for local headless` — 로컬 headless 모드를 위한 주석 처리된 코드
- line 581-582: `# excel_file = os.path.join(os.getcwd(), '펀드별 보수비용비교_20260211 (1).xls')` — 로컬 테스트용 하드코딩 파일 경로 (파일명에 공백과 날짜 포함)

후자의 경우 파일명에 날짜(`20260211`)가 포함되어 있어 개발 당시 로컬 테스트 파일 경로임이 명확합니다. 그대로 두면 혼란을 줍니다.

**Fix:** 주석 처리된 코드를 제거하거나 환경 변수로 대체하세요.

---

### IN-03: `requirements.txt` — `yfinance`가 포함되어 있으나 `etl_process.py`에서 import되지 않는다

**File:** `requirements.txt:9`

**Issue:** `etl_process.py`는 NAVER Finance API를 직접 HTTP로 호출하며(line 459), `yfinance`를 import하거나 사용하지 않습니다. 코드 주석(line 449-455)에도 "Yahoo Finance(yfinance)는 한국 ETF에 사용 불가"라고 명시되어 있습니다. 불필요한 의존성이 설치 시간과 공격 표면을 늘립니다.

**Fix:** `requirements.txt`에서 `yfinance` 제거:
```diff
-yfinance
```

---

_검토일: 2026-05-20_
_검토자: Claude (gsd-code-reviewer)_
_깊이: standard_
