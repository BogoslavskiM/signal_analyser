"use strict";

const { chromium } = require("playwright-core");

(async function inspect() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 30000 });
  const page = browser.contexts().flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes("/prod/user/"));
  if (!page) throw new Error("No visible production Engee page is open");
  await page.bringToFront();
  const inspection = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 12000),
    testids: Array.from(document.querySelectorAll("[data-testid]"), (element) => element.dataset.testid),
    plots: Array.from(document.querySelectorAll(".js-plotly-plot"), (element) => ({
      testid: element.dataset.testid || null,
      ready: element.dataset.plotReady || null,
      fullLayout: Boolean(element._fullLayout),
      fullData: Boolean(element._fullData),
      box: element.getBoundingClientRect().toJSON(),
    })),
    dialogs: Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'), (element) => ({
      role: element.getAttribute("role"),
      testid: element.dataset.testid || null,
      text: element.innerText.slice(0, 500),
    })),
  }));
  process.stdout.write(JSON.stringify(inspection, null, 2));
  // Deliberately do not call browser.close(); this is the shared visible Chrome.
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
