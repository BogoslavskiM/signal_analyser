"use strict";

// Recovery for state mutated by the interrupted HND-0235 profiler. Uses only
// the visible production checkbox workflow; no direct mutation API is called.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const REVISION = "cac83c5f445352a50f04aeeeb269b47007766d79";
const OUT = path.join("/private/tmp", "HND-0235-state-recovery-" + new Date().toISOString().replace(/[:.]/g, "-"));
const TIMEOUT = 60000;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { target: TARGET, expected_revision: REVISION, browser_channel: "chrome", headless: false,
    browser_visibility: "foreground", worker_count: 1, actions: [] };
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.bringToFront();
    await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible", timeout: TIMEOUT });
    const status = await page.evaluate(async () => {
      const response = await fetch(`api/status?e2e_recovery=${Date.now().toString(36)}`, { cache: "no-store" });
      return { status: response.status, body: await response.json() };
    });
    report.status = status;
    if (status.status !== 200 || status.body.runtime_revision !== REVISION) throw new Error(`revision mismatch: ${JSON.stringify(status)}`);
    const beforePath = path.join(OUT, "before.png");
    await page.screenshot({ path: beforePath, fullPage: true });
    report.before_screenshot = beforePath;
    const ids = await page.locator('[data-testid^="signal-checkbox-"]').evaluateAll(nodes => nodes.map(node => ({
      id: node.getAttribute("data-testid"), checked: node.checked, disabled: node.disabled,
      signal: node.getAttribute("data-signal-visibility"),
    })));
    report.before = ids;
    for (const item of ids) {
      if (item.checked) continue;
      const locator = page.locator(`[data-testid=${JSON.stringify(item.id)}]`);
      const responsePromise = page.waitForResponse(response => response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/api/layouts"), { timeout: TIMEOUT });
      await page.bringToFront();
      await locator.click({ timeout: TIMEOUT });
      const response = await responsePromise;
      const body = await response.text().catch(() => "");
      report.actions.push({ signal: item.signal, status: response.status(), response_bytes: Buffer.byteLength(body) });
      await page.waitForFunction(selector => {
        const node = document.querySelector(selector);
        return node && node.checked === true;
      }, `[data-testid=${JSON.stringify(item.id)}]`, { timeout: TIMEOUT });
    }
    await page.locator('[data-testid="active-plot-host"][data-plot-ready="true"]').waitFor({ state: "visible", timeout: TIMEOUT });
    report.after = await page.locator('[data-testid^="signal-checkbox-"]').evaluateAll(nodes => nodes.map(node => ({
      id: node.getAttribute("data-testid"), checked: node.checked, disabled: node.disabled,
      signal: node.getAttribute("data-signal-visibility"),
    })));
    report.restored = report.after.length > 0 && report.after.every(item => item.checked);
    const afterPath = path.join(OUT, "after.png");
    await page.screenshot({ path: afterPath, fullPage: true });
    report.after_screenshot = afterPath;
    if (!report.restored) throw new Error(`checkbox restoration incomplete: ${JSON.stringify(report.after)}`);
  } catch (error) {
    report.failure = String(error && error.stack || error);
  } finally {
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ evidence_path: OUT, restored: report.restored || false, failure: report.failure || null }, null, 2));
  if (!report.restored) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
