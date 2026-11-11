---
phase: 21-spike
plan: 01
subsystem: spike
tags: [license, data.go.kr, gate-0]
requires: []
provides: ["21-SPIKE.md public-evidence decision log"]
affects: [22-price-data]
key-files:
  created: [.planning/phases/21-spike/21-SPIKE.md]
decisions:
  - "License verdict: conditional fit for admin-only local use (no redistribution, non-commercial)"
  - "Front stack: vanilla JS, React not adopted"
  - "Backfill: scenario A (per-ticker range), 118-767 calls"
metrics:
  completed: 2026-11-11
---

# Phase 21 Plan 01: Gate-0 public evidence Summary

Gate-0 log written: 공공누리 4유형 quoted from the live portal page with verdict "조건부 적합" for admin-only local use, backfill estimate, vanilla-JS decision.

## Verified (this run)
- Portal page 15094806 re-fetched (curl, UTF-8): 4유형 wording, 재배포 금지 sentence, 개발계정 10,000 traffic, 갱신 시점, JSON+XML format.
- data.json has 59 entries.
- Metadata "제한 없음" conflict from RESEARCH not reproduced; page body says 4유형 everywhere.

## Assumed / unverified
- Calls 0.3-1s each, ~1,000 ETFs per day, 1,240 trading days.
- Response fields, numOfRows cap, basDt range, 수정주가, key encoding, endpoint path: key needed (plan 02).
- "ETF시세" operation name not isolated in page text parse; "일" unit of the 10,000 quota not stated on page.
- The license verdict is my reading of the text, not an official interpretation.

## Deviations
- WebFetch unavailable; used curl instead (same page). Created file needed `git add` before `commit --only`.

## Stubs
SPIKE-02 and SPIKE-05 sections intentionally say "plan 02에서 채움" (need user key).

## Commits
- f0bfe83: docs(21-01): gate-0 license verdict, backfill estimate, stack decision

## Self-Check: PASSED
