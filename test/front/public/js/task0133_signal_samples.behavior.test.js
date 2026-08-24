"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function appSource() {
  return fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/js/app.js"), "utf8");
}

function sourceFunction(source, name, nextName) {
  const begin = source.indexOf("  function " + name + "(");
  const end = source.indexOf("\n  function " + nextName + "(", begin);
  if (begin < 0 || end < 0) throw new Error("missing " + name);
  return source.slice(begin, end);
}

function flush() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => new Promise((resolve) => setImmediate(resolve)));
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

function classList() {
  const values = new Set();
  return { add(value) { values.add(value); }, remove(value) { values.delete(value); }, toggle(value, enabled) { if (enabled) values.add(value); else values.delete(value); }, contains(value) { return values.has(value); } };
}

function sampleHarness(source) {
  const requests = [];
  const pending = [];
  let sampleTab = null;
  const body = {
    markup:"", dataset:{}, classList:classList(), attributes:{},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    set innerHTML(value) { this.markup = value; scroll.scrollTop = 0; }, get innerHTML() { return this.markup; },
    querySelector(selector) { return selector === "[data-testid='samples-table-scroll']" ? scroll : null; },
  };
  const scroll = {
    scrollTop:0, clientHeight:100, scrollHeight:120, listener:null,
    addEventListener(type, listener) { if (type === "scroll") this.listener = listener; },
  };
  const tabs = { appendChild(node) { sampleTab = node; } };
  const document = {
    createElement() { return { dataset:{}, setAttribute() {}, focus() {}, remove() { sampleTab = null; } }; },
  };
  const model = {
    activePane:"pane-1", inspectorPage:"samples", inspectorSearch:"", visibleColumns:{},
    state:{ signals:[{ id:"sig-harmonic", name:"Гармоника" }] },
    signalSamples:{ signalId:"", signalName:"", rows:[], nextCursor:null, total:0, firstPageLoaded:false, loading:false, error:"", token:0 },
  };
  const context = {
    model, document, Array, Object, String, Number, Promise, Error,
    paneById() { return { id:"pane-1", plot_type:"time", analysis_signal:"sig-harmonic" }; },
    q(selector) {
      if (selector === ".inspector-tabs") return tabs;
      if (selector === "[data-bottom-tab='samples']") return sampleTab;
      if (selector === "[data-inspector-content]") return body;
      if (selector === "[data-testid='samples-table-scroll']") return scroll;
      return null;
    },
    qa() { return []; },
    reconcileContextTabs() {}, contextTabAvailable() { return true; },
    esc(value) { return String(value == null ? "" : value); },
    safeErrorText(error, fallback) { return "typed: " + (error && error.message || fallback); },
    boundedRequest(request) { return request; },
    api:{ signalSamples(id, cursor, limit) { const next = deferred(); requests.push({ id, cursor, limit }); pending.push(next); return next.promise; } },
    renderMeasurementsInspector() {}, renderPeaksInspector() {}, renderInspector:null,
  };
  const snippets = [
    sourceFunction(source, "stableSignalId", "mainSignalForPane"),
    sourceFunction(source, "mainSignalForPane", "selectedSignalName"),
    sourceFunction(source, "showSignalSamples", "signalSampleRateValidation"),
    sourceFunction(source, "syncSignalSamplesWithMain", "loadSignalSamples"),
    sourceFunction(source, "loadSignalSamples", "renderSignalSamplesInspector"),
    sourceFunction(source, "renderSignalSamplesInspector", "screenDraftFor"),
    sourceFunction(source, "renderInspector", "measurementValue"),
  ];
  vm.runInNewContext(snippets.join("\n"), context, { filename:"public/js/app.js:task0133" });
  context.renderInspector = context.renderInspector;
  return { context, body, scroll, requests, pending, model };
}

module.exports = async function task0133SignalSamplesBehavior(assert) {
  const source = appSource();
  const css = fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/css/app.css"), "utf8");
  const harness = sampleHarness(source);

  // Selecting Values with an otherwise unloaded stable-id main starts exactly
  // one bounded first-page request and shows a real loading table, not a blank
  // header row.
  harness.context.renderInspector();
  assert(harness.body.classList.contains("is-table-only"), "samples inspector must enter the table-only layout state");
  assert(harness.requests.length === 1 && JSON.stringify(harness.requests[0]) === JSON.stringify({ id:"sig-harmonic", cursor:null, limit:200 }), "missing first page must request only /samples with the stable id, null cursor and limit=200");
  assert(harness.body.markup.includes("samples-table-scroll") && harness.body.markup.includes("Загрузка…"), "pending first page must visibly render the samples scroll owner and loading state");
  assert(/\.inspector-body\.is-table-only\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\)/.test(css), "table-only inspector CSS must assign its sole content row to the samples table, not the 32px header track");

  harness.pending.shift().resolve({ signal:{ id:"sig-harmonic" }, rows:[{ sample_index:0, time:0, value:1, magnitude:1, square:1 }], next_cursor:200, total:2 });
  await flush();
  assert(harness.body.markup.includes("<tbody><tr><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td></tr></tbody>"), "correct stable-id page with rows must render tbody data in all five columns");
  assert(harness.requests.length === 1, "accepted first page must not trigger a duplicate/full-payload request");

  harness.scroll.scrollTop = 20;
  harness.scroll.listener();
  assert(harness.requests.length === 2 && JSON.stringify(harness.requests[1]) === JSON.stringify({ id:"sig-harmonic", cursor:200, limit:200 }), "near-bottom scroll must append only the next bounded page");
  assert(harness.scroll.scrollTop === 20, "starting next-page loading must preserve the current samples scroll position");
  harness.pending.shift().resolve({ signal:{ id:"sig-harmonic" }, rows:[{ sample_index:1, time:1, value:2, magnitude:2, square:4 }], next_cursor:null, total:2 });
  await flush();
  assert(harness.model.signalSamples.rows.length === 2 && harness.body.markup.includes("<td>4</td>"), "next page must append to existing rows rather than replacing them");
  assert(harness.scroll.scrollTop === 20, "appending an accepted page must not jump the samples table back to the beginning");

  // A typed failure remains actionable. Values/sync retry may retry this first
  // page, while a legitimate empty page is terminal and never refetched.
  const failed = sampleHarness(source);
  failed.context.renderInspector();
  failed.pending.shift().reject(new Error("не доступно"));
  await flush();
  assert(failed.body.markup.includes("role='alert'") && failed.body.markup.includes("typed: не доступно"), "typed samples error must be visible rather than leaving a silent header-only table");
  failed.context.showSignalSamples();
  assert(failed.requests.length === 2 && failed.requests[1].cursor === null, "Values retry must request a failed missing first page again");

  const empty = sampleHarness(source);
  empty.context.renderInspector();
  empty.pending.shift().resolve({ signal:{ id:"sig-harmonic" }, rows:[], next_cursor:null, total:0 });
  await flush();
  assert(empty.body.markup.includes("У сигнала нет отсчётов."), "legitimate empty first page must render an explicit empty state");
  empty.context.showSignalSamples();
  assert(empty.requests.length === 1, "Values retry must not refetch an already loaded legitimate empty first page");
};
