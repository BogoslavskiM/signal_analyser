"use strict";

// C26 / DEC-032. This is a browser-only envelope seam: a captured valid
// /api/state payload is replayed after one malformed routed response. It does
// not make any claim about a provider, server runtime, or mutation transport.
const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  endpointMatches,
  performanceLog,
  responseJson,
  waitForApi,
  waitForSettled,
} = require("../../support/signal_analyser_page");

const STATE_ROUTE = "**/api/state*";
const TIMEOUT = 30000;
const FATAL_MESSAGE = "Некорректная структура snapshot сервера.";

function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function recoveryB(valid) {
  const recovered = clone(valid);
  const source = recovered.displays[0];
  const b = clone(source);
  b.id = `${source.id}-c26-recovery-b`;
  recovered.displays = recovered.displays.concat([b]);
  recovered.active_display_id = b.id;
  return recovered;
}
function mutationRequest(config, request) {
  const responseLike = {
    request: function () { return request; },
    url: function () { return request.url(); },
  };
  return endpointMatches(responseLike, config.app.api.view, "POST") ||
    endpointMatches(responseLike, config.app.api.displays, "POST");
}

async function assertKnownMutableControlsDisabled(page, config, assert) {
  const ids = config.app.testIds;
  const mutableIds = [
    ids.addDisplay,
    ids.displayOverflowTrigger,
    ids.clearDisplayAction,
    ids.plotTypeSelect,
    ids.settingsViewSelect,
    ids.toggleAllSignals,
    ids.normalizeYAxisCheckbox,
    ids.showMarkersCheckbox,
    ids.findPeaksAction,
    ids.timeMinInput,
    ids.timeMaxInput,
    ids.spectrumScaleSelect,
    ids.spectrumFrequencyScaleSelect,
    ids.spectrumLeakageInput,
    ids.spectrumFrequencyMinInput,
    ids.spectrumFrequencyMaxInput,
    ids.spectrogramOverlapPercentInput,
    ids.spectrogramLeakageInput,
    ids.spectrogramFrequencyMinInput,
    ids.spectrogramFrequencyMaxInput,
    ids.spectrogramFrequencyScaleSelect,
    ids.spectrogramPowerMinInput,
    ids.spectrogramPowerMaxInput,
    ids.persistenceLeakageInput,
  ].filter(Boolean);
  for (const testId of mutableIds) {
    const control = page.locator(testIdSelector(testId));
    if (await control.count()) {
      assert(await control.isDisabled(),
        `fatal state must disable known server-mutable control ${testId}`);
    }
  }
  const dynamicMutables = [
    '[data-testid="show-legend-checkbox"]',
    `[data-testid^=${JSON.stringify(ids.signalVisibilityCheckboxPrefix)}]`,
    `[data-testid^=${JSON.stringify(ids.signalRowPrefix)}]`,
    `[data-testid^=${JSON.stringify(ids.statisticsOptionPrefix)}]`,
  ];
  for (const selector of dynamicMutables) {
    const controls = page.locator(selector);
    const count = await controls.count();
    for (let index = 0; index < count; index += 1) {
      assert(await controls.nth(index).isDisabled(),
        `fatal state must disable dynamic server-mutable control ${selector} at ${index}`);
    }
  }
}

async function assertFatalReset(page, config, assert) {
  const error = page.locator(testIdSelector(config.app.errorTestId));
  await error.waitFor({ state: "visible", timeout: TIMEOUT });
  assert(await error.getByText(FATAL_MESSAGE, { exact: true }).isVisible(),
    "malformed snapshot must expose the exact DEC-032 fatal message in app-error");
  const retry = error.getByRole("button", { name: /retry|повтор/i });
  assert(await retry.isVisible() && await retry.isEnabled(),
    "fatal app-error must retain an enabled Retry action");

  const emptied = await page.evaluate(function (selectors) {
    const host = document.querySelector(selectors.host);
    const traces = host && (host.data || host._fullData || []);
    return {
      host: Boolean(host),
      rows: document.querySelectorAll(selectors.rows).length,
      tabs: document.querySelectorAll(selectors.tabs).length,
      traces: Array.isArray(traces) ? traces.length : 0,
    };
  }, {
    host: testIdSelector(config.app.testIds.activePlotHost),
    rows: `[data-testid^=${JSON.stringify(config.app.testIds.signalRowPrefix)}]`,
    tabs: '[data-testid^="display-tab-"]',
  });
  assert(emptied.host && emptied.rows === 0 && emptied.tabs === 0 && emptied.traces === 0,
    `fatal reset must empty rows/tabs/plot, observed ${JSON.stringify(emptied)}`);
  await assertKnownMutableControlsDisabled(page, config, assert);
  return retry;
}

async function testGlobalSnapshotEnvelope({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  let restoreRoute;
  const mutationPosts = [];
  const captureMutation = function (request) {
    if (mutationRequest(config, request)) mutationPosts.push({ method: request.method(), url: request.url() });
  };
  try {
    await step("capture valid browser snapshot without C26 runtime dependencies", async function () {
      log("browser_workspace_setup: background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
    });
    const valid = await state(page);
    assert(valid && Array.isArray(valid.signals) && Array.isArray(valid.displays) && valid.displays.length,
      "C26 route seam requires an already-loaded valid browser snapshot");
    const validB = recoveryB(valid);
    await page.waitForFunction(function (selector) {
      const host = document.querySelector(selector);
      const traces = host && (host.data || host._fullData || []);
      return Boolean(host && Array.isArray(traces) && traces.length > 0);
    }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
    const preFatal = await page.evaluate(function (selectors) {
      const host = document.querySelector(selectors.host);
      const traces = host && (host.data || host._fullData || []);
      return {
        host: Boolean(host),
        rows: document.querySelectorAll(selectors.rows).length,
        tabs: document.querySelectorAll(selectors.tabs).length,
        traces: Array.isArray(traces) ? traces.length : 0,
      };
    }, {
      host: testIdSelector(config.app.testIds.activePlotHost),
      rows: `[data-testid^=${JSON.stringify(config.app.testIds.signalRowPrefix)}]`,
      tabs: '[data-testid^="display-tab-"]',
    });
    assert(preFatal.host && preFatal.rows > 0 && preFatal.tabs > 0 && preFatal.traces > 0,
      `C26 must begin from populated A UI before fatal reset, observed ${JSON.stringify(preFatal)}`);
    // Begin the oracle only after normal setup: DEC-032 prohibits mutations
    // caused by the malformed envelope and its Retry, not unrelated startup.
    page.on("request", captureMutation);

    let stateRequests = 0;
    // Lower-layer C26 tests cover the full null/type/missing/duplicate/unknown
    // envelope matrix. This browser contract uses empty displays as one
    // representative structural class, then proves fatal UI and B recovery.
    const routeState = async function (route) {
      stateRequests += 1;
      await route.fulfill({
        body: JSON.stringify(stateRequests === 1 ? { signals: [], displays: [], active_display_id: "" } : validB),
        contentType: "application/json",
        status: 200,
      });
    };
    restoreRoute = routeState;
    await page.route(STATE_ROUTE, routeState);

    await step("malformed global envelope is fatal and clears browser presentation", async function () {
      const startedAt = Date.now();
      const malformed = waitForApi(page, config, config.app.api.state, "GET");
      await page.reload({ waitUntil: "domcontentloaded", timeout: TIMEOUT });
      const response = await malformed;
      await responseJson(response, "C26 malformed state response");
      performanceLog(log, "C26 malformed initial state", Date.now() - startedAt, undefined,
        `HTTP ${response.status()}; routed state request ${stateRequests}`);
      assert(stateRequests === 1, "C26 malformed setup must intercept exactly one initial state GET");
      await assertFatalReset(page, config, assert);
      assert(mutationPosts.length === 0,
        `malformed global envelope must not issue mutation POSTs: ${JSON.stringify(mutationPosts)}`);
    });

    await step("Retry fetches routed valid state and restores the browser", async function () {
      const retry = await assertFatalReset(page, config, assert);
      const startedAt = Date.now();
      const recovered = waitForApi(page, config, config.app.api.state, "GET");
      await retry.click({ timeout: TIMEOUT });
      const response = await recovered;
      const payload = await responseJson(response, "C26 Retry state response");
      performanceLog(log, "C26 Retry valid state", Date.now() - startedAt, undefined,
        `HTTP ${response.status()}; routed state request ${stateRequests}`);
      assert(stateRequests === 2 && payload && payload.active_display_id === validB.active_display_id &&
        Array.isArray(payload.displays) && payload.displays.length === validB.displays.length,
      "Retry must issue one new GET and receive the structurally distinct valid B snapshot");
      await waitForSettled(page, config);
      const recoveredState = await state(page);
      assert((recoveredState.displays || []).length === validB.displays.length &&
        recoveredState.active_display_id === validB.active_display_id,
      "valid Retry must restore distinct B active identity without replaying A or choosing a fallback");
      assert(await page.locator(testIdSelector(`display-tab-${validB.active_display_id}`)).isVisible(),
        "valid Retry must render the distinct B Display tab as the active identity");
      const error = page.locator(testIdSelector(config.app.errorTestId));
      assert(await error.count() === 0 || !await error.isVisible(),
        "valid Retry must remove the global fatal app-error");
      assert(mutationPosts.length === 0,
        `Retry recovery must not replay or issue mutation POSTs: ${JSON.stringify(mutationPosts)}`);
    });
  } finally {
    if (restoreRoute) await page.unroute(STATE_ROUTE, restoreRoute);
    page.off("request", captureMutation);
  }
}

testGlobalSnapshotEnvelope.requiredFeatures = [
  "frontend-state-management",
  "signal-analyser-displays",
  "graph-output-zone",
  "global-snapshot-envelope",
];

module.exports = testGlobalSnapshotEnvelope;
