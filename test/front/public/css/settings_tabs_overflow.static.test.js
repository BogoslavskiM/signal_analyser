"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSettingsTabsOverflowContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const rules = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return css.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, "g")) || [];
  };

  const settingsTabs = rules(".settings-panel > .settings-tabs");
  const settingsScroll = rules(".settings-scroll");
  const inspectorTabs = rules(".inspector-header > .inspector-tabs");
  const inspectorButtons = rules(".inspector-header > .inspector-tabs button");
  const inspectorFocus = rules(".inspector-header > .inspector-tabs button:focus-visible");
  const tableScroll = rules(".signal-table-scroll");

  assert(settingsTabs.every((rule) => !/overflow-[xy]:\s*hidden/.test(rule) && !/(?:min-|max-)?height:\s*32px/.test(rule)), "the right settings tabs must not own the lower-panel overflow/fixed-height correction");
  assert(settingsScroll.some((rule) => /overflow-y:\s*auto/.test(rule)), "settings content must retain its independent vertical scrolling");
  assert(/\.inspector\s*\{[^}]*grid-template-rows:\s*32px\s+minmax\(0,\s*1fr\)/.test(css), "the inspector grid must remain the single owner of the exact 32px header row");
  assert(inspectorTabs.some((rule) => /height:\s*100%/.test(rule) && !/(?:min-|max-)?height:\s*32px/.test(rule)), "the lower inspector tab zone must fill the owned row without duplicating fixed-height declarations");
  assert(inspectorTabs.some((rule) => /overflow-x:\s*hidden/.test(rule) && /overflow-y:\s*hidden/.test(rule)), "the lower inspector tab zone must explicitly forbid scrolling on both axes");
  assert(inspectorButtons.some((rule) => /height:\s*100%/.test(rule) && /line-height:\s*20px/.test(rule) && !/(?:min-|max-)?height:\s*32px/.test(rule)), "lower tab buttons must fill the owned row without duplicated fixed-height declarations");
  assert(inspectorFocus.some((rule) => /outline-offset:\s*-3px/.test(rule)), "lower tab keyboard focus must remain inset and unclipped");
  assert(tableScroll.some((rule) => /overflow:\s*auto/.test(rule)), "lower table content must retain independent two-axis scrolling");
};
