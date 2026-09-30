---
phase: 1
plan: B
type: execute
wave: 2
depends_on:
  - 01-PLAN-A
files_modified:
  - etl_process.py
autonomous: true
requirements:
  - ETL-02
must_haves:
  truths:
    - "검색 클릭 후 고정 20초 sleep이 사라지고, 데이터 그리드가 실제로 로드되면 즉시 다음 단계로 진행한다"
    - "Excel 다운로드 감지 루프가 실패할 때마다 대기 시간이 두 배씩 늘어난다 (지수 백오프)"
    - "최대 재시도 횟수(3회)를 초과하면 명확한 에러 메시지와 함께 None을 반환한다"
    - "다운로드 감지에 .crdownload 임시 파일이 완전히 사라졌는지 확인하는 조건이 포함된다"
  artifacts:
    - path: "etl_process.py"
      provides: "지수 백오프 재시도 + WebDriverWait 기반 그리드 로드 감지"
      contains: "exponential_backoff"
  key_links:
    - from: "download_kofia_excel()"
      to: "검색 결과 그리드"
      via: "WebDriverWait + EC.presence_of_element_located"
      pattern: "WebDriverWait.*presence_of_element_located"
    - from: "download_kofia_excel()"
      to: "파일 시스템"
      via: "glob + os.path.getmtime + crdownload 체크"
      pattern: "\\.crdownload"
---

<objective>
etl_process.py의 Selenium 다운로드 로직에서 고정 sleep을 제거하고, 지수 백오프 기반 재시도 + WebDriverWait 기반 그리드 로드 감지로 교체한다.

Purpose: 네트워크 지연이나 KOFIA 서버 응답 지연에도 불필요한 대기 없이 안정적으로 동작하도록 한다. 실패 시 정보 있는 에러 메시지를 남긴다.
Output: download_kofia_excel() 함수가 지수 백오프 + 적응형 대기로 동작하는 etl_process.py
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

<interfaces>
<!-- etl_process.py의 download_kofia_excel() 현재 구조 요약 -->
<!-- 수정 대상 라인: 86-120 -->
```python
# line 87 — 제거 대상: 고정 20초 sleep
time.sleep(20)

# line 104-117 — 교체 대상: 단순 polling 루프
timeout = 60
end_time = time.time() + timeout
while time.time() < end_time:
    files = glob.glob(...) + glob.glob(...)
    if files:
        latest_file = max(files, key=os.path.getmtime)
        if time.time() - os.path.getmtime(latest_file) < 60:
            if os.path.getsize(latest_file) > 0 and not latest_file.endswith('.crdownload'):
                return latest_file
    time.sleep(1)
```

<!-- Selenium imports 현재 사용 가능 -->
```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 고정 sleep(20) 제거 — WebDriverWait 그리드 로드 감지로 교체</name>
  <files>etl_process.py</files>
  <read_first>
    - etl_process.py (line 51-133 — download_kofia_excel 함수 전체)
  </read_first>
  <action>
`download_kofia_excel()` 함수 내부의 고정 `time.sleep(20)` (현재 line 87)을 제거하고, WebDriverWait 기반 그리드 로드 감지로 교체한다.

교체 전:
```python
        # 4. Wait for Grid/Table (Loading)
        print("Waiting for data to load (20s)...")
        time.sleep(20)
```

교체 후:
```python
        # 4. Wait for Grid/Table (Loading) — 고정 sleep 대신 그리드 행 출현 대기
        print("Waiting for data grid to load...")
        try:
            # KOFIA WebSquare 그리드: 첫 번째 데이터 행이 나타날 때까지 최대 60초 대기
            # 그리드 행 선택자는 WebSquare 공통 패턴인 tr[id*='gridView'] 사용
            wait.until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "tr[id*='gridView'], div[id*='gridView'] tr")
                )
            )
            print("Data grid loaded.")
        except Exception as grid_wait_err:
            # 그리드 선택자가 맞지 않을 경우 — 짧은 폴백 sleep 사용 (5초)
            print(f"Grid wait timed out ({grid_wait_err}). Using 5s fallback sleep.")
            time.sleep(5)
```

주의사항:
- `wait` 변수는 이미 `WebDriverWait(driver, 30)`으로 정의되어 있음 (line 62). 재사용한다.
- 그리드 선택자가 실패해도 ETL이 중단되지 않도록 폴백 sleep(5)을 유지한다.
- `time` import는 이미 존재하므로 추가 import 불필요.
  </action>
  <verify>
    <automated>grep -n "time.sleep(20)" /c/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/etl_process.py</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "time.sleep(20)" etl_process.py` 결과가 0이어야 한다
    - `grep -c "presence_of_element_located" etl_process.py` 결과가 1 이상이어야 한다
    - `grep -c "gridView" etl_process.py` 결과가 1 이상이어야 한다
    - `grep -c "폴백 sleep" etl_process.py` 결과가 1 이상이어야 한다 (폴백 주석 존재)
  </acceptance_criteria>
  <done>download_kofia_excel()에서 time.sleep(20)이 제거되고, WebDriverWait 기반 그리드 로드 감지 코드가 동일 위치에 삽입되어 있다.</done>
</task>

<task type="auto">
  <name>Task 2: 다운로드 감지 루프를 지수 백오프 재시도로 교체</name>
  <files>etl_process.py</files>
  <read_first>
    - etl_process.py (line 100-133 — 다운로드 대기 루프 + finally 블록)
  </read_first>
  <action>
`download_kofia_excel()` 내부의 단순 polling 루프(현재 line 104-117)를 지수 백오프 함수 기반으로 교체한다.

파일 상단의 함수 정의 영역(setup_driver 함수 바로 위, 현재 line 22)에 헬퍼 함수를 추가한다:

```python
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
```

`download_kofia_excel()` 내부의 기존 다운로드 대기 루프를 아래와 같이 교체한다:

교체 전 (line 104-120):
```python
        # 6. Wait for download
        print("Waiting for file download...")
        timeout = 60
        end_time = time.time() + timeout
        while time.time() < end_time:
            files = glob.glob(os.path.join(DOWNLOAD_DIR, "*.xls")) + glob.glob(os.path.join(DOWNLOAD_DIR, "*.xlsx"))
            if files:
                latest_file = max(files, key=os.path.getmtime)
                if time.time() - os.path.getmtime(latest_file) < 60:
                    if os.path.getsize(latest_file) > 0 and not latest_file.endswith('.crdownload'):
                        print(f"Downloaded: {latest_file}")
                        return latest_file
            time.sleep(1)

        print("Download timed out.")
        return None
```

교체 후:
```python
        # 6. Wait for download — 지수 백오프 재시도 (최대 3회, 각 90초)
        print("Waiting for file download...")
        result = _wait_for_download(DOWNLOAD_DIR, timeout=90, max_retries=3)
        if result:
            return result

        print("Download failed after all retries.")
        return None
```

주의: `.crdownload` 체크는 `_wait_for_download` 내부에서 파일 목록 분리로 처리한다 (`crdownload_files`가 존재하면 아직 다운로드 중이므로 대기).
  </action>
  <verify>
    <automated>grep -n "exponential\|delay \*= 2\|max_retries\|_wait_for_download" /c/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/etl_process.py</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "delay \*= 2" etl_process.py` 결과가 1이어야 한다 (지수 백오프 핵심 라인)
    - `grep -c "_wait_for_download" etl_process.py` 결과가 2 이상이어야 한다 (정의 + 호출)
    - `grep -c "max_retries" etl_process.py` 결과가 2 이상이어야 한다 (파라미터 + 사용)
    - `grep -c "crdownload_files" etl_process.py` 결과가 1 이상이어야 한다
    - `grep -c "timeout = 60" etl_process.py` 결과가 0이어야 한다 (구 루프 제거 확인)
    - `python -c "import ast; ast.parse(open('etl_process.py').read()); print('syntax ok')"` 가 "syntax ok"를 출력해야 한다
  </acceptance_criteria>
  <done>_wait_for_download() 헬퍼 함수가 파일 상단에 정의되어 있고, download_kofia_excel()이 이를 호출하며, 지수 백오프(2→4→8초)로 최대 3회 재시도한다. .crdownload 파일 존재 시 다운로드 미완료로 판단한다.</done>
</task>

</tasks>

<threat_model>
## Threat Model (ASVS L1)

### Assets
- GitHub Actions 실행 시간 (불필요한 sleep은 비용 낭비)
- ETL 결과의 신뢰성 (다운로드 실패를 침묵으로 넘기면 빈 data.json 생성)

### Threats
| Threat | Severity | Mitigation |
|--------|----------|------------|
| 무한 루프 또는 과도한 대기로 Actions 타임아웃 | MED | max_retries=3, timeout=90으로 상한 고정 — mitigate |
| 다운로드 실패를 성공으로 오인 (빈 파일 감지) | MED | getsize > 0 조건 유지, .crdownload 분리 감지 — mitigate |
| KOFIA 사이트 선택자 변경으로 그리드 감지 실패 | LOW | 폴백 sleep(5) 보존, finally에서 driver.quit() 보장 — accept |
| 여러 다운로드 파일이 혼재하여 잘못된 파일 선택 | LOW | os.path.getmtime 기준 최신 파일 선택 + 90초 내 수정 조건 — accept |

### Residual Risk
- KOFIA WebSquare 그리드 CSS 선택자(`tr[id*='gridView']`)가 실제 KOFIA 사이트와 다를 경우 폴백 sleep(5)으로 처리된다. 실제 실행 후 로그를 확인하여 선택자를 조정해야 할 수 있다.
</threat_model>

<verification>
- `grep -c "time.sleep(20)" etl_process.py` == 0
- `grep -c "delay \*= 2" etl_process.py` == 1
- `grep -c "_wait_for_download" etl_process.py` >= 2
- `python -c "import ast; ast.parse(open('etl_process.py').read())"` 오류 없음
</verification>

<success_criteria>
- download_kofia_excel()에 고정 time.sleep(20)이 없다
- _wait_for_download() 함수가 max_retries=3, delay *= 2 지수 백오프를 구현한다
- .crdownload 파일 존재 시 다운로드 미완료로 처리한다
- 파이썬 파일 문법 오류가 없다
</success_criteria>

<output>
완료 후 `.planning/phases/01-etl-안정성-강화/01-B-SUMMARY.md` 생성.
</output>
