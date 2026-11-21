// portfolio-view.js - portfolio page view: boot, states, storage, combobox, form, rows table.
(function () {
    "use strict";

    var Calc = window.PortfolioCalc;
    var Format = window.PortfolioFormat;
    var Shell = window.PortfolioShell;

    var state = {
        list: [], byCode: {}, rows: [], editIndex: -1, selected: null,
        prices: {}, failed: [], result: null, period: "all",
        storageError: null, lastAnnouncedStorage: null, pendingImport: null, todayIso: ""
    };
    var store = null;
    var booted = false;
    var loadingData = false;
    var combo = { options: [], active: -1 };
    var FIELDS = ["code", "qty", "date"];

    function t(key, vars) { return Shell.t(key, vars); }
    function el(id) { return document.getElementById(id); }

    function setHidden(id, hidden) {
        var n = el(id);
        if (!n) return;
        if (hidden) n.setAttribute("hidden", "");
        else n.removeAttribute("hidden");
    }

    function announce(text) {
        var live = el("pf-live");
        if (!live || !text) return;
        live.textContent = "";
        setTimeout(function () { live.textContent = text; }, 0);
    }

    function nameOf(code) { return state.byCode[code] ? String(state.byCode[code]["종목명"]) : code; }

    function mk(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function getStorage() {
        try {
            return window.localStorage;
        } catch (e) {
            // blocked storage: every call throws so the store reports STORAGE_UNAVAILABLE
            var fail = function () { throw { name: "SecurityError" }; };
            return { getItem: fail, setItem: fail, removeItem: fail };
        }
    }

    // ---- page states ----
    function renderLoading() {
        var box = el("pf-state");
        box.textContent = "";
        box.appendChild(mk("div", "cmp-skeleton"));
        box.appendChild(mk("div", "cmp-skeleton"));
        box.appendChild(mk("span", "cmp-sr-only", t("pf_loading")));
        setHidden("pf-state", false);
        setHidden("pf-app", true);
        announce(t("pf_loading"));
    }

    function renderError() {
        var box = el("pf-state");
        box.textContent = "";
        box.appendChild(mk("p", "cmp-error", t("pf_load_error")));
        var btn = mk("button", "cmp-btn", t("pf_retry"));
        btn.id = "pf-retry";
        btn.type = "button";
        btn.addEventListener("click", function () {
            if (btn.getAttribute("aria-disabled") === "true") return;
            loadData(true);
        });
        box.appendChild(btn);
        setHidden("pf-state", false);
        announce(t("pf_load_error"));
    }

    var FETCH_TIMEOUT_MS = 15000;

    // fetch + json with a timeout, so a hung request rejects instead of wedging the page
    function fetchJson(url) {
        var ctl = window.AbortController ? new AbortController() : null;
        var timer = ctl ? setTimeout(function () { ctl.abort(); }, FETCH_TIMEOUT_MS) : null;
        return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
            if (!r.ok) throw new Error("http");
            return r.json();
        }).then(function (d) { clearTimeout(timer); return d; }, function (e) { clearTimeout(timer); throw e; });
    }

    function loadData(isRetry) {
        if (loadingData) return;
        loadingData = true;
        var retry = el("pf-retry");
        if (isRetry && retry) {
            retry.setAttribute("aria-disabled", "true");
            retry.textContent = t("pf_loading_short");
        } else {
            renderLoading();
        }
        fetchJson("/data.json").then(function (data) {
            if (!Array.isArray(data)) throw new Error("shape");
            loadingData = false;
            start(data);
            if (isRetry) el("pf-title").focus();
        }).catch(function () {
            loadingData = false;
            if (isRetry && retry && retry.isConnected) {
                retry.removeAttribute("aria-disabled");
                retry.textContent = t("pf_retry");
                retry.focus();
                announce(t("pf_load_error"));
            } else {
                renderError();
            }
        });
    }

    function start(data) {
        state.list = [];
        state.byCode = {};
        data.forEach(function (r) {
            if (!r || r["종목코드"] === undefined) return;
            var code = Calc.normalizeCode(r["종목코드"]);
            if (!code || state.byCode[code]) return;
            state.byCode[code] = r;
            state.list.push({ code: code, name: String(r["종목명"]) });
        });
        state.todayIso = Format.localTodayIso();
        el("pf-date").setAttribute("max", state.todayIso);
        store = window.PortfolioStore.create({
            storage: getStorage(),
            allowedCodes: state.list.map(function (x) { return x.code; }),
            todayIso: state.todayIso
        });
        var loaded = store.load();
        state.rows = loaded.rows || [];
        if (!loaded.ok) showStorage(loaded);
        el("pf-state").textContent = "";
        setHidden("pf-state", true);
        setHidden("pf-app", false);
        booted = true;
        renderRows();
        updateResults(null);
    }

    // ---- storage banner ----
    function showStorage(result) {
        var box = el("pf-storage-msg");
        var key = result && !result.ok ? Format.storageErrorKey(result.error) : null;
        if (!key) {
            state.storageError = null;
            state.lastAnnouncedStorage = null;
            box.textContent = "";
            box.setAttribute("hidden", "");
            return;
        }
        state.storageError = result.error;
        box.textContent = t(key);
        box.removeAttribute("hidden");
        if (state.lastAnnouncedStorage !== result.error) {
            state.lastAnnouncedStorage = result.error;
            announce(t(key));
        }
    }

    function saveRows() { showStorage(store.save(state.rows)); }

    // ---- rows table ----
    function updateScrollable() {
        var wraps = document.querySelectorAll(".cmp-table-wrap");
        for (var i = 0; i < wraps.length; i++) {
            if (wraps[i].scrollWidth > wraps[i].clientWidth) wraps[i].classList.add("is-scrollable");
            else wraps[i].classList.remove("is-scrollable");
        }
    }

    function actionBtn(action, index, labelKey, ariaKey, name) {
        var b = mk("button", "cmp-btn", t(labelKey));
        b.type = "button";
        b.setAttribute("data-action", action);
        b.setAttribute("data-index", String(index));
        b.setAttribute("aria-label", t(ariaKey, { row: index + 1, name: name }));
        return b;
    }

    function renderRows() {
        var body = el("pf-rows-body");
        // the rebuild detaches the focused button; remember it and refocus the same action afterwards
        var ae = document.activeElement;
        var keep = ae && ae.getAttribute && body.contains(ae) && ae.getAttribute("data-action")
            ? { action: ae.getAttribute("data-action"), index: ae.getAttribute("data-index") } : null;
        body.textContent = "";
        var asOf = state.result && state.result.asOf;
        state.rows.forEach(function (row, i) {
            var name = nameOf(row.code);
            var tr = document.createElement("tr");
            var th = document.createElement("th");
            th.setAttribute("scope", "row");
            th.appendChild(document.createTextNode(name + " "));
            th.appendChild(mk("span", "cmp-etf-code", row.code));
            tr.appendChild(th);
            tr.appendChild(mk("td", "", row.qty));
            tr.appendChild(mk("td", "", row.startDate));
            var v = Format.rowLatestValue(row, state.prices[row.code], asOf);
            tr.appendChild(mk("td", "", typeof v === "number"
                ? t("pf_won", { amount: Format.formatWon(v, Shell.htmlLang()) }) : "-"));
            var td = document.createElement("td");
            var box = mk("div", "pf-row-actions");
            var edit = actionBtn("edit", i, "pf_edit", "pf_edit_row_aria", name);
            var del = actionBtn("delete", i, "pf_delete", "pf_delete_row_aria", name);
            if (i === state.editIndex) {
                tr.setAttribute("aria-current", "true");
                del.setAttribute("aria-disabled", "true");
            }
            box.appendChild(edit);
            box.appendChild(del);
            td.appendChild(box);
            tr.appendChild(td);
            body.appendChild(tr);
        });
        var empty = state.rows.length === 0;
        setHidden("pf-rows-wrap", empty);
        setHidden("pf-rows-empty", !empty);
        if (empty) el("pf-export").setAttribute("aria-disabled", "true");
        else el("pf-export").removeAttribute("aria-disabled");
        updateScrollable();
        updateSubmitState();
        var again = keep && rowBtn(keep.index, keep.action);
        if (again) again.focus();
    }

    function rowBtn(index, action) {
        return el("pf-rows-body").querySelector('button[data-action="' + action + '"][data-index="' + index + '"]');
    }

    function rowsChanged(liveText) {
        saveRows();
        renderRows();
        updateResults(liveText);
    }

    // ---- results: price loading, compute, summary, fee line, weights, warnings ----
    var fetchSeq = 0;
    var chartWidth = 0;
    var chartOpened = false;
    var resizeTimer = null;

    function won(v) { return t("pf_won", { amount: Format.formatWon(v, Shell.htmlLang()) }); }
    // amount already formatted (signed) by Format.dayChange / tableRows
    function wonText(amount) { return t("pf_won", { amount: amount }); }

    function heldCodes() {
        var seen = {};
        var out = [];
        state.rows.forEach(function (r) { if (!seen[r.code]) { seen[r.code] = true; out.push(r.code); } });
        return out;
    }

    // per-code catch: one failed code never blocks the others; only codes from /data.json reach the URL
    function loadPrices(codes) {
        return Promise.all(codes.map(function (code) {
            return fetchJson("/prices/" + code + ".json").then(function (d) {
                if (!d || !Array.isArray(d.dates)) throw new Error("shape");
                state.prices[code] = d;
                return null;
            }).catch(function () { return code; });
        })).then(function (res) { return res.filter(Boolean); });
    }

    function showEmpty(titleKey, bodyKey) {
        if (titleKey) el("pf-empty-title").textContent = t(titleKey);
        setHidden("pf-empty-title", !titleKey);
        el("pf-empty-body").textContent = t(bodyKey);
        setHidden("pf-empty", false);
    }

    function skeletons(id) {
        var box = el(id);
        box.textContent = "";
        for (var i = 0; i < 3; i++) box.appendChild(mk("div", "cmp-skeleton"));
    }

    function readyText() {
        var r = state.result;
        return r.dates.length
            ? t("pf_ready", { total: won(r.total[r.total.length - 1]), asof: r.asOf })
            : t("pf_no_result");
    }

    function updateResults(liveText) {
        var seq = ++fetchSeq;
        if (!state.rows.length) {
            state.result = null;
            state.failed = [];
            el("pf-results").setAttribute("aria-busy", "false");
            showEmpty("pf_empty_title", "pf_empty_body");
            setHidden("pf-summary", true);
            setHidden("pf-chart", true);
            setHidden("pf-warnings", true);
            if (liveText) announce(liveText);
            return;
        }
        var need = heldCodes().filter(function (c) { return state.byCode[c] && !state.prices[c]; });
        if (need.length) {
            el("pf-results").setAttribute("aria-busy", "true");
            setHidden("pf-empty", true);
            skeletons("pf-summary-body");
            skeletons("pf-chart-body");
            setHidden("pf-summary", false);
            setHidden("pf-chart", false);
            announce(t("pf_loading_prices"));
        }
        loadPrices(need).then(function (failed) {
            if (seq !== fetchSeq) return;
            state.failed = failed;
            recompute();
            announce(liveText ? liveText + " " + readyText() : readyText());
        }).catch(function () {
            if (seq !== fetchSeq) return;
            el("pf-results").setAttribute("aria-busy", "false");
            setHidden("pf-summary", true);
            setHidden("pf-chart", true);
            showEmpty(null, "pf_load_error");
            announce(t("pf_load_error"));
        });
    }

    function recompute() {
        state.result = Calc.compute(state.rows, state.prices, { todayIso: state.todayIso });
        el("pf-results").setAttribute("aria-busy", "false");
        renderRows();
        renderResults();
    }

    function stat(label, valueNode) {
        var box = mk("div", "pf-stat");
        box.appendChild(mk("p", "pf-stat-label", label));
        box.appendChild(valueNode);
        return box;
    }

    function feeOf(code, key) {
        var v = state.byCode[code] && state.byCode[code][key];
        return typeof v === "number" && isFinite(v) ? v : null;
    }

    function feeLine(r) {
        var latest = Format.latestByCode(r);
        var main = Format.weightedFee(latest, function (c) { return feeOf(c, "총보수"); });
        var real = Format.weightedFee(latest, function (c) { return feeOf(c, "실부담비용"); });
        var p = mk("p", "pf-fee-line");
        if (!main) { p.textContent = t("pf_fee_none"); return p; }
        var text = t("pf_fee_line", { fee: Format.formatFee(main.fee), cost: won(main.cost) });
        if (real) text += " " + t("pf_fee_real", { fee: Format.formatFee(real.fee), cost: won(real.cost) });
        if (main.excluded.length) text += " " + t("pf_fee_partial", { names: main.excluded.map(nameOf).join(", ") });
        p.textContent = text;
        return p;
    }

    function renderSummary(r) {
        var body = el("pf-summary-body");
        body.textContent = "";
        var stats = mk("div", "pf-stats");
        stats.appendChild(stat(t("pf_stat_total"), mk("p", "pf-stat-value", won(r.total[r.total.length - 1]))));

        var dc = Format.dayChange(r.total, Shell.htmlLang());
        var cv = mk("p", "pf-stat-value");
        if (!dc) cv.textContent = "-";
        else {
            if (dc.dir !== "flat") cv.className += " pf-" + dc.dir;
            var arrow = mk("span", "pf-arrow", dc.arrow);
            arrow.setAttribute("aria-hidden", "true");
            cv.appendChild(arrow);
            cv.appendChild(mk("span", "cmp-sr-only", t("pf_" + dc.dir)));
            cv.appendChild(document.createTextNode(" " + wonText(dc.amount) + " (" + dc.pct + ")"));
        }
        stats.appendChild(stat(t("pf_stat_change"), cv));

        var cell = stat(t("pf_stat_asof"), mk("p", "pf-stat-value", r.asOf));
        cell.appendChild(mk("p", "pf-asof-note", t("pf_asof_note")));
        stats.appendChild(cell);
        body.appendChild(stats);

        body.appendChild(feeLine(r));
        body.appendChild(mk("h3", "pf-weights-title", t("pf_weights_title")));
        var ul = mk("ul", "pf-weights");
        Format.weights(r).forEach(function (w) {
            var li = document.createElement("li");
            var head = mk("div", "pf-weight-head");
            var nm = mk("span", "pf-weight-name", nameOf(w.code) + " ");
            nm.appendChild(mk("span", "cmp-etf-code", w.code));
            head.appendChild(nm);
            head.appendChild(mk("span", "pf-weight-pct", (w.pct === null ? "-" : w.pct.toFixed(1) + "%") + " · " + won(w.value)));
            li.appendChild(head);
            var bar = mk("div", "pf-bar");
            bar.setAttribute("aria-hidden", "true");
            var fill = document.createElement("span");
            fill.style.width = (w.pct === null ? 0 : Math.max(0, Math.min(100, w.pct))) + "%";
            bar.appendChild(fill);
            li.appendChild(bar);
            ul.appendChild(li);
        });
        body.appendChild(ul);
    }

    function renderWarnings() {
        var pre = [];
        var seen = {};
        state.rows.forEach(function (row) {
            var first = Format.firstPriceDate(state.prices[row.code]);
            if (first && row.startDate < first && !seen[row.code]) {
                seen[row.code] = true;
                pre.push({ code: row.code, date: first });
            }
        });
        var items = Format.warningItems({
            warnings: state.result ? state.result.warnings : [],
            fetchFailed: state.failed, preListing: pre, nameOf: nameOf
        });
        var list = el("pf-warn-list");
        list.textContent = "";
        items.forEach(function (it) { list.appendChild(mk("li", "", t(it.key, it.vars))); });
        var actions = el("pf-warn-actions");
        var btn = el("pf-retry-prices");
        if (state.failed.length) {
            // the same button stays mounted across a retry so focus is kept
            if (!btn) {
                btn = mk("button", "cmp-btn pf-retry");
                btn.id = "pf-retry-prices";
                btn.type = "button";
                btn.addEventListener("click", onRetryPrices);
                actions.appendChild(btn);
            }
            if (btn.getAttribute("aria-disabled") !== "true") btn.textContent = t("pf_retry_prices");
        } else if (btn && btn.getAttribute("aria-disabled") !== "true") {
            actions.textContent = "";
        }
        setHidden("pf-warnings", items.length === 0);
    }

    function onRetryPrices() {
        var btn = el("pf-retry-prices");
        if (btn.getAttribute("aria-disabled") === "true") return;
        btn.setAttribute("aria-disabled", "true");
        btn.textContent = t("pf_loading_short");
        var held = heldCodes();
        var codes = state.failed.filter(function (c) { return held.indexOf(c) >= 0; });
        var seq = fetchSeq;
        loadPrices(codes).then(function (failed) {
            if (seq !== fetchSeq) {
                // rows changed meanwhile: a newer updateResults owns the state; only release the button
                btn.removeAttribute("aria-disabled");
                if (state.result) renderWarnings();
                return;
            }
            state.failed = state.failed.filter(function (c) { return codes.indexOf(c) < 0; }).concat(failed);
            recompute();
            btn.removeAttribute("aria-disabled");
            if (failed.length) {
                btn.textContent = t("pf_retry_prices");
                btn.focus();
            } else {
                btn.remove();
                (el("pf-warnings").hasAttribute("hidden") ? el("pf-chart-h") : el("pf-warnings-h")).focus();
            }
            announce(readyText());
        });
    }

    function renderResults() {
        var r = state.result;
        if (!r) return;
        if (!r.dates.length) {
            showEmpty(null, "pf_no_result");
            setHidden("pf-summary", true);
            setHidden("pf-chart", true);
        } else {
            setHidden("pf-empty", true);
            setHidden("pf-summary", false);
            renderSummary(r);
            renderChart();
        }
        renderWarnings();
        updateScrollable();
    }

    // ---- chart ----
    var cursorTimer = null;
    var cursorText = "";
    // throttled: holding an arrow key must not flood the live region
    function announceCursor(text) {
        cursorText = text;
        if (cursorTimer) return;
        cursorTimer = setTimeout(function () { cursorTimer = null; announce(cursorText); }, 400);
    }

    function renderChart() {
        var r = state.result;
        var lang = Shell.htmlLang();
        setHidden("pf-chart", false);
        var chips = el("pf-periods").querySelectorAll("button[data-period]");
        for (var c = 0; c < chips.length; c++) {
            chips[c].setAttribute("aria-pressed", chips[c].getAttribute("data-period") === state.period ? "true" : "false");
        }
        var i = Format.periodStartIndex(r.dates, state.period);
        var dates = r.dates.slice(i);
        var values = r.total.slice(i);
        var body = el("pf-chart-body");
        chartWidth = body.clientWidth;
        window.PortfolioChart.render(body, {
            dates: dates, values: values, width: chartWidth,
            ariaLabel: t("pf_chart_aria", {
                start: dates[0], end: dates[dates.length - 1],
                first: won(values[0]), last: won(values[values.length - 1])
            }),
            keysLabel: t("pf_chart_keys"),
            formatTick: function (v) { return Format.formatCompact(v, lang); },
            formatReadout: function (d, v) { return t("pf_readout", { date: d, amount: won(v) }); },
            onCursor: announceCursor
        });
        var tbl = Format.tableRows(dates, values, lang);
        var tbody = el("pf-chart-tbody");
        tbody.textContent = "";
        tbl.rows.forEach(function (row) {
            var tr = document.createElement("tr");
            var th = mk("th", "", row.date);
            th.setAttribute("scope", "row");
            tr.appendChild(th);
            tr.appendChild(mk("td", "", won(row.value)));
            tr.appendChild(mk("td", "", row.change ? wonText(row.change.amount) : "-"));
            tbody.appendChild(tr);
        });
        setHidden("pf-table-monthly", !tbl.monthly);
        if (!chartOpened) {
            chartOpened = true;
            if (window.matchMedia && window.matchMedia("(min-width: 640px)").matches) el("pf-chart-alt").setAttribute("open", "");
        }
    }

    function onPeriodClick(e) {
        var b = e.target.closest ? e.target.closest("button[data-period]") : null;
        if (!b || !state.result || !state.result.dates.length) return;
        state.period = b.getAttribute("data-period");
        renderChart();
        updateScrollable();
        b.focus();
        announce(t("pf_period_changed", { period: b.textContent }));
    }

    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            var w = el("pf-chart-body").clientWidth;
            if (w !== chartWidth && state.result && state.result.dates.length) renderChart();
        }, 150);
    }

    function onRowsClick(e) {
        var b = e.target.closest ? e.target.closest("button[data-action]") : null;
        if (!b || b.getAttribute("aria-disabled") === "true") return;
        var i = Number(b.getAttribute("data-index"));
        if (!(i >= 0 && i < state.rows.length)) return;
        if (b.getAttribute("data-action") === "edit") { enterEdit(i); return; }
        var name = nameOf(state.rows[i].code);
        state.rows.splice(i, 1);
        if (i < state.editIndex) state.editIndex--;
        rowsChanged(t("pf_deleted", { name: name }));
        var next = rowBtn(i, "delete") || rowBtn(i - 1, "delete");
        (next || el("pf-code")).focus();
    }

    // ---- combobox ----
    function labelOf(it) { return it.name + " · " + it.code; }

    function closeList() {
        var input = el("pf-code");
        setHidden("pf-code-list", true);
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        combo.options = [];
        combo.active = -1;
    }

    function openList(items) {
        var ul = el("pf-code-list");
        ul.textContent = "";
        combo.options = items;
        combo.active = -1;
        if (!items.length) {
            var none = mk("li", "pf-option", t("pf_combo_no_match"));
            none.setAttribute("role", "option");
            none.setAttribute("aria-disabled", "true");
            ul.appendChild(none);
        }
        items.forEach(function (it) {
            var li = mk("li", "pf-option");
            li.id = "pf-opt-" + it.code;
            li.setAttribute("role", "option");
            li.appendChild(document.createTextNode(it.name + " "));
            li.appendChild(mk("span", "pf-option-code", it.code));
            li.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
            li.addEventListener("click", function () { selectItem(it); });
            ul.appendChild(li);
        });
        setHidden("pf-code-list", false);
        el("pf-code").setAttribute("aria-expanded", "true");
        el("pf-code").removeAttribute("aria-activedescendant");
    }

    function selectItem(it) {
        var input = el("pf-code");
        input.value = labelOf(it);
        state.selected = { code: it.code, label: input.value };
        clearError("code");
        closeList();
        input.focus();
    }

    function moveActive(delta) {
        var n = combo.options.length;
        if (!n) return;
        var opts = el("pf-code-list").querySelectorAll('[role="option"]');
        combo.active = combo.active < 0 ? (delta > 0 ? 0 : n - 1) : (combo.active + delta + n) % n;
        for (var i = 0; i < opts.length; i++) {
            if (i === combo.active) opts[i].setAttribute("aria-selected", "true");
            else opts[i].removeAttribute("aria-selected");
        }
        el("pf-code").setAttribute("aria-activedescendant", opts[combo.active].id);
        if (opts[combo.active].scrollIntoView) opts[combo.active].scrollIntoView({ block: "nearest" });
    }

    function onComboKey(e) {
        var open = !el("pf-code-list").hasAttribute("hidden");
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!open) {
                var items = Format.matchOptions(state.list, el("pf-code").value);
                if (!items.length) return;
                openList(items);
            }
            e.preventDefault();
            moveActive(e.key === "ArrowDown" ? 1 : -1);
        } else if (e.key === "Enter") {
            if (open && combo.active >= 0) {
                e.preventDefault();
                selectItem(combo.options[combo.active]);
            }
        } else if (e.key === "Escape") {
            if (open) { e.preventDefault(); closeList(); }
            else if (el("pf-code").value) { e.preventDefault(); el("pf-code").value = ""; state.selected = null; }
        } else if (e.key === "Tab") {
            closeList();
        }
    }

    function onComboInput() {
        var v = el("pf-code").value;
        state.selected = null;
        clearError("code");
        if (!v.trim()) { closeList(); return; }
        openList(Format.matchOptions(state.list, v));
    }

    // ---- form ----
    var errKeys = { code: null, qty: null, date: null, form: null };

    function clearError(field) {
        errKeys[field] = null;
        var input = el("pf-" + field);
        if (input && input.removeAttribute) input.removeAttribute("aria-invalid");
        var err = el("pf-" + field + "-err");
        if (err) err.textContent = "";
    }

    function setError(field, key, vars) {
        errKeys[field] = { key: key, vars: vars };
        var input = el("pf-" + field);
        if (input) input.setAttribute("aria-invalid", "true");
        el("pf-" + field + "-err").textContent = t(key, vars);
    }

    function refreshErrors() {
        FIELDS.concat(["form"]).forEach(function (f) {
            if (errKeys[f]) el("pf-" + f + "-err").textContent = t(errKeys[f].key, errKeys[f].vars);
        });
    }

    function updateSubmitState() {
        var full = state.editIndex < 0 && state.rows.length >= Calc.LIMITS.MAX_ROWS;
        var b = el("pf-submit");
        if (full) b.setAttribute("aria-disabled", "true");
        else b.removeAttribute("aria-disabled");
    }

    function formTexts() {
        var editing = state.editIndex >= 0;
        el("pf-submit").textContent = t(editing ? "pf_save_edit" : "pf_add");
        setHidden("pf-cancel", !editing);
    }

    function resetForm() {
        el("pf-code").value = "";
        el("pf-qty").value = "";
        el("pf-date").value = "";
        state.selected = null;
        state.editIndex = -1;
        FIELDS.concat(["form"]).forEach(clearError);
        closeList();
        formTexts();
    }

    function enterEdit(i) {
        var row = state.rows[i];
        var it = { code: row.code, name: nameOf(row.code) };
        FIELDS.concat(["form"]).forEach(clearError);
        el("pf-code").value = labelOf(it);
        state.selected = { code: it.code, label: el("pf-code").value };
        el("pf-qty").value = row.qty;
        el("pf-date").value = row.startDate;
        closeList();
        state.editIndex = i;
        formTexts();
        renderRows();
        el("pf-code").focus();
    }

    function onCancel() {
        var i = state.editIndex;
        resetForm();
        renderRows();
        var b = rowBtn(i, "edit");
        (b || el("pf-code")).focus();
    }

    var DATE_ERR = { DATE_FORMAT: "pf_err_date_format", DATE_INVALID: "pf_err_date_invalid", DATE_FUTURE: "pf_err_date_future" };
    var QTY_ERR = { QTY_FORMAT: "pf_err_qty_format", QTY_NONPOSITIVE: "pf_err_qty_nonpositive" };

    function onSubmit(e) {
        e.preventDefault();
        FIELDS.concat(["form"]).forEach(clearError);
        var editing = state.editIndex >= 0;
        if (!editing && state.rows.length >= Calc.LIMITS.MAX_ROWS) {
            setError("form", "pf_err_rows_limit", { max: Calc.LIMITS.MAX_ROWS });
            return;
        }
        var code = Format.resolveCode(el("pf-code").value, state.selected, state.list);
        var qty = el("pf-qty").value.trim();
        var date = el("pf-date").value;
        var bad = [];
        if (!code) { setError("code", "pf_err_code"); bad.push("code"); }
        var q = Calc.validateQty(qty);
        if (q) { setError("qty", QTY_ERR[q]); bad.push("qty"); }
        var d = date ? Calc.validateDate(date, state.todayIso) : "DATE_FORMAT";
        if (d) { setError("date", DATE_ERR[d]); bad.push("date"); }
        if (bad.length) {
            el("pf-" + bad[0]).focus();
            announce(t("pf_form_invalid"));
            return;
        }
        var row = { code: code, qty: qty, startDate: date };
        var name = nameOf(code);
        if (editing) {
            var idx = state.editIndex;
            state.rows[idx] = row;
            resetForm();
            rowsChanged(t("pf_updated", { name: name }));
            var b = rowBtn(idx, "edit");
            (b || el("pf-code")).focus();
        } else {
            state.rows.push(row);
            resetForm();
            rowsChanged(t("pf_added", { name: name }));
            el("pf-code").focus();
        }
    }

    // ---- export / import ----
    function onExport() {
        if (el("pf-export").getAttribute("aria-disabled") === "true") {
            announce(t("pf_export_empty"));
            return;
        }
        var r = store.exportText(state.rows);
        var url = URL.createObjectURL(new Blob([r.text], { type: "application/json" }));
        var a = document.createElement("a");
        a.href = url;
        a.download = "etfsave-portfolio-" + state.todayIso + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 0);
        announce(t("pf_export_done"));
    }

    function resultMsg(key, vars) {
        var box = el("pf-import-result");
        box.textContent = "";
        box.appendChild(mk("p", "", t(key, vars)));
        box.removeAttribute("hidden");
        return box;
    }

    function importDone(count) {
        var msg = t("pf_import_done", { count: count });
        rowsChanged(msg);
        resultMsg("pf_import_done", { count: count });
    }

    function handleImport(text, replace) {
        if (!replace && state.rows.length > 0) { openConfirm(text); return; }
        var r = store.importRows(text, replace ? { replace: true } : undefined);
        if (r.ok) {
            if (state.editIndex >= 0) resetForm();
            var loaded = store.load();
            if (loaded.ok) {
                state.rows = loaded.rows;
                showStorage({ ok: true });
                importDone(r.imported);
                return;
            }
            r = { ok: false, error: "STORAGE_UNAVAILABLE" };
        }
        if (r.error === "CONFIRM_REQUIRED") { openConfirm(text); return; }
        if (r.error === "STORAGE_UNAVAILABLE" || r.error === "QUOTA_EXCEEDED") {
            // importRows already passed parse/format/version/row validation before the save failed
            var v = window.PortfolioStore.validateRows(window.PortfolioStore.migrate(JSON.parse(text)).rows, {
                allowedCodes: state.list.map(function (x) { return x.code; }), todayIso: state.todayIso
            });
            if (state.editIndex >= 0) resetForm();
            state.rows = v.rows;
            showStorage(r);
            renderRows();
            updateResults(t("pf_import_done", { count: v.rows.length }));
            resultMsg("pf_import_done", { count: v.rows.length });
            return;
        }
        if (r.error === "INVALID_ROWS") {
            var e = Format.importErrorItems(r.errors, 20);
            var box = el("pf-import-result");
            box.textContent = "";
            box.appendChild(mk("p", "", t("pf_import_invalid")));
            var ul = mk("ul", "", "");
            e.items.forEach(function (it) {
                var vars = it.messageKey === "pf_import_rows_limit" ? { max: 200 } : it.vars;
                var text2 = it.withRow
                    ? t("pf_import_row_error", { row: it.vars.row, field: it.fieldKey ? t(it.fieldKey) : "", message: it.messageKey ? t(it.messageKey, vars) : "" })
                    : (it.messageKey ? t(it.messageKey, vars) : t("pf_import_invalid"));
                ul.appendChild(mk("li", "", text2));
            });
            box.appendChild(ul);
            if (e.more > 0) box.appendChild(mk("p", "", t("pf_import_more", { count: e.more })));
            box.removeAttribute("hidden");
            announce(t("pf_import_invalid"));
            return;
        }
        var key = { PARSE_ERROR: "pf_import_parse", TOO_LARGE: "pf_import_too_large", UNSUPPORTED_VERSION: "pf_import_version" }[r.error] || "pf_import_format";
        resultMsg(key);
        announce(t(key));
    }

    function openConfirm(text) {
        state.pendingImport = text;
        el("pf-confirm-body").textContent = t("pf_confirm_body", { count: state.rows.length });
        el("pf-confirm").showModal();
    }

    function cancelConfirm() {
        state.pendingImport = null;
        if (el("pf-confirm").open) el("pf-confirm").close();
        announce(t("pf_import_cancelled"));
    }

    function onImportFile(e) {
        var input = e.target;
        var file = input.files && input.files[0];
        if (!file) return;
        var fail = function (key) {
            input.value = "";
            resultMsg(key);
            announce(t(key));
        };
        // size is checked before reading: a huge file must never be loaded into memory
        if (file.size > window.PortfolioStore.LIMITS.MAX_IMPORT_CHARS) { fail("pf_import_too_large"); return; }
        var done = function (text) {
            input.value = "";
            el("pf-import-result").textContent = "";
            setHidden("pf-import-result", true);
            try { handleImport(text, false); } catch (err) { fail("pf_import_format"); }
        };
        var broken = function () { fail("pf_import_format"); };
        if (file.text) file.text().then(done, broken);
        else {
            var fr = new FileReader();
            fr.onload = function () { done(String(fr.result)); };
            fr.onerror = broken;
            fr.readAsText(file);
        }
    }

    // ---- language ----
    function renderAll() {
        if (!booted) return;
        formTexts();
        refreshErrors();
        showStorage(state.storageError ? { ok: false, error: state.storageError } : { ok: true });
        renderRows();
        renderResults();
        if (el("pf-confirm").open) el("pf-confirm-body").textContent = t("pf_confirm_body", { count: state.rows.length });
        if (!el("pf-code-list").hasAttribute("hidden")) closeList();
    }

    function boot() {
        loadData(false);
        el("pf-rows-body").addEventListener("click", onRowsClick);
        var input = el("pf-code");
        input.addEventListener("input", onComboInput);
        input.addEventListener("keydown", onComboKey);
        input.addEventListener("blur", closeList);
        el("pf-qty").addEventListener("input", function () { clearError("qty"); });
        el("pf-date").addEventListener("input", function () { clearError("date"); });
        el("pf-form").addEventListener("submit", onSubmit);
        el("pf-cancel").addEventListener("click", onCancel);
        el("pf-periods").addEventListener("click", onPeriodClick);
        el("pf-export").addEventListener("click", onExport);
        el("pf-import").addEventListener("change", onImportFile);
        var dlg = el("pf-confirm");
        el("pf-confirm-cancel").addEventListener("click", cancelConfirm);
        dlg.addEventListener("cancel", cancelConfirm);
        dlg.addEventListener("close", function () { el("pf-import").focus(); });
        el("pf-confirm-ok").addEventListener("click", function () {
            var text = state.pendingImport;
            state.pendingImport = null;
            dlg.close();
            handleImport(text, true);
        });
        window.addEventListener("resize", onResize);
    }

    document.addEventListener("etf:lang-changed", renderAll);
    Shell.ready.then(boot);
})();
