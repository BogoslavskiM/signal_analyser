"use strict";

// HND-0416 is deliberately a production-only, non-mutating quick baseline.
// It does not inspect the local design prototype or exercise Apply semantics.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const ID = "HND-0416";
const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const SHA = "bba7f2528abccf14dcdd313681c8fd8bf538d40c";
const OUT = path.join(__dirname, "artifacts", ID);

function check(report, name, pass, evidence) {
  report.checks.push({ name, pass: Boolean(pass), evidence });
}

function classify(report) {
  const executed = report.checks;
  report.planned = 6;
  report.passed = executed.filter((item) => item.pass).length;
  report.failed = executed.filter((item) => !item.pass).length;
  report.not_run = Math.max(0, report.planned - executed.length);
  report.success_rate_percent = Number((report.passed / report.planned * 100).toFixed(2));
  report.availability = Boolean(executed.find((item) => item.name === "availability-root" && item.pass) &&
    executed.find((item) => item.name === "readiness-exact-revision" && item.pass));
  report.operational = report.availability && report.success_rate_percent >= 75;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    id: ID, mode: "quick_regression", trigger_task: "TASK-0078", target: TARGET,
    expected_revision: SHA, applied_skills: ["e2e/e2e-workflow"], ui_impact: "none",
    browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
    started_at: new Date().toISOString(), checks: [], screenshots: [], page_errors: [],
    console_errors: [], responses_500: [], opened_tab_count: 0, closed_tab_count: 0,
    tab_cleanup_status: "pending", preexisting_pages: [],
  };
  let browser;
  let page;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    // Snapshot before this run creates its only page. This dedicated visible Chrome
    // context has no user tabs; any future pre-existing pages remain untouched.
    report.preexisting_pages = context.pages().map((item) => ({ url: item.url() }));
    try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); } catch (error) { report.chrome_activation_error = String(error); }
    page = await context.newPage(); report.opened_tab_count += 1;
    page.on("pageerror", (error) => report.page_errors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") report.console_errors.push(message.text()); });
    page.on("response", (response) => { if (response.status() === 500) report.responses_500.push({ url: response.url(), status: response.status() }); });
    await page.bringToFront();
    const root = await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.bringToFront();
    const bodyText = await page.locator("body").innerText({ timeout: 15000 });
    const maintenance = /технические работы|maintenance|temporarily unavailable/i.test(bodyText);
    report.root = { status: root && root.status(), url: page.url(), maintenance, observed_at: new Date().toISOString() };
    check(report, "availability-root", Boolean(root && root.status() === 200 && !maintenance), report.root);
    if (!root || root.status() !== 200 || maintenance) {
      const failureShot = path.join(OUT, "production-availability-failure-1440x900.png");
      await page.screenshot({ path: failureShot, fullPage: false }); report.screenshots.push(failureShot);
      throw new Error("Production availability failed; functional checks stopped.");
    }
    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible", timeout: 45000 });
    const status = await page.evaluate(async () => { const r = await fetch("./api/status", { headers: { Accept: "application/json" }, cache: "no-store" }); return { status: r.status, body: await r.json() }; });
    report.status = status;
    check(report, "readiness-exact-revision", status.status === 200 && status.body.ready === true && status.body.ok === true && status.body.runtime_revision === SHA, status);
    if (!(status.status === 200 && status.body.ready === true && status.body.ok === true && status.body.runtime_revision === SHA)) throw new Error("Exact runtime readiness/revision failed; functional checks stopped.");
    const stateLite = await page.evaluate(async () => { const r = await fetch("./api/state-lite", { headers: { Accept: "application/json" }, cache: "no-store" }); const text = await r.text(); let body; try { body = JSON.parse(text); } catch (_) { body = { raw: text.slice(0, 500) }; } return { status: r.status, body }; });
    report.state_lite = stateLite;
    check(report, "state-lite-startup", stateLite.status === 200 && Number.isInteger(stateLite.body.state_revision) && Array.isArray(stateLite.body.signals), { status: stateLite.status, state_revision: stateLite.body.state_revision, signal_count: Array.isArray(stateLite.body.signals) ? stateLite.body.signals.length : null });
    const identity = await page.evaluate(() => ({ title: document.title, shell: Boolean(document.querySelector('[data-testid="app-shell"]')), error: Boolean(document.querySelector('[data-testid="app-error"]')), maintenanceText: document.body.innerText.slice(0, 1000) }));
    report.page_identity = identity;
    check(report, "shell-no-maintenance-or-page-exception", identity.shell && !identity.error && !/техническ|maintenance/i.test(identity.maintenanceText) && report.page_errors.length === 0 && report.responses_500.length === 0, { identity, page_errors: report.page_errors, responses_500: report.responses_500 });
    const shot = path.join(OUT, "production-baseline-1440x900.png");
    await page.screenshot({ path: shot, fullPage: false }); report.screenshots.push(shot);
    const signals = Array.isArray(stateLite.body.signals) ? stateLite.body.signals : [];
    if (signals.length) {
      const mutations = [];
      const onRequest = (request) => { if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push({ method: request.method(), url: request.url() }); };
      page.on("request", onRequest);
      try {
        const measurements = page.locator('[data-testid="signal-panel-tab-measurements"]');
        const signalsTab = page.locator('[data-testid="signal-panel-tab-signals"]');
        await measurements.click();
        await page.locator('[data-testid="measurements-panel"]').waitFor({ state: "visible", timeout: 10000 });
        await signalsTab.click();
        await page.locator('[data-testid="bottom-panel-signals"]').waitFor({ state: "visible", timeout: 10000 });
        report.critical_workflow = { signal_count: signals.length, selected_signal: stateLite.body.row_selected_signal || null, mutations };
        check(report, "critical-existing-signal-measurements-tab-workflow", mutations.length === 0, report.critical_workflow);
      } finally { page.off("request", onRequest); }
    } else {
      report.critical_workflow = { status: "not_run", reason: "state-lite reported no existing signals; selected-signal workflow was unavailable without creating data." };
    }
    check(report, "no-console-error-or-http-500", report.console_errors.length === 0 && report.responses_500.length === 0, { console_errors: report.console_errors, responses_500: report.responses_500 });
  } catch (error) {
    report.run_error = String(error && error.stack || error);
  } finally {
    if (page && !page.isClosed()) {
      try { await page.close(); report.closed_tab_count += 1; } catch (error) { report.cleanup_error = String(error); }
    }
    report.tab_cleanup_status = report.closed_tab_count === report.opened_tab_count && !report.cleanup_error ? "passed" : "failed";
    if (browser) await browser.close();
    report.finished_at = new Date().toISOString();
    classify(report);
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exitCode = report.operational ? 0 : 1;
  }
})().catch((error) => { console.error(error); process.exit(1); });
