"use strict";

const { openAppPage, testIdSelector, waitForAppReady } = require("../../support/app_page");
const { isApiRequestUrl, performanceLog, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");

const VIEW_TIMEOUT = 30000;

function control(page, config, key) {
  return page.locator(testIdSelector(config.app.testIds[key]));
}

async function waitForIdle(page, config) {
  await waitForAppReady(page, config, { timeout: VIEW_TIMEOUT });
  await page.waitForFunction(function (selector) {
    const shell = document.querySelector(selector);
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, testIdSelector(config.app.testIds.shell), { timeout: VIEW_TIMEOUT });
}

async function localCheckbox(page, locator, checked, config, log, label) {
  const requests = [];
  const before = Number(await page.locator(testIdSelector(config.app.testIds.shell)).getAttribute("data-state-revision"));
  const onRequest = function (request) {
    if (isApiRequestUrl(request)) requests.push(`${request.method()} ${request.url()}`);
  };
  const startedAt = Date.now();
  page.on("request", onRequest);
  try {
    await locator.setChecked(checked, { timeout: VIEW_TIMEOUT });
    await page.waitForTimeout(100);
    const after = Number(await page.locator(testIdSelector(config.app.testIds.shell)).getAttribute("data-state-revision"));
    if (requests.length) throw new Error(`${label} must make zero API requests: ${JSON.stringify(requests)}`);
    if (!Number.isInteger(before) || after !== before) throw new Error(`${label} must not change state revision`);
    performanceLog(log, label, Date.now() - startedAt, undefined, "zero API requests; revision unchanged");
  } finally {
    page.off("request", onRequest);
  }
}

async function hostSnapshot(page, config) {
  return page.locator(testIdSelector(config.app.testIds.activePlotHost)).evaluate(function (host) {
    const traces = Array.isArray(host.data) ? host.data : (host._fullData || []);
    const ordinary = traces.filter(function (trace) {
      return !(trace.meta && trace.meta.test_id === "peak-marker-trace");
    }).map(function (trace) {
      return { name: String(trace.name || ""), x: Array.from(trace.x || []), y: Array.from(trace.y || []), mode: String(trace.mode || "") };
    });
    const peak = traces.find(function (trace) { return trace.meta && trace.meta.test_id === "peak-marker-trace"; });
    return { marker: host.__e2eTimePresentationHostMarker || "", ordinary, peak: peak ? {
      name: String(peak.name || ""), x: Array.from(peak.x || []), y: Array.from(peak.y || []),
      signal: String(peak.meta.signal_name || ""), mode: String(peak.mode || ""),
      normalization: String(peak.meta.normalization || "")
    } : null };
  });
}

async function retainSourceArrays(page, config) {
  return page.locator(testIdSelector(config.app.testIds.activePlotHost)).evaluate(function (host) {
    const traces = Array.isArray(host.data) ? host.data : (host._fullData || []);
    window.__e2eTimePresentationSourceArrays = traces.filter(function (trace) {
      return !(trace.meta && trace.meta.test_id === "peak-marker-trace");
    }).map(function (trace) { return { reference: trace.y, values: Array.from(trace.y || []) }; });
  });
}

async function assertRetainedSourceArrays(page, assert) {
  const unchanged = await page.evaluate(function () {
    return (window.__e2eTimePresentationSourceArrays || []).every(function (entry) {
      return JSON.stringify(Array.from(entry.reference || [])) === JSON.stringify(entry.values);
    });
  });
  assert(unchanged, "presentation toggles must not mutate retained backend-source trace arrays");
}

function finite(values) { return values.filter(Number.isFinite); }

function assertNormalized(assert, before, after) {
  assert(before.length === after.length && before.length > 0, "Normalize Y requires the same nonempty ordinary Time traces");
  before.forEach(function (source, index) {
    const rendered = after[index];
    const input = finite(source.y);
    const output = finite(rendered.y);
    assert(source.name === rendered.name && output.length === input.length, "Normalize Y must preserve ordinary trace identity and finite samples");
    const low = Math.min(...input);
    const high = Math.max(...input);
    if (high === low) {
      assert(output.every(function (value) { return value === 0; }), "finite constant trace must normalize to zeros");
    } else {
      assert(Math.min(...output) === 0 && Math.max(...output) === 1, "each ordinary trace must normalize independently to [0,1]");
    }
  });
}

function assertPeakAligned(assert, baseline, normalized) {
  if (!baseline.peak || !normalized.peak) return;
  assert(normalized.peak.normalization === "analysis-source-affine-unclipped",
    "Peak marker must declare the unclipped analysis-source affine normalization contract");
  const source = baseline.ordinary.find(function (trace) { return trace.name === baseline.peak.signal; });
  assert(source, "Peak marker must identify its analysis-source ordinary trace");
  const low = Math.min(...finite(source.y));
  const high = Math.max(...finite(source.y));
  assert(JSON.stringify(normalized.peak.x) === JSON.stringify(baseline.peak.x),
    "Normalize Y must retain every backend Peak marker x coordinate unchanged");
  normalized.peak.y.forEach(function (value, index) {
    const expected = high === low ? 0 : (baseline.peak.y[index] - low) / (high - low);
    assert(value === expected, "normalized Peak marker y must use unclipped source-affine mapping");
  });
}

async function selectPlot(page, config, value) {
  const select = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
  if (await select.inputValue() === value) return;
  const response = waitForApi(page, config, config.app.api.view, "POST");
  await select.selectOption(value, { timeout: VIEW_TIMEOUT });
  if (!(await response).ok()) throw new Error(`changing plot type to ${value} failed`);
  await waitForSettled(page, config);
}

async function displayTabs(page, config) {
  return page.locator(`${testIdSelector(config.app.testIds.displayTabs)} [role=tab]`).evaluateAll(function (tabs) {
    return tabs.map(function (tab) { return { id: tab.getAttribute("data-display-id"), active: tab.getAttribute("aria-selected") === "true" }; });
  });
}

async function selectDisplay(page, config, id) {
  await page.locator(testIdSelector(`display-tab-${id}`)).click();
  await waitForIdle(page, config);
}

async function markReactPath(page, config) {
  return page.locator(testIdSelector(config.app.testIds.activePlotHost)).evaluate(function (host) {
    host.__e2eTimePresentationHostMarker = `time-presentation-${Date.now()}`;
    const plotly = window.Plotly;
    if (!plotly || typeof plotly.react !== "function") throw new Error("Plotly.react must be available for presentation changes");
    const original = plotly.react;
    let count = 0;
    plotly.react = function () { count += 1; return original.apply(this, arguments); };
    window.__e2eTimePresentationRestore = function () { plotly.react = original; delete window.__e2eTimePresentationRestore; };
    window.__e2eTimePresentationReactCount = function () { return count; };
    return host.__e2eTimePresentationHostMarker;
  });
}

async function restoreReactPath(page) {
  await page.evaluate(function () {
    if (typeof window.__e2eTimePresentationRestore === "function") window.__e2eTimePresentationRestore();
    delete window.__e2eTimePresentationReactCount;
    delete window.__e2eTimePresentationSourceArrays;
  });
}

async function testTimePresentation({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const normalize = control(page, config, "normalizeYAxisCheckbox");
  const markers = control(page, config, "showMarkersCheckbox");
  const peaksAction = page.locator(testIdSelector(config.app.testIds.findPeaksAction));
  let originalDisplay = "";
  let secondDisplay = "";
  let peaksEnabledByScenario = false;
  let originalNormalize = false;
  let originalMarkers = false;
  let clearedMemberId = "";
  try {
    await step("open nonempty Time Display and enable deterministic Peaks annotation", async function () {
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      await waitForIdle(page, config);
      await selectPlot(page, config, "time");
      const tabs = await displayTabs(page, config);
      originalDisplay = tabs.find(function (tab) { return tab.active; }).id;
      assert(!(await normalize.isDisabled()) && !(await markers.isDisabled()), "Time presentation controls must be enabled for nonempty Time Display");
      originalNormalize = await normalize.isChecked();
      originalMarkers = await markers.isChecked();
      if (await normalize.isChecked()) await localCheckbox(page, normalize, false, config, log, "reset Normalize Y");
      if (await markers.isChecked()) await localCheckbox(page, markers, false, config, log, "reset Show Markers");
      if (await peaksAction.getAttribute("aria-pressed") !== "true") {
        const response = waitForApi(page, config, config.app.api.view, "POST");
        await peaksAction.click({ timeout: VIEW_TIMEOUT });
        if (!(await response).ok()) throw new Error("enabling Peaks annotation for Normalize Y alignment failed");
        await waitForSettled(page, config);
        peaksEnabledByScenario = true;
      }
    });

    await step("Normalize Y and Show Markers are revision-neutral Plotly.react presentation", async function () {
      const marker = await markReactPath(page, config);
      const baseline = await hostSnapshot(page, config);
      assert(baseline.peak, "Normalize Y alignment requires the backend-provided Peaks marker trace");
      await retainSourceArrays(page, config);
      await localCheckbox(page, normalize, true, config, log, "enable Normalize Y");
      const normalized = await hostSnapshot(page, config);
      assert(normalized.marker === marker, "Normalize Y must retain the same active Plotly host");
      assertNormalized(assert, baseline.ordinary, normalized.ordinary);
      assertPeakAligned(assert, baseline, normalized);
      await localCheckbox(page, markers, true, config, log, "enable Show Markers");
      const marked = await hostSnapshot(page, config);
      marked.ordinary.forEach(function (trace) { assert(trace.mode === "lines+markers", "Show Markers must affect only ordinary Time traces"); });
      assert(!marked.peak || marked.peak.mode === normalized.peak.mode, "Show Markers must not alter dedicated Peaks marker trace");
      const reactCount = await page.evaluate(function () { return window.__e2eTimePresentationReactCount(); });
      assert(reactCount >= 2, "each presentation toggle must use Plotly.react");
      const restored = await hostSnapshot(page, config);
      await assertRetainedSourceArrays(page, assert);
      assert(restored.marker === marker, "presentation toggles must retain host identity");
    });

    await step("preferences are per-Display and survive non-Time and empty disablement", async function () {
      await page.locator(testIdSelector(config.app.testIds.addDisplay)).click();
      await waitForIdle(page, config);
      secondDisplay = (await displayTabs(page, config)).find(function (tab) { return tab.active; }).id;
      await selectPlot(page, config, "time");
      assert(!(await normalize.isChecked()) && !(await markers.isChecked()), "new Display Time presentation preferences must default off");
      await localCheckbox(page, normalize, false, config, log, "retain Display B Normalize Y off");
      await localCheckbox(page, markers, true, config, log, "enable Display B Show Markers");
      await selectDisplay(page, config, originalDisplay);
      assert(await normalize.isChecked() && await markers.isChecked(), "Display A must restore its own Time presentation preferences");
      await selectPlot(page, config, "spectrum");
      assert(await normalize.isDisabled() && await markers.isDisabled(), "non-Time Display must disable presentation controls");
      await selectPlot(page, config, "time");
      assert(await normalize.isChecked() && await markers.isChecked(), "non-Time disablement must not lose Display A preferences");
      const rows = await signalRowsState(page, config);
      const member = rows.find(function (row) { return row.checked; });
      assert(member, "empty Display presentation check needs a visible signal to restore");
      clearedMemberId = member.id;
      const overflow = page.locator(testIdSelector(config.app.testIds.displayOverflowTrigger));
      await overflow.click({ timeout: VIEW_TIMEOUT });
      const clear = page.locator(testIdSelector(config.app.testIds.clearDisplayAction));
      const clearResponse = waitForApi(page, config, config.app.api.view, "POST");
      await clear.click({ timeout: VIEW_TIMEOUT });
      if (!(await clearResponse).ok()) throw new Error("Clear Display for empty presentation check failed");
      await waitForSettled(page, config);
      assert(await normalize.isDisabled() && await markers.isDisabled(), "empty Display must disable presentation controls");
      const restoreResponse = waitForApi(page, config, config.app.api.view, "POST");
      await page.locator(testIdSelector(member.checkboxTestId)).setChecked(true, { timeout: VIEW_TIMEOUT });
      if (!(await restoreResponse).ok()) throw new Error("re-add after empty presentation check failed");
      await waitForSettled(page, config);
      assert(await normalize.isChecked() && await markers.isChecked(), "empty disablement must not lose Display A preferences");
      await selectDisplay(page, config, secondDisplay);
      assert(!(await normalize.isChecked()) && await markers.isChecked(), "Display B must restore independent preferences");
    });
  } finally {
    try { await restoreReactPath(page); } catch (error) { log(`cleanup could not restore Plotly.react: ${error.message}`); }
    try {
      if (originalDisplay) await selectDisplay(page, config, originalDisplay);
      if ((await normalize.isDisabled()) && clearedMemberId) {
        const member = (await signalRowsState(page, config)).find(function (row) { return row.id === clearedMemberId; });
        if (member && !member.checked) {
          const response = waitForApi(page, config, config.app.api.view, "POST");
          await page.locator(testIdSelector(member.checkboxTestId)).setChecked(true, { timeout: VIEW_TIMEOUT });
          await response;
          await waitForSettled(page, config);
        }
      }
      if (!(await normalize.isDisabled()) && await normalize.isChecked() !== originalNormalize) {
        await localCheckbox(page, normalize, originalNormalize, config, log, "cleanup restore Normalize Y");
      }
      if (!(await markers.isDisabled()) && await markers.isChecked() !== originalMarkers) {
        await localCheckbox(page, markers, originalMarkers, config, log, "cleanup restore Show Markers");
      }
    } catch (error) { log(`cleanup could not restore Time presentation state: ${error.message}`); }
    try {
      if (secondDisplay && (await displayTabs(page, config)).some(function (tab) { return tab.id === secondDisplay; })) {
        await selectDisplay(page, config, secondDisplay);
        await page.locator(testIdSelector(`close-display-${secondDisplay}`)).click({ timeout: VIEW_TIMEOUT });
        await waitForIdle(page, config);
      }
    } catch (error) { log(`cleanup could not close scenario-created Display: ${error.message}`); }
    try {
      if (peaksEnabledByScenario && originalDisplay) await selectDisplay(page, config, originalDisplay);
      if (peaksEnabledByScenario && !(await peaksAction.isDisabled()) && await peaksAction.getAttribute("aria-pressed") === "true") {
        const response = waitForApi(page, config, config.app.api.view, "POST");
        await peaksAction.click({ timeout: VIEW_TIMEOUT });
        await response;
        await waitForSettled(page, config);
      }
    } catch (error) { log(`cleanup could not disable scenario Peaks annotation: ${error.message}`); }
  }
}

testTimePresentation.requiredFeatures = ["frontend-state-management", "graph-output-zone", "signal-analyser-displays", "clear-display", "time-presentation"];

module.exports = testTimePresentation;
