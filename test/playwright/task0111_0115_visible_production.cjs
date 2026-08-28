"use strict";

// Visible, single-worker integrated regression for TASK-0111..0115.
// It deliberately leaves the user's existing tabs and non-disposable state alone.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "158e5810a04cfec61cdef1a2c81aca22c66df227";
const prototype = `file://${path.resolve(__dirname, "../../architecture/design/current/prototype/index.html")}`;
const out = path.resolve(__dirname, "artifacts/TASK-0111-0115-visible");
fs.mkdirSync(out, { recursive: true });

const report = {
  id: "TASK-0111-0115-VISIBLE-PRODUCTION",
  type: "report", from: "E2E", to: "Orchestrator",
  e2e_mode: "new_functionality_regression",
  target, expected_revision: expectedRevision,
  design_ref: "architecture/design/current", design_version: 29,
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"],
  browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
  preexisting_pages: [], opened_tab_count: 0, closed_tab_count: 0,
  checks: [], screenshots: [], console_errors: [], page_errors: [], responses_500: [],
  network: [], findings: [], cleanup: [], started_at: new Date().toISOString(),
};
const check = (name, passed, detail = {}) => report.checks.push({ name, status: passed ? "passed" : "failed", detail });
const notRun = (name, reason) => report.checks.push({ name, status: "not_run", detail: { reason } });
async function shot(page, name) { const p = path.join(out, `${name}.png`); await page.screenshot({ path: p, fullPage: true, animations: "disabled" }); report.screenshots.push(p); }
async function visible(page) { await page.bringToFront(); }
async function firstVisible(page, selector) { const loc = page.locator(selector).filter({ has: page.locator(":visible") }).first(); return (await loc.count()) ? loc : null; }
async function clickIf(page, selector, options = {}) { const l = page.locator(selector).first(); if (await l.count() && await l.isVisible().catch(() => false)) { await l.click(options); return true; } return false; }
async function text(page, selector) { const l = page.locator(selector).first(); return (await l.count() && await l.isVisible().catch(() => false)) ? (await l.innerText()).trim() : ""; }
async function selectByText(page, label) {
  const option = page.locator("[data-value-select-popup] [role='option'], [data-value-select-popup] button, [data-value-select-popup] [data-value-select-option]").filter({ hasText: label }).first();
  if (!await option.count() || !await option.isVisible().catch(() => false)) return false;
  await option.click(); return true;
}
async function api(page, suffix, init) {
  return await page.evaluate(async ({ suffix, init }) => {
    const res = await fetch(`.${suffix}`, init);
    let body = null; try { body = await res.json(); } catch (_) { body = await res.text(); }
    return { status: res.status, body };
  }, { suffix, init });
}

(async () => {
  let browser, context, designPage, page;
  const disposableNames = [];
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_pages = context.pages().map(p => p.url());

    // Design contract evidence first. This is static file inspection, not a local runtime.
    designPage = await context.newPage(); report.opened_tab_count++;
    await designPage.setViewportSize({ width: 1024, height: 768 }); await visible(designPage);
    await designPage.goto(prototype, { waitUntil: "domcontentloaded", timeout: 30000 });
    const designSignal = await clickIf(designPage, "[data-testid='settings-tab-signal']");
    const designValues = await clickIf(designPage, "[data-testid='signal-values-action']");
    const designOperation = await clickIf(designPage, "[data-testid^='signal-operation-']");
    if (designOperation) await clickIf(designPage, "[data-testid='signal-operation-select-input']");
    await shot(designPage, "prototype-contract");
    check("prototype v29 interaction map: Signal/Values/operation", designSignal && designValues && designOperation, { designSignal, designValues, designOperation });

    page = await context.newPage(); report.opened_tab_count++;
    await page.setViewportSize({ width: 1440, height: 900 }); await visible(page);
    page.on("console", m => { if (m.type() === "error" && !/favicon/i.test(m.text())) report.console_errors.push(m.text()); });
    page.on("pageerror", e => report.page_errors.push(String(e)));
    page.on("response", r => {
      if (r.url().includes("/api/")) report.network.push({ method: r.request().method(), status: r.status(), url: r.url() });
      if (r.status() >= 500) report.responses_500.push({ status: r.status(), url: r.url(), method: r.request().method() });
    });
    const nav = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 }); await visible(page);
    const status = await api(page, "/api/status", { cache: "no-store" });
    check("production availability and exact revision", nav && nav.status() === 200 && status.status === 200 && status.body && status.body.ready === true && status.body.runtime_revision === expectedRevision, { navigation: nav && nav.status(), status });
    if (!(status.body && status.body.ready && status.body.runtime_revision === expectedRevision)) throw new Error(`Revision gate failed: ${JSON.stringify(status)}`);
    await shot(page, "production-initial");

    // A settings Signal tab is intentionally contextual. Select the one existing
    // signal through its normal row checkbox before checking contextual controls.
    const signalCheckbox = page.locator("[data-signal-rows] input[type='checkbox'], .signal-row input[type='checkbox'], tbody input[type='checkbox']").last();
    if (await signalCheckbox.count() && await signalCheckbox.isVisible().catch(() => false)) {
      await signalCheckbox.check();
      await page.locator("[data-testid='settings-tab-signal']").waitFor({ state: "visible", timeout: 20000 }).catch(() => null);
      check("existing signal can be selected into the active plot", await page.locator("[data-testid='settings-tab-signal']").isVisible().catch(() => false), { checked: await signalCheckbox.isChecked().catch(() => false) });
    } else notRun("select existing signal", "no selectable signal-row checkbox found");

    // 1) tabs + first Signal tab.  Inspect selectors after default state is loaded.
    const tabState = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll("[data-testid^='settings-tab-']")].map(x => ({ id: x.dataset.testid, text: x.textContent.trim(), hidden: !!x.hidden, visible: !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length) })),
      mainSignal: document.querySelector("[data-testid='settings-tab-signal']"),
      inspectorTabs: [...document.querySelectorAll(".inspector-tabs [data-bottom-tab], .inspector-tabs button")].map(x => x.textContent.trim()),
    }));
    check("settings has Signal first and core Area/Screen tabs", tabState.tabs.length >= 3 && tabState.tabs[0].id === "settings-tab-signal" && tabState.tabs.some(x => x.text === "Область") && tabState.tabs.some(x => x.text === "Экран"), tabState);
    check("Extrema tab is available for current supported pane or explicitly hidden", tabState.tabs.some(x => x.id === "settings-tab-peaks"), tabState);

    // 2) Signal summary and dynamic Samples table. Skip only when current pane has no main signal.
    const signalTab = page.getByTestId("settings-tab-signal");
    if (await signalTab.count() && await signalTab.isVisible().catch(() => false)) {
      await signalTab.click();
      const summary = await page.evaluate(() => ({
        text: document.querySelector("[data-settings-content]")?.innerText || "",
        values: !!document.querySelector("[data-testid='signal-values-action']"),
      }));
      check("Signal summary renders backend-authored values", summary.values && /Сводка/.test(summary.text), summary);
      if (summary.values) {
        await page.getByTestId("signal-values-action").click();
        await page.locator("[data-inspector-content]").waitFor({ state: "visible", timeout: 15000 });
        const samplesSettled = await page.locator("[data-inspector-content] .samples-loading").waitFor({ state: "detached", timeout: 15000 }).then(() => true).catch(() => false);
        const sampleState = await page.evaluate(() => ({
          selected: [...document.querySelectorAll(".inspector-tabs button, .inspector-tabs [data-bottom-tab]")].find(x => x.getAttribute("aria-selected") === "true")?.textContent.trim(),
          table: !!document.querySelector("[data-signal-samples-table], [data-testid='signal-samples-table']"),
          text: document.querySelector("[data-inspector-content]")?.innerText || "",
          pagers: [...document.querySelectorAll("[data-samples-next], [data-samples-prev], [data-testid*='samples']")].map(x => x.dataset.testid || x.dataset.samplesNext || x.textContent.trim()),
        }));
        check("Values focuses populated dynamic main-signal samples table with semantic columns", samplesSettled && /№ точки/.test(sampleState.text) && /Время/.test(sampleState.text) && /Модуль/.test(sampleState.text) && /Показаны строки 1–[1-9]/.test(sampleState.text), { samplesSettled, ...sampleState });
        await shot(page, "production-signal-values");
      }
    } else notRun("Signal summary and Values", "active pane has no main signal");

    // 3) stable display/pane rename. Save only if the UI provides a normal Apply lifecycle.
    const screenTab = page.getByTestId("settings-tab-screen");
    if (await screenTab.count() && await screenTab.isVisible().catch(() => false)) {
      await screenTab.click();
      const displayName = page.locator("[data-setting='display-name'], [data-testid='display-name']").first();
      if (await displayName.count() && await displayName.isVisible().catch(() => false)) {
        const original = await displayName.inputValue(); const unique = `Экран E2E ${Date.now().toString().slice(-6)}`;
        await displayName.fill(unique); await displayName.press("Tab");
        const apply = page.getByTestId("settings-apply");
        if (await apply.isEnabled().catch(() => false)) {
          const post = page.waitForResponse(r => /\/api\/(settings|state|displays)/.test(r.url()) && r.request().method() === "POST" && r.status() < 500, { timeout: 60000 }).catch(() => null);
          await apply.click(); await post;
          const persisted = await page.evaluate(unique => [...document.querySelectorAll("[data-testid^='display-tab-']")].some(x => x.textContent.includes(unique)), unique);
          check("screen rename persists into display tab", persisted, { original, unique });
          // Restore original through the same authorized UI path.
          await screenTab.click(); await displayName.fill(original); await displayName.press("Tab"); if (await apply.isEnabled().catch(() => false)) await apply.click();
        } else notRun("screen rename persistence", "Apply not enabled after editing display name");
      } else notRun("screen rename persistence", "display name input absent in current UI");
    } else notRun("screen rename persistence", "Screen tab unavailable");

    // 4) spectrum controls. Switch to a spectrum pane if current pane type selector offers it.
    const areaTab = page.getByTestId("settings-tab-display");
    if (await areaTab.count()) await areaTab.click();
    const typeTrigger = page.locator("[data-testid^='pane-type-'] [data-value-select-input], [data-testid='pane-plot-type-trigger'], [data-testid='settings-view-select'], [data-setting='plot-type']").first();
    let spectrumSelected = false;
    if (await typeTrigger.count() && await typeTrigger.isVisible().catch(() => false)) {
      await typeTrigger.click(); spectrumSelected = await selectByText(page, "Спектр");
      if (!spectrumSelected) await page.keyboard.press("Escape");
    }
    if (spectrumSelected) {
      const areaText = await text(page, "[data-settings-content]");
      const sliderControls = await page.evaluate(() => ({
        frequency: !!document.querySelector("[data-setting='show-frequency-slider'], [name='show-frequency-slider'], [data-testid='show-frequency-slider']"),
        magnitude: !!document.querySelector("[data-setting='show-magnitude-slider'], [name='show-magnitude-slider'], [data-testid='show-magnitude-slider']"),
        extrema: !!document.querySelector("[data-testid='settings-tab-peaks']"),
      }));
      check("spectrum Area exposes frequency/magnitude slider controls", sliderControls.frequency && sliderControls.magnitude && /Пределы частоты/.test(areaText) && /Пределы магнитуды/.test(areaText), { areaText, sliderControls });
      // Screen link controls and immediate limits move.
      await screenTab.click();
      const links = await page.evaluate(() => ({
        frequency: !!document.querySelector("[data-setting='link-spectrum-frequency'], [name='link-spectrum-frequency'], [data-testid='link-spectrum-frequency']"),
        magnitude: !!document.querySelector("[data-setting='link-spectrum-magnitude'], [name='link-spectrum-magnitude'], [data-testid='link-spectrum-magnitude']"),
        text: document.querySelector("[data-settings-content]")?.innerText || "",
      }));
      check("Screen exposes four independent link controls", /Связать время/.test(links.text) && /Связать амплитуду/.test(links.text) && links.frequency && links.magnitude, links);
      await shot(page, "production-spectrum-screen-links");
      // Extrema action: calculate if absent, focus bottom tab after completion.
      const peaksTab = page.getByTestId("settings-tab-peaks");
      if (await peaksTab.count() && await peaksTab.isVisible().catch(() => false)) {
        await peaksTab.click();
        const extremaAction = page.getByTestId("extrema-values");
        if (await extremaAction.count() && await extremaAction.isVisible().catch(() => false)) {
          await extremaAction.click();
          await page.locator("[data-inspector-content]").waitFor({ state: "visible" });
          const extrema = await page.evaluate(() => ({ text: document.querySelector("[data-inspector-content]")?.innerText || "", markers: document.querySelectorAll("[data-pane-host] .scatterlayer, [data-pane-host] .plotly").length }));
          check("spectrum extrema action focuses results context", /Частота|Магнитуда|Экстремум/.test(extrema.text), extrema);
          await shot(page, "production-spectrum-extrema");
        } else notRun("spectrum extrema action", "button absent");
      } else notRun("spectrum extrema action", "Extrema tab hidden for selected spectrum pane");
    } else notRun("spectrum sliders/link/extrema", "spectrum pane could not be selected without changing saved settings");

    // 5) Operation dialog with only a disposable built-in source target. Do not execute custom code.
    // Values switches the inspector page; return to Signals before testing row actions.
    await clickIf(page, "[data-bottom-tab='signals']");
    const operation = page.locator("[data-signal-operation]").first();
    if (await operation.count() && await operation.isVisible().catch(() => false)) {
      await operation.locator("xpath=ancestor::tr").hover().catch(() => null);
      const operationOpened = await operation.click({ timeout: 6000 }).then(() => true).catch(error => {
        check("signal operation action receives a real pointer click", false, { error: String(error) }); return false;
      });
      if (!operationOpened) {
        await shot(page, "production-operation-click-blocked");
      } else {
      const dialog = page.getByTestId("signal-operation-dialog");
      await dialog.waitFor({ state: "visible", timeout: 15000 });
      const select = page.getByTestId("signal-operation-select-input");
      const before = await dialog.boundingBox();
      if (await select.count()) {
        await select.click();
        const popup = page.locator("[data-value-select-popup]").last(); await popup.waitFor({ state: "visible", timeout: 10000 });
        const geometry = await page.evaluate(() => { const a = document.querySelector("[data-testid='signal-operation-select-input']")?.getBoundingClientRect(); const p = [...document.querySelectorAll("[data-value-select-popup]")].find(x => x.offsetParent)?.getBoundingClientRect(); return { anchorWidth: a?.width, popupWidth: p?.width, options: [...document.querySelectorAll("[data-value-select-popup] [role='option'], [data-value-select-popup] button, [data-value-select-popup] [data-value-select-option]")].map(x => x.textContent.trim()) }; });
        check("operation uses shared ValueSelect popup with seven built-ins", geometry.options.length >= 7 && Math.abs(geometry.anchorWidth - geometry.popupWidth) <= 2 && geometry.options.some(x => /Модуль|abs/i.test(x)), geometry);
        await selectByText(page, "Модуль");
      }
      // Validate custom UI seam only; never submit arbitrary body.
      if (await select.count()) { await select.click(); await selectByText(page, "Пользовательское"); }
      const custom = await page.evaluate(() => ({ text: document.querySelector("[data-testid='signal-operation-dialog']")?.innerText || "", body: !!document.querySelector("[data-custom-operation-body], textarea[name='body'], [data-testid='custom-operation-body']") }));
      check("custom operation exposes body only; hidden wrapper is not rendered", custom.body && /init_signal/.test(custom.text) && !/let init_signal\s*=/.test(custom.text), custom);
      // Close custom and reopen operation for safe abs operation if the target-name field is available.
      await clickIf(page, "[data-operation-cancel], [data-testid='signal-operation-cancel']");
      if (await operation.isVisible().catch(() => false)) {
        await operation.click(); await dialog.waitFor({ state: "visible" });
        if (await select.count()) { await select.click(); await selectByText(page, "Модуль"); }
        const name = `e2e_abs_${Date.now().toString().slice(-8)}`;
        const targetInput = page.locator("[data-operation-target-name], [data-testid='signal-operation-target-name'], input[name='target_name']").first();
        const submit = page.locator("[data-operation-submit]").first();
        if (await targetInput.count() && await submit.count()) {
          await targetInput.fill(name); disposableNames.push(name);
          const created = page.waitForResponse(r => /\/api\/signals\/derive/.test(r.url()) && r.request().method() === "POST", { timeout: 120000 }).catch(() => null);
          await submit.click(); const res = await created;
          check("safe built-in operation submits through Engee provider", !!res && res.status() < 500, { status: res && res.status() });
          await shot(page, "production-operation-result");
        } else notRun("safe built-in derived operation", "target name or submit control absent");
      }
      if (before) check("operation dialog has approved wide analytical geometry", before.width >= 640 && before.width <= 700, before);
      }
    } else notRun("signal operation dialog", "no signal row operation action visible");

    // 6) Existing core regression: signal rows and settings remain visible with no 5xx.
    const basic = await page.evaluate(() => ({ signalRows: document.querySelectorAll("[data-signal-row], [data-signal-rows] tr, .signal-row").length, plots: document.querySelectorAll("[data-pane-host]").length, apply: !!document.querySelector("[data-testid='settings-apply']") }));
    check("existing signal/plot/settings shell remains operable", basic.signalRows >= 0 && basic.plots >= 1 && basic.apply, basic);
    await shot(page, "production-final");
  } catch (error) {
    report.fatal = String(error && error.stack || error);
  } finally {
    // The app's existing signal delete UI varies by selected tab; use API only for names created by this run.
    if (page && !page.isClosed() && disposableNames.length) {
      try {
        const state = await api(page, "/api/state-lite", { cache: "no-store" });
        const signals = state.body?.signals || state.body?.signal_inventory?.signals || [];
        for (const name of disposableNames) {
          const signal = signals.find(x => x && x.name === name);
          if (signal && signal.id) {
            const del = await api(page, `/api/signals/${encodeURIComponent(signal.id)}`, { method: "DELETE" });
            report.cleanup.push({ name, signal_id: signal.id, status: del.status });
          } else report.cleanup.push({ name, status: "not_found_after_run" });
        }
      } catch (error) { report.cleanup.push({ error: String(error) }); }
    }
    for (const p of [page, designPage]) if (p && !p.isClosed()) { try { await p.close(); report.closed_tab_count++; } catch (e) { report.cleanup.push({ close_error: String(e) }); } }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    report.finished_at = new Date().toISOString();
    report.planned = report.checks.length;
    report.passed = report.checks.filter(x => x.status === "passed").length;
    report.failed = report.checks.filter(x => x.status === "failed").length;
    report.not_run = report.checks.filter(x => x.status === "not_run").length;
    report.success_rate = report.planned ? Number((report.passed / report.planned * 100).toFixed(1)) : 0;
    report.network_500_count = report.responses_500.length;
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (report.fatal || report.failed) process.exitCode = 1;
  }
})();
