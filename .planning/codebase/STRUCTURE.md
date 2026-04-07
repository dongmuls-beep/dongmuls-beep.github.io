# 코드베이스 구조

**분석일:** 2026-04-07

## 디렉토리 레이아웃

```
ETF비교사이트/
├── .claude/                    # Claude Code 프로젝트 설정 (StoryForge)
├── .github/
│   └── workflows/
│       └── daily_update.yml    # GitHub Actions ETL 트리거
├── .planning/
│   └── codebase/               # 코드베이스 분석 문서들
├── .githooks/                  # Git 훅 (pre-commit 등)
├── scripts/                    # Python 유틸리티 스크립트
│   ├── build_changelog.py      # git 이력으로 changelog.json 생성
│   └── sync_server_changelog.py # 서버 변경 이력 동기화 (레거시)
├── i18n/                       # 다국어 번역 파일
│   ├── ko.json                 # 한국어 (기본 언어)
│   ├── en.json                 # 영어
│   ├── vi.json                 # 베트남어
│   ├── zh.json                 # 중국어
│   ├── ja.json                 # 일본어
│   ├── th.json                 # 태국어
│   ├── tl.json                 # 타갈로그어
│   └── km.json                 # 크메르어
├── icon/                       # 파비콘 및 아이콘
│   ├── etfsave_favicon_*.png   # 파비콘 (16x16, 32x32, 48x48, 180x180, 192x192, 512x512)
│   └── etfsave_favicon_trimmed.ico # 멀티해상도 파비콘
├── indices/                    # 지수별 가이드 페이지
│   ├── sp500/                  # S&P500 지수 가이드
│   ├── nasdaq100/              # 나스닥100 지수 가이드
│   ├── kospi200/               # KOSPI200 지수 가이드
│   └── kosdaq150/              # KOSDAQ150 지수 가이드
├── isa/                        # ISA 절세 계좌 가이드 페이지
│   └── index.html
├── pension/                    # 연금저축 & IRP 가이드 페이지
│   └── index.html
├── guide/                      # 사이트 이용 가이드
│   └── index.html
├── fomo/                       # FOMO 분석 페이지
│   └── index.html
├── methodology/                # 방법론 문서
├── changelog/                  # 변경 이력 페이지 (자동 생성)
├── data.json                   # 주요 데이터 원천 (ETF 목록 + 수수료)
├── update-meta.json            # 메타데이터: 마지막 업데이트 시간, 타임존, 상태
├── index.html                  # 홈 페이지 (주요 진입점)
├── script.js                   # 프론트엔드 애플리케이션 로직 (전체 페이지)
├── style.css                   # 전역 스타일 (반응형, 글래스모피즘, 다크 테마)
├── translations.js             # 레거시 번역 객체 (사용 중단, i18n/*.json으로 대체됨)
├── etl_process.py              # 백엔드 ETL: KOFIA 스크래퍼, 수수료 계산기, 데이터 업데이터
├── requirements.txt            # Python 의존성
├── gas_script_v2.js            # Google Apps Script Web App (종목 관리 GET/POST API)
├── site.webmanifest            # PWA 매니페스트
├── robots.txt                  # 검색 엔진 크롤러 지시문
├── sitemap.xml                 # SEO 사이트맵
├── CNAME                       # 커스텀 도메인: etfsave.life
├── deployment_guide.md         # 배포 및 운영 문서
├── google_sheets_setup.md      # Google Sheets + GAS 설정 가이드
├── PROJECT_STRUCTURE.md        # 프로젝트 개요 (ARCHITECTURE.md/STRUCTURE.md로 대체됨)
├── 사이트계획서.md             # 초기 사이트 기획 문서
└── changelog.json              # 자동 생성 변경 이력 (ETF 수수료 변경 사항)
```

## 디렉토리 설명

**`.claude/`:**
- 목적: 프로젝트 수준 Claude Code 설정 및 StoryForge 워크플로우
- 내용: CLAUDE.md, StoryForge 사용 시 칸반 파일

**`.github/workflows/`:**
- 목적: GitHub Actions 자동화 설정
- 내용: ETL 파이프라인 트리거 daily_update.yml

**`.planning/codebase/`:**
- 목적: GSD 코드베이스 매핑 결과물 (분석 문서)
- 내용: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, INTEGRATIONS.md, STACK.md

**`scripts/`:**
- 목적: CI/CD 및 데이터 처리용 Python 유틸리티 스크립트
- 내용: `build_changelog.py` (git 커밋으로 changelog.json 생성)

**`i18n/`:**
- 목적: 다국어 지원
- 내용: 8개 언어 JSON 파일 (ko, en, vi, zh, ja, th, tl, km)
- 구조: 번역 문자열을 담은 키-값 객체
- 예시: `ko.json` → `{ "nav_home": "메인", "isa_hero_title": "ISA(중개형) 절세 가이드", ... }`

**`icon/`:**
- 목적: 파비콘 및 브랜딩 에셋
- 내용: PNG 파비콘 (다양한 크기), ICO 파일
- 크기: 16x16, 32x32, 48x48, 180x180, 192x192, 512x512

**`indices/`:**
- 목적: 지수별 교육/가이드 콘텐츠
- 내용: sp500, nasdaq100, kospi200, kosdaq150 서브디렉토리
- 생성 여부: 아니오 (정적 콘텐츠)

**`isa/`, `pension/`, `guide/`, `fomo/`:**
- 목적: 사용자 유형별 특화 가이드 페이지
- 내용: 디렉토리당 단일 index.html
- 패턴: 공통 헤더/네비/푸터 공유, script.js로 인터랙티비티 처리

**`methodology/`:**
- 목적: ETF 수수료 계산 방법론 상세 설명
- 내용: 교육용 콘텐츠 파일

**`changelog/`:**
- 목적: ETF 수수료 변경 이력 표시
- 내용: 부분 자동 생성 (changelog.json 자동 생성, 페이지 구조는 정적)

## 주요 파일 위치

**진입점:**
- `/index.html`: 홈 페이지, ETF 비교 테이블 및 히어로 콘텐츠가 있는 주요 진입점
- `/isa/index.html`: ISA 계좌 가이드 및 비교 테이블
- `/pension/index.html`: 연금저축 & IRP 계좌 가이드 및 비교 테이블
- `/guide/index.html`: 사이트 이용 및 방법론 가이드
- `/fomo/index.html`: FOMO 분석 페이지
- `/changelog/`: 변경 이력 페이지

**애플리케이션 로직:**
- `script.js`: 모든 런타임 동작을 처리하는 마스터 JavaScript 파일
  - 언어 초기화 및 전환
  - 데이터 fetch 및 캐싱
  - 테이블 렌더링 및 필터링
  - 네비게이션 및 라우팅
  - SEO/메타데이터 관리
  - 모달 및 UI 인터랙션
- `style.css`: 반응형 디자인, 글래스모피즘 효과, 다크 테마가 적용된 전역 CSS
- `index.html`, `isa/index.html` 등: 시맨틱 구조, SEO 메타데이터, i18n data 속성이 있는 HTML 템플릿

**설정:**
- `requirements.txt`: Python 의존성 목록
- `.github/workflows/daily_update.yml`: ETL 스케줄 및 실행
- `site.webmanifest`: PWA 설정
- `CNAME`: GitHub Pages 커스텀 도메인 설정

**핵심 로직:**
- `etl_process.py`: 주요 ETL 스크립트
  - `setup_driver()`: Selenium Chrome 드라이버 설정
  - `download_kofia_excel()`: KOFIA 웹사이트 자동화로 Excel 다운로드
  - `fetch_managed_items()`: Google Apps Script에서 종목 목록 조회
  - `process_data()`: Excel 파싱, 종목 매칭, 수수료 계산
  - `update_google_sheets()`: 결과를 data.json에 저장하고 GAS 호출

## 네이밍 규칙

**파일:**
- 루트 HTML: `index.html` (정적 사이트 관례)
- CSS: `style.css` (단일 전역 스타일시트)
- JavaScript: `script.js` (단일 애플리케이션 파일)
- 데이터 파일: `data.json` (소문자, JSON 확장자)
- 설정 파일: `requirements.txt`, `CNAME`, `robots.txt` (메타데이터는 대문자, 요구사항은 소문자)
- Python 스크립트: `snake_case.py` (예: `etl_process.py`, `build_changelog.py`)
- 언어 파일: `{언어코드}.json` (예: `ko.json`, `en.json`)
- 문서: `대문자.md` 또는 `한글제목.md` (혼합 규칙)

**디렉토리:**
- 기능 디렉토리: 소문자 + `/index.html` (예: `/isa/index.html`, `/pension/index.html`)
- 언어 디렉토리: `i18n/` (표준 관례)
- 에셋 디렉토리: `icon/`, `indices/` (소문자, 설명적)
- 설정 디렉토리: 닷파일 (`.github/`, `.planning/`, `.claude/`)
- 스크립트 디렉토리: `scripts/` (복수형)

**HTML 요소:**
- ID: `camelCase` (예: `languageSelect`, `primaryNav`, `tableBody`)
- 클래스: `kebab-case` (예: `.site-header`, `.nav-link`, `.loading-text`)
- data 속성: `kebab-case` (예: `data-i18n`, `data-page`, `data-track-cta`)

**JavaScript 변수:**
- 전역 상수: `대문자_스네이크_케이스` (예: `GAS_API_URL`, `SUPPORTED_LANGS`, `DEFAULT_LANG`)
- 함수: `camelCase` (예: `initApp()`, `fetchData()`, `renderTabs()`)
- 객체: `camelCase` (예: `allData`, `currentLanguage`, `dataKeys`)

**JSON 키:**
- 한국어 필드명: 한글 문자 (예: `구분`, `종목코드`, `종목명`)
- 번역 키: 언어 접두사가 있는 `snake_case` (예: `nav_home`, `isa_hero_title`, `seo_home_title`)

## 새 코드 추가 위치

**새 기능 (예: 새 비교 지표):**
- 주요 코드: `script.js` (함수 추가, 렌더링에 통합)
- 번역: `/i18n/{lang}.json` (8개 언어 모두 키 추가)
- HTML: 해당 페이지에 추가 (홈은 `index.html`, ISA는 `/isa/index.html` 등)
- 스타일: `style.css` (필요한 클래스 추가)
- 예시: 새 수수료 필드 추가 시:
  1. script.js의 `dataKeys` 객체에 추가
  2. data.json 스키마 업데이트
  3. 모든 i18n/*.json 파일에 번역 키 추가
  4. script.js의 테이블 렌더링 업데이트
  5. HTML data-i18n 속성 업데이트

**새 가이드 페이지 (예: `/crypto-etf/`):**
- 템플릿: `/isa/index.html` 또는 `/pension/index.html`에서 복사
- 생성: `crypto-etf/index.html`
- 네비게이션: 모든 페이지 템플릿의 주요 네비에 링크 추가
- 콘텐츠: 새 index.html에 가이드 내용 작성
- 번역: 모든 i18n/*.json에 nav_crypto_etf 및 콘텐츠 키 추가
- 로직: script.js가 data-page 속성으로 페이지 타입 감지

**새 언어 지원 (예: 스페인어):**
- 생성: `/i18n/es.json` (기존 언어 파일 구조 복사)
- 번역: 모든 키 번역 (현재 8개 언어 각각 100개 이상 키)
- 업데이트: script.js 상수:
  - SUPPORTED_LANGS에 "es" 추가
  - LANGUAGE_META에 es 항목 추가
  - HREFLANG_TO_LANG에 매핑 추가
- HTML: 모든 페이지의 언어 선택기에 언어 옵션 추가

**새 ETL 데이터 필드 (예: 배당 수익률):**
- Python: `etl_process.py` 업데이트:
  - process_data()에 컬럼 매핑 추가
  - 수수료 계산 섹션에서 값 추출
  - 결과 딕셔너리에 추가
- 데이터: data.json 스키마에 새 필드 추가
- 프론트엔드:
  - script.js의 dataKeys 객체에 키 추가
  - 테이블 렌더링에 컬럼 추가
  - i18n/*.json에 번역 키 추가

**유틸리티 스크립트 (예: 새 데이터 처리기):**
- 위치: `scripts/` 디렉토리에 생성 (예: `scripts/new_processor.py`)
- 진입: 자동화가 필요하면 `.github/workflows/daily_update.yml`에 단계 추가

## 특수 디렉토리

**`i18n/`:**
- 목적: 8개 언어팩 전체
- 자동 생성: 아니오
- 커밋: 예
- 구조: 각 파일은 번역 키를 담은 평면 JSON 객체

**`indices/`:**
- 목적: 지수 유형별 교육 콘텐츠
- 자동 생성: 아니오 (정적 콘텐츠 디렉토리)
- 커밋: 예
- 패턴: sp500/, nasdaq100/, kospi200/, kosdaq150/ (선택적 index.html 또는 콘텐츠)

**`changelog/`:**
- 목적: ETF 수수료 변경 이력 표시
- 자동 생성: 부분적 (changelog.json 자동 생성)
- 커밋: 예

**`.github/workflows/`:**
- 목적: CI/CD 자동화
- 자동 생성: 아니오 (수동 설정)
- 커밋: 예
- 핵심 파일: daily_update.yml (ETL 트리거)

**`scripts/`:**
- 목적: 처리용 Python 유틸리티 스크립트
- 자동 생성: 아니오
- 커밋: 예
- 실행: GitHub Actions에서 호출하거나 수동 실행

---

*구조 분석: 2026-04-07*
