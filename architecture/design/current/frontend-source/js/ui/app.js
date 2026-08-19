(function () {
  "use strict";
  var provider = {};
  var state = null;

  function render() {
    window.SignalAnalyserZones.workspace.render(state);
    window.SignalAnalyserZones.settings.render(state);
    window.SignalAnalyserZones.inspector.render(state);
    document.documentElement.dataset.designReady = "true";
  }

  function activeDisplay() { return window.SignalAnalyserZones.workspace.activeDisplay(state); }
  function activePane() { var display = activeDisplay(); return display.panes.find(function (pane) { return pane.id === state.activePaneId; }) || display.panes[0]; }
  function dirty() { state.dirty = true; document.querySelector("[data-testid='settings-apply']").disabled = false; document.querySelector("[data-testid='settings-panel']").dataset.applyState = "dirty"; }

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
      if (target.closest("[data-testid='extrema-values']")) { state.inspectorPage = "peaks"; render(); document.querySelector("[data-inspector-page='peaks']").focus(); return; }
      var operation = target.closest("[data-signal-operation]");
      if (operation) { window.SignalAnalyserDialogs.signalOperation.open(operation.dataset.signalOperation); return; }
      var apply = target.closest("[data-testid='settings-apply']");
      if (apply && !apply.disabled) {
        var displayName = document.querySelector("[data-display-name]"); if (displayName) activeDisplay().name = displayName.value.trim() || activeDisplay().name;
        var paneName = document.querySelector("[data-pane-name]"); if (paneName) activePane().name = paneName.value.trim() || activePane().name;
        var signalName = document.querySelector("[data-signal-name]"); if (signalName) state.signal.name = signalName.value.trim() || state.signal.name;
        var signalColor = document.querySelector("[data-signal-color-input]"); if (signalColor) state.signal.color = signalColor.value;
        var sampleRate = document.querySelector("[data-signal-sample-rate]");
        if (sampleRate && window.SignalAnalyserTask0119 && !window.SignalAnalyserTask0119.validateSampleRate(sampleRate.value).valid) { sampleRate.focus(); return; }
        if (sampleRate) state.signal.sampleRate = sampleRate.value;
        apply.disabled = true; apply.textContent = "Применение…";
        Promise.resolve(provider.onApply ? provider.onApply(state) : null).then(function () { state.dirty = false; apply.textContent = "Применить"; render(); });
      }
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

  function init(nextProvider) {
    provider = nextProvider || {};
    return Promise.resolve(provider.getState ? provider.getState() : null).then(function (nextState) {
      state = nextState || { activeDisplayId: "display-1", activePaneId: "", settingsPage: "screen", inspectorPage: "signals", dynamicSamplesOpen: false, dirty: false, displays: [{ id: "display-1", name: "Экран 1", panes: [] }], links: { time:false, amplitude:false, spectrumFrequency:false, spectrumMagnitude:false }, signal: { name:"", color:"#2166df", sampleRate:"", samples:0, duration:"—", minimum:"—", maximum:"—", rms:"—", mean:"—", type:"—" }, signals:[], extrema:[], sampleRows:[] };
      bind(); render();
      window.SignalAnalyserDesignReview = {
        getState: function () { return state; },
        show: function (surface) {
          if (surface === "signal") state.settingsPage = "signal";
          if (surface === "spectrum") state.settingsPage = "display";
          if (surface === "screen") state.settingsPage = "screen";
          if (surface === "extrema") { state.settingsPage = "peaks"; state.inspectorPage = "peaks"; }
          if (surface === "samples") state.inspectorPage = "samples";
          if (surface === "operation") { state.inspectorPage = "signals"; render(); window.SignalAnalyserDialogs.signalOperation.open(state.signal.name); return; }
          render();
        }
      };
    });
  }
  window.SignalAnalyserUI = { init: init };
}());
