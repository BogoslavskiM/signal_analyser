"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");
const TIMEOUT = 30000;

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function shell(page, config) { return id(page, config, "shell"); }
function activeDisplay(state) { return (state.displays || []).find(function (item) { return item.id === state.active_display_id; }); }
function limits(settings) { return settings && settings.frequency_limits; }
function sameLimits(left, right) { return JSON.stringify(left || null) === JSON.stringify(right || null); }
function settings(state) { return state && state.spectrum_settings; }
async function rows(page, config) {
  const result = await signalRowsState(page, config);
  return page.locator("[data-testid^='signal-row-']").evaluateAll(function (elements, states) {
    return states.map(function (item, index) {
      const row = elements[index];
      return Object.assign({}, item, { dataType: row && (row.children[6] && row.children[6].textContent || "").trim() });
    });
  }, result);
}

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
    if (response.status() !== expectedStatus || requests.length !== 1) throw new Error(`${label}: expected one HTTP ${expectedStatus} /api/view request`);
    if (expectedStatus === 200 && payload.state_revision !== before + 1) throw new Error(`${label}: valid mutation must increment revision exactly once`);
    if (expectedStatus === 422 && Number(await shell(page, config).getAttribute("data-state-revision")) !== before) throw new Error(`${label}: rejected mutation must preserve revision`);
    await waitForSettled(page, config);
    return payload;
  } finally { page.off("request", onRequest); }
}
async function selectPlot(page, config, plot, log, label) {
  const select = id(page, config, "plotTypeSelect");
  if (await select.inputValue() === plot) return null;
  return mutation(page, config, function () { return select.selectOption(plot); }, log, label, 200);
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
async function setDraftPair(page, config, minValue, maxValue) {
  // A deliberate pair edit must not create an artificial blur commit between
  // the two native fields.  `input` preserves the frontend draft semantics;
  // the subsequent Enter is the one explicit user commit.
  await id(page, config, "spectrumFrequencyMinInput").evaluate(function (input, value) {
    input.value = String(value); input.dispatchEvent(new Event("input", { bubbles: true }));
  }, minValue);
  await id(page, config, "spectrumFrequencyMaxInput").evaluate(function (input, value) {
    input.value = String(value); input.dispatchEvent(new Event("input", { bubbles: true }));
  }, maxValue);
}
async function setLimitPair(page, config, minValue, maxValue, log, label, expectedStatus) {
  await setDraftPair(page, config, minValue, maxValue);
  return mutation(page, config, function () { return id(page, config, "spectrumFrequencyMaxInput").press("Enter"); }, log, label, expectedStatus);
}
async function resetAuto(page, config, log, label) {
  await setDraftPair(page, config, "", "");
  return mutation(page, config, function () { return id(page, config, "spectrumFrequencyMaxInput").press("Enter"); }, log, label, 200);
}
async function restoreMembership(page, config, expectedNames, log) {
  const expected = new Set(expectedNames || []);
  for (const row of await signalRowsState(page, config)) if (expected.has(row.name) && !row.checked) {
    await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(true); }, log, `cleanup add ${row.name}`, 200);
  }
  for (const row of await signalRowsState(page, config)) if (!expected.has(row.name) && row.checked) {
    await mutation(page, config, function () { return page.locator(testIdSelector(row.checkboxTestId)).setChecked(false); }, log, `cleanup remove ${row.name}`, 200);
  }
}
async function restoreSource(page, config, name, log) {
  if (!name) return;
  const rows = await signalRowsState(page, config), selected = rows.find(function (row) { return row.rowSelected; });
  if (selected && selected.name === name) return;
  const target = rows.find(function (row) { return row.name === name; });
  if (!target) throw new Error(`cleanup source ${name} is absent`);
  await mutation(page, config, function () { return page.locator(testIdSelector(target.id)).click(); }, log, "cleanup analysis source", 200);
}
async function assertNoopPair(page, config, minValue, maxValue, assert, log) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")); const requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    await setDraftPair(page, config, minValue, maxValue);
    await id(page, config, "spectrumFrequencyMaxInput").press("Enter");
    await page.waitForTimeout(100);
    assert(requests.length === 0 && Number(await shell(page, config).getAttribute("data-state-revision")) === revision,
      "equal frequency-limit edit must be a local no-op");
    performanceLog(log, "equal Frequency Limits", Date.now() - startedAt, undefined, "zero /api/view; revision unchanged");
  } finally { page.off("request", onRequest); }
}
async function assertLocalInvalidPair(page, config, minValue, maxValue, canonical, assert, log) {
  const revision = Number(await shell(page, config).getAttribute("data-state-revision")); const requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    await setDraftPair(page, config, minValue, maxValue);
    await id(page, config, "spectrumFrequencyMaxInput").press("Enter"); await page.waitForTimeout(100);
    assert(requests.length === 0 && Number(await shell(page, config).getAttribute("data-state-revision")) === revision,
      "locally invalid Frequency Limits must not send a request or change revision");
    assert(await id(page, config, "spectrumFrequencyLimitsError").isVisible(), "locally invalid Frequency Limits must show an error");
    assert(Number(await id(page, config, "spectrumFrequencyMinInput").inputValue()) === Number(canonical.min_hz) && Number(await id(page, config, "spectrumFrequencyMaxInput").inputValue()) === Number(canonical.max_hz),
      "locally invalid Frequency Limits must roll back to the previous canonical values");
    performanceLog(log, "invalid local Frequency Limits", Date.now() - startedAt, undefined, "zero /api/view; canonical rollback");
  } finally { page.off("request", onRequest); }
}
async function assertStaleReplay(page, config, action, assert, log) {
  if (config.app.supportsStaleReplay !== true) return;
  const before = await state(page), revision = before.state_revision, requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  let intercepted = false; const startedAt = Date.now();
  await page.route("**/api/view*", async function (route) {
    if (!intercepted && route.request().method() === "POST") {
      intercepted = true;
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ current: before }) });
      return;
    }
    await route.continue();
  });
  page.on("request", onRequest);
  try {
    await action();
    await page.waitForFunction(function (expected) {
      const element = document.querySelector(expected.selector);
      return element && Number(element.getAttribute("data-state-revision")) === expected.revision;
    }, { selector: testIdSelector(config.app.testIds.shell), revision: revision + 1 }, { timeout: TIMEOUT });
    assert(intercepted && requests.length === 2, "one synthetic 409 must replay the intended view request exactly once");
    performanceLog(log, "409 stale replay", Date.now() - startedAt, undefined, "one 409 + one replay");
  } finally {
    page.off("request", onRequest); await page.unroute("**/api/view*"); await waitForSettled(page, config);
  }
}
function assertSettings(assert, payload, label) {
  const display = activeDisplay(payload);
  assert(display && settings(payload) && display.spectrum_settings && JSON.stringify(settings(payload)) === JSON.stringify(display.spectrum_settings),
    `${label}: root and active Display must expose the same full spectrum_settings`);
}

async function testFrequencyLimits({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("capture A and render Auto Frequency Limits", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const snapshot = await state(page); original.active = snapshot.active_display_id;
      original.plot = await id(page, config, "plotTypeSelect").inputValue(); original.settings = settings(snapshot);
      original.rows = await rows(page, config);
      original.membership = original.rows.filter(function (row) { return row.checked; }).map(function (row) { return row.name; });
      original.source = (original.rows.find(function (row) { return row.rowSelected; }) || {}).name || "";
      await selectPlot(page, config, "spectrum", log, "open A Spectrum");
      const auto = await state(page), metadata = auto.plots && auto.plots.spectrum && auto.plots.spectrum.frequency_limits;
      assert(limits(settings(auto)) === null && metadata && metadata.mode === "auto" && metadata.effective,
        "new A Spectrum must expose Auto requested/effective Frequency Limits metadata");
      assert(Number(await id(page, config, "spectrumFrequencyMinInput").inputValue()) === Number(metadata.effective.min_hz) &&
        Number(await id(page, config, "spectrumFrequencyMaxInput").inputValue()) === Number(metadata.effective.max_hz),
      "Auto fields must display backend effective limits, not frontend-derived Nyquist");
      original.auto = metadata.effective;
      assert(await page.locator("[data-settings-tab]").count() === 3, "Frequency Limits must not create a fourth settings tab");
      assert(await page.locator("[data-testid*='log-floor']").count() === 0, "Frequency Limits must not add a Log-floor control");
    });
    await step("commit explicit limits once, preserve Log Min 0, reject invalid state", async function () {
      const max = Number(original.auto.max_hz), requested = { min_hz: 0, max_hz: max / 2, units: "Hz" };
      const applied = await setLimitPair(page, config, requested.min_hz, requested.max_hz, log, "set explicit Frequency Limits", 200);
      assertSettings(assert, applied, "explicit Frequency Limits");
      assert(sameLimits(limits(settings(applied)), requested), "valid edit must save exact requested Frequency Limits");
      await assertNoopPair(page, config, requested.min_hz, requested.max_hz, assert, log);
      const frequency = id(page, config, "spectrumFrequencyScaleSelect");
      if (await frequency.inputValue() !== "log") await mutation(page, config, function () { return frequency.selectOption("log"); }, log, "enable real Spectrum Log", 200);
      await assertStaleReplay(page, config, function () { return id(page, config, "spectrumScaleSelect").selectOption("linear"); }, assert, log);
      assert(Number(await id(page, config, "spectrumFrequencyMinInput").inputValue()) === 0,
        "real Spectrum Log must retain requested/displayed Min 0 without a Log floor");
      await assertLocalInvalidPair(page, config, requested.max_hz, requested.min_hz, requested, assert, log);
      await setLimitPair(page, config, requested.min_hz, max * 2, log, "reject out-of-domain Frequency Limits", 422);
      const rejected = await state(page);
      assertSettings(assert, rejected, "rejected Frequency Limits");
      assert(sameLimits(limits(settings(rejected)), requested), "422 must roll back to previous canonical explicit limits");
      assert(await id(page, config, "spectrumFrequencyLimitsError").isVisible(), "422 must expose Frequency Limits error");
    });
    await step("A/B locality and Clear/re-add retain Frequency Limits intent", async function () {
      const create = waitForApi(page, config, config.app.api.displays, "POST"); await id(page, config, "addDisplay").click();
      const response = await create; if (!response.ok()) throw new Error(`create Display B HTTP ${response.status()}`); await waitForSettled(page, config);
      original.created = await shell(page, config).getAttribute("data-active-display-id"); await selectPlot(page, config, "spectrum", log, "open B Spectrum");
      assert(limits(settings(await state(page))) === null, "Display B must begin with independent Auto Frequency Limits");
      await selectDisplay(page, config, original.active, log, "return A");
      const clear = await mutation(page, config, async function () { await id(page, config, "displayOverflowTrigger").click(); await id(page, config, "clearDisplayAction").click(); }, log, "clear A Spectrum", 200);
      assert(limits(settings(clear)) && limits(settings(clear)).min_hz === 0, "Clear must preserve A explicit Frequency Limits intent");
      // Re-add the first available signal using a stable row checkbox; input
      // values must retain the preserved canonical intent after recomputation.
      const member = (await signalRowsState(page, config)).find(function (row) { return !row.checked && row.checkboxTestId; });
      if (!member) throw new Error("Clear must expose a stable checkbox for re-add");
      const readded = await mutation(page, config, function () { return page.locator(testIdSelector(member.checkboxTestId)).setChecked(true); }, log, "re-add A signal", 200);
      assert(sameLimits(limits(settings(readded)), limits(settings(clear))), "re-add must retain valid explicit Frequency Limits intent");
    });
  } finally {
    try {
      if (original.created) { await selectDisplay(page, config, original.created, log, "cleanup select B"); const close = waitForApi(page, config, config.app.api.displays, "POST"); await page.locator(testIdSelector(`close-display-${original.created}`)).click(); if (!(await close).ok()) throw new Error("cleanup close B failed"); await waitForSettled(page, config); }
      if (original.active) {
        await selectDisplay(page, config, original.active, log, "cleanup return A"); await selectPlot(page, config, "spectrum", log, "cleanup Spectrum");
        let current = settings(await state(page));
        const originalHasComplex = (original.membership || []).some(function (name) {
          const row = (original.rows || []).find(function (item) { return item.name === name; });
          return row && /complex|комплекс/i.test(String(row.dataType || ""));
        });
        if (originalHasComplex && current.frequency_scale === "log") {
          await mutation(page, config, function () { return id(page, config, "spectrumFrequencyScaleSelect").selectOption("linear"); }, log, "cleanup compatible Linear", 200);
          current = settings(await state(page));
        }
        await restoreMembership(page, config, original.membership, log);
        await restoreSource(page, config, original.source, log);
        if (original.settings && current.scale !== original.settings.scale) {
          await mutation(page, config, function () { return id(page, config, "spectrumScaleSelect").selectOption(original.settings.scale); }, log, "cleanup Spectrum scale", 200);
          current = settings(await state(page));
        }
        if (original.settings && current.frequency_scale !== original.settings.frequency_scale) {
          await mutation(page, config, function () { return id(page, config, "spectrumFrequencyScaleSelect").selectOption(original.settings.frequency_scale); }, log, "cleanup Spectrum frequency scale", 200);
          current = settings(await state(page));
        }
        if (original.settings && Number(current.leakage) !== Number(original.settings.leakage)) {
          await mutation(page, config, async function () { const input = id(page, config, "spectrumLeakageInput"); await input.fill(String(original.settings.leakage)); await input.dispatchEvent("change"); }, log, "cleanup Spectrum leakage", 200);
          current = settings(await state(page));
        }
        if (original.settings && !sameLimits(limits(current), limits(original.settings))) {
          const wanted = limits(original.settings);
          if (wanted) await setLimitPair(page, config, wanted.min_hz, wanted.max_hz, log, "cleanup explicit Frequency Limits", 200);
          else await resetAuto(page, config, log, "cleanup Auto Frequency Limits");
        }
        await selectPlot(page, config, original.plot, log, "cleanup original plot");
      }
    } catch (error) { log(`cleanup Frequency Limits scenario: ${error.message}`); }
  }
}

testFrequencyLimits.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "spectrum-settings-roi", "frequency-limits"];
module.exports = testFrequencyLimits;
