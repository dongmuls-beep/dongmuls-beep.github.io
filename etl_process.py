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
import traceback
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

# Configuration — 환경 변수에서 읽음 (하드코딩 금지)
GAS_WEB_APP_URL = os.environ.get("GAS_WEB_APP_URL", "")
DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads"))
UPDATE_META_FILE = "update-meta.json"

def _wait_for_download(download_dir: str, timeout: int = 90, max_retries: int = 3) -> str | None:
    """
    다운로드 완료 파일을 감지한다. 실패 시 지수 백오프로 재시도.
    Returns: 완료된 파일 경로 또는 None
    """
    delay = 2  # 초기 대기 시간 (초)
    for attempt in range(1, max_retries + 1):
        end_time = time.time() + timeout
        while time.time() < end_time:
            xls_files = glob.glob(os.path.join(download_dir, "*.xls"))
            xlsx_files = glob.glob(os.path.join(download_dir, "*.xlsx"))
            crdownload_files = glob.glob(os.path.join(download_dir, "*.crdownload"))
            all_files = xls_files + xlsx_files

            if all_files and not crdownload_files:
                latest = max(all_files, key=os.path.getmtime)
                # 파일이 최근 90초 내에 생성·수정되었고, 크기가 0보다 크면 완료
                if time.time() - os.path.getmtime(latest) < 90 and os.path.getsize(latest) > 0:
                    print(f"Download detected: {latest} (attempt {attempt})")
                    return latest
            time.sleep(1)

        # 이번 시도 실패 — 지수 백오프 후 재시도
        if attempt < max_retries:
            print(f"Download not detected (attempt {attempt}/{max_retries}). Retrying in {delay}s...")
            time.sleep(delay)
            delay *= 2  # 지수 백오프: 2 -> 4 -> 8초
        else:
            print(f"Download timed out after {max_retries} attempts.")

    return None


def setup_driver():
    """
    Sets up the Chrome WebDriver with options for downloading files.
    """
    options = webdriver.ChromeOptions()

    has_display = bool(os.environ.get('DISPLAY'))
    if not has_display:
        print("No display detected — headless Chrome")
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-gpu")
    else:
        print(f"Display detected ({os.environ.get('DISPLAY')}) — headed Chrome via Xvfb")
        options.add_argument("--window-size=1920,1080")
    # KOFIA uses Korean government CA not in Linux trust store — ignore SSL errors
    options.add_argument("--ignore-certificate-errors")

    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-popup-blocking")

    abs_download = os.path.abspath(DOWNLOAD_DIR)
    prefs = {
        "download.default_directory": abs_download,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True,
        "profile.default_content_settings.popups": 0,
    }
    options.add_experimental_option("prefs", prefs)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    # Browser-level download enable (Page.setDownloadBehavior is deprecated)
    driver.execute_cdp_cmd(
        "Browser.setDownloadBehavior",
        {"behavior": "allow", "downloadPath": abs_download, "eventsEnabled": True},
    )
    return driver

def download_kofia_excel():
    """
    Automates the KOFIA website to download the fund fee comparison Excel.
    Uses '상장지수' search to ensure all ETFs are retrieved.
    """
    driver = setup_driver()
    try:
        print("Opening KOFIA website...")
        driver.get("https://dis.kofia.or.kr/websquare/index.jsp?w2xPath=/wq/fundann/DISFundFeeCMS.xml&divisionId=MDIS01005001000000&serviceId=SDIS01005001000")

        main_handle = driver.current_window_handle

        # Close any popup windows (KOFIA notice/event popups at popup/view.do)
        time.sleep(2)
        for handle in list(driver.window_handles):
            if handle != main_handle:
                try:
                    driver.switch_to.window(handle)
                    print(f"Closing popup: {driver.current_url}")
                    driver.close()
                except Exception as popup_err:
                    print(f"Failed to close popup {handle}: {popup_err}")
        driver.switch_to.window(main_handle)

        wait = WebDriverWait(driver, 30)

        # 1. Wait for page load
        print("Waiting for page load...")
        search_btn = wait.until(EC.element_to_be_clickable((By.ID, "btnSear")))
        time.sleep(5)
        
        # 2. Enter '상장지수' in Fund Name (펀드명)
        # This bypasses the complex checkbox selectors and filters by name directly.
        print("Entering '상장지수' in Fund Name Search...")
        try:
            fund_nm_input = wait.until(EC.visibility_of_element_located((By.ID, "fundNm")))
            fund_nm_input.clear()
            # WebSquare headless workaround: set value via JS + dispatch events to trigger internal handlers
            driver.execute_script("""
                var el = document.getElementById('fundNm');
                el.value = arguments[0];
                el.dispatchEvent(new Event('input', {bubbles: true}));
                el.dispatchEvent(new Event('change', {bubbles: true}));
            """, "상장지수")
            fund_nm_input.send_keys("")  # focus trigger
            print(f"Entered '상장지수' (JS+events)")
            time.sleep(1)
        except (TimeoutException, NoSuchElementException) as e:
            print(f"Error: Fund name input field not found or not interactable: {e}")
            return None
        except WebDriverException as e:
            print(f"WebDriver error while entering fund name: {e}")
            return None

        # 3. Click Search
        print("Clicking Search...")
        driver.execute_script("arguments[0].click();", search_btn)

        # 4. Wait for actual search results — use WebSquare JS API (grdMain.getRowCount())
        # DOM text ('건') can appear before the data model is bound; getRowCount() is authoritative.
        print("Waiting for data grid to load...")
        try:
            WebDriverWait(driver, 90).until(
                lambda d: d.execute_script(
                    "return typeof grdMain !== 'undefined' && grdMain.getRowCount() > 0;"
                )
            )
            row_count = driver.execute_script("return grdMain.getRowCount();")
            print(f"Data grid loaded: {row_count} rows (WebSquare model)")
        except Exception as grid_wait_err:
            print(f"Grid JS wait timed out. Checking row count and applying fallback sleep.")
            time.sleep(10)
            try:
                row_count = driver.execute_script(
                    "return typeof grdMain !== 'undefined' ? grdMain.getRowCount() : -1;"
                )
                print(f"Post-fallback grdMain.getRowCount(): {row_count}")
            except Exception as rc_err:
                row_count = -1
                print(f"Could not read row count: {rc_err}")
            if row_count <= 0:
                print("Grid model empty after fallback — extending wait 30s for slow CI.")
                time.sleep(30)
                try:
                    row_count = driver.execute_script("return grdMain.getRowCount();")
                    print(f"Extended-wait grdMain.getRowCount(): {row_count}")
                except Exception:
                    pass

        # 5. Looking for Excel Download button
        print("Looking for Excel Download button...")
        # Guard: confirm WebSquare model has rows before clicking download
        try:
            ws_count = driver.execute_script(
                "return typeof grdMain !== 'undefined' ? grdMain.getRowCount() : -1;"
            )
            print(f"Pre-download grdMain.getRowCount(): {ws_count}")
            if ws_count == 0:
                print("WARNING: WebSquare grid model empty — fnExcelDownBtn will no-op. Aborting.")
                return None
        except Exception as e:
            print(f"Could not read pre-download row count: {e}")

        try:
            excel_btn = driver.find_element(By.XPATH, "//img[contains(@alt, '엑셀') or contains(@alt, 'Excel')]/parent::*")
        except NoSuchElementException:
            try:
                excel_btn = driver.find_element(By.CSS_SELECTOR, "#btnExcel, #excelDown")
            except NoSuchElementException:
                print("Excel button not found!")
                return None

        # Primary: extract data directly from grdMain WebSquare model — bypasses server entirely
        print("Extracting data directly from grdMain WebSquare model...")
        driver.set_script_timeout(120)
        grid_json = driver.execute_script("""
            var count = grdMain.getRowCount();
            if (!count) return JSON.stringify({error: 'empty', count: 0});

            // Column count
            var colCount = 0;
            try { colCount = grdMain.getColumnCount(); } catch(e) {}
            if (!colCount) { var fr0 = null; try { fr0 = grdMain.getRowData(0); } catch(e) {} colCount = fr0 ? Object.keys(fr0).length : 17; }

            // Column IDs via WebSquare API
            var colIds = [];
            for (var i = 0; i < colCount; i++) {
                try { colIds.push(grdMain.getColumnId(i)); } catch(e) { colIds.push(String(i)); }
            }

            // DOM header texts — try multiple selector patterns
            var headerTexts = [];
            var sels = [
                '#grdMain_head td', 'table[id*="grdMain_head"] td',
                '[id*="grdMain"][id*="head"] td', '[id*="grdMain"][id*="Head"] td',
                '.w2grid_header td', '.w2grid_hcell'
            ];
            for (var si = 0; si < sels.length; si++) {
                var els = document.querySelectorAll(sels[si]);
                if (els.length >= 3) {
                    headerTexts = Array.from(els).map(function(e) {
                        return (e.innerText || e.textContent || '').trim().replace(/\\n/g,' ');
                    }).filter(function(t) { return t.length > 0; });
                    if (headerTexts.length >= 3) break;
                }
            }

            var rows = [];
            for (var i = 0; i < count; i++) {
                try { rows.push(grdMain.getRowData(i)); } catch(e) { rows.push(null); }
            }
            return JSON.stringify({count: count, colIds: colIds, headerTexts: headerTexts, rows: rows});
        """)

        # Known mapping: WebSquare internal column IDs → Korean names used by process_data()
        _WS_ID_MAP = {
            'fundNm': '펀드명', 'fund_nm': '펀드명', 'fnm': '펀드명',
            'stdCode': '표준코드', 'std_code': '표준코드', 'isinCode': '표준코드',
            'isinCd': '표준코드', 'isin_cd': '표준코드',
            'sumAmt': '합계(A)', 'totFee': '합계(A)', 'totalFee': '합계(A)',
            'tot_fee': '합계(A)', 'totFeeRt': '합계(A)', 'tot': '합계(A)',
            'sumA': '합계(A)', 'sum_a': '합계(A)', 'feeAmt': '합계(A)',
            'etcCost': '기타비용(B)', 'etc_cost': '기타비용(B)', 'etcExpense': '기타비용(B)',
            'etcCostRt': '기타비용(B)', 'costB': '기타비용(B)',
            'trdBrkFeeRt': '매매·중개수수료율(D)', 'trd_fee_rt': '매매·중개수수료율(D)',
            'trdFeeRt': '매매·중개수수료율(D)', 'm매매': '매매·중개수수료율(D)',
            'operFee': '운용보수', 'oper_fee': '운용보수', 'mgmtFee': '운용보수',
            'saleFee': '판매보수', 'sale_fee': '판매보수',
            'custFee': '수탁보수', 'cust_fee': '수탁보수',
            'admFee': '사무관리보수', 'adm_fee': '사무관리보수',
        }
        # Hardcoded position-based fallback for standard 17-column KOFIA fee table
        # Verified by row0 math: col5+col6+col7+col8=col9 → col9=합계(A)
        #                        col9+col11≈col12 → col11=기타비용(B), col12=총보수비용(A+B)
        #            col4=설정일(YYYYMMDD), col15=매매·중개수수료율(D), col16=표준코드
        _KOFIA_17_COLS = [
            '운용사', '펀드명', '펀드유형', '법인구분', '설정일',
            '운용보수', '판매보수', '수탁보수', '사무관리보수', '합계(A)',
            '기타보수', '기타비용(B)', '총보수비용(A+B)', '판매·매수보수환급금(E)',
            '기준일', '매매·중개수수료율(D)', '표준코드',
        ]

        if grid_json:
            import json as _json
            gdata = _json.loads(grid_json)
            col_ids = gdata.get('colIds', [])
            header_texts = gdata.get('headerTexts', [])
            rows = gdata.get('rows') or []
            print(f"grdMain extract: count={gdata.get('count')}, error={gdata.get('error','none')}")
            print(f"colIds (all): {col_ids}")
            print(f"headerTexts (first 5): {header_texts[:5]}")
            if rows and not gdata.get('error'):
                import pandas as _pd
                df = _pd.DataFrame(rows)
                print(f"DataFrame columns (raw): {list(df.columns)}")
                n = len(df.columns)

                # Priority 1: DOM headers contain Korean fee column names
                dom_has_korean = any('표준코드' in t or '합계' in t or '펀드명' in t for t in header_texts)
                if dom_has_korean and len(header_texts) >= n:
                    rename = {df.columns[i]: header_texts[i] for i in range(n)}
                    df.rename(columns=rename, inplace=True)
                    print(f"Columns via DOM headers: {list(df.columns)}")

                # Priority 2: map via known WebSquare ID → Korean dict
                elif col_ids:
                    rename = {}
                    for i, cid in enumerate(col_ids[:n]):
                        rename[df.columns[i]] = _WS_ID_MAP.get(cid, cid)
                    df.rename(columns=rename, inplace=True)
                    print(f"Columns via ID map: {list(df.columns)}")

                # Priority 3: position-based fallback for standard 17-column table
                if n == 17 and not any('표준코드' in str(c) for c in df.columns):
                    rename = {df.columns[i]: _KOFIA_17_COLS[i] for i in range(n)}
                    df.rename(columns=rename, inplace=True)
                    print(f"Columns via 17-col positional fallback: {list(df.columns)}")

                # Safety override: auto-detect 표준코드 column by Korean fund code regex
                import re as _re
                for _col in list(df.columns):
                    try:
                        _samp = df[_col].dropna().head(30).astype(str)
                        if _samp.str.match(r'^K[A-Z0-9]{9,12}$').sum() >= 20:
                            if str(_col) != '표준코드':
                                if '표준코드' in df.columns:
                                    df.rename(columns={'표준코드': '구_표준코드'}, inplace=True)
                                df.rename(columns={_col: '표준코드'}, inplace=True)
                                print(f"표준코드 auto-detected at col '{_col}' via regex")
                            break
                    except Exception:
                        pass

                # Safety override: if 합계(A) values look like dates (> 1000), find correct fee col
                if '합계(A)' in df.columns:
                    _total_med = _pd.to_numeric(df['합계(A)'], errors='coerce').median()
                    if _total_med is not None and _total_med > 1:
                        print(f"WARNING: 합계(A) median={_total_med:.0f} looks like date — scanning for fee column")
                        for _col in df.columns:
                            try:
                                _vals = _pd.to_numeric(df[_col], errors='coerce').dropna()
                                _med = _vals.median()
                                if 0.0001 < _med < 0.02 and len(_vals) > 100:
                                    df.rename(columns={'합계(A)': '설정일_wrong', _col: '합계(A)'}, inplace=True)
                                    print(f"합계(A) re-mapped to col '{_col}' (median={_med:.4f})")
                                    break
                            except Exception:
                                pass

                print(f"Final columns: {list(df.columns)}")
                print(f"Row 0 sample: {df.iloc[0].to_dict() if len(df) > 0 else 'empty'}")

                ws_path = os.path.join(DOWNLOAD_DIR, f"kofia_ws_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx")
                df.to_excel(ws_path, index=False)
                print(f"WebSquare model saved to Excel: {ws_path}")
                return ws_path

        print("Direct extraction failed — trying Chrome native download as fallback...")
        result = _wait_for_download(DOWNLOAD_DIR, timeout=30, max_retries=1)
        if result:
            return result

        print("Download failed after all retries. Capturing debug info...")
        try:
            driver.save_screenshot("selenium_error.png")
            with open("page_source.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            print(f"window_handles count: {len(driver.window_handles)}")
            print("Saved selenium_error.png and page_source.html")
        except Exception as dbg:
            print(f"Debug capture failed: {dbg}")
        return None

    except Exception as e:
        print(f"Selenium Error: {e}")
        # Save screenshot for debugging
        try:
            driver.save_screenshot("selenium_error.png")
            print("Saved screenshot to selenium_error.png")
        except Exception:
            pass
        return None
    finally:
        driver.quit()

def fetch_managed_items():
    """
    Fetches the list of items to manage from Google Sheets via GAS.
    """
    print(f"Fetching managed items from GAS...")
    # GAS_WEB_APP_URL은 __main__ 진입점에서 이미 검증됨
    try:
        response = requests.get(GAS_WEB_APP_URL, params={'action': 'getItems'}, timeout=30)
        response.raise_for_status()
        data = response.json()
        return pd.DataFrame(data)
    except requests.exceptions.HTTPError as e:
        print(f"GAS API HTTP error (status {e.response.status_code if e.response else 'unknown'}): {e}")
        print("Falling back to mock data.")
        return get_mock_managed_items()
    except requests.exceptions.RequestException as e:
        print(f"GAS API network error: {e}")
        print("Falling back to mock data.")
        return get_mock_managed_items()
    except (ValueError, KeyError) as e:
        print(f"GAS API response parse error: {e}")
        print("Falling back to mock data.")
        return get_mock_managed_items()

def get_mock_managed_items():
    # Try to load from list.txt if it exists for better testing
    list_file = "list.txt"
    if os.path.exists(list_file):
        try:
            # list.txt: 종목코드	종목명	표준코드	펀드명
            df = pd.read_csv(list_file, sep='\t')
            # Add '구분' column with default value for testing
            df['구분'] = '기타' 
            # Ensure columns match what process_data expects
            # process_data uses: 구분, 종목코드, 종목명, 표준코드
            return df
        except Exception as e:
            print(f"Error loading list.txt: {e}")
            
    # Fallback to simple mock
    return pd.DataFrame([
        {'구분': '국내주식형', '종목코드': '360750', '종목명': 'TIGER 미국S&P500', '표준코드': 'KR7360750004', '펀드명': '미래에셋 TIGER 미국S&P500증권상장지수투자신탁(주식)'},
        {'구분': '국내주식형', '종목코드': '133690', '종목명': 'TIGER 미국나스닥100', '표준코드': 'KR7133690008', '펀드명': '미래에셋 TIGER 미국나스닥100증권상장지수투자신탁(주식)'},
    ])

def p_float(v):
    """
    수수료 문자열을 float로 파싱한다.
    - '%' 제거: "0.05%" → 0.05
    - ',' 제거: "1,234" → 1234.0
    - 파싱 불가 (None, "", "N/A" 등) → 0.0
    """
    try:
        return float(str(v).replace(',', '').replace('%', ''))
    except (ValueError, TypeError, AttributeError):
        return 0.0


def process_data(managed_df, file_path):
    """
    Loads Excel and calculates fees.
    Matching logic: Prioritize '표준코드' (Standard Code) for exact match.
    """
    if not file_path or not os.path.exists(file_path):
        return []
    
    print(f"Processing {file_path}...")
    try:
        # Load Excel - First read without header to find the correct row
        df_raw = pd.read_excel(file_path, header=None)
        
        # Find header row by looking for specific fee/cost columns
        # KOFIA Excel usually has '합계(A)' or '총보수' in the detailed header row
        header_idx = -1
        
        # Strategy: Look for the specific marker '(A)' which denotes "Total Fee (A)" in KOFIA standard
        for i, row in df_raw.head(10).iterrows(): # Check first 10 rows
            row_str = [str(x) for x in row]  # explicit str conversion to avoid TypeError on mixed types
            if any('(A)' in s for s in row_str) and any('합계' in s for s in row_str):
                header_idx = i
                print(f"Header candidates found at row {i} due to '합계(A)'")
                break

        # Fallback Strategies
        if header_idx == -1:
             for i, row in df_raw.head(10).iterrows():
                row_str = [str(x) for x in row]  # explicit str conversion to avoid TypeError on mixed types
                if any('매매' in s and '수수료' in s for s in row_str):
                    header_idx = i
                    break

        if header_idx == -1:
             print("Warning: Could not identify header row. Using default 0.")
             header_idx = 0
             
        print(f"Using Header Row Index: {header_idx}")
        df = pd.read_excel(file_path, header=header_idx)
    
        # Clean naming: remove newlines, spaces, returns
        df.columns = df.columns.astype(str).str.replace('\n', '').str.replace('\r', '').str.strip()

        # 컬럼 정제 완료 후 — 필수 컬럼 유효성 검사 (ETL-04)
        REQUIRED_COLUMNS = {
            "표준코드": lambda cols: any("표준코드" in c for c in cols),
            "합계(A) 또는 총보수": lambda cols: (
                any("합계" in c and "(A)" in c for c in cols) or
                any("총보수" in c for c in cols)
            ),
        }

        missing_required = [
            name
            for name, checker in REQUIRED_COLUMNS.items()
            if not checker(df.columns)
        ]

        if missing_required:
            actual_cols = df.columns.tolist()
            raise ValueError(
                f"KOFIA Excel 필수 컬럼 누락: {missing_required}\n"
                f"실제 발견된 컬럼 ({len(actual_cols)}개): {actual_cols}\n"
                f"원인: KOFIA 파일 형식이 변경되었거나 헤더 행 감지가 실패했을 수 있습니다. "
                f"header_idx={header_idx}를 확인하세요."
            )

        print(f"Column validation passed. Required columns found.")
        print(f"Columns found: {df.columns.tolist()}")
        print(f"Excel Data Row Count: {len(df)}")
        print("First 3 rows of Excel Data:")
        print(df.head(3))

        # Debug: Check for specific columns
        c_code_std = next((c for c in df.columns if '표준코드' in c), None)
        c_total = next((c for c in df.columns if '합계' in c and '(A)' in c), 'MISSING')
        c_other = next((c for c in df.columns if '기타' in c and '비용' in c), 'MISSING')
        c_sell = next((c for c in df.columns if '매매' in c and '수수료' in c), 'MISSING')
        print(f"Mapped Columns -> StdCode: '{c_code_std}', Total: '{c_total}', Other: '{c_other}', Sell: '{c_sell}'")

        results = []
        
        print("\nMatching items...")
        print(f"Managed Items Count: {len(managed_df)}")
        if not managed_df.empty:
            print("First managed field:", managed_df.iloc[0].to_dict())
        
        for _, item in managed_df.iterrows():
            target_code = str(item.get('종목코드', '')).strip()
            target_name = item.get('종목명', '').strip()
            target_std_code = str(item.get('표준코드', '')).strip() # New: Standard Code from Sheet
            
            match = pd.DataFrame()
            matched_by = "None"
            
            # --- Matching Logic ---
            # 1. Standard Code Exact Matching (Strict)
            if target_std_code and c_code_std:
                 match = df[df[c_code_std].astype(str).str.strip() == target_std_code]
                 if not match.empty:
                     matched_by = "Standard Code (Exact)"

            if match.empty:
                print(f"[MISSING] {target_name} (Std: {target_std_code}) - Not found in KOFIA data")
                continue
            
            # Since we match by unique standard code, we expect exactly 1 match (or 0).
            # If KOFIA has duplicates for the same standard code (unlikely), take the first one.
            row = match.iloc[0]
            print(f"[MATCHED] {target_name} -> {row['펀드명']} (by {matched_by})")
            
            # --- Robust Fee Calculation ---
            # Dynamic Column Findings
            col_total = next((c for c in df.columns if '합계' in c and '(A)' in c), None) # 합계(A)
            if not col_total: col_total = next((c for c in df.columns if '총보수' in c), None) # Fallback
            
            col_other = next((c for c in df.columns if '기타' in c and '비용' in c), None) # 기타비용(B)
            
            col_sell = next((c for c in df.columns if '매매' in c and '수수료' in c), None) # 매매·중개수수료율(D)
            
            # Extract Values
            total = p_float(row.get(col_total, 0)) if col_total else 0
            other = p_float(row.get(col_other, 0)) if col_other else 0
            sell = p_float(row.get(col_sell, 0)) if col_sell else 0
            
            # TER = 총보수 + 기타비용
            ter = total + other
            
            # Final Real Cost
            real_cost = ter + sell
            
            # Debug: Print values for verification
            print(f"   Values -> Total: {total} (from {col_total}), Other: {other}, Sell: {sell}, Real: {real_cost}")

            results.append({
                '구분': item['구분'],
                '종목코드': target_code,
                '종목명': target_name,
                '총보수': total,
                '기타비용': other,
                '매매중개수수료': sell,
                '실부담비용': round(real_cost, 4)
            })
            
        print(f"Processed {len(results)} items.")
        return results
        
    except (pd.errors.EmptyDataError, pd.errors.ParserError) as e:
        print(f"Excel parse error — KOFIA file may be corrupted or empty: {e}")
        traceback.print_exc()
        raise
    except ValueError as e:
        # 컬럼 유효성 검사 실패 포함 (Task 2에서 추가)
        print(f"Excel column validation error: {e}")
        traceback.print_exc()
        raise
    except OSError as e:
        print(f"File I/O error while reading Excel ({e.filename}): {e}")
        traceback.print_exc()
        raise
    except Exception as e:
        print(f"Unexpected error processing Excel: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise

def validate_etl_results(results, prev_data):
    """
    ETL 결과 데이터의 무결성을 검증한다. 모든 검증은 soft-warning:
    경고를 출력하고 계속 진행 (ETL 중단 없음, exit_code 변경 없음).

    Args:
        results: process_data() 반환값 (final_data). List[dict].
                 각 항목: {종목코드, 종목명, 실부담비용, ...}
        prev_data: 기존 data.json 로드 결과. List[dict] 또는 None.
                   None이면 DATA-03 이상치 감지를 건너뜀.
    """
    # --- DATA-01: 수수료 범위 검증 (실부담비용 0~5%) ---
    COST_MIN = 0.0
    COST_MAX = 5.0
    for item in results:
        cost = item.get('실부담비용', 0.0)
        if not (COST_MIN <= cost <= COST_MAX):
            print(
                f"[WARNING] DATA-01: {item.get('종목명', item.get('종목코드', '?'))} "
                f"실부담비용 {cost:.4f}% — 정상 범위({COST_MIN}~{COST_MAX}%) 이탈"
            )

    # --- DATA-02: 중복 종목코드 감지 ---
    seen_codes = {}
    for item in results:
        code = item.get('종목코드', '')
        seen_codes[code] = seen_codes.get(code, 0) + 1
    duplicates = [code for code, count in seen_codes.items() if count > 1]
    if duplicates:
        print(
            f"[WARNING] DATA-02: 중복 종목코드 발견 ({len(duplicates)}건): "
            f"{', '.join(duplicates)}"
        )

    # --- DATA-03: 이상치 감지 (이전 data.json 대비 실부담비용 절대 변동폭 ±1.0 이상) ---
    ANOMALY_THRESHOLD = 1.0  # 1%p
    if prev_data is not None:
        prev_map = {item.get('종목코드'): item.get('실부담비용') for item in prev_data}
        for item in results:
            code = item.get('종목코드', '')
            new_cost = item.get('실부담비용', 0.0)
            prev_cost = prev_map.get(code)
            if prev_cost is not None:
                delta = abs(new_cost - prev_cost)
                if delta >= ANOMALY_THRESHOLD:
                    print(
                        f"[WARNING] DATA-03: {item.get('종목명', code)} "
                        f"실부담비용 급변 감지 — 이전: {prev_cost:.4f}%, "
                        f"현재: {new_cost:.4f}%, 변동폭: {delta:.4f}%p "
                        f"(임계값: ±{ANOMALY_THRESHOLD}%p)"
                    )


def fetch_market_data_batch(codes):
    """
    NAVER Finance ETF 리스트 API를 이용해 AUM(억원)과 거래량을 일괄 조회.

    Yahoo Finance(yfinance)는 한국 KSE 상장 ETF에 대해 시가총액/주식수 등
    fundamentals 데이터를 제공하지 않으므로 사용 불가.
    NAVER Finance API는 단일 요청으로 전체 ETF의 marketSum(억원)과
    quant(거래량)를 반환하며, GitHub Actions 환경에서도 정상 동작.
    조회 실패 시 None 반환 (데이터 없이도 ETL 계속 진행).
    """
    NAVER_ETF_URL = "https://finance.naver.com/api/sise/etfItemList.nhn"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": "https://finance.naver.com/",
    }

    # 초기화: 비표준 코드는 미리 None으로 세팅
    result = {}
    for code in codes:
        if not str(code).isdigit():
            print(f"  {code}: 비표준 코드 → 건너뜀")
            result[code] = {"AUM": None, "거래량": None}

    # 표준 코드 집합
    standard_codes = {str(c).zfill(6) for c in codes if str(c).isdigit()}
    if not standard_codes:
        return result

    try:
        resp = requests.get(NAVER_ETF_URL, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        etf_list = data.get("result", {}).get("etfItemList", [])

        # itemcode → {marketSum, quant} 맵 구성
        naver_map = {
            item["itemcode"]: item
            for item in etf_list
            if item.get("itemcode")
        }

        for code in codes:
            code_str = str(code).zfill(6) if str(code).isdigit() else None
            if code_str is None:
                continue  # 이미 위에서 처리됨
            item = naver_map.get(code_str)
            if item:
                aum_eok = item.get("marketSum")  # 이미 억원 단위
                volume = item.get("quant")
                result[code] = {"AUM": aum_eok, "거래량": volume}
                print(f"  {code}: AUM={aum_eok}억, 거래량={volume}")
            else:
                print(f"  {code}: NAVER ETF 목록에서 찾을 수 없음 → AUM=None")
                result[code] = {"AUM": None, "거래량": None}

    except Exception as e:
        print(f"  NAVER ETF API 오류: {e} → 전체 AUM/거래량 None 처리")
        for code in codes:
            if code not in result:
                result[code] = {"AUM": None, "거래량": None}

    return result


def write_update_meta():
    """
    Writes ETL success metadata for frontend "last updated" rendering.
    """
    now_kst = datetime.now(timezone(timedelta(hours=9)))
    payload = {
        "updatedAt": now_kst.strftime("%Y-%m-%d"),
        "updatedAtIso": now_kst.isoformat(timespec="seconds"),
        "timezone": "Asia/Seoul",
        "status": "success"
    }

    meta_path = os.path.join(os.getcwd(), UPDATE_META_FILE)
    try:
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"Saved update metadata to {meta_path}")
        return True
    except Exception as e:
        print(f"Error saving update metadata: {e}")
        return False

def update_google_sheets(data):
    if not data:
        print("No data provided for update.")
        return False

    # 1. Save as local JSON (Static Hosting Support)
    try:
        json_path = os.path.join(os.getcwd(), 'data.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Saved data to {json_path}")
    except Exception as e:
        print(f"Error saving JSON: {e}")
        return False

    if not write_update_meta():
        return False

    # 2. Upload to GAS (Optional / Backup)
    try:
        resp = requests.post(GAS_WEB_APP_URL, json=data, headers={'Content-Type': 'application/json'})
        print("Update Status:", resp.status_code, resp.text)
    except Exception as e:
        print(f"Update Error: {e}")

    return True

if __name__ == "__main__":
    # GAS URL 검사 — 없으면 경고 후 mock 폴백으로 계속 진행
    if not GAS_WEB_APP_URL:
        print("WARNING: GAS_WEB_APP_URL 미설정. mock 데이터로 ETF 목록 대체.")
        print("  로컬: export GAS_WEB_APP_URL='https://script.google.com/...'")
        print("  GitHub Actions: repository Settings > Secrets > GAS_WEB_APP_URL 추가")

    if not os.path.isdir(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)
        print(f"Created DOWNLOAD_DIR: {DOWNLOAD_DIR}")

    exit_code = 0

    # 1. Download via Selenium
    excel_file = download_kofia_excel()
    # excel_file = os.path.join(os.getcwd(), '펀드별 보수비용비교_20260211 (1).xls')
    
    if excel_file and os.path.exists(excel_file):
        # 2. Get Targets
        targets = fetch_managed_items()
        
        # 3. Process
        try:
            final_data = process_data(targets, excel_file)
        except Exception as etl_err:
            print(f"ETL aborted: {etl_err}")
            exit_code = 1
            final_data = []

        # 3.5. Load previous data.json for anomaly detection (DATA-03)
        prev_data = None
        try:
            json_path = os.path.join(os.getcwd(), 'data.json')
            with open(json_path, 'r', encoding='utf-8') as f:
                prev_data = json.load(f)
        except FileNotFoundError:
            print("data.json not found — skipping anomaly detection (first run).")
        except json.JSONDecodeError as e:
            print(f"data.json parse error — skipping anomaly detection: {e}")

        # 3.6. Validate ETL results (DATA-01, DATA-02, DATA-03)
        if final_data:
            validate_etl_results(final_data, prev_data)

        # 4. Fetch AUM and volume from KRX
        if final_data:
            print("Fetching market data (AUM, volume) via pykrx...")
            codes = [item["종목코드"] for item in final_data]
            market_data = fetch_market_data_batch(codes)
            for item in final_data:
                md = market_data.get(item["종목코드"], {})
                item["AUM"] = md.get("AUM")
                item["거래량"] = md.get("거래량")

        # 5. Upload
        if final_data:
            if not update_google_sheets(final_data):
                print("Failed to save ETL outputs.")
                exit_code = 1
        else:
            print("No matching data.")
            exit_code = 1
            
        # 5. Cleanup
        try:
            if os.path.exists(excel_file):
                os.remove(excel_file)
                print(f"Deleted utilized Excel file: {excel_file}")
        except Exception as e:
            print(f"Error deleting Excel file: {e}")
            
    else:
        print("Failed to download Excel.")
        exit_code = 1

    if exit_code != 0:
        sys.exit(exit_code)
