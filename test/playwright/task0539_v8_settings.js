"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");
const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "28110971cb1f7a176e0d8702b817025b95e7b4b9";
const output = path.resolve(__dirname,"artifacts/TASK-0539");
fs.mkdirSync(output,{recursive:true});
const report={id:"HND-0539-REWRITE-RERUN",checks:[],requests:[],errors:[],opened:0,closed:0};
const save=()=>fs.writeFileSync(path.join(output,"report-corrected.json"),JSON.stringify(report,null,2));
const check=(name,pass,detail)=>{report.checks.push({name,status:pass?"passed":"failed",detail});save();};
async function inspect(page) { return page.evaluate(()=>{
  const tabs=[...document.querySelectorAll("[data-settings-page]")];
  const rows=[...document.querySelectorAll(".settings-field-row")];
  const range=id=>[...document.querySelectorAll(`[data-setting-id="${id}"]`)].map(x=>x.dataset.rangePart).sort();
  const ids=rows.map(x=>x.dataset.testid||x.getAttribute("data-testid")).filter(Boolean);
  return {tabs:tabs.map(x=>({text:x.textContent.trim(),width:x.getBoundingClientRect().width,selected:x.getAttribute("aria-selected"),tabindex:x.tabIndex})),text:document.querySelector("[data-testid='settings-content']").innerText,scroll:document.querySelectorAll("[data-testid='settings-content']").length,footer:document.querySelectorAll("[data-testid='settings-footer']").length,apply:document.querySelectorAll("[data-testid='settings-apply']").length,rowIds:ids,rowUnique:new Set(ids).size===ids.length,x:range("time.x_limits"),y:range("time.y_limits")};
}); }
(async()=>{let browser,page;try{
  browser=await chromium.launch({channel:"chrome",headless:false});
  page=await (browser.contexts()[0]||await browser.newContext()).newPage(); report.opened++;
  await page.bringToFront();execFileSync("osascript",["-e",'tell application "Google Chrome" to activate']);
  page.on("response",x=>{if(/\/api\/(?:status|outputs\/active)/.test(x.url()))report.requests.push({url:x.url(),status:x.status()});});
  await page.goto(target,{waitUntil:"domcontentloaded",timeout:120000});await page.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
  const status=await page.evaluate(async()=>{const r=await fetch("./api/status");return{code:r.status,body:await r.json()};});check("exact v8 status",status.code===200&&status.body.ready&&status.body.runtime_revision===revision,status);
  await page.waitForSelector(".plot-chart.js-plotly-plot",{timeout:180000});const out0=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;
  for(const [w,h] of [[1024,768],[1440,900]]){await page.setViewportSize({width:w,height:h});const s=await inspect(page);const content=/Граф/.test(s.text)&&/Параметры/.test(s.text)&&/Пределы времени/.test(s.text)&&/Пределы оси Y/.test(s.text)&&/Связь областей/.test(s.text)&&!/Связь экранов/.test(s.text);const tabs=JSON.stringify(s.tabs.map(x=>x.text))===JSON.stringify(["Отображение","Пики"])&&Math.abs(s.tabs[0].width-s.tabs[1].width)<=1;const rows=s.rowUnique&&JSON.stringify(s.x)===JSON.stringify(["max","min"])&&JSON.stringify(s.y)===JSON.stringify(["max","min"]);check(`v8 merged logical rows ${w}x${h}`,tabs&&content&&s.scroll===1&&s.footer===1&&s.apply===1&&rows,s);await page.locator("[data-settings-page='display']").focus();await page.keyboard.press("End");const end=await page.locator("[data-settings-page='peaks']").getAttribute("aria-selected");await page.keyboard.press("Home");const home=await page.locator("[data-settings-page='display']").getAttribute("aria-selected");check(`v8 roving ${w}x${h}`,end==="true"&&home==="true",{end,home});await page.screenshot({path:path.join(output,`corrected-${w}x${h}.png`)});}
  const out1=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;check("no output refetch",out0===out1,{out0,out1});
}catch(e){report.errors.push(String(e&&e.stack||e));}finally{if(page&&!page.isClosed()){try{await page.close();report.closed++;}catch(e){report.errors.push(String(e));}}report.cleanup=report.opened===report.closed?"passed":"failed";save();if(browser)await browser.close();console.log(JSON.stringify({checks:report.checks.length,errors:report.errors.length,cleanup:report.cleanup}));if(report.errors.length||report.checks.some(x=>x.status==="failed"))process.exitCode=1;}})();
