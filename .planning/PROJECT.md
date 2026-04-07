# ETF 실부담비용 비교 사이트 (etfsave.life)

## What This Is

한국 투자자를 위한 ETF 실부담비용 자동 비교 웹사이트. KOFIA(금융투자협회)에서 매일 자동으로 수수료 데이터를 수집하여 총보수·기타비용·매매중개수수료를 합산한 실부담비용 기준으로 ETF를 비교해준다. GitHub Pages에 정적 사이트로 배포되며 별도 서버 없이 운영된다.

## Core Value

투자자가 ETF 선택 시 숨겨진 비용까지 포함한 실질 부담 비용을 한눈에 비교할 수 있어야 한다.

## Requirements

### Validated

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

- [ ] ETL 설정 환경 변수화 (GAS URL 하드코딩 제거)
- [ ] ETL 안정성 강화 (Selenium 재시도 로직, 에러 처리 개선)
- [ ] 데이터 유효성 검사 레이어 추가 (수수료 범위 검증, 이상치 감지)
- [ ] XSS 취약점 개선 (innerHTML → textContent 전환 및 이스케이프 일관 적용)
- [ ] ETL 단위 테스트 추가 (헤더 감지, 수수료 계산, 데이터 매칭)
- [ ] 모바일 헤더 숨김 글리치 수정

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

---
*Last updated: 2026-04-07 after initial GSD setup*
