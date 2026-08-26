"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const url = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "050247c77b2af425e32fca1836780dab2d0c1ee3";
const artifactDir = path.resolve(__dirname, "artifacts/TASK-CURRENT");
fs.mkdirSync(artifactDir, { recursive: true });

(async () => {
  const report = { revision, checks: [], opened: 0, closed: 0, outputRequests: 0 };
  let browser, page, baselineKinds;
  const check = (name, pass, detail) => {
    report.checks.push({ name, pass: !!pass, detail });
    if (!pass) throw new Error(`${name}: ${JSON.stringify(detail)}`);
  };
  const lite = () => page.evaluate(async () => {
    const response = await fetch("./api/state-lite", { cache: "no-store" });
    return response.json();
  });
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--host-resolver-rules=MAP engee.com 51.250.50.170"] });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    report.opened++;
    page.on("request", (request) => { if (request.url().includes("/api/outputs/active")) report.outputRequests++; });
    await page.goto(url, { waitUntil: "commit", timeout: 120000 });
    await page.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 });
    const status = await page.evaluate(async () => (await fetch("./api/status", { cache: "no-store" })).json());
    check("exact runtime", status.ready === true && status.runtime_revision === revision, status);

    const settingsTabs = await page.locator("[data-settings-page]").allTextContents();
    check("right settings pages", JSON.stringify(settingsTabs) === JSON.stringify(["Отображение", "Время"]), settingsTabs);
    check("removed Peaks setting", await page.getByText("Рассчитать пики", { exact: true }).count() === 0 && await page.getByText("Искать пики", { exact: true }).count() === 0, {});

    baselineKinds = (await lite()).measurement_kinds.slice();
    const outputsBefore = report.outputRequests;
    await page.getByTestId("inspector-tab-measurements").click();
    await page.waitForFunction(() => {
      const table = document.querySelector("[data-testid='measurement-table']");
      const alert = document.querySelector("[data-testid='inspector-pane-measurements'] [role='alert']");
      return !!table || !!alert;
    }, undefined, { timeout: 180000 });
    check("Measurements terminal", await page.getByTestId("measurement-table").count() === 1, {});
    await page.getByTestId("measurement-columns-menu-trigger").click();
    const menu = page.getByTestId("measurement-columns-menu");
    await menu.waitFor({ state: "visible" });
    const menuItems = await menu.locator("[role='menuitemcheckbox']").evaluateAll((nodes) => nodes.map((node) => ({ label: node.innerText.trim(), checked: node.getAttribute("aria-checked"), icon: node.querySelector("img") && node.querySelector("img").getAttribute("src") })));
    check("measurement eye menu", menuItems.length === 6 && menuItems.every((item) => /eye(?:-off)?\.svg$/.test(item.icon || "")), menuItems);
    await page.screenshot({ path: path.join(artifactDir, "measurement-menu.png"), fullPage: true });

    const median = menu.locator("[data-measurement-visible='median']");
    await median.click();
    await page.waitForFunction(() => Array.from(document.querySelectorAll("[data-testid='measurement-table'] th")).some((node) => node.textContent.trim() === "Медиана"), undefined, { timeout: 180000 });
    check("median enabled without graph reload", report.outputRequests === outputsBefore, { baselineKinds, outputRequests: report.outputRequests });

    await menu.locator("[data-measurement-visible='median']").click();
    await page.waitForFunction(() => !Array.from(document.querySelectorAll("[data-testid='measurement-table'] th")).some((node) => node.textContent.trim() === "Медиана"), undefined, { timeout: 180000 });
    check("median restored without graph reload", report.outputRequests === outputsBefore, { outputRequests: report.outputRequests });

    await page.getByTestId("inspector-tab-peaks").click();
    await page.waitForFunction(() => {
      const pane = document.querySelector("[data-testid='inspector-pane-peaks']");
      return pane && !pane.textContent.includes("Расчёт пиков…") && (!!pane.querySelector("[data-testid='peaks-table']") || pane.textContent.includes("Пики не найдены") || !!pane.querySelector("[role='alert']"));
    }, undefined, { timeout: 180000 });
    const peaks = await page.locator("[data-testid='inspector-pane-peaks']").innerText();
    check("Peaks calculated on open", !peaks.includes("Расчёт пиков") && !peaks.includes("Не удалось"), peaks);
    check("Peaks no graph reload", report.outputRequests === outputsBefore, { outputRequests: report.outputRequests });
    await page.screenshot({ path: path.join(artifactDir, "peaks-page.png"), fullPage: true });
  } catch (error) {
    report.error = String(error && error.stack || error);
  } finally {
    if (page && baselineKinds) {
      try {
        const current = await lite();
        if (current.measurement_kinds.includes("median") !== baselineKinds.includes("median")) {
          await page.getByTestId("inspector-tab-measurements").click();
          const trigger = page.getByTestId("measurement-columns-menu-trigger");
          await trigger.click();
          await page.getByTestId("measurement-columns-menu").locator("[data-measurement-visible='median']").click();
          await page.waitForFunction(async (baseline) => JSON.stringify((await (await fetch("./api/state-lite", { cache: "no-store" })).json()).measurement_kinds) === JSON.stringify(baseline), baselineKinds, { timeout: 120000 });
        }
        report.measurementCleanup = JSON.stringify((await lite()).measurement_kinds) === JSON.stringify(baselineKinds);
      } catch (cleanupError) {
        report.measurementCleanup = false;
        report.cleanupError = String(cleanupError);
      }
    }
    if (page) { await page.close(); report.closed++; }
    if (browser) await browser.close();
    report.tabCleanup = report.opened === report.closed;
    fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify(report, null, 2));
    if (report.error || report.measurementCleanup === false || !report.tabCleanup) process.exitCode = 1;
  }
})();
