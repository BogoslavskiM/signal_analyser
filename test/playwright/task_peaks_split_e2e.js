"use strict";

// HND-PEAKS-SPLIT-E2E: visible production E2E evidence for the user-directed
// split Peaks inspector. This script owns only the pages it creates.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "5be0f035c6f6816c21b3df099d955a09816532bd";
const prototype = `file://${path.resolve("architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html")}`;
const out = path.resolve(__dirname, "artifacts/TASK-PEAKS-SPLIT");
fs.mkdirSync(out, { recursive: true });

const report = { id:"HND-PEAKS-SPLIT-E2E", e2e_mode:"new_functionality_regression", target, expected_revision:revision,
  design_ref:"architecture/design/TASK-0080-explicit-apply-flow/DESIGN.md", design_version:5,
  applied_skills:["e2e/e2e-workflow","e2e/visual-analysis"], browser_channel:"chrome", headless:false,
  browser_visibility:"foreground", worker_count:1, checks:[], screenshots:[], console_errors:[], network:[],
  opened_tab_count:0, closed_tab_count:0, preexisting_pages:[] };
const checkpoint=()=>fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
const check=(name,pass,detail)=>{report.checks.push({name,status:pass?"passed":"failed",detail}); checkpoint();};
const visible=n=>!!n&&(()=>{const s=getComputedStyle(n),b=n.getBoundingClientRect();return s.display!=="none"&&s.visibility!=="hidden"&&b.width>0&&b.height>0})();
function activate(){ try { execFileSync("osascript",["-e",'tell application "Google Chrome" to activate']); report.chrome_activation="ok"; } catch(e) { report.chrome_activation=String(e); } }
async function front(p){ await p.bringToFront(); activate(); }
async function screenshot(p,name,state,selector){ const file=path.join(out,name); await p.screenshot({path:file,fullPage:false}); report.screenshots.push({path:file,target:p.url(),viewport:p.viewportSize(),state,selector,timestamp:new Date().toISOString()}); }
function bind(p){ p.on("console",m=>{if(m.type()==="error")report.console_errors.push({text:m.text(),url:m.location().url,line:m.location().lineNumber});}); p.on("response",r=>{const u=r.url();if(r.status()>=400||/\/api\/(?:status|peaks|outputs)/.test(u)) report.network.push({url:u,status:r.status(),method:r.request().method(),type:r.request().resourceType()});}); }
async function api(p,url,init){ return p.evaluate(async ({url,init})=>{const r=await fetch(url,init);let body;try{body=await r.json()}catch(_){body=await r.text()}return {status:r.status,body};},{url,init}); }
async function terminalPeaks(p){ await p.waitForFunction(()=>{const x=document.querySelector("[data-testid='peaks-table-scroll']");return x&& !x.textContent.includes("Расчёт пиков…") && (!!x.querySelector("[data-testid='peaks-table']")||!!x.querySelector("[data-testid='peaks-empty'],[data-testid='peaks-no-signals'],[data-testid='peaks-error']"));},{timeout:180000}); }
async function splitAudit(p){ return p.evaluate(()=>{const b=n=>{if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{x:r.x,y:r.y,w:r.width,h:r.height,display:s.display,overflowX:s.overflowX,overflowY:s.overflowY,borderLeftWidth:s.borderLeftWidth,paddingLeft:s.paddingLeft,backgroundColor:s.backgroundColor,fontFamily:s.fontFamily};}; const split=document.querySelector("[data-testid='peaks-split']"),table=document.querySelector(".peaks-table-zone"),scroll=document.querySelector("[data-testid='peaks-table-scroll']"),settings=document.querySelector(".peaks-settings-panel"); const headers=[...document.querySelectorAll("[data-testid='peaks-table'] th")].map(x=>x.textContent.trim()); const rows=[...document.querySelectorAll("[data-testid='peaks-table'] tbody tr")].map(x=>[...x.cells].map(c=>c.textContent.trim())); const colors=[...document.querySelectorAll(".peaks-color-swatch")].map(x=>getComputedStyle(x).backgroundColor); const fields=[...document.querySelectorAll("[data-peaks-setting]")].map(x=>({id:x.dataset.peaksSetting,label:x.getAttribute("aria-label"),value:x.value,box:b(x)})); return {split:b(split),table:b(table),scroll:b(scroll),settings:b(settings),headers,rows,colors,fields,apply:b(document.querySelector("[data-testid='peaks-settings-apply']")),title:settings&&settings.querySelector("h3")?.textContent.trim(),scrollable:scroll?{scrollWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight}:null, pane:document.querySelector("[data-testid='inspector-pane-peaks']")?.innerText.trim()}; }); }
async function plotAudit(p){ return p.evaluate(()=>{const host=document.querySelector(".plot-chart.js-plotly-plot");return host?{traceCount:host.data?.length||0,base:host.data?.map((t,i)=>({i,name:t.name,overlay:!!(t.meta&&t.meta.signal_analyser_peaks_overlay),mode:t.mode,color:t.marker?.color||t.line?.color||null})),hostId:host.parentElement?.dataset?.paneHost||null}:null;}); }

(async()=>{
 let browser,context; const tracked=new Set(); let prod, baselineSettings, baselinePane;
 try {
   browser=await chromium.launch({channel:"chrome",headless:false}); context=browser.contexts()[0]||await browser.newContext();
   report.preexisting_pages=context.pages().map(p=>p.url()); activate();
   const open=async()=>{const p=await context.newPage();tracked.add(p);report.opened_tab_count++;bind(p);await front(p);return p;};
   const design=await open(); await design.setViewportSize({width:1024,height:768}); await design.goto(prototype,{waitUntil:"domcontentloaded",timeout:30000}); await front(design); await design.waitForSelector("[data-design-id='app-shell']",{timeout:10000});
   // The v5 prototype does not author a dedicated Peaks split screen; inspect
   // its closest inspector/settings tokens and real focus/click behavior first.
   await design.locator("[data-design-id='settings-tab-time']").click(); await design.locator("[data-design-id='layout-trigger']").click(); await screenshot(design,"prototype-nearest-settings-layout-1024x768.png","closest v5 settings/inspector tokens + layout popover","[data-design-id=app-shell]"); await design.keyboard.press("Escape");
   const proto=await design.evaluate(()=>({shell:!!document.querySelector("[data-design-id='app-shell']"),settings:!!document.querySelector("[data-design-id='settings-panel']"),footer:document.querySelector("[data-design-id='settings-footer']")?.getBoundingClientRect().height||0,field:document.querySelector("input")?.getBoundingClientRect().height||0,inspector:!!document.querySelector("[data-design-id='signal-table']")})); report.prototype={dedicated_peaks_split:false,note:"User-directed split state is covered revision; it is not authored as a dedicated prototype screen.",closest_tokens:proto}; check("prototype closest v5 inspector/settings tokens",proto.shell&&proto.settings&&proto.inspector&&Math.abs(proto.footer-54)<=1&&Math.abs(proto.field-32)<=1,proto);

   prod=await open(); await prod.setViewportSize({width:1024,height:768}); await prod.goto(target,{waitUntil:"domcontentloaded",timeout:120000}); await front(prod); const documentStatus=await prod.waitForLoadState("domcontentloaded").then(()=>true).catch(()=>false); await prod.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
   const st=await api(prod,"./api/status",{cache:"no-store"}); report.status=st; check("availability/status exact revision",documentStatus&&st.status===200&&st.body?.ready===true&&st.body?.runtime_revision===revision,st);
   const bodyText=await prod.locator("body").innerText(); if(/техническ|maintenance|temporarily unavailable/i.test(bodyText)){await screenshot(prod,"production-maintenance.png","technical maintenance","body"); throw Error("technical maintenance page");}
   await prod.waitForFunction(()=>document.querySelector("[data-plot-ready='true'],.js-plotly-plot"),{timeout:180000});
   // Time is the required active context for Peaks. Use pane-local selector if available.
   const timeSelect=prod.locator("[data-testid='plot-type-select'], select").filter({has:prod.locator("option")}).first(); const currentType=await timeSelect.inputValue().catch(()=>""); if(currentType&&currentType!=="time"){await timeSelect.selectOption("time"); await prod.waitForFunction(()=>document.querySelector(".js-plotly-plot"),{timeout:120000});}
   baselinePane=await api(prod,"./api/state-lite",{cache:"no-store"}); report.baseline_state={active_plot:baselinePane.body?.active_plot,active_pane:baselinePane.body?.active_pane};
   const outputsBefore=report.network.filter(x=>/\/api\/outputs\/active/.test(x.url)).length; const baseBefore=await plotAudit(prod);
   await prod.getByTestId("inspector-tab-peaks").click(); await front(prod); await terminalPeaks(prod); let audit=await splitAudit(prod); await screenshot(prod,"production-peaks-split-1024x768.png","peaks ready 1024x768","[data-testid=peaks-split]");
   const expectedHeaders=["№","Сигнал","Цвет","Значение","Время, с","Метка на графике"];
   const fieldsOk=JSON.stringify(audit.fields.map(x=>x.label))===JSON.stringify(["Количество пиков","Минимальная высота","Минимальное расстояние, отсчёты","Порог"]);
   check("Peaks split semantic structure/default fields",audit.title==="Настройки расчёта пиков"&&JSON.stringify(audit.headers)===JSON.stringify(expectedHeaders)&&fieldsOk&&JSON.stringify(audit.fields.map(x=>x.value))===JSON.stringify(["99","−∞","1","0"]),audit);
   const rowDataOk=audit.rows.length===0 ? /Пики не найдены/.test(audit.pane||"") : audit.rows.every((r,i)=>r.length===6&&String(i+1)===r[0]&&r[1]&&r[3]&&r[4]&&r[5]&&audit.colors[i]); check("Peaks active-pane table rows/color/value/time/marker",rowDataOk,{rows:audit.rows,colors:audit.colors,pane:audit.pane});
   const geom1024=!!audit.settings&&Math.abs(audit.settings.w-300)<=1&&audit.table.w>0&&audit.table.x+audit.table.w<=audit.settings.x-7&&audit.settings.borderLeftWidth==="1px"&&audit.scrollable.scrollWidth>=audit.scrollable.clientWidth; check("Peaks split geometry 1024x768",geom1024,audit);
   const baseAfter=await plotAudit(prod); const outputAfterOpen=report.network.filter(x=>/\/api\/outputs\/active/.test(x.url)).length; const overlays=baseAfter?.base?.filter(t=>t.overlay)||[]; check("Peaks owned Plotly marker/text overlays without output refetch",!!baseBefore&&!!baseAfter&&baseAfter.traceCount>=baseBefore.traceCount&&overlays.every(t=>t.mode==="markers+text")&&outputAfterOpen===outputsBefore,{baseBefore,baseAfter,outputsBefore,outputAfterOpen});
   baselineSettings=audit.fields.reduce((m,x)=>(m[x.id]=x.value,m),{});
   const threshold=prod.locator("[data-peaks-setting='threshold']"); await threshold.fill("-1"); await threshold.blur(); const invalid=await prod.locator("[data-testid='peaks-settings-apply']").isDisabled(); const invalidText=await prod.locator("[data-testid='peaks-settings-fields']").innerText(); check("negative threshold locally blocks Apply with Russian message",invalid&&/Введите число не меньше 0/.test(invalidText),{invalid,invalidText});
   await threshold.fill(baselineSettings.threshold); await threshold.blur(); const n=prod.locator("[data-peaks-setting='number_of_peaks']"); await n.fill("7"); await n.blur(); const postWait=prod.waitForResponse(r=>/\/api\/peaks\/settings$/.test(r.url())&&r.request().method()==="POST",{timeout:60000}); await prod.getByTestId("peaks-settings-apply").click(); const post=await postWait; report.settings_post={status:post.status(),payload:post.request().postDataJSON()}; check("Peaks settings POST exact safe payload",post.status()===200&&post.request().postDataJSON()?.settings?.number_of_peaks===7,report.settings_post);
   await terminalPeaks(prod); const outAfterApply=report.network.filter(x=>/\/api\/outputs\/active/.test(x.url)).length; audit=await splitAudit(prod); check("settings Apply recomputes Peaks without graph-output refetch",outAfterApply===outputsBefore&&audit.fields.find(x=>x.id==="number_of_peaks")?.value==="7",{outputsBefore,outAfterApply,audit});
   // Restore the exact user/session baseline via the same visible UI.
   await n.fill(baselineSettings.number_of_peaks); await n.blur(); const restoreWait=prod.waitForResponse(r=>/\/api\/peaks\/settings$/.test(r.url())&&r.request().method()==="POST",{timeout:60000}); await prod.getByTestId("peaks-settings-apply").click(); const restorePost=await restoreWait; await terminalPeaks(prod); audit=await splitAudit(prod); check("Peaks settings restored via UI",restorePost.status()===200&&JSON.stringify(audit.fields.reduce((m,x)=>(m[x.id]=x.value,m),{}))===JSON.stringify(baselineSettings),{baselineSettings,current:audit.fields});
   await prod.setViewportSize({width:1440,height:900}); await front(prod); await terminalPeaks(prod); audit=await splitAudit(prod); await screenshot(prod,"production-peaks-split-1440x900.png","peaks ready 1440x900","[data-testid=peaks-split]"); check("Peaks split geometry 1440x900",!!audit.settings&&Math.abs(audit.settings.w-300)<=1&&audit.table.w>audit.table.w*.5&&audit.table.x+audit.table.w<=audit.settings.x-7&&audit.settings.borderLeftWidth==="1px",audit);
   // Switching away and back must not leak records/markers. Preserve pane and user data.
   await prod.getByTestId("inspector-tab-measurements").click(); await prod.getByTestId("inspector-tab-peaks").click(); await terminalPeaks(prod); const returnPlot=await plotAudit(prod); check("switch away/back preserves base traces and no stale markers",!!returnPlot&&returnPlot.base.filter(t=>!t.overlay).length===baseBefore.base.filter(t=>!t.overlay).length&&returnPlot.base.filter(t=>t.overlay).every(t=>t.mode==="markers+text"),{baseBefore,returnPlot});
 } catch(e) { report.run_error=String(e&&e.stack||e); }
 finally {
   if(prod&&!prod.isClosed()) { try { /* return harmless lower-pane context */ if(await prod.getByTestId("inspector-tab-signals").count()) await prod.getByTestId("inspector-tab-signals").click(); } catch(e) { report.state_restore_error=String(e); } }
   for(const p of tracked)if(!p.isClosed()){try{await p.close();report.closed_tab_count++;}catch(e){report.cleanup_error=String(e);}}
   report.tab_cleanup_status=report.opened_tab_count===report.closed_tab_count&&!report.cleanup_error?"passed":"failed";
   const passed=report.checks.filter(c=>c.status==="passed").length,failed=report.checks.filter(c=>c.status==="failed").length; report.summary={planned:report.checks.length,passed,failed,not_run:0,success_rate:report.checks.length?+(passed/report.checks.length*100).toFixed(1):0,availability:report.checks.find(c=>c.name.startsWith("availability"))?.status||"not-run",new_workflow_passed:!report.run_error&&failed===0};
   fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2)); if(browser)await browser.close(); console.log(JSON.stringify(report.summary)); if(report.run_error||failed)process.exitCode=1;
 }
})();
