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
        MAX_RETURN_PCT: 100,
        MAX_AMOUNT: 1e12, // 1조 원; bounds lumpSum/monthly so results stay finite
        FEE_HIGH_PCT: 5 // real 실부담비용 is 0-5%; above this is flagged as a likely unit error
    });

    // Accepts finite numbers and numeric strings ("1000000", " 0.5 "); anything else -> NaN.
    function toNum(v) {
        if (typeof v === "string" && v.trim() !== "") v = Number(v);
        return typeof v === "number" && isFinite(v) ? v : NaN;
    }

    function isFiniteNumber(v) {
        return typeof v === "number" && isFinite(v);
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : v > hi ? hi : v;
    }

    // Non-negative amount clamped to MAX_AMOUNT; invalid -> 0.
    function amount(v) {
        var x = toNum(v);
        return x >= 0 ? Math.min(x, LIMITS.MAX_AMOUNT) : 0;
    }

    function normalizeInputs(inputs) {
        var src = inputs || {};
        var y = toNum(src.years);
        var r = toNum(src.annualReturnPct);
        var years = isFiniteNumber(y) ? Math.round(y) : LIMITS.MIN_YEARS;
        var ret = isFiniteNumber(r) ? r : 0;
        return {
            lumpSum: amount(src.lumpSum),
            years: clamp(years, LIMITS.MIN_YEARS, LIMITS.MAX_YEARS),
            monthly: amount(src.monthly),
            annualReturnPct: clamp(ret, LIMITS.MIN_RETURN_PCT, LIMITS.MAX_RETURN_PCT)
        };
    }

    // Returns null when valid, otherwise "fee_missing" or "fee_invalid". Never coerces to 0.
    // Numeric strings are accepted (same policy as the other inputs).
    function validateFee(feePct) {
        var f = toNum(feePct);
        if (!isFiniteNumber(f)) return "fee_missing";
        if (f < 0 || f >= 100) return "fee_invalid";
        return null;
    }

    function simulate(inputs) {
        var n = normalizeInputs(inputs);
        var months = n.years * 12;
        var rawFee = inputs ? inputs.feePct : undefined;
        var reason = validateFee(rawFee);
        var base = {
            years: n.years,
            months: months,
            lumpSum: n.lumpSum,
            monthly: n.monthly,
            annualReturnPct: n.annualReturnPct,
            totalContributed: n.lumpSum + n.monthly * months
        };
        if (reason) {
            return Object.assign({ excluded: true, reason: reason }, base);
        }
        var feePct = toNum(rawFee);
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
        var costDrag = balanceNoFee - balance;
        if (!isFinite(balance) || !isFinite(balanceNoFee) || !isFinite(totalFees) || !isFinite(costDrag)) {
            return Object.assign({ excluded: true, reason: "overflow" }, base);
        }
        return Object.assign({
            excluded: false,
            feePct: feePct,
            warning: feePct > LIMITS.FEE_HIGH_PCT ? "fee_high" : null,
            fvWithFee: balance,
            fvNoFee: balanceNoFee,
            totalFees: totalFees,
            costDrag: costDrag
        }, base);
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
