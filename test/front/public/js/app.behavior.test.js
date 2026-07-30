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

function snapshot(revision, activePlot, selectedSignal) {
  const plot = (type) => type === "heatmap"
    ? { type, x: [0, 1], y: [0, 1], z: [[1, 2], [3, 4]], x_label: "x", y_label: "y", color_label: "z" }
    : { type, x: [0, 1], y: [1, 2], x_label: "x", y_label: "y", method: activePlot === "spectrum" ? "welch" : undefined };
  return {
    state_revision: revision,
    active_plot: activePlot,
    selected_signal: selectedSignal,
    signals: [
      { name: HARMONIC, color: "#2563eb", sample_rate_hz: 2048, sample_count: 512, duration_s: 0.25, data_type: "Вещественный", visible: true },
      { name: CHIRP, color: "#dc2626", sample_rate_hz: 2048, sample_count: 512, duration_s: 0.25, data_type: "Комплексный", visible: true },
    ],
    plots: { time: plot("line"), spectrum: plot("line"), spectrogram: plot("heatmap"), persistence: plot("heatmap") },
    panel: { title: "Параметры отображения", active_plot: activePlot, fields: [{ id: "method", label: "Метод оценки", type: "text", value: "Welch", unit: "", readonly: true }] },
  };
}

function element(attributes, options) {
  const attrs = Object.assign({}, attributes || {});
  const classes = new Set((options && options.classes) || []);
  return {
    hidden: Boolean(options && options.hidden), textContent: "", innerHTML: "", clientWidth: 320, clientHeight: 180,
    listeners: {},
    classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    setAttribute(name, value) { attrs[name] = String(value); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    closest() { return null; },
  };
}

function makeEnvironment(fetch) {
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
    Plotly: { react(host, data, layout, config) { plotlyCalls.push({ host, data, layout, config }); return Promise.resolve(); }, purge() {} },
    addEventListener() {},
  };
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

async function boot(fetch) {
  const environment = makeEnvironment(fetch);
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
    if (url === "/api/state") return Promise.resolve(response(200, initial));
    return Promise.resolve(response(200, snapshot(2, "spectrum", HARMONIC)));
  });
  assert(initialRequests.length === 1 && initialRequests[0].url === "/api/state", "initialization must issue exactly one GET /api/state");
  assert(!initialRequests[0].options.method, "state request must not set a mutation method");
  assert(initialEnvironment.cards.time.classList.contains("is-active"), "initial active card must be marked");
  assert(initialEnvironment.elements.rows.innerHTML.includes("signal-row is-selected"), "initial selected signal row must be marked");
  assert(initialEnvironment.elements.panelFields.innerHTML.includes("active-plot-field-method"), "panel field selector must be rendered from field id");
  assert(initialEnvironment.plotlyCalls.length >= 4, "all four plots must be rendered through Plotly");

  const queueRequests = [];
  let resolveFirst;
  let resolveSecond;
  const queueInitial = snapshot(0, "time", HARMONIC);
  const queueEnvironment = await boot((url, options) => {
    queueRequests.push({ url, options });
    if (url === "/api/state") return Promise.resolve(response(200, queueInitial));
    if (!resolveFirst) return new Promise((resolve) => { resolveFirst = resolve; });
    return new Promise((resolve) => { resolveSecond = resolve; });
  });
  clickCard(queueEnvironment, "spectrum");
  await flush();
  assert(queueRequests.length === 2, "first intent must send one view request");
  assert(queueRequests[1].url === "/api/view" && queueRequests[1].options.method === "POST", "selection must use POST /api/view");
  assert(JSON.stringify(JSON.parse(queueRequests[1].options.body)) === JSON.stringify({ state_revision: 0, active_plot: "spectrum", selected_signal: HARMONIC }), "first view request must serialize revision and complete target");
  clickCard(queueEnvironment, "persistence");
  clickSignal(queueEnvironment, CHIRP);
  await flush();
  assert(queueRequests.length === 2, "only one view mutation may be in flight");
  resolveFirst(response(200, snapshot(1, "spectrum", HARMONIC)));
  await flush();
  const queuedLatestIntent = queueRequests.length === 3;
  if (queuedLatestIntent) {
    const queuedPayload = JSON.parse(queueRequests[2].options.body);
    assert(JSON.stringify(queuedPayload) === JSON.stringify({ state_revision: 1, active_plot: "persistence", selected_signal: CHIRP }), "queued mutation must retain the latest plot and signal intent");
    resolveSecond(response(200, snapshot(2, "persistence", CHIRP)));
    await flush();
    assert(queueEnvironment.cards.persistence.classList.contains("is-active"), "server-confirmed card must become active");
    assert(queueEnvironment.elements.rows.innerHTML.includes(CHIRP) && queueEnvironment.elements.rows.innerHTML.includes("signal-row is-selected"), "server-confirmed selected row must be marked");
  }

  const staleRequests = [];
  const staleCurrent = snapshot(7, "time", HARMONIC);
  const staleEnvironment = await boot((url, options) => {
    staleRequests.push({ url, options });
    if (url === "/api/state") return Promise.resolve(response(200, initial));
    return Promise.resolve(response(409, { ok: false, current: staleCurrent }));
  });
  clickCard(staleEnvironment, "spectrum");
  await flush();
  assert(staleRequests.filter((request) => request.url === "/api/view").length === 2, "409 with current snapshot must retry once and no more");
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
