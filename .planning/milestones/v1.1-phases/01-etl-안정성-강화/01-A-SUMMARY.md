---
plan: 01-A
phase: 1
status: complete
completed: 2026-04-30
self_check: PASSED
key-files:
  created: []
  modified:
    - etl_process.py
    - .github/workflows/daily_update.yml
---

# Plan 01-A: GAS URL 환경변수화 Summary

## What Was Built

GAS Web App URL 하드코딩을 제거하고 환경 변수 기반으로 전환했다. ETL 실행 전 필수 환경 변수를 검사하여 미설정 시 명확한 오류 메시지와 함께 즉시 종료하도록 했다.

## Changes Made

### etl_process.py
- `GAS_WEB_APP_URL` 하드코딩 제거 → `os.environ.get("GAS_WEB_APP_URL", "")` 로 교체
- `DOWNLOAD_DIR` → `os.environ.get("DOWNLOAD_DIR", ...)` 로 교체 (기본값: 스크립트 디렉토리 내 `downloads/`)
- `__main__` 진입점에 GAS_WEB_APP_URL 미설정 시 `sys.exit(1)` 조기 종료 추가
- DOWNLOAD_DIR 미존재 시 자동 생성 (`os.makedirs`)
- `fetch_managed_items()` 불필요한 URL 존재 체크 제거, `timeout=30` 추가

### .github/workflows/daily_update.yml
- `Run ETL Script` 스텝에 `env.GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }}` 추가
- 필요 secrets 목록을 job-level `env` 블록에 주석으로 문서화

## Verification

- `grep -c "AKfycbwx" etl_process.py` = 0 ✓ (하드코딩 URL 완전 제거)
- `grep -c "os.environ.get.*GAS_WEB_APP_URL" etl_process.py` = 1 ✓
- `grep -c "GAS_WEB_APP_URL이 설정되지 않았습니다" etl_process.py` = 1 ✓
- `grep -c "sys.exit(1)" etl_process.py` = 1 ✓
- `grep -c "secrets.GAS_WEB_APP_URL" daily_update.yml` = 1 ✓
- Python syntax: ok ✓

## Self-Check: PASSED

모든 수락 기준을 충족했다. GAS URL이 소스코드에서 완전히 제거되었고, 환경 변수 미설정 시 즉시 종료된다.
