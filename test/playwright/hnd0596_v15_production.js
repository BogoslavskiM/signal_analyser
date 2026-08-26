"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "70e95f532a7f2e969fa31ba25e6082c69596a571";
const prototype = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html";
const out = path.resolve(__dirname, "artifacts/HND-0596-v15");
const report = {
  id: "HND-0596", e2e_mode: "new_functionality_regression", target,
  expected_revision: expectedRevision, design_version: 15,
  design_ref: "architecture/design/TASK-0080-explicit-apply-flow/DESIGN.md",
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"],
  browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
  checks: [], requests: [], errors: [], screenshots: [], opened_tab_count: 0, closed_tab_count: 0,
};

function save() {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}
function check(name, pass, detail, scope = "new_functionality") {
  report.checks.push({ name, scope, status: pass ? "passed" : "failed", detail });
  save();
  if (!pass && /availability|revision/.test(name)) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}
async function shot(page, name) {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file, animations: "disabled" });
  report.screenshots.push({ file, url: page.url(), viewport: page.viewportSize(), at: new Date().toISOString() });
  save();
}
function activateChrome() {
  try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); }
  catch (error) { report.activation_error = String(error); }
}
async function front(page) { await page.bringToFront(); activateChrome(); }
function observeResponse(response) {
  const url = response.url();
  if (!/\/api\/(?:status|state-lite|outputs\/active|layouts)(?:\?|$)/.test(url)) return;
  report.requests.push({ url, method: response.request().method(), status: response.status(), at: new Date().toISOString() });
  save();
}
async function stateLite(page) {
  return page.evaluate(async () => { const response = await fetch("./api/state-lite", { cache: "no-store" }); return { status: response.status, body: await response.json() }; });
}
function stateContext(state) {
  const displayId = state.active_display_id;
  const entry = (state.layouts || []).find(item => item.display_id === displayId);
  const layout = entry && entry.layout;
  const paneId = layout && (layout.active_pane_id || (layout.panes && layout.panes[0] && layout.panes[0].id));
  const pane = layout && layout.panes.find(item => item.id === paneId);
  return { displayId, layout, paneId, pane };
}
async function waitPlot(page, paneId) {
  await page.waitForFunction(id => { const host = document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`); return host && host.dataset.plotReady === "true" && host.classList.contains("js-plotly-plot"); }, paneId, { timeout: 180000 });
}
async function openMenu(page, paneId) {
  await page.getByTestId(`pane-menu-${paneId}`).click();
  await page.getByTestId("display-overflow-menu").waitFor({ state: "visible" });
}
async function currentPlot(page, paneId) {
  return page.evaluate(id => {
    const host = document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`);
    if (!host) return null;
    host.__hnd0596Identity ||= `host-${Date.now()}-${Math.random()}`;
    host.__hnd0596Trace0 ||= host.data && host.data[0];
    return { identity: host.__hnd0596Identity, sameTrace: !!host.data && host.data[0] === host.__hnd0596Trace0, traces: host.data ? host.data.length : 0, range: host._fullLayout && host._fullLayout.xaxis && host._fullLayout.xaxis.range.slice() };
  }, paneId);
}
async function chooseLayout(page, rows, columns) {
  await page.getByTestId("layout-trigger").click();
  await page.locator(`[data-layout-rows='${rows}']`).click();
  await page.locator(`[data-layout-columns='${columns}']`).click();
  const wait = page.waitForResponse(response => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout: 60000 });
  await page.getByTestId("layout-apply").click();
  const response = await wait;
  if (response.status() !== 200) throw new Error(`layout ${rows}x${columns} failed: ${response.status()}`);
  await page.waitForFunction(([r, c]) => document.querySelectorAll("[data-pane-id]").length === r * c, [rows, columns], { timeout: 60000 });
}

async function prototypeWalkthrough(page) {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport); await front(page);
    await page.goto(prototype, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => !!window.__TASK0080_DESIGN__);
    await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
    await page.locator("[data-plot-menu-trigger='pane-time']").click();
    const empty = await page.evaluate(() => ({
      labels: Array.from(document.querySelectorAll("[data-design-id='plot-menu'] button")).map(node => node.textContent.trim()),
      disabled: document.querySelector("[data-plot-range-slider]").disabled,
      reason: document.querySelector("[data-plot-range-slider]").getAttribute("aria-label"),
    }));
    check(`prototype disabled menu ${viewport.width}x${viewport.height}`, JSON.stringify(empty.labels) === JSON.stringify(["Очистить область", "Слайдер диапазона", "Управление графиком"]) && empty.disabled && /загруженной временной области/.test(empty.reason || ""), empty, "design");
    await shot(page, `prototype-menu-disabled-${viewport.width}x${viewport.height}`);
    await page.keyboard.press("Escape");
    await page.locator("[data-signal-visible]").check();
    await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
    const host = page.locator("[data-plotly-pane='pane-time']");
    await host.evaluate(node => { node.__hnd0596 = true; });
    await page.locator("[data-plot-menu-trigger='pane-time']").click();
    await page.locator("[data-plot-range-slider]").click();
    await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
    const enabled = await host.evaluate(node => ({ same: node.__hnd0596 === true, slider: node.querySelectorAll(".rangeslider-container").length, visible: node.dataset.rangeSliderVisible, rail: (() => { const r = node.querySelector(".rangeslider-container")?.getBoundingClientRect(); return r && { width:r.width, height:r.height }; })() }));
    check(`prototype native slider ${viewport.width}x${viewport.height}`, enabled.same && enabled.slider === 1 && enabled.visible === "true" && enabled.rail && enabled.rail.width > 100 && enabled.rail.height > 8, enabled, "design");
    await shot(page, `prototype-slider-on-${viewport.width}x${viewport.height}`);
  }
}

(async () => {
  let browser, context, prototypePage, page;
  let baseline, workingPaneId, workingSignal, changedMembership = false, changedLayout = false, restored = false;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_page_urls = context.pages().map(item => item.url());
    prototypePage = await context.newPage(); report.opened_tab_count += 1;
    await prototypeWalkthrough(prototypePage);

    page = await context.newPage(); report.opened_tab_count += 1;
    page.on("response", observeResponse);
    page.on("pageerror", error => report.errors.push(`pageerror: ${String(error)}`));
    page.on("console", message => { if (message.type() === "error" && !/favicon/.test(message.text())) report.errors.push(`console: ${message.text()}`); });
    await page.setViewportSize({ width: 1024, height: 768 }); await front(page);
    const root = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 });
    const status = await page.evaluate(async () => { const response = await fetch("./api/status", { cache:"no-store" }); return { status:response.status, body:await response.json() }; });
    check("production availability and exact revision", root && root.status() === 200 && status.status === 200 && status.body.ready === true && status.body.runtime_revision === expectedRevision, { root:root && root.status(), status }, "quick");

    const initial = await stateLite(page); baseline = stateContext(initial.body);
    report.baseline = { stateRevision:initial.body.state_revision, displayId:baseline.displayId, rows:baseline.layout.rows, columns:baseline.layout.columns, activePaneId:baseline.paneId, panes:baseline.layout.panes.map(p => ({ id:p.id, plot_type:p.plot_type, bindings:Array.from(p.signal_bindings || []) })) };
    let emptyPane = baseline.layout.panes.find(p => !(p.signal_bindings || []).length);
    if (!emptyPane) {
      if (baseline.layout.rows * baseline.layout.columns >= 100) throw new Error("No safe slot for an empty pane");
      const rows = baseline.layout.rows, columns = baseline.layout.columns + 1 <= 10 ? baseline.layout.columns + 1 : baseline.layout.columns;
      const nextRows = columns === baseline.layout.columns ? rows + 1 : rows;
      await chooseLayout(page, nextRows, columns); changedLayout = true;
      const expanded = stateContext((await stateLite(page)).body);
      emptyPane = expanded.layout.panes.find(p => !(p.signal_bindings || []).length);
    }
    if (!emptyPane) throw new Error("Expected an empty pane for disabled-state coverage");
    await page.getByTestId(`plot-pane-${emptyPane.id}`).click();
    await openMenu(page, emptyPane.id);
    const emptyMenu = await page.evaluate(() => ({
      labels:Array.from(document.querySelectorAll("[data-testid='display-overflow-menu'] button")).map(node => node.textContent.trim()),
      disabled:document.querySelector("[data-testid='pane-menu-range-slider']").disabled,
      reason:document.querySelector("[data-testid='pane-menu-range-slider']").getAttribute("aria-label"),
      menuBox:(() => { const r=document.querySelector("[data-testid='display-overflow-menu']").getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width }; })(),
    }));
    check("production empty pane menu order and disabled reason", JSON.stringify(emptyMenu.labels) === JSON.stringify(["Очистить область", "Слайдер диапазона", "Управление графиком"]) && emptyMenu.disabled && /загруженной временной области/.test(emptyMenu.reason || "") && emptyMenu.menuBox.left >= 8 && emptyMenu.menuBox.right <= 1024 - 8, emptyMenu);
    await shot(page, "production-empty-menu-1024x768");

    // Help remains functional even while the Range Slider action is disabled.
    await page.getByTestId("pane-menu-help").click();
    const helpOpen = await page.evaluate(() => ({ visible:!document.querySelector("[data-testid='graph-help-overlay']").hidden, focus:document.activeElement && document.activeElement.getAttribute("aria-label"), menuVisible:!document.querySelector("[data-testid='display-overflow-menu']").hidden }));
    check("Help opens on empty pane and owns focus", helpOpen.visible && helpOpen.focus === "Закрыть справку по управлению графиком" && helpOpen.menuVisible, helpOpen);
    await page.locator("[data-graph-help-close]").click();
    const closeFocus = await page.evaluate(() => document.activeElement && document.activeElement.dataset.testid);
    check("Help close button restores action focus", closeFocus === "pane-menu-help", closeFocus);
    await page.getByTestId("pane-menu-help").click(); await page.keyboard.press("Escape");
    const escapeFocus = await page.evaluate(() => ({ hidden:document.querySelector("[data-testid='graph-help-overlay']").hidden, focus:document.activeElement && document.activeElement.dataset.testid }));
    check("Help Escape restores action focus", escapeFocus.hidden && escapeFocus.focus === "pane-menu-help", escapeFocus);
    await page.getByTestId("pane-menu-help").click();
    await page.mouse.click(8, 8);
    const outside = await page.evaluate(() => document.querySelector("[data-testid='graph-help-overlay']").hidden);
    check("Help outside pointer closes overlay", outside, { hidden:outside });

    // Prepare a ready temporal pane through the existing Signals table.
    await page.getByTestId(`plot-pane-${emptyPane.id}`).click();
    await page.getByTestId("inspector-tab-signals").click();
    const firstSignal = page.locator("input[data-visible-signal]").first();
    await firstSignal.waitFor({ state:"visible", timeout:30000 });
    workingSignal = await firstSignal.getAttribute("data-visible-signal");
    const bindWait = page.waitForResponse(response => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout:60000 });
    await firstSignal.check(); const bindResponse = await bindWait;
    check("signal bound to target pane through UI", bindResponse.status() === 200, { signal:workingSignal, status:bindResponse.status() });
    changedMembership = true; workingPaneId = emptyPane.id;
    await waitPlot(page, workingPaneId);
    const before = await currentPlot(page, workingPaneId);
    const beforeState = await stateLite(page);
    const beforeToggleRequests = report.requests.length;
    await openMenu(page, workingPaneId);
    const enabledAction = await page.evaluate(() => ({ disabled:document.querySelector("[data-testid='pane-menu-range-slider']").disabled, checked:document.querySelector("[data-testid='pane-menu-range-slider']").getAttribute("aria-checked") }));
    await page.getByTestId("pane-menu-range-slider").click();
    await page.waitForFunction(id => { const host=document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`); return host && host.dataset.rangeSliderVisible === "true" && host.querySelector(".rangeslider-container"); }, workingPaneId, { timeout:30000 });
    const after = await currentPlot(page, workingPaneId);
    const afterState = await stateLite(page);
    const toggleRequests = report.requests.slice(beforeToggleRequests);
    const sliderGeometry = await page.evaluate(id => {
      const host=document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`), rail=host.querySelector(".rangeslider-container"), r=rail.getBoundingClientRect();
      return { visible:host.dataset.rangeSliderVisible, rail:{x:r.x,y:r.y,width:r.width,height:r.height}, thickness:host._fullLayout.xaxis.rangeslider.thickness, bgcolor:host._fullLayout.xaxis.rangeslider.bgcolor, borderwidth:host._fullLayout.xaxis.rangeslider.borderwidth, yfixed:host._fullLayout.yaxis.fixedrange };
    }, workingPaneId);
    check("Range Slider enables on ready temporal plot without host/trace/revision/output change", !enabledAction.disabled && enabledAction.checked === "false" && before && after && before.identity === after.identity && after.sameTrace && before.traces === after.traces && beforeState.body.state_revision === afterState.body.state_revision && toggleRequests.filter(item => /\/api\/outputs\/active/.test(item.url)).length === 0, { enabledAction, before, after, revisionBefore:beforeState.body.state_revision, revisionAfter:afterState.body.state_revision, toggleRequests });
    check("native overview rail has canonical geometry and fixed y-axis", sliderGeometry.visible === "true" && sliderGeometry.rail.width > 100 && sliderGeometry.rail.height > 8 && Math.abs(sliderGeometry.thickness - 0.15) < 0.001 && sliderGeometry.bgcolor === "#ffffff" && sliderGeometry.borderwidth === 1 && sliderGeometry.yfixed === true, sliderGeometry);
    await shot(page, "production-slider-on-1024x768");

    // Exercise the native selected window/rail with a real pointer drag.
    const rail = page.locator(`[data-testid='plot-host-${workingPaneId}'] .rangeslider-container`);
    const box = await rail.boundingBox();
    const rangeBeforeDrag = (await currentPlot(page, workingPaneId)).range;
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.5, { steps:8 }); await page.mouse.up();
    await page.waitForFunction(([id, range]) => { const host=document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`); const next=host && host._fullLayout.xaxis.range; return next && (Math.abs(next[0]-range[0])>1e-9 || Math.abs(next[1]-range[1])>1e-9); }, [workingPaneId, rangeBeforeDrag], { timeout:10000 }).catch(() => {});
    const dragged = await currentPlot(page, workingPaneId);
    const dragChanged = dragged && (Math.abs(dragged.range[0]-rangeBeforeDrag[0])>1e-9 || Math.abs(dragged.range[1]-rangeBeforeDrag[1])>1e-9);
    check("native Range Slider pointer interaction changes enlarged x-range on same host", dragChanged && dragged.identity === before.identity, { before:rangeBeforeDrag, after:dragged && dragged.range, identity:dragged && dragged.identity });

    await openMenu(page, workingPaneId);
    const checked = await page.getByTestId("pane-menu-range-slider").getAttribute("aria-checked");
    await page.getByTestId("pane-menu-range-slider").click();
    await page.waitForFunction(id => { const host=document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`); return host && host.dataset.rangeSliderVisible === "false" && !host.querySelector(".rangeslider-container"); }, workingPaneId, { timeout:30000 });
    const toggledOff = await currentPlot(page, workingPaneId);
    const menuFocus = await page.evaluate(() => document.activeElement && document.activeElement.dataset.testid);
    check("Range Slider toggles off pane-locally on same host and restores ellipsis focus", checked === "true" && toggledOff.identity === before.identity && toggledOff.sameTrace && menuFocus === `pane-menu-${workingPaneId}`, { checked, toggledOff, menuFocus });

    // Clear keeps its retained confirmation workflow: first cancel, then confirm.
    await openMenu(page, workingPaneId); await page.getByTestId("pane-menu-clear").click();
    const confirmOpen = await page.evaluate(() => ({ visible:!document.querySelector("[data-testid='pane-clear-confirm-layer']").hidden, focus:document.activeElement && document.activeElement.id, shellInert:document.querySelector("[data-testid='app-shell']").inert }));
    await page.getByTestId("pane-clear-cancel").click();
    const cancelState = await page.evaluate(id => ({ plot:!!document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`), focus:document.activeElement && document.activeElement.dataset.testid, modalHidden:document.querySelector("[data-testid='pane-clear-confirm-layer']").hidden }), workingPaneId);
    check("Clear cancel preserves pane and restores ellipsis focus", confirmOpen.visible && confirmOpen.focus === "pane-clear-confirm-title" && confirmOpen.shellInert && cancelState.plot && cancelState.modalHidden && cancelState.focus === `pane-menu-${workingPaneId}`, { confirmOpen, cancelState });
    await openMenu(page, workingPaneId); await page.getByTestId("pane-menu-clear").click();
    const clearWait = page.waitForResponse(response => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout:60000 });
    await page.getByTestId("pane-clear-confirm").click(); const clearResponse = await clearWait;
    await page.getByTestId(`pane-empty-${workingPaneId}`).waitFor({ state:"visible", timeout:60000 });
    const clearedState = stateContext((await stateLite(page)).body);
    const clearedPane = clearedState.layout.panes.find(p => p.id === workingPaneId);
    check("Clear confirm empties only targeted pane", clearResponse.status() === 200 && clearedPane && clearedPane.signal_bindings.length === 0 && clearedState.layout.panes.filter(p => p.id !== workingPaneId).every(p => JSON.stringify(p.signal_bindings || []) === JSON.stringify((report.baseline.panes.find(old => old.id === p.id) || p).bindings || p.signal_bindings || [])), { status:clearResponse.status(), panes:clearedState.layout.panes.map(p => ({ id:p.id, bindings:p.signal_bindings })) });

    // Restore target membership, then original layout if this run expanded it.
    await page.getByTestId("inspector-tab-signals").click();
    const restoreCheckbox = page.locator(`input[data-visible-signal='${workingSignal.replace(/'/g, "\\'")}']`);
    const restoreWait = page.waitForResponse(response => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout:60000 });
    await restoreCheckbox.check(); const restoreResponse = await restoreWait;
    changedMembership = false;
    check("cleared signal membership restored through UI", restoreResponse.status() === 200, { status:restoreResponse.status(), signal:workingSignal });
    if (changedLayout) { await chooseLayout(page, baseline.layout.rows, baseline.layout.columns); changedLayout = false; }
    const final = stateContext((await stateLite(page)).body);
    const finalPanes = final.layout.panes.map(p => ({ id:p.id, plot_type:p.plot_type, bindings:Array.from(p.signal_bindings || []) }));
    const expectedPanes = report.baseline.panes;
    restored = final.layout.rows === baseline.layout.rows && final.layout.columns === baseline.layout.columns && JSON.stringify(finalPanes) === JSON.stringify(expectedPanes);
    report.restoration = { status:restored ? "verified" : "failed", expected:{ rows:baseline.layout.rows, columns:baseline.layout.columns, panes:expectedPanes }, actual:{ rows:final.layout.rows, columns:final.layout.columns, panes:finalPanes } };
    check("production layout and memberships restored to baseline", restored, report.restoration, "cleanup");

    await page.setViewportSize({ width:1440, height:900 }); await front(page);
    await openMenu(page, final.paneId);
    const wideMenu = await page.evaluate(() => { const r=document.querySelector("[data-testid='display-overflow-menu']").getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width }; });
    check("pane menu remains anchored and unclipped at 1440x900", wideMenu.left >= 8 && wideMenu.right <= 1432 && wideMenu.top >= 8 && wideMenu.bottom <= 892 && Math.abs(wideMenu.width - 224) <= 1, wideMenu, "quick");
    await shot(page, "production-final-menu-1440x900");
  } catch (error) {
    report.errors.push(String(error && error.stack || error));
  } finally {
    if (page && !page.isClosed() && baseline && (!restored || changedMembership || changedLayout)) {
      // Only safe UI restoration attempts; never use direct state mutation.
      try {
        await front(page);
        if (changedMembership && workingSignal && workingPaneId) {
          await page.getByTestId(`plot-pane-${workingPaneId}`).click().catch(() => {});
          await page.getByTestId("inspector-tab-signals").click();
          const checkbox = page.locator(`input[data-visible-signal='${workingSignal.replace(/'/g, "\\'")}']`);
          if (await checkbox.count() && !(await checkbox.isChecked())) {
            const wait = page.waitForResponse(response => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout:60000 });
            await checkbox.check(); await wait;
          }
        }
        if (changedLayout) await chooseLayout(page, baseline.layout.rows, baseline.layout.columns);
        const final = stateContext((await stateLite(page)).body);
        report.restoration = { status:"attempted-in-finally", rows:final.layout.rows, columns:final.layout.columns, panes:final.layout.panes.map(p => ({ id:p.id, bindings:p.signal_bindings })) };
      } catch (restoreError) { report.errors.push(`restoration: ${String(restoreError && restoreError.stack || restoreError)}`); }
    }
    for (const item of [prototypePage, page]) {
      if (item && !item.isClosed()) { try { await item.close(); report.closed_tab_count += 1; } catch (error) { report.errors.push(`cleanup: ${String(error)}`); } }
    }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    report.summary = { planned:report.checks.length, passed:report.checks.filter(item => item.status === "passed").length, failed:report.checks.filter(item => item.status === "failed").length, success_rate:report.checks.length ? Math.round(report.checks.filter(item => item.status === "passed").length / report.checks.length * 1000) / 10 : 0 };
    save();
    if (browser) await browser.close();
    process.stdout.write(`${JSON.stringify({ summary:report.summary, errors:report.errors, restoration:report.restoration, cleanup:report.tab_cleanup_status }, null, 2)}\n`);
    if (report.errors.length || report.checks.some(item => item.status === "failed") || report.tab_cleanup_status !== "passed") process.exitCode = 1;
  }
})();
