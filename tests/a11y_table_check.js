"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

let src = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

const noop = () => {};
const events = [];
function makeEl(tag) {
    const el = {
        tag,
        attrs: {},
        dataset: {},
        children: [],
        innerHTML: "",
        classList: { add: noop, remove: noop, contains: () => false },
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return this.attrs[k]; },
        appendChild(c) { this.children.push(c); return c; },
        addEventListener: noop,
        querySelector() { return makeEl("td"); },
    };
    return el;
}
const tbody = makeEl("tbody");
const sandbox = {
    document: {
        addEventListener: noop,
        getElementById: (id) => (id === "tableBody" ? tbody : null),
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: makeEl,
        body: { dataset: { page: "home" }, getAttribute: () => null, classList: { add: noop, remove: noop, contains: () => false } },
        dispatchEvent: (e) => { events.push(e.type); return true; },
    },
    window: { innerWidth: 1200, location: { pathname: "/", search: "", href: "http://x/" }, addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }) },
    CustomEvent: function (type) { this.type = type; },
    navigator: { language: "ko" },
    localStorage: { getItem: () => null, setItem: noop },
    console,
    Intl,
    URL,
    setTimeout,
    clearTimeout,
};
const ctx = vm.createContext(sandbox);
vm.runInContext(src, ctx, { filename: "script.js" });
vm.runInContext(
    'currentTranslations = {aria_value_missing:"MISSING_TXT", aria_fee_up:"UP_TXT", aria_fee_down:"DOWN_TXT", table_code:"Code"}',
    ctx
);

const row = { "종목코드": "360200", "종목명": "A", "총보수": 0.0005, "기타비용": null, "매매중개수수료": null, "실부담비용": 0.001, "AUM": 1000, "거래량": 10 };
events.length = 0;
ctx.renderTable([row]);
assert.deepStrictEqual(events, ["etf:table-rendered"]);
assert.strictEqual(tbody.children.length, 1);
const tr = tbody.children[0];
assert.strictEqual(tr.attrs.role, "row");
const html = tr.innerHTML;
assert.strictEqual((html.match(/class="cell-label"/g) || []).length, 8);
assert.strictEqual((html.match(/class="cell-label" aria-hidden="true"/g) || []).length, 1);
assert.strictEqual((html.match(/<span class="cell-label"/g) || []).length, 8);
assert.strictEqual((html.match(/role="cell"/g) || []).length, 8);
assert.ok(/code-cell" role="cell"[^>]*><span class="cell-label" aria-hidden="true">/.test(html));
assert.ok(html.includes('class="sr-only">MISSING_TXT</span>'));
assert.ok(html.includes('aria-hidden="true">-</span>'));

const down = ctx.buildChangeBadgeHtml({ diff: -0.005 }, 0.045);
assert.ok(down.includes("fee-change down") && down.includes("▼") && down.includes('class="sr-only"') && down.includes("DOWN_TXT"));
const up = ctx.buildChangeBadgeHtml({ diff: 0.005 }, 0.045);
assert.ok(up.includes("fee-change up") && up.includes("▲") && up.includes("UP_TXT"));

assert.strictEqual(ctx.feeCellHtml(null, "360200", "A", "real"), "-");

events.length = 0;
ctx.renderTable([]);
assert.deepStrictEqual(events, ["etf:table-rendered"]);

console.log("a11y_table_check OK");
