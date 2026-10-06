"use strict";
// Static contract test for compare.css (Phase 15-03). No dependencies.
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const file = path.join(__dirname, "..", "compare.css");
assert(fs.existsSync(file), "compare.css must exist");
const buf = fs.readFileSync(file);
assert(!(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf), "compare.css must have no BOM");

const css = buf.toString("utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// Flatten rules (nested @media inner rules are treated as rules too).
const rules = [];
{
  const re = /([^{}@;][^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sels = m[1].trim();
    if (!sels) continue;
    rules.push({ sel: sels, body: m[2] });
  }
}
function blocksFor(cls) {
  return rules.filter((r) =>
    r.sel.split(",").some((s) => {
      const t = s.trim();
      return t === cls || t.startsWith(cls + ":") || t.startsWith(cls + "[") || t.endsWith(" " + cls);
    })
  );
}

assert(!/:root/.test(css), "no :root allowed");
for (const m of css.matchAll(/font-weight\s*:\s*([^;}\s]+)/g)) {
  assert(m[1] === "400" || m[1] === "600", "bad font-weight " + m[1]);
}
for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
  assert(m[1].trim() === "inherit", "font-family must be inherit, got " + m[1]);
}
for (const [v, c] of [["--cmp-s1", "#0072B2"], ["--cmp-s2", "#D55E00"], ["--cmp-s3", "#009E73"], ["--cmp-s4", "#CC79A7"]]) {
  assert(new RegExp(v + "\\s*:\\s*" + c, "i").test(css), v + " must be " + c);
}
assert(/--cmp-bar-h\s*:\s*64px/.test(css), "--cmp-bar-h: 64px");

function bodyOf(cls) {
  const b = rules.filter((r) => r.sel.split(",").some((s) => s.trim() === cls));
  assert(b.length, "missing rule for " + cls);
  return b.map((r) => r.body).join(";");
}
assert(/stroke-dasharray\s*:\s*8 4\b/.test(bodyOf(".cmp-line-2")), "line-2 dash");
assert(/stroke-dasharray\s*:\s*2 4\b/.test(bodyOf(".cmp-line-3")), "line-3 dash");
assert(/stroke-linecap\s*:\s*round/.test(bodyOf(".cmp-line-3")), "line-3 round cap");
assert(/stroke-dasharray\s*:\s*10 3 2 3/.test(bodyOf(".cmp-line-4")), "line-4 dash");

for (const c of [".cmp-pick", ".cmp-bar-clear", ".cmp-bar-go", ".cmp-chip", ".cmp-btn", ".cmp-input", ".cmp-select"]) {
  assert(/min-height\s*:\s*44px/.test(bodyOf(c)), c + " needs min-height: 44px");
}

for (const s of [
  "env(safe-area-inset-bottom, 0px)",
  "body.has-compare-bar",
  "accent-color: var(--primary)",
  ":focus-visible",
  "outline: 2px solid var(--primary)",
  "position: sticky",
  "overflow-x: auto",
  "@media (min-width: 640px)",
]) {
  assert(css.includes(s), "missing: " + s);
}
assert(/th\[scope="row"\]/.test(css), "th[scope=row]");

const contract = [
  ".cmp-name-cell", ".cmp-name-wrap", ".cmp-pick", ".cmp-pick.is-dim", ".cmp-check", ".cmp-pick-box", ".cmp-sr-only",
  "#compare-bar", ".cmp-bar", ".cmp-bar[hidden]", ".cmp-bar-inner", ".cmp-bar-status", ".cmp-bar-count", ".cmp-bar-helper",
  ".cmp-bar-notice", ".cmp-bar-actions", ".cmp-bar-clear", ".cmp-bar-go", '.cmp-bar-go[aria-disabled="true"]', "body.has-compare-bar",
  ".compare-page", ".cmp-intro", ".cmp-toolbar", ".cmp-toolbar[hidden]", ".cmp-btn", ".cmp-notice", ".cmp-state", ".cmp-empty", ".cmp-error",
  ".cmp-skeleton", ".cmp-card", ".cmp-section-title", ".cmp-table-wrap", ".cmp-table-wrap.is-scrollable::after", ".cmp-table",
  ".cmp-table caption", 'th[scope="row"]', 'th[scope="col"]', ".cmp-etf-code", ".cmp-value", 'td[data-best="true"] .cmp-value',
  ".cmp-best", ".cmp-scroll-hint",
  ".cmp-chip-group", ".cmp-chip", '.cmp-chip[aria-pressed="true"]', ".cmp-chart-figure", ".cmp-chart-svg", ".cmp-line",
  ".cmp-line-1", ".cmp-line-2", ".cmp-line-3", ".cmp-line-4", ".cmp-marker", ".cmp-marker-1", ".cmp-marker-2", ".cmp-marker-3",
  ".cmp-marker-4", ".cmp-legend", ".cmp-legend-item", ".cmp-swatch", ".cmp-legend-note", ".cmp-chart-alt", ".cmp-chart-table",
  ".cmp-calc-form", ".cmp-field", ".cmp-label", ".cmp-input", ".cmp-select", ".cmp-hint", ".cmp-field-error",
  '.cmp-input[aria-invalid="true"]', ".cmp-calc-result", ".cmp-calc-headline", ".cmp-calc-table",
  ".cmp-calc-meta", ".cmp-warning", ".cmp-disclaimer",
];
for (const s of contract) assert(css.includes(s), "class contract missing selector: " + s);

const allowed = new Set(["14px", "16px", "20px", "28px", "0.875rem", "1rem", "1.25rem", "1.75rem"]);
for (const m of css.matchAll(/font-size\s*:\s*([^;}\s]+)/g)) {
  assert(allowed.has(m[1]), "disallowed font-size " + m[1]);
}

assert(/\.cmp-toolbar\[hidden\]\s*\{\s*display:\s*none/.test(css), "WR-01 toolbar hidden");
console.log("compare_css_check OK");
