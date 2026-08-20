"use strict";

const fs = require("fs");
const path = require("path");

function functionBlock(source, name, nextName) {
  return (source.match(new RegExp("function " + name + "\\([\\s\\S]*?(?=\\n  function " + nextName + "\\()")) || [""])[0];
}

function compact(value) {
  return value.replace(/\s+/g, "");
}

function assertMinimalView(assert, block, expected, label) {
  const call = (block.match(/api\.view\(\{([\s\S]*?)\}\)/) || [""])[1];
  assert(call, label + " must call the authoritative /api/view client");
  assert(compact(call) === expected, label + " must send only its state revision and authoritative toggle value");
  assert(!/row_selected_signal|active_plot|analysis_signal|visible_signals|time_limits|spectrum_settings|spectrogram_settings|persistence_settings/.test(call), label + " must not send null selection or unrelated Display settings");
  assert(/\{\s*preservePlots:\s*true,\s*skipOutput:\s*true\s*\}/.test(block), label + " must refresh its inspector-only data without graph output work");
}

module.exports = async function testMeasurementAndPeaksMinimalViewContracts(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const measurement = functionBlock(app, "updateMeasurementKinds", "positionMenu");
  const peaksEnable = functionBlock(app, "ensurePeaksEnabled", "calculatePeaks");
  const peaksCalculate = functionBlock(app, "calculatePeaks", "loadPeaks");
  const peaksOpen = functionBlock(app, "loadPeaks", "targetActivePaneForExtrema");
  const mutate = functionBlock(app, "mutate", "postLayout");

  assertMinimalView(assert, measurement, "state_revision:model.revision,measurement_kinds:measurementKinds", "measurement eye update");
  assert(/model\.inspectorPage === "measurements"\) loadMeasurements\(\)/.test(mutate), "measurement eye update must reload the authoritative measurement table after its minimal view response");

  assertMinimalView(assert, peaksEnable, "state_revision:model.revision,peaks_enabled:true", "Extrema enablement");
  assert(/fetchActivePeaks\(displayId, paneId, false, false\)/.test(peaksOpen), "Extrema tab open must use a single passive GET without requesting calculation or polling");
  assert(!/calculateActivePeaks|fetchActivePeaks\(displayId, paneId, true/.test(peaksOpen), "Extrema tab open must never start its provider calculation");
  assert(/var payload=\{ state_revision:model\.revision, display_id:displayId, pane_id:paneId \};[\s\S]*?if \(visibleRange\) payload\.visible_range=visibleRange;[\s\S]*?api\.calculateActivePeaks\(payload\)/.test(peaksCalculate), "only the explicit Calculate action may POST its active-pane payload, adding canonical visible_range only when a Plotly viewport is available");
  assert(/acceptPeaksPayload\(response, displayId, paneId, token, true, true\)/.test(peaksCalculate), "Calculate must accept POST pending state and then enable passive polling");
  assert(/peaksRecords\[runtimeKey\][\s\S]*?data:response\.data/.test(app), "the pane-scoped Peaks response must retain the authoritative split table data");

  const tabClick = (app.match(/if \(button\.dataset\.bottomTab\) \{[\s\S]*?return; \}/) || [""])[0];
  assert(/model\.inspectorPage\s*=\s*button\.dataset\.bottomTab[\s\S]*?renderInspector\(\)[\s\S]*?loadMeasurements\(\)[\s\S]*?loadPeaks\(\)/.test(tabClick), "bottom tab open must refresh the selected table through the dedicated minimal request path");
};
