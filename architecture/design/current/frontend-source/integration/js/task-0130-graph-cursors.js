(function task0130GraphCursors(window, document) {
  "use strict";

  var MODE_OFF="off", MODE_SINGLE="single", MODE_DUAL="dual";

  function finite(value) { return Number.isFinite(Number(value)); }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function formatNumber(value) {
    if (!finite(value)) return "—";
    var number=Number(value), absolute=Math.abs(number);
    if (absolute !== 0 && (absolute >= 1e6 || absolute < 1e-4)) return number.toExponential(4);
    return String(Number(number.toPrecision(7)));
  }
  function titleText(axis) {
    var title=axis && axis.title;
    return typeof title === "string" ? title : title && title.text || "";
  }
  function axisUnit(axis) {
    var text=titleText(axis), parts=text.split(",");
    return parts.length > 1 ? parts.slice(1).join(",").trim() : "";
  }
  function visibleTraces(host) {
    return (host && Array.isArray(host.data) ? host.data : []).filter(function (trace) {
      return trace && trace.visible !== false && trace.visible !== "legendonly" &&
        !(trace.meta && trace.meta.signal_analyser_peaks_overlay) &&
        Array.isArray(trace.x) && Array.isArray(trace.y) && trace.x.length && trace.y.length;
    });
  }
  function closestIndex(values, target) {
    var low=0, high=values.length-1;
    if (!values.length) return -1;
    if (Number(values[low]) >= target) return low;
    if (Number(values[high]) <= target) return high;
    while (high-low > 1) {
      var middle=(low+high)>>1;
      if (Number(values[middle]) < target) low=middle; else high=middle;
    }
    return Math.abs(Number(values[low])-target) <= Math.abs(Number(values[high])-target) ? low : high;
  }
  function nearestPoint(trace, target) {
    var index=closestIndex(trace.x || [], target);
    return index < 0 ? null : { index:index, x:Number(trace.x[index]), y:trace.y[index] };
  }
  function nearestX(host, target) {
    var best=null;
    visibleTraces(host).forEach(function (trace) {
      var point=nearestPoint(trace, target);
      if (point && finite(point.x) && (best === null || !finite(best) || Math.abs(point.x-target) < Math.abs(best-target))) best=point.x;
    });
    return best;
  }
  function adjacentX(host,current,direction,domain) {
    var best=null, epsilon=Math.max(1,Math.abs(current))*1e-12;
    visibleTraces(host).forEach(function (trace) {
      var values=trace.x || [], index=closestIndex(values,current);
      if (index < 0) return;
      if (direction > 0) {
        while (index < values.length && Number(values[index]) <= current+epsilon) index+=1;
        if (index < values.length) {
          var next=Number(values[index]);
          if (next <= domain[1] && (!finite(best) || next < best)) best=next;
        }
      } else {
        while (index >= 0 && Number(values[index]) >= current-epsilon) index-=1;
        if (index >= 0) {
          var previous=Number(values[index]);
          if (previous >= domain[0] && (!finite(best) || previous > best)) best=previous;
        }
      }
    });
    return finite(best) ? best : current;
  }
  function fullAxis(host) { return host && host._fullLayout && host._fullLayout.xaxis || host && host.layout && host.layout.xaxis || {}; }
  function visibleDomain(host) {
    var axis=fullAxis(host), range=Array.isArray(axis.range) ? axis.range.slice(0,2).map(Number) : null;
    if (range && axis.type === "log") range=range.map(function (value) { return Math.pow(10,value); });
    if (!range || !finite(range[0]) || !finite(range[1])) {
      var values=[];
      visibleTraces(host).forEach(function (trace) { trace.x.forEach(function (value) { if (finite(value)) values.push(Number(value)); }); });
      if (!values.length) return null;
      range=[Math.min.apply(Math,values),Math.max.apply(Math,values)];
    }
    return range[0] <= range[1] ? range : [range[1],range[0]];
  }
  function geometry(host) {
    var full=host && host._fullLayout || {}, size=full._size || {}, rect=host.getBoundingClientRect();
    var left=finite(size.l) ? Number(size.l) : Math.max(38, Number(full.margin && full.margin.l) || 58);
    var top=finite(size.t) ? Number(size.t) : Math.max(8, Number(full.margin && full.margin.t) || 22);
    var width=finite(size.w) ? Number(size.w) : Math.max(1, rect.width-left-(Number(full.margin && full.margin.r) || 22));
    var height=finite(size.h) ? Number(size.h) : Math.max(1, rect.height-top-(Number(full.margin && full.margin.b) || 54));
    return {left:left,top:top,width:width,height:height};
  }
  function valueToPixel(host, value) {
    var axis=fullAxis(host), box=geometry(host), domain=visibleDomain(host);
    if (!domain) return box.left;
    if (axis && typeof axis.d2p === "function") {
      var nativePixel=Number(axis.d2p(value));
      if (finite(nativePixel)) return box.left+nativePixel;
    }
    var start=domain[0], end=domain[1], transformed=value;
    if (axis.type === "log") { start=Math.log10(start); end=Math.log10(end); transformed=Math.log10(value); }
    return box.left+clamp((transformed-start)/(end-start || 1),0,1)*box.width;
  }
  function pixelToValue(host, clientX) {
    var rect=host.getBoundingClientRect(), axis=fullAxis(host), box=geometry(host), domain=visibleDomain(host);
    if (!domain) return null;
    var local=clamp(clientX-rect.left-box.left,0,box.width);
    if (axis && typeof axis.p2d === "function") {
      var nativeValue=Number(axis.p2d(local));
      if (finite(nativeValue)) return nativeValue;
    }
    var ratio=local/(box.width || 1);
    if (axis.type === "log") return Math.pow(10,Math.log10(domain[0])+(Math.log10(domain[1])-Math.log10(domain[0]))*ratio);
    return domain[0]+(domain[1]-domain[0])*ratio;
  }
  function snapWithin(host, target) {
    var domain=visibleDomain(host);
    if (!domain) return null;
    var clamped=clamp(Number(target),domain[0],domain[1]), snapped=nearestX(host,clamped);
    return finite(snapped) ? clamp(snapped,domain[0],domain[1]) : clamped;
  }
  function initialValues(host, mode, previous) {
    var domain=visibleDomain(host);
    if (!domain) return [];
    var first=previous && finite(previous[0]) ? snapWithin(host,previous[0]) : snapWithin(host,domain[0]+(domain[1]-domain[0])*(mode === MODE_DUAL ? 1/3 : 1/2));
    if (mode === MODE_SINGLE) return [first];
    var second=previous && finite(previous[1]) ? snapWithin(host,previous[1]) : snapWithin(host,domain[0]+(domain[1]-domain[0])*2/3);
    return [first,second];
  }
  function readoutMarkup(host, values) {
    var axis=fullAxis(host), unit=axisUnit(axis), x=function (value) { return formatNumber(value)+(unit ? " "+unit : ""); };
    var header=values.length === 1 ? "<span>X: "+x(values[0])+"</span>" : "<span>X1: "+x(values[0])+"</span><span>X2: "+x(values[1])+"</span><span>ΔX: "+x(Math.abs(values[1]-values[0]))+"</span>";
    var rows=visibleTraces(host).map(function (trace) {
      var points=values.map(function (value) { return nearestPoint(trace,value); });
      var valueText=points.map(function (point,index) { return (values.length > 1 ? "Y"+(index+1)+": " : "")+formatNumber(point && point.y); }).join(" · ");
      return "<div class='plot-cursor-readout-row'><span>"+String(trace.name || "Сигнал").replace(/[&<>\"]/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[c];})+"</span><span class='plot-cursor-readout-values'>"+valueText+"</span></div>";
    }).join("");
    return "<div class='plot-cursor-readout-header'>"+header+"</div>"+rows;
  }

  function createController() {
    var records={};
    function record(key) { return records[key] || (records[key]={mode:MODE_OFF,values:[],host:null,overlay:null}); }
    function removeOverlay(entry) { if (entry.overlay && entry.overlay.isConnected) entry.overlay.remove(); entry.overlay=null; entry.host=null; }
    function update(key) {
      var entry=record(key), host=entry.host;
      if (!host || !host.isConnected || entry.mode === MODE_OFF || !visibleTraces(host).length) { removeOverlay(entry); return; }
      var domain=visibleDomain(host);
      if (!domain) { removeOverlay(entry); return; }
      entry.values=initialValues(host,entry.mode,entry.values);
      var box=geometry(host), overlay=entry.overlay;
      if (!overlay || !overlay.isConnected) {
        overlay=document.createElement("div");
        overlay.className="plot-cursor-layer";
        overlay.dataset.graphCursorOverlay=key;
        overlay.dataset.testid="graph-cursor-overlay";
        host.parentElement.appendChild(overlay);
        entry.overlay=overlay;
      }
      overlay.dataset.cursorMode=entry.mode;
      if (overlay.querySelectorAll(".plot-cursor-line").length !== entry.values.length || !overlay.querySelector(".plot-cursor-readout")) {
        overlay.innerHTML=entry.values.map(function (_,index) {
          return "<button class='plot-cursor-line' type='button' role='slider' data-cursor-index='"+index+"' data-cursor-label='"+(index+1)+"' aria-label='Курсор "+(index+1)+"'></button>";
        }).join("")+"<div class='plot-cursor-readout' role='status' aria-live='polite'></div>";
      }
      entry.values.forEach(function (value,index) {
        var line=overlay.querySelector("[data-cursor-index='"+index+"']");
        line.style.left=valueToPixel(host,value)+"px";
        line.style.top=box.top+"px";
        line.style.height=box.height+"px";
        line.setAttribute("aria-valuemin",String(domain[0]));
        line.setAttribute("aria-valuemax",String(domain[1]));
        line.setAttribute("aria-valuenow",String(value));
        line.setAttribute("aria-valuetext",formatNumber(value)+(axisUnit(fullAxis(host)) ? " "+axisUnit(fullAxis(host)) : ""));
      });
      var readout=overlay.querySelector(".plot-cursor-readout");
      readout.style.left=(box.left+8)+"px";
      readout.style.top=(box.top+8)+"px";
      readout.innerHTML=readoutMarkup(host,entry.values);
    }
    function setMode(key, host, mode) {
      var entry=record(key), next=mode === entry.mode ? MODE_OFF : mode;
      entry.mode=next;
      entry.host=host || entry.host;
      if (next === MODE_OFF) { entry.values=[]; removeOverlay(entry); }
      else { entry.values=initialValues(entry.host,next,entry.values); update(key); }
      return next;
    }
    function attach(key,host) { var entry=record(key); entry.host=host; if (entry.mode !== MODE_OFF) update(key); }
    function clear(key) { var entry=record(key); entry.mode=MODE_OFF; entry.values=[]; removeOverlay(entry); }
    function mode(key) { return record(key).mode; }
    function syncMenu(menu,key,eligible) {
      if (!menu) return;
      menu.querySelectorAll("[data-plot-cursor-mode]").forEach(function (button) {
        var checked=eligible && button.dataset.plotCursorMode === mode(key);
        button.disabled=!eligible;
        button.setAttribute("aria-checked",String(checked));
        button.setAttribute("aria-label",eligible ? button.querySelector("span:nth-of-type(2)").textContent : "Курсоры доступны только для загруженной временной области или спектра");
        button.title=eligible ? "" : "Доступно только для загруженной временной области или спектра";
      });
    }
    function moveFromClient(key,index,clientX) {
      var entry=record(key), value=entry.host && pixelToValue(entry.host,clientX), snapped=entry.host && snapWithin(entry.host,value);
      if (!finite(snapped)) return;
      entry.values[index]=snapped;
      update(key);
    }
    function step(key,index,direction,toEdge) {
      var entry=record(key), host=entry.host, domain=host && visibleDomain(host);
      if (!domain) return;
      var target=toEdge === "start" ? domain[0] : toEdge === "end" ? domain[1] : adjacentX(host,entry.values[index],direction,domain);
      var snapped=snapWithin(host,target);
      if (finite(snapped)) { entry.values[index]=snapped; update(key); }
    }
    document.addEventListener("pointerdown",function (event) {
      var line=event.target.closest && event.target.closest(".plot-cursor-line");
      if (!line) return;
      var overlay=line.closest("[data-graph-cursor-overlay]"), key=overlay && overlay.dataset.graphCursorOverlay;
      if (!key) return;
      event.preventDefault(); event.stopPropagation();
      line.classList.add("is-dragging");
      if (line.setPointerCapture && event.pointerId !== undefined) line.setPointerCapture(event.pointerId);
      moveFromClient(key,Number(line.dataset.cursorIndex),event.clientX);
    },true);
    document.addEventListener("pointermove",function (event) {
      var line=event.target.closest && event.target.closest(".plot-cursor-line.is-dragging");
      if (!line) return;
      var overlay=line.closest("[data-graph-cursor-overlay]");
      event.preventDefault(); event.stopPropagation();
      moveFromClient(overlay.dataset.graphCursorOverlay,Number(line.dataset.cursorIndex),event.clientX);
    },true);
    document.addEventListener("pointerup",function (event) {
      var line=event.target.closest && event.target.closest(".plot-cursor-line.is-dragging");
      if (!line) return;
      event.preventDefault(); event.stopPropagation(); line.classList.remove("is-dragging");
    },true);
    document.addEventListener("keydown",function (event) {
      var line=event.target.closest && event.target.closest(".plot-cursor-line");
      if (!line || ["ArrowLeft","ArrowRight","Home","End"].indexOf(event.key)<0) return;
      var overlay=line.closest("[data-graph-cursor-overlay]"), key=overlay.dataset.graphCursorOverlay, index=Number(line.dataset.cursorIndex);
      event.preventDefault(); event.stopPropagation();
      step(key,index,event.key === "ArrowLeft" ? -1 : 1,event.key === "Home" ? "start" : event.key === "End" ? "end" : "");
      window.requestAnimationFrame(function () { var restored=document.querySelector("[data-graph-cursor-overlay='"+CSS.escape(key)+"'] [data-cursor-index='"+index+"']"); if (restored) restored.focus(); });
    },true);
    return { setMode:setMode, mode:mode, attach:attach, update:update, clear:clear, syncMenu:syncMenu };
  }

  function ensureMenuItems(menu) {
    if (!menu || menu.querySelector("[data-plot-cursor-mode]")) return;
    var help=menu.querySelector("[data-plot-help]");
    var markup="<button type='button' role='menuitemcheckbox' data-plot-cursor-mode='single' data-testid='pane-menu-cursor' aria-checked='false'><span class='cursor-menu-icon' aria-hidden='true'></span><span>Курсор</span><img class='plot-menu-check' src='./icons/tick-figma.svg' alt=''></button>"+
      "<button type='button' role='menuitemcheckbox' data-plot-cursor-mode='dual' data-testid='pane-menu-dual-cursor' aria-checked='false'><span class='cursor-menu-icon is-dual' aria-hidden='true'></span><span>Два курсора</span><img class='plot-menu-check' src='./icons/tick-figma.svg' alt=''></button>";
    if (help) help.insertAdjacentHTML("beforebegin",markup); else menu.insertAdjacentHTML("beforeend",markup);
  }

  window.SignalAnalyserGraphCursorUI={
    modes:{off:MODE_OFF,single:MODE_SINGLE,dual:MODE_DUAL},
    ensureMenuItems:ensureMenuItems,
    createController:createController
  };
}(window,document));
