"use strict";

const { openAppPage } = require("../../support/app_page");
const {
  assertAtLeastOneVisible,
  assertLineLegendForVisible,
  assertMarkedPlotHostsAlive,
  assertNoPreparingPlaceholders,
  assertRussianVisibilityControls,
  assertSelectedHeatmap,
  cardLocator,
  clickAndWaitForView,
  markPlotHosts,
  plotSignature,
  selectedRowId,
  setCheckboxAndWaitForView,
  signalRowsState,
  testIds,
  waitForPlotlyReady,
} = require("../../support/signal_analyser_page");

const PLOTS = ["time", "spectrum", "spectrogram", "persistence"];

function rowLocator(page, row) {
  return page.locator(`[data-testid=${JSON.stringify(row.id)}]`);
}

function checkboxLocator(page, row) {
  return page.locator(`[data-testid=${JSON.stringify(row.checkboxTestId)}]`);
}

function visibleRows(rows) {
  return rows.filter(function (row) { return row.checked; });
}

function selectedRow(rows) {
  return rows.find(function (row) { return row.selected; });
}

async function assertNoLayoutSwitcher(page, assert) {
  assert(await page.getByRole("tab").count() === 0,
    "fixed 2x2 workspace must not expose display tabs");
  const forbidden = page.locator(
    "[data-testid*='add-display'], [data-testid*='layout-chooser'], " +
    "[data-testid*='multi-layout'], [data-testid*='display-tabs']"
  );
  assert(await forbidden.count() === 0,
    "fixed 2x2 workspace must not expose layout/add-display controls");
}

async function ensureTwoVisibleSignals(page, config, assert, log) {
  let rows = await signalRowsState(page, config);
  assert(rows.length >= 2, "visibility cascade needs at least two signal rows");
  if (visibleRows(rows).length >= 2) return rows;

  const hidden = rows.find(function (row) { return !row.checked; });
  assert(hidden, "visibility cascade needs a hidden signal to reveal when only one is initially visible");
  await setCheckboxAndWaitForView(page, config, checkboxLocator(page, hidden), true, log,
    `reveal ${hidden.name} for visibility cascade`);
  await waitForPlotlyReady(page, config, PLOTS);
  rows = await signalRowsState(page, config);
  assert(visibleRows(rows).length >= 2, "at least two visible signals are required after reveal");
  return rows;
}

async function restoreInitialVisibility(page, config, initialRows, originalSelectedId, log) {
  let rows = await signalRowsState(page, config);
  const desiredByName = new Map(initialRows.map(function (row) { return [row.name, row.checked]; }));

  for (const row of rows) {
    if (desiredByName.get(row.name) === true && !row.checked) {
      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, row), true, log,
        `cleanup reveal ${row.name}`);
    }
  }

  rows = await signalRowsState(page, config);
  for (const row of rows) {
    if (desiredByName.get(row.name) === false && row.checked) {
      const currentVisibleCount = visibleRows(await signalRowsState(page, config)).length;
      if (currentVisibleCount > 1) {
        await setCheckboxAndWaitForView(page, config, checkboxLocator(page, row), false, log,
          `cleanup hide ${row.name}`);
      }
    }
  }

  const selected = await selectedRowId(page, config);
  if (originalSelectedId && selected !== originalSelectedId) {
    const original = page.locator(`[data-testid=${JSON.stringify(originalSelectedId)}]`);
    await clickAndWaitForView(page, config, original, log, "cleanup restore selected signal");
  }
}

async function assertLinePlotsExposeVisibleSignals(page, config, assert) {
  const rows = await signalRowsState(page, config);
  const visible = visibleRows(rows);
  assertAtLeastOneVisible(assert, rows);
  for (const plot of ["time", "spectrum"]) {
    assertLineLegendForVisible(assert, await plotSignature(cardLocator(page, config, plot)), visible, plot);
  }
}

async function assertHeatmapsUseSelectedVisibleSignal(page, config, assert) {
  const rows = await signalRowsState(page, config);
  const selected = selectedRow(rows);
  assert(selected && selected.checked, "selected signal must be visible before heatmap assertions");
  for (const plot of ["spectrogram", "persistence"]) {
    assertSelectedHeatmap(assert, await plotSignature(cardLocator(page, config, plot)), selected.name, plot);
  }
}

async function testVisibilityCascade({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser and wait for four Plotly hosts", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
    await waitForPlotlyReady(page, config, PLOTS);
    await assertNoPreparingPlaceholders(page, assert);
    await markPlotHosts(page, config);
  });

  const initialRows = await signalRowsState(page, config);
  const originalSelectedId = await selectedRowId(page, config);

  try {
    await step("verify Russian visibility checkboxes and fixed workspace contract", async function () {
      assertRussianVisibilityControls(assert, initialRows);
      assertAtLeastOneVisible(assert, initialRows);
      await assertNoLayoutSwitcher(page, assert);
    });

    await step("row click selects a visible signal", async function () {
      const rows = await ensureTwoVisibleSignals(page, config, assert, log);
      const selected = selectedRow(rows);
      const target = visibleRows(rows).find(function (row) {
        return !selected || row.id !== selected.id;
      });
      assert(target, "a non-selected visible row is required for row selection");
      await clickAndWaitForView(page, config, rowLocator(page, target), log,
        `select visible row ${target.name}`);
      await waitForPlotlyReady(page, config, PLOTS);
      await assertMarkedPlotHostsAlive(page, config, assert);
      assert(await selectedRowId(page, config) === target.id,
        "clicking a signal row must select that signal");
    });

    await step("checkbox changes visibility without selecting its row or racing Plotly react", async function () {
      let rows = await ensureTwoVisibleSignals(page, config, assert, log);
      const selected = selectedRow(rows);
      const target = visibleRows(rows).find(function (row) {
        return selected && row.id !== selected.id;
      });
      assert(target, "a visible non-selected signal is required for checkbox isolation");
      const selectedBefore = await selectedRowId(page, config);

      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, target), false, log,
        `hide non-selected ${target.name}`);
      await waitForPlotlyReady(page, config, PLOTS);
      await assertNoPreparingPlaceholders(page, assert);
      await assertMarkedPlotHostsAlive(page, config, assert);

      rows = await signalRowsState(page, config);
      assert(await selectedRowId(page, config) === selectedBefore,
        "clicking a visibility checkbox must not select its row");
      assertAtLeastOneVisible(assert, rows);

      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, target), true, log,
        `restore non-selected ${target.name}`);
      await waitForPlotlyReady(page, config, PLOTS);
      await assertMarkedPlotHostsAlive(page, config, assert);
    });

    await step("hiding the selected signal falls back to the first visible signal", async function () {
      let rows = await ensureTwoVisibleSignals(page, config, assert, log);
      const candidates = visibleRows(rows);
      const firstVisible = candidates[0];
      const selectedToHide = candidates[1];
      assert(firstVisible && selectedToHide,
        "fallback contract needs a selected visible signal after the first visible row");

      await clickAndWaitForView(page, config, rowLocator(page, selectedToHide), log,
        `select ${selectedToHide.name} before hiding`);
      await waitForPlotlyReady(page, config, PLOTS);

      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, selectedToHide), false, log,
        `hide selected ${selectedToHide.name}`);
      await waitForPlotlyReady(page, config, PLOTS);
      await assertNoPreparingPlaceholders(page, assert);
      await assertMarkedPlotHostsAlive(page, config, assert);

      rows = await signalRowsState(page, config);
      assert(await selectedRowId(page, config) === firstVisible.id,
        `hiding selected signal must select first visible row ${firstVisible.id}`);
      assertAtLeastOneVisible(assert, rows);

      await setCheckboxAndWaitForView(page, config, checkboxLocator(page, selectedToHide), true, log,
        `restore hidden selected ${selectedToHide.name}`);
      await waitForPlotlyReady(page, config, PLOTS);
    });

    await step("visible signals drive line legends and selected-visible heatmaps", async function () {
      await waitForPlotlyReady(page, config, PLOTS);
      await assertLinePlotsExposeVisibleSignals(page, config, assert);
      await assertHeatmapsUseSelectedVisibleSignal(page, config, assert);
      await assertNoPreparingPlaceholders(page, assert);
      await assertMarkedPlotHostsAlive(page, config, assert);
      log(`visibility cascade selector ids ${JSON.stringify(testIds(config))}`);
    });
  } finally {
    try {
      await restoreInitialVisibility(page, config, initialRows, originalSelectedId, log);
    } catch (error) {
      log(`cleanup could not restore initial visibility/selection: ${error.message}`);
    }
  }
}

testVisibilityCascade.requiredFeatures = [
  "layout-geometry",
  "frontend-state-management",
  "inspector-ui",
  "graph-output-zone",
  "output-loading-flow",
  "reference-scenarios",
];

module.exports = testVisibilityCascade;
