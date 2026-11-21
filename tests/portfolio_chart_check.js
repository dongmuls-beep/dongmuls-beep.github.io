"use strict";
const assert = require("assert");
const path = require("path");
const C = require(path.join(__dirname, "..", "portfolio", "portfolio-chart.js"));

const noNaN = (m) => assert.ok(!/NaN|null/.test(JSON.stringify(m)), "NaN/null in model");

// ---------- Task 1: geometry ----------
{
    const t = C.niceTicks(0, 1234567);
    assert.ok(t.length <= 5 && t.length >= 2);
    assert.strictEqual(t[0], 0);
    assert.ok(t[t.length - 1] >= 1234567);
    const step = t[1] - t[0];
    t.forEach((v, i) => assert.ok(Math.abs(v - i * step) < 1e-6));
    for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
}
{
    const m = C.buildModel([], [], 300, 240);
    assert.strictEqual(m.empty, true);
    assert.deepStrictEqual(m.points, []);
    assert.strictEqual(m.linePath, "");
    noNaN(m);
}
{
    const m = C.buildModel(["2024-01-02"], [500], 300, 240);
    assert.strictEqual(m.points.length, 1);
    assert.strictEqual(m.points[0].x, (m.plot.left + m.plot.right) / 2);
    assert.ok(isFinite(m.points[0].y));
    noNaN(m);
}
[[500, 500, 500], [0, 0]].forEach((vals) => {
    const m = C.buildModel(vals.map((_, i) => "2024-01-0" + (i + 1)), vals, 300, 240);
    m.points.forEach((p) => assert.ok(isFinite(p.y)));
    assert.ok(m.yMax > m.yMin);
    noNaN(m);
});
assert.ok(C.buildModel(["a", "b"], [900, 1000], 300, 240).yMin > 0);
assert.strictEqual(C.buildModel(["a", "b"], [100, 1000], 300, 240).yMin, 0);
{
    const dates = [], vals = [];
    for (let i = 0; i < 1000; i++) { dates.push("d" + i); vals.push(1000 + i); }
    const m = C.buildModel(dates, vals, 600, 240);
    assert.strictEqual(m.points.length, 400);
    assert.strictEqual(m.points[0].i, 0);
    assert.strictEqual(m.points[399].i, 999);
    for (let i = 1; i < m.points.length; i++) {
        assert.ok(m.points[i].x > m.points[i - 1].x);
        assert.ok(m.points[i].y < m.points[i - 1].y);
    }
    m.points.forEach((p) => assert.ok(p.x >= m.plot.left && p.x <= m.plot.right));
    assert.strictEqual(C.nearestIndex(m.points, m.points[10].x + 0.01), 10);
}
assert.strictEqual(C.moveCursor(0, "ArrowLeft", 5), 0);
assert.strictEqual(C.moveCursor(4, "ArrowRight", 5), 4);
assert.strictEqual(C.moveCursor(0, "PageDown", 100), 20);
assert.strictEqual(C.moveCursor(3, "End", 10), 9);
assert.strictEqual(C.moveCursor(3, "Home", 10), 0);
assert.strictEqual(C.moveCursor(3, "Tab", 10), 3);

// ---------- Task 2: render + keyboard ----------
function fakeEl(tag) {
    const el = {
        tag, attrs: {}, children: [], listeners: {}, _text: "", firstChild: null,
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        appendChild(c) { this.children.push(c); this.firstChild = this.children[0]; return c; },
        removeChild(c) { this.children.splice(this.children.indexOf(c), 1); this.firstChild = this.children[0] || null; },
        addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
        getBoundingClientRect() { return { left: 0, width: 300 }; },
    };
    Object.defineProperty(el, "textContent", { get() { return this._text; }, set(v) { this._text = String(v); } });
    return el;
}
function all(node, out = []) { out.push(node); node.children.forEach((c) => all(c, out)); return out; }
global.document = { createElementNS: (ns, t) => fakeEl(t), createElement: (t) => fakeEl(t) };

const dates = ["2024-01-01", "2024-01-02", "2024-01-03"];
const opts = {
    dates, values: [100, 200, 300], width: 300, ariaLabel: "chart", keysLabel: "keys",
    formatTick: (v) => "T" + v, formatReadout: (d, v) => d + "=" + v,
};
const box = fakeEl("div");
box.appendChild(fakeEl("stale"));
C.render(box, opts);
assert.strictEqual(box.children.length, 2);
const [group, readout] = box.children;
assert.strictEqual(group.attrs.tabindex, "0");
assert.strictEqual(group.attrs.role, "group");
assert.strictEqual(group.attrs["aria-label"], "keys");
const svg = group.children[0];
assert.strictEqual(svg.attrs.role, "img");
assert.strictEqual(svg.attrs.dir, "ltr");
assert.strictEqual(svg.attrs["aria-label"], "chart");
assert.strictEqual(svg.attrs["aria-describedby"], "pf-chart-table");
assert.strictEqual(readout.textContent, "2024-01-03=300");
const key = (k) => { let pd = false; group.listeners.keydown.forEach((f) => f({ key: k, preventDefault() { pd = true; } })); return pd; };
assert.strictEqual(key("ArrowLeft"), true);
assert.strictEqual(readout.textContent, "2024-01-02=200");
assert.strictEqual(key("End"), true);
assert.strictEqual(readout.textContent, "2024-01-03=300");
assert.strictEqual(key("Tab"), false);
{
    const heard = [];
    const b2 = fakeEl("div");
    C.render(b2, Object.assign({}, opts, { onCursor: (t) => heard.push(t) }));
    const g2 = b2.children[0];
    g2.listeners.keydown.forEach((f) => f({ key: "ArrowLeft", preventDefault() {} }));
    g2.listeners.keydown.forEach((f) => f({ key: "Tab", preventDefault() {} }));
    g2.listeners.pointermove.forEach((f) => f({ clientX: 0 }));
    assert.deepStrictEqual(heard, ["2024-01-02=200"]);
}
group.listeners.pointermove.forEach((f) => f({ clientX: 0 }));
assert.strictEqual(readout.textContent, "2024-01-01=100");
group.listeners.pointerleave.forEach((f) => f({}));
assert.strictEqual(readout.textContent, "2024-01-03=300");
all(box).forEach((n) => {
    assert.ok(!("aria-live" in n.attrs));
    assert.notStrictEqual(n.attrs.role, "status");
    Object.values(n.attrs).forEach((v) => assert.ok(!/NaN/.test(v)));
});

const empty = fakeEl("div");
C.render(empty, Object.assign({}, opts, { dates: [], values: [] }));
assert.strictEqual(empty.children[1].textContent, "");
all(empty).forEach((n) => Object.values(n.attrs).forEach((v) => assert.ok(!/NaN/.test(v))));

console.log("portfolio_chart_check OK");
