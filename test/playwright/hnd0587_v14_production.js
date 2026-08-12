"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "7eb9a6f14d9ea842eb3319ee5870eb54a0653bd1";
const prototype = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html";
const out = path.resolve(__dirname, "artifacts/HND-0591-v14-postfix");

const report = {
  id: "HND-0591",
  e2e_mode: "new_functionality_regression",
  target,
  expected_revision: expectedRevision,
  design_ref: "architecture/design/TASK-0080-explicit-apply-flow/DESIGN.md",
  design_version: 14,
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"],
  browser_channel: "chrome",
  headless: false,
  browser_visibility: "foreground",
  worker_count: 1,
  checks: [],
  requests: [],
  screenshots: [],
  errors: [],
  opened_tab_count: 0,
  closed_tab_count: 0,
};

function save() {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function check(name, pass, detail, scope = "new_functionality") {
  report.checks.push({ name, scope, status: pass ? "passed" : "failed", detail });
  save();
  if (!pass && name.includes("revision")) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

async function screenshot(page, name) {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, animations: "disabled" });
  report.screenshots.push({ file, url: page.url(), viewport: page.viewportSize(), at: new Date().toISOString() });
  save();
}

function activateChrome() {
  try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); }
  catch (error) { report.activation_error = String(error); }
}

async function front(page) {
  await page.bringToFront();
  activateChrome();
}

function relevantRequest(response) {
  const url = response.url();
  if (!/\/api\/(?:status|state-lite|outputs\/active|peaks\/active|layouts|view)(?:\?|$)/.test(url)) return;
  report.requests.push({
    url,
    method: response.request().method(),
    status: response.status(),
    at: new Date().toISOString(),
  });
  save();
}

async function stateLite(page) {
  return page.evaluate(async () => {
    const response = await fetch("./api/state-lite", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
}

function contextOf(state) {
  const displayId = state.active_display_id;
  const layoutEntry = (state.layouts || []).find((entry) => entry.display_id === displayId);
  const layout = layoutEntry && layoutEntry.layout;
  const paneId = layout && (layout.active_pane_id || (layout.panes && layout.panes[0] && layout.panes[0].id));
  const pane = layout && layout.panes && layout.panes.find((item) => item.id === paneId);
  return { displayId, paneId, pane, layout };
}

async function prototypeWalkthrough(page) {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await front(page);
    await page.goto(prototype, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => !!window.__TASK0080_DESIGN__);
    await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
    await page.locator("[data-inspector-page='peaks']").click();
    const start = await page.locator("[data-design-id='extrema-start']").innerText();
    check(`prototype start ${viewport.width}x${viewport.height}`, start === "Рассчет экстремумы для области 1\nРассчитать\nНастроить рассчет", { start, viewport }, "design");
    await screenshot(page, `prototype-start-${viewport.width}x${viewport.height}`);
    await page.locator("[data-design-id='extrema-configure']").click();
    const configured = await page.evaluate(() => ({
      settingsSelected: document.querySelector("[data-settings-page='peaks']")?.getAttribute("aria-selected"),
      targetCount: document.querySelectorAll(".plot-pane.is-extrema-settings-target").length,
      footerButtons: ["extrema-values", "settings-apply"].map((id) => document.querySelector(`[data-design-id='${id}']`)).filter((node) => node && !node.hidden && getComputedStyle(node).display !== "none").map((node) => node.textContent.trim()),
      statusPosition: getComputedStyle(document.querySelector("[data-settings-status]")).position,
    }));
    check(`prototype configure/footer ${viewport.width}x${viewport.height}`, configured.settingsSelected === "true" && configured.targetCount === 1 && JSON.stringify(configured.footerButtons) === JSON.stringify(["Показать значения", "Применить"]) && configured.statusPosition === "absolute", configured, "design");
    await screenshot(page, `prototype-configure-${viewport.width}x${viewport.height}`);
    await page.locator("[data-design-id='extrema-values']").click();
    const values = await page.evaluate(() => ({
      lowerSelected: document.querySelector("[data-inspector-page='peaks']")?.getAttribute("aria-selected"),
      targetCount: document.querySelectorAll(".plot-pane.is-extrema-settings-target").length,
    }));
    check(`prototype Values ${viewport.width}x${viewport.height}`, values.lowerSelected === "true" && values.targetCount === 1, values, "design");
  }
}

async function waitPlot(page, paneId) {
  await page.waitForFunction((id) => {
    const host = document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`);
    return host && host.classList.contains("js-plotly-plot") && host.dataset.plotReady === "true";
  }, paneId, { timeout: 180000 });
}

async function plotIdentity(page, paneId) {
  return page.evaluate((id) => {
    const host = document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`);
    if (!host) return null;
    host.dataset.hnd0587Identity ||= `host-${Date.now()}`;
    return { id: host.dataset.hnd0587Identity, baseTraces: (host.data || []).filter((trace) => !(trace.meta && trace.meta.signal_analyser_peaks_overlay)).length };
  }, paneId);
}

async function waitExtremaTerminal(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-testid='peaks-table-scroll']");
    return root && (root.querySelector("[data-testid='peaks-table']") || root.querySelector("[data-testid='peaks-empty']") || root.querySelector("[data-testid='peaks-error']"));
  }, null, { timeout: 180000 });
}

(async () => {
  let browser;
  let context;
  let prototypePage;
  let productionPage;
  let baselineBindings = null;
  let selectedSignal = null;
  let bindingChanged = false;
  let restored = false;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_page_urls = context.pages().map((page) => page.url());

    prototypePage = await context.newPage();
    report.opened_tab_count += 1;
    await prototypeWalkthrough(prototypePage);

    productionPage = await context.newPage();
    report.opened_tab_count += 1;
    productionPage.on("response", relevantRequest);
    productionPage.on("pageerror", (error) => report.errors.push(`pageerror: ${String(error)}`));
    productionPage.on("console", (message) => { if (message.type() === "error" && !/favicon\.ico/.test(message.text())) report.errors.push(`console: ${message.text()}`); });
    await productionPage.setViewportSize({ width: 1024, height: 768 });
    await front(productionPage);
    const rootResponse = await productionPage.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
    await productionPage.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 });
    const status = await productionPage.evaluate(async () => {
      const response = await fetch("./api/status", { cache: "no-store" });
      return { status: response.status, body: await response.json() };
    });
    check("production availability and exact revision", rootResponse && rootResponse.status() === 200 && status.status === 200 && status.body.ready === true && status.body.runtime_revision === expectedRevision, { rootStatus: rootResponse && rootResponse.status(), status }, "quick");

    const initialState = await stateLite(productionPage);
    const initialContext = contextOf(initialState.body);
    baselineBindings = Array.from(initialContext.pane && initialContext.pane.signal_bindings || []);
    report.baseline = { state_revision: initialState.body.state_revision, displayId: initialContext.displayId, paneId: initialContext.paneId, bindings: baselineBindings, rows: initialContext.layout && initialContext.layout.rows, columns: initialContext.layout && initialContext.layout.columns };
    const preOpenRequests = report.requests.filter((item) => /\/api\/(?:outputs\/active|peaks\/active)/.test(item.url));
    const emptyUi = await productionPage.evaluate((paneId) => ({
      exact: document.querySelector(`[data-testid='pane-empty-${CSS.escape(paneId)}']`)?.textContent.trim(),
      plotHosts: document.querySelectorAll(".plot-chart,[data-pane-host]").length,
      loaders: document.querySelectorAll(".plot-initial-loading").length,
      panes: document.querySelectorAll("[data-pane-id]").length,
    }), initialContext.paneId);
    check("fresh 1x1 pane is exact empty state", baselineBindings.length === 0 && initialContext.layout.rows === 1 && initialContext.layout.columns === 1 && emptyUi.exact === "Выберете сигнал для отображения" && emptyUi.plotHosts === 0 && emptyUi.loaders === 0 && emptyUi.panes === 1, { baselineBindings, layout: initialContext.layout, emptyUi });
    check("opening application does not request outputs or Extrema", preOpenRequests.length === 0, preOpenRequests);
    await screenshot(productionPage, "production-empty-1024x768");

    await productionPage.getByTestId("inspector-tab-signals").click();
    const checkbox = productionPage.locator("input[data-visible-signal]").first();
    await checkbox.waitFor({ state: "visible", timeout: 30000 });
    selectedSignal = await checkbox.getAttribute("data-visible-signal");
    const layoutWait = productionPage.waitForResponse((response) => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout: 60000 });
    await checkbox.check();
    const bindResponse = await layoutWait;
    check("signal bound through UI", bindResponse.status() === 200, { signal: selectedSignal, status: bindResponse.status() });
    bindingChanged = baselineBindings.indexOf(selectedSignal) < 0;
    await waitPlot(productionPage, initialContext.paneId);
    const plotBefore = await plotIdentity(productionPage, initialContext.paneId);

    const beforeOpen = report.requests.length;
    await productionPage.getByTestId("inspector-tab-peaks").click();
    await productionPage.getByTestId("extrema-start").waitFor({ state: "visible", timeout: 60000 });
    const firstOpen = await productionPage.evaluate(() => ({
      text: document.querySelector("[data-testid='extrema-start']")?.innerText,
      table: document.querySelectorAll("[data-testid='peaks-table']").length,
      loader: document.querySelectorAll("[data-testid='peaks-loader']").length,
    }));
    const openRequests = report.requests.slice(beforeOpen);
    check("Extrema first-open is explicit start without calculation", firstOpen.text === "Рассчет экстремумы для области 1\nРассчитать\nНастроить рассчет" && firstOpen.table === 0 && firstOpen.loader === 0 && openRequests.filter((item) => item.method === "POST" && /\/api\/peaks\/active/.test(item.url)).length === 0, { firstOpen, openRequests });
    await screenshot(productionPage, "production-extrema-start-1024x768");

    const beforeConfigure = report.requests.length;
    await productionPage.getByTestId("extrema-configure").click();
    await productionPage.getByTestId("extrema-mode-trigger").waitFor({ state: "visible", timeout: 60000 });
    const configured = await productionPage.evaluate(() => {
      const pane = document.querySelector(".plot-pane.is-extrema-settings-target");
      const style = pane && getComputedStyle(pane);
      const footer = document.querySelector("[data-testid='settings-footer']");
      const status = footer && footer.querySelector("[data-settings-status]");
      return {
        settingsSelected: document.querySelector("[data-testid='settings-tab-peaks']")?.getAttribute("aria-selected"),
        settingsFocused: document.activeElement?.dataset?.testid,
        targetCount: document.querySelectorAll(".plot-pane.is-extrema-settings-target").length,
        targetOutline: style && { boxShadow: style.boxShadow, outlineWidth: style.outlineWidth },
        footerButtons: footer ? Array.from(footer.querySelectorAll("button")).filter((node) => !node.hidden && getComputedStyle(node).display !== "none").map((node) => node.textContent.trim()) : [],
        status: status && { position: getComputedStyle(status).position, width: getComputedStyle(status).width, text: status.textContent.trim() },
        mode: document.querySelector("[data-testid='extrema-mode-trigger']")?.textContent.trim(),
        fields: Array.from(document.querySelectorAll("[data-peaks-setting]")).map((node) => ({ id: node.dataset.peaksSetting, value: node.value })),
      };
    });
    const configureRequests = report.requests.slice(beforeConfigure).filter((item) => /\/api\/(?:peaks\/active|outputs\/active)/.test(item.url));
    const expectedFields = [
      { id: "number_of_peaks", value: "5" },
      { id: "maximum_cutoff", value: "-Inf" },
      { id: "minimum_distance_samples", value: "1" },
      { id: "threshold", value: "0" },
    ];
    check("Configure opens settings, highlights 1x1 target and has exact footer/default", configured.settingsSelected === "true" && configured.settingsFocused === "settings-tab-peaks" && configured.targetCount === 1 && /rgb\(22, 134, 195\)|#1686c3/i.test(configured.targetOutline.boxShadow) && JSON.stringify(configured.footerButtons) === JSON.stringify(["Показать значения", "Применить"]) && configured.status.position === "absolute" && configured.mode === "Максимумы" && JSON.stringify(configured.fields) === JSON.stringify(expectedFields), { configured, configureRequests });
    check("Configure performs no calculation POST or output refetch", configureRequests.filter((item) => item.method === "POST" && /\/api\/peaks\/active/.test(item.url)).length === 0 && configureRequests.filter((item) => /\/api\/outputs\/active/.test(item.url)).length === 0, configureRequests);
    await screenshot(productionPage, "production-configure-1024x768");

    await productionPage.getByTestId("extrema-values").click();
    const values = await productionPage.evaluate(() => ({
      selected: document.querySelector("[data-testid='inspector-tab-peaks']")?.getAttribute("aria-selected"),
      focused: document.activeElement?.dataset?.testid,
      targetCount: document.querySelectorAll(".plot-pane.is-extrema-settings-target").length,
      start: document.querySelector("[data-testid='extrema-start']")?.innerText,
    }));
    check("Values returns to Extrema without calculation and retains target", values.selected === "true" && values.focused === "inspector-tab-peaks" && values.targetCount === 1 && values.start === "Рассчет экстремумы для области 1\nРассчитать\nНастроить рассчет", values);

    await productionPage.setViewportSize({ width: 1440, height: 900 });
    await front(productionPage);
    await screenshot(productionPage, "production-values-1440x900");
    const calculationStart = report.requests.length;
    await productionPage.getByTestId("extrema-calculate").click();
    const immediate = await productionPage.evaluate(() => ({ loader: !!document.querySelector("[data-testid='peaks-loader']"), disabled: document.querySelector("[data-testid='extrema-calculate']")?.disabled }));
    const postResponse = await productionPage.waitForResponse((response) => /\/api\/peaks\/active(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout: 120000 });
    await waitExtremaTerminal(productionPage);
    const plotAfter = await plotIdentity(productionPage, initialContext.paneId);
    const terminal = await productionPage.evaluate(() => ({
      table: !!document.querySelector("[data-testid='peaks-table']"),
      empty: !!document.querySelector("[data-testid='peaks-empty']"),
      error: document.querySelector("[data-testid='peaks-error']")?.innerText || null,
      rows: document.querySelectorAll("[data-testid='peaks-table'] tbody tr").length,
    }));
    const calculationRequests = report.requests.slice(calculationStart).filter((item) => /\/api\/(?:peaks\/active|outputs\/active)/.test(item.url));
    const postCount = calculationRequests.filter((item) => item.method === "POST" && /\/api\/peaks\/active/.test(item.url)).length;
    const pollMethods = calculationRequests.filter((item) => /\/api\/peaks\/active/.test(item.url)).slice(1).map((item) => item.method);
    const outputCount = calculationRequests.filter((item) => /\/api\/outputs\/active/.test(item.url)).length;
    check("Calculate uses one explicit POST then GET polling", immediate.loader === true && postResponse.status() === 200 && postCount === 1 && pollMethods.every((method) => method === "GET"), { immediate, postStatus: postResponse.status(), calculationRequests });
    check("calculation reaches values/empty result and preserves Plotly host without output reload", !terminal.error && (terminal.table || terminal.empty) && plotBefore && plotAfter && plotBefore.id === plotAfter.id && plotBefore.baseTraces === plotAfter.baseTraces && outputCount === 0, { terminal, plotBefore, plotAfter, outputCount });
    await screenshot(productionPage, "production-extrema-result-1440x900");

    if (bindingChanged) {
      await productionPage.getByTestId("inspector-tab-signals").click();
      const restoreCheckbox = productionPage.locator(`input[data-visible-signal='${selectedSignal.replace(/'/g, "\\'")}']`);
      const restoreWait = productionPage.waitForResponse((response) => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout: 60000 });
      await restoreCheckbox.uncheck();
      const restoreResponse = await restoreWait;
      const finalState = await stateLite(productionPage);
      const finalContext = contextOf(finalState.body);
      const finalBindings = Array.from(finalContext.pane && finalContext.pane.signal_bindings || []);
      restored = restoreResponse.status() === 200 && JSON.stringify(finalBindings) === JSON.stringify(baselineBindings);
      report.restoration = { status: restored ? "verified" : "failed", baselineBindings, finalBindings, responseStatus: restoreResponse.status() };
      check("signal membership baseline restored through UI", restored, report.restoration, "cleanup");
      await productionPage.locator(`[data-testid='pane-empty-${initialContext.paneId}']`).waitFor({ state: "visible", timeout: 60000 });
    } else {
      restored = true;
      report.restoration = { status: "not-needed", baselineBindings };
    }
  } catch (error) {
    report.errors.push(String(error && error.stack || error));
  } finally {
    if (productionPage && !productionPage.isClosed() && bindingChanged && !restored && selectedSignal && baselineBindings) {
      try {
        await front(productionPage);
        if ((await productionPage.getByTestId("inspector-tab-signals").getAttribute("aria-selected")) !== "true") await productionPage.getByTestId("inspector-tab-signals").click();
        const checkbox = productionPage.locator(`input[data-visible-signal='${selectedSignal.replace(/'/g, "\\'")}']`);
        if (await checkbox.count() && await checkbox.isChecked()) {
          const wait = productionPage.waitForResponse((response) => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout: 60000 });
          await checkbox.uncheck();
          await wait;
        }
        const finalState = await stateLite(productionPage);
        const finalBindings = Array.from(contextOf(finalState.body).pane?.signal_bindings || []);
        restored = JSON.stringify(finalBindings) === JSON.stringify(baselineBindings);
        report.restoration = { status: restored ? "verified-in-finally" : "failed", baselineBindings, finalBindings };
      } catch (error) {
        report.errors.push(`restoration: ${String(error && error.stack || error)}`);
      }
    }
    for (const page of [prototypePage, productionPage]) {
      if (page && !page.isClosed()) {
        try { await page.close(); report.closed_tab_count += 1; }
        catch (error) { report.errors.push(`tab cleanup: ${String(error)}`); }
      }
    }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    report.summary = {
      planned: report.checks.length,
      passed: report.checks.filter((item) => item.status === "passed").length,
      failed: report.checks.filter((item) => item.status === "failed").length,
      success_rate: report.checks.length ? Math.round(report.checks.filter((item) => item.status === "passed").length / report.checks.length * 1000) / 10 : 0,
    };
    save();
    if (browser) await browser.close();
    process.stdout.write(`${JSON.stringify({ summary: report.summary, errors: report.errors, restoration: report.restoration, cleanup: report.tab_cleanup_status }, null, 2)}\n`);
    if (report.errors.length || report.checks.some((item) => item.status === "failed") || report.tab_cleanup_status !== "passed" || (bindingChanged && !restored)) process.exitCode = 1;
  }
})();
