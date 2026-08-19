const { chromium } = require("../../../../test/playwright/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const screenshots = path.join(root, "screenshots");
const evidence = path.join(root, "evidence", "interaction-walkthrough-v32-standalone.json");
fs.mkdirSync(screenshots, { recursive:true });

function assert(condition, message) { if (!condition) throw new Error(message); }
async function shot(page, name) { const file=path.join(screenshots, name); await page.screenshot({ path:file, fullPage:true }); return path.relative(root, file); }

(async () => {
  const browser = await chromium.launch({ channel:"chrome", headless:true });
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const runtimeErrors=[];
  const results=[];
  page.on("console", message => { if (message.type() === "error") runtimeErrors.push("console: "+message.text()); });
  page.on("pageerror", error => runtimeErrors.push("page: "+error.message));
  await page.goto("file://" + path.join(root, "prototype", "index.html"));
  await page.waitForFunction(() => document.documentElement.dataset.task0119Ready === "true");

  async function check(id, fn, screenshot) {
    try { const detail=await fn(); results.push({ id, passed:true, detail:detail || null, screenshot:screenshot || null }); }
    catch (error) { results.push({ id, passed:false, error:error.message, screenshot:screenshot || null }); }
  }

  const automaticSampleTab=page.locator("[data-bottom-tab='samples']");
  await automaticSampleTab.click();
  await page.waitForFunction(() => document.querySelectorAll("[data-testid='samples-table-scroll'] tbody tr").length > 0);
  await check("01-automatic-main-signal-sample-tab", async () => {
    const tab=automaticSampleTab;
    assert(await tab.count() === 1, "Main-signal sample tab is absent before Values action");
    assert((await tab.innerText()).trim() === "radarPulse", "Unexpected automatic tab label");
    const columns=await page.locator("[data-testid='samples-table-scroll'] th").allTextContents();
    const rows=await page.locator("[data-testid='samples-table-scroll'] tbody tr").count();
    assert(columns.map(v => v.trim()).join("|") === "№ точки|Время|Значение|Модуль|Квадрат", JSON.stringify(columns));
    assert(rows === 24, "Expected populated first page, got "+rows);
  }, await shot(page, "v32--automatic-main-signal-samples--1440x900.png"));

  await page.getByTestId("settings-tab-signal").click();
  await check("02-values-only-focuses-existing-tab", async () => {
    const before=await page.locator("[data-bottom-tab='samples']").count();
    await page.getByTestId("signal-values-action").click();
    await page.waitForFunction(() => document.querySelector("[data-bottom-tab='samples']").getAttribute("aria-selected") === "true");
    const after=await page.locator("[data-bottom-tab='samples']").count();
    assert(before === 1 && after === 1, "Values created a duplicate sample tab");
    assert(await page.locator("[data-testid='samples-table-scroll'] tbody tr").count() > 0, "Values focused an empty table");
  });

  await page.getByTestId("settings-tab-signal").click();
  await page.locator("[data-signal-metadata='sample_rate_hz']").fill("2048.5");
  await check("03-sample-rate-editable-dot-decimal", async () => {
    const input=page.locator("[data-signal-metadata='sample_rate_hz']");
    assert(await input.count() === 1 && !(await input.isDisabled()) && !(await input.getAttribute("readonly")), "Sample rate is not editable metadata");
    assert(await input.inputValue() === "2048.5", "Dot-decimal draft was not retained");
    const verdict=await page.evaluate(() => window.SignalAnalyserTask0119.validateSampleRate("2048.5"));
    const comma=await page.evaluate(() => window.SignalAnalyserTask0119.validateSampleRate("2048,5"));
    assert(verdict.valid && !comma.valid, "Sample-rate dot-decimal validation contract failed");
    assert(!(await page.getByTestId("settings-apply").isDisabled()), "Unified Apply did not become dirty");
  }, await shot(page, "v32--editable-sample-rate--1440x900.png"));

  await page.locator(".settings-panel .color-swatch-button").click();
  await page.waitForSelector("[data-testid='signal-color-picker']:not([hidden])");
  const colorSource=page.locator("[data-signal-metadata='color']");
  const colorOpening=await colorSource.inputValue();
  await page.getByTestId("signal-color-picker").locator("[data-color='#ff7300']").click();
  await check("04-jet-color-picker-draft-and-apply", async () => {
    const picker=page.getByTestId("signal-color-picker");
    const geometry=await picker.evaluate(node => ({ width:node.getBoundingClientRect().width, text:node.innerText, swatches:node.querySelectorAll("[data-color]").length }));
    assert(geometry.width === 284 && geometry.swatches === 15, JSON.stringify(geometry));
    assert(geometry.text.includes("Палитра Jet") && !/Цветовая схема|Линия|Маркер|Заливка|Интерполяция/.test(geometry.text), geometry.text);
    const exact=await page.evaluate(() => window.SignalColorPickerUI.palette);
    assert(JSON.stringify(exact) === JSON.stringify(["#000080","#0000d1","#0010ff","#0058ff","#00a4ff","#06ecf1","#40ffb7","#7dff7a","#b7ff40","#f1fc06","#ffb900","#ff7300","#ff3000","#d10000","#800000"]), JSON.stringify(exact));
    const source=colorSource;
    assert(await source.inputValue() === colorOpening, "Palette click committed before popover Apply");
    assert(await picker.locator("[data-color='#ff7300']").getAttribute("aria-selected") === "true", "Jet draft tick missing");
    await page.getByTestId("signal-color-picker-apply").click();
    await page.waitForFunction(() => document.querySelector("[data-testid='signal-color-picker']").hidden);
    assert(await source.inputValue() === "#ff7300", "Popover Apply did not update Signal draft");
  }, await shot(page, "v32--jet-color-picker--1440x900.png"));

  await page.getByTestId("inspector-tab-signals").click();
  await page.getByTestId("signal-operation-radarPulse").click();
  await page.waitForSelector("[data-testid='signal-operation-dialog']:not([hidden])");
  await check("05-overwrite-checkbox-visible-standard-row", async () => {
    const audit=await page.evaluate(() => {
      const input=document.querySelector("[data-signal-operation-overwrite]");
      const label=input && input.closest("label");
      const box=input && input.getBoundingClientRect();
      return { text:label && label.innerText.trim(), boxWidth:box && box.width, clipped:label && (label.scrollWidth > label.clientWidth || label.scrollHeight > label.clientHeight) };
    });
    assert(audit.text === "Затирать сигнал с таким именем", JSON.stringify(audit));
    assert(audit.boxWidth === 16 && !audit.clipped, JSON.stringify(audit));
  }, await shot(page, "v32--operation-overwrite-checkbox--1440x900.png"));
  await page.locator("[data-signal-operation-cancel]").click();

  await page.getByTestId("settings-tab-signal").click();
  await page.getByTestId("pane-type-pane-spectrum-input").click();
  await page.getByRole("option", { name:"Временная область" }).click();
  await page.waitForFunction(() => document.querySelector("[data-testid='settings-tab-display']").getAttribute("aria-selected") === "true");
  await check("06-pane-type-change-focuses-area", async () => {
    assert(await page.getByTestId("settings-tab-display").getAttribute("aria-selected") === "true", "Area settings did not become active");
    assert(await page.getByTestId("settings-content").getAttribute("aria-labelledby") === "settings-tab-display", "Signal content leaked into Area page");
  }, await shot(page, "v32--pane-type-change-focuses-area--1440x900.png"));

  await page.getByTestId("pane-type-pane-spectrum-input").click();
  await page.getByRole("option", { name:"Спектр", exact:true }).click();
  await page.waitForFunction(() => document.querySelector("[data-testid='settings-tab-display']").getAttribute("aria-selected") === "true");
  await page.getByTestId("settings-tab-peaks").click();
  await page.waitForSelector("[data-testid='extrema-settings-group']");
  await page.getByTestId("extrema-values").click();
  await page.waitForSelector("[data-testid='peaks-table']");
  await check("07-spectrum-extrema-settings-values-markers", async () => {
    assert(!(await page.getByTestId("settings-tab-peaks").isHidden()), "Spectrum Extrema settings tab is hidden");
    assert(!(await page.getByTestId("inspector-tab-peaks").isHidden()), "Spectrum Extrema bottom tab is hidden");
    const headers=(await page.getByTestId("peaks-table").locator("th").allTextContents()).map(v => v.trim());
    assert(headers.includes("Магнитуда") && headers.includes("Частота"), JSON.stringify(headers));
    assert(await page.getByTestId("peaks-table").locator("tbody tr").count() === 3, "Spectrum frequency rows are absent");
    const markers=await page.evaluate(() => Array.from(document.querySelectorAll("[data-pane-host]")).some(host => (host.data || []).some(trace => trace.meta && trace.meta.signal_analyser_peaks_overlay)));
    assert(markers, "Spectrum extrema markers are absent");
  }, await shot(page, "v32--spectrum-extrema-settings-values--1440x900.png"));

  await page.getByTestId("pane-type-pane-spectrum-input").click();
  await page.getByRole("option", { name:"Спектрограмма", exact:true }).click();
  await page.waitForFunction(() => document.querySelector("[data-testid='settings-tab-display']").getAttribute("aria-selected") === "true");
  await check("08-spectrogram-hides-unsupported-extrema-tabs", async () => {
    assert(await page.getByTestId("settings-tab-peaks").isHidden(), "Spectrogram kept unsupported settings Extrema tab");
    assert(await page.getByTestId("inspector-tab-peaks").isHidden(), "Spectrogram kept unsupported bottom Extrema tab");
  }, await shot(page, "v32--spectrogram-hides-extrema-tabs--1440x900.png"));

  await check("09-file-prototype-no-network-or-errors", async () => {
    const network=await page.evaluate(() => window.SignalAnalyserPrototypeEvidence.networkRequests().map(item => item.name));
    assert(network.length === 0, "HTTP resources: "+JSON.stringify(network));
    assert(runtimeErrors.length === 0, JSON.stringify(runtimeErrors));
  });

  const output={ design_version:32, prototype_entry:"prototype/index.html", protocol:"file://", passed:results.filter(item => item.passed).length, failed:results.filter(item => !item.passed).length, runtime_errors:runtimeErrors, results };
  fs.writeFileSync(evidence, JSON.stringify(output, null, 2) + "\n");
  await browser.close();
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.failed || runtimeErrors.length ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
