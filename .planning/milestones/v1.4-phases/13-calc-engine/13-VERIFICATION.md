---
phase: 13-calc-engine
verified: 2026-09-30T15:45:00+09:00
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 13: 계산기 엔진 Verification Report

**Phase Goal:** 실부담비용으로 누적 비용과 비용 감소액을 정확하게 계산하는 순수 함수가 테스트와 함께 준비된다
**Verified:** 2026-09-30
**Status:** passed
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | 일시금·보유기간·월 적립금·기대수익률 입력 -> 총 부담 비용(원)과 비용 감소액을 월 복리(월말 납입, 연율 월 환산)로 반환 | VERIFIED | `compare-calc.js` L54-76: g=(1+r)^(1/12), h=(1-f)^(1/12); loop grown=B*g, fee=grown*(1-h), B=grown*h+monthly (contribution after growth+fee = end of month); returns totalFees, costDrag=fvNoFee-fvWithFee |
| SC2 | 수수료율 퍼센트(/100) 처리, 손계산 값과 node 테스트 일치 | VERIFIED | L55 `feePct / 100`; test asserts H1-H6 closed forms + literals at 0.01 won; I independently recomputed H3/H4 in Python via closed-form geometric series (fvWithFee 165776734.3227, fvNoFee 170652107.5692, costDrag 4875373.2465, totalFees 4104773.3741, H3 totalFees 630180.5907) — all match |
| SC3 | 수수료 0%·기대수익률 0%·1년/50년 경계 | VERIFIED | Test "zero case" (fee 0, ret 0 -> exactly lump+monthly*36, fees/drag strictEqual 0), "fee0 positive return", H1 (1y), H5 (50y, months 600), clamping 0->1, 51/100->50, 10.4->10, NaN->1 |
| SC4 | 결측(null) 수수료 -> 제외 표시 | VERIFIED | `validateFee` L40-44 returns "fee_missing" for non-finite/non-number; simulate returns `{excluded:true, reason}` with no fv fields; test covers null/undefined/NaN/Infinity/"abc"/"0.5"/missing key; fee 0 NOT excluded |
| P1 | Monthly loop, end-of-month contribution, totalFees + costDrag | VERIFIED | Same as SC1 |
| P2 | Percent fees; closed-form match within tolerance | VERIFIED | Same as SC2 |
| P3 | Fee 0 zero drag; ret 0 fee 0 exact; 1/50 boundaries, clamp 1..50 | VERIFIED | Same as SC3; `normalizeInputs` L27-37 |
| P4 | null/undefined/non-finite fee -> excluded:true, not computed as 0 | VERIFIED | Same as SC4; also fee_invalid for -0.1 and 100 |
| P5 | compare: difference = FV(A)-FV(B), excluded if either fee missing | VERIFIED | `compare` L83-97; excludedSide a/b/both; test asserts all three and absence of difference when excluded |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `compare-calc.js` | Pure DOM-free engine, module.exports + global CompareCalc | VERIFIED | 121 lines, IIFE, ES5-style + Object.assign; no DOM/fetch/storage/toFixed (grep count 0); LF, no BOM |
| `tests/compare_calc_check.js` | assert-based node test, exit 0 on pass | VERIFIED | 206 lines, `require("assert")`, LF, no BOM |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| tests/compare_calc_check.js | compare-calc.js | `require(path.join(__dirname, "..", "compare-calc.js"))` | WIRED | Line 5 of test; test run exercises every export |

UI wiring (script.js / compare page) is intentionally out of scope — Phase 15 owns it; CI step is Phase 16.

### Data-Flow Trace (Level 4)

Not applicable — pure computation module, renders no dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite passes | `node tests/compare_calc_check.js` | "compare_calc_check: all assertions passed", exit 0 | PASS |
| Browser global load | vm context with globalThis, run compare-calc.js, `typeof CompareCalc.simulate` | "function" | PASS |
| Independent H3/H4 recomputation | Python closed-form geometric series | matches test literals to 4 decimals | PASS |
| No DOM/display rounding | grep document./fetch(/localStorage/toFixed | 0 hits | PASS |

### Probe Execution

No probes declared for this phase. SKIPPED.

### Scope / Untouched Files (per commit, not working tree)

- 720ce5d: only `tests/compare_calc_check.js` (+206)
- 0ea7dcf: only `compare-calc.js` (+121)
- 9986f37: only `.planning/phases/13-calc-engine/13-01-SUMMARY.md`
- No commit touches script.js, index.html, style.css, translations.js, or workflows. `CompareCalc` has 0 hits in script.js (no global collision).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CALC-02 | 13-01 | 종목별 총 부담 비용(원)과 비용 감소액, 월 복리(월말 납입, 실부담비용 연율 월 환산) | SATISFIED (engine level) | simulate/simulateMany return totalFees and costDrag per ETF code; UI surfacing is Phase 15 |

No orphaned requirements: REQUIREMENTS.md maps only CALC-02 to Phase 13.

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO markers in either file; no stub returns; no mutable module state.

Info: `simulate` passes the raw `feePct` through in results (only when valid); `annualReturnPct` values between -100 and -99 are clamped so `(1+r)` stays positive — matches T-13-03.

### Human Verification Required

None. Pure numeric module fully covered by automated assertions.

### Gaps Summary

No gaps. The engine exists, is substantive, is exercised by a passing test whose reference values were independently reproduced, and satisfies all four roadmap success criteria plus the plan must-haves.

---

_Verified: 2026-09-30_
_Verifier: Claude (gsd-verifier)_
