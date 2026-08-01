"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { assertNoPreparingPlaceholders, endpointMatches, performanceLog, plotSignature, responseJson, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");
const TIMEOUT = 30000;

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function shell(page, config) { return id(page, config, "shell"); }
function activeDisplay(snapshot) { return (snapshot.displays || []).find(function (display) { return display.id === snapshot.active_display_id; }); }
function analysisName(snapshot) { const display = activeDisplay(snapshot); return display && display.analysis_signal || snapshot.row_selected_signal; }
function complex(signal) { return /complex|комплекс/i.test(String(signal && signal.data_type || "")); }
async function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }
async function mutation(page, config, action, log, label) {
  const before = Number(await shell(page, config).getAttribute("data-state-revision")); const requests = [];
  const onRequest = function (request) { if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request); };
  page.on("request", onRequest); const startedAt = Date.now();
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST"); await action();
    const response = await responsePromise, snapshot = await responseJson(response, label);
    performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (!response.ok() || requests.length !== 1 || snapshot.state_revision !== before + 1) throw new Error(`${label}: exactly one successful +1 /api/view is required`);
    await waitForSettled(page, config); return snapshot;
  } finally { page.off("request", onRequest); }
}
async function selectPlot(page, config, plot, log, label) {
  const control = id(page, config, "plotTypeSelect");
  if (await control.inputValue() === plot) return null;
  return mutation(page, config, function () { return control.selectOption(plot); }, log, label);
}
async function selectSource(page, config, name, log, label) {
  const selected = (await signalRowsState(page, config)).find(function (row) { return row.rowSelected; });
  if (selected && selected.name === name) return;
  const target = (await signalRowsState(page, config)).find(function (row) { return row.name === name; });
  if (!target) throw new Error(`${label}: source row ${name} is absent`);
  await mutation(page, config, function () { return page.locator(testIdSelector(target.id)).click({ timeout: TIMEOUT }); }, log, label);
}
async function waitForHeatmap(page, config, assert, label) {
  const host = id(page, config, "activePlotHost");
  await page.waitForFunction(function (selector) {
    const element = document.querySelector(selector), traces = element && (element.data || element._fullData || []);
    return element && element.getAttribute("data-plot-ready") === "true" && Array.isArray(traces) && traces.some(function (trace) { return trace.type === "heatmap"; });
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  assert(await host.count() === 1 && await host.isVisible(), `${label}: active Display must keep exactly one visible Plotly host`);
  await assertNoPreparingPlaceholders(page, assert);
  const signature = await plotSignature(host);
  assert(signature.types.filter(function (type) { return type === "heatmap"; }).length === 1, `${label}: active host must contain one heatmap`);
  const heatmap = signature.dimensions[signature.types.indexOf("heatmap")];
  assert(heatmap.x > 0 && heatmap.y > 0 && heatmap.zRows === heatmap.y && heatmap.zRowLengths.every(function (width) { return width === heatmap.x; }),
    `${label}: Plotly heatmap must preserve frequency×time matrix shape`);
}
function assertAxis(assert, payload, signal, label) {
  const heatmap = payload && payload.plot_payload && payload.plot_payload.spectrogram;
  const y = heatmap && heatmap.y || [], sampleRate = Number(signal && signal.sample_rate_hz), low = Math.min.apply(null, y), high = Math.max.apply(null, y);
  assert(heatmap && heatmap.signal === signal.name && Array.isArray(heatmap.x) && Array.isArray(y) && Array.isArray(heatmap.z),
    `${label}: authoritative Spectrogram payload must belong to its analysis source`);
  if (complex(signal)) {
    assert(low < 0 && high > 0 && Math.abs(low + high) <= Math.max(1e-9, Math.abs(high) * 1e-6), `${label}: complex y axis must be centered`);
  } else {
    assert(low === 0 && Math.abs(high - sampleRate / 2) <= Math.max(1e-9, sampleRate * 1e-6), `${label}: real y axis must be one-sided 0..Nyquist`);
  }
}

async function testTypedSpectrogram({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = {};
  try {
    await step("open one-host Display and capture analysis source", async function () {
      log("browser_workspace_setup: planned background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const snapshot = await state(page), display = activeDisplay(snapshot);
      original.plot = await id(page, config, "plotTypeSelect").inputValue(); original.source = snapshot.row_selected_signal; original.active = snapshot.active_display_id;
      assert(display && display.analysis_signal, "C11 scenario requires a nonempty analysis source");
      assert(await page.locator("[data-settings-tab]").count() === 3, "typed Spectrogram must not create a settings tab/control surface");
    });
    await step("analysis-source Spectrogram keeps wire, host and real topology", async function () {
      const snapshot = await selectPlot(page, config, "spectrogram", log, "open Spectrogram") || await state(page);
      const source = (snapshot.signals || []).find(function (signal) { return signal.name === analysisName(snapshot); });
      assertAxis(assert, snapshot, source, "initial Spectrogram"); await waitForHeatmap(page, config, assert, "initial Spectrogram");
    });
    await step("switching analysis source drives the sole Spectrogram heatmap", async function () {
      const snapshot = await state(page), display = activeDisplay(snapshot), candidates = (snapshot.signals || []).filter(function (signal) { return display.visible_signals.indexOf(signal.name) >= 0 && signal.name !== analysisName(snapshot); });
      if (!candidates.length) { log("analysis-source switch skipped: no second visible source in seed"); return; }
      await selectSource(page, config, candidates[0].name, log, "select alternate Spectrogram source");
      const changed = await state(page), source = changed.signals.find(function (signal) { return signal.name === candidates[0].name; });
      assertAxis(assert, changed, source, "alternate Spectrogram"); await waitForHeatmap(page, config, assert, "alternate Spectrogram");
    });
  } finally {
    try {
      if (original.source) await selectSource(page, config, original.source, log, "cleanup Spectrogram source");
      if (original.plot) await selectPlot(page, config, original.plot, log, "cleanup original plot");
    } catch (error) { log(`cleanup typed Spectrogram: ${error.message}`); }
  }
}

testTypedSpectrogram.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "graph-output-zone", "typed-spectrogram"];
module.exports = testTypedSpectrogram;
