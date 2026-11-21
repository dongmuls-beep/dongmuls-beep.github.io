---
phase: 21-spike
verified: 2026-11-21T00:00:00Z
status: human_needed
score: 5/5 roadmap success criteria verified (SC5 not triggered); SPIKE-01 license verdict is an owner-accepted open risk, not a pass
overrides_applied: 0
gaps: []
human_verification:
  - test: "Confirm data.go.kr dataset 15094806 terms for public redistribution of closing prices with the agency (FSC/KRX or portal support)"
    expected: "Written confirmation that committing daily closes as static JSON on a public non-profit, ad-free site is allowed (or a request to withdraw)"
    why_human: "The license text (public-nuri type 4) forbids third-party provision and redistribution regardless of commercial use. Only the agency can resolve the interpretation. The source of the 'non-profit is allowed' guidance is unconfirmed."
  - test: "Owner confirms vanilla JS front stack (SPIKE-04)"
    expected: "Owner states vanilla JS is acceptable (SEED history had a React request)"
    why_human: "21-SPIKE.md lists it as a remaining user confirmation. The shipped Phases 23-25 are vanilla JS and were accepted de facto."
  - test: "Measure operating-account daily quota and its unit"
    expected: "Documented quota number and unit (day vs other)"
    why_human: "Needs the operating account and portal; dev account 10,000, unit not stated on the page."
---

# Phase 21: Gate-0 Spike Verification Report

**Phase Goal:** Decide from evidence, before writing code, whether the data source works for a non-profit, ad-free public service.
**Verified:** 2026-11-21
**Status:** human_needed
**Re-verification:** No, initial verification

Phase 21 is documentation-only (21-SPIKE.md). Verification checked that the document exists, is specific, and that its measured claims match live repo state. The pytest suite was run: 483 passed. No source code was touched.

## Goal Achievement: ROADMAP success criteria

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Terms, call limit, past range, adjusted-price status recorded with evidence | VERIFIED (license: open risk) | 21-SPIKE.md SPIKE-01 table (lines 51-62): limit 10,000 dev account (unit unstated), basDt back to 20200807, raw not adjusted (75 jumps over 30% all match raw), numOfRows cap 10000, key encoding. License quoted from the portal page. |
| 2 | 59 tickers (alphanumeric) lookup and code notation recorded | VERIFIED | 21-SPIKE.md line 12 and SPIKE-02 section: 59/59, srtnCd exact match, 6-char alphanumeric (0026S0, 0069M0). Cross-check: prices/ holds 59 files including 0026S0.json and 0069M0.json; data.json has 59 entries. |
| 3 | Backfill volume/time estimate and stack decision recorded | VERIFIED | SPIKE-03 (1 call per ticker, 59 calls, about 80 s; scenario A 118-767 calls). SPIKE-04 vanilla JS, with the React non-adoption reason. Shipped code is vanilla JS. |
| 4 | Split discontinuity check result and handling policy recorded | VERIFIED (no real split case) | SPIKE-05: raw clpr, fltRt/vs also unadjusted, policy raw close plus warning. No real split/merge case identified (whole-market scan only). Recorded honestly as unconfirmed. |
| 5 | If disallowed or no history, stop and ask the user | VERIFIED (gate worked) | Verdict "conditional go": license flagged as unresolved, stopped for the user. The owner decision of 2026-11-11 (REQUIREMENTS.md line 5, 21-SPIKE.md lines 184-188) chose the original public design with mitigations. History exists, so the stop branch was not needed on that axis. |

**Score:** 5/5 criteria satisfied as recorded. SPIKE-01 carries an owner-accepted unresolved risk (see below).

## SPIKE-01 license: documented, owner-accepted risk (not "license confirmed")

- The portal text is public-nuri type 4: attribution, no commercial use, no modification. It forbids unauthorized third-party provision and redistribution.
- The "conditional fit" verdict in 21-SPIKE.md applied to admin-only local use. 21-SPIKE.md itself states that verdict does not apply to public distribution, which is **unresolved**.
- Owner decision 2026-11-11 chose the public design on guidance that non-profit is allowed. The source of that guidance is unconfirmed. No official FSC/KRX reading exists.
- Mitigations recorded and checked: prices/ is isolated (withdraw by deleting prices/ and prices-meta.json; PRICES-CONTRACT.md "Withdrawal"), source attribution on screen, no ads on /portfolio/, key kept out of the repo (no 64-hex string found in tracked py/md/yml/sh/js files outside .venv).
- Status: risk accepted by the owner, not eliminated. It stays in human_verification.

## Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `.planning/phases/21-spike/21-SPIKE.md` | VERIFIED | 188 lines, sections SPIKE-01..05, user-action list, unconfirmed list, 2026-11-11 update. Not a stub. |
| 21-01-SUMMARY / 21-02-SUMMARY | VERIFIED | Exist; `requirements-completed` added in this closure pass. |

## Key Links

| From | To | Status | Details |
|---|---|---|---|
| 21-SPIKE.md | portal page 15094806 | WIRED | Source URL cited. |
| 21-SPIKE.md measured facts | Phase 22 code | WIRED | getETFPriceInfo endpoint, numOfRows 10000, srtnCd normalization, raw clpr are all used in scripts/build_price_history.py and PRICES-CONTRACT.md. |

## Requirements Coverage

| Requirement | Source Plan (plan `requirements` field) | Status | Evidence |
|---|---|---|---|
| SPIKE-01 | 21-01, 21-02 | SATISFIED as documented, with OPEN RISK | All table items recorded with evidence. The redistribution license verdict is unresolved and owner-accepted (2026-11-11). Needs human confirmation. |
| SPIKE-02 | 21-02 | SATISFIED | 59/59 recorded; prices/ has 59 files, prices-meta.json collected 59 of 59. |
| SPIKE-03 | 21-01, 21-02 | SATISFIED | Estimate recorded; the real backfill (22-03) matched it (59 calls). |
| SPIKE-04 | 21-01 | SATISFIED (decision recorded); owner confirmation pending | Vanilla JS decision and rationale present. |
| SPIKE-05 | 21-02 | SATISFIED (policy recorded); no real split case | Policy: raw close plus warning. The 40% warning false-positives on leveraged/inverse ETFs (30 of 75 jumps at 40% or more). |

Orphaned requirements: none (REQUIREMENTS.md maps SPIKE-01..05 to Phase 21, all claimed by plans).

## Anti-Patterns

None. No TBD/FIXME/XXX debt markers apply (documentation phase). No service key in tracked files.

## Gaps Summary

No blocking gaps. Residual items are unresolved risk and unconfirmed facts: redistribution license (owner-accepted), operating quota unit, no real split case, stack not explicitly confirmed. These are all listed in human_verification or in the milestone tech debt.

---

_Verified: 2026-11-21_
_Verifier: Claude (gsd-verifier)_
