---
phase: 21-spike
plan: 02
subsystem: data-source-spike
tags: [data.go.kr, etf, spike, gate-0]
requires: [21-01]
provides: [gate-0 verdict, measured API facts for Phase 22]
affects: [22]
key-files:
  modified: [.planning/phases/21-spike/21-SPIKE.md]
decisions:
  - "Gate 0 verdict: conditional go (technical go; license for public redistribution open, user's call)"
  - "Closing price stored raw, split handled by warning only; CALC-06 40% threshold false-positives on leveraged/inverse ETFs"
metrics:
  completed: 2026-11-11
requirements-completed: [SPIKE-01, SPIKE-02, SPIKE-03, SPIKE-05]
---

# Phase 21 Plan 02: Live probe and gate-0 verdict Summary

Live data.go.kr calls (about 300, under the 800 abort line) confirm the ETF price API works for all 59 tickers; gate-0 verdict is conditional go with the redistribution license left as an open user decision.

## Measured (verified by live call)
- Endpoint: getETFPriceInfo works; the _V2 path returns NO_OPENAPI_SERVICE_ERROR.
- Key encoding: the 64-char hex key works both as-is and URL-encoded (identical forms).
- numOfRows cap 10000 (20000 request is clamped); avg latency 1.3 s; results are basDt descending.
- History starts 2020-08-07; one call per ticker returns the full 2021+ history, so backfill is 59 calls (about 80 s).
- 59/59 tickers found by exact srtnCd match, including 0026S0 and 0069M0; srtnCd has no prefix.
- Fields: basDt, srtnCd, isinCd, itmsNm, clpr, vs, fltRt, mkp, hipr, lopr, trqu, trPrc, mrktTotAmt, nPptTotAmt, nav, stLstgCnt, bssIdxIdxNm, bssIdxClpr.
- clpr, vs and fltRt are all unadjusted raw values (75 whole-market jumps over 30% since 2021, 0 mismatches between fltRt and raw change; 0 of the jumps are in the 59 tickers; 30 of 75 are 40% or more, all leveraged/inverse-type products).

## Not verified
- Daily quota unit and operating-account limit; official license interpretation; a real split/merge case; one-call full-market daily increment.

## Deviations from Plan
- Whole-market scan used instead of a single known split ETF (no known one available); it found no identifiable split. Policy recorded as raw plus warning.
- Checkpoint (key) satisfied via Windows user env var; key never printed or written.

## Security
Probe scripts and raw responses stayed in the scratchpad. Key prefix grep over tracked and worktree text files: clean.

## Self-Check: PASSED
