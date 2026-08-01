"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { assertNoPreparingPlaceholders, endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;
const DEFAULT = { leakage: 0.5 };
const VIEW_KEYS = ["active_plot", "analysis_signal", "measurement_kinds", "peaks_enabled", "persistence_settings", "row_selected_signal", "spectrogram_settings", "spectrum_settings", "state_revision", "time_limits", "visible_signals"];

function id(page, config, key) { return page.locator(testIdSelector(config.app.testIds[key])); }
function same(left, right) { return JSON.stringify(left || null) === JSON.stringify(right || null); }
function active(snapshot) { return (snapshot.displays || []).find(function (display) { return display.id === snapshot.active_display_id; }); }
function source(snapshot) { const display = active(snapshot); return display && display.analysis_signal || ""; }
function settings(snapshot) { return snapshot && snapshot.persistence_settings; }
function wire(snapshot) { return snapshot && snapshot.plot_payload && snapshot.plot_payload.persistence || snapshot && snapshot.plots && snapshot.plots.persistence; }
function complex(signal) { return /complex|комплекс/i.test(String(signal && signal.data_type || "")); }
function sourceSignal(snapshot) { return (snapshot.signals || []).find(function (signal) { return signal.name === source(snapshot); }); }
async function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }

function requestBody(request, label) {
  try { return JSON.parse(request.postData() || "{}"); } catch (error) { throw new Error(`${label}: /api/view body is not JSON: ${error.message}`); }
}

function exactSettings(assert, snapshot, expected, label) {
  const display = active(snapshot), value = settings(snapshot);
  assert(value && Object.keys(value).length === 1 && Object.keys(value)[0] === "leakage" && same(value, expected),
    `${label}: root persistence_settings must be exact ${JSON.stringify(expected)}`);
  assert(display && display.persistence_settings && same(display.persistence_settings, expected) &&
    Object.keys(display.persistence_settings).length === 1 && Object.keys(display.persistence_settings)[0] === "leakage",
  `${label}: active Display must mirror exact one-key persistence_settings`);
}

function signature(snapshot) {
  const plot = wire(snapshot) || {};
  return { x: JSON.stringify(plot.x || []), y: JSON.stringify(plot.y || []), z: JSON.stringify(plot.z || []), signal: plot.signal || "" };
}
function otherPlotSignature(snapshot, name) {
  const plot = snapshot && snapshot.plot_payload && snapshot.plot_payload[name] || snapshot && snapshot.plots && snapshot.plots[name] || {};
  return JSON.stringify({ x: plot.x || [], y: plot.y || [], z: plot.z || [], traces: plot.traces || [], series: plot.series || [] });
}

function assertTopology(assert, plot, signal, label) {
  const x = plot.x || [], rate = Number(signal && signal.sample_rate_hz), half = rate / 2;
  const tolerance = Math.max(1e-9, rate * 1e-6);
  assert(x.length && Number.isFinite(rate), `${label}: source sample rate and frequency axis are required`);
  if (complex(signal)) {
    assert(x[0] < 0 && x[x.length - 1] > 0 && Math.abs(x[0] + half) <= tolerance && Math.abs(x[x.length - 1] - half) <= tolerance,
      `${label}: complex Persistence must retain centered full topology`);
  } else {
    assert(Math.abs(x[0]) <= tolerance && Math.abs(x[x.length - 1] - half) <= tolerance,
      `${label}: real Persistence must retain one-sided full topology`);
  }
}

async function rendered(page, config, assert, label) {
  await page.waitForFunction(function (selector) {
    const host = document.querySelector(selector), traces = host && (host.data || host._fullData || []);
    return host && host.getAttribute("data-plot-ready") === "true" && Array.isArray(traces) &&
      traces.filter(function (trace) { return trace.type === "heatmap"; }).length === 1;
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  await assertNoPreparingPlaceholders(page, assert);
  return id(page, config, "activePlotHost").evaluate(function (host) {
    const heatmaps = (host.data || host._fullData || []).filter(function (trace) { return trace.type === "heatmap"; });
    const trace = heatmaps[0];
    return { count: heatmaps.length, x: trace && trace.x || [], y: trace && trace.y || [], z: trace && trace.z || [] };
  });
}

async function assertPersistence(assert, page, config, snapshot, label) {
  const plot = wire(snapshot), signal = sourceSignal(snapshot), visual = await rendered(page, config, assert, label);
  assert(plot && plot.type === "heatmap" && plot.signal === source(snapshot) && signal,
    `${label}: Persistence wire must belong only to active analysis source`);
  assert(Array.isArray(plot.x) && Array.isArray(plot.y) && Array.isArray(plot.z) && plot.x.length && plot.y.length &&
    plot.z.length === plot.y.length && plot.z.every(function (row) { return Array.isArray(row) && row.length === plot.x.length; }),
  `${label}: Persistence must remain a nonempty power×frequency heatmap`);
  assert(plot.x.every(Number.isFinite) && plot.y.every(Number.isFinite) && plot.z.every(function (row) { return row.every(Number.isFinite); }),
    `${label}: Persistence wire must remain finite`);
  assert(visual.count === 1 && same(visual.x, plot.x) && same(visual.y, plot.y) && same(visual.z, plot.z),
    `${label}: exactly one Plotly heatmap must agree with Persistence payload`);
  assertTopology(assert, plot, signal, label);
  return signature(snapshot);
}

async function mutation(page, config, action, log, label, expected, status) {
  const before = (await state(page)).state_revision, requests = [], started = Date.now();
  const expectedStatus = status || 200;
  const capture = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request);
  };
  page.on("request", capture);
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await action();
    const response = await responsePromise, snapshot = await responseJson(response, label);
    performanceLog(log, label, Date.now() - started, undefined, `HTTP ${response.status()}; ${requests.length} request(s)`);
    assertRequest(response.status() === expectedStatus && requests.length === 1, `${label}: must make exactly one HTTP ${expectedStatus} /api/view request`);
    if (expected) {
      const body = requestBody(requests[0], label);
      assertRequest(same(Object.keys(body).sort(), VIEW_KEYS) && same(body.persistence_settings, expected) && Object.keys(body.persistence_settings || {}).length === 1,
        `${label}: request must carry the exact current full view body and one-key persistence_settings`);
    }
    if (expectedStatus === 200) assertRequest(snapshot.state_revision === before + 1, `${label}: accepted mutation must increment revision once`);
    if (expectedStatus !== 200) assertRequest((await state(page)).state_revision === before, `${label}: rejected mutation must preserve revision`);
    await waitForSettled(page, config);
    return snapshot;
  } finally { page.off("request", capture); }
}

function assertRequest(ok, message) { if (!ok) throw new Error(message); }
async function selectPlot(page, config, plot, log, label) { if (await id(page, config, "plotTypeSelect").inputValue() !== plot) return mutation(page, config, function () { return id(page, config, "plotTypeSelect").selectOption(plot); }, log, label); return state(page); }
async function selectDisplay(page, config, displayId, log, label) {
  if ((await state(page)).active_display_id === displayId) return state(page);
  const started = Date.now(), responsePromise = waitForApi(page, config, config.app.api.displays, "POST");
  await page.locator(testIdSelector(`display-tab-${displayId}`)).click({ timeout: TIMEOUT });
  const response = await responsePromise;
  assertRequest(response.ok(), `${label}: Display selection failed with HTTP ${response.status()}`);
  await waitForSettled(page, config);
  performanceLog(log, label, Date.now() - started, undefined, `HTTP ${response.status()}`);
  return state(page);
}
async function setMembership(page, config, name, checked, log, label) {
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === name; });
  if (!row || !row.checkboxTestId) throw new Error(`${label}: membership checkbox is unavailable`);
  if (Boolean(row.checked) === checked) return state(page);
  return mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(checked, { timeout: TIMEOUT }); }, log, label);
}
async function selectSource(page, config, name, log, label) {
  if (source(await state(page)) === name) return state(page);
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === name; });
  if (!row || !row.checked) throw new Error(`${label}: visible source row is unavailable`);
  return mutation(page, config, function () { return page.locator(testIdSelector(row.id)).click({ timeout: TIMEOUT }); }, log, label);
}
async function setLeakage(page, config, value, log, label, expected, status) {
  const input = id(page, config, "persistenceLeakageInput");
  await input.fill(String(value));
  return mutation(page, config, function () { return input.dispatchEvent("change"); }, log, label, expected, status);
}

async function noRequest(page, config, action, accepted, assert, log, label) {
  const before = (await state(page)).state_revision, requests = [], started = Date.now();
  const capture = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request);
  };
  page.on("request", capture);
  try {
    await action();
    await page.waitForFunction(function (args) {
      const shell = document.querySelector(args.shell), error = document.querySelector(args.error), input = document.querySelector(args.input);
      return shell && Number(shell.getAttribute("data-state-revision")) === args.revision &&
        (error && !error.hidden || input && input.value === args.accepted);
    }, { shell: testIdSelector(config.app.testIds.shell), error: testIdSelector(config.app.testIds.persistenceLeakageError), input: testIdSelector(config.app.testIds.persistenceLeakageInput), revision: before, accepted: String(accepted.leakage) }, { timeout: TIMEOUT });
    assert(requests.length === 0 && (await state(page)).state_revision === before, `${label}: local edit must not request or revise state`);
    performanceLog(log, label, Date.now() - started, undefined, "zero /api/view; revision unchanged");
    return {
      errorVisible: await id(page, config, "persistenceLeakageError").isVisible(),
      input: await id(page, config, "persistenceLeakageInput").inputValue(),
      value: (await id(page, config, "persistenceLeakageValue").textContent()).trim(),
    };
  } finally { page.off("request", capture); }
}

async function restoreMembership(page, config, names, log) {
  const wanted = new Set(names || []);
  for (const row of await signalRowsState(page, config)) if (wanted.has(row.name) && !row.checked) await setMembership(page, config, row.name, true, log, `cleanup add ${row.name}`);
  for (const row of await signalRowsState(page, config)) if (!wanted.has(row.name) && row.checked) await setMembership(page, config, row.name, false, log, `cleanup remove ${row.name}`);
}

async function testPersistenceLeakage({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("capture exact baseline and open Persistence Leakage", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const opened = await state(page);
      Object.assign(original, { active: opened.active_display_id, count: (opened.displays || []).length, plot: await id(page, config, "plotTypeSelect").inputValue(), source: source(opened), row: opened.row_selected_signal, membership: (await signalRowsState(page, config)).filter(function (row) { return row.checked; }).map(function (row) { return row.name; }), settings: opened.persistence_settings, spectrum: opened.spectrum_settings, spectrogram: opened.spectrogram_settings });
      const real = (opened.signals || []).find(function (item) { return !complex(item); });
      assert(real, "C19 fixture requires a real signal");
      await setMembership(page, config, real.name, true, log, `make real source visible ${real.name}`);
      await selectSource(page, config, real.name, log, `select real Persistence source ${real.name}`);
      const snapshot = await selectPlot(page, config, "persistence", log, "open A Persistence Leakage");
      original.real = real.name;
      exactSettings(assert, snapshot, DEFAULT, "Persistence default");
      assert(await id(page, config, "persistenceSettings").isVisible() && !await id(page, config, "persistenceLeakageInput").isDisabled() && Number(await id(page, config, "persistenceLeakageInput").inputValue()) === 0.5,
        "Persistence Leakage controls must expose enabled normalized default 0.5");
      original.defaultWire = await assertPersistence(assert, page, config, snapshot, "Persistence default");
      original.spectrumWire = otherPlotSignature(snapshot, "spectrum");
      original.spectrogramWire = otherPlotSignature(snapshot, "spectrogram");
    });

    await step("endpoints change provider-derived power or occurrence without changing topology", async function () {
      const zero = await setLeakage(page, config, 0, log, "set Persistence Leakage 0", { leakage: 0 });
      exactSettings(assert, zero, { leakage: 0 }, "Persistence Leakage 0");
      const zeroWire = await assertPersistence(assert, page, config, zero, "Persistence Leakage 0");
      assert(zeroWire.y !== original.defaultWire.y || zeroWire.z !== original.defaultWire.z,
        "Leakage 0 must change provider-derived power axis or occurrence, not topology alone");
      const one = await setLeakage(page, config, 1, log, "set Persistence Leakage 1", { leakage: 1 });
      exactSettings(assert, one, { leakage: 1 }, "Persistence Leakage 1");
      const oneWire = await assertPersistence(assert, page, config, one, "Persistence Leakage 1");
      assert(oneWire.y !== zeroWire.y || oneWire.z !== zeroWire.z,
        "Leakage 1 must change provider-derived power axis or occurrence from Leakage 0");
      assert(same(one.spectrum_settings, original.spectrum) && same(one.spectrogram_settings, original.spectrogram) &&
        otherPlotSignature(one, "spectrum") === original.spectrumWire && otherPlotSignature(one, "spectrogram") === original.spectrogramWire,
      "Persistence Leakage endpoint must not change Spectrum/Spectrogram settings or payloads");
      original.accepted = { leakage: 1 };
    });

    await step("equal/local-invalid, 422 and bounded second-409 restore accepted Leakage", async function () {
      const equal = await noRequest(page, config, async function () { const input = id(page, config, "persistenceLeakageInput"); await input.fill("1"); await input.dispatchEvent("change"); }, original.accepted, assert, log, "equal Persistence Leakage no-op");
      assert(!equal.errorVisible && equal.input === "1" && equal.value === "1", "equal canonical Leakage must remain visibly accepted without error");
      const invalid = await noRequest(page, config, async function () { const input = id(page, config, "persistenceLeakageInput"); await input.fill("1.01"); await input.dispatchEvent("change"); }, original.accepted, assert, log, "invalid Persistence Leakage no-op");
      assert(invalid.errorVisible || invalid.input === "1" && invalid.value === "1", "invalid Leakage must expose an inline error or the native range's visible canonical correction");
      let saw422 = false;
      await page.route("**/api/view*", async function (route) { if (!saw422 && route.request().method() === "POST") { saw422 = true; await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ ok: false, error: { message: "synthetic persistence leakage rejection" } }) }); return; } await route.continue(); });
      try { await setLeakage(page, config, 0, log, "synthetic Persistence Leakage 422", { leakage: 0 }, 422); } finally { await page.unroute("**/api/view*"); }
      const after422 = await state(page);
      assert(saw422 && same(settings(after422), original.accepted) && Number(await id(page, config, "persistenceLeakageInput").inputValue()) === 1 && await id(page, config, "persistenceLeakageError").isVisible(),
        "422 must restore accepted Leakage and show stable error");
      const revision = after422.state_revision, bodies = []; let count409 = 0;
      await page.route("**/api/view*", async function (route) { if (route.request().method() === "POST") { bodies.push(requestBody(route.request(), "synthetic Persistence Leakage 409")); count409 += 1; if (count409 <= 2) { await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ current: await state(page) }) }); return; } } await route.continue(); });
      try { const input = id(page, config, "persistenceLeakageInput"); await input.fill("0"); await input.dispatchEvent("change"); await page.waitForFunction(function (selector) { const error = document.querySelector(selector); return error && !error.hidden && error.textContent.trim(); }, testIdSelector(config.app.testIds.persistenceLeakageError), { timeout: TIMEOUT }); } finally { await page.unroute("**/api/view*"); }
      const after409 = await state(page);
      assert(count409 === 2 && bodies.every(function (body) { return same(Object.keys(body).sort(), VIEW_KEYS) && same(body.persistence_settings, { leakage: 0 }) && Object.keys(body.persistence_settings || {}).length === 1; }) && after409.state_revision === revision && same(settings(after409), original.accepted) && Number(await id(page, config, "persistenceLeakageInput").inputValue()) === 1 && await id(page, config, "persistenceLeakageError").isVisible(),
        "second 409 must stop replay, restore accepted Leakage and show stable error");
    });

    await step("Spectrum/Spectrogram remain independent and A/B/Clear/source retain Persistence intent", async function () {
      const before = await state(page);
      assert(same(before.spectrum_settings, original.spectrum) && same(before.spectrogram_settings, original.spectrogram), "Persistence mutations must not alter Spectrum/Spectrogram settings");
      const create = waitForApi(page, config, config.app.api.displays, "POST");
      await id(page, config, "addDisplay").click({ timeout: TIMEOUT });
      assertRequest((await create).ok(), "create Display B failed");
      await waitForSettled(page, config);
      original.created = (await state(page)).active_display_id;
      const b = await selectPlot(page, config, "persistence", log, "open B Persistence Leakage");
      exactSettings(assert, b, DEFAULT, "Display B default Persistence Leakage");
      await assertPersistence(assert, page, config, b, "Display B Persistence Leakage");
      const a = await selectDisplay(page, config, original.active, log, "return A Persistence Leakage");
      exactSettings(assert, a, original.accepted, "Display A local Persistence Leakage");
      const cleared = await mutation(page, config, async function () { await id(page, config, "displayOverflowTrigger").click({ timeout: TIMEOUT }); await id(page, config, "clearDisplayAction").click({ timeout: TIMEOUT }); }, log, "clear A Persistence Leakage");
      exactSettings(assert, cleared, original.accepted, "Clear preserves Persistence Leakage");
      assert(!source(cleared) && await id(page, config, "persistenceLeakageInput").isDisabled() && Number(await id(page, config, "persistenceLeakageInput").inputValue()) === 1,
        "Clear must retain accepted Leakage while disabling no-source control");
      const readded = await setMembership(page, config, original.real, true, log, `re-add real source ${original.real}`);
      exactSettings(assert, readded, original.accepted, "re-add preserves Persistence Leakage");
      await assertPersistence(assert, page, config, readded, "re-added Persistence Leakage");
      const alternate = (readded.signals || []).find(function (item) { return item.name !== source(readded); });
      if (alternate) {
        await setMembership(page, config, alternate.name, true, log, `add alternate source ${alternate.name}`);
        const switched = await selectSource(page, config, alternate.name, log, `switch Persistence source ${alternate.name}`);
        exactSettings(assert, switched, original.accepted, "source switch preserves Persistence Leakage");
        await assertPersistence(assert, page, config, switched, "multi-visible source-only Persistence Leakage");
      } else log("multi-visible source switch skipped: fixture has no alternate signal");
      const after = await state(page);
      assert(same(after.spectrum_settings, original.spectrum) && same(after.spectrogram_settings, original.spectrogram), "A/B/Clear/source Persistence flow must not couple Spectrum/Spectrogram settings");
    });
  } finally {
    try {
      if (original.created) {
        await selectDisplay(page, config, original.created, log, "cleanup select B");
        const close = waitForApi(page, config, config.app.api.displays, "POST");
        await page.locator(testIdSelector(`close-display-${original.created}`)).click({ timeout: TIMEOUT });
        assertRequest((await close).ok(), "cleanup Display B close failed");
        await waitForSettled(page, config);
      }
      if (original.active) {
        await selectDisplay(page, config, original.active, log, "cleanup return A");
        await restoreMembership(page, config, original.membership, log);
        await selectSource(page, config, original.source, log, "cleanup analysis source");
        const row = (await signalRowsState(page, config)).find(function (item) { return item.name === original.row; });
        if (row && !row.rowSelected) await mutation(page, config, function () { return page.locator(testIdSelector(row.id)).click({ timeout: TIMEOUT }); }, log, "cleanup row selection");
        if (original.accepted && !same(settings(await state(page)), original.settings)) { await selectPlot(page, config, "persistence", log, "cleanup Persistence Leakage"); await setLeakage(page, config, original.settings.leakage, log, "restore Persistence Leakage", original.settings); }
        await selectPlot(page, config, original.plot, log, "cleanup original plot");
        const final = await state(page), membership = (await signalRowsState(page, config)).filter(function (item) { return item.checked; }).map(function (item) { return item.name; });
        assert(final.active_display_id === original.active && (final.displays || []).length === original.count && same(membership, original.membership) && source(final) === original.source && final.row_selected_signal === original.row && same(settings(final), original.settings) && same(final.spectrum_settings, original.spectrum) && same(final.spectrogram_settings, original.spectrogram) && await id(page, config, "plotTypeSelect").inputValue() === original.plot,
          "cleanup must restore exact active/count/membership/source/row/settings/plot baseline");
      }
    } catch (error) { log(`cleanup Persistence Leakage: ${error.message}`); throw error; }
  }
}

testPersistenceLeakage.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "graph-output-zone", "typed-persistence", "persistence-leakage"];
module.exports = testPersistenceLeakage;
