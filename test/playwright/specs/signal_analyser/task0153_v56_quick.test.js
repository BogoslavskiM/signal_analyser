"use strict";

const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifacts = path.join(__dirname, "..", "..", "artifacts", "TASK-0153-V56");
const prototypeUrl = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/current/prototype/index.html";

function record(entry) {
  fs.mkdirSync(artifacts, { recursive:true });
  const file = path.join(artifacts, "progress.json");
  const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  rows.push(Object.assign({ at:new Date().toISOString() }, entry));
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
}
async function ready(page, config) {
  await waitForAppReady(page, config, { timeout:30000 });
  const loader=page.locator(testIdSelector(config.app.loaderTestId));
  if (await loader.count()) await loader.waitFor({ state:"hidden", timeout:30000 });
}
async function selectedDisplay(page) {
  return page.locator("[data-testid='display-tabs'] [role='tab']").evaluateAll(function (nodes) {
    const selected=nodes.find(function (node) { return node.getAttribute("aria-selected") === "true"; });
    return selected && selected.getAttribute("data-display-select");
  });
}
async function deleteDisplay(page, config, id) {
  const close=page.locator(`[data-testid='display-close-${id}']`);
  if (!await close.count()) return;
  await close.click();
  await page.locator(`[data-testid='display-tab-${id}']`).waitFor({ state:"detached", timeout:30000 });
  await ready(page, config);
  record({ step:"cleanup-display", id:id });
}

async function task0153V56({ appUrl, assert, config, page, step }) {
  let temporary="";
  let original="";
  const network=[];
  page.on("response", function (response) {
    const pathname=new URL(response.url()).pathname;
    if (/^\/api\//.test(pathname)) network.push({ pathname:pathname, status:response.status() });
  });
  try {
    await step("prototype visual contract", async function () {
      await page.goto(prototypeUrl, { waitUntil:"domcontentloaded" });
      await page.locator(testIdSelector("app-shell")).waitFor({ state:"visible", timeout:30000 });
      await page.screenshot({ path:path.join(artifacts,"prototype.png"), fullPage:true });
      record({ step:"prototype-open" });
    });
    await step("production availability", async function () {
      await page.goto(appUrl, { waitUntil:"domcontentloaded" });
      await ready(page, config);
      await page.screenshot({ path:path.join(artifacts,"production-ready.png"), fullPage:true });
      assert(await page.locator("text=/TypeError:|ArgumentError:|500 Internal Server Error/").count() === 0, "production must not expose raw errors");
      original=await selectedDisplay(page);
      assert(!!original, "active Display must exist");
      record({ step:"production-ready", display:original });
    });
    await step("isolated V56 workflow", async function () {
      const count=await page.locator("[data-testid='display-tabs'] [role='tab']").count();
      await page.locator(testIdSelector("add-display")).click();
      await page.waitForFunction(function (expected) { return document.querySelectorAll("[data-testid='display-tabs'] [role='tab']").length === expected; }, count + 1, { timeout:30000 });
      await ready(page, config);
      temporary=await selectedDisplay(page);
      assert(temporary && temporary !== original, "test must use a new isolated Display");
      const harmonic=page.locator("[data-signal-row][data-signal-name='Гармонический сигнал']");
      await harmonic.waitFor({ state:"visible", timeout:30000 });
      const visibility=harmonic.locator("[data-visible-signal]");
      if (!await visibility.isChecked()) { await visibility.setChecked(true); await ready(page, config); }
      await harmonic.click();
      await ready(page, config);
      const host=page.locator(`[data-pane-host^=${JSON.stringify(temporary + "::")}]`).first();
      await host.waitFor({ state:"visible", timeout:30000 });
      await page.waitForFunction(function (node) { return node && node.dataset.plotReady === "true" && node.data && node.data.length; }, await host.elementHandle(), { timeout:30000 });
      const plot=host.locator(".js-plotly-plot").first();
      const before=await plot.evaluate(function (node) { const l=node._fullLayout||{}; return {x:l.xaxis&&l.xaxis.range,y:l.yaxis&&l.yaxis.range}; });
      await plot.dblclick();
      await page.waitForFunction(function (node) { const l=node&&node._fullLayout||{}; return l.xaxis&&l.yaxis&&l.xaxis.autorange===true&&l.yaxis.autorange===true; }, await plot.elementHandle(), { timeout:10000 });
      assert(await host.locator("[data-plot-range-slider], [data-plot-amplitude-slider]").count() === 0, "autoscale must not make pane sliders visible");
      record({ step:"autoscale", before:before });

      const screen=page.locator("[data-testid='settings-tab-screen']");
      await screen.click();
      await screen.waitFor({ state:"visible", timeout:5000 });
      assert((await screen.getAttribute("aria-selected")) !== "false", "Screen settings tab must activate");
      const area=page.locator("[data-testid='settings-tab-area']");
      for (const type of ["time", "spectrum", "spectrogram", "persistence"]) {
        const select=host.locator("[data-pane-plot-type], select").first();
        if (await select.count() && await select.evaluate(function (node) { return node.tagName === "SELECT"; })) await select.selectOption(type);
        else break;
        await ready(page, config);
        await area.click();
        const ranges=page.locator("[data-screen-range-slider]:visible");
        const ids=await ranges.evaluateAll(function (nodes) { return nodes.map(function (node) { return node.getAttribute("data-screen-range-slider"); }); });
        assert(new Set(ids).size === ids.length, `${type}: each applicable Area range must have exactly one dual-thumb slider`);
        assert(await ranges.evaluateAll(function (nodes) { return nodes.every(function (node) { return node.querySelectorAll("input[type='range']").length === 2; }); }), `${type}: applicable range slider must be dual-thumb`);
        record({ step:"area-ranges", type:type, ids:ids });
      }

      await page.locator("[data-testid='inspector-tab-measurements']").click();
      await page.locator("[data-testid='measurement-columns-menu-trigger']").click();
      const menu=page.locator("[data-testid='measurement-columns-menu']");
      assert(!(await menu.innerText()).includes("Видимость столбцов"), "Measurements popup must not include a nested column visibility control");
      await page.keyboard.press("Escape");
      const values=page.locator("[data-testid='signal-values-action']");
      const extrema=page.locator("[data-testid='extrema-values']");
      for (const action of [values, extrema]) if (await action.count() && await action.isVisible()) {
        const style=await action.evaluate(function (node) { const s=getComputedStyle(node); return { bg:s.backgroundColor, color:s.color }; });
        assert(/rgb\(.*(132|137|139|143|147|150|153|156|159|162|165|168|171|174|177|180|183|186|189|192|195|198|201|204|207|210|213|216|219|222|225|228|231|234|237|240|243|246|249|252|255)/.test(style.bg) || /rgb\(0,\s*123|rgb\(33,\s*150|rgb\(30,\s*136/.test(style.bg), "footer action must use computed primary-blue presentation");
      }
      const plotType=host.locator("select").first();
      if (await plotType.count()) await plotType.selectOption("persistence");
      await ready(page, config);
      await page.waitForFunction(function (node) { return node && node.dataset.plotReady === "true" && Array.isArray(node.data) && node.data.some(function (trace) { return trace && trace.type === "heatmap" && Array.isArray(trace.z) && trace.z.length; }); }, await host.elementHandle(), { timeout:30000 });
      await page.screenshot({ path:path.join(artifacts,"persistence-ready.png"), fullPage:true });
      record({ step:"persistence-ready" });
    });
  } finally {
    record({ step:"finally-entered", temporary:temporary || null, original:original || null, networkCount:network.length });
    if (temporary) await deleteDisplay(page, config, temporary);
    if (original) {
      const tab=page.locator(`[data-testid='display-tab-${original}']`);
      if (await tab.count()) await tab.click();
    }
    fs.mkdirSync(artifacts, { recursive:true });
    fs.writeFileSync(path.join(artifacts,"network.json"), JSON.stringify(network, null, 2));
    record({ step:"finally-complete", temporary:temporary || null, restored:original || null, networkCount:network.length });
  }
}

task0153V56.scenarioFlags=["TASK-0153-V56"];
module.exports=task0153V56;
