(function () {
  "use strict";
  var provider = {};
  var state = null;
  var autosaveTimer = null;

  function render() {
    window.SignalAnalyserZones.workspace.render(state);
    window.SignalAnalyserZones.settings.render(state);
    window.SignalAnalyserZones.inspector.render(state);
    document.documentElement.dataset.designReady = "true";
  }

  function activeDisplay() { return window.SignalAnalyserZones.workspace.activeDisplay(state); }
  function activePane() { var display = activeDisplay(); return display.panes.find(function (pane) { return pane.id === state.activePaneId; }) || display.panes[0]; }
  function previewName(kind, value) {
    var display=activeDisplay(), pane=activePane();
    if (kind === "display" && display) {
      display.name=value;
      document.querySelectorAll("[data-display-id]").forEach(function (tab) { if (tab.dataset.displayId === display.id) { var label=tab.querySelector("span"); if (label) label.textContent=value; } });
    }
    if (kind === "pane" && pane) {
      pane.name=value;
      document.querySelectorAll("[data-pane-id]").forEach(function (host) { if (host.dataset.paneId === pane.id) { var label=host.querySelector(".plot-pane-name"); if (label) label.textContent=value; } });
    }
    var context=document.querySelector("[data-settings-context]");
    if (context) context.textContent=(display && display.name || "Экран") + " · " + (pane && pane.name || "Нет области");
  }
  function dirty() {
    state.dirty = true;
    document.querySelector("[data-testid='settings-panel']").dataset.applyState = "dirty";
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      Promise.resolve(provider.onApply ? provider.onApply(state) : null).then(function () {
        state.dirty = false;
        render();
      });
    }, 150);
  }

  function calculateExtrema() {
    var helper=window.SignalAnalyserExtremaAction, display=activeDisplay(), pane=activePane();
    if (!helper || !display || !pane) return;
    var activation=helper.activation(state.extremaCalculationStatus,function () { return state.currentExtremaViewport || null; });
    if (!activation) return;
    var context=helper.context(display.id,pane.id);
    var request={displayId:context.displayId,paneId:context.paneId,contextKey:context.key,visibleRange:activation.visible_range};
    state.extremaCalculationStatus="pending";
    render();
    helper.providerRequest(provider,request,function (result,settledRequest) {
      if (!result || settledRequest.contextKey !== request.contextKey) return;
      if (Array.isArray(result.rows)) state.extrema=result.rows;
      if (result.paneExtrema && typeof result.paneExtrema === "object") Object.assign(pane,result.paneExtrema);
      state.extremaCalculationStatus=result.status || (state.extrema.length ? "ready" : "empty");
      render();
    });
  }

  function clearExtrema() {
    var helper=window.SignalAnalyserPaneExtrema, display=activeDisplay(), pane=activePane();
    if (!helper || !display || !pane) return;
    if (helper.clearPresentation(pane,state.extremaCalculationStatus === "pending").disabled) return;
    var request={displayId:String(display.id),paneId:String(pane.id)};
    helper.providerClear(provider,request,function (result) {
      if (!result || result.success === false) return;
      pane.extremaBySignal={};
      pane.isExtremaReady=false;
      pane.success=false;
      pane.error="";
      pane.needUpdate=true;
      state.extrema=[];
      state.extremaCalculationStatus="cleared";
      render();
    });
  }

  function bind() {
    window.addEventListener("signal-analyser:pane-type", function (event) {
      var detail=event.detail || {};
      var display=activeDisplay();
      var changedPane=display.panes.find(function (item) { return item.id === detail.paneId; });
      if (!changedPane) return;
      changedPane.type=detail.value;
      state.activePaneId=detail.paneId;
      state.settingsPage="display";
      render();
      document.querySelector("[data-testid='settings-tab-display']").focus();
    });
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!document.querySelector("[data-testid='signal-operation-layer']").hidden && window.SignalAnalyserDialogs.signalOperation.click(target, provider)) return;
      var displayTab = target.closest("[data-display-id]");
      if (displayTab) { state.activeDisplayId = displayTab.dataset.displayId; var display = activeDisplay(); state.activePaneId = display.panes[0] ? display.panes[0].id : ""; state.settingsPage="screen"; render(); document.querySelector("[data-testid='settings-tab-screen']").focus(); return; }
      var closeDisplay = target.closest("[data-close-display]");
      if (closeDisplay && state.displays.length > 1) {
        var closing = closeDisplay.dataset.closeDisplay;
        state.displays = state.displays.filter(function (display) { return display.id !== closing; });
        if (state.activeDisplayId === closing) { state.activeDisplayId = state.displays[0].id; state.activePaneId = state.displays[0].panes[0] ? state.displays[0].panes[0].id : ""; }
        render(); return;
      }
      if (target.closest("[data-testid='add-display']")) {
        var ordinal = state.nextDisplayOrdinal || 1;
        state.nextDisplayOrdinal = ordinal + 1;
        state.displays.push({ id: "display-new-" + ordinal, name: "Экран " + ordinal, panes: [] });
        state.activeDisplayId = "display-new-" + ordinal; state.activePaneId = ""; state.settingsPage="screen"; render(); document.querySelector("[data-testid='settings-tab-screen']").focus(); return;
      }
      var pane = target.closest("[data-pane-id]");
      if (pane) { state.activePaneId = pane.dataset.paneId; state.settingsPage="display"; render(); document.querySelector("[data-testid='settings-tab-display']").focus(); return; }
      var settingTab = target.closest("[data-settings-page]");
      if (settingTab) { state.settingsPage = settingTab.dataset.settingsPage; render(); return; }
      var inspectorTab = target.closest("[data-inspector-page]");
      if (inspectorTab) { state.inspectorPage = inspectorTab.dataset.inspectorPage; render(); return; }
      var signalRow=target.closest("[data-signal-row]");
      if (signalRow && !target.closest("input,button,a,[role='button'],.signal-row-actions")) {
        var signal=state.signals.find(function (item) { return item.name === signalRow.dataset.signalRow; });
        if (signal) {
          signal.visible=true;
          state.mainSignalName=signal.name; state.signal.name=signal.name; state.signal.color=signal.color; state.signal.sampleRate=signal.sampleRate.replace(/\s*МГц$/u, "000000");
          render();
        }
        return;
      }
      var toggle = target.closest("[data-group-toggle]");
      if (toggle) { var section = toggle.closest(".settings-group"); section.classList.toggle("is-collapsed"); toggle.setAttribute("aria-expanded", String(!section.classList.contains("is-collapsed"))); return; }
      var values = target.closest("[data-testid='signal-values-action']");
      if (values) { state.inspectorPage = "samples"; render(); document.querySelector("[data-inspector-page='samples']").focus(); return; }
      if (target.closest("[data-extrema-clear]")) { clearExtrema(); return; }
      if (target.closest("[data-extrema-action]")) { state.inspectorPage = "peaks"; calculateExtrema(); var extremaTab=document.querySelector("[data-inspector-page='peaks']"); if (extremaTab) extremaTab.focus(); return; }
      if (target.closest("[data-extrema-configure]")) { state.settingsPage="peaks"; render(); var settingsTab=document.querySelector("[data-settings-page='peaks']"); if(settingsTab) settingsTab.focus(); return; }
      var operation = target.closest("[data-signal-operation]");
      if (operation) { window.SignalAnalyserDialogs.signalOperation.open({id:state.mainSignalName,name:state.mainSignalName,samplingKind:"uniform",sampleRateHz:Number(state.signal.sampleRate) || null,sampleCount:Number(state.signal.samples) || null,complex:state.signal.type === "Комплексный"}); return; }
    });
    document.addEventListener("change", function (event) {
      var signalVisibility = event.target.closest("[data-signal-visible]");
      if (signalVisibility) {
        var changedSignal=state.signals.find(function (item) { return item.name === signalVisibility.dataset.signalVisible; });
        if (changedSignal) changedSignal.visible=signalVisibility.checked;
        render();
        return;
      }
      var input = event.target.closest("[data-setting-toggle]");
      if (!input) return;
      var key = input.dataset.settingToggle;
      if (Object.prototype.hasOwnProperty.call(state.links, key)) state.links[key] = input.checked;
      else if (key === "frequencySlider") activePane().frequencySlider = input.checked;
      else if (key === "magnitudeSlider") activePane().magnitudeSlider = input.checked;
      dirty(); render();
    });
    document.addEventListener("input", function (event) {
      if (event.target.matches("[data-display-name]")) previewName("display", event.target.value);
      if (event.target.matches("[data-pane-name]")) previewName("pane", event.target.value);
      if (event.target.matches("[data-signal-sample-rate]") && window.SignalAnalyserTask0119) {
        var valid = window.SignalAnalyserTask0119.validateSampleRate(event.target.value).valid;
        event.target.setAttribute("aria-invalid", String(!valid));
        var message = document.getElementById("signal-sample-rate-error");
        if (message) message.hidden = valid;
      }
      if (event.target.matches("[data-dirty-input]")) dirty();
    });
    document.addEventListener("keydown", function (event) { if (event.defaultPrevented) return; if (event.key === "Escape" && !document.querySelector("[data-testid='signal-operation-layer']").hidden) window.SignalAnalyserDialogs.signalOperation.close(); });
  }

  function init(nextProvider, initialState) {
    provider = nextProvider || {};
    return Promise.resolve(initialState !== undefined ? initialState : (provider.getState ? provider.getState() : null)).then(function (nextState) {
      state = nextState || { activeDisplayId: "display-1", activePaneId: "", settingsPage: "screen", inspectorPage: "signals", dynamicSamplesOpen: false, dirty: false, extremaCalculationStatus:"idle", displays: [{ id: "display-1", name: "Экран 1", panes: [] }], links: { time:false, amplitude:false, spectrumFrequency:false, spectrumMagnitude:false }, signal: { name:"", color:"#2563eb", sampleRate:"", samples:0, duration:"—", regionStart:"—", regionEnd:"—", minimum:"—", minimumTime:"—", maximum:"—", maximumTime:"—", rms:"—", mean:"—", median:"—", peakToPeak:"—", type:"—" }, signals:[], extrema:[], sampleRows:[] };
      bind(); render();
      window.SignalAnalyserDesignReview = {
        getState: function () { return state; },
        show: function (surface) {
          if (surface === "signal") state.settingsPage = "signal";
          if (surface === "spectrum") state.settingsPage = "display";
          if (surface === "screen") state.settingsPage = "screen";
          if (surface === "extrema") { state.settingsPage = "peaks"; state.inspectorPage = "peaks"; }
          if (surface === "samples") state.inspectorPage = "samples";
          if (surface === "operation" || surface === "preprocess") { state.inspectorPage = "signals"; render(); window.SignalAnalyserDialogs.signalOperation.open({id:state.mainSignalName,name:state.mainSignalName,samplingKind:"uniform",sampleRateHz:Number(state.signal.sampleRate) || null,sampleCount:Number(state.signal.samples) || null,complex:state.signal.type === "Комплексный"}); return; }
          render();
        }
      };
    });
  }
  window.SignalAnalyserUI = { init: init };
}());
