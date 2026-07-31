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

assert.equal(config.app.testIds.signalVisibilityCheckboxPrefix, "signal-visibility-checkbox-");
assert.equal(config.app.testIds.signalVisibilityStatePrefix, "signal-visibility-state-");
assert.equal(config.app.testIds.plotHostPrefix, "plot-host-");
assert.equal(config.app.testIds.plotErrorState, "plot-error-state");
assert.equal(config.app.testIds.measurements.signalsTab, "signal-panel-tab-signals");
assert.equal(config.app.testIds.measurements.measurementsTab, "signal-panel-tab-measurements");
assert.equal(config.app.testIds.measurements.panel, "measurements-panel");
assert.equal(config.app.testIds.measurements.signalName, "measurements-signal-name");
assert.equal(config.app.testIds.measurements.table, "measurements-table");
assert.equal(config.app.testIds.measurements.rows.minimum, "measurement-row-minimum");
assert.equal(config.app.testIds.measurements.rows.maximum, "measurement-row-maximum");
assert.equal(config.app.testIds.measurements.rows.mean, "measurement-row-mean");
assert.equal(config.features["measurements-statistics"], true);
assert.deepEqual(Object.keys(config.app.testIds.plotCards).sort(), [
  "persistence",
  "spectrogram",
  "spectrum",
  "time",
]);

console.log("ok - signal_analyser_page support contract assertions");
