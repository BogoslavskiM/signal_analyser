"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { waitForSettled } = require("../../support/signal_analyser_page");

const STATE_ROUTE = "**/api/state*";
const RUSSIAN_LOADING = /загрузк|ожидани/i;
const RUSSIAN_ERROR = /ошибк|не удалось/i;

async function testLoadingErrorContract({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser before mocked state checks", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
  });

  const loader = page.locator(testIdSelector(config.app.loaderTestId));
  const error = page.locator(testIdSelector(config.app.errorTestId));

  await step("show Russian loading state while state response is delayed", async function () {
    const delayedState = async function (route) {
      await new Promise(function (resolve) { setTimeout(resolve, 600); });
      await route.continue();
    };
    await page.route(STATE_ROUTE, delayedState);
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await loader.waitFor({ state: "visible" });
      assert(RUSSIAN_LOADING.test((await loader.innerText()).trim()),
        "app-loading must present Russian loading text while /api/state is pending");
      await waitForSettled(page, config);
    } finally {
      await page.unroute(STATE_ROUTE, delayedState);
    }
  });

  await step("show Russian error state for failed state response", async function () {
    const failedState = async function (route) {
      await route.fulfill({
        body: JSON.stringify({ error: "E2E mocked /api/state failure" }),
        contentType: "application/json",
        status: 503,
      });
    };
    await page.route(STATE_ROUTE, failedState);
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await error.waitFor({ state: "visible" });
      assert(RUSSIAN_ERROR.test((await error.innerText()).trim()),
        "app-error must present Russian error text after failed /api/state");
    } finally {
      await page.unroute(STATE_ROUTE, failedState);
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForSettled(page, config);
    }
  });
}

testLoadingErrorContract.requiredFeatures = ["output-loading-flow"];

module.exports = testLoadingErrorContract;
