# Requirements — v1.4 신뢰성·접근성·비교 도구

**Milestone goal:** 데이터 신뢰성·모바일 접근성을 보강하고, 투자자용 비교 도구(직접 비교·누적 비용 계산기·RSS)를 추가한다.

**Locked decisions:** 신규 의존성 0 (Python stdlib + 브라우저 API), 결측은 `null`(0.0 아님), 비교는 새 정적 페이지 `/compare/`, 계산기 기대수익률 기본 0%, RSS 2.0(`feed.xml`) 한국어 단일·총보수/기타비용 변동만 항목화, 모바일 카드형 표 유지 + 라벨 보강, 최대 병렬 실행(파일 소유권 분리). See `.planning/research/SUMMARY.md`.

## v1.4 Requirements

### 데이터 신뢰성 (DATA)

- [x] **DATA-07**: 수수료 값을 파싱할 수 없거나 NaN/inf이면 `p_float`가 0.0 대신 `None`을 반환하고, `data.json`에는 `null`로 기록된다 (`json.dump(allow_nan=False)`로 무효 JSON 차단)
- [x] **DATA-08**: 수수료 구성요소 중 하나라도 결측이면 실부담비용도 결측이 되며, 검증(`validate_etl_results`)이 결측 때문에 ETL을 중단하지 않고 soft-warning으로 알린다
- [x] **DATA-09**: 결측이 끼인 전·후 쌍은 changelog와 fee-history에 변동으로 기록되지 않는다 (가짜 변동 없음)
- [x] **DATA-10**: 사용자는 결측 수수료를 "-"(번역된 표시)로 보고, 결측 종목은 정렬 시 맨 뒤에 오며 가짜 변동 배지·최저 표시를 받지 않는다

### 모바일 접근성·UI (A11Y)

- [x] **A11Y-01**: 제목(h1)과 수수료 변동 화살표 색이 WCAG AA 대비(4.5:1)를 충족한다 (C1, H3)
- [x] **A11Y-02**: 스크롤을 내리면 헤더가 실제로 숨겨지고 올리면 다시 나타나며, 메뉴가 열려 있거나 헤더 안에 포커스가 있으면 숨지 않는다 (C2, H5, H10)
- [x] **A11Y-03**: 모바일에서 변경 이력 표가 찌그러지지 않고 가로 스크롤로 읽힌다 (C3)
- [x] **A11Y-04**: 모바일의 모든 터치 대상(탭, 버튼, 언어 선택, 햄버거 등)이 44×44px 이상이다 (C4, M5)
- [x] **A11Y-05**: 스크린리더 사용자가 모바일 카드형 표에서 각 값이 어떤 열인지 들을 수 있고, 코드 셀 버튼에 설명적 라벨이 있다 (C5, H2)
- [x] **A11Y-06**: `aria-label`·`title` 등 접근성 문구가 언어 전환 시 8개 언어로 바뀐다 (C6)
- [x] **A11Y-07**: 키보드 사용자가 skip-link로 본문으로 바로 이동할 수 있다 (H1)
- [x] **A11Y-08**: 표 로딩 중에는 스켈레톤, 실패 시 재시도 버튼이 있는 에러 상태, 결과 없음 시 빈 상태가 표시되고 스크린리더에 상태가 안내된다 (H4)
- [x] **A11Y-09**: 중복 CSS 블록과 색상 토큰 불일치, theme-color 불일치가 정리되어 수정 사항이 덮어써지지 않는다 (H6, H8, H9)

### 직접 비교 (CMP)

- [x] **CMP-01**: 사용자가 메인 표에서 체크박스로 ETF를 2~4개 선택할 수 있고(ISA·연금 페이지는 표가 없어 선택 유지·비교 바만 표시 — 2026-09-30 사용자 결정), 5번째는 막히며, 선택은 카테고리 탭을 바꿔도 유지된다
- [x] **CMP-02**: 선택 시 화면 하단 비교 바에 선택 수와 "비교하기" 링크가 표시된다
- [x] **CMP-03**: `/compare/?compare=코드,코드` 페이지에서 선택 ETF의 총보수·기타비용·매매중개수수료·실부담비용·AUM이 나란한 표로 표시되고 항목별 최저값이 색 외의 표시로도 구분된다
- [x] **CMP-04**: 사용자가 비교 URL을 복사·공유할 수 있고, 잘못된·중복·미존재 코드는 무시되며(영숫자 코드 0026S0 등 허용), 유효 종목이 2개 미만이면 안내가 표시된다
- [x] **CMP-05**: 비교 페이지에 선택 ETF들의 수수료 추이가 한 차트에 겹쳐 표시되고(항목 선택, 기본 실부담비용), 색+선 모양+범례로 구분되며 텍스트 대안이 있다
- [x] **CMP-06**: 비교 페이지 문구가 8개 언어로 표시된다

### 누적 비용 계산기 (CALC)

- [x] **CALC-01**: 사용자가 일시금, 보유기간(1~50년), 월 적립금, 기대수익률(기본 0%, "가정"으로 표시)을 입력할 수 있고, 쉼표·전각 숫자 입력이 처리된다
- [x] **CALC-02**: 종목별 총 부담 비용(원)과 비용으로 줄어든 금액(수수료 없을 때와의 차이)이 월 복리(월말 납입, 실부담비용 연율의 월 환산) 기준으로 계산된다
- [x] **CALC-03**: 비교 페이지에서 선택 ETF 간 차이가 "N년간 A보다 B가 약 X원 더 부담" 형태로 표시되고, 결측 수수료 종목은 계산에서 제외·안내된다
- [x] **CALC-04**: 결과 옆에 투자 권유가 아니라는 면책 문구가 8개 언어로 표시된다
- [x] **CALC-05**: 계산기 입력값이 URL에 담겨 공유 링크로 같은 결과를 재현할 수 있다

### 수수료 변동 피드 (FEED)

- [x] **FEED-01**: 매일 CI가 changelog에서 총보수·기타비용 변동(인상·인하)만 항목으로 담은 RSS 2.0 `feed.xml`을 생성·커밋한다 (실부담비용 등은 본문 참고 정보, 결측·대량 보정 항목 제외)
- [x] **FEED-02**: 항목 GUID와 날짜가 재실행해도 바뀌지 않고, 변동이 없으면 `feed.xml`이 바이트 단위로 동일하다
- [x] **FEED-03**: 종목명의 특수문자(`&` 등)가 올바르게 이스케이프되어 피드가 유효한 XML이다
- [ ] **FEED-04**: 사용자가 메인·변경 이력 페이지에서 피드를 발견·구독할 수 있다 (autodiscovery `<link>` + 보이는 링크)

## Future Requirements

- 계산기에 과거 수수료 변동 반영
- 유사 ETF 추천
- 연도별 비용 표·누적 막대 차트
- 언어별 피드
- ui-review Medium/Low 항목 (M1~M10 중 미처리분)
- `build_changelog.py` UTC `datetime.now()` → KST 날짜
- requirements.txt 버전 고정, 미사용 의존성 정리

## Out of Scope

- 성과·추적오차 비교 — 사이트 핵심 가치(비용)와 무관
- 세금 모델링 — 기존 ISA/연금 가이드로 연결
- 차트·피드·수치 라이브러리 — 의존성 최소화 원칙
- 5개 이상 ETF 비교 — 가독성
- 서버 저장 비교 링크 — 정적 호스팅
- axe-core/Playwright CI — 수동 실기기 확인으로 대체

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| DATA-07 | Phase 10 | Complete |
| DATA-08 | Phase 10 | Complete |
| DATA-09 | Phase 10 | Complete |
| DATA-10 | Phase 11 | Complete |
| FEED-01 | Phase 12 | Complete |
| FEED-02 | Phase 12 | Complete |
| FEED-03 | Phase 12 | Complete |
| CALC-02 | Phase 13 | Complete |
| A11Y-01 | Phase 14 | Complete |
| A11Y-02 | Phase 14 | Complete |
| A11Y-03 | Phase 14 | Complete |
| A11Y-04 | Phase 14 | Complete |
| A11Y-05 | Phase 14 | Complete |
| A11Y-06 | Phase 14 | Complete |
| A11Y-07 | Phase 14 | Complete |
| A11Y-08 | Phase 14 | Complete |
| A11Y-09 | Phase 14 | Complete |
| CMP-01 | Phase 15 | Complete |
| CMP-02 | Phase 15 | Complete |
| CMP-03 | Phase 15 | Complete |
| CMP-04 | Phase 15 | Complete |
| CMP-05 | Phase 15 | Complete |
| CMP-06 | Phase 15 | Complete |
| CALC-01 | Phase 15 | Complete |
| CALC-03 | Phase 15 | Complete |
| CALC-04 | Phase 15 | Complete |
| CALC-05 | Phase 15 | Complete |
| FEED-04 | Phase 16 | Pending |

**Coverage:** 28/28 v1.4 requirements mapped
