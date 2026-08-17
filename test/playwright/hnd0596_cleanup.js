"use strict";

const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const expectedRevision = "70e95f532a7f2e969fa31ba25e6082c69596a571";

function activateChrome() {
  try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); }
  catch (_) { /* evidence remains the visible foreground launch */ }
}

(async () => {
  let browser, context, page;
  const report = { id:"HND-0596-CLEANUP", opened_tab_count:0, closed_tab_count:0, preexisting_page_urls:[], cleanup_status:"failed" };
  try {
    browser = await chromium.launch({ channel:"chrome", headless:false });
    context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_page_urls = context.pages().map(item => item.url());
    page = await context.newPage(); report.opened_tab_count += 1;
    await page.setViewportSize({ width:1024, height:768 });
    await page.bringToFront(); activateChrome();
    const root = await page.goto(target, { waitUntil:"domcontentloaded", timeout:120000 });
    await page.getByTestId("app-shell").waitFor({ state:"visible", timeout:180000 });
    const gate = await page.evaluate(async () => { const response=await fetch("./api/status",{cache:"no-store"}); return {status:response.status,body:await response.json()}; });
    if (!root || root.status() !== 200 || gate.status !== 200 || gate.body.ready !== true || gate.body.runtime_revision !== expectedRevision) throw new Error(`revision gate failed: ${JSON.stringify({root:root&&root.status(),gate})}`);
    report.revision_gate = gate.body;
    const before = await page.evaluate(async () => (await fetch("./api/state-lite",{cache:"no-store"})).json());
    const entry = before.layouts.find(item => item.display_id === before.active_display_id);
    const pane = entry.layout.panes.find(item => item.id === entry.layout.active_pane_id);
    report.before = { revision:before.state_revision, rows:entry.layout.rows, columns:entry.layout.columns, pane_id:pane.id, bindings:pane.signal_bindings.slice() };
    if (entry.layout.rows !== 1 || entry.layout.columns !== 1 || pane.id !== "pane-1" || JSON.stringify(pane.signal_bindings) !== JSON.stringify(["Гармонический сигнал"])) throw new Error(`unexpected cleanup target: ${JSON.stringify(report.before)}`);
    await page.getByTestId("inspector-tab-signals").click();
    const checkbox = page.locator("input[data-visible-signal='Гармонический сигнал']");
    if (!(await checkbox.isChecked())) throw new Error("target signal checkbox already unchecked");
    const wait = page.waitForResponse(response => /\/api\/layouts(?:\?|$)/.test(response.url()) && response.request().method() === "POST", { timeout:60000 });
    await checkbox.uncheck();
    const response = await wait;
    if (response.status() !== 200) throw new Error(`cleanup layout response ${response.status()}`);
    await page.getByTestId("pane-empty-pane-1").waitFor({ state:"visible", timeout:60000 });
    const after = await page.evaluate(async () => {
      const state=await (await fetch("./api/state-lite",{cache:"no-store"})).json();
      const entry=state.layouts.find(item=>item.display_id===state.active_display_id);
      const pane=entry.layout.panes.find(item=>item.id===entry.layout.active_pane_id);
      return { revision:state.state_revision, rows:entry.layout.rows, columns:entry.layout.columns, pane_id:pane.id, bindings:pane.signal_bindings.slice(), emptyCopy:document.querySelector("[data-testid='pane-empty-pane-1']")?.textContent.trim(), plotHosts:document.querySelectorAll("[data-pane-host],.plot-chart").length };
    });
    report.after = after;
    if (after.rows !== 1 || after.columns !== 1 || after.pane_id !== "pane-1" || after.bindings.length !== 0 || after.emptyCopy !== "Выберете сигнал для отображения" || after.plotHosts !== 0) throw new Error(`cleanup verification failed: ${JSON.stringify(after)}`);
    report.cleanup_status = "verified";
  } catch (error) {
    report.error = String(error && error.stack || error);
  } finally {
    if (page && !page.isClosed()) { try { await page.close(); report.closed_tab_count += 1; } catch (error) { report.tab_cleanup_error = String(error); } }
    report.tab_cleanup_status = report.opened_tab_count === report.closed_tab_count ? "passed" : "failed";
    if (browser) await browser.close();
    process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
    if (report.error || report.cleanup_status !== "verified" || report.tab_cleanup_status !== "passed") process.exitCode = 1;
  }
})();
