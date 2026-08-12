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
    addEventListener() {},
    querySelector() { return null; },
    focus() {}
  }, extra || {});
}

function snapshot(bindings) {
  return {
    state_revision: 3,
    active_display_id: "display-1",
    displays: [{ id: "display-1", peaks_enabled: true, measurement_kinds: [] }],
    signals: [{ name: "Сигнал 1", color: "#2563eb" }],
    layouts: [{
      display_id: "display-1",
      layout: {
        rows: 1,
        columns: 1,
        active_pane_id: "pane-1",
        panes: [{ id: "pane-1", plot_type: "time", signal_bindings: bindings }]
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
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("})(window, document);", "window.__explicitExtrema = { model:model, accept:accept, loadPeaks:loadPeaks, calculatePeaks:calculatePeaks, configureActivePeaks:configureActivePeaks, showActivePeaksValues:showActivePeaksValues, renderPeaksInspector:renderPeaksInspector, renderPeaksApply:renderPeaksApply }; })(window, document);");

  const body = element();
  const peaksHost = element();
  const settingsContent = element();
  const footer = element();
  const apply = element();
  const status = element();
  const values = element({ hidden: true });
  const tabs = element();
  const timers = [];
  const activeCalls = [];
  const calculateCalls = [];
  const activeResponses = (options.activeResponses || []).slice();
  const calculateResponses = (options.calculateResponses || []).slice();
  const nodes = {
    "[data-inspector-content]": body,
    "[data-testid='peaks-table-scroll']": peaksHost,
    "[data-testid='settings-content']": settingsContent,
    "[data-testid='settings-footer']": footer,
    "[data-testid='settings-apply']": apply,
    "[data-settings-status]": status,
    "[data-testid='extrema-values']": values,
    "[data-testid='display-tabs']": tabs,
    "[data-testid='display-tabs-wrap']": element(),
    "[data-testid='settings-tab-peaks']": element(),
    "[data-testid='inspector-tab-peaks']": element()
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
    activeOutput() { throw new Error("Extrema flow must not request graph output"); },
    view() { throw new Error("fixture is already Extrema-enabled"); }
  };
  const window = {
    SignalAnalyserApi: api,
    SignalAnalyserSettings: {
      setRevision() {}, setContext() {}, setView() {}, render() {}, load() { return Promise.resolve(); },
      state() { return { dirty: false, invalid: false, revision: 3 }; }
    },
    addEventListener() {},
    clearTimeout() {},
    setTimeout(callback) { timers.push(callback); return timers.length; },
    requestAnimationFrame(callback) { if (callback) callback(); return 1; }
  };
  const document = {
    querySelector(selector) { return nodes[selector] || null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return element(); },
    head: { appendChild() {} }
  };
  vm.runInNewContext(source, {
    window, document, Promise, Error, Array, Object, String, Number, Boolean, Math,
    CSS: { escape(value) { return value; } },
    isFinite, setImmediate
  }, { filename: "public/js/app.js" });
  const test = window.__explicitExtrema;
  test.accept(snapshot(options.bindings === undefined ? ["Сигнал 1"] : options.bindings));
  return { test, body, peaksHost, settingsContent, footer, apply, status, values, timers, activeCalls, calculateCalls };
}

module.exports = async function testExplicitExtremaBehavior(assert) {
  const pendingPost = deferred();
  const flow = createHarness({
    activeResponses: [
      peaksResponse(),
      peaksResponse({
        state_revision: 4,
        calculation_revision: 0,
        isready: true,
        success: true,
        data: {
          settings: { mode: "maxima", number_of_peaks: 5, maximum_cutoff: null, minimum_cutoff: null, minimum_distance_samples: 1, threshold: 0 },
          signals: [{ signal_name: "Сигнал 1", signal_color: "#2563eb", peak_count: 1 }],
          rows: [{ row_number: 1, signal_name: "Сигнал 1", signal_color: "#2563eb", type: "maximum", value: 1, time_s: 0.25, graph_number: 1 }]
        }
      })
    ],
    calculateResponses: [pendingPost]
  });
  flow.test.model.inspectorPage = "peaks";
  await flow.test.loadPeaks();
  assert(flow.activeCalls.length === 1 && flow.calculateCalls.length === 0, "opening Extrema must make one passive GET and no calculation POST");
  assert(flow.peaksHost.innerHTML.includes("Рассчет экстремумы для области 1") && flow.peaksHost.innerHTML.includes("extrema-calculate") && flow.peaksHost.innerHTML.includes("extrema-configure"), "passive first-open must show the exact area copy and both actions");

  flow.test.calculatePeaks();
  await settle();
  assert(flow.calculateCalls.length === 1, "Calculate must issue exactly one explicit POST");
  assert(JSON.stringify(flow.calculateCalls[0]) === JSON.stringify({ state_revision: 3, display_id: "display-1", pane_id: "pane-1" }), "Calculate POST must contain only the current revision, Display and pane identifiers");
  assert(flow.peaksHost.innerHTML.includes("peaks-loader"), "Calculate must replace the start state with a loading state immediately");
  pendingPost.resolve(peaksResponse());
  await settle();
  assert(flow.timers.length === 1, "a pending explicit calculation must schedule passive GET polling");
  flow.timers.shift()();
  await settle();
  assert(flow.activeCalls.length === 2, "polling after Calculate must use the passive GET endpoint");
  assert(flow.peaksHost.innerHTML.includes("data-testid='peaks-table'") && flow.peaksHost.innerHTML.includes("Сигнал 1"), "ready passive polling must render the authoritative Extrema table");

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

  const empty = createHarness({ bindings: [] });
  empty.test.model.inspectorPage = "peaks";
  await empty.test.loadPeaks();
  empty.test.calculatePeaks();
  await settle();
  assert(empty.activeCalls.length === 0 && empty.calculateCalls.length === 0, "an empty pane must make neither Extrema GET nor POST requests");
  assert(empty.peaksHost.innerHTML.includes("Выберете сигнал для отображения") && !empty.peaksHost.innerHTML.includes("extrema-calculate"), "an empty pane must keep the exact signal guidance without a calculation CTA");
};
