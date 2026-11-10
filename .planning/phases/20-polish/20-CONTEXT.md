# Phase 20: 소소한 정리·문서 보정 - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Mode:** Autonomous (사용자가 gsd-autonomous로 진행 지시, 세부 결정은 Claude 재량)

<domain>
## Phase Boundary

남은 스타일 사소 건과 계획 문서 메타데이터가 실제 결과와 일치한다. 범위: POLISH-01(`.footer-links a`에 gap 규칙 추가), POLISH-02(누락된 SUMMARY frontmatter `requirements-completed` 보정, Phase 14~16 VERIFICATION status를 UAT 결과에 맞게 정리).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- 순수 보정 단계다. 새 기능·새 디자인 없음, 신규 의존성 0. 구현 선택은 Claude 재량이며 REQUIREMENTS.md의 Locked decisions를 따른다.
- POLISH-01: `style.css`(UTF-8 BOM 유지, 저장소는 LF, 로컬은 CRLF일 수 있음)의 `.footer-links` 규칙만 수정한다. 기존 간격 토큰(4/8/16/24/32/48/64 중 하나)을 사용한다. 마크업이 인라인 링크 연속이면 `display: flex; flex-wrap: wrap; gap`을 우선 검토하되 기존 레이아웃을 깨지 않는 최소 변경으로 한다. 단일 CSS 규칙이라 별도 UI-SPEC는 만들지 않는다(Phase 19 UI-SPEC 토큰을 따른다). 가능하면 CSS 문자열 단언 테스트를 추가하고 기존 `tests/*` 글롭에 걸리게 이름을 짓는다.
- POLISH-02: 사실에 근거해서만 고친다. 각 SUMMARY의 `requirements-completed`는 해당 플랜의 PLAN frontmatter `requirements`와 REQUIREMENTS 추적표·VERIFICATION 증거로 채운다(근거 없는 항목을 추가하지 않는다). Phase 14~16 VERIFICATION status는 같은 Phase의 UAT 결과 파일(`*-UAT.md`)과 `milestones/v1.4-MILESTONE-AUDIT.md`를 읽고 UAT 결과와 맞춘다. UAT가 통과/보류/이슈 중 무엇인지 파일에서 확인하고, 판단이 애매하면 값을 바꾸지 않고 SUMMARY에 사유를 적는다. 대상 문서는 `.planning/milestones/v1.4-phases/` 아래와 현재 `.planning/phases/` 아래다(`gsd-sdk query` 또는 grep으로 `requirements-completed`가 없는 SUMMARY 목록을 먼저 만든다).
- 문서 수정은 코드 동작을 바꾸지 않는다. pytest와 node 검사를 통과시킨다.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `style.css`의 `.footer-links` 규칙, `.planning/milestones/v1.4-phases/*`, `milestones/v1.4-MILESTONE-AUDIT.md`

### Established Patterns
- 커밋은 `git commit --only -- <paths>`. 문서 변경은 `docs(20-NN)` 접두사.

### Integration Points
- CI의 pytest/node 검사(`tests/a11y_*`, `tests/compare_*`)가 style.css를 읽는 단언이 있을 수 있으므로 수정 후 전부 실행한다.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

Phase 19의 사람 확인 4개(320px 시각, 실제 브라우저 리사이즈, 스크린리더, Retry 포커스 링)는 보류 상태로 마일스톤 감사에서 다시 집계한다. 포트폴리오 대시보드는 SEED-001(v1.6 후보).

</deferred>
