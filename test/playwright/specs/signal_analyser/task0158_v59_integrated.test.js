"use strict";

// V60 is deliberately one integrated, production-only workflow. It is not
// part of the old task0158 suite: that suite describes removed math actions.
const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifactDir = path.join(__dirname, "..", "..", "artifacts", "TASK-0158-V60");
const prototypeUrl = "file:///Users/makar/work/Genie_Tests/SignalAnalyser/architecture/design/current/prototype/index.html";
const expectedOperations = [
  "Полосовой фильтр", "Режекторный фильтр", "Фильтр высоких частот",
  "Фильтр низких частот", "Удаление тренда", "Заполнение пропущенных значений",
  "Сглаживание", "Огибающая", "Передискретизация", "Пользовательская операция",
];
const removedOperationWords = ["Модуль", "Квадрат", "Корень", "Умножить", "FFT", "Denoise", "KNN", "Подавление шума"];
const operationAssets = {
  "Полосовой фильтр": "operation-filter.svg", "Режекторный фильтр": "operation-filter.svg",
  "Фильтр высоких частот": "operation-filter.svg", "Фильтр низких частот": "operation-filter.svg",
  "Удаление тренда": "operation-detrend.svg", "Заполнение пропущенных значений": "operation-fill-missing.svg",
  "Сглаживание": "operation-smooth.svg", "Огибающая": "operation-envelope.svg",
  "Передискретизация": "operation-resample.svg", "Пользовательская операция": "function.svg",
};
const priorRunOwnedNames = [
  "V60 E2E 1 1787770054117", "V60 E2E 2 1787770072733", "V60 E2E 3 1787770074082",
  "V60 E2E 4 1787770076751", "V60 E2E 5 1787770077625", "V60 E2E 6 1787770078868",
  "V60 E2E 7 1787770079486", "V60 E2E 8 1787770080031",
  "V60 E2E 8 1787770080031_resample", "V60 E2E 8 1787770080031_resample_preprocess",
];

function ensureArtifacts() { fs.mkdirSync(artifactDir, { recursive: true }); }
function writeEvidence(value) { ensureArtifacts(); fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(value, null, 2)); }
async function shot(page, name) { ensureArtifacts(); await page.screenshot({ path: path.join(artifactDir, name), fullPage: true }); }
async function ready(page, config) {
  await waitForAppReady(page, config, { timeout: 30000 });
  const loader = page.locator(testIdSelector(config.app.loaderTestId));
  if (await loader.count()) await loader.waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForFunction(function () {
    const shell = document.querySelector("[data-testid='app-shell']");
    return shell && shell.getAttribute("aria-busy") !== "true";
  }, { timeout: 30000 });
}
async function selectedDisplay(page) {
  return page.locator("[data-testid='display-tabs'] [role='tab']").evaluateAll(function (nodes) {
    const selected = nodes.find(function (node) { return node.getAttribute("aria-selected") === "true"; });
    return selected && selected.getAttribute("data-display-select");
  });
}
async function chooseValue(page, input, label) {
  await input.click();
  const popup = page.locator(testIdSelector("value-select-options"));
  await popup.waitFor({ state: "visible", timeout: 10000 });
  await popup.getByText(label, { exact: true }).click();
  await popup.waitFor({ state: "hidden", timeout: 10000 });
}
async function chooseOperation(page, dialog, label) {
  await chooseValue(page, dialog.locator(testIdSelector("signal-operation-select-input")), label);
}
async function selectHarmonic(page, config) {
  const displayId = await selectedDisplay(page);
  const shell = page.locator(testIdSelector("app-shell"));
  const activePane = await shell.getAttribute("data-active-pane");
  if (!displayId || !activePane) throw new Error("current display/active pane is unavailable for atomic Harmonic selection");
  const pane = page.locator(testIdSelector(`plot-pane-${activePane}`));
  await pane.waitFor({ state: "visible", timeout: 30000 });
  const host = page.locator(`[data-pane-host=${JSON.stringify(`${displayId}::${activePane}`)}]`);
  await pane.click();
  const row = page.locator("[data-signal-row][data-signal-name='Гармонический сигнал']");
  await row.waitFor({ state: "visible", timeout: 30000 });
  let viewPayload = null;
  const view = page.waitForResponse(function (item) {
    if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/view")) return false;
    viewPayload = item.request().postDataJSON(); return true;
  }, { timeout: 30000 });
  const output = page.waitForResponse(function (item) {
    const url = new URL(item.url());
    return item.request().method() === "GET" && url.pathname.endsWith("/api/outputs/active") && url.searchParams.get("display_id") === displayId && url.searchParams.get("pane_id") === activePane;
  }, { timeout: 30000 });
  await row.locator("td:nth-child(2) .signal-cell-value").click();
  const viewResponse = await view;
  if (viewResponse.status() !== 200 || !viewPayload || viewPayload.analysis_signal !== "Гармонический сигнал" || !Array.isArray(viewPayload.visible_signals) || !viewPayload.visible_signals.includes("Гармонический сигнал")) {
    throw new Error(`Harmonic LMB /api/view contract failed: status=${viewResponse.status()} payload=${JSON.stringify(viewPayload)}`);
  }
  const outputResponse = await output;
  if (outputResponse.status() !== 200) throw new Error(`Harmonic active output failed: HTTP ${outputResponse.status()}`);
  await host.waitFor({ state: "visible", timeout: 30000 });
  await waitForReadyPlot(page, host);
  return row;
}
async function openHostPreprocess(page) {
  await page.evaluate(function () {
    window.dispatchEvent(new CustomEvent("signal-analyser:host-command", {
      detail: { command: "preprocess", source_signal_id: "must-not-replace-current-lmb-source" },
    }));
  });
  const dialog = page.locator(testIdSelector("signal-operation-dialog"));
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  return dialog;
}
async function closeOperation(page, dialog) {
  const cancel = dialog.locator("[data-signal-operation-cancel]");
  if (await cancel.isEnabled()) await cancel.click(); else await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 10000 });
}
function operationFailure(label, message, submission) {
  const error = new Error(`${label}: ${message}`);
  error.submission = submission;
  return error;
}
async function deleteOwnedSignal(page, config, name) {
  if (!/^V60 E2E /.test(name)) throw new Error(`refusing cleanup outside exact V60 ownership: ${name}`);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // Reload is intentional: a delete must use the just-fetched state
    // revision, never the revision left by a previous derived signal/delete.
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page, config);
    const row = page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(name)}]`);
    if (!await row.count()) return false;
    const response = page.waitForResponse(function (item) {
      if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals")) return false;
      const payload = item.request().postDataJSON();
      return payload && payload.operation === "delete" && payload.signal_name === name;
    }, { timeout: 30000 });
    await row.locator("[data-signal-delete]").click();
    const received = await response;
    if (received.status() === 200) {
      await row.waitFor({ state: "detached", timeout: 30000 });
      await ready(page, config);
      return true;
    }
    if (received.status() !== 409 || attempt === 1) throw new Error(`cleanup ${name}: HTTP ${received.status()}`);
  }
  return false;
}
async function waitForReadyPlot(page, host) {
  await page.waitForFunction(function (node) {
    const plot = node && (node.classList.contains("js-plotly-plot") ? node : node.querySelector(".js-plotly-plot"));
    return node && node.dataset.plotReady === "true" && plot && Array.isArray(plot.data) && plot.data.length > 0;
  }, await host.elementHandle(), { timeout: 60000 });
}
async function runOperation(page, config, label, name) {
  const dialog = await openHostPreprocess(page);
  await chooseOperation(page, dialog, label);
  if (label === "Передискретизация") {
    await dialog.locator("[data-signal-operation-parameter='target_sample_rate_hz']").fill("1024");
  }
  if (label === "Пользовательская операция") {
    await dialog.locator("[data-signal-operation-parameter='body']").fill("reverse(init_signal)");
  }
  await dialog.locator("[data-signal-operation-name]").fill(name);
  // This is deliberately read immediately before click.  The paired request
  // body is captured even on a provider error so a target-name discrepancy is
  // evidence, rather than an opaque test assertion.
  const submittedName = await dialog.locator("[data-signal-operation-name]").inputValue();
  let payload = null;
  const response = page.waitForResponse(function (item) {
    if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals/derive")) return false;
    payload = item.request().postDataJSON();
    return true;
  }, { timeout: 90000 });
  await dialog.locator("[data-signal-operation-submit]").click();
  const received = await response;
  const submission = { requestedTargetName: name, inputTargetName: submittedName, payloadTargetName: payload && payload.target_name, payload: payload || null, responseStatus: received.status(), inputWasRebased: submittedName !== name };
  if (!payload || payload.target_name !== submittedName) {
    throw operationFailure(label, `target mismatch input=${JSON.stringify(submittedName)} payload.target_name=${JSON.stringify(payload && payload.target_name)}`, submission);
  }
  if (received.status() !== 200) throw operationFailure(label, `HTTP ${received.status()}`, submission);
  await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(submittedName)}]`).waitFor({ state: "visible", timeout: 90000 });
  await closeOperation(page, dialog);
  return submission;
}
async function setPaneType(page, host, type) {
  const runtimeKey = await host.getAttribute("data-pane-host");
  const paneId = String(runtimeKey || "").split("::")[1];
  if (!paneId) throw new Error("active plot host does not expose a pane id");
  const input = page.locator(testIdSelector(`pane-type-${paneId}-input`));
  await input.waitFor({ state: "visible", timeout: 10000 });
  const wanted = ({ time: "Временная область", spectrum: "Спектр" })[type];
  await chooseValue(page, input, wanted);
  await page.waitForFunction(function (args) {
    const node = document.querySelector(`[data-testid="pane-type-${args.paneId}-input"]`);
    return node && node.value === args.wanted;
  }, { paneId: paneId, wanted: wanted }, { timeout: 30000 });
  await waitForReadyPlot(page, host);
}
async function calculateExtrema(page, host, kind) {
  await page.locator(testIdSelector("inspector-tab-peaks")).click();
  const calculate = page.locator(testIdSelector("extrema-calculate")).first();
  await calculate.waitFor({ state: "visible", timeout: 30000 });
  const chronology = [];
  const listener = function (request) {
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/api/peaks/active")) chronology.push({ method: request.method(), pathname: pathname });
  };
  page.on("request", listener);
  try {
    const response = page.waitForResponse(function (item) {
      return item.request().method() === "POST" && new URL(item.url()).pathname.endsWith("/api/peaks/active");
    }, { timeout: 30000 });
    await calculate.click();
    const received = await response;
    if (!received.ok()) throw new Error(`${kind} extrema: HTTP ${received.status()}`);
    const rows = page.locator("[data-testid='peaks-table'] tbody tr");
    await rows.first().waitFor({ state: "visible", timeout: 60000 });
    const markers = await host.evaluate(function (node) {
      const plot = node.querySelector(".js-plotly-plot") || node;
      const traces = plot.data || plot._fullData || [];
      return traces.filter(function (trace) { return trace && trace.meta && trace.meta.signal_analyser_peaks_overlay === true; }).length;
    });
    if (!(markers > 0)) throw new Error(`${kind} extrema: markers were not projected onto the plot`);
    const postIndex = chronology.findIndex(function (item) { return item.method === "POST"; });
    const prematureGet = chronology.slice(0, postIndex < 0 ? chronology.length : postIndex).some(function (item) { return item.method === "GET"; });
    if (prematureGet) throw new Error(`${kind} extrema: GET polling happened before explicit POST`);
    return { rows: await rows.count(), markers: markers, chronology: chronology };
  } finally { page.off("request", listener); }
}

async function task0158V60Integrated({ appUrl, assert, config, page, step }) {
  const evidence = { target: appUrl, expectedRevision: process.env.E2E_EXPECTED_REVISION, startedAt: new Date().toISOString(), checks: [], operations: [], cleanup: [] };
  const created = [];
  const attempted = [];
  const functionalFailures = [];
  let temporaryDisplay = "";
  let originalDisplay = "";
  try {
    await step("V60 prototype interaction contract", async function () {
      await page.goto(prototypeUrl, { waitUntil: "domcontentloaded" });
      await page.bringToFront();
      await page.locator(testIdSelector("app-shell")).waitFor({ state: "visible", timeout: 30000 });
      const row = page.locator("[data-signal-row]").first();
      await row.click();
      await row.locator("[data-signal-operation]").click();
      const dialog = page.locator(testIdSelector("signal-operation-dialog"));
      await dialog.waitFor({ state: "visible", timeout: 10000 });
      assert((await dialog.locator(testIdSelector("signal-operation-source")).inputValue()).trim().length > 0, "prototype operation dialog must show selected source");
      await chooseOperation(page, dialog, "Сглаживание");
      assert((await dialog.innerText()).includes("Авто"), "prototype must use Russian Авто for blank automatic field");
      await shot(page, "prototype-preprocess.png");
      await closeOperation(page, dialog);
      evidence.checks.push({ name: "prototype: source + preprocess + Авто", result: "passed" });
    });

    await step("PROD availability and exact preprocess inventory", async function () {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      await page.bringToFront();
      await ready(page, config);
      originalDisplay = await selectedDisplay(page);
      assert(!!originalDisplay, "PROD must have an active display");
      await selectHarmonic(page, config);
      const dialog = await openHostPreprocess(page);
      assert(await dialog.locator(testIdSelector("signal-operation-source")).inputValue() === "Гармонический сигнал", "host command must ignore supplied source and use current plain-LMB signal");
      const select = dialog.locator(testIdSelector("signal-operation-select-input"));
      await select.click();
      const popup = page.locator(testIdSelector("value-select-options"));
      await popup.waitFor({ state: "visible", timeout: 10000 });
      const options = popup.locator("[role='option']");
      const labels = await options.allTextContents();
      assert(JSON.stringify(labels.map(function (x) { return x.trim(); })) === JSON.stringify(expectedOperations), `selector must expose exactly 10 V60 operations, got ${JSON.stringify(labels)}`);
      const menuText = await popup.innerText();
      removedOperationWords.forEach(function (word) { assert(!menuText.includes(word), `removed operation ${word} must be absent`); });
      const iconEvidence = [];
      for (let index = 0; index < expectedOperations.length; index += 1) {
        const label = expectedOperations[index];
        const option = options.nth(index);
        const icon = option.locator("[data-value-select-option-icon]");
        await icon.waitFor({ state: "visible", timeout: 10000 });
        const geometry = await icon.evaluate(function (node) {
          const rect = node.getBoundingClientRect();
          return { width: rect.width, height: rect.height, src: node.getAttribute("src"), alt: node.getAttribute("alt"), ariaHidden: node.getAttribute("aria-hidden") };
        });
        assert(geometry.width === 16 && geometry.height === 16, `${label}: option icon must be 16×16`);
        assert(geometry.alt === "" && geometry.ariaHidden === "true", `${label}: option icon must be decorative`);
        assert(String(geometry.src).endsWith(operationAssets[label]), `${label}: option icon must use mapped asset ${operationAssets[label]}`);
        iconEvidence.push({ label: label, asset: operationAssets[label], geometry: geometry });
      }
      await page.keyboard.press("Escape");
      const formEvidence = [];
      for (const label of expectedOperations) {
        await chooseOperation(page, dialog, label);
        const fields = await dialog.locator("[data-signal-operation-parameter]").evaluateAll(function (nodes) {
          return nodes.map(function (node) { return node.getAttribute("data-signal-operation-parameter"); }).filter(Boolean);
        });
        assert(fields.length > 0, `${label}: operation form must expose relevant parameter fields`);
        const formText = await dialog.locator("[data-signal-operation-form]").innerText();
        formEvidence.push({ label: label, parameterFields: fields, hasRussianAuto: formText.includes("Авто"), hasUnits: /Гц|дБ|с|отсч/.test(formText) });
      }
      await chooseOperation(page, dialog, "Сглаживание");
      const triggerIcon = dialog.locator("[data-value-select-trigger-icon]");
      await triggerIcon.waitFor({ state: "visible", timeout: 10000 });
      const triggerGeometry = await triggerIcon.evaluate(function (node) {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height, src: node.getAttribute("src"), alt: node.getAttribute("alt"), ariaHidden: node.getAttribute("aria-hidden") };
      });
      assert(triggerGeometry.width === 16 && triggerGeometry.height === 16, "closed operation trigger icon must be 16×16");
      assert(triggerGeometry.alt === "" && triggerGeometry.ariaHidden === "true", "closed operation trigger icon must be decorative");
      assert(String(triggerGeometry.src).endsWith(operationAssets["Сглаживание"]), "closed operation trigger must use smoothing asset");
      assert((await dialog.innerText()).includes("Авто"), "PROD smooth form must show Russian Авто");
      await shot(page, "prod-v60-preprocess-icons.png");
      await closeOperation(page, dialog);
      evidence.checks.push({ name: "PROD: exact 10 operations / selected LMB source / Russian Авто / mapped 16px decorative icons", result: "passed", triggerIcon: triggerGeometry, optionIcons: iconEvidence, forms: formEvidence });
    });

    await step("all ten nominal preprocessing operations create signals", async function () {
      // A fresh accepted snapshot is required before the first derive.  This
      // avoids turning a stale UI revision into a false provider failure.
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      await ready(page, config);
      await selectHarmonic(page, config);
      for (let index = 0; index < expectedOperations.length; index += 1) {
        const label = expectedOperations[index];
        const name = `V60 E2E ${index + 1} ${Date.now()}`;
        attempted.push(name);
        let retried = false;
        for (;;) {
          try {
            // Each operation is independently sourced from the accepted LMB
            // signal; deriving a preceding result must not silently retarget
            // the next operation.
            await selectHarmonic(page, config);
            const submission = await runOperation(page, config, label, name);
            created.push(submission.inputTargetName);
            evidence.operations.push({ label: label, result: "passed", requestedName: name, name: submission.inputTargetName, operation: submission.payload && submission.payload.operation, retried: retried, submission: submission });
            break;
          } catch (error) {
            const message = String(error && error.message || error);
            if (error && error.submission && error.submission.inputTargetName) attempted.push(error.submission.inputTargetName);
            if (!retried && /HTTP 409\b/.test(message)) {
              retried = true;
              await page.goto(appUrl, { waitUntil: "domcontentloaded" });
              await ready(page, config);
              await selectHarmonic(page, config);
              continue;
            }
            evidence.operations.push({ label: label, result: "failed", error: message, retried: retried, submission: error && error.submission || null });
            functionalFailures.push(`preprocess ${label}: ${message}`);
            // A failed derive can leave the dialog busy.  Reloading releases
            // only this test flow; subsequent nominal operations still run.
            await page.goto(appUrl, { waitUntil: "domcontentloaded" });
            await ready(page, config);
            await selectHarmonic(page, config);
            break;
          }
        }
      }
      await shot(page, "prod-preprocess-results.png");
      evidence.checks.push({ name: "nominal preprocessing execution", result: functionalFailures.length ? "failed" : "passed", detail: evidence.operations });
    });

    await step("field-local validation and sanitized runtime error", async function () {
      try {
        const dialog = await openHostPreprocess(page);
        await chooseOperation(page, dialog, "Полосовой фильтр");
        await dialog.locator("[data-signal-operation-parameter='lower_passband']").fill("");
        await dialog.locator("[data-signal-operation-submit]").click();
        const local = dialog.locator("[data-signal-operation-field='lower_passband']");
        assert(await local.locator("input[aria-invalid='true']").count() === 1, "invalid filter bound must have its own field-local red validation state");
        const localCopy = (await local.innerText()).trim();
        assert(localCopy.length > 0 && !/TypeError|ArgumentError|Julia|Engee/i.test(localCopy), "field-local validation must be sanitized Russian copy");
        await chooseOperation(page, dialog, "Пользовательская операция");
        await dialog.locator("[data-signal-operation-parameter='body']").fill('error("V60 expected failure")');
        await dialog.locator("[data-signal-operation-name]").fill(`V60 E2E failure ${Date.now()}`);
        const response = page.waitForResponse(function (item) { return item.request().method() === "POST" && new URL(item.url()).pathname.endsWith("/api/signals/derive"); }, { timeout: 30000 });
        await dialog.locator("[data-signal-operation-submit]").click();
        const received = await response;
        const providerPayload = await received.json().catch(function () { return null; });
        assert(received.status() >= 400, "intentional custom failure must not succeed");
        const alert = page.locator(testIdSelector("signal-operation-error-dialog"));
        await alert.waitFor({ state: "visible", timeout: 30000 });
        const copy = await alert.innerText();
        assert(copy.includes("Операция не выполнена") && !/TypeError|ArgumentError|Julia|Engee|SubString|expected failure/i.test(copy), "runtime error must use sanitized Russian alertdialog");
        await shot(page, "prod-sanitized-operation-error.png");
        await alert.locator("[data-signal-operation-error-confirm]").click();
        await closeOperation(page, dialog);
        evidence.checks.push({ name: "field-local Russian validation + sanitized alertdialog", result: "passed", providerStatus: received.status(), providerPayload: providerPayload });
      } catch (error) {
        const visibleStatus = await page.locator("[data-testid='signal-operation-dialog'] [role='status']:visible").allTextContents().catch(function () { return []; });
        functionalFailures.push(`validation/error dialog: ${String(error && error.message || error)}`);
        evidence.checks.push({ name: "field-local Russian validation + sanitized alertdialog", result: "failed", error: String(error && error.message || error), visibleStatus: visibleStatus });
        await page.goto(appUrl, { waitUntil: "domcontentloaded" });
        await ready(page, config);
      }
    });

    await step("isolated Time/Spectrum extrema and dual-cursor trim", async function () {
      let host;
      try {
        const beforeCount = await page.locator("[data-testid='display-tabs'] [role='tab']").count();
        await page.locator(testIdSelector("add-display")).click();
        await page.waitForFunction(function (count) { return document.querySelectorAll("[data-testid='display-tabs'] [role='tab']").length === count; }, beforeCount + 1, { timeout: 30000 });
        await ready(page, config);
        temporaryDisplay = await selectedDisplay(page);
        assert(temporaryDisplay && temporaryDisplay !== originalDisplay, "test must own an isolated display for plots/crop");
        await selectHarmonic(page, config);
        host = page.locator(`[data-pane-host^=${JSON.stringify(temporaryDisplay + "::")}]`).first();
        await host.waitFor({ state: "visible", timeout: 30000 });
        await waitForReadyPlot(page, host);
      } catch (error) {
        const message = `isolated display preparation: ${String(error && error.message || error)}`;
        functionalFailures.push(message);
        ["Time extrema POST → rows + markers", "Spectrum extrema POST → rows + markers", "dual cursor trim: source dropdown/default name/crop"].forEach(function (name) {
          evidence.checks.push({ name: name, result: "failed", error: message });
        });
        return;
      }
      try {
        await setPaneType(page, host, "time"); await ready(page, config);
        const timePeaks = await calculateExtrema(page, host, "Time");
        evidence.checks.push({ name: "Time extrema POST → rows + markers", result: "passed", detail: timePeaks });
      } catch (error) {
        functionalFailures.push(`Time extrema: ${String(error && error.message || error)}`);
        evidence.checks.push({ name: "Time extrema POST → rows + markers", result: "failed", error: String(error && error.message || error) });
      }
      try {
        await setPaneType(page, host, "spectrum"); await ready(page, config);
        const spectrumPeaks = await calculateExtrema(page, host, "Spectrum");
        evidence.checks.push({ name: "Spectrum extrema POST → rows + markers", result: "passed", detail: spectrumPeaks });
      } catch (error) {
        functionalFailures.push(`Spectrum extrema: ${String(error && error.message || error)}`);
        evidence.checks.push({ name: "Spectrum extrema POST → rows + markers", result: "failed", error: String(error && error.message || error) });
      }
      try {
        await setPaneType(page, host, "time"); await ready(page, config);
        const paneId = (await host.getAttribute("data-pane-host")).split("::")[1];
        await page.locator(`[data-pane-menu=${JSON.stringify(paneId)}]`).click();
        await page.locator(testIdSelector("pane-menu-dual-cursor")).click();
        await host.locator("[data-graph-cursor-overlay] [data-cursor-index]").nth(1).waitFor({ state: "visible", timeout: 10000 });
        const trim = host.locator(testIdSelector("pane-trim-signal"));
        await trim.waitFor({ state: "visible", timeout: 10000 });
        await trim.click();
        const trimDialog = page.locator(testIdSelector("signal-trim-dialog"));
        await trimDialog.waitFor({ state: "visible", timeout: 10000 });
        const source = trimDialog.locator("[data-signal-trim-source]");
        const name = trimDialog.locator("[data-signal-trim-name]");
        assert(await source.isVisible() && (await source.inputValue()).trim().length > 0, "trim dialog must show a selected source dropdown");
        const cropName = `V60 E2E crop ${Date.now()}`;
        const defaultName = await name.inputValue();
        assert(defaultName.trim().length > 0, "trim dialog must fill default target name");
        await name.fill(cropName);
        let cropPayload = null;
        const cropResponse = page.waitForResponse(function (item) {
          if (item.request().method() !== "POST" || !new URL(item.url()).pathname.endsWith("/api/signals/crop")) return false;
          cropPayload = item.request().postDataJSON();
          return true;
        }, { timeout: 30000 });
        await trimDialog.locator("[data-signal-trim-submit]").click();
        const crop = await cropResponse;
        assert(crop.status() === 200, `crop must return HTTP 200, got ${crop.status()}`);
        assert(cropPayload && cropPayload.target_name === cropName && cropPayload.source_signal_id && Number.isFinite(cropPayload.min_s) && Number.isFinite(cropPayload.max_s) && cropPayload.min_s <= cropPayload.max_s, "crop request must preserve selected source and exact canonical interval");
        await page.locator(testIdSelector("inspector-tab-signals")).click();
        await page.locator(`[data-signal-row][data-signal-name=${JSON.stringify(cropName)}]`).waitFor({ state: "visible", timeout: 30000 });
        created.push(cropName);
        await shot(page, "prod-time-spectrum-extrema-trim.png");
        evidence.checks.push({ name: "dual cursor trim: source dropdown/default name/crop", result: "passed", name: cropName, defaultName: defaultName, payload: cropPayload });
      } catch (error) {
        functionalFailures.push(`dual cursor trim: ${String(error && error.message || error)}`);
        evidence.checks.push({ name: "dual cursor trim: source dropdown/default name/crop", result: "failed", error: String(error && error.message || error) });
      }
    });
  } finally {
    for (const name of Array.from(new Set(created.concat(attempted).concat(priorRunOwnedNames))).reverse()) {
      try { if (await deleteOwnedSignal(page, config, name)) evidence.cleanup.push({ name: name, result: "deleted" }); }
      catch (error) { evidence.cleanup.push({ name: name, result: "not_deleted", error: String(error && error.message || error) }); }
    }
    if (temporaryDisplay) {
      try {
        const close = page.locator(`[data-testid='display-close-${temporaryDisplay}']`);
        if (await close.count()) { await close.click(); await ready(page, config); evidence.cleanup.push({ display: temporaryDisplay, result: "closed" }); }
      } catch (error) { evidence.cleanup.push({ display: temporaryDisplay, result: "not_closed", error: String(error && error.message || error) }); }
    }
    if (originalDisplay) {
      const tab = page.locator(`[data-testid='display-tab-${originalDisplay}']`);
      if (await tab.count()) await tab.click().catch(function () {});
    }
    evidence.finishedAt = new Date().toISOString();
    writeEvidence(evidence);
  }
  assert(functionalFailures.length === 0, functionalFailures.join("; "));
}

task0158V60Integrated.scenarioFlags = ["TASK-0158-V60"];
module.exports = task0158V60Integrated;
