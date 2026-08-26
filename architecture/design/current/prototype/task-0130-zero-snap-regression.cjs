const { chromium } = require("../../../../test/playwright/node_modules/playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const evidence = path.join(root, "evidence", "interaction-regression-v37-zero-snap.json");

(async () => {
  const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || path.join(os.homedir(),"Library/Caches/ms-playwright/chromium_headless_shell-1187/chrome-mac/headless_shell");
  const browser=await chromium.launch({executablePath,headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const runtimeErrors=[];
  page.on("console",message => { if (message.type() === "error") runtimeErrors.push("console: "+message.text()); });
  page.on("pageerror",error => runtimeErrors.push("page: "+error.message));
  await page.goto("file://"+path.join(root,"prototype","index.html"));
  await page.waitForFunction(() => document.documentElement.dataset.designReady === "true" && document.documentElement.dataset.task0130Ready === "true");

  const observed=await page.evaluate(() => {
    const plot=document.createElement("div");
    plot.style.cssText="position:relative;width:480px;height:240px";
    const host=document.createElement("div");
    host.style.cssText="position:relative;width:480px;height:240px";
    host.data=[
      {name:"zero trace",x:[-1,0,1],y:[-1,0,1]},
      {name:"heterogeneous trace",x:[-1,0.7,1],y:[1,0.7,-1]}
    ];
    host.layout={xaxis:{range:[-1,1],title:{text:"Время, с"}}};
    host._fullLayout={xaxis:{range:[-1,1],title:{text:"Время, с"}},_size:{l:40,t:20,w:400,h:170}};
    plot.appendChild(host);
    document.body.appendChild(plot);
    const controller=window.SignalAnalyserGraphCursorUI.createController();
    controller.setMode("v37-zero-snap",host,"single");
    const line=plot.querySelector(".plot-cursor-line");
    const value=line ? Number(line.getAttribute("aria-valuenow")) : null;
    controller.clear("v37-zero-snap");
    plot.remove();
    return {target:0,snapped:value,trace_candidates:[0,0.7]};
  });

  const passed=observed.snapped === 0 && runtimeErrors.length === 0;
  const output={
    design_version:37,
    prototype_entry:"prototype/index.html",
    protocol:"file://",
    passed:passed ? 1 : 0,
    failed:passed ? 0 : 1,
    runtime_errors:runtimeErrors,
    results:[{
      id:"01-zero-remains-nearest-across-heterogeneous-traces",
      passed,
      detail:observed,
      screenshot:null
    }]
  };
  fs.writeFileSync(evidence,JSON.stringify(output,null,2)+"\n");
  await browser.close();
  if (!passed) process.exitCode=1;
  console.log(JSON.stringify(output,null,2));
})().catch(error => { console.error(error); process.exit(1); });
