"use strict";

const fs = require("fs");
const path = require("path");

function rules(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((match) => ({ body:match[1], index:match.index }));
}

function ruleWith(source, selector, property, value) {
  return rules(source, selector).find((rule) => declaration(rule.body, property) === value);
}

function declaration(rule, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*:\\s*([^;}]+)`, "i").exec(rule);
  return match && match[1].trim();
}

module.exports = async function testPageMinimumAndCheckmarkStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const layouts = fs.readFileSync(path.join(root, "public/css/layouts.css"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/css/settings.css"), "utf8");
  const failures = [];
  const expect = (condition, message) => { if (!condition) failures.push(message); };

  const documentRule = rules(layouts, "html,body").filter((rule) => declaration(rule.body, "overflow") === "auto").at(-1);
  const shellRule = rules(layouts, ".signal-analyser").at(-1);
  const stageRule = rules(layouts, ".main-stage").at(-1);
  expect(documentRule && declaration(documentRule.body, "width") === "100%" && declaration(documentRule.body, "height") === "100%" && declaration(documentRule.body, "min-width") === "0" && declaration(documentRule.body, "min-height") === "0", "the document must remain viewport-first until its readable minimum is needed");
  expect(shellRule && declaration(shellRule.body, "width") === "100%" && declaration(shellRule.body, "height") === "100%", "the application shell must fill its available viewport");
  expect(shellRule && declaration(shellRule.body, "min-width") === "920px" && declaration(shellRule.body, "min-height") === "680px", "the application shell must retain explicit 920×680 readable minimums");
  expect(shellRule && declaration(shellRule.body, "grid-template-rows") === "44px minmax(440px,4fr) minmax(180px,1fr)", "the shell must grow dynamically through the v5 toolbar, work, and reduced bottom-zone tracks");
  expect(stageRule && declaration(stageRule.body, "grid-template-columns") === "minmax(612px,3fr) minmax(300px,1fr)", "the main stage must remain a two-track workspace/settings layout with no third rail");
  expect(!/\.signal-analyser\s*\{[^}]*\b(?:height|min-height)\s*:\s*calc\([^}]*100vh/i.test(layouts), "the viewport-first shell must not use a fixed viewport-height formula");
  expect(documentRule && declaration(documentRule.body, "overflow") === "auto" && shellRule && declaration(shellRule.body, "min-width") === "920px" && declaration(shellRule.body, "min-height") === "680px", "the document must scroll only when the shell's 920×680 readable minimum cannot fit");
  ["app-toolbar", "workspace-titlebar", "data-testid=\"pane-grid\"", "data-testid=\"display-settings\"", "class=\"bottom-zone"].forEach((zone) =>
    expect(html.includes(zone), `scrollable document must retain reachable ${zone} zone markup`)
  );

  const optionRule = ruleWith(settings, ".settings-enum-options button", "height", "34px");
  const checkSlotRule = ruleWith(settings, ".settings-enum-options button::before", "width", "16px");
  const selectedCheckRule = ruleWith(settings, ".settings-enum-options button[aria-selected=\"true\"]::before", "background", "var(--accent)");
  const nativeCheckboxRule = ruleWith(settings, ".signal-analyser input[type=\"checkbox\"]", "accent-color", "var(--accent)");
  expect(optionRule && declaration(optionRule.body, "min-height") === "34px", "every enum option must preserve the exact 34px row height");
  expect(checkSlotRule && declaration(checkSlotRule.body, "flex") === "0 0 16px" && declaration(checkSlotRule.body, "height") === "16px", "every enum option must reserve an unshrunk 16×16 check slot");
  expect(checkSlotRule && declaration(checkSlotRule.body, "overflow") === "hidden", "the check slot must contain the selected mark");
  expect(selectedCheckRule, "the selected enum checkmark must use the shared accent token");
  expect(selectedCheckRule && /(?:-webkit-)?mask\s*:\s*url\("\.\.\/icons\/tick-figma\.svg"\)\s+center\/10px\s+8px\s+no-repeat/.test(selectedCheckRule.body), "the selected enum checkmark must stay contained in its canonical 10×8 SVG mask");
  expect(nativeCheckboxRule && declaration(nativeCheckboxRule.body, "width") === "16px" && declaration(nativeCheckboxRule.body, "height") === "16px", "application-native checkboxes must use the same 16px accent contract");

  assert(failures.length === 0, `page minimum/checkmark static contract failures (${failures.length}):\n- ${failures.join("\n- ")}`);
};
