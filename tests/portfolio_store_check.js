"use strict";
const assert = require("assert");
const Store = require("../portfolio/portfolio-store.js");

const K = Store.KEYS;
const ALLOWED = ["069500", "0026S0", "0069M0"];
const TODAY = "2026-11-21";
const NOW = () => new Date("2026-11-21T00:00:00.000Z");

function fakeStorage(opts) {
    opts = opts || {};
    const m = new Map();
    return {
        m,
        getItem(k) { if (opts.throwOnGet) throw opts.throwOnGet; return m.has(k) ? m.get(k) : null; },
        setItem(k, v) { if (opts.throwOnSet) throw opts.throwOnSet; m.set(k, String(v)); },
        removeItem(k) { m.delete(k); }
    };
}
function mk(st, extra) {
    return Store.create(Object.assign({ storage: st, allowedCodes: ALLOWED, now: NOW, todayIso: TODAY }, extra));
}
const row = (code, qty, d) => ({ code, qty, startDate: d || "2025-01-02" });

// ---- Task 1: load / save ----
{
    const st = fakeStorage();
    const s = mk(st);
    assert.deepStrictEqual(s.load(), { ok: true, rows: [] });
    assert.deepStrictEqual(s.save([row("0026s0", "1.5"), row("069500", "2"), row("069500", "3")]), { ok: true });
    const stored = JSON.parse(st.m.get(K.DATA));
    assert.strictEqual(stored.schemaVersion, 1);
    assert.strictEqual(stored.updatedAt, "2026-11-21T00:00:00.000Z");
    assert.strictEqual(stored.rows[0].code, "0026S0");
    assert.strictEqual(stored.rows[0].qty, "1.5");
    assert.strictEqual(s.load().rows.length, 3);

    // validation on save
    const many = Array.from({ length: 201 }, () => row("069500", "1"));
    let r = s.save(many);
    assert.strictEqual(r.error, "INVALID_ROWS");
    assert.strictEqual(r.errors[0].error, "ROWS_LIMIT");
    r = s.save([row("069500", "1"), row("999999", "1")]);
    assert.strictEqual(r.errors[0].error, "CODE_NOT_ALLOWED");
    assert.strictEqual(r.errors[0].row, 2);
    assert.strictEqual(s.save("x").errors[0].error, "ROWS_NOT_ARRAY");
    assert.strictEqual(s.save([null]).errors[0].error, "ROW_FORMAT");
    // extra keys such as __proto__ are dropped
    const evil = JSON.parse('{"code":"069500","qty":"1","startDate":"2025-01-02","__proto__":{"x":1},"extra":1}');
    assert.deepStrictEqual(Store.validateRows([evil], { allowedCodes: ALLOWED, todayIso: TODAY }).rows[0],
        { code: "069500", qty: "1", startDate: "2025-01-02" });
}

// storage failures never throw
{
    const quota = [{ name: "QuotaExceededError" }, { code: 22 }, { name: "NS_ERROR_DOM_QUOTA_REACHED" }];
    quota.forEach((e) => {
        assert.deepStrictEqual(mk(fakeStorage({ throwOnSet: e })).save([row("069500", "1")]),
            { ok: false, error: "QUOTA_EXCEEDED" });
    });
    assert.deepStrictEqual(mk(fakeStorage({ throwOnSet: { name: "SecurityError" } })).save([row("069500", "1")]),
        { ok: false, error: "STORAGE_UNAVAILABLE" });
    assert.deepStrictEqual(mk(fakeStorage({ throwOnGet: { name: "SecurityError" } })).load(),
        { ok: false, error: "STORAGE_UNAVAILABLE", rows: [] });
}

// corrupt / unsupported data is backed up before any overwrite
{
    let st = fakeStorage();
    st.m.set(K.DATA, "{not json");
    let s = mk(st);
    assert.deepStrictEqual(s.load(), { ok: false, error: "CORRUPT", rows: [] });
    assert.strictEqual(st.m.get(K.CORRUPT), "{not json");
    assert.deepStrictEqual(s.save([row("069500", "1")]), { ok: true });
    assert.strictEqual(st.m.get(K.CORRUPT), "{not json");

    ["{\"schemaVersion\":1,\"rows\":5}",
        "{\"schemaVersion\":1,\"rows\":[{\"code\":\"069500\",\"qty\":1,\"startDate\":\"2025-01-02\"}]}"].forEach((raw) => {
        st = fakeStorage();
        st.m.set(K.DATA, raw);
        assert.strictEqual(mk(st).load().error, "CORRUPT");
        assert.strictEqual(st.m.get(K.CORRUPT), raw);
    });

    st = fakeStorage();
    const v2 = "{\"schemaVersion\":2,\"rows\":[]}";
    st.m.set(K.DATA, v2);
    assert.deepStrictEqual(mk(st).load(), { ok: false, error: "UNSUPPORTED_VERSION", rows: [] });
    assert.strictEqual(st.m.get(K.CORRUPT), v2);
    assert.strictEqual(Store.migrate({ schemaVersion: 2 }), null);
    const v1 = { schemaVersion: 1, rows: [] };
    assert.strictEqual(Store.migrate(v1), v1);
}

// ---- Task 2: export / import ----
{
    const st = fakeStorage();
    const s = mk(st);
    assert.strictEqual(s.lastBackup(), null);
    const rows = [row("069500", "1.25"), row("0026S0", "3", "2025-06-30")];
    s.save(rows);
    const ex = s.exportText();
    assert.strictEqual(ex.ok, true);
    assert.strictEqual(ex.backupRecorded, true);
    assert.ok(ex.text.includes("\n  \"app\""));
    const parsed = JSON.parse(ex.text);
    assert.strictEqual(parsed.app, "etfsave-portfolio");
    assert.strictEqual(parsed.schemaVersion, 1);
    assert.strictEqual(s.lastBackup(), parsed.exportedAt);
    assert.strictEqual(st.m.get(K.LAST_BACKUP), parsed.exportedAt);

    // export -> import round trip into an empty store (no replace flag needed)
    const s2 = mk(fakeStorage());
    assert.deepStrictEqual(s2.importRows(ex.text), { ok: true, imported: 2 });
    assert.deepStrictEqual(s2.load().rows, rows);

    // lastBackup write failure still returns text
    const bad = mk(fakeStorage({ throwOnSet: { name: "SecurityError" } }));
    assert.strictEqual(bad.exportText().ok, true);
    assert.strictEqual(bad.exportText().backupRecorded, false);
    assert.strictEqual(mk(fakeStorage({ throwOnGet: new Error("x") })).lastBackup(), null);

    // never export a corrupt store as an empty list
    const cst = fakeStorage();
    cst.m.set(K.DATA, "{bad");
    assert.deepStrictEqual(mk(cst).exportText(), { ok: false, error: "CORRUPT" });
}

function file(rowsArr, extra) {
    return JSON.stringify(Object.assign({ app: "etfsave-portfolio", schemaVersion: 1, exportedAt: "x", rows: rowsArr }, extra));
}

// invalid imports change nothing
{
    const st = fakeStorage();
    const s = mk(st);
    s.save([row("069500", "1")]);
    const before = st.m.get(K.DATA);
    const R = { replace: true };

    ["1e-7", "-1", "NaN", "Infinity", "1,5", 1.5].forEach((q) => {
        const r = s.importRows(file([row("069500", "1"), row("069500", q)]), R);
        assert.strictEqual(r.error, "INVALID_ROWS", String(q));
        assert.strictEqual(r.errors.length, 1, String(q));
        assert.strictEqual(r.errors[0].row, 2);
        assert.strictEqual(r.errors[0].field, "qty");
        assert.strictEqual(st.m.get(K.DATA), before);
    });

    assert.strictEqual(s.importRows(file([row("069500", "1", "2025-02-30")]), R).errors[0].error, "DATE_INVALID");
    assert.strictEqual(s.importRows(file([row("069500", "1", "2026-11-22")]), R).errors[0].error, "DATE_FUTURE");
    assert.strictEqual(s.importRows(file([row("123456", "1")]), R).errors[0].error, "CODE_NOT_ALLOWED");
    assert.strictEqual(s.importRows(file(Array.from({ length: 201 }, () => row("069500", "1"))), R).errors[0].error, "ROWS_LIMIT");
    assert.strictEqual(s.importRows(file([], { app: "other" }), R).error, "FORMAT");
    assert.strictEqual(s.importRows("[]", R).error, "FORMAT");
    assert.strictEqual(s.importRows(5, R).error, "FORMAT");
    assert.strictEqual(s.importRows(file([], { schemaVersion: 2 }), R).error, "UNSUPPORTED_VERSION");
    assert.strictEqual(s.importRows("{bad", R).error, "PARSE_ERROR");
    assert.strictEqual(s.importRows(" ".repeat(1048577), R).error, "TOO_LARGE");
    assert.strictEqual(st.m.get(K.DATA), before);
}

// overwrite confirmation
{
    const st = fakeStorage();
    const s = mk(st);
    s.save([row("069500", "1"), row("069500", "2"), row("0069M0", "3")]);
    const before = st.m.get(K.DATA);
    const incoming = [row("0026S0", "5")];
    assert.deepStrictEqual(s.importRows(file(incoming)), { ok: false, error: "CONFIRM_REQUIRED", existing: 3 });
    assert.deepStrictEqual(s.importRows(file(incoming), { replace: false }).error, "CONFIRM_REQUIRED");
    assert.strictEqual(st.m.get(K.DATA), before);
    // invalid file is rejected before the confirm step
    assert.strictEqual(s.importRows(file([row("069500", "-1")])).error, "INVALID_ROWS");
    assert.deepStrictEqual(s.importRows(file(incoming), { replace: true }), { ok: true, imported: 1 });
    assert.deepStrictEqual(s.load().rows, incoming);
    // save failure surfaces on import
    const q = mk(fakeStorage({ throwOnSet: { name: "QuotaExceededError" } }));
    assert.strictEqual(q.importRows(file(incoming)).error, "QUOTA_EXCEEDED");
}

// ---- Phase 24: exportText(rows) ----
{
    const mem = [row("069500", "2"), row("0026S0", "1.5", "2025-06-30")];
    const dead = mk(fakeStorage({ throwOnGet: new Error("x"), throwOnSet: new Error("y") }));
    const ex = dead.exportText(mem);
    assert.strictEqual(ex.ok, true);
    assert.strictEqual(ex.backupRecorded, false);
    const p = JSON.parse(ex.text);
    assert.strictEqual(p.app, "etfsave-portfolio");
    assert.strictEqual(p.schemaVersion, 1);
    assert.ok(p.exportedAt);
    assert.deepStrictEqual(p.rows, mem);

    // working storage: backup recorded, corrupt stored value is not read
    const st = fakeStorage();
    st.m.set(K.DATA, "{bad");
    const ok = mk(st).exportText(mem);
    assert.strictEqual(ok.ok, true);
    assert.strictEqual(ok.backupRecorded, true);
    assert.strictEqual(st.m.get(K.LAST_BACKUP), JSON.parse(ok.text).exportedAt);

    // extra keys dropped
    const extra = mk(fakeStorage()).exportText([{ code: "069500", qty: "1", startDate: "2025-01-02", junk: 1 }]);
    assert.deepStrictEqual(JSON.parse(extra.text).rows, [row("069500", "1")]);

    // no argument: Phase 23 behavior
    const cst = fakeStorage();
    cst.m.set(K.DATA, "{bad");
    assert.deepStrictEqual(mk(cst).exportText(), { ok: false, error: "CORRUPT" });
}

console.log("portfolio_store_check OK");
