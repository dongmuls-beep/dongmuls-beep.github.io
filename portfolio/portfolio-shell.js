// portfolio-shell.js - header/i18n shell for /portfolio/ (page does not load /script.js, so no analytics).
// Works in node (module.exports, pure helpers only) and in the browser (global PortfolioShell).
(function () {
    "use strict";

    var SUPPORTED = Object.freeze(["ko", "vi", "zh", "en", "ja", "th", "tl", "km"]);
    var DEFAULT_LANG = "ko";
    var LANG_META = Object.freeze({
        ko: { htmlLang: "ko-KR" }, vi: { htmlLang: "vi-VN" }, zh: { htmlLang: "zh-CN" },
        en: { htmlLang: "en-US" }, ja: { htmlLang: "ja-JP" }, th: { htmlLang: "th-TH" },
        tl: { htmlLang: "fil-PH" }, km: { htmlLang: "km-KH" }
    });
    var STORAGE_KEY = "site_language";

    function resolveLang(urlLang, savedLang, browserLang) {
        var cands = [urlLang, savedLang, browserLang];
        for (var i = 0; i < cands.length; i++) {
            if (typeof cands[i] === "string" && SUPPORTED.indexOf(cands[i]) !== -1) return cands[i];
        }
        return DEFAULT_LANG;
    }

    // Single pass so substituted values are never re-scanned.
    function interp(str, vars) {
        return String(str).replace(/\{(\w+)\}/g, function (m, name) {
            return vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
        });
    }

    function makeT(packs, lang) {
        return function (key, vars) {
            var order = [lang, "en", "ko"];
            for (var i = 0; i < order.length; i++) {
                var p = packs[order[i]];
                if (p && typeof p[key] === "string") return interp(p[key], vars);
            }
            return interp(key, vars);
        };
    }

    // Only these keys hold trusted local HTML (same as script.js); everything else is textContent.
    function isHtmlKey(key) {
        return key.indexOf("modal_policy_") === 0 || key.indexOf("footer_") === 0;
    }

    var state = { packs: {}, lang: DEFAULT_LANG, t: makeT({}, DEFAULT_LANG) };
    var resolveReady;
    var ready = new Promise(function (res) { resolveReady = res; });

    function t(key, vars) { return state.t(key, vars); }
    function lang() { return state.lang; }
    function htmlLang() { return LANG_META[state.lang].htmlLang; }

    function store(fn) {
        try { return fn(window.localStorage); } catch (e) { return null; }
    }

    function loadPack(code) {
        if (state.packs[code]) return Promise.resolve();
        return Promise.resolve().then(function () { return fetch("/i18n/" + code + ".json"); })
            .then(function (r) { return r.json(); })
            .then(function (j) { state.packs[code] = j; })
            .catch(function () { state.packs[code] = {}; });
    }

    var navEl, burger;

    function apply() {
        state.t = makeT(state.packs, state.lang);
        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            var key = el.getAttribute("data-i18n");
            var v = t(key);
            if (v === key) return;
            if (isHtmlKey(key)) el.innerHTML = v; // trusted repo-controlled i18n HTML
            else el.textContent = v;
        });
        document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
            var key = el.getAttribute("data-i18n-aria");
            var v = t(key);
            if (v !== key) el.setAttribute("aria-label", v);
        });
        if (navEl && burger) {
            var mk = navEl.classList.contains("active") ? "aria_menu_close" : "aria_menu_open";
            var ml = t(mk);
            if (ml !== mk) burger.setAttribute("aria-label", ml);
        }
        var title = t("pf_doc_title");
        if (title !== "pf_doc_title") document.title = title;
        document.documentElement.lang = htmlLang();
        var sel = document.getElementById("languageSelect");
        if (sel) sel.value = state.lang;
        document.dispatchEvent(new CustomEvent("etf:lang-changed"));
    }

    function setLanguage(code) {
        state.lang = resolveLang(code, null, null);
        store(function (ls) { ls.setItem(STORAGE_KEY, state.lang); });
        try {
            var url = new URL(window.location.href);
            if (state.lang === DEFAULT_LANG) url.searchParams.delete("lang");
            else url.searchParams.set("lang", state.lang);
            history.replaceState(null, "", url.toString());
        } catch (e) { /* history unavailable */ }
        return Promise.all([loadPack("ko"), loadPack("en"), loadPack(state.lang)]).then(apply);
    }

    function initNav() {
        navEl = document.getElementById("primaryNav");
        burger = document.querySelector(".hamburger-menu");
        if (!navEl || !burger) return;
        function setOpen(open) {
            navEl.classList.toggle("active", open);
            burger.classList.toggle("active", open);
            burger.setAttribute("aria-expanded", open ? "true" : "false");
            burger.setAttribute("aria-label", t(open ? "aria_menu_close" : "aria_menu_open"));
            document.body.classList.toggle("nav-open", open);
        }
        burger.addEventListener("click", function () { setOpen(!navEl.classList.contains("active")); });
        document.querySelectorAll(".nav-link").forEach(function (l) {
            l.addEventListener("click", function () { setOpen(false); });
        });
        document.addEventListener("click", function (e) {
            if (!navEl.classList.contains("active")) return;
            if (navEl.contains(e.target) || burger.contains(e.target)) return;
            setOpen(false);
        });
        document.addEventListener("keydown", function (e) {
            if (e.key !== "Escape") return;
            if (document.querySelector(".modal-overlay:not([hidden])")) return;
            if (navEl.classList.contains("active")) { setOpen(false); burger.focus(); }
        });
    }

    function initModal() {
        var link = document.getElementById("privacyPolicyLink");
        var modal = document.getElementById("privacyModal");
        var closeBtn = document.getElementById("privacyModalClose");
        if (!link || !modal || !closeBtn) return;
        var opener = null;
        var content = modal.querySelector(".modal-content");
        function close() {
            modal.setAttribute("hidden", "hidden");
            document.body.classList.remove("modal-open");
            if (opener && opener.isConnected) opener.focus();
        }
        link.addEventListener("click", function (e) {
            e.preventDefault();
            var a = document.activeElement;
            opener = a && a !== document.body ? a : link;
            modal.removeAttribute("hidden");
            document.body.classList.add("modal-open");
            if (content) setTimeout(function () { content.focus(); }, 0);
        });
        closeBtn.addEventListener("click", close);
        modal.addEventListener("keydown", function (e) {
            if (e.key === "Escape") { e.preventDefault(); close(); return; }
            if (e.key !== "Tab" || modal.hasAttribute("hidden")) return;
            var f = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
            if (!f.length) { e.preventDefault(); return; }
            var first = f[0], last = f[f.length - 1], act = document.activeElement;
            if (e.shiftKey && (act === first || act === content)) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
        });
    }

    function init() {
        var urlLang = null;
        try { urlLang = new URLSearchParams(window.location.search).get("lang"); } catch (e) { /* ignore */ }
        var saved = store(function (ls) { return ls.getItem(STORAGE_KEY); });
        var nav = (typeof navigator !== "undefined" && navigator.language) ? String(navigator.language).slice(0, 2).toLowerCase() : "";
        state.lang = resolveLang(urlLang, saved, nav);
        initNav();
        initModal();
        var sel = document.getElementById("languageSelect");
        if (sel) sel.addEventListener("change", function () { setLanguage(sel.value); });
        return Promise.all([loadPack("ko"), loadPack("en"), loadPack(state.lang)])
            .then(apply).catch(function () { /* keep keys */ }).then(resolveReady);
    }

    var api = {
        SUPPORTED: SUPPORTED, LANG_META: LANG_META, resolveLang: resolveLang, interp: interp,
        makeT: makeT, isHtmlKey: isHtmlKey, t: t, lang: lang, htmlLang: htmlLang, ready: ready, init: init
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else (typeof globalThis !== "undefined" ? globalThis : window).PortfolioShell = api;

    if (typeof document !== "undefined") init();
})();
