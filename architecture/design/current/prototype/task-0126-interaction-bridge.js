(function task0126PrototypeBridge(window, document) {
  "use strict";
  var task=window.SignalAnalyserTask0126;
  if (!task) return;

  var summaryFixture={
    region_start:"0 мс", region_end:"399,999 мс", minimum_position:"291,503 мс",
    maximum_position:"386,230 мс", median:"0,006", peak_to_peak:"1,984"
  };
  var summaryLabels={ region_start:"Начало области", region_end:"Конец области", minimum_position:"Время минимума", maximum_position:"Время максимума", median:"Медиана", peak_to_peak:"Размах" };

  function appendSummaryFields() {
    var grid=document.querySelector("[data-signal-settings-group='summary'] .summary-grid");
    if (!grid) return;
    Object.keys(summaryFixture).forEach(function (key) {
      if (grid.querySelector("[data-signal-summary-key='" + key + "']")) return;
      var item=document.createElement("div");
      item.className="summary-item";
      item.dataset.signalSummaryKey=key;
      var label=document.createElement("span"), value=document.createElement("strong");
      label.textContent=summaryLabels[key]; value.textContent=summaryFixture[key];
      item.append(label, value); grid.appendChild(item);
    });
  }

  function projectFixtureRanges() {
    var projections={ "time.x_limits":{factor:1000,unit:"ms"}, "spectrum.frequency_limits":{factor:.001,unit:"kHz"} };
    Object.keys(projections).forEach(function (id) {
      document.querySelectorAll("[data-setting-id='" + id + "'][data-range-part]").forEach(function (input) {
        if (input.dataset.unitProjected === projections[id].unit || input.value === "") return;
        input.dataset.canonicalValue=input.value;
        input.value=String(Number(input.value) * projections[id].factor);
        input.dataset.unitProjected=projections[id].unit;
        input.autocomplete="off";
      });
      var row=document.querySelector("[data-testid='settings-field-" + id + "']");
      var label=row && row.querySelector(".settings-label");
      if (label && !label.querySelector(".unit")) {
        var unit=document.createElement("span"); unit.className="unit"; unit.textContent=projections[id].unit; label.appendChild(unit);
      }
    });
  }

  function decorateStableCheckboxes() {
    var signals=document.querySelector("[data-signal-rows]");
    if (signals) {
      signals.setAttribute("data-preserve-checkboxes", "true");
      signals.querySelectorAll("[data-visible-signal]").forEach(function (checkbox) { checkbox.dataset.stableCheckboxKey=checkbox.dataset.visibleSignal; });
    }
    var catalog=document.querySelector("[data-testid='signal-add-variables']");
    if (catalog) {
      catalog.setAttribute("data-preserve-checkboxes", "true");
      catalog.querySelectorAll("[data-signal-add-variable]").forEach(function (checkbox) { checkbox.dataset.stableCheckboxKey=checkbox.value; });
    }
  }

  function enhance() {
    task.decorateNoHistory(document);
    appendSummaryFields();
    projectFixtureRanges();
    decorateStableCheckboxes();
    document.documentElement.dataset.designVersion="34";
  }

  document.addEventListener("input", function (event) {
    var id=event.target.dataset && event.target.dataset.settingId;
    if (id !== "display.name" && id !== "pane.name") return;
    var value=event.target.value;
    if (id === "display.name") {
      var tab=document.querySelector(".display-tab-shell.is-selected .display-tab span");
      if (tab) tab.textContent=value;
    } else {
      var pane=document.querySelector("[data-pane-selected='true'] .plot-pane-title, .plot-pane.is-active .plot-pane-title");
      if (pane) pane.textContent=value;
    }
    var context=document.querySelector("[data-settings-context]");
    if (context) {
      var parts=context.textContent.split(" · ");
      context.textContent=id === "display.name" ? value + " · " + (parts[1] || "Область") : (parts[0] || "Экран") + " · " + value;
    }
  }, true);

  var scheduled=false;
  new MutationObserver(function () {
    if (scheduled) return;
    scheduled=true;
    window.requestAnimationFrame(function () { scheduled=false; enhance(); });
  }).observe(document.documentElement, { childList:true, subtree:true });
  enhance();

  window.SignalAnalyserTask0126Review={
    enhance:enhance,
    setSignalBusy:function (busy) { task.setBusyPreservingCheckboxes(document.querySelector("[data-signal-rows]"), busy); },
    setCatalogBusy:function (busy) { task.setBusyPreservingCheckboxes(document.querySelector("[data-testid='signal-add-variables']"), busy); }
  };
}(window, document));
