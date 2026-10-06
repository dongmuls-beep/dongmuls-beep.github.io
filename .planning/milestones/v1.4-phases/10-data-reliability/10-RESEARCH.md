# Phase 10: 데이터 신뢰성 - Research

**Researched:** 2026-09-30
**Domain:** Python ETL (pandas/openpyxl/xlrd) + JSON serialization + git-diff-based changelog/fee-history chain
**Confidence:** HIGH for code/behaviour findings (verified by running code against a real KOFIA xls), MEDIUM for what the WebSquare-grid extraction path emits for missing cells (no sample of that path exists)

## User Constraints

No `10-CONTEXT.md` exists (phase dir was empty). Locked decisions come from STATE.md "Decisions (v1.4)" and ROADMAP:

### Locked Decisions
- 결측은 `null` (0.0 아님), 프런트는 `Number.isFinite`로 가드
- 신규 의존성 0 (Python stdlib + 브라우저 API)
- 최대 병렬: 파일 소유권 분리 (OneDrive라 git worktree 불가)
- Phase 10 owns files: `etl_process.py`, `scripts/build_changelog.py`, `tests/test_*.py` (기존 `tests/test_fees.py`의 `p_float == 0.0` 단언 의도적 갱신 포함)
- CI가 `fee-history.json` 단독 작성자; pre-commit 훅이 `data.json`/`changelog.json` 덮어씀 → 테스트는 fixture 사용
- `script.js`/`style.css`는 UTF-8 BOM + CRLF 보존 (Phase 10은 건드리지 않음), 신규 파일은 LF/BOM 없음

### Claude's Discretion
- Which raw tokens map to null vs 0.0; carry-forward vs emit-null mechanics inside the ETL; helper placement; test layout.

### Deferred Ideas (OUT OF SCOPE)
- Any `script.js` change (Phase 11), RSS (Phase 12), calculator (Phase 13), a11y (Phase 14). Do NOT plan them here.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-07 | Unparseable / NaN / inf fee cell -> `null` in data.json, valid JSON | New `p_float` contract (Code Examples 1), `allow_nan=False` on write, verified `json.dump` NaN behaviour |
| DATA-08 | Any missing component -> `실부담비용` null; ETL keeps running with soft-warning only | `process_data` rewrite (Ex. 2), None-aware `validate_etl_results` (Ex. 3) |
| DATA-09 | Null pair never becomes a change in changelog or fee-history | `build_changelog.build_changes` null-transition skip + `to_float` isfinite (Ex. 4); fee-history already skips null (verified); e2e chain test |
</phase_requirements>

## Summary

**Zero-vs-missing finding (the key open question), verified.** The repo does contain a real KOFIA Excel: `.debug-artifacts/downloads/_` (CDFV2 .xls, 1101x17, byte-identical to the copies in `.debug-artifacts/26492815818/downloads/_` and `.../26495398144/downloads/_`; it is the CI Chrome-native download, saved with filename `_`). Reading it with xlrd shows every fee cell in columns 운용/판매/수탁/사무관리/합계(A)/기타비용(B)/TER/매매·중개수수료율(D) is cell type 2 (NUMBER): **zero EMPTY cells, zero TEXT cells, zero "-", zero NaN** across all 1099 fund rows. A legitimately zero fee is emitted as a **numeric `0`** (pandas int64/float 0): 13 funds have 기타비용(B)=0 and 31 have 매매·중개수수료율(D)=0 (e.g. TIGER 기술이전바이오, TIGER 미국우주테크, 하나1Q 코스닥150, 한화PLUS 코스닥150). Running the current `process_data` against three of those rows preserves them as `0.0` correctly. So in the native xls, **missing does not occur and zero is an unambiguous number**; there is no sample of "-" or blank at all. [VERIFIED: xlrd + pandas run against .debug-artifacts/downloads/_ in this session]

**Caveat:** production ETL (`download_kofia_excel`) primarily builds its xlsx from the WebSquare `grdMain.getRowData()` model and re-saves it with `df.to_excel` (etl_process.py L209-352). A grid model with a null/blank value would be written as an empty cell (read back as NaN), and string values would be written as strings. What the grid model contains for a missing fee (null, "", "-") has never been observed in the repo. [ASSUMED] The safe policy below does not depend on that unknown.

**Current failure modes (verified).** `p_float` (etl_process.py L427-437) returns `0.0` for None/""/"N/A"/"-". For a blank pandas cell (NaN float) `str(nan)='nan'` -> `float('nan')` succeeds, so NaN flows into `total+other+sell`, `round(nan,4)` and `json.dump` writes bare `NaN` (invalid JSON; `json.dumps({'a': nan})` -> `{"a": NaN}`; with `allow_nan=False` it raises `ValueError: Out of range float values are not JSON compliant`). Absent columns silently become int `0` (`if col_total else 0`, L561-563). `build_changelog.to_float("nan")` also returns nan (only `fee-history.normalize` has an isfinite guard).

**Git-history finding.** `data.json` has 157 commits; 59 ETFs since 2026-02-13 (61 before). Never a NaN, never a null in the 59-row era. The single 0.0 value is WON 200 (448100) 기타비용, which went 0.01 -> 0.0 on 2026-07-11 (changelog and fee-history both recorded it; 실부담비용 0.0781 -> 0.0689 drops by exactly 0.01+the sell-fee move, i.e. arithmetic consistent). It is plausibly genuine (13 funds in the real xls carry 기타비용 0), but a p_float failure would produce the identical signature, so it is inherently unverifiable from history. (The two oldest commits, 2026-02-12/13 with 61 rows, use a differently spelled key for the sell-fee field, so a naive `.get()` scan shows None there; that is a key rename, not null values.) `scripts/_check_fees.py` (untracked) is only a table-print helper (assumes all floats, would crash on null) and gives no parsing hints.

**Primary recommendation:** `p_float` returns `float` only for finite numeric input (including numeric 0, "0", "0.00", "0%"); everything else (None, NaN, inf, "", whitespace, "-", "—", "N/A", any non-numeric) returns `None`. `process_data` emits null components and `실부담비용 = None` if any of the three is None, logs a soft `[WARNING] DATA-07/08` with the raw token, never raises. Write with `allow_nan=False`. Patch `build_changelog` (`to_float` isfinite + skip when either side is None). `build_fee_history.py` needs NO code change (already skips null; existing tests prove it) - add only an e2e chain test.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cell parsing, null policy, 실부담비용 | ETL (etl_process.py, runs in CI) | - | Single point where raw KOFIA cells become numbers |
| JSON validity (no NaN) | ETL write step | Tests | `json.dump(..., allow_nan=False)` is the tripwire |
| Change detection (no fake deltas) | scripts/build_changelog.py (CI, git diff of data.json) | build_fee_history.py (already safe) | Diff logic must ignore null transitions |
| Null display/sort/badge | Browser (script.js) - **Phase 11** | - | Seam contract only, not planned here |

## Standard Stack

### Core (all already in requirements.txt; no installs)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Python stdlib `math`, `json` | 3.x | `math.isfinite`, `json.dump(allow_nan=False)` | zero new deps (locked decision) |
| pandas | 3.0.0 (local) | Excel read | existing |
| openpyxl | 3.1.5 | write fixture xlsx in tests | existing (`tests/conftest.py`) |
| xlrd | 2.0.2 | read .xls | existing |
| pytest | 9.0.3 | tests | existing; baseline **145 passed** [VERIFIED: run in this session] |

### Package Legitimacy Audit
No external packages are added by this phase. Packages removed due to slopcheck: none. Packages flagged: none. (slopcheck not needed.)

## Architecture Patterns

### Data flow
```
KOFIA grid/xls --> pd.read_excel --> row cell (float | int | str | NaN | None)
   --> p_float(): finite float OR None   (0 preserved)
   --> process_data(): components {총보수,기타비용,매매중개수수료} (None allowed)
        any None -> 실부담비용 = None + soft [WARNING]; else round(sum,4)
   --> validate_etl_results / validate_market_data (None-aware, warn only)
   --> update_google_sheets: json.dump(allow_nan=False) -> data.json (null)
CI: git HEAD:data.json vs new data.json
   --> build_changelog.build_changes: skip if before or after is None
   --> build_fee_history.apply_snapshot: normalize()->None => skip point (unchanged)
```

### Pattern: raw-token to value policy (the decision table)
| Raw cell | Result | Notes |
|----------|--------|-------|
| numeric 0 / 0.0 / "0" / "0.00" / "0%" / " 0 " | `0.0` | legitimate zero, MUST stay 0.0 (13 + 31 real cases in sample) |
| numeric / "0.05%" / "1,234" | float | existing behaviour kept |
| `None`, NaN (blank cell), pandas `NA` | `None` | |
| `inf`, `-inf`, "inf", "Infinity", "1e400" | `None` | `float('1e400')` == inf |
| "", "  ", "-", "--", "—", "–", "N/A", "n/a", "nan", any non-numeric text | `None` | "-" is the conventional missing marker; never observed for KOFIA, mapped to None (conservative: a false null is a soft-warning, a false 0 is a fake cheapest ETF) |
| bool | `None` | avoid True -> 1.0 |
| column absent for a component | `None` | not int `0` |

Whether "-" could mean 0 in the grid-model path is unverified [ASSUMED] (A1). Mitigation built into the plan: the soft-warning must print the raw token (`repr`) so the first production occurrence yields evidence; the 0 vs null policy can be flipped for a single token in one line of `_MISSING_TOKENS`.

### Anti-Patterns to Avoid
- `total or 0` / `x if x else 0`: reintroduces the bug (0.0 is falsy - and a real value).
- Summing only the known components: never emit a partial 실부담비용.
- Skipping the row or carrying forward yesterday's value (PITFALLS suggested carry-forward, but STATE locks "결측은 null" and success criteria 1-2 require null in data.json). Row is emitted with nulls.
- `except Exception: raise` at the end of `process_data` means one TypeError aborts the whole ETL: keep None out of arithmetic instead of catching it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NaN/inf detection | string compares on "nan"/"inf" | `math.isfinite(float(x))` | handles "1e400", "Infinity", float NaN |
| Detect NaN leaks in JSON | regex on file | `json.dump(..., allow_nan=False)` + `json.loads(..., parse_constant=fail)` in tests | loud failure |
| Excel fixtures | binary sample files | `openpyxl.Workbook()` in `tmp_path` (as `tests/conftest.py` does) | fixture-only tests (SC-4) |

## Runtime State Inventory
Not a rename/migration phase - omitted. (Note: existing `data.json`/`changelog.json`/`fee-history.json` contain no nulls in the current 59-ETF era, so no data migration is needed. Do not regenerate or hand-edit them; the pre-commit hook restores data.json and fee-history.json is CI-only.)

## Common Pitfalls

### Pitfall 1: Existing tests encode the old contract
`tests/test_fees.py`: `test_none_returns_zero`, `test_empty_string_returns_zero`, `test_non_numeric_returns_zero` assert `== 0.0`. Update intentionally (rename to `..._returns_none`, assert `is None`). `TestRealCostCalculation` uses `p_float` only with valid strings and stays valid (`test_zero_sell_fee`, `test_all_zero_fees` pin that "0"/"0.00" stay 0.0 - keep them, they now guard the legit-zero policy). Add parametrized tests: `float('nan')`, `'nan'`, `'inf'`, `'-inf'`, `'1e400'`, `'-'`, `'—'`, `'   '`, `True`, `0`, `0.0`, `'0'`, `'0.00'`, `'0%'`.
Other tests: `test_process_data.py` builds valid-number xlsx (unchanged), `test_validate.py::make_item` uses floats (unchanged) - add None cases. `test_changelog.py` and `test_fee_history.py` already import via `sys.path.insert(... "scripts")`.

### Pitfall 2: Validators crash on None
`validate_etl_results` L621 `COST_MIN <= cost <= COST_MAX` and L657 `abs(new_cost - prev_cost)`: `item.get('실부담비용', 0.0)` returns None (key present) not 0.0. Make: if `cost is None` -> print `[WARNING] DATA-07: {name} 실부담비용 결측(null) - 범위 검증 생략` and `continue`; DATA-03 skip when `new_cost is None or prev_cost is None`. `prev_map` values from a previously-null data.json must also be handled (`prev_cost is not None` already there, keep). Warn text for range check uses `f"{cost:.4f}"` - only reached for non-None.

### Pitfall 3: build_changelog null transitions
`build_changes` currently: skips only if both None; `0.09 -> None` and `None -> 0.09` both emit a change. Fix = `if before is None or after is None: continue`. Also `to_float("nan")`/`"inf"` return non-finite: add `math.isfinite` guard (also note build_fee_history imports `to_float` from build_changelog, so the fix propagates; `normalize` keeps its own guard, harmless).
Bulk-correction ratio (`count_compared`, `detect_bulk_correction`) counts codes from `changes`, so dropping null transitions only lowers the numerator; no change needed.
Side-effect to note in plan: a value that stays null across days (None -> None) is already skipped.

### Pitfall 4: fee-history is already safe - do not touch it
`build_fee_history.normalize()` returns None for None/""/"-"/nan/inf and `apply_snapshot` `continue`s, so no point is appended and no `[date, null]` is ever written (`validate_history` also rejects non-finite/non-number points). Tests `test_null_values_skipped_and_previous_kept`, `test_null_first_value_creates_no_field`, parametrized `nan/inf` already exist. Phase 10 owns only `etl_process.py`, `build_changelog.py`, `tests/`: add tests, no change to `build_fee_history.py`. A consequence for consumers: after a gap, the fee-history series simply resumes from the last real value; when the value returns to the same number no point is appended (correct, no fake change).

### Pitfall 5: JSON writer leaks
`update_google_sheets` L766 `json.dump(data, f, ensure_ascii=False, indent=4)`: add `allow_nan=False`. Serialize to a string first (`text = json.dumps(...)`) and then write, so a `ValueError` cannot leave a truncated/half-written data.json (currently `open(..,'w')` truncates before dump raises). The `requests.post(json=data)` to GAS is already inside `try/except Exception` and `requests` rejects NaN by itself. Also `round(x, 4)` on a numpy float is fine; but coerce components to plain `float`/`None` (pandas int64 0 from xls is `numpy.int64` -> `p_float` returns Python `float`, OK).

### Pitfall 6: CRLF/BOM/OneDrive on Phase 10 files
Working-tree files are CRLF (git index is LF, `core.autocrlf=true`); `scripts/build_changelog.py` starts with a UTF-8 BOM (Phase 16 audits it). Edit with targeted replacements, keep the BOM; `git diff --stat` must stay small. New test files: LF, no BOM (repo convention for new files per ROADMAP), but existing test files keep their line endings.

### Pitfall 7: `_check_fees.py` and other float-assuming consumers
`scripts/_check_fees.py` (untracked, debug) formats `x['총보수']:6.4f` and sorts by `x["실부담비용"]`; it will crash on null. It is untracked and not in scope; note only. Any in-repo Python consumer of data.json: `scripts/backfill_fee_history.py` and `sync_server_changelog.py` were not modified-scope; the planner should grep them for arithmetic on fee fields (`grep -n "실부담비용\|총보수" scripts/*.py`) as a task verification step.

## Code Examples

### 1. p_float (etl_process.py, replaces L427-437)
```python
import math  # add to imports

def p_float(v):
    """Fee cell -> finite float, else None. Numeric 0 stays 0.0 (legit zero fee)."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        x = float(v)
    else:
        s = str(v).replace(',', '').replace('%', '').strip()
        if s == '':
            return None
        try:
            x = float(s)
        except (ValueError, TypeError):
            return None          # "-", "—", "N/A", "<NA>", text
    return x if math.isfinite(x) else None   # nan, inf, 1e400
```
(`float("nan")` string and NaN cell both land in the isfinite branch.)

### 2. process_data component/real-cost block (replaces L560-582)
```python
total = p_float(row.get(col_total)) if col_total else None
other = p_float(row.get(col_other)) if col_other else None
sell  = p_float(row.get(col_sell))  if col_sell  else None

parts = {'총보수': total, '기타비용': other, '매매중개수수료': sell}
missing = [k for k, v in parts.items() if v is None]
if missing:
    real_cost = None
    print(f"[WARNING] DATA-07: {target_name}({target_code}) 결측 구성요소 {missing} "
          f"raw={[repr(row.get(c)) for c in (col_total, col_other, col_sell) if c]} -> 실부담비용=null")
else:
    real_cost = round(total + other + sell, 4)

results.append({..., '총보수': total, '기타비용': other,
                '매매중개수수료': sell, '실부담비용': real_cost})
```
Keep the existing debug `print` but avoid f-format specs on None. (Optionally aggregate a summary `[WARNING] DATA-08: N/M 종목 실부담비용 null` after the loop; never `sys.exit` or raise.)

### 3. Validators (None-aware)
```python
cost = item.get('실부담비용')
if cost is None:
    print(f"[WARNING] DATA-07: {name} 실부담비용 결측(null) - 범위 검증 생략")
    continue
...
new_cost = item.get('실부담비용'); prev_cost = prev_map.get(code)
if new_cost is not None and prev_cost is not None: ...
```

### 4. build_changelog.py
```python
import math
def to_float(value):
    if value is None: return None
    try:
        cleaned = str(value).replace(",", "").replace("%", "").strip()
        if cleaned == "": return None
        number = float(cleaned)
    except Exception:
        return None
    return number if math.isfinite(number) else None
...
if before is None or after is None:   # replaces "both None" check
    continue
```

### 5. Writer
```python
text = json.dumps(data, ensure_ascii=False, indent=4, allow_nan=False)
with open(json_path, 'w', encoding='utf-8') as f:
    f.write(text)
```

### 6. e2e chain test (fixture-only, SC-3)
Place in a new `tests/test_null_chain.py` (LF). Chain: fixture xlsx (openpyxl, as conftest) with a blank/"-"/"nan" cell -> `process_data` -> `json.dumps(allow_nan=False)` round-trips and contains `null` -> feed as `curr_rows` to `bc.build_changes(prev_rows, curr_rows)` with prev value 0.09 and assert `== []` for the null field, then reverse (prev null, curr 0.09) `== []` -> `fh.apply_snapshot(seeded_history, curr_rows, D2)` returns `count == 0` for the null fields and `series` unchanged. Do not call `main()` (uses `git show HEAD:data.json`, cwd files, and the pre-commit hook); use the pure functions, or monkeypatch `DATA_FILE/CHANGELOG_FILE` + `read_previous_data_from_git` as `test_changelog.py::test_main_*` does (`monkeypatch, tmp_path`).
Also add xlsx-fixture cases in `tests/test_process_data.py`: a row with blank total; row with "-" other; row with `0` other (asserts `기타비용 == 0.0` and `실부담비용` is a number, not None - guards the legit zero); absent 기타비용 column.
JSON check: `json.loads(text, parse_constant=lambda c: (_ for _ in ()).throw(ValueError(c)))`.

## State of the Art
| Old | New | Impact |
|-----|-----|--------|
| unparseable -> 0.0 | -> None/null | fake cheapest/fake -0.09%p change removed |
| `json.dump` default allow_nan=True | `allow_nan=False` | invalid `NaN` in data.json becomes a CI failure, not a site outage |

## Frontend seam contract (information only - Phase 11 owns script.js)
- data.json fee fields (`총보수`, `기타비용`, `매매중개수수료`, `실부담비용`) may now be JSON `null`; `AUM`/`거래량` already can be null (DATA-04). Other fields never null.
- `changelog.json` will contain no change with a `null` `before` or `after` from Phase 10 on (older entries: none exist either - verified none in current file per `changelog.json` scan of 448100; Phase 11 should still guard).
- `fee-history.json` points are always finite numbers; a code/field may have fewer points or no key at all.
- `Number(null) === 0` and `null - x` coerce silently; Phase 11 must use `Number.isFinite`. (script.js ~L675 diff, ~L871 sort, per PITFALLS - not planned here.)

## Environment Availability
| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python + pytest | tests | yes | pytest 9.0.3, 145 pass | - |
| pandas/openpyxl/xlrd | fixtures | yes | 3.0.0 / 3.1.5 / 2.0.2 | - |
| Selenium/Chrome | not needed (tests never hit KOFIA) | n/a | - | - |
| Real KOFIA sample | reference only | yes (`.debug-artifacts/downloads/_`, untracked) | - | tests must NOT depend on it (untracked, 445 KB); build openpyxl fixtures instead |

## Validation Architecture
`workflow.nyquist_validation` is false in `.planning/config.json` - formal section omitted. Quick map: `pytest tests/test_fees.py tests/test_process_data.py tests/test_validate.py tests/test_changelog.py tests/test_fee_history.py tests/test_null_chain.py -q` (whole suite runs in ~1 s; full suite: `python -m pytest -q`, must stay green - CI runs `pytest tests/ -v` before ETL).

| Req | Behaviour | Test |
|-----|-----------|------|
| DATA-07 | p_float matrix; xlsx with blank/"-"/nan -> null; `allow_nan=False` dump succeeds; valid JSON | test_fees.py, test_process_data.py |
| DATA-08 | any missing component -> 실부담비용 None, no exception, warning in capsys; validators tolerate None | test_process_data.py, test_validate.py |
| DATA-09 | build_changes null->value / value->null / nan -> []; fee-history count 0; e2e chain | test_changelog.py, test_null_chain.py |

## Security Domain
Input is a third-party spreadsheet, not user input; no auth/session/crypto surface. V5 input validation applies: parse strictly, never `eval`, whitelist numeric conversion (`float` + `isfinite`). Threat: malformed/poisoned cell producing NaN/inf that corrupts published JSON (Tampering/DoS) -> mitigated by `p_float` + `allow_nan=False`. No new dependencies.

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | In the WebSquare-grid extraction path, a truly missing fee arrives as null/""/"-" (never observed), and a genuine zero arrives as numeric/"0"/"0.00"; "-" does not mean 0 | Summary, Policy table | If "-" means 0, those ETFs get null (soft-warning + "-" in UI) instead of 0.0: safe direction, one-line token change |
| A2 | 448100 기타비용 0.0 is a genuine 0 (13 funds in sample have 0) | Summary | If it were a parse failure, one ETF shows 0 (unrecoverable from history); low impact |
| A3 | No other Python script does arithmetic on data.json fee fields | Pitfall 7 | A crash in `backfill_fee_history.py`/`sync_server_changelog.py`; planner should grep |

## Open Questions (RESOLVED — see 10-01/10-03 plan context)
1. **Should a null-total row still be emitted?** Recommended yes (SC-1/2 demand null in data.json). Alternative (skip row) contradicts SC-1.
2. **Aggregate abort threshold** (e.g. >50% rows null = column-mapping failure, like the v1.2 bulk-correction)? Not required; a soft `[WARNING]` summary is enough. If the planner wants a guard, keep it warn-only (SC-2 forbids stopping).
3. Numeric-only validation of `실부담비용` non-negativity (negative fees) - out of scope.

## Sources
### Primary (HIGH)
- Local execution against `.debug-artifacts/downloads/_` (xlrd cell types, pandas dtypes, `process_data` run) - this session
- `git log`/`git show` on data.json (157 commits), changelog.json, fee-history.json - this session
- `etl_process.py`, `scripts/build_changelog.py`, `scripts/build_fee_history.py`, tests/*.py read in full
- Python `json` docs behaviour verified by executing `json.dumps(..., allow_nan=False)`
### Secondary
- `.planning/research/PITFALLS.md` (Pitfalls 1-4, 14; note its carry-forward suggestion is superseded by the locked "null" decision)
### Tertiary (LOW)
- None

## Metadata
**Confidence breakdown:** Standard stack HIGH (no new deps); Architecture HIGH (code read + executed); Pitfalls HIGH; KOFIA grid-path missing token MEDIUM/ASSUMED.
**Research date:** 2026-09-30 **Valid until:** 2026-10-30 (until the KOFIA format changes)
