"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "1cf64a6c630685a48969fb1d364c7171e9b1ecdc";
const artifactDir = path.resolve(__dirname, "artifacts/TASK-0097-EXTREMA");
const reportPath = path.join(artifactDir, "functional-pty.json");
const modeLabels = { maxima: "Максимумы", minima: "Минимумы", all: "Все экстремумы" };

const report = {
  target,
  expected_revision: expectedRevision,
  browser_channel: "chrome",
  headless: false,
  browser_visibility: "foreground",
  worker_count: 1,
  checks: [],
  requests: [],
  opened_tab_count: 0,
  closed_tab_count: 0,
  errors: [],
};

function save() {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

function check(name, pass, detail) {
  report.checks.push({ name, status: pass ? "passed" : "failed", detail });
  save();
  if (!pass) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

function activateChrome() {
  execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']);
}

async function stateLite(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/state-lite", { cache: "no-store" });
    if (!response.ok) throw new Error(`state-lite ${response.status}`);
    return response.json();
  });
}

function activeContext(state) {
  const displayId = state.active_display_id;
  const layout = state.layouts.find((item) => item.display_id === displayId);
  return { displayId, paneId: layout.active_pane_id };
}

async function activePeaks(page, context) {
  return page.evaluate(async ({ displayId, paneId }) => {
    const url = `/api/peaks/active?display_id=${encodeURIComponent(displayId)}&pane_id=${encodeURIComponent(paneId)}`;
    const response = await fetch(url, { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  }, context);
}

async function waitTerminalPeaks(page, context) {
  const deadline = Date.now() + 12000;
  let latest;
  while (Date.now() < deadline) {
    latest = await activePeaks(page, context);
    if (latest.status === 200 && latest.body.isready === true) return latest;
    await page.waitForTimeout(250);
  }
  throw new Error(`Extrema did not become terminal: ${JSON.stringify(latest)}`);
}

async function selectMode(page, mode) {
  const trigger = page.getByTestId("extrema-mode-trigger");
  await trigger.click({ timeout: 5000 });
  await page.locator(`[data-extrema-mode-option='${mode}']`).click({ timeout: 5000 });
}

async function setModeViaUi(page, mode) {
  const current = (await page.getByTestId("extrema-mode-trigger").innerText()).trim();
  if (current === modeLabels[mode]) return { skipped: true };
  await selectMode(page, mode);
  const responsePromise = page.waitForResponse(
    (response) => /\/api\/peaks\/settings(?:\?|$)/.test(response.url()) && response.request().method() === "POST",
    { timeout: 8000 },
  );
  await page.getByTestId("settings-apply").click({ timeout: 5000 });
  const response = await responsePromise;
  return { skipped: false, status: response.status(), body: response.request().postDataJSON() };
}

async function tableEvidence(page) {
  await page.getByTestId("inspector-tab-peaks").click({ timeout: 5000 });
  await page.waitForFunction(() => {
    const table = document.querySelector("[data-testid='peaks-table']");
    return table && table.tBodies[0] && table.tBodies[0].rows.length > 0;
  }, { timeout: 12000 });
  return page.evaluate(() => {
    const host = document.querySelector(".plot-chart.js-plotly-plot");
    if (host && !host.dataset.e2eExtremaHost) host.dataset.e2eExtremaHost = `host-${Date.now()}`;
    const table = document.querySelector("[data-testid='peaks-table']");
    return {
      plot: host ? {
        id: host.dataset.e2eExtremaHost,
        base_traces: (host.data || []).filter((trace) => !(trace.meta && trace.meta.signal_analyser_peaks_overlay)).length,
        overlays: (host.data || []).filter((trace) => trace.meta && trace.meta.signal_analyser_peaks_overlay).map((trace) => ({
          symbols: trace.marker && trace.marker.symbol,
          color: trace.marker && trace.marker.color,
        })),
      } : null,
      rows: Array.from(table.tBodies[0].rows).map((row) => ({
        cells: Array.from(row.cells).map((cell) => cell.innerText.trim()),
        marker: row.querySelector("[data-marker-symbol]")?.dataset.markerSymbol || null,
        color: row.querySelector(".peaks-color-swatch")?.style.getPropertyValue("--swatch") || null,
      })),
    };
  });
}

function validateMode(mode, evidence, totalCap) {
  const rows = evidence.rows;
  const expected = mode === "minima" ? "Минимум" : "Максимум";
  const types = rows.map((row) => row.cells[3]);
  const correctTypes = mode === "all" ? new Set(types).size === 2 : types.every((type) => type === expected);
  const signedMinima = mode !== "minima" || rows.every((row) => Number(row.cells[4]) < 0);
  const markers = rows.every((row) => row.marker === (row.cells[3] === "Минимум" ? "triangle-down" : "triangle-up"));
  const chronological = rows.every((row, index) => index === 0 || Number(row.cells[5]) >= Number(rows[index - 1].cells[5]));
  const rowNumbers = rows.every((row, index) => Number(row.cells[0]) === index + 1);
  const perSignal = new Map();
  for (const row of rows) perSignal.set(row.cells[1], (perSignal.get(row.cells[1]) || 0) + 1);
  const capped = Array.from(perSignal.values()).every((count) => count <= totalCap);
  return { row_count: rows.length, types, correctTypes, signedMinima, markers, chronological, rowNumbers, capped };
}

async function restoreViaApi(page, context, baseline) {
  return page.evaluate(async ({ context, baseline }) => {
    const stateResponse = await fetch("/api/state-lite", { cache: "no-store" });
    const state = await stateResponse.json();
    const response = await fetch("/api/peaks/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state_revision: state.state_revision,
        display_id: context.displayId,
        pane_id: context.paneId,
        settings: baseline,
      }),
    });
    return { status: response.status, body: await response.json() };
  }, { context, baseline });
}

(async () => {
  let browser;
  let page;
  let context;
  let baseline;
  let restorationVerified = false;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const browserContext = browser.contexts()[0] || await browser.newContext();
    report.preexisting_page_urls = browserContext.pages().map((candidate) => candidate.url());
    page = await browserContext.newPage();
    report.opened_tab_count += 1;
    await page.bringToFront();
    activateChrome();
    page.on("response", (response) => {
      if (/\/api\/(?:peaks|outputs\/active)/.test(response.url())) {
        report.requests.push({ url: response.url(), method: response.request().method(), status: response.status() });
      }
    });

    await page.goto(target, { waitUntil: "commit", timeout: 20000 });
    await page.getByTestId("app-shell").waitFor({ state: "visible", timeout: 20000 });
    const status = await page.evaluate(async () => (await fetch("/api/status", { cache: "no-store" })).json());
    check("exact production revision", status.ready === true && status.runtime_revision === expectedRevision, status);

    const state = await stateLite(page);
    context = activeContext(state);
    const initial = await waitTerminalPeaks(page, context);
    baseline = initial.body.data.settings;
    report.baseline = { context, settings: baseline };
    save();

    await page.getByTestId("settings-tab-peaks").click({ timeout: 5000 });
    await page.getByTestId("extrema-mode-trigger").waitFor({ state: "visible", timeout: 8000 });
    const requestStart = report.requests.length;
    const observations = {};
    let stablePlot;

    for (const mode of ["maxima", "minima", "all"]) {
      await page.getByTestId("settings-tab-peaks").click({ timeout: 5000 });
      const apply = await setModeViaUi(page, mode);
      if (!apply.skipped) check(`${mode} settings POST`, apply.status === 200 && apply.body.settings.mode === mode, apply);
      const terminal = await waitTerminalPeaks(page, context);
      check(`${mode} terminal payload`, terminal.status === 200 && terminal.body.isready === true && terminal.body.success === true && terminal.body.data.settings.mode === mode, terminal.body);
      const evidence = await tableEvidence(page);
      const validation = validateMode(mode, evidence, Number(terminal.body.data.settings.number_of_peaks));
      check(`${mode} table and markers`, validation.row_count > 0 && validation.correctTypes && validation.signedMinima && validation.markers && validation.chronological && validation.rowNumbers && validation.capped, validation);
      if (!stablePlot) stablePlot = evidence.plot;
      else check(`${mode} Plotly host preserved`, evidence.plot && stablePlot && evidence.plot.id === stablePlot.id && evidence.plot.base_traces === stablePlot.base_traces, { initial: stablePlot, current: evidence.plot });
      observations[mode] = { apply, validation, rows: evidence.rows, plot: evidence.plot };
    }
    report.observations = observations;

    const outputRequests = report.requests.slice(requestStart).filter((request) => /\/api\/outputs\/active/.test(request.url));
    check("mode changes do not reload graph output", outputRequests.length === 0, outputRequests);

    const restore = await restoreViaApi(page, context, baseline);
    const restored = await waitTerminalPeaks(page, context);
    restorationVerified = restore.status === 200 && JSON.stringify(restored.body.data.settings) === JSON.stringify(baseline);
    report.restoration = { status: restorationVerified ? "verified" : "failed", response_status: restore.status, settings: restored.body.data.settings };
    check("exact baseline restoration", restorationVerified, report.restoration);
    await page.screenshot({ path: path.join(artifactDir, "functional-all-restored.png") });
  } catch (error) {
    report.errors.push(String(error && error.stack || error));
  } finally {
    if (page && baseline && context && !restorationVerified) {
      try {
        const restore = await restoreViaApi(page, context, baseline);
        const restored = await waitTerminalPeaks(page, context);
        restorationVerified = restore.status === 200 && JSON.stringify(restored.body.data.settings) === JSON.stringify(baseline);
        report.restoration = { status: restorationVerified ? "verified-in-finally" : "failed", response_status: restore.status, settings: restored.body.data.settings };
      } catch (error) {
        report.errors.push(`restoration: ${String(error && error.stack || error)}`);
      }
    }
    if (page && !page.isClosed()) {
      try {
        await page.close();
        report.closed_tab_count += 1;
      } catch (error) {
        report.errors.push(`tab cleanup: ${String(error)}`);
      }
    }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    save();
    if (browser) await browser.close();
    process.stdout.write(JSON.stringify({
      checks: report.checks,
      errors: report.errors,
      restoration: report.restoration,
      cleanup: report.tab_cleanup_status,
    }, null, 2));
    if (report.errors.length || report.checks.some((item) => item.status === "failed") || !restorationVerified) process.exitCode = 1;
  }
})();
