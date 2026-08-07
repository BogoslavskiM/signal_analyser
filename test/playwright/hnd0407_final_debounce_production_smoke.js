"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ID = "HND-0407";
const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const SHA = "bba7f2528abccf14dcdd313681c8fd8bf538d40c";
const PROTOTYPE = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0057-ui-overlay-refinement/prototype/index.html";
const OUT = path.join(__dirname, "artifacts", ID);
const VIEWS = [[1024, 768], [1440, 900]];

function check(report, name, pass, evidence) { report.checks.push({ name, pass: Boolean(pass), evidence }); }
function visibleBox(node) { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0; }

async function jsonStatus(page) {
  return page.evaluate(async () => {
    const response = await fetch("./api/status", { headers: { Accept: "application/json" }, cache: "no-store" });
    const text = await response.text();
    let body; try { body = JSON.parse(text); } catch (_error) { body = { raw: text.slice(0, 1000) }; }
    return { status: response.status, url: response.url, body };
  });
}

async function shell(page, report, width, height) {
  await page.setViewportSize({ width, height });
  await page.bringToFront();
  await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible", timeout: 45000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const evidence = await page.evaluate(() => {
    const ids = ["app-shell", "display-workspace", "display-settings", "bottom-panel-signals"];
    const nodes = Object.fromEntries(ids.map((id) => {
      const node = document.querySelector(`[data-testid="${id}"]`);
      if (!node) return [id, null];
      const r = node.getBoundingClientRect();
      return [id, { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height, visible: r.width > 0 && r.height > 0 }];
    }));
    return { viewport:{ width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, scrollHeight:document.documentElement.scrollHeight }, nodes };
  });
  const usable = Object.values(evidence.nodes).every((entry) => entry && entry.visible && entry.right <= width + 1 && entry.bottom <= height + 1) && evidence.viewport.scrollWidth <= width + 1;
  const screenshot = path.join(OUT, `production-shell-${width}x${height}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  report.screenshots.push({ kind:"production-shell", viewport:`${width}x${height}`, path:screenshot });
  check(report, `usable-shell-${width}x${height}`, usable, evidence);
}

async function prototypeShell(page, report, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(PROTOTYPE, { waitUntil: "load", timeout: 30000 });
  await page.bringToFront();
  await page.locator('[data-design-id="app-shell"]').waitFor({ state: "visible", timeout: 30000 });
  const screenshot = path.join(OUT, `prototype-shell-${width}x${height}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  report.screenshots.push({ kind:"prototype-shell", viewport:`${width}x${height}`, path:screenshot });
  const evidence = await page.evaluate(() => ({ shell: !!document.querySelector('[data-design-id="app-shell"]'), add: !!document.querySelector('[data-design-id="display-add"]'), settings: !!document.querySelector('[data-design-id="settings-tab-display"]') }));
  check(report, `prototype-contract-shell-${width}x${height}`, Object.values(evidence).every(Boolean), evidence);
}

async function debounceProbe(page, report) {
  const input = page.locator('input[data-setting-field][inputmode="decimal"]:not([disabled])').filter({ has: page.locator(':scope') }).first();
  const count = await input.count();
  if (!count) { report.probe = { applicable:false, reason:"No enabled numeric settings input exposed by production." }; check(report, "continuous-input-debounce", true, report.probe); return; }
  const metadata = await input.evaluate((node) => { const r = node.getBoundingClientRect(); return { value:node.value, field:node.dataset.settingField, disabled:node.disabled, visible:r.width > 0 && r.height > 0, type:node.type, inputmode:node.inputMode }; });
  if (!metadata.visible || !metadata.value.trim() || !Number.isFinite(Number(metadata.value))) { report.probe = { applicable:false, reason:"The first enabled numeric input has no finite reversible value.", metadata }; check(report, "continuous-input-debounce", true, report.probe); return; }
  const original = metadata.value;
  const base = Number(original);
  const candidates = [String(base + 1), String(base + 2), String(base + 3)];
  const mutations = [];
  const onRequest = (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/api/settings") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) mutations.push({ time:Date.now(), method:request.method(), url:request.url(), payload:request.postData() });
  };
  page.on("request", onRequest);
  try {
    const isFieldMutation = (request) => {
      const url = new URL(request.url());
      return url.pathname.endsWith("/api/settings") && !["GET", "HEAD", "OPTIONS"].includes(request.method()) && (request.postData() || "").includes(metadata.field);
    };
    await page.bringToFront();
    await input.focus();
    const editRequest = page.waitForRequest(isFieldMutation, { timeout:1500 });
    for (const value of candidates) await input.fill(value);
    await editRequest;
    const afterEdit = mutations.filter((item) => item.payload && item.payload.includes(metadata.field));
    const committed = await input.inputValue().catch(() => "");
    const restoreRequest = page.waitForRequest(isFieldMutation, { timeout:1500 });
    await input.fill(original);
    await restoreRequest;
    const fieldMutations = mutations.filter((item) => item.payload && item.payload.includes(metadata.field));
    const editCount = afterEdit.length;
    const restoreCount = fieldMutations.length - editCount;
    report.probe = { applicable:true, metadata, original, candidates, committed, mutations:fieldMutations, edit_mutations:editCount, restore_mutations:restoreCount, restored_value:await input.inputValue().catch(() => "") };
    check(report, "continuous-input-debounce", editCount === 1 && restoreCount === 1 && report.probe.restored_value === original, report.probe);
  } finally { page.off("request", onRequest); }
}

(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const report = { id:ID, mode:"quick_regression", target:TARGET, expected_revision:SHA, design_ref:"architecture/design/TASK-0057-ui-overlay-refinement/DESIGN.md", design_version:2, applied_skills:["e2e/e2e-workflow", "e2e/visual-analysis"], browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1, started_at:new Date().toISOString(), planned:8, checks:[], page_errors:[], console_errors:[], responses_500:[], screenshots:[], opened_tab_count:0, closed_tab_count:0, tab_cleanup_status:"pending" };
  let browser; let context; const tracked = [];
  try {
    browser = await chromium.launch({ channel:"chrome", headless:false });
    context = await browser.newContext({ viewport:{ width:1440, height:900 }, deviceScaleFactor:1 });
    report.preexisting_page_count = context.pages().length;
    const prototype = await context.newPage(); tracked.push(prototype); report.opened_tab_count += 1;
    for (const [width, height] of VIEWS) await prototypeShell(prototype, report, width, height);
    const page = await context.newPage(); tracked.push(page); report.opened_tab_count += 1;
    page.on("pageerror", (error) => report.page_errors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") report.console_errors.push(message.text()); });
    page.on("response", (response) => { if (response.status() === 500) report.responses_500.push({ url:response.url(), status:response.status() }); });
    await page.bringToFront();
    const root = await page.goto(TARGET, { waitUntil:"domcontentloaded", timeout:45000 });
    await page.bringToFront();
    const text = await page.locator("body").innerText({ timeout:10000 });
    const maintenance = /технические работы|maintenance|under maintenance/i.test(text);
    report.root = { status:root && root.status(), url:page.url(), maintenance, observed_at:new Date().toISOString() };
    check(report, "availability-root", Boolean(root && root.status() === 200 && !maintenance), report.root);
    check(report, "no-maintenance-screen", !maintenance, { title:await page.title(), app_shell:await page.locator('[data-testid="app-shell"]').count() > 0 });
    if (!root || root.status() !== 200 || maintenance) throw new Error("Production availability failed; functional checks stopped.");
    await page.locator('[data-testid="app-shell"]').waitFor({ state:"visible", timeout:45000 });
    const status = await jsonStatus(page); report.status = status;
    check(report, "readiness-exact-revision", status.status === 200 && status.body.ready === true && status.body.ok === true && status.body.runtime_revision === SHA, status);
    if (!(status.status === 200 && status.body.ready === true && status.body.ok === true && status.body.runtime_revision === SHA)) throw new Error("Exact runtime readiness/revision failed; functional checks stopped.");
    const asset = await page.evaluate(async () => { const loaded = performance.getEntriesByType("resource").map((entry) => entry.name).filter((url) => /\/settings\.js(?:[?#]|$)/.test(url)); const url = loaded[loaded.length - 1]; if (!url) return { status:null, url:null, loaded, debounce150:false, scheduled:false }; const response = await fetch(url, { cache:"no-store" }); const text = await response.text(); return { status:response.status, url:response.url, loaded, debounce150:text.includes("SETTINGS_DEBOUNCE_MS = 150"), scheduled:text.includes("window.setTimeout") && text.includes("SETTINGS_DEBOUNCE_MS") }; });
    report.asset = asset; check(report, "deployed-settings-150ms-contract", asset.status === 200 && asset.debounce150 && asset.scheduled, asset);
    for (const [width, height] of VIEWS) await shell(page, report, width, height);
    await debounceProbe(page, report);
    check(report, "no-page-exception-or-http-500", report.page_errors.length === 0 && report.responses_500.length === 0, { page_errors:report.page_errors, responses_500:report.responses_500 });
  } catch (error) {
    report.run_error = String(error && error.stack || error);
  } finally {
    for (const page of tracked) { if (!page.isClosed()) { try { await page.close(); report.closed_tab_count += 1; } catch (error) { report.cleanup_errors = (report.cleanup_errors || []).concat(String(error)); } } }
    report.tab_cleanup_status = report.closed_tab_count === report.opened_tab_count && !(report.cleanup_errors || []).length ? "passed" : "failed";
    if (browser) await browser.close();
    report.finished_at = new Date().toISOString();
    const countedChecks = report.checks.filter((item) => !item.name.startsWith("prototype-contract-"));
    report.passed = countedChecks.filter((item) => item.pass).length;
    report.failed = countedChecks.filter((item) => !item.pass).length + (report.run_error ? 1 : 0);
    report.not_run = Math.max(0, report.planned - countedChecks.length);
    report.success_rate_percent = Math.round(report.passed / report.planned * 10000) / 100;
    report.availability = Boolean(report.checks.find((item) => item.name === "availability-root" && item.pass) && report.checks.find((item) => item.name === "readiness-exact-revision" && item.pass));
    report.operational = report.availability && report.success_rate_percent >= 75;
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exitCode = report.operational ? 0 : 1;
  }
})();
