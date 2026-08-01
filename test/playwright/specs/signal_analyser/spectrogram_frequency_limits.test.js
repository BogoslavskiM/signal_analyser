"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { assertNoPreparingPlaceholders, endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;
const DEFAULT = { overlap_percent: 50, leakage: 0.5, frequency_limits: null, frequency_scale: "linear", power_limits: null };

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function shell(page, config) { return id(page, config, "shell"); }
function same(left, right) { return JSON.stringify(left || null) === JSON.stringify(right || null); }
function activeDisplay(snapshot) { return (snapshot.displays || []).find(function (display) { return display.id === snapshot.active_display_id; }); }
function settings(snapshot) { return snapshot && snapshot.spectrogram_settings; }
function source(snapshot) { const display = activeDisplay(snapshot); return display && display.analysis_signal || ""; }
function limits(snapshot) { const plot = snapshot && snapshot.plots && snapshot.plots.spectrogram || snapshot && snapshot.plot_payload && snapshot.plot_payload.spectrogram; return plot && plot.frequency_limits; }
async function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }
function body(request, label) { try { return JSON.parse(request.postData() || "{}"); } catch (error) { throw new Error(`${label}: /api/view body is not JSON: ${error.message}`); } }
function assertSettings(assert, snapshot, expected, label) {
  const display = activeDisplay(snapshot), value = settings(snapshot);
  assert(display && display.spectrogram_settings && same(value, display.spectrogram_settings), `${label}: root and active Display must mirror spectrogram_settings`);
  assert(value && Object.keys(value).sort().join(",") === "frequency_limits,frequency_scale,leakage,overlap_percent,power_limits", `${label}: spectrogram_settings must contain exactly five keys`);
  assert(same(value, expected), `${label}: unexpected five-key settings ${JSON.stringify(value)}`);
}
function wire(snapshot, label) {
  const plot = snapshot && snapshot.plot_payload && snapshot.plot_payload.spectrogram || snapshot && snapshot.plots && snapshot.plots.spectrogram;
  if (!plot || !Array.isArray(plot.x) || !Array.isArray(plot.y) || !Array.isArray(plot.z)) throw new Error(`${label}: Spectrogram payload must expose x/y/z`);
  return plot;
}
function signature(snapshot, label) { const plot = wire(snapshot, label); return { x: JSON.stringify(plot.x), y: JSON.stringify(plot.y), z: JSON.stringify(plot.z), signal: plot.signal || "" }; }
function expectedSettings(current, frequencyLimits) { return { overlap_percent: Number(current.overlap_percent), leakage: Number(current.leakage), frequency_limits: frequencyLimits, frequency_scale: current.frequency_scale || "linear", power_limits: current.power_limits || null }; }
function isComplex(signal) { return /complex|комплекс/i.test(String(signal && (signal.data_type || signal.dataType || ""))); }
function domain(signal) { const half = Number(signal && signal.sample_rate_hz) / 2; return isComplex(signal) ? { min_hz: -half, max_hz: half } : { min_hz: 0, max_hz: half }; }

async function mutation(page, config, action, log, label, status, expected) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST"); await action();
    const response = await responsePromise, payload = await responseJson(response, label);
    performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (response.status() !== status || requests.length !== 1) throw new Error(`${label}: expected exactly one HTTP ${status} /api/view request`);
    if (expected) { const request = body(requests[0], label); if (!same(request.spectrogram_settings, expected) || Object.keys(request.spectrogram_settings || {}).length !== 5) throw new Error(`${label}: request must send the exact full five-key spectrogram_settings body`); }
    if (status === 200 && payload.state_revision !== revision + 1) throw new Error(`${label}: valid mutation must increment revision exactly once`);
    if (status !== 200 && Number(await shell(page, config).getAttribute("data-state-revision")) !== revision) throw new Error(`${label}: rejected mutation must preserve revision`);
    await waitForSettled(page, config); return payload;
  } finally { page.off("request", onRequest); }
}
async function selectPlot(page, config, plot, log, label) { const control = id(page, config, "plotTypeSelect"); if (await control.inputValue() === plot) return null; return mutation(page, config, function () { return control.selectOption(plot); }, log, label, 200); }
async function selectDisplay(page, config, displayId, log, label) {
  if (await shell(page, config).getAttribute("data-active-display-id") === displayId) return;
  const startedAt = Date.now(), responsePromise = waitForApi(page, config, config.app.api.displays, "POST"); await page.locator(testIdSelector(`display-tab-${displayId}`)).click(); const response = await responsePromise;
  if (!response.ok()) throw new Error(`${label}: Display select HTTP ${response.status()}`); await waitForSettled(page, config); performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}`);
}
async function draftPair(page, config, min, max) {
  await id(page, config, "spectrogramFrequencyMinInput").evaluate(function (input, value) { input.value = String(value); input.dispatchEvent(new Event("input", { bubbles: true })); }, min);
  await id(page, config, "spectrogramFrequencyMaxInput").evaluate(function (input, value) { input.value = String(value); input.dispatchEvent(new Event("input", { bubbles: true })); }, max);
}
async function setPair(page, config, min, max, log, label, status, expected) { await draftPair(page, config, min, max); return mutation(page, config, function () { return id(page, config, "spectrogramFrequencyMaxInput").press("Enter"); }, log, label, status, expected); }
async function setPairByFocusNavigation(page, config, min, max, log, label, expected) {
  const minimum = id(page, config, "spectrogramFrequencyMinInput"), maximum = id(page, config, "spectrogramFrequencyMaxInput");
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await minimum.fill(String(min)); await minimum.press("Tab");
    await page.waitForFunction(function (selector) { return document.activeElement === document.querySelector(selector); }, testIdSelector(config.app.testIds.spectrogramFrequencyMaxInput), { timeout: TIMEOUT });
    await page.waitForTimeout(0);
    if (requests.length !== 0 || Number(await shell(page, config).getAttribute("data-state-revision")) !== revision) throw new Error(`${label}: F min input and Tab must not dispatch a mixed /api/view request`);
    await maximum.fill(String(max)); await maximum.press("Enter");
    const response = await responsePromise, payload = await responseJson(response, label);
    performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}; ${requests.length} request(s); Tab zero-request`);
    const request = requests[0] && body(requests[0], label);
    if (!response.ok() || requests.length !== 1 || payload.state_revision !== revision + 1 || !same(request && request.spectrogram_settings, expected) || Object.keys(request && request.spectrogram_settings || {}).length !== 5) throw new Error(`${label}: natural pair edit must make one +1 exact five-key /api/view request`);
    await waitForSettled(page, config); return payload;
  } finally { page.off("request", onRequest); }
}
async function resetAuto(page, config, log, label, expected) { return setPair(page, config, "", "", log, label, 200, expected); }
async function selectSource(page, config, name, log, label) {
  if (source(await state(page)) === name) return;
  const row = (await signalRowsState(page, config)).find(function (item) { return item.name === name; }); if (!row) throw new Error(`${label}: source row is absent`);
  await mutation(page, config, function () { return page.locator(testIdSelector(row.id)).click(); }, log, label, 200);
  if (source(await state(page)) !== name) throw new Error(`${label}: activeDisplay.analysis_signal must select the source`);
}
async function waitForHeatmap(page, config, assert, label) {
  await page.waitForFunction(function (selector) { const host = document.querySelector(selector), traces = host && (host.data || host._fullData || []); return host && host.getAttribute("data-plot-ready") === "true" && Array.isArray(traces) && traces.some(function (trace) { return trace.type === "heatmap"; }); }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  assert(await id(page, config, "activePlotHost").count() === 1, `${label}: one active Plotly host is required`); assert(await page.locator("[data-settings-tab]").count() === 3, `${label}: Frequency Limits must not add a fourth settings tab`); await assertNoPreparingPlaceholders(page, assert);
}
async function assertNoop(page, config, min, max, assert, log) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try { await draftPair(page, config, min, max); await id(page, config, "spectrogramFrequencyMaxInput").press("Enter"); await page.waitForTimeout(100); assert(requests.length === 0 && Number(await shell(page, config).getAttribute("data-state-revision")) === revision, "equal Spectrogram Frequency Limits edit must be a local no-op"); performanceLog(log, "equal Spectrogram Frequency Limits", Date.now() - startedAt, undefined, "zero /api/view; revision unchanged"); } finally { page.off("request", onRequest); }
}
async function assertLocalInvalid(page, config, min, max, assert, log) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")), requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try { await draftPair(page, config, min, max); await id(page, config, "spectrogramFrequencyMaxInput").press("Enter"); await page.waitForTimeout(100); assert(requests.length === 0 && Number(await shell(page, config).getAttribute("data-state-revision")) === revision, "local invalid Spectrogram Frequency Limits must not dispatch"); assert(await id(page, config, "spectrogramFrequencyLimitsError").isVisible(), "local invalid Spectrogram Frequency Limits must show its stable error"); performanceLog(log, "invalid local Spectrogram Frequency Limits", Date.now() - startedAt, undefined, "zero /api/view; local draft error"); } finally { page.off("request", onRequest); }
}
async function restoreMembership(page, config, names, log) { const expected = new Set(names || []); for (const row of await signalRowsState(page, config)) if (expected.has(row.name) && !row.checked) await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(true); }, log, `cleanup add ${row.name}`, 200); for (const row of await signalRowsState(page, config)) if (!expected.has(row.name) && row.checked) await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(false); }, log, `cleanup remove ${row.name}`, 200); }

async function testSpectrogramFrequencyLimits({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("capture Auto effective Spectrogram limits and full real domain", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged"); await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const snapshot = await state(page); original.active = snapshot.active_display_id; original.plot = await id(page, config, "plotTypeSelect").inputValue(); original.settings = settings(snapshot); original.source = source(snapshot); original.rows = await signalRowsState(page, config); original.membership = original.rows.filter(function (row) { return row.checked; }).map(function (row) { return row.name; }); original.spectrumSettings = snapshot.spectrum_settings;
      const opened = await selectPlot(page, config, "spectrogram", log, "open A Spectrogram") || await state(page); assertSettings(assert, opened, DEFAULT, "default Auto Spectrogram Frequency Limits"); await waitForHeatmap(page, config, assert, "Auto Spectrogram Frequency Limits");
      assert(await id(page, config, "spectrogramFrequencyMinInput").count() === 1 && await id(page, config, "spectrogramFrequencyMaxInput").count() === 1 && await id(page, config, "spectrogramFrequencyLimitsError").count() === 1 && await id(page, config, "spectrogramSettings").locator(testIdSelector(config.app.testIds.spectrogramFrequencyMinInput)).count() === 1 && await id(page, config, "spectrogramSettings").locator(testIdSelector(config.app.testIds.spectrogramFrequencyMaxInput)).count() === 1 && await id(page, config, "spectrogramSettings").locator(testIdSelector(config.app.testIds.spectrogramFrequencyLimitsError)).count() === 1, "Frequency Limits controls must occur exactly once inside Spectrogram settings");
      const metadata = limits(opened); assert(metadata && metadata.mode === "auto" && metadata.requested === null && metadata.effective, "Auto must expose authoritative requested/effective metadata"); assert(Number(await id(page, config, "spectrogramFrequencyMinInput").inputValue()) === Number(metadata.effective.min_hz) && Number(await id(page, config, "spectrogramFrequencyMaxInput").inputValue()) === Number(metadata.effective.max_hz), "Auto fields must display backend effective Hz values"); original.auto = metadata.effective; original.autoWire = signature(opened, "Auto Spectrogram");
      const signal = (opened.signals || []).find(function (item) { return item.name === source(opened); }); original.realSource = signal && !isComplex(signal) ? signal.name : ""; original.realDomain = domain(signal);
      assert(original.realSource && Number.isFinite(original.realDomain.max_hz), "C15 seed requires a real active analysis source with sample rate");
    });
    await step("explicit nominal/full real limits, no-op, local invalid and provider grid", async function () {
      const requested = { min_hz: 0, max_hz: original.realDomain.max_hz, units: "Hz" }, expected = expectedSettings(DEFAULT, requested);
      const explicit = await setPairByFocusNavigation(page, config, requested.min_hz, requested.max_hz, log, "set full real Spectrogram Frequency Limits by Tab", expected); assertSettings(assert, explicit, expected, "full real limits"); const metadata = limits(explicit); assert(metadata && metadata.mode === "explicit" && same(metadata.requested, requested) && same(metadata.effective, requested), "explicit full real limits must retain exact requested/effective Hz metadata"); await waitForHeatmap(page, config, assert, "full real limits"); const explicitWire = signature(explicit, "full real limits"); assert(explicitWire.x === original.autoWire.x && explicitWire.y !== original.autoWire.y && explicitWire.z !== original.autoWire.z, "explicit full limits must change provider y/z while preserving time centers");
      await assertNoop(page, config, requested.min_hz, requested.max_hz, assert, log); await assertLocalInvalid(page, config, requested.max_hz, requested.min_hz, assert, log); original.realRequested = requested;
    });
    await step("synthetic 422 and bounded 409 retain exact five-key intent", async function () {
      const before = await state(page), rejected = expectedSettings(settings(before), { min_hz: 0, max_hz: original.realDomain.max_hz / 2, units: "Hz" }); let rejectedBody;
      await page.route("**/api/view*", async function (route) { if (!rejectedBody && route.request().method() === "POST") { rejectedBody = body(route.request(), "synthetic Spectrogram Frequency Limits 422"); await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ ok: false, error: { message: "synthetic Spectrogram Frequency Limits rejection" } }) }); return; } await route.continue(); });
      try { await setPair(page, config, 0, original.realDomain.max_hz / 2, log, "synthetic Spectrogram Frequency Limits 422", 422, rejected); } finally { await page.unroute("**/api/view*"); }
      assert(same(rejectedBody && rejectedBody.spectrogram_settings, rejected) && Object.keys(rejectedBody.spectrogram_settings || {}).length === 5, "422 must receive an exact full five-key desired body"); assertSettings(assert, await state(page), settings(before), "422 rollback");
      const revision = before.state_revision, replayBodies = []; let intercepted = false;
      await page.route("**/api/view*", async function (route) { if (route.request().method() === "POST") { replayBodies.push(body(route.request(), "synthetic Spectrogram Frequency Limits 409")); if (!intercepted) { intercepted = true; await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ current: before }) }); return; } } await route.continue(); });
      try { await draftPair(page, config, 0, original.realDomain.max_hz / 2); await id(page, config, "spectrogramFrequencyMaxInput").press("Enter"); await page.waitForFunction(function (expected) { const node = document.querySelector(expected.selector); return node && Number(node.getAttribute("data-state-revision")) === expected.revision; }, { selector: testIdSelector(config.app.testIds.shell), revision: revision + 1 }, { timeout: TIMEOUT }); } finally { await page.unroute("**/api/view*"); }
      assert(intercepted && replayBodies.length === 2 && replayBodies.every(function (item) { return same(item.spectrogram_settings, rejected) && Object.keys(item.spectrogram_settings || {}).length === 5; }), "409 must replay exactly one full five-key desired request"); await waitForSettled(page, config); await setPair(page, config, original.realRequested.min_hz, original.realRequested.max_hz, log, "restore full real limits after replay", 200, expectedSettings(settings(await state(page)), original.realRequested));
    });
    await step("Spectrum independence, conditional complex source reset and N<2", async function () {
      const before = await state(page), beforeWire = signature(before, "before Spectrum limits"); await selectPlot(page, config, "spectrum", log, "open independent Spectrum limits"); const spectrumMax = Number(await id(page, config, "spectrumFrequencyMaxInput").inputValue()); await id(page, config, "spectrumFrequencyMinInput").fill("0"); await id(page, config, "spectrumFrequencyMaxInput").fill(String(spectrumMax / 2)); await mutation(page, config, function () { return id(page, config, "spectrumFrequencyMaxInput").press("Enter"); }, log, "change independent Spectrum Frequency Limits", 200); const returned = await selectPlot(page, config, "spectrogram", log, "return to independent Spectrogram") || await state(page); assertSettings(assert, returned, expectedSettings(DEFAULT, original.realRequested), "Spectrum limits independence"); assert(same(beforeWire.y, signature(returned, "after Spectrum limits").y) && same(beforeWire.z, signature(returned, "after Spectrum limits").z), "Spectrum limits must not change persisted Spectrogram y/z");
      const current = await state(page), complexSignal = (current.signals || []).find(function (item) { const display = activeDisplay(current); return isComplex(item) && display.visible_signals.indexOf(item.name) >= 0; });
      if (complexSignal) { await selectSource(page, config, complexSignal.name, log, "select conditional complex source"); const complex = await state(page), full = domain(complexSignal), requested = { min_hz: full.min_hz, max_hz: full.max_hz, units: "Hz" }, expected = expectedSettings(settings(complex), requested); const applied = await setPair(page, config, requested.min_hz, requested.max_hz, log, "set full centered complex limits", 200, expected); assertSettings(assert, applied, expected, "full centered complex limits"); assert(limits(applied).mode === "explicit" && same(limits(applied).effective, requested), "conditional complex range must be centered exact Hz"); await selectSource(page, config, original.realSource, log, "return real source and reset invalid complex range"); const reset = await state(page); assertSettings(assert, reset, expectedSettings(expected, null), "source reset to Auto"); assert(limits(reset).mode === "auto" && limits(reset).requested === null, "out-of-domain source change must atomically reset Spectrogram limits to Auto"); await setPair(page, config, original.realRequested.min_hz, original.realRequested.max_hz, log, "restore real explicit limits after source reset", 200, expectedSettings(settings(reset), original.realRequested)); } else { log("conditional complex centered/reset checks skipped: no visible complex source in fixture"); }
      const shortSnapshot = await state(page), shortSignal = (shortSnapshot.signals || []).find(function (item) { const display = activeDisplay(shortSnapshot); return display.visible_signals.indexOf(item.name) >= 0 && Number(item.sample_count || item.sample_count_samples || item.length) < 2; }); if (shortSignal) { await selectSource(page, config, shortSignal.name, log, "select conditional N<2 source"); const short = await state(page); assert(limits(short) && limits(short).effective, "N<2 must retain typed Frequency Limits metadata without provider data"); } else { log("N<2 check skipped: fixture exposes no visible N<2 signal metadata"); }
    });
    await step("A/B/new/Clear/re-add and source-preservation lifecycle", async function () {
      if (source(await state(page)) !== original.realSource) await selectSource(page, config, original.realSource, log, "restore real source before A/B"); const prior = await state(page); if (!same(settings(prior).frequency_limits, original.realRequested)) await setPair(page, config, original.realRequested.min_hz, original.realRequested.max_hz, log, "restore A explicit limits before A/B", 200, expectedSettings(settings(prior), original.realRequested));
      const create = waitForApi(page, config, config.app.api.displays, "POST"); await id(page, config, "addDisplay").click(); if (!(await create).ok()) throw new Error("create Display B failed"); await waitForSettled(page, config); original.created = await shell(page, config).getAttribute("data-active-display-id"); const b = await selectPlot(page, config, "spectrogram", log, "open B Spectrogram") || await state(page); assertSettings(assert, b, DEFAULT, "Display B new Auto defaults"); await selectDisplay(page, config, original.active, log, "return A");
      const cleared = await mutation(page, config, async function () { await id(page, config, "displayOverflowTrigger").click(); await id(page, config, "clearDisplayAction").click(); }, log, "clear A Spectrogram", 200); assertSettings(assert, cleared, expectedSettings(settings(cleared), original.realRequested), "Clear preserves explicit Spectrogram limits"); const available = (await signalRowsState(page, config)).filter(function (row) { return !row.checked && row.checkboxTestId; }); const preferred = available.filter(function (row) { return original.membership.indexOf(row.name) >= 0; }).concat(available.filter(function (row) { return original.membership.indexOf(row.name) < 0; })).slice(0, 2); if (!preferred.length) throw new Error("Clear must expose a stable checkbox for re-add"); let readded = cleared; for (const row of preferred) { readded = await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(true); }, log, `re-add A signal ${row.name}`, 200); assertSettings(assert, readded, expectedSettings(settings(readded), original.realRequested), `re-add A ${row.name}`); } if (available.length >= 2) assert(preferred.length === 2, "Clear must re-add two deterministic signals when available"); const alternate = (readded.signals || []).find(function (item) { const display = activeDisplay(readded), candidate = domain(item); return display.visible_signals.indexOf(item.name) >= 0 && item.name !== display.analysis_signal && candidate.min_hz <= original.realRequested.min_hz && candidate.max_hz >= original.realRequested.max_hz; }); if (alternate) { await selectSource(page, config, alternate.name, log, "switch preserved A source"); const changed = await state(page); assertSettings(assert, changed, expectedSettings(settings(changed), original.realRequested), "valid source change preserves limits"); assert(wire(changed, "preserved source").signal === alternate.name, "Spectrogram wire must follow activeDisplay.analysis_signal"); } else { log("source-preservation check skipped: no second visible source with a domain containing the explicit limits"); }
    });
  } finally {
    try { if (original.created) { await selectDisplay(page, config, original.created, log, "cleanup select B"); const close = waitForApi(page, config, config.app.api.displays, "POST"); await page.locator(testIdSelector(`close-display-${original.created}`)).click(); if (!(await close).ok()) throw new Error("cleanup close B failed"); await waitForSettled(page, config); } if (original.active) { await selectDisplay(page, config, original.active, log, "cleanup return A"); await selectPlot(page, config, "spectrogram", log, "cleanup Spectrogram"); await restoreMembership(page, config, original.membership, log); await selectSource(page, config, original.source, log, "cleanup analysis source"); const current = await state(page); if (original.settings && !same(settings(current), original.settings)) { const wanted = original.settings.frequency_limits; if (wanted) await setPair(page, config, wanted.min_hz, wanted.max_hz, log, "cleanup explicit Spectrogram Frequency Limits", 200, original.settings); else await resetAuto(page, config, log, "cleanup Auto Spectrogram Frequency Limits", original.settings); } await selectPlot(page, config, "spectrum", log, "cleanup Spectrum Frequency Limits"); const spectrumNow = await state(page); if (original.spectrumSettings && !same(spectrumNow.spectrum_settings, original.spectrumSettings)) { const wantedSpectrum = original.spectrumSettings.frequency_limits; if (wantedSpectrum) { await id(page, config, "spectrumFrequencyMinInput").fill(String(wantedSpectrum.min_hz)); await id(page, config, "spectrumFrequencyMaxInput").fill(String(wantedSpectrum.max_hz)); await mutation(page, config, function () { return id(page, config, "spectrumFrequencyMaxInput").press("Enter"); }, log, "cleanup explicit Spectrum Frequency Limits", 200); } else { await id(page, config, "spectrumFrequencyMinInput").fill(""); await id(page, config, "spectrumFrequencyMaxInput").fill(""); await mutation(page, config, function () { return id(page, config, "spectrumFrequencyMaxInput").press("Enter"); }, log, "cleanup Auto Spectrum Frequency Limits", 200); } const restoredSpectrum = await state(page); if (!same(restoredSpectrum.spectrum_settings, original.spectrumSettings)) throw new Error("cleanup must restore exact original Spectrum settings"); } await selectPlot(page, config, original.plot, log, "cleanup original plot"); } } catch (error) { log(`cleanup Spectrogram Frequency Limits scenario: ${error.message}`); throw error; }
  }
}

testSpectrogramFrequencyLimits.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "typed-spectrogram", "spectrogram-overlap", "spectrogram-leakage", "spectrogram-frequency-limits", "spectrum-settings-roi", "frequency-limits"];
module.exports = testSpectrogramFrequencyLimits;
