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
  assert(/function loadSignalAddCatalog\(preserveVisibleRows\)[\s\S]*?var token = \+\+model\.signalAddToken;[\s\S]*?if \(!preserveVisibleRows\) model\.signalAddCatalog = null;[\s\S]*?model\.signalAddLoading = true;[\s\S]*?renderSignalAddCatalog\(\);[\s\S]*?api\.workspaceVariables\(\)/.test(app), "a dialog open must clear previous rows, while an in-dialog refresh may preserve visible checked rows, and every request must enter loading then call the authoritative endpoint");
  assert(/function openSignalAddDialog\(trigger\)[\s\S]*?loadSignalAddCatalog\(\)/.test(app) && /data-signal-add-retry[\s\S]*?loadSignalAddCatalog\(\)/.test(app), "opening and retrying the dialog must both start a fresh catalog request");
  assert(!/signalAddCatalogFresh|signalAddCachedOpen/.test(app), "the add dialog must have no cached-open freshness branch or cached-open status");
  assert(/if \(token !== model\.signalAddToken\) return;[\s\S]*?model\.signalAddCatalog = catalog/.test(app) && /closeSignalAddDialog[\s\S]*?\+\+model\.signalAddToken/.test(app), "a stale catalog response must be ignored after a newer request or close");
  assert(/operation:"import_workspace_batch"[\s\S]*catalog_revision:catalog\.catalog_revision[\s\S]*selections:selections/.test(app), "Add must submit selected catalog variables through the confirmed batch API");
  assert(/variable\.sample_rate_requirement === "required" \? rate\.value : null/.test(app), "raw variables alone must receive the validated sample rate");
  assert(/q\("\[data-testid='app-shell'\]"\)\.inert = true/.test(app) && /\.inert = false/.test(app), "the modal must own interaction until it closes");
  assert(/closeSignalAddDialog\(true\)[\s\S]*trigger\.focus\(\)/.test(app), "closing the dialog must restore focus to the moved plus action");
  assert(/\.inspector\s*\{[^}]*background:\s*var\(--app-bg\)/.test(css), "the table zone underlay must use the exact plot-grid background token");
};
