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

// ---------- minimal fake DOM ----------
function makeDom() {
    const registry = {};
    let created = 0;
    function El(tag) {
        created++;
        this.tagName = tag;
        this.attrs = {};
        this.children = [];
        this.listeners = {};
        this.className = "";
        this.value = "";
        this.textContent = "";
        this.innerHTML = "";
    }
    El.prototype.setAttribute = function (k, v) {
        this.attrs[k] = String(v);
        if (k === "id") registry[v] = this;
    };
    El.prototype.getAttribute = function (k) {
        return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
    };
    El.prototype.removeAttribute = function (k) {
        delete this.attrs[k];
    };
    El.prototype.appendChild = function (c) {
        this.children.push(c);
        return c;
    };
    El.prototype.removeChild = function (c) {
        this.children.splice(this.children.indexOf(c), 1);
    };
    Object.defineProperty(El.prototype, "firstChild", {
        get() {
            return this.children[0] || null;
        },
    });
    El.prototype.addEventListener = function (t, fn) {
        (this.listeners[t] = this.listeners[t] || []).push(fn);
    };
    El.prototype.fire = function (t) {
        (this.listeners[t] || []).forEach((fn) => fn({ currentTarget: this }));
    };
    const doc = {
        addEventListener: noop,
        getElementById: (id) => registry[id] || null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: (tag) => new El(tag),
    };
    const section = new El("section");
    section.setAttribute("id", "cmp-calc");
    section.setAttribute("hidden", "");
    const body = new El("div");
    body.setAttribute("id", "cmp-calc-body");
    return { doc, registry, section, body, created: () => created };
}

const TR = {
    calc_lump: "일시금 (원)",
    calc_years: "보유기간 (년)",
    calc_years_hint: "1~50년",
    calc_monthly: "월 적립금 (원)",
    calc_return: "기대수익률",
    calc_return_hint: "가정 값이에요.",
    calc_col_rank: "순위",
    calc_col_etf: "ETF",
    calc_col_fees: "누적 수수료 (원)",
    calc_col_gap: "최저 대비 (원)",
    calc_col_final: "최종 평가금액 (원)",
    calc_table_caption: "보유기간 누적 수수료가 적은 순서",
    compare_best_badge: "최저",
    calc_result: "{years}년간 {a}보다 {b}가 약 {amount}원 더 부담해요",
    calc_result_same: "{years}년간 두 ETF의 누적 비용 차이는 거의 없어요",
    calc_contributed: "총 납입 원금 {amount}원",
    calc_excluded: "{names}은(는) 수수료 값이 없어 계산에서 제외했어요.",
    calc_fee_high: "{name}: 실부담비용이 {limit}%를 넘어 입력 오류일 수 있어요.",
    calc_err_amount: "0원 이상의 숫자를 입력해 주세요.",
    calc_err_years: "1~50 사이의 숫자를 입력해 주세요.",
    calc_err_return: "-99~100 사이의 숫자를 입력해 주세요.",
    calc_clamped: "최대 {limit}까지만 계산해요.",
    calc_disclaimer: "이 계산은 입력한 가정에 따른 단순 추정이며 투자 권유나 수익 보장이 아니에요.",
    compare_copy_link: "링크 복사",
};

function build(search) {
    const dom = makeDom();
    const replaced = [];
    const announced = [];
    const sandbox = {
        document: dom.doc,
        window: { addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }) },
        navigator: { language: "ko" },
        localStorage: { getItem: () => null, setItem: noop },
        console,
        Intl,
        URL,
        URLSearchParams,
        setTimeout: (fn) => {
            fn();
            return 1;
        },
        clearTimeout: noop,
        location: { search: search || "", pathname: "/compare/", hash: "" },
        history: { state: null, replaceState: (s, t, url) => replaced.push(url) },
    };
    const ctx = vm.createContext(sandbox);
    ["script.js", "compare-calc.js", "compare-view.js"].forEach((f) => vm.runInContext(readSrc(f), ctx, { filename: f }));
    vm.runInContext("currentTranslations = " + JSON.stringify(TR), ctx);
    let renderCb = null;
    const CV = ctx.CompareView;
    CV.onRender = (fn) => {
        renderCb = fn;
    };
    CV.announce = (t) => announced.push(t);
    vm.runInContext(readSrc("compare-calculator.js"), ctx, { filename: "compare-calculator.js" });
    return { ctx, dom, replaced, announced, getCb: () => renderCb, UI: ctx.CompareCalculatorUI, CC: ctx.CompareCalc };
}

const T = build("");
const { UI, CC } = T;
assert.ok(UI, "CompareCalculatorUI exists");
const pn = (v) => UI.parseNumberInput(v);

// ---------- Task 1: parser ----------
assert.strictEqual(pn("10,000,000"), 10000000);
assert.strictEqual(pn("１０，０００"), 10000);
assert.strictEqual(pn(" 1 000원 "), 1000);
assert.strictEqual(pn("7%"), 7);
assert.strictEqual(pn("7.5"), 7.5);
assert.strictEqual(pn("-3.5"), -3.5);
assert.strictEqual(pn("－３"), -3);
assert.strictEqual(pn("−3"), -3);
assert.strictEqual(pn("10년"), 10);
assert.strictEqual(pn(""), null);
assert.strictEqual(pn("   "), null);
assert.ok(Number.isNaN(pn("abc")));
assert.strictEqual(pn("1,2,3"), 123);
assert.ok(Number.isNaN(pn("Infinity")));
assert.ok(Number.isNaN(pn("1e400")));
assert.ok(Number.isNaN(pn("1".repeat(40))));
assert.strictEqual(pn(5), 5);

const D = { lumpSum: 10000000, years: 10, monthly: 0, annualReturnPct: 0 };
assert.deepStrictEqual(plain(UI.DEFAULTS), D);
assert.deepStrictEqual(plain(UI.readCalcParams("?compare=360200,0026S0&amt=5,000,000&yrs=20&mon=100000&ret=5")), {
    lumpSum: 5000000, years: 20, monthly: 100000, annualReturnPct: 5,
});
assert.deepStrictEqual(plain(UI.readCalcParams("")), D);
assert.deepStrictEqual(plain(UI.readCalcParams("?amt=abc&yrs=")), D);
assert.strictEqual(UI.readCalcParams("?yrs=99").years, 50);
assert.strictEqual(UI.readCalcParams("?yrs=0").years, 1);
assert.strictEqual(UI.readCalcParams("?amt=1e20").lumpSum, 1e12);
assert.strictEqual(UI.readCalcParams("?ret=-500").annualReturnPct, -99);
assert.strictEqual(UI.readCalcParams("?amt=-5").lumpSum, 0);

assert.strictEqual(UI.buildCalcSearch("?compare=360200,0026S0&lang=en", D), "?compare=360200,0026S0&lang=en");
assert.strictEqual(
    UI.buildCalcSearch("?compare=360200,0026S0&amt=1", { lumpSum: 5000000, years: 20, monthly: 0, annualReturnPct: 5 }),
    "?compare=360200,0026S0&amt=5000000&yrs=20&ret=5"
);
assert.strictEqual(UI.buildCalcSearch("", D), "");
[
    { lumpSum: 5000000, years: 20, monthly: 100000, annualReturnPct: 5 },
    { lumpSum: 0, years: 1, monthly: 5e12, annualReturnPct: -99 },
    { lumpSum: 123456, years: 33, monthly: 777, annualReturnPct: 3.5 },
].forEach((x) => {
    const s = UI.buildCalcSearch("?compare=A,B&lang=ja", x);
    assert.ok(s.includes("compare=A,B") && s.includes("lang=ja"), "compare/lang preserved: " + s);
    assert.deepStrictEqual(plain(UI.readCalcParams(s)), plain(CC.normalizeInputs(x)));
});

// ---------- Task 2: result ----------
const items = [
    { code: "A", name: "A name", real: 0.09 },
    { code: "B", name: "B name", real: 0.3236 },
    { code: "C", name: "C name", real: null },
];
const inp = { lumpSum: 1e7, years: 10, monthly: 0, annualReturnPct: 0 };
let r = UI.buildCalcResult(inp, items);
const cmp = CC.compare(inp, 0.09, 0.3236);
assert.strictEqual(r.headline.kind, "more");
assert.strictEqual(r.headline.low.code, "A");
assert.strictEqual(r.headline.high.code, "B");
assert.strictEqual(r.headline.amount, Math.round(Math.abs(cmp.feesDifference)));
assert.strictEqual(r.perEtf.length, 3);
assert.deepStrictEqual(plain(r.perEtf.map((e) => e.code)), ["A", "B", "C"]);
assert.strictEqual(r.perEtf[2].excluded, true);
assert.deepStrictEqual(plain(r.excludedNames), ["C name"]);
assert.strictEqual(r.contributed, 1e7);

// order-independent: input order does not change ranking/headline
r = UI.buildCalcResult(inp, [items[1], items[0]]);
assert.strictEqual(r.headline.low.code, "A");
assert.strictEqual(r.headline.high.code, "B");

// multi: 4 ETFs ranked by cumulative fees, gap vs cheapest, headline spans cheapest..most expensive
const four = [
    { code: "D", name: "D name", real: 0.5 },
    { code: "A", name: "A name", real: 0.09 },
    { code: "E", name: "E name", real: 0.2 },
    { code: "F", name: "F name", real: 0.09 },
];
r = UI.buildCalcResult(inp, four);
assert.deepStrictEqual(plain(r.ranked.map((e) => e.code)), ["A", "F", "E", "D"]);
assert.deepStrictEqual(plain(r.ranked.map((e) => e.rank)), [1, 1, 3, 4], "ties share rank");
assert.strictEqual(r.ranked[0].gap, 0);
assert.strictEqual(r.ranked[1].gap, 0);
const cAD = CC.compare(inp, 0.09, 0.5);
assert.ok(Math.abs(r.ranked[3].gap - cAD.feesDifference) < 1e-6);
assert.strictEqual(r.headline.low.code, "A");
assert.strictEqual(r.headline.high.code, "D");
assert.strictEqual(r.headline.amount, Math.round(cAD.feesDifference));

const same = [{ code: "A", name: "A", real: 0.2 }, { code: "B", name: "B", real: 0.2 }];
assert.strictEqual(UI.buildCalcResult(inp, same).headline.kind, "same");
const one = UI.buildCalcResult(inp, [items[0], items[2]]);
assert.strictEqual(one.headline, null);
assert.strictEqual(one.ranked.length, 1);
assert.deepStrictEqual(plain(one.excludedNames), ["C name"]);
const hi = UI.buildCalcResult(inp, [items[0], { code: "H", name: "H name", real: 6 }]);
assert.deepStrictEqual(plain(hi.warnings), ["H name"]);
assert.strictEqual(hi.headline.kind, "more");

let html = UI.renderResultHtml(UI.buildCalcResult(inp, items));
assert.ok(html.indexOf('role="group"') > 0 && html.indexOf("cmp-calc-result") > 0);
assert.ok(html.includes('id="cmp-calc-headline"') && html.includes('aria-live="polite"') && html.includes('aria-atomic="true"'));
const hl = html.match(/<p id="cmp-calc-headline"[^>]*>([^<]*)<\/p>/)[1];
assert.ok(hl.includes("년간") && hl.includes("A name") && hl.includes("B name") && hl.includes("원 더 부담"), hl);
assert.ok(hl.includes(Math.round(Math.abs(cmp.feesDifference)).toLocaleString("ko-KR")));
const order = ["cmp-calc-headline", "cmp-calc-table", "cmp-calc-meta", "cmp-notice", "cmp-disclaimer"].map((k) => html.indexOf(k));
assert.ok(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), "order " + order);
assert.ok(html.trim().endsWith('</p></div>') && html.lastIndexOf("cmp-disclaimer") > html.lastIndexOf("cmp-notice"));
assert.ok(html.includes(Math.round(cmp.a.totalFees).toLocaleString("ko-KR")));
assert.ok(html.includes("+" + Math.round(cmp.feesDifference).toLocaleString("ko-KR")), "gap vs lowest shown");
assert.ok(html.includes('<th scope="row">A name') && html.includes("cmp-best"), "row headers + lowest badge");
assert.ok(html.includes("<caption") && html.includes("순위") && html.includes("최저 대비"));
assert.ok(!html.includes(">C name<"), "excluded not listed as a row");
const fourHtml = UI.renderResultHtml(UI.buildCalcResult(inp, four));
assert.strictEqual((fourHtml.match(/<tr>/g) || []).length, 5, "header + 4 rows");
const none = UI.renderResultHtml(UI.buildCalcResult(inp, []));
assert.ok(none.includes("cmp-disclaimer"), "disclaimer present with null headline");
assert.ok(!none.includes("<table"), "no table without ETFs");
const xss = UI.renderResultHtml(UI.buildCalcResult(inp, [{ code: "A", name: "<img src=x>", real: 0.1 }, { code: "B", name: "B", real: 0.5 }]));
assert.ok(!xss.includes("<img") && xss.includes("&lt;img"));
const hiHtml = UI.renderResultHtml(hi);
assert.ok(hiHtml.includes("cmp-warning") && hiHtml.includes("H name"));

// ---------- Task 3: DOM ----------
const W = build("?compare=A,B&amt=5,000,000&yrs=20");
const cb = W.getCb();
assert.strictEqual(typeof cb, "function", "onRender registered");
W.dom.doc.getElementById("cmp-calc"); // registry lookup sanity
W.dom.section.setAttribute("id", "cmp-calc");
W.dom.body.setAttribute("id", "cmp-calc-body");
const dctx = { items, lang: "ko" };
cb(dctx);
const R = W.dom.registry;
assert.strictEqual(R["cmp-calc"].getAttribute("hidden"), null, "section unhidden");
assert.strictEqual(R["cmp-amt"].value, "5,000,000");
assert.strictEqual(R["cmp-yrs"].value, "20");
assert.strictEqual(R["cmp-amt"].getAttribute("inputmode"), "numeric");
assert.strictEqual(R["cmp-ret"].getAttribute("inputmode"), "decimal");
assert.ok(R["cmp-calc-out"].innerHTML.includes("20년간"), "headline for 20 years");
assert.ok(!R["cmp-base"] && !R["cmp-other"], "no pair selects");
assert.ok(R["cmp-calc-out"].innerHTML.includes("cmp-calc-table"), "ranked table rendered");
assert.strictEqual(R["cmp-calc-copy"].textContent, "링크 복사");

// invalid
R["cmp-amt"].value = "abc";
R["cmp-amt"].fire("input");
assert.strictEqual(R["cmp-amt"].getAttribute("aria-invalid"), "true");
assert.notStrictEqual(R["cmp-calc-out"].getAttribute("hidden"), null);
assert.ok(W.announced.length >= 1);
// valid again, URL synced
W.replaced.length = 0;
R["cmp-amt"].value = "３０，０００원";
R["cmp-amt"].fire("input");
assert.strictEqual(R["cmp-amt"].getAttribute("aria-invalid"), null);
assert.strictEqual(R["cmp-calc-out"].getAttribute("hidden"), null);
const last = W.replaced[W.replaced.length - 1];
assert.ok(last.includes("amt=30000") && last.includes("yrs=20"), last);
// clamp notice
R["cmp-yrs"].value = "99";
R["cmp-yrs"].fire("change");
assert.strictEqual(R["cmp-yrs-note"].getAttribute("hidden"), null);
assert.ok(R["cmp-yrs-note"].textContent.includes("50"));
R["cmp-yrs"].fire("blur");
assert.strictEqual(R["cmp-yrs"].value, "50");
// WR-03: fractional years round silently, no clamp note
R["cmp-yrs"].value = "5.5";
R["cmp-yrs"].fire("change");
assert.notStrictEqual(R["cmp-yrs-note"].getAttribute("hidden"), null, "no clamp note for 5.5 years");
R["cmp-yrs"].value = "20";
R["cmp-yrs"].fire("change");
// WR-02: blur on a valid field keeps its value when another field is invalid
R["cmp-yrs"].value = "abc";
R["cmp-yrs"].fire("input");
R["cmp-amt"].value = "5,000,000";
R["cmp-amt"].fire("blur");
assert.strictEqual(R["cmp-amt"].value, "5,000,000", "valid field not reset to default");
R["cmp-yrs"].value = "20";
R["cmp-yrs"].fire("input");
// language re-render: no second form, no extra listeners
const lis = R["cmp-amt"].listeners.input.length;
const kids = W.dom.body.children.length;
cb(dctx);
assert.strictEqual(W.dom.body.children.length, kids, "no second form");
assert.strictEqual(R["cmp-amt"].listeners.input.length, lis, "no extra listeners");
// compare/lang preserved in synced url
assert.ok(W.replaced[W.replaced.length - 1].includes("compare=A,B"));

console.log("compare_calculator_check OK");
