---
phase: 1
plan: A
type: execute
wave: 1
depends_on: []
files_modified:
  - etl_process.py
  - .github/workflows/daily_update.yml
autonomous: true
requirements:
  - ETL-01
must_haves:
  truths:
    - "etl_process.py를 실행하면 GAS_WEB_APP_URL 환경 변수가 없을 때 명확한 에러 메시지를 출력하고 즉시 종료한다"
    - "GitHub Actions 워크플로우가 secrets.GAS_WEB_APP_URL을 환경 변수로 주입한다"
    - "etl_process.py 소스코드에 실제 GAS URL 문자열이 남아 있지 않다"
    - "DOWNLOAD_DIR이 환경 변수 또는 시스템 임시 디렉토리로 대체된다"
  artifacts:
    - path: "etl_process.py"
      provides: "환경 변수 읽기 + 미설정 시 조기 종료 로직"
      contains: "os.environ"
    - path: ".github/workflows/daily_update.yml"
      provides: "GitHub Actions secrets 주입"
      contains: "GAS_WEB_APP_URL"
  key_links:
    - from: ".github/workflows/daily_update.yml"
      to: "etl_process.py"
      via: "env: GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }}"
      pattern: "secrets\\.GAS_WEB_APP_URL"
    - from: "etl_process.py"
      to: "GAS_WEB_APP_URL 환경 변수"
      via: "os.environ.get('GAS_WEB_APP_URL')"
      pattern: "os\\.environ"
---

<objective>
etl_process.py에 하드코딩된 GAS Web App URL과 DOWNLOAD_DIR을 환경 변수로 분리한다.
환경 변수 미설정 시 즉시 실패하며 명확한 오류 메시지를 출력한다.
GitHub Actions workflow에 secrets 주입 설정을 추가한다.

Purpose: 비밀 URL이 소스코드에 노출되는 것을 차단하고, 설정 변경 시 코드 수정 없이 배포가 가능하도록 한다.
Output: 환경 변수 기반으로 동작하는 etl_process.py, secrets 연동 workflow YAML
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

<interfaces>
<!-- etl_process.py 상단 설정 블록 (현재 상태) -->
<!-- Line 18-19 — 수정 대상 -->
```python
GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwx4Bee14DASyNTMz5CrYsb4C4TtNldAcWU3ccj1UJaV1uQAF3lYEJQGaAavfXwpVcJ/exec"
DOWNLOAD_DIR = os.getcwd()
```

<!-- daily_update.yml Run ETL Script 스텝 (현재 상태) -->
<!-- Line 29-30 — secrets 주입 미설정 -->
```yaml
      - name: Run ETL Script
        run: python etl_process.py
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: etl_process.py 환경 변수화 및 조기 종료 처리</name>
  <files>etl_process.py</files>
  <read_first>
    - etl_process.py (전체 — 특히 line 1-20 설정 블록, line 134-150 fetch_managed_items, line 394-419 update_google_sheets)
  </read_first>
  <action>
etl_process.py의 상단 설정 블록(line 18-19)을 다음과 같이 교체한다:

```python
# Configuration — 환경 변수에서 읽음 (하드코딩 금지)
GAS_WEB_APP_URL = os.environ.get("GAS_WEB_APP_URL", "")
DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads"))
```

그 다음, `if __name__ == "__main__":` 블록 최상단(현재 line 422, `exit_code = 0` 이전)에 아래 조기 종료 검사를 추가한다:

```python
if __name__ == "__main__":
    # 필수 환경 변수 검사
    if not GAS_WEB_APP_URL:
        print("ERROR: 환경 변수 GAS_WEB_APP_URL이 설정되지 않았습니다.")
        print("  로컬: export GAS_WEB_APP_URL='https://script.google.com/...'")
        print("  GitHub Actions: repository Settings > Secrets > GAS_WEB_APP_URL 추가")
        sys.exit(1)

    if not os.path.isdir(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)
        print(f"Created DOWNLOAD_DIR: {DOWNLOAD_DIR}")

    exit_code = 0
    # ... 이하 기존 코드 유지
```

`fetch_managed_items()`의 기존 URL 체크 조건(line 139)은 아래와 같이 단순화한다:

```python
def fetch_managed_items():
    print(f"Fetching managed items from GAS...")
    # GAS_WEB_APP_URL은 __main__ 진입점에서 이미 검증됨
    try:
        response = requests.get(GAS_WEB_APP_URL, params={'action': 'getItems'}, timeout=30)
        response.raise_for_status()
        data = response.json()
        return pd.DataFrame(data)
    except Exception as e:
        print(f"Error fetching items from GAS: {e}")
        return get_mock_managed_items()
```

주의: 하드코딩된 URL 문자열(`https://script.google.com/macros/s/AKfycbwx...`)은 파일에서 완전히 제거한다. 주석 포함 어느 위치에도 남겨두지 않는다.
  </action>
  <verify>
    <automated>grep -n "AKfycbwx" /c/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/etl_process.py | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "AKfycbwx" etl_process.py` 결과가 0이어야 한다 (하드코딩 URL 완전 제거)
    - `grep -n "os.environ.get" etl_process.py` 결과에 "GAS_WEB_APP_URL"이 포함된 줄이 존재해야 한다
    - `grep -n "GAS_WEB_APP_URL이 설정되지 않았습니다" etl_process.py` 결과에 최소 1줄이 출력되어야 한다
    - `grep -n "sys.exit(1)" etl_process.py` 결과에 최소 1줄이 출력되어야 한다 (조기 종료)
    - `grep -n "os.makedirs" etl_process.py` 결과에 DOWNLOAD_DIR 관련 줄이 존재해야 한다
    - `python etl_process.py 2>&1` 실행 시 GAS_WEB_APP_URL 미설정 환경에서 exit code 1과 함께 "ERROR: 환경 변수 GAS_WEB_APP_URL이 설정되지 않았습니다." 메시지가 출력되어야 한다
  </acceptance_criteria>
  <done>etl_process.py에 하드코딩된 GAS URL이 없고, GAS_WEB_APP_URL 환경 변수 미설정 시 즉시 sys.exit(1)로 종료된다.</done>
</task>

<task type="auto">
  <name>Task 2: GitHub Actions workflow에 secrets 주입 추가</name>
  <files>.github/workflows/daily_update.yml</files>
  <read_first>
    - .github/workflows/daily_update.yml (전체)
  </read_first>
  <action>
`Run ETL Script` 스텝에 `env` 블록을 추가하여 GitHub Actions secret을 환경 변수로 주입한다.

현재:
```yaml
      - name: Run ETL Script
        run: python etl_process.py
```

변경 후:
```yaml
      - name: Run ETL Script
        env:
          GAS_WEB_APP_URL: ${{ secrets.GAS_WEB_APP_URL }}
        run: python etl_process.py
```

들여쓰기는 YAML 규격에 따라 `env:`가 `run:`과 동일한 수준(8칸 들여쓰기)이어야 한다.

추가로, workflow 파일 상단 `jobs.build.env` 블록 아래에 주석을 추가하여 필요한 secrets를 문서화한다:

```yaml
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
      # Required secrets (set in repository Settings > Secrets and variables > Actions):
      # - GAS_WEB_APP_URL : Google Apps Script Web App URL
```
  </action>
  <verify>
    <automated>grep -n "GAS_WEB_APP_URL" /c/Users/godpierland/OneDrive/Antigravity/ETF비교사이트/.github/workflows/daily_update.yml</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "secrets.GAS_WEB_APP_URL" .github/workflows/daily_update.yml` 결과가 1 이상이어야 한다
    - `grep -c "env:" .github/workflows/daily_update.yml` 결과가 2 이상이어야 한다 (job-level env + step-level env)
    - YAML 파일이 유효한 YAML 구문이어야 한다 (python -c "import yaml; yaml.safe_load(open('.github/workflows/daily_update.yml'))" 오류 없이 실행)
    - `grep -A2 "Run ETL Script" .github/workflows/daily_update.yml` 결과에 "GAS_WEB_APP_URL"이 포함되어야 한다
  </acceptance_criteria>
  <done>GitHub Actions workflow의 Run ETL Script 스텝이 secrets.GAS_WEB_APP_URL을 환경 변수로 주입하며, 필요 secrets 목록이 주석으로 문서화되어 있다.</done>
</task>

</tasks>

<threat_model>
## Threat Model (ASVS L1)

### Assets
- GAS Web App URL (외부에 노출되면 무단 POST 요청 가능)
- GitHub Actions secrets 저장소

### Threats
| Threat | Severity | Mitigation |
|--------|----------|------------|
| GAS URL이 git 히스토리에 영구 기록됨 | HIGH | Task 1에서 URL을 환경 변수로 분리. git 히스토리는 별도로 `git filter-repo`로 정리 필요 (이 Plan 범위 외) |
| 환경 변수 미설정으로 ETL이 잘못된 URL로 요청 | MED | Task 1 조기 종료 검사로 mitigate — 빈 URL이면 즉시 sys.exit(1) |
| GitHub Actions log에 secret 값 노출 | LOW | GitHub Actions는 secrets를 자동으로 마스킹함 — accept |
| DOWNLOAD_DIR이 임의 경로를 가리키도록 조작 | LOW | DOWNLOAD_DIR은 서버 내부 경로. 외부 입력이 아닌 환경 변수로만 설정 — accept |

### Residual Risk
- git 히스토리에 남아 있는 하드코딩 URL은 이 Plan으로 제거되지 않는다. 저장소가 public이라면 `git filter-repo`를 사용하여 히스토리에서 URL을 제거해야 한다. 현재 저장소가 public인 경우 별도 조치 필요.
</threat_model>

<verification>
- `grep -c "AKfycbwx" etl_process.py` == 0
- `grep -c "os.environ.get.*GAS_WEB_APP_URL" etl_process.py` >= 1
- `grep -c "secrets.GAS_WEB_APP_URL" .github/workflows/daily_update.yml` >= 1
- `GAS_WEB_APP_URL='' python etl_process.py`; echo $? 가 1을 출력한다
</verification>

<success_criteria>
- etl_process.py에 GAS URL 하드코딩이 없다
- GAS_WEB_APP_URL 미설정 시 exit code 1과 명확한 한국어 에러 메시지 출력
- GitHub Actions workflow가 secrets.GAS_WEB_APP_URL을 ETL 스텝에 주입한다
- YAML 파일이 유효하다
</success_criteria>

<output>
완료 후 `.planning/phases/01-etl-안정성-강화/01-A-SUMMARY.md` 생성.
</output>
