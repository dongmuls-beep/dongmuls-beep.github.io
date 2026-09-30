# ETF 실부담비용 비교 사이트 (etfsave.life)

## What This Is

한국 투자자를 위한 ETF 실부담비용 자동 비교 웹사이트. KOFIA(금융투자협회)에서 매일 자동으로 수수료 데이터를 수집하여 총보수·기타비용·매매중개수수료를 합산한 실부담비용 기준으로 ETF를 비교해준다. GitHub Pages에 정적 사이트로 배포되며 별도 서버 없이 운영된다.

## Current State

v1.3 수수료 변동 그래프 shipped (2026-09-30). 수수료 셀 클릭 → 부드러운 곡선 SVG 차트 + 변동 내역 모달, fee-history.json 일일 누적(59종목, 2026-02~ backfill). 테스트 145개 + 차트 node 검사 CI. 알려진 부채: etl_process.p_float 파싱 실패 시 0.0 반환.

## Current Milestone: v1.4 신뢰성·접근성·비교 도구

**Goal:** 데이터 신뢰성·모바일 접근성을 보강하고, 투자자용 비교 도구(직접 비교·누적 비용 계산기·RSS)를 추가한다.

**Target features:**
- p_float 파싱 실패 시 0.0 대신 결측 처리 → 가짜 0 수수료 변동 차단
- 모바일 접근성/UI Critical+Major 수정 (h1 대비, 헤더 숨김, 모바일 changelog 표, 터치 영역 44px, 로딩/에러 상태, ARIA 번역)
- ETF 2~4개 선택 직접 비교 화면
- 누적 비용 계산기 (투자금 × 보유기간)
- 수수료 인하 RSS 피드 정적 생성

## Core Value

투자자가 ETF 선택 시 숨겨진 비용까지 포함한 실질 부담 비용을 한눈에 비교할 수 있어야 한다.

## Requirements

### Validated

- ✓ 수수료 변동 시점만 기록하는 fee-history.json 일일 누적 (HIST-01~04) — v1.3
- ✓ data.json git 히스토리 backfill (BACK-01~03) — v1.3
- ✓ 수수료 셀 클릭 시 변동 추이 차트·내역 모달, 8개 언어 (CHART-01~06) — v1.3
- ✓ 영숫자 KRX 코드 ETF AUM·거래량 매칭 (DATA-04) — v1.2
- ✓ 변경 이력 가짜 변동 제거 + 대량 보정 재발 방지 (DATA-05, DATA-06) — v1.2
- ✓ 데이터 유효성 검사 레이어 (수수료 범위·중복 코드·이상치 soft-warning) — v1.1
- ✓ XSS 개선 (escapeHtml 일관 적용, innerHTML 감사) — v1.1
- ✓ ETL 단위 테스트 (헤더 감지, 수수료 계산, 데이터 매칭) + CI 게이트 — v1.1
- ✓ 모바일 헤더 숨김 글리치 / 빈 변경 이력 테이블 수정 — v1.1
- ✓ ETL 설정 환경 변수화 (GAS URL 하드코딩 제거) — Validated in Phase 1: ETL 안정성 강화
- ✓ ETL 안정성 강화 (Selenium 재시도 로직, 에러 처리 개선) — Validated in Phase 1: ETL 안정성 강화
- ✓ KOFIA에서 ETF 수수료 Excel 파일 매일 자동 다운로드 (Selenium + GitHub Actions) — existing
- ✓ 실부담비용 자동 계산 (총보수 + 기타비용 + 매매중개수수료) — existing
- ✓ data.json으로 정적 파일 출력 및 GitHub Pages 자동 배포 — existing
- ✓ ETF 카테고리별 필터링 및 비교 테이블 렌더링 — existing
- ✓ 8개 언어 다국어 지원 (ko, en, vi, zh, ja, th, tl, km) — existing
- ✓ ISA·연금저축·IRP 계좌 가이드 페이지 — existing
- ✓ ETF 수수료 변경 이력(changelog) 페이지 — existing
- ✓ Google Sheets를 통한 관리 종목 목록 관리 — existing
- ✓ 반응형 디자인 (모바일/데스크톱), 글래스모피즘 테마 — existing
- ✓ SEO 최적화 (sitemap, robots.txt, 구조화 데이터) — existing

### Active

- [ ] p_float 파싱 실패 결측 처리 (WR-04 부채)
- [ ] 모바일 접근성/UI Critical+Major (ui-review.md)
- [ ] ETF 직접 비교
- [ ] 누적 비용 계산기
- [ ] 수수료 인하 RSS 피드

### Out of Scope

- 사용자 로그인/계정 — 공개 서비스, 개인화 불필요
- 실시간 데이터 스트리밍 — 월 1회 업데이트로 충분한 투자 정보
- 자체 백엔드 서버 — GitHub Pages 무료 정적 호스팅이 핵심 비용 절감 전략
- 모바일 네이티브 앱 — 반응형 웹으로 충분

## Context

- 도메인: `etfsave.life` (GitHub Pages + CNAME)
- 데이터 원천: KOFIA 공시 사이트 (dis.kofia.or.kr) — Selenium 스크래핑
- 종목 관리: Google Sheets + Google Apps Script Web App
- 배포: GitHub Actions (매일 UTC 00:00 = KST 09:00 자동 실행)
- 브라우저: 프레임워크 없는 바닐라 JS (의존성 최소화)
- Python 3.9, pandas, selenium, webdriver-manager

## Constraints

- **Tech Stack**: 바닐라 JS/HTML/CSS — 프레임워크 도입 금지, 의존성 최소화 원칙
- **Hosting**: GitHub Pages (정적 파일만) — 서버 사이드 런타임 사용 불가
- **Data Source**: KOFIA 웹사이트 구조 변경에 취약 — Selenium 선택자 깨질 수 있음
- **Automation**: GitHub Actions 무료 플랜 제한 — ETL 실행 시간 최적화 필요
- **Language**: 한국어 JSON 필드명 유지 — ETL 출력과 프론트엔드 키 일치 필요

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 정적 사이트 + JSON 파일 | 서버 불필요, 무료 호스팅, CDN 자동 적용 | ✓ Good |
| GitHub Actions ETL | 무료 크론 대체, 코드와 데이터 동일 저장소 관리 | ✓ Good |
| Google Sheets 종목 관리 | 비개발자도 종목 추가/제거 가능한 관리 UI | ✓ Good |
| Selenium KOFIA 스크래핑 | 공개 API 없음, 웹 자동화만 가능 | ⚠️ Revisit — 사이트 변경 취약 |
| 바닐라 JS (프레임워크 없음) | 빌드 과정 없음, 로딩 속도 최적 | ✓ Good |
| 8개 언어 i18n | 동남아 투자자 포함 넓은 타겟 | ✓ Good |
| ETL 검증은 soft-warning (v1.1) | 데이터 손실 없이 파싱 버그 조기 감지 | ✓ Good |
| i18n innerHTML 유지 + SECURITY 주석 (v1.1) | 번역 JSON에 의도적 HTML | ✓ Good |
| CI에서 ETL 전 pytest 게이트 (v1.1) | KOFIA 형식 변경 즉시 감지 | ✓ Good |
| changelog 대량 보정 50% 기준 미기록 (v1.2) | 매핑 보정이 가짜 변동으로 남는 것 방지 | — Pending (업계 일괄 인하 시 재검토) |
| fee-history는 CI 단독 writer, pre-commit 동기화 없음 (v1.3) | 로컬 hook이 운영본으로 덮어쓰는 문제 회피 | ✓ Good |
| backfill 재기준화는 감지 기반만, 하드코딩 삭제 없음 (v1.3) | 05-27 오류는 그날 마지막 커밋 규칙으로 제거, 정상 이력 보존 | ✓ Good |
| 차트는 계단형 대신 monotone 곡선 (v1.3) | 사용자 디자인 선호; 오버슈트 없음, 정확한 날짜는 내역 리스트 | ✓ Good |
| changelog 정리는 CI에서 멱등 실행 (v1.2) | pre-commit hook이 운영본으로 덮어써 로컬 편집 무효 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-30 — v1.4 milestone started*
