---
phase: 03
slug: 보안-및-버그-수정
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-30
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| changelog JSON → DOM | 외부 서버(GAS)에서 수신한 ETF 변경 이력이 card.innerHTML에 삽입 | 공개 ETF 수수료 데이터 (비민감) |
| ETF data JSON → DOM | 외부 서버(GAS)에서 수신한 ETF 수수료 데이터가 row.innerHTML에 삽입 | 공개 ETF 수수료 데이터 (비민감) |
| i18n JSON → DOM | 로컬 번역 파일 문자열이 el.innerHTML에 삽입 | 시스템 통제 정적 문자열 |
| DOM classList → 스크롤 핸들러 | nav-open 클래스 읽기 — 내부 DOM 상태 | 없음 |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03A-01 | Tampering | changelog JSON → card.innerHTML (script.js:1085, 1108) | mitigate | month/updatedAt `escapeHtml(String(...))` (script.js:1079-1080); code/name/field `escapeHtml` (script.js:1099-1101); before/after는 `formatChangeValue` 숫자 포맷만 출력 | closed |
| T-03A-02 | Tampering | ETF data JSON → row.innerHTML (script.js:880) | mitigate | code/name/data-label `escapeHtml` 적용; 수치 필드는 `formatPercent`/`formatAUM`/`formatVolume` 숫자 출력만; naverUrl `encodeURIComponent`; changeHtml은 숫자 `toFixed` 출력 | closed |
| T-03A-03 | Tampering | i18n JSON → el.innerHTML (script.js:316) | accept | SECURITY 주석 (script.js:313) — 의도적 HTML | closed |
| T-03A-04 | Tampering | getTranslation() → tbody/container.innerHTML (script.js:626, 680, 844, 1052, 1062, 1134) | accept | 번역 JSON 시스템 통제 소스 | closed |
| T-03A-05 | Information Disclosure | innerHTML = "" DOM 클리어 | accept | 데이터 없음 | closed |
| T-03B-01 | Tampering | classList.contains("nav-open") 체크 (script.js:177) | accept | 외부 입력 없음 | closed |
| T-03B-02 | Denial of Service | rafPending 플래그 누출 | accept | early return 전 `rafPending = false` 확인 (script.js:178) | closed |
| T-03C-01 | Tampering | changelog_no_changes 번역 → innerHTML (script.js:1090) | accept | `escapeHtml(getTranslation(...))` 적용됨 | closed |
| T-03C-02 | Tampering | card.innerHTML 조건 분기 | accept | 분기 로직만 변경, 기존 escapeHtml 유지 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03A-03 | i18n JSON은 저장소 내 통제 파일. `<br>`, `<strong>` 등 의도적 HTML 포함 → textContent 전환 불가 (D-01) | user | 2026-09-30 |
| AR-03-02 | T-03A-04 | loading/error 메시지는 통제된 번역 소스. escapeHtml 적용 시 `<br>` 깨짐 (D-03) | user | 2026-09-30 |
| AR-03-03 | T-03A-05 | 빈 문자열 할당 — 데이터 노출 없음 | user | 2026-09-30 |
| AR-03-04 | T-03B-01 | 내부 DOM 상태 읽기, 공격 벡터 없음 | user | 2026-09-30 |
| AR-03-05 | T-03B-02 | 리셋 코드 구현 확인, 스크롤 핸들러 동결 없음 (UAT Test 1 pass) | user | 2026-09-30 |
| AR-03-06 | T-03C-01 | 통제 소스 + escapeHtml 추가 적용 | user | 2026-09-30 |
| AR-03-07 | T-03C-02 | 렌더링 분기만 변경, 이스케이핑 경로 불변 (UAT Test 2 pass) | user | 2026-09-30 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-30 | 9 | 9 | 0 | /gsd:secure-phase (orchestrator inline verify + user accept) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-30
