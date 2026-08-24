"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function classes() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    toggle(value, force) { if (force === undefined ? !values.has(value) : force) values.add(value); else values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function element(extra) {
  return Object.assign({
    innerHTML: "",
    textContent: "",
    hidden: false,
    disabled: false,
    dataset: {},
    classList: classes(),
    setAttribute() {},
    removeAttribute() {},
    hasAttribute() { return false; },
    matches() { return false; },
    addEventListener() {},
    querySelector() { return null; },
    focus() {}
  }, extra || {});
}

function snapshot(bindings, plotType) {
  return {
    state_revision: 3,
    active_display_id: "display-1",
    selected_signal: "Сигнал 1",
    displays: [{ id: "display-1", peaks_enabled: true, measurement_kinds: [] }],
    signals: [{ id: "sig-1", name: "Сигнал 1", color: "#2563eb", sample_rate_hz: 2048 }],
    layouts: [{
      display_id: "display-1",
      layout: {
        rows: 1,
        columns: 1,
        active_pane_id: "pane-1",
        panes: [{ id: "pane-1", plot_type: plotType || "time", signal_bindings: bindings }]
      }
    }]
  };
}

function peaksResponse(overrides) {
  return Object.assign({
    state_revision: 3,
    display_id: "display-1",
    pane_id: "pane-1",
    context_key: "display-1::pane-1::peaks::r0",
    calculation_revision: 0,
    isready: false,
    success: false,
    error: "",
    data: {
      settings: { mode: "maxima", number_of_peaks: 5, maximum_cutoff: null, minimum_cutoff: null, minimum_distance_samples: 1, threshold: 0 },
      signals: [],
      rows: []
    }
  }, overrides || {});
}

function createHarness(options) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const numericSource = fs.readFileSync(path.join(root, "public/js/numeric.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("})(window, document);", "window.__explicitExtrema = { model:model, accept:accept, loadPeaks:loadPeaks, calculatePeaks:calculatePeaks, configureActivePeaks:configureActivePeaks, showActivePeaksValues:showActivePeaksValues, renderPeaksInspector:renderPeaksInspector, renderPeaksApply:renderPeaksApply, renderContext:renderActivePaneContext, renderSettings:renderSettings, extremaTabsAvailable:extremaTabsAvailable }; })(window, document);");

  const body = element();
  const peaksHost = element();
  peaksHost.parentElement = body;
  body.querySelector = function (selector) { return selector === "[data-testid='peaks-table-scroll']" ? peaksHost : null; };
  const settingsContent = element();
  const footer = element();
  const apply = element();
  const status = element();
  const values = element({ hidden: true });
  const tabs = element();
  const settingsDisplayTab = element({ dataset:{ settingsPage:"display" } });
  const settingsPeaksTab = element({ dataset:{ settingsPage:"peaks" } });
  const inspectorSignalsTab = element({ dataset:{ bottomTab:"signals" } });
  const inspectorMeasurementsTab = element({ dataset:{ bottomTab:"measurements" } });
  const inspectorPeaksTab = element({ dataset:{ bottomTab:"peaks" } });
  const timers = [];
  const listeners = {};
  const activeCalls = [];
  const calculateCalls = [];
  const metadataCalls = [];
  const activeResponses = (options.activeResponses || []).slice();
  const calculateResponses = (options.calculateResponses || []).slice();
  const metadataResponses = (options.metadataResponses || []).slice();
  const nodes = {
    "[data-testid='app-shell']": element(),
    "[data-inspector-content]": body,
    "[data-testid='peaks-table-scroll']": peaksHost,
    "[data-testid='settings-content']": settingsContent,
    "[data-testid='settings-footer']": footer,
    "[data-testid='settings-apply']": apply,
    "[data-settings-status]": status,
    "[data-testid='extrema-values']": values,
    "[data-testid='display-tabs']": tabs,
    "[data-testid='display-tabs-wrap']": element(),
    "[data-testid='settings-tab-peaks']": settingsPeaksTab,
    "[data-testid='inspector-tab-peaks']": inspectorPeaksTab
  };
  const api = {
    activePeaks(displayId, paneId) {
      activeCalls.push({ displayId, paneId });
      const response = activeResponses.shift();
      return response && response.promise ? response.promise : Promise.resolve(response || peaksResponse());
    },
    calculateActivePeaks(payload) {
      calculateCalls.push(payload);
      const response = calculateResponses.shift();
      return response && response.promise ? response.promise : Promise.resolve(response || peaksResponse());
    },
    updateSignalMetadata(payload) {
      metadataCalls.push(payload);
      const response = metadataResponses.shift();
      return response && response.promise ? response.promise : response instanceof Error ? Promise.reject(response) : Promise.resolve(response || snapshot(["Сигнал 1"]));
    },
    signalSummary() { return Promise.resolve({}); },
    activeOutput() {
      if (!options.allowMetadataOutput) throw new Error("Extrema flow must not request graph output");
      return Promise.resolve({ state_revision: 3, display_id: "display-1", pane_id: "pane-1", context_key: "metadata", calculation_revision: 0, isready: true, success: true, data: { data: [] } });
    },
    view() { throw new Error("fixture is already Extrema-enabled"); }
  };
  const window = {
    SignalAnalyserApi: api,
    SignalAnalyserValueSelect: {
      markup(config) {
        return "<button class='value-select-trigger select-trigger' type='button' data-value-select-key='" + config.key + "' data-testid='" + config.testId + "'><span>" + config.label + "</span></button>";
      },
      configure(node) { return node; },
      reconcile() {},
      close() {}
    },
    SignalAnalyserSettings: {
      setRevision() {}, setContext() {}, setView() {}, render() {}, load() { return Promise.resolve(); },
      state() { return { dirty: false, invalid: false, revision: 3 }; }
    },
    addEventListener() {},
    clearTimeout() {},
    setTimeout(callback) { timers.push(callback); return timers.length; },
    requestAnimationFrame(callback) { if (callback) callback(); return 1; }
  };
  let settingsMarkup = "", metadataNameNode = null;
  const document = {
    activeElement: null,
    querySelector(selector) { return selector === "[data-signal-metadata='name']" ? metadataNameNode : nodes[selector] || null; },
    querySelectorAll(selector) {
      if (selector === "[data-settings-page]") return [settingsDisplayTab, settingsPeaksTab];
      if (selector === "[data-bottom-tab]") return [inspectorSignalsTab, inspectorMeasurementsTab, inspectorPeaksTab];
      if (selector === "[data-pane-id]") return [];
      return [];
    },
    addEventListener(type, listener) { (listeners[type] || (listeners[type] = [])).push(listener); },
    createElement() { return element(); },
    head: { appendChild() {} }
  };
  Object.defineProperty(settingsContent, "innerHTML", {
    configurable: true,
    get() { return settingsMarkup; },
    set(value) {
      settingsMarkup = String(value);
      const match = /data-signal-metadata='name'[^>]* value='([^']*)'/.exec(settingsMarkup);
      if (!match) return;
      if (!metadataNameNode || document.activeElement !== metadataNameNode) {
        metadataNameNode = element({ dataset:{ signalMetadata:"name" }, value:match[1], selectionStart:match[1].length, selectionEnd:match[1].length });
        metadataNameNode.focus = function () { document.activeElement = metadataNameNode; };
        metadataNameNode.blur = function () { if (document.activeElement === metadataNameNode) document.activeElement = null; };
      } else metadataNameNode.value = match[1];
    }
  });
  const runtime = {
    window, document, Promise, Error, Array, Object, String, Number, Boolean, Math,
    CSS: { escape(value) { return value; } },
    isFinite, setImmediate
  };
  vm.runInNewContext(numericSource, runtime, { filename: "public/js/numeric.js" });
  vm.runInNewContext(source, runtime, { filename: "public/js/app.js" });
  const test = window.__explicitExtrema;
  test.accept(snapshot(options.bindings === undefined ? ["Сигнал 1"] : options.bindings, options.plotType));
  return {
    test, body, peaksHost, settingsContent, footer, apply, status, values, timers, activeCalls, calculateCalls, metadataCalls, document,
    settingsDisplayTab, settingsPeaksTab, inspectorSignalsTab, inspectorMeasurementsTab, inspectorPeaksTab,
    click(button) {
      if (!listeners.click || !listeners.click.length) throw new Error("production click delegation was not registered");
      listeners.click[0]({ target: { closest(selector) { return selector === "button" ? button : null; } } });
    },
    input(node) {
      if (!listeners.input || !listeners.input.length) throw new Error("production input delegation was not registered");
      listeners.input.forEach((listener) => listener({ target: node }));
    },
    metadataName() { return metadataNameNode; }
  };
}

module.exports = async function testExplicitExtremaBehavior(assert) {
  const pendingPost = deferred();
  const pendingResponse = (revision) => peaksResponse({
    state_revision: 3,
    calculation_revision: revision,
    context_key: "display-1::pane-1::peaks::r" + revision,
    isready: false,
    success: false,
    data: { settings: {}, signals: [], rows: [] }
  });
  const readyResponse = peaksResponse({
    state_revision: 3,
    calculation_revision: 41,
    context_key: "display-1::pane-1::peaks::r41",
    isready: true,
    success: true,
    data: {
      settings: { mode: "maxima", number_of_peaks: 5, maximum_cutoff: null, minimum_cutoff: null, minimum_distance_samples: 1, threshold: 0 },
      signals: [{ signal_name: "Сигнал 1", signal_color: "#2563eb", peak_count: 1 }],
      rows: [{ row_number: 1, signal_name: "Сигнал 1", signal_color: "#2563eb", type: "maximum", value: 1, time_s: 0.25, graph_number: 1 }]
    }
  });
  const flow = createHarness({
    activeResponses: [
      peaksResponse(),
      pendingResponse(41), pendingResponse(41), readyResponse
    ],
    calculateResponses: [pendingPost]
  });
  flow.test.model.inspectorPage = "peaks";
  await flow.test.loadPeaks();
  assert(flow.activeCalls.length === 1 && flow.calculateCalls.length === 0, "opening Extrema must make one passive GET and no calculation POST");
  assert(/Рассчитать экстремумы для области (?:Область|Область 1)/.test(flow.peaksHost.innerHTML) && flow.peaksHost.innerHTML.includes("extrema-calculate") && flow.peaksHost.innerHTML.includes("extrema-configure"), "passive first-open must use the persisted area label and show both actions");

  flow.click(element({ dataset: { testid: "extrema-calculate" } }));
  await settle();
  assert(flow.calculateCalls.length === 1, "delegated click on Calculate must issue exactly one explicit POST");
  assert(JSON.stringify(flow.calculateCalls[0]) === JSON.stringify({ state_revision: 3, display_id: "display-1", pane_id: "pane-1" }), "Calculate POST must contain only the current revision, Display and pane identifiers");
  assert(flow.peaksHost.innerHTML.includes("peaks-loader"), "Calculate must replace the start state with a loading state immediately");
  pendingPost.resolve(pendingResponse(41));
  await settle();
  assert(flow.timers.length === 1, "a pending explicit calculation must schedule passive GET polling");
  flow.timers.shift()();
  await settle();
  assert(flow.activeCalls.length === 2 && flow.peaksHost.innerHTML.includes("peaks-loader"), "first pending POST poll must use passive GET and retain loading");
  assert(flow.timers.length === 1, "first pending GET must schedule the next passive GET");
  flow.timers.shift()();
  await settle();
  assert(flow.activeCalls.length === 3 && flow.peaksHost.innerHTML.includes("peaks-loader"), "second pending GET must remain pending and schedule no POST");
  assert(flow.timers.length === 1, "second pending GET must schedule a third passive GET");
  flow.timers.shift()();
  await settle();
  assert(flow.activeCalls.length === 4 && flow.calculateCalls.length === 1, "ready response must follow two pending passive GETs without a duplicate POST");
  assert(flow.test.model.peaksRecords["display-1::pane-1"].context_key === "display-1::pane-1::peaks::r41" && flow.test.model.peaksRecords["display-1::pane-1"].calculation_revision === 41 && flow.test.model.peaksRecords["display-1::pane-1"].revision === 3, "polling must preserve server context, calculation revision, and state revision fields");
  assert(flow.peaksHost.innerHTML.includes("data-testid='peaks-table'") && flow.peaksHost.innerHTML.includes("Сигнал 1"), "ready passive polling must render the authoritative nonempty Extrema table");

  // An unrelated accepted snapshot may advance the global state revision while
  // the same extrema calculation is still pending. Its context/calculation
  // identity is authoritative, so a delayed older-revision GET must continue
  // polling rather than silently leave the lower panel on its loader forever.
  const racePost = deferred();
  const racePending = (revision, ready) => peaksResponse({
    state_revision: revision,
    display_id: "display-1",
    pane_id: "pane-1",
    context_key: "display-1::pane-1::peaks::race-9",
    calculation_revision: 9,
    isready: !!ready,
    success: !!ready,
    data: ready ? {
      settings: {},
      signals: [{ signal_name: "Сигнал 1", signal_color: "#2563eb", peak_count: 1 }],
      rows: [{ row_number: 1, signal_name: "Сигнал 1", signal_color: "#2563eb", type: "maximum", value: 1, time_s: 0.1, graph_number: 1 }]
    } : { settings: {}, signals: [], rows: [] }
  });
  const race = createHarness({
    activeResponses: [peaksResponse(), racePending(3, false), racePending(4, true)],
    calculateResponses: [racePost]
  });
  race.test.model.inspectorPage = "peaks";
  await race.test.loadPeaks();
  race.click(element({ dataset: { testid: "extrema-calculate" } }));
  await settle();
  racePost.resolve(racePending(3, false));
  await settle();
  assert(race.timers.length === 1, "explicit pending POST must begin polling before the unrelated revision race");
  race.test.model.revision = 4;
  race.timers.shift()();
  await settle();
  assert(race.timers.length === 1 && race.test.model.peaksRecords["display-1::pane-1"].pending, "older-revision GET for the same active context/calculation must remain pending and schedule its next poll");
  race.timers.shift()();
  await settle();
  assert(race.peaksHost.innerHTML.includes("data-testid='peaks-table'") && race.test.model.peaksRecords["display-1::pane-1"].calculation_revision === 9, "fresh ready GET after the revision race must render the table for the same calculation");

  // The stale-revision recovery must be narrow: one guarded follow-up timer,
  // never a duplicate timer and never a retry for a mismatched calculation
  // context.
  const mismatchPost = deferred();
  const mismatch = createHarness({
    activeResponses: [peaksResponse(), peaksResponse({ state_revision: 3, display_id: "display-1", pane_id: "pane-1", context_key: "other-context", calculation_revision: 9, isready: false, data: { settings: {}, signals: [], rows: [] } })],
    calculateResponses: [mismatchPost]
  });
  mismatch.test.model.inspectorPage = "peaks";
  await mismatch.test.loadPeaks();
  mismatch.click(element({ dataset: { testid: "extrema-calculate" } }));
  await settle();
  mismatchPost.resolve(racePending(3, false));
  await settle();
  assert(mismatch.timers.length === 1, "the initial same-context pending POST must schedule exactly one poll");
  mismatch.timers.shift()();
  await settle();
  assert(mismatch.timers.length === 0 && mismatch.calculateCalls.length === 1, "context-mismatched polling response must not schedule a recovery timer or duplicate the calculation POST");

  // TASK-0137: the production input delegation and 150ms autosave must keep
  // the actual focused name node alive across applying, accepted and final
  // renders; a character typed during the request queues a newer save.
  const nameFirst = deferred(), nameSecond = deferred();
  const metadata = createHarness({ allowMetadataOutput:true, metadataResponses: [nameFirst, nameSecond] });
  metadata.test.model.settingsPage = "signal";
  metadata.test.renderSettings({ id: "display-1" });
  const nameNode = metadata.metadataName();
  assert(nameNode && nameNode.dataset.signalMetadata === "name", "Signal settings must render an actual name metadata input");
  nameNode.focus();
  const identity = nameNode;
  nameNode.value = "Сигнал 1A"; nameNode.selectionStart = nameNode.selectionEnd = nameNode.value.length;
  metadata.input(nameNode);
  metadata.timers.pop()();
  await settle();
  assert(metadata.metadataCalls.length === 1 && metadata.metadataCalls[0].name === "Сигнал 1A", "first typed name intent must start the debounced metadata save");
  assert(metadata.document.activeElement === identity && metadata.metadataName() === identity && identity.value === "Сигнал 1A" && identity.selectionStart === identity.value.length && identity.selectionEnd === identity.value.length, "applying render must preserve exact focused name node, value and caret");
  nameNode.value = "Сигнал 1AB"; nameNode.selectionStart = nameNode.selectionEnd = nameNode.value.length;
  metadata.input(nameNode);
  nameFirst.resolve(snapshot(["Сигнал 1"]));
  await settle();
  assert(metadata.document.activeElement === identity && metadata.metadataName() === identity && identity.value === "Сигнал 1AB", "accepted render must preserve the exact focused node and newer in-flight value: " + JSON.stringify({ active:metadata.document.activeElement === identity, same:metadata.metadataName() === identity, value:identity.value, draft:metadata.test.model.signalEditor && metadata.test.model.signalEditor.draft && metadata.test.model.signalEditor.draft.name, applying:metadata.test.model.signalEditor && metadata.test.model.signalEditor.applying }));
  metadata.timers.pop()();
  await settle();
  assert(metadata.metadataCalls.length === 2 && metadata.metadataCalls[1].name === "Сигнал 1AB", "newer queued input must issue its own subsequent save after the accepted first intent");
  nameSecond.resolve(snapshot(["Сигнал 1"]));
  await settle();
  assert(metadata.document.activeElement === identity && metadata.metadataName() === identity && identity.value === "Сигнал 1AB" && identity.selectionStart === identity.value.length, "final accepted render must retain focus, exact node identity, value and caret");

  const failedName = deferred();
  const metadataFailure = createHarness({ allowMetadataOutput:true, metadataResponses: [failedName] });
  metadataFailure.test.model.settingsPage = "signal";
  metadataFailure.test.renderSettings({ id: "display-1" });
  const failedNode = metadataFailure.metadataName();
  failedNode.focus(); failedNode.value = "Ошибка"; failedNode.selectionStart = failedNode.selectionEnd = failedNode.value.length;
  metadataFailure.input(failedNode); metadataFailure.timers.pop()(); await settle();
  failedName.reject(new Error("server rejected name")); await settle();
  assert(metadataFailure.document.activeElement !== failedNode && metadataFailure.test.model.signalEditor.applying === false && metadataFailure.test.model.signalEditor.dirty === true, "server failure must release focused-name preservation so rerender is permitted and retry remains dirty");
  assert(metadataFailure.test.model.signalEditor && metadataFailure.test.model.signalEditor.draft.color === "#2563eb" && metadataFailure.test.model.signalEditor.draft.sample_rate_hz === "2048", "name continuity must not alter the established color/sample-rate draft paths");

  const pendingConfigureGet = deferred();
  const configure = createHarness({ activeResponses: [pendingConfigureGet] });
  configure.test.model.inspectorPage = "peaks";
  configure.test.configureActivePeaks();
  assert(configure.test.model.settingsPage === "peaks", "Configure must open the right Extrema settings page");
  assert(configure.test.model.extremaTargetKey === "display-1::pane-1", "Configure must target the active pane for the blue outline");
  assert(configure.values.hidden === false && configure.status.classList.contains("visually-hidden"), "Extrema settings footer must show Values and keep status assistive-only");
  assert(configure.settingsContent.innerHTML.includes("data-testid='extrema-mode-trigger'"), "Configure must render the Extrema mode trigger before any Peaks result or passive GET response exists");
  ["number_of_peaks", "maximum_cutoff", "minimum_distance_samples", "threshold"].forEach((field) => {
    assert(configure.settingsContent.innerHTML.includes(`data-testid='settings-field-${field}'`), `Configure must immediately render the applicable default ${field} field`);
  });
  assert(!configure.settingsContent.innerHTML.includes("settings-field-minimum_cutoff"), "the inactive minimum cutoff must remain hidden for the default maxima mode");
  assert(configure.settingsContent.innerHTML.includes("data-peaks-setting='number_of_peaks' value='5'"), "fresh Extrema settings must visibly use the default count of five before hydration");
  assert(configure.calculateCalls.length === 0, "Configure must not POST an Extrema calculation");

  await settle();
  assert(configure.activeCalls.length === 1 && configure.calculateCalls.length === 0, "Configure may hydrate settings with one passive GET but must not POST an Extrema calculation");

  pendingConfigureGet.resolve(peaksResponse());
  await settle();
  assert(configure.test.model.settingsPage === "peaks" && configure.test.model.extremaTargetKey === "display-1::pane-1", "passive settings hydration must retain the Extrema page and target outline");
  assert(configure.calculateCalls.length === 0, "passive settings hydration must not trigger an Extrema calculation POST");

  const values = createHarness({ activeResponses: [peaksResponse()] });
  values.test.model.settingsPage = "peaks";
  values.test.showActivePeaksValues();
  await settle();
  assert(values.test.model.inspectorPage === "peaks" && values.test.model.extremaTargetKey === "display-1::pane-1", "Values must open the lower Extrema page for the same highlighted pane");

  function currentPeaksRecord(overrides) {
    return Object.assign({
      displayId: "display-1", paneId: "pane-1", context_key: "display-1::pane-1::peaks::r0",
      calculation_revision: 0, revision: 3, calculated: true, pending: false, error: null,
      data: { settings: {}, signals: [], rows: [] }
    }, overrides || {});
  }
  function putCurrentRecord(flow, record) {
    flow.test.model.peaksRecords["display-1::pane-1"] = record;
  }

  const missingValues = createHarness({ calculateResponses: [peaksResponse()] });
  missingValues.test.showActivePeaksValues();
  await settle();
  assert(missingValues.test.model.inspectorPage === "peaks" && missingValues.calculateCalls.length === 1, "Values must switch to Extrema and make exactly one calculation POST when no current result exists");

  const staleValues = createHarness({ calculateResponses: [peaksResponse()] });
  putCurrentRecord(staleValues, currentPeaksRecord({ revision: 2 }));
  staleValues.test.showActivePeaksValues();
  await settle();
  assert(staleValues.test.model.inspectorPage === "peaks" && staleValues.calculateCalls.length === 1, "Values must make exactly one calculation POST for a stale result");

  const failedValues = createHarness({ calculateResponses: [peaksResponse()] });
  putCurrentRecord(failedValues, currentPeaksRecord({ error: "Расчёт не выполнен" }));
  failedValues.test.showActivePeaksValues();
  await settle();
  assert(failedValues.test.model.inspectorPage === "peaks" && failedValues.calculateCalls.length === 1, "Values must make exactly one calculation POST for a failed result");

  const readyEmptyValues = createHarness({});
  putCurrentRecord(readyEmptyValues, currentPeaksRecord());
  readyEmptyValues.test.showActivePeaksValues();
  await settle();
  assert(readyEmptyValues.calculateCalls.length === 0, "Values must not recalculate a current successful empty result");

  const pendingValues = createHarness({});
  putCurrentRecord(pendingValues, currentPeaksRecord({ calculated: false, pending: true, data: null }));
  pendingValues.test.showActivePeaksValues();
  pendingValues.test.showActivePeaksValues();
  await settle();
  assert(pendingValues.calculateCalls.length === 0, "Values must not duplicate a calculation POST while the current pane is pending");

  const empty = createHarness({ bindings: [] });
  empty.test.model.inspectorPage = "peaks";
  await empty.test.loadPeaks();
  empty.test.calculatePeaks();
  await settle();
  assert(empty.activeCalls.length === 0 && empty.calculateCalls.length === 0, "an empty pane must make neither Extrema GET nor POST requests");
  assert(empty.peaksHost.innerHTML.includes("Выберете сигнал для отображения") && !empty.peaksHost.innerHTML.includes("extrema-calculate"), "an empty pane must keep the exact signal guidance without a calculation CTA");

  const spectrogram = createHarness({ plotType:"spectrogram" });
  spectrogram.test.model.settingsPage = "peaks";
  spectrogram.test.model.inspectorPage = "peaks";
  spectrogram.test.model.extremaTargetKey = "display-1::pane-1";
  spectrogram.test.renderContext();
  assert(!spectrogram.test.extremaTabsAvailable(spectrogram.test.model.layout.panes[0]), "Extrema must be unavailable for a Spectrogram pane");
  assert(spectrogram.settingsPeaksTab.hidden && spectrogram.inspectorPeaksTab.hidden, "both right and lower Extrema tabs must be removed from the visible tab strips for Spectrogram");
  assert(!spectrogram.settingsDisplayTab.hidden && !spectrogram.inspectorSignalsTab.hidden && !spectrogram.inspectorMeasurementsTab.hidden, "the still-applicable Display, Signals and Measurements tabs must remain visible");
  assert(spectrogram.test.model.settingsPage === "display" && spectrogram.test.model.inspectorPage === "signals" && spectrogram.test.model.extremaTargetKey === null, "an active Extrema surface must fall back to visible pages and clear its target when the pane becomes unavailable");
};
