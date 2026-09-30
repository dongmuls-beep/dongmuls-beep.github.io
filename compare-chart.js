(function () {
    "use strict";

    var FIELDS = ["real", "fee", "other", "trade"];
    var MARKERS = ["circle", "square", "triangle", "diamond"];
    var DEFAULT_WIDTH = 320;
    var SVG_NS = "http://www.w3.org/2000/svg";

    function esc(raw) {
        return escapeHtml(String(raw === null || raw === undefined ? "" : raw));
    }

    function t(key, vars) {
        if (typeof CompareView === "object" && CompareView && typeof CompareView.t === "function") {
            return CompareView.t(key, vars);
        }
        return formatFeeTemplate(getTranslation(key), vars || {});
    }

    function plainT(key, vars) {
        // Strip markup from the template only; interpolated values stay visible and are escaped later.
        var template = getTranslation(key);
        if (typeof stripHtmlTags === "function") template = stripHtmlTags(template);
        return formatFeeTemplate(template, vars || {});
    }

    function buildOverlayModel(items, history, field, today) {
        var historyKey = FEE_HISTORY_FIELDS[field].historyKey;
        var list = items || [];
        var series = list.map(function (item, i) {
            var current = toFeeNumber(item[field]);
            var s = {
                index: i + 1,
                code: item.code,
                name: item.name,
                excluded: !isFinite(current),
                hasHistory: false,
                points: [],
                current: isFinite(current) ? current : null,
                firstDate: null,
                firstValue: null,
                changes: 0
            };
            if (s.excluded) return s;
            var raw = history && history.series && history.series[item.code]
                ? history.series[item.code][historyKey]
                : null;
            s.points = buildFeeHistoryPoints(raw, current, today);
            return s;
        });

        var start = null;
        var end = today;
        series.forEach(function (s) {
            if (s.excluded || !s.points.length) return;
            var first = s.points[0].date;
            var last = s.points[s.points.length - 1].date;
            if (start === null || first < start) start = first;
            if (last > end) end = last;
        });
        if (start === null) start = today;

        var values = [];
        series.forEach(function (s) {
            if (s.excluded) return;
            if (!s.points.length) {
                s.points = [{ date: start, value: s.current }];
                s.hasHistory = false;
            } else {
                s.hasHistory = true;
                s.firstDate = s.points[0].date;
                s.firstValue = s.points[0].value;
                s.changes = s.points.length - 1;
                s.current = s.points[s.points.length - 1].value;
            }
            s.points.forEach(function (p) { values.push(p.value); });
        });

        return {
            field: field,
            start: start,
            end: end,
            scale: computeFeeChartScale(values),
            series: series
        };
    }

    function make(name, attrs) {
        var node = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (key) {
            node.setAttribute(key, String(attrs[key]));
        });
        return node;
    }

    function markerShape(index, x, y, make2) {
        var kind = MARKERS[(index - 1) % MARKERS.length];
        var cls = "cmp-marker cmp-marker-" + index;
        var r = feeChartRound;
        if (kind === "circle") return make2("circle", { class: cls, cx: r(x), cy: r(y), r: 5 });
        if (kind === "square") return make2("rect", { class: cls, x: r(x - 5), y: r(y - 5), width: 10, height: 10 });
        if (kind === "triangle") {
            return make2("polygon", {
                class: cls,
                points: r(x) + "," + r(y - 6) + " " + r(x + 6) + "," + r(y + 5) + " " + r(x - 6) + "," + r(y + 5)
            });
        }
        return make2("polygon", {
            class: cls,
            points: r(x) + "," + r(y - 6) + " " + r(x + 6) + "," + r(y) + " " + r(x) + "," + r(y + 6) + " " + r(x - 6) + "," + r(y)
        });
    }

    function renderOverlaySvg(model, metricLabel, containerWidth) {
        var width = Math.max(260, Math.round(containerWidth || DEFAULT_WIDTH));
        FEE_CHART.width = width;
        FEE_CHART.right = width - FEE_CHART_PAD;

        var included = model.series.filter(function (s) { return !s.excluded; });
        var svg = make("svg", {
            class: "cmp-chart-svg",
            viewBox: "0 0 " + width + " " + FEE_CHART.height,
            preserveAspectRatio: "xMidYMid meet",
            role: "img",
            dir: "ltr",
            "aria-label": plainT("compare_chart_aria", {
                metric: metricLabel,
                start: model.start,
                end: model.end,
                count: included.length
            }),
            "aria-describedby": "cmp-chart-alt-table"
        });

        model.scale.ticks.forEach(function (tick) {
            var y = feeChartRound(feeChartY(tick, model.scale));
            svg.appendChild(make("line", {
                class: "fee-chart-grid",
                x1: FEE_CHART.left,
                x2: FEE_CHART.right,
                y1: y,
                y2: y
            }));
            var label = make("text", {
                class: "fee-chart-label",
                x: FEE_CHART.left,
                y: feeChartRound(y - 5),
                "text-anchor": "start"
            });
            label.textContent = formatFeeAxisValue(tick);
            svg.appendChild(label);
        });

        var xs = make("text", {
            class: "fee-chart-label",
            x: FEE_CHART.left,
            y: FEE_CHART.height - 6,
            "text-anchor": "start"
        });
        xs.textContent = formatFeeAxisDate(model.start);
        svg.appendChild(xs);
        var xe = make("text", {
            class: "fee-chart-label",
            x: FEE_CHART.right,
            y: FEE_CHART.height - 6,
            "text-anchor": "end"
        });
        xe.textContent = formatFeeAxisDate(model.end);
        svg.appendChild(xe);

        included.forEach(function (s) {
            svg.appendChild(make("path", {
                class: "cmp-line cmp-line-" + s.index,
                d: buildFeeLinePath(s.points, model.scale, model.end, model.start),
                fill: "none"
            }));
        });
        included.forEach(function (s) {
            var y = feeChartY(s.current, model.scale);
            svg.appendChild(markerShape(s.index, FEE_CHART.right, y, make));
        });
        return svg;
    }

    function swatchHtml(index) {
        var kind = MARKERS[(index - 1) % MARKERS.length];
        var cls = "cmp-marker cmp-marker-" + index;
        var marker;
        if (kind === "circle") marker = '<circle class="' + cls + '" cx="26" cy="4" r="3"/>';
        else if (kind === "square") marker = '<rect class="' + cls + '" x="23" y="1" width="6" height="6"/>';
        else if (kind === "triangle") marker = '<polygon class="' + cls + '" points="26,0 30,7 22,7"/>';
        else marker = '<polygon class="' + cls + '" points="26,0 30,4 26,8 22,4"/>';
        return '<svg class="cmp-swatch" width="32" height="8" viewBox="0 0 32 8" aria-hidden="true">' +
            '<line class="cmp-line cmp-line-' + index + '" x1="0" y1="4" x2="22" y2="4"/>' + marker + "</svg>";
    }

    function buildLegendHtml(model) {
        var html = '<div><p class="cmp-label">' + esc(plainT("compare_chart_legend")) + '</p><ul class="cmp-legend">';
        model.series.forEach(function (s) {
            html += '<li class="cmp-legend-item">';
            if (s.excluded) {
                html += '<span class="cmp-legend-note">' + esc(plainT("compare_chart_excluded", { name: s.name })) + "</span>";
            } else {
                html += swatchHtml(s.index);
                html += "<span>" + esc(plainT("compare_chart_legend_item", {
                    name: s.name,
                    code: s.code,
                    value: formatPercent(s.current)
                }));
                if (!s.hasHistory) html += " " + esc(plainT("compare_chart_no_history"));
                html += "</span>";
            }
            html += "</li>";
        });
        return html + "</ul></div>";
    }

    function buildAltTableHtml(model) {
        var open = typeof window !== "undefined" && typeof window.matchMedia === "function" &&
            window.matchMedia("(min-width: 640px)").matches;
        var html = '<details class="cmp-chart-alt"' + (open ? " open" : "") + "><summary>" +
            esc(plainT("compare_chart_table_title")) + '</summary><table id="cmp-chart-alt-table" class="cmp-chart-table"><thead><tr>';
        ["compare_chart_tbl_etf", "compare_chart_tbl_start", "compare_chart_tbl_first", "compare_chart_tbl_now", "compare_chart_tbl_changes"]
            .forEach(function (key) {
                html += '<th scope="col">' + esc(plainT(key)) + "</th>";
            });
        html += "</tr></thead><tbody>";
        model.series.forEach(function (s) {
            if (s.excluded) return;
            html += '<tr><th scope="row">' + esc(s.name) + "</th><td>" +
                esc(s.firstDate || missingValueText()) + "</td><td>" +
                esc(s.firstValue === null ? missingValueText() : formatPercent(s.firstValue)) + "</td><td>" +
                esc(formatPercent(s.current)) + "</td><td>" + esc(s.changes) + "</td></tr>";
        });
        return html + "</tbody></table></details>";
    }

    // ---------- DOM wiring ----------
    var state = {
        field: "real",
        ctx: null,
        history: null,
        loading: false,
        shell: null
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function fieldLabel(field) {
        return getFeeFieldLabel(field);
    }

    function ensureShell() {
        if (state.shell) return state.shell;
        var body = byId("cmp-chart-body");
        if (!body) return null;

        var label = document.createElement("p");
        label.id = "cmp-chart-metric-label";
        label.className = "cmp-label";
        body.appendChild(label);

        var group = document.createElement("div");
        group.className = "cmp-chip-group";
        group.setAttribute("role", "group");
        group.setAttribute("aria-labelledby", "cmp-chart-metric-label");
        var chips = {};
        FIELDS.forEach(function (field) {
            var chip = document.createElement("button");
            chip.setAttribute("type", "button");
            chip.className = "cmp-chip";
            chip.setAttribute("data-field", field);
            chip.dataset.field = field;
            group.appendChild(chip);
            chips[field] = chip;
        });
        body.appendChild(group);

        var status = document.createElement("div");
        status.id = "cmp-chart-status";
        body.appendChild(status);
        var figure = document.createElement("figure");
        figure.id = "cmp-chart-figure";
        figure.className = "cmp-chart-figure";
        body.appendChild(figure);
        var legend = document.createElement("div");
        legend.id = "cmp-chart-legend";
        body.appendChild(legend);
        var alt = document.createElement("div");
        alt.id = "cmp-chart-alt";
        body.appendChild(alt);

        group.addEventListener("click", function (event) {
            var target = event.target;
            var chip = target && typeof target.closest === "function" ? target.closest("[data-field]") : null;
            if (!chip) return;
            var field = chip.getAttribute("data-field");
            if (FIELDS.indexOf(field) === -1) return;
            if (field !== state.field) {
                state.field = field;
                refreshChips();
            }
            draw();
            if (typeof CompareView === "object" && CompareView) {
                CompareView.announce(plainT("compare_chart_switched", { metric: fieldLabel(state.field) }));
            }
        });
        body.addEventListener("click", function (event) {
            var target = event.target;
            if (target && typeof target.closest === "function" && target.closest("[data-cmp-chart-retry]")) {
                loadHistory();
            }
        });

        state.shell = { body: body, label: label, chips: chips, status: status, figure: figure, legend: legend, alt: alt };
        return state.shell;
    }

    function refreshChips() {
        var shell = state.shell;
        if (!shell) return;
        shell.label.textContent = plainT("compare_chart_metric_label");
        FIELDS.forEach(function (field) {
            var chip = shell.chips[field];
            chip.textContent = fieldLabel(field);
            chip.setAttribute("aria-pressed", field === state.field ? "true" : "false");
        });
    }

    function showError() {
        var shell = state.shell;
        if (!shell) return;
        shell.figure.textContent = "";
        shell.legend.innerHTML = "";
        shell.alt.innerHTML = "";
        shell.status.innerHTML = '<div class="cmp-error"><p>' + esc(plainT("compare_chart_error")) + "</p>" +
            '<button type="button" class="cmp-btn" data-cmp-chart-retry>' + esc(plainT("compare_retry")) + "</button></div>";
    }

    function draw() {
        var shell = state.shell;
        if (!shell || !state.ctx || !state.history) return;
        var model = buildOverlayModel(state.ctx.items, state.history, state.field, getKstToday());
        var width = shell.figure.clientWidth || shell.body.clientWidth;
        var svg = renderOverlaySvg(model, fieldLabel(state.field), width);
        shell.figure.textContent = "";
        shell.figure.appendChild(svg);
        shell.legend.innerHTML = buildLegendHtml(model);
        shell.alt.innerHTML = buildAltTableHtml(model);
        shell.status.innerHTML = "";
    }

    function loadHistory() {
        var shell = state.shell;
        if (!shell) return;
        shell.status.textContent = plainT("fee_history_loading");
        var request;
        try {
            request = Promise.resolve(loadFeeHistory());
        } catch (error) {
            request = Promise.reject(error);
        }
        request.then(function (history) {
            state.history = history || { series: {} };
            draw();
        }, function () {
            showError();
        });
    }

    function onCtx(ctx) {
        state.ctx = ctx;
        var section = byId("cmp-chart");
        if (section) section.removeAttribute("hidden");
        var shell = ensureShell();
        if (!shell) return;
        refreshChips();
        if (state.history) draw();
        else loadHistory();
    }

    if (typeof CompareView === "object" && CompareView && typeof CompareView.onRender === "function") {
        CompareView.onRender(onCtx);
    }

    var CompareChart = {
        FIELDS: FIELDS,
        buildOverlayModel: buildOverlayModel,
        renderOverlaySvg: renderOverlaySvg,
        buildLegendHtml: buildLegendHtml,
        buildAltTableHtml: buildAltTableHtml
    };

    (typeof globalThis !== "undefined" ? globalThis : window).CompareChart = CompareChart;
})();
