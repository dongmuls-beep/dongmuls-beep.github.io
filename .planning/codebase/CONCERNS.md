# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

**Hardcoded Google Apps Script URL in Python ETL:**
- Issue: `etl_process.py` line 18 contains hardcoded GAS web app URL without externalization
- Files: `etl_process.py:18`
- Impact: Changes require code modification; no environment-based configuration; URL visible in source control
- Fix approach: Move to environment variable (`GAS_WEB_APP_URL` env var) with fallback to config file

**Manual Selenium download retry with fixed sleep timings:**
- Issue: Lines 104-117 in `etl_process.py` use fixed `time.sleep(20)` and `time.sleep(1)` in download loop without exponential backoff
- Files: `etl_process.py:86-120`
- Impact: Fragile timeout behavior; network delays cause failures; could miss valid downloads
- Fix approach: Implement exponential backoff with configurable max wait time; detect download completion more reliably

**Insufficient error handling in ETL data processing:**
- Issue: `etl_process.py` lines 300-302 catch all exceptions with generic message; header row detection falls back to index 0 without validation
- Files: `etl_process.py:300-302, 206-208`
- Impact: Silent failures mask data corruption; incorrect header detection processes wrong columns
- Fix approach: Add specific exception types; validate header row matches expected columns before processing; log detailed context

**Inline string operations without error boundaries:**
- Issue: `script.js` line 304 uses `innerHTML` directly with user translations without checking translation content
- Files: `script.js:304`
- Impact: If translation contains HTML, it will be rendered as markup (though mitigated by translation source control)
- Fix approach: Use `textContent` for pure text or validate translation content before `innerHTML` use

## Known Bugs

**Mobile header hiding glitch with simultaneous navigation open:**
- Symptoms: Header hide/show behavior inconsistent when nav menu is open and page scrolled
- Files: `script.js:160-178`
- Trigger: Open mobile menu, scroll page, header state may become out of sync
- Workaround: Close nav menu before scrolling
- Root cause: `initSmartHeader()` doesn't account for nav-open state when determining scroll direction threshold

**Changelog table rendering with empty changes array:**
- Symptoms: "No changes" placeholder displays but table structure still renders
- Files: `script.js:1005-1020, 1022-1041`
- Trigger: Changelog entry with empty changes array
- Root cause: Conditional logic for empty changes only affects tbody, not table header rendering

**Language pack fallback silent failure:**
- Symptoms: Missing translation keys display key name instead of graceful fallback
- Files: `script.js:582-600`
- Trigger: Translation key exists in current language but not English fallback
- Root cause: `getTranslation()` returns key name when not found; no warning logged

## Security Considerations

**innerHTML usage in multiple locations:**
- Risk: XSS injection if data sources become compromised
- Files: `script.js:304, 606, 635, 711, 717, 780, 806, 1022, 1047`
- Current mitigation: Data comes from controlled sources (translation JSON, backend JSON); `escapeHtml()` function available but not consistently applied
- Recommendations: 
  - Audit all `innerHTML` assignments to ensure they escape untrusted data
  - Replace `innerHTML` with `textContent` where possible
  - Use template literals with sanitization for HTML construction

**GAS URL hardcoded as string:**
- Risk: Accidental exposure if different environments need different URLs
- Files: `etl_process.py:18`
- Current mitigation: URL is semi-private (embedded in codebase, not in .env)
- Recommendations: Move to environment variable; add to `.env` template documentation

**Changelog and data served without authentication:**
- Risk: Data integrity not verified; MITM attack could modify ETF cost data
- Files: `script.js:602-638, 971-1049`
- Current mitigation: Data served over HTTPS; static files
- Recommendations: Add file integrity hashing (SRI or JSON signature); verify data freshness

**Copy to clipboard fallback mechanism:**
- Risk: Legacy `document.execCommand("copy")` creates off-DOM textarea
- Files: `script.js:902-917`
- Current mitigation: Textarea marked readonly and positioned off-screen
- Recommendations: Remove fallback once IE support dropped; audit clipboard access

## Performance Bottlenecks

**Synchronous language pack loading blocking:**
- Problem: `loadLanguagePack()` uses async/await but is called at app init; UI waits for network
- Files: `script.js:72, 220-253`
- Cause: Promise chain not optimized; English fallback loaded separately
- Improvement path: Pre-cache critical language packs in startup; load secondary packs in background

**Full table re-render on category filter:**
- Problem: `filterAndRenderTable()` creates new DOM nodes for every row even if data unchanged
- Files: `script.js:759-771, 773-836`
- Cause: No virtual scrolling or diff detection; DOM recreation expensive for large datasets
- Impact: Noticeable lag with 50+ ETF rows on slower devices
- Improvement path: Implement row-level updates; cache rendered rows; use document fragments

**Repeated DOM queries in event handlers:**
- Problem: `document.querySelectorAll()` called repeatedly in loops (tab rendering)
- Files: `script.js:741-755`
- Impact: Minor but scales poorly if tab count increases
- Improvement path: Cache query results; use event delegation instead of per-element listeners

**Changelog rendering without pagination:**
- Problem: All changelog entries rendered to DOM at once (potentially 12+ months)
- Files: `script.js:997-1044`
- Cause: No pagination or lazy loading
- Impact: Memory growth if changelog gets large
- Improvement path: Implement month-by-month lazy loading or pagination UI

## Fragile Areas

**Excel header row detection in ETL:**
- Files: `etl_process.py:188-208`
- Why fragile: Relies on presence of '(A)' and '합계' markers; KOFIA Excel format could change
- Safe modification: Add unit tests with sample KOFIA files; document expected column names; fail explicitly if markers not found
- Test coverage: No test files for ETL header detection logic
- Risk: Silent data corruption if KOFIA format changes (wrong columns processed as fees)

**Category filtering logic with preset categories:**
- Files: `script.js:709-714, 760-768`
- Why fragile: Dual code paths (preset vs. URL param) could diverge; category list is dynamic
- Safe modification: Write tests covering both paths; add assertions for category existence before rendering
- Test coverage: No unit tests for category logic

**Selenium KOFIA automation:**
- Files: `etl_process.py:22-132`
- Why fragile: Depends on KOFIA website HTML structure; CSS selectors and element IDs could change
- Safe modification: Add xpath fallback layers; implement page structure validation; version selectors with dates in comments
- Test coverage: No automated tests; manual testing only
- Risk: Breaking change in KOFIA site breaks entire ETL pipeline

**Data key resolution logic:**
- Files: `script.js:657-680`
- Why fragile: Fuzzy matching on column names using `includes()` could match wrong columns
- Safe modification: Require exact column name match; validate resolved keys against sample data
- Test coverage: No tests

## Scaling Limits

**In-memory data storage:**
- Current capacity: 60+ ETFs handled; all data in `allData` global variable
- Limit: Beyond 1000+ records, DOM rendering becomes slow
- Scaling path: Implement pagination or virtual scrolling; move data to IndexedDB for offline support

**Single data.json file:**
- Current capacity: ~15KB file with 60 ETFs
- Limit: File size grows linearly with ETF count; network load increases
- Scaling path: Split by category or implement delta updates; add compression

**GAS deployment constraints:**
- Current capacity: GAS has quotas on execution time and requests
- Limit: If ETL processing grows beyond current KOFIA fetch, GAS execution timeouts
- Scaling path: Move to dedicated backend; implement caching layer; batch operations

## Dependencies at Risk

**Python Selenium with webdriver-manager:**
- Risk: Selenium version compatibility; ChromeDriver updates; webdriver-manager maintenance
- Impact: ETL breaks if dependencies become incompatible
- Migration plan: Evaluate Playwright as modern replacement; add version pinning with tests

**Google Apps Script as backend:**
- Risk: GAS limitations (no custom domain, limited libraries); dependency on Google services
- Impact: Data pipeline tightly coupled to GAS; hard to migrate
- Migration plan: Build lightweight REST API (Node.js/Python); deprecate GAS gradually

**Multiple i18n language packs:**
- Risk: Translation quality maintenance; missing translations in new languages
- Impact: Inconsistent UX across languages; fallback chain could miss keys
- Migration plan: Implement translation coverage reporting; add CI check for missing keys

## Missing Critical Features

**No data validation layer:**
- Problem: ETF cost data accepted without range checking or sanity validation
- Blocks: Cannot detect KOFIA data anomalies; fee values could be corrupted
- Priority: HIGH - impacts core data integrity
- Recommendation: Add range checks (fees 0-2%), duplicate detection, historical comparison

**No offline support:**
- Problem: App requires network; no service worker or local cache
- Blocks: Users on flaky connections cannot access previously loaded data
- Priority: MEDIUM
- Recommendation: Implement service worker with offline fallback

**No real-time data updates:**
- Problem: Data updated monthly only; no intraday updates
- Blocks: Users cannot see latest fee changes without page refresh
- Priority: LOW (monthly update acceptable for investment use case)

**No user preferences persistence:**
- Problem: Only language selection saved to localStorage; no other preferences stored
- Blocks: Cannot remember category selection or selected ETFs
- Priority: LOW-MEDIUM

## Test Coverage Gaps

**No unit tests for ETL process:**
- What's not tested: Header detection, fee calculation, data matching logic
- Files: `etl_process.py` (entire file)
- Risk: Data corruption goes unnoticed; Excel format changes break silently
- Priority: HIGH

**No integration tests for frontend data flow:**
- What's not tested: Data fetch → render pipeline; filter/sort logic
- Files: `script.js` (lines 602-836)
- Risk: Rendering bugs only caught manually
- Priority: MEDIUM

**No tests for translation system:**
- What's not tested: Language pack loading, fallback behavior, missing key handling
- Files: `script.js` (lines 199-253, 582-600)
- Risk: i18n system failures not caught until user reports
- Priority: MEDIUM

**No tests for KOFIA Selenium automation:**
- What's not tested: Website navigation, download detection, timeout behavior
- Files: `etl_process.py` (lines 22-132)
- Risk: Site structure changes break ETL without warning
- Priority: CRITICAL - entire pipeline depends on this

**No end-to-end tests:**
- What's not tested: Full ETL → frontend pipeline
- Risk: Changes to ETL output format not caught before deployment
- Priority: MEDIUM

---

*Concerns audit: 2026-04-07*
