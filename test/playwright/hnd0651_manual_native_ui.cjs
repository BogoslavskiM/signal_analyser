"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const EXPECTED_REVISION = "7508de24ac72b630630e79eae2d5addc73df17a7";
const PROTOTYPE = `file://${path.resolve("architecture/design/TASK-0104-engee-portable-session-package/prototype/index.html")}`;
const OUT = path.resolve("test/playwright/artifacts/HND-0651");
fs.mkdirSync(OUT, { recursive: true });
const report = { id: "HND-0651", type: "report", from: "E2E", to: "Orchestrator", e2e_mode: "new_functionality_regression", target: TARGET, expected_revision: EXPECTED_REVISION, prototype_requested: "v23", prototype_used: "v21 (only pinned local prototype present)", applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"], browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1, started_at: new Date().toISOString(), checks: [], screenshots: [], network: [], opened_tab_count: 0, closed_tab_count: 0, tab_cleanup_status: "pending" };
const check = (name, pass, evidence = {}) => report.checks.push({ name, status: pass ? "passed" : "failed", evidence });
const shot = async (page, name) => { const file = path.join(OUT, `${name}.png`); await page.screenshot({ path: file, fullPage: true, animations: "disabled" }); report.screenshots.push(file); };
const text = async page => (await page.locator("body").innerText()).slice(0, 12000);
const geometry = async page => page.evaluate(() => Array.from(document.querySelectorAll("[role=dialog], dialog, .modal, .dialog, .overlay, .popup, .file-browser, [class*=folder], [class*=browser]")).map((e, index) => { const r=e.getBoundingClientRect(), s=getComputedStyle(e); return { index, tag:e.tagName, id:e.id, role:e.getAttribute("role"), cls:e.className, text:(e.innerText||"").slice(0,700), rect:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}, position:s.position, zIndex:s.zIndex, display:s.display, visibility:s.visibility, parent:{tag:e.parentElement&&e.parentElement.tagName,id:e.parentElement&&e.parentElement.id,cls:e.parentElement&&e.parentElement.className} }; }).filter(x => x.display !== "none" && x.visibility !== "hidden"));

(async () => {
  let browser, prototype, production;
  const tracked = new Set();
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_page_count = context.pages().length;
    const responseListener = response => { const u=response.url(); if (u.includes("/signal_analyser/") || u.includes("/user/")) report.network.push({ url:u, status:response.status(), method:response.request().method() }); };

    prototype = await context.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 }); tracked.add(prototype); report.opened_tab_count++;
    await prototype.bringToFront();
    await prototype.goto(PROTOTYPE, { waitUntil: "load", timeout: 30000 });
    await prototype.waitForFunction(() => window.__TASK0104_DESIGN__?.version === 21);
    await prototype.locator("[data-design-id=toolbar-save]").click();
    check("prototype Save opens 560px contract dialog", await prototype.locator("[data-design-id=save-layer]").isVisible(), await geometry(prototype));
    await shot(prototype, "prototype-save-v21");
    await prototype.keyboard.press("Escape");
    await prototype.locator("[data-design-id=toolbar-import]").click();
    await prototype.locator("[data-file-kind=valid]").click();
    await prototype.locator("[data-design-id=import-validate]").click();
    await prototype.waitForSelector("[data-design-id=import-summary]", { timeout: 3000 });
    check("prototype import validation contract", true, { dialog: await geometry(prototype) });
    await shot(prototype, "prototype-import-v21");

    production = await context.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 }); tracked.add(production); report.opened_tab_count++;
    production.on("response", responseListener);
    await production.bringToFront();
    const main = await production.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 120000 });
    report.main_document = { url: production.url(), status: main && main.status(), time: new Date().toISOString() };
    await production.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 });
    const status = await production.evaluate(async () => { const r=await fetch("./api/status"); return { status:r.status, body:await r.json() }; });
    report.runtime_status = status;
    check("production availability", main && main.ok(), report.main_document);
    check("exact runtime revision", status.body && status.body.runtime_revision === EXPECTED_REVISION, status);
    await shot(production, "production-ready");

    const save = production.getByRole("button", { name: /Сохранить|Save/i }).first();
    check("Save trigger available", await save.count() === 1, { buttons: await production.getByRole("button").allTextContents() });
    await production.bringToFront(); await save.click({ timeout: 30000 });
    await production.waitForTimeout(250);
    const saveBody = await text(production); const saveGeo = await geometry(production);
    check("Save opens populated selector", /тип|format|тип.*сохран|сохран.*тип/i.test(saveBody) && saveGeo.length > 0, { saveBody, saveGeo });
    await shot(production, "production-save-open");
    await production.keyboard.press("Escape");

    const imp = production.getByRole("button", { name: /Импорт|Import/i }).first();
    check("Import trigger available", await imp.count() === 1, { buttons: await production.getByRole("button").allTextContents() });
    await production.bringToFront(); await imp.click({ timeout: 30000 });
    await production.waitForTimeout(350);
    const importStart = await text(production); const importStartGeo = await geometry(production);
    check("Import opens visible overlay", importStartGeo.length > 0, { importStart, importStartGeo });
    await shot(production, "production-import-open");
    const folderCandidates = production.getByRole("button", { name: /папк|folder|обзор|browse|каталог/i });
    const folderCount = await folderCandidates.count();
    check("Import exposes folder browser trigger", folderCount > 0, { folderCount, buttons: await production.getByRole("button").allTextContents() });
    if (folderCount) {
      await production.bringToFront();
      await folderCandidates.first().click({ timeout: 30000 });
      await production.waitForTimeout(600);
      const folderText = await text(production); const folderGeo = await geometry(production);
      const badBottom = folderGeo.some(x => /user|папк|folder|файл/i.test(x.text) && x.rect.y > 700 && x.position !== "fixed");
      const hit = await production.evaluate(() => { const e=Array.from(document.querySelectorAll("*")).find(x => /\/user\b/.test(x.innerText||"") && x.getBoundingClientRect().y>0); if(!e) return null; const r=e.getBoundingClientRect(), p=document.elementFromPoint(Math.max(1, r.left+2), Math.max(1, Math.min(innerHeight-2,r.top+2))); return { target:{tag:e.tagName,cls:e.className,rect:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}}, hit:{tag:p&&p.tagName,cls:p&&p.className,text:p&&p.textContent&&p.textContent.slice(0,120)}, targetContainsHit:!!(p&&e.contains(p))}; });
      check("folder browser stays inside blocking overlay", !badBottom, { folderText, folderGeo, hit });
      await shot(production, "production-folder-browser");
    }
    report.production_dom_geometry = await geometry(production);
  } catch (error) {
    report.run_error = String(error && error.stack || error);
    if (production) { try { await shot(production, "production-failure"); report.failure_dom_geometry = await geometry(production); } catch (_) {} }
  } finally {
    for (const page of tracked) { try { if (!page.isClosed()) { await page.close(); report.closed_tab_count++; } } catch (error) { (report.cleanup_errors ||= []).push(String(error)); } }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count && !(report.cleanup_errors||[]).length ? "passed" : "failed";
    report.finished_at = new Date().toISOString();
    report.summary = { planned: report.checks.length, passed: report.checks.filter(x=>x.status==="passed").length, failed: report.checks.filter(x=>x.status==="failed").length, not_run: 0 };
    report.summary.quick_success_rate = report.summary.planned ? report.summary.passed / report.summary.planned * 100 : 0;
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (report.run_error || report.summary.failed) process.exitCode = 1;
  }
})();
