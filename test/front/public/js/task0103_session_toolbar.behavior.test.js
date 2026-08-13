"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function settle() { return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()); }

function createHarness() {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const chunk = app.match(/  function sessionImportNode\(\)[\s\S]*?\n  function plotEnvelope\(/)[0].replace(/\n  function plotEnvelope\($/, "");
  const listeners = new Map(); const blobs = []; const urls = []; const revoked = []; const toasts = []; const timeouts = [];
  const attributes = new WeakMap();
  function node(extra) {
    const value = Object.assign({ dataset:{}, style:{}, disabled:false, hidden:false, isConnected:true, children:[],
      setAttribute(name, raw) { const a = attributes.get(this) || {}; a[name] = String(raw); attributes.set(this, a); },
      removeAttribute(name) { const a = attributes.get(this) || {}; delete a[name]; attributes.set(this, a); },
      getAttribute(name) { const a = attributes.get(this) || {}; return Object.prototype.hasOwnProperty.call(a, name) ? a[name] : null; },
      addEventListener(type, fn) { this.listeners = this.listeners || {}; this.listeners[type] = fn; },
      focus() { document.activeElement = this; this.focused = (this.focused || 0) + 1; },
      click() { this.clicked = (this.clicked || 0) + 1; },
      remove() { this.removed = true; if (this.dataset.testid === "session-import-dialog") dialog = null; },
      querySelector(selector) { return this.children.find((item) => selector.indexOf(item.dataset.testid) >= 0) || null; },
      querySelectorAll(selector) { return selector === "button:not([disabled])" ? this.children.filter((item) => !item.disabled) : []; }
    }, extra || {});
    return value;
  }
  let dialog = null;
  const shell = node(); const picker = node({ value:"", files:[] }); const body = node({ appendChild(item) { this.children.push(item); item.parentElement = this; if (item.dataset.testid === "session-import-dialog") dialog = item; } });
  const document = { activeElement:null, body,
    querySelector(selector) { if (selector === "[data-testid='app-shell']") return shell; if (selector === "[data-testid='session-file-input']") return picker; if (selector === "[data-testid='session-import-dialog']") return dialog; return null; },
    querySelectorAll() { return []; },
    createElement(tag) { if (tag === "a") return node({ tagName:"A" }); const made = node(); Object.defineProperty(made, "innerHTML", { set(markup) { this.html = markup; this.children = ["session-import-close", "session-import-cancel", "session-import-confirm"].map((id) => node({ dataset:{ testid:id }, disabled:new RegExp("data-testid='" + id + "'[^>]* disabled").test(markup) })); } }); return made; }
  };
  const model = { revision:7, sessionImport:{ open:false, busy:false, file:null, document:null, error:"", trigger:null }, pollByPane:{ a:1 }, peaksPollByPane:{ b:2 }, outputs:{ old:true }, outputTokens:{ old:1 }, plotQueue:{ old:true }, peaksRecord:{}, peaksRecords:{ a:{} }, peaksTokens:{ a:1 }, peaksEnableByPane:{ a:true }, peaksDraft:{}, peaksApplying:true, peaksApplyQueued:true, peaksMessage:"old", extremaTargetKey:"x", measurementsRecord:{}, measurementsToken:3, layoutDraft:{} };
  const apiCalls = []; const stats = { getStateCount:0, outputCount:0, loadCount:0 };
  const api = { session() { apiCalls.push({ type:"get" }); return Promise.resolve({ document:{ z:1, nested:{ a:true } } }); }, importSession(payload) { apiCalls.push({ type:"post", payload }); return Promise.resolve({ ok:true }); } };
  const window = { SignalAnalyserApi:api, URL:{ createObjectURL(blob) { blobs.push(blob); const url = "blob:" + blobs.length; urls.push(url); return url; }, revokeObjectURL(url) { revoked.push(url); } }, requestAnimationFrame(fn) { fn(); return 1; }, setTimeout(fn) { timeouts.push(fn); return timeouts.length; }, clearTimeout() {} };
  const exposure = "\nwindow.__task0103={model:model,render:renderSessionImportDialog,openPicker:openSessionFilePicker,read:readSessionDocument,close:closeSessionImport,import:importSessionDocument,download:downloadSessionDocument};";
  vm.runInNewContext("var model = globalModel, api = window.SignalAnalyserApi; function q(s){return document.querySelector(s)} function qa(s){return document.querySelectorAll(s)} function esc(v){return String(v == null ? '' : v)} function safeErrorText(e,f){return e && e.message || f} function showToast(m,error){toasts.push({m,error})} function render(){} function refreshSnapshot(){stats.getStateCount++; model.revision=11; return Promise.resolve()} var settings={load:function(){stats.loadCount++; return Promise.resolve()},setRevision:function(){}}; function showSettingsLoadError(){} function output(force){if(force) stats.outputCount++} function peaksSurfaceActive(){return false} function loadPeaks(){}" + chunk + exposure, { window, document, globalModel:model, Promise, Object, Array, String, JSON, Error, Blob:class Blob { constructor(parts, options) { this.parts = parts; this.type = options.type; } }, toasts, stats }, { filename:"session-toolbar-extract.js" });
  const test = window.__task0103;
  return { test, model, document, shell, picker, apiCalls, api, blobs, urls, revoked, toasts, timeouts, get getStateCount() { return stats.getStateCount; }, get outputCount() { return stats.outputCount; }, get loadCount() { return stats.loadCount; }, dialog:() => dialog };
}

module.exports = async function testTask0103SessionToolbarBehavior(assert) {
  const h = createHarness(); const trigger = { disabled:false, attrs:{}, setAttribute(name, value) { this.attrs[name] = String(value); }, removeAttribute(name) { delete this.attrs[name]; }, focus() { this.focused = (this.focused || 0) + 1; } };
  h.test.download(trigger); h.test.download(trigger); await settle(); h.timeouts.forEach((fn) => fn());
  assert(h.apiCalls.filter((call) => call.type === "get").length === 1, "busy export must issue exactly one GET");
  assert(h.blobs.length === 1 && h.blobs[0].type === "application/json" && h.blobs[0].parts[0] === '{\n  "z": 1,\n  "nested": {\n    "a": true\n  }\n}', "export must pretty-print only response.document as JSON");
  const link = h.document.body.children.find((item) => item.tagName === "A");
  assert(link.download === "signal-analyser-session.json" && link.clicked === 1 && link.removed && h.revoked[0] === h.urls[0] && !trigger.disabled, "export must download with the fixed name, remove its anchor, revoke its URL, and recover busy state");
  const failedExport = createHarness(); const failedTrigger = { disabled:false, attrs:{}, setAttribute(name, value) { this.attrs[name] = String(value); }, removeAttribute(name) { delete this.attrs[name]; } };
  failedExport.api.session = function() { failedExport.apiCalls.push({ type:"get" }); return Promise.reject(new Error("network unavailable")); };
  failedExport.test.download(failedTrigger); await settle();
  assert(!failedExport.model.sessionImport.busy && !failedTrigger.disabled && failedExport.toasts.length === 1 && failedExport.toasts[0].error === true, "failed export must show its visible error and restore the busy action");

  h.test.openPicker(trigger); assert(h.picker.value === "" && h.picker.clicked === 1, "opening the picker must clear its value for same-file reselection");
  h.test.read(null); await settle(); assert(h.apiCalls.filter((call) => call.type === "post").length === 0, "picker cancellation must not POST");
  h.test.read({ name:"wrapped.json", text() { return Promise.resolve('{"document":{"one":1}}'); } }); await settle();
  assert(h.model.sessionImport.open && h.model.sessionImport.document.one === 1 && !h.model.sessionImport.busy, "the tolerated document wrapper must be unwrapped before explicit confirmation");
  const dialog = h.dialog(); assert(dialog && h.shell.inert && h.shell.getAttribute("aria-hidden") === "true", "the confirmation modal must make its background inert");
  const buttons = dialog.children; h.document.activeElement = buttons[2]; const tab = { key:"Tab", preventDefault() { this.prevented = true; } }; dialog.listeners.keydown(tab);
  assert(tab.prevented && h.document.activeElement === buttons[0], "Tab must wrap within the explicit confirmation dialog");
  const esc = { key:"Escape", preventDefault() { this.prevented = true; } }; dialog.listeners.keydown(esc);
  assert(esc.prevented && !h.model.sessionImport.open && !h.shell.inert && trigger.focused === 1, "Escape must cancel without POST, remove inertness, and restore focus");

  h.test.openPicker(trigger); h.test.read({ name:"bad.json", text() { return Promise.resolve("["); } }); await settle();
  assert(!h.model.sessionImport.document && h.model.sessionImport.error && h.apiCalls.filter((call) => call.type === "post").length === 0, "malformed JSON must be visibly rejected with no POST");

  h.test.read({ name:"raw.json", text() { return Promise.resolve('{"raw":true}'); } }); await settle(); h.test.import(); await settle();
  const post = h.apiCalls.filter((call) => call.type === "post")[0];
  assert(JSON.stringify(post.payload) === JSON.stringify({ state_revision:7, document:{ raw:true } }), "confirmation must POST exactly the current revision and parsed raw document");
  assert(h.getStateCount === 1 && h.loadCount === 1 && h.outputCount === 1 && !h.model.sessionImport.open && Object.keys(h.model.outputs).length === 0 && h.model.measurementsRecord === null && h.model.layoutDraft === null, "successful import must refresh authoritative state/settings/active output and clear transient caches before closing");

  const conflict = createHarness(); conflict.api.importSession = function(payload) { conflict.apiCalls.push({ type:"post", payload }); const error = new Error("conflict"); error.status = 409; return Promise.reject(error); }; conflict.test.read({ name:"retry.json", text() { return Promise.resolve('{"v":2}'); } }); await settle(); conflict.test.import(); await settle();
  assert(conflict.apiCalls.filter((call) => call.type === "post").length === 1 && conflict.getStateCount === 1 && conflict.model.sessionImport.open && conflict.model.sessionImport.document.v === 2 && !conflict.model.sessionImport.busy, "409 must refresh revision/state, retain the document and dialog for explicit retry, and never replay POST automatically");

  const invalid = createHarness(); invalid.api.importSession = function(payload) { invalid.apiCalls.push({ type:"post", payload }); const error = new Error("invalid field"); error.status = 422; error.payload = { error:{ message:"Некорректное поле signals" } }; return Promise.reject(error); }; invalid.test.read({ name:"invalid.json", text() { return Promise.resolve('{"v":3}'); } }); await settle(); invalid.test.import(); await settle();
  assert(invalid.getStateCount === 0 && invalid.model.sessionImport.open && /Некорректное поле signals/.test(invalid.model.sessionImport.error) && !invalid.model.sessionImport.busy, "422 must retain state, show server fields/error, and recover the confirmation dialog");
};
