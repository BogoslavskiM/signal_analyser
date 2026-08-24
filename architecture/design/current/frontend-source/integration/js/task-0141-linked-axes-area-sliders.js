(function registerSignalAnalyserTask0141(window) {
  "use strict";

  var FREQUENCY_UNITS_HZ = {
    millihertz: 1e-3,
    hertz: 1,
    kilohertz: 1e3,
    megahertz: 1e6,
    gigahertz: 1e9,
    terahertz: 1e12
  };

  var AREA_RANGES = {
    time: [
      { fieldId:"time.x_limits", axis:"time", link:"time", label:"Пределы времени", unitField:"time.units" },
      { fieldId:"time.y_limits", axis:"amplitude", link:"amplitude", label:"Пределы оси Y" }
    ],
    spectrum: [
      { fieldId:"spectrum.frequency_limits", axis:"frequency", link:"frequency", label:"Пределы частоты", unitField:"spectrum.frequency_units" },
      { fieldId:"spectrum.y_limits", axis:"magnitude", link:"magnitude", label:"Пределы магнитуды", dbOnlyLink:true }
    ],
    spectrogram: [
      { fieldId:"time.x_limits", axis:"time", link:"time", label:"Пределы времени", unitField:"spectrogram.time_units" },
      { fieldId:"spectrogram.frequency_limits", axis:"frequency", label:"Пределы частоты", unitField:"spectrogram.frequency_units" },
      { fieldId:"spectrogram.power_limits", axis:"power", label:"Пределы мощности" }
    ],
    persistence: [
      { fieldId:"persistence.frequency_limits", axis:"frequency", link:"frequency", label:"Пределы частоты", unitField:"persistence.frequency_units" },
      { fieldId:"persistence.power_limits", axis:"power", link:"magnitude", label:"Пределы мощности", dbOnlyLink:true },
      { fieldId:"persistence.density_limits", axis:"density", label:"Пределы плотности" }
    ]
  };

  var SCREEN_LINKS = {
    time: { label:"Связать время", settingId:"time.link_time", paneTypes:["time", "spectrogram"] },
    amplitude: { label:"Связать амплитуду", settingId:"time.link_amplitude", paneTypes:["time"] },
    frequency: { label:"Связать частоты", settingId:"spectrum.link_frequency", paneTypes:["spectrum", "persistence"] },
    magnitude: { label:"Связать магнитуды", settingId:"spectrum.link_magnitude", paneTypes:["spectrum", "persistence"], requiredScale:"db" }
  };

  function cleanType(value) {
    value = String(value == null ? "" : value).toLowerCase();
    if (/spectrogram|спектрограмм/.test(value)) return "spectrogram";
    if (/persistence|персистент/.test(value)) return "persistence";
    if (/spectrum|спектр/.test(value)) return "spectrum";
    if (/time|временн/.test(value)) return "time";
    return value;
  }

  function scaleIsDb(value) {
    return value === true || String(value == null ? "" : value).toLowerCase() === "db" || String(value).toLowerCase() === "децибелы";
  }

  function areaRanges(paneType, links, scale) {
    links = links || {};
    var type = cleanType(paneType);
    return (AREA_RANGES[type] || []).filter(function (item) {
      if (!item.link || !links[item.link]) return true;
      return item.dbOnlyLink && !scaleIsDb(scale);
    }).map(function (item) {
      return Object.assign({}, item, {
        scope:"area",
        paneType:type,
        sliderComponent:"screen-range-slider",
        emptyEndpoints:"independent_auto_until_that_endpoint_is_touched"
      });
    });
  }

  function linkDescriptor(group, pane) {
    pane = pane || {};
    var type = cleanType(pane.plotType || pane.plot_type || pane.type);
    if (group === "frequency" && (type === "spectrum" || type === "persistence")) {
      return {
        group:group,
        paneType:type,
        axisName:"xaxis",
        settingId:type === "spectrum" ? "spectrum.frequency_limits" : "persistence.frequency_limits",
        unitField:type === "spectrum" ? "spectrum.frequency_units" : "persistence.frequency_units",
        unit:pane.frequencyUnit || pane.frequency_unit || "hertz",
        axisScale:pane.frequencyScale || pane.frequency_scale || "linear",
        canonicalUnit:"hertz"
      };
    }
    if (group === "magnitude" && (type === "spectrum" || type === "persistence") && scaleIsDb(pane.valueScale || pane.value_scale || pane.scale)) {
      return {
        group:group,
        paneType:type,
        axisName:"yaxis",
        settingId:type === "spectrum" ? "spectrum.y_limits" : "persistence.power_limits",
        unit:"dB",
        axisScale:"linear",
        canonicalUnit:"dB"
      };
    }
    return null;
  }

  function finiteRange(range) {
    if (!Array.isArray(range) || range.length < 2) return null;
    var result = [Number(range[0]), Number(range[1])];
    return Number.isFinite(result[0]) && Number.isFinite(result[1]) ? result : null;
  }

  function readRelayoutRange(eventData, axisName) {
    eventData = eventData || {};
    if (eventData[axisName + ".autorange"] === true) return { autorange:true };
    var direct = finiteRange(eventData[axisName + ".range"]);
    if (direct) return { autorange:false, range:direct };
    var split = finiteRange([eventData[axisName + ".range[0]"], eventData[axisName + ".range[1]"]]);
    return split ? { autorange:false, range:split } : null;
  }

  function unitScale(unit) { return FREQUENCY_UNITS_HZ[String(unit || "hertz").toLowerCase()] || 1; }

  function frequencyCoordinateToHz(value, descriptor) {
    var visible = descriptor.axisScale === "log" ? Math.pow(10, Number(value)) : Number(value);
    return visible * unitScale(descriptor.unit);
  }

  function hzToFrequencyCoordinate(value, descriptor) {
    var visible = Number(value) / unitScale(descriptor.unit);
    return descriptor.axisScale === "log" ? Math.log10(visible) : visible;
  }

  function projectLinkedRelayout(group, sourcePane, targetPane, eventData) {
    var source = linkDescriptor(group, sourcePane), target = linkDescriptor(group, targetPane);
    if (!source || !target) return null;
    var incoming = readRelayoutRange(eventData, source.axisName);
    if (!incoming) return null;
    var result = {};
    if (incoming.autorange) {
      result[target.axisName + ".autorange"] = true;
      return result;
    }
    var range = incoming.range;
    if (group === "frequency") {
      range = range.map(function (value) { return frequencyCoordinateToHz(value, source); })
        .map(function (value) { return hzToFrequencyCoordinate(value, target); });
      if (!finiteRange(range) || target.axisScale === "log" && range.some(function (value) { return !Number.isFinite(value); })) return null;
    }
    result[target.axisName + ".range[0]"] = range[0];
    result[target.axisName + ".range[1]"] = range[1];
    result[target.axisName + ".autorange"] = false;
    return result;
  }

  function linkedTargets(group, sourcePane, panes) {
    var source = linkDescriptor(group, sourcePane);
    if (!source) return [];
    return (panes || []).filter(function (pane) {
      var paneId = pane.id || pane.paneId || pane.pane_id;
      var sourceId = sourcePane && (sourcePane.id || sourcePane.paneId || sourcePane.pane_id);
      return paneId !== sourceId && !!linkDescriptor(group, pane);
    });
  }

  function intersection(a, b) {
    var result = { left:Math.max(a.left, b.left), top:Math.max(a.top, b.top), right:Math.min(a.right, b.right), bottom:Math.min(a.bottom, b.bottom) };
    result.width = Math.max(0, result.right - result.left);
    result.height = Math.max(0, result.bottom - result.top);
    return result;
  }

  function triggerVisible(rect, boundary) {
    return !!rect && rect.right > boundary.left && rect.left < boundary.right && rect.bottom > boundary.top && rect.top < boundary.bottom;
  }

  function anchoredMenuPosition(triggerRect, menuSize, shellRect, viewport) {
    var viewportRect = { left:0, top:0, right:viewport.width, bottom:viewport.height };
    var boundary = intersection(shellRect || viewportRect, viewportRect);
    var inset = 8, gap = 4;
    if (!triggerVisible(triggerRect, boundary) || boundary.width <= inset * 2 || boundary.height <= inset * 2) return { close:true, reason:"anchor_outside_boundary" };
    var width = Math.min(Number(menuSize.width) || 224, boundary.width - inset * 2);
    var naturalHeight = Number(menuSize.height) || 0;
    var maxHeight = boundary.height - inset * 2;
    var height = Math.min(naturalHeight, maxHeight);
    var minLeft = boundary.left + inset, maxLeft = boundary.right - inset - width;
    var left = triggerRect.right - width, horizontal = "right";
    if (left < minLeft) {
      left = triggerRect.left;
      horizontal = "left";
    }
    left = Math.max(minLeft, Math.min(left, maxLeft));
    var below = triggerRect.bottom + gap, above = triggerRect.top - height - gap;
    var top, vertical;
    if (below + height <= boundary.bottom - inset) { top = below; vertical = "below"; }
    else if (above >= boundary.top + inset) { top = above; vertical = "above"; }
    else { top = Math.max(boundary.top + inset, Math.min(below, boundary.bottom - inset - height)); vertical = "clamped"; }
    return { close:false, position:"fixed", left:left, top:top, width:width, maxHeight:maxHeight, overflowY:naturalHeight > maxHeight ? "auto" : "visible", horizontal:horizontal, vertical:vertical };
  }

  window.SignalAnalyserTask0141 = {
    labels: { frequency:"Связать частоты", magnitude:"Связать магнитуды" },
    screenLinks: SCREEN_LINKS,
    areaRanges: areaRanges,
    linkDescriptor: linkDescriptor,
    linkedTargets: linkedTargets,
    projectLinkedRelayout: projectLinkedRelayout,
    anchoredMenuPosition: anchoredMenuPosition,
    contract: {
      frequency:"Spectrum frequency and Persistence frequency share one canonical-Hz interval inside the active display; Spectrogram frequency is excluded.",
      magnitude:"Spectrum magnitude and Persistence power share one dB interval only while each pane is in dB; linear panes and hidden/noneligible fields are ignored.",
      areaSliders:"Every visible Area range field reuses the exact Screen dual-handle slider; scope is the active pane only, and each empty endpoint remains auto until that endpoint is typed or its thumb is moved.",
      heatmaps:"Backend/provider authors Jet for Spectrogram and Persistence output; Frontend passes the accepted Plotly colorscale through unchanged and adds no palette control.",
      freshDisplay:"Backend/provider authors a new display as 2x2 with four empty named panes and pane 1 active; Frontend renders accepted layout/ids only, while existing/imported layouts are never migrated.",
      menu:"The unchanged body-portal pane menu anchors to the clicked [data-pane-menu], stays within the application-shell/viewport intersection with 8px inset, flips, repositions on resize/scroll, and closes when its anchor leaves that boundary."
    }
  };
}(window));
