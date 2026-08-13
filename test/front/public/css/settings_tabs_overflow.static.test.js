"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSettingsTabsOverflowContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const rules = (selector) => (css.match(new RegExp(`\\${selector}\\s*\\{[^}]*\\}`, "g")) || []);

  const settingsTabs = rules(".settings-tabs");
  const settingsButtons = rules(".settings-tabs button");
  const settingsFocus = rules(".settings-tabs button:focus-visible");
  const inspectorTabs = rules(".inspector-tabs");

  assert(settingsTabs.some((rule) => /height:\s*32px/.test(rule) && /min-height:\s*32px/.test(rule) && /max-height:\s*32px/.test(rule)), "settings tabs must remain an exact 32px row");
  assert(settingsTabs.some((rule) => /overflow:\s*hidden/.test(rule)), "settings tabs must hide overflow on both axes with the overflow shorthand");
  assert(settingsTabs.every((rule) => !/overflow-[xy]:/.test(rule)), "settings tab overflow must remain one two-axis shorthand contract");
  assert(settingsButtons.some((rule) => /box-sizing:\s*border-box/.test(rule) && /height:\s*32px/.test(rule) && /min-height:\s*32px/.test(rule) && /max-height:\s*32px/.test(rule) && /line-height:\s*20px/.test(rule)), "settings tab buttons must fit the exact row with border-box 32px geometry and a 20px line box");
  assert(settingsFocus.some((rule) => /outline-offset:\s*-3px/.test(rule)), "settings tab keyboard focus must remain inset and unclipped");
  assert(inspectorTabs.some((rule) => /overflow-x:\s*auto/.test(rule)), "inspector tabs must retain their horizontal overflow behavior");
  assert(inspectorTabs.every((rule) => !/overflow(?:-x)?:\s*hidden/.test(rule)), "settings overflow containment must not globally hide inspector tab overflow");
};
