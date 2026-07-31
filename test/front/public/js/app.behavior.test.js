"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const A = "Гармонический сигнал";
const B = "Комплексный ЛЧМ-сигнал";

function flush() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve());
}
function response(status, payload) { return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) }; }

function snapshot(revision, activeId, displayDefinitions) {
  const definitions = displayDefinitions || [
    { id: "display-1", name: "Display 1", active_plot: "time", selected_signal: A, visible_signals: [A, B] },
  ];
  const active = definitions.find((definition) => definition.id === (activeId || definitions[0].id)) || definitions[0];
  const selected = active.selected_signal;
  return {
    state_revision: revision,
    active_display_id: activeId || definitions[0].id,
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

function node(attrs) {
  const attributes = Object.assign({}, attrs || {});
  return {
    hidden: false, textContent: "", innerHTML: "", checked: false, value: "", dataset: {}, listeners: {}, clientWidth: 800, clientHeight: 400,
    classList: { toggle() {}, contains() { return false; } },
    setAttribute(k, v) { attributes[k] = String(v); }, getAttribute(k) { return attributes[k] || null; },
    addEventListener(k, fn) { this.listeners[k] = fn; },
    closest() { return null; }, matches() { return false; },
  };
}

function environment(fetch, options) {
  const e = {
    root: node(), loading: node(), loadingText: node(), error: node(), errorText: node(),
    tabs: node(), host: node(), title: node(), plotSelect: node(), settingsSelect: node(),
    legend: node(), normalize: node(), markers: node(), fields: node(), count: node(), rows: node(), toggleAll: node(),
    bottomTabs: node(), signals: node(), measurements: node(), measurementContent: node(), retry: node(), displayCount: node(), activeStatus: node(),
    signalBottomTab: node(), measurementsBottomTab: node(),
  };
  const selectors = {
    "[data-testid='app-shell']": e.root, "[data-testid='app-loading']": e.loading, "[data-loading-text]": e.loadingText,
    "[data-testid='app-error']": e.error, "[data-error-text]": e.errorText, "[data-testid='display-tabs']": e.tabs,
    "[data-testid='active-plot-host']": e.host, "[data-testid='display-plot-title']": e.title,
    "[data-testid='plot-type-select']": e.plotSelect, "[data-testid='settings-view-select']": e.settingsSelect,
    "[data-testid='show-legend-checkbox']": e.legend, "[data-testid='normalize-y-checkbox']": e.normalize,
    "[data-testid='show-markers-checkbox']": e.markers, "[data-panel-fields]": e.fields, "[data-signal-count]": e.count,
    "[data-signal-rows]": e.rows, "[data-testid='toggle-all-signals']": e.toggleAll,
    "[role='tablist'][aria-label='Данные анализатора']": e.bottomTabs, "[data-testid='bottom-panel-signals']": e.signals,
    "[data-testid='measurements-panel']": e.measurements, "[data-measurements-content]": e.measurementContent,
    "[data-retry]": e.retry, "[data-testid='display-count-status']": e.displayCount, "[data-testid='active-display-status']": e.activeStatus,
  };
  const calls = [];
  const plotly = { react(host, data, layout) { calls.push({ plot: true, host, data, layout }); return Promise.resolve(); } };
  const scriptOutcomes = (options && options.scriptOutcomes || []).slice();
  const document = {
    querySelector(selector) { return selectors[selector] || null; },
    querySelectorAll(selector) { return selector === "[data-bottom-tab]" ? [e.signalBottomTab, e.measurementsBottomTab] : []; },
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
  const window = { fetch(url, options) { calls.push({ url, options: options || {} }); return fetch(url, options || {}); }, addEventListener() {}, Plotly: plotly };
  e.signalBottomTab.dataset.bottomTab = "signals";
  e.measurementsBottomTab.dataset.bottomTab = "measurements";
  e.signalBottomTab.classList = { toggle(on) { this.on = on; }, contains() { return false; } };
  e.measurementsBottomTab.classList = { toggle(on) { this.on = on; }, contains() { return false; } };
  if (options && options.moduleNameOnly) { window.moduleName = plotly; delete window.Plotly; }
  if (options && options.plotlyAbsent) delete window.Plotly;
  return { e, window, document, calls };
}

async function boot(fetch, options) {
  const env = environment(fetch, options);
  const root = path.resolve(__dirname, "../../../..");
  const context = { window: env.window, document: env.document, Promise, console };
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/api.js"), "utf8"), context, { filename: "api.js" });
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/app.js"), "utf8"), context, { filename: "app.js" });
  await flush();
  return env;
}

function tabTarget(id) { return { closest(selector) { return selector === "[data-display-id]" ? { dataset: { displayId: id } } : null; } }; }
function addTarget() { return { closest(selector) { return selector === "[data-testid='add-display']" ? {} : null; } }; }
function closeTarget(id) { return { closest(selector) { return selector === "[data-close-display]" ? { dataset: { closeDisplay: id } } : null; } }; }
function checkboxTarget(name, checked) { return { checked, dataset: { signalVisibility: name }, closest(selector) { return selector === "[data-signal-visibility]" ? this : null; }, matches() { return true; } }; }

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
  assert(JSON.stringify(JSON.parse(view.options.body)) === JSON.stringify({ state_revision: 0, active_plot: "time", selected_signal: B, visible_signals: [B] }), "hiding selected signal must send complete active-page membership and fallback selection");

  const localTabRequests = [];
  const localTabs = await boot((url, options) => {
    localTabRequests.push({ url, options });
    return Promise.resolve(response(200, initial));
  });
  localTabs.e.bottomTabs.listeners.click({ target: { closest(selector) { return selector === "[data-bottom-tab]" ? localTabs.e.measurementsBottomTab : null; } } });
  assert(localTabRequests.length === 1 && localTabRequests[0].url === "./api/state", "opening Measurements must not make a backend request");
  assert(localTabs.e.signals.hidden === true && localTabs.e.measurements.hidden === false, "Measurements tab must swap only local panels");
  assert(localTabs.e.measurementsBottomTab.getAttribute("aria-selected") === "true", "Measurements tab must expose its local selected state accessibly");
};
