"use strict";

// C28 / DEC-034. This disabled route seam exercises only the observable
// browser boundary. It intentionally leaves the exhaustive malformed-value,
// queue, 200 and 409 matrix to lower-layer tests and makes no server claim.
const { openAppPage, testIdSelector } = require("../../support/app_page");
const { endpointMatches, performanceLog, responseJson, waitForApi, waitForSettled } =
  require("../../support/signal_analyser_page");

const STATE_ROUTE = "**/api/state*";
const VIEW_ROUTE = "**/api/view*";
const TIMEOUT = 30000;
const FATAL_MESSAGE = "Некорректная структура snapshot сервера.";
const VALID_PLOTS = new Set(["time", "spectrum", "spectrogram", "persistence"]);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }
function active(snapshot) {
  return snapshot.displays.find(function (display) { return display.id === snapshot.active_display_id; });
}
function activePlot(snapshot) {
  const display = active(snapshot);
  return display && display.active_plot;
}
function isViewPost(config, request) {
  return endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } },
    config.app.api.view, "POST");
}
function activeInvalid(valid) {
  const invalid = clone(valid);
  active(invalid).active_plot = "__c28-invalid-active-plot__";
  return invalid;
}
function validPlotChange(valid) {
  const changed = clone(valid);
  const current = activePlot(changed);
  const next = Array.from(VALID_PLOTS).find(function (plot) { return plot !== current; });
  active(changed).active_plot = next;
  changed.active_plot = next;
  return changed;
}
function inactiveInvalidWithActiveB(valid) {
  const isolated = clone(valid);
  const a = isolated.displays[0];
  const b = clone(a);
  b.id = `${a.id}-c28-valid-b`;
  b.active_plot = VALID_PLOTS.has(a.active_plot) ? a.active_plot : "time";
  a.active_plot = "__c28-invalid-inactive-plot__";
  isolated.displays = [a, b];
  isolated.active_display_id = b.id;
  isolated.active_plot = b.active_plot;
  return isolated;
}
function rootMismatch(valid) {
  const invalid = clone(valid);
  const current = activePlot(invalid);
  invalid.active_plot = current === "time" ? "spectrum" : "time";
  return invalid;
}
function recoveryB(valid) {
  const recovered = clone(valid);
  const b = clone(active(recovered));
  b.id = `${b.id}-c28-recovery-b`;
  recovered.displays = recovered.displays.concat([b]);
  recovered.active_display_id = b.id;
  recovered.active_plot = b.active_plot;
  return recovered;
}
async function presentation(page, config) {
  return page.evaluate(function (selectors) {
    const host = document.querySelector(selectors.host);
    const traces = host && (host.data || host._fullData || []);
    const local = document.querySelector(selectors.localError);
    return {
      host: Boolean(host),
      localError: Boolean(local),
      localRole: local && local.getAttribute("role"),
      ready: host && host.getAttribute("data-plot-ready"),
      tabs: Array.from(document.querySelectorAll(selectors.tabs)).map(function (node) {
        return { id: node.getAttribute("data-testid"), selected: node.getAttribute("aria-selected") };
      }),
      traceCount: Array.isArray(traces) ? traces.length : 0,
    };
  }, {
    host: testIdSelector(config.app.testIds.activePlotHost),
    localError: testIdSelector(config.app.testIds.activePlotContractErrorState),
    tabs: '[data-testid^="display-tab-"]',
  });
}
async function assertLocalQuarantine(page, config, assert, expectedTabs) {
  const fatal = page.locator(testIdSelector(config.app.errorTestId));
  assert(await fatal.count() === 0 || !await fatal.isVisible(),
    "malformed active Display active_plot must not escalate to global app-error");
  const local = page.locator(testIdSelector(config.app.testIds.activePlotContractErrorState));
  assert(await local.isVisible(), "active malformed plot must expose the stable local contract state");
  assert(await local.getAttribute("role") === "alert",
    "active malformed plot local contract state must be an accessible alert");
  const observed = await presentation(page, config);
  assert(observed.host && observed.localError && observed.localRole === "alert" &&
    observed.traceCount === 0 && observed.ready !== "true" &&
    JSON.stringify(observed.tabs) === JSON.stringify(expectedTabs),
  `local quarantine must preserve topology and clear the shared host, observed ${JSON.stringify(observed)}`);
  return observed;
}
async function installDeferredPlotlyReact(page) {
  await page.evaluate(function () {
    const original = window.Plotly && window.Plotly.react;
    if (typeof original !== "function") throw new Error("C28 requires window.Plotly.react");
    const seam = { calls: 0, settled: false, original: original };
    seam.deferred = new Promise(function (resolve) { seam.resolve = resolve; });
    window.Plotly.react = function () {
      seam.calls += 1;
      if (seam.calls === 1) return seam.deferred;
      return original.apply(this, arguments);
    };
    window.__e2eC28DeferredPlotly = seam;
  });
}
async function settleDeferredPlotlyReact(page) {
  await page.evaluate(async function () {
    const seam = window.__e2eC28DeferredPlotly;
    if (!seam || seam.calls !== 1 || typeof seam.resolve !== "function") {
      throw new Error("C28 deferred Plotly.react did not start exactly one valid render");
    }
    seam.resolve();
    await Promise.resolve();
    await Promise.resolve();
    seam.settled = true;
  });
  await page.waitForFunction(function () {
    return Boolean(window.__e2eC28DeferredPlotly && window.__e2eC28DeferredPlotly.settled);
  }, undefined, { timeout: TIMEOUT });
}
async function restorePlotlyReact(page) {
  await page.evaluate(function () {
    const seam = window.__e2eC28DeferredPlotly;
    if (seam && seam.original) window.Plotly.react = seam.original;
    delete window.__e2eC28DeferredPlotly;
  });
}
async function assertSettledNoResurrection(page, config, assert) {
  const seam = await page.evaluate(async function () {
    const current = window.__e2eC28DeferredPlotly;
    if (!current || !current.settled) throw new Error("C28 deferred Plotly.react was not settled");
    // A microtask plus one painted frame makes a late continuation observable
    // without an arbitrary timer. A second react call is recorded even when
    // the local error keeps the DOM visually unchanged.
    await Promise.resolve();
    await new Promise(function (resolve) { requestAnimationFrame(resolve); });
    await Promise.resolve();
    return { calls: current.calls, settled: current.settled };
  });
  assert(seam.settled && seam.calls === 1,
    `settled stale Plotly render must not invoke Plotly.react again, observed ${JSON.stringify(seam)}`);
  const observed = await presentation(page, config);
  assert(observed.localError && observed.traceCount === 0 && observed.ready !== "true",
    `settled stale Plotly render must not resurrect a graph, observed ${JSON.stringify(observed)}`);
}

async function testActivePlotSnapshot({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  let routeHandler;
  let viewRouteHandler;
  let deferredPlotlyInstalled = false;
  const viewPosts = [];
  const captureViewPost = function (request) { if (isViewPost(config, request)) viewPosts.push(request.url()); };
  try {
    await step("capture valid active plot snapshot without C28 runtime dependency", async function () {
      log("browser_workspace_setup: background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
    });
    const validA = await state(page);
    assert(active(validA) && VALID_PLOTS.has(activePlot(validA)) && validA.active_plot === activePlot(validA),
      "C28 route seam requires an initial valid active Display/root active_plot projection");
    await page.waitForFunction(function (selector) {
      const host = document.querySelector(selector), traces = host && (host.data || host._fullData || []);
      return Boolean(host && Array.isArray(traces) && traces.length > 0);
    }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });

    const local = activeInvalid(validA);
    const validRender = validPlotChange(validA);
    const isolatedB = inactiveInvalidWithActiveB(validA);
    const validB = recoveryB(isolatedB);
    validB.displays[0].active_plot = validA.displays[0].active_plot;
    const global = rootMismatch(validB);
    const localTabs = validA.displays.map(function (display) {
      return { id: `display-tab-${display.id}`, selected: display.id === validA.active_display_id ? "true" : "false" };
    });
    page.on("request", captureViewPost);
    let viewRequests = 0;
    viewRouteHandler = async function (route) {
      viewRequests += 1;
      const payload = viewRequests === 1 ? validRender : viewRequests === 2 ? local : null;
      if (!payload) throw new Error(`Unexpected C28 View request ${viewRequests}`);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
    };
    await page.route(VIEW_ROUTE, viewRouteHandler);
    await installDeferredPlotlyReact(page);
    deferredPlotlyInstalled = true;
    let stateRequests = 0;
    routeHandler = async function (route) {
      stateRequests += 1;
      const payload = [isolatedB, global, validB][stateRequests - 1];
      if (!payload) throw new Error(`Unexpected C28 state request ${stateRequests}`);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
    };
    await page.route(STATE_ROUTE, routeHandler);

    await step("deferred valid Plotly render settles after invalid active plot quarantine", async function () {
      const startedAt = Date.now();
      const plotType = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
      assert(await plotType.isVisible() && await plotType.isEnabled(),
        "C28 deferred race requires the stable enabled plot-type control");
      const validResponse = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(validRender), { timeout: TIMEOUT });
      await responseJson(await validResponse, "C28 valid render response");
      await page.waitForFunction(function () {
        return Boolean(window.__e2eC28DeferredPlotly && window.__e2eC28DeferredPlotly.calls === 1);
      }, undefined, { timeout: TIMEOUT });
      const invalidResponse = waitForApi(page, config, config.app.api.view, "POST");
      await plotType.selectOption(activePlot(validA), { timeout: TIMEOUT });
      await responseJson(await invalidResponse, "C28 active local quarantine response");
      performanceLog(log, "C28 deferred Plotly then active_plot quarantine", Date.now() - startedAt, undefined,
        `two routed View POST responses; deferred calls ${await page.evaluate(function () { return window.__e2eC28DeferredPlotly.calls; })}`);
      await assertLocalQuarantine(page, config, assert, localTabs);
      const postsBeforeSettlement = viewPosts.length;
      const settlementStartedAt = Date.now();
      await settleDeferredPlotlyReact(page);
      await assertSettledNoResurrection(page, config, assert);
      performanceLog(log, "C28 deferred Plotly settlement checkpoint", Date.now() - settlementStartedAt, undefined,
        "one microtask + one animation frame; Plotly.react calls remain 1");
      assert(viewPosts.length === postsBeforeSettlement,
        `settled local quarantine must issue zero View POST: ${JSON.stringify(viewPosts)}`);
      assert(viewRequests === 2, `C28 race must use only its two controlled View responses, observed ${viewRequests}`);
    });

    await restorePlotlyReact(page);
    deferredPlotlyInstalled = false;
    await page.unroute(VIEW_ROUTE, viewRouteHandler);
    viewRouteHandler = null;

    await step("invalid inactive A preserves valid active B topology and graph", async function () {
      const startedAt = Date.now();
      const responsePromise = waitForApi(page, config, config.app.api.state, "GET");
      await page.reload({ waitUntil: "domcontentloaded", timeout: TIMEOUT });
      const response = await responsePromise;
      await responseJson(response, "C28 inactive isolation response");
      performanceLog(log, "C28 A/B isolation", Date.now() - startedAt, undefined,
        `HTTP ${response.status()}; routed state GET ${stateRequests}`);
      await waitForSettled(page, config);
      const observed = await presentation(page, config);
      assert(observed.traceCount > 0 && !observed.localError && observed.tabs.length === 2 &&
        observed.tabs.find(function (tab) { return tab.selected === "true"; }).id ===
          `display-tab-${isolatedB.active_display_id}`,
      `invalid inactive A must not suppress valid active B, observed ${JSON.stringify(observed)}`);
      assert(viewPosts.length === 2, `A/B isolation must not replay a View POST: ${JSON.stringify(viewPosts)}`);
    });

    await step("valid-active root mismatch is fatal and Retry restores distinct B", async function () {
      const startedAt = Date.now();
      const fatalResponse = waitForApi(page, config, config.app.api.state, "GET");
      await page.reload({ waitUntil: "domcontentloaded", timeout: TIMEOUT });
      const response = await fatalResponse;
      await responseJson(response, "C28 root mismatch response");
      performanceLog(log, "C28 valid-active root mismatch", Date.now() - startedAt, undefined,
        `HTTP ${response.status()}; routed state GET ${stateRequests}`);
      const error = page.locator(testIdSelector(config.app.errorTestId));
      await error.waitFor({ state: "visible", timeout: TIMEOUT });
      assert(await error.getByText(FATAL_MESSAGE, { exact: true }).isVisible(),
        "valid active_plot root mismatch must use the exact global fatal app-error");
      const retry = error.getByRole("button", { name: /retry|повтор/i });
      const retryStartedAt = Date.now();
      const recoveredResponse = waitForApi(page, config, config.app.api.state, "GET");
      await retry.click({ timeout: TIMEOUT });
      const recoveredPayload = await responseJson(await recoveredResponse, "C28 Retry response");
      performanceLog(log, "C28 Retry distinct B", Date.now() - retryStartedAt, undefined,
        `HTTP 200; routed state GET ${stateRequests}`);
      assert(stateRequests === 3 && recoveredPayload.active_display_id === validB.active_display_id,
        "Retry must receive the distinct valid B snapshot, not replay a quarantined A");
      await waitForSettled(page, config);
      const recovered = await presentation(page, config);
      assert(recovered.traceCount > 0 && !recovered.localError &&
        recovered.tabs.find(function (tab) { return tab.selected === "true"; }).id ===
          `display-tab-${validB.active_display_id}`,
      `Retry must restore distinct B graph topology, observed ${JSON.stringify(recovered)}`);
      assert(viewPosts.length === 2, `fatal/Retry must not replay View POST: ${JSON.stringify(viewPosts)}`);
    });
  } finally {
    if (deferredPlotlyInstalled) await restorePlotlyReact(page);
    if (viewRouteHandler) await page.unroute(VIEW_ROUTE, viewRouteHandler);
    if (routeHandler) await page.unroute(STATE_ROUTE, routeHandler);
    page.off("request", captureViewPost);
  }
}

testActivePlotSnapshot.requiredFeatures = [
  "frontend-state-management",
  "signal-analyser-displays",
  "graph-output-zone",
  "global-snapshot-envelope",
  "display-selection-snapshot",
  "active-plot-snapshot",
];
module.exports = testActivePlotSnapshot;
