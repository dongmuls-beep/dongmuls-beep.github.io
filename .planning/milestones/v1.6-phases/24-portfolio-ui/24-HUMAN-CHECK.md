# Phase 24 human browser check (deferred from plan 24-10 Task 2)

Automated headless-Chrome coverage is in 24-10-SUMMARY.md. Items below still need a human (real keyboard, real 320px viewport, Network tab, real file download).

1. From the repo root run `python -m http.server 8765` and open http://localhost:8765/portfolio/.
2. Keyboard only: Tab from the skip link; type "kodex" in 종목, use ArrowDown and Enter to pick one; enter quantity 10.5 and start date 2025-01-02; press 종목 추가. Expect the row, the summary, the fee line ("가중평균 총보수 ...% · 연간 예상 비용 약 ...원") and the chart.
3. Type "999999" as 종목 and submit: expect the inline error "목록에 있는 종목을 골라 주세요." and focus on 종목. Type quantity "1,5": expect the quantity error.
4. Add the same ETF again with another date: two rows remain. Press 수정 on one, change quantity, 변경 저장; press 삭제 on the other.
5. Press 1개월, 1년, 전체 chips: chart and table change, focus stays on the chip. Use ArrowLeft/Right on the chart: the readout under the chart changes.
6. Press 내보내기(JSON): a file downloads. Press 파일 가져오기 with that file: the overwrite dialog opens with focus on 그대로 두기; Escape closes it with no change; repeat and choose 파일로 덮어쓰기.
7. Switch the language select to English and Khmer: all page text changes, no raw pf_ keys visible.
8. Resize to 320px wide: one column, tables scroll horizontally, no page-level horizontal scroll.
9. Confirm no AdSense/analytics requests in the browser Network tab.

Reply "approved" or list issues.
