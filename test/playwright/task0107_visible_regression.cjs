"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "../..");
const out = path.join(__dirname, "artifacts", "HND-0683");
const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "7ac9c2f08ba48a16de6d0c944c4d66161b425631";
const prototype = "file://" + path.join(root, "architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html");
const tracked = new Set();
const report = { id: "HND-0683", target, expected_revision: expectedRevision, browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1, checks: [], screenshots: [], opened_tab_count: 0, closed_tab_count: 0, tab_cleanup_status: "pending", started_at: new Date().toISOString() };
function check(name, ok, evidence) { report.checks.push({ name, status: ok ? "passed" : "failed", evidence }); return ok; }
async function tab(browser, url, viewport) { const p = await browser.newPage({ viewport, deviceScaleFactor: 1 }); tracked.add(p); report.opened_tab_count++; await p.bringToFront(); await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }); return p; }
async function screenshot(p, name) { const file = path.join(out, name); await p.screenshot({ path: file, animations: "disabled" }); report.screenshots.push(file); }
async function paint(p) {
  const selectors = { display:".display-tab-shell.is-selected", settings:".settings-tabs button[aria-selected='true']", inspector:".inspector-tabs button[aria-selected='true']" };
  const evidence = { accent:"#1b84b8", families:{}, runs:{} };
  for (const [key, selector] of Object.entries(selectors)) {
    const locator = p.locator(selector); const rect = await locator.boundingBox();
    if (!rect) { evidence.families[key] = null; evidence.runs[key] = 0; continue; }
    const computed = await locator.evaluate(node => { const s=getComputedStyle(node,"::after"); return { after:s.backgroundColor, afterHeight:s.height, afterBottom:s.bottom, zIndex:s.zIndex }; });
    const buffer = await p.screenshot({ clip:{ x:Math.floor(rect.x + rect.width / 2), y:Math.floor(rect.y), width:1, height:Math.ceil(rect.height) }, animations:"disabled" });
    const conversion = spawnSync("magick", ["-", "txt:-"], { input:buffer, encoding:"utf8" });
    if (conversion.status !== 0) throw new Error(conversion.stderr || "ImageMagick pixel sampling failed");
    const pixels = conversion.stdout.split("\n").map(line => { const m=line.match(/^0,(\d+):.*#([0-9A-Fa-f]{6})/); return m ? {y:Number(m[1]), hex:"#"+m[2].toLowerCase()} : null; }).filter(Boolean);
    let run=0,max=0, previous=-2; const rows=[];
    for (const pixel of pixels) { if(pixel.hex==="#1b84b8") { run=pixel.y===previous+1 ? run+1 : 1; max=Math.max(max,run); rows.push(pixel.y); } previous=pixel.y; }
    evidence.families[key] = { rect:{width:rect.width,height:rect.height}, computed, rasterAccentRows:rows, longestRasterAccentRunPx:max };
    evidence.runs[key] = max;
  }
  return evidence;
}
async function selectV25(p) {
  await p.locator("[data-testid='settings-tab-peaks']").click();
  await p.locator("[data-testid='inspector-tab-measurements']").click();
  await p.waitForFunction(() => !!document.querySelector("[data-testid='measurement-table']"));
}
async function tableEvidence(p) { return p.evaluate(() => {
  const table = document.querySelector("[data-testid='measurement-table']"), owner = document.querySelector("[data-testid='measurement-table-scroll']");
  const main = document.querySelector("#signal-table .color-swatch"), measured = table && table.querySelector(".color-swatch");
  const v = (n) => { const r=n&&n.getBoundingClientRect(), s=n&&getComputedStyle(n); return n && { width:r.width, height:r.height, radius:s.borderRadius, background:s.backgroundColor, border:s.borderWidth }; };
  return { table: table && { width:table.getBoundingClientRect().width, minWidth:getComputedStyle(table).minWidth }, owner: owner && { clientWidth:owner.clientWidth, scrollWidth:owner.scrollWidth }, main:v(main), measurement:v(measured) };
 }); }
async function production(p) {
  await p.waitForSelector("[data-testid='app-shell']", { timeout: 45000 });
  const technical = await p.locator("body").innerText();
  if (/техническ|maintenance|temporarily unavailable/i.test(technical)) { await screenshot(p,"production-maintenance.png"); throw new Error("technical maintenance page"); }
  const status = await p.evaluate(async () => { const r=await fetch("api/status", {cache:"no-store"}); return {status:r.status, json:await r.json()}; });
  if (!check("production availability and exact revision", status.status === 200 && status.json.ok === true && status.json.runtime_revision === expectedRevision, status)) throw new Error("production availability or revision mismatch");
  await selectV25(p);
  const stylesBefore = await paint(p);
  check("three selected indicators have uninterrupted computed 3px accent", Object.values(stylesBefore.runs).every(v => v === 3), stylesBefore);
  const geometry = await tableEvidence(p);
  check("Measurements uses 944px local table and shared 16px square swatch", geometry.table && geometry.table.minWidth === "944px" && geometry.main && geometry.measurement && ["width","height","radius","background","border"].every(k => geometry.main[k] === geometry.measurement[k]) && geometry.main.width === 16 && geometry.main.height === 16 && geometry.main.radius === "2px", geometry);
  await screenshot(p,"production-tabs-measurements-1024x768.png");
  await p.locator("[data-testid='settings-tab-peaks']").click();
  const action = p.locator("[data-testid='extrema-values']"); await action.waitFor({state:"visible"});
  let posts = 0; const requestUrls=[]; const listener = req => { if (req.method() === "POST" && /\/api\/peaks\/active(?:\?|$)/.test(req.url())) { posts++; requestUrls.push(req.url()); } };
  p.on("request", listener);
  try {
    await action.click();
    await p.waitForFunction(() => document.querySelector("[data-testid='inspector-tab-peaks']")?.getAttribute("aria-selected") === "true");
    const loading = await p.locator("[data-testid='peaks-loading-state']").isVisible().catch(() => false);
    if (loading) {
      await p.waitForFunction(() => !document.querySelector("[data-testid='peaks-loading-state']") || document.querySelector("[data-testid='peaks-loading-state']").hidden, null, { timeout: 45000 }).catch(() => {});
      check("missing/stale Values starts exactly one POST", posts === 1, { posts, requestUrls, loading });
    } else check("ready Values starts zero POST", posts === 0, { posts, requestUrls, loading });
    const afterFirst = posts; await action.click();
    check("repeat Values does not add calculation POST", posts === afterFirst, { first:afterFirst, final:posts, requestUrls });
  } finally { p.off("request", listener); }
  await screenshot(p,"production-values-1024x768.png");
}
(async () => {
  fs.mkdirSync(out, { recursive:true });
  const browser = await chromium.launch({ channel:"chrome", headless:false, args:["--allow-file-access-from-files"] });
  try {
    const proto = await tab(browser, prototype, {width:1024,height:768});
    await proto.waitForFunction(() => !!window.__TASK0080_DESIGN__); await proto.locator("[data-settings-page='peaks']").click(); await proto.locator("[data-inspector-page='measurements']").click();
    check("prototype v25 walkthrough state", Object.values((await paint(proto)).runs).every(v => v === 3), await paint(proto));
    await screenshot(proto,"prototype-tabs-measurements-1024x768.png");
    const prod = await tab(browser, target, {width:1024,height:768}); await production(prod);
  } catch (error) { report.error = { message:error.message, stack:error.stack }; }
  finally { for (const p of tracked) { try { if (!p.isClosed()) { await p.close(); report.closed_tab_count++; } } catch (e) { report.cleanup_error = e.message; } } report.tab_cleanup_status = report.closed_tab_count === report.opened_tab_count ? "passed" : "failed"; report.finished_at=new Date().toISOString(); fs.writeFileSync(path.join(out,"report.json"), JSON.stringify(report,null,2)+"\n"); await browser.close(); }
  process.exitCode = report.error || report.tab_cleanup_status !== "passed" ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode=1; });
