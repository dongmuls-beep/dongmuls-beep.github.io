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

// WR-02: today replacement equal to previous point -> merged, no zero-change point
r = plain(build([["2026-02-12", 0.0055], ["2026-09-30", 0.006]], 0.0055, "2026-09-30"));
assert.deepStrictEqual(r, [{ date: "2026-02-12", value: 0.0055 }]);
// WR-02: consecutive duplicate values in history -> collapsed
r = plain(build([["2026-01-01", 0.01], ["2026-02-01", 0.01], ["2026-03-01", 0.02], ["2026-04-01", 0.020000001]], 0.02, "2026-09-30"));
assert.deepStrictEqual(r.map((p) => p.date), ["2026-01-01", "2026-03-01"]);

// WR-03: device today earlier than last history date -> no today point, order kept
r = plain(build([["2026-02-12", 0.0055], ["2026-10-05", 0.006]], 0.0045, "2026-09-30"));
assert.deepStrictEqual(r.map((p) => p.date), ["2026-02-12", "2026-10-05"]);
assert.strictEqual(r[1].value, 0.006);

// non-array / empty
assert.strictEqual(build(null, 0.1, "2026-09-30").length, 0);
assert.strictEqual(build([], 0.1, "2026-09-30").length, 0);
assert.strictEqual(build({}, 0.1, "2026-09-30").length, 0);

// template
assert.strictEqual(context.formatFeeTemplate("{field} 변동 {count}회", { field: "총보수", count: 2 }), "총보수 변동 2회");
assert.strictEqual(context.formatFeeTemplate("{name} {unknown}", { name: "A" }), "A {unknown}");

// KST today
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(context.getKstToday()));

// chart scale
const near = (a, b) => Math.abs(a - b) < 1e-9;
let sc = context.computeFeeChartScale([0.0047]);
assert.ok(near(sc.min, 0.00235) && near(sc.max, 0.00705));
assert.strictEqual(sc.ticks.length, 3);
assert.ok(near(sc.ticks[1], 0.0047));
sc = context.computeFeeChartScale([0.0047, 0.005]);
assert.ok(near(sc.min, 0.0047 - 0.00003) && near(sc.max, 0.005 + 0.00003));
sc = context.computeFeeChartScale([0.05, 0.045, 0.0453]);
assert.ok(near(sc.min, 0.045 - 0.0005) && near(sc.max, 0.05 + 0.0005));
sc = context.computeFeeChartScale([0]);
assert.ok(Number.isFinite(sc.min) && Number.isFinite(sc.max) && sc.max > sc.min && sc.min >= 0);
sc = context.computeFeeChartScale([0, 0.01]);
assert.ok(sc.min >= 0);

// step path
sc = context.computeFeeChartScale([0.0055]);
assert.strictEqual(context.buildFeeStepPath([{ date: "2026-02-12", value: 0.0055 }], sc, "2026-09-30"), "M56 82H308");
sc = context.computeFeeChartScale([0.0055, 0.0045]);
const d2 = context.buildFeeStepPath([{ date: "2026-02-12", value: 0.0055 }, { date: "2026-06-01", value: 0.0045 }], sc, "2026-09-30");
const m2 = /^M56 ([\d.]+)H([\d.]+)V([\d.]+)H308$/.exec(d2);
assert.ok(m2, d2);
assert.ok(+m2[2] > 56 && +m2[2] < 308);
assert.ok(+m2[1] < +m2[3]);
assert.ok(!/\d\.\d{3,}/.test(d2));
const d3 = context.buildFeeStepPath([{ date: "2026-09-30", value: 0.0055 }], context.computeFeeChartScale([0.0055]), "2026-09-30");
assert.ok(/H308$/.test(d3) && !/NaN|Infinity/.test(d3));

console.log("fee_chart_check OK");
