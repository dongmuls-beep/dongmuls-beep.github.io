# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
ETF비교사이트/
├── .claude/                    # Claude Code project config (StoryForge)
├── .github/
│   └── workflows/
│       └── daily_update.yml    # GitHub Actions ETL trigger
├── .planning/
│   └── codebase/               # Analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
├── .githooks/                  # Git hooks (pre-commit, etc.)
├── scripts/                    # Utility Python scripts
│   ├── build_changelog.py      # Generates changelog.json from git history
│   └── sync_server_changelog.py # Sync changelog (legacy)
├── i18n/                       # Multi-language translation files
│   ├── ko.json                 # Korean (default language)
│   ├── en.json                 # English
│   ├── vi.json                 # Vietnamese
│   ├── zh.json                 # Chinese
│   ├── ja.json                 # Japanese
│   ├── th.json                 # Thai
│   ├── tl.json                 # Tagalog
│   └── km.json                 # Khmer
├── icon/                       # Favicons and icons
│   ├── etfsave_favicon_*.png   # Favicon variants (16x16, 32x32, 48x48, 180x180, 192x192, 512x512)
│   └── etfsave_favicon_trimmed.ico # Multi-res favicon
├── indices/                    # Index-specific guide pages (content directories)
│   ├── sp500/                  # S&P500 index guide
│   ├── nasdaq100/              # Nasdaq100 index guide
│   ├── kospi200/               # KOSPI200 index guide
│   └── kosdaq150/              # KOSDAQ150 index guide
├── isa/                        # ISA tax-advantaged account guide page
│   └── index.html              # ISA page template
├── pension/                    # Pension savings & IRP guide page
│   └── index.html              # Pension page template
├── guide/                      # General site usage guide
│   └── index.html              # Guide page template
├── fomo/                       # FOMO analysis page
│   └── index.html              # FOMO page template
├── methodology/                # Methodology documentation
│   └── (content files)
├── changelog/                  # Changelog page (generated)
│   └── (inferred structure)
├── data.json                   # Primary data source (ETF list with fees)
├── update-meta.json            # Metadata: last update timestamp, timezone, status
├── index.html                  # Home page template (primary entry point)
├── script.js                   # Main frontend application logic (all pages)
├── style.css                   # Global styling (responsive, glass-morphism, dark theme)
├── translations.js            # Legacy translation object (deprecated, replaced by i18n/*.json)
├── etl_process.py             # Backend ETL: KOFIA scraper, fee calculator, data updater
├── requirements.txt           # Python dependencies (pandas, selenium, webdriver-manager, etc.)
├── gas_script_v2.js           # Google Apps Script Web App (GET/POST API for item management)
├── site.webmanifest           # PWA manifest
├── robots.txt                 # Search engine crawler directives
├── sitemap.xml                # SEO sitemap
├── CNAME                      # Custom domain: etfsave.life
├── deployment_guide.md        # Deployment and operations documentation
├── google_sheets_setup.md     # Google Sheets + GAS configuration guide
├── PROJECT_STRUCTURE.md       # Project overview (this was replaced by ARCHITECTURE.md/STRUCTURE.md)
├── 사이트계획서.md             # Initial site planning document (Korean)
└── changelog.json             # Auto-generated changelog (ETF fee changes)
```

## Directory Purposes

**`.claude/`:**
- Purpose: Project-level Claude Code configuration and StoryForge workflow
- Contains: CLAUDE.md, kanban files if using StoryForge

**`.github/workflows/`:**
- Purpose: GitHub Actions automation configuration
- Contains: daily_update.yml trigger for ETL pipeline

**`.planning/codebase/`:**
- Purpose: GSD codebase mapping outputs (analysis documents)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, INTEGRATIONS.md, STACK.md

**`scripts/`:**
- Purpose: Utility Python scripts for CI/CD and data processing
- Contains: `build_changelog.py` (generates changelog.json from git commits)

**`i18n/`:**
- Purpose: Multi-language support
- Contains: 8 language JSON files (ko, en, vi, zh, ja, th, tl, km)
- Structure: Key-value objects with translation strings
- Example: `ko.json` contains `{ "nav_home": "메인", "isa_hero_title": "ISA(중개형) 절세 가이드", ... }`

**`icon/`:**
- Purpose: Favicon and branding assets
- Contains: PNG favicons (multiple sizes), ICO file
- Sizes: 16x16, 32x32, 48x48, 180x180, 192x192, 512x512

**`indices/`:**
- Purpose: Index-specific educational/guide content
- Contains: Subdirectories for sp500, nasdaq100, kospi200, kosdaq150
- Generated: No (static content)

**`isa/`, `pension/`, `guide/`, `fomo/`:**
- Purpose: Specialized guide pages for different user segments
- Contains: Single index.html per directory with page-specific content
- Pattern: Each shares common header/nav/footer; uses script.js for interactivity

**`methodology/`:**
- Purpose: Detailed explanation of ETF fee calculation methodology
- Contains: Educational content files

**`changelog/`:**
- Purpose: Display historical ETF fee changes
- Contains: Generated dynamically or inferred structure

## Key File Locations

**Entry Points:**

- `/index.html`: Home page, primary entry point with ETF comparison table and hero content
- `/isa/index.html`: ISA account guide and comparison table
- `/pension/index.html`: Pension savings & IRP account guide and comparison table
- `/guide/index.html`: Site usage and methodology guide
- `/fomo/index.html`: FOMO analysis page
- `/changelog/`: Changelog page (specific structure inferred from navigation)

**Application Logic:**

- `script.js`: Master JavaScript file handling all runtime behavior:
  - Language initialization and switching
  - Data fetching and caching
  - Table rendering and filtering
  - Navigation and routing
  - SEO/metadata management
  - Modal and UI interactions
- `style.css`: Global CSS with responsive design, glass-morphism effects, dark theme
- `index.html`, `isa/index.html`, etc.: HTML templates with semantic structure, SEO metadata, i18n data attributes

**Configuration:**

- `requirements.txt`: Python dependencies list
- `.github/workflows/daily_update.yml`: ETL schedule and execution
- `site.webmanifest`: PWA configuration
- `CNAME`: Custom domain configuration for GitHub Pages

**Core Logic:**

- `etl_process.py`: Main ETL script:
  - `setup_driver()`: Configure Selenium Chrome driver
  - `download_kofia_excel()`: Automate KOFIA website for Excel download
  - `fetch_managed_items()`: Query Google Apps Script for item list
  - `process_data()`: Parse Excel, match items, calculate fees
  - `update_google_sheets()`: Save results to data.json and call GAS

**Testing/Quality:**

- `scripts/build_changelog.py`: Build changelog from git commits
- (Testing framework not detected)

## Naming Conventions

**Files:**

- Root HTML files: `index.html` (convention for static sites)
- CSS: `style.css` (single global stylesheet)
- JavaScript: `script.js` (single application file)
- Data files: `data.json` (lowercase, JSON extension)
- Config files: `requirements.txt`, `CNAME`, `robots.txt` (uppercase for metadata files, lowercase for requirements)
- Python scripts: `snake_case.py` (e.g., `etl_process.py`, `build_changelog.py`)
- Language files: `{lang_code}.json` (e.g., `ko.json`, `en.json`)
- Documentation: `UPPERCASE.md` or `korean_title.md` (mixed convention)

**Directories:**

- Feature directories: lowercase with `/index.html` (e.g., `/isa/index.html`, `/pension/index.html`)
- Language directory: `i18n/` (standard convention)
- Asset directory: `icon/`, `indices/` (lowercase, descriptive)
- Config directory: dotfiles (`.github/`, `.planning/`, `.claude/`)
- Script directory: `scripts/` (plural for utilities)

**HTML Elements:**

- IDs: `camelCase` (e.g., `languageSelect`, `primaryNav`, `tableBody`)
- Classes: `kebab-case` (e.g., `.site-header`, `.nav-link`, `.loading-text`)
- Data attributes: `kebab-case` (e.g., `data-i18n`, `data-page`, `data-track-cta`)

**JavaScript Variables:**

- Global constants: `UPPERCASE_SNAKE_CASE` (e.g., `GAS_API_URL`, `SUPPORTED_LANGS`, `DEFAULT_LANG`)
- Functions: `camelCase` (e.g., `initApp()`, `fetchData()`, `renderTabs()`)
- Objects: `camelCase` (e.g., `allData`, `currentLanguage`, `dataKeys`)

**JSON Keys:**

- Korean field names: Korean characters (e.g., `구분`, `종목코드`, `종목명`)
- Translation keys: `snake_case` with language prefix (e.g., `nav_home`, `isa_hero_title`, `seo_home_title`)

## Where to Add New Code

**New Feature (e.g., new comparison metric):**
- Primary code: `script.js` (add function, integrate with rendering)
- Translations: `/i18n/{lang}.json` (add keys for all 8 languages)
- HTML: Add to appropriate page (`index.html` for home, `/isa/index.html` for ISA page, etc.)
- Styling: `style.css` (add classes as needed)
- Example: New fee field would require:
  1. Add to `dataKeys` object in script.js
  2. Update data.json schema
  3. Add translation keys to all i18n/*.json files
  4. Update table rendering in script.js
  5. Update HTML data-i18n attributes

**New Guide Page (e.g., `/crypto-etf/`):**
- Template: Copy from `/isa/index.html` or `/pension/index.html`
- Create: `crypto-etf/index.html`
- Navigation: Add link to primary nav in all page templates
- Content: Write guide content in new index.html
- Translations: Add nav_crypto_etf and content keys to all i18n/*.json
- Logic: script.js detects page type via data-page attribute, handles route appropriately

**New Language Support (e.g., Spanish):**
- Create: `/i18n/es.json` (copy structure from existing language file)
- Translation: Translate all keys (currently 8 languages have ~100+ keys each)
- Update: script.js constants:
  - Add "es" to SUPPORTED_LANGS
  - Add es entry to LANGUAGE_META
  - Add mapping to HREFLANG_TO_LANG
- HTML: Add language option to language selector in all pages (e.g., `/index.html` language select)

**New ETL Data Field (e.g., dividend yield):**
- Python: Update `etl_process.py`:
  - Add column mapping in process_data()
  - Extract value in fee calculation section
  - Add to results dictionary
- Data: Update data.json schema with new field
- Frontend: 
  - Add key to dataKeys object in script.js
  - Add column to table rendering
  - Add translation keys to i18n/*.json

**Utility Script (e.g., new data processor):**
- Location: Create in `scripts/` directory (e.g., `scripts/new_processor.py`)
- Entry: Add step to `.github/workflows/daily_update.yml` if automated
- Example: build_changelog.py is already in scripts/ and called in workflow

## Special Directories

**`i18n/`:**
- Purpose: All 8 language packs
- Generated: No
- Committed: Yes
- Structure: Each file is a flat JSON object with translation keys

**`indices/`:**
- Purpose: Educational content per index type
- Generated: No (static content directories)
- Committed: Yes
- Pattern: sp500/, nasdaq100/, kospi200/, kosdaq150/ with optional index.html or content

**`changelog/`:**
- Purpose: Display ETF fee change history
- Generated: Partially (changelog.json auto-generated, but page structure inferred)
- Committed: Yes (data committed to git)

**`.github/workflows/`:**
- Purpose: CI/CD automation
- Generated: No (manually configured)
- Committed: Yes
- Key file: daily_update.yml (ETL trigger)

**`scripts/`:**
- Purpose: Utility Python scripts for processing
- Generated: No
- Committed: Yes
- Execution: Called from GitHub Actions or manually

---

*Structure analysis: 2026-04-07*
