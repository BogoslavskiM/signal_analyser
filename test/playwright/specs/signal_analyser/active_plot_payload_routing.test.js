"use strict";

// C29 / DEC-035. Disabled same-document route seam. It consumes the server's
// exact payload envelope, never manufactures branches from legacy plots, and
// proves local C29 quarantine against authoritative 200/409 responses.
const { openAppPage, testIdSelector } = require("../../support/app_page");
const { endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } =
  require("../../support/signal_analyser_page");

const VIEW_ROUTE = "**/api/view*";
const DISPLAY_ROUTE = "**/api/displays*";
const TIMEOUT = 30000;
const C27_MESSAGE = "Некорректный выбор сигналов в ответе сервера.";
const C29_MESSAGE = "Некорректные данные активного графика в ответе сервера.";
const PAYLOAD_KEYS = ["selected_signal", "visible_signals", "time_traces", "spectrum_traces", "spectrogram", "persistence"];
const VALID_PLOTS = new Set(["time", "spectrum", "spectrogram", "persistence"]);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }
function active(snapshot) { return snapshot.displays.find(function (display) { return display.id === snapshot.active_display_id; }); }
function activePlot(snapshot) { const display = active(snapshot); return display && display.active_plot; }
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function isPost(config, endpoint, request) {
  return endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, endpoint, "POST");
}
function assertExactServerPayload(assert, snapshot) {
  const display = active(snapshot);
  const payload = snapshot.plot_payload;
  assert(display && VALID_PLOTS.has(display.active_plot), "C29 requires a valid active Display and active_plot");
  assert(isPlainObject(payload) && JSON.stringify(Object.keys(payload).sort()) === JSON.stringify(PAYLOAD_KEYS.slice().sort()),
    "C29 requires the server snapshot's exact six-key plain plot_payload envelope; the seam must not synthesize it");
  assert(payload.selected_signal === display.analysis_signal &&
    JSON.stringify(payload.visible_signals) === JSON.stringify(display.visible_signals),
  "C29 requires server plot_payload selection projections to match the active Display directly");
  const branch = display.active_plot === "time" ? payload.time_traces :
    display.active_plot === "spectrum" ? payload.spectrum_traces : payload[display.active_plot];
  assert((display.active_plot === "time" || display.active_plot === "spectrum") ? Array.isArray(branch) : isPlainObject(branch),
    "C29 requires the server snapshot's active branch directly before targeted mutation");
  if (Array.isArray(branch)) {
    assert(branch.length === display.visible_signals.length && branch.every(function (trace, index) {
      return isPlainObject(trace) && Object.prototype.hasOwnProperty.call(trace, "signal") && trace.signal === display.visible_signals[index];
    }), "C29 requires ordered owned signal identities in the server active trace branch");
  } else {
    assert(Object.prototype.hasOwnProperty.call(branch, "signal") && branch.signal === display.analysis_signal,
      "C29 requires the server active heatmap branch's owned signal identity");
  }
}
function nextPlot(snapshot) { return Array.from(VALID_PLOTS).find(function (plot) { return plot !== activePlot(snapshot); }); }
function validRender(valid) {
  const changed = clone(valid);
  const plot = nextPlot(changed);
  active(changed).active_plot = plot;
  changed.active_plot = plot;
  return changed;
}
function malformedActiveWithValidPlots(valid) {
  const invalid = clone(valid);
  const plot = activePlot(invalid);
  // Keep the independently server-provided legacy branch untouched: this is
  // the no-fallback witness, not input used to construct plot_payload.
  if (!invalid.plots || !legacyBranchIsRenderable(invalid.plots[plot], plot)) {
    throw new Error(`C29 malformed fixture requires independently valid legacy plots.${plot}`);
  }
  if (plot === "time" || plot === "spectrum") invalid.plot_payload[`${plot}_traces`] = null;
  else invalid.plot_payload[plot] = { name: active(invalid).analysis_signal };
  return invalid;
}
function c27BeforeC29(valid) {
  const invalid = malformedActiveWithValidPlots(valid);
  const display = active(invalid);
  display.visible_signals = [display.visible_signals[0], display.visible_signals[0]];
  return invalid;
}
function c28BeforeC29(valid) {
  const invalid = malformedActiveWithValidPlots(valid);
  active(invalid).active_plot = "__c28-before-c29__";
  invalid.active_plot = "__c28-before-c29__";
  return invalid;
}
function addDistinctActive(valid, suffix) {
  const next = clone(valid);
  const b = clone(active(next));
  b.id = `${b.id}-${suffix}`;
  next.displays = next.displays.concat([b]);
  next.active_display_id = b.id;
  next.active_plot = b.active_plot;
  return next;
}
function recoverB(validWithTopology, bId) {
  const recovered = clone(validWithTopology);
  const b = recovered.displays.find(function (display) { return display.id === bId; });
  recovered.active_display_id = b.id;
  recovered.active_plot = b.active_plot;
  return recovered;
}
function renderableLine(trace) {
  return isPlainObject(trace) && Array.isArray(trace.x) && trace.x.length > 0 && Array.isArray(trace.y) && trace.y.length > 0;
}
function renderableHeatmap(trace) {
  return isPlainObject(trace) && Array.isArray(trace.x) && trace.x.length > 0 && Array.isArray(trace.y) && trace.y.length > 0 &&
    Array.isArray(trace.z) && trace.z.length > 0;
}
function legacyBranchIsRenderable(branch, plot) {
  const traces = Array.isArray(branch) ? branch : isPlainObject(branch) && Array.isArray(branch.data) ? branch.data :
    isPlainObject(branch) && Array.isArray(branch.traces) ? branch.traces : [branch];
  return traces.some(plot === "time" || plot === "spectrum" ? renderableLine : renderableHeatmap);
}
function rowIdentity(row) { return { id: row.id, name: row.name }; }
async function presentation(page, config) {
  return page.evaluate(function (selectors) {
    const host = document.querySelector(selectors.host);
    const traces = host && (host.data || host._fullData || []);
    const local = document.querySelector(selectors.local);
    return { host: Boolean(host), ready: host && host.getAttribute("data-plot-ready"), traces: Array.isArray(traces) ? traces.length : 0,
      local: Boolean(local), role: local && local.getAttribute("role"), tabs: Array.from(document.querySelectorAll(selectors.tabs)).map(function (node) {
        return { id: node.getAttribute("data-testid"), selected: node.getAttribute("aria-selected") };
      }) };
  }, { host: testIdSelector(config.app.testIds.activePlotHost), local: testIdSelector(config.app.testIds.activePlotPayloadContractErrorState), tabs: '[data-testid^="display-tab-"]' });
}
async function installDeferredPlotlyReact(page) {
  await page.evaluate(function () {
    const original = window.Plotly && window.Plotly.react;
    if (typeof original !== "function") throw new Error("C29 requires window.Plotly.react");
    const seam = { calls: 0, settled: false, original: original };
    seam.deferred = new Promise(function (resolve) { seam.resolve = resolve; });
    window.Plotly.react = function () { seam.calls += 1; return seam.calls === 1 ? seam.deferred : original.apply(this, arguments); };
    window.__e2eC29DeferredPlotly = seam;
  });
}
async function restorePlotlyReact(page) {
  await page.evaluate(function () { const seam = window.__e2eC29DeferredPlotly; if (seam && seam.original) window.Plotly.react = seam.original; delete window.__e2eC29DeferredPlotly; });
}
async function settleAndAssertNoResurrection(page, config, assert, localExpected) {
  const seam = await page.evaluate(async function () {
    const current = window.__e2eC29DeferredPlotly;
    if (!current || current.calls !== 1 || typeof current.resolve !== "function") throw new Error("C29 deferred Plotly.react did not start exactly one valid render");
    current.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) { requestAnimationFrame(resolve); });
    await Promise.resolve();
    current.settled = true;
    return { calls: current.calls, settled: current.settled };
  });
  assert(seam.settled && seam.calls === 1, `settled stale Plotly work must stay bounded, observed ${JSON.stringify(seam)}`);
  const observed = await presentation(page, config);
  assert(observed.local === localExpected && observed.traces === 0 && observed.ready !== "true",
    `settled stale Plotly work must not resurrect a graph, observed ${JSON.stringify(observed)}`);
}
async function assertC29Local(page, config, assert, expectedTabs, expectedRows) {
  const fatal = page.locator(testIdSelector(config.app.errorTestId));
  assert(await fatal.count() === 0 || !await fatal.isVisible(), "C29 malformed active payload must remain local");
  const local = page.locator(testIdSelector(config.app.testIds.activePlotPayloadContractErrorState));
  assert(await local.isVisible() && await local.getAttribute("role") === "alert" && (await local.innerText()).trim() === C29_MESSAGE,
    "C29 must expose its exact accessible Russian alert");
  const observed = await presentation(page, config);
  const rows = await signalRowsState(page, config);
  assert(rows.length === expectedRows.length && JSON.stringify(rows.map(rowIdentity)) === JSON.stringify(expectedRows),
    `C29 inventory must retain exact count/order/identity, observed ${JSON.stringify(rows.map(rowIdentity))}`);
  assert(observed.host && observed.local && observed.role === "alert" && observed.traces === 0 && observed.ready !== "true" && JSON.stringify(observed.tabs) === JSON.stringify(expectedTabs),
    `C29 must retain topology and clear the host, observed ${JSON.stringify(observed)}`);
  for (const row of rows) {
    const control = page.locator(testIdSelector(row.id));
    assert(await control.getAttribute("aria-disabled") === "true", `C29 inventory row ${row.id} must expose aria-disabled=true`);
  }
  const boxes = page.locator(`[data-testid^=${JSON.stringify(config.app.testIds.signalVisibilityCheckboxPrefix)}]`);
  assert(await boxes.count() === 0, "C29 quarantined inventory must expose zero membership checkboxes");
}
async function acceptDisplaySnapshot(page, config, snapshot, label) {
  const responsePromise = waitForApi(page, config, config.app.api.displays, "POST");
  await page.locator(testIdSelector(config.app.testIds.addDisplay)).click({ timeout: TIMEOUT });
  const response = await responsePromise;
  const payload = await responseJson(response, label);
  if (!response.ok()) throw new Error(`${label} failed with HTTP ${response.status()}`);
  return payload;
}

async function testActivePlotPayloadRouting({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  let viewHandler, displayHandler, deferred = false;
  const viewPosts = [], displayPosts = [];
  const captureView = function (request) { if (isPost(config, config.app.api.view, request)) viewPosts.push(request.url()); };
  const captureDisplay = function (request) { if (isPost(config, config.app.api.displays, request)) displayPosts.push(request.url()); };
  try {
    await step("capture exact valid server payload without C29 runtime dependency", async function () {
      log("browser_workspace_setup: background CDP only; no focus/Space/window action; no MATLAB coordination needed; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
    });
    const initial = await state(page);
    assertExactServerPayload(assert, initial);
    const initialRows = (await signalRowsState(page, config)).map(rowIdentity);
    assert(initialRows.length > 0, "C29 requires a nonempty inventory for exact read-only assertion");
    const renderA = validRender(initial);
    assertExactServerPayload(assert, renderA);
    const c27 = c27BeforeC29(initial);
    const validB = addDistinctActive(initial, "c29-b");
    assertExactServerPayload(assert, validB);
    const renderB = validRender(validB);
    assertExactServerPayload(assert, renderB);
    const localB = malformedActiveWithValidPlots(validB);
    const validC = addDistinctActive(validB, "c29-c");
    assertExactServerPayload(assert, validC);
    const c28 = c28BeforeC29(validC);
    const validD = addDistinctActive(validC, "c29-d");
    assertExactServerPayload(assert, validD);
    const renderD = validRender(validD);
    assertExactServerPayload(assert, renderD);
    const localD = malformedActiveWithValidPlots(validD);
    const recoveredB = recoverB(validD, validB.active_display_id);
    assertExactServerPayload(assert, recoveredB);
    page.on("request", captureView);
    page.on("request", captureDisplay);
    let viewRequests = 0;
    viewHandler = async function (route) {
      viewRequests += 1;
      const response = [
        { status: 200, body: renderA },
        { status: 409, body: c27 },
        { status: 200, body: renderB },
        { status: 409, body: localB },
        { status: 409, body: c28 },
        { status: 200, body: renderD },
        { status: 200, body: localD },
      ][viewRequests - 1];
      if (!response) throw new Error(`Unexpected C29 View request ${viewRequests}`);
      await route.fulfill({ status: response.status, contentType: "application/json",
        body: JSON.stringify(response.status === 409 ? { current: response.body } : response.body) });
    };
    let displayRequests = 0;
    displayHandler = async function (route) {
      displayRequests += 1;
      const body = [validB, validC, validD, recoveredB][displayRequests - 1];
      if (!body) throw new Error(`Unexpected C29 Display request ${displayRequests}`);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    };
    await page.route(VIEW_ROUTE, viewHandler);
    await page.route(DISPLAY_ROUTE, displayHandler);

    await step("C27 authoritative 409 takes precedence and purges deferred A render", async function () {
      await installDeferredPlotlyReact(page); deferred = true;
      const plotType = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
      const first = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(renderA), { timeout: TIMEOUT });
      await responseJson(await first, "C29 deferred A View response");
      await page.waitForFunction(function () { return window.__e2eC29DeferredPlotly && window.__e2eC29DeferredPlotly.calls === 1; }, undefined, { timeout: TIMEOUT });
      const second = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(initial), { timeout: TIMEOUT });
      const response = await second;
      await responseJson(response, "C29 C27 409 response");
      const c27Alert = page.locator(testIdSelector(config.app.testIds.displaySelectionContractErrorState));
      assert(response.status() === 409 && await c27Alert.isVisible() && (await c27Alert.innerText()).trim() === C27_MESSAGE,
        "C27 authoritative 409 must preserve its local alert before C29 validation");
      assert(!await page.locator(testIdSelector(config.app.testIds.activePlotPayloadContractErrorState)).isVisible(), "C27 precedence must suppress C29 alert");
      const startedAt = Date.now();
      await settleAndAssertNoResurrection(page, config, assert, false);
      performanceLog(log, "C29 C27 409 deferred A settlement", Date.now() - startedAt, undefined, "microtask + rAF + microtask; no resurrection");
      assert(viewPosts.length === 2 && viewRequests === 2, `C27 must issue exactly two controlled View POSTs, observed ${JSON.stringify(viewPosts)}`);
      await restorePlotlyReact(page); deferred = false;
    });
    await step("same-document B topology accepts a valid authoritative snapshot", async function () {
      const startedAt = Date.now();
      const payload = await acceptDisplaySnapshot(page, config, validB, "C29 valid B Display response");
      performanceLog(log, "C29 same-document B topology", Date.now() - startedAt, undefined, "authoritative Display POST 200");
      assert(payload.active_display_id === validB.active_display_id && displayRequests === 1, "C29 must continue with distinct valid B topology");
      await waitForSettled(page, config);
    });
    await step("C29 authoritative 409 quarantines B and purges deferred View work", async function () {
      await installDeferredPlotlyReact(page); deferred = true;
      const startedAt = Date.now();
      const plotType = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
      const valid = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(renderB), { timeout: TIMEOUT });
      await responseJson(await valid, "C29 valid B routed response");
      await page.waitForFunction(function () { return window.__e2eC29DeferredPlotly && window.__e2eC29DeferredPlotly.calls === 1; }, undefined, { timeout: TIMEOUT });
      const malformed = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(validB), { timeout: TIMEOUT });
      const response = await malformed;
      await responseJson(response, "C29 malformed B 409 response");
      performanceLog(log, "C29 B 409 local quarantine", Date.now() - startedAt, undefined, "valid legacy plots retained; malformed active branch only");
      const tabs = validB.displays.map(function (display) { return { id: `display-tab-${display.id}`, selected: display.id === validB.active_display_id ? "true" : "false" }; });
      await assertC29Local(page, config, assert, tabs, initialRows);
      const beforeSettlement = viewPosts.length;
      await settleAndAssertNoResurrection(page, config, assert, true);
      assert(viewPosts.length === beforeSettlement && viewRequests === 4, `C29 must issue exactly four controlled View POSTs, observed ${JSON.stringify(viewPosts)}`);
      await restorePlotlyReact(page); deferred = false;
    });
    await step("C28 authoritative 409 takes precedence over malformed C29 payload", async function () {
      const topology = await acceptDisplaySnapshot(page, config, validC, "C29 valid C Display response");
      assert(topology.active_display_id === validC.active_display_id && displayRequests === 2, "C29 must accept valid C topology before C28 precedence");
      await waitForSettled(page, config);
      const plotType = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
      const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(nextPlot(validC), { timeout: TIMEOUT });
      const response = await responsePromise;
      await responseJson(response, "C29 C28 409 response");
      const c28Alert = page.locator(testIdSelector(config.app.testIds.activePlotContractErrorState));
      assert(response.status() === 409 && await c28Alert.isVisible() && await c28Alert.getAttribute("role") === "alert", "C28 error must survive malformed C29 payload");
      assert(!await page.locator(testIdSelector(config.app.testIds.activePlotPayloadContractErrorState)).isVisible(), "C28 precedence must suppress C29 alert");
      assert(viewRequests === 5 && viewPosts.length === 5, "C28 precedence must not replay a quarantined View intent");
    });
    await step("C29 successful 200 quarantines D without replaying deferred View work", async function () {
      const topology = await acceptDisplaySnapshot(page, config, validD, "C29 valid D Display response");
      assert(topology.active_display_id === validD.active_display_id && displayRequests === 3, "C29 must accept valid D topology before successful malformed payload");
      await waitForSettled(page, config);
      await installDeferredPlotlyReact(page); deferred = true;
      const startedAt = Date.now();
      const plotType = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
      const valid = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(renderD), { timeout: TIMEOUT });
      await responseJson(await valid, "C29 valid D routed response");
      await page.waitForFunction(function () { return window.__e2eC29DeferredPlotly && window.__e2eC29DeferredPlotly.calls === 1; }, undefined, { timeout: TIMEOUT });
      const malformed = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(validD), { timeout: TIMEOUT });
      const response = await malformed;
      await responseJson(response, "C29 malformed D 200 response");
      performanceLog(log, "C29 D 200 local quarantine", Date.now() - startedAt, undefined, "successful authoritative payload; no View replay");
      const tabs = validD.displays.map(function (display) { return { id: `display-tab-${display.id}`, selected: display.id === validD.active_display_id ? "true" : "false" }; });
      await assertC29Local(page, config, assert, tabs, initialRows);
      const beforeSettlement = viewPosts.length;
      await settleAndAssertNoResurrection(page, config, assert, true);
      assert(response.status() === 200 && viewPosts.length === beforeSettlement && viewRequests === 7,
        `C29 successful malformed 200 must not replay View work, observed ${JSON.stringify(viewPosts)}`);
      await restorePlotlyReact(page); deferred = false;
    });
    await step("fully valid distinct B recovers same-document without resurrecting A", async function () {
      const startedAt = Date.now();
      const payload = await acceptDisplaySnapshot(page, config, recoveredB, "C29 recovered B Display response");
      performanceLog(log, "C29 same-document distinct B recovery", Date.now() - startedAt, undefined, "authoritative Display POST 200; no A replay");
      assert(payload.active_display_id === recoveredB.active_display_id && displayRequests === 4, "C29 recovery must receive fully valid distinct B");
      await waitForSettled(page, config);
      const recovered = await presentation(page, config);
      assert(!recovered.local && recovered.traces > 0 && recovered.tabs.length === recoveredB.displays.length && recovered.tabs.find(function (tab) { return tab.selected === "true"; }).id === `display-tab-${recoveredB.active_display_id}`,
        `C29 B recovery must restore only valid B topology, observed ${JSON.stringify(recovered)}`);
      assert(viewRequests === 7 && viewPosts.length === 7 && displayPosts.length === 4,
        `C29 recovery must not resurrect A/View intents, observed ${JSON.stringify({ viewPosts, displayPosts })}`);
    });
  } finally {
    if (deferred) await restorePlotlyReact(page);
    if (viewHandler) await page.unroute(VIEW_ROUTE, viewHandler);
    if (displayHandler) await page.unroute(DISPLAY_ROUTE, displayHandler);
    page.off("request", captureView);
    page.off("request", captureDisplay);
  }
}

testActivePlotPayloadRouting.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "graph-output-zone", "global-snapshot-envelope", "display-selection-snapshot", "active-plot-snapshot", "active-plot-payload-routing"];
module.exports = testActivePlotPayloadRouting;
