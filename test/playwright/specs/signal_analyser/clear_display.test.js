"use strict";

const { openAppPage, testIdSelector, waitForAppReady } = require("../../support/app_page");
const {
  endpointMatches,
  responseJson,
  selectedRowId,
  signalRowsState,
  waitForApi,
  waitForSettled,
  performanceLog,
} = require("../../support/signal_analyser_page");

const VIEW_TIMEOUT = 30000;

function testId(config, name) {
  const value = config.app.testIds[name];
  if (typeof value !== "string") throw new Error(`Missing Clear Display test id: ${name}`);
  return value;
}

function rowLocator(page, row) {
  return page.locator(`[data-testid=${JSON.stringify(row.id)}]`);
}

function checkboxLocator(page, row) {
  return page.locator(`[data-testid=${JSON.stringify(row.checkboxTestId)}]`);
}

function snapshot(payload, label) {
  if (!payload || !Number.isInteger(payload.state_revision) || !Array.isArray(payload.displays)) {
    throw new Error(`${label} must return the authoritative state snapshot`);
  }
  return payload;
}

function activeDisplay(state) {
  return state.displays.find(function (display) { return display.id === state.active_display_id; });
}

async function waitForIdle(page, config) {
  await waitForAppReady(page, config, { timeout: VIEW_TIMEOUT });
  await page.waitForFunction(function (selector) {
    const shell = document.querySelector(selector);
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, testIdSelector(config.app.testIds.shell), { timeout: VIEW_TIMEOUT });
}

async function mutateAndCapture(page, config, invoke, log, label) {
  const requests = [];
  const onRequest = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } },
      config.app.api.view, "POST")) requests.push(request);
  };
  const startedAt = Date.now();
  page.on("request", onRequest);
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await invoke();
    const response = await responsePromise;
    await waitForSettled(page, config);
    performanceLog(log, `${label} POST /api/view`, Date.now() - startedAt, undefined,
      `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (!response.ok() || requests.length !== 1) throw new Error(`${label} must make exactly one successful /api/view request`);
    return { request: requests[0].postDataJSON(), state: snapshot(await responseJson(response, label), label) };
  } finally {
    page.off("request", onRequest);
  }
}

async function activeTraceNames(page, config) {
  return page.locator(testIdSelector(config.app.testIds.activePlotHost)).evaluate(function (host) {
    const traces = Array.isArray(host.data) ? host.data : host._fullData || [];
    return traces.map(function (trace) { return String(trace.name || ""); });
  });
}

async function tabState(page, config) {
  return page.locator(`${testIdSelector(config.app.testIds.displayTabs)} [role=tab]`).evaluateAll(function (tabs) {
    return tabs.map(function (tab) {
      return { id: tab.getAttribute("data-display-id") || "", selected: tab.getAttribute("aria-selected") === "true" };
    });
  });
}

async function selectDisplay(page, config, id) {
  await page.locator(testIdSelector(`display-tab-${id}`)).click();
  await waitForIdle(page, config);
}

async function openClearMenu(page, config, assert) {
  const trigger = page.locator(testIdSelector(testId(config, "displayOverflowTrigger")));
  const menu = page.locator(testIdSelector(testId(config, "displayOverflowMenu")));
  const action = page.locator(testIdSelector(testId(config, "clearDisplayAction")));
  await trigger.focus();
  await page.keyboard.press("Enter");
  await menu.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
  assert(await menu.getAttribute("role") === "menu", "overflow menu must expose menu role");
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden", timeout: VIEW_TIMEOUT });
  assert(await trigger.evaluate(function (element) { return document.activeElement === element; }), "Escape must restore overflow-trigger focus");
  await page.keyboard.press("Enter");
  await menu.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
  await page.keyboard.press("ArrowDown");
  assert(await action.evaluate(function (element) { return document.activeElement === element; }), "ArrowDown must focus Clear Display menu item");
  return { action, menu };
}

async function testClearDisplay({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  let originalDisplayId = "";
  let clearedRow = null;
  try {
    await step("open two Display pages and retain inactive baseline", async function () {
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      await waitForIdle(page, config);
      let tabs = await tabState(page, config);
      originalDisplayId = tabs.find(function (tab) { return tab.selected; }).id;
      if (tabs.length === 1) {
        await page.locator(testIdSelector(config.app.testIds.addDisplay)).click();
        await waitForIdle(page, config);
        tabs = await tabState(page, config);
      }
      assert(tabs.length >= 2, "Clear Display requires an inactive Display preservation baseline");
      await selectDisplay(page, config, originalDisplayId);
    });

    const inactiveId = (await tabState(page, config)).find(function (tab) { return tab.id !== originalDisplayId; }).id;
    let inactiveTraces;
    await step("record inactive page data before active clear", async function () {
      await selectDisplay(page, config, inactiveId);
      inactiveTraces = await activeTraceNames(page, config);
      assert(inactiveTraces.length > 0, "inactive preservation baseline requires rendered data");
      await selectDisplay(page, config, originalDisplayId);
    });

    await step("Clear Display menu keyboard contract and revision-safe active clear", async function () {
      const beforeRevision = Number(await page.locator(testIdSelector(config.app.testIds.shell)).getAttribute("data-state-revision"));
      const rows = await signalRowsState(page, config);
      clearedRow = rows.find(function (row) { return row.checked; });
      assert(clearedRow, "active Display must have a member before Clear Display");
      const { action } = await openClearMenu(page, config, assert);
      const result = await mutateAndCapture(page, config, function () { return page.keyboard.press("Enter"); }, log, "Clear Display");
      assert(Array.isArray(result.request.visible_signals) && result.request.visible_signals.length === 0,
        "Clear Display request must send visible_signals: []");
      assert(result.request.analysis_signal === null && result.request.peaks_enabled === false,
        "Clear Display request must clear analysis source and disable Peaks");
      assert(result.state.state_revision === beforeRevision + 1, "actual Clear Display must advance revision once");
      const display = activeDisplay(result.state);
      assert(display && Array.isArray(display.visible_signals) && display.visible_signals.length === 0 && display.analysis_signal === null,
        "active Display snapshot must be empty with null analysis source");
      assert(result.state.peaks && result.state.peaks.enabled === false && result.state.peaks.items.length === 0,
        "Clear Display must clear active Peaks snapshot");
      const afterRows = await signalRowsState(page, config);
      assert(afterRows.length === rows.length && afterRows.every(function (row) { return !row.checked; }),
        "Clear Display must retain global signal rows while clearing active memberships");
      assert(await selectedRowId(page, config) === rows.find(function (row) { return row.selected; }).id,
        "Clear Display must preserve global row selection");
      assert((await activeTraceNames(page, config)).length === 0, "empty active Display must retain no stale graph traces");
      assert(await page.locator(testIdSelector(config.app.testIds.emptyDisplay.plot)).isVisible(), "empty Display must expose graph empty state");
      assert(await page.locator(testIdSelector(config.app.testIds.emptyDisplay.measurements)).isVisible(), "empty Display must expose Measurements empty state");
      assert(await page.locator(testIdSelector(config.app.testIds.emptyDisplay.peaks)).count() === 1, "empty Display must retain rendered Peaks empty state even while its tab is hidden");
      assert(await action.isDisabled(), "no-op Clear Display must be disabled after page is empty");
      assert(Number(await page.locator(testIdSelector(config.app.testIds.shell)).getAttribute("data-state-revision")) === result.state.state_revision,
        "disabled no-op Clear must not change revision");
    });

    await step("inactive Display and global inventory survive active clear", async function () {
      await selectDisplay(page, config, inactiveId);
      assert(JSON.stringify(await activeTraceNames(page, config)) === JSON.stringify(inactiveTraces),
        "inactive Display traces must survive active-page clear unchanged");
      assert((await signalRowsState(page, config)).length >= 2, "global inventory must survive active-page clear");
      await selectDisplay(page, config, originalDisplayId);
    });

    await step("first checkbox re-add establishes analysis source with Peaks disabled", async function () {
      const beforeRevision = Number(await page.locator(testIdSelector(config.app.testIds.shell)).getAttribute("data-state-revision"));
      const result = await mutateAndCapture(page, config, function () {
        return checkboxLocator(page, clearedRow).setChecked(true, { timeout: VIEW_TIMEOUT });
      }, log, `re-add ${clearedRow.name}`);
      assert(result.state.state_revision === beforeRevision + 1, "first re-add must advance revision once");
      const display = activeDisplay(result.state);
      assert(display && display.analysis_signal === clearedRow.name && display.visible_signals.length === 1,
        "first re-add must establish the sole member as analysis source");
      assert(result.state.peaks && result.state.peaks.enabled === false, "first re-add must leave Peaks disabled");
      assert((await activeTraceNames(page, config)).includes(clearedRow.name), "first re-add must restore active graph data");
    });

    await step("member versus nonmember row clicks keep analysis source separate", async function () {
      const rows = await signalRowsState(page, config);
      const member = rows.find(function (row) { return row.checked; });
      const nonmember = rows.find(function (row) { return !row.checked; });
      assert(member && nonmember, "selection separation needs one member and one nonmember row");
      const nonmemberResult = await mutateAndCapture(page, config, function () { return rowLocator(page, nonmember).click(); }, log, "select nonmember row");
      assert(nonmemberResult.state.row_selected_signal === nonmember.name && activeDisplay(nonmemberResult.state).analysis_signal === member.name,
        "nonmember row click must change row selection without changing analysis source");
      const memberResult = await mutateAndCapture(page, config, function () { return rowLocator(page, member).click(); }, log, "select member row");
      assert(memberResult.state.row_selected_signal === member.name && activeDisplay(memberResult.state).analysis_signal === member.name,
        "member row click must update row selection and retain member analysis source");
    });
  } finally {
    try {
      if (originalDisplayId) await selectDisplay(page, config, originalDisplayId);
      if (clearedRow) {
        const row = (await signalRowsState(page, config)).find(function (candidate) { return candidate.id === clearedRow.id; });
        if (row && !row.checked) await mutateAndCapture(page, config, function () { return checkboxLocator(page, row).setChecked(true); }, log, "cleanup re-add");
      }
    } catch (error) { log(`cleanup could not restore Clear Display state: ${error.message}`); }
  }
}

testClearDisplay.requiredFeatures = ["frontend-state-management", "multi-page-element", "graph-output-zone", "measurements-statistics", "peaks", "clear-display"];

module.exports = testClearDisplay;
