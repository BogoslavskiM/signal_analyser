"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSettingsDebounceStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const layouts = fs.readFileSync(path.join(root, "public/js/layouts.js"), "utf8");
  const source = [settings, app, layouts].join("\n");

  assert(!/(?:localStorage|sessionStorage)\s*\./.test(source), "frontend has no browser-storage persistence channel for noncritical UI state");
  assert(!/api\.(?:uiState|preferences|persistUi|saveUi|workspaceState)\s*\(/.test(source), "frontend has no API persistence method for noncritical UI state");
  assert(!/(?:\.\/)?api\/(?:ui-state|preferences|workspace-state)/.test(source), "frontend has no noncritical UI-state persistence route");
  assert(/localUiOnly[\s\S]{0,2500}?displayUi\[d\.id\][\s\S]{0,300}?return;/.test(app), "the existing noncritical display-only state must remain local and return before API mutation");
  assert(!/\b350\b/.test(source), "without a mutable noncritical persistence path, frontend must not add a synthetic 350 ms timer");
};
