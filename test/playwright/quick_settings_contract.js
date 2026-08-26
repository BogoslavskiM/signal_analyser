"use strict";

// HND-0236: production-only post-task quick regression for the current
// three-page settings baseline. No not-yet-implemented ownership movement is asserted.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const REVISION = "cac83c5f445352a50f04aeeeb269b47007766d79";
const OUT = path.join("/private/tmp", "HND-0236-e2e-quick-" + new Date().toISOString().replace(/[:.]/g, "-"));
const TIMEOUT = 60000;
const q = id => `[data-testid=${JSON.stringify(id)}]`;

async function state(page) {
  return page.evaluate(async () => {
    const response = await fetch("api/state", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    handoff: "HND-0236", mode: "quick_regression", target: TARGET, expected_revision: REVISION,
    browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
    viewport: { width: 1440, height: 900 }, planned: 6, checks: [], screenshots: [], posts: [], errors: [],
  };
  let browser;
  let page;
  let originalTab;
  const check = (name, passed, evidence) => report.checks.push({ name, passed: Boolean(passed), evidence });
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 1 });
    page = await context.newPage();
    page.on("request", request => {
      if (request.method() === "POST" && /\/api\//.test(new URL(request.url()).pathname)) {
        report.posts.push({ method: request.method(), pathname: new URL(request.url()).pathname, bytes: Buffer.byteLength(request.postData() || "") });
      }
    });
    page.on("pageerror", error => report.errors.push({ type: "pageerror", message: error.message }));
    page.on("console", message => { if (message.type() === "error") report.errors.push({ type: "console", message: message.text() }); });
    report.navigation_attempts = [];
    await page.bringToFront();
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const started = performance.now();
      try {
        await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
        report.navigation_attempts.push({ attempt, elapsed_ms: Math.round(performance.now() - started), outcome: "domcontentloaded" });
        break;
      } catch (error) {
        report.navigation_attempts.push({ attempt, elapsed_ms: Math.round(performance.now() - started), outcome: String(error.message || error) });
        if (attempt === 2) throw error;
      }
    }
    await page.bringToFront();
    await page.locator(q("app-shell")).waitFor({ state: "visible", timeout: TIMEOUT });
    await page.locator(q("active-plot-host") + '[data-plot-ready="true"]').waitFor({ state: "visible", timeout: TIMEOUT });
    check("availability", true, { shell: "visible", plot_ready: true, url: page.url() });
    const status = await page.evaluate(async expected => {
      const response = await fetch(`api/status?e2e_quick=${Date.now().toString(36)}`, { cache: "no-store" });
      return { status: response.status, cache_control: response.headers.get("cache-control"), body: await response.json(), expected };
    }, REVISION);
    report.status = status;
    check("exact_runtime_revision", status.status === 200 && status.body.runtime_revision === REVISION && status.body.ready === true && status.body.ok === true, status);
    if (!report.checks[1].passed) throw new Error(`exact runtime revision unavailable: ${JSON.stringify(status)}`);

    const before = await state(page);
    report.state_before = { status: before.status, revision: before.body.state_revision, json: JSON.stringify(before.body) };
    originalTab = await page.locator("[data-settings-tab][aria-selected='true']").getAttribute("data-testid");
    const scenarios = [
      { name: "display_page_baseline", tab: "display-settings-tab", panel: "[data-settings-panel='display']", controls: [q("settings-view-select"), q("settings-catalog-panel")] },
      { name: "time_page_baseline", tab: "time-settings-tab", panel: "[data-settings-panel='time']", controls: [q("normalize-y-checkbox"), q("show-markers-checkbox"), q("time-min-input"), q("time-max-input")] },
      { name: "measurements_page_baseline", tab: "statistics-settings-tab", panel: "[data-settings-panel='measurements']", controls: [q("statistics-controls")] },
    ];
    for (const scenario of scenarios) {
      await page.bringToFront();
      const tab = page.locator(q(scenario.tab));
      await tab.click();
      await page.waitForFunction(args => {
        const tabNode = document.querySelector(args.tab);
        const panel = document.querySelector(args.panel);
        return tabNode && tabNode.getAttribute("aria-selected") === "true" && panel && !panel.hidden;
      }, { tab: q(scenario.tab), panel: scenario.panel }, { timeout: TIMEOUT });
      const evidence = await page.evaluate(args => ({
        tab_text: document.querySelector(args.tab).textContent.trim(),
        selected: document.querySelector(args.tab).getAttribute("aria-selected"),
        panel_visible: !document.querySelector(args.panel).hidden,
        controls: args.controls.map(selector => {
          const node = document.querySelector(selector);
          const style = node && getComputedStyle(node);
          return { selector, exists: Boolean(node), visible: Boolean(node && !node.hidden && style.display !== "none" && style.visibility !== "hidden") };
        }),
      }), { tab: q(scenario.tab), panel: scenario.panel, controls: scenario.controls });
      const passed = evidence.selected === "true" && evidence.panel_visible && evidence.controls.every(item => item.exists && item.visible);
      check(scenario.name, passed, evidence);
      const screenshot = path.join(OUT, `${scenario.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      report.screenshots.push({ scenario: scenario.name, path: screenshot, viewport: report.viewport });
    }
    if (originalTab) {
      await page.bringToFront();
      await page.locator(q(originalTab)).click();
      await page.waitForFunction(selector => document.querySelector(selector).getAttribute("aria-selected") === "true", q(originalTab), { timeout: TIMEOUT });
    }
    const after = await state(page);
    report.state_after = { status: after.status, revision: after.body.state_revision, json: JSON.stringify(after.body) };
    const unchanged = before.status === 200 && after.status === 200 && before.body.state_revision === after.body.state_revision &&
      report.state_before.json === report.state_after.json && report.posts.length === 0;
    check("api_session_unchanged", unchanged, {
      before_status: before.status, after_status: after.status,
      before_revision: before.body.state_revision, after_revision: after.body.state_revision,
      exact_state_equal: report.state_before.json === report.state_after.json, post_requests: report.posts,
      restored_tab: originalTab,
    });
    delete report.state_before.json;
    delete report.state_after.json;
  } catch (error) {
    report.failure = String(error && error.stack || error);
    if (!report.checks.some(item => item.name === "availability")) check("availability", false, { error: String(error.message || error), url: page && page.url() });
    if (page) {
      const screenshot = path.join(OUT, "failure.png");
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
      report.screenshots.push({ scenario: "failure", path: screenshot, viewport: report.viewport });
    }
  } finally {
    report.passed = report.checks.filter(item => item.passed).length;
    report.failed = report.checks.filter(item => !item.passed).length;
    report.not_run = report.planned - report.checks.length;
    report.success_rate_percent = report.passed / report.planned * 100;
    report.operational = report.checks.some(item => item.name === "availability" && item.passed) && report.success_rate_percent >= 75;
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
  }
  console.log(JSON.stringify({ evidence_path: OUT, planned: report.planned, passed: report.passed, failed: report.failed,
    not_run: report.not_run, success_rate_percent: report.success_rate_percent, operational: report.operational, failure: report.failure || null }, null, 2));
  if (!report.operational) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
