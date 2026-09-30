---
phase: 04-etl-단위-테스트
plan: A
subsystem: test-infrastructure
tags: [pytest, fixtures, ci, openpyxl, excel]
dependency_graph:
  requires: []
  provides:
    - pytest 테스트 환경 (requirements.txt + CI)
    - tests/conftest.py (primary/fallback/managed_df fixture)
    - tests/__init__.py (Python 패키지 마커)
  affects:
    - .github/workflows/daily_update.yml (pytest 단계 삽입)
tech_stack:
  added:
    - pytest 9.0.3 (requirements.txt)
  patterns:
    - openpyxl.Workbook() + ws.append() 방식 Excel fixture 생성
    - pytest tmp_path fixture로 임시 파일 격리
key_files:
  created:
    - tests/__init__.py
    - tests/conftest.py
  modified:
    - requirements.txt
    - .github/workflows/daily_update.yml
decisions:
  - "openpyxl로 코드에서 fixture 생성 (실제 KOFIA 파일 코드베이스 보관 없음, D-04)"
  - "pytest tmp_path 활용으로 테스트별 임시 파일 격리 (T-04A-01 mitigate)"
  - "CI Run unit tests 단계를 Run ETL Script 앞에 배치하여 테스트 실패 시 ETL 자동 차단 (D-10/D-11)"
  - "pip install -r requirements.txt 방식으로 CI 의존성 설치 일원화 (D-12)"
metrics:
  duration: "3m 28s"
  completed_date: "2026-05-20"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 04 Plan A: 테스트 환경 기반 구성 Summary

**One-liner:** openpyxl 기반 KOFIA primary/fallback Excel fixture와 managed_df fixture를 pytest conftest.py에 정의하고, CI daily_update.yml에 pytest 단계를 ETL 앞에 삽입하여 PLAN-B/C의 단위 테스트를 위한 공통 기반을 완성.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | requirements.txt에 pytest 추가 + CI 파이프라인 수정 | 2f0e528 | requirements.txt, .github/workflows/daily_update.yml |
| 2 | tests/ 디렉토리 생성 및 conftest.py 작성 | 0b60c4b | tests/__init__.py, tests/conftest.py |

## What Was Built

### Task 1: pytest 의존성 및 CI 통합

- `requirements.txt`에 `pytest` 한 줄 추가 — CI와 로컬 개발 환경 모두 `pip install -r requirements.txt`로 일괄 설치 가능
- `daily_update.yml`의 `Install dependencies` 단계를 `pip install -r requirements.txt` 방식으로 교체 (기존: 패키지 직접 나열)
- `Run unit tests` 단계 (pytest tests/ -v) 를 `Run ETL Script` 단계 앞에 삽입 — 테스트 실패 시 ETL 자동 차단 (D-11)

### Task 2: tests/ 디렉토리 및 fixture

- `tests/__init__.py`: Python 패키지 마커 (빈 파일)
- `tests/conftest.py`: 3개 fixture 정의
  - `kofia_primary_xlsx(tmp_path)`: KOFIA 표준 구조 — 상위 3행 메타데이터, 4행(index=3)에 `합계(A)` + `표준코드` 포함 헤더, 데이터 3행 (KR7360750004, KR7133690008, KR9999999999 더미)
  - `kofia_fallback_xlsx(tmp_path)`: fallback 구조 — `합계(A)` 없이 `매매수수료율` 포함 헤더, 데이터 2행
  - `managed_df_primary()`: process_data() 테스트용 pandas DataFrame (KR7360750004, KR7133690008 2종목)

## Verification Results

```
grep "^pytest$" requirements.txt              → pytest
grep "pip install -r requirements.txt" ...   → 성공
grep "pytest tests/ -v" ...                  → 성공
grep "def kofia_primary_xlsx|..." conftest.py → 3줄 출력
python -m pytest tests/ --collect-only       → 에러 없이 완료 (0 items collected)
```

## Deviations from Plan

None - 플랜 그대로 실행됨.

## Known Stubs

None.

## Threat Flags

해당 없음 — 새로 추가된 네트워크 엔드포인트, 인증 경로, 파일 접근 패턴 없음. pytest tmp_path 사용으로 테스트별 파일 격리 (T-04A-01 accept).

## Self-Check: PASSED

- [x] tests/__init__.py 존재: FOUND
- [x] tests/conftest.py 존재: FOUND
- [x] requirements.txt에 pytest: FOUND
- [x] daily_update.yml에 pip install -r requirements.txt: FOUND
- [x] daily_update.yml에 pytest tests/ -v: FOUND
- [x] daily_update.yml에서 Run unit tests(line 30) < Run ETL Script(line 33): CONFIRMED
- [x] Task 1 커밋 2f0e528: FOUND
- [x] Task 2 커밋 0b60c4b: FOUND
- [x] pytest --collect-only 에러 없음: CONFIRMED
