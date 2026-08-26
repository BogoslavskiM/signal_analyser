(function task0130PrototypeBridge(window, document) {
  "use strict";
  var ui=window.SignalAnalyserGraphCursorUI;
  if (!ui) return;
  var menu=document.querySelector("[data-testid='display-overflow-menu']"), controller=ui.createController();
  ui.ensureMenuItems(menu);

  function context() {
    var paneId=menu && menu.dataset.paneId, displayId=menu && menu.dataset.displayId;
    if (!paneId || !displayId) return null;
    var host=document.querySelector("[data-testid='plot-host-"+CSS.escape(paneId)+"']");
    var pane=document.querySelector("[data-pane-id='"+CSS.escape(paneId)+"']");
    var typeInput=pane && pane.querySelector("[data-value-select-key$='::plot_type'] input, .pane-select input");
    var typeLabel=typeInput && typeInput.value || "";
    var eligible=!!(host && host.dataset.plotReady === "true" && Array.isArray(host.data) && host.data.length && !/Спектрограмма/i.test(typeLabel));
    return { key:displayId+"::"+paneId, host:host, pane:pane, eligible:eligible };
  }
  function sync() {
    if (!menu || menu.hidden) return;
    var current=context();
    controller.syncMenu(menu,current && current.key,current && current.eligible);
  }
  function attachVisible() {
    document.querySelectorAll("[data-pane-host][data-plot-ready='true']").forEach(function (host) {
      controller.attach(host.dataset.paneHost,host);
    });
  }

  document.addEventListener("click",function (event) {
    var action=event.target.closest && event.target.closest("[data-plot-cursor-mode]");
    if (!action) return;
    var current=context();
    if (!current || !current.eligible) return;
    event.preventDefault(); event.stopPropagation();
    controller.setMode(current.key,current.host,action.dataset.plotCursorMode);
    controller.syncMenu(menu,current.key,true);
    menu.hidden=true;
    if (current.pane) {
      var trigger=current.pane.querySelector("[data-pane-menu]");
      if (trigger) trigger.setAttribute("aria-expanded","false");
    }
  });

  window.addEventListener("resize",function () { attachVisible(); });
  new MutationObserver(function () { attachVisible(); sync(); }).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["hidden","data-plot-ready"]});
  attachVisible();
  document.documentElement.dataset.task0130Ready="true";
  window.SignalAnalyserTask0130Review={ controller:controller, context:context, sync:sync, attachVisible:attachVisible };
}(window,document));
