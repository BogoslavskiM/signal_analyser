"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function paneExtremaController(source, assert) {
  const start = source.indexOf("(function (root) {\n  \"use strict\";\n\n  function values(dictionary)");
  const end = source.indexOf("}(typeof window !== \"undefined\" ? window : globalThis));", start);
  assert(start >= 0 && end >= 0, "pane-owned extrema controller must be registered");
  const window = {};
  vm.runInNewContext(source.slice(start, end) + "}(window));", { window, Object, Array, String, Boolean, Set, Promise }, { filename:"public/js/app.js:pane-extrema" });
  return window.SignalAnalyserPaneExtrema;
}

module.exports = async function paneOwnedExtremaBehavior(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const controller = paneExtremaController(app, assert);

  const stored = {
    is_extrema_ready:true,
    success:true,
    extrema_by_signal:{
      "stable-signal-a":[{ sample:4, x:0.4, y:2.5, is_maximum:true }],
      "removed-signal":[{ sample:9, x:0.9, y:-1, is_maximum:false }]
    }
  };
  const markers = controller.markerRecords(stored, ["stable-signal-a"]);
  assert(markers.length === 1 && markers[0].signalId === "stable-signal-a" && markers[0].isMaximum === true, "markers must be recovered from the pane dictionary by stable signal ID and omit deleted graphs");
  assert(controller.hasStoredResult(stored) === true, "a successful pane-owned result keeps Clear available");
  assert(controller.clearPresentation(stored, false).disabled === false, "Clear must be enabled next to an existing calculated result");
  assert(controller.clearPresentation(stored, true).disabled === true, "Clear must be disabled while the pane calculation is pending");
  assert(controller.clearPresentation({ is_extrema_ready:true, success:true, extrema_by_signal:{} }, false).disabled === false, "an empty but successfully calculated pane remains clearable");

  const polling = app.slice(app.indexOf("  function acceptPeaksPayload"), app.indexOf("  function canonicalAxisScale", app.indexOf("  function acceptPeaksPayload")));
  assert(/api\.panePeaks\(displayId, paneId\)/.test(polling), "frontend polling must read the addressed pane endpoint, not global active extrema state");
  assert(/runtimeKey = paneRuntimeKey\(displayId, paneId\)/.test(polling) && /model\.peaksRecords\[runtimeKey\]/.test(polling), "pane polling must retain records by immutable display/pane identity");
  assert(!/api\.activePeaks/.test(polling), "pane polling must not fall back to the active-pane extrema endpoint");

  const clear = app.slice(app.indexOf("  function clearPanePeaks"), app.indexOf("  function calculatePeaks", app.indexOf("  function clearPanePeaks")));
  assert(/api\.clearPanePeaks\(\{display_id:displayId,pane_id:paneId\}\)/.test(clear), "Clear must send exactly the current pane identity to its dedicated API");
  assert(/clearPeaksPoll\(runtimeKey\)/.test(clear) && /model\.peaksTokens\[runtimeKey\]=token/.test(clear), "Clear must stop only that pane polling lifecycle and invalidate only its response token");
  assert(/clearPanePeaks: function \(payload\)[\s\S]*?\.\/api\/peaks\/pane\/clear/.test(api), "frontend API must expose the pane-specific clear endpoint");
  assert(/data-testid="extrema-header-clear"/.test(app) && /setAttribute\("data-testid","extrema-clear"\)/.test(app), "Clear must be available adjacent to Calculate/Recalculate in both extrema action locations");
};
