(function registerSignalAnalyserSynchronizedRanges(window) {
  "use strict";

  var UNIT_TO_CANONICAL={
    seconds:1,milliseconds:1e-3,microseconds:1e-6,nanoseconds:1e-9,
    hertz:1,kilohertz:1e3,megahertz:1e6,gigahertz:1e9,
    db:1,linear:1,percent:1
  };
  var INVENTORY={
    time:[
      {fieldId:"time.x_limits",unitField:"time.units",axis:"xaxis",kind:"time",link:"time"},
      {fieldId:"time.y_limits",axis:"yaxis",kind:"amplitude",link:"amplitude"}
    ],
    spectrum:[
      {fieldId:"spectrum.frequency_limits",unitField:"spectrum.frequency_units",axis:"xaxis",kind:"frequency",link:"frequency",plotScaleField:"spectrum.frequency_scale"},
      {fieldId:"spectrum.y_limits",axis:"yaxis",kind:"magnitude",link:"magnitude"}
    ],
    spectrogram:[
      {fieldId:"time.x_limits",unitField:"spectrogram.time_units",axis:"xaxis",kind:"time",link:"time"},
      {fieldId:"spectrogram.frequency_limits",unitField:"spectrogram.frequency_units",axis:"yaxis",kind:"frequency"},
      {fieldId:"spectrogram.power_limits",axis:"zaxis",kind:"power"}
    ],
    persistence:[
      {fieldId:"persistence.frequency_limits",unitField:"persistence.frequency_units",axis:"xaxis",kind:"frequency",link:"frequency",plotScaleField:"persistence.frequency_scale"},
      {fieldId:"persistence.power_limits",axis:"yaxis",kind:"power",link:"magnitude"},
      {fieldId:"persistence.density_limits",axis:"zaxis",kind:"density"}
    ]
  };

  function cleanType(value) {
    value=String(value || "").toLowerCase();
    if (/spectrogram|спектрограмм/.test(value)) return "spectrogram";
    if (/persistence|персистент/.test(value)) return "persistence";
    if (/spectrum|спектр/.test(value)) return "spectrum";
    if (/time|временн/.test(value)) return "time";
    return value;
  }
  function descriptors(plotType) { return (INVENTORY[cleanType(plotType)] || []).map(function (item) { return Object.assign({},item); }); }
  function unitFactor(unit) { return UNIT_TO_CANONICAL[String(unit || "linear").toLowerCase()] || 1; }
  function finiteRange(values) {
    if (!Array.isArray(values) || values.length !== 2) return null;
    values=values.map(Number);
    return Number.isFinite(values[0]) && Number.isFinite(values[1]) && values[0] !== values[1] ? values : null;
  }
  function relayoutRange(eventData,axis) {
    eventData=eventData || {};
    if (eventData[axis+".autorange"] === true) return {auto:true,range:null};
    var direct=finiteRange(eventData[axis+".range"]);
    var split=finiteRange([eventData[axis+".range[0]"],eventData[axis+".range[1]"]]);
    var range=direct || split;
    return range ? {auto:false,range:range} : null;
  }
  function plotlyToProjected(range,options) {
    var result=finiteRange(range);
    if (!result) return null;
    var log=String(options && options.axisScale || "linear").toLowerCase() === "log";
    var factor=unitFactor(options && options.unit);
    return result.map(function (coordinate) { var displayed=log ? Math.pow(10,coordinate) : coordinate; return displayed; }).map(function (displayed) { return displayed; });
  }
  function projectedToPlotly(range,options) {
    var result=finiteRange(range);
    if (!result) return null;
    var log=String(options && options.axisScale || "linear").toLowerCase() === "log";
    if (log && result.some(function (value) { return !(value > 0); })) return null;
    return result.map(function (displayed) { return log ? Math.log10(displayed) : displayed; });
  }
  function projectedToCanonical(range,unit) {
    var result=finiteRange(range), factor=unitFactor(unit);
    return result && result.map(function (value) { return value * factor; });
  }
  function canonicalToProjected(range,unit) {
    var result=finiteRange(range), factor=unitFactor(unit);
    return result && result.map(function (value) { return value / factor; });
  }
  function settingsProjection(eventData,descriptor,options) {
    var selected=relayoutRange(eventData,descriptor.axis);
    if (!selected) return null;
    if (selected.auto) return {fieldId:descriptor.fieldId,mode:"auto",min:null,max:null,explicitIntent:false};
    var projected=plotlyToProjected(selected.range,options);
    return projected ? {fieldId:descriptor.fieldId,mode:"explicit",min:projected[0],max:projected[1],explicitIntent:true} : null;
  }
  function plotlyProjection(range,descriptor,options) {
    if (!range || range.auto || range.min == null && range.max == null) {
      var automatic={}; automatic[descriptor.axis+".autorange"]=true;
      if (descriptor.axis === "xaxis") automatic["xaxis.rangeslider.autorange"]=true;
      return automatic;
    }
    var projected=projectedToPlotly([range.min,range.max],options);
    if (!projected) return null;
    var update={};
    update[descriptor.axis+".range[0]"]=projected[0];
    update[descriptor.axis+".range[1]"]=projected[1];
    update[descriptor.axis+".autorange"]=false;
    if (descriptor.axis === "xaxis") {
      update["xaxis.rangeslider.range"]=projected.slice();
      update["xaxis.rangeslider.autorange"]=false;
    }
    return update;
  }
  function grouping(plotType) {
    var items=descriptors(plotType), units=[];
    items.forEach(function (item) { if (item.unitField && units.indexOf(item.unitField) < 0) units.push(item.unitField); });
    return {parameters:{title:"Параметры",unitFields:units},ranges:{title:"Диапазоны",collapsible:true,initialExpanded:true,fields:items.map(function (item) { return item.fieldId; })}};
  }
  function createSettler(callback,delay) {
    var timer=null,lastKey="";
    return {
      preview:function (payload) { if (callback && callback.preview) callback.preview(payload); },
      settle:function (payload) {
        if (timer != null) window.clearTimeout(timer);
        var key=JSON.stringify(payload || null);
        timer=window.setTimeout(function () { timer=null; if (key === lastKey) return; lastKey=key; if (callback && callback.publish) callback.publish(payload); },Number(delay) || 150);
      },
      cancel:function () { if (timer != null) window.clearTimeout(timer); timer=null; }
    };
  }

  window.SignalAnalyserSynchronizedRanges={
    descriptors:descriptors,
    grouping:grouping,
    relayoutRange:relayoutRange,
    settingsProjection:settingsProjection,
    plotlyProjection:plotlyProjection,
    projectedToCanonical:projectedToCanonical,
    canonicalToProjected:canonicalToProjected,
    createSettler:createSettler,
    settleDelayMs:150,
    contract:{
      liveProjection:"plotly_relayouting updates current Area fields and handles immediately without publication; slider input updates Plotly at most once per animation frame",
      settleBoundary:"plotly_relayout and settings change/pointerup/keyboard commit start one 150ms deduplicating settle, then the existing serialized autosave publishes canonical values once",
      linkedProjection:"after the source pane projection, existing time/amplitude/frequency/magnitude link queues apply the same canonical interval only to eligible panes",
      reset:"double click any range row or its settings/in-plot slider clears both explicit endpoint intents, requests axis autorange/full domain, synchronizes graph/settings and publishes one settled Auto value",
      validation:"v46 per-endpoint validation runs before graph preview or publication; an invalid endpoint changes neither plot nor linked panes"
    }
  };
}(window));
