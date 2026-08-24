(function registerMeasurementCursorColumns(window) {
  "use strict";

  var CURSOR_COLUMNS=[
    {id:"x1",label:"X1",axis:"x",mode:"single",width:92},
    {id:"y1",label:"Y1",axis:"y",mode:"single",width:92},
    {id:"x2",label:"X2",axis:"x",mode:"dual",width:92},
    {id:"y2",label:"Y2",axis:"y",mode:"dual",width:92},
    {id:"delta_x",label:"ΔX",axis:"x",mode:"dual",width:92},
    {id:"delta_y",label:"ΔY",axis:"y",mode:"dual",width:92}
  ];

  function finite(value) { return Number.isFinite(Number(value)); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,function (character) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character]; }); }
  function formatNumber(value) {
    if (!finite(value)) return "—";
    var number=Number(value),absolute=Math.abs(number);
    if (absolute !== 0 && (absolute >= 1e6 || absolute < 1e-4)) return number.toExponential(4);
    return String(Number(number.toPrecision(7)));
  }
  function titleText(axis) { var title=axis && axis.title; return typeof title === "string" ? title : title && title.text || ""; }
  function axisUnit(axis) { var parts=titleText(axis).split(","); return parts.length > 1 ? parts.slice(1).join(",").trim() : ""; }
  function fullAxis(host,name) { return host && host._fullLayout && host._fullLayout[name] || host && host.layout && host.layout[name] || {}; }
  function traceAxis(host,trace,kind) {
    var reference=String(trace && trace[kind+"axis"] || kind),name=reference === kind ? kind+"axis" : kind+"axis"+reference.slice(1);
    return fullAxis(host,name);
  }
  function withUnit(value,unit) { var formatted=formatNumber(value); return formatted === "—" || !unit ? formatted : formatted+" "+unit; }
  function visibleTraces(host) {
    return (host && Array.isArray(host.data) ? host.data : []).filter(function (trace) {
      return trace && trace.visible !== false && trace.visible !== "legendonly" &&
        !(trace.meta && trace.meta.signal_analyser_peaks_overlay) &&
        Array.isArray(trace.x) && Array.isArray(trace.y) && trace.x.length && trace.y.length;
    });
  }
  function closestIndex(values,target) {
    var low=0,high=values.length-1;
    if (!values.length) return -1;
    if (Number(values[low]) >= target) return low;
    if (Number(values[high]) <= target) return high;
    while (high-low > 1) { var middle=(low+high)>>1; if (Number(values[middle]) < target) low=middle; else high=middle; }
    return Math.abs(Number(values[low])-target) <= Math.abs(Number(values[high])-target) ? low : high;
  }
  function nearestPoint(trace,target) { var index=closestIndex(trace && trace.x || [],target); return index < 0 ? null : {x:Number(trace.x[index]),y:trace.y[index],index:index}; }
  function traceForRow(host,row) {
    var traces=visibleTraces(host),legendgroup=row && (row.legendgroup || row.signal_id || row.signalId || row.signal_name || row.signalName);
    return traces.find(function (trace) { return legendgroup != null && String(trace.legendgroup || "") === String(legendgroup); }) || null;
  }
  function eligiblePlot(plotType,snapshot) { return (plotType === "time" || plotType === "spectrum") && !!snapshot && snapshot.eligible !== false; }
  function eligibility(mode,plotType,snapshot) {
    var active=eligiblePlot(plotType,snapshot),single=active && (mode === "single" || mode === "dual"),dual=active && mode === "dual";
    return {x1:single,y1:single,x2:dual,y2:dual,delta_x:dual,delta_y:dual};
  }
  function defaultIntent() { return CURSOR_COLUMNS.reduce(function (result,column) { result[column.id]=false; return result; },{}); }
  function normalizeIntent(value) { var result=defaultIntent(); CURSOR_COLUMNS.forEach(function (column) { if (value && typeof value[column.id] === "boolean") result[column.id]=value[column.id]; }); return result; }
  function projection(intent,mode,plotType,snapshot) {
    var requested=normalizeIntent(intent),enabled=eligibility(mode,plotType,snapshot),visible={};
    CURSOR_COLUMNS.forEach(function (column) { visible[column.id]=enabled[column.id] && requested[column.id]; });
    return {intent:requested,enabled:enabled,visible:visible};
  }

  function createController(options) {
    options=options || {};
    var intentByPane=Object.create(null);
    function paneIntent(key) { return intentByPane[key] || (intentByPane[key]=defaultIntent()); }
    function reconcile(key,snapshot,plotType) { return projection(paneIntent(key),snapshot && snapshot.mode || "off",plotType,snapshot); }
    function toggle(key,columnId,snapshot,plotType) {
      var state=reconcile(key,snapshot,plotType);
      if (!state.enabled[columnId]) return state;
      paneIntent(key)[columnId]=!paneIntent(key)[columnId];
      state=reconcile(key,snapshot,plotType);
      if (typeof options.onVisibilityChange === "function") options.onVisibilityChange(key,state,{frontendOnly:true});
      return state;
    }
    function setIntent(key,value,snapshot,plotType) { intentByPane[key]=normalizeIntent(value); return reconcile(key,snapshot,plotType); }
    function menuItems(key,snapshot,plotType) {
      var state=reconcile(key,snapshot,plotType);
      return CURSOR_COLUMNS.map(function (column) { return Object.assign({},column,{enabled:state.enabled[column.id],visible:state.visible[column.id],intent:state.intent[column.id]}); });
    }
    function clear(key) { var existed=Object.prototype.hasOwnProperty.call(intentByPane,key); delete intentByPane[key]; return existed; }
    return {reconcile:reconcile,toggle:toggle,setIntent:setIntent,menuItems:menuItems,intent:function (key) { return normalizeIntent(paneIntent(key)); },clear:clear};
  }

  function headerColumns(snapshot,plotType,visible) {
    var host=snapshot && snapshot.host,xUnit=axisUnit(fullAxis(host,"xaxis")),yUnit=axisUnit(fullAxis(host,"yaxis"));
    return CURSOR_COLUMNS.filter(function (column) { return visible && visible[column.id]; }).map(function (column) {
      var unit=column.axis === "x" ? xUnit : yUnit;
      return Object.assign({},column,{unit:unit,headerLabel:column.label+(unit ? ", "+unit : "")});
    });
  }
  function rowProjection(row,snapshot,plotType,visible) {
    var host=snapshot && snapshot.host,values=snapshot && Array.isArray(snapshot.values) ? snapshot.values : [],trace=traceForRow(host,row);
    var point1=trace && finite(values[0]) ? nearestPoint(trace,Number(values[0])) : null;
    var point2=trace && finite(values[1]) ? nearestPoint(trace,Number(values[1])) : null;
    var xUnit=axisUnit(fullAxis(host,"xaxis")),yUnit=axisUnit(traceAxis(host,trace,"y"));
    var raw={x1:finite(values[0]) ? Number(values[0]) : null,y1:point1 && point1.y,x2:finite(values[1]) ? Number(values[1]) : null,y2:point2 && point2.y};
    raw.delta_x=finite(raw.x1) && finite(raw.x2) ? raw.x2-raw.x1 : null;
    raw.delta_y=finite(raw.y1) && finite(raw.y2) ? Number(raw.y2)-Number(raw.y1) : null;
    var result={};
    CURSOR_COLUMNS.forEach(function (column) {
      if (!visible || !visible[column.id]) return;
      result[column.id]={raw:raw[column.id],text:withUnit(raw[column.id],column.axis === "x" ? xUnit : yUnit),available:finite(raw[column.id])};
    });
    return result;
  }
  function menuMarkup(items,assetBase) {
    assetBase=assetBase || ".";
    return "<div class='inspector-menu-title'>Видимость столбцов</div>"+items.map(function (item) {
      return "<button type='button' role='menuitemcheckbox' data-measurement-cursor-column='"+item.id+"' aria-checked='"+item.visible+"' aria-disabled='"+(!item.enabled)+"'"+(item.enabled ? "" : " disabled")+"><span>"+escapeHtml(item.label)+"</span><img src='"+assetBase+"/icons/"+(item.visible ? "eye.svg" : "eye-off.svg")+"' alt=''></button>";
    }).join("");
  }

  window.SignalAnalyserMeasurementCursorColumns={
    columns:CURSOR_COLUMNS,
    defaultIntent:defaultIntent,
    normalizeIntent:normalizeIntent,
    eligibility:eligibility,
    projection:projection,
    createController:createController,
    headerColumns:headerColumns,
    rowProjection:rowProjection,
    traceForRow:traceForRow,
    menuMarkup:menuMarkup,
    hooks:{trigger:"[data-testid='measurement-columns-menu-trigger']",menu:"[data-testid='measurement-columns-menu']",item:"[data-measurement-cursor-column]",cell:"[data-measurement-cursor-value]"},
    contract:{
      eligibility:"off/non-Time/non-Spectrum disables all; single enables X1/Y1; dual enables all six",
      intent:"Per-pane frontend-only visibility intent starts all false; ineligible columns hide immediately but retain latent intent for restoration when that pane returns to an eligible cursor mode.",
      mapping:"Resolve the row legendgroup (explicit row.legendgroup, otherwise its stable signal id/name group key), then use the first visible non-overlay trace with that exact legendgroup in Plotly data order; use its sample nearest each pane cursor X.",
      formulas:"delta_x=x2-x1; delta_y=y2-y1",
      isolation:"No API, DSP, settings, session or state_revision mutation.",
      cleanup:"On pane removal, unsubscribe the cursor listener and clear(paneRuntimeKey); on active pane/type/mode changes reconcile immediately."
    }
  };
}(window));
