"use strict";

/*
 * One feature-level workflow for DEC-037.  The real Engee workspace bridge is
 * intentionally not assumed to be available in a browser target: this spec
 * drives the shipped UI and provides the authoritative /api/signals snapshots
 * at the route boundary.  Backend contract tests cover the bridge itself.
 */
const { openAppPage, testIdSelector, waitForAppReady } = require("../../support/app_page");
const { performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;
const SIGNALS_ROUTE = "**/api/signals*";

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function state(page) { return page.evaluate(async function () { return await window.SignalAnalyserApi.getState(); }); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function uniqueName(snapshot, base) {
  const used = new Set((snapshot.signals || []).map(function (signal) { return signal.name; }));
  if (!used.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) if (!used.has(`${base}${suffix}`)) return `${base}${suffix}`;
}
function activeDisplay(snapshot) { return (snapshot.displays || []).find(function (display) { return display.id === snapshot.active_display_id; }); }
function selectedSignal(snapshot) { return (snapshot.signals || []).find(function (signal) { return signal.name === snapshot.row_selected_signal; }) || snapshot.signals[0]; }
function syntheticSignal(source, name) {
  const result = copy(source);
  result.name = name;
  return result;
}
function initialSnapshot() {
  const a = "E2E Tone", b = "E2E Chirp";
  const display = {
    id: "display-e2e", name: "Display E2E", active_plot: "time", analysis_signal: a, selected_signal: a,
    visible_signals: [a, b], time_limits: { min_s: 0, max_s: 0.2, units: "s" },
    measurement_kinds: ["minimum", "maximum", "mean"], peaks_enabled: false,
    spectrum_settings: { scale: "db", frequency_scale: "linear", leakage: 0.5, frequency_limits: null },
    spectrogram_settings: { overlap_percent: 50, leakage: 0.5, frequency_limits: null, frequency_scale: "linear", power_limits: null },
    persistence_settings: { leakage: 0.5 },
  };
  const trace = function (name, index) { return { name, signal: name, x: [0, 0.1, 0.2], y: index ? [1, 0, 1] : [0, 1, 0] }; };
  return {
    state_revision: 0, active_display_id: display.id, row_selected_signal: a, analysis_signal: a, selected_signal: a,
    active_plot: "time", visible_signals: [a, b], displays: [display],
    signals: [
      { name: a, color: "#2563eb", sample_rate_hz: 10, sample_count: 3, duration_s: 0.2, data_type: "Вещественный", visible: true },
      { name: b, color: "#dc2626", sample_rate_hz: 10, sample_count: 3, duration_s: 0.2, data_type: "Комплексный", visible: true },
    ],
    time_limits: copy(display.time_limits),
    plots: { time: { type: "line", x: [0, 0.1, 0.2], y: [0, 1, 0], x_label: "Time", y_label: "Amplitude" } },
    plot_payload: {
      selected_signal: a, visible_signals: [a, b], time_traces: [trace(a, 0), trace(b, 1)], spectrum_traces: [trace(a, 0), trace(b, 1)],
      spectrogram: { type: "heatmap", signal: a, x: [0, 0.1], y: [0, 5], z: [[0, 1], [1, 0]], power_limits: { mode: "auto", requested: null, effective: null } },
      persistence: { type: "heatmap", signal: a, x: [0, 5], y: [-30, -10], z: [[10, 20], [30, 40]] },
    },
    panel: { fields: [] },
    measurements: { state_revision: 0, signal_name: a, ordinate: "real", units: { value: "1", time: "s" }, items: [] },
    peaks: { enabled: false, state_revision: 0, display_id: display.id, signal_name: a, ordinate: "real", units: { value: "1", time: "s", width: "samples", prominence: "1" }, items: [] },
  };
}
function appendSignal(snapshot, source, name) {
  const next = copy(snapshot), display = activeDisplay(next);
  next.signals.push(syntheticSignal(source, name));
  next.row_selected_signal = name;
  if (display) {
    display.visible_signals = Array.from(new Set((display.visible_signals || []).concat([name])));
    display.analysis_signal = name;
  }
  next.state_revision = Number(next.state_revision) + 1;
  return next;
}
function removeSignal(snapshot, name) {
  const next = copy(snapshot), remaining = next.signals.filter(function (signal) { return signal.name !== name; });
  next.signals = remaining;
  next.displays.forEach(function (display) {
    display.visible_signals = (display.visible_signals || []).filter(function (item) { return item !== name; });
    if (display.analysis_signal === name) display.analysis_signal = display.visible_signals[0] || null;
  });
  next.row_selected_signal = (remaining[0] || {}).name || null;
  next.state_revision = Number(next.state_revision) + 1;
  return next;
}
async function settle(page, config) {
  await waitForAppReady(page, config, { timeout: TIMEOUT });
  await page.waitForFunction(function (selector) {
    const node = document.querySelector(selector);
    return node && node.getAttribute("aria-busy") !== "true";
  }, testIdSelector(config.app.testIds.shell), { timeout: TIMEOUT });
}
async function focusTestId(page) { return page.evaluate(function () { return document.activeElement && document.activeElement.getAttribute("data-testid"); }); }
async function clickAction(page, config, locator, operation, log, label) {
  const start = Date.now();
  const responsePromise = waitForApi(page, config, config.app.api.signals, "POST");
  await locator.click();
  const response = await responsePromise;
  performanceLog(log, label, Date.now() - start, undefined, `HTTP ${response.status()} ${operation}`);
  return response;
}
function waitForSignalsStatus(page, config, status) {
  return page.waitForResponse(function (response) {
    try { return response.status() === status && new URL(response.url()).pathname.endsWith(config.app.api.signals); }
    catch (_error) { return response.status() === status && response.url().includes(config.app.api.signals); }
  }, { timeout: TIMEOUT });
}
function assertExactKeys(assert, value, expected, label) {
  const actual = Object.keys(value || {}).sort();
  const wanted = expected.slice().sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys must be exactly ${JSON.stringify(wanted)}, got ${JSON.stringify(actual)}`);
}
function assertProductionOrigin(page, config, assert, label) {
  return page.evaluate(function () { return location.origin; }).then(function (origin) {
    assert((config.app.allowedOrigins || []).includes(origin), `${label} must remain on an allowed production origin, got ${origin}`);
  });
}

async function testSignalsInspectorActions({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  let canonical;
  const importedName = `WorkspaceE2E_${Date.now()}`;
  let requestCounts = { duplicate: 0, extract_time_limits: 0, import_workspace: 0, delete: 0 };
  let routeHandler;
  let stateRoute;
  let viewRoute;
  let mutationRoute;
  const interceptedPosts = [];
  const signalRequests = [];
  const add = id(page, config, "signalsAddAction");
  const menu = id(page, config, "signalsAddMenu");
  const workspaceAction = id(page, config, "signalsAddWorkspaceAction");
  const extractAction = id(page, config, "signalsAddSelectionAction");
  const copyAction = id(page, config, "signalsCopyAction");
  const deleteAction = id(page, config, "signalsDeleteAction");

  try {
    await step("open a full explicit route-backed Signal inventory seam", async function () {
      // Quarantine must exist before first navigation: no initialization POST
      // can reach production.  Specific synthetic POST routes are registered
      // later and take precedence; every unknown POST remains a local 500.
      mutationRoute = async function (route) {
        if (route.request().method() !== "POST") { await route.continue(); return; }
        interceptedPosts.push({ url: route.request().url(), body: route.request().postData() || "", kind: "quarantine" });
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: { message: "unexpected E2E mutation route" } }) });
      };
      await page.route("**/api/**", mutationRoute);
      // The first load is deliberately read-only proof that the published
      // target serves its actual assets and state.  Every following POST is
      // fulfilled by Playwright before it can reach the target.
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      await assertProductionOrigin(page, config, assert, "post-navigation target");
      await settle(page, config);
      const targetHealth = await state(page);
      assert(Number.isInteger(targetHealth.state_revision), "published target /api/state must return an authoritative read-only snapshot");
      canonical = initialSnapshot();
      stateRoute = async function (route) { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(canonical) }); };
      viewRoute = async function (route) {
        const body = JSON.parse(route.request().postData() || "{}");
        interceptedPosts.push({ url: route.request().url(), body: route.request().postData() || "", kind: "view" });
        assertExactKeys(assert, body, ["state_revision", "active_plot", "row_selected_signal", "analysis_signal", "visible_signals", "time_limits", "measurement_kinds", "spectrum_settings", "spectrogram_settings", "persistence_settings", "peaks_enabled"], "view mutation");
        assert(body.state_revision === canonical.state_revision && body.active_plot === "time" && body.row_selected_signal === "E2E Tone" && body.analysis_signal === "E2E Tone", "view mutation must carry exact pre-mutation revision and selection");
        const next = copy(canonical), display = activeDisplay(next);
        if (display && Array.isArray(body.visible_signals)) {
          display.visible_signals = body.visible_signals.slice();
          display.analysis_signal = body.analysis_signal;
          display.selected_signal = body.analysis_signal;
          next.visible_signals = body.visible_signals.slice(); next.analysis_signal = body.analysis_signal; next.selected_signal = body.analysis_signal;
          next.row_selected_signal = body.row_selected_signal;
          next.plot_payload.visible_signals = body.visible_signals.slice(); next.plot_payload.selected_signal = body.analysis_signal;
        }
        next.state_revision = Number(next.state_revision) + 1;
        canonical = next;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(canonical) });
      };
      await page.route("**/api/state*", stateRoute);
      await page.route("**/api/view*", viewRoute);
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertProductionOrigin(page, config, assert, "synthetic-seam reload target");
      await settle(page, config);
      assert(Array.isArray(canonical.signals) && canonical.signals.length > 1, "Signals inspector needs at least two source signals for its destructive lifecycle");
      assert(activeDisplay(canonical) && selectedSignal(canonical), "Signals inspector needs an active Display and selected analysis signal");
      routeHandler = async function (route) {
        const body = JSON.parse(route.request().postData() || "{}");
        const operation = body.operation;
        interceptedPosts.push({ url: route.request().url(), body: route.request().postData() || "", kind: "signals" });
        requestCounts[operation] = (requestCounts[operation] || 0) + 1;
        if (operation === "import_workspace" && body.variable_name === "reject_me") {
          assertExactKeys(assert, body, ["state_revision", "operation", "variable_name", "signal_name", "sample_rate_hz"], "rejected workspace import");
          assert(body.state_revision === 2 && body.signal_name === importedName && body.sample_rate_hz === 48000, "rejected workspace import must retain exact revision/name/sample rate");
          signalRequests.push({ operation, body, status: 422, revision: canonical.state_revision });
          await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ ok: false, code: "invalid_request", error: { message: "synthetic workspace rejection" } }) });
          return;
        }
        if (operation === "duplicate" && requestCounts.duplicate === 1) {
          assertExactKeys(assert, body, ["state_revision", "operation", "signal_name"], "stale copy");
          assert(body.state_revision === 3 && body.signal_name === importedName, "stale copy must use authoritative revision 3 and selected imported signal");
          signalRequests.push({ operation, body, status: 409, revision: canonical.state_revision });
          await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ current: canonical }) });
          return;
        }
        if (operation === "import_workspace") {
          assertExactKeys(assert, body, ["state_revision", "operation", "variable_name", "signal_name", "sample_rate_hz"], "accepted workspace import");
          assert(body.state_revision === 2 && body.variable_name === "accepted_workspace" && body.signal_name === importedName && body.sample_rate_hz === 48000, "accepted workspace import must carry exact canonical request body");
        } else if (operation === "duplicate") {
          assertExactKeys(assert, body, ["state_revision", "operation", "signal_name"], "copy replay");
          assert(body.state_revision === 3 && body.signal_name === importedName, "copy replay must retain exact canonical revision and selected signal");
        } else if (operation === "extract_time_limits") {
          assertExactKeys(assert, body, ["state_revision", "operation", "display_id"], "time-limits extraction");
          assert(body.state_revision === 4 && body.display_id === "display-e2e", "extraction must carry exact active Display and revision");
        } else if (operation === "delete") {
          assertExactKeys(assert, body, ["state_revision", "operation", "signal_name"], "delete confirmation");
          assert(body.state_revision === 5 && body.signal_name === `${importedName}_Copy_Extract`, "delete must target exact selected derived signal at revision 5");
        }
        let next = canonical;
        if (operation === "import_workspace") {
          const source = selectedSignal(canonical);
          next = appendSignal(canonical, source, uniqueName(canonical, body.signal_name || "workspace_signal"));
        } else if (operation === "duplicate") {
          const source = (canonical.signals || []).find(function (signal) { return signal.name === body.signal_name; });
          next = appendSignal(canonical, source, uniqueName(canonical, `${body.signal_name}_Copy`));
        } else if (operation === "extract_time_limits") {
          const display = activeDisplay(canonical), source = selectedSignal(canonical);
          if (!display || !display.time_limits) throw new Error("route seam requires active Time limits for extract");
          next = appendSignal(canonical, source, uniqueName(canonical, `${source.name}_Extract`));
        } else if (operation === "delete") {
          next = removeSignal(canonical, body.signal_name);
        } else {
          throw new Error(`unexpected /api/signals operation: ${operation}`);
        }
        canonical = next;
        signalRequests.push({ operation, body, status: 200, revision: canonical.state_revision });
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(canonical) });
      };
      await page.route(SIGNALS_ROUTE, routeHandler);
    });

    await step("toolbar is a stable local action zone and Add has keyboard-menu lifecycle", async function () {
      assert(await add.isVisible() && await copyAction.isVisible() && await deleteAction.isVisible(), "toolbar must present Add, Copy and Delete together");
      await add.focus(); await add.press("Enter");
      await menu.waitFor({ state: "visible", timeout: TIMEOUT });
      await page.waitForFunction(function (testId) {
        return document.activeElement && document.activeElement.getAttribute("data-testid") === testId;
      }, config.app.testIds.signalsAddWorkspaceAction, { timeout: TIMEOUT });
      assert(await add.getAttribute("aria-expanded") === "true" && await focusTestId(page) === config.app.testIds.signalsAddWorkspaceAction, "Enter must open Add menu and focus its first source");
      await workspaceAction.press("End");
      assert(await focusTestId(page) === config.app.testIds.signalsAddSelectionAction, "End must reach range extraction action");
      await extractAction.press("Home");
      assert(await focusTestId(page) === config.app.testIds.signalsAddWorkspaceAction, "Home must return to workspace source");
      await workspaceAction.press("Tab");
      await menu.waitFor({ state: "hidden", timeout: TIMEOUT });
      await page.waitForFunction(function (testId) {
        return document.activeElement && document.activeElement.getAttribute("data-testid") === testId;
      }, config.app.testIds.signalsCopyAction, { timeout: TIMEOUT });
      assert(await focusTestId(page) === config.app.testIds.signalsCopyAction, "Tab from menu must return to the next toolbar control");
    });

    await step("row selection and visible-membership checkbox are independent before inventory mutation", async function () {
      const rows = await signalRowsState(page, config);
      const selected = rows.find(function (row) { return row.selected; });
      const membershipTarget = rows.find(function (row) { return row.checked && !row.selected; });
      assert(selected && membershipTarget, "fixture needs separate selected and visible signal rows to prove independence");
      const uncheck = waitForApi(page, config, config.app.api.view, "POST");
      await page.locator(testIdSelector(membershipTarget.checkboxTestId)).setChecked(false);
      assert((await uncheck).status() === 200, "membership toggle must retain its normal /api/view boundary");
      await settle(page, config);
      assert((await state(page)).row_selected_signal === selected.name, "unchecking a visible signal must not change selected analysis row");
      const restore = waitForApi(page, config, config.app.api.view, "POST");
      await page.locator(testIdSelector(membershipTarget.checkboxTestId)).setChecked(true);
      assert((await restore).status() === 200, "membership cleanup must restore the original display membership");
      await settle(page, config);
      canonical = await state(page);
    });

    await step("workspace dialog validates, preserves a 422 draft, then acknowledges authoritative import", async function () {
      await add.click(); await workspaceAction.click();
      const dialog = id(page, config, "signalsWorkspaceDialog");
      const variable = id(page, config, "signalsWorkspaceVariableInput");
      const name = id(page, config, "signalsWorkspaceNameInput");
      const rate = id(page, config, "signalsWorkspaceSampleRateInput");
      const submit = id(page, config, "signalsWorkspaceSubmit");
      const appShell = id(page, config, "shell");
      await dialog.waitFor({ state: "visible", timeout: TIMEOUT });
      assert(await appShell.getAttribute("aria-hidden") === "true" && await appShell.evaluate(function (node) { return node.inert; }), "modal workspace dialog must make application background inert");
      assert(await focusTestId(page) === config.app.testIds.signalsWorkspaceVariableInput, "workspace dialog must autofocus variable input");
      await variable.fill("reject_me"); await name.fill(importedName); await rate.fill("48000");
      const before422 = await gridBox(page, config);
      const rejected = await clickAction(page, config, submit, "import_workspace", log, "workspace 422 preservation");
      assert(rejected.status() === 422 && await id(page, config, "signalsActionError").isVisible(), "workspace 422 must remain visible in the dialog");
      assert(await variable.inputValue() === "reject_me" && await name.inputValue() === importedName && await rate.inputValue() === "48000", "workspace 422 must preserve the complete entered form");
      assert(equalBox(before422, await gridBox(page, config)), "dialog 422 must not shift the plot grid");
      await variable.fill("accepted_workspace");
      const accepted = await clickAction(page, config, submit, "import_workspace", log, "workspace acknowledged import");
      assert(accepted.status() === 200, "workspace import must receive an acknowledged snapshot");
      await id(page, config, "signalsWorkspaceSuccess").waitFor({ state: "visible", timeout: TIMEOUT });
      assert(await focusTestId(page) === config.app.testIds.signalsWorkspaceDone, "workspace success must move focus to Done");
      await id(page, config, "signalsWorkspaceDone").click(); await dialog.waitFor({ state: "hidden", timeout: TIMEOUT });
      assert(await appShell.getAttribute("aria-hidden") === null && !(await appShell.evaluate(function (node) { return node.inert; })), "Done must restore non-inert application focus context");
      assert((await state(page)).row_selected_signal === importedName, "authoritative imported signal must become selected");
    });

    await step("Copy retries exactly one stale snapshot", async function () {
      const startedAt = Date.now();
      const copiedPromise = waitForSignalsStatus(page, config, 200);
      await copyAction.click();
      const copied = await copiedPromise;
      performanceLog(log, "copy stale replay", Date.now() - startedAt, undefined, `HTTP ${copied.status()} duplicate`);
      assert(copied.status() === 200 && requestCounts.duplicate === 2, "Copy must retry exactly once after its 409 canonical snapshot");
      await settle(page, config);
      assert((await state(page)).row_selected_signal === `${importedName}_Copy`, "Copy authoritative snapshot must select the created copy");
    });

    await step("selected Time Limits extracts a signal and Delete honors cancel then acknowledged confirm", async function () {
      const source = selectedSignal(canonical);
      assert(activeDisplay(canonical).time_limits, "range extraction requires current active Time limits");
      await add.click();
      const extracted = await clickAction(page, config, extractAction, "extract_time_limits", log, "extract selected Time limits");
      assert(extracted.status() === 200 && (await state(page)).row_selected_signal === `${source.name}_Extract`, "range extraction must append and select a derived signal");
      const selectedName = (await state(page)).row_selected_signal;
      await deleteAction.click();
      const deleteDialog = id(page, config, "signalsDeleteDialog");
      await deleteDialog.waitFor({ state: "visible", timeout: TIMEOUT });
      assert((await id(page, config, "signalsDeleteConfirm").isVisible()) && (await deleteDialog.innerText()).includes(selectedName), "Delete must name the target before any mutation");
      await id(page, config, "signalsDeleteCancel").click();
      await deleteDialog.waitFor({ state: "hidden", timeout: TIMEOUT });
      assert(requestCounts.delete === 0 && (await state(page)).row_selected_signal === selectedName, "Delete cancel must preserve the authoritative inventory");
      await deleteAction.click();
      const removed = await clickAction(page, config, id(page, config, "signalsDeleteConfirm"), "delete", log, "delete acknowledged signal");
      assert(removed.status() === 200, "Delete confirmation must mutate exactly once");
      await id(page, config, "signalsDeleteDone").waitFor({ state: "visible", timeout: TIMEOUT });
      assert(await focusTestId(page) === config.app.testIds.signalsDeleteDone, "Delete success must move focus to Done");
      await id(page, config, "signalsDeleteDone").click(); await deleteDialog.waitFor({ state: "hidden", timeout: TIMEOUT });
      const final = await state(page);
      assert(!(final.signals || []).some(function (signal) { return signal.name === selectedName; }) && final.state_revision === canonical.state_revision, "final UI inventory must exactly reflect the last authoritative delete snapshot");
      assert(requestCounts.import_workspace === 2 && requestCounts.extract_time_limits === 1 && requestCounts.delete === 1, "workflow must issue only the designed route-backed inventory actions");
      assert(interceptedPosts.length === 8 && interceptedPosts.every(function (request) { return request.url.includes("/api/"); }), "all eight scenario POST requests must be intercepted before any production mutation");
      assert(JSON.stringify(signalRequests.map(function (request) { return [request.operation, request.status, request.revision]; })) === JSON.stringify([
        ["import_workspace", 422, 2], ["import_workspace", 200, 3], ["duplicate", 409, 3],
        ["duplicate", 200, 4], ["extract_time_limits", 200, 5], ["delete", 200, 6],
      ]), "Signals route must follow the exact revision/status transition sequence including one bounded stale replay");
    });
  } finally {
    if (routeHandler) await page.unroute(SIGNALS_ROUTE, routeHandler);
    if (viewRoute) await page.unroute("**/api/view*", viewRoute);
    if (stateRoute) await page.unroute("**/api/state*", stateRoute);
    // Keep the POST quarantine while restoring actual target state so a later
    // shared-CDP spec never inherits synthetic UI or can mutate production.
    if (mutationRoute) {
      try {
        await page.reload({ waitUntil: "domcontentloaded" });
        await assertProductionOrigin(page, config, assert, "cleanup target");
        await settle(page, config);
      } finally {
        await page.unroute("**/api/**", mutationRoute);
      }
    }
  }
}

async function gridBox(page, config) { return page.locator(testIdSelector(config.app.testIds.displayCanvas)).boundingBox(); }
function equalBox(left, right) { return !!left && !!right && ["x", "y", "width", "height"].every(function (key) { return Math.round(left[key]) === Math.round(right[key]); }); }

testSignalsInspectorActions.requiredFeatures = ["frontend-state-management", "graph-output-zone", "signal-analyser-displays", "inspector-ui", "signal-inventory-actions"];
module.exports = testSignalsInspectorActions;
