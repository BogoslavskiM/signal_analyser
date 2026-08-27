"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function functionBlock(source, name, nextName) {
  const start = source.indexOf("  function " + name + "(");
  const end = source.indexOf("\n  function " + nextName + "(", start);
  if (start < 0 || end < 0) throw new Error("missing production function " + name);
  return source.slice(start, end);
}

module.exports = async function task0162ExtremaRetryBehavior(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const actionStart = source.indexOf("(function (root) {\n  \"use strict\";\n\n  var LABELS");
  const actionEnd = source.indexOf("}(typeof window !== \"undefined\" ? window : globalThis));", actionStart);
  assert(actionStart >= 0 && actionEnd >= 0, "the shared extrema action controller must be present");
  const actionSource = source.slice(actionStart, actionEnd) + "}(window));";
  const controls = {};
  vm.runInNewContext(actionSource, { window: controls, String, Object, Boolean }, { filename: "public/js/app.js:extrema-action" });
  const action = controls.SignalAnalyserExtremaAction;
  [
    ["error", "Рассчитать ещё раз", false],
    ["ready", "Пересчитать для актуальных диапазонов", false],
    ["empty", "Пересчитать для актуальных диапазонов", false],
    ["pending", "Рассчитывается…", true]
  ].forEach(([state, label, disabled]) => {
    const view = action.presentation(state);
    assert(view.label === label && view.disabled === disabled, `action ${state} must have the exact label and pending-only disabled state`);
  });
  let readCount = 0;
  assert(action.activation("pending", () => { readCount += 1; return {}; }) === null && readCount === 0, "pending activation must not read or submit a viewport");
  assert(JSON.stringify(action.activation("error", () => ({ min_s: ++readCount, max_s: 2 }))) === JSON.stringify({ visible_range:{ min_s:1, max_s:2 } }), "retry must read the current viewport");
  assert(JSON.stringify(action.activation("ready", () => ({ min_s: ++readCount, max_s: 3 }))) === JSON.stringify({ visible_range:{ min_s:2, max_s:3 } }), "recalculate must reread instead of retaining the prior viewport");

  const calculate = functionBlock(source, "calculatePeaks", "loadPeaks");
  const calls = [], ranges = [];
  const model = {
    activePane:"pane-1", revision:7, settingsPage:"peaks", peaksRecords:{
      "display-1::pane-1": { displayId:"display-1", paneId:"pane-1", calculated:true, pending:false, error:null, data:{ rows:[{}] } }
    }, peaksTokens:{}, peaksPollByPane:{}
  };
  const context = {
    model,
    Promise,
    Error,
    activeDisplay() { return { id:"display-1", peaks_enabled:true }; },
    paneById() { return { id:"pane-1", plot_type:"time", signal_bindings:["Сигнал"] }; },
    extremaTabsAvailable() { return true; },
    paneHasSignals() { return true; },
    paneRuntimeKey(displayId, paneId) { return displayId + "::" + paneId; },
    extremaActionState(record) { return record && record.pending ? "pending" : record && record.error ? "error" : record && record.calculated ? (record.data && record.data.rows && record.data.rows.length ? "ready" : "empty") : "idle"; },
    extremaActionController() { return action; },
    currentPeaksVisibleRange() { const n = ranges.length + 1; const range = { min_s:n, max_s:n + 0.5 }; ranges.push(range); return range; },
    stopPeaksPolling() {}, renderInspector() {}, renderApply() {},
    ensurePeaksEnabled() { return Promise.resolve(); },
    peaksSurfaceActive() { return true; },
    api:{ calculateActivePeaks(payload) { calls.push(payload); return Promise.resolve({ state_revision:7, display_id:"display-1", pane_id:"pane-1", context_key:"r" + calls.length, calculation_revision:calls.length, isready:false, success:false, data:{ signals:[], rows:[] } }); } },
    acceptPeaksPayload() { return null; },
    safeErrorText(error) { return String(error && error.message || error); },
    refreshSnapshot() { return Promise.resolve(); }, accept() { return false; }
  };
  vm.runInNewContext(calculate + "\nthis.__calculatePeaks=calculatePeaks;", context, { filename:"public/js/app.js:calculatePeaks" });
  context.__calculatePeaks();
  await Promise.resolve(); await Promise.resolve();
  model.peaksRecords["display-1::pane-1"] = { displayId:"display-1", paneId:"pane-1", calculated:true, pending:false, error:null, data:{ rows:[{}] } };
  context.__calculatePeaks();
  await Promise.resolve(); await Promise.resolve();
  assert(ranges.length === 2 && calls.length === 2, "each allowed recalculate click must recompute and post exactly one current viewport");
  assert(JSON.stringify(calls.map((call) => call.visible_range)) === JSON.stringify([{ min_s:1, max_s:1.5 }, { min_s:2, max_s:2.5 }]), "two recalculations must submit two distinct current viewport ranges");
  model.peaksRecords["display-1::pane-1"].pending = true;
  context.__calculatePeaks();
  await Promise.resolve();
  assert(ranges.length === 2 && calls.length === 2, "pending is the only action state that must suppress both viewport reading and POST");

  const inspector = functionBlock(source, "renderPeaksInspector", "peaksSettingsKey");
  const footer = functionBlock(source, "renderPeaksApply", "applyPeaksSettings");
  assert(/inspectorExtremaAction\(record\)/.test(inspector) && /extremaActionMarkup\(record, "extrema-calculate"\)/.test(inspector), "inspector ready, empty and error branches must retain the shared extrema action");
  assert(/actionHelper\.project\(button, actionState\)/.test(footer) && /values\.disabled = !display \|\| !pane/.test(footer), "Settings footer must project the exact shared retry/recalculate state without disabling non-pending actions");
};
