(function registerAxisLabelsAndHoverPolicy(window) {
  "use strict";

  var FIELD={id:"display.show_axis_labels",label:"Подписывать оси",kind:"boolean",defaultValue:true,testid:"settings-show-axis-labels"};
  var FALLBACK={
    time:{x:"Время",y:"Амплитуда",colorbar:""},
    spectrum:{x:"Частота",y:"Магнитуда",colorbar:""},
    spectrogram:{x:"Время",y:"Частота",colorbar:"Мощность, дБ"},
    persistence:{x:"Частота",y:"Мощность, дБ",colorbar:"Вероятность, %"}
  };
  function cleanType(value) {
    value=String(value || "").toLowerCase();
    if (/spectrogram|спектрограмм/.test(value)) return "spectrogram";
    if (/persistence|персистент/.test(value)) return "persistence";
    if (/spectrum|спектр/.test(value)) return "spectrum";
    return "time";
  }
  function titleText(value) { return typeof value === "string" ? value : value && value.text || ""; }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function insertAfterLegend(items) {
    items=Array.isArray(items) ? items.slice() : [];
    if (items.some(function (item) { return item && item.id === FIELD.id; })) return items;
    var index=items.findIndex(function (item) { return item && item.id === "display.show_legend"; });
    items.splice(index < 0 ? items.length : index+1,0,Object.assign({},FIELD));
    return items;
  }
  function semanticRecord(plotType,layout,data) {
    var type=cleanType(plotType),fallback=FALLBACK[type],traces=Array.isArray(data) ? data : [];
    return {
      plotType:type,
      x:titleText(layout && layout.xaxis && layout.xaxis.title) || fallback.x,
      y:titleText(layout && layout.yaxis && layout.yaxis.title) || fallback.y,
      colorbars:traces.map(function (trace) { return titleText(trace && trace.colorbar && trace.colorbar.title) || (trace && trace.type === "heatmap" ? fallback.colorbar : ""); })
    };
  }
  function titleProjection(record,visible) {
    record=record || semanticRecord("time",{},[]);
    return {
      layout:{"xaxis.title.text":visible ? record.x : "","yaxis.title.text":visible ? record.y : ""},
      traces:(record.colorbars || []).map(function (title,index) { return {index:index,update:{"colorbar.title.text":visible ? title : ""}}; }).filter(function (item) { return !!record.colorbars[item.index]; })
    };
  }
  function suppressHover(payload) {
    payload=clone(payload || {}) || {};
    payload.layout=Object.assign({},payload.layout || {},{hovermode:false});
    payload.data=(Array.isArray(payload.data) ? payload.data : []).map(function (trace) {
      return Object.assign({},trace,{hoverinfo:"skip",hovertemplate:null});
    });
    return payload;
  }
  function createController(options) {
    options=options || {};
    var records=Object.create(null),visibleByPane=Object.create(null);
    function capture(key,plotType,layout,data,storedValue) {
      records[key]=semanticRecord(plotType,layout,data);
      if (typeof visibleByPane[key] !== "boolean") visibleByPane[key]=storedValue === undefined ? true : !!storedValue;
      return projection(key);
    }
    function projection(key) { return titleProjection(records[key],visibleByPane[key] !== false); }
    function setVisible(key,value) {
      visibleByPane[key]=!!value;
      var projected=projection(key);
      if (typeof options.relayout === "function") options.relayout(key,projected.layout,{titleTextOnly:true,preserveMargins:true});
      if (typeof options.restyle === "function") projected.traces.forEach(function (item) { options.restyle(key,item.update,[item.index],{titleTextOnly:true}); });
      if (typeof options.persist === "function") options.persist(key,FIELD.id,visibleByPane[key],{perPane:true,noOutputInvalidation:true});
      return projected;
    }
    function clear(key) { delete records[key]; delete visibleByPane[key]; }
    return {capture:capture,projection:projection,setVisible:setVisible,value:function (key) { return visibleByPane[key] !== false; },clear:clear};
  }

  window.SignalAnalyserAxisLabelsAndHover={
    field:FIELD,
    fallback:FALLBACK,
    insertAfterLegend:insertAfterLegend,
    semanticRecord:semanticRecord,
    titleProjection:titleProjection,
    suppressHover:suppressHover,
    createController:createController,
    selectors:{field:"[data-setting-id='display.show_axis_labels']",input:"[data-testid='settings-show-axis-labels']",plot:"[data-pane-host]"},
    contract:{
      defaultValue:"true, matching the current plots that already show semantic axis/colorbar titles",
      unchecked:"Clear only xaxis.title.text, yaxis.title.text and applicable trace colorbar.title.text; retain axes, ticks, grid, colorbar, margins and plot interaction.",
      hover:"Before every Plotly.react and overlay-trace addition, force layout.hovermode=false and every trace hoverinfo=skip/hovertemplate=null for all plot types.",
      persistence:"display.show_axis_labels is a per-pane persisted display setting; changing it relayouts/restyles titles only and does not invalidate output or run DSP.",
      cleanup:"On pane removal call clear(paneRuntimeKey); recapture provider semantic titles before projecting every new accepted Plotly payload."
    }
  };
}(window));
