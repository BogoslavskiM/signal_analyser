"use strict";

const { openAppPage, testIdSelector } = require("../../support/app_page");
const {
  endpointMatches, performanceLog, responseJson, signalRowsState, waitForApi, waitForSettled,
} = require("../../support/signal_analyser_page");

const TIMEOUT = 30000;
const DEFAULT_SETTINGS = { scale: "db", frequency_scale: "linear", leakage: 0.5 };

function id(page, config, name) { return page.locator(testIdSelector(config.app.testIds[name])); }
function shell(page, config) { return id(page, config, "shell"); }
function sameSettings(left, right) {
  return left && right && left.scale === right.scale && left.frequency_scale === right.frequency_scale &&
    Number(left.leakage) === Number(right.leakage);
}
function activeDisplay(state) {
  return (state.displays || []).find(function (display) { return display.id === state.active_display_id; });
}
function realRow(row) { return !/complex|комплекс/i.test(String(row.dataType || row.type || "")); }

async function rows(page, config) {
  const result = await signalRowsState(page, config);
  return page.locator("[data-testid^='signal-row-']").evaluateAll(function (elements, states) {
    return states.map(function (state, index) {
      const cell = elements[index];
      return Object.assign({}, state, {
        dataType: cell && (cell.children[6] && cell.children[6].textContent || "").trim(),
      });
    });
  }, result);
}

async function expectViewMutation(page, config, action, log, label) {
  const before = Number(await shell(page, config).getAttribute("data-state-revision"));
  const requests = [];
  const onRequest = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request);
  };
  page.on("request", onRequest);
  const startedAt = Date.now();
  try {
    const responsePromise = waitForApi(page, config, config.app.api.view, "POST");
    await action();
    const response = await responsePromise;
    const state = await responseJson(response, label);
    performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}; ${requests.length} request(s)`);
    if (!response.ok() || requests.length !== 1 || state.state_revision !== before + 1) {
      throw new Error(`${label} must make exactly one successful +1 /api/view mutation`);
    }
    await waitForSettled(page, config);
    return state;
  } finally {
    page.off("request", onRequest);
  }
}

async function chooseDisplay(page, config, displayId, log, label) {
  if (await shell(page, config).getAttribute("data-active-display-id") === displayId) return;
  const startedAt = Date.now();
  const responsePromise = waitForApi(page, config, config.app.api.displays, "POST");
  await page.locator(testIdSelector(`display-tab-${displayId}`)).click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`${label}: selecting Display failed with HTTP ${response.status()}`);
  await waitForSettled(page, config);
  performanceLog(log, label, Date.now() - startedAt, undefined, `HTTP ${response.status()}`);
}

async function selectPlot(page, config, plot, log, label) {
  const select = id(page, config, "plotTypeSelect");
  if (await select.inputValue() === plot) return null;
  return expectViewMutation(page, config, function () { return select.selectOption(plot); }, log, label);
}

async function setMembership(page, config, desiredNames, log, label) {
  const desired = new Set(desiredNames);
  // Add first, then remove.  This keeps a usable analysis source throughout
  // the real-only transition and prevents an accidental empty Display.
  for (const row of await rows(page, config)) {
    if (desired.has(row.name) && !row.checked) {
      await expectViewMutation(page, config, function () {
        return page.locator(testIdSelector(row.checkboxTestId)).setChecked(true, { timeout: TIMEOUT });
      }, log, `${label}: ${row.name}`);
    }
  }
  for (const row of await rows(page, config)) {
    if (!desired.has(row.name) && row.checked) {
      await expectViewMutation(page, config, function () {
        return page.locator(testIdSelector(row.checkboxTestId)).setChecked(false, { timeout: TIMEOUT });
      }, log, `${label}: ${row.name}`);
    }
  }
}

async function selectAnalysisSource(page, config, name, log, label) {
  const current = (await rows(page, config)).find(function (row) { return row.rowSelected; });
  if (current && current.name === name) return;
  const target = (await rows(page, config)).find(function (row) { return row.name === name; });
  if (!target) throw new Error(`${label}: source row ${name} is absent`);
  await expectViewMutation(page, config, function () {
    return page.locator(testIdSelector(target.id)).click({ timeout: TIMEOUT });
  }, log, label);
}

async function commitRoi(page, config, roi, log, label) {
  const min = id(page, config, "timeMinInput");
  const max = id(page, config, "timeMaxInput");
  await min.fill(String(roi.min), { timeout: TIMEOUT });
  await max.fill(String(roi.max), { timeout: TIMEOUT });
  return expectViewMutation(page, config, function () { return max.press("Enter"); }, log, label);
}

async function spectrumPlot(page, config) {
  return id(page, config, "activePlotHost").evaluate(function (host) {
    const traces = Array.isArray(host.data) ? host.data : (host._fullData || []);
    return {
      type: host._fullLayout && host._fullLayout.xaxis && host._fullLayout.xaxis.type,
      traces: traces.map(function (trace) { return { x: Array.from(trace.x || []), y: Array.from(trace.y || []) }; }),
    };
  });
}

async function waitForSpectrumPlot(page, config) {
  await page.waitForFunction(function (selector) {
    const host = document.querySelector(selector);
    return host && host.getAttribute("data-plot-ready") === "true" &&
      Array.isArray(host.data) && host.data.some(function (trace) { return Array.isArray(trace.x) && trace.x.length; });
  }, testIdSelector(config.app.testIds.activePlotHost), { timeout: TIMEOUT });
  return spectrumPlot(page, config);
}

function spectrumSignature(payload) {
  return JSON.stringify((payload.spectrum_traces || []).map(function (trace) { return [trace.x, trace.y]; }));
}

function assertSpectrumState(assert, state, label) {
  const display = activeDisplay(state);
  assert(display && state.spectrum_settings && display.spectrum_settings &&
    sameSettings(state.spectrum_settings, display.spectrum_settings),
  `${label}: root and active Display must expose exact spectrum_settings`);
}

async function toggleNormalizeLocally(page, config, original, assert, log) {
  const control = id(page, config, "normalizeYAxisCheckbox");
  if (await control.isDisabled()) return false;
  const before = Number(await shell(page, config).getAttribute("data-state-revision"));
  const requests = [];
  const onRequest = function (request) {
    if (endpointMatches({ request: function () { return request; }, url: function () { return request.url(); } }, config.app.api.view, "POST")) requests.push(request);
  };
  page.on("request", onRequest);
  const startedAt = Date.now();
  try {
    await control.setChecked(!original, { timeout: TIMEOUT });
    await page.waitForTimeout(100);
    const after = Number(await shell(page, config).getAttribute("data-state-revision"));
    assert(requests.length === 0 && after === before, "Normalize must make zero Spectrum view requests and leave revision unchanged");
    performanceLog(log, "Normalize local-only", Date.now() - startedAt, undefined, "zero /api/view; revision unchanged");
    return true;
  } finally {
    page.off("request", onRequest);
  }
}

async function testSpectrumSettingsRoi({ appUrl, assert, config, log, page, step, useCurrentPage }) {
  const original = { created: "" };
  try {
    await step("capture exact Display A state and prepare a real-only Spectrum source", async function () {
      await openAppPage(page, { appUrl, config, log, useCurrentPage });
      original.active = await shell(page, config).getAttribute("data-active-display-id");
      original.plot = await id(page, config, "plotTypeSelect").inputValue();
      original.rows = await rows(page, config);
      original.membership = original.rows.filter(function (row) { return row.checked; }).map(function (row) { return row.name; });
      original.source = (original.rows.find(function (row) { return row.rowSelected; }) || {}).name || "";
      original.roi = { min: await id(page, config, "timeMinInput").inputValue(), max: await id(page, config, "timeMaxInput").inputValue() };
      original.normalize = await id(page, config, "normalizeYAxisCheckbox").isChecked();
      // Capture A's actual per-Display settings before any membership changes.
      // The controls retain their authoritative values even while the Spectrum
      // section is hidden for a non-Spectrum plot.
      original.settings = {
        scale: await id(page, config, "spectrumScaleSelect").inputValue(),
        frequency_scale: await id(page, config, "spectrumFrequencyScaleSelect").inputValue(),
        leakage: Number(await id(page, config, "spectrumLeakageInput").inputValue()),
      };

      // A complex signal on the initial page makes Log unavailable.  Do not
      // attempt the prohibited mutation; this is an affordance assertion.
      if (original.rows.some(function (row) { return !realRow(row); })) {
        await selectPlot(page, config, "spectrum", log, "inspect complex default Spectrum");
        assert(await id(page, config, "spectrumFrequencyScaleSelect").locator("option[value='log']").isDisabled(),
          "a default Display with a visible complex signal must disable Log");
      }

      const realOnly = original.rows.filter(realRow).map(function (row) { return row.name; });
      assert(realOnly.length > 0, `scenario requires a real signal: ${JSON.stringify(original.rows)}`);
      original.realSource = realOnly[0];
      await setMembership(page, config, realOnly, log, "prepare real-only membership");
      await selectAnalysisSource(page, config, original.realSource, log, "select real Spectrum source");
      await selectPlot(page, config, "time", log, "prepare Time normalize check");
      original.normalizeWasToggled = await toggleNormalizeLocally(page, config, original.normalize, assert, log);
      await selectPlot(page, config, "spectrum", log, "open real Spectrum");
      await waitForSpectrumPlot(page, config);
      assert(sameSettings(original.settings, DEFAULT_SETTINGS), `new Spectrum state must begin with defaults: ${JSON.stringify(original.settings)}`);
    });

    await step("Spectrum settings, authoritative ROI and one-sided real axis", async function () {
      const scale = id(page, config, "spectrumScaleSelect");
      const frequency = id(page, config, "spectrumFrequencyScaleSelect");
      const leakage = id(page, config, "spectrumLeakageInput");
      for (const item of [
        ["linear scale", function () { return scale.selectOption("linear"); }],
        ["log frequency", function () { return frequency.selectOption("log"); }],
        ["leakage", async function () { await leakage.fill("0.25"); await leakage.dispatchEvent("change"); }],
      ]) {
        const state = await expectViewMutation(page, config, item[1], log, item[0]);
        assertSpectrumState(assert, state, item[0]);
      }
      const before = await waitForSpectrumPlot(page, config);
      const low = Number(await id(page, config, "timeMinInput").inputValue());
      const high = Number(await id(page, config, "timeMaxInput").inputValue());
      const roi = { min: low + (high - low) * 0.2, max: low + (high - low) * 0.8 };
      const state = await commitRoi(page, config, roi, log, "narrow Spectrum ROI");
      assertSpectrumState(assert, state, "narrow Spectrum ROI");
      assert(state.plot_payload && Array.isArray(state.plot_payload.spectrum_traces) &&
        spectrumSignature(state.plot_payload) !== spectrumSignature({ spectrum_traces: before.traces }),
      "authoritative narrowed ROI must change Spectrum traces before Plotly assertion");
      const rendered = await waitForSpectrumPlot(page, config);
      const source = (state.signals || []).find(function (signal) { return signal.name === original.realSource; });
      const nyquist = Number(source && source.sample_rate_hz) / 2;
      const x = rendered.traces.flatMap(function (trace) { return trace.x; }).filter(Number.isFinite);
      assert(rendered.type === "log" && x.length && Math.min.apply(null, x) === 0 &&
        Math.abs(Math.max.apply(null, x) - nyquist) < Math.max(1e-9, nyquist * 1e-6),
      `real Spectrum must use one-sided 0..Nyquist x-axis: ${JSON.stringify({ nyquist, xMin: Math.min.apply(null, x), xMax: Math.max.apply(null, x) })}`);
    });

    await step("complex membership disables Log; Display B defaults; Clear/re-add preserves A", async function () {
      const createResponse = waitForApi(page, config, config.app.api.displays, "POST");
      await id(page, config, "addDisplay").click();
      const created = await createResponse;
      if (!created.ok()) throw new Error(`create Display B failed with HTTP ${created.status()}`);
      await waitForSettled(page, config);
      original.created = await shell(page, config).getAttribute("data-active-display-id");
      await selectPlot(page, config, "spectrum", log, "open Display B Spectrum");
      const bSettings = { scale: await id(page, config, "spectrumScaleSelect").inputValue(), frequency_scale: await id(page, config, "spectrumFrequencyScaleSelect").inputValue(), leakage: Number(await id(page, config, "spectrumLeakageInput").inputValue()) };
      assert(sameSettings(bSettings, DEFAULT_SETTINGS), `Display B must receive independent defaults: ${JSON.stringify(bSettings)}`);

      await chooseDisplay(page, config, original.active, log, "return to Display A");
      const clear = await expectViewMutation(page, config, async function () {
        await id(page, config, "displayOverflowTrigger").click();
        await id(page, config, "clearDisplayAction").click();
      }, log, "clear Display A Spectrum");
      assertSpectrumState(assert, clear, "Clear Display A");
      assert(sameSettings(clear.spectrum_settings, { scale: "linear", frequency_scale: "log", leakage: 0.25 }), "Clear must preserve A Spectrum preferences");
      const realSourceRow = original.rows.find(function (row) { return row.name === original.realSource; });
      const readded = await expectViewMutation(page, config, function () {
        return page.locator(testIdSelector(realSourceRow.checkboxTestId)).setChecked(true, { timeout: TIMEOUT });
      }, log, "re-add real source after Clear");
      assertSpectrumState(assert, readded, "re-add real source");
      assert(Array.isArray(readded.plot_payload && readded.plot_payload.spectrum_traces) && readded.plot_payload.spectrum_traces.length > 0,
        "first re-add must recompute Spectrum from preserved settings");
    });
  } finally {
    try {
      if (original.created) {
        await chooseDisplay(page, config, original.created, log, "cleanup select Display B");
        const closeResponse = waitForApi(page, config, config.app.api.displays, "POST");
        await page.locator(testIdSelector(`close-display-${original.created}`)).click();
        const closed = await closeResponse;
        if (!closed.ok()) throw new Error(`cleanup close Display B failed with HTTP ${closed.status()}`);
        await waitForSettled(page, config);
      }
      if (original.active) {
        await chooseDisplay(page, config, original.active, log, "cleanup return Display A");
        await selectPlot(page, config, "spectrum", log, "cleanup Spectrum settings");
        const current = { scale: await id(page, config, "spectrumScaleSelect").inputValue(), frequency_scale: await id(page, config, "spectrumFrequencyScaleSelect").inputValue(), leakage: Number(await id(page, config, "spectrumLeakageInput").inputValue()) };
        const restoringComplex = (original.membership || []).some(function (name) {
          const row = (original.rows || []).find(function (item) { return item.name === name; });
          return row && !realRow(row);
        });
        // A Log display cannot accept a complex member.  First make the
        // temporary, compatible transition to Linear, then restore A's exact
        // membership/source, and finally its original (compatible) settings.
        if (restoringComplex && current.frequency_scale === "log") {
          await expectViewMutation(page, config, function () {
            return id(page, config, "spectrumFrequencyScaleSelect").selectOption("linear");
          }, log, "cleanup make Spectrum compatible with complex membership");
          current.frequency_scale = "linear";
        }
        await setMembership(page, config, original.membership || [], log, "cleanup membership");
        if (original.source) await selectAnalysisSource(page, config, original.source, log, "cleanup analysis source");
        if (original.settings && current.scale !== original.settings.scale) {
          await expectViewMutation(page, config, async function () {
            await id(page, config, "spectrumScaleSelect").selectOption(original.settings.scale);
          }, log, "cleanup Spectrum scale");
          current.scale = original.settings.scale;
        }
        if (original.settings && current.frequency_scale !== original.settings.frequency_scale) {
          await expectViewMutation(page, config, async function () {
            await id(page, config, "spectrumFrequencyScaleSelect").selectOption(original.settings.frequency_scale);
          }, log, "cleanup Spectrum frequency scale");
          current.frequency_scale = original.settings.frequency_scale;
        }
        if (original.settings && Number(current.leakage) !== Number(original.settings.leakage)) {
          await expectViewMutation(page, config, async function () {
            const input = id(page, config, "spectrumLeakageInput"); await input.fill(String(original.settings.leakage)); await input.dispatchEvent("change");
          }, log, "cleanup Spectrum leakage");
          current.leakage = original.settings.leakage;
        }
        if (original.roi) await commitRoi(page, config, original.roi, log, "cleanup ROI");
        await selectPlot(page, config, original.plot, log, "cleanup original plot");
        if (original.normalizeWasToggled) {
          const normalize = id(page, config, "normalizeYAxisCheckbox");
          if (!await normalize.isDisabled() && await normalize.isChecked() !== original.normalize) await normalize.setChecked(original.normalize, { timeout: TIMEOUT });
        }
      }
    } catch (error) {
      log(`cleanup Spectrum scenario: ${error.message}`);
    }
  }
}

testSpectrumSettingsRoi.requiredFeatures = [
  "frontend-state-management", "signal-analyser-displays", "time-limits", "spectrum-settings-roi",
];
module.exports = testSpectrumSettingsRoi;
