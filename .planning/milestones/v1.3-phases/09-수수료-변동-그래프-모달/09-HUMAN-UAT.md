---
status: complete
phase: 09-수수료-변동-그래프-모달
source: [09-VERIFICATION.md]
started: 2026-09-30
updated: 2026-09-30
---

## Current Test

[complete — user approved 2026-09-30]

## Tests

### 1. 차트 왼쪽 여백 (WR-07, 48→56)
expected: 데스크톱·320/375px에서 Y축 라벨(예: 0.0047%) 잘림 없음, 차트 잘림 없음
result: pass

### 2. 포커스 (WR-04/05)
expected: 모달 열자마자 Shift+Tab 시 모달 안에서 순환; 닫으면 클릭한 수수료 버튼으로 복귀 (Safari 포함)
result: pass

### 3. 오버레이 닫기 (WR-01)
expected: 수수료 더블클릭 시 모달 유지; 모달 안에서 드래그 후 오버레이에서 놓아도 안 닫힘; 오버레이 한 번 클릭은 닫힘; 개인정보 모달도 동일
result: pass

### 4. 스크린리더 이름 (CR-01)
expected: 수수료 버튼 접근성 이름이 "0.0470% KODEX 200 총보수 변동 그래프 보기" 형태 (DevTools Accessibility 탭)
result: pass

### 5. 0 변동 표시 (WR-02)
expected: 변동폭 0인 행은 ▲/▼ 없이 "0.0000%p"; 같은 값 연속 점 없음
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
