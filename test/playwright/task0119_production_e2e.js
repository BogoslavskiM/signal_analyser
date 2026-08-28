"use strict";

/*
 * TASK-0119 deployed quick regression.  This is deliberately read-only with
 * respect to the signal workspace: it verifies the new surfaces when the
 * production session already contains a main signal, but never manufactures a
 * binding just to make a screenshot possible.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "cd5c1c6b7d6cbb13e1e44671c89f30e578d79785";
const prototype = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/current/prototype/index.html";
const out = path.resolve(__dirname, "artifacts/TASK-0119-E2E");
fs.mkdirSync(out, { recursive: true });

const report = {
  id: "HND-TASK-0119-E2E",
  type: "report",
  from: "E2E",
  to: "Orchestrator",
  e2e_mode: "quick_regression",
  target,
  expected_revision: revision,
  design_ref: "architecture/design/current/DESIGN.md",
  design_version: 32,
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"],
  browser_channel: "chrome",
  headless: false,
  browser_visibility: "foreground",
  worker_count: 1,
  checks: [],
  skipped_or_not_run: [],
  errors: [],
  page_errors: [],
  console_errors: [],
  responses_500: [],
  screenshots: [],
  opened_tab_count: 0,
  closed_tab_count: 0,
  tab_cleanup_status: "pending",
  started_at: new Date().toISOString()
};

function check(name, pass, detail) {
  report.checks.push({ name, status: pass ? "passed" : "failed", detail });
}
function skipped(name, detail) { report.skipped_or_not_run.push({ name, detail }); }
function activate() {
  try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); }
  catch (error) { report.chrome_activation_error = String(error); }
}
async function front(page) { await page.bringToFront(); activate(); }
async function screenshot(page, name) {
  const file = path.join(out, name);
  await page.screenshot({ path: file, fullPage: false, animations: "disabled" });
  report.screenshots.push(file);
}
async function state(page) {
  return page.evaluate(async () => {
    const response = await fetch("./api/state-lite", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
}

(async () => {
  let browser, context, protoPage, page;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = browser.contexts()[0] || await browser.newContext({ viewport: { width: 1440, height: 900 } });
    report.preexisting_page_urls = context.pages().map((item) => item.url());
    report.preexisting_page_count = report.preexisting_page_urls.length;

    protoPage = await context.newPage(); report.opened_tab_count += 1;
    await front(protoPage);
    await protoPage.goto(prototype, { waitUntil: "load", timeout: 60000 });
    check("prototype v32 shell is directly usable over file://",
      await protoPage.getByTestId("app-shell").isVisible() &&
      await protoPage.getByTestId("settings-tab-signal").isVisible(),
      { url: protoPage.url() });
    await screenshot(protoPage, "prototype-v32-initial.png");

    page = await context.newPage(); report.opened_tab_count += 1;
    page.on("pageerror", (error) => report.page_errors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") report.console_errors.push(message.text()); });
    page.on("response", (response) => { if (response.status() >= 500) report.responses_500.push({ url: response.url(), status: response.status(), method: response.request().method() }); });
    await front(page);
    const main = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 });
    await page.waitForFunction(() => !document.querySelector("[data-testid='app-loading']:not([hidden])"), undefined, { timeout: 30000 }).catch(() => {});
    const status = await page.evaluate(async () => { const r = await fetch("./api/status", { cache: "no-store" }); return { status: r.status, body: await r.json() }; });
    check("availability and exact production revision", main && main.status() === 200 && status.status === 200 && status.body.ready === true && status.body.runtime_revision === revision, status);
    if (status.body.runtime_revision !== revision || !status.body.ready) throw new Error("target readiness/revision gate failed");

    const before = await state(page);
    report.initial_state = { state_revision: before.body.state_revision, signals: before.body.signals, displays: before.body.displays, layouts: before.body.layouts };
    const display = before.body.displays.find((item) => item.id === before.body.active_display_id) || before.body.displays[0];
    const layoutEntry = before.body.layouts.find((item) => item.display_id === display?.id);
    const pane = layoutEntry?.layout?.panes?.find((item) => item.id === layoutEntry.layout.active_pane_id) || layoutEntry?.layout?.panes?.[0];
    const mainSignal = (before.body.signals || []).find((signal) => signal.id === display?.selected_signal || signal.name === display?.analysis_signal) || null;
    report.preconditions = { display_id: display?.id || null, pane_id: pane?.id || null, plot_type: pane?.plot_type || null, main_signal: mainSignal?.name || null, bindings: pane?.signal_bindings || [] };

    // The operation dialog is inspect-only until its final submit button is used.
    const operation = page.getByTestId(`signal-operation-${(before.body.signals || [])[0]?.name || ""}`);
    if (await operation.count()) {
      await operation.click();
      const overwrite = page.locator("[data-signal-operation-overwrite]");
      const overwriteLabel = page.locator(".operation-overwrite-control");
      check("operation overwrite control exposes box and complete visible label",
        await overwrite.isVisible() && await overwriteLabel.isVisible() &&
        (await overwriteLabel.innerText()).trim() === "Затирать сигнал с таким именем",
        { label: await overwriteLabel.innerText() });
      await screenshot(page, "production-operation-overwrite.png");
      await page.getByRole("button", { name: "Отмена", exact: true }).click();
    } else skipped("operation overwrite control", "No signal row/action was present in the existing production session.");

    if (!mainSignal) {
      skipped("automatic samples / Values focus / editable sample rate / Jet picker", "The existing production session has no main_signal. E2E did not mutate a user workspace merely to create a binding.");
      skipped("spectrum extrema", "The existing production session has no bound signal; changing plot type would produce an untestable empty spectrum.");
    } else {
      const sampleTab = page.getByTestId("inspector-tab-samples");
      check("main-signal samples tab exists before Values action", await sampleTab.isVisible(), { label: await sampleTab.innerText() });
      const sampleRequest = page.waitForResponse((response) => /\/api\/signals\/[^/]+\/samples/.test(response.url()) && response.status() === 200, { timeout: 30000 });
      await sampleTab.click();
      const sampleResponse = await sampleRequest;
      const sampleData = await sampleResponse.json();
      const sampleRows = page.locator("[data-testid='inspector-pane-samples'] tbody tr");
      const headers = page.locator("[data-testid='inspector-pane-samples'] th");
      check("samples endpoint and five populated columns", sampleData && (sampleData.samples || sampleData.rows || []).length > 0 && await headers.count() === 5 && await sampleRows.count() > 0,
        { response: sampleData, headers: await headers.allTextContents(), row_count: await sampleRows.count() });
      const requestsBefore = report.responses_500.length;
      await page.getByTestId("settings-tab-signal").click();
      const rate = page.getByTestId("signal-sample-rate");
      const originalRate = await rate.inputValue();
      check("sample-rate field is visible and editable", await rate.isVisible() && !(await rate.isDisabled()), { originalRate });
      await rate.fill("1,5"); await rate.blur();
      const apply = page.getByTestId("settings-apply");
      check("comma sample rate is rejected without API persistence", await apply.isDisabled() && report.responses_500.length === requestsBefore,
        { disabled: await apply.isDisabled() });
      await rate.fill(originalRate); await rate.blur();
      const color = page.getByTestId("signal-color");
      await color.click();
      const picker = page.getByTestId("signal-color-picker");
      const pickerBox = await picker.boundingBox();
      const swatches = picker.locator("[data-color]");
      check("Jet picker geometry, HEX and fifteen swatches", await picker.isVisible() && Math.abs((pickerBox || {}).width - 284) <= 1 && await page.getByTestId("signal-color-picker-hex").isVisible() && await swatches.count() === 15,
        { width: pickerBox && pickerBox.width, swatches: await swatches.count(), palette: await swatches.evaluateAll((items) => items.map((item) => item.dataset.color)) });
      const originalColor = await page.getByTestId("signal-color-picker-hex").inputValue();
      await swatches.nth(0).click();
      await page.getByRole("button", { name: "Отмена", exact: true }).click();
      check("Jet picker Cancel restores draft", await color.getAttribute("value") === originalColor || await page.locator("[data-signal-color-input]").inputValue() === originalColor, { originalColor });
      await screenshot(page, "production-signal-settings.png");
    }
    await screenshot(page, "production-final.png");
    const after = await state(page);
    check("read-only regression left workspace state unchanged", JSON.stringify(after.body) === JSON.stringify(before.body), { before_revision: before.body.state_revision, after_revision: after.body.state_revision });
    check("no HTTP 500 or page errors", report.responses_500.length === 0 && report.page_errors.length === 0, { responses_500: report.responses_500, page_errors: report.page_errors, console_errors: report.console_errors });
  } catch (error) {
    report.errors.push(String(error && error.stack || error));
  } finally {
    for (const item of [page, protoPage]) {
      if (item && !item.isClosed()) { try { await item.close(); report.closed_tab_count += 1; } catch (error) { report.errors.push("tab cleanup: " + error); } }
    }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    report.finished_at = new Date().toISOString();
    report.planned = report.checks.length;
    report.passed = report.checks.filter((item) => item.status === "passed").length;
    report.failed = report.checks.filter((item) => item.status === "failed").length;
    report.success_rate = report.planned ? report.passed / report.planned * 100 : 0;
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    console.log(JSON.stringify({ planned: report.planned, passed: report.passed, failed: report.failed, skipped: report.skipped_or_not_run.length, errors: report.errors, cleanup: report.tab_cleanup_status }, null, 2));
    if (report.errors.length || report.failed) process.exitCode = 1;
  }
})();
