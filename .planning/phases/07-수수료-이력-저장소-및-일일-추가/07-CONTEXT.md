# Phase 7: 수수료 이력 저장소 및 일일 추가 - Context

**Gathered:** 2026-09-30
**Status:** Ready for planning

<domain>
## Phase Boundary

매일 ETL 실행 후 4개 수수료 항목(총보수·기타비용·매매중개수수료·실부담비용)의 변동분만 종목코드 기준으로 `fee-history.json`에 누적한다. 파일 손상 시 CI 실패, 일일 자동 커밋에 포함. Backfill(Phase 8)과 UI(Phase 9)는 범위 밖.

Requirements: HIST-01, HIST-02, HIST-03, HIST-04

</domain>

<decisions>
## Implementation Decisions

### 기록 규칙
- 값은 소수점 6자리 반올림 후 비교·저장 (float 잡음 차단)
- null/빈칸 값은 기록하지 않고 이전 값 유지 (파싱 누락이 변동으로 기록되지 않음)
- 같은 날 재실행 시 값이 다르면 오늘 포인트 교체, 같으면 no-op (멱등)
- data.json에서 사라진 종목은 시계열 그대로 둠 (삭제·표시 없음)
- 신규 종목은 첫 관측값으로 기준점 생성; 종목명 변경 시 `names`만 최신값으로 갱신 (종목코드가 키)
- 일일 대량 보정 가드(DATA-06 규칙)는 이번 범위 아님 — Future로 연기 (사용자 결정)

### 파일·연동
- 스키마: `{version, updatedAt, names:{code:name}, series:{code:{field:[[date,value],...]}}}`, 종목코드는 항상 문자열 (0026S0 등 영숫자)
- 날짜: 고정 KST(+9) 헬퍼 `datetime.now(timezone(timedelta(hours=9))).date().isoformat()` — tzdata 불필요
- 초기 파일: 이 Phase에서 현재 data.json으로 기준점 시드한 `fee-history.json` 커밋 → Phase 8 backfill이 통째로 재생성
- 스크립트: 신규 `scripts/build_fee_history.py`, workflow에서 "Build Changelog" 다음 단계; `build_changelog.py`의 `to_float`, `FIELDS` import 재사용
- JSON 포맷: compact + `sort_keys` + `ensure_ascii=False` + 끝 개행 (재실행 시 바이트 동일)
- 파일 없음/파싱 불가/스키마 불일치 → 에러 메시지와 non-zero exit, 파일 쓰지 않음 (build_changelog의 silent-default `read_json_file` 패턴 쓰지 말 것)
- `git-auto-commit-action` `file_pattern`에 `fee-history.json` 추가
- pre-commit hook 변경 없음 (fee-history는 CI 단독 writer)

### Claude's Discretion
- 핵심 로직은 순수 함수 `apply_snapshot(history, rows, date) -> (history, changed_count)`로 분리 (Phase 8 backfill 재사용)
- 테스트는 tests/test_fee_history.py, fixture 기반, 빠르게 (pytest가 일일 ETL 게이트)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/build_changelog.py`: `FIELDS`, `to_float`, `row_key`, `detect_bulk_correction`
- tests/: pytest 구성 (conftest.py, test_changelog.py 패턴 참고)

### Established Patterns
- 스크립트는 `main() -> int`, `raise SystemExit(main())`, print 로그 `[changelog] ...` / `[WARNING] ...`
- JSON 읽기/쓰기 `encoding="utf-8"`, `ensure_ascii=False`

### Integration Points
- `.github/workflows/daily_update.yml`: Build Changelog 다음에 `python scripts/build_fee_history.py` 단계, commit `file_pattern` 갱신
- `data.json` (리스트, 한국어 키 종목코드/종목명/총보수/기타비용/매매중개수수료/실부담비용)

</code_context>

<specifics>
## Specific Ideas

- 로컬 main은 매일 CI 자동 커밋으로 origin과 갈라짐 → 커밋/푸시 전 `git pull --rebase origin main`

</specifics>

<deferred>
## Deferred Ideas

- 일일 대량 보정 가드 (DATA-06 50% 규칙을 fee-history에 적용)

</deferred>
