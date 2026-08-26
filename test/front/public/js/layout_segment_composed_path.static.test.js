"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testLayoutSegmentComposedPath(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

  const draftRenderer = (app.match(/function renderLayoutDraft\(\) \{[\s\S]*?\n  \}/) || [""])[0];
  assert(/data-layout-" \+ axis/.test(draftRenderer), "layout draft must render axis segment controls from the current draft");
  assert(/holder\.innerHTML\s*=/.test(draftRenderer), "regression boundary requires authored segments to be re-rendered when an axis changes");

  const segmentClick = (app.match(/if \(button\.dataset\.layoutRows \|\| button\.dataset\.layoutColumns\) \{[\s\S]*?return void renderLayoutDraft\(\); \}/) || [""])[0];
  assert(/model\.layoutDraft\[button\.dataset\.layoutRows \? "rows" : "columns"\]\s*=\s*Number/.test(segmentClick), "axis segment click must retain and update layoutDraft");
  assert(!/closeLayout\(/.test(segmentClick), "axis segment click must not close the popover before its re-rendered target reaches the outside listener");

  const outsideClick = (app.match(/document\.addEventListener\("click", function \(event\) \{[\s\S]*?if \(!inside\) closeLayout\(\);\n  \}\);/) || [""])[0];
  assert(/typeof event\.composedPath === "function" \? event\.composedPath\(\) : null/.test(outsideClick), "layout outside-click detection must use the original event composed path");
  assert(/path\.indexOf\(popover\)\s*>=\s*0\s*\|\|\s*path\.indexOf\(trigger\)\s*>=\s*0/.test(outsideClick), "a segment whose former DOM node was replaced must still be classified as an internal popover click");
  assert(/if \(!inside\) closeLayout\(\);/.test(outsideClick), "only a genuine outside click may close an open layout draft");

  const apply = (app.match(/if \(button\.dataset\.layoutApply !== undefined\) \{[\s\S]*?\}\); \}/) || [""])[0];
  assert(/var draft = model\.layoutDraft/.test(apply) && /postLayout\(\{ operation: "resize", variant: draft\.rows \+ "x" \+ draft\.columns, rows: draft\.rows, columns: draft\.columns \}\)/.test(apply), "after an internal segment click leaves the draft open, Apply must post that draft as a resize operation");
  assert(/data-layout-screen-settings[\s\S]*?Настроить экран[\s\S]*?data-layout-apply/.test(html), "layout popover must link to Screen settings immediately before its footer actions");
  assert(!html.includes("data-layout-link-time") && !html.includes("data-layout-link-amplitude"), "layout popover must not duplicate Screen axis-link settings");
  assert(/button\.dataset\.layoutScreenSettings !== undefined[\s\S]*?openScreenSettingsFromLayout/.test(app), "Screen settings shortcut must open the dedicated settings page");
};
