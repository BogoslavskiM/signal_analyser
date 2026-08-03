"use strict";

// SA-UI-011 / DEC-040: one integrated, storage-only settings-inspector workflow.
const { openAppPage, testIdSelector } = require("../../support/app_page");
const { endpointMatches, performanceLog, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;
const GROUPS = {
  time: ["display", "time"],
  spectrum: ["display", "spectrum"],
  spectrogram: ["display", "spectrogram"],
  persistence: ["display", "persistence"],
};
const SECTIONS = {
  time: ["display-view", "time-options", "time-time_limits", "time-y_axis_limits"],
  spectrum: ["display-view", "spectrum-frequency_limits", "spectrum-y_axis_limits", "spectrum-scale", "spectrum-resolution_type", "spectrum-leakage", "spectrum-frequency_resolution"],
  spectrogram: ["display-view", "spectrogram-time_limits", "spectrogram-frequency_limits", "spectrogram-power_limits", "spectrogram-scale", "spectrogram-leakage", "spectrogram-time_resolution", "spectrogram-frequency_resolution", "spectrogram-options"],
  persistence: ["display-view", "persistence-frequency_limits", "persistence-power_limits", "persistence-density_limits", "persistence-scale", "persistence-leakage", "persistence-time_resolution", "persistence-power_bins", "persistence-frequency_resolution"],
};

function id(page, value) { return page.locator(testIdSelector(value)); }
function fieldId(field) { return `setting-${field.replace(/\./g, "-")}`; }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function active(snapshot) { return (snapshot.displays || []).find(function (item) { return item.id === snapshot.active_display_id; }); }
function field(doc, name) { return (doc.fields || []).find(function (item) { return item.id === name; }); }
async function state(page) { return page.evaluate(function () { return window.SignalAnalyserApi.getState(); }); }
async function documentFor(page, displayId) { return page.evaluate(function (idValue) { return window.SignalAnalyserApi.settings(idValue); }, displayId); }

async function selectPlot(page, config, plot, log, label) {
  const control = id(page, config.app.testIds.plotTypeSelect);
  if (await control.inputValue() === plot) return state(page);
  const started = Date.now();
  const responseP = waitForApi(page, config, config.app.api.view, "POST");
  await control.selectOption(plot);
  const response = await responseP;
  if (!response.ok()) throw new Error(`${label}: plot change failed HTTP ${response.status()}`);
  await waitForSettled(page, config);
  performanceLog(log, label, Date.now() - started, undefined, `HTTP ${response.status()}`);
  return state(page);
}

async function selectDisplay(page, config, displayId, log, label) {
  if ((await state(page)).active_display_id === displayId) return state(page);
  const started = Date.now();
  const responseP = waitForApi(page, config, config.app.api.displays, "POST");
  await id(page, `display-tab-${displayId}`).click({ timeout: TIMEOUT });
  const response = await responseP;
  if (!response.ok()) throw new Error(`${label}: Display selection failed HTTP ${response.status()}`);
  await waitForSettled(page, config);
  performanceLog(log, label, Date.now() - started, undefined, `HTTP ${response.status()}`);
  return state(page);
}

async function waitCatalog(page, displayId) {
  await page.waitForFunction(function (idValue) {
    return window.SignalAnalyserSettings && window.SignalAnalyserSettings.__test.inspect(idValue).document;
  }, displayId, { timeout: TIMEOUT });
}

async function commit(page, config, locator, action, log, label) {
  const started = Date.now();
  const responseP = waitForApi(page, config, config.app.api.settings, "POST");
  await action(locator);
  const response = await responseP;
  if (!response.ok()) throw new Error(`${label}: settings save failed HTTP ${response.status()}`);
  performanceLog(log, label, Date.now() - started, undefined, `HTTP ${response.status()}`);
  return response.json();
}

async function chooseEnum(page, config, name, value, log, label) {
  const input = id(page, fieldId(name));
  await input.press("ArrowDown");
  await commit(page, config, input, async function () {
    await page.locator(`${testIdSelector(fieldId(name))} ~ [role=listbox] [data-setting-option=${JSON.stringify(value)}]`).click();
  }, log, label);
}

async function setBoolean(page, config, name, checked, log, label) {
  const control = id(page, fieldId(name));
  if (await control.isChecked() === checked) return;
  await commit(page, config, control, function (node) { return node.setChecked(checked); }, log, label);
}

async function heatmapSignature(page, config, label) {
  const host = id(page, config.app.testIds.activePlotHost);
  await page.waitForFunction(function (selector) {
    const node = document.querySelector(selector), data = node && (node.data || node._fullData || []);
    return node && node.dataset.plotReady === "true" && Array.isArray(data) && data.filter(function (trace) { return trace.type === "heatmap"; }).length === 1;
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  return host.evaluate(function (node) {
    const trace = (node.data || node._fullData || []).filter(function (item) { return item.type === "heatmap"; })[0] || {};
    return { colorLabel: trace.colorbar && trace.colorbar.title && trace.colorbar.title.text || "", z: trace.z || [], zmin: trace.zmin, zmax: trace.zmax };
  });
}

async function armRenderCounter(page) {
  await page.evaluate(function () {
    const plotly = window.Plotly;
    if (!plotly || typeof plotly.react !== "function") throw new Error("Plotly.react is unavailable for render-count assertion");
    window.__settingsE2ERenders = 0;
    window.__settingsE2EOriginalReact = plotly.react;
    plotly.react = function () { window.__settingsE2ERenders += 1; return window.__settingsE2EOriginalReact.apply(this, arguments); };
  });
}
async function readRenderCounter(page) { return page.evaluate(function () { return window.__settingsE2ERenders || 0; }); }
async function disarmRenderCounter(page) {
  await page.evaluate(function () { if (window.__settingsE2EOriginalReact) { window.Plotly.react = window.__settingsE2EOriginalReact; delete window.__settingsE2EOriginalReact; } });
}

async function setRange(page, config, name, value, log, label) {
  const min = id(page, `${fieldId(name)}-min`), max = id(page, `${fieldId(name)}-max`);
  const started = Date.now();
  await min.fill(value == null ? "" : String(value.min));
  const responseP = waitForApi(page, config, config.app.api.settings, "POST");
  await max.fill(value == null ? "" : String(value.max));
  await max.press("Enter");
  const response = await responseP;
  if (!response.ok()) throw new Error(`${label}: settings save failed HTTP ${response.status()}`);
  performanceLog(log, label, Date.now() - started, undefined, `HTTP ${response.status()}`);
}

async function setResolution(page, config, name, value, log, label) {
  const base = fieldId(name), mode = page.locator(`input[name=${JSON.stringify(`${base}-mode`)}][value=${JSON.stringify(value.mode)}]`);
  if (value.mode === "auto") { await commit(page, config, mode, function (node) { return node.check(); }, log, label); return; }
  await commit(page, config, mode, function (node) { return node.check(); }, log, `${label}: Specify`);
  const unit = Object.keys(value).find(function (key) { return key !== "mode"; });
  const input = id(page, `${base}-${unit}`);
  await commit(page, config, input, async function (node) { await node.fill(String(value[unit])); await node.press("Enter"); }, log, label);
}

function plotFingerprint(snapshot) {
  const display = active(snapshot) || {};
  return JSON.stringify({ id: display.id, plot: display.active_plot, payload: snapshot.plot_payload || snapshot.plots || {} });
}

async function assertCatalog(page, assert, displayId, plot) {
  await waitCatalog(page, displayId);
  const visibleGroups = await page.locator("[data-testid^='settings-group-']").evaluateAll(function (nodes) { return nodes.map(function (node) { return node.dataset.testid.slice("settings-group-".length); }); });
  const visibleSections = await page.locator("[data-testid^='settings-section-']").evaluateAll(function (nodes) { return nodes.map(function (node) { return node.dataset.testid.slice("settings-section-".length); }); });
  assert(same(visibleGroups, GROUPS[plot]), `${plot}: exact ordered contextual settings groups are required`);
  assert(same(visibleSections, SECTIONS[plot]), `${plot}: exact ordered contextual settings sections are required`);
  const readouts = await page.locator("[data-testid^='settings-readout-'] output").allTextContents();
  if (["spectrum", "spectrogram", "persistence"].includes(plot)) {
    assert(readouts.length > 0 && readouts.every(function (text) { return text.trim() === "Доступно после подключения расчёта"; }), `${plot}: unavailable derived readouts must retain the exact placeholder`);
  } else assert(readouts.length === 0, "Time inventory must not invent a derived-resolution readout");
}

async function testSettingsCatalogStorage({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { changed: [] };
  try {
    await step("load A and inventory each contextual settings surface", async function () {
      log("browser_workspace_setup: background CDP only; no focus/Space/window action; MATLAB unchanged");
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      const snapshot = await state(page);
      original.a = snapshot.active_display_id;
      original.plot = active(snapshot).active_plot;
      for (const plot of ["time", "spectrum", "spectrogram", "persistence"]) {
        await selectPlot(page, config, plot, log, `open A ${plot}`);
        await assertCatalog(page, assert, original.a, plot);
      }
    });
    await step("commit representative settings without unintended plot replacement", async function () {
      await selectPlot(page, config, "time", log, "open A time for presentation setting");
      let doc = await documentFor(page, original.a);
      original.changed.push({ plot: "time", name: "display.show_legend", value: field(doc, "display.show_legend").value, kind: "boolean" });
      await setBoolean(page, config, "display.show_legend", !field(doc, "display.show_legend").value, log, "toggle presentation legend");
      assert((await documentFor(page, original.a)).state_revision > doc.state_revision, "presentation commit must advance Settings revision");
      await selectPlot(page, config, "spectrum", log, "open A Spectrum for enum/range");
      doc = await documentFor(page, original.a);
      original.changed.push({ plot: "spectrum", name: "spectrum.frequency_units", value: field(doc, "spectrum.frequency_units").value, kind: "enum" });
      original.changed.push({ plot: "spectrum", name: "spectrum.resolution_type", value: field(doc, "spectrum.resolution_type").value, kind: "enum" });
      original.changed.push({ plot: "spectrum", name: "spectrum.y_limits", value: field(doc, "spectrum.y_limits").value, kind: "range" });
      const before = plotFingerprint(await state(page));
      await armRenderCounter(page);
      try {
        await chooseEnum(page, config, "spectrum.frequency_units", "kilohertz", log, "project Spectrum frequency units to kHz");
        assert((await id(page, `${fieldId("spectrum.frequency_limits")}-min`).getAttribute("aria-label")) === "Min (kHz)", "non-base unit must project the Spectrum input label");
        const spectrumReadout = (await documentFor(page, original.a)).readouts.find(function (item) { return item.id === "spectrum.frequency_resolution"; });
        const spectrumReadoutText = (await id(page, "settings-readout-spectrum-frequency_resolution").textContent()).trim();
        assert(spectrumReadout, "Spectrum frequency-resolution readout metadata is required");
        if (spectrumReadout.status === "available") assert(spectrumReadoutText.includes("kHz"), "available Spectrum readout must project its unit label");
        else assert(spectrumReadoutText === "Доступно после подключения расчёта", "unavailable Spectrum readout must retain its exact ordinary placeholder");
        assert(await readRenderCounter(page) === 0 && plotFingerprint(await state(page)) === before, "unit-only presentation change must not render or replace graph data");
      } finally { await disarmRenderCounter(page); }
      await chooseEnum(page, config, "spectrum.resolution_type", "window_length", log, "commit Spectrum resolution enum");
      assert(await id(page, "settings-section-spectrum-window_options").isVisible(), "Window Length selection must reveal its contextual Window Options section");
      await setRange(page, config, "spectrum.y_limits", { min: -20, max: 20 }, log, "commit Spectrum optional range");
      assert((await id(page, `${fieldId("spectrum.y_limits")}-effect-status`)).isVisible(), "stored-only range must expose stable effect status");
      assert(plotFingerprint(await state(page)) === before, "storage-only Spectrum commits must not replace the active plot payload");
      doc = await documentFor(page, original.a);
      original.changed.push({ plot: "spectrum", name: "spectrum.nfft", value: field(doc, "spectrum.nfft").value, kind: "resolution" });
      const nfftAuto = page.locator(`input[name=${JSON.stringify(`${fieldId("spectrum.nfft")}-mode`)}][value="auto"]`);
      const nfftSpecify = page.locator(`input[name=${JSON.stringify(`${fieldId("spectrum.nfft")}-mode`)}][value="specified"]`);
      const nfftInput = id(page, `${fieldId("spectrum.nfft")}-nfft`);
      assert(await nfftAuto.isChecked() && await nfftInput.isDisabled(), "DFT Points Auto must disable its requested value input");
      await setResolution(page, config, "spectrum.nfft", { mode: "specified", nfft: 32 }, log, "commit Spectrum DFT Points Specify");
      assert(await nfftSpecify.isChecked() && !await nfftInput.isDisabled() && (await nfftInput.inputValue()) === "32", "DFT Points Specify must enable and retain its integer value");
      assert((await id(page, `${fieldId("spectrum.nfft")}-effect-status`)).isVisible(), "DFT Points must expose its blocked/unapplied storage status");
      await setResolution(page, config, "spectrum.nfft", { mode: "auto" }, log, "restore Spectrum DFT Points Auto");
      assert(await nfftAuto.isChecked() && await nfftInput.isDisabled(), "DFT Points Auto restore must disable the value input again");
      await selectPlot(page, config, "spectrogram", log, "open A Spectrogram for resolution");
      doc = await documentFor(page, original.a);
      original.changed.push({ plot: "spectrogram", name: "spectrogram.time_resolution", value: field(doc, "spectrogram.time_resolution").value, kind: "resolution" });
      await setResolution(page, config, "spectrogram.time_resolution", { mode: "specified", seconds: 2 }, log, "commit Spectrogram specified resolution");
      assert((await id(page, `${fieldId("spectrogram.time_resolution")}-effect-status`)).isVisible(), "blocked resolution must retain a visible storage status");
      await selectPlot(page, config, "persistence", log, "open A Persistence for power bins");
      doc = await documentFor(page, original.a);
      original.changed.push({ plot: "persistence", name: "persistence.power_bins", value: field(doc, "persistence.power_bins").value, kind: "resolution" });
      await setResolution(page, config, "persistence.power_bins", { mode: "specified", count: 64 }, log, "commit Persistence power bins");
      assert((await id(page, `${fieldId("persistence.power_bins")}-effect-status`)).isVisible(), "power bins must be marked stored-only until provider support exists");
    });
    await step("verify active Spectrogram scale render, unit projection, Display isolation and invalid-draft recovery", async function () {
      const createP = waitForApi(page, config, config.app.api.displays, "POST");
      await id(page, config.app.testIds.addDisplay).click();
      if (!(await createP).ok()) throw new Error("create Display B failed");
      await waitForSettled(page, config);
      original.b = (await state(page)).active_display_id;
      await selectPlot(page, config, "spectrogram", log, "open B Spectrogram baseline");
      const bHeatmap = await heatmapSignature(page, config, "B baseline"), bScale = field(await documentFor(page, original.b), "spectrogram.scale").value;
      await selectDisplay(page, config, original.a, log, "return A for active Spectrogram scale");
      await selectPlot(page, config, "spectrogram", log, "open A Spectrogram scale");
      const doc = await documentFor(page, original.a), priorScale = field(doc, "spectrogram.scale").value, priorHeatmap = await heatmapSignature(page, config, "A scale baseline");
      original.changed.push({ plot: "spectrogram", name: "spectrogram.scale", value: priorScale, kind: "scale" });
      await armRenderCounter(page);
      try {
        await setBoolean(page, config, "spectrogram.scale", priorScale !== "db", log, "toggle active Spectrogram dB/Linear scale");
        await page.waitForFunction(function (args) {
          const node = document.querySelector(args.selector), trace = node && (node.data || node._fullData || []).filter(function (item) { return item.type === "heatmap"; })[0];
          return trace && (JSON.stringify(trace.z || []) !== args.z || (trace.colorbar && trace.colorbar.title && trace.colorbar.title.text) !== args.colorLabel || trace.zmin !== args.zmin || trace.zmax !== args.zmax);
        }, { selector: testIdSelector(config.app.testIds.activePlotHost), z: JSON.stringify(priorHeatmap.z), colorLabel: priorHeatmap.colorLabel, zmin: priorHeatmap.zmin, zmax: priorHeatmap.zmax }, { timeout: TIMEOUT });
        const changedHeatmap = await heatmapSignature(page, config, "A changed scale");
        assert(changedHeatmap.colorLabel !== priorHeatmap.colorLabel && !same(changedHeatmap.z, priorHeatmap.z) && (changedHeatmap.zmin !== priorHeatmap.zmin || changedHeatmap.zmax !== priorHeatmap.zmax), "active Spectrogram scale must change authoritative heatmap z, color label and rendered bounds");
        assert(await readRenderCounter(page) === 1, "one active Spectrogram scale action must schedule exactly one render");
        assert(field(await documentFor(page, original.b), "spectrogram.scale").value === bScale, "inactive Display B scale must remain isolated before activation");
      } finally { await disarmRenderCounter(page); }
      await selectDisplay(page, config, original.b, log, "open inactive B after A scale");
      assert(same(await heatmapSignature(page, config, "B after A scale"), bHeatmap), "inactive Display B rendered heatmap must remain unchanged by A scale action");
      await selectPlot(page, config, "persistence", log, "open B Persistence");
      await waitCatalog(page, original.b);
      assert((field(await documentFor(page, original.b), "persistence.power_bins").value || {}).mode === "auto", "Display B must retain its independent default power-bin intent");
      await selectDisplay(page, config, original.a, log, "return A to verify persisted settings");
      await selectPlot(page, config, "persistence", log, "open A Persistence after B");
      assert(same(field(await documentFor(page, original.a), "persistence.power_bins").value, { mode: "specified", count: 64 }), "Display A power bins must persist after A/B switching");
      await selectPlot(page, config, "spectrum", log, "open A Spectrum for invalid draft");
      const error = id(page, `${fieldId("spectrum.y_limits")}-error`), min = id(page, `${fieldId("spectrum.y_limits")}-min`), max = id(page, `${fieldId("spectrum.y_limits")}-max`);
      const accepted = field(await documentFor(page, original.a), "spectrum.y_limits").value;
      await min.fill("20"); await max.fill("-20"); await max.press("Enter");
      await error.waitFor({ state: "visible", timeout: TIMEOUT });
      assert(same(field(await documentFor(page, original.a), "spectrum.y_limits").value, accepted), "invalid range draft must leave accepted server state unchanged");
      assert((await min.inputValue()) === "20" && (await max.inputValue()) === "-20", "invalid draft must remain visible for user recovery");
      await min.fill(String(accepted.min)); await max.fill(String(accepted.max)); await max.press("Enter");
      await error.waitFor({ state: "hidden", timeout: TIMEOUT });
    });
  } finally {
    try {
      if (original.b) { await selectDisplay(page, config, original.b, log, "cleanup select B"); const closeP = waitForApi(page, config, config.app.api.displays, "POST"); await id(page, `close-display-${original.b}`).click(); if (!(await closeP).ok()) throw new Error("cleanup close B failed"); await waitForSettled(page, config); }
      if (original.a) {
        await selectDisplay(page, config, original.a, log, "cleanup return A");
        for (const item of original.changed.slice().reverse()) {
          await selectPlot(page, config, item.plot, log, `cleanup open ${item.plot}`);
          if (item.kind === "boolean") await setBoolean(page, config, item.name, item.value, log, `cleanup ${item.name}`);
          else if (item.kind === "enum") await chooseEnum(page, config, item.name, item.value, log, `cleanup ${item.name}`);
          else if (item.kind === "range") await setRange(page, config, item.name, item.value, log, `cleanup ${item.name}`);
          else if (item.kind === "resolution") await setResolution(page, config, item.name, item.value, log, `cleanup ${item.name}`);
          else if (item.kind === "scale") await setBoolean(page, config, item.name, item.value === "db", log, `cleanup ${item.name}`);
        }
        await selectPlot(page, config, original.plot, log, "cleanup restore original plot");
      }
    } catch (error) { log(`cleanup Settings catalog scenario: ${error.message}`); }
  }
}

testSettingsCatalogStorage.requiredFeatures = ["frontend-state-management", "signal-analyser-displays", "settings-storage"];
module.exports = testSettingsCatalogStorage;
