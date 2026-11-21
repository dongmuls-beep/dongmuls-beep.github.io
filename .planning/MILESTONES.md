# Milestones

## v1.7 홈 서버 이전 (Shipped: 2026-11-21)

**Phases completed:** 3 phases (26-28), direct 실행(계획 문서 없음)
**Requirements:** 8/8 (SRV-01~05, OPS-01~03)

**Key accomplishments:**

- 서버(Ubuntu, nginx)에서 `etl_process.py`·`build_price_history.py --mode incremental`을 실데이터로 실행, 비밀 값은 서버 `~/.etf-env`(600)에만 보관 (Phase 26)
- systemd timer: ETL 09:00 KST(system), 시세 14:30 KST(user), `Persistent=true`, 공용 lock, 실행 전 pytest·node 검사 (Phase 27)
- ETL과 시세 모두 서버가 deploy key로 `main`에 push, GitHub `Daily ETF Data Update`·`Daily ETF Price Update` 워크플로 비활성화로 이중 실행 방지 (Phase 27)
- 서버는 공개 서빙 없이 Tailscale ssh로만 접속(OPS-01), NOPASSWD sudo 제거·ssh 비밀번호 로그인 차단, 운영 문서 `server_ops.md`·`deploy/` (Phase 28)

**Delivered:** GitHub Actions 의존 없이 집 서버가 매일 ETL·시세 수집을 돌리고 결과를 push한다. 사이트 서빙은 GitHub Pages 유지.

**Known deferred items at close:** 서버 `~/etf-prices` 잔존, 비활성 워크플로 중복 파일, Tailscale 키 만료 해제 확인, ufw 80/443 열림 (STATE.md Deferred Items). 별도 마일스톤 감사 없음.

---

## v1.6 ETF 평가금액 추이 대시보드 (Shipped: 2026-11-21)

**Phases completed:** 5 phases (21-25), 22 plans
**Requirements:** 22/22 (SPIKE-01~05, PRICE-01~05, CALC-06, STORE-01~02, PF-01~03, I18N-01, A11Y-11, SAFE-01~02, NAV-01, VERIFY-01); NAV-01·VERIFY-01은 조정된 해석으로 충족
**Audit:** tech_debt (integration 6/6, E2E 1/1 정적 추적, 차단 갭 없음) — milestones/v1.6-MILESTONE-AUDIT.md
**Tests:** pytest 483 + node 15

**Key accomplishments:**

- 게이트 0 스파이크: API 이용조건·59개 종목(영숫자 코드 포함)·백필 규모·바닐라 JS 스택 결정, 재배포 위험은 소유자 수용 (Phase 21)
- `prices/{code}.json`·`prices-meta.json` 계약, 59개 종목 백필, 누락 임계 시 기존 파일 유지·실패, serviceKey 마스킹 (Phase 22)
- 순수 JS 평가금액 계산(휴장일 forward-fill, 상장폐지 고정, ±40% 경고)과 로컬 저장 `pf_v1`, 검증된 내보내기·가져오기·덮어쓰기 확인 (Phase 23)
- `/portfolio/`: 종목 검색·수량·시작일, 추이 SVG 차트, 합계·전일 대비·비중·기간, 가중평균 총보수, 8개 언어, a11y (Phase 24)
- 첫 진입 고지·persist 요청·마지막 백업 경과·상시 면책, 헤더 내비 링크(롤백 가능한 단일 커밋), 서버 DRY_RUN·라이브 URL 검증 (Phase 25)

**Delivered:** 로그인 없이 보유 ETF의 일별 평가금액 추이를 브라우저 로컬 저장으로 확인하는 `/portfolio/` 페이지.

**Known deferred items at close:** 24-HUMAN-CHECK.md 브라우저 확인, vi/zh/ja/th/tl/km 고지 문구 원어민 검수, NAV-01 noindex 소유자 수용, data.go.kr 재배포 약관 확인, ±40% 경고 오탐(레버리지·인버스), price_update.yml 중복 (STATE.md Deferred Items).

---

## v1.5 기술 부채 정리 (Shipped: 2026-11-11)

**Phases completed:** 4 phases, 9 plans, 3 tasks

**Key accomplishments:**

- CI가 RSS 빌드 실패를 숨기지 않음(실패 시 run 실패 + 기존 feed.xml 유지), 총보수 급락 3건 검증(원천 오류 아님), 실제 CI에서 node 검사 통과 확인
- RSS 피드 중복 행 제거·정확한 수치·byte 단위 결정성 테스트·.gitattributes/.tmp 정리
- /compare/ 차트 리사이즈 재그리기, 빈 th·?compare= 절단 수정, 계산기 로케일·단일 live region·재시도 포커스, `etf:lang-changed`로 언어 이벤트 통일, 320px 순위표
- footer-links gap, SUMMARY `requirements-completed` 보정, 14~16 VERIFICATION status 정리

**Delivered:** v1.4 감사에서 남은 기술 부채 해소 (요구사항 15/15). pytest 411 + node 9.

**Known deferred items at close: 3** (STATE.md Deferred Items): Phase 19 사람 확인 2건(스크린리더 1회 낭독, Retry 포커스 링 모양), SEED-001 보류, debug knowledge-base(오탐). Phase 18~20 코드는 미push(실제 CI는 Phase 17까지만 실행).

---

## v1.4 신뢰성·접근성·비교 도구 (Shipped: 2026-10-06)

**Delivered:** 결측 수수료를 가짜 0이 아닌 null로 처리해 데이터 신뢰성을 높이고, 모바일 접근성을 보강했으며, 투자자용 비교 도구(ETF 2~4개 직접 비교·누적 비용 계산기·RSS 피드)를 추가.

**Phases completed:** 7 phases (10–16), 21 plans
**Requirements:** 28/28 (DATA-07~10, FEED-01~04, CALC-01~05, A11Y-01~09, CMP-01~06)
**Audit:** tech_debt (integration 28/28, flows 6/6, no blockers); human UAT 15/15
**Git:** 98 commits since v1.3, 52 code files changed (+8,041 / −215)

**Key accomplishments:**

- `p_float` 결측 → `None`/`null`, 결측 낀 쌍은 changelog·fee-history 변동에서 제외 → 가짜 0 수수료 부채(v1.3 WR-04) 해소 (Phase 10)
- 프런트 null-safe: 결측 "-" 표시·정렬 맨 뒤·가짜 배지 없음, `etf:*` 이벤트 seam (Phase 11)
- 총보수·기타비용 변동만 담은 결정적 RSS 2.0 `feed.xml` 일일 생성 + 메인·변경이력 구독 링크 (Phase 12, 16)
- 모바일 a11y: h1·화살표 AA 대비, 헤더 숨김, 44px 터치, skip link, 로딩/에러/빈 상태, 8개 언어 ARIA (Phase 14)
- `/compare/`: 2~4개 선택·비교 바, 최저 배지 표, 겹침 추이 차트(선 모양+마커), 누적 비용 계산기(전 종목 순위표, URL 공유) (Phase 13, 15)
- UAT 중 수정: 비교 바 번역 키 노출, 계산기 멀티 비교 순위표, 차트 데이터 표 페이지 넘침, 번역 다듬기
- 테스트 145 → pytest 387 + node 9

**Known deferred items at close:** 1 (knowledge-base debug audit false positive, see STATE.md) + tech debt in milestones/v1.4-MILESTONE-AUDIT.md

---

## v1.3 수수료 변동 그래프 (Shipped: 2026-09-30)

**Delivered:** 수수료 셀을 클릭하면 해당 항목의 과거 변동 추이를 차트와 내역으로 보여주고, 이를 위한 일일 스냅샷 이력 저장소를 구축.

**Phases completed:** 3 phases (7–9), 5 plans, 11 tasks
**Requirements:** 13/13 (HIST-01~04, BACK-01~03, CHART-01~06)
**Audit:** tech_debt (integration 9/9, flows 2/2, no blockers)

**Key accomplishments:**

- `fee-history.json` + `build_fee_history.py` — 변동분만 종목코드·KST 날짜로 누적, 손상 시 fail-closed, 원자적 쓰기, 일일 CI 자동 커밋 (Phase 7)
- `backfill_fee_history.py` — data.json git 히스토리 146일 재생, 59종목 1169포인트, 05-27 잘못된 값 제거, changelog 912/912 일치 (Phase 8)
- 수수료 셀 클릭 → 모달: 부드러운 monotone 곡선 SVG 차트 + 변동 내역, 로딩/에러/변동없음 상태, 포커스·ESC·모바일 대응 (Phase 9)
- 8개 언어 i18n 키 추가 + 패리티 테스트, 차트 수학 node 검사 CI 추가 (Phase 9)
- 테스트 56 → 145개

**Known deferred items at close:** 1 (knowledge-base debug audit false positive, see STATE.md) + tech debt in milestones/v1.3-MILESTONE-AUDIT.md (etl_process.p_float 0.0 반환 등)

---

## v1.2 데이터 정확성 보강 (Shipped: 2026-09-30)

**Delivered:** 운영 점검(2026-09-30)에서 발견된 AUM 누락과 변경 이력 가짜 변동을 해소하고 재발 방지 장치를 CI에 추가.

**Phases completed:** 2 phases (5–6), 2 plans, 5 tasks
**Requirements:** 3/3 (DATA-04, DATA-05, DATA-06)
**Audit:** passed (integration 6/6, flows 2/2)

**Key accomplishments:**

- 영숫자 KRX 코드(0026S0, 0069M0) NAVER 매칭 → 운영 data.json AUM null 0건 (Phase 5)
- `validate_market_data` DATA-04 soft-warning — AUM/거래량 누락 조기 감지 (Phase 5)
- `detect_bulk_correction` — 총보수/기타비용 50%+ 동시 변경 실행은 changelog 미기록 + DATA-06 경고 (Phase 6)
- 기존 changelog 멱등 정리로 2026-05-27 가짜 항목 제거, pre-commit hook 재유입 경로 무력화 (Phase 6)
- 테스트 33 → 56개

**Known deferred items at close:** 1 (knowledge-base audit false positive, see STATE.md)

---

## v1.1 안정성·보안·품질 개선 (Shipped: 2026-09-30)

**Delivered:** ETL 파이프라인 신뢰성(환경변수·재시도·예외처리·검증)과 프론트엔드 보안/버그 수정, ETL 단위 테스트 CI 게이트.

**Phases completed:** 4 phases (1–4), 11 plans
**Requirements:** 14/14 (ETL-01~04, DATA-01~03, SEC-01~02, BUG-01~02, TEST-01~03)
**Timeline:** 2026-04-07 → 2026-05-20 (실행), UAT/SECURITY 마감 2026-09-30

**Key accomplishments:**

- GAS Web App URL 환경변수화 + Selenium 지수 백오프 재시도 + bare except 제거 (Phase 1)
- `validate_etl_results()` — 수수료 범위·중복 코드·이상치 soft-warning 검증 (Phase 2)
- innerHTML 전수 감사, 모바일 헤더 글리치(BUG-01)·빈 변경 이력 테이블(BUG-02) 수정 (Phase 3)
- pytest 33개 테스트, CI에서 ETL 실행 전 테스트 게이트 (Phase 4)
- Phase 3 UAT 2/2 pass, SECURITY 9/9 closed, UI 감사 후 빈 상태 스타일 보강

**Known deferred items at close:** 1 (see STATE.md Deferred Items)

---
