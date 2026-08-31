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

  const boot = (app.match(/function bootstrapAttempt\(token\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/api\.getState\(\)[\s\S]*?bootstrap\.acceptInitialState\(token\)[\s\S]*?return settings\.load\(\)[\s\S]*?bootstrap\.acceptActiveSettings\(token\)[\s\S]*?window\.requestAnimationFrame[\s\S]*?bootstrap\.commitInitialRender\(token\)[\s\S]*?output\(true\)/.test(boot), "bootstrap must retain one state-lite → active-settings → rAF-render barrier before requesting output");
  assert(/function current\(\)[\s\S]*?state\.token === token && state\.phase === "loading"/.test(boot), "stale bootstrap completions must not mutate a newer attempt");

  assert(/function safeErrorText\(error, fallback\)/.test(app), "boot errors must be converted to typed display text");
  assert(/copy\.textContent\s*=\s*safeErrorText\(error, "Не удалось загрузить анализатор\."\)/.test(app), "bootstrap error copy must not stringify an error object");
  assert(/footer\.dataset\.message\s*=\s*safeErrorText\(error, "Не удалось загрузить настройки\."\)/.test(app), "settings-load error copy must not stringify an error object");
  const bootstrapError = (app.match(/function showBootstrapError\(error\)[\s\S]*?\n  \}/) || [""])[0];
  const settingsError = (app.match(/function showSettingsLoadError\(error\)[\s\S]*?\n  \}/) || [""])[0];
  assert(!/textContent\s*=\s*error(?:\s*;|\s*\|\|)/.test(bootstrapError + settingsError), "app boot/settings error surfaces must not render an error object directly");

  assert(/<footer class="app-status"[^>]*>/.test(html), "application status host must remain outside the app-shell flow");
  const statusCss = (css.match(/\.app-status\s*\{[^}]*\}/) || [""])[0];
  assert(/position:\s*fixed/.test(statusCss) && /pointer-events:\s*none/.test(statusCss), "app-status must be a non-flow overlay");
  assert(!/\.app-status\s*\{[^}]*?(?:grid|flex)(?:-template)?/s.test(statusCss), "app-status must not claim flow sizing");
};
