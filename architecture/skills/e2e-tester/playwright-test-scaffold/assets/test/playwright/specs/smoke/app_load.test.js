"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");

module.exports = async function testAppLoad({
  appUrl,
  assert,
  config,
  log,
  page,
  step,
  useCurrentPage,
}) {
  await step("open app page", async function () {
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
  });

  await step("verify app root is visible", async function () {
    const readyTestId = config.app.readyTestId;
    const ready = page.locator(testIdSelector(readyTestId));
    assert(await ready.isVisible(), `app ready element ${JSON.stringify(readyTestId)} should be visible`);
  });
};
