---
phase: 11-script-js-seam-null-safe
verified: 2026-09-30T00:00:00Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
---

# Phase 11: script.js seam + null-safe 프런트엔드 Verification Report

**Phase Goal:** 사용자가 결측 수수료를 "-"로 보고, 결측 종목이 정렬 맨 뒤에 놓이며 가짜 배지가 없고, 이후 스크립트가 붙을 이음새가 준비된다
**Verified:** 2026-09-30
**Status:** passed
**Re-verification:** No — initial verification
**Implementation commit:** 4a43089 (script.js +52/-20, tests/fee_chart_check.js +46/-0)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | null 수수료 종목은 표에서 "-"(번역된 표시)로 보인다 | VERIFIED | `feeCellHtml` first line `if (!isValidFee(value)) return escapeHtml(missingValueText());` (script.js L1309); all four fee cells in renderTable row template (L897-900) go through feeCellHtml; `missingValueText()` uses `getTranslation("table_value_missing")` with "-" fallback. Test asserts `feeCellHtml(null,...) === "-"`, no fee-history-btn. |
| SC2 | 어떤 열로 정렬해도 결측 종목은 항상 맨 뒤 | VERIFIED | renderTable L870 sort uses `compareFeeNullLast(a[dataKeys.real], b[dataKeys.real], "asc")`; comparator returns 1/-1 for invalid regardless of direction. Only fee sort in file (other .sort() calls are changelog month / chart dates). Tests cover asc, desc, default. |
| SC3 | 결측 종목은 최저 표시와 변동 배지를 받지 않는다 | VERIFIED | `buildChangeBadgeHtml(changeData, item[dataKeys.real])` returns "" when real value invalid, diff non-finite or 0; `changelogEntryFromChange` drops entries with non-finite before/after (replaces inline `(change.after - change.before)`, grep count 0). No lowest/최저 marker exists in script.js (grep empty); null-last sort prevents a missing fund being first. |
| SC4 | 기존 tests/fee_chart_check.js 통과, script.js BOM+CRLF 보존 | VERIFIED | `node tests/fee_chart_check.js` -> "fee_chart_check OK", exit 0. script.js: BOM EF BB BF present, 1888 LF == 1888 CRLF. Test file: no BOM, 161 LF == 161 CRLF. |
| P1 | Missing value -> table_value_missing / "-" and no fee-history button | VERIFIED | Same as SC1; early return precedes button build. |
| P2 | Null-last in asc and desc | VERIFIED | Same as SC2. |
| P3 | No badge for missing real cost; non-finite changelog entries never become badges | VERIFIED | Same as SC3; test asserts all four "" cases plus up/down regressions. |
| P4 | Missing fund never ranked first; no new lowest marker added | VERIFIED | Diff adds no lowest marker; sort places invalid last. |
| P5 | Seams: etf:table-rendered after every renderTable, etf:data-ready after fetchData success, tr.dataset.code, buildFeeLinePath 4th startDate | VERIFIED | Guarded dispatch at L698 (fetchData try, after updateLastUpdated), L866 (empty branch before return), L926 (after forEach). `row.dataset.code` L882. `buildFeeLinePath(points, scale, today, startDate)` with `startDate \|\| points[0].date`; 3-arg caller unchanged; test asserts 4-arg undefined == 3-arg and startDate shifts x > 12. |
| P6 | test exits 0 and BOM+CRLF kept | VERIFIED | See SC4. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `script.js` | 5 helpers, seam events, dataset.code, startDate | VERIFIED | Each `function X(` grep count = 1; small hunks (52+/20-), not a rewrite |
| `tests/fee_chart_check.js` | Null fixtures for all helpers | VERIFIED | New "DATA-10 null-safe + seam (Phase 11)" section; sandbox unchanged (dispatchEvent count 0) |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| renderTable | compareFeeNullLast | sort comparator (L870) | WIRED |
| feeCellHtml | isValidFee / missingValueText | early return (L1309) | WIRED |
| fetchData changelog parse | changelogEntryFromChange | replaces inline diff (L672-673) | WIRED |
| renderTable / fetchData | document.dispatchEvent | guarded CustomEvent, 3 call sites | WIRED |
| renderTable | buildChangeBadgeHtml | changeHtml into real cell | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite incl. null fixtures | `node tests/fee_chart_check.js` | `fee_chart_check OK`, exit 0 | PASS |
| script.js encoding | python byte check | BOM True, LF 1888 = CRLF 1888 | PASS |
| test file encoding | python byte check | BOM False, LF 161 = CRLF 161 | PASS |

### Acceptance Greps

isValidFee/compareFeeNullLast/missingValueText/changelogEntryFromChange/buildChangeBadgeHtml = 1 each; `etf:data-ready` = 1; `etf:table-rendered` = 2; `document.dispatchEvent(new CustomEvent` = 3, all guarded by `typeof document.dispatchEvent === "function"`; `row.dataset.code` = 1; `startDate || points[0].date` = 1; comparator call = 1; `changelogEntryFromChange(change)` = 1; `(change.after - change.before)` = 0; `table_value_missing` = 2. No i18n/style/HTML changes in 4a43089.

### Probe Execution

No probes declared for this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| DATA-10 | 11-01 | SATISFIED | SC1-SC3 verified above ("-" display, null-last, no fake badge / lowest) |

No orphaned requirements (REQUIREMENTS.md maps only DATA-10 to Phase 11).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (commit 4a43089) | - | Commit also contains Phase 12 files `scripts/build_rss.py` (+193) and `tests/test_rss.py` (1 line) | Info | Parallel-stream staging overlap; does not affect Phase 11 goal. script.js hunk itself is clean. |

No TBD/FIXME/XXX/TODO in the Phase 11 diff.

### Human Verification Required

None blocking. Optional browser smoke (plan-marked non-blocking): a fund with null 실부담비용 shows "-", sits at the bottom, has no badge. Until Phase 14 adds the `table_value_missing` i18n keys, all locales show "-" by design (A1).

### Gaps Summary

No gaps. All roadmap success criteria and plan must-haves are implemented, wired, and covered by passing tests; file encodings are preserved.

---

_Verified: 2026-09-30_
_Verifier: Claude (gsd-verifier)_
