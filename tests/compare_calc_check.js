"use strict";
const path = require("path");
const assert = require("assert");

const C = require(path.join(__dirname, "..", "compare-calc.js"));

function approx(actual, expected, tol = 0.01, label = "") {
    assert.ok(
        typeof actual === "number" && Math.abs(actual - expected) <= tol,
        `${label}: expected ${expected} +/- ${tol}, got ${actual}`
    );
}

// shape
["normalizeInputs", "simulate", "compare", "simulateMany"].forEach((fn) => {
    assert.strictEqual(typeof C[fn], "function", `missing function ${fn}`);
});
assert.ok(Object.isFrozen(C.LIMITS), "LIMITS must be frozen");
assert.deepStrictEqual({ ...C.LIMITS }, { MIN_YEARS: 1, MAX_YEARS: 50, MIN_RETURN_PCT: -99, MAX_RETURN_PCT: 100, MAX_AMOUNT: 1e13 });

// zero case
{
    const r = C.simulate({ lumpSum: 1e6, years: 3, monthly: 50000, annualReturnPct: 0, feePct: 0 });
    assert.strictEqual(r.excluded, false);
    assert.strictEqual(r.months, 36);
    approx(r.fvWithFee, 1e6 + 50000 * 36, 0.01, "zero fvWithFee");
    approx(r.fvNoFee, 1e6 + 50000 * 36, 0.01, "zero fvNoFee");
    assert.strictEqual(r.totalFees, 0);
    assert.strictEqual(r.costDrag, 0);
    approx(r.totalContributed, 1e6 + 50000 * 36, 0.01, "zero totalContributed");
}

// fee 0 with positive return
{
    const r = C.simulate({ lumpSum: 1e7, years: 10, monthly: 100000, annualReturnPct: 7, feePct: 0 });
    approx(r.costDrag, 0, 0.01, "fee0 costDrag");
    approx(r.totalFees, 0, 0.01, "fee0 totalFees");
}

// H1
const h1 = C.simulate({ lumpSum: 1e7, years: 1, monthly: 0, annualReturnPct: 0, feePct: 1 });
approx(h1.fvWithFee, 1e7 * 0.99, 0.01, "H1 fvWithFee");
approx(h1.fvWithFee, 9900000, 0.01, "H1 fvWithFee literal");
approx(h1.totalFees, 100000, 0.01, "H1 totalFees");
approx(h1.costDrag, 100000, 0.01, "H1 costDrag");

// H2
const h2 = C.simulate({ lumpSum: 0, years: 1, monthly: 100000, annualReturnPct: 0, feePct: 1 });
const h2fv = (1e5 * (1 - 0.99)) / (1 - Math.pow(0.99, 1 / 12));
approx(h2.fvWithFee, h2fv, 0.01, "H2 fvWithFee closed form");
approx(h2.fvWithFee, 1194490.0195, 0.01, "H2 fvWithFee literal");
approx(h2.costDrag, 1200000 - h2fv, 0.01, "H2 costDrag closed form");
approx(h2.costDrag, 5509.9805, 0.01, "H2 costDrag literal");
approx(h2.totalFees, 5509.9805, 0.01, "H2 totalFees literal");

// H3
const h3 = C.simulate({ lumpSum: 1e7, years: 10, monthly: 0, annualReturnPct: 5, feePct: 0.5 });
approx(h3.fvNoFee, 1e7 * Math.pow(1.05, 10), 0.01, "H3 fvNoFee closed form");
approx(h3.fvNoFee, 16288946.2678, 0.01, "H3 fvNoFee literal");
approx(h3.fvWithFee, 1e7 * Math.pow(1.05 * 0.995, 10), 0.01, "H3 fvWithFee closed form");
approx(h3.fvWithFee, 15492581.8099, 0.01, "H3 fvWithFee literal");
approx(h3.costDrag, 796364.4579, 0.01, "H3 costDrag literal");
approx(h3.totalFees, 630180.5907, 0.01, "H3 totalFees literal");

// H4 (loop-only values)
const h4 = C.simulate({ lumpSum: 1e7, years: 10, monthly: 1e6, annualReturnPct: 5, feePct: 0.5 });
approx(h4.fvNoFee, 170652107.5692, 0.01, "H4 fvNoFee");
approx(h4.fvWithFee, 165776734.3227, 0.01, "H4 fvWithFee");
approx(h4.totalFees, 4104773.3741, 0.01, "H4 totalFees");
approx(h4.costDrag, 4875373.2465, 0.01, "H4 costDrag");

// H5
const h5 = C.simulate({ lumpSum: 1e7, years: 50, monthly: 0, annualReturnPct: 0, feePct: 1 });
assert.strictEqual(h5.months, 600);
approx(h5.fvWithFee, 1e7 * Math.pow(0.99, 50), 0.01, "H5 fvWithFee closed form");
approx(h5.fvWithFee, 6050060.6714, 0.01, "H5 fvWithFee literal");
approx(h5.totalFees, 3949939.3286, 0.01, "H5 totalFees literal");
approx(h5.costDrag, 3949939.3286, 0.01, "H5 costDrag literal");

// H6
const h6 = C.simulate({ lumpSum: 1e7, years: 10, monthly: 0, annualReturnPct: 0, feePct: 0.5 });
approx(h6.costDrag, 1e7 * (1 - Math.pow(0.995, 10)), 0.01, "H6 costDrag closed form");
approx(h6.costDrag, 488898.6953, 0.01, "H6 costDrag literal");

// invariants
[h1, h2, h5, h6].forEach((r, i) => approx(r.totalFees, r.costDrag, 0.01, `r=0 invariant #${i}`));
[h3, h4].forEach((r, i) => assert.ok(r.costDrag > r.totalFees, `r>0 invariant #${i}`));

// monotonic
{
    const fees = [0, 0.05, 0.1, 0.5, 1, 2];
    const rs = fees.map((f) => C.simulate({ lumpSum: 1e7, years: 20, monthly: 500000, annualReturnPct: 6, feePct: f }));
    for (let i = 1; i < rs.length; i++) {
        assert.ok(rs[i].costDrag > rs[i - 1].costDrag, `costDrag not increasing at fee ${fees[i]}`);
        assert.ok(rs[i].fvWithFee < rs[i - 1].fvWithFee, `fvWithFee not decreasing at fee ${fees[i]}`);
    }
}

// boundaries
{
    const base = { lumpSum: 1e6, monthly: 0, annualReturnPct: 3, feePct: 0.2 };
    const y = (years) => C.simulate({ ...base, years });
    assert.strictEqual(y(1).months, 12);
    assert.strictEqual(y(50).months, 600);
    assert.strictEqual(y(0).years, 1);
    assert.strictEqual(y(0).months, 12);
    assert.strictEqual(y(51).years, 50);
    assert.strictEqual(y(100).years, 50);
    assert.strictEqual(y(100).months, 600);
    assert.strictEqual(y(10.4).years, 10);
    assert.strictEqual(y(10.4).months, 120);
    assert.strictEqual(y(NaN).years, 1);
    assert.strictEqual(y(NaN).months, 12);
    assert.strictEqual(C.normalizeInputs({ years: 51 }).years, 50);
    assert.strictEqual(C.normalizeInputs(undefined).years, 1);
    assert.strictEqual(C.normalizeInputs(null).lumpSum, 0);
}

// defaults
{
    const base = { lumpSum: 1e6, years: 5, monthly: 10000, feePct: 0.3 };
    const explicit0 = C.simulate({ ...base, annualReturnPct: 0 });
    assert.deepStrictEqual(C.simulate({ ...base }), explicit0);
    assert.deepStrictEqual(C.simulate({ ...base, annualReturnPct: undefined }), explicit0);
    assert.deepStrictEqual(C.simulate({ ...base, annualReturnPct: NaN }), explicit0);
    assert.strictEqual(C.normalizeInputs({ annualReturnPct: 500 }).annualReturnPct, 100);
    assert.strictEqual(C.normalizeInputs({ annualReturnPct: -500 }).annualReturnPct, -99);

    const zeroed = C.simulate({ lumpSum: 0, years: 5, monthly: 0, annualReturnPct: 5, feePct: 0.3 });
    assert.deepStrictEqual(C.simulate({ lumpSum: -1e6, years: 5, monthly: NaN, annualReturnPct: 5, feePct: 0.3 }), zeroed);
    assert.deepStrictEqual(C.simulate({ lumpSum: Infinity, years: 5, monthly: -5, annualReturnPct: 5, feePct: 0.3 }), zeroed);
}

// excluded
{
    const base = { lumpSum: 1e6, years: 5, monthly: 10000, annualReturnPct: 5 };
    [null, undefined, NaN, Infinity, "abc", "0.5"].forEach((fee) => {
        const r = C.simulate({ ...base, feePct: fee });
        assert.strictEqual(r.excluded, true, `fee ${String(fee)} should be excluded`);
        assert.strictEqual(r.reason, "fee_missing", `fee ${String(fee)} reason`);
        assert.notStrictEqual(typeof r.fvWithFee, "number", `fee ${String(fee)} must not have fvWithFee`);
    });
    const noFeeKey = C.simulate({ ...base });
    assert.strictEqual(noFeeKey.excluded, true);
    assert.strictEqual(noFeeKey.reason, "fee_missing");
    [-0.1, 100].forEach((fee) => {
        const r = C.simulate({ ...base, feePct: fee });
        assert.strictEqual(r.excluded, true, `fee ${fee} should be excluded`);
        assert.strictEqual(r.reason, "fee_invalid", `fee ${fee} reason`);
        assert.notStrictEqual(typeof r.fvWithFee, "number");
    });
    assert.strictEqual(C.simulate({ ...base, feePct: 0 }).excluded, false);
}

// compare
{
    const inputs = { lumpSum: 1e7, years: 20, monthly: 500000, annualReturnPct: 6 };
    const c = C.compare(inputs, 0.1, 0.5);
    assert.strictEqual(c.excluded, false);
    assert.deepStrictEqual(c.a, C.simulate({ ...inputs, feePct: 0.1 }));
    assert.deepStrictEqual(c.b, C.simulate({ ...inputs, feePct: 0.5 }));
    assert.strictEqual(c.difference, c.a.fvWithFee - c.b.fvWithFee);
    assert.ok(c.difference > 0, "cheaper A should end higher");
    assert.strictEqual(c.feesDifference, c.b.totalFees - c.a.totalFees);

    const ca = C.compare(inputs, null, 0.5);
    assert.strictEqual(ca.excluded, true);
    assert.strictEqual(ca.excludedSide, "a");
    const cb = C.compare(inputs, 0.1, undefined);
    assert.strictEqual(cb.excluded, true);
    assert.strictEqual(cb.excludedSide, "b");
    const cboth = C.compare(inputs, null, NaN);
    assert.strictEqual(cboth.excluded, true);
    assert.strictEqual(cboth.excludedSide, "both");
    assert.strictEqual(typeof ca.difference, "undefined");
}

// simulateMany
{
    const inputs = { lumpSum: 1e7, years: 10, monthly: 100000, annualReturnPct: 5 };
    const out = C.simulateMany(inputs, [{ code: "069500", fee: 0.15 }, { code: "X", fee: null }]);
    assert.strictEqual(out.length, 2);
    assert.strictEqual(out[0].code, "069500");
    assert.strictEqual(out[0].excluded, false);
    assert.strictEqual(out[0].fvWithFee, C.simulate({ ...inputs, feePct: 0.15 }).fvWithFee);
    assert.strictEqual(out[1].code, "X");
    assert.strictEqual(out[1].excluded, true);
    assert.strictEqual(out[1].reason, "fee_missing");
    assert.deepStrictEqual(C.simulateMany(inputs, null), []);
}

// purity
{
    const input = { lumpSum: 1e7, years: 10, monthly: 1e6, annualReturnPct: 5, feePct: 0.5 };
    const snapshot = { ...input };
    const r1 = C.simulate(input);
    const r2 = C.simulate(input);
    assert.deepStrictEqual(r1, r2);
    assert.deepStrictEqual(input, snapshot);
    const raw = { lumpSum: -5, years: 99, monthly: NaN, annualReturnPct: 900 };
    const rawSnap = { ...raw };
    C.normalizeInputs(raw);
    assert.deepStrictEqual(raw, rawSnap);
}

// CR-01: huge amounts are clamped; result is finite or excluded, never Infinity/NaN
{
    const r = C.simulate({ lumpSum: 1e308, monthly: 1e308, years: 50, annualReturnPct: 100, feePct: 0.5 });
    if (!r.excluded) {
        ["totalContributed", "fvWithFee", "fvNoFee", "totalFees", "costDrag"].forEach((k) => {
            assert.ok(Number.isFinite(r[k]), `CR-01 ${k} must be finite, got ${r[k]}`);
        });
    }
    const n = C.normalizeInputs({ lumpSum: 1e308, monthly: 1e308 });
    assert.strictEqual(n.lumpSum, C.LIMITS.MAX_AMOUNT);
    assert.strictEqual(n.monthly, C.LIMITS.MAX_AMOUNT);
}

console.log("compare_calc_check: all assertions passed");
