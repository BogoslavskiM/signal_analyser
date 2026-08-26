"use strict";

const fs=require("fs"), path=require("path"), vm=require("vm");

function sourceBlock(source, name, end) {
  const start=source.indexOf("(function "+name);
  const finish=source.indexOf(end, start);
  return source.slice(start, finish+end.length);
}

function classList() {
  const values=new Set();
  return { add(v){values.add(v);}, remove(v){values.delete(v);}, contains(v){return values.has(v);} };
}

function node(extra) {
  const attributes={};
  return Object.assign({
    dataset:{}, children:[], classList:classList(), parentElement:null,
    appendChild(child){child.parentElement=this;this.children.push(child);return child;},
    remove(){if(!this.parentElement)return;const i=this.parentElement.children.indexOf(this);if(i>=0)this.parentElement.children.splice(i,1);this.parentElement=null;},
    setAttribute(key,value){attributes[key]=String(value);}, removeAttribute(key){delete attributes[key];},
    getAttribute(key){return Object.prototype.hasOwnProperty.call(attributes,key)?attributes[key]:null;},
    querySelector(){return null;}, querySelectorAll(){return [];}
  },extra||{});
}

function loadingController(app) {
  const workspace=node(), grid=node(), pane=node({dataset:{paneId:"pane-1"}});
  workspace.querySelector=(selector)=>selector==="[data-testid='plot-grid'], .plot-grid"?grid:selector==="[data-pane-id='pane-1']"?pane:null;
  workspace.querySelectorAll=(selector)=>{
    if(selector===".pane-output-loading-overlay") return pane.children.filter(child=>child.classList.contains("pane-output-loading-overlay")||child.className==="pane-output-loading-overlay");
    if(selector===".display-canvas-loading-overlay") return grid.children.filter(child=>child.classList.contains("display-canvas-loading-overlay")||child.className==="display-canvas-loading-overlay");
    if(selector==="[data-pane-id][aria-busy='true']") return pane.getAttribute("aria-busy")==="true"?[pane]:[];
    return [];
  };
  grid.querySelector=(selector)=>selector===":scope > .display-canvas-loading-overlay"?grid.children.find(child=>child.classList.contains("display-canvas-loading-overlay")||child.className==="display-canvas-loading-overlay")||null:null;
  const document={
    querySelector(selector){return selector==="[data-testid='display-workspace']"?workspace:null;},
    createElement(){return node();}
  };
  const window={CSS:{escape(value){return value;}}};
  vm.runInNewContext(sourceBlock(app,"registerScopedOutputLoading","}(window,document));"),{window,document,Object,String,Array,Date},{filename:"task0139-loading"});
  return {controller:window.SignalAnalyserScopedLoading,workspace,grid,pane};
}

module.exports=async function(assert){
  const root=path.resolve(__dirname,"../../../.."),app=fs.readFileSync(path.join(root,"public/js/app.js"),"utf8"),css=fs.readFileSync(path.join(root,"public/css/app.css"),"utf8");
  const inventoryBlock=sourceBlock(app,"registerTask0139Inventory","}(window));"),inventoryWindow={};
  vm.runInNewContext(inventoryBlock,{window:inventoryWindow,Object,String,Array},{filename:"task0139-inventory"});
  const inventory=inventoryWindow.SignalAnalyserTask0139Inventory;
  assert(inventory.sampleOptionalDefaultVisibility==="all_hidden"&&inventory.sampleOptionalColumns.join(",")==="magnitude,square,signed_square_root_magnitude"&&inventory.sampleColumnRemoved==="square_root","Values inventory must keep all three optional columns hidden by default and omit Root");
  const intended=["bandpass","fft","smooth","custom-preprocess"].map(value=>({value}));
  assert(inventory.withoutFft(intended).map(item=>item.value).join(",")==="bandpass,smooth,custom-preprocess","the generic inventory helper may remove FFT without restoring a math-operation list");
  assert(!/value:\s*["'](?:fft|abs|square|sqrt|signed-sqrt|multiply|denoise|knn)["']/.test(app),"the operation dialog must expose none of the removed operation choices");
  assert(/registerSignalAnalyserPreprocessOperation[\s\S]*?var OPERATIONS=Object\.freeze[\s\S]*?window\.SignalAnalyserPreprocessOperation/.test(app),"the operation dialog must be hosted by the V59 typed preprocessing seam");

  assert(/var paneLoadingToken=mutationOptions\.focusAreaAfterPlotTypeChange \? beginPaneLoading\(targetDisplayId, payload\.pane_id, "plot-type"\) : null;[\s\S]*?var layoutLoadingToken=payload\.operation === "resize" \? beginLayoutLoading\(targetDisplayId\) : null;[\s\S]*?return mutate/.test(app),"plot-type and layout loaders must start before their accepted mutation request");
  assert(/if \(!publication\.areaOutput[\s\S]*?areaLoads\.push\(\{ displayId:publication\.displayId, paneId:publication\.paneId, token:beginPaneLoading\(publication\.displayId, publication\.paneId, "area-settings"\) \}\);[\s\S]*?boundedApply\(settings\.commit\(\)/.test(app),"only valid Area settings publications may start a pane loader immediately before commit");
  assert(/if \(layoutLoadingToken\) acceptLayoutLoading/.test(app)&&/if \(paneLoadingToken\) armPaneLoading/.test(app)&&/if \(paneLoadingToken\) settlePaneLoading/.test(app)&&/if \(layoutLoadingToken\) settleLayoutLoading/.test(app),"accepted mutations must arm matching loaders while errors settle only their matching tokens");
  assert(/if \(response\.isready\) projectOutputTerminalAfterRender\(displayId, paneId,[\s\S]*?token\)/.test(app)&&/function projectOutputTerminalAfterRender\(displayId, paneId, terminal, outputToken\)[\s\S]*?model\.outputTokens\[runtimeKey\] !== outputToken[\s\S]*?markOutputTerminal\(displayId, paneId, terminal\)/.test(app)&&/hasPlotData\(response\.data\) \? "ready" : "empty"/.test(app)&&/markOutputTerminal\(displayId, paneId, "empty"\)/.test(app),"only ready, empty and error output terminals may end a scoped loader after the matching current output render");
  assert(/\[data-layout-reconciling="true"\] \.pane-output-loading-overlay \{\s*display: none;\s*\}/.test(css)&&/\.display-canvas-loading-overlay \{\s*z-index: 30;/.test(css)&&/\.pane-output-loading-overlay \{\s*z-index: 20;/.test(css),"layout overlay must visually cover pane loaders and stay above all pane content");

  const h=loadingController(app),c=h.controller;
  c.beginPane("pane-1","pane-old");
  assert(h.pane.children.length===1&&h.pane.getAttribute("aria-busy")==="true"&&c.state().panes[0]==="pane-1","pane loader must mount synchronously and cover only its pane");
  c.beginPane("pane-1","pane-new");
  assert(c.settlePane("pane-1","pane-old","ready")===false&&c.state().panes.length===1,"stale pane completion must not clear the newer loader");
  assert(c.settlePane("pane-1","pane-new","ready")===true&&c.state().panes.length===0&&h.pane.children.length===0,"matching terminal pane completion must remove the pane loader");
  c.beginPane("pane-1","pane-under-layout");
  c.beginLayout("display-1","layout-new");
  assert(h.workspace.dataset.layoutReconciling==="true"&&h.grid.children.length===1&&h.pane.children.length===0,"layout loader must synchronously suppress pane overlays and leave settings/chrome outside its canvas host");
  assert(c.settleLayout("display-1","layout-old","ready")===false&&c.state().layout.token==="layout-new","stale layout completion must not clear the newer display loader");
  assert(c.settleLayout("display-1","layout-new","error")===true&&c.state().layout===null&&h.workspace.getAttribute("aria-busy")===null,"matching layout terminal must clear the canvas loader even on error");
};
