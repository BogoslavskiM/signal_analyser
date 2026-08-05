"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");
const { chromium } = require("../playwright/node_modules/playwright-core");

const workspace = path.resolve(__dirname, "../..");
const behaviorFile = path.join(__dirname, "public/js/app.behavior.test.js");
const fixtureContext = { require, module:{exports:{}}, exports:{}, __dirname:path.dirname(behaviorFile), __filename:behaviorFile, console, process, Buffer, URL, setTimeout, clearTimeout, Promise };
vm.createContext(fixtureContext);
vm.runInContext(fs.readFileSync(behaviorFile, "utf8") + "\n;globalThis.__browserState=snapshot(0);", fixtureContext, { filename:behaviorFile });
const state = JSON.stringify(fixtureContext.__browserState);
const requests = [];
let assertions = 0;

function assert(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".js")) return "application/javascript";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function serve(request, response) {
  const url = new URL(request.url, "http://127.0.0.1");
  requests.push({ method:request.method, path:url.pathname });
  if (url.pathname === "/api/state") {
    response.writeHead(200, { "content-type":"application/json" });
    response.end(state);
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    response.writeHead(503, { "content-type":"application/json" });
    response.end('{"error":{"message":"deterministic browser fixture"}}');
    return;
  }
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const file = path.resolve(workspace, "public", relative);
  const publicRoot = path.join(workspace, "public");
  if (file !== path.join(publicRoot, "index.html") && !file.startsWith(publicRoot + path.sep)) {
    response.writeHead(403);
    response.end();
    return;
  }
  fs.readFile(file, function(error, body) {
    if (error) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { "content-type":contentType(file) });
    response.end(body);
  });
}

async function stateOf(page) {
  return page.evaluate(function() {
    const trigger = document.querySelector("[data-signal-info]");
    const row = trigger.closest(".signal-row");
    return {
      expanded:trigger.getAttribute("aria-expanded"),
      label:trigger.getAttribute("aria-label"),
      rowState:row.dataset.infoExpanded || null,
      rowHeight:row.getBoundingClientRect().height,
      focused:document.activeElement === trigger,
      clickCount:window.__inspectorClickCount,
      keys:window.__inspectorKeys.slice(),
    };
  });
}

async function cycle(browser, kind) {
  const page = await browser.newPage({ viewport:{width:1280,height:720} });
  const pageErrors = [];
  page.on("pageerror", function(error) { pageErrors.push(error.message); });
  await page.goto("http://127.0.0.1:8134/", { waitUntil:"domcontentloaded" });
  const trigger = page.locator("[data-signal-info]").first();
  await trigger.waitFor();
  await page.evaluate(function() {
    window.__inspectorClickCount = 0;
    window.__inspectorKeys = [];
    document.addEventListener("click", function(event) { if (event.target.closest && event.target.closest("[data-signal-info]")) window.__inspectorClickCount += 1; }, true);
    document.addEventListener("keydown", function(event) { if (event.target.closest && event.target.closest("[data-signal-info]")) window.__inspectorKeys.push({key:event.key,defaultPrevented:event.defaultPrevented}); }, false);
  });
  const requestStart = requests.length;
  const before = await stateOf(page);
  if (kind === "pointer") await trigger.click();
  else { await trigger.focus(); await page.keyboard.press(kind); }
  await page.waitForTimeout(160);
  const open = await stateOf(page);
  if (kind === "pointer") await trigger.click(); else await page.keyboard.press(kind);
  await page.waitForTimeout(160);
  const closed = await stateOf(page);
  const mutations = requests.slice(requestStart).filter(function(request) { return request.method !== "GET"; });

  assert(before.expanded === "false" && Math.abs(before.rowHeight - 41.78125) < .01, kind + " must start collapsed");
  assert(open.expanded === "true" && open.rowState === "true" && open.rowHeight > 150, kind + " must expand exactly once");
  assert(open.focused && open.label.indexOf("Скрыть информацию") === 0, kind + " must retain focus and expanded label");
  assert(open.clickCount === 1, kind + " must dispatch one click for one activation");
  assert(closed.expanded === "false" && closed.rowState === "false" && Math.abs(closed.rowHeight - before.rowHeight) < .01, kind + " repeat must restore collapsed geometry");
  assert(closed.focused && closed.label.indexOf("Показать информацию") === 0, kind + " repeat must retain focus and collapsed label");
  assert(closed.clickCount === 2, kind + " open-close cycle must contain exactly two clicks");
  assert(mutations.length === 0 && pageErrors.length === 0, kind + " must remain frontend-local without page errors");
  if (kind !== "pointer") assert(closed.keys.length === 2 && closed.keys.every(function(event) { return event.defaultPrevented === false; }), kind + " native keydown must not be cancelled");
  await page.close();
}

async function unrelatedShortcuts(browser) {
  const page = await browser.newPage({ viewport:{width:1280,height:720} });
  await page.goto("http://127.0.0.1:8134/", { waitUntil:"domcontentloaded" });
  const trigger = page.locator("[data-signal-info]").first();
  await trigger.focus();
  const requestStart = requests.length;
  await page.keyboard.press("ArrowRight");
  const arrow = await page.evaluate(function() { const trigger = document.querySelector("[data-signal-info]"); return {expanded:trigger.getAttribute("aria-expanded"),focused:document.activeElement === trigger}; });
  assert(arrow.expanded === "false" && arrow.focused, "unrelated Info key must not toggle or move focus");
  await page.locator(".signal-row").first().focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(160);
  const mutations = requests.slice(requestStart).filter(function(request) { return request.method !== "GET"; });
  assert(mutations.length === 1 && mutations[0].path === "/api/view", "Enter on the row itself must retain its existing selection shortcut");
  await page.close();
}

(async function run() {
  const server = http.createServer(serve);
  let browser;
  await new Promise(function(resolve) { server.listen(8134, "127.0.0.1", resolve); });
  try {
    const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    browser = await chromium.launch({ headless:true, executablePath:chromePath, args:["--disable-gpu"] });
    await cycle(browser, "pointer");
    await cycle(browser, "Enter");
    await cycle(browser, "Space");
    await unrelatedShortcuts(browser);
  } finally {
    if (browser) await browser.close();
    await new Promise(function(resolve) { server.close(resolve); });
  }
  console.log("inspector keyboard browser: 4 scenarios passed; assertions=" + assertions);
})().catch(function(error) { console.error(error && error.stack || error); process.exit(1); });
