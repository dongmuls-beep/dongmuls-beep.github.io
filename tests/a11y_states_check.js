"use strict";
// A11Y-08: loading/error/empty/success state markup, announcements and Phase 11 event order.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

let src = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

const noop = () => {};
function fakeEl(tag) {
    return {
        tag, attrs: {}, children: [], className: "", textContent: "", innerHTML: "", dataset: {},
        listeners: [], focusCalls: 0,
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        appendChild(c) { this.children.push(c); return c; },
        addEventListener(type, fn) { this.listeners.push({ type, fn }); },
        querySelector() { return fakeEl("x"); },
        querySelectorAll() { return []; },
        removeAttribute: noop,
        focus() { this.focusCalls += 1; },
    };
}

const events = [];
let onEvent = null;
const els = {};
["tableBody", "tableStatus", "etfTableContainer", "changelogList", "changelogStatus"].forEach((id) => { els[id] = fakeEl(id); });
let fetchImpl = () => Promise.reject(new Error("offline"));

const sandbox = {
    document: {
        addEventListener: noop,
        body: { dataset: {}, getAttribute: () => null },
        documentElement: { lang: "ko" },
        getElementById: (id) => els[id] || null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: fakeEl,
        createElementNS: (_ns, tag) => fakeEl(tag),
        dispatchEvent: (e) => { events.push(e.type); if (onEvent) onEvent(e.type); return true; },
    },
    CustomEvent: class { constructor(type) { this.type = type; } },
    window: { location: { pathname: "/", search: "", href: "http://x/" }, addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }) },
    navigator: { language: "ko" },
    localStorage: { getItem: () => null, setItem: noop },
    fetch: (...a) => fetchImpl(...a),
    console: { ...console, error: noop, warn: noop },
    Intl,
    URL,
    setTimeout,
    clearTimeout,
};
const ctx = vm.createContext(sandbox);
vm.runInContext(src, ctx, { filename: "script.js" });
vm.runInContext(
    'currentTranslations = { table_loading: "Loading", table_error: "Failed<br>retry", table_empty: "No ETFs", table_retry: "Try again", table_reset_filter: "Show all ETFs", table_empty_hint: "Data not ready", aria_table_rows: "{count} ETFs shown", changelog_loading: "Loading log", changelog_empty: "No log", changelog_error: "Log <i>failed</i>" };',
    ctx
);

const count = (s, sub) => s.split(sub).length - 1;

(async () => {
    const tbody = els.tableBody;

    // a. loading snapshot
    let snapshot = null;
    onEvent = (type) => { if (snapshot === null && type === "etf:table-rendered") snapshot = tbody.innerHTML; };
    // b. failure
    await ctx.fetchData();
    onEvent = null;
    assert.strictEqual(count(snapshot, 'class="skeleton-row"'), 5, snapshot);
    assert.ok(snapshot.includes('aria-hidden="true"'));
    assert.deepStrictEqual(events, ["etf:table-rendered", "etf:table-rendered", "etf:data-error"]);
    assert.ok(tbody.innerHTML.includes('role="alert"'));
    assert.ok(tbody.innerHTML.includes("error-text"));
    assert.ok(tbody.innerHTML.includes('data-action="retry-fetch"'));
    assert.strictEqual(els.etfTableContainer.attrs["aria-busy"], "false");
    // WR-01: translation markup is stripped/escaped; WR-03: status no longer says "Loading"
    assert.ok(!tbody.innerHTML.includes("<br>"), tbody.innerHTML);
    assert.ok(tbody.innerHTML.includes("Failed retry"));
    assert.strictEqual(els.tableStatus.textContent, "Failed retry");

    // c. empty states
    events.length = 0;
    vm.runInContext("allData = []", ctx);
    ctx.renderTable([]);
    assert.deepStrictEqual(events, ["etf:table-rendered"]);
    assert.ok(tbody.innerHTML.includes("Data not ready"));
    assert.ok(!tbody.innerHTML.includes('data-action="reset-filter"'));
    assert.ok(els.tableStatus.textContent.length > 0);
    events.length = 0;
    vm.runInContext("allData = [{}]", ctx);
    ctx.renderTable([]);
    assert.deepStrictEqual(events, ["etf:table-rendered"]);
    assert.ok(tbody.innerHTML.includes('data-action="reset-filter"'));
    assert.ok(els.tableStatus.textContent.length > 0);

    // d. success announcement
    events.length = 0;
    ctx.renderTable([{ code: "069500", name: "KODEX 200", category: "x" }]);
    assert.strictEqual(els.tableStatus.textContent, "1 ETFs shown");
    assert.strictEqual(els.etfTableContainer.attrs["aria-busy"], "false");
    assert.strictEqual(events[events.length - 1], "etf:table-rendered");

    // e. changelog
    const list = els.changelogList;
    let clSnap = null;
    fetchImpl = () => { clSnap = list.innerHTML; return Promise.reject(new Error("x")); };
    await ctx.renderChangelog();
    assert.strictEqual(count(clSnap, "skeleton-card"), 3, clSnap);
    assert.ok(list.innerHTML.includes('data-action="retry-changelog"'));
    assert.ok(list.innerHTML.includes('role="alert"'));
    assert.strictEqual(list.attrs["aria-busy"], "false");
    // WR-01 / WR-03 for changelog
    assert.ok(!list.innerHTML.includes("<i>"), list.innerHTML);
    assert.ok(list.innerHTML.includes("Log failed"));
    assert.strictEqual(els.changelogStatus.textContent, "Log failed");
    fetchImpl = () => Promise.resolve({ ok: true, json: async () => [] });
    await ctx.renderChangelog();
    assert.ok(list.innerHTML.includes("state-box--empty"));
    assert.strictEqual(els.changelogStatus.textContent, "No log");

    // f. delegated actions bound once when addEventListener exists
    ctx.initStateActions();
    assert.strictEqual(tbody.listeners.length, 1);
    assert.strictEqual(list.listeners.length, 1);

    // g. WR-02: reset-filter selects the first tab and marks it active
    const tabA = fakeEl("button"); tabA.dataset.category = "A";
    const tabB = fakeEl("button"); tabB.dataset.category = "B";
    const toggles = [];
    [tabA, tabB].forEach((t) => { t.classList = { toggle: (c, on) => toggles.push([t.dataset.category, c, on]), add: noop, remove: noop, contains: () => false }; });
    sandbox.document.querySelector = (sel) => (sel === "#categoryTabs .tab-button" ? tabA : null);
    sandbox.document.querySelectorAll = (sel) => (sel === "#categoryTabs .tab-button" ? [tabA, tabB] : []);
    sandbox.window.history = { replaceState: noop };
    vm.runInContext('allData = [{}]; currentCategory = "Z";', ctx);
    const resetBtn = { getAttribute: () => "reset-filter" };
    await tbody.listeners[0].fn({ target: { closest: () => resetBtn } });
    assert.strictEqual(vm.runInContext("currentCategory", ctx), "A");
    assert.deepStrictEqual(toggles, [["A", "active", true], ["B", "active", false]]);
    assert.strictEqual(tabA.focusCalls, 1);

    // h. WR-02: no reset button on category-preset pages
    sandbox.document.body.getAttribute = (k) => (k === "data-category-preset" ? "A" : null);
    vm.runInContext("allData = [{}]", ctx);
    ctx.renderTable([]);
    assert.ok(!tbody.innerHTML.includes('data-action="reset-filter"'));
    sandbox.document.body.getAttribute = () => null;

    console.log("a11y_states_check OK");
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
