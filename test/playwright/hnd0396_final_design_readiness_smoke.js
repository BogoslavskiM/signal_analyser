"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const HANDOFF_ID = process.env.E2E_HANDOFF_ID || "HND-0396";
const PRODUCTION_ONLY = process.env.E2E_PRODUCTION_ONLY === "1";
const ROOT = path.join(__dirname, "artifacts", HANDOFF_ID);
const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const PROTOTYPE = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0057-ui-overlay-refinement/prototype/index.html";
const SHA = "76cb9c6a360ed6d852203f9be0ed7a1a4003e156";
const VIEWS = [[1024, 768], [1440, 900]];
const ACCENT = "rgb(27, 132, 184)";
const DANGER = "rgb(196, 43, 28)";

function roundedBox(box) {
  if (!box) return null;
  return Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Math.round(value * 1000) / 1000]));
}

function intersects(left, right) {
  if (!left || !right) return false;
  return left.x < right.right && left.right > right.x && left.y < right.bottom && left.bottom > right.y;
}

function recordCheck(report, suite, name, pass, actual, expected) {
  report.checks.push({ suite, name, pass: Boolean(pass), actual, expected });
}

async function waitForProductionReady(page) {
  await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible", timeout: 45000 });
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-testid="app-loading"]');
    const host = document.querySelector('[data-testid="active-plot-host"]');
    return (!loader || loader.hidden || getComputedStyle(loader).display === "none") &&
      host && host.dataset.plotReady === "true" && host._fullLayout && host._fullData;
  }, null, { timeout: 45000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

async function screenshot(page, report, name) {
  const target = path.join(ROOT, name);
  await page.screenshot({ path: target, fullPage: false });
  report.screenshots.push(target);
}

async function prototypeSmoke(page, report, width, height) {
  const viewport = `${width}x${height}`;
  await page.setViewportSize({ width, height });
  await page.goto(PROTOTYPE, { waitUntil: "load", timeout: 30000 });
  await page.bringToFront();
  await page.waitForFunction(() => Array.from(document.querySelectorAll(".js-plotly-plot")).length >= 2 &&
    Array.from(document.querySelectorAll(".js-plotly-plot")).every((host) => host._fullLayout && host._fullData), null, { timeout: 30000 });
  const relevant = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('[data-design-id="app-shell"]')),
    close: Boolean(document.querySelector("[data-screen-close]")),
    add: Boolean(document.querySelector('[data-design-id="display-add"]')),
    layout: Boolean(document.querySelector('[data-design-id="layout-trigger"]')),
    settings: Boolean(document.querySelector('[data-design-id="settings-tab-display"]')),
    legend: Boolean(document.querySelector(".plot-legend")),
    checkbox: Boolean(document.querySelector(".signal-table thead input[type=checkbox]")),
    rowActions: Boolean(document.querySelector(".signal-row-actions")),
    search: Boolean(document.querySelector('[data-design-id="signals-search"], input[placeholder="Введите название"]')),
  }));
  report.prototype_checks.push({ viewport, pass: Object.values(relevant).every(Boolean), actual: relevant });
  await screenshot(page, report, `prototype-final-${viewport}.png`);
}

async function shellEvidence(page) {
  return page.evaluate(() => {
    function box(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        right: rect.right, bottom: rect.bottom,
        clientWidth: element.clientWidth, clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
        overflow: style.overflow, minWidth: style.minWidth, minHeight: style.minHeight,
        maxWidth: style.maxWidth, maxHeight: style.maxHeight,
      };
    }
    return {
      viewport: {
        width: innerWidth, height: innerHeight,
        documentClientWidth: document.documentElement.clientWidth,
        documentClientHeight: document.documentElement.clientHeight,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentScrollHeight: document.documentElement.scrollHeight,
        bodyScrollWidth: document.body.scrollWidth,
        bodyScrollHeight: document.body.scrollHeight,
      },
      zones: {
        shell: box('[data-testid="app-shell"]'),
        toolbar: box(".app-toolbar"),
        main: box(".main-stage"),
        workspace: box('[data-testid="display-workspace"]'),
        canvas: box('[data-testid="display-canvas"]'),
        settings: box('[data-testid="display-settings"]'),
        inspector: box(".bottom-zone"),
        signals: box('[data-testid="bottom-panel-signals"]'),
        tableScroll: box(".signal-table-scroll"),
      },
    };
  });
}

async function settingsEvidence(page) {
  return page.evaluate(() => {
    function box(element) { const r = element && element.getBoundingClientRect(); return r && { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; }
    const settings = document.querySelector('[data-testid="display-settings"]');
    const workspace = document.querySelector('[data-testid="display-workspace"]');
    const tabs = document.querySelector(".settings-tabs");
    const rows = Array.from(document.querySelectorAll(".settings-scalar,.settings-enum,.settings-readonly,.checkbox-setting")).filter((element) => {
      const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    }).slice(0, 12).map((element) => {
      const style = getComputedStyle(element);
      return { box: box(element), gridTemplateColumns: style.gridTemplateColumns, gap: style.gap, display: style.display };
    });
    return { settings: box(settings), workspace: box(workspace), tabs: box(tabs), rows };
  });
}

async function navigationEvidence(page) {
  const close = page.locator('[data-testid^="close-display-"]').first();
  const add = page.locator('[data-testid="add-display"]');
  const layout = page.locator('[data-testid="layout-trigger"]');
  const closeBox = await close.boundingBox();
  await close.hover();
  const hover = await close.evaluate((element) => { const s=getComputedStyle(element); return { color:s.color, background:s.backgroundColor, box:{x:element.getBoundingClientRect().x,y:element.getBoundingClientRect().y,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height} }; });
  await close.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focus = await close.evaluate((element) => { const s=getComputedStyle(element); return { active:document.activeElement===element, color:s.color, background:s.backgroundColor, outline:s.outline, outlineColor:s.outlineColor, box:{x:element.getBoundingClientRect().x,y:element.getBoundingClientRect().y,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height} }; });
  const controls = await page.evaluate(() => {
    function data(selector) { const e=document.querySelector(selector); if(!e)return null; const r=e.getBoundingClientRect(),s=getComputedStyle(e),img=e.querySelector("img"),ir=img&&img.getBoundingClientRect(); return { text:e.innerText.trim(), aria:e.getAttribute("aria-label"), box:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}, icon:ir&&{x:ir.x,y:ir.y,width:ir.width,height:ir.height,right:ir.right,bottom:ir.bottom}, display:s.display, alignItems:s.alignItems, justifyContent:s.justifyContent }; }
    return { add:data('[data-testid="add-display"]'), layout:data('[data-testid="layout-trigger"]') };
  });
  return { closeBox: roundedBox(closeBox), hover, focus, controls };
}

async function legendEvidence(page, report, viewport) {
  const base = await page.evaluate(() => {
    function box(selector) { const e=document.querySelector(selector); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; }
    return { legend:box(".plot-pane.is-active .compact-legend"), controls:box(".plot-pane.is-active .pane-runtime-slot") };
  });
  await page.locator('[data-testid="display-overflow-trigger"]').click();
  await page.locator('[data-testid="graph-help-action"]').click();
  const opened = await page.evaluate(() => {
    function box(selector) { const e=document.querySelector(selector); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; }
    return { legend:box(".plot-pane.is-active .compact-legend"), controls:box(".plot-pane.is-active .pane-runtime-slot"), help:box('[data-testid="graph-help-overlay"]'), focus:document.activeElement&&document.activeElement.dataset.testid };
  });
  await screenshot(page, report, `production-legend-help-${viewport}.png`);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  return { base, opened };
}

async function tableEvidence(page, report, viewport) {
  const header = await page.evaluate(() => {
    const input=document.querySelector('[data-testid="toggle-all-signals"]'),cell=input&&input.closest("th"),a=input&&input.getBoundingClientRect(),b=cell&&cell.getBoundingClientRect(),s=input&&getComputedStyle(input);
    return a&&b&&{ input:{x:a.x,y:a.y,width:a.width,height:a.height,right:a.right,bottom:a.bottom}, cell:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}, accentColor:s.accentColor };
  });
  const row = page.locator('[data-testid^="signal-row-"]').first();
  const before = await row.evaluate((element) => { const actions=element.querySelector(".signal-row-actions"),s=getComputedStyle(actions); return {opacity:s.opacity,pointerEvents:s.pointerEvents}; });
  await row.hover();
  const revealed = await row.evaluate((element) => {
    function box(node){const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}
    const cell=element.querySelector("td:last-child"),copy=cell.querySelector(".signal-cell-copy"),actions=cell.querySelector(".signal-row-actions"),buttons=Array.from(actions.querySelectorAll("button")),copyStyle=getComputedStyle(copy),actionStyle=getComputedStyle(actions);
    return {cell:box(cell),copy:box(copy),actions:box(actions),buttons:buttons.map(box),copyOverflow:copyStyle.overflow,textOverflow:copyStyle.textOverflow,whiteSpace:copyStyle.whiteSpace,opacity:actionStyle.opacity,pointerEvents:actionStyle.pointerEvents,actionsParentIsCell:actions.parentElement===cell};
  });
  const duplicate = row.locator('[data-signal-duplicate]');
  await duplicate.hover();
  const ordinary = await duplicate.evaluate((element) => { const s=getComputedStyle(element); return {color:s.color,background:s.backgroundColor,width:s.width,height:s.height}; });
  const remove = row.locator('[data-signal-delete]');
  await remove.hover();
  const danger = await remove.evaluate((element) => { const s=getComputedStyle(element); return {color:s.color,background:s.backgroundColor,width:s.width,height:s.height}; });
  await screenshot(page, report, `production-row-actions-${viewport}.png`);
  return { header, before, revealed, ordinary, danger };
}

async function searchEvidence(page) {
  const input = page.locator('[data-testid="signal-search-input"]');
  const mutationRequests = [];
  const listener = (request) => { if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) mutationRequests.push({ method:request.method(), url:request.url() }); };
  page.on("request", listener);
  const initial = await page.locator('[data-testid^="signal-row-"]').evaluateAll((rows) => rows.map((row) => ({ name:row.querySelector('[data-column="name"]').textContent.trim(), selected:row.getAttribute("aria-selected") })));
  const selected = initial.find((row) => row.selected === "true") || initial[0];
  const query = selected.name.slice(0, Math.max(4, Math.min(8, selected.name.length))).toLocaleUpperCase("ru-RU");
  await input.fill(query);
  const filtered = await page.locator('[data-testid^="signal-row-"]').evaluateAll((rows) => rows.map((row) => ({ name:row.querySelector('[data-column="name"]').textContent.trim(), selected:row.getAttribute("aria-selected") })));
  await input.press("Escape");
  const clearedValue = await input.inputValue();
  const restored = await page.locator('[data-testid^="signal-row-"]').evaluateAll((rows) => rows.map((row) => ({ name:row.querySelector('[data-column="name"]').textContent.trim(), selected:row.getAttribute("aria-selected") })));
  page.off("request", listener);
  return { initial, selected, query, filtered, clearedValue, restored, mutationRequests };
}

async function plotlyEvidence(page) {
  return page.locator('[data-testid="active-plot-host"]').evaluate((host) => ({
    fullLayout: Boolean(host._fullLayout), fullData: Boolean(host._fullData && host._fullData.length),
    svg: Boolean(host.querySelector("svg.main-svg")), staticPlot: host._context && host._context.staticPlot,
    fixedrange: host._fullLayout && host._fullLayout.xaxis && host._fullLayout.xaxis.fixedrange,
    modebarNodes: host.querySelectorAll(".modebar,.modebar-container").length,
  }));
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const report = {
    handoff_id: HANDOFF_ID, mode: "new_functionality_regression", target: TARGET,
    expected_revision: SHA, design_ref: "architecture/design/TASK-0057-ui-overlay-refinement/DESIGN.md", design_version: 2,
    browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
    applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"], started_at: new Date().toISOString(),
    checks: [], prototype_checks: [], screenshots: [], page_errors: [], console_errors: [],
    opened_tab_count: 0, closed_tab_count: 0, tab_cleanup_status: "pending",
  };
  let browser;
  const trackedPages = [];
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = await browser.newContext();
    if (!PRODUCTION_ONLY) {
      const prototypePage = await context.newPage(); trackedPages.push(prototypePage); report.opened_tab_count += 1;
      for (const [width, height] of VIEWS) await prototypeSmoke(prototypePage, report, width, height);
    } else {
      report.prototype_reused_from = "HND-0396";
    }

    const page = await context.newPage(); trackedPages.push(page); report.opened_tab_count += 1;
    page.on("pageerror", (error) => report.page_errors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") report.console_errors.push(message.text()); });
    const mainResponse = await page.goto(TARGET, { waitUntil: "commit", timeout: 45000 });
    await page.bringToFront();
    const bodyText = await page.locator("body").innerText();
    if (/технические работы|maintenance/i.test(bodyText)) throw new Error(`availability: maintenance screen at ${page.url()}`);
    await waitForProductionReady(page);
    const status = await page.evaluate(() => fetch("./api/status", { headers:{Accept:"application/json"}, cache:"no-store" }).then(async (response) => ({ status:response.status, body:await response.json() })));
    report.availability = { main_document_status: mainResponse && mainResponse.status(), exact_url: page.url(), status };
    recordCheck(report, "quick_regression", "availability-exact-revision", mainResponse && mainResponse.ok() && status.status===200 && status.body.ready===true && status.body.ok===true && status.body.runtime_revision===SHA, report.availability, `HTTP 2xx, ready/ok, ${SHA}`);

    for (const [width, height] of VIEWS) {
      const viewport = `${width}x${height}`;
      await page.setViewportSize({ width, height });
      await page.bringToFront();
      await waitForProductionReady(page);
      const shell = await shellEvidence(page);
      const shellBox = shell.zones.shell;
      const zones = Object.entries(shell.zones).filter(([name]) => !["shell", "tableScroll"].includes(name));
      const shellPass = shellBox && shell.viewport.documentScrollWidth===width && shell.viewport.documentScrollHeight===height &&
        shellBox.x >= 0 && shellBox.y >= 0 && shellBox.right <= width + .5 && shellBox.bottom <= height + .5 &&
        zones.every(([, box]) => box && box.width > 0 && box.height > 0 && box.x >= shellBox.x-.5 && box.y >= shellBox.y-.5 && box.right <= shellBox.right+.5 && box.bottom <= shellBox.bottom+.5);
      recordCheck(report, "new_functionality", `full-page-shell-zones-${viewport}`, shellPass, shell, "all listed zones reachable within a viewport-filling shell");

      const settings = await settingsEvidence(page);
      const settingsPass = settings.settings && settings.workspace && Math.abs(settings.settings.y-settings.workspace.y)<=.5 && Math.abs(settings.settings.bottom-settings.workspace.bottom)<=.5 && settings.rows.length>0 && settings.rows.every((row)=>row.box.height>=39.5 && /140px/.test(row.gridTemplateColumns) && /8px/.test(row.gap));
      recordCheck(report, "new_functionality", `display-settings-alignment-${viewport}`, settingsPass, settings, "workspace-aligned panel and 140px/8px/40px rows");

      const navigation = await navigationEvidence(page);
      recordCheck(report, "new_functionality", `screen-close-blue-hover-focus-${viewport}`, navigation.hover.color===ACCENT && navigation.focus.active && navigation.focus.color===ACCENT && navigation.focus.outlineColor===ACCENT && JSON.stringify(navigation.hover.box)===JSON.stringify(navigation.focus.box), navigation, "blue hover/focus, focus outline, unchanged 28x32 geometry");
      const add = navigation.controls.add, layout = navigation.controls.layout;
      const addCentered = add && add.box.width===32 && add.box.height===32 && add.icon && Math.abs((add.icon.x+add.icon.width/2)-(add.box.x+add.box.width/2))<=.5 && Math.abs((add.icon.y+add.icon.height/2)-(add.box.y+add.box.height/2))<=.5;
      const layoutPass = layout && layout.box.height===32 && layout.icon && layout.icon.width===16 && layout.icon.height===16 && layout.text==="Изменить макет" && Math.abs(add.box.right-layout.box.x)<=.5;
      recordCheck(report, "new_functionality", `centered-add-canonical-layout-${viewport}`, addCentered && layoutPass, navigation.controls, "32px centered +, adjacent 32px canonical layout action");

      const legend = await legendEvidence(page, report, viewport);
      const legendPass = legend.opened.legend && legend.opened.legend.width<=148.5 && !intersects(legend.opened.legend, legend.opened.controls) && !intersects(legend.opened.legend, legend.opened.help) && !intersects(legend.opened.help, legend.opened.controls) && legend.opened.focus==="graph-help-close";
      recordCheck(report, "new_functionality", `small-legend-no-control-help-overlap-${viewport}`, legendPass, legend, "legend <=148px; legend, controls and help do not overlap");

      const table = await tableEvidence(page, report, viewport);
      const h=table.header, contained=h&&h.input.x>=h.cell.x-.5&&h.input.y>=h.cell.y-.5&&h.input.right<=h.cell.right+.5&&h.input.bottom<=h.cell.bottom+.5;
      recordCheck(report, "new_functionality", `contained-table-header-checkbox-${viewport}`, contained, h, "checkbox fully inside header cell");
      const r=table.revealed, actionsContained=r&&r.actionsParentIsCell&&r.actions.x>=r.cell.x-.5&&r.actions.y>=r.cell.y-.5&&r.actions.right<=r.cell.right+.5&&r.actions.bottom<=r.cell.bottom+.5&&r.actions.width===60&&r.actions.height===24&&r.buttons.every((button)=>button.width===24&&button.height===24)&&r.copyOverflow==="hidden"&&r.textOverflow==="ellipsis"&&table.before.opacity==="0"&&r.opacity==="1";
      const statePass=table.ordinary.color===ACCENT&&table.danger.color===DANGER;
      recordCheck(report, "new_functionality", `inline-row-actions-final-cell-${viewport}`, actionsContained&&statePass, table, "60x24 actions in final cell, 24x24 buttons, ellipsis, ordinary accent and danger states");

      const search = await searchEvidence(page);
      const queryLower=search.query.toLocaleLowerCase("ru-RU");
      const searchPass=search.initial.length>1&&search.filtered.length>=1&&search.filtered.length<search.initial.length&&search.filtered.every((row)=>row.name.toLocaleLowerCase("ru-RU").includes(queryLower))&&search.clearedValue===""&&search.restored.length===search.initial.length&&search.restored.some((row)=>row.name===search.selected.name&&row.selected==="true")&&search.mutationRequests.length===0;
      recordCheck(report, "new_functionality", `russian-local-search-${viewport}`, searchPass, search, "case-insensitive filter; Escape clear; selection preserved; no mutation requests");

      const plotly = await plotlyEvidence(page);
      recordCheck(report, "quick_regression", `live-plotly-modebar-free-${viewport}`, plotly.fullLayout&&plotly.fullData&&plotly.svg&&plotly.staticPlot===false&&plotly.fixedrange===false&&plotly.modebarNodes===0, plotly, "live interactive Plotly with no modebar DOM");
      await screenshot(page, report, `production-default-${viewport}.png`);
    }
    recordCheck(report, "quick_regression", "zero-page-errors", report.page_errors.length===0&&report.console_errors.length===0, {page_errors:report.page_errors,console_errors:report.console_errors}, "zero page/console errors");
  } catch (error) {
    report.run_error = error.stack || String(error);
  } finally {
    for (const page of trackedPages.slice().reverse()) {
      try { if (!page.isClosed()) { await page.close(); report.closed_tab_count += 1; } } catch (error) { report.cleanup_error = String(error); }
    }
    report.tab_cleanup_status = report.closed_tab_count===report.opened_tab_count&&!report.cleanup_error ? "pass" : "fail";
    if (browser) await browser.close().catch((error)=>{report.browser_close_error=String(error);});
    for (const suite of ["new_functionality", "quick_regression"]) {
      const checks=report.checks.filter((check)=>check.suite===suite); report[suite]={planned:checks.length,passed:checks.filter((check)=>check.pass).length,failed:checks.filter((check)=>!check.pass).length,not_run:0};
      report[suite].success_rate=checks.length ? report[suite].passed/checks.length*100 : 0;
    }
    report.completed_at = new Date().toISOString();
    report.verdict = !report.run_error && report.checks.length===20 && report.checks.every((check)=>check.pass) && (PRODUCTION_ONLY || report.prototype_checks.every((check)=>check.pass)) && report.tab_cleanup_status==="pass" ? "pass" : "fail";
    fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify(report, null, 2));
  }
  process.stdout.write(JSON.stringify({ verdict:report.verdict, new_functionality:report.new_functionality, quick_regression:report.quick_regression, prototype_checks:report.prototype_checks, run_error:report.run_error, tab_cleanup_status:report.tab_cleanup_status, screenshots:report.screenshots }, null, 2));
  if (report.verdict !== "pass") process.exitCode = 1;
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
