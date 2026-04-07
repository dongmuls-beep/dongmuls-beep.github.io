# 테스트 패턴

**분석일:** 2026-04-07

## 테스트 프레임워크

**현황:** 자동화된 테스트 프레임워크 없음

**테스트 방식:**
- 수동 테스트만 진행
- Jest, Vitest, pytest, unittest 설정 없음
- 테스트 파일 없음 (`.test.js`, `.spec.js`, `test_*.py`)

**현재 테스트 방식:**
- GitHub Actions CI가 ETL 스크립트를 직접 실행: `python etl_process.py` (`.github/workflows/daily_update.yml`)
- 스크립트 실행 후 출력 파일 수동 검증
- 브라우저에서 프론트엔드 수동 테스트

**사용 가능한 명령어:**
```bash
# 자동화된 테스트 러너 없음
# 수동 검증:
python etl_process.py              # ETL 실행, 출력 data.json 검증
python scripts/build_changelog.py  # 변경 이력 생성, changelog.json 확인
python scripts/sync_server_changelog.py --url [url]  # 서버에서 동기화
```

## 테스트 파일 구성

**위치:** 테스트 디렉토리 구조 없음

**네이밍 규칙:** 해당 없음 — 테스트 파일 없음

**현재 파일 구조:**
- `etl_process.py` — 프로덕션 스크립트 (자체 검증 로직 포함)
- `scripts/build_changelog.py` — 프로덕션 스크립트
- `scripts/sync_server_changelog.py` — 프로덕션 스크립트
- `gas_script_v2.js` — Google Apps Script (프로덕션)
- `script.js` — 프론트엔드 애플리케이션 (프로덕션)

## 코드 내 유효성 검사

**ETL 유효성 검사 (`etl_process.py`):**

테스트 프레임워크가 없으므로 검증 로직이 프로덕션 코드에 내장됨:

```python
# setup_driver() 내부
if os.environ.get('GITHUB_ACTIONS') == 'true':
    print("Running in GitHub Actions (Headless Mode)")
    options.add_argument("--headless")
```

```python
# download_kofia_excel() 내부
if time.time() - os.path.getmtime(latest_file) < 60:
    # 불완전 다운로드 여부 확인
    if os.path.getsize(latest_file) > 0 and not latest_file.endswith('.crdownload'):
        print(f"Downloaded: {latest_file}")
        return latest_file
time.sleep(1)
```

```python
# fetch_managed_items() 내부
try:
    response = requests.get(GAS_WEB_APP_URL, params={'action': 'getItems'})
    response.raise_for_status()
    data = response.json()
    return pd.DataFrame(data)
except Exception as e:
    print(f"Error fetching items from GAS: {e}")
    return get_mock_managed_items()  # 테스트용 모의 데이터로 폴백
```

```python
# process_data() 내부 — 컬럼 유효성 검사
col_total = next((c for c in df.columns if '합계' in c and '(A)' in c), None)
if not col_total: col_total = next((c for c in df.columns if '총보수' in c), None)  # 폴백
```

**프론트엔드 유효성 검사 (`script.js`):**

```javascript
// fetchData() 내부 데이터 유효성 검사
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
        throw new Error("Invalid data format");  // 데이터가 배열인지 검사
    }
```

```javascript
// 언어팩 유효성 검사
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
        return loadLanguagePack(DEFAULT_LANG);  // 기본 언어로 폴백
    }
    console.error("Language pack loading failed:", error);
    return {};
}
```

**변경 이력 유효성 검사 (`scripts/build_changelog.py`):**

```python
def build_changes(prev_rows, curr_rows):
    # 데이터 형식의 견고한 처리
    for key, curr_row in curr_index.items():
        prev_row = prev_index.get(key)
        if not prev_row:
            continue
        # 실제 변경사항만 보고
        if before != after:
            changes.append({...})

# 멱등적 변경 이력 업데이트
if changelog_entries:
    last_entry = changelog_entries[-1]
    if (isinstance(last_entry, dict) and 
        last_entry.get("updatedAt") == today and 
        last_entry.get("changes") == changes):
        print("[changelog] latest entry already matches today's changes")
        return 0
```

## 테스트 전략

**GitHub Actions를 통한 통합 테스트:**

`.github/workflows/daily_update.yml`의 CI 파이프라인이 주요 통합 테스트 역할:

```yaml
- name: ETL 스크립트 실행
  run: python etl_process.py

- name: 변경 이력 생성
  run: python scripts/build_changelog.py

- name: 변경사항 커밋 및 Push
  uses: stefanzweifel/git-auto-commit-action@v4
```

이를 통해 검증되는 항목:
1. Excel 다운로드 동작 여부
2. 데이터 처리 완료 여부
3. 변경 이력 생성 성공 여부
4. 출력 파일이 유효한 JSON인지
5. Git 커밋 성공 여부 (파일 형식 암묵적 검증)

**수동 검증:**

출력 파일을 직접 확인해야 함:
- `data.json`: 필수 필드가 있는 ETF 레코드 배열인지
- `changelog.json`: month/updatedAt/changes 구조를 가진 변경 항목 배열인지
- `update-meta.json`: updatedAt, updatedAtIso, timezone, status가 있는 객체인지

**프론트엔드 테스트:**

수동 브라우저 테스트로 확인:
- 언어 전환 동작 여부
- 데이터 테이블 렌더링 여부
- 네비게이션 기능 여부
- 모달 인터랙션 여부
- 변경 이력 표시 여부

## 에러 처리 패턴

**Python — 우아한 성능 저하:**

```python
def fetch_managed_items():
    # 주 원천 시도
    try:
        response = requests.get(GAS_WEB_APP_URL, params={'action': 'getItems'})
        response.raise_for_status()
        data = response.json()
        return pd.DataFrame(data)
    except Exception as e:
        print(f"Error fetching items from GAS: {e}")
        return get_mock_managed_items()  # 모의 데이터로 폴백
```

```python
def download_kofia_excel():
    try:
        # 다운로드 로직
    except Exception as e:
        print(f"Selenium Error: {e}")
        try:
            driver.save_screenshot("selenium_error.png")  # 디버그 산출물
            print("Saved screenshot to selenium_error.png")
        except:
            pass
        return None  # 호출자에게 실패 신호
    finally:
        driver.quit()  # 항상 정리
```

**JavaScript — 사용자 대면 에러 메시지:**

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

**폴백 체인:**

```javascript
// 영어 폴백을 포함한 언어 로딩
if (!i18nCache.has("en")) {
    await loadLanguagePack("en");  // 영어 사용 가능 보장
}

async function loadLanguagePack(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
        return loadLanguagePack(DEFAULT_LANG);  // 미지원 언어 리다이렉트
    }
    if (i18nCache.has(lang)) {
        return i18nCache.get(lang);  // 캐시 사용
    }
    try {
        // 서버에서 로드
    } catch (error) {
        if (lang !== DEFAULT_LANG) {
            return loadLanguagePack(DEFAULT_LANG);  // 기본 언어로 폴백
        }
        console.error("Language pack loading failed:", error);
        return {};
    }
}
```

## 데이터 유효성 검사 패턴

**ETL 데이터 매칭 (`process_data`):**

```python
# 다중 전략 컬럼 감지
col_total = next((c for c in df.columns if '합계' in c and '(A)' in c), None)
if not col_total: 
    col_total = next((c for c in df.columns if '총보수' in c), None)

# 안전한 값 추출
def p_float(v):
    try: 
        return float(str(v).replace(',', '').replace('%',''))
    except: 
        return 0.0

total = p_float(row.get(col_total, 0)) if col_total else 0
```

**프론트엔드 데이터 유효성 검사:**

```javascript
// 데이터 형태 보장
if (!Array.isArray(data)) {
    throw new Error("Invalid data format");
}

// 데이터 키 동적 해결 (스키마 변형 처리)
function resolveDataKeys(sample) {
    const pick = (preferred, candidates, index) => {
        const exact = keys.find((key) => key === preferred);
        if (exact) return exact;
        const partial = keys.find((key) => candidates.some((candidate) => String(key).includes(candidate)));
        if (partial) return partial;
        return keys[index] || preferred;
    };
    // 컬럼 동적 매핑...
}
```

## 테스트 추가 권고사항

**추가해야 할 항목:**

1. **단위 테스트** — 데이터 변환 함수 테스트
   - 언어팩 로딩 폴백 체인
   - 데이터 키 해결 로직
   - Python ETL의 수수료 계산

2. **통합 테스트** — API 응답 모킹
   - 에러 케이스를 포함한 fetch 작업
   - 실제 git diff를 이용한 변경 이력 생성
   - 언어 선택 유지

3. **E2E 테스트** — 브라우저 자동화 (Cypress 또는 Playwright)
   - ETF 테이블 렌더링
   - 언어 전환
   - 네비게이션
   - 모바일 반응형

4. **회귀 테스트** — ETL 실행 전
   - Excel 파일 형식 변경 여부 검증
   - KOFIA 웹사이트 구조 검증
   - data.json 스키마 확인

## 커버리지 현황

**현재 커버리지:** 측정 불가 — 테스트 프레임워크 없음

**고위험 미테스트 영역:**
- `script.js` (1291줄) — 모든 프론트엔드 로직 미테스트
- `etl_process.py` — Selenium 자동화 미테스트
- `process_data()`의 Excel 파싱 폴백 전략
- 언어팩 폴백 체인
- 누락 필드에 대한 데이터 키 해결

**중위험 영역:**
- 변경 이력 생성 엣지 케이스 (멱등성 로직)
- `i18nCache`의 캐시 관리
- 모달 포커스 관리

**저위험 영역:**
- Google Sheets 연동 (CI 실행으로 테스트됨)
- 정적 데이터 제공
- 단순 유틸리티 함수

---

*테스트 분석: 2026-04-07*
