"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const APP_URL = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const REVISION = "4aaa737707a72947f29a7f658b1e7b669826b055";
const artifacts = path.resolve("test/playwright/artifacts/TASK-0094");
const report = { id:"HND-TASK-0094-E2E", checks:[], opened_tab_count:0, closed_tab_count:0 };
fs.mkdirSync(artifacts, { recursive:true });

function check(name, passed, detail) { report.checks.push({ name, status:passed ? "passed" : "failed", detail:detail || {} }); }

(async () => {
  let browser;
  let page;
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
    check("exact revision", status.status === 200 && status.body.ready && status.body.runtime_revision === REVISION, status);

    const geometry = await page.evaluate(() => {
      const inspector = document.querySelector(".inspector");
      const header = document.querySelector(".inspector-header");
      const search = document.querySelector(".inspector-search-row");
      const add = document.querySelector("[data-testid='signals-add-action']");
      const menu = document.querySelector("[data-testid='signal-columns-menu-trigger']");
      const plot = document.querySelector(".plot-grid");
      const ir = inspector.getBoundingClientRect(), hr = header.getBoundingClientRect(), sr = search.getBoundingClientRect();
      return {
        inspectorBg:getComputedStyle(inspector).backgroundColor,
        plotBg:getComputedStyle(plot).backgroundColor,
        topInset:hr.top - ir.top,
        leftInset:hr.left - ir.left,
        headerBottom:hr.bottom,
        searchTop:sr.top,
        actionsInSearch:search.contains(add) && search.contains(menu),
        actionsInHeader:header.contains(add) || header.contains(menu),
        addRect:add.getBoundingClientRect().toJSON(),
        menuRect:menu.getBoundingClientRect().toJSON()
      };
    });
    check("full-zone plot background and 8px tab inset", geometry.inspectorBg === geometry.plotBg && Math.abs(geometry.topInset - 8) <= 1 && Math.abs(geometry.leftInset - 8) <= 1 && Math.abs(geometry.searchTop - geometry.headerBottom) <= 1, geometry);
    check("actions moved into search row", geometry.actionsInSearch && !geometry.actionsInHeader && geometry.addRect.width === 32 && geometry.menuRect.width === 32, geometry);

    const add = page.getByTestId("signals-add-action");
    await add.click();
    const layer = page.getByTestId("signal-add-layer");
    await layer.waitFor({ state:"visible", timeout:30000 });
    await page.waitForFunction(() => {
      const state = document.querySelector("[data-testid='signal-add-state']");
      const error = document.querySelector("[data-testid='signal-add-error']");
      return document.querySelectorAll("[data-signal-add-variable]").length > 0 || (error && !error.hidden) || (state && /не найдены/.test(state.textContent));
    }, undefined, { timeout:180000 });
    const dialog = await page.evaluate(() => ({
      inert:document.querySelector("[data-testid='app-shell']").inert,
      variables:document.querySelectorAll("[data-signal-add-variable]").length,
      selectable:document.querySelectorAll("[data-signal-add-variable]:not(:disabled)").length,
      error:document.querySelector("[data-testid='signal-add-error']").hidden ? "" : document.querySelector("[data-testid='signal-add-error']").textContent.trim(),
      active:document.activeElement && document.activeElement.id
    }));
    check("plus opens authoritative workspace dialog", dialog.inert && dialog.active === "signal-add-title" && !dialog.error && dialog.selectable > 0, dialog);

    if (dialog.selectable > 0) {
      const first = page.locator("[data-signal-add-variable]:not(:disabled)").first();
      await first.check();
      check("selection enables Add", await layer.locator("[data-signal-add-submit]").isEnabled(), {});
    }
    await page.screenshot({ path:path.join(artifacts, "inspector-add-dialog.png"), fullPage:true });
    await layer.locator("[data-signal-add-cancel]").click();
    check("Cancel restores focus without mutation", await layer.isHidden() && await add.evaluate(node => document.activeElement === node) && !await page.getByTestId("app-shell").evaluate(node => node.inert), {});
    await page.screenshot({ path:path.join(artifacts, "inspector-underlay-actions.png"), fullPage:true });
  } catch (error) {
    report.error = String(error && error.stack || error);
    check("unhandled", false, { error:report.error });
  } finally {
    if (page && !page.isClosed()) { await page.close(); report.closed_tab_count += 1; }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    report.summary = { planned:report.checks.length, passed:report.checks.filter(item => item.status === "passed").length, failed:report.checks.filter(item => item.status === "failed").length };
    fs.writeFileSync(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    process.stdout.write(JSON.stringify(report.summary) + "\n");
  }
})();
