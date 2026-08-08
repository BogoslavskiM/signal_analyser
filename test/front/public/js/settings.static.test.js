"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testCatalogSettingsResolutionStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const renderer = settings + app;

  assert(html.includes('./js/settings.js') && html.indexOf('./js/settings.js') < html.indexOf('./js/app.js'), "catalog settings module must load before the application renderer");
  ["resolution", "setting-", "-error", "-effect-status", "aria-describedby", "aria-invalid", "aria-busy", "visible", "enabled"].forEach((term) =>
    assert(renderer.includes(term), `catalog settings renderer must retain ${term} for resolution visibility/status/selectors`)
  );
  assert(!/\b(?:pspectrum|fft|dft)\s*\(/i.test(settings), "DFT Points controls must not calculate DSP in the browser");

  const visibleControl = (testId) => new RegExp(`<[^>]+data-testid=["']${testId}["'][^>]*>`, "g");
  const count = (pattern) => (html.match(pattern) || []).length;
  assert(count(visibleControl("plot-type-select")) === 1, "the current design-v2 DOM must expose exactly one pane-inline plot-type control");
  assert(count(visibleControl("settings-view-select")) === 0 && (settings.match(/data-testid='settings-view-select'/g) || []).length === 1, "Display settings must dynamically render exactly one first-row plot-type control in the canonical settings tree");
  assert((settings.match(/display:\["display\.show_legend"\]/g) || []).length === 1 && settings.includes("field.kind === \"boolean\"") && settings.includes("inputAttrs(field)"), "the canonical settings tree must own exactly one catalog-backed Boolean legend control");
  assert((settings.match(/for='settings-view-select'[^>]*><span class='settings-control-label'>Тип графика/g) || []).length === 1, "Display settings must retain one Russian plot-type label for its dynamically owned select");
  assert(!/\b(?:plot type|show legend|legend settings)\b/i.test(html), "visible settings markup must not retain English legacy plot/legend labels");

  ["RUSSIAN_GROUP_LABELS", "RUSSIAN_SECTION_LABELS", "RUSSIAN_FIELD_LABELS", "RUSSIAN_VALUE_LABELS", "presentationLabel", "optionPresentationLabel"].forEach((term) =>
    assert(settings.includes(term), `catalog presentation must normalize ${term} before rendering`)
  );
  ["График", "Время", "Спектр", "Спектрограмма", "Спектр персистентности", "Показывать легенду", "Линейная", "Логарифмическая", "Прямоугольное"].forEach((label) =>
    assert(settings.includes(`\"${label}\"`), `catalog presentation must provide the Russian label ${label}`)
  );
  [
    "display.show_legend", "time.normalize_y", "time.show_markers", "time.units", "time.x_limits", "time.y_limits", "time.link_time",
    "spectrum.frequency_units", "spectrum.frequency_limits", "spectrum.y_limits", "spectrum.frequency_scale", "spectrum.scale", "spectrum.resolution_type", "spectrum.leakage", "spectrum.rbw", "spectrum.window_length", "spectrum.nfft", "spectrum.window", "spectrum.sidelobe_attenuation_db", "spectrum.overlap_percent",
    "spectrogram.time_units", "spectrogram.frequency_units", "spectrogram.frequency_limits", "spectrogram.power_limits", "spectrogram.frequency_scale", "spectrogram.scale", "spectrogram.leakage", "spectrogram.time_resolution", "spectrogram.overlap_percent", "spectrogram.reassign",
    "persistence.time_units", "persistence.frequency_units", "persistence.frequency_limits", "persistence.power_limits", "persistence.density_limits", "persistence.frequency_scale", "persistence.scale", "persistence.leakage", "persistence.time_resolution", "persistence.overlap_percent", "persistence.power_bins",
    "spectrum.frequency_resolution", "spectrogram.actual_rbw", "persistence.rbw",
  ].forEach((fieldId) => assert(settings.includes(`\"${fieldId}\":`), `catalog field ${fieldId} must have a source-owned Russian presentation label`));
  ["linear", "log", "db", "leakage", "rbw", "window_length", "auto", "specified", "hamming", "hann", "blackman_harris", "chebyshev", "flat_top", "kaiser", "rectangular", "picoseconds", "nanoseconds", "microseconds", "milliseconds", "seconds", "minutes", "hours", "days", "years", "cycles_per_year", "cycles_per_day", "cycles_per_hour", "cycles_per_minute", "millihertz", "hertz", "kilohertz", "megahertz", "gigahertz", "terahertz"].forEach((value) =>
    assert(new RegExp(`(?:\\"${value}\\"|\\b${value})\\s*:`).test(settings), `catalog enum ${value} must have a source-owned Russian presentation label`)
  );
  assert(/function render(?:Enum|Range|Resolution|Field)\([\s\S]*?(?:presentationLabel|optionPresentationLabel)/.test(settings), "all rendered catalog field and enum surfaces must consume the Russian presentation maps");
};
