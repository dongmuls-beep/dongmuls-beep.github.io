---
phase: 25-finish-verify
verified: 2026-11-21T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
gaps: []
human_verification:
  - test: "Native-language review of pf_notice_*, pf_backup_*, pf_disclaimer_*, nav_portfolio copy in vi/zh/ja/th/tl/km"
    expected: "Natural, accurate wording; disclaimer meaning preserved"
    why_human: "Translation quality cannot be judged programmatically"
  - test: "Real-device layout of /portfolio/ notice, backup line, disclaimer and header nav link (incl. narrow mobile)"
    expected: "No overflow or overlap"
    why_human: "Visual"
  - test: "Run .planning/phases/24-*/24-HUMAN-CHECK.md checklist"
    expected: "All items pass"
    why_human: "Deferred by CONTEXT to a human"
  - test: "Decision: accept noindex-precedent reading of NAV-01 sitemap/RSS/structuredData"
    expected: "Owner confirms, or asks to enable indexing in a later phase"
    why_human: "Product/SEO decision"
---

# Phase 25 Verification

Evidence is from my own runs and the repo, not from the SUMMARY claims.

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | SAFE-01: first-visit notice, persist request, backup age | VERIFIED | portfolio-view.js has `pf_v1_noticeDismissed`, `s.persist()`, `Format.backupStatus(store.lastBackup()...)` and `Format.noticeLines`. All 8 i18n packs carry the keys. portfolio_view_check.js passes. |
| 2 | SAFE-02: always-visible disclaimer, no ads or analytics | VERIFIED | `#pf-disclaimer` in index.html is not collapsible. Text: 종가 기준 / 분배금·분할·병합 미반영 / 투자 자문 아님. The as-of date comes from `pf_disclaimer_asof` filled from `result.asOf`. No adsbygoogle, gtag or script.js under portfolio/. portfolio-shell.js says it does not load /script.js. The live HTML has no adsbygoogle, gtag or analytics. |
| 3 | NAV-01: link in exactly 9 pages, one revert-able commit | VERIFIED | `git show --stat 235188e` shows one commit: the 9 HTML pages, 8 i18n packs, style.css and 2 tests. A grep finds the link in exactly the 9 nav pages. tests/test_nav_portfolio.py enforces the count. Revert of this commit removes the link. |
| 3b | NAV-01: sitemap/feed/structuredData | VERIFIED (interpretation) | portfolio/index.html is `noindex,follow`. sitemap.xml and feed.xml have 0 portfolio entries. This follows the `/compare/` noindex precedent. I judge it reasonable: listing a noindex URL in a sitemap contradicts the directive. The literal requirement wording ("수정") is not literally met, so it is flagged for owner acceptance (human item 4). |
| 4 | VERIFY-01 as redefined in CONTEXT | VERIFIED | Local run: pytest 483 passed, all 15 tests/*_check.js OK. Live curl: /portfolio/ 200, /portfolio/portfolio-view.js 200, /prices/360750.json 200, / contains `href="/portfolio/"`. prices-meta.json is valid (59/59 collected). Local main equals origin/main. The server DRY_RUN ETL and price run results (exit 0, "ETL OK", "PRICES OK") come from 25-05-SUMMARY. I could not re-run them, since I have no server access. |
| 5 | Rollback path documented | VERIFIED | 25-05-SUMMARY documents the nav revert, the data withdrawal and the runner restore. |

**Score:** 5/5

## Notes and risks
- VERIFY-01 was redefined: the daily GitHub Actions workflows are intentionally disabled, so the server runner stands in for "real CI". The REQUIREMENTS.md wording (new workflow run once) is only met through the CONTEXT redefinition.
- REQUIREMENTS.md checkboxes for SAFE-01/02, NAV-01 and VERIFY-01 are still unchecked and show "Pending". They need updating.
- The DRY_RUN ETL still POSTs to the GAS web app (a known side effect, documented in server_ops.md).
- Server-side claims are not independently re-verified.
