"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testV5SettingsInspectorAndPlotContracts(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const css = read("public/css/app.css");
  const app = read("public/js/app.js");
  const settings = read("public/js/settings.js");

  ["settings-content", "settings-footer", "settings-apply", "settings-tab-display", "settings-tab-peaks"].forEach((id) => {
    assert(html.includes(`data-testid="${id}"`), `v5 settings must expose stable selector ${id}`);
  });
  assert(!html.includes('data-testid="statistics-settings-tab"'), "Measurements must not remain in the settings tablist");
  assert(/var ru\s*=/.test(settings) && /function inventory\(\)/.test(settings), "v5 settings labels and inventory must be localized in Russian");
  const inventory = (settings.match(/function inventory\(\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/displayInventory\(type\)\.concat\(timeInventory\(type\)\)/.test(inventory) && !/context\.page === "measurements"/.test(inventory) && /context\.plotType/.test(inventory), "v8 Display inventory must retain merged graph/time fields and plot-type filtering");
  assert(/settings\.setView\(model\.settingsPage, \(pane && pane\.plot_type\) \|\| "time"\)/.test(app), "active settings page/type must be passed without measurement presentation state");
  assert(/item\.kind === "range" \|\| item\.kind === "optional_range"[\s\S]*typeof current === "object" \? current : \{\}/.test(settings), "optional_range must normalize a non-object value before rendering");
  assert(/data-range-part='min'[\s\S]*data-range-part='max'/.test(settings), "optional_range must render distinct minimum and maximum inputs");
  assert(!/value='"\+esc\(current\)/.test(settings), "settings controls must not stringify object values into [object Object]");
  const controlCss = (css.match(/\.control,\s*\.select-trigger\s*\{[^}]*\}/) || [""])[0];
  assert(/height:\s*32px/.test(controlCss), "v5 settings controls must remain exactly 32px high");

  ["inspector-tab-signals", "inspector-tab-measurements", "inspector-tab-peaks", "inspector-pane-signals", "signal-rows", "signal-columns-menu", "measurement-columns-menu"].forEach((id) => {
    assert(html.includes(`data-testid="${id}"`), `inspector must expose stable selector ${id}`);
  });
  assert(/\{ id:"color", label:"Цвет" \}[\s\S]*\{ id:"sample_rate", label:"Частота дискретизации" \}[\s\S]*\{ id:"sample_count", label:"Отсчёты" \}[\s\S]*\{ id:"duration", label:"Длительность" \}[\s\S]*\{ id:"data_type", label:"Тип" \}/.test(app), "inspector headers must expose every authoritative field mapping");
  assert(/sample_rate_hz[\s\S]*sample_count[\s\S]*duration_s[\s\S]*data_type/.test(app), "inspector cells must use authoritative signal field names");
  assert(/class='color-swatch'[\s\S]*--swatch:/.test(app), "inspector must render the color field as a swatch");
  assert(/eye\.svg[\s\S]*eye-off\.svg/.test(app), "column visibility menu must render eye and eye-off state");
  assert(/button\.dataset\.columnVisible[\s\S]*model\.visibleColumns\[key\] = !model\.visibleColumns\[key\][\s\S]*renderInspector\(\)[\s\S]*renderColumnMenu\(\)/.test(app), "column visibility action must update the authoritative inspector state and rendering");
  assert(/button\.dataset\.bottomTab[\s\S]*model\.inspectorPage = button\.dataset\.bottomTab[\s\S]*renderInspector\(\)/.test(app), "bottom tab click must render the selected inspector pane");
  assert(/aria-selected[\s\S]*tabIndex = active \? 0 : -1/.test(app), "inspector tabs must maintain roving tabindex and selected state");
  assert(/ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End[\s\S]*tabs\[index\]\.click\(\)[\s\S]*tabs\[index\]\.focus\(\)/.test(app), "inspector keyboard navigation must activate and focus the roving tab");
  assert(/model\.inspectorPage === "measurements"\) return void renderMeasurementsInspector\(body\)[\s\S]*model\.inspectorPage === "peaks"\) return void renderPeaksInspector\(body\)/.test(app), "each non-signal bottom tab must render its concrete inspector page");

  assert(/function plotEnvelope\(data\) \{ return Array\.isArray\(data\) && data\.length === 1 && data\[0\] && Array\.isArray\(data\[0\]\.data\) \? data\[0\] : data; \}/.test(app), "one-item Plotly envelopes must normalize to their data/layout/config object");
  assert(/var payload = plotEnvelope\(queued\.output\.data\);[\s\S]*Array\.isArray\(payload\.data\) \? payload\.data[\s\S]*payload\.layout \|\| \{\}[\s\S]*payload\.config \|\| \{\}/.test(app), "normalized Plotly envelopes must pass traces, layout, and config to Plotly.react");
};
