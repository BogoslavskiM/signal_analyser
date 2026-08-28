"use strict";

const { openAppPage, waitForAppReady } = require("../../support/app_page");

function acceptedSettings(response) {
  return /\/api\/settings(?:\/apply)?(?:\?|$)/.test(response.url()) &&
    response.request().method() === "POST" && response.status() >= 200 && response.status() < 300;
}

async function task0127AutosaveBusy({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const routes = [];
  const errors = [];
  page.on("pageerror", function (error) { errors.push(String(error)); });
  page.on("response", function (response) {
    if (/\/api\/(?:settings(?:\/apply)?|outputs\/active|signals|workspace\/variables)/.test(response.url())) {
      routes.push({ url: response.url(), method: response.request().method(), status: response.status() });
    }
  });

  await step("ready exact deployed application", async function () {
    await page.bringToFront();
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
    await waitForAppReady(page, config, { timeout: 60000 });
    const status = await page.evaluate(async function () {
      const response = await fetch("./api/status", { cache: "no-store" });
      return { status: response.status, body: await response.json() };
    });
    assert(status.status === 200 && status.body.ready === true && status.body.runtime_revision === process.env.E2E_EXPECTED_REVISION,
      `exact ready revision required: ${JSON.stringify(status)}`);
  });

  await step("pane name autosaves per character without replacing focused input", async function () {
    await page.getByTestId("settings-tab-area").click();
    const input = page.locator("[data-setting-id='pane.name']");
    await input.waitFor({ state: "visible", timeout: 30000 });
    const original = await input.inputValue();
    const suffix = ` e2e${String(Date.now()).slice(-4)}`;
    let restored = false;
    try {
      await input.focus();
      await input.press("End");
      const initialNode = await input.evaluateHandle(function (node) { return node; });
      for (const character of suffix) {
        const accepted = page.waitForResponse(acceptedSettings, { timeout: 30000 });
        await input.pressSequentially(character, { delay: 180 });
        await accepted;
        const focus = await input.evaluate(function (node, reference) {
          return {
            same: node === reference,
            active: document.activeElement === node,
            atEnd: node.selectionStart === node.value.length && node.selectionEnd === node.value.length,
            value: node.value,
          };
        }, initialNode);
        assert(focus.same && focus.active && focus.atEnd,
          `autosave must retain the same focused input and caret: ${JSON.stringify(focus)}`);
      }
      await initialNode.dispose();
      assert((await input.inputValue()) === original + suffix, "typed pane name must remain in the live editor");
      await page.screenshot({ path: "/private/tmp/task0127-pane-name-autosave.png", fullPage: false, animations: "disabled" });

      const restore = page.waitForResponse(acceptedSettings, { timeout: 30000 });
      await input.fill(original);
      await input.press("Tab");
      await restore;
      await page.waitForFunction(function (value) {
        const node = document.querySelector("[data-setting-id='pane.name']");
        return node && node.value === value;
      }, original, { timeout: 30000 });
      restored = true;
    } finally {
      if (!restored) throw new Error("pane name was not restored exactly; stopping to avoid persistent mutation");
    }
  });

  await step("no raw Time Limits error and output is nonfatal", async function () {
    const body = await page.locator("body").innerText();
    assert(!body.includes("ArgumentError: Непустой Display должен иметь Time Limits"),
      "raw Time Limits ArgumentError must never be visible");
    const output = routes.filter(function (item) { return /\/api\/outputs\/active/.test(item.url); });
    assert(!output.some(function (item) { return item.status >= 500; }),
      `active output must not fail with 500: ${JSON.stringify(output)}`);
    const typedRecovery = await page.locator("[data-testid='plot-error-state'], [data-testid='display-active-plot-contract-error-state'], [data-testid='display-selection-contract-error-state']").count();
    const plot = await page.locator("[data-testid='active-plot-host']").count();
    assert(plot > 0 || typedRecovery > 0, "output must resolve to a plot host or a typed recoverable UI state");
  });

  await step("catalog checked row remains the same node while intercepted import is busy", async function () {
    let abortImport = null;
    await page.route("**/api/signals", async function (route) {
      if (route.request().method() !== "POST") return route.continue();
      await new Promise(function (resolve) { abortImport = resolve; });
      await route.abort("failed");
    });
    try {
      await page.getByTestId("signals-add-action").click();
      const list = page.getByTestId("signal-add-variables");
      const checked = list.locator("[data-signal-add-variable]").first();
      await checked.waitFor({ state: "visible", timeout: 30000 });
      const id = await checked.inputValue();
      await checked.check();
      const rate = page.locator("[data-signal-add-sample-rate]");
      if (await rate.isEnabled()) await rate.fill("2048");
      const submit = page.locator("[data-signal-add-submit]");
      await submit.click();
      await page.waitForFunction(function () {
        const list = document.querySelector("[data-testid='signal-add-variables']");
        return list && list.getAttribute("aria-busy") === "true";
      }, undefined, { timeout: 10000 });
      const same = await list.locator(`[data-signal-add-variable][value=${JSON.stringify(id)}]`).evaluate(function (node, original) {
        return { same: node === original, checked: node.checked, visible: !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length), disabled: node.disabled };
      }, await checked.elementHandle());
      assert(same.same && same.checked && same.visible && same.disabled,
        `checked checkbox must stay mounted and checked during busy import: ${JSON.stringify(same)}`);
      await page.screenshot({ path: "/private/tmp/task0127-catalog-busy.png", fullPage: false, animations: "disabled" });
      assert(typeof abortImport === "function", "test route must intercept the import before any backend mutation");
      abortImport();
      await page.waitForFunction(function () {
        const list = document.querySelector("[data-testid='signal-add-variables']");
        return list && list.getAttribute("aria-busy") !== "true";
      }, undefined, { timeout: 30000 });
      await page.locator("[data-signal-add-cancel]").click();
      assert(await page.getByTestId("signal-add-layer").isHidden(), "cancel closes intercepted import dialog");
    } finally {
      if (typeof abortImport === "function") abortImport();
      await page.unroute("**/api/signals");
    }
  });

  assert(errors.length === 0 && !routes.some(function (item) { return item.status >= 500; }),
    `no page errors or route 500 allowed: ${JSON.stringify({ errors, routes })}`);
  log(`TASK-0127 network: ${JSON.stringify(routes)}`);
}

task0127AutosaveBusy.scenarioFlags = ["TASK-0127"];
module.exports = task0127AutosaveBusy;
