---
phase: 17-ci
verified: 2026-11-10T00:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 17: 데이터·CI 신뢰성 Verification Report

**Phase Goal:** CI가 피드 빌드 실패와 데이터 이상을 숨기지 않고 드러낸다
**Status:** passed
**Re-verification:** No

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | RSS 빌드 실패 시 CI 실패 표시 + 기존 feed.xml 유지 | VERIFIED | `scripts/build_rss.py` main() catches all exceptions, returns 1, leaves feed.xml untouched; invalid inputs return 1; writes atomic via tmp+os.replace. `daily_update.yml`: "Build RSS Feed" has `id: rss` + `continue-on-error: true`, placed before "Commit and Push"; final step "Fail if RSS build failed" (`if: steps.rss.outcome == 'failure'`) exits 1. Data still committed, then run fails. `tests/test_rss.py` test_main_fails_and_keeps_feed, test_main_bad_inputs_keep_feed assert rc==1 and feed preserved. |
| 2 | 269540/433330/476030 총보수 급락 원천 여부 근거와 함께 기록 | VERIFIED | `17-DATA12-EVIDENCE.md`: per-code before/after values with commit SHAs, peer comparison, verdict "genuine fee cut" for all three. Also records 2026-05-27 transient glitch (already fixed, 095948f). Caveat: external source unavailable, evidence is internal (git history + peers). |
| 3 | 원천 오류면 수정+재발 방지; 아니면 재발 방지 검사만 | VERIFIED | Verdict not an error, so no data fix required (data.json untouched). Recurrence check exists: `etl_process.py` L701-716 DATA-12 warns on 5x bidirectional 총보수 change vs previous data.json. `tests/test_validate.py::TestFeeRatioAnomaly` covers warn cases (0.05->0.0047, 0.3->0.0062, 0.005->0.05) and no-warn cases (small change, 0, None, prev None). |
| 4 | 실제 CI 로그에서 node 검사 단계 통과 확인 | VERIFIED | `gh run view 42822562694`: workflow_dispatch run on main, success, job build passed. `17-CI-RUN-EVIDENCE.md` lists node check step success and the node files run. Workflow has "Run compare and a11y node checks" step with `set -e` loop. Prior failing run 42822347993 root-caused (CRLF test) and fixed in 536e704. |

**Score:** 4/4

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `python -m pytest tests/ -q` | 396 passed | PASS |
| CI run | `gh run view 42822562694` | success, build job green | PASS |

## Requirements Coverage

| Req | Status | Evidence |
|-----|--------|----------|
| DATA-11 | SATISFIED | Truth 1 |
| DATA-12 | SATISFIED | Truths 2, 3 |
| CI-01 | SATISFIED | Truth 4 |

## Anti-Patterns

None blocking in verified files (no TBD/FIXME in DATA-12 block or build_rss.py main path).

## Notes (non-blocking)

- DATA-12 verdicts rest on internal evidence only (git history, peer comparison); manager notices not consulted. Revisit if a source disagrees.
- The "Fail if RSS build failed" failure path was not exercised on real GitHub (skipped in the passing run); covered by unit tests and workflow logic read only.
- Side finding: scheduled runs failed daily from at least 2026-10-31 (CRLF test), so data.json was stale; fixed by 536e704.

---

_Verified: 2026-11-10_
_Verifier: Claude (gsd-verifier)_
