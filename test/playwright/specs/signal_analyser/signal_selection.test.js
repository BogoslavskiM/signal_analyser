"use strict";

const { openAppPage } = require("../../support/app_page");
const {
  cardLocator,
  clickAndWaitForView,
  plotSignature,
  selectedRowId,
  signalRows,
} = require("../../support/signal_analyser_page");

const PLOTS = ["time", "spectrum", "spectrogram", "persistence"];

async function collectSignatures(page, config) {
  const signatures = {};
  for (const plot of PLOTS) {
    signatures[plot] = await plotSignature(cardLocator(page, config, plot));
  }
  return signatures;
}

function assertNonemptyPlots(assert, signatures, prefix) {
  for (const plot of PLOTS) {
    const signature = signatures[plot];
    assert(signature.traceCount > 0, `${prefix}: ${plot} must have at least one Plotly trace`);
    assert(signature.types.length > 0, `${prefix}: ${plot} must expose Plotly trace types`);
  }
}

async function testSignalSelection({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
  });

  const originalSelection = await selectedRowId(page, config);
  const rows = signalRows(page, config);
  const rowCount = await rows.count();
  assert(rowCount >= 2, "signal selection scenario needs at least two signal rows");
  const target = rows.nth(1);
  const targetId = await target.getAttribute("data-testid");
  assert(targetId && targetId !== originalSelection, "the second signal row must differ from the selected row");
  assert(await target.getAttribute("role") === "button",
    "signal rows must expose the frontend role=button contract");
  const before = await collectSignatures(page, config);
  assertNonemptyPlots(assert, before, "before signal selection");

  try {
    await step("select second signal and wait for view refresh", async function () {
      await clickAndWaitForView(page, config, target, log, "select second signal");
      const selected = await selectedRowId(page, config);
      const after = await collectSignatures(page, config);
      assert(selected === targetId, `selected row must change to ${targetId}, observed ${selected}`);
      assertNonemptyPlots(assert, after, "after signal selection");
      for (const plot of PLOTS) {
        log(`${plot} Plotly signature ${JSON.stringify({
          after: after[plot],
          changed: JSON.stringify(before[plot]) !== JSON.stringify(after[plot]),
        })}`);
      }
    });
  } finally {
    const original = page.locator(`[data-testid=${JSON.stringify(originalSelection)}]`);
    try {
      await clickAndWaitForView(page, config, original, log, "restore initially selected signal");
    } catch (error) {
      log(`cleanup could not restore selected signal ${originalSelection}: ${error.message}`);
    }
  }
}

testSignalSelection.requiredFeatures = ["frontend-state-management", "inspector-ui", "graph-output-zone"];

module.exports = testSignalSelection;
