"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0123IntegratedRegression(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const api = fs.readFileSync(path.join(root, "app/api.jl"), "utf8");
  const service = fs.readFileSync(path.join(root, "lib/services/signal_settings_service.jl"), "utf8");

  const membership = (app.match(/function setActivePaneSignalMembership\(signalName, checked, options\)[\s\S]*?\n  \}/) || [""])[0];
  const main = (app.match(/function setActivePaneMainSignal\(signalName\)[\s\S]*?\n  \}/) || [""])[0];
  const metadata = (app.match(/function applySignalMetadata\(\)[\s\S]*?\n  \}/) || [""])[0];
  const apply = (app.match(/function applySettings\(\)[\s\S]*?\n  \}/) || [""])[0];

  assert(/pendingMainSignal:\s*""/.test(app) && /signal-row-actions" \+ \(model\.pendingMainSignal === signal\.name \? " is-pinned" : ""\)/.test(app), "a pending main row must pin its actions by exact signal name");
  assert(/\.signal-row-actions\.is-pinned\s*\{[^}]*opacity:\s*1[^}]*pointer-events:\s*auto/.test(css), "pinned row actions must remain visible and interactive");
  assert(!/model\.signalMembershipBusy = true;\s*renderInspector\(\)/.test(membership) && /var accepted = false;[\s\S]*?if \(!accepted\) renderInspector\(\);/.test(membership), "membership/main sequencing must not rerender the full inspector at start or successful finalization");
  assert(/model\.pendingMainSignal = signalName;\s*renderInspector\(\);[\s\S]*?model\.pendingMainSignal = "";\s*renderInspector\(\);/.test(app), "main selection must clear the temporary pin only after accepted or failed completion");
  assert(/mutate\(function \(\) \{[\s\S]*?currentPane\.signal_bindings[\s\S]*?visibleSignals\.push\(signalName\)[\s\S]*?api\.view\([\s\S]*?visible_signals:visibleSignals/.test(main) && !/setActivePaneSignalMembership|postLayout/.test(main), "pending main selection must retain one atomic view mutation across membership and main state");

  assert(/mutate\(function \(\) \{[\s\S]*?api\.updateSignalMetadata\(\{ state_revision:model\.revision, operation:"update_metadata", signal_id:editor\.signalId, name:draft\.name, color:draft\.color, sample_rate_hz:sampleRate\.value \}\);[\s\S]*?\}, \{ preservePlots:true, skipSettings:true \}\)/.test(metadata), "metadata must use the stale-aware mutation seam and send the normalized draft fields");
  assert(/editor\.dirty=false;[\s\S]*?editor\.applying=false;[\s\S]*?render\(\);/.test(metadata), "only an accepted metadata snapshot may clear the editor dirty state");
  assert(/String\(strip\(String\(name_value\)\)\)/.test(api) && /String\(strip\(String\(signal_id\)\)\)/.test(fs.readFileSync(path.join(root, "lib/domain/signal_inventory.jl"), "utf8")), "metadata parser/domain must normalize names and ids to owned String values");

  assert(/persistLayoutLinks\(draft\)[\s\S]*?return settings\.flush\(\);[\s\S]*?needsSettingsApply \? applyLatest\(0\)/.test(apply) && !/Promise\.all\(\[settings\.flush\(\), settings\.flushFields/.test(apply), "Apply must serialize one flush rather than a duplicate flushFields race");
  assert(/error && error\.status === 409 && retries < 1 && current[\s\S]*?return applyLatest\(retries \+ 1\)/.test(apply), "Apply must retain its single stale-409 rebase path");

  assert(/function signal_settings_time_limits_wire_value\([\s\S]*?automatic_minimum && automatic_maximum && return nothing[\s\S]*?"min" => automatic_minimum \? nothing[\s\S]*?"max" => automatic_maximum \? nothing/.test(service), "full automatic time limits must wire as null; partial automatic bounds must remain null independently");
  assert(/signal_settings_screen_time_limits\([\s\S]*?linked_full[\s\S]*?maximum = signal_settings_time_bound_is_automatic\(typed\.max_s, source_full\.max_s\) \?[\s\S]*?linked_full\.max_s/.test(service), "linked unequal-duration panes must propagate automatic runtime union bounds while preserving explicit bounds");
};
