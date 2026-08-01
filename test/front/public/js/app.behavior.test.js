"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const A = "Гармонический сигнал";
const B = "Комплексный ЛЧМ-сигнал";

function flush() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve());
}
function response(status, payload) {
  // Every ordinary Spectrogram fixture publishes the C17 metadata contract.
  // Dedicated malformed-metadata cases bypass this default explicitly.
  [payload && payload.plot_payload && payload.plot_payload.spectrogram, payload && payload.plots && payload.plots.spectrogram].forEach((plot) => {
    if (plot && !Object.prototype.hasOwnProperty.call(plot, "power_limits")) plot.power_limits = { mode:"auto", requested:null, effective:null };
  });
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) };
}

function snapshot(revision, activeId, displayDefinitions, rowSelectedSignal) {
  const definitions = displayDefinitions || [
    { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A, B] },
  ];
  const active = definitions.find((definition) => definition.id === (activeId || definitions[0].id)) || definitions[0];
  const selected = active.analysis_signal !== undefined ? active.analysis_signal : active.selected_signal;
  return {
    state_revision: revision,
    active_display_id: activeId || definitions[0].id,
    row_selected_signal: rowSelectedSignal === undefined ? (selected || A) : rowSelectedSignal,
    analysis_signal: selected,
    displays: definitions,
    signals: [
      { name: A, color: "#2563eb", sample_rate_hz: 10, sample_count: 3, duration_s: 0.2, data_type: "Вещественный" },
      { name: B, color: "#dc2626", sample_rate_hz: 10, sample_count: 3, duration_s: 0.2, data_type: "Комплексный" },
    ],
    plots: { time: { type: "line", x: [0, .1], y: [0, 1], x_label: "Time", y_label: "Amplitude" } },
    plot_payload: {
      time_traces: [
        { name: A, signal: A, x: [0, .1], y: [0, 1] },
        { name: B, signal: B, x: [0, .1], y: [1, 0] },
      ],
    },
    panel: { fields: [] },
    measurements: {
      state_revision: revision,
      signal_name: selected,
      ordinate: selected === B ? "magnitude" : "real",
      units: { value: "1", time: "s" },
      items: [
        { id: "minimum", label: "Минимум", value: selected === B ? 3 : -2, time_s: 0, sample_index: 0 },
        { id: "maximum", label: "Максимум", value: selected === B ? 9 : 5, time_s: 0.2, sample_index: 2 },
        { id: "mean", label: "Среднее", value: selected === B ? 6 : 1, time_s: null, sample_index: null },
      ],
    },
  };
}

function emptySnapshot(revision, rowSelectedSignal) {
  const result = snapshot(revision, "display-1", [
    { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: null, selected_signal: null, visible_signals: [] },
  ], rowSelectedSignal);
  result.plot_payload = { analysis_signal: null, selected_signal: null, visible_signals: [], time_traces: [], spectrum_traces: [], spectrogram: { type: "heatmap", signal: null, x: [], y: [], z: [] }, persistence: { type: "heatmap", signal: null, x: [], y: [], z: [] } };
  result.plots = { time: { type: "line", x: [], y: [], x_label: "Time", y_label: "Amplitude" }, spectrum: { type: "line", x: [], y: [] }, spectrogram: result.plot_payload.spectrogram, persistence: result.plot_payload.persistence };
  result.measurements = { state_revision: revision, signal_name: null, ordinate: null, units: { value: "1", time: "s" }, items: [] };
  result.peaks = { enabled: false, state_revision: revision, display_id: "display-1", signal_name: null, ordinate: null, units: { value: "1", time: "s", width: "samples", prominence: "1" }, items: [] };
  return result;
}

function node(attrs) {
  const attributes = Object.assign({}, attrs || {});
  return {
    hidden: false, disabled: false, textContent: "", innerHTML: "", checked: false, value: "", dataset: {}, listeners: {}, clientWidth: 800, clientHeight: 400,
    classList: { toggle() {}, contains() { return false; } },
    setAttribute(k, v) { attributes[k] = String(v); }, getAttribute(k) { return attributes[k] || null; },
    addEventListener(k, fn) { this.listeners[k] = fn; },
    focus() { this.focused = true; }, closest() { return null; }, matches() { return false; },
  };
}

function environment(fetch, options) {
  const e = {
    root: node(), loading: node(), loadingText: node(), error: node(), errorText: node(), settingsTabs: node(), statisticsControls: node(), statisticsError: node(),
    tabs: node(), host: node(), title: node(), plotSelect: node(), settingsSelect: node(),
    legend: node(), normalize: node(), markers: node(), minInput: node(), maxInput: node(), limitsError: node(), spectrogramSettings: node(), spectrogramOverlap: node(), spectrogramOverlapError: node(), spectrogramLeakage: node(), spectrogramLeakageError: node(), spectrogramFrequencyLimitsControls: node(), spectrogramFrequencyMin: node(), spectrogramFrequencyMax: node(), spectrogramFrequencyLimitsError: node(), spectrogramFrequencyScale: node(), spectrogramFrequencyScaleEffective: node(), spectrogramFrequencyScaleError: node(), spectrogramPowerLimitsControls: node(), spectrogramPowerMin: node(), spectrogramPowerMax: node(), spectrogramPowerLimitsEffective: node(), spectrogramPowerLimitsError: node(), persistenceSettings: node(), persistenceLeakage: node(), persistenceLeakageValue: node(), persistenceLeakageError: node(), spectrumSettings: node(), spectrumScale: node(), spectrumFrequency: node(), spectrumLeakage: node(), spectrumLeakageValue: node(), spectrumError: node(), spectrumFrequencyMin: node(), spectrumFrequencyMax: node(), spectrumFrequencyLimitsError: node(), fields: node(), count: node(), rows: node(), toggleAll: node(), overflowTrigger: node(), overflowMenu: node(), clearDisplayAction: node(), statisticsAction: node(), peaksAction: node(),
    bottomTabs: node(), signals: node(), measurements: node(), measurementContent: node(), retry: node(), displayCount: node(), activeStatus: node(),
    signalBottomTab: node(), measurementsBottomTab: node(), peaksBottomTab: node(), peaksPanel: node(), peaksContent: node(),
  };
  e.displaySettingsTab = node(); e.displaySettingsTab.dataset.settingsTab = "display";
  e.timeSettingsTab = node(); e.timeSettingsTab.dataset.settingsTab = "time";
  e.statisticsSettingsTab = node(); e.statisticsSettingsTab.dataset.settingsTab = "measurements";
  e.settingsTabNodes = [e.displaySettingsTab, e.timeSettingsTab, e.statisticsSettingsTab];
  e.displaySettingsPanel = node(); e.displaySettingsPanel.dataset.settingsPanel = "display";
  e.timeSettingsPanel = node(); e.timeSettingsPanel.dataset.settingsPanel = "time";
  e.measurementsSettingsPanel = node(); e.measurementsSettingsPanel.dataset.settingsPanel = "measurements";
  e.settingsPanels = [e.displaySettingsPanel, e.timeSettingsPanel, e.measurementsSettingsPanel];
  e.settingsTabs.querySelectorAll = (selector) => selector === "[data-settings-tab]" ? e.settingsTabNodes : [];
  e.statisticsOptions = ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"].map((value) => {
    const option = node(); option.value = value; option.type = "checkbox"; return option;
  });
  e.statisticsControls.querySelectorAll = (selector) => selector === "input[type='checkbox']" ? e.statisticsOptions : selector === "input[type='checkbox']:checked" ? e.statisticsOptions.filter((option) => option.checked) : [];
  e.spectrogramFrequencyLimitsControls.dataset.testid = "spectrogram-frequency-limits-controls";
  e.spectrogramFrequencyLimitsControls.contains = (target) => target === e.spectrogramFrequencyMin || target === e.spectrogramFrequencyMax;
  e.spectrogramPowerLimitsControls.dataset.testid = "spectrogram-power-limits-controls";
  e.spectrogramPowerLimitsControls.contains = (target) => target === e.spectrogramPowerMin || target === e.spectrogramPowerMax;
  const selectors = {
    "[data-testid='app-shell']": e.root, "[data-testid='app-loading']": e.loading, "[data-loading-text]": e.loadingText,
    "[data-testid='app-error']": e.error, "[data-error-text]": e.errorText, ".settings-tabs": e.settingsTabs, "[data-testid='statistics-controls']": e.statisticsControls, "[data-testid='statistics-selection-error']": e.statisticsError, "[data-testid='display-tabs']": e.tabs,
    "[data-testid='active-plot-host']": e.host, "[data-testid='display-plot-title']": e.title,
    "[data-testid='plot-type-select']": e.plotSelect, "[data-testid='settings-view-select']": e.settingsSelect,
    "[data-testid='show-legend-checkbox']": e.legend, "[data-testid='normalize-y-checkbox']": e.normalize,
    "[data-testid='show-markers-checkbox']": e.markers, "[data-panel-fields]": e.fields, "[data-signal-count]": e.count,
    "[data-testid='time-min-input']": e.minInput, "[data-testid='time-max-input']": e.maxInput, "[data-testid='time-limits-error']": e.limitsError,
    "[data-testid='spectrum-settings']": e.spectrumSettings, "[data-testid='spectrum-scale-select']": e.spectrumScale,
    "[data-testid='spectrum-frequency-scale-select']": e.spectrumFrequency, "[data-testid='spectrum-leakage-input']": e.spectrumLeakage,
    "[data-testid='spectrum-leakage-value']": e.spectrumLeakageValue, "[data-testid='spectrum-settings-error']": e.spectrumError,
    "[data-testid='spectrum-frequency-min-input']": e.spectrumFrequencyMin, "[data-testid='spectrum-frequency-max-input']": e.spectrumFrequencyMax,
    "[data-testid='spectrum-frequency-limits-error']": e.spectrumFrequencyLimitsError,
    "[data-testid='spectrogram-settings']": e.spectrogramSettings, "[data-testid='spectrogram-overlap-percent-input']": e.spectrogramOverlap, "[data-testid='spectrogram-overlap-percent-error']": e.spectrogramOverlapError,
    "[data-testid='spectrogram-leakage-input']": e.spectrogramLeakage, "[data-testid='spectrogram-leakage-error']": e.spectrogramLeakageError,
    "[data-testid='spectrogram-frequency-limits-controls']": e.spectrogramFrequencyLimitsControls,
    "[data-testid='spectrogram-frequency-min-input']": e.spectrogramFrequencyMin, "[data-testid='spectrogram-frequency-max-input']": e.spectrogramFrequencyMax,
    "[data-testid='spectrogram-frequency-limits-error']": e.spectrogramFrequencyLimitsError,
    "[data-testid='spectrogram-frequency-scale-select']": e.spectrogramFrequencyScale, "[data-testid='spectrogram-frequency-scale-effective']": e.spectrogramFrequencyScaleEffective,
    "[data-testid='spectrogram-frequency-scale-error']": e.spectrogramFrequencyScaleError,
    "[data-testid='spectrogram-power-limits-controls']": e.spectrogramPowerLimitsControls,
    "[data-testid='spectrogram-power-min-input']": e.spectrogramPowerMin, "[data-testid='spectrogram-power-max-input']": e.spectrogramPowerMax,
    "[data-testid='spectrogram-power-limits-effective']": e.spectrogramPowerLimitsEffective,
    "[data-testid='spectrogram-power-limits-error']": e.spectrogramPowerLimitsError,
    "[data-testid='persistence-settings']": e.persistenceSettings, "[data-testid='persistence-leakage-input']": e.persistenceLeakage,
    "[data-testid='persistence-leakage-value']": e.persistenceLeakageValue, "[data-testid='persistence-leakage-error']": e.persistenceLeakageError,
    "[data-signal-rows]": e.rows, "[data-testid='toggle-all-signals']": e.toggleAll,
    "[data-testid='display-overflow-trigger']": e.overflowTrigger, "[data-testid='display-overflow-menu']": e.overflowMenu, "[data-testid='clear-display-action']": e.clearDisplayAction,
    "[data-testid='signal-statistics-action']": e.statisticsAction, "[data-testid='find-peaks-action']": e.peaksAction,
    "[role='tablist'][aria-label='Данные анализатора']": e.bottomTabs, "[data-testid='bottom-panel-signals']": e.signals,
    "[data-testid='measurements-panel']": e.measurements, "[data-measurements-content]": e.measurementContent,
    "[data-testid='peaks-panel']": e.peaksPanel, "[data-peaks-content]": e.peaksContent,
    "[data-retry]": e.retry, "[data-testid='display-count-status']": e.displayCount, "[data-testid='active-display-status']": e.activeStatus,
  };
  const calls = [];
  const plotly = { react(host, data, layout) { calls.push({ plot: true, host, data, layout }); return Promise.resolve(); } };
  const scriptOutcomes = (options && options.scriptOutcomes || []).slice();
  const document = {
    activeElement: null,
    querySelector(selector) { return selectors[selector] || null; },
    querySelectorAll(selector) {
      if (selector === "[data-bottom-tab]") return [e.signalBottomTab, e.measurementsBottomTab, e.peaksBottomTab];
      if (selector === "[data-settings-tab]") return e.settingsTabNodes;
      if (selector === "[data-settings-panel]") return e.settingsPanels;
      return [];
    },
    createElement(tag) {
      if (tag !== "script") return node();
      return { src: "", async: false, onload: null, onerror: null };
    },
    head: { appendChild(script) {
      calls.push({ script: script.src });
      const outcome = scriptOutcomes.shift() || "error";
      if (outcome === "load") { window.Plotly = plotly; script.onload(); } else script.onerror();
    } },
  };
  const window = { fetch(url, options) { calls.push({ url, options: options || {} }); return fetch(url, options || {}); }, addEventListener() {}, setTimeout(callback) { callback(); return 0; }, clearTimeout() {}, Plotly: plotly };
  e.signalBottomTab.dataset.bottomTab = "signals";
  e.measurementsBottomTab.dataset.bottomTab = "measurements";
  e.peaksBottomTab.dataset.bottomTab = "peaks";
  e.peaksBottomTab.hidden = true;
  e.spectrumFrequency.options = [{ value: "linear", disabled: false }, { value: "log", disabled: false }];
  e.spectrogramFrequencyScale.options = [{ value: "linear", disabled: false }, { value: "log", disabled: false }];
  e.signalBottomTab.classList = { toggle(on) { this.on = on; }, contains() { return false; } };
  e.measurementsBottomTab.classList = { toggle(on) { this.on = on; }, contains() { return false; } };
  e.peaksBottomTab.classList = { toggle(on) { this.on = on; }, contains() { return false; } };
  if (options && options.moduleNameOnly) { window.moduleName = plotly; delete window.Plotly; }
  if (options && options.plotlyAbsent) delete window.Plotly;
  return { e, window, document, calls };
}

async function boot(fetch, options) {
  const env = environment(fetch, options);
  const root = path.resolve(__dirname, "../../../..");
  const context = { window: env.window, document: env.document, Promise, console, setTimeout(callback) { callback(); return 0; }, clearTimeout() {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/api.js"), "utf8"), context, { filename: "api.js" });
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/app.js"), "utf8"), context, { filename: "app.js" });
  await flush();
  return env;
}

function tabTarget(id) { return { closest(selector) { return selector === "[data-display-id]" ? { dataset: { displayId: id } } : null; } }; }
function addTarget() { return { closest(selector) { return selector === "[data-testid='add-display']" ? {} : null; } }; }
function closeTarget(id) { return { closest(selector) { return selector === "[data-close-display]" ? { dataset: { closeDisplay: id } } : null; } }; }
function checkboxTarget(name, checked) { return { checked, dataset: { signalVisibility: name }, closest(selector) { return selector === "[data-signal-visibility]" ? this : null; }, matches() { return true; } }; }
function rowTarget(name) { return { closest(selector) { return selector === "[data-signal]" ? { dataset: { signal: name } } : null; }, matches() { return false; } }; }

module.exports = async function testDisplayBehavior(assert) {
  const initial = snapshot(0);
  const requests = [];
  const env = await boot((url, options) => {
    requests.push({ url, options });
    return Promise.resolve(response(200, initial));
  });
  assert(requests.length === 1 && requests[0].url === "./api/state", "startup must request the authoritative state once");
  assert(env.e.tabs.innerHTML.includes("display-tab-display-1"), "initial snapshot must render the active display tab");
  assert(env.e.tabs.innerHTML.includes("add-display"), "display workspace must render the add page control");
  const plots = env.calls.filter((call) => call.plot);
  assert(plots.length === 1, "one Display page must render exactly one graph host");
  assert(JSON.stringify(plots[0].data.map((trace) => trace.name)) === JSON.stringify([A, B]), "the active graph must include every checked signal independently");
  const rowIds = Array.from(env.e.rows.innerHTML.matchAll(/data-testid='signal-checkbox-([^']+)'/g), (match) => match[1]);
  assert(rowIds.length === 2 && new Set(rowIds).size === 2, "Cyrillic signal names must receive collision-free checkbox test IDs");

  const umd = await boot((url) => Promise.resolve(response(200, initial)), { moduleNameOnly: true });
  assert(umd.window.Plotly === umd.window.moduleName, "local Plotly UMD moduleName export must normalize to window.Plotly");
  assert(umd.calls.some((call) => call.plot), "UMD-normalized local Plotly must render the active graph without CDN loading");

  const recovered = await boot((url) => Promise.resolve(response(200, initial)), { plotlyAbsent: true, scriptOutcomes: ["error"] });
  const scriptLoads = recovered.calls.filter((call) => call.script).map((call) => call.script);
  assert(scriptLoads.length === 1, "missing Plotly must attempt exactly one local load without a CDN fallback");
  assert(scriptLoads[0].includes("vendor/plotly-cartesian-3.1.0.min.js"), "the first Plotly recovery request must target the bundled local artifact");
  assert(!scriptLoads.some((url) => /https?:\/\/|cdn\./i.test(url)), "Plotly recovery must never request a CDN");
  assert(recovered.e.host.dataset.plotReady === "false" && recovered.e.host.innerHTML.includes("plot-error-state"), "a missing local Plotly artifact must expose the stable error state");

  const displayCalls = [];
  const created = snapshot(1, "display-2", [
    { id: "display-1", name: "Display 1", active_plot: "spectrum", selected_signal: B, visible_signals: [B] },
    { id: "display-2", name: "Display 2", active_plot: "time", selected_signal: A, visible_signals: [A, B] },
  ]);
  const selected = snapshot(2, "display-1", created.displays);
  const lifecycle = await boot((url, options) => {
    displayCalls.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    const payload = JSON.parse(options.body);
    return Promise.resolve(response(200, payload.operation === "create" ? created : selected));
  });
  lifecycle.e.tabs.listeners.click({ target: addTarget() });
  await flush();
  assert(displayCalls[1].url === "./api/displays", "add Display must use POST ./api/displays");
  assert(JSON.stringify(JSON.parse(displayCalls[1].options.body)) === JSON.stringify({ state_revision: 0, operation: "create" }), "add Display must send current revision and create operation only");
  assert(lifecycle.e.tabs.innerHTML.includes("display-tab-display-2"), "created display must be selected and rendered");
  assert(lifecycle.e.measurementContent.innerHTML.includes(A), "the authoritative measurements in Display 2 must belong to Display 2's selected signal");
  assert(lifecycle.e.measurementContent.innerHTML.indexOf("measurement-row-minimum") < lifecycle.e.measurementContent.innerHTML.indexOf("measurement-row-maximum") && lifecycle.e.measurementContent.innerHTML.indexOf("measurement-row-maximum") < lifecycle.e.measurementContent.innerHTML.indexOf("measurement-row-mean"), "measurement rows must preserve the authoritative minimum/maximum/mean order");
  lifecycle.e.bottomTabs.listeners.click({ target: { closest(selector) { return selector === "[data-bottom-tab]" ? lifecycle.e.measurementsBottomTab : null; } } });
  assert(displayCalls.length === 2, "opening Measurements remains a local tab operation without a display API mutation");
  assert(lifecycle.e.measurements.hidden === false, "the Measurements panel must become visible locally");
  lifecycle.e.tabs.listeners.click({ target: tabTarget("display-1") });
  await flush();
  assert(JSON.stringify(JSON.parse(displayCalls[2].options.body)) === JSON.stringify({ state_revision: 1, operation: "select", display_id: "display-1" }), "select Display must use confirmed revision and display id");
  assert(lifecycle.e.title.textContent === "Spectrum", "selecting a page must restore its graph type");
  assert(lifecycle.e.measurementContent.innerHTML.includes(B), "switching Display must render the server-authoritative measurements for the newly active selected signal");
  assert(lifecycle.e.measurements.hidden === false && lifecycle.e.signals.hidden === true, "a Display switch must preserve the local Measurements tab while replacing only its authoritative content");
  lifecycle.e.tabs.listeners.click({ target: closeTarget("display-1") });
  await flush();
  assert(JSON.parse(displayCalls[3].options.body).operation === "close", "close control must request the close operation");

  let resolveFirst;
  const queued = [];
  const queue = await boot((url, options) => {
    queued.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    return new Promise((resolve) => { resolveFirst = resolve; });
  });
  queue.e.tabs.listeners.click({ target: addTarget() });
  await flush();
  queue.e.tabs.listeners.click({ target: addTarget() });
  await flush();
  assert(queued.filter((call) => call.url === "./api/displays").length === 1, "only the first display request may be in flight");
  resolveFirst(response(200, created));
  await flush();
  assert(queued.filter((call) => call.url === "./api/displays").length === 2, "a second user action during a request must be serialized after the confirmed revision");
  assert(JSON.parse(queued[2].options.body).state_revision === 1, "queued Display mutation must use the confirmed revision");

  let viewAttempt = 0;
  const stale = [];
  const staleReplay = await boot((url, options) => {
    stale.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    viewAttempt += 1;
    if (viewAttempt === 1) return Promise.resolve(response(409, { current: snapshot(7) }));
    return Promise.resolve(response(200, snapshot(8, "display-1", [{ id: "display-1", name: "Display 1", active_plot: "spectrum", selected_signal: A, visible_signals: [A, B] }])));
  });
  staleReplay.e.plotSelect.value = "spectrum";
  staleReplay.e.plotSelect.listeners.change({ target: staleReplay.e.plotSelect });
  await flush();
  const staleViews = stale.filter((call) => call.url === "./api/view");
  assert(staleViews.length === 2, "a stale view mutation must replay exactly once from payload.current");
  assert(JSON.parse(staleViews[1].options.body).state_revision === 7, "stale replay must use the authoritative current revision");

  let displayAttempt = 0;
  const staleDisplay = [];
  const displayReplay = await boot((url, options) => {
    staleDisplay.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    displayAttempt += 1;
    if (displayAttempt === 1) return Promise.resolve(response(409, { current: snapshot(4) }));
    return Promise.resolve(response(200, snapshot(5, "display-2", [
      { id: "display-1", name: "Display 1", active_plot: "time", selected_signal: A, visible_signals: [A, B] },
      { id: "display-2", name: "Display 2", active_plot: "time", selected_signal: A, visible_signals: [A, B] },
    ])));
  });
  displayReplay.e.tabs.listeners.click({ target: addTarget() });
  await flush();
  const staleDisplays = staleDisplay.filter((call) => call.url === "./api/displays");
  assert(staleDisplays.length === 2, "a stale Display lifecycle mutation must replay exactly once");
  assert(JSON.parse(staleDisplays[1].options.body).state_revision === 4, "Display replay must use the authoritative current revision");

  const visibility = [];
  const selection = await boot((url, options) => {
    visibility.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    return Promise.resolve(response(200, snapshot(1, "display-1", [{ id: "display-1", name: "Display 1", active_plot: "time", selected_signal: B, visible_signals: [B] }])));
  });
  selection.e.rows.listeners.change({ target: checkboxTarget(A, false) });
  await flush();
  const view = visibility.find((call) => call.url === "./api/view");
  assert(view, "per-display checkbox must update the active display through /api/view");
  assert(JSON.stringify(JSON.parse(view.options.body)) === JSON.stringify({ state_revision: 0, active_plot: "time", row_selected_signal: A, analysis_signal: B, visible_signals: [B], time_limits: null, measurement_kinds: ["minimum", "maximum", "mean"], spectrum_settings: { scale: "db", frequency_scale: "linear", leakage: .5, frequency_limits: null }, spectrogram_settings: { overlap_percent: 50, leakage: .5, frequency_limits: null, frequency_scale:"linear", power_limits:null }, persistence_settings:{leakage:.5}, peaks_enabled: false }), "hiding the analysis source must retain complete canonical Spectrogram settings and disable Peaks");

  const localTabRequests = [];
  const localTabs = await boot((url, options) => {
    localTabRequests.push({ url, options });
    return Promise.resolve(response(200, initial));
  });
  localTabs.e.bottomTabs.listeners.click({ target: { closest(selector) { return selector === "[data-bottom-tab]" ? localTabs.e.measurementsBottomTab : null; } } });
  assert(localTabRequests.length === 1 && localTabRequests[0].url === "./api/state", "opening Measurements must not make a backend request");
  assert(localTabs.e.signals.hidden === true && localTabs.e.measurements.hidden === false, "Measurements tab must swap only local panels");
  assert(localTabs.e.measurementsBottomTab.getAttribute("aria-selected") === "true", "Measurements tab must expose its local selected state accessibly");

  const statisticsRequests = [];
  const statistics = await boot((url, options) => {
    statisticsRequests.push({ url, options });
    return Promise.resolve(response(200, initial));
  });
  statistics.e.statisticsAction.listeners.click();
  assert(statisticsRequests.length === 1 && statisticsRequests[0].url === "./api/state", "Signal statistics must open Measurements without an API request or revision mutation");
  assert(statistics.e.signals.hidden === true && statistics.e.measurements.hidden === false && statistics.e.peaksPanel.hidden === true, "Signal statistics must locally show Measurements and hide Signals/Peaks panels");
  assert(statistics.e.measurementsBottomTab.getAttribute("aria-selected") === "true" && statistics.e.measurementsBottomTab.getAttribute("tabindex") === "0", "Signal statistics must make Measurements the accessible roving tab");
  assert(statistics.e.measurementsBottomTab.focused === true, "Signal statistics must transfer focus to Measurements when the tab supports focus");
  assert(statistics.e.displaySettingsPanel.hidden === true && statistics.e.timeSettingsPanel.hidden === true && statistics.e.measurementsSettingsPanel.hidden === false, "Signal statistics must open the complete Measurements settings tabpanel, hiding the Display and Time sections");
  assert(statistics.e.statisticsSettingsTab.getAttribute("aria-selected") === "true" && statistics.e.statisticsSettingsTab.getAttribute("tabindex") === "0", "Measurements settings tab must become the accessible roving-tab target");
  let settingsPrevented = false;
  statistics.e.settingsTabs.listeners.keydown({ key: "ArrowLeft", target: { closest(selector) { return selector === "[data-settings-tab]" ? statistics.e.statisticsSettingsTab : null; } }, preventDefault() { settingsPrevented = true; } });
  assert(settingsPrevented && statistics.e.timeSettingsPanel.hidden === false && statistics.e.measurementsSettingsPanel.hidden === true && statistics.e.timeSettingsTab.focused === true, "settings ArrowLeft must move roving focus and reveal exactly the Time section");

  const statsDefinition = { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A, B], measurement_kinds: ["minimum", "maximum", "mean"] };
  const statsInitial = snapshot(0, "display-1", [statsDefinition], A);
  const statsCommittedDefinition = Object.assign({}, statsDefinition, { measurement_kinds: ["minimum", "maximum", "mean", "median"] });
  const statsCommitted = snapshot(1, "display-1", [statsCommittedDefinition], A);
  statsCommitted.measurements.items = statsCommitted.measurements.items.concat([{ id: "median", label: "Медиана", value: 1, time_s: null, sample_index: null }]);
  const statsSelectionRequests = [];
  const statsSelection = await boot((url, options) => {
    statsSelectionRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? statsInitial : statsCommitted));
  });
  assert(statsSelection.e.statisticsOptions.slice(0, 3).every((option) => option.checked) && statsSelection.e.statisticsOptions.slice(3).every((option) => !option.checked), "Measurements settings must render default checked kinds in canonical order");
  const medianOption = statsSelection.e.statisticsOptions[3];
  medianOption.checked = true;
  statsSelection.e.statisticsControls.listeners.change({ target: { closest(selector) { return selector === "input[type='checkbox']" ? medianOption : null; } } });
  await flush();
  const statsView = statsSelectionRequests.find((call) => call.url === "./api/view");
  assert(statsView && JSON.stringify(JSON.parse(statsView.options.body).measurement_kinds) === JSON.stringify(["minimum", "maximum", "mean", "median"]), "a Statistics checkbox must issue one canonical full measurement_kinds view request");
  assert(statsSelection.e.statisticsOptions[3].checked === true, "authoritative Statistics response must retain the newly selected checkbox");

  const rejectedStatistics = await boot((url) => {
    if (url === "./api/state") return Promise.resolve(response(200, statsInitial));
    return Promise.resolve(response(422, { ok: false, code: "invalid_request", error: { code: "invalid_request", message: "Некорректный запрос отображения", fields: { measurement_kinds: "Недопустимый набор показателей" } } }));
  });
  const rejectedMedian = rejectedStatistics.e.statisticsOptions[3];
  rejectedMedian.checked = true;
  rejectedStatistics.e.statisticsControls.listeners.change({ target: { closest(selector) { return selector === "input[type='checkbox']" ? rejectedMedian : null; } } });
  await flush();
  assert(rejectedStatistics.e.statisticsOptions.slice(0, 3).every((option) => option.checked) && rejectedStatistics.e.statisticsOptions[3].checked === false && rejectedStatistics.e.statisticsError.hidden === false && rejectedStatistics.e.statisticsError.textContent === "Недопустимый набор показателей", "nested payload.error.fields.measurement_kinds must roll back authoritative checks and render its exact inline error");

  const rowRequests = [];
  const memberRow = await boot((url, options) => {
    rowRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? initial : snapshot(1, "display-1", undefined, B)));
  });
  memberRow.e.rows.listeners.click({ target: rowTarget(B) });
  await flush();
  assert(JSON.stringify(JSON.parse(rowRequests.find((call) => call.url === "./api/view").options.body)) === JSON.stringify({ state_revision: 0, active_plot: "time", row_selected_signal: B, analysis_signal: B, visible_signals: [A, B], time_limits: null, measurement_kinds: ["minimum", "maximum", "mean"], spectrum_settings: { scale: "db", frequency_scale: "linear", leakage: .5, frequency_limits: null }, spectrogram_settings: { overlap_percent: 50, leakage: .5, frequency_limits: null, frequency_scale:"linear", power_limits:null }, persistence_settings:{leakage:.5}, peaks_enabled: false }), "ordinary row mutations must retain complete canonical settings");
  assert(memberRow.e.rows.innerHTML.includes("signal-row-") && memberRow.e.rows.innerHTML.includes(B), "the selected member row must be rendered from authoritative row and analysis state");

  const uncheckedRequests = [];
  const singleMember = snapshot(0, "display-1", [{ id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A] }], A);
  const uncheckedRow = await boot((url, options) => {
    uncheckedRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? singleMember : snapshot(1, "display-1", [{ id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A] }], B)));
  });
  uncheckedRow.e.rows.listeners.click({ target: rowTarget(B) });
  await flush();
  assert(JSON.stringify(JSON.parse(uncheckedRequests.find((call) => call.url === "./api/view").options.body)) === JSON.stringify({ state_revision: 0, active_plot: "time", row_selected_signal: B, analysis_signal: A, visible_signals: [A], time_limits: null, measurement_kinds: ["minimum", "maximum", "mean"], spectrum_settings: { scale: "db", frequency_scale: "linear", leakage: .5, frequency_limits: null }, spectrogram_settings: { overlap_percent: 50, leakage: .5, frequency_limits: null, frequency_scale:"linear", power_limits:null }, persistence_settings:{leakage:.5}, peaks_enabled: false }), "membership mutations must retain complete canonical settings");

  const clearRequests = [];
  const clear = await boot((url, options) => {
    clearRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? initial : emptySnapshot(1, A)));
  });
  const clearHost = clear.e.host;
  clearHost.data = [{ name: A }];
  clearHost._fullData = [{ name: A }];
  clearHost.calcdata = [[{ x: 0, y: 1 }]];
  clear.e.overflowTrigger.listeners.click();
  assert(clearRequests.length === 1 && clear.e.overflowMenu.hidden === false && clear.e.overflowTrigger.getAttribute("aria-expanded") === "true", "Display overflow must open Clear Display locally and accessibly without a request");
  clear.e.clearDisplayAction.listeners.click();
  await flush();
  assert(JSON.stringify(JSON.parse(clearRequests.find((call) => call.url === "./api/view").options.body)) === JSON.stringify({ state_revision: 0, active_plot: "time", row_selected_signal: A, analysis_signal: null, visible_signals: [], time_limits: null, measurement_kinds: ["minimum", "maximum", "mean"], spectrum_settings: { scale: "db", frequency_scale: "linear", leakage: .5, frequency_limits: null }, spectrogram_settings: { overlap_percent: 50, leakage: .5, frequency_limits: null, frequency_scale:"linear", power_limits:null }, persistence_settings:{leakage:.5}, peaks_enabled: false }), "Clear Display must preserve complete canonical settings");
  assert(clear.e.overflowMenu.hidden === true && clear.e.overflowTrigger.getAttribute("aria-expanded") === "false", "Clear Display must close its menu after activation");
  assert(clear.e.host === clearHost && clear.e.host.innerHTML.includes("empty-display-plot-state") && clear.e.host.dataset.plotReady === "false", "an empty authoritative page must retain its one graph host while clearing stale rendering");
  assert((!clear.e.host.data || clear.e.host.data.length === 0) && (!clear.e.host._fullData || clear.e.host._fullData.length === 0) && (!clear.e.host.calcdata || clear.e.host.calcdata.length === 0), "an empty Display must purge stale Plotly data from the persistent graph host");
  assert(clear.e.measurementContent.innerHTML.includes("empty-display-measurements-state") && clear.e.peaksContent.innerHTML.includes("empty-display-peaks-state"), "an empty authoritative page must render typed empty analysis panels locally");

  const timeDefinition = { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: B, selected_signal: B, visible_signals: [A, B], peaks_enabled: true };
  const timePresentation = snapshot(0, "display-1", [timeDefinition], B);
  timePresentation.plot_payload.time_traces = [
    { name: A, signal: A, x: [0, .1, .2], y: [-2, 0, 2] },
    { name: B, signal: B, x: [0, .1, .2], y: [5, 5, 5] },
  ];
  timePresentation.peaks = { enabled: true, state_revision: 0, display_id: "display-1", signal_name: B, ordinate: "magnitude", units: { value: "1", time: "s", width: "samples", prominence: "1" }, items: [{ id: "peak-source", value: 5, time_s: .1, sample_index: 1, width_samples: 1, prominence: 2 }] };
  const spectrumDefinition = Object.assign({}, timeDefinition, { active_plot: "spectrum" });
  const spectrumPresentation = snapshot(1, "display-1", [spectrumDefinition], B);
  spectrumPresentation.plot_payload = Object.assign({}, timePresentation.plot_payload, { spectrum_traces: timePresentation.plot_payload.time_traces });
  spectrumPresentation.peaks = Object.assign({}, timePresentation.peaks, { state_revision: 1, enabled: false });
  const presentationRequests = [];
  const presentation = await boot((url, options) => {
    presentationRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? timePresentation : spectrumPresentation));
  });
  const presentationHost = presentation.e.host;
  const rawTraceArrays = timePresentation.plot_payload.time_traces.map((trace) => trace.y.slice());
  presentation.e.normalize.checked = true;
  presentation.e.normalize.listeners.change({ target: presentation.e.normalize });
  await flush();
  const normalizedPlot = presentation.calls.filter((call) => call.plot).at(-1);
  const normalizedOrdinary = normalizedPlot.data.filter((trace) => !trace.meta);
  const normalizedPeak = normalizedPlot.data.find((trace) => trace.meta && trace.meta.test_id === "peak-marker-trace");
  assert(presentationRequests.length === 1 && presentation.e.host === presentationHost, "Time presentation preferences must be local, revision-free and retain the single Plotly host");
  assert(JSON.stringify(normalizedOrdinary.map((trace) => trace.y)) === JSON.stringify([[0, .5, 1], [0, 0, 0]]), "Normalize Y must independently map every finite Time trace to exact [0,1] and map a constant trace to zero");
  assert(JSON.stringify(normalizedPeak.y) === JSON.stringify([0]) && normalizedPeak.meta.signal_name === B, "Peaks markers must normalize against the analysis-source extrema only");
  assert(JSON.stringify(timePresentation.plot_payload.time_traces.map((trace) => trace.y)) === JSON.stringify(rawTraceArrays), "Time normalization must not mutate authoritative source arrays");
  presentation.e.markers.checked = true;
  presentation.e.markers.listeners.change({ target: presentation.e.markers });
  await flush();
  const markedPlot = presentation.calls.filter((call) => call.plot).at(-1);
  assert(markedPlot.data.filter((trace) => !trace.meta).every((trace) => trace.mode === "lines+markers") && markedPlot.data.find((trace) => trace.meta && trace.meta.test_id === "peak-marker-trace").mode === "markers", "Show Markers must affect ordinary Time traces only and preserve the Peaks marker mode");
  assert(presentationRequests.length === 1, "both Time presentation toggles must make zero API requests");
  presentation.e.settingsSelect.value = "spectrum";
  presentation.e.settingsSelect.listeners.change({ target: presentation.e.settingsSelect });
  await flush();
  assert(presentation.e.normalize.disabled === true && presentation.e.markers.disabled === true && presentation.e.normalize.checked === true && presentation.e.markers.checked === true, "non-Time plots must disable presentation controls without discarding per-Display preferences");
  const spectrumPlot = presentation.calls.filter((call) => call.plot).at(-1);
  assert(spectrumPlot.layout.yaxis.autorange === undefined && spectrumPlot.data.filter((trace) => !trace.meta).every((trace) => trace.mode !== "lines+markers"), "Spectrum must preserve disabled Time preferences without Normalize-specific layout or ordinary markers");

  const peakAffineDefinition = { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A, B], peaks_enabled: true };
  const peakAffine = snapshot(0, "display-1", [peakAffineDefinition], A);
  peakAffine.plot_payload.time_traces = [
    { name: A, signal: A, x: [0, .1, .2], y: [-2, 0, 2] },
    { name: B, signal: B, x: [0, .1, .2], y: [10, 20, 30] },
  ];
  peakAffine.peaks = { enabled: true, state_revision: 0, display_id: "display-1", signal_name: A, ordinate: "real", units: { value: "1", time: "s", width: "samples", prominence: "1" }, items: [{ id: "peak-outside", value: 4, time_s: .1, sample_index: 1, width_samples: 1, prominence: 2 }] };
  const affine = await boot((url) => Promise.resolve(response(200, peakAffine)));
  affine.e.normalize.checked = true;
  affine.e.normalize.listeners.change({ target: affine.e.normalize });
  await flush();
  const affinePeak = affine.calls.filter((call) => call.plot).at(-1).data.find((trace) => trace.meta && trace.meta.test_id === "peak-marker-trace");
  assert(JSON.stringify(affinePeak.x) === JSON.stringify([.1]) && JSON.stringify(affinePeak.y) === JSON.stringify([1.5]) && affinePeak.meta.normalization === "analysis-source-affine-unclipped", "raw backend Peaks values outside source extrema must use the same affine source transform without clipping");

  const invalidDefinition = { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A, B] };
  const invalidPresentation = snapshot(0, "display-1", [invalidDefinition], A);
  invalidPresentation.plot_payload.time_traces = [
    { name: A, signal: A, x: [0, .1], y: [0, NaN] },
    { name: B, signal: B, x: [0, .1], y: [1, 2] },
  ];
  const invalid = await boot((url) => Promise.resolve(response(200, invalidPresentation)));
  const invalidHost = invalid.e.host;
  assert(invalid.calls.filter((call) => call.plot).length === 0 && invalidHost.innerHTML.includes("plot-invalid-data-state") && invalidHost.dataset.plotReady === "false", "a visible Time trace with nonfinite data must skip Plotly.react and render the stable invalid-data state");
  invalidHost.data = [{ stale: true }];
  invalidHost._fullData = [{ stale: true }];
  invalidHost.calcdata = [[{ stale: true }]];
  invalid.e.normalize.checked = true;
  invalid.e.normalize.listeners.change({ target: invalid.e.normalize });
  await flush();
  assert(invalid.e.host === invalidHost && invalid.calls.filter((call) => call.plot).length === 0 && (!invalidHost.data || invalidHost.data.length === 0) && (!invalidHost._fullData || invalidHost._fullData.length === 0) && (!invalidHost.calcdata || invalidHost.calcdata.length === 0), "invalid Time data must purge the persistent host and remain Plotly-free with Normalize enabled");

  const emptyPresentation = await boot((url) => Promise.resolve(response(200, emptySnapshot(0, A))));
  assert(emptyPresentation.e.normalize.disabled === true && emptyPresentation.e.markers.disabled === true, "an empty Display must disable Time-only presentation controls");

  const displayPreferenceRequests = [];
  const preferenceDisplayOne = { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A, B] };
  const preferenceDisplayTwo = { id: "display-2", name: "Display 2", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A, B] };
  const preferenceCreated = snapshot(1, "display-2", [preferenceDisplayOne, preferenceDisplayTwo], A);
  const preferenceRestored = snapshot(2, "display-1", [preferenceDisplayOne, preferenceDisplayTwo], A);
  const displayPreferences = await boot((url, options) => {
    displayPreferenceRequests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    return Promise.resolve(response(200, JSON.parse(options.body).operation === "create" ? preferenceCreated : preferenceRestored));
  });
  displayPreferences.e.normalize.checked = true;
  displayPreferences.e.normalize.listeners.change({ target: displayPreferences.e.normalize });
  displayPreferences.e.markers.checked = true;
  displayPreferences.e.markers.listeners.change({ target: displayPreferences.e.markers });
  await flush();
  assert(displayPreferenceRequests.length === 1, "persisting local Time preferences must not mutate the API revision");
  displayPreferences.e.tabs.listeners.click({ target: addTarget() });
  await flush();
  assert(displayPreferences.e.normalize.checked === false && displayPreferences.e.markers.checked === false && displayPreferences.e.normalize.disabled === false && displayPreferences.e.markers.disabled === false, "a newly created Time Display must start with presentation preferences off and enabled");
  displayPreferences.e.tabs.listeners.click({ target: tabTarget("display-1") });
  await flush();
  assert(displayPreferences.e.normalize.checked === true && displayPreferences.e.markers.checked === true, "switching back must restore per-Display Time presentation preferences");

  const limitsDefinition = { id: "display-1", name: "Display 1", active_plot: "time", analysis_signal: A, selected_signal: A, visible_signals: [A, B], time_limits: { min_s: 0, max_s: .2, units: "s" } };
  const limitsInitial = snapshot(0, "display-1", [limitsDefinition], A);
  limitsInitial.plot_payload.time_traces = [{ name: A, signal: A, x: [0, .1, .2], y: [-2, 1, 5] }, { name: B, signal: B, x: [0, .1, .2], y: [2, 3, 4] }];
  const limitsCommittedDefinition = Object.assign({}, limitsDefinition, { time_limits: { min_s: .1, max_s: .2, units: "s" } });
  const limitsCommitted = snapshot(1, "display-1", [limitsCommittedDefinition], A);
  limitsCommitted.plot_payload.time_traces = limitsInitial.plot_payload.time_traces;
  const limitsRequests = [];
  const limits = await boot((url, options) => {
    limitsRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? limitsInitial : limitsCommitted));
  });
  assert(limits.e.minInput.value === "0" && limits.e.maxInput.value === "0.2" && limits.e.minInput.disabled === false && limits.e.maxInput.disabled === false, "a nonempty Time Display must render authoritative seconds limits exactly");
  limits.e.minInput.value = ".1";
  limits.e.minInput.listeners.input({ target: limits.e.minInput });
  assert(limitsRequests.length === 1, "typing Time Limits must not issue a request");
  limits.e.minInput.listeners.keydown({ key: "Enter", preventDefault() {} });
  await flush();
  assert(limitsRequests.filter((call) => call.url === "./api/view").length === 1 && JSON.stringify(JSON.parse(limitsRequests[1].options.body).time_limits) === JSON.stringify({ min_s: .1, max_s: .2, units: "s" }), "Enter must commit one canonical serialized Time Limits request");
  const limitsPlot = limits.calls.filter((call) => call.plot).at(-1);
  assert(JSON.stringify(limitsPlot.layout.xaxis.range) === JSON.stringify([.1, .2]) && JSON.stringify(limitsInitial.plot_payload.time_traces[0].y) === JSON.stringify([-2, 1, 5]), "authoritative Time Limits must set Plotly xaxis.range without slicing or mutating backend traces");

  const invalidLimitsRequests = [];
  const invalidLimits = await boot((url, options) => {
    invalidLimitsRequests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, limitsInitial));
    return Promise.resolve(response(422, {
      ok: false, code: "invalid_request",
      error: { code: "invalid_request", message: "Некорректный запрос отображения", fields: { time_limits: "Максимальная Time Limit превышает длительность analysis source" } },
    }));
  });
  invalidLimits.e.minInput.value = ".1";
  invalidLimits.e.maxInput.value = "9";
  invalidLimits.e.minInput.listeners.input({ target: invalidLimits.e.minInput });
  invalidLimits.e.maxInput.listeners.input({ target: invalidLimits.e.maxInput });
  invalidLimits.e.maxInput.listeners.keydown({ key: "Enter", preventDefault() {} });
  await flush();
  assert(invalidLimitsRequests.filter((call) => call.url === "./api/view").length === 1, "a rejected Time Limits edit must still issue exactly one committed view request");
  assert(invalidLimits.e.minInput.value === "0" && invalidLimits.e.maxInput.value === "0.2" && invalidLimits.e.limitsError.hidden === false && invalidLimits.e.limitsError.textContent === "Максимальная Time Limit превышает длительность analysis source", "nested payload.error.fields.time_limits must restore authoritative values and render the exact inline error");

  const keyboardTabs = await boot((url) => Promise.resolve(response(200, initial)));
  function key(tab, key) {
    let prevented = false;
    keyboardTabs.e.bottomTabs.listeners.keydown({ key, target: { closest(selector) { return selector === "[data-bottom-tab]" ? tab : null; } }, preventDefault() { prevented = true; } });
    return prevented;
  }
  assert(key(keyboardTabs.e.signalBottomTab, "ArrowRight"), "supported bottom-tab key navigation must prevent browser default");
  assert(keyboardTabs.e.measurementsBottomTab.getAttribute("aria-selected") === "true" && keyboardTabs.e.measurementsBottomTab.getAttribute("tabindex") === "0" && keyboardTabs.e.measurementsBottomTab.focused === true, "ArrowRight must select, focus and tab-enable Measurements");
  assert(keyboardTabs.e.signals.hidden === true && keyboardTabs.e.measurements.hidden === false, "ArrowRight must switch labelled tabpanels locally");
  assert(key(keyboardTabs.e.measurementsBottomTab, "ArrowRight"), "ArrowRight must wrap from the last tab");
  assert(keyboardTabs.e.signalBottomTab.getAttribute("aria-selected") === "true" && keyboardTabs.e.signalBottomTab.getAttribute("tabindex") === "0", "wrapped ArrowRight must restore Signals as the roving tab");
  assert(key(keyboardTabs.e.signalBottomTab, "End"), "End must be handled by the tablist");
  assert(keyboardTabs.e.measurementsBottomTab.getAttribute("aria-selected") === "true", "End must select the final tab");
  assert(key(keyboardTabs.e.measurementsBottomTab, "Home"), "Home must be handled by the tablist");
  assert(keyboardTabs.e.signalBottomTab.getAttribute("aria-selected") === "true", "Home must select the first tab");

  const peaksEnabled = snapshot(1);
  peaksEnabled.displays[0].peaks_enabled = true;
  peaksEnabled.peaks = { enabled: true, state_revision: 1, display_id: "display-1", signal_name: A, ordinate: "real", units: { value: "1", time: "s", width: "samples", prominence: "1" }, items: [{ id: "peak-2", value: 5, time_s: .2, sample_index: 2, width_samples: 1.5, prominence: 4 }] };
  const peakRequests = [];
  const peaks = await boot((url, options) => {
    peakRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? initial : peaksEnabled));
  });
  peaks.e.peaksAction.listeners.click();
  await flush();
  const peakView = peakRequests.find((call) => call.url === "./api/view");
  assert(peakView && JSON.stringify(JSON.parse(peakView.options.body)) === JSON.stringify({ state_revision: 0, active_plot: "time", row_selected_signal: A, analysis_signal: A, visible_signals: [A, B], time_limits: null, measurement_kinds: ["minimum", "maximum", "mean"], spectrum_settings: { scale: "db", frequency_scale: "linear", leakage: .5, frequency_limits: null }, spectrogram_settings: { overlap_percent: 50, leakage: .5, frequency_limits: null, frequency_scale:"linear", power_limits:null }, persistence_settings:{leakage:.5}, peaks_enabled: true }), "Find Peaks must retain complete canonical settings");
  assert(peaks.e.peaksAction.getAttribute("aria-pressed") === "true" && peaks.e.peaksBottomTab.hidden === false && peaks.e.peaksPanel.hidden === false, "an enabled authoritative Peaks snapshot must press the action and open the local Peaks tab/panel");
  assert(peaks.e.peaksContent.innerHTML.includes("peak-row-peak-2") && peaks.e.peaksContent.innerHTML.includes("data-sample-index='2'"), "the Peaks table must render backend item fields without a client-side peak calculation");
  const marker = peaks.calls.filter((call) => call.plot).at(-1).data.find((trace) => trace.meta && trace.meta.test_id === "peak-marker-trace");
  assert(marker && JSON.stringify(marker.x) === JSON.stringify([.2]) && JSON.stringify(marker.y) === JSON.stringify([5]) && marker.meta.display_id === "display-1", "marker traces must use only authoritative backend peak items and scope");

  const c9SpectrumDefinition = { id: "display-1", name: "Display 1", active_plot: "spectrum", analysis_signal: A, selected_signal: A, visible_signals: [A], spectrum_settings: { scale: "db", frequency_scale: "linear", leakage: .5, frequency_limits:null } };
  const spectrumInitial = snapshot(0, "display-1", [c9SpectrumDefinition], A);
  spectrumInitial.plot_payload.spectrum_traces = [{ name: A, signal: A, x: [1, 2], y: [0, 10] }];
  const spectrumCommittedDefinition = Object.assign({}, c9SpectrumDefinition, { spectrum_settings: { scale: "linear", frequency_scale: "log", leakage: .25, frequency_limits:null } });
  const spectrumCommitted = snapshot(1, "display-1", [spectrumCommittedDefinition], A);
  spectrumCommitted.plot_payload.spectrum_traces = spectrumInitial.plot_payload.spectrum_traces;
  const spectrumRequests = [];
  const spectrum = await boot((url, options) => {
    spectrumRequests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? spectrumInitial : spectrumCommitted));
  });
  assert(spectrum.e.spectrumSettings.hidden === false && spectrum.e.spectrumScale.disabled === false, "Spectrum settings must be visible and enabled only for a nonempty Spectrum Display");
  spectrum.e.spectrumScale.value = "linear";
  spectrum.e.spectrumFrequency.value = "log";
  spectrum.e.spectrumLeakage.value = ".25";
  spectrum.e.spectrumLeakage.listeners.change();
  await flush();
  const spectrumViews = spectrumRequests.filter((call) => call.url === "./api/view");
  assert(spectrumViews.length === 1, "a Spectrum setting commit must make exactly one view request");
  assert(JSON.stringify(JSON.parse(spectrumViews[0].options.body).spectrum_settings) === JSON.stringify({ scale: "linear", frequency_scale: "log", leakage: .25, frequency_limits: null }), "Spectrum controls must submit the complete canonical nested object");
  assert(spectrum.calls.filter((call) => call.plot).at(-1).layout.xaxis.type === "log", "authoritative Spectrum frequency_scale must control only the Spectrum x axis");

  const rejectedRequests = [];
  const rejected = await boot((url, options) => {
    rejectedRequests.push({ url, options });
    return Promise.resolve(response(url === "./api/state" ? 200 : 422, url === "./api/state" ? spectrumInitial : { error: { fields: { spectrum_settings: "Недопустимая настройка Spectrum" } } }));
  });
  rejected.e.spectrumLeakage.value = ".3";
  rejected.e.spectrumLeakage.listeners.change();
  await flush();
  assert(rejectedRequests.filter((call) => call.url === "./api/view").length === 1, "a rejected Spectrum edit must not retry without a stale response");
  assert(Number(rejected.e.spectrumLeakage.value) === .5 && rejected.e.spectrumError.hidden === false && rejected.e.spectrumError.textContent.includes("Недопустимая"), "422 must restore authoritative Spectrum settings and expose the nested inline error");

  const complexSpectrumDefinition = Object.assign({}, c9SpectrumDefinition, { visible_signals: [A, B] });
  const complexSpectrum = snapshot(0, "display-1", [complexSpectrumDefinition], A);
  complexSpectrum.plot_payload.spectrum_traces = spectrumInitial.plot_payload.spectrum_traces;
  const complex = await boot((url) => Promise.resolve(response(200, complexSpectrum)));
  assert(complex.e.spectrumFrequency.options.find((option) => option.value === "log").disabled === true, "Log Spectrum frequency scale must be disabled while a complex member is visible");

  const c10AutoSettings = { scale: "db", frequency_scale: "linear", leakage: .5, frequency_limits: null };
  const c10Definition = Object.assign({}, c9SpectrumDefinition, { spectrum_settings: c10AutoSettings });
  const c10Initial = snapshot(0, "display-1", [c10Definition], A);
  c10Initial.plot_payload.spectrum_traces = spectrumInitial.plot_payload.spectrum_traces;
  c10Initial.plots.spectrum = { type: "line", x: [0, 5], y: [0, 1], frequency_limits: { mode: "auto", requested: null, effective: { min_hz: 0, max_hz: 5, units: "Hz" } } };
  const c10ExplicitSettings = Object.assign({}, c10AutoSettings, { frequency_limits: { min_hz: 1, max_hz: 4, units: "Hz" } });
  const c10Committed = snapshot(1, "display-1", [Object.assign({}, c10Definition, { spectrum_settings: c10ExplicitSettings })], A);
  c10Committed.plot_payload.spectrum_traces = spectrumInitial.plot_payload.spectrum_traces;
  c10Committed.plots.spectrum = { type: "line", x: [1, 4], y: [0, 1], frequency_limits: { mode: "explicit", requested: c10ExplicitSettings.frequency_limits, effective: c10ExplicitSettings.frequency_limits } };
  const c10Requests = [];
  const c10 = await boot((url, options) => {
    c10Requests.push({ url, options });
    return Promise.resolve(response(200, url === "./api/state" ? c10Initial : c10Committed));
  });
  assert(c10.e.spectrumFrequencyMin.value === "0" && c10.e.spectrumFrequencyMax.value === "5", "Auto Frequency Limits must show only backend effective Hz values");
  c10.e.spectrumFrequencyMin.value = "1";
  c10.e.spectrumFrequencyMax.value = "4";
  c10.e.spectrumFrequencyMin.listeners.input();
  assert(c10Requests.filter((call) => call.url === "./api/view").length === 0, "Frequency Limits draft input must not mutate before commit");
  c10.e.spectrumFrequencyMax.listeners.keydown({ key: "Enter", preventDefault() {} });
  await flush();
  const c10Views = c10Requests.filter((call) => call.url === "./api/view");
  assert(c10Views.length === 1, "Enter must commit one full queued Frequency Limits request");
  assert(JSON.stringify(JSON.parse(c10Views[0].options.body).spectrum_settings) === JSON.stringify(c10ExplicitSettings), "Frequency Limits commit must retain exact four-key Spectrum settings");

  const c10RejectedRequests = [];
  const c10Rejected = await boot((url, options) => {
    c10RejectedRequests.push({ url, options });
    return Promise.resolve(response(url === "./api/state" ? 200 : 422, url === "./api/state" ? c10Initial : { error: { fields: { spectrum_settings: "Frequency Limits outside topology" } } }));
  });
  c10Rejected.e.spectrumFrequencyMin.value = "6";
  c10Rejected.e.spectrumFrequencyMax.value = "7";
  c10Rejected.e.spectrumFrequencyMax.listeners.change();
  await flush();
  assert(c10RejectedRequests.filter((call) => call.url === "./api/view").length === 1, "rejected Frequency Limits must not issue an implicit retry");
  assert(c10Rejected.e.spectrumFrequencyMin.value === "0" && c10Rejected.e.spectrumFrequencyMax.value === "5" && c10Rejected.e.spectrumFrequencyLimitsError.hidden === false, "422 must restore the exact authoritative Auto presentation and inline field error");

  const c12Def = { id:"display-1", name:"Display 1", active_plot:"spectrogram", analysis_signal:A, selected_signal:A, visible_signals:[A], spectrogram_settings:{ overlap_percent:50, leakage:.5, frequency_limits:null, frequency_scale:"linear", power_limits:null } };
  const c12Initial = snapshot(0, "display-1", [c12Def], A); c12Initial.plot_payload.spectrogram = { type:"heatmap", x:[0], y:[0], z:[[0]] };
  const c12Committed = snapshot(1, "display-1", [Object.assign({}, c12Def, { spectrogram_settings:{ overlap_percent:75, leakage:.5, frequency_limits:null , frequency_scale:"linear", power_limits:null} })], A); c12Committed.plot_payload.spectrogram = c12Initial.plot_payload.spectrogram;
  const c12Requests = [];
  const c12 = await boot((url, options) => { c12Requests.push({url, options}); return Promise.resolve(response(200, url === "./api/state" ? c12Initial : c12Committed)); });
  assert(c12.e.spectrogramSettings.hidden === false && c12.e.spectrogramOverlap.value === "50" && Number(c12.e.spectrogramLeakage.value) === .5, "Spectrogram controls default canonically to overlap 50 and independent Leakage .5");
  c12.e.spectrogramOverlap.value = "75"; c12.e.spectrogramOverlap.listeners.input();
  assert(c12Requests.filter(call => call.url === "./api/view").length === 0, "typing Overlap is draft-only");
  c12.e.spectrogramOverlap.listeners.keydown({key:"Enter", preventDefault(){}}); await flush();
  assert(c12Requests.filter(call => call.url === "./api/view").length === 1 && JSON.stringify(JSON.parse(c12Requests.at(-1).options.body).spectrogram_settings) === JSON.stringify({ overlap_percent:75, leakage:.5, frequency_limits:null, frequency_scale:"linear", power_limits:null }), "Enter commits the exact full five-key Spectrogram target");
  c12.e.spectrogramOverlap.value = "75"; c12.e.spectrogramOverlap.listeners.change(); await flush();
  assert(c12Requests.filter(call => call.url === "./api/view").length === 1, "equal Overlap is no-op");
  c12.e.spectrogramOverlap.value = "75.1"; c12.e.spectrogramOverlap.listeners.change();
  assert(c12Requests.filter(call => call.url === "./api/view").length === 1 && c12.e.spectrogramOverlapError.hidden === false, "unsafe Overlap is local error without request");

  function overlapBody(revision, overlapPercent, leakage = .5, frequencyLimits = null, frequencyScale = "linear") {
    return { state_revision:revision, active_plot:"spectrogram", row_selected_signal:A, analysis_signal:A, visible_signals:[A], time_limits:null, measurement_kinds:["minimum", "maximum", "mean"], spectrum_settings:{ scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:null }, spectrogram_settings:{ overlap_percent:overlapPercent, leakage, frequency_limits:frequencyLimits, frequency_scale:frequencyScale, power_limits:null }, persistence_settings:{leakage:.5}, peaks_enabled:false };
  }
  const overlap422Requests = [], overlap422Resolvers = [];
  const overlap422 = await boot((url, options) => {
    overlap422Requests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, c12Initial));
    return new Promise((resolve) => overlap422Resolvers.push(resolve));
  });
  overlap422.e.spectrogramOverlap.value = "75"; overlap422.e.spectrogramOverlap.listeners.change(); await flush();
  overlap422.e.spectrogramOverlap.value = "60"; overlap422.e.spectrogramOverlap.listeners.change(); await flush();
  assert(overlap422Requests.filter(call => call.url === "./api/view").length === 1, "a queued Overlap edit must wait for the first request");
  assert(JSON.stringify(JSON.parse(overlap422Requests.at(-1).options.body)) === JSON.stringify(overlapBody(0, 75)), "first queued Overlap request must preserve the exact full canonical body");
  overlap422Resolvers.shift()(response(422, { error:{ fields:{ spectrogram_settings:"Overlap rejected" } } })); await flush();
  assert(overlap422Requests.filter(call => call.url === "./api/view").length === 2, "the latest queued Overlap edit must dispatch after the first 422");
  assert(JSON.stringify(JSON.parse(overlap422Requests.at(-1).options.body)) === JSON.stringify(overlapBody(0, 60)), "second queued Overlap request must preserve the exact latest full body");
  overlap422Resolvers.shift()(response(422, { error:{ fields:{ spectrogram_settings:"Overlap rejected" } } })); await flush();
  assert(overlap422.e.spectrogramOverlap.value === "50" && overlap422.e.spectrogramOverlapError.hidden === false, "two queued 422 Overlap edits must restore the original canonical 50, never an optimistic intermediate value");

  const c12Replay = snapshot(2, "display-1", [Object.assign({}, c12Def, { spectrogram_settings:{ overlap_percent:60, leakage:.5, frequency_limits:null , frequency_scale:"linear", power_limits:null} })], A); c12Replay.plot_payload.spectrogram = c12Initial.plot_payload.spectrogram;
  const overlap409Requests = [], overlap409Resolvers = [];
  const overlap409 = await boot((url, options) => {
    overlap409Requests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, c12Initial));
    return new Promise((resolve) => overlap409Resolvers.push(resolve));
  });
  overlap409.e.spectrogramOverlap.value = "75"; overlap409.e.spectrogramOverlap.listeners.change(); await flush();
  overlap409.e.spectrogramOverlap.value = "60"; overlap409.e.spectrogramOverlap.listeners.change(); await flush();
  overlap409Resolvers.shift()(response(409, { current:c12Initial })); await flush();
  assert(overlap409Requests.filter(call => call.url === "./api/view").length === 2, "a stale first Overlap request must issue exactly one replay");
  assert(JSON.stringify(JSON.parse(overlap409Requests.at(-1).options.body)) === JSON.stringify(overlapBody(0, 60)), "the stale replay must use the exact latest queued Overlap body, not the stale 75 target");
  overlap409Resolvers.shift()(response(200, c12Replay)); await flush();
  assert(overlap409Requests.filter(call => call.url === "./api/view").length === 2 && overlap409.e.spectrogramOverlap.value === "60", "a stale Overlap replay must settle at latest 60 without a duplicate replay");

  const overlap409TwiceRequests = [], overlap409TwiceResolvers = [];
  const overlap409Twice = await boot((url, options) => {
    overlap409TwiceRequests.push({url, options});
    if (url === "./api/state") return Promise.resolve(response(200, c12Initial));
    return new Promise(resolve => overlap409TwiceResolvers.push(resolve));
  });
  overlap409Twice.e.spectrogramOverlap.value = "75"; overlap409Twice.e.spectrogramOverlap.listeners.change(); await flush();
  overlap409TwiceResolvers.shift()(response(409, { current:c12Initial })); await flush();
  assert(overlap409TwiceRequests.filter(call => call.url === "./api/view").length === 2 && JSON.stringify(JSON.parse(overlap409TwiceRequests.at(-1).options.body)) === JSON.stringify(overlapBody(0, 75)), "the first 409 issues exactly one replay of the same desired Spectrogram target");
  overlap409TwiceResolvers.shift()(response(409, { current:c12Initial })); await flush();
  assert(overlap409TwiceRequests.filter(call => call.url === "./api/view").length === 2, "a second 409 for the replayed target must stop retries and drain the request queue");
  assert(overlap409Twice.e.spectrogramOverlap.value === "50" && Number(overlap409Twice.e.spectrogramLeakage.value) === .5 && overlap409Twice.e.spectrogramOverlapError.hidden === false, "a bounded replay failure restores the latest canonical server snapshot and exposes its error");

  const leakageCommitted = snapshot(1, "display-1", [Object.assign({}, c12Def, { spectrogram_settings:{ overlap_percent:50, leakage:1, frequency_limits:null , frequency_scale:"linear", power_limits:null} })], A); leakageCommitted.plot_payload.spectrogram = c12Initial.plot_payload.spectrogram;
  const leakageRequests = [];
  const leakage = await boot((url, options) => { leakageRequests.push({url, options}); return Promise.resolve(response(200, url === "./api/state" ? c12Initial : leakageCommitted)); });
  leakage.e.spectrogramLeakage.value = "1"; leakage.e.spectrogramLeakage.listeners.input();
  assert(leakageRequests.filter(call => call.url === "./api/view").length === 0, "typing Leakage is draft-only");
  leakage.e.spectrogramLeakage.listeners.change(); await flush();
  assert(JSON.stringify(JSON.parse(leakageRequests.at(-1).options.body)) === JSON.stringify(overlapBody(0, 50, 1)), "Leakage change commits one exact full two-key body while preserving Overlap");
  leakage.e.spectrogramLeakage.value = "1"; leakage.e.spectrogramLeakage.listeners.change(); await flush();
  assert(leakageRequests.filter(call => call.url === "./api/view").length === 1, "equal canonical Leakage is a no-op");
  leakage.e.spectrogramLeakage.value = "1.1"; leakage.e.spectrogramLeakage.listeners.change();
  assert(leakageRequests.filter(call => call.url === "./api/view").length === 1 && leakage.e.spectrogramLeakageError.hidden === false, "unsafe Leakage is a local error without request");

  const leakage422Requests = [];
  const leakage422 = await boot((url, options) => { leakage422Requests.push({url, options}); return Promise.resolve(response(url === "./api/state" ? 200 : 422, url === "./api/state" ? c12Initial : { error:{ fields:{ spectrogram_settings:"Leakage rejected" } } })); });
  leakage422.e.spectrogramLeakage.value = "0"; leakage422.e.spectrogramLeakage.listeners.change(); await flush();
  assert(leakage422Requests.filter(call => call.url === "./api/view").length === 1 && Number(leakage422.e.spectrogramLeakage.value) === .5 && leakage422.e.spectrogramLeakageError.hidden === false, "422 rolls Leakage back to the last accepted normalized control value");

  const leakageReplay = snapshot(2, "display-1", [Object.assign({}, c12Def, { spectrogram_settings:{ overlap_percent:50, leakage:.25, frequency_limits:null , frequency_scale:"linear", power_limits:null} })], A); leakageReplay.plot_payload.spectrogram = c12Initial.plot_payload.spectrogram;
  const leakage409Requests = [], leakage409Resolvers = [];
  const leakage409 = await boot((url, options) => { leakage409Requests.push({url, options}); if (url === "./api/state") return Promise.resolve(response(200, c12Initial)); return new Promise(resolve => leakage409Resolvers.push(resolve)); });
  leakage409.e.spectrogramLeakage.value = "0"; leakage409.e.spectrogramLeakage.listeners.change(); await flush();
  leakage409.e.spectrogramLeakage.value = ".25"; leakage409.e.spectrogramLeakage.listeners.change(); await flush();
  leakage409Resolvers.shift()(response(409, { current:c12Initial })); await flush();
  assert(leakage409Requests.filter(call => call.url === "./api/view").length === 2 && JSON.stringify(JSON.parse(leakage409Requests.at(-1).options.body)) === JSON.stringify(overlapBody(0, 50, .25)), "one stale Leakage request replays exactly the latest desired two-key target");
  leakage409Resolvers.shift()(response(200, leakageReplay)); await flush();
  assert(leakage409Requests.filter(call => call.url === "./api/view").length === 2 && Number(leakage409.e.spectrogramLeakage.value) === .25, "Leakage stale replay settles once without a duplicate request");

  // C19: Persistence Leakage is a display-scoped, server-owned one-key setting.
  // Each mutation retains the complete canonical View target; the browser does no DSP.
  const c19Def = { id:"display-1", name:"Display 1", active_plot:"persistence", analysis_signal:A, selected_signal:A, visible_signals:[A], persistence_settings:{ leakage:.5 } };
  const c19Initial = snapshot(0, "display-1", [c19Def], A);
  c19Initial.plot_payload.persistence = { type:"heatmap", signal:A, x:[0], y:[0], z:[[0]] }; c19Initial.plots.persistence = c19Initial.plot_payload.persistence;
  const c19Committed = snapshot(1, "display-1", [Object.assign({}, c19Def, { persistence_settings:{ leakage:1 } })], A);
  c19Committed.plot_payload.persistence = c19Initial.plot_payload.persistence; c19Committed.plots.persistence = c19Initial.plots.persistence;
  function persistenceBody(revision, leakage) {
    return { state_revision:revision, active_plot:"persistence", row_selected_signal:A, analysis_signal:A, visible_signals:[A], time_limits:null, measurement_kinds:["minimum", "maximum", "mean"], spectrum_settings:{ scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:null }, spectrogram_settings:{ overlap_percent:50, leakage:.5, frequency_limits:null, frequency_scale:"linear", power_limits:null }, persistence_settings:{ leakage }, peaks_enabled:false };
  }
  const c19Requests = [];
  const c19 = await boot((url, options) => { c19Requests.push({url, options}); return Promise.resolve(response(200, url === "./api/state" ? c19Initial : c19Committed)); });
  assert(c19.e.persistenceSettings.hidden === false && c19.e.persistenceLeakage.value === "0.5" && c19.e.persistenceLeakageValue.textContent === "0.5" && c19.e.persistenceLeakage.disabled === false, "Persistence exposes its enabled canonical .5 Leakage control only on an active Persistence display");
  c19.e.persistenceLeakage.value = "1"; c19.e.persistenceLeakage.listeners.input();
  assert(c19Requests.filter(call => call.url === "./api/view").length === 0 && c19.e.persistenceLeakageValue.textContent === "1", "typing Persistence Leakage remains a local draft without API or DSP work");
  c19.e.persistenceLeakage.listeners.change(); await flush();
  assert(c19Requests.filter(call => call.url === "./api/view").length === 1 && JSON.stringify(JSON.parse(c19Requests.at(-1).options.body)) === JSON.stringify(persistenceBody(0, 1)), "Persistence Leakage commit posts the exact full C19 View target with one canonical persistence_settings key");
  c19.e.persistenceLeakage.value = "1"; c19.e.persistenceLeakage.listeners.change(); await flush();
  assert(c19Requests.filter(call => call.url === "./api/view").length === 1, "equal canonical Persistence Leakage is a no-op");
  c19.e.persistenceLeakage.value = "1.1"; c19.e.persistenceLeakage.listeners.change();
  assert(c19Requests.filter(call => call.url === "./api/view").length === 1 && c19.e.persistenceLeakageError.hidden === false, "out-of-range Persistence Leakage fails locally without a request");

  const c19RejectedRequests = [];
  const c19Rejected = await boot((url, options) => { c19RejectedRequests.push({url, options}); return Promise.resolve(response(url === "./api/state" ? 200 : 422, url === "./api/state" ? c19Initial : { error:{ fields:{ persistence_settings:"Leakage rejected" } } })); });
  c19Rejected.e.persistenceLeakage.value = "0"; c19Rejected.e.persistenceLeakage.listeners.change(); await flush();
  assert(c19RejectedRequests.filter(call => call.url === "./api/view").length === 1 && c19Rejected.e.persistenceLeakage.value === "0.5" && c19Rejected.e.persistenceLeakageError.hidden === false, "422 restores accepted Persistence Leakage and exposes the nested inline error");

  const c19Replay = snapshot(2, "display-1", [Object.assign({}, c19Def, { persistence_settings:{ leakage:.25 } })], A);
  c19Replay.plot_payload.persistence = c19Initial.plot_payload.persistence; c19Replay.plots.persistence = c19Initial.plots.persistence;
  const c19StaleRequests = [], c19StaleResolvers = [];
  const c19Stale = await boot((url, options) => { c19StaleRequests.push({url, options}); return url === "./api/state" ? Promise.resolve(response(200, c19Initial)) : new Promise(resolve => c19StaleResolvers.push(resolve)); });
  c19Stale.e.persistenceLeakage.value = "0"; c19Stale.e.persistenceLeakage.listeners.change(); await flush();
  c19Stale.e.persistenceLeakage.value = ".25"; c19Stale.e.persistenceLeakage.listeners.change(); await flush();
  c19StaleResolvers.shift()(response(409, { current:c19Initial })); await flush();
  assert(c19StaleRequests.filter(call => call.url === "./api/view").length === 2 && JSON.stringify(JSON.parse(c19StaleRequests.at(-1).options.body)) === JSON.stringify(persistenceBody(0, .25)), "first Persistence 409 replays exactly the newest desired canonical setting once");
  c19StaleResolvers.shift()(response(200, c19Replay)); await flush();
  assert(c19StaleRequests.filter(call => call.url === "./api/view").length === 2 && c19Stale.e.persistenceLeakage.value === "0.25", "Persistence stale replay settles without a duplicate request");

  const c19TwiceRequests = [], c19TwiceResolvers = [];
  const c19Twice = await boot((url, options) => { c19TwiceRequests.push({url, options}); return url === "./api/state" ? Promise.resolve(response(200, c19Initial)) : new Promise(resolve => c19TwiceResolvers.push(resolve)); });
  c19Twice.e.persistenceLeakage.value = "0"; c19Twice.e.persistenceLeakage.listeners.change(); await flush();
  c19TwiceResolvers.shift()(response(409, { current:c19Initial })); await flush();
  c19TwiceResolvers.shift()(response(409, { current:c19Initial })); await flush();
  assert(c19TwiceRequests.filter(call => call.url === "./api/view").length === 2 && c19Twice.e.persistenceLeakage.value === "0.5" && c19Twice.e.persistenceLeakageError.hidden === false, "second Persistence 409 bounds replay, restores canonical state, and reports the failure");

  const c19NoSource = emptySnapshot(0, A);
  c19NoSource.displays[0].active_plot = "persistence"; c19NoSource.displays[0].persistence_settings = { leakage:.25 };
  const c19Disabled = await boot((url) => Promise.resolve(response(200, c19NoSource)));
  assert(c19Disabled.e.persistenceSettings.hidden === false && c19Disabled.e.persistenceLeakage.disabled === true && c19Disabled.e.persistenceLeakage.value === "0.25", "Persistence without an analysis source disables but retains its display-scoped Leakage setting");

  const c19Absent = snapshot(0, "display-1", [{ id:"display-1", name:"Display 1", active_plot:"persistence", analysis_signal:A, selected_signal:A, visible_signals:[A] }], A);
  c19Absent.plot_payload.persistence = c19Initial.plot_payload.persistence;
  const c19Compatibility = await boot((url) => Promise.resolve(response(200, c19Absent)));
  assert(c19Compatibility.e.persistenceLeakage.value === "0.5" && c19Compatibility.e.persistenceLeakage.disabled === false && c19Compatibility.e.persistenceLeakageError.hidden === true, "missing legacy persistence_settings remains compatible with canonical .5");
  for (const malformedPersistence of [null, "0.5", [{ leakage:.5 }], {}, { leakage:.5, extra:true }, { leakage:true }, { leakage:NaN }, { leakage:Infinity }, { leakage:-.01 }, { leakage:1.01 }]) {
    const malformedDef = Object.assign({}, c19Def, { persistence_settings:malformedPersistence });
    const malformedSnapshot = snapshot(0, "display-1", [malformedDef], A);
    malformedSnapshot.plot_payload.persistence = c19Initial.plot_payload.persistence;
    const malformedRequests = [];
    const malformed = await boot((url, options) => { malformedRequests.push({url, options}); return Promise.resolve(response(200, malformedSnapshot)); });
    assert(malformed.e.persistenceLeakage.disabled === true && malformed.e.persistenceLeakage.value === "" && malformed.e.persistenceLeakageError.hidden === false && malformed.e.persistenceLeakageError.textContent.includes("Некорректные настройки Persistence"), "malformed server Persistence settings surface a stable disabled contract error");
    malformed.e.plotSelect.value = "time"; malformed.e.plotSelect.listeners.change({target:malformed.e.plotSelect}); await flush();
    assert(malformedRequests.filter(call => call.url === "./api/view").length === 0, "a Persistence contract error must block unrelated server mutations rather than mask malformed state");
  }

  const c19Pages = [Object.assign({}, c19Def, { persistence_settings:{leakage:.25} }), { id:"display-2", name:"Display 2", active_plot:"persistence", analysis_signal:A, selected_signal:A, visible_signals:[A], persistence_settings:{leakage:.5} }];
  const c19PageA = snapshot(0, "display-1", c19Pages, A), c19PageB = snapshot(1, "display-2", c19Pages, A);
  c19PageA.plot_payload.persistence = c19Initial.plot_payload.persistence; c19PageB.plot_payload.persistence = c19Initial.plot_payload.persistence;
  const c19PageRequests = [];
  const c19Page = await boot((url, options) => { c19PageRequests.push({url, options}); if (url === "./api/state") return Promise.resolve(response(200, c19PageA)); const body = JSON.parse(options.body); return Promise.resolve(response(200, body.display_id === "display-2" ? c19PageB : c19PageA)); });
  assert(c19Page.e.persistenceLeakage.value === "0.25", "Persistence Leakage starts from Display A's independent setting");
  c19Page.e.tabs.listeners.click({target:tabTarget("display-2")}); await flush();
  assert(c19Page.e.persistenceLeakage.value === "0.5", "selecting Display B restores B's default Persistence Leakage without leaking A's preference");
  c19Page.e.tabs.listeners.click({target:tabTarget("display-1")}); await flush();
  assert(c19Page.e.persistenceLeakage.value === "0.25" && c19PageRequests.filter(call => call.url === "./api/displays").length === 2, "returning to Display A restores its retained Persistence Leakage through canonical display lifecycle state");

  const spectrumExact = { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:null };
  const spectrumAbsentDef = Object.assign({}, c9SpectrumDefinition); delete spectrumAbsentDef.spectrum_settings;
  const spectrumAbsent = snapshot(0, "display-1", [spectrumAbsentDef], A); spectrumAbsent.plot_payload.spectrum_traces = spectrumInitial.plot_payload.spectrum_traces;
  const spectrumCompatibility = await boot((url) => Promise.resolve(response(200, spectrumAbsent)));
  assert(spectrumCompatibility.e.spectrumScale.value === "db" && spectrumCompatibility.e.spectrumFrequency.value === "linear" && Number(spectrumCompatibility.e.spectrumLeakage.value) === .5 && spectrumCompatibility.e.spectrumError.hidden === true, "missing legacy Spectrum settings remain compatible with the exact four-key default");
  const malformedSpectrumSettings = [null, "db", [spectrumExact], {}, { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:null, extra:true }, { scale:"invalid", frequency_scale:"linear", leakage:.5, frequency_limits:null }, { scale:"db", frequency_scale:"invalid", leakage:.5, frequency_limits:null }, { scale:"db", frequency_scale:"linear", leakage:true, frequency_limits:null }, { scale:"db", frequency_scale:"linear", leakage:".5", frequency_limits:null }, { scale:"db", frequency_scale:"linear", leakage:NaN, frequency_limits:null }, { scale:"db", frequency_scale:"linear", leakage:Infinity, frequency_limits:null }, { scale:"db", frequency_scale:"linear", leakage:-.01, frequency_limits:null }, { scale:"db", frequency_scale:"linear", leakage:1.01, frequency_limits:null }, { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:{} }, { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:{min_hz:true,max_hz:1,units:"Hz"} }, { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:{min_hz:NaN,max_hz:1,units:"Hz"} }, { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:{min_hz:1,max_hz:1,units:"Hz"} }, { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:{min_hz:2,max_hz:1,units:"Hz"} }, { scale:"db", frequency_scale:"linear", leakage:.5, frequency_limits:{min_hz:1,max_hz:2,units:"kHz"} }];
  for (const malformedSpectrum of malformedSpectrumSettings) {
    const malformedDef = Object.assign({}, c9SpectrumDefinition, { spectrum_settings:malformedSpectrum });
    const malformedSnapshot = snapshot(0, "display-1", [malformedDef], A); malformedSnapshot.plot_payload.spectrum_traces = spectrumInitial.plot_payload.spectrum_traces;
    const malformedRequests = [];
    const malformed = await boot((url, options) => { malformedRequests.push({url, options}); return Promise.resolve(response(200, malformedSnapshot)); });
    assert(malformed.e.spectrumError.hidden === false && malformed.e.spectrumError.textContent.includes("Некорректные настройки Spectrum") && malformed.e.spectrumScale.disabled && malformed.e.spectrumFrequency.disabled && malformed.e.spectrumLeakage.disabled && malformed.e.spectrumFrequencyMin.disabled && malformed.e.spectrumFrequencyMax.disabled, "malformed Spectrum settings must expose a stable disabled contract error");
    malformed.e.plotSelect.value = "time"; malformed.e.plotSelect.listeners.change({target:malformed.e.plotSelect}); await flush();
    assert(malformedRequests.filter(call => call.url === "./api/view").length === 0, "a Spectrum contract error must block unrelated server mutation without masking state");
  }

  const c15Auto = { overlap_percent:50, leakage:.5, frequency_limits:null, frequency_scale:"linear", power_limits:null };
  const c15Limits = { min_hz:1, max_hz:4, units:"Hz" };
  const c15Definition = Object.assign({}, c12Def, { spectrogram_settings:c15Auto });
  const c15Initial = snapshot(0, "display-1", [c15Definition], A);
  c15Initial.plot_payload.spectrogram = { type:"heatmap", x:[0], y:[0, 5], z:[[0], [1]] };
  c15Initial.plots.spectrogram = Object.assign({}, c15Initial.plot_payload.spectrogram, { frequency_limits:{ mode:"auto", requested:null, effective:{ min_hz:0, max_hz:5, units:"Hz" } } });
  const c15Committed = snapshot(1, "display-1", [Object.assign({}, c15Definition, { spectrogram_settings:Object.assign({}, c15Auto, { frequency_limits:c15Limits }) })], A);
  c15Committed.plot_payload.spectrogram = c15Initial.plot_payload.spectrogram;
  c15Committed.plots.spectrogram = Object.assign({}, c15Initial.plots.spectrogram, { frequency_limits:{ mode:"explicit", requested:c15Limits, effective:c15Limits } });
  const c15Requests = [];
  const c15 = await boot((url, options) => { c15Requests.push({url, options}); return Promise.resolve(response(200, url === "./api/state" ? c15Initial : c15Committed)); });
  assert(c15.e.spectrogramFrequencyMin.value === "0" && c15.e.spectrogramFrequencyMax.value === "5", "Spectrogram Auto must render backend effective limits only");
  c15.e.spectrogramFrequencyMin.value = "1"; c15.e.spectrogramFrequencyMax.value = "4";
  c15.e.spectrogramFrequencyMin.listeners.input();
  assert(c15Requests.filter(call => call.url === "./api/view").length === 0, "Spectrogram Frequency Limits must remain local drafts until commit");
  c15.e.spectrogramFrequencyMax.listeners.keydown({key:"Enter", preventDefault(){}}); await flush();
  assert(c15Requests.filter(call => call.url === "./api/view").length === 1 && JSON.stringify(JSON.parse(c15Requests.at(-1).options.body).spectrogram_settings) === JSON.stringify({ overlap_percent:50, leakage:.5, frequency_limits:c15Limits, frequency_scale:"linear", power_limits:null }), "Spectrogram limit commit must issue one complete five-key body");
  c15.e.spectrogramFrequencyMin.value = "4"; c15.e.spectrogramFrequencyMax.value = "1"; c15.document.activeElement = c15.e.spectrogramLeakage; c15.e.spectrogramFrequencyLimitsControls.listeners.focusout({target:c15.e.spectrogramFrequencyMax, relatedTarget:c15.e.spectrogramLeakage});
  assert(c15Requests.filter(call => call.url === "./api/view").length === 1 && c15.e.spectrogramFrequencyLimitsError.hidden === false, "nonordered Spectrogram limit drafts must fail locally without DSP/API work");
  c15.e.spectrogramFrequencyMin.value = ""; c15.e.spectrogramFrequencyMax.value = ""; c15.document.activeElement = c15.e.spectrogramLeakage; c15.e.spectrogramFrequencyLimitsControls.listeners.focusout({target:c15.e.spectrogramFrequencyMax, relatedTarget:c15.e.spectrogramLeakage}); await flush();
  assert(JSON.parse(c15Requests.at(-1).options.body).spectrogram_settings.frequency_limits === null, "clearing both Spectrogram limit fields restores Auto through the same full object");

  const c15PairRequests = [], c15PairResolvers = [];
  const c15Pair = await boot((url, options) => {
    c15PairRequests.push({url, options});
    if (url === "./api/state") return Promise.resolve(response(200, c15Initial));
    return new Promise(resolve => c15PairResolvers.push(resolve));
  });
  c15Pair.e.spectrogramFrequencyMin.value = "1";
  c15Pair.e.spectrogramFrequencyMin.listeners.input();
  c15Pair.document.activeElement = c15Pair.e.spectrogramFrequencyMax;
  c15Pair.e.spectrogramFrequencyLimitsControls.listeners.focusout({target:c15Pair.e.spectrogramFrequencyMin, relatedTarget:c15Pair.e.spectrogramFrequencyMax});
  assert(c15PairRequests.filter(call => call.url === "./api/view").length === 0, "natural F min to F max Tab editing must not send an incomplete intermediate request");
  c15Pair.e.spectrogramFrequencyMax.value = "4";
  c15Pair.e.spectrogramFrequencyMax.listeners.input();
  c15Pair.document.activeElement = c15Pair.e.spectrogramLeakage;
  c15Pair.e.spectrogramFrequencyLimitsControls.listeners.focusout({target:c15Pair.e.spectrogramFrequencyMax, relatedTarget:c15Pair.e.spectrogramLeakage}); await flush();
  assert(c15PairRequests.filter(call => call.url === "./api/view").length === 1 && JSON.stringify(JSON.parse(c15PairRequests.at(-1).options.body).spectrogram_settings) === JSON.stringify({overlap_percent:50, leakage:.5, frequency_limits:c15Limits, frequency_scale:"linear", power_limits:null}), "paired F min/F max editing must send exactly one final full five-key request");
  c15PairResolvers.shift()(response(422, {error:{fields:{spectrogram_settings:"Frequency Limits rejected"}}})); await flush();
  assert(c15Pair.e.spectrogramFrequencyMin.value === "0" && c15Pair.e.spectrogramFrequencyMax.value === "5" && c15Pair.e.spectrogramFrequencyLimitsError.hidden === false, "Frequency Limits 422 must restore the authoritative Auto pair and error");
  assert(c15Pair.e.spectrogramFrequencyMin.disabled === false && c15Pair.e.spectrogramFrequencyMax.disabled === false, "Frequency Limits controls must become editable again after rejection");

  const c15ReplayRequests = [], c15ReplayResolvers = [];
  const c15Replay = await boot((url, options) => {
    c15ReplayRequests.push({url, options});
    if (url === "./api/state") return Promise.resolve(response(200, c15Initial));
    return new Promise(resolve => c15ReplayResolvers.push(resolve));
  });
  c15Replay.e.spectrogramFrequencyMin.value = "1"; c15Replay.e.spectrogramFrequencyMax.value = "4";
  c15Replay.document.activeElement = c15Replay.e.spectrogramLeakage;
  c15Replay.e.spectrogramFrequencyLimitsControls.listeners.focusout({target:c15Replay.e.spectrogramFrequencyMax, relatedTarget:c15Replay.e.spectrogramLeakage}); await flush();
  c15ReplayResolvers.shift()(response(409, {current:c15Initial})); await flush();
  assert(c15ReplayRequests.filter(call => call.url === "./api/view").length === 2, "first Frequency Limits 409 must issue exactly one bounded replay");
  assert(JSON.stringify(JSON.parse(c15ReplayRequests.at(-1).options.body).spectrogram_settings) === JSON.stringify({overlap_percent:50, leakage:.5, frequency_limits:c15Limits, frequency_scale:"linear", power_limits:null}), "Frequency Limits replay must preserve the latest complete target");
  c15ReplayResolvers.shift()(response(409, {current:c15Initial})); await flush();
  assert(c15ReplayRequests.filter(call => call.url === "./api/view").length === 2 && c15Replay.e.spectrogramFrequencyMin.value === "0" && c15Replay.e.spectrogramFrequencyLimitsError.hidden === false, "second Frequency Limits 409 must stop replay and restore canonical Auto state");

  const c16Auto = { overlap_percent:50, leakage:.5, frequency_limits:null, frequency_scale:"linear", power_limits:null };
  const c16Log = Object.assign({}, c16Auto, { frequency_scale:"log" });
  const c16Definition = { id:"display-1", name:"Display 1", active_plot:"spectrogram", analysis_signal:A, selected_signal:A, visible_signals:[A], spectrogram_settings:c16Auto };
  const c16Initial = snapshot(0, "display-1", [c16Definition], A);
  c16Initial.plot_payload.spectrogram = { type:"heatmap", x:[0], y:[0, 4], z:[[1], [2]], frequency_scale:{requested:"linear", effective:"linear", available:["linear", "log"]} };
  c16Initial.plots.spectrogram = c16Initial.plot_payload.spectrogram;
  const c16Committed = snapshot(1, "display-1", [Object.assign({}, c16Definition, {spectrogram_settings:c16Log})], A);
  c16Committed.plot_payload.spectrogram = { type:"heatmap", x:[0], y:[0, 4], z:[[1], [2]], frequency_scale:{requested:"log", effective:"log", available:["linear", "log"]} };
  c16Committed.plots.spectrogram = c16Committed.plot_payload.spectrogram;
  const c16Requests = [];
  const c16 = await boot((url, options) => { c16Requests.push({url, options}); return Promise.resolve(response(200, url === "./api/state" ? c16Initial : c16Committed)); });
  assert(c16.e.spectrogramFrequencyScale.value === "linear" && c16.e.spectrogramFrequencyScale.disabled === false && c16.e.spectrogramFrequencyScaleEffective.textContent === "Linear", "real Spectrogram must render backend requested/effective/available metadata");
  c16.e.spectrogramFrequencyScale.value = "log"; c16.e.spectrogramFrequencyScale.listeners.change(); await flush();
  assert(c16Requests.filter(call => call.url === "./api/view").length === 1 && JSON.stringify(JSON.parse(c16Requests.at(-1).options.body).spectrogram_settings) === JSON.stringify(c16Log), "Frequency Scale change must send one exact full four-key desired target");
  const c16Plot = c16.calls.filter(call => call.plot).at(-1);
  assert(c16Plot.layout.yaxis.type === "log" && JSON.stringify(c16Plot.data[0].y) === JSON.stringify([2,4]) && JSON.stringify(c16Committed.plot_payload.spectrogram.y) === JSON.stringify([0,4]) && JSON.stringify(c16Plot.data[0].z) === JSON.stringify(c16Committed.plot_payload.spectrogram.z), "effective Log must floor only a transient y clone and never mutate authoritative y/z");

  const c16NoPositive = snapshot(3, "display-1", [Object.assign({}, c16Definition, {spectrogram_settings:c16Log})], A);
  c16NoPositive.plot_payload.spectrogram = { type:"heatmap", x:[0], y:[0, -4], z:[[1], [2]], frequency_scale:{requested:"log", effective:"log", available:["linear", "log"]} };
  c16NoPositive.plots.spectrogram = c16NoPositive.plot_payload.spectrogram;
  const c16NoPositiveEnv = await boot((url) => Promise.resolve(response(200, c16NoPositive)));
  assert(c16NoPositiveEnv.e.host.innerHTML.includes("spectrogram-log-frequency-error-state") && c16NoPositiveEnv.e.host.dataset.plotReady === "false", "effective Log with nonempty all-nonpositive y must show the stable plot error");
  const c16EmptyY = snapshot(4, "display-1", [Object.assign({}, c16Definition, {spectrogram_settings:c16Log})], A);
  c16EmptyY.plot_payload.spectrogram = { type:"heatmap", x:[], y:[], z:[], frequency_scale:{requested:"log", effective:"log", available:["linear", "log"]} };
  c16EmptyY.plots.spectrogram = c16EmptyY.plot_payload.spectrogram;
  const c16EmptyYEnv = await boot((url) => Promise.resolve(response(200, c16EmptyY)));
  assert(c16EmptyYEnv.e.host.innerHTML.includes("plot-empty-state") && !c16EmptyYEnv.e.host.innerHTML.includes("spectrogram-log-frequency-error-state"), "empty Log y must remain the ordinary empty state without an invented floor");

  const c16NoSource = snapshot(5, "display-1", [Object.assign({}, c16Definition, {analysis_signal:null, selected_signal:null, visible_signals:[], spectrogram_settings:c16Log})], A);
  c16NoSource.plot_payload.spectrogram = { type:"heatmap", x:[], y:[], z:[], frequency_scale:{requested:"log", effective:null, available:[]} };
  c16NoSource.plots.spectrogram = c16NoSource.plot_payload.spectrogram;
  const c16NoSourceEnv = await boot((url) => Promise.resolve(response(200, c16NoSource)));
  assert(c16NoSourceEnv.e.spectrogramFrequencyScale.value === "log" && c16NoSourceEnv.e.spectrogramFrequencyScale.disabled === true && c16NoSourceEnv.e.spectrogramFrequencyScaleEffective.textContent === "", "no-source Spectrogram must retain requested Log while authoritative empty availability disables the control and clears effective state");

  const c16Complex = snapshot(2, "display-1", [Object.assign({}, c16Definition, {analysis_signal:B, selected_signal:B, visible_signals:[B], spectrogram_settings:c16Log})], B);
  c16Complex.plot_payload.spectrogram = { type:"heatmap", x:[0], y:[0, 4], z:[[1], [2]], frequency_scale:{requested:"log", effective:"linear", available:["linear"]} };
  c16Complex.plots.spectrogram = c16Complex.plot_payload.spectrogram;
  const c16ComplexEnv = await boot((url) => Promise.resolve(response(200, c16Complex)));
  assert(c16ComplexEnv.e.spectrogramFrequencyScale.value === "log" && c16ComplexEnv.e.spectrogramFrequencyScale.disabled === true && c16ComplexEnv.e.spectrogramFrequencyScaleEffective.textContent === "Linear", "complex Spectrogram must preserve requested Log while authoritative availability disables the select");

  const c16RejectRequests = [], c16RejectResolvers = [];
  const c16Reject = await boot((url, options) => { c16RejectRequests.push({url, options}); return url === "./api/state" ? Promise.resolve(response(200, c16Initial)) : new Promise(resolve => c16RejectResolvers.push(resolve)); });
  c16Reject.e.spectrogramFrequencyScale.value = "log"; c16Reject.e.spectrogramFrequencyScale.listeners.change(); await flush();
  c16RejectResolvers.shift()(response(422, {error:{fields:{spectrogram_settings:"Frequency Scale rejected"}}})); await flush();
  assert(c16Reject.e.spectrogramFrequencyScale.value === "linear" && c16Reject.e.spectrogramFrequencyScaleError.hidden === false && c16RejectRequests.filter(call => call.url === "./api/view").length === 1, "Frequency Scale 422 must restore accepted settings without retry");

  const c16ReplayRequests = [], c16ReplayResolvers = [];
  const c16Replay = await boot((url, options) => { c16ReplayRequests.push({url, options}); return url === "./api/state" ? Promise.resolve(response(200, c16Initial)) : new Promise(resolve => c16ReplayResolvers.push(resolve)); });
  c16Replay.e.spectrogramFrequencyScale.value = "log"; c16Replay.e.spectrogramFrequencyScale.listeners.change(); await flush();
  c16ReplayResolvers.shift()(response(409, {current:c16Initial})); await flush();
  assert(c16ReplayRequests.filter(call => call.url === "./api/view").length === 2 && JSON.stringify(JSON.parse(c16ReplayRequests.at(-1).options.body).spectrogram_settings) === JSON.stringify(c16Log), "first Frequency Scale 409 must replay one latest full target");
  c16ReplayResolvers.shift()(response(409, {current:c16Initial})); await flush();
  assert(c16ReplayRequests.filter(call => call.url === "./api/view").length === 2 && c16Replay.e.spectrogramFrequencyScale.value === "linear" && c16Replay.e.spectrogramFrequencyScaleError.hidden === false, "second Frequency Scale 409 must settle canonically without another replay");

  const c17Auto = { overlap_percent:50, leakage:.5, frequency_limits:null, frequency_scale:"linear", power_limits:null };
  const c17Pair = { min_db:-80, max_db:-20, units:"dB" };
  const c17Definition = { id:"display-1", name:"Display 1", active_plot:"spectrogram", analysis_signal:A, selected_signal:A, visible_signals:[A], spectrogram_settings:c17Auto };
  const c17Initial = snapshot(0, "display-1", [c17Definition], A);
  c17Initial.plot_payload.spectrogram = { type:"heatmap", x:[0, .1], y:[0, 5], z:[[-100, -10], [-80, -20]], power_limits:{mode:"auto", requested:null, effective:{min_db:-100, max_db:-10, units:"dB"}} };
  c17Initial.plots.spectrogram = c17Initial.plot_payload.spectrogram;
  const c17Committed = snapshot(1, "display-1", [Object.assign({}, c17Definition, {spectrogram_settings:Object.assign({}, c17Auto, {power_limits:c17Pair})})], A);
  c17Committed.plot_payload.spectrogram = { type:"heatmap", x:[0, .1], y:[0, 5], z:[[-100, -10], [-80, -20]], power_limits:{mode:"explicit", requested:c17Pair, effective:c17Pair} };
  c17Committed.plots.spectrogram = c17Committed.plot_payload.spectrogram;
  const c17Requests = [];
  const c17 = await boot((url, options) => { c17Requests.push({url, options}); return Promise.resolve(response(200, url === "./api/state" ? c17Initial : c17Committed)); });
  assert(c17.e.spectrogramPowerMin.value === "" && c17.e.spectrogramPowerMax.value === "" && c17.e.spectrogramPowerLimitsEffective.textContent.includes("-100"), "Auto Power Limits must retain blank editable intent and render authoritative effective dB bounds");
  c17.e.spectrogramPowerMin.value = "-80"; c17.e.spectrogramPowerMax.value = "-20"; c17.e.spectrogramPowerMin.listeners.input();
  c17.document.activeElement = c17.e.spectrogramPowerMax;
  c17.e.spectrogramPowerLimitsControls.listeners.focusout({target:c17.e.spectrogramPowerMin, relatedTarget:c17.e.spectrogramPowerMax});
  assert(c17Requests.filter(call => call.url === "./api/view").length === 0, "natural P min to P max focus transfer must not send an incomplete request");
  c17.document.activeElement = c17.e.spectrogramLeakage;
  c17.e.spectrogramPowerLimitsControls.listeners.focusout({target:c17.e.spectrogramPowerMax, relatedTarget:c17.e.spectrogramLeakage}); await flush();
  assert(c17Requests.filter(call => call.url === "./api/view").length === 1 && JSON.stringify(JSON.parse(c17Requests.at(-1).options.body).spectrogram_settings) === JSON.stringify(Object.assign({}, c17Auto, {power_limits:c17Pair})), "Power Limits pair must commit exactly one full five-key target");
  const c17Plot = c17.calls.filter(call => call.plot).at(-1);
  assert(c17Plot.data[0].zauto === false && c17Plot.data[0].zmin === -80 && c17Plot.data[0].zmax === -20 && JSON.stringify(c17Plot.data[0].z) === JSON.stringify(c17Committed.plot_payload.spectrogram.z), "strict explicit effective pair must set Plotly z bounds without mutating authoritative z");
  c17.e.spectrogramPowerMin.value = ""; c17.e.spectrogramPowerMax.value = ""; c17.document.activeElement = c17.e.spectrogramLeakage;
  c17.e.spectrogramPowerLimitsControls.listeners.focusout({target:c17.e.spectrogramPowerMax, relatedTarget:c17.e.spectrogramLeakage}); await flush();
  assert(JSON.parse(c17Requests.at(-1).options.body).spectrogram_settings.power_limits === null, "clearing both Power Limits fields must restore Auto through the full object");
  c17.e.spectrogramPowerMin.value = "-20"; c17.e.spectrogramPowerMax.value = "-80"; c17.e.spectrogramPowerMax.listeners.keydown({key:"Enter", preventDefault(){}});
  assert(c17Requests.filter(call => call.url === "./api/view").length === 2 && c17.e.spectrogramPowerLimitsError.hidden === false, "reversed Power Limits must fail locally without a request");

  const c17Constant = snapshot(2, "display-1", [c17Definition], A);
  c17Constant.plot_payload.spectrogram = {type:"heatmap", x:[0], y:[0], z:[[-42]], power_limits:{mode:"auto", requested:null, effective:{min_db:-42, max_db:-42, units:"dB"}}}; c17Constant.plots.spectrogram = c17Constant.plot_payload.spectrogram;
  const c17ConstantEnv = await boot(() => Promise.resolve(response(200, c17Constant)));
  const c17ConstantPlot = c17ConstantEnv.calls.filter(call => call.plot).at(-1);
  assert(c17ConstantPlot.data[0].zauto === false && c17ConstantPlot.data[0].zmin === -43 && c17ConstantPlot.data[0].zmax === -41 && c17Constant.plot_payload.spectrogram.power_limits.effective.min_db === -42, "constant Auto Power Limits must use renderer-only ±1 fallback while preserving exact metadata");
  const c17Empty = snapshot(3, "display-1", [c17Definition], A);
  c17Empty.plot_payload.spectrogram = {type:"heatmap", x:[], y:[], z:[], power_limits:{mode:"auto", requested:null, effective:null}}; c17Empty.plots.spectrogram = c17Empty.plot_payload.spectrogram;
  const c17EmptyEnv = await boot(() => Promise.resolve(response(200, c17Empty)));
  const c17EmptyPlot = c17EmptyEnv.calls.filter(call => call.plot).at(-1);
  assert(c17EmptyEnv.e.spectrogramPowerLimitsEffective.textContent === "Effective: —" && c17EmptyPlot.data[0].zauto === true && !Object.prototype.hasOwnProperty.call(c17EmptyPlot.data[0], "zmin"), "empty or zero-only effective null must retain zauto without invented extrema");
  const c17Malformed = snapshot(4, "display-1", [c17Definition], A);
  c17Malformed.plot_payload.spectrogram = {type:"heatmap", x:[0], y:[0], z:[[-20]], power_limits:{mode:"auto", requested:null, effective:{min_db:0, max_db:-20, units:"dB"}}}; c17Malformed.plots.spectrogram = c17Malformed.plot_payload.spectrogram;
  const c17MalformedEnv = await boot(() => Promise.resolve({ok:true, status:200, json:() => Promise.resolve(c17Malformed)}));
  assert(c17MalformedEnv.e.host.innerHTML.includes("spectrogram-power-limits-contract-error-state") && c17MalformedEnv.e.host.dataset.plotReady === "false" && !c17MalformedEnv.calls.some(call => call.plot), "malformed Power Limits metadata must enter the stable contract error without bounded-wire fallback");
  for (const malformedMeta of [
    {mode:"explicit", requested:null, effective:c17Pair},
    {mode:"explicit", requested:c17Pair, effective:{min_db:-81, max_db:-20, units:"dB"}},
    {mode:"unknown", requested:null, effective:null},
    {mode:"auto", requested:c17Pair, effective:null, extra:true},
  ]) {
    const invalid = snapshot(4, "display-1", [c17Definition], A);
    invalid.plot_payload.spectrogram = {type:"heatmap", x:[0], y:[0], z:[[-20]], power_limits:malformedMeta}; invalid.plots.spectrogram = invalid.plot_payload.spectrogram;
    const env = await boot(() => Promise.resolve({ok:true, status:200, json:() => Promise.resolve(invalid)}));
    assert(env.e.host.innerHTML.includes("spectrogram-power-limits-contract-error-state") && !env.calls.some(call => call.plot), "every malformed C17 power metadata shape must be a stable no-Plotly contract error");
  }
  const c17NoSource = snapshot(4, "display-1", [Object.assign({}, c17Definition, {analysis_signal:null, selected_signal:null, visible_signals:[], spectrogram_settings:Object.assign({}, c17Auto, {power_limits:c17Pair})})], A);
  c17NoSource.plot_payload.spectrogram = {type:"heatmap", x:[], y:[], z:[], power_limits:{mode:"explicit", requested:c17Pair, effective:c17Pair}}; c17NoSource.plots.spectrogram = c17NoSource.plot_payload.spectrogram;
  const c17NoSourceEnv = await boot(() => Promise.resolve(response(200, c17NoSource)));
  assert(c17NoSourceEnv.e.spectrogramPowerMin.disabled === true && c17NoSourceEnv.e.spectrogramPowerMax.disabled === true && c17NoSourceEnv.e.spectrogramPowerMin.value === "-80", "no-source must disable the pair while retaining explicit preference");

  const c17RollbackRequests = [], c17RollbackResolvers = [];
  const c17Rollback = await boot((url, options) => { c17RollbackRequests.push({url, options}); return url === "./api/state" ? Promise.resolve(response(200, c17Initial)) : new Promise(resolve => c17RollbackResolvers.push(resolve)); });
  c17Rollback.e.spectrogramPowerMin.value = "-80"; c17Rollback.e.spectrogramPowerMax.value = "-20"; c17Rollback.document.activeElement = c17Rollback.e.spectrogramLeakage;
  c17Rollback.e.spectrogramPowerLimitsControls.listeners.focusout({target:c17Rollback.e.spectrogramPowerMax, relatedTarget:c17Rollback.e.spectrogramLeakage}); await flush();
  c17RollbackResolvers.shift()(response(422, {error:{fields:{spectrogram_settings:"Power Limits rejected"}}})); await flush();
  assert(c17Rollback.e.spectrogramPowerMin.value === "" && c17Rollback.e.spectrogramPowerLimitsError.hidden === false && c17RollbackRequests.filter(call => call.url === "./api/view").length === 1, "422 must restore the accepted Auto intent without retry");
  const c17ReplayRequests = [], c17ReplayResolvers = [];
  const c17Replay = await boot((url, options) => { c17ReplayRequests.push({url, options}); return url === "./api/state" ? Promise.resolve(response(200, c17Initial)) : new Promise(resolve => c17ReplayResolvers.push(resolve)); });
  c17Replay.e.spectrogramPowerMin.value = "-80"; c17Replay.e.spectrogramPowerMax.value = "-20"; c17Replay.document.activeElement = c17Replay.e.spectrogramLeakage;
  c17Replay.e.spectrogramPowerLimitsControls.listeners.focusout({target:c17Replay.e.spectrogramPowerMax, relatedTarget:c17Replay.e.spectrogramLeakage}); await flush();
  c17ReplayResolvers.shift()(response(409, {current:c17Initial})); await flush();
  assert(c17ReplayRequests.filter(call => call.url === "./api/view").length === 2 && JSON.stringify(JSON.parse(c17ReplayRequests.at(-1).options.body).spectrogram_settings) === JSON.stringify(Object.assign({}, c17Auto, {power_limits:c17Pair})), "first Power Limits 409 must replay exactly one latest complete target");
  c17ReplayResolvers.shift()(response(409, {current:c17Initial})); await flush();
  assert(c17ReplayRequests.filter(call => call.url === "./api/view").length === 2 && c17Replay.e.spectrogramPowerMin.value === "" && c17Replay.e.spectrogramPowerLimitsError.hidden === false, "second Power Limits 409 must stop replay and restore canonical state");

  const c18Definition = { id:"display-1", name:"Display 1", active_plot:"persistence", analysis_signal:A, selected_signal:A, visible_signals:[A, B] };
  const c18Positive = snapshot(5, "display-1", [c18Definition], A);
  c18Positive.plot_payload.persistence = {type:"heatmap", signal:A, x:[0, 5], y:[-30, -10], z:[[10, 20], [30, 40]], x_label:"Частота, Гц", y_label:"Мощность, дБ", color_label:"Встречаемость, %"};
  c18Positive.plots.persistence = c18Positive.plot_payload.persistence;
  const c18PositiveEnv = await boot(() => Promise.resolve(response(200, c18Positive)));
  const c18PositivePlot = c18PositiveEnv.calls.filter(call => call.plot).at(-1);
  assert(c18PositiveEnv.e.plotSelect.value === "persistence" && c18PositivePlot.data.length === 1 && c18PositivePlot.data[0].type === "heatmap" && JSON.stringify(c18PositivePlot.data[0].x) === JSON.stringify([0, 5]) && JSON.stringify(c18PositivePlot.data[0].y) === JSON.stringify([-30, -10]) && JSON.stringify(c18PositivePlot.data[0].z) === JSON.stringify([[10, 20], [30, 40]]), "Cascade 18 positive Persistence must remain one generic server heatmap without client reshaping");
  assert(c18PositivePlot.data[0].colorbar.title.text === "Встречаемость, %" && c18PositivePlot.layout.yaxis.type === undefined, "Cascade 18 Persistence keeps its backend labels and linear generic heatmap y-axis");
  const c18Empty = snapshot(6, "display-1", [c18Definition], A);
  c18Empty.plot_payload.persistence = {type:"heatmap", signal:A, x:[], y:[], z:[], x_label:"Частота, Гц", y_label:"Мощность, дБ", color_label:"Встречаемость, %"};
  c18Empty.plots.persistence = c18Empty.plot_payload.persistence;
  const c18EmptyEnv = await boot(() => Promise.resolve(response(200, c18Empty)));
  const c18EmptyPlot = c18EmptyEnv.calls.filter(call => call.plot).at(-1);
  assert(c18EmptyPlot.data.length === 1 && c18EmptyPlot.data[0].type === "heatmap" && c18EmptyPlot.data[0].x.length === 0 && c18EmptyPlot.data[0].y.length === 0 && c18EmptyPlot.data[0].z.length === 0, "Cascade 18 typed-empty Persistence must retain the existing generic empty heatmap wire without a new frontend state");
};
