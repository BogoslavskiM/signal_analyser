"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0133SignalSamplesStates(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  assert(/model\.inspectorPage === "peaks" \|\| model\.inspectorPage === "samples"/.test(app), "samples page must use the inspector table-only state");
  assert(/\.inspector-body\.is-table-only\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\)/.test(css), "table-only samples content must occupy the full content row rather than the 32px search/header row");
  assert(/firstBatchLoaded:false[\s\S]*?pending:\{ up:null, down:null \}[\s\S]*?error:""/.test(app), "samples state must distinguish an unloaded first batch from a completed empty batch");
  assert(/options && options\.retry && !state\.rows\.length && state\.error\)[\s\S]*?state\.error=""[\s\S]*?!state\.firstBatchLoaded\) loadSignalSamples\("down"\)/.test(app), "Values must retry a failed missing first batch only");
  assert(/!state\.rows\.length && !signalSamplesLoading\(state\) && !state\.error && !state\.firstBatchLoaded\) loadSignalSamples\("down"\)/.test(app), "completed legitimate empty batches must render explicitly without refetch churn");
  assert(/state\.error \? "<div class='samples-loading' role='alert'>"[\s\S]*?!state\.rows\.length && state\.firstBatchLoaded \? "<div class='samples-loading' role='status'>У сигнала нет отсчётов/.test(app), "loading, typed error and legitimate empty states must remain visible instead of a header-only blank");
};
