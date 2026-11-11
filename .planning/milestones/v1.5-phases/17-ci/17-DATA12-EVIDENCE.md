# DATA-12 Evidence: 총보수 drops (269540, 433330, 476030)

Collected 2026-11-10 from git history of data.json and fee-history.json.

Method: replayed `git show <sha>:data.json` for every data.json commit; compared 총보수 per code; compared against peer S&P500 / 나스닥100 ETFs at the same commits.

Side finding: on 2026-05-27 (commits 59b9a86, 9a8f04c) all three codes briefly carried wrong values (총보수 20170511.0 etc., then 0.215/0.034/0.029). Commit 095948f restored 0.3/0.05/0.05 the same day. That was a transient ETL/column glitch, already corrected, and is not the drop under review.

External source status: external source unavailable: executor had no web-fetch tool and `gh` is not authenticated (CI logs for "Mapped Columns" not retrievable). Evidence is therefore internal (git history + peer comparison).

## 269540 (PLUS 미국S&P500(H))

| Source | Value | Date | Ref |
|---|---|---|---|
| data.json before | 총보수 0.3, 기타 0.09, 매매중개 0.1389, 실부담 0.5289 | 2026-09-09 | 5add00f |
| data.json after | 총보수 0.0062, 기타 0.09, 매매중개 0.1422, 실부담 0.2384 | 2026-09-10 | b7ebaf4 |
| fee-history.json | [2026-02-12 0.3, 2026-09-10 0.0062] | | |
| Peer 429760 PLUS 미국S&P500 | 0.07 -> 0.0062 in same commit | 2026-09-10 | b7ebaf4 |
| Peers at b7ebaf4 | KODEX 379800 0.0062, ACE/RISE/SOL 0.0047, TIGER 0.0068 | 2026-09-10 | b7ebaf4 |

Reasoning: sibling PLUS 429760 dropped to the identical 0.0062 on the same day, and the value matches the sector-wide level. 기타비용 and 매매중개수수료 unchanged in scale. Consistent with the manager cutting both PLUS S&P500 products together. Caveat: a hedged (H) product at 0.0062 is lower than KODEX S&P500(H) 0.0099, which is plausible but not independently confirmed.

VERDICT: genuine fee cut

## 433330 (SOL 미국S&P500)

| Source | Value | Date | Ref |
|---|---|---|---|
| data.json before | 총보수 0.05, 기타 0.08, 매매중개 0.0543, 실부담 0.1843 | pre 2026-06-11 | bd1bc7d |
| data.json after | 총보수 0.0047, 기타 0.08, 매매중개 0.0658, 실부담 0.1505 | 2026-06-11 | a006cf9 |
| fee-history.json | [2026-02-12 0.05, 2026-06-11 0.0047] | | |
| Peers at a006cf9 | ACE 360200 0.0047, RISE 379780 0.0047, RISE(H) 453330 0.0047 | 2026-06-11 | a006cf9 |

Reasoning: new value equals the lowest peer cluster 0.0047; the same commit shows 476030 dropping too (same manager, SOL). Several ETFs moved at once, which is a sector fee cut, not a lone outlier.

VERDICT: genuine fee cut

## 476030 (SOL 미국나스닥100)

| Source | Value | Date | Ref |
|---|---|---|---|
| data.json before | 총보수 0.05, 기타 0.11, 매매중개 0.0877, 실부담 0.2477 | pre 2026-06-11 | bd1bc7d |
| data.json after | 총보수 0.0055, 기타 0.11, 매매중개 0.0885, 실부담 0.204 | 2026-06-11 | a006cf9 |
| fee-history.json | [2026-02-12 0.05, 2026-06-11 0.0055] | | |
| Peers at a006cf9 | 1Q 0069M0 0.0055, ACE 367380 / RISE 368590 / KODEX 379810 0.0062, TIGER 133690 0.0068 | 2026-06-11 | a006cf9 |

Reasoning: 0.0055 equals the 1Q 나스닥100 value and sits inside the 0.0055-0.0068 peer band. Not an outlier.

VERDICT: genuine fee cut

## Fix decision

No code receives a data or process_data fix. All three are consistent with a sector-wide fee cut (peers moved to the same values on the same dates; 기타비용 and 실부담비용 consistent). Verdicts rest on internal evidence only because external sources and CI logs were unavailable; if a manager page later shows otherwise, revisit. data.json, fee-history.json and changelog.json stay untouched. Task 2 adds only the DATA-12 recurrence warning.
