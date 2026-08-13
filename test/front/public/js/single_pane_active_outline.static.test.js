"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSinglePaneActiveOutlineSuppression(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  const gridRender = (app.match(/function renderGrid\(\)[\s\S]*?\n  \}/) || [""])[0];
  const paneReconcile = (app.match(/function reconcilePaneNode\([^)]*\)[\s\S]*?\n  \}/) || [""])[0];
  const activeContext = (app.match(/function renderActivePaneContext\(\)[\s\S]*?\n  \}/) || [""])[0];
  const normalActiveRule = (css.match(/\.plot-pane\.is-active\s*\{[^}]*\}/) || [""])[0];
  const singlePaneOverride = (css.match(/\.plot-grid\[data-pane-count="1"\]\s+\.plot-pane\.is-active\s*\{[^}]*\}/) || [""])[0];

  assert(/var displayPanes = panes\(\);[\s\S]*?grid\.dataset\.paneCount = String\(displayPanes\.length\)/.test(gridRender), "grid render must expose its authoritative visible pane count");
  assert(/var selected = pane\.id === model\.activePane/.test(paneReconcile) && /classList\.toggle\("is-active", selected\)/.test(paneReconcile) && /dataset\.paneSelected = String\(selected\)/.test(paneReconcile) && /, активная/.test(paneReconcile), "a single pane must remain semantically selected even when its outline is suppressed");
  assert(/grid\.dataset\.paneCount = String\(panes\(\)\.length\)/.test(activeContext) && /classList\.toggle\("is-active", selected\)/.test(activeContext) && /node\.dataset\.paneSelected = String\(selected\)/.test(activeContext), "in-place pane selection must retain selected state and keep the pane-count styling context current");
  assert(/border-color:\s*var\(--accent\)/.test(normalActiveRule) && /box-shadow:\s*inset 0 0 0 1px var\(--accent\)/.test(normalActiveRule), "multi-pane active selection must retain its blue outline");
  assert(/border-color:\s*var\(--line\)/.test(singlePaneOverride) && /box-shadow:\s*none/.test(singlePaneOverride), "only a one-pane grid may suppress the blue active outline");
};
