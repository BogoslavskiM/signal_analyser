"use strict";
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process"), { chromium } = require("playwright-core");
const out = path.resolve(__dirname, "artifacts/TASK-0097-EXTREMA/final-navigation.json");
const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const R = { mode:"maxima", browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1, checks:[], opened_tab_count:0, closed_tab_count:0 };
const save=()=>fs.writeFileSync(out,JSON.stringify(R,null,2));
(async()=>{let b,p;try{
  b=await chromium.launch({channel:"chrome",headless:false}); const c=b.contexts()[0]||await b.newContext(); R.preexisting=c.pages().map(x=>x.url()); p=await c.newPage(); R.opened_tab_count++;
  await p.bringToFront(); execFileSync("osascript",["-e",'tell application "Google Chrome" to activate']);
  await p.goto(target,{waitUntil:"commit",timeout:15000});
  await p.getByTestId("app-shell").waitFor({state:"visible",timeout:8000});
  await p.getByTestId("settings-tab-peaks").click({timeout:2500});
  await p.getByTestId("extrema-mode-trigger").waitFor({state:"visible",timeout:2500});
  const baseline=await p.evaluate(()=>({mode:document.querySelector("[data-extrema-mode-trigger]")?.innerText.trim(),settings:Object.fromEntries([...document.querySelectorAll("[data-peaks-setting]")].map(x=>[x.dataset.peaksSetting,x.value]))}));
  R.baseline=baseline; R.checks.push({name:"active pane Extrema navigation and baseline",status:baseline.mode==="Максимумы"?"passed":"failed",detail:baseline});
}catch(e){R.errors=[String(e&&e.stack||e)]}finally{
  if(p&&!p.isClosed()){try{await p.close();R.closed_tab_count++}catch(e){R.errors=(R.errors||[]).concat(String(e))}}
  R.tab_cleanup_status=R.opened_tab_count===R.closed_tab_count?"passed":"failed";save();if(b)await b.close();console.log(JSON.stringify(R));if((R.errors||[]).length||R.checks.some(x=>x.status==="failed"))process.exitCode=1;
}})();
