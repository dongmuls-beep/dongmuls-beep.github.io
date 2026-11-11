# Phase 19: /compare/ UI·접근성 정리 - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Mode:** Autonomous (사용자가 gsd-autonomous로 진행 지시, 세부 결정은 Claude 재량)

<domain>
## Phase Boundary

/compare/ 페이지가 모든 창 크기·언어·보조기기에서 일관되게 동작한다. 범위: CMP-07(미사용 차트 코드 제거, 창 크기 변경 시 차트 재그리기), CMP-08(빈 `<th>`, `?compare=` 값 절단), CMP-09(계산기 숫자 로케일, 재시도 후 포커스 유지, live region 중복 제거), CMP-10(언어 변경 감지를 title MutationObserver 대신 `etf:lang-changed`로 통일), CMP-11(320px에서 순위표 "최저 대비" 열 잘림 해소, ETF명 열 고정), A11Y-10(코드 외 `.cell-label` span의 aria-hidden 일관 처리).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- 기존 UI의 결함 수정이다. 새 화면·새 기능을 만들지 않고 기존 디자인(Pretendard, 현재 색·간격 토큰)을 그대로 따른다. 구현 선택은 Claude 재량이며 REQUIREMENTS.md의 Locked decisions를 따른다(신규 기능 없음, 신규 의존성 0, 바닐라 JS).
- 파일 인코딩: `script.js`/`style.css`는 UTF-8 BOM을 유지한다. 신규 파일은 LF/BOM 없음. 저장소는 LF이고 로컬 체크아웃은 CRLF일 수 있으므로 편집 도구가 BOM·줄바꿈을 바꾸지 않는지 커밋 전에 확인한다.
- 기존 테스트(`tests/compare_*_check.js`, `tests/a11y_*_check.js`, `tests/test_html_a11y.py`, `tests/test_i18n_compare.py`)를 통과시킨다. 변경에 맞춰 테스트를 추가·수정한다. i18n 키를 추가하면 8개 언어 JSON에 모두 넣고 패리티 테스트를 통과시킨다.
- 320px 레이아웃 검증은 CSS·마크업 단언 테스트로 한다. 브라우저에서 직접 확인이 필요한 시각 항목은 VERIFICATION의 human 확인 항목으로 남긴다.
- Phase 17-18과 파일이 겹치지 않는다. Phase 20이 `style.css`를 건드리므로 이 Phase에서 `.footer-links` 규칙은 수정하지 않는다.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `compare/index.html`, `compare-chart.js`(순수 SVG 차트), `compare-calc.js`, `compare-calculator.js`, `compare-select.js`, `compare-view.js`, `script.js`, `style.css`, `i18n/*.json`

### Established Patterns
- 테스트는 `tests/*_check.js`를 node와 stub으로 실행. 언어 변경 이벤트 `etf:lang-changed`가 이미 있으면 재사용한다.

### Integration Points
- CI의 "Run compare and a11y node checks" 단계가 `tests/compare_*_check.js`와 `tests/a11y_*_check.js`를 모두 실행한다(새 테스트도 이 글롭에 걸리게 이름을 짓는다).

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

`.footer-links a` gap 규칙은 Phase 20(POLISH-01). 포트폴리오 대시보드는 SEED-001(v1.6 후보).

</deferred>
