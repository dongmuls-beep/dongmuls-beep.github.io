// compare-calc.js - pure, DOM-free cumulative cost (fee drag) calculator engine.
// Works in node (module.exports) and in the browser (global CompareCalc).
// Model: monthly loop, growth -> fee deduction -> end-of-month contribution.
// Fees are 실부담비용 percent values (0.5 means 0.5% per year).
(function () {
    "use strict";

    var LIMITS = Object.freeze({
        MIN_YEARS: 1,
        MAX_YEARS: 50,
        MIN_RETURN_PCT: -99,
        MAX_RETURN_PCT: 100
    });

    function isFiniteNumber(v) {
        return typeof v === "number" && isFinite(v);
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : v > hi ? hi : v;
    }

    function nonNegative(v) {
        return isFiniteNumber(v) && v >= 0 ? v : 0;
    }

    function normalizeInputs(inputs) {
        var src = inputs || {};
        var years = isFiniteNumber(src.years) ? Math.round(src.years) : LIMITS.MIN_YEARS;
        var ret = isFiniteNumber(src.annualReturnPct) ? src.annualReturnPct : 0;
        return {
            lumpSum: nonNegative(src.lumpSum),
            years: clamp(years, LIMITS.MIN_YEARS, LIMITS.MAX_YEARS),
            monthly: nonNegative(src.monthly),
            annualReturnPct: clamp(ret, LIMITS.MIN_RETURN_PCT, LIMITS.MAX_RETURN_PCT)
        };
    }

    // Returns null when valid, otherwise "fee_missing" or "fee_invalid". Never coerces to 0.
    function validateFee(feePct) {
        if (!isFiniteNumber(feePct)) return "fee_missing";
        if (feePct < 0 || feePct >= 100) return "fee_invalid";
        return null;
    }

    function simulate(inputs) {
        var n = normalizeInputs(inputs);
        var months = n.years * 12;
        var feePct = inputs ? inputs.feePct : undefined;
        var reason = validateFee(feePct);
        if (reason) {
            return { excluded: true, reason: reason, years: n.years, months: months };
        }
        var g = Math.pow(1 + n.annualReturnPct / 100, 1 / 12);
        var h = Math.pow(1 - feePct / 100, 1 / 12);
        var balance = n.lumpSum;
        var balanceNoFee = n.lumpSum;
        var totalFees = 0;
        for (var m = 0; m < months; m++) {
            var grown = balance * g;
            totalFees += grown * (1 - h);
            balance = grown * h + n.monthly;
            balanceNoFee = balanceNoFee * g + n.monthly;
        }
        return {
            excluded: false,
            years: n.years,
            months: months,
            feePct: feePct,
            annualReturnPct: n.annualReturnPct,
            totalContributed: n.lumpSum + n.monthly * months,
            fvWithFee: balance,
            fvNoFee: balanceNoFee,
            totalFees: totalFees,
            costDrag: balanceNoFee - balance
        };
    }

    function withFee(inputs, fee) {
        return Object.assign({}, inputs || {}, { feePct: fee });
    }

    function compare(inputs, feeA, feeB) {
        var a = simulate(withFee(inputs, feeA));
        var b = simulate(withFee(inputs, feeB));
        if (a.excluded || b.excluded) {
            var side = a.excluded && b.excluded ? "both" : a.excluded ? "a" : "b";
            return { excluded: true, excludedSide: side, a: a, b: b };
        }
        return {
            excluded: false,
            a: a,
            b: b,
            difference: a.fvWithFee - b.fvWithFee,
            feesDifference: b.totalFees - a.totalFees
        };
    }

    function simulateMany(inputs, items) {
        if (!Array.isArray(items)) return [];
        return items.map(function (item) {
            var it = item || {};
            return Object.assign({ code: it.code }, simulate(withFee(inputs, it.fee)));
        });
    }

    var CompareCalc = {
        LIMITS: LIMITS,
        normalizeInputs: normalizeInputs,
        validateFee: validateFee,
        simulate: simulate,
        compare: compare,
        simulateMany: simulateMany
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = CompareCalc;
    } else {
        (typeof globalThis !== "undefined" ? globalThis : window).CompareCalc = CompareCalc;
    }
})();
