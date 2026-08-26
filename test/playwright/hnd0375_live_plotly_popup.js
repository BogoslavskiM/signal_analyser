"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "artifacts", "HND-0375");
const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const REVISION = "545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c";
const PROTOTYPE = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0057-ui-overlay-refinement/prototype/index.html";
const VIEWPORTS = [[1024, 768], [1280, 720], [1440, 900]];
const report = {
  handoff_id: "HND-0375", mode: "new_functionality_regression", target: TARGET,
  expected_revision: REVISION, browser_channel: "chrome", headless: false,
  browser_visibility: "foreground", worker_count: 1, started_at: new Date().toISOString(),
  prototype: { checks: [], screenshots: [] }, production: { checks: [], screenshots: [], console: [], pageerrors: [], network: [] },
};

function add(scope, name, pass, actual, expected) {
  scope.checks.push({ name, pass: Boolean(pass), actual, expected });
}
function shotName(prefix, width, height) { return path.join(ROOT, `${prefix}-${width}x${height}.png`); }
async function screenshot(page, scope, prefix, width, height) {
  const file = shotName(prefix, width, height);
  await page.screenshot({ path: file, fullPage: true });
  scope.screenshots.push(file);
}
async function visible(page, testid) {
  const locator = page.locator(`[data-testid="${testid}"]`).first();
  return (await locator.count()) > 0 && await locator.isVisible().catch(() => false);
}
async function box(page, testid) {
  const locator = page.locator(`[data-testid="${testid}"]`).first();
  return locator.boundingBox();
}
async function ranges(page) {
  return page.locator('[data-testid="active-plot-host"]').evaluate((host) => {
    const a = host._fullLayout || {};
    return { x: a.xaxis && a.xaxis.range && Array.from(a.xaxis.range), y: a.yaxis && a.yaxis.range && Array.from(a.yaxis.range) };
  });
}
function changed(a, b) { return JSON.stringify(a) !== JSON.stringify(b); }

(async function run() {
  fs.mkdirSync(ROOT, { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 30000 });
  const context = browser.contexts()[0];
  const initialPages = browser.contexts().flatMap((candidateContext) => candidateContext.pages());
  const productionPage = initialPages.find((candidate) => candidate.url().includes("/prod/user/demo54365638-bogoslm/genie/signal_analyser/"));
  report.production.open_pages_before_prototype = initialPages.map((candidate) => candidate.url());
  if (!productionPage) throw new Error("No shared visible production page matches the exact target before prototype inspection");
  let prototype;
  try {
    // Design-contract inspection is deliberately a separate file:// page.
    prototype = await context.newPage();
    for (const [width, height] of VIEWPORTS) {
      await prototype.setViewportSize({ width, height });
      await prototype.bringToFront();
      await prototype.goto(`${PROTOTYPE}?chrome=0`, { waitUntil: "load" });
      await prototype.waitForFunction(() => document.querySelectorAll(".js-plotly-plot").length >= 2);
      const ids = await prototype.locator("[data-design-id]").evaluateAll((nodes) => nodes.map((node) => node.dataset.designId));
      add(report.prototype, `design-map-${width}x${height}`, ids.includes("display-add") && ids.includes("layout-trigger") && ids.includes("signals-add"), { count: ids.length }, "core design controls exist");
      await screenshot(prototype, report.prototype, "prototype-default", width, height);
      await prototype.locator('[data-design-id="display-add"]').click();
      await prototype.locator('[data-design-id="layout-trigger"]').click();
      add(report.prototype, `design-layout-popover-${width}x${height}`, await prototype.locator('[data-design-id="layout-popover"]').isVisible(), null, "layout popover opens");
      await prototype.keyboard.press("Escape");
      await prototype.locator('[data-design-id="signals-add"]').click();
      add(report.prototype, `design-add-dialog-${width}x${height}`, await prototype.locator('[data-design-id="add-dialog-layer"]').isVisible(), null, "add dialog opens");
      await prototype.keyboard.press("Escape");
      await prototype.locator("[data-plot-menu-trigger]").first().click();
      await prototype.getByText("Управление графиком", { exact: true }).click();
      add(report.prototype, `design-graph-help-${width}x${height}`, await prototype.locator('[data-design-id="graph-help"]').isVisible(), null, "graph help opens above menu");
      await screenshot(prototype, report.prototype, "prototype-graph-help", width, height);
      await prototype.keyboard.press("Escape");
      await prototype.keyboard.press("Escape");
    }

    const page = productionPage;
    page.on("pageerror", (error) => report.production.pageerrors.push(String(error.message || error)));
    page.on("console", (message) => { if (message.type() === "error") report.production.console.push(message.text()); });
    page.on("response", (response) => { if (response.request().resourceType() === "document") report.production.network.push({ url: response.url(), status: response.status() }); });
    await page.bringToFront();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="app-shell"]');
    await page.waitForFunction(() => {
      const plot = document.querySelector('[data-testid="active-plot-host"]');
      return plot && plot.dataset.plotReady === "true" && plot._fullLayout && plot._fullData;
    }, { timeout: 30000 });
    const status = await page.evaluate(async () => {
      const response = await fetch("./api/status", { cache: "no-store", headers: { Accept: "application/json" } });
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch (_error) { body = { non_json: text.slice(0, 500) }; }
      return { url: response.url, http_status: response.status, body };
    });
    report.production.status = status;
    add(report.production, "availability-and-exact-revision", status.http_status === 200 && status.body && status.body.ready === true && status.body.ok === true && status.body.runtime_revision === REVISION, status, "200 ready/ok and exact runtime SHA");
    const live = await page.locator('[data-testid="active-plot-host"]').evaluate((host) => ({
      fullLayout: Boolean(host._fullLayout), fullData: Boolean(host._fullData), staticPlot: host._context && host._context.staticPlot,
      fixedrange: Boolean(host._fullLayout && host._fullLayout.xaxis && host._fullLayout.xaxis.fixedrange), svg: Boolean(host.querySelector("svg.main-svg")), modebar: Boolean(host.querySelector(".modebar, .modebar-container")),
    }));
    add(report.production, "live-local-plotly", live.fullLayout && live.fullData && live.staticPlot === false && live.fixedrange === false && live.svg && !live.modebar, live, "interactive Plotly without visible modebar");

    for (const [width, height] of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await page.bringToFront();
      await page.waitForFunction(() => document.querySelector('[data-testid="active-plot-host"]')?._fullLayout);
      const zones = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="app-shell"], [data-testid="display-workspace"], [data-testid="display-canvas"], [data-testid="display-settings"], [data-testid="bottom-panel-signals"]'), (node) => ({ id: node.dataset.testid, box: node.getBoundingClientRect().toJSON(), text: node.innerText.slice(0, 100) })));
      add(report.production, `five-zone-layout-${width}x${height}`, zones.length === 5 && zones.every((zone) => zone.box.width > 0 && zone.box.height > 0), zones, "five visible nonzero zones");
      const russian = await page.evaluate(() => ({ text: document.body.innerText, lang: document.documentElement.lang }));
      add(report.production, `russian-settings-${width}x${height}`, ["Настройки отображения", "Отображение", "Время", "Измерения", "Тип графика", "Сигналы"].every((label) => russian.text.includes(label)), russian.lang, "required Russian UI labels");
      await screenshot(page, report.production, "production-default", width, height);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.bringToFront();
    const plot = page.locator('[data-testid="active-plot-host"]');
    const plotBox = await plot.boundingBox();
    const initial = await ranges(page);
    await page.mouse.move(plotBox.x + plotBox.width * .30, plotBox.y + plotBox.height * .35);
    await page.mouse.down(); await page.mouse.move(plotBox.x + plotBox.width * .70, plotBox.y + plotBox.height * .70, { steps: 12 }); await page.mouse.up();
    const zoomed = await ranges(page);
    add(report.production, "plotly-lmb-zoom", changed(initial, zoomed), { initial, zoomed }, "both-axis range changes after LMB drag");
    await page.mouse.dblclick(plotBox.x + plotBox.width * .5, plotBox.y + plotBox.height * .5);
    const reset = await ranges(page);
    add(report.production, "plotly-double-click-autoscale", !changed(initial, reset), { initial, reset }, "ranges reset to original extent");
    await page.keyboard.down("Shift"); await page.mouse.move(plotBox.x + plotBox.width * .45, plotBox.y + plotBox.height * .45); await page.mouse.down(); await page.mouse.move(plotBox.x + plotBox.width * .55, plotBox.y + plotBox.height * .52, { steps: 10 }); await page.mouse.up(); await page.keyboard.up("Shift");
    const panned = await ranges(page);
    add(report.production, "plotly-shift-lmb-pan", changed(reset, panned), { reset, panned }, "range translates after Shift+LMB drag");
    await screenshot(page, report.production, "production-plotly-gestures", 1440, 900);

    // Modeless pane menu -> graph help: actual hit testing, focus and no plot shift.
    const beforeHelp = await box(page, "active-plot-host");
    await page.locator('[data-testid="display-overflow-trigger"]').click();
    add(report.production, "popup-pane-menu", await visible(page, "display-overflow-menu"), null, "pane menu visible");
    await page.locator('[data-testid="graph-help-action"]').click();
    const help = page.getByText("Перетаскивать график: Shift + ЛКМ", { exact: true });
    const helpVisible = await help.isVisible().catch(() => false);
    const afterHelp = await box(page, "active-plot-host");
    const helpHit = await help.evaluate((node) => { const r = node.getBoundingClientRect(); const top = document.elementFromPoint(r.left + 4, r.top + 4); return Boolean(top && node.parentElement.contains(top)); }).catch(() => false);
    add(report.production, "popup-graph-help-hit-focus-no-shift", helpVisible && helpHit && JSON.stringify(beforeHelp) === JSON.stringify(afterHelp), { beforeHelp, afterHelp, helpHit }, "help owns hit testing and plot rectangle is unchanged");
    await screenshot(page, report.production, "production-pane-menu-graph-help", 1440, 900);
    await page.keyboard.press("Escape"); await page.keyboard.press("Escape");

    // Blocking dialog: opens from Signals + -> workspace dialog; prove focus and Escape restoration.
    const addSignal = page.locator('[data-testid="signals-add-action"]');
    await addSignal.focus(); await addSignal.click();
    const workspaceAction = page.locator('[data-testid="signals-add-workspace-action"]');
    if (await workspaceAction.isVisible().catch(() => false)) await workspaceAction.click();
    const workspace = page.locator('[data-testid="signals-workspace-dialog"]');
    const workspaceVisible = await workspace.isVisible().catch(() => false);
    const activeInDialog = workspaceVisible && await page.evaluate(() => { const dialog = document.querySelector('[data-testid="signals-workspace-dialog"]'); return Boolean(dialog && dialog.contains(document.activeElement)); });
    add(report.production, "popup-workspace-dialog-focus-trap", workspaceVisible && activeInDialog, { workspaceVisible, activeInDialog }, "blocking workspace dialog owns focus");
    await screenshot(page, report.production, "production-workspace-dialog", 1440, 900);
    await page.keyboard.press("Escape");
    const restored = await page.evaluate(() => document.activeElement && document.activeElement.dataset.testid);
    add(report.production, "popup-escape-focus-restoration", restored === "signals-add-action", restored, "Escape restores Signals + focus");

    // Nonblocking layout popover has outside-click dismissal and must not shift Plotly.
    const beforeLayout = await box(page, "active-plot-host");
    await page.locator('[data-testid="layout-trigger"]').click();
    const layoutOpen = await visible(page, "layout-popover");
    const layoutBox = await box(page, "layout-popover");
    const layoutHit = layoutBox && await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x + 4, y + 4)?.closest('[data-testid="layout-popover"]')), layoutBox);
    await page.mouse.click(2, 100);
    const layoutClosed = !(await visible(page, "layout-popover"));
    const afterLayout = await box(page, "active-plot-host");
    add(report.production, "popup-layout-hit-outside-dismiss-no-shift", layoutOpen && layoutHit && layoutClosed && JSON.stringify(beforeLayout) === JSON.stringify(afterLayout), { layoutOpen, layoutHit, layoutClosed, beforeLayout, afterLayout }, "popover hit ownership, outside dismissal, stable plot");

    add(report.production, "zero-page-errors", report.production.pageerrors.length === 0 && report.production.console.length === 0, { pageerrors: report.production.pageerrors, console: report.production.console }, "no JS pageerror/console error during production run");
  } finally {
    if (prototype) await prototype.close().catch(() => {});
    report.completed_at = new Date().toISOString();
    report.summary = { passed: report.production.checks.filter((item) => item.pass).length, failed: report.production.checks.filter((item) => !item.pass).length, planned: report.production.checks.length };
    report.summary.success_rate = report.summary.planned ? report.summary.passed / report.summary.planned * 100 : 0;
    fs.writeFileSync(path.join(ROOT, "evidence.json"), JSON.stringify(report, null, 2));
    // Intentionally no browser.close(): the shared visible Chrome remains open.
  }
  process.stdout.write(JSON.stringify(report.summary, null, 2));
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
