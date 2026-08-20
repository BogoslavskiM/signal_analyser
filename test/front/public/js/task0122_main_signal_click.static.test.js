"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0122MainSignalClickStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const main = (app.match(/function setActivePaneMainSignal\(signalName\)[\s\S]*?\n  \}/) || [""])[0];
  const membership = (app.match(/function setActivePaneSignalMembership\(signalName, checked, options\)[\s\S]*?\n  \}/) || [""])[0];
  const mutate = (app.match(/function mutate\(call, options\)[\s\S]*?\n  \}/) || [""])[0];

  // Plain LMB selects the row's signal as main. If it is unbound, membership
  // completes first; if it is already bound, the view call is immediate.
  assert(/var pane = paneById\(model\.activePane\);[\s\S]*?var bindings = Array\.isArray\(pane\.signal_bindings\) \? pane\.signal_bindings : \[\];/.test(main), "row selection must derive membership from the active pane only");
  assert(/var ensureMembership = bindings\.indexOf\(signalName\) >= 0 \? Promise\.resolve\(null\) : setActivePaneSignalMembership\(signalName, true, \{ rethrow:true \}\);[\s\S]*?return ensureMembership\.then/.test(main), "an unbound row must be added before main selection, while an already-bound row avoids a membership mutation");
  assert(/api\.view\(\{ state_revision:model\.revision, row_selected_signal:signalName, analysis_signal:signalName \}\)/.test(main), "main selection must submit the target atomically as state revision, row selection and pane analysis signal");
  assert(/\}, \{ preservePlots:true \}\)[\s\S]*?syncSignalSamplesWithMain\(false\)/.test(main), "only the accepted main-selection path may refresh pane-local main state and its sample-tab lifecycle");

  // Checkbox controls remain intentionally separate: they alter one active
  // pane binding via the layout API and cannot select a main signal.
  assert(/postLayout\(\{ operation:"update_pane", pane_id:pane\.id, plot_type:pane\.plot_type, signal_bindings:bindings \}\)/.test(membership), "direct checkbox membership must use active-pane layout mutation only");
  assert(!/api\.view|row_selected_signal|analysis_signal/.test(membership), "direct checkbox membership must never call view or alter the pane main signal");
  assert(/if \(node\.dataset\.visibleSignal\)[\s\S]*?setActivePaneSignalMembership\(node\.dataset\.visibleSignal, node\.checked\)/.test(app), "checkbox input dispatch must remain bound to the membership-only helper");
  assert(/target\.closest\("\[data-value-select-key\], \.signal-row-actions, button, input, select, textarea, a, \[contenteditable\], \.modebar"\)/.test(app), "plain LMB row dispatch must exclude direct checkbox/input interaction");

  // mutate provides one current-snapshot retry for a stale 409 so the second
  // main-selection attempt carries the accepted revision rather than stale UI.
  assert(/if \(retried \|\| error\.status !== 409 \|\| !error\.payload \|\| !error\.payload\.current\) throw error;[\s\S]*?retried = true;[\s\S]*?accept\(current\)[\s\S]*?return attempt\(\);/.test(mutate), "the main-selection API path inherits the single stale-409 rebase and retry contract");
};
