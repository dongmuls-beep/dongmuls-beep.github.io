// portfolio-calc.js - pure, DOM-free portfolio valuation engine and shared row validators.
// Works in node (module.exports) and in the browser (global PortfolioCalc).
// Value per date = sum(qty x close); no network, storage or DOM access.
(function () {
    "use strict";

    var LIMITS = Object.freeze({
        QTY_MAX_DECIMALS: 8,
        QTY_MAX_INT_DIGITS: 12,
        JUMP_RATIO: 0.4, // day-over-day move above this raises a jump warning
        MAX_ROWS: 200
    });

    var QTY_RE = /^(0|[1-9]\d{0,11})(\.\d{1,8})?$/;
    var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    // Same rule as PRICES-CONTRACT: digits -> zfill 6, otherwise upper-case.
    function normalizeCode(code) {
        if (typeof code === "number" && isFinite(code)) code = String(code);
        if (typeof code !== "string") return "";
        var s = code.trim();
        if (!s) return "";
        return /^\d+$/.test(s) ? s.padStart(6, "0") : s.toUpperCase();
    }

    // Quantity must be a plain decimal string; numbers are rejected on purpose.
    function validateQty(qty) {
        if (typeof qty !== "string" || !QTY_RE.test(qty)) return "QTY_FORMAT";
        return Number(qty) > 0 ? null : "QTY_NONPOSITIVE";
    }

    function qtyToNumber(qty) {
        return validateQty(qty) === null ? Number(qty) : NaN;
    }

    function localTodayIso() {
        var d = new Date();
        var m = d.getMonth() + 1;
        var day = d.getDate();
        return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
    }

    function validateDate(s, todayIso) {
        if (typeof s !== "string" || !DATE_RE.test(s)) return "DATE_FORMAT";
        var y = Number(s.slice(0, 4));
        var m = Number(s.slice(5, 7));
        var d = Number(s.slice(8, 10));
        var dt = new Date(Date.UTC(y, m - 1, d));
        if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
            return "DATE_INVALID";
        }
        return s > (todayIso || localTodayIso()) ? "DATE_FUTURE" : null;
    }

    // Clean, date-sorted copy of a prices entry; non-finite closes are skipped, never zero.
    function cleanSeries(entry) {
        var out = [];
        var dates = entry && Array.isArray(entry.dates) ? entry.dates : [];
        var close = entry && Array.isArray(entry.close) ? entry.close : [];
        for (var i = 0; i < dates.length; i++) {
            var c = close[i];
            if (typeof dates[i] === "string" && typeof c === "number" && isFinite(c)) {
                out.push({ d: dates[i], c: c });
            }
        }
        out.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
        return out;
    }

    function compute(rows, prices, opts) {
        var todayIso = opts && opts.todayIso;
        var warnings = [];
        var src = Array.isArray(rows) ? rows : [];
        var px = prices || {};
        var series = {};
        var valid = [];

        src.forEach(function (r, i) {
            var row = i + 1;
            var code = normalizeCode(r && r.code);
            var err = validateQty(r && r.qty) || validateDate(r && r.startDate, todayIso);
            if (!code && !err) err = "CODE_EMPTY";
            if (err) {
                warnings.push({ type: "invalid_row", row: row, error: err });
                return;
            }
            if (!(code in series)) series[code] = cleanSeries(px[code]);
            if (!series[code].length) {
                warnings.push({ type: "no_data", code: code, row: row });
                return;
            }
            valid.push({ row: row, code: code, qty: Number(r.qty), start: r.startDate });
        });

        if (!valid.length) return { dates: [], total: [], byCode: {}, warnings: warnings, asOf: null };

        var minStart = valid.reduce(function (m, r) { return r.start < m ? r.start : m; }, valid[0].start);
        var set = {};
        valid.forEach(function (r) {
            series[r.code].forEach(function (p) { if (p.d >= minStart) set[p.d] = true; });
        });
        var axis = Object.keys(set).sort();
        var asOf = axis.length ? axis[axis.length - 1] : null;

        var byCode = {};
        var kept = {};
        valid.forEach(function (r) {
            var s = series[r.code];
            var vals = new Array(axis.length);
            var p = -1; // pointer to last series entry at or before the axis date
            var ok = true;
            for (var k = 0; k < axis.length; k++) {
                while (p + 1 < s.length && s[p + 1].d <= axis[k]) p++;
                var v = axis[k] >= r.start && p >= 0 ? r.qty * s[p].c : 0;
                if (!isFinite(v)) { ok = false; break; }
                vals[k] = v;
            }
            if (!ok) {
                warnings.push({ type: "non_finite", code: r.code, row: r.row });
                return;
            }
            kept[r.code] = true;
            var acc = byCode[r.code] || (byCode[r.code] = new Array(axis.length).fill(0));
            for (var j = 0; j < vals.length; j++) acc[j] += vals[j];
        });

        var total = axis.map(function (_, k) {
            var t = 0;
            Object.keys(byCode).forEach(function (c) { t += byCode[c][k]; });
            return t;
        });

        Object.keys(kept).forEach(function (code) {
            var s = series[code];
            if (asOf && s[s.length - 1].d < asOf) {
                warnings.push({ type: "delisted", code: code, date: s[s.length - 1].d });
            }
            for (var i = 1; i < s.length; i++) {
                if (s[i].d >= axis[0] && s[i - 1].c > 0 &&
                    Math.abs(s[i].c / s[i - 1].c - 1) > LIMITS.JUMP_RATIO) {
                    warnings.push({ type: "jump", code: code, date: s[i].d });
                }
            }
        });

        return { dates: axis, total: total, byCode: byCode, warnings: warnings, asOf: asOf };
    }

    var PortfolioCalc = {
        LIMITS: LIMITS,
        normalizeCode: normalizeCode,
        validateQty: validateQty,
        qtyToNumber: qtyToNumber,
        validateDate: validateDate,
        compute: compute
    };

    if (typeof module !== "undefined" && module.exports) module.exports = PortfolioCalc;
    else (typeof globalThis !== "undefined" ? globalThis : window).PortfolioCalc = PortfolioCalc;
})();
