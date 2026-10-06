---
phase: 13-calc-engine
plan: 01
subsystem: calculator
tags: [calc, fee-drag, tdd, pure-js]
requires: []
provides:
  - "compare-calc.js: CompareCalc { LIMITS, normalizeInputs, validateFee, simulate, compare, simulateMany }"
  - "tests/compare_calc_check.js: assert-based node test (exit 0 on pass)"
affects:
  - "Phase 15 (UI wiring of CALC-01/03/04/05)"
  - "Phase 16 (CI node step)"
tech-stack:
  added: []
  patterns: ["ES5 IIFE with dual export (module.exports / global CompareCalc)", "monthly loop growth -> fee -> end-of-month contribution"]
key-files:
  created:
    - compare-calc.js
    - tests/compare_calc_check.js
  modified: []
decisions:
  - "Assumptions A1-A7 from the plan adopted as-is (fee percent /100, A2 monthly loop, years round+clamp 1..50, return default 0 clamp -99..100, missing fee -> fee_missing, no rounding)"
  - "(Review fix WR-01) Numeric strings are accepted for all inputs incl. fee via Number(); non-numeric/empty strings -> default (inputs) or fee_missing (fee). Comma/full-width parsing stays in Phase 15"
  - "(Review fix CR-01/WR-02/WR-03) lumpSum/monthly clamped to MAX_AMOUNT 1e12; non-finite result -> excluded reason overflow; results echo normalized inputs; fee > 5% computed with warning fee_high"
  - "simulate() with no feePct key is excluded fee_missing (not computed as 0)"
  - "compare() excluded results omit difference/feesDifference"
metrics:
  duration: "~5 min"
  completed: 2026-09-30
  tasks: 2
  files: 2
---

# Phase 13 Plan 01: Calculator Engine Summary

Pure, DOM-free fee-drag engine `compare-calc.js` (monthly compounding, (1-f)^(1/12) monthly fee conversion, end-of-month contribution) that returns total fees paid and cost drag vs. no-fee, with null/invalid fees returned as `excluded` instead of being treated as 0. Verified against hand-computed H1-H6 values within 0.01 won.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Failing node test (RED) | 720ce5d | tests/compare_calc_check.js |
| 2 | Implement engine (GREEN) | 0ea7dcf | compare-calc.js |

REFACTOR: not needed (engine is 121 lines, no cleanup warranted); no refactor commit.

## TDD Gate Compliance

- RED: `test(13-01)` commit 720ce5d — `node tests/compare_calc_check.js` exited non-zero with `Error: Cannot find module '...compare-calc.js'` (MODULE_NOT_FOUND, RED-OK).
- GREEN: `feat(13-01)` commit 0ea7dcf — `node tests/compare_calc_check.js` prints `compare_calc_check: all assertions passed`, exit 0.

## Verification

- H1-H6 all match literal and closed-form values within 0.01 won on first GREEN run (no engine adjustment needed).
- No BOM, no CR in either file (working tree). Note: `core.autocrlf=true` in this repo; blobs committed as LF.
- No DOM/fetch/localStorage/toFixed/fv rounding in compare-calc.js (grep count 0); `1 / 12` conversion present.
- vm browser-global check (`c.globalThis=c`) exits 0.
- `grep -c CompareCalc script.js` = 0 (no global collision); script.js not edited.
- `git show --stat` of both commits touches only compare-calc.js and tests/compare_calc_check.js.
- No package.json / CI changes (Phase 16 owns CI).

## Threat Mitigations

- T-13-01: years clamped 1..50 -> loop max 600 iterations.
- T-13-02: validateFee returns fee_missing for null/undefined/NaN/Infinity/non-numeric strings; never coerced to 0. Fee > 5% flagged warning fee_high.
- T-13-03: return clamped -99..100; fee must be 0 <= f < 100 else fee_invalid; amounts clamped to 1e12; non-finite result -> excluded overflow.

## Deviations from Plan

None - plan executed exactly as written. Minor test additions beyond the behavior list (all consistent with A1-A7): return clamp checks (500 -> 100, -500 -> -99), missing `feePct` key -> fee_missing, `simulateMany(inputs, null)` -> [], normalizeInputs(null/undefined) defaults, excluded compare has no `difference`.

Parallel-execution notes: STATE.md / ROADMAP.md / REQUIREMENTS.md intentionally not updated (orchestrator owns them, per override).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: compare-calc.js
- FOUND: tests/compare_calc_check.js
- FOUND: 720ce5d
- FOUND: 0ea7dcf
