"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  clickAndWaitForView,
  isApiRequestUrl,
  measurementLocator,
  measurementSnapshotState,
  performanceLog,
  selectedRowId,
  setCheckboxAndWaitForView,
  signalRowsState,
  waitForSettled,
} = require("../../support/signal_analyser_page");

const STATISTICS = ["minimum", "maximum", "mean"];

function rowLocator(page, row) {
  return page.locator(`[data-testid=${JSON.stringify(row.id)}]`);
}

function checkboxLocator(page, row) {
  return page.locator(`[data-testid=${JSON.stringify(row.checkboxTestId)}]`);
}

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseFinite(value) {
  return Number(text(value).replace(/\s/g, "").replace(",", "."));
}

function selected(rows) {
  return rows.find(function (row) { return row.selected; });
}

function visible(rows) {
  return rows.filter(function (row) { return row.checked; });
}

async function tabIsActive(locator) {
  return locator.evaluate(function (element) {
    return element.getAttribute("aria-selected") === "true" ||
      element.getAttribute("aria-pressed") === "true" ||
      element.getAttribute("data-active") === "true" || element.classList.contains("is-active");
  });
}

async function localTabSwitch(page, config, assert, log, tabName) {
  const target = measurementLocator(page, config, tabName);
  const panel = measurementLocator(page, config, "panel");
  const requests = [];
  const onRequest = function (request) {
    if (isApiRequestUrl(request)) requests.push(`${request.method()} ${request.url()}`);
  };
  const startedAt = Date.now();
  page.on("request", onRequest);
  try {
    await target.click({ timeout: 30000 });
    if (tabName === "measurementsTab") {
      await panel.waitFor({ state: "visible", timeout: 30000 });
    } else {
      await page.waitForFunction(function (testId) {
        const element = document.querySelector(`[data-testid="${testId}"]`);
        return !element || element.offsetParent === null;
      }, config.app.testIds.measurements.panel, { timeout: 30000 });
    }
    await page.evaluate(function () { return Promise.resolve(); });
  } finally {
    page.off("request", onRequest);
  }
  performanceLog(log, `local ${tabName} switch`, Date.now() - startedAt, undefined,
    requests.length ? "unexpected API request" : "local-only");
  assert(await tabIsActive(target), `${tabName} must become the active bottom tab`);
  assert(requests.length === 0,
    `${tabName} must be a local UI switch without any API request: ${JSON.stringify(requests)}`);
}

async function localKeyboardTabSwitch(page, config, assert, log, key, expectedTabName) {
  const target = measurementLocator(page, config, expectedTabName);
  const panel = measurementLocator(page, config, "panel");
  const requests = [];
  const onRequest = function (request) {
    if (isApiRequestUrl(request)) requests.push(`${request.method()} ${request.url()}`);
  };
  const startedAt = Date.now();
  page.on("request", onRequest);
  try {
    await page.keyboard.press(key);
    if (expectedTabName === "measurementsTab") {
      await panel.waitFor({ state: "visible", timeout: 30000 });
    } else {
      await page.waitForFunction(function (testId) {
        const element = document.querySelector(`[data-testid="${testId}"]`);
        return !element || element.offsetParent === null;
      }, config.app.testIds.measurements.panel, { timeout: 30000 });
    }
    await page.evaluate(function () { return Promise.resolve(); });
  } finally {
    page.off("request", onRequest);
  }
  performanceLog(log, `local keyboard ${key} to ${expectedTabName}`, Date.now() - startedAt, undefined,
    requests.length ? "unexpected API request" : "local-only");
  assert(await tabIsActive(target), `${key} must activate ${expectedTabName}`);
  assert(await target.evaluate(function (element) { return document.activeElement === element; }),
    `${key} must move roving tab focus to ${expectedTabName}`);
  assert(requests.length === 0,
    `${key} bottom-tab navigation must not make an API request: ${JSON.stringify(requests)}`);
}

async function openMeasurementsFromStatisticsAction(page, config, assert, log) {
  const action = page.locator(testIdSelector(config.app.testIds.signalStatisticsAction));
  const measurements = measurementLocator(page, config, "measurementsTab");
  const panel = measurementLocator(page, config, "panel");
  const shell = page.locator(testIdSelector(config.app.testIds.shell));
  const before = {
    displayId: await shell.getAttribute("data-active-display-id"),
    revision: await shell.getAttribute("data-state-revision"),
    selectedRowId: await selectedRowId(page, config),
  };
  const requests = [];
  const onRequest = function (request) {
    if (isApiRequestUrl(request)) requests.push(`${request.method()} ${request.url()}`);
  };
  const startedAt = Date.now();
  page.on("request", onRequest);
  try {
    await action.click({ timeout: 30000 });
    await panel.waitFor({ state: "visible", timeout: 30000 });
    await page.evaluate(function () { return Promise.resolve(); });
  } finally {
    page.off("request", onRequest);
  }
  performanceLog(log, "Signal statistics action opens Measurements", Date.now() - startedAt, undefined,
    requests.length ? "unexpected API request" : "local-only");
  assert(await tabIsActive(measurements), "Signal statistics action must activate Measurements tab");
  assert(await measurements.evaluate(function (element) { return document.activeElement === element; }),
    "Signal statistics action must move focus to Measurements tab");
  assert(await selectedRowId(page, config) === before.selectedRowId,
    "Signal statistics action must preserve selected signal");
  assert(await shell.getAttribute("data-active-display-id") === before.displayId,
    "Signal statistics action must preserve active Display scope");
  assert(await shell.getAttribute("data-state-revision") === before.revision,
    "Signal statistics action must preserve state revision");
  assert(requests.length === 0,
    `Signal statistics action must not make API requests: ${JSON.stringify(requests)}`);
}

function assertStatistics(assert, snapshot, signalName) {
  assert(text(snapshot.signalName) === signalName,
    `selected-signal label must exactly equal ${JSON.stringify(signalName)}, got ${JSON.stringify(snapshot.signalName)}`);
  assert(snapshot.table.selectedSignal === signalName,
    `statistics table scope must exactly equal ${JSON.stringify(signalName)}, got ${JSON.stringify(snapshot.table.selectedSignal)}`);
  assert(snapshot.table.scopeSignals.length > 0 && snapshot.table.scopeSignals.every(function (name) {
    return name === signalName;
  }), `statistics descendants must expose only selected signal ${JSON.stringify(signalName)}`);
  assert(snapshot.table.rows.length === 3, "statistics table must contain exactly three rows");
  assert(JSON.stringify(snapshot.table.domRowIds) === JSON.stringify(STATISTICS.map(function (statistic) {
    return `measurement-row-${statistic}`;
  })), `statistics UI order must preserve authoritative items order: ${JSON.stringify(snapshot.table.domRowIds)}`);

  const valuesByStatistic = {};
  STATISTICS.forEach(function (statistic) {
    const row = snapshot.table.rows.find(function (candidate) { return candidate.statistic === statistic; });
    assert(row && row.id === `measurement-row-${statistic}`,
      `${statistic} must have its exact stable row selector`);
    assert(row.signal === signalName, `${statistic} row must be scoped to selected signal`);
    assert(row.values.length >= 4,
      `${statistic} must expose raw label, finite value, units and time cells: ${JSON.stringify(row.values)}`);
    assert(Number.isFinite(parseFinite(row.values[1])),
      `${statistic} value must be finite: ${JSON.stringify(row.values[1])}`);
    valuesByStatistic[statistic] = parseFinite(row.values[1]);
    assert(text(row.values[2]), `${statistic} units must be non-empty`);
    assert(text(row.values[3]), `${statistic} time must be non-empty`);
  });

  assert(valuesByStatistic.minimum <= valuesByStatistic.maximum,
    `raw minimum must not exceed maximum: ${JSON.stringify(valuesByStatistic)}`);
  assert(valuesByStatistic.mean >= valuesByStatistic.minimum && valuesByStatistic.mean <= valuesByStatistic.maximum,
    `raw mean must lie within minimum and maximum: ${JSON.stringify(valuesByStatistic)}`);
}

async function restoreInitialVisibility(page, config, initialRows, originalSelectedId, log) {
  const desired = new Map(initialRows.map(function (row) { return [row.id, row.checked]; }));
  let rows = await signalRowsState(page, config);
  for (const row of rows) {
    if (desired.get(row.id) === true && !row.checked) {
      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, row), true, log,
        `cleanup reveal ${row.name}`);
    }
  }
  rows = await signalRowsState(page, config);
  for (const row of rows) {
    if (desired.get(row.id) === false && row.checked && visible(rows).length > 1) {
      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, row), false, log,
        `cleanup hide ${row.name}`);
      rows = await signalRowsState(page, config);
    }
  }
  if (originalSelectedId && await selectedRowId(page, config) !== originalSelectedId) {
    await clickAndWaitForView(page, config, page.locator(`[data-testid=${JSON.stringify(originalSelectedId)}]`), log,
      "cleanup restore selected signal");
  }
}

async function testMeasurementsStatistics({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const startedAt = Date.now();
  let originalRowId = "";
  let initialRows = [];
  const forbiddenEndpoints = [];
  const onRequest = function (request) {
    if (/\/api\/(?:measurements|peaks)(?:[/?#]|$)/.test(request.url())) {
      forbiddenEndpoints.push(`${request.method()} ${request.url()}`);
    }
  };

  try {
    await step("open Signal Analyser with default Signals bottom tab", async function () {
      page.on("request", onRequest);
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const signals = measurementLocator(page, config, "signalsTab");
      const measurements = measurementLocator(page, config, "measurementsTab");
      assert(await signals.count() === 1 && await measurements.count() === 1,
        "bottom Signals and Measurements tabs must each resolve exactly once");
      assert(await tabIsActive(signals), "Signals must be the default active bottom tab");
      assert(!(await measurementLocator(page, config, "panel").isVisible()),
        "Measurements panel must be hidden while default Signals tab is active");
      originalRowId = await selectedRowId(page, config);
      initialRows = await signalRowsState(page, config);
      const current = selected(initialRows);
      assert(current && current.checked, "the selected signal must initially be visible");
    });

    await step("open local Measurements tab and assert exact selected raw rows", async function () {
      await localTabSwitch(page, config, assert, log, "measurementsTab");
      const current = selected(await signalRowsState(page, config));
      assert(current && current.checked, "Measurements scope requires a selected visible signal");
      assertStatistics(assert, await measurementSnapshotState(page, config), current.name);
    });

    await step("Signal statistics action opens local Measurements without state mutation", async function () {
      await localTabSwitch(page, config, assert, log, "signalsTab");
      await openMeasurementsFromStatisticsAction(page, config, assert, log);
      const current = selected(await signalRowsState(page, config));
      assert(current && current.checked, "statistics action must retain selected visible signal scope");
      assertStatistics(assert, await measurementSnapshotState(page, config), current.name);
    });

    await step("navigate bottom tabs by keyboard without API mutation", async function () {
      await localTabSwitch(page, config, assert, log, "signalsTab");
      await measurementLocator(page, config, "signalsTab").focus();
      await localKeyboardTabSwitch(page, config, assert, log, "ArrowRight", "measurementsTab");
      await localKeyboardTabSwitch(page, config, assert, log, "ArrowLeft", "signalsTab");
      await localKeyboardTabSwitch(page, config, assert, log, "End", "measurementsTab");
      await localKeyboardTabSwitch(page, config, assert, log, "Home", "signalsTab");
    });

    await step("row selection refreshes local Measurements scope", async function () {
      await localTabSwitch(page, config, assert, log, "signalsTab");
      const before = selected(await signalRowsState(page, config));
      const target = (await signalRowsState(page, config)).find(function (row) {
        return row.checked && row.id !== before.id;
      });
      assert(target, "scenario requires a second visible signal row");
      await clickAndWaitForView(page, config, rowLocator(page, target), log, `select ${target.name}`);
      assert(await selectedRowId(page, config) === target.id, "row click must select the visible target signal");
      await localTabSwitch(page, config, assert, log, "measurementsTab");
      assertStatistics(assert, await measurementSnapshotState(page, config), target.name);
    });

    await step("hiding selected signal falls back and refreshes Measurements scope", async function () {
      await localTabSwitch(page, config, assert, log, "signalsTab");
      let rows = await signalRowsState(page, config);
      const selectedToHide = selected(rows);
      assert(selectedToHide && selectedToHide.checked,
        "hidden-selected fallback requires a selected visible signal");
      const fallback = visible(rows).find(function (row) { return row.id !== selectedToHide.id; });
      assert(fallback,
        "hidden-selected fallback needs the selected signal and another visible signal");
      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, selectedToHide), false, log,
        `hide selected ${selectedToHide.name}`);
      rows = await signalRowsState(page, config);
      assert(await selectedRowId(page, config) === fallback.id,
        `hiding selected signal must select the first remaining visible signal ${fallback.id}`);
      assert(selected(rows).checked, "fallback selection must remain visible");
      await localTabSwitch(page, config, assert, log, "measurementsTab");
      assertStatistics(assert, await measurementSnapshotState(page, config), fallback.name);
    });
  } finally {
    page.off("request", onRequest);
    try {
      await localTabSwitch(page, config, assert, log, "signalsTab");
      if (initialRows.length) await restoreInitialVisibility(page, config, initialRows, originalRowId, log);
      await waitForSettled(page, config);
    } catch (error) {
      log(`cleanup could not restore statistics state/tab: ${error.message}`);
    }
    performanceLog(log, "measurements-statistics P0 scenario total", Date.now() - startedAt,
      undefined, "complete; soft budget pending healthy runtime baseline");
    assert(forbiddenEndpoints.length === 0,
      `P0 statistics must not call measurements or peaks endpoints: ${JSON.stringify(forbiddenEndpoints)}`);
  }
}

testMeasurementsStatistics.requiredFeatures = [
  "frontend-state-management",
  "layout-geometry",
  "measurements-statistics",
  "signal-analyser-displays",
];

module.exports = testMeasurementsStatistics;
