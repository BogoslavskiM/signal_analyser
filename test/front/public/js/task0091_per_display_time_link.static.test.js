"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testTask0091PerDisplayAndTimeLinkContracts(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const app = read("public/js/app.js");
  const settings = read("public/js/settings.js");

  assert(/function updateLayout\(snapshot\)[\s\S]*?item\.display_id === snapshot\.active_display_id/.test(app), "active Display must select its own authoritative layout");
  assert(/function paneRuntimeKey\(displayId, paneId\)/.test(app), "output runtime state must use a composite Display/pane key");
  assert(/paneRuntimeKey\(display\.id, pane\.id\)/.test(app), "every output request must key tokens/cache/polling by Display and pane");
  assert(/response\.display_id !== display\.id/.test(app) && /response\.pane_id !== pane\.id/.test(app), "cross-Display stale output responses must be rejected before rendering");

  assert(/function openLayout\(trigger\)[\s\S]*?renderLayoutDraft\(\)[\s\S]*?repositionLayout/.test(app), "layout dialog open must populate and position the authored scaffold");
  assert(/function closeLayout\(\)[\s\S]*?hidden = true[\s\S]*?trigger\.focus\(\)[\s\S]*?layoutDraft = null/.test(app), "Cancel/close lifecycle must discard draft and restore trigger focus");
  assert(/event\.key === "Escape"[\s\S]*?closeLayout\(\)/.test(app), "Escape must close and discard an open layout dialog");
  assert(/!popover\.contains\(event\.target\)[\s\S]*?closeLayout\(\)/.test(app), "outside click must close and discard an open layout dialog");
  assert(/window\.addEventListener\("resize"[\s\S]*?repositionLayout/.test(app), "resize must reposition an open layout dialog");

  assert(/data-visible-signal[\s\S]*?pane\.signal_bindings/.test(app), "active-pane signal checkbox state must derive from pane bindings");
  assert(/node\.dataset\.visibleSignal[\s\S]*?postLayout\(\{ operation:"update_pane"[\s\S]*?signal_bindings:/.test(app), "active-pane signal checkbox changes must use update_pane only");

  assert(/"Связь областей"/.test(settings), "time-link settings copy must say Связь областей");
  assert(!/нескольк(?:их|ие) экран/.test(settings), "time-link settings copy must not mention multiple screens");
};
