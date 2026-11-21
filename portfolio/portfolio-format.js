// portfolio-format.js - DOM-free view helpers for the portfolio page (formats, periods, weights, fees, mapping).
// Works in node (module.exports) and in the browser (global PortfolioFormat).
(function () {
    "use strict";

    // Browser: portfolio-calc.js must be loaded before this file.
    var Calc = (typeof module !== "undefined" && module.exports)
        ? require("./portfolio-calc.js")
        : (typeof globalThis !== "undefined" ? globalThis : window).PortfolioCalc;

    var MINUS = "−";
    var MONTHS = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function localTodayIso(date) {
        var d = date || new Date();
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    }

    function formatWon(value, locale) {
        if (typeof value !== "number" || !isFinite(value)) return "-";
        return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value));
    }

    function formatCompact(value, locale) {
        if (typeof value !== "number" || !isFinite(value)) return "-";
        return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
    }

    function formatFee(f) {
        if (typeof f !== "number" || !isFinite(f)) return "-";
        var s = f.toFixed(4);
        while (s.charAt(s.length - 1) === "0" && s.length - s.indexOf(".") - 1 > 2) s = s.slice(0, -1);
        return s;
    }

    function dayChange(total, locale) {
        if (!total || total.length < 2) return null;
        var prev = total[total.length - 2];
        var d = total[total.length - 1] - prev;
        if (d === 0) return { dir: "flat", arrow: "–", amount: "0", pct: prev === 0 ? "-" : "0.00%" };
        var up = d > 0;
        var sign = up ? "+" : MINUS;
        return {
            dir: up ? "up" : "down",
            arrow: up ? "▲" : "▼",
            amount: sign + formatWon(Math.abs(d), locale),
            pct: prev === 0 ? "-" : sign + Math.abs(d / prev * 100).toFixed(2) + "%"
        };
    }

    function periodStartIndex(dates, period) {
        var n = MONTHS[period];
        if (!n || !dates || !dates.length) return 0;
        var last = dates[dates.length - 1];
        var y = Number(last.slice(0, 4));
        var m = Number(last.slice(5, 7)) - 1 - n;
        var day = Number(last.slice(8, 10));
        y += Math.floor(m / 12);
        m = ((m % 12) + 12) % 12;
        day = Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
        var target = y + "-" + pad2(m + 1) + "-" + pad2(day);
        for (var i = 0; i < dates.length; i++) if (dates[i] >= target) return i;
        return dates.length - 1;
    }

    function tableRows(dates, values, locale, maxDaily) {
        var limit = maxDaily === undefined ? 130 : maxDaily;
        var n = dates.length;
        var monthly = n > limit;
        var out = [];
        for (var i = n - 1; i >= 0; i--) {
            if (monthly && i !== n - 1 && dates[i].slice(0, 7) === dates[i + 1].slice(0, 7)) continue;
            var c = i > 0 ? dayChange([values[i - 1], values[i]], locale) : null;
            out.push({
                date: dates[i],
                value: values[i],
                change: c && { dir: c.dir, arrow: c.arrow, amount: c.amount }
            });
        }
        return { monthly: monthly, rows: out };
    }

    function latestByCode(result) {
        var out = {};
        Object.keys(result.byCode || {}).forEach(function (code) {
            var a = result.byCode[code];
            out[code] = a[a.length - 1];
        });
        return out;
    }

    function weights(result) {
        var latest = latestByCode(result);
        var t = result.total && result.total.length ? result.total[result.total.length - 1] : 0;
        return Object.keys(latest).map(function (code) {
            return { code: code, value: latest[code], pct: t > 0 ? latest[code] / t * 100 : null };
        }).sort(function (a, b) { return b.value - a.value; });
    }

    function weightedFee(latest, feeOf) {
        var base = 0;
        var cost = 0;
        var included = [];
        var excluded = [];
        Object.keys(latest).forEach(function (code) {
            var v = latest[code];
            if (!(v > 0) || !isFinite(v)) return;
            var f = feeOf(code);
            // a null/non-finite fee is excluded, never counted as 0
            if (typeof f === "number" && isFinite(f)) {
                base += v;
                cost += v * f / 100;
                included.push(code);
            } else {
                excluded.push(code);
            }
        });
        if (!included.length) return null;
        return { fee: cost / base * 100, cost: cost, included: included, excluded: excluded };
    }

    function rowLatestValue(row, entry, asOf) {
        if (!entry || !entry.close) return null;
        var px = null;
        for (var i = entry.close.length - 1; i >= 0; i--) {
            if (typeof entry.close[i] === "number" && isFinite(entry.close[i])) { px = entry.close[i]; break; }
        }
        if (px === null) return null;
        if (row.startDate > asOf) return 0;
        var q = Calc.qtyToNumber(row.qty);
        return isFinite(q) ? q * px : null;
    }

    function firstPriceDate(entry) {
        if (!entry || !entry.close) return null;
        for (var i = 0; i < entry.close.length; i++) {
            if (typeof entry.close[i] === "number" && isFinite(entry.close[i])) return entry.dates[i];
        }
        return null;
    }

    function matchOptions(list, text, max) {
        var t = String(text == null ? "" : text).trim();
        if (!t) return [];
        var lower = t.toLowerCase();
        var norm = Calc.normalizeCode(t);
        var upper = t.toUpperCase();
        var out = [];
        for (var i = 0; i < list.length && out.length < (max || 8); i++) {
            var it = list[i];
            if (String(it.name).toLowerCase().indexOf(lower) >= 0 ||
                it.code.indexOf(norm) === 0 || it.code.indexOf(upper) === 0) out.push(it);
        }
        return out;
    }

    function resolveCode(text, selected, list) {
        if (selected && selected.label === text) return selected.code;
        var c = Calc.normalizeCode(text);
        if (!c) return null;
        for (var i = 0; i < list.length; i++) if (list[i].code === c) return c;
        return null;
    }

    function warningItems(o) {
        var nameOf = o.nameOf || function () { return ""; };
        var failed = o.fetchFailed || [];
        var ws = o.warnings || [];
        var out = [];
        function nm(code) { return nameOf(code) || code; }
        failed.forEach(function (code) {
            out.push({ key: "pf_warn_fetch", vars: { name: nm(code), code: code } });
        });
        function ofType(type) { return ws.filter(function (w) { return w.type === type; }); }
        ofType("no_data").forEach(function (w) {
            if (failed.indexOf(w.code) >= 0) return;
            out.push({ key: "pf_warn_no_data", vars: { name: nm(w.code), code: w.code, row: w.row } });
        });
        ofType("invalid_row").forEach(function (w) {
            out.push({ key: "pf_warn_invalid_row", vars: { row: w.row } });
        });
        ofType("non_finite").forEach(function (w) {
            out.push({ key: "pf_warn_non_finite", vars: { name: nm(w.code), code: w.code, row: w.row } });
        });
        ofType("delisted").forEach(function (w) {
            out.push({ key: "pf_warn_delisted", vars: { name: nm(w.code), code: w.code, date: w.date } });
        });
        ofType("jump").forEach(function (w) {
            out.push({ key: "pf_warn_jump", vars: { name: nm(w.code), code: w.code, date: w.date } });
        });
        (o.preListing || []).forEach(function (p) {
            out.push({ key: "pf_warn_pre_listing", vars: { name: nm(p.code), code: p.code, date: p.date } });
        });
        return out;
    }

    var FIELD_KEYS = { code: "pf_field_code", qty: "pf_field_qty", startDate: "pf_field_date" };
    var ERROR_KEYS = {
        CODE_NOT_ALLOWED: "pf_err_code",
        QTY_FORMAT: "pf_err_qty_format",
        QTY_NONPOSITIVE: "pf_err_qty_nonpositive",
        DATE_FORMAT: "pf_err_date_format",
        DATE_INVALID: "pf_err_date_invalid",
        DATE_FUTURE: "pf_err_date_future",
        ROWS_NOT_ARRAY: "pf_import_rows_format",
        ROW_FORMAT: "pf_import_rows_format",
        ROWS_LIMIT: "pf_import_rows_limit"
    };

    function importErrorItems(errors, max) {
        var cap = max === undefined ? 20 : max;
        var list = errors || [];
        return {
            items: list.slice(0, cap).map(function (e) {
                return {
                    key: "pf_import_row_error",
                    vars: { row: e.row, max: Calc.LIMITS.MAX_ROWS },
                    withRow: e.row > 0 && e.field !== "rows",
                    fieldKey: FIELD_KEYS[e.field] || null,
                    messageKey: ERROR_KEYS[e.error] || null
                };
            }),
            more: Math.max(0, list.length - cap)
        };
    }

    var STORAGE_KEYS = {
        STORAGE_UNAVAILABLE: "pf_storage_unavailable",
        QUOTA_EXCEEDED: "pf_storage_quota",
        CORRUPT: "pf_storage_corrupt",
        UNSUPPORTED_VERSION: "pf_storage_version"
    };

    function storageErrorKey(error) {
        return Object.prototype.hasOwnProperty.call(STORAGE_KEYS, error) ? STORAGE_KEYS[error] : null;
    }

    var PortfolioFormat = {
        localTodayIso: localTodayIso,
        formatWon: formatWon,
        formatCompact: formatCompact,
        formatFee: formatFee,
        dayChange: dayChange,
        periodStartIndex: periodStartIndex,
        tableRows: tableRows,
        latestByCode: latestByCode,
        weights: weights,
        weightedFee: weightedFee,
        rowLatestValue: rowLatestValue,
        firstPriceDate: firstPriceDate,
        matchOptions: matchOptions,
        resolveCode: resolveCode,
        warningItems: warningItems,
        importErrorItems: importErrorItems,
        storageErrorKey: storageErrorKey
    };

    if (typeof module !== "undefined" && module.exports) module.exports = PortfolioFormat;
    else (typeof globalThis !== "undefined" ? globalThis : window).PortfolioFormat = PortfolioFormat;
})();
