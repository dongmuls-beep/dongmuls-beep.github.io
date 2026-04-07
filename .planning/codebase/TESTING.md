# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Status:** No automated test framework detected.

**Testing Approach:**
- Manual testing only
- No Jest, Vitest, pytest, or unittest configuration found
- No test files (`.test.js`, `.spec.js`, `test_*.py`) in codebase

**Current Testing:**
- GitHub Actions CI runs ETL script directly: `python etl_process.py` (`.github/workflows/daily_update.yml`)
- Manual validation of output files after script execution
- Frontend tested manually in browser

**Available Commands:**
```bash
# No automated test runner configured
# Manual verification:
python etl_process.py              # Run ETL, validate output data.json
python scripts/build_changelog.py  # Generate changelog, check changelog.json
python scripts/sync_server_changelog.py --url [url]  # Sync from server
```

## Test File Organization

**Location:** No test directory structure exists

**Naming Convention:** N/A - no test files

**Current File Structure:**
- `etl_process.py` - Production script (handles its own validation logic)
- `scripts/build_changelog.py` - Production script
- `scripts/sync_server_changelog.py` - Production script
- `gas_script_v2.js` - Google Apps Script (production)
- `script.js` - Frontend application (production)

## Validation in Code

**ETL Validation (`etl_process.py`):**

Since no test framework exists, validation logic is embedded in production code:

```python
# In setup_driver()
if os.environ.get('GITHUB_ACTIONS') == 'true':
    print("Running in GitHub Actions (Headless Mode)")
    options.add_argument("--headless")
```

```python
# In download_kofia_excel()
if time.time() - os.path.getmtime(latest_file) < 60:
    # Check not incomplete
    if os.path.getsize(latest_file) > 0 and not latest_file.endswith('.crdownload'):
        print(f"Downloaded: {latest_file}")
        return latest_file
time.sleep(1)
```

```python
# In fetch_managed_items()
try:
    response = requests.get(GAS_WEB_APP_URL, params={'action': 'getItems'})
    response.raise_for_status()
    data = response.json()
    return pd.DataFrame(data)
except Exception as e:
    print(f"Error fetching items from GAS: {e}")
    return get_mock_managed_items()  # Fallback to mock data for testing
```

```python
# In process_data() - Column validation
col_total = next((c for c in df.columns if '합계' in c and '(A)' in c), None)
if not col_total: col_total = next((c for c in df.columns if '총보수' in c), None)  # Fallback
```

**Frontend Validation (`script.js`):**

```javascript
// Data validation in fetchData()
try {
    const [response] = await Promise.all([
        fetch(GAS_API_URL, { cache: "no-store" }),
        loadUpdateMeta(),
    ]);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error("Invalid data format");  // Validate data is array
    }
```

```javascript
// Language pack validation
try {
    const response = await fetch(`${I18N_DIR}/${lang}.json`, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Failed to load language pack: ${lang}`);
    }
    const pack = await response.json();
    i18nCache.set(lang, pack);
    return pack;
} catch (error) {
    if (lang !== DEFAULT_LANG) {
        return loadLanguagePack(DEFAULT_LANG);  // Fallback to default language
    }
    console.error("Language pack loading failed:", error);
    return {};
}
```

**Changelog Validation (`scripts/build_changelog.py`):**

```python
def build_changes(prev_rows, curr_rows):
    # Robust handling of data format
    for key, curr_row in curr_index.items():
        prev_row = prev_index.get(key)
        if not prev_row:
            continue
        # Only report actual changes
        if before != after:
            changes.append({...})

# Idempotent changelog updates
if changelog_entries:
    last_entry = changelog_entries[-1]
    if (isinstance(last_entry, dict) and 
        last_entry.get("updatedAt") == today and 
        last_entry.get("changes") == changes):
        print("[changelog] latest entry already matches today's changes")
        return 0
```

## Testing Strategies

**Integration Testing via GitHub Actions:**

The CI pipeline in `.github/workflows/daily_update.yml` serves as the primary integration test:

```yaml
- name: Run ETL Script
  run: python etl_process.py

- name: Build Changelog
  run: python scripts/build_changelog.py

- name: Commit and Push changes
  uses: stefanzweifel/git-auto-commit-action@v4
```

This validates:
1. Excel download works
2. Data processing completes without errors
3. Changelog generation succeeds
4. Output files are valid JSON
5. Git commit succeeds (implicitly validates file format)

**Manual Validation:**

Output files must be inspected:
- `data.json`: Array of ETF records with required fields
- `changelog.json`: Array of change entries with month/updatedAt/changes structure
- `update-meta.json`: Object with updatedAt, updatedAtIso, timezone, status

**Frontend Testing:**

Manual browser testing validates:
- Language switching works
- Data table renders
- Navigation functions
- Modal interactions
- Changelog display

## Error Handling Patterns

**Python - Graceful Degradation:**

```python
def fetch_managed_items():
    # Try primary source
    try:
        response = requests.get(GAS_WEB_APP_URL, params={'action': 'getItems'})
        response.raise_for_status()
        data = response.json()
        return pd.DataFrame(data)
    except Exception as e:
        print(f"Error fetching items from GAS: {e}")
        return get_mock_managed_items()  # Fallback to mock
```

```python
def download_kofia_excel():
    try:
        # Download logic
    except Exception as e:
        print(f"Selenium Error: {e}")
        try:
            driver.save_screenshot("selenium_error.png")  # Debug artifact
            print("Saved screenshot to selenium_error.png")
        except:
            pass
        return None  # Signal failure to caller
    finally:
        driver.quit()  # Always cleanup
```

**JavaScript - User-Facing Error Messages:**

```javascript
try {
    const response = await fetch(GAS_API_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error("Invalid data format");
    }
} catch (error) {
    console.error("Error fetching data:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="loading-text error-text">${getTranslation("table_error")}</td></tr>`;
}
```

**Fallback Chains:**

```javascript
// Language loading with English fallback
if (!i18nCache.has("en")) {
    await loadLanguagePack("en");  // Ensure English available
}

async function loadLanguagePack(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
        return loadLanguagePack(DEFAULT_LANG);  // Redirect unsupported
    }
    if (i18nCache.has(lang)) {
        return i18nCache.get(lang);  // Use cache
    }
    try {
        // Load from server
    } catch (error) {
        if (lang !== DEFAULT_LANG) {
            return loadLanguagePack(DEFAULT_LANG);  // Fallback to default
        }
        console.error("Language pack loading failed:", error);
        return {};
    }
}
```

## Data Validation Patterns

**ETL Data Matching (`process_data`):**

```python
# Multi-strategy column detection
col_total = next((c for c in df.columns if '합계' in c and '(A)' in c), None)
if not col_total: 
    col_total = next((c for c in df.columns if '총보수' in c), None)

# Safe value extraction
def p_float(v):
    try: 
        return float(str(v).replace(',', '').replace('%',''))
    except: 
        return 0.0

total = p_float(row.get(col_total, 0)) if col_total else 0
```

**Frontend Data Validation:**

```javascript
// Ensure data shape
if (!Array.isArray(data)) {
    throw new Error("Invalid data format");
}

// Resolve data keys dynamically (handles schema variations)
function resolveDataKeys(sample) {
    const pick = (preferred, candidates, index) => {
        const exact = keys.find((key) => key === preferred);
        if (exact) return exact;
        const partial = keys.find((key) => candidates.some((candidate) => String(key).includes(candidate)));
        if (partial) return partial;
        return keys[index] || preferred;
    };
    // Dynamically map columns...
}
```

## Testing Recommendations

**What to Add:**

1. **Unit Tests** - Test data transformation functions
   - Language pack loading fallback chains
   - Data key resolution logic
   - Fee calculation in Python ETL

2. **Integration Tests** - Mock API responses
   - Fetch operations with error cases
   - Changelog generation with real git diffs
   - Language selection persistence

3. **E2E Tests** - Browser automation (Cypress or Playwright)
   - ETF table rendering
   - Language switching
   - Navigation
   - Mobile responsiveness

4. **Regression Tests** - Before ETL runs
   - Verify Excel file format hasn't changed
   - Validate KOFIA website structure
   - Check data.json schema

## Coverage Status

**Current Coverage:** No metrics available - no test framework

**High-Risk, Untested Areas:**
- `script.js` (1291 lines) - All frontend logic untested
- `etl_process.py` - Selenium automation untested
- Excel parsing fallback strategies in `process_data()`
- Language pack fallback chains
- Data key resolution with missing fields

**Medium-Risk Areas:**
- Changelog generation edge cases (idempotency logic)
- Cache management in `i18nCache`
- Modal focus management

**Low-Risk Areas:**
- Google Sheets integration (tested by CI runs)
- Static data serving
- Simple utility functions

---

*Testing analysis: 2026-04-07*
