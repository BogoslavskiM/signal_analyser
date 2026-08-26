"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task01120115ContractStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const routes = fs.readFileSync(path.join(root, "app/routes.jl"), "utf8");
  const provider = fs.readFileSync(path.join(root, "lib/adapters/engee_signal_operation_provider.jl"), "utf8");

  const inventory = ["bandpass", "bandstop", "highpass", "lowpass", "detrend", "fill-missing", "smooth", "envelope", "resample", "custom-preprocess"];
  const operationsBlock = (app.match(/var OPERATIONS=Object\.freeze\(\[([\s\S]*?)\]\);/) || [])[1] || "";
  assert(inventory.every((operation) => new RegExp(`value:\\"${operation}\\"`).test(operationsBlock)), "the dialog must expose the exact ten preprocessing operations");
  assert(!/value:\"(?:abs|square|sqrt|signed-sqrt|multiply|fft|custom|denoise|knn)\"/.test(operationsBlock), "removed math, FFT, Denoise, KNN and old custom options must not appear in the dialog");
  assert(/data-operation-section='preprocess'/.test(app) && !/data-operation-section='math'/.test(app), "the dialog must have no mathematical-operation section");
  assert(/operation_kind:\"preprocess\"/.test(app), "every submitted operation payload must be preprocessing");
  assert(/function openSignalOperation\(trigger\)[\s\S]*?mainSignalForPane\(paneById\(model\.activePane\)\)[\s\S]*?stableSignalId\(selected\)/.test(app), "dialog source must be the current LMB-selected signal in the active pane");
  assert(/function openPreprocessFromHost\(event\)[\s\S]*?mainSignalForPane\(paneById\(model\.activePane\)\)[\s\S]*?openSignalOperation\(document\.activeElement\)/.test(app), "host Preprocess must resolve the same current LMB source and not trust host source data");
  assert(/api\.deriveSignal\(payload\)/.test(app) && /\/api\/signals\/derive/.test(api) && /route\("\/api\/signals\/derive", method = POST\)/.test(routes), "preprocessing must use the normal typed POST route");
  assert(/signal_operation_filter_body[\s\S]*?EngeeDSP\.Functions/.test(provider) && /signal_operation_body[\s\S]*?custom-preprocess/.test(provider), "provider must be the sole backend operation body owner");

  assert(/function calculatePeaks\(\)[\s\S]*?api\.calculateActivePeaks\(payload\)[\s\S]*?acceptPeaksPayload\(response, displayId, paneId, token, true, true\)/.test(app) && /function schedulePeaksPoll[\s\S]*?fetchActivePeaks\(displayId, paneId, true, true\)/.test(app), "Extrema must POST calculation before polling its table");
  assert(/function extremaTabsAvailable\(pane\)[\s\S]*?\["time", "spectrum"\]/.test(app), "Extrema tab must be available for Time and Spectrum only");
  assert(/pane\.plot_type === "spectrum" \? \(row\.frequency == null \? row\.frequency_hz : row\.frequency\)/.test(app), "Spectrum extrema overlays must consume backend frequency positions");

  assert(/data-signal-trim-source/.test(app) && /<select id='signal-trim-source' data-signal-trim-source/.test(app), "trim dialog must retain its source dropdown");
  assert(/function defaultName\(source,operation\)/.test(app) && /targetName:defaultName\(source \|\| \{\},operation\)/.test(app), "preprocessing output names must default from selected source and operation");
};
