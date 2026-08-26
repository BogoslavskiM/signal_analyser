"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function registeredBlock(source, name) {
  const start = source.indexOf(`(function ${name}`);
  const end = source.indexOf("}(window));", start);
  if (start < 0 || end < 0) throw new Error(`missing ${name}`);
  return source.slice(start, end + "}(window));".length);
}

function loadHelpers(root) {
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const window = {};
  vm.runInNewContext(registeredBlock(settings, "registerSignalAnalyserRussianLocalization"), { window, Object, String, Array, RegExp, JSON });
  vm.runInNewContext(registeredBlock(app, "registerSignalAnalyserPreprocessOperation"), { window, Object, String, Array, RegExp, JSON, Number, Math });
  return { ru: window.SignalAnalyserRussianLocalization, operation: window.SignalAnalyserPreprocessOperation, app };
}

module.exports = async function task0157_0158PreprocessLocalization(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const { ru, operation, app } = loadHelpers(root);
  const source = { id: "signal-17", name: "Исходный", sample_rate_hz: 2_000, sampling_kind: "uniform", complex: false };

  ["auto", "Auto"].forEach((value) => assert(ru.unitLabel(value) === "Авто" && ru.optionLabel("time.units", value, value) === "Авто", `visible ${value} must be Russian Авто`));
  [["Hz", "Гц"], ["seconds", "с"], ["dB", "дБ"], ["samples", "отсчёты"], ["milliseconds", "мс"]].forEach(([wire, visible]) => {
    assert(ru.unitLabel(wire) === visible, `${wire} must have a Russian visible unit`);
  });
  [["display.show_legend", "Show legend", "Показывать легенду"], ["spectrum.frequency_limits", "Frequency Limits", "Пределы частоты"], ["spectrum.link_frequency", "Link spectrum frequencies", "Связать частоты"], ["persistence.power_limits", "Power Limits", "Пределы мощности"]].forEach(([id, legacy, visible]) => {
    assert(ru.settingLabel(id, legacy) === visible, `${id} must not expose the English setting label`);
  });
  assert(ru.knownText("Frequency, Hz") === "Частота, Гц" && ru.axisTitle("Power", "dB") === "Мощность, дБ", "axis and colorbar presentation must be Russian");
  const localized = ru.localizeItem({ id: "time.units", label: "Time units", units: "Hz", value: "auto", options: [{ value: "auto", label: "Auto" }, { value: "seconds", label: "seconds" }] });
  assert(localized.label === "Единицы времени" && localized.units === "Гц" && localized.options.map((item) => item.label).join(",") === "Авто,с", "known settings, units and options must be localized only for display");
  assert(localized.value === "auto", "localization must preserve the API wire value");

  assert(operation.hostCommand.eventName === "signal-analyser:host-command" && operation.hostCommand.command === "preprocess", "external host entry must use the exact command contract");
  assert(operation.hostCommand.accepts({ detail: { command: "preprocess", source_signal_id: "ignored" } }) && !operation.hostCommand.accepts({ detail: { command: "math" } }), "only the accepted preprocessing host command may open the dialog");
  assert(/function openPreprocessFromHost\(event\)[\s\S]*?mainSignalForPane\(paneById\(model\.activePane\)\)[\s\S]*?openSignalOperation\(document\.activeElement\)/.test(app), "host entry must resolve the current accepted main signal and ignore host-provided source data");
  assert(!/data-signal-preprocess(?:\s|=|>|['"])/.test(app), "the application must not add an in-app preprocessing button");
  assert(/Предобработка недоступна: выберите сигнал в таблице\./.test(app), "host entry without a main signal must retain the sanitized notification");

  const preprocess = operation.createState(source);
  assert(preprocess.operation === "bandpass", "the operation dialog must default to bandpass preprocessing");
  assert(operation.preprocessOperations.map((item) => item.value).join(",") === "bandpass,bandstop,highpass,lowpass,detrend,fill-missing,smooth,envelope,resample,custom-preprocess", "preprocessing selector must expose the exact V59 inventory");
  assert(!Object.prototype.hasOwnProperty.call(operation, "mathOperations") && !operation.preprocessOperations.some((item) => /^(fft|denoise|knn|abs|square|sqrt|signed-sqrt|multiply|custom)$/.test(item.value)), "old math, FFT, Denoise and KNN must not be selectable");

  let conditional = operation.switchOperation(preprocess, "detrend");
  assert(operation.schema(conditional).map((field) => field.id).join(",") === "method,nan_policy", "hidden conditional fields must not enter the schema");
  conditional = operation.updateParameter(conditional, "method", "piecewise_linear");
  assert(operation.schema(conditional).map((field) => field.id).join(",") === "method,breakpoints,nan_policy", "piecewise detrend must reveal only its breakpoint field plus required NaN policy");
  conditional = operation.switchOperation(preprocess, "smooth");
  conditional.parameters.window_duration = null;
  assert(operation.schema(conditional).map((field) => field.id).join(",").includes("duration_units,window_duration"), "duration smoothing must reveal duration-only fields");
  conditional = operation.updateParameter(conditional, "window_type", "factor");
  assert(operation.schema(conditional).map((field) => field.id).join(",").includes("smoothing_factor") && !operation.schema(conditional).some((field) => field.id === "window_duration"), "factor smoothing must hide duration-only fields");
  conditional = operation.switchOperation(preprocess, "envelope");
  conditional = operation.updateParameter(conditional, "method", "peak");
  assert(operation.schema(conditional).map((field) => field.id).join(",").includes("separation_units,maxima_separation"), "peak envelope must reveal only peak-dependent fields");

  let automatic = operation.switchOperation(preprocess, "smooth");
  automatic.parameters.window_duration = null;
  let automaticPayload = operation.payload(automatic);
  assert(automaticPayload.parameters.window_duration === null, "blank Авто numeric input must serialize as null");
  automatic = operation.updateParameter(automatic, "window_duration", 0);
  automaticPayload = operation.payload(automatic);
  assert(automaticPayload.parameters.window_duration === 0 && typeof automaticPayload.parameters.window_duration === "number", "numeric zero must remain distinct from automatic null");
  automatic = operation.updateParameter(automatic, "window_type", "factor");
  automatic.parameters.window_duration = 99;
  automatic.parameters.smoothing_factor = 0.25;
  automaticPayload = operation.payload(automatic);
  assert(!Object.prototype.hasOwnProperty.call(automaticPayload.parameters, "window_duration") && automaticPayload.parameters.smoothing_factor === 0.25, "payload must include visible fields only");

  assert(/var validation=helper\.validate\(state\.operationState\);[\s\S]*?if \(!validation\.valid\)[\s\S]*?return;[\s\S]*?api\.deriveSignal\(payload\)/.test(app), "invalid preprocessing must not call derive API");

  let invalid = operation.createState(source);
  invalid.parameters.lower_passband = 1_200;
  invalid.parameters.upper_passband = 1_100;
  const validation = operation.validate(invalid);
  assert(!validation.valid && validation.errors.lower_passband, "invalid visible filter bounds must keep a local validation error");
  assert(/signal-operation-row"\+\(error \? " has-error" : ""\)[\s\S]*?signal-operation-field-message/.test(app), "each invalid operation field must render an independent red-row/message state");
  assert(/var invalid=layer\.querySelector\("\.signal-operation-row\.has-error input/.test(app) && /if \(invalid\) invalid\.focus\(\)/.test(app), "invalid submit must focus the first invalid local field");
  assert(/state\.busy=true[\s\S]*?renderSignalOperation\(\)/.test(app) && /disabled=busy \|\| field\.disabled/.test(app), "busy submit must disable the form while retaining its values");
  assert(/role="alertdialog"/.test(app) && /payloadError\.code/.test(app) && !/state\.error=safeErrorText\(error/.test(app), "runtime errors must use the sanitized alertdialog instead of inline raw provider text");

  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const fetchCalls = [];
  const apiWindow = { fetch(url, options) { fetchCalls.push({ url, options }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }); } };
  vm.runInNewContext(api, { window: apiWindow, Object, Error, Promise, JSON });
  const envelope = Object.assign({ state_revision: 42 }, operation.payload(preprocess));
  await apiWindow.SignalAnalyserApi.deriveSignal(envelope);
  assert(fetchCalls.length === 1 && fetchCalls[0].url === "./api/signals/derive" && fetchCalls[0].options.method === "POST", "derive must POST to the exact API endpoint");
  const posted = JSON.parse(fetchCalls[0].options.body);
  assert(JSON.stringify(posted) === JSON.stringify(envelope) && posted.source_signal_id === "signal-17" && posted.operation_kind === "preprocess" && posted.operation === "bandpass", "derive POST must preserve the exact typed V59 envelope");
};
