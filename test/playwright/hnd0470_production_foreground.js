"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const ID = "HND-0470";
const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const PROTOTYPE = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html";
const OUT = path.join(__dirname, "artifacts", ID);
const report = { id: ID, type: "report", mode: "quick_regression", target: TARGET, expected_revision: "not supplied", runtime_revision_attestation: "unavailable", design_ref: "architecture/design/TASK-0080-explicit-apply-flow/DESIGN.md", design_version: 1, applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"], browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1, started_at: new Date().toISOString(), checks: [], screenshots: [], console_errors: [], page_errors: [], responses_500: [], opened_tab_count: 0, closed_tab_count: 0, tab_cleanup_status: "pending" };
function check(name, pass, evidence) { report.checks.push({ name, pass: Boolean(pass), evidence }); }
async function shot(page, name) { const file = path.join(OUT, name); await page.screenshot({ path: file, fullPage: false }); report.screenshots.push(file); }
function isMaintenance(text) { return /технические работы|maintenance|temporarily unavailable|internal server error/i.test(text || ""); }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let browser; const created = [];
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = browser.contexts()[0] || await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    report.preexisting_pages = context.pages().map(p => ({ url: p.url() }));
    try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); } catch (e) { report.chrome_activation_error = String(e); }
    const prototype = await context.newPage(); created.push(prototype); report.opened_tab_count++;
    await prototype.setViewportSize({ width: 1024, height: 768 }); await prototype.goto(PROTOTYPE, { waitUntil: "load", timeout: 30000 }); await prototype.bringToFront();
    await prototype.locator('[data-design-id="app-shell"]').waitFor({ state: "visible", timeout: 20000 });
    const apply = prototype.locator('[data-design-id="settings-apply"]'); await apply.focus();
    const timeTab = prototype.locator('[data-design-id="settings-tab-time"]'); if (await timeTab.count()) await timeTab.click();
    const input = prototype.locator('[data-design-id="settings-field-time.x_limits"] input').first();
    if (await input.count()) { await input.fill("abc"); await input.blur(); }
    await shot(prototype, "prototype-invalid-1024x768.png");
    report.prototype = await prototype.evaluate(() => ({ shell: !!document.querySelector('[data-design-id="app-shell"]'), plots: document.querySelectorAll('.js-plotly-plot').length, applyDisabled: document.querySelector('[data-design-id="settings-apply"]')?.disabled, invalid: document.body.innerText.includes("Исправьте") }));
    check("prototype-design-contract-inspected", report.prototype.shell && report.prototype.plots >= 2, report.prototype);

    const page = await context.newPage(); created.push(page); report.opened_tab_count++;
    page.on("pageerror", e => report.page_errors.push(String(e)));
    page.on("console", m => { if (m.type() === "error") report.console_errors.push(m.text()); });
    page.on("response", r => { if (r.status() >= 500) report.responses_500.push({ url: r.url(), status: r.status() }); });
    await page.bringToFront();
    const root = await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.bringToFront();
    const text = await page.locator("body").innerText({ timeout: 20000 }).catch(() => "");
    report.root = { status: root && root.status(), url: page.url(), observed_at: new Date().toISOString(), maintenance: isMaintenance(text), body_excerpt: text.slice(0, 900) };
    await shot(page, "production-root-1440x900.png");
    check("availability-root", !!root && root.status() === 200 && !report.root.maintenance, report.root);
    if (!root || root.status() !== 200 || report.root.maintenance) throw new Error("Production availability failed; functional scenarios stopped.");
    report.status = await page.evaluate(async () => { const r = await fetch("./api/status", { headers: { Accept: "application/json" }, cache: "no-store" }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch (_) { b = { raw: t.slice(0, 500) }; } return { status: r.status, body: b }; }).catch(e => ({ error: String(e) }));
    report.runtime_revision_attestation = report.status.body && report.status.body.runtime_revision || "unavailable";
    check("api-status-readiness", report.status.status === 200 && report.status.body?.ready === true && report.status.body?.ok === true, report.status);
    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible", timeout: 45000 }); await page.bringToFront();
    report.shell = await page.evaluate(() => ({ shell: !!document.querySelector('[data-testid="app-shell"]'), vue: !!document.querySelector('[data-testid="app-shell"]')?.__vueParentComponent, title: document.title, apply: !!document.querySelector('[data-testid="settings-apply"]'), plots: document.querySelectorAll('[data-testid^="plot-pane-"]').length, appError: !!document.querySelector('[data-testid="app-error"]') }));
    check("vue-shell-bootstrap", report.shell.shell && report.shell.vue && !report.shell.appError, report.shell);
    await shot(page, "production-shell-1440x900.png");
    const state = await page.evaluate(async () => { const r = await fetch("./api/state-lite", { headers: { Accept: "application/json" }, cache: "no-store" }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch (_) { b = { raw: t.slice(0, 500) }; } return { status: r.status, body: b }; }).catch(e => ({ error: String(e) })); report.state_lite = state;
    const settings = page.locator('[data-testid^="settings-"][data-testid$="-field"] input:not(:disabled)').first();
    const applyButton = page.locator('[data-testid="settings-apply"]');
    if (await settings.count() && await applyButton.count()) {
      const before = await page.evaluate(() => ({ applyDisabled: document.querySelector('[data-testid="settings-apply"]')?.disabled, busy: document.querySelector('[data-testid="app-shell"]')?.dataset.applyBusy, panes: Array.from(document.querySelectorAll('[data-testid^="plot-pane-"]')).map(n => ({ id:n.dataset.testid, busy:n.getAttribute("aria-busy") })) }));
      const original = await settings.inputValue(); const numeric = Number(original); const changed = Number.isFinite(numeric) ? String(numeric + (numeric === 0 ? 1 : Math.abs(numeric) * 0.01)) : original + "1";
      const mutations = []; const listener = r => { if (!["GET", "HEAD", "OPTIONS"].includes(r.method())) mutations.push({ method: r.method(), url: r.url() }); }; page.on("request", listener);
      const fieldUpdate = page.waitForRequest(r => !["GET", "HEAD", "OPTIONS"].includes(r.method()) && /\/api\/settings(?:\/|$)/.test(r.url()), { timeout: 5000 }).catch(() => null);
      await settings.fill(changed); await settings.blur(); await fieldUpdate; await page.bringToFront();
      const dirty = await page.evaluate(() => ({ applyDisabled: document.querySelector('[data-testid="settings-apply"]')?.disabled, status: document.querySelector('[data-testid="settings-apply-status"]')?.textContent || "", busy: document.querySelector('[data-testid="app-shell"]')?.dataset.applyBusy }));
      await shot(page, "production-dirty-1440x900.png");
      check("draft-enables-apply-without-output-busy", dirty.applyDisabled === false && dirty.busy !== "true", { before, dirty, mutations });
      const busyVisible = page.waitForFunction(() => document.querySelector('[data-testid="app-shell"]')?.dataset.applyBusy === "true", null, { timeout: 5000 }).catch(() => null);
      await applyButton.click(); await page.bringToFront(); await busyVisible; const applying = await page.evaluate(() => ({ disabled: document.querySelector('[data-testid="settings-apply"]')?.disabled, busy: document.querySelector('[data-testid="app-shell"]')?.dataset.applyBusy, label: document.querySelector('[data-testid="settings-apply"]')?.innerText, panes: Array.from(document.querySelectorAll('[data-testid^="plot-pane-"]')).map(n => ({ id:n.dataset.testid, busy:n.getAttribute("aria-busy") })) }));
      await shot(page, "production-apply-1440x900.png");
      await page.waitForFunction(() => document.querySelector('[data-testid="app-shell"]')?.dataset.applyBusy !== "true", null, { timeout: 30000 }).catch(e => { report.apply_terminal_timeout = String(e); });
      const terminal = await page.evaluate(() => ({ disabled: document.querySelector('[data-testid="settings-apply"]')?.disabled, busy: document.querySelector('[data-testid="app-shell"]')?.dataset.applyBusy, label: document.querySelector('[data-testid="settings-apply"]')?.innerText, status: document.querySelector('[data-testid="settings-apply-status"]')?.textContent || "", panes: Array.from(document.querySelectorAll('[data-testid^="plot-pane-"]')).map(n => ({ id:n.dataset.testid, busy:n.getAttribute("aria-busy") })) }));
      await shot(page, "production-apply-terminal-1440x900.png"); page.off("request", listener);
      report.apply_flow = { original, changed, mutations, before, dirty, applying, terminal };
      check("apply-enters-busy-and-reaches-terminal", applying.disabled === true && applying.busy === "true" && !report.apply_terminal_timeout && terminal.busy !== "true", report.apply_flow);
    } else { report.apply_flow = { status: "not_run", reason: "No enabled calculation input or Apply control was available without creating application data." }; }
    check("no-browser-runtime-errors", report.page_errors.length === 0 && report.console_errors.length === 0 && report.responses_500.length === 0, { page_errors: report.page_errors, console_errors: report.console_errors, responses_500: report.responses_500 });
  } catch (e) { report.run_error = String(e && e.stack || e); }
  finally {
    for (const page of created.reverse()) try { if (!page.isClosed()) { await page.close(); report.closed_tab_count++; } } catch (e) { report.cleanup_error = String(e); }
    report.tab_cleanup_status = report.closed_tab_count === report.opened_tab_count && !report.cleanup_error ? "passed" : "failed";
    if (browser) await browser.close();
    report.finished_at = new Date().toISOString(); report.planned = 6; report.passed = report.checks.filter(c => c.pass).length; report.failed = report.checks.filter(c => !c.pass).length; report.not_run = Math.max(0, report.planned - report.checks.length); report.success_rate_percent = Number((report.passed / report.planned * 100).toFixed(2)); report.availability = !!report.checks.find(c => c.name === "availability-root" && c.pass); report.operational = report.availability && report.success_rate_percent >= 75;
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2)); process.stdout.write(JSON.stringify(report, null, 2)); process.exitCode = report.operational ? 0 : 1;
  }
})().catch(e => { console.error(e); process.exit(1); });
