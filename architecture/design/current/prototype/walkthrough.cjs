const { chromium } = require("../../../../test/playwright/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const screenshots = path.join(root, "screenshots");
const evidencePath = path.join(root, "evidence", "interaction-walkthrough-v28.json");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = "http://127.0.0.1:4177/prototype/index.html";
const results = [];

async function ready(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.designReady === "true");
}
async function shot(page, name) {
  const file = path.join(screenshots, name);
  await page.screenshot({ path: file });
  return "screenshots/" + name;
}
async function check(page, id, assertion, screenshot) {
  let passed = false, detail = "";
  try { await assertion(); passed = true; detail = "passed"; } catch (error) { detail = error.message; }
  results.push({ id, passed, detail, screenshot });
}

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const page = await browser.newPage({ viewport: { width: 920, height: 680 } });
  page.setDefaultTimeout(5000);
  page.on("pageerror", error => console.error("PAGEERROR", error.message));
  await ready(page);
  let screenshot = await shot(page, "v27--signal-tab-summary--920x680.png");
  await check(page, "signal-tab-first-and-summary", async () => {
    if (await page.locator("[data-settings-page='signal']").getAttribute("aria-selected") !== "true") throw new Error("Signal tab is not first/selected");
    await page.locator("[data-testid='signal-values-action']").waitFor();
  }, screenshot);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator("[data-testid='signal-values-action']").click();
  screenshot = await shot(page, "v27--signal-samples--1024x768.png");
  await check(page, "values-focuses-dynamic-samples", async () => {
    if (await page.locator("button[data-inspector-page='samples']").getAttribute("aria-selected") !== "true") throw new Error("Dynamic samples tab not selected");
    if (await page.locator(".sample-table th").count() !== 5) throw new Error("Sample table must have five columns");
  }, screenshot);

  await page.locator("[data-settings-page='display']").click();
  screenshot = await shot(page, "v27--spectrum-area-sliders-and-limits--1024x768.png");
  await check(page, "spectrum-sliders-and-local-magnitude", async () => {
    if (!await page.locator("[data-testid='pane-frequency-slider']").isVisible()) throw new Error("Frequency plot slider missing");
    if (!await page.locator("[data-testid='pane-magnitude-slider']").isVisible()) throw new Error("Magnitude plot slider missing");
    if (!await page.locator("[data-range-control='area-magnitude']").isVisible()) throw new Error("Local magnitude limits missing");
  }, screenshot);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-settings-page='screen']").click();
  screenshot = await shot(page, "v27--screen-spectrum-links--1440x900.png");
  await check(page, "screen-four-links-and-frequency-limits", async () => {
    if (await page.locator("[data-setting-toggle='spectrumFrequency']").count() !== 1) throw new Error("Spectrum frequency link missing");
    if (!await page.locator("[data-range-control='screen-frequency']").isVisible()) throw new Error("Screen frequency limits missing");
  }, screenshot);

  await page.locator("[data-settings-page='peaks']").click();
  await page.locator("[data-testid='extrema-values']").click();
  screenshot = await shot(page, "v27--spectrum-extrema--1440x900.png");
  await check(page, "spectrum-extrema-markers-and-table", async () => {
    if (await page.locator(".plot-peak").count() < 3) throw new Error("Spectrum markers missing");
    if (await page.locator("button[data-inspector-page='peaks']").getAttribute("aria-selected") !== "true") throw new Error("Extrema table not selected");
  }, screenshot);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator("[data-inspector-page='signals']").click();
  await page.locator("[data-testid='signal-operation-radarPulse']").click();
  screenshot = await shot(page, "v27--signal-operation-default--1024x768.png");
  await check(page, "operation-dialog-default", async () => {
    if (!await page.locator("[data-testid='signal-operation-dialog']").isVisible()) throw new Error("Dialog missing");
  }, screenshot);
  await check(page, "operation-select-closed-shared-contract", async () => {
    const closed = await page.locator("[data-testid='signal-operation-select-input']").evaluate(node => ({readOnly:node.readOnly, arrowWidth:getComputedStyle(node.parentElement.querySelector("[data-value-select-arrow]")).width}));
    if (!closed.readOnly || closed.arrowWidth !== "24px") throw new Error(JSON.stringify(closed));
  }, screenshot);
  await page.locator("[data-testid='signal-operation-select-input']").click();
  screenshot = await shot(page, "v28--signal-operation-menu--1024x768.png");
  await check(page, "operation-menu-shared-value-select", async () => {
    const contract = await page.evaluate(() => {
      const trigger=document.querySelector("[data-testid='signal-operation-select']"), input=document.querySelector("[data-testid='signal-operation-select-input']"), popup=document.querySelector("[data-value-select-popup]"), option=popup.querySelector("[data-value-select-option-index]");
      const a=trigger.getBoundingClientRect(), b=popup.getBoundingClientRect(), ps=getComputedStyle(popup), os=getComputedStyle(option);
      return {readOnly:input.readOnly, placeholder:input.placeholder, options:popup.querySelectorAll("[data-value-select-option-index]").length, popupInputs:popup.querySelectorAll("input").length, widthDelta:Math.abs(a.width-b.width), padding:ps.padding, border:ps.borderTopWidth, optionHeight:os.height, modalOwned:popup.classList.contains("is-modal-owned"), selected:popup.querySelectorAll(".is-selected").length};
    });
    if (contract.readOnly || contract.placeholder !== "Поиск" || contract.options !== 7 || contract.popupInputs !== 0 || contract.widthDelta > 1 || contract.padding !== "0px" || contract.border !== "0px" || contract.optionHeight !== "34px" || !contract.modalOwned || contract.selected !== 1) throw new Error(JSON.stringify(contract));
  }, screenshot);
  await page.keyboard.press("Escape");
  await check(page, "operation-menu-escape-keeps-dialog", async () => {
    if (!await page.locator("[data-value-select-popup]").isHidden() || !await page.locator("[data-testid='signal-operation-dialog']").isVisible()) throw new Error("Escape contract failed");
  }, null);
  await page.locator("[data-testid='signal-operation-select-input']").click();
  await page.locator("[data-testid='signal-operation-select-input']").fill("Кор");
  await check(page, "operation-menu-inline-search", async () => { if (await page.locator("[data-value-select-option-index]").count() !== 2) throw new Error("Search must filter in the trigger input"); }, null);
  await page.keyboard.press("Escape");
  await page.locator("[data-testid='signal-operation-select-input']").click();
  await page.keyboard.press("Tab");
  await check(page, "operation-menu-tab-closes", async () => { if (!await page.locator("[data-value-select-popup]").isHidden()) throw new Error("Tab did not close popup"); }, null);
  await page.locator("[data-testid='signal-operation-select-input']").click();
  await page.locator(".dialog-titlebar").click({position:{x:20,y:20}});
  await check(page, "operation-menu-outside-closes", async () => { if (!await page.locator("[data-value-select-popup]").isHidden()) throw new Error("Outside click did not close popup"); }, null);
  await page.locator("[data-testid='signal-operation-select-input']").click();
  await page.locator("[data-value-select-option-index='6']").click();
  screenshot = await shot(page, "v28--signal-operation-custom-body--1024x768.png");
  await check(page, "custom-operation-body-only", async () => {
    const surface = await page.locator("[data-operation-form]").innerText();
    const code = await page.locator("[data-operation-code]").inputValue();
    if (!surface.includes("Код выполняется в Engee") || !surface.includes("init_signal") || /temporary|cleanup|wrapper|let init_signal/i.test(surface) || code !== "init_signal .* 2") throw new Error(surface + " / " + code);
  }, screenshot);
  await page.locator("[data-operation-code]").fill("init_signal .* missing_variable");
  await page.locator("[data-operation-submit]").click();
  await page.waitForTimeout(700);
  screenshot = await shot(page, "v28--signal-operation-engee-error--1024x768.png");
  await check(page, "custom-operation-engee-error", async () => {
    if (!await page.locator(".operation-status.error").isVisible() || !(await page.locator(".operation-status.error").innerText()).includes("Engee")) throw new Error("Engee error not shown");
  }, screenshot);
  await page.locator("[data-operation-code]").fill("init_signal ./ maximum(abs.(init_signal))");
  await page.locator("[data-operation-submit]").click();
  screenshot = await shot(page, "v28--signal-operation-progress--1024x768.png");
  await check(page, "operation-progress-blocks-close", async () => {
    if (!await page.locator(".operation-progress").isVisible()) throw new Error("Progress missing");
    if (!await page.locator("[data-dialog-close]").isDisabled()) throw new Error("Busy dialog close must be disabled");
  }, screenshot);
  await page.waitForTimeout(750);
  screenshot = await shot(page, "v28--signal-operation-success--1024x768.png");
  await check(page, "operation-success", async () => {
    if (!await page.locator(".operation-status.success").isVisible()) throw new Error("Success missing");
  }, screenshot);

  await page.setViewportSize({ width: 840, height: 620 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.designReady === "true");
  screenshot = await shot(page, "v27--undersized-document-scroll--840x620.png");
  await check(page, "undersized-keeps-minimum-canvas", async () => {
    const size = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }));
    if (!(size.sw >= 920 && size.sh >= 680 && size.sw > size.iw && size.sh > size.ih)) throw new Error(JSON.stringify(size));
  }, screenshot);

  await page.setViewportSize({ width: 920, height: 680 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.designReady === "true");
  const before = await page.locator("[data-testid='display-tabs']").innerText();
  await page.locator("[data-close-display='display-1']").click();
  await page.locator("[data-testid='add-display']").click();
  const after = await page.locator("[data-testid='display-tabs']").innerText();
  await check(page, "stable-display-ordinals", async () => {
    if (!before.includes("Экран 1") || !before.includes("ВЧ-контроль") || !after.includes("ВЧ-контроль") || !after.includes("Экран 4") || after.includes("Экран 2")) throw new Error("Stable naming failed: " + after);
  }, null);

  const output = { design_version: 28, generated_at: new Date().toISOString(), passed: results.filter(x => x.passed).length, failed: results.filter(x => !x.passed).length, results };
  fs.writeFileSync(evidencePath, JSON.stringify(output, null, 2) + "\n");
  await browser.close();
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
