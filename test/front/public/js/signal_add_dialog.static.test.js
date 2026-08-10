"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSignalAddDialog(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const app = read("public/js/app.js");
  const api = read("public/js/api.js");
  const css = read("public/css/app.css");

  ["signals-add-action", "signal-add-layer", "signal-add-variables", "signal-add-state", "signal-add-error"].forEach((id) => {
    assert(html.includes(`data-testid="${id}"`), `signal add workflow must expose ${id}`);
  });
  assert(/signals-add-action[\s\S]*aria-haspopup="dialog"[\s\S]*aria-controls="signal-add-dialog"/.test(html), "the restored plus action must expose its modal relationship");
  assert(/getBy|workspaceVariables/.test(api) && /workspaceVariables:[\s\S]*\.\/api\/workspace\/variables/.test(api), "the add dialog must use the authoritative workspace catalog endpoint");
  assert(/button\.dataset\.testid === "signals-add-action"[\s\S]*openSignalAddDialog\(button\)/.test(app), "the plus action must open the add dialog");
  assert(/function loadSignalAddCatalog\(\)[\s\S]*api\.workspaceVariables\(\)[\s\S]*renderSignalAddCatalog\(\)/.test(app), "opening the dialog must load and render the workspace catalog");
  assert(/operation:"import_workspace_batch"[\s\S]*catalog_revision:catalog\.catalog_revision[\s\S]*selections:selections/.test(app), "Add must submit selected catalog variables through the confirmed batch API");
  assert(/sampleRateRequirement === "required" \? rate : null/.test(app), "raw variables alone must receive the validated sample rate");
  assert(/q\("\[data-testid='app-shell'\]"\)\.inert = true/.test(app) && /\.inert = false/.test(app), "the modal must own interaction until it closes");
  assert(/closeSignalAddDialog\(true\)[\s\S]*trigger\.focus\(\)/.test(app), "closing the dialog must restore focus to the moved plus action");
  assert(/\.inspector\s*\{[^}]*background:\s*var\(--app-bg\)/.test(css), "the table zone underlay must use the exact plot-grid background token");
};
