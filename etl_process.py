import pandas as pd
import requests
import json
import os
import glob
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Configuration
# Replace with your actual GAS Web App URL
GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwx4Bee14DASyNTMz5CrYsb4C4TtNldAcWU3ccj1UJaV1uQAF3lYEJQGaAavfXwpVcJ/exec" 
DOWNLOAD_DIR = os.getcwd() # Current directory for downloads

def setup_driver():
    """
    Sets up the Chrome WebDriver with options for downloading files.
    """
    options = webdriver.ChromeOptions()
    
    # Check if running in GitHub Actions (Headless Mode)
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        print("Running in GitHub Actions (Headless Mode)")
        options.add_argument("--headless")
        options.add_argument("--window-size=1920,1080")
    # else:
    #    options.add_argument("--headless") # Uncomment for local headless

    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    prefs = {
        "download.default_directory": DOWNLOAD_DIR,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True
    }
    options.add_experimental_option("prefs", prefs)
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
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
             fund_nm_input.send_keys("상장지수")
             print("Entered '상장지수'")
             time.sleep(1)
        except Exception as e:
             print(f"Error entering fund name: {e}")
             return None

        # 3. Click Search
        print("Clicking Search...")
        driver.execute_script("arguments[0].click();", search_btn)
        
        # 4. Wait for Grid/Table (Loading)
        print("Waiting for data to load (20s)...")
        time.sleep(20) 
        
        # 5. Looking for Excel Download button
        print("Looking for Excel Download button...")
        try:
            excel_btn = driver.find_element(By.XPATH, "//img[contains(@alt, '엑셀') or contains(@alt, 'Excel')]/parent::*")
        except:
            try:
                excel_btn = driver.find_element(By.CSS_SELECTOR, "#btnExcel, #excelDown")
            except:
                 print("Excel button not found!")
                 return None
            
        print("Clicking Excel Download...")
        driver.execute_script("arguments[0].click();", excel_btn)
        
        # 6. Wait for download
        print("Waiting for file download...")
        timeout = 60
        end_time = time.time() + timeout
        while time.time() < end_time:
            files = glob.glob(os.path.join(DOWNLOAD_DIR, "*.xls")) + glob.glob(os.path.join(DOWNLOAD_DIR, "*.xlsx"))
            if files:
                latest_file = max(files, key=os.path.getmtime)
                # Check modified time < 1 min ago
                if time.time() - os.path.getmtime(latest_file) < 60:
                    # Check not incomplete
                    if os.path.getsize(latest_file) > 0 and not latest_file.endswith('.crdownload'):
                        print(f"Downloaded: {latest_file}")
                        return latest_file
            time.sleep(1)
            
        print("Download timed out.")
        return None

    except Exception as e:
        print(f"Selenium Error: {e}")
        # Save screenshot for debugging
        try:
            driver.save_screenshot("selenium_error.png")
            print("Saved screenshot to selenium_error.png")
        except:
            pass
        return None
    finally:
        driver.quit()

def fetch_managed_items():
    """
    Fetches the list of items to manage from Google Sheets via GAS.
    """
    print(f"Fetching managed items from: {GAS_WEB_APP_URL}")
    if "YOUR_GAS_WEB_APP_URL" in GAS_WEB_APP_URL:
        print("Warning: GAS Checklist - URL not set. Using mock.")
        return get_mock_managed_items()

    try:
        response = requests.get(GAS_WEB_APP_URL, params={'action': 'getItems'})
        response.raise_for_status()
        data = response.json()
        return pd.DataFrame(data)
    except Exception as e:
        print(f"Error fetching items from GAS: {e}")
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
            row_str = row.astype(str).values
            if any('(A)' in s for s in row_str) and any('합계' in s for s in row_str):
                header_idx = i
                print(f"Header candidates found at row {i} due to '합계(A)'")
                break
        
        # Fallback Strategies
        if header_idx == -1:
             for i, row in df_raw.head(10).iterrows():
                row_str = row.astype(str).values
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
            def p_float(v):
                try: 
                    return float(str(v).replace(',', '').replace('%',''))
                except: 
                    return 0.0

            # Dynamic Column Findings
            col_total = next((c for c in df.columns if '합계' in c and '(A)' in c), None) # 합계(A)
            if not col_total: col_total = next((c for c in df.columns if '총보수' in c), None) # Fallback
            
            col_other = next((c for c in df.columns if '기타' in c and '비용' in c), None) # 기타비용(B)
            
            col_sell = next((c for c in df.columns if '매매' in c and '수수료' in c), None) # 매매·중계수수료율(D)
            
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
                '매매중계수수료': sell,
                '실부담비용': real_cost
            })
            
        print(f"Processed {len(results)} items.")
        return results
        
    except Exception as e:
        print(f"Error processing Excel: {e}")
        return []

def update_google_sheets(data):
    # 1. Save as local JSON (Static Hosting Support)
    try:
        json_path = os.path.join(os.getcwd(), 'data.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Saved data to {json_path}")
    except Exception as e:
        print(f"Error saving JSON: {e}")

    # 2. Upload to GAS (Optional / Backup)
    if not data: return
    try:
        resp = requests.post(GAS_WEB_APP_URL, json=data, headers={'Content-Type': 'application/json'})
        print("Update Status:", resp.status_code, resp.text)
    except Exception as e:
        print(f"Update Error: {e}")

if __name__ == "__main__":
    # 1. Download via Selenium
    excel_file = download_kofia_excel()
    # excel_file = os.path.join(os.getcwd(), '펀드별 보수비용비교_20260211 (1).xls')
    
    if excel_file and os.path.exists(excel_file):
        # 2. Get Targets
        targets = fetch_managed_items()
        
        # 3. Process
        final_data = process_data(targets, excel_file)
        

        # 4. Upload
        if final_data:
            update_google_sheets(final_data)
        else:
            print("No matching data.")
            
        # 5. Cleanup
        try:
            if os.path.exists(excel_file):
                os.remove(excel_file)
                print(f"Deleted utilized Excel file: {excel_file}")
        except Exception as e:
            print(f"Error deleting Excel file: {e}")
            
    else:
        print("Failed to download Excel.")
