"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testPanePlotTypeJoinedControl(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const app = read("public/js/app.js");
  const css = read("public/css/app.css");

  assert(/<div class='plot-control-cluster'><select class='pane-select'[^>]*data-pane-type=[\s\S]*?<\/select><button class='plot-more'[^>]*data-pane-menu=/.test(app), "pane type selector and overflow menu must render as one shared control cluster");

  const selector = (css.match(/\.plot-control-cluster \.pane-select\s*\{[^}]*\}/) || [""])[0];
  assert(/height:\s*28px/.test(selector), "pane selector must be exactly 28px high");
  assert(/border:\s*1px solid var\(--line\)/.test(selector), "pane selector must own the single joined 1px line border");
  assert(/appearance:\s*none/.test(selector), "pane selector must suppress platform-native appearance");
  assert(/background:[^;]*url\(["']?\.\.\/icons\/chevron-down-fill-16\.svg/.test(selector), "pane selector must use the local chevron asset");
  assert(/border-radius:\s*var\(--control-radius\) 0 0 var\(--control-radius\)/.test(selector), "pane selector must have left-only joined radius");

  const more = (css.match(/\.plot-more\s*\{[^}]*\}/) || [""])[0];
  assert(/height:\s*28px/.test(more), "pane overflow button must match the selector's 28px height");
  assert(/border:\s*1px solid var\(--line\)/.test(more) && /border-left:\s*0/.test(more), "pane overflow button must complete the joined single border without an internal seam");
  assert(/border-radius:\s*0 var\(--control-radius\) var\(--control-radius\) 0/.test(more), "pane overflow button must have right-only joined radius");
};
