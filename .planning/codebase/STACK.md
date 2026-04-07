# 기술 스택

**분석일:** 2026-04-07

## 언어

**주요 언어:**
- JavaScript (바닐라) — 클라이언트 사이드 UI 및 애플리케이션 로직
- Python 3.9 — 백엔드 ETL 파이프라인 (데이터 처리)
- CSS 3 — 스타일링 및 비주얼 디자인 (글래스모피즘 테마)
- HTML 5 — 마크업 구조

**보조 언어:**
- Google Apps Script — Google Sheets API 연동 (데이터 관리)

## 런타임

**실행 환경:**
- 브라우저 환경 (Chrome/최신 브라우저) — 프론트엔드
- Python 3.9 — ETL/백엔드 처리
- GitHub Actions (Ubuntu 최신) — CI/CD 자동화

**패키지 매니저:**
- pip (Python) — 주요 의존성 관리자
- 잠금 파일 없음 (requirements.txt에 버전 미지정 — 재현성 문제 가능성)

## 프레임워크

**프론트엔드:**
- 바닐라 JavaScript (프레임워크 없음) — 경량, 의존성 없는 프론트엔드
- CSS Grid/Flexbox — 레이아웃 시스템
- Web API (Fetch API) — HTTP 통신

**백엔드/데이터 처리:**
- Selenium (WebDriver) — KOFIA 데이터 다운로드를 위한 웹 스크래핑 자동화
- pandas — 데이터 조작 및 Excel 처리
- openpyxl — Excel 워크북 조작
- BeautifulSoup4 — HTML 파싱 (의존성 존재하나 실제 사용 여부 불명확)

**테스트:**
- 감지되지 않음

**빌드/개발:**
- GitHub Actions — CI/CD 워크플로우 자동화
- webdriver-manager — ChromeDriver 버전 관리

## 주요 의존성

**핵심:**
- `selenium` (6.0+) — KOFIA 웹사이트에서 ETF 데이터 자동 다운로드
- `pandas` (1.0+) — 수수료 계산을 위한 핵심 데이터 처리
- `requests` — Google Sheets API 및 외부 서비스 HTTP 요청
- `openpyxl` — KOFIA 원본 Excel 파일 읽기/쓰기
- `webdriver-manager` — Selenium ChromeDriver 생명주기 관리

**인프라:**
- `lxml` — BeautifulSoup4용 XML/HTML 파싱 지원
- `xlrd` — 구형 Excel 파일 읽기 지원
- `beautifulsoup4` — HTML 파싱 (의존성 존재, 실제 사용 여부 불명확)

## 설정

**환경:**
- 소스 코드 내 하드코딩 상수로 설정 관리
- Google Sheets Web App URL은 `etl_process.py` 18번째 줄에 설정
- 로컬 개발용 `.env` 파일 미감지 (제한 사항)

**빌드:**
- GitHub Actions 워크플로우: `.github/workflows/daily_update.yml`
  - 매일 UTC 00:00 (KST 09:00) 스케줄 실행
  - workflow_dispatch를 통한 수동 실행 지원
  - Python 버전 3.9로 고정
  - requirements.txt에서 모든 의존성 설치

## 데이터 흐름

**ETL 파이프라인 (`etl_process.py`):**
1. Selenium WebDriver로 KOFIA 웹사이트에서 Excel 파일 다운로드
2. Google Apps Script API로 Google Sheets에서 관리 ETF 목록 가져오기
3. Excel 파싱 후 표준코드 기준으로 관리 종목과 매칭
4. 수수료 계산: 총보수 + 기타비용 + 매매중개수수료 = 실부담비용
5. 처리된 데이터를 `data.json`으로 저장
6. 업데이트 메타데이터를 `update-meta.json`에 기록
7. Google Sheets API로 데이터 POST (선택적 백업)
8. 임시 Excel 파일 정리

**프론트엔드 데이터 흐름:**
1. 사용자 언어 설정에 따라 `/i18n/{lang}.json`에서 번역 데이터 로드
2. `/data.json` (정적 파일)에서 ETF 데이터 가져오기
3. `/changelog.json`에서 변경 이력 가져오기
4. `/update-meta.json`에서 업데이트 메타데이터 가져오기
5. ETF 카테고리에 따라 테이블 및 필터 뷰 렌더링
6. Google Analytics 4로 분석 이벤트 전송 (gtag 사용)

## 호스팅 및 플랫폼

**정적 호스팅:**
- 정적 사이트로 배포 가능 (GitHub Pages 호환)
- 모든 데이터는 JSON 파일로 제공 (백엔드 서버 불필요)
- 파일 기반 데이터 저장: `data.json`, `changelog.json`, `update-meta.json`

**외부 API:**
- Google Sheets API (Google Apps Script Web App 경유)
- KOFIA (한국금융투자협회) — ETF 수수료 데이터 원천
- Google Analytics 4 — 사용자 트래킹 및 분석
- Google AdSense — 광고 플랫폼

## 개발 환경

**필수 요건:**
- Python 3.9 이상
- Chrome/Chromium 브라우저 (Selenium 자동화용)
- Git (버전 관리)
- GitHub 계정 (Actions CI/CD용)
- Google Sheets 접근 권한 (관리 종목 목록용)

**설치:**
```bash
python -m pip install --upgrade pip
pip install pandas selenium webdriver-manager requests openpyxl xlrd beautifulsoup4 lxml
```

## 운영 요구사항

**배포:**
- 정적 파일 호스팅 (GitHub Pages, Vercel, Netlify 등)
- 예약 Python 실행 환경 (GitHub Actions 또는 대체 크론 서비스)
- Google Apps Script Web App이 활성화된 Google Sheets

**유지보수:**
- GitHub Actions를 통한 매일 ETL 실행 (스케줄 조정 가능)
- 수동 실행 기능 (임시 업데이트용)
- Git 저장소에 데이터 파일 커밋

## 다국어 지원

**지원 언어:** 8개
- 한국어 (ko) — 기본값
- 베트남어 (vi)
- 중국어 간체 (zh)
- 영어 (en)
- 일본어 (ja)
- 태국어 (th)
- 타갈로그어/필리핀어 (tl)
- 크메르어 (km)

**번역 구조:**
- `i18n/` 디렉토리의 JSON 기반 번역 파일: `{lang}.json`
- URL 쿼리 파라미터 또는 브라우저 설정에서 런타임 언어 감지
- DOM 요소에 `data-i18n` 속성으로 키 매핑

---

*스택 분석: 2026-04-07*
