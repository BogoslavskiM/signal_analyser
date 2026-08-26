"use strict";

/* A deliberately narrow deployed workflow.  Keep it independent from the
 * broader V54 viewport test so a range-control regression cannot hide the
 * crop acceptance result. */
const assertNode = require("assert");
const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifactDir = path.join(__dirname, "..", "..", "artifacts", "TASK-0158-V58-trim");
const traceFile = path.join(artifactDir, "trace.json");

function trace(entry) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const previous = fs.existsSync(traceFile) ? JSON.parse(fs.readFileSync(traceFile, "utf8")) : [];
  previous.push(Object.assign({ at: new Date().toISOString() }, entry));
  fs.writeFileSync(traceFile, JSON.stringify(previous, null, 2));
}

function shellReady(page, config) {
  return waitForAppReady(page, config, { timeout: 30000 }).then(async function () {
    const loader = page.locator(testIdSelector(config.app.loaderTestId));
    if (await loader.count()) await loader.waitFor({ state: "hidden", timeout: 30000 });
  });
}

async function shot(page, name) {
  fs.mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, name), fullPage: true });
}

async function trimState(dialog) {
  return dialog.evaluate(function (node) {
    const one = function (selector) { return node.querySelector(selector); };
    const submit = one("[data-signal-trim-submit]");
    const name = one("[data-signal-trim-name]");
    const source = one("[data-signal-trim-source]");
    const status = one("[data-signal-trim-status]");
    const overwriteRow = one("[data-signal-trim-overwrite-row]");
    const overwrite = one("[data-signal-trim-overwrite]");
    const message = one("[data-signal-trim-name-message]");
    return {
      submitDisabled: !submit || submit.disabled,
      layerBusy: node.closest("[data-testid='signal-trim-layer']") && node.closest("[data-testid='signal-trim-layer']").getAttribute("aria-busy"),
      layerHidden: !!(node.closest("[data-testid='signal-trim-layer']") || {}).hidden,
      nameValue: name && name.value,
      nameInvalid: name && name.getAttribute("aria-invalid"),
      sourceValue: source && source.value,
      statusHidden: !status || status.hidden,
      statusText: status && status.textContent.trim(),
      nameMessageHidden: !message || message.hidden,
      nameMessageText: message && message.textContent.trim(),
      overwriteRowHidden: !overwriteRow || overwriteRow.hidden,
      overwriteChecked: !!(overwrite && overwrite.checked),
      controllerUnavailable: !node.isConnected || !submit || !name || !source
    };
  });
}

async function displayTabs(page) {
  return page.locator("[data-testid='display-tabs'] [role='tab']").evaluateAll(function (nodes) {
    return nodes.map(function (node) {
      return { id: node.getAttribute("data-display-select"), selected: node.getAttribute("aria-selected") === "true" };
    });
  });
}

async function waitIdle(page, config) {
  await shellReady(page, config);
  await page.waitForFunction(function () {
    const shell = document.querySelector("[data-testid='app-shell']");
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, { timeout: 30000 });
}

async function removeDisplay(page, config, id, expectedCount) {
  const close = page.locator(`[data-testid='display-close-${id}']`);
  if (!await close.count()) return false;
  await close.click();
  await page.waitForFunction(function (count) {
    return document.querySelectorAll("[data-testid='display-tabs'] [role='tab']").length === count;
  }, expectedCount, { timeout: 30000 });
  await waitIdle(page, config);
  return true;
}

async function deleteSignal(page, config, name) {
  const action = page.locator(`[data-signal-delete=${JSON.stringify(name)}]`);
  if (!await action.count()) return false;
  const response = page.waitForResponse(function (item) {
    return item.request().method() === "POST" && new URL(item.url()).pathname.endsWith("/api/signals");
  }, { timeout: 30000 });
  await action.click();
  assertNode.strictEqual((await response).status(), 200, "task-owned cropped signal cleanup must succeed");
  await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`).waitFor({ state: "detached", timeout: 30000 });
  await waitIdle(page, config);
  return true;
}

async function task0158V58Trim({ appUrl, assert, config, page, step }) {
  const before = [];
  let temporaryDisplay = null;
  let cropName = null;
  let createdPage = false;
  try {
    await step("V58 trim production readiness", async function () {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      createdPage = true;
      await waitIdle(page, config);
      before.push.apply(before, await displayTabs(page));
      assert(before.length > 0, "production must expose at least one display tab");
      await shot(page, "ready.png");
    });

    await step("dual cursors expose trim action and dialog", async function () {
      await page.locator(testIdSelector("add-display")).click();
      await page.waitForFunction(function (count) {
        return document.querySelectorAll("[data-testid='display-tabs'] [role='tab']").length === count;
      }, before.length + 1, { timeout: 30000 });
      await waitIdle(page, config);
      const after = await displayTabs(page);
      temporaryDisplay = after.find(function (tab) { return !before.some(function (old) { return old.id === tab.id; }); });
      assert(temporaryDisplay && temporaryDisplay.id, "temporary display must receive a stable id");

      const row = page.locator("[data-signal-row][data-signal-name='Гармонический сигнал']");
      await row.waitFor({ state: "visible", timeout: 30000 });
      const check = row.locator("[data-visible-signal]");
      if (!await check.isChecked()) { await check.setChecked(true); await waitIdle(page, config); }
      await row.click();
      await waitIdle(page, config);

      const host = page.locator(`[data-pane-host^=${JSON.stringify(temporaryDisplay.id + "::")}]`).first();
      await host.waitFor({ state: "visible", timeout: 30000 });
      const paneId = (await host.getAttribute("data-pane-host")).split("::")[1];
      await page.locator(`[data-pane-menu=${JSON.stringify(paneId)}]`).click();
      const dual = page.locator(testIdSelector("pane-menu-dual-cursor"));
      await dual.waitFor({ state: "visible", timeout: 10000 });
      await dual.click();
      await page.locator("[data-graph-cursor-overlay] [data-cursor-index]").nth(1).waitFor({ state: "visible", timeout: 10000 });

      const trim = page.locator(`${testIdSelector("pane-trim-signal")}:visible`).first();
      await trim.waitFor({ state: "visible", timeout: 10000 });
      assert(await trim.isEnabled(), "dual Time cursors must expose an enabled trim action");
      await trim.click();
      const dialog = page.locator(testIdSelector("signal-trim-dialog"));
      await dialog.waitFor({ state: "visible", timeout: 10000 });
      const source = dialog.locator("[data-signal-trim-source]");
      const name = dialog.locator("[data-signal-trim-name]");
      assert(await source.count() === 1 && await source.isVisible(), "trim dialog must expose a source-signal dropdown");
      assert(await source.inputValue(), "trim dialog must select an eligible source by default");
      assert((await name.inputValue()).trim().length > 0, "trim dialog must suggest a non-empty default signal name");
      trace(Object.assign({ phase: "dialog-defaults", sourceValue: await source.inputValue(), sourceText: (await source.locator("xpath=..").innerText()).trim(), defaultName: await name.inputValue() }, await trimState(dialog)));
      await shot(page, "dialog-defaults.png");

      cropName = `E2E обрезка ${Date.now()}`;
      await name.fill(cropName);
      const submit = dialog.locator("[data-signal-trim-submit]");
      await submit.waitFor({ state: "visible", timeout: 10000 });
      trace(Object.assign({ phase: "name-filled", name: await name.inputValue() }, await trimState(dialog)));
      await page.waitForFunction(function (element) { return element && !element.disabled; }, await submit.elementHandle(), { timeout: 10000 });
      let payload = null;
      const response = page.waitForResponse(function (item) {
        if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals/crop")) return false;
        payload = item.request().postDataJSON();
        return true;
      }, { timeout: 10000 });
      await submit.click();
      trace(Object.assign({ phase: "crop-submitted" }, await trimState(dialog)));
      let crop;
      try { crop = await response; }
      catch (error) {
        trace(Object.assign({ phase: "crop-no-response", error: String(error && error.message || error) }, await trimState(dialog)));
        await shot(page, "crop-no-response.png");
        throw error;
      }
      trace({ phase: "crop-response", status: crop.status(), payload: payload });
      assert(crop.status() === 200, `crop request must return HTTP 200, got ${crop.status()}`);
      assert(payload && payload.target_name === cropName && payload.source_signal_id && Number.isFinite(payload.min_s) && Number.isFinite(payload.max_s) && payload.min_s <= payload.max_s,
        "crop request must submit the selected source, a sorted cursor interval and target name");
      await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(cropName)}]`).waitFor({ state: "visible", timeout: 30000 });
      await shot(page, "crop-created.png");
    });
  } finally {
    trace({ phase: "cleanup-start", cropName: cropName, temporaryDisplay: temporaryDisplay && temporaryDisplay.id });
    if (cropName) await deleteSignal(page, config, cropName);
    if (temporaryDisplay && temporaryDisplay.id) await removeDisplay(page, config, temporaryDisplay.id, before.length);
    if (before.length) {
      const original = before.find(function (tab) { return tab.selected; }) || before[0];
      const tab = page.locator(`[data-testid='display-tab-${original.id}']`);
      if (await tab.count()) await tab.click();
    }
    if (createdPage) { await shot(page, "cleanup.png"); trace({ phase: "cleanup-done" }); }
  }
}

task0158V58Trim.scenarioFlags = ["TASK-0158-V58"];
module.exports = task0158V58Trim;
