"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const { waitForSettled } = require("../../support/signal_analyser_page");

const STATE_ROUTE = "**/api/state*";
const LOADING_TEXT = /loading|загрузк|ожидани/i;
const ERROR_TEXT = /unable|error|ошибк|не удалось/i;

async function testLoadingErrorContract({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  await step("open Signal Analyser before mocked state checks", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
  });

  const loader = page.locator(testIdSelector(config.app.loaderTestId));
  const error = page.locator(testIdSelector(config.app.errorTestId));

  await step("show loading state while state response is delayed", async function () {
    const delayedState = async function (route) {
      await new Promise(function (resolve) { setTimeout(resolve, 600); });
      await route.continue();
    };
    await page.route(STATE_ROUTE, delayedState);
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await loader.waitFor({ state: "visible" });
      assert(LOADING_TEXT.test((await loader.innerText()).trim()),
        "app-loading must present loading text while /api/state is pending");
      await waitForSettled(page, config);
    } finally {
      await page.unroute(STATE_ROUTE, delayedState);
    }
  });

  await step("show error state for failed state response", async function () {
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
      assert(ERROR_TEXT.test((await error.innerText()).trim()),
        "app-error must present an error message after failed /api/state");
    } finally {
      await page.unroute(STATE_ROUTE, failedState);
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForSettled(page, config);
    }
  });
}

testLoadingErrorContract.requiredFeatures = ["output-loading-flow"];

module.exports = testLoadingErrorContract;
