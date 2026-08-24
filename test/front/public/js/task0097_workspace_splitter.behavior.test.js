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

function createSplitterHarness() {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("})(window, document);", "window.__workspaceSplitterTest = { model:model, start:startWorkspaceSplitDrag, move:moveWorkspaceSplitDrag, stop:stopWorkspaceSplitDrag, retain:retainWorkspaceSplitOnResize, queueAutoscale:queueWorkspaceSplitAutoscale }; })(window, document);");

  const splitterListeners = {};
  const stack = {
    height: 1000,
    style: {
      values: {},
      setProperty(name, value) { this.values[name] = value; }
    },
    getBoundingClientRect() { return { height: this.height }; }
  };
  const main = { height: 500, getBoundingClientRect() { return { height: this.height }; } };
  const splitter = {
    classList: classList(),
    captured: new Set(),
    addEventListener(type, listener) { splitterListeners[type] = listener; },
    setPointerCapture(pointerId) { this.captured.add(pointerId); },
    hasPointerCapture(pointerId) { return this.captured.has(pointerId); },
    releasePointerCapture(pointerId) { this.captured.delete(pointerId); }
  };
  const displayTabs = { addEventListener() {} };
  const resizeListeners = [];
  const apiCalls = [];
  const frames = new Map();
  let nextFrame = 0;
  const plotHosts = [];
  const relayoutCalls = [];
  const nodes = {
    "[data-testid='workspace-inspector-stack']": stack,
    ".main-stage": main,
    "[data-testid='workspace-inspector-splitter']": splitter,
    "[data-testid='display-tabs']": displayTabs,
    "[data-testid='display-tabs-wrap']": {}
  };
  const document = {
    body: { classList: classList() },
    querySelector(selector) { return nodes[selector] || null; },
    querySelectorAll(selector) { return selector === ".plot-chart[data-pane-host][data-plot-ready='true']" ? plotHosts : []; },
    addEventListener() {},
    createElement() { return {}; },
    head: { appendChild() {} }
  };
  const window = {
    SignalAnalyserApi: new Proxy({}, { get(_target, property) { return property === "getState" ? function () { return new Promise(() => {}); } : function () { apiCalls.push(property); return Promise.resolve(); }; } }),
    SignalAnalyserSettings: { setRevision() {}, setContext() {}, setView() {}, render() {}, state() { return { dirty:false, invalid:false }; }, load() { return Promise.resolve(); } },
    Plotly: { relayout(host, update) { if (host.throwOnRelayout) throw new Error("relayout failed"); relayoutCalls.push({ host, update }); return host.rejectRelayout ? Promise.reject(new Error("relayout rejected")) : Promise.resolve(); } },
    getComputedStyle(host) { return host.style || { display:"block", visibility:"visible" }; },
    addEventListener(type, listener) { if (type === "resize") resizeListeners.push(listener); },
    clearTimeout() {}, setTimeout() { return 0; },
    requestAnimationFrame(callback) { nextFrame += 1; frames.set(nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.runInNewContext(source, { window, document, Promise, Error, Array, Object, String, Number, Boolean, Math, CSS:{ escape(value) { return value; } } }, { filename:path.join(root, "public/js/app.js") });
  return {
    test:window.__workspaceSplitterTest, stack, main, splitter, splitterListeners, resizeListeners, body:document.body, apiCalls, plotHosts, relayoutCalls,
    flushFrames() { Array.from(frames.entries()).forEach(function (entry) { frames.delete(entry[0]); entry[1](); }); },
    pendingFrames() { return frames.size; }
  };
}

function pointer(pointerId, clientY, extras) {
  const event = Object.assign({ pointerId, clientY, button:0, isPrimary:true, prevented:false, preventDefault() { this.prevented = true; } }, extras || {});
  return event;
}

function trackHeight(harness) {
  return Number(String(harness.stack.style.values["--workspace-main-track"] || "").replace("px", ""));
}

function plotHost(key, layout, options) {
  options = options || {};
  return {
    dataset: { paneHost:key, plotReady:options.ready === false ? "false" : "true" },
    isConnected: options.connected !== false,
    hidden: !!options.hidden,
    offsetParent: options.offsetParent === null ? null : {},
    style: { display:options.display || "block", visibility:options.visibility || "visible" },
    _fullLayout: layout,
    throwOnRelayout: !!options.throwOnRelayout,
    rejectRelayout: !!options.rejectRelayout,
    getBoundingClientRect() { return { width:options.width === undefined ? 480 : options.width, height:options.height === undefined ? 260 : options.height }; }
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

module.exports = async function testTask0097WorkspaceInspectorSplitterBehavior(assert) {
  const harness = createSplitterHarness();
  const { test, splitter, splitterListeners, body } = harness;
  assert(test.model.workspaceSplitRatio === null && Object.keys(harness.stack.style.values).length === 0, "before user drag the default CSS 4:1 allocation must remain preference-free");
  assert(["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"].every((type) => typeof splitterListeners[type] === "function"), "the live splitter must register every pointer lifecycle listener");

  splitterListeners.pointerdown(pointer(7, 200, { button:1 }));
  splitterListeners.pointerdown(pointer(7, 200, { isPrimary:false }));
  assert(test.model.workspaceSplitDrag === null && !splitter.classList.contains("is-dragging"), "secondary and non-primary pointers must not begin a resize");

  const start = pointer(7, 200);
  splitterListeners.pointerdown(start);
  assert(start.prevented && splitter.hasPointerCapture(7) && splitter.classList.contains("is-dragging") && body.classList.contains("is-resizing-workspace"), "primary pointerdown must prevent selection, capture its pointer and activate document resize state");

  const unrelatedMove = pointer(8, 1000);
  splitterListeners.pointermove(unrelatedMove);
  assert(!unrelatedMove.prevented && Object.keys(harness.stack.style.values).length === 0, "an unrelated pointer must not change the split or suppress native behavior");

  const move = pointer(7, 300);
  splitterListeners.pointermove(move);
  assert(move.prevented && trackHeight(harness) === 600, "captured pointer movement must change only the requested main-stage height");
  assert(Math.abs(test.model.workspaceSplitRatio - (160 / 372)) < 1e-9, "drag must retain the normalized ratio after accounting for the 440px main minimum");

  splitterListeners.pointermove(pointer(7, -10000));
  assert(trackHeight(harness) === 440 && test.model.workspaceSplitRatio === 0, "upward drag must clamp at the 440px main-stage minimum");
  splitterListeners.pointermove(pointer(7, 10000));
  assert(trackHeight(harness) === 812 && test.model.workspaceSplitRatio === 1, "downward drag must clamp at the lower inspector's 180px minimum plus 8px splitter");

  splitterListeners.pointerup(pointer(7, 10000, { type:"pointerup" }));
  assert(!splitter.hasPointerCapture(7) && !splitter.classList.contains("is-dragging") && !body.classList.contains("is-resizing-workspace") && test.model.workspaceSplitDrag === null, "pointerup must release all temporary drag state");

  splitterListeners.pointerdown(pointer(9, 250));
  splitterListeners.pointercancel(pointer(9, 250));
  assert(!splitter.hasPointerCapture(9) && !splitter.classList.contains("is-dragging") && !body.classList.contains("is-resizing-workspace"), "pointercancel must use the same cleanup path");
  splitterListeners.pointerdown(pointer(10, 250));
  splitterListeners.lostpointercapture(pointer(10, 250));
  assert(!splitter.hasPointerCapture(10) && !splitter.classList.contains("is-dragging") && !body.classList.contains("is-resizing-workspace"), "lostpointercapture must use the same cleanup path");

  test.model.workspaceSplitRatio = 0.5;
  harness.stack.height = 1200;
  test.retain();
  assert(trackHeight(harness) === 726, "resize must retain the selected ratio and recompute against the new available height");
  harness.stack.height = 628;
  test.retain();
  assert(trackHeight(harness) === 440, "resize at the exact combined minima must clamp while keeping the splitter visible");

  test.model.state = { active_display_id:"display-a", displays:[{ id:"display-a" }, { id:"display-b" }] };
  const first = plotHost("display-a::pane-1", { xaxis:{}, yaxis:{}, xaxis2:{}, yaxis2:{ visible:false } });
  const failed = plotHost("display-a::pane-2", { xaxis:{}, yaxis:{} }, { throwOnRelayout:true });
  const second = plotHost("display-a::pane-3", { xaxis:{}, yaxis:{}, yaxis2:{} });
  harness.plotHosts.push(first, failed, second);
  harness.plotHosts.push(plotHost("display-b::pane-4", { xaxis:{}, yaxis:{} }));
  harness.plotHosts.push(plotHost("display-a::pane-5", { xaxis:{}, yaxis:{} }, { ready:false }));
  harness.plotHosts.push(plotHost("display-a::pane-6", { xaxis:{}, yaxis:{} }, { width:0 }));

  harness.stack.height = 1000;
  splitterListeners.pointerdown(pointer(18, 320));
  splitterListeners.pointermove(pointer(18, 350));
  splitterListeners.pointerup(pointer(18, 350, { type:"pointerup" }));
  assert(harness.pendingFrames() === 1 && harness.relayoutCalls.length === 0, "a meaningful drag must defer its autoscale pass rather than relayout during pointer movement");
  const newerStart = pointer(19, 350);
  splitterListeners.pointerdown(newerStart);
  splitterListeners.pointermove(pointer(19, 375));
  splitterListeners.pointerup(pointer(19, 375, { type:"pointerup" }));
  assert(harness.pendingFrames() === 1 && harness.relayoutCalls.length === 0, "a newer drag must cancel the obsolete frame and leave its latest pass deferred until animation-frame completion");
  harness.flushFrames();
  await settle();
  assert(harness.relayoutCalls.length === 2, "failed, stale-display, not-ready and zero-sized hosts must not prevent each remaining current ready plot from relayout");
  const firstUpdate = harness.relayoutCalls.filter(function (call) { return call.host === first; })[0].update;
  const secondUpdate = harness.relayoutCalls.filter(function (call) { return call.host === second; })[0].update;
  assert(firstUpdate.autosize === true && firstUpdate["xaxis.autorange"] === true && firstUpdate["yaxis.autorange"] === true && firstUpdate["xaxis2.autorange"] === true && !Object.prototype.hasOwnProperty.call(firstUpdate, "yaxis2.autorange"), "every live visible x/y axis must be autoranged together with autosize");
  assert(secondUpdate["xaxis.autorange"] === true && secondUpdate["yaxis.autorange"] === true && secondUpdate["yaxis2.autorange"] === true, "secondary axes must not be skipped for another visible plot host");

  const callCount = harness.relayoutCalls.length;
  splitterListeners.pointerdown(pointer(23, 420));
  splitterListeners.pointercancel(pointer(23, 420, { type:"pointercancel" }));
  splitterListeners.pointerdown(pointer(24, 420));
  splitterListeners.pointerup(pointer(24, 420, { type:"pointerup" }));
  assert(harness.pendingFrames() === 0, "pointercancel and an unchanged pointerup must not queue autoscale");
  harness.flushFrames();
  await settle();
  assert(harness.relayoutCalls.length === callCount, "non-effective drag terminal paths must not call Plotly relayout");
  assert(harness.apiCalls.length === 0, "all splitter lifecycle and autoscale operations must avoid API/output activity");
};
