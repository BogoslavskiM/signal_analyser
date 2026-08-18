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

  assert(/function screenLayoutSelect\(display, axis[\s\S]*?valueSelect\.markup[\s\S]*?testId:"screen-layout-" \+ axis/.test(app), "Screen layout axes must use the shared searchable value selector");
  assert(/function renderScreenSettings\(display\)[\s\S]*?screenSettingsGroup\("layout", "Макет"[\s\S]*?screenSettingsGroup\("links", "Связь областей"/.test(app), "Screen page must render layout and link settings as shared collapsible groups");
  assert(/data-testid='screen-link-time-row'[\s\S]*?checkbox-control[\s\S]*?Связать амплитуду[\s\S]*?data-testid='screen-link-amplitude'/.test(app), "Screen links must use the shared field-row and checkbox-control geometry");
  assert(/screenDraftDirty\(draft\)[\s\S]*?draft\.rows !== draft\.initialRows[\s\S]*?draft\.linkAmplitude !== draft\.initialLinkAmplitude/.test(app), "Screen Apply state must cover layout and both independent links");
  assert(/function applyScreenSettings\(\)[\s\S]*?postLayout\(\{ operation:"resize"[\s\S]*?persistLayoutLinks\(draft\)[\s\S]*?settings\.load\(\)/.test(app), "Screen Apply must serialize layout before axis-link persistence and authoritative reload");
  assert(/context\.page === "screen"\) return/.test(settings), "shared pane-settings renderer must not overwrite the app-owned Screen page during persistence");
  assert(/signal-settings-loaded/.test(settings) && /signal-settings-loaded[\s\S]*?model\.settingsPage === "screen"[\s\S]*?renderSettings\(display\)/.test(app), "a newly selected Screen must hydrate link values after its authoritative settings document loads");
  assert(/draft\.linksReady \? "" : " disabled"/.test(app) && /!draft\.linksReady \|\| fieldState\.invalid \|\| !dirty/.test(app), "axis links and Apply must stay disabled until Screen settings are authoritative and valid");
  assert(/model\.screenDraft\.initialRows = draft\.rows[\s\S]*?model\.screenDraft\.initialColumns = draft\.columns/.test(app), "layout popover Apply must rebase the Screen layout draft without discarding independent link edits");

  assert(/\.screen-layout-preview\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--screen-layout-columns\)/.test(css), "Screen layout preview must reflect selected column count");
  assert(/\.settings-field-row\s*\{[^}]*min-height:\s*40px/.test(css) && /\.checkbox-control\s*\{/.test(css), "Screen link rows must inherit the common field and checkbox geometry");
  assert(/linkTime \? null : group\("time-limits"/.test(settings) && /linkAmplitude \? null : group\("y-limits"/.test(settings), "linked limit sections must disappear from Area settings");
  assert(/draft\.linkTime \? screenSettingsGroup\("time-limits", "Пределы времени", settings\.renderRows\(\["time\.units", "time\.x_limits"\]\)\)/.test(app), "linked time limits must move to Screen settings");
  assert(/draft\.linkAmplitude[\s\S]*?screenSettingsGroup\("y-limits", "Пределы оси Y", settings\.renderRows\(\["time\.y_limits"\]\)\)/.test(app), "linked amplitude limits must move to Screen settings");
  assert(/screenLimitFieldIds\(draft\)[\s\S]*?settings\.stateFor\(limitIds\)[\s\S]*?settings\.flushFields\(limitIds\)/.test(app), "only currently visible linked limit fields may validate and persist on Screen Apply");
  assert(/data-layout-screen-settings[\s\S]*?Настроить экран/.test(html), "layout popover must expose the Screen settings shortcut");
};
