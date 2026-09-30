---
phase: 01-etl-안정성-강화
reviewed: 2026-04-30T00:00:00+09:00
depth: standard
files_reviewed: 2
files_reviewed_list:
  - etl_process.py
  - .github/workflows/daily_update.yml
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-04-30T00:00:00+09:00
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

This review covers the Phase 1 ETL stability hardening changes: secret externalization, WebDriverWait grid detection, exponential backoff retry, bare-except replacement, and KOFIA column validation.

The changes are directionally correct and a clear improvement over the baseline. However, four critical defects remain that can silently produce wrong data, cause infinite-retry loops, or allow the ETL to pass with an empty/corrupt result set. Six warnings cover logic gaps and hardening omissions that will cause pain in production CI.

---

## Critical Issues

### CR-01: `_wait_for_download` picks up stale pre-existing files and never clears them between retries

**File:** `etl_process.py:37-42`

**Issue:** The freshness check on line 40 uses `os.path.getmtime(latest) < 90` to decide whether the file is "recent." If there is any `.xls` or `.xlsx` file left in the download directory from a previous run (the cleanup on line 558 only fires on _success_), the first iteration of the inner while-loop immediately returns that stale file — the check passes because `time.time() - old_mtime` is compared against `90` seconds, but the timestamp on a file written hours ago will be _far greater_ than 90, so the guard should reject it. Wait — re-reading: the condition is `time.time() - os.path.getmtime(latest) < 90`, meaning "modified less than 90 seconds ago." A genuinely old file will have a large delta and fail the check, so it won't be returned spuriously. **But the real problem is the inverse**: the function polls _all_ `.xls*` files in the directory without filtering to files that were created _after_ the download was initiated. If a fresh download of the wrong fund data happens to land in the same folder (e.g., a different Chrome profile or a leftover partial), the ETL will process it silently. More critically, `max_retries=3` loops with `timeout=90` each, plus backoff delays, giving a worst-case wall-clock time of `3 × 90 + 2 + 4 = 278 seconds` — but the inner `while` loop has no explicit sleep between glob checks (only `time.sleep(1)` on line 43). If the download directory does not exist, `glob.glob` raises no error but returns `[]`, so the loop spins correctly — but `os.path.getmtime(latest)` on line 40 will raise `FileNotFoundError` if the file is deleted between the glob and the stat call (TOCTOU race). This will cause an unhandled exception that propagates out of `_wait_for_download` and is not caught by `download_kofia_excel`.

**Fix:**
```python
# Record a reference timestamp before initiating the download, then only
# accept files newer than that timestamp to eliminate TOCTOU and stale-file risks.
import time as _time

def _wait_for_download(download_dir: str, timeout: int = 90,
                       max_retries: int = 3, start_time: float | None = None) -> str | None:
    start_time = start_time or _time.time()
    delay = 2
    for attempt in range(1, max_retries + 1):
        end_time = _time.time() + timeout
        while _time.time() < end_time:
            xls_files = glob.glob(os.path.join(download_dir, "*.xls"))
            xlsx_files = glob.glob(os.path.join(download_dir, "*.xlsx"))
            crdownload_files = glob.glob(os.path.join(download_dir, "*.crdownload"))
            all_files = [f for f in xls_files + xlsx_files
                         if os.path.getmtime(f) >= start_time]  # only new files
            if all_files and not crdownload_files:
                latest = max(all_files, key=os.path.getmtime)
                try:
                    if os.path.getsize(latest) > 0:
                        return latest
                except OSError:
                    pass  # file disappeared between glob and stat — keep polling
            _time.sleep(1)
        ...
```

Call site: `start = time.time()` before clicking the download button, pass `start_time=start` to `_wait_for_download`.

---

### CR-02: Bare `except:` blocks in production code paths (two locations)

**File:** `etl_process.py:143, 145, 168, 333`

**Issue:** The Phase 1 requirement "bare except replaced with specific exception types" was applied to the outer `download_kofia_excel` try/except and `fetch_managed_items`, but three bare `except:` blocks remain in production paths:

- Line 143: `except:` — swallows all exceptions when finding Excel button by XPATH
- Line 145: `except:` — swallows all exceptions when finding Excel button by CSS selector
- Line 168: `except:` — swallows all exceptions in the screenshot fallback
- Line 333: `except:` — swallows all exceptions inside the `p_float` helper used for every fee value

The `p_float` bare except (line 333) is the most dangerous: any `AttributeError`, `TypeError`, or unexpected object type silently becomes `0.0`. This means a fee value that cannot be parsed (e.g., a merged cell returning a pandas `Series` instead of a scalar) will be recorded as 0% rather than raising a detectable error, producing silently corrupt output data.

**Fix:**
```python
# Line 143-147: replace bare excepts with specific Selenium exceptions
try:
    excel_btn = driver.find_element(By.XPATH, "//img[contains(@alt, '엑셀') or contains(@alt, 'Excel')]/parent::*")
except NoSuchElementException:
    try:
        excel_btn = driver.find_element(By.CSS_SELECTOR, "#btnExcel, #excelDown")
    except NoSuchElementException:
        print("Excel button not found!")
        return None

# Line 168: screenshot fallback
except Exception:
    pass

# Line 330-334: p_float — catch only what float() can raise
def p_float(v):
    try:
        return float(str(v).replace(',', '').replace('%', ''))
    except (ValueError, TypeError, AttributeError):
        return 0.0
```

---

### CR-03: `update_google_sheets` POSTs to GAS even when `GAS_WEB_APP_URL` is empty string

**File:** `etl_process.py:499`

**Issue:** The `__main__` block (line 508) exits early if `GAS_WEB_APP_URL` is falsy, so in normal `__main__` execution the guard protects `update_google_sheets`. However, `update_google_sheets` can be imported and called directly from tests or other modules without going through `__main__`. In that case, `GAS_WEB_APP_URL` is the module-level empty string `""`, and `requests.post("", ...)` raises a `MissingSchema` exception (`requests.exceptions.InvalidSchema`). This exception is caught by the bare `except Exception as e` on line 502, which prints it and — critically — returns `True` on line 504, telling the caller that the upload succeeded when it did not.

The function returns `True` at line 504 unconditionally after the GAS POST block; the POST is considered "optional / backup" per the comment, so this may be intentional. But returning `True` when the local JSON write succeeded and GAS upload failed silently is misleading: `exit_code` stays `0`, the workflow commits, and operators have no signal that GAS is no longer receiving updates.

**Fix:**
```python
# Guard GAS POST against empty URL, and log a clear warning
if GAS_WEB_APP_URL:
    try:
        resp = requests.post(
            GAS_WEB_APP_URL, json=data,
            headers={'Content-Type': 'application/json'},
            timeout=30,
        )
        resp.raise_for_status()
        print("GAS update status:", resp.status_code)
    except requests.exceptions.RequestException as e:
        print(f"GAS upload failed (non-fatal): {e}")
else:
    print("WARNING: GAS_WEB_APP_URL not set — skipping GAS upload.")
```

Also add `timeout=30` (currently absent from the POST on line 499), which means the ETL can block indefinitely waiting for a GAS response.

---

### CR-04: `process_data` column validation uses `raise ValueError` but callers may swallow it silently

**File:** `etl_process.py:276-283, 530-534`

**Issue:** When column validation fails (lines 276-283), `process_data` raises `ValueError`. The `__main__` caller on lines 529-534 catches it correctly with `except Exception as etl_err` and sets `exit_code = 1`. However, `fetch_managed_items` on lines 184-195 falls back to mock data on `ValueError` — so if `process_data` ever raised `ValueError` _within_ `fetch_managed_items`'s scope, it would be silently swallowed. That is not the current call structure, but more importantly: **the `ValueError` catch in the outer except on line 375 re-raises correctly, but `get_mock_managed_items` on line 209 also has a bare `except Exception as e` that, if it catches a `ValueError` from `pd.read_csv`, prints and falls through to return the hardcoded stub DataFrame.** The ETL will then proceed with two-item mock data and exit with `exit_code = 0`, writing a two-row `data.json` to the repo without any failure signal — a silent data loss scenario.

**Fix:**
```python
# In get_mock_managed_items, distinguish between expected parse errors
# and unexpected errors, and propagate unexpected ones:
try:
    df = pd.read_csv(list_file, sep='\t')
    df['구분'] = '기타'
    return df
except (pd.errors.ParserError, pd.errors.EmptyDataError, UnicodeDecodeError) as e:
    print(f"Error loading list.txt (parse error): {e}")
    # fall through to hardcoded stub
except Exception as e:
    print(f"Unexpected error loading list.txt: {e}")
    raise  # do not silently fall back on unexpected errors
```

---

## Warnings

### WR-01: `GAS_WEB_APP_URL` read at module import time — cannot be overridden per-call

**File:** `etl_process.py:19`

**Issue:** `GAS_WEB_APP_URL = os.environ.get("GAS_WEB_APP_URL", "")` is evaluated once when the module is first imported. Any test that sets `os.environ["GAS_WEB_APP_URL"]` after import will not affect the value used by `fetch_managed_items` or `update_google_sheets`. This makes the module hard to test correctly and means `monkeypatch.setenv` in pytest will silently have no effect.

**Fix:** Read from `os.environ` at call time inside each function, or encapsulate configuration in a dataclass/config object passed as a parameter.

---

### WR-02: `time.sleep(5)` hardcoded after `wait.until` (line 100) — partially reverts Phase 1 fix

**File:** `etl_process.py:100`

**Issue:** A `time.sleep(5)` remains immediately after the `wait.until(EC.element_to_be_clickable(...))` on line 100. The explicit wait already blocks until the element is interactive; the additional 5-second sleep is the same pattern that Phase 1 was meant to eliminate. Similarly, `time.sleep(1)` on line 110 after `send_keys` has no functional justification.

**Fix:** Remove both fixed sleeps. If the KOFIA site requires a rendering settle time after the button appears, use a brief `WebDriverWait` for a visible state change rather than a fixed delay.

---

### WR-03: Grid CSS selector is untested and falls back to a 5-second sleep

**File:** `etl_process.py:127-136`

**Issue:** The `tr[id*='gridView'], div[id*='gridView'] tr` selector on line 129 is guessed from a "WebSquare common pattern" comment. If this selector does not match the actual KOFIA DOM, the `wait.until` raises `TimeoutException` after 30 seconds (the `WebDriverWait` timeout on line 95), the `except Exception` on line 133 catches it, and execution falls back to `time.sleep(5)`. The net effect in the failure case: a 30-second wait followed by a 5-second sleep, then proceeding to click the download button on a page that may not have loaded. This is worse than the original fixed `sleep(20)` in the failure path.

**Fix:** Verify the selector against the live KOFIA site before shipping. If the selector cannot be verified, lower the `WebDriverWait` timeout for the grid specifically (e.g., 15s) or use a more reliable signal such as absence of a loading spinner rather than presence of grid rows.

---

### WR-04: `_wait_for_download` inner polling loop has no sleep after failed glob — busy spin for 1 second granularity OK but missing `crdownload` re-trigger

**File:** `etl_process.py:36-43`

**Issue:** Between retry attempts (lines 46-49), the code waits `delay` seconds and then re-enters the inner while-loop. But the inner loop itself does nothing to re-trigger the download — it only polls the filesystem. If the download truly timed out because the server was slow, re-polling the same download directory without re-clicking the download button will never produce a new file. The retry logic gives a false impression of "retrying the download" when it is actually just "retrying the wait."

**Fix:** Either remove `max_retries` from `_wait_for_download` (making it a pure wait function with a single timeout), or move the retry loop up to `download_kofia_excel` where the click action can be re-issued.

---

### WR-05: Workflow does not inject `DOWNLOAD_DIR` — default path may not be writable in GitHub Actions

**File:** `.github/workflows/daily_update.yml:33`

**Issue:** `DOWNLOAD_DIR` defaults to a path relative to `__file__` (line 20 of `etl_process.py`). In GitHub Actions, the workspace is `/home/runner/work/<repo>/<repo>/`, which is writable. However, the default path is constructed with `os.path.dirname(os.path.abspath(__file__))`, which resolves correctly _only if_ `etl_process.py` is run from the repo root. If the working directory differs, `os.path.abspath(__file__)` may resolve to an unexpected location. The workflow's `run: python etl_process.py` does not set `working-directory`, so it defaults to the repo root — this works today but is fragile. Additionally, the created `downloads/` subdirectory is never committed (not in `file_pattern`) and not cleaned up on workflow failure, which can accumulate across runs if the runner is reused.

**Fix:**
```yaml
- name: Run ETL Script
  env:
    GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }}
    DOWNLOAD_DIR: /tmp/etf_downloads
  run: python etl_process.py
```

Using `/tmp` avoids polluting the workspace and is guaranteed writable.

---

### WR-06: `update_google_sheets` GAS POST has no `timeout` parameter

**File:** `etl_process.py:499`

**Issue:** `requests.post(GAS_WEB_APP_URL, json=data, ...)` on line 499 has no `timeout` argument. A hung GAS endpoint will cause the GitHub Actions job to block indefinitely (up to the 6-hour Actions timeout), burning CI minutes and delaying the auto-commit.

**Fix:** Add `timeout=30` (or a configurable constant) to the `requests.post` call.

---

## Info

### IN-01: Commented-out code left in production file

**File:** `etl_process.py:67-68, 522`

**Issue:** Two commented-out blocks remain: the headless option comment (`# options.add_argument("--headless")`) on lines 67-68, and the hardcoded test file path on line 522 (`# excel_file = os.path.join(...)`). These are debug/development artifacts.

**Fix:** Remove both commented-out lines before merging.

---

### IN-02: Magic number `90` used in multiple places for unrelated timeouts

**File:** `etl_process.py:23, 40, 154`

**Issue:** The value `90` appears as both the `timeout` parameter default in `_wait_for_download` and as the freshness threshold in the `getmtime` check (line 40). These are semantically different: one is the maximum wait duration, the other is the maximum file age. Using the same literal conflates two independent concerns and makes it easy to change one without realizing the other also changes.

**Fix:** Introduce named constants:
```python
DOWNLOAD_TIMEOUT_SEC = 90
DOWNLOAD_FRESHNESS_SEC = 90  # separate constant even if values coincide
```

---

### IN-03: `fetch_market_data_batch` bare `except Exception` (line 448) — already flagged but noted for completeness

**File:** `etl_process.py:448`

**Issue:** `fetch_market_data_batch` uses `except Exception as e` for all NAVER API errors. This is acceptable because the function is designed to be non-fatal, but the exception is not logged with `traceback.print_exc()`, making diagnosis harder when the API changes its schema. This is lower priority than CR-02 because the intent (non-fatal fallback) is clear.

**Fix:** Add `traceback.print_exc()` after the print statement on line 449 to capture the full stack trace in CI logs.

---

_Reviewed: 2026-04-30T00:00:00+09:00_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
