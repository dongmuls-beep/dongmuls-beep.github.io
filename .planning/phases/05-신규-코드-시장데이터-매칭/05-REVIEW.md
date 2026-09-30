---
phase: 05-신규-코드-시장데이터-매칭
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - etl_process.py
  - tests/test_market_data.py
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: resolved
---

# Phase 05: Code Review Report

**Reviewed:** 2026-09-30
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the diff fb21623..HEAD. The code normalization and the new soft-warning function work for the intended cases. There are no security issues and no crashes on the reviewed paths. The remaining issues are robustness gaps in error handling and validation.

## Warnings

### WR-01: Total API failure is indistinguishable from per-code misses, and floods the log

**File:** `etl_process.py:657-670, 716-731`
**Issue:** When the NAVER call fails, every item gets None. `validate_market_data` then prints one DATA-04 warning per ETF, which can be hundreds of lines. There is no aggregate signal such as "N of M missing". The soft-warning design also means a full outage is invisible to CI, and stale or empty AUM data can be uploaded to Sheets without any summary.
**Fix:** Add a summary line to `validate_market_data`, for example `print(f"[WARNING] DATA-04: {missing}/{len(results)} 종목 시장데이터 누락")`. Consider escalating when the missing ratio exceeds a threshold (for example 50%).

### WR-02: Broad `except Exception` also swallows programming errors and discards partial results

**File:** `etl_process.py:728-731`
**Issue:** A single malformed item (for example, `item` not being a dict) or an unexpected response shape (`result` being null makes `.get("etfItemList")` raise AttributeError) is reported as "NAVER ETF API 오류". The entire batch is then set to None, and only the generic message is printed. `resp.json()` errors, HTTP errors and logic bugs are all handled the same way.
**Fix:** Narrow the network and parse errors to `(requests.RequestException, ValueError)`. Guard the shape with `(data.get("result") or {}).get("etfItemList") or []`. Include the exception type in the log.

### WR-03: `str.isdigit()` accepts non-ASCII digits, and duplicate codes are silently overwritten

**File:** `etl_process.py:694-696, 708-712`
**Issue:** `isdigit()` returns True for characters such as "²" or full-width digits, so they go through `zfill`. `str.upper()` can also change string length for some Unicode characters. A code that is all digits and shorter than 6 characters is zero-padded. That could match a different ETF than intended if the input code was truncated, for example when a spreadsheet dropped leading zeros from "0026S0" style neighbours. In `naver_map`, duplicate itemcodes are overwritten by the last entry with no warning.
**Fix:** Use `s.isascii() and s.isdigit()`, and optionally validate against `^[0-9A-Z]{6}$`.

## Info

### IN-01: Test assertions are weak in places

**File:** `tests/test_market_data.py:104-110`
**Issue:** `assert ret is None` in Test J only checks the return value, not any behavior. `test_all_present_no_warning` covers AUM=0, which is good. There are no tests for an empty `codes` list, an unexpected response shape (`result: null`), or duplicate itemcodes. Test F asserts absence of a removed message, which will never fail after the message is deleted.
**Fix:** Add tests for `fetch_market_data_batch([])`, for a malformed JSON body (expect all None with no exception), and for a warning count or summary line if WR-01 is applied.

### IN-02: Warning message prints "None" values and mixed language

**File:** `etl_process.py:665-668`
**Issue:** The warning prints `AUM=None, 거래량=None` for the failure case and does not say which field is missing. The per-code log line for a found code is printed even when `marketSum` or `quant` is itself None in the NAVER payload. In that case the "found" branch stores None with no distinction from a miss.
**Fix:** List only the missing field names, and treat a found item with a None `marketSum` or `quant` as a miss in the log.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Dispositions (orchestrator, 2026-09-30)

| ID | Decision | Rationale |
|----|----------|-----------|
| WR-01 | won't fix | 전체 API 실패 시 이미 `NAVER ETF API 오류` 요약 1줄 출력됨; 종목별 DATA-04 경고 59줄은 soft-warning 로그로 허용 |
| WR-02 | won't fix | CONTEXT.md 잠금 결정: "API 전체 실패 시 현행 유지 (전 종목 None, ETL 계속)". 부분 결과 보존은 deferred |
| WR-03 | won't fix | KRX/NAVER 코드는 ASCII 6자리; 비ASCII 숫자·중복 itemcode는 실데이터에서 발생 안 함 (1171건 확인) |
| IN-01 | won't fix | 핵심 경로 테스트 A–K 존재 (44 passed) |
| IN-02 | won't fix | 로그 문구 개선 — 기능 영향 없음 |
