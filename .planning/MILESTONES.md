# Milestones

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
