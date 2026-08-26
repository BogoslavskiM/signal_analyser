"use strict";

const { testIdSelector, waitForAppReady } = require("../../support/app_page");

async function ready(page, config) {
  await waitForAppReady(page, config, { timeout: 30000 });
  const loader = page.locator(testIdSelector(config.app.loaderTestId));
  if (await loader.count()) await loader.waitFor({ state: "hidden", timeout: 30000 });
}

async function task0158V58Preprocess({ appUrl, assert, config, page, step }) {
  await step("external preprocess opens selected main signal", async function () {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await ready(page, config);
    const harmonic = page.locator("[data-signal-row][data-signal-name='Гармонический сигнал']");
    await harmonic.waitFor({ state: "visible", timeout: 30000 });
    await harmonic.click();
    await ready(page, config);
    await page.evaluate(function () {
      window.dispatchEvent(new CustomEvent("signal-analyser:host-command", { detail: { command: "preprocess", source_signal_id: "must-be-ignored" } }));
    });
    const dialog = page.locator(testIdSelector("signal-operation-dialog"));
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    const section = dialog.locator("[data-operation-section]");
    assert(await section.getAttribute("data-operation-section") === "preprocess", "host command must open the preprocess section");
    const sourceInput = dialog.locator(".signal-operation-row input[readonly]").first();
    assert(await sourceInput.inputValue() === "Гармонический сигнал", "preprocess source must be resolved from current plain-LMB signal");
    assert((await dialog.innerText()).includes("Параметры предобработки"), "preprocess fields must be visible");
    const operationInput = dialog.locator(testIdSelector("signal-operation-select-input"));
    await operationInput.click();
    const options = page.locator(testIdSelector("value-select-options"));
    await options.waitFor({ state: "visible", timeout: 5000 });
    const denoise = options.getByText(/Подавление шума/).first();
    assert(await denoise.count() === 1, "denoise must remain visible in the preprocessing selector");
    assert(await denoise.getAttribute("aria-disabled") === "true" || await denoise.isDisabled(), "denoise must be visibly disabled until typed backend support is available");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  });
}

task0158V58Preprocess.scenarioFlags = ["TASK-0158-V58-PREPROCESS"];
module.exports = task0158V58Preprocess;
