"use strict";

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
function active(snapshot) { return (snapshot.displays || []).find(function (d) { return d.id === snapshot.active_display_id; }); }
function source(snapshot) { const d = active(snapshot); return d && d.analysis_signal || ""; }
function persistence(snapshot) {
  return snapshot && snapshot.plot_payload && snapshot.plot_payload.persistence ||
    snapshot && snapshot.plots && snapshot.plots.persistence;
}
function complex(signal) { return /complex|комплекс/i.test(String(signal && signal.data_type || "")); }
function signal(snapshot, name) { return (snapshot.signals || []).find(function (item) { return item.name === name; }); }
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
    performanceLog(log, label, Date.now() - startedAt, undefined,
      `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (!response.ok() || requests.length !== 1 || snapshot.state_revision !== before + 1) {
      throw new Error(`${label}: requires one successful +1 POST /api/view`);
    }
    await waitForSettled(page, config);
    return snapshot;
  } finally {
    page.off("request", capture);
  }
}

async function selectPlot(page, config, plot, log, label) {
  const control = id(page, config, "plotTypeSelect");
  if (await control.inputValue() === plot) return state(page);
  return mutation(page, config, function () { return control.selectOption(plot); }, log, label);
}

async function selectDisplay(page, config, displayId, log, label) {
  const current = await state(page);
  if (current.active_display_id === displayId) return current;
  const startedAt = Date.now();
  await page.locator(testIdSelector(`display-tab-${displayId}`)).click({ timeout: TIMEOUT });
  await waitForSettled(page, config);
  performanceLog(log, label, Date.now() - startedAt, undefined, "Display activated");
  return state(page);
}

async function selectSource(page, config, name, log, label) {
  if (source(await state(page)) === name) return state(page);
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === name; });
  if (!row || !row.checked) throw new Error(`${label}: visible source row is unavailable: ${name}`);
  return mutation(page, config, function () {
    return page.locator(testIdSelector(row.id)).click({ timeout: TIMEOUT });
  }, log, label);
}

async function setMembership(page, config, name, checked, log, label) {
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === name; });
  if (!row || !row.checkboxTestId) throw new Error(`${label}: membership checkbox is unavailable: ${name}`);
  if (Boolean(row.checked) === checked) return state(page);
  return mutation(page, config, function () {
    return page.locator(testIdSelector(row.checkboxTestId)).setChecked(checked, { timeout: TIMEOUT });
  }, log, label);
}

function assertRectangular(assert, plot, label) {
  assert(plot && plot.type === "heatmap" && Array.isArray(plot.x) && Array.isArray(plot.y) && Array.isArray(plot.z),
    `${label}: Persistence wire must retain heatmap x/y/z`);
  assert(plot.x.length > 0 && plot.y.length > 0 && plot.z.length === plot.y.length &&
    plot.z.every(function (row) { return Array.isArray(row) && row.length === plot.x.length; }),
  `${label}: Persistence wire must be nonempty power×frequency matrix`);
  assert(plot.x.every(Number.isFinite) && plot.y.every(Number.isFinite) &&
    plot.z.every(function (row) { return row.every(Number.isFinite); }),
  `${label}: Persistence wire values must be finite`);
  assert(plot.x.every(function (value, index) { return index === 0 || value > plot.x[index - 1]; }) &&
    plot.y.every(function (value, index) { return index === 0 || value > plot.y[index - 1]; }),
  `${label}: Persistence axes must be strictly increasing`);
}

async function renderedHeatmap(page, config, assert, label) {
  await page.waitForFunction(function (selector) {
    const host = document.querySelector(selector);
    const traces = host && (host.data || host._fullData || []);
    return host && host.getAttribute("data-plot-ready") === "true" && Array.isArray(traces) &&
      traces.filter(function (trace) { return trace.type === "heatmap"; }).length === 1;
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  await assertNoPreparingPlaceholders(page, assert);
  return id(page, config, "activePlotHost").evaluate(function (host) {
    const traces = host.data || host._fullData || [];
    const heatmaps = traces.filter(function (trace) { return trace.type === "heatmap"; });
    const trace = heatmaps[0];
    return { heatmapCount: heatmaps.length, x: trace && trace.x || [], y: trace && trace.y || [], z: trace && trace.z || [] };
  });
}

async function assertPersistence(page, config, snapshot, assert, label) {
  const plot = persistence(snapshot), analysis = source(snapshot), rendered = await renderedHeatmap(page, config, assert, label);
  assert(analysis && plot.signal === analysis, `${label}: Persistence payload must belong only to analysis source`);
  assertRectangular(assert, plot, label);
  assert(rendered.heatmapCount === 1 && same(rendered.x, plot.x) && same(rendered.y, plot.y) && same(rendered.z, plot.z),
    `${label}: sole Plotly heatmap must agree exactly with authoritative Persistence x/y/z`);
  return plot;
}

function assertTopology(assert, plot, sourceSignal, label) {
  const tolerance = Math.max(1e-9, Number(sourceSignal.sample_rate_hz) * 1e-6);
  const low = plot.x[0], high = plot.x[plot.x.length - 1], half = Number(sourceSignal.sample_rate_hz) / 2;
  if (complex(sourceSignal)) {
    assert(low < 0 && high > 0 && Math.abs(low + high) <= tolerance &&
      Math.abs(low + half) <= tolerance && Math.abs(high - half) <= tolerance,
    `${label}: complex Persistence frequency axis must be centered full two-sided domain`);
  } else {
    assert(Math.abs(low) <= tolerance && Math.abs(high - half) <= tolerance,
      `${label}: real Persistence frequency axis must be exact full one-sided 0..Nyquist domain`);
  }
}

async function restoreMembership(page, config, originalNames, log) {
  const wanted = new Set(originalNames);
  for (const row of await signalRowsState(page, config)) {
    if (wanted.has(row.name) && !row.checked) await setMembership(page, config, row.name, true, log, `cleanup re-add ${row.name}`);
  }
  for (const row of await signalRowsState(page, config)) {
    if (!wanted.has(row.name) && row.checked) await setMembership(page, config, row.name, false, log, `cleanup remove ${row.name}`);
  }
}

async function testTypedPersistence({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("open Persistence and capture exact active Display baseline", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const snapshot = await state(page);
      original.active = snapshot.active_display_id;
      original.count = (snapshot.displays || []).length;
      original.plot = await id(page, config, "plotTypeSelect").inputValue();
      original.source = source(snapshot);
      original.row = snapshot.row_selected_signal;
      original.membership = (await signalRowsState(page, config)).filter(function (row) { return row.checked; }).map(function (row) { return row.name; });
      assert(original.active && original.source && original.membership.length,
        "C18 fixture requires a nonempty active Display and analysis source");
    });

    await step("real source renders one-sided typed Persistence through one active heatmap", async function () {
      let snapshot = await selectPlot(page, config, "persistence", log, "open A Persistence");
      const real = (snapshot.signals || []).find(function (item) { return !complex(item); });
      assert(real, "C18 fixture requires a real signal");
      snapshot = await setMembership(page, config, real.name, true, log, `make real source visible ${real.name}`);
      snapshot = await selectSource(page, config, real.name, log, `select real Persistence source ${real.name}`);
      const plot = await assertPersistence(page, config, snapshot, assert, "initial Persistence");
      const analysis = signal(snapshot, source(snapshot));
      original.real = real.name;
      assert(analysis && !complex(analysis), "C18 real-source transition must select real analysis source");
      assertTopology(assert, plot, analysis, "initial real Persistence");
    });

    await step("multiple visible signals leave Persistence bound only to analysis source", async function () {
      let snapshot = await state(page);
      const alternate = (snapshot.signals || []).find(function (item) { return item.name !== source(snapshot); });
      if (!alternate) { log("multi-visible/source check skipped: fixture has no alternate signal"); return; }
      snapshot = await setMembership(page, config, alternate.name, true, log, `add alternate ${alternate.name}`);
      const display = active(snapshot);
      assert(display.visible_signals.length >= 2 && source(snapshot) === original.real,
        "adding secondary membership must not replace Persistence analysis source");
      let plot = await assertPersistence(page, config, snapshot, assert, "multiple visible initial source");
      assert(plot.signal !== alternate.name, "secondary visible signal must not create a second Persistence heatmap");
      snapshot = await selectSource(page, config, alternate.name, log, `select alternate Persistence source ${alternate.name}`);
      plot = await assertPersistence(page, config, snapshot, assert, "alternate Persistence source");
      assert(plot.signal === alternate.name, "row selection of visible alternate must drive Persistence source");
      assertTopology(assert, plot, alternate, "alternate Persistence topology");
      original.alternate = alternate.name;
    });

    await step("conditional complex source has centered full Persistence axis", async function () {
      const snapshot = await state(page);
      const complexSignal = (snapshot.signals || []).find(function (item) { return complex(item) && active(snapshot).visible_signals.indexOf(item.name) >= 0; });
      if (!complexSignal) { log("complex topology check skipped: fixture has no visible complex signal"); return; }
      const changed = await selectSource(page, config, complexSignal.name, log, `select complex Persistence source ${complexSignal.name}`);
      assertTopology(assert, await assertPersistence(page, config, changed, assert, "complex Persistence"), complexSignal, "complex Persistence");
      original.complex = complexSignal.name;
    });

    await step("Display B remains independent and A Clear/re-add restores typed source", async function () {
      await selectSource(page, config, original.real, log, "restore real A source before Display B");
      const create = waitForApi(page, config, config.app.api.displays, "POST");
      await id(page, config, "addDisplay").click({ timeout: TIMEOUT });
      const response = await create;
      if (!response.ok()) throw new Error("create Display B failed");
      await waitForSettled(page, config);
      original.created = (await state(page)).active_display_id;
      const b = await selectPlot(page, config, "persistence", log, "open B Persistence");
      await assertPersistence(page, config, b, assert, "Display B Persistence");
      const a = await selectDisplay(page, config, original.active, log, "return A Persistence");
      assert(source(a) === original.real, "Display B must not change A analysis source");
      await assertPersistence(page, config, a, assert, "A after B");

      const cleared = await mutation(page, config, async function () {
        await id(page, config, "displayOverflowTrigger").click({ timeout: TIMEOUT });
        await id(page, config, "clearDisplayAction").click({ timeout: TIMEOUT });
      }, log, "clear A Persistence");
      const empty = persistence(cleared);
      assert(!source(cleared) && empty && empty.type === "heatmap" && empty.x.length === 0 && empty.y.length === 0 && empty.z.length === 0,
        "Clear must publish the unchanged empty Persistence wire with no analysis source");
      assert(await page.locator(testIdSelector(config.app.testIds.emptyDisplay.plot)).isVisible(),
        "Clear must show active Display empty state instead of a stale Persistence heatmap");
      const readded = await setMembership(page, config, original.real, true, log, `re-add real Persistence source ${original.real}`);
      assert(source(readded) === original.real, "first re-add must restore real analysis source");
      await assertPersistence(page, config, readded, assert, "re-added Persistence source");
      if (original.alternate) {
        await setMembership(page, config, original.alternate, true, log, `restore alternate ${original.alternate}`);
        await selectSource(page, config, original.alternate, log, `re-switch Persistence source ${original.alternate}`);
        await assertPersistence(page, config, await state(page), assert, "re-switched Persistence source");
      }
    });
  } finally {
    try {
      if (original.created) {
        await selectDisplay(page, config, original.created, log, "cleanup select B");
        const close = waitForApi(page, config, config.app.api.displays, "POST");
        await page.locator(testIdSelector(`close-display-${original.created}`)).click({ timeout: TIMEOUT });
        if (!(await close).ok()) throw new Error("cleanup Display B close failed");
        await waitForSettled(page, config);
      }
      if (original.active) {
        await selectDisplay(page, config, original.active, log, "cleanup return A");
        await restoreMembership(page, config, original.membership, log);
        await selectSource(page, config, original.source, log, "cleanup analysis source");
        const row = (await signalRowsState(page, config)).find(function (item) { return item.name === original.row; });
        if (row && !row.rowSelected) await mutation(page, config, function () { return page.locator(testIdSelector(row.id)).click({ timeout: TIMEOUT }); }, log, "cleanup row selection");
        await selectPlot(page, config, original.plot, log, "cleanup original plot");
        const final = await state(page);
        const membership = (await signalRowsState(page, config)).filter(function (item) { return item.checked; }).map(function (item) { return item.name; });
        assert(final.active_display_id === original.active && (final.displays || []).length === original.count &&
          same(membership, original.membership) && source(final) === original.source &&
          final.row_selected_signal === original.row && await id(page, config, "plotTypeSelect").inputValue() === original.plot,
        "cleanup must restore exact active/count/membership/source/row/plot baseline");
      }
    } catch (error) {
      log(`cleanup typed Persistence: ${error.message}`);
      throw error;
    }
  }
}

testTypedPersistence.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "graph-output-zone", "typed-persistence"];
module.exports = testTypedPersistence;
