"use strict";

// Narrow V60 PROD diagnostic: it deliberately excludes the ten-operation
// suite and records exact DOM/network evidence for extrema and cursor trim.
const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifactDir = path.join(__dirname, "..", "..", "artifacts", "TASK-0158-V60-diagnostic");
const prototypeUrl = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/current/prototype/index.html";
const exactPriorNames = ["Гармонический сигнал_resample", "Гармонический сигнал_resample_preprocess", "V60 E2E crop 1787772480610"];

function ensureArtifacts() { fs.mkdirSync(artifactDir, { recursive: true }); }
function save(value) { ensureArtifacts(); fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(value, null, 2)); }
async function shot(page, name) { ensureArtifacts(); await page.screenshot({ path: path.join(artifactDir, name), fullPage: true }); }
async function ready(page, config) {
  await waitForAppReady(page, config, { timeout: 30000 });
  const loader = page.locator(testIdSelector(config.app.loaderTestId));
  if (await loader.count()) await loader.waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForFunction(function () { const shell = document.querySelector("[data-testid='app-shell']"); return shell && shell.getAttribute("aria-busy") !== "true"; }, { timeout: 30000 });
}
async function tabs(page) {
  return page.locator("[data-testid='display-tabs'] [role='tab']").evaluateAll(function (nodes) {
    return nodes.map(function (node) { return { id: node.getAttribute("data-display-select"), active: node.getAttribute("aria-selected") === "true" }; });
  });
}
async function selectValue(page, input, label) {
  await input.click();
  const popup = page.locator(testIdSelector("value-select-options"));
  await popup.waitFor({ state: "visible", timeout: 10000 });
  await popup.getByText(label, { exact: true }).click();
  await popup.waitFor({ state: "hidden", timeout: 10000 });
}
async function waitPlot(page, host) {
  await page.waitForFunction(function (node) {
    const plot = node && (node.classList.contains("js-plotly-plot") ? node : node.querySelector(".js-plotly-plot"));
    return node && node.dataset.plotReady === "true" && plot && Array.isArray(plot.data) && plot.data.length > 0;
  }, await host.elementHandle(), { timeout: 30000 });
}
async function activePaneContext(page, displayId) {
  const shell = page.locator(testIdSelector("app-shell"));
  const paneId = await shell.getAttribute("data-active-pane");
  if (!paneId) throw new Error("app shell does not expose the active pane");
  const pane = page.locator(testIdSelector(`plot-pane-${paneId}`));
  await pane.waitFor({ state: "visible", timeout: 30000 });
  const host = page.locator(`[data-pane-host=${JSON.stringify(`${displayId}::${paneId}`)}]`);
  return { paneId: paneId, pane: pane, host: host };
}
async function bindHarmonic(page, config, displayId, requireView) {
  let context = await activePaneContext(page, displayId);
  await context.pane.click();
  context = await activePaneContext(page, displayId);
  const row = page.locator("[data-signal-row][data-signal-name='Гармонический сигнал']");
  await row.waitFor({ state: "visible", timeout: 30000 });
  const output = requireView === false ? null : page.waitForResponse(function (item) {
    const url = new URL(item.url());
    return item.request().method() === "GET" && url.pathname.endsWith("/api/outputs/active") && url.searchParams.get("display_id") === displayId && url.searchParams.get("pane_id") === context.paneId;
  }, { timeout: 30000 });
  let viewPayload = null;
  const view = requireView === false ? null : page.waitForResponse(function (item) {
    if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/view")) return false;
    viewPayload = item.request().postDataJSON(); return true;
  }, { timeout: 30000 });
  await row.locator("td:nth-child(2) .signal-cell-value").click();
  let viewResponse = null;
  if (view) {
    viewResponse = await view;
    if (viewResponse.status() !== 200 || !viewPayload || viewPayload.analysis_signal !== "Гармонический сигнал" || !Array.isArray(viewPayload.visible_signals) || !viewPayload.visible_signals.includes("Гармонический сигнал")) {
      throw new Error(`Harmonic LMB /api/view contract failed: status=${viewResponse.status()} payload=${JSON.stringify(viewPayload)}`);
    }
  }
  const outputResponse = output ? await output : null;
  if (outputResponse && outputResponse.status() !== 200) throw new Error(`active output failed: HTTP ${outputResponse.status()}`);
  await context.host.waitFor({ state: "visible", timeout: 30000 });
  await waitPlot(page, context.host);
  const traceCount = await context.host.evaluate(function (node) { const plot = node.classList.contains("js-plotly-plot") ? node : node.querySelector(".js-plotly-plot"); return plot && Array.isArray(plot.data) ? plot.data.length : 0; });
  if (!(traceCount > 0)) throw new Error("active pane has no visible Harmonic trace");
  return { displayId: displayId, paneId: context.paneId, signal: "Гармонический сигнал", traces: traceCount, viewPayload: viewPayload, outputStatus: outputResponse && outputResponse.status(), host: context.host };
}
async function setType(page, host, type) {
  await host.click();
  const paneId = String(await host.getAttribute("data-pane-host")).split("::")[1];
  const input = page.locator(testIdSelector(`pane-type-${paneId}-input`));
  const label = type === "spectrum" ? "Спектр" : "Временная область";
  await input.waitFor({ state: "visible", timeout: 10000 });
  await selectValue(page, input, label);
  await page.waitForFunction(function (args) { const node = document.querySelector(`[data-testid="pane-type-${args.id}-input"]`); return node && node.value === args.type; }, { id: paneId, type: label }, { timeout: 30000 });
  await host.click();
  await waitPlot(page, host);
  return paneId;
}
async function extremaState(page) {
  return page.locator("[data-extrema-state]").evaluateAll(function (nodes) {
    return nodes.map(function (node) { return { state: node.getAttribute("data-extrema-state"), testId: node.getAttribute("data-testid"), text: node.innerText.trim() }; });
  });
}
async function calculateAndInspect(page, host, type) {
  await host.click();
  await page.locator(testIdSelector("inspector-tab-peaks")).click();
  const calculate = page.locator(testIdSelector("extrema-calculate")).first();
  await calculate.waitFor({ state: "visible", timeout: 30000 });
  const before = await extremaState(page);
  const runtimeKey = String(await host.getAttribute("data-pane-host"));
  const parts = runtimeKey.split("::"), displayId = parts[0], paneId = parts[1];
  // Arm this before Calculate: a fast provider poll can arrive before the
  // POST response handler returns. It remains supplementary evidence; the
  // user-visible terminal contract is rows plus the Plotly peak overlay.
  let readinessGetResult = null;
  const readinessGet = page.waitForResponse(function (item) {
    const url = new URL(item.url());
    return item.request().method() === "GET" && url.pathname.endsWith("/api/peaks/active") && url.searchParams.get("display_id") === displayId && url.searchParams.get("pane_id") === paneId;
  }, { timeout: 90000 }).then(async function (item) {
    return { status: item.status(), body: await item.json().catch(function () { return null; }) };
  }).catch(function (error) { return { timeout: true, error: String(error && error.message || error) }; }).then(function (result) { readinessGetResult = result; return result; });
  let payload = null;
  const response = page.waitForResponse(function (item) {
    if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/peaks/active")) return false;
    payload = item.request().postDataJSON();
    return true;
  }, { timeout: 30000 });
  await calculate.click();
  const received = await response;
  const body = await received.json().catch(function () { return null; });
  const immediate = await extremaState(page);
  const started = Date.now();
  await page.waitForFunction(function () { return document.querySelectorAll("[data-testid='peaks-table'] tbody tr").length > 0; }, { timeout: 90000 });
  // Do not make a rendered table wait for an optional late GET. The listener
  // remains armed until page teardown and records it when it arrives in time.
  const readiness = readinessGetResult || { pending: true };
  const final = await extremaState(page);
  const rows = page.locator("[data-testid='peaks-table'] tbody tr");
  const rowCount = await rows.count();
  const overlays = await host.evaluate(function (node) {
    const plot = node.classList.contains("js-plotly-plot") ? node : node.querySelector(".js-plotly-plot");
    return (plot && (plot.data || plot._fullData) || []).filter(function (trace) { return trace && trace.meta && trace.meta.signal_analyser_peaks_overlay === true; }).length;
  });
  return { type: type, requestPayload: payload, responseStatus: received.status(), responseBody: body, readinessGet: readiness, elapsedMs: Date.now() - started, states: { before: before, immediate: immediate, final: final }, rows: rowCount, overlays: overlays };
}
async function deleteExactPrior(page, config, name) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.reload({ waitUntil: "domcontentloaded" }); await ready(page, config);
    const row = page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`);
    if (!await row.count()) return { name: name, result: "absent" };
    const identity = await row.evaluate(function (node) { return { name: node.getAttribute("data-signal-name"), id: node.getAttribute("data-signal-id") || null }; });
    const response = page.waitForResponse(function (item) {
      if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals")) return false;
      const body = item.request().postDataJSON(); return body && body.operation === "delete" && body.signal_name === name;
    }, { timeout: 30000 });
    await row.locator("[data-signal-delete]").click();
    const received = await response;
    if (received.status() === 200) { await row.waitFor({ state: "detached", timeout: 30000 }); return { name: name, id: identity.id, result: "deleted" }; }
    if (received.status() !== 409 || attempt === 1) throw new Error(`exact prior cleanup ${name}: HTTP ${received.status()}`);
  }
  return { name: name, result: "absent" };
}

async function task0158V60Diagnostic({ appUrl, assert, config, page, step }) {
  const spectrumTrimOnly = process.env.V60_DIAGNOSTIC_SCOPE === "spectrum_trim";
  const report = { target: appUrl, expectedRevision: process.env.E2E_EXPECTED_REVISION, scope: spectrumTrimOnly ? "spectrum_trim" : "full_diagnostic", startedAt: new Date().toISOString(), cleanup: [], scenarios: [] };
  let displayId = "";
  let cropName = "";
  try {
    await step("prototype design-contract evidence", async function () {
      await page.goto(prototypeUrl, { waitUntil: "domcontentloaded" });
      await page.locator(testIdSelector("app-shell")).waitFor({ state: "visible", timeout: 30000 });
      await shot(page, "prototype-contract.png");
      report.prototype = "passed";
    });
    await step("remove exact prior auto-derived signals", async function () {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" }); await ready(page, config);
      for (const name of exactPriorNames) report.cleanup.push(await deleteExactPrior(page, config, name));
    });
    await step("create clean display and bind active Harmonic", async function () {
      try {
        await page.goto(appUrl, { waitUntil: "domcontentloaded" }); await ready(page, config);
        const before = await tabs(page);
        await page.locator(testIdSelector("add-display")).click();
        await page.waitForFunction(function (count) { return document.querySelectorAll("[data-testid='display-tabs'] [role='tab']").length === count; }, before.length + 1, { timeout: 30000 });
        await ready(page, config);
        const after = await tabs(page);
        const added = after.find(function (tab) { return !before.some(function (old) { return old.id === tab.id; }); });
        assert(added && added.id, "diagnostic must own a clean display"); displayId = added.id;
        report.binding = await bindHarmonic(page, config, displayId, true);
      } catch (error) { report.setupError = String(error && error.message || error); }
    });
    for (const type of (spectrumTrimOnly ? ["spectrum"] : ["time", "spectrum"])) {
      await step(`${type} extrema diagnostic`, async function () {
        const host = page.locator(`[data-pane-host^=${JSON.stringify(displayId + "::")}]`).first();
        try {
          if (report.setupError) throw new Error(report.setupError);
          // The authoritative initial LMB binding persists through a pane-type
          // switch. Do not navigate away from Peaks merely to reselect it.
          await setType(page, host, type); await host.click();
          const result = await calculateAndInspect(page, host, type);
          const passed = result.responseStatus === 200 && result.rows > 0 && result.overlays > 0;
          report.scenarios.push({ name: `${type} extrema`, result: passed ? "passed" : "failed", evidence: result, classification: passed ? "passed" : "frontend_or_backend: POST/DOM result recorded" });
        } catch (error) { report.scenarios.push({ name: `${type} extrema`, result: "failed", error: String(error && error.message || error), state: await extremaState(page).catch(function () { return []; }), classification: "frontend_or_test_selector: control/state unavailable" }); }
      });
    }
    await step("two cursor trim diagnostic", async function () {
      const host = page.locator(`[data-pane-host^=${JSON.stringify(displayId + "::")}]`).first();
      try {
        if (report.setupError) throw new Error(report.setupError);
        const paneId = await setType(page, host, "time"); await host.click();
        await page.locator(`[data-pane-menu=${JSON.stringify(paneId)}]`).click();
        await page.locator(testIdSelector("pane-menu-dual-cursor")).click();
        const overlay = host.locator("xpath=..").locator("[data-graph-cursor-overlay] [data-cursor-index]");
        await overlay.nth(1).waitFor({ state: "visible", timeout: 15000 });
        const trim = page.locator(`${testIdSelector("pane-trim-signal")}:visible`).first();
        await trim.waitFor({ state: "visible", timeout: 10000 }); await trim.click();
        const dialog = page.locator(testIdSelector("signal-trim-dialog")); await dialog.waitFor({ state: "visible", timeout: 10000 });
        const source = dialog.locator("[data-signal-trim-source]"), name = dialog.locator("[data-signal-trim-name]");
        const defaultName = await name.inputValue(); assert((await source.inputValue()).trim() && defaultName.trim(), "trim requires source and default target");
        cropName = `V60 E2E crop ${Date.now()}`; await name.fill(cropName);
        let payload = null;
        const response = page.waitForResponse(function (item) { if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals/crop")) return false; payload = item.request().postDataJSON(); return true; }, { timeout: 30000 });
        await dialog.locator("[data-signal-trim-submit]").click(); const received = await response;
        const responseBody = await received.json().catch(function () { return null; });
        await page.locator(testIdSelector("inspector-tab-signals")).click();
        await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(cropName)}]`).waitFor({ state: "visible", timeout: 30000 });
        const passed = received.status() === 200 && payload && payload.target_name === cropName && payload.source_signal_id && Number.isFinite(payload.min_s) && Number.isFinite(payload.max_s) && payload.min_s <= payload.max_s;
        report.scenarios.push({ name: "two cursor trim", result: passed ? "passed" : "failed", evidence: { cursorCount: await overlay.count(), sourceId: await source.inputValue(), defaultName: defaultName, responseStatus: received.status(), responseBody: responseBody, payload: payload }, classification: passed ? "passed" : "frontend_or_backend: crop payload recorded" });
      } catch (error) { report.scenarios.push({ name: "two cursor trim", result: "failed", error: String(error && error.message || error), classification: "frontend_or_test_selector: cursor/trim state unavailable" }); }
    });
    await shot(page, "prod-diagnostic-final.png");
  } finally {
    if (cropName) { try { report.cleanup.push(await deleteExactPrior(page, config, cropName)); } catch (error) { report.cleanup.push({ name: cropName, result: "not_deleted", error: String(error && error.message || error) }); } }
    if (displayId) { try { const close = page.locator(`[data-testid='display-close-${displayId}']`); if (await close.count()) { await close.click(); await ready(page, config); report.cleanup.push({ display: displayId, result: "closed" }); } } catch (error) { report.cleanup.push({ display: displayId, result: "not_closed", error: String(error && error.message || error) }); } }
    report.finishedAt = new Date().toISOString(); save(report);
  }
  assert(report.scenarios.every(function (item) { return item.result === "passed"; }), report.scenarios.filter(function (item) { return item.result !== "passed"; }).map(function (item) { return `${item.name}: ${item.error || JSON.stringify(item.evidence)}`; }).join("; "));
}
task0158V60Diagnostic.scenarioFlags = ["TASK-0158-V60-DIAGNOSTIC"];
module.exports = task0158V60Diagnostic;
