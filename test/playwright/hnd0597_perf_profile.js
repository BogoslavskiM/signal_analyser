"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { performance } = require("perf_hooks");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "70e95f532a7f2e969fa31ba25e6082c69596a571";
const prototype = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html";
const out = path.resolve(__dirname, "artifacts/HND-0597-perf");
const report = {
  id: "HND-0597", e2e_mode: "analysis_regression", target, expected_revision: expectedRevision,
  design_ref: "architecture/design/TASK-0080-explicit-apply-flow/DESIGN.md", design_version: 15,
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"], browser_channel: "chrome",
  headless: false, browser_visibility: "foreground", worker_count: 1,
  network: [], errors: [], scenarios: {}, screenshots: [], opened_tab_count: 0, closed_tab_count: 0,
};
const now = () => Math.round(performance.now() * 10) / 10;
const save = () => { fs.mkdirSync(out, { recursive:true }); fs.writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`); };
const front = async page => { await page.bringToFront(); try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); } catch (_) {} };
const stateLite = page => page.evaluate(async () => (await fetch("./api/state-lite", { cache:"no-store" })).json());
const contextOf = state => { const entry=(state.layouts||[]).find(x=>x.display_id===state.active_display_id); const layout=entry&&entry.layout; const pane=layout&&layout.panes.find(x=>x.id===layout.active_pane_id); return { displayId:state.active_display_id, layout, pane }; };

async function installDomProbe(page, paneId, scenarioStart) {
  await page.evaluate(({ paneId, scenarioStart }) => {
    window.__hnd0597 = { scenarioStart, events:[], longTasks:[] };
    const mark = (name, detail={}) => window.__hnd0597.events.push({ name, at:performance.now(), since:performance.now()-scenarioStart, detail });
    const inspect = () => {
      const loader=document.querySelector(`[data-testid='pane-loader-${CSS.escape(paneId)}']`);
      const host=document.querySelector(`[data-testid='plot-host-${CSS.escape(paneId)}']`);
      const empty=document.querySelector(`[data-testid='pane-empty-${CSS.escape(paneId)}']`);
      const seen=window.__hnd0597.seen||(window.__hnd0597.seen={});
      if(loader&&!seen.loader){seen.loader=true;mark("loader-visible");}
      if(host&&!seen.host){seen.host=true;mark("plot-host-created",{ready:host.dataset.plotReady});}
      if(host&&host.dataset.plotReady==="true"&&!seen.ready){seen.ready=true;mark("plot-ready",{traces:(host.data||[]).length});}
      if(empty&&!seen.empty){seen.empty=true;mark("empty-visible");}
    };
    new MutationObserver(inspect).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["data-plot-ready"]});
    try { new PerformanceObserver(list=>list.getEntries().forEach(x=>window.__hnd0597.longTasks.push({start:x.startTime,duration:x.duration}))).observe({entryTypes:["longtask"]}); } catch(_) {}
    inspect(); mark("probe-installed");
  }, { paneId, scenarioStart });
}

async function scenario(page, paneId, signal, checked, label) {
  const browserStart = await page.evaluate(() => performance.now());
  const start = now();
  await installDomProbe(page, paneId, browserStart);
  const netStart = report.network.length;
  const checkbox = page.locator(`input[data-visible-signal='${signal.replace(/'/g,"\\'")}']`);
  const layoutWait = page.waitForResponse(r => /\/api\/layouts(?:\?|$)/.test(r.url()) && r.request().method()==="POST", { timeout:60000 });
  if (checked) await checkbox.check(); else await checkbox.uncheck();
  const clickDone = now();
  const layoutResponse = await layoutWait;
  const layoutAt = now();
  if (checked) {
    await page.waitForFunction(id => { const host=document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`); return host&&host.dataset.plotReady==="true"; }, paneId, {timeout:180000});
  } else {
    await page.getByTestId(`pane-empty-${paneId}`).waitFor({state:"visible",timeout:60000});
  }
  const terminalAt = now();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const probe = await page.evaluate(() => window.__hnd0597);
  const net = report.network.slice(netStart).map(x => Object.assign({},x,{ sinceStart:Math.round((x.at-start)*10)/10 }));
  const result = { label, desiredChecked:checked, start, clickActionMs:clickDone-start, layoutStatus:layoutResponse.status(), layoutResponseMs:layoutAt-start, terminalMs:terminalAt-start, domEvents:probe.events.map(x=>({name:x.name,since:Math.round(x.since*10)/10,detail:x.detail})), longTasks:probe.longTasks, network:net };
  report.scenarios[label]=result; save(); return result;
}

(async()=>{
  let browser, context, prototypePage, page, paneId, signal, baseline;
  let needsCleanup=false;
  try {
    fs.mkdirSync(out, { recursive:true });
    browser=await chromium.launch({channel:"chrome",headless:false});
    context=browser.contexts()[0]||await browser.newContext();
    report.preexisting_page_urls=context.pages().map(p=>p.url());
    prototypePage=await context.newPage(); report.opened_tab_count++;
    await prototypePage.setViewportSize({width:1024,height:768}); await front(prototypePage);
    await prototypePage.goto(prototype,{waitUntil:"domcontentloaded",timeout:30000});
    await prototypePage.waitForFunction(()=>!!window.__TASK0080_DESIGN__);
    await prototypePage.screenshot({path:path.join(out,"prototype-v15.png")}); report.screenshots.push("prototype-v15.png");
    page=await context.newPage(); report.opened_tab_count++;
    const navigationStart=now();
    page.on("request", req=>{ const u=req.url(); if(/\/api\/(?:status|state-lite|state|settings|outputs\/active|layouts|peaks\/active)/.test(u)||/plotly-cartesian/.test(u)) report.network.push({phase:"request",at:now(),method:req.method(),url:u}); });
    page.on("response", async res=>{ const u=res.url(); if(!(/\/api\/(?:status|state-lite|state|settings|outputs\/active|layouts|peaks\/active)/.test(u)||/plotly-cartesian/.test(u)))return; const rec={phase:"response",at:now(),method:res.request().method(),status:res.status(),url:u}; try{const b=await res.body();rec.bytes=b.length;if(/\/api\/outputs\/active/.test(u)){const j=JSON.parse(b.toString());rec.output={isready:j.isready,success:j.success,state_revision:j.state_revision,calculation_revision:j.calculation_revision,dataItems:Array.isArray(j.data)?j.data.length:null};}}catch(e){rec.bodyError=String(e)} report.network.push(rec); save(); });
    page.on("requestfinished",req=>{const u=req.url();if(/\/api\/(?:status|state-lite|state|settings|outputs\/active|layouts|peaks\/active)/.test(u)||/plotly-cartesian/.test(u))report.network.push({phase:"finished",at:now(),method:req.method(),url:u});});
    page.on("pageerror",e=>report.errors.push(`pageerror: ${e}`)); page.on("console",m=>{if(m.type()==="error"&&!/favicon/.test(m.text()))report.errors.push(`console: ${m.text()}`)});
    await page.setViewportSize({width:1440,height:900}); await front(page);
    const root=await page.goto(target,{waitUntil:"domcontentloaded",timeout:120000});
    const domContentAt=now(); await page.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
    await page.waitForFunction(()=>document.querySelector("[data-testid='app-shell']").dataset.stateRevision!==undefined,{timeout:180000});
    const shellAt=now();
    const status=await page.evaluate(async()=>{const r=await fetch("./api/status",{cache:"no-store"});return{status:r.status,body:await r.json()}});
    if(!root||root.status()!==200||status.status!==200||!status.body.ready||status.body.runtime_revision!==expectedRevision)throw new Error(`revision gate failed ${JSON.stringify(status)}`);
    baseline=await stateLite(page); const cx=contextOf(baseline); paneId=cx.pane.id;
    if(cx.layout.rows!==1||cx.layout.columns!==1||(cx.pane.signal_bindings||[]).length)throw new Error(`unsafe baseline ${JSON.stringify({rows:cx.layout.rows,columns:cx.layout.columns,bindings:cx.pane.signal_bindings})}`);
    signal=(baseline.signals||[])[0]&&baseline.signals[0].name; if(!signal)throw new Error("No signal available for binding profile");
    report.scenarios.navigation={start:navigationStart,domContentLoadedMs:domContentAt-navigationStart,shellStateLiteReadyMs:shellAt-navigationStart,rootStatus:root.status(),signal,paneId,stateRevision:baseline.state_revision};
    await page.getByTestId("inspector-tab-signals").click();
    await scenario(page,paneId,signal,true,"cold-bind"); needsCleanup=true;
    await scenario(page,paneId,signal,false,"unbind"); needsCleanup=false;
    await scenario(page,paneId,signal,true,"warm-bind"); needsCleanup=true;
    await scenario(page,paneId,signal,false,"final-unbind"); needsCleanup=false;
    const final=contextOf(await stateLite(page));
    report.restoration={status:final.layout.rows===1&&final.layout.columns===1&&(final.pane.signal_bindings||[]).length===0?"verified":"failed",rows:final.layout.rows,columns:final.layout.columns,bindings:final.pane.signal_bindings};
    await page.screenshot({path:path.join(out,"production-empty-restored.png")}); report.screenshots.push("production-empty-restored.png"); save();
  } catch(e){report.errors.push(String(e&&e.stack||e));}
  finally {
    if(page&&!page.isClosed()&&needsCleanup&&paneId&&signal){try{await front(page);await page.getByTestId(`plot-pane-${paneId}`).click();await page.getByTestId("inspector-tab-signals").click();const cb=page.locator(`input[data-visible-signal='${signal.replace(/'/g,"\\'")}']`);if(await cb.count()&&await cb.isChecked()){const w=page.waitForResponse(r=>/\/api\/layouts(?:\?|$)/.test(r.url())&&r.request().method()==="POST",{timeout:60000});await cb.uncheck();await w;await page.getByTestId(`pane-empty-${paneId}`).waitFor({state:"visible",timeout:60000});}const f=contextOf(await stateLite(page));report.restoration={status:f.layout.rows===1&&f.layout.columns===1&&(f.pane.signal_bindings||[]).length===0?"verified-in-finally":"failed",rows:f.layout.rows,columns:f.layout.columns,bindings:f.pane.signal_bindings};}catch(e){report.errors.push(`restoration: ${e}`)}}
    for(const p of [prototypePage,page])if(p&&!p.isClosed()){try{await p.close();report.closed_tab_count++}catch(e){report.errors.push(`cleanup: ${e}`)}}
    report.tab_cleanup_status=report.opened_tab_count===report.closed_tab_count?"passed":"failed"; save();
    if(browser)await browser.close();
    process.stdout.write(`${JSON.stringify({scenarios:report.scenarios,restoration:report.restoration,errors:report.errors,cleanup:report.tab_cleanup_status},null,2)}\n`);
    if(report.errors.length||!report.restoration||!report.restoration.status.startsWith("verified")||report.tab_cleanup_status!=="passed")process.exitCode=1;
  }
})();
