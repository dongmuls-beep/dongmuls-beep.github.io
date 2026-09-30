(function () {
    "use strict";

    var MAX_CODES = 4;
    var CODE_RE = /^[0-9A-Z]{6}$/;
    var MAX_PARAM_LEN = 200;
    var MAX_DROPPED = 10;
    var DROPPED_TOKEN_LEN = 12;
    var FEE_ROWS = ["fee", "other", "trade", "real"];
    var ROW_LABEL_KEYS = {
        fee: "table_fee",
        other: "table_other",
        trade: "table_trade",
        real: "table_real",
        aum: "table_aum"
    };

    // Cross-script visibility proof: script.js top-level const/let/function are
    // visible here because classic scripts share the global lexical scope.
    function hasScriptGlobals() {
        return (
            typeof FEE_CHART === "object" &&
            typeof dataKeys === "object" &&
            typeof currentTranslations === "object" &&
            typeof getTranslation === "function" &&
            typeof buildFeeLinePath === "function"
        );
    }

    function esc(raw) {
        if (typeof escapeHtml === "function") return escapeHtml(raw);
        return String(raw)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function strip(raw) {
        if (typeof stripHtmlTags === "function") return stripHtmlTags(raw);
        return String(raw == null ? "" : raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }

    function feeNum(value) {
        if (typeof toFeeNumber === "function") return toFeeNumber(value);
        if (value === null || value === undefined) return NaN;
        var text = String(value).replace(/,/g, "").replace("%", "").trim();
        if (text === "") return NaN;
        var n = Number(text);
        return isFinite(n) && n >= 0 ? n : NaN;
    }

    function t(key, vars) {
        var template = typeof getTranslation === "function" ? getTranslation(key) : key;
        if (typeof formatFeeTemplate === "function") return formatFeeTemplate(template, vars || {});
        return String(template);
    }

    function missingText() {
        return typeof missingValueText === "function" ? missingValueText() : "-";
    }

    function parseCompareCodes(rawParam, validCodes) {
        var result = { codes: [], dropped: [], capped: false };
        if (rawParam === null || rawParam === undefined || rawParam === "") return result;

        var tokens = String(rawParam).slice(0, MAX_PARAM_LEN).split(",");
        var kept = [];
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i].trim().toUpperCase();
            if (!token) continue;
            if (CODE_RE.test(token) && validCodes && validCodes.has(token)) {
                if (kept.indexOf(token) === -1) kept.push(token);
            } else {
                var shown = token.slice(0, DROPPED_TOKEN_LEN);
                if (result.dropped.length < MAX_DROPPED && result.dropped.indexOf(shown) === -1) {
                    result.dropped.push(shown);
                }
            }
        }
        result.capped = kept.length > MAX_CODES;
        result.codes = kept.slice(0, MAX_CODES);
        return result;
    }

    function findLowestIndexes(values) {
        var valid = [];
        for (var i = 0; i < values.length; i++) {
            var n = feeNum(values[i]);
            if (isFinite(n)) valid.push({ index: i, key: n.toFixed(4), n: n });
        }
        if (valid.length < 2) return [];
        var min = valid[0];
        for (var j = 1; j < valid.length; j++) {
            if (valid[j].n < min.n) min = valid[j];
        }
        var allEqual = valid.every(function (v) { return v.key === valid[0].key; });
        if (allEqual) return [];
        return valid.filter(function (v) { return v.key === min.key; }).map(function (v) { return v.index; });
    }

    function formatFee(value) {
        var valid = typeof isValidFee === "function" ? isValidFee(value) : isFinite(feeNum(value));
        if (!valid) return missingText();
        return typeof formatPercent === "function" ? formatPercent(value) : Number(feeNum(value)).toFixed(4) + "%";
    }

    function formatAum(value) {
        return typeof formatAUM === "function" ? formatAUM(value) : "-";
    }

    function buildMetricTableHtml(items) {
        var html = "";
        html += '<div class="cmp-table-wrap" role="region" tabindex="0" aria-label="' + esc(strip(t("compare_table_region"))) + '">';
        html += '<table class="cmp-table">';
        html += '<caption class="cmp-sr-only">' + esc(strip(t("compare_table_caption"))) + "</caption>";
        html += '<thead><tr><th scope="col"></th>';
        items.forEach(function (item) {
            html += '<th scope="col">' + esc(item.name) + '<span class="cmp-etf-code">' + esc(item.code) + "</span></th>";
        });
        html += "</tr></thead><tbody>";

        FEE_ROWS.forEach(function (field) {
            var best = findLowestIndexes(items.map(function (item) { return item[field]; }));
            html += '<tr><th scope="row">' + esc(strip(t(ROW_LABEL_KEYS[field]))) + "</th>";
            items.forEach(function (item, idx) {
                var isBest = best.indexOf(idx) !== -1;
                html += "<td" + (isBest ? ' data-best="true"' : "") + '><span class="cmp-value">' + esc(formatFee(item[field])) + "</span>";
                if (isBest) html += ' <span class="cmp-best">' + esc(strip(t("compare_best_badge"))) + "</span>";
                html += "</td>";
            });
            html += "</tr>";
        });

        html += '<tr><th scope="row">' + esc(strip(t(ROW_LABEL_KEYS.aum))) + "</th>";
        items.forEach(function (item) {
            html += '<td><span class="cmp-value">' + esc(formatAum(item.aum)) + "</span></td>";
        });
        html += "</tr></tbody></table></div>";
        return html;
    }

    // ---------- runtime ----------
    var state = {
        data: null,
        whitelist: null,
        rows: null,
        items: [],
        rendered: false,
        errored: false,
        i18nReady: false,
        listenersBound: false,
        resizeBound: false,
        subscribers: [],
        beforeCopy: [],
        resizeTimer: null,
        copyTimer: null
    };

    function el(id) {
        return document.getElementById(id);
    }

    function setHidden(id, hidden) {
        var node = el(id);
        if (!node) return;
        if (hidden) node.setAttribute("hidden", "");
        else node.removeAttribute("hidden");
    }

    function hideResults() {
        setHidden("cmp-table-section", true);
        setHidden("cmp-chart", true);
        setHidden("cmp-calc", true);
        setHidden("cmp-toolbar", true);
    }

    function announce(text) {
        var live = el("cmp-live");
        if (!live) return;
        live.textContent = "";
        setTimeout(function () {
            live.textContent = text;
        }, 0);
    }

    function currentCtx() {
        return {
            items: state.items,
            lang: typeof currentLanguage === "string" ? currentLanguage : "ko"
        };
    }

    function callSubscriber(fn) {
        try {
            fn(currentCtx());
        } catch (error) {
            console.error("CompareView subscriber failed:", error);
        }
    }

    function onRender(fn) {
        if (typeof fn !== "function") return;
        state.subscribers.push(fn);
        if (state.rendered) callSubscriber(fn);
    }

    function onBeforeCopy(fn) {
        if (typeof fn === "function") state.beforeCopy.push(fn);
    }

    function renderLoading() {
        var app = el("cmp-app");
        if (app) app.setAttribute("aria-busy", "true");
        var box = el("cmp-state");
        if (box) {
            box.innerHTML =
                '<div class="cmp-skeleton"></div><div class="cmp-skeleton"></div>' +
                '<span class="cmp-sr-only">' + esc(strip(t("fee_history_loading"))) + "</span>";
        }
    }

    function renderError() {
        var app = el("cmp-app");
        if (app) app.setAttribute("aria-busy", "false");
        hideResults();
        var box = el("cmp-state");
        if (box) {
            box.innerHTML =
                '<div class="cmp-error"><p>' + esc(strip(t("compare_load_error"))) + "</p>" +
                '<button type="button" class="cmp-btn" data-cmp-retry>' + esc(strip(t("compare_retry"))) + "</button></div>";
        }
        state.rendered = false;
        state.errored = true;
    }

    function loadData() {
        state.errored = false;
        state.rows = null;
        renderLoading();
        var url = typeof GAS_API_URL === "string" ? GAS_API_URL : "/data.json";
        var request;
        try {
            request = fetch(url, { cache: "no-store" });
        } catch (error) {
            renderError();
            return;
        }
        Promise.resolve(request)
            .then(function (response) {
                if (!response || !response.ok) throw new Error("HTTP error");
                return response.json();
            })
            .then(function (data) {
                if (!Array.isArray(data)) throw new Error("Bad data");
                if (data[0] && typeof resolveDataKeys === "function") resolveDataKeys(data[0]);
                var map = new Map();
                data.forEach(function (row) {
                    if (!row) return;
                    map.set(String(row[dataKeys.code]).toUpperCase(), row);
                });
                state.data = data;
                state.rows = map;
                state.whitelist = new Set(map.keys());
                renderAll();
            })
            .catch(function (error) {
                console.error("CompareView load failed:", error);
                renderError();
            });
    }

    function updateScrollable() {
        var wrap = document.querySelector(".cmp-table-wrap");
        if (!wrap) return;
        if (wrap.scrollWidth > wrap.clientWidth) wrap.classList.add("is-scrollable");
        else wrap.classList.remove("is-scrollable");
    }

    function renderNotices(parsed) {
        var box = el("cmp-notices");
        if (!box) return;
        var html = "";
        if (parsed.dropped.length) {
            html += '<p class="cmp-notice" role="status">' +
                esc(t("compare_dropped_notice", { codes: parsed.dropped.join(", ") })) + "</p>";
        }
        if (parsed.capped) {
            html += '<p class="cmp-notice" role="status">' + esc(strip(t("compare_cap_notice"))) + "</p>";
        }
        box.innerHTML = html;
    }

    function renderAll() {
        if (!state.rows || !state.i18nReady) return;
        var app = el("cmp-app");
        var search = typeof location !== "undefined" ? location.search : "";
        var parsed = parseCompareCodes(new URLSearchParams(search).get("compare"), state.whitelist);
        var keys = dataKeys;
        var items = parsed.codes.map(function (code) {
            var row = state.rows.get(code);
            return {
                code: code,
                name: String(row[keys.name] || code),
                fee: row[keys.fee],
                other: row[keys.other],
                trade: row[keys.trade],
                real: row[keys.real],
                aum: row[keys.aum]
            };
        });
        state.items = items;
        renderNotices(parsed);

        var box = el("cmp-state");
        if (items.length < 2) {
            hideResults();
            if (box) {
                box.innerHTML =
                    '<div class="cmp-empty"><h2 class="cmp-section-title">' + esc(strip(t("compare_empty_title"))) + "</h2>" +
                    "<p>" + esc(strip(t("compare_empty_body"))) + "</p>" +
                    '<a class="cmp-btn" href="/">' + esc(strip(t("compare_back_to_list"))) + "</a></div>";
            }
            if (app) app.setAttribute("aria-busy", "false");
            state.rendered = false;
            return;
        }

        if (box) box.innerHTML = "";
        setHidden("cmp-table-section", false);
        setHidden("cmp-toolbar", false);
        var heading = el("cmp-table-h");
        if (heading) heading.textContent = strip(t("compare_table_title"));
        var body = el("cmp-table-body");
        if (body) {
            var html = buildMetricTableHtml(items);
            if (items.length > 2) html += '<p class="cmp-scroll-hint">' + esc(strip(t("compare_scroll_hint"))) + "</p>";
            body.innerHTML = html;
        }
        updateScrollable();
        if (!state.resizeBound && typeof window !== "undefined" && window.addEventListener) {
            state.resizeBound = true;
            window.addEventListener("resize", function () {
                if (state.resizeTimer) clearTimeout(state.resizeTimer);
                state.resizeTimer = setTimeout(updateScrollable, 150);
            });
        }
        if (app) app.setAttribute("aria-busy", "false");
        state.rendered = true;
        state.subscribers.slice().forEach(callSubscriber);
    }

    function copyCurrentUrl(button) {
        state.beforeCopy.forEach(function (fn) {
            try {
                fn();
            } catch (error) {
                console.error("CompareView beforeCopy failed:", error);
            }
        });
        var url = typeof buildShareUrl === "function" ? buildShareUrl() : location.href;
        if (state.copyTimer) clearTimeout(state.copyTimer);
        var attempt;
        try {
            attempt = Promise.resolve(copyText(url));
        } catch (error) {
            attempt = Promise.reject(error);
        }
        return attempt.then(
            function () {
                var msg = t("compare_copy_done");
                if (button) button.textContent = msg;
                announce(msg);
                state.copyTimer = setTimeout(function () {
                    if (button) button.textContent = t("compare_copy_link");
                }, 2000);
            },
            function () {
                var msg = t("compare_copy_fail");
                if (button) button.textContent = msg;
                announce(msg);
                state.copyTimer = setTimeout(function () {
                    if (button) button.textContent = t("compare_copy_link");
                }, 4000);
            }
        );
    }

    function bindOnce() {
        if (state.listenersBound) return;
        state.listenersBound = true;
        var copy = el("cmp-copy");
        if (copy) {
            copy.addEventListener("click", function (event) {
                copyCurrentUrl(event.currentTarget || copy);
            });
        }
        var app = el("cmp-app");
        if (app) {
            app.addEventListener("click", function (event) {
                var target = event.target;
                if (target && typeof target.closest === "function" && target.closest("[data-cmp-retry]")) {
                    loadData();
                }
            });
        }
    }

    function markI18nReady() {
        state.i18nReady = true;
        renderAll();
    }

    function init() {
        if (typeof document === "undefined" || !document.body || !document.body.dataset) return;
        if (document.body.dataset.page !== "compare" || !el("cmp-app")) return;
        bindOnce();

        var hasTranslations =
            typeof currentTranslations === "object" && currentTranslations && Object.keys(currentTranslations).length > 0;
        if (hasTranslations) {
            state.i18nReady = true;
        } else {
            setTimeout(markI18nReady, 3000);
        }
        var title = el("cmp-title");
        if (title && typeof MutationObserver === "function") {
            new MutationObserver(function () {
                markI18nReady();
            }).observe(title, { childList: true, subtree: true, characterData: true });
        }
        loadData();
    }

    if (typeof document !== "undefined" && document.addEventListener) {
        if (document.readyState && document.readyState !== "loading") init();
        else document.addEventListener("DOMContentLoaded", init);
    }

    var CompareView = {
        MAX_CODES: MAX_CODES,
        CODE_RE: CODE_RE,
        parseCompareCodes: parseCompareCodes,
        findLowestIndexes: findLowestIndexes,
        buildMetricTableHtml: buildMetricTableHtml,
        onRender: onRender,
        onBeforeCopy: onBeforeCopy,
        copyCurrentUrl: copyCurrentUrl,
        announce: announce,
        t: t,
        hasScriptGlobals: hasScriptGlobals
    };

    (typeof globalThis !== "undefined" ? globalThis : window).CompareView = CompareView;
})();
