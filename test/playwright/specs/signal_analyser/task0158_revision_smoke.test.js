"use strict";

// Deliberately read-only deployment smoke.  It opens no create/delete control
// and does not change a signal, display or pane configuration.
const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifactDir = path.join(__dirname, "..", "..", "artifacts", "TASK-0158-revision-smoke");
const prototypeUrl = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/current/prototype/index.html";

function ensureArtifacts() { fs.mkdirSync(artifactDir, { recursive: true }); }
function writeReport(value) { ensureArtifacts(); fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(value, null, 2)); }
async function shot(page, name) { ensureArtifacts(); await page.screenshot({ path: path.join(artifactDir, name), fullPage: false, animations: "disabled" }); }

async function ready(page, config) {
  await waitForAppReady(page, config, { timeout: 60000 });
  const loader = page.locator(testIdSelector(config.app.loaderTestId));
  if (await loader.count()) await loader.waitFor({ state: "hidden", timeout: 60000 });
  await page.waitForFunction(function () {
    const shell = document.querySelector("[data-testid='app-shell']");
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, { timeout: 60000 });
}

async function openExistingSignalOperation(page, assert) {
  const row = page.locator("[data-signal-row]").first();
  await row.waitFor({ state: "visible", timeout: 30000 });
  const name = await row.getAttribute("data-signal-name");
  assert(name, "an existing signal row must expose a stable name");
  const action = row.locator("[data-signal-operation]");
  await action.waitFor({ state: "visible", timeout: 30000 });
  await action.click();
  const dialog = page.locator(testIdSelector("signal-operation-dialog"));
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  const source = dialog.locator(testIdSelector("signal-operation-source"));
  await source.waitFor({ state: "visible", timeout: 10000 });
  assert((await source.inputValue()).trim() === name, "operation dialog must retain the exact existing row as its source");
  const icon = dialog.locator("[data-value-select-trigger-icon]");
  await icon.waitFor({ state: "visible", timeout: 10000 });
  const geometry = await icon.evaluate(function (node) {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height, src: node.getAttribute("src"), alt: node.getAttribute("alt"), ariaHidden: node.getAttribute("aria-hidden") };
  });
  assert(geometry.width === 16 && geometry.height === 16, "closed operation trigger icon must render at 16×16");
  assert(geometry.alt === "" && geometry.ariaHidden === "true", "closed operation trigger icon must be decorative");
  const close = dialog.locator("[data-signal-operation-close], [data-signal-operation-cancel]").first();
  await close.click();
  await dialog.waitFor({ state: "hidden", timeout: 10000 });
  return { source: name, triggerIcon: geometry };
}

async function task0158RevisionSmoke({ appUrl, assert, config, page, step }) {
  const report = {
    target: appUrl,
    expectedRevision: process.env.E2E_EXPECTED_REVISION,
    startedAt: new Date().toISOString(),
    checks: [],
    openedTabs: 0,
    closedTabs: 0,
  };
  let prototype = null;
  try {
    await step("pinned local prototype design-contract smoke", async function () {
      prototype = await page.context().newPage(); report.openedTabs += 1;
      await prototype.goto(prototypeUrl, { waitUntil: "domcontentloaded" });
      await prototype.bringToFront();
      await ready(prototype, config);
      const evidence = await openExistingSignalOperation(prototype, assert);
      await shot(prototype, "prototype-operation-trigger.png");
      report.checks.push({ name: "prototype shell/operation trigger", result: "passed", evidence: evidence });
    });
    await step("PROD exact revision shell loader and read-only operation trigger", async function () {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      await page.bringToFront();
      await ready(page, config);
      const status = await page.evaluate(async function () {
        const response = await fetch("./api/status", { cache: "no-store" });
        return { status: response.status, body: await response.json() };
      });
      assert(status.status === 200 && status.body && status.body.ready === true, `PROD status must be ready: ${JSON.stringify(status)}`);
      assert(status.body.runtime_revision === process.env.E2E_EXPECTED_REVISION, `wrong deployed revision: ${JSON.stringify(status.body)}`);
      const evidence = await openExistingSignalOperation(page, assert);
      await shot(page, "prod-operation-trigger.png");
      report.checks.push({ name: "PROD app-shell/global-loader/exact revision/operation trigger", result: "passed", status: status, evidence: evidence });
    });
  } catch (error) {
    report.error = String(error && error.stack || error);
    throw error;
  } finally {
    if (prototype && !prototype.isClosed()) { await prototype.close(); report.closedTabs += 1; }
    report.finishedAt = new Date().toISOString();
    writeReport(report);
  }
}

task0158RevisionSmoke.scenarioFlags = ["TASK-0158-REVISION-SMOKE"];
module.exports = task0158RevisionSmoke;
