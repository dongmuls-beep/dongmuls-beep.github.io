# Phase 17: 데이터·CI 신뢰성 - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Mode:** Autonomous (사용자가 gsd-autonomous로 진행 지시, 세부 결정은 Claude 재량)

<domain>
## Phase Boundary

CI가 피드 빌드 실패와 데이터 이상을 숨기지 않고 드러낸다. 범위: DATA-11(RSS 빌드 실패 시 CI 실패, 기존 feed.xml 유지), DATA-12(총보수 급락 3건 269540·433330·476030 원인 확인과 필요 시 수정·재발 방지), CI-01(daily_update.yml node 검사 단계의 실제 CI 통과 확인).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- 순수 인프라·데이터 검증 단계다. 구현 선택은 Claude 재량이며 REQUIREMENTS.md의 Locked decisions를 따른다(신규 기능 없음, 신규 의존성 0, 바닐라 JS, 결측은 null, CI가 fee-history.json·feed.xml 단독 작성자, 테스트는 fixture 사용).
- RSS 빌드 실패 처리: 실패 시 기존 feed.xml을 덮어쓰지 않고 단계를 실패로 종료한다. 임시 파일에 쓴 뒤 성공 시에만 교체한다.
- DATA-12: 원천 데이터와 fee-history.json을 근거로 원인을 기록하고, 오류로 확인된 경우에만 수정한다. 근거 없이 데이터를 고치지 않는다.
- CI-01: 로컬 YAML 검증이 불가능하다는 STATE.md의 기록에 따라, 실제 CI 실행 로그 확인이 필요하다. push는 사용자 승인이 필요한 외부 동작이므로 push 직전에 사용자에게 확인한다.
- Owns 범위 밖 파일(`script.js`, `style.css`, `compare-*.js`)은 건드리지 않는다.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/build_rss.py`, `scripts/build_fee_history.py`, `scripts/backfill_fee_history.py`, `.github/workflows/daily_update.yml`, `fee-history.json`, `tests/`

### Established Patterns
- 테스트는 `tests/*_check.js`(node)와 pytest, fixture 기반. 워크플로 커밋은 `git-auto-commit-action`의 `file_pattern`으로 지정한 파일만 대상.

### Integration Points
- `daily_update.yml`의 피드 빌드 단계와 커밋 단계, `etl_process.py` 검증 함수.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

포트폴리오 대시보드는 SEED-001로 보관됨(v1.6 후보). 이 Phase 범위 밖.

</deferred>
