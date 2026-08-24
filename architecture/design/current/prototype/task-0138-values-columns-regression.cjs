const { chromium } = require("../../../../test/playwright/node_modules/playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root=path.resolve(__dirname,"..");
const evidence=path.join(root,"evidence","interaction-regression-v41-values-columns.json");
const screenshotPath=path.join(root,"screenshots","v41--values-column-visibility-menu--1440x900.png");

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

  await check("57-base-and-deterministic-optional-columns",async () => {
    const labels=await page.locator(".sample-table thead th").allTextContents();
    assert(JSON.stringify(labels) === JSON.stringify(["№ точки","Время","Значение","Модуль","Квадрат","Корень","Корень из модуля × знак"]),JSON.stringify(labels));
    assert(await page.locator(".sample-table tbody tr:first-child td").count() === 7,"first row not populated across seven columns");
    return {labels,base_always_visible:labels.slice(0,3),optional_default_visible:labels.slice(3)};
  });

  await page.getByTestId("sample-columns-menu-trigger").click();
  await page.waitForSelector("[data-testid='sample-columns-menu']:not([hidden])");
  await page.screenshot({path:screenshotPath,fullPage:true});
  await check("58-menu-eye-toggle-and-reflow",async () => {
    const menu=page.getByTestId("sample-columns-menu");
    assert((await menu.locator("[data-sample-column-visible]").allTextContents()).join("|") === "Модуль|Квадрат|Корень|Корень из модуля × знак","menu inventory");
    assert(await menu.locator("img[src='./icons/eye.svg']").count() === 4,"visible eyes");
    await menu.locator("[data-sample-column-visible='square_root']").click();
    const labels=await page.locator(".sample-table thead th").allTextContents();
    assert(labels.indexOf("Корень") < 0 && labels.indexOf("№ точки") === 0 && labels.indexOf("Значение") === 2,"table reflow/base columns");
    assert(await menu.locator("[data-sample-column-visible='square_root'] img").getAttribute("src") === "./icons/eye-off.svg","eye-off state");
    assert(await menu.getAttribute("hidden") === null,"menu closed after toggle");
    return {hidden:"square_root",visible_headers:labels,menu_remains_open:true};
  });

  await check("59-keyboard-escape-focus-and-no-network",async () => {
    await page.keyboard.press("Escape");
    assert(await page.getByTestId("sample-columns-menu").getAttribute("hidden") !== null,"Escape did not close");
    assert(await page.evaluate(() => document.activeElement && document.activeElement.dataset.testid) === "sample-columns-menu-trigger","focus not restored");
    const network=await page.evaluate(() => window.SignalAnalyserPrototypeEvidence.networkRequests().map(item => item.name));
    assert(network.length === 0,"HTTP resources: "+JSON.stringify(network));
    assert(runtimeErrors.length === 0,JSON.stringify(runtimeErrors));
    return {escape:"closed and trigger focused",outside:"contracted without forced focus",network_requests:network.length,runtime_errors:runtimeErrors.length};
  });

  const output={design_version:41,prototype_entry:"prototype/index.html",protocol:"file://",passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,runtime_errors:runtimeErrors,screenshot:path.relative(root,screenshotPath),results};
  fs.writeFileSync(evidence,JSON.stringify(output,null,2)+"\n");
  await browser.close();
  process.stdout.write(JSON.stringify(output,null,2));
  if (output.failed || runtimeErrors.length) process.exitCode=1;
})().catch(error => { console.error(error); process.exit(1); });
