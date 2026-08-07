"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "artifacts", "HND-0384");
const prototypeUrl = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0057-ui-overlay-refinement/prototype/index.html";
const productionUrl = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const report = { browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1 };
  try {
    await page.goto(prototypeUrl, { waitUntil: "load" });
    await page.bringToFront();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ROOT, "prototype-probe-1440x900.png") });
    report.prototype = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      designIds: Array.from(document.querySelectorAll("[data-design-id]"), (element) => element.dataset.designId),
      buttons: Array.from(document.querySelectorAll("button"), (element) => ({ text: element.innerText.trim(), aria: element.getAttribute("aria-label"), testid: element.dataset.testid })),
      plots: Array.from(document.querySelectorAll(".js-plotly-plot"), (element) => ({ testid: element.dataset.testid || null, fullLayout: Boolean(element._fullLayout), fullData: Boolean(element._fullData) })),
    }));
    await page.goto(productionUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.bringToFront();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ROOT, "production-probe-1440x900.png") });
    report.production = await page.evaluate(async () => {
      const status = await fetch("./api/status", { headers: { Accept: "application/json" }, cache: "no-store" })
        .then(async (response) => ({ status: response.status, body: await response.text() }))
        .catch((error) => ({ error: String(error) }));
      return {
        url: location.href,
        title: document.title,
        text: document.body.innerText.slice(0, 2000),
        status,
        testids: Array.from(document.querySelectorAll("[data-testid]"), (element) => element.dataset.testid),
      };
    });
  } catch (error) {
    report.error = error.stack || String(error);
  } finally {
    report.completed_at = new Date().toISOString();
    fs.writeFileSync(path.join(ROOT, "probe.json"), JSON.stringify(report, null, 2));
    // The test-created visible Chrome window is intentionally left open for inspection.
  }
  process.stdout.write(JSON.stringify(report, null, 2));
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
