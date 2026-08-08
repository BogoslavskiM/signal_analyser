"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testAppBootRaceContracts(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const app = read("public/js/app.js");
  const css = read("public/css/app.css");
  const html = read("public/index.html");

  const accept = (app.match(/function accept\(snapshot\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/settings\.setRevision\(r\)/.test(accept) && /activeDisplay\(\)/.test(accept) && /settings\.setContext\(display\.id, r\)/.test(accept), "accepted state-lite must establish the active Display settings context");

  const boot = (app.match(/refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/) || [""])[0];
  assert(/refreshSnapshot\(\)[\s\S]*?output\(true\);[\s\S]*?return settings\.load\(\)\.then[\s\S]*?\.catch\(showSettingsLoadError\)/.test(boot), "startup must request pane output before a settings-load failure is contained");
  assert(!/settings\.load\(\)[\s\S]*?output\(true\)/.test(boot), "settings-load failure must not strand initial pane output");

  assert(/function safeErrorText\(error, fallback\)/.test(app), "boot errors must be converted to typed display text");
  assert(/copy\.textContent\s*=\s*safeErrorText\(error, "Не удалось загрузить анализатор\."\)/.test(app), "bootstrap error copy must not stringify an error object");
  assert(/footer\.dataset\.message\s*=\s*safeErrorText\(error, "Не удалось загрузить настройки\."\)/.test(app), "settings-load error copy must not stringify an error object");
  assert(!/textContent\s*=\s*error(?:\s*;|\s*\|\|)/.test(app), "app error surfaces must not render an error object directly");

  assert(/<footer class="app-status"[^>]*>/.test(html), "application status host must remain outside the app-shell flow");
  const statusCss = (css.match(/\.app-status\s*\{[^}]*\}/) || [""])[0];
  assert(/position:\s*fixed/.test(statusCss) && /pointer-events:\s*none/.test(statusCss), "app-status must be a non-flow overlay");
  assert(!/\.app-status\s*\{[^}]*?(?:grid|flex)(?:-template)?/s.test(statusCss), "app-status must not claim flow sizing");
};
