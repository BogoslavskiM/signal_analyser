const fs = require("fs");
const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../../../test/playwright/node_modules/playwright-core"));

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const entryPath = path.resolve(__dirname, "index.html");
const entryUrl = `file://${entryPath}`;
const screenshotDir = path.resolve(__dirname, "../screenshots");
const evidencePath = path.resolve(__dirname, "../evidence/interaction-walkthrough.json");
const requiredViewports = [
  { width: 1024, height: 768, key: "1024x768" },
  { width: 1280, height: 720, key: "1280x720" },
  { width: 1440, height: 900, key: "1440x900" }
];
const sizingViewports = [
  { width: 936, height: 696, key: "936x696", kind: "minimum" },
  { width: 840, height: 620, key: "840x620", kind: "undersized" }
];
const records = [];
const screenshots = [];
const browserErrors = [];
const viewportEvidence = {};
const stateEvidence = {};
const overlayEvidence = {};
const regressionEvidence = {};
let browser;
let page;
let viewport;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function record(id, action, expected, run) {
  const started = Date.now();
  try {
    await run();
    records.push({ id, viewport: viewport.key, action, expected, status: "pass", duration_ms: Date.now() - started });
  } catch (error) {
    records.push({ id, viewport: viewport.key, action, expected, status: "fail", duration_ms: Date.now() - started, error: error.message });
    throw error;
  }
}

async function shot(name) {
  const filename = `${name}--${viewport.key}.png`;
  await page.screenshot({ path: path.join(screenshotDir, filename), animations: "disabled" });
  screenshots.push(`screenshots/${filename}`);
  return `screenshots/${filename}`;
}

async function fresh(nextViewport) {
  viewport = nextViewport;
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  page.on("console", message => {
    if (message.type() === "error") browserErrors.push({ viewport: viewport.key, type: "console", text: message.text() });
  });
  page.on("pageerror", error => browserErrors.push({ viewport: viewport.key, type: "pageerror", text: error.message }));
  await page.goto(entryUrl);
  await page.waitForFunction(() => !!window.__TASK0080_DESIGN__);
  await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
  await page.waitForTimeout(60);
}

async function inspect() {
  return page.evaluate(() => window.__TASK0080_DESIGN__.inspect());
}

async function waitPhase(phase) {
  await page.waitForFunction(expected => window.__TASK0080_DESIGN__.inspect().applyPhase === expected, phase, { timeout: 4000 });
}

async function openTimeSettings() {
  await page.locator("[data-design-id='settings-tab-time']").click();
  await page.locator("[data-design-id='settings-field-time.x_limits']").waitFor();
}

function maximumInput() {
  return page.locator("[data-design-id='settings-field-time.x_limits'] [data-range-index='1']");
}

async function setMaximum(value, blur = false) {
  const input = maximumInput();
  await input.fill(String(value));
  if (blur) await page.locator("[data-design-id='settings-panel'] .settings-heading").click();
}

async function plotGeometry() {
  return page.locator(".plot-pane").evaluateAll(panes => panes.map(pane => {
    const rect = element => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    const host = pane.querySelector("[data-plotly-ready='true']");
    return { pane: rect(pane), canvas: rect(pane.querySelector(".plot-canvas")), host: rect(host) };
  }));
}

async function assertPlotIntegrity() {
  await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
  const plots = await page.locator("[data-plotly-ready='true']").evaluateAll(hosts => hosts.map(host => ({
    fullLayout: !!host._fullLayout,
    whitePaper: host._fullLayout && host._fullLayout.paper_bgcolor,
    whitePlot: host._fullLayout && host._fullLayout.plot_bgcolor,
    svg: !!host.querySelector(".main-svg"),
    traces: !!host.querySelector(".scatterlayer .trace, .heatmaplayer .hm"),
    width: host.getBoundingClientRect().width,
    height: host.getBoundingClientRect().height
  })));
  assert(plots.length === 2, `Expected two accepted-v2 plots, got ${plots.length}`);
  assert(plots.every(item => item.fullLayout && item.svg && item.traces && item.whitePaper === "#ffffff" && item.whitePlot === "#ffffff" && item.width > 0 && item.height > 0), `Plot integrity failed: ${JSON.stringify(plots)}`);
  assert(await page.locator(".modebar, .modebar-container").count() === 0, "Superseded Plotly modebar appeared");
  return plots;
}

async function measureViewport() {
  return page.evaluate(() => {
    const box = selector => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const style = selector => getComputedStyle(document.querySelector(selector));
    return {
      inner: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      application: box("[data-design-id='app-shell']"),
      toolbar: box(".application-toolbar"),
      main: box(".main-stage"),
      workspace: box(".workspace"),
      settings: box("[data-design-id='settings-panel']"),
      inspector: box(".inspector"),
      plotGrid: box("[data-design-id='plot-grid']"),
      apply: box("[data-design-id='settings-apply']"),
      layout: {
        appRows: style("[data-design-id='app-shell']").gridTemplateRows,
        appGap: style("[data-design-id='app-shell']").gap,
        mainColumns: style(".main-stage").gridTemplateColumns,
        mainGap: style(".main-stage").gap,
        settingsRows: style("[data-design-id='settings-panel']").gridTemplateRows
      },
      scroll: {
        horizontal: document.documentElement.scrollWidth > innerWidth,
        vertical: document.documentElement.scrollHeight > innerHeight
      },
      visibleZones: [".application-toolbar", ".workspace", "[data-design-id='settings-panel']", ".inspector"].every(selector => {
        const element = document.querySelector(selector);
        return !!element && getComputedStyle(element).display !== "none";
      })
    };
  });
}

async function pristineScenario() {
  await record(`pristine-${viewport.key}`, "Открыть prototype", "Apply disabled, no visible dirty caption, accepted v2 Plotly intact", async () => {
    const before = await inspect();
    assert(before.applyPhase === "pristine" && before.applyRequests === 0 && before.calculationsCommitted === 0, `Unexpected pristine state: ${JSON.stringify(before)}`);
    assert(await page.locator("[data-design-id='settings-apply']").isDisabled(), "Apply must be disabled in pristine");
    assert((await page.locator("[data-settings-status]").innerText()).trim() === "", "Pristine must not show a draft caption");
    await assertPlotIntegrity();
    const sizing = await measureViewport();
    assert(sizing.application.width >= 920 && sizing.application.height >= 680, `Application minimum violated: ${JSON.stringify(sizing.application)}`);
    assert(sizing.workspace.width >= 600 && sizing.settings.width >= 300 && sizing.inspector.height >= 252, `Zone minimum violated: ${JSON.stringify(sizing)}`);
    assert(sizing.visibleZones, "A structural zone is hidden");
    viewportEvidence[viewport.key] = sizing;
    stateEvidence[`${viewport.key}:pristine`] = before;
    await shot("state--pristine");

    const legend = page.locator("[data-field-checkbox='display.show_legend']");
    await legend.click();
    const afterPresentation = await inspect();
    assert(afterPresentation.applyPhase === "pristine" && afterPresentation.applyRequests === 0, "Presentation-only legend toggle dirtied or applied calculation state");
    assert(await page.locator(".plot-legend").count() === 0, "Presentation-only legend toggle was not immediate");
    await legend.click();
  });
}

async function uiRegressionScenario() {
  const evidence = {};
  await record(`ui-shell-settings-legend-${viewport.key}`, "Открыть основной экран", "Toolbar spans the full application canvas; Display settings and upper-right legend are visible", async () => {
    const geometry = await page.evaluate(() => {
      const rect = element => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
      };
      const app = document.querySelector("[data-design-id='app-shell']");
      const toolbar = document.querySelector(".application-toolbar");
      const settings = document.querySelector("[data-design-id='settings-panel']");
      const canvas = document.querySelector(".plot-pane.is-active .plot-canvas");
      const legend = document.querySelector(".plot-pane.is-active .plot-legend");
      const paneHeader = document.querySelector(".plot-pane.is-active .plot-pane-header");
      const controls = document.querySelector(".plot-pane.is-active .plot-control-cluster");
      return {
        app: rect(app), toolbar: rect(toolbar), settings: rect(settings), canvas: rect(canvas), legend: rect(legend), paneHeader: rect(paneHeader), controls: rect(controls),
        settingsTitle: settings.querySelector("h2").textContent.trim(),
        settingsTabs: Array.from(settings.querySelectorAll("[data-settings-page]")).map(button => button.textContent.trim()),
        settingsFields: Array.from(settings.querySelectorAll("[data-design-id^='settings-field-']")).map(row => row.getAttribute("data-design-id"))
      };
    });
    const tolerance = 1;
    assert(Math.abs(geometry.toolbar.x - geometry.app.x) <= tolerance && Math.abs(geometry.toolbar.width - geometry.app.width) <= tolerance && Math.abs(geometry.toolbar.right - geometry.app.right) <= tolerance, `Toolbar does not span application: ${JSON.stringify(geometry)}`);
    assert(geometry.settings.width >= 300 && geometry.settingsTitle === "Настройки отображения", `Display settings zone missing: ${JSON.stringify(geometry.settings)}`);
    assert(JSON.stringify(geometry.settingsTabs) === JSON.stringify(["Отображение", "Время", "Измерения"]), `Display settings tabs missing: ${JSON.stringify(geometry.settingsTabs)}`);
    assert(geometry.settingsFields.includes("settings-field-display.plot_type") && geometry.settingsFields.includes("settings-field-display.show_legend"), `Display settings fields missing: ${JSON.stringify(geometry.settingsFields)}`);
    assert(geometry.legend.x >= geometry.canvas.x + geometry.canvas.width / 2 && geometry.legend.right <= geometry.canvas.right && geometry.legend.y >= geometry.canvas.y && geometry.legend.y < geometry.canvas.y + geometry.canvas.height * 0.4, `Legend is outside the upper-right plot zone: ${JSON.stringify(geometry)}`);
    assert(geometry.legend.y >= geometry.paneHeader.bottom && geometry.legend.y >= geometry.controls.bottom, `Legend collides with pane header controls: ${JSON.stringify(geometry)}`);
    evidence.shell = geometry;
    evidence.shell_screenshot = await shot("regression--shell-settings-legend");
  });

  await record(`selected-display-close-${viewport.key}`, "Добавить и выбрать второй экран", "Selected tab and its close target share the selection-colored background", async () => {
    await page.locator("[data-design-id='display-add']").click();
    const selected = page.locator(".display-tab-shell.is-selected");
    const close = selected.locator(".display-tab-close");
    const colors = await selected.evaluate(shell => ({ shell: getComputedStyle(shell).backgroundColor, close: getComputedStyle(shell.querySelector(".display-tab-close")).backgroundColor }));
    const size = await close.evaluate(element => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    assert(colors.shell === colors.close, `Selected close background is discontinuous: ${JSON.stringify(colors)}`);
    assert(size.width === 28 && size.height === 32, `Selected close target geometry changed: ${JSON.stringify(size)}`);
    await selected.locator(".display-tab").focus();
    await page.keyboard.press("Tab");
    assert(await close.evaluate(element => element.matches(":focus-visible")), "Selected close lacks keyboard focus-visible state");
    evidence.selected_close = { colors, size, focus_owner: "selected_display_close" };
    evidence.selected_close_screenshot = await shot("regression--selected-display-close");
    const toastClose = page.locator("[data-toast-close]");
    if (await toastClose.isVisible()) await toastClose.click();
  });

  await record(`layout-control-${viewport.key}`, "Открыть Изменить макет, выбрать draft 2×2, закрыть Escape", "Canonical grid/current/chevron trigger and anchored rows/columns preview restore focus without applying", async () => {
    const trigger = page.locator("[data-design-id='layout-trigger']");
    await trigger.click();
    const popover = page.locator("[data-design-id='layout-popover']");
    assert(await popover.isVisible(), "Layout popover did not open");
    assert(await popover.locator("[data-layout-kind='rows']").count() === 10 && await popover.locator("[data-layout-kind='columns']").count() === 10, "Layout rows/columns controls are incomplete");
    await popover.locator("[data-layout-kind='rows'][data-layout-value='2']").click();
    assert(await popover.locator(".layout-preview i").count() === 4, "Layout preview did not render 2×2 draft");
    assert(await popover.locator("[data-layout-kind='rows'][data-layout-value='2']").getAttribute("aria-pressed") === "true", "Layout draft selection is not persistent");
    const top = await shot("overlay--layout-control--top");
    await page.keyboard.press("Escape");
    assert(!(await popover.isVisible()), "Escape did not close layout popover");
    assert(await trigger.evaluate(element => element === document.activeElement), "Layout close did not restore trigger focus");
    assert((await trigger.locator(".layout-current").innerText()).trim() === "1 × 2", "Cancelled layout draft changed applied layout");
    const after = await shot("overlay--layout-control--after-close");
    evidence.layout = { bottom_to_top: ["application", "layout_popover"], focus_owner: "layout_close_then_selected_segment", restore: "layout_trigger", screenshots: [top, after] };
    overlayEvidence[`${viewport.key}:layout_control`] = evidence.layout;
  });

  await record(`visible-signal-management-${viewport.key}`, "Отключить echoComplex в списке Сигналы", "Active-pane visible-signal membership, trace and compact legend update immediately", async () => {
    const beforeState = await inspect();
    assert(beforeState.visibleSignals.includes("echoComplex"), `echoComplex is not initially visible: ${JSON.stringify(beforeState)}`);
    await page.locator("[data-signal-visible='echoComplex']").click();
    await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
    await page.waitForTimeout(40);
    const afterState = await inspect();
    assert(!afterState.visibleSignals.includes("echoComplex"), `Visible-signal membership did not update: ${JSON.stringify(afterState)}`);
    assert(!(await page.locator("[data-signal-visible='echoComplex']").isChecked()), "Signal checkbox did not persist unchecked");
    assert(await page.locator(".plot-pane.is-active .scatterlayer .trace").count() === 1, "Active time plot did not remove the hidden signal trace");
    assert(await page.locator(".plot-pane.is-active .plot-legend span").count() === 1, "Legend did not follow visible-signal membership");
    evidence.visible_signals = { before: beforeState.visibleSignals, after: afterState.visibleSignals };
    evidence.visible_signals_screenshot = await shot("regression--visible-signals-managed");
  });

  await record(`pane-graph-type-switch-${viewport.key}`, "Выбрать Спектр в selector активной области", "Graph type switches, Plotly rerenders and Display settings synchronize", async () => {
    await page.locator("[data-select-key='plot:pane-time']").click();
    await page.locator("[data-design-id='select-menu'] [data-option-value='spectrum']").click();
    await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
    const state = await inspect();
    assert(state.activePlotType === "spectrum", `Pane graph type did not switch: ${JSON.stringify(state)}`);
    assert(await page.locator(".plot-pane.is-active [data-plotly-type='spectrum'][data-plotly-ready='true']").count() === 1, "Spectrum Plotly host did not render");
    assert((await page.locator("[data-design-id='settings-field-display.plot_type'] .select-trigger span").innerText()).trim() === "Спектр", "Display settings did not synchronize from pane selector");
    assert(!(await page.locator("[data-design-id='select-menu']").isVisible()), "Graph type menu remained active after LMB selection");
    evidence.pane_graph_type = state.activePlotType;
    evidence.pane_graph_type_screenshot = await shot("regression--graph-type-pane-switch");
  });

  await record(`settings-graph-type-switch-${viewport.key}`, "Выбрать Спектрограмму в Настройки отображения", "Display settings selector switches the same active graph and synchronizes pane header", async () => {
    await page.locator("[data-design-id='settings-field-display.plot_type'] [data-select-key]").click();
    await page.locator("[data-design-id='select-menu'] [data-option-value='spectrogram']").click();
    await page.evaluate(() => window.__TASK0080_DESIGN__.waitForPlots());
    const state = await inspect();
    assert(state.activePlotType === "spectrogram", `Settings graph type did not switch: ${JSON.stringify(state)}`);
    assert(await page.locator(".plot-pane.is-active [data-plotly-type='spectrogram'][data-plotly-ready='true']").count() === 1, "Spectrogram Plotly host did not render");
    assert((await page.locator(".plot-pane.is-active [data-select-key^='plot:'] span").innerText()).trim() === "Спектрограмма", "Pane selector did not synchronize from Display settings");
    assert(await page.locator("[data-design-id='settings-field-spectrogram.frequency_units']").count() === 1, "Type-specific Display settings did not become visible");
    evidence.settings_graph_type = state.activePlotType;
    evidence.settings_graph_type_screenshot = await shot("regression--graph-type-settings-switch");
  });

  regressionEvidence[viewport.key] = evidence;
}

async function invalidAndHelpScenario() {
  await fresh(viewport);
  await openTimeSettings();
  const geometryBefore = await plotGeometry();
  await record(`invalid-${viewport.key}`, "Ввести непарсируемый numeric draft", "2px error, Apply disabled, old output retained, no calculation", async () => {
    await setMaximum("abc", true);
    const state = await inspect();
    assert(state.applyPhase === "invalid" && state.invalid && state.applyRequests === 0 && state.calculationsCommitted === 0, `Invalid contract failed: ${JSON.stringify(state)}`);
    assert(await page.locator("[data-design-id='settings-apply']").isDisabled(), "Invalid local draft did not disable Apply");
    const border = await page.locator("[data-design-id='settings-field-time.x_limits'] .range-control").evaluate(element => getComputedStyle(element).borderWidth);
    assert(border === "2px", `Invalid range border is ${border}`);
    assert(JSON.stringify(await plotGeometry()) === JSON.stringify(geometryBefore), "Invalid input changed plot geometry");
    stateEvidence[`${viewport.key}:invalid`] = state;
    await shot("state--invalid");
  });

  await record(`validation-help-${viewport.key}`, "Открыть pane ellipsis → Управление графиком поверх inline validation", "Help owns focus; inline validation and disabled Apply remain", async () => {
    await page.locator(".plot-pane.is-active [data-plot-menu-trigger]").click();
    await page.locator("[data-design-id='plot-menu'] [data-plot-help]").click();
    const help = page.locator("[data-design-id='graph-help']");
    assert(await help.isVisible(), "Graph help did not open");
    assert(await help.locator("[data-graph-help-close]").evaluate(element => element === document.activeElement), "Graph help close does not own focus");
    assert(await page.locator("[data-design-id='settings-apply']").isDisabled(), "Validation no longer blocks Apply under help");
    const top = await shot("overlay--settings-validation-help--top");
    await help.locator("[data-graph-help-close]").click();
    assert(await page.locator("[data-design-id='plot-menu'] [data-plot-help]").evaluate(element => element === document.activeElement), "Help close did not restore focus to menu item");
    const after = await shot("overlay--settings-validation-help--after-close");
    overlayEvidence[`${viewport.key}:settings_validation_with_help`] = { bottom_to_top: ["inline_validation", "pane_menu", "graph_help"], focus_owner: "graph_help_close", restore: "plot_help_menuitem", screenshots: [top, after] };
  });
}

async function dirtyApplyReadyScenario() {
  await fresh(viewport);
  await openTimeSettings();
  const geometryBefore = await plotGeometry();
  const outputBefore = (await inspect()).outputRevision;
  await record(`dirty-${viewport.key}`, "Изменить valid calculation field и дождаться 150ms draft save", "Only value + Apply enablement communicate dirty; no calculation or output change", async () => {
    await setMaximum("0.3");
    await page.waitForTimeout(190);
    const state = await inspect();
    assert(state.applyPhase === "dirty" && state.dirty && state.fieldUpdates >= 1, `Dirty state failed: ${JSON.stringify(state)}`);
    assert(state.applyRequests === 0 && state.calculationsCommitted === 0 && state.outputRevision === outputBefore, "Input caused calculation or output revision");
    assert(!(await page.locator("[data-design-id='settings-apply']").isDisabled()), "Valid dirty draft did not enable Apply");
    assert((await page.locator("[data-settings-status]").innerText()).trim() === "", "Forbidden visible dirty badge/caption is present");
    assert(JSON.stringify(await plotGeometry()) === JSON.stringify(geometryBefore), "Dirty input changed plot geometry");
    stateEvidence[`${viewport.key}:dirty`] = state;
    await shot("state--dirty");
  });

  await record(`apply-flush-${viewport.key}`, "Создать passive toast, изменить field и немедленно нажать Apply", "Pending 150ms update flushes before snapshot-free Apply; applying keeps old plot", async () => {
    await page.locator("[data-design-id='display-add']").click();
    await setMaximum("0.31");
    await page.locator("[data-design-id='settings-apply']").click();
    await waitPhase("applying");
    const state = await inspect();
    const applyIndex = state.eventLog.map(item => item.type).lastIndexOf("apply");
    const flushedIndex = state.eventLog.map(item => item.reason).lastIndexOf("apply_flush");
    assert(applyIndex > flushedIndex && flushedIndex >= 0, `Apply did not flush pending field first: ${JSON.stringify(state.eventLog)}`);
    assert(state.eventLog[applyIndex].settings_snapshot_present === false && Object.keys(state.eventLog[applyIndex].payload).every(key => key !== "settings"), "Apply carried a settings snapshot");
    assert(state.outputRevision === outputBefore && state.calculationsCommitted === 0, "Applying changed output before commit acceptance");
    assert(await page.locator("[data-design-id='success-toast']").isVisible(), "Passive pre-existing toast is absent during applying");
    const top = await shot("overlay--applying-passive-toast--top");
    await shot("state--applying");
    await page.locator("[data-toast-close]").click();
    assert((await inspect()).applyPhase === "applying", "Closing passive toast changed applying state");
    const after = await shot("overlay--applying-passive-toast--after-close");
    overlayEvidence[`${viewport.key}:applying_with_passive_toast`] = { bottom_to_top: ["application", "passive_toast", "applying_control_state"], pointer_owner: "application_except_disabled_apply", focus_owner: "live_region_no_forced_move", restore: "none", screenshots: [top, after] };
    stateEvidence[`${viewport.key}:applying`] = state;
  });

  await record(`pending-${viewport.key}`, "Дождаться принятия Apply revision", "Only active plot has contextual overlay; Plotly geometry remains", async () => {
    await waitPhase("pending");
    const state = await inspect();
    assert(state.calculationsCommitted === 1 && state.appliedRevision === outputBefore + 1 && state.outputRevision === outputBefore, `Pending revisions failed: ${JSON.stringify(state)}`);
    assert(await page.locator(".plot-pane.is-active .plot-state-overlay").isVisible(), "Active pending overlay missing");
    assert(await page.locator(".plot-pane:not(.is-active) .plot-state-overlay").count() === 0, "Inactive plot was blocked");
    assert(JSON.stringify(await plotGeometry()) === JSON.stringify(geometryBefore), "Pending overlay changed Plotly area geometry");
    stateEvidence[`${viewport.key}:pending`] = state;
    await shot("state--pending");
  });

  await record(`ready-${viewport.key}`, "Дождаться active output", "Output revision catches applied revision; Apply disabled; passive ready toast", async () => {
    await waitPhase("ready");
    const state = await inspect();
    assert(state.outputRevision === state.appliedRevision && !state.dirty && state.calculationsCommitted === 1, `Ready state failed: ${JSON.stringify(state)}`);
    assert(await page.locator("[data-design-id='settings-apply']").isDisabled(), "Apply must be disabled after ready commit");
    assert(await page.locator("[data-design-id='success-toast']").isVisible(), "Ready toast missing");
    await assertPlotIntegrity();
    stateEvidence[`${viewport.key}:ready`] = state;
    await shot("state--ready");
  });
}

async function errorRetryScenario() {
  await fresh(viewport);
  await openTimeSettings();
  const before = await inspect();
  await record(`semantic-error-${viewport.key}`, "Ввести locally parseable, semantically rejected maximum=2 и нажать Apply", "Apply remains available before server validation; error preserves draft and old output", async () => {
    await setMaximum("2");
    assert(!(await page.locator("[data-design-id='settings-apply']").isDisabled()), "Backend-semantic value was incorrectly blocked locally");
    await page.locator("[data-design-id='settings-apply']").click();
    await waitPhase("error");
    const state = await inspect();
    assert(state.applyRequests === 1 && state.calculationsCommitted === 0 && state.outputRevision === before.outputRevision, `Semantic error altered output: ${JSON.stringify(state)}`);
    assert(state.backendDraft["time.x_limits"][1] === "2" && state.dirty, "Rejected backend draft was not preserved");
    assert(await page.locator(".plot-state-overlay").count() === 0, "Atomic Apply rejection replaced the previous output");
    assert((await page.locator("[data-design-id='settings-apply']").innerText()).trim() === "Повторить", "Retry affordance missing after error");
    stateEvidence[`${viewport.key}:error`] = state;
    await shot("state--error");

    await page.mouse.move(2, 2);
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert(await page.locator("[data-design-id='settings-apply']").evaluate(element => element === document.activeElement && element.matches(":focus-visible")), "Retry focus-visible state missing");
    assert((await page.locator("[data-design-id='settings-apply']").innerText()).trim() === "Повторить", "Retry label did not persist after field blur");
    const retryState = await inspect();
    assert(retryState.applyPhase === "error", `Backend error state did not persist until edit/retry: ${JSON.stringify(retryState)}`);
    stateEvidence[`${viewport.key}:retry`] = retryState;
    await shot("state--retry");
  });
}

async function staleRetryScenario() {
  await fresh(viewport);
  await openTimeSettings();
  const before = await inspect();
  await record(`stale-${viewport.key}`, "Применить deterministic stale draft maximum=0.333", "Stale response is rejected; warning toast and focused Retry preserve draft/output", async () => {
    await setMaximum("0.333");
    await page.locator("[data-design-id='settings-apply']").click();
    await waitPhase("stale");
    const state = await inspect();
    assert(state.applyRequests === 1 && state.calculationsCommitted === 0 && state.outputRevision === before.outputRevision && state.dirty, `Stale contract failed: ${JSON.stringify(state)}`);
    assert(await page.locator("[data-design-id='success-toast'].is-warning").isVisible(), "Stale warning toast missing");
    assert(await page.locator("[data-design-id='settings-apply']").evaluate(element => element === document.activeElement), "Retry did not receive focus after stale response");
    stateEvidence[`${viewport.key}:stale`] = state;
    const top = await shot("overlay--stale-error-retry--top");
    await shot("state--stale");
    await page.locator("[data-toast-close]").click();
    const after = await shot("overlay--stale-error-retry--after-close");
    overlayEvidence[`${viewport.key}:stale_error_with_retry`] = { bottom_to_top: ["preserved_plot", "settings_stale_error_and_retry", "passive_warning_toast"], pointer_owner: "retry_button", focus_owner: "retry_button", restore: "retry_button_unchanged_after_toast_close", screenshots: [top, after] };
  });

  await record(`stale-retry-commit-${viewport.key}`, "Нажать Повторить на сохранённом backend draft", "Second snapshot-free Apply succeeds and reaches ready", async () => {
    await page.locator("[data-design-id='settings-apply']").click();
    await waitPhase("ready");
    const state = await inspect();
    const applyEvents = state.eventLog.filter(item => item.type === "apply");
    assert(applyEvents.length === 2 && applyEvents.every(item => item.settings_snapshot_present === false), `Retry Apply contract failed: ${JSON.stringify(applyEvents)}`);
    assert(state.calculationsCommitted === 1 && state.outputRevision === state.appliedRevision && !state.dirty, `Retry did not reach ready: ${JSON.stringify(state)}`);
  });
}

async function sizingScenario(nextViewport) {
  await fresh(nextViewport);
  await record(`sizing-${nextViewport.kind}-${nextViewport.key}`, "Открыть prototype на sizing viewport", "Application canvas keeps minima; undersized viewport uses document scroll without reflow", async () => {
    const sizing = await measureViewport();
    assert(sizing.application.width >= 920 && sizing.application.height >= 680, `Sizing minimum failed: ${JSON.stringify(sizing.application)}`);
    assert(sizing.workspace.width >= 600 && sizing.settings.width >= 300 && sizing.inspector.height >= 252, `Zone minima failed: ${JSON.stringify(sizing)}`);
    assert(sizing.visibleZones && sizing.layout.appGap === "8px" && sizing.layout.mainGap === "8px", `Invariant composition failed: ${JSON.stringify(sizing.layout)}`);
    if (nextViewport.kind === "undersized") assert(sizing.scroll.horizontal && sizing.scroll.vertical, `Undersized document scroll absent: ${JSON.stringify(sizing.scroll)}`);
    viewportEvidence[nextViewport.key] = sizing;
    await assertPlotIntegrity();
    await shot(`sizing--${nextViewport.kind}`);
  });
}

(async () => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ["--allow-file-access-from-files"] });
  try {
    for (const item of requiredViewports) {
      await fresh(item);
      await uiRegressionScenario();
      await fresh(item);
      await pristineScenario();
      await invalidAndHelpScenario();
      await dirtyApplyReadyScenario();
      await errorRetryScenario();
      await staleRetryScenario();
    }
    for (const item of sizingViewports) await sizingScenario(item);

    const failures = records.filter(item => item.status !== "pass");
    const payload = {
      design: "TASK-0080-explicit-apply-flow",
      design_version: 2,
      generated_at: new Date().toISOString(),
      entry: "prototype/index.html",
      viewports: requiredViewports.map(item => item.key),
      sizing_viewports: sizingViewports.map(item => item.key),
      summary: { records: records.length, passed: records.length - failures.length, failed: failures.length, screenshots: screenshots.length, browser_errors: browserErrors.length },
      records,
      screenshots,
      viewport_evidence: viewportEvidence,
      state_evidence: stateEvidence,
      overlay_evidence: overlayEvidence,
      regression_evidence: regressionEvidence,
      browser_errors: browserErrors
    };
    fs.writeFileSync(evidencePath, JSON.stringify(payload, null, 2) + "\n");
    if (failures.length || browserErrors.length) throw new Error(`Walkthrough failed: ${failures.length} record failures, ${browserErrors.length} browser errors`);
    process.stdout.write(JSON.stringify(payload.summary) + "\n");
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
})().catch(error => {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
});
