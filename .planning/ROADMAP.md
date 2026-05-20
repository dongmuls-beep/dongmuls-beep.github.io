# Roadmap: ETF 실부담비용 비교 사이트

**Milestone:** v1.1 — 안정성·보안·품질 개선
**Goal:** 운영 중인 사이트의 기술 부채를 해소하고, ETL 파이프라인의 신뢰성과 보안을 강화한다.

---

## Phase 1 — ETL 안정성 강화

**Goal:** ETL 파이프라인이 설정 변경·네트워크 장애·KOFIA 데이터 형식 오류에도 안정적으로 동작한다.

**Requirements:** ETL-01, ETL-02, ETL-03, ETL-04

**Plans:** 4 plans (A/B/C + D gap closure) ✓ Complete (2026-04-30)

**Wave 1**
- [x] 01-PLAN-A.md — GAS URL 환경 변수화 + GitHub Actions secrets 연동 (ETL-01)

**Wave 2**
- [x] 01-PLAN-B.md — Selenium 지수 백오프 재시도 + 적응형 다운로드 감지 (ETL-02)
- [x] 01-PLAN-C.md — 구체적 예외 처리 + KOFIA 컬럼 유효성 검사 (ETL-03, ETL-04)

**Gap Closure**
- [x] 01-PLAN-D.md — bare except: 4개 완전 제거 (ETL-03 gap)

**Cross-cutting constraints:**
- PLAN-B/C 실행 전 PLAN-A 완료 필수 (`etl_process.py` 환경변수 패턴 변경 의존)
- GitHub Actions `GAS_WEB_APP_URL` secret 등록 선행 필요

**Verification:** GitHub Actions에서 ETL이 성공적으로 실행되고, 환경 변수 없이 실행 시 명확한 에러 메시지가 출력된다.

---

## Phase 2 — 데이터 무결성 검증

**Goal:** ETL 결과 데이터가 유효한지 자동으로 검증하여 잘못된 데이터가 사이트에 배포되는 것을 방지한다.

**Requirements:** DATA-01, DATA-02, DATA-03

**Depends on:** Phase 1

**Plans:** 1 plan ✓ Complete (2026-05-20)

**Wave 1**
- [x] 02-PLAN-A.md — validate_etl_results() 구현 + __main__ 호출 삽입 (DATA-01, DATA-02, DATA-03)

**Verification:** 5/5 must-haves 통과 (2026-05-20) — DATA-01/02/03 behavioral evidence 확인

---

## Phase 3 — 보안 및 버그 수정

**Goal:** XSS 취약점을 줄이고, 알려진 UI 버그를 수정한다.

**Requirements:** SEC-01, SEC-02, BUG-01, BUG-02

**Plans:** 3 plans ✓ Complete (2026-05-20)

**Wave 1**
- [x] 03-PLAN-A.md — innerHTML 전수 감사 + applyTranslations 의도적 HTML 주석 추가 (SEC-01, SEC-02)
- [x] 03-PLAN-B.md — initSmartHeader RAF 콜백 nav-open early return 추가 (BUG-01)
- [x] 03-PLAN-C.md — renderChangelog 빈 changes 시 테이블 블록 생략, p 단독 렌더링 (BUG-02)

**Verification:** 7/7 must-haves 통과 (2026-05-20) — SEC-01/02/BUG-01/02 automated evidence 확인, browser test pending

---

## Phase 4 — ETL 단위 테스트

**Goal:** ETL 핵심 로직에 대한 단위 테스트를 추가하여 KOFIA 형식 변경 시 즉시 감지할 수 있다.

**Requirements:** TEST-01, TEST-02, TEST-03

**Depends on:** Phase 1, Phase 2

**Plans:** 3 plans

**Wave 1**
- [x] 04-PLAN-A.md — pytest 추가 (requirements.txt), tests/ 디렉토리 + conftest.py (openpyxl fixtures), CI 통합 (daily_update.yml) ✓ Complete (2026-05-20)

**Wave 2**
- [ ] 04-PLAN-B.md — p_float() 모듈 수준 추출 + 수수료 계산 단위 테스트 (TEST-01)
- [ ] 04-PLAN-C.md — 헤더 감지·데이터 매칭 테스트 + validate_etl_results 검증 테스트 (TEST-02, TEST-03)

**Verification:** `pytest tests/` 실행 시 모든 테스트 통과. GitHub Actions에 테스트 단계 추가.

---

## Milestone Summary

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 | ETL 안정성 | ETL-01~04 | Complete (2026-04-30) |
| 2 | 데이터 무결성 | DATA-01~03 | Complete (2026-05-20) |
| 3 | 보안·버그 수정 | SEC-01~02, BUG-01~02 | Complete (2026-05-20) |
| 4 | ETL 테스트 | TEST-01~03 | In Progress — Plan A 완료 (2026-05-20) |

---
*Roadmap created: 2026-04-07*
*Milestone: v1.1 안정성·보안·품질 개선*
*Phase 1 plans created: 2026-04-30*
*Phase 2 plans created: 2026-05-20*
*Phase 3 plans created: 2026-05-20*
*Phase 4 plans created: 2026-05-20*
