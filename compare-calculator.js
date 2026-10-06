(function () {
    "use strict";

    var DEFAULTS = { lumpSum: 10000000, years: 10, monthly: 0, annualReturnPct: 0 };
    var PARAM_KEYS = { lumpSum: "amt", years: "yrs", monthly: "mon", annualReturnPct: "ret" };
    var FIELDS = [
        { key: "lumpSum", id: "cmp-amt", label: "calc_lump", err: "calc_err_amount", mode: "numeric", amount: true, placeholder: "10,000,000" },
        { key: "years", id: "cmp-yrs", label: "calc_years", err: "calc_err_years", mode: "numeric", hint: "calc_years_hint" },
        { key: "monthly", id: "cmp-mon", label: "calc_monthly", err: "calc_err_amount", mode: "numeric", amount: true, placeholder: "0" },
        { key: "annualReturnPct", id: "cmp-ret", label: "calc_return", err: "calc_err_return", mode: "decimal", hint: "calc_return_hint" }
    ];

    function root() {
        return typeof globalThis !== "undefined" ? globalThis : window;
    }

    function esc(v) {
        return typeof escapeHtml === "function" ? escapeHtml(String(v)) : String(v);
    }

    function tr(key, vars) {
        if (typeof CompareView === "object" && CompareView && typeof CompareView.t === "function") {
            return CompareView.t(key, vars);
        }
        return key;
    }

    function fmt(n) {
        return Math.round(n).toLocaleString("ko-KR");
    }

    // ---------- parsing ----------
    function parseNumberInput(value) {
        if (typeof value === "number") return isFinite(value) ? value : NaN;
        if (typeof value !== "string") return NaN;
        var s = value;
        if (typeof String.prototype.normalize === "function") s = s.normalize("NFKC");
        s = s.replace(/−/g, "-");
        s = s.replace(/[\s,]/g, "").replace(/[원%년]/g, "");
        if (s === "") return null;
        if (s.length > 32) return NaN;
        var n = Number(s);
        return isFinite(n) ? n : NaN;
    }

    function readCalcParams(search) {
        var p = new URLSearchParams(search || "");
        var values = {};
        Object.keys(PARAM_KEYS).forEach(function (field) {
            var raw = p.get(PARAM_KEYS[field]);
            var n = raw === null ? null : parseNumberInput(raw);
            values[field] = n === null || n !== n ? DEFAULTS[field] : n;
        });
        return CompareCalc.normalizeInputs(values);
    }

    function buildCalcSearch(search, inputs) {
        var n = CompareCalc.normalizeInputs(inputs);
        var p = new URLSearchParams(search || "");
        Object.keys(PARAM_KEYS).forEach(function (field) {
            if (n[field] !== DEFAULTS[field]) p.set(PARAM_KEYS[field], String(n[field]));
            else p.delete(PARAM_KEYS[field]);
        });
        var qs = p.toString();
        return qs ? "?" + qs.replace(/%2C/gi, ",") : "";
    }

    // ---------- result ----------
    function feeOf(item) {
        var f = typeof toFeeNumber === "function" ? toFeeNumber(item.real) : Number(item.real);
        return typeof f === "number" && isFinite(f) ? f : null;
    }

    function buildCalcResult(inputs, items) {
        var n = CompareCalc.normalizeInputs(inputs);
        items = items || [];
        var fees = items.map(function (i) {
            return { code: i.code, fee: feeOf(i) };
        });
        var sims = CompareCalc.simulateMany(n, fees);
        var perEtf = items.map(function (item, idx) {
            var s = sims[idx] || {};
            return {
                code: item.code,
                name: item.name,
                excluded: !!s.excluded,
                reason: s.reason || null,
                totalFees: s.totalFees,
                fvWithFee: s.fvWithFee,
                warning: s.warning || null
            };
        });
        var excludedNames = perEtf.filter(function (e) { return e.excluded; }).map(function (e) { return e.name; });
        var warnings = perEtf.filter(function (e) { return !e.excluded && e.warning === "fee_high"; }).map(function (e) { return e.name; });
        var contributed = sims.length ? sims[0].totalContributed : n.lumpSum + n.monthly * n.years * 12;

        // Rank by cumulative fees paid (ties share a rank); headline = cheapest vs most expensive.
        var ranked = perEtf.filter(function (e) { return !e.excluded; })
            .sort(function (x, y) { return x.totalFees - y.totalFees; });
        ranked.forEach(function (e, idx) {
            e.gap = e.totalFees - ranked[0].totalFees;
            e.rank = idx > 0 && Math.abs(e.totalFees - ranked[idx - 1].totalFees) < 1 ? ranked[idx - 1].rank : idx + 1;
        });
        var headline = null;
        if (ranked.length >= 2) {
            var top = ranked[ranked.length - 1];
            headline = top.gap < 1
                ? { kind: "same", years: n.years }
                : { kind: "more", years: n.years, low: ranked[0], high: top, amount: Math.round(top.gap) };
        }
        return { inputs: n, headline: headline, ranked: ranked, perEtf: perEtf, excludedNames: excludedNames, warnings: warnings, contributed: contributed };
    }

    function renderResultHtml(result) {
        var h = "";
        var head = result.headline;
        var text = "";
        if (head && head.kind === "more") {
            text = tr("calc_result", { years: head.years, a: head.low.name, b: head.high.name, amount: head.amount.toLocaleString("ko-KR") });
        } else if (head && head.kind === "same") {
            text = tr("calc_result_same", { years: head.years });
        }
        h += '<div class="cmp-calc-result" role="group">';
        h += '<p id="cmp-calc-headline" class="cmp-calc-headline" role="status" aria-live="polite" aria-atomic="true">' + esc(text) + "</p>";
        if (result.ranked.length) {
            h += '<div class="cmp-table-wrap" role="region" tabindex="0" aria-labelledby="cmp-calc-caption">';
            h += '<table class="cmp-table cmp-calc-table"><caption id="cmp-calc-caption" class="cmp-sr-only">' + esc(tr("calc_table_caption")) + "</caption>";
            h += '<thead><tr><th scope="col">' + esc(tr("calc_col_rank")) + '</th><th scope="col">' + esc(tr("calc_col_etf")) + '</th><th scope="col">' + esc(tr("calc_col_fees")) +
                '</th><th scope="col">' + esc(tr("calc_col_gap")) + '</th><th scope="col">' + esc(tr("calc_col_final")) + "</th></tr></thead><tbody>";
            result.ranked.forEach(function (e) {
                var best = e.gap < 1;
                h += "<tr><td>" + e.rank + '</td><th scope="row">' + esc(e.name) + '<span class="cmp-etf-code">' + esc(e.code) + "</span></th>";
                h += "<td>" + fmt(e.totalFees) + "</td>";
                h += best ? '<td data-best="true"><span class="cmp-best">' + esc(tr("compare_best_badge")) + "</span></td>" : "<td>+" + fmt(e.gap) + "</td>";
                h += "<td>" + fmt(e.fvWithFee) + "</td></tr>";
            });
            h += "</tbody></table></div>";
        }
        h += '<p class="cmp-calc-meta">' + esc(tr("calc_contributed", { amount: fmt(result.contributed) })) + "</p>";
        if (result.excludedNames.length) {
            h += '<p class="cmp-notice" role="status">' + esc(tr("calc_excluded", { names: result.excludedNames.join(", ") })) + "</p>";
        }
        result.warnings.forEach(function (name) {
            h += '<p class="cmp-warning">' + esc(tr("calc_fee_high", { name: name, limit: CompareCalc.LIMITS.FEE_HIGH_PCT })) + "</p>";
        });
        h += '<p class="cmp-disclaimer">' + esc(tr("calc_disclaimer")) + "</p>";
        h += "</div>";
        return h;
    }

    // ---------- DOM ----------
    var S = {
        ctx: null,
        values: null,
        built: false,
        urlTimer: null,
        inputTimer: null,
        inputs: {},
        errors: {},
        notes: {},
        labels: {},
        hints: {},
        out: null,
        copyBtn: null
    };

    function $(id) {
        return document.getElementById(id);
    }

    function mk(tag, cls, attrs) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        return e;
    }

    function ensureForm() {
        if (S.built) return true;
        var body = $("cmp-calc-body");
        if (!body) return false;
        var form = mk("div", "cmp-calc-form");
        FIELDS.forEach(function (f) {
            var wrap = mk("div", "cmp-field");
            var label = mk("label", "cmp-label", { for: f.id });
            var describedBy = f.id + "-err";
            var input = mk("input", "cmp-input", { type: "text", inputmode: f.mode, autocomplete: "off", id: f.id });
            if (f.placeholder) input.setAttribute("placeholder", f.placeholder);
            wrap.appendChild(label);
            wrap.appendChild(input);
            if (f.hint) {
                var hint = mk("p", "cmp-hint", { id: f.id + "-hint" });
                wrap.appendChild(hint);
                S.hints[f.key] = hint;
                describedBy = f.id + "-hint " + describedBy;
            }
            input.setAttribute("aria-describedby", describedBy);
            var note = mk("p", "cmp-notice", { id: f.id + "-note" });
            note.setAttribute("hidden", "");
            var err = mk("p", "cmp-field-error", { id: f.id + "-err" });
            err.setAttribute("hidden", "");
            wrap.appendChild(note);
            wrap.appendChild(err);
            form.appendChild(wrap);
            S.inputs[f.key] = input;
            S.labels[f.key] = label;
            S.errors[f.key] = err;
            S.notes[f.key] = note;
            input.addEventListener("input", scheduleInput);
            input.addEventListener("change", update);
            input.addEventListener("blur", function () { onBlur(f); });
        });
        body.appendChild(form);

        S.out = mk("div", null, { id: "cmp-calc-out" });
        body.appendChild(S.out);
        S.copyBtn = mk("button", "cmp-btn", { type: "button", id: "cmp-calc-copy" });
        body.appendChild(S.copyBtn);
        S.copyBtn.addEventListener("click", function () {
            if (typeof CompareView === "object") CompareView.copyCurrentUrl(S.copyBtn);
        });
        S.built = true;
        return true;
    }

    function applyTexts() {
        FIELDS.forEach(function (f) {
            S.labels[f.key].textContent = tr(f.label);
            if (f.hint) S.hints[f.key].textContent = tr(f.hint);
        });
        S.copyBtn.textContent = tr("compare_copy_link");
    }

    function setFieldValues(v) {
        FIELDS.forEach(function (f) {
            S.inputs[f.key].value = f.amount ? fmt(v[f.key]) : String(v[f.key]);
        });
    }

    function onBlur(f) {
        var n = parseNumberInput(S.inputs[f.key].value);
        if (n === null || n !== n) return;
        var raw = Object.assign({}, DEFAULTS);
        raw[f.key] = n;
        var norm = CompareCalc.normalizeInputs(raw);
        var val = norm[f.key];
        S.inputs[f.key].value = f.amount ? fmt(val) : String(val);
    }

    function clampLimit(f, raw) {
        var L = CompareCalc.LIMITS;
        if (f.key === "years") return raw > L.MAX_YEARS ? L.MAX_YEARS : L.MIN_YEARS;
        if (f.key === "annualReturnPct") return raw > L.MAX_RETURN_PCT ? L.MAX_RETURN_PCT : L.MIN_RETURN_PCT;
        return L.MAX_AMOUNT.toLocaleString("ko-KR");
    }

    function showError(f, on) {
        var input = S.inputs[f.key];
        var err = S.errors[f.key];
        if (on) {
            input.setAttribute("aria-invalid", "true");
            err.textContent = tr(f.err);
            err.removeAttribute("hidden");
        } else {
            input.removeAttribute("aria-invalid");
            err.textContent = "";
            err.setAttribute("hidden", "");
        }
    }

    function update() {
        if (!S.built || !S.ctx) return;
        var invalid = false;
        var raw = {};
        FIELDS.forEach(function (f) {
            var n = parseNumberInput(S.inputs[f.key].value);
            if (n === null) n = DEFAULTS[f.key];
            var bad = n !== n || (f.amount && n < 0);
            showError(f, bad);
            if (bad) invalid = true;
            else raw[f.key] = n;
        });
        if (invalid) {
            S.out.setAttribute("hidden", "");
            var msgs = FIELDS.filter(function (f) { return S.inputs[f.key].getAttribute("aria-invalid") === "true"; })
                .map(function (f) { return tr(f.err); });
            if (typeof CompareView === "object") CompareView.announce(msgs.join(" "));
            return;
        }
        var n = CompareCalc.normalizeInputs(raw);
        FIELDS.forEach(function (f) {
            var note = S.notes[f.key];
            var v = f.key === "years" ? Math.round(raw[f.key]) : raw[f.key];
            if (v !== n[f.key]) {
                note.textContent = tr("calc_clamped", { limit: clampLimit(f, raw[f.key]) });
                note.removeAttribute("hidden");
            } else {
                note.textContent = "";
                note.setAttribute("hidden", "");
            }
        });
        S.values = n;
        S.out.innerHTML = renderResultHtml(buildCalcResult(n, S.ctx.items));
        S.out.removeAttribute("hidden");
        scheduleUrl();
    }

    function writeUrl() {
        if (!S.values || typeof history !== "object" || typeof location !== "object") return;
        history.replaceState(history.state, "", location.pathname + buildCalcSearch(location.search, S.values) + location.hash);
    }

    function scheduleUrl() {
        if (S.urlTimer) clearTimeout(S.urlTimer);
        S.urlTimer = setTimeout(function () {
            S.urlTimer = null;
            writeUrl();
        }, 300);
    }

    function flushUrl() {
        if (S.urlTimer) {
            clearTimeout(S.urlTimer);
            S.urlTimer = null;
            writeUrl();
        }
    }

    function scheduleInput() {
        if (S.inputTimer) clearTimeout(S.inputTimer);
        S.inputTimer = setTimeout(function () {
            S.inputTimer = null;
            update();
        }, 150);
    }

    function onCtx(ctx) {
        S.ctx = ctx;
        var section = $("cmp-calc");
        if (section) section.removeAttribute("hidden");
        var first = !S.built;
        if (!ensureForm()) return;
        if (first) S.values = readCalcParams(location.search);
        applyTexts();
        if (first) setFieldValues(S.values);
        update();
    }

    var api = {
        DEFAULTS: DEFAULTS,
        parseNumberInput: parseNumberInput,
        readCalcParams: readCalcParams,
        buildCalcSearch: buildCalcSearch,
        buildCalcResult: buildCalcResult,
        renderResultHtml: renderResultHtml
    };
    root().CompareCalculatorUI = api;

    if (typeof CompareView === "object" && CompareView && typeof CompareCalc === "object" && CompareCalc) {
        CompareView.onBeforeCopy(flushUrl);
        CompareView.onRender(onCtx);
    }
})();
