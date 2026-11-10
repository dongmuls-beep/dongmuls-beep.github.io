# Requirements — v1.5 기술 부채 정리

**Milestone goal:** v1.4 감사(milestones/v1.4-MILESTONE-AUDIT.md)에서 남은 기술 부채를 해소해 CI·피드·/compare/ 품질을 마감한다.

**Locked decisions:** 신규 기능 없음, 신규 의존성 0, 바닐라 JS 유지, 결측은 `null`, `script.js`/`style.css` UTF-8 BOM 유지(신규 파일은 LF/BOM 없음), CI가 `fee-history.json`·`feed.xml` 단독 작성자, 테스트는 fixture 사용(pre-commit 훅이 `changelog.json`/`data.json` 덮어씀).

## v1.5 Requirements

### 데이터·CI 신뢰성 (DATA / CI)

- [x] **DATA-11**: RSS 빌드가 실패하면 CI가 실패로 표시된다 (기존 feed.xml은 유지)
- [x] **DATA-12**: 총보수 급락 3건(269540, 433330, 476030)이 원천 데이터 오류인지 확인되고, 오류면 수정·재발 방지된다
- [x] **CI-01**: `daily_update.yml`의 node 검사 단계가 실제 CI 실행에서 통과함을 확인한다

### RSS 피드 품질 (FEED)

- [x] **FEED-05**: 같은 날짜·코드·필드의 중복 행이 피드에 한 번만 나온다
- [x] **FEED-06**: 수치가 6자리 유효숫자로 잘리지 않고 정확히 표시된다
- [x] **FEED-07**: 결정성 테스트가 "같은 입력 → 같은 출력"을 실제로 검증한다
- [x] **FEED-08**: feed.xml에 `.gitattributes`가 적용되고 잔여 `.tmp`가 남지 않는다

### /compare/ UI·접근성 (CMP / A11Y)

- [ ] **CMP-07**: 미사용 차트 코드를 제거하고, 창 크기 변경 시 차트가 다시 그려진다
- [ ] **CMP-08**: 빈 `<th>`와 `?compare=` 값 절단을 수정한다
- [ ] **CMP-09**: 계산기 숫자가 선택 언어 로케일을 따르고, 재시도 후 포커스가 유지되며, live region이 중복되지 않는다
- [ ] **CMP-10**: 언어 변경 감지를 title MutationObserver 대신 `etf:lang-changed`로 통일한다
- [ ] **CMP-11**: 320px에서 순위표 "최저 대비" 열이 잘리지 않고 ETF명 열이 고정된다
- [ ] **A11Y-10**: 코드 외 `.cell-label` span의 `aria-hidden` 처리가 일관된다

### 소소한 정리 (POLISH)

- [ ] **POLISH-01**: `.footer-links a`에 gap 규칙을 추가한다
- [ ] **POLISH-02**: 누락된 SUMMARY frontmatter `requirements-completed`를 보정하고, 14~16 VERIFICATION status를 UAT 결과에 맞게 정리한다

## Out of Scope

- 신규 기능 — 이번 마일스톤은 부채 정리 전용
- 자동화 범위 확대 — 기존 CI 흐름 유지

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-11 | Phase 17 | Complete |
| DATA-12 | Phase 17 | Complete |
| CI-01 | Phase 17 | Complete |
| FEED-05 | Phase 18 | Complete |
| FEED-06 | Phase 18 | Complete |
| FEED-07 | Phase 18 | Complete |
| FEED-08 | Phase 18 | Complete |
| CMP-07 | Phase 19 | Pending |
| CMP-08 | Phase 19 | Pending |
| CMP-09 | Phase 19 | Pending |
| CMP-10 | Phase 19 | Pending |
| CMP-11 | Phase 19 | Pending |
| A11Y-10 | Phase 19 | Pending |
| POLISH-01 | Phase 20 | Pending |
| POLISH-02 | Phase 20 | Pending |

Coverage: 15/15 mapped
