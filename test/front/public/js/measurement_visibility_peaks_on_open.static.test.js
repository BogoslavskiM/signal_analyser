"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testMeasurementVisibilityAndPeaksOnOpen(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const app = read("public/js/app.js");
  const settings = read("public/js/settings.js");

  assert(!/data-settings-page="measurements"|statistics-settings-tab/.test(html), "right settings must not expose a Measurements page");
  assert(!/measurementItem\(|action:"measurement"|action:"peaks"|signal-settings-measurement/.test(settings + app), "removed measurement and Peaks settings controls must not survive as hidden handlers");
  assert(/data-testid="measurement-columns-menu"[\s\S]*aria-label="Видимость измерений"/.test(html), "the bottom Measurements page must own an authored visibility menu");

  const menu = (app.match(/function renderMeasurementMenu\(\)[\s\S]*?\n  \}/) || [""])[0];
  ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"].forEach((kind) => {
    assert(app.includes(`id:"${kind}"`), `measurement menu must include ${kind}`);
  });
  assert(/eye\.svg[\s\S]*eye-off\.svg/.test(menu), "measurement menu must render local eye and eye-off state");
  assert(/role='menuitemcheckbox'[\s\S]*aria-checked=/.test(menu), "measurement visibility entries must expose checkbox menu semantics");
  assert(/button\.dataset\.measurementVisible[\s\S]*updateMeasurementKinds\(canonical\)/.test(app), "measurement menu choices must update the canonical backend selection");
  const updater = (app.match(/function updateMeasurementKinds\(measurementKinds\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/api\.view\([\s\S]*measurement_kinds:measurementKinds/.test(updater), "measurement visibility must use the authoritative view API");
  assert(/preservePlots:true, skipOutput:true/.test(updater), "measurement visibility must not reload Plotly outputs");
  assert(/model\.inspectorPage === "measurements"\) loadMeasurements\(\)/.test(app), "measurement values must refresh after visibility changes");

  assert(/model\.inspectorPage === "peaks"\) loadPeaks\(\)/.test(app), "opening the bottom Peaks page must start its on-demand calculation");
  const loadPeaks = (app.match(/function loadPeaks\(\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/display\.peaks_enabled \? api\.getFullState\(\) : mutate/.test(loadPeaks), "Peaks must reuse a ready result or enable calculation on demand");
  assert(/peaks_enabled:true/.test(loadPeaks) && /preservePlots:true, skipOutput:true/.test(loadPeaks), "Peaks on-open calculation must avoid graph output reloads");
  assert(/function renderPeaksInspector\(body\)[\s\S]*peaks\.items[\s\S]*data-testid='peaks-table'/.test(app), "the Peaks page must render the calculated authoritative items");
};
