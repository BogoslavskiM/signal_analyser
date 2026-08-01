"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { assertNoPreparingPlaceholders, endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");
const TIMEOUT = 30000;

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function shell(page, config) { return id(page, config, "shell"); }
function activeDisplay(snapshot) { return (snapshot.displays || []).find(function (item) { return item.id === snapshot.active_display_id; }); }
function analysisSource(snapshot) { const display = activeDisplay(snapshot); return display && display.analysis_signal || ""; }
function overlap(snapshot) { return snapshot && snapshot.spectrogram_settings; }
function same(left, right) { return JSON.stringify(left || null) === JSON.stringify(right || null); }
async function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }

async function mutation(page, config, action, log, label, expectedStatus) {
  const before = Number(await shell(page, config).getAttribute("data-state-revision"));
  const requests = [];
  const onRequest = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request);
  };
  page.on("request", onRequest);
  const startedAt = Date.now();
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await action();
    const response = await responsePromise;
    const payload = await responseJson(response, label);
    performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (response.status() !== expectedStatus || requests.length !== 1) throw new Error(`${label}: expected exactly one HTTP ${expectedStatus} /api/view request`);
    if (expectedStatus === 200 && payload.state_revision !== before + 1) throw new Error(`${label}: valid mutation must increment revision exactly once`);
    if (expectedStatus === 422 && Number(await shell(page, config).getAttribute("data-state-revision")) !== before) throw new Error(`${label}: rejection must preserve revision`);
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
  const startedAt = Date.now(); const responsePromise = waitForApi(page, config, config.app.api.displays, "POST");
  await page.locator(testIdSelector(`display-tab-${displayId}`)).click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`${label}: Display select HTTP ${response.status()}`);
  await waitForSettled(page, config);
  performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}`);
}
async function selectSource(page, config, source, log, label) {
  if (analysisSource(await state(page)) === source) return;
  const target = (await signalRowsState(page, config)).find(function (row) { return row.name === source; });
  if (!target) throw new Error(`${label}: source row ${source} is absent`);
  await mutation(page, config, function () { return page.locator(testIdSelector(target.id)).click(); }, log, label, 200);
}
async function setOverlap(page, config, value, log, label, expectedStatus) {
  const input = id(page, config, "spectrogramOverlapPercentInput");
  await input.fill(String(value));
  return mutation(page, config, function () { return input.press("Enter"); }, log, label, expectedStatus);
}
function assertSettings(assert, snapshot, expected, label) {
  const display = activeDisplay(snapshot);
  assert(display && overlap(snapshot) && display.spectrogram_settings && same(overlap(snapshot), display.spectrogram_settings),
    `${label}: root and active Display must expose the same full spectrogram_settings`);
  if (expected) assert(same(overlap(snapshot), expected), `${label}: must retain the expected Overlap intent`);
}
function providerSignature(assert, snapshot, label) {
  const plot = snapshot && snapshot.plots && snapshot.plots.spectrogram;
  assert(plot && Array.isArray(plot.x) && Array.isArray(plot.z), `${label}: provider wire must expose plots.spectrogram.x/z`);
  return JSON.stringify({ x: plot.x, z: plot.z });
}
async function waitForHeatmap(page, config, assert, label) {
  await page.waitForFunction(function (selector) {
    const host = document.querySelector(selector), traces = host && (host.data || host._fullData || []);
    return host && host.getAttribute("data-plot-ready") === "true" && Array.isArray(traces) && traces.some(function (trace) { return trace.type === "heatmap"; });
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  assert(await id(page, config, "activePlotHost").count() === 1, `${label}: one active Plotly host is required`);
  assert(await page.locator("[data-settings-tab]").count() === 3, `${label}: Overlap must not create a fourth settings tab`);
  await assertNoPreparingPlaceholders(page, assert);
}
async function assertNoop(page, config, value, assert, log) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    const input = id(page, config, "spectrogramOverlapPercentInput"); await input.fill(String(value)); await input.press("Enter"); await page.waitForTimeout(100);
    assert(requests.length === 0 && Number(await shell(page, config).getAttribute("data-state-revision")) === revision, "equal Overlap edit must be a local no-op");
    performanceLog(log, "equal Spectrogram Overlap", Date.now() - startedAt, undefined, "zero /api/view; revision unchanged");
  } finally { page.off("request", onRequest); }
}
async function assertLocalInvalid(page, config, value, canonical, assert, log) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    const input = id(page, config, "spectrogramOverlapPercentInput"); await input.fill(String(value)); await input.press("Enter"); await page.waitForTimeout(100);
    assert(requests.length === 0 && Number(await shell(page, config).getAttribute("data-state-revision")) === revision, "local invalid Overlap must not send /api/view or change revision");
    assert(await id(page, config, "spectrogramOverlapPercentError").isVisible(), "local invalid Overlap must show its stable error");
    assert(Number(await input.inputValue()) === Number(canonical.overlap_percent), "local invalid Overlap must restore the previous canonical value");
    performanceLog(log, `invalid local Spectrogram Overlap ${value}`, Date.now() - startedAt, undefined, "zero /api/view; canonical rollback");
  } finally { page.off("request", onRequest); }
}
async function assertStaleReplay(page, config, action, assert, log) {
  if (config.app.supportsStaleReplay !== true) return;
  const before = await state(page), revision = before.state_revision, requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  let intercepted = false; const startedAt = Date.now();
  await page.route("**/api/view*", async function (route) {
    if (!intercepted && route.request().method() === "POST") { intercepted = true; await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ current: before }) }); return; }
    await route.continue();
  });
  page.on("request", onRequest);
  try {
    await action();
    await page.waitForFunction(function (expected) { const node = document.querySelector(expected.selector); return node && Number(node.getAttribute("data-state-revision")) === expected.revision; }, { selector: testIdSelector(config.app.testIds.shell), revision: revision + 1 }, { timeout: TIMEOUT });
    assert(intercepted && requests.length === 2, "one synthetic 409 must replay the intended view request exactly once");
    performanceLog(log, "Spectrogram Overlap 409 stale replay", Date.now() - startedAt, undefined, "one 409 + one replay");
  } finally { page.off("request", onRequest); await page.unroute("**/api/view*"); await waitForSettled(page, config); }
}
async function restoreMembership(page, config, names, log) {
  const expected = new Set(names || []);
  for (const row of await signalRowsState(page, config)) if (expected.has(row.name) && !row.checked) await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(true); }, log, `cleanup add ${row.name}`, 200);
  for (const row of await signalRowsState(page, config)) if (!expected.has(row.name) && row.checked) await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(false); }, log, `cleanup remove ${row.name}`, 200);
}

async function testSpectrogramOverlap({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("open Spectrogram and expose explicit default Overlap", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const snapshot = await state(page); original.active = snapshot.active_display_id; original.plot = await id(page, config, "plotTypeSelect").inputValue(); original.settings = overlap(snapshot); original.rows = await signalRowsState(page, config); original.membership = original.rows.filter(function (row) { return row.checked; }).map(function (row) { return row.name; }); original.source = analysisSource(snapshot);
      const spectrogram = await selectPlot(page, config, "spectrogram", log, "open A Spectrogram") || await state(page);
      assertSettings(assert, spectrogram, { overlap_percent: 50 }, "default Spectrogram Overlap");
      assert(await id(page, config, "spectrogramSettings").isVisible(), "Spectrogram must expose its Display-tab settings section");
      assert(Number(await id(page, config, "spectrogramOverlapPercentInput").inputValue()) === 50, "new nonempty Spectrogram must explicitly show 50% Overlap");
      await waitForHeatmap(page, config, assert, "default Spectrogram"); original.signature50 = providerSignature(assert, spectrogram, "default Spectrogram");
    });
    await step("valid, equal and local-invalid Overlap lifecycle", async function () {
      const zero = await setOverlap(page, config, 0, log, "set Overlap 0", 200); assertSettings(assert, zero, { overlap_percent: 0 }, "Overlap 0"); await waitForHeatmap(page, config, assert, "Overlap 0"); const signature0 = providerSignature(assert, zero, "Overlap 0");
      assert(signature0 !== original.signature50, "deterministic current fixture must change provider x/z after Overlap 50→0");
      const seventyFive = await setOverlap(page, config, 75, log, "set Overlap 75", 200); assertSettings(assert, seventyFive, { overlap_percent: 75 }, "Overlap 75"); await waitForHeatmap(page, config, assert, "Overlap 75");
      assert(providerSignature(assert, seventyFive, "Overlap 75") !== signature0, "deterministic current fixture must change provider x/z after Overlap 0→75");
      await assertNoop(page, config, 75, assert, log); await assertLocalInvalid(page, config, 75.1, { overlap_percent: 75 }, assert, log); await assertLocalInvalid(page, config, 100, { overlap_percent: 75 }, assert, log);
    });
    await step("synthetic rejection and stale replay restore intended Overlap", async function () {
      const before = await state(page); let intercepted = false;
      await page.route("**/api/view*", async function (route) { if (!intercepted && route.request().method() === "POST") { intercepted = true; await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ ok: false, code: "invalid_request", error: { message: "synthetic overlap rejection" } }) }); return; } await route.continue(); });
      try { await setOverlap(page, config, 0, log, "synthetic Overlap 422", 422); } finally { await page.unroute("**/api/view*"); }
      assert(intercepted, "synthetic 422 route must receive the one Overlap mutation"); const rejected = await state(page); assertSettings(assert, rejected, overlap(before), "synthetic Overlap 422"); assert(await id(page, config, "spectrogramOverlapPercentError").isVisible(), "422 must expose stable Overlap error"); assert(Number(await id(page, config, "spectrogramOverlapPercentInput").inputValue()) === 75, "422 must restore canonical 75% input");
      await assertStaleReplay(page, config, async function () {
        const input = id(page, config, "spectrogramOverlapPercentInput");
        await input.fill("0"); await input.press("Enter");
      }, assert, log);
      await setOverlap(page, config, 75, log, "restore A Overlap 75 after replay", 200);
    });
    await step("A/B locality, Clear/re-add and source identity", async function () {
      const create = waitForApi(page, config, config.app.api.displays, "POST"); await id(page, config, "addDisplay").click(); const response = await create; if (!response.ok()) throw new Error(`create Display B HTTP ${response.status()}`); await waitForSettled(page, config);
      original.created = await shell(page, config).getAttribute("data-active-display-id"); await selectPlot(page, config, "spectrogram", log, "open B Spectrogram"); const b = await state(page); assertSettings(assert, b, { overlap_percent: 50 }, "Display B default"); await waitForHeatmap(page, config, assert, "Display B default");
      await selectDisplay(page, config, original.active, log, "return A"); const a = await state(page); assertSettings(assert, a, { overlap_percent: 75 }, "Display A local settings");
      const cleared = await mutation(page, config, async function () { await id(page, config, "displayOverflowTrigger").click(); await id(page, config, "clearDisplayAction").click(); }, log, "clear A Spectrogram", 200); assertSettings(assert, cleared, { overlap_percent: 75 }, "Clear A");
      const member = (await signalRowsState(page, config)).find(function (row) { return !row.checked && row.checkboxTestId; }); if (!member) throw new Error("Clear must expose a stable checkbox for re-add");
      const readded = await mutation(page, config, function () { return page.locator(testIdSelector(member.checkboxTestId)).setChecked(true); }, log, "re-add A signal", 200); assertSettings(assert, readded, { overlap_percent: 75 }, "re-add A");
      const second = (await signalRowsState(page, config)).find(function (row) { return !row.checked && row.checkboxTestId; });
      const sourced = second ? await mutation(page, config, function () { return page.locator(testIdSelector(second.checkboxTestId)).setChecked(true); }, log, "add alternate A source", 200) : readded;
      const candidates = (sourced.signals || []).filter(function (signal) { const display = activeDisplay(sourced); return display.visible_signals.indexOf(signal.name) >= 0 && signal.name !== display.analysis_signal; });
      if (!candidates.length) { log("source identity switch skipped: no second visible source after re-add"); return; }
      await selectSource(page, config, candidates[0].name, log, "select alternate Spectrogram source"); const switched = await state(page); const wire = switched.plot_payload && switched.plot_payload.spectrogram;
      assertSettings(assert, switched, { overlap_percent: 75 }, "source switch preservation"); assert(wire && wire.signal === candidates[0].name, "Spectrogram wire must keep selected source identity after source switch");
    });
  } finally {
    try {
      if (original.created) { await selectDisplay(page, config, original.created, log, "cleanup select B"); const close = waitForApi(page, config, config.app.api.displays, "POST"); await page.locator(testIdSelector(`close-display-${original.created}`)).click(); if (!(await close).ok()) throw new Error("cleanup close B failed"); await waitForSettled(page, config); }
      if (original.active) { await selectDisplay(page, config, original.active, log, "cleanup return A"); await selectPlot(page, config, "spectrogram", log, "cleanup Spectrogram"); await restoreMembership(page, config, original.membership, log); await selectSource(page, config, original.source, log, "cleanup analysis source"); const current = await state(page); if (original.settings && !same(overlap(current), original.settings)) await setOverlap(page, config, original.settings.overlap_percent, log, "cleanup Spectrogram Overlap", 200); await selectPlot(page, config, original.plot, log, "cleanup original plot"); }
    } catch (error) { log(`cleanup Spectrogram Overlap scenario: ${error.message}`); }
  }
}

testSpectrogramOverlap.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "typed-spectrogram", "spectrogram-overlap"];
module.exports = testSpectrogramOverlap;
