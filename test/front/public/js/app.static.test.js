"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSignalAnalyserStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const plotlyVendorUrl = "./js/vendor/plotly-cartesian-3.1.0.min.js";
  const plotlyVendorPath = path.join(root, "public/js/vendor/plotly-cartesian-3.1.0.min.js");
  const plotlyVendorDirectory = path.dirname(plotlyVendorPath);
  const scriptSources = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), ([, source]) => source);

  [
    "app-shell", "plot-grid", "plot-card-time", "plot-card-spectrum",
    "plot-card-spectrogram", "plot-card-persistence", "active-plot-panel",
    "active-plot-title", "signal-table", "app-loading", "app-error",
  ].forEach((selector) => assert(html.includes(`data-testid=\"${selector}\"`), `missing selector ${selector}`));
  assert(app.includes("data-testid=\\\"signal-row-"), "signal rows must use stable safe-name selector");
  assert(app.includes("data-testid=\\\"signal-visibility-checkbox-"), "signal visibility checkboxes must use stable safe-name selector");
  assert(app.includes("data-testid=\\\"signal-visibility-state-"), "signal visibility labels must use stable safe-name selector");
  assert(app.includes("data-testid=\\\"active-plot-field-"), "panel fields must use stable id selector");

  assert(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css), "plot grid must have two fixed columns");
  assert(/grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css), "plot grid must have two fixed rows");
  assert(/\.signal-analyser\s*\{[^}]*min-width:\s*1280px;[^}]*min-height:\s*860px;/s.test(css), "application canvas must keep fixed minimum geometry");
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
  assert(!/grid-template-(?:columns|rows)[^{}]*(?:auto-fit|auto-fill)/.test(css), "plot grid must not switch to responsive layouts");

  [
    "Анализатор сигналов", "Время", "Спектр", "Спектрограмма", "Спектр персистентности",
    "Сигналы", "Параметры отображения", "Видимость", "Загрузка данных", "Повторить",
  ].forEach((label) => {
    assert(html.includes(label), `missing Russian label ${label}`);
  });
  [
    "Загрузка данных анализатора", "Синхронизация выбора", "Не удалось синхронизировать состояние анализатора",
    "Нельзя скрыть последний видимый сигнал", "Нет данных для отображения", "Не удалось отобразить график",
  ].forEach((label) => {
    assert(app.includes(label), `missing Russian runtime text ${label}`);
  });
  assert(/<link\b[^>]*\bhref=["']\.\/css\/app\.css["']/i.test(html), "product stylesheet must use the Genie-safe ./css/app.css path");
  assert(/<script\b[^>]*\bsrc=["']\.\/js\/api\.js["']/i.test(html), "API script must use the Genie-safe ./js/api.js path");
  assert(/<script\b[^>]*\bsrc=["']\.\/js\/app\.js["']/i.test(html), "application script must use the Genie-safe ./js/app.js path");
  assert(!/\b(?:href|src)\s*=\s*["']\/(?:css|js)\//i.test(html), "product CSS and JS assets must not use root-absolute /css or /js paths");

  assert(scriptSources.includes(plotlyVendorUrl), "Plotly Cartesian must be delivered from the pinned local vendor URL");
  assert(scriptSources.indexOf(plotlyVendorUrl) < scriptSources.indexOf("./js/app.js"), "local Plotly vendor must load before app.js");
  assert(!scriptSources.some((source) => /https:\/\/cdn\.plot\.ly\//.test(source)), "index.html must not bypass local-first Plotly delivery with a CDN script");
  assert(fs.existsSync(plotlyVendorPath) && fs.statSync(plotlyVendorPath).size > 0, "pinned local Plotly vendor asset must be present and nonempty");
  const licenseFiles = fs.existsSync(plotlyVendorDirectory)
    ? fs.readdirSync(plotlyVendorDirectory).filter((name) => /license/i.test(name))
    : [];
  assert(
    licenseFiles.some((name) => fs.statSync(path.join(plotlyVendorDirectory, name)).size > 0 && /MIT License/i.test(fs.readFileSync(path.join(plotlyVendorDirectory, name), "utf8"))),
    "local Plotly vendor directory must contain a nonempty MIT LICENSE"
  );
  assert(app.includes("moduleName"), "app loader must support the local bundle moduleName export");
  assert(/https:\/\/cdn\.plot\.ly\//.test(app), "app loader must retain a CDN fallback for Plotly delivery");

  assert(api.includes('request("./api/state")'), "state API must use exactly ./api/state");
  assert(api.includes('request("./api/view", {'), "view API must use exactly ./api/view");
  assert(!/["']\/api(?:\/|["'])/.test(api), "API client must not use root-absolute /api paths");
  assert(api.includes("method: \"POST\""), "view API must be POST");
  assert(api.includes("body: JSON.stringify(payload)"), "view payload must be serialized");

  assert(app.includes("visible_signals"), "frontend must read and send visible_signals");
  assert(app.includes("plot_payload"), "frontend must consume backend plot_payload for multi-signal traces");
  assert(app.includes("time_traces") && app.includes("spectrum_traces"), "frontend must render separate line traces for all visible time/spectrum signals");
  assert(/showlegend\s*:\s*true/.test(app), "line plots must enable Plotly legends");
  assert(/showlegend\s*:\s*false/.test(app), "heatmaps must disable Plotly legends");
  assert(/orderedExistingNames\([^)]*state\.signals/.test(app), "visibility mutations must be canonicalized by signal order");
  assert(/state_revision\s*:\s*state\s*&&\s*state\.state_revision/.test(app), "view mutations must include expected state revision");
  assert(/payload\.visible_signals\s*=/.test(app), "view mutations must send the full visible_signals array");
  assert(/mutationInFlight/.test(app) && /intendedView/.test(app) && /drainMutationQueue/.test(app), "view mutations must be serialized through a revision-safe queue");
  assert(/event\.target\.closest\("\[data-signal-visibility\], \[data-signal-visibility-control\]"\)\)\s*\{\s*event\.stopPropagation\(\);/.test(app), "checkbox clicks must stop propagation before row selection");
  assert(!/Plotly\.purge\(host\)[\s\S]{0,240}Plotly\.react/.test(app), "rendering must not purge existing Plotly graphs before Plotly.react");
};
