(function signalAnalyserApp(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var settings = window.SignalAnalyserSettings;
  var numeric = window.SignalAnalyserNumeric;
  var valueSelect = window.SignalAnalyserValueSelect;
  var titles = { time: "Временная область", spectrum: "Спектр", spectrogram: "Спектрограмма", persistence: "Спектр персистентности" };
  var measurementOptions = [
    { id:"minimum", label:"Минимум" }, { id:"maximum", label:"Максимум" },
    { id:"mean", label:"Среднее" }, { id:"median", label:"Медиана" },
    { id:"peak_to_peak", label:"Размах" }, { id:"rms", label:"Среднеквадратичное" }
  ];
  var model = {
    state: null, revision: -1, layout: null, activePane: null,
    settingsPage: "display", inspectorPage: "signals", inspectorSearch:"", visibleColumns: { color:true, sample_rate:true, sample_count:true, duration:true, data_type:true }, outputs: {}, outputTokens: {}, pollByPane: {},
    plotQueue: {}, plotInFlight: {}, plotResizeFrames: {}, rangeSliderByPane: {}, rangeSliderDataRangeByPane:{}, rangeSliderFullRangeByPane:{}, rangeSliderAdjustByPane:{}, amplitudeSliderByPane:{}, amplitudeDataRangeByPane:{}, amplitudeFullRangeByPane:{}, amplitudeSelectedRangeByPane:{}, amplitudeDrag:null, amplitudeFrameByPane:{}, amplitudePendingByPane:{}, axisLinkFrame:null, axisLinkPending:null, axisLinkToken:0, axisLinkSuppressByPane:{}, toastTimer: null,
    layoutDraft: null, renderFrame: null, plotlyPromise: null,
    displayTabsFrame: null, revealDisplayTab: false, renderedDisplayId: null, displayTabsObserver: null,
    workspaceInspectorState: "split", workspaceSplitRatio: null, workspaceSplitDrag: null, workspaceSplitAutoscaleFrame: null, workspaceSplitAutoscaleToken: 0,
    measurementSearch: "", measurementsRecord: null, measurementsToken: 0, peaksRecord: null, peaksToken: 0, peaksRecords: {}, peaksTokens: {}, peaksPollByPane: {}, peaksEnableByPane: {}, peaksDraft: null, peaksApplying: false, peaksApplyQueued: false, peaksApplyEpisodeKey: null, peaksMessage: "", extremaTargetKey: null,
    signalAddCatalog: null, signalAddTrigger: null, signalAddToken: 0, signalAddLoading: false, signalAddSubmitting: false, signalAddSearch:"", signalAddSelection:{}, signalAddCatalogError:"", signalAddCachedOpen:false, signalAddResetScroll:false,
    paneMenuTrigger: null, graphHelpRestoreTarget: null, paneClearContext: null,
    sessionImport: { open:false, busy:false, phase:"file", file:null, archiveBase64:"", validation:null, error:"", details:"", publish:false, prefix:"imported_", preflight:null, preflightLoading:false, preflightError:"", preflightTimer:null, preflightToken:0, replace:false, result:null, trigger:null, controller:null },
    sessionSave: { open:false, busy:false, phase:"summary", error:"", package:null, trigger:null }
  };

  function q(selector) { return document.querySelector(selector); }
  function qa(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]; }); }
  function stateRevision(value) { return value && typeof value.state_revision === "number" ? value.state_revision : null; }
  function activeDisplay() { return model.state && (model.state.displays || []).filter(function (display) { return display.id === model.state.active_display_id; })[0]; }
  function panes() { return model.layout && Array.isArray(model.layout.panes) ? model.layout.panes : []; }
  function paneById(id) { return panes().filter(function (pane) { return pane.id === id; })[0]; }
  function paneRuntimeKey(displayId, paneId) { return String(displayId) + "::" + String(paneId); }

  function cancelInactiveDisplayWork(activeDisplayId) {
    Object.keys(model.pollByPane).forEach(function (key) {
      if (key.indexOf(String(activeDisplayId) + "::") !== 0) {
        window.clearTimeout(model.pollByPane[key]);
        delete model.pollByPane[key];
      }
    });
    Object.keys(model.plotQueue).forEach(function (key) { if (key.indexOf(String(activeDisplayId) + "::") !== 0) delete model.plotQueue[key]; });
    Object.keys(model.peaksPollByPane).forEach(function (key) {
      if (key.indexOf(String(activeDisplayId) + "::") !== 0) { window.clearTimeout(model.peaksPollByPane[key]); delete model.peaksPollByPane[key]; }
    });
  }

  function accept(snapshot) {
    var r = stateRevision(snapshot);
    if (!snapshot || r === null || r<model.revision || !Array.isArray(snapshot.displays) || !snapshot.displays.length) return false;
    model.state = snapshot;
    model.revision = r;
    settings.setRevision(r);
    updateLayout(snapshot);
    var display = activeDisplay();
    if (display) {
      cancelInactiveDisplayWork(display.id);
      stopPeaksPolling(peaksSurfaceActive() && model.activePane ? paneRuntimeKey(display.id, model.activePane) : "");
      settings.setContext(display.id, r);
    }
    return true;
  }

  function updateLayout(snapshot) {
    var source = (snapshot.layouts || []).filter(function (item) { return item.display_id === snapshot.active_display_id; })[0];
    model.layout = source ? source.layout : snapshot.layout;
    model.activePane = model.layout && model.layout.active_pane_id;
    var display = activeDisplay();
    var activeKey = display && model.activePane ? paneRuntimeKey(display.id, model.activePane) : null;
    if (model.extremaTargetKey && model.extremaTargetKey !== activeKey) model.extremaTargetKey = null;
    var currentKeys = {};
    (snapshot.layouts || []).forEach(function (item) {
      var owningDisplay = (snapshot.displays || []).filter(function (candidate) { return candidate.id === item.display_id; })[0];
      var itemPanes = item.layout && Array.isArray(item.layout.panes) ? item.layout.panes : [];
      itemPanes.forEach(function (pane) {
        var key = paneRuntimeKey(item.display_id, pane.id);
        currentKeys[key] = true;
        if (pane.plot_type !== "time" || !paneHasSignals(pane)) {
          delete model.rangeSliderByPane[key];
          delete model.rangeSliderDataRangeByPane[key];
          delete model.rangeSliderFullRangeByPane[key];
          delete model.rangeSliderAdjustByPane[key];
          delete model.amplitudeSliderByPane[key];
          delete model.amplitudeDataRangeByPane[key];
          delete model.amplitudeFullRangeByPane[key];
          delete model.amplitudeSelectedRangeByPane[key];
        }
      });
      if (!owningDisplay) itemPanes.forEach(function (pane) {
        var key = paneRuntimeKey(item.display_id, pane.id);
        delete model.rangeSliderByPane[key];
        delete model.rangeSliderDataRangeByPane[key];
        delete model.rangeSliderFullRangeByPane[key];
        delete model.rangeSliderAdjustByPane[key];
        delete model.amplitudeSliderByPane[key];
        delete model.amplitudeDataRangeByPane[key];
        delete model.amplitudeFullRangeByPane[key];
        delete model.amplitudeSelectedRangeByPane[key];
      });
    });
    Object.keys(model.rangeSliderByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderByPane[key]; });
    Object.keys(model.rangeSliderDataRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderDataRangeByPane[key]; });
    Object.keys(model.rangeSliderFullRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderFullRangeByPane[key]; });
    Object.keys(model.rangeSliderAdjustByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderAdjustByPane[key]; });
    Object.keys(model.amplitudeSliderByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeSliderByPane[key]; });
    Object.keys(model.amplitudeDataRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeDataRangeByPane[key]; });
    Object.keys(model.amplitudeFullRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeFullRangeByPane[key]; });
    Object.keys(model.amplitudeSelectedRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeSelectedRangeByPane[key]; });
    Object.keys(model.amplitudeFrameByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeFrameByPane[key]; });
    Object.keys(model.amplitudePendingByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudePendingByPane[key]; });
  }

  function scheduleRender() {
    if (model.renderFrame) return;
    model.renderFrame = window.requestAnimationFrame(function () {
      model.renderFrame = null;
      render();
    });
  }

  function render() {
    var display = activeDisplay();
    if (!display || !model.layout) return;
    var shell = q("[data-testid='app-shell']");
    shell.dataset.stateRevision = String(model.revision);
    shell.dataset.activePane = model.activePane || "";
    renderTabs();
    renderLayoutTrigger();
    renderGrid();
    renderSettings(display);
    renderInspector();
    renderColumnMenu();
    renderMeasurementMenu();
  }

  function renderTabs() {
    var tablist = q("[data-testid='display-tabs']");
    if (!tablist) return;
    var activeId = model.state.active_display_id;
    var revealActive = model.renderedDisplayId !== activeId;
    tablist.innerHTML = (model.state.displays || []).map(function (display, index) {
      var selected = display.id === model.state.active_display_id;
      return "<div class='display-tab-shell" + (selected ? " is-selected" : "") + "' data-screen-id='" + esc(display.id) + "'>" +
        "<button class='display-tab' type='button' role='tab' data-display-select='" + esc(display.id) + "' data-testid='display-tab-" + esc(display.id) + "' aria-selected='" + selected + "'><span>Экран " + (index + 1) + "</span></button>" +
        "<button class='display-tab-close header-chrome-button' type='button' data-display-close='" + esc(display.id) + "' data-testid='display-close-" + esc(display.id) + "' aria-label='Удалить экран " + (index + 1) + "' data-tooltip='Удалить экран " + (index + 1) + "'" + (model.state.displays.length === 1 ? " disabled" : "") + "><img src='./icons/close.svg' alt=''></button>" +
        "</div>";
    }).join("");
    model.renderedDisplayId = activeId;
    scheduleDisplayTabScrollUpdate(revealActive);
  }

  function revealActiveDisplayTab() {
    var tablist = q("[data-testid='display-tabs']");
    var selected = tablist && tablist.querySelector(".display-tab-shell.is-selected");
    if (!selected) return;
    var viewportStart = tablist.scrollLeft;
    var viewportEnd = viewportStart + tablist.clientWidth;
    var tabStart = selected.offsetLeft;
    var tabEnd = tabStart + selected.offsetWidth;
    if (tabStart < viewportStart) tablist.scrollLeft = tabStart;
    else if (tabEnd > viewportEnd) tablist.scrollLeft = tabEnd - tablist.clientWidth;
  }

  function updateDisplayTabScroll() {
    var tablist = q("[data-testid='display-tabs']");
    var previous = q("[data-testid='display-scroll-left']");
    var next = q("[data-testid='display-scroll-right']");
    if (!tablist || !previous || !next) return;
    var maxScroll = Math.max(0, tablist.scrollWidth - tablist.clientWidth);
    var hasOverflow = maxScroll > 1;
    previous.hidden = !hasOverflow || tablist.scrollLeft <= 1;
    next.hidden = !hasOverflow || tablist.scrollLeft >= maxScroll - 1;
  }

  function scheduleDisplayTabScrollUpdate(revealActive) {
    model.revealDisplayTab = model.revealDisplayTab || !!revealActive;
    if (model.displayTabsFrame) return;
    model.displayTabsFrame = window.requestAnimationFrame(function () {
      var shouldReveal = model.revealDisplayTab;
      model.displayTabsFrame = null;
      model.revealDisplayTab = false;
      if (shouldReveal) revealActiveDisplayTab();
      updateDisplayTabScroll();
    });
  }

  function scrollDisplayTabs(direction) {
    var tablist = q("[data-testid='display-tabs']");
    if (!tablist) return;
    var distance = Math.max(160, Math.floor(tablist.clientWidth * 0.75));
    tablist.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  function workspaceInspectorContract(state, action) {
    if (state === "expanded") return action === "down" ? { hidden:false, tooltip:"Вернуть средний размер", label:"Нижняя зона: развернута. Вернуть средний размер" } : { hidden:true };
    if (state === "collapsed") return action === "up" ? { hidden:false, tooltip:"Вернуть средний размер", label:"Нижняя зона: свернута. Вернуть средний размер" } : { hidden:true };
    return action === "up"
      ? { hidden:false, tooltip:"Развернуть нижнюю зону", label:"Нижняя зона: средний размер. Развернуть полностью" }
      : { hidden:false, tooltip:"Свернуть нижнюю зону", label:"Нижняя зона: средний размер. Свернуть полностью" };
  }

  function renderWorkspaceInspectorState() {
    var nodes = workspaceSplitNodes();
    if (!nodes.stack || !nodes.controls) return;
    nodes.stack.dataset.inspectorState = model.workspaceInspectorState;
    nodes.controls.dataset.currentState = model.workspaceInspectorState;
    [nodes.up, nodes.down].forEach(function (button) {
      if (!button) return;
      var contract = workspaceInspectorContract(model.workspaceInspectorState, button.dataset.inspectorStateAction);
      button.hidden = contract.hidden;
      if (contract.hidden) return;
      button.dataset.tooltip = contract.tooltip;
      button.title = contract.tooltip;
      button.setAttribute("aria-label", contract.label);
    });
  }

  function closeWorkspaceInspectorMenus() {
    if (valueSelect) valueSelect.close(false);
    closePaneMenu(false);
    closeColumnMenu(false);
    closeMeasurementMenu(false);
    if (model.layoutDraft) closeLayout();
  }

  function setWorkspaceInspectorState(state, autoscale) {
    if (["split", "expanded", "collapsed"].indexOf(state) < 0 || state === model.workspaceInspectorState) return;
    model.workspaceInspectorState = state;
    renderWorkspaceInspectorState();
    if (state === "split") retainWorkspaceSplitOnResize();
    if (autoscale) queueWorkspaceSplitAutoscale();
  }

  function changeWorkspaceInspectorState(button) {
    closeWorkspaceInspectorMenus();
    var action = button && button.dataset.inspectorStateAction;
    var current = model.workspaceInspectorState;
    var next = current === "split" ? (action === "up" ? "expanded" : action === "down" ? "collapsed" : null) :
      current === "expanded" && action === "down" ? "split" : current === "collapsed" && action === "up" ? "split" : null;
    if (!next) return;
    setWorkspaceInspectorState(next, true);
    var nodes = workspaceSplitNodes();
    var focusTarget = button && !button.hidden ? button : next === "expanded" ? nodes.down : next === "collapsed" ? nodes.up : null;
    if (focusTarget && focusTarget.isConnected) {
      try { focusTarget.focus({ preventScroll:true }); }
      catch (_) { focusTarget.focus(); }
    }
  }

  function workspaceSplitNodes() {
    return {
      stack: q("[data-testid='workspace-inspector-stack']"),
      main: q(".main-stage"),
      splitter: q("[data-testid='workspace-inspector-splitter']"),
      controls: q("[data-testid='inspector-state-controls']"),
      up: q("[data-testid='inspector-state-up']"),
      down: q("[data-testid='inspector-state-down']")
    };
  }

  function workspaceSplitMaximum(stack) {
    return Math.max(440, Math.floor(stack.getBoundingClientRect().height - 8 - 180));
  }

  function setWorkspaceSplitHeight(requestedHeight, preserveRatio) {
    var nodes = workspaceSplitNodes();
    if (!nodes.stack || !nodes.main) return null;
    var maximum = workspaceSplitMaximum(nodes.stack);
    var height = Math.round(Math.max(440, Math.min(maximum, requestedHeight)));
    var excess = maximum - 440;
    if (excess > 0 && !preserveRatio) model.workspaceSplitRatio = (height - 440) / excess;
    nodes.stack.style.setProperty("--workspace-main-track", height + "px");
    return height;
  }

  function retainWorkspaceSplitOnResize() {
    if (model.workspaceSplitRatio === null) return;
    var nodes = workspaceSplitNodes();
    if (!nodes.stack) return;
    var maximum = workspaceSplitMaximum(nodes.stack);
    setWorkspaceSplitHeight(440 + model.workspaceSplitRatio * (maximum - 440), true);
  }

  function cancelWorkspaceSplitAutoscale() {
    model.workspaceSplitAutoscaleToken += 1;
    if (model.workspaceSplitAutoscaleFrame !== null) window.cancelAnimationFrame(model.workspaceSplitAutoscaleFrame);
    model.workspaceSplitAutoscaleFrame = null;
  }

  function currentReadyPlotHost(host, displayId) {
    if (!host || !host.isConnected || host.dataset.plotReady !== "true") return false;
    if (!host.dataset.paneHost || host.dataset.paneHost.indexOf(String(displayId) + "::") !== 0) return false;
    if (host.hidden || host.offsetParent === null) return false;
    var style = window.getComputedStyle(host), rect = host.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function plotAutorangeUpdate(host) {
    var fullLayout = host && host._fullLayout;
    if (!fullLayout) return null;
    var update = { autosize:true }, axisCount = 0;
    Object.keys(fullLayout).forEach(function (key) {
      if (!/^[xy]axis(?:[1-9][0-9]*)?$/.test(key)) return;
      if (!fullLayout[key] || fullLayout[key].visible === false) return;
      update[key + ".autorange"] = true;
      axisCount += 1;
    });
    return axisCount ? update : null;
  }

  function queueWorkspaceSplitAutoscale() {
    cancelWorkspaceSplitAutoscale();
    var token = model.workspaceSplitAutoscaleToken;
    model.workspaceSplitAutoscaleFrame = window.requestAnimationFrame(function () {
      model.workspaceSplitAutoscaleFrame = null;
      var display = activeDisplay();
      if (!display || token !== model.workspaceSplitAutoscaleToken) return;
      var hosts = qa(".plot-chart[data-pane-host][data-plot-ready='true']").filter(function (host) { return currentReadyPlotHost(host, display.id); });
      if (!hosts.length) return;
      loadPlotly().then(function (Plotly) {
        if (token !== model.workspaceSplitAutoscaleToken || !activeDisplay() || activeDisplay().id !== display.id) return;
        hosts.forEach(function (host) {
          if (token !== model.workspaceSplitAutoscaleToken || !currentReadyPlotHost(host, display.id)) return;
          var update = plotAutorangeUpdate(host);
          if (!update) return;
          try {
            Promise.resolve(Plotly.relayout(host, update)).catch(function () { /* A single host must not block the remaining panes. */ });
          } catch (_) { /* A detached or failed host is intentionally ignored. */ }
        });
      }).catch(function () { /* Plotly is already loaded for a ready host; keep this failure isolated. */ });
    });
  }

  function stopWorkspaceSplitDrag(event) {
    var drag = model.workspaceSplitDrag;
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    var splitter = workspaceSplitNodes().splitter;
    if (splitter && splitter.hasPointerCapture && splitter.hasPointerCapture(drag.pointerId)) splitter.releasePointerCapture(drag.pointerId);
    if (splitter) splitter.classList.remove("is-dragging");
    document.body.classList.remove("is-resizing-workspace");
    model.workspaceSplitDrag = null;
    if (event && event.type === "pointerup" && Math.abs((drag.currentMainHeight == null ? drag.startMainHeight : drag.currentMainHeight) - drag.startMainHeight) > 0.5) queueWorkspaceSplitAutoscale();
    else if (event && event.type === "pointerup" && drag.changed) queueWorkspaceSplitAutoscale();
  }

  function startWorkspaceSplitDrag(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    var nodes = workspaceSplitNodes();
    if (!nodes.main || !nodes.splitter) return;
    cancelWorkspaceSplitAutoscale();
    event.preventDefault();
    model.workspaceSplitDrag = { pointerId:event.pointerId, startY:event.clientY, startMainHeight:nodes.main.getBoundingClientRect().height, currentMainHeight:null, changed:false };
    nodes.splitter.setPointerCapture(event.pointerId);
    nodes.splitter.classList.add("is-dragging");
    document.body.classList.add("is-resizing-workspace");
  }

  function moveWorkspaceSplitDrag(event) {
    var drag = model.workspaceSplitDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    if (model.workspaceInspectorState !== "split") {
      if (Math.abs(event.clientY - drag.startY) < 4) return;
      var nodes = workspaceSplitNodes();
      if (!nodes.stack) return;
      setWorkspaceInspectorState("split", false);
      drag.currentMainHeight = setWorkspaceSplitHeight(event.clientY - nodes.stack.getBoundingClientRect().top);
      drag.startMainHeight = drag.currentMainHeight;
      drag.startY = event.clientY;
      drag.changed = true;
      return;
    }
    var previousHeight = drag.currentMainHeight == null ? drag.startMainHeight : drag.currentMainHeight;
    drag.currentMainHeight = setWorkspaceSplitHeight(drag.startMainHeight + event.clientY - drag.startY);
    if (drag.currentMainHeight !== null && Math.abs(drag.currentMainHeight - previousHeight) > 0.5) drag.changed = true;
  }

  function renderLayoutTrigger() {
    var trigger = q("[data-testid='layout-trigger']");
    if (!trigger) return;
    var label = (model.layout ? model.layout.rows + " × " + model.layout.columns : "1 × 1");
    var current = trigger.querySelector(".layout-current");
    if (!current) {
      current = document.createElement("span");
      current.className = "layout-current";
      trigger.insertBefore(current, trigger.querySelector(".layout-chevron"));
      current.outerHTML = "<span class='layout-current'></span>";
      current = trigger.querySelector(".layout-current");
    }
    if (current) current.textContent = label;
    trigger.setAttribute("aria-label", "Изменить макет, текущий макет " + label.replace(" × ", " на "));
  }

  function graphLoaderEpisode(displayId, pane, record) {
    var context = record && record.context_key;
    var calculation = record && record.calculation_revision;
    var provisional = context === null || context === undefined || calculation === null || calculation === undefined;
    var paneContext = String(pane.plot_type || "") + "::" + JSON.stringify(Array.isArray(pane.signal_bindings) ? pane.signal_bindings : []);
    return {
      key:"graph::" + paneRuntimeKey(displayId, pane.id) + "::" + paneContext + "::" + (provisional ? "awaiting" : String(context) + "::" + String(calculation)),
      provisional:provisional
    };
  }

  function outputMarkup(displayId, pane, record) {
    var output = record && record.output;
    if (!pane.signal_bindings || !pane.signal_bindings.length) return "<div class='plot-empty' data-pane-output-state='empty' data-testid='pane-empty-" + esc(pane.id) + "' role='status'>Выберете сигнал для отображения</div>";
    if (!output || !output.isready) {
      var episode = graphLoaderEpisode(displayId, pane, record);
      return "<div class='plot-initial-loading' data-pane-output-state='loading' data-loader-episode-key='" + esc(episode.key) + "' data-loader-episode-provisional='" + String(episode.provisional) + "' data-testid='pane-loader-" + esc(pane.id) + "' role='status' aria-label='Загрузка графика'><span class='spinner' data-loader-spinner data-loader-episode-key='" + esc(episode.key) + "' aria-hidden='true'></span><span>Загрузка графика</span></div>";
    }
    if (!output.success) return "<div class='plot-error' data-pane-output-state='error' data-testid='pane-error-" + esc(pane.id) + "' role='alert'>" + esc(output.error || "Не удалось загрузить график.") + "</div>";
    return "<div class='plot-chart' data-pane-output-state='ready' data-pane-host='" + esc(paneRuntimeKey(displayId, pane.id)) + "' data-testid='plot-host-" + esc(pane.id) + "' data-plot-ready='false'></div>";
  }

  function createPaneNode(displayId, pane) {
    var node = document.createElement("section");
    node.className = "plot-pane";
    node.tabIndex = 0;
    node.dataset.paneId = pane.id;
    node.dataset.displayId = displayId;
    node.dataset.testid = "plot-pane-" + pane.id;
    node.innerHTML = "<header class='plot-pane-header'><span class='plot-pane-title'></span><div class='plot-control-cluster'><div class='pane-select value-select-trigger select-trigger'></div><button class='plot-more' type='button' data-pane-menu='" + esc(pane.id) + "'><img src='./icons/more-vertical.svg' alt=''></button></div></header><div class='plot-canvas'></div>";
    return node;
  }

  function reconcilePaneOutput(canvas, displayId, pane, record) {
    var output = record && record.output;
    var current = canvas.firstElementChild;
    if (paneHasSignals(pane) && (!output || !output.isready) && current && current.dataset.paneOutputState === "loading") {
      var episode = graphLoaderEpisode(displayId, pane, record);
      var sameEpisode = current.dataset.loaderEpisodeKey === episode.key;
      if (!sameEpisode && current.dataset.loaderEpisodeProvisional === "true" && !episode.provisional) {
        current.dataset.loaderEpisodeKey = episode.key;
        current.dataset.loaderEpisodeProvisional = String(episode.provisional);
        var promotedSpinner = current.querySelector("[data-loader-spinner]");
        if (promotedSpinner) promotedSpinner.dataset.loaderEpisodeKey = episode.key;
        sameEpisode = true;
      }
      if (sameEpisode) return;
    }
    var runtimeKey = paneRuntimeKey(displayId, pane.id);
    if (output && output.isready && output.success && current && current.dataset.paneOutputState === "ready" && current.dataset.paneHost === runtimeKey) return;
    canvas.innerHTML = outputMarkup(displayId, pane, record);
  }

  function reconcilePaneNode(node, displayId, pane, index, record) {
    var selected = pane.id === model.activePane;
    var runtimeKey = paneRuntimeKey(displayId, pane.id);
    var extremaTarget = runtimeKey === model.extremaTargetKey;
    node.classList.toggle("is-active", selected);
    node.classList.toggle("is-extrema-settings-target", extremaTarget);
    node.dataset.paneId = pane.id;
    node.dataset.displayId = displayId;
    node.dataset.paneSelected = String(selected);
    node.dataset.testid = "plot-pane-" + pane.id;
    node.setAttribute("aria-label", "Область " + (index + 1) + (selected ? ", активная" : "") + (extremaTarget ? ", настраивается расчёт экстремумов" : ""));
    var title = node.querySelector(".plot-pane-title");
    if (title) title.textContent = "Область " + (index + 1);
    var select = node.querySelector(".pane-select");
    if (select) {
      var paneSelectKey="pane::" + displayId + "::" + pane.id + "::plot_type";
      valueSelect.configure(select, {
        key:paneSelectKey,
        value:pane.plot_type,
        label:titles[pane.plot_type] || pane.plot_type,
        options:Object.keys(titles).map(function (kind) { return { value:kind, label:titles[kind] }; }),
        className:"pane-select",
        testId:"pane-type-" + pane.id,
        ariaLabel:"Тип графика области " + (index + 1),
        onSelect:function (plotType) {
          var current=paneById(pane.id);
          if (current && current.plot_type !== plotType) postLayout({ operation:"update_pane", pane_id:current.id, plot_type:plotType, signal_bindings:current.signal_bindings || [] });
        }
      });
    }
    var menu = node.querySelector(".plot-more");
    if (menu) {
      menu.dataset.paneMenu = pane.id;
      menu.dataset.testid = "pane-menu-" + pane.id;
      menu.setAttribute("aria-label", "Действия области " + (index + 1));
      menu.setAttribute("aria-haspopup", "menu");
      if (!menu.hasAttribute("aria-expanded")) menu.setAttribute("aria-expanded", "false");
    }
    var canvas = node.querySelector(".plot-canvas");
    if (canvas) {
      canvas.setAttribute("aria-label", "График области " + (index + 1));
      reconcilePaneOutput(canvas, displayId, pane, record);
    }
  }

  function renderGrid() {
    var grid = q("[data-testid='plot-grid']");
    if (!grid) return;
    grid.style.gridTemplateColumns = "repeat(" + model.layout.columns + ", minmax(0, 1fr))";
    grid.style.gridTemplateRows = "repeat(" + model.layout.rows + ", minmax(0, 1fr))";
    var display = activeDisplay();
    if (!display) return;
    var displayPanes = panes();
    grid.dataset.paneCount = String(displayPanes.length);
    var retained = {};
    displayPanes.forEach(function (pane, index) {
      var selector = "[data-pane-id='" + CSS.escape(pane.id) + "'][data-display-id='" + CSS.escape(display.id) + "']";
      var node = grid.querySelector(selector) || createPaneNode(display.id, pane);
      var runtimeKey = paneRuntimeKey(display.id, pane.id);
      retained[runtimeKey] = true;
      reconcilePaneNode(node, display.id, pane, index, model.outputs[runtimeKey]);
      if (grid.children[index] !== node) grid.insertBefore(node, grid.children[index] || null);
    });
    Array.prototype.slice.call(grid.children).forEach(function (node) {
      if (!retained[paneRuntimeKey(node.dataset.displayId, node.dataset.paneId)]) node.remove();
    });
    displayPanes.forEach(function (pane) {
      var record = model.outputs[paneRuntimeKey(display.id, pane.id)];
      if (record && record.output && record.output.isready && record.output.success && hasPlotData(record.output.data)) enqueuePlot(display.id, pane, record);
    });
    valueSelect.reconcile();
  }

  function renderActivePaneContext() {
    var display = activeDisplay();
    if (!display || !model.layout) return;
    var shell = q("[data-testid='app-shell']");
    if (shell) {
      shell.dataset.stateRevision = String(model.revision);
      shell.dataset.activePane = model.activePane || "";
    }
    var grid = q("[data-testid='plot-grid']");
    if (grid) grid.dataset.paneCount = String(panes().length);
    qa("[data-pane-id]").forEach(function (node, index) {
      var selected = node.dataset.paneId === model.activePane;
      var extremaTarget = display && paneRuntimeKey(display.id, node.dataset.paneId) === model.extremaTargetKey;
      node.classList.toggle("is-active", selected);
      node.classList.toggle("is-extrema-settings-target", extremaTarget);
      node.dataset.paneSelected = String(selected);
      node.setAttribute("aria-label", "Область " + (index + 1) + (selected ? ", активная" : "") + (extremaTarget ? ", настраивается расчёт экстремумов" : ""));
    });
    renderSettings(display);
    renderInspector();
  }

  function sessionImportNode() { return q("[data-testid='session-package-import-dialog']"); }
  function sessionImportMessage(error, fallback) {
    var payload = error && error.payload;
    if (payload && payload.error && payload.error.message) return payload.error.message;
    if (payload && payload.message) return payload.message;
    return safeErrorText(error, fallback || "Не удалось импортировать сессию.");
  }
  function sessionImportFocusables(dialog) { return dialog ? Array.prototype.slice.call(dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), summary:not([disabled])")).filter(function (node) { return !node.hidden; }) : []; }
  function setSessionImportModalBackground(active) {
    var shell = q("[data-testid='app-shell']");
    if (!shell) return;
    shell.inert = !!active;
    if (active) shell.setAttribute("aria-hidden", "true");
    else shell.removeAttribute("aria-hidden");
  }
  function packageError(error, fallback) { var payload=error&&error.payload, detail=payload&&payload.error; return (detail&&(detail.message||detail.code)) || sessionImportMessage(error, fallback); }
  function packageRows() { return [["Сессия и настройки","Экраны, области, привязки и текущие настройки анализа."],["Исходные данные сигналов","Имена, цвета, частоты дискретизации и исходные real/imag отсчёты."],["Снимки готовых графиков","Текущие готовые снимки графиков; состояния загрузки и ошибки не включаются."],["reproduce.jl","Скрипт включается как файл и никогда не запускается автоматически."],["Метаданные зависимостей","Project.toml, Manifest.toml и сведения о среде Engee."]]; }
  function packageProgress(title, copy, cancelId, locked) { return "<div class='progress-block' role='status' aria-live='polite'><span class='spinner'></span><div class='progress-copy'><strong>"+esc(title)+"</strong><span>"+esc(copy)+"</span></div><div class='progress-track'><i class='progress-value'></i></div></div>"; }
  function modalLayer(id, title, body, footer, busy) { return "<section class='dialog-card' role='dialog' aria-modal='true' aria-labelledby='"+id+"-title'><header class='dialog-titlebar'><h2 id='"+id+"-title' tabindex='-1'>"+esc(title)+"</h2><button class='icon-button dialog-close' type='button' data-package-close aria-label='Закрыть'"+(busy?" disabled":"")+"><img src='./icons/close.svg' alt=''></button></header><div class='dialog-body'>"+body+"</div><footer class='dialog-footer'>"+footer+"</footer></section>"; }
  function renderSessionImportDialog() {
    var current=model.sessionImport, dialog=sessionImportNode(), body, footer, v=current.validation||{}, collisions=(current.preflight&&current.preflight.collisions)||[];
    if (!current.open) { if(dialog) dialog.remove(); if(!model.sessionSave.open) setSessionImportModalBackground(false); return; }
    if (!dialog) { dialog=document.createElement("div"); dialog.className="modal-layer primary-modal-layer package-modal"; dialog.dataset.testid="session-package-import-dialog"; document.body.appendChild(dialog); }
    setSessionImportModalBackground(true); dialog.setAttribute("aria-busy", String(current.busy));
    if (current.phase==="validate") { body=packageProgress("Проверяем пакет","Структура, версия, ограничения и контрольные суммы…"); footer="<button class='button' data-package-cancel>Отменить проверку</button>"; }
    else if (current.phase==="error") { body="<div class='alert alert-error' data-testid='import-error' role='alert'><strong>Этот файл нельзя импортировать</strong><p>Текущая сессия не изменена и ни один загруженный скрипт не был запущен.</p><p>"+esc(current.error)+"</p></div>"; footer="<button class='button' data-package-close>Закрыть</button><button class='button' data-package-reselect>Выбрать другой файл</button><button class='button button-primary' data-testid='import-error-details'>Подробности проверки</button>"; }
    else if (current.phase==="commit") { body=packageProgress("Восстанавливаем сессию","Применяем проверенный пакет и обновляем состояние приложения."); footer="<button class='button' disabled>Восстановление…</button>"; }
    else if (current.phase==="success") { var w=current.result&&current.result.workspace; body="<div class='result-heading' data-testid='import-success'><img class='result-icon' src='./icons/tick-figma.svg' alt=''><div><h3>Сессия восстановлена</h3><p>"+esc(w&&w.requested ? (w.success ? "Публикация в рабочую область завершена." : "Сессия восстановлена; проверьте отчёт публикации.") : "Рабочая область Engee не изменена.")+"</p></div></div>"+(w&&w.requested?"<details data-testid='session-package-details'><summary>Отчёт публикации</summary><p>"+esc(w.error||((w.items||[]).map(function(i){return i.variable_name+": "+i.action;}).join(", ")||"Нет опубликованных имён."))+"</p></details>":""); footer="<button class='button button-primary' data-testid='import-success' data-package-close>Готово</button>"; }
    else { body="<p class='dialog-intro'>Перед восстановлением приложение проверит структуру, версию, ограничения и контрольные суммы.</p><div class='selected-file'><img src='./icons/file.svg' alt=''><div><strong>"+esc(current.file&&current.file.name)+"</strong><small>.sazip</small></div></div><div class='alert alert-warning'><strong>Безопасный импорт</strong><p>Скрипт reproduce.jl будет сохранён как файл пакета и никогда не выполняется при импорте.</p></div>"; footer="<button class='button' data-package-close>Отмена</button><button class='button button-primary' data-testid='import-validate'>Проверить пакет</button>"; }
    if(current.phase==="summary") { body="<div class='result-heading'><img class='result-icon' src='./icons/tick-figma.svg' alt=''><div><h3>Пакет проверен</h3><p>.sazip v"+esc(v.version)+" · контрольных сумм: "+esc(v.contents&&v.contents.checksum_count)+"</p></div></div><dl class='summary-grid'><dt>Сигналы</dt><dd>"+esc(v.contents&&v.contents.signals)+"</dd><dt>Экраны</dt><dd>"+esc(v.contents&&v.contents.displays)+"</dd><dt>Готовые графики</dt><dd>"+esc(v.contents&&v.contents.graph_snapshots)+"</dd><dt>Отсчёты</dt><dd>"+esc(v.limits&&v.limits.total_samples)+" / "+esc(v.limits&&v.limits.max_total_samples)+"</dd></dl><details data-testid='package-contents'><summary>Состав пакета</summary><ul><li>Сессия и настройки</li><li>Исходные данные сигналов</li><li>Готовые снимки графиков</li><li>reproduce.jl · не будет выполнен</li><li>Метаданные зависимостей</li></ul></details><label class='package-checkbox'><input type='checkbox' data-testid='workspace-publish'"+(current.publish?" checked":"")+"> Опубликовать сигналы в рабочую область Engee<small>Выключено по умолчию. Без публикации сигналы остаются только внутри приложения.</small></label>"+(current.publish?"<label class='field-label'>Префикс имён<input class='text-input' data-testid='workspace-prefix' value='"+esc(current.prefix)+"'><small>Префикс добавляется к именам публикуемых переменных.</small></label>"+(current.preflightLoading?"<p class='muted-copy' role='status'>Проверяем имена рабочей области…</p>":"")+(current.preflightError?"<p class='session-import-error' role='alert'>"+esc(current.preflightError)+"</p>":"")+(collisions.length?"<div class='alert alert-warning' data-testid='workspace-collision-warning'><strong>Обнаружены совпадения имён</strong><p>"+esc(collisions.join(", "))+"</p><p>Проверьте префикс перед импортом.</p></div>":"")+"<div class='alert alert-warning'><strong>Публикация не входит в атомарную замену</strong><p>При сбое часть переменных может быть создана. После импорта проверьте итоговый отчёт.</p></div>":"")+"<label class='package-checkbox'><input type='checkbox' data-testid='replace-confirm'"+(current.replace?" checked":"")+"> Я подтверждаю замену текущей сессии</label>"; footer="<button class='button' data-package-close>Отмена</button><button class='button button-primary' data-testid='import-commit'"+(current.replace?"":" disabled")+">Восстановить сессию</button>"; }
    dialog.innerHTML=modalLayer("session-package-import", "Импортировать переносимый пакет", body, footer, current.busy);
    bindPackageDialog(dialog);
  }
  function closeSessionImport(restoreFocus) {
    var current = model.sessionImport, trigger = current.trigger;
    if (current.busy) return;
    current.open = false;
    current.file = null; current.archiveBase64 = ""; current.validation = null; current.error = ""; current.details = ""; current.publish = false; current.prefix = "imported_"; current.replace = false; current.result = null;
    current.trigger = null;
    renderSessionImportDialog();
    if (restoreFocus && trigger && typeof trigger.focus === "function") window.requestAnimationFrame(function () { trigger.focus(); });
  }
  function openSessionFilePicker(trigger) {
    var input = q("[data-testid='native-local-file-input'],[data-testid='session-package-file-input']");
    if (!input || model.sessionImport.busy) return;
    model.sessionImport.trigger = trigger;
    model.sessionImport.open = false;
    model.sessionImport.file = null;
    model.sessionImport.archiveBase64 = "";
    model.sessionImport.error = "";
    input.value = "";
    input.click();
  }
  window.SignalAnalyserOpenSessionFilePicker = openSessionFilePicker;
  function bytesToBase64(buffer) {
    var bytes = new Uint8Array(buffer), step = 0x8000, parts = [];
    for (var i=0; i<bytes.length; i+=step) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i+step, bytes.length))));
    return window.btoa(parts.join(""));
  }
  function readSessionDocument(file) {
    var current = model.sessionImport;
    if (!file || current.busy) return;
    current.open=true; current.busy=true; current.phase="file"; current.file=file; current.archiveBase64=""; current.error="";
    renderSessionImportDialog();
    Promise.resolve(file.arrayBuffer ? file.arrayBuffer() : new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=reject;reader.readAsArrayBuffer(file);})).then(bytesToBase64).then(function(encoded){ current.archiveBase64=encoded; }).catch(function(error){ current.phase="error"; current.error=packageError(error,"Не удалось прочитать пакет."); }).finally(function(){current.busy=false;renderSessionImportDialog();});
  }
  function clearSessionTransientState() {
    Object.keys(model.pollByPane).forEach(function (key) { window.clearTimeout(model.pollByPane[key]); });
    Object.keys(model.peaksPollByPane).forEach(function (key) { window.clearTimeout(model.peaksPollByPane[key]); });
    model.outputs = {}; model.outputTokens = {}; model.pollByPane = {}; model.plotQueue = {};
    model.peaksRecord = null; model.peaksRecords = {}; model.peaksTokens = {}; model.peaksPollByPane = {}; model.peaksEnableByPane = {};
    model.peaksDraft = null; model.peaksApplying = false; model.peaksApplyQueued = false; model.peaksMessage = ""; model.extremaTargetKey = null;
    model.measurementsRecord = null; model.measurementsToken += 1;
    model.layoutDraft = null;
  }
  function refreshImportedSession() {
    clearSessionTransientState();
    return refreshSnapshot(render).then(function () {
      return settings.load().then(function () { render(); }).catch(showSettingsLoadError);
    }).then(function () { output(true); if (peaksSurfaceActive()) return loadPeaks(); });
  }
  function importSessionDocument() {
    var current = model.sessionImport;
    if (current.busy || !current.archiveBase64 || !current.replace) return;
    current.busy = true; current.phase="commit"; current.error = "";
    renderSessionImportDialog();
    var payload={ state_revision:model.revision, archive_base64:current.archiveBase64 };
    if(current.publish) { payload.publish_workspace=true; payload.workspace_prefix=current.prefix; }
    api.importPackage(payload).then(function (response) {
      if (!response || response.ok !== true) throw new Error("Сервер не подтвердил импорт сессии.");
      current.result=response; return refreshImportedSession();
    }).then(function () { current.phase="success";
    }).catch(function (error) {
      current.error = packageError(error,"Не удалось восстановить пакет.");
      current.phase="error";
      if (error && error.status === 409) return refreshSnapshot(render).then(function(){ return settings.load().catch(showSettingsLoadError); });
    }).finally(function () {
      current.busy = false;
      if (current.open) renderSessionImportDialog();
    });
  }
  function renderSessionSaveDialog() { var s=model.sessionSave, dialog=q("[data-testid='session-package-save-dialog']"), rows=packageRows().map(function(row){return "<div class='content-row'><span class='included-mark'>✓</span><div><strong>"+row[0]+"</strong><small>"+row[1]+"</small></div></div>";}).join(""), body,footer; if(!s.open){if(dialog)dialog.remove();if(!model.sessionImport.open)setSessionImportModalBackground(false);return;} if(!dialog){dialog=document.createElement("div");dialog.className="modal-layer primary-modal-layer package-modal";dialog.dataset.testid="session-package-save-dialog";document.body.appendChild(dialog);}setSessionImportModalBackground(true);if(s.phase==="progress"){body=packageProgress("Подготавливаем сессию","Экспортируем сигналы и графики");footer="<button class='button' disabled>Проверяем архив и контрольные суммы</button>";}else if(s.phase==="error"){body="<div class='alert alert-error' role='alert'><strong>Не удалось создать пакет</strong><p>"+esc(s.error||"Не удалось сохранить снимки графиков. Данные сессии не были скачаны.")+"</p></div>";footer="<button class='button' data-package-save-close>Закрыть</button><button class='button button-primary' data-package-save-create>Повторить</button>";}else if(s.phase==="ready"){body="<div class='result-heading' data-testid='save-ready'><img class='result-icon' src='./icons/tick-figma.svg' alt=''><div><h3>Пакет успешно создан</h3><p>Файл готов к скачиванию.</p></div></div>";footer="<button class='button' data-package-save-close>Закрыть</button><button class='button button-primary' data-testid='session-package-save-download' data-package-save-download>Скачать .sazip</button>";}else{body="<p class='dialog-intro'>Проверьте состав переносимого пакета Engee. Все перечисленные материалы включаются всегда.</p><h3 class='section-title'>Состав пакета</h3><div class='content-list' data-testid='save-content-list'>"+rows+"</div>";footer="<button class='button' data-package-save-close>Отмена</button><button class='button button-primary' data-testid='session-package-save-create' data-package-save-create>Сохранить пакет</button>";}dialog.innerHTML=modalLayer("session-package-save","Сохранить переносимый пакет",body,footer,s.busy);bindSaveDialog(dialog); }
  function openSessionSave(trigger) { var s=model.sessionSave; if(s.busy)return; s.open=true;s.phase="summary";s.error="";s.package=null;s.trigger=trigger;renderSessionSaveDialog();window.requestAnimationFrame(function(){var n=q("[data-testid='session-package-save-create']");if(n)n.focus();}); }
  function downloadSessionDocument(trigger) { var s=model.sessionSave; if(s.busy)return; s.open=true;s.phase="progress";s.busy=true;s.error="";s.trigger=trigger||s.trigger;renderSessionSaveDialog();api.exportPackage().then(function(result){s.package=result;s.phase="ready";}).catch(function(error){s.error=packageError(error,"Не удалось сохранить снимки графиков. Данные сессии не были скачаны.");s.phase="error";}).finally(function(){s.busy=false;renderSessionSaveDialog();}); }
  function closePackageDetails() { var layer=q("[data-testid='session-package-details-dialog']"); if(layer)layer.remove(); var target=q("[data-testid='import-error-details']"); if(target)target.focus(); }
  function openPackageDetails() { var c=model.sessionImport, layer=document.createElement("div"); layer.className="modal-layer nested-modal-layer package-modal";layer.dataset.testid="session-package-details-dialog";layer.innerHTML=modalLayer("session-package-details","Подробности проверки","<div class='alert alert-error'><strong>Файл отклонён</strong><p>"+esc(c.error)+"</p></div><p class='muted-copy'>Текущая сессия не изменена. Содержимое пакета и скрипты не запускались.</p>","<button class='button button-primary' data-package-details-close>Понятно</button>",false);document.body.appendChild(layer);layer.querySelectorAll("[data-package-details-close],[data-package-close]").forEach(function(n){n.addEventListener("click",closePackageDetails);});layer.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closePackageDetails();}});window.requestAnimationFrame(function(){var n=layer.querySelector("h2");if(n)n.focus();}); }
  function scheduleWorkspacePreflight() { var c=model.sessionImport, token=++c.preflightToken; if(c.preflightTimer)window.clearTimeout(c.preflightTimer); if(!c.publish)return; c.preflightLoading=true;c.preflightError="";c.preflight=null;renderSessionImportDialog();c.preflightTimer=window.setTimeout(function(){api.packageWorkspacePreflight({archive_base64:c.archiveBase64,workspace_prefix:c.prefix}).then(function(result){if(token===c.preflightToken)c.preflight=result;}).catch(function(error){if(token===c.preflightToken)c.preflightError=packageError(error,"Не удалось проверить имена рабочей области.");}).finally(function(){if(token===c.preflightToken){c.preflightLoading=false;renderSessionImportDialog();}});},150); }
  function bindPackageDialog(dialog) { var c=model.sessionImport; dialog.querySelectorAll("[data-package-close]").forEach(function(n){n.addEventListener("click",function(){closeSessionImport(true);});}); var validate=dialog.querySelector("[data-testid='import-validate']");if(validate)validate.addEventListener("click",function(){if(c.busy)return;c.busy=true;c.phase="validate";c.controller=window.AbortController?new AbortController():null;renderSessionImportDialog();api.validatePackage({archive_base64:c.archiveBase64},c.controller&&c.controller.signal).then(function(r){c.validation=r;c.phase="summary";}).catch(function(e){if(e&&e.name==="AbortError"){c.busy=false;closeSessionImport(true);}else{c.error=packageError(e,"Этот файл нельзя импортировать.");c.phase="error";}}).finally(function(){c.busy=false;c.controller=null;renderSessionImportDialog();});}); var cancel=dialog.querySelector("[data-package-cancel]");if(cancel)cancel.addEventListener("click",function(){if(c.controller)c.controller.abort();else if(!c.busy)closeSessionImport(true);}); var reselect=dialog.querySelector("[data-package-reselect]");if(reselect)reselect.addEventListener("click",function(){closeSessionImport(false);openSessionFilePicker(c.trigger);}); var details=dialog.querySelector("[data-testid='import-error-details']");if(details)details.addEventListener("click",openPackageDetails); var publish=dialog.querySelector("[data-testid='workspace-publish']");if(publish)publish.addEventListener("change",function(){c.publish=publish.checked;if(c.publish)scheduleWorkspacePreflight();else{c.preflight=null;c.preflightError="";renderSessionImportDialog();}window.requestAnimationFrame(function(){var n=q("[data-testid='workspace-publish']");if(n)n.focus();});});var prefix=dialog.querySelector("[data-testid='workspace-prefix']");if(prefix)prefix.addEventListener("input",function(){c.prefix=prefix.value;scheduleWorkspacePreflight();});var replace=dialog.querySelector("[data-testid='replace-confirm']");if(replace)replace.addEventListener("change",function(){c.replace=replace.checked;renderSessionImportDialog();});var commit=dialog.querySelector("[data-testid='import-commit']");if(commit)commit.addEventListener("click",importSessionDocument);dialog.addEventListener("keydown",function(e){if(e.key==="Escape"&&!c.busy){e.preventDefault();closeSessionImport(true);return;}if(e.key!=="Tab")return;var f=sessionImportFocusables(dialog),i=f.indexOf(document.activeElement);if(f.length&&((e.shiftKey&&i<=0)||(!e.shiftKey&&i===f.length-1))){e.preventDefault();f[e.shiftKey?f.length-1:0].focus();}}); }
  function bindSaveDialog(dialog) { var s=model.sessionSave; function close(){if(s.busy)return;s.open=false;renderSessionSaveDialog();if(s.trigger)window.requestAnimationFrame(function(){s.trigger.focus();});} dialog.querySelectorAll("[data-package-save-close],[data-package-close]").forEach(function(n){n.addEventListener("click",close);}); var create=dialog.querySelector("[data-package-save-create]");if(create)create.addEventListener("click",function(){downloadSessionDocument(s.trigger);});var download=dialog.querySelector("[data-package-save-download]");if(download)download.addEventListener("click",function(){var p=s.package;if(!p)return;var url=window.URL.createObjectURL(p.blob),a=document.createElement("a"),match=/filename=\"?([^\";]+)\"?/i.exec(p.filename);a.href=url;a.download=(match&&match[1])||"signal-analyser-session.sazip";document.body.appendChild(a);a.click();a.remove();window.setTimeout(function(){window.URL.revokeObjectURL(url);},0);showToast("Скачивание началось",false);});dialog.addEventListener("keydown",function(e){if(e.key==="Escape"&&!s.busy){e.preventDefault();close();return;}if(e.key!=="Tab")return;var f=sessionImportFocusables(dialog),i=f.indexOf(document.activeElement);if(f.length&&((e.shiftKey&&i<=0)||(!e.shiftKey&&i===f.length-1))){e.preventDefault();f[e.shiftKey?f.length-1:0].focus();}}); }

  function plotEnvelope(data) { return Array.isArray(data) && data.length === 1 && data[0] && Array.isArray(data[0].data) ? data[0] : data; }
  function hasPlotData(data) { var payload = plotEnvelope(data); return Array.isArray(payload) ? payload.length > 0 : !!(payload && (Array.isArray(payload.data) ? payload.data.length : Array.isArray(payload.z) && payload.z.length)); }
  function loadPlotly() {
    if (window.Plotly) return Promise.resolve(window.Plotly);
    if (model.plotlyPromise) return model.plotlyPromise;
    model.plotlyPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "./js/vendor/plotly-cartesian-3.1.0.min.js";
      script.async = true;
      script.onload = function () { resolve(window.Plotly); };
      script.onerror = function () {
        model.plotlyPromise = null;
        reject(new Error("Не удалось загрузить библиотеку графиков."));
      };
      document.head.appendChild(script);
    });
    return model.plotlyPromise;
  }

  function schedulePlotlyIdlePreload() {
    function preload() { loadPlotly().catch(function () { /* A real graph render retries the local asset on demand. */ }); }
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(preload, { timeout:1500 });
    else window.setTimeout(preload, 1000);
  }

  function rangeSliderEnabled(displayId, paneId) {
    return !!model.rangeSliderByPane[paneRuntimeKey(displayId, paneId)];
  }

  function amplitudeSliderEnabled(displayId, paneId) {
    return !!model.amplitudeSliderByPane[paneRuntimeKey(displayId, paneId)];
  }

  function traceXDataRange(traces) {
    var minimum = Infinity, maximum = -Infinity;
    (traces || []).forEach(function (trace) {
      var values = trace && trace.x;
      if (!values || typeof values.length !== "number") return;
      [values[0], values[values.length - 1]].forEach(function (candidate) {
        var value = Number(candidate);
        if (!Number.isFinite(value)) return;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      });
    });
    return Number.isFinite(minimum) && Number.isFinite(maximum) && maximum > minimum ? [minimum, maximum] : null;
  }

  function traceYDataRange(traces) {
    var minimum = Infinity, maximum = -Infinity;
    (traces || []).forEach(function (trace) {
      var values = trace && trace.y;
      if (!values || typeof values.length !== "number") return;
      for (var index = 0; index < values.length; index += 1) {
        var value = Number(values[index]);
        if (!Number.isFinite(value)) continue;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }
    });
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
    if (minimum === maximum) {
      var padding = Math.max(1, Math.abs(minimum) * 0.05);
      return [minimum - padding, maximum + padding];
    }
    return [minimum, maximum];
  }

  function selectedAxisRange(eventData, axis) {
    if (!eventData || typeof eventData !== "object") return null;
    var range = eventData[axis + ".range"];
    var start = Number(Array.isArray(range) ? range[0] : eventData[axis + ".range[0]"]);
    var finish = Number(Array.isArray(range) ? range[1] : eventData[axis + ".range[1]"]);
    return Number.isFinite(start) && Number.isFinite(finish) && start < finish ? [start, finish] : null;
  }

  function selectedXRange(eventData) {
    return selectedAxisRange(eventData, "xaxis");
  }

  function rangeSliderFullRange(dataRange, selectedRange) {
    if (!dataRange) return selectedRange ? selectedRange.slice() : null;
    if (!selectedRange) return dataRange.slice();
    return [Math.min(dataRange[0], selectedRange[0]), Math.max(dataRange[1], selectedRange[1])];
  }

  function adjustRangeSliderFullRange(runtimeKey, eventData) {
    if (!model.rangeSliderByPane[runtimeKey]) return null;
    var dataRange = model.rangeSliderDataRangeByPane[runtimeKey], selectedRange = selectedXRange(eventData);
    if (!dataRange || !selectedRange) return null;
    var fullRange = rangeSliderFullRange(dataRange, selectedRange), prior = model.rangeSliderFullRangeByPane[runtimeKey];
    if (prior && prior[0] === fullRange[0] && prior[1] === fullRange[1]) return null;
    model.rangeSliderFullRangeByPane[runtimeKey] = fullRange;
    return { "xaxis.rangeslider.range":fullRange.slice(), "xaxis.rangeslider.autorange":false };
  }

  function bindRangeSliderDoubleClick(host, runtimeKey) {
    if (!host || typeof host.addEventListener !== "function" || host.dataset.rangeSliderDoubleClickBound === runtimeKey) return;
    host.addEventListener("dblclick", function (event) {
      var target = event.target;
      var rangeSlider = target && typeof target.closest === "function" ? target.closest(".rangeslider-container") : null;
      var dataRange = model.rangeSliderDataRangeByPane[runtimeKey], Plotly = window.Plotly;
      if (!rangeSlider || !host.contains(rangeSlider) || !model.rangeSliderByPane[runtimeKey] || !dataRange || !Plotly || typeof Plotly.relayout !== "function") return;
      model.rangeSliderFullRangeByPane[runtimeKey] = dataRange.slice();
      event.preventDefault();
      event.stopPropagation();
      try {
        Promise.resolve(Plotly.relayout(host, {
          "xaxis.range[0]":dataRange[0],
          "xaxis.range[1]":dataRange[1],
          "xaxis.autorange":false,
          "xaxis.rangeslider.range":dataRange.slice(),
          "xaxis.rangeslider.autorange":false
        })).catch(function () { /* Keep the existing graph state when Plotly rejects reset. */ });
      } catch (_) { /* Keep the existing graph state when Plotly rejects reset. */ }
    }, true);
    host.dataset.rangeSliderDoubleClickBound = runtimeKey;
  }

  function plotLayoutWithRangeSlider(layout, runtimeKey, host) {
    var source = layout || {};
    var enabled = !!model.rangeSliderByPane[runtimeKey], amplitudeEnabled = !!model.amplitudeSliderByPane[runtimeKey];
    var result = Object.assign({ paper_bgcolor:"#ffffff", plot_bgcolor:"#ffffff", showlegend:true }, source);
    result.legend = Object.assign({}, source.legend || {}, { x:0.99, xanchor:"right", y:0.99, yanchor:"top", bgcolor:"rgba(255,255,255,0.82)", bordercolor:"#e1e1e1", borderwidth:1 });
    result.margin = Object.assign({ l:44, r:12, t:12, b:enabled ? 34 : 30 }, source.margin || {}, { r:amplitudeEnabled ? 48 : 12, b:enabled ? 34 : 30 });
    if (enabled) {
      result.xaxis = Object.assign({}, source.xaxis || {});
      result.xaxis.rangeslider = Object.assign({}, (source.xaxis && source.xaxis.rangeslider) || {}, { visible:true, thickness:0.15, bgcolor:"#ffffff", bordercolor:"#e1e1e1", borderwidth:1 });
      var dataRange = model.rangeSliderDataRangeByPane[runtimeKey];
      var currentRange = host && host._fullLayout && host._fullLayout.xaxis && Array.isArray(host._fullLayout.xaxis.range) ? host._fullLayout.xaxis.range : null;
      var fullRange = rangeSliderFullRange(dataRange, currentRange);
      if (fullRange) model.rangeSliderFullRangeByPane[runtimeKey] = fullRange;
      if (fullRange) {
        result.xaxis.rangeslider.range = fullRange.slice();
        result.xaxis.rangeslider.autorange = false;
      }
      if (currentRange) {
        result.xaxis.range = currentRange.slice();
        result.xaxis.autorange = false;
      }
    }
    if (amplitudeEnabled) {
      var currentAmplitudeRange = model.amplitudeSelectedRangeByPane[runtimeKey] || (host && host._fullLayout && host._fullLayout.yaxis && Array.isArray(host._fullLayout.yaxis.range) ? host._fullLayout.yaxis.range : null);
      if (currentAmplitudeRange) {
        result.yaxis = Object.assign({}, source.yaxis || {}, { range:currentAmplitudeRange.slice(), autorange:false });
      }
    }
    return result;
  }

  function amplitudeRangeFromHost(host, runtimeKey) {
    var retained = model.amplitudeSelectedRangeByPane[runtimeKey];
    if (retained) return retained.slice();
    var axis = host && host._fullLayout && host._fullLayout.yaxis;
    return axis && Array.isArray(axis.range) ? axis.range.slice() : null;
  }

  function syncAmplitudeSlider(host, runtimeKey) {
    if (!host) return;
    var slider = typeof host.querySelector === "function" ? host.querySelector("[data-amplitude-slider]") : null;
    if (!model.amplitudeSliderByPane[runtimeKey] || host.dataset.plotReady !== "true") {
      if (slider && typeof slider.remove === "function") slider.remove();
      return;
    }
    var dataRange = model.amplitudeDataRangeByPane[runtimeKey], selectedRange = amplitudeRangeFromHost(host, runtimeKey);
    if (!dataRange || !selectedRange) return;
    var fullRange = rangeSliderFullRange(dataRange, selectedRange);
    model.amplitudeSelectedRangeByPane[runtimeKey] = selectedRange.slice();
    model.amplitudeFullRangeByPane[runtimeKey] = fullRange.slice();
    if (!slider) {
      if (typeof document.createElement !== "function" || typeof host.appendChild !== "function") return;
      slider = document.createElement("div");
      slider.className = "amplitude-slider";
      slider.dataset.amplitudeSlider = runtimeKey;
      slider.dataset.testid = "amplitude-slider-" + runtimeKey.split("::").pop();
      slider.setAttribute("role", "group");
      slider.setAttribute("aria-label", "Слайдер амплитуды");
      slider.innerHTML = "<div class='amplitude-slider-rail' data-amplitude-rail><div class='amplitude-slider-window' data-amplitude-window></div><button class='amplitude-slider-handle is-maximum' type='button' role='slider' aria-orientation='vertical' aria-label='Максимум амплитуды' data-amplitude-handle='maximum'></button><button class='amplitude-slider-handle is-minimum' type='button' role='slider' aria-orientation='vertical' aria-label='Минимум амплитуды' data-amplitude-handle='minimum'></button></div>";
      host.appendChild(slider);
      bindAmplitudeSlider(slider, host, runtimeKey);
    }
    slider.classList.toggle("has-range-slider", !!model.rangeSliderByPane[runtimeKey]);
    var span = fullRange[1] - fullRange[0];
    if (!(span > 0)) return;
    var maximumTop = (fullRange[1] - selectedRange[1]) / span * 100;
    var minimumTop = (fullRange[1] - selectedRange[0]) / span * 100;
    maximumTop = Math.max(0, Math.min(100, maximumTop));
    minimumTop = Math.max(0, Math.min(100, minimumTop));
    var windowNode = slider.querySelector("[data-amplitude-window]");
    var maximumHandle = slider.querySelector("[data-amplitude-handle='maximum']");
    var minimumHandle = slider.querySelector("[data-amplitude-handle='minimum']");
    if (windowNode) { windowNode.style.top = maximumTop + "%"; windowNode.style.bottom = (100 - minimumTop) + "%"; }
    if (maximumHandle) {
      maximumHandle.style.top = maximumTop + "%";
      maximumHandle.setAttribute("aria-valuemin", String(fullRange[0]));
      maximumHandle.setAttribute("aria-valuemax", String(fullRange[1]));
      maximumHandle.setAttribute("aria-valuenow", String(selectedRange[1]));
    }
    if (minimumHandle) {
      minimumHandle.style.top = minimumTop + "%";
      minimumHandle.setAttribute("aria-valuemin", String(fullRange[0]));
      minimumHandle.setAttribute("aria-valuemax", String(fullRange[1]));
      minimumHandle.setAttribute("aria-valuenow", String(selectedRange[0]));
    }
  }

  function queueAmplitudeRange(host, runtimeKey, range) {
    if (!host || !range || !(range[0] < range[1])) return;
    model.amplitudeSelectedRangeByPane[runtimeKey] = range.slice();
    model.amplitudeFullRangeByPane[runtimeKey] = rangeSliderFullRange(model.amplitudeDataRangeByPane[runtimeKey], range);
    syncAmplitudeSlider(host, runtimeKey);
    model.amplitudePendingByPane[runtimeKey] = range.slice();
    if (model.amplitudeFrameByPane[runtimeKey]) return;
    model.amplitudeFrameByPane[runtimeKey] = window.requestAnimationFrame(function () {
      delete model.amplitudeFrameByPane[runtimeKey];
      var pending = model.amplitudePendingByPane[runtimeKey];
      delete model.amplitudePendingByPane[runtimeKey];
      var Plotly = window.Plotly;
      if (!pending || !host.isConnected || !model.amplitudeSliderByPane[runtimeKey] || !Plotly || typeof Plotly.relayout !== "function") return;
      try { Promise.resolve(Plotly.relayout(host, { "yaxis.range[0]":pending[0], "yaxis.range[1]":pending[1], "yaxis.autorange":false })).catch(function () { /* Keep amplitude interaction pane-local. */ }); }
      catch (_) { /* Keep amplitude interaction pane-local. */ }
    });
  }

  function bindAmplitudeSlider(slider, host, runtimeKey) {
    slider.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      var target = event.target && event.target.closest && event.target.closest("[data-amplitude-handle], [data-amplitude-window]");
      if (!target) return;
      var rail = slider.querySelector("[data-amplitude-rail]"), fullRange = model.amplitudeFullRangeByPane[runtimeKey], selectedRange = amplitudeRangeFromHost(host, runtimeKey);
      if (!rail || !fullRange || !selectedRange) return;
      model.amplitudeDrag = { runtimeKey:runtimeKey, pointerId:event.pointerId, mode:target.dataset.amplitudeHandle || "window", startY:event.clientY, startRange:selectedRange.slice(), fullRange:fullRange.slice(), rail:rail };
      if (typeof slider.setPointerCapture === "function") slider.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    });
    slider.addEventListener("pointermove", function (event) {
      var drag = model.amplitudeDrag;
      if (!drag || drag.runtimeKey !== runtimeKey || drag.pointerId !== event.pointerId) return;
      var rect = drag.rail.getBoundingClientRect(), fullSpan = drag.fullRange[1] - drag.fullRange[0];
      if (!(rect.height > 0) || !(fullSpan > 0)) return;
      var next = drag.startRange.slice(), minimumGap = Math.max(fullSpan * 1.0e-9, Number.EPSILON);
      if (drag.mode === "window") {
        var delta = -(event.clientY - drag.startY) / rect.height * fullSpan;
        next[0] += delta; next[1] += delta;
      } else {
        var value = drag.fullRange[1] - (event.clientY - rect.top) / rect.height * fullSpan;
        if (drag.mode === "minimum") next[0] = Math.min(value, next[1] - minimumGap);
        else next[1] = Math.max(value, next[0] + minimumGap);
      }
      queueAmplitudeRange(host, runtimeKey, next);
      event.preventDefault();
    });
    function finish(event) {
      var drag = model.amplitudeDrag;
      if (!drag || drag.runtimeKey !== runtimeKey || (event.pointerId !== undefined && drag.pointerId !== event.pointerId)) return;
      model.amplitudeDrag = null;
      if (typeof slider.releasePointerCapture === "function" && event.pointerId !== undefined && slider.hasPointerCapture && slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
    }
    slider.addEventListener("pointerup", finish);
    slider.addEventListener("pointercancel", finish);
    slider.addEventListener("dblclick", function (event) {
      var dataRange = model.amplitudeDataRangeByPane[runtimeKey];
      if (!dataRange) return;
      model.amplitudeDrag = null;
      queueAmplitudeRange(host, runtimeKey, dataRange.slice());
      event.preventDefault();
      event.stopPropagation();
    });
    slider.addEventListener("keydown", function (event) {
      var handle = event.target && event.target.closest && event.target.closest("[data-amplitude-handle]");
      if (!handle || ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End"].indexOf(event.key) < 0) return;
      var fullRange = model.amplitudeFullRangeByPane[runtimeKey], selectedRange = amplitudeRangeFromHost(host, runtimeKey);
      if (!fullRange || !selectedRange) return;
      var index = handle.dataset.amplitudeHandle === "minimum" ? 0 : 1;
      var step = (fullRange[1] - fullRange[0]) / 100;
      var value = selectedRange[index];
      if (event.key === "Home") value = fullRange[0];
      else if (event.key === "End") value = fullRange[1];
      else value += (event.key === "ArrowUp" || event.key === "ArrowRight" ? step : -step);
      if (index === 0) selectedRange[0] = Math.min(value, selectedRange[1] - Math.max(step * 0.001, Number.EPSILON));
      else selectedRange[1] = Math.max(value, selectedRange[0] + Math.max(step * 0.001, Number.EPSILON));
      queueAmplitudeRange(host, runtimeKey, selectedRange);
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function syncAmplitudeSliderFromRelayout(host, runtimeKey, eventData) {
    if (!model.amplitudeSliderByPane[runtimeKey]) return;
    var selectedRange = selectedAxisRange(eventData, "yaxis");
    if (selectedRange) {
      model.amplitudeSelectedRangeByPane[runtimeKey] = selectedRange.slice();
      model.amplitudeFullRangeByPane[runtimeKey] = rangeSliderFullRange(model.amplitudeDataRangeByPane[runtimeKey], selectedRange);
      syncAmplitudeSlider(host, runtimeKey);
      return;
    }
    if (eventData && eventData["yaxis.autorange"] === true) window.requestAnimationFrame(function () {
      delete model.amplitudeSelectedRangeByPane[runtimeKey];
      syncAmplitudeSlider(host, runtimeKey);
    });
  }

  function linkedAxisRangeUpdate(eventData, axis) {
    if (!eventData || typeof eventData !== "object") return null;
    var rangeKey = axis + ".range", startKey = rangeKey + "[0]", finishKey = rangeKey + "[1]", autorangeKey = axis + ".autorange";
    var range = eventData[rangeKey];
    var start = Array.isArray(range) ? range[0] : eventData[startKey];
    var finish = Array.isArray(range) ? range[1] : eventData[finishKey];
    if (start !== undefined && finish !== undefined) {
      var rangeUpdate = {};
      rangeUpdate[startKey] = start;
      rangeUpdate[finishKey] = finish;
      rangeUpdate[autorangeKey] = false;
      return rangeUpdate;
    }
    if (eventData[autorangeKey] === true) {
      var autorangeUpdate = {};
      autorangeUpdate[autorangeKey] = true;
      return autorangeUpdate;
    }
    return null;
  }

  function linkedTimeRangeUpdate(eventData, linkTime, linkAmplitude) {
    var update = {};
    if (linkTime) Object.assign(update, linkedAxisRangeUpdate(eventData, "xaxis") || {});
    if (linkAmplitude) Object.assign(update, linkedAxisRangeUpdate(eventData, "yaxis") || {});
    return Object.keys(update).length ? update : null;
  }

  function queueLinkedTimeRelayout(displayId, sourcePaneId, eventData) {
    var sourcePane = paneById(sourcePaneId);
    var linkTime = !!settings.value("time.link_time"), linkAmplitude = !!settings.value("time.link_amplitude");
    var update = linkedTimeRangeUpdate(eventData, linkTime, linkAmplitude);
    if (!update || !sourcePane || sourcePane.plot_type !== "time") return;
    var token = ++model.axisLinkToken;
    model.axisLinkPending = { displayId:displayId, sourcePaneId:sourcePaneId, update:update, token:token };
    if (model.axisLinkFrame !== null) return;
    model.axisLinkFrame = window.requestAnimationFrame(function () {
      model.axisLinkFrame = null;
      var pending = model.axisLinkPending;
      model.axisLinkPending = null;
      var display = activeDisplay();
      if (!pending || pending.token !== model.axisLinkToken || !display || display.id !== pending.displayId) return;
      var currentTime = !!settings.value("time.link_time"), currentAmplitude = !!settings.value("time.link_amplitude");
      var currentUpdate = Object.keys(pending.update).reduce(function (result, key) {
        if ((currentTime && key.indexOf("xaxis.") === 0) || (currentAmplitude && key.indexOf("yaxis.") === 0)) result[key] = pending.update[key];
        return result;
      }, {});
      if (!Object.keys(currentUpdate).length) return;
      var Plotly = window.Plotly;
      if (!Plotly || typeof Plotly.relayout !== "function") return;
      panes().filter(function (pane) { return pane.id !== pending.sourcePaneId && pane.plot_type === "time"; }).forEach(function (pane) {
        var runtimeKey = paneRuntimeKey(pending.displayId, pane.id);
        var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
        if (!host || host.dataset.plotReady !== "true") return;
        model.axisLinkSuppressByPane[runtimeKey] = true;
        try {
          Promise.resolve(Plotly.relayout(host, currentUpdate)).catch(function () { /* Keep one failed pane isolated. */ }).finally(function () { delete model.axisLinkSuppressByPane[runtimeKey]; });
        } catch (_) { delete model.axisLinkSuppressByPane[runtimeKey]; }
      });
    });
  }

  function bindLinkedTimeHost(host, displayId, paneId) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    if (!host || typeof host.on !== "function" || host.dataset.axisLinkBound === runtimeKey) return;
    var handler = function (eventData) {
      if (!model.axisLinkSuppressByPane[runtimeKey]) queueLinkedTimeRelayout(displayId, paneId, eventData);
      syncAmplitudeSliderFromRelayout(host, runtimeKey, eventData);
      var correction = adjustRangeSliderFullRange(runtimeKey, eventData);
      if (!correction || model.rangeSliderAdjustByPane[runtimeKey]) return;
      var Plotly = window.Plotly;
      if (!Plotly || typeof Plotly.relayout !== "function") return;
      model.rangeSliderAdjustByPane[runtimeKey] = true;
      try {
        Promise.resolve(Plotly.relayout(host, correction)).catch(function () { /* Keep one full-range adjustment pane-local. */ }).finally(function () { delete model.rangeSliderAdjustByPane[runtimeKey]; });
      } catch (_) { delete model.rangeSliderAdjustByPane[runtimeKey]; }
    };
    host.on("plotly_relayouting", handler);
    host.on("plotly_relayout", handler);
    host.dataset.axisLinkBound = runtimeKey;
  }

  function rangeSliderEligible(displayId, paneId) {
    var display = activeDisplay(), pane = paneById(paneId), runtimeKey = paneRuntimeKey(displayId, paneId);
    var record = model.outputs[runtimeKey], host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    return !!(display && display.id === displayId && pane && pane.plot_type === "time" && paneHasSignals(pane) && record && record.output && record.output.isready && record.output.success && host && host.dataset.plotReady === "true" && currentReadyPlotHost(host, displayId));
  }

  function syncPaneMenuState() {
    var menu = q("[data-testid='display-overflow-menu']");
    if (!menu || menu.hidden) return;
    var display = activeDisplay(), paneId = menu.dataset.paneId, displayId = menu.dataset.displayId;
    var rangeAction = menu.querySelector("[data-plot-range-slider]"), amplitudeAction = menu.querySelector("[data-plot-amplitude-slider]");
    var eligible = !!display && display.id === displayId && rangeSliderEligible(displayId, paneId);
    if (rangeAction) {
      rangeAction.disabled = !eligible;
      rangeAction.setAttribute("aria-checked", String(rangeSliderEnabled(displayId, paneId)));
      rangeAction.setAttribute("aria-label", eligible ? "Слайдер диапазона" : "Слайдер диапазона, доступен только для загруженной временной области");
      rangeAction.title = eligible ? "" : "Доступно только для загруженной временной области";
    }
    if (amplitudeAction) {
      amplitudeAction.disabled = !eligible;
      amplitudeAction.setAttribute("aria-checked", String(amplitudeSliderEnabled(displayId, paneId)));
      amplitudeAction.setAttribute("aria-label", eligible ? "Слайдер амплитуды" : "Слайдер амплитуды, доступен только для загруженной временной области");
      amplitudeAction.title = eligible ? "" : "Доступно только для загруженной временной области";
    }
  }

  function positionPaneMenu() {
    var menu = q("[data-testid='display-overflow-menu']"), trigger = model.paneMenuTrigger;
    if (!menu || menu.hidden || !trigger || !trigger.isConnected) return;
    var rect = trigger.getBoundingClientRect(), width = 224, height = menu.offsetHeight;
    menu.style.width = width + "px";
    menu.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width)) + "px";
    var below = rect.bottom + 4;
    menu.style.top = (below + height <= window.innerHeight - 8 ? below : Math.max(8, rect.top - height - 4)) + "px";
  }

  function closeGraphHelp(restoreFocus) {
    var help = q("[data-testid='graph-help-overlay']");
    if (!help || help.hidden) return;
    var target = model.graphHelpRestoreTarget;
    help.hidden = true;
    if (target && target.isConnected) target.setAttribute("aria-expanded", "false");
    model.graphHelpRestoreTarget = null;
    if (restoreFocus && target && target.isConnected) target.focus();
  }

  function closePaneMenu(restoreFocus) {
    var menu = q("[data-testid='display-overflow-menu']");
    if (!menu || menu.hidden) return;
    closeGraphHelp(false);
    var trigger = model.paneMenuTrigger;
    menu.hidden = true;
    delete menu.dataset.paneId;
    delete menu.dataset.displayId;
    if (trigger && trigger.isConnected) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
    model.paneMenuTrigger = null;
  }

  function openPaneMenu(trigger) {
    var menu = q("[data-testid='display-overflow-menu']"), display = activeDisplay();
    if (!menu || !display) return;
    if (!menu.hidden && model.paneMenuTrigger === trigger) return closePaneMenu(true);
    closePaneMenu(false);
    closeColumnMenu(false);
    closeMeasurementMenu(false);
    model.paneMenuTrigger = trigger;
    menu.dataset.paneId = trigger.dataset.paneMenu;
    menu.dataset.displayId = display.id;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    syncPaneMenuState();
    positionPaneMenu();
    var first = menu.querySelector("button:not(:disabled)");
    if (first) first.focus();
  }

  function openGraphHelp(trigger) {
    var menu = q("[data-testid='display-overflow-menu']"), help = q("[data-testid='graph-help-overlay']");
    var pane = menu && q("[data-pane-id='" + CSS.escape(menu.dataset.paneId || "") + "']");
    var canvas = pane && pane.querySelector(".plot-canvas");
    if (!menu || menu.hidden || !help || !canvas) return;
    model.graphHelpRestoreTarget = trigger;
    trigger.setAttribute("aria-expanded", "true");
    help.hidden = false;
    var canvasRect = canvas.getBoundingClientRect(), width = help.offsetWidth, height = help.offsetHeight;
    var legend = canvas.querySelector(".legend"), legendBottom = legend ? legend.getBoundingClientRect().bottom : canvasRect.top;
    help.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, canvasRect.left + 8)) + "px";
    help.style.top = Math.min(window.innerHeight - height - 8, Math.max(8, legendBottom + 8)) + "px";
    var close = help.querySelector("[data-graph-help-close]");
    if (close) close.focus();
  }

  function rangeSliderRelayout(host, enabled) {
    var fullLayout = host && host._fullLayout || {}, runtimeKey = host && host.dataset && host.dataset.paneHost;
    var selectedRange = fullLayout.xaxis && Array.isArray(fullLayout.xaxis.range) ? fullLayout.xaxis.range : null;
    var fullRange = runtimeKey && rangeSliderFullRange(model.rangeSliderDataRangeByPane[runtimeKey], selectedRange);
    if (runtimeKey && fullRange) model.rangeSliderFullRangeByPane[runtimeKey] = fullRange;
    var update = {
      "xaxis.rangeslider.visible":enabled,
      "xaxis.rangeslider.thickness":0.15,
      "xaxis.rangeslider.bgcolor":"#ffffff",
      "xaxis.rangeslider.bordercolor":"#e1e1e1",
      "xaxis.rangeslider.borderwidth":1,
      "margin.b":enabled ? 34 : 30
    };
    if (enabled && fullRange) {
      update["xaxis.rangeslider.range"] = fullRange.slice();
      update["xaxis.rangeslider.autorange"] = false;
    }
    return update;
  }

  function togglePaneRangeSlider() {
    var menu = q("[data-testid='display-overflow-menu']"), display = activeDisplay();
    if (!menu || menu.hidden || !display) return;
    var displayId = menu.dataset.displayId, paneId = menu.dataset.paneId, runtimeKey = paneRuntimeKey(displayId, paneId);
    var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    if (display.id !== displayId || !rangeSliderEligible(displayId, paneId) || !host) return;
    var prior = rangeSliderEnabled(displayId, paneId), enabled = !prior;
    model.rangeSliderByPane[runtimeKey] = enabled;
    closePaneMenu(true);
    loadPlotly().then(function (Plotly) {
      if (!host.isConnected || !paneById(paneId)) return;
      return Plotly.relayout(host, rangeSliderRelayout(host, enabled)).then(function () { host.dataset.rangeSliderVisible = String(enabled); bindRangeSliderDoubleClick(host, runtimeKey); syncAmplitudeSlider(host, runtimeKey); });
    }).catch(function () {
      if (prior) model.rangeSliderByPane[runtimeKey] = true; else delete model.rangeSliderByPane[runtimeKey];
      showToast("Не удалось изменить слайдер диапазона.", true);
    });
  }

  function amplitudeSliderRelayout(host, enabled) {
    var runtimeKey = host && host.dataset && host.dataset.paneHost;
    if (host && host.dataset && host.dataset.amplitudeBaseMarginRight === undefined) {
      var currentMargin = host._fullLayout && host._fullLayout.margin && Number(host._fullLayout.margin.r);
      host.dataset.amplitudeBaseMarginRight = String(Number.isFinite(currentMargin) ? currentMargin : 20);
    }
    var baseMargin = host && host.dataset ? Number(host.dataset.amplitudeBaseMarginRight) : 20;
    return { "margin.r":enabled ? Math.max(48, baseMargin) : baseMargin };
  }

  function togglePaneAmplitudeSlider() {
    var menu = q("[data-testid='display-overflow-menu']"), display = activeDisplay();
    if (!menu || menu.hidden || !display) return;
    var displayId = menu.dataset.displayId, paneId = menu.dataset.paneId, runtimeKey = paneRuntimeKey(displayId, paneId);
    var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    if (display.id !== displayId || !rangeSliderEligible(displayId, paneId) || !host) return;
    var prior = amplitudeSliderEnabled(displayId, paneId), enabled = !prior;
    model.amplitudeSliderByPane[runtimeKey] = enabled;
    if (enabled) {
      var currentRange = amplitudeRangeFromHost(host, runtimeKey);
      if (currentRange) model.amplitudeSelectedRangeByPane[runtimeKey] = currentRange;
    }
    closePaneMenu(true);
    loadPlotly().then(function (Plotly) {
      if (!host.isConnected || !paneById(paneId)) return;
      return Plotly.relayout(host, amplitudeSliderRelayout(host, enabled)).then(function () {
        host.dataset.amplitudeSliderVisible = String(enabled);
        syncAmplitudeSlider(host, runtimeKey);
      });
    }).catch(function () {
      if (prior) model.amplitudeSliderByPane[runtimeKey] = true; else delete model.amplitudeSliderByPane[runtimeKey];
      showToast("Не удалось изменить слайдер амплитуды.", true);
    });
  }

  function openPaneClearConfirm() {
    var menu = q("[data-testid='display-overflow-menu']"), layer = q("[data-testid='pane-clear-confirm-layer']"), display = activeDisplay();
    if (!menu || menu.hidden || !layer || !display) return;
    model.paneClearContext = { displayId:menu.dataset.displayId, paneId:menu.dataset.paneId, restoreTarget:model.paneMenuTrigger };
    closePaneMenu(false);
    layer.hidden = false;
    q("[data-testid='app-shell']").inert = true;
    var title = q("#pane-clear-confirm-title");
    if (title) title.focus();
  }

  function closePaneClearConfirm(restoreFocus) {
    var layer = q("[data-testid='pane-clear-confirm-layer']"), context = model.paneClearContext;
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    q("[data-testid='app-shell']").inert = false;
    model.paneClearContext = null;
    if (restoreFocus && context && context.restoreTarget && context.restoreTarget.isConnected) context.restoreTarget.focus();
  }

  function confirmPaneClear() {
    var context = model.paneClearContext, display = activeDisplay(), pane = context && paneById(context.paneId);
    if (!context || !display || display.id !== context.displayId || !pane) return closePaneClearConfirm(true);
    closePaneClearConfirm(false);
    postLayout({ operation:"update_pane", pane_id:pane.id, plot_type:pane.plot_type, signal_bindings:[] }).then(function () {
      var runtimeKey = paneRuntimeKey(context.displayId, context.paneId);
      delete model.rangeSliderByPane[runtimeKey];
      delete model.amplitudeSliderByPane[runtimeKey];
      delete model.amplitudeDataRangeByPane[runtimeKey];
      delete model.amplitudeFullRangeByPane[runtimeKey];
      delete model.amplitudeSelectedRangeByPane[runtimeKey];
      showToast("Область очищена", false);
      var target = q("[data-pane-id='" + CSS.escape(context.paneId) + "']");
      if (target) target.focus();
    }).catch(function (error) { showToast(safeErrorText(error, "Не удалось очистить область."), true); });
  }

  function enqueuePlot(displayId, pane, record) {
    var runtimeKey = paneRuntimeKey(displayId, pane.id);
    model.plotQueue[runtimeKey] = record;
    if (model.plotInFlight[runtimeKey]) return;
    model.plotInFlight[runtimeKey] = true;
    window.requestAnimationFrame(function () {
      var queued = model.plotQueue[runtimeKey];
      model.plotQueue[runtimeKey] = null;
      loadPlotly().then(function (Plotly) {
        if (!activeDisplay() || activeDisplay().id !== displayId) return;
        var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
        if (!host || !queued || !hasPlotData(queued.output.data)) return;
        var payload = plotEnvelope(queued.output.data);
        var traces = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : [{ type: "heatmap", x: payload.x, y: payload.y, z: payload.z, colorscale: payload.colorscale }]);
        var dataRange = pane.plot_type === "time" ? traceXDataRange(traces) : null;
        if (dataRange) model.rangeSliderDataRangeByPane[runtimeKey] = dataRange;
        else { delete model.rangeSliderDataRangeByPane[runtimeKey]; delete model.rangeSliderFullRangeByPane[runtimeKey]; }
        var amplitudeDataRange = pane.plot_type === "time" ? traceYDataRange(traces) : null;
        if (amplitudeDataRange) model.amplitudeDataRangeByPane[runtimeKey] = amplitudeDataRange;
        else { delete model.amplitudeDataRangeByPane[runtimeKey]; delete model.amplitudeFullRangeByPane[runtimeKey]; delete model.amplitudeSelectedRangeByPane[runtimeKey]; }
        return Plotly.react(host, traces, plotLayoutWithRangeSlider(payload.layout || {}, runtimeKey, host), Object.assign({ displayModeBar: false, displaylogo: false, responsive: true }, payload.config || {})).then(function () { host.dataset.plotReady = "true"; host.dataset.rangeSliderVisible = String(rangeSliderEnabled(displayId, pane.id)); host.dataset.amplitudeSliderVisible = String(amplitudeSliderEnabled(displayId, pane.id)); bindLinkedTimeHost(host, displayId, pane.id); bindRangeSliderDoubleClick(host, runtimeKey); syncAmplitudeSlider(host, runtimeKey); updatePeaksMarkers(displayId, pane.id, model.peaksRecords[paneRuntimeKey(displayId, pane.id)]); });
      }).catch(function () { /* The visible provider error is rendered on the next authoritative response. */ }).finally(function () {
        model.plotInFlight[runtimeKey] = false;
        if (model.plotQueue[runtimeKey]) enqueuePlot(displayId, pane, model.plotQueue[runtimeKey]);
      });
    });
  }

  function renderSettings(display) {
    var pane = paneById(model.activePane);
    var context = q("[data-settings-context]");
    if (context) context.textContent = "Область " + (panes().indexOf(pane) + 1) + " · " + titles[(pane && pane.plot_type) || "time"];
    qa("[data-settings-page]").forEach(function (button) { var active = button.dataset.settingsPage === model.settingsPage; button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1; });
    var content = q("[data-testid='settings-content']");
    if (content) content.setAttribute("aria-labelledby", "settings-tab-" + model.settingsPage);
    settings.setContext(display.id, model.revision);
    if (model.settingsPage === "peaks") {
      renderPeaksSettings(display, pane, model.peaksRecords[peaksSettingsKey(display, pane)]);
      renderApply();
      return;
    }
    settings.setView(model.settingsPage, (pane && pane.plot_type) || "time");
    settings.render();
    renderApply();
  }

  function renderApply() {
    var footer = q("[data-testid='settings-footer']");
    var button = q("[data-testid='settings-apply']");
    var status = q("[data-settings-status]");
    var values = q("[data-testid='extrema-values']");
    if (!footer || !button || !status || !values) return;
    if (model.settingsPage === "peaks") return renderPeaksApply(footer, button, status);
    values.hidden = true;
    status.classList.remove("visually-hidden");
    var state = settings.state();
    var phase = footer.dataset.phase || "pristine";
    var disabled = !state.dirty || state.invalid || phase === "applying" || phase === "pending";
    var label = phase === "error" || phase === "stale" ? "Повторить" : phase === "applying" ? "Применение…" : phase === "pending" ? "Ожидание…" : "Применить";
    footer.dataset.applyState = phase;
    button.disabled = disabled;
    button.textContent = label;
    syncApplyLoader(button, footer, phase, footer.dataset.loaderEpisodeKey);
    status.textContent = footer.dataset.message || (state.invalid ? "Исправьте выделенные поля" : "");
  }

  function syncApplyLoader(button, footer, phase, episodeKey) {
    var applying = phase === "applying", pending = phase === "pending";
    if (applying) button.classList.add("is-applying");
    if (pending) button.classList.add("is-pending");
    if (!applying) button.classList.remove("is-applying");
    if (!pending) button.classList.remove("is-pending");
    if (applying || pending) {
      var key = episodeKey || "settings::pending";
      footer.dataset.loaderEpisodeKey = key;
      button.dataset.loaderEpisodeKey = key;
      button.setAttribute("aria-busy", "true");
    } else {
      delete footer.dataset.loaderEpisodeKey;
      delete button.dataset.loaderEpisodeKey;
      button.removeAttribute("aria-busy");
    }
  }

  function renderInspector() {
    var body = q("[data-inspector-content]");
    if (!body) return;
    qa("[data-bottom-tab]").forEach(function (tab) { var active = tab.dataset.bottomTab === model.inspectorPage; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; });
    body.setAttribute("aria-labelledby", model.inspectorPage === "signals" ? "signals-tab" : model.inspectorPage === "measurements" ? "measurements-tab" : "peaks-tab");
    body.dataset.testid = "inspector-pane-" + model.inspectorPage;
    body.classList.toggle("is-table-only", model.inspectorPage === "peaks");
    if (model.inspectorPage === "measurements") return void renderMeasurementsInspector(body);
    if (model.inspectorPage === "peaks") return void renderPeaksInspector(body);
    var addLayer = q("[data-testid='signal-add-layer']");
    var signalSearchInput = body.querySelector("[data-testid='signal-search-input']");
    if (!signalSearchInput || !body.querySelector("[data-signal-rows]") || !body.querySelector("[data-table-head]")) {
      body.innerHTML = "<div class='inspector-search-row'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='search' data-testid='signal-search-input' aria-label='Поиск сигналов' placeholder='Введите название' value='" + esc(model.inspectorSearch) + "'></div><div class='inspector-actions' aria-label='Действия с сигналами'><button class='inspector-action' type='button' data-testid='signals-add-action' data-tooltip='Добавить сигнал' aria-label='Добавить сигнал' aria-haspopup='dialog' aria-controls='signal-add-dialog' aria-expanded='" + String(!!addLayer && !addLayer.hidden) + "'><img src='./icons/plus.svg' alt=''></button><button class='inspector-action' type='button' data-testid='signal-columns-menu-trigger' data-tooltip='Другие действия' aria-label='Другие действия' aria-haspopup='menu' aria-expanded='false'><img src='./icons/more-vertical.svg' alt=''></button></div></div><div class='signal-table-scroll'><table id='signal-table' class='signal-table'><thead><tr data-table-head></tr></thead><tbody data-testid='signal-rows' data-signal-rows></tbody></table><div class='table-empty' role='status' data-testid='signal-search-empty' hidden>Сигналы не найдены</div></div>";
      signalSearchInput = body.querySelector("[data-testid='signal-search-input']");
    } else if (document.activeElement !== signalSearchInput && signalSearchInput.value !== model.inspectorSearch) {
      signalSearchInput.value = model.inspectorSearch;
    }
    var addTrigger = body.querySelector("[data-testid='signals-add-action']");
    if (addTrigger) addTrigger.setAttribute("aria-expanded", String(!!addLayer && !addLayer.hidden));
    var rows = q("[data-testid='signal-rows']"), head = q("[data-table-head]");
    if (!rows || !head) return;
    var search = model.inspectorSearch;
    var activePane = paneById(model.activePane);
    var bindings = activePane && Array.isArray(activePane.signal_bindings) ? activePane.signal_bindings : [];
    var signals = (model.state.signals || []).filter(function (signal) { return !search || String(signal.name).toLowerCase().indexOf(search.toLowerCase()) >= 0; });
    var columns = [{ id:"color", label:"Цвет" }, { id:"sample_rate", label:"Частота дискретизации" }, { id:"sample_count", label:"Отсчёты" }, { id:"duration", label:"Длительность" }, { id:"data_type", label:"Тип" }].filter(function (column) { return model.visibleColumns[column.id]; });
    var renderedColumns = [{ id:"name", label:"Имя" }].concat(columns);
    var signalNames = (model.state.signals || []).map(function (signal) { return signal.name; });
    var everySignalVisible = signalNames.length > 0 && signalNames.every(function (name) { return bindings.indexOf(name) >= 0; });
    head.innerHTML = "<th><input class='ui-checkbox' type='checkbox' data-visible-all-signals aria-label='Показывать все сигналы в активной области'" + (everySignalVisible ? " checked" : "") + "></th>" + renderedColumns.map(function (column) { return "<th>" + column.label + "</th>"; }).join("");
    rows.innerHTML = signals.map(function (signal) {
      var values = { name:esc(signal.name), color:"<span class='color-swatch' data-testid='signal-color-" + esc(signal.name) + "' style='--swatch:" + esc(signal.color || "#1686c3") + "' aria-label='Цвет " + esc(signal.name) + "'></span>", sample_rate:esc(signal.sample_rate_hz == null ? "—" : signal.sample_rate_hz), sample_count:esc(signal.sample_count == null ? "—" : signal.sample_count), duration:esc(signal.duration_s == null ? "—" : signal.duration_s), data_type:esc(signal.data_type || "—") };
      var selected = bindings.indexOf(signal.name) >= 0;
      var actions = "<span class='signal-row-actions'><button type='button' class='signal-row-action' data-signal-duplicate='" + esc(signal.name) + "' data-testid='signal-duplicate-" + esc(signal.name) + "' aria-label='Копировать " + esc(signal.name) + "'><img src='./icons/copy.svg' alt=''></button><button type='button' class='signal-row-action is-danger' data-signal-delete='" + esc(signal.name) + "' data-testid='signal-delete-" + esc(signal.name) + "' aria-label='Удалить " + esc(signal.name) + "'><img src='./icons/trash.svg' alt=''></button></span>";
      var cells = renderedColumns.map(function (column, index) {
        var last = index === renderedColumns.length - 1;
        var classes = (column.id === "color" ? "color-cell " : "") + (last ? "is-actions-host" : "");
        return "<td class='" + classes.trim() + "'><span class='signal-cell-value'>" + values[column.id] + "</span>" + (last ? actions : "") + "</td>";
      }).join("");
      return "<tr data-testid='signal-row-" + esc(signal.name) + "' class='" + (selected ? "is-selected" : "") + "'><td><input class='ui-checkbox' type='checkbox' data-visible-signal='" + esc(signal.name) + "' aria-label='Показывать " + esc(signal.name) + " в активной области'" + (selected ? " checked" : "") + "></td>" + cells + "</tr>";
    }).join("");
    var toggleAll = q("[data-visible-all-signals]");
    if (toggleAll) toggleAll.indeterminate = !everySignalVisible && bindings.length > 0;
    q("[data-testid='signal-search-empty']").hidden = signals.length > 0;
  }

  function measurementValue(item, key) {
    if (!item || item[key] === null || item[key] === undefined) return "—";
    var value = item[key];
    return typeof value === "number" ? String(Number(value.toPrecision(8))) : String(value);
  }

  function renderMeasurementsInspector(body) {
    var display = activeDisplay(), pane = paneById(model.activePane), record = model.measurementsRecord;
    var current = record && display && pane && record.displayId === display.id && record.paneId === pane.id;
    var menu = q("[data-testid='measurement-columns-menu']"), menuOpen = !!menu && !menu.hidden;
    var measurementSearchInput = body.querySelector("[data-testid='measurement-search-input']");
    var host = body.querySelector("[data-testid='measurement-table-scroll']");
    if (!measurementSearchInput || !host) {
      body.innerHTML = "<div class='inspector-search-row'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='search' data-testid='measurement-search-input' aria-label='Поиск измерений' placeholder='Введите название' value='" + esc(model.measurementSearch) + "'></div><div class='inspector-actions' aria-label='Действия с измерениями'><button class='inspector-action' type='button' data-testid='measurement-columns-menu-trigger' data-tooltip='Выбрать измерения' aria-label='Выбрать отображаемые измерения' aria-haspopup='menu' aria-expanded='" + String(menuOpen) + "'><img src='./icons/more-vertical.svg' alt=''></button></div></div><div class='signal-table-scroll measurement-table-scroll' data-testid='measurement-table-scroll'></div>";
      measurementSearchInput = body.querySelector("[data-testid='measurement-search-input']");
      host = body.querySelector("[data-testid='measurement-table-scroll']");
    } else if (document.activeElement !== measurementSearchInput && measurementSearchInput.value !== model.measurementSearch) {
      measurementSearchInput.value = model.measurementSearch;
    }
    var menuTrigger = body.querySelector("[data-testid='measurement-columns-menu-trigger']");
    if (menuTrigger) menuTrigger.setAttribute("aria-expanded", String(menuOpen));
    if (!current) { host.innerHTML = "<div class='inspector-empty' role='status'>Загрузка измерений…</div>"; return; }
    if (record.error) { host.innerHTML = "<div class='inspector-empty' data-testid='peaks-error' role='alert'>" + esc(record.error) + "</div>"; return; }
    var query = model.measurementSearch.trim().toLowerCase();
    var measurementRows = Array.isArray(record.measurementRows) ? record.measurementRows : (record.measurements ? [record.measurements] : []);
    var visibleRows = measurementRows.filter(function (measurements) {
      var signalName = measurements && measurements.signal_name || "";
      return !!signalName && (!query || String(signalName).toLowerCase().indexOf(query) >= 0);
    });
    var columns = [
      { id:"name", label:"Имя", width:120 },
      { id:"line", label:"Цвет", width:48, className:"measurement-line-cell" },
      { id:"roi_min", label:"Начало области", width:96 },
      { id:"roi_max", label:"Конец области", width:96 }
    ];
    var measurementColumns = {
      minimum:[{ id:"minimum_value", kind:"minimum", itemKey:"value", label:"Минимум", width:80 }, { id:"minimum_time", kind:"minimum", itemKey:"time_s", label:"Время минимума", width:112 }],
      maximum:[{ id:"maximum_value", kind:"maximum", itemKey:"value", label:"Максимум", width:88 }, { id:"maximum_time", kind:"maximum", itemKey:"time_s", label:"Время максимума", width:112 }],
      mean:[{ id:"mean", kind:"mean", itemKey:"value", label:"Среднее", width:80 }],
      median:[{ id:"median", kind:"median", itemKey:"value", label:"Медиана", width:80 }],
      peak_to_peak:[{ id:"peak_to_peak", kind:"peak_to_peak", itemKey:"value", label:"Размах", width:72 }],
      rms:[{ id:"rms", kind:"rms", itemKey:"value", label:"СКЗ", width:56 }]
    };
    var selectedKinds = Array.isArray(display.measurement_kinds) ? display.measurement_kinds : [];
    ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"].forEach(function (kind) {
      if (selectedKinds.indexOf(kind) >= 0) columns = columns.concat(measurementColumns[kind]);
    });
    var tableWidth = columns.reduce(function (total, column) { return total + column.width; }, 0);
    var colgroup = "<colgroup>" + columns.map(function (column) { return "<col style='width:" + column.width + "px'>"; }).join("") + "</colgroup>";
    var headers = columns.map(function (column) { return "<th" + (column.className ? " class='" + column.className + "'" : "") + ">" + column.label + "</th>"; }).join("");
    var rows = visibleRows.map(function (measurements) {
      var signalName = measurements.signal_name || "";
      var items = {};
      (measurements.items || []).forEach(function (item) { items[item.id] = item; });
      var signal = (model.state.signals || []).filter(function (candidate) { return candidate.name === signalName; })[0] || {};
      var limits = measurements.time_limits || display.time_limits || {};
      var cells = columns.map(function (column) {
        var value = "—";
        if (column.id === "name") value = "<span class='signal-cell-value'>" + esc(signalName) + "</span>";
        else if (column.id === "line") value = "<span class='color-swatch measurement-color-swatch' style='--swatch:" + esc(signal.color || "#1686c3") + "' aria-label='Цвет " + esc(signalName) + "'></span>";
        else if (column.id === "roi_min") value = esc(measurementValue({ value:limits.min_s }, "value"));
        else if (column.id === "roi_max") value = esc(measurementValue({ value:limits.max_s }, "value"));
        else value = esc(measurementValue(items[column.kind], column.itemKey));
        return "<td" + (column.className ? " class='" + column.className + "'" : "") + ">" + value + "</td>";
      }).join("");
      return "<tr data-testid='measurement-row-" + esc(signalName) + "'" + (measurements.error ? " class='has-measurement-error' title='" + esc(measurements.error) + "'" : "") + ">" + cells + "</tr>";
    }).join("");
    host.innerHTML = "<table class='signal-table measurement-table' data-testid='measurement-table' style='--measurement-table-width:" + tableWidth + "px'>" + colgroup + "<thead><tr>" + headers + "</tr></thead><tbody>" + rows + "</tbody></table><div class='table-empty' data-testid='measurement-search-empty' role='status'" + (visibleRows.length ? " hidden" : "") + ">" + (measurementRows.length ? "Измерения не найдены" : "Для активной области нет рассчитанных измерений") + "</div>";
  }

  function loadMeasurements() {
    if (model.inspectorPage !== "measurements") return Promise.resolve();
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane) return Promise.resolve();
    var displayId = display.id, paneId = pane.id, token = ++model.measurementsToken;
    model.measurementsRecord = null;
    renderInspector();
    return api.getFullState().then(function (snapshot) {
      if (token !== model.measurementsToken || model.inspectorPage !== "measurements" || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return;
      model.measurementsRecord = { displayId:displayId, paneId:paneId, revision:stateRevision(snapshot), measurements:snapshot.measurements || null, measurementRows:Array.isArray(snapshot.measurement_rows) ? snapshot.measurement_rows : (snapshot.measurements ? [snapshot.measurements] : []), error:null };
      renderInspector();
    }).catch(function (error) {
      if (token !== model.measurementsToken || model.inspectorPage !== "measurements") return;
      model.measurementsRecord = { displayId:displayId, paneId:paneId, error:safeErrorText(error, "Не удалось загрузить измерения.") };
      renderInspector();
    });
  }

  function renderPeaksInspector(body) {
    var display = activeDisplay(), pane = paneById(model.activePane), record = display && pane && model.peaksRecords[paneRuntimeKey(display.id, pane.id)];
    var current = record && display && pane && record.displayId === display.id && record.paneId === pane.id;
    var host = body.querySelector("[data-testid='peaks-table-scroll']");
    if (!host || host.parentElement !== body) {
      body.innerHTML = "<div class='signal-table-scroll peaks-table-scroll' data-testid='peaks-table-scroll'></div>";
      host = body.querySelector("[data-testid='peaks-table-scroll']");
    }
    if (pane && !paneHasSignals(pane)) { host.innerHTML = "<div class='peaks-state' data-testid='peaks-no-signals' data-extrema-state='no-signals' role='status'><strong>Выберете сигнал для отображения</strong></div>"; return; }
    if (!pane || pane.plot_type !== "time") { host.innerHTML = "<div class='inspector-empty' role='status'>Экстремумы доступны для временной области</div>"; return; }
    if (!current || (!record.pending && !record.error && !record.calculated)) {
      var areaNumber = Math.max(1, panes().indexOf(pane) + 1);
      host.innerHTML = "<div class='peaks-state peaks-start' data-testid='extrema-start' data-extrema-state='start' role='status'><strong>Рассчет экстремумы для области " + areaNumber + "</strong><div class='peaks-start-actions'><button class='button' type='button' data-testid='extrema-configure'>Настроить рассчет</button><button class='button button-primary' type='button' data-testid='extrema-calculate'>Рассчитать</button></div></div>";
      return;
    }
    if (record.pending) {
      var episodeKey = record.loading_episode || ("extrema::" + paneRuntimeKey(display.id, pane.id) + "::" + String(record.context_key == null ? "awaiting" : record.context_key) + "::" + String(record.calculation_revision == null ? "awaiting" : record.calculation_revision));
      var loading = host.firstElementChild;
      if (loading && loading.dataset.extremaState === "loading" && loading.dataset.loaderEpisodeKey === episodeKey) return;
      host.innerHTML = "<div class='peaks-state peaks-loading' data-testid='peaks-loader' data-extrema-state='loading' data-loader-episode-key='" + esc(episodeKey) + "' role='status' aria-live='polite'><span class='spinner' data-loader-spinner data-loader-episode-key='" + esc(episodeKey) + "' aria-hidden='true'></span><strong>Расчёт экстремумов…</strong></div>";
      return;
    }
    if (record.error) { host.innerHTML = "<div class='peaks-state peaks-error' data-testid='peaks-error' data-extrema-state='error' role='alert'><strong>Не удалось рассчитать экстремумы</strong><p>" + esc(record.error) + "</p></div>"; return; }
    var data = record.data || {}, rows = Array.isArray(data.rows) ? data.rows : [];
    if (!data.signals || !data.signals.length) { host.innerHTML = "<div class='peaks-state' data-testid='peaks-no-signals' data-extrema-state='no-signals' role='status'><strong>Выберете сигнал для отображения</strong></div>"; return; }
    if (!rows.length) { host.innerHTML = "<div class='peaks-state' data-testid='peaks-empty' data-extrema-state='empty' role='status'><strong>Экстремумы не найдены</strong><p>Для активной области нет значений, соответствующих настройкам.</p></div>"; return; }
    var colgroup = "<colgroup><col style='width:4.8%'><col style='width:28.4%'><col style='width:9.1%'><col style='width:12.3%'><col style='width:12.5%'><col style='width:12.5%'><col style='width:20.4%'></colgroup>";
    host.innerHTML = "<table class='signal-table peaks-table' data-testid='peaks-table' data-extrema-table='true'>" + colgroup + "<thead><tr><th>№</th><th>Сигнал</th><th>Цвет</th><th>Тип</th><th>Значение</th><th>Время, с</th><th>Метка на графике</th></tr></thead><tbody>" + rows.map(function (row, index) {
      var type = row.type === "minimum" ? "minimum" : "maximum", typeLabel = type === "minimum" ? "Минимум" : "Максимум";
      var number = row.graph_number == null ? "" : row.graph_number;
      return "<tr data-testid='extrema-row-" + esc(row.row_number == null ? index + 1 : row.row_number) + "'><td>" + esc(row.row_number == null ? index + 1 : row.row_number) + "</td><td>" + esc(row.signal_name || "") + "</td><td class='color-cell'><span class='peaks-color-swatch' style='--swatch:" + esc(row.signal_color || "#1686c3") + "' aria-label='Цвет " + esc(row.signal_name || "") + "'></span></td><td data-testid='extrema-type-" + esc(row.row_number == null ? index + 1 : row.row_number) + "'>" + typeLabel + "</td><td>" + esc(measurementValue(row, "value")) + "</td><td>" + esc(measurementValue(row, "time_s")) + "</td><td><span class='extrema-table-marker is-" + type + "' style='--marker-color:" + esc(row.signal_color || "#1686c3") + "' data-marker-symbol='" + (type === "minimum" ? "triangle-down" : "triangle-up") + "' aria-label='" + typeLabel + ", метка " + esc(number) + "'><i aria-hidden='true'></i><b>" + esc(number) + "</b></span></td></tr>";
    }).join("") + "</tbody></table>";
  }

  function peaksSettingsKey(display, pane) { return display && pane ? paneRuntimeKey(display.id, pane.id) : ""; }
  function defaultPeaksSettings(settings) { return Object.assign({ mode:"maxima", number_of_peaks:5, maximum_cutoff:null, minimum_cutoff:null, minimum_distance_samples:1, threshold:0 }, settings || {}); }
  function activePeaksSettings(pane, record) {
    var responseSettings = record && record.data && record.data.settings;
    return defaultPeaksSettings(responseSettings || (pane && pane.peaks_settings));
  }
  function extremaModeLabel(mode) { return mode === "minima" ? "Минимумы" : mode === "all" ? "Все экстремумы" : "Максимумы"; }
  function activeExtremaHasComplexSignal(pane, record) {
    var bindings = pane && Array.isArray(pane.signal_bindings) ? pane.signal_bindings : [];
    var extremaSignals = record && record.data && Array.isArray(record.data.signals) ? record.data.signals : [];
    if (extremaSignals.some(function (signal) { return signal.ordinate === "magnitude"; })) return true;
    return (model.state && model.state.signals || []).some(function (signal) { return bindings.indexOf(signal.name) >= 0 && signal.data_type === "Комплексный"; });
  }
  function createPeaksDraft(display, pane, settings) {
    var source = defaultPeaksSettings(settings);
    return { key:peaksSettingsKey(display, pane), source:source, values:{ mode:source.mode, number_of_peaks:String(source.number_of_peaks), maximum_cutoff:source.maximum_cutoff == null ? "-Inf" : String(source.maximum_cutoff), minimum_cutoff:source.minimum_cutoff == null ? "Inf" : String(source.minimum_cutoff), minimum_distance_samples:String(source.minimum_distance_samples), threshold:String(source.threshold) }, invalid:{}, intent:0 };
  }
  function parsePeaksSettings(draft) {
    var raw = draft.values, settings = {}, invalid = {};
    var count = numeric.parse(raw.number_of_peaks, "integer"), distance = numeric.parse(raw.minimum_distance_samples, "integer"), threshold = numeric.parse(raw.threshold, "decimal");
    var maximumCutoff = numeric.parse(raw.maximum_cutoff, "decimal", { tokens:{ "":null, "-Inf":null } });
    var minimumCutoff = numeric.parse(raw.minimum_cutoff, "decimal", { tokens:{ "":null, "Inf":null } });
    if (["maxima", "minima", "all"].indexOf(raw.mode) < 0) invalid.mode = "Выберите режим расчёта."; else settings.mode = raw.mode;
    if (!count.valid || count.value < 1 || count.value > 1000) invalid.number_of_peaks = count.valid ? "Введите целое число от 1 до 1000." : count.error; else settings.number_of_peaks = count.value;
    var maximumActive = raw.mode === "maxima" || raw.mode === "all", minimumActive = raw.mode === "minima" || raw.mode === "all";
    if (!maximumCutoff.valid) {
      if (maximumActive) invalid.maximum_cutoff = maximumCutoff.error;
      settings.maximum_cutoff = draft.source.maximum_cutoff;
    } else settings.maximum_cutoff = maximumCutoff.value;
    if (!minimumCutoff.valid) {
      if (minimumActive) invalid.minimum_cutoff = minimumCutoff.error;
      settings.minimum_cutoff = draft.source.minimum_cutoff;
    } else settings.minimum_cutoff = minimumCutoff.value;
    if (!distance.valid || distance.value < 1) invalid.minimum_distance_samples = distance.valid ? "Введите целое число не меньше 1." : distance.error; else settings.minimum_distance_samples = distance.value;
    if (!threshold.valid) invalid.threshold = threshold.error;
    else if (threshold.value < 0) invalid.threshold = "Введите число не меньше 0.";
    else settings.threshold = threshold.value;
    draft.invalid = invalid;
    return Object.keys(invalid).length ? null : settings;
  }
  function peaksSettingsDirty(draft, settings) { return !!draft && JSON.stringify(settings) !== JSON.stringify(draft.source); }
  function renderPeaksSettings(display, pane, record, restoreFocus) {
    var host = q("[data-testid='settings-content']");
    if (!host) return;
    if (!display || !pane || pane.plot_type !== "time") { host.innerHTML = "<div class='inspector-empty' role='status'>Настройки доступны для временной области</div>"; valueSelect.reconcile(); return; }
    var settings = activePeaksSettings(pane, record);
    var key = peaksSettingsKey(display, pane);
    if (!model.peaksDraft || model.peaksDraft.key !== key) model.peaksDraft = createPeaksDraft(display, pane, settings);
    var draft = model.peaksDraft, parsed = parsePeaksSettings(draft), disabled = "", labels = [["number_of_peaks", "Количество экстремумов, всего"]];
    if (draft.values.mode !== "minima") labels.push(["maximum_cutoff", "Отсечка максимума"]);
    if (draft.values.mode !== "maxima") labels.push(["minimum_cutoff", "Отсечка минимума"]);
    labels.push(["minimum_distance_samples", "Минимальное расстояние, отсчёты", ""], ["threshold", "Порог", ""]);
    var modeError = draft.invalid.mode;
    var complexSignal = activeExtremaHasComplexSignal(pane, record);
    var modeSelectKey="extrema::" + display.id + "::" + pane.id + "::mode";
    var modeSelector=valueSelect.markup({
      key:modeSelectKey,
      value:draft.values.mode,
      label:extremaModeLabel(draft.values.mode),
      options:[{ value:"maxima", label:"Максимумы" }, { value:"minima", label:"Минимумы" }, { value:"all", label:"Все экстремумы" }],
      disabled:!!model.peaksApplying,
      className:"extrema-mode-trigger",
      testId:"extrema-mode-trigger",
      ariaLabel:"Режим расчёта",
      onSelect:chooseExtremaMode
    });
    var modeControl = "<label class='settings-field-row" + (modeError ? " has-error" : "") + "' data-testid='settings-field-mode'><span class='settings-label'><span>Режим расчёта</span></span><span class='settings-control-wrap'>" + modeSelector + "</span>" + (modeError ? "<small class='field-message is-error' role='alert'>" + esc(modeError) + "</small>" : "") + "</label><p class='extrema-magnitude-note" + (complexSignal ? " is-current" : "") + "' data-testid='extrema-magnitude-copy'><span>Для комплексных сигналов экстремумы рассчитываются по модулю |y|.</span>" + (complexSignal ? "<em>Активный сигнал комплексный · используется |y|.</em>" : "") + "</p>";
    host.innerHTML = "<section class='settings-group' data-testid='extrema-settings-group'><button class='settings-group-title' type='button' aria-expanded='true' disabled><span>Расчёт экстремумов</span></button><div class='settings-group-fields'>" + modeControl + labels.map(function (field) { var id=field[0], error=draft.invalid[id], integer=id === "number_of_peaks" || id === "minimum_distance_samples", helper=field[2] ? "<small class='field-message extrema-field-helper'>" + esc(field[2]) + "</small>" : ""; return "<label class='settings-field-row" + (error ? " has-error" : "") + "' data-testid='settings-field-" + id + "'><span class='settings-label' title='" + esc(field[1]) + "'><span>" + field[1] + "</span></span><span class='settings-control-wrap'><input class='control' type='text' inputmode='" + (integer ? "numeric" : "decimal") + "' step='" + (integer ? "1" : "any") + "' data-peaks-setting='" + id + "' value='" + esc(draft.values[id]) + "' aria-invalid='" + String(!!error) + "' aria-label='" + field[1] + "'" + disabled + "></span>" + (error ? "<small class='field-message is-error' role='alert'>" + esc(error) + "</small>" : "") + helper + "</label>"; }).join("") + "</div></section>";
    valueSelect.reconcile();
    if (restoreFocus) { var input = host.querySelector("[data-peaks-setting='" + restoreFocus.id + "']"); if (input) { input.focus(); if (typeof input.setSelectionRange === "function") input.setSelectionRange(restoreFocus.start, restoreFocus.end); } }
  }

  function renderPeaksApply(footer, button, status) {
    var display = activeDisplay(), pane = paneById(model.activePane), draft = model.peaksDraft;
    var values = q("[data-testid='extrema-values']");
    var parsed = draft && draft.key === peaksSettingsKey(display, pane) ? parsePeaksSettings(draft) : null;
    var dirty = !!parsed && peaksSettingsDirty(draft, parsed);
    var invalid = !!draft && !parsed;
    var unavailable = !pane || pane.plot_type !== "time" || !draft;
    var phase = model.peaksApplying ? "pending" : invalid ? "invalid" : dirty ? "dirty" : "pristine";
    footer.dataset.applyState = phase;
    footer.setAttribute("aria-busy", String(model.peaksApplying));
    if (values) { values.hidden = false; values.disabled = !display || !pane; }
    status.classList.add("visually-hidden");
    button.disabled = unavailable || model.peaksApplying || invalid || !dirty;
    button.textContent = model.peaksApplying ? "Применение…" : "Применить";
    syncApplyLoader(button, footer, model.peaksApplying ? "pending" : phase, model.peaksApplyEpisodeKey);
    status.textContent = invalid ? "Исправьте выделенные поля" : model.peaksMessage;
  }

  function applyPeaksSettings() {
    var display = activeDisplay(), pane = paneById(model.activePane), draft = model.peaksDraft, button = q("[data-testid='settings-apply']");
    if (!display || !pane || !draft || draft.key !== peaksSettingsKey(display, pane) || !button || model.settingsPage !== "peaks") return;
    if (model.peaksApplying) { model.peaksApplyQueued = true; return; }
    var settingsPayload = parsePeaksSettings(draft);
    if (!settingsPayload || !peaksSettingsDirty(draft, settingsPayload)) return;
    var displayId = display.id, paneId = pane.id;
    model.peaksApplying = true;
    model.peaksApplyQueued = false;
    model.peaksApplyEpisodeKey = "settings-extrema::" + paneRuntimeKey(displayId, paneId) + "::" + String(draft.intent || 0) + "::" + String(model.revision);
    model.peaksMessage = "Применяются настройки экстремумов";
    closeExtremaModeMenu(false);
    renderSettings(display);
    function samePeaksContext() { return activeDisplay() && activeDisplay().id === displayId && model.activePane === paneId && model.settingsPage === "peaks"; }
    function acceptPeaksResponse(response) {
      var snapshot = response && response.state ? response.state : response;
      if (!accept(snapshot)) return refreshSnapshot(renderActivePaneContext);
      renderActivePaneContext();
      return Promise.resolve(snapshot);
    }
    function rebasePeaksConflict(error) {
      var current = error && error.payload && (error.payload.current || error.payload.state);
      if (!current) return Promise.reject(error);
      if (accept(current)) { renderActivePaneContext(); return Promise.resolve(current); }
      return refreshSnapshot(renderActivePaneContext);
    }
    function persistLatest(retries) {
      if (!samePeaksContext() || !model.peaksDraft || model.peaksDraft.key !== peaksSettingsKey(activeDisplay(), paneById(paneId))) return Promise.reject(new Error("Контекст области изменился; повторите действие."));
      var currentDraft = model.peaksDraft, currentPayload = parsePeaksSettings(currentDraft);
      if (!currentPayload) return Promise.reject(new Error("Исправьте выделенные поля."));
      var intent = currentDraft.intent || 0;
      return api.updatePeaksSettings({ state_revision:model.revision, display_id:displayId, pane_id:paneId, settings:currentPayload }).then(function (response) {
        return acceptPeaksResponse(response).then(function () {
          var latest = model.peaksDraft;
          if (samePeaksContext() && latest && latest.key === currentDraft.key && ((latest.intent || 0) > intent || model.peaksApplyQueued)) {
            model.peaksApplyQueued = false;
            return persistLatest(0);
          }
          return response;
        });
      }).catch(function (error) {
        var latest = model.peaksDraft;
        if (samePeaksContext() && error && error.status === 409 && retries < 1) return rebasePeaksConflict(error).then(function () { return persistLatest(retries + 1); });
        if (samePeaksContext() && latest && latest.key === currentDraft.key && (latest.intent || 0) > intent) return persistLatest(0);
        throw error;
      });
    }
    persistLatest(0).then(function () {
      if (!samePeaksContext()) return;
      var runtimeKey = paneRuntimeKey(displayId, paneId);
      model.peaksDraft = null;
      model.peaksMessage = "Настройки экстремумов применены";
      delete model.peaksRecords[runtimeKey];
      model.peaksRecord = null;
      clearPeaksMarkersForPane(displayId, paneId);
      renderInspector();
      return fetchActivePeaks(displayId, paneId, false, false);
    }).catch(function (error) {
      model.peaksMessage = safeErrorText(error, "Не удалось применить настройки экстремумов.");
      showToast(safeErrorText(error, "Не удалось применить настройки экстремумов."), true);
    }).finally(function () {
      model.peaksApplying = false;
      model.peaksApplyEpisodeKey = null;
      if (activeDisplay() && activeDisplay().id === displayId && model.activePane === paneId && model.settingsPage === "peaks") renderSettings(activeDisplay());
    });
  }

  function ownedPeakTraceIndexes(host) {
    return host && host.data ? host.data.reduce(function (indexes, trace, index) { if (trace && trace.meta && trace.meta.signal_analyser_peaks_overlay) indexes.push(index); return indexes; }, []) : [];
  }
  function clearPeaksMarkers() {
    if (!window.Plotly) return;
    qa(".plot-chart.js-plotly-plot").forEach(function (host) {
      var indexes = ownedPeakTraceIndexes(host);
      if (indexes.length) window.Plotly.deleteTraces(host, indexes);
    });
  }
  function clearPeaksMarkersForPane(displayId, paneId) {
    if (!window.Plotly) return;
    var host = q("[data-pane-host='" + CSS.escape(paneRuntimeKey(displayId, paneId)) + "']");
    var indexes = ownedPeakTraceIndexes(host);
    if (indexes.length) Promise.resolve(window.Plotly.deleteTraces(host, indexes)).catch(function () {});
  }
  function updatePeaksMarkers(displayId, paneId, record) {
    var pane = paneById(paneId), display = activeDisplay();
    if (!window.Plotly || !display || display.id !== displayId || !pane || pane.plot_type !== "time" || !record || !record.data || !Array.isArray(record.data.rows)) return;
    var host = q("[data-pane-host='" + CSS.escape(paneRuntimeKey(displayId, paneId)) + "']");
    if (!host || !host.data) return;
    var grouped = {};
    record.data.rows.forEach(function (row) { var key=row.signal_name || ""; if (!key) return; (grouped[key] || (grouped[key]=[])).push(row); });
    var traces = Object.keys(grouped).map(function (name) { var rows=grouped[name], color=rows[0].signal_color || "#1686c3"; return { type:"scatter", mode:"markers+text", x:rows.map(function(row){return row.time_s;}), y:rows.map(function(row){return row.value;}), text:rows.map(function(row){return row.graph_number == null ? "" : String(row.graph_number);}), textposition:"top center", marker:{color:color,size:8,symbol:rows.map(function(row){ return row.type === "minimum" ? "triangle-down" : "triangle-up"; })}, hoverinfo:"skip", showlegend:false, meta:{signal_analyser_peaks_overlay:true} }; });
    var existing = ownedPeakTraceIndexes(host), remove = existing.length ? window.Plotly.deleteTraces(host, existing) : Promise.resolve();
    Promise.resolve(remove).then(function () { if (traces.length && activeDisplay() && activeDisplay().id === displayId && model.activePane === paneId) return window.Plotly.addTraces(host, traces); }).catch(function () {});
  }

  function stopPeaksPolling(exceptKey) {
    Object.keys(model.peaksPollByPane).forEach(function (key) {
      if (key !== exceptKey) { window.clearTimeout(model.peaksPollByPane[key]); delete model.peaksPollByPane[key]; }
    });
  }

  function peaksResponseIsCurrent(response, displayId, paneId, token) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    if (token !== model.peaksTokens[runtimeKey] || !peaksSurfaceActive() || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return false;
    if ((stateRevision(response) !== null && stateRevision(response) < model.revision) || response.display_id !== displayId || response.pane_id !== paneId) return false;
    var prior = model.peaksRecords[runtimeKey];
    if (prior && prior.context_key && response.context_key !== prior.context_key && response.calculation_revision <= prior.calculation_revision) return false;
    return !(prior && typeof prior.calculation_revision === "number" && typeof response.calculation_revision === "number" && response.calculation_revision < prior.calculation_revision);
  }

  function acceptPeaksPayload(response, displayId, paneId, token, calculationRequested, poll) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    if (!peaksResponseIsCurrent(response, displayId, paneId, token)) return null;
    var prior = model.peaksRecords[runtimeKey];
    var requested = !!calculationRequested || !!(prior && prior.calculationRequested);
    var pending = !response.isready && requested;
    model.revision = Math.max(model.revision, stateRevision(response) || model.revision);
    var record = {
      displayId:displayId,
      paneId:paneId,
      context_key:response.context_key,
      calculation_revision:response.calculation_revision,
      revision:stateRevision(response),
      calculationRequested:requested,
      calculated:!!response.isready,
      pending:pending,
      loading_episode:pending ? (prior && prior.pending && prior.loading_episode || ("extrema::" + runtimeKey + "::" + String(response.context_key == null ? "awaiting" : response.context_key) + "::" + String(response.calculation_revision == null ? "awaiting" : response.calculation_revision))) : null,
      error:response.isready && response.success === false ? response.error || "Не удалось рассчитать экстремумы." : null,
      data:response.data || null,
      peaks:response.peaks || null
    };
    model.peaksRecords[runtimeKey] = record;
    model.peaksRecord = record;
    if (model.inspectorPage === "peaks") renderInspector();
    if (model.settingsPage === "peaks") renderSettings(activeDisplay());
    if (response.isready && response.success !== false) updatePeaksMarkers(displayId, paneId, record);
    if (!response.isready && !requested) clearPeaksMarkersForPane(displayId, paneId);
    if (!response.isready && requested && poll) model.peaksPollByPane[runtimeKey] = window.setTimeout(function () { fetchActivePeaks(displayId, paneId, true, true); }, 350);
    return record;
  }

  function fetchActivePeaks(displayId, paneId, poll, calculationRequested) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var token = (model.peaksTokens[runtimeKey] || 0) + 1;
    model.peaksTokens[runtimeKey] = token;
    window.clearTimeout(model.peaksPollByPane[runtimeKey]);
    return api.activePeaks(displayId, paneId).then(function (response) {
      return acceptPeaksPayload(response, displayId, paneId, token, calculationRequested, poll);
    }).catch(function (error) {
      if (token !== model.peaksTokens[runtimeKey] || !peaksSurfaceActive() || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return null;
      var record = { displayId:displayId, paneId:paneId, calculationRequested:!!calculationRequested, calculated:false, error:safeErrorText(error, "Не удалось загрузить экстремумы."), pending:false };
      model.peaksRecords[runtimeKey] = record;
      model.peaksRecord = record;
      if (model.inspectorPage === "peaks") renderInspector();
      if (model.settingsPage === "peaks") renderSettings(activeDisplay());
      return record;
    });
  }

  function ensurePeaksEnabled(displayId, paneId) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var display = activeDisplay(), pane = paneById(paneId);
    if (!display || display.id !== displayId || !pane || pane.id !== model.activePane || !paneHasSignals(pane) || pane.plot_type !== "time") return Promise.reject(new Error("Контекст области изменился; повторите действие."));
    if (display.peaks_enabled) return Promise.resolve();
    if (model.peaksEnableByPane[runtimeKey]) return model.peaksEnableByPane[runtimeKey];
    model.peaksEnableByPane[runtimeKey] = mutate(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return Promise.reject(new Error("Контекст области изменился; повторите действие."));
      return api.view({ state_revision:model.revision, peaks_enabled:true });
    }, { preservePlots:true, skipOutput:true }).finally(function () { delete model.peaksEnableByPane[runtimeKey]; });
    return model.peaksEnableByPane[runtimeKey];
  }

  function calculatePeaks() {
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane || pane.plot_type !== "time" || !paneHasSignals(pane)) return;
    var displayId = display.id, paneId = pane.id, runtimeKey = paneRuntimeKey(displayId, paneId);
    var existing = model.peaksRecords[runtimeKey];
    if (existing && existing.displayId === displayId && existing.paneId === paneId && existing.pending) return;
    stopPeaksPolling(runtimeKey);
    var token = (model.peaksTokens[runtimeKey] || 0) + 1;
    model.peaksTokens[runtimeKey] = token;
    var prior = model.peaksRecords[runtimeKey];
    model.peaksRecords[runtimeKey] = {
      displayId:displayId,
      paneId:paneId,
      context_key:prior && prior.context_key,
      calculation_revision:prior && prior.calculation_revision,
      calculationRequested:true,
      calculated:false,
      pending:true,
      loading_episode:"extrema::" + runtimeKey + "::request::" + String(token),
      error:null,
      data:prior && prior.data || null
    };
    renderInspector();
    ensurePeaksEnabled(displayId, paneId).then(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId || model.inspectorPage !== "peaks") return null;
      token = (model.peaksTokens[runtimeKey] || 0) + 1;
      model.peaksTokens[runtimeKey] = token;
      function requestCalculation(retries) {
        return api.calculateActivePeaks({ state_revision:model.revision, display_id:displayId, pane_id:paneId }).catch(function (error) {
          var current = error && error.payload && (error.payload.current || error.payload.state);
          if (!current || error.status !== 409 || retries >= 1 || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) throw error;
          var snapshot = current.state || current;
          return (accept(snapshot) ? Promise.resolve(snapshot) : refreshSnapshot(renderActivePaneContext)).then(function () {
            if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) throw new Error("Контекст области изменился; повторите действие.");
            renderActivePaneContext();
            return requestCalculation(retries + 1);
          });
        });
      }
      return requestCalculation(0).then(function (response) {
        return acceptPeaksPayload(response, displayId, paneId, token, true, true);
      });
    }).catch(function (error) {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId || model.inspectorPage !== "peaks") return;
      model.peaksRecords[runtimeKey] = { displayId:displayId, paneId:paneId, calculationRequested:true, calculated:false, pending:false, error:safeErrorText(error, "Не удалось рассчитать экстремумы."), data:prior && prior.data || null };
      renderInspector();
    });
  }

  function loadPeaks() {
    if (!peaksSurfaceActive()) return Promise.resolve();
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane || pane.plot_type !== "time" || !paneHasSignals(pane)) { stopPeaksPolling(""); model.peaksRecord = null; renderInspector(); return Promise.resolve(); }
    var displayId = display.id, paneId = pane.id, runtimeKey = paneRuntimeKey(displayId, paneId);
    stopPeaksPolling(runtimeKey);
    if (display.peaks_enabled) return fetchActivePeaks(displayId, paneId, false, false);
    return ensurePeaksEnabled(displayId, paneId).then(function () { return fetchActivePeaks(displayId, paneId, false, false); });
  }

  function targetActivePaneForExtrema() {
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane) return false;
    model.extremaTargetKey = paneRuntimeKey(display.id, pane.id);
    renderActivePaneContext();
    return true;
  }

  function configureActivePeaks() {
    if (!targetActivePaneForExtrema()) return;
    model.settingsPage = "peaks";
    renderActivePaneContext();
    loadPeaks();
    window.requestAnimationFrame(function () { var tab = q("[data-testid='settings-tab-peaks']"); if (tab) tab.focus(); });
  }

  function showActivePeaksValues() {
    if (!targetActivePaneForExtrema()) return;
    model.inspectorPage = "peaks";
    renderActivePaneContext();
    var display = activeDisplay(), pane = paneById(model.activePane);
    var record = display && pane && model.peaksRecords[paneRuntimeKey(display.id, pane.id)];
    var readyForCurrentContext = !!(record && record.displayId === display.id && record.paneId === pane.id &&
      record.calculated && !record.pending && !record.error &&
      typeof record.context_key === "string" && record.context_key &&
      typeof record.calculation_revision === "number" && record.revision === model.revision);
    var pendingForCurrentContext = !!(record && record.displayId === display.id && record.paneId === pane.id && record.pending);
    if (!readyForCurrentContext && !pendingForCurrentContext) calculatePeaks();
    window.requestAnimationFrame(function () { var tab = q("[data-testid='inspector-tab-peaks']"); if (tab) tab.focus(); });
  }

  function peaksSurfaceActive() { return model.inspectorPage === "peaks" || model.settingsPage === "peaks"; }

  function signalAddLayer() { return q("[data-testid='signal-add-layer']"); }

  function signalAddSelected() {
    return signalAddVariables().filter(function (variable) { return !!model.signalAddSelection[variable.variable_id]; });
  }

  function signalAddVariables() {
    var supported = ["raw_vector", "raw_matrix", "timed_vector", "timed_matrix"];
    return model.signalAddCatalog && Array.isArray(model.signalAddCatalog.variables) ? model.signalAddCatalog.variables.filter(function (variable) {
      return variable && variable.selectable === true && supported.indexOf(variable.source_kind) >= 0 && ["required", "not_needed"].indexOf(variable.sample_rate_requirement) >= 0;
    }) : [];
  }

  function signalAddRateResult() {
    var layer = signalAddLayer(), input = layer && layer.querySelector("[data-signal-add-sample-rate]");
    return numeric.parse(input ? input.value : "", "decimal");
  }

  function updateSignalAddControls() {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    var selected = signalAddSelected();
    var requiresRate = selected.some(function (variable) { return variable.sample_rate_requirement === "required"; });
    var rate = layer.querySelector("[data-signal-add-sample-rate]");
    var submit = layer.querySelector("[data-signal-add-submit]");
    var rateResult = signalAddRateResult(), invalidRate = requiresRate && (!rateResult.valid || rateResult.value <= 0);
    var rateError = layer.querySelector(".signal-add-rate-error");
    if (rate) {
      rate.disabled = !requiresRate || model.signalAddSubmitting;
      rate.setAttribute("aria-invalid", String(invalidRate));
    }
    if (rateError) { rateError.hidden = !invalidRate; rateError.textContent = invalidRate ? (rateResult.valid ? "Введите число больше 0." : rateResult.error) : ""; }
    if (submit) submit.disabled = model.signalAddLoading || model.signalAddSubmitting || !selected.length || invalidRate;
    qa("[data-signal-add-variable], [data-signal-add-search], [data-signal-add-close], [data-signal-add-cancel]").forEach(function (control) { control.disabled = model.signalAddSubmitting || (control.dataset.signalAddSearch !== undefined && model.signalAddLoading); });
  }

  function workspaceVariableLength(variable) {
    var sampleCount = Number(variable && variable.sample_count);
    if (!Number.isSafeInteger(sampleCount) || sampleCount < 0) {
      sampleCount = Array.isArray(variable && variable.shape) && Number.isSafeInteger(Number(variable.shape[0])) ? Number(variable.shape[0]) : null;
    }
    return sampleCount == null ? "—" : sampleCount + " отсчётов";
  }

  function renderSignalAddCatalog() {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    var list = layer.querySelector("[data-testid='signal-add-variables']");
    var state = layer.querySelector("[data-testid='signal-add-state']");
    var error = layer.querySelector("[data-testid='signal-add-error']");
    var catalog = model.signalAddCatalog, search = model.signalAddSearch.toLocaleLowerCase("ru-RU");
    var searchInput = layer.querySelector("[data-signal-add-search]"), count = layer.querySelector("[data-signal-add-count]");
    error.hidden = true;
    if (searchInput) { searchInput.value = model.signalAddSearch; searchInput.disabled = model.signalAddLoading || model.signalAddSubmitting; }
    if (model.signalAddLoading) {
      list.innerHTML = "<div class='signal-add-list-state'><span class='spinner'></span><span>Загрузка переменных…</span></div>";
      if (count) count.textContent = "0 переменных";
      state.hidden = false;
      state.textContent = "Загрузка переменных…";
      return updateSignalAddControls();
    }
    if (model.signalAddCatalogError) {
      list.innerHTML = "<div class='signal-add-list-state'>Не удалось получить переменные рабочей области.<button class='button button-compact' type='button' data-signal-add-retry>Повторить</button></div>";
      state.hidden = true; error.hidden = false; error.textContent = model.signalAddCatalogError;
      if (count) count.textContent = "0 переменных";
      return updateSignalAddControls();
    }
    var allVariables = signalAddVariables();
    var variables = allVariables.filter(function (variable) { return !search || String(variable.name || "").toLocaleLowerCase("ru-RU").indexOf(search) >= 0; });
    list.innerHTML = variables.map(function (variable) {
      var checked = !!model.signalAddSelection[variable.variable_id];
      return "<label title='" + esc(variable.name + " · " + variable.type + " · " + workspaceVariableLength(variable)) + "'><input class='ui-checkbox' type='checkbox' data-signal-add-variable value='" + esc(variable.variable_id) + "' aria-label='Добавить " + esc(variable.name) + "'" + (checked ? " checked" : "") + (model.signalAddSubmitting ? " disabled" : "") + "><span class='workspace-variable-name'><strong>" + esc(variable.name) + "</strong><small>" + esc(variable.type || "Переменная") + "</small></span><small class='workspace-variable-meta'>" + esc(workspaceVariableLength(variable)) + "</small></label>";
    }).join("");
    if (!variables.length) list.innerHTML = "<div class='signal-add-list-state'>" + (search && allVariables.length ? "Ничего не найдено." : "Поддерживаемые переменные не найдены.") + (!search ? "<button class='button button-compact' type='button' data-signal-add-retry>Повторить</button>" : "") + "</div>";
    if (model.signalAddResetScroll) { list.scrollTop = 0; model.signalAddResetScroll = false; }
    if (count) count.textContent = variables.length + (catalog && catalog.truncated && !search ? " из " + catalog.total : "") + " переменных";
    state.hidden = false;
    state.textContent = catalog && catalog.truncated && !search ? "Показаны первые 1000 совместимых переменных" : (model.signalAddCachedOpen ? "Каталог открыт из кеша" : "Только совместимые переменные");
    updateSignalAddControls();
  }

  function loadSignalAddCatalog(refresh) {
    var token = ++model.signalAddToken;
    model.signalAddCatalogError = "";
    model.signalAddLoading = true;
    renderSignalAddCatalog();
    return api.workspaceVariables(!!refresh).then(function (catalog) {
      if (token !== model.signalAddToken) return;
      model.signalAddLoading = false;
      model.signalAddCatalog = catalog;
      model.signalAddCachedOpen = false;
      model.signalAddResetScroll = true;
      if (signalAddLayer() && !signalAddLayer().hidden) renderSignalAddCatalog();
    }).catch(function (caught) {
      if (token !== model.signalAddToken) return;
      model.signalAddLoading = false;
      model.signalAddCatalogError = safeErrorText(caught, "Не удалось получить переменные рабочей области.");
      if (signalAddLayer() && !signalAddLayer().hidden) renderSignalAddCatalog();
    });
  }

  function signalAddCatalogFresh() {
    var expires = model.signalAddCatalog && Date.parse(model.signalAddCatalog.expires_at || "");
    return !!(expires && expires > Date.now());
  }

  function openSignalAddDialog(trigger) {
    var layer = signalAddLayer();
    if (!layer || !layer.hidden) return;
    closeColumnMenu(false);
    model.signalAddTrigger = trigger;
    model.signalAddSubmitting = false;
    model.signalAddSearch = "";
    model.signalAddSelection = {};
    model.signalAddCatalogError = "";
    model.signalAddResetScroll = true;
    layer.hidden = false;
    q("[data-testid='app-shell']").inert = true;
    trigger.setAttribute("aria-expanded", "true");
    var rate = layer.querySelector("[data-signal-add-sample-rate]");
    if (rate) rate.value = "2048";
    layer.querySelector("[data-signal-add-submit]").textContent = "Добавить";
    if (signalAddCatalogFresh()) { model.signalAddCachedOpen = true; renderSignalAddCatalog(); }
    else { model.signalAddCachedOpen = false; loadSignalAddCatalog(false); }
    layer.querySelector("#signal-add-title").focus();
  }

  function closeSignalAddDialog(restoreFocus) {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    q("[data-testid='app-shell']").inert = false;
    var trigger = q("[data-testid='signals-add-action']") || model.signalAddTrigger;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
    model.signalAddTrigger = null;
    model.signalAddLoading = false;
    model.signalAddSubmitting = false;
  }

  function submitSignalAddDialog() {
    var layer = signalAddLayer(), catalog = model.signalAddCatalog;
    if (!layer || layer.hidden || !catalog || model.signalAddSubmitting) return;
    var selected = signalAddSelected(), rate = signalAddRateResult();
    if (!selected.length || selected.some(function (variable) { return variable.sample_rate_requirement === "required"; }) && (!rate.valid || rate.value <= 0)) return updateSignalAddControls();
    var selections = selected.map(function (variable) { return { variable_id:variable.variable_id, sample_rate_hz:variable.sample_rate_requirement === "required" ? rate.value : null }; });
    model.signalAddSubmitting = true;
    var submit = layer.querySelector("[data-signal-add-submit]");
    var error = layer.querySelector("[data-testid='signal-add-error']");
    submit.textContent = "Добавление…";
    error.hidden = true;
    updateSignalAddControls();
    mutate(function () { return api.signals({ state_revision:model.revision, operation:"import_workspace_batch", catalog_revision:catalog.catalog_revision, selections:selections }); }).then(function () {
      model.signalAddSubmitting = false;
      closeSignalAddDialog(true);
      showToast("Добавлено сигналов: " + selections.length, false);
    }).catch(function (caught) {
      model.signalAddSubmitting = false;
      submit.textContent = "Добавить";
      error.hidden = false;
      error.textContent = safeErrorText(caught, "Не удалось добавить выбранные сигналы.");
      updateSignalAddControls();
    });
  }

  function renderColumnMenu() {
    var menu = q("[data-testid='signal-columns-menu']");
    if (!menu) return;
    menu.innerHTML = "<div class='inspector-menu-title'>Видимость столбцов</div>" +
      [{id:"color",label:"Цвет"},{id:"sample_rate",label:"Частота дискретизации"},{id:"sample_count",label:"Отсчёты"},{id:"duration",label:"Длительность"},{id:"data_type",label:"Тип"}].map(function (column) {
        var visible = model.visibleColumns[column.id]; return "<button type='button' role='menuitemcheckbox' aria-pressed='" + visible + "' aria-checked='" + visible + "' data-column-visible='" + column.id + "'><span>" + column.label + "</span><img src='" + (visible ? "./icons/eye.svg" : "./icons/eye-off.svg") + "' alt=''></button>";
      }).join("");
  }

  function renderMeasurementMenu() {
    var menu = q("[data-testid='measurement-columns-menu']"), display = activeDisplay();
    if (!menu) return;
    var selected = display && Array.isArray(display.measurement_kinds) ? display.measurement_kinds : [];
    menu.innerHTML = "<div class='inspector-menu-title'>Видимость измерений</div>" + measurementOptions.map(function (measurement) {
      var visible = selected.indexOf(measurement.id) >= 0;
      return "<button type='button' role='menuitemcheckbox' aria-pressed='" + visible + "' aria-checked='" + visible + "' data-measurement-visible='" + measurement.id + "'><span>" + measurement.label + "</span><img src='" + (visible ? "./icons/eye.svg" : "./icons/eye-off.svg") + "' alt=''></button>";
    }).join("");
  }

  function updateMeasurementKinds(measurementKinds) {
    var display = activeDisplay(), targetDisplayId = display && display.id;
    if (!display) return Promise.reject(new Error("Активный экран не найден."));
    return mutate(function () {
      if (!activeDisplay() || activeDisplay().id !== targetDisplayId) return Promise.reject(new Error("Контекст экрана изменился; повторите действие."));
      return api.view({ state_revision:model.revision, measurement_kinds:measurementKinds });
    }, { preservePlots:true, skipOutput:true });
  }

  function positionMenu(menu, trigger, width) {
    if (!menu || !trigger || menu.hidden) return;
    var rect = trigger.getBoundingClientRect();
    var viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    var viewportHeight = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight, window.visualViewport ? window.visualViewport.height : window.innerHeight);
    var left = Math.min(viewportWidth - width - 8, Math.max(8, rect.right - width));
    menu.style.width = width + "px";
    menu.style.left = left + "px";
    menu.style.top = rect.bottom + 4 + "px";
    window.requestAnimationFrame(function () {
      if (menu.hidden) return;
      var menuRect = menu.getBoundingClientRect();
      if (menuRect.bottom > viewportHeight - 8) menu.style.top = Math.max(8, rect.top - menuRect.height - 4) + "px";
    });
  }

  function closeExtremaModeMenu(restoreFocus) {
    valueSelect.close(restoreFocus);
  }
  function chooseExtremaMode(mode) {
    if (!model.peaksDraft || ["maxima", "minima", "all"].indexOf(mode) < 0) return;
    if (model.peaksDraft.values.mode === mode) return;
    model.peaksDraft.values.mode = mode;
    model.peaksDraft.intent = (model.peaksDraft.intent || 0) + 1;
    if (model.peaksApplying) model.peaksApplyQueued = true;
    renderPeaksSettings(activeDisplay(), paneById(model.activePane), model.peaksRecords[peaksSettingsKey(activeDisplay(), paneById(model.activePane))]);
    renderApply();
  }

  function closeColumnMenu(restoreFocus) {
    var menu = q("[data-testid='signal-columns-menu']"), trigger = q("[data-testid='signal-columns-menu-trigger']");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
  }

  function closeMeasurementMenu(restoreFocus) {
    var menu = q("[data-testid='measurement-columns-menu']"), trigger = q("[data-testid='measurement-columns-menu-trigger']");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menu.classList.remove("is-stale");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
  }

  function paneHasSignals(pane) { return !!(pane && Array.isArray(pane.signal_bindings) && pane.signal_bindings.length); }
  function stopPaneOutput(displayId, paneId) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    model.outputTokens[runtimeKey] = (model.outputTokens[runtimeKey] || 0) + 1;
    window.clearTimeout(model.pollByPane[runtimeKey]);
    delete model.pollByPane[runtimeKey];
    delete model.plotQueue[runtimeKey];
    delete model.outputs[runtimeKey];
  }
  function output(poll) {
    var display = activeDisplay();
    if (!display) return;
    panes().forEach(function (pane) {
      if (paneHasSignals(pane)) fetchPaneOutput(display.id, pane.id, poll);
      else stopPaneOutput(display.id, pane.id);
    });
  }
  function nextOutputPollDelay(delay) {
    if (delay < 100) return 100;
    if (delay < 200) return 200;
    return 350;
  }
  function schedulePaneOutputPoll(displayId, paneId, delay) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var currentDelay = typeof delay === "number" ? delay : 50;
    model.pollByPane[runtimeKey] = window.setTimeout(function () {
      fetchPaneOutput(displayId, paneId, true, nextOutputPollDelay(currentDelay));
    }, currentDelay);
  }
  function fetchPaneOutput(displayId, paneId, poll, pollDelay) {
    var display = activeDisplay();
    var pane = paneById(paneId);
    if (!display || display.id !== displayId || !pane) return;
    if (!paneHasSignals(pane)) { stopPaneOutput(displayId, paneId); return; }
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var token = (model.outputTokens[runtimeKey] || 0) + 1;
    model.outputTokens[runtimeKey] = token;
    window.clearTimeout(model.pollByPane[runtimeKey]);
    api.activeOutput(display.id, pane.id).then(function (response) {
      var prior = model.outputs[runtimeKey];
      var currentPane = paneById(paneId);
      if (!activeDisplay() || activeDisplay().id !== displayId || token !== model.outputTokens[runtimeKey] || !paneHasSignals(currentPane) || (stateRevision(response) !== null && stateRevision(response) < model.revision) || response.display_id !== display.id || response.pane_id !== pane.id || response.plot_type !== currentPane.plot_type || (prior && prior.context_key && response.context_key !== prior.context_key && response.calculation_revision < prior.calculation_revision)) return;
      model.revision = Math.max(model.revision, stateRevision(response) || model.revision);
      if (!response.isready && prior && prior.output && prior.output.isready && prior.output.success) {
        if (poll) schedulePaneOutputPoll(displayId, paneId, pollDelay);
        return;
      }
      model.outputs[runtimeKey] = { context_key: response.context_key, calculation_revision: response.calculation_revision, output: { isready: response.isready, success: response.success, error: response.error, data: response.data } };
      scheduleRender();
      if (!response.isready && poll) schedulePaneOutputPoll(displayId, paneId, pollDelay);
      if (response.isready && response.success) completePendingApply();
    }).catch(function (error) {
      if (activeDisplay() && activeDisplay().id === displayId && token === model.outputTokens[runtimeKey] && paneHasSignals(paneById(paneId))) {
        model.outputs[runtimeKey] = { output: { isready: true, success: false, error: error.message || "Не удалось загрузить график." } };
        scheduleRender();
      }
    });
  }

  function refreshSnapshot(renderAccepted) { return api.getState().then(function (snapshot) { if (!accept(snapshot)) throw new Error("Получен устаревший снимок состояния."); (renderAccepted || scheduleRender)(); return snapshot; }); }
  function mutate(call, options) {
    var retried = false;
    var renderAccepted = options && options.preservePlots ? renderActivePaneContext : scheduleRender;
    function acceptMutation(response) {
      var snapshot = response && response.state ? response.state : response;
      if (!accept(snapshot)) return refreshSnapshot(renderAccepted);
      renderAccepted();
      return snapshot;
    }
    function attempt() {
      return call().then(acceptMutation).catch(function (error) {
        if (retried || error.status !== 409 || !error.payload || !error.payload.current) throw error;
        retried = true;
        var current = error.payload.current.state || error.payload.current;
        return (accept(current) ? Promise.resolve(current) : refreshSnapshot(renderAccepted)).then(function () { renderAccepted(); return attempt(); });
      });
    }
    return attempt().then(function (snapshot) {
      if (!options || !options.skipSettings) settings.load().catch(function () {});
      if (!options || !options.skipOutput) {
        if (options && options.outputPaneId) {
          var outputDisplay = activeDisplay(), outputPane = paneById(options.outputPaneId);
          if (outputDisplay && outputPane && paneHasSignals(outputPane)) fetchPaneOutput(outputDisplay.id, outputPane.id, true, 50);
          else if (outputDisplay) stopPaneOutput(outputDisplay.id, options.outputPaneId);
        } else output(true);
      }
      if (model.inspectorPage === "measurements") loadMeasurements();
      return snapshot;
    });
  }
  function postLayout(payload, options) {
    var targetDisplayId = activeDisplay() && activeDisplay().id;
    var mutationOptions = Object.assign({}, options || {});
    if (payload.operation === "update_pane") {
      var previousPane = paneById(payload.pane_id);
      var plotTypeChanged = !previousPane || previousPane.plot_type !== payload.plot_type;
      var hadSignals = paneHasSignals(previousPane);
      var willHaveSignals = Array.isArray(payload.signal_bindings) && payload.signal_bindings.length > 0;
      mutationOptions.outputPaneId = payload.pane_id;
      mutationOptions.skipSettings = !plotTypeChanged;
      mutationOptions.preservePlots = hadSignals && willHaveSignals;
    }
    var request = Object.assign({ display_id:targetDisplayId, version:1 }, payload);
    return mutate(function () {
      if (!targetDisplayId || !activeDisplay() || activeDisplay().id !== targetDisplayId) {
        var error = new Error("Контекст экрана изменился; повторите действие.");
        error.code = "display_context_changed";
        return Promise.reject(error);
      }
      return api.layouts(Object.assign({}, request, { state_revision:model.revision }));
    }, mutationOptions).then(function (snapshot) {
      if (peaksSurfaceActive()) loadPeaks();
      return snapshot;
    });
  }

  function showToast(copy, warning) {
    var toast = q("[data-testid='layout-toast']");
    if (!toast) return;
    toast.hidden = false;
    toast.classList.toggle("is-warning", !!warning);
    toast.querySelector("[data-toast-copy]").textContent = copy;
    window.clearTimeout(model.toastTimer);
    model.toastTimer = window.setTimeout(function () { toast.hidden = true; }, 3500);
  }

  function applySettings() {
    var footer = q("[data-testid='settings-footer']");
    var state = settings.state();
    if (!footer || state.invalid || !state.dirty) return;
    var displayId = activeDisplay() && activeDisplay().id;
    if (!displayId) return;
    footer.dataset.phase = "applying";
    footer.dataset.loaderEpisodeKey = "settings-display::" + displayId + "::" + String(model.activePane || "") + "::" + String(model.revision);
    footer.dataset.message = "Применяем сохранённый черновик";
    renderApply();
    function applyLatest(retries) {
      if (!activeDisplay() || activeDisplay().id !== displayId) return Promise.reject(new Error("Контекст экрана изменился; повторите действие."));
      return api.applySettings({ state_revision: settings.state().revision, display_id: displayId }).catch(function (error) {
        var current = error && error.payload && (error.payload.current || error.payload.state);
        if (error && error.status === 409 && retries < 1 && current) {
          if (accept(current)) renderActivePaneContext();
          else if (typeof current.state_revision === "number") {
            model.revision = Math.max(model.revision, current.state_revision);
            settings.setRevision(current.state_revision);
          }
          return applyLatest(retries + 1);
        }
        throw error;
      });
    }
    settings.flush().then(function () { return applyLatest(0); }).then(function (result) {
      if (result.success === false) throw new Error(result.error || "Сервер отклонил настройки.");
      model.revision = Math.max(model.revision, result.state_revision || model.revision);
      footer.dataset.phase = "pending";
      footer.dataset.message = "Обновляется активная область";
      renderApply();
      output(true);
    }).catch(function (error) {
      footer.dataset.phase = error.status === 409 ? "stale" : "error";
      footer.dataset.message = error.message || "Не удалось применить настройки.";
      renderApply();
      showToast(footer.dataset.message, true);
    });
  }

  function renderLayoutDraft() {
    var draft = model.layoutDraft;
    ["rows", "columns"].forEach(function (axis) {
      var holder = q("[data-layout-" + axis + "]");
      holder.innerHTML = Array.from({ length: 10 }, function (_, index) {
        var value = index + 1;
        return "<button class='segment" + (draft[axis] === value ? " is-selected" : "") + "' type='button' data-layout-" + axis + "='" + value + "' aria-pressed='" + (draft[axis] === value) + "'>" + value + "</button>";
      }).join("");
    });
    var preview = q(".layout-preview");
    preview.style.gridTemplateColumns = "repeat(" + draft.columns + ", minmax(0, 1fr))";
    preview.style.gridTemplateRows = "repeat(" + draft.rows + ", minmax(0, 1fr))";
    preview.innerHTML = Array.from({ length:draft.rows * draft.columns }, function () { return "<i></i>"; }).join("");
    q("[data-layout-warning]").hidden = draft.rows <= 4 && draft.columns <= 4;
    var linkTime = q("[data-layout-link-time]");
    if (linkTime) linkTime.checked = !!draft.linkTime;
    var linkAmplitude = q("[data-layout-link-amplitude]");
    if (linkAmplitude) linkAmplitude.checked = !!draft.linkAmplitude;
  }
  function repositionLayout() {
    var popover = q("[data-testid='layout-popover']"), trigger = q("[data-testid='layout-trigger']");
    if (!popover || !trigger || popover.hidden) return;
    var rect = trigger.getBoundingClientRect(), width = popover.offsetWidth, height = popover.offsetHeight;
    popover.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width)) + "px";
    popover.style.top = Math.min(window.innerHeight - height - 8, Math.max(8, rect.bottom + 6)) + "px";
  }
  function openLayout(trigger) {
    if (!model.layout) return;
    if (model.layoutDraft) return closeLayout();
    model.layoutDraft = {
      rows:model.layout.rows,
      columns:model.layout.columns,
      linkTime:!!settings.value("time.link_time"),
      initialLinkTime:!!settings.value("time.link_time"),
      linkAmplitude:!!settings.value("time.link_amplitude"),
      initialLinkAmplitude:!!settings.value("time.link_amplitude"),
      trigger:trigger
    };
    renderLayoutDraft();
    q("[data-testid='layout-popover']").hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    repositionLayout();
    var close = q("[data-layout-close]");
    if (close) close.focus();
  }
  function closeLayout() {
    var popover = q("[data-testid='layout-popover']");
    var trigger = model.layoutDraft && model.layoutDraft.trigger;
    popover.hidden = true;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
    model.layoutDraft = null;
  }

  function persistLayoutLinks(draft) {
    var result = Promise.resolve();
    if (draft.linkTime !== draft.initialLinkTime) result = result.then(function () { return settings.setValue("time.link_time", draft.linkTime); });
    if (draft.linkAmplitude !== draft.initialLinkAmplitude) result = result.then(function () { return settings.setValue("time.link_amplitude", draft.linkAmplitude); });
    return result;
  }

  function completePendingApply() {
    var footer = q("[data-testid='settings-footer']");
    if (!footer || footer.dataset.phase !== "pending") return;
    footer.dataset.phase = "pristine";
    footer.dataset.message = "";
    settings.markApplied();
    renderApply();
    showToast("График обновлён", false);
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.testid === "toolbar-import") return void openSessionFilePicker(button);
    if (button.dataset.testid === "toolbar-save") return void openSessionSave(button);
    if (button.dataset.inspectorStateAction) return void changeWorkspaceInspectorState(button);
    if (button.dataset.testid === "display-scroll-left") return void scrollDisplayTabs(-1);
    if (button.dataset.testid === "display-scroll-right") return void scrollDisplayTabs(1);
    if (button.dataset.displaySelect) return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "select", display_id: button.dataset.displaySelect }); });
    if (button.dataset.displayClose) return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "close", display_id: button.dataset.displayClose }); });
    if (button.dataset.testid === "add-display") return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "create" }); });
    if (button.dataset.testid === "layout-trigger") return void openLayout(button);
    if (button.dataset.layoutClose !== undefined || button.dataset.layoutCancel !== undefined) return void closeLayout();
    if (button.dataset.layoutRows || button.dataset.layoutColumns) { model.layoutDraft[button.dataset.layoutRows ? "rows" : "columns"] = Number(button.dataset.layoutRows || button.dataset.layoutColumns); return void renderLayoutDraft(); }
    if (button.dataset.layoutApply !== undefined) { var draft = model.layoutDraft; var displayId = activeDisplay() && activeDisplay().id; closeLayout(); return void postLayout({ operation: "resize", variant: draft.rows + "x" + draft.columns, rows: draft.rows, columns: draft.columns }).then(function () { return persistLayoutLinks(draft); }).then(function () { if (activeDisplay() && activeDisplay().id === displayId) showToast("Макет " + draft.rows + " × " + draft.columns + " применён", false); }).catch(function (error) { showToast(error.message || "Не удалось применить макет.", true); }); }
    if (button.dataset.testid === "extrema-calculate") return void calculatePeaks();
    if (button.dataset.testid === "extrema-configure") return void configureActivePeaks();
    if (button.dataset.testid === "extrema-values") return void showActivePeaksValues();
    if (button.dataset.testid === "settings-apply") return void (model.settingsPage === "peaks" ? applyPeaksSettings() : applySettings());
    if (button.dataset.testid === "signals-add-action") return void openSignalAddDialog(button);
    if (button.dataset.signalAddClose !== undefined || button.dataset.signalAddCancel !== undefined) return void closeSignalAddDialog(true);
    if (button.dataset.signalAddRetry !== undefined) return void loadSignalAddCatalog(true);
    if (button.dataset.signalAddSubmit !== undefined) return void submitSignalAddDialog();
    if (button.dataset.signalDelete) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "delete", signal_name: button.dataset.signalDelete }); });
    if (button.dataset.signalDuplicate) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "duplicate", signal_name: button.dataset.signalDuplicate }); });
    if (button.dataset.settingsPage) { model.settingsPage = button.dataset.settingsPage; if (!peaksSurfaceActive()) stopPeaksPolling(""); renderSettings(activeDisplay()); if (model.settingsPage === "peaks") loadPeaks(); return; }
    if (button.dataset.paneMenu) return void openPaneMenu(button);
    if (button.matches("[data-plot-clear]")) return void openPaneClearConfirm();
    if (button.dataset.plotRangeSlider !== undefined) return void togglePaneRangeSlider();
    if (button.dataset.plotAmplitudeSlider !== undefined) return void togglePaneAmplitudeSlider();
    if (button.matches("[data-plot-help]")) return void (q("[data-testid='graph-help-overlay']").hidden ? openGraphHelp(button) : closeGraphHelp(true));
    if (button.dataset.graphHelpClose !== undefined) return void closeGraphHelp(true);
    if (button.dataset.paneClearCancel !== undefined) return void closePaneClearConfirm(true);
    if (button.dataset.paneClearConfirm !== undefined) return void confirmPaneClear();
    if (button.dataset.testid === "signal-columns-menu-trigger") { var columns = q("[data-testid='signal-columns-menu']"); if (!columns.hidden) return void closeColumnMenu(true); renderColumnMenu(); columns.hidden = false; button.setAttribute("aria-expanded", "true"); positionMenu(columns, button, 244); var firstColumn = columns.querySelector("button"); if (firstColumn) firstColumn.focus(); return; }
    if (button.dataset.columnVisible !== undefined) { var key = button.dataset.columnVisible; model.visibleColumns[key] = !model.visibleColumns[key]; renderInspector(); renderColumnMenu(); var menuTrigger = q("[data-testid='signal-columns-menu-trigger']"); if (menuTrigger) menuTrigger.setAttribute("aria-expanded", "true"); positionMenu(q("[data-testid='signal-columns-menu']"), menuTrigger, 244); return; }
    if (button.dataset.testid === "measurement-columns-menu-trigger") { var measurementsMenu = q("[data-testid='measurement-columns-menu']"); if (!measurementsMenu.hidden) return void closeMeasurementMenu(true); renderMeasurementMenu(); measurementsMenu.hidden = false; button.setAttribute("aria-expanded", "true"); positionMenu(measurementsMenu, button, 244); var firstMeasurement = measurementsMenu.querySelector("button"); if (firstMeasurement) firstMeasurement.focus(); return; }
    if (button.dataset.measurementVisible !== undefined) {
      var display = activeDisplay(), selected = display && Array.isArray(display.measurement_kinds) ? display.measurement_kinds.slice() : [], measurementKey = button.dataset.measurementVisible, measurementIndex = selected.indexOf(measurementKey);
      if (measurementIndex >= 0) selected.splice(measurementIndex, 1); else selected.push(measurementKey);
      var canonical = measurementOptions.map(function (measurement) { return measurement.id; }).filter(function (kind) { return selected.indexOf(kind) >= 0; });
      var measurementMenu = q("[data-testid='measurement-columns-menu']");
      measurementMenu.classList.add("is-stale");
      return void updateMeasurementKinds(canonical).then(function () {
        measurementMenu.classList.remove("is-stale");
        renderMeasurementMenu();
        var trigger = q("[data-testid='measurement-columns-menu-trigger']");
        if (trigger) trigger.setAttribute("aria-expanded", "true");
        positionMenu(measurementMenu, trigger, 244);
        var restored = measurementMenu.querySelector("[data-measurement-visible='" + measurementKey + "']");
        if (restored) restored.focus();
      }).catch(function (error) { measurementMenu.classList.remove("is-stale"); showToast(safeErrorText(error, "Не удалось изменить измерения."), true); });
    }
    if (button.dataset.bottomTab) { closeColumnMenu(false); closeMeasurementMenu(false); model.inspectorPage = button.dataset.bottomTab; if (!peaksSurfaceActive()) stopPeaksPolling(""); renderInspector(); if (model.inspectorPage === "measurements") loadMeasurements(); if (model.inspectorPage === "peaks") loadPeaks(); return; }
    if (button.dataset.toastClose !== undefined) q("[data-testid='layout-toast']").hidden = true;
  });
  document.addEventListener("click", function (event) {
    var popover = q("[data-testid='layout-popover']"), trigger = q("[data-testid='layout-trigger']");
    if (!model.layoutDraft || !popover || !trigger) return;
    var path = typeof event.composedPath === "function" ? event.composedPath() : null;
    var fallbackOutside = !popover.contains(event.target) && !trigger.contains(event.target);
    var inside = path ? path.indexOf(popover) >= 0 || path.indexOf(trigger) >= 0 : !fallbackOutside;
    if (!inside) closeLayout();
  });
  document.addEventListener("pointerdown", function (event) {
    var menu = q("[data-testid='display-overflow-menu']"), help = q("[data-testid='graph-help-overlay']");
    if (menu && !menu.hidden && !menu.contains(event.target) && (!help || help.hidden || !help.contains(event.target)) && !event.target.closest("[data-pane-menu]")) closePaneMenu(true);
    if (help && !help.hidden && !help.contains(event.target) && (!menu || menu.hidden || !menu.contains(event.target))) closeGraphHelp(true);
  });
  document.addEventListener("click", function (event) { var menu=q("[data-testid='signal-columns-menu']"),trigger=q("[data-testid='signal-columns-menu-trigger']");if(!menu||menu.hidden||!trigger)return;var path=typeof event.composedPath==="function"?event.composedPath():null;var inside=path?path.indexOf(menu)>=0||path.indexOf(trigger)>=0:menu.contains(event.target)||trigger.contains(event.target);if(!inside)closeColumnMenu(false); });
  document.addEventListener("click", function (event) { var menu=q("[data-testid='measurement-columns-menu']"),trigger=q("[data-testid='measurement-columns-menu-trigger']");if(!menu||menu.hidden||!trigger)return;var path=typeof event.composedPath==="function"?event.composedPath():null;var inside=path?path.indexOf(menu)>=0||path.indexOf(trigger)>=0:menu.contains(event.target)||trigger.contains(event.target);if(!inside)closeMeasurementMenu(false); });
  document.addEventListener("keydown", function (event) { var clearLayer=q("[data-testid='pane-clear-confirm-layer']"), help=q("[data-testid='graph-help-overlay']"), paneMenu=q("[data-testid='display-overflow-menu']"), addLayer=signalAddLayer(); if (event.key === "Escape" && model.sessionImport.open && !model.sessionImport.busy) { event.preventDefault(); closeSessionImport(true); return; } if (event.key === "Escape" && clearLayer && !clearLayer.hidden) { event.preventDefault(); closePaneClearConfirm(true); return; } if (event.key === "Escape" && help && !help.hidden) { event.preventDefault(); closeGraphHelp(true); return; } if (event.key === "Escape" && paneMenu && !paneMenu.hidden) { event.preventDefault(); closePaneMenu(true); return; } if (event.key === "Escape" && addLayer && !addLayer.hidden) { event.preventDefault(); if (model.signalAddSearch) { model.signalAddSearch=""; renderSignalAddCatalog(); var search=q("[data-signal-add-search]"); if(search)search.focus(); } else closeSignalAddDialog(true); return; } if (event.key === "Escape" && model.layoutDraft) closeLayout(); else if (event.key === "Escape" && q("[data-testid='measurement-columns-menu']") && !q("[data-testid='measurement-columns-menu']").hidden) closeMeasurementMenu(true); else if (event.key === "Escape") closeColumnMenu(true); var tab = event.target.closest && event.target.closest("[data-bottom-tab]"); if (tab && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].indexOf(event.key) >= 0) { var tabs=qa("[data-bottom-tab]"), index=tabs.indexOf(tab); if(event.key === "Home") index=0; else if(event.key === "End") index=tabs.length-1; else index=(index+(["ArrowRight","ArrowDown"].indexOf(event.key)>=0 ? 1 : -1)+tabs.length)%tabs.length; event.preventDefault(); tabs[index].click(); tabs[index].focus(); } });
  document.addEventListener("keydown", function (event) { var menu=event.target.closest && event.target.closest("[data-testid='display-overflow-menu']"); if (!menu || ["ArrowDown","ArrowUp","Home","End"].indexOf(event.key)<0) return; var items=qa("[data-testid='display-overflow-menu'] button:not(:disabled)"), current=items.indexOf(document.activeElement), next=current; if(event.key==="ArrowDown") next=(current+1+items.length)%items.length; else if(event.key==="ArrowUp") next=(current-1+items.length)%items.length; else if(event.key==="Home") next=0; else next=items.length-1; event.preventDefault(); if(items[next]) items[next].focus(); });
  document.addEventListener("keydown", function (event) { var tab=event.target.closest && event.target.closest("[data-settings-page]"); if(tab && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].indexOf(event.key)>=0){var tabs=qa("[data-settings-page]"),index=tabs.indexOf(tab);if(event.key==="Home")index=0;else if(event.key==="End")index=tabs.length-1;else index=(index+(["ArrowRight","ArrowDown"].indexOf(event.key)>=0?1:-1)+tabs.length)%tabs.length;event.preventDefault();tabs[index].click();tabs[index].focus();} });
  document.addEventListener("change", function (event) {
    var node = event.target;
    if (node.dataset.layoutLinkTime !== undefined && model.layoutDraft) { model.layoutDraft.linkTime = node.checked; return; }
    if (node.dataset.layoutLinkAmplitude !== undefined && model.layoutDraft) { model.layoutDraft.linkAmplitude = node.checked; return; }
    if (node.dataset.testid === "native-local-file-input" || node.dataset.testid === "session-package-file-input") { readSessionDocument(node.files && node.files[0]); return; }
    if (node.dataset.visibleAllSignals !== undefined) { var allPane = paneById(model.activePane); if (allPane) return void postLayout({ operation:"update_pane", pane_id:allPane.id, plot_type:allPane.plot_type, signal_bindings:node.checked ? (model.state.signals || []).map(function (signal) { return signal.name; }) : [] }); }
    if (node.dataset.visibleSignal) { var activePane = paneById(model.activePane), bindings = activePane && Array.isArray(activePane.signal_bindings) ? activePane.signal_bindings.slice() : [], index = bindings.indexOf(node.dataset.visibleSignal); if (node.checked && index < 0) bindings.push(node.dataset.visibleSignal); if (!node.checked && index >= 0) bindings.splice(index, 1); if (activePane) return void postLayout({ operation:"update_pane", pane_id:activePane.id, plot_type:activePane.plot_type, signal_bindings:bindings }); }
  });
  document.addEventListener("click", function (event) { if (event.target.closest("[data-value-select-key]")) return; var pane = event.target.closest("[data-pane-id]"); if (pane && pane.dataset.paneId !== model.activePane) postLayout({ operation: "select_pane", pane_id: pane.dataset.paneId }, { preservePlots:true, skipOutput:true }); });
  document.addEventListener("input", function (event) { if (event.target.dataset.testid === "signal-search-input") { model.inspectorSearch=event.target.value; renderInspector(); } if (event.target.dataset.testid === "measurement-search-input") { model.measurementSearch=event.target.value; renderInspector(); } if (event.target.dataset.peaksSetting && model.peaksDraft && event.target.tagName !== "SELECT") { var input=event.target; model.peaksDraft.values[input.dataset.peaksSetting]=input.value; model.peaksDraft.intent=(model.peaksDraft.intent || 0) + 1; if (model.peaksApplying) model.peaksApplyQueued=true; renderPeaksSettings(activeDisplay(), paneById(model.activePane), model.peaksRecords[peaksSettingsKey(activeDisplay(), paneById(model.activePane))], { id:input.dataset.peaksSetting, start:input.selectionStart, end:input.selectionEnd }); renderApply(); } });
  document.addEventListener("change", function (event) { if (event.target.dataset.signalAddVariable !== undefined) { model.signalAddSelection[event.target.value]=event.target.checked; updateSignalAddControls(); } if (event.target.dataset.peaksSetting && model.peaksDraft && event.target.tagName === "SELECT") { var select=event.target; model.peaksDraft.values[select.dataset.peaksSetting]=select.value; model.peaksDraft.intent=(model.peaksDraft.intent || 0) + 1; if (model.peaksApplying) model.peaksApplyQueued=true; renderPeaksSettings(activeDisplay(), paneById(model.activePane), model.peaksRecords[peaksSettingsKey(activeDisplay(), paneById(model.activePane))], { id:select.dataset.peaksSetting }); renderApply(); } });
  document.addEventListener("input", function (event) { if (event.target.dataset.signalAddSampleRate !== undefined) updateSignalAddControls(); if (event.target.dataset.signalAddSearch !== undefined) { model.signalAddSearch=event.target.value; model.signalAddResetScroll=true; renderSignalAddCatalog(); var search=q("[data-signal-add-search]"); if(search){search.focus();search.setSelectionRange(model.signalAddSearch.length,model.signalAddSearch.length);} } });
  window.addEventListener("signal-apply-state", renderApply);
  window.addEventListener("signal-settings-saved", function (event) { var revision = event.detail && event.detail.state && event.detail.state.state_revision; if (typeof revision === "number") model.revision = Math.max(model.revision, revision); });
  window.addEventListener("signal-settings-plot-type", function (event) {
    var pane = paneById(model.activePane), plotType = event.detail && event.detail.plotType;
    if (pane && titles[plotType] && pane.plot_type !== plotType) postLayout({ operation:"update_pane", pane_id:pane.id, plot_type:plotType, signal_bindings:pane.signal_bindings || [] });
  });
  q("[data-testid='display-tabs']").addEventListener("scroll", function () { scheduleDisplayTabScrollUpdate(false); }, { passive: true });
  var workspaceSplitter = q("[data-testid='workspace-inspector-splitter']");
  if (workspaceSplitter) {
    workspaceSplitter.addEventListener("pointerdown", startWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("pointermove", moveWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("pointerup", stopWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("pointercancel", stopWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("lostpointercapture", stopWorkspaceSplitDrag);
  }
  renderWorkspaceInspectorState();
  window.addEventListener("resize", function () { scheduleDisplayTabScrollUpdate(false); });
  window.addEventListener("resize", retainWorkspaceSplitOnResize);
  window.addEventListener("resize", repositionLayout);
  window.addEventListener("resize", function () { positionMenu(q("[data-testid='signal-columns-menu']"), q("[data-testid='signal-columns-menu-trigger']"), 244); positionMenu(q("[data-testid='measurement-columns-menu']"), q("[data-testid='measurement-columns-menu-trigger']"), 244); positionPaneMenu(); if (q("[data-testid='graph-help-overlay']") && !q("[data-testid='graph-help-overlay']").hidden && model.graphHelpRestoreTarget) openGraphHelp(model.graphHelpRestoreTarget); });
  if (window.ResizeObserver) {
    model.displayTabsObserver = new window.ResizeObserver(function () { scheduleDisplayTabScrollUpdate(false); });
    model.displayTabsObserver.observe(q("[data-testid='display-tabs-wrap']"));
  }

  function safeErrorText(error, fallback) {
    if (error && typeof error.message === "string" && error.message) return error.message;
    if (error && error.payload && typeof error.payload.message === "string") return error.payload.message;
    if (error && error.payload && error.payload.error && typeof error.payload.error.message === "string") return error.payload.error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
  }
  function showBootstrapError(error) {
    var target = q("[data-testid='app-error']");
    var copy = q("[data-error-text]");
    if (!target || !copy) return;
    copy.textContent = safeErrorText(error, "Не удалось загрузить анализатор.");
    target.hidden = false;
  }
  function showSettingsLoadError(error) {
    var footer = q("[data-testid='settings-footer']");
    if (!footer) return;
    footer.dataset.phase = "error";
    footer.dataset.message = safeErrorText(error, "Не удалось загрузить настройки.");
    renderApply();
  }

  document.addEventListener("native-session-imported", function (event) {
    var snapshot=event && event.detail;
    if (!accept(snapshot)) return;
    render();
    output(true);
    settings.load().then(render).catch(showSettingsLoadError);
  });

  refreshSnapshot().then(function () {
    render();
    output(true);
    return settings.load().then(function () { render(); }).catch(showSettingsLoadError).then(schedulePlotlyIdlePreload);
  }).catch(showBootstrapError);
})(window, document);
