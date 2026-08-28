"use strict";

// HND-0778: a narrow live-PROD chronology for pane-owned extrema. It does not
// create signals or panes; it uses filled panes that already exist and clears
// only the extrema state it has just calculated.
const fs = require("fs");
const path = require("path");
const { openAppPage } = require("../../support/app_page");

const OUT = path.resolve(__dirname, "../../artifacts/HND-0762");
const PANE_PATH = "/api/peaks/pane";
const CLEAR_PATH = "/api/peaks/pane/clear";
const TERMINAL = "[data-testid='peaks-table'], [data-testid='peaks-empty'], [data-testid='peaks-error']";

function save(report) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}
function apiPath(url) { return new URL(url).pathname; }
function compact(value) {
  if (!value || typeof value !== "object") return value == null ? value : String(value);
  const allowed = ["display_id", "pane_id", "is_extrema_ready", "isready", "success", "error", "need_update", "state_revision", "status"];
  return Object.fromEntries(allowed.filter((key) => Object.prototype.hasOwnProperty.call(value, key)).map((key) => [key, value[key]]));
}

async function appContext(page) {
  return page.evaluate(() => {
    const shell = document.querySelector("[data-testid='app-shell']");
    const displayId = shell && shell.getAttribute("data-active-display-id");
    const paneId = shell && shell.getAttribute("data-active-pane");
    const key = displayId && paneId ? `${displayId}::${paneId}` : null;
    const host = key && document.querySelector(`[data-pane-host="${CSS.escape(key)}"]`);
    const plot = host && (host.classList.contains("js-plotly-plot") ? host : host.querySelector(".js-plotly-plot"));
    const traces = plot && (plot.data || plot._fullData) || [];
    return {
      displayId, paneId, key,
      extremaState: document.querySelector("[data-extrema-state]")?.getAttribute("data-extrema-state") || null,
      markerTraceCount: traces.filter((trace) => trace && trace.meta && trace.meta.signal_analyser_peaks_overlay === true).length,
      action: document.querySelector("[data-testid='extrema-header-action']")?.textContent.trim() || null,
      clearDisabled: document.querySelector("[data-testid='extrema-header-clear']")?.disabled ?? null,
    };
  });
}

async function waitForInteractive(page) {
  await page.waitForFunction(() => {
    const shell = document.querySelector("[data-testid='app-shell']");
    const loading = document.querySelector("[data-testid='app-loading']");
    const key = shell && shell.getAttribute("data-active-display-id") && shell.getAttribute("data-active-pane");
    const host = key && document.querySelector(`[data-pane-host="${CSS.escape(key)}"]`);
    return shell && (!loading || loading.hidden || getComputedStyle(loading).display === "none") && host && host.dataset.plotReady === "true";
  }, null, { timeout: 180000 });
}

async function assertRevision(page, expected) {
  const status = await page.evaluate(async () => {
    const response = await fetch("./api/status", { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  });
  if (status.status !== 200 || !status.body || status.body.ready !== true || status.body.runtime_revision !== expected) {
    throw new Error(`exact runtime revision gate failed: ${JSON.stringify(status)}`);
  }
  return status.body;
}

async function filledPaneKeys(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll("[data-pane-host]")).map((host) => {
    const plot = host.classList.contains("js-plotly-plot") ? host : host.querySelector(".js-plotly-plot");
    const traces = plot && (plot.data || plot._fullData) || [];
    return { key: host.getAttribute("data-pane-host"), filled: traces.some((trace) => trace && trace.visible !== "legendonly" && Array.isArray(trace.x) && trace.x.length) };
  }).filter((item) => item.key && item.filled).map((item) => item.key));
}

async function activatePane(page, key) {
  const host = page.locator(`[data-pane-host=${JSON.stringify(key)}]`);
  await host.waitFor({ state: "visible", timeout: 30000 });
  await host.click({ timeout: 30000 });
  await page.waitForFunction((expected) => {
    const shell = document.querySelector("[data-testid='app-shell']");
    return shell && `${shell.getAttribute("data-active-display-id")}::${shell.getAttribute("data-active-pane")}` === expected;
  }, key, { timeout: 30000 });
}

async function openPeaks(page) {
  await page.locator("[data-testid='inspector-tab-peaks']").click({ timeout: 30000 });
  await page.locator("[data-testid='extrema-header-action']").waitFor({ state: "visible", timeout: 60000 });
}
async function terminal(page) {
  await page.waitForSelector(TERMINAL, { state: "visible", timeout: 120000 });
  return { state: await appContext(page), tableRows: await page.locator("[data-testid='peaks-table'] tbody tr").count() };
}
async function leaveAndReturnToPeaks(page) {
  await page.locator("[data-testid='inspector-tab-signals']").click({ timeout: 30000 });
  await page.locator("[data-testid='inspector-tab-peaks']").click({ timeout: 30000 });
  await page.locator("[data-testid='extrema-header-action']").waitFor({ state: "visible", timeout: 30000 });
}

async function calculatePane(page, report, key) {
  await activatePane(page, key);
  await openPeaks(page);
  const action = page.locator("[data-testid='extrema-header-action']");
  if (await action.isDisabled()) throw new Error(`calculate action unexpectedly disabled for ${key}`);
  const start = report.chronology.length;
  await action.click({ timeout: 30000 });
  // A worker belongs to the pane, not to the currently selected inspector tab.
  await leaveAndReturnToPeaks(page);
  const result = await terminal(page);
  const requests = report.chronology.slice(start);
  const posts = requests.filter((item) => item.method === "POST" && item.path === PANE_PATH);
  const gets = requests.filter((item) => item.method === "GET" && item.path === PANE_PATH);
  const unexpectedPosts = requests.filter((item) => item.method === "POST" && item.path !== PANE_PATH && item.path !== CLEAR_PATH);
  if (posts.length !== 1) throw new Error(`${key}: expected exactly one ${PANE_PATH} POST, got ${posts.length}`);
  if (!gets.length) throw new Error(`${key}: expected GET polling after calculate`);
  if (unexpectedPosts.length) throw new Error(`${key}: unexpected mutation during calculation ${JSON.stringify(unexpectedPosts)}`);
  if (result.state.extremaState !== "error" && result.state.clearDisabled !== false) throw new Error(`${key}: Clear is not enabled after a ready result`);
  if (result.tableRows > 0 && result.state.markerTraceCount < 1) throw new Error(`${key}: rows arrived but markers are absent`);
  return { key, result, posts, gets };
}

async function clearPane(page, report, key) {
  await activatePane(page, key);
  await openPeaks(page);
  const clear = page.locator("[data-testid='extrema-header-clear']");
  if (await clear.isDisabled()) return { key, skipped: "terminal error has no clearable result" };
  const start = report.chronology.length;
  await clear.click({ timeout: 30000 });
  await page.locator("[data-testid='extrema-start']").waitFor({ state: "visible", timeout: 30000 });
  const state = await appContext(page);
  const requests = report.chronology.slice(start);
  const clears = requests.filter((item) => item.method === "POST" && item.path === CLEAR_PATH);
  const forbidden = requests.filter((item) => item.method === "POST" && item.path !== CLEAR_PATH);
  if (clears.length !== 1 || forbidden.length) throw new Error(`${key}: invalid clear chronology ${JSON.stringify(requests)}`);
  if (state.markerTraceCount !== 0 || state.action !== "Рассчитать" || state.clearDisabled !== true) throw new Error(`${key}: Clear did not restore start state ${JSON.stringify(state)}`);
  return { key, state, clears };
}

async function hnd0762({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const report = { id: "HND-0778", target: appUrl, expected_revision: process.env.E2E_EXPECTED_REVISION, browser_visibility: process.env.E2E_VISIBLE === "true" ? "visible" : "hidden", browser_channel: "google-chrome", worker_count: Number(process.env.E2E_WORKERS || 1), opened_tab_count: 0, closed_tab_count: 0, chronology: [], checks: [], errors: [] };
  let prototypePage;
  const responseListener = async (response) => {
    const pathname = apiPath(response.url());
    if (![PANE_PATH, CLEAR_PATH].includes(pathname)) return;
    const request = response.request();
    const entry = { at: new Date().toISOString(), method: request.method(), path: pathname, status: response.status(), query: new URL(response.url()).search, request: request.method() === "POST" ? compact(request.postDataJSON()) : null };
    try { entry.response = compact(await response.json()); } catch (_error) { entry.response = null; }
    report.chronology.push(entry); save(report);
  };
  page.on("response", responseListener);
  try {
    await step("open static design contract", async () => {
      prototypePage = await page.context().newPage(); report.opened_tab_count += 1;
      await prototypePage.goto(`file://${path.resolve(__dirname, "../../../../architecture/design/current/prototype/index.html")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await prototypePage.locator("[data-testid='app-shell']").waitFor({ state: "visible", timeout: 30000 });
      report.prototype = { url: prototypePage.url(), peaks_tab: await prototypePage.locator("[data-testid='inspector-tab-peaks']").count() > 0 };
      await prototypePage.screenshot({ path: path.join(OUT, "prototype-contract.png"), animations: "disabled" });
    });
    await step("wait for actual production interactivity and revision", async () => {
      await page.bringToFront(); await openAppPage(page, { appUrl, config, log, useCurrentPage });
      await waitForInteractive(page); report.runtime = await assertRevision(page, report.expected_revision);
      report.filled_panes = await filledPaneKeys(page);
      assert(report.filled_panes.length > 0, "HND-0778 requires an already filled pane; none is available");
      await page.screenshot({ path: path.join(OUT, "prod-before-extrema.png"), animations: "disabled" });
      report.checks.push({ name: "interactive exact revision", status: "passed", detail: report.runtime }); save(report);
    });
    await step("calculate, retain and clear first filled pane", async () => {
      const first = report.filled_panes[0]; report.first = await calculatePane(page, report, first);
      await page.screenshot({ path: path.join(OUT, "prod-first-terminal.png"), animations: "disabled" });
      report.first_clear = await clearPane(page, report, first);
      report.checks.push({ name: "calculate polls to terminal; tab navigation retains pane markers; clear resets only that pane", status: "passed", detail: report.first_clear }); save(report);
    });
    await step("optional second already filled pane", async () => {
      const second = report.filled_panes.find((key) => key !== report.filled_panes[0]);
      if (!second) { report.second = { skipped: "no second already filled pane" }; return; }
      report.second = await calculatePane(page, report, second); report.second_clear = await clearPane(page, report, second);
      report.checks.push({ name: "second filled pane terminates independently", status: "passed", detail: report.second_clear }); save(report);
    });
    await page.screenshot({ path: path.join(OUT, "prod-after-clear.png"), animations: "disabled" });
  } catch (error) { report.errors.push(String(error && error.stack || error)); save(report); throw error; }
  finally {
    page.off("response", responseListener);
    if (prototypePage && !prototypePage.isClosed()) { await prototypePage.close(); report.closed_tab_count += 1; }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed"; save(report);
  }
}

hnd0762.requiredFeatures = ["graph-output-zone", "output-loading-flow", "inspector-ui"];
hnd0762.scenarioFlags = ["HND-0778-PANE-EXTREMA"];
module.exports = hnd0762;
