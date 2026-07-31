"use strict";

const { openAppPage, testIdSelector, waitForAppReady } = require("../../support/app_page");

const LOCAL_PLOTLY_PATTERN = /\/vendor\/plotly-cartesian-3\.1\.0\.min\.js(?:[?#]|$)/;

function isExternalPlotlyRequest(request, pageUrl) {
  try {
    const requested = new URL(request.url());
    const page = new URL(pageUrl);
    return requested.origin !== page.origin && /plotly/i.test(requested.href);
  } catch (_error) {
    return /(?:cdn\.plot\.ly|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com).*plotly|plotly.*(?:cdn\.plot\.ly|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)/i.test(request.url());
  }
}

async function hostIsReady(page, config) {
  const selector = testIdSelector(config.app.testIds.activePlotHost);
  await page.waitForFunction(function (hostSelector) {
    const host = document.querySelector(hostSelector);
    const traces = host && (Array.isArray(host.data) ? host.data : host._fullData);
    return Boolean(host && host.isConnected && host.classList.contains("js-plotly-plot") &&
      host.getAttribute("data-plot-ready") === "true" && Array.isArray(traces) && traces.length > 0);
  }, selector, { timeout: 30000 });
}

async function testPlotlyLocalDelivery({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const cdnRequests = [];
  const onRequest = function (request) {
    if (isExternalPlotlyRequest(request, page.url() || appUrl)) {
      cdnRequests.push(`${request.method()} ${request.url()}`);
    }
  };
  const failLocalBundle = async function (route) {
    log(`intentionally blocked local Plotly bundle: ${route.request().url()}`);
    await route.abort("failed");
  };

  page.on("request", onRequest);
  try {
    await step("block local Plotly bundle and expose stable local error", async function () {
      await page.route(LOCAL_PLOTLY_PATTERN, failLocalBundle);
      if (useCurrentPage) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      }
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const host = page.locator(testIdSelector(config.app.testIds.activePlotHost));
      const error = page.locator(testIdSelector(config.app.testIds.plotErrorState));
      await host.waitFor({ state: "visible", timeout: 30000 });
      await error.waitFor({ state: "visible", timeout: 30000 });
      assert((await error.innerText()).trim() === "Не удалось загрузить локальную библиотеку графиков.",
        "blocking local Plotly must expose the stable Russian graph error state");
    });

    await step("restore local bundle without any CDN Plotly request", async function () {
      await page.unroute(LOCAL_PLOTLY_PATTERN, failLocalBundle);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await waitForAppReady(page, config, { timeout: 30000 });
      await hostIsReady(page, config);
      assert(await page.locator(testIdSelector(config.app.testIds.plotErrorState)).count() === 0 ||
        !(await page.locator(testIdSelector(config.app.testIds.plotErrorState)).isVisible()),
      "ready local Plotly host must not retain a visible graph error state");
      assert(cdnRequests.length === 0,
        `Plotly delivery must never request an external CDN: ${JSON.stringify(cdnRequests)}`);
    });
  } finally {
    await page.unroute(LOCAL_PLOTLY_PATTERN, failLocalBundle);
    page.off("request", onRequest);
  }
}

testPlotlyLocalDelivery.requiredFeatures = ["graph-output-zone", "output-loading-flow"];

module.exports = testPlotlyLocalDelivery;
