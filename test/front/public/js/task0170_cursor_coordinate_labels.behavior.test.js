"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function sourceRoot() {
  return fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/js/app.js"), "utf8");
}

function cssRoot() {
  return fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/css/app.css"), "utf8");
}

function styleDeclaration() {
  const values = {};
  return new Proxy({
    setProperty(name, value) { values[name] = String(value); },
    getPropertyValue(name) { return values[name] || ""; }
  }, {
    get(target, name) { return name in target ? target[name] : values[name] || ""; },
    set(_target, name, value) { values[name] = String(value); return true; }
  });
}

function selectorMatch(node, selector) {
  if (!node) return false;
  if (selector === ".plot-cursor-line") return node.classList.contains("plot-cursor-line");
  if (selector === ".plot-cursor-line.is-dragging") return node.classList.contains("plot-cursor-line") && node.classList.contains("is-dragging");
  if (selector === "[data-graph-cursor-overlay]") return node.dataset.graphCursorOverlay !== undefined;
  if (selector === "[data-cursor-x-label]") return node.dataset.cursorXLabel !== undefined;
  if (selector === "[data-cursor-y-labels]") return node.dataset.cursorYLabels !== undefined;
  if (selector === "[data-cursor-y-label]") return node.dataset.cursorYLabel !== undefined;
  const cursor = selector.match(/^\[data-cursor-index='(\d+)'\]$/);
  if (cursor) return node.dataset.cursorIndex === cursor[1];
  return false;
}

function element(tagName) {
  const attributes = {};
  const classes = new Set();
  const node = {
    tagName:String(tagName || "div").toUpperCase(),
    dataset:{}, style:styleDeclaration(), children:[], parentElement:null,
    isConnected:true, textContent:"", className:"", offsetHeight:20,
    get offsetWidth() { return Math.max(44, String(this.textContent || "").length * 6 + 10); },
    classList:{
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); },
      toggle(value, force) { const next=force === undefined ? !classes.has(value) : !!force; if (next) classes.add(value); else classes.delete(value); return next; }
    },
    setAttribute(name, value) { attributes[name]=String(value); if (name === "class") this.className=String(value); },
    getAttribute(name) { return attributes[name]; },
    appendChild(child) { child.parentElement=this; child.isConnected=true; this.children.push(child); return child; },
    remove() { this.isConnected=false; if (this.parentElement) this.parentElement.children=this.parentElement.children.filter((child) => child !== this); },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) {
      const found=[];
      function visit(parent) { parent.children.forEach((child) => { if (selectorMatch(child,selector)) found.push(child); visit(child); }); }
      visit(this);
      return found;
    },
    closest(selector) { let current=this; while (current) { if (selectorMatch(current,selector)) return current; current=current.parentElement; } return null; },
    focus() { this.focusCount=(this.focusCount || 0)+1; },
    setPointerCapture() {}
  };
  Object.defineProperty(node,"className",{
    get() { return Array.from(classes).join(" "); },
    set(value) { classes.clear(); String(value || "").split(/\s+/).filter(Boolean).forEach((name) => classes.add(name)); }
  });
  Object.defineProperty(node,"innerHTML",{
    get() { return ""; },
    set(markup) {
      this.children=[];
      if (!String(markup).includes("data-cursor-index")) return;
      const count=(String(markup).match(/data-cursor-index/g) || []).length;
      for (let index=0; index<count; index+=1) {
        const line=element("button");
        line.className="plot-cursor-line";
        line.dataset.cursorIndex=String(index);
        line.dataset.cursorLabel=String(index+1);
        this.appendChild(line);
      }
    }
  });
  return node;
}

function harness(source) {
  const begin=source.indexOf("(function task0130GraphCursors(window, document) {");
  const marker="}(window,document));";
  const end=source.indexOf(marker,begin);
  if (begin < 0 || end < 0) throw new Error("TASK-0130 cursor controller is missing");
  const listeners={},frames=[],observers=[];
  class ResizeObserverDouble {
    constructor(callback) { this.callback=callback; this.observed=[]; this.disconnectCount=0; observers.push(this); }
    observe(target) { this.observed.push(target); }
    disconnect() { this.disconnectCount+=1; this.observed=[]; }
    trigger() { this.callback(); }
  }
  const document={
    addEventListener(type,listener) { (listeners[type] || (listeners[type]=[])).push(listener); },
    createElement(tag) { return element(tag); },
    querySelector(selector) { return document.lookup ? document.lookup(selector) : null; }
  };
  const window={
    ResizeObserver:ResizeObserverDouble,
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {}
  };
  vm.runInNewContext(source.slice(begin,end+marker.length),{
    window,document,Number,String,Array,Object,Math,CSS:{escape(value){return value;}}
  },{filename:"public/js/app.js:task0130-coordinate-labels"});
  return {
    ui:window.SignalAnalyserGraphCursorUI,listeners,observers,frames,document,
    flushFrames() { while (frames.length) frames.shift()(); }
  };
}

function graphHost(options) {
  const parent=element("div"), host=element("div");
  const yAxis=options && options.yAxis || {range:[0,100],d2p(value){return 80-Number(value)*0.8;}};
  host.parentElement=parent;
  host.data=[
    {name:"Синий",legendgroup:"blue",x:[0,2,4,6,8,10],y:[0,20,40,60,80,100],line:{color:"#2563eb"}},
    {name:"Красный",legendgroup:"red",x:[0,2,4,6,8,10],y:[100,80,60,40,20,0],line:{color:"#dc2626"}},
    {name:"Скрытый",visible:false,x:[0,10],y:[50,50],line:{color:"#111111"}},
    {name:"Только легенда",visible:"legendonly",x:[0,10],y:[60,60],line:{color:"#222222"}},
    {name:"Экстремумы",x:[0,10],y:[70,70],meta:{signal_analyser_peaks_overlay:true},marker:{color:"#db2777"}}
  ];
  host._fullData=host.data.map((trace) => Object.assign({},trace));
  host._fullLayout={
    xaxis:{range:[0,10],title:{text:"Время, с"},d2p(value){return Number(value)*10;},p2d(pixel){return Number(pixel)/10;}},
    yaxis:yAxis,
    _size:{l:10,t:5,w:100,h:80},margin:{r:10,b:35}
  };
  host.getBoundingClientRect=() => ({left:0,top:0,width:120,height:120});
  return host;
}

function labels(overlay) {
  const lines=overlay.querySelectorAll(".plot-cursor-line");
  return {
    lines,
    x:lines.map((line) => line.querySelector("[data-cursor-x-label]")),
    y:lines.map((line) => line.querySelectorAll("[data-cursor-y-label]"))
  };
}

module.exports=async function task0170CursorCoordinateLabels(assert) {
  const source=sourceRoot(),css=cssRoot(),h=harness(source),controller=h.ui.createController(),host=graphHost();

  controller.attach("display::pane",host);
  controller.setMode("display::pane",host,"single");
  const overlay=host.parentElement.querySelector("[data-graph-cursor-overlay]"),single=labels(overlay);
  assert(single.lines.length===1&&single.x.length===1&&single.x[0],"single mode must create exactly one X coordinate label");
  assert(single.x[0].textContent==="4 с","X label must expose the snapped value and current localized X-axis unit");
  assert(single.y[0].length===2,"single mode must create one Y label for each visible non-overlay trace only");
  const blueLabel=single.y[0].find((label) => label.dataset.traceIndex==="0");
  const redLabel=single.y[0].find((label) => label.dataset.traceIndex==="1");
  assert(blueLabel&&blueLabel.textContent==="Y: 40"&&blueLabel.style.color==="#2563eb"&&/Синий: Y: 40/.test(blueLabel.getAttribute("aria-label")),"blue Y label must interpolate the correct trace and preserve its identity/color");
  assert(redLabel&&redLabel.textContent==="Y: 60"&&redLabel.style.color==="#dc2626"&&/Красный: Y: 60/.test(redLabel.getAttribute("aria-label")),"red Y label must interpolate the correct trace and preserve its identity/color");
  assert(single.y[0].every((label) => !/Скрытый|Только легенда|Экстремумы/.test(label.getAttribute("aria-label"))),"hidden, legendonly and extrema/helper overlay traces must never create Y labels");

  controller.setMode("display::pane",host,"dual");
  const dual=labels(overlay);
  assert(dual.lines.length===2&&dual.x.filter(Boolean).length===2&&dual.y.every((items) => items.length===2),"dual mode must create exactly one X label per cursor and one Y label per visible signal trace per cursor");
  assert(dual.x[0].textContent.endsWith(" с")&&dual.x[1].textContent.endsWith(" с"),"both dual-cursor X labels must retain the current unit");
  const shifts=dual.x.map((label) => label.style.getPropertyValue("--cursor-x-label-shift"));
  assert(shifts.every((value) => value.endsWith("px"))&&shifts[0]!==shifts[1],"nearby dual X labels must receive collision-aware independent placement");
  dual.y.forEach((items) => {
    const top=items.map((label) => parseFloat(label.style.top));
    assert(top.every((value) => value>=9&&value<=71)&&Math.abs(top[1]-top[0])>=20,"Y labels must be clamped inside the plot and separated when trace intersections collide");
  });

  const down=h.listeners.pointerdown[0],move=h.listeners.pointermove[0],up=h.listeners.pointerup[0],keydown=h.listeners.keydown[0];
  down({target:dual.lines[0],pointerId:1,clientX:-100,preventDefault(){},stopPropagation(){}});
  assert(dual.lines[0].getAttribute("aria-valuenow")==="0"&&dual.lines[0].querySelector("[data-cursor-x-label]").textContent==="0 с","drag update must clamp to the left edge and update the X label in the same projection");
  move({target:dual.lines[0],clientX:1000,preventDefault(){},stopPropagation(){}});
  up({target:dual.lines[0],preventDefault(){},stopPropagation(){}});
  assert(dual.lines[0].getAttribute("aria-valuenow")==="10"&&dual.lines[0].querySelector("[data-cursor-x-label]").textContent==="10 с","drag update must clamp to the right edge without leaving a stale label");
  h.document.lookup=(selector) => /data-cursor-index='0'/.test(selector) ? overlay.querySelector("[data-cursor-index='0']") : null;
  keydown({target:dual.lines[0],key:"ArrowLeft",preventDefault(){},stopPropagation(){}});
  assert(overlay.querySelector("[data-cursor-index='0']").getAttribute("aria-valuenow")==="8"&&overlay.querySelector("[data-cursor-index='0']").querySelector("[data-cursor-x-label]").textContent==="8 с","keyboard movement must update the coordinate label by one adjacent sample");

  assert(h.observers.length===1&&h.observers[0].observed[0]===host,"one pane must own exactly one ResizeObserver for label reprojection");
  const priorOverlay=host.parentElement.querySelector("[data-graph-cursor-overlay]");
  h.observers[0].trigger(); h.flushFrames();
  assert(host.parentElement.querySelector("[data-graph-cursor-overlay]")===priorOverlay&&labels(priorOverlay).x.length===2,"resize must update the existing overlay without leaking duplicate labels or overlays");
  controller.attach("display::pane",host);
  assert(h.observers.length===1,"reattaching the same Plotly host must reuse its observer");

  const replacement=graphHost({yAxis:{type:"log",range:[0,2],d2p(value){return 80-Math.log10(Number(value))*40;}}});
  replacement.data[0].y=[1,2,4,10,25,100]; replacement.data[1].y=[100,25,10,4,2,1];
  replacement._fullData=replacement.data.map((trace) => Object.assign({},trace));
  controller.attach("display::pane",replacement);
  assert(h.observers[0].disconnectCount===1&&priorOverlay.isConnected===false&&h.observers.length===2,"react/host replacement must disconnect and remove the old pane-owned label projection before attaching the new one");
  const logarithmic=replacement.parentElement.querySelector("[data-graph-cursor-overlay]"),logLabels=labels(logarithmic).y[0];
  assert(logLabels.length===2&&logLabels.every((label) => parseFloat(label.style.top)>=9&&parseFloat(label.style.top)<=71),"logarithmic or reversed Plotly Y-axis projection must use its native d2p geometry and remain clamped");
  controller.clear("display::pane");
  assert(h.observers[1].disconnectCount===1&&logarithmic.isConnected===false&&!replacement.parentElement.querySelector("[data-graph-cursor-overlay]"),"clear must remove all labels and disconnect the current ResizeObserver");

  assert(/host\.on\("plotly_relayouting"[\s\S]*?host\.on\("plotly_relayout"[\s\S]*?cursors\.update\(runtimeKey\)/.test(source),"relayouting and relayout must synchronously update cursor labels");
  assert(/host\.on\("plotly_restyle"[\s\S]*?cursors\.attach\(runtimeKey, host\)/.test(source)&&/host\.on\("plotly_afterplot"[\s\S]*?cursors\.attach\(runtimeKey,host\)/.test(source),"restyle and afterplot must reattach/reproject labels after Plotly mutates traces");
  assert(/Plotly\.react\([\s\S]*?\.then\(function \(\)[\s\S]*?cursors\.attach\(runtimeKey, host\)/.test(source),"Plotly.react completion must attach labels to the current rendered host");
  assert(/new window\.ResizeObserver[\s\S]*?scheduleUpdate\(key\)/.test(source),"resize lifecycle must schedule a frontend-only label update");
  assert(!/plot-cursor-readout/.test(source)&&!/plot-cursor-readout/.test(css),"removed cursor readout popup must remain absent");
  assert(/\.plot-cursor-x-label[\s\S]*?border:\s*1px solid var\(--accent\)/.test(css)&&/\.plot-cursor-y-label[\s\S]*?--cursor-trace-color/.test(css),"production CSS must style X labels with the cursor accent and Y labels with their trace color");
};
