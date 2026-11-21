"use strict";
const assert = require("assert");
const F = require("../portfolio/portfolio-format.js");
const M = "−";
const near = (a, b, e) => assert.ok(Math.abs(a - b) <= (e || 1e-9), a + " vs " + b);

// ---- numbers ----
assert.strictEqual(F.formatWon(1234567.6, "ko-KR"), "1,234,568");
assert.strictEqual(F.formatWon(NaN), "-");
assert.strictEqual(F.formatFee(0.0047), "0.0047");
assert.strictEqual(F.formatFee(0.12), "0.12");
assert.strictEqual(F.formatFee(0.5), "0.50");
assert.strictEqual(F.formatFee(0.123456), "0.1235");
assert.strictEqual(F.formatFee(null), "-");
assert.strictEqual(F.localTodayIso(new Date(2026, 0, 5)), "2026-01-05");
assert.ok(typeof F.formatCompact(12345678, "en-US") === "string");

// ---- dayChange ----
assert.deepStrictEqual(F.dayChange([100, 110], "ko-KR"), { dir: "up", arrow: "▲", amount: "+10", pct: "+10.00%" });
assert.deepStrictEqual(F.dayChange([110, 100], "ko-KR"), { dir: "down", arrow: "▼", amount: M + "10", pct: M + "9.09%" });
assert.deepStrictEqual(F.dayChange([5, 5], "ko-KR"), { dir: "flat", arrow: "–", amount: "0", pct: "0.00%" });
assert.strictEqual(F.dayChange([0, 50], "ko-KR").pct, "-");
assert.strictEqual(F.dayChange([7], "ko-KR"), null);

// ---- periodStartIndex ----
{
    const d = ["2026-01-30", "2026-02-27", "2026-02-28", "2026-03-02", "2026-03-31"];
    assert.strictEqual(F.periodStartIndex(d, "1m"), 2); // target 2026-02-28
    assert.strictEqual(F.periodStartIndex(d, "all"), 0);
    assert.strictEqual(F.periodStartIndex(d, "1y"), 0); // before dates[0]
    const y = ["2023-02-27", "2023-02-28", "2023-06-01", "2024-02-29"];
    assert.strictEqual(F.periodStartIndex(y, "1y"), 1); // target 2023-02-28
}

// ---- tableRows ----
{
    const dates = Array.from({ length: 10 }, (_, i) => "2026-01-" + String(i + 1).padStart(2, "0"));
    const vals = dates.map((_, i) => 100 + i);
    const t = F.tableRows(dates, vals, "ko-KR");
    assert.strictEqual(t.monthly, false);
    assert.strictEqual(t.rows.length, 10);
    assert.strictEqual(t.rows[0].date, "2026-01-10");
    assert.strictEqual(t.rows[9].change, null);
    assert.strictEqual(t.rows[0].change.amount, "+1");

    const start = Date.UTC(2025, 0, 1);
    const dd = [];
    for (let i = 0; i < 300; i++) dd.push(new Date(start + i * 86400000 * 1.5).toISOString().slice(0, 10));
    const vv = dd.map((_, i) => 1000 + i * 3);
    const m = F.tableRows(dd, vv, "ko-KR", 130);
    assert.strictEqual(m.monthly, true);
    assert.strictEqual(m.rows[0].date, dd[299]);
    const months = new Set(m.rows.map((r) => r.date.slice(0, 7)));
    assert.strictEqual(months.size, m.rows.length);
    // change is vs the previous daily point, not previous month-end row
    assert.strictEqual(m.rows[0].change.amount, "+3");
}

// ---- weights / latest / fee ----
{
    const res = { total: [10, 100], byCode: { A: [5, 30], B: [5, 70] } };
    assert.deepStrictEqual(F.latestByCode(res), { A: 30, B: 70 });
    const w = F.weights(res);
    assert.deepStrictEqual(w.map((x) => x.code), ["B", "A"]);
    near(w[0].pct + w[1].pct, 100, 0.01);
    const z = F.weights({ total: [0], byCode: { A: [0] } });
    assert.strictEqual(z[0].pct, null);

    const fees = { A: 0.1, B: 0.3, C: null, D: 0.2 };
    const r = F.weightedFee({ A: 1000, B: 3000, C: 500, D: 0 }, (c) => fees[c]);
    near(r.fee, 0.25);
    near(r.cost, 10);
    assert.deepStrictEqual(r.included, ["A", "B"]);
    assert.deepStrictEqual(r.excluded, ["C"]);
    assert.strictEqual(F.weightedFee({ A: 1, C: 2 }, () => null), null);
}

// ---- rowLatestValue / firstPriceDate ----
{
    const e = { dates: ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-06"], close: [null, 100, 150, null] };
    assert.strictEqual(F.rowLatestValue({ qty: "2", startDate: "2025-01-02" }, e, "2025-01-06"), 300);
    assert.strictEqual(F.rowLatestValue({ qty: "2", startDate: "2025-01-02" }, { dates: ["x"], close: [null] }, "2025-01-06"), null);
    assert.strictEqual(F.rowLatestValue({ qty: "2", startDate: "2025-02-01" }, e, "2025-01-06"), 0);
    assert.strictEqual(F.firstPriceDate(e), "2025-01-02");
    assert.strictEqual(F.firstPriceDate({ dates: ["a"], close: [null] }), null);
}

// ---- matching ----
{
    const list = [{ code: "069500", name: "KODEX 200" }, { code: "0026S0", name: "TIGER foo" }, { code: "069660", name: "KOSEF 200" }];
    assert.deepStrictEqual(F.matchOptions(list, "kodex").map((x) => x.code), ["069500"]);
    assert.deepStrictEqual(F.matchOptions(list, "69500").map((x) => x.code), ["069500"]);
    assert.deepStrictEqual(F.matchOptions(list, "0695").map((x) => x.code), ["069500"]);
    assert.deepStrictEqual(F.matchOptions(list, "200").map((x) => x.code), ["069500", "069660"]);
    assert.deepStrictEqual(F.matchOptions(list, "  "), []);
    const big = Array.from({ length: 20 }, (_, i) => ({ code: "A" + i, name: "same" }));
    assert.strictEqual(F.matchOptions(big, "same").length, 8);

    const sel = { code: "069500", label: "KODEX 200 · 069500" };
    assert.strictEqual(F.resolveCode("KODEX 200 · 069500", sel, list), "069500");
    assert.strictEqual(F.resolveCode("69500", null, list), "069500");
    assert.strictEqual(F.resolveCode("KODEX", null, list), null);
    assert.strictEqual(F.resolveCode("0026s0", sel, list), "0026S0");
    assert.strictEqual(F.resolveCode("999999", sel, list), null);
}

// ---- warnings ----
{
    const ws = [
        { type: "jump", code: "A", date: "2026-01-02" },
        { type: "delisted", code: "A", date: "2026-01-03" },
        { type: "non_finite", code: "B", row: 2 },
        { type: "invalid_row", row: 3, error: "x" },
        { type: "no_data", code: "F", row: 4 },
        { type: "no_data", code: "G", row: 5 }
    ];
    const it = F.warningItems({
        warnings: ws, fetchFailed: ["F"], preListing: [{ code: "A", date: "2025-01-01" }],
        nameOf: (c) => (c === "A" ? "Alpha" : "")
    });
    assert.deepStrictEqual(it.map((x) => x.key), [
        "pf_warn_fetch", "pf_warn_no_data", "pf_warn_invalid_row", "pf_warn_non_finite",
        "pf_warn_delisted", "pf_warn_jump", "pf_warn_pre_listing"
    ]);
    assert.deepStrictEqual(it[1].vars, { name: "G", code: "G", row: 5 });
    assert.strictEqual(it[4].vars.name, "Alpha");
    assert.strictEqual(it[6].vars.date, "2025-01-01");
}

// ---- import / storage errors ----
{
    const r = F.importErrorItems([
        { row: 2, field: "code", error: "CODE_NOT_ALLOWED" },
        { row: 3, field: "qty", error: "QTY_FORMAT" },
        { row: 4, field: "qty", error: "QTY_NONPOSITIVE" },
        { row: 5, field: "startDate", error: "DATE_FORMAT" },
        { row: 6, field: "startDate", error: "DATE_INVALID" },
        { row: 7, field: "startDate", error: "DATE_FUTURE" },
        { row: 0, field: "rows", error: "ROWS_LIMIT" },
        { row: 0, field: "rows", error: "ROWS_NOT_ARRAY" },
        { row: 8, field: "rows", error: "ROW_FORMAT" }
    ]);
    assert.deepStrictEqual(r.items.map((x) => x.messageKey), [
        "pf_err_code", "pf_err_qty_format", "pf_err_qty_nonpositive", "pf_err_date_format",
        "pf_err_date_invalid", "pf_err_date_future", "pf_import_rows_limit", "pf_import_rows_format", "pf_import_rows_format"
    ]);
    assert.deepStrictEqual(r.items.map((x) => x.fieldKey).slice(0, 6), [
        "pf_field_code", "pf_field_qty", "pf_field_qty", "pf_field_date", "pf_field_date", "pf_field_date"
    ]);
    assert.deepStrictEqual(r.items.map((x) => x.withRow), [true, true, true, true, true, true, false, false, false]);
    assert.strictEqual(r.items[6].vars.max, 200);
    assert.strictEqual(r.more, 0);
    const many = F.importErrorItems(Array.from({ length: 25 }, () => ({ row: 1, field: "qty", error: "QTY_FORMAT" })));
    assert.strictEqual(many.items.length, 20);
    assert.strictEqual(many.more, 5);

    assert.strictEqual(F.storageErrorKey("STORAGE_UNAVAILABLE"), "pf_storage_unavailable");
    assert.strictEqual(F.storageErrorKey("QUOTA_EXCEEDED"), "pf_storage_quota");
    assert.strictEqual(F.storageErrorKey("CORRUPT"), "pf_storage_corrupt");
    assert.strictEqual(F.storageErrorKey("UNSUPPORTED_VERSION"), "pf_storage_version");
    assert.strictEqual(F.storageErrorKey("INVALID_ROWS"), "pf_storage_invalid");
    assert.strictEqual(F.storageErrorKey("ROWS_DROPPED"), "pf_storage_invalid");
    assert.strictEqual(F.storageErrorKey(undefined), null);
}

console.log("portfolio_view_check OK");
