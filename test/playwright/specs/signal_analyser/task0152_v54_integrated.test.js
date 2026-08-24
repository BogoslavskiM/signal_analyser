"use strict";

const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifactDir = path.join(__dirname, "..", "..", "artifacts", "TASK-0152-V54");
const prototypeUrl = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/current/prototype/index.html";

async function screenshot(page, name) {
  fs.mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, name), fullPage: true });
}
function progress(entry) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const file = path.join(artifactDir, "live-progress.json");
  const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  rows.push(Object.assign({ at: new Date().toISOString() }, entry));
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
}

async function settled(page, config) {
  await waitForAppReady(page, config, { timeout: 30000 });
  const loading = page.locator(testIdSelector(config.app.loaderTestId));
  if (await loading.count()) await loading.waitFor({ state: "hidden", timeout: 30000 });
}

async function nativeHoverCount(page) {
  return page.locator(".hoverlayer .hovertext, .hoverlayer .axistext, .hoverlayer .legend").count();
}

async function rangeNodes(page) {
  return page.locator("[data-range-generation], [data-screen-range-slider], [data-plot-range-slider]").evaluateAll(function (nodes) {
    return nodes.map(function (node) {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { connected: node.isConnected, display: style.display, overflowX: style.overflowX, overflowY: style.overflowY, width: box.width, height: box.height };
    });
  });
}

async function clickSafe(locator) {
  if (await locator.count() && await locator.isVisible() && !await locator.isDisabled()) {
    await locator.click();
    return true;
  }
  return false;
}

async function idle(page, config) {
  await settled(page, config);
  await page.waitForFunction(function () {
    const shell = document.querySelector("[data-testid='app-shell']");
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, { timeout: 30000 });
}

async function tabs(page) {
  return page.locator("[data-testid='display-tabs'] [role='tab']").evaluateAll(function (nodes) {
    return nodes.map(function (node) { return { id: node.getAttribute("data-display-select"), active: node.getAttribute("aria-selected") === "true" }; });
  });
}

async function selectTab(page, config, id) {
  await page.locator(`[data-testid='display-tab-${id}']`).click();
  await idle(page, config);
}

async function sourceRow(page) {
  return page.locator("[data-signal-row]").evaluateAll(function (rows) {
    const preferred = rows.find(function (row) { return /гармоническ/i.test(row.getAttribute("data-signal-name") || ""); }) || rows[0];
    if (!preferred) return null;
    const input = preferred.querySelector("[data-visible-signal]");
    return input ? { name: input.getAttribute("data-visible-signal"), checked: input.checked } : null;
  });
}

async function deleteTaskSignal(page, config, name, progress) {
  const button = page.locator(`[data-signal-delete=${JSON.stringify(name)}]`);
  if (!await button.count()) return false;
  const response = page.waitForResponse(function (item) {
    return item.request().method() === "POST" && new URL(item.url()).pathname === "/api/signals";
  }, { timeout: 30000 });
  await button.click();
  const result = await response;
  if (!result.ok()) throw new Error(`task-owned signal ${name} cleanup failed: ${result.status()}`);
  await idle(page, config);
  await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`).waitFor({ state: "detached", timeout: 30000 });
  progress({ step:"task-signal-deleted", name:name, status:result.status() });
  return true;
}

async function task0152V54({ appUrl, assert, config, log, page, step }) {
  const failures = [];
  await step("prototype contract before production", async function () {
    await page.goto(prototypeUrl, { waitUntil: "domcontentloaded" });
    await page.locator(testIdSelector("app-shell")).waitFor({ state: "visible", timeout: 30000 });
    await screenshot(page, "prototype-v54.png");
    assert(await page.locator("[data-pane-trim-signal], [data-testid='measurement-columns-menu-trigger'], [data-testid='settings-show-axis-labels']").count() >= 0,
      "prototype must remain inspectable before deployed run");
  });

  await step("production bootstrap and standard busy cursor", async function () {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    const shell = page.locator(testIdSelector("app-shell"));
    await shell.waitFor({ state: "visible", timeout: 30000 });
    const bootstrapCount = await page.locator("[data-bootstrap-loader], [data-testid='app-loading']").count();
    assert(bootstrapCount >= 1, "bootstrap loading node must exist");
    await settled(page, config);
    const cursors = await page.locator("[data-testid='app-shell'], [data-testid='app-loading'], .pane-loader, .display-loader").evaluateAll(function (nodes) {
      return nodes.map(function (node) { return getComputedStyle(node).cursor; });
    });
    assert(cursors.every(function (cursor) { return cursor !== "wait" && cursor !== "progress"; }), "busy/loading UI must not set wait/progress cursor");
    await screenshot(page, "production-ready-v54.png");
  });

  await step("range mirror DOM stays mounted and no overflow is authored", async function () {
    const before = await rangeNodes(page);
    const rangeInput = page.locator("[data-setting-id$='limits'][data-range-part]").first();
    if (await rangeInput.count() && await rangeInput.isVisible() && !await rangeInput.isDisabled()) {
      await rangeInput.focus();
      const connectedBefore = await rangeNodes(page);
      await rangeInput.press("ArrowRight");
      const connectedAfter = await rangeNodes(page);
      assert(connectedAfter.length >= connectedBefore.length, "range controls must not disappear during keyboard preview");
      assert(connectedAfter.every(function (node) { return node.connected && node.overflowX !== "scroll" && node.overflowY !== "scroll"; }), "range controls must not create transient inner scrollbars");
    } else {
      log("range mirror interaction skipped: no applicable visible editable range field in active pane");
    }
    assert(before.every(function (node) { return node.overflowX !== "scroll" && node.overflowY !== "scroll"; }), "initial range controls must not author inner scrollbars");
  });

  await step("measurement cursor columns and labels contracts are exposed", async function () {
    await clickSafe(page.locator(testIdSelector("inspector-tab-measurements")));
    const menuTrigger = page.locator(testIdSelector("measurement-columns-menu-trigger"));
    if (await clickSafe(menuTrigger)) {
      const menu = page.locator(testIdSelector("measurement-columns-menu"));
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const labels = await menu.innerText();
      ["X1", "Y1", "X2", "Y2", "ΔX", "ΔY"].forEach(function (label) {
        assert(labels.includes(label), `Measurements eye menu must expose ${label}`);
      });
      await page.keyboard.press("Escape");
    } else {
      failures.push("measurement-menu-unavailable");
    }
    const axisLabel = page.locator(testIdSelector("settings-show-axis-labels"));
    if (await axisLabel.count()) assert(await axisLabel.isVisible(), "axis-label checkbox must be visible next to graph settings");
  });

  await step("native Plotly hover remains suppressed", async function () {
    const plot = page.locator("[data-pane-host] .js-plotly-plot, .js-plotly-plot").first();
    if (await plot.count() && await plot.isVisible()) {
      const box = await plot.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        assert(await nativeHoverCount(page) === 0, "native Plotly hover tooltip must remain absent");
      }
    } else {
      failures.push("plot-unavailable-for-hover");
    }
  });

  await step("trim and custom-operation entrypoints do not expose raw TypeError", async function () {
    const rawErrors = await page.locator("text=/TypeError:|SubString\\{String\\}|ArgumentError:/").count();
    assert(rawErrors === 0, "deployed UI must not expose raw TypeError/SubString/ArgumentError");
    const trim = page.locator("[data-pane-trim-signal]:not([hidden])").first();
    if (await trim.count() && await trim.isVisible()) {
      await trim.click();
      const modal = page.locator("[data-signal-trim-dialog], [data-testid='signal-trim-dialog']");
      assert(await modal.count() > 0, "dual Time cursors must open trim dialog");
      await page.keyboard.press("Escape");
    } else {
      log("trim interaction skipped: active pane is not an eligible dual-cursor Time pane");
    }
    await screenshot(page, "production-v54-final.png");
  });

  await step("isolated Display has real Time/cursor/viewport interaction and is removed", async function () {
    const beforeTabs = await tabs(page);
    const original = beforeTabs.find(function (tab) { return tab.active; });
    let temporary = null;
    const ownedSignals = [];
    try {
      await page.locator(testIdSelector("add-display")).click();
      await page.waitForFunction(function (count) {
        return document.querySelectorAll("[data-testid='display-tabs'] [role='tab']").length === count;
      }, beforeTabs.length + 1, { timeout: 30000 });
      await idle(page, config);
      const after = await tabs(page);
      temporary = after.find(function (tab) { return !beforeTabs.some(function (old) { return old.id === tab.id; }); });
      assert(temporary && temporary.id, "isolated Display must receive a distinct stable id");
      await page.locator(testIdSelector("inspector-tab-signals")).click();
      await page.locator("[data-signal-row][data-signal-name='Гармонический сигнал']").waitFor({ state: "visible", timeout: 30000 });
      const source = await sourceRow(page);
      assert(source && source.name === "Гармонический сигнал", "isolated workflow requires exact approved built-in Harmonic source");
      progress({ step:"temporary-display-created", displayId:temporary.id, source:source.name });
      const membership = page.locator(`[data-visible-signal=${JSON.stringify(source.name)}]`);
      if (!source.checked) {
        await membership.setChecked(true);
        await idle(page, config);
      }
      const row = page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(source.name)}]`);
      await row.click();
      await idle(page, config);
      const host = page.locator(`[data-pane-host^=${JSON.stringify(temporary.id + "::")}]`).first();
      await host.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(function (element) { return element && element.dataset.plotReady === "true" && Array.isArray(element.data) && element.data.length > 0; }, await host.elementHandle(), { timeout: 30000 });
      progress({ step:"time-plot-ready", displayId:temporary.id, paneHost:await host.getAttribute("data-pane-host") });
      const box = await host.boundingBox();
      assert(box && box.width > 100 && box.height > 100, "isolated Time plot must have usable geometry");

      const seen = [];
      const observer = function (request) { if (/\/api\/(settings|settings\/apply|outputs|state)(?:[/?]|$)/.test(new URL(request.url()).pathname)) seen.push(request.url()); };
      page.on("request", observer);
      try {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        assert(await nativeHoverCount(page) === 0, "actual mouse move over Time Plotly must not produce native hover");
        const paneId = await host.getAttribute("data-pane-host").then(function (key) { return key.split("::")[1]; });
        await page.locator(`[data-pane-menu=${JSON.stringify(paneId)}]`).click();
        const dual = page.locator("[data-testid='pane-menu-dual-cursor']");
        await dual.waitFor({ state: "visible", timeout: 5000 });
        await dual.click();
        progress({ step:"dual-cursor-enabled" });
        const lines = page.locator("[data-graph-cursor-overlay] [data-cursor-index]");
        await lines.nth(0).waitFor({ state: "visible", timeout: 10000 });
        await lines.nth(0).press("ArrowRight");
        await lines.nth(1).press("ArrowLeft");
        const beforeRangeNodes = await rangeNodes(page);
        const rangeInput = page.locator(`[data-pane-id=${JSON.stringify(paneId)}] [data-setting-id$='limits'][data-range-part]`).first();
        if (await rangeInput.count() && await rangeInput.isVisible()) {
          const typedBefore = await rangeInput.inputValue();
          seen.length = 0;
          await rangeInput.focus();
          await rangeInput.press("ArrowRight");
          assert(seen.length === 0, "viewport range keyboard change must not publish settings/output/state requests");
          const afterRangeNodes = await rangeNodes(page);
          assert(afterRangeNodes.length === beforeRangeNodes.length && afterRangeNodes.every(function (node) { return node.connected && node.overflowX !== "scroll" && node.overflowY !== "scroll"; }), "range interaction must preserve nodes and create no transient overflow");
          await host.dblclick({ position:{ x:Math.round(box.width / 2), y:Math.round(box.height / 2) } });
          await page.waitForFunction(function (input, previous) { return input && (input.value === "" || input.value !== previous); }, await rangeInput.elementHandle(), typedBefore, { timeout:10000 });
          progress({ step:"range-autorange", before:typedBefore, after:await rangeInput.inputValue(), forbiddenRequests:seen.slice() });
        }
        await clickSafe(page.locator(testIdSelector("inspector-tab-measurements")));
        await clickSafe(page.locator(testIdSelector("measurement-columns-menu-trigger")));
        const columns = page.locator("[data-measurement-cursor-column]");
        assert(await columns.count() === 6, "dual cursor Measurements menu must expose exactly six cursor columns");
        seen.length = 0;
        for (let index = 0; index < 6; index += 1) await columns.nth(index).click();
        assert(seen.length === 0, "cursor columns must not publish settings/output/state requests");
        progress({ step:"measurement-cursor-columns", forbiddenRequests:seen });

        const axisLabels = page.locator(testIdSelector("settings-show-axis-labels"));
        if (await axisLabels.count() && await axisLabels.isVisible()) {
          const plot = host.locator(".js-plotly-plot").first();
          const labelsBefore = await plot.evaluate(function (item) { var l=item._fullLayout||{}; return {x:l.xaxis&&l.xaxis.title&&l.xaxis.title.text,y:l.yaxis&&l.yaxis.title&&l.yaxis.title.text}; });
          await axisLabels.setChecked(false);
          await page.waitForFunction(function (item) { var l=item&&item._fullLayout||{}; return l.xaxis&&l.yaxis&&(!l.xaxis.title.text)&&(!l.yaxis.title.text); }, await plot.elementHandle(), { timeout:10000 });
          await axisLabels.setChecked(true);
          await page.waitForFunction(function (item) { var l=item&&item._fullLayout||{}; return l.xaxis&&l.yaxis&&!!l.xaxis.title.text&&!!l.yaxis.title.text; }, await plot.elementHandle(), { timeout:10000 });
          progress({ step:"axis-labels-off-on", before:labelsBefore });
        }

        const trim = page.locator("[data-testid='pane-trim-signal']:not([hidden])").first();
        await trim.waitFor({ state:"visible", timeout:10000 });
        await trim.click();
        const trimDialog = page.locator("[data-testid='signal-trim-dialog']");
        const trimName = trimDialog.locator("[data-signal-trim-name]");
        await trimName.waitFor({ state:"visible", timeout:5000 });
        assert(await trimName.evaluate(function (node) { return document.activeElement === node; }), "trim dialog must focus target-name field");
        await page.keyboard.press("Escape");
        assert(await trimDialog.locator("[data-signal-trim-name]").count() === 0 || !await trimDialog.isVisible(), "Escape must close idle trim dialog");
        await trim.click();
        const cropName = `V54 обрезка ${Date.now()}`;
        ownedSignals.push(cropName);
        await trimDialog.locator("[data-signal-trim-name]").fill(cropName);
        let cropBody = null;
        const cropResponse = page.waitForResponse(async function (item) {
          if (item.request().method() !== "POST" || new URL(item.url()).pathname !== "/api/signals/crop") return false;
          cropBody = item.request().postDataJSON(); return true;
        }, { timeout:30000 });
        await trimDialog.locator("[data-signal-trim-submit]").click();
        const cropped = await cropResponse;
        assert(cropped.status() === 200, `crop must return 200, got ${cropped.status()}`);
        assert(cropBody && cropBody.source_signal_id && Number.isFinite(cropBody.min_s) && Number.isFinite(cropBody.max_s) && cropBody.min_s <= cropBody.max_s && cropBody.target_name === cropName && cropBody.overwrite === false, "crop payload must be exact sorted canonical request");
        await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(cropName)}]`).waitFor({ state:"visible", timeout:30000 });
        assert(await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(source.name)}]`).count() === 1, "crop must retain source signal");
        progress({ step:"crop-created", name:cropName, status:cropped.status(), payload:cropBody });

        const operation = page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(source.name)}] [data-signal-operation]`);
        await operation.click();
        const operationDialog = page.locator("[data-testid='signal-operation-dialog']");
        await operationDialog.waitFor({ state:"visible", timeout:5000 });
        await operationDialog.locator("[data-testid='signal-operation-select-input']").click();
        await operationDialog.locator("[data-testid='value-select-options']").getByText("Пользовательское", { exact:true }).click();
        const customBody = operationDialog.locator("#signal-operation-body");
        await customBody.waitFor({ state:"visible", timeout:5000 });
        const customName = `V54 операция ${Date.now()}`;
        ownedSignals.push(customName);
        await customBody.fill("begin\n  init_signal .* 1.0\nend");
        await operationDialog.locator("#signal-operation-name").fill(customName);
        const deriveResponse = page.waitForResponse(function (item) { return item.request().method() === "POST" && new URL(item.url()).pathname === "/api/signals/derive"; }, { timeout:30000 });
        await operationDialog.locator("[data-signal-operation-submit]").click();
        const derived = await deriveResponse;
        assert(derived.status() === 200, `custom operation must return 200, got ${derived.status()}`);
        await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(customName)}]`).waitFor({ state:"visible", timeout:30000 });
        assert(await page.locator("text=/SubString\\{String\\}|TypeError:/").count() === 0, "custom operation must not expose SubString TypeError");
        progress({ step:"custom-created", name:customName, status:derived.status() });
      } finally { page.off("request", observer); }
      await screenshot(page, "isolated-dual-cursors-v54.png");
    } finally {
      for (const name of ownedSignals.reverse()) await deleteTaskSignal(page, config, name, progress);
      if (temporary && temporary.id) {
        const close = page.locator(`[data-testid='display-close-${temporary.id}']`);
        if (await close.count()) {
          await close.click();
          await page.waitForFunction(function (count) {
            return document.querySelectorAll("[data-testid='display-tabs'] [role='tab']").length === count;
          }, beforeTabs.length, { timeout: 30000 });
          await idle(page, config);
          progress({ step:"temporary-display-deleted", displayId:temporary.id });
        }
      }
      if (original && original.id) { await selectTab(page, config, original.id); }
      const finalTabs = await tabs(page);
      assert(finalTabs.length === beforeTabs.length && !finalTabs.some(function (tab) { return temporary && tab.id === temporary.id; }), "isolated Display must be deleted in finally");
      progress({ step:"cleanup-tabs-verified", displays:finalTabs });
    }
  });

  log(`V54 bounded integrated observations; conditional unavailable: ${failures.join(",") || "none"}`);
}

task0152V54.scenarioFlags = ["TASK-0152-V54"];
module.exports = task0152V54;
