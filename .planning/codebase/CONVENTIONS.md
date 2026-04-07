# 코딩 규칙

**분석일:** 2026-04-07

## 네이밍 패턴

**파일:**
- JavaScript: `script.js`, `gas_script_v2.js`, `translations.js` — 소문자, 복합어는 언더스코어
- Python: `etl_process.py` — snake_case 관례
- HTML: `index.html` — 소문자
- JSON: `data.json`, `changelog.json`, `update-meta.json` — kebab-case 또는 소문자

**함수:**
- JavaScript: 전체적으로 camelCase
  - 동기: `initApp()`, `fetchData()`, `updateLanguage()`, `renderTabs()`, `filterAndRenderTable()`
  - 비동기: `async function initApp()`, `async function loadLanguagePack()`, `async function fetchData()`
  - 헬퍼: `getTranslation()`, `getLanguageFromUrl()`, `normalizePath()`, `buildCanonicalUrlForLanguage()`
  - 초기화: 설정 함수에 `init*` 접두사 (`initNavigation()`, `initLanguage()`, `initSmartHeader()`, `initModal()`)
  - 내부 함수: camelCase 화살표 함수 `const closeNav = () => {}`

- Python: 일관되게 snake_case
  - 모듈 수준 함수: `setup_driver()`, `download_kofia_excel()`, `fetch_managed_items()`, `process_data()`, `write_update_meta()`
  - 타입 힌트 사용 (최신 Python 코드): `def read_json_file(path: Path, default: Any) -> Any:`
  - 헬퍼 함수: `p_float()`, `to_float()`, `row_key()`, `make_index()`

**변수:**
- JavaScript: 모든 변수에 camelCase
  - 전역/모듈 수준: `allData`, `currentLanguage`, `currentCategory`, `currentTranslations`, `lastFocusedBeforeModal`, `latestDataUpdatedAt`
  - 지역: `tbody`, `navLinks`, `selector`, `updated`
  - 상수: 대문자_스네이크_케이스
    - `GAS_API_URL`, `CHANGELOG_URL`, `UPDATE_META_URL`, `I18N_DIR`
    - `SUPPORTED_LANGS`, `DEFAULT_LANG`, `SITE_URL`
    - `LANGUAGE_META`, `LEGACY_HASH_ROUTES`, `HREFLANG_TO_LANG`
  - 캐시 객체: `i18nCache = new Map()`
  - 객체 프로퍼티: camelCase `dataKeys` (category, code, name, fee)

- Python: 변수에 snake_case
  - 상수: 대문자_스네이크_케이스
    - `GAS_WEB_APP_URL`, `DOWNLOAD_DIR`, `UPDATE_META_FILE`, `RESULT_SHEET_NAME`, `MANAGE_SHEET_NAME`
  - DataFrame 변수: `managed_df`, `df_raw`, `df`, `results` 등 설명적 이름
  - 컬럼 참조: 따옴표로 감싼 한국어 컬럼명 `'종목코드'`, `'종목명'`, `'표준코드'`, `'펀드명'`, `'구분'`

**타입:**
- JavaScript: TypeScript 미사용 — 순수 바닐라 JavaScript
- Python: 최신 모듈에서 타입 힌트 사용 (`Path`, `Any`, `list[dict[str, Any]]`)

## 코드 스타일

**포매팅:**
- 포매터 미감지 (`.prettier` 또는 `.eslintrc` 없음)
- 줄 길이 약 100~120자 제한으로 보임
- 들여쓰기: Python 4칸, JavaScript 4칸

**린팅:**
- 린팅 설정 없음
- 코드 스타일은 약간 차이가 있지만 전반적으로 일관성 유지

**주석:**
- JavaScript: 비명확한 로직에 `//` 한 줄 주석
  - 예: `// Hide only if navigation is closed. Open nav shouldn't let header hide...`
  - 예: `// Keep English pack available as a fallback when a locale misses specific keys.`
  - 코드 블록 위 줄에 설명 주석 배치

- Python: 함수 문서화에 독스트링 사용
  - 형식: 함수 시그니처 바로 뒤 삼중 따옴표 독스트링
  - 예: `def download_kofia_excel(): """KOFIA 웹사이트를 자동화하여 펀드 수수료 비교 Excel을 다운로드..."""`
  - 복잡한 매칭 로직 및 폴백 전략에 인라인 주석

## Import 구성

**JavaScript:**
- 명시적 import/export 없음 (HTML 내 바닐라 JS)
- HTML에서 순차적으로 스크립트 로드: `<script src="translations.js"></script>`, `<script src="script.js"></script>`
- `script.js` 상단에 전역 상수 정의 (1~50번째 줄)
- `const`와 `let`으로 전역 상태 변수 선언 (41~58번째 줄)

**Python:**
- 표준 라이브러리 import 먼저
- 서드파티 import를 묶어서 그룹화
- `etl_process.py` 예시:
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

## 에러 처리

**패턴:**

JavaScript는 명시적 에러 로깅과 함께 try-catch 사용:
```javascript
try {
    const response = await fetch(GAS_API_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    // 응답 처리
} catch (error) {
    console.error("Error fetching data:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="loading-text error-text">${getTranslation("table_error")}</td></tr>`;
}
```
- 진행 전 `response.ok`로 HTTP 응답 확인
- 템플릿 리터럴로 설명적 에러 메시지 구성
- 번역된 텍스트로 UI에 사용자 대면 에러 렌더링
- 디버깅용 콘솔 로깅: `console.error()`, `console.warn()`

Python은 우아한 폴백과 함께 try-except 사용:
```python
try:
    # 주 시도
except Exception as e:
    print(f"Error doing X: {e}")
    # 폴백 동작 또는 기본값 반환
```
- `etl_process.py` 예시:
  - 다운로드 실패 → `None` 반환 및 에러 로그
  - 컬럼 감지 → 폴백을 포함한 여러 전략 시도
  - 파일 없음 → 빈 리스트 `[]` 반환
  - JSON 파싱 → 파일 로드 시도, 실패 시 `default` 파라미터 반환

## 로깅

**프레임워크:** `console` 객체 (JavaScript), `print()` (Python)

**패턴:**

JavaScript:
- `console.error()` — 에러 상황
- `console.warn()` — 경고 (예: "Failed to load update metadata")
- info/debug 로깅 미감지

Python:
- `print()` — 모든 출력 (로거 프레임워크 없음)
- 컨텍스트를 포함한 설명적 메시지: `print(f"Processing {file_path}...")`
- 진행 표시자: `print("Entering '상장지수' in Fund Name Search...")`
- 매칭 결과: `print(f"[MATCHED] {target_name} -> {row['펀드명']} (by {matched_by})")`
- 디버그 출력: `print(f"Columns found: {df.columns.tolist()}")`

## 주석 규칙

**주석 작성 시점:**
- JavaScript: 비명확한 제어 흐름 또는 비즈니스 로직 설명
  - 예: `// Hide only if navigation is closed...`
  - 예: `// Keep English pack available as a fallback...`
  - 명확한 코드에는 사용하지 않음 (잘 명명된 함수가 스스로 설명)

- Python: 복잡한 매칭 알고리즘 설명
  - 예: `# Strategy: Look for the specific marker '(A)' which denotes "Total Fee (A)" in KOFIA standard`
  - 폴백 전략 및 그 이유 문서화

**JSDoc/TSDoc:**
- 미사용 (TypeScript 없음, JSDoc 최소화)
- Python에서 독스트링 사용하지만 비공식적

## 함수 설계

**크기:**
- 단일 책임을 가진 작고 집중된 함수
- 예: `initNavigation()`은 네비 설정만, `highlightCurrentNav()`는 하이라이팅만 담당
- 비동기 함수는 종종 짧음: `loadLanguagePack()`, `loadUpdateMeta()`
- 복잡한 처리는 긴 함수 허용: `process_data()` (90줄+)는 상세 주석과 함께 다단계 ETL 처리

**매개변수:**
- JavaScript: 설정에 옵션 객체 사용
  - 예: `updateLanguage(lang, options = { rerender: true, syncUrl: false, historyMode: "replace" })`
  - 구조 분해 사용: `const { rerender = true, syncUrl = false, historyMode = "replace" } = options;`
  - 이벤트 리스너에 콜백 함수 전달: `addEventListener("click", () => { closeNav(); })`

- Python: 위치 파라미터 + 키워드 인수
  - 예: `fetch_managed_items()` — 파라미터 없음
  - 예: `process_data(managed_df, file_path)` — 데이터 객체 전달
  - 선택적 파라미터: `def write_if_changed(path: Path, data: list[dict]) -> bool:`

**반환값:**
- JavaScript: void 함수 (`initApp()`, `initNavigation()`)는 부수 효과 처리
  - 데이터 조회: 함수가 데이터를 반환하거나 전역 상태 수정 (`allData = data;`)
  - 비동기 함수는 Promise 반환: `async function fetchData() { ... }`

- Python: 명시적 반환
  - 성공: 데이터 또는 `True` 반환
  - 실패: `None` 또는 `False` 또는 빈 리스트 `[]` 반환
  - 예: `return results` 또는 에러 시 `return []`

## 모듈 설계

**내보내기:**
- JavaScript: 모듈 시스템 없음 (바닐라 JS, 모든 함수가 전역)
- Python: 모듈 내보내기 없음 — 스크립트가 `if __name__ == "__main__":`으로 실행 파일로 동작

**바렐 파일:**
- 미사용 — 단일 모놀리식 `script.js` (1291줄)
- Python은 별도 스크립트: `etl_process.py`, `scripts/build_changelog.py`, `scripts/sync_server_changelog.py`

**구성:**
- JavaScript `script.js`:
  - 상수 및 설정 (1~58번째 줄)
  - 전역 상태 변수
  - 초기화 함수 (`initApp()`)
  - 기능별 논리적 그룹화:
    - 네비게이션: `initNavigation()`, `highlightCurrentNav()`, `initSmartHeader()`
    - 언어: `initLanguage()`, `loadLanguagePack()`, `updateLanguage()`
    - 데이터: `fetchData()`, `loadUpdateMeta()`, `renderTabs()`, `filterAndRenderTable()`
    - 유틸리티: 끝부분의 헬퍼 함수들

- Python `etl_process.py`:
  - 설정 상수 (16~20번째 줄)
  - 설정 함수: `setup_driver()`
  - 다운로드 함수: `download_kofia_excel()`
  - 데이터 처리: `fetch_managed_items()`, `process_data()`, `update_google_sheets()`
  - 메타데이터: `write_update_meta()`
  - 메인 실행: `if __name__ == "__main__":`

---

*코딩 규칙 분석: 2026-04-07*
