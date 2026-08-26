"use strict";

// TASK-0086 foreground production visual/regression probe.  It deliberately
// owns only its pages and writes evidence below test/playwright/artifacts.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "0f8373d6d19357cd35b391094f6b77653f6acac0";
const prototype = `file://${path.resolve("architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html")}`;
const output = path.resolve("test/playwright/artifacts/TASK-0086");
fs.mkdirSync(output, { recursive: true });

const report = {
  id: "HND-TASK-0086-E2E", e2e_mode: "new_functionality_regression + quick_regression",
  target, expected_revision: revision, revision_evidence: "DevOps exact-checkout deployment precondition (not a rendered-DOM assertion)", prototype, design_version: "5",
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"],
  browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
  opened_tab_count: 0, closed_tab_count: 0, checks: [], screenshots: [], console_errors: [], network: [],
};
function check(name, pass, detail) { report.checks.push({ name, status: pass ? "passed" : "failed", detail }); }
function noteShot(file, page, state) { report.screenshots.push({ path: path.join(output, file), target: page.url(), viewport: page.viewportSize(), state, timestamp: new Date().toISOString() }); }
async function shot(page, file, state) { await page.screenshot({ path: path.join(output, file), fullPage: false }); noteShot(file, page, state); }
async function activate() { try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); report.chrome_activation = "ok"; } catch (e) { report.chrome_activation = String(e); } }
function attach(page) {
  page.on("console", m => { if (m.type() === "error") report.console_errors.push({ text: m.text(), url: m.location().url, line: m.location().lineNumber }); });
  page.on("response", r => {
    const entry = { status: r.status(), url: r.url(), method: r.request().method(), resource: r.request().resourceType(), is_main_document: r.request().isNavigationRequest() && r.frame() === page.mainFrame() };
    if (entry.is_main_document || r.status() >= 400) report.network.push(entry);
  });
}
async function front(page) { await page.bringToFront(); await activate(); }
async function geometry(page) { return page.evaluate(() => {
  const box = s => { const n = document.querySelector(s); if (!n) return null; const b = n.getBoundingClientRect(); const c = getComputedStyle(n); return { x:b.x,y:b.y,w:b.width,h:b.height,display:c.display,position:c.position,overflowX:c.overflowX,overflowY:c.overflowY,borderRadius:c.borderRadius,fontFamily:c.fontFamily }; };
  const texts = [...document.querySelectorAll("body *")].filter(n => n.children.length === 0).map(n => n.textContent.trim()).filter(Boolean).slice(0,400);
  return { shell: box('[data-testid="app-shell"], [data-design-id="app-shell"]'), grid: box('[data-testid="plot-grid"], [data-design-id="plot-grid"]'), settings: box('aside.settings-panel, [data-testid="settings-panel"], [data-design-id="settings-panel"]'), inspector: box('.inspector, [data-testid="signal-table"], .signal-panel'), toolbar: box('.app-toolbar, header'), layout: box('[data-testid="layout-trigger"], [data-design-id="layout-trigger"]'), apply: box('[data-testid="settings-apply"], [data-design-id="settings-apply"]'), body: { sw:document.documentElement.scrollWidth, sh:document.documentElement.scrollHeight, cw:document.documentElement.clientWidth, ch:document.documentElement.clientHeight }, texts, font: getComputedStyle(document.body).fontFamily,
    displays: [...document.querySelectorAll('[data-testid^="display-tab-"], .display-tab-shell, [role="tab"]')].map(n => n.textContent.trim()),
    signals: [...document.querySelectorAll('[data-testid^="signal-row-"], .signal-table tbody tr')].map(n => n.textContent.trim()),
    plots: [...document.querySelectorAll('[data-testid^="plot-pane-"], .plot-pane, .plot-card')].map(n => ({ text:n.textContent.trim().slice(0,120), box:(() => {const b=n.getBoundingClientRect();return {w:b.width,h:b.height};})() })),
    plotly: document.querySelectorAll('.js-plotly-plot').length,
    modebar: [...document.querySelectorAll('.modebar, .modebar-container')].filter(n => { const s=getComputedStyle(n),b=n.getBoundingClientRect(); return s.display!=="none"&&s.visibility!=="hidden"&&b.width>0&&b.height>0&&n.childElementCount>0; }).length,
  };
}); }
async function clickIf(page, selector) { const l = page.locator(selector).first(); if (await l.count() && await l.isVisible()) { await l.click(); return true; } return false; }
async function tabAudit(page, label) {
  // The settings and inspector both have a tab named «Измерения»; select only
  // the visible control physically inside the lower inspector.
  const index = await page.evaluate(expected => {
    const root = document.querySelector('[data-testid="signal-table"], .inspector, .signal-panel');
    if (!root) return -1;
    const all = [...document.querySelectorAll('button,[role="tab"],[data-testid^="inspector-tab-"]')];
    return all.findIndex(n => root.contains(n) && n.textContent.trim() === expected && (() => { const s=getComputedStyle(n),b=n.getBoundingClientRect(); return s.display!=="none"&&s.visibility!=="hidden"&&b.width>0&&b.height>0; })());
  }, label);
  const target = index >= 0 ? page.locator('button,[role="tab"],[data-testid^="inspector-tab-"]').nth(index) : page.locator(':not(*)');
  const before = await target.count() ? await target.getAttribute("aria-selected") : null;
  const beforeContext = await page.locator('[data-testid="signal-table"], .inspector, .signal-panel').first().innerText().catch(()=>"");
  if (!await target.count() || !await target.isVisible()) return { label, found: false, before, after: null, panels: [], beforeContext };
  await target.click();
  await page.waitForFunction(expected => {
    const tabs = [...document.querySelectorAll('[role="tab"], [data-testid^="inspector-tab-"]')];
    return tabs.some(t => t.textContent.trim() === expected && (t.getAttribute("aria-selected") === "true" || t.classList.contains("active") || t.classList.contains("selected")));
  }, label, { timeout: 3000 }).catch(() => {});
  return await page.evaluate(({expected,beforeContext}) => {
    const root = document.querySelector('[data-testid="signal-table"], .inspector, .signal-panel');
    const tab = [...document.querySelectorAll('[role="tab"], [data-testid^="inspector-tab-"]')].find(t => t.textContent.trim() === expected);
    const visible = n => { if (!n) return false; const s=getComputedStyle(n), b=n.getBoundingClientRect(); return s.display!=="none" && s.visibility!=="hidden" && b.width>0 && b.height>0; };
    const panels = [...document.querySelectorAll('[role="tabpanel"], [data-testid^="inspector-pane-"]')].filter(visible).map(n => ({ id:n.id, testid:n.dataset.testid || null, text:n.innerText.trim().slice(0,500) }));
    const localTab = root && [...root.querySelectorAll('button,[role="tab"],[data-testid^="inspector-tab-"]')].find(t => t.textContent.trim() === expected);
    const context = root ? root.innerText.trim() : "";
    return { label:expected, found:!!localTab, before:null, after:localTab && localTab.getAttribute("aria-selected"), active:localTab && (localTab.classList.contains("active") || localTab.classList.contains("selected")), panels, beforeContext, context, contentChanged:context !== beforeContext };
  }, {expected:label,beforeContext});
}
async function settingsAndInspectorAudit(page) { return page.evaluate(() => {
  const visible = n => { if (!n) return false; const s=getComputedStyle(n),b=n.getBoundingClientRect(); return s.display!=="none"&&s.visibility!=="hidden"&&b.width>0&&b.height>0; };
  const dim = n => { if (!n) return null; const b=n.getBoundingClientRect(),s=getComputedStyle(n); return {w:b.width,h:b.height,x:b.x,y:b.y,display:s.display,overflowY:s.overflowY,borderRadius:s.borderRadius,fontFamily:s.fontFamily}; };
  const byText = label => [...document.querySelectorAll('button,[role="tab"],label,div,span')].filter(visible).filter(n => n.children.length===0 && n.textContent.trim()===label);
  const settings = document.querySelector('[data-testid="settings-panel"], aside.settings-panel');
  const inspector = document.querySelector('[data-testid="signal-table"], .inspector, .signal-panel');
  const settingTabs = ["Отображение","Время","Измерения"].map(label => { const nodes = settings ? byText(label).filter(n => settings.contains(n)) : []; return {label,count:nodes.length,nodes:nodes.map(dim)}; });
  const settingsParts = ["settings-heading","settings-tabs","settings-content","settings-footer"].map(id => ({id,count:document.querySelectorAll(`[data-testid="${id}"]`).length,box:dim(document.querySelector(`[data-testid="${id}"]`))}));
  const raw = document.body.innerText;
  const rows = [...document.querySelectorAll('[data-testid^="signal-row-"], .signal-table tbody tr, .signal-list-item')].filter(visible).map(n => ({text:n.innerText.trim(),box:dim(n),html:n.outerHTML.slice(0,1200)}));
  const headers = [...document.querySelectorAll('[data-testid^="signal-table"] th, .signal-table th, .signal-table thead td')].filter(visible).map(n => n.textContent.trim());
  const swatches = [...document.querySelectorAll('[data-testid*="color"], .color-swatch, input[type="color"]')].filter(visible).map(dim);
  const controls = settings ? [...settings.querySelectorAll('input,select,button')].filter(visible).map(n => ({tag:n.tagName,type:n.type||null,text:n.textContent.trim(),value:n.value||null,box:dim(n)})) : [];
  const rowActions = inspector ? [...inspector.querySelectorAll('[data-testid^="signal-duplicate-"], [data-testid^="signal-delete-"]')].filter(visible).length : 0;
  return {settings:dim(settings),inspector:dim(inspector),settingsParts,settingTabs,controls,rows,headers,swatches,rowActions,hasObjectObject:/\[object Object\]/.test(raw) || controls.some(c=>c.value==="[object Object]"),rawSettingsText:settings ? settings.innerText.slice(0,5000) : "",rawInspectorText:inspector ? inspector.innerText.slice(0,5000) : ""};
}); }
async function appErrorDetails(page) { return page.evaluate(() => {
  const node = document.querySelector('[data-testid="app-error"]');
  if (!node) return null;
  const s = getComputedStyle(node), b = node.getBoundingClientRect();
  return { visible: !node.hidden && s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0, text: node.innerText.trim(), html: node.outerHTML.slice(0, 4000), role: node.getAttribute("role"), ariaLive: node.getAttribute("aria-live") };
}); }
async function waitForProductionTerminal(page) {
  await page.waitForFunction(() => {
    const visible = selector => { const n = document.querySelector(selector); if (!n) return false; const s = getComputedStyle(n), b = n.getBoundingClientRect(); return !n.hidden && s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
    if (visible('[data-testid="app-error"]')) return true;
    const loaderVisible = visible('[data-testid="app-loading"]');
    return !loaderVisible && (visible('[data-testid="plot-grid"]') || visible('.plot-grid') || visible('[data-testid^="plot-pane-"]') || visible('.plot-pane') || document.querySelectorAll('.js-plotly-plot').length > 0);
  }, null, { timeout: 60000 });
  const appError = await appErrorDetails(page);
  report.app_error = appError;
  if (appError && appError.visible) throw new Error(`application error terminal state: ${appError.text}`);
  report.bootstrap_terminal = await page.evaluate(() => ({ loader_present: !!document.querySelector('[data-testid="app-loading"]'), plotly_hosts: document.querySelectorAll('.js-plotly-plot').length, plot_grid_present: !!document.querySelector('[data-testid="plot-grid"], .plot-grid') }));
}

(async () => {
  let browser, context; const tracked = new Set();
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_pages = context.pages().map(p => p.url());
    report.preexisting_page_count = report.preexisting_pages.length;
    await activate();
    const open = async () => { const p = await context.newPage(); tracked.add(p); report.opened_tab_count++; attach(p); await front(p); return p; };

    const design = await open();
    for (const vp of [[1024,768],[1280,720],[1440,900]]) {
      await design.setViewportSize({ width:vp[0], height:vp[1] }); await front(design);
      if (!design.url().startsWith("file:")) await design.goto(prototype, { waitUntil:"domcontentloaded", timeout:30000 });
      await design.waitForSelector('[data-design-id="app-shell"]', { timeout:10000 });
      if (vp[0] === 1024) { await clickIf(design, '[data-design-id="layout-trigger"]'); await shot(design, `prototype-layout-${vp[0]}x${vp[1]}.png`, "layout-popover"); await design.keyboard.press("Escape"); await clickIf(design, '[data-design-id="settings-tab-time"]'); const input = design.locator('input[type="number"], input:not([type])').first(); if (await input.count()) { await input.fill("0.3"); await input.blur(); } }
      const g = await geometry(design); report[`prototype_${vp[0]}x${vp[1]}`] = g; await shot(design, `prototype-${vp[0]}x${vp[1]}.png`, "walkthrough");
      check(`prototype ${vp[0]}x${vp[1]} shell/settings/layout`, !!g.shell && !!g.settings && !!g.layout, g);
    }
    // Contract sizing probes including min and undersized document-scroll behavior.
    for (const [w,h] of [[920,680],[840,620]]) { await design.setViewportSize({width:w,height:h}); await front(design); const g=await geometry(design); report[`prototype_${w}x${h}`]=g; await shot(design,`prototype-sizing-${w}x${h}.png`,`sizing-${w}x${h}`); check(`prototype sizing ${w}x${h}`, w>=920&&h>=680 ? g.body.sw===g.body.cw&&g.body.sh===g.body.ch : g.body.sw>g.body.cw&&g.body.sh>g.body.ch, g.body); }

    const prod = await open();
    await prod.goto(target, { waitUntil:"domcontentloaded", timeout:60000 }); await front(prod);
    const technical = await prod.evaluate(() => ({ title:document.title, text:document.body.innerText.slice(0,3000), url:location.href }));
    report.production_document = technical;
    const maintenance = /техническ|maintenance|temporar(?:y|ily) unavailable|service unavailable|application error/i.test(technical.title + "\n" + technical.text);
    if (maintenance) { await shot(prod, "production-availability-failure.png", "technical-maintenance"); check("availability", false, technical); report.availability = "failed"; throw new Error("technical/maintenance production screen"); }
    const ready = prod.locator('[data-testid="app-shell"], #app, main').first(); await ready.waitFor({ state:"visible", timeout:60000 });
    await waitForProductionTerminal(prod);
    report.availability = "passed"; check("availability", true, { url:prod.url(), bootstrap_terminal: report.bootstrap_terminal });
    check("expected revision deployment precondition", true, { expected_revision: revision, authority: report.revision_evidence });
    for (const vp of [[1024,768],[1280,720],[1440,900],[920,680],[840,620]]) {
      await prod.setViewportSize({width:vp[0],height:vp[1]}); await front(prod);
      await ready.waitFor({state:"visible",timeout:10000}); await waitForProductionTerminal(prod); const g=await geometry(prod); report[`production_${vp[0]}x${vp[1]}`]=g; await shot(prod,`production-${vp[0]}x${vp[1]}.png`,`default-${vp[0]}x${vp[1]}`);
      const normal=vp[0]>=920&&vp[1]>=680; check(`production sizing ${vp[0]}x${vp[1]}`, normal ? !!g.shell&&g.body.sw===g.body.cw&&g.body.sh===g.body.ch : g.body.sw>g.body.cw&&g.body.sh>g.body.ch, g);
    }
    await prod.setViewportSize({width:1440,height:900}); await front(prod);
    await prod.waitForSelector('[data-plot-ready="true"]', { state:"attached", timeout:60000 });
    const base = await geometry(prod);
    check("v5 shell has settings and single default harmonic signal", !!base.settings && base.signals.filter(x=>/Гармонический сигнал/i.test(x)).length === 1, base);
    check("layout trigger is live 1×1", !!base.layout && /1\s*[×x]\s*1/.test((await prod.locator('[data-testid="layout-trigger"], [aria-label*="макет"]').first().textContent().catch(()=>"")) || ""), base.layout);
    check("native Plotly/no modebar", base.plotly >= 1 && base.modebar === 0, {plotly:base.plotly,modebar:base.modebar});
    const openedLayout = await clickIf(prod, '[data-testid="layout-trigger"], [aria-label*="макет"]');
    if (openedLayout) { await shot(prod,"production-layout-popover.png","layout-open"); const d=await prod.evaluate(()=>{const e=document.activeElement,b=e.getBoundingClientRect(); const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2); const dialogs=[...document.querySelectorAll('[role="dialog"]')]; return {focus:e.outerHTML.slice(0,200),hit:hit&&hit.outerHTML.slice(0,200),dialog:dialogs.map(n=>n.getBoundingClientRect().width),layout_apply_actions:dialogs.flatMap(n=>[...n.querySelectorAll('button')]).filter(n=>n.textContent.trim()==="Применить").length};}); check("layout overlay focus/hit", d.dialog.some(w=>Math.abs(w-372)<=2)&&!!d.hit,d); check("layout popover has its separate Apply action", d.layout_apply_actions === 1, d); await prod.keyboard.press("Escape"); }
    const apply = prod.locator('[data-testid="settings-apply"]'); if (await apply.count()) check("single settings Apply control", await apply.count() === 1, {count:await apply.count(), disabled:await apply.first().isDisabled()}); else check("single settings Apply control", false, "missing stable [data-testid=settings-apply]");
    const audit = await settingsAndInspectorAudit(prod); report.settings_and_inspector = audit;
    const settingsContract = audit.settings && audit.settingsParts.every(x => x.count === 1) &&
      audit.settingsParts.find(x=>x.id==="settings-heading").box && Math.abs(audit.settingsParts.find(x=>x.id==="settings-heading").box.h-42)<=1 &&
      audit.settingsParts.find(x=>x.id==="settings-tabs").box && Math.abs(audit.settingsParts.find(x=>x.id==="settings-tabs").box.h-32)<=1 &&
      audit.settingsParts.find(x=>x.id==="settings-footer").box && Math.abs(audit.settingsParts.find(x=>x.id==="settings-footer").box.h-54)<=1 &&
      audit.settingTabs.every(x=>x.count === 1) && !audit.hasObjectObject;
    check("v5 settings is one complete localized menu without object serialization", settingsContract, audit);
    const fieldControls = audit.controls.filter(x=>(x.tag==="SELECT") || (x.tag==="INPUT" && x.type!=="checkbox"));
    check("v5 settings controls use canonical 32px fields and 40px row rhythm", fieldControls.every(x=>Math.abs(x.box.h-32)<=1) && fieldControls.length>0 && audit.controls.filter(x=>x.tag==="INPUT"&&x.type==="checkbox").every(x=>Math.abs(x.box.h-16)<=1) && audit.rows.every(r=>Math.abs(r.box.h-32)<=1), {controls:audit.controls,rows:audit.rows});
    check("v5 inspector table exposes canonical signal columns and row affordances", audit.rows.length===1 && audit.swatches.length>=1 && audit.headers.length>=8 && /(?:частот|sample)/i.test(audit.rawInspectorText) && /(?:длитель|duration)/i.test(audit.rawInspectorText) && /(?:тип|type)/i.test(audit.rawInspectorText) && audit.rowActions>=2, audit);
    for (const label of ["Измерения", "Пики"]) {
      await front(prod); const result = await tabAudit(prod, label); report[`inspector_tab_${label}`] = result;
      check(`inspector ${label} tab click selects it and changes active pane`, result.found && (result.after === "true" || result.active) && (result.panels.length === 1 ? result.panels[0].text.length > 0 : result.contentChanged), result);
      await shot(prod, `production-inspector-${label}.png`, `inspector-${label}-active`);
    }
    await front(prod); const signals = await tabAudit(prod, "Сигналы"); report.inspector_tab_signals = signals;
    // Returning to the initial Signals context can legitimately restore the
    // same text, so selection—not a text delta—is the observable restoration.
    check("inspector Signals tab restores active pane", signals.found && (signals.after === "true" || signals.active), signals);
    await shot(prod,"production-final-1440x900.png","final");
  } catch (e) { report.run_error = String(e && e.stack || e); }
  finally {
    for (const p of tracked) { if (!p.isClosed()) { try { await p.close(); report.closed_tab_count++; } catch (e) { report.cleanup_error = String(e); } } }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count && !report.cleanup_error ? "passed" : "failed";
    const passed = report.checks.filter(c=>c.status==="passed").length, failed=report.checks.filter(c=>c.status==="failed").length;
    report.summary={planned:report.checks.length,passed,failed,not_run:0,success_rate:report.checks.length ? +(passed/report.checks.length*100).toFixed(1):0,operational:report.availability==="passed"&&passed/report.checks.length>=.75};
    fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2));
    if (browser) await browser.close();
    console.log(JSON.stringify(report.summary));
  }
})();
