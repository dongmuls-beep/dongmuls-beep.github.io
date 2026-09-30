"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
function readSrc(name) {
    let s = fs.readFileSync(path.join(root, name), "utf8");
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    return s;
}
const scriptSrc = readSrc("script.js");
const selectSrc = readSrc("compare-select.js");

/* ---------- minimal fake DOM ---------- */
function matcher(sel) {
    const m = /^([a-z]+)?((?:\.[\w-]+)*)(?:\[([\w-]+)\])?$/.exec(sel);
    assert.ok(m, "unsupported selector " + sel);
    const classes = m[2] ? m[2].split(".").filter(Boolean) : [];
    return (n) =>
        (!m[1] || n.tag === m[1]) &&
        classes.every((c) => n.classList.contains(c)) &&
        (!m[3] || n.hasAttribute(m[3]) || (m[3].startsWith("data-") && n.dataset[m[3].slice(5)] !== undefined));
}
function walk(node, fn) {
    for (const c of node.children.slice()) {
        fn(c);
        walk(c, fn);
    }
}
class El {
    constructor(tag) {
        this.tag = tag;
        this.attrs = {};
        this.dataset = {};
        this.children = [];
        this.parentNode = null;
        this.handlers = {};
        this._text = "";
        this.checked = false;
        const self = this;
        const set = new Set();
        this.classList = {
            add: (c) => set.add(c),
            remove: (c) => set.delete(c),
            contains: (c) => set.has(c),
            toggle: (c, f) => (f === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : f ? set.add(c) : set.delete(c)),
            _set: set,
        };
        Object.defineProperty(this, "className", {
            get: () => Array.from(set).join(" "),
            set: (v) => {
                set.clear();
                String(v).split(/\s+/).filter(Boolean).forEach((c) => set.add(c));
            },
        });
        Object.defineProperty(this, "textContent", {
            get: () => self._text + self.children.map((c) => c.textContent).join(""),
            set: (v) => {
                self.children = [];
                self._text = String(v);
            },
        });
    }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    hasAttribute(k) { return k in this.attrs; }
    appendChild(c) {
        if (c.parentNode) c.parentNode.children.splice(c.parentNode.children.indexOf(c), 1);
        c.parentNode = this;
        this.children.push(c);
        return c;
    }
    insertBefore(c, ref) {
        if (c.parentNode) c.parentNode.children.splice(c.parentNode.children.indexOf(c), 1);
        c.parentNode = this;
        const i = ref ? this.children.indexOf(ref) : this.children.length;
        this.children.splice(i, 0, c);
        return c;
    }
    get firstChild() { return this.children[0] || null; }
    querySelectorAll(sel) {
        const test = matcher(sel);
        const out = [];
        walk(this, (n) => { if (test(n)) out.push(n); });
        return out;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    addEventListener(t, h) { (this.handlers[t] = this.handlers[t] || []).push(h); }
    focus() { this.doc.activeElement = this; }
}

function makeEnv(initialStore) {
    const doc = { readyState: "complete", handlers: {}, activeElement: null };
    const mk = (tag) => { const e = new El(tag); e.doc = doc; return e; };
    doc.createElement = mk;
    doc.body = mk("body");
    doc.documentElement = doc.body;
    doc.getElementById = (id) => {
        let f = null;
        walk(doc.body, (n) => { if (!f && n.id === id) f = n; });
        return f;
    };
    doc.querySelectorAll = (s) => doc.body.querySelectorAll(s);
    doc.querySelector = (s) => doc.body.querySelector(s);
    doc.addEventListener = (t, h) => (doc.handlers[t] = doc.handlers[t] || []).push(h);
    doc.fire = (t, ev) => (doc.handlers[t] || []).forEach((h) => h(ev || {}));

    const store = { data: Object.assign({}, initialStore || {}) };
    const storage = {
        getItem: (k) => (k in store.data ? store.data[k] : null),
        setItem: (k, v) => { store.data[k] = String(v); },
    };
    const noop = () => {};
    const timers = (fn, ms) => { const h = setTimeout(fn, ms); if (h.unref) h.unref(); return h; };
    const sandbox = {
        document: doc,
        window: { addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), sessionStorage: storage },
        navigator: { language: "ko" },
        localStorage: { getItem: () => null, setItem: noop },
        console, Intl, URL, setTimeout: timers, clearTimeout,
    };
    const ctx = vm.createContext(sandbox);
    vm.runInContext(scriptSrc, ctx, { filename: "script.js" });
    // stub translations for key based assertions
    vm.runInContext(
        `getTranslation = function (k) { return ({
            compare_select_label: "SEL {name}", compare_bar_count: "{count} picked", compare_bar_need_more: "NEED",
            compare_bar_limit: "LIMIT", compare_bar_go: "GO", compare_bar_clear: "CLEAR", compare_bar_label: "BAR",
            compare_live_added: "ADD {name} {count}", compare_live_removed: "REM {name} {count}", compare_live_cleared: "CLEARED"
        })[k] || k; };`,
        ctx
    );
    const tbody = mk("tbody");
    tbody.setAttribute("id", "tableBody");
    doc.body.appendChild(tbody);
    vm.runInContext(selectSrc, ctx, { filename: "compare-select.js" });
    return { ctx, doc, store, tbody, mk, CS: ctx.CompareSelect };
}

function dataRow(env, code, name, phase14) {
    const tr = env.mk("tr");
    tr.dataset.code = code;
    const codeCell = env.mk("td");
    codeCell.className = "clickable code-cell";
    codeCell.textContent = code;
    const nameCell = env.mk("td");
    nameCell.className = "name-cell";
    if (phase14) {
        nameCell.setAttribute("role", "cell");
        const lbl = env.mk("span");
        lbl.className = "cell-label";
        lbl.textContent = "종목명";
        nameCell.appendChild(lbl);
    }
    const a = env.mk("a");
    a.className = "stock-link";
    a.textContent = name;
    nameCell.appendChild(a);
    tr.appendChild(codeCell);
    tr.appendChild(nameCell);
    return tr;
}
function loadingRow(env) {
    const tr = env.mk("tr");
    const td = env.mk("td");
    td.className = "loading-text";
    tr.appendChild(td);
    return tr;
}
function fillRows(env, codes, phase14) {
    env.tbody.children = [];
    env.tbody.appendChild(loadingRow(env));
    codes.forEach((c) => env.tbody.appendChild(dataRow(env, c, "NAME" + c, phase14)));
}
const checks = (env) => env.doc.querySelectorAll(".cmp-check");
const toggle = (env, box, on) => { box.checked = on; env.doc.fire("change", { target: box }); };
const bar = (env) => env.doc.getElementById("compare-bar");

/* ---------- Task 1: pure helpers ---------- */
{
    const env = makeEnv();
    const CS = env.CS;
    const plain = (v) => JSON.parse(JSON.stringify(v));
    assert.strictEqual(CS.STORAGE_KEY, "etf.compare.selection.v1");
    assert.deepStrictEqual(
        plain(CS.sanitizeCodes(["360200", "360200", "abc", "0026s0", " 069500 ", "0069M0", "133690"])),
        ["360200", "0026S0", "069500", "0069M0"]
    );
    assert.deepStrictEqual(plain(CS.sanitizeCodes("x")), []);
    assert.deepStrictEqual(plain(CS.sanitizeCodes([1, null, "360200"])), ["360200"]);

    assert.deepStrictEqual(plain(CS.readSelection({ getItem: () => '["360200","0026S0"]' })), ["360200", "0026S0"]);
    assert.deepStrictEqual(plain(CS.readSelection({ getItem: () => "{bad" })), []);
    assert.deepStrictEqual(plain(CS.readSelection({ getItem: () => '{"a":1}' })), []);
    assert.deepStrictEqual(plain(CS.readSelection({ getItem: () => { throw new Error("x"); } })), []);
    assert.deepStrictEqual(plain(CS.readSelection(null)), []);

    const written = {};
    CS.writeSelection({ setItem: (k, v) => { written[k] = v; } }, ["360200", "bad", "0026s0"]);
    assert.strictEqual(written["etf.compare.selection.v1"], '["360200","0026S0"]');
    CS.writeSelection({ setItem: () => { throw new Error("q"); } }, ["360200"]);

    const four = ["AAAAAA", "BBBBBB", "CCCCCC", "DDDDDD"];
    assert.deepStrictEqual(plain(CS.tryAdd(["AAAAAA"], "BBBBBB")), { ok: true, list: ["AAAAAA", "BBBBBB"] });
    assert.deepStrictEqual(plain(CS.tryAdd(four, "EEEEEE")), { ok: false, reason: "limit" });
    assert.deepStrictEqual(plain(CS.tryAdd(four, "AAAAAA")), { ok: true, list: four });
    assert.deepStrictEqual(plain(CS.tryAdd([], "zz")), { ok: false, reason: "invalid" });

    assert.strictEqual(CS.buildCompareHref(["360200", "0026S0"], "ko"), "/compare/?compare=360200,0026S0");
    assert.strictEqual(CS.buildCompareHref(["360200", "0026S0"], "en"), "/compare/?compare=360200,0026S0&lang=en");
    assert.strictEqual(CS.buildCompareHref(["360200"], "ko"), null);
    assert.strictEqual(CS.buildCompareHref(["360200", "0026S0"], "e\"><"), "/compare/?compare=360200,0026S0");
}

/* ---------- Task 2: DOM layer ---------- */
{
    // injection + idempotence + loading row
    const env = makeEnv();
    fillRows(env, ["AAAAAA", "BBBBBB", "CCCCCC", "DDDDDD", "EEEEEE"]);
    env.doc.fire("etf:table-rendered");
    env.doc.fire("etf:table-rendered");
    assert.strictEqual(checks(env).length, 5);
    env.tbody.querySelectorAll("tr[data-code]").forEach((tr) => {
        assert.strictEqual(tr.querySelectorAll(".cmp-check").length, 1);
        assert.strictEqual(tr.children[0].querySelectorAll(".cmp-check").length, 0, "not in code cell");
        assert.strictEqual(tr.children.length, 2, "no new column");
    });
    assert.strictEqual(env.tbody.children[0].querySelectorAll(".cmp-check").length, 0);
    const first = checks(env)[0];
    assert.strictEqual(first.dataset.code, "AAAAAA");
    assert.strictEqual(first.getAttribute("aria-label"), "SEL NAMEAAAAAA");
    assert.strictEqual(env.tbody.children[1].children[1].children.length, 1, "name cell has one wrapper");

    // bar states: 0 / 1 / 2
    assert.ok(bar(env).hasAttribute("hidden"));
    assert.ok(!env.doc.body.classList.contains("has-compare-bar"));
    const [a, b, c, d, e] = checks(env);
    toggle(env, a, true);
    assert.ok(!bar(env).hasAttribute("hidden"));
    assert.ok(env.doc.body.classList.contains("has-compare-bar"));
    const go = bar(env).querySelector(".cmp-bar-go");
    assert.strictEqual(go.getAttribute("aria-disabled"), "true");
    assert.strictEqual(go.getAttribute("href"), null);
    assert.strictEqual(bar(env).querySelector(".cmp-bar-helper").textContent, "NEED");
    assert.strictEqual(bar(env).querySelector(".cmp-bar-count").textContent, "1 picked");
    let prevented = 0;
    go.handlers.click.forEach((h) => h({ preventDefault: () => prevented++ }));
    assert.strictEqual(prevented, 1);
    toggle(env, b, true);
    assert.strictEqual(go.getAttribute("href"), "/compare/?compare=AAAAAA,BBBBBB");
    assert.strictEqual(go.getAttribute("aria-disabled"), null);
    prevented = 0;
    go.handlers.click.forEach((h) => h({ preventDefault: () => prevented++ }));
    assert.strictEqual(prevented, 0);

    // cap at 4, 5th reverted
    toggle(env, c, true);
    toggle(env, d, true);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(env.CS.getSelection())), ["AAAAAA", "BBBBBB", "CCCCCC", "DDDDDD"]);
    assert.strictEqual(env.store.data["etf.compare.selection.v1"], '["AAAAAA","BBBBBB","CCCCCC","DDDDDD"]');
    toggle(env, e, true);
    assert.strictEqual(e.checked, false);
    assert.strictEqual(env.CS.getSelection().length, 4);
    assert.strictEqual(bar(env).querySelector(".cmp-bar-notice").textContent, "LIMIT");
    assert.strictEqual(env.doc.getElementById("cmp-live").textContent, "LIMIT");
    assert.ok(e.parentNode.classList.contains("is-dim"));
    assert.strictEqual(e.getAttribute("aria-disabled"), "true");
    assert.ok(!a.parentNode.classList.contains("is-dim"));
    assert.strictEqual(a.getAttribute("aria-disabled"), null);

    // tab switch: new rows, selection restored, codes not visible retained
    fillRows(env, ["BBBBBB", "EEEEEE"]);
    env.doc.fire("etf:table-rendered");
    const ch = checks(env);
    assert.strictEqual(ch.length, 2);
    assert.strictEqual(ch[0].checked, true);
    assert.strictEqual(ch[1].checked, false);
    assert.strictEqual(env.CS.getSelection().length, 4);

    // uncheck announces removal
    toggle(env, ch[0], false);
    assert.strictEqual(env.CS.getSelection().length, 3);
    assert.strictEqual(env.doc.getElementById("cmp-live").textContent, "REM NAMEBBBBBB 3");

    // clear
    env.doc.getElementById("compare-bar").querySelector(".cmp-bar-clear").handlers.click.forEach((h) => h({}));
    assert.strictEqual(env.CS.getSelection().length, 0);
    assert.strictEqual(env.store.data["etf.compare.selection.v1"], "[]");
    checks(env).forEach((x) => assert.strictEqual(x.checked, false));
    assert.strictEqual(env.doc.getElementById("cmp-live").textContent, "CLEARED");
    assert.strictEqual(env.doc.activeElement, checks(env)[0]);
    assert.ok(bar(env).hasAttribute("hidden"));
}

{
    // post-Phase-14 markup
    const env = makeEnv();
    fillRows(env, ["AAAAAA", "BBBBBB"], true);
    env.doc.fire("etf:table-rendered");
    env.doc.fire("etf:table-rendered");
    assert.strictEqual(checks(env).length, 2);
    const cell = env.tbody.children[1].children[1];
    assert.strictEqual(cell.children[0].className, "cell-label");
    assert.strictEqual(cell.children[0].textContent, "종목명");
    assert.strictEqual(cell.children.length, 2);
    const wrap = cell.children[1];
    assert.ok(wrap.classList.contains("cmp-name-wrap"));
    assert.ok(wrap.querySelector("label"));
    assert.ok(wrap.querySelector(".stock-link"));
    assert.strictEqual(checks(env)[0].getAttribute("aria-label"), "SEL NAMEAAAAAA");
    assert.ok(cell.classList.contains("cmp-name-cell"));
}

{
    // persisted selection with no #tableBody -> bar still shown
    const env = makeEnv({ "etf.compare.selection.v1": '["AAAAAA","BBBBBB"]' });
    env.tbody.parentNode.children = [];
    env.CS.sync();
    assert.ok(!bar(env).hasAttribute("hidden"));
    assert.strictEqual(bar(env).querySelector(".cmp-bar-go").getAttribute("href"), "/compare/?compare=AAAAAA,BBBBBB");
}

console.log("compare_select_check OK");
