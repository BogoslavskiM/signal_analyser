"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { performance } = require("perf_hooks");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "81aeb3407015f664a1395b62a0a5e8cd9b935b02";
const recheck = process.env.HND0604_RECHECK === "1";
const out = path.resolve(__dirname, recheck ? "artifacts/HND-0604-binding-perf-recheck" : "artifacts/HND-0603-binding-perf");
const beforeReference = { cold_ms:800.5, warm_ms:802.3, pending_ms:[272.6,279.5], ready_ms:[742.1,752.5], plot_ready_ms:[795,802], fixed_timer_gap_ms:353.9 };
const report = {
  id:recheck ? "HND-0604" : "HND-0603", type:"performance_benchmark", target, expected_revision:expectedRevision,
  browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1,
  before_reference:beforeReference, network:[], scenarios:{}, errors:[], screenshots:[], opened_tab_count:0, closed_tab_count:0,
};
const now = () => Math.round(performance.now() * 10) / 10;
const save = () => { fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(path.join(out,"report.json"),`${JSON.stringify(report,null,2)}\n`); };
const front = async page => { await page.bringToFront(); try { execFileSync("osascript",["-e",'tell application "Google Chrome" to activate']); } catch (_) {} };
const state = page => page.evaluate(async () => (await fetch("./api/state-lite",{cache:"no-store"})).json());
const round = n => typeof n === "number" ? Math.round(n*10)/10 : null;

function normalized(s) {
  return {
    active:s.active_display_id,
    displays:(s.displays||[]).map(x=>({id:x.id,name:x.name})),
    layouts:(s.layouts||[]).map(x=>({display_id:x.display_id,rows:x.layout.rows,columns:x.layout.columns,active_pane_id:x.layout.active_pane_id,panes:x.layout.panes.map(p=>({id:p.id,plot_type:p.plot_type,signal_bindings:p.signal_bindings}))})),
  };
}
function externalProjection(s,id) {
  const display=(s.displays||[]).find(x=>x.id===id), entry=(s.layouts||[]).find(x=>x.display_id===id);
  return { display, layout:entry&&entry.layout, displays:(s.displays||[]).map(x=>({id:x.id,name:x.name})) };
}
function displayContext(s,id) {
  const entry=(s.layouts||[]).find(x=>x.display_id===id), layout=entry&&entry.layout;
  const pane=layout&&layout.panes.find(x=>x.id===layout.active_pane_id);
  return {layout,pane};
}

async function installProbe(page,paneId,start) {
  await page.evaluate(({paneId,start})=>{
    window.__hnd0603={start,events:[],longtasks:[],firstHost:null};
    const mark=(name,detail={})=>window.__hnd0603.events.push({name,at:performance.now()-start,detail});
    const inspect=()=>{
      const p=window.__hnd0603, seen=p.seen||(p.seen={});
      const loader=document.querySelector(`[data-testid='pane-loader-${CSS.escape(paneId)}']`);
      const host=document.querySelector(`[data-testid='plot-host-${CSS.escape(paneId)}']`);
      const empty=document.querySelector(`[data-testid='pane-empty-${CSS.escape(paneId)}']`);
      if(loader&&!seen.loader){seen.loader=1;mark("loader-visible")}
      if(host&&!seen.host){seen.host=1;p.firstHost=host;mark("plot-host-created",{ready:host.dataset.plotReady})}
      if(host&&host.dataset.plotReady==="true"&&!seen.ready){seen.ready=1;mark("plot-ready",{sameHost:host===p.firstHost,traces:(host.data||[]).length})}
      if(empty&&!seen.empty){seen.empty=1;mark("empty-visible")}
    };
    new MutationObserver(inspect).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["data-plot-ready"]});
    try{new PerformanceObserver(list=>list.getEntries().forEach(x=>window.__hnd0603.longtasks.push({start:x.startTime-start,duration:x.duration}))).observe({entryTypes:["longtask"]})}catch(_){}
    inspect();mark("probe-installed");
  },{paneId,start});
}

async function runScenario(page,paneId,signal,checked,label) {
  const browserStart=await page.evaluate(()=>performance.now()), start=now();
  await installProbe(page,paneId,browserStart);
  const netIndex=report.network.length;
  const checkbox=page.locator(`input[data-visible-signal='${signal.replace(/'/g,"\\'")}']`);
  const layoutWait=page.waitForResponse(r=>/\/api\/layouts(?:\?|$)/.test(r.url())&&r.request().method()==="POST",{timeout:60000});
  if(checked) await checkbox.check(); else await checkbox.uncheck();
  const clickDone=now(), layoutResponse=await layoutWait, layoutAt=now();
  if(checked) await page.waitForFunction(id=>{const h=document.querySelector(`[data-testid='plot-host-${CSS.escape(id)}']`);return h&&h.dataset.plotReady==="true"},paneId,{timeout:180000});
  else await page.getByTestId(`pane-empty-${paneId}`).waitFor({state:"visible",timeout:60000});
  const terminal=now();
  await page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));
  const dom=await page.evaluate(()=>window.__hnd0603);
  const net=report.network.slice(netIndex).map(x=>({...x,since:round(x.at-start)}));
  const outputs=net.filter(x=>x.url.includes("/outputs/active"));
  const outputRequests=outputs.filter(x=>x.phase==="request");
  const outputResponses=outputs.filter(x=>x.phase==="response");
  const pending=outputResponses.find(x=>x.output&&!x.output.isready);
  const ready=outputResponses.find(x=>x.output&&x.output.isready&&x.output.success);
  const gaps=[];
  for(let i=0;i<outputRequests.length-1;i++){
    const preceding=outputResponses.find(x=>x.at>=outputRequests[i].at&&x.at<=outputRequests[i+1].at);
    if(preceding&&preceding.output&&!preceding.output.isready)gaps.push(round(outputRequests[i+1].at-preceding.at));
  }
  const plotReady=dom.events.find(x=>x.name==="plot-ready");
  const result={
    desired_checked:checked, layout_status:layoutResponse.status(), click_action_ms:round(clickDone-start), layout_response_ms:round(layoutAt-start), terminal_ms:round(terminal-start),
    first_pending_response_ms:pending&&pending.since, success_response_ms:ready&&ready.since, plot_ready_ms:plotReady&&round(plotReady.at),
    output_poll_waits_ms:gaps, output_request_count:outputRequests.length, output_response_count:outputResponses.length,
    output_response_bytes:outputResponses.map(x=>({isready:x.output&&x.output.isready,bytes:x.bytes,since:x.since})),
    settings_get_count:net.filter(x=>x.method==="GET"&&/\/api\/settings(?:\?|$)/.test(x.url)).length,
    output_target_only:outputs.every(x=>x.url.includes(`display_id=${encodeURIComponent(report.temporary.display_id)}`)&&x.url.includes(`pane_id=${encodeURIComponent(paneId)}`)),
    dom_events:dom.events.map(x=>({...x,at:round(x.at)})), longtasks:dom.longtasks, network:net,
  };
  report.scenarios[label]=result; save(); return result;
}

(async()=>{
  let browser,context,page,baseline,originalId,tempId,paneId,signal,created=false,tempBound=false;
  try{
    fs.mkdirSync(out,{recursive:true});
    browser=await chromium.launch({channel:"chrome",headless:false});
    context=browser.contexts()[0]||await browser.newContext();
    report.preexisting_page_urls=context.pages().map(p=>p.url());
    page=await context.newPage();report.opened_tab_count++;
    page.on("request",r=>{if(/\/api\/(?:displays|layouts|outputs\/active|settings)(?:\?|$)/.test(r.url()))report.network.push({phase:"request",at:now(),method:r.method(),url:r.url()})});
    page.on("response",async r=>{if(!/\/api\/(?:displays|layouts|outputs\/active|settings)(?:\?|$)/.test(r.url()))return;const x={phase:"response",at:now(),method:r.request().method(),status:r.status(),url:r.url()};try{const b=await r.body();x.bytes=b.length;if(r.url().includes("/outputs/active")){const j=JSON.parse(b);x.output={isready:j.isready,success:j.success,state_revision:j.state_revision,calculation_revision:j.calculation_revision}}}catch(e){x.body_error=String(e)}report.network.push(x);save()});
    page.on("pageerror",e=>report.errors.push("pageerror: "+e));
    page.on("console",m=>{if(m.type()==="error"&&!/favicon/.test(m.text()))report.errors.push("console: "+m.text())});
    await page.setViewportSize({width:1440,height:900});await front(page);
    const root=await page.goto(target,{waitUntil:"domcontentloaded",timeout:120000});
    const gate=await page.evaluate(async()=>{const r=await fetch("./api/status",{cache:"no-store"});return{status:r.status,body:await r.json()}});
    if(!root||root.status()!==200||gate.status!==200||!gate.body.ready||gate.body.runtime_revision!==expectedRevision)throw Error("revision gate "+JSON.stringify({root:root&&root.status(),gate}));
    report.revision_gate=gate;
    await page.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
    baseline=await state(page);originalId=baseline.active_display_id;
    const originalContext=displayContext(baseline,originalId);
    report.external_baseline={normalized:normalized(baseline),projection:externalProjection(baseline,originalId),projection_bytes:Buffer.byteLength(JSON.stringify(externalProjection(baseline,originalId)))};
    report.baseline_contract={display_id:originalId,rows:originalContext.layout&&originalContext.layout.rows,columns:originalContext.layout&&originalContext.layout.columns,pane_count:originalContext.layout&&originalContext.layout.panes.length};
    if(!originalContext.layout||originalContext.layout.rows!==1||originalContext.layout.columns!==2)report.baseline_warning="Expected external 1x2 but continuing isolated temporary Display per authorization";
    const runtimeJs=await page.evaluate(async()=>await(await fetch("./js/app.js",{cache:"no-store"})).text());
    report.adaptive_scheduler_contract={has_initial_50:/fetchPaneOutput\([^)]*true,\s*50\)/.test(runtimeJs),has_100:/delay\s*<\s*100[\s\S]{0,40}return\s+100/.test(runtimeJs),has_200:/delay\s*<\s*200[\s\S]{0,40}return\s+200/.test(runtimeJs),has_350:/return\s+350/.test(runtimeJs)};
    const ids=(baseline.displays||[]).map(x=>x.id);
    const createWait=page.waitForResponse(r=>/\/api\/displays(?:\?|$)/.test(r.url())&&r.request().method()==="POST",{timeout:60000});
    await page.getByTestId("add-display").click();const createResponse=await createWait;
    if(createResponse.status()!==200)throw Error("create display "+createResponse.status());
    const createdState=await state(page),newIds=createdState.displays.map(x=>x.id).filter(id=>!ids.includes(id));
    if(newIds.length!==1)throw Error("unsafe temporary display identity "+JSON.stringify(newIds));
    tempId=newIds[0];created=true;
    const temp=displayContext(createdState,tempId);
    if(createdState.active_display_id!==tempId||!temp.layout||temp.layout.rows!==1||temp.layout.columns!==1||temp.layout.panes.length!==1||(temp.pane.signal_bindings||[]).length)throw Error("temporary display is not fresh empty 1x1");
    paneId=temp.pane.id;signal=(createdState.signals||[]).find(x=>x.name==="Гармонический сигнал")?.name;
    if(!signal)throw Error("Гармонический сигнал unavailable");
    report.temporary={display_id:tempId,pane_id:paneId,signal};
    await page.getByTestId("inspector-tab-signals").click();
    await runScenario(page,paneId,signal,true,recheck ? "recheck-bind" : "cold-bind");tempBound=true;
    await runScenario(page,paneId,signal,false,recheck ? "recheck-unbind" : "cold-unbind");tempBound=false;
    if(!recheck){
      await runScenario(page,paneId,signal,true,"warm-bind");tempBound=true;
      await runScenario(page,paneId,signal,false,"warm-unbind");tempBound=false;
    }
    await page.screenshot({path:path.join(out,"temporary-empty-after-benchmark.png"),animations:"disabled"});report.screenshots.push("temporary-empty-after-benchmark.png");
  }catch(e){report.errors.push(String(e&&e.stack||e))}
  finally{
    if(page&&!page.isClosed()&&created&&tempId){
      try{
        await front(page);
        const s=await state(page);
        if((s.displays||[]).some(x=>x.id===tempId)){
          if(s.active_display_id!==tempId)await page.getByTestId(`display-tab-${tempId}`).click();
          if(tempBound&&paneId&&signal){await page.getByTestId("inspector-tab-signals").click();const cb=page.locator(`input[data-visible-signal='${signal.replace(/'/g,"\\'")}']`);if(await cb.count()&&await cb.isChecked()){const w=page.waitForResponse(r=>/\/api\/layouts(?:\?|$)/.test(r.url())&&r.request().method()==="POST",{timeout:60000});await cb.uncheck();await w;}}
          const closeWait=page.waitForResponse(r=>/\/api\/displays(?:\?|$)/.test(r.url())&&r.request().method()==="POST",{timeout:60000});
          await page.getByTestId(`display-close-${tempId}`).click();const closeResponse=await closeWait;if(closeResponse.status()!==200)throw Error("close display "+closeResponse.status());
          await page.waitForFunction(id=>!document.querySelector(`[data-testid='display-tab-${CSS.escape(id)}']`),tempId,{timeout:60000});
        }
        const final=await state(page),finalProjection=externalProjection(final,originalId);
        report.final={normalized:normalized(final),projection:finalProjection,projection_bytes:Buffer.byteLength(JSON.stringify(finalProjection))};
        report.restoration={temporary_removed:!(final.displays||[]).some(x=>x.id===tempId),original_active:final.active_display_id===originalId,external_projection_byte_for_byte:JSON.stringify(finalProjection)===JSON.stringify(report.external_baseline.projection),normalized_byte_for_byte:JSON.stringify(normalized(final))===JSON.stringify(report.external_baseline.normalized)};
      }catch(e){report.errors.push("restoration: "+String(e&&e.stack||e))}
    }
    const cold=report.scenarios[recheck ? "recheck-bind" : "cold-bind"],warm=report.scenarios["warm-bind"];
    if(recheck&&cold){
      report.comparison={recheck_terminal:{hnd0603_cold:4766.1,hnd0603_warm:519.9,after:cold.terminal_ms,delta_vs_cold:round(cold.terminal_ms-4766.1),delta_vs_warm:round(cold.terminal_ms-519.9)},recheck_pending:{hnd0603_cold:2500.9,hnd0603_warm:326.1,after:cold.first_pending_response_ms},recheck_ready:{hnd0603_cold:4154.9,hnd0603_warm:475.2,after:cold.success_response_ms},observed_poll_waits:cold.output_poll_waits_ms};
      report.verdict={settings_get_zero:cold.settings_get_count===0,target_only_no_fanout:cold.output_target_only,adaptive_contract:Object.values(report.adaptive_scheduler_contract||{}).every(Boolean),no_long_tasks:cold.longtasks.length===0,same_host_creation_to_ready:cold.dom_events.find(e=>e.name==="plot-ready")?.detail?.sameHost===true,restored_external:!!report.restoration?.external_projection_byte_for_byte};
    }
    if(!recheck&&cold&&warm){
      report.comparison={cold_terminal:{before:800.5,after:cold.terminal_ms,delta:round(cold.terminal_ms-800.5),percent:round((cold.terminal_ms/800.5-1)*100)},warm_terminal:{before:802.3,after:warm.terminal_ms,delta:round(warm.terminal_ms-802.3),percent:round((warm.terminal_ms/802.3-1)*100)},cold_pending:{before:272.6,after:cold.first_pending_response_ms,delta:round(cold.first_pending_response_ms-272.6)},warm_pending:{before:279.5,after:warm.first_pending_response_ms,delta:round(warm.first_pending_response_ms-279.5)},cold_ready:{before:742.1,after:cold.success_response_ms,delta:round(cold.success_response_ms-742.1)},warm_ready:{before:752.5,after:warm.success_response_ms,delta:round(warm.success_response_ms-752.5)},cold_plot_ready:{before:795,after:cold.plot_ready_ms,delta:round(cold.plot_ready_ms-795)},warm_plot_ready:{before:802,after:warm.plot_ready_ms,delta:round(warm.plot_ready_ms-802)},observed_poll_waits:{cold:cold.output_poll_waits_ms,warm:warm.output_poll_waits_ms,before_fixed:353.9}};
      const binds=[cold,warm];
      report.verdict={settings_get_zero:binds.every(x=>x.settings_get_count===0),target_only_no_fanout:binds.every(x=>x.output_target_only),adaptive_contract:Object.values(report.adaptive_scheduler_contract||{}).every(Boolean),no_long_tasks:binds.every(x=>x.longtasks.length===0),same_host_creation_to_ready:binds.every(x=>x.dom_events.find(e=>e.name==="plot-ready")?.detail?.sameHost===true),restored_external:!!report.restoration?.external_projection_byte_for_byte};
    }
    if(page&&!page.isClosed()){try{await page.close();report.closed_tab_count++}catch(e){report.errors.push("tab cleanup: "+e)}}
    report.tab_cleanup_status=report.opened_tab_count===report.closed_tab_count?"passed":"failed";save();
    if(browser)await browser.close();
    process.stdout.write(JSON.stringify({temporary:report.temporary,scenarios:report.scenarios,comparison:report.comparison,verdict:report.verdict,restoration:report.restoration,errors:report.errors,cleanup:report.tab_cleanup_status},null,2)+"\n");
    if(report.errors.length||!report.restoration?.temporary_removed||!report.restoration?.external_projection_byte_for_byte||report.tab_cleanup_status!=="passed")process.exitCode=1;
  }
})();
