(function registerTask0119Intent(window) {
  "use strict";

  function paneTypeChanged(plotType) {
    return { plotType:String(plotType || ""), settingsPage:"display" };
  }

  function sampleTabFor(mainSignal) {
    var signal = mainSignal || {};
    var stableId = String(signal.id || "");
    var name = String(signal.name || "");
    return {
      present:!!(stableId && name),
      signalId:stableId,
      label:name,
      loadFirstPage:true,
      focus:false
    };
  }

  function valuesAction(mainSignal) {
    var tab = sampleTabFor(mainSignal);
    tab.focus = tab.present;
    return tab;
  }

  function validateSampleRate(raw) {
    var value = String(raw == null ? "" : raw).trim();
    var dotDecimal = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value);
    var number = dotDecimal ? Number(value) : NaN;
    return { valid:dotDecimal && Number.isFinite(number) && number > 0, value:number };
  }

  window.SignalAnalyserTask0119 = {
    paneTypeChanged:paneTypeChanged,
    sampleTabFor:sampleTabFor,
    valuesAction:valuesAction,
    validateSampleRate:validateSampleRate
  };
}(window));
