"use strict";
const { waitForAppReady } = require("../../support/app_page");

async function task0152V54Cleanup({ appUrl, assert, config, page, step }) {
  await step("delete only confirmed display-2 and restore display-1", async function () {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, config, { timeout: 30000 });
    const tab = page.locator("[data-testid='display-tab-display-2']");
    assert(await tab.count() === 1, "confirmed residual display-2 must exist exactly once");
    const response = page.waitForResponse(function (r) { return new URL(r.url()).pathname === "/api/displays" && r.request().method() === "POST"; }, { timeout: 30000 });
    await page.locator("[data-testid='display-close-display-2']").click();
    assert((await response).ok(), "exact display-2 delete must succeed");
    await page.waitForFunction(function () { return !document.querySelector("[data-testid='display-tab-display-2']") && document.querySelector("[data-testid='display-tab-display-1']")?.getAttribute("aria-selected") === "true"; }, { timeout: 30000 });
    const state = await page.evaluate(async function () { const r = await fetch("./api/state-lite"); return r.json(); });
    assert(state.active_display_id === "display-1" && state.displays.length === 1 && state.displays[0].id === "display-1", "state-lite must retain exactly original display-1 active");
  });
}
task0152V54Cleanup.scenarioFlags=["TASK-0152-V54-CLEANUP"];
module.exports=task0152V54Cleanup;
