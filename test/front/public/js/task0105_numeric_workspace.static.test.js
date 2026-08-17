"use strict";

const fs = require("fs"), path = require("path"), vm = require("vm");

module.exports = async function(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const numericSource = fs.readFileSync(path.join(root, "public/js/numeric.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const context = { window:{} };
  vm.runInNewContext(numericSource, context, { filename:"numeric.js" });
  const parse = context.window.SignalAnalyserNumeric.parse;

  ["1,5", " 1", "1 ", "1e3", "NaN", "Infinity", "-Infinity"].forEach(function(value) {
    assert(!parse(value, "decimal").valid, "shared decimal parser must reject comma, whitespace, exponent and non-finite input: " + value);
  });
  assert(parse("-12.5", "decimal").valid && parse(".25", "decimal").value === 0.25, "shared decimal parser must accept dot-decimals");
  assert(parse("42", "integer").valid && !parse("42.0", "integer").valid, "integer parser must accept only integral draft syntax");
  assert(parse("-Inf", "decimal", { tokens:{ "-Inf":null } }).valid && parse("Inf", "decimal", { tokens:{ "Inf":null } }).valid, "only explicitly supplied extrema tokens may bypass finite decimal parsing");
  assert(!parse("Inf", "decimal", { tokens:{ "-Inf":null } }).valid, "an extrema token must not be accepted outside its explicit field contract");

  assert(html.indexOf('./js/numeric.js') < html.indexOf('./js/settings.js') && html.indexOf('./js/numeric.js') < html.indexOf('./js/app.js'), "numeric parser must load before every settings/import consumer");
  assert(/scalarKind === "integer" \? "numeric" : "decimal"/.test(settings) && /scalarKind === "integer" \? "1"/.test(settings) && /resolutionNumericKind === "integer" \? "numeric" : "decimal"/.test(settings), "settings must render integer and decimal fields with distinct input modes and integer step 1");
  assert(/numeric\.parse\(input \? input\.value : "", "decimal"\)/.test(app), "workspace sample rate must use the shared strict decimal parser");

  assert(/function latest_workspace_catalog!\([\s\S]*?!refresh && !isempty\(service\.registry\.snapshots\)[\s\S]*?return last\(service\.registry\.snapshots\)/.test(fs.readFileSync(path.join(root, "lib/services/workspace_catalog_service.jl"), "utf8")), "backend catalog reopen must return a live cached snapshot without provider enumeration");
  assert(/workspaceVariables: function \(refresh\).*refresh \? "\?refresh=true" : ""/.test(api) && /refresh_value == "true"/.test(fs.readFileSync(path.join(root, "app/routes.jl"), "utf8")), "refresh must be an explicit query contract");
  assert(/signalAddCatalogFresh\(\)[\s\S]*?model\.signalAddCachedOpen = true; renderSignalAddCatalog\(\)/.test(app) && /loadSignalAddCatalog\(false\)/.test(app), "fresh dialog reopen must render local cache rather than fetch");
  assert(/signalAddVariables\(\)[\s\S]*?variable\.selectable === true[\s\S]*?supported\.indexOf\(variable\.source_kind\) >= 0/.test(app), "client list must retain selectable supported variables only");
  assert(/allVariables\.filter\(function \(variable\) \{ return !search/.test(app) && /model\.signalAddSelection\[variable\.variable_id\]/.test(app), "search must filter locally while selection is stored independently of visible rows");
  assert(/value="2048"[^>]*data-signal-add-sample-rate/.test(html) && /if \(rate\) rate\.value = "2048"/.test(app), "raw workspace imports must start and reset to the 2048 Hz default");
  assert(/function workspaceVariableLength\(variable\)/.test(app) && /sampleCount \+ " отсчётов"/.test(app), "workspace rows must show only their sample length");
  assert(!/workspaceVariableShape\(variable\)/.test(app) && !/\? "Timed" : "Raw"/.test(app), "workspace rows must not expose Raw or Timed implementation labels");
  assert(/signalAddResetScroll=true; renderSignalAddCatalog\(\)/.test(app) && /if \(model\.signalAddResetScroll\) \{ list\.scrollTop = 0;/.test(app), "opening or filtering the catalog must reveal its first row rather than retaining stale scroll");
  assert(/catalog && catalog\.truncated[^\n]*" из " \+ catalog\.total/.test(app) && /Показаны первые 1000 совместимых переменных/.test(app), "a real backend safety truncation must be disclosed instead of looking like a frontend omission");

  const listRule = (css.match(/\.workspace-list\s*\{([^}]*)\}/) || [])[1] || "";
  assert(/min-height:\s*0/.test(listRule) && /overflow-x:\s*hidden/.test(listRule) && /overflow-y:\s*auto/.test(listRule) && /overscroll-behavior:\s*contain/.test(listRule) && !/\boverflow\s*:/.test(listRule), "variable list must be the sole explicit vertical scroll owner without an overriding shorthand");
  assert(/\.add-dialog\s*\{[^}]*width:\s*560px[^}]*height:\s*568px[^}]*grid-template-rows:\s*48px 48px minmax\(0, 1fr\) 68px 28px 56px[^}]*border-radius:\s*12px/.test(css), "workspace dialog must retain compact v22 geometry");
  assert(/--selected-tab-indicator-thickness:\s*3px/.test(css) && /\.display-tab-shell\.is-selected::after[\s\S]*?height:\s*var\(--selected-tab-indicator-thickness\)/.test(css) && /\.settings-tabs button\[aria-selected="true"\]::after,[\s\S]*?\.inspector-tabs button\[aria-selected="true"\]::after[\s\S]*?height:\s*var\(--selected-tab-indicator-thickness\)/.test(css), "display, settings and inspector selected indicators must share the exact 3px token");
};
