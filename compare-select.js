(function () {
    "use strict";

    var STORAGE_KEY = "etf.compare.selection.v1";
    var MAX = 4;
    var CODE_RE = /^[0-9A-Z]{6}$/;

    function sanitizeCodes(list) {
        var out = [];
        if (!Array.isArray(list)) return out;
        for (var i = 0; i < list.length; i++) {
            if (typeof list[i] !== "string") continue;
            var c = list[i].trim().toUpperCase();
            if (!CODE_RE.test(c) || out.indexOf(c) !== -1) continue;
            out.push(c);
            if (out.length >= MAX) break;
        }
        return out;
    }

    function readSelection(storage) {
        if (!storage) return [];
        try {
            var raw = storage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return sanitizeCodes(JSON.parse(raw));
        } catch (e) {
            return [];
        }
    }

    function writeSelection(storage, codes) {
        if (!storage) return;
        try {
            storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeCodes(codes)));
        } catch (e) {
            /* ignore quota / private mode */
        }
    }

    function tryAdd(list, code) {
        var c = typeof code === "string" ? code.trim().toUpperCase() : "";
        if (!CODE_RE.test(c)) return { ok: false, reason: "invalid" };
        if (list.indexOf(c) !== -1) return { ok: true, list: list };
        if (list.length >= MAX) return { ok: false, reason: "limit" };
        return { ok: true, list: list.concat([c]) };
    }

    function removeCode(list, code) {
        var out = [];
        for (var i = 0; i < list.length; i++) {
            if (list[i] !== code) out.push(list[i]);
        }
        return out;
    }

    function buildCompareHref(codes, lang) {
        var safe = sanitizeCodes(codes);
        if (safe.length < 2) return null;
        var href = "/compare/?compare=" + safe.join(",");
        if (typeof lang === "string" && /^[a-z]{2}$/.test(lang) && lang !== "ko") {
            href += "&lang=" + lang;
        }
        return href;
    }

    /* ---------- storage (Safari private mode may throw on access) ---------- */
    var memoryStore = null;
    function getStorage() {
        try {
            if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
        } catch (e) {
            /* fall through */
        }
        if (!memoryStore) {
            var data = {};
            memoryStore = {
                getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
                setItem: function (k, v) { data[k] = String(v); }
            };
        }
        return memoryStore;
    }

    var selection = readSelection(getStorage());
    var noticeTimer = null;

    function persist() {
        writeSelection(getStorage(), selection);
    }

    function t(key, vars) {
        var text = typeof getTranslation === "function" ? getTranslation(key) : key;
        if (text === undefined || text === null) text = key;
        text = String(text);
        if (vars) {
            if (typeof formatFeeTemplate === "function") return formatFeeTemplate(text, vars);
            return text.replace(/\{([a-z]+)\}/g, function (m, k) {
                return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
            });
        }
        return text;
    }

    /* ---------- DOM helpers ---------- */
    function el(tag, cls) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        return node;
    }

    function getBar() {
        var bar = document.getElementById("compare-bar");
        if (bar) return bar;
        bar = el("aside", "cmp-bar");
        bar.setAttribute("id", "compare-bar");
        bar.setAttribute("role", "region");
        bar.setAttribute("hidden", "");

        var inner = el("div", "cmp-bar-inner");
        var status = el("div", "cmp-bar-status");
        status.appendChild(el("span", "cmp-bar-count"));
        status.appendChild(el("span", "cmp-bar-helper"));
        var notice = el("p", "cmp-bar-notice");
        notice.setAttribute("hidden", "");
        status.appendChild(notice);

        var actions = el("div", "cmp-bar-actions");
        var clear = el("button", "cmp-bar-clear");
        clear.setAttribute("type", "button");
        clear.addEventListener("click", onClear);
        var go = el("a", "cmp-bar-go");
        go.addEventListener("click", function (ev) {
            if (go.getAttribute("aria-disabled") === "true") ev.preventDefault();
        });
        actions.appendChild(clear);
        actions.appendChild(go);

        inner.appendChild(status);
        inner.appendChild(actions);
        bar.appendChild(inner);
        document.body.appendChild(bar);
        return bar;
    }

    function getLive() {
        var live = document.getElementById("cmp-live");
        if (live) return live;
        live = el("div", "cmp-sr-only");
        live.setAttribute("id", "cmp-live");
        live.setAttribute("role", "status");
        live.setAttribute("aria-live", "polite");
        document.body.appendChild(live);
        return live;
    }

    function announce(text) {
        getLive().textContent = text;
    }

    function part(bar, cls) {
        return bar.querySelector("." + cls);
    }

    function showNotice(text) {
        var n = part(getBar(), "cmp-bar-notice");
        if (!n) return;
        n.textContent = text;
        n.removeAttribute("hidden");
        if (noticeTimer) clearTimeout(noticeTimer);
        noticeTimer = setTimeout(function () {
            n.textContent = "";
            n.setAttribute("hidden", "");
            noticeTimer = null;
        }, 3000);
    }

    function renderBar() {
        var bar = getBar();
        getLive();
        bar.setAttribute("aria-label", t("compare_bar_label"));
        var count = selection.length;
        if (count === 0) {
            bar.setAttribute("hidden", "");
            document.body.classList.remove("has-compare-bar");
            return;
        }
        bar.removeAttribute("hidden");
        document.body.classList.add("has-compare-bar");
        part(bar, "cmp-bar-count").textContent = t("compare_bar_count", { count: count });
        part(bar, "cmp-bar-clear").textContent = t("compare_bar_clear");
        var go = part(bar, "cmp-bar-go");
        var helper = part(bar, "cmp-bar-helper");
        go.textContent = t("compare_bar_go");
        if (count < 2) {
            go.removeAttribute("href");
            go.setAttribute("aria-disabled", "true");
            go.setAttribute("tabindex", "0");
            helper.textContent = t("compare_bar_need_more");
        } else {
            var lang = typeof currentLanguage === "string" ? currentLanguage : "ko";
            go.setAttribute("href", buildCompareHref(selection, lang));
            go.removeAttribute("aria-disabled");
            helper.textContent = "";
        }
    }

    function allChecks() {
        return document.querySelectorAll(".cmp-check");
    }

    function refreshBoxes() {
        var boxes = allChecks();
        var full = selection.length >= MAX;
        for (var i = 0; i < boxes.length; i++) {
            var box = boxes[i];
            var on = selection.indexOf(box.dataset.code) !== -1;
            box.checked = on;
            var label = box.parentNode;
            if (full && !on) {
                box.setAttribute("aria-disabled", "true");
                if (label && label.classList) label.classList.add("is-dim");
            } else {
                box.removeAttribute("aria-disabled");
                if (label && label.classList) label.classList.remove("is-dim");
            }
        }
    }

    function injectRow(tr) {
        var code = String(tr.dataset.code || "").toUpperCase();
        if (!CODE_RE.test(code)) return;
        if (tr.querySelector(".cmp-check")) return;
        var cell = tr.querySelector("td.name-cell");
        if (!cell) return;
        var link = cell.querySelector(".stock-link");
        if (!link) return;

        var wrap = link.parentNode;
        if (!wrap.classList || !wrap.classList.contains("cmp-name-wrap")) {
            wrap = el("span", "cmp-name-wrap");
            link.parentNode.insertBefore(wrap, link);
            wrap.appendChild(link);
        }

        var label = el("label", "cmp-pick");
        var input = el("input", "cmp-check");
        input.setAttribute("type", "checkbox");
        input.dataset.code = code;
        input.setAttribute("aria-label", t("compare_select_label", { name: String(link.textContent || "").trim() }));
        var box = el("span", "cmp-pick-box");
        box.setAttribute("aria-hidden", "true");
        label.appendChild(input);
        label.appendChild(box);
        wrap.insertBefore(label, wrap.firstChild);
        cell.classList.add("cmp-name-cell");
    }

    function sync() {
        var tbody = document.getElementById("tableBody");
        if (tbody) {
            var rows = tbody.querySelectorAll("tr[data-code]");
            for (var i = 0; i < rows.length; i++) injectRow(rows[i]);
        }
        refreshBoxes();
        renderBar();
    }

    function nameOf(box) {
        var wrap = box.parentNode && box.parentNode.parentNode;
        var link = wrap && wrap.querySelector ? wrap.querySelector(".stock-link") : null;
        var name = link ? String(link.textContent || "").trim() : "";
        return name || box.dataset.code;
    }

    function onChange(ev) {
        var target = ev && ev.target;
        if (!target || !target.classList || !target.classList.contains("cmp-check")) return;
        var code = target.dataset.code;
        if (target.checked) {
            var res = tryAdd(selection, code);
            if (!res.ok) {
                target.checked = false;
                if (res.reason === "limit") {
                    var msg = t("compare_bar_limit");
                    showNotice(msg);
                    announce(msg);
                }
                return;
            }
            selection = res.list;
            persist();
            announce(t("compare_live_added", { name: nameOf(target), count: selection.length }));
        } else {
            selection = removeCode(selection, code);
            persist();
            announce(t("compare_live_removed", { name: nameOf(target), count: selection.length }));
        }
        refreshBoxes();
        renderBar();
    }

    function clear() {
        selection = [];
        persist();
        refreshBoxes();
        renderBar();
        announce(t("compare_live_cleared"));
    }

    function onClear() {
        clear();
        var first = document.querySelector(".cmp-check");
        if (first && first.focus) first.focus();
        else if (document.body && document.body.focus) document.body.focus();
    }

    function getSelection() {
        return selection.slice();
    }

    var CompareSelect = {
        STORAGE_KEY: STORAGE_KEY,
        MAX: MAX,
        CODE_RE: CODE_RE,
        sanitizeCodes: sanitizeCodes,
        readSelection: readSelection,
        writeSelection: writeSelection,
        tryAdd: tryAdd,
        removeCode: removeCode,
        buildCompareHref: buildCompareHref,
        sync: sync,
        getSelection: getSelection,
        clear: clear
    };
    (typeof globalThis !== "undefined" ? globalThis : window).CompareSelect = CompareSelect;

    if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("change", onChange);
        document.addEventListener("etf:table-rendered", sync);
        document.addEventListener("etf:lang-changed", sync);
        if (document.readyState !== "loading") sync();
        else document.addEventListener("DOMContentLoaded", sync);
    }
})();
