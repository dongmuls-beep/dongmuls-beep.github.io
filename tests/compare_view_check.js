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
const plain = (v) => JSON.parse(JSON.stringify(v));

function makeContext(extra) {
    const sandbox = Object.assign(
        {
            document: {
                addEventListener: noop,
                getElementById: () => null,
                querySelector: () => null,
                querySelectorAll: () => [],
            },
            window: { addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }) },
            navigator: { language: "ko" },
            localStorage: { getItem: () => null, setItem: noop },
            console,
            Intl,
            URL,
            URLSearchParams,
            setTimeout,
            clearTimeout,
        },
        extra || {}
    );
    const ctx = vm.createContext(sandbox);
    vm.runInContext(readSrc("script.js"), ctx, { filename: "script.js" });
    vm.runInContext(readSrc("compare-view.js"), ctx, { filename: "compare-view.js" });
    return ctx;
}

const TRANSLATIONS = {
    table_fee: "총보수",
    table_other: "기타비용",
    table_trade: "매매중개수수료",
    table_real: "실부담비용(%)",
    table_aum: "순자산(억)",
    table_value_missing: "-",
    fee_history_loading: "불러오는 중",
    compare_table_region: "비교표 (가로로 스크롤할 수 있어요)",
    compare_table_caption: "선택한 ETF 수수료 비교표",
    compare_best_badge: "최저",
    compare_scroll_hint: "좌우로 밀어 보세요",
    compare_table_title: "비교 지표",
    compare_empty_title: "비교할 ETF를 2개 이상 선택해 주세요",
    compare_empty_body: "목록에서 체크",
    compare_back_to_list: "ETF 목록으로 돌아가기",
    compare_dropped_notice: "일부 종목코드 제외: {codes}",
    compare_cap_notice: "최대 4개까지만 비교해요.",
    compare_load_error: "데이터를 불러오지 못했어요.",
    compare_retry: "다시 시도",
    compare_copy_link: "링크 복사",
    compare_copy_done: "복사했어요",
    compare_copy_fail: "복사하지 못했어요.",
};

// ---------- Task 1: spike + pure functions ----------
const ctx = makeContext();
const CV = ctx.CompareView;
assert.ok(CV, "CompareView global exists");
assert.strictEqual(CV.hasScriptGlobals(), true, "hasScriptGlobals: script.js globals visible to compare-view.js");
assert.strictEqual(CV.MAX_CODES, 4);

vm.runInContext("currentTranslations = " + JSON.stringify(TRANSLATIONS), ctx);

const valid = new Set(["360200", "0026S0", "069500", "102110", "114800", "148070"]);
const parse = (raw) => plain(CV.parseCompareCodes(raw, valid));

assert.deepStrictEqual(parse("360200,0026s0"), { codes: ["360200", "0026S0"], dropped: [], capped: false });
assert.deepStrictEqual(parse("360200,360200"), { codes: ["360200"], dropped: [], capped: false });
assert.deepStrictEqual(parse(" 360200 , ,0026S0"), { codes: ["360200", "0026S0"], dropped: [], capped: false });
assert.deepStrictEqual(parse("999999,zzz,<script>"), {
    codes: [],
    dropped: ["999999", "ZZZ", "<SCRIPT>"],
    capped: false,
});
const six = parse("360200,0026S0,069500,102110,114800,148070");
assert.deepStrictEqual(six.codes, ["360200", "0026S0", "069500", "102110"]);
assert.strictEqual(six.capped, true);
assert.deepStrictEqual(parse(null), { codes: [], dropped: [], capped: false });
assert.deepStrictEqual(parse(undefined), { codes: [], dropped: [], capped: false });
assert.deepStrictEqual(parse(""), { codes: [], dropped: [], capped: false });
// >200 chars: only first 200 considered
const longParam = "360200," + "A".repeat(200) + ",0026S0";
assert.deepStrictEqual(parse(longParam).codes, ["360200"]);
// dropped truncation and cap
assert.strictEqual(parse("abcdefghijklmnopqrstuvwxyz").dropped[0].length, 12);
const manyBad = Array.from({ length: 30 }, (_, i) => "x" + i).join(",");
assert.strictEqual(parse(manyBad).dropped.length, 10);

const low = (v) => plain(CV.findLowestIndexes(v));
assert.deepStrictEqual(low([0.1, 0.2, null]), [0]);
assert.deepStrictEqual(low([0.1, 0.1, 0.2]), [0, 1]);
assert.deepStrictEqual(low([0.1, 0.1]), []);
assert.deepStrictEqual(low([0.1, null]), []);
assert.deepStrictEqual(low(["0.05", 0.06]), [0]);
assert.deepStrictEqual(low([-0.01, 0.2, 0.3]), [1]);

const items = [
    { code: "360200", name: "ETF A", fee: 0.1, other: 0.02, trade: null, real: 0.15, aum: 12000 },
    { code: "0026S0", name: "<img src=x onerror=alert(1)>", fee: 0.2, other: 0.02, trade: null, real: null, aum: 500 },
    { code: "069500", name: "ETF C", fee: 0.1, other: 0.03, trade: null, real: 0.3, aum: 800 },
];
const html = CV.buildMetricTableHtml(items);
assert.ok(html.includes("<caption"), "caption");
assert.ok(html.includes("선택한 ETF 수수료 비교표"));
assert.strictEqual((html.match(/<th scope="col"/g) || []).length, 4, "3 ETF cols + corner");
assert.strictEqual((html.match(/<th scope="row"/g) || []).length, 5);
assert.ok(!html.includes("0.0000%"));
assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
assert.ok(!html.includes("<img"));
// fee row: tie on 0.1 -> both marked; 'other' lowest first two tie => A,B both 0.02 -> A,B
const bestCount = (html.match(/data-best="true"/g) || []).length;
// fee: A,C (2); other: A,B (2); trade: none; real: A (1) => 5
assert.strictEqual(bestCount, 5);
// AUM row never has data-best
const aumRow = html.slice(html.lastIndexOf('<tr><th scope="row">'));
assert.ok(!aumRow.includes("data-best"));
assert.ok(html.includes('<span class="cmp-best">최저</span>'));

// non-alphanumeric ownership: no top-level declarations
const cvSrc = readSrc("compare-view.js");
assert.strictEqual((cvSrc.match(/^(const|let|function|class) /gm) || []).length, 0);

// ---------- Task 2: runtime with fake DOM ----------
function makeEl(id) {
    const node = {
        id,
        attrs: {},
        textContent: "",
        innerHTML: "",
        listeners: {},
        classes: new Set(),
        setAttribute(k, v) { this.attrs[k] = String(v); },
        removeAttribute(k) { delete this.attrs[k]; },
        hasAttribute(k) { return k in this.attrs; },
        addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
        classList: null,
        scrollWidth: 0,
        clientWidth: 0,
    };
    node.classList = {
        add: (c) => node.classes.add(c),
        remove: (c) => node.classes.delete(c),
    };
    return node;
}

const FIXTURE = [
    { "구분": "국내", "종목코드": "360200", "종목명": "ETF A", "총보수": 0.1, "기타비용": 0.02, "매매중개수수료": 0.01, "실부담비용": 0.15, "AUM": 12000 },
    { "구분": "국내", "종목코드": "0026S0", "종목명": "ETF B", "총보수": 0.2, "기타비용": 0.02, "매매중개수수료": 0.01, "실부담비용": null, "AUM": 500 },
    { "구분": "국내", "종목코드": "069500", "종목명": "ETF C", "총보수": 0.09, "기타비용": 0.03, "매매중개수수료": 0.01, "실부담비용": 0.3, "AUM": 800 },
];

function tick() {
    return new Promise((resolve) => setImmediate(resolve));
}
async function settle() {
    for (let i = 0; i < 4; i++) await tick();
}

function bootRuntime(search, fetchImpl) {
    const ids = ["cmp-live", "cmp-app", "cmp-toolbar", "cmp-copy", "cmp-notices", "cmp-state", "cmp-table-section",
        "cmp-table-h", "cmp-table-body", "cmp-chart", "cmp-calc", "cmp-title"];
    const els = {};
    ids.forEach((id) => (els[id] = makeEl(id)));
    const calls = { fetch: 0 };
    const doc = {
        readyState: "complete",
        body: { dataset: { page: "compare" } },
        addEventListener: noop,
        getElementById: (id) => els[id] || null,
        querySelector: () => null,
        querySelectorAll: () => [],
    };
    const sandbox = {
        document: doc,
        window: { addEventListener: noop, location: { href: "https://etfsave.life/compare/" + search }, matchMedia: () => ({ matches: false, addEventListener: noop }) },
        navigator: { language: "ko" },
        localStorage: { getItem: () => null, setItem: noop },
        console: { log: noop, error: noop, warn: noop },
        Intl, URL, URLSearchParams, setTimeout, clearTimeout, Promise, Map, Set,
        location: { search, href: "https://etfsave.life/compare/" + search },
        MutationObserver: class { observe() {} },
        fetch: (...args) => { calls.fetch++; return fetchImpl(...args); },
    };
    const c = vm.createContext(sandbox);
    vm.runInContext(readSrc("script.js"), c, { filename: "script.js" });
    vm.runInContext("currentTranslations = " + JSON.stringify(TRANSLATIONS), c);
    vm.runInContext(readSrc("compare-view.js"), c, { filename: "compare-view.js" });
    return { c, els, calls };
}

const okFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(FIXTURE) });

(async () => {
    // (a) two valid, one invalid
    {
        const rt = bootRuntime("?compare=360200,0026s0,zzz", okFetch);
        const seen = [];
        rt.c.CompareView.onRender((ctxArg) => seen.push(plain(ctxArg)));
        await settle();
        const tbl = rt.els["cmp-table-body"].innerHTML;
        assert.strictEqual((tbl.match(/<th scope="col">[^<]/g) || []).length, 2, "2 ETF column headers");
        assert.ok(rt.els["cmp-notices"].innerHTML.includes("ZZZ"), "dropped notice lists ZZZ");
        assert.strictEqual(seen.length, 1);
        assert.deepStrictEqual(seen[0].items.map((i) => i.code), ["360200", "0026S0"]);
        assert.strictEqual(seen[0].items[1].real, null);
        assert.ok(!rt.els["cmp-table-section"].hasAttribute("hidden"));
        assert.strictEqual(rt.els["cmp-app"].attrs["aria-busy"], "false");
        let late = 0;
        rt.c.CompareView.onRender(() => late++);
        assert.strictEqual(late, 1, "late registration called immediately");
        rt.c.CompareView.onRender(() => { throw new Error("boom"); });
        // XSS: raw token escaped
        const rt2 = bootRuntime("?compare=360200,0026S0,%3Cscript%3E", okFetch);
        await settle();
        const n = rt2.els["cmp-notices"].innerHTML;
        assert.ok(!n.includes("<script>") && n.includes("&lt;SCRIPT&gt;"), "notice escaped");
    }
    // (b) fewer than 2 valid
    {
        const rt = bootRuntime("?compare=360200", okFetch);
        let called = 0;
        rt.c.CompareView.onRender(() => called++);
        await settle();
        assert.ok(rt.els["cmp-state"].innerHTML.includes("cmp-empty"));
        assert.ok(rt.els["cmp-chart"].hasAttribute("hidden"));
        assert.ok(rt.els["cmp-calc"].hasAttribute("hidden"));
        assert.ok(rt.els["cmp-table-section"].hasAttribute("hidden"));
        assert.strictEqual(called, 0);
    }
    // (c) fetch rejection + idempotent retry
    {
        const rt = bootRuntime("?compare=360200,0026S0", () => Promise.reject(new Error("net")));
        await settle();
        assert.ok(rt.els["cmp-state"].innerHTML.includes("data-cmp-retry"));
        assert.strictEqual(rt.calls.fetch, 1);
        const click = () => rt.els["cmp-app"].listeners.click.forEach((fn) =>
            fn({ target: { closest: (sel) => (sel === "[data-cmp-retry]" ? {} : null) } }));
        assert.strictEqual(rt.els["cmp-app"].listeners.click.length, 1, "single delegated listener");
        click(); await settle();
        click(); await settle();
        assert.strictEqual(rt.calls.fetch, 3, "exactly 2 more fetches");
        assert.strictEqual(rt.els["cmp-app"].listeners.click.length, 1, "no duplicate listeners");
        assert.strictEqual(rt.els["cmp-copy"].listeners.click.length, 1);
    }
    // (d) copy link success/failure
    {
        const rt = bootRuntime("?compare=360200,0026S0&amt=5", okFetch);
        await settle();
        let flushed = 0;
        rt.c.CompareView.onBeforeCopy(() => flushed++);
        let copied = null;
        vm.runInContext("copyText = async function (text) { globalThis.__copied = text; }", rt.c);
        const btn = makeEl("btn");
        await rt.c.CompareView.copyCurrentUrl(btn);
        copied = rt.c.__copied;
        assert.strictEqual(flushed, 1);
        assert.ok(copied && copied.includes("compare=360200") && copied.includes("amt=5"), "url preserves params: " + copied);
        assert.strictEqual(btn.textContent, "복사했어요");
        vm.runInContext("copyText = async function () { throw new Error('nope'); }", rt.c);
        await rt.c.CompareView.copyCurrentUrl(btn);
        assert.strictEqual(btn.textContent, "복사하지 못했어요.");
        // WR-04: per-button timers; clicking B must not cancel A's reset
        vm.runInContext("copyText = async function () {}", rt.c);
        const btnA = makeEl("a"), btnB = makeEl("b");
        await rt.c.CompareView.copyCurrentUrl(btnA);
        await rt.c.CompareView.copyCurrentUrl(btnB);
        assert.ok(btnA._cmpTimer && btnB._cmpTimer && btnA._cmpTimer !== btnB._cmpTimer, "separate timers");
        await new Promise((r) => setTimeout(r, 2100));
        assert.strictEqual(btnA.textContent, "링크 복사", "A reset");
        assert.strictEqual(btnB.textContent, "링크 복사", "B reset");
    }

    // ---------- Task 3: static page assertions ----------
    const pageBuf = fs.readFileSync(path.join(ROOT, "compare", "index.html"));
    assert.ok(!(pageBuf[0] === 0xef && pageBuf[1] === 0xbb && pageBuf[2] === 0xbf), "no BOM");
    const page = pageBuf.toString("utf8");
    assert.ok(page.includes('data-page="compare"'));
    assert.ok(page.includes('content="noindex,follow"'));
    assert.ok(page.includes('href="https://etfsave.life/compare/"'));
    assert.ok(!page.includes('id="tableBody"'));
    assert.ok(!page.includes("adsbygoogle"));
    [
        "cmp-title", "cmp-live", "cmp-app", "cmp-toolbar", "cmp-copy", "cmp-notices", "cmp-state",
        "cmp-table-section", "cmp-table-body", "cmp-chart", "cmp-chart-body", "cmp-calc", "cmp-calc-body",
    ].forEach((id) => assert.ok(page.includes('id="' + id + '"'), "missing #" + id));
    const order = ["/script.js", "/compare-calc.js", "/compare-view.js", "/compare-chart.js", "/compare-calculator.js"]
        .map((src) => page.indexOf('<script src="' + src + '" defer>'));
    order.forEach((i, k) => {
        assert.ok(i > -1, "script " + k + " present");
        if (k > 0) assert.ok(i > order[k - 1], "script order " + k);
    });
    assert.ok(page.indexOf("/compare.css") > page.indexOf("/style.css"), "compare.css after style.css");

    // WR-05: no fixed 3s wait; poll guarded by i18nReady
    const viewSrc = readSrc("compare-view.js");
    assert.ok(!viewSrc.includes("setTimeout(markI18nReady, 3000)"), "no fixed 3s i18n wait");
    assert.ok(/function waitForTranslations[\s\S]*?if \(state\.i18nReady\) return;/.test(viewSrc), "poll guarded");
    console.log("compare_view_check OK");
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
