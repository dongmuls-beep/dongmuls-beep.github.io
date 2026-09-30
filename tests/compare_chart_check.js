"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
function readSrc(name) {
    let s = fs.readFileSync(path.join(ROOT, name), "utf8");
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    return s;
}
const noop = () => {};

// ---------- fake DOM ----------
function fakeEl(tag) {
    const el = {
        tag, attrs: {}, children: [], className: "", innerHTML: "", dataset: {}, listeners: {},
        clientWidth: 0, focused: false, _text: "",
        setAttribute(k, v) { this.attrs[k] = String(v); if (k === "class") this.className = String(v); },
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        removeAttribute(k) { delete this.attrs[k]; },
        appendChild(c) { this.children.push(c); c.parent = this; return c; },
        addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
        focus() { this.focused = true; },
        closest(sel) {
            const m = /^\[([\w-]+)\]$/.exec(sel);
            return m && (m[1] in this.attrs) ? this : null;
        },
    };
    Object.defineProperty(el, "textContent", {
        get() { return this._text; },
        set(v) { this._text = String(v); this.children = []; },
    });
    return el;
}
function walk(node, fn) {
    fn(node);
    (node.children || []).forEach((c) => walk(c, fn));
}
function findAll(node, pred) {
    const out = [];
    walk(node, (n) => { if (pred(n)) out.push(n); });
    return out;
}

const byId = {};
["cmp-chart", "cmp-chart-body"].forEach((id) => { byId[id] = fakeEl("div"); byId[id].id = id; });
byId["cmp-chart"].setAttribute("hidden", "");
const announced = [];
const renderCallbacks = [];
let matchMediaResult = true;

const sandbox = {
    document: {
        addEventListener: noop,
        getElementById: (id) => byId[id] || null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: (tag) => { const e = fakeEl(tag); return e; },
        createElementNS: (_ns, tag) => fakeEl(tag),
    },
    window: { addEventListener: noop, matchMedia: () => ({ matches: matchMediaResult, addEventListener: noop }) },
    navigator: { language: "ko" },
    localStorage: { getItem: () => null, setItem: noop },
    console,
    Intl, URL, URLSearchParams, setTimeout, clearTimeout,
};
const ctx = vm.createContext(sandbox);
vm.runInContext(readSrc("script.js"), ctx, { filename: "script.js" });
vm.runInContext(readSrc("compare-view.js"), ctx, { filename: "compare-view.js" });

const TR = {
    table_fee: "총보수(%)", table_other: "기타비용(%)", table_trade: "매매중개수수료(%)", table_real: "실부담비용(%)",
    table_value_missing: "-",
    fee_history_loading: "불러오는 중",
    compare_retry: "다시 시도",
    compare_chart_metric_label: "지표",
    compare_chart_legend: "범례",
    compare_chart_legend_item: "{name} ({code}) {value}",
    compare_chart_no_history: "(기록 없음)",
    compare_chart_excluded: "{name}: 값 없음",
    compare_chart_aria: "{metric} {start}~{end} {count}개 ETF",
    compare_chart_switched: "{metric} 지표로 전환",
    compare_chart_error: "차트를 불러오지 못했어요.",
    compare_chart_table_title: "차트 데이터 표",
    compare_chart_tbl_etf: "ETF",
    compare_chart_tbl_start: "기록 시작일",
    compare_chart_tbl_first: "시작 값",
    compare_chart_tbl_now: "현재 값",
    compare_chart_tbl_changes: "변동 횟수",
};
vm.runInContext("currentTranslations = " + JSON.stringify(TR), ctx);

// Stub CompareView hooks BEFORE loading compare-chart.js
ctx.CompareView.onRender = (fn) => renderCallbacks.push(fn);
ctx.CompareView.announce = (text) => announced.push(text);
vm.runInContext(readSrc("compare-chart.js"), ctx, { filename: "compare-chart.js" });
const CC = ctx.CompareChart;
assert.ok(CC, "CompareChart global exists");
assert.strictEqual(renderCallbacks.length, 1, "one onRender registration");

const plain = (v) => JSON.parse(JSON.stringify(v));
const has = (s) => vm.runInContext(s, ctx);
const TODAY = "2026-09-30";
const noBad = (s) => assert.ok(!/NaN|Infinity/.test(s), s);

// ---------- WR-03: startDate honored by reused primitives ----------
{
    const pts = [{ date: "2026-03-01", value: 0.0055 }, { date: "2026-06-01", value: 0.0045 }];
    ctx.__pts = pts;
    const sc = has("computeFeeChartScale(__pts.map(p => p.value))");
    ctx.__sc = sc;
    const early = has('buildFeeLinePath(__pts, __sc, "2026-09-30", "2026-01-01")');
    const m = /^M([\d.]+)/.exec(early);
    assert.ok(m, early);
    assert.ok(Number(m[1]) > 12, "earlier startDate pushes first x right of left: " + early);
    assert.strictEqual(Number(m[1]), has('feeChartRound(feeChartX("2026-03-01", "2026-01-01", "2026-09-30"))'));
    const same = has('buildFeeLinePath(__pts, __sc, "2026-09-30", "2026-03-01")');
    assert.ok(same.startsWith("M12"), same);
    const right = has("FEE_CHART.right");
    for (const d of [early, same]) {
        noBad(d);
        const ends = /([\d.]+)(?:\s[\d.]+)?$/.exec(d);
        assert.ok(d.includes("H" + right) || Number(/([\d.]+)\s[\d.]+$/.exec(d)[1]) === right, "ends at right edge: " + d);
    }
}

// ---------- buildOverlayModel ----------
const items = [
    { code: "AAA111", name: "One", fee: 0.1, other: 0.02, trade: 0.01, real: 0.0055 },
    { code: "BBB222", name: "Two", fee: 0.2, other: 0.03, trade: 0.02, real: 0.0045 },
    { code: "CCC333", name: "Three", fee: 0.3, other: 0.04, trade: 0.03, real: 0.006 },
    { code: "DDD444", name: "Four", fee: 0.4, other: 0.05, trade: 0.04, real: null },
];
const history = {
    series: {
        AAA111: {
            "실부담비용": [["2026-03-01", 0.0070], ["2026-06-01", 0.0060]],
            "총보수": [["2026-03-01", 0.15]],
        },
        BBB222: { "실부담비용": [["2026-01-15", 0.0050], ["2026-05-01", 0.0048]] },
    },
};
const historyBefore = JSON.stringify(history);
const itemsBefore = JSON.stringify(items);
{
    const model = plain(CC.buildOverlayModel(items, history, "real", TODAY));
    assert.deepStrictEqual(model.series.map((s) => s.code), ["AAA111", "BBB222", "CCC333", "DDD444"]);
    assert.deepStrictEqual(model.series.map((s) => s.index), [1, 2, 3, 4]);
    assert.strictEqual(model.start, "2026-01-15");
    assert.strictEqual(model.end, TODAY);
    const [a, b, c, d] = model.series;
    assert.strictEqual(a.hasHistory, true);
    assert.strictEqual(a.firstDate, "2026-03-01");
    assert.strictEqual(a.firstValue, 0.007);
    assert.strictEqual(a.current, 0.0055);
    assert.strictEqual(a.changes, a.points.length - 1);
    assert.ok(a.changes >= 1);
    assert.strictEqual(b.firstDate, "2026-01-15");
    assert.strictEqual(c.hasHistory, false);
    assert.deepStrictEqual(c.points, [{ date: "2026-01-15", value: 0.006 }]);
    assert.strictEqual(c.changes, 0);
    assert.strictEqual(c.firstDate, null);
    assert.strictEqual(d.excluded, true);
    assert.strictEqual(d.points.length, 0);
    // shared scale covers all included values
    const all = model.series.filter((s) => !s.excluded).flatMap((s) => s.points.map((p) => p.value));
    assert.ok(model.scale.min <= Math.min(...all) && model.scale.max >= Math.max(...all));
    assert.strictEqual(model.scale.ticks.length, 3);
    // no-history path is a flat line from the left edge
    ctx.__m = model;
    const cpath = has("buildFeeLinePath(__m.series[2].points, __m.scale, __m.end, __m.start)");
    assert.ok(/^M12 [\d.]+H\d+$/.test(cpath), cpath);
}
{
    const fee = plain(CC.buildOverlayModel(items, history, "fee", TODAY));
    assert.strictEqual(fee.series[0].current, 0.1);
    assert.strictEqual(fee.series[0].firstValue, 0.15);
    assert.strictEqual(fee.series[3].excluded, false);
    assert.strictEqual(fee.series[3].current, 0.4);
    assert.strictEqual(fee.series[1].hasHistory, false);
}
{
    const none = plain(CC.buildOverlayModel(items, { series: {} }, "real", TODAY));
    assert.strictEqual(none.start, TODAY);
    assert.strictEqual(none.end, TODAY);
    none.series.filter((s) => !s.excluded).forEach((s) => {
        assert.strictEqual(s.points.length, 1);
        assert.strictEqual(s.points[0].date, TODAY);
    });
    noBad(JSON.stringify(none));
    const nul = plain(CC.buildOverlayModel(items, null, "real", TODAY));
    assert.strictEqual(nul.start, TODAY);
}
assert.strictEqual(JSON.stringify(history), historyBefore, "history not mutated");
assert.strictEqual(JSON.stringify(items), itemsBefore, "items not mutated");

// ---------- renderOverlaySvg ----------
{
    const model = CC.buildOverlayModel(items, history, "real", TODAY);
    const svg = CC.renderOverlaySvg(model, "실부담비용", 400);
    assert.strictEqual(svg.attrs.viewBox, "0 0 400 200");
    assert.strictEqual(svg.attrs.role, "img");
    assert.strictEqual(svg.attrs.dir, "ltr");
    assert.strictEqual(svg.attrs["aria-describedby"], "cmp-chart-alt-table");
    assert.ok(svg.attrs["aria-label"].includes("실부담비용") && svg.attrs["aria-label"].includes("3개"), svg.attrs["aria-label"]);
    assert.strictEqual(has("FEE_CHART.width"), 400);
    assert.strictEqual(has("FEE_CHART.height"), 200);
    assert.strictEqual(has("FEE_CHART.right"), 388);
    const grid = findAll(svg, (n) => n.className === "fee-chart-grid");
    assert.strictEqual(grid.length, 3);
    const labels = findAll(svg, (n) => n.className === "fee-chart-label").map((n) => n.textContent);
    assert.ok(labels.includes("2026.01") && labels.includes("2026.09"), labels.join(","));
    const paths = findAll(svg, (n) => n.tag === "path");
    assert.strictEqual(paths.length, 3);
    assert.deepStrictEqual(paths.map((p) => p.className), ["cmp-line cmp-line-1", "cmp-line cmp-line-2", "cmp-line cmp-line-3"]);
    const markers = findAll(svg, (n) => /^cmp-marker /.test(n.className));
    assert.deepStrictEqual(markers.map((m) => m.tag), ["circle", "rect", "polygon"]);
    assert.strictEqual(Number(markers[0].attrs.cx), 388);
    ctx.__m = model;
    assert.strictEqual(Number(markers[0].attrs.cy), has("feeChartRound(feeChartY(__m.series[0].current, __m.scale))"));
    walk(svg, (n) => Object.values(n.attrs).forEach(noBad));
    // fourth series -> diamond
    const four = CC.buildOverlayModel(
        items.map((it) => Object.assign({}, it, { real: 0.005 })), { series: {} }, "real", TODAY);
    const svg4 = CC.renderOverlaySvg(four, "x", 100);
    assert.strictEqual(has("FEE_CHART.width"), 260, "min width 260");
    const m4 = findAll(svg4, (n) => /^cmp-marker /.test(n.className));
    assert.strictEqual(m4.length, 4);
    assert.strictEqual(m4[3].tag, "polygon");
    assert.notStrictEqual(m4[2].attrs.points, m4[3].attrs.points);
    assert.strictEqual(has("FEE_CHART.height"), 200);
}

// ---------- legend + table ----------
{
    const evil = items.map((it, i) => (i === 0 ? Object.assign({}, it, { name: "<b>X</b>" }) : it));
    const model = CC.buildOverlayModel(evil, history, "real", TODAY);
    const legend = CC.buildLegendHtml(model);
    assert.ok(!legend.includes("<b>"), "legend escaped");
    assert.ok(legend.includes("&lt;b&gt;"));
    assert.strictEqual((legend.match(/<li class="cmp-legend-item">/g) || []).length, 4);
    assert.strictEqual((legend.match(/class="cmp-swatch"/g) || []).length, 3);
    assert.ok(legend.includes("(기록 없음)"));
    assert.ok(legend.includes("Four: 값 없음") && legend.includes("cmp-legend-note"));
    assert.ok(legend.includes("0.0055%"), legend);
    const table = CC.buildAltTableHtml(model);
    assert.ok(table.includes('id="cmp-chart-alt-table"') && table.includes("cmp-chart-table"));
    assert.ok(!table.includes("<b>"));
    ["ETF", "기록 시작일", "시작 값", "현재 값", "변동 횟수"].forEach((h) => assert.ok(table.includes(">" + h + "<"), h));
    assert.strictEqual((table.match(/<tr>/g) || []).length, 1 + 3);
    assert.ok(table.includes("2026-03-01"));
    assert.ok(/<details class="cmp-chart-alt" open>/.test(table));
    matchMediaResult = false;
    assert.ok(!/ open>/.test(CC.buildAltTableHtml(model)));
    matchMediaResult = true;
    noBad(legend);
    noBad(table);
}

// ---------- DOM wiring ----------
(async () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));
    vm.runInContext("loadFeeHistory = () => Promise.resolve(__hist)", ctx);
    ctx.__hist = history;
    const onCtx = renderCallbacks[0];
    onCtx({ items, lang: "ko" });
    await flush();
    const body = byId["cmp-chart-body"];
    assert.strictEqual(byId["cmp-chart"].getAttribute("hidden"), null, "section un-hidden");
    const chips = findAll(body, (n) => n.className === "cmp-chip");
    assert.strictEqual(chips.length, 4);
    assert.deepStrictEqual(chips.map((c) => c.getAttribute("data-field")), ["real", "fee", "other", "trade"]);
    assert.deepStrictEqual(chips.map((c) => c.getAttribute("aria-pressed")), ["true", "false", "false", "false"]);
    assert.strictEqual(chips[0].textContent, "실부담비용");
    const figure = findAll(body, (n) => n.id === "cmp-chart-figure")[0];
    const legendEl = findAll(body, (n) => n.id === "cmp-chart-legend")[0];
    assert.strictEqual(figure.children.length, 1);
    assert.ok(legendEl.innerHTML.includes("cmp-legend"));
    const firstSvg = figure.children[0];

    // chip click
    const group = chips[0].parent;
    chips[1].focus();
    group.listeners.click[0]({ target: chips[1] });
    assert.deepStrictEqual(chips.map((c) => c.getAttribute("aria-pressed")), ["false", "true", "false", "false"]);
    assert.ok(chips[1].focused, "same chip keeps focus");
    assert.strictEqual(findAll(body, (n) => n.className === "cmp-chip").length, 4);
    assert.strictEqual(findAll(body, (n) => n.className === "cmp-chip")[1], chips[1], "chips not re-created");
    assert.strictEqual(figure.children.length, 1);
    assert.notStrictEqual(figure.children[0], firstSvg, "svg replaced");
    assert.ok(figure.children[0].attrs["aria-label"].includes("총보수"));
    assert.deepStrictEqual(announced, ["총보수 지표로 전환"]);

    // re-render (language change) keeps a single shell
    onCtx({ items, lang: "en" });
    assert.strictEqual(findAll(body, (n) => n.className === "cmp-chip").length, 4);
    assert.deepStrictEqual(chips.map((c) => c.getAttribute("aria-pressed")), ["false", "true", "false", "false"]);
    assert.strictEqual(body.listeners.click.length, 1, "one retry listener");
    assert.strictEqual(group.listeners.click.length, 1, "one chip listener");
    assert.strictEqual(has("FEE_CHART.height"), 200);
})().then(async () => {
    // error + retry in a fresh context
    const flush = () => new Promise((r) => setTimeout(r, 0));
    ["cmp-chart", "cmp-chart-body"].forEach((id) => { byId[id] = fakeEl("div"); byId[id].id = id; });
    byId["cmp-chart"].setAttribute("hidden", "");
    // reset module state by reloading the module into the same context
    renderCallbacks.length = 0;
    vm.runInContext(readSrc("compare-chart.js"), ctx, { filename: "compare-chart.js" });
    let calls = 0;
    ctx.__fail = () => { calls++; return Promise.reject(new Error("offline")); };
    vm.runInContext("loadFeeHistory = () => __fail()", ctx);
    renderCallbacks[0]({ items, lang: "ko" });
    await flush();
    const body = byId["cmp-chart-body"];
    const status = findAll(body, (n) => n.id === "cmp-chart-status")[0];
    assert.ok(status.innerHTML.includes("cmp-error"), status.innerHTML);
    assert.ok(status.innerHTML.includes("차트를 불러오지 못했어요."));
    assert.ok(status.innerHTML.includes("data-cmp-chart-retry"));
    assert.strictEqual(calls, 1);
    const retryBtn = fakeEl("button");
    retryBtn.setAttribute("data-cmp-chart-retry", "");
    body.listeners.click[0]({ target: retryBtn });
    await flush();
    assert.strictEqual(calls, 2, "retry calls loadFeeHistory again");
    assert.strictEqual(body.listeners.click.length, 1);

    // retry succeeds
    ctx.__ok = () => Promise.resolve({ series: {} });
    vm.runInContext("loadFeeHistory = () => __ok()", ctx);
    body.listeners.click[0]({ target: retryBtn });
    await flush();
    const figure = findAll(body, (n) => n.id === "cmp-chart-figure")[0];
    assert.strictEqual(figure.children.length, 1);
    assert.strictEqual(status.innerHTML, "");

    console.log("compare_chart_check OK");
}).catch((e) => { console.error(e); process.exit(1); });
