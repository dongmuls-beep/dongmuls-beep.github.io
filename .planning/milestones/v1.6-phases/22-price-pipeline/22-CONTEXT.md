# Phase 22: 가격 수집 파이프라인 - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Source:** SEED-001 + Phase 21 live probe results (`.planning/phases/21-spike/21-SPIKE.md` is the canonical research; no separate RESEARCH.md)

<domain>
## Phase Boundary

59개 종목(`data.json`) 일별 종가를 `prices/{code}.json`으로 백필하고 매일 증분 갱신하는 스크립트+별도 GitHub Actions 워크플로+테스트. 프런트·계산 로직은 이 phase 범위 밖. 공개 사이트 원안(사용자 결정 2026-11-11: 비영리·무광고)이며 재배포 위험은 미해결이라 `prices/`는 분리해 삭제만으로 철회 가능해야 한다.
</domain>

<decisions>
## Implementation Decisions (locked)

- 엔드포인트: 증권상품시세정보 `getETFPriceInfo` (`_V2` 경로는 400). `resultType=json`. 값은 문자열로 온다.
- 키: GitHub secret / 환경변수 `DATA_GO_KR_KEY` (64자 hex, 인코딩 그대로·URL 인코딩 모두 동작). 로그·예외·URL 출력에 키와 인코딩 형태를 절대 노출하지 않는다(마스킹 헬퍼).
- 호출 한도: `numOfRows` 최대 10000/호출, 최신순. 데이터 최초일 20200807. 종목당 1회 호출 `beginBasDt=20210101`로 전체 이력(백필 59회, 약 80초, 평균 1.3초/호출). 개발계정 10,000(단위 미확인).
- 종목 조회: `likeSrtnCd` + `srtnCd` 정확 일치 후처리. 응답 `srtnCd`는 접두사 없는 6자(영숫자 `0026S0`, `0069M0` 포함). 59/59 조회 확인.
- 필드: `basDt, srtnCd, clpr, vs, fltRt, mkp, hipr, lopr, trqu, trPrc, nav` 등. 저장은 날짜·종가 배열 중심(압축), `version` 필드. 종가는 수정주가 아님(원본)이므로 원본 저장.
- 5년 미만 상장 종목은 상장일부터만 존재한다(예: 0026S0 = 2025-03-18). 정상 케이스로 처리.
- 데이터는 영업일 +1 오후 1시 이후 갱신되므로 일일 워크플로 cron은 그 이후로 잡고, 기존 `daily_update.yml`(Selenium ETL)과 시각·`concurrency` 그룹을 분리하며 실패가 서로 묶이지 않는다(별도 워크플로).
- 보관: 최대 5년, `prices/{code}.json` 종목별 파일 + `prices-meta.json`(기준일, 수집 종목 수, 누락 목록). 누락 비율이 임계값을 넘으면 기존 파일을 덮어쓰지 않고 job 실패.
- 종목코드 규칙: `data.json`의 정규화(숫자는 6자리 0 채움, 나머지는 대문자). `data.json`은 utf-8로 읽는다(한국어 키 `종목코드`).
- 테스트는 실제 API 호출 없이 monkeypatch. 기존 CI(`daily_update.yml`의 pytest `tests/`)에 걸리는 파일명 `tests/test_price_*.py`.
- 백필은 1회 커밋, 일일 작업은 추가만. 커밋 시 `file_pattern`에 `prices/`, `prices-meta.json`만 포함(다른 파일 건드리지 않음).
- 하루 30% 초과 변동 75건이 시장에 있고 다수가 레버리지·인버스(우리 59개엔 없음). 이 phase는 경고 기준을 만들지 않고(CALC-06에서 처리) 원본 저장만 한다.

### Claude's Discretion
- 스크립트 구조(`scripts/build_price_history.py` 권장), 백필/증분 모드 플래그, 재시도·타임아웃, cron 시각 구체값, 메타 스키마 세부.
</decisions>

<canonical_refs>
- `.planning/phases/21-spike/21-SPIKE.md` — 실측 결과·판정(필수 읽기)
- `.planning/seeds/SEED-001-portfolio-dashboard.md` — 데이터 계약·수집 규칙
- `.planning/REQUIREMENTS.md` — PRICE-01..05
- `.github/workflows/daily_update.yml` — 기존 워크플로(cron 시각·file_pattern·concurrency 참고, 수정 금지)
- `scripts/build_rss.py`, `tests/test_rss.py` — 기존 스크립트/결정성·tmp+os.replace 패턴 참고
- `data.json` — 59개 종목
</canonical_refs>

<deferred>
- 경고 임계값(상품 유형별), 평가금액 계산, UI — Phase 23/24
- 분할·병합 보정 — 마일스톤 범위 밖
</deferred>

---
*Phase: 22-price-pipeline*
