---
phase: 02-데이터-무결성-검증
plan: A
subsystem: etl
tags: [python, data-validation, soft-warning, etl-integrity]

# Dependency graph
requires:
  - phase: 01-ETL-안정성-강화
    provides: process_data() 반환값(final_data) 구조, print([PREFIX]) 패턴, ETL __main__ 블록 구조

provides:
  - validate_etl_results(results, prev_data) 함수 — DATA-01/02/03 soft-warning 검증
  - __main__ 블록 내 prev_data 로드 + validate_etl_results() 호출 연결

affects: [04-ETL-단위-테스트, phase-4]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "soft-warning: 검증 실패 시 [WARNING] DATA-0X: 접두사 출력 후 ETL 계속 진행 (exit_code 변경 없음)"
    - "prev_data 로드: FileNotFoundError/json.JSONDecodeError → None fallback, ETL 미중단"
    - "순수 함수(pure function): validate_etl_results는 파일 I/O 없음 — Phase 4 단위 테스트 용이"

key-files:
  created: []
  modified:
    - etl_process.py

key-decisions:
  - "DATA-01/02/03 모두 soft-warning 방식 — exit_code 변경 없이 경고만 출력 (D-01~D-03)"
  - "validate_etl_results()는 순수 함수(파일 I/O 없음) — Phase 4 단위 테스트를 위한 설계 결정"
  - "DATA-03 임계값 ±1.0%p 절대 변동폭 기준 (상대 변동률 아님, D-05)"
  - "prev_data 로드를 __main__ 블록에서 직접 수행 — update_google_sheets() 스코프와 분리 (D-09)"

patterns-established:
  - "ETL 검증 삽입 위치 패턴: process_data() 직후, fetch_market_data_batch() 직전"
  - "prev_data None fallback: FileNotFoundError(첫 실행) + json.JSONDecodeError(손상) 모두 처리"

requirements-completed: [DATA-01, DATA-02, DATA-03]

# Metrics
duration: 2min
completed: 2026-05-20
---

# Phase 2 Plan A: 데이터 무결성 검증 Summary

**ETL soft-warning 검증 레이어 추가 — validate_etl_results()로 실부담비용 범위(DATA-01), 종목코드 중복(DATA-02), 이상치(DATA-03) 감지**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-20T05:51:12Z
- **Completed:** 2026-05-20T05:53:15Z
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments

- `validate_etl_results(results, prev_data)` 함수 추가 (etl_process.py line 389) — DATA-01/02/03 세 검증 블록 구현
- `__main__` 블록에 `prev_data` 로드 (data.json → None fallback) + `validate_etl_results()` 호출 삽입 (line 590~602)
- 모든 검증은 soft-warning 방식: `[WARNING] DATA-0X:` 접두사 출력 후 ETL 계속 진행 (exit_code 변경 없음)
- 순수 함수 설계 (파일 I/O 없음) — Phase 4 단위 테스트 용이

## Task Commits

Each task was committed atomically:

1. **Task 1: validate_etl_results() 함수 구현** - `19cf448` (feat)
2. **Task 2: __main__ 블록에 prev_data 로드 및 validate_etl_results() 호출 삽입** - `d133f95` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `etl_process.py` — validate_etl_results() 함수 추가 (line 389~441) + __main__ 블록 prev_data 로드/검증 호출 삽입 (line 590~602)

## Key Implementation Details

### validate_etl_results() 위치
- **함수 정의:** `etl_process.py` line 389 (`def validate_etl_results(results, prev_data):`)
- **삽입 위치:** `process_data()` 함수(line 218~388) 직후, `fetch_market_data_batch()` 함수(line 442~) 직전

### 세 가지 검증 규칙 (임계값 포함)

| 규칙 | 대상 필드 | 조건 | 임계값 | 경고 접두사 |
|------|----------|------|--------|------------|
| DATA-01 | `실부담비용` | 정상 범위 이탈 | 0.0% ~ 5.0% | `[WARNING] DATA-01:` |
| DATA-02 | `종목코드` | 중복 감지 | count > 1 | `[WARNING] DATA-02:` |
| DATA-03 | `실부담비용` | 이전 값 대비 급변 | ±1.0%p 이상 | `[WARNING] DATA-03:` |

### __main__ 삽입 위치

```
process_data() try/except 블록 (기존)
  ↓
[신규] prev_data 로드: open('data.json') → FileNotFoundError/json.JSONDecodeError → None
[신규] validate_etl_results(final_data, prev_data) — if final_data: 가드
  ↓
fetch_market_data_batch() 호출 (기존)
```

### Phase 4 (ETL 단위 테스트) 참고사항

`validate_etl_results()`는 순수 함수 (파일 I/O 없음):
- 입력: `results: List[dict]`, `prev_data: List[dict] | None`
- 출력: 없음 (경고는 stdout으로만)
- 단위 테스트 예시 (Phase 4에서 구현 예정):
  ```python
  # DATA-01 테스트: capsys fixture로 stdout 캡처
  validate_etl_results([{'종목코드': 'A', '종목명': 'T', '실부담비용': 6.0}], None)
  # → captured.out에 '[WARNING] DATA-01:' 포함 확인
  ```

## Decisions Made

- DATA-01/02/03 모두 soft-warning 방식 채택 — ETL 파싱 버그 조기 감지가 목적이므로 중단 없이 경고만 출력 (D-01~D-03)
- `validate_etl_results()`를 순수 함수로 설계 — 파일 I/O를 제거해 Phase 4 단위 테스트 용이성 확보
- `prev_data` 로드를 `__main__`에서 직접 수행 — `update_google_sheets()` 내부 스코프(쓰기 전용)와 읽기 책임 분리 (D-09)
- 이상치 기준 ±1.0%p 절대 변동폭 — 상대 변동률이 아닌 절대값 기준 (소규모 수수료에서 상대값 과민 문제 방지, D-05)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Windows 콘솔 인코딩 (cp949):** 로컬 검증 시 em dash(`—`) 문자가 Windows PowerShell에서 `UnicodeEncodeError`를 발생시켰다. ETL은 GitHub Actions(Linux/UTF-8)에서만 실행되므로 프로덕션 영향 없음. 로컬 검증은 `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` 래퍼로 우회하여 모든 기능 검증 완료.

## Next Phase Readiness

- DATA-01/02/03 요구사항 충족 완료 — Phase 2 목표 달성
- `validate_etl_results()`는 순수 함수이므로 Phase 4 단위 테스트에서 바로 가져다 쓸 수 있음
- Phase 3 (XSS 취약점 개선)는 프론트엔드 변경 — 이 Phase와 독립적

## Self-Check: PASSED

- etl_process.py: FOUND
- 02-A-SUMMARY.md: FOUND
- Commit 19cf448: FOUND (feat(02-A): add validate_etl_results() function)
- Commit d133f95: FOUND (feat(02-A): wire validate_etl_results() into __main__ block)

---
*Phase: 02-데이터-무결성-검증*
*Completed: 2026-05-20*
