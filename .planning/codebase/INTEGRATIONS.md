# 외부 연동

**분석일:** 2026-04-07

## API 및 외부 서비스

**금융 데이터:**
- KOFIA (한국금융투자협회) — ETF 수수료 비교 데이터
  - 방식: Selenium WebDriver를 이용한 웹 스크래핑
  - URL: `https://dis.kofia.or.kr/websquare/index.jsp?w2xPath=/wq/fundann/DISFundFeeCMS.xml&divisionId=MDIS01005001000000&serviceId=SDIS01005001000`
  - 연동 위치: `etl_process.py` (51~132번째 줄)
  - 실행 주기: GitHub Actions를 통해 매일
  - 수집 데이터: 펀드 수수료(총보수, 기타비용, 매매중개수수료)가 담긴 Excel 파일

**Google 서비스:**
- Google Sheets API (Google Apps Script Web App 경유)
  - SDK/클라이언트: Google Apps Script `gas_script_v2.js`
  - Web App URL: `etl_process.py` 18번째 줄 (`GAS_WEB_APP_URL`)에 설정
  - 인증: URL 기반 접근 (공개 Web App이므로 토큰 불필요)
  - 엔드포인트:
    - GET `?action=getItems` — 관리 ETF 목록 조회
    - POST (JSON 페이로드) — 수수료 계산 결과 업데이트 (선택적 백업)
  - 용도: ETF 목록 및 수수료 계산의 중앙 데이터 관리

- Google Analytics 4
  - 연동 위치: `script.js` 1081번째 줄
  - 방식: gtag 전역 함수 호출
  - 추적 이벤트: 카테고리 파라미터를 포함한 `page_view_custom`
  - 용도: 사용자 행동 분석 및 페이지 트래킹

- Google AdSense
  - 연동 위치: `index.html` 153번째 줄
  - 클라이언트 ID: `ca-pub-7540201129051567`
  - 스크립트: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`
  - 용도: 광고를 통한 수익화

- Google Fonts API
  - 연동 위치: `index.html` 150번째 줄
  - 폰트: Outfit (굵기 300, 400, 500, 600, 700, 800)
  - 용도: 타이포그래피

## 데이터 저장소

**주요 데이터 원천:**
- KOFIA Excel 다운로드 — 외부 금융 데이터 원천
  - Selenium 자동화로 매일 다운로드
  - ETL 처리 중 임시 저장
  - 처리 완료 후 정리 (`etl_process.py` 379~382번째 줄)

**데이터 파일 (로컬 JSON):**
- `data.json` — 처리된 ETF 수수료 비교 데이터
  - 구조: 구분, 종목코드, 종목명, 총보수, 기타비용, 매매중개수수료, 실부담비용 필드를 가진 객체 배열
  - ETL 파이프라인을 통해 매일 업데이트
  - 프론트엔드에 `/data.json`으로 직접 제공

- `changelog.json` — 수수료 변경 이력
  - `scripts/build_changelog.py`로 생성
  - 현재 `data.json`을 이전 Git 버전과 비교
  - 변경 추적 항목: 총보수, 기타비용, 매매중개수수료, 실부담비용

- `update-meta.json` — ETL 실행 메타데이터
  - 구조: {updatedAt, updatedAtIso, timezone, status}
  - ETL 실행 성공 시마다 업데이트
  - 타임존: Asia/Seoul (KST)

**데이터베이스:**
- Google Sheets (관리 종목 목록)
  - 시트명: "종목관리"
  - 컬럼: 구분, 종목코드, 종목명, 표준코드, 펀드명
  - 클라이언트: Google Apps Script Web App
  - 연결 방식: `requests` 라이브러리를 통한 HTTP GET/POST

**파일 저장소:**
- 로컬 파일시스템만 사용
- 프로젝트 루트에 모든 데이터 파일 저장
- GitHub 저장소가 버전 관리 스토리지 역할

**캐싱:**
- 브라우저 캐시 헤더: 모든 동적 fetch에 `cache: "no-store"` 적용
  - `script.js` (237, 611, 642, 978번째 줄)
  - 업데이트 중 오래된 데이터 표시 방지

## 인증 및 보안

**Google Apps Script Web App:**
- 인증: 불필요 (URL 기반 접근의 공개 Web App)
- 보안 모델: URL 비공개 (Web App URL 자체가 접근 제어)
- API 키 또는 토큰 미사용

**Google Sheets 접근:**
- 자격 증명: 공개 Web App에는 불필요
- 서비스 계정: 미사용

**사용자 인증 없음:**
- 공개 서비스
- 사용자 계정 또는 로그인 시스템 없음
- 익명 접근만 허용

## 모니터링 및 관찰성

**에러 추적:**
- `script.js`의 콘솔 로깅 (데이터 fetch 실패 시 에러 로그, 634번째 줄)
- Selenium 에러 발생 시 스크린샷 저장: `selenium_error.png` (`etl_process.py` 126번째 줄)
- 외부 에러 추적 서비스 미감지

**로그:**
- Python ETL 로그: `print()` 구문을 통한 콘솔 출력
  - GitHub Actions CI 로그에서 워크플로우 실행 결과 확인 가능
  - Selenium 동작, 데이터 매칭, 처리 단계 상세 로깅

- 프론트엔드 로그: 브라우저 콘솔 로그
  - 지속적인 프론트엔드 로깅 시스템 없음

- 서버/애플리케이션 로그: 없음 (정적 호스팅)

**모니터링 데이터:**
- 마지막 업데이트 추적을 위해 `update-meta.json`에 메타데이터 저장
- GitHub 커밋 이력이 데이터 변경 감사 기록 역할

## CI/CD 및 배포

**호스팅:**
- GitHub Pages (Git 기반 배포 모델에서 추론)
- 정적 파일 호스팅 호환
- 커스텀 도메인: `etfsave.life` (CNAME 파일에 설정)

**CI 파이프라인:**
- GitHub Actions: `.github/workflows/daily_update.yml`
  - 트리거: 매일 UTC 00:00 (KST 09:00)
  - 수동 트리거: workflow_dispatch 지원
  - 실행 단계:
    1. 코드 체크아웃
    2. Python 3.9 설치
    3. 의존성 설치 (pip install)
    4. `python etl_process.py` 실행
    5. `python scripts/build_changelog.py`로 변경 이력 생성
    6. `git-auto-commit-action`으로 변경사항 자동 커밋
  - 업데이트 파일: `data.json`, `changelog.json`, `update-meta.json`

**배포:**
- 자동 커밋을 통한 Git 기반 배포
- ETL 성공 시 자동으로 변경사항 push
- 수동 배포 단계 불필요

## 웹훅 및 콜백

**수신 웹훅:**
- 없음

**발신 웹훅:**
- Google Sheets API POST (선택적 백업)
  - 엔드포인트: `GAS_WEB_APP_URL` (Google Apps Script Web App)
  - 방식: 계산된 수수료 데이터를 포함한 JSON 페이로드 POST
  - 용도: 백업 데이터 동기화 (`etl_process.py` 346번째 줄)
  - 상태: 선택적 — 성공 여부 로깅되지만 파이프라인에 필수는 아님

## 환경 설정

**필수 환경 변수:**
- 프론트엔드: 없음
- 저장소에 `.env` 파일 없음

**하드코딩된 설정:**
- `etl_process.py` 18번째 줄에 Google Apps Script Web App URL
- `etl_process.py` 59번째 줄에 KOFIA 웹사이트 URL
- GitHub Actions 워크플로우에 업데이트 스케줄 (매일 UTC 00:00)

**잠재적 설정 문제:**
- GAS URL 하드코딩 (보안을 위해 환경 변수로 이동 필요)
- Selenium Chrome 옵션 하드코딩 (설정 파일 없음)
- 다운로드 디렉토리 기본값이 현재 작업 디렉토리

## CORS 및 크로스 오리진

**CDN 리소스:**
- Google Fonts API: `https://fonts.googleapis.com`
- Font CDN (Pretendard): `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9`
- Google AdSense: `https://pagead2.googlesyndication.com`
- Google Analytics: gtag 전역 함수를 통해 연동

**정적 에셋 호스팅:**
- 모든 에셋 (CSS, JS, HTML, JSON, 이미지)이 동일 오리진에서 제공
- 핵심 기능을 위한 서드파티 호스팅 외부 의존성 없음

---

*연동 감사: 2026-04-07*
