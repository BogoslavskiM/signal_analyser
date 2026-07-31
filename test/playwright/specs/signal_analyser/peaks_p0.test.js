"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  endpointMatches,
  isApiRequestUrl,
  responseJson,
  waitForApi,
  waitForSettled,
  performanceLog,
} = require("../../support/signal_analyser_page");

const VIEW_TIMEOUT = 30000;

function peaksId(config, name) {
  const value = config.app.testIds.peaks && config.app.testIds.peaks[name];
  if (typeof value !== "string") throw new Error(`Missing Peaks test id: ${name}`);
  return value;
}

function locator(page, config, name) {
  return page.locator(testIdSelector(peaksId(config, name)));
}

async function finiteAttribute(row, name) {
  const raw = await row.getAttribute(`data-${name}`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Peak row ${name} must be finite: ${raw}`);
  return value;
}

function currentSnapshot(payload, label) {
  if (!payload || !Number.isInteger(payload.state_revision) || !payload.peaks || !Array.isArray(payload.displays)) {
    throw new Error(`${label} must be an authoritative state snapshot`);
  }
  return payload;
}

function assertPeaksSnapshot(assert, snapshot, enabled) {
  const peaks = snapshot.peaks;
  assert(peaks.enabled === enabled, `root peaks.enabled must be ${enabled}`);
  assert(peaks.state_revision === snapshot.state_revision,
    "peaks revision must equal the root state revision");
  assert(peaks.display_id === snapshot.active_display_id,
    "peaks display scope must equal active display id");
  const active = snapshot.displays.find(function (display) { return display.id === snapshot.active_display_id; });
  assert(active && active.peaks_enabled === enabled,
    `active Display peaks_enabled must canonically equal ${enabled}`);
  assert(Array.isArray(peaks.items), "peaks items must be an array");
  if (!enabled) assert(peaks.items.length === 0, "disabled peaks must publish an empty items array");
}

async function clickAndCaptureView(page, config, trigger, log, label) {
  const requests = [];
  const onRequest = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } },
      config.app.api.view, "POST")) requests.push(request);
  };
  const startedAt = Date.now();
  page.on("request", onRequest);
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await trigger.click({ timeout: VIEW_TIMEOUT });
    const response = await responsePromise;
    await waitForSettled(page, config);
    performanceLog(log, `${label} POST /api/view`, Date.now() - startedAt, undefined,
      `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (!response.ok()) throw new Error(`${label} /api/view returned HTTP ${response.status()}`);
    if (requests.length !== 1) throw new Error(`${label} must make exactly one /api/view request, observed ${requests.length}`);
    const body = requests[0].postDataJSON();
    if (!Number.isInteger(body.state_revision) || typeof body.peaks_enabled !== "boolean") {
      throw new Error(`${label} request must carry revision-safe peaks_enabled state`);
    }
    return currentSnapshot(await responseJson(response, label), label);
  } finally {
    page.off("request", onRequest);
  }
}

async function selectPlotAndCaptureView(page, config, value, log, label) {
  const select = page.locator(testIdSelector(config.app.testIds.plotTypeSelect));
  const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
  const startedAt = Date.now();
  await select.selectOption(value, { timeout: VIEW_TIMEOUT });
  const response = await responsePromise;
  await waitForSettled(page, config);
  performanceLog(log, `${label} POST /api/view`, Date.now() - startedAt, undefined, `HTTP ${response.status()}`);
  if (!response.ok()) throw new Error(`${label} /api/view returned HTTP ${response.status()}`);
  return currentSnapshot(await responseJson(response, label), label);
}

async function localBottomTab(page, config, key, expected, log) {
  const target = expected === "signals" ?
    page.locator(testIdSelector(config.app.testIds.measurements.signalsTab)) :
    expected === "measurements" ?
      page.locator(testIdSelector(config.app.testIds.measurements.measurementsTab)) : locator(page, config, "tab");
  const requests = [];
  const onRequest = function (request) {
    if (isApiRequestUrl(request)) requests.push(`${request.method()} ${request.url()}`);
  };
  page.on("request", onRequest);
  try {
    await page.keyboard.press(key);
    await target.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
    await page.waitForFunction(function (selector) {
      const element = document.querySelector(selector);
      return element && (element.getAttribute("aria-selected") === "true" || element.getAttribute("aria-pressed") === "true");
    }, testIdSelector(await target.getAttribute("data-testid")), { timeout: VIEW_TIMEOUT });
  } finally {
    page.off("request", onRequest);
  }
  await assertTabLocal(target, requests, key, expected);
  log(`local bottom-tab ${key} to ${expected}; zero API request`);
}

function assertTabLocal(target, requests, key, expected) {
  if (requests.length) throw new Error(`${key} to ${expected} must be local: ${JSON.stringify(requests)}`);
  return target.evaluate(function (element) {
    if (document.activeElement !== element) throw new Error("roving tab focus did not follow active tab");
  });
}

async function assertPeaksTable(page, config, assert, snapshot) {
  const peaks = snapshot.peaks;
  const table = locator(page, config, "table");
  await table.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
  assert(await table.getAttribute("data-display-id") === peaks.display_id, "table display scope must match backend snapshot");
  assert(await table.getAttribute("data-selected-signal") === peaks.signal_name, "table signal scope must match backend snapshot");
  assert(Number(await table.getAttribute("data-state-revision")) === peaks.state_revision, "table revision must match backend snapshot");
  const rows = table.locator(`[data-testid^=${JSON.stringify(peaksId(config, "rowPrefix"))}]`);
  assert(await rows.count() === peaks.items.length && peaks.items.length > 0,
    "enabled Peaks table must render every non-empty backend item exactly once");
  for (let index = 0; index < peaks.items.length; index += 1) {
    const item = peaks.items[index];
    const row = rows.nth(index);
    assert(await row.getAttribute("data-testid") === `peak-row-${item.id}`, "peak row id must derive only from backend item id");
    assert(Number(await row.getAttribute("data-sample-index")) === item.sample_index && item.sample_index >= 0,
      "peak row must preserve zero-based backend sample index");
    ["value", "time_s", "width_samples", "prominence"].forEach(function (field) {
      assert(Number.isFinite(Number(item[field])), `backend peak ${field} must be finite`);
    });
    for (const name of ["value", "time-s", "width-samples", "prominence"]) {
      await finiteAttribute(row, name);
    }
    assert(await row.getAttribute("data-display-id") === peaks.display_id, "peak row display scope must match backend snapshot");
    assert(await row.getAttribute("data-signal") === peaks.signal_name, "peak row signal scope must match backend snapshot");
    if (index) assert(item.sample_index > peaks.items[index - 1].sample_index, "peak items must be ordered by increasing zero-based sample index");
  }
}

async function assertPeakMarker(page, config, assert, snapshot) {
  const marker = await page.locator(testIdSelector(config.app.testIds.activePlotHost)).evaluate(function (host) {
    const traces = Array.isArray(host.data) ? host.data : host._fullData || [];
    return traces.find(function (trace) { return trace.meta && trace.meta.test_id === "peak-marker-trace"; }) || null;
  });
  assert(marker && marker.name === "Пики" && String(marker.mode).includes("markers") &&
    marker.marker && marker.marker.symbol === "x", "backend peaks marker trace must be present");
  assert(marker.meta.display_id === snapshot.peaks.display_id && marker.meta.signal_name === snapshot.peaks.signal_name,
    "peak marker trace scope must match backend snapshot");
  assert(Array.isArray(marker.x) && marker.x.length === snapshot.peaks.items.length,
    "peak marker trace must carry one backend-provided x coordinate per item");
}

async function assertShellPeaksState(page, config, assert, snapshot) {
  const shell = page.locator(testIdSelector(config.app.testIds.shell));
  assert(await shell.getAttribute("data-active-display-id") === snapshot.active_display_id,
    "shell active display id must match backend snapshot");
  assert(Number(await shell.getAttribute("data-state-revision")) === snapshot.state_revision,
    "shell revision must match backend snapshot");
  assert((await shell.getAttribute("data-peaks-enabled")) === String(snapshot.peaks.enabled),
    "shell canonical peaks_enabled state must match backend snapshot");
}

async function testPeaksP0({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const action = page.locator(testIdSelector(config.app.testIds.findPeaksAction));
  try {
    await step("open active Time page with Peaks disabled", async function () {
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      assert(await page.locator(testIdSelector(config.app.testIds.plotTypeSelect)).inputValue() === "time", "P0 Peaks starts on active Time page");
      assert(!(await action.isDisabled()), "Find peaks must be enabled only on active Time page");
    });
    await step("enable Peaks through one revision-safe view mutation", async function () {
      const snapshot = await clickAndCaptureView(page, config, action, log, "enable Peaks");
      assertPeaksSnapshot(assert, snapshot, true);
      await assertShellPeaksState(page, config, assert, snapshot);
      assert(await action.getAttribute("aria-pressed") === "true", "Find peaks action must expose enabled pressed state");
      assert(await locator(page, config, "tab").getAttribute("aria-selected") === "true", "successful enable must open Peaks tab");
      assert(await locator(page, config, "panel").isVisible(), "successful enable must show Peaks panel");
      assert((await locator(page, config, "signalName").innerText()).trim() === snapshot.peaks.signal_name, "Peaks signal label must match backend snapshot");
      await assertPeaksTable(page, config, assert, snapshot);
      await assertPeakMarker(page, config, assert, snapshot);
    });
    await step("bottom Peaks Signals Measurements navigation remains local", async function () {
      await locator(page, config, "tab").focus();
      await localBottomTab(page, config, "Home", "signals", log);
      await localBottomTab(page, config, "ArrowRight", "measurements", log);
      await localBottomTab(page, config, "End", "peaks", log);
    });
    await step("leaving Time clears Peaks canonically and disables action", async function () {
      const snapshot = await selectPlotAndCaptureView(page, config, "spectrum", log, "leave Time with Peaks enabled");
      assertPeaksSnapshot(assert, snapshot, false);
      await assertShellPeaksState(page, config, assert, snapshot);
      assert(await action.isDisabled(), "Find peaks must be disabled outside Time");
    });
    await step("restore Time then explicitly disable Peaks to safe Signals tab", async function () {
      await selectPlotAndCaptureView(page, config, "time", log, "restore Time");
      const enabled = await clickAndCaptureView(page, config, action, log, "re-enable Peaks");
      assertPeaksSnapshot(assert, enabled, true);
      const disabled = await clickAndCaptureView(page, config, action, log, "disable Peaks");
      assertPeaksSnapshot(assert, disabled, false);
      await assertShellPeaksState(page, config, assert, disabled);
      assert(await page.locator(testIdSelector(config.app.testIds.measurements.signalsTab)).getAttribute("aria-selected") === "true",
        "disabling active Peaks must restore safe Signals tab");
    });
  } finally {
    if (!(await action.isDisabled()) && await action.getAttribute("aria-pressed") === "true") {
      try { await clickAndCaptureView(page, config, action, log, "cleanup disable Peaks"); } catch (error) { log(`cleanup could not disable Peaks: ${error.message}`); }
    }
  }
}

testPeaksP0.requiredFeatures = ["frontend-state-management", "graph-output-zone", "signal-analyser-displays", "peaks"];

module.exports = testPeaksP0;
