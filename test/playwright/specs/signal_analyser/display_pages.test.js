"use strict";

const { openAppPage, testIdSelector, waitForAppReady } = require("../../support/app_page");

const PLOTS = ["time", "spectrum", "spectrogram", "persistence"];

function tabs(page, config) {
  return page.locator(`${testIdSelector(config.app.testIds.displayTabs)} [role='tab']`);
}

async function tabState(page, config) {
  return tabs(page, config).evaluateAll(function (elements) {
    return elements.map(function (element) {
      return {
        id: element.getAttribute("data-display-id") || "",
        selected: element.getAttribute("aria-selected") === "true",
        text: (element.textContent || "").replace(/×/g, "").trim(),
      };
    });
  });
}

async function waitForIdle(page, config) {
  await waitForAppReady(page, config, { timeout: 30000 });
  await page.waitForFunction(function (selector) {
    const shell = document.querySelector(selector);
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, testIdSelector(config.app.testIds.shell), { timeout: 30000 });
}

async function plotTraceNames(page, config) {
  return page.locator(testIdSelector(config.app.testIds.activePlotHost)).evaluate(function (host) {
    const traces = Array.isArray(host.data) ? host.data :
      (Array.isArray(host._fullData) ? host._fullData : []);
    return traces.map(function (trace) { return String(trace.name || ""); });
  });
}

async function assertExactlyOneActiveHost(page, config, assert) {
  const host = page.locator(testIdSelector(config.app.testIds.activePlotHost));
  assert(await host.count() === 1,
    "the active Display must expose exactly one stable active Plotly host");
  assert(await host.isVisible(), "the one active Plotly host must be visible");
}

async function signalRows(page) {
  return page.locator("[data-testid^='signal-row-']").evaluateAll(function (rows) {
    return rows.map(function (row) {
      const checkbox = row.querySelector("input[data-signal-visibility]");
      const cells = Array.from(row.querySelectorAll("td")).map(function (cell) {
        return (cell.textContent || "").trim();
      });
      return {
        checked: Boolean(checkbox && checkbox.checked),
        checkboxId: checkbox && checkbox.getAttribute("data-testid") || "",
        rowId: row.getAttribute("data-testid") || "",
        name: row.getAttribute("data-signal") || "",
        cells,
      };
    });
  });
}

async function chooseTab(page, config, id) {
  await page.locator(`[data-testid=${JSON.stringify(`display-tab-${id}`)}]`).click();
  await waitForIdle(page, config);
}

async function setSignalVisibility(page, config, row, checked) {
  const checkbox = page.locator(testIdSelector(row.checkboxId));
  if (await checkbox.count() !== 1) {
    throw new Error(`signal visibility selector must resolve exactly once: ${row.checkboxId}`);
  }
  await checkbox.setChecked(checked);
  await waitForIdle(page, config);
}

async function closeExtraDisplays(page, config) {
  let state = await tabState(page, config);
  while (state.length > 1) {
    const closing = state[state.length - 1];
    await page.locator(testIdSelector(`close-display-${closing.id}`)).click();
    await waitForIdle(page, config);
    state = await tabState(page, config);
  }
}

async function testDisplayPages({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser single-display workspace", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
    await waitForIdle(page, config);
    assert(await page.locator(testIdSelector(config.app.testIds.displayCanvas)).isVisible(),
      "one graph canvas must be visible for the active Display");
    await assertExactlyOneActiveHost(page, config, assert);
  });

  const initialTabs = await tabState(page, config);
  const firstId = initialTabs[0] && initialTabs[0].id;
  let hiddenRow = null;
  let secondId = null;
  let secondPlot = null;

  try {
    await step("add and select independent Display pages", async function () {
      assert(initialTabs.length === 1 && initialTabs[0].selected,
        `initial workspace must contain exactly one selected Display: ${JSON.stringify(initialTabs)}`);
      await page.locator(testIdSelector(config.app.testIds.addDisplay)).click();
      await waitForIdle(page, config);
      const afterAdd = await tabState(page, config);
      assert(afterAdd.length === 2, `adding a Display must create a second tab: ${JSON.stringify(afterAdd)}`);
      assert(afterAdd[1].selected, "new Display must become active");
      secondId = afterAdd[1].id;
      secondPlot = await page.locator(testIdSelector(config.app.testIds.plotTypeSelect)).inputValue();
      await chooseTab(page, config, firstId);
      assert((await tabState(page, config)).find(function (tab) { return tab.id === firstId; }).selected,
        "selecting a Display tab must make it active");
      await assertExactlyOneActiveHost(page, config, assert);
    });

    await step("checkbox affects only active Display and survives tab switching", async function () {
      const firstRows = await signalRows(page);
      const candidate = firstRows.find(function (row) { return row.checked; });
      assert(candidate && candidate.rowId && candidate.checkboxId && candidate.name,
        `a visible signal with a stable checkbox is required: ${JSON.stringify(firstRows)}`);
      assert(new Set(firstRows.map(function (row) { return row.rowId; })).size === firstRows.length,
        `signal row selectors must be collision-free: ${JSON.stringify(firstRows)}`);
      assert(new Set(firstRows.map(function (row) { return row.checkboxId; })).size === firstRows.length,
        `signal visibility selectors must be collision-free: ${JSON.stringify(firstRows)}`);
      assert(firstRows.filter(function (row) { return row.checked; }).length > 1,
        "scenario needs two initially visible signals to test isolated checkbox state");
      hiddenRow = candidate;
      await setSignalVisibility(page, config, candidate, false);
      assert(!(await signalRows(page)).find(function (row) { return row.rowId === candidate.rowId; }).checked,
        "unchecked signal must remain hidden in the active Display");
      assert(!(await plotTraceNames(page, config)).includes(candidate.name),
        "active Display graph must remove the unchecked signal trace");

      await chooseTab(page, config, secondId);
      assert((await signalRows(page)).find(function (row) { return row.rowId === candidate.rowId; }).checked,
        "other Display must retain its own signal visibility state");
      await assertExactlyOneActiveHost(page, config, assert);
      await chooseTab(page, config, firstId);
      assert(!(await signalRows(page)).find(function (row) { return row.rowId === candidate.rowId; }).checked,
        "switching back must restore the first Display visibility state");
      await assertExactlyOneActiveHost(page, config, assert);
    });

    await step("change graph type without mutating another Display", async function () {
      const select = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
      assert(PLOTS.includes(await select.inputValue()), "active Display must begin with a supported plot type");
      await select.selectOption("spectrum");
      await waitForIdle(page, config);
      assert(await select.inputValue() === "spectrum", "plot type selector must apply Spectrum to active Display");
      assert((await page.locator(testIdSelector(config.app.testIds.displayPlotTitle)).innerText()).trim() === "Spectrum",
        "active Display title must reflect the selected graph type");

      await chooseTab(page, config, secondId);
      assert(await select.inputValue() === secondPlot,
        "second Display must preserve its independent graph type");
      await chooseTab(page, config, firstId);
      assert(await select.inputValue() === "spectrum", "first Display must restore its Spectrum graph type");
    });

    await step("show signal metadata in the bottom table", async function () {
      const rows = await signalRows(page);
      assert(rows.length > 0, "signal table must show at least one signal");
      rows.forEach(function (row) {
        assert(row.cells.length >= 7 && row.cells.slice(1).every(Boolean),
          `signal row must expose name, color, sample rate, samples, duration and type: ${JSON.stringify(row)}`);
      });
    });

    await step("close active Display and select the deterministic remaining page", async function () {
      await chooseTab(page, config, secondId);
      await page.locator(testIdSelector(`close-display-${secondId}`)).click();
      await waitForIdle(page, config);
      const afterClose = await tabState(page, config);
      assert(afterClose.length === 1 && afterClose[0].id === firstId && afterClose[0].selected,
        `closing active Display must select the deterministic remaining page: ${JSON.stringify(afterClose)}`);
      await assertExactlyOneActiveHost(page, config, assert);
      secondId = null;
    });
  } finally {
    try {
      if (hiddenRow) {
        const current = (await signalRows(page)).find(function (row) { return row.rowId === hiddenRow.rowId; });
        if (current && !current.checked) await setSignalVisibility(page, config, current, true);
      }
      await closeExtraDisplays(page, config);
    } catch (error) {
      log(`cleanup could not restore display pages: ${error.message}`);
    }
  }
}

testDisplayPages.requiredFeatures = [
  "frontend-state-management",
  "graph-output-zone",
  "inspector-ui",
  "multi-page-element",
  "signal-analyser-displays",
];

module.exports = testDisplayPages;
