"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HARMONIC = "Гармонический сигнал";
const CHIRP = "Комплексный ЛЧМ-сигнал";

function flush() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve())
    .then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve());
}

function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) };
}

function linePlot(y, method) {
  const plot = { type: "line", x: [0, 1], y, x_label: "x", y_label: "y" };
  if (method) plot.method = method;
  return plot;
}

function heatmapPlot(z) {
  return { type: "heatmap", x: [0, 1], y: [0, 1], z, x_label: "x", y_label: "y", color_label: "z" };
}

function trace(name, color, y, method) {
  const item = linePlot(y, method);
  item.name = name;
  item.signal = name;
  item.color = color;
  return item;
}

function snapshot(revision, activePlot, selectedSignal, visibleNames) {
  const visible = visibleNames || [HARMONIC, CHIRP];
  const allSignals = [
    { name: HARMONIC, color: "#2563eb", sample_rate_hz: 2048, sample_count: 512, duration_s: 0.25, data_type: "Вещественный", visible: visible.includes(HARMONIC) },
    { name: CHIRP, color: "#dc2626", sample_rate_hz: 2048, sample_count: 512, duration_s: 0.25, data_type: "Комплексный", visible: visible.includes(CHIRP) },
  ];
  const selectedColor = selectedSignal === CHIRP ? "#dc2626" : "#2563eb";
  const selectedY = selectedSignal === CHIRP ? [3, 4] : [1, 2];
  const timeTraces = [
    trace(HARMONIC, "#2563eb", [1, 2]),
    trace(CHIRP, "#dc2626", [3, 4]),
  ].filter((item) => visible.includes(item.name));
  const spectrumTraces = [
    trace(HARMONIC, "#2563eb", [10, 11], "welch"),
    trace(CHIRP, "#dc2626", [12, 13], "welch"),
  ].filter((item) => visible.includes(item.name));
  const selectedSpectrogram = Object.assign(heatmapPlot(selectedSignal === CHIRP ? [[5, 6], [7, 8]] : [[1, 2], [3, 4]]), { name: selectedSignal, signal: selectedSignal, color: selectedColor });
  const selectedPersistence = Object.assign(heatmapPlot(selectedSignal === CHIRP ? [[9, 10], [11, 12]] : [[2, 3], [4, 5]]), { name: selectedSignal, signal: selectedSignal, color: selectedColor });
  return {
    state_revision: revision,
    active_plot: activePlot,
    selected_signal: selectedSignal,
    visible_signals: visible,
    signals: allSignals,
    plots: {
      time: linePlot(selectedY),
      spectrum: linePlot(selectedSignal === CHIRP ? [12, 13] : [10, 11], "welch"),
      spectrogram: heatmapPlot(selectedSignal === CHIRP ? [[5, 6], [7, 8]] : [[1, 2], [3, 4]]),
      persistence: heatmapPlot(selectedSignal === CHIRP ? [[9, 10], [11, 12]] : [[2, 3], [4, 5]]),
    },
    plot_payload: {
      selected_signal: selectedSignal,
      visible_signals: visible,
      time_traces: timeTraces,
      spectrum_traces: spectrumTraces,
      spectrogram: selectedSpectrogram,
      persistence: selectedPersistence,
    },
    panel: { title: "Параметры отображения", active_plot: activePlot, fields: [{ id: "method", label: "Метод оценки", type: "text", value: "Welch", unit: "", readonly: true }] },
  };
}

function element(attributes, options) {
  const attrs = Object.assign({}, attributes || {});
  const classes = new Set((options && options.classes) || []);
  const node = {
    hidden: Boolean(options && options.hidden), textContent: "", innerHTML: "", className: "", clientWidth: 320, clientHeight: 180,
    children: [], parentNode: null,
    listeners: {},
    classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    setAttribute(name, value) { attrs[name] = String(value); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      child.parentNode = null;
      return child;
    },
    querySelectorAll(selector) {
      if (selector !== ".plot-placeholder") return [];
      return this.children.filter((child) => String(child.className || "").split(/\s+/).includes("plot-placeholder"));
    },
    closest() { return null; },
  };
  return node;
}

function makeEnvironment(fetch, options) {
  const elements = {
    root: element({ "data-testid": "app-shell" }),
    loading: element({ "data-testid": "app-loading" }, { hidden: true }),
    loadingText: element({ "data-loading-text": "" }),
    error: element({ "data-testid": "app-error" }, { hidden: true }),
    errorText: element({ "data-error-text": "" }),
    title: element({ "data-testid": "active-plot-title" }),
    panelFields: element({ "data-panel-fields": "" }),
    count: element({ "data-signal-count": "" }),
    rows: element({ "data-signal-rows": "" }),
    grid: element({ "data-testid": "plot-grid" }),
    retry: element({ "data-retry": "" }),
  };
  const cards = {};
  const hosts = {};
  ["time", "spectrum", "spectrogram", "persistence"].forEach((id) => {
    cards[id] = element({ "data-plot": id });
    hosts[id] = element({ "data-plot-host": id });
    const placeholder = element();
    placeholder.className = "plot-placeholder";
    const existingGraph = element({}, { classes: ["js-plotly-plot"] });
    existingGraph.className = "js-plotly-plot";
    hosts[id].appendChild(placeholder);
    hosts[id].appendChild(existingGraph);
    hosts[id].existingGraph = existingGraph;
  });
  const selectorMap = {
    "[data-testid='app-shell']": elements.root,
    "[data-testid='app-loading']": elements.loading,
    "[data-loading-text]": elements.loadingText,
    "[data-testid='app-error']": elements.error,
    "[data-error-text]": elements.errorText,
    "[data-testid='active-plot-title']": elements.title,
    "[data-panel-fields]": elements.panelFields,
    "[data-signal-count]": elements.count,
    "[data-signal-rows]": elements.rows,
    "[data-testid='plot-grid']": elements.grid,
    "[data-retry]": elements.retry,
  };
  ["time", "spectrum", "spectrogram", "persistence"].forEach((id) => {
    selectorMap[`[data-plot='${id}']`] = cards[id];
    selectorMap[`[data-plot-host='${id}']`] = hosts[id];
  });
  const document = {
    head: { appendChild() { throw new Error("Plotly CDN must not be requested when Plotly is mocked"); } },
    querySelector(selector) { return selectorMap[selector] || null; },
    querySelectorAll(selector) { return selector === "[data-plot-host]" ? Object.values(hosts) : []; },
    createElement() { return element(); },
  };
  const plotlyCalls = [];
  const window = {
    fetch,
    Plotly: {
      react(host, data, layout, config) {
        plotlyCalls.push({ host, data, layout, config, placeholderCount: host.querySelectorAll(".plot-placeholder").length });
        return Promise.resolve();
      },
      purge() {},
    },
    addEventListener() {},
  };
  if (options && options.moduleNameOnly) {
    window.moduleName = window.Plotly;
    delete window.Plotly;
  }
  return { window, document, elements, cards, hosts, plotlyCalls };
}

function clickCard(environment, id) {
  const card = environment.cards[id];
  card.closest = (selector) => selector === "[data-plot]" ? card : null;
  environment.elements.grid.listeners.click({ target: card });
}

function clickSignal(environment, name) {
  const row = element({ "data-signal": name });
  row.closest = (selector) => selector === "[data-signal]" ? row : null;
  environment.elements.rows.listeners.click({ target: row });
}

function visibilityCheckbox(name, checked) {
  const checkbox = element({ "data-signal-visibility": name });
  checkbox.checked = checked;
  checkbox.closest = (selector) => {
    if (selector.includes("[data-signal-visibility]")) return checkbox;
    return null;
  };
  return checkbox;
}

function latestPlotlyCall(environment, id) {
  return environment.plotlyCalls.filter((call) => call.host === environment.hosts[id]).pop();
}

async function boot(fetch, options) {
  const environment = makeEnvironment(fetch, options);
  const context = { window: environment.window, document: environment.document, Promise, Intl, console };
  const root = path.resolve(__dirname, "../../../..");
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/api.js"), "utf8"), context, { filename: "api.js" });
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/app.js"), "utf8"), context, { filename: "app.js" });
  await flush();
  return environment;
}

module.exports = async function testSignalAnalyserBehavior(assert) {
  const initialRequests = [];
  const initial = snapshot(1, "time", HARMONIC);
  const initialEnvironment = await boot((url, options) => {
    initialRequests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    return Promise.resolve(response(200, snapshot(2, "spectrum", HARMONIC)));
  });
  assert(initialRequests.length === 1 && initialRequests[0].url === "./api/state", "initialization must issue exactly one GET ./api/state");
  assert(!initialRequests[0].options.method, "state request must not set a mutation method");
  assert(initialEnvironment.cards.time.classList.contains("is-active"), "initial active card must be marked");
  assert(initialEnvironment.elements.rows.innerHTML.includes("signal-row is-selected"), "initial selected signal row must be marked");
  assert(initialEnvironment.elements.panelFields.innerHTML.includes("active-plot-field-method"), "panel field selector must be rendered from field id");
  assert(initialEnvironment.plotlyCalls.length >= 4, "all four plots must be rendered through Plotly");
  ["time", "spectrum", "spectrogram", "persistence"].forEach((id) => {
    assert(initialEnvironment.hosts[id].querySelectorAll(".plot-placeholder").length === 0, `${id} placeholder must be removed after Plotly ready`);
    assert(initialEnvironment.hosts[id].existingGraph.parentNode === initialEnvironment.hosts[id], `${id} existing Plotly graph child must not be destroyed`);
    assert(latestPlotlyCall(initialEnvironment, id).placeholderCount === 0, `${id} placeholder must be removed before Plotly.react`);
  });
  const timeCall = latestPlotlyCall(initialEnvironment, "time");
  const spectrumCall = latestPlotlyCall(initialEnvironment, "spectrum");
  const spectrogramCall = latestPlotlyCall(initialEnvironment, "spectrogram");
  const persistenceCall = latestPlotlyCall(initialEnvironment, "persistence");
  assert(JSON.stringify(timeCall.data.map((item) => item.name)) === JSON.stringify([HARMONIC, CHIRP]), "time plot must render one trace for every visible signal");
  assert(JSON.stringify(timeCall.data.map((item) => item.line.color)) === JSON.stringify(["#2563eb", "#dc2626"]), "time traces must keep signal colors");
  assert(timeCall.data.every((item) => item.showlegend === true), "time traces must show the legend");
  assert(JSON.stringify(spectrumCall.data.map((item) => item.name)) === JSON.stringify([HARMONIC, CHIRP]), "spectrum plot must render one trace for every visible signal");
  assert(spectrumCall.layout.showlegend === true, "spectrum plot must enable legend");
  assert(spectrogramCall.data.length === 1 && spectrogramCall.data[0].type === "heatmap" && spectrogramCall.layout.showlegend === false, "spectrogram must render one selected-signal heatmap");
  assert(persistenceCall.data.length === 1 && persistenceCall.data[0].type === "heatmap" && persistenceCall.layout.showlegend === false, "persistence must render one selected-signal heatmap");

  const moduleNameEnvironment = await boot(
    (url) => Promise.resolve(response(200, url === "./api/state" ? initial : snapshot(2, "time", HARMONIC))),
    { moduleNameOnly: true }
  );
  assert(moduleNameEnvironment.window.Plotly === moduleNameEnvironment.window.moduleName, "local bundle moduleName export must normalize to window.Plotly before rendering");
  assert(moduleNameEnvironment.plotlyCalls.length >= 4, "moduleName-normalized Plotly must render all plots without loading CDN fallback");

  const queueRequests = [];
  let resolveFirst;
  let resolveSecond;
  const queueInitial = snapshot(0, "time", HARMONIC);
  const queueEnvironment = await boot((url, options) => {
    queueRequests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, queueInitial));
    if (!resolveFirst) return new Promise((resolve) => { resolveFirst = resolve; });
    return new Promise((resolve) => { resolveSecond = resolve; });
  });
  clickCard(queueEnvironment, "spectrum");
  await flush();
  assert(queueRequests.length === 2, "first intent must send one view request");
  assert(queueRequests[1].url === "./api/view" && queueRequests[1].options.method === "POST", "selection must use POST ./api/view");
  assert(JSON.stringify(JSON.parse(queueRequests[1].options.body)) === JSON.stringify({ state_revision: 0, active_plot: "spectrum", selected_signal: HARMONIC, visible_signals: [HARMONIC, CHIRP] }), "first view request must serialize revision and complete target");
  clickCard(queueEnvironment, "persistence");
  clickSignal(queueEnvironment, CHIRP);
  await flush();
  assert(queueRequests.length === 2, "only one view mutation may be in flight");
  resolveFirst(response(200, snapshot(1, "spectrum", HARMONIC)));
  await flush();
  const queuedLatestIntent = queueRequests.length === 3;
  if (queuedLatestIntent) {
    const queuedPayload = JSON.parse(queueRequests[2].options.body);
    assert(JSON.stringify(queuedPayload) === JSON.stringify({ state_revision: 1, active_plot: "persistence", selected_signal: CHIRP, visible_signals: [HARMONIC, CHIRP] }), "queued mutation must retain the latest plot and signal intent");
    resolveSecond(response(200, snapshot(2, "persistence", CHIRP)));
    await flush();
    assert(queueEnvironment.cards.persistence.classList.contains("is-active"), "server-confirmed card must become active");
    assert(queueEnvironment.elements.rows.innerHTML.includes(CHIRP) && queueEnvironment.elements.rows.innerHTML.includes("signal-row is-selected"), "server-confirmed selected row must be marked");
  }

  const visibilityRequests = [];
  let resolveVisibilityFirst;
  let resolveVisibilitySecond;
  const visibilityEnvironment = await boot((url, options) => {
    visibilityRequests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, snapshot(0, "time", HARMONIC)));
    if (!resolveVisibilityFirst) return new Promise((resolve) => { resolveVisibilityFirst = resolve; });
    return new Promise((resolve) => { resolveVisibilitySecond = resolve; });
  });
  const checkbox = visibilityCheckbox(HARMONIC, false);
  let stoppedClick = false;
  visibilityEnvironment.elements.rows.listeners.click({ target: checkbox, stopPropagation() { stoppedClick = true; } });
  await flush();
  assert(stoppedClick, "visibility checkbox click must stop propagation");
  assert(visibilityRequests.length === 1, "visibility checkbox click must not select the row or call the API");
  let stoppedChange = false;
  visibilityEnvironment.elements.rows.listeners.change({ target: checkbox, stopPropagation() { stoppedChange = true; } });
  await flush();
  assert(stoppedChange, "visibility checkbox change must stop propagation");
  assert(visibilityRequests.length === 2, "visibility change must enqueue one API mutation");
  assert(JSON.stringify(JSON.parse(visibilityRequests[1].options.body)) === JSON.stringify({ state_revision: 0, active_plot: "time", selected_signal: CHIRP, visible_signals: [CHIRP] }), "hiding selected signal must send fallback selected and full visible list");
  const restoreCheckbox = visibilityCheckbox(HARMONIC, true);
  visibilityEnvironment.elements.rows.listeners.change({ target: restoreCheckbox, stopPropagation() {} });
  await flush();
  assert(visibilityRequests.length === 2, "second visibility change must wait while first mutation is in flight");
  resolveVisibilityFirst(response(200, snapshot(1, "time", CHIRP, [CHIRP])));
  await flush();
  assert(visibilityRequests.length === 3, "queued visibility change must run after the first response");
  assert(JSON.stringify(JSON.parse(visibilityRequests[2].options.body)) === JSON.stringify({ state_revision: 1, active_plot: "time", selected_signal: CHIRP, visible_signals: [HARMONIC, CHIRP] }), "queued visibility mutation must use the server-confirmed revision and canonical visible order");
  resolveVisibilitySecond(response(200, snapshot(2, "time", CHIRP, [HARMONIC, CHIRP])));
  await flush();

  const staleRequests = [];
  const staleCurrent = snapshot(7, "time", HARMONIC);
  const staleEnvironment = await boot((url, options) => {
    staleRequests.push({ url, options });
    if (url === "./api/state") return Promise.resolve(response(200, initial));
    return Promise.resolve(response(409, { ok: false, current: staleCurrent }));
  });
  clickCard(staleEnvironment, "spectrum");
  await flush();
  assert(staleRequests.filter((request) => request.url === "./api/view").length === 2, "409 with current snapshot must retry once and no more");
  assert(JSON.parse(staleRequests[2].options.body).state_revision === 7, "single retry must use the revision from current");
  assert(staleEnvironment.elements.error.hidden === false, "a second stale response must be visible as an error");

  let failedGet = true;
  const errorEnvironment = await boot((url) => {
    if (failedGet) return Promise.resolve(response(500, { error: "failure" }));
    return Promise.resolve(response(200, initial));
  });
  assert(errorEnvironment.elements.error.hidden === false, "GET failure must show app error");
  assert(errorEnvironment.elements.loading.hidden === true && errorEnvironment.elements.root.getAttribute("aria-busy") === "false", "GET failure must clear loading state");
  failedGet = false;
  errorEnvironment.elements.retry.listeners.click();
  await flush();
  assert(errorEnvironment.elements.error.hidden === true, "successful retry must clear app error");
  assert(queuedLatestIntent, "latest queued intent must run after the in-flight mutation even from state_revision 0");
};
