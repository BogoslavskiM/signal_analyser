"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testTask0114ScreenSettings(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const app = read("public/js/app.js");
  const settings = read("public/js/settings.js");
  const css = read("public/css/app.css");

  assert(/data-settings-page="display"[^>]*>Область</.test(html), "Display settings tab must be visibly renamed to Area");
  assert(/data-settings-page="display"[\s\S]*?data-settings-page="screen"[\s\S]*?data-settings-page="peaks"/.test(html), "settings tab order must be Area, Screen, Extrema");
  assert(/data-settings-context>Экран 1 · Область 1</.test(html), "initial settings context must use Screen and Area numbering");
  assert(/context\.textContent = "Экран " \+ \(displayIndex \+ 1\) \+ " · Область " \+ \(paneIndex \+ 1\)/.test(app), "runtime context must derive Screen and Area numbers from active state");

  assert(/function renderScreenSettings\(display\)[\s\S]*?Макет[\s\S]*?data-screen-layout-rows[\s\S]*?data-screen-layout-columns[\s\S]*?Связать время[\s\S]*?Связать амплитуду/.test(app), "Screen page must render layout and both link settings");
  assert(/screenDraftDirty\(draft\)[\s\S]*?draft\.rows !== draft\.initialRows[\s\S]*?draft\.linkAmplitude !== draft\.initialLinkAmplitude/.test(app), "Screen Apply state must cover layout and both independent links");
  assert(/function applyScreenSettings\(\)[\s\S]*?postLayout\(\{ operation:"resize"[\s\S]*?persistLayoutLinks\(draft\)[\s\S]*?settings\.load\(\)/.test(app), "Screen Apply must serialize layout before axis-link persistence and authoritative reload");
  assert(/context\.page === "screen"\) return/.test(settings), "shared pane-settings renderer must not overwrite the app-owned Screen page during persistence");

  assert(/\.screen-layout-preview\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--screen-layout-columns\)/.test(css), "Screen layout preview must reflect selected column count");
  assert(/\.screen-link-setting\s*\{[^}]*min-height:\s*40px/.test(css), "Screen link rows must retain dense control geometry");
  assert(/data-layout-screen-settings[\s\S]*?Настроить экран/.test(html), "layout popover must expose the Screen settings shortcut");
};
