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
        fetch("/data.json").then(function (r) {
            if (!r.ok) throw new Error("http");
            return r.json();
        }).then(function (data) {
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
        updateScrollable();
        updateSubmitState();
    }

    function rowBtn(index, action) {
        return el("pf-rows-body").querySelector('button[data-action="' + action + '"][data-index="' + index + '"]');
    }

    function rowsChanged(liveText) {
        saveRows();
        renderRows();
        updateResults(liveText);
    }

    // plan 08 replaces this body with price loading and rendering
    function updateResults(liveText) {
        setHidden("pf-empty", state.rows.length > 0);
        if (liveText) announce(liveText);
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

    // ---- language ----
    function renderAll() {
        if (!booted) return;
        formTexts();
        refreshErrors();
        showStorage(state.storageError ? { ok: false, error: state.storageError } : { ok: true });
        renderRows();
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
    }

    document.addEventListener("etf:lang-changed", renderAll);
    Shell.ready.then(boot);
})();
