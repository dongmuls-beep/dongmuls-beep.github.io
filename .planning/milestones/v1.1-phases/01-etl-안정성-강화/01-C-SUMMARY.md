---
plan: 01-C
phase: 1
status: complete
completed: 2026-04-30
self_check: PASSED
key-files:
  created: []
  modified:
    - etl_process.py
---

# Plan 01-C: 구체적 예외 처리 + KOFIA 컬럼 검증 Summary

## What Was Built

etl_process.py의 bare except 블록들을 구체적 예외 타입으로 교체하고, process_data()에 KOFIA Excel 필수 컬럼 유효성 검사를 추가했다. KOFIA 형식 변경 시 즉각적인 알림이 가능해졌다.

## Changes Made

### etl_process.py

**Import 추가:**
- `import traceback`
- `from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException`

**예외 처리 교체 (ETL-03):**
- fund name 입력: `(TimeoutException, NoSuchElementException)` + `WebDriverException` 분리
- GAS fetch: `HTTPError`, `RequestException`, `(ValueError, KeyError)` 분리 + mock 폴백
- Excel 처리: `EmptyDataError/ParserError`, `ValueError`, `OSError`, `Exception` 분리
  - 모든 경우 `traceback.print_exc()` 후 `raise` (빈 리스트 반환 제거)
- `__main__`: `process_data()` try/except로 감싸 `exit_code=1` 처리

**컬럼 유효성 검사 (ETL-04):**
- `process_data()` 내 `df.columns` 정제 직후 `REQUIRED_COLUMNS` 검사 블록 추가
- 표준코드, 합계(A)/총보수 미존재 시 실제 발견된 컬럼 목록 포함 `ValueError` 발생

## Verification

- `requests.exceptions` count = 2 ✓ (HTTPError + RequestException)
- `TimeoutException` count = 2 ✓ (import + except)
- `pd.errors.EmptyDataError` count = 1 ✓
- `traceback.print_exc` count = 4 ✓
- `import traceback` count = 1 ✓
- `REQUIRED_COLUMNS` count = 2 ✓ (정의 + 사용)
- `missing_required` count = 3 ✓
- `필수 컬럼 누락` count = 1 ✓
- `Column validation passed` count = 1 ✓
- REQUIRED_COLUMNS (line 262) < c_code_std (line 292) ✓
- Python syntax: ok ✓

## Self-Check: PASSED

모든 bare except 블록이 구체적 예외 타입으로 교체되었고, KOFIA Excel 컬럼 유효성 검사가 올바른 위치에 추가되었다.
