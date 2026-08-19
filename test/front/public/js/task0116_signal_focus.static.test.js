"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0116SignalFocusStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  // The selected/main signal is a property of the active Area binding, not a
  // generic selected-row paint. Exactly one row may receive the blue state.
  assert(/var mainSignal = signals\.filter\(function \(signal\) \{ return bindings\.indexOf\(signal\.name\) >= 0 && signal\.name === selectedSignal; \}\)\[0\][\s\S]*?signals\.filter\(function \(signal\) \{ return bindings\.indexOf\(signal\.name\) >= 0; \}\)\[0\] \|\| null;/.test(app), "main signal must resolve from the active Area binding and selected signal before the deterministic first-binding fallback");
  assert(/data-signal-row[\s\S]*?data-main-signal='true' class='is-main-signal'/.test(app), "only the resolved main signal row must receive the main marker/class");
  assert(/\.signal-table tbody tr \{ background: var\(--surface\); cursor: pointer; \}/.test(css), "ordinary signal rows must retain the neutral surface fill");
  assert(/\.signal-table tbody tr:hover \{ background: var\(--row-hover\); \}/.test(css), "ordinary signal-row hover must be gray row-hover");
  assert(/\.signal-table tbody tr\.is-main-signal \{ background: var\(--row-selected-analytical\); \}/.test(css), "only main signal rows must receive the blue analytical fill");
  assert(/\.signal-table tbody tr\.is-main-signal \.color-cell \{ background: var\(--accent-soft\); \}/.test(css), "only the main signal color cell may receive the blue accent fill");
  assert(!/\.signal-table tbody tr\.is-selected/.test(css), "legacy generic selected-row blue styling must be absent");

  // Both direct checkbox and plain-row clicks share the same revision-safe
  // flow: update membership first, then commit the selected main signal.
  assert(/function setActivePaneSignalMembership\(signalName, checked\)[\s\S]*?model\.signalMembershipBusy = true;[\s\S]*?postLayout\(\{ operation:"update_pane", pane_id:pane\.id, plot_type:pane\.plot_type, signal_bindings:bindings \}\)[\s\S]*?var nextMain = checked \? signalName : wasMain \? bindings\[0\] : "";[\s\S]*?api\.view\(\{ state_revision:model\.revision, row_selected_signal:nextMain \}\)/.test(app), "membership must commit the Area layout before its main-signal selection, with a deterministic next binding when main is unchecked");
  assert(/if \(node\.dataset\.visibleSignal\)[\s\S]*?setActivePaneSignalMembership\(node\.dataset\.visibleSignal, node\.checked\)/.test(app), "checkbox changes must use the shared membership/main-signal transaction");
  assert(/target\.closest\("\[data-value-select-key\], \.signal-row-actions, button, input, select, textarea, a, \[contenteditable\], \.modebar"\)/.test(app), "plain-row activation must exclude controls, actions, and embedded interactive elements");
  assert(/var row = target\.closest\("\[data-signal-row\]"\);[\s\S]*?setActivePaneSignalMembership\(rowCheckbox\.dataset\.visibleSignal, !rowCheckbox\.checked\);[\s\S]*?return;/.test(app), "a plain LMB signal-row click must toggle the same checkbox transaction exactly once");
  assert(/model\.signalMembershipBusy\) return Promise\.resolve\(null\)/.test(app) && /finally\(function \(\) \{[\s\S]*?model\.signalMembershipBusy = false;/.test(app), "membership transitions must serialize and release the busy lock after either result");

  // Signal settings use the ordinary settings disclosure component and the
  // exact approved sample-rate wording.
  assert(/data-signal-settings-group-toggle=[\s\S]*?aria-expanded=[\s\S]*?aria-controls=[\s\S]*?settings-group-fields[\s\S]*?hidden/.test(app), "Signal settings groups must be independently collapsible with ARIA disclosure state");
  assert(/button\.dataset\.signalSettingsGroupToggle[\s\S]*?model\.signalEditor\.collapsed\[signalGroup\] = button\.getAttribute\("aria-expanded"\) === "true";[\s\S]*?renderSignalSettings/.test(app), "Signal settings group toggles must persist their collapsed state and rerender");
  assert(/>Дискретизация, Гц<\//.test(app), "sample-rate field must use the approved short label");
  assert(!/Частота дискретизации<\//.test(app), "obsolete sample-rate label must not remain in Signal settings");

  // Workspace clicks establish the right settings focus without remounting the
  // shell: Area for panes, Screen for display selection and creation.
  assert(/function focusAreaSettings\(paneId\)[\s\S]*?model\.settingsPage = "display"[\s\S]*?operation: "select_pane"/.test(app), "pane focus must switch the settings page to Area and select that pane");
  assert(/var pane = target\.closest\("\[data-pane-id\]"\);[\s\S]*?focusAreaSettings\(pane\.dataset\.paneId\)/.test(app), "a plain pane click must focus Area settings");
  assert(/button\.dataset\.displaySelect\) \{ model\.settingsPage="screen"; renderSettings\(activeDisplay\(\)\); return void mutate/.test(app), "display-tab selection must focus Screen settings before its state transition");
  assert(/button\.dataset\.testid === "add-display"\) \{ model\.settingsPage="screen"; renderSettings\(activeDisplay\(\)\); return void mutate/.test(app), "new-display creation must focus Screen settings before its state transition");
};
