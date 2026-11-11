# Phase 21: 게이트 0 스파이크 - Research

**Researched:** 2026-11-11
**Domain:** 공공데이터포털(금융위) 시세 API 이용조건 판정 + 프런트 스택 결정 (문서 산출물만)
**Confidence:** MEDIUM (라이선스는 공식 페이지 확인, 한도·필드·실호출은 키 필요)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked
- 게이트 0 확인 항목: 이용허락(재배포, 출처 표시, 광고 사이트 사용), 일 호출 한도, basDt 과거 조회 범위, 수정주가, 응답 필드, numOfRows 상한, 날짜 범위 파라미터, serviceKey 인코딩(이중 인코딩 포함).
- 불허이거나 과거 조회 불가면 이후 단계 계획을 멈추고 사용자에게 대안(출시일부터 누적)을 묻는다.
- 영숫자 코드(예: 0026S0) 포함 data.json 59개가 모두 조회되는지 확인.
- 백필 호출량 = 종목 수 x 기간 / 페이지 크기, 실행 시간 추정.
- 프런트: React 18 UMD(버전 고정+SRI) vs 바닐라 JS(compare-chart.js SVG 재사용) 비교 후 결정 기록. 런타임 Babel 금지.
- 분할 ETF로 종가 불연속 확인, 1차는 "미지원" 명시 + 전일 대비 +-40% 경고 방침 검증.
- 서비스키 저장·커밋 금지.

### Claude's Discretion
- 문서 구조, 조사 순서, 임시 호출 스크립트(커밋 안 함). 키 없으면 공개 문서로 확정 가능한 항목 먼저, 실호출 항목은 "키 필요(미확인)".

### Deferred
- Drive 저장·로그인, 59개 밖 전체 ETF, 분배금·분할 보정.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPIKE-01 | 이용허락·한도·basDt·수정주가·필드·인코딩 기록 | 아래 "게이트 0 판정" 표 |
| SPIKE-02 | 59개(영숫자 포함) 조회 확인 | 키 필요, 스크립트 설계 포함 |
| SPIKE-03 | 백필 호출량·시간 | 계산식·시나리오 |
| SPIKE-04 | 스택 결정 | 비교표 + 권고 |
| SPIKE-05 | 분할 ETF 불연속 | 키 필요, 후보 선정 방법 |
</phase_requirements>

## Summary

**핵심 발견 (게이트 0 위험 신호):** 두 후보 API 모두 data.go.kr 공식 페이지에 **공공누리 제4유형(출처표시, 상업적 이용금지, 변경금지)** 으로 표기되어 있고, "제3자 제공 및 재배포는 상업적 목적과 관계없이 엄격히 금지"라고 적혀 있다. 이 프로젝트 계획은 종가를 정적 JSON으로 커밋해 사이트(GitHub Pages)에서 공개 배포하는 것이므로 **재배포 금지 조항과 직접 충돌할 가능성이 높다**. 또한 같은 페이지에 "가공을 통한 독창적 저작물 생산, 제3자 방문·가입을 통한 간접 수익 창출"은 허용된다는 문구가 상업 이용 설명에 있으나, 이는 KRX Data Marketplace 유료 구매 경로의 설명으로 읽힌다(해석 모호, 확정 불가). 사이트에 AdSense가 있어 상업성 판단도 걸린다(다만 SAFE-02상 /portfolio/ 페이지에는 광고 미게재).

**ETF 전용 API 존재:** 금융위_증권상품시세정보(15094806, `GetSecuritiesProductInfoService_V2`)의 operation "ETF시세"를 쓴다. 주식시세정보(15094808)는 주식·수익증권·신주인수권 위주로 ETF 용도가 아니다. ETF 전용은 NAV(`beginNav/endNav`)·기초지수 필터도 있다.

**권고:** SPIKE-01 판정은 "조건부 불확실 - 재배포 금지 문구로 인해 계획 정지 권고". 계획 문서에 사용자 결정 항목(대안: 출시일부터 누적은 동일 데이터 재배포 문제를 해결하지 못함 -> 오히려 (a) KRX Data Marketplace 유료/약정 문의, (b) 서버리스 프록시로 사용자 브라우저에서 호출하지 않고 재배포 없이 가공값만 노출하는 설계 검토, (c) 다른 데이터 소스, (d) 기능 중단)을 올린다. 단 이 결정은 사용자에게 가므로 플랜은 "문서 판정 + 사용자 체크포인트"로 구성한다.

**Primary recommendation:** 플랜 1개는 공개문서 근거 정리 + 라이선스 충돌 판정 + 사용자 체크포인트, 키가 생기면 실호출 항목(SPIKE-02/03/05, 한도, basDt 범위, numOfRows, 필드)을 임시 스크립트로 채운다. 라이선스가 불허면 SPIKE-03..05는 보류.

## 게이트 0 판정 표 (SPIKE-01)

| 항목 | 확인된 내용 | 상태 |
|------|-------------|------|
| 이용허락 | 공공누리 4유형: 출처표시 / 상업이용 금지 / 변경금지. 제3자 제공·재배포 금지(상업 여부 무관). 상업 이용은 KRX Data Marketplace 유료 [CITED: data.go.kr/data/15094806/openapi.do, data.go.kr/data/15094808/openapi.do] | 충돌 가능성 높음 |
| 라이선스 상충 표기 | 검색 스니펫에는 "제한 없음"으로 보였으나 페이지 본문은 4유형. 페이지 본문 우선, 포털에서 직접 재확인 필요 | 원문 재확인 필요 |
| 일 호출 한도 | 페이지에 미기재. 유사 금융위 API 목록은 개발계정 10,000/일, 운영계정은 활용사례 등록 시 증량 [CITED: 검색 결과, 다른 API 기준] | 이 API는 미확인(키·신청 화면 필요) |
| basDt 과거 범위 | 미기재 | 키 필요 |
| 날짜 범위 | `beginBasDt`/`endBasDt`, `basDt`, `likeBasDt` 지원 [CITED: 공식 요청 파라미터] | 확인(파라미터), 상한 일수는 미확인 |
| 종목 필터 | `likeSrtnCd`(단축코드 부분일치), `isinCd`, `itmsNm` | 확인(파라미터) |
| 응답 필드 | 공식 페이지에는 header/body만. 종가 `clpr`, 등락 `vs/fltRt`, 시가 `mkp`, 고저 `hipr/lopr`, 거래량 `trqu`, NAV `nPptTotAmt`/`nav` 등은 [ASSUMED] (타 문서 관례) | 키로 실응답 확인 |
| numOfRows 상한 | 미기재. 관례상 큰 값 허용되나 [ASSUMED] | 키 필요 |
| 수정주가 | 언급 없음 -> 분할 시 불연속(원시 종가)로 가정 [ASSUMED] | SPIKE-05 실데이터 |
| 갱신 시점 | 기준일 영업일 +1 오후 1시 이후. 당일 조회는 totalCount 0 가능 [CITED: 공식 페이지; 보조: 커뮤니티 MCP 문서] -> 일일 수집은 최근 행 있는 날로 폴백 | 확인 |
| serviceKey 인코딩 | 공식 페이지에 미기재. 흔한 함정: 포털이 주는 "Encoding"키를 requests `params=`에 넣으면 이중 인코딩 -> `SERVICE_KEY_SERVICE_ERROR`. Decoding 키를 `params`로 쓰거나 Encoding키는 URL 문자열에 직접 붙임 [ASSUMED, 널리 알려진 이슈] | 키로 둘 다 시험 |
| 응답 형식 | `resultType=json` 지원 [CITED] | 확인 |

## SPIKE-02: 영숫자 코드

- data.json 구조는 한국어 키(`종목코드`, `종목명`, `총보수` 등)의 리스트, 59개 [VERIFIED: 코드베이스]. 콘솔 인코딩이 깨져 보이니 스크립트는 `encoding="utf-8"`로 읽고 `python -I`.
- 영숫자 코드 예 `0026S0`은 신형 단축코드. API는 `srtnCd`(단축코드, 종종 `A` 접두 없이 6자리)와 `isinCd`(KR7...)를 반환한다. 조회는 `likeSrtnCd=<code>` + `beginBasDt`로 하고, 응답 `srtnCd` 정확 일치로 필터한다 (부분일치 오탐 방지). 확정은 키 필요.
- 산출: 59개 x (조회됨/미조회/응답 코드 표기) 표, 표기 규칙(대문자 6자, 접두 A 여부) 기록.

## SPIKE-03: 백필 계산 (가정치, 키 확인 전)

- 5년 ≈ 1,240 영업일. 시나리오 A(종목별, beginBasDt~endBasDt): 59 x ceil(1240/P). P=1000이면 59x2=118 호출, P=100이면 59x13=767. 호출당 0.3~1초 가정 -> 1~13분. 모두 개발계정 10,000/일 이내.
- 시나리오 B(일자별 전체 ETF, ~1,000종목/일): 1,240일 x ceil(~1000/P) 호출 = 1,240~12,400. P 상한에 크게 좌우되므로 A 권고.
- 일일 증분: 59개 종목은 `basDt=전영업일` 한 번 + 페이지(전체 ETF 약 1000개)이거나 종목별 59호출. 둘 다 한도 내.
- 실측 필요: 실제 P 상한, 응답 시간, 429/오류 코드.

## SPIKE-04: 프런트 스택

| 기준 | 바닐라 JS (권고) | React 18 UMD + SRI |
|------|------------------|---------------------|
| 기존 스택 정합 | 빌드 없음, 전 페이지 바닐라 [VERIFIED: 코드베이스] | 첫 외부 JS CDN 의존 도입 |
| 차트 | `compare-chart.js`(402줄, 순수 SVG) 재사용 | 어차피 SVG 필요, 재사용 가능하나 래핑 |
| 테스트 | CI는 `tests/compare_*_check.js`, `a11y_*_check.js` 글롭 + `node tests/fee_chart_check.js`로 node 직접 실행 [VERIFIED: daily_update.yml] | DOM 테스트 부담 증가 |
| 의존/보안 | 없음 | UMD 버전 고정+SRI, 공급망 |
| i18n/a11y | 기존 패턴 그대로(live region, 8개 언어 JSON) | 동일 패턴 재구현 |
| 폼 복잡도 | 행 목록 입력은 바닐라로 충분 | 장점은 상태 관리 편의뿐 |

결정 권고: **바닐라 JS**. 사용자가 React를 요청했던 이력(SEED 8번)은 근거와 함께 "미채택"으로 기록하고, 사용자 확인 항목으로 올린다(사용자가 React를 명시 요청했으므로 최종은 사용자 결정).

## SPIKE-05: 분할 ETF

- 후보 선정: 키 확보 후 59개 종목의 5년 종가에서 일간 변동률 절대값 > 30%(또는 `fltRt` 필드 대비 `clpr` 연속성 불일치)를 스캔해 찾는다. 공개 문서만으로는 특정 종목명을 단정하지 않는다 [미확인].
- 검증: (1) 분할일 전후 `clpr` 단차 존재 여부 = 수정주가 여부, (2) API `vs/fltRt`가 보정된 값인지, (3) CALC-06 경고 임계 +-40%가 분할(예 2:1은 -50%, 5:1은 -80%)을 잡는지. 2:1 분할(-50%)은 40% 임계로 잡히나 3:2(-33%)는 놓침 -> 임계 판단은 문서화.
- 59개에서 분할 사례가 없으면 59개 밖 분할 ETF 1개를 별도로 조회해 방침만 검증(범위 밖 종목 조회는 스파이크 목적에 한함).

## Architecture / 산출물 구성 (플랜용)

- 산출: `.planning/phases/21-spike/21-SPIKE.md`(판정 문서). 제품 코드 변경 없음. 임시 스크립트는 scratch 디렉터리에 두고 커밋 금지.
- 키 취급: 환경변수 `DATA_GO_KR_KEY`로만 읽기, 출력·로그에서 URL의 serviceKey 마스킹, 문서에 값 기록 금지.
- 흐름: 공개문서 판정 -> (라이선스 충돌이면) 사용자 체크포인트 -> 키 있으면 실호출(인코딩 2종, 59개 조회, 범위/페이지 상한, 분할 스캔) -> 판정 문서.

### 임시 스크립트 스케치
```python
# scratch only, 커밋 금지. 키는 env, 로그에 URL 출력 금지
import os, requests
key = os.environ["DATA_GO_KR_KEY"]  # Decoding 키를 params로 (이중 인코딩 회피)
base = "https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo"  # [ASSUMED] 경로, 포털 명세로 확인
r = requests.get(base, params={"serviceKey": key, "resultType": "json",
    "likeSrtnCd": "360200", "beginBasDt": "20210101", "endBasDt": "20211231", "numOfRows": 1000}, timeout=30)
```
(페이지는 주소에 `_V2`가 표기되므로 실제 엔드포인트 경로는 포털 "참고문서"/Swagger에서 확인 필요.)

## Don't Hand-Roll

| 문제 | 만들지 말 것 | 대신 |
|------|--------------|------|
| 이중 인코딩 진단 | 임의 URL 조작 | Encoding/Decoding 키 2종으로 동일 호출 비교 |
| 라이선스 해석 | 낙관적 해석 | 포털 원문 인용 + 사용자 결정 |
| 분할 보정 | 자체 보정 로직 | 1차 "미지원" + 경고 (Out of Scope) |

## Common Pitfalls

- **재배포 금지 무시:** 정적 JSON 커밋 = 재배포. 라이선스 확인 전 PRICE 단계 진행 금지.
- **이중 인코딩:** `SERVICE_KEY_IS_NOT_REGISTERED`/`SERVICE_KEY_SERVICE_ERROR`. 신규 키는 동기화에 수 시간 지연 가능 [ASSUMED].
- **당일 데이터 없음:** 오후 1시 이후 +1영업일 갱신.
- **부분일치 오탐:** `likeSrtnCd`는 부분일치, 정확 일치 후필터.
- **콘솔 인코딩:** Windows에서 data.json 한글 깨짐, utf-8 명시.
- **응답 단건 vs 배열:** XML->JSON 변환 API는 결과 1건일 때 `item`이 객체일 수 있음 [ASSUMED].

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| data.go.kr 서비스키 | SPIKE-01 일부, 02, 03, 05 | 미확인 (사용자 발급·활용신청 필요) | 공개문서 판정만 |
| python 3 + requests | 임시 스크립트 | 사용 가능(레포 requirements.txt/pytest 사용) | — |
| node | 스택 비교 테스트 | CI에서 사용 | — |

**키 없이는 막히는 것:** 실호출 전 항목 전부. 활용신청 승인은 통상 자동/즉시 [ASSUMED].

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | pytest (`pytest tests/ -v`) + node 체크 스크립트 (`tests/*_check.js`) [VERIFIED: daily_update.yml] |
| Phase 테스트 | 문서 산출물뿐이라 자동 테스트 없음 |

- SPIKE-01~05는 문서 검증: 21-SPIKE.md에 각 항목 상태(확인/키 필요/불허)와 근거 URL이 있는지 체크리스트로 확인. Wave 0 갭 없음.

## Security Domain

| ASVS | 적용 | 통제 |
|------|------|------|
| V2/V3/V4 | 아니오 | — |
| V6/시크릿 | 예 | 키는 env/GitHub secret, 파일·로그·문서 금지, URL 마스킹 |

위협: serviceKey가 URL 쿼리로 로그·예외에 노출 -> 마스킹, `.gitignore`에 scratch 제외. 안전한 호출 전 `git status`로 키 파일 미추적 확인.

## Assumptions Log

| # | Claim | Risk if Wrong |
|---|-------|---------------|
| A1 | 응답 필드명(clpr 등) | 낮음, 실호출로 확정 |
| A2 | 수정주가 아님(원시 종가) | 분할 처리 방침 영향 |
| A3 | Encoding키 이중 인코딩 오류 패턴 | 낮음, 2종 시험 |
| A4 | 엔드포인트 경로 `/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo` | 낮음 |
| A5 | numOfRows 큰 값 허용 | 백필 호출량 변동 |
| A6 | 활용신청 승인 즉시 | 일정 |
| A7 | 4유형 문구 해석(재배포 금지가 정적 JSON 공개에 해당) | **높음 - 사용자·KRX 문의로 확정** |

## Open Questions

1. 정적 JSON 공개가 "재배포 금지"에 해당하는가, 광고 사이트(AdSense, 다른 페이지)가 "상업 이용"인가? 포털 원문 재확인 + KRX/금융위 문의. 사용자 결정 필요.
2. 서비스키 발급 가능 여부(사용자).
3. 대안 소스(KRX Data Marketplace 유료, 네이버 등)는 이번 범위 밖이므로 사용자에게 선택지로만 제시.

## Sources

### Primary (HIGH)
- https://www.data.go.kr/data/15094806/openapi.do (증권상품시세정보: 4유형, ETF시세 operation, 파라미터)
- https://www.data.go.kr/data/15094808/openapi.do (주식시세정보: 4유형, 파라미터, 갱신 시점)
- 코드베이스: data.json, compare-chart.js, .github/workflows/daily_update.yml

### Secondary (MEDIUM / LOW)
- https://www.data.go.kr/dcat/metadata/15094806 (검색 스니펫에서 "제한 없음"으로 표기, 본문과 상충; 직접 fetch는 타임아웃)
- https://glama.ai/mcp/servers/dohhmtvslm (비공식, 당일 totalCount 0 사례)
- 금융위 다른 API 목록(개발 10,000/일 사례)

## Metadata

**Confidence:** 라이선스 MEDIUM-HIGH(공식 페이지 2건 일치, 메타데이터 상충 1건), 한도/필드/범위 LOW(키 필요), 스택 HIGH.
**Research date:** 2026-11-11, **Valid until:** 2026-12-11
