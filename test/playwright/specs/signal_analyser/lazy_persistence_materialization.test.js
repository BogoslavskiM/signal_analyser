"use strict";

// C23 / DEC-029: this test intentionally observes only published state and
// Plotly output. Persistence-provider calls are server-internal and have no
// browser contract, so a request-count assertion for them would be fabricated.
const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  assertNoPreparingPlaceholders,
  endpointMatches,
  performanceLog,
  responseJson,
  signalRowsState,
  waitForApi,
  waitForSettled,
} = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function active(snapshot) { return (snapshot.displays || []).find(function (item) { return item.id === snapshot.active_display_id; }); }
function source(snapshot) { const display = active(snapshot); return display && display.analysis_signal || ""; }
function persistence(snapshot) {
  return snapshot && snapshot.plot_payload && snapshot.plot_payload.persistence ||
    snapshot && snapshot.plots && snapshot.plots.persistence;
}
async function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }

async function mutation(page, config, action, log, label) {
  const before = Number(await id(page, config, "shell").getAttribute("data-state-revision"));
  const requests = [];
  const capture = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request);
  };
  page.on("request", capture);
  const startedAt = Date.now();
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await action();
    const response = await responsePromise;
    const snapshot = await responseJson(response, label);
    performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}; ${requests.length} /api/view request(s)`);
    if (!response.ok() || requests.length !== 1 || snapshot.state_revision !== before + 1) {
      throw new Error(`${label}: requires exactly one successful +1 POST /api/view`);
    }
    await waitForSettled(page, config);
    return snapshot;
  } finally { page.off("request", capture); }
}

async function selectPlot(page, config, plot, log, label) {
  if (await id(page, config, "plotTypeSelect").inputValue() === plot) return state(page);
  return mutation(page, config, function () { return id(page, config, "plotTypeSelect").selectOption(plot); }, log, label);
}

async function setMembership(page, config, name, checked, log, label) {
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === name; });
  if (!row || !row.checkboxTestId) throw new Error(`${label}: membership checkbox is unavailable for ${name}`);
  if (Boolean(row.checked) === checked) return state(page);
  return mutation(page, config, function () {
    return page.locator(testIdSelector(row.checkboxTestId)).setChecked(checked, { timeout: TIMEOUT });
  }, log, label);
}

async function selectSource(page, config, name, log, label) {
  if (source(await state(page)) === name) return state(page);
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === name; });
  if (!row || !row.checked) throw new Error(`${label}: visible source row is unavailable: ${name}`);
  return mutation(page, config, function () {
    return page.locator(testIdSelector(row.id)).click({ timeout: TIMEOUT });
  }, log, label);
}

async function rendered(page, config, assert, label) {
  await page.waitForFunction(function (selector) {
    const host = document.querySelector(selector);
    return host && host.getAttribute("data-plot-ready") === "true";
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  await assertNoPreparingPlaceholders(page, assert);
  return id(page, config, "activePlotHost").evaluate(function (host) {
    const traces = host.data || host._fullData || [];
    const heatmaps = traces.filter(function (trace) { return trace.type === "heatmap"; });
    const trace = heatmaps[0];
    return { heatmaps: heatmaps.length, x: trace && trace.x || [], y: trace && trace.y || [], z: trace && trace.z || [] };
  });
}

async function assertInactiveEmpty(page, config, snapshot, assert, label) {
  const wire = persistence(snapshot);
  assert(source(snapshot) && wire && wire.type === "heatmap" && wire.signal === source(snapshot) &&
    Array.isArray(wire.x) && Array.isArray(wire.y) && Array.isArray(wire.z) &&
    wire.x.length === 0 && wire.y.length === 0 && wire.z.length === 0,
  `${label}: inactive nonempty Display must publish its source with typed-empty Persistence x/y/z`);
  const visual = await rendered(page, config, assert, label);
  assert(visual.heatmaps === 0, `${label}: non-Persistence plot must not retain a Persistence heatmap`);
}

async function assertActivePersistence(page, config, snapshot, assert, label) {
  const wire = persistence(snapshot);
  assert(source(snapshot) && wire && wire.type === "heatmap" && wire.signal === source(snapshot) &&
    wire.x.length > 0 && wire.y.length > 0 && wire.z.length === wire.y.length &&
    wire.z.every(function (row) { return Array.isArray(row) && row.length === wire.x.length; }),
  `${label}: active Persistence must publish a nonempty source-bound heatmap`);
  const visual = await rendered(page, config, assert, label);
  assert(visual.heatmaps === 1 && same(visual.x, wire.x) && same(visual.y, wire.y) && same(visual.z, wire.z),
    `${label}: active Plotly heatmap must match published Persistence wire`);
  return { signal: wire.signal, x: wire.x, y: wire.y, z: wire.z };
}

async function testLazyPersistenceMaterialization({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("create isolated non-Persistence Display and verify inactive source lifecycle", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      original.active = (await state(page)).active_display_id;
      const create = waitForApi(page, config, config.app.api.displays, "POST");
      const startedAt = Date.now();
      await id(page, config, "addDisplay").click({ timeout: TIMEOUT });
      const response = await create;
      performanceLog(log, "create isolated C23 Display", Date.now() - startedAt, undefined, `HTTP ${response.status()}`);
      assert(response.ok(), "C23 setup must create an isolated Display");
      await waitForSettled(page, config);
      original.created = (await state(page)).active_display_id;

      let snapshot = await selectPlot(page, config, "time", log, "select Time before C23 cold activation");
      const candidate = (snapshot.signals || [])[0];
      assert(candidate, "C23 fixture requires at least one signal");
      snapshot = await setMembership(page, config, candidate.name, true, log, `make C23 source visible ${candidate.name}`);
      snapshot = await selectSource(page, config, candidate.name, log, `select C23 source ${candidate.name}`);
      original.source = source(snapshot);
      assert(await id(page, config, "plotTypeSelect").inputValue() === "time", "C23 setup must remain non-Persistence before cold activation");
      await assertInactiveEmpty(page, config, snapshot, assert, "Time source selection");
    });

    await step("cold Persistence activation renders, switch-away clears presentation, warm return preserves it", async function () {
      const cold = await selectPlot(page, config, "persistence", log, "cold Persistence activation on new Display");
      const coldWire = await assertActivePersistence(page, config, cold, assert, "cold Persistence activation");

      const away = await selectPlot(page, config, "time", log, "switch away from Persistence");
      await assertInactiveEmpty(page, config, away, assert, "switch away from Persistence");
      const warm = await selectPlot(page, config, "persistence", log, "warm Persistence return");
      const warmWire = await assertActivePersistence(page, config, warm, assert, "warm Persistence return");
      assert(same(warmWire, coldWire), "warm Persistence return must reuse the same published source heatmap without stale non-Persistence presentation");
      log("C23 provider-call count intentionally unasserted: DEC-029 exposes no browser-visible provider-call contract");
    });
  } finally {
    if (original.created) {
      try {
        const close = waitForApi(page, config, config.app.api.displays, "POST");
        await page.locator(testIdSelector(`close-display-${original.created}`)).click({ timeout: TIMEOUT });
        const response = await close;
        assert(response.ok(), "C23 cleanup must close isolated Display");
        await waitForSettled(page, config);
        assert((await state(page)).active_display_id === original.active, "C23 cleanup must restore original active Display");
      } catch (error) {
        log(`cleanup C23 lazy Persistence: ${error.message}`);
        throw error;
      }
    }
  }
}

testLazyPersistenceMaterialization.requiredFeatures = [
  "frontend-state-management",
  "signal-analyser-displays",
  "graph-output-zone",
  "typed-persistence",
  "lazy-persistence-materialization",
];
module.exports = testLazyPersistenceMaterialization;
