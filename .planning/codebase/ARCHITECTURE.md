# 아키텍처

**분석일:** 2026-04-07

## 패턴 개요

**전체 구조:** 자동화된 백엔드 데이터 파이프라인을 갖춘 정적 사이트

**주요 특징:**
- GitHub Pages에 호스팅되는 프레임워크 없는 정적 HTML/CSS/JS 프론트엔드
- GitHub Actions를 통해 매일 자동으로 데이터를 업데이트하는 Python ETL 파이프라인
- 동적 콘텐츠 로딩을 지원하는 8개 언어 다국어(i18n) 시스템
- JSON 데이터 원천으로 클라이언트 사이드에서 테이블 렌더링
- 서버 사이드 로직 없음 — 모든 처리는 클라이언트 사이드 또는 스케줄 배치

## 레이어 구조

**프레젠테이션 레이어:**
- 역할: 사용자에게 ETF 비교 테이블, 가이드 페이지, 교육 콘텐츠 렌더링
- 위치: `index.html`, `/isa/index.html`, `/pension/index.html`, `/guide/index.html`, `/fomo/index.html`
- 내용: SEO 메타데이터, 네비게이션, 데이터 테이블을 갖춘 HTML 템플릿
- 의존: `script.js`, `style.css`, `translations.js`, 언어 JSON 파일
- 사용처: 브라우저 (공개 서비스)

**클라이언트 애플리케이션 레이어:**
- 역할: 언어 전환, 데이터 fetch, 테이블 필터링, 네비게이션, SEO/i18n 런타임 업데이트 처리
- 위치: `script.js` (주요 진입점)
- 내용: 초기화 로직, 언어 관리, 데이터 렌더링 함수, 이벤트 핸들러
- 의존: `data.json`, `/i18n/*.json` 언어팩, `update-meta.json`
- 사용처: 프레젠테이션 레이어 (HTML에서 로드)

**번역/i18n 레이어:**
- 역할: 8개 언어에 걸쳐 UI 및 SEO용 현지화 문자열 제공
- 위치: `/i18n/` 디렉토리 (ko.json, en.json, vi.json, zh.json, ja.json, th.json, tl.json, km.json)
- 내용: 키-값 번역 사전, 언어별 SEO 메타데이터
- 의존: 없음
- 사용처: `script.js` 언어 전환 및 렌더링

**데이터 레이어:**
- 역할: ETF 비교 데이터를 정적 JSON 형식으로 저장
- 위치: `data.json` (주요 데이터 원천), `update-meta.json` (메타데이터)
- 내용: 구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용 필드를 가진 ETF 객체 배열
- 의존: 런타임에 없음
- 사용처: `script.js`에서 fetch()로 가져와 테이블에 표시

**백엔드 ETL 파이프라인:**
- 역할: KOFIA ETF 데이터 자동 수집, 실부담비용 계산, `data.json` 업데이트
- 위치: `etl_process.py` (오케스트레이터), `scripts/build_changelog.py` (변경 이력 생성)
- 내용: Selenium 자동화, pandas 데이터 처리, 수수료 계산 로직
- 의존: KOFIA 공개 웹사이트, Google Apps Script API
- 사용처: GitHub Actions 워크플로우 (매일 스케줄 실행)

**CI/CD 오케스트레이션:**
- 역할: ETL 파이프라인 스케줄 실행 및 결과 저장소 커밋
- 위치: `.github/workflows/daily_update.yml`
- 내용: 스케줄 트리거 (매일 UTC 00:00), Python 환경 설정, 자동 커밋
- 의존: GitHub Actions 환경, Python 3.9+
- 사용처: GitHub 인프라

## 데이터 흐름

**자동 데이터 업데이트 (매일):**

1. GitHub Actions 워크플로우가 UTC 00:00 (KST 09:00)에 트리거
2. `etl_process.py` 실행:
   - Selenium으로 헤드리스 Chrome 설정
   - 최신 KOFIA ETF 수수료 Excel 파일 다운로드
   - Google Apps Script에서 관리 종목 목록 가져오기 (모의 데이터 폴백 포함)
   - 표준코드로 Excel 데이터와 종목 매칭
   - 계산: 총보수 + 기타비용 + 매매중개수수료 = 실부담비용
   - 결과를 `data.json`으로 출력
3. `scripts/build_changelog.py`로 changelog.json 생성
4. Git 자동 커밋이 `data.json`, `changelog.json`, `update-meta.json`을 main 브랜치에 push
5. GitHub Pages가 업데이트된 파일 배포

**사용자 요청 흐름 (실시간):**

1. 브라우저가 `/` 또는 언어별 서브 경로 요청
2. HTML 로드, `DOMContentLoaded` 이벤트 발생
3. `script.js`의 `initApp()` 실행:
   - 레거시 해시 리다이렉트 (`#isa` → `/isa/`)
   - 네비게이션 설정 (햄버거 메뉴, 링크 하이라이트)
   - 스마트 헤더 초기화 (스크롤 기반 가시성)
   - 모달 설정
   - 언어 초기화 (lang 파라미터 감지 → localStorage → 브라우저 언어 → 한국어 폴백)
   - `/i18n/{lang}.json`에서 언어팩 로드
   - 모든 `[data-i18n]` 요소에 번역 적용
   - 페이지에 테이블이 있으면 ETF 테이블 로드 및 렌더링
4. `fetchData()`가 `/data.json`을 fetch해서 탭/테이블 렌더링
5. 사용자 인터랙션: 언어 변경, 카테고리 필터, 코드 복사 등

**상태 관리:**
- `currentLanguage`: 현재 활성 언어 코드 (localStorage에 저장)
- `currentTranslations`: 현재 언어의 로드된 번역 객체
- `allData`: data.json에서 로드된 전체 ETF 배열
- `currentCategory`: 현재 필터링된 카테고리
- `i18nCache`: 로드된 언어팩 Map (재요청 방지)

## 주요 추상화

**데이터 레코드:**
- 역할: 비용 내역을 가진 단일 ETF 표현
- 예시: `data.json` 배열 항목
- 패턴: 한국어 필드명을 가진 평면 객체 (구분, 종목코드, 종목명 등)

**페이지 타입:**
- 역할: 홈, 가이드 페이지, 변경 이력 간의 동작 구분
- 예시: `getPageType()`이 "home", "isa", "pension", "guide", "fomo", "changelog" 반환
- 패턴: body의 `data-page` 속성 또는 pathname으로 결정

**번역 키:**
- 역할: 현지화 조회 키
- 예시: `"nav_home"`, `"isa_hero_title"`, `"seo_home_title"`
- 패턴: `[섹션]_[컴포넌트]_[타입]` 형식, 폴백 체인: 현재 언어 → 영어 → 기본 언어

**브레드크럼:**
- 역할: 네비게이션 계층 표시, schema.org 구조화 데이터 생성
- 예시: `/isa/` 페이지에서 "메인 > ISA 중개형" 표시
- 패턴: `<a href="">` 및 `<span aria-current="page">` 마크업으로 구성

## 진입점

**주요 HTML:**
- 위치: `/index.html`
- 트리거: `https://etfsave.life/` 직접 URL 방문
- 역할: ETF 비교 테이블, SEO 메타데이터, CTA 버튼이 있는 홈 페이지 렌더링

**서브 페이지 템플릿:**
- 위치: `/isa/index.html`, `/pension/index.html`, `/guide/index.html`, `/fomo/index.html`
- 트리거: 네비게이션 클릭 또는 직접 URL
- 역할: 페이지별 콘텐츠, 가이드 패널, SEO 렌더링

**언어별 서브 페이지:**
- 방식: `?lang=en` 쿼리 파라미터로 페이지 이동 없이 언어 전환
- 역할: 언어별 SEO 적용 (제목, 설명, 키워드), 메타 태그 업데이트

**변경 이력 페이지:**
- 위치: `/changelog/index.html` (네비게이션 링크에서 추론)
- 역할: ETF 수수료 변경 이력 표시
- 기능: changelog.json을 타임라인으로 렌더링, 번역 적용

**JavaScript 애플리케이션:**
- 위치: `script.js`
- 트리거: `<script>` 태그로 로드, 모든 페이지에서 실행
- 역할: 모든 런타임 동작 처리

**ETL 프로세스:**
- 위치: `etl_process.py`
- 트리거: GitHub Actions 스케줄 (매일 UTC 00:00)
- 역할: KOFIA 데이터 fetch, 처리, data.json 출력

## 에러 처리

**전략:** 폴백을 통한 점진적 성능 저하

**패턴:**

- **언어 로딩:** 대상 언어팩 로드 실패 시 영어로 폴백, 영어 실패 시 한국어로 폴백, 모두 실패 시 키를 문자열로 반환
- **데이터 fetch:** `/data.json` fetch 실패 시 "데이터를 불러올 수 없습니다" 에러 메시지 표시
- **업데이트 메타데이터:** update-meta.json 로드 실패 시 "마지막 업데이트" 표시 없이 계속 진행
- **ETL 프로세스:** KOFIA 다운로드 실패 시 에러 출력 후 None 반환, process_data가 예외를 잡아 빈 리스트 반환, 모의 데이터로 폴백 종목 제공
- **DOM 요소:** 접근 전 null/undefined 확인 (예: `if (!tbody) return`)
- **Selenium 자동화:** 에러 발생 시 디버깅용 `selenium_error.png` 스크린샷 저장

## 횡단 관심사

**로깅:**
- 프론트엔드: JavaScript 에러에 `console.error()`, `console.warn()` 사용
- 백엔드: `etl_process.py`의 각 단계별 `print()` 구문 (KOFIA 다운로드, 매칭, 계산)

**유효성 검사:**
- 데이터 키 해결 (resolveDataKeys)이 예상 한국어 필드명과 다를 경우 적응
- 수수료 파싱 함수 (p_float)가 퍼센트 기호, 쉼표, 누락 값 처리
- URL 파라미터 유효성 검사 (SUPPORTED_LANGS 화이트리스트)

**인증:**
- 공개 사이트이므로 불필요
- Google Apps Script 엔드포인트는 공개 Web App URL 사용 (인증 없음)
- GitHub Actions는 커밋에 내장 GITHUB_TOKEN 사용

**성능 고려사항:**
- i18nCache Map을 통한 언어팩 캐싱 (재요청 방지)
- 스마트 헤더용 수동(passive) 스크롤 리스너 (비차단)
- 브라우저 캐시를 우회하기 위해 `cache: "no-store"`로 fetch
- 정적 파일 호스팅 (GitHub Pages)이 CDN 배포 처리

**접근성:**
- 버튼 및 네비게이션에 ARIA 레이블 (aria-label, aria-expanded, aria-controls)
- 시맨틱 HTML (nav, main, section, header)
- 키보드 지원 (모달/네비게이션 닫기에 Escape 키)
- [data-i18n] 및 시맨틱 요소를 통한 스크린 리더 지원

---

*아키텍처 분석: 2026-04-07*
