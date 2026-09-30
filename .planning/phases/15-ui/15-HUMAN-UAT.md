---
status: partial
phase: 15-ui
source: [15-VERIFICATION.md]
started: 2026-09-30T00:00:00Z
updated: 2026-09-30T00:00:00Z
---

## Current Test

[awaiting human testing — deferred to end of Phase 16 (user decision)]

## Tests

### 1. Browser smoke (15-07 Task 2 steps 1-6)
expected: fixture bar (1 selected / disabled link, 5th blocked with notice, kept across tabs, language switch); /compare/ table with "최저" badges; invalid/short codes notice + <2 guidance; overlay chart with dash/marker/legend, metric switch, "숫자로 보기"; calculator full-width input + URL round-trip + disclaimer below headline; 320px no page scroll, sticky first column, bar not covering footer
result: [pending]

### 2. Translation review ja/zh/vi/th/tl/km
expected: calc_disclaimer (legal), compare_bar_limit, calc_return read naturally and correctly
result: [pending]

### 3. Visual non-color cues and contrast
expected: lowest badge, chart series distinguishable without color, contrast OK
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
