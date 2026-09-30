# Retrospective

## Milestone: v1.1 — 안정성·보안·품질 개선

**Shipped:** 2026-09-30
**Phases:** 4 | **Plans:** 11

### What Was Built
- ETL 환경변수화·재시도·구체적 예외 처리·KOFIA 컬럼 검증
- ETL 결과 soft-warning 검증 (`validate_etl_results`)
- 프론트엔드 innerHTML 감사, 모바일 헤더/빈 changelog 버그 수정
- pytest 33개 + CI 테스트 게이트

### What Worked
- 기존 codebase 분석(.planning/codebase/) 기반으로 research 없이 빠르게 계획
- 순수 함수 설계(validate_etl_results) → Phase 4 테스트 용이

### What Was Inefficient
- Phase 3 브라우저 UAT가 4개월간 pending으로 남음
- 로컬 저장소가 origin 자동 업데이트와 4개월 갈라짐 → 로컬 커밋 미배포
- 플랜 파일명(`NN-PLAN-X.md`)이 gsd-sdk 패턴과 달라 진행률/통계가 0으로 집계

### Patterns Established
- soft-warning 검증 (데이터 손실 없이 경고만)
- pre-commit hook이 운영 changelog.json을 동기화

### Key Lessons
- 데이터 매핑 수정(`_KOFIA_17_COLS`)은 changelog에 가짜 변동을 남김 → 보정 실행은 이력에서 분리해야 함
- 신규 KRX 영숫자 코드(예: 0026S0)를 숫자 코드 가정이 놓침

## Cross-Milestone Trends

| Milestone | Phases | Plans | Requirements | Deferred |
|-----------|--------|-------|--------------|----------|
| v1.1 | 4 | 11 | 14/14 | 1 |
