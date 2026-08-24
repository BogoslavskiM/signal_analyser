(function registerTask0139Inventory(window) {
  "use strict";

  function operationId(option) {
    if (typeof option === "string") return option;
    return option && (option.id || option.value || option.key || option.operation) || "";
  }
  function withoutFft(options) {
    return (options || []).filter(function (option) {
      return String(operationId(option)).trim().toLowerCase() !== "fft";
    });
  }

  window.SignalAnalyserTask0139Inventory={
    sampleOptionalColumns:["magnitude","square","signed_square_root_magnitude"],
    sampleOptionalDefaultVisibility:"all_hidden",
    sampleColumnRemoved:"square_root",
    withoutFft:withoutFft,
    signalOperationRemoved:"fft"
  };
}(window));
