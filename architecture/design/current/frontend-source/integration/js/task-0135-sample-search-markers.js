(function registerSignalSamplesSearchMarkers(window) {
  "use strict";

  var PAGE_SIZE = 500;
  var CENTER_BEFORE = 250;

  function safeOffset(value, fallback) {
    var number=Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
  }

  function signalIdFrom(page) {
    return String(page && (page.signal_id || (page.signal && page.signal.id)) || "");
  }

  function centeredStart(target, total) {
    var lastStart=Math.max(0, total - PAGE_SIZE);
    return Math.min(Math.max(0, target - CENTER_BEFORE), lastStart);
  }

  function intent(rawValue, totalValue) {
    var raw=String(rawValue == null ? "" : rawValue).trim();
    var total=safeOffset(totalValue, -1);
    if (total < 0) return { valid:false, state:"error", message:"Не удалось определить диапазон точек." };
    if (!raw) return { valid:true, kind:"reset", target:null, startOffset:0, limit:PAGE_SIZE };
    if (!/^\d+$/.test(raw)) return { valid:false, state:"error", message:"Введите целое неотрицательное число." };
    var target=Number(raw);
    if (!Number.isSafeInteger(target)) return { valid:false, state:"error", message:"Введите целое неотрицательное число." };
    if (target >= total) {
      return { valid:false, state:"error", message:total ? "Доступны номера от 0 до " + String(total - 1) + "." : "В сигнале нет точек." };
    }
    return { valid:true, kind:"target", target:target, startOffset:centeredStart(target, total), limit:PAGE_SIZE };
  }

  function begin(state, rawValue) {
    if (!state || !state.signalId) return { accepted:false, state:"error", message:"Сигнал не выбран." };
    var parsed=intent(rawValue, state.total);
    if (!parsed.valid) return parsed;
    state.token=safeOffset(state.token, 0) + 1;
    state.pending=state.pending || {};
    state.pending.up=null;
    state.pending.down=null;
    var request={
      signalId:state.signalId,
      token:state.token,
      direction:"replace",
      kind:parsed.kind,
      target:parsed.target,
      startOffset:parsed.startOffset,
      limit:PAGE_SIZE
    };
    request.key=[request.signalId, request.token, request.direction, request.startOffset].join(":");
    state.pending.search=request.key;
    state.error="";
    return { accepted:true, request:request, state:"loading", message:"" };
  }

  function apply(state, request, page) {
    if (!state || !request || !page) return { accepted:false, reason:"missing" };
    if (request.signalId !== state.signalId || request.token !== state.token) return { accepted:false, reason:"stale-token" };
    if (!state.pending || state.pending.search !== request.key) return { accepted:false, reason:"stale-request" };
    state.pending.search=null;
    if (signalIdFrom(page) !== state.signalId || !Array.isArray(page.rows)) return { accepted:false, reason:"signal-mismatch" };
    var start=safeOffset(page.start_offset, -1);
    var end=safeOffset(page.end_offset, -1);
    var total=safeOffset(page.total, -1);
    if (start !== request.startOffset || start < 0 || end < start || total < end || page.rows.length !== end - start || page.rows.length > PAGE_SIZE) {
      return { accepted:false, reason:"invalid-offsets" };
    }
    if (request.target != null && (request.target < start || request.target >= end || request.target >= total)) return { accepted:false, reason:"target-missing" };
    state.rows=page.rows.slice();
    state.startOffset=start;
    state.endOffset=end;
    state.total=total;
    state.firstBatchLoaded=true;
    state.error="";
    return {
      accepted:true,
      startOffset:start,
      endOffset:end,
      total:total,
      target:request.target,
      rowSelector:request.target == null ? null : "tr[data-sample-index=\"" + String(request.target) + "\"]",
      scroll:"focus-and-center",
      scrollTop:request.target == null ? 0 : null,
      state:"ready",
      message:""
    };
  }

  function reject(state, request) {
    if (!state || !request || request.signalId !== state.signalId || request.token !== state.token || !state.pending || state.pending.search !== request.key) return false;
    state.pending.search=null;
    state.error=request.target == null ? "Не удалось загрузить начало сигнала." : "Не удалось загрузить точку " + String(request.target) + ".";
    return true;
  }

  function normalizeType(value) {
    var type=String(value || "").toLowerCase();
    if (type === "maximum" || type === "max" || type === "максимум") return "maximum";
    if (type === "minimum" || type === "min" || type === "минимум") return "minimum";
    return "";
  }

  function markerMap(options) {
    var result={};
    var record=options && options.record;
    var signalId=String(options && options.signalId || "");
    var signalName=String(options && options.signalName || "");
    var matches=options && typeof options.signalMatches === "function" ? options.signalMatches : function (candidate, expected) { return String(candidate || "") === String(expected || ""); };
    if (!options || String(options.plotType || "").toLowerCase() !== "time" || !signalId || !record || record.calculated !== true || record.pending || record.error) return result;
    if (String(record.displayId || "") !== String(options.displayId || "") || String(record.paneId || "") !== String(options.paneId || "")) return result;
    var rows=record.data && Array.isArray(record.data.rows) ? record.data.rows : [];
    rows.forEach(function (row, responseIndex) {
      if (!matches(row && row.signal_name, signalName)) return;
      var sampleIndex=safeOffset(row && row.sample_index, -1);
      var type=normalizeType(row && row.type);
      var graphNumber=Number(row && row.graph_number);
      if (sampleIndex < 0 || !type || !Number.isFinite(graphNumber)) return;
      var candidate={ sampleIndex:sampleIndex, type:type, graphNumber:graphNumber, color:String(row.signal_color || ""), responseIndex:responseIndex };
      var current=result[sampleIndex];
      if (!current || candidate.graphNumber < current.graphNumber || (candidate.graphNumber === current.graphNumber && candidate.responseIndex < current.responseIndex)) result[sampleIndex]=candidate;
    });
    return result;
  }

  window.SignalSamplesSearchMarkers = {
    PAGE_SIZE:PAGE_SIZE,
    CENTER_BEFORE:CENTER_BEFORE,
    centeredStart:centeredStart,
    intent:intent,
    begin:begin,
    apply:apply,
    reject:reject,
    markerMap:markerMap,
    searchMarkup:{
      rowClass:"inspector-search-row samples-point-search-row",
      input:{ type:"search", inputmode:"numeric", placeholder:"Введите номер точки", testid:"sample-point-search-input", autocomplete:"off" },
      submit:{ event:"keydown", key:"Enter", emptyValue:"reset-first-page" },
      status:{ testid:"sample-point-search-status", role:"alert", ariaLive:"assertive", errorOnly:true }
    },
    pointCellOrder:"point number first at left, then marker",
    markerRule:"TIME-only successful exact active display/pane record; filter row.signal_name through signalMatches or exact name fallback; lowest finite graph_number wins, then provider response order",
    clearingRule:"Clearing input alone does not request; Enter with empty value resets to the first 500-row page"
  };
}(window));
