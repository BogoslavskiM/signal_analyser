"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  boxSignature,
  cardLocator,
  namedTestId,
  plotHost,
  testIds,
} = require("../../support/signal_analyser_page");

const PLOTS = ["time", "spectrum", "spectrogram", "persistence"];

async function assertNoAlternativeDisplays(page, assert) {
  const tabs = page.getByRole("tab");
  assert(await tabs.count() === 0, "fixed 2x2 workspace must not expose display tabs");

  const prohibited = page.locator(
    "[data-testid*='add-display'], [data-testid*='layout-chooser'], " +
    "[data-testid*='multi-layout'], [data-testid*='display-tabs']"
  );
  assert(await prohibited.count() === 0,
    "fixed workspace must not expose add-display or layout-chooser controls");
}

async function testShellLayout({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
  });

  await step("verify fixed Russian 2x2 plot workspace", async function () {
    const ids = testIds(config);
    const grid = page.locator(testIdSelector(namedTestId(config, "plotGrid")));
    const panel = page.locator(testIdSelector(namedTestId(config, "activePlotPanel")));
    const table = page.locator(testIdSelector(namedTestId(config, "signalTable")));
    const shellBox = await boxSignature(page.locator(testIdSelector(ids.shell)));
    const gridBox = await boxSignature(grid);
    const panelBox = await boxSignature(panel);
    const tableBox = await boxSignature(table);

    assert(shellBox && shellBox.width > 0 && shellBox.height > 0, "app shell must have nonzero geometry");
    assert(gridBox && gridBox.width > 0 && gridBox.height > 0, "plot grid must have nonzero geometry");
    assert(panelBox && panelBox.width > 0 && panelBox.height > 0, "active plot panel must have nonzero geometry");
    assert(tableBox && tableBox.width > 0 && tableBox.height > 0, "signal table must have nonzero geometry");
    assert(panelBox.x >= gridBox.x + gridBox.width,
      "active plot panel must remain to the right of the fixed grid");
    assert(tableBox.y >= gridBox.y + gridBox.height,
      "signal table must remain below the fixed plot grid");

    const boxes = {};
    for (const plot of PLOTS) {
      const card = cardLocator(page, config, plot);
      const host = plotHost(card);
      await card.waitFor({ state: "visible" });
      const title = (await card.innerText()).trim();
      boxes[plot] = await boxSignature(card);
      const hostBox = await boxSignature(host);
      assert(title.includes(ids.plotTitles[plot]),
        `${plot} card must contain exact title ${JSON.stringify(ids.plotTitles[plot])}`);
      assert(boxes[plot] && boxes[plot].width > 0 && boxes[plot].height > 0,
        `${plot} card must have nonzero geometry`);
      assert(hostBox && hostBox.width > 0 && hostBox.height > 0,
        `${plot} Plotly host must have nonzero geometry after loading`);
    }

    assert(boxes.time.y === boxes.spectrum.y && boxes.time.x < boxes.spectrum.x,
      "time and spectrum cards must form the top row");
    assert(boxes.spectrogram.y === boxes.persistence.y && boxes.spectrogram.x < boxes.persistence.x,
      "spectrogram and persistence cards must form the bottom row");
    assert(boxes.time.y < boxes.spectrogram.y && boxes.time.x === boxes.spectrogram.x,
      "time and spectrogram cards must form the left column");
    assert(boxes.spectrum.y < boxes.persistence.y && boxes.spectrum.x === boxes.persistence.x,
      "spectrum and persistence cards must form the right column");
  });

  await step("verify alternative display controls are absent", async function () {
    await assertNoAlternativeDisplays(page, assert);
  });
}

testShellLayout.requiredFeatures = ["legacy-fixed-workspace", "layout-geometry", "graph-output-zone"];

module.exports = testShellLayout;
