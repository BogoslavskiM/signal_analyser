"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0116SignalFocusStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  // TASK-0117: blue paint represents only the persisted main signal. It is
  // deliberately independent from checkbox membership/visibility.
  assert(/var selectedSignal = model\.state && \(model\.state\.row_selected_signal \|\| model\.state\.selected_signal \|\| model\.state\.analysis_signal\);[\s\S]*?var mainSignal = signals\.filter\(function \(signal\) \{[\s\S]*?signal\.name === selectedSignal \|\| signal\.id === selectedSignal/.test(app), "main row must resolve from persisted selected signal, not checkbox membership");
  assert(/var selected = bindings\.indexOf\(signal\.name\) >= 0;[\s\S]*?var main = !!mainSignal && mainSignal\.name === signal\.name;/.test(app), "row paint and checkbox membership must remain independent");
  assert(/data-signal-row[\s\S]*?data-main-signal='true' class='is-main-signal'/.test(app), "only the resolved main signal row must receive the main marker/class");
  assert(/\.signal-table tbody tr \{ background: var\(--surface\); cursor: pointer; \}/.test(css), "ordinary signal rows must retain the neutral surface fill");
  assert(/\.signal-table tbody tr:hover \{ background: var\(--row-hover\); \}/.test(css), "ordinary signal-row hover must be gray row-hover");
  assert(/\.signal-table tbody tr\.is-main-signal \{ background: var\(--row-selected-analytical\); \}/.test(css), "only main signal rows must receive the blue analytical fill");
  assert(!/\.signal-table tbody tr\.is-selected/.test(css), "legacy generic selected-row blue styling must be absent");

  // A plain row click makes the clicked signal main and ensures membership ON.
  // It must never invert an existing checkbox. A checkbox click changes only
  // membership/visibility and must never update the selected main signal.
  const mainStart = app.indexOf("function setActivePaneMainSignal(");
  const mainBody = app.slice(mainStart, app.indexOf("\n  function focusAreaSettings(", mainStart));
  assert(/mutate\(function \(\) \{[\s\S]*?var currentPane = paneById\(model\.activePane\);[\s\S]*?var visibleSignals = Array\.isArray\(currentPane\.signal_bindings\) \? currentPane\.signal_bindings\.slice\(\) : \[\];[\s\S]*?if \(visibleSignals\.indexOf\(signalName\) < 0\) visibleSignals\.push\(signalName\);[\s\S]*?api\.view\(\{ state_revision:model\.revision, row_selected_signal:signalName, analysis_signal:signalName, visible_signals:visibleSignals \}\)/.test(mainBody), "plain-row selection must atomically recompute active-pane membership and persist all main/visible fields through one view mutation");
  assert(!/setActivePaneSignalMembership|postLayout/.test(mainBody), "plain-row selection must not split membership into a second layout mutation");
  assert(/function setActivePaneSignalMembership\(signalName, checked, options\)[\s\S]*?postLayout\(\{ operation:"update_pane", pane_id:pane\.id, plot_type:pane\.plot_type, signal_bindings:bindings \}\)[\s\S]*?finally/.test(app), "checkbox membership must update only active-pane bindings and release its busy lock");
  const membershipStart = app.indexOf("function setActivePaneSignalMembership(");
  const membershipBody = app.slice(membershipStart, app.indexOf("\n  function setActivePaneMainSignal(", membershipStart));
  assert(!/row_selected_signal|api\.view/.test(membershipBody), "checkbox membership helper must not change main signal, including when unchecking main");
  assert(/if \(node\.dataset\.visibleSignal\)[\s\S]*?setActivePaneSignalMembership\(node\.dataset\.visibleSignal, node\.checked\)/.test(app), "checkbox change must call membership-only helper");
  assert(/target\.closest\("\[data-value-select-key\], \.signal-row-actions, button, input, select, textarea, a, \[contenteditable\], \.modebar"\)/.test(app), "plain-row activation must exclude controls, actions, and embedded interactive elements");
  assert(/var row = target\.closest\("\[data-signal-row\]"\);[\s\S]*?setActivePaneMainSignal\(rowCheckbox\.dataset\.visibleSignal\)/.test(app), "plain LMB signal-row click must select the row signal as main");
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

  // Values table: a stable id replaces the dynamic-tab state; the first page
  // is requested, response identity is guarded, rendered rows are visible and
  // scroll pagination remains reusable on every page.
  assert(/function syncSignalSamplesWithMain\(\)[\s\S]*?var signalId=stableSignalId\(signal\);/.test(app) && /state\.signalId !== signalId/.test(app) && /createSignalSamplesState\(signalId, \(state\.token \|\| 0\) \+ 1, signal\.name\)/.test(app), "sample state must reset its bounded window by stable id when main signal changes");
  assert(/tab\.textContent=signal\.name;[\s\S]*?firstBatchLoaded\) loadSignalSamples\("down"\);/.test(app) && /function showSignalSamples\(\)[\s\S]*?syncSignalSamplesWithMain\(\{ retry:true \}\)[\s\S]*?model\.inspectorPage="samples"[\s\S]*?tab\.focus\(\)/.test(app), "Values action/re-entry must target the dynamic tab, retry a failed missing batch, and avoid refetching an already loaded empty batch");
  assert(/api\.signalSamples\(request\.signalId, request\.startOffset, requestLimit\)/.test(app), "values must use the bounded cursor GET samples API for the stable id");
  assert(/controller\.apply\(state, request, normalizeSignalSamplesPage\(page\)\)[\s\S]*?result\.reason === "stale-token"/.test(app) && /signalIdFrom\(page\) !== state\.signalId/.test(app), "wrong-signal, malformed and stale sample responses must be rejected instead of displayed");
  assert(/rows=state\.rows\.concat\(page\.rows\)[\s\S]*?MAX_DOM_ROWS/.test(app), "accepted pages must append into the bounded retained window");
  assert(/controller\.reject\(state, request, safeErrorText\(error, "Не удалось загрузить значения\."\)\)/.test(app), "a real samples error must remain visible rather than silently look empty");
  assert(/data-testid='samples-table-scroll'[\s\S]*?state\.rows\.map\(function \(row\)/.test(app), "sample table must render received rows in its visible scroll container");
  const scrollListener = (app.match(/scroll\.addEventListener\("scroll",[\s\S]*?\{ passive:true \}\);/) || [""])[0];
  assert(/prefetchSignalSamples\(scroll, state\)/.test(scrollListener) && /prefetchDirections\(state, firstVisible, lastVisible\)\.forEach\(loadSignalSamples\)/.test(app) && !/once\s*:/.test(scrollListener), "scroll pagination must remain reusable across multiple bidirectional window events");
};
