"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0120PaneMainStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");

  const mainResolver = (app.match(/function mainSignalForPane\(pane\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/Object\.prototype\.hasOwnProperty\.call\(pane, "analysis_signal"\)/.test(mainResolver), "pane-local main must distinguish a populated main from an absent legacy field");
  assert(/var selected=hasPaneMain \? pane\.analysis_signal : model\.state && \(model\.state\.selected_signal \|\| model\.state\.analysis_signal \|\| model\.state\.row_selected_signal\)/.test(mainResolver), "a non-empty pane analysis_signal must remain authoritative");
  assert(/if \(!String\(selected == null \? "" : selected\)\.trim\(\)\) selected=model\.state && \(model\.state\.selected_signal \|\| model\.state\.analysis_signal \|\| model\.state\.row_selected_signal\);/.test(mainResolver), "a null or blank pane analysis_signal must fall back to the accepted selected, analysis, or row-selected signal");
  assert(/return selected && \(signal\.name === selected \|\| stableSignalId\(signal\) === selected\)/.test(mainResolver), "pane-local main must resolve through both persisted signal name and stable id");

  const inspector = (app.match(/function renderInspector\(\)[\s\S]*?\n  \}\n\n  function measurementValue/) || [""])[0];
  assert(/var activePane = paneById\(model\.activePane\);[\s\S]*?if \(typeof mainSignalForPane === "function"\) mainSignal=mainSignalForPane\(activePane\);/.test(inspector), "signal table main-row paint must consume the active pane source rather than global visibility selection");
  assert(/var selected = bindings\.indexOf\(signal\.name\) >= 0;[\s\S]*?var main = !!mainSignal && mainSignal\.name === signal\.name;/.test(inspector), "graph checkbox membership and blue main-row identity must remain independent");
  assert(/syncSignalSamplesWithMain\(\)/.test(inspector), "sample tab lifecycle must follow pane-local main even while it is hidden from graph bindings");
};
