"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function snapshot(revision) {
  return {
    state_revision: revision,
    active_display_id: "display-1",
    displays: [{ id: "display-1", peaks_enabled: true }],
    layouts: [{ display_id: "display-1", layout: { rows: 1, columns: 1, active_pane_id: "pane-1", panes: [{ id: "pane-1", plot_type: "time", signal_bindings: [] }] } }]
  };
}

function conflict(revision) {
  const error = new Error("Конфликт ревизий");
  error.status = 409;
  error.payload = { current: snapshot(revision) };
  return error;
}

function classList() { return { toggle() {}, add() {}, remove() {} }; }

function createSettingsHarness(responses) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  source = source.replace("})(window, document);", "window.__task0097Settings = { context:context, update:update, send:send }; })(window, document);");
  const calls = [];
  const host = { innerHTML: "" };
  const window = {
    SignalAnalyserApi: {
      updateSetting(payload) {
        calls.push(payload);
        return responses.shift().promise;
      }
    },
    SignalAnalyserValueSelect: {
      markup(config) { return "<button data-value-select-key='" + config.key + "' data-testid='" + config.testId + "'><span>" + config.label + "</span></button>"; },
      reconcile() {}
    },
    dispatchEvent() {},
    setTimeout() { return 1; }, clearTimeout() {}, requestAnimationFrame(callback) { callback(); return 1; }
  };
  const document = { querySelector(selector) { return selector === "[data-testid='settings-content']" ? host : null; }, addEventListener() {} };
  vm.runInNewContext(source, { window, document, Promise, Error, Array, Object, String, Number, Boolean, Math, clearTimeout() {}, CustomEvent:function CustomEvent() {} }, { filename:"public/js/settings.js" });
  const test = window.__task0097Settings;
  test.context.displayId = "display-1";
  test.context.revision = 1;
  test.context.document = { fields: [], readouts: [] };
  return { test, calls };
}

function createPeaksHarness(responses) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("})(window, document);", "window.__task0097Peaks = { model:model, accept:accept, createPeaksDraft:createPeaksDraft, parsePeaksSettings:parsePeaksSettings, renderPeaksSettings:renderPeaksSettings, applyPeaksSettings:applyPeaksSettings }; })(window, document);");
  const calls = [], outputCalls = [], selectConfigs = {};
  const content = { innerHTML:"", setAttribute() {}, querySelector() { return null; } };
  const button = { disabled:false, textContent:"", classList:classList() };
  const footer = { dataset:{}, setAttribute() {} };
  const status = { textContent:"" };
  const tabs = { addEventListener() {} };
  const nodes = {
    "[data-testid='display-tabs']": tabs,
    "[data-testid='display-tabs-wrap']": {},
    "[data-testid='settings-content']": content,
    "[data-testid='settings-apply']": button,
    "[data-testid='settings-footer']": footer,
    "[data-settings-status]": status
  };
  const window = {
    SignalAnalyserApi: {
      updatePeaksSettings(payload) { calls.push(payload); return responses.shift().promise; },
      activePeaks() { return Promise.resolve({ state_revision:99, display_id:"display-1", pane_id:"pane-1", isready:true, success:true, data:{ signals:[], rows:[] } }); },
      activeOutput() { outputCalls.push(true); return Promise.resolve(); },
      getState() { return Promise.resolve(snapshot(99)); }
    },
    SignalAnalyserSettings: { setRevision() {}, setContext() {}, setView() {}, render() {}, state() { return { dirty:false, invalid:false, revision:1 }; }, load() { return Promise.resolve(); } },
    SignalAnalyserValueSelect: {
      markup(config) { selectConfigs[config.key] = config; return "<button data-value-select-key='" + config.key + "' data-testid='" + config.testId + "'><span>" + config.label + "</span></button>"; },
      configure(node) { return node; }, reconcile() {}, close() {}
    },
    addEventListener() {}, clearTimeout() {}, setTimeout() { return 1; }, requestAnimationFrame() { return 1; }
  };
  const document = { querySelector(selector) { return nodes[selector] || null; }, querySelectorAll() { return []; }, addEventListener() {}, createElement() { return {}; }, head:{ appendChild() {} } };
  vm.runInNewContext(source, { window, document, Promise, Error, Array, Object, String, Number, Boolean, Math, CSS:{ escape(value) { return value; } } }, { filename:"public/js/app.js" });
  const test = window.__task0097Peaks;
  test.accept(snapshot(1));
  test.model.settingsPage = "peaks";
  test.model.peaksRecords["display-1::pane-1"] = { data:{ settings:{ mode:"maxima", number_of_peaks:99, maximum_cutoff:null, minimum_cutoff:3, minimum_distance_samples:1, threshold:0 } } };
  test.model.peaksDraft = test.createPeaksDraft({ id:"display-1" }, { id:"pane-1" }, test.model.peaksRecords["display-1::pane-1"].data.settings);
  return { test, calls, outputCalls, content, selectConfigs };
}

module.exports = async function testTask0097LatestWinsAndCutoffVisibility(assert) {
  const first = deferred(), second = deferred();
  const generic = createSettingsHarness([first, second]);
  const genericItem = { id:"time.normalize_y", kind:"number", effect_status:"immediate" };
  generic.test.update(genericItem, "1");
  await settle();
  generic.test.update(genericItem, "2");
  first.resolve({ state:{ state_revision:2 }, settings:{ fields:[], readouts:[] } });
  await settle();
  assert(generic.calls.length === 2, "rapid generic edits must serialize into a single latest retry after the in-flight request");
  assert(generic.calls[0].value === 1 && generic.calls[0].state_revision === 1 && generic.calls[1].value === 2 && generic.calls[1].state_revision === 2, "generic latest retry must send the newest value with the accepted revision");
  second.resolve({ state:{ state_revision:3 }, settings:{ fields:[], readouts:[] } });
  await settle();
  assert(generic.test.context.drafts[genericItem.id].value === 2 && !generic.test.context.drafts[genericItem.id].error, "older generic response must not overwrite the newer local draft or create a field error");

  const staleFirst = deferred(), staleSecond = deferred();
  const conflicted = createSettingsHarness([staleFirst, staleSecond]);
  conflicted.test.update(genericItem, "11");
  await settle();
  conflicted.test.update(genericItem, "12");
  staleFirst.reject(conflict(9));
  await settle();
  assert(conflicted.calls.length === 2 && conflicted.calls[1].value === 12 && conflicted.calls[1].state_revision === 9, "a generic 409 must rebase to the authoritative revision and send only the newest draft");
  staleSecond.resolve({ state:{ state_revision:10 }, settings:{ fields:[], readouts:[] } });
  await settle();
  assert(!conflicted.test.context.drafts[genericItem.id].error, "an ordinary rebased 409 must not become a permanent visible field error");

  const visibility = createPeaksHarness([deferred(), deferred()]);
  const draft = visibility.test.model.peaksDraft;
  draft.values.maximum_cutoff = "7";
  draft.values.minimum_cutoff = "not-a-number";
  visibility.test.renderPeaksSettings({ id:"display-1" }, { id:"pane-1", plot_type:"time", signal_bindings:[] }, visibility.test.model.peaksRecords["display-1::pane-1"]);
  assert(visibility.content.innerHTML.includes("Отсечка максимума") && !visibility.content.innerHTML.includes("Отсечка минимума") && !visibility.content.innerHTML.includes("Минимум учитывается"), "Maxima DOM must contain only maximum cutoff without inactive minimum row/helper/error");
  const maximaPayload = visibility.test.parsePeaksSettings(draft);
  assert(maximaPayload && maximaPayload.maximum_cutoff === 7 && maximaPayload.minimum_cutoff === 3, "invalid hidden minimum must retain the prior valid minimum source in the payload and not block Apply");
  const modeConfig = visibility.selectConfigs["extrema::display-1::pane-1::mode"];
  assert(modeConfig && modeConfig.options.map((option) => option.value).join(",") === "maxima,minima,all", "Extrema must configure the shared selector with all three calculation modes");
  modeConfig.onSelect("minima");
  assert(draft.values.mode === "minima" && visibility.calls.length === 0 && visibility.outputCalls.length === 0, "one Extrema selector choice must update only its existing draft exactly once without settings, calculation, or graph output API calls");
  assert(!visibility.content.innerHTML.includes("Отсечка максимума") && visibility.content.innerHTML.includes("Отсечка минимума") && visibility.content.innerHTML.includes("Введите число или Inf."), "Minima DOM must restore the raw invalid minimum and only its own error surface");
  draft.values.mode = "all";
  draft.values.minimum_cutoff = "4";
  visibility.test.renderPeaksSettings({ id:"display-1" }, { id:"pane-1", plot_type:"time", signal_bindings:[] }, visibility.test.model.peaksRecords["display-1::pane-1"]);
  assert(visibility.content.innerHTML.indexOf("Отсечка максимума") < visibility.content.innerHTML.indexOf("Отсечка минимума"), "All extrema DOM must render maximum cutoff before minimum cutoff");
  assert(draft.values.maximum_cutoff === "7" && draft.values.minimum_cutoff === "4", "independent raw cutoff drafts must survive mode changes without synchronization");

  const peaksFirst = deferred(), peaksSecond = deferred();
  const peaks = createPeaksHarness([peaksFirst, peaksSecond]);
  peaks.test.model.peaksDraft.values.maximum_cutoff = "1";
  peaks.test.model.peaksDraft.intent = 1;
  peaks.test.applyPeaksSettings();
  assert(peaks.calls.length === 1 && peaks.calls[0].settings.maximum_cutoff === 1 && peaks.calls[0].state_revision === 1, "first Extrema Apply request must start from the visible draft only");
  peaks.test.model.peaksDraft.values.maximum_cutoff = "2";
  peaks.test.model.peaksDraft.intent = 2;
  peaks.test.model.peaksApplyQueued = true;
  peaksFirst.resolve({ state:snapshot(2) });
  await settle();
  assert(peaks.calls.length === 2 && peaks.calls[1].settings.maximum_cutoff === 2 && peaks.calls[1].state_revision === 2, "Extrema Apply must serialize a rapid edit into exactly one latest request using the accepted revision");
  peaksSecond.resolve({ state:snapshot(3) });
  await settle();
  assert(peaks.outputCalls.length === 0, "latest-wins Extrema settings requests must not refetch the base graph output");

  const peaksConflictFirst = deferred(), peaksConflictSecond = deferred();
  const peaksConflict = createPeaksHarness([peaksConflictFirst, peaksConflictSecond]);
  peaksConflict.test.model.peaksDraft.values.maximum_cutoff = "21";
  peaksConflict.test.model.peaksDraft.intent = 1;
  peaksConflict.test.applyPeaksSettings();
  peaksConflict.test.model.peaksDraft.values.maximum_cutoff = "22";
  peaksConflict.test.model.peaksDraft.intent = 2;
  peaksConflictFirst.reject(conflict(8));
  await settle();
  assert(peaksConflict.calls.length === 2 && peaksConflict.calls[1].settings.maximum_cutoff === 22 && peaksConflict.calls[1].state_revision === 8, "Extrema 409 must rebase to the latest draft and authoritative revision exactly once");
  peaksConflictSecond.resolve({ state:snapshot(9) });
  await settle();
  assert(peaksConflict.outputCalls.length === 0, "Extrema conflict rebase must not invoke any base graph output endpoint");
};
