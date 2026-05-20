---
phase: 02-데이터-무결성-검증
plan: A
type: execute
wave: 1
depends_on: []
files_modified:
  - etl_process.py
autonomous: true
requirements:
  - DATA-01
  - DATA-02
  - DATA-03

must_haves:
  truths:
    - "ETL 실행 시 실부담비용이 0~5% 범위를 벗어나면 [WARNING] DATA-01 경고가 stdout에 출력된다"
    - "ETL 실행 시 final_data 내 종목코드 중복이 있으면 [WARNING] DATA-02 경고가 stdout에 출력된다"
    - "ETL 실행 시 실부담비용이 이전 data.json 대비 ±1.0 이상 변동하면 [WARNING] DATA-03 경고가 stdout에 출력된다"
    - "경고 출력 후 ETL이 중단되지 않고 data.json에 정상적으로 쓰기가 계속된다"
    - "data.json이 없을 때 prev_data=None으로 처리되어 DATA-03 이상치 감지를 건너뛴다"
  artifacts:
    - path: "etl_process.py"
      provides: "validate_etl_results(results, prev_data) 함수 — DATA-01/02/03 soft-warning 검증"
      contains: "def validate_etl_results"
  key_links:
    - from: "__main__ 블록 (line ~534)"
      to: "validate_etl_results(final_data, prev_data)"
      via: "final_data 생성 직후, fetch_market_data_batch() 호출 직전 삽입"
      pattern: "validate_etl_results\\(final_data"
    - from: "__main__ 블록"
      to: "data.json"
      via: "prev_data 로드: open('data.json') → json.load → FileNotFoundError/json.JSONDecodeError → None"
      pattern: "prev_data"
---

<objective>
etl_process.py에 `validate_etl_results(results, prev_data)` 함수를 추가하고, `__main__` 블록에서 호출한다. 이 함수는 DATA-01(수수료 범위), DATA-02(중복 종목코드), DATA-03(이상치) 세 가지 검증을 soft-warning 방식으로 수행한다.

Purpose: KOFIA 파싱 오류(컬럼 매핑 실패, 형식 변경으로 인한 잘못된 파싱)를 ETL이 data.json을 덮어쓰기 전에 stdout 경고로 조기 감지한다. ETL은 경고 후에도 계속 진행된다.

Output: etl_process.py에 validate_etl_results() 함수 추가 + __main__ 블록에 prev_data 로드 및 함수 호출 삽입.
</objective>

<execution_context>
@C:/Users/godpierland/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/godpierland/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-데이터-무결성-검증/02-CONTEXT.md

<interfaces>
<!-- etl_process.py 핵심 구조 — 수정 전 반드시 확인 -->

__main__ 블록 구조 (etl_process.py line 506~568):
```python
if __name__ == "__main__":
    # 필수 환경 변수 검사 (line 507~512)
    # ...

    exit_code = 0

    # 1. Download via Selenium (line 521)
    excel_file = download_kofia_excel()

    if excel_file and os.path.exists(excel_file):
        # 2. Get Targets (line 526)
        targets = fetch_managed_items()

        # 3. Process (line 529~534)
        try:
            final_data = process_data(targets, excel_file)
        except Exception as etl_err:
            print(f"ETL aborted: {etl_err}")
            exit_code = 1
            final_data = []

        # ↑ 여기(line ~535)에 prev_data 로드 및 validate_etl_results() 호출 삽입

        # 4. Fetch AUM and volume (line 537~544)
        if final_data:
            print("Fetching market data (AUM, volume) via pykrx...")
            codes = [item["종목코드"] for item in final_data]
            market_data = fetch_market_data_batch(codes)
            for item in final_data:
                md = market_data.get(item["종목코드"], {})
                item["AUM"] = md.get("AUM")
                item["거래량"] = md.get("거래량")

        # 5. Upload (line 547~553)
        if final_data:
            if not update_google_sheets(final_data):
                ...
```

final_data 구조:
```python
[
    {
        '구분': str,       # e.g., "S&P500"
        '종목코드': str,   # e.g., "360200"  (6자리 문자열)
        '종목명': str,     # e.g., "ACE 미국S&P500"
        '총보수': float,   # e.g., 0.0047   (단위: %)
        '기타비용': float, # e.g., 0.06
        '매매중개수수료': float, # e.g., 0.024
        '실부담비용': float, # e.g., 0.0887  (단위: %, 검증 대상)
        # AUM, 거래량은 validate_etl_results() 호출 시점엔 아직 없음
    },
    ...
]
```

data.json 구조 (prev_data 로드 시 동일):
```json
[{"구분": "S&P500", "종목코드": "360200", "종목명": "ACE 미국S&P500",
  "총보수": 0.0047, "기타비용": 0.06, "매매중개수수료": 0.024,
  "실부담비용": 0.0887, "AUM": 36474, "거래량": 405584}, ...]
```

기존 경고 출력 패턴 (Phase 1에서 확립):
```python
print(f"[MISSING] {target_name} ...")
print(f"[MATCHED] {target_name} -> ...")
print(f"Download not detected (attempt {attempt}/{max_retries}). Retrying in {delay}s...")
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: validate_etl_results() 함수 구현</name>
  <files>etl_process.py</files>

  <read_first>
    - etl_process.py (전체 파일 — 특히 line 218~388 process_data(), line 506~568 __main__ 블록, 기존 print 패턴 확인)
  </read_first>

  <action>
etl_process.py의 `fetch_market_data_batch()` 함수 정의(line 389) 바로 앞, `process_data()` 함수(line 218~388) 바로 뒤에 아래 함수를 삽입한다.

```python
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
```

**삽입 위치:** `process_data()` 함수의 닫는 줄(line 387 `raise`) 이후, `fetch_market_data_batch()` 함수 정의(line 389 `def fetch_market_data_batch`) 이전. 즉, 두 함수 사이 빈 줄 영역에 삽입한다.

**금지 사항:**
- `validate_etl_results()` 내에서 `exit_code` 변경 금지 (soft-warning만)
- `validate_etl_results()` 내에서 파일 I/O 금지 (data.json 읽기/쓰기 없음)
- `p_float()` 재사용 금지 — results의 값은 이미 float이므로 직접 사용
  </action>

  <verify>
    <automated>python -c "import ast; ast.parse(open('etl_process.py', encoding='utf-8').read()); print('Syntax OK')"</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n "def validate_etl_results" etl_process.py` → 출력이 1줄, `validate_etl_results(results, prev_data)` 시그니처 포함
    - `grep -n "DATA-01" etl_process.py` → `[WARNING] DATA-01:` 문자열을 포함하는 줄 존재
    - `grep -n "DATA-02" etl_process.py` → `[WARNING] DATA-02:` 문자열을 포함하는 줄 존재
    - `grep -n "DATA-03" etl_process.py` → `[WARNING] DATA-03:` 문자열을 포함하는 줄 존재
    - `grep -n "COST_MAX = 5.0" etl_process.py` → 해당 줄 존재
    - `grep -n "ANOMALY_THRESHOLD = 1.0" etl_process.py` → 해당 줄 존재
    - `grep -n "exit_code" etl_process.py | grep -v "^.*#"` → validate_etl_results 함수 body에 `exit_code` 없음 (함수 외부의 exit_code만 존재)
    - `python -c "import ast; ast.parse(open('etl_process.py', encoding='utf-8').read()); print('OK')"` → "OK" 출력
  </acceptance_criteria>

  <done>
    validate_etl_results(results, prev_data) 함수가 etl_process.py에 존재하며, DATA-01/02/03 세 검증 블록 모두 포함하고, Python 문법 오류 없이 파싱된다.
  </done>
</task>

<task type="auto">
  <name>Task 2: __main__ 블록에 prev_data 로드 및 validate_etl_results() 호출 삽입</name>
  <files>etl_process.py</files>

  <read_first>
    - etl_process.py (line 506~568 __main__ 블록 — Task 1 수정 후 현재 상태 확인)
  </read_first>

  <action>
etl_process.py `__main__` 블록에서 `process_data()` try/except 블록(line ~529~534) 직후, `fetch_market_data_batch()` 호출 블록(line ~537) 직전에 아래 두 블록을 삽입한다.

**삽입할 코드 (빈 줄 포함, 기존 주석 번호 순서 유지):**

```python
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

```

**삽입 후 __main__ 블록의 흐름 (확인용):**
1. excel 다운로드 (기존)
2. targets = fetch_managed_items() (기존)
3. final_data = process_data() try/except (기존)
4. **[신규] prev_data 로드 (data.json → None fallback)**
5. **[신규] validate_etl_results(final_data, prev_data) — final_data가 있을 때만**
6. fetch_market_data_batch() (기존)
7. update_google_sheets() (기존)

**주의 사항:**
- `prev_data` 로드는 `update_google_sheets()` 호출 이전에 위치해야 한다 (D-09). 현재 구조에서 step 4 위치가 정확함.
- `validate_etl_results()` 호출은 `final_data`가 빈 리스트일 때 건너뛴다 (`if final_data:` 가드).
- 기존 주석 `# 4. Fetch AUM and volume from KRX` 등의 번호는 변경하지 않아도 된다 (3.5, 3.6으로 삽입).
- `json_path` 변수명은 `update_google_sheets()` 내부의 동일 변수명과 충돌하지 않는다 (별도 스코프).
  </action>

  <verify>
    <automated>python -c "import ast; ast.parse(open('etl_process.py', encoding='utf-8').read()); print('Syntax OK')"</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n "validate_etl_results(final_data, prev_data)" etl_process.py` → 1줄 출력, `__main__` 블록 내 위치
    - `grep -n "prev_data = None" etl_process.py` → 1줄 출력 (`__main__` 블록 내)
    - `grep -n "FileNotFoundError" etl_process.py` → prev_data 로드 try/except 블록 내 해당 줄 존재
    - `grep -n "json.JSONDecodeError" etl_process.py` → prev_data 로드 try/except 블록 내 해당 줄 존재
    - `grep -n "validate_etl_results" etl_process.py` → 2줄 출력 (함수 정의 1줄 + 호출 1줄)
    - `python -c "import ast; ast.parse(open('etl_process.py', encoding='utf-8').read()); print('OK')"` → "OK" 출력
    - `python -c "
import json, sys
# validate_etl_results 동작 단위 검증
exec(open('etl_process.py', encoding='utf-8').read().split('if __name__')[0])
results_test = [{'종목코드': 'A', '종목명': 'ETF-A', '실부담비용': 6.0}]
validate_etl_results(results_test, None)
print('UNIT_OK')
" 2>&1` → 출력에 `[WARNING] DATA-01:` 포함 및 `UNIT_OK` 포함
  </acceptance_criteria>

  <done>
    __main__ 블록에 prev_data 로드 블록과 validate_etl_results(final_data, prev_data) 호출이 삽입되어, ETL 실행 시 process_data() 완료 직후 검증이 자동으로 실행된다.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 로컬 파일시스템 → ETL 프로세스 | data.json을 읽어 prev_data로 사용 |
| ETL 프로세스 → stdout | 경고 메시지 출력 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | data.json (prev_data 로드) | accept | 경로가 `os.path.join(os.getcwd(), 'data.json')`으로 하드코딩되어 경로 순회 불가. 파일은 ETL 자체가 쓴 신뢰 데이터. |
| T-02-02 | Information Disclosure | stdout 경고 출력 | accept | 내부 ETL 도구. stdout은 GitHub Actions 로그로만 노출. PII 미포함 (종목코드·수수료 공개 데이터). |
| T-02-03 | Denial of Service | json.JSONDecodeError (data.json 손상) | mitigate | `except json.JSONDecodeError as e: print(...); prev_data = None`으로 처리. ETL 중단 없음. |
| T-02-04 | Spoofing | validate_etl_results 입력 조작 | accept | 함수 입력은 동일 프로세스 내 `process_data()` 반환값. 외부 입력 없음. |

**공격 표면 평가:** 이 Phase는 완전한 내부 ETL 도구 수정으로, 인터넷 노출 없음. 위협 수준 LOW.
</threat_model>

<verification>
## Phase 2 검증

**자동화 검증 명령어 (etl_process.py가 있는 디렉토리에서 실행):**

1. 구문 검사:
```
python -c "import ast; ast.parse(open('etl_process.py', encoding='utf-8').read()); print('Syntax OK')"
```

2. 함수 존재 확인:
```
grep -n "def validate_etl_results" etl_process.py
```
예상 출력: `{line_number}:def validate_etl_results(results, prev_data):`

3. 호출 위치 확인 (fetch_market_data_batch 앞에 위치):
```
grep -n "validate_etl_results\|fetch_market_data_batch\|prev_data = None" etl_process.py
```
예상 출력 순서: `prev_data = None` → `validate_etl_results(final_data, prev_data)` → `fetch_market_data_batch`

4. DATA-01 soft-warning 단위 검증:
```python
python -c "
exec(open('etl_process.py', encoding='utf-8').read().split('if __name__')[0])
r = [{'종목코드': 'A', '종목명': 'TestETF', '실부담비용': 6.0}]
validate_etl_results(r, None)
"
```
예상 출력: `[WARNING] DATA-01: TestETF 실부담비용 6.0000% — 정상 범위(0.0~5.0%) 이탈`

5. DATA-02 중복 단위 검증:
```python
python -c "
exec(open('etl_process.py', encoding='utf-8').read().split('if __name__')[0])
r = [{'종목코드': 'A', '종목명': 'E1', '실부담비용': 0.1},
     {'종목코드': 'A', '종목명': 'E2', '실부담비용': 0.2}]
validate_etl_results(r, None)
"
```
예상 출력: `[WARNING] DATA-02: 중복 종목코드 발견 (1건): A`

6. DATA-03 이상치 단위 검증:
```python
python -c "
exec(open('etl_process.py', encoding='utf-8').read().split('if __name__')[0])
r = [{'종목코드': 'A', '종목명': 'TestETF', '실부담비용': 2.5}]
p = [{'종목코드': 'A', '실부담비용': 0.5}]
validate_etl_results(r, p)
"
```
예상 출력: `[WARNING] DATA-03: TestETF 실부담비용 급변 감지 — 이전: 0.5000%, 현재: 2.5000%, 변동폭: 2.0000%p (임계값: ±1.0%p)`

7. prev_data=None 시 DATA-03 건너뜀 확인:
```python
python -c "
exec(open('etl_process.py', encoding='utf-8').read().split('if __name__')[0])
r = [{'종목코드': 'A', '종목명': 'TestETF', '실부담비용': 2.5}]
validate_etl_results(r, None)
print('NO_DATA03_WARNING_OK')
"
```
예상 출력: `NO_DATA03_WARNING_OK` (DATA-03 경고 없음)
</verification>

<success_criteria>
- [ ] `validate_etl_results(results, prev_data)` 함수가 etl_process.py에 존재한다
- [ ] 함수는 DATA-01(범위 0~5%), DATA-02(중복 종목코드), DATA-03(±1.0%p 변동) 세 검증을 수행한다
- [ ] 모든 경고는 `[WARNING] DATA-0X:` 접두사로 stdout에 출력된다
- [ ] 경고 후 ETL이 중단되지 않는다 (exit_code 변경 없음)
- [ ] __main__ 블록에서 final_data 생성 직후, fetch_market_data_batch() 호출 직전에 함수가 호출된다
- [ ] data.json 없을 시 prev_data=None으로 처리되고 DATA-03을 건너뛴다
- [ ] data.json 파싱 오류 시 ETL이 중단되지 않는다 (json.JSONDecodeError 처리)
- [ ] Python 구문 오류 없음 (`ast.parse` 통과)
</success_criteria>

<output>
완료 후 `.planning/phases/02-데이터-무결성-검증/02-A-SUMMARY.md`를 생성한다.

SUMMARY에 포함할 내용:
- 추가된 함수 시그니처와 위치 (etl_process.py line 번호)
- 세 가지 검증 규칙 (임계값 포함)
- __main__ 삽입 위치 (before/after 기준 함수명)
- Phase 4 (ETL 단위 테스트)를 위한 참고사항: validate_etl_results()는 순수 함수(파일 I/O 없음)이므로 단위 테스트가 용이함
</output>
