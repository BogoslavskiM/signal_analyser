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

  const htmlRule = ruleWith(layouts, "html", "overflow", "auto");
  const bodyRule = ruleWith(layouts, "body", "overflow", "visible");
  const shellRule = ruleWith(layouts, ".signal-analyser", "min-width", "920px");
  expect(htmlRule && declaration(htmlRule.body, "min-height") === "696px", "the document must retain the padded 920×680 readable minimum and scrollability");
  expect(bodyRule && declaration(bodyRule.body, "min-width") === "936px" && declaration(bodyRule.body, "min-height") === "696px", "body must not clip zones below the readable minimum");
  expect(shellRule && declaration(shellRule.body, "width") === "100%" && declaration(shellRule.body, "height") === "100%", "the application shell must fill its embedding container");
  expect(shellRule && declaration(shellRule.body, "min-height") === "680px", "the application shell must retain explicit 920×680 readable minimums");
  expect(shellRule && !/\b(?:max-width|max-height)\s*:|(?<!min-)\b(?:width|height)\s*:\s*\d+(?:\.\d+)?px/i.test(shellRule.body), "the application shell must not regress to a fixed or max-sized canvas lock");
  const laterShellOverrides = rules(layouts, ".signal-analyser").filter((rule) => shellRule && rule.index > shellRule.index).map((rule) => rule.body);
  expect(!laterShellOverrides.some((rule) => /\b(?:width|height|max-width|max-height)\s*:/i.test(rule)), "responsive rules must not override the fill-container shell with a viewport or fixed canvas height");
  ["app-toolbar", "workspace-titlebar", "data-testid=\"pane-grid\"", "data-testid=\"display-settings\"", "class=\"bottom-zone\""].forEach((zone) =>
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
