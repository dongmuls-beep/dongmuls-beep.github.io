# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- JavaScript (vanilla) - Client-side UI and application logic
- Python 3.9 - Backend ETL pipeline for data processing
- CSS 3 - Styling and visual design (glassmorphism theme)
- HTML 5 - Markup structure

**Secondary:**
- Google Apps Script - Google Sheets API integration for data management

## Runtime

**Environment:**
- Browser environment (Chrome/modern browsers) for frontend
- Python 3.9 for ETL/backend processing
- GitHub Actions (Ubuntu latest) for CI/CD automation

**Package Manager:**
- pip (Python) - Primary dependency manager
- No lockfile (requirements.txt without versions - may cause reproducibility issues)

## Frameworks

**Frontend:**
- Vanilla JavaScript (no framework) - Lightweight, dependency-free frontend
- CSS Grid/Flexbox - Layout system
- Web APIs (Fetch API) - HTTP communication

**Backend/Data Processing:**
- Selenium (WebDriver) - Web scraping and automation for KOFIA data downloads
- pandas - Data manipulation and Excel processing
- openpyxl - Excel workbook operations
- BeautifulSoup4 - HTML parsing (dependency listed but usage unclear)

**Testing:**
- Not detected

**Build/Dev:**
- GitHub Actions - CI/CD workflow automation
- Webdriver-manager - ChromeDriver version management

## Key Dependencies

**Critical:**
- `selenium` (6.0+) - Automates download of ETF data from KOFIA website
- `pandas` (1.0+) - Core data processing for fee calculations
- `requests` - HTTP requests to Google Sheets API and external services
- `openpyxl` - Reads/writes Excel files from KOFIA source
- `webdriver-manager` - Manages Selenium ChromeDriver lifecycle

**Infrastructure:**
- `lxml` - XML/HTML parsing support for BeautifulSoup4
- `xlrd` - Legacy Excel file reading support
- `beautifulsoup4` - HTML parsing (dependency present, active usage unclear)

## Configuration

**Environment:**
- Configuration via hardcoded constants in source code
- Google Sheets Web App URL configured in `etl_process.py` (line 18)
- No .env file detected for local development (possible limitation)

**Build:**
- GitHub Actions workflow: `.github/workflows/daily_update.yml`
  - Scheduled daily at 00:00 UTC (09:00 KST)
  - Supports manual trigger via workflow dispatch
  - Python version pinned to 3.9
  - All dependencies installed from requirements.txt

## Data Flows

**ETL Pipeline (`C:/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/etl_process.py`):**
1. Download Excel file from KOFIA website using Selenium WebDriver
2. Fetch managed ETF list from Google Sheets API via Google Apps Script
3. Parse Excel and match against managed items by standard code
4. Calculate fee metrics: total fees (총보수) + other costs (기타비용) + trading fees (매매중개수수료)
5. Save processed data to `data.json` (local JSON file)
6. Write update metadata to `update-meta.json`
7. POST data to Google Sheets API (optional backup)
8. Clean up temporary Excel files

**Frontend Data Flow:**
1. Load translations from `/i18n/{lang}.json` based on user language preference
2. Fetch ETF data from `/data.json` (local static file)
3. Fetch changelog from `/changelog.json`
4. Fetch update metadata from `/update-meta.json`
5. Render tables and filtered views based on ETF categories
6. Send analytics events to Google Analytics 4 (via gtag)

## Hosting & Platform

**Static Hosting:**
- Deployable as static site (GitHub Pages compatible)
- All data served from JSON files (no backend server required)
- File-based data storage: `data.json`, `changelog.json`, `update-meta.json`

**External APIs:**
- Google Sheets API (via Google Apps Script Web App)
- KOFIA (Korea Financial Investment Association) - ETF fee data source
- Google Analytics 4 - User tracking and analytics
- Google AdSense - Ad serving platform

## Development Environment

**Requirements:**
- Python 3.9 or later
- Chrome/Chromium browser (for Selenium automation)
- Git (for version control)
- GitHub account (for Actions CI/CD)
- Google Sheets access (for managed item list)

**Setup:**
```bash
python -m pip install --upgrade pip
pip install pandas selenium webdriver-manager requests openpyxl xlrd beautifulsoup4 lxml
```

## Production Requirements

**Deployment:**
- Static file hosting (GitHub Pages, Vercel, Netlify, etc.)
- Scheduled Python execution environment (GitHub Actions or alternative cron service)
- Google Sheets with Google Apps Script Web App enabled

**Maintenance:**
- Daily ETL runs via GitHub Actions (configurable schedule)
- Manual trigger capability for ad-hoc updates
- Data files committed to Git repository

## Internationalization

**Supported Languages:** 8 languages
- Korean (ko) - Default
- Vietnamese (vi)
- Chinese Simplified (zh)
- English (en)
- Japanese (ja)
- Thai (th)
- Tagalog/Filipino (tl)
- Khmer (km)

**Translation Architecture:**
- JSON-based translations in `i18n/` directory: `{lang}.json` files
- Runtime language detection from URL query parameter or browser preference
- DOM elements use `data-i18n` attributes for key mapping

---

*Stack analysis: 2026-04-07*
