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

// line path (monotone cubic)
sc = context.computeFeeChartScale([0.0055]);
assert.strictEqual(context.buildFeeLinePath([{ date: "2026-02-12", value: 0.0055 }], sc, "2026-09-30"), "M12 104H308");
sc = context.computeFeeChartScale([0.0055, 0.0045]);
const d2 = context.buildFeeLinePath([{ date: "2026-02-12", value: 0.0055 }, { date: "2026-06-01", value: 0.0045 }], sc, "2026-09-30");
assert.ok(/^M12 [\d.]+C/.test(d2) && / 308 [\d.]+$/.test(d2), d2);
assert.ok(!/NaN|Infinity/.test(d2) && !/\d\.\d{3,}/.test(d2), d2);
// no overshoot: every y (incl. control points) stays within the plotted value range
const vals = [0.05, 0.045, 0.0453, 0.047];
sc = context.computeFeeChartScale(vals);
const dz = context.buildFeeLinePath(vals.map((v, i) => ({ date: `2026-0${i + 2}-10`, value: v })), sc, "2026-09-30");
const ys = [...dz.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => +m[2]);
const yMin = context.feeChartY(0.05, sc) - 0.01;
const yMax = context.feeChartY(0.045, sc) + 0.01;
assert.ok(ys.every((y) => y >= yMin && y <= yMax), dz);
const d3 = context.buildFeeLinePath([{ date: "2026-09-30", value: 0.0055 }], context.computeFeeChartScale([0.0055]), "2026-09-30");
assert.ok(/H308$/.test(d3) && !/NaN|Infinity/.test(d3));

// axis formatting
assert.strictEqual(context.formatFeeAxisValue(0.047), "0.047%");
assert.strictEqual(context.formatFeeAxisValue(0.05), "0.05%");
assert.strictEqual(context.formatFeeAxisValue(0.0047), "0.0047%");
assert.strictEqual(context.formatFeeAxisValue(1), "1.00%");
assert.strictEqual(context.formatFeeAxisDate("2026-02-12"), "2026.02");

// DATA-10 null-safe + seam (Phase 11)
for (const v of [0, 0.0045, "0.05", "0.05%"]) assert.strictEqual(context.isValidFee(v), true, String(v));
for (const v of [null, undefined, "", "-", "abc", NaN, Infinity]) assert.strictEqual(context.isValidFee(v), false, String(v));

const feeFixture = [0.3, null, 0.1, "-", NaN, 0.2, undefined];
const ascSorted = [...feeFixture].sort((a, b) => context.compareFeeNullLast(a, b, "asc"));
assert.deepStrictEqual(ascSorted.slice(0, 3), [0.1, 0.2, 0.3]);
assert.ok(ascSorted.slice(3).every((v) => !context.isValidFee(v)), String(ascSorted));
const descSorted = [...feeFixture].sort((a, b) => context.compareFeeNullLast(a, b, "desc"));
assert.deepStrictEqual(descSorted.slice(0, 3), [0.3, 0.2, 0.1]);
assert.ok(descSorted.slice(3).every((v) => !context.isValidFee(v)), String(descSorted));
const defSorted = [...feeFixture].sort((a, b) => context.compareFeeNullLast(a, b));
assert.deepStrictEqual(defSorted.slice(0, 3), ascSorted.slice(0, 3));
assert.ok(defSorted.slice(3).every((v) => !context.isValidFee(v)));

assert.strictEqual(context.missingValueText(), "-");

const missingCell = context.feeCellHtml(null, "360200", "A", "real");
assert.strictEqual(missingCell, "-");
assert.ok(!missingCell.includes("fee-history-btn"));
assert.strictEqual(context.feeCellHtml("abc", "360200", "A", "real"), "-");
const validCell = context.feeCellHtml(0.05, "360200", "A", "real");
assert.ok(validCell.includes("fee-history-btn") && validCell.includes("0.0500%"), validCell);

assert.strictEqual(context.changelogEntryFromChange({ before: null, after: 0.05 }), null);
assert.strictEqual(context.changelogEntryFromChange({ before: 0.05, after: null }), null);
assert.strictEqual(context.changelogEntryFromChange({ before: "x", after: 0.05 }), null);
assert.strictEqual(context.changelogEntryFromChange(null), null);
const clEntry = context.changelogEntryFromChange({ before: 0.05, after: 0.045 });
assert.ok(clEntry && clEntry.diff === -0.005, JSON.stringify(clEntry));

assert.strictEqual(context.buildChangeBadgeHtml(null, 0.05), "");
assert.strictEqual(context.buildChangeBadgeHtml({ diff: -0.005 }, null), "");
assert.strictEqual(context.buildChangeBadgeHtml({ diff: NaN }, 0.05), "");
assert.strictEqual(context.buildChangeBadgeHtml({ diff: 0 }, 0.05), "");
const downBadge = context.buildChangeBadgeHtml({ diff: -0.005 }, 0.045);
assert.ok(downBadge.includes("fee-change down") && downBadge.includes("▼"), downBadge);
const upBadge = context.buildChangeBadgeHtml({ diff: 0.01 }, 0.05);
assert.ok(upBadge.includes("fee-change up") && upBadge.includes("▲"), upBadge);

const startPts = [{ date: "2026-03-01", value: 0.0055 }, { date: "2026-06-01", value: 0.0045 }];
assert.strictEqual(context.buildFeeLinePath(startPts, sc, "2026-09-30", undefined), context.buildFeeLinePath(startPts, sc, "2026-09-30"));
const dStart = context.buildFeeLinePath(startPts, sc, "2026-09-30", "2026-01-01");
const startX = Number.parseFloat(/^M(-?[\d.]+)/.exec(dStart)[1]);
assert.ok(startX > 12 && !/NaN|Infinity/.test(dStart), dStart);

console.log("fee_chart_check OK");
