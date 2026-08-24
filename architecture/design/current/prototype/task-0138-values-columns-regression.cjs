const { chromium } = require("../../../../test/playwright/node_modules/playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root=path.resolve(__dirname,"..");
const evidence=path.join(root,"evidence","interaction-regression-v43-task0139.json");

function assert(condition,message) { if (!condition) throw new Error(message); }

(async () => {
  const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || path.join(os.homedir(),"Library/Caches/ms-playwright/chromium_headless_shell-1187/chrome-mac/headless_shell");
  const browser=await chromium.launch({executablePath,headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const runtimeErrors=[],results=[];
  page.on("console",message => { if (message.type() === "error") runtimeErrors.push("console: "+message.text()); });
  page.on("pageerror",error => runtimeErrors.push("page: "+error.message));
  await page.goto("file://"+path.join(root,"prototype","index.html"));
  await page.waitForFunction(() => document.documentElement.dataset.designReady === "true");
  const sampleTab=page.locator("[data-bottom-tab='samples']");
  await sampleTab.click();
  await page.waitForFunction(() => document.documentElement.dataset.task0138Ready === "true");
  await page.waitForSelector(".sample-table tbody tr");

  async function check(id,run) {
    try { results.push({id,passed:true,detail:await run() || null}); }
    catch (error) { results.push({id,passed:false,error:error.message}); }
  }

  await check("64-base-only-default-and-three-optional-columns",async () => {
    const labels=await page.locator(".sample-table thead th").allTextContents();
    assert(JSON.stringify(labels) === JSON.stringify(["№ точки","Время","Значение"]),JSON.stringify(labels));
    assert(await page.locator(".sample-table tbody tr:first-child td").count() === 3,"first row must start with three base columns only");
    return {labels,base_always_visible:labels,optional_default_visible:[]};
  });

  await page.getByTestId("sample-columns-menu-trigger").click();
  await page.waitForSelector("[data-testid='sample-columns-menu']:not([hidden])");
  await check("65-three-hidden-eyes-toggle-and-reflow",async () => {
    const menu=page.getByTestId("sample-columns-menu");
    assert((await menu.locator("[data-sample-column-visible]").allTextContents()).join("|") === "Модуль|Квадрат|Корень из модуля × знак","menu inventory");
    assert(await menu.locator("img[src='./icons/eye-off.svg']").count() === 3,"all optional columns must start hidden");
    assert(await menu.locator("[data-sample-column-visible='square_root']").count() === 0,"removed square_root remains in menu");
    await menu.locator("[data-sample-column-visible='magnitude']").click();
    const labels=await page.locator(".sample-table thead th").allTextContents();
    assert(JSON.stringify(labels) === JSON.stringify(["№ точки","Время","Значение","Модуль"]),"table reflow/base columns");
    assert(await menu.locator("[data-sample-column-visible='magnitude'] img").getAttribute("src") === "./icons/eye.svg","eye state");
    assert(await menu.getAttribute("hidden") === null,"menu closed after toggle");
    return {shown:"magnitude",visible_headers:labels,menu_remains_open:true};
  });

  await check("66-fft-removed-from-operation-ui-inventory",async () => {
    const projected=await page.evaluate(() => window.SignalAnalyserTask0139Inventory.withoutFft([
      {value:"abs",label:"Модуль"},{value:"sqrt",label:"Корень"},{value:"fft",label:"FFT"},{value:"custom",label:"Пользовательское"}
    ]));
    assert(projected.map(item => item.value).join("|") === "abs|sqrt|custom",JSON.stringify(projected));
    return {removed:"fft",remaining:projected.map(item => item.value)};
  });

  await check("67-pane-and-display-loader-lifecycle",async () => {
    const result=await page.evaluate(() => {
      const pane=document.querySelector("[data-pane-id]");
      const paneId=pane.dataset.paneId;
      const paneToken=window.Task0139LoadingPrototype.beginPane(paneId);
      const paneImmediate=!!pane.querySelector(":scope > .pane-output-loading-overlay");
      const staleIgnored=window.Task0139LoadingPrototype.settlePane(paneId,"stale","ready") === false && !!pane.querySelector(":scope > .pane-output-loading-overlay");
      const displayId="display-1";
      const layoutToken=window.Task0139LoadingPrototype.beginLayout(displayId);
      const canvas=document.querySelector("[data-testid='plot-grid'],.plot-grid");
      const displayImmediate=!!canvas.querySelector(":scope > .display-canvas-loading-overlay");
      const paneSuppressed=document.querySelectorAll(".pane-output-loading-overlay").length === 0;
      const settingsUncovered=!document.querySelector("[data-testid='settings-panel'] .display-canvas-loading-overlay");
      const layoutStaleIgnored=window.Task0139LoadingPrototype.settleLayout(displayId,"stale","ready") === false && !!canvas.querySelector(":scope > .display-canvas-loading-overlay");
      const layoutSettled=window.Task0139LoadingPrototype.settleLayout(displayId,layoutToken,"empty") === true && !canvas.querySelector(":scope > .display-canvas-loading-overlay");
      const paneRestored=!!pane.querySelector(":scope > .pane-output-loading-overlay");
      const paneSettled=window.Task0139LoadingPrototype.settlePane(paneId,paneToken,"error") === true && !pane.querySelector(":scope > .pane-output-loading-overlay");
      return {paneImmediate,staleIgnored,displayImmediate,paneSuppressed,settingsUncovered,layoutStaleIgnored,layoutSettled,paneRestored,paneSettled};
    });
    assert(Object.values(result).every(Boolean),JSON.stringify(result));
    return result;
  });

  await check("68-keyboard-escape-focus-and-no-network",async () => {
    await page.keyboard.press("Escape");
    assert(await page.getByTestId("sample-columns-menu").getAttribute("hidden") !== null,"Escape did not close");
    assert(await page.evaluate(() => document.activeElement && document.activeElement.dataset.testid) === "sample-columns-menu-trigger","focus not restored");
    const network=await page.evaluate(() => window.SignalAnalyserPrototypeEvidence.networkRequests().map(item => item.name));
    assert(network.length === 0,"HTTP resources: "+JSON.stringify(network));
    assert(runtimeErrors.length === 0,JSON.stringify(runtimeErrors));
    return {escape:"closed and trigger focused",outside:"contracted without forced focus",network_requests:network.length,runtime_errors:runtimeErrors.length};
  });

  const output={design_version:43,prototype_entry:"prototype/index.html",protocol:"file://",passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,runtime_errors:runtimeErrors,results};
  fs.writeFileSync(evidence,JSON.stringify(output,null,2)+"\n");
  await browser.close();
  process.stdout.write(JSON.stringify(output,null,2));
  if (output.failed || runtimeErrors.length) process.exitCode=1;
})().catch(error => { console.error(error); process.exit(1); });
