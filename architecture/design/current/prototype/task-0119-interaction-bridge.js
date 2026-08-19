(function bridgeTask0119Prototype(window, document) {
  "use strict";

  window.SignalColorPickerProvider = {
    preview:function () {},
    commit:function () { return Promise.resolve(); },
    cancel:function () {}
  };

  function selectedSettingsPage() {
    var selected = document.querySelector("[data-settings-page][aria-selected='true']");
    return selected && selected.dataset.settingsPage;
  }

  function selectedInspectorPage() {
    var selected = document.querySelector("[data-bottom-tab][aria-selected='true']");
    return selected && selected.dataset.bottomTab;
  }

  function ensureAutomaticSamplesTab() {
    if (document.querySelector("[data-bottom-tab='samples']")) return Promise.resolve();
    var settingsPage = selectedSettingsPage() || "signal";
    var inspectorPage = selectedInspectorPage() || "signals";
    var signal = document.querySelector("[data-testid='settings-tab-signal']");
    if (signal) signal.click();
    return new Promise(function (resolve) {
      window.setTimeout(function () {
        var values = document.querySelector("[data-testid='signal-values-action']");
        if (values) values.click();
        window.setTimeout(function () {
          var previousInspector = document.querySelector("[data-bottom-tab='" + inspectorPage + "']");
          var previousSettings = document.querySelector("[data-settings-page='" + settingsPage + "']");
          if (previousInspector) previousInspector.click();
          if (previousSettings) previousSettings.click();
          resolve();
        }, 80);
      }, 80);
    });
  }

  function prepare() {
    if (document.documentElement.dataset.designReady !== "true") return window.setTimeout(prepare, 30);
    ensureAutomaticSamplesTab().then(function () {
      document.documentElement.dataset.task0119Ready = "true";
    });
  }

  document.addEventListener("click", function (event) {
    var option = event.target.closest("[data-value-select-option-index]");
    if (!option) return;
    var openPaneType = document.querySelector("[data-value-select-key^='pane::'][data-value-select-key$='::plot_type'][aria-expanded='true']");
    if (!openPaneType) return;
    window.setTimeout(function () {
      var area = document.querySelector("[data-testid='settings-tab-display']");
      if (area && area.getAttribute("aria-selected") !== "true") area.click();
    }, 120);
  }, true);

  window.addEventListener("load", prepare);
  window.SignalAnalyserTask0119Prototype = { ensureAutomaticSamplesTab:ensureAutomaticSamplesTab };
}(window, document));
