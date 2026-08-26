"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const APP_URL = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const REVISION = "61c519a6d6c13359a5e687c65565858606af38f6";
const artifacts = path.resolve("test/playwright/artifacts/TASK-0093");
const report = { id:"HND-TASK-0093-MEASUREMENTS-ONLY-E2E-FINAL", checks:[], opened_tab_count:0, closed_tab_count:0 };
const metricHeaders = {
  minimum:["Минимум", "Время минимума"],
  maximum:["Максимум", "Время максимума"],
  mean:["Среднее"],
  median:["Медиана"],
  peak_to_peak:["Размах"],
  rms:["СКЗ"]
};

fs.mkdirSync(artifacts, { recursive:true });
function check(name, passed, detail) { report.checks.push({ name, status:passed ? "passed" : "failed", detail:detail || {} }); }

(async () => {
  let browser;
  let page;
  let originalKinds = [];
  let toggledKind = null;
  try {
    browser = await chromium.launch({ channel:"chrome", headless:false, args:["--host-resolver-rules=MAP engee.com 51.250.50.170"] });
    const context = browser.contexts()[0] || await browser.newContext({ viewport:{ width:1440, height:900 } });
    page = await context.newPage();
    report.opened_tab_count += 1;
    await page.setViewportSize({ width:1440, height:900 });
    await page.bringToFront();
    await page.goto(APP_URL, { waitUntil:"commit", timeout:120000 });
    await page.getByTestId("app-shell").waitFor({ state:"visible", timeout:180000 });

    const status = await page.evaluate(async () => {
      const response = await fetch("./api/status", { cache:"no-store" });
      return { status:response.status, body:await response.json() };
    });
    check("exact ready revision", status.status === 200 && status.body.ready && status.body.runtime_revision === REVISION, status);
    if (status.body.runtime_revision !== REVISION) throw new Error("Unexpected runtime revision");

    let fullStateRequests = 0;
    page.on("request", request => {
      const pathname = new URL(request.url()).pathname;
      if (request.method() === "GET" && pathname.endsWith("/api/state")) fullStateRequests += 1;
    });

    await page.getByTestId("inspector-tab-measurements").click();
    const table = page.getByTestId("measurement-table");
    await table.waitFor({ state:"visible", timeout:180000 });
    const initial = await table.evaluate(node => ({
      headers:Array.from(node.querySelectorAll("th"), cell => cell.textContent.trim()),
      rows:node.querySelectorAll("tbody tr").length
    }));
    const pane = page.getByTestId("inspector-pane-measurements");
    const search = page.getByTestId("measurement-search-input");
    check("Russian terminal table with search and no checkboxes", initial.rows > 0 && await search.isVisible() && await pane.locator("input[type=checkbox]").count() === 0 && ["Имя", "Цвет", "Начало области", "Конец области"].every(value => initial.headers.includes(value)), { initial, fullStateRequests });

    await page.getByTestId("statistics-settings-tab").click();
    const metricInputs = page.locator("input[data-setting-id^='measurement.']");
    await metricInputs.first().waitFor({ state:"visible", timeout:30000 });
    originalKinds = await metricInputs.evaluateAll(inputs => inputs.filter(input => input.checked).map(input => input.dataset.settingId.slice("measurement.".length)));
    const expectedInitial = ["Имя", "Цвет", "Начало области", "Конец области"].concat(originalKinds.flatMap(kind => metricHeaders[kind] || []));
    check("columns exactly match checked measurement kinds", JSON.stringify(initial.headers) === JSON.stringify(expectedInitial), { originalKinds, expectedInitial, actual:initial.headers });

    toggledKind = originalKinds[0] || null;
    if (!toggledKind) throw new Error("No checked measurement kind available for reversible verification");
    const toggle = page.locator(`input[data-setting-id='measurement.${toggledKind}']`);
    const removeView = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/view") && response.ok(), { timeout:180000 });
    const removeState = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/api/state") && response.ok(), { timeout:180000 });
    await toggle.uncheck();
    await removeView;
    await removeState;
    await table.waitFor({ state:"visible", timeout:180000 });
    await page.waitForFunction(headers => headers.every(header => !Array.from(document.querySelectorAll("[data-testid='measurement-table'] th"), cell => cell.textContent.trim()).includes(header)), metricHeaders[toggledKind], { timeout:180000 });
    const afterRemove = await table.locator("th").allTextContents();
    check("unchecked metric columns disappear", metricHeaders[toggledKind].every(header => !afterRemove.map(value => value.trim()).includes(header)), { toggledKind, afterRemove });
    await page.screenshot({ path:path.join(artifacts, "measurements-dynamic-unchecked.png"), fullPage:true });

    const restoreView = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/view") && response.ok(), { timeout:180000 });
    const restoreState = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/api/state") && response.ok(), { timeout:180000 });
    await toggle.check();
    await restoreView;
    await restoreState;
    await table.waitFor({ state:"visible", timeout:180000 });
    await page.waitForFunction(headers => headers.every(header => Array.from(document.querySelectorAll("[data-testid='measurement-table'] th"), cell => cell.textContent.trim()).includes(header)), metricHeaders[toggledKind], { timeout:180000 });
    const afterRestore = await table.locator("th").allTextContents();
    check("restored metric columns return", metricHeaders[toggledKind].every(header => afterRestore.map(value => value.trim()).includes(header)), { toggledKind, afterRestore });

    await search.fill("__нет_такого_сигнала__");
    check("search hides nonmatching row", await table.locator("tbody tr").count() === 0, {});
    await search.fill("");
    check("search restores matching row", await table.locator("tbody tr").count() > 0, {});
    await page.screenshot({ path:path.join(artifacts, "measurements-dynamic-restored.png"), fullPage:true });

    const finalState = await page.evaluate(async () => (await fetch("./api/state-lite", { cache:"no-store" })).json());
    const active = finalState.displays.find(display => display.id === finalState.active_display_id);
    check("production settings restored", JSON.stringify(active.measurement_kinds) === JSON.stringify(originalKinds), { originalKinds, actual:active.measurement_kinds });
  } catch (error) {
    report.error = String(error && error.stack || error);
    check("unhandled", false, { error:report.error });
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
      report.closed_tab_count += 1;
    }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    report.summary = {
      planned:report.checks.length,
      passed:report.checks.filter(item => item.status === "passed").length,
      failed:report.checks.filter(item => item.status === "failed").length
    };
    fs.writeFileSync(path.join(artifacts, "measurements-only-final-report.json"), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    process.stdout.write(JSON.stringify(report.summary) + "\n");
  }
})();
