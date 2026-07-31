"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSignalAnalyserStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");

  [
    "app-shell", "plot-grid", "plot-card-time", "plot-card-spectrum",
    "plot-card-spectrogram", "plot-card-persistence", "active-plot-panel",
    "active-plot-title", "signal-table", "app-loading", "app-error",
  ].forEach((selector) => assert(html.includes(`data-testid=\"${selector}\"`), `missing selector ${selector}`));
  assert(app.includes("data-testid=\\\"signal-row-"), "signal rows must use stable safe-name selector");
  assert(app.includes("data-testid=\\\"active-plot-field-"), "panel fields must use stable id selector");

  assert(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css), "plot grid must have two fixed columns");
  assert(/grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css), "plot grid must have two fixed rows");
  const hiddenAttributeRule = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).some(([, selector, declarations]) =>
    selector.split(",").some((part) => part.trim() === "[hidden]")
      && /\bdisplay\s*:\s*none\s*!important\b/i.test(declarations)
  );
  assert(
    hiddenAttributeRule,
    "CSS must enforce display: none !important for [hidden] so loader and error visibility cannot be overridden"
  );
  assert(!html.includes("role=\"tab\""), "the four plots must not be represented as tabs");
  assert(!html.includes("data-layout") && !html.includes("layout-chooser"), "layout chooser must not be present");

  ["Анализатор сигналов", "Время", "Спектр", "Спектрограмма", "Спектр персистентности", "Сигналы", "Параметры отображения"].forEach((label) => {
    assert(html.includes(label), `missing Russian label ${label}`);
  });
  assert(/<link\b[^>]*\bhref=["']\.\/css\/app\.css["']/i.test(html), "product stylesheet must use the Genie-safe ./css/app.css path");
  assert(/<script\b[^>]*\bsrc=["']\.\/js\/api\.js["']/i.test(html), "API script must use the Genie-safe ./js/api.js path");
  assert(/<script\b[^>]*\bsrc=["']\.\/js\/app\.js["']/i.test(html), "application script must use the Genie-safe ./js/app.js path");
  assert(!/\b(?:href|src)\s*=\s*["']\/(?:css|js)\//i.test(html), "product CSS and JS assets must not use root-absolute /css or /js paths");

  assert(api.includes('request("./api/state")'), "state API must use exactly ./api/state");
  assert(api.includes('request("./api/view", {'), "view API must use exactly ./api/view");
  assert(!/["']\/api(?:\/|["'])/.test(api), "API client must not use root-absolute /api paths");
  assert(api.includes("method: \"POST\""), "view API must be POST");
  assert(api.includes("body: JSON.stringify(payload)"), "view payload must be serialized");
};
