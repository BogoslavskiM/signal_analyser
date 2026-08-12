"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");
const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "a8f968330dc2f85ce036b08d204c2d30a6a86692";
const out = path.resolve(__dirname, "artifacts/TASK-0094-PEAKS-SIDEBAR-FINAL");
fs.mkdirSync(out, { recursive: true });
const report = { id:"HND-0521-RERUN", target, revision, browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1, checks:[], requests:[], errors:[], opened:0, closed:0 };
const save=()=>fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
const check=(name,pass,detail)=>{report.checks.push({name,status:pass?"passed":"failed",detail});save();};
function chrome(){ try { execFileSync("osascript",["-e",'tell application "Google Chrome" to activate']); } catch(e) { report.errors.push(String(e)); } }
async function identity(page) { return page.evaluate(()=>{ const h=document.querySelector(".plot-chart.js-plotly-plot"); if(!h) return null; if(!h.dataset.e2eFinal) h.dataset.e2eFinal=`plot-${Date.now()}`; return {id:h.dataset.e2eFinal,base:(h.data||[]).filter(t=>!(t.meta&&t.meta.signal_analyser_peaks_overlay)).length,all:(h.data||[]).length}; }); }
async function waitPeaks(page) { await page.waitForFunction(()=>{ const x=document.querySelector("[data-testid='peaks-table-scroll']"); return x && !x.textContent.includes("Расчёт пиков…"); }, {timeout:180000}); }
(async()=>{
 let browser,page,baseline;
 try {
  browser=await chromium.launch({channel:"chrome",headless:false});
  const context=browser.contexts()[0]||await browser.newContext();
  report.preexisting_pages=context.pages().map(p=>p.url());
  page=await context.newPage(); report.opened++;
  page.on("response",x=>{ if(/\/api\/(?:outputs\/active|peaks|status)/.test(x.url())) report.requests.push({url:x.url(),status:x.status(),method:x.request().method()}); });
  await page.bringToFront(); chrome();
  await page.setViewportSize({width:1024,height:768});
  await page.goto(target,{waitUntil:"domcontentloaded",timeout:120000});
  await page.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
  const status=await page.evaluate(async()=>{const r=await fetch("./api/status",{cache:"no-store"});return{status:r.status,body:await r.json()};});
  check("availability/exact revision",status.status===200&&status.body.ready===true&&status.body.runtime_revision===revision,status);
  await page.waitForSelector(".plot-chart.js-plotly-plot",{timeout:180000});
  const beforeTabs=await identity(page), output0=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;
  const tabInfo=await page.evaluate(()=>({right:[...document.querySelectorAll("[data-settings-page]")].map(x=>x.textContent.trim()),bottom:[...document.querySelectorAll("[data-bottom-tab]")].map(x=>x.textContent.trim())}));
  await page.locator("[data-settings-page='display']").focus(); await page.keyboard.press("End");
  await page.locator("[data-bottom-tab='signals']").focus(); await page.keyboard.press("End");
  const roving=await page.evaluate(()=>({right:[...document.querySelectorAll("[data-settings-page]")].map(x=>({s:x.getAttribute("aria-selected"),i:x.tabIndex})),bottom:[...document.querySelectorAll("[data-bottom-tab]")].map(x=>({s:x.getAttribute("aria-selected"),i:x.tabIndex}))}));
  await page.getByTestId("inspector-tab-peaks").click(); await waitPeaks(page);
  const table=await page.evaluate(()=>{const b=x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom};};const root=document.querySelector("[data-testid='inspector-pane-peaks']"),scroll=document.querySelector("[data-testid='peaks-table-scroll']"),t=document.querySelector("[data-testid='peaks-table']");return{root:b(root),scroll:b(scroll),headers:[...t.querySelectorAll("th")].map(x=>x.textContent.trim()),rows:t.tBodies[0].rows.length,rejected:document.querySelectorAll(".peaks-split,.peaks-settings-panel").length};});
  const afterTabs=await identity(page), output1=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;
  check("v6 tablists/roving/table-only/full 8px inset",JSON.stringify(tabInfo.right)===JSON.stringify(["Отображение","Время","Пики"])&&JSON.stringify(tabInfo.bottom)===JSON.stringify(["Сигналы","Измерения","Пики"])&&roving.right[2].s==="true"&&roving.right[2].i===0&&roving.bottom[2].s==="true"&&roving.bottom[2].i===0&&table.rejected===0&&JSON.stringify(table.headers)===JSON.stringify(["№","Сигнал","Цвет","Значение","Время, с","Метка на графике"])&&Math.abs(table.scroll.x-(table.root.x+8))<=1&&Math.abs(table.scroll.w-(table.root.w-16))<=1&&Math.abs(table.scroll.b-(table.root.b-8))<=1,{tabInfo,roving,table});
  check("tab switching preserves Plotly/no active-output request",beforeTabs.id===afterTabs.id&&beforeTabs.base===afterTabs.base&&output1===output0,{beforeTabs,afterTabs,output0,output1});
  await page.screenshot({path:path.join(out,"production-1024x768-peaks.png")});
  await page.setViewportSize({width:1440,height:900}); await page.bringToFront(); await waitPeaks(page);
  const wide=await page.evaluate(()=>{const b=x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom};};return{root:b(document.querySelector("[data-testid='inspector-pane-peaks']")),scroll:b(document.querySelector("[data-testid='peaks-table-scroll']"))};});
  check("1440 lower Peaks 8px inset",Math.abs(wide.scroll.x-(wide.root.x+8))<=1&&Math.abs(wide.scroll.w-(wide.root.w-16))<=1&&Math.abs(wide.scroll.b-(wide.root.b-8))<=1,wide);
  await page.screenshot({path:path.join(out,"production-1440x900-peaks.png")});
  await page.getByTestId("settings-tab-peaks").click();
  const n=page.locator("[data-peaks-setting='number_of_peaks']"); await n.waitFor({state:"visible",timeout:30000});
  baseline=await n.inputValue(); const apply=page.getByTestId("settings-apply");
  check("right Peaks four controls/shared Apply pristine",await page.locator("[data-peaks-setting]").count()===4&&await apply.isDisabled(),{baseline});
  await n.fill("-1"); await n.press("Tab");
  check("negative value is local Russian validation/no POST",await apply.isDisabled()&&/Введите целое число/.test(await page.locator("[data-testid='settings-content']").innerText())&&report.requests.filter(x=>x.url.endsWith("/api/peaks/settings")).length===0,await page.locator("[data-testid='settings-content']").innerText());
  await n.fill("12"); await n.press("Tab");
  const preApply=await identity(page), outBefore=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;
  const response=page.waitForResponse(x=>x.url().endsWith("/api/peaks/settings")&&x.request().method()==="POST",{timeout:60000}); await apply.click(); const post=await response;
  await page.waitForFunction(()=>!document.querySelector("[data-testid='settings-apply']").disabled,{timeout:180000}); await waitPeaks(page);
  const postApply=await identity(page), outAfter=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;
  check("Peaks POST pending-ready preserves Plotly/no main output reload",post.status()===200&&post.request().postDataJSON().settings.number_of_peaks===12&&preApply.id===postApply.id&&preApply.base===postApply.base&&outAfter===outBefore,{payload:post.request().postDataJSON(),preApply,postApply,outBefore,outAfter});
  await n.fill(baseline); await n.press("Tab"); const restoreWait=page.waitForResponse(x=>x.url().endsWith("/api/peaks/settings")&&x.request().method()==="POST",{timeout:60000}); await apply.click(); const restore=await restoreWait;
  await page.waitForFunction(()=>!document.querySelector("[data-testid='settings-apply']").disabled,{timeout:180000}); await waitPeaks(page);
  check("baseline restored through UI",restore.status()===200&&await n.inputValue()===baseline,{baseline,current:await n.inputValue()});
  await page.screenshot({path:path.join(out,"production-right-peaks-restored.png")});
 } catch(e) { report.errors.push(String(e&&e.stack||e)); }
 finally {
  if(page&&!page.isClosed()&&baseline!=null) { try { const n=page.locator("[data-peaks-setting='number_of_peaks']"); if(await n.count()&&await n.inputValue()!==baseline){await n.fill(baseline);await n.press("Tab");const a=page.getByTestId("settings-apply");if(!await a.isDisabled())await a.click();} } catch(e){report.restore_error=String(e);} }
  if(page&&!page.isClosed()){try{await page.close();report.closed++;}catch(e){report.errors.push(String(e));}}
  report.cleanup=report.opened===report.closed?"passed":"failed";save();if(browser)await browser.close();console.log(JSON.stringify({checks:report.checks.length,errors:report.errors.length,cleanup:report.cleanup}));if(report.errors.length||report.checks.some(x=>x.status==="failed"))process.exitCode=1;
 }
})();
