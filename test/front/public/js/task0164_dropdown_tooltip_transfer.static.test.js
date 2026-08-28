"use strict";

const fs = require("fs");
const path = require("path");

function read(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

module.exports = async function task0164DropdownTooltipTransfer(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = read(root, "public/js/app.js");
  const css = read(root, "public/css/app.css");
  const settings = read(root, "public/js/settings.js");
  const native = read(root, "public/js/native-session-io.js");
  const valueSelect = read(root, "public/js/value-select.js");
  const sourceValueSelect = read(root, "architecture/design/current/frontend-source/js/ui/components/value-select.js");
  const auditScript = read(root, "architecture/design/current/frontend-source/integration/js/task-0164-dropdown-tooltip-audit.js");
  const auditCss = read(root, "architecture/design/current/frontend-source/integration/css/task-0164-dropdown-tooltip-audit.css");

  assert(valueSelect === sourceValueSelect, "V64 verified ValueSelect component must remain byte-identical to its immutable transfer source");
  assert(app.includes(auditScript), "V64 dropdown/tooltip integration fragment must remain byte-identical in production app.js");
  assert(css.includes(auditCss), "V64 dropdown/tooltip style fragment must remain byte-identical in production app.css");

  const buttonTrigger = auditScript.slice(auditScript.indexOf("function tooltipCopy"), auditScript.indexOf("function openMenus"));
  assert(/explicit/.test(auditScript) && /iconOnly\(node\) \|\| symbolic\(node\) \|\| abbreviated\(node\)/.test(buttonTrigger) && /truncated\(node\)/.test(buttonTrigger), "tooltip eligibility must be limited to explicit, icon/symbol/abbreviation or actual truncation cases");
  assert(/var TOOLTIP_DELAY_MS=1500/.test(auditScript) && /focusin/.test(auditScript) && /pointerover/.test(auditScript), "eligible tooltips must start after the exact 1500ms hover/focus delay");
  assert(/signal-analyser:ui-rendered[\s\S]*?hide\(true\)/.test(auditScript) && /signal-analyser:overlay-open[\s\S]*?hide\(true\)/.test(auditScript), "rerender and overlay opening must clear a pending/visible tooltip");
  assert(/function positionPopup[\s\S]*?placement:top < rect\.top \? "top" : "bottom"/.test(auditScript), "dropdown portals must clamp and flip within the viewport");

  assert(/buttonTrigger:config\.buttonTrigger === true \|\| key === "signal-operation-type"/.test(valueSelect) && /return "<button class='value-select-trigger/.test(valueSelect) && !/<button[^>]*select-trigger-arrow/.test(valueSelect), "operation selector must be one semantic button trigger without a nested arrow button");
  assert(/signalTrimSourceOptions\(form\)[\s\S]*?option\.value/.test(app) && /trigger\.dataset\.signalTrimSource=""/.test(app) && /onSelect:function \(value\).*controller\.selectSource\(value\)/.test(app), "trim source ValueSelect must preserve option wire values and deliver the selected source id to its existing controller");
  assert(/key:"signal-operation-parameter::"\+field\.id[\s\S]*?options:options[\s\S]*?chooseSignalOperationParameter\(field\.id,selected\)/.test(app), "operation parameter enums must preserve their option wire values through the shared selector callback");
  assert(/reconcileDropdownTooltip/.test(settings) && /reconcileDropdownTooltip/.test(native) && /audit\.positionPopup/.test(native), "settings and native-session surfaces must reconcile the shared audit and use its popup positioning");
};
