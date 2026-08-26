"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const HANDOFF_ID = "HND-0407";
const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const SHA = "bba7f2528abccf14dcdd313681c8fd8bf538d40c";
const PROTOTYPE = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0057-ui-overlay-refinement/prototype/index.html";
const ROOT = path.join(__dirname, "artifacts", HANDOFF_ID);
const VIEWS = [[1024, 768], [1440, 900]];

function check(report, name, pass, actual, expected) {
  report.checks.push({ name, pass: Boolean(pass), actual, expected });
}

function visibleNumericInputs(page) {
  return page.locator('input[type="number"]:not(:disabled)').evaluateAll((inputs) => inputs.filter((input) => {
    const rect = input.getBoundingClientRect();
    const style = getComputedStyle(input);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }).map((input) => ({
    testid: input.dataset.testid || null, value: input.value, min: input.min, max: input.max,
    step: input.step, aria: input.getAttribute("aria-label"), name: input.name || null,
  })));
}

async function saveShot(page, report, name) {
  const file = path.join(ROOT, name);
  await page.screenshot({ path: file, fullPage: false });
  report.screenshots.push(file);
}

async function probeDebounce(page, report) {
  const candidates = await visibleNumericInputs(page);
  report.debounce_probe.candidates = candidates;
  if (!candidates.length) {
    report.debounce_probe.status = "not_applicable";
    report.debounce_probe.reason = "No enabled visible numeric setting input was present; no signal was created.";
    return;
  }
  const input = page.locator('input[type="number"]:not(:disabled):visible').first();
  const original = await input.inputValue();
  const requests = [];
  const onRequest = (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) requests.push({ method: request.method(), url: request.url(), at: Date.now() });
  };
  page.on('request', onRequest);
  try {
    await input.focus();
    await input.press('ArrowUp');
    await input.press('ArrowUp');
    await input.press('ArrowUp');
    await page.waitForTimeout(320);
    const afterRapid = requests.slice();
    await input.fill(original);
    await page.waitForTimeout(320);
    const afterRestore = requests.slice();
    report.debounce_probe = {
      status: "executed", candidates, selected: candidates[0], original,
      final_value: await input.inputValue(), rapid_mutations: afterRapid,
      restore_mutations: afterRestore.slice(afterRapid.length),
      all_mutations: afterRestore,
      expected: "one trailing mutation after rapid valid edits and one restore mutation",
    };
    check(report, "debounce-reversible-numeric-probe", afterRapid.length === 1 && afterRestore.length - afterRapid.length === 1 && (await input.inputValue()) === original,
      report.debounce_probe, "1 rapid trailing mutation; 1 restore mutation; original value restored");
  } finally {
    page.off('request', onRequest);
  }
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const report = {
    id: HANDOFF_ID, mode: "quick_regression", target: TARGET, expected_revision: SHA,
    design_ref: "architecture/design/TASK-0057-ui-overlay-refinement/DESIGN.md", design_version: 2,
    applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"], browser_channel: "chrome",
    headless: false, browser_visibility: "foreground", worker_count: 1, started_at: new Date().toISOString(),
    checks: [], screenshots: [], page_errors: [], console_errors: [], network_500: [],
    prototype: [], debounce_probe: {}, opened_tab_count: 0, closed_tab_count: 0, tab_cleanup_status: "pending",
  };
  let browser;
  const created = [];
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_pages = context.pages().map((page) => ({ url: page.url() }));
    execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']);
    const prototype = await context.newPage(); created.push(prototype); report.opened_tab_count += 1;
    for (const [width, height] of VIEWS) {
      await prototype.setViewportSize({ width, height });
      await prototype.goto(PROTOTYPE, { waitUntil: "load", timeout: 30000 });
      await prototype.bringToFront();
      await prototype.waitForFunction(() => document.querySelectorAll('.js-plotly-plot').length >= 2, null, { timeout: 30000 });
      const observed = await prototype.evaluate(() => ({ shell: Boolean(document.querySelector('[data-design-id="app-shell"]')), plots: document.querySelectorAll('.js-plotly-plot').length, add: Boolean(document.querySelector('[data-design-id="display-add"]')), settings: Boolean(document.querySelector('[data-design-id="settings-tab-display"]')) }));
      report.prototype.push({ viewport: `${width}x${height}`, observed });
      await saveShot(prototype, report, `prototype-${width}x${height}.png`);
    }
    check(report, "prototype-design-contract-shell", report.prototype.every((item) => item.observed.shell && item.observed.plots >= 2 && item.observed.add && item.observed.settings), report.prototype, "v2 prototype shell at requested viewports");

    const page = await context.newPage(); created.push(page); report.opened_tab_count += 1;
    page.on('pageerror', (error) => report.page_errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') report.console_errors.push(message.text()); });
    page.on('response', (response) => { if (response.status() === 500) report.network_500.push({ url: response.url(), status: response.status() }); });
    const main = await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.bringToFront();
    report.main_document = { status: main && main.status(), url: page.url(), at: new Date().toISOString() };
    const status = await page.evaluate(() => fetch('./api/status', { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(async (response) => ({ status: response.status, body: await response.json() })));
    report.status = status;
    await page.locator('[data-testid="app-shell"]').waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForFunction(() => !document.querySelector('[data-testid="app-error"], .maintenance-screen, .technical-work'), null, { timeout: 1000 }).catch(() => {});
    const maintenance = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.slice(0, 1000), shell: Boolean(document.querySelector('[data-testid="app-shell"]')) }));
    report.page_identity = maintenance;
    check(report, "availability-root-status-exact-revision", main && main.status() === 200 && status.status === 200 && status.body.ready === true && status.body.ok === true && status.body.runtime_revision === SHA,
      { main: report.main_document, status }, `root 200; /api/status ready=true ok=true runtime_revision=${SHA}`);
    check(report, "no-maintenance-page-or-runtime-errors", maintenance.shell && !/техническ|maintenance|temporarily unavailable/i.test(maintenance.text) && report.page_errors.length === 0 && report.console_errors.length === 0 && report.network_500.length === 0,
      { maintenance, page_errors: report.page_errors, console_errors: report.console_errors, network_500: report.network_500 }, "application shell; no maintenance, page exception, console error, or HTTP 500");
    report.settings_asset = await page.evaluate(async () => {
      const source = Array.from(document.scripts).map((script) => script.src).find((src) => /public\/js\/settings\.js(?:$|\?)/.test(src) || /\/settings\.js(?:$|\?)/.test(src));
      if (!source) return { found: false };
      const response = await fetch(source, { cache: 'no-store' }); const text = await response.text();
      return { found: true, url: source, status: response.status, has150: /(?:150\s*(?:ms|\))|SETTINGS_DEBOUNCE_MS\s*=\s*150|setTimeout\([^,]+,\s*150\s*\))/.test(text), hasTrailing: /debounc|setTimeout/.test(text), snippet: (text.match(/.{0,100}(?:150|debounc).{0,180}/i) || [null])[0] };
    });
    check(report, "deployed-settings-asset-150ms-contract", report.settings_asset.found && report.settings_asset.status === 200 && report.settings_asset.has150 && report.settings_asset.hasTrailing, report.settings_asset, "deployed settings.js contains 150 ms debounce contract");
    for (const [width, height] of VIEWS) {
      await page.setViewportSize({ width, height }); await page.bringToFront();
      await page.locator('[data-testid="app-shell"]').waitFor({ state: 'visible', timeout: 15000 });
      const shell = await page.evaluate(() => { const el = document.querySelector('[data-testid="app-shell"]'); const r = el && el.getBoundingClientRect(); return { viewport: `${innerWidth}x${innerHeight}`, shell: r && { width:r.width, height:r.height, right:r.right, bottom:r.bottom }, text: document.body.innerText.length, scroll: { width:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight } }; });
      report[`shell_${width}x${height}`] = shell;
      check(report, `usable-shell-${width}x${height}`, Boolean(shell.shell && shell.shell.width > 0 && shell.shell.height > 0 && shell.text > 0), shell, "visible usable full-page shell");
      await saveShot(page, report, `production-${width}x${height}.png`);
    }
    await page.bringToFront();
    report.plotly = await page.locator('[data-testid="active-plot-host"]').evaluate((host) => ({ exists: true, plotReady: host.dataset.plotReady, fullLayout: Boolean(host._fullLayout), fullData: Boolean(host._fullData), mainSvg: Boolean(host.querySelector('svg.main-svg')) })).catch(() => ({ exists: false }));
    check(report, "active-plotly-status", !report.plotly.exists || (report.plotly.fullLayout && report.plotly.mainSvg), report.plotly, "if active graph exists, it is a live Plotly host");
    await probeDebounce(page, report);
  } catch (error) {
    report.fatal_error = String(error && error.stack || error);
  } finally {
    for (const page of created.reverse()) {
      try { if (!page.isClosed()) { await page.close(); report.closed_tab_count += 1; } } catch (error) { report.cleanup_error = String(error); }
    }
    report.tab_cleanup_status = report.closed_tab_count === report.opened_tab_count && !report.cleanup_error ? "passed" : "failed";
    report.finished_at = new Date().toISOString();
    report.planned = report.checks.length;
    report.passed = report.checks.filter((item) => item.pass).length;
    report.failed = report.checks.filter((item) => !item.pass).length;
    report.not_run = report.fatal_error ? 1 : 0;
    report.success_rate = report.planned ? (report.passed / report.planned) * 100 : 0;
    fs.writeFileSync(path.join(ROOT, 'report.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    process.stdout.write(JSON.stringify(report, null, 2));
    process.exitCode = report.fatal_error || report.failed ? 1 : 0;
  }
})().catch((error) => { console.error(error); process.exit(1); });
