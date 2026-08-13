"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testPanePlotTypeJoinedControl(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const app = read("public/js/app.js");
  const css = read("public/css/app.css");

  assert(/<div class='plot-control-cluster'><button class='pane-select value-select-trigger select-trigger'[^>]*><\/button><button class='plot-more'[^>]*data-pane-menu=/.test(app), "unified pane type selector and overflow menu must render as one shared control cluster");
  assert(/valueSelect\.configure\(select,\s*\{[\s\S]*?key:paneSelectKey,[\s\S]*?testId:"pane-type-" \+ pane\.id,[\s\S]*?onSelect:function \(plotType\)/.test(app), "pane trigger must be configured by the shared searchable value selector without changing its pane lifecycle callback");

  const selector = (css.match(/\.plot-control-cluster \.pane-select\s*\{[^}]*\}/) || [""])[0];
  assert(/height:\s*28px/.test(selector), "pane selector must be exactly 28px high");
  assert(/border:\s*1px solid var\(--line\)/.test(selector), "pane selector must own the single joined 1px line border");
  assert(/appearance:\s*none/.test(selector), "pane selector must suppress platform-native appearance");
  assert(/border-radius:\s*var\(--control-radius\) 0 0 var\(--control-radius\)/.test(selector), "pane selector must have left-only joined radius");

  const arrow = (css.match(/\.select-trigger::after\s*\{[^}]*\}/) || [""])[0];
  assert(/width:\s*16px/.test(arrow) && /height:\s*16px/.test(arrow), "the unified pane selector must retain the exact 16px arrow geometry");
  assert(/background:[^;]*url\(["']?\.\.\/icons\/chevron-down-fill-16\.svg/.test(arrow), "the unified pane selector must use the local chevron asset");
  assert(/\.value-select-trigger\[aria-expanded="true"\]::after\s*\{[^}]*rotate\(180deg\)/.test(css), "the unified arrow must point up while its popup is open");

  const more = (css.match(/\.plot-more\s*\{[^}]*\}/) || [""])[0];
  assert(/height:\s*28px/.test(more), "pane overflow button must match the selector's 28px height");
  assert(/border:\s*1px solid var\(--line\)/.test(more) && /border-left:\s*0/.test(more), "pane overflow button must complete the joined single border without an internal seam");
  assert(/border-radius:\s*0 var\(--control-radius\) var\(--control-radius\) 0/.test(more), "pane overflow button must have right-only joined radius");
};
