"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { assertNoPreparingPlaceholders, endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;
const DEFAULT = { overlap_percent: 50, leakage: 0.5, frequency_limits: null };

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function shell(page, config) { return id(page, config, "shell"); }
function same(left, right) { return JSON.stringify(left || null) === JSON.stringify(right || null); }
function activeDisplay(snapshot) { return (snapshot.displays || []).find(function (display) { return display.id === snapshot.active_display_id; }); }
function settings(snapshot) { return snapshot && snapshot.spectrogram_settings; }
function analysisSource(snapshot) { const display = activeDisplay(snapshot); return display && display.analysis_signal || ""; }
async function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }

function requestBody(request, label) {
  try { return JSON.parse(request.postData() || "{}"); } catch (error) { throw new Error(`${label}: /api/view request body is not JSON: ${error.message}`); }
}
function assertExactSettings(assert, snapshot, expected, label) {
  const display = activeDisplay(snapshot), root = settings(snapshot);
  assert(display && display.spectrogram_settings && same(root, display.spectrogram_settings), `${label}: root and active Display must mirror spectrogram_settings`);
  assert(root && Object.keys(root).sort().join(",") === "frequency_limits,leakage,overlap_percent", `${label}: spectrogram_settings must have exactly three keys`);
  assert(same(root, expected), `${label}: unexpected exact three-key settings ${JSON.stringify(root)}`);
}
function wire(snapshot, label) {
  const payload = snapshot && snapshot.plot_payload && snapshot.plot_payload.spectrogram || snapshot && snapshot.plots && snapshot.plots.spectrogram;
  if (!payload || !Array.isArray(payload.x) || !Array.isArray(payload.z)) throw new Error(`${label}: Spectrogram payload must expose x and z`);
  return payload;
}
function wireSignature(snapshot, label) {
  const payload = wire(snapshot, label);
  return { x: JSON.stringify(payload.x), z: JSON.stringify(payload.z), y: JSON.stringify(payload.y || []), signal: payload.signal || "" };
}
function assertPowerOnlyChange(assert, before, after, label) {
  assert(before.x === after.x && before.y === after.y, `${label}: Leakage must keep frequency and time centers stable`);
  assert(before.z !== after.z, `${label}: Leakage must change provider-derived raw power z`);
}

async function mutation(page, config, action, log, label, expectedStatus, expectedSettings) {
  const before = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await action();
    const response = await responsePromise, payload = await responseJson(response, label);
    performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (response.status() !== expectedStatus || requests.length !== 1) throw new Error(`${label}: expected exactly one HTTP ${expectedStatus} /api/view request`);
    if (expectedSettings) {
      const body = requestBody(requests[0], label);
      if (!same(body.spectrogram_settings, expectedSettings) || Object.keys(body.spectrogram_settings || {}).length !== 3) {
        throw new Error(`${label}: request must send the exact full three-key spectrogram_settings body`);
      }
    }
    if (expectedStatus === 200 && payload.state_revision !== before + 1) throw new Error(`${label}: valid mutation must increment revision exactly once`);
    if (expectedStatus !== 200 && Number(await shell(page, config).getAttribute("data-state-revision")) !== before) throw new Error(`${label}: rejection must preserve revision`);
    await waitForSettled(page, config);
    return payload;
  } finally { page.off("request", onRequest); }
}
async function selectPlot(page, config, plot, log, label) {
  const control = id(page, config, "plotTypeSelect");
  if (await control.inputValue() === plot) return null;
  return mutation(page, config, function () { return control.selectOption(plot); }, log, label, 200);
}
async function selectDisplay(page, config, displayId, log, label) {
  if (await shell(page, config).getAttribute("data-active-display-id") === displayId) return;
  const startedAt = Date.now(), responsePromise = waitForApi(page, config, config.app.api.displays, "POST");
  await page.locator(testIdSelector(`display-tab-${displayId}`)).click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`${label}: Display select HTTP ${response.status()}`);
  await waitForSettled(page, config); performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}`);
}
async function setLeakage(page, config, value, log, label, expectedStatus, expected) {
  const input = id(page, config, "spectrogramLeakageInput");
  await input.fill(String(value));
  return mutation(page, config, function () { return input.dispatchEvent("change"); }, log, label, expectedStatus, expected);
}
async function selectSource(page, config, source, log, label) {
  if (analysisSource(await state(page)) === source) return;
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === source; });
  if (!row) throw new Error(`${label}: source row is absent`);
  await mutation(page, config, function () { return page.locator(testIdSelector(row.id)).click(); }, log, label, 200);
  if (analysisSource(await state(page)) !== source) throw new Error(`${label}: source must be activeDisplay.analysis_signal, not merely row selection`);
}
async function waitForHeatmap(page, config, assert, label) {
  await page.waitForFunction(function (selector) {
    const host = document.querySelector(selector), traces = host && (host.data || host._fullData || []);
    return host && host.getAttribute("data-plot-ready") === "true" && Array.isArray(traces) && traces.some(function (trace) { return trace.type === "heatmap"; });
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  assert(await id(page, config, "activePlotHost").count() === 1, `${label}: one active Plotly host is required`);
  assert(await page.locator("[data-settings-tab]").count() === 3, `${label}: Leakage must not create a fourth settings tab`);
  await assertNoPreparingPlaceholders(page, assert);
}
async function assertNoop(page, config, value, assert, log) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    const input = id(page, config, "spectrogramLeakageInput"); await input.fill(String(value)); await input.dispatchEvent("change"); await page.waitForTimeout(100);
    assert(requests.length === 0 && Number(await shell(page, config).getAttribute("data-state-revision")) === revision, "equal Spectrogram Leakage edit must be a local no-op");
    performanceLog(log, "equal Spectrogram Leakage", Date.now() - startedAt, undefined, "zero /api/view; revision unchanged");
  } finally { page.off("request", onRequest); }
}
async function assertLocalInvalidIfReachable(page, config, value, canonical, assert, log) {
  const input = id(page, config, "spectrogramLeakageInput");
  if (await input.isDisabled()) { log("local invalid Spectrogram Leakage skipped: control disabled"); return; }
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    await input.fill(String(value)); await input.dispatchEvent("change"); await page.waitForTimeout(100);
    if (requests.length === 0) {
      assert(Number(await shell(page, config).getAttribute("data-state-revision")) === revision, "local invalid Leakage must preserve revision");
      const displayed = Number(await input.inputValue());
      if (displayed === Number(canonical.leakage)) {
        performanceLog(log, `clamped Spectrogram Leakage ${value}`, Date.now() - startedAt, undefined, "zero /api/view; native range clamp/no-op");
      } else {
        assert(await id(page, config, "spectrogramLeakageError").isVisible(), "reachable local invalid Leakage must show its stable error");
        assert(displayed === Number(value), "reachable local invalid Leakage must retain its invalid draft for correction");
        performanceLog(log, `invalid local Spectrogram Leakage ${value}`, Date.now() - startedAt, undefined, "zero /api/view; local draft error");
      }
    } else {
      log(`local invalid Spectrogram Leakage ${value}: control delegates validation to server; covered by synthetic 422`);
    }
  } finally { page.off("request", onRequest); }
}
async function restoreMembership(page, config, names, log) {
  const expected = new Set(names || []);
  for (const row of await signalRowsState(page, config)) if (expected.has(row.name) && !row.checked) await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(true); }, log, `cleanup add ${row.name}`, 200);
  for (const row of await signalRowsState(page, config)) if (!expected.has(row.name) && row.checked) await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(false); }, log, `cleanup remove ${row.name}`, 200);
}

async function testSpectrogramLeakage({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("open one-host Spectrogram and capture exact Display A state", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const snapshot = await state(page); original.active = snapshot.active_display_id; original.plot = await id(page, config, "plotTypeSelect").inputValue(); original.settings = settings(snapshot); original.source = analysisSource(snapshot); original.rows = await signalRowsState(page, config); original.membership = original.rows.filter(function (row) { return row.checked; }).map(function (row) { return row.name; }); original.spectrumLeakage = Number(await id(page, config, "spectrumLeakageInput").inputValue());
      const opened = await selectPlot(page, config, "spectrogram", log, "open A Spectrogram") || await state(page);
      assertExactSettings(assert, opened, DEFAULT, "default Spectrogram Leakage"); await waitForHeatmap(page, config, assert, "default Spectrogram Leakage"); original.defaultWire = wireSignature(opened, "default Spectrogram Leakage");
      assert(Number(await id(page, config, "spectrogramLeakageInput").inputValue()) === 0.5, "new nonempty Spectrogram must explicitly show normalized default 0.5");
    });
    await step("endpoints, no-op, reachable local invalid and provider power change", async function () {
      const zero = await setLeakage(page, config, 0, log, "set Spectrogram Leakage 0", 200, { overlap_percent: 50, leakage: 0, frequency_limits: null }); assertExactSettings(assert, zero, { overlap_percent: 50, leakage: 0, frequency_limits: null }, "Leakage 0"); await waitForHeatmap(page, config, assert, "Leakage 0"); const zeroWire = wireSignature(zero, "Leakage 0"); assertPowerOnlyChange(assert, original.defaultWire, zeroWire, "Leakage 0.5 to 0");
      const one = await setLeakage(page, config, 1, log, "set Spectrogram Leakage 1", 200, { overlap_percent: 50, leakage: 1, frequency_limits: null }); assertExactSettings(assert, one, { overlap_percent: 50, leakage: 1, frequency_limits: null }, "Leakage 1"); await waitForHeatmap(page, config, assert, "Leakage 1"); assertPowerOnlyChange(assert, zeroWire, wireSignature(one, "Leakage 1"), "Leakage 0 to 1");
      await assertNoop(page, config, 1, assert, log); await assertLocalInvalidIfReachable(page, config, 1.01, { overlap_percent: 50, leakage: 1, frequency_limits: null }, assert, log);
    });
    await step("synthetic 422 and 409 keep the exact desired three-key body", async function () {
      const before = await state(page); let rejectedBody;
      await page.route("**/api/view*", async function (route) { if (!rejectedBody && route.request().method() === "POST") { rejectedBody = requestBody(route.request(), "synthetic Leakage 422"); await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ ok: false, error: { message: "synthetic leakage rejection" } }) }); return; } await route.continue(); });
      try { await setLeakage(page, config, 0, log, "synthetic Leakage 422", 422, { overlap_percent: 50, leakage: 0, frequency_limits: null }); } finally { await page.unroute("**/api/view*"); }
      assert(same(rejectedBody && rejectedBody.spectrogram_settings, { overlap_percent: 50, leakage: 0, frequency_limits: null }) && Object.keys(rejectedBody.spectrogram_settings).length === 3, "422 must receive exact full three-key desired body"); assertExactSettings(assert, await state(page), settings(before), "synthetic Leakage 422 rollback");
      const revision = before.state_revision; let intercepted = false, replayBodies = [];
      await page.route("**/api/view*", async function (route) { if (route.request().method() === "POST") { replayBodies.push(requestBody(route.request(), "synthetic Leakage 409")); if (!intercepted) { intercepted = true; await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ current: before }) }); return; } } await route.continue(); });
      try { const input = id(page, config, "spectrogramLeakageInput"); await input.fill("0"); await input.dispatchEvent("change"); await page.waitForFunction(function (expected) { const node = document.querySelector(expected.selector); return node && Number(node.getAttribute("data-state-revision")) === expected.revision; }, { selector: testIdSelector(config.app.testIds.shell), revision: revision + 1 }, { timeout: TIMEOUT }); } finally { await page.unroute("**/api/view*"); }
      assert(intercepted && replayBodies.length === 2 && replayBodies.every(function (body) { return same(body.spectrogram_settings, { overlap_percent: 50, leakage: 0, frequency_limits: null }) && Object.keys(body.spectrogram_settings || {}).length === 3; }), "409 must replay exactly one identical full three-key desired body"); await waitForSettled(page, config);
      await setLeakage(page, config, 1, log, "restore A Leakage 1 after replay", 200, { overlap_percent: 50, leakage: 1, frequency_limits: null });
    });
    await step("Spectrum leakage independence and A/B/Clear/re-add/source lifecycle", async function () {
      const beforeSpectrum = await state(page), beforeWire = wireSignature(beforeSpectrum, "before Spectrum Leakage"), alternateSpectrum = original.spectrumLeakage === 0.25 ? 0.75 : 0.25;
      await selectPlot(page, config, "spectrum", log, "open Spectrum Leakage control");
      const independent = await mutation(page, config, async function () { const input = id(page, config, "spectrumLeakageInput"); await input.fill(String(alternateSpectrum)); await input.dispatchEvent("change"); }, log, "change independent Spectrum Leakage", 200);
      assertExactSettings(assert, independent, { overlap_percent: 50, leakage: 1, frequency_limits: null }, "Spectrum Leakage independence");
      const returned = await selectPlot(page, config, "spectrogram", log, "return to independent Spectrogram") || await state(page);
      assertExactSettings(assert, returned, { overlap_percent: 50, leakage: 1, frequency_limits: null }, "returned Spectrogram Leakage independence");
      assert(same(beforeWire.z, wireSignature(returned, "after Spectrum Leakage").z), "Spectrum Leakage must not change persisted Spectrogram raw power");
      const create = waitForApi(page, config, config.app.api.displays, "POST"); await id(page, config, "addDisplay").click(); if (!(await create).ok()) throw new Error("create Display B failed"); await waitForSettled(page, config); original.created = await shell(page, config).getAttribute("data-active-display-id"); const b = await selectPlot(page, config, "spectrogram", log, "open B Spectrogram") || await state(page); assertExactSettings(assert, b, DEFAULT, "Display B default"); await waitForHeatmap(page, config, assert, "Display B default");
      await selectDisplay(page, config, original.active, log, "return A"); assertExactSettings(assert, await state(page), { overlap_percent: 50, leakage: 1, frequency_limits: null }, "Display A local Leakage");
      const cleared = await mutation(page, config, async function () { await id(page, config, "displayOverflowTrigger").click(); await id(page, config, "clearDisplayAction").click(); }, log, "clear A Spectrogram", 200); assertExactSettings(assert, cleared, { overlap_percent: 50, leakage: 1, frequency_limits: null }, "Clear A");
      const available = (await signalRowsState(page, config)).filter(function (row) { return !row.checked && row.checkboxTestId; });
      const originalFirst = available.filter(function (row) { return original.membership.indexOf(row.name) >= 0; });
      const otherAvailable = available.filter(function (row) { return original.membership.indexOf(row.name) < 0; });
      const readd = originalFirst.concat(otherAvailable).slice(0, 2);
      if (!readd.length) throw new Error("Clear must expose a stable checkbox for re-add");
      let readded = cleared;
      for (const row of readd) {
        readded = await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(true); }, log, `re-add A signal ${row.name}`, 200);
        assertExactSettings(assert, readded, { overlap_percent: 50, leakage: 1, frequency_limits: null }, `re-add A ${row.name}`);
      }
      if (available.length >= 2) assert(readd.length === 2, "Clear must re-add two deterministic signals when the catalog has at least two");
      const alternate = (readded.signals || []).find(function (signal) { const display = activeDisplay(readded); return display.visible_signals.indexOf(signal.name) >= 0 && signal.name !== display.analysis_signal; });
      if (alternate) {
        await selectSource(page, config, alternate.name, log, "select alternate A Spectrogram source");
        const changed = await state(page); assertExactSettings(assert, changed, { overlap_percent: 50, leakage: 1, frequency_limits: null }, "source switch preservation");
        assert(wire(changed, "source switch").signal === alternate.name, "Spectrogram wire must follow activeDisplay.analysis_signal");
      } else { log("source identity switch skipped: catalog exposes fewer than two selectable signals"); }
    });
  } finally {
    try {
      if (original.created) { await selectDisplay(page, config, original.created, log, "cleanup select B"); const close = waitForApi(page, config, config.app.api.displays, "POST"); await page.locator(testIdSelector(`close-display-${original.created}`)).click(); if (!(await close).ok()) throw new Error("cleanup close B failed"); await waitForSettled(page, config); }
      if (original.active) { await selectDisplay(page, config, original.active, log, "cleanup return A"); await selectPlot(page, config, "spectrogram", log, "cleanup Spectrogram"); await restoreMembership(page, config, original.membership, log); await selectSource(page, config, original.source, log, "cleanup analysis source"); const current = await state(page); if (original.settings && !same(settings(current), original.settings)) await setLeakage(page, config, original.settings.leakage, log, "cleanup Spectrogram Leakage", 200, original.settings); await selectPlot(page, config, "spectrum", log, "open Spectrum Leakage cleanup control"); if (Number(await id(page, config, "spectrumLeakageInput").inputValue()) !== original.spectrumLeakage) await mutation(page, config, async function () { const input = id(page, config, "spectrumLeakageInput"); await input.fill(String(original.spectrumLeakage)); await input.dispatchEvent("change"); }, log, "cleanup Spectrum Leakage", 200); await selectPlot(page, config, original.plot, log, "cleanup original plot"); }
    } catch (error) { log(`cleanup Spectrogram Leakage scenario: ${error.message}`); }
  }
}

testSpectrogramLeakage.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "typed-spectrogram", "spectrogram-overlap", "spectrogram-leakage", "spectrum-settings-roi"];
module.exports = testSpectrogramLeakage;
