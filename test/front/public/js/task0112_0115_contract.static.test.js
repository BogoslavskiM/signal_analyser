"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task01120115ContractStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const routes = fs.readFileSync(path.join(root, "app/routes.jl"), "utf8");
  const provider = fs.readFileSync(path.join(root, "lib/adapters/engee_signal_operation_provider.jl"), "utf8");

  assert(/function extremaTabsAvailable\(pane\)[\s\S]*?\["time", "spectrum"\]/.test(app), "Extrema tab must be available for Time and Spectrum only");
  assert(/pane\.plot_type === "spectrum" \? \(row\.frequency == null \? row\.frequency_hz : row\.frequency\)/.test(app) && /hoverinfo:"skip"/.test(app), "spectrum extrema overlays must consume backend projected frequency positions without hover labels");
  assert(/data-spectrum-slider-axis='x'/.test(app) && /data-spectrum-slider-axis='y'/.test(app), "Spectrum Area parameters must expose independent frequency and magnitude slider checkboxes");
  assert(/spectrum\.link_frequency/.test(app) && /spectrum\.link_magnitude/.test(app), "Screen links must include independent spectrum frequency and magnitude flags");

  // Both native slider axes must calculate their full range from spectrum data,
  // not merely be enabled in the menu. This preserves the full-range/reset
  // contract shared with time panes.
  assert(/pane\.plot_type === "spectrum" \? traceAxisDataRange\(traces, "x"\)/.test(app), "frequency slider must retain the spectrum X data range");
  assert(/pane\.plot_type === "spectrum" \? traceAxisDataRange\(traces, "y"\)/.test(app), "magnitude slider must retain the spectrum Y data range");

  assert(!/display\.name \|\| \("Экран " \+ \(index \+ 1\)\)/.test(app), "display labels must never fall back to an array index after a middle display is deleted");
  assert(/data-testid='settings-tab-signal'/.test(app) && /signal-values-action/.test(app), "main signal settings and Values action must be registered");
  assert(/setAttribute\("data-testid", "inspector-tab-samples"\)/.test(app) && /sample-table/.test(app), "dynamic sample inspector tab must be registered");
  assert(/sample_index[\s\S]*time_s[\s\S]*magnitude[\s\S]*square/.test(app), "sample table must render all five authored values");
  assert(/api\.signalSamples\(request\.signalId, request\.startOffset, requestLimit\)/.test(app) && /API_BATCH_SIZE = 500/.test(app), "samples must use bounded 500-row cursor pages instead of loading a full vector");

  assert(/data-signal-operation/.test(app) && /signal-operation-select/.test(app), "signal operation must be available next to duplicate and use the shared ValueSelect control");
  assert(/body:state\.operation === "custom" && body \? body\.value : null/.test(app), "custom operation UI must submit only the authored body");
  assert(!/__signal_analyser_operation_(?:input|stage|output)/.test(app), "frontend must not reveal Engee scratch binding names");
  assert(/\/api\/signals\/derive/.test(api) && /route\("\/api\/signals\/derive", method = POST\)/.test(routes), "derived-signal UI must use the normal typed API route");
  assert(/let init_signal = getfield\(Main/.test(provider) && /Base\.invokelatest\(receive, String\(code\); context = Main\)/.test(provider), "the Engee provider must own the recv wrapper and Main context");
};
