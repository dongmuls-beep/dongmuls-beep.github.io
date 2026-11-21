(function (root) {
    "use strict";

    var SVG_NS = "http://www.w3.org/2000/svg";
    var PAD = { top: 24, right: 8, bottom: 28, left: 8 };
    var MAX_POINTS = 400;
    var STEPS = [1, 2, 2.5, 5, 10];

    function r1(n) { return Math.round(n * 10) / 10; }

    // Ascending nice tick values; first <= min, last >= max.
    function niceTicks(min, max, count) {
        count = count || 4;
        var range = max - min;
        if (!(range > 0)) { range = Math.abs(max) || 1; }
        var raw = range / count;
        var mag = Math.pow(10, Math.floor(Math.log10(raw)));
        var step = mag;
        for (var i = 0; i < STEPS.length; i++) {
            step = STEPS[i] * mag;
            if (step >= raw) break;
        }
        var first = Math.floor(min / step);
        var last = Math.ceil(max / step);
        if (last === first) last = first + 1;
        var out = [];
        for (var k = first; k <= last; k++) out.push(Math.round(k * step * 1e9) / 1e9);
        return out;
    }

    function sampleIndexes(n, max) {
        max = max || MAX_POINTS;
        var out = [];
        var i;
        if (n <= 0) return out;
        if (n <= max) {
            for (i = 0; i < n; i++) out.push(i);
            return out;
        }
        var last = -1;
        for (i = 0; i < max; i++) {
            var idx = Math.round(i * (n - 1) / (max - 1));
            if (idx !== last) out.push(idx);
            last = idx;
        }
        return out;
    }

    function buildModel(dates, values, width, height) {
        var n = Math.min(dates.length, values.length);
        var plot = { left: PAD.left, top: PAD.top, right: width - PAD.right, bottom: height - PAD.bottom };
        var min = 0;
        var max = 0;
        if (n > 0) {
            min = Infinity;
            max = -Infinity;
            for (var j = 0; j < n; j++) {
                if (values[j] < min) min = values[j];
                if (values[j] > max) max = values[j];
            }
        }
        var lo = min > 0.4 * max ? min : 0;
        var hi = max;
        if (!(hi > lo)) hi = lo + (max > 0 ? max : 1);
        var ticksRaw = niceTicks(lo, hi, 4);
        var yMin = ticksRaw[0];
        var yMax = ticksRaw[ticksRaw.length - 1];
        function yOf(v) { return plot.bottom - (v - yMin) / (yMax - yMin) * (plot.bottom - plot.top); }

        var idxs = sampleIndexes(n, MAX_POINTS);
        var span = plot.right - plot.left;
        var points = idxs.map(function (i) {
            return {
                i: i,
                x: n === 1 ? (plot.left + plot.right) / 2 : plot.left + i / (n - 1) * span,
                y: yOf(values[i]),
                date: dates[i],
                value: values[i]
            };
        });
        var linePath = points.map(function (p, k) {
            return (k ? "L " : "M ") + r1(p.x) + " " + r1(p.y);
        }).join(" ");
        var areaPath = points.length
            ? linePath + " L " + r1(points[points.length - 1].x) + " " + r1(plot.bottom) +
              " L " + r1(points[0].x) + " " + r1(plot.bottom) + " Z"
            : "";
        return {
            empty: n === 0,
            width: width,
            height: height,
            plot: plot,
            yMin: yMin,
            yMax: yMax,
            ticks: ticksRaw.map(function (v) { return { value: v, y: yOf(v) }; }),
            points: points,
            linePath: linePath,
            areaPath: areaPath
        };
    }

    function nearestIndex(points, x) {
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < points.length; i++) {
            var d = Math.abs(points[i].x - x);
            if (d < bestD) { bestD = d; best = i; }
        }
        return best;
    }

    function moveCursor(idx, key, count) {
        var next = idx;
        if (key === "ArrowLeft") next = idx - 1;
        else if (key === "ArrowRight") next = idx + 1;
        else if (key === "Home") next = 0;
        else if (key === "End") next = count - 1;
        else if (key === "PageUp") next = idx - 20;
        else if (key === "PageDown") next = idx + 20;
        else return idx;
        return Math.max(0, Math.min(count - 1, next));
    }

    function make(name, attrs) {
        var node = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, String(attrs[k])); });
        return node;
    }

    function html(name, cls) {
        var node = document.createElement(name);
        node.setAttribute("class", cls);
        return node;
    }

    function render(container, opts) {
        var width = Math.max(256, Math.round(opts.width || 0));
        var height = width < 640 ? 240 : 320;
        var model = buildModel(opts.dates || [], opts.values || [], width, height);
        var pts = model.points;
        var plot = model.plot;

        while (container.firstChild) container.removeChild(container.firstChild);

        var group = html("div", "pf-chart-focus");
        group.setAttribute("tabindex", "0");
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", opts.keysLabel || "");

        var svg = make("svg", {
            class: "cmp-chart-svg",
            viewBox: "0 0 " + width + " " + height,
            preserveAspectRatio: "xMidYMid meet",
            role: "img",
            dir: "ltr",
            "aria-label": opts.ariaLabel || "",
            "aria-describedby": "pf-chart-table"
        });

        model.ticks.forEach(function (t) {
            var y = r1(t.y);
            svg.appendChild(make("line", { class: "pf-grid", x1: plot.left, x2: plot.right, y1: y, y2: y }));
            var label = make("text", { class: "pf-axis", x: plot.left, y: r1(y - 4), "text-anchor": "start" });
            label.textContent = opts.formatTick(t.value);
            svg.appendChild(label);
        });

        if (pts.length) {
            [[pts[0].date, plot.left, "start"], [pts[pts.length - 1].date, plot.right, "end"]].forEach(function (d) {
                var label = make("text", { class: "pf-axis", x: d[1], y: height - 8, "text-anchor": d[2] });
                label.textContent = d[0];
                svg.appendChild(label);
            });
            svg.appendChild(make("path", { class: "pf-area", d: model.areaPath }));
            svg.appendChild(make("path", { class: "pf-line", d: model.linePath, fill: "none" }));
        }

        var cursorLine = make("line", { class: "pf-cursor-line", y1: plot.top, y2: plot.bottom });
        var cursorDot = make("circle", { class: "pf-cursor-dot", r: 4 });
        svg.appendChild(cursorLine);
        svg.appendChild(cursorDot);
        group.appendChild(svg);

        var readout = html("p", "pf-readout");
        var cur = pts.length - 1;

        function update() {
            if (cur < 0) {
                readout.textContent = "";
                return;
            }
            var p = pts[cur];
            cursorLine.setAttribute("x1", r1(p.x));
            cursorLine.setAttribute("x2", r1(p.x));
            cursorDot.setAttribute("cx", r1(p.x));
            cursorDot.setAttribute("cy", r1(p.y));
            readout.textContent = opts.formatReadout(p.date, p.value);
        }
        update();

        group.addEventListener("keydown", function (e) {
            if (cur < 0) return;
            var next = moveCursor(cur, e.key, pts.length);
            var handled = ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].indexOf(e.key) !== -1;
            if (!handled) return;
            e.preventDefault();
            cur = next;
            update();
            // keyboard moves are announced through the page's single live region (no aria-live here)
            if (opts.onCursor) opts.onCursor(readout.textContent);
        });
        group.addEventListener("pointermove", function (e) {
            if (cur < 0) return;
            var rect = svg.getBoundingClientRect();
            if (!rect.width) return;
            cur = nearestIndex(pts, (e.clientX - rect.left) * width / rect.width);
            update();
        });
        group.addEventListener("pointerleave", function () {
            cur = pts.length - 1;
            update();
        });

        container.appendChild(group);
        container.appendChild(readout);
    }

    var api = {
        niceTicks: niceTicks,
        sampleIndexes: sampleIndexes,
        buildModel: buildModel,
        nearestIndex: nearestIndex,
        moveCursor: moveCursor,
        render: render
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.PortfolioChart = api;
})(typeof window !== "undefined" ? window : this);
