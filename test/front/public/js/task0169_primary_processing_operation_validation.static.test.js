"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0169PrimaryProcessingOperationValidation(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const app = read("public/js/app.js");
  const css = read("public/css/app.css");
  const native = read("public/js/native-session-io.js");

  assert(/--primary-processing:\s*#75b5d4/.test(css) && /\[aria-busy="true"\][\s\S]*?width:\s*16px[\s\S]*?height:\s*16px[\s\S]*?primary-processing-spin 900ms linear infinite/.test(css), "Primary processing must use #75b5d4 and one 16px light button-local loader");
  assert(/button\.dataset\.primaryIdleWidth[\s\S]*?setAttribute\("aria-busy","true"\)[\s\S]*?button\.disabled=true/.test(app), "the Primary helper must freeze width and project busy onto the actual button");
  assert(/\.button-primary\[aria-busy="true"\] \.extrema-calculate-spinner[\s\S]*display:\s*none/.test(css), "Primary busy must suppress the former nested extrema spinner");
  const primaryRules = css.slice(css.indexOf("/* V69"), css.indexOf("/* Exact inspector-state-toggle hover"));
  assert(!/\.button-primary:disabled/.test(primaryRules) && !/\[aria-busy="true"\]\s+\.button-primary/.test(primaryRules), "ordinary disabled controls and parent busy state must remain distinct from Primary processing");

  assert(/\.display-add\.header-chrome-button:not\(:disabled\):hover,[\s\S]*?\.layout-trigger\.header-chrome-button:not\(:disabled\):hover[\s\S]*?background:\s*var\(--button-active\)[\s\S]*?color:\s*var\(--accent\)/.test(css), "add-display and layout hover must use analytical header tokens");
  assert(/mask-image:\s*url\("\.\.\/icons\/(?:plus|chevron-down-fill-16)\.svg"\)/.test(css) && !/\.\.\/\.\.\/icons\//.test(css), "header icon masks must use valid ../icons paths only");

  assert(/\.signal-operation-dialog\s*\{[^}]*width:\s*480px[\s\S]*?\.signal-operation-control,[\s\S]*?min-height:\s*32px[\s\S]*?\.signal-operation-unit\s*\{\s*display:\s*none/.test(css), "operation dialog must be 480px with 32px controls and no trailing unit adornment");
  assert(/function label\(field\)[\s\S]*?field\.unit \? ", "\+String\(field\.unit\)/.test(app) && /live\.label\(field\)/.test(app), "operation units must be owned by the label helper");
  assert(/helper\.validate\(operationState\)[\s\S]*?live\.project\(form,operationState,validation,busy\)[\s\S]*?submit\.disabled=busy \|\| state\.success \|\| !validation\.valid/.test(app), "initial operation rendering must validate and project submit valid/busy gating in place");
  assert(/data-signal-operation-overwrite[\s\S]*?projectSignalOperationValidation\(\)/.test(app) && /data-signal-operation-parameter[\s\S]*?helper\.validate[\s\S]*?renderSignalOperation\(\)/.test(app), "overwrite and parameter updates must reuse typed validation without a backend seam");

  ["pane-clear-confirm", "signal-add-submit", "layout-apply", "extrema-values", "extrema-calculate", "signal-trim-submit", "signal-operation-submit", "signal-color-picker-apply"].forEach((id) => assert(app.includes(`"${id}"`), `Primary inventory must include ${id}`));
  assert(/setPrimaryBusy\(q\("\[data-testid='native-file-browser-select'\]"\)/.test(native) && /native-save-submit/.test(native) && /native-import-submit/.test(native), "native browser, save and import async seams must project button-local Primary busy");
  assert(/primary\.setBusy\(apply,busy\)/.test(app), "color Apply must project Primary busy through the shared helper");
};
