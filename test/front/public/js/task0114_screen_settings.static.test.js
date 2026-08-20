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
  assert(/data-settings-context>Экран 1 · Область 1</.test(html), "static shell may retain default labels before the first authoritative state");
  assert(/context\.textContent = \(display\.name \|\| "Экран"\) \+ " · " \+ \(pane && pane\.name \|\| "Область"\)/.test(app), "runtime context must use persisted Screen and Area names, never their array indices");

  assert(/function screenLayoutSegments\(axis, selected, label\)[\s\S]*?class='segments screen-layout-segments'[\s\S]*?data-screen-layout-" \+ axis/.test(app), "Screen layout axes must use the requested ten-button segmented controls");
  assert(/function renderScreenSettings\(display\)[\s\S]*?screenSettingsGroup\("layout", "Макет"[\s\S]*?screenSettingsGroup\("links", "Связь областей"/.test(app), "Screen page must render layout and link settings as shared collapsible groups");
  assert(/data-testid='screen-link-time-row'[\s\S]*?checkbox-control[\s\S]*?Связать амплитуду[\s\S]*?data-testid='screen-link-amplitude'/.test(app), "Screen links must use the shared field-row and checkbox-control geometry");
  assert(/screenDraftDirty\(draft\)[\s\S]*?draft\.rows !== draft\.initialRows[\s\S]*?draft\.linkAmplitude !== draft\.initialLinkAmplitude/.test(app), "Screen Apply state must cover layout and both independent links");
  assert(/function scheduleScreenSettingsApply\(\)[\s\S]*?window\.setTimeout[\s\S]*?applySettings\(\)[\s\S]*?150/.test(app), "Area/Screen visible settings must debounce into their serialized autosave pipeline");
  assert(/class="settings-status visually-hidden"/.test(html) && /status\.classList\.add\("visually-hidden"\)/.test(app), "status copy remains accessible without a general Apply control");
  assert(/accept:function \(documentValue\)[\s\S]*?context\.document=documentValue/.test(settings), "accepted autosave settings documents must be used without an extra settings GET");
  assert(/context\.page === "screen"\) return/.test(settings), "shared pane-settings renderer must not overwrite the app-owned Screen page during persistence");
  assert(/signal-settings-loaded/.test(settings) && /signal-settings-loaded[\s\S]*?model\.settingsPage === "screen"[\s\S]*?renderSettings\(display\)/.test(app), "a newly selected Screen must hydrate link values after its authoritative settings document loads");
  assert(/draft\.linksReady \? "" : " disabled"/.test(app) && /function scheduleScreenSettingsApply\(/.test(app), "axis links stay unavailable until authoritative Screen settings and then autosave without a general Apply control");
  assert(/model\.screenDraft\.initialRows = draft\.rows[\s\S]*?model\.screenDraft\.initialColumns = draft\.columns/.test(app), "layout popover Apply must rebase the Screen layout draft without discarding independent link edits");

  assert(/screenCollapsed:\s*\{\s*layout:true\s*\}/.test(app), "Screen layout group must be collapsed on first open");
  assert(!app.includes("screen-layout-preview") && !css.includes(".screen-layout-preview"), "Screen settings must not render the removed layout preview");
  assert(/\.screen-layout-options\s*\{[^}]*padding:\s*4px 8px 12px 32px/.test(css) && /\.screen-layout-axis\s*\{[^}]*border:\s*1px solid var\(--line\)/.test(css), "Screen layout may use its special bordered fieldsets with the requested left inset");
  assert(/\.settings-field-row\s*\{[^}]*min-height:\s*40px/.test(css) && /\.checkbox-control\s*\{/.test(css), "Screen link rows must inherit the common field and checkbox geometry");
  assert(/linkTime \? null : group\("time-limits"/.test(settings) && /linkAmplitude \? null : group\("y-limits"/.test(settings), "linked limit sections must disappear from Area settings");
  assert(/context\.linkPreview \? context\.linkPreview\.linkTime : booleanValue\("time\.link_time"\)/.test(settings) && /setLinkPreview:function \(linkTime, linkAmplitude\)/.test(settings), "Area inventory must follow the unsaved Screen link preview immediately");
  assert(/function previewScreenLinks\(draft\)[\s\S]*?settings\.setLinkPreview\(draft && draft\.linkTime, draft && draft\.linkAmplitude\)/.test(app) && /dataset\.screenLinkTime[\s\S]*?previewScreenLinks\(model\.screenDraft\)/.test(app) && /dataset\.screenLinkAmplitude[\s\S]*?previewScreenLinks\(model\.screenDraft\)/.test(app), "both link checkboxes must update the shared preview before Apply");
  assert(/draft\.linkTime \? screenSettingsGroup\("time-limits", "Пределы времени", settings\.renderRows\(\["time\.units", "time\.x_limits"\]\) \+ screenRangeSlider\("time\.x_limits", "x", draft\)\)/.test(app), "linked time limits must move to Screen settings with their double range slider");
  assert(/draft\.linkAmplitude[\s\S]*?screenSettingsGroup\("y-limits", "Пределы оси Y", settings\.renderRows\(\["time\.y_limits"\]\) \+ screenRangeSlider\("time\.y_limits", "y", draft\)\)/.test(app), "linked amplitude limits must move to Screen settings with their double range slider");
  assert(/function screenRangeSlider\(fieldId, axis, draft\)[\s\S]*?data-screen-range-input='min'[\s\S]*?data-screen-range-input='max'/.test(app), "Screen X and Y limits must expose independent double horizontal sliders below their text inputs");
  assert(/function keepAutomaticRangeInputsEmpty\(fieldId, axis, draft\)[\s\S]*?if \(minimum && current\.min == null\) minimum\.value = "";[\s\S]*?if \(maximum && current\.max == null\) maximum\.value = ""/.test(app), "only authoritative null wire bounds must be represented by empty Мин./Макс. inputs instead of materialized numbers");
  assert((app.match(/keepVisibleAutomaticRangeInputsEmpty\(/g) || []).length >= 3, "automatic placeholders must be restored after both Screen and Area settings renders");
  assert(/minimum === "" && item\.kind === "optional_range"[\s\S]*?value:null/.test(settings) && /maximum === "" && item\.kind === "optional_range"[\s\S]*?value:null/.test(settings), "an empty individual optional-range boundary must remain automatic");
  assert(/auto:"Авто"/.test(settings), "time units must expose the automatic engineering-scale label");
  assert(/\.screen-range-slider\s*\{[\s\S]*?position:\s*relative/.test(css) && /\.screen-range-selection\s*\{/.test(css), "Screen range sliders must use the shared dense horizontal rail and selection fill");
  assert(/function areaScreenApplyState\(draft\)[\s\S]*?settings\.state\(\)[\s\S]*?settings\.stateFor\(screenLimitFieldIds\(draft\)\)/.test(app) && !/Promise\.all\(\[settings\.flush\(\), settings\.flushFields/.test(app), "autosave state must combine Area fields with only currently visible Screen-linked limit fields without duplicate flushes");
  assert(/function screenValue\(item\)[\s\S]*?context\.document && context\.document\.screen/.test(settings) && /screenValue:function \(id\)/.test(settings), "Screen controls must consume the backend-owned canonical Screen values instead of the active pane projection");
  assert(/settings\.screenValue \? settings\.screenValue\("time\.link_time"\)/.test(app) && /\["time", "spectrogram"\]\.indexOf\(sourcePane\.plot_type\)/.test(app), "live linked X must use Screen flags and accept both Time and Spectrogram sources");
  assert(/data-layout-screen-settings[\s\S]*?Настроить экран/.test(html), "layout popover must expose the Screen settings shortcut");
};
