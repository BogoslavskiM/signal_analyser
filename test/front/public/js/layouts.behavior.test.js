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
    for (const key of ["rows", "columns"]) for (let value = 1; value <= 4; value += 1) {
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
    if (testId) return this.nodes[testId[1]] || null;
    if (selector === ".plot-type-control") return this.plotControl;
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
    return [this.nodes["layout-cancel-close"], ...[1,2,3,4].map((value) => this.nodes[`layout-rows-${value}`]), ...[1,2,3,4].map((value) => this.nodes[`layout-columns-${value}`]), this.nodes["layout-cancel"], this.nodes["layout-apply"]];
  }
}

function pane(id, plotType, bindings) {
  return {id, plot_type:plotType, signal_bindings:bindings.slice()};
}

function readyData(item) {
  if (item.plot_type === "time") return item.signal_bindings.map((signal) => ({signal, type:"line", x:[0, 1], y:[1, 2], x_label:"Time", y_label:"Amplitude"}));
  if (item.plot_type === "spectrum") return item.signal_bindings.map((signal) => ({signal, type:"line", x:[1, 10], y:[2, 3], frequency_scale:"log", x_label:"Frequency", y_label:"Power"}));
  return {type:"heatmap", signal:item.signal_bindings[0] || null, x:item.signal_bindings.length ? [0, 1] : [], y:item.signal_bindings.length ? [1, 2] : [], z:item.signal_bindings.length ? [[1, 2], [3, 4]] : [], x_label:"X", y_label:"Y", color_label:"Power", frequency_scale:{requested:"linear", effective:"linear", available:["linear", "log"]}, power_limits:{rendered:null}, density_limits:{rendered:null}};
}

function outputFor(item, override) {
  const output = Object.assign({isready:true, success:true, error:"", data:readyData(item)}, override || {});
  return {pane_id:item.id, plot_type:item.plot_type, signal_bindings:item.signal_bindings.slice(), analysis_signal:item.signal_bindings[0] || null, output};
}

function envelope(revision, rows, columns, options) {
  const settings = options || {};
  const count = rows * columns;
  const panes = settings.panes || Array.from({length:count}, (_, index) => pane(`pane-${index + 1}`, PLOTS[index % PLOTS.length], index === 0 ? [A] : []));
  const outputs = settings.outputs || panes.map((item) => outputFor(item));
  const activePaneId = settings.activePaneId || panes[0].id;
  return {
    ok:true,
    state_revision:revision,
    active_display_id:"display-1",
    layouts:[{display_id:"display-1", layout:{version:1, variant:`${rows}x${columns}`, rows, columns, active_pane_id:activePaneId, next_pane_number:count + 1, panes}, outputs}],
    state:{state_revision:revision, active_display_id:"display-1", signals:[{name:A,color:"#111111"},{name:B,color:"#222222"}], displays:[{id:"display-1"}]},
  };
}

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

function boot() {
  const document = new FakeDocument();
  const apiCalls = [];
  const responders = [];
  const plotCalls = [];
  const windowListeners = {};
  const window = {
    Promise,
    innerWidth:1024,
    innerHeight:768,
    SignalAnalyserApi:{ layouts(payload) {
      apiCalls.push(payload === undefined ? null : deepClone(payload));
      const responder = responders.shift();
      return responder ? responder(payload) : Promise.reject(new Error("unexpected layout API call"));
    }},
    Plotly:{
      react(host, data, layout, config) { plotCalls.push({host, data, layout, config}); return Promise.resolve(); },
      purge() {},
      Plots:{resize() { return Promise.resolve(); }},
    },
    CustomEvent:function CustomEvent(type, init) { this.type = type; this.detail = init.detail; },
    addEventListener(type, handler) { (windowListeners[type] || (windowListeners[type] = [])).push(handler); },
    dispatchEvent(event) { for (const handler of windowListeners[event.type] || []) handler(event); },
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout() { return 1; },
    clearTimeout() {},
  };
  const root = path.resolve(__dirname, "../../../..");
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/layouts.js"), "utf8"), {window, document, Promise, console}, {filename:"layouts.js"});
  return {window, document, apiCalls, responders, plotCalls};
}

module.exports = async function testMultiLayoutBehavior(assert) {
  const env = boot();
  const layouts = env.window.SignalAnalyserLayouts;
  const grid = env.document.nodes["pane-grid"];

  for (let rows = 1; rows <= 4; rows += 1) for (let columns = 1; columns <= 4; columns += 1) {
    const accepted = layouts.acceptEnvelope(envelope(rows * 10 + columns, rows, columns), false);
    await flush();
    assert(accepted, `layout ${rows}x${columns} must accept its exact authoritative envelope`);
    assert(grid.dataset.layoutVariant === `${rows}x${columns}` && grid.style.values["--layout-rows"] === String(rows) && grid.style.values["--layout-columns"] === String(columns), `layout ${rows}x${columns} must set exact grid dimensions`);
    assert((grid.innerHTML.match(/data-testid='plot-pane-/g) || []).length === rows * columns, `layout ${rows}x${columns} must render exactly ${rows * columns} panes`);
  }

  const strictBase = envelope(100, 1, 2, {panes:[pane("pane-1", "time", [A]), pane("pane-2", "spectrum", [B])]});
  assert(layouts.acceptEnvelope(strictBase, false), "strict baseline envelope must be accepted");
  const retainedVariant = grid.dataset.layoutVariant;
  const wrongOrder = deepClone(strictBase);
  wrongOrder.layouts[0].outputs.reverse();
  assert(layouts.acceptEnvelope(wrongOrder, false) === false && grid.dataset.layoutVariant === retainedVariant, "output/pane identity-order mismatch must be rejected without replacing accepted state");
  const readyEmptyLine = deepClone(strictBase);
  readyEmptyLine.layouts[0].outputs[1].output.data = [];
  assert(layouts.acceptEnvelope(readyEmptyLine, false) === false, "successful nonempty line output must reject empty data");
  const failedLine = deepClone(strictBase);
  failedLine.state_revision = failedLine.state.state_revision = 101;
  failedLine.layouts[0].outputs[1].output = {isready:true, success:false, error:"pane failed", data:[]};
  assert(layouts.acceptEnvelope(failedLine, false), "failed line output must accept typed empty data with an error");
  const notReadyLine = deepClone(strictBase);
  notReadyLine.state_revision = notReadyLine.state.state_revision = 102;
  notReadyLine.layouts[0].outputs[1].output = {isready:false, success:true, error:"", data:[]};
  assert(layouts.acceptEnvelope(notReadyLine, false), "not-ready line output must accept typed empty data without fabricating traces");

  const realPanes = [pane("pane-1", "time", [A]), pane("pane-2", "spectrum", [B]), pane("pane-3", "spectrogram", [A]), pane("pane-4", "persistence", [B])];
  const plotsBefore = env.plotCalls.length;
  assert(layouts.acceptEnvelope(envelope(110, 2, 2, {panes:realPanes, activePaneId:"pane-1"}), false), "four real pane types must share one accepted envelope");
  await flush();
  const simultaneous = env.plotCalls.slice(plotsBefore);
  assert(Object.keys(env.document.paneHosts).length === 3 && env.document.nodes["active-plot-host"].parentNode === env.document.paneOutputs["pane-1"], "one active and three independent inactive plot hosts must coexist in 2x2");
  assert(simultaneous.length === 3 && simultaneous.some((call) => call.host.dataset.panePlotHost === "pane-2" && call.layout.xaxis.type === "log") && simultaneous.filter((call) => call.data[0].type === "heatmap").length === 2, "inactive Spectrum/Spectrogram/Persistence must render simultaneously with typed Plotly layouts");

  const statePanes = [pane("pane-1", "time", [A]), pane("pane-2", "spectrum", [B]), pane("pane-3", "spectrogram", [A]), pane("pane-4", "persistence", [])];
  const stateOutputs = [
    outputFor(statePanes[0]),
    outputFor(statePanes[1], {isready:false, success:true, error:"", data:[]}),
    outputFor(statePanes[2], {isready:true, success:false, error:"isolated failure", data:{type:"heatmap", signal:A, x:[], y:[], z:[]}}),
    outputFor(statePanes[3]),
  ];
  assert(layouts.acceptEnvelope(envelope(111, 2, 2, {panes:statePanes, outputs:stateOutputs}), false), "pane-local ready/loading/error/empty envelope must remain valid");
  assert(grid.innerHTML.includes("data-pane-output-state='ready'") && grid.innerHTML.includes("data-pane-output-state='loading'") && grid.innerHTML.includes("data-pane-output-state='error'") && grid.innerHTML.includes("data-pane-output-state='empty'"), "pane-local states must render together without global replacement");
  assert(grid.innerHTML.includes("isolated failure") && grid.innerHTML.includes("No signals bound"), "pane error and empty copy must stay isolated to their own panes");

  layouts.acceptEnvelope(envelope(120, 2, 2), false);
  const trigger = env.document.nodes["layout-trigger"];
  env.document.fire("click", trigger);
  assert(env.document.nodes["layout-popover"].hidden === false && env.document.nodes["layout-cancel-close"].focused === true, "opening selector must copy current draft and focus Close");
  env.document.fire("click", env.document.nodes["layout-rows-3"]);
  env.document.fire("click", env.document.nodes["layout-columns-2"]);
  assert(env.document.nodes["layout-draft-copy"].textContent === "Draft 3×2" && env.document.nodes["layout-apply"].disabled === false && grid.dataset.layoutVariant === "2x2", "draft editing must enable Apply without mutating visible panes");
  trigger.focused = false;
  env.document.fire("click", env.document.nodes["layout-cancel"]);
  assert(env.document.nodes["layout-popover"].hidden === true && trigger.focused === true && grid.dataset.layoutVariant === "2x2", "Cancel must discard draft and restore trigger focus");
  env.document.fire("click", trigger);
  env.document.fire("click", env.document.nodes["layout-rows-4"]);
  trigger.focused = false;
  const escape = env.document.fire("keydown", env.document.nodes["layout-popover"], {key:"Escape"});
  assert(escape.prevented && env.document.nodes["layout-popover"].hidden === true && trigger.focused === true, "Escape must equal Cancel and restore focus");

  let resolveApply;
  env.responders.push(() => new Promise((resolve) => { resolveApply = resolve; }));
  env.document.fire("click", trigger);
  env.document.fire("click", env.document.nodes["layout-rows-3"]);
  env.document.fire("click", env.document.nodes["layout-columns-2"]);
  env.document.fire("click", env.document.nodes["layout-apply"]);
  await flush();
  assert(JSON.stringify(env.apiCalls.at(-1)) === JSON.stringify({state_revision:120, display_id:"display-1", version:1, operation:"resize", variant:"3x2", rows:3, columns:2}), "Apply must POST one exact resize payload");
  assert(grid.dataset.layoutVariant === "2x2" && env.document.nodes["layout-apply"].textContent === "Applying…" && env.document.nodes["layout-cancel"].disabled === true, "pending Apply must preserve authoritative panes and lock draft exits");
  resolveApply(envelope(121, 3, 2));
  await flush();
  assert(grid.dataset.layoutVariant === "3x2" && env.document.nodes["layout-popover"].hidden === true && trigger.focused === true, "200 Apply must render the returned layout and restore trigger focus");
  assert(env.document.nodes["layout-toast"].hidden === false && env.document.nodes["layout-toast"].className.includes("is-success"), "200 Apply must publish non-modal success feedback");

  env.responders.push(() => Promise.reject({status:422, payload:{error:{fields:{rows:"rows rejected"}}}}));
  env.document.fire("click", trigger);
  env.document.fire("click", env.document.nodes["layout-rows-4"]);
  env.document.fire("click", env.document.nodes["layout-apply"]);
  await flush();
  assert(grid.dataset.layoutVariant === "3x2" && env.document.nodes["layout-popover"].hidden === false && env.document.nodes["layout-draft-copy"].textContent === "Draft 4×2", "422 must retain authoritative grid and retryable draft");
  assert(env.document.nodes["layout-error"].hidden === false && env.document.nodes["layout-error-copy"].textContent === "rows rejected" && env.document.nodes["layout-apply"].disabled === false, "422 must re-enable Apply with inline field feedback");
  env.document.fire("click", env.document.nodes["layout-cancel"]);

  const conflictCurrent = envelope(122, 2, 2);
  env.responders.push(() => Promise.reject({status:409, payload:{current:conflictCurrent}}));
  env.document.fire("click", trigger);
  env.document.fire("click", env.document.nodes["layout-rows-4"]);
  env.document.fire("click", env.document.nodes["layout-apply"]);
  await flush();
  assert(grid.dataset.layoutVariant === "2x2" && env.document.nodes["layout-popover"].hidden === false && env.document.nodes["layout-conflict"].hidden === false, "409 must consume current while keeping selector open in conflict state");
  assert(env.document.nodes["layout-draft-copy"].textContent === "Draft 2×2" && env.document.nodes["layout-apply"].disabled === true && env.document.nodes["layout-conflict-copy"].textContent.includes("stale draft was discarded"), "409 must reset stale draft and block unchanged Apply");
  env.document.fire("click", env.document.nodes["layout-rows-3"]);
  assert(env.document.nodes["layout-conflict"].hidden === true && env.document.nodes["layout-apply"].disabled === false, "fresh draft edit must acknowledge conflict and re-enable Apply");
  env.document.fire("click", env.document.nodes["layout-cancel"]);

  const isolatedPanes = [pane("pane-1", "time", [A]), pane("pane-2", "spectrum", [B]), pane("pane-3", "spectrogram", [A, B]), pane("pane-4", "persistence", [])];
  layouts.acceptEnvelope(envelope(130, 2, 2, {panes:isolatedPanes, activePaneId:"pane-1"}), false);
  const typeChangedPanes = isolatedPanes.map((item) => pane(item.id, item.id === "pane-2" ? "persistence" : item.plot_type, item.signal_bindings));
  env.responders.push(() => Promise.resolve(envelope(131, 2, 2, {panes:typeChangedPanes, activePaneId:"pane-1"})));
  const paneType = new FakeElement(env.document, "", "SELECT");
  paneType.dataset.panePlotType = "";
  paneType.dataset.paneId = "pane-2";
  paneType.value = "persistence";
  env.document.fire("change", paneType);
  await flush();
  assert(JSON.stringify(env.apiCalls.at(-1)) === JSON.stringify({state_revision:130, display_id:"display-1", version:1, operation:"update_pane", pane_id:"pane-2", plot_type:"persistence", signal_bindings:[B]}), "inactive pane type change must target only that pane with its ordered bindings");
  assert(grid.innerHTML.includes("data-testid='pane-plot-type-pane-2'") && grid.innerHTML.includes("<option value='persistence' selected>"), "authoritative type response must update only the addressed inactive pane");

  env.responders.push(() => Promise.resolve(envelope(132, 2, 2, {panes:typeChangedPanes, activePaneId:"pane-3"})));
  const paneThree = new FakeElement(env.document, "", "ARTICLE");
  paneThree.dataset.paneId = "pane-3";
  env.document.fire("click", paneThree);
  await flush();
  assert(JSON.stringify(env.apiCalls.at(-1)) === JSON.stringify({state_revision:131, display_id:"display-1", version:1, operation:"select_pane", pane_id:"pane-3"}), "pane activation must POST only the selected server pane ID");
  assert(grid.dataset.activePaneId === "pane-3" && env.document.nodes["pane-settings-context"].textContent === "Pane 3 · Spectrogram" && env.document.nodes["pane-binding-title"].textContent === "Bindings for Pane 3", "Settings and binding labels must follow authoritative active pane context");
  assert(env.document.signalControls.every((control) => control.checked) && env.document.nodes["toggle-all-signals"].checked === true, "active Pane 3 checkboxes must reflect only Pane 3 bindings");

  const reboundPanes = typeChangedPanes.map((item) => pane(item.id, item.plot_type, item.id === "pane-3" ? [A] : item.signal_bindings));
  env.responders.push(() => Promise.resolve(envelope(133, 2, 2, {panes:reboundPanes, activePaneId:"pane-3"})));
  const signalB = env.document.signalControls[1];
  signalB.checked = false;
  env.document.fire("change", signalB);
  assert(signalB.checked === true && signalB.disabled === true, "binding control must roll back optimistic checkbox state and disable only the pending control");
  await flush();
  assert(JSON.stringify(env.apiCalls.at(-1)) === JSON.stringify({state_revision:132, display_id:"display-1", version:1, operation:"update_pane", pane_id:"pane-3", plot_type:"spectrogram", signal_bindings:[A]}), "active checkbox must submit only active pane type and ordered survivor bindings");
  assert(env.document.signalControls[0].checked === true && env.document.signalControls[1].checked === false && signalB.disabled === false, "authoritative binding response must restore active-pane checkbox context without changing sibling pane state");
};
