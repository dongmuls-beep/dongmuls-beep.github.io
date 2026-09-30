# Phase 6: 변경 이력 정합성 - Context

**Gathered:** 2026-09-30
**Status:** Ready for planning

<domain>
## Phase Boundary

운영 changelog.json에서 컬럼 매핑 보정(2026-05-27) 가짜 변동 항목을 제거하고 (DATA-05),
`scripts/build_changelog.py`가 대량 보정성 변동을 이력에 기록하지 않도록 막는다 (DATA-06).
프론트엔드 변경, 과거 월 재계산은 범위 밖.

</domain>

<decisions>
## Implementation Decisions

### 가짜 항목 제거 (DATA-05)
- `updatedAt: 2026-05-27` 항목은 전체 삭제 → 2026-05 카드는 2026-05-12 하나만 남음
- 제거는 CI에서 실행되는 `scripts/build_changelog.py`가 수행 (운영 changelog.json이 정본; 로컬 편집은 pre-commit hook이 덮어씀)
- 권장 구현: DATA-06 감지 함수를 기존 항목에도 적용해 "대량 보정" 항목을 걸러냄 (하드코딩 날짜 denylist 대신). 기존 항목 기준 결과: 2026-05-27만 해당 (총보수·기타비용 59/59), 나머지 월은 기타비용 ≤18/59(30%) → 유지. 방식 최종 선택은 planner 재량
- 월 중복 항목 자체는 허용 (월 중 실제 변동 2회 가능). 병합 로직 추가 안 함

### 대량 보정 감지 (DATA-06)
- 기준: 한 실행(항목)에서 `총보수` 또는 `기타비용` 필드가 바뀐 종목 수 / 전체 비교 종목 수 ≥ 50% → 보정으로 판단
- `매매중개수수료`·`실부담비용`은 비율 판단에서 제외 (매매중개수수료는 매월 거의 전 종목 변동이 정상)
- 감지 시: 그 실행의 changelog 항목을 추가하지 않음 + `[WARNING] DATA-06: ...` 출력 (필드, 변경 종목 수/전체). data.json 갱신은 정상 진행
- soft-warning: exit code 0 유지, CI 통과

### 검증·배포
- `build_changes` 및 감지 함수 순수 함수 단위 테스트 (git subprocess·파일 I/O 없이) — tests/ 에 추가
- push 후 `gh workflow run "Daily ETF Data Update"` → 운영 https://etfsave.life/changelog.json 에 `2026-05-27` 없음, `2026-05` 항목 1개 확인

### Claude's Discretion
- 감지 함수 이름/시그니처, 비율 상수 위치
- 기존 항목 정리를 매 실행마다 할지(멱등) 1회성으로 할지 — 멱등 권장

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/build_changelog.py`: `build_changes(prev_rows, curr_rows)` (순수 함수, 반환 `[{code,name,field,before,after}]`), `FIELDS`, `main()` (entry append/replace, `[changelog]` 로그)
- `etl_process.py` `validate_etl_results` / `validate_market_data` — `[WARNING] DATA-0N:` 패턴
- `tests/` pytest (capsys로 경고 검증, monkeypatch)

### Established Patterns
- soft-warning, print만
- CI 순서 (`.github/workflows/daily_update.yml`): pytest → ETL → `python scripts/build_changelog.py` (line 53) → git-auto-commit (`data.json changelog.json update-meta.json`)

### Integration Points
- `build_changelog.main()`: `changes = build_changes(...)` 직후 감지, `changelog_entries` 로드 직후 기존 항목 정리
- `main()`은 "no changes"일 때 early return → 기존 항목 정리가 그 전에 실행되어야 삭제가 반영됨
- `.githooks/pre-commit` → `scripts/sync_server_changelog.py --stage`: 로컬 커밋 시 운영 changelog를 받아 stage (재유입 원인). 이 hook은 변경하지 않음

</code_context>

<specifics>
## Specific Ideas

- 대상 항목 예: `2026-05-27` 177건, TIGER 미국S&P500(360750) 기타비용 0.4421→0.06, 총보수 0.0002→0.0068
- scripts/ 모듈 import: tests에서 `scripts/build_changelog.py`를 import 가능하도록 sys.path 처리 또는 conftest 조정 필요할 수 있음

</specifics>

<deferred>
## Deferred Ideas

- 프론트엔드 "데이터 보정" 라벨 표시
- 같은 월 항목 병합

</deferred>
