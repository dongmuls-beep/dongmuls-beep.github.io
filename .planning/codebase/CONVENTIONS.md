# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- JavaScript: `script.js`, `gas_script_v2.js`, `translations.js` - lowercase with underscores for multi-word names
- Python: `etl_process.py`, snake_case convention
- HTML: `index.html` - lowercase
- JSON: `data.json`, `changelog.json`, `update-meta.json` - kebab-case or lowercase

**Functions:**
- JavaScript: camelCase universally
  - Synchronous: `initApp()`, `fetchData()`, `updateLanguage()`, `renderTabs()`, `filterAndRenderTable()`
  - Async: `async function initApp()`, `async function loadLanguagePack()`, `async function fetchData()`
  - Helper functions: `getTranslation()`, `getLanguageFromUrl()`, `normalizePath()`, `buildCanonicalUrlForLanguage()`
  - Initialization: `init*` prefix for setup functions (`initNavigation()`, `initLanguage()`, `initSmartHeader()`, `initModal()`)
  - Private/inner functions: Nested arrow functions using camelCase: `const closeNav = () => {}`

- Python: snake_case consistently
  - Module-level functions: `setup_driver()`, `download_kofia_excel()`, `fetch_managed_items()`, `process_data()`, `write_update_meta()`
  - Type hints used in newer Python code: `def read_json_file(path: Path, default: Any) -> Any:`
  - Helper functions: `p_float()`, `to_float()`, `row_key()`, `make_index()`

**Variables:**
- JavaScript: camelCase for all variables
  - Global/module-level: `allData`, `currentLanguage`, `currentCategory`, `currentTranslations`, `lastFocusedBeforeModal`, `latestDataUpdatedAt`
  - Local: `tbody`, `navLinks`, `selector`, `updated`
  - Constants: UPPERCASE_WITH_UNDERSCORES
    - `GAS_API_URL`, `CHANGELOG_URL`, `UPDATE_META_URL`, `I18N_DIR`
    - `SUPPORTED_LANGS`, `DEFAULT_LANG`, `SITE_URL`
    - `LANGUAGE_META`, `LEGACY_HASH_ROUTES`, `HREFLANG_TO_LANG`
  - Cached objects: `i18nCache = new Map()`
  - Object properties: `dataKeys` with camelCase properties (`category`, `code`, `name`, `fee`)

- Python: snake_case for variables
  - Constants: UPPERCASE_WITH_UNDERSCORES
    - `GAS_WEB_APP_URL`, `DOWNLOAD_DIR`, `UPDATE_META_FILE`, `RESULT_SHEET_NAME`, `MANAGE_SHEET_NAME`
  - DataFrame variables: descriptive names like `managed_df`, `df_raw`, `df`, `results`
  - Column references: Korean column names wrapped in quotes: `'종목코드'`, `'종목명'`, `'표준코드'`, `'펀드명'`, `'구분'`

**Types:**
- JavaScript: No TypeScript used; pure vanilla JavaScript
- Python: Type hints used in newer modules (`Path`, `Any`, `list[dict[str, Any]]`)

## Code Style

**Formatting:**
- No formatter detected (no `.prettier` or `.eslintrc` found)
- Lines appear to follow ~100-120 character limit
- Indentation: 4 spaces for Python, 4 spaces for JavaScript

**Linting:**
- No linting configuration found
- Code style varies slightly but generally consistent

**Comments:**
- JavaScript: Single-line comments with `//` for clarity on non-obvious logic
  - Example: `// Hide only if navigation is closed. Open nav shouldn't let header hide...`
  - Example: `// Keep English pack available as a fallback when a locale misses specific keys.`
  - Explanatory comments placed on line above code block

- Python: Docstrings used for function documentation
  - Format: Triple-quoted docstring immediately after function signature
  - Example: `def download_kofia_excel(): """Automates the KOFIA website to download the fund fee comparison Excel..."""`
  - Inline comments explain complex matching logic and fallback strategies

## Import Organization

**JavaScript:**
- No explicit imports/exports (vanilla JS in HTML)
- Scripts loaded sequentially in HTML: `<script src="translations.js"></script>`, `<script src="script.js"></script>`
- Global constants defined at top of `script.js` (lines 1-50)
- Global state variables declared with `const` and `let` (lines 41-58)

**Python:**
- Standard library imports first
- Third-party imports grouped together
- Example from `etl_process.py`:
  ```python
  import pandas as pd
  import requests
  import json
  import os
  import glob
  import time
  import sys
  from datetime import datetime, timezone, timedelta
  from selenium import webdriver
  from selenium.webdriver.chrome.service import Service
  from selenium.webdriver.common.by import By
  from selenium.webdriver.support.ui import WebDriverWait
  from selenium.webdriver.support import expected_conditions as EC
  from webdriver_manager.chrome import ChromeDriverManager
  ```

## Error Handling

**Patterns:**

JavaScript uses try-catch with explicit error logging:
```javascript
try {
    const response = await fetch(GAS_API_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    // Process response
} catch (error) {
    console.error("Error fetching data:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="loading-text error-text">${getTranslation("table_error")}</td></tr>`;
}
```
- HTTP responses checked with `response.ok` before proceeding
- Descriptive error messages constructed with template literals
- User-facing errors rendered in UI with translated text
- Console logging used for debugging: `console.error()`, `console.warn()`

Python uses try-except with graceful fallbacks:
```python
try:
    # Primary attempt
except Exception as e:
    print(f"Error doing X: {e}")
    # Fallback behavior or return default
```
- Examples in `etl_process.py`:
  - Download failure → return `None` and log error
  - Column detection → try multiple strategies with fallbacks
  - Missing file → return empty list `[]`
  - JSON parsing → try file load, return `default` parameter on failure

## Logging

**Framework:** `console` object (JavaScript), `print()` (Python)

**Patterns:**

JavaScript:
- `console.error()` for error conditions
- `console.warn()` for warnings (e.g., "Failed to load update metadata")
- No info/debug logging detected

Python:
- `print()` for all output (no logger framework)
- Descriptive messages with context: `print(f"Processing {file_path}...")`
- Progress indicators: `print("Entering '상장지수' in Fund Name Search...")`
- Match results: `print(f"[MATCHED] {target_name} -> {row['펀드명']} (by {matched_by})")`
- Debug output: `print(f"Columns found: {df.columns.tolist()}")`

## Comments

**When to Comment:**
- JavaScript: Comments explain non-obvious control flow or business logic
  - Example: `// Hide only if navigation is closed...`
  - Example: `// Keep English pack available as a fallback...`
  - NOT used for obvious code (well-named functions explain themselves)

- Python: Comments explain complex matching algorithms
  - Example: `# Strategy: Look for the specific marker '(A)' which denotes "Total Fee (A)" in KOFIA standard`
  - Used to document fallback strategies and why they exist

**JSDoc/TSDoc:**
- Not used (no TypeScript, minimal JSDoc)
- Docstrings used in Python but informal

## Function Design

**Size:**
- Small, focused functions with single responsibility
- Examples: `initNavigation()` handles only nav setup, `highlightCurrentNav()` handles only highlighting
- Async functions often short: `loadLanguagePack()`, `loadUpdateMeta()`
- Longer functions for complex processing: `process_data()` (90+ lines) handles multi-step ETL with detailed comments

**Parameters:**
- JavaScript: Options objects used for configuration
  - Example: `updateLanguage(lang, options = { rerender: true, syncUrl: false, historyMode: "replace" })`
  - Destructuring used: `const { rerender = true, syncUrl = false, historyMode = "replace" } = options;`
  - Callback functions passed to event listeners: `addEventListener("click", () => { closeNav(); })`

- Python: Positional parameters + keyword arguments
  - Example: `fetch_managed_items()` no parameters
  - Example: `process_data(managed_df, file_path)` with data objects
  - Optional parameters: `def write_if_changed(path: Path, data: list[dict]) -> bool:`

**Return Values:**
- JavaScript: Void functions (`initApp()`, `initNavigation()`) handle side effects
  - Data retrieval: Functions return data or modify global state (`allData = data;`)
  - Async functions return Promises: `async function fetchData() { ... }`

- Python: Explicit returns
  - Success: Return data or `True`
  - Failure: Return `None` or `False` or empty list `[]`
  - Example: `return results` or `return []` on error

## Module Design

**Exports:**
- JavaScript: No module system (vanilla JS, all functions global)
- Python: No module exports detected; scripts run as executables with `if __name__ == "__main__":`

**Barrel Files:**
- Not used; single monolithic `script.js` (1291 lines)
- Python has separate scripts: `etl_process.py`, `scripts/build_changelog.py`, `scripts/sync_server_changelog.py`

**Organization:**
- JavaScript `script.js`:
  - Constants and configuration (lines 1-58)
  - Global state variables
  - Initialization functions (`initApp()`)
  - Feature implementations grouped logically:
    - Navigation: `initNavigation()`, `highlightCurrentNav()`, `initSmartHeader()`
    - Language: `initLanguage()`, `loadLanguagePack()`, `updateLanguage()`
    - Data: `fetchData()`, `loadUpdateMeta()`, `renderTabs()`, `filterAndRenderTable()`
    - Utilities: Helper functions at end

- Python `etl_process.py`:
  - Configuration constants (lines 16-20)
  - Setup function: `setup_driver()`
  - Download function: `download_kofia_excel()`
  - Data processing: `fetch_managed_items()`, `process_data()`, `update_google_sheets()`
  - Metadata: `write_update_meta()`
  - Main execution: `if __name__ == "__main__":`

---

*Convention analysis: 2026-04-07*
