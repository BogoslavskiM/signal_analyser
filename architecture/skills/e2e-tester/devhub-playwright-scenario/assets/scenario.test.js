"use strict";

const {
  closeFloatingUi,
  openAppPage,
  testIdSelector,
} = require("../../support/app_page");

async function testFeatureScenario({
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

  try {
    await step("perform user action", async function () {
      await page.locator(testIdSelector("<action-testid>")).click();
    });

    await step("verify observable result", async function () {
      const result = page.locator(testIdSelector("<result-testid>"));
      await result.waitFor({ state: "visible" });
      assert(await result.isVisible(), "expected result should be visible");
    });
  } finally {
    await closeFloatingUi(page);
  }
}

testFeatureScenario.requiredFeatures = ["<frontend-skill-id>"];

module.exports = testFeatureScenario;
