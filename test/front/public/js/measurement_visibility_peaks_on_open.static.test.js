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

  assert(/model\.inspectorPage === "peaks"\) loadPeaks\(\)/.test(app), "opening the bottom Extrema page must hydrate only its passive pane state");
  const loadPeaks = (app.match(/function loadPeaks\(\)[\s\S]*?\n  \}/) || [""])[0];
  const enablePeaks = (app.match(/function ensurePeaksEnabled\(displayId, paneId\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/display\.peaks_enabled\) return Promise\.resolve\(\)/.test(enablePeaks), "Extrema must reuse an already enabled active pane");
  assert(/peaks_enabled:true/.test(enablePeaks) && /preservePlots:true, skipOutput:true/.test(enablePeaks), "passive Extrema enablement must not reload graph output");
  assert(/fetchActivePeaks\(displayId, paneId, false, false\)/.test(loadPeaks), "Extrema on-open must perform passive GET without polling");
  assert(!/calculateActivePeaks|fetchActivePeaks\(displayId, paneId, true/.test(loadPeaks), "Extrema on-open must not calculate");
  const peaksInspector = (app.match(/function renderPeaksInspector\(body\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/data-testid='extrema-start'[\s\S]*Рассчет экстремумы для области /.test(peaksInspector), "Extrema must render its exact area start state");
  const calculateIndex = peaksInspector.indexOf("data-testid='extrema-calculate'");
  const configureIndex = peaksInspector.indexOf("data-testid='extrema-configure'");
  const tableIndex = peaksInspector.indexOf("data-testid='peaks-table'");
  assert(configureIndex >= 0 && calculateIndex > configureIndex && tableIndex > calculateIndex, "Extrema rendered markup must order Configure then Calculate before the full-width result table");
};
