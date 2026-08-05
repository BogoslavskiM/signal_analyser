"use strict";

// HND-0235: standalone foreground-only profiler for the exact production target.
// It never starts an application runtime and writes raw evidence outside the repo.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const REVISION = "cac83c5f445352a50f04aeeeb269b47007766d79";
const OUT = path.join("/private/tmp", "HND-0235-e2e-profile-" + new Date().toISOString().replace(/[:.]/g, "-"));
const RUNS = Number(process.env.PROFILE_RUNS || 5);
const TIMEOUT = 60000;

function q(id) { return `[data-testid=${JSON.stringify(id)}]`; }
function bytes(value) { return Buffer.byteLength(value || "", "utf8"); }
function percentile(values, ratio) {
  const ordered = values.filter(Number.isFinite).sort((a, b) => a - b);
  return ordered.length ? ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * ratio) - 1)] : null;
}
function selectedMetrics(result) {
  const wanted = new Set(["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration",
    "LayoutCount", "RecalcStyleCount", "Nodes", "Documents", "Frames", "JSEventListeners", "JSHeapUsedSize"]);
  return Object.fromEntries(result.metrics.filter(metric => wanted.has(metric.name)).map(metric => [metric.name, metric.value]));
}
function metricDelta(before, after) {
  return Object.fromEntries(Object.keys(after).map(key => [key, after[key] - (before[key] || 0)]));
}
function stateSignature(snapshot, plot, settingChecked, signalChecked) {
  return {
    active_display_id: snapshot.active_display_id,
    display_ids: (snapshot.displays || []).map(item => item.id),
    signal_names: (snapshot.signals || []).map(item => item.name),
    plot_type: plot,
    display_show_legend_setting: settingChecked,
    first_signal_checked: signalChecked,
  };
}

async function settled(page) {
  await page.locator(q("app-shell")).waitFor({ state: "visible", timeout: TIMEOUT });
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-testid="app-loading"]');
    const host = document.querySelector('[data-testid="active-plot-host"]');
    const hidden = !loader || getComputedStyle(loader).display === "none" ||
      getComputedStyle(loader).visibility === "hidden" || getComputedStyle(loader).opacity === "0";
    return hidden && host && host.getAttribute("data-plot-ready") === "true";
  }, undefined, { timeout: TIMEOUT });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function state(page) {
  return page.evaluate(async () => {
    const response = await fetch("api/state", { cache: "no-store" });
    if (!response.ok) throw new Error(`/api/state HTTP ${response.status}`);
    return response.json();
  });
}

async function apiAction(page, endpoint, invoke) {
  const started = performance.now();
  const pending = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname.endsWith(endpoint), { timeout: TIMEOUT });
  await invoke();
  const response = await pending;
  const responseAt = performance.now();
  const body = await response.body().catch(() => Buffer.alloc(0));
  await settled(page);
  return {
    endpoint,
    status: response.status(),
    api_wait_ms: Math.round(responseAt - started),
    settle_ms: Math.round(performance.now() - responseAt),
    request_bytes: bytes(response.request().postData()),
    response_bytes: body.length,
    resource_timing: response.request().timing(),
  };
}

async function selectWithApi(page, locator, value, endpoint) {
  if (await locator.inputValue() === value) return null;
  const result = await apiAction(page, endpoint, () => locator.selectOption(value));
  await locator.evaluate((node, wanted) => new Promise((resolve, reject) => {
    const started = performance.now();
    function check() {
      if (node.value === wanted) return resolve();
      if (performance.now() - started > 60000) return reject(new Error(`select did not settle to ${wanted}`));
      requestAnimationFrame(check);
    }
    check();
  }), value);
  return result;
}

async function setControlledCheckbox(page, locator, checked, endpoint) {
  if (await locator.isChecked() === checked) return null;
  const result = await apiAction(page, endpoint, () => locator.click());
  await page.waitForFunction(args => {
    const node = document.querySelector(args.selector);
    return node && node.checked === args.checked;
  }, { selector: await locator.evaluate(node => `[data-testid=${JSON.stringify(node.dataset.testid)}]`), checked }, { timeout: TIMEOUT });
  return result;
}

async function installPlotlyProbe(page) {
  await page.evaluate(() => {
    const probe = window.__hnd0235;
    if (!window.Plotly || probe.plotlyInstalled) return;
    probe.plotlyInstalled = true;
    ["newPlot", "react", "restyle", "relayout", "update", "purge"].forEach(name => {
      const original = window.Plotly[name];
      if (typeof original !== "function") return;
      window.Plotly[name] = function () {
        const started = performance.now();
        const result = original.apply(this, arguments);
        const record = () => probe.plotlyCalls.push({ name, duration_ms: performance.now() - started });
        if (result && typeof result.finally === "function") return result.finally(record);
        record();
        return result;
      };
    });
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const evidence = {
    handoff: "HND-0235", target: TARGET, expected_revision: REVISION,
    browser_channel: "chrome", headless: false, browser_visibility: "foreground", worker_count: 1,
    viewport: { width: 1440, height: 900 }, planned: 5 * RUNS, runs_per_scenario: RUNS,
    actions: [], network: [], errors: [], screenshots: [], restoration: null,
  };
  let browser;
  let page;
  let cdp;
  let original;
  let originalSignature;
  let restoreAll;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = await browser.newContext({ viewport: evidence.viewport, deviceScaleFactor: 1 });
    page = await context.newPage();
    cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const requestStarts = new Map();
    await page.addInitScript(() => {
      window.__hnd0235 = { longTasks: [], mutations: 0, plotlyCalls: [], plotlyInstalled: false };
      try {
        new PerformanceObserver(list => list.getEntries().forEach(entry => window.__hnd0235.longTasks.push({
          start_ms: entry.startTime, duration_ms: entry.duration, name: entry.name,
        }))).observe({ type: "longtask", buffered: true });
      } catch (_) {}
      new MutationObserver(list => { window.__hnd0235.mutations += list.length; })
        .observe(document, { subtree: true, childList: true, attributes: true });
    });
    page.on("request", request => requestStarts.set(request, performance.now()));
    page.on("response", async response => {
      const pathname = new URL(response.url()).pathname;
      if (!/\/api\//.test(pathname)) return;
      const body = await response.body().catch(() => Buffer.alloc(0));
      evidence.network.push({
        pathname, method: response.request().method(), status: response.status(),
        elapsed_ms: Math.round(performance.now() - (requestStarts.get(response.request()) || performance.now())),
        request_bytes: bytes(response.request().postData()), response_bytes: body.length,
        resource_timing: response.request().timing(),
      });
    });
    page.on("pageerror", error => evidence.errors.push({ type: "pageerror", message: error.message }));
    page.on("console", message => {
      if (message.type() === "error") evidence.errors.push({ type: "console", message: message.text() });
    });

    await page.bringToFront();
    evidence.navigation_attempts = [];
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const started = performance.now();
      try {
        await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
        evidence.navigation_attempts.push({ attempt, elapsed_ms: Math.round(performance.now() - started), outcome: "domcontentloaded" });
        break;
      } catch (error) {
        evidence.navigation_attempts.push({ attempt, elapsed_ms: Math.round(performance.now() - started), outcome: String(error.message || error) });
        if (attempt === 2) throw error;
      }
    }
    await page.bringToFront();
    await settled(page);
    const status = await page.evaluate(async expected => {
      const response = await fetch(`api/status?e2e_profile=${Date.now().toString(36)}`, { cache: "no-store" });
      return { status: response.status, cache_control: response.headers.get("cache-control"), body: await response.json(), expected };
    }, REVISION);
    evidence.status = status;
    if (status.status !== 200 || status.body.runtime_revision !== REVISION) {
      throw new Error(`requested runtime revision unavailable: ${JSON.stringify(status)}`);
    }

    original = await state(page);
    const plot = page.locator(q("plot-type-select"));
    const originalPlot = await plot.inputValue();
    await installPlotlyProbe(page);
    const setting = page.locator(q("setting-display-show_legend"));
    await setting.waitFor({ state: "visible", timeout: TIMEOUT });
    const originalSettingChecked = await setting.isChecked();
    const checkbox = page.locator('[data-testid^="signal-checkbox-"]').first();
    if (!await checkbox.count()) throw new Error("no stable signal checkbox is available for profiling");
    if (process.env.HND0235_RESTORE_FIRST_SIGNAL === "true" && !await checkbox.isChecked()) {
      await setControlledCheckbox(page, checkbox, true, "/api/layouts");
    }
    const originalChecked = await checkbox.isChecked();
    originalSignature = stateSignature(original, originalPlot, originalSettingChecked, originalChecked);
    evidence.initial_state_revision = original.state_revision;
    evidence.initial_signature = originalSignature;

    const restoreSetting = async () => {
      await setControlledCheckbox(page, setting, originalSettingChecked, "/api/settings");
    };
    const closeExtraDisplays = async () => {
      let current = await state(page);
      while ((current.displays || []).length > (original.displays || []).length) {
        const newest = current.displays[current.displays.length - 1];
        const close = page.locator(q(`close-display-${newest.id}`));
        if (!await close.count()) throw new Error(`missing close-display selector for ${newest.id}`);
        await apiAction(page, "/api/displays", () => close.click());
        current = await state(page);
      }
    };
    const scenarios = [
      {
        name: "settings_edit",
        run: () => setControlledCheckbox(page, setting, !originalSettingChecked, "/api/settings"),
        cleanup: restoreSetting,
      },
      {
        name: "plot_type_change",
        run: () => selectWithApi(page, plot, originalPlot === "spectrum" ? "time" : "spectrum", "/api/layouts"),
        cleanup: () => selectWithApi(page, plot, originalPlot, "/api/layouts"),
      },
      {
        name: "active_pane_layout_change",
        run: async () => {
          const add = page.locator(q("add-display"));
          if (!await add.count()) throw new Error("missing data-testid=add-display");
          return apiAction(page, "/api/displays", () => add.click());
        },
        cleanup: closeExtraDisplays,
      },
      {
        name: "signal_checkbox_binding",
        run: () => setControlledCheckbox(page, checkbox, !originalChecked, "/api/layouts"),
        cleanup: async () => {
          await setControlledCheckbox(page, checkbox, originalChecked, "/api/layouts");
        },
      },
      {
        name: "main_add_flow_open",
        run: async () => {
          await page.locator(q("signals-add-action")).click();
          await page.locator(q("signals-add-menu")).waitFor({ state: "visible", timeout: TIMEOUT });
          return null;
        },
        cleanup: async () => {
          const menu = page.locator(q("signals-add-menu"));
          if (await menu.isVisible().catch(() => false)) {
            await page.locator(q("signals-add-action")).click();
            await menu.waitFor({ state: "hidden", timeout: TIMEOUT });
          }
        },
      },
    ];
    restoreAll = async () => {
      await closeExtraDisplays();
      await restoreSetting();
      await setControlledCheckbox(page, checkbox, originalChecked, "/api/layouts");
      await selectWithApi(page, plot, originalPlot, "/api/layouts");
    };

    for (const scenario of scenarios) {
      const samples = [];
      for (let index = 0; index < RUNS; index += 1) {
        await page.bringToFront();
        await installPlotlyProbe(page);
        const before = await page.evaluate(() => ({
          perf: performance.now(), longTaskIndex: window.__hnd0235.longTasks.length,
          mutationCount: window.__hnd0235.mutations, plotlyIndex: window.__hnd0235.plotlyCalls.length,
          domNodes: document.getElementsByTagName("*").length,
        }));
        const cdpBefore = selectedMetrics(await cdp.send("Performance.getMetrics"));
        const networkIndex = evidence.network.length;
        const started = performance.now();
        let api = null;
        let failure = null;
        try { api = await scenario.run(); }
        catch (error) { failure = error; }
        const interactionMs = Math.round(performance.now() - started);
        const cdpAfter = selectedMetrics(await cdp.send("Performance.getMetrics"));
        const after = await page.evaluate(beforeMark => ({
          longTasks: window.__hnd0235.longTasks.slice(beforeMark.longTaskIndex),
          mutations: window.__hnd0235.mutations - beforeMark.mutationCount,
          plotlyCalls: window.__hnd0235.plotlyCalls.slice(beforeMark.plotlyIndex),
          domNodes: document.getElementsByTagName("*").length,
          resources: performance.getEntriesByType("resource").filter(entry => entry.startTime >= beforeMark.perf)
            .map(entry => ({ name: entry.name, duration_ms: entry.duration, transfer_size: entry.transferSize, initiator_type: entry.initiatorType })),
        }), before);
        const sample = {
          index: index + 1, interaction_ms: interactionMs, api,
          long_tasks: after.longTasks,
          long_task_ms: Math.round(after.longTasks.reduce((sum, item) => sum + item.duration_ms, 0)),
          mutations: after.mutations, dom_nodes_before: before.domNodes, dom_nodes_after: after.domNodes,
          plotly_calls: after.plotlyCalls, resource_entries: after.resources,
          cdp_metrics_delta: metricDelta(cdpBefore, cdpAfter),
          network: evidence.network.slice(networkIndex),
          error: failure ? String(failure.message || failure) : null,
        };
        samples.push(sample);
        if (index === RUNS - 1) {
          const screenshot = path.join(OUT, `${scenario.name}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
          evidence.screenshots.push({ scenario: scenario.name, path: screenshot, viewport: evidence.viewport, sample: index + 1 });
        }
        try { await scenario.cleanup(); }
        catch (error) { sample.cleanup_error = String(error.message || error); }
      }
      const passed = samples.filter(sample => !sample.error);
      evidence.actions.push({
        name: scenario.name, planned: RUNS, completed: passed.length,
        p50_ms: percentile(passed.map(sample => sample.interaction_ms), 0.5),
        p95_ms: percentile(passed.map(sample => sample.interaction_ms), 0.95),
        samples,
      });
    }

    await restoreAll();
    const finalSettingChecked = await setting.isChecked();
    const finalChecked = await checkbox.isChecked();
    const finalState = await state(page);
    const finalSignature = stateSignature(finalState, await plot.inputValue(), finalSettingChecked, finalChecked);
    evidence.final_state_revision = finalState.state_revision;
    evidence.final_signature = finalSignature;
    evidence.restoration = { passed: JSON.stringify(finalSignature) === JSON.stringify(originalSignature), original: originalSignature, final: finalSignature };
    evidence.completed = evidence.actions.reduce((sum, action) => sum + action.completed, 0);
    evidence.failed = evidence.actions.filter(action => action.completed < action.planned).length;
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({
      ok: evidence.completed === evidence.planned && evidence.restoration.passed,
      evidence_path: OUT, status: evidence.status, completed: evidence.completed, planned: evidence.planned,
      restoration: evidence.restoration.passed,
      actions: evidence.actions.map(action => ({ name: action.name, completed: action.completed, p50_ms: action.p50_ms, p95_ms: action.p95_ms })),
    }, null, 2));
    if (evidence.completed !== evidence.planned || !evidence.restoration.passed) process.exitCode = 1;
  } catch (error) {
    evidence.failure = String(error && error.stack || error);
    if (restoreAll) {
      try { await restoreAll(); evidence.catch_restoration = "completed"; }
      catch (restoreError) { evidence.catch_restoration = String(restoreError.message || restoreError); }
    }
    if (page) {
      evidence.failure_page = { url: page.url(), title: await page.title().catch(() => "") };
      const screenshot = path.join(OUT, "failure.png");
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
      evidence.screenshots.push({ scenario: "failure", path: screenshot, viewport: evidence.viewport });
    }
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(evidence, null, 2));
    fs.writeFileSync(path.join(OUT, "failure.txt"), evidence.failure);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
