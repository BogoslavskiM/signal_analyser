"use strict";

const assert = require("node:assert/strict");
const config = require("../e2e.config");
const { documentBox, endpointMatches, isApiRequestUrl } = require("./signal_analyser_page");

function response(url, method) {
  return {
    request: function () {
      return { method: function () { return method; } };
    },
    url: function () { return url; },
  };
}

assert.equal(endpointMatches(response("https://prod.example/api/view", "POST"), "/api/view", "POST"), true);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/view", "POST"), "/api/view", "POST"), true);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/view?tab=plots", "POST"), "/api/view", "POST"), true);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/view", "GET"), "/api/view", "POST"), false);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/viewer", "POST"), "/api/view", "POST"), false);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/not-api/view", "POST"), "/api/view", "POST"), false);
assert.equal(isApiRequestUrl("https://prod.example/api/view"), true);
assert.equal(isApiRequestUrl("https://prod.example/user/apps/signal_analyser/api/view"), true);
assert.equal(isApiRequestUrl("https://prod.example/user/apps/signal_analyser/not-api/view"), false);

assert.deepEqual(documentBox(
  { x: -139, y: -48, width: 896, height: 518 },
  { x: 147, y: 120 }
), { x: 8, y: 72, width: 896, height: 518 });

assert.equal(config.app.testIds.signalVisibilityCheckboxPrefix, "signal-checkbox-");
assert.equal(config.app.supportsStaleReplay, true);
assert.equal(config.app.testIds.signalVisibilityStatePrefix, "signal-visibility-state-");
assert.equal(config.app.testIds.plotHostPrefix, "plot-host-");
assert.equal(config.app.testIds.plotErrorState, "plot-error-state");
assert.equal(config.app.testIds.plotInvalidDataState, "plot-invalid-data-state");
assert.equal(config.app.testIds.findPeaksAction, "find-peaks-action");
assert.equal(config.app.testIds.signalStatisticsAction, "signal-statistics-action");
assert.equal(config.app.testIds.normalizeYAxisCheckbox, "normalize-y-checkbox");
assert.equal(config.app.testIds.showMarkersCheckbox, "show-markers-checkbox");
assert.equal(config.app.testIds.timeMinInput, "time-min-input");
assert.equal(config.app.testIds.timeMaxInput, "time-max-input");
assert.equal(config.app.testIds.timeLimitsError, "time-limits-error");
assert.equal(config.app.testIds.statisticsSettingsTab, "statistics-settings-tab");
assert.equal(config.app.testIds.statisticsControls, "statistics-controls");
assert.equal(config.app.testIds.statisticsOptionPrefix, "statistics-option-");
assert.equal(config.app.testIds.statisticsSelectionError, "statistics-selection-error");
assert.equal(config.app.testIds.spectrumSettings, "spectrum-settings");
assert.equal(config.app.testIds.spectrumScaleSelect, "spectrum-scale-select");
assert.equal(config.app.testIds.spectrumFrequencyScaleSelect, "spectrum-frequency-scale-select");
assert.equal(config.app.testIds.spectrumLeakageInput, "spectrum-leakage-input");
assert.equal(config.app.testIds.spectrumSettingsError, "spectrum-settings-error");
assert.equal(config.app.testIds.spectrumFrequencyMinInput, "spectrum-frequency-min-input");
assert.equal(config.app.testIds.spectrumFrequencyMaxInput, "spectrum-frequency-max-input");
assert.equal(config.app.testIds.spectrumFrequencyLimitsError, "spectrum-frequency-limits-error");
assert.equal(config.app.testIds.spectrogramSettings, "spectrogram-settings");
assert.equal(config.app.testIds.spectrogramOverlapPercentInput, "spectrogram-overlap-percent-input");
assert.equal(config.app.testIds.spectrogramOverlapPercentError, "spectrogram-overlap-percent-error");
assert.equal(config.app.testIds.spectrogramLeakageInput, "spectrogram-leakage-input");
assert.equal(config.app.testIds.spectrogramLeakageError, "spectrogram-leakage-error");
assert.equal(config.app.testIds.spectrogramFrequencyMinInput, "spectrogram-frequency-min-input");
assert.equal(config.app.testIds.spectrogramFrequencyMaxInput, "spectrogram-frequency-max-input");
assert.equal(config.app.testIds.spectrogramFrequencyLimitsError, "spectrogram-frequency-limits-error");
assert.equal(config.app.testIds.spectrogramFrequencyScaleSelect, "spectrogram-frequency-scale-select");
assert.equal(config.app.testIds.spectrogramFrequencyScaleEffective, "spectrogram-frequency-scale-effective");
assert.equal(config.app.testIds.spectrogramFrequencyScaleError, "spectrogram-frequency-scale-error");
assert.equal(config.app.testIds.displayOverflowTrigger, "display-overflow-trigger");
assert.equal(config.app.testIds.displayOverflowMenu, "display-overflow-menu");
assert.equal(config.app.testIds.clearDisplayAction, "clear-display-action");
assert.equal(config.app.testIds.emptyDisplay.plot, "empty-display-plot-state");
assert.equal(config.app.testIds.emptyDisplay.measurements, "empty-display-measurements-state");
assert.equal(config.app.testIds.emptyDisplay.peaks, "empty-display-peaks-state");
assert.equal(config.app.testIds.measurements.signalsTab, "signal-panel-tab-signals");
assert.equal(config.app.testIds.measurements.measurementsTab, "signal-panel-tab-measurements");
assert.equal(config.app.testIds.measurements.panel, "measurements-panel");
assert.equal(config.app.testIds.measurements.signalName, "measurements-signal-name");
assert.equal(config.app.testIds.measurements.table, "measurements-table");
assert.equal(config.app.testIds.measurements.rows.minimum, "measurement-row-minimum");
assert.equal(config.app.testIds.measurements.rows.maximum, "measurement-row-maximum");
assert.equal(config.app.testIds.measurements.rows.mean, "measurement-row-mean");
assert.equal(config.features["measurements-statistics"], true);
assert.equal(config.app.testIds.peaks.tab, "peaks-panel-tab");
assert.equal(config.app.testIds.peaks.table, "peaks-table");
assert.equal(config.app.testIds.peaks.rowPrefix, "peak-row-");
assert.equal(config.features.peaks, true);
assert.equal(config.features["clear-display"], true);
assert.equal(config.features["time-presentation"], true);
assert.equal(config.features["time-limits"], true);
assert.equal(config.features["selectable-statistics"], true);
assert.equal(config.features["spectrum-settings-roi"], true);
assert.equal(config.features["frequency-limits"], true);
assert.equal(config.features["typed-spectrogram"], true);
assert.equal(config.features["spectrogram-overlap"], true);
assert.equal(config.features["spectrogram-leakage"], true);
assert.equal(config.features["spectrogram-frequency-limits"], true);
assert.equal(config.features["spectrogram-frequency-scale"], true);
assert.deepEqual(Object.keys(config.app.testIds.plotCards).sort(), [
  "persistence",
  "spectrogram",
  "spectrum",
  "time",
]);

console.log("ok - signal_analyser_page support contract assertions");
