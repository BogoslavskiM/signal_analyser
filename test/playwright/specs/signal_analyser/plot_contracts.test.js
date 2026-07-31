"use strict";

const { openAppPage } = require("../../support/app_page");
const {
  activePanelState,
  cardLocator,
  clickAndWaitForView,
  plotSignature,
  selectedRowId,
  signalRows,
} = require("../../support/signal_analyser_page");

function isLineOrScatter(signature) {
  return signature.types.some(function (type, index) {
    return type === "scatter" || type === "scattergl" || signature.dimensions[index].mode.includes("lines");
  });
}

function assertHeatmapDimensions(assert, signature, label) {
  assert(signature.types.includes("heatmap"), `${label} must render a heatmap trace`);
  const heatmap = signature.dimensions[signature.types.indexOf("heatmap")];
  assert(heatmap.x > 0 && heatmap.y > 0 && heatmap.z > 0,
    `${label} heatmap must have nonempty x, y, and z data`);
  assert(heatmap.zRows === heatmap.y,
    `${label} z row count (${heatmap.zRows}) must equal y length (${heatmap.y})`);
  assert(heatmap.z === heatmap.zRows,
    `${label} heatmap z must be a matrix, not a scalar vector`);
  assert(heatmap.zRowLengths.every(function (length) { return length === heatmap.x; }),
    `${label} every z row must have the same length as x`);
}

async function selectedSignalIsComplex(page, config) {
  const selected = await selectedRowId(page, config);
  return page.locator(`[data-testid=${JSON.stringify(selected)}]`).evaluate(function (row) {
    return row.getAttribute("data-complex") === "true" ||
      /complex|комплекс/i.test(row.textContent || "");
  });
}

async function testPlotContracts({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
  });

  await step("verify time plot line contract", async function () {
    const signature = await plotSignature(cardLocator(page, config, "time"));
    assert(signature.traceCount > 0 && isLineOrScatter(signature),
      "time plot must contain a Plotly line/scatter trace");
    assert(signature.dimensions.some(function (trace) { return trace.x > 0 && trace.y > 0; }),
      "time plot line/scatter must have nonempty x and y data");
  });

  await step("verify spectrum line and visible Welch method", async function () {
    await clickAndWaitForView(page, config, cardLocator(page, config, "spectrum"), log, "activate spectrum");
    const signature = await plotSignature(cardLocator(page, config, "spectrum"));
    const panel = await activePanelState(page, config);
    const fieldText = panel.fields.map(function (field) {
      return `${field.id} ${field.text} ${field.value}`;
    }).join(" ");
    assert(signature.traceCount > 0 && isLineOrScatter(signature),
      "spectrum must contain a Plotly line/scatter trace");
    assert(signature.dimensions.some(function (trace) { return trace.x > 0 && trace.y > 0; }),
      "spectrum line/scatter must have nonempty frequency and magnitude data");
    assert(/метод/i.test(fieldText) && /welch/i.test(fieldText),
      "spectrum active fields must visibly expose the Welch method");

    if (await selectedSignalIsComplex(page, config)) {
      const spectrumTrace = signature.dimensions.find(function (trace) { return trace.x > 0; });
      assert(spectrumTrace.xMin < 0 && spectrumTrace.xMax > 0,
        "complex signal spectrum must span negative and positive centred frequencies");
      assert(Math.abs(spectrumTrace.xMin + spectrumTrace.xMax) <=
        Math.max(1e-9, Math.abs(spectrumTrace.xMax) * 0.02),
      "complex signal spectrum frequency range must be centred around zero");
    } else {
      log("centred-frequency assertion not applied: selected seed is not marked complex");
    }
  });

  await step("verify spectrogram heatmap contract", async function () {
    await clickAndWaitForView(page, config, cardLocator(page, config, "spectrogram"), log, "activate spectrogram");
    assertHeatmapDimensions(assert, await plotSignature(cardLocator(page, config, "spectrogram")), "spectrogram");
  });

  await step("verify persistence spectrum heatmap, range, and colorbar", async function () {
    await clickAndWaitForView(page, config, cardLocator(page, config, "persistence"), log, "activate persistence");
    const signature = await plotSignature(cardLocator(page, config, "persistence"));
    assertHeatmapDimensions(assert, signature, "persistence spectrum");
    const heatmap = signature.dimensions[signature.types.indexOf("heatmap")];
    assert(signature.colorbar, "persistence spectrum heatmap must expose a colorbar");
    const low = heatmap.zmin == null ? heatmap.zMin : heatmap.zmin;
    const high = heatmap.zmax == null ? heatmap.zMax : heatmap.zmax;
    assert(Number.isFinite(low) && Number.isFinite(high) && low < high,
      "persistence spectrum must expose a non-degenerate numeric intensity range");
  });
}

testPlotContracts.requiredFeatures = ["legacy-fixed-workspace", "graph-output-zone", "reference-scenarios"];

module.exports = testPlotContracts;
