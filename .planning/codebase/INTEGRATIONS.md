# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**Financial Data:**
- KOFIA (Korea Financial Investment Association) - ETF fee comparison data
  - Method: Web scraping via Selenium WebDriver
  - URL: `https://dis.kofia.or.kr/websquare/index.jsp?w2xPath=/wq/fundann/DISFundFeeCMS.xml&divisionId=MDIS01005001000000&serviceId=SDIS01005001000`
  - Integration point: `C:/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/etl_process.py` (lines 51-132)
  - Frequency: Daily via GitHub Actions
  - Data extracted: Excel file containing fund fees (총보수, 기타비용, 매매중개수수료)

**Google Services:**
- Google Sheets API (via Google Apps Script Web App)
  - SDK/Client: Google Apps Script `gas_script_v2.js`
  - Web App URL: Configured in `etl_process.py` line 18 (`GAS_WEB_APP_URL`)
  - Auth: URL-based access (no token required for public Web App)
  - Endpoints:
    - GET `?action=getItems` - Retrieves managed ETF list
    - POST with JSON payload - Updates fee calculation results (optional backup)
  - Purpose: Centralized data management for ETF list and fee calculations

- Google Analytics 4
  - Integration: `script.js` line 1081
  - Method: gtag global function calls
  - Events tracked: `page_view_custom` with category parameters
  - Purpose: User behavior analytics and page tracking

- Google AdSense
  - Integration: `index.html` line 153
  - Client ID: `ca-pub-7540201129051567`
  - Script: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`
  - Purpose: Monetization via ads

- Google Fonts API
  - Integration: `index.html` line 150
  - Font: Outfit (weights 300, 400, 500, 600, 700, 800)
  - Purpose: Typography

## Data Storage

**Primary Data Source:**
- KOFIA Excel Downloads - External financial data source
  - Downloaded daily via Selenium automation
  - Temporary storage during ETL processing
  - Cleaned up after processing (line 379-382 in `etl_process.py`)

**Data Files (Local JSON):**
- `data.json` - Processed ETF fee comparison data
  - Structure: Array of objects with fields: 구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용
  - Updated daily via ETL pipeline
  - Served directly to frontend at `/data.json`

- `changelog.json` - Historical fee changes
  - Built by `scripts/build_changelog.py`
  - Compares current `data.json` against previous Git version
  - Tracks changes in: 총보수, 기타비용, 매매중개수수료, 실부담비용

- `update-meta.json` - ETL execution metadata
  - Structure: {updatedAt, updatedAtIso, timezone, status}
  - Updated on each successful ETL run
  - Timezone: Asia/Seoul (KST)

**Database:**
- Google Sheets (for managed item list)
  - Sheet: "종목관리" (Item Management)
  - Columns: 구분, 종목코드, 종목명, 표준코드, 펀드명
  - Client: Google Apps Script Web App
  - Connection method: HTTP GET/POST via `requests` library

**File Storage:**
- Local filesystem only
- Project root contains all data files
- GitHub repository as version control storage

**Caching:**
- Browser cache headers: `cache: "no-store"` on all dynamic fetches
  - Fetch calls in `script.js` (lines 237, 611, 642, 978)
  - Prevents stale data display during updates

## Authentication & Identity

**Google Apps Script Web App:**
- Auth: None required (public Web App with URL-based access)
- Security model: URL obscurity (Web App URL is access control)
- No API key or token mechanism

**Google Sheets Access:**
- Credentials: Not applicable for public Web App
- Service account: Not used

**No user authentication:**
- Application is public-facing
- No user accounts or login system
- Anonymous access only

## Monitoring & Observability

**Error Tracking:**
- Console logging in `script.js` (error logging on data fetch failures, line 634)
- Screenshots saved on Selenium errors: `selenium_error.png` (line 126 in `etl_process.py`)
- No external error tracking service detected

**Logs:**
- Python ETL logs: Console output via `print()` statements
  - GitHub Actions CI logs accessible in workflow runs
  - Detailed logging of Selenium operations, data matching, and processing steps

- Frontend logs: Browser console logs
  - No persistent frontend logging system

- Server/Application Logs: None detected (static hosting)

**Monitoring Data:**
- Update metadata stored in `update-meta.json` for last-update tracking
- GitHub commit history serves as audit trail for data changes

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (inferred from Git-based deployment model)
- Static file hosting compatible
- Custom domain: `etfsave.life` (configured in CNAME file)

**CI Pipeline:**
- GitHub Actions: `.github/workflows/daily_update.yml`
  - Trigger: Daily at 00:00 UTC (09:00 KST)
  - Manual trigger: Supported via workflow_dispatch
  - Steps:
    1. Checkout code
    2. Install Python 3.9
    3. Install dependencies (pip install)
    4. Run `python etl_process.py`
    5. Build changelog via `python scripts/build_changelog.py`
    6. Auto-commit changes using `git-auto-commit-action`
  - Files updated: `data.json`, `changelog.json`, `update-meta.json`

**Deployment:**
- Git-based deployment via auto-commit
- Changes pushed automatically on successful ETL
- No manual deployment step required

## Webhooks & Callbacks

**Incoming Webhooks:**
- None detected

**Outgoing Webhooks:**
- Google Sheets API POST (optional backup)
  - Endpoint: `GAS_WEB_APP_URL` (Google Apps Script Web App)
  - Method: POST with JSON payload containing calculated fees
  - Purpose: Backup data synchronization (line 346 in `etl_process.py`)
  - Status: Optional - success logged but not critical to pipeline

## Environment Configuration

**Required Environment Variables:**
- None required for frontend
- No `.env` file detected in repository

**Hardcoded Configuration:**
- Google Apps Script Web App URL in `etl_process.py` (line 18)
- KOFIA website URL hardcoded in `etl_process.py` (line 59)
- Update schedule in GitHub Actions workflow (daily, 00:00 UTC)

**Potential Configuration Gaps:**
- GAS URL is hardcoded (should be environment variable for security)
- Selenium Chrome options hardcoded (no config file)
- Download directory defaults to current working directory

## Cross-Origin & CORS

**CDN Resources:**
- Google Fonts API: `https://fonts.googleapis.com`
- Font CDN (Pretendard): `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9`
- Google AdSense: `https://pagead2.googlesyndication.com`
- Google Analytics: Via gtag global function

**Static Asset Hosting:**
- All assets (CSS, JS, HTML, JSON, images) served from same origin
- No external dependency on third-party hosting for core functionality

---

*Integration audit: 2026-04-07*
