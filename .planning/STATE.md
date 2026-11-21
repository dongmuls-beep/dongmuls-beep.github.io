---
gsd_state_version: 1.0
milestone: none
milestone_name: (none — v1.6 and v1.7 archived)
status: between_milestones
last_updated: "2026-11-21T00:00:00.000Z"
last_activity: 2026-11-21
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-21)

**Core value:** 투자자가 ETF 실질 부담 비용을 한눈에 비교할 수 있어야 한다
**Current milestone:** none (v1.6, v1.7 archived 2026-11-21)
**Current focus:** 다음 마일스톤 시작 대기 (/gsd-new-milestone)

## Current Position

Phase: none
Status: No active milestone
Last activity: 2026-11-21 — v1.6 and v1.7 archived

## Completed Milestones

- **v1.1 안정성·보안·품질 개선** — Phases 1-4 (shipped 2026-09-30)
- **v1.2 데이터 정확성 보강** — Phases 5-6 (shipped 2026-09-30)
- **v1.3 수수료 변동 그래프** — Phases 7-9 (shipped 2026-09-30)
- **v1.4 신뢰성·접근성·비교 도구** — Phases 10-16 (shipped 2026-10-06)
- **v1.5 기술 부채 정리** — Phases 17-20 (shipped 2026-11-11)
- **v1.6 ETF 평가금액 추이 대시보드** — Phases 21-25 (shipped 2026-11-21) — see .planning/MILESTONES.md
- **v1.7 홈 서버 이전** — Phases 26-28 (shipped 2026-11-21)

## Accumulated Context

### Constraints (carry forward)

- `script.js`/`style.css` UTF-8 BOM; 신규 파일 LF/BOM 없음
- CI가 `fee-history.json`·`feed.xml` 단독 작성자; pre-commit 훅이 `changelog.json`/`data.json` 덮어씀 → 테스트는 fixture
- OneDrive: git worktree 불가; 병렬 에이전트는 `git commit --only -- <paths>`
- Push 전 `git pull --rebase origin main` (CI 일일 자동 커밋)

### Open follow-ups

- 기술 부채: milestones/v1.6-MILESTONE-AUDIT.md (v1.4·v1.5 감사 문서는 milestones/)

### Blockers

없음

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-10-06:

| Category | Item | Status |
|----------|------|--------|
| debug | knowledge-base | false positive (resolved-session knowledge base file, not an open session) |

Items acknowledged and deferred at milestone close on 2026-11-11:

| Category | Item | Status |
|----------|------|--------|
| debug | knowledge-base | false positive (resolved-session knowledge base file) |
| seed | SEED-001-portfolio-dashboard | dormant, next milestone candidate (v1.6) |
| verification | 19-VERIFICATION human items | screen reader single announcement, Retry focus ring look (rest confirmed via headless Chrome 2026-11-11) |

Items acknowledged and deferred at milestone close on 2026-11-21 (v1.6, v1.7):

| Category | Item | Status |
|----------|------|--------|
| verification | 24-HUMAN-CHECK.md (milestones/v1.6-phases/24-portfolio-ui) | 브라우저 확인 미실행: 키보드 순서, 320px, 실제 내보내기·가져오기·덮어쓰기, en·km 렌더링, 네트워크 탭 |
| review | vi/zh/ja/th/tl/km 고지·백업·내비 문구 | 원어민 검수 대기 (기계 번역 면책 문구) |
| decision | NAV-01 noindex 해석 | 소유자 수용 대기 (sitemap·RSS·structuredData 미포함) |
| legal | data.go.kr 재배포 약관 | 기관 확인 미결, 철회 방법: `prices/`·`prices-meta.json` 삭제 |
| server | stale `~/etf-prices` | 서버에 잔존, 삭제 필요 |
| ci | `price_update.yml`·`daily_update.yml` | 비활성 중복 (서버 스크립트와 드리프트 가능) |
| server | 서버 키 만료 | 만료 알림 설정 필요 (deploy key, Tailscale 키 만료 해제 상태 확인) |
| server | ufw 80/443 | 공개 서빙 없음과 달리 아직 열림, 닫기 검토 |
| ui | 미해결 UI 리뷰 항목 | .planning/ui-review.md, 24-UI-REVIEW.md 항목 미처리분 |
| seed | 구글 Drive 저장·로그인 | 다음 마일스톤 후보 |

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
