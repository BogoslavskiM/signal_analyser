"use strict";

const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifactDir = path.join(__dirname, "..", "..", "artifacts", "TASK-0158-V58-operations-extrema-ru");
const prototypeUrl = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/current/prototype/index.html";

function writeEvidence(name, value) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, name), JSON.stringify(value, null, 2));
}

async function screenshot(page, name) {
  fs.mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, name), fullPage: true });
}

async function ready(page, config) {
  await waitForAppReady(page, config, { timeout: 30000 });
  const loader = page.locator(testIdSelector(config.app.loaderTestId));
  if (await loader.count()) await loader.waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForFunction(function () {
    const shell = document.querySelector("[data-testid='app-shell']");
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, { timeout: 30000 });
}

async function selectOperation(page, dialog, label) {
  const input = dialog.locator(testIdSelector("signal-operation-select-input"));
  await input.click();
  const popup = page.locator(testIdSelector("value-select-options"));
  await popup.waitFor({ state: "visible", timeout: 10000 });
  await popup.getByText(label, { exact: true }).click();
  await popup.waitFor({ state: "hidden", timeout: 10000 });
}

async function selectValue(page, dialog, inputTestId, label) {
  const input = dialog.locator(testIdSelector(inputTestId));
  await input.click();
  const popup = page.locator(testIdSelector("value-select-options"));
  await popup.waitFor({ state: "visible", timeout: 10000 });
  await popup.getByText(label, { exact: true }).click();
  await popup.waitFor({ state: "hidden", timeout: 10000 });
}

async function deleteTaskSignal(page, config, name) {
  const row = page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`);
  const membership = row.locator("[data-visible-signal]");
  if (await membership.isChecked()) {
    await membership.setChecked(false);
    await ready(page, config);
  }
  const button = row.locator(`[data-signal-delete=${JSON.stringify(name)}]`);
  if (!await button.count()) return false;
  const response = page.waitForResponse(function (item) {
    if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals")) return false;
    const payload = item.request().postDataJSON();
    return payload && payload.operation === "delete" && payload.signal_name === name;
  }, { timeout: 30000 });
  await button.click();
  const received = await response;
  if (received.status() !== 200) throw new Error(`cleanup of ${name} returned HTTP ${received.status()}`);
  await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`).waitFor({ state: "detached", timeout: 30000 });
  await ready(page, config);
  return true;
}

async function selectHarmonicMain(page, config) {
  const row = page.locator("[data-signal-row][data-signal-name='Гармонический сигнал']");
  await row.waitFor({ state: "visible", timeout: 30000 });
  const membership = row.locator("[data-visible-signal]");
  if (!await membership.isChecked()) {
    await membership.setChecked(true);
    await ready(page, config);
  }
  await row.click();
  await ready(page, config);
  return row;
}

async function openMathOperation(page, row) {
  await row.locator("[data-signal-operation]").click();
  const dialog = page.locator(testIdSelector("signal-operation-dialog"));
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  const section = dialog.locator("[data-operation-section]");
  if (await section.getAttribute("data-operation-section") !== "math") {
    throw new Error("row operation must open the mathematical section");
  }
  return dialog;
}

async function task0158V58OperationsExtremaRu({ appUrl, assert, config, page, step }) {
  const createdNames = [];
  const evidence = { target: appUrl, startedAt: new Date().toISOString(), checks: [] };
  let productionOpened = false;
  try {
    await step("V58 prototype Russian contract", async function () {
      await page.goto(prototypeUrl, { waitUntil: "domcontentloaded" });
      await page.locator(testIdSelector("app-shell")).waitFor({ state: "visible", timeout: 30000 });
      const signalTab = page.locator(testIdSelector("settings-tab-signal"));
      await signalTab.click();
      assert((await page.locator("[data-testid='settings-content']").innerText()).includes("Дискретизация"), "pinned prototype must expose Russian Signal settings");
      await screenshot(page, "prototype-russian-contract.png");
      evidence.checks.push({ name: "prototype Russian interaction", result: "passed" });
    });

    await step("PROD Russian settings presentation", async function () {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      productionOpened = true;
      await ready(page, config);
      const visibleText = await page.locator("body").innerText();
      assert(!/(?:^|\s)Auto(?:\s|$)|(?:^|\s)auto(?:\s|$)/.test(visibleText), "PROD must not expose visible Auto/auto in UI copy");
      assert(visibleText.includes("Гц") || visibleText.includes("с"), "PROD settings must present Russian physical units");
      const row = await selectHarmonicMain(page, config);
      const dialog = await openMathOperation(page, row);
      await selectValue(page, dialog, "signal-operation-section-select-input", "Предобработка");
      await selectOperation(page, dialog, "Сглаживание");
      assert((await dialog.innerText()).includes("Авто"), "PROD preprocessing must render exact Russian Авто");
      await page.keyboard.press("Escape");
      await screenshot(page, "prod-russian-ready.png");
      evidence.checks.push({ name: "Russian units and Авто", result: "passed" });
    });

    await step("math Module creates a derived signal", async function () {
      const row = await selectHarmonicMain(page, config);
      const dialog = await openMathOperation(page, row);
      await selectOperation(page, dialog, "Модуль");
      const derivedName = `E2E модуль ${Date.now()}`;
      createdNames.push(derivedName);
      await dialog.locator("#signal-operation-name").fill(derivedName);
      let payload = null;
      const response = page.waitForResponse(function (item) {
        if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals/derive")) return false;
        payload = item.request().postDataJSON();
        return true;
      }, { timeout: 30000 });
      await dialog.locator("[data-signal-operation-submit]").click();
      const received = await response;
      assert(received.status() === 200, `Модуль must return HTTP 200, got ${received.status()}`);
      assert(payload && payload.operation === "abs" && payload.target_name === derivedName, "Модуль request must keep typed abs operation and target name");
      await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(derivedName)}]`).waitFor({ state: "visible", timeout: 30000 });
      await screenshot(page, "prod-module-created.png");
      evidence.checks.push({ name: "Модуль derive", result: "passed", status: received.status(), payload: payload });
      await page.keyboard.press("Escape");
    });

    await step("explicit Time extrema calculation returns records", async function () {
      const row = await selectHarmonicMain(page, config);
      const timeHost = page.locator("[data-pane-host]").filter({ has: page.locator(".js-plotly-plot") }).first();
      await timeHost.waitFor({ state: "visible", timeout: 30000 });
      const peaksTab = page.locator(testIdSelector("inspector-tab-peaks"));
      await peaksTab.waitFor({ state: "visible", timeout: 10000 });
      await peaksTab.click();
      const calculate = page.locator(testIdSelector("extrema-calculate")).first();
      await calculate.waitFor({ state: "visible", timeout: 30000 });
      let called = null;
      const response = page.waitForResponse(function (item) {
        const pathname = new URL(item.url()).pathname;
        if (item.request().method() !== "POST" || !/peaks|extrema/.test(pathname)) return false;
        called = pathname;
        return true;
      }, { timeout: 30000 });
      await calculate.click();
      const received = await response;
      assert(received.ok(), `extrema calculation must return a successful response, got HTTP ${received.status()}`);
      const rows = page.locator("[data-testid='peaks-table'] tbody tr");
      await rows.first().waitFor({ state: "visible", timeout: 30000 });
      assert(await rows.count() > 0, "successful extrema calculation must expose at least one extrema row");
      const markerCount = await timeHost.evaluate(function (host) {
        return Array.isArray(host.data) ? host.data.filter(function (trace) {
          return trace && trace.meta && trace.meta.signal_analyser_peaks_overlay === true;
        }).length : 0;
      });
      assert(markerCount > 0, "Time extrema records must add Plotly extrema marker trace");
      await screenshot(page, "prod-extrema-result.png");
      evidence.checks.push({ name: "Time extrema calculation", result: "passed", path: called, status: received.status(), rows: await rows.count(), markers: markerCount });
    });

    await step("provider failure uses sanitized Russian alertdialog", async function () {
      const row = await selectHarmonicMain(page, config);
      const dialog = await openMathOperation(page, row);
      await selectOperation(page, dialog, "Пользовательское");
      const body = dialog.locator("#signal-operation-body");
      await body.waitFor({ state: "visible", timeout: 10000 });
      await body.fill('error("E2E expected provider failure")');
      const failedName = `E2E не создать ${Date.now()}`;
      await dialog.locator("#signal-operation-name").fill(failedName);
      const response = page.waitForResponse(function (item) {
        return item.request().method() === "POST" && new URL(item.url()).pathname.endsWith("/api/signals/derive");
      }, { timeout: 8000 });
      await dialog.locator("[data-signal-operation-submit]").click();
      const received = await response;
      assert(received.status() >= 400, `intentional provider failure must not create a signal (got HTTP ${received.status()})`);
      const alert = page.locator(testIdSelector("signal-operation-error-dialog"));
      await alert.waitFor({ state: "visible", timeout: 8000 });
      const alertText = await alert.innerText();
      assert(alertText.includes("Операция не выполнена"), "error alert must use Russian title");
      assert(!/TypeError|ArgumentError|Julia|Engee|SubString|expected provider failure/i.test(alertText), "error alert must not expose raw runtime/provider details");
      assert(await dialog.isVisible(), "operation form must remain mounted under the error alert");
      await screenshot(page, "prod-sanitized-operation-error.png");
      await alert.locator("[data-signal-operation-error-confirm]").click();
      await alert.waitFor({ state: "hidden", timeout: 10000 });
      assert(await dialog.locator("[data-signal-operation-submit]").evaluate(function (node) { return document.activeElement === node; }), "closing alert must restore focus to operation submit");
      assert(await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(failedName)}]`).count() === 0, "failed operation must not create a signal row");
      evidence.checks.push({ name: "sanitized operation alertdialog", result: "passed", status: received.status() });
      await page.keyboard.press("Escape");
    });
  } finally {
    if (productionOpened) {
      for (const name of createdNames.reverse()) await deleteTaskSignal(page, config, name);
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      await ready(page, config);
      await screenshot(page, "prod-cleanup.png");
    }
    evidence.finishedAt = new Date().toISOString();
    writeEvidence("report.json", evidence);
  }
}

task0158V58OperationsExtremaRu.scenarioFlags = ["TASK-0158-V58"];
module.exports = task0158V58OperationsExtremaRu;
