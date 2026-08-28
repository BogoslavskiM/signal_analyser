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
  assert(/fetchActivePeaks\(display\.id, pane\.id, false, false\)/.test(loadPeaks), "Extrema on-open must perform passive GET without polling");
  assert(!/calculatePanePeaks|fetchActivePeaks\([^)]*,[^)]*, true/.test(loadPeaks), "Extrema on-open must not calculate");
  const tableActions = (app.match(/function headerActionsMarkup\(iconBase\)[\s\S]*?\n  function surfaceMarkup/) || [""])[0];
  assert(!/extrema-header-actions|header-clear|header-action/.test(app), "the inspector tab row must not retain legacy Extrema actions");
  assert(/extrema-table-actions-cell[\s\S]*?data-testid='extrema-table-clear'[\s\S]*?trash-16\.svg[\s\S]*?data-testid='extrema-table-recalculate'[\s\S]*?refresh-16\.svg/.test(tableActions), "a ready table must put trash left and reload right in its final action header cell");
  assert(/data-testid='extrema-no-table-state'[\s\S]*?data-testid='extrema-calculate'[\s\S]*?data-testid='extrema-configure'/.test(app), "every no-table Extrema state must retain the centered Calculate and Configure controls");
};
