"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

let src = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

const noop = () => {};
const sandbox = {
    document: { addEventListener: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
    window: { addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }) },
    navigator: { language: "ko" },
    localStorage: { getItem: () => null, setItem: noop },
    console,
    Intl,
    URL,
    setTimeout,
    clearTimeout,
};
const context = vm.createContext(sandbox);
vm.runInContext(src, context, { filename: "script.js" });

const build = context.buildFeeHistoryPoints;
const plain = (v) => JSON.parse(JSON.stringify(v));

// current equals last -> nothing appended
assert.deepStrictEqual(plain(build([["2026-02-12", 0.0055]], 0.0055, "2026-09-30")), [{ date: "2026-02-12", value: 0.0055 }]);

// current differs -> appended as today
let r = plain(build([["2026-02-12", 0.0055]], 0.0045, "2026-09-30"));
assert.strictEqual(r.length, 2);
assert.deepStrictEqual(r[1], { date: "2026-09-30", value: 0.0045 });

// rounding to 4 decimals
assert.strictEqual(build([["2026-02-12", 0.0055]], 0.00550000001, "2026-09-30").length, 1);

// last date === today and differs -> replaced
r = plain(build([["2026-02-12", 0.0055], ["2026-09-30", 0.006]], 0.0045, "2026-09-30"));
assert.strictEqual(r.length, 2);
assert.deepStrictEqual(r[1], { date: "2026-09-30", value: 0.0045 });

// NaN current -> nothing appended
assert.strictEqual(build([["2026-02-12", 0.0055]], NaN, "2026-09-30").length, 1);

// invalid entries skipped, sorted ascending
r = plain(build([["2026-05-01", 0.02], "bad", ["2026-1-1", 0.1], ["2026-03-01", Infinity], ["2026-03-01", 0.01]], 0.02, "2026-09-30"));
assert.deepStrictEqual(r.map((p) => p.date), ["2026-03-01", "2026-05-01"]);

// non-array / empty
assert.strictEqual(build(null, 0.1, "2026-09-30").length, 0);
assert.strictEqual(build([], 0.1, "2026-09-30").length, 0);
assert.strictEqual(build({}, 0.1, "2026-09-30").length, 0);

// template
assert.strictEqual(context.formatFeeTemplate("{field} 변동 {count}회", { field: "총보수", count: 2 }), "총보수 변동 2회");
assert.strictEqual(context.formatFeeTemplate("{name} {unknown}", { name: "A" }), "A {unknown}");

// KST today
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(context.getKstToday()));

console.log("fee_chart_check OK");
