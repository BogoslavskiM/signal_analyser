"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function classList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function createHarness() {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("bootstrapAttempt(bootstrapController.begin({ timeoutMs:bootstrapController.DEFAULT_TIMEOUT_MS }));", "");
  source = source.replace("})(window, document);", "window.__task0102 = { model:model, setState:setWorkspaceInspectorState, change:changeWorkspaceInspectorState, start:startWorkspaceSplitDrag, move:moveWorkspaceSplitDrag, stop:stopWorkspaceSplitDrag, retain:retainWorkspaceSplitOnResize }; })(window, document);");

  const frames = new Map();
  let nextFrame = 0;
  const apiCalls = [];
  const relayoutCalls = [];
  const reactCalls = [];
  const newPlotCalls = [];
  const valueSelectCloseCalls = [];
  const splitterListeners = {};
  const resizeListeners = [];
  const plotHosts = [];

  const stack = {
    dataset: { inspectorState:"split" },
    height:1000,
    top:0,
    style: {
      values:{},
      setProperty(name, value) { this.values[name] = value; }
    },
    getBoundingClientRect() { return { top:this.top, height:this.height }; }
  };
  const main = { height:500, getBoundingClientRect() { return { height:this.height }; } };
  const controls = { dataset:{ currentState:"split" } };
  function stateButton(action) {
    return {
      dataset:{ inspectorStateAction:action }, hidden:false, title:"", isConnected:true, attributes:{},
      setAttribute(name, value) { this.attributes[name] = String(value); },
      getAttribute(name) { return this.attributes[name] || null; },
      focus() { document.activeElement = this; this.focusCount = (this.focusCount || 0) + 1; }
    };
  }
  const up = stateButton("up");
  const down = stateButton("down");
  const splitter = {
    classList:classList(),
    captured:new Set(),
    addEventListener(type, listener) { splitterListeners[type] = listener; },
    setPointerCapture(pointerId) { this.captured.add(pointerId); },
    hasPointerCapture(pointerId) { return this.captured.has(pointerId); },
    releasePointerCapture(pointerId) { this.captured.delete(pointerId); }
  };
  const displayTabs = { addEventListener() {} };
  const nodes = {
    "[data-testid='workspace-inspector-stack']":stack,
    ".main-stage":main,
    "[data-testid='workspace-inspector-splitter']":splitter,
    "[data-testid='inspector-state-controls']":controls,
    "[data-testid='inspector-state-up']":up,
    "[data-testid='inspector-state-down']":down,
    "[data-testid='display-tabs']":displayTabs,
    "[data-testid='display-tabs-wrap']":{}
  };
  const document = {
    activeElement:null,
    body:{ classList:classList() },
    querySelector(selector) { return nodes[selector] || null; },
    querySelectorAll(selector) { return selector === ".plot-chart[data-pane-host][data-plot-ready='true']" ? plotHosts : []; },
    addEventListener() {},
    createElement() { return {}; },
    head:{ appendChild() {} }
  };
  const Plotly = {
    relayout(host, update) { relayoutCalls.push({ host, update }); return Promise.resolve(); },
    react() { reactCalls.push(Array.from(arguments)); return Promise.resolve(); },
    newPlot() { newPlotCalls.push(Array.from(arguments)); return Promise.resolve(); }
  };
  const window = {
    SignalAnalyserApi:new Proxy({}, { get(_target, property) { return function () { apiCalls.push(property); return Promise.resolve(); }; } }),
    SignalAnalyserSettings:{ setRevision() {}, setContext() {}, setView() {}, render() {}, state() { return { dirty:false, invalid:false }; }, load() { return Promise.resolve(); } },
    SignalAnalyserValueSelect:{ close(restoreFocus) { valueSelectCloseCalls.push(restoreFocus); } },
    Plotly,
    getComputedStyle(host) {
      if (host.dynamicPlot && stack.dataset.inspectorState === "expanded") return { display:"none", visibility:"visible" };
      return host.style || { display:"block", visibility:"visible" };
    },
    addEventListener(type, listener) { if (type === "resize") resizeListeners.push(listener); },
    clearTimeout() {}, setTimeout() { return 0; },
    requestAnimationFrame(callback) { nextFrame += 1; frames.set(nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.runInNewContext(source, { window, document, Promise, Error, Array, Object, String, Number, Boolean, Math, CSS:{ escape(value) { return value; } } }, { filename:path.join(root, "public/js/app.js") });

  function addPlot(key, options) {
    options = options || {};
    const host = {
      dynamicPlot:true,
      dataset:{ paneHost:key, plotReady:options.ready === false ? "false" : "true" },
      isConnected:options.connected !== false,
      hidden:!!options.hidden,
      style:{ display:options.display || "block", visibility:options.visibility || "visible" },
      _fullLayout:options.layout || { xaxis:{}, yaxis:{} },
      getBoundingClientRect() { return { width:options.width === undefined ? 480 : options.width, height:options.height === undefined ? 260 : options.height }; }
    };
    Object.defineProperty(host, "offsetParent", { get() { return stack.dataset.inspectorState === "expanded" || options.offsetParent === null ? null : {}; } });
    plotHosts.push(host);
    return host;
  }

  return {
    test:window.__task0102, stack, main, splitter, splitterListeners, controls, up, down, document,
    apiCalls, relayoutCalls, reactCalls, newPlotCalls, valueSelectCloseCalls, resizeListeners, plotHosts, addPlot,
    pendingFrames() { return frames.size; },
    flushFrames() {
      const pending=Array.from(frames.entries());
      pending.forEach(function (entry) { frames.delete(entry[0]); entry[1](); });
    }
  };
}

function pointer(pointerId, clientY, extras) {
  return Object.assign({ pointerId, clientY, button:0, isPrimary:true, type:"pointermove", prevented:false, preventDefault() { this.prevented = true; } }, extras || {});
}

function trackHeight(harness) {
  return Number(String(harness.stack.style.values["--workspace-main-track"] || "").replace("px", ""));
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

module.exports = async function testTask0102LowerInspectorStatesBehavior(assert) {
  const geometry = createHarness();
  geometry.stack.height = 716;
  const defaultMain = geometry.stack.height * 0.8 - 62.4;
  const defaultLower = geometry.stack.height - 8 - defaultMain;
  assert(Math.abs(defaultMain - 510.4) < 0.001 && Math.abs(defaultLower - 197.6) < 0.001, "the v18 unset CSS split must resolve H=716 to approximately 510.4px main and 197.6px lower tracks");
  geometry.main.height = defaultMain;
  geometry.test.model.state = { active_display_id:"display-a", displays:[{ id:"display-a" }] };
  const geometryPlot = geometry.addPlot("display-a::pane-1");
  geometry.splitterListeners.pointerdown(pointer(18, 100, { type:"pointerdown" }));
  geometry.splitterListeners.pointermove(pointer(18, 130));
  assert(trackHeight(geometry) === 528 && geometry.test.model.workspaceSplitRatio === 1, "the first +30px drag from the H=716 default must be effective and clamp immediately to the 528/180px maximum split");
  geometry.splitterListeners.pointermove(pointer(18, -1000));
  assert(trackHeight(geometry) === 440 && geometry.test.model.workspaceSplitRatio === 0, "the same drag must retain the inherited 440px main-track minimum clamp");
  geometry.splitterListeners.pointermove(pointer(18, 2000));
  assert(trackHeight(geometry) === 528 && geometry.test.model.workspaceSplitRatio === 1, "the same drag must retain the inherited H-8-180 maximum clamp");
  geometry.splitterListeners.pointerup(pointer(18, 2000, { type:"pointerup" }));
  assert(geometry.pendingFrames() === 1, "an effective default-split drag must retain the one-frame autoscale settle behavior");
  geometry.flushFrames();
  await settle();
  assert(geometry.relayoutCalls.length === 1 && geometry.relayoutCalls[0].host === geometryPlot, "the effective default-split drag must autoscale the existing current ready plot exactly once");

  const harness = createHarness();
  const { test, up, down, controls, splitterListeners } = harness;
  assert(test.model.workspaceInspectorState === "split" && test.model.workspaceSplitRatio === null && harness.stack.dataset.inspectorState === "split", "a fresh page must initialize split without a persisted ratio");
  assert(["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"].every((type) => typeof splitterListeners[type] === "function"), "all inherited pointer lifecycle paths must remain wired in every state");

  test.model.state = { active_display_id:"display-a", displays:[{ id:"display-a" }] };
  test.model.revision = 77;
  const visibleReady = harness.addPlot("display-a::pane-1");
  harness.addPlot("display-a::pane-loading", { ready:false });
  harness.addPlot("display-a::pane-detached", { connected:false });
  harness.addPlot("display-b::pane-other");

  test.model.workspaceSplitRatio = 0.25;
  test.retain();
  assert(trackHeight(harness) === 533, "the saved split ratio must resolve against 440/8/180 minima with one-pixel rounding");

  test.change(up);
  assert(test.model.workspaceInspectorState === "expanded" && harness.stack.dataset.inspectorState === "expanded" && controls.dataset.currentState === "expanded", "split/up must transition exactly to expanded");
  assert(up.hidden && !down.hidden && down.dataset.tooltip === "Вернуть средний размер" && down.getAttribute("aria-label") === "Нижняя зона: развернута. Вернуть средний размер", "expanded must hide up and expose only down as a return-to-split action");
  assert(test.model.workspaceSplitRatio === 0.25 && trackHeight(harness) === 533, "expanded must not overwrite or approximate the saved split");

  test.change(down);
  assert(test.model.workspaceInspectorState === "split" && harness.stack.dataset.inspectorState === "split" && !up.hidden && !down.hidden, "expanded/down must return exactly to split and reveal both choices");
  assert(up.dataset.tooltip === "Развернуть нижнюю зону" && down.dataset.tooltip === "Свернуть нижнюю зону" && trackHeight(harness) === 533, "returning split must restore the saved track and exact two-button copy");

  test.change(down);
  assert(test.model.workspaceInspectorState === "collapsed" && harness.stack.dataset.inspectorState === "collapsed" && !up.hidden && down.hidden, "split/down must transition exactly to collapsed and expose only up");
  assert(up.dataset.tooltip === "Вернуть средний размер" && up.getAttribute("aria-label") === "Нижняя зона: свернута. Вернуть средний размер", "collapsed must explain that up returns to the saved split");
  assert(test.model.workspaceSplitRatio === 0.25, "collapsed must not overwrite the saved split");

  test.change(up);
  assert(test.model.workspaceInspectorState === "split" && !up.hidden && !down.hidden && trackHeight(harness) === 533, "collapsed/up must return exactly to split and restore both choices");
  assert(harness.document.activeElement === up && up.focusCount === 2 && down.focusCount === 2, "focus must move only to the visible corresponding arrow through both fixed-state returns");
  assert(harness.valueSelectCloseCalls.length === 4 && harness.valueSelectCloseCalls.every((value) => value === false), "every state transition must close the shared selector without a focus bounce");
  assert(harness.pendingFrames() === 1, "rapid split/extreme/split changes must cancel stale autoscale frames and leave exactly one settle pass");
  harness.flushFrames();
  await settle();
  assert(harness.relayoutCalls.length === 1 && harness.relayoutCalls[0].host === visibleReady, "after settle exactly one existing current visible-ready host must use the inherited autoscale lifecycle");
  assert(harness.relayoutCalls[0].update.autosize === true && harness.relayoutCalls[0].update["xaxis.autorange"] === true && harness.relayoutCalls[0].update["yaxis.autorange"] === true, "the settle pass must remain an autosize/autorange relayout only");
  assert(harness.reactCalls.length === 0 && harness.newPlotCalls.length === 0, "state cycling must never Plotly.react or remount an existing plot");
  assert(harness.apiCalls.length === 0 && test.model.revision === 77 && harness.plotHosts[0] === visibleReady, "state cycling must issue no API/calculation/revision work and preserve the mounted host identity");

  test.setState("expanded", false);
  const savedBeforeInertDrag = test.model.workspaceSplitRatio;
  splitterListeners.pointerdown(pointer(31, 100, { type:"pointerdown" }));
  splitterListeners.pointermove(pointer(31, 103));
  splitterListeners.pointerup(pointer(31, 103, { type:"pointerup" }));
  assert(test.model.workspaceInspectorState === "expanded" && test.model.workspaceSplitRatio === savedBeforeInertDrag && harness.pendingFrames() === 0, "a fixed-state drag below 4px must be completely inert and schedule no autoscale");

  splitterListeners.pointerdown(pointer(32, 100, { type:"pointerdown" }));
  splitterListeners.pointercancel(pointer(32, 100, { type:"pointercancel" }));
  assert(test.model.workspaceInspectorState === "expanded" && test.model.workspaceSplitDrag === null && harness.pendingFrames() === 0, "pointercancel without deliberate movement must leave the fixed state and autoscale untouched");

  splitterListeners.pointerdown(pointer(33, 100, { type:"pointerdown" }));
  splitterListeners.pointermove(pointer(33, 104));
  assert(test.model.workspaceInspectorState === "split" && trackHeight(harness) === 440 && test.model.workspaceSplitRatio === 0, "an exact 4px deliberate drag must enter split and clamp at the 440px upper minimum");
  splitterListeners.pointerup(pointer(33, 104, { type:"pointerup" }));
  assert(harness.pendingFrames() === 1, "a completed deliberate fixed-to-split drag must schedule one settle autoscale");
  harness.flushFrames();
  await settle();

  test.setState("collapsed", false);
  splitterListeners.pointerdown(pointer(34, 100, { type:"pointerdown" }));
  splitterListeners.pointermove(pointer(34, 2000));
  assert(test.model.workspaceInspectorState === "split" && trackHeight(harness) === 812 && test.model.workspaceSplitRatio === 1, "fixed-state drag must also clamp at H-8-180 and enter normal split resizing");
  splitterListeners.pointercancel(pointer(34, 2000, { type:"pointercancel" }));
  assert(harness.pendingFrames() === 0 && test.model.workspaceSplitDrag === null, "pointercancel after state entry must clean capture without scheduling autoscale");
  assert(harness.apiCalls.length === 0 && test.model.revision === 77 && harness.reactCalls.length === 0 && harness.newPlotCalls.length === 0, "all direct-manipulation paths must remain layout-only");

  harness.stack.height = 628;
  test.model.workspaceSplitRatio = 0.5;
  test.retain();
  assert(trackHeight(harness) === 440, "at the minimum 628px stack the split must remain exactly 440/8/180");

  const reload = createHarness();
  assert(reload.test.model.workspaceInspectorState === "split" && reload.test.model.workspaceSplitRatio === null && reload.stack.dataset.inspectorState === "split" && Object.keys(reload.stack.style.values).length === 0, "reload must discard fixed state and saved ratio, returning to the inherited CSS split");
  assert(reload.apiCalls.length === 0, "fresh split initialization must not issue an API request");
};
