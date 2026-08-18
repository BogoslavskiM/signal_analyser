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

  assert(/function screenLayoutSegments\(axis, selected, label\)[\s\S]*?class='segments screen-layout-segments'[\s\S]*?data-screen-layout-" \+ axis/.test(app), "Screen layout axes must use the requested ten-button segmented controls");
  assert(/function renderScreenSettings\(display\)[\s\S]*?screenSettingsGroup\("layout", "Макет"[\s\S]*?screenSettingsGroup\("links", "Связь областей"/.test(app), "Screen page must render layout and link settings as shared collapsible groups");
  assert(/data-testid='screen-link-time-row'[\s\S]*?checkbox-control[\s\S]*?Связать амплитуду[\s\S]*?data-testid='screen-link-amplitude'/.test(app), "Screen links must use the shared field-row and checkbox-control geometry");
  assert(/screenDraftDirty\(draft\)[\s\S]*?draft\.rows !== draft\.initialRows[\s\S]*?draft\.linkAmplitude !== draft\.initialLinkAmplitude/.test(app), "Screen Apply state must cover layout and both independent links");
  assert(/function applySettings\(\)[\s\S]*?postLayout\(\{ operation:"resize"[\s\S]*?persistLayoutLinks\(draft\)[\s\S]*?settings\.flush\(\)[\s\S]*?settings\.flushFields\(linkIds\.concat\(limitIds\)\)[\s\S]*?settings\.load\(\)/.test(app), "the shared Area/Screen Apply must serialize layout, links, both field sets, and authoritative reload");
  assert(/dataset\.testid === "settings-apply"\) return void \(model\.settingsPage === "peaks" \? applyPeaksSettings\(\) : applySettings\(\)\)/.test(app), "Area and Screen tabs must invoke the same Apply pipeline while Extrema stays independent");
  assert(/context\.page === "screen"\) return/.test(settings), "shared pane-settings renderer must not overwrite the app-owned Screen page during persistence");
  assert(/signal-settings-loaded/.test(settings) && /signal-settings-loaded[\s\S]*?model\.settingsPage === "screen"[\s\S]*?renderSettings\(display\)/.test(app), "a newly selected Screen must hydrate link values after its authoritative settings document loads");
  assert(/draft\.linksReady \? "" : " disabled"/.test(app) && /!draft\.linksReady \|\| !state\.dirty \|\| state\.invalid/.test(app), "axis links and the shared Apply must stay disabled until Screen settings are authoritative, dirty, and valid");
  assert(/model\.screenDraft\.initialRows = draft\.rows[\s\S]*?model\.screenDraft\.initialColumns = draft\.columns/.test(app), "layout popover Apply must rebase the Screen layout draft without discarding independent link edits");

  assert(/screenCollapsed:\s*\{\s*layout:true\s*\}/.test(app), "Screen layout group must be collapsed on first open");
  assert(!app.includes("screen-layout-preview") && !css.includes(".screen-layout-preview"), "Screen settings must not render the removed layout preview");
  assert(/\.screen-layout-options\s*\{[^}]*padding:\s*4px 8px 12px 32px/.test(css) && /\.screen-layout-axis\s*\{[^}]*border:\s*1px solid var\(--line\)/.test(css), "Screen layout may use its special bordered fieldsets with the requested left inset");
  assert(/\.settings-field-row\s*\{[^}]*min-height:\s*40px/.test(css) && /\.checkbox-control\s*\{/.test(css), "Screen link rows must inherit the common field and checkbox geometry");
  assert(/linkTime \? null : group\("time-limits"/.test(settings) && /linkAmplitude \? null : group\("y-limits"/.test(settings), "linked limit sections must disappear from Area settings");
  assert(/draft\.linkTime \? screenSettingsGroup\("time-limits", "Пределы времени", settings\.renderRows\(\["time\.units", "time\.x_limits"\]\)\)/.test(app), "linked time limits must move to Screen settings");
  assert(/draft\.linkAmplitude[\s\S]*?screenSettingsGroup\("y-limits", "Пределы оси Y", settings\.renderRows\(\["time\.y_limits"\]\)\)/.test(app), "linked amplitude limits must move to Screen settings");
  assert(/function areaScreenApplyState\(draft\)[\s\S]*?settings\.state\(\)[\s\S]*?settings\.stateFor\(screenLimitFieldIds\(draft\)\)/.test(app) && /settings\.flushFields\(linkIds\.concat\(limitIds\)\)/.test(app), "the shared Apply state must combine Area fields with only currently visible Screen-linked limit fields");
  assert(/data-layout-screen-settings[\s\S]*?Настроить экран/.test(html), "layout popover must expose the Screen settings shortcut");
};
