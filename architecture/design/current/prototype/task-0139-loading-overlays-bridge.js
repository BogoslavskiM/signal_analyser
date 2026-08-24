(function installTask0139PrototypeBridge(window,document) {
  "use strict";
  var loading=window.SignalAnalyserScopedLoading;
  if (!loading) return;
  var sequence=0;
  function next(prefix) { sequence+=1; return prefix+"-"+sequence; }
  function activePaneId() {
    var pane=document.querySelector("[data-pane-id].is-active,[data-pane-id][data-active='true'],[data-pane-id].active");
    if (!pane) pane=document.querySelector("[data-pane-id]");
    return pane && pane.dataset.paneId;
  }
  function activeDisplayId() {
    var tab=document.querySelector("[data-display-id][aria-selected='true'],[data-display-select][aria-selected='true']");
    return tab && (tab.dataset.displayId || tab.dataset.displaySelect) || "display-1";
  }
  function terminalPane(paneId,token,terminal,delay) {
    window.setTimeout(function () { loading.settlePane(paneId,token,terminal || "ready"); },delay || 420);
  }
  function terminalLayout(displayId,token,terminal,delay) {
    window.setTimeout(function () { loading.settleLayout(displayId,token,terminal || "ready"); },delay || 520);
  }

  window.addEventListener("signal-analyser:pane-type",function (event) {
    var paneId=event.detail && event.detail.paneId || activePaneId(), token=next("pane-type");
    loading.beginPane(paneId,token);
    terminalPane(paneId,token,"ready");
  },true);
  document.addEventListener("change",function (event) {
    if (!event.target.closest || !event.target.closest("[data-settings-content]")) return;
    var paneId=activePaneId();
    if (!paneId) return;
    var token=next("area-settings");
    loading.beginPane(paneId,token);
    terminalPane(paneId,token,"ready");
  },true);
  document.addEventListener("click",function (event) {
    var mutation=event.target.closest && event.target.closest("[data-layout-apply],[data-add-pane],[data-remove-pane]");
    if (!mutation) return;
    var displayId=activeDisplayId(), token=next("layout");
    loading.beginLayout(displayId,token);
    terminalLayout(displayId,token,"ready");
  },true);
  window.Task0139LoadingPrototype={
    beginPane:function (paneId) { var token=next("manual-pane"); loading.beginPane(paneId,token); return token; },
    settlePane:loading.settlePane,
    beginLayout:function (displayId) { var token=next("manual-layout"); loading.beginLayout(displayId,token); return token; },
    settleLayout:loading.settleLayout,
    state:loading.state
  };
  loading.sync();
  document.documentElement.dataset.task0139Ready="true";
}(window,document));
