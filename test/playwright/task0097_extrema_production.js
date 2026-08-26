"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "1cf64a6c630685a48969fb1d364c7171e9b1ecdc";
const prototype = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html";
const artifactDir = path.resolve(__dirname, "artifacts/TASK-0097-EXTREMA");
fs.mkdirSync(artifactDir, { recursive: true });

const report = {
  id: "TASK-0097-EXTREMA",
  target,
  expected_revision: revision,
  design_ref: "architecture/design/TASK-0080-explicit-apply-flow/DESIGN.md",
  design_version: 9,
  applied_skills: ["e2e/e2e-workflow", "e2e/visual-analysis"],
  browser_channel: "chrome",
  headless: false,
  browser_visibility: "foreground",
  worker_count: 1,
  checks: [], requests: [], screenshots: [], errors: [],
  opened_tab_count: 0, closed_tab_count: 0
};
const save = () => fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(report, null, 2));
const check = (name, pass, detail) => { report.checks.push({ name, status: pass ? "passed" : "failed", detail }); save(); };
const snap = async (page, name) => { const file = path.join(artifactDir, name); await page.screenshot({ path: file, fullPage: false }); report.screenshots.push({ file, url: page.url(), timestamp: new Date().toISOString() }); save(); };
const activateChrome = () => execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']);

async function state(page) {
  return page.evaluate(() => ({
    tabs: [...document.querySelectorAll("[data-settings-page], [data-bottom-tab]")].map(x => ({ scope: x.dataset.settingsPage ? "settings" : "lower", text: x.textContent.trim(), selected: x.getAttribute("aria-selected"), box: (() => { const b = x.getBoundingClientRect(); return { w: b.width, h: b.height }; })() })),
    visibleText: document.body.innerText,
    table: (() => { const t = document.querySelector("[data-testid='peaks-table']"); return t ? { headers: [...t.querySelectorAll("th")].map(x => x.textContent.trim()), rows: [...t.querySelectorAll("tbody tr")].map(r => ({ cells: [...r.cells].map(c => c.innerText.trim()), marker: r.querySelector("[data-marker-symbol]")?.dataset.markerSymbol, color: r.querySelector(".peaks-color-swatch")?.style.getPropertyValue("--swatch") })) } : null; })(),
    settings: Object.fromEntries([...document.querySelectorAll("[data-peaks-setting]")].map(x => [x.dataset.peaksSetting, x.value])),
    mode: document.querySelector("[data-extrema-mode-trigger]")?.innerText.trim(),
    plot: (() => { const h = document.querySelector(".plot-chart.js-plotly-plot"); if (!h) return null; h.dataset.e2eIdentity ||= `task0097-${Date.now()}`; return { identity: h.dataset.e2eIdentity, baseTraceCount: (h.data || []).filter(t => !(t.meta && t.meta.signal_analyser_peaks_overlay)).length, overlay: (h.data || []).filter(t => t.meta && t.meta.signal_analyser_peaks_overlay).map(t => ({ color: t.marker?.color, symbol: t.marker?.symbol, text: t.text })) }; })(),
    app: (() => { const x = document.querySelector("[data-testid='app-shell']"); const main = document.querySelector(".main-stage"); const lower = document.querySelector(".inspector-panel"); const settings = document.querySelector(".settings-panel"); return { app: x && (() => { const b=x.getBoundingClientRect(); return {w:b.width,h:b.height}; })(), main: main && main.getBoundingClientRect().height, lower: lower && lower.getBoundingClientRect().height, settings: settings && settings.getBoundingClientRect().width, scrollX: document.documentElement.scrollWidth > innerWidth, scrollY: document.documentElement.scrollHeight > innerHeight }; })()
  }));
}

async function awaitReady(page) {
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-testid='peaks-table-scroll']");
    return host && !host.innerText.includes("Расчёт экстремумов…");
  }, { timeout: 180000 });
}

async function chooseMode(page, mode) {
  await page.getByTestId("extrema-mode-trigger").click();
  await page.locator(`[data-extrema-mode-option='${mode}']`).click();
}

async function apply(page, mode, requestStart) {
  await chooseMode(page, mode);
  const pending = page.waitForResponse(r => /\/api\/peaks\/settings(?:\?|$)/.test(r.url()) && r.request().method() === "POST", { timeout: 60000 });
  await page.getByTestId("settings-apply").click();
  const response = await pending;
  const body = response.request().postDataJSON();
  await awaitReady(page);
  const after = await state(page);
  const outputRequests = report.requests.slice(requestStart).filter(x => /\/api\/outputs\/active/.test(x.url)).length;
  return { response: response.status(), body, after, outputRequests };
}

(async () => {
  let browser, context, protoPage, prodPage, original, postStarted = false, restored = false;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_page_urls = context.pages().map(p => p.url());
    protoPage = await context.newPage(); report.opened_tab_count++;
    await protoPage.bringToFront(); activateChrome();
    for (const [w, h] of [[1024, 768], [1440, 900]]) {
      await protoPage.setViewportSize({ width: w, height: h });
      await protoPage.goto(prototype, { waitUntil: "domcontentloaded" });
      await protoPage.locator("[data-design-id='settings-tab-peaks']").click();
      await protoPage.locator("[data-design-id='inspector-tab-peaks']").click();
      await snap(protoPage, `prototype-${w}x${h}-extrema.png`);
      const p = await protoPage.evaluate(() => ({ text: document.body.innerText, headers: [...document.querySelectorAll("th")].map(x => x.textContent.trim()) }));
      check(`prototype v9 structure ${w}x${h}`, /Экстремумы/.test(p.text) && !/\bПики\b/.test(p.text) && p.headers.length === 7 && p.headers.includes("Тип"), p);
    }
    prodPage = await context.newPage(); report.opened_tab_count++;
    await prodPage.bringToFront(); activateChrome();
    prodPage.on("response", r => { if (/\/api\/(?:status|peaks|outputs\/active)/.test(r.url())) report.requests.push({ url: r.url(), method: r.request().method(), status: r.status(), at: new Date().toISOString() }); });
    await prodPage.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
    await prodPage.getByTestId("app-shell").waitFor({ state: "visible", timeout: 180000 });
    const status = await prodPage.evaluate(async () => { const r = await fetch("./api/status"); return { status: r.status, body: await r.json() }; });
    check("production availability and exact revision", status.status === 200 && status.body.ready === true && status.body.runtime_revision === revision, status);
    if (!(status.status === 200 && status.body.ready === true && status.body.runtime_revision === revision)) throw new Error("BLOCKER: exact production runtime revision unavailable");
    await prodPage.getByTestId("settings-tab-peaks").click();
    await prodPage.getByTestId("inspector-tab-peaks").click();
    await awaitReady(prodPage);
    original = await state(prodPage);
    original.settings.mode = ({ "Максимумы": "maxima", "Минимумы": "minima", "Все экстремумы": "all" })[original.mode];
    report.original_active_pane_settings = original.settings;
    report.original_active_pane_mode = original.mode;
    const baselineRequests = report.requests.length;
    for (const [w, h] of [[1024, 768], [1440, 900]]) {
      await prodPage.setViewportSize({ width: w, height: h }); await prodPage.bringToFront(); activateChrome();
      const s = await state(prodPage);
      await snap(prodPage, `production-${w}x${h}-maxima.png`);
      const right = s.tabs.filter(x => x.scope === "settings");
      const lower = s.tabs.filter(x => x.scope === "lower");
      check(`v9 labels/table/layout ${w}x${h}`, right.length === 2 && lower.length === 3 && right.map(x => x.text).join("|") === "Отображение|Экстремумы" && lower.map(x => x.text).join("|") === "Сигналы|Измерения|Экстремумы" && right.every(x => Math.abs(x.box.h - 32) <= 1) && (!s.table || (s.table.headers.length === 7 && s.table.headers.join("|") === "№|Сигнал|Цвет|Тип|Значение|Время, с|Метка на графике")) && !s.visibleText.includes("Пики"), s);
      check(`v9 geometry ${w}x${h}`, s.app.app && Math.abs(s.app.app.w - w) <= 1 && Math.abs(s.app.app.h - h) <= 1 && !s.app.scrollX && !s.app.scrollY, s.app);
    }
    check("permanent magnitude copy and exact mode options", /Для комплексных сигналов экстремумы рассчитываются по модулю \|y\|\./.test(original.visibleText), { mode: original.mode, settings: original.settings });
    await prodPage.getByTestId("extrema-mode-trigger").click();
    const options = await prodPage.locator("[data-extrema-mode-option]").allTextContents();
    check("exact mode options", JSON.stringify(options.map(x => x.trim())) === JSON.stringify(["Максимумы", "Минимумы", "Все экстремумы"]), options);
    await prodPage.keyboard.press("Escape");
    const invalidStart = report.requests.length;
    await prodPage.locator("[data-peaks-setting='threshold']").fill("-1"); await prodPage.locator("[data-peaks-setting='threshold']").press("Tab");
    const invalid = await state(prodPage);
    check("negative threshold locally invalid produces no POST", prodPage.getByTestId("settings-apply") && await prodPage.getByTestId("settings-apply").isDisabled() && report.requests.slice(invalidStart).filter(x => /\/api\/peaks\/settings/.test(x.url) && x.method === "POST").length === 0, { invalid, requests: report.requests.slice(invalidStart) });
    await prodPage.locator("[data-peaks-setting='threshold']").fill(original.settings.threshold); await prodPage.locator("[data-peaks-setting='threshold']").press("Tab");
    const expected = { maxima: "Максимум", minima: "Минимум", all: null };
    for (const mode of ["maxima", "minima", "all"]) {
      await prodPage.bringToFront(); activateChrome();
      const before = await state(prodPage); const result = await apply(prodPage, mode, baselineRequests); postStarted = true;
      await prodPage.getByTestId("inspector-tab-peaks").click(); await awaitReady(prodPage);
      const observed = await state(prodPage); await snap(prodPage, `production-1440x900-${mode}.png`);
      const rows = observed.table?.rows || [];
      const types = rows.map(r => r.cells[3]);
      const numbers = rows.map(r => Number(r.cells[0]));
      const sortedChronological = rows.every((r, i) => i === 0 || Number(r.cells[5]) >= Number(rows[i - 1].cells[5]));
      const numbering = numbers.every((n, i) => n === i + 1);
      const typeOK = expected[mode] ? types.every(t => t === expected[mode]) : new Set(types).size >= 2;
      const signedMinima = mode !== "minima" || rows.every(r => Number(r.cells[4]) < 0);
      const markerOK = rows.every(r => r.marker === (r.cells[3] === "Минимум" ? "triangle-down" : "triangle-up"));
      const plotPreserved = before.plot && result.after.plot && before.plot.identity === result.after.plot.identity && before.plot.baseTraceCount === result.after.plot.baseTraceCount;
      check(`${mode} POST/pending-ready/no-output-reload`, result.response === 200 && result.body.settings.mode === mode && result.outputRequests === 0 && plotPreserved, { result, before: before.plot });
      check(`${mode} authoritative extrema rows`, rows.length > 0 && typeOK && signedMinima && numbering && sortedChronological && markerOK, { rows, types, numbering, sortedChronological, markerOK, plotOverlay: observed.plot?.overlay });
    }
  } catch (error) {
    report.errors.push(String(error && error.stack || error));
  } finally {
    if (prodPage && !prodPage.isClosed() && postStarted && original) {
      try {
        await prodPage.bringToFront(); activateChrome();
        if (!(await prodPage.getByTestId("settings-tab-peaks").getAttribute("aria-selected") === "true")) await prodPage.getByTestId("settings-tab-peaks").click();
        for (const [key, value] of Object.entries(original.settings)) { const field = prodPage.locator(`[data-peaks-setting='${key}']`); if (await field.count()) { await field.fill(value); await field.press("Tab"); } }
        await chooseMode(prodPage, original.settings.mode || "maxima");
        if (!(await prodPage.getByTestId("settings-apply").isDisabled())) { const restoreResponse = await prodPage.waitForResponse(r => /\/api\/peaks\/settings(?:\?|$)/.test(r.url()) && r.request().method() === "POST", { timeout: 60000 }); await prodPage.getByTestId("settings-apply").click(); await restoreResponse; await awaitReady(prodPage); }
        const final = await state(prodPage); restored = Object.entries(original.settings).filter(([key]) => key !== "mode").every(([key, value]) => final.settings[key] === value) && final.mode === original.mode;
        report.restoration = { status: restored ? "verified" : "failed", original: original.settings, final: final.settings, originalMode: original.mode, finalMode: final.mode };
        check("exact active pane settings restored through visible UI", restored, report.restoration);
      } catch (error) { report.restoration = { status: "failed", error: String(error) }; report.errors.push(`restoration: ${String(error)}`); }
    }
    for (const page of [protoPage, prodPage]) if (page && !page.isClosed()) { try { await page.close(); report.closed_tab_count++; } catch (error) { report.errors.push(`tab cleanup: ${String(error)}`); } }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    save();
    if (browser) await browser.close();
    console.log(JSON.stringify({ checks: report.checks.length, failed: report.checks.filter(x => x.status === "failed").length, errors: report.errors.length, cleanup: report.tab_cleanup_status, restored }, null, 2));
    if (report.errors.length || report.checks.some(x => x.status === "failed") || report.tab_cleanup_status !== "passed" || (postStarted && !restored)) process.exitCode = 1;
  }
})();
