"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const A = "Signal A";
const B = "Signal B";
const PLOTS = ["time", "spectrum", "spectrogram", "persistence"];

function flush() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve());
}

function camelData(name) {
  return name.slice(5).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
}

class FakeElement {
  constructor(document, testId, tagName) {
    this.document = document;
    this.testId = testId || "";
    this.tagName = tagName || "DIV";
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.indeterminate = false;
    this.value = "";
    this.textContent = "";
    this.className = "";
    this.isConnected = true;
    this._innerHTML = "";
    this.style = {
      values: {},
      setProperty: (name, value) => { this.style.values[name] = String(value); },
    };
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      toggle: (name, force) => { if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name); },
      contains: (name) => classes.has(name),
    };
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this.testId === "pane-grid") this.document.rebuildGrid(this._innerHTML);
  }
  get innerHTML() { return this._innerHTML; }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name.startsWith("data-")) this.dataset[camelData(name)] = String(value);
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  removeAttribute(name) { delete this.attributes[name]; if (name.startsWith("data-")) delete this.dataset[camelData(name)]; }

  appendChild(child) {
    if (!child) return child;
    if (child.parentNode && child.parentNode !== this) child.parentNode.removeChild(child);
    if (!this.children.includes(child)) this.children.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    if (child) child.parentNode = null;
    return child;
  }
  contains(target) { return target === this || this.children.includes(target); }
  focus() { this.focused = true; this.document.activeElement = this; }
  getBoundingClientRect() {
    if (this.testId === "layout-trigger") return {left:900, right:990, top:40, bottom:72, width:90, height:32};
    if (this.testId === "layout-popover") return {left:0, right:372, top:0, bottom:420, width:372, height:420};
    return {left:0, right:640, top:0, bottom:360, width:640, height:360};
  }

  closest(selector) {
    if (selector === "[data-pane-id]" && this.dataset.paneId) return this;
    if (selector === "[data-layout-dimension]" && this.dataset.layoutDimension) return this;
    if (selector === "select,button" && (this.tagName === "SELECT" || this.tagName === "BUTTON")) return this;
    const testIds = Array.from(String(selector).matchAll(/\[data-testid='([^']+)'\]/g), (match) => match[1]);
    return this.testId && testIds.includes(this.testId) ? this : null;
  }

  matches(selector) {
    const value = String(selector);
    if (this.dataset.signalVisibility && value.includes("[data-signal-visibility]")) return true;
    if (this.testId === "toggle-all-signals" && value.includes("[data-testid='toggle-all-signals']")) return true;
    if (this.testId === "settings-view-select" && value.includes("[data-testid='settings-view-select']")) return true;
    if (this.dataset.panePlotType !== undefined && value.includes("[data-pane-plot-type]")) return true;
    if (this.testId === "plot-type-select" && value.includes("[data-pane-plot-type] select")) return true;
    return false;
  }

  querySelector(selector) {
    if (this.isPlotControl && selector === "select") return this.select;
    if (this.testId === "pane-grid") return this.document.gridQuery(selector);
    return null;
  }
  querySelectorAll(selector) {
    if (this.testId === "pane-grid" && selector === "[data-pane-plot-host]") return Object.values(this.document.paneHosts);
    if (this.testId === "layout-popover" && selector === "button:not([disabled])") return this.document.popoverControls().filter((control) => !control.disabled);
    return [];
  }
}

class FakeDocument {
  constructor() {
    this.readyState = "complete";
    this.activeElement = null;
    this.listeners = {};
    this.nodes = {};
    this.paneHosts = {};
    this.paneSlots = {};
    this.paneOutputs = {};
    this.signalControls = [this.make("signal-a", "INPUT"), this.make("signal-b", "INPUT")];
    this.signalControls[0].dataset.signalVisibility = A;
    this.signalControls[1].dataset.signalVisibility = B;

    [
      "app-shell", "pane-grid", "active-pane-runtime", "active-plot-host", "display-overflow-trigger", "display-overflow-menu",
      "clear-display-action", "settings-view-select", "toggle-all-signals", "layout-trigger", "layout-trigger-label",
      "layout-popover", "layout-current-copy", "layout-draft-copy", "layout-row-options", "layout-column-options",
      "layout-topology", "layout-pane-count", "layout-preview", "layout-preserve-copy", "layout-warning", "layout-warning-copy",
      "layout-conflict", "layout-conflict-copy", "layout-error", "layout-error-copy", "layout-cancel-close", "layout-cancel",
      "layout-apply", "layout-toast", "layout-toast-icon", "layout-toast-copy", "layout-toast-close", "pane-settings-context",
      "pane-binding-title", "pane-binding-type",
    ].forEach((id) => this.make(id, /(?:apply|cancel|close|trigger)$/.test(id) ? "BUTTON" : "DIV"));
    for (const key of ["rows", "columns"]) for (let value = 1; value <= 10; value += 1) {
      const control = this.make(`layout-${key}-${value}`, "BUTTON");
      control.dataset.layoutDimension = key;
      control.dataset.layoutValue = String(value);
    }

    this.plotControl = new FakeElement(this, "", "LABEL");
    this.plotControl.isPlotControl = true;
    this.plotControl.select = this.make("plot-type-select", "SELECT");
    this.plotControl.appendChild(this.plotControl.select);
    this.nodes["active-pane-runtime"].appendChild(this.plotControl);
    this.nodes["active-pane-runtime"].appendChild(this.nodes["display-overflow-trigger"]);
    this.nodes["active-pane-runtime"].appendChild(this.nodes["display-overflow-menu"]);
    this.nodes["active-pane-runtime"].appendChild(this.nodes["active-plot-host"]);
    this.nodes["app-shell"].dataset.activeDisplayId = "display-1";
  }

  make(id, tagName) {
    const element = new FakeElement(this, id, tagName);
    this.nodes[id] = element;
    return element;
  }

  addEventListener(type, handler) { (this.listeners[type] || (this.listeners[type] = [])).push(handler); }
  fire(type, target, extra) {
    const event = Object.assign({
      target,
      key:"",
      shiftKey:false,
      prevented:false,
      stopped:false,
      preventDefault() { this.prevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
    }, extra || {});
    for (const handler of this.listeners[type] || []) handler(event);
    return event;
  }

  querySelector(selector) {
    const testId = /^\[data-testid='([^']+)'\]$/.exec(selector);
    if (testId) {
      const candidate = this.nodes[testId[1]] || null;
      if (["display-overflow-trigger", "display-overflow-menu"].includes(testId[1])) return candidate && candidate.parentNode ? candidate : null;
      if (testId[1] === "plot-type-select") return candidate && candidate.parentNode && candidate.parentNode.parentNode ? candidate : null;
      return candidate;
    }
    if (selector === ".plot-type-control") return this.plotControl.parentNode ? this.plotControl : null;
    return null;
  }
  querySelectorAll(selector) { return selector === "[data-signal-visibility]" ? this.signalControls : []; }

  rebuildGrid(html) {
    this.paneHosts = {};
    this.paneSlots = {};
    this.paneOutputs = {};
    const paneIds = Array.from(html.matchAll(/data-testid='plot-pane-([^']+)'/g), (match) => match[1]);
    for (const paneId of paneIds) {
      this.paneSlots[paneId] = new FakeElement(this, `slot-${paneId}`);
      const output = new FakeElement(this, `output-${paneId}`);
      output.dataset.paneOutputState = html.includes(`data-testid='pane-output-${paneId}' data-pane-output-state='ready'`) ? "ready" : "state";
      this.paneOutputs[paneId] = output;
      if (html.includes(`data-pane-plot-host='${paneId}'`)) {
        const host = new FakeElement(this, `host-${paneId}`);
        host.dataset.panePlotHost = paneId;
        output.appendChild(host);
        this.paneHosts[paneId] = host;
      }
    }
  }

  gridQuery(selector) {
    if (selector === "[data-pane-runtime-slot='true']") return this.paneSlots[this.nodes["pane-grid"].dataset.activePaneId] || null;
    let match = /^\[data-pane-id='([^']+)'\] \[data-pane-output-state='ready'\]$/.exec(selector);
    if (match) return this.paneOutputs[match[1]] && this.paneOutputs[match[1]].dataset.paneOutputState === "ready" ? this.paneOutputs[match[1]] : null;
    match = /^\[data-pane-plot-host='([^']+)'\]$/.exec(selector);
    if (match) return this.paneHosts[match[1]] || null;
    return null;
  }

  popoverControls() {
    return [this.nodes["layout-cancel-close"], ...Array.from({length:10}, (_, index) => this.nodes[`layout-rows-${index + 1}`]), ...Array.from({length:10}, (_, index) => this.nodes[`layout-columns-${index + 1}`]), this.nodes["layout-cancel"], this.nodes["layout-apply"]];
  }
}

function pane(id, plotType, bindings) {
  return {id, plot_type:plotType, signal_bindings:bindings.slice()};
}

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

function stateLite(revision, options) {
  const settings = options || {};
  const panes = settings.panes || [pane("pane-1", "time", [A])];
  const activePaneId = settings.activePaneId || panes[0].id;
  const activePane = panes.find((item) => item.id === activePaneId);
  const calculationRevision = settings.calculationRevision === undefined ? revision + 100 : settings.calculationRevision;
  const contextKey = settings.contextKey || `display-1|${activePane.id}|${activePane.plot_type}|${calculationRevision}`;
  return {
    state_revision:revision,
    calculation_revision:calculationRevision,
    active_display_id:"display-1",
    signals:[{name:A,color:"#111111"},{name:B,color:"#222222"}],
    displays:[{id:"display-1"}],
    layouts:[{
      display_id:"display-1",
      layout:{version:1, variant:`1x${panes.length}`, rows:1, columns:panes.length, active_pane_id:activePaneId, next_pane_number:panes.length + 1, panes},
      outputs:[{display_id:"display-1", pane_id:activePane.id, plot_type:activePane.plot_type, analysis_signal:activePane.signal_bindings[0] || null, calculation_revision:calculationRevision, context_key:contextKey, isready:false, success:true, error:""}],
    }],
  };
}

function activeOutput(snapshot, label, override) {
  const entry = snapshot.layouts[0];
  const paneItem = entry.layout.panes.find((item) => item.id === entry.layout.active_pane_id);
  const status = entry.outputs[0];
  return Object.assign({
    state_revision:snapshot.state_revision,
    calculation_revision:status.calculation_revision,
    context_key:status.context_key,
    display_id:entry.display_id,
    pane_id:paneItem.id,
    plot_type:paneItem.plot_type,
    isready:true,
    success:true,
    error:"",
    data:[{data:[{type:"scatter", mode:"lines", name:label, x:[0, 1], y:[1, 2]}], layout:{dragmode:"zoom", paper_bgcolor:"#ffffff", plot_bgcolor:"#ffffff"}, config:{responsive:true}}],
  }, override || {});
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return {promise, resolve, reject};
}

function boot(options) {
  const settings = options || {};
  const document = new FakeDocument();
  const apiCalls = [];
  const activeResponders = [];
  const stateResponders = [];
  const layoutResponders = [];
  const plotCalls = [];
  const plotResolvers = [];
  const scripts = [];
  const timers = [];
  const dispatched = [];
  const windowListeners = {};
  let timerId = 0;

  function take(responders, fallback, ...args) {
    const responder = responders.shift();
    if (typeof responder === "function") return responder(...args);
    if (responder && typeof responder.then === "function") return responder;
    return responder === undefined ? Promise.reject(new Error(fallback)) : Promise.resolve(responder);
  }

  document.createElement = (tagName) => ({tagName:String(tagName).toUpperCase(), src:"", async:false, onload:null, onerror:null});
  document.head = {appendChild(script) { scripts.push(script); return script; }};

  const Plotly = {
    react(host, data, layout, config) {
      plotCalls.push({host, data, layout, config});
      if (!settings.deferredPlotly) return Promise.resolve();
      return new Promise((resolve, reject) => plotResolvers.push({host, data, resolve, reject}));
    },
    purge() {},
    Plots:{resize() { return Promise.resolve(); }},
  };
  const window = {
    Promise,
    innerWidth:1024,
    innerHeight:768,
    SignalAnalyserApi:{
      getState() { apiCalls.push({kind:"state"}); return take(stateResponders, "unexpected state-lite request"); },
      layouts(payload) { apiCalls.push({kind:"layouts", payload:deepClone(payload)}); return take(layoutResponders, "unexpected layout mutation", payload); },
      activeOutput(displayId, paneId) { apiCalls.push({kind:"active", displayId, paneId}); return take(activeResponders, "unexpected active-output request", displayId, paneId); },
    },
    CustomEvent:function CustomEvent(type, init) { this.type = type; this.detail = init.detail; },
    addEventListener(type, handler) { (windowListeners[type] || (windowListeners[type] = [])).push(handler); },
    dispatchEvent(event) { dispatched.push(event); for (const handler of windowListeners[event.type] || []) handler(event); },
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout(callback, delay) { const timer = {id:++timerId, callback, delay:Number(delay) || 0, cancelled:false}; timers.push(timer); return timer.id; },
    clearTimeout(id) { const timer = timers.find((item) => item.id === id); if (timer) timer.cancelled = true; },
  };
  if (!settings.plotlyAbsent) window.Plotly = Plotly;

  const root = path.resolve(__dirname, "../../../..");
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/layouts.js"), "utf8"), {window, document, Promise, console}, {filename:"layouts.js"});

  function publish(snapshot) {
    window.dispatchEvent(new window.CustomEvent("signal-analyser-rendered", {detail:{activeDisplayId:snapshot.active_display_id, revision:snapshot.state_revision, snapshot}}));
  }
  async function runTimer() {
    const timer = timers.find((item) => !item.cancelled && !item.ran);
    if (!timer) throw new Error("no runnable timer");
    timer.ran = true;
    timer.callback();
    await flush();
    return timer;
  }

  return {window, document, apiCalls, activeResponders, stateResponders, layoutResponders, plotCalls, plotResolvers, scripts, timers, dispatched, publish, runTimer};
}

module.exports = async function testStateLiteLayoutBehavior(assert) {
  const cold = boot();
  await flush();
  assert(cold.apiCalls.length === 0, "layout mount must not start a parallel cold-start request; app.js owns the sole state-lite startup");
  assert(cold.document.plotControl.parentNode === cold.document.nodes["active-pane-runtime"] && cold.document.nodes["display-overflow-trigger"].parentNode === cold.document.nodes["active-pane-runtime"], "metadata-owned cold start must retain detached runtime controls until app publishes state-lite");

  const startup = stateLite(1);
  cold.activeResponders.push(activeOutput(startup, "startup-ready", {isready:false, data:[]}));
  cold.publish(startup);
  await flush();
  assert(cold.document.nodes["pane-grid"].dataset.layoutState === "ready" && cold.document.nodes["pane-grid"].dataset.layoutVariant === "1x1", "app-published state-lite must materialize the canonical layout without a second metadata GET");
  assert(cold.apiCalls.length === 0 && cold.timers.some((timer) => !timer.cancelled), "accepted state-lite must schedule only active-output polling");
  await cold.runTimer();
  assert(cold.apiCalls.filter((call) => call.kind === "active").length === 1 && cold.document.nodes["pane-grid"].innerHTML.includes("pane-output-loading"), "lightweight pending output must remain loading and schedule a bounded retry");
  cold.activeResponders.push(activeOutput(startup, "startup-ready"));
  await cold.runTimer();
  assert(cold.plotCalls.length === 1 && cold.plotCalls[0].host === cold.document.nodes["active-plot-host"] && cold.plotCalls[0].config.displayModeBar === false, "one current ready output must render exactly once through the layouts-owned live Plotly host");
  assert(cold.document.nodes["active-plot-host"].dataset.plotReady === "true", "the sole current Plotly.react completion must mark the layouts-owned host ready");

  const terminal = boot();
  const terminalSnapshot = stateLite(2, {calculationRevision:102, contextKey:"terminal-error"});
  terminal.activeResponders.push(activeOutput(terminalSnapshot, "", {
    isready:true,
    success:false,
    error:"Расчёт активного графика не завершился за допустимое число опросов",
    data:[],
  }));
  terminal.publish(terminalSnapshot);
  await terminal.runTimer();
  assert(terminal.document.nodes["pane-grid"].innerHTML.includes("pane-output-error") && !terminal.document.nodes["pane-grid"].innerHTML.includes("pane-output-loading"), "a typed terminal active-output error must replace loading with the visible blocker state");
  assert(terminal.apiCalls.filter((call) => call.kind === "active").length === 1 && !terminal.timers.some((timer) => !timer.cancelled && !timer.ran), "a terminal active-output error must not restart polling or issue a replacement calculation request");

  const race = boot();
  const paneOne = stateLite(10, {panes:[pane("pane-1", "time", [A]), pane("pane-2", "spectrum", [B])], activePaneId:"pane-1", calculationRevision:201, contextKey:"context-old"});
  const paneTwo = stateLite(11, {panes:[pane("pane-1", "time", [A]), pane("pane-2", "spectrum", [B])], activePaneId:"pane-2", calculationRevision:202, contextKey:"context-current"});
  const oldResponse = deferred();
  race.activeResponders.push(oldResponse.promise);
  race.publish(paneOne);
  await race.runTimer();
  race.activeResponders.push(activeOutput(paneTwo, "current-ready"));
  race.publish(paneTwo);
  await race.runTimer();
  assert(race.plotCalls.length === 1 && race.plotCalls[0].data[0].name === "current-ready", "a pane/context switch must render only the current ready active output");
  oldResponse.resolve(activeOutput(paneOne, "stale-ready"));
  await flush();
  assert(race.plotCalls.length === 1 && race.document.nodes["active-plot-host"].dataset.plotReady === "true", "a stale pre-switch completion must not render or overwrite the current host");

  const latest = boot({deferredPlotly:true});
  const first = stateLite(20, {calculationRevision:301, contextKey:"render-first"});
  latest.activeResponders.push(activeOutput(first, "first-ready"));
  latest.publish(first);
  await latest.runTimer();
  assert(latest.plotCalls.length === 1 && latest.plotResolvers.length === 1, "the first current ready output must create one controlled render in flight");
  const second = stateLite(21, {calculationRevision:302, contextKey:"render-latest"});
  latest.activeResponders.push(activeOutput(second, "latest-ready"));
  latest.publish(second);
  await latest.runTimer();
  assert(latest.plotCalls.length === 1, "a newer ready output must queue behind the one render already in flight");
  latest.plotResolvers.shift().resolve();
  await flush();
  assert(latest.plotCalls.length === 2 && latest.plotCalls[1].data[0].name === "latest-ready" && latest.plotResolvers.length === 1, "settling an obsolete render must start exactly one latest ready render");
  latest.plotResolvers.shift().resolve();
  await flush();
  assert(latest.plotCalls.length === 2 && latest.document.nodes["active-plot-host"].dataset.plotReady === "true", "latest-only serialization must settle with exactly one current ready completion and no loop");

  const lazyFailure = boot({plotlyAbsent:true});
  const lazySnapshot = stateLite(30, {calculationRevision:401, contextKey:"lazy-failure"});
  lazyFailure.activeResponders.push(activeOutput(lazySnapshot, "lazy-ready"));
  lazyFailure.publish(lazySnapshot);
  await lazyFailure.runTimer();
  assert(lazyFailure.scripts.length === 1 && lazyFailure.scripts[0].src === "./js/vendor/plotly-cartesian-3.1.0.min.js", "ready output must lazily request exactly one package-local Plotly artifact");
  lazyFailure.scripts[0].onerror();
  await flush();
  assert(lazyFailure.plotCalls.length === 0 && lazyFailure.document.nodes["active-plot-host"].parentNode.dataset.paneOutputState === "error", "local Plotly load failure must become an explicit layouts-owned pane error without a fake render");
};
