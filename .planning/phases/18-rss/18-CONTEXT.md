# Phase 18: RSS 피드 품질 - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Mode:** Autonomous (사용자가 gsd-autonomous로 진행 지시, 세부 결정은 Claude 재량)

<domain>
## Phase Boundary

feed.xml이 중복 없이 정확한 수치로 결정적으로 생성된다. 범위: FEED-05(같은 날짜·코드·필드 중복 행 1회만), FEED-06(6자리 유효숫자 절단 제거), FEED-07(결정성 테스트가 같은 입력 → 같은 출력을 실제 비교), FEED-08(feed.xml .gitattributes 적용, 잔여 .tmp 없음).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- 순수 빌드 스크립트·테스트 단계다. 구현 선택은 Claude 재량이며 REQUIREMENTS.md의 Locked decisions를 따른다(신규 기능 없음, 신규 의존성 0, 바닐라, 결측은 null, CI가 feed.xml 단독 작성자, fixture 기반 테스트).
- 이전 Phase 17의 동작을 유지한다: build_rss.py는 실패 시 exit 1을 반환하고 feed.xml을 건드리지 않는다. 워크플로의 "Fail if RSS build failed" 단계를 깨지 않는다.
- `.gitattributes`는 현재 저장소에 없다. feed.xml 줄바꿈 정책만 추가한다(다른 파일에 영향 주지 않게 범위를 feed.xml로 한정).

### Phase 17 코드 리뷰(17-REVIEW.md)에서 넘어온 항목 (같은 파일 scripts/build_rss.py)
- WR-01: `DATE_RE`(build_rss.py:31)가 비 ASCII 숫자를 허용한다. `[0-9]`로 한정한다.
- WR-02: 항목 간 중복 (date, code) 행이 description과 title에 반복된다(약 129-135행). FEED-05와 함께 해결한다.
- WR-03: 빈 `changelog.json`(`[]`)이 정상 feed.xml을 빈 피드로 덮어쓴다(약 220-225행). 빈 입력 처리 정책을 정하고 테스트한다(기존 feed.xml 보호 여부 포함).
- Info: `CONTROL_RE`에 리터럴 U+FFFE/FFFF 문자가 있다(이스케이프 표기로 교체). `format(x, "g")` 정밀도 손실은 FEED-06으로 해결한다. 임계값/경계 테스트는 DATA-12 쪽이라 이번 범위 밖.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/build_rss.py`, `tests/test_rss.py`, `feed.xml`, `.github/workflows/daily_update.yml`

### Established Patterns
- 파일 쓰기는 `write_if_changed`(원자적, 임시 파일 후 교체). 테스트는 tmp_path·fixture 기반.

### Integration Points
- 워크플로 "Build RSS Feed" 단계(`id: rss`, continue-on-error)와 "Fail if RSS build failed" 단계.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

포트폴리오 대시보드는 SEED-001(v1.6 후보). 이 Phase 범위 밖.

</deferred>
