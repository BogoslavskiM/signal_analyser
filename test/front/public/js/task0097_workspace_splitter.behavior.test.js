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
  source = source.replace("})(window, document);", "window.__workspaceSplitterTest = { model:model, start:startWorkspaceSplitDrag, move:moveWorkspaceSplitDrag, stop:stopWorkspaceSplitDrag, retain:retainWorkspaceSplitOnResize }; })(window, document);");

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
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return {}; },
    head: { appendChild() {} }
  };
  const window = {
    SignalAnalyserApi: new Proxy({}, { get(_target, property) { return function () { apiCalls.push(property); return Promise.resolve(); }; } }),
    SignalAnalyserSettings: { setRevision() {}, setContext() {}, setView() {}, render() {}, state() { return { dirty:false, invalid:false }; }, load() { return Promise.resolve(); } },
    addEventListener(type, listener) { if (type === "resize") resizeListeners.push(listener); },
    clearTimeout() {}, setTimeout() { return 0; }, requestAnimationFrame() { return 0; }
  };
  vm.runInNewContext(source, { window, document, Promise, Error, Array, Object, String, Number, Boolean, Math, CSS:{ escape(value) { return value; } } }, { filename:path.join(root, "public/js/app.js") });
  return { test:window.__workspaceSplitterTest, stack, main, splitter, splitterListeners, resizeListeners, body:document.body, apiCalls };
}

function pointer(pointerId, clientY, extras) {
  const event = Object.assign({ pointerId, clientY, button:0, isPrimary:true, prevented:false, preventDefault() { this.prevented = true; } }, extras || {});
  return event;
}

function trackHeight(harness) {
  return Number(String(harness.stack.style.values["--workspace-main-track"] || "").replace("px", ""));
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

  splitterListeners.pointerup(pointer(7, 10000));
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
  assert(harness.apiCalls.length === 0, "all splitter lifecycle and resize operations must avoid API/output activity");
};
