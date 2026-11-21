# Roadmap: ETF 실부담비용 비교 사이트

## Milestones

- ✅ **v1.1 안정성·보안·품질 개선** — Phases 1-4 (shipped 2026-09-30)
- ✅ **v1.2 데이터 정확성 보강** — Phases 5-6 (shipped 2026-09-30)
- ✅ **v1.3 수수료 변동 그래프** — Phases 7-9 (shipped 2026-09-30)
- ✅ **v1.4 신뢰성·접근성·비교 도구** — Phases 10-16 (shipped 2026-10-06)
- ✅ **v1.5 기술 부채 정리** — Phases 17-20 (shipped 2026-11-11)
- ✅ **v1.6 ETF 평가금액 추이 대시보드** — Phases 21-25 (shipped 2026-11-21)
- ✅ **v1.7 홈 서버 이전** — Phases 26-28 (shipped 2026-11-21)

## Phases

<details>
<summary>✅ v1.1 안정성·보안·품질 개선 (Phases 1-4) — SHIPPED 2026-09-30</summary>

- [x] Phase 1: ETL 안정성 강화 (4/4 plans) — completed 2026-04-30
- [x] Phase 2: 데이터 무결성 검증 (1/1 plan) — completed 2026-05-20
- [x] Phase 3: 보안 및 버그 수정 (3/3 plans) — completed 2026-05-20, UAT/SECURITY 2026-09-30
- [x] Phase 4: ETL 단위 테스트 (3/3 plans) — completed 2026-05-20

Full details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 데이터 정확성 보강 (Phases 5-6) — SHIPPED 2026-09-30</summary>

- [x] Phase 5: 신규 코드 시장데이터 매칭 (1/1 plan) — completed 2026-09-30
- [x] Phase 6: 변경 이력 정합성 (1/1 plan) — completed 2026-09-30

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3 수수료 변동 그래프 (Phases 7-9) — SHIPPED 2026-09-30</summary>

- [x] Phase 7: 수수료 이력 저장소 및 일일 추가 (1/1 plan) — completed 2026-09-30
- [x] Phase 8: Git 히스토리 과거 복원 (1/1 plan) — completed 2026-09-30
- [x] Phase 9: 수수료 변동 그래프 모달 (3/3 plans) — completed 2026-09-30

Full details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

</details>

<details>
<summary>✅ v1.4 신뢰성·접근성·비교 도구 (Phases 10-16) — SHIPPED 2026-10-06</summary>

- [x] Phase 10: 데이터 신뢰성 (3/3 plans) — completed 2026-09-30
- [x] Phase 11: script.js seam + null-safe 프런트엔드 (1/1 plan) — completed 2026-09-30
- [x] Phase 12: RSS 피드 (2/2 plans) — completed 2026-09-30
- [x] Phase 13: 계산기 엔진 (1/1 plan) — completed 2026-09-30
- [x] Phase 14: 모바일 접근성 (5/5 plans) — completed 2026-09-30
- [x] Phase 15: 직접 비교 + 계산기 UI (7/7 plans) — completed 2026-09-30
- [x] Phase 16: 통합·검증 (2/2 plans) — completed 2026-09-30, human UAT 2026-10-06

Full details: [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)

</details>

<details>
<summary>✅ v1.5 기술 부채 정리 (Phases 17-20) — SHIPPED 2026-11-11</summary>

- [x] Phase 17: 데이터·CI 신뢰성 (3/3 plans) — completed 2026-11-10
- [x] Phase 18: RSS 피드 품질 (1/1 plan) — completed 2026-11-10
- [x] Phase 19: /compare/ UI·접근성 정리 (3/3 plans) — completed 2026-11-10
- [x] Phase 20: 소소한 정리·문서 보정 (2/2 plans) — completed 2026-11-10

Full details: [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md)

</details>

<details>
<summary>✅ v1.6 ETF 평가금액 추이 대시보드 (Phases 21-25) — SHIPPED 2026-11-21</summary>

- [x] Phase 21: 게이트 0 스파이크 (2/2 plans) — completed 2026-11-11
- [x] Phase 22: 가격 수집 파이프라인 (3/3 plans) — completed 2026-11-11
- [x] Phase 23: 계산·저장 코어 (2/2 plans) — completed 2026-11-21
- [x] Phase 24: /portfolio/ UI·i18n (10/10 plans) — completed 2026-11-21, 사람 확인 보류
- [x] Phase 25: 마감·배포 검증 (5/5 plans) — completed 2026-11-21, 사람 확인 보류

Full details: [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md)

</details>

<details>
<summary>✅ v1.7 홈 서버 이전 (Phases 26-28) — SHIPPED 2026-11-21</summary>

- [x] Phase 26: 서버 실행 검증 (direct) — completed 2026-11-21
- [x] Phase 27: 스케줄·동기화 (direct) — completed 2026-11-21
- [x] Phase 28: 공개·보안 마감 (direct) — completed 2026-11-21

Full details: [milestones/v1.7-ROADMAP.md](milestones/v1.7-ROADMAP.md)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. ETL 안정성 강화 | v1.1 | 4/4 | Complete | 2026-04-30 |
| 2. 데이터 무결성 검증 | v1.1 | 1/1 | Complete | 2026-05-20 |
| 3. 보안 및 버그 수정 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 4. ETL 단위 테스트 | v1.1 | 3/3 | Complete | 2026-05-20 |
| 5. 신규 코드 시장데이터 매칭 | v1.2 | 1/1 | Complete | 2026-09-30 |
| 6. 변경 이력 정합성 | v1.2 | 1/1 | Complete | 2026-09-30 |
| 7. 수수료 이력 저장소 및 일일 추가 | v1.3 | 1/1 | Complete | 2026-09-30 |
| 8. Git 히스토리 과거 복원 | v1.3 | 1/1 | Complete | 2026-09-30 |
| 9. 수수료 변동 그래프 모달 | v1.3 | 3/3 | Complete | 2026-09-30 |
| 10. 데이터 신뢰성 | v1.4 | 3/3 | Complete | 2026-09-30 |
| 11. script.js seam + null-safe 프런트엔드 | v1.4 | 1/1 | Complete | 2026-09-30 |
| 12. RSS 피드 | v1.4 | 2/2 | Complete | 2026-09-30 |
| 13. 계산기 엔진 | v1.4 | 1/1 | Complete | 2026-09-30 |
| 14. 모바일 접근성 | v1.4 | 5/5 | Complete | 2026-09-30 |
| 15. 직접 비교 + 계산기 UI | v1.4 | 7/7 | Complete | 2026-09-30 |
| 16. 통합·검증 | v1.4 | 2/2 | Complete | 2026-10-06 |
| 17. 데이터·CI 신뢰성 | v1.5 | 3/3 | Complete   | 2026-11-10 |
| 18. RSS 피드 품질 | v1.5 | 1/1 | Complete   | 2026-11-10 |
| 19. /compare/ UI·접근성 정리 | v1.5 | 3/3 | Complete   | 2026-11-10 |
| 20. 소소한 정리·문서 보정 | v1.5 | 2/2 | Complete   | 2026-11-10 |
| 21. 게이트 0 스파이크 | v1.6 | 2/2 | Complete    | 2026-11-11 |
| 22. 가격 수집 파이프라인 | v1.6 | 3/3 | Complete    | 2026-11-11 |
| 23. 계산·저장 코어 | v1.6 | 2/2 | Complete   | 2026-11-21 |
| 24. /portfolio/ UI·i18n | v1.6 | 10/10 | Complete (사람 확인 항목 보류: 24-HUMAN-CHECK.md) | 2026-11-21 |
| 25. 마감·배포 검증 | v1.6 | 5/5 | Complete (사람 확인 항목 보류) | 2026-11-21 |
| 26. 서버 실행 검증 | v1.7 | direct | Complete | 2026-11-21 |
| 27. 스케줄·동기화 | v1.7 | direct | Complete (ETL push, 시세는 서버 로컬) | 2026-11-21 |
| 28. 공개·보안 마감 | v1.7 | direct | Complete (Tailscale ssh만, 공개 서빙 없음) | 2026-11-21 |
