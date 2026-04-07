# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Static Site Generator with Automated Backend Data Pipeline

**Key Characteristics:**
- Frontend-agnostic static HTML/CSS/JS hosted on GitHub Pages
- Automated Python ETL pipeline updates data daily via GitHub Actions
- Multi-language i18n support with dynamic content loading
- Client-side rendering of tabular data from JSON source
- No server-side logic; all processing is client-side or scheduled batch

## Layers

**Presentation Layer:**
- Purpose: Render ETF comparison tables, guide pages, and educational content to users
- Location: `index.html`, `/isa/index.html`, `/pension/index.html`, `/guide/index.html`, `/fomo/index.html`
- Contains: HTML templates with SEO metadata, navigation, data tables
- Depends on: `script.js`, `style.css`, `translations.js`, language JSON files
- Used by: Browsers (public-facing)

**Client-Side Application Layer:**
- Purpose: Handle language switching, data fetching, table filtering, navigation, and SEO/i18n runtime updates
- Location: `script.js` (primary entry point)
- Contains: Initialization logic, language management, data rendering functions, event handlers
- Depends on: `data.json`, `/i18n/*.json` language packs, `update-meta.json`
- Used by: Presentation layer (loaded by HTML)

**Translation/i18n Layer:**
- Purpose: Provide localized strings for UI and SEO across 8 languages
- Location: `/i18n/` directory (ko.json, en.json, vi.json, zh.json, ja.json, th.json, tl.json, km.json)
- Contains: Key-value translation dictionaries, SEO metadata per language
- Depends on: Nothing
- Used by: `script.js` language switching and rendering

**Data Layer:**
- Purpose: Store ETF comparison data in static JSON format
- Location: `data.json` (primary data source), `update-meta.json` (metadata)
- Contains: Array of ETF objects with fields: 구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용
- Depends on: Nothing at runtime
- Used by: `script.js` via fetch(), displayed in tables

**Backend ETL Pipeline:**
- Purpose: Automatically collect KOFIA ETF data, calculate real costs, update `data.json`
- Location: `etl_process.py` (orchestrator), `scripts/build_changelog.py` (changelog builder)
- Contains: Selenium automation, pandas data processing, fee calculation logic
- Depends on: KOFIA public website, Google Apps Script API
- Used by: GitHub Actions workflow (scheduled daily)

**CI/CD Orchestration:**
- Purpose: Schedule and execute ETL pipeline, commit results to repository
- Location: `.github/workflows/daily_update.yml`
- Contains: Schedule trigger (daily 00:00 UTC), Python environment setup, auto-commit
- Depends on: GitHub Actions environment, Python 3.9+
- Used by: GitHub infrastructure

## Data Flow

**Automatic Data Update (Daily):**

1. GitHub Actions workflow triggers at 00:00 UTC (09:00 KST)
2. `etl_process.py` runs:
   - Sets up headless Chrome via Selenium
   - Downloads latest KOFIA ETF fee Excel file
   - Fetches managed item list from Google Apps Script (with mock fallback)
   - Matches items by standard code (표준코드) against Excel data
   - Calculates: total_fee + other_cost + trading_fee = real_cost
   - Outputs results to `data.json`
3. `scripts/build_changelog.py` generates changelog.json
4. Git auto-commit pushes `data.json`, `changelog.json`, `update-meta.json` to main branch
5. GitHub Pages deploys updated files

**User Request Flow (Real-time):**

1. Browser requests `/` or language-specific subpath
2. HTML loads, triggers `DOMContentLoaded` event
3. `initApp()` in script.js runs:
   - Legacy hash redirect (`#isa` → `/isa/`)
   - Navigation setup (hamburger menu, link highlighting)
   - Smart header initialization (scroll-based visibility)
   - Modal setup
   - Language initialization (detect lang param, localStorage, browser lang, fallback to Korean)
   - Load language pack from `/i18n/{lang}.json`
   - Apply translations to all `[data-i18n]` elements
   - Load and render ETF table if page has table
4. `fetchData()` fetches `/data.json` and renders tabs/table
5. User interacts: change language, filter category, copy code, etc.

**State Management:**
- `currentLanguage`: Active language code (stored in localStorage)
- `currentTranslations`: Loaded translation object for current language
- `allData`: Full ETF array loaded from data.json
- `currentCategory`: Currently filtered category
- `i18nCache`: Map of loaded language packs (prevents re-fetching)

## Key Abstractions

**Data Record:**
- Purpose: Represents a single ETF with cost breakdown
- Example: `data.json` array items
- Pattern: Flat object with Korean field names (구분, 종목코드, 종목명, etc.)

**Page Type:**
- Purpose: Distinguish behavior between home, guide pages, changelog
- Examples: `getPageType()` returns "home", "isa", "pension", "guide", "fomo", "changelog"
- Pattern: Determined by `data-page` attribute on body or pathname

**Translation Key:**
- Purpose: Localization lookup key
- Examples: `"nav_home"`, `"isa_hero_title"`, `"seo_home_title"`
- Pattern: Format `[section]_[component]_[type]`, fallback chain: current lang → English → default lang

**Breadcrumb:**
- Purpose: Show navigation hierarchy, generate schema.org structured data
- Examples: `/isa/` shows "메인 > ISA 중개형"
- Pattern: Built from markup with `<a href="">` and `<span aria-current="page">`

## Entry Points

**Primary HTML:**
- Location: `/index.html`
- Triggers: Direct URL visit to `https://etfsave.life/`
- Responsibilities: Render home page with ETF comparison table, SEO metadata, CTA buttons

**Sub-page Templates:**
- Locations: `/isa/index.html`, `/pension/index.html`, `/guide/index.html`, `/fomo/index.html`
- Triggers: Navigation clicks or direct URL
- Responsibilities: Render page-specific content, guide panels, SEO

**Language Sub-pages:**
- Mechanism: Query parameter `?lang=en` triggers language switch without navigation change
- Responsibilities: Apply language-specific SEO (title, description, keywords), update meta tags

**Changelog Page:**
- Location: `/changelog/index.html` (inferred from nav link)
- Purpose: Display historical ETF fee changes
- Responsibilities: Render changelog.json as timeline, apply translations

**JavaScript Application:**
- Location: `script.js`
- Triggers: Loaded as `<script>` tag, executes on all pages
- Responsibilities: All runtime behavior

**ETL Process:**
- Location: `etl_process.py`
- Triggers: GitHub Actions schedule (daily 00:00 UTC)
- Responsibilities: Fetch KOFIA data, process, output data.json

## Error Handling

**Strategy:** Progressive degradation with fallbacks

**Patterns:**

- **Language Loading:** If target language pack fails, fallback to English; if English fails, fallback to Korean; if all fail, return key as string
- **Data Fetching:** If `/data.json` fetch fails, show "Unable to load data" error message; table body displays error state
- **Update Metadata:** If update-meta.json fails to load, continue without "last updated" display
- **ETL Process:** If KOFIA download fails, print error and return None; process_data catches exceptions and returns empty list; mock data provides fallback items
- **DOM Elements:** Check for null/undefined before accessing (e.g., `if (!tbody) return`)
- **Selenium Automation:** Save screenshot on error to `selenium_error.png` for debugging

## Cross-Cutting Concerns

**Logging:** 
- Frontend: console.error(), console.warn() for JavaScript errors
- Backend: print() statements in `etl_process.py` for each stage (KOFIA download, matching, calculation)

**Validation:**
- Data key resolution (resolveDataKeys) adapts field names if different from expected Korean names
- Fee parsing function (p_float) handles percentage signs, commas, missing values
- URL parameter validation (SUPPORTED_LANGS whitelist)

**Authentication:**
- None required for public site
- Google Apps Script endpoint uses public Web App URL (no auth)
- GitHub Actions uses built-in GITHUB_TOKEN for commits

**Performance Considerations:**
- Language pack caching via i18nCache Map (prevents re-fetching)
- Passive scroll listeners for smart header (non-blocking)
- Fetch with cache: "no-store" to bypass browser cache
- Static file hosting (GitHub Pages) handles CDN distribution

**Accessibility:**
- ARIA labels on buttons and navigation (aria-label, aria-expanded, aria-controls)
- Semantic HTML (nav, main, section, header)
- Keyboard support (Escape to close modals/nav)
- Screen reader support via [data-i18n] and semantic elements

---

*Architecture analysis: 2026-04-07*
