"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  activeCardIds,
  activePanelState,
  boxSignature,
  cardLocator,
  clickAndWaitForView,
  namedTestId,
} = require("../../support/signal_analyser_page");

const PLOTS = ["time", "spectrum", "spectrogram", "persistence"];

async function testActiveDisplay({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
  });

  const grid = page.locator(testIdSelector(namedTestId(config, "plotGrid")));
  const table = page.locator(testIdSelector(namedTestId(config, "signalTable")));
  const staticGeometry = {
    grid: await boxSignature(grid),
    table: await boxSignature(table),
  };
  const originalActiveCards = await activeCardIds(page, config);
  assert(originalActiveCards.length === 1,
    `exactly one plot card must be active initially: ${JSON.stringify(originalActiveCards)}`);
  const original = await activePanelState(page, config);
  let previous = original;

  try {
    for (const plot of PLOTS) {
      await step(`activate ${plot} display`, async function () {
        await clickAndWaitForView(page, config, cardLocator(page, config, plot), log, `activate ${plot}`);
        const panel = await activePanelState(page, config);
        const activeCards = panel.activeCards;

        assert(activeCards.length === 1,
          `exactly one plot card must be active after choosing ${plot}: ${JSON.stringify(activeCards)}`);
        assert(activeCards[0] === config.app.testIds.plotCards[plot],
          `${plot} card must be the only active card`);
        assert(panel.title === config.app.testIds.plotTitles[plot],
          `active plot title must equal ${JSON.stringify(config.app.testIds.plotTitles[plot])}`);
        assert(panel.fields.length > 0, `${plot} display must expose active-plot fields`);
        if (plot !== PLOTS[0]) {
          assert(JSON.stringify(panel) !== JSON.stringify(previous),
            `active panel state must change when switching to ${plot}`);
        }
        assert(JSON.stringify(await boxSignature(grid)) === JSON.stringify(staticGeometry.grid),
          "switching active display must not alter grid geometry");
        assert(JSON.stringify(await boxSignature(table)) === JSON.stringify(staticGeometry.table),
          "switching active display must not alter table geometry");
        previous = panel;
      });
    }
  } finally {
    const restorePlot = Object.entries(config.app.testIds.plotCards).find(function (entry) {
      return entry[1] === originalActiveCards[0];
    });
    if (restorePlot && restorePlot[1] !== (await activeCardIds(page, config))[0]) {
      try {
        await clickAndWaitForView(page, config, cardLocator(page, config, restorePlot[0]), log,
          `restore ${restorePlot[0]}`);
      } catch (error) {
        log(`cleanup could not restore active display: ${error.message}`);
      }
    }
  }
}

testActiveDisplay.requiredFeatures = ["legacy-fixed-workspace", "frontend-state-management", "graph-output-zone"];

module.exports = testActiveDisplay;
