(function () {
  "use strict";

  var signalPalette = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];
  var summaryFields = [
    ["sample_count", "Отсчёты"], ["data_type", "Тип"], ["duration", "Длительность"],
    ["region_start", "Начало области"], ["region_end", "Конец области"],
    ["minimum", "Минимум"], ["minimum_position", "Время минимума"],
    ["maximum", "Максимум"], ["maximum_position", "Время максимума"],
    ["mean", "Среднее"], ["median", "Медиана"], ["peak_to_peak", "Размах"], ["rms", "СКЗ"]
  ];
  var unitFactors = {
    seconds:1, milliseconds:1e3, microseconds:1e6, nanoseconds:1e9,
    hertz:1, kilohertz:1e-3, megahertz:1e-6, gigahertz:1e-9
  };

  function decorateNoHistory(root) {
    (root || document).querySelectorAll("input:not([type]), input[type='text'], input[type='search'], input[type='number'], textarea").forEach(function (input) {
      input.setAttribute("autocomplete", "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocorrect", "off");
      input.removeAttribute("name");
    });
  }

  function projectCanonical(value, unit) {
    if (value === null || value === undefined || value === "") return "";
    var factor=unitFactors[unit] || 1;
    return Number(value) * factor;
  }

  function toCanonical(value, unit) {
    if (value === null || value === undefined || value === "") return null;
    var factor=unitFactors[unit] || 1;
    return Number(value) / factor;
  }

  function setBusyPreservingCheckboxes(root, busy) {
    if (!root) return;
    root.setAttribute("aria-busy", String(!!busy));
    root.querySelectorAll("input[type='checkbox']").forEach(function (checkbox) {
      if (busy) {
        checkbox.dataset.wasDisabledBeforeBusy=String(checkbox.disabled);
        checkbox.disabled=true;
      } else {
        checkbox.disabled=checkbox.dataset.wasDisabledBeforeBusy === "true";
        delete checkbox.dataset.wasDisabledBeforeBusy;
      }
    });
  }

  function effectiveViewport(displayedRange, unit, canonicalFullRange) {
    if (!Array.isArray(displayedRange) || displayedRange.length !== 2) return canonicalFullRange ? canonicalFullRange.slice() : null;
    var result=[toCanonical(displayedRange[0], unit), toCanonical(displayedRange[1], unit)];
    if (!canonicalFullRange) return result;
    return [Math.max(canonicalFullRange[0], Math.min(result[0], result[1])), Math.min(canonicalFullRange[1], Math.max(result[0], result[1]))];
  }

  window.SignalAnalyserTask0126 = {
    signalPalette:signalPalette.slice(),
    summaryFields:summaryFields.slice(),
    decorateNoHistory:decorateNoHistory,
    projectCanonical:projectCanonical,
    toCanonical:toCanonical,
    setBusyPreservingCheckboxes:setBusyPreservingCheckboxes,
    effectiveViewport:effectiveViewport
  };
}());
