// node checks for portfolio-shell.js (pure helpers + vm sandbox with fake DOM)
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = path.join(__dirname, "..", "portfolio", "portfolio-shell.js");
const S = require(file);

// --- Task 1: pure helpers ---
assert.strictEqual(S.resolveLang("en", "ko", "ja"), "en");
assert.strictEqual(S.resolveLang(null, "vi", "ja"), "vi");
assert.strictEqual(S.resolveLang(null, null, "ja"), "ja");
assert.strictEqual(S.resolveLang("xx", "yy", "zz"), "ko");
assert.strictEqual(S.interp("{row}행 {name}", { row: 3, name: "A" }), "3행 A");
assert.strictEqual(S.interp("{a} {b}", { a: 1 }), "1 {b}");
assert.strictEqual(S.interp("{a} {b}", { a: "{b}", b: "X" }), "{b} X");
assert.strictEqual(S.makeT({ ko: { a: "가" }, en: { a: "A", b: "B" }, vi: {} }, "vi")("b"), "B");
assert.strictEqual(S.makeT({ ko: { a: "가" }, en: { a: "A", b: "B" }, vi: {} }, "vi")("a"), "A");
assert.strictEqual(S.makeT({ ko: { c: "다" }, en: {} }, "en")("c"), "다");
assert.strictEqual(S.makeT({ ko: {}, en: {} }, "en")("zzz"), "zzz");
assert.ok(S.isHtmlKey("modal_policy_privacy") && S.isHtmlKey("footer_disclaimer"));
assert.ok(!S.isHtmlKey("pf_intro"));

// --- Task 2: browser shell in a vm sandbox ---
function makeEl(attrs) {
    const a = Object.assign({}, attrs);
    return {
        attrs: a, textContent: "", innerHTML: "", value: "",
        getAttribute(k) { return a[k]; },
        setAttribute(k, v) { a[k] = v; },
        addEventListener() {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    };
}

async function run(search, fetchFn) {
    const els = {
        text: makeEl({ "data-i18n": "pf_intro" }),
        html: makeEl({ "data-i18n": "footer_disclaimer" }),
        aria: makeEl({ "data-i18n-aria": "aria_lang_select" }),
        select: makeEl({}),
    };
    let events = 0;
    const doc = {
        title: "", documentElement: { lang: "" }, body: { classList: { toggle() {}, add() {}, remove() {} } },
        querySelectorAll(sel) {
            if (sel === "[data-i18n]") return [els.text, els.html];
            if (sel === "[data-i18n-aria]") return [els.aria];
            return [];
        },
        querySelector() { return null; },
        getElementById(id) { return id === "languageSelect" ? els.select : null; },
        addEventListener() {},
        dispatchEvent(e) { if (e.type === "etf:lang-changed") events++; },
    };
    const boom = () => { throw new Error("blocked"); };
    const sandbox = {
        document: doc, fetch: fetchFn, navigator: { language: "ko-KR" },
        window: { location: { search, href: "https://x.test/portfolio/" + search }, get localStorage() { return { getItem: boom, setItem: boom }; } },
        history: { replaceState() {} }, URL, URLSearchParams, setTimeout,
        CustomEvent: class { constructor(type) { this.type = type; } },
        Promise, Object, String, Array,
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox);
    await sandbox.PortfolioShell.ready;
    return { els, doc, events, P: sandbox.PortfolioShell };
}

const packs = {
    ko: { pf_intro: "소개", footer_disclaimer: "<b>면책</b>", aria_lang_select: "언어", pf_doc_title: "포트폴리오" },
    en: { pf_intro: "Intro", footer_disclaimer: "<b>Disc</b>", aria_lang_select: "Language", pf_doc_title: "Portfolio" },
};
const okFetch = (url) => {
    const m = /\/i18n\/(\w+)\.json/.exec(url);
    return Promise.resolve({ json: () => Promise.resolve(packs[m[1]] || {}) });
};

(async () => {
    let r = await run("", okFetch);
    assert.strictEqual(r.doc.documentElement.lang, "ko-KR");
    assert.strictEqual(r.els.text.textContent, "소개");
    assert.strictEqual(r.els.text.innerHTML, "");
    assert.strictEqual(r.els.html.innerHTML, "<b>면책</b>");
    assert.strictEqual(r.els.aria.attrs["aria-label"], "언어");
    assert.strictEqual(r.doc.title, "포트폴리오");
    assert.strictEqual(r.els.select.value, "ko");

    r = await run("?lang=en", okFetch);
    assert.strictEqual(r.doc.documentElement.lang, "en-US");
    assert.strictEqual(r.els.select.value, "en");
    assert.strictEqual(r.els.text.textContent, "Intro");
    assert.strictEqual(r.P.htmlLang(), "en-US");

    r = await run("", () => Promise.reject(new Error("net")));
    assert.strictEqual(r.P.t("pf_intro"), "pf_intro");
    assert.strictEqual(r.P.lang(), "ko");

    console.log("portfolio_shell_check OK");
})().catch((e) => { console.error(e); process.exit(1); });
