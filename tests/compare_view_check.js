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

console.log("compare_view_check OK");
