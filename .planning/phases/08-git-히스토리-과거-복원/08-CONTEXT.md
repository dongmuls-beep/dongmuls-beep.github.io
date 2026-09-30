# Phase 8: Git 히스토리 과거 복원 - Context

**Gathered:** 2026-09-30
**Status:** Ready for planning

<domain>
## Phase Boundary

운영자가 로컬에서 1회 실행하는 `scripts/backfill_fee_history.py`로 data.json git 히스토리(2026-02-12~, 146일치 커밋)를 재생해 `fee-history.json`을 통째로 재생성한다. 2026-05-27 매핑 보정 이전 잘못된 값 제거(재기준화), 검토 리포트 출력. UI(Phase 9)와 일일 스크립트 변경은 범위 밖.

Requirements: BACK-01, BACK-02, BACK-03

</domain>

<decisions>
## Implementation Decisions

### 과거 데이터 처리
- 하루 여러 커밋이면 KST 기준 그날 마지막 커밋만 사용 (커밋 시각 `%cI` → +9 고정 오프셋 날짜)
- 대량 보정: `build_changelog.detect_bulk_correction`으로 연속 스냅샷 간 자동 감지 + `KNOWN_REBASELINES = {"2026-05-27": [...]}` 하드코딩 백업. 감지된 항목(총보수/기타비용)은 **모든 종목의 해당 항목 이전 포인트 삭제**, 보정일 값으로 새 기준점 시작
- 오타 필드 `매매중계수수료`(2026-02-13 이전) → `매매중개수수료` alias
- 파싱 불가 / 리스트 아님 / 행 수 급감 커밋은 건너뛰고 리포트에 기록
- 순서: `git log --reverse -- data.json` 순서 + 커밋 시각→KST 날짜; 날짜가 역행하는 커밋은 건너뛰고 리포트

### 실행·결과
- 결과: `fee-history.json` 통째로 재생성 → 이후 `python scripts/build_fee_history.py` 실행 시 no-op이어야 함 (현재 data.json과 일치)
- `--dry-run`: 리포트만 출력, 파일 쓰지 않음
- 리포트는 stdout 텍스트: 항목별 변동 수, 재기준화 내역, 건너뛴 커밋(사유), A→B→A 의심 패턴(2일 이내)
- A→B→A는 리포트만, 자동 수정 없음
- 로컬 1회 실행 후 결과 커밋; CI workflow에 추가하지 않음 (`fetch-depth` 변경 없음)

### Claude's Discretion
- Phase 7 `build_fee_history.py`의 `apply_snapshot`, `dump_history`, `validate_history`, `normalize` 재사용 (import), 새 로직은 backfill 스크립트에만
- git 호출은 `subprocess` + `encoding="utf-8"` (Windows cp949 회피)
- 테스트는 git 호출 없이 스냅샷 리스트를 받는 순수 함수(예: `replay(snapshots) -> (history, report)`)로 분리해 fixture 기반

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/build_fee_history.py`: `apply_snapshot(history, rows, date)`, `empty_history`, `normalize`, `validate_history`, `dump_history`, `kst_today`
- `scripts/build_changelog.py`: `FIELDS`, `to_float`, `build_changes`, `count_compared`, `detect_bulk_correction`, `BULK_CORRECTION_FIELDS`, `read_previous_data_from_git`(subprocess 패턴)

### Established Patterns
- `main(argv) -> int`, `[fee-history]` / `[WARNING]` / `[ERROR]` 로그 접두어
- fail-closed 원자적 쓰기 (temp + os.replace)

### Integration Points
- 입력: `git log --format=%H%x09%cI --reverse -- data.json`, `git show <sha>:data.json`
- 출력: `fee-history.json` (Phase 7 스키마 `{version, updatedAt, names, series}`)

</code_context>

<specifics>
## Specific Ideas

- 알려진 커밋: 2026-02-13 `e808192` 오타 수정(중계→중개); 2026-05-27 커밋 4개(2ebc808, 59b9a86, 9a8f04c, 095948f) 중 보정 포함
- 검증용 스팟체크: 360200 (ACE 미국S&P500), changelog.json 항목과 교차 확인
- 커밋/푸시 전 `git pull --rebase origin main` (CI가 매일 fee-history.json도 커밋하므로 충돌 시 backfill 결과 우선 후 build_fee_history 재실행)

</specifics>

<deferred>
## Deferred Ideas

- etl_process.p_float 파싱 실패 시 0.0 반환 문제 (Phase 7 WR-04)

</deferred>
