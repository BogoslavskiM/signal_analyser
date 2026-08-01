"use strict";

const { assertAllowedUrl, resolveAllowedOrigins } = require("./target_policy");

const DEFAULT_TIMEOUT = 30000;
const ACTION_TIMEOUT = 60000;

function testIdSelector(testId) {
  return `[data-testid=${JSON.stringify(String(testId))}]`;
}

async function waitForAppReady(page, config, options) {
  const appConfig = config && config.app ? config.app : {};
  const timeout = options && options.timeout ? options.timeout : DEFAULT_TIMEOUT;
  const readyTestId = appConfig.readyTestId || "app-ready";
  const loaderTestId = appConfig.loaderTestId || "";

  await page.locator(testIdSelector(readyTestId)).waitFor({
    state: "visible",
    timeout,
  });

  if (loaderTestId) {
    const loader = page.locator(testIdSelector(loaderTestId));
    if (await loader.count()) {
      await loader.waitFor({ state: "hidden", timeout });
    }
  }
}

async function openAppPage(page, options) {
  const config = options.config || {};
  const log = options.log || function () {};
  const allowedOrigins = resolveAllowedOrigins(config);

  if (!options.useCurrentPage) {
    assertAllowedUrl(options.appUrl, allowedOrigins, "application URL");
    log(`navigate to ${options.appUrl}`);
    await page.goto(options.appUrl, {
      waitUntil: "domcontentloaded",
      timeout: ACTION_TIMEOUT,
    });
  } else {
    assertAllowedUrl(page.url(), allowedOrigins, "current page URL");
    log(`use current page ${page.url() || "(blank)"}`);
  }

  log("wait for app ready state");
  await waitForAppReady(page, config);
}

async function closeFloatingUi(page) {
  await page.mouse.click(1, 1);
}

module.exports = {
  ACTION_TIMEOUT,
  DEFAULT_TIMEOUT,
  closeFloatingUi,
  openAppPage,
  testIdSelector,
  waitForAppReady,
};
