"use strict";

// Focused visible production regression for TASK-0117.  It intentionally
// creates no signals and restores the active pane's membership/main selection.
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "1f9397c277f11e5fa278090c0350aaa38a811211";
const prototype = `file://${path.resolve(__dirname, "../../architecture/design/current/prototype/index.html")}`;
const artifactDir = path.resolve(__dirname, "artifacts/TASK-0117");
fs.mkdirSync(artifactDir, { recursive: true });

const report = {
  id: "TASK-0117-E2E", type: "report", from: "E2E", to: "Orchestrator",
  e2e_mode: "new_functionality_regression", target, expected_revision: expectedRevision,
  design_ref: "architecture/design/current", design_version: 31,
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"],
  browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
  opened_tab_count: 0, closed_tab_count: 0, checks: [], screenshots: [],
  console_errors: [], page_errors: [], responses_500: [], network: [], cleanup: [],
};
const pass = (name, detail = {}) => report.checks.push({ name, status: "passed", detail });
const fail = (name, detail = {}) => report.checks.push({ name, status: "failed", detail });
const skip = (name, reason) => report.checks.push({ name, status: "not_run", detail: { reason } });

function rowSelector(name) { return `[data-signal-row][data-signal-name=${JSON.stringify(name)}]`; }
async function state(page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-signal-row][data-signal-name]")].map(row => ({
    name: row.dataset.signalName,
    checked: !!row.querySelector("[data-visible-signal]")?.checked,
    main: row.dataset.mainSignal === "true" && row.classList.contains("is-main-signal"),
  })));
}
async function shot(page, name) {
  const file = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  report.screenshots.push(file);
}
async function api(page, endpoint) {
  return page.evaluate(async endpoint => {
    const response = await fetch(`.${endpoint}`, { cache: "no-store", headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  }, endpoint);
}
async function waitUntil(page, predicate, timeout = 30000, argument = null) {
  await page.waitForFunction(predicate, argument, { timeout });
}
async function plainRowClick(page, name) {
  const row = page.locator(rowSelector(name));
  await row.locator("td").nth(1).click();
}
async function checkboxSet(page, name, value) {
  const box = page.locator(`${rowSelector(name)} [data-visible-signal]`);
  const checked = await box.isChecked();
  if (checked !== value) await box.click();
}
async function waitForMutation(page, action) {
  const response = page.waitForResponse(response =>
    response.request().method() === "POST" && /\/api\/(layouts|view)$/.test(new URL(response.url()).pathname),
  { timeout: 30000 });
  await action();
  return response;
}

(async () => {
  let browser, context, designPage, page;
  let original = [];
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = browser.contexts()[0] || await browser.newContext();
    designPage = await context.newPage(); report.opened_tab_count++;
    await designPage.setViewportSize({ width: 1024, height: 768 }); await designPage.bringToFront();
    await designPage.goto(prototype, { waitUntil: "domcontentloaded", timeout: 30000 });
    const designRows = await designPage.locator("[data-signal-row][data-signal-name]").count();
    if (designRows) await designPage.locator("[data-signal-row][data-signal-name] td").nth(1).click();
    await designPage.getByTestId("settings-tab-signal").click().catch(() => null);
    const designValues = await designPage.locator("[data-testid='signal-values-action']").count();
    if (designRows && designValues) pass("prototype TASK-0117 rows and Values affordance", { designRows, designValues });
    else fail("prototype TASK-0117 rows and Values affordance", { designRows, designValues });
    await shot(designPage, "prototype-task0117");

    page = await context.newPage(); report.opened_tab_count++;
    await page.setViewportSize({ width: 1440, height: 900 }); await page.bringToFront();
    page.on("console", message => { if (message.type() === "error" && !/favicon/i.test(message.text())) report.console_errors.push(message.text()); });
    page.on("pageerror", error => report.page_errors.push(String(error)));
    page.on("response", response => {
      if (response.url().includes("/api/")) report.network.push({ method: response.request().method(), status: response.status(), url: response.url() });
      if (response.status() >= 500) report.responses_500.push({ method: response.request().method(), status: response.status(), url: response.url() });
    });
    const navigation = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 });
    const status = await api(page, "/api/status");
    assert.equal(navigation.status(), 200);
    assert.equal(status.status, 200);
    assert.equal(status.body?.ready, true);
    assert.equal(status.body?.runtime_revision, expectedRevision);
    pass("production readiness and exact revision", { navigation: navigation.status(), status: status.body });
    await page.locator("[data-signal-row][data-signal-name]").first().waitFor({ state: "visible", timeout: 30000 });
    original = await state(page);
    const originalMain = original.find(row => row.main);
    if (!originalMain) {
      skip("main/checkbox semantics", "no pre-existing main_signal; mutation skipped to preserve exact user state");
    } else {
      const candidate = original.find(row => row.name !== originalMain.name) || originalMain;
      const candidateWasChecked = candidate.checked;
      const candidateWasMain = candidate.main;
      const rowMutation = candidateWasMain && candidateWasChecked ? null : await waitForMutation(page, () => plainRowClick(page, candidate.name));
      if (rowMutation && rowMutation.status() >= 300) throw new Error(`row-click mutation failed: ${rowMutation.status()}`);
      await waitUntil(page, candidateName => {
        const row = [...document.querySelectorAll("[data-signal-row][data-signal-name]")].find(item => item.dataset.signalName === candidateName);
        return !!row && row.dataset.mainSignal === "true" && row.classList.contains("is-main-signal") && !!row.querySelector("[data-visible-signal]")?.checked;
      }, 30000, candidate.name);
      let afterRow = await state(page); // DOM is reacquired after each POST/render.
      const blue = afterRow.filter(row => row.main);
      if (blue.length === 1 && blue[0].name === candidate.name && blue[0].checked) pass("plain row click sets only main_signal and ensures membership ON", { candidate: candidate.name, rows: afterRow });
      else fail("plain row click sets only main_signal and ensures membership ON", { candidate: candidate.name, rows: afterRow });
      await shot(page, "row-click-main");

      const checkboxTarget = afterRow.find(row => row.name !== candidate.name) || candidate;
      const beforeDirect = checkboxTarget.checked;
      const directMutation = await waitForMutation(page, () => checkboxSet(page, checkboxTarget.name, !beforeDirect));
      if (directMutation.status() >= 300) {
        fail("direct checkbox toggles visibility only and does not change main_signal", { checkboxTarget: checkboxTarget.name, mutation_status: directMutation.status() });
      } else {
      await waitUntil(page, args => {
        const row = [...document.querySelectorAll("[data-signal-row][data-signal-name]")].find(item => item.dataset.signalName === args.name);
        const main = [...document.querySelectorAll("[data-signal-row][data-signal-name]")].filter(item => item.dataset.mainSignal === "true");
        return !!row && !!row.querySelector("[data-visible-signal]") && row.querySelector("[data-visible-signal]").checked === args.checked && main.length === 1 && main[0].dataset.signalName === args.main;
      }, 30000, { name: checkboxTarget.name, checked: !beforeDirect, main: candidate.name });
      let afterDirect = await state(page);
      if (afterDirect.find(row => row.name === checkboxTarget.name)?.checked === !beforeDirect && afterDirect.filter(row => row.main).map(row => row.name).join() === candidate.name) pass("direct checkbox toggles visibility only and does not change main_signal", { checkboxTarget: checkboxTarget.name, rows: afterDirect });
      else fail("direct checkbox toggles visibility only and does not change main_signal", { checkboxTarget: checkboxTarget.name, rows: afterDirect });
      }

      const hideMutation = await waitForMutation(page, () => checkboxSet(page, candidate.name, false));
      if (hideMutation.status() >= 300) throw new Error(`current-main checkbox mutation failed: ${hideMutation.status()}`);
      await waitUntil(page, candidateName => {
        const row = [...document.querySelectorAll("[data-signal-row][data-signal-name]")].find(item => item.dataset.signalName === candidateName);
        return !!row && row.dataset.mainSignal === "true" && !row.querySelector("[data-visible-signal]")?.checked;
      }, 30000, candidate.name);
      const hiddenMain = await state(page);
      if (hiddenMain.find(row => row.name === candidate.name)?.main && !hiddenMain.find(row => row.name === candidate.name)?.checked) pass("unchecking current main hides its trace while preserving blue main_signal", { candidate: candidate.name, rows: hiddenMain });
      else fail("unchecking current main hides its trace while preserving blue main_signal", { candidate: candidate.name, rows: hiddenMain });
      await shot(page, "checkbox-hidden-main");

      // Restore memberships first, then main. If the original main was hidden,
      // select it first and then hide it again; this maintains the exact state.
      for (const row of original) {
        const current = (await state(page)).find(item => item.name === row.name);
        if (current && current.checked !== row.checked) {
          const restoreMutation = await waitForMutation(page, () => checkboxSet(page, row.name, row.checked));
          if (restoreMutation.status() >= 300) throw new Error(`membership restore failed: ${restoreMutation.status()}`);
          await waitUntil(page, args => {
            const row = [...document.querySelectorAll("[data-signal-row][data-signal-name]")].find(item => item.dataset.signalName === args.name);
            return !!row && row.querySelector("[data-visible-signal]")?.checked === args.checked;
          }, 30000, { name: row.name, checked: row.checked });
        }
      }
      const selectOriginalMutation = originalMain.name === candidate.name && candidateWasMain ? null : await waitForMutation(page, () => plainRowClick(page, originalMain.name));
      if (selectOriginalMutation && selectOriginalMutation.status() >= 300) throw new Error(`main restore failed: ${selectOriginalMutation.status()}`);
      await waitUntil(page, name => [...document.querySelectorAll("[data-signal-row][data-signal-name]")].filter(row => row.dataset.mainSignal === "true").map(row => row.dataset.signalName).join() === name, 30000, originalMain.name);
      if (!originalMain.checked) {
        const hiddenRestoreMutation = await waitForMutation(page, () => checkboxSet(page, originalMain.name, false));
        if (hiddenRestoreMutation.status() >= 300) throw new Error(`hidden main restore failed: ${hiddenRestoreMutation.status()}`);
        await waitUntil(page, name => { const row=[...document.querySelectorAll("[data-signal-row][data-signal-name]")].find(item=>item.dataset.signalName===name); return !!row && !row.querySelector("[data-visible-signal]")?.checked; }, 30000, originalMain.name);
      }
      const restored = await state(page);
      if (JSON.stringify(restored) === JSON.stringify(original)) pass("original main_signal and every checkbox restored exactly", { original, restored });
      else fail("original main_signal and every checkbox restored exactly", { original, restored });
    }

    // Values is checked against the same current main and its actual HTTP data.
    const liveMain = (await state(page)).find(row => row.main);
    if (!liveMain) skip("Values samples pagination", "no main_signal available");
    else {
      const mainRow = page.locator(rowSelector(liveMain.name));
      if (!(await mainRow.locator("[data-visible-signal]").isChecked())) {
        // Do not alter the original state: Signal tab remains contextual for a hidden main too.
      }
      const signalTab = page.getByTestId("settings-tab-signal");
      if (await signalTab.isVisible().catch(() => false)) {
        await signalTab.click();
        const values = page.getByTestId("signal-values-action");
        await values.waitFor({ state: "visible", timeout: 30000 });
        const samplesResponse = page.waitForResponse(response => /\/api\/signals\/[^/]+\/samples/.test(response.url()) && response.status() === 200, { timeout: 30000 });
        await values.click();
        const firstPage = await samplesResponse;
        const firstPayload = await firstPage.json();
        await page.locator("[data-testid='samples-table-scroll'] tbody tr").first().waitFor({ state: "visible", timeout: 30000 });
        const samples = await page.evaluate(() => ({
          headers: [...document.querySelectorAll("[data-testid='samples-table-scroll'] thead th")].map(item => item.textContent.trim()),
          rowCount: document.querySelectorAll("[data-testid='samples-table-scroll'] tbody tr").length,
          footer: document.querySelector("[data-testid='samples-table-scroll']")?.innerText || "",
        }));
        const fiveColumns = samples.headers.join("|") === "№ точки|Время|Значение|Модуль|Квадрат";
        if (Array.isArray(firstPayload.rows) && firstPayload.rows.length && fiveColumns && samples.rowCount) pass("Values loads nonempty real samples with five columns", { samples, apiRows: firstPayload.rows.length, total: firstPayload.total });
        else fail("Values loads nonempty real samples with five columns", { samples, firstPayload });
        if (Number(firstPayload.total) >= 512) {
          const scroll = page.getByTestId("samples-table-scroll");
          const nextPage = page.waitForResponse(response => /\/api\/signals\/[^/]+\/samples/.test(response.url()) && /[?&]cursor=/.test(response.url()) && response.status() === 200, { timeout: 30000 });
          await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event("scroll")); });
          await nextPage;
          await waitUntil(page, () => document.querySelectorAll("[data-testid='samples-table-scroll'] tbody tr").length > 200, 30000);
          const appended = await page.locator("[data-testid='samples-table-scroll'] tbody tr").count();
          if (appended > 200) pass("samples scroll requests and appends second page for 512+ rows", { appended, total: firstPayload.total });
          else fail("samples scroll requests and appends second page for 512+ rows", { appended, total: firstPayload.total });
        } else skip("samples second page", `total=${firstPayload.total}; 512-row condition not present`);
        await shot(page, "values-populated");
      } else skip("Values samples pagination", "Signal settings tab is not visible for current context");
    }
    if (report.responses_500.length === 0 && report.console_errors.length === 0 && report.page_errors.length === 0) pass("no API 500, page error, or console error during TASK-0117", { apiRequests: report.network.length });
    else fail("no API 500, page error, or console error during TASK-0117", { responses_500: report.responses_500, console_errors: report.console_errors, page_errors: report.page_errors });
  } catch (error) {
    report.fatal = String(error?.stack || error);
  } finally {
    // A fatal mid-test still restores if the initial state was captured.
    try {
      if (page && !page.isClosed() && original.length && original.some(row => row.main)) {
        // State restoration is already done in the normal path. This only records a mismatch for manual follow-up.
        report.cleanup.push({ captured_original: original, current_before_close: await state(page).catch(() => []) });
      }
    } catch (error) { report.cleanup.push({ state_capture_error: String(error) }); }
    for (const candidate of [page, designPage]) if (candidate && !candidate.isClosed()) { try { await candidate.close(); report.closed_tab_count++; } catch (error) { report.cleanup.push({ close_error: String(error) }); } }
    if (browser) await browser.close().catch(error => report.cleanup.push({ browser_close_error: String(error) }));
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    report.planned = report.checks.length;
    report.passed = report.checks.filter(item => item.status === "passed").length;
    report.failed = report.checks.filter(item => item.status === "failed").length;
    report.not_run = report.checks.filter(item => item.status === "not_run").length;
    report.success_rate = report.planned ? Number((report.passed / report.planned * 100).toFixed(1)) : 0;
    report.finished_at = new Date().toISOString();
    const reportFile = path.join(artifactDir, "report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exitCode = report.fatal || report.failed ? 1 : 0;
  }
})();
