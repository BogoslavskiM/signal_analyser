"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0133SignalSamplesStates(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  assert(/body\.classList\.toggle\("is-table-only", model\.inspectorPage === "peaks"\)/.test(app), "only Peaks, never Samples, may use the table-only inspector layout");
  assert(/\.inspector-body\[data-testid="inspector-pane-samples"\]\s*\{[\s\S]*?grid-template-rows:\s*32px minmax\(0,\s*1fr\)/.test(css), "Samples must retain the 32px point-search row above its full-height table");
  assert(/firstBatchLoaded:false[\s\S]*?pending:\{ up:null, down:null \}[\s\S]*?error:""/.test(app), "samples state must distinguish an unloaded first batch from a completed empty batch");
  assert(/options && options\.retry && !state\.rows\.length && state\.error\)[\s\S]*?state\.error=""[\s\S]*?!state\.firstBatchLoaded\) loadSignalSamples\("down"\)/.test(app), "Values must retry a failed missing first batch only");
  assert(/!state\.rows\.length && !signalSamplesLoading\(state\) && !state\.error && !state\.firstBatchLoaded\) loadSignalSamples\("down"\)/.test(app), "completed legitimate empty batches must render explicitly without refetch churn");
  assert(/state\.error \? "<div class='samples-loading' role='alert'>"[\s\S]*?!state\.rows\.length && state\.firstBatchLoaded && !loading \? "<div class='samples-loading' role='status'>У сигнала нет отсчётов/.test(app), "loading, typed error and legitimate empty states must remain visible instead of a header-only blank");
};
