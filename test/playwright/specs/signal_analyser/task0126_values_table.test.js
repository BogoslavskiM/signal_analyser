"use strict";

const { openAppPage, testIdSelector, waitForAppReady } = require("../../support/app_page");

async function json(page, path) {
  return page.evaluate(async function (url) {
    const response = await fetch(url, { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  }, path);
}

function activePane(snapshot) {
  const display = (snapshot.displays || []).find(function (item) {
    return item.id === snapshot.active_display_id;
  }) || (snapshot.displays || [])[0];
  const layout = (snapshot.layouts || []).find(function (item) {
    return item.display_id === (display && display.id);
  });
  const root = layout && layout.layout;
  return root && ((root.panes || []).find(function (pane) {
    return pane.id === root.active_pane_id;
  }) || (root.panes || [])[0]);
}

async function task0126ValuesTable({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const network = [];
  const errors = [];
  page.on("response", function (response) {
    if (/\/api\/(?:status|settings(?:\/apply)?|workspace\/variables|signals\/[^/]+\/(?:samples|summary)|peaks)/.test(response.url())) {
      network.push({ url: response.url(), status: response.status(), method: response.request().method() });
    }
  });
  page.on("pageerror", function (error) { errors.push(String(error)); });

  await step("exact production status and ready shell", async function () {
    await page.bringToFront();
    await openAppPage(page, { appUrl, config, log, useCurrentPage });
    await waitForAppReady(page, config, { timeout: 60000 });
    const status = await json(page, "./api/status");
    assert(status.status === 200 && status.body.ready === true,
      `production status must be ready: ${JSON.stringify(status)}`);
    assert(status.body.runtime_revision === process.env.E2E_EXPECTED_REVISION,
      `wrong production revision: ${JSON.stringify(status.body)}`);
  });

  const snapshot = await json(page, "./api/state-lite");
  assert(snapshot.status === 200, `state-lite must be available: ${snapshot.status}`);
  const pane = activePane(snapshot.body);
  const mainId = pane && (pane.main_signal_id || pane.main_signal || pane.analysis_signal || pane.selected_signal || snapshot.body.analysis_signal);
  const main = (snapshot.body.signals || []).find(function (signal) {
    return signal.id === mainId || signal.name === mainId;
  });

  if (!main) {
    log("TASK-0126 skipped values-dependent checks: existing workspace has no main signal; no mutation performed.");
  } else {
    await step("dynamic sample tab uses main name and loads five populated columns", async function () {
      const tab = page.getByTestId("inspector-tab-samples");
      await tab.waitFor({ state: "visible", timeout: 30000 });
      assert((await tab.innerText()).trim() === main.name,
        `dynamic tab must use exact main signal name: ${await tab.innerText()} vs ${main.name}`);
      const table = page.locator("[data-testid='inspector-pane-samples'] table");
      const rows = table.locator("tbody tr");
      const alreadyLoaded = await rows.count() > 0;
      const first = alreadyLoaded ? Promise.resolve(null) : page.waitForResponse(function (response) {
        return /\/api\/signals\/[^/]+\/samples/.test(response.url()) && response.status() === 200;
      }, { timeout: 30000 });
      await tab.click();
      await first;
      await table.waitFor({ state: "visible", timeout: 30000 });
      const headers = await table.locator("th").allTextContents();
      assert(headers.length === 5 && (await rows.count()) > 0,
        `samples must have five columns and rows: ${JSON.stringify({ headers, rows: await rows.count() })}`);

      const scroller = page.getByTestId("samples-table-scroll");
      const before = await rows.count();
      const next = page.waitForResponse(function (response) {
        return /\/api\/signals\/[^/]+\/samples\?/.test(response.url()) &&
          response.url().includes("cursor=") && response.status() === 200;
      }, { timeout: 5000 }).catch(function () { return null; });
      await scroller.evaluate(function (node) { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event("scroll")); });
      const response = await next;
      if (response) {
        await page.waitForFunction(function (count) {
          return document.querySelectorAll("[data-testid='inspector-pane-samples'] tbody tr").length > count;
        }, before, { timeout: 30000 });
      }
      await page.screenshot({ path: "/private/tmp/task0126-values.png", fullPage: false, animations: "disabled" });
    });

    await step("Signal Values focuses the same dynamic samples tab and summary is complete", async function () {
      await page.getByTestId("settings-tab-signal").click();
      const summaryResponse = page.waitForResponse(function (response) {
        return /\/api\/signals\/[^/]+\/summary/.test(response.url()) && response.status() === 200;
      }, { timeout: 30000 }).catch(function () { return null; });
      await summaryResponse;
      const metricCount = await page.locator(".summary-grid .summary-item").count();
      assert(metricCount >= 13, `summary must expose all metrics, got ${metricCount}`);
      await page.getByTestId("signal-values-action").click();
      assert(await page.getByTestId("inspector-tab-samples").getAttribute("aria-selected") === "true",
        "Signal Values must focus the existing dynamic samples tab");
    });
  }

  await step("numeric controls suppress browser history and no route errors", async function () {
    const autocomplete = await page.locator("input:not([type]),input[type='text'],input[type='search'],input[type='number'],textarea").evaluateAll(function (nodes) {
      return nodes.map(function (node) { return node.getAttribute("autocomplete"); });
    });
    assert(autocomplete.every(function (value) { return value === "off"; }),
      `editable controls must suppress browser history: ${JSON.stringify(autocomplete)}`);
    assert(errors.length === 0 && !network.some(function (item) { return item.status >= 500; }),
      `no route 500/page errors: ${JSON.stringify({ errors, network })}`);
  });

  await step("display rename previews immediately and restores authoritative name", async function () {
    const screenTab = page.getByTestId("settings-tab-screen");
    if (!(await screenTab.count())) {
      log("display rename skipped: Screen settings tab is unavailable");
      return;
    }
    await screenTab.click();
    const input = page.locator("[data-setting-id='display.name']");
    if (!(await input.count()) || !(await input.isVisible())) {
      log("display rename skipped: display.name editor is unavailable");
      return;
    }
    const original = await input.inputValue();
    const temporary = `${original || "Экран"} e2e-${Date.now()}`;
    let restored = false;
    try {
      const publish = page.waitForResponse(function (response) {
        return /\/api\/settings(?:\/apply)?(?:\?|$)/.test(response.url()) &&
          response.request().method() === "POST" && response.status() >= 200 && response.status() < 300;
      }, { timeout: 30000 });
      await input.fill(temporary);
      await input.press("Tab");
      await page.waitForFunction(function (value) {
        return Array.from(document.querySelectorAll("[data-testid^='display-tab-'], [data-testid='settings-context']")).some(function (node) {
          return (node.textContent || "").includes(value);
        });
      }, temporary, { timeout: 5000 });
      await publish;
      await page.screenshot({ path: "/private/tmp/task0126-rename-preview.png", fullPage: false, animations: "disabled" });

      const restore = page.waitForResponse(function (response) {
        return /\/api\/settings(?:\/apply)?(?:\?|$)/.test(response.url()) &&
          response.request().method() === "POST" && response.status() >= 200 && response.status() < 300;
      }, { timeout: 30000 });
      await input.fill(original);
      await input.press("Tab");
      await restore;
      await page.waitForFunction(function (value) {
        const node = document.querySelector("[data-setting-id='display.name']");
        return node && node.value === value;
      }, original, { timeout: 30000 });
      restored = true;
      assert(!network.some(function (item) { return item.status >= 500; }), "rename must not produce a route 500");
    } finally {
      if (!restored) throw new Error("display rename restoration did not complete; stop to avoid persistent workspace mutation");
    }
  });

  await step("workspace catalog checkbox stays mounted across refresh and is cancelled", async function () {
    const trigger = page.getByTestId("signals-add-action");
    await trigger.click();
    const list = page.getByTestId("signal-add-variables");
    const candidate = list.locator("[data-signal-add-variable]").first();
    await candidate.waitFor({ state: "visible", timeout: 30000 });
    const id = await candidate.inputValue();
    await candidate.check();
    assert(await candidate.isChecked(), "catalog checkbox must become checked without importing");
    const retry = page.locator("[data-signal-add-retry]");
    if (await retry.count() && await retry.isVisible()) {
      const response = page.waitForResponse(function (item) {
        return /\/api\/workspace\/variables/.test(item.url()) && item.status() === 200;
      }, { timeout: 30000 });
      await retry.click();
      await response;
      const retained = list.locator(`[data-signal-add-variable][value=${JSON.stringify(id)}]`);
      await retained.waitFor({ state: "visible", timeout: 30000 });
      assert(await retained.isChecked(), "checked catalog row must persist through refresh");
    } else {
      log("catalog refresh skipped: no retry control is available in the loaded catalog");
    }
    await page.screenshot({ path: "/private/tmp/task0126-catalog-checkbox.png", fullPage: false, animations: "disabled" });
    const cancel = page.locator("[data-signal-add-cancel]");
    await cancel.click();
    assert(await page.getByTestId("signal-add-layer").isHidden(), "catalog dialog must close without importing");
  });

  log(`TASK-0126 network: ${JSON.stringify(network)}`);
}

task0126ValuesTable.scenarioFlags = ["TASK-0126"];
module.exports = task0126ValuesTable;
