"use strict";

/* This is intentionally narrow: it removes only records made by the failed
 * V54/V58 runs, never a user-named signal or an arbitrary display. */
const { waitForAppReady } = require("../../support/app_page");

const TASK_SIGNAL = /^(?:(?:V54|E2E) обрезка|E2E модуль|E2E не создать) \d+$/;

async function ready(page, config) {
  await waitForAppReady(page, config, { timeout: 30000 });
  await page.waitForFunction(function () {
    const shell = document.querySelector("[data-testid='app-shell']");
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, { timeout: 30000 });
}

async function task0158V58Cleanup({ appUrl, assert, config, page, step }) {
  await step("remove only task-owned residual signals and displays", async function () {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await ready(page, config);
    const signalNames = await page.locator("[data-signal-row]").evaluateAll(function (rows) {
      return rows.map(function (row) { return row.getAttribute("data-signal-name"); });
    });
    const candidates = signalNames.filter(function (name) { return TASK_SIGNAL.test(String(name || "")); });
    for (const name of candidates) {
      const row = page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`);
      const membership = row.locator("[data-visible-signal]");
      if (await membership.isChecked()) {
        await membership.setChecked(false);
        await ready(page, config);
      }
      const action = page.locator(`[data-signal-delete=${JSON.stringify(name)}]`);
      const response = page.waitForResponse(function (item) {
        if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals")) return false;
        const payload = item.request().postDataJSON();
        return payload && payload.operation === "delete" && payload.signal_name === name;
      }, { timeout: 30000 });
      await action.click();
      const deleted = await response;
      assert(deleted.ok(), `cleanup deletion must succeed for ${name}; got HTTP ${deleted.status()}`);
      await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`).waitFor({ state: "detached", timeout: 30000 });
      await ready(page, config);
    }
    const leftovers = await page.locator("[data-signal-row]").evaluateAll(function (rows) {
      return rows.map(function (row) { return row.getAttribute("data-signal-name"); });
    });
    assert(!leftovers.some(function (name) { return TASK_SIGNAL.test(String(name || "")); }), "no task-owned crop signal may remain");
  });
}

task0158V58Cleanup.scenarioFlags = ["TASK-0158-V58-CLEANUP"];
module.exports = task0158V58Cleanup;
