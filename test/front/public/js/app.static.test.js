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
  assert(!html.includes("role=\"tab\""), "the four plots must not be represented as tabs");
  assert(!html.includes("data-layout") && !html.includes("layout-chooser"), "layout chooser must not be present");

  ["Анализатор сигналов", "Время", "Спектр", "Спектрограмма", "Спектр персистентности", "Сигналы", "Параметры отображения"].forEach((label) => {
    assert(html.includes(label), `missing Russian label ${label}`);
  });
  assert(api.includes('request("/api/state")'), "state API must use exactly /api/state");
  assert(api.includes('request("/api/view", {'), "view API must use exactly /api/view");
  assert(api.includes("method: \"POST\""), "view API must be POST");
  assert(api.includes("body: JSON.stringify(payload)"), "view payload must be serialized");
};
