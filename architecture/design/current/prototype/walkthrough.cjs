const { chromium } = require("../../../../test/playwright/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const screenshots = path.join(root, "screenshots");
const evidencePath = path.join(root, "evidence", "interaction-walkthrough-v29-standalone.json");
const entry = "file://" + path.resolve(__dirname, "index.html");
const results = [];
const runtimeErrors = [];

async function ready(page) {
  await page.goto(entry, { waitUntil:"load" });
  await page.waitForFunction(() => document.documentElement.dataset.designReady === "true");
  await page.waitForSelector("[data-testid='signal-values-action']");
}
async function shot(page, name) {
  const file = path.join(screenshots, name);
  await page.screenshot({ path:file, fullPage:true });
  return "screenshots/" + name;
}
async function check(id, assertion, screenshot) {
  let passed=false, detail="";
  try { detail=await assertion() || "passed"; passed=true; }
  catch (error) { detail=String(error && error.message || error); }
  results.push({ id, passed, detail, screenshot:screenshot || null });
}
function assert(condition, message) { if (!condition) throw new Error(message); }

(async () => {
  fs.mkdirSync(screenshots, { recursive:true });
  const browser=await chromium.launch({ channel:"chrome", headless:true });
  const page=await browser.newPage({ viewport:{ width:1440, height:900 } });
  page.setDefaultTimeout(7000);
  page.on("pageerror", error => runtimeErrors.push("pageerror: " + error.message));
  page.on("console", message => { if (message.type() === "error") runtimeErrors.push("console: " + message.text()); });
  await ready(page);

  let screenshot=await shot(page, "v29--standalone-production-signal--1440x900.png");
  await check("01-standalone-file-no-network-no-cors", async () => {
    const audit=await page.evaluate(() => ({
      protocol:location.protocol,
      network:window.SignalAnalyserPrototypeEvidence.networkRequests().map(item => item.name),
      zones:Array.from(document.querySelectorAll("[data-zone-slot]")).map(node => ({ slot:node.dataset.zoneSlot, children:node.childElementCount, text:node.textContent.trim().length })),
      errorHidden:document.querySelector("[data-testid='app-error']").hidden
    }));
    assert(audit.protocol === "file:", JSON.stringify(audit));
    assert(audit.network.length === 0, "HTTP(S) resources: " + JSON.stringify(audit.network));
    assert(audit.zones.length === 4 && audit.zones.every(zone => zone.children > 0 && zone.text > 0), "Empty zones: " + JSON.stringify(audit.zones));
    assert(audit.errorHidden && runtimeErrors.length === 0, JSON.stringify(runtimeErrors));
    return JSON.stringify(audit);
  }, screenshot);
  await check("02-production-shell-and-components", async () => {
    const audit=await page.evaluate(() => ({
      toolbar:!!document.querySelector(".application-toolbar.ui-panel"),
      workspace:!!document.querySelector(".workspace.ui-panel [data-testid='plot-grid']"),
      settings:!!document.querySelector(".settings-panel.ui-panel .settings-tabs"),
      inspector:!!document.querySelector(".inspector.ui-panel .inspector-header"),
      plots:document.querySelectorAll(".plot-pane .plot-chart.js-plotly-plot").length,
      css:Array.from(document.styleSheets).map(sheet => sheet.href).filter(Boolean)
    }));
    assert(audit.toolbar && audit.workspace && audit.settings && audit.inspector && audit.plots === 2, JSON.stringify(audit));
    assert(audit.css.some(href => /public\/css\/app\.css$/.test(href)), "Production app.css is not the rendered base");
    return JSON.stringify(audit);
  }, screenshot);
  await check("03-signal-first-selected-summary", async () => {
    const tabs=await page.locator("[data-settings-page]:visible").allTextContents();
    assert(JSON.stringify(tabs.map(v => v.trim())) === JSON.stringify(["Сигнал", "Область", "Экран", "Экстремумы"]), JSON.stringify(tabs));
    assert(await page.getByTestId("settings-tab-signal").getAttribute("aria-selected") === "true", "Signal tab is not selected");
    assert(await page.locator(".summary-grid .summary-item").count() === 7, "Summary must contain seven values");
  }, screenshot);

  await page.getByTestId("signal-values-action").click();
  await page.waitForSelector("[data-testid='samples-table-scroll']");
  await page.waitForFunction(() => document.querySelectorAll(".sample-table tbody tr").length >= 20);
  screenshot=await shot(page, "v29--standalone-production-samples--1440x900.png");
  await check("04-values-focus-dynamic-five-column-table", async () => {
    assert(await page.locator("[data-bottom-tab='samples']").getAttribute("aria-selected") === "true", "Dynamic sample tab is not selected");
    assert(await page.locator(".sample-table th").count() === 5, "Sample table does not have five columns");
    assert((await page.locator(".sample-table tbody tr").count()) >= 20, "Fixture does not demonstrate pagination-ready rows");
  }, screenshot);

  await page.getByTestId("settings-tab-display").click();
  screenshot=await shot(page, "v29--standalone-production-spectrum-area--1440x900.png");
  await check("05-spectrum-area-sliders-and-local-magnitude", async () => {
    const frequency=page.locator("[data-spectrum-slider-axis='x']"), magnitude=page.locator("[data-spectrum-slider-axis='y']");
    assert(await frequency.isChecked() && await magnitude.isChecked(), "Spectrum slider toggles are not synchronized/enabled");
    assert(await page.locator("[data-screen-settings-group='local-magnitude-limits']").isVisible(), "Local magnitude limits missing");
    assert(await page.locator("[data-screen-range-slider='spectrum.y_limits']").isVisible(), "Local magnitude dual slider missing");
    assert(await page.locator("[data-screen-settings-group='local-frequency-limits']").count() === 0, "Linked frequency limits must not remain local");
  }, screenshot);

  await page.getByTestId("pane-menu-pane-spectrum").click();
  await page.waitForSelector("[data-testid='display-overflow-menu']:not([hidden])");
  await check("06-pane-menu-spectrum-slider-projections", async () => {
    const menu=page.getByTestId("display-overflow-menu");
    const labels=await menu.locator("button").allTextContents();
    assert(labels.some(v => v.includes("Слайдер частоты")) && labels.some(v => v.includes("Слайдер магнитуды")), JSON.stringify(labels));
    assert(await menu.locator("[data-plot-range-slider]").getAttribute("aria-checked") === "true", "Frequency menu state is not checked");
    assert(await menu.locator("[data-plot-amplitude-slider]").getAttribute("aria-checked") === "true", "Magnitude menu state is not checked");
  }, screenshot);
  await page.keyboard.press("Escape");

  await page.getByTestId("settings-tab-screen").click();
  screenshot=await shot(page, "v29--standalone-production-screen-links--1440x900.png");
  await check("07-screen-four-links-and-frequency-range", async () => {
    const links=await page.locator("[data-screen-settings-group='links'] input[type='checkbox']").count();
    assert(links === 4, "Expected four screen links, got " + links);
    assert(await page.locator("[data-screen-link-frequency]").isChecked(), "Frequency link is not checked");
    assert(await page.locator("[data-screen-settings-group='frequency-limits']").isVisible(), "Frequency limits missing on Screen");
    assert(await page.locator("[data-screen-range-slider='spectrum.frequency_limits']").isVisible(), "Frequency dual slider missing");
  }, screenshot);

  await page.locator("[data-screen-link-magnitude]").check();
  await page.waitForSelector("[data-screen-settings-group='magnitude-limits']");
  await check("08-linked-magnitude-relocates-immediately", async () => {
    assert(await page.locator("[data-screen-settings-group='magnitude-limits']").isVisible(), "Magnitude limits did not appear on Screen");
    await page.getByTestId("settings-tab-display").click();
    assert(await page.locator("[data-screen-settings-group='local-magnitude-limits']").count() === 0, "Magnitude limits did not disappear from Area");
  }, null);

  await page.getByTestId("settings-tab-peaks").click();
  await page.getByTestId("extrema-values").click();
  await page.waitForSelector("[data-testid='peaks-table']");
  screenshot=await shot(page, "v29--standalone-production-spectrum-extrema--1440x900.png");
  await check("09-spectrum-extrema-table-and-markers", async () => {
    const headers=(await page.locator("[data-testid='peaks-table'] th").allTextContents()).map(v => v.trim());
    assert(headers.includes("Магнитуда") && headers.includes("Частота"), JSON.stringify(headers));
    assert(await page.locator("[data-testid='peaks-table'] tbody tr").count() === 3, "Expected three extrema rows");
    const markers=await page.evaluate(() => Array.from(document.querySelectorAll("[data-pane-host]")).some(host => (host.data || []).some(trace => trace.meta && trace.meta.signal_analyser_peaks_overlay)));
    assert(markers, "Spectrum marker overlay missing");
  }, screenshot);

  await page.getByTestId("inspector-tab-signals").click();
  await page.locator("[data-testid='signal-rows'] tr").first().hover();
  await page.getByTestId("signal-operation-radarPulse").click();
  screenshot=await shot(page, "v29--standalone-production-operation-default--1440x900.png");
  await check("10-operation-dialog-production-style", async () => {
    assert(await page.getByTestId("signal-operation-dialog").isVisible(), "Operation dialog missing");
    assert((await page.locator("[data-signal-operation-form]").innerText()).includes("Исходный сигнал"), "Operation form missing");
  }, screenshot);
  await check("11-operation-select-closed-shared-contract", async () => {
    const contract=await page.getByTestId("signal-operation-select-input").evaluate(node => ({ readOnly:node.readOnly, arrow:getComputedStyle(node.parentElement.querySelector("[data-value-select-arrow]")).width }));
    assert(contract.readOnly && contract.arrow === "24px", JSON.stringify(contract));
  }, screenshot);

  await page.getByTestId("signal-operation-select-input").click();
  screenshot=await shot(page, "v29--standalone-production-operation-menu--1440x900.png");
  await check("12-operation-menu-seven-options-production-value-select", async () => {
    const contract=await page.evaluate(() => {
      const trigger=document.querySelector("[data-testid='signal-operation-select']"), input=document.querySelector("[data-testid='signal-operation-select-input']"), popup=document.querySelector("[data-value-select-popup]"), option=popup.querySelector("[data-value-select-option-index]");
      const a=trigger.getBoundingClientRect(), b=popup.getBoundingClientRect(), ps=getComputedStyle(popup), os=getComputedStyle(option);
      return { readOnly:input.readOnly, placeholder:input.placeholder, options:popup.querySelectorAll("[data-value-select-option-index]").length, popupInputs:popup.querySelectorAll("input").length, widthDelta:Math.abs(a.width-b.width), padding:ps.padding, border:ps.borderTopWidth, optionHeight:os.height, modalOwned:popup.classList.contains("is-modal-owned"), selected:popup.querySelectorAll(".is-selected").length };
    });
    assert(!contract.readOnly && contract.placeholder === "Поиск" && contract.options === 7 && contract.popupInputs === 0 && contract.widthDelta <= 1 && contract.padding === "0px" && contract.border === "0px" && contract.optionHeight === "34px" && contract.modalOwned && contract.selected === 1, JSON.stringify(contract));
  }, screenshot);

  await page.getByTestId("signal-operation-select-input").fill("Кор");
  await check("13-operation-menu-search-escape-tab-outside", async () => {
    assert(await page.locator("[data-value-select-option-index]").count() === 2, "Inline search did not filter to two options");
    await page.keyboard.press("Escape");
    assert(await page.locator("[data-value-select-popup]").isHidden() && await page.getByTestId("signal-operation-dialog").isVisible(), "Escape closed wrong layer");
    await page.getByTestId("signal-operation-select-input").click();
    await page.keyboard.press("Tab");
    assert(await page.locator("[data-value-select-popup]").isHidden(), "Tab did not close popup");
    await page.getByTestId("signal-operation-select-input").click();
    await page.locator("[data-testid='signal-operation-dialog'] .dialog-titlebar").click({ position:{ x:18, y:18 } });
    assert(await page.locator("[data-value-select-popup]").isHidden(), "Outside click did not close popup");
  }, null);

  await page.getByTestId("signal-operation-select-input").click();
  await page.locator("[data-value-select-option-index='6']").click();
  screenshot=await shot(page, "v29--standalone-production-operation-custom--1440x900.png");
  await check("14-custom-body-only-hidden-envelope", async () => {
    const text=await page.locator("[data-signal-operation-form]").innerText();
    assert(text.includes("Тело операции") && text.includes("init_signal") && text.includes("Код выполняется в Engee"), text);
    assert(!/temporary|cleanup|wrapper|let init_signal/i.test(text), "Hidden execution envelope leaked into UI: " + text);
    assert(await page.locator("#signal-operation-body").count() === 1, "Custom body editor missing");
  }, screenshot);

  await page.locator("#signal-operation-body").fill("init_signal .* missing_variable");
  await page.locator("[data-signal-operation-submit]").click();
  await page.waitForSelector(".operation-status.error");
  screenshot=await shot(page, "v29--standalone-production-operation-error--1440x900.png");
  await check("15-custom-operation-engee-error", async () => {
    const text=await page.locator(".operation-status.error").innerText();
    assert(text.includes("Engee") && text.includes("missing_variable"), text);
  }, screenshot);

  await page.locator("#signal-operation-body").fill("init_signal ./ maximum(abs.(init_signal))");
  await page.locator("[data-signal-operation-submit]").click();
  screenshot=await shot(page, "v29--standalone-production-operation-progress--1440x900.png");
  await check("16-operation-progress-blocks-close-then-success", async () => {
    assert(await page.locator(".operation-progress").isVisible(), "Progress state missing");
    assert(await page.locator("[data-signal-operation-close]").isDisabled(), "Close must be disabled while busy");
    await page.waitForSelector(".operation-status.success");
    assert(await page.locator(".operation-status.success").isVisible(), "Success state missing");
  }, screenshot);

  await page.setViewportSize({ width:840, height:620 });
  await ready(page);
  screenshot=await shot(page, "v29--standalone-production-undersized--840x620.png");
  await check("17-undersized-keeps-production-minimum-canvas", async () => {
    const size=await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, sh:document.documentElement.scrollHeight, iw:innerWidth, ih:innerHeight }));
    assert(size.sw > size.iw && size.sh > size.ih && size.sw >= 920 && size.sh >= 680, JSON.stringify(size));
    return JSON.stringify(size);
  }, screenshot);

  await page.setViewportSize({ width:1440, height:900 });
  await ready(page);
  const before=await page.getByTestId("display-tabs").innerText();
  await page.getByTestId("display-close-display-1").click();
  await page.waitForFunction(() => !document.querySelector("[data-testid='display-tab-display-1']"));
  await page.getByTestId("add-display").click();
  await page.waitForSelector("[data-testid='display-tab-display-4']");
  const after=await page.getByTestId("display-tabs").innerText();
  await check("18-stable-display-names-and-ordinals", async () => {
    assert(before.includes("Экран 1") && before.includes("ВЧ-контроль"), before);
    assert(after.includes("ВЧ-контроль") && after.includes("Экран 4") && !after.includes("Экран 2"), after);
    return after;
  }, null);

  const output={ design_version:29, prototype_entry:"prototype/index.html", protocol:"file://", production_base:["public/index.html", "public/css/theme.css", "public/css/app.css", "public/js/api.js", "public/js/value-select.js", "public/js/numeric.js", "public/js/settings.js", "public/js/layouts.js", "public/vendor/vue/3.5.41/vue.global.prod.js", "public/js/components/explicit-apply.js", "public/js/native-session-io.js", "public/js/app.js"], generated_at:new Date().toISOString(), passed:results.filter(item => item.passed).length, failed:results.filter(item => !item.passed).length, runtime_errors:runtimeErrors, results };
  fs.writeFileSync(evidencePath, JSON.stringify(output, null, 2) + "\n");
  await browser.close();
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.failed || runtimeErrors.length ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
