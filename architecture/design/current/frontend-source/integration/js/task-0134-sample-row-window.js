(function registerSignalSamplesRowWindow(window) {
  "use strict";

  var API_BATCH_SIZE = 500;
  var MAX_DOM_ROWS = 1000;
  var PREFETCH_THRESHOLD_ROWS = 100;

  function offset(value, fallback) {
    var number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
  }

  function signalIdFrom(page) {
    return String(page && (page.signal_id || (page.signal && page.signal.id)) || "");
  }

  function create(signalId, token) {
    return {
      signalId:String(signalId || ""),
      token:offset(token, 0),
      rows:[],
      startOffset:0,
      endOffset:0,
      total:0,
      firstBatchLoaded:false,
      pending:{ up:null, down:null },
      error:""
    };
  }

  function requestKey(state, direction, startOffset) {
    return [state.signalId, state.token, direction, startOffset].join(":");
  }

  function begin(state, direction) {
    if (!state || !state.signalId || (direction !== "up" && direction !== "down")) return null;
    if (state.pending[direction]) return null;
    var startOffset;
    if (direction === "up") {
      if (!state.rows.length || state.startOffset === 0) return null;
      startOffset=Math.max(0, state.startOffset - API_BATCH_SIZE);
    } else {
      if (state.rows.length && state.endOffset >= state.total) return null;
      startOffset=state.rows.length ? state.endOffset : 0;
    }
    var request={
      signalId:state.signalId,
      token:state.token,
      direction:direction,
      startOffset:startOffset,
      limit:API_BATCH_SIZE
    };
    request.key=requestKey(state, direction, startOffset);
    state.pending[direction]=request.key;
    state.error="";
    return request;
  }

  function prefetchDirections(state, firstVisibleIndex, lastVisibleIndex) {
    if (!state || !state.signalId) return [];
    if (!state.rows.length) return state.pending.down ? [] : ["down"];
    var first=Math.max(0, offset(firstVisibleIndex, 0));
    var last=Math.max(first, offset(lastVisibleIndex, first));
    var result=[];
    if (state.startOffset > 0 && first <= PREFETCH_THRESHOLD_ROWS && !state.pending.up) result.push("up");
    if (state.endOffset < state.total && last >= Math.max(0, state.rows.length - 1 - PREFETCH_THRESHOLD_ROWS) && !state.pending.down) result.push("down");
    return result;
  }

  function clearPending(state, request) {
    if (state && request && state.pending[request.direction] === request.key) state.pending[request.direction]=null;
  }

  function apply(state, request, page) {
    if (!state || !request || !page) return { accepted:false, reason:"missing" };
    if (request.signalId !== state.signalId || request.token !== state.token) return { accepted:false, reason:"stale-token" };
    if (state.pending[request.direction] !== request.key) return { accepted:false, reason:"stale-request" };
    clearPending(state, request);
    if (signalIdFrom(page) !== state.signalId || !Array.isArray(page.rows)) return { accepted:false, reason:"signal-mismatch" };

    var pageStart=offset(page.start_offset, -1);
    var pageEnd=offset(page.end_offset, -1);
    var total=offset(page.total, -1);
    if (pageStart < 0 || pageEnd < pageStart || total < pageEnd || page.rows.length !== pageEnd - pageStart) {
      return { accepted:false, reason:"invalid-offsets" };
    }
    if (request.startOffset !== pageStart) return { accepted:false, reason:"unexpected-start" };

    var rows, startOffset, endOffset, scrollDeltaRows=0;
    if (!state.rows.length) {
      if (pageStart !== 0 || request.direction !== "down") return { accepted:false, reason:"invalid-initial-window" };
      rows=page.rows.slice();
      startOffset=pageStart;
      endOffset=pageEnd;
    } else if (request.direction === "down") {
      if (pageStart !== state.endOffset) return { accepted:false, reason:"nonadjacent-down" };
      rows=state.rows.concat(page.rows);
      startOffset=state.startOffset;
      endOffset=pageEnd;
      if (rows.length > MAX_DOM_ROWS) {
        var dropFromStart=rows.length - MAX_DOM_ROWS;
        rows=rows.slice(dropFromStart);
        startOffset+=dropFromStart;
        scrollDeltaRows=-dropFromStart;
      }
    } else {
      if (pageEnd !== state.startOffset) return { accepted:false, reason:"nonadjacent-up" };
      rows=page.rows.concat(state.rows);
      startOffset=pageStart;
      endOffset=state.endOffset;
      scrollDeltaRows=page.rows.length;
      if (rows.length > MAX_DOM_ROWS) {
        var dropFromEnd=rows.length - MAX_DOM_ROWS;
        rows=rows.slice(0, rows.length - dropFromEnd);
        endOffset-=dropFromEnd;
      }
    }

    state.rows=rows;
    state.startOffset=startOffset;
    state.endOffset=endOffset;
    state.total=total;
    state.firstBatchLoaded=true;
    state.error="";
    return {
      accepted:true,
      direction:request.direction,
      startOffset:startOffset,
      endOffset:endOffset,
      total:total,
      scrollDeltaRows:scrollDeltaRows,
      footer:footer(state)
    };
  }

  function reject(state, request, message) {
    if (!state || !request || request.signalId !== state.signalId || request.token !== state.token) return false;
    if (state.pending[request.direction] !== request.key) return false;
    clearPending(state, request);
    state.error=String(message || "Не удалось загрузить значения.");
    return true;
  }

  function footer(state) {
    if (!state || !state.rows.length) return "0–0 из " + offset(state && state.total, 0);
    return String(state.startOffset + 1) + "–" + String(state.endOffset) + " из " + String(state.total);
  }

  function scrollCompensation(result, measuredRowHeight) {
    var rowHeight=Number(measuredRowHeight);
    if (!result || !result.accepted || !Number.isFinite(rowHeight) || rowHeight <= 0) return 0;
    return result.scrollDeltaRows * rowHeight;
  }

  window.SignalSamplesRowWindow = {
    API_BATCH_SIZE:API_BATCH_SIZE,
    MAX_DOM_ROWS:MAX_DOM_ROWS,
    PREFETCH_THRESHOLD_ROWS:PREFETCH_THRESHOLD_ROWS,
    create:create,
    begin:begin,
    prefetchDirections:prefetchDirections,
    apply:apply,
    reject:reject,
    footer:footer,
    scrollCompensation:scrollCompensation
  };
}(window));
