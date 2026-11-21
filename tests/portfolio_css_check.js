"use strict";
// Static contract test for portfolio.css (Phase 24-03). No dependencies.
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const file = path.join(__dirname, "..", "portfolio.css");
assert(fs.existsSync(file), "portfolio.css must exist");
const buf = fs.readFileSync(file);
assert(!(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf), "portfolio.css must have no BOM");

const css = buf.toString("utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const rules = [];
{
  const re = /([^{}@;][^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    if (sel) rules.push({ sel, body: m[2] });
  }
}
function bodyOf(cls) {
  const b = rules.filter((r) => r.sel.split(",").some((s) => s.trim() === cls));
  assert(b.length, "missing rule for " + cls);
  return b.map((r) => r.body).join(";");
}

assert(!/:root/.test(css), "no :root allowed");
for (const m of css.matchAll(/font-weight\s*:\s*([^;}\s]+)/g)) {
  assert(m[1] === "400" || m[1] === "600", "bad font-weight " + m[1]);
}
for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
  assert(m[1].trim() === "inherit", "font-family must be inherit, got " + m[1]);
}
const allowed = new Set(["14px", "16px", "20px", "28px"]);
for (const m of css.matchAll(/font-size\s*:\s*([^;}\s]+)/g)) {
  assert(allowed.has(m[1]), "disallowed font-size " + m[1]);
}
for (const bad of ["transition", "animation", "prefers-color-scheme"]) {
  assert(!css.includes(bad), "must not contain " + bad);
}
assert(css.includes("forced-colors"), "needs forced-colors rules");

const selectors = rules.flatMap((r) => r.sel.split(",").map((s) => s.trim()));
for (const s of [".pf-btn-primary:focus-visible", ".pf-btn-danger:focus-visible", ".pf-option:focus-visible"]) {
  assert(selectors.includes(s), "missing selector " + s);
}

// --pf-up / --pf-down only under .portfolio-page
for (const v of ["--pf-up", "--pf-down"]) {
  const owners = rules.filter((r) => new RegExp(v + "\\s*:").test(r.body));
  assert(owners.length === 1 && owners[0].sel === ".portfolio-page", v + " must be defined only on .portfolio-page");
}

assert(/min-height\s*:\s*44px/.test(bodyOf(".pf-option")), ".pf-option needs min-height: 44px");
console.log("portfolio_css_check OK");
