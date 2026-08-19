(function standaloneProductionFixture(window, document) {
  "use strict";

  var revision = 30;
  var calculationRevision = 8;
  var nextDisplayOrdinal = 4;
  var fetchLog = [];
  var displays = [
    { id:"display-1", name:"Экран 1", measurement_kinds:["minimum", "maximum", "mean"], peaks_enabled:true, time_limits:{ min_s:0, max_s:0.399999 } },
    { id:"display-3", name:"ВЧ-контроль", measurement_kinds:["minimum", "maximum", "mean"], peaks_enabled:true, time_limits:{ min_s:0, max_s:0.399999 } }
  ];
  var layouts = [
    { display_id:"display-1", layout:{ rows:1, columns:2, active_pane_id:"pane-spectrum", panes:[
      { id:"pane-spectrum", name:"Спектр приёмника", plot_type:"spectrum", signal_bindings:["radarPulse", "echoComplex"] },
      { id:"pane-time", name:"Импульс во времени", plot_type:"time", signal_bindings:["radarPulse"] }
    ] } },
    { display_id:"display-3", layout:{ rows:1, columns:1, active_pane_id:"pane-control", panes:[
      { id:"pane-control", name:"Контрольный спектр", plot_type:"spectrum", signal_bindings:["radarPulse"] }
    ] } }
  ];
  var activeDisplayId = "display-1";
  var mainSignalName = "radarPulse";
  var signals = [
    { id:"signal-radar", name:"radarPulse", color:"#2166df", sample_rate_hz:1000000, sample_count:400000, duration_s:0.399999, data_type:"Вещественный", is_complex:false, visible:true },
    { id:"signal-echo", name:"echoComplex", color:"#e1262e", sample_rate_hz:1000000, sample_count:348000, duration_s:0.347999, data_type:"Комплексный", is_complex:true, visible:true },
    { id:"signal-noise", name:"noiseFloor", color:"#1a8f58", sample_rate_hz:1000000, sample_count:400000, duration_s:0.399999, data_type:"Вещественный", is_complex:false, visible:false }
  ];
  var links = { time:false, amplitude:false, frequency:true, magnitude:false };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function state() {
    return {
      state_revision:revision,
      calculation_revision:calculationRevision,
      active_display_id:activeDisplayId,
      displays:clone(displays),
      layouts:clone(layouts),
      signals:clone(signals),
      measurement_kinds:["minimum", "maximum", "mean"],
      active_plot:"spectrum",
      selected_signal:mainSignalName,
      analysis_signal:mainSignalName,
      row_selected_signal:mainSignalName,
      visible_signals:(activePane() && activePane().signal_bindings || []).slice(),
      time_limits:{ min_s:0, max_s:0.399999 }
    };
  }
  function activeLayout() { return layouts.filter(function (entry) { return entry.display_id === activeDisplayId; })[0]; }
  function activePane() {
    var entry=activeLayout(), id=entry && entry.layout.active_pane_id;
    return entry && entry.layout.panes.filter(function (pane) { return pane.id === id; })[0];
  }
  function field(id, kind, value, extra) {
    return Object.assign({ id:id, label:id, kind:kind, value:value, visible:true, enabled:true, effect_status:"requires_apply" }, extra || {});
  }
  function settingsDocument() {
    var pane=activePane() || { plot_type:"spectrum", name:"Область" };
    return {
      state_revision:revision,
      display_id:activeDisplayId,
      plot_type:pane.plot_type,
      fields:[
        field("pane.name", "string", pane.name),
        field("display.show_legend", "boolean", true),
        field("time.normalize_y", "boolean", false),
        field("time.show_markers", "boolean", false),
        field("time.units", "enum", "milliseconds", { options:["auto", "seconds", "milliseconds", "microseconds", "nanoseconds"] }),
        field("time.x_limits", "optional_range", null),
        field("time.y_limits", "optional_range", null),
        field("time.link_time", "boolean", links.time),
        field("time.link_amplitude", "boolean", links.amplitude),
        field("spectrum.frequency_units", "enum", "kilohertz", { options:["auto", "hertz", "kilohertz", "megahertz", "gigahertz"] }),
        field("spectrum.frequency_limits", "optional_range", null),
        field("spectrum.y_limits", "optional_range", { min:-120, max:null }),
        field("spectrum.link_frequency", "boolean", links.frequency),
        field("spectrum.link_magnitude", "boolean", links.magnitude),
        field("spectrum.frequency_scale", "enum", "linear", { options:["linear", "log"] }),
        field("spectrum.scale", "enum", "db", { options:["db", "linear"] }),
        field("spectrum.resolution_type", "enum", "window_length", { options:["leakage", "rbw", "window_length"] }),
        field("spectrum.leakage", "number", 0.5),
        field("spectrum.rbw", "resolution", { mode:"auto", hz:null }),
        field("spectrum.window_length", "resolution", { mode:"specified", samples:4096 }),
        field("spectrum.window", "enum", "hann", { options:[{ value:"hann", label:"Хэнна" }, { value:"hamming", label:"Хэмминга" }, { value:"blackman", label:"Блэкмана" }] }),
        field("spectrum.sidelobe_attenuation_db", "number", 60),
        field("spectrum.overlap_percent", "number", 50, { units:"%" }),
        field("spectrum.nfft", "resolution", { mode:"specified", nfft:4096 }),
        field("spectrum.frequency_resolution", "readout", "244,14 Гц", { readonly:true, enabled:false })
      ],
      readouts:[],
      screen:{
        "time.link_time":links.time,
        "time.link_amplitude":links.amplitude,
        "spectrum.link_frequency":links.frequency,
        "spectrum.link_magnitude":links.magnitude,
        "time.units":"milliseconds",
        "time.x_limits":null,
        "time.y_limits":null,
        "spectrum.frequency_units":"kilohertz",
        "spectrum.frequency_limits":null,
        "spectrum.y_limits":{ min:-120, max:null }
      }
    };
  }

  function spectrumEnvelope(pane) {
    var x=[], a=[], b=[];
    for (var index=0; index<=120; index++) {
      var f=index * 4.1666667;
      x.push(f);
      a.push(-104 + 92 * Math.exp(-Math.pow((f-184)/32, 2)) + 3*Math.sin(index/5));
      b.push(-112 + 74 * Math.exp(-Math.pow((f-368)/45, 2)) + 2*Math.cos(index/6));
    }
    var data=[
      { type:"scatter", mode:"lines", name:"radarPulse", x:x, y:a, line:{ color:"#2166df", width:2 } },
      { type:"scatter", mode:"lines", name:"echoComplex", x:x, y:b, line:{ color:"#e1262e", width:2 } }
    ];
    var bindings=Array.isArray(pane && pane.signal_bindings) ? pane.signal_bindings : [];
    return { data:data.filter(function (trace) { return bindings.indexOf(trace.name) >= 0; }), layout:{ paper_bgcolor:"#ffffff", plot_bgcolor:"#ffffff", margin:{ l:58, r:22, t:24, b:56 }, xaxis:{ title:{ text:"Частота, кГц" }, range:[0,500], rangeslider:{ visible:true } }, yaxis:{ title:{ text:"Магнитуда, dB" }, range:[-120,0] }, legend:{ x:0.98, y:0.98, xanchor:"right", yanchor:"top", bgcolor:"rgba(255,255,255,0.88)" }, showlegend:true }, config:{ displayModeBar:false } };
  }
  function timeEnvelope(pane) {
    var x=[], y=[];
    for (var index=0; index<=160; index++) { x.push(index*0.0025); y.push(Math.sin(index*0.48)*Math.exp(-index/520)); }
    var data=[{ type:"scatter", mode:"lines", name:"radarPulse", x:x, y:y, line:{ color:"#2166df", width:2 } }];
    var bindings=Array.isArray(pane && pane.signal_bindings) ? pane.signal_bindings : [];
    return { data:data.filter(function (trace) { return bindings.indexOf(trace.name) >= 0; }), layout:{ paper_bgcolor:"#ffffff", plot_bgcolor:"#ffffff", margin:{ l:55, r:22, t:24, b:52 }, xaxis:{ title:{ text:"Время, мс" }, range:[0,0.4], rangeslider:{ visible:true } }, yaxis:{ title:{ text:"Амплитуда" }, range:[-1.1,1.1] }, showlegend:true }, config:{ displayModeBar:false } };
  }
  function outputPayload(path) {
    var query=new URL(path, "https://prototype.invalid/").searchParams;
    var paneId=query.get("pane_id") || (activePane() && activePane().id) || "pane-spectrum";
    var entry=activeLayout();
    var pane=entry && entry.layout.panes.filter(function (item) { return item.id === paneId; })[0] || activePane();
    return { state_revision:revision, calculation_revision:calculationRevision, display_id:activeDisplayId, pane_id:pane.id, plot_type:pane.plot_type, context_key:"prototype-"+pane.id, isready:true, success:true, error:null, data:pane.plot_type === "time" ? timeEnvelope(pane) : spectrumEnvelope(pane) };
  }
  function extremaPayload(path) {
    var query=new URL(path, "https://prototype.invalid/").searchParams;
    var paneId=query.get("pane_id") || (activePane() && activePane().id) || "pane-spectrum";
    return {
      state_revision:revision, calculation_revision:calculationRevision, display_id:activeDisplayId, pane_id:paneId, context_key:"prototype-peaks-"+paneId,
      isready:true, success:true,
      data:{ settings:{ mode:"maxima", number_of_peaks:5, maximum_cutoff:null, minimum_cutoff:null, minimum_distance_samples:1, threshold:0 }, signals:[{ name:"radarPulse", ordinate:"magnitude" }], rows:[
        { row_number:1, signal_name:"radarPulse", signal_color:"#2166df", type:"maximum", value:-3.18, frequency:184.2, frequency_hz:184200, graph_number:1 },
        { row_number:2, signal_name:"radarPulse", signal_color:"#2166df", type:"maximum", value:-18.42, frequency:368.4, frequency_hz:368400, graph_number:2 },
        { row_number:3, signal_name:"echoComplex", signal_color:"#e1262e", type:"maximum", value:-24.1, frequency:452.7, frequency_hz:452700, graph_number:3 }
      ] }
    };
  }
  function summary(path) {
    var id=(/\/api\/signals\/([^/]+)\/summary/.exec(path) || [])[1] || "signal-radar";
    var signal=signals.filter(function (item) { return item.id === id; })[0] || signals[0];
    return { signal_id:signal.id, summary:{ sample_count:signal.sample_count, data_type:signal.data_type, duration_s:String(Number(signal.duration_s * 1000).toFixed(3)).replace(".", ",")+" мс", mean:signal.id === "signal-noise" ? "0,000" : "0,008", minimum:signal.id === "signal-noise" ? "−0,142" : "−0,984", maximum:signal.id === "signal-noise" ? "0,139" : "1,000", rms:signal.id === "signal-noise" ? "0,032" : "0,516" } };
  }
  function samples(path) {
    var query=new URL(path, "https://prototype.invalid/").searchParams;
    var cursor=Math.max(0, Number(query.get("cursor") || 0));
    var limit=Math.max(1, Math.min(24, Number(query.get("limit") || 24)));
    var fixtureTotal=72;
    var rows=[];
    for (var index=cursor; index<Math.min(cursor+limit, fixtureTotal); index++) {
      var value=Math.sin(index*Math.PI/10), magnitude=Math.abs(value);
      rows.push({ sample_index:index, time:index+" мкс", value:value.toFixed(6), magnitude:magnitude.toFixed(6), square:(value*value).toFixed(6) });
    }
    return { signal:{ id:"signal-radar", name:"radarPulse" }, rows:rows, next_cursor:cursor+rows.length < fixtureTotal ? cursor+rows.length : null, total:fixtureTotal };
  }
  function fullState() {
    return Object.assign(state(), { measurement_rows:[{ signal_name:"radarPulse", time_limits:{ min_s:0, max_s:0.399999 }, items:[{ id:"minimum", value:-0.984 }, { id:"maximum", value:1 }, { id:"mean", value:0.008 }] }] });
  }
  function parseBody(options) { try { return JSON.parse(options && options.body || "{}"); } catch (_) { return {}; } }
  function updateDisplays(body) {
    if (body.operation === "select" && displays.some(function (item) { return item.id === body.display_id; })) activeDisplayId=body.display_id;
    if (body.operation === "close" && displays.length > 1) {
      displays=displays.filter(function (item) { return item.id !== body.display_id; });
      layouts=layouts.filter(function (item) { return item.display_id !== body.display_id; });
      if (activeDisplayId === body.display_id) activeDisplayId=displays[0].id;
    }
    if (body.operation === "create") {
      var ordinal=nextDisplayOrdinal++, id="display-"+ordinal;
      displays.push({ id:id, name:"Экран "+ordinal, measurement_kinds:["minimum", "maximum", "mean"], peaks_enabled:false, time_limits:{ min_s:0, max_s:0.399999 } });
      layouts.push({ display_id:id, layout:{ rows:1, columns:1, active_pane_id:"pane-"+ordinal, panes:[{ id:"pane-"+ordinal, name:"Область "+ordinal, plot_type:"time", signal_bindings:["radarPulse"] }] } });
      activeDisplayId=id;
    }
    revision+=1;
    return state();
  }
  function updateLayout(body) {
    var entry=activeLayout();
    if (!entry) return state();
    if (body.operation === "select_pane" && entry.layout.panes.some(function (pane) { return pane.id === body.pane_id; })) entry.layout.active_pane_id=body.pane_id;
    if (body.operation === "update_pane") {
      var pane=entry.layout.panes.filter(function (item) { return item.id === body.pane_id; })[0];
      if (pane) {
        if (Array.isArray(body.signal_bindings)) pane.signal_bindings=body.signal_bindings.slice();
        if (typeof body.plot_type === "string") pane.plot_type=body.plot_type;
      }
    }
    revision+=1;
    return state();
  }
  function json(payload, status) { return new Response(JSON.stringify(payload), { status:status || 200, headers:{ "Content-Type":"application/json" } }); }
  function normalizedPath(input) {
    var raw=typeof input === "string" ? input : input && input.url || "";
    try { var url=new URL(raw, "https://prototype.invalid/"); return url.pathname.replace(/^\/public\//, "/") + url.search; }
    catch (_) { return raw.replace(/^\.\//, "/"); }
  }

  window.fetch=function (input, options) {
    var path=normalizedPath(input), method=String(options && options.method || "GET").toUpperCase(), body=parseBody(options);
    fetchLog.push({ path:path, method:method, at:Date.now() });
    if (/\/api\/state-lite(?:\?|$)/.test(path)) return Promise.resolve(json(state()));
    if (/\/api\/state(?:\?|$)/.test(path)) return Promise.resolve(json(fullState()));
    if (/\/api\/settings(?:\?|$)/.test(path) && method === "GET") return Promise.resolve(json(settingsDocument()));
    if (/\/api\/settings(?:\?|$)/.test(path) && method === "POST") {
      if (body.field_id === "time.link_time") links.time=!!body.value;
      if (body.field_id === "time.link_amplitude") links.amplitude=!!body.value;
      if (body.field_id === "spectrum.link_frequency") links.frequency=!!body.value;
      if (body.field_id === "spectrum.link_magnitude") links.magnitude=!!body.value;
      revision+=1; return Promise.resolve(json({ state:state(), settings:settingsDocument() }));
    }
    if (/\/api\/settings\/apply(?:\?|$)/.test(path)) { revision+=1; return Promise.resolve(json({ success:true, state:state(), settings:settingsDocument() })); }
    if (/\/api\/outputs\/active/.test(path)) return Promise.resolve(json(outputPayload(path)));
    if (/\/api\/peaks\/active/.test(path)) return Promise.resolve(json(extremaPayload(path)));
    if (/\/api\/peaks\/settings/.test(path)) { revision+=1; return Promise.resolve(json({ state:state() })); }
    if (/\/api\/signals\/[^/]+\/summary/.test(path)) return Promise.resolve(json(summary(path)));
    if (/\/api\/signals\/[^/]+\/samples/.test(path)) return Promise.resolve(json(samples(path)));
    if (/\/api\/signals\/derive/.test(path)) {
      if (body.operation === "custom" && /missing_variable/.test(body.body || "")) return Promise.resolve(json({ error:"Engee: имя missing_variable не определено." }, 422));
      return new Promise(function (resolve) { window.setTimeout(function () { resolve(json({ state:state(), created_signal_id:"derived-prototype" })); }, 420); });
    }
    if (/\/api\/signals(?:\?|$)/.test(path)) { revision+=1; return Promise.resolve(json({ state:state() })); }
    if (/\/api\/displays(?:\?|$)/.test(path)) return Promise.resolve(json(updateDisplays(body)));
    if (/\/api\/layouts(?:\?|$)/.test(path)) return Promise.resolve(json(updateLayout(body)));
    if (/\/api\/view(?:\?|$)/.test(path)) { var display=displays.filter(function (item) { return item.id === activeDisplayId; })[0]; if (display && body.peaks_enabled !== undefined) display.peaks_enabled=!!body.peaks_enabled; if (typeof body.row_selected_signal === "string") mainSignalName=body.row_selected_signal; revision+=1; return Promise.resolve(json(state())); }
    if (/\/api\/workspace\/variables/.test(path)) return Promise.resolve(json({ variables:[], cached:true }));
    return Promise.resolve(json({ error:"Standalone prototype has no fixture for "+method+" "+path }, 404));
  };

  function axisRange(traceValues, fallback) {
    var values=[];
    (traceValues || []).forEach(function (trace) { (trace || []).forEach(function (value) { if (Number.isFinite(Number(value))) values.push(Number(value)); }); });
    return values.length ? [Math.min.apply(Math, values), Math.max.apply(Math, values)] : fallback;
  }
  function renderPlot(host, traces, layout) {
    var width=Math.max(320, host.clientWidth || 640), height=Math.max(210, host.clientHeight || 320), pad={ l:58, r:22, t:22, b:54 };
    var xRange=layout && layout.xaxis && layout.xaxis.range || axisRange(traces.map(function (trace) { return trace.x; }), [0,1]);
    var yRange=layout && layout.yaxis && layout.yaxis.range || axisRange(traces.map(function (trace) { return trace.y; }), [-1,1]);
    var plotWidth=width-pad.l-pad.r, plotHeight=height-pad.t-pad.b;
    function px(value) { return pad.l+(Number(value)-xRange[0])/(xRange[1]-xRange[0]||1)*plotWidth; }
    function py(value) { return pad.t+plotHeight-(Number(value)-yRange[0])/(yRange[1]-yRange[0]||1)*plotHeight; }
    var grid="";
    for (var index=0; index<=4; index++) { var gx=pad.l+plotWidth*index/4, gy=pad.t+plotHeight*index/4; grid+="<path d='M"+gx+" "+pad.t+"V"+(pad.t+plotHeight)+" M"+pad.l+" "+gy+"H"+(pad.l+plotWidth)+"'/>"; }
    var lines=traces.filter(function (trace) { return !trace.meta || !trace.meta.signal_analyser_peaks_overlay; }).map(function (trace) {
      var points=(trace.x || []).map(function (x, index) { return px(x).toFixed(2)+","+py((trace.y || [])[index]).toFixed(2); }).join(" ");
      return "<polyline points='"+points+"' fill='none' stroke='"+((trace.line && trace.line.color) || "#2166df")+"' stroke-width='2' vector-effect='non-scaling-stroke'/>";
    }).join("");
    var markers=traces.filter(function (trace) { return trace.meta && trace.meta.signal_analyser_peaks_overlay; }).map(function (trace) { return (trace.x || []).map(function (x,index) { return "<g transform='translate("+px(x)+" "+py((trace.y || [])[index])+")'><path d='M0 -7 L7 5 L-7 5 Z' fill='"+((trace.marker && trace.marker.color) || "#2166df")+"'/><text y='-10' text-anchor='middle' font-size='11'>"+((trace.text || [])[index] || "")+"</text></g>"; }).join(""); }).join("");
    host.innerHTML="<svg class='prototype-plot-svg' viewBox='0 0 "+width+" "+height+"' width='100%' height='100%' aria-label='Локальный макет графика'><g stroke='#e5e8eb' stroke-width='1'>"+grid+"</g><path d='M"+pad.l+" "+pad.t+"V"+(pad.t+plotHeight)+"H"+(pad.l+plotWidth)+"' fill='none' stroke='#61676c'/>"+lines+markers+"<text x='"+(pad.l+plotWidth/2)+"' y='"+(height-12)+"' text-anchor='middle' font-size='13' fill='#3a3d40'>"+((layout.xaxis && layout.xaxis.title && layout.xaxis.title.text) || "X")+"</text><text transform='translate(16 "+(pad.t+plotHeight/2)+") rotate(-90)' text-anchor='middle' font-size='13' fill='#3a3d40'>"+((layout.yaxis && layout.yaxis.title && layout.yaxis.title.text) || "Y")+"</text></svg>";
  }
  window.Plotly={
    version:"standalone-fixture",
    react:function (host, traces, layout) {
      host.classList.add("js-plotly-plot"); host.data=clone(traces || []); host.layout=clone(layout || {});
      host._fullLayout={ xaxis:{ visible:true, range:(layout.xaxis && layout.xaxis.range || [0,1]).slice(), autorange:false, rangeslider:clone(layout.xaxis && layout.xaxis.rangeslider || {}) }, yaxis:{ visible:true, range:(layout.yaxis && layout.yaxis.range || [-1,1]).slice(), autorange:false }, dragmode:"zoom" };
      host.on=function (name, callback) { (host.__plotlyEvents || (host.__plotlyEvents={}))[name]=callback; return host; };
      renderPlot(host, host.data, host.layout); return Promise.resolve(host);
    },
    relayout:function (host, update) { host.layout=Object.assign(host.layout || {}, update || {}); return Promise.resolve(host); },
    addTraces:function (host, traces) { host.data=(host.data || []).concat(clone(traces || [])); renderPlot(host, host.data, host.layout || {}); return Promise.resolve(host); },
    deleteTraces:function (host, indexes) { var remove={}; (indexes || []).forEach(function (index) { remove[index]=true; }); host.data=(host.data || []).filter(function (_,index) { return !remove[index]; }); renderPlot(host, host.data, host.layout || {}); return Promise.resolve(host); },
    purge:function (host) { host.innerHTML=""; host.data=[]; },
    Plots:{ resize:function () {} }
  };

  window.SignalAnalyserPrototypeEvidence={
    fixture:"production-dom-css-components",
    fetchLog:fetchLog,
    networkRequests:function () { return performance.getEntriesByType("resource").filter(function (entry) { return /^https?:/i.test(entry.name); }); },
    state:state
  };
  document.documentElement.dataset.prototypeMode="standalone-production-fixture";
  window.addEventListener("load", function () {
    var attempts=0;
    function prepareApprovedDefault() {
      attempts+=1;
      var shell=document.querySelector("[data-testid='app-shell']");
      var area=document.querySelector("[data-testid='settings-tab-display']");
      var signal=document.querySelector("[data-testid='settings-tab-signal']");
      if (!shell || !shell.dataset.stateRevision || !area || !signal) {
        if (attempts < 80) window.setTimeout(prepareApprovedDefault, 25);
        return;
      }
      area.click();
      window.setTimeout(function () {
        var frequency=document.querySelector("[data-spectrum-slider-axis='x']");
        if (frequency && !frequency.checked) frequency.click();
        window.setTimeout(function () {
          var magnitude=document.querySelector("[data-spectrum-slider-axis='y']");
          if (magnitude && !magnitude.checked) magnitude.click();
          window.setTimeout(function () {
            var signalTab=document.querySelector("[data-testid='settings-tab-signal']");
            if (signalTab) signalTab.click();
            document.documentElement.dataset.designReady="true";
          }, 40);
        }, 40);
      }, 40);
    }
    prepareApprovedDefault();
  });
}(window, document));
