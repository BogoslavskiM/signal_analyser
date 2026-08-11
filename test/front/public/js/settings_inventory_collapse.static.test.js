"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSettingsInventoryAndCollapseContracts(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const css = read("public/css/app.css");
  const settings = read("public/js/settings.js");
  const app = read("public/js/app.js");

  ["display", "peaks"].forEach((page) => assert(html.includes(`data-settings-page="${page}"`), `settings page ${page} must remain authored`));
  assert(!html.includes('data-settings-page="time"'), "v8 must not retain a separate right-side Time trigger");
  assert(!html.includes('data-settings-page="measurements"') && !html.includes('data-testid="statistics-settings-tab"'), "Measurements must not remain a right-side settings page");
  assert(/data-settings-page[\s\S]*?ArrowLeft[\s\S]*?ArrowRight[\s\S]*?Home[\s\S]*?End[\s\S]*?tabs\[index\]\.click\(\)[\s\S]*?tabs\[index\]\.focus\(\)/.test(app), "settings pages must support roving keyboard activation");

  const inventoryStart = settings.indexOf("function displayInventory(type)");
  const inventoryEnd = settings.indexOf("function parse(", inventoryStart);
  const inventorySource = settings.slice(inventoryStart, inventoryEnd);
  assert(/function inventory\(\)[\s\S]*?return displayInventory\(type\)\.concat\(timeInventory\(type\)\)/.test(settings), "Display inventory must be the ordered display plus former Time union");
  assert(/function timeInventory\(type\)[\s\S]*?"Связь областей"/.test(settings) && !/Связь экранов/.test(settings), "merged Time inventory must retain exact intra-area link copy");
  const exactInventories = [
    ["time", ["Параметры", "Пределы времени", "Пределы оси Y", "Связь областей"], ["time.normalize_y", "time.show_markers", "time.units", "time.x_limits", "time.y_limits", "time.link_time"]],
    ["spectrum", ["График", "Частотная ось", "Спектральный анализ"], ["display.plot_type", "display.show_legend", "spectrum.frequency_units", "spectrum.frequency_limits", "spectrum.frequency_scale", "spectrum.y_limits", "spectrum.scale", "spectrum.resolution_type", "spectrum.leakage", "spectrum.rbw", "spectrum.window_length", "spectrum.window", "spectrum.sidelobe_attenuation_db", "spectrum.overlap_percent", "spectrum.nfft", "spectrum.frequency_resolution"]],
    ["spectrogram", ["График", "Частотная ось", "Мощность"], ["display.plot_type", "display.show_legend", "spectrogram.time_units", "spectrogram.frequency_units", "spectrogram.frequency_limits", "spectrogram.frequency_scale", "spectrogram.power_limits", "spectrogram.scale", "spectrogram.leakage", "spectrogram.time_resolution", "spectrogram.overlap_percent", "spectrogram.reassign", "spectrogram.actual_rbw"]],
    ["persistence", ["График", "Частотная ось", "Плотность и мощность"], ["display.plot_type", "display.show_legend", "persistence.time_units", "persistence.frequency_units", "persistence.frequency_limits", "persistence.frequency_scale", "persistence.power_limits", "persistence.density_limits", "persistence.scale", "persistence.leakage", "persistence.time_resolution", "persistence.overlap_percent", "persistence.power_bins", "persistence.rbw"]]
  ];
  exactInventories.forEach(([type, titles, ids]) => {
    titles.forEach((title) => assert(inventorySource.includes(`"${title}"`), `${type} inventory must include group ${title}`));
    ids.forEach((id) => assert(inventorySource.includes(`"${id}"`), `${type} inventory must include ${id}`));
  });
  assert(!/context\.page === "measurements"|measurementItem\(|action:"peaks"|action:"measurement"/.test(settings), "measurement and Peaks controls must be absent from the right settings inventory");
  assert(/function timeInventory\(type\)[\s\S]*?type === "spectrogram"[\s\S]*?"Пределы времени"[\s\S]*?"Временные настройки"/.test(settings), "merged Time inventory must retain graph-type-specific and not-applicable branches");

  assert(/function sourceItem\(id\)[\s\S]*?fields\(\)[\s\S]*?readouts\(\)/.test(settings), "inventory must include backend fields and readouts");
  assert(/item\.kind === "range" \|\| item\.kind === "optional_range"/.test(settings) && /item\.kind === "resolution" \|\| item\.kind === "power_bins"/.test(settings), "backend range and resolution controls must remain supported");
  assert(/function isApply\(item\)[\s\S]*?effect_status === "requires_apply"/.test(settings) && /window\.setTimeout\(function \(\) \{ send\(item\); \}, 150\)/.test(settings), "backend Apply fields must retain the exact 150ms save behavior");
  assert(/var raw = typeof option === "object" \? option\.value : option/.test(settings) && /linear:"Линейная"/.test(settings) && /leakage:"По утечке"/.test(settings), "enum labels must localize by authoritative option value before backend label fallback");

  assert(/item\.action === "plot-type"[\s\S]*?signal-settings-plot-type/.test(settings) && /signal-settings-plot-type[\s\S]*?postLayout\(\{ operation:"update_pane"/.test(app), "display.plot_type pseudo field must update the existing layout API path");
  assert(!/signal-settings-measurement/.test(app), "the removed settings page must not retain a hidden measurement event path");

  assert(/var collapseKey = context\.page \+ "\\|" \+ context\.plotType \+ "\\|" \+ item\.key/.test(settings), "collapse state must be independent per page, plot type, and group");
  assert(/<button class='settings-group-title' type='button' data-settings-group-toggle=[\s\S]*?aria-expanded=[\s\S]*?aria-controls=/.test(settings), "each group title must be an accessible collapse button");
  assert(/class='settings-group-fields'[\s\S]*?\(collapsed \? " hidden" : ""\)/.test(settings), "collapsed groups must hide their field wrapper");
  assert(/data-settings-group-toggle[\s\S]*?context\.collapsed\[key\] = toggle\.getAttribute\("aria-expanded"\) === "true"[\s\S]*?render\(\)/.test(settings), "group toggle must persist collapse state and rerender");
  assert(/requestAnimationFrame\(function \(\)[\s\S]*?data-settings-group-toggle[\s\S]*?restored\.focus\(\)/.test(settings), "collapse rerender must restore keyboard focus to the same group toggle");
  assert(/\.settings-group-fields\[hidden\]\s*\{\s*display:\s*none;\s*\}/.test(css), "collapsed settings wrapper must not occupy layout space");
  assert(/\.settings-group-title\[aria-expanded="false"\]::before\s*\{\s*transform:\s*rotate\(-90deg\)/.test(css), "collapsed group chevron must rotate");
};
