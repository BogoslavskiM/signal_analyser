"use strict";

// C27 / DEC-033. The route seam only supplies browser snapshots: it does not
// claim provider behavior or require a C27 server runtime. Exhaustive field
// permutations remain lower-layer coverage; this spec keeps the two visible
// boundary outcomes distinct.
const { openAppPage, testIdSelector } = require("../../support/app_page");
const { endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } =
  require("../../support/signal_analyser_page");

const STATE_ROUTE = "**/api/state*";
const TIMEOUT = 30000;
const FATAL_MESSAGE = "Некорректная структура snapshot сервера.";
const LOCAL_MESSAGE = "Некорректный выбор сигналов в ответе сервера.";

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }
function active(snapshot) { return snapshot.displays.find(function (display) { return display.id === snapshot.active_display_id; }); }
function recoveryB(valid) {
  const recovered = clone(valid);
  const b = clone(recovered.displays[0]);
  b.id = `${b.id}-c27-recovery-b`;
  recovered.displays = recovered.displays.concat([b]);
  recovered.active_display_id = b.id;
  return recovered;
}
function localInvalid(valid) {
  const invalid = clone(valid);
  const display = active(invalid);
  const name = display.visible_signals[0];
  display.visible_signals = [name, name];
  return invalid;
}
function rootInvalid(valid) {
  const invalid = clone(valid);
  invalid.visible_signals = ["__c27-invalid-root-projection__"];
  invalid.analysis_signal = "__c27-invalid-root-projection__";
  invalid.selected_signal = "__c27-invalid-root-projection__";
  return invalid;
}
function isMutation(config, request) {
  const responseLike = { request: function () { return request; }, url: function () { return request.url(); } };
  return endpointMatches(responseLike, config.app.api.view, "POST") ||
    endpointMatches(responseLike, config.app.api.displays, "POST");
}
async function presentation(page, config) {
  return page.evaluate(function (selectors) {
    const host = document.querySelector(selectors.host);
    const traces = host && (host.data || host._fullData || []);
    return {
      host: Boolean(host),
      rootDataset: Object.assign({}, document.querySelector(selectors.shell).dataset),
      rows: document.querySelectorAll(selectors.rows).length,
      traces: Array.isArray(traces) ? traces.length : 0,
      tabs: Array.from(document.querySelectorAll(selectors.tabs)).map(function (node) {
        return { id: node.getAttribute("data-testid"), selected: node.getAttribute("aria-selected") };
      }),
    };
  }, {
    host: testIdSelector(config.app.testIds.activePlotHost),
    shell: testIdSelector(config.app.testIds.shell),
    rows: `[data-testid^=${JSON.stringify(config.app.testIds.signalRowPrefix)}]`,
    tabs: '[data-testid^="display-tab-"]',
  });
}
async function assertNoGlobalFatal(page, config, assert) {
  const globalError = page.locator(testIdSelector(config.app.errorTestId));
  assert(await globalError.count() === 0 || !await globalError.isVisible(),
    "active Display selection corruption must remain page-local, not app-global fatal");
}

async function assertMembershipUnavailableOrDisabled(page, config, assert) {
  const boxes = page.locator(`[data-testid^=${JSON.stringify(config.app.testIds.signalVisibilityCheckboxPrefix)}]`);
  const count = await boxes.count();
  for (let index = 0; index < count; index += 1) {
    assert(await boxes.nth(index).isDisabled(),
      `quarantined Display must not expose enabled membership checkbox ${index}`);
  }
}

async function assertViewControlsDisabled(page, config, assert) {
  const ids = config.app.testIds;
  const fixed = [
    ids.plotTypeSelect, ids.toggleAllSignals, ids.normalizeYAxisCheckbox, ids.showMarkersCheckbox,
    ids.clearDisplayAction, ids.findPeaksAction,
    ids.timeMinInput, ids.timeMaxInput, ids.spectrumScaleSelect, ids.spectrumFrequencyScaleSelect,
    ids.spectrumLeakageInput, ids.spectrumFrequencyMinInput, ids.spectrumFrequencyMaxInput,
    ids.spectrogramOverlapPercentInput, ids.spectrogramLeakageInput,
    ids.spectrogramFrequencyMinInput, ids.spectrogramFrequencyMaxInput,
    ids.spectrogramFrequencyScaleSelect, ids.spectrogramPowerMinInput, ids.spectrogramPowerMaxInput,
    ids.persistenceLeakageInput,
  ].filter(Boolean);
  for (const testId of fixed) {
    const control = page.locator(testIdSelector(testId));
    if (await control.count()) assert(await control.isDisabled(),
      `quarantined Display must disable present View-mutable control ${testId}`);
  }
  for (const selector of [
    '[data-testid="show-legend-checkbox"]',
    `[data-testid^=${JSON.stringify(ids.statisticsOptionPrefix)}]`,
  ]) {
    const controls = page.locator(selector);
    const count = await controls.count();
    for (let index = 0; index < count; index += 1) {
      assert(await controls.nth(index).isDisabled(),
        `quarantined Display must disable View-mutable control ${selector} at ${index}`);
    }
  }
}

async function testDisplaySelectionSnapshot({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  let routeHandler;
  const mutations = [];
  const captureMutation = function (request) { if (isMutation(config, request)) mutations.push(request.url()); };
  try {
    await step("capture populated A without C27 runtime dependency", async function () {
      log("browser_workspace_setup: background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
    });
    const validA = await state(page);
    const activeA = active(validA);
    assert(Array.isArray(validA.signals) && activeA && activeA.visible_signals && activeA.visible_signals.length,
      "C27 seam needs an active A Display with a valid nonempty membership");
    await page.waitForFunction(function (selector) {
      const host = document.querySelector(selector), traces = host && (host.data || host._fullData || []);
      return Boolean(host && Array.isArray(traces) && traces.length > 0);
    }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
    const before = await presentation(page, config);
    const beforeRows = await signalRowsState(page, config);
    const beforeNames = validA.signals.map(function (signal) { return signal.name; });
    const beforeTabIds = validA.displays.map(function (display) { return `display-tab-${display.id}`; });
    assert(before.host && before.rows > 0 && before.tabs.length > 0 && before.traces > 0 &&
      JSON.stringify(beforeRows.map(function (row) { return row.name; })) === JSON.stringify(beforeNames) &&
      JSON.stringify(before.tabs.map(function (tab) { return tab.id; })) === JSON.stringify(beforeTabIds) &&
      before.tabs.filter(function (tab) { return tab.selected === "true"; }).length === 1 &&
      before.tabs.find(function (tab) { return tab.selected === "true"; }).id === `display-tab-${validA.active_display_id}`,
      `C27 needs populated A presentation, observed ${JSON.stringify(before)}`);

    const local = localInvalid(validA), global = rootInvalid(validA), validB = recoveryB(validA);
    page.on("request", captureMutation);
    let requests = 0;
    routeHandler = async function (route) {
      requests += 1;
      const payload = requests === 1 ? local : requests === 2 ? global : validB;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
    };
    await page.route(STATE_ROUTE, routeHandler);

    await step("invalid active selection quarantines only A without View POST", async function () {
      const startedAt = Date.now();
      const responsePromise = waitForApi(page, config, config.app.api.state, "GET");
      await page.reload({ waitUntil: "domcontentloaded", timeout: TIMEOUT });
      const response = await responsePromise;
      await responseJson(response, "C27 invalid active selection response");
      performanceLog(log, "C27 active local quarantine", Date.now() - startedAt, undefined, `HTTP ${response.status()}; state GET ${requests}`);
      await assertNoGlobalFatal(page, config, assert);
      const quarantined = await presentation(page, config);
      const quarantinedRows = await signalRowsState(page, config);
      assert(quarantined.host && quarantined.traces === 0 && quarantined.rows === before.rows &&
        JSON.stringify(quarantined.tabs) === JSON.stringify(before.tabs) &&
        JSON.stringify(quarantined.rootDataset) === JSON.stringify(before.rootDataset) &&
        JSON.stringify(quarantinedRows.map(function (row) { return row.name; })) === JSON.stringify(beforeNames) &&
        JSON.stringify(quarantinedRows.map(function (row) { return row.selected; })) ===
          JSON.stringify(beforeRows.map(function (row) { return row.selected; })),
      `active invalid selection must keep topology but clear only A presentation, observed ${JSON.stringify(quarantined)}`);
      const localError = page.locator(testIdSelector(config.app.testIds.displaySelectionContractErrorState));
      assert(await localError.isVisible() && (await localError.innerText()).trim() === LOCAL_MESSAGE,
        "active invalid selection must expose exact stable page-local contract error");
      await assertMembershipUnavailableOrDisabled(page, config, assert);
      await assertViewControlsDisabled(page, config, assert);
      const addDisplay = page.locator(testIdSelector(config.app.testIds.addDisplay));
      assert(await addDisplay.isVisible() && await addDisplay.isEnabled(),
        "local quarantine must leave topology Add Display control available");
      const activeTab = page.locator(testIdSelector(`display-tab-${validA.active_display_id}`));
      assert(await activeTab.isEnabled(), "local quarantine must leave topology Display selection available");
      await page.locator(testIdSelector(beforeRows[0].id)).click({ timeout: TIMEOUT });
      assert(mutations.length === 0, `local quarantine must not issue View/Display POST: ${JSON.stringify(mutations)}`);
    });

    await step("valid active root projection corruption is global fatal", async function () {
      const startedAt = Date.now();
      const responsePromise = waitForApi(page, config, config.app.api.state, "GET");
      await page.reload({ waitUntil: "domcontentloaded", timeout: TIMEOUT });
      const response = await responsePromise;
      await responseJson(response, "C27 root projection response");
      performanceLog(log, "C27 root projection global fatal", Date.now() - startedAt, undefined, `HTTP ${response.status()}; state GET ${requests}`);
      const error = page.locator(testIdSelector(config.app.errorTestId));
      await error.waitFor({ state: "visible", timeout: TIMEOUT });
      assert(await error.getByText(FATAL_MESSAGE, { exact: true }).isVisible(),
        "valid active root projection corruption must use exact global fatal app-error");
      assert(mutations.length === 0, `global fatal must not issue View/Display POST: ${JSON.stringify(mutations)}`);
    });

    await step("Retry receives distinct valid B topology", async function () {
      const error = page.locator(testIdSelector(config.app.errorTestId));
      const retry = error.getByRole("button", { name: /retry|повтор/i });
      const startedAt = Date.now();
      const responsePromise = waitForApi(page, config, config.app.api.state, "GET");
      await retry.click({ timeout: TIMEOUT });
      const response = await responsePromise;
      const payload = await responseJson(response, "C27 Retry response");
      performanceLog(log, "C27 Retry B", Date.now() - startedAt, undefined, `HTTP ${response.status()}; state GET ${requests}`);
      assert(requests === 3 && payload.active_display_id === validB.active_display_id,
        "Retry must fetch the distinct valid B snapshot, not replay A");
      await waitForSettled(page, config);
      const recoveredPresentation = await presentation(page, config);
      assert(recoveredPresentation.tabs.length === validB.displays.length &&
        recoveredPresentation.tabs.filter(function (tab) { return tab.selected === "true"; }).length === 1 &&
        recoveredPresentation.tabs.find(function (tab) { return tab.selected === "true"; }).id === `display-tab-${validB.active_display_id}` &&
        await page.locator(testIdSelector(`display-tab-${validB.active_display_id}`)).isVisible(),
      "Retry must recover the B identity and two-Display topology");
      assert(mutations.length === 0, `Retry must not replay View/Display mutation: ${JSON.stringify(mutations)}`);
    });
  } finally {
    if (routeHandler) await page.unroute(STATE_ROUTE, routeHandler);
    page.off("request", captureMutation);
  }
}

testDisplaySelectionSnapshot.requiredFeatures = [
  "frontend-state-management",
  "signal-analyser-displays",
  "graph-output-zone",
  "global-snapshot-envelope",
  "display-selection-snapshot",
];
module.exports = testDisplaySelectionSnapshot;
