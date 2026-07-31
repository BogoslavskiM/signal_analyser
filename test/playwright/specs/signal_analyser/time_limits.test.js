"use strict";

const { openAppPage, testIdSelector, waitForAppReady } = require("../../support/app_page");
const { endpointMatches, isApiRequestUrl, responseJson, signalRowsState, waitForApi, waitForSettled, performanceLog } = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;

function field(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function shell(page, config) { return page.locator(testIdSelector(config.app.testIds.shell)); }
async function idle(page, config) {
  await waitForAppReady(page, config, { timeout: TIMEOUT });
  await page.waitForFunction(function (selector) { const node = document.querySelector(selector); return node && node.getAttribute("aria-busy") !== "true"; }, testIdSelector(config.app.testIds.shell), { timeout: TIMEOUT });
}
async function snapshotHost(page, config) {
  return page.locator(testIdSelector(config.app.testIds.activePlotHost)).evaluate(function (host) {
    const traces = Array.isArray(host.data) ? host.data : (host._fullData || []);
    host.__e2eTimeLimitsHost = host.__e2eTimeLimitsHost || `limits-${Date.now()}`;
    return { marker: host.__e2eTimeLimitsHost, range: (host._fullLayout || host.layout || {}).xaxis && (host._fullLayout || host.layout).xaxis.range,
      source: traces.map(function (trace) { return { name: trace.name, x: Array.from(trace.x || []), y: Array.from(trace.y || []) }; }) };
  });
}
async function draftNoRequest(page, input, value, config, log, label) {
  const requests = [];
  const revision = Number(await shell(page, config).getAttribute("data-state-revision"));
  const onRequest = function (request) { if (isApiRequestUrl(request)) requests.push(request.url()); };
  page.on("request", onRequest);
  const start = Date.now();
  try {
    await input.fill(value, { timeout: TIMEOUT });
    await page.waitForTimeout(80);
    if (requests.length || Number(await shell(page, config).getAttribute("data-state-revision")) !== revision) throw new Error(`${label} typing must be draft-only`);
    performanceLog(log, label, Date.now() - start, undefined, "zero API; revision unchanged");
  } finally { page.off("request", onRequest); }
}
async function commit(page, config, min, max, log, label, expectedStatus) {
  const minInput = field(page, config, "timeMinInput");
  const maxInput = field(page, config, "timeMaxInput");
  const requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest);
  const started = Date.now();
  try {
    await draftNoRequest(page, minInput, String(min), config, log, `${label} min draft`);
    await draftNoRequest(page, maxInput, String(max), config, log, `${label} max draft`);
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await maxInput.press("Enter");
    const response = await responsePromise;
    performanceLog(log, label, Date.now() - started, undefined, `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (response.status() !== expectedStatus || requests.length !== 1) throw new Error(`${label} must make one /api/view with HTTP ${expectedStatus}`);
    const body = requests[0].postDataJSON();
    if (!body.time_limits || body.time_limits.min_s !== Number(min) || body.time_limits.max_s !== Number(max) || body.time_limits.units !== "s") throw new Error(`${label} must submit canonical seconds time_limits`);
    return { response, body };
  } finally { page.off("request", onRequest); }
}
async function selectPlot(page, config, value) {
  const select = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
  if (await select.inputValue() === value) return;
  const response = waitForApi(page, config, config.app.api.view, "POST");
  await select.selectOption(value); await response; await waitForSettled(page, config);
}
async function tabs(page, config) { return page.locator(`${testIdSelector(config.app.testIds.displayTabs)} [role=tab]`).evaluateAll(function (items) { return items.map(function (item) { return { id: item.getAttribute("data-display-id"), active: item.getAttribute("aria-selected") === "true" }; }); }); }
async function chooseDisplay(page, config, id) { await page.locator(testIdSelector(`display-tab-${id}`)).click(); await idle(page, config); }
async function testTimeLimits({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const minInput = field(page, config, "timeMinInput"); const maxInput = field(page, config, "timeMaxInput"); const error = field(page, config, "timeLimitsError");
  let base = null; let last = null;
  let originalDisplay = ""; let addedDisplay = "";
  let originalSelectedRow = "";
  try {
    await step("open authoritative nonempty Time limits in seconds", async function () {
      await openAppPage(page, { appUrl, config, log, useCurrentPage }); await idle(page, config); await selectPlot(page, config, "time");
      originalDisplay = (await tabs(page, config)).find(function (item) { return item.active; }).id;
      originalSelectedRow = (await signalRowsState(page, config)).find(function (row) { return row.selected; }).id;
      assert(!(await minInput.isDisabled()) && !(await maxInput.isDisabled()), "time inputs must be enabled only for nonempty Time Display");
      assert(Number.isFinite(Number(await minInput.inputValue())) && Number.isFinite(Number(await maxInput.inputValue())), "Time inputs must display authoritative seconds");
      base = await snapshotHost(page, config); last = { min: await minInput.inputValue(), max: await maxInput.inputValue(), revision: Number(await shell(page, config).getAttribute("data-state-revision")) };
    });
    await step("Enter commits one canonical ROI mutation without replacing host or trace sources", async function () {
      const min = Number(last.min); const max = Number(last.max); const nextMin = min + (max - min) * 0.2; const nextMax = min + (max - min) * 0.8;
      const peaksAction = page.locator(testIdSelector(config.app.testIds.findPeaksAction));
      if (await peaksAction.getAttribute("aria-pressed") !== "true") { const peaksResponse = waitForApi(page, config, config.app.api.view, "POST"); await peaksAction.click(); await peaksResponse; await waitForSettled(page, config); }
      last.revision = Number(await shell(page, config).getAttribute("data-state-revision"));
      const result = await commit(page, config, nextMin, nextMax, log, "commit Time limits", 200); const state = await responseJson(result.response, "Time limits"); await waitForSettled(page, config);
      assert(state.state_revision === last.revision + 1 && state.time_limits && state.time_limits.min_s === nextMin && state.time_limits.max_s === nextMax, "successful ROI response must be authoritative and advance revision once");
      const activeDisplay = (state.displays || []).find(function (display) { return display.id === state.active_display_id; });
      assert(activeDisplay && JSON.stringify(activeDisplay.time_limits) === JSON.stringify(state.time_limits), "root and active Display must publish the same canonical time_limits envelope");
      const after = await snapshotHost(page, config);
      assert(after.marker === base.marker && JSON.stringify(after.source) === JSON.stringify(base.source), "ROI must retain active host and source arrays");
      assert(JSON.stringify(after.range) === JSON.stringify([nextMin, nextMax]), "Time ROI must set Plotly xaxis.range");
      assert(await page.locator(testIdSelector(config.app.testIds.measurements.table)).getAttribute("data-state-revision") === String(state.state_revision), "Measurements must use returned ROI revision");
      assert(state.peaks && state.peaks.enabled === true && state.peaks.state_revision === state.state_revision, "enabled Peaks must be recomputed in the returned ROI snapshot");
      (state.peaks.items || []).forEach(function (peak) { assert(peak.time_s >= nextMin && peak.time_s <= nextMax && peak.sample_index >= 0, "ROI Peaks must retain absolute time/index within committed inclusive limits"); });
      last = { min: String(nextMin), max: String(nextMax), revision: state.state_revision };
    });
    await step("equal and invalid commits preserve authoritative state", async function () {
      await draftNoRequest(page, minInput, last.min, config, log, "equal Time min draft"); await draftNoRequest(page, maxInput, last.max, config, log, "equal Time max draft");
      await maxInput.press("Enter"); await page.waitForTimeout(100);
      assert(Number(await shell(page, config).getAttribute("data-state-revision")) === last.revision, "equal limits must be a revision-neutral no-op");
      const rejected = await commit(page, config, Number(last.max), Number(last.min), log, "reject inverted Time limits", 422); const rejectedBody = await responseJson(rejected.response, "invalid Time limits");
      assert(rejectedBody.ok === false && rejectedBody.code === "invalid_request" && rejectedBody.error && rejectedBody.error.code === "invalid_request" && typeof rejectedBody.error.fields.time_limits === "string", "422 must preserve the exact field-level invalid_request envelope");
      assert(await error.isVisible() && await error.getAttribute("role") === "alert", "invalid limits must expose inline accessible error");
      assert(await minInput.inputValue() === last.min && await maxInput.inputValue() === last.max && Number(await shell(page, config).getAttribute("data-state-revision")) === last.revision, "422 must restore last valid limits and revision");
    });
    await step("non-Time disables inputs while retaining per-Display values", async function () {
      await selectPlot(page, config, "spectrum"); assert(await minInput.isDisabled() && await maxInput.isDisabled(), "non-Time must disable Time limits");
      await selectPlot(page, config, "time"); assert(await minInput.inputValue() === last.min && await maxInput.inputValue() === last.max, "returning to Time must restore page-local limits");
    });
    await step("changing analysis source retains a valid ROI or resets it to the new full range", async function () {
      const candidates = (await signalRowsState(page, config)).filter(function (row) { return row.checked; });
      const nextSource = candidates.find(function (row) { return !row.selected; });
      if (!nextSource) { log("source-change ROI branch skipped: no non-selected visible signal"); return; }
      const current = { min: Number(await minInput.inputValue()), max: Number(await maxInput.inputValue()) };
      const beforeRevision = Number(await shell(page, config).getAttribute("data-state-revision"));
      const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
      await page.locator(testIdSelector(nextSource.id)).click();
      const state = await responseJson(await responsePromise, "change Time ROI source"); await waitForSettled(page, config);
      const active = (state.displays || []).find(function (display) { return display.id === state.active_display_id; });
      assert(state.state_revision === beforeRevision + 1 && active && active.time_limits, "actual analysis-source change must publish one new authoritative ROI revision");
      const limits = active.time_limits;
      const preserved = limits.min_s === current.min && limits.max_s === current.max;
      const reset = limits.min_s === 0 && Number.isFinite(limits.max_s) && limits.max_s > 0;
      assert(preserved || reset, "source change must preserve a valid ROI or reset deterministically to new full range");
      last = { min: String(limits.min_s), max: String(limits.max_s), revision: state.state_revision };
    });
    await step("limits belong to the active Display and Clear/re-add follows null/full-range lifecycle", async function () {
      await page.locator(testIdSelector(config.app.testIds.addDisplay)).click(); await idle(page, config);
      addedDisplay = (await tabs(page, config)).find(function (item) { return item.active; }).id;
      await selectPlot(page, config, "time");
      assert(await minInput.inputValue() !== "" && await maxInput.inputValue() !== "", "new nonempty Display must expose its full authoritative Time range");
      await chooseDisplay(page, config, originalDisplay);
      assert(await minInput.inputValue() === last.min && await maxInput.inputValue() === last.max, "switching Display must restore its local committed Time limits");
      const member = (await signalRowsState(page, config)).find(function (row) { return row.checked; });
      assert(member, "Clear/re-add ROI lifecycle requires one active Display member");
      const clearResponse = waitForApi(page, config, config.app.api.view, "POST");
      await page.locator(testIdSelector(config.app.testIds.displayOverflowTrigger)).click();
      await page.locator(testIdSelector(config.app.testIds.clearDisplayAction)).click();
      const clearState = await responseJson(await clearResponse, "Clear Time limits"); await waitForSettled(page, config);
      assert(clearState.time_limits === null && await minInput.isDisabled() && await maxInput.isDisabled(), "Clear must publish null limits and disable Time inputs");
      const readdResponse = waitForApi(page, config, config.app.api.view, "POST");
      await page.locator(testIdSelector(member.checkboxTestId)).setChecked(true); const readdState = await responseJson(await readdResponse, "re-add Time limits"); await waitForSettled(page, config);
      assert(readdState.time_limits && readdState.time_limits.units === "s" && await minInput.inputValue() !== "" && await maxInput.inputValue() !== "", "first re-add must restore full authoritative Time range");
    });
  } finally {
    try { if (base && originalDisplay) { await chooseDisplay(page, config, originalDisplay); await selectPlot(page, config, "time"); if (originalSelectedRow) { const selected = await signalRowsState(page, config); if (!(selected.find(function (row) { return row.id === originalSelectedRow; }) || {}).selected) { const response = waitForApi(page, config, config.app.api.view, "POST"); await page.locator(testIdSelector(originalSelectedRow)).click(); await response; await waitForSettled(page, config); } } await commit(page, config, base.range[0], base.range[1], log, "cleanup restore Time limits", 200); } } catch (error_) { log(`cleanup could not restore Time limits: ${error_.message}`); }
    try { if (addedDisplay && (await tabs(page, config)).some(function (item) { return item.id === addedDisplay; })) { await chooseDisplay(page, config, addedDisplay); await page.locator(testIdSelector(`close-display-${addedDisplay}`)).click(); await idle(page, config); } } catch (error_) { log(`cleanup could not close scenario-created Display: ${error_.message}`); }
  }
}
testTimeLimits.requiredFeatures = ["frontend-state-management", "graph-output-zone", "signal-analyser-displays", "measurements-statistics", "time-limits"];
module.exports = testTimeLimits;
