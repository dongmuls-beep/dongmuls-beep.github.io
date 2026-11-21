# Phase 25: 마감·배포 검증 - Context

**Gathered:** 2026-11-21
**Status:** Ready for planning
**Mode:** Autonomous smart discuss — 권장 답 일괄 수락(사용자 지시: 알아서 자동 진행). 별도 UI-SPEC 단계는 생략: 새 UI는 Phase 24 UI-SPEC의 토큰·컴포넌트(`.cmp-*`, `--pf-*`)로 충분한 작은 추가라서 이 문서에 결정을 넣는다.

<domain>
## Phase Boundary

`/portfolio/`를 공개 가능한 상태로 마감한다. 요구사항: SAFE-01, SAFE-02, NAV-01, VERIFY-01. 계산·저장 코어(Phase 23)와 화면(Phase 24)은 끝났다. 이 phase는 고지·백업 안내·기준일 표시, 내비 연결, 그리고 푸시 후 실제 실행 환경에서의 검증을 다룬다.
</domain>

<decisions>
## Implementation Decisions

### 고지·백업 (SAFE-01)
- 첫 진입 고지: "이 브라우저에만 저장됩니다. 다른 기기·브라우저로 옮기려면 내보내기 파일을 쓰세요." 닫을 수 있는 인라인 안내 영역(모달 아님). 닫음 상태는 localStorage 키 `pf_v1_noticeDismissed`에 저장(저장 실패 시 세션 동안만 닫힘, 오류는 무시).
- `navigator.storage.persist()`는 첫 행 저장 성공 직후 1회 요청한다(지원 안 하면 조용히 건너뜀). 결과가 거부여도 사용자에게 오류로 보이지 않고, 거부된 경우만 안내 문구에 "브라우저가 데이터를 지울 수 있어요. 가끔 백업하세요."를 한 줄 덧붙인다.
- "마지막 백업 N일 전" 표시: `PortfolioStore.lastBackup()`(Phase 23)을 읽어 내보내기 영역에 표시. 백업 이력이 없고 행이 1개 이상이면 "아직 백업하지 않았어요". 7일 이상이면 강조(색에만 의존하지 않고 문구 "백업이 오래됐어요" 병기). 날짜 계산은 KST 달력일 기준 `todayIso`와 같은 규칙.

### 상시 고지 (SAFE-02)
- 결과 영역 하단에 항상 보이는 한 블록(접기 불가): "종가 기준이며 분배금·분할·병합은 반영되지 않습니다. 데이터 기준일: {date}. 투자 자문이 아니며 투자 판단의 책임은 본인에게 있습니다."
- Phase 24가 만든 `pf_asof_note`("종가 기준") 두 단어 표기는 유지하고, 상시 고지 블록이 전체 문구를 담는다.
- 분석 이벤트로 보유 수량·종목을 보내지 않고 AdSense를 싣지 않는 것은 코드·정적 테스트로 못박는다: `tests/test_html_a11y.py`의 portfolio 정적 검사에 `adsbygoogle`/`gtag`/`script.js` 부재가 이미 있으면 유지, 없으면 추가.

### 내비 연결 (NAV-01) — 마지막 단계, 링크 제거만으로 롤백
- 기존 선례: `/compare/`는 `noindex`이고 sitemap·feed·structuredData에 없다. `/portfolio/`도 **같은 선례를 따른다**: `noindex,follow` 유지, sitemap.xml·feed.xml 항목 추가 안 함, structuredData 빈 배열 유지(요구사항의 sitemap·RSS·structuredData 항목은 "noindex 페이지는 포함하지 않는다"는 이 선례로 충족으로 본다. 색인 허용으로 바꾸려면 사용자 결정이 필요하므로 이 phase에서 하지 않는다).
- 내비 링크 추가: 헤더 내비를 가진 모든 페이지(`index.html`, `pension/`, `isa/`, `changelog/`, `fomo/`, `guide/`, `methodology/`, `compare/`, `portfolio/`)에 `<li><a href="/portfolio/" class="nav-link" data-i18n="nav_portfolio">ETF 평가금액 추이</a></li>`를 `/changelog/` 다음, `/fomo/` 앞이 아니라 **`/guide/` 앞**에 둔다(도구 링크를 안내 앞에). 신규 키 `nav_portfolio`를 8개 언어 팩에 추가(기존 `nav_*` 키 근처, 패리티 테스트 통과, 순서 규칙 확인).
- 이 변경은 별도 커밋 하나로 만들어 `git revert` 한 번으로 롤백 가능하게 한다.
- 푸시는 이 phase에서 한다(사용자 위임: "니가해"). 푸시 전 `git pull --rebase origin main`(서버가 매일 커밋한다). 푸시 후 롤백 방법(링크 커밋 revert)을 SUMMARY에 적는다.

### 실제 실행 환경 검증 (VERIFY-01)
- GitHub Actions 일일 워크플로 두 개는 서버 이전 때문에 의도적으로 비활성이다. "실제 CI" 검증은 두 갈래로 대체한다: (1) 서버 러너 `deploy/run-etl.sh`(pytest·node 글롭 → ETL → 빌드 → push)를 푸시 후 서버에서 `DRY_RUN=1`로 실행해 통과를 확인한다(서버 사본 `~/etf-deploy/run-etl.sh`에도 `tests/portfolio_*_check.js` 글롭을 반영, 사용자 권한으로 scp). (2) GitHub Pages 배포가 끝난 뒤 `https://etfsave.life/portfolio/`, `/portfolio/portfolio-view.js`, `/prices/360750.json`이 200을 주는지 확인한다.
- 서버 시세 수집(`deploy/run-prices.sh`)은 푸시 후 한 번 실제 실행해 `prices/`가 정상 push되는지 확인한다.
- 서버에서는 `sudo`가 없으므로 시스템 타이머 재시작이 필요하면 사용자 권한 작업만 한다.

### 테스트
- 새 순수 로직(백업 경과일 계산, 고지 닫힘 상태 규칙, persist 결과 처리)은 `PortfolioFormat`에 순수 함수로 추가하고 `tests/portfolio_view_check.js`에 케이스를 넣는다.
- i18n: 새 키(`pf_notice_*`, `pf_backup_*`, `pf_disclaimer_*`, `nav_portfolio`)는 8개 언어에 모두 추가, `tests/test_i18n_portfolio.py`의 키 수 기대값과 패리티 테스트를 갱신한다.
- 정적 검사: `tests/test_html_a11y.py`가 모든 페이지의 내비 구조를 검사하면 신규 링크가 통과하는지 확인하고, 내비 링크가 정확히 9개 페이지에 있는지 확인하는 검사를 추가한다.
- 실제 브라우저(Selenium + 헤드리스 Chrome, 이 PC에 설치됨)로 고지·백업 표시·내비 링크를 한 번 구동 확인한다.

### Claude's Discretion
- 고지 영역 배치와 문구 다듬기(8개 언어), 헬퍼 이름, 닫기 버튼 레이블, 테스트 fixture.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `portfolio/portfolio-view.js`(`announce`, `showStorage`, 내보내기 영역), `portfolio/portfolio-format.js`, `portfolio/portfolio-store.js`(`lastBackup()`), `portfolio.css`(`--pf-*`), `compare.css`(`.cmp-*`)
- i18n 팩 8개, 패리티·순서 테스트(`tests/test_i18n_portfolio.py`, `test_i18n_a11y.py`, `test_i18n_compare.py`, `test_i18n_feed.py`)

### Established Patterns
- noindex 도구 페이지(`/compare/`)는 sitemap·feed에 넣지 않음. 헤더 내비는 각 HTML에 중복 정의.
- 서버 러너가 CI 단계를 미러링하고 비밀 값은 `~/.etf-env`.

### Integration Points
- 9개 HTML 헤더 내비, 8개 i18n 팩, `deploy/run-etl.sh`(+ 서버 사본), `tests/test_html_a11y.py`
</code_context>

<specifics>
## Specific Ideas

- 롤백 = NAV 커밋 revert. 데이터 철회 = `prices/`·`prices-meta.json` 삭제(PRICES-CONTRACT).
</specifics>

<deferred>
## Deferred Ideas

- 색인 허용(sitemap·structuredData 포함), 원어민 번역 검수(km·tl 등), 사람 확인 체크리스트(`24-HUMAN-CHECK.md`) 수행
- 구글 Drive 저장·로그인
</deferred>

---
*Phase: 25-finish-verify*
