"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  boxSignature,
  clickAndWaitForView,
  measurementLocator,
  measurementSnapshotState,
  performanceLog,
  responseJson,
  selectedRowId,
  signalRowsState,
  stateRevisionFromPayload,
  waitForSettled,
} = require("../../support/signal_analyser_page");

const STATISTICS = ["minimum", "maximum", "mean"];
const P0_SCENARIO_WARNING_MS = 45000;

function rowLocator(page, row) {
  return page.locator(`[data-testid=${JSON.stringify(row.id)}]`);
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

async function tabIsActive(locator) {
  return locator.evaluate(function (element) {
    return element.getAttribute("aria-selected") === "true" ||
      element.getAttribute("aria-pressed") === "true" ||
      element.getAttribute("data-active") === "true" || element.classList.contains("is-active");
  });
}

async function activateMeasurements(page, config, assert, log) {
  const signals = measurementLocator(page, config, "signalsTab");
  const measurements = measurementLocator(page, config, "measurementsTab");
  assert(await signals.count() === 1, "Signals tab selector must resolve exactly once");
  assert(await measurements.count() === 1, "Measurements tab selector must resolve exactly once");
  await signals.click({ timeout: 30000 });
  assert(await tabIsActive(signals), "click must activate Signals tab");
  await measurements.focus();
  await page.keyboard.press("Enter");
  await measurementLocator(page, config, "panel").waitFor({ state: "visible", timeout: 30000 });
  assert(await tabIsActive(measurements), "keyboard Enter must activate Measurements tab");
  await waitForSettled(page, config);
  log("Measurements tab activated through Signals click plus keyboard Enter");
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

  STATISTICS.forEach(function (statistic) {
    const row = snapshot.table.rows.find(function (candidate) { return candidate.statistic === statistic; });
    assert(row && row.id === `measurement-row-${statistic}`,
      `${statistic} must have its exact stable row selector`);
    assert(row.signal === signalName, `${statistic} row must be scoped to selected signal`);
    assert(row.values.length >= 4,
      `${statistic} must expose raw label, finite value, units and time cells: ${JSON.stringify(row.values)}`);
    assert(Number.isFinite(parseFinite(row.values[1])),
      `${statistic} value must be finite: ${JSON.stringify(row.values[1])}`);
    assert(text(row.values[2]), `${statistic} units must be non-empty`);
    assert(text(row.values[3]), `${statistic} time must be non-empty`);
  });
}

async function testMeasurementsStatistics({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const startedAt = Date.now();
  let originalRowId = "";
  let originalScroll = { x: 0, y: 0 };
  let originalTab = "signalsTab";

  try {
    await step("open Signal Analyser", async function () {
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      originalRowId = await selectedRowId(page, config);
      originalScroll = await page.evaluate(function () { return { x: window.scrollX, y: window.scrollY }; });
      originalTab = await tabIsActive(measurementLocator(page, config, "measurementsTab")) ?
        "measurementsTab" : "signalsTab";
    });

    await step("switch Signals to Measurements via click and keyboard", async function () {
      await activateMeasurements(page, config, assert, log);
    });

    const grid = page.locator(testIdSelector(config.app.testIds.plotGrid));
    const fixedGeometry = {
      grid: await boxSignature(grid),
      panel: await boxSignature(measurementLocator(page, config, "panel")),
    };
    assert(fixedGeometry.grid && fixedGeometry.panel, "fixed plot grid and Measurements panel geometry is required");

    let rows = await signalRowsState(page, config);
    const first = selected(rows);
    assert(first, "scenario requires exactly one selected signal");
    let beforeRevision;

    await step("assert raw selected-signal minimum maximum mean", async function () {
      assertStatistics(assert, await measurementSnapshotState(page, config), first.name);
      const response = await clickAndWaitForView(page, config, rowLocator(page, first), log,
        `refresh selected ${first.name} statistics revision`);
      beforeRevision = stateRevisionFromPayload(
        await responseJson(response, "selected-signal baseline"), "selected-signal baseline"
      );
    });

    await step("switch selected signal and refresh scope revision geometry", async function () {
      rows = await signalRowsState(page, config);
      const target = rows.find(function (row) { return row.id !== first.id; });
      assert(target, "scenario requires a second signal row");
      const response = await clickAndWaitForView(page, config, rowLocator(page, target), log,
        `select ${target.name} statistics`);
      const revision = stateRevisionFromPayload(
        await responseJson(response, "selected-signal refresh"), "selected-signal refresh"
      );
      assert(revision > beforeRevision,
        `selected-signal revision must increase (${beforeRevision} -> ${revision})`);
      assert(await selectedRowId(page, config) === target.id, "selected signal row must refresh");
      assertStatistics(assert, await measurementSnapshotState(page, config), target.name);
      assert(JSON.stringify(await boxSignature(grid)) === JSON.stringify(fixedGeometry.grid),
        "statistics refresh must not change grid geometry");
      assert(JSON.stringify(await boxSignature(measurementLocator(page, config, "panel"))) === JSON.stringify(fixedGeometry.panel),
        "statistics refresh must not change Measurements panel geometry");
    });
  } finally {
    try {
      if (originalRowId && await selectedRowId(page, config) !== originalRowId) {
        await clickAndWaitForView(page, config, page.locator(`[data-testid=${JSON.stringify(originalRowId)}]`), log,
          "cleanup restore selected signal");
      }
      await measurementLocator(page, config, originalTab).click({ timeout: 30000 });
      await page.evaluate(function (scroll) { window.scrollTo(scroll.x, scroll.y); }, originalScroll);
      await waitForSettled(page, config);
    } catch (error) {
      log(`cleanup could not restore statistics state/tab: ${error.message}`);
    }
    performanceLog(log, "measurements-statistics scenario total", Date.now() - startedAt,
      P0_SCENARIO_WARNING_MS, "complete");
  }
}

testMeasurementsStatistics.requiredFeatures = [
  "frontend-state-management",
  "layout-geometry",
  "measurements-statistics",
];

module.exports = testMeasurementsStatistics;
