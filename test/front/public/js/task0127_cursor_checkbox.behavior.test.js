"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function settle() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => new Promise((resolve) => setImmediate(resolve)));
}

function task0126Source(source) {
  const split = source.indexOf("\n\n(function registerSignalAnalyserBootstrapLoading");
  return source.slice(0, split);
}

function checkboxHarness(helper) {
  const checked = { checked:true, disabled:false, dataset:{} };
  const root = {
    attributes:{},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    querySelectorAll(selector) { return selector === "input[type='checkbox']" ? [checked] : []; }
  };
  helper.setBusyPreservingCheckboxes(root, true);
  const busy = { node:checked, checked:checked.checked, disabled:checked.disabled, ariaBusy:root.attributes["aria-busy"] };
  helper.setBusyPreservingCheckboxes(root, false);
  return { checked, busy, root };
}

function settingsHarness(source) {
  const documentListeners = {};
  const windowListeners = {};
  const timers = [];
  const updates = [];
  const events = [];
  const host = { innerHTML:"", querySelectorAll() { return []; } };
  const document = {
    activeElement:null,
    querySelector(selector) { return selector === "[data-testid='settings-content']" ? host : null; },
    querySelectorAll() { return []; },
    addEventListener(type, listener) { (documentListeners[type] || (documentListeners[type] = [])).push(listener); }
  };
  const window = {
    SignalAnalyserApi: {
      updateSetting(payload) {
        updates.push(payload);
        return Promise.resolve({ state_revision:payload.state_revision + 1, settings:settingsDocument(payload.state_revision + 1) });
      },
      settings() { return Promise.resolve(settingsDocument(1)); }
    },
    SignalAnalyserValueSelect: { markup() { return ""; }, configure() {}, reconcile() {} },
    SignalAnalyserNumeric: { parse(value) { const number=Number(value); return { valid:Number.isFinite(number), value:number, error:"Некорректно" }; } },
    SignalAnalyserTask0126: { decorateNoHistory() {} },
    addEventListener(type, listener) { (windowListeners[type] || (windowListeners[type] = [])).push(listener); },
    dispatchEvent(event) { events.push(event); (windowListeners[event.type] || []).forEach((listener) => listener(event)); },
    setTimeout(callback, delay) { const timer={ callback, delay, cleared:false }; timers.push(timer); return timer; },
    clearTimeout(timer) { if (timer) timer.cleared=true; },
    requestAnimationFrame(callback) { callback(); return 1; }
  };
  class CustomEvent { constructor(type, init) { this.type=type; this.detail=init && init.detail; } }
  vm.runInNewContext(source, { window, document, CustomEvent, Promise, Object, Array, String, Number, Math, setTimeout:window.setTimeout, clearTimeout:window.clearTimeout }, { filename:"settings.js" });
  function input(fieldId, initial) {
    return {
      dataset:{ settingId:fieldId }, type:"text", value:initial || "", selectionStart:0, selectionEnd:0,
      focus() { document.activeElement=this; }, setSelectionRange(start, end) { this.selectionStart=start; this.selectionEnd=end; }
    };
  }
  async function typeCharacters(node, text) {
    for (const character of text) {
      node.value += character;
      node.selectionStart=node.selectionEnd=node.value.length;
      (documentListeners.input || []).forEach((listener) => listener({ target:node }));
      assertTimer(timers, 150);
      const pending=timers.filter((timer) => !timer.cleared).pop();
      pending.callback();
      await settle();
    }
  }
  return { window, document, timers, updates, events, input, typeCharacters };
}

function assertTimer(timers, delay) {
  const timer=timers.filter((candidate) => !candidate.cleared).pop();
  if (!timer || timer.delay !== delay) throw new Error("name input must keep exactly one pending 150ms autosave");
}

function settingsDocument(revision) {
  return {
    display_id:"display-1", state_revision:revision,
    fields:[
      { id:"display.name", kind:"string", value:"", visible:true, enabled:true, effect_status:"requires_apply" },
      { id:"pane.name", kind:"string", value:"", visible:true, enabled:true, effect_status:"requires_apply" }
    ], readouts:[]
  };
}

module.exports = async function task0127CursorCheckboxBehavior(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");

  const taskWindow = {};
  vm.runInNewContext(task0126Source(app), { window:taskWindow, document:{ querySelectorAll() { return []; } }, Array, Number, Math, String }, { filename:"app-task0126.js" });
  const checkbox = checkboxHarness(taskWindow.SignalAnalyserTask0126);
  assert(checkbox.busy.node === checkbox.checked && checkbox.busy.checked && checkbox.busy.disabled && checkbox.busy.ariaBusy === "true", "Engee Add busy submit must retain the exact selected checkbox node, checked state, disabled state and aria-busy region");
  assert(checkbox.checked.checked && !checkbox.checked.disabled && checkbox.root.attributes["aria-busy"] === "false", "leaving Engee Add busy submit must restore the same checked checkbox node without clearing its selection");

  const harness = settingsHarness(settings);
  harness.window.SignalAnalyserSettings.setContext("display-1", 1);
  harness.window.SignalAnalyserSettings.accept(settingsDocument(1));
  harness.window.SignalAnalyserSettings.beginCustomRender();
  harness.window.SignalAnalyserSettings.renderRows(["display.name", "pane.name"]);

  for (const fieldId of ["display.name", "pane.name"]) {
    const node=harness.input(fieldId, "");
    node.focus();
    const identity=node;
    await harness.typeCharacters(node, "Тест");
    assert(harness.document.activeElement === identity && node === identity, `${fieldId} must preserve the original focused input node across all character saves`);
    assert(node.value === "Тест" && node.selectionStart === 4 && node.selectionEnd === 4, `${fieldId} caret/value must advance through four real input/autosave response boundaries`);
  }
  assert(harness.updates.length === 8 && harness.updates.filter((payload) => payload.field_id === "display.name").length === 4 && harness.updates.filter((payload) => payload.field_id === "pane.name").length === 4, "each name character must publish once after the 150ms debounce without suppressing later input");
  assert(harness.events.filter((event) => event.type === "signal-settings-name-preview").length === 8 && harness.events.filter((event) => event.type === "signal-settings-saved").length === 8, "each name edit must optimistically preview then reconcile its accepted autosave response");
};
