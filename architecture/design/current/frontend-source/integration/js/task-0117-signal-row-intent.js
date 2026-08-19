(function (root) {
  "use strict";

  function rowClick(signalName) {
    return {
      source: "row",
      signalName: String(signalName || ""),
      ensureVisible: true,
      setMain: true
    };
  }

  function checkboxChange(signalName, checked) {
    return {
      source: "checkbox",
      signalName: String(signalName || ""),
      visible: !!checked,
      setMain: false
    };
  }

  root.SignalAnalyserTask0117 = {
    rowClick: rowClick,
    checkboxChange: checkboxChange
  };
}(window));
