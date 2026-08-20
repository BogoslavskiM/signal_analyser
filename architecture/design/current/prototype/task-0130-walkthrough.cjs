const { chromium } = require("../../../../test/playwright/node_modules/playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const screenshots = path.join(root, "screenshots");
const evidence = path.join(root, "evidence", "interaction-walkthrough-v36-graph-cursors.json");
fs.mkdirSync(screenshots, { recursive:true });

function assert(condition, message) { if (!condition) throw new Error(message); }
async function shot(page, name) { const file=path.join(screenshots,name); await page.screenshot({path:file,fullPage:true}); return path.relative(root,file); }

(async () => {
  const isolatedHeadless=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || path.join(os.homedir(),"Library/Caches/ms-playwright/chromium_headless_shell-1187/chrome-mac/headless_shell");
  const browser=await chromium.launch({executablePath:isolatedHeadless,headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const runtimeErrors=[], results=[];
  page.on("console",message => { if (message.type() === "error") runtimeErrors.push("console: "+message.text()); });
  page.on("pageerror",error => runtimeErrors.push("page: "+error.message));
  await page.goto("file://"+path.join(root,"prototype","index.html"));
  await page.waitForFunction(() => document.documentElement.dataset.designReady === "true" && document.documentElement.dataset.task0130Ready === "true");

  async function check(id,fn,screenshot) {
    try { const detail=await fn(); results.push({id,passed:true,detail:detail||null,screenshot:screenshot||null}); }
    catch (error) { results.push({id,passed:false,error:error.message,screenshot:screenshot||null}); }
  }

  await page.getByTestId("pane-menu-pane-spectrum").click();
  await page.waitForSelector("[data-testid='display-overflow-menu']:not([hidden])");
  await check("01-menu-has-single-and-dual-cursor",async () => {
    const menu=page.getByTestId("display-overflow-menu");
    assert(await menu.getByTestId("pane-menu-cursor").count() === 1,"Single cursor menu item missing");
    assert(await menu.getByTestId("pane-menu-dual-cursor").count() === 1,"Dual cursor menu item missing");
    assert(await menu.getByTestId("pane-menu-cursor").getAttribute("role") === "menuitemcheckbox","Single cursor role mismatch");
  },await shot(page,"v36--pane-menu-cursor-options--1440x900.png"));

  const fetchBefore=await page.evaluate(() => window.SignalAnalyserPrototypeEvidence.fetchLog.length);
  await page.getByTestId("pane-menu-cursor").click();
  await page.waitForSelector("[data-graph-cursor-overlay='display-1::pane-spectrum'][data-cursor-mode='single']");
  await check("02-single-cursor-readout-and-no-api",async () => {
    const overlay=page.locator("[data-graph-cursor-overlay='display-1::pane-spectrum']");
    assert(await overlay.locator(".plot-cursor-line").count() === 1,"Single mode did not render one cursor");
    const text=await overlay.locator(".plot-cursor-readout").innerText();
    assert(/X:/.test(text) && /radarPulse/.test(text),text);
    const fetchAfter=await page.evaluate(() => window.SignalAnalyserPrototypeEvidence.fetchLog.length);
    assert(fetchAfter === fetchBefore,"Cursor activation called API");
  },await shot(page,"v36--spectrum-single-cursor--1440x900.png"));

  const line=page.locator("[data-graph-cursor-overlay='display-1::pane-spectrum'] .plot-cursor-line");
  const beforeValue=await line.getAttribute("aria-valuenow");
  const box=await line.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+18);
  await page.mouse.down();
  await page.mouse.move(box.x+92,box.y+18,{steps:8});
  await page.mouse.up();
  await check("03-drag-snaps-inside-visible-domain",async () => {
    const moved=page.locator("[data-graph-cursor-overlay='display-1::pane-spectrum'] .plot-cursor-line");
    const afterValue=await moved.getAttribute("aria-valuenow");
    const minimum=Number(await moved.getAttribute("aria-valuemin")), maximum=Number(await moved.getAttribute("aria-valuemax"));
    assert(afterValue !== beforeValue,"Cursor did not move");
    assert(Number(afterValue) >= minimum && Number(afterValue) <= maximum,"Cursor escaped visible domain");
    await moved.focus();
    await page.keyboard.press("ArrowRight");
    const keyboardValue=await page.locator("[data-graph-cursor-overlay='display-1::pane-spectrum'] .plot-cursor-line").getAttribute("aria-valuenow");
    assert(keyboardValue !== afterValue,"ArrowRight did not advance to an adjacent bin");
  });

  await page.getByTestId("pane-menu-pane-spectrum").click();
  await page.waitForSelector("[data-testid='display-overflow-menu']:not([hidden])");
  await check("04-menu-projects-active-single-mode",async () => {
    assert(await page.getByTestId("pane-menu-cursor").getAttribute("aria-checked") === "true","Single mode check missing");
    assert(await page.getByTestId("pane-menu-dual-cursor").getAttribute("aria-checked") === "false","Dual mode incorrectly checked");
  });
  await page.getByTestId("pane-menu-dual-cursor").click();
  await page.waitForSelector("[data-graph-cursor-overlay='display-1::pane-spectrum'][data-cursor-mode='dual']");
  await check("05-dual-cursor-delta-and-per-trace-values",async () => {
    const overlay=page.locator("[data-graph-cursor-overlay='display-1::pane-spectrum']");
    assert(await overlay.locator(".plot-cursor-line").count() === 2,"Dual mode did not render two cursors");
    const text=await overlay.locator(".plot-cursor-readout").innerText();
    assert(/X1:/.test(text) && /X2:/.test(text) && /ΔX:/.test(text),text);
    assert(/Y1:/.test(text) && /Y2:/.test(text),text);
  },await shot(page,"v36--spectrum-dual-cursor--1440x900.png"));

  await page.getByTestId("pane-menu-pane-spectrum").click();
  await page.waitForSelector("[data-testid='display-overflow-menu']:not([hidden])");
  await page.getByTestId("pane-menu-dual-cursor").click();
  await check("06-repeat-active-mode-turns-cursors-off",async () => {
    assert(await page.locator("[data-graph-cursor-overlay='display-1::pane-spectrum']").count() === 0,"Repeated active mode did not remove overlay");
  });

  await page.getByTestId("pane-menu-pane-time").click();
  await page.waitForSelector("[data-testid='display-overflow-menu']:not([hidden])");
  await page.getByTestId("pane-menu-cursor").click();
  await page.waitForSelector("[data-graph-cursor-overlay='display-1::pane-time'][data-cursor-mode='single']");
  await check("07-time-and-spectrum-state-are-pane-local",async () => {
    assert(await page.locator("[data-graph-cursor-overlay='display-1::pane-time'] .plot-cursor-line").count() === 1,"Time cursor missing");
    assert(await page.locator("[data-graph-cursor-overlay='display-1::pane-spectrum']").count() === 0,"Spectrum cursor was linked to time pane");
  },await shot(page,"v36--time-single-cursor--1440x900.png"));

  await check("08-file-prototype-no-network-or-errors",async () => {
    const network=await page.evaluate(() => window.SignalAnalyserPrototypeEvidence.networkRequests().map(item => item.name));
    assert(network.length === 0,"HTTP resources: "+JSON.stringify(network));
    assert(runtimeErrors.length === 0,JSON.stringify(runtimeErrors));
  });

  const output={design_version:36,prototype_entry:"prototype/index.html",protocol:"file://",passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,runtime_errors:runtimeErrors,results};
  fs.writeFileSync(evidence,JSON.stringify(output,null,2)+"\n");
  await browser.close();
  if (output.failed || runtimeErrors.length) process.exitCode=1;
  console.log(JSON.stringify(output,null,2));
})().catch(error => { console.error(error); process.exit(1); });
