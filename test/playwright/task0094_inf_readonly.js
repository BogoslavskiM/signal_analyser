"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");
const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "11f97c35652b549828b4d61b38c8354cb1652ea9";
const output = path.resolve(__dirname, "artifacts/TASK-0094-INF");
fs.mkdirSync(output, { recursive:true });
const report = {id:"HND-0528-FIX-RERUN", target, revision, browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1, checks:[], requests:[], errors:[], opened:0, closed:0};
const save = () => fs.writeFileSync(path.join(output,"report-fixed.json"), JSON.stringify(report,null,2));
const check = (name, pass, detail) => { report.checks.push({name,status:pass?"passed":"failed",detail}); save(); };
async function waitPeaks(page) { await page.waitForFunction(()=>{const x=document.querySelector("[data-testid='peaks-table-scroll']");return x&&!x.textContent.includes("Расчёт пиков…");},{timeout:180000}); }
(async()=>{
 let browser, page;
 try {
  browser=await chromium.launch({channel:"chrome",headless:false});
  const context=browser.contexts()[0]||await browser.newContext();
  report.preexisting_pages=context.pages().map(p=>p.url());
  page=await context.newPage(); report.opened++;
  page.on("response", r=>{if(/\/api\/(?:status|outputs\/active|peaks)/.test(r.url()))report.requests.push({url:r.url(),status:r.status(),method:r.request().method()});});
  await page.bringToFront(); execFileSync("osascript",["-e",'tell application "Google Chrome" to activate']);
  await page.goto(target,{waitUntil:"domcontentloaded",timeout:120000});
  await page.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
  const status=await page.evaluate(async()=>{const r=await fetch("./api/status",{cache:"no-store"});return{status:r.status,body:await r.json()};});
  check("status exact revision",status.status===200&&status.body.ready===true&&status.body.runtime_revision===revision,status);
  await page.waitForSelector(".plot-chart.js-plotly-plot",{timeout:180000});
  const outputBefore=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;
  await page.getByTestId("settings-tab-peaks").click();
  const height=page.locator("[data-testid='settings-field-minimum_height'] input");
  await height.waitFor({state:"visible",timeout:30000});
  const value=await height.inputValue(); const apply=page.getByTestId("settings-apply");
  const outputAfterSettings=report.requests.filter(x=>x.url.includes("/api/outputs/active")).length;
  check("right Peaks minimum height uses exact Julia -Inf",value==="-Inf"&&value!=="−∞"&&value!=="-inf"&&await apply.isDisabled(),{value,applyDisabled:await apply.isDisabled()});
  check("right settings Peaks click causes no active-output request",outputAfterSettings===outputBefore,{outputBefore,outputAfterSettings});
  await page.getByTestId("inspector-tab-peaks").click(); await waitPeaks(page);
  const inset=await page.evaluate(()=>{const box=x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,b:r.bottom};};return{root:box(document.querySelector("[data-testid='inspector-pane-peaks']")),scroll:box(document.querySelector("[data-testid='peaks-table-scroll']")),split:document.querySelectorAll(".peaks-split,.peaks-settings-panel").length};});
  check("lower Peaks remains table-only with 8px inset",inset.split===0&&Math.abs(inset.scroll.x-(inset.root.x+8))<=1&&Math.abs(inset.scroll.w-(inset.root.w-16))<=1&&Math.abs(inset.scroll.b-(inset.root.b-8))<=1,inset);
  await page.screenshot({path:path.join(output,"production-inf-fixed.png")});
 } catch(error) { report.errors.push(String(error&&error.stack||error)); }
 finally { if(page&&!page.isClosed()){try{await page.close();report.closed++;}catch(error){report.errors.push(String(error));}} report.cleanup=report.opened===report.closed?"passed":"failed"; save(); if(browser)await browser.close(); console.log(JSON.stringify({checks:report.checks.length,errors:report.errors.length,cleanup:report.cleanup})); if(report.errors.length||report.checks.some(x=>x.status==="failed"))process.exitCode=1; }
})();
