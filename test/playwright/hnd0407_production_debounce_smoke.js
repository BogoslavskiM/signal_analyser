"use strict";

// HND-0407: bounded, visible, production-only smoke.  This file owns only
// evidence generated under test/playwright/artifacts/HND-0407.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const SHA = "bba7f2528abccf14dcdd313681c8fd8bf538d40c";
const OUT = path.join(__dirname, "artifacts", "HND-0407");
const VIEWS = [[1024, 768], [1440, 900]];
const TIMEOUT = 45000;

const visible = node => node && !node.disabled && !node.hidden && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;

function add(report, name, pass, actual, expected) { report.checks.push({ name, pass: Boolean(pass), actual, expected }); }

async function ready(page) {
  await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible", timeout: TIMEOUT });
  await page.waitForFunction(() => !document.querySelector('[data-testid="app-loading"]') || document.querySelector('[data-testid="app-loading"]').hidden || getComputedStyle(document.querySelector('[data-testid="app-loading"]')).display === "none", null, { timeout: TIMEOUT });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

async function shell(page) {
  return page.evaluate(() => {
    const box = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
    const viewport = { width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, scrollHeight:document.documentElement.scrollHeight };
    const zones = { shell:box('[data-testid="app-shell"]'), toolbar:box('.app-toolbar'), workspace:box('[data-testid="display-workspace"]'), settings:box('[data-testid="display-settings"]'), inspector:box('.bottom-zone') };
    const usable = Object.values(zones).every(Boolean) && Object.values(zones).every(r => r.width > 0 && r.height > 0 && r.x >= -.5 && r.y >= -.5 && r.right <= viewport.width + .5 && r.bottom <= viewport.height + .5);
    return { viewport, zones, usable };
  });
}

async function settingsAsset(page) {
  return page.evaluate(async () => {
    const candidates = Array.from(document.scripts).map(s => s.src).filter(src => /\/settings\.js(?:\?|$)/.test(src));
    const url = candidates[0] || new URL("js/settings.js", location.href).href;
    const response = await fetch(url, { cache:"no-store" });
    const text = await response.text();
    return { url, status:response.status, contract: /var SETTINGS_DEBOUNCE_MS = 150;/.test(text) && /window\.setTimeout\([\s\S]{0,500}?SETTINGS_DEBOUNCE_MS/.test(text) && /cancelScheduled\(item, field\.id\)/.test(text) };
  });
}

async function debounceProbe(page, report) {
  const candidate = await page.evaluate(() => Array.from(document.querySelectorAll('input[data-setting-field][inputmode="decimal"]')).map(node => ({
    field:node.dataset.settingField, value:node.value, disabled:node.disabled, visible:!node.hidden && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0, kind:node.closest('[data-field-kind]') && node.closest('[data-field-kind]').dataset.fieldKind
  })).find(item => item.visible && !item.disabled && item.kind !== "optional_range" && item.kind !== "resolution" && item.kind !== "power_bins" && item.value.trim() !== "" && Number.isFinite(Number(item.value))));
  if (!candidate) { add(report, "continuous-input-debounce-probe", true, { status:"not_applicable", reason:"No enabled scalar numeric setting without creating a signal." }, "probe only when an enabled numeric setting exists"); return; }
  const selector = `input[data-setting-field=${JSON.stringify(candidate.field)}]`;
  const input = page.locator(selector).first();
  const original = candidate.value;
  const originalNumber = Number(original);
  const delta = Math.abs(originalNumber) >= 1 ? 1 : 0.1;
  const changed = String(originalNumber + delta);
  const requests = [];
  const onRequest = request => { const u = new URL(request.url()); if (request.method() !== "GET" && /\/api\/settings$/.test(u.pathname)) requests.push({ method:request.method(), url:request.url(), postData:request.postData() }); };
  page.on("request", onRequest);
  try {
    await page.bringToFront();
    const trailingWait = page.waitForRequest(request => request.method() !== "GET" && /\/api\/settings$/.test(new URL(request.url()).pathname), { timeout:3000 });
    await input.click();
    await input.fill(String(originalNumber + delta / 3));
    await input.fill(String(originalNumber + 2 * delta / 3));
    await input.fill(changed);
    await trailingWait;
    const trailing = requests.splice(0);
    const restoreWait = page.waitForRequest(request => request.method() !== "GET" && /\/api\/settings$/.test(new URL(request.url()).pathname), { timeout:3000 });
    await input.fill(original);
    await restoreWait;
    const restored = requests.splice(0);
    const current = await input.inputValue();
    const pass = trailing.length === 1 && restored.length === 1 && current === original;
    add(report, "continuous-input-debounce-probe", pass, { status:"executed", field:candidate.field, original, changed, trailing_mutations:trailing, restore_mutations:restored, restored_value:current }, "one trailing /api/settings mutation, then exactly one restore mutation and original value");
  } finally { page.off("request", onRequest); }
}

(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const report = { id:"HND-0407", type:"report", mode:"quick_regression", target:TARGET, expected_revision:SHA, applied_skills:["e2e/e2e-workflow", "e2e/visual-analysis"], browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1, started_at:new Date().toISOString(), preexisting_page_count:0, opened_tab_count:0, closed_tab_count:0, tab_cleanup_status:"pending", checks:[], responses_500:[], page_errors:[], console_errors:[], screenshots:[] };
  let browser; const pages = [];
  try {
    browser = await chromium.launch({ channel:"chrome", headless:false });
    execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']);
    const context = await browser.newContext();
    report.preexisting_page_count = context.pages().length;
    const page = await context.newPage(); pages.push(page); report.opened_tab_count += 1;
    page.on("pageerror", error => report.page_errors.push(String(error)));
    page.on("console", msg => { if (msg.type() === "error") report.console_errors.push(msg.text()); });
    page.on("response", response => { if (response.status() === 500) report.responses_500.push({ url:response.url(), status:response.status() }); });
    await page.bringToFront();
    const root = await page.goto(TARGET, { waitUntil:"commit", timeout:TIMEOUT });
    await page.bringToFront();
    const body = await page.locator("body").innerText();
    const maintenance = /технические работы|maintenance|under maintenance/i.test(body);
    report.main_document = { url:page.url(), status:root && root.status(), timestamp:new Date().toISOString(), maintenance };
    if (maintenance) throw new Error("maintenance screen visible");
    await ready(page);
    report.status = await page.evaluate(() => fetch("./api/status", { cache:"no-store", headers:{Accept:"application/json"} }).then(async r => ({ status:r.status, body:await r.json() })));
    add(report, "availability-root-status-revision", root && root.status() === 200 && report.status.status === 200 && report.status.body.ready === true && report.status.body.ok === true && report.status.body.runtime_revision === SHA, { root:report.main_document, status:report.status }, "root 200; /api/status 200 ready=true ok=true exact SHA");
    const asset = await settingsAsset(page); report.settings_asset = asset;
    add(report, "deployed-settings-js-150ms-contract", asset.status === 200 && asset.contract, asset, "deployed settings.js exact 150 ms debounce schedule/cancel contract");
    for (const [width, height] of VIEWS) {
      await page.setViewportSize({ width, height }); await page.bringToFront(); await ready(page);
      const evidence = await shell(page); const file = path.join(OUT, `production-shell-${width}x${height}.png`);
      await page.screenshot({ path:file, fullPage:false }); report.screenshots.push({ path:file, viewport:`${width}x${height}`, state:"ready-shell" });
      add(report, `usable-shell-${width}x${height}`, evidence.usable, evidence, "visible full-page shell with all stable zones reachable in viewport");
    }
    await debounceProbe(page, report);
    add(report, "no-maintenance-http500-or-pageerror", !report.main_document.maintenance && report.responses_500.length === 0 && report.page_errors.length === 0, { maintenance:report.main_document.maintenance, responses_500:report.responses_500, page_errors:report.page_errors, console_errors:report.console_errors }, "no maintenance, HTTP 500, or uncaught page error");
  } catch (error) {
    report.run_error = String(error && error.stack || error);
    if (!report.checks.some(c => c.name === "availability-root-status-revision")) add(report, "availability-root-status-revision", false, { error:report.run_error, main_document:report.main_document || null }, "root/status/exact revision");
    const page = pages[0]; if (page && !page.isClosed()) { const file = path.join(OUT, "failure.png"); await page.screenshot({ path:file, fullPage:true }).catch(() => {}); report.screenshots.push({ path:file, state:"failure" }); }
  } finally {
    for (const page of pages.slice().reverse()) try { if (!page.isClosed()) { await page.close(); report.closed_tab_count += 1; } } catch (error) { report.cleanup_error = String(error); }
    report.tab_cleanup_status = report.closed_tab_count === report.opened_tab_count && !report.cleanup_error ? "pass" : "fail";
    if (browser) await browser.close().catch(error => { report.browser_close_error = String(error); });
    report.planned = 6; report.passed = report.checks.filter(c => c.pass).length; report.failed = report.checks.filter(c => !c.pass).length; report.not_run = Math.max(0, report.planned - report.checks.length); report.success_rate_percent = report.planned ? report.passed / report.planned * 100 : 0;
    report.operational = report.checks.some(c => c.name === "availability-root-status-revision" && c.pass) && report.success_rate_percent >= 75 && report.tab_cleanup_status === "pass";
    report.completed_at = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify({ evidence:OUT, planned:report.planned, passed:report.passed, failed:report.failed, not_run:report.not_run, success_rate_percent:report.success_rate_percent, operational:report.operational, tab_cleanup_status:report.tab_cleanup_status, run_error:report.run_error || null }, null, 2));
  }
  if (!report.operational) process.exitCode = 1;
})().catch(error => { console.error(error.stack || error); process.exit(1); });
