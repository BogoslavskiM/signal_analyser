"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "796ad62a3bed0a648a5cfb53cd18f71b1b30dfa3";
const out = path.resolve(__dirname, "artifacts/TASK-0119-FAST-MAIN");
fs.mkdirSync(out, { recursive: true });
const report = { id:"HND-TASK-0119-FAST-MAIN", type:"report", from:"E2E", to:"Orchestrator", e2e_mode:"quick_regression", target, expected_revision:revision, browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1, checks:[], api:[], errors:[], opened_tab_count:0, closed_tab_count:0, tab_cleanup_status:"pending", started_at:new Date().toISOString() };
const check = (name, pass, detail) => report.checks.push({ name, status:pass ? "passed" : "failed", detail });
const state = (page) => page.evaluate(async () => { const r=await fetch("./api/state-lite",{cache:"no-store"}); return {status:r.status,body:await r.json()}; });
const layout = (s) => { const d=s.displays.find((x)=>x.id===s.active_display_id)||s.displays[0], e=s.layouts.find((x)=>x.display_id===d.id), p=e.layout.panes.find((x)=>x.id===e.layout.active_pane_id)||e.layout.panes[0]; return {display:d,pane:p}; };

(async()=>{
  let browser, page;
  try {
    browser=await chromium.launch({channel:"chrome",headless:false});
    const context=browser.contexts()[0]||await browser.newContext({viewport:{width:1440,height:900}});
    report.preexisting_page_count=context.pages().length;
    page=await context.newPage(); report.opened_tab_count++;
    await page.bringToFront(); try { execFileSync("osascript",["-e",'tell application "Google Chrome" to activate']); } catch (_) {}
    page.on("response",(r)=>{ if (/\/api\/(?:layouts|signals\/.*\/samples)/.test(r.url())) report.api.push({url:r.url(),method:r.request().method(),status:r.status()}); });
    await page.goto(target,{waitUntil:"domcontentloaded",timeout:120000});
    await page.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
    const status=await page.evaluate(async()=>{const r=await fetch("./api/status",{cache:"no-store"});return{status:r.status,body:await r.json()};});
    check("exact revision ready",status.status===200&&status.body.ready&&status.body.runtime_revision===revision,status);
    assert.equal(status.body.runtime_revision,revision);
    const before=(await state(page)).body, original=layout(before), rowName=before.row_selected_signal || before.signals[0]?.name;
    assert(rowName,"no available signal for a main-signal scenario");
    report.original={row_selected_signal:before.row_selected_signal, bindings:original.pane.signal_bindings};
    const row=page.locator(`[data-signal-name="${rowName}"]`);
    await row.waitFor({state:"visible",timeout:20000});
    const membership=page.locator(`[data-visible-signal="${rowName}"]`);
    if (!await membership.isChecked()) {
      const request=page.waitForResponse((r)=>/\/api\/layouts$/.test(new URL(r.url()).pathname)&&r.request().method()==="POST"&&r.status()===200,{timeout:30000});
      await row.locator("td").nth(1).click();
      await request;
      await membership.waitFor({state:"attached"});
      check("plain row click sets visible membership",await membership.isChecked(),{name:rowName});
    } else check("plain row click setup already visible",true,{name:rowName});
    const uncheck=page.waitForResponse((r)=>/\/api\/layouts$/.test(new URL(r.url()).pathname)&&r.request().method()==="POST"&&r.status()===200,{timeout:30000});
    await membership.uncheck(); await uncheck;
    await page.reload({waitUntil:"domcontentloaded",timeout:120000});
    await page.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
    const restored=(await state(page)).body, restoredLayout=layout(restored);
    check("direct checkbox hides graph without changing main signal",restored.row_selected_signal===rowName&&!restoredLayout.pane.signal_bindings.includes(rowName),{row_selected_signal:restored.row_selected_signal,bindings:restoredLayout.pane.signal_bindings});
    const samplesTab=page.getByTestId("inspector-tab-samples");
    const samplesPresent=await samplesTab.count()===1&&await samplesTab.isVisible();
    check("automatic samples tab remains after reload for hidden main signal",samplesPresent,{tab_count:await samplesTab.count(),label:samplesPresent?await samplesTab.innerText():null});
    if (samplesPresent) {
      await samplesTab.click();
      await page.waitForFunction(()=>document.querySelectorAll("[data-testid='inspector-pane-samples'] tbody tr").length>0,undefined,{timeout:30000});
      const table=await page.evaluate(()=>{const root=document.querySelector("[data-testid='inspector-pane-samples']");return{headers:[...root.querySelectorAll("th")].map((x)=>x.textContent.trim()),rows:root.querySelectorAll("tbody tr").length};});
      const sampleApi=report.api.filter((x)=>/\/samples/.test(x.url)&&x.status===200).length>0;
      check("sample table has API data and five populated columns",sampleApi&&table.headers.length===5&&table.rows>0,{api:report.api.filter((x)=>/\/samples/.test(x.url)),table});
    }
    await page.screenshot({path:path.join(out,"production-after-reload.png"),fullPage:false});
    const final=(await state(page)).body, finalLayout=layout(final);
    check("logical state restored",final.row_selected_signal===before.row_selected_signal&&JSON.stringify(finalLayout.pane.signal_bindings)===JSON.stringify(original.pane.signal_bindings),{before:report.original,after:{row_selected_signal:final.row_selected_signal,bindings:finalLayout.pane.signal_bindings}});
  } catch(error) { report.errors.push(String(error&&error.stack||error)); }
  finally {
    if(page&&!page.isClosed()){try{await page.close();report.closed_tab_count++;}catch(error){report.errors.push(String(error));}}
    report.tab_cleanup_status=report.opened_tab_count===report.closed_tab_count?"passed":"failed";
    report.finished_at=new Date().toISOString(); report.planned=report.checks.length; report.passed=report.checks.filter((x)=>x.status==="passed").length; report.failed=report.checks.filter((x)=>x.status==="failed").length; report.success_rate=report.planned?report.passed/report.planned*100:0;
    fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2)); if(browser)await browser.close(); console.log(JSON.stringify({planned:report.planned,passed:report.passed,failed:report.failed,errors:report.errors,cleanup:report.tab_cleanup_status},null,2)); if(report.errors.length||report.failed)process.exitCode=1;
  }
})();
