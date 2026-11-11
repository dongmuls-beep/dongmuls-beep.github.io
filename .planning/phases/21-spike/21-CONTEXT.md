# Phase 21: 게이트 0 스파이크 - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Source:** SEED-001 (`.planning/seeds/SEED-001-portfolio-dashboard.md`, 7 Goldfish 리뷰 반영, 작성자 승인 범위)

<domain>
## Phase Boundary

코드 작성 전에 데이터 소스(공공데이터포털 금융위 주식시세정보 API)가 `/portfolio/` 기능을 성립시키는지 근거로 판정한다. 산출물은 문서뿐이다(제품 코드·워크플로 변경 없음). 서비스키는 저장·커밋 금지.
</domain>

<decisions>
## Implementation Decisions

### 게이트 0 (locked)
- 확인 항목: 이용허락(재배포, 출처 표시, 광고 사이트에서 사용), 일 호출 한도, `basDt` 과거 조회 범위, 수정주가 여부, 응답 필드, `numOfRows` 상한, 날짜 범위 파라미터, `serviceKey` 인코딩(이중 인코딩 오류 포함).
- 불허이거나 과거 조회 불가면 이후 단계 계획을 멈추고 사용자에게 대안(출시일부터 누적)을 묻는다.
- 영숫자 코드(예: `0026S0`) 포함 `data.json` 59개 종목이 모두 조회되는지 확인한다.
- 백필 호출량 = 종목 수 × 기간 ÷ 페이지 크기, 실행 시간 추정.
- 프런트 스택: React 18 UMD(버전 고정+SRI, `createElement` 또는 `htm`) vs 바닐라 JS(기존 `compare-chart.js` SVG 재사용) 비교 후 결정 기록. 런타임 Babel 금지.
- 분할이 있었던 실제 ETF로 종가 불연속 확인, 1차는 "미지원" 명시+±40% 경고 방침 검증.

### Claude's Discretion
- 문서 구조, 조사 순서, 실제 호출 스크립트(임시, 커밋 안 함) 구성.
- 서비스키가 없으면(사용자 발급 필요) 공개 문서·공식 안내 페이지로 가능한 항목을 먼저 확정하고, 실호출 항목은 "키 필요(미확인)"로 표시한다. 키·시크릿을 추측하거나 만들지 않는다.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/seeds/SEED-001-portfolio-dashboard.md` — 전체 범위·결정·스파이크 목록·리스크
- `concepts_brief.md` — 동일 브리프
- `.planning/REQUIREMENTS.md` — SPIKE-01..05
- `data.json` — 59개 종목 코드(영숫자 포함)
- `compare-chart.js` — 기존 SVG 선 차트(재사용 후보)
</canonical_refs>

<specifics>
## Specific Ideas

- 대상 API: 금융위원회 주식시세정보(공공데이터포털 data.go.kr, ETF 포함 여부·ETF 전용 API 존재 여부도 확인).
</specifics>

<deferred>
## Deferred Ideas

- 구글 Drive 저장·로그인, 59개 밖 전체 ETF, 분배금·분할 보정 — 이번 마일스톤 밖.
</deferred>

---
*Phase: 21-spike*
