---
phase: 13-calc-engine
reviewed: 2026-09-30T07:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - compare-calc.js
  - tests/compare_calc_check.js
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-09-30T07:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the pure fee-drag engine `compare-calc.js` (commit 0ea7dcf) and its node assert test `tests/compare_calc_check.js` (commit 720ce5d) against 13-01-PLAN.md (A1-A7, H1-H6, threat model T-13-01..04).

What checks out: the monthly loop matches A2 (growth, then `(1-f)^(1/12)` fee, then end-of-month contribution). H1-H6 reproduce. Fee validation never turns a missing fee into 0. Years are clamped to 1..50, so the loop runs at most 600 times. Both files are LF with no BOM. `node tests/compare_calc_check.js` exits 0.

Main problem: the plan's trust boundary says the engine "must be total over any input". It is not. `lumpSum` and `monthly` have no upper bound, so a large finite value (possible through the Phase 15 URL-share path) makes `costDrag` NaN and the other fields Infinity, with `excluded: false`. This was confirmed by running the code. Threat T-13-03 claims this is mitigated, but the mitigation only covers return and fee.

Secondary problem: the engine is strict about fee strings (they are excluded) but silently turns string amounts, years and return into defaults. Nothing in the result tells the caller that an input was replaced.

## Critical Issues

### CR-01: Unbounded lumpSum/monthly overflows to Infinity/NaN in a non-excluded result (T-13-03 mitigation incomplete)

**File:** `compare-calc.js:23-25, 32, 34, 59-75`
**Issue:** `nonNegative()` accepts any finite value >= 0 and applies no upper bound. Reproduced:
- `simulate({lumpSum:1e300, years:50, annualReturnPct:100, feePct:0.5})` returns `fvWithFee: Infinity, fvNoFee: Infinity, totalFees: Infinity, costDrag: NaN, excluded: false`.
- `simulate({lumpSum:1e308, years:1, monthly:1e308, feePct:0.5})` returns `totalContributed: Infinity, costDrag: NaN, excluded: false`.

`costDrag = Infinity - Infinity = NaN` then reaches Phase 15 display and sorting as a valid result. NaN in a sort comparator gives an inconsistent order. The plan's trust-boundary table requires the engine to be "total over any input" (URL `amt`/`mon`), and T-13-03 is marked "mitigate" for exactly this NaN/Infinity class. Only return and fee were bounded. Nothing in the test covers large amounts, so the gap went unnoticed.
**Fix:** Add amount limits to `LIMITS` and clamp in `normalizeInputs`. Also add a final finiteness guard so the engine can never return a non-finite value in a non-excluded result.
```js
var LIMITS = Object.freeze({
    MIN_YEARS: 1, MAX_YEARS: 50,
    MIN_RETURN_PCT: -99, MAX_RETURN_PCT: 100,
    MAX_AMOUNT: 1e13   // 10조 원; 1e13 * 2^50 ~ 1.1e28, well inside double range
});
function amount(v) { return isFiniteNumber(v) && v >= 0 ? Math.min(v, LIMITS.MAX_AMOUNT) : 0; }
...
// after the loop
if (!isFinite(balance) || !isFinite(balanceNoFee) || !isFinite(totalFees)) {
    return { excluded: true, reason: "overflow", years: n.years, months: months };
}
```
Then add a test: `simulate({lumpSum: 1e308, monthly: 1e308, years: 50, annualReturnPct: 100, feePct: 0.5})` must return only finite numbers or be excluded. Update the `LIMITS` deepStrictEqual assertion at test line 19 to match.

## Warnings

### WR-01: Numeric strings for amount/years/return silently become defaults, unlike fee strings

**File:** `compare-calc.js:24, 29-30`
**Issue:** `isFiniteNumber` requires `typeof === "number"`. URL/query and `<input>.value` inputs are strings. `simulate({lumpSum:"1000000", years:"20", monthly:"50000", annualReturnPct:"5", feePct:0.5})` returns a valid, non-excluded result with `years: 1`, `fvWithFee: 0`, `totalFees: 0`. If Phase 15 forgets to parse one field, the user gets a plausible "0 won in fees" answer and no error. Fee strings are treated the opposite way (excluded with `fee_missing`, test line 137). So the same caller mistake either fails loudly or fails silently, depending on the field.
**Fix:** Pick one policy. Either coerce numeric strings consistently:
```js
function toNum(v) {
    if (typeof v === "string" && v.trim() !== "") v = Number(v);
    return typeof v === "number" && isFinite(v) ? v : NaN;
}
```
or keep strict typing but report substitutions, e.g. `normalizeInputs` returns `adjusted: ["years","lumpSum"]` and `simulate` passes it through. Add a test for the chosen behavior.

### WR-02: Result does not echo normalized lumpSum/monthly, so the UI cannot show what was actually computed

**File:** `compare-calc.js:52, 65-76`
**Issue:** The success result includes `years` and `annualReturnPct` (post-clamp) but not the normalized `lumpSum` or `monthly`. The excluded result includes only `years` and `months`, with no `feePct`, `annualReturnPct` or `totalContributed`. Phase 15 cannot tell the user "negative amount treated as 0" or show the principal for an excluded row. It would have to call `normalizeInputs` again and hope it stays in sync with `simulate`. Combined with WR-01, clamped and defaulted inputs are invisible.
**Fix:** Spread the normalized inputs into both result shapes:
```js
var base = { years: n.years, months: months, lumpSum: n.lumpSum, monthly: n.monthly,
             annualReturnPct: n.annualReturnPct, totalContributed: n.lumpSum + n.monthly * months };
if (reason) return Object.assign({ excluded: true, reason: reason }, base);
return Object.assign({ excluded: false, feePct: feePct, fvWithFee: ..., ... }, base);
```

### WR-03: No plausibility bound on fee; unit errors in data.json are computed silently

**File:** `compare-calc.js:40-44`
**Issue:** Any `0 <= feePct < 100` is accepted. A1 depends on data.json holding percent units (0.5 = 0.5%). If an ETL regression writes a fraction (0.005) or a percent-times-100 value (50), the engine gives a wrong answer with no signal. For example, `feePct: 99.99` with a -99% return returns `totalFees` of about 5.3M won on a 10M lump sum while `costDrag` is about 1e-13, and the result is still `excluded: false`. Real 실부담비용 values are in the 0-5% range, and T-13-02 depends on bad fees being unable to look like the cheapest option. A fraction-unit fee (0.005) would look extremely cheap.
**Fix:** Add `MAX_FEE_PCT` (for example 10) to `LIMITS` and return `fee_invalid` above it. At minimum, document the accepted range and add a test for it. The fraction-unit case (tiny values) cannot be caught here, so the ETL validator should also be cross-checked.

## Info

### IN-01: validateFee is exported but not covered by the shape test

**File:** `tests/compare_calc_check.js:15`
**Issue:** The shape check lists only `normalizeInputs`, `simulate`, `compare` and `simulateMany`. `validateFee` is part of the public API (`compare-calc.js:110`), and Phase 15 is likely to call it, but removing or renaming it would not fail the test.
**Fix:** Add `"validateFee"` to the array and add direct asserts: `validateFee(null) === "fee_missing"`, `validateFee(100) === "fee_invalid"`, `validateFee(0) === null`.

### IN-02: Browser-global export path is not covered by the test file that Phase 16 CI will run

**File:** `tests/compare_calc_check.js:5`; `compare-calc.js:116-120`
**Issue:** The `globalThis.CompareCalc` branch was checked only by a one-off `node -e` vm command in the plan's acceptance criteria. The committed test only goes through `require`, so a regression in the `else` branch (the path the site actually uses) would pass CI.
**Fix:** Add a vm-context check to the test:
```js
const vm = require("vm"); const fs = require("fs");
const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "compare-calc.js"), "utf8"), ctx);
assert.strictEqual(typeof ctx.CompareCalc.simulate, "function");
```

### IN-03: simulateMany silently excludes malformed items instead of flagging them

**File:** `compare-calc.js:101-104`
**Issue:** `simulateMany(inputs, [0.1, "x"])` or an item that uses `feePct` instead of `fee` returns rows with `code: undefined, reason: "fee_missing"`. These look the same as a genuine missing fee from data.json. The `fee` key naming also differs from `feePct`, which is used everywhere else and makes this mistake more likely.
**Fix:** Accept `it.feePct` as a fallback (`it.fee !== undefined ? it.fee : it.feePct`), or use a distinct reason such as `"item_invalid"` when `item` is not an object.

### IN-04: Test gaps for negative returns and reversed compare sign

**File:** `tests/compare_calc_check.js:85-87, 155-176`
**Issue:** No case uses a negative `annualReturnPct`. In that case `costDrag < totalFees`, which is the opposite of the r>0 invariant, and nothing pins the behavior. `compare` is tested only with A cheaper than B, so the sign convention (`difference < 0` when A is more expensive) and the `feeA === feeB` case (difference 0) are not covered.
**Fix:** Add `simulate({... annualReturnPct: -10, feePct: 1})` asserting `costDrag < totalFees` and `costDrag > 0`. Add `compare(inputs, 0.5, 0.1).difference < 0` and `compare(inputs, 0.3, 0.3).difference === 0`.

---

_Reviewed: 2026-09-30T07:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
