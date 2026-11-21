"use strict";
const assert = require("assert");
const path = require("path");
const P = require(path.join(__dirname, "..", "portfolio", "portfolio-calc.js"));

function approx(actual, expected, tol, label) {
    assert.ok(Math.abs(actual - expected) <= tol, label + ": " + actual + " vs " + expected);
}
const TODAY = { todayIso: "2026-11-21" };
const find = (w, type) => w.filter((x) => x.type === type);

// shape
{
    ["normalizeCode", "validateQty", "qtyToNumber", "validateDate", "compute"].forEach((k) =>
        assert.strictEqual(typeof P[k], "function", k));
    assert.ok(Object.isFrozen(P.LIMITS));
    assert.strictEqual(P.LIMITS.JUMP_RATIO, 0.4);
    assert.strictEqual(P.LIMITS.MAX_ROWS, 200);
}

// validateQty
{
    ["1", "0.5", "1.12345678", "100000000000"].forEach((q) => assert.strictEqual(P.validateQty(q), null, q));
    ["1.123456789", "1e-7", "-1", "NaN", "Infinity", "1,5", ".5", " 1", "", 1].forEach((q) =>
        assert.strictEqual(P.validateQty(q), "QTY_FORMAT", String(q)));
    ["0", "0.00000000"].forEach((q) => assert.strictEqual(P.validateQty(q), "QTY_NONPOSITIVE", q));
    assert.strictEqual(P.qtyToNumber("0.5"), 0.5);
    assert.ok(Number.isNaN(P.qtyToNumber("1e-7")));
}

// normalizeCode
{
    assert.strictEqual(P.normalizeCode("69500"), "069500");
    assert.strictEqual(P.normalizeCode(69500), "069500");
    assert.strictEqual(P.normalizeCode("0026s0"), "0026S0");
    assert.strictEqual(P.normalizeCode(" 0069M0 "), "0069M0");
    assert.strictEqual(P.normalizeCode(null), "");
    assert.strictEqual(P.normalizeCode(""), "");
}

// validateDate
{
    assert.strictEqual(P.validateDate("2025-02-30"), "DATE_INVALID");
    assert.strictEqual(P.validateDate("2025/01/02"), "DATE_FORMAT");
    assert.strictEqual(P.validateDate("2030-01-01", "2026-11-21"), "DATE_FUTURE");
    assert.strictEqual(P.validateDate("2026-11-21", "2026-11-21"), null);
    assert.strictEqual(P.validateDate("2024-02-29", "2026-11-21"), null);
}

// fractional qty
{
    const r = P.compute([{ code: "A", qty: "0.5", startDate: "2026-01-02" }],
        { A: { dates: ["2026-01-02"], close: [10000] } }, TODAY);
    approx(r.total[0], 5000, 1e-9, "fractional");
}

// forward-fill + union axis + startDate
{
    const prices = {
        A: { dates: ["2026-01-02", "2026-01-05"], close: [100, 110] },
        B: { dates: ["2026-01-02", "2026-01-03", "2026-01-05"], close: [10, 20, 30] }
    };
    const rows = [
        { code: "A", qty: "1", startDate: "2026-01-02" },
        { code: "B", qty: "2", startDate: "2026-01-03" }
    ];
    const r = P.compute(rows, prices, TODAY);
    assert.deepStrictEqual(r.dates, ["2026-01-02", "2026-01-03", "2026-01-05"]);
    assert.deepStrictEqual(r.byCode.A, [100, 100, 110]); // A forward-filled on 01-03
    assert.deepStrictEqual(r.byCode.B, [0, 40, 60]); // 0 before startDate
    assert.deepStrictEqual(r.total, [100, 140, 170]);
    assert.strictEqual(r.asOf, "2026-01-05");
    // dates before min startDate dropped
    const r2 = P.compute([{ code: "B", qty: "1", startDate: "2026-01-03" }], prices, TODAY);
    assert.deepStrictEqual(r2.dates, ["2026-01-03", "2026-01-05"]);
}

// delisted
{
    const prices = {
        A: { dates: ["2026-01-02", "2026-01-05"], close: [100, 110] },
        B: { dates: ["2026-01-02", "2026-01-05", "2026-01-06"], close: [10, 11, 12] }
    };
    const r = P.compute([{ code: "A", qty: "1", startDate: "2026-01-02" },
        { code: "B", qty: "1", startDate: "2026-01-02" }], prices, TODAY);
    assert.deepStrictEqual(r.byCode.A, [100, 110, 110]);
    assert.deepStrictEqual(find(r.warnings, "delisted"), [{ type: "delisted", code: "A", date: "2026-01-05" }]);
}

// jump
{
    const up = P.compute([{ code: "A", qty: "1", startDate: "2026-01-02" }],
        { A: { dates: ["2026-01-02", "2026-01-05", "2026-01-06"], close: [10000, 15000, 19500] } }, TODAY);
    assert.deepStrictEqual(find(up.warnings, "jump"), [{ type: "jump", code: "A", date: "2026-01-05" }]);
    assert.deepStrictEqual(up.total, [10000, 15000, 19500]); // values unmodified
    const none = P.compute([{ code: "A", qty: "1", startDate: "2026-01-02" }],
        { A: { dates: ["2026-01-02", "2026-01-05"], close: [10000, 13000] } }, TODAY);
    assert.strictEqual(find(none.warnings, "jump").length, 0);
}

// alphanumeric code
{
    const r = P.compute([{ code: "0026s0", qty: "2", startDate: "2026-01-02" }],
        { "0026S0": { dates: ["2026-01-02"], close: [5] } }, TODAY);
    assert.deepStrictEqual(Object.keys(r.byCode), ["0026S0"]);
    assert.deepStrictEqual(r.total, [10]);
}

// same code, two rows
{
    const r = P.compute([{ code: "A", qty: "1", startDate: "2026-01-02" },
        { code: "A", qty: "2", startDate: "2026-01-05" }],
        { A: { dates: ["2026-01-02", "2026-01-05"], close: [10, 20] } }, TODAY);
    assert.deepStrictEqual(r.byCode.A, [10, 60]);
    assert.deepStrictEqual(r.total, [10, 60]);
}

// invalid row, no_data
{
    const prices = { A: { dates: ["2026-01-02"], close: [10] } };
    const r = P.compute([
        { code: "A", qty: "1e-7", startDate: "2026-01-02" },
        { code: "A", qty: "1", startDate: "2026-13-01" },
        { code: "Z", qty: "1", startDate: "2026-01-02" },
        { code: "A", qty: "3", startDate: "2026-01-02" }
    ], prices, TODAY);
    assert.deepStrictEqual(find(r.warnings, "invalid_row"), [
        { type: "invalid_row", row: 1, error: "QTY_FORMAT" },
        { type: "invalid_row", row: 2, error: "DATE_INVALID" }
    ]);
    assert.deepStrictEqual(find(r.warnings, "no_data"), [{ type: "no_data", code: "Z", row: 3 }]);
    assert.deepStrictEqual(r.total, [30]);
}

// series empty after dropping non-finite closes -> no_data, not zero
{
    const r = P.compute([{ code: "A", qty: "1", startDate: "2026-01-02" }],
        { A: { dates: ["2026-01-02", "2026-01-05"], close: [null, NaN] } }, TODAY);
    assert.deepStrictEqual(find(r.warnings, "no_data"), [{ type: "no_data", code: "A", row: 1 }]);
    assert.deepStrictEqual(r.dates, []);
}

// non-finite closes skipped (not zero)
{
    const r = P.compute([{ code: "A", qty: "1", startDate: "2026-01-02" }],
        { A: { dates: ["2026-01-02", "2026-01-05", "2026-01-06"], close: [10, null, 12] } }, TODAY);
    assert.deepStrictEqual(r.dates, ["2026-01-02", "2026-01-06"]);
    assert.deepStrictEqual(r.total, [10, 12]);
}

// overflow -> non_finite row excluded
{
    const r = P.compute([
        { code: "A", qty: "999999999999.99999999", startDate: "2026-01-02" },
        { code: "B", qty: "1", startDate: "2026-01-02" }
    ], { A: { dates: ["2026-01-02"], close: [1e308] }, B: { dates: ["2026-01-02"], close: [7] } }, TODAY);
    assert.strictEqual(find(r.warnings, "non_finite")[0].row, 1);
    assert.deepStrictEqual(r.total, [7]);
    assert.ok(r.total.every(Number.isFinite));
}

// immutability
{
    const deepFreeze = (o) => { Object.values(o).forEach((v) => typeof v === "object" && v && deepFreeze(v)); return Object.freeze(o); };
    const rows = deepFreeze([{ code: "A", qty: "1", startDate: "2026-01-02" }]);
    const prices = deepFreeze({ A: { dates: ["2026-01-06", "2026-01-02"], close: [12, 10] } });
    const snap = JSON.stringify([rows, prices]);
    const r = P.compute(rows, prices, TODAY);
    assert.strictEqual(JSON.stringify([rows, prices]), snap);
    assert.deepStrictEqual(r.total, [10, 12]); // unsorted input handled via copy
}

// empty
{
    assert.deepStrictEqual(P.compute([], {}), { dates: [], total: [], byCode: {}, warnings: [], asOf: null });
}

console.log("portfolio_calc_check OK");
