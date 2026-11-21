// portfolio-store.js - local save/load, JSON export and all-or-nothing import for portfolio rows.
// Works in node (module.exports) and in the browser (global PortfolioStore).
// Storage is injected; no DOM, network or global storage access here.
(function () {
    "use strict";

    // Browser: portfolio-calc.js must be loaded before this file.
    var Calc = (typeof module !== "undefined" && module.exports)
        ? require("./portfolio-calc.js")
        : (typeof globalThis !== "undefined" ? globalThis : window).PortfolioCalc;

    var KEYS = Object.freeze({
        DATA: "pf_v1",
        CORRUPT: "pf_v1_corrupt_backup",
        LAST_BACKUP: "pf_v1_lastBackup"
    });
    var LIMITS = Object.freeze({
        SCHEMA_VERSION: 1,
        MAX_IMPORT_CHARS: 1048576,
        APP: "etfsave-portfolio"
    });

    // Hook for future schema versions; v1 is identity, unknown versions are rejected.
    function migrate(obj) {
        return obj && obj.schemaVersion === 1 ? obj : null;
    }

    function validateRows(rows, opts) {
        var allowed = (opts && opts.allowedCodes) || [];
        var todayIso = opts && opts.todayIso;
        if (!Array.isArray(rows)) {
            return { ok: false, rows: [], errors: [{ row: 0, field: "rows", error: "ROWS_NOT_ARRAY" }] };
        }
        if (rows.length > Calc.LIMITS.MAX_ROWS) {
            return { ok: false, rows: [], errors: [{ row: 0, field: "rows", error: "ROWS_LIMIT" }] };
        }
        var out = [];
        var errors = [];
        rows.forEach(function (r, i) {
            var n = i + 1;
            if (!r || typeof r !== "object" || Array.isArray(r)) {
                errors.push({ row: n, field: "rows", error: "ROW_FORMAT" });
                return;
            }
            var code = Calc.normalizeCode(r.code);
            var e = !code ? "CODE_NOT_ALLOWED" : allowed.indexOf(code) < 0 ? "CODE_NOT_ALLOWED" : null;
            if (e) errors.push({ row: n, field: "code", error: e });
            e = Calc.validateQty(r.qty);
            if (e) errors.push({ row: n, field: "qty", error: e });
            e = Calc.validateDate(r.startDate, todayIso);
            if (e) errors.push({ row: n, field: "startDate", error: e });
            out.push({ code: code, qty: r.qty, startDate: r.startDate });
        });
        return errors.length ? { ok: false, rows: [], errors: errors } : { ok: true, rows: out, errors: [] };
    }

    function isQuota(e) {
        return !!e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
            e.code === 22 || e.code === 1014);
    }

    function shapeOk(obj) {
        return !!obj && typeof obj === "object" && Array.isArray(obj.rows) && obj.rows.every(function (r) {
            return r && typeof r.code === "string" && typeof r.qty === "string" && typeof r.startDate === "string";
        });
    }

    function create(opts) {
        var storage = opts.storage;
        var todayOpt = opts.todayIso;
        function currentToday() { return typeof todayOpt === "function" ? todayOpt() : todayOpt; }
        var now = opts.now || function () { return new Date(); };
        var allowedCodes = (opts.allowedCodes || []).map(Calc.normalizeCode);

        function write(key, value) {
            try {
                storage.setItem(key, value);
                return { ok: true };
            } catch (e) {
                return { ok: false, error: isQuota(e) ? "QUOTA_EXCEEDED" : "STORAGE_UNAVAILABLE" };
            }
        }

        function backupCorrupt(raw) {
            write(KEYS.CORRUPT, raw); // best effort; failure must not mask the CORRUPT result
        }

        function load() {
            var raw;
            try {
                raw = storage.getItem(KEYS.DATA);
            } catch (e) {
                return { ok: false, error: "STORAGE_UNAVAILABLE", rows: [] };
            }
            if (raw === null || raw === undefined) return { ok: true, rows: [] };
            var obj;
            try {
                obj = JSON.parse(raw);
            } catch (e) {
                backupCorrupt(raw);
                return { ok: false, error: "CORRUPT", rows: [] };
            }
            if (!obj || typeof obj !== "object") {
                backupCorrupt(raw);
                return { ok: false, error: "CORRUPT", rows: [] };
            }
            var m = migrate(obj);
            if (!m) {
                backupCorrupt(raw);
                return { ok: false, error: "UNSUPPORTED_VERSION", rows: [] };
            }
            if (!shapeOk(m)) {
                backupCorrupt(raw);
                return { ok: false, error: "CORRUPT", rows: [] };
            }
            // rows no longer valid (delisted code, tampered, over the cap) are dropped, not kept in memory;
            // otherwise every later save() would fail. The raw value is backed up and the UI is told.
            var kept = [];
            m.rows.forEach(function (r) {
                var v = kept.length < Calc.LIMITS.MAX_ROWS ? validateRows([r], { allowedCodes: allowedCodes, todayIso: currentToday() }) : null;
                if (v && v.ok) kept.push(v.rows[0]);
            });
            if (kept.length !== m.rows.length) {
                backupCorrupt(raw);
                return { ok: false, error: "ROWS_DROPPED", rows: kept };
            }
            return { ok: true, rows: kept };
        }

        function save(rows) {
            var v = validateRows(rows, { allowedCodes: allowedCodes, todayIso: currentToday() });
            if (!v.ok) return { ok: false, error: "INVALID_ROWS", errors: v.errors };
            return write(KEYS.DATA, JSON.stringify({
                schemaVersion: LIMITS.SCHEMA_VERSION,
                rows: v.rows,
                updatedAt: now().toISOString()
            }));
        }

        // rows argument lets the UI export memory rows when storage is unavailable.
        function exportText(rows) {
            var cur = Array.isArray(rows) ? {
                ok: true,
                rows: rows.map(function (r) { return { code: r.code, qty: r.qty, startDate: r.startDate }; })
            } : load();
            if (!cur.ok) return { ok: false, error: cur.error };
            var exportedAt = now().toISOString();
            var text = JSON.stringify({
                app: LIMITS.APP,
                schemaVersion: LIMITS.SCHEMA_VERSION,
                exportedAt: exportedAt,
                rows: cur.rows
            }, null, 2);
            return { ok: true, text: text, backupRecorded: write(KEYS.LAST_BACKUP, exportedAt).ok };
        }

        function lastBackup() {
            try {
                return storage.getItem(KEYS.LAST_BACKUP) || null;
            } catch (e) {
                return null;
            }
        }

        function importRows(text, o) {
            if (typeof text !== "string") return { ok: false, error: "FORMAT" };
            if (text.length > LIMITS.MAX_IMPORT_CHARS) return { ok: false, error: "TOO_LARGE" };
            var obj;
            try {
                obj = JSON.parse(text);
            } catch (e) {
                return { ok: false, error: "PARSE_ERROR" };
            }
            if (!obj || typeof obj !== "object" || obj.app !== LIMITS.APP) return { ok: false, error: "FORMAT" };
            var m = migrate(obj);
            if (!m) return { ok: false, error: "UNSUPPORTED_VERSION" };
            var v = validateRows(m.rows, { allowedCodes: allowedCodes, todayIso: currentToday() });
            if (!v.ok) return { ok: false, error: "INVALID_ROWS", errors: v.errors };
            var cur = load();
            if (cur.rows.length > 0 && !(o && o.replace === true)) {
                return { ok: false, error: "CONFIRM_REQUIRED", existing: cur.rows.length };
            }
            var s = save(v.rows);
            return s.ok ? { ok: true, imported: v.rows.length } : s;
        }

        return { load: load, save: save, exportText: exportText, lastBackup: lastBackup, importRows: importRows };
    }

    var PortfolioStore = {
        KEYS: KEYS,
        LIMITS: LIMITS,
        migrate: migrate,
        validateRows: validateRows,
        create: create
    };

    if (typeof module !== "undefined" && module.exports) module.exports = PortfolioStore;
    else (typeof globalThis !== "undefined" ? globalThis : window).PortfolioStore = PortfolioStore;
})();
