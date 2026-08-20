"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function sourceRoot() {
  return fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/js/app.js"), "utf8");
}

function attributesNode(extra) {
  const attributes = {};
  return Object.assign({
    dataset:{}, style:{}, isConnected:true, disabled:false,
    setAttribute(name, value) { attributes[name] = String(value); },
    getAttribute(name) { return attributes[name]; }
  }, extra || {});
}

function rangeInputHandler(source, row, settingCalls) {
  const begin = source.indexOf('  document.addEventListener("input", function (event) {\n    var input = event.target, slider = input.closest');
  const end = source.indexOf('\n  document.addEventListener("dblclick", function (event) {', begin);
  if (begin < 0 || end < 0) throw new Error("the authored Screen range input handler is missing");
  const listeners = {};
  const slider = attributesNode();
  const context = {
    document:{ addEventListener(type, listener) { listeners[type] = listener; } },
    CSS:{ escape(value) { return value; } },
    Number, String, Math,
    model:{ settingsPage:"area", rangeBoundaryIntents:{} },
    q() { return row; },
    settings:{ setValue(field, value) { settingCalls.push({ field, value }); } },
    rememberRangeBoundaryIntent(field, boundary, value) {
      const entry=context.model.rangeBoundaryIntents[field] || (context.model.rangeBoundaryIntents[field]={});
      if (value === "") delete entry[boundary]; else entry[boundary]=String(value);
      if (!Object.keys(entry).length) delete context.model.rangeBoundaryIntents[field];
    }
  };
  vm.runInNewContext(source.slice(begin, end), context, { filename:"public/js/app.js:range-input" });
  return { listener:listeners.input, slider };
}

function automaticRangeRenderer(source, row) {
  const begin=source.indexOf('  function rangeBoundaryIntentKey(fieldId) {');
  const end=source.indexOf('\n  function renderScreenSettings(display) {', begin);
  if (begin < 0 || end < 0) throw new Error("automatic range intent helpers are missing");
  const context={
    model:{ settingsPage:"area", activePane:"pane-1", rangeBoundaryIntents:{} },
    CSS:{ escape(value) { return value; } }, Object, Number, String, Math,
    activeDisplay() { return {id:"display-1"}; },
    q() { return row; },
    settings:{ value() { return {min:null,max:null}; } }
  };
  vm.runInNewContext(source.slice(begin,end),context,{filename:"public/js/app.js:automatic-range"});
  return context;
}

function cursorController(source) {
  const begin=source.indexOf('(function task0130GraphCursors(window, document) {');
  const end=source.indexOf('}(window,document));', begin);
  if (begin < 0 || end < 0) throw new Error("TASK-0130 cursor controller is missing");
  const listeners={}, frames=[];
  const document={
    addEventListener(type, listener) { (listeners[type] || (listeners[type]=[])).push(listener); },
    createElement() { return overlayNode(); },
    querySelector(selector) { return document.lookup ? document.lookup(selector) : null; }
  };
  const window={ requestAnimationFrame(callback) { frames.push(callback); return frames.length; } };
  vm.runInNewContext(source.slice(begin, end+'}(window,document));'.length), { window, document, Number, String, Array, Object, Math, CSS:{escape(value){return value;}} }, { filename:"public/js/app.js:task0130" });
  return { ui:window.SignalAnalyserGraphCursorUI, listeners, frames, document };
}

function lineNode(index, overlay) {
  const classes=new Set();
  return attributesNode({
    dataset:{ cursorIndex:String(index), cursorLabel:String(index+1) }, classList:{ add(value){classes.add(value);}, remove(value){classes.delete(value);}, contains(value){return classes.has(value);} },
    focusCount:0, focus(){ this.focusCount += 1; }, setPointerCapture(){},
    closest(selector) {
      if (selector === ".plot-cursor-line" || selector === ".plot-cursor-line.is-dragging" && classes.has("is-dragging")) return this;
      if (selector === "[data-graph-cursor-overlay]") return overlay;
      return null;
    }
  });
}

function overlayNode() {
  const overlay=attributesNode({ className:"", lines:[], readout:null, removeCount:0,
    remove(){ this.isConnected=false; this.removeCount += 1; },
    querySelectorAll(selector) { return selector === ".plot-cursor-line" ? this.lines : []; },
    querySelector(selector) {
      if (selector === ".plot-cursor-readout") return this.readout;
      const match=selector.match(/^\[data-cursor-index='(\d+)'\]$/);
      return match ? this.lines[Number(match[1])] || null : null;
    }
  });
  Object.defineProperty(overlay, "innerHTML", { set(markup) {
    const count=(markup.match(/data-cursor-index/g) || []).length;
    overlay.lines=Array.from({ length:count }, (_unused, index) => lineNode(index, overlay));
    overlay.readout=attributesNode({ innerHTML:"" });
  }, get(){ return ""; } });
  return overlay;
}

function graphHost() {
  const parent={ children:[], appendChild(node) { node.parentElement=this; this.children.push(node); } };
  return attributesNode({
    data:[{ name:"A", x:[0, 3, 7, 10], y:[0, 30, 70, 100] }, { name:"peaks", x:[0, 10], y:[0, 0], meta:{signal_analyser_peaks_overlay:true} }],
    parentElement:parent,
    _fullLayout:{ xaxis:{ range:[0,10], title:{ text:"Время, с" } }, _size:{l:0,t:0,w:100,h:80}, margin:{r:0,b:0} },
    getBoundingClientRect(){ return { left:0, top:0, width:100, height:100 }; }
  });
}

module.exports = async function task0130CursorsAndAutomaticRanges(assert) {
  const source=sourceRoot();

  // The exact handler is evaluated with a small DOM double. This makes the
  // per-boundary automatic-state contract executable without a browser.
  const selection=attributesNode();
  const row={ querySelector(selector) { return selector === "[data-range-part='min']" ? min : selector === "[data-range-part='max']" ? max : null; } };
  const calls=[];
  const range=rangeInputHandler(source, row, calls);
  range.slider.dataset={ fullMin:"0", fullMax:"10", screenRangeSlider:"time.x_limits" };
  // A fresh automatic pair has concrete range handles but blank authoritative text inputs.
  const minText=attributesNode({ value:"" }), maxText=attributesNode({ value:"" });
  row.querySelector=(selector) => selector === "[data-range-part='min']" ? minText : selector === "[data-range-part='max']" ? maxText : null;
  const minHandle=attributesNode({ value:"0", step:"0.01", dataset:{screenRangeInput:"min"}, closest(){ return range.slider; } });
  const maxHandle=attributesNode({ value:"10", step:"0.01", dataset:{screenRangeInput:"max"}, closest(){ return range.slider; } });
  range.slider.querySelector=(selector) => selector === "[data-screen-range-input='min']" ? minHandle : selector === "[data-screen-range-input='max']" ? maxHandle : selector === ".screen-range-selection" ? selection : null;

  minHandle.value="0"; range.listener({ target:minHandle });
  assert(minText.value === "0" && maxText.value === "", "moving the minimum handle, even exactly to the full-domain endpoint, must materialize only minimum and retain blank automatic maximum");
  assert(calls[0].field === "time.x_limits" && calls[0].value.min === "0" && calls[0].value.max === "", "endpoint movement must publish one explicit bound and the untouched automatic bound as an empty value");

  minText.value=""; maxText.value=""; calls.length=0; maxHandle.value="10"; range.listener({ target:maxHandle });
  assert(minText.value === "" && maxText.value === "10", "moving the maximum handle, including to the full-domain endpoint, must materialize only maximum and retain blank automatic minimum");
  assert(calls[0].value.min === "" && calls[0].value.max === "10", "maximum-only interaction must not silently materialize a minimum value");

  const automatic=automaticRangeRenderer(source,row);
  const automaticMin=attributesNode({value:"stale"}), automaticMax=attributesNode({value:"stale"});
  row.querySelector=(selector) => selector === "[data-range-part='min']" ? automaticMin : selector === "[data-range-part='max']" ? automaticMax : null;
  automatic.keepAutomaticRangeInputsEmpty("time.x_limits","x",{});
  assert(automaticMin.value === "" && automaticMax.value === "", "authoritative untouched null limits must render as blank inputs, never as full-domain numbers");
  automatic.rememberRangeBoundaryIntent("time.x_limits","max","10");
  automatic.keepAutomaticRangeInputsEmpty("time.x_limits","x",{});
  assert(automaticMin.value === "" && automaticMax.value === "10", "an accepted rerender with null values must retain only the current pane's explicit endpoint intent");
  automatic.rememberRangeBoundaryIntent("time.x_limits","max","");
  automatic.keepAutomaticRangeInputsEmpty("time.x_limits","x",{});
  assert(automaticMin.value === "" && automaticMax.value === "", "clearing a direct input must discard its endpoint intent and restore the automatic placeholder");
  assert(/input\.dataset\.rangePart === undefined[\s\S]*?rememberRangeBoundaryIntent\(input\.dataset\.settingId, input\.dataset\.rangePart, input\.value\)/.test(source), "direct range text input must establish and clear only its own explicit-boundary intent");
  assert(/document\.addEventListener\("dblclick"[\s\S]*?minimum\.value=""; if \(maximum\) maximum\.value="";[\s\S]*?settings\.setValue\(fieldId, \{ min:"", max:"" \}\)/.test(source), "double-clicking a Screen/Area range slider must reset both values to automatic blank bounds");

  const cursor=cursorController(source);
  const menu={ markup:"", querySelector(selector) { return selector === "[data-plot-help]" ? help : null; }, insertAdjacentHTML(position, markup) { this.position=position; this.markup=markup; } };
  const help={ insertAdjacentHTML(position, markup) { menu.position=position; menu.markup=markup; } };
  cursor.ui.ensureMenuItems(menu);
  assert(menu.position === "beforebegin" && menu.markup.indexOf("data-plot-cursor-mode='single'") < menu.markup.indexOf("data-plot-cursor-mode='dual'") && menu.markup.indexOf("Курсор") < menu.markup.indexOf("Два курсора"), "overflow menu must place Cursor then Two cursors immediately before Help");
  assert(/role='menuitemcheckbox'[\s\S]*?data-testid='pane-menu-cursor'[\s\S]*?data-testid='pane-menu-dual-cursor'/.test(menu.markup), "cursor menu inventory must use checkbox semantics and stable controls");

  const hostA=graphHost(), hostB=graphHost(), controller=cursor.ui.createController();
  const buttons=[attributesNode({dataset:{plotCursorMode:"single"}, querySelector(){ return {textContent:"Курсор"}; }}), attributesNode({dataset:{plotCursorMode:"dual"}, querySelector(){ return {textContent:"Два курсора"}; }})];
  controller.syncMenu({ querySelectorAll(){ return buttons; } }, "display::a", false);
  assert(buttons.every((button) => button.disabled && button.getAttribute("aria-checked") === "false" && /только для загруженной/.test(button.title)), "cursor menu controls must be disabled for an ineligible pane without inventing a selected state");

  controller.attach("display::a",hostA);
  controller.attach("display::b",hostB);
  assert(controller.setMode("display::a",hostA,"single") === "single" && controller.mode("display::a") === "single" && controller.mode("display::b") === "off", "single cursor mode must remain pane-local and begin off elsewhere");
  const overlayA=hostA.parentElement.children[0];
  assert(overlayA.lines.length === 1 && overlayA.lines[0].getAttribute("aria-valuenow") === "3", "single cursor must snap its initial midpoint to the nearest actual X sample and expose slider ARIA values");
  assert(controller.setMode("display::a",hostA,"dual") === "dual" && overlayA.lines.length === 2, "switching mode must replace the pane-local overlay with two cursors");

  const pointerDown=cursor.listeners.pointerdown[0], pointerMove=cursor.listeners.pointermove[0], pointerUp=cursor.listeners.pointerup[0], keydown=cursor.listeners.keydown[0];
  let prevented=0, stopped=0;
  pointerDown({ target:overlayA.lines[0], pointerId:1, clientX:-50, preventDefault(){prevented += 1;}, stopPropagation(){stopped += 1;} });
  assert(overlayA.lines[0].getAttribute("aria-valuenow") === "0", "dragging outside the left plot edge must clamp and snap to the first sample");
  pointerMove({ target:overlayA.lines[0], clientX:120, preventDefault(){prevented += 1;}, stopPropagation(){stopped += 1;} });
  assert(overlayA.lines[0].getAttribute("aria-valuenow") === "10", "dragging outside the right plot edge must clamp and snap to the final sample");
  pointerUp({ target:overlayA.lines[0], preventDefault(){prevented += 1;}, stopPropagation(){stopped += 1;} });
  cursor.document.lookup=(selector) => /data-cursor-index='0'/.test(selector) ? overlayA.lines[0] : null;
  keydown({ target:overlayA.lines[0], key:"ArrowLeft", preventDefault(){prevented += 1;}, stopPropagation(){stopped += 1;} });
  assert(overlayA.lines[0].getAttribute("aria-valuenow") === "7" && prevented >= 4 && stopped >= 4, "keyboard arrows must move exactly one adjacent sample, prevent graph gestures and retain a focusable cursor");
  cursor.frames.shift()();
  assert(overlayA.lines[0].focusCount === 1, "keyboard cursor movement must restore focus after its DOM update");

  assert(controller.setMode("display::a",hostA,"dual") === "off" && controller.mode("display::a") === "off" && overlayA.removeCount === 1, "repeating the active cursor mode must turn it off and remove its overlay");
  controller.setMode("display::b",hostB,"single");
  const overlayB=hostB.parentElement.children[0];
  controller.clear("display::b");
  assert(controller.mode("display::b") === "off" && overlayB.removeCount === 1, "clear/remove lifecycle must dispose pane-local cursor overlays without touching another pane");
  assert(!/SignalAnalyserApi|Plotly/.test(source.slice(source.indexOf('(function task0130GraphCursors'), source.indexOf('}(window,document));', source.indexOf('(function task0130GraphCursors')))), "cursor controller must remain client-local: no API/session/revision or Plotly react/relayout calls");
  assert(/var cursors=paneGraphCursorController\(\);[\s\S]*?cursors\.update\(runtimeKey\);[\s\S]*?adjustRangeSliderFullRange/.test(source) && /plotly_restyle[\s\S]*?cursors\.attach\(runtimeKey, host\)/.test(source), "cursor overlay must refresh after Plotly relayout/restyle lifecycle events while remaining outside the Plotly rendering queue");
};
