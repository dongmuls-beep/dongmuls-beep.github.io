---
phase: 01-etl-안정성-강화
verified: 2026-04-30T00:00:00Z
status: gaps_found
score: 11/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "ETL 실행 중 예외 발생 시 bare except 대신 구체적 예외 타입(requests.exceptions.*, selenium.common.exceptions.*, pd.errors.*, OSError 등)을 사용하여 잡는다"
    status: partial
    reason: "Plan C가 지정한 3개 위치(fund name 입력, GAS fetch, Excel 처리)는 모두 구체적 예외 타입으로 교체되었다. 그러나 4개의 bare except: 블록이 잔존한다: line 142(Excel 버튼 XPATH 탐색), line 145(Excel 버튼 CSS 탐색), line 167(스크린샷 저장), line 333(p_float 수수료 파싱 헬퍼). 특히 line 333의 p_float bare except는 수수료 값 파싱 실패를 0.0으로 침묵 처리하여 잘못된 데이터를 조용히 생성할 수 있다 — 코드 리뷰 CR-02에서도 Critical로 분류됨."
    artifacts:
      - path: "etl_process.py"
        issue: "line 142, 145: Excel 버튼 탐색에 bare except: 잔존 (NoSuchElementException으로 교체 필요)"
      - path: "etl_process.py"
        issue: "line 167: 스크린샷 저장에 bare except: 잔존 (except Exception: pass로 교체 가능)"
      - path: "etl_process.py"
        issue: "line 333: p_float() 헬퍼에 bare except: 잔존 — 수수료 파싱 실패를 0.0으로 침묵 처리하여 데이터 오염 위험 (Critical)"
    missing:
      - "line 142-145의 bare except:를 except NoSuchElementException:으로 교체"
      - "line 167의 bare except:를 except Exception: pass로 교체"
      - "line 333의 bare except:를 except (ValueError, TypeError, AttributeError):로 교체"
---

# Phase 1: ETL 안정성 강화 Verification Report

**Phase Goal:** ETL 스크립트의 신뢰성과 보안성을 강화하여 배포 실패와 침묵 오류를 제거한다
**Verified:** 2026-04-30T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | etl_process.py를 실행하면 GAS_WEB_APP_URL 환경 변수가 없을 때 명확한 에러 메시지를 출력하고 즉시 종료한다 | ✓ VERIFIED | line 508-512: `if not GAS_WEB_APP_URL: print("ERROR: 환경 변수 GAS_WEB_APP_URL이 설정되지 않았습니다.") ... sys.exit(1)` |
| 2 | GitHub Actions 워크플로우가 secrets.GAS_WEB_APP_URL을 환경 변수로 주입한다 | ✓ VERIFIED | daily_update.yml line 32-33: Run ETL Script 스텝에 `env: GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }}` |
| 3 | etl_process.py 소스코드에 실제 GAS URL 문자열이 남아 있지 않다 | ✓ VERIFIED | `grep AKfycbwx etl_process.py` = 0 matches. line 19: `GAS_WEB_APP_URL = os.environ.get("GAS_WEB_APP_URL", "")` |
| 4 | DOWNLOAD_DIR이 환경 변수 또는 시스템 임시 디렉토리로 대체된다 | ✓ VERIFIED | line 20: `DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads"))` |
| 5 | 검색 클릭 후 고정 20초 sleep이 사라지고, 데이터 그리드가 실제로 로드되면 즉시 다음 단계로 진행한다 | ✓ VERIFIED | `grep "time.sleep(20)"` = 0 matches. line 122-136: WebDriverWait + EC.presence_of_element_located 로 그리드 대기, 실패 시 5초 폴백 |
| 6 | Excel 다운로드 감지 루프가 실패할 때마다 대기 시간이 두 배씩 늘어난다 (지수 백오프) | ✓ VERIFIED | line 49: `delay *= 2  # 지수 백오프: 2 -> 4 -> 8초` — `_wait_for_download` 함수에 구현됨 |
| 7 | 최대 재시도 횟수(3회)를 초과하면 명확한 에러 메시지와 함께 None을 반환한다 | ✓ VERIFIED | line 51: `print(f"Download timed out after {max_retries} attempts.")` 후 `return None` (line 53) |
| 8 | 다운로드 감지에 .crdownload 임시 파일이 완전히 사라졌는지 확인하는 조건이 포함된다 | ✓ VERIFIED | line 34: `crdownload_files = glob.glob(os.path.join(download_dir, "*.crdownload"))`, line 37: `if all_files and not crdownload_files:` |
| 9 | ETL 실행 중 예외 발생 시 bare except 대신 구체적 예외 타입(requests.exceptions.*, selenium.common.exceptions.*, pd.errors.*, OSError 등)을 사용하여 잡는다 | ✗ PARTIAL | 3개 핵심 위치(fund name, GAS fetch, Excel 처리)는 변환됨. 그러나 4개 bare except: 잔존: line 142(Excel XPATH), line 145(Excel CSS), line 167(스크린샷), line 333(p_float 수수료 파싱 — 가장 위험) |
| 10 | process_data()가 Excel 처리 중 예외를 잡을 때 트레이스백 전체를 출력하고 빈 리스트 대신 예외를 재발생시킨다 | ✓ VERIFIED | line 371-387: EmptyDataError, ValueError, OSError, Exception 모두 `traceback.print_exc()` 후 `raise`. line 529-534: `__main__`에서 `exit_code=1` 처리 |
| 11 | header_idx 결정 후 필수 컬럼(표준코드, 합계(A))이 실제로 존재하는지 검사하고, 없으면 ValueError를 발생시킨다 | ✓ VERIFIED | line 261-283: `REQUIRED_COLUMNS` 딕셔너리로 표준코드·합계(A)/총보수 검사, 누락 시 `raise ValueError(...)` |
| 12 | 컬럼 유효성 검사 실패 시 실제로 발견된 컬럼 목록을 에러 메시지에 포함한다 | ✓ VERIFIED | line 278-282: `f"실제 발견된 컬럼 ({len(actual_cols)}개): {actual_cols}"` 포함된 ValueError 메시지 |

**Score:** 11/12 truths verified (1 partial → FAILED)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `etl_process.py` | 환경 변수 읽기 + 조기 종료 + 지수 백오프 + 구체적 예외 처리 + 컬럼 검증 | ⚠️ PARTIAL | 핵심 구현 완료, 단 4개 bare except: 잔존 (line 142, 145, 167, 333) |
| `.github/workflows/daily_update.yml` | GitHub Actions secrets 주입 | ✓ VERIFIED | Run ETL Script 스텝에 env.GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }} 정상 주입 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.github/workflows/daily_update.yml` | `etl_process.py` | `env: GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }}` | ✓ WIRED | daily_update.yml line 32-33 확인 |
| `etl_process.py` | GAS_WEB_APP_URL 환경 변수 | `os.environ.get('GAS_WEB_APP_URL')` | ✓ WIRED | line 19 확인 |
| `process_data()` | KOFIA Excel 컬럼 | REQUIRED_COLUMNS 검사 후 ValueError 발생 | ✓ WIRED | line 261-283 확인 |
| `fetch_managed_items()` | GAS API | `requests.exceptions.RequestException` | ✓ WIRED | line 184-195 확인 |

---

### Data-Flow Trace (Level 4)

해당 없음 — 이 Phase는 API/UI 렌더링이 아닌 ETL 스크립트 신뢰성 강화이므로 Level 4 Data-Flow 추적 대상 아님.

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — 서버/Selenium 세션 없이는 실행 불가. 단, 코드 구조 분석으로 대체 검증 완료.

| Behavior | Check Method | Result | Status |
|----------|-------------|--------|--------|
| GAS_WEB_APP_URL 미설정 시 sys.exit(1) | line 508-512 코드 구조 확인 | `if not GAS_WEB_APP_URL: ... sys.exit(1)` 존재 | ✓ PASS |
| 하드코딩 URL 제거 | grep AKfycbwx | 0 matches | ✓ PASS |
| 지수 백오프 핵심 라인 | grep "delay \*= 2" | line 49 확인 | ✓ PASS |
| REQUIRED_COLUMNS 검사 존재 | grep REQUIRED_COLUMNS | line 262, 272 확인 | ✓ PASS |
| bare except: 잔존 여부 | grep "except:" | line 142, 145, 167, 333 — 4건 잔존 | ✗ FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ETL-01 | 01-PLAN-A | GAS Web App URL이 환경 변수(GAS_WEB_APP_URL)로 관리된다 | ✓ SATISFIED | etl_process.py line 19, daily_update.yml line 33 |
| ETL-02 | 01-PLAN-B | Selenium 다운로드 재시도 로직이 지수 백오프를 사용한다 | ✓ SATISFIED | `_wait_for_download` 함수, delay *= 2, max_retries=3 |
| ETL-03 | 01-PLAN-C | ETL 에러 시 구체적인 예외 타입과 컨텍스트가 로깅된다 | ⚠️ PARTIAL | 3개 핵심 위치 변환 완료, 4개 bare except: 잔존 |
| ETL-04 | 01-PLAN-C | KOFIA Excel 헤더 행 감지 전 예상 컬럼명 유효성 검사를 수행한다 | ✓ SATISFIED | REQUIRED_COLUMNS 검사 블록, ValueError with actual_cols |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `etl_process.py` | 142 | `except:` (bare) — Excel XPATH 탐색 실패 | ⚠️ Warning | 모든 예외 타입 침묵 처리 |
| `etl_process.py` | 145 | `except:` (bare) — Excel CSS 탐색 실패 | ⚠️ Warning | 모든 예외 타입 침묵 처리 |
| `etl_process.py` | 167 | `except:` (bare) — 스크린샷 저장 실패 | ℹ️ Info | 디버깅 경로, 영향 낮음 |
| `etl_process.py` | 333 | `except:` (bare) — p_float() 수수료 파싱 | 🛑 Blocker | 파싱 실패를 0.0으로 침묵 처리 → 수수료 데이터 오염 위험 |
| `etl_process.py` | 448 | `except Exception as e` — NAVER API (traceback 없음) | ℹ️ Info | 비치명적이나 진단 어려움 (코드 리뷰 IN-03) |

**Note:** 코드 리뷰(01-REVIEW.md) CR-02에서 line 333의 `p_float` bare except를 Critical 등급으로 이미 식별함.

---

### Human Verification Required

없음 — 모든 검증 대상은 코드 정적 분석으로 확인 가능.

---

### Gaps Summary

**1개 갭, 근본 원인 1개:**

Plan C의 must-have truth 1("bare except 대신 구체적 예외 타입")이 부분적으로만 구현되었다. Plan C의 Task 1은 3개의 특정 위치(fund name 입력, GAS fetch, Excel 처리 전체)를 타겟으로 지정하여 모두 올바르게 변환했다. 그러나 파일 내 4개의 bare `except:` 블록이 잔존한다.

**가장 심각한 잔존 항목:** line 333 (`p_float` 헬퍼)
- `p_float`는 모든 수수료 값(총보수, 기타비용, 매매중개수수료)을 파싱하는 데 사용된다
- bare `except:` 가 `TypeError`, `AttributeError` 등 예상치 못한 예외를 `0.0`으로 침묵 처리한다
- KOFIA Excel 셀이 병합 셀이거나 pandas Series 객체를 반환하면 수수료가 0%로 기록된다
- 이는 사용자에게 노출되는 데이터 오류로, Phase 1의 핵심 목표("침묵 오류 제거")에 직접 위배된다

**나머지 3개 항목 (line 142, 145, 167):**
- line 142/145: Selenium NoSuchElementException으로 교체 가능, 현재는 Selenium 외 예외도 침묵 처리
- line 167: 스크린샷 저장은 디버깅 경로로 영향이 낮지만 bare except: 패턴 자체는 수정 필요

**수정 방향:**
```python
# line 142-145
except NoSuchElementException:
    try:
        excel_btn = driver.find_element(By.CSS_SELECTOR, "#btnExcel, #excelDown")
    except NoSuchElementException:
        print("Excel button not found!")
        return None

# line 167
except Exception:
    pass

# line 333
except (ValueError, TypeError, AttributeError):
    return 0.0
```

---

_Verified: 2026-04-30T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
