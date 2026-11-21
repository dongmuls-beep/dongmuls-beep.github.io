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

console.log("portfolio_store_check OK");
