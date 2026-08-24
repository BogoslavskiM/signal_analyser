(function registerScopedOutputLoading(window, document) {
  "use strict";

  var paneRequests=Object.create(null);
  var layoutRequest=null;

  function clean(value) { return String(value == null ? "" : value); }
  function paneSelector(id) {
    if (window.CSS && typeof window.CSS.escape === "function") return "[data-pane-id='"+window.CSS.escape(clean(id))+"']";
    return "[data-pane-id='"+clean(id).replace(/[\\']/g,"\\$&")+"']";
  }
  function spinner(testid,label,className) {
    var overlay=document.createElement("div");
    overlay.className=className;
    overlay.dataset.testid=testid;
    overlay.setAttribute("role","status");
    overlay.setAttribute("aria-live","polite");
    overlay.setAttribute("aria-label",label);
    overlay.innerHTML="<span class='ui-loader-spinner' aria-hidden='true'></span>";
    return overlay;
  }
  function workspace(root) { return (root || document).querySelector("[data-testid='display-workspace']"); }
  function grid(root) {
    var owner=workspace(root);
    return owner && owner.querySelector("[data-testid='plot-grid'], .plot-grid");
  }
  function sync(root) {
    root=root || document;
    var owner=workspace(root), canvas=grid(root);
    if (!owner || !canvas) return;
    if (layoutRequest) {
      owner.dataset.layoutReconciling="true";
      owner.setAttribute("aria-busy","true");
      owner.querySelectorAll(".pane-output-loading-overlay").forEach(function (node) { node.remove(); });
      var layoutOverlay=canvas.querySelector(":scope > .display-canvas-loading-overlay");
      if (!layoutOverlay) {
        layoutOverlay=spinner("display-canvas-loading-overlay","Обновление макета экрана","display-canvas-loading-overlay");
        canvas.appendChild(layoutOverlay);
      }
      layoutOverlay.dataset.displayId=clean(layoutRequest.displayId);
      return;
    }
    delete owner.dataset.layoutReconciling;
    owner.removeAttribute("aria-busy");
    owner.querySelectorAll(".display-canvas-loading-overlay").forEach(function (node) { node.remove(); });
    Object.keys(paneRequests).forEach(function (id) {
      var pane=owner.querySelector(paneSelector(id));
      if (!pane) return;
      pane.setAttribute("aria-busy","true");
      var overlay=Array.prototype.find.call(pane.children,function (child) { return child.classList && child.classList.contains("pane-output-loading-overlay"); });
      if (!overlay) {
        overlay=spinner("pane-output-loading-overlay-"+id,"Обновление области","pane-output-loading-overlay");
        pane.appendChild(overlay);
      }
      overlay.dataset.paneId=id;
    });
    owner.querySelectorAll(".pane-output-loading-overlay").forEach(function (overlay) {
      if (!paneRequests[overlay.dataset.paneId]) overlay.remove();
    });
    owner.querySelectorAll("[data-pane-id][aria-busy='true']").forEach(function (pane) {
      if (!paneRequests[pane.dataset.paneId]) pane.removeAttribute("aria-busy");
    });
  }
  function beginPane(paneId,token) {
    paneId=clean(paneId);
    if (!paneId) return null;
    paneRequests[paneId]={token:clean(token || ("pane-"+Date.now())),terminal:null};
    sync();
    return paneRequests[paneId].token;
  }
  function settlePane(paneId,token,terminal) {
    paneId=clean(paneId);
    var current=paneRequests[paneId];
    if (!current || clean(token) !== current.token) return false;
    if (["ready","empty","error"].indexOf(terminal) < 0) return false;
    delete paneRequests[paneId];
    sync();
    return true;
  }
  function beginLayout(displayId,token) {
    layoutRequest={displayId:clean(displayId),token:clean(token || ("layout-"+Date.now()))};
    sync();
    return layoutRequest.token;
  }
  function settleLayout(displayId,token,terminal) {
    if (!layoutRequest || clean(displayId) !== layoutRequest.displayId || clean(token) !== layoutRequest.token) return false;
    if (["ready","empty","error"].indexOf(terminal) < 0) return false;
    layoutRequest=null;
    sync();
    return true;
  }
  function state() {
    return {layout:layoutRequest && {displayId:layoutRequest.displayId,token:layoutRequest.token},panes:Object.keys(paneRequests)};
  }

  window.SignalAnalyserScopedLoading={
    beginPane:beginPane,
    settlePane:settlePane,
    beginLayout:beginLayout,
    settleLayout:settleLayout,
    sync:sync,
    state:state,
    paneTerminalStates:["ready","empty","error"],
    layoutTerminalStates:["ready","empty","error"],
    lifecycle:{
      paneBegin:"accepted pane type change or valid Area settings commit immediately before mutation/output request",
      paneEnd:"matching current output reaches ready, empty or error; stale completions do not dismiss",
      layoutBegin:"display layout add/remove/rows/columns mutation start before pane DOM reconciliation",
      layoutEnd:"matching accepted layout and every initial pane output reach ready, empty or error",
      priority:"layout overlay suppresses every pane overlay beneath it"
    }
  };
}(window,document));
