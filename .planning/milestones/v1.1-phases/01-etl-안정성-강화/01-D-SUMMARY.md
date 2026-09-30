---
plan: 01-D
phase: 1
status: complete
completed: 2026-04-30
gap_closure: true
self_check: PASSED
key-files:
  created: []
  modified:
    - etl_process.py
---

# Plan 01-D: bare except: 4개 완전 제거 Summary

## What Was Built

etl_process.py에 잔존하던 4개의 bare `except:` 블록을 모두 구체적 예외 타입으로 교체했다. ETL-03 gap을 완전히 충족하여 Phase 1 검증 갭을 해소한다.

## Changes Made

### etl_process.py (commit f426725)

**변경 1 — Excel XPATH 버튼 탐색 (line 142):**
- `except:` → `except NoSuchElementException:`

**변경 2 — Excel CSS 버튼 탐색 (line 145):**
- `except:` → `except NoSuchElementException:`

**변경 3 — 스크린샷 저장 오류 핸들러 (line 167):**
- `except:` → `except Exception:`

**변경 4 — p_float() 수수료 파싱 헬퍼 (line 333, Critical):**
- `except:` → `except (ValueError, TypeError, AttributeError):`
- 수수료 파싱 실패를 0.0으로 침묵 처리하는 데이터 오염 위험 제거

## Verification

- `grep -c "except:" etl_process.py` = 0 ✓
- `grep -c "except NoSuchElementException" etl_process.py` = 2 ✓
- `grep -c "ValueError, TypeError, AttributeError" etl_process.py` = 1 ✓
- Python syntax: ok ✓ (bare except count: 0)

## Self-Check: PASSED

etl_process.py에 bare `except:` 블록이 0개다. p_float(), Excel 버튼 탐색(XPATH/CSS), 스크린샷 저장 모두 구체적 예외 타입을 사용한다. ETL-03 requirement 완전 충족.
