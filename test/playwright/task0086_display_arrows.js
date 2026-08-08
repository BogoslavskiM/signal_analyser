"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { execFileSync } = require("child_process");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "99d4576c5d5eefbc608997a853804a67bbd10e06";
const artifacts = path.resolve("test/playwright/artifacts/TASK-0086");
const reportPath = path.join(artifacts, "display-arrows.json");

async function state(page) {
  return page.evaluate(async () => {
    const response = await fetch("./api/state-lite", {
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`state-lite HTTP ${response.status}`);
    const payload = await response.json();
    return {
      revision: payload.state_revision,
      active: payload.active_display_id,
      ids: (payload.displays || []).map((display) => display.id),
    };
  });
}

async function arrowState(page) {
  return page.evaluate(() => {
    const tabs = document.querySelector("[data-testid='display-tabs']");
    const left = document.querySelector("[data-testid='display-scroll-left']");
    const right = document.querySelector("[data-testid='display-scroll-right']");
    const hidden = (node) => node.hidden || getComputedStyle(node).display === "none";
    return {
      scroll: tabs.scrollLeft,
      max: Math.max(0, tabs.scrollWidth - tabs.clientWidth),
      clientWidth: tabs.clientWidth,
      leftHidden: hidden(left),
      rightHidden: hidden(right),
      count: document.querySelectorAll("[data-testid^='display-tab-']").length,
    };
  });
}

async function waitForDisplayMutation(page, action, expected, expectedArg) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/displays") && response.request().method() === "POST",
    { timeout: 15000 });
    await action();
    const response = await responsePromise;
    if (response.ok()) {
      await page.waitForFunction(expected, expectedArg, { timeout: 15000 });
      return response.status();
    }
    if (response.status() !== 409) throw new Error(`display mutation HTTP ${response.status()}`);
    await page.waitForTimeout(250);
  }
  throw new Error("display mutation remained stale after four retries");
}

async function createDisplay(page, priorIds) {
  await waitForDisplayMutation(
    page,
    () => page.getByTestId("add-display").click(),
    (count) => document.querySelectorAll("[data-testid^='display-tab-']").length > count,
    priorIds.length,
  );
  const current = await state(page);
  const created = current.ids.find((id) => !priorIds.includes(id));
  if (!created) throw new Error("created display id was not observable");
  return created;
}

async function mutateDisplayApi(page, payload) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await page.evaluate(async (operation) => {
      const snapshotResponse = await fetch("./api/state-lite", {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
      });
      const snapshot = await snapshotResponse.json();
      const response = await fetch("./api/displays", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ state_revision: snapshot.state_revision }, operation)),
      });
      return { status: response.status, ok: response.ok };
    }, payload);
    if (result.ok) return result.status;
    if (result.status !== 409) throw new Error(`display cleanup HTTP ${result.status}`);
  }
  throw new Error("display cleanup remained stale after five retries");
}

async function closeDisplay(page, id) {
  const before = await state(page);
  if (!before.ids.includes(id)) return;
  await mutateDisplayApi(page, { operation: "close", display_id: id });
}

async function selectDisplay(page, id) {
  const current = await state(page);
  if (current.active === id || !current.ids.includes(id)) return;
  await mutateDisplayApi(page, { operation: "select", display_id: id });
}

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const report = {
    id: "HND-TASK-0086-DISPLAY-ARROWS",
    target,
    revision,
    browser_channel: "chrome",
    headless: false,
    browser_visibility: "foreground",
    worker_count: 1,
    checks: [],
    console: [],
    network: [],
    screenshots: [],
    opened: 0,
    closed: 0,
  };
  const check = (name, pass, detail) => report.checks.push({ name, status: pass ? "passed" : "failed", detail });
  let browser;
  let page;
  let initial;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = browser.contexts()[0] || await browser.newContext();
    report.preexisting_pages = context.pages().map((item) => item.url());
    page = await context.newPage();
    report.opened += 1;
    page.on("console", (message) => {
      if (message.type() === "error") report.console.push({ text: message.text(), url: message.location().url });
    });
    page.on("response", (response) => {
      if (response.status() >= 400 || response.request().isNavigationRequest()) {
        report.network.push({ status: response.status(), method: response.request().method(), url: response.url() });
      }
    });
    await page.bringToFront();
    try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); } catch (_) {}
    await page.setViewportSize({ width: 920, height: 680 });
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByTestId("app-shell").waitFor({ state: "visible", timeout: 60000 });
    await page.getByTestId("add-display").waitFor({ state: "visible", timeout: 60000 });
    initial = await state(page);
    report.initial = initial;

    await page.evaluate(() => document.querySelector("[data-testid='display-tabs']").scrollTo({ left: 0, behavior: "auto" }));
    await page.waitForTimeout(100);
    const fitting = await arrowState(page);
    check("fitting tabs hide both arrows", fitting.max <= 1 && fitting.leftHidden && fitting.rightHidden, fitting);

    const created = [];
    while (created.length < 12) {
      const current = await state(page);
      const id = await createDisplay(page, current.ids);
      created.push(id);
      const geometry = await arrowState(page);
      if (geometry.max > geometry.clientWidth * 1.5) break;
    }
    report.created_display_ids = created.slice();

    await page.evaluate(() => document.querySelector("[data-testid='display-tabs']").scrollTo({ left: 0, behavior: "auto" }));
    await page.waitForFunction(() => {
      const tabs = document.querySelector("[data-testid='display-tabs']");
      const left = document.querySelector("[data-testid='display-scroll-left']");
      const right = document.querySelector("[data-testid='display-scroll-right']");
      return tabs.scrollLeft <= 1 && left.hidden && !right.hidden;
    }, null, { timeout: 10000 });
    const start = await arrowState(page);
    check("overflow start shows only right arrow", start.max > 1 && start.leftHidden && !start.rightHidden, start);
    await page.screenshot({ path: path.join(artifacts, "display-arrows-start.png") });
    report.screenshots.push("display-arrows-start.png");

    await page.getByTestId("display-scroll-right").click();
    await page.waitForFunction((prior) => document.querySelector("[data-testid='display-tabs']").scrollLeft > prior + 1, start.scroll, { timeout: 10000 });
    await page.waitForTimeout(350);
    const middle = await arrowState(page);
    check("right arrow advances and middle exposes both directions", middle.scroll > start.scroll && !middle.leftHidden && !middle.rightHidden, middle);
    await page.screenshot({ path: path.join(artifacts, "display-arrows-middle.png") });
    report.screenshots.push("display-arrows-middle.png");

    for (let index = 0; index < 12; index += 1) {
      const current = await arrowState(page);
      if (current.rightHidden) break;
      await page.getByTestId("display-scroll-right").click();
      await page.waitForTimeout(400);
    }
    const end = await arrowState(page);
    check("overflow end shows only left arrow", end.max > 1 && !end.leftHidden && end.rightHidden && end.scroll >= end.max - 1, end);
    await page.screenshot({ path: path.join(artifacts, "display-arrows-end.png") });
    report.screenshots.push("display-arrows-end.png");

    await page.getByTestId("display-scroll-left").click();
    await page.waitForFunction((prior) => document.querySelector("[data-testid='display-tabs']").scrollLeft < prior - 1, end.scroll, { timeout: 10000 });
    const backward = await arrowState(page);
    check("left arrow moves backward", backward.scroll < end.scroll, backward);
  } catch (error) {
    report.error = String(error && error.stack || error);
  } finally {
    if (page && !page.isClosed() && initial) {
      try {
        let current = await state(page);
        const extra = current.ids.filter((id) => !initial.ids.includes(id));
        report.cleanup_extra_before = extra.slice();
        for (const id of extra.reverse()) await closeDisplay(page, id);
        await selectDisplay(page, initial.active);
        current = await state(page);
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
        await page.getByTestId("add-display").waitFor({ state: "visible", timeout: 60000 });
        await page.evaluate(() => document.querySelector("[data-testid='display-tabs']").scrollTo({ left: 0, behavior: "auto" }));
        await page.waitForTimeout(100);
        const restoredArrows = await arrowState(page);
        report.restored = { state: current, arrows: restoredArrows };
        check(
          "cleanup restores original displays and fitting arrows",
          JSON.stringify(current.ids) === JSON.stringify(initial.ids) && current.active === initial.active && restoredArrows.leftHidden && restoredArrows.rightHidden,
          report.restored,
        );
      } catch (cleanupError) {
        report.cleanup_error = String(cleanupError && cleanupError.stack || cleanupError);
      }
    }
    if (page && !page.isClosed()) {
      await page.close();
      report.closed += 1;
    }
    report.tab_cleanup_status = report.opened === report.closed ? "passed" : "failed";
    report.summary = {
      planned: 6,
      passed: report.checks.filter((item) => item.status === "passed").length,
      failed: report.checks.filter((item) => item.status === "failed").length,
      not_run: 6 - report.checks.length,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    process.stdout.write(`${JSON.stringify(report.summary)}\n`);
  }
})();
