---
phase: 02-데이터-무결성-검증
verified: 2026-05-20T06:30:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 2: 데이터 무결성 검증 Verification Report

**Phase Goal:** ETL 결과 데이터가 유효한지 자동으로 검증하여 잘못된 데이터가 사이트에 배포되는 것을 방지한다.
**Verified:** 2026-05-20T06:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ETL 실행 시 실부담비용이 0~5% 범위를 벗어나면 [WARNING] DATA-01 경고가 stdout에 출력된다 | VERIFIED | `etl_process.py` line 407: `f"[WARNING] DATA-01: ..."`. Spot-check with cost=6.0 produced `[WARNING] DATA-01: TestETF 실부담비용 6.0000% — 정상 범위(0.0~5.0%) 이탈` |
| 2 | ETL 실행 시 final_data 내 종목코드 중복이 있으면 [WARNING] DATA-02 경고가 stdout에 출력된다 | VERIFIED | `etl_process.py` line 419: `f"[WARNING] DATA-02: ..."`. Spot-check with duplicate code 'A' produced `[WARNING] DATA-02: 중복 종목코드 발견 (1건): A` |
| 3 | ETL 실행 시 실부담비용이 이전 data.json 대비 ±1.0 이상 변동하면 [WARNING] DATA-03 경고가 stdout에 출력된다 | VERIFIED | `etl_process.py` line 435: `f"[WARNING] DATA-03: ..."`. Spot-check with delta=2.0%p produced `[WARNING] DATA-03: TestETF 실부담비용 급변 감지 — 이전: 0.5000%, 현재: 2.5000%, 변동폭: 2.0000%p (임계값: ±1.0%p)` |
| 4 | 경고 출력 후 ETL이 중단되지 않고 data.json에 정상적으로 쓰기가 계속된다 | VERIFIED | `validate_etl_results()` (lines 389–440) contains zero `exit_code` assignments. `exit_code` only modified at lines 586, 618, 621, 633 — all outside the validation function. Function returns None with no exception raising. |
| 5 | data.json이 없을 때 prev_data=None으로 처리되어 DATA-03 이상치 감지를 건너뛴다 | VERIFIED | `etl_process.py` lines 590–598: `prev_data = None` init, `except FileNotFoundError` prints skip message and leaves `prev_data = None`. Line 425: `if prev_data is not None:` guards DATA-03 block. Spot-check with `prev_data=None` printed `NO_DATA03_WARNING_OK` with no DATA-03 warning. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `etl_process.py` | `validate_etl_results(results, prev_data)` function — DATA-01/02/03 soft-warning | VERIFIED | Function at line 389, 52 lines of substantive logic (three validation blocks), called at line 602 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `__main__` block | `validate_etl_results(final_data, prev_data)` | `if final_data:` guard at line 601–602 | WIRED | Call confirmed at line 602, after `process_data()` try/except (line 583–587), before `fetch_market_data_batch()` (line 608) |
| `__main__` block | `data.json` prev_data load | `open(json_path, 'r', encoding='utf-8')` → `json.load(f)` → `FileNotFoundError`/`json.JSONDecodeError` → `None` | WIRED | Lines 590–598 implement the full fallback chain |

### Data-Flow Trace (Level 4)

Not applicable — `validate_etl_results()` is a pure function that reads from the `results` list passed by the caller and writes only to stdout. No dynamic rendering or DB queries involved.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DATA-01 fires for cost=6.0% | `mod.validate_etl_results([{..., '실부담비용': 6.0}], None)` | `[WARNING] DATA-01: TestETF 실부담비용 6.0000% — 정상 범위(0.0~5.0%) 이탈` | PASS |
| DATA-02 fires for duplicate code 'A' | `mod.validate_etl_results([{코드:'A',...},{코드:'A',...}], None)` | `[WARNING] DATA-02: 중복 종목코드 발견 (1건): A` | PASS |
| DATA-03 fires for delta 2.0%p vs prev | `mod.validate_etl_results([{...,비용:2.5}], [{코드:'A',비용:0.5}])` | `[WARNING] DATA-03: TestETF 실부담비용 급변 감지 — 이전: 0.5000%, 현재: 2.5000%, 변동폭: 2.0000%p (임계값: ±1.0%p)` | PASS |
| DATA-03 skipped when prev_data=None | `mod.validate_etl_results([{...,비용:2.5}], None)` | `NO_DATA03_WARNING_OK` (no DATA-03 warning in output) | PASS |
| Python syntax clean | `ast.parse(open('etl_process.py').read())` | `OK` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DATA-01 | 02-PLAN-A | ETL 처리 후 수수료 값이 유효 범위(0~5%)인지 검증한다 | SATISFIED | `[WARNING] DATA-01:` block at lines 400–409, COST_MIN=0.0 COST_MAX=5.0, spot-check confirmed |
| DATA-02 | 02-PLAN-A | 중복 종목코드 감지 및 경고 로직이 존재한다 | SATISFIED | `[WARNING] DATA-02:` block at lines 411–421, spot-check confirmed |
| DATA-03 | 02-PLAN-A | ETL 결과가 이전 data.json과 비교하여 이상치(급격한 변동)를 감지한다 | SATISFIED | `[WARNING] DATA-03:` block at lines 423–439, ANOMALY_THRESHOLD=1.0%p, spot-check confirmed |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODOs, FIXMEs, placeholder returns, empty handlers, or stub patterns found in `validate_etl_results()` or the `__main__` wiring block (lines 589–602).

### Human Verification Required

None. All must-haves are verifiable programmatically and all spot-checks passed.

### Gaps Summary

No gaps. All five must-haves are verified with behavioral evidence from live code execution.

---

## Commit Evidence

| Commit | Message |
|--------|---------|
| `19cf448` | feat(02-A): add validate_etl_results() function for data integrity checks |
| `d133f95` | feat(02-A): wire validate_etl_results() into __main__ block |

---

_Verified: 2026-05-20T06:30:00Z_
_Verifier: Claude (gsd-verifier)_
