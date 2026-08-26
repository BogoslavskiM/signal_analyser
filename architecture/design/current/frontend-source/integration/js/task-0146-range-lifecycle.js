(function registerSignalAnalyserRangeLifecycle(window) {
  "use strict";

  function text(value) { return value == null ? "" : String(value); }
  function finiteRange(range) {
    if (!range || range.min == null || range.max == null) return null;
    var result=[Number(range.min),Number(range.max)];
    return Number.isFinite(result[0]) && Number.isFinite(result[1]) && result[0] < result[1] ? result : null;
  }
  function nodeSet(context) {
    var nodes=context && context.nodes || {};
    return {
      row:nodes.row || null,
      slider:nodes.slider || null,
      pane:nodes.pane || null,
      plot:nodes.plot || null,
      minInput:nodes.minInput || null,
      maxInput:nodes.maxInput || null,
      minHandle:nodes.minHandle || null,
      maxHandle:nodes.maxHandle || null
    };
  }
  function sameNodes(a,b) {
    return !!a && !!b && Object.keys(a).every(function (key) { return a[key] === b[key]; });
  }
  function setData(node,key,value) { if (node && node.dataset) node.dataset[key]=text(value); }
  function patch(nodes,projection,fullDomain,generation,state) {
    var automatic=!projection || projection.auto || projection.min == null && projection.max == null;
    if (nodes.minInput) nodes.minInput.value=automatic ? "" : text(projection.min);
    if (nodes.maxInput) nodes.maxInput.value=automatic ? "" : text(projection.max);
    if (nodes.minHandle && fullDomain) nodes.minHandle.value=text(automatic ? fullDomain[0] : projection.min);
    if (nodes.maxHandle && fullDomain) nodes.maxHandle.value=text(automatic ? fullDomain[1] : projection.max);
    setData(nodes.row,"rangeGeneration",generation);
    setData(nodes.row,"rangeSyncState",state);
    setData(nodes.slider,"rangeGeneration",generation);
    setData(nodes.pane,"rangePreviewActive",state === "preview");
  }

  function create(options) {
    options=options || {};
    var sync=options.synchronizedRanges || window.SignalAnalyserSynchronizedRanges;
    var records=Object.create(null), sequence=0;
    var settleDelay=Number(options.settleDelayMs);
    if (!Number.isFinite(settleDelay) || settleDelay < 0) settleDelay=150;

    function key(context) { return [context.displayId || "",context.paneId || "",context.fieldId || ""].join("::"); }
    function current(token) { var record=token && records[token.key]; return record && record.generation === token.generation ? record : null; }
    function begin(context,source,mode) {
      var recordKey=key(context), prior=records[recordKey];
      if (prior && prior.timer != null) window.clearTimeout(prior.timer);
      if (prior && typeof options.cancelPreview === "function") options.cancelPreview(context,{generation:prior.generation});
      sequence+=1;
      var record={key:recordKey,generation:sequence,source:source,mode:mode || "explicit",nodes:nodeSet(context),context:context,timer:null,projection:null};
      records[recordKey]=record;
      setData(record.nodes.row,"rangeGeneration",record.generation);
      setData(record.nodes.row,"rangeSyncState","preview");
      setData(record.nodes.slider,"rangeGeneration",record.generation);
      setData(record.nodes.pane,"rangePreviewActive",true);
      return {key:recordKey,generation:record.generation};
    }
    function stable(record) { return sameNodes(record.nodes,nodeSet(record.context)); }
    function guarded(token,callback) {
      var record=current(token);
      if (!record || !stable(record)) return false;
      callback(record);
      return true;
    }
    function commit(record,payload) {
      if (record.timer != null) window.clearTimeout(record.timer);
      var generation=record.generation,keyValue=record.key;
      record.timer=window.setTimeout(function () {
        var active=records[keyValue];
        if (!active || active.generation !== generation || !stable(active)) return;
        active.timer=null;
        patch(active.nodes,active.projection,active.context.fullDomain,generation,"committed");
        if (typeof options.commitViewport === "function") options.commitViewport(payload,{key:keyValue,generation:generation,mode:active.mode,frontendOnly:true});
      },settleDelay);
    }
    function previewSettings(token,range,projectionOptions) {
      return guarded(token,function (record) {
        var selected=finiteRange(range);
        if (!selected || typeof options.validate === "function" && !options.validate(record.context,range)) return;
        record.mode="explicit";
        record.projection={auto:false,min:selected[0],max:selected[1]};
        patch(record.nodes,record.projection,record.context.fullDomain,record.generation,"preview");
        var update=sync && sync.plotlyProjection ? sync.plotlyProjection(record.projection,record.context.descriptor,projectionOptions || record.context.projectionOptions) : null;
        if (update && typeof options.relayout === "function") options.relayout(record.nodes.plot,update,{generation:record.generation,resize:false,rebuild:false});
      });
    }
    function settleSettings(token) {
      return guarded(token,function (record) {
        if (!record.projection) return;
        patch(record.nodes,record.projection,record.context.fullDomain,record.generation,"settling");
        commit(record,{fieldId:record.context.fieldId,min:record.projection.min,max:record.projection.max,auto:false,generation:record.generation});
      });
    }
    function beginGraph(context) { return begin(context,"graph","explicit"); }
    function projectGraph(token,eventData,terminal,projectionOptions) {
      return guarded(token,function (record) {
        var projected=sync && sync.settingsProjection ? sync.settingsProjection(eventData,record.context.descriptor,projectionOptions || record.context.projectionOptions) : null;
        if (!projected) return;
        record.mode=projected.mode;
        record.projection=projected.mode === "auto" ? {auto:true,min:null,max:null} : {auto:false,min:projected.min,max:projected.max};
        patch(record.nodes,record.projection,record.context.fullDomain,record.generation,terminal ? "settling" : "preview");
        if (terminal) commit(record,{fieldId:record.context.fieldId,min:record.projection.min,max:record.projection.max,auto:record.projection.auto,generation:record.generation});
      });
    }
    function resetMany(contexts) {
      contexts=(contexts || []).filter(Boolean);
      if (!contexts.length) return {generation:sequence,tokens:[]};
      sequence+=1;
      var generation=sequence,created=[],combinedUpdate={},primaryPlot=null;
      contexts.forEach(function (context) {
        var recordKey=key(context),prior=records[recordKey];
        if (prior && prior.timer != null) window.clearTimeout(prior.timer);
        if (prior && typeof options.cancelPreview === "function") options.cancelPreview(context,{generation:prior.generation});
        var record={key:recordKey,generation:generation,source:"reset",mode:"auto",nodes:nodeSet(context),context:context,timer:null,projection:{auto:true,min:null,max:null}};
        records[recordKey]=record;
        if (!primaryPlot) primaryPlot=record.nodes.plot;
        if (typeof options.clearViewportDraft === "function") options.clearViewportDraft(context,{generation:generation,frontendOnly:true});
        patch(record.nodes,record.projection,context.fullDomain,generation,"settling");
        var update=sync && sync.plotlyProjection ? sync.plotlyProjection(record.projection,context.descriptor,context.projectionOptions) : null;
        if (update) Object.keys(update).forEach(function (name) { combinedUpdate[name]=update[name]; });
        if (typeof options.projectLinked === "function") options.projectLinked(context,record.projection,{generation:generation,source:"reset"});
        created.push(record);
      });
      if (primaryPlot && Object.keys(combinedUpdate).length && typeof options.relayout === "function") options.relayout(primaryPlot,combinedUpdate,{generation:generation,source:"reset",resize:false,rebuild:false});
      var timer=window.setTimeout(function () {
        var stableRecords=created.filter(function (record) { return records[record.key] === record && stable(record); });
        if (stableRecords.length !== created.length) return;
        stableRecords.forEach(function (record) { record.timer=null; patch(record.nodes,record.projection,record.context.fullDomain,generation,"committed"); });
        if (typeof options.commitViewport === "function") options.commitViewport({ranges:created.map(function (record) { return {fieldId:record.context.fieldId,min:null,max:null,auto:true}; }),auto:true,generation:generation},{generation:generation,mode:"auto",atomic:true,frontendOnly:true});
      },settleDelay);
      created.forEach(function (record) { record.timer=timer; });
      return {generation:generation,tokens:created.map(function (record) { return {key:record.key,generation:generation}; })};
    }
    function reset(context) {
      var result=resetMany([context]);
      return result.tokens[0] || {key:key(context),generation:result.generation};
    }
    function acceptViewport(context,generation,projection,state) {
      var record=records[key(context)];
      if (!record || record.generation !== Number(generation) || !stable(record)) return false;
      if (record.mode === "auto" && projection && !projection.auto) return false;
      record.projection=record.mode === "auto" ? {auto:true,min:null,max:null} : projection || record.projection;
      patch(record.nodes,record.projection,context.fullDomain,record.generation,state || "ready");
      return true;
    }
    function syncState(context,state) {
      var record=records[key(context)];
      if (!record || !stable(record)) return false;
      patch(record.nodes,record.projection,context.fullDomain,record.generation,state || "ready");
      return true;
    }
    function inspect(context) {
      var record=records[key(context)];
      return record ? {generation:record.generation,source:record.source,mode:record.mode,identityStable:stable(record),projection:record.projection} : null;
    }
    function clear(context) {
      var recordKey=key(context),record=records[recordKey];
      if (!record) return false;
      if (record.timer != null) window.clearTimeout(record.timer);
      if (typeof options.cancelPreview === "function") options.cancelPreview(record.context,{generation:record.generation,cleanup:true});
      delete records[recordKey];
      return true;
    }
    function clearPane(displayId,paneId) {
      var prefix=[displayId || "",paneId || ""].join("::")+"::";
      Object.keys(records).filter(function (recordKey) { return recordKey.indexOf(prefix) === 0; }).forEach(function (recordKey) {
        var record=records[recordKey];
        if (record.timer != null) window.clearTimeout(record.timer);
        if (typeof options.cancelPreview === "function") options.cancelPreview(record.context,{generation:record.generation,cleanup:true});
        delete records[recordKey];
      });
    }

    return {beginSettingsDrag:function (context) { return begin(context,"settings","explicit"); },previewSettings:previewSettings,settleSettings:settleSettings,beginGraph:beginGraph,projectGraph:projectGraph,reset:reset,resetMany:resetMany,acceptViewport:acceptViewport,syncState:syncState,inspect:inspect,clear:clear,clearPane:clearPane};
  }

  window.SignalAnalyserRangeLifecycle={
    create:create,
    selectors:{rangeRow:"[data-setting-id$='limits']",rangeSlider:"[data-screen-range-slider]",pane:"[data-pane-id]",plot:"[data-pane-host]"},
    e2eHooks:["data-range-generation","data-range-sync-state","data-range-preview-active"],
    contract:{
      domIdentity:"Range row, numeric inputs, slider and Plotly host are captured once per generation and must remain the same nodes through preview, frontend viewport commit and ready projection.",
      geometry:"Preview calls Plotly.relayout with resize:false/rebuild:false and never writes pane/plot width, height or overflow; host replacement and settings rerender are forbidden.",
      reset:"Graph/settings double-click creates the latest shared generation, clears the frontend viewport draft, patches blank Auto inputs/full-domain handles in place, relayouts true autorange and commits one frontend-only Auto projection.",
      stale:"Frontend viewport accepts must echo the generation; older generations and an explicit projection after an Auto generation are ignored.",
      zoom:"Manual graph relayouting remains a live selected-unit projection; the programmatic autorange event of reset remains Auto and cannot repin its prior interval.",
      persistence:"Viewport range controls never call settings.publishRange, /api/settings, output refresh, DSP, state_revision or session persistence.",
      cleanup:"On pane or field removal call clearPane/clear to cancel pending timers and preview work before deleting captured node references."
    }
  };
}(window));
