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

(function registerSignalAnalyserBootstrapLoading(window, document) {
  "use strict";

  var DEFAULT_TIMEOUT_MS=20000;
  var sequence=0;
  var current=null;
  var timer=null;
  var retryBound=false;

  function query(selector) { return document.querySelector(selector); }
  function hostNodes() {
    var host=query(".app-status"), shell=query("[data-testid='app-shell']"), loading=query("[data-testid='app-loading']"), error=query("[data-testid='app-error']"), retry=query("[data-retry]");
    if (!host || !shell || !loading || !error || !retry) return null;
    var spinner=loading.querySelector(".app-bootstrap-spinner");
    if (!spinner) {
      spinner=document.createElement("span");
      spinner.className="app-bootstrap-spinner";
      spinner.dataset.testid="app-bootstrap-spinner";
      spinner.setAttribute("aria-hidden","true");
      loading.insertBefore(spinner,loading.firstChild);
    }
    loading.setAttribute("aria-live","polite");
    loading.setAttribute("aria-atomic","true");
    error.setAttribute("aria-live","assertive");
    error.setAttribute("aria-atomic","true");
    return {host:host,shell:shell,loading:loading,error:error,retry:retry};
  }
  function matches(token) { return !!current && String(token || "") === current.token; }
  function setShellBlocked(nodes,blocked,busy) {
    nodes.shell.inert=!!blocked;
    if (busy) nodes.shell.setAttribute("aria-busy","true");
    else nodes.shell.removeAttribute("aria-busy");
  }
  function project(phase) {
    var nodes=hostNodes();
    if (!nodes) return false;
    var active=phase === "loading" || phase === "error";
    nodes.host.hidden=!active;
    nodes.host.dataset.bootstrapActive=String(active);
    nodes.host.dataset.bootstrapPhase=phase;
    nodes.loading.hidden=phase !== "loading";
    nodes.error.hidden=phase !== "error";
    setShellBlocked(nodes,active,phase === "loading");
    var loadingText=nodes.loading.querySelector("[data-loading-text]");
    if (loadingText) loadingText.textContent="Загрузка данных…";
    var errorText=nodes.error.querySelector("[data-error-text]");
    if (errorText) errorText.textContent="Не удалось загрузить данные анализатора. Проверьте соединение и повторите попытку.";
    if (phase === "error" && window.requestAnimationFrame) window.requestAnimationFrame(function () { if (!nodes.retry.hidden && nodes.retry.isConnected) nodes.retry.focus(); });
    return true;
  }
  function clearTimer() { if (timer != null) window.clearTimeout(timer); timer=null; }
  function finishIfReady(token) {
    if (!matches(token) || !current.stateAccepted || !current.settingsAccepted || !current.renderCommitted) return false;
    clearTimer();
    current.phase="ready";
    project("ready");
    return true;
  }
  function milestone(token,name) {
    if (!matches(token) || current.phase !== "loading") return false;
    current[name]=true;
    finishIfReady(token);
    return true;
  }
  function fail(token,reason) {
    if (!matches(token) || current.phase !== "loading") return false;
    clearTimer();
    current.phase="error";
    current.failure=reason === "timeout" ? "timeout" : "request";
    project("error");
    return true;
  }
  function begin(options) {
    clearTimer();
    sequence+=1;
    current={token:"bootstrap-"+String(sequence),phase:"loading",stateAccepted:false,settingsAccepted:false,renderCommitted:false,failure:""};
    project("loading");
    var timeout=Number(options && options.timeoutMs);
    if (!Number.isFinite(timeout) || timeout <= 0) timeout=DEFAULT_TIMEOUT_MS;
    var token=current.token;
    timer=window.setTimeout(function () { fail(token,"timeout"); },timeout);
    return token;
  }
  function retry() {
    var token=begin();
    var detail={token:token};
    if (typeof window.CustomEvent === "function") window.dispatchEvent(new window.CustomEvent("signal-analyser:bootstrap-retry",{detail:detail}));
    return token;
  }
  function bindRetry() {
    if (retryBound) return;
    var nodes=hostNodes();
    if (!nodes) return;
    nodes.retry.addEventListener("click",retry);
    retryBound=true;
  }
  function state() {
    return current ? {token:current.token,phase:current.phase,stateAccepted:current.stateAccepted,settingsAccepted:current.settingsAccepted,renderCommitted:current.renderCommitted,failure:current.failure} : null;
  }

  bindRetry();
  window.SignalAnalyserBootstrapLoading={
    begin:begin,
    acceptInitialState:function (token) { return milestone(token,"stateAccepted"); },
    acceptActiveSettings:function (token) { return milestone(token,"settingsAccepted"); },
    commitInitialRender:function (token) { return milestone(token,"renderCommitted"); },
    fail:fail,
    retry:retry,
    state:state,
    DEFAULT_TIMEOUT_MS:DEFAULT_TIMEOUT_MS,
    requiredMilestones:["accepted-state-lite-with-signals-displays-layout","accepted-active-display-settings","committed-initial-render"],
    excludedFromBarrier:["pane-outputs","signal-summary","signal-samples","measurements","extrema"],
    sanitizedError:"Не удалось загрузить данные анализатора. Проверьте соединение и повторите попытку."
  };
}(window,document));

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
        timer=window.setTimeout(function () { timer=null; if (key === lastKey) return; lastKey=key; if (callback && callback.commitViewport) callback.commitViewport(payload); },Number(delay) || 150);
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
      liveProjection:"plotly_relayouting updates current Area fields and handles immediately; slider/input updates Plotly at most once per animation frame",
      settleBoundary:"plotly_relayout and viewport input change/pointerup/keyboard commit start one 150ms deduplicating frontend-only viewport commit; no settings/API publication occurs",
      linkedProjection:"after the source pane projection, existing time/amplitude/frequency/magnitude link queues apply the same canonical interval only to eligible panes",
      reset:"double click any range row or its settings/in-plot slider ignores current numeric mirrors, requests true Plotly autorange/full domain and reprojects blank Auto inputs/full-domain handles",
      validation:"v46 per-endpoint validation runs before graph preview; an invalid endpoint changes neither plot nor linked panes",
      persistence:"Viewport mirrors never call settings.publishRange, /api/settings, output refresh, DSP, state_revision or session persistence; link flags remain ordinary persisted settings."
    }
  };
}(window));

(function registerSignalAnalyserPreprocessOperation(window) {
  "use strict";

  var HOST_COMMAND=Object.freeze({
    eventName:"signal-analyser:host-command",
    command:"preprocess",
    accepts:function (event) { return !!event && !!event.detail && event.detail.command === "preprocess"; },
    sourcePolicy:"Resolve the current accepted main_signal by stable id when the event is handled; ignore any source id/name supplied by event.detail."
  });
  var OPERATIONS=Object.freeze([
    {value:"bandpass",label:"Полосовой фильтр",engee:"EngeeDSP.Functions.bandpass",iconAsset:"operation-bandpass.svg"},
    {value:"bandstop",label:"Режекторный фильтр",engee:"EngeeDSP.Functions.bandstop",iconAsset:"operation-bandstop.svg"},
    {value:"highpass",label:"Фильтр высоких частот",engee:"EngeeDSP.Functions.highpass",iconAsset:"operation-highpass.svg"},
    {value:"lowpass",label:"Фильтр низких частот",engee:"EngeeDSP.Functions.lowpass",iconAsset:"operation-lowpass.svg"},
    {value:"detrend",label:"Удаление тренда",engee:"EngeeDSP.Functions.detrend",iconAsset:"operation-detrend.svg"},
    {value:"fill-missing",label:"Заполнение пропущенных значений",engee:"EngeeDSP.Functions.interp1/movmean/movmedian/fillgaps",iconAsset:"operation-fill-missing.svg"},
    {value:"smooth",label:"Сглаживание",engee:"EngeeDSP.Functions.smoothdata",iconAsset:"operation-smooth.svg"},
    {value:"envelope",label:"Огибающая",engee:"EngeeDSP.Functions.envelope",iconAsset:"operation-envelope.svg"},
    {value:"resample",label:"Передискретизация",engee:"EngeeDSP.Functions.resample",iconAsset:"operation-resample.svg"},
    {value:"custom-preprocess",label:"Пользовательская операция",engee:"engee.genie.recv context=Main",iconAsset:"operation-custom.svg"}
  ]);
  var OPTIONS=Object.freeze({
    frequencyUnits:[{value:"hertz",label:"Гц"},{value:"normalized_pi",label:"× π рад/отсчёт"}],
    impulseResponse:[{value:"auto",label:"Авто"},{value:"fir",label:"КИХ"},{value:"iir",label:"БИХ"}],
    detrendMethod:[{value:"constant",label:"Постоянный"},{value:"linear",label:"Линейный"},{value:"piecewise_linear",label:"Кусочно-линейный"}],
    nanPolicy:[{value:"includenan",label:"Учитывать пропуски"},{value:"omitnan",label:"Игнорировать пропуски"}],
    fillMethod:[
      {value:"constant",label:"Постоянное значение"},{value:"previous",label:"Предыдущее значение"},
      {value:"next",label:"Следующее значение"},{value:"nearest",label:"Ближайшее значение"},
      {value:"linear",label:"Линейная интерполяция"},{value:"spline",label:"Сплайн-интерполяция"},
      {value:"pchip",label:"Кубическая интерполяция с сохранением формы"},{value:"makima",label:"Модифицированная кубическая интерполяция Акимы"},
      {value:"moving_mean",label:"Скользящее среднее"},{value:"moving_median",label:"Скользящая медиана"},
      {value:"autoregressive",label:"Авторегрессионная модель"}
    ],
    fillEndMethod:[{value:"same",label:"Как основной метод"},{value:"nearest",label:"Ближайшее значение"}],
    smoothMethod:[
      {value:"moving_mean",label:"Скользящее среднее"},{value:"moving_median",label:"Скользящая медиана"},
      {value:"gaussian",label:"Гауссово сглаживание"},{value:"linear_regression",label:"Линейная регрессия"},
      {value:"quadratic_regression",label:"Квадратичная регрессия"},{value:"robust_linear",label:"Робастная линейная регрессия"},
      {value:"robust_quadratic",label:"Робастная квадратичная регрессия"},{value:"savitzky_golay",label:"Фильтр Савицкого — Голея"}
    ],
    windowType:[{value:"duration",label:"Длительность"},{value:"factor",label:"Коэффициент сглаживания"}],
    envelopeSide:[{value:"upper",label:"Верхняя"},{value:"lower",label:"Нижняя"}],
    envelopeMethod:[
      {value:"hilbert",label:"Преобразование Гильберта"},{value:"fir",label:"КИХ-фильтр"},
      {value:"rms",label:"СКЗ"},{value:"peak",label:"По пикам"}
    ],
    resampleMode:[{value:"rate",label:"Целевая частота дискретизации"},{value:"factor",label:"Коэффициенты интерполяции и децимации"}],
    interpolation:[
      {value:"linear",label:"Линейная интерполяция"},
      {value:"pchip",label:"Кусочно-кубическая интерполяция с сохранением формы"},
      {value:"spline",label:"Кубический сплайн с условием «не узел»"}
    ]
  });
  var SUFFIXES=Object.freeze({
    bandpass:"bandpass",bandstop:"bandstop",highpass:"highpass",lowpass:"lowpass",
    detrend:"detrend","fill-missing":"filled",smooth:"smooth",envelope:"envelope",
    resample:"resample","custom-preprocess":"preprocess"
  });

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function finite(value) { return Number.isFinite(Number(value)); }
  function blank(value) { return value == null || String(value).trim() === ""; }
  function integer(value) { return finite(value) && Number.isSafeInteger(Number(value)); }
  function sourceName(source) { return String(source && source.name || ""); }
  function sampleRate(source) { var value=Number(source && (source.sampleRateHz == null ? source.sample_rate_hz : source.sampleRateHz)); return Number.isFinite(value) && value > 0 ? value : null; }
  function sampleCount(source) { var value=Number(source && (source.sampleCount == null ? source.sample_count : source.sampleCount)); return Number.isSafeInteger(value) && value > 0 ? value : null; }
  function samplingKind(source) { return String(source && (source.samplingKind || source.sampling_kind) || "samples"); }
  function hasTime(source) { return samplingKind(source) !== "samples" || sampleRate(source) != null; }
  function frequencyDefault(source,fraction) { var rate=sampleRate(source); return rate == null ? fraction : rate * 0.5 * fraction; }
  function frequencyUnit(source) { return sampleRate(source) == null ? "normalized_pi" : "hertz"; }
  function defaultName(source,operation) { return sourceName(source) + "_" + (SUFFIXES[operation] || String(operation).replace(/-/g,"_")); }
  function operationIconBase() { return String(window.SignalAnalyserOperationIconBase || window.SignalAnalyserUIBase || ".").replace(/\/$/,""); }
  function operationOptions() { return OPERATIONS.map(function (item) { return Object.assign({},item,{disabled:false,icon:operationIconBase()+"/icons/"+item.iconAsset}); }); }
  function initialParameters(operation,source) {
    if (operation === "bandpass" || operation === "bandstop") return {frequency_units:frequencyUnit(source),lower_passband:frequencyDefault(source,0.25),upper_passband:frequencyDefault(source,0.75),impulse_response:"auto",steepness:0.85,stopband_attenuation_db:60};
    if (operation === "highpass" || operation === "lowpass") return {frequency_units:frequencyUnit(source),passband:frequencyDefault(source,0.5),impulse_response:"auto",steepness:0.85,stopband_attenuation_db:60};
    if (operation === "detrend") return {method:"linear",breakpoints:"",nan_policy:"includenan"};
    if (operation === "fill-missing") return {method:"constant",constant_value:0,end_method:"same",window_length:"",ar_order:""};
    if (operation === "smooth") return {method:"moving_mean",window_type:"duration",duration_units:samplingKind(source) === "samples" ? "samples" : "seconds",window_duration:null,smoothing_factor:0.25,polynomial_degree:null};
    if (operation === "envelope") return {side:"upper",method:"hilbert",filter_order:null,window_length:null,maxima_separation:null,length_units:samplingKind(source) === "samples" ? "samples" : "seconds",separation_units:samplingKind(source) === "samples" ? "samples" : "seconds"};
    if (operation === "resample") return {mode:"rate",target_sample_rate_hz:null,upsample_factor:null,downsample_factor:null,interpolation:"linear"};
    if (operation === "custom-preprocess") return {body:"init_signal"};
    return {};
  }
  function createState(source) {
    var operation="bandpass";
    return {operation:operation,source:copy(source || {}),parameters:initialParameters(operation,source || {}),targetName:defaultName(source || {},operation),nameDirty:false,overwrite:false};
  }
  function switchOperation(state,operation) {
    var next=copy(state); next.operation=operation; next.parameters=initialParameters(operation,next.source);
    if (!next.nameDirty) next.targetName=defaultName(next.source,operation);
    return next;
  }
  function updateParameter(state,id,value) {
    var next=copy(state); next.parameters=next.parameters || {}; next.parameters[id]=value; return next;
  }
  function field(id,label,type,value,extra) { return Object.assign({id:id,label:label,type:type,value:value,testid:"signal-operation-parameter-"+id.replace(/_/g,"-"),visible:true,disabled:false,required:false,unit:""},extra || {}); }
  function unitOptions(source) { return samplingKind(source) === "samples" ? [{value:"samples",label:"отсчёты"}] : [{value:"seconds",label:"с"},{value:"samples",label:"отсчёты"}]; }
  function schema(state) {
    var p=state.parameters || {},source=state.source || {},op=state.operation,fields=[];
    if (op === "bandpass" || op === "bandstop" || op === "highpass" || op === "lowpass") {
      fields.push(field("frequency_units","Единицы частоты","select",p.frequency_units,{options:OPTIONS.frequencyUnits,disabled:true}));
      if (op === "bandpass" || op === "bandstop") {
        fields.push(field("lower_passband","Нижняя граница полосы","number",p.lower_passband,{required:true,unit:p.frequency_units === "hertz" ? "Гц" : "× π рад/отсчёт"}));
        fields.push(field("upper_passband","Верхняя граница полосы","number",p.upper_passband,{required:true,unit:p.frequency_units === "hertz" ? "Гц" : "× π рад/отсчёт"}));
      } else fields.push(field("passband","Граница полосы","number",p.passband,{required:true,unit:p.frequency_units === "hertz" ? "Гц" : "× π рад/отсчёт"}));
      fields.push(field("impulse_response","Тип импульсной характеристики","select",p.impulse_response,{options:OPTIONS.impulseResponse,required:true}));
      fields.push(field("steepness","Крутизна","number",p.steepness,{required:true,hint:"От 0,5 включительно до 1 исключительно"}));
      fields.push(field("stopband_attenuation_db","Подавление в полосе задерживания","number",p.stopband_attenuation_db,{required:true,unit:"дБ"}));
    }
    if (op === "detrend") {
      fields.push(field("method","Метод удаления тренда","select",p.method,{options:OPTIONS.detrendMethod,required:true}));
      fields.push(field("breakpoints","Точки разбиения","text",p.breakpoints,{visible:p.method === "piecewise_linear",required:p.method === "piecewise_linear",hint:"Положительные номера отсчётов через запятую"}));
      fields.push(field("nan_policy","Обработка пропусков","select",p.nan_policy,{options:OPTIONS.nanPolicy,required:true}));
    }
    if (op === "fill-missing") {
      fields.push(field("method","Метод заполнения","select",p.method,{options:OPTIONS.fillMethod,required:true}));
      fields.push(field("constant_value","Постоянное значение","number",p.constant_value,{visible:p.method === "constant",required:p.method === "constant"}));
      fields.push(field("window_length","Длина окна","number",p.window_length,{visible:p.method === "moving_mean" || p.method === "moving_median",required:true,integer:true,unit:"отсчёты"}));
      fields.push(field("ar_order","Порядок модели","number",p.ar_order,{visible:p.method === "autoregressive",required:true,integer:true}));
      fields.push(field("end_method","Заполнение на границах","select",p.end_method,{options:OPTIONS.fillEndMethod,required:true}));
    }
    if (op === "smooth") {
      fields.push(field("method","Метод сглаживания","select",p.method,{options:OPTIONS.smoothMethod,required:true}));
      fields.push(field("window_type","Способ задания окна","select",p.window_type,{options:OPTIONS.windowType,required:true}));
      fields.push(field("duration_units","Единицы длительности","select",p.duration_units,{visible:p.window_type === "duration",options:unitOptions(source),required:true}));
      fields.push(field("window_duration","Длительность окна","number",p.window_duration,{visible:p.window_type === "duration",unit:p.duration_units === "samples" ? "отсчёты" : "с",placeholder:"Авто",nullableAuto:true}));
      fields.push(field("smoothing_factor","Коэффициент сглаживания","number",p.smoothing_factor,{visible:p.window_type === "factor",required:true,hint:"Строго больше 0 и меньше 1"}));
      fields.push(field("polynomial_degree","Степень полинома","number",p.polynomial_degree,{visible:p.method === "savitzky_golay",placeholder:"Авто",nullableAuto:true,integer:true,allowZero:true,hint:"Авто соответствует степени 2"}));
    }
    if (op === "envelope") {
      fields.push(field("side","Сторона огибающей","select",p.side,{options:OPTIONS.envelopeSide,required:true}));
      fields.push(field("method","Метод","select",p.method,{options:OPTIONS.envelopeMethod,required:true}));
      fields.push(field("filter_order","Порядок фильтра","number",p.filter_order,{visible:p.method === "fir",required:true,integer:true}));
      fields.push(field("length_units","Единицы длины","select",p.length_units,{visible:p.method === "rms",options:unitOptions(source),required:true}));
      fields.push(field("window_length","Длина окна","number",p.window_length,{visible:p.method === "rms",required:true,integer:p.length_units === "samples",unit:p.length_units === "samples" ? "отсчёты" : "с"}));
      fields.push(field("separation_units","Единицы расстояния","select",p.separation_units,{visible:p.method === "peak",options:unitOptions(source),required:true}));
      fields.push(field("maxima_separation","Расстояние между максимумами","number",p.maxima_separation,{visible:p.method === "peak",required:true,integer:p.separation_units === "samples",unit:p.separation_units === "samples" ? "отсчёты" : "с"}));
    }
    if (op === "resample") {
      var kind=samplingKind(source),uniform=kind === "uniform" || kind === "samples" && sampleRate(source) != null;
      fields.push(field("mode","Способ передискретизации","select",p.mode,{options:OPTIONS.resampleMode,visible:uniform,required:uniform}));
      fields.push(field("target_sample_rate_hz","Целевая частота дискретизации","number",p.target_sample_rate_hz,{visible:!uniform || p.mode === "rate",required:true,unit:"Гц"}));
      fields.push(field("upsample_factor","Коэффициент интерполяции","number",p.upsample_factor,{visible:uniform && p.mode === "factor",required:true,integer:true}));
      fields.push(field("downsample_factor","Коэффициент децимации","number",p.downsample_factor,{visible:uniform && p.mode === "factor",required:true,integer:true}));
      fields.push(field("interpolation","Метод интерполяции","select",p.interpolation,{options:OPTIONS.interpolation,visible:kind === "nonuniform",required:kind === "nonuniform"}));
    }
    if (op === "custom-preprocess") fields.push(field("body","Тело операции","textarea",p.body,{required:true,hint:"Код выполняется в Engee; входной сигнал доступен как init_signal. Результатом должно быть выражение, возвращающее новый вектор."}));
    return fields.filter(function (item) { return item.visible; });
  }
  function availability(state) {
    if (state.operation === "resample" && !hasTime(state.source)) return {available:false,code:"time_required",message:"Для передискретизации задайте частоту дискретизации или временные координаты исходного сигнала."};
    if ((state.operation === "envelope" || state.operation === "detrend") && state.source && state.source.complex) return {available:false,code:"real_required",message:"Выбранная операция доступна только для вещественного сигнала."};
    if (state.operation === "fill-missing" && state.parameters && state.parameters.method === "moving_median" && state.source && state.source.complex) return {available:false,code:"real_required",message:"Заполнение скользящей медианой доступно только для вещественного сигнала."};
    return {available:true,code:"",message:""};
  }
  function validate(state) {
    var fields=schema(state),errors={},p=state.parameters || {},op=state.operation,available=availability(state),count=sampleCount(state.source);
    if (blank(state.targetName)) errors.target_name="Введите имя нового сигнала.";
    fields.forEach(function (item) {
      var value=p[item.id];
      if (item.required && blank(value)) errors[item.id]="Заполните поле.";
      else if (!blank(value) && item.type === "number" && !finite(value)) errors[item.id]="Введите число.";
      else if (!blank(value) && item.integer && (!integer(value) || (item.allowZero ? Number(value) < 0 : Number(value) <= 0))) errors[item.id]=item.allowZero ? "Введите целое число не меньше нуля." : "Введите целое число больше нуля.";
    });
    var nyquist=sampleRate(state.source) == null ? 1 : sampleRate(state.source)/2;
    function frequency(id) { var value=Number(p[id]); if (finite(value) && (value <= 0 || value >= nyquist)) errors[id]="Значение должно быть больше нуля и меньше частоты Найквиста."; }
    if (/^(bandpass|bandstop)$/.test(op)) { frequency("lower_passband"); frequency("upper_passband"); if (!errors.lower_passband && !errors.upper_passband && Number(p.lower_passband) >= Number(p.upper_passband)) errors.lower_passband="Нижняя граница должна быть меньше верхней."; }
    if (/^(highpass|lowpass)$/.test(op)) frequency("passband");
    if (/pass|stop/.test(op)) {
      if (finite(p.steepness) && (Number(p.steepness) < 0.5 || Number(p.steepness) >= 1)) errors.steepness="Введите значение от 0,5 включительно до 1 исключительно.";
      if (finite(p.stopband_attenuation_db) && Number(p.stopband_attenuation_db) <= 0) errors.stopband_attenuation_db="Введите значение больше нуля.";
    }
    if (op === "detrend" && p.method === "piecewise_linear") {
      var validText=/^\s*\d+(?:\s*,\s*\d+)*\s*$/.test(String(p.breakpoints || ""));
      var points=validText ? String(p.breakpoints).split(",").map(function (value) { return Number(String(value).trim()); }) : [];
      if (!validText || points.some(function (value,index) { return value <= 0 || index > 0 && value <= points[index-1] || count != null && value > count; })) errors.breakpoints="Введите строго возрастающие номера отсчётов в пределах сигнала.";
    }
    if (op === "fill-missing") {
      if ((p.method === "moving_mean" || p.method === "moving_median") && count != null && integer(p.window_length) && Number(p.window_length) > count) errors.window_length="Длина окна не должна превышать длину сигнала.";
      if (p.method === "autoregressive" && count != null && integer(p.ar_order) && Number(p.ar_order) >= count) errors.ar_order="Порядок модели должен быть меньше числа конечных отсчётов.";
    }
    if (op === "smooth") {
      if (p.window_type === "duration" && !blank(p.window_duration) && Number(p.window_duration) <= 0) errors.window_duration="Введите значение больше нуля.";
      if (p.window_type === "factor" && finite(p.smoothing_factor) && (Number(p.smoothing_factor) <= 0 || Number(p.smoothing_factor) >= 1)) errors.smoothing_factor="Введите значение строго больше 0 и меньше 1.";
      if (p.method === "savitzky_golay" && !blank(p.polynomial_degree) && p.window_type === "duration" && p.duration_units === "samples" && !blank(p.window_duration) && Number(p.polynomial_degree) >= Number(p.window_duration)) errors.polynomial_degree="Степень полинома должна быть меньше длины окна.";
    }
    ["filter_order","window_length","maxima_separation","target_sample_rate_hz"].forEach(function (id) { if (!errors[id] && !blank(p[id]) && finite(p[id]) && Number(p[id]) <= 0) errors[id]="Введите значение больше нуля."; });
    return {valid:available.available && Object.keys(errors).length === 0,errors:errors,availability:available};
  }
  function payload(state) {
    var visible={}; schema(state).forEach(function (item) { visible[item.id]=item; });
    var parameters={}; Object.keys(state.parameters || {}).forEach(function (key) {
      if (!visible[key]) return;
      var value=state.parameters[key];
      parameters[key]=blank(value) ? null : visible[key].type === "number" ? Number(value) : value;
    });
    return {source_signal_id:state.source && state.source.id,operation_kind:"preprocess",operation:state.operation,parameters:parameters,target_name:state.targetName,overwrite:!!state.overwrite};
  }

  window.SignalAnalyserPreprocessOperation={
    preprocessOperations:OPERATIONS,options:OPTIONS,hostCommand:HOST_COMMAND,
    createState:createState,switchOperation:switchOperation,updateParameter:updateParameter,operationOptions:operationOptions,
    schema:schema,availability:availability,validate:validate,payload:payload,defaultName:defaultName,
    contract:Object.freeze({
      entry:"Every entry uses the current accepted signal selected by plain LMB as the immutable source.",
      supported:["bandpass","bandstop","highpass","lowpass","detrend","fill-missing","smooth","envelope","resample","custom-preprocess"],
      removed:["abs","square","sqrt","signed-sqrt","multiply","fft","denoise","knn"],
      denoise:"Absent from the UI because EngeeDSP.Functions.wdenoise and denoise are not public symbols; this is an availability gap, not a product operation or fake disabled row.",
      fill:"Every non-constant method maps to a confirmed public EngeeDSP function; KNN is absent because a public Engee function/object was not found.",
      smooth:"SmoothingFactor is restricted to 0<x<1 until the confirmed Engee endpoint defect is fixed.",
      envelope:"FIR order, RMS window and peak separation are required because the selected public Engee overloads have no automatic form.",
      custom:"Custom bodies are sent unchanged and are never evaluated, parsed or wrapped by frontend code.",
      output:"The source is unchanged; target name and overwrite are explicit and the provider publishes one validated derived signal.",
      errors:"Field constraints are local. Compatibility and runtime failures use the standard sanitized alertdialog and never show raw Engee or Julia text."
    })
  };
}(window));


(function registerSignalAnalyserTask0153(window) {
  "use strict";

  var AREA_RANGES = {
    time: [
      { fieldId:"time.x_limits", axis:"time", label:"Пределы времени", unitField:"time.units" },
      { fieldId:"time.y_limits", axis:"amplitude", label:"Пределы амплитуды" }
    ],
    spectrum: [
      { fieldId:"spectrum.frequency_limits", axis:"frequency", label:"Пределы частоты", unitField:"spectrum.frequency_units" },
      { fieldId:"spectrum.y_limits", axis:"magnitude", label:"Пределы магнитуды" }
    ],
    spectrogram: [
      { fieldId:"time.x_limits", axis:"time", label:"Пределы времени", unitField:"spectrogram.time_units" },
      { fieldId:"spectrogram.frequency_limits", axis:"frequency", label:"Пределы частоты", unitField:"spectrogram.frequency_units" },
      { fieldId:"spectrogram.power_limits", axis:"power", label:"Пределы мощности" }
    ],
    persistence: [
      { fieldId:"persistence.frequency_limits", axis:"frequency", label:"Пределы частоты", unitField:"persistence.frequency_units" },
      { fieldId:"persistence.power_limits", axis:"power", label:"Пределы мощности" },
      { fieldId:"persistence.density_limits", axis:"density", label:"Пределы плотности" }
    ]
  };

  function cleanType(value) {
    value=String(value == null ? "" : value).toLowerCase();
    if (/spectrogram|спектрограмм/.test(value)) return "spectrogram";
    if (/persistence|персистент/.test(value)) return "persistence";
    if (/spectrum|спектр/.test(value)) return "spectrum";
    if (/time|временн/.test(value)) return "time";
    return "";
  }

  function areaRanges(plotType) {
    return (AREA_RANGES[cleanType(plotType)] || []).map(function (item) {
      return Object.assign({}, item, {
        scope:"area",
        sliderComponent:"screen-range-slider",
        sliderRequired:true,
        linkedVisibilityIndependent:true,
        emptyEndpoints:"independent_auto_until_that_endpoint_is_touched"
      });
    });
  }

  function closest(target, selector) {
    return target && typeof target.closest === "function" ? target.closest(selector) : null;
  }

  function doubleClickIntent(target, plotHost) {
    if (closest(target, "[data-screen-range-slider], .settings-field-row[data-range-boundary-validation]")) return "settings_range_reset";
    var inPlotSlider=closest(target, ".rangeslider-container, [data-amplitude-slider]");
    if (inPlotSlider && (!plotHost || typeof plotHost.contains !== "function" || plotHost.contains(inPlotSlider))) return "in_plot_slider_reset";
    var plotSurface=closest(target, ".nsewdrag, .plotly, .plot-container, .svg-container");
    if (plotHost && (target === plotHost || plotSurface && plotHost.contains(plotSurface))) return "plot_autoscale";
    return "ignore";
  }

  function plotDoubleClickProjection(state) {
    var visibility=paneSliderProjection(state,{kind:"graph_autoscale"});
    return Object.assign({},visibility,{
      action:"plot_autoscale",
      trueAutorange:true,
      paneMenuMutation:false,
      settingsPageMutation:false,
      backendMutation:false
    });
  }

  function paneSliderProjection(state,event) {
    state=state || {}; event=event || {};
    var xVisible=!!state.xRangeSliderVisible,yVisible=!!state.yRangeSliderVisible;
    var explicit=event.kind === "explicit_slider_toggle";
    if (explicit && event.axis === "x") xVisible=!!event.checked;
    if (explicit && event.axis === "y") yVisible=!!event.checked;
    return {
      xRangeSliderVisible:xVisible,
      yRangeSliderVisible:yVisible,
      mountHorizontalPaneSlider:xVisible,
      mountVerticalPaneSlider:yVisible,
      sliderVisibilityMutation:explicit,
      visibilityOwner:"explicit_pane_tool_or_matching_checkbox"
    };
  }

  function settingsRangeProjection(state,phase) {
    var projection=paneSliderProjection(state,{kind:"settings_range_"+String(phase || "edit")});
    return Object.assign({},projection,{
      action:phase === "apply" ? "settings_apply" : "settings_numeric_edit",
      viewportProjectionMutation:true,
      rangeValueMutation:true,
      backendMutation:false
    });
  }

  function settingsTabIntent(page, state) {
    state=state || {};
    var available=state.available !== false;
    return {
      accepted:available,
      page:available ? String(page || "") : String(state.currentPage || ""),
      backgroundApplyContinues:!!state.applying,
      blockedByApply:false,
      activationToken:Number(state.activationToken || 0) + (available ? 1 : 0)
    };
  }

  function decorateFooter(root) {
    if (!root || typeof root.querySelectorAll !== "function") return 0;
    var nodes=root.querySelectorAll("[data-testid='signal-values-action'], [data-testid='extrema-values']");
    Array.prototype.forEach.call(nodes,function (node) {
      node.classList.add("button-primary");
      node.dataset.footerActionStyle="primary";
    });
    return nodes.length;
  }

  window.SignalAnalyserTask0153={
    areaRanges:areaRanges,
    doubleClickIntent:doubleClickIntent,
    plotDoubleClickProjection:plotDoubleClickProjection,
    paneSliderProjection:paneSliderProjection,
    settingsRangeProjection:settingsRangeProjection,
    settingsTabIntent:settingsTabIntent,
    decorateFooter:decorateFooter,
    contract:{
      doubleClick:"A double-click on the ready graph surface performs true X/Y autoscale only. It never enables, opens or hides the in-plot time/frequency/amplitude slider, never opens the pane menu and never changes Settings page. Double-click on an already visible in-plot slider remains that slider's local reset; settings range-row double-click remains that field's local Auto reset.",
      paneSliderVisibility:"Horizontal and vertical pane sliders mount only from their explicit pane menu tool or the matching explicit Area checkbox. Settings numeric edit, Apply, Plotly relayout and graph autoscale preserve the existing visibility intent and cannot infer, enable or mount either pane slider.",
      tab:"Every visible Settings tab, including Экран, activates synchronously by pointer or keyboard even while a prior settings autosave/apply is pending. The prior request may finish in the background, but its late render must be ignored unless its page activation token is still current.",
      areaRanges:"Every applicable range row in Область → Диапазоны is followed by exactly one mounted dual-thumb slider. Linked-axis state changes propagation only and never hides Time/Frequency/Magnitude/Power/Density controls or their sliders.",
      footer:"Значения and Рассчитать are canonical Primary MD blue actions in the shared settings footer, with the existing 32px geometry and normal disabled state."
    }
  };
}(window));

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
    return items.map(function (item) {
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
      menu:"Append cursor item markup directly after the existing measurement items inside the one Видимость измерений menu. No cursor subgroup title, nested list or second Видимость столбцов heading.",
      isolation:"No API, DSP, settings, session or state_revision mutation.",
      cleanup:"On pane removal, unsubscribe the cursor listener and clear(paneRuntimeKey); on active pane/type/mode changes reconcile immediately."
    }
  };
}(window));
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
(function registerCursorTrimSignal(window) {
  "use strict";

  var SELECTORS={
    action:"[data-testid='pane-trim-signal']",
    layer:"[data-testid='signal-trim-layer']",
    dialog:"[data-testid='signal-trim-dialog']",
    form:"[data-signal-trim-form]",
    source:"[data-signal-trim-source]",
    interval:"[data-signal-trim-interval]",
    name:"[data-signal-trim-name]",
    overwriteRow:"[data-signal-trim-overwrite-row]",
    overwrite:"[data-signal-trim-overwrite]",
    submit:"[data-signal-trim-submit]",
    cancel:"[data-signal-trim-cancel]",
    close:"[data-signal-trim-close]",
    status:"[data-signal-trim-status]"
  };
  function finite(value) { return Number.isFinite(Number(value)); }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function normalized(value) { var text=clean(value); return typeof text.normalize === "function" ? text.normalize("NFC") : text; }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,function (character) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character]; }); }
  function normalizeType(value) { value=String(value || "").toLowerCase(); return /^(time|time-domain|врем)/.test(value) ? "time" : value; }
  function signalId(signal) { return clean(signal && (signal.id || signal.signal_id)); }
  function signalName(signal) { return clean(signal && (signal.name || signal.signal_name || signalId(signal))); }
  function interval(snapshot) {
    var values=snapshot && Array.isArray(snapshot.values) ? snapshot.values : [];
    if (values.length !== 2 || !finite(values[0]) || !finite(values[1])) return null;
    return {start:Number(Math.min(values[0],values[1])),end:Number(Math.max(values[0],values[1])),inclusive:true};
  }
  function secondsScale(unit) {
    var value=clean(unit).toLowerCase().replace(/μ/g,"µ");
    if (value === "s" || value === "sec" || value === "с") return 1;
    if (value === "ms" || value === "мс") return 1e-3;
    if (value === "us" || value === "µs" || value === "мкс") return 1e-6;
    if (value === "ns" || value === "нс") return 1e-9;
    return null;
  }
  function canonicalSeconds(context) {
    var range=interval(context && context.cursorSnapshot),convert=context && context.toCanonicalSeconds;
    if (!range) return null;
    var start,end;
    if (typeof convert === "function") { start=Number(convert(range.start)); end=Number(convert(range.end)); }
    else { var scale=secondsScale(context && context.xUnit); if (scale == null || !finite(scale)) return null; start=range.start*scale; end=range.end*scale; }
    if (!finite(start) || !finite(end)) return null;
    return {min_s:Math.min(start,end),max_s:Math.max(start,end)};
  }
  function eligibleSignals(context) {
    var supplied=context && (context.eligibleSignals || context.visibleSignals || context.paneSignals),main=context && context.mainSignal;
    var list=Array.isArray(supplied) ? supplied.slice() : main ? [main] : [];
    var seen=Object.create(null);
    return list.filter(function (signal) {
      var id=signalId(signal);
      if (!id || seen[id] || signal && signal.trimEligible === false) return false;
      seen[id]=true;
      return true;
    });
  }
  function inventorySignals(context) {
    var supplied=context && (context.signalInventory || context.allSignals);
    return Array.isArray(supplied) ? supplied : eligibleSignals(context);
  }
  function sourceById(context,id) { return eligibleSignals(context).find(function (signal) { return signalId(signal) === clean(id); }) || null; }
  function eligibility(context) {
    var mainId=signalId(context && context.mainSignal),sources=eligibleSignals(context);
    return !!context && normalizeType(context.plotType) === "time" && context.cursorSnapshot && context.cursorSnapshot.mode === "dual" &&
      !!mainId && sources.some(function (signal) { return signalId(signal) === mainId; }) && !!canonicalSeconds(context);
  }
  function actionMarkup() {
    return "<button class='pane-action button pane-trim-action' type='button' data-testid='pane-trim-signal' data-pane-trim-signal data-pane-control-cluster-cell='start' data-pane-trim-eligible='true' aria-label='Обрезать сигнал по курсорам'>Обрезать</button>";
  }
  function projectAction(button,context) {
    var visible=eligibility(context);
    if (!button) return visible;
    button.hidden=!visible;
    button.disabled=!!(context && context.trimBusy);
    button.setAttribute("aria-hidden",String(!visible));
    button.dataset.paneTrimEligible=String(visible);
    return visible;
  }
  function nameTaken(context,value,sourceId) {
    var wanted=normalized(value);
    if (!wanted) return false;
    return inventorySignals(context).some(function (signal) { return normalized(signalName(signal)) === wanted && signalId(signal) !== clean(sourceId); });
  }
  function suggestedName(context,source) {
    var base=signalName(source)+"_фрагмент",candidate=base,index=2;
    while (nameTaken(context,candidate,signalId(source))) { candidate=base+"_"+index; index+=1; }
    return candidate;
  }
  function validateName(value) {
    var name=clean(value);
    if (!name) return {valid:false,reason:"required",message:"Введите имя нового сигнала."};
    if (Array.from(name).length > 128) return {valid:false,reason:"too_long",message:"Имя сигнала не должно превышать 128 символов."};
    return {valid:true,value:name};
  }
  function initialDraft(context) {
    var sources=eligibleSignals(context),mainId=signalId(context && context.mainSignal);
    var source=sources.find(function (item) { return signalId(item) === mainId; }) || sources[0] || null;
    return {sourceId:signalId(source),name:source ? suggestedName(context,source) : "",nameDirty:false,overwrite:false};
  }
  function validateDraft(context,draft,busy) {
    var source=sourceById(context,draft && draft.sourceId),name=validateName(draft && draft.name),range=canonicalSeconds(context);
    var conflict=!!source && name.valid && nameTaken(context,name.value,signalId(source));
    var reason=!source ? "source" : !range ? "interval" : !name.valid ? name.reason : conflict && !(draft && draft.overwrite) ? "conflict" : busy ? "busy" : "";
    var message=reason === "source" ? "Выберите доступный исходный сигнал." : reason === "interval" ? "Интервал курсоров недоступен." : reason === "conflict" ? "Сигнал с таким именем уже существует. Разрешите замену или измените имя." : !name.valid ? name.message : "";
    return {valid:!reason,reason:reason,message:message,source:source,name:name.valid ? name.value : "",range:range,conflict:conflict};
  }
  function intervalText(context) {
    var range=interval(context && context.cursorSnapshot),unit=clean(context && context.xUnit);
    return range ? String(range.start)+" – "+String(range.end)+(unit ? " "+unit : "") : "Недоступно";
  }
  function fieldMarkup(context,draft,busy) {
    draft=draft || initialDraft(context);
    var validation=validateDraft(context,draft,!!busy),sources=eligibleSignals(context);
    var options=sources.map(function (signal) { var id=signalId(signal); return "<option value='"+escapeHtml(id)+"'"+(id === draft.sourceId ? " selected" : "")+">"+escapeHtml(signalName(signal))+"</option>"; }).join("");
    return "<div class='signal-trim-form'>"+
      "<div class='signal-trim-row'><label for='signal-trim-source'>Исходный сигнал</label><span class='signal-trim-select select-trigger-arrow'><select id='signal-trim-source' data-signal-trim-source"+(busy ? " disabled" : "")+">"+options+"</select></span></div>"+
      "<div class='signal-trim-row'><span class='signal-trim-label'>Интервал курсоров</span><output class='signal-trim-readonly' data-signal-trim-interval>"+escapeHtml(intervalText(context))+"</output></div>"+
      "<div class='signal-trim-row signal-trim-row-with-message'><label for='signal-trim-name'>Имя нового сигнала</label><div><input id='signal-trim-name' type='text' value='"+escapeHtml(draft.name)+"' autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off' data-signal-trim-name aria-required='true' aria-invalid='"+String(validation.reason === "required" || validation.reason === "too_long" || validation.reason === "conflict")+"'"+(busy ? " disabled" : "")+"><p class='signal-trim-field-message' data-signal-trim-name-message"+(validation.message && validation.reason !== "source" && validation.reason !== "interval" ? "" : " hidden")+">"+escapeHtml(validation.message)+"</p></div></div>"+
      "<div class='signal-trim-overwrite-row' data-signal-trim-overwrite-row"+(validation.conflict ? "" : " hidden")+"><span></span><label class='checkbox-control'><input type='checkbox' data-signal-trim-overwrite"+(draft.overwrite ? " checked" : "")+(busy ? " disabled" : "")+"><span>Заменить сигнал с таким именем</span></label></div>"+
      "<div class='operation-status' role='alert' aria-live='assertive' data-signal-trim-status hidden></div>"+
      "</div>";
  }
  function payload(context,draft) {
    var validation=validateDraft(context,draft,false),revision=Number(context && (context.stateRevision != null ? context.stateRevision : context.state_revision));
    if (!validation.valid) throw new Error(validation.reason);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("state_revision");
    return {state_revision:revision,source_signal_id:signalId(validation.source),min_s:validation.range.min_s,max_s:validation.range.max_s,target_name:validation.name,overwrite:!!draft.overwrite};
  }
  function typedError(error) {
    var status=Number(error && (error.status || error.statusCode));
    if (status === 409) return "Сигнал с таким именем уже существует или данные изменились. Проверьте имя и повторите.";
    if (status === 404) return "Выбранный исходный сигнал больше недоступен.";
    if (status === 422) return "В интервале между курсорами нет доступных отсчётов.";
    if (status === 400) return "Проверьте исходный сигнал, имя и интервал курсоров.";
    return "Не удалось создать фрагмент сигнала. Повторите попытку.";
  }
  function createController(options) {
    options=options || {};
    var attempt=0,busy=false,context=null,opener=null,draft=null;
    function sync(meta) {
      var validation=validateDraft(context,draft,busy);
      if (typeof options.sync === "function") options.sync({draft:Object.assign({},draft),validation:validation,markup:fieldMarkup(context,draft,busy),submitDisabled:!validation.valid},{selectors:SELECTORS,meta:meta || {}});
      return validation;
    }
    function open(nextContext,button) {
      if (!eligibility(nextContext)) return false;
      context=nextContext; opener=button || null; draft=initialDraft(context);
      if (typeof options.mount === "function") options.mount(fieldMarkup(context,draft,false),{selectors:SELECTORS,initialFocus:SELECTORS.name,returnFocus:opener,submitDisabled:!validateDraft(context,draft,false).valid});
      return true;
    }
    function close() { if (busy) return false; if (typeof options.close === "function") options.close({restoreFocus:opener}); context=null; draft=null; return true; }
    function selectSource(id) {
      if (busy || !sourceById(context,id)) return sync({rejected:true});
      draft.sourceId=clean(id); draft.overwrite=false;
      if (!draft.nameDirty) draft.name=suggestedName(context,sourceById(context,id));
      return sync({sourceChanged:true,preserveTypedName:draft.nameDirty});
    }
    function editName(value) { if (!busy) { draft.name=String(value == null ? "" : value); draft.nameDirty=true; draft.overwrite=false; } return sync({nameEdited:true}); }
    function setOverwrite(value) { if (!busy) draft.overwrite=!!value; return sync({overwriteChanged:true}); }
    function submit() {
      var validation=validateDraft(context,draft,busy);
      if (!validation.valid) { if (typeof options.error === "function") options.error(validation.message,{field:validation.reason === "source" ? SELECTORS.source : validation.reason === "interval" ? SELECTORS.interval : SELECTORS.name}); return Promise.resolve({ok:false,validation:validation}); }
      var token=++attempt; busy=true; sync({busyStarted:true});
      if (typeof options.setBusy === "function") options.setBusy(true,{stableControls:true,ariaBusy:true,blockClose:true});
      return Promise.resolve(options.createSignal(payload(context,draft))).then(function (created) {
        if (token !== attempt) return {ok:false,stale:true};
        busy=false; if (typeof options.acceptSignal === "function") options.acceptSignal(created,{appendOrRefreshSignals:true});
        if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true});
        if (typeof options.close === "function") options.close({restoreFocus:null,success:true}); context=null; draft=null;
        return {ok:true,signal:created};
      },function (error) {
        if (token !== attempt) return {ok:false,stale:true};
        busy=false; if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true});
        sync({busyEnded:true});
        var message=typedError(error); if (typeof options.error === "function") options.error(message,{field:null});
        return {ok:false,error:message};
      });
    }
    function destroy() {
      attempt+=1; busy=false; context=null; draft=null;
      if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true,cleanup:true});
      if (typeof options.close === "function") options.close({restoreFocus:null,cleanup:true});
      opener=null;
    }
    return {open:open,close:close,selectSource:selectSource,editName:editName,setOverwrite:setOverwrite,submit:submit,snapshot:function () { return {busy:busy,draft:draft && Object.assign({},draft),validation:draft && validateDraft(context,draft,busy)}; },isBusy:function () { return busy; },invalidate:function () { attempt+=1; },destroy:destroy};
  }

  window.SignalAnalyserCursorTrimSignal={
    selectors:SELECTORS,
    eligibility:eligibility,
    eligibleSignals:eligibleSignals,
    interval:interval,
    canonicalSeconds:canonicalSeconds,
    suggestedName:suggestedName,
    validateName:validateName,
    validateDraft:validateDraft,
    initialDraft:initialDraft,
    actionMarkup:actionMarkup,
    projectAction:projectAction,
    fieldMarkup:fieldMarkup,
    payload:payload,
    typedError:typedError,
    createController:createController,
    contract:{
      placement:"Canonical text-only Secondary MD pane-header button Обрезать immediately before the plot-type selector/overflow; no unrelated function icon and no tooltip required.",
      eligibility:"Time pane only, cursor mode dual, current main signal included in eligible active-pane sources and exactly two finite snapped cursor X values.",
      source:"Standard 32px dropdown contains only eligible active-Time-pane signals and initially selects current main_signal; payload source_signal_id always comes from the current selection.",
      name:"Unicode is preserved. Initial suggestion is <source>_фрагмент with the lowest available _N suffix; source changes update it only while nameDirty is false.",
      interval:"One read-only contextual output shows sorted cursor bounds in current units; no manual range fields.",
      overwrite:"Conditional canonical checkbox appears only on an inventory name conflict; unchecked conflict disables submit.",
      modal:"Canonical 480px Engee modal; focus suggested new-name on open, trap focus, dropdown uses native keyboard semantics, Escape closes dropdown before idle modal, backdrop never closes, busy blocks Close/Escape/Cancel.",
      provider:"POST /api/signals/crop exact payload {state_revision,source_signal_id,min_s,max_s,target_name,overwrite} through the existing revision-safe signal mutation queue; accept the returned signal/inventory before closing success.",
      cleanup:"On pane removal/type change/main-signal loss/mode drop, hide the action; on owner removal call destroy() to invalidate stale submit, clear busy UI and detach the cursor subscription."
    }
  };
}(window));

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
        if (records[keyValue] === active) delete records[keyValue];
      },settleDelay);
    }
    function finish(token) {
      var record=current(token);
      if (!record) return false;
      if (record.timer != null) window.clearTimeout(record.timer);
      record.timer=null;
      if (!stable(record)) {
        delete records[record.key];
        return false;
      }
      if (record.projection) {
        patch(record.nodes,record.projection,record.context.fullDomain,record.generation,"committed");
        if (typeof options.commitViewport === "function") options.commitViewport({fieldId:record.context.fieldId,min:record.projection.min,max:record.projection.max,auto:!!record.projection.auto,generation:record.generation},{key:record.key,generation:record.generation,mode:record.mode,frontendOnly:true,navigation:true});
      }
      if (records[record.key] === record) delete records[record.key];
      return true;
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
        stableRecords.forEach(function (record) { if (records[record.key] === record) delete records[record.key]; });
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

    return {beginSettingsDrag:function (context) { return begin(context,"settings","explicit"); },previewSettings:previewSettings,settleSettings:settleSettings,finish:finish,beginGraph:beginGraph,projectGraph:projectGraph,reset:reset,resetMany:resetMany,acceptViewport:acceptViewport,syncState:syncState,inspect:inspect,clear:clear,clearPane:clearPane};
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

(function (root) {
  "use strict";

  var LABELS = {
    idle: "Рассчитать",
    error: "Рассчитать ещё раз",
    ready: "Пересчитать",
    empty: "Пересчитать",
    pending: "Рассчитывается…"
  };
  var TOOLTIPS = {
    idle:"Рассчитать экстремумы",
    error:"Повторить расчёт экстремумов",
    ready:"Пересчитать для актуальных диапазонов",
    empty:"Пересчитать для актуальных диапазонов",
    pending:"Расчёт экстремумов выполняется"
  };

  function normalize(status) {
    var value=String(status || "idle").toLowerCase();
    if (value === "pending" || value === "loading" || value === "busy") return "pending";
    if (value === "error" || value === "failed" || value === "failure") return "error";
    if (value === "empty") return "empty";
    if (value === "ready" || value === "success" || value === "calculated") return "ready";
    return "idle";
  }

  function presentation(status) {
    var state=normalize(status);
    return { state:state, label:LABELS[state], tooltip:TOOLTIPS[state], disabled:state === "pending", busy:state === "pending" };
  }

  function project(button, status) {
    if (!button) return null;
    var view=presentation(status);
    button.textContent=view.label;
    button.disabled=view.disabled;
    button.dataset.extremaActionState=view.state;
    button.setAttribute("aria-busy", String(view.busy));
    button.setAttribute("title", view.tooltip);
    button.setAttribute("aria-label", view.tooltip);
    return view;
  }

  function context(displayId,paneId) {
    var display=String(displayId || ""), pane=String(paneId || "");
    return { displayId:display, paneId:pane, key:display+"::"+pane };
  }

  function providerRequest(provider, request, onSettled) {
    if (!provider || typeof provider.onCalculateExtrema !== "function") return Promise.resolve(null);
    return Promise.resolve(provider.onCalculateExtrema(request)).then(function (result) {
      if (typeof onSettled === "function") onSettled(result,request);
      return result;
    },function (error) {
      if (typeof onSettled === "function") onSettled({status:"error",error:error},request);
      return null;
    });
  }

  function activation(status, readCurrentViewport) {
    if (normalize(status) === "pending") return null;
    return {
      visible_range:typeof readCurrentViewport === "function" ? readCurrentViewport() : null
    };
  }

  root.SignalAnalyserExtremaAction = {
    normalize:normalize,
    presentation:presentation,
    project:project,
    activation:activation,
    context:context,
    providerRequest:providerRequest
  };
}(typeof window !== "undefined" ? window : globalThis));

(function signalAnalyserApp(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var settings = window.SignalAnalyserSettings;
  var numeric = window.SignalAnalyserNumeric;
  var valueSelect = window.SignalAnalyserValueSelect;
  var task0126 = window.SignalAnalyserTask0126;
  var titles = { time: "Временная область", spectrum: "Спектр", spectrogram: "Спектрограмма", persistence: "Спектр персистентности" };
  var measurementOptions = [
    { id:"minimum", label:"Минимум" }, { id:"maximum", label:"Максимум" },
    { id:"mean", label:"Среднее" }, { id:"median", label:"Медиана" },
    { id:"peak_to_peak", label:"Размах" }, { id:"rms", label:"Среднеквадратичное" }
  ];
  var model = {
    state: null, revision: -1, layout: null, activePane: null,
    settingsPage: "display", inspectorPage: "signals", inspectorSearch:"", visibleColumns: { color:true, sample_rate:true, sample_count:true, duration:true, data_type:true }, outputs: {}, outputTokens: {}, pollByPane: {},
    plotQueue: {}, plotInFlight: {}, plotResizeFrames: {}, graphDefaultRangeByPane:{}, graphDefaultSignatureByPane:{}, plotAutoscaleByPane:{}, rangeSliderByPane: {}, rangeSliderDataRangeByPane:{}, rangeSliderFullRangeByPane:{}, rangeSliderAdjustByPane:{}, amplitudeSliderByPane:{}, amplitudeDataRangeByPane:{}, amplitudeFullRangeByPane:{}, amplitudeSelectedRangeByPane:{}, amplitudeDrag:null, amplitudeFrameByPane:{}, amplitudePendingByPane:{}, axisLinkFrame:null, axisLinkPending:null, axisLinkToken:0, spectralLinkFrame:null, spectralLinkPending:null, spectralLinkToken:0, axisLinkSuppressByPane:{}, toastTimer: null,
    layoutDraft: null, screenDraft: null, screenApplying: false, screenApplyToken: 0, screenApplyTimer: null, settingsPageActivationToken: 0, settingsPublishTimer: null, settingsPublishing: false, settingsPublishWanted: -1, settingsPublishPublished: -1, settingsCommittedRevision: -1, screenCollapsed: { layout:true }, renderFrame: null, plotlyPromise: null,
    displayTabsFrame: null, revealDisplayTab: false, renderedDisplayId: null, displayTabsObserver: null,
    workspaceInspectorState: "split", workspaceSplitRatio: null, workspaceSplitDrag: null, workspaceSplitAutoscaleFrame: null, workspaceSplitAutoscaleToken: 0,
    measurementSearch: "", measurementsRecord: null, measurementsToken: 0, peaksRecord: null, peaksToken: 0, peaksRecords: {}, peaksTokens: {}, peaksPollByPane: {}, peaksEnableByPane: {}, peaksDraft: null, peaksApplying: false, peaksApplyQueued: false, peaksApplyEpisodeKey: null, peaksMessage: "", extremaTargetKey: null,
    signalAddCatalog: null, signalAddTrigger: null, signalAddToken: 0, signalAddLoading: false, signalAddSubmitting: false, signalAddSearch:"", signalAddSelection:{}, signalAddCatalogError:"", signalAddResetScroll:false,
    paneMenuTrigger: null, graphHelpRestoreTarget: null, paneClearContext: null,
    sessionImport: { open:false, busy:false, phase:"file", file:null, archiveBase64:"", validation:null, error:"", details:"", publish:false, prefix:"imported_", preflight:null, preflightLoading:false, preflightError:"", preflightTimer:null, preflightToken:0, replace:false, result:null, trigger:null, controller:null },
    sessionSave: { open:false, busy:false, phase:"summary", error:"", package:null, trigger:null },
    signalOperation: { open:false, source:null, operationState:null, busy:false, success:false, validation:null, trigger:null },
    signalMembershipBusy: false, pendingMainSignal: "", namePreview: { displays:{}, panes:{} }, namePreviewIntents:{}, settingsPublishEvents: [], rangeBoundaryIntents:{}, viewportRanges:{}, synchronizedRangeSettlers:{}, synchronizedRangeFrame:null, synchronizedSettingsFrame:null, synchronizedRangePending:{}, synchronizedRangeSuppressByPane:{}, rangeLifecycle:null, rangeLifecycleTokens:{}, rangeLifecycleActive:{}, rangeLifecycleFrame:null, rangeLifecycleRelayoutPending:{}, rangeLifecycleScrollTop:null,
    signalSamples: { signalId:"", signalName:"", token:0, rows:[], startOffset:0, endOffset:0, total:0, firstBatchLoaded:false, pending:{ up:null, down:null, search:null }, error:"", searchValue:"", searchState:"", searchMessage:"" },
    sampleColumnsVisibility:null, sampleColumnsMenuTrigger:null, measurementCursorController:null, measurementCursorSnapshotByPane:{}, measurementCursorUnsubscribe:null, measurementCursorFrame:null,
    scopedLoadingSequence:0, scopedPaneLoads:{}, scopedLayoutLoad:null,
    signalEditor: { signalId:"", summary:null, loading:false, error:"", draft:null }, axisLabelsController:null, signalTrimController:null, signalTrimCursorUnsubscribe:null
  };

  function q(selector) { return document.querySelector(selector); }
  function qa(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]; }); }
  function scopedLoadingController() { return window.SignalAnalyserScopedLoading || null; }
  function plotAutoscaleController() { return window.SignalAnalyserPlotAutoscale || null; }
  function task0141Controller() { return window.SignalAnalyserTask0141 || null; }
  function task0153Controller() { return window.SignalAnalyserTask0153 || null; }
  function extremaActionController() { return window.SignalAnalyserExtremaAction || null; }
  function synchronizedRangeController() { return window.SignalAnalyserSynchronizedRanges || null; }
  function rangeLifecycleKey(displayId, paneId, fieldId) { return [displayId || "", paneId || "", fieldId || ""].join("::"); }
  var RANGE_LIFECYCLE_MAX_ACTIVE_MS=30000;
  function rangeLifecycleRecordLive(record) {
    var nodes=record && record.context && record.context.nodes || {};
    var startedAt=Number(record && record.startedAt);
    return (!startedAt || Date.now()-startedAt < RANGE_LIFECYCLE_MAX_ACTIVE_MS) && (!nodes.plot || nodes.plot.isConnected !== false) && (!nodes.row || nodes.row.isConnected !== false) && (!nodes.slider || nodes.slider.isConnected !== false);
  }
  function completeRangeLifecycleKey(key,state,clearController) {
    var active=model.rangeLifecycleActive[key], controller=rangeLifecycleController();
    if (active && controller) {
      controller.syncState(active.context,state || "ready");
      if (clearController !== false) controller.clear(active.context);
    }
    delete model.rangeLifecycleActive[key];
    delete model.rangeLifecycleTokens[key];
    if (!Object.keys(model.rangeLifecycleActive).length) model.rangeLifecycleScrollTop=null;
  }
  function pruneRangeLifecycles() {
    Object.keys(model.rangeLifecycleActive).forEach(function (key) {
      if (!rangeLifecycleRecordLive(model.rangeLifecycleActive[key])) completeRangeLifecycleKey(key,"cancelled",true);
    });
  }
  function rangeLifecycleCurrentActive() {
    pruneRangeLifecycles();
    var display=activeDisplay(), prefix=display ? model.settingsPage === "screen" ? String(display.id)+"::" : model.activePane ? rangeLifecycleKey(display.id,model.activePane,"") : "" : "";
    return !!prefix && Object.keys(model.rangeLifecycleActive).some(function (key) { return key.indexOf(prefix) === 0 && rangeLifecycleRecordLive(model.rangeLifecycleActive[key]); });
  }
  function rangeLifecycleContext(displayId,paneId,descriptor) {
    var runtimeKey=paneRuntimeKey(displayId,paneId), row=q("[data-testid='settings-field-"+CSS.escape(descriptor.fieldId)+"']"), slider=q("[data-screen-range-slider='"+CSS.escape(descriptor.fieldId)+"']"), paneNode=q("[data-display-id='"+CSS.escape(displayId)+"'][data-pane-id='"+CSS.escape(paneId)+"']"), plot=q("[data-pane-host='"+CSS.escape(runtimeKey)+"']"), fullDomain=slider ? [Number(slider.dataset.fullMin),Number(slider.dataset.fullMax)] : rangeAxisDomain(descriptor);
    if (!fullDomain || !Number.isFinite(fullDomain[0]) || !Number.isFinite(fullDomain[1]) || !(fullDomain[0] < fullDomain[1])) fullDomain=null;
    return {displayId:displayId,paneId:paneId,fieldId:descriptor.fieldId,viewportKey:viewportRangeKey(displayId,paneId,descriptor.fieldId),descriptor:descriptor,projectionOptions:synchronizedRangeOptions(descriptor),fullDomain:fullDomain,nodes:{row:row,slider:slider,pane:paneNode,plot:plot,minInput:row && row.querySelector("[data-range-part='min']"),maxInput:row && row.querySelector("[data-range-part='max']"),minHandle:slider && slider.querySelector("[data-screen-range-input='min']"),maxHandle:slider && slider.querySelector("[data-screen-range-input='max']")}};
  }
  function rememberRangeLifecycle(context,token) {
    if (!context || !token) return;
    var key=rangeLifecycleKey(context.displayId,context.paneId,context.fieldId), content=q("[data-testid='settings-content']");
    model.rangeLifecycleTokens[key]=token;
    model.rangeLifecycleActive[key]={generation:token.generation,context:context,startedAt:Date.now()};
    if (content && model.rangeLifecycleScrollTop === null) model.rangeLifecycleScrollTop=content.scrollTop;
  }
  function restoreRangeLifecycleScroll() {
    var content=q("[data-testid='settings-content']");
    if (content && model.rangeLifecycleScrollTop !== null && content.scrollTop !== model.rangeLifecycleScrollTop) content.scrollTop=model.rangeLifecycleScrollTop;
  }
  function syncRangeLifecycleSelection(context) {
    var slider=context && context.nodes && context.nodes.slider, selection=slider && slider.querySelector(".screen-range-selection"), minimum=context && context.nodes.minHandle, maximum=context && context.nodes.maxHandle;
    if (!selection || !minimum || !maximum || !context.fullDomain) return;
    var span=context.fullDomain[1]-context.fullDomain[0];
    if (!(span > 0)) return;
    selection.style.left=((Number(minimum.value)-context.fullDomain[0])/span*100)+"%";
    selection.style.right=((context.fullDomain[1]-Number(maximum.value))/span*100)+"%";
  }
  function releaseRangeLifecycle(displayId,paneId,state) {
    var prefix=paneId ? rangeLifecycleKey(displayId,paneId,"") : String(displayId || "")+"::";
    Object.keys(model.rangeLifecycleActive).forEach(function (key) {
      if (key.indexOf(prefix) !== 0) return;
      completeRangeLifecycleKey(key,state || "ready",true);
    });
    restoreRangeLifecycleScroll();
    if (!Object.keys(model.rangeLifecycleActive).length) model.rangeLifecycleScrollTop=null;
  }
  function finishRangeLifecycleForNavigation(displayId,paneId) {
    var prefix=paneId ? rangeLifecycleKey(displayId,paneId,"") : String(displayId || "")+"::", controller=rangeLifecycleController();
    Object.keys(model.rangeLifecycleActive).filter(function (key) { return key.indexOf(prefix) === 0; }).forEach(function (key) {
      var token=model.rangeLifecycleTokens[key], finished=!!(controller && token && typeof controller.finish === "function" && controller.finish(token));
      if (model.rangeLifecycleActive[key]) completeRangeLifecycleKey(key,finished ? "committed" : "cancelled",!finished);
    });
    restoreRangeLifecycleScroll();
    if (!Object.keys(model.rangeLifecycleActive).length) model.rangeLifecycleScrollTop=null;
  }
  function rangeLifecycleRelayout(plot,update) {
    if (!plot || !update) return;
    var runtimeKey=plot.dataset.paneHost || "";
    model.rangeLifecycleRelayoutPending[runtimeKey]=Object.assign(model.rangeLifecycleRelayoutPending[runtimeKey] || {},update);
    if (model.rangeLifecycleFrame !== null) return;
    model.rangeLifecycleFrame=window.requestAnimationFrame(function () {
      model.rangeLifecycleFrame=null;
      var pending=model.rangeLifecycleRelayoutPending; model.rangeLifecycleRelayoutPending={};
      Object.keys(pending).forEach(function (key) {
        var host=q("[data-pane-host='"+CSS.escape(key)+"']"), Plotly=window.Plotly, ids=key.split("::");
        if (!host || !Plotly || typeof Plotly.relayout !== "function") return;
        model.synchronizedRangeSuppressByPane[key]=true;
        model.axisLinkSuppressByPane[key]=true;
        queueLinkedTimeRelayout(ids[0],ids[1],pending[key]);
        queueLinkedSpectralRelayout(ids[0],ids[1],pending[key]);
        try { Promise.resolve(Plotly.relayout(host,pending[key])).catch(function () {}).finally(function () { delete model.synchronizedRangeSuppressByPane[key]; delete model.axisLinkSuppressByPane[key]; }); }
        catch (_) { delete model.synchronizedRangeSuppressByPane[key]; delete model.axisLinkSuppressByPane[key]; }
      });
      restoreRangeLifecycleScroll();
    });
  }
  function clearRangeLifecycleExplicit(context) {
    delete model.viewportRanges[context.viewportKey || viewportRangeKey(context.displayId,context.paneId,context.fieldId)];
    rememberRangeBoundaryIntent(context.fieldId,"min","");
    rememberRangeBoundaryIntent(context.fieldId,"max","");
    Object.keys(model.synchronizedRangeSettlers).forEach(function (key) {
      if (key.slice(-context.fieldId.length-2) !== "::"+context.fieldId) return;
      model.synchronizedRangeSettlers[key].cancel();
      delete model.synchronizedRangeSettlers[key];
    });
    delete model.synchronizedRangePending[paneRuntimeKey(context.displayId,context.paneId)];
    if (typeof settings.clearRangeDraft === "function") settings.clearRangeDraft(context.fieldId);
  }
  function commitRangeLifecycle(payload,metadata) {
    var ranges=payload && Array.isArray(payload.ranges) ? payload.ranges : [payload];
    ranges.filter(Boolean).forEach(function (range) {
      var key=metadata && metadata.key || Object.keys(model.rangeLifecycleActive).filter(function (candidate) { var record=model.rangeLifecycleActive[candidate]; return candidate.slice(-range.fieldId.length-2) === "::"+range.fieldId && (!metadata || record.generation === metadata.generation); })[0], active=model.rangeLifecycleActive[key];
      if (!active || !rangeLifecycleRecordLive(active) || metadata && active.generation !== metadata.generation) return;
      var raw={min:range.auto || range.min == null ? "" : String(range.min),max:range.auto || range.max == null ? "" : String(range.max)};
      var viewportKey=active.context.viewportKey || viewportRangeKey(active.context.displayId,active.context.paneId,range.fieldId);
      if (range.auto) delete model.viewportRanges[viewportKey];
      else model.viewportRanges[viewportKey]={min:range.min,max:range.max,generation:metadata && metadata.generation || range.generation || 0};
      rememberRangeBoundaryIntent(range.fieldId,"min",raw.min);
      rememberRangeBoundaryIntent(range.fieldId,"max",raw.max);
      completeRangeLifecycleKey(key,"committed",false);
    });
  }
  function rangeLifecycleController() {
    if (!model.rangeLifecycle && window.SignalAnalyserRangeLifecycle) model.rangeLifecycle=window.SignalAnalyserRangeLifecycle.create({synchronizedRanges:synchronizedRangeController(),settleDelayMs:150,validate:function () { return true; },relayout:rangeLifecycleRelayout,commitViewport:commitRangeLifecycle,clearViewportDraft:clearRangeLifecycleExplicit,cancelPreview:function (context) { var key=rangeLifecycleKey(context.displayId,context.paneId,context.fieldId), settler=model.synchronizedRangeSettlers[key]; if (settler) settler.cancel(); delete model.synchronizedRangeSettlers[key]; }});
    return model.rangeLifecycle;
  }
  function rangeLifecycleDescriptor(fieldId) {
    var pane=paneById(model.activePane), helper=synchronizedRangeController();
    if (!helper) return null;
    var descriptor=pane && helper.descriptors(pane.plot_type).filter(function (item) { return item.fieldId === fieldId; })[0];
    if (descriptor) return {descriptor:descriptor,paneId:pane.id};
    var target=null;
    panes().some(function (candidate) {
      var item=helper.descriptors(candidate.plot_type).filter(function (entry) { return entry.fieldId === fieldId; })[0];
      if (!item) return false;
      target={descriptor:item,paneId:candidate.id};
      return true;
    });
    return target;
  }
  function beginSettingsRangeLifecycle(slider) {
    var display=activeDisplay(), target=slider && rangeLifecycleDescriptor(slider.dataset.screenRangeSlider), lifecycle=rangeLifecycleController();
    if (!display || !target || !lifecycle) return null;
    var context=rangeLifecycleContext(display.id,target.paneId,target.descriptor), token=lifecycle.beginSettingsDrag(context);
    rememberRangeLifecycle(context,token);
    return {key:rangeLifecycleKey(display.id,target.paneId,target.descriptor.fieldId),context:context,token:token};
  }
  function activeSettingsRangeLifecycle(slider) {
    var display=activeDisplay(), fieldId=slider && slider.dataset.screenRangeSlider, target=rangeLifecycleDescriptor(fieldId), key=rangeLifecycleKey(display && display.id,target && target.paneId,fieldId), active=model.rangeLifecycleActive[key], token=model.rangeLifecycleTokens[key];
    if (!active || !token) return beginSettingsRangeLifecycle(slider);
    return {key:key,context:active.context,token:token};
  }
  function settleSettingsRangeLifecycle(slider) {
    var active=activeSettingsRangeLifecycle(slider), lifecycle=rangeLifecycleController();
    if (!active || !lifecycle) return;
    lifecycle.settleSettings(active.token);
  }
  function resetRangeLifecycle(displayId,paneId,descriptors) {
    var lifecycle=rangeLifecycleController();
    if (!lifecycle) return false;
    var contexts=(descriptors || []).map(function (descriptor) { return rangeLifecycleContext(displayId,paneId,descriptor); });
    if (!contexts.length) return false;
    var result=lifecycle.resetMany(contexts);
    contexts.forEach(function (context) {
      syncRangeLifecycleSelection(context);
      var token=(result.tokens || []).filter(function (candidate) { return candidate.key === rangeLifecycleKey(context.displayId,context.paneId,context.fieldId); })[0];
      if (token) rememberRangeLifecycle(context,token);
    });
    return true;
  }
  if (typeof settings.setRenderGuard === "function") settings.setRenderGuard(rangeLifecycleCurrentActive);
  function plotOutputIdentity(pane, record) {
    return [pane && pane.plot_type || "", record && record.context_key || "", record && record.calculation_revision == null ? "" : record.calculation_revision].join("::");
  }
  function nextScopedLoadingToken(scope, displayId, paneId) {
    model.scopedLoadingSequence += 1;
    return [scope, displayId || "", paneId || "", model.scopedLoadingSequence].join("::");
  }
  function beginPaneLoading(displayId, paneId, reason) {
    var controller=scopedLoadingController(), runtimeKey=paneRuntimeKey(displayId, paneId);
    if (!controller || !displayId || !paneId) return null;
    var token=nextScopedLoadingToken(reason || "pane", displayId, paneId);
    model.scopedPaneLoads[runtimeKey]={displayId:displayId, paneId:paneId, token:token, armed:false};
    controller.beginPane(paneId, token);
    return token;
  }
  function armPaneLoading(displayId, paneId, token) {
    var runtimeKey=paneRuntimeKey(displayId, paneId), current=model.scopedPaneLoads[runtimeKey], display=activeDisplay();
    if (!current || current.token !== token) return false;
    if (!display || display.id !== displayId || !paneById(paneId)) return settlePaneLoading(displayId, paneId, "empty", token);
    current.armed=true;
    if (!paneHasSignals(paneById(paneId))) settlePaneLoading(displayId, paneId, "empty", token);
    return true;
  }
  function settlePaneLoading(displayId, paneId, terminal, token) {
    var controller=scopedLoadingController(), runtimeKey=paneRuntimeKey(displayId, paneId), current=model.scopedPaneLoads[runtimeKey];
    if (!controller || !current || token && current.token !== token) return false;
    if (!controller.settlePane(paneId, current.token, terminal)) return false;
    delete model.scopedPaneLoads[runtimeKey];
    return true;
  }
  function beginLayoutLoading(displayId) {
    var controller=scopedLoadingController();
    if (!controller || !displayId) return null;
    var token=nextScopedLoadingToken("layout", displayId, "");
    model.scopedLayoutLoad={displayId:displayId, token:token, accepted:false, pending:{}, hasReady:false, hasError:false};
    controller.beginLayout(displayId, token);
    return token;
  }
  function settleLayoutLoading(displayId, terminal, token) {
    var controller=scopedLoadingController(), current=model.scopedLayoutLoad;
    if (!controller || !current || current.displayId !== displayId || token && current.token !== token) return false;
    if (!controller.settleLayout(displayId, current.token, terminal)) return false;
    model.scopedLayoutLoad=null;
    return true;
  }
  function acceptLayoutLoading(displayId, token) {
    var current=model.scopedLayoutLoad;
    if (!current || current.displayId !== displayId || current.token !== token) return;
    current.accepted=true;
    current.pending={};
    panes().forEach(function (pane) {
      if (paneHasSignals(pane)) current.pending[paneRuntimeKey(displayId, pane.id)]=true;
    });
    var controller=scopedLoadingController();
    if (controller) controller.sync();
    if (!Object.keys(current.pending).length) settleLayoutLoading(displayId, "empty", token);
  }
  function markOutputTerminal(displayId, paneId, terminal) {
    releaseRangeLifecycle(displayId,paneId,terminal);
    var paneLoad=model.scopedPaneLoads[paneRuntimeKey(displayId, paneId)];
    if (paneLoad && paneLoad.armed) settlePaneLoading(displayId, paneId, terminal, paneLoad.token);
    var current=model.scopedLayoutLoad, runtimeKey=paneRuntimeKey(displayId, paneId);
    if (!current || !current.accepted || current.displayId !== displayId || !current.pending[runtimeKey]) return;
    delete current.pending[runtimeKey];
    if (terminal === "error") current.hasError=true;
    if (terminal === "ready") current.hasReady=true;
    if (!Object.keys(current.pending).length) settleLayoutLoading(displayId, current.hasError ? "error" : current.hasReady ? "ready" : "empty", current.token);
  }
  function projectOutputTerminalAfterRender(displayId, paneId, terminal, outputToken) {
    window.requestAnimationFrame(function () {
      var runtimeKey=paneRuntimeKey(displayId, paneId);
      if (model.outputTokens[runtimeKey] !== outputToken) return;
      markOutputTerminal(displayId, paneId, terminal);
    });
  }
  function decorateNoHistory(root) { var target=root || document; if (target && typeof target.querySelectorAll === "function" && task0126 && typeof task0126.decorateNoHistory === "function") task0126.decorateNoHistory(target); }
  function setCheckboxRegionBusy(root, busy) {
    if (!root || !task0126 || typeof task0126.setBusyPreservingCheckboxes !== "function") return;
    if (root.dataset.task0126Busy === String(!!busy)) return;
    root.dataset.task0126Busy=String(!!busy);
    task0126.setBusyPreservingCheckboxes(root, busy);
  }
  function setSignalTableMutationBusy(busy, signalName) {
    var rows=q("[data-signal-rows]"), region=rows && rows.closest(".signal-table-scroll");
    setCheckboxRegionBusy(region, busy);
    qa(".signal-row-actions.is-pinned").forEach(function (actions) { actions.classList.remove("is-pinned"); });
    if (busy && signalName) {
      var row=q("[data-signal-row][data-signal-name='" + CSS.escape(signalName) + "']");
      var actions=row && row.querySelector(".signal-row-actions");
      if (actions) actions.classList.add("is-pinned");
    }
  }
  function displayPreviewName(display) {
    if (!display) return "Экран";
    return Object.prototype.hasOwnProperty.call(model.namePreview.displays, display.id) ? model.namePreview.displays[display.id] : display.name || "Экран";
  }
  function panePreviewName(displayId, pane) {
    if (!pane) return "Область";
    var key=paneRuntimeKey(displayId, pane.id);
    return Object.prototype.hasOwnProperty.call(model.namePreview.panes, key) ? model.namePreview.panes[key] : pane.name || "Область";
  }
  function projectNamePreview(detail) {
    var display=activeDisplay(), value=String(detail && detail.value == null ? "" : detail.value), fieldId=detail && detail.field_id;
    if (!display || detail.display_id && detail.display_id !== display.id) return;
    if (fieldId === "display.name") model.namePreview.displays[display.id]=value;
    else if (fieldId === "pane.name" && model.activePane) {
      model.namePreview.panes[paneRuntimeKey(display.id, model.activePane)]=value;
      model.namePreviewIntents[display.id + "::pane.name::" + String(detail.intent || 0)]=model.activePane;
    }
    else return;
    if (fieldId === "display.name") {
      var tab=q("[data-screen-id='" + CSS.escape(display.id) + "'] .display-tab span");
      if (tab) tab.textContent=value;
    }
    if (fieldId === "pane.name") {
      var title=q("[data-display-id='" + CSS.escape(display.id) + "'][data-pane-id='" + CSS.escape(model.activePane) + "'] .plot-pane-title");
      if (title) title.textContent=value;
    }
    var context=q("[data-settings-context]"), pane=paneById(model.activePane);
    if (context) context.textContent=displayPreviewName(display) + " · " + panePreviewName(display.id, pane);
  }
  function clearNamePreview(fieldId, displayId, paneId) {
    if (fieldId === "display.name") delete model.namePreview.displays[displayId];
    if (fieldId === "pane.name" && paneId) delete model.namePreview.panes[paneRuntimeKey(displayId, paneId)];
  }
  function reconcileNamePreviews(snapshot) {
    (snapshot.displays || []).forEach(function (display) {
      if (Object.prototype.hasOwnProperty.call(model.namePreview.displays, display.id) && display.name === model.namePreview.displays[display.id]) delete model.namePreview.displays[display.id];
    });
    (snapshot.layouts || []).forEach(function (entry) {
      ((entry.layout && entry.layout.panes) || []).forEach(function (pane) {
        var key=paneRuntimeKey(entry.display_id, pane.id);
        if (Object.prototype.hasOwnProperty.call(model.namePreview.panes, key) && pane.name === model.namePreview.panes[key]) delete model.namePreview.panes[key];
      });
    });
  }
  function signalColor(signal) {
    if (signal && typeof signal.color === "string" && signal.color) return signal.color;
    var signals=model.state && Array.isArray(model.state.signals) ? model.state.signals : [], index=Math.max(0, signals.indexOf(signal));
    var palette=task0126 && task0126.signalPalette || ["#2563eb"];
    return palette[index % palette.length];
  }
  function boundedApply(promise, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        var error = new Error("Применение заняло слишком много времени. Повторите действие.");
        error.code = "apply_timeout";
        reject(error);
      }, timeoutMs);
      Promise.resolve(promise).then(function (value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      });
    });
  }

  function boundedRequest(promise, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        var error = new Error("Ответ сервера занял слишком много времени. Повторите действие.");
        error.code = "request_timeout";
        reject(error);
      }, timeoutMs);
      Promise.resolve(promise).then(function (value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      });
    });
  }
  function stateRevision(value) { return value && typeof value.state_revision === "number" ? value.state_revision : null; }
  function activeDisplay() { return model.state && (model.state.displays || []).filter(function (display) { return display.id === model.state.active_display_id; })[0]; }
  function panes() { return model.layout && Array.isArray(model.layout.panes) ? model.layout.panes : []; }
  function paneById(id) { return panes().filter(function (pane) { return pane.id === id; })[0]; }
  function paneRuntimeKey(displayId, paneId) { return String(displayId) + "::" + String(paneId); }

  function cancelInactiveDisplayWork(activeDisplayId) {
    Object.keys(model.pollByPane).forEach(function (key) {
      if (key.indexOf(String(activeDisplayId) + "::") !== 0) {
        window.clearTimeout(model.pollByPane[key]);
        delete model.pollByPane[key];
      }
    });
    Object.keys(model.plotQueue).forEach(function (key) { if (key.indexOf(String(activeDisplayId) + "::") !== 0) delete model.plotQueue[key]; });
    Object.keys(model.peaksPollByPane).forEach(function (key) {
      if (key.indexOf(String(activeDisplayId) + "::") !== 0) { window.clearTimeout(model.peaksPollByPane[key]); delete model.peaksPollByPane[key]; }
    });
  }

  function accept(snapshot) {
    var r = stateRevision(snapshot);
    if (!snapshot || r === null || r<model.revision || !Array.isArray(snapshot.displays) || !snapshot.displays.length) return false;
    model.state = snapshot;
    model.revision = r;
    reconcileNamePreviews(snapshot);
    settings.setRevision(r);
    updateLayout(snapshot);
    var display = activeDisplay();
    if (display) {
      cancelInactiveDisplayWork(display.id);
      stopPeaksPolling(model.activePane ? paneRuntimeKey(display.id, model.activePane) : "");
      settings.setContext(display.id, r);
    }
    return true;
  }

  function updateLayout(snapshot) {
    var source = (snapshot.layouts || []).filter(function (item) { return item.display_id === snapshot.active_display_id; })[0];
    model.layout = source ? source.layout : snapshot.layout;
    model.activePane = model.layout && model.layout.active_pane_id;
    var display = activeDisplay();
    var activeKey = display && model.activePane ? paneRuntimeKey(display.id, model.activePane) : null;
    if (model.extremaTargetKey && model.extremaTargetKey !== activeKey) model.extremaTargetKey = null;
    var currentKeys = {};
    (snapshot.layouts || []).forEach(function (item) {
      var owningDisplay = (snapshot.displays || []).filter(function (candidate) { return candidate.id === item.display_id; })[0];
      var itemPanes = item.layout && Array.isArray(item.layout.panes) ? item.layout.panes : [];
      itemPanes.forEach(function (pane) {
        var key = paneRuntimeKey(item.display_id, pane.id);
        currentKeys[key] = true;
        var sliderEligible=paneHasSignals(pane) && ["time", "spectrum"].indexOf(pane.plot_type) >= 0;
        if (!sliderEligible) {
          delete model.rangeSliderByPane[key];
          delete model.rangeSliderDataRangeByPane[key];
          delete model.rangeSliderFullRangeByPane[key];
          delete model.rangeSliderAdjustByPane[key];
          delete model.amplitudeSliderByPane[key];
          delete model.amplitudeDataRangeByPane[key];
          delete model.amplitudeFullRangeByPane[key];
          delete model.amplitudeSelectedRangeByPane[key];
        }
        if (!paneHasSignals(pane)) {
          delete model.graphDefaultRangeByPane[key];
          delete model.graphDefaultSignatureByPane[key];
          delete model.plotAutoscaleByPane[key];
        }
      });
      if (!owningDisplay) itemPanes.forEach(function (pane) {
        var key = paneRuntimeKey(item.display_id, pane.id);
        delete model.rangeSliderByPane[key];
        delete model.rangeSliderDataRangeByPane[key];
        delete model.rangeSliderFullRangeByPane[key];
        delete model.rangeSliderAdjustByPane[key];
        delete model.amplitudeSliderByPane[key];
        delete model.amplitudeDataRangeByPane[key];
        delete model.amplitudeFullRangeByPane[key];
        delete model.amplitudeSelectedRangeByPane[key];
        delete model.graphDefaultRangeByPane[key];
        delete model.graphDefaultSignatureByPane[key];
        delete model.plotAutoscaleByPane[key];
      });
    });
    Object.keys(model.rangeSliderByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderByPane[key]; });
    Object.keys(model.rangeSliderDataRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderDataRangeByPane[key]; });
    Object.keys(model.rangeSliderFullRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderFullRangeByPane[key]; });
    Object.keys(model.rangeSliderAdjustByPane).forEach(function (key) { if (!currentKeys[key]) delete model.rangeSliderAdjustByPane[key]; });
    Object.keys(model.amplitudeSliderByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeSliderByPane[key]; });
    Object.keys(model.amplitudeDataRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeDataRangeByPane[key]; });
    Object.keys(model.amplitudeFullRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeFullRangeByPane[key]; });
    Object.keys(model.amplitudeSelectedRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeSelectedRangeByPane[key]; });
    Object.keys(model.amplitudeFrameByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudeFrameByPane[key]; });
    Object.keys(model.amplitudePendingByPane).forEach(function (key) { if (!currentKeys[key]) delete model.amplitudePendingByPane[key]; });
    Object.keys(model.graphDefaultRangeByPane).forEach(function (key) { if (!currentKeys[key]) delete model.graphDefaultRangeByPane[key]; });
    Object.keys(model.graphDefaultSignatureByPane).forEach(function (key) { if (!currentKeys[key]) delete model.graphDefaultSignatureByPane[key]; });
    Object.keys(model.plotAutoscaleByPane).forEach(function (key) { if (!currentKeys[key]) delete model.plotAutoscaleByPane[key]; });
  }

  function scheduleRender() {
    if (model.renderFrame) return;
    model.renderFrame = window.requestAnimationFrame(function () {
      model.renderFrame = null;
      render();
    });
  }

  function render() {
    var display = activeDisplay();
    if (!display || !model.layout) return;
    var shell = q("[data-testid='app-shell']");
    shell.dataset.stateRevision = String(model.revision);
    shell.dataset.activePane = model.activePane || "";
    renderTabs();
    renderLayoutTrigger();
    renderGrid();
    renderSettings(display);
    renderInspector();
    renderColumnMenu();
    renderMeasurementMenu();
    decorateNoHistory(document);
  }

  function renderTabs() {
    var tablist = q("[data-testid='display-tabs']");
    if (!tablist) return;
    var activeId = model.state.active_display_id;
    var revealActive = model.renderedDisplayId !== activeId;
    tablist.innerHTML = (model.state.displays || []).map(function (display) {
      var selected = display.id === model.state.active_display_id;
      var displayName = displayPreviewName(display);
      return "<div class='display-tab-shell" + (selected ? " is-selected" : "") + "' data-screen-id='" + esc(display.id) + "'>" +
        "<button class='display-tab' type='button' role='tab' data-display-select='" + esc(display.id) + "' data-testid='display-tab-" + esc(display.id) + "' aria-selected='" + selected + "'><span>" + esc(displayName) + "</span></button>" +
        "<button class='display-tab-close header-chrome-button' type='button' data-display-close='" + esc(display.id) + "' data-testid='display-close-" + esc(display.id) + "' aria-label='Удалить " + esc(displayName) + "' data-tooltip='Удалить " + esc(displayName) + "'" + (model.state.displays.length === 1 ? " disabled" : "") + "><img src='./icons/close.svg' alt=''></button>" +
        "</div>";
    }).join("");
    model.renderedDisplayId = activeId;
    scheduleDisplayTabScrollUpdate(revealActive);
  }

  function revealActiveDisplayTab() {
    var tablist = q("[data-testid='display-tabs']");
    var selected = tablist && tablist.querySelector(".display-tab-shell.is-selected");
    if (!selected) return;
    var viewportStart = tablist.scrollLeft;
    var viewportEnd = viewportStart + tablist.clientWidth;
    var tabStart = selected.offsetLeft;
    var tabEnd = tabStart + selected.offsetWidth;
    if (tabStart < viewportStart) tablist.scrollLeft = tabStart;
    else if (tabEnd > viewportEnd) tablist.scrollLeft = tabEnd - tablist.clientWidth;
  }

  function updateDisplayTabScroll() {
    var tablist = q("[data-testid='display-tabs']");
    var previous = q("[data-testid='display-scroll-left']");
    var next = q("[data-testid='display-scroll-right']");
    if (!tablist || !previous || !next) return;
    var maxScroll = Math.max(0, tablist.scrollWidth - tablist.clientWidth);
    var hasOverflow = maxScroll > 1;
    previous.hidden = !hasOverflow || tablist.scrollLeft <= 1;
    next.hidden = !hasOverflow || tablist.scrollLeft >= maxScroll - 1;
  }

  function scheduleDisplayTabScrollUpdate(revealActive) {
    model.revealDisplayTab = model.revealDisplayTab || !!revealActive;
    if (model.displayTabsFrame) return;
    model.displayTabsFrame = window.requestAnimationFrame(function () {
      var shouldReveal = model.revealDisplayTab;
      model.displayTabsFrame = null;
      model.revealDisplayTab = false;
      if (shouldReveal) revealActiveDisplayTab();
      updateDisplayTabScroll();
    });
  }

  function scrollDisplayTabs(direction) {
    var tablist = q("[data-testid='display-tabs']");
    if (!tablist) return;
    var distance = Math.max(160, Math.floor(tablist.clientWidth * 0.75));
    tablist.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  function workspaceInspectorContract(state, action) {
    if (state === "expanded") return action === "down" ? { hidden:false, tooltip:"Вернуть средний размер", label:"Нижняя зона: развернута. Вернуть средний размер" } : { hidden:true };
    if (state === "collapsed") return action === "up" ? { hidden:false, tooltip:"Вернуть средний размер", label:"Нижняя зона: свернута. Вернуть средний размер" } : { hidden:true };
    return action === "up"
      ? { hidden:false, tooltip:"Развернуть нижнюю зону", label:"Нижняя зона: средний размер. Развернуть полностью" }
      : { hidden:false, tooltip:"Свернуть нижнюю зону", label:"Нижняя зона: средний размер. Свернуть полностью" };
  }

  function renderWorkspaceInspectorState() {
    var nodes = workspaceSplitNodes();
    if (!nodes.stack || !nodes.controls) return;
    nodes.stack.dataset.inspectorState = model.workspaceInspectorState;
    nodes.controls.dataset.currentState = model.workspaceInspectorState;
    [nodes.up, nodes.down].forEach(function (button) {
      if (!button) return;
      var contract = workspaceInspectorContract(model.workspaceInspectorState, button.dataset.inspectorStateAction);
      button.hidden = contract.hidden;
      if (contract.hidden) return;
      button.dataset.tooltip = contract.tooltip;
      button.title = contract.tooltip;
      button.setAttribute("aria-label", contract.label);
    });
  }

  function closeWorkspaceInspectorMenus() {
    if (valueSelect) valueSelect.close(false);
    closePaneMenu(false);
    closeColumnMenu(false);
    closeMeasurementMenu(false);
    if (model.layoutDraft) closeLayout();
  }

  function setWorkspaceInspectorState(state, autoscale) {
    if (["split", "expanded", "collapsed"].indexOf(state) < 0 || state === model.workspaceInspectorState) return;
    model.workspaceInspectorState = state;
    renderWorkspaceInspectorState();
    if (state === "split") retainWorkspaceSplitOnResize();
    if (autoscale) queueWorkspaceSplitAutoscale();
  }

  function changeWorkspaceInspectorState(button) {
    closeWorkspaceInspectorMenus();
    var action = button && button.dataset.inspectorStateAction;
    var current = model.workspaceInspectorState;
    var next = current === "split" ? (action === "up" ? "expanded" : action === "down" ? "collapsed" : null) :
      current === "expanded" && action === "down" ? "split" : current === "collapsed" && action === "up" ? "split" : null;
    if (!next) return;
    setWorkspaceInspectorState(next, true);
    var nodes = workspaceSplitNodes();
    var focusTarget = button && !button.hidden ? button : next === "expanded" ? nodes.down : next === "collapsed" ? nodes.up : null;
    if (focusTarget && focusTarget.isConnected) {
      try { focusTarget.focus({ preventScroll:true }); }
      catch (_) { focusTarget.focus(); }
    }
  }

  function workspaceSplitNodes() {
    return {
      stack: q("[data-testid='workspace-inspector-stack']"),
      main: q(".main-stage"),
      splitter: q("[data-testid='workspace-inspector-splitter']"),
      controls: q("[data-testid='inspector-state-controls']"),
      up: q("[data-testid='inspector-state-up']"),
      down: q("[data-testid='inspector-state-down']")
    };
  }

  function workspaceSplitMaximum(stack) {
    return Math.max(440, Math.floor(stack.getBoundingClientRect().height - 8 - 180));
  }

  function setWorkspaceSplitHeight(requestedHeight, preserveRatio) {
    var nodes = workspaceSplitNodes();
    if (!nodes.stack || !nodes.main) return null;
    var maximum = workspaceSplitMaximum(nodes.stack);
    var height = Math.round(Math.max(440, Math.min(maximum, requestedHeight)));
    var excess = maximum - 440;
    if (excess > 0 && !preserveRatio) model.workspaceSplitRatio = (height - 440) / excess;
    nodes.stack.style.setProperty("--workspace-main-track", height + "px");
    return height;
  }

  function retainWorkspaceSplitOnResize() {
    if (model.workspaceSplitRatio === null) return;
    var nodes = workspaceSplitNodes();
    if (!nodes.stack) return;
    var maximum = workspaceSplitMaximum(nodes.stack);
    setWorkspaceSplitHeight(440 + model.workspaceSplitRatio * (maximum - 440), true);
  }

  function cancelWorkspaceSplitAutoscale() {
    model.workspaceSplitAutoscaleToken += 1;
    if (model.workspaceSplitAutoscaleFrame !== null) window.cancelAnimationFrame(model.workspaceSplitAutoscaleFrame);
    model.workspaceSplitAutoscaleFrame = null;
  }

  function currentReadyPlotHost(host, displayId) {
    if (!host || !host.isConnected || host.dataset.plotReady !== "true") return false;
    if (!host.dataset.paneHost || host.dataset.paneHost.indexOf(String(displayId) + "::") !== 0) return false;
    if (host.hidden || host.offsetParent === null) return false;
    var style = window.getComputedStyle(host), rect = host.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function plotAutorangeUpdate(host) {
    var fullLayout = host && host._fullLayout;
    if (!fullLayout) return null;
    var update = { autosize:true }, axisCount = 0;
    Object.keys(fullLayout).forEach(function (key) {
      if (!/^[xy]axis(?:[1-9][0-9]*)?$/.test(key)) return;
      if (!fullLayout[key] || fullLayout[key].visible === false) return;
      update[key + ".autorange"] = true;
      axisCount += 1;
    });
    return axisCount ? update : null;
  }

  function queueWorkspaceSplitAutoscale() {
    cancelWorkspaceSplitAutoscale();
    var token = model.workspaceSplitAutoscaleToken;
    model.workspaceSplitAutoscaleFrame = window.requestAnimationFrame(function () {
      model.workspaceSplitAutoscaleFrame = null;
      var display = activeDisplay();
      if (!display || token !== model.workspaceSplitAutoscaleToken) return;
      var hosts = qa(".plot-chart[data-pane-host][data-plot-ready='true']").filter(function (host) { return currentReadyPlotHost(host, display.id); });
      if (!hosts.length) return;
      loadPlotly().then(function (Plotly) {
        if (token !== model.workspaceSplitAutoscaleToken || !activeDisplay() || activeDisplay().id !== display.id) return;
        hosts.forEach(function (host) {
          if (token !== model.workspaceSplitAutoscaleToken || !currentReadyPlotHost(host, display.id)) return;
          var update = plotAutorangeUpdate(host);
          if (!update) return;
          try {
            Promise.resolve(Plotly.relayout(host, update)).catch(function () { /* A single host must not block the remaining panes. */ });
          } catch (_) { /* A detached or failed host is intentionally ignored. */ }
        });
      }).catch(function () { /* Plotly is already loaded for a ready host; keep this failure isolated. */ });
    });
  }

  function stopWorkspaceSplitDrag(event) {
    var drag = model.workspaceSplitDrag;
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    var splitter = workspaceSplitNodes().splitter;
    if (splitter && splitter.hasPointerCapture && splitter.hasPointerCapture(drag.pointerId)) splitter.releasePointerCapture(drag.pointerId);
    if (splitter) splitter.classList.remove("is-dragging");
    document.body.classList.remove("is-resizing-workspace");
    model.workspaceSplitDrag = null;
    if (event && event.type === "pointerup" && Math.abs((drag.currentMainHeight == null ? drag.startMainHeight : drag.currentMainHeight) - drag.startMainHeight) > 0.5) queueWorkspaceSplitAutoscale();
    else if (event && event.type === "pointerup" && drag.changed) queueWorkspaceSplitAutoscale();
  }

  function startWorkspaceSplitDrag(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    var nodes = workspaceSplitNodes();
    if (!nodes.main || !nodes.splitter) return;
    cancelWorkspaceSplitAutoscale();
    event.preventDefault();
    model.workspaceSplitDrag = { pointerId:event.pointerId, startY:event.clientY, startMainHeight:nodes.main.getBoundingClientRect().height, currentMainHeight:null, changed:false };
    nodes.splitter.setPointerCapture(event.pointerId);
    nodes.splitter.classList.add("is-dragging");
    document.body.classList.add("is-resizing-workspace");
  }

  function moveWorkspaceSplitDrag(event) {
    var drag = model.workspaceSplitDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    if (model.workspaceInspectorState !== "split") {
      if (Math.abs(event.clientY - drag.startY) < 4) return;
      var nodes = workspaceSplitNodes();
      if (!nodes.stack) return;
      setWorkspaceInspectorState("split", false);
      drag.currentMainHeight = setWorkspaceSplitHeight(event.clientY - nodes.stack.getBoundingClientRect().top);
      drag.startMainHeight = drag.currentMainHeight;
      drag.startY = event.clientY;
      drag.changed = true;
      return;
    }
    var previousHeight = drag.currentMainHeight == null ? drag.startMainHeight : drag.currentMainHeight;
    drag.currentMainHeight = setWorkspaceSplitHeight(drag.startMainHeight + event.clientY - drag.startY);
    if (drag.currentMainHeight !== null && Math.abs(drag.currentMainHeight - previousHeight) > 0.5) drag.changed = true;
  }

  function renderLayoutTrigger() {
    var trigger = q("[data-testid='layout-trigger']");
    if (!trigger) return;
    var label = (model.layout ? model.layout.rows + " × " + model.layout.columns : "1 × 1");
    var current = trigger.querySelector(".layout-current");
    if (!current) {
      current = document.createElement("span");
      current.className = "layout-current";
      trigger.insertBefore(current, trigger.querySelector(".layout-chevron"));
      current.outerHTML = "<span class='layout-current'></span>";
      current = trigger.querySelector(".layout-current");
    }
    if (current) current.textContent = label;
    trigger.setAttribute("aria-label", "Изменить макет, текущий макет " + label.replace(" × ", " на "));
  }

  function graphLoaderEpisode(displayId, pane, record) {
    var context = record && record.context_key;
    var calculation = record && record.calculation_revision;
    var provisional = context === null || context === undefined || calculation === null || calculation === undefined;
    var paneContext = String(pane.plot_type || "") + "::" + JSON.stringify(Array.isArray(pane.signal_bindings) ? pane.signal_bindings : []);
    return {
      key:"graph::" + paneRuntimeKey(displayId, pane.id) + "::" + paneContext + "::" + (provisional ? "awaiting" : String(context) + "::" + String(calculation)),
      provisional:provisional
    };
  }

  function internalErrorText(value) {
    return /(?:ArgumentError|MethodError|LoadError|BoundsError|UndefVarError|Stacktrace|Непустой Display должен иметь Time Limits|\.jl:\d+)/i.test(String(value || ""));
  }

  function outputErrorText(error) {
    return safeErrorText(error, "Не удалось построить график. Проверьте настройки области и повторите действие.");
  }

  function outputMarkup(displayId, pane, record) {
    var output = record && record.output;
    if (!pane.signal_bindings || !pane.signal_bindings.length) return "<div class='plot-empty' data-pane-output-state='empty' data-testid='pane-empty-" + esc(pane.id) + "' role='status'>Выберете сигнал для отображения</div>";
    if (!output || !output.isready) {
      var episode = graphLoaderEpisode(displayId, pane, record);
      return "<div class='plot-initial-loading' data-pane-output-state='loading' data-loader-episode-key='" + esc(episode.key) + "' data-loader-episode-provisional='" + String(episode.provisional) + "' data-testid='pane-loader-" + esc(pane.id) + "' role='status' aria-label='Загрузка графика'><span class='spinner' data-loader-spinner data-loader-episode-key='" + esc(episode.key) + "' aria-hidden='true'></span><span>Загрузка графика</span></div>";
    }
    if (!output.success) return "<div class='plot-error' data-pane-output-state='error' data-testid='pane-error-" + esc(pane.id) + "' role='alert'>" + esc(outputErrorText(output.error)) + "</div>";
    return "<div class='plot-chart' data-pane-output-state='ready' data-pane-host='" + esc(paneRuntimeKey(displayId, pane.id)) + "' data-testid='plot-host-" + esc(pane.id) + "' data-plot-ready='false'></div>";
  }

  function createPaneNode(displayId, pane) {
    var node = document.createElement("section");
    node.className = "plot-pane";
    node.tabIndex = 0;
    node.dataset.paneId = pane.id;
    node.dataset.displayId = displayId;
    node.dataset.testid = "plot-pane-" + pane.id;
    node.innerHTML = "<header class='plot-pane-header'><span class='plot-pane-title'></span><div class='plot-control-cluster'><div class='pane-select value-select-trigger select-trigger'></div><button class='plot-more' type='button' data-pane-menu='" + esc(pane.id) + "'><img src='./icons/more-vertical.svg' alt=''></button></div></header><div class='plot-canvas'></div>";
    return node;
  }

  function reconcilePaneOutput(canvas, displayId, pane, record) {
    var output = record && record.output;
    var current = canvas.firstElementChild;
    if (paneHasSignals(pane) && (!output || !output.isready) && current && current.dataset.paneOutputState === "loading") {
      var episode = graphLoaderEpisode(displayId, pane, record);
      var sameEpisode = current.dataset.loaderEpisodeKey === episode.key;
      if (!sameEpisode && current.dataset.loaderEpisodeProvisional === "true" && !episode.provisional) {
        current.dataset.loaderEpisodeKey = episode.key;
        current.dataset.loaderEpisodeProvisional = String(episode.provisional);
        var promotedSpinner = current.querySelector("[data-loader-spinner]");
        if (promotedSpinner) promotedSpinner.dataset.loaderEpisodeKey = episode.key;
        sameEpisode = true;
      }
      if (sameEpisode) return;
    }
    var runtimeKey = paneRuntimeKey(displayId, pane.id);
    if (output && output.isready && output.success && current && current.dataset.paneOutputState === "ready" && current.dataset.paneHost === runtimeKey) return;
    canvas.innerHTML = outputMarkup(displayId, pane, record);
  }

  function reconcilePaneNode(node, displayId, pane, index, record) {
    var selected = pane.id === model.activePane;
    var runtimeKey = paneRuntimeKey(displayId, pane.id);
    var extremaTarget = runtimeKey === model.extremaTargetKey;
    node.classList.toggle("is-active", selected);
    node.classList.toggle("is-extrema-settings-target", extremaTarget);
    node.dataset.paneId = pane.id;
    node.dataset.displayId = displayId;
    node.dataset.paneSelected = String(selected);
    node.dataset.testid = "plot-pane-" + pane.id;
    var paneName = panePreviewName(displayId, pane);
    node.setAttribute("aria-label", paneName + (selected ? ", активная" : "") + (extremaTarget ? ", настраивается расчёт экстремумов" : ""));
    var title = node.querySelector(".plot-pane-title");
    if (title) title.textContent = paneName;
    var select = node.querySelector(".pane-select");
    if (select) {
      var paneSelectKey="pane::" + displayId + "::" + pane.id + "::plot_type";
      valueSelect.configure(select, {
        key:paneSelectKey,
        value:pane.plot_type,
        label:titles[pane.plot_type] || pane.plot_type,
        options:Object.keys(titles).map(function (kind) { return { value:kind, label:titles[kind] }; }),
        className:"pane-select",
        testId:"pane-type-" + pane.id,
        ariaLabel:"Тип графика " + paneName,
        onSelect:function (plotType) {
          var current=paneById(pane.id);
          if (current && current.plot_type !== plotType) postLayout({ operation:"update_pane", pane_id:current.id, plot_type:plotType, signal_bindings:current.signal_bindings || [] });
        }
      });
    }
    var menu = node.querySelector(".plot-more");
    if (menu) {
      menu.dataset.paneMenu = pane.id;
      menu.dataset.testid = "pane-menu-" + pane.id;
      menu.setAttribute("aria-label", "Действия области " + paneName);
      menu.setAttribute("aria-haspopup", "menu");
      if (!menu.hasAttribute("aria-expanded")) menu.setAttribute("aria-expanded", "false");
    }
    reconcilePaneTrimAction(node,displayId,pane);
    var canvas = node.querySelector(".plot-canvas");
    if (canvas) {
      canvas.setAttribute("aria-label", "График области " + paneName);
      reconcilePaneOutput(canvas, displayId, pane, record);
    }
  }

  function renderGrid() {
    var grid = q("[data-testid='plot-grid']");
    if (!grid) return;
    grid.style.gridTemplateColumns = "repeat(" + model.layout.columns + ", minmax(0, 1fr))";
    grid.style.gridTemplateRows = "repeat(" + model.layout.rows + ", minmax(0, 1fr))";
    var display = activeDisplay();
    if (!display) return;
    var displayPanes = panes();
    grid.dataset.paneCount = String(displayPanes.length);
    var retained = {};
    displayPanes.forEach(function (pane, index) {
      var selector = "[data-pane-id='" + CSS.escape(pane.id) + "'][data-display-id='" + CSS.escape(display.id) + "']";
      var node = grid.querySelector(selector) || createPaneNode(display.id, pane);
      var runtimeKey = paneRuntimeKey(display.id, pane.id);
      retained[runtimeKey] = true;
      reconcilePaneNode(node, display.id, pane, index, model.outputs[runtimeKey]);
      if (grid.children[index] !== node) grid.insertBefore(node, grid.children[index] || null);
    });
    Array.prototype.slice.call(grid.children).forEach(function (node) {
      var runtimeKey=paneRuntimeKey(node.dataset.displayId, node.dataset.paneId);
      if (!retained[runtimeKey]) {
        var cursors=paneGraphCursorController();
        if (cursors) cursors.clear(runtimeKey);
        var cursorColumns=measurementCursorColumnsController();
        if (cursorColumns) cursorColumns.clear(runtimeKey);
        delete model.measurementCursorSnapshotByPane[runtimeKey];
        var labels=axisLabelsController();
        if (labels) labels.clear(runtimeKey);
        Object.keys(model.viewportRanges).forEach(function (key) { if (key.indexOf(runtimeKey+"::") === 0) delete model.viewportRanges[key]; });
        if (model.rangeLifecycleController && typeof model.rangeLifecycleController.clearPane === "function") model.rangeLifecycleController.clearPane(runtimeKey);
        if (model.signalTrimController) model.signalTrimController.destroy();
        node.remove();
      }
    });
    displayPanes.forEach(function (pane) {
      var record = model.outputs[paneRuntimeKey(display.id, pane.id)];
      if (record && record.output && record.output.isready && record.output.success && hasPlotData(record.output.data)) enqueuePlot(display.id, pane, record);
    });
    valueSelect.reconcile();
    var loading=scopedLoadingController();
    if (loading) loading.sync();
  }

  function renderActivePaneContext() {
    var display = activeDisplay();
    if (!display || !model.layout) return;
    var shell = q("[data-testid='app-shell']");
    if (shell) {
      shell.dataset.stateRevision = String(model.revision);
      shell.dataset.activePane = model.activePane || "";
    }
    var grid = q("[data-testid='plot-grid']");
    if (grid) grid.dataset.paneCount = String(panes().length);
    qa("[data-pane-id]").forEach(function (node) {
      var selected = node.dataset.paneId === model.activePane;
      var extremaTarget = display && paneRuntimeKey(display.id, node.dataset.paneId) === model.extremaTargetKey;
      var pane = paneById(node.dataset.paneId);
      var paneName = panePreviewName(display.id, pane);
      node.classList.toggle("is-active", selected);
      node.classList.toggle("is-extrema-settings-target", extremaTarget);
      node.dataset.paneSelected = String(selected);
      node.setAttribute("aria-label", paneName + (selected ? ", активная" : "") + (extremaTarget ? ", настраивается расчёт экстремумов" : ""));
    });
    renderSettings(display);
    renderInspector();
  }

  function sessionImportNode() { return q("[data-testid='session-package-import-dialog']"); }
  function sessionImportMessage(error, fallback) {
    var payload = error && error.payload;
    if (payload && payload.error && payload.error.message) return payload.error.message;
    if (payload && payload.message) return payload.message;
    return safeErrorText(error, fallback || "Не удалось импортировать сессию.");
  }
  function sessionImportFocusables(dialog) { return dialog ? Array.prototype.slice.call(dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), summary:not([disabled])")).filter(function (node) { return !node.hidden; }) : []; }
  function setSessionImportModalBackground(active) {
    var shell = q("[data-testid='app-shell']");
    if (!shell) return;
    shell.inert = !!active;
    if (active) shell.setAttribute("aria-hidden", "true");
    else shell.removeAttribute("aria-hidden");
  }
  function packageError(error, fallback) { var payload=error&&error.payload, detail=payload&&payload.error; return (detail&&(detail.message||detail.code)) || sessionImportMessage(error, fallback); }
  function packageRows() { return [["Сессия и настройки","Экраны, области, привязки и текущие настройки анализа."],["Исходные данные сигналов","Имена, цвета, частоты дискретизации и исходные real/imag отсчёты."],["Снимки готовых графиков","Текущие готовые снимки графиков; состояния загрузки и ошибки не включаются."],["reproduce.jl","Скрипт включается как файл и никогда не запускается автоматически."],["Метаданные зависимостей","Project.toml, Manifest.toml и сведения о среде Engee."]]; }
  function packageProgress(title, copy, cancelId, locked) { return "<div class='progress-block' role='status' aria-live='polite'><span class='spinner'></span><div class='progress-copy'><strong>"+esc(title)+"</strong><span>"+esc(copy)+"</span></div><div class='progress-track'><i class='progress-value'></i></div></div>"; }
  function modalLayer(id, title, body, footer, busy) { return "<section class='dialog-card' role='dialog' aria-modal='true' aria-labelledby='"+id+"-title'><header class='dialog-titlebar'><h2 id='"+id+"-title' tabindex='-1'>"+esc(title)+"</h2><button class='icon-button dialog-close' type='button' data-package-close aria-label='Закрыть'"+(busy?" disabled":"")+"><img src='./icons/close.svg' alt=''></button></header><div class='dialog-body'>"+body+"</div><footer class='dialog-footer'>"+footer+"</footer></section>"; }
  function renderSessionImportDialog() {
    var current=model.sessionImport, dialog=sessionImportNode(), body, footer, v=current.validation||{}, collisions=(current.preflight&&current.preflight.collisions)||[];
    if (!current.open) { if(dialog) dialog.remove(); if(!model.sessionSave.open) setSessionImportModalBackground(false); return; }
    if (!dialog) { dialog=document.createElement("div"); dialog.className="modal-layer primary-modal-layer package-modal"; dialog.dataset.testid="session-package-import-dialog"; document.body.appendChild(dialog); }
    setSessionImportModalBackground(true); dialog.setAttribute("aria-busy", String(current.busy));
    if (current.phase==="validate") { body=packageProgress("Проверяем пакет","Структура, версия, ограничения и контрольные суммы…"); footer="<button class='button' data-package-cancel>Отменить проверку</button>"; }
    else if (current.phase==="error") { body="<div class='alert alert-error' data-testid='import-error' role='alert'><strong>Этот файл нельзя импортировать</strong><p>Текущая сессия не изменена и ни один загруженный скрипт не был запущен.</p><p>"+esc(current.error)+"</p></div>"; footer="<button class='button' data-package-close>Закрыть</button><button class='button' data-package-reselect>Выбрать другой файл</button><button class='button button-primary' data-testid='import-error-details'>Подробности проверки</button>"; }
    else if (current.phase==="commit") { body=packageProgress("Восстанавливаем сессию","Применяем проверенный пакет и обновляем состояние приложения."); footer="<button class='button' disabled>Восстановление…</button>"; }
    else if (current.phase==="success") { var w=current.result&&current.result.workspace; body="<div class='result-heading' data-testid='import-success'><img class='result-icon' src='./icons/tick-figma.svg' alt=''><div><h3>Сессия восстановлена</h3><p>"+esc(w&&w.requested ? (w.success ? "Публикация в рабочую область завершена." : "Сессия восстановлена; проверьте отчёт публикации.") : "Рабочая область Engee не изменена.")+"</p></div></div>"+(w&&w.requested?"<details data-testid='session-package-details'><summary>Отчёт публикации</summary><p>"+esc(w.error||((w.items||[]).map(function(i){return i.variable_name+": "+i.action;}).join(", ")||"Нет опубликованных имён."))+"</p></details>":""); footer="<button class='button button-primary' data-testid='import-success' data-package-close>Готово</button>"; }
    else { body="<p class='dialog-intro'>Перед восстановлением приложение проверит структуру, версию, ограничения и контрольные суммы.</p><div class='selected-file'><img src='./icons/file.svg' alt=''><div><strong>"+esc(current.file&&current.file.name)+"</strong><small>.sazip</small></div></div><div class='alert alert-warning'><strong>Безопасный импорт</strong><p>Скрипт reproduce.jl будет сохранён как файл пакета и никогда не выполняется при импорте.</p></div>"; footer="<button class='button' data-package-close>Отмена</button><button class='button button-primary' data-testid='import-validate'>Проверить пакет</button>"; }
    if(current.phase==="summary") { body="<div class='result-heading'><img class='result-icon' src='./icons/tick-figma.svg' alt=''><div><h3>Пакет проверен</h3><p>.sazip v"+esc(v.version)+" · контрольных сумм: "+esc(v.contents&&v.contents.checksum_count)+"</p></div></div><dl class='summary-grid'><dt>Сигналы</dt><dd>"+esc(v.contents&&v.contents.signals)+"</dd><dt>Экраны</dt><dd>"+esc(v.contents&&v.contents.displays)+"</dd><dt>Готовые графики</dt><dd>"+esc(v.contents&&v.contents.graph_snapshots)+"</dd><dt>Отсчёты</dt><dd>"+esc(v.limits&&v.limits.total_samples)+" / "+esc(v.limits&&v.limits.max_total_samples)+"</dd></dl><details data-testid='package-contents'><summary>Состав пакета</summary><ul><li>Сессия и настройки</li><li>Исходные данные сигналов</li><li>Готовые снимки графиков</li><li>reproduce.jl · не будет выполнен</li><li>Метаданные зависимостей</li></ul></details><label class='package-checkbox'><input type='checkbox' data-testid='workspace-publish'"+(current.publish?" checked":"")+"> Опубликовать сигналы в рабочую область Engee<small>Выключено по умолчию. Без публикации сигналы остаются только внутри приложения.</small></label>"+(current.publish?"<label class='field-label'>Префикс имён<input class='text-input' data-testid='workspace-prefix' value='"+esc(current.prefix)+"'><small>Префикс добавляется к именам публикуемых переменных.</small></label>"+(current.preflightLoading?"<p class='muted-copy' role='status'>Проверяем имена рабочей области…</p>":"")+(current.preflightError?"<p class='session-import-error' role='alert'>"+esc(current.preflightError)+"</p>":"")+(collisions.length?"<div class='alert alert-warning' data-testid='workspace-collision-warning'><strong>Обнаружены совпадения имён</strong><p>"+esc(collisions.join(", "))+"</p><p>Проверьте префикс перед импортом.</p></div>":"")+"<div class='alert alert-warning'><strong>Публикация не входит в атомарную замену</strong><p>При сбое часть переменных может быть создана. После импорта проверьте итоговый отчёт.</p></div>":"")+"<label class='package-checkbox'><input type='checkbox' data-testid='replace-confirm'"+(current.replace?" checked":"")+"> Я подтверждаю замену текущей сессии</label>"; footer="<button class='button' data-package-close>Отмена</button><button class='button button-primary' data-testid='import-commit'"+(current.replace?"":" disabled")+">Восстановить сессию</button>"; }
    dialog.innerHTML=modalLayer("session-package-import", "Импортировать переносимый пакет", body, footer, current.busy);
    decorateNoHistory(dialog);
    bindPackageDialog(dialog);
  }
  function closeSessionImport(restoreFocus) {
    var current = model.sessionImport, trigger = current.trigger;
    if (current.busy) return;
    current.open = false;
    current.file = null; current.archiveBase64 = ""; current.validation = null; current.error = ""; current.details = ""; current.publish = false; current.prefix = "imported_"; current.replace = false; current.result = null;
    current.trigger = null;
    renderSessionImportDialog();
    if (restoreFocus && trigger && typeof trigger.focus === "function") window.requestAnimationFrame(function () { trigger.focus(); });
  }
  function openSessionFilePicker(trigger) {
    var input = q("[data-testid='native-local-file-input'],[data-testid='session-package-file-input']");
    if (!input || model.sessionImport.busy) return;
    model.sessionImport.trigger = trigger;
    model.sessionImport.open = false;
    model.sessionImport.file = null;
    model.sessionImport.archiveBase64 = "";
    model.sessionImport.error = "";
    input.value = "";
    input.click();
  }
  window.SignalAnalyserOpenSessionFilePicker = openSessionFilePicker;
  function bytesToBase64(buffer) {
    var bytes = new Uint8Array(buffer), step = 0x8000, parts = [];
    for (var i=0; i<bytes.length; i+=step) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i+step, bytes.length))));
    return window.btoa(parts.join(""));
  }
  function readSessionDocument(file) {
    var current = model.sessionImport;
    if (!file || current.busy) return;
    current.open=true; current.busy=true; current.phase="file"; current.file=file; current.archiveBase64=""; current.error="";
    renderSessionImportDialog();
    Promise.resolve(file.arrayBuffer ? file.arrayBuffer() : new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=reject;reader.readAsArrayBuffer(file);})).then(bytesToBase64).then(function(encoded){ current.archiveBase64=encoded; }).catch(function(error){ current.phase="error"; current.error=packageError(error,"Не удалось прочитать пакет."); }).finally(function(){current.busy=false;renderSessionImportDialog();});
  }
  function clearSessionTransientState() {
    var cursors=paneGraphCursorController();
    if (cursors) Object.keys(model.outputs).forEach(function (key) { cursors.clear(key); });
    if (typeof model.measurementCursorUnsubscribe === "function") model.measurementCursorUnsubscribe();
    model.measurementCursorUnsubscribe=null;
    if (model.measurementCursorController) Object.keys(model.measurementCursorSnapshotByPane).forEach(function (key) { model.measurementCursorController.clear(key); });
    model.measurementCursorSnapshotByPane={};
    if (model.measurementCursorFrame !== null) window.cancelAnimationFrame(model.measurementCursorFrame);
    model.measurementCursorFrame=null;
    if (model.axisLabelsController) Object.keys(model.outputs).forEach(function (key) { model.axisLabelsController.clear(key); });
    if (model.signalTrimController) model.signalTrimController.destroy();
    model.viewportRanges={};
    if (model.rangeLifecycleController && typeof model.rangeLifecycleController.clearPane === "function") Object.keys(model.outputs).forEach(function (key) { model.rangeLifecycleController.clearPane(key); });
    Object.keys(model.pollByPane).forEach(function (key) { window.clearTimeout(model.pollByPane[key]); });
    Object.keys(model.peaksPollByPane).forEach(function (key) { window.clearTimeout(model.peaksPollByPane[key]); });
    model.outputs = {}; model.outputTokens = {}; model.pollByPane = {}; model.plotQueue = {};
    model.peaksRecord = null; model.peaksRecords = {}; model.peaksTokens = {}; model.peaksPollByPane = {}; model.peaksEnableByPane = {};
    model.peaksDraft = null; model.peaksApplying = false; model.peaksApplyQueued = false; model.peaksMessage = ""; model.extremaTargetKey = null;
    model.measurementsRecord = null; model.measurementsToken += 1;
    model.layoutDraft = null;
    model.rangeBoundaryIntents = {};
    Object.keys(model.synchronizedRangeSettlers).forEach(function (key) { model.synchronizedRangeSettlers[key].cancel(); });
    model.synchronizedRangeSettlers={}; model.synchronizedRangePending={}; model.synchronizedRangeSuppressByPane={};
    if (model.synchronizedRangeFrame !== null) window.cancelAnimationFrame(model.synchronizedRangeFrame);
    model.synchronizedRangeFrame=null;
    if (model.synchronizedSettingsFrame !== null) window.cancelAnimationFrame(model.synchronizedSettingsFrame);
    model.synchronizedSettingsFrame=null;
  }
  function refreshImportedSession() {
    clearSessionTransientState();
    return refreshSnapshot(render).then(function () {
      return settings.load().then(function () { render(); }).catch(showSettingsLoadError);
    }).then(function () { output(true); if (peaksSurfaceActive()) return loadPeaks(); });
  }
  function importSessionDocument() {
    var current = model.sessionImport;
    if (current.busy || !current.archiveBase64 || !current.replace) return;
    current.busy = true; current.phase="commit"; current.error = "";
    renderSessionImportDialog();
    var payload={ state_revision:model.revision, archive_base64:current.archiveBase64 };
    if(current.publish) { payload.publish_workspace=true; payload.workspace_prefix=current.prefix; }
    api.importPackage(payload).then(function (response) {
      if (!response || response.ok !== true) throw new Error("Сервер не подтвердил импорт сессии.");
      current.result=response; return refreshImportedSession();
    }).then(function () { current.phase="success";
    }).catch(function (error) {
      current.error = packageError(error,"Не удалось восстановить пакет.");
      current.phase="error";
      if (error && error.status === 409) return refreshSnapshot(render).then(function(){ return settings.load().catch(showSettingsLoadError); });
    }).finally(function () {
      current.busy = false;
      if (current.open) renderSessionImportDialog();
    });
  }
  function renderSessionSaveDialog() { var s=model.sessionSave, dialog=q("[data-testid='session-package-save-dialog']"), rows=packageRows().map(function(row){return "<div class='content-row'><span class='included-mark'>✓</span><div><strong>"+row[0]+"</strong><small>"+row[1]+"</small></div></div>";}).join(""), body,footer; if(!s.open){if(dialog)dialog.remove();if(!model.sessionImport.open)setSessionImportModalBackground(false);return;} if(!dialog){dialog=document.createElement("div");dialog.className="modal-layer primary-modal-layer package-modal";dialog.dataset.testid="session-package-save-dialog";document.body.appendChild(dialog);}setSessionImportModalBackground(true);if(s.phase==="progress"){body=packageProgress("Подготавливаем сессию","Экспортируем сигналы и графики");footer="<button class='button' disabled>Проверяем архив и контрольные суммы</button>";}else if(s.phase==="error"){body="<div class='alert alert-error' role='alert'><strong>Не удалось создать пакет</strong><p>"+esc(s.error||"Не удалось сохранить снимки графиков. Данные сессии не были скачаны.")+"</p></div>";footer="<button class='button' data-package-save-close>Закрыть</button><button class='button button-primary' data-package-save-create>Повторить</button>";}else if(s.phase==="ready"){body="<div class='result-heading' data-testid='save-ready'><img class='result-icon' src='./icons/tick-figma.svg' alt=''><div><h3>Пакет успешно создан</h3><p>Файл готов к скачиванию.</p></div></div>";footer="<button class='button' data-package-save-close>Закрыть</button><button class='button button-primary' data-testid='session-package-save-download' data-package-save-download>Скачать .sazip</button>";}else{body="<p class='dialog-intro'>Проверьте состав переносимого пакета Engee. Все перечисленные материалы включаются всегда.</p><h3 class='section-title'>Состав пакета</h3><div class='content-list' data-testid='save-content-list'>"+rows+"</div>";footer="<button class='button' data-package-save-close>Отмена</button><button class='button button-primary' data-testid='session-package-save-create' data-package-save-create>Сохранить пакет</button>";}dialog.innerHTML=modalLayer("session-package-save","Сохранить переносимый пакет",body,footer,s.busy);decorateNoHistory(dialog);bindSaveDialog(dialog); }
  function openSessionSave(trigger) { var s=model.sessionSave; if(s.busy)return; s.open=true;s.phase="summary";s.error="";s.package=null;s.trigger=trigger;renderSessionSaveDialog();window.requestAnimationFrame(function(){var n=q("[data-testid='session-package-save-create']");if(n)n.focus();}); }
  function downloadSessionDocument(trigger) { var s=model.sessionSave; if(s.busy)return; s.open=true;s.phase="progress";s.busy=true;s.error="";s.trigger=trigger||s.trigger;renderSessionSaveDialog();api.exportPackage().then(function(result){s.package=result;s.phase="ready";}).catch(function(error){s.error=packageError(error,"Не удалось сохранить снимки графиков. Данные сессии не были скачаны.");s.phase="error";}).finally(function(){s.busy=false;renderSessionSaveDialog();}); }
  function closePackageDetails() { var layer=q("[data-testid='session-package-details-dialog']"); if(layer)layer.remove(); var target=q("[data-testid='import-error-details']"); if(target)target.focus(); }
  function openPackageDetails() { var c=model.sessionImport, layer=document.createElement("div"); layer.className="modal-layer nested-modal-layer package-modal";layer.dataset.testid="session-package-details-dialog";layer.innerHTML=modalLayer("session-package-details","Подробности проверки","<div class='alert alert-error'><strong>Файл отклонён</strong><p>"+esc(c.error)+"</p></div><p class='muted-copy'>Текущая сессия не изменена. Содержимое пакета и скрипты не запускались.</p>","<button class='button button-primary' data-package-details-close>Понятно</button>",false);document.body.appendChild(layer);layer.querySelectorAll("[data-package-details-close],[data-package-close]").forEach(function(n){n.addEventListener("click",closePackageDetails);});layer.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closePackageDetails();}});window.requestAnimationFrame(function(){var n=layer.querySelector("h2");if(n)n.focus();}); }
  function scheduleWorkspacePreflight() { var c=model.sessionImport, token=++c.preflightToken; if(c.preflightTimer)window.clearTimeout(c.preflightTimer); if(!c.publish)return; c.preflightLoading=true;c.preflightError="";c.preflight=null;renderSessionImportDialog();c.preflightTimer=window.setTimeout(function(){api.packageWorkspacePreflight({archive_base64:c.archiveBase64,workspace_prefix:c.prefix}).then(function(result){if(token===c.preflightToken)c.preflight=result;}).catch(function(error){if(token===c.preflightToken)c.preflightError=packageError(error,"Не удалось проверить имена рабочей области.");}).finally(function(){if(token===c.preflightToken){c.preflightLoading=false;renderSessionImportDialog();}});},150); }
  function bindPackageDialog(dialog) { var c=model.sessionImport; dialog.querySelectorAll("[data-package-close]").forEach(function(n){n.addEventListener("click",function(){closeSessionImport(true);});}); var validate=dialog.querySelector("[data-testid='import-validate']");if(validate)validate.addEventListener("click",function(){if(c.busy)return;c.busy=true;c.phase="validate";c.controller=window.AbortController?new AbortController():null;renderSessionImportDialog();api.validatePackage({archive_base64:c.archiveBase64},c.controller&&c.controller.signal).then(function(r){c.validation=r;c.phase="summary";}).catch(function(e){if(e&&e.name==="AbortError"){c.busy=false;closeSessionImport(true);}else{c.error=packageError(e,"Этот файл нельзя импортировать.");c.phase="error";}}).finally(function(){c.busy=false;c.controller=null;renderSessionImportDialog();});}); var cancel=dialog.querySelector("[data-package-cancel]");if(cancel)cancel.addEventListener("click",function(){if(c.controller)c.controller.abort();else if(!c.busy)closeSessionImport(true);}); var reselect=dialog.querySelector("[data-package-reselect]");if(reselect)reselect.addEventListener("click",function(){closeSessionImport(false);openSessionFilePicker(c.trigger);}); var details=dialog.querySelector("[data-testid='import-error-details']");if(details)details.addEventListener("click",openPackageDetails); var publish=dialog.querySelector("[data-testid='workspace-publish']");if(publish)publish.addEventListener("change",function(){c.publish=publish.checked;if(c.publish)scheduleWorkspacePreflight();else{c.preflight=null;c.preflightError="";renderSessionImportDialog();}window.requestAnimationFrame(function(){var n=q("[data-testid='workspace-publish']");if(n)n.focus();});});var prefix=dialog.querySelector("[data-testid='workspace-prefix']");if(prefix)prefix.addEventListener("input",function(){c.prefix=prefix.value;scheduleWorkspacePreflight();});var replace=dialog.querySelector("[data-testid='replace-confirm']");if(replace)replace.addEventListener("change",function(){c.replace=replace.checked;renderSessionImportDialog();});var commit=dialog.querySelector("[data-testid='import-commit']");if(commit)commit.addEventListener("click",importSessionDocument);dialog.addEventListener("keydown",function(e){if(e.key==="Escape"&&!c.busy){e.preventDefault();closeSessionImport(true);return;}if(e.key!=="Tab")return;var f=sessionImportFocusables(dialog),i=f.indexOf(document.activeElement);if(f.length&&((e.shiftKey&&i<=0)||(!e.shiftKey&&i===f.length-1))){e.preventDefault();f[e.shiftKey?f.length-1:0].focus();}}); }
  function bindSaveDialog(dialog) { var s=model.sessionSave; function close(){if(s.busy)return;s.open=false;renderSessionSaveDialog();if(s.trigger)window.requestAnimationFrame(function(){s.trigger.focus();});} dialog.querySelectorAll("[data-package-save-close],[data-package-close]").forEach(function(n){n.addEventListener("click",close);}); var create=dialog.querySelector("[data-package-save-create]");if(create)create.addEventListener("click",function(){downloadSessionDocument(s.trigger);});var download=dialog.querySelector("[data-package-save-download]");if(download)download.addEventListener("click",function(){var p=s.package;if(!p)return;var url=window.URL.createObjectURL(p.blob),a=document.createElement("a"),match=/filename=\"?([^\";]+)\"?/i.exec(p.filename);a.href=url;a.download=(match&&match[1])||"signal-analyser-session.sazip";document.body.appendChild(a);a.click();a.remove();window.setTimeout(function(){window.URL.revokeObjectURL(url);},0);showToast("Скачивание началось",false);});dialog.addEventListener("keydown",function(e){if(e.key==="Escape"&&!s.busy){e.preventDefault();close();return;}if(e.key!=="Tab")return;var f=sessionImportFocusables(dialog),i=f.indexOf(document.activeElement);if(f.length&&((e.shiftKey&&i<=0)||(!e.shiftKey&&i===f.length-1))){e.preventDefault();f[e.shiftKey?f.length-1:0].focus();}}); }

  function plotEnvelope(data) { return Array.isArray(data) && data.length === 1 && data[0] && Array.isArray(data[0].data) ? data[0] : data; }
  function hasPlotData(data) { var payload = plotEnvelope(data); return Array.isArray(payload) ? payload.length > 0 : !!(payload && (Array.isArray(payload.data) ? payload.data.length : Array.isArray(payload.z) && payload.z.length)); }
  function loadPlotly() {
    if (window.Plotly) return Promise.resolve(window.Plotly);
    if (model.plotlyPromise) return model.plotlyPromise;
    model.plotlyPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "./js/vendor/plotly-cartesian-3.1.0.min.js";
      script.async = true;
      script.onload = function () { resolve(window.Plotly); };
      script.onerror = function () {
        model.plotlyPromise = null;
        reject(new Error("Не удалось загрузить библиотеку графиков."));
      };
      document.head.appendChild(script);
    });
    return model.plotlyPromise;
  }

  function schedulePlotlyIdlePreload() {
    function preload() { loadPlotly().catch(function () { /* A real graph render retries the local asset on demand. */ }); }
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(preload, { timeout:1500 });
    else window.setTimeout(preload, 1000);
  }

  function rangeSliderEnabled(displayId, paneId) {
    return !!model.rangeSliderByPane[paneRuntimeKey(displayId, paneId)];
  }

  function amplitudeSliderEnabled(displayId, paneId) {
    return !!model.amplitudeSliderByPane[paneRuntimeKey(displayId, paneId)];
  }

  function traceXDataRange(traces) {
    var minimum = Infinity, maximum = -Infinity;
    (traces || []).forEach(function (trace) {
      var values = trace && trace.x;
      if (!values || typeof values.length !== "number") return;
      [values[0], values[values.length - 1]].forEach(function (candidate) {
        var value = Number(candidate);
        if (!Number.isFinite(value)) return;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      });
    });
    return Number.isFinite(minimum) && Number.isFinite(maximum) && maximum > minimum ? [minimum, maximum] : null;
  }

  function traceYDataRange(traces) {
    var minimum = Infinity, maximum = -Infinity;
    (traces || []).forEach(function (trace) {
      var values = trace && trace.y;
      if (!values || typeof values.length !== "number") return;
      for (var index = 0; index < values.length; index += 1) {
        var value = Number(values[index]);
        if (!Number.isFinite(value)) continue;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }
    });
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
    if (minimum === maximum) {
      var padding = Math.max(1, Math.abs(minimum) * 0.05);
      return [minimum - padding, maximum + padding];
    }
    return [minimum, maximum];
  }

  function traceAxisDataRange(traces, axis) {
    var minimum = Infinity, maximum = -Infinity;
    (traces || []).forEach(function (trace) {
      var values = trace && trace[axis];
      if (!values || typeof values.length !== "number") return;
      for (var index = 0; index < values.length; index += 1) {
        var value = Number(values[index]);
        if (!Number.isFinite(value)) continue;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }
    });
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
    if (minimum === maximum) {
      var padding = Math.max(1, Math.abs(minimum) * 0.05);
      return [minimum - padding, maximum + padding];
    }
    return [minimum, maximum];
  }

  function selectedAxisRange(eventData, axis) {
    if (!eventData || typeof eventData !== "object") return null;
    var range = eventData[axis + ".range"];
    var start = Number(Array.isArray(range) ? range[0] : eventData[axis + ".range[0]"]);
    var finish = Number(Array.isArray(range) ? range[1] : eventData[axis + ".range[1]"]);
    return Number.isFinite(start) && Number.isFinite(finish) && start < finish ? [start, finish] : null;
  }

  function selectedXRange(eventData) {
    return selectedAxisRange(eventData, "xaxis");
  }

  function rangeSliderFullRange(dataRange, selectedRange) {
    if (!dataRange) return selectedRange ? selectedRange.slice() : null;
    if (!selectedRange) return dataRange.slice();
    return [Math.min(dataRange[0], selectedRange[0]), Math.max(dataRange[1], selectedRange[1])];
  }

  function adjustRangeSliderFullRange(runtimeKey, eventData) {
    if (!model.rangeSliderByPane[runtimeKey]) return null;
    var dataRange = model.rangeSliderDataRangeByPane[runtimeKey], selectedRange = selectedXRange(eventData);
    if (!dataRange || !selectedRange) return null;
    var fullRange = rangeSliderFullRange(dataRange, selectedRange), prior = model.rangeSliderFullRangeByPane[runtimeKey];
    if (prior && prior[0] === fullRange[0] && prior[1] === fullRange[1]) return null;
    model.rangeSliderFullRangeByPane[runtimeKey] = fullRange;
    return { "xaxis.rangeslider.range":fullRange.slice(), "xaxis.rangeslider.autorange":false };
  }

  function bindRangeSliderDoubleClick(host, runtimeKey) {
    if (!host || typeof host.addEventListener !== "function" || host.dataset.rangeSliderDoubleClickBound === runtimeKey) return;
    var previousPointerDown = null;
    function doubleClickIntent(event) {
      var helper=task0153Controller();
      if (helper && typeof helper.doubleClickIntent === "function") return helper.doubleClickIntent(event && event.target,host);
      return rangeSliderTarget(event) ? "in_plot_slider_reset" : "plot_autoscale";
    }
    function rangeSliderTarget(event) {
      var target = event && event.target;
      var slider = target && typeof target.closest === "function" ? target.closest(".rangeslider-container") : null;
      return slider && host.contains(slider) ? slider : null;
    }
    function resetHorizontalRange(event) {
      var now = Date.now(), ids=runtimeKey.split("::"), pane=paneById(ids[1]), helper=synchronizedRangeController();
      if (!model.rangeSliderByPane[runtimeKey] || !pane || !helper) return false;
      if (host._rangeSliderResetAt && now - host._rangeSliderResetAt < 240) return true;
      host._rangeSliderResetAt = now;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      }
      var descriptors=helper.descriptors(pane.plot_type).filter(function (descriptor) { return descriptor.axis === "xaxis"; });
      return resetRangeLifecycle(ids[0],ids[1],descriptors);
    }
    function resetGraphRange(event) {
      var now = Date.now(), ids=runtimeKey.split("::"), pane=paneById(ids[1]), helper=synchronizedRangeController();
      if (!pane || !helper) return false;
      if (host._graphRangeResetAt && now - host._graphRangeResetAt < 240) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        }
        return true;
      }
      host._graphRangeResetAt = now;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      }
      delete model.amplitudeSelectedRangeByPane[runtimeKey];
      var regression=task0153Controller();
      if (regression && typeof regression.plotDoubleClickProjection === "function") {
        var projection=regression.plotDoubleClickProjection({xRangeSliderVisible:!!model.rangeSliderByPane[runtimeKey],yRangeSliderVisible:!!model.amplitudeSliderByPane[runtimeKey]});
        host.dataset.rangeSliderVisible=String(projection.xRangeSliderVisible);
        host.dataset.amplitudeSliderVisible=String(projection.yRangeSliderVisible);
      }
      var descriptors=helper.descriptors(pane.plot_type).filter(function (descriptor) { return descriptor.axis === "xaxis" || descriptor.axis === "yaxis"; });
      return resetRangeLifecycle(ids[0],ids[1],descriptors);
    }
    host.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      var slider = rangeSliderTarget(event), target = event && event.target;
      var graph = !slider && target && typeof target.closest === "function" ? target.closest(".nsewdrag") : null;
      if (!slider && !(graph && host.contains(graph))) return;
      var pointerDown = { time:Date.now(), x:event.clientX, y:event.clientY, kind:slider ? "slider" : "graph" };
      if (previousPointerDown && previousPointerDown.kind === pointerDown.kind && pointerDown.time - previousPointerDown.time <= 420 && Math.abs(pointerDown.x - previousPointerDown.x) <= 6 && Math.abs(pointerDown.y - previousPointerDown.y) <= 6) {
        previousPointerDown = null;
        if (pointerDown.kind === "slider") resetHorizontalRange(event);
        else resetGraphRange(event);
      } else previousPointerDown = pointerDown;
    }, true);
    host.addEventListener("dblclick", function (event) {
      var intent=doubleClickIntent(event);
      if (intent === "in_plot_slider_reset") {
        if (rangeSliderTarget(event)) resetHorizontalRange(event);
        return;
      }
      if (intent === "plot_autoscale") resetGraphRange(event);
    }, true);
    host.dataset.rangeSliderDoubleClickBound = runtimeKey;
  }

  function plotLayoutWithRangeSlider(layout, runtimeKey, host) {
    var source = layout || {};
    var regression=task0153Controller(), projection=regression && typeof regression.paneSliderProjection === "function" ? regression.paneSliderProjection({xRangeSliderVisible:!!model.rangeSliderByPane[runtimeKey],yRangeSliderVisible:!!model.amplitudeSliderByPane[runtimeKey]},{kind:"plot_render"}) : null;
    var enabled = projection ? projection.mountHorizontalPaneSlider : !!model.rangeSliderByPane[runtimeKey], amplitudeEnabled = projection ? projection.mountVerticalPaneSlider : !!model.amplitudeSliderByPane[runtimeKey];
    var result = Object.assign({ paper_bgcolor:"#ffffff", plot_bgcolor:"#ffffff", showlegend:true }, source, { hovermode:false });
    result.legend = Object.assign({}, source.legend || {}, { x:0.99, xanchor:"right", y:0.99, yanchor:"top", bgcolor:"rgba(255,255,255,0.82)", bordercolor:"#e1e1e1", borderwidth:1 });
    result.margin = Object.assign({ l:44, r:12, t:12, b:enabled ? 34 : 30 }, source.margin || {}, { r:amplitudeEnabled ? 48 : 12, b:enabled ? 34 : 30 });
    result.xaxis = Object.assign({}, source.xaxis || {});
    result.xaxis.rangeslider = Object.assign({}, (source.xaxis && source.xaxis.rangeslider) || {}, { visible:enabled });
    if (enabled) {
      result.xaxis.rangeslider = Object.assign({}, result.xaxis.rangeslider, { thickness:0.15, bgcolor:"#ffffff", bordercolor:"#e1e1e1", borderwidth:1 });
      var dataRange = model.rangeSliderDataRangeByPane[runtimeKey];
      var currentRange = host && host._fullLayout && host._fullLayout.xaxis && Array.isArray(host._fullLayout.xaxis.range) ? host._fullLayout.xaxis.range : null;
      var fullRange = rangeSliderFullRange(dataRange, currentRange);
      if (fullRange) model.rangeSliderFullRangeByPane[runtimeKey] = fullRange;
      if (fullRange) {
        result.xaxis.rangeslider.range = fullRange.slice();
        result.xaxis.rangeslider.autorange = false;
      }
      if (currentRange) {
        result.xaxis.range = currentRange.slice();
        result.xaxis.autorange = false;
      }
    }
    if (amplitudeEnabled) {
      var currentAmplitudeRange = model.amplitudeSelectedRangeByPane[runtimeKey] || (host && host._fullLayout && host._fullLayout.yaxis && Array.isArray(host._fullLayout.yaxis.range) ? host._fullLayout.yaxis.range : null);
      if (currentAmplitudeRange) {
        result.yaxis = Object.assign({}, source.yaxis || {}, { range:currentAmplitudeRange.slice(), autorange:false });
      }
    }
    return result;
  }

  function amplitudeRangeFromHost(host, runtimeKey) {
    var retained = model.amplitudeSelectedRangeByPane[runtimeKey];
    if (retained) return retained.slice();
    var axis = host && host._fullLayout && host._fullLayout.yaxis;
    return axis && Array.isArray(axis.range) ? axis.range.slice() : null;
  }

  function syncAmplitudeSlider(host, runtimeKey) {
    if (!host) return;
    var slider = typeof host.querySelector === "function" ? host.querySelector("[data-amplitude-slider]") : null;
    if (!model.amplitudeSliderByPane[runtimeKey] || host.dataset.plotReady !== "true") {
      if (slider && typeof slider.remove === "function") slider.remove();
      return;
    }
    var dataRange = model.amplitudeDataRangeByPane[runtimeKey], selectedRange = amplitudeRangeFromHost(host, runtimeKey);
    if (!dataRange || !selectedRange) return;
    var fullRange = rangeSliderFullRange(dataRange, selectedRange);
    model.amplitudeSelectedRangeByPane[runtimeKey] = selectedRange.slice();
    model.amplitudeFullRangeByPane[runtimeKey] = fullRange.slice();
    if (!slider) {
      if (typeof document.createElement !== "function" || typeof host.appendChild !== "function") return;
      slider = document.createElement("div");
      slider.className = "amplitude-slider";
      slider.dataset.amplitudeSlider = runtimeKey;
      slider.dataset.testid = "amplitude-slider-" + runtimeKey.split("::").pop();
      slider.setAttribute("role", "group");
      slider.setAttribute("aria-label", "Слайдер амплитуды");
      slider.innerHTML = "<div class='amplitude-slider-rail' data-amplitude-rail><div class='amplitude-slider-window' data-amplitude-window></div><button class='amplitude-slider-handle is-maximum' type='button' role='slider' aria-orientation='vertical' aria-label='Максимум амплитуды' data-amplitude-handle='maximum'></button><button class='amplitude-slider-handle is-minimum' type='button' role='slider' aria-orientation='vertical' aria-label='Минимум амплитуды' data-amplitude-handle='minimum'></button></div>";
      host.appendChild(slider);
      bindAmplitudeSlider(slider, host, runtimeKey);
    }
    slider.classList.toggle("has-range-slider", !!model.rangeSliderByPane[runtimeKey]);
    var span = fullRange[1] - fullRange[0];
    if (!(span > 0)) return;
    var maximumTop = (fullRange[1] - selectedRange[1]) / span * 100;
    var minimumTop = (fullRange[1] - selectedRange[0]) / span * 100;
    maximumTop = Math.max(0, Math.min(100, maximumTop));
    minimumTop = Math.max(0, Math.min(100, minimumTop));
    var windowNode = slider.querySelector("[data-amplitude-window]");
    var maximumHandle = slider.querySelector("[data-amplitude-handle='maximum']");
    var minimumHandle = slider.querySelector("[data-amplitude-handle='minimum']");
    if (windowNode) { windowNode.style.top = maximumTop + "%"; windowNode.style.bottom = (100 - minimumTop) + "%"; }
    if (maximumHandle) {
      maximumHandle.style.top = maximumTop + "%";
      maximumHandle.setAttribute("aria-valuemin", String(fullRange[0]));
      maximumHandle.setAttribute("aria-valuemax", String(fullRange[1]));
      maximumHandle.setAttribute("aria-valuenow", String(selectedRange[1]));
    }
    if (minimumHandle) {
      minimumHandle.style.top = minimumTop + "%";
      minimumHandle.setAttribute("aria-valuemin", String(fullRange[0]));
      minimumHandle.setAttribute("aria-valuemax", String(fullRange[1]));
      minimumHandle.setAttribute("aria-valuenow", String(selectedRange[0]));
    }
  }

  function queueAmplitudeRange(host, runtimeKey, range) {
    if (!host || !range || !(range[0] < range[1])) return;
    model.amplitudeSelectedRangeByPane[runtimeKey] = range.slice();
    model.amplitudeFullRangeByPane[runtimeKey] = rangeSliderFullRange(model.amplitudeDataRangeByPane[runtimeKey], range);
    syncAmplitudeSlider(host, runtimeKey);
    model.amplitudePendingByPane[runtimeKey] = range.slice();
    if (model.amplitudeFrameByPane[runtimeKey]) return;
    model.amplitudeFrameByPane[runtimeKey] = window.requestAnimationFrame(function () {
      delete model.amplitudeFrameByPane[runtimeKey];
      var pending = model.amplitudePendingByPane[runtimeKey];
      delete model.amplitudePendingByPane[runtimeKey];
      var Plotly = window.Plotly;
      if (!pending || !host.isConnected || !model.amplitudeSliderByPane[runtimeKey] || !Plotly || typeof Plotly.relayout !== "function") return;
      try { Promise.resolve(Plotly.relayout(host, { "yaxis.range[0]":pending[0], "yaxis.range[1]":pending[1], "yaxis.autorange":false })).catch(function () { /* Keep amplitude interaction pane-local. */ }); }
      catch (_) { /* Keep amplitude interaction pane-local. */ }
    });
  }

  function bindAmplitudeSlider(slider, host, runtimeKey) {
    slider.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      var target = event.target && event.target.closest && event.target.closest("[data-amplitude-handle], [data-amplitude-window]");
      if (!target) return;
      var rail = slider.querySelector("[data-amplitude-rail]"), fullRange = model.amplitudeFullRangeByPane[runtimeKey], selectedRange = amplitudeRangeFromHost(host, runtimeKey);
      if (!rail || !fullRange || !selectedRange) return;
      model.amplitudeDrag = { runtimeKey:runtimeKey, pointerId:event.pointerId, mode:target.dataset.amplitudeHandle || "window", startY:event.clientY, startRange:selectedRange.slice(), fullRange:fullRange.slice(), rail:rail };
      if (typeof slider.setPointerCapture === "function") slider.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    });
    slider.addEventListener("pointermove", function (event) {
      var drag = model.amplitudeDrag;
      if (!drag || drag.runtimeKey !== runtimeKey || drag.pointerId !== event.pointerId) return;
      var rect = drag.rail.getBoundingClientRect(), fullSpan = drag.fullRange[1] - drag.fullRange[0];
      if (!(rect.height > 0) || !(fullSpan > 0)) return;
      var next = drag.startRange.slice(), minimumGap = Math.max(fullSpan * 1.0e-9, Number.EPSILON);
      if (drag.mode === "window") {
        var delta = -(event.clientY - drag.startY) / rect.height * fullSpan;
        next[0] += delta; next[1] += delta;
      } else {
        var value = drag.fullRange[1] - (event.clientY - rect.top) / rect.height * fullSpan;
        if (drag.mode === "minimum") next[0] = Math.min(value, next[1] - minimumGap);
        else next[1] = Math.max(value, next[0] + minimumGap);
      }
      queueAmplitudeRange(host, runtimeKey, next);
      event.preventDefault();
    });
    function finish(event) {
      var drag = model.amplitudeDrag;
      if (!drag || drag.runtimeKey !== runtimeKey || (event.pointerId !== undefined && drag.pointerId !== event.pointerId)) return;
      model.amplitudeDrag = null;
      if (typeof slider.releasePointerCapture === "function" && event.pointerId !== undefined && slider.hasPointerCapture && slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
    }
    slider.addEventListener("pointerup", finish);
    slider.addEventListener("pointercancel", finish);
    slider.addEventListener("dblclick", function (event) {
      var dataRange = model.amplitudeDataRangeByPane[runtimeKey];
      if (!dataRange) return;
      model.amplitudeDrag = null;
      queueAmplitudeRange(host, runtimeKey, dataRange.slice());
      event.preventDefault();
      event.stopPropagation();
    });
    slider.addEventListener("keydown", function (event) {
      var handle = event.target && event.target.closest && event.target.closest("[data-amplitude-handle]");
      if (!handle || ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End"].indexOf(event.key) < 0) return;
      var fullRange = model.amplitudeFullRangeByPane[runtimeKey], selectedRange = amplitudeRangeFromHost(host, runtimeKey);
      if (!fullRange || !selectedRange) return;
      var index = handle.dataset.amplitudeHandle === "minimum" ? 0 : 1;
      var step = (fullRange[1] - fullRange[0]) / 100;
      var value = selectedRange[index];
      if (event.key === "Home") value = fullRange[0];
      else if (event.key === "End") value = fullRange[1];
      else value += (event.key === "ArrowUp" || event.key === "ArrowRight" ? step : -step);
      if (index === 0) selectedRange[0] = Math.min(value, selectedRange[1] - Math.max(step * 0.001, Number.EPSILON));
      else selectedRange[1] = Math.max(value, selectedRange[0] + Math.max(step * 0.001, Number.EPSILON));
      queueAmplitudeRange(host, runtimeKey, selectedRange);
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function syncAmplitudeSliderFromRelayout(host, runtimeKey, eventData) {
    if (!model.amplitudeSliderByPane[runtimeKey]) return;
    var selectedRange = selectedAxisRange(eventData, "yaxis");
    if (selectedRange) {
      model.amplitudeSelectedRangeByPane[runtimeKey] = selectedRange.slice();
      model.amplitudeFullRangeByPane[runtimeKey] = rangeSliderFullRange(model.amplitudeDataRangeByPane[runtimeKey], selectedRange);
      syncAmplitudeSlider(host, runtimeKey);
      return;
    }
    if (eventData && eventData["yaxis.autorange"] === true) window.requestAnimationFrame(function () {
      delete model.amplitudeSelectedRangeByPane[runtimeKey];
      syncAmplitudeSlider(host, runtimeKey);
    });
  }

  function linkedAxisRangeUpdate(eventData, axis) {
    if (!eventData || typeof eventData !== "object") return null;
    var rangeKey = axis + ".range", startKey = rangeKey + "[0]", finishKey = rangeKey + "[1]", autorangeKey = axis + ".autorange";
    var range = eventData[rangeKey];
    var start = Array.isArray(range) ? range[0] : eventData[startKey];
    var finish = Array.isArray(range) ? range[1] : eventData[finishKey];
    if (start !== undefined && finish !== undefined) {
      start = Number(start);
      finish = Number(finish);
      if (!Number.isFinite(start) || !Number.isFinite(finish) || start === finish) return null;
      var rangeUpdate = {};
      rangeUpdate[startKey] = start;
      rangeUpdate[finishKey] = finish;
      rangeUpdate[autorangeKey] = false;
      return rangeUpdate;
    }
    if (eventData[autorangeKey] === true) {
      var autorangeUpdate = {};
      autorangeUpdate[autorangeKey] = true;
      return autorangeUpdate;
    }
    return null;
  }

  function linkedTimeRangeUpdate(eventData, linkTime, linkAmplitude) {
    var update = {};
    if (linkTime) Object.assign(update, linkedAxisRangeUpdate(eventData, "xaxis") || {});
    if (linkAmplitude) Object.assign(update, linkedAxisRangeUpdate(eventData, "yaxis") || {});
    return Object.keys(update).length ? update : null;
  }

  function collapsedAxisRange(eventData, axis) {
    if (!eventData || typeof eventData !== "object") return false;
    var rangeKey = axis + ".range", range = eventData[rangeKey];
    var start = Array.isArray(range) ? range[0] : eventData[rangeKey + "[0]"];
    var finish = Array.isArray(range) ? range[1] : eventData[rangeKey + "[1]"];
    start = Number(start);
    finish = Number(finish);
    return Number.isFinite(start) && Number.isFinite(finish) && start === finish;
  }

  function settledLinkedRange(host, includeX, includeY) {
    var layout = host && host._fullLayout || {}, payload = {};
    if (includeX && layout.xaxis && Array.isArray(layout.xaxis.range)) payload["xaxis.range"] = layout.xaxis.range.slice();
    if (includeY && layout.yaxis && Array.isArray(layout.yaxis.range)) payload["yaxis.range"] = layout.yaxis.range.slice();
    return Object.keys(payload).length ? payload : null;
  }

  function reconcileCancelledZoom(host, displayId, paneId, includeX, includeY, baseline) {
    window.requestAnimationFrame(function () {
      var payload = settledLinkedRange(host, includeX, includeY);
      var unchanged = payload && baseline && Object.keys(payload).every(function (key) {
        var current = payload[key], prior = baseline[key];
        return Array.isArray(current) && Array.isArray(prior) && current.length === prior.length && current.every(function (value, index) { return Number(value) === Number(prior[index]); });
      });
      if (unchanged) return;
      if (payload) {
        queueLinkedTimeRelayout(displayId, paneId, payload);
        queueLinkedSpectralRelayout(displayId, paneId, payload);
      }
    });
  }

  function currentScreenLinkFlags() {
    var display = activeDisplay(), draft = model.screenDraft;
    if (display && draft && draft.displayId === display.id) return { time:!!draft.linkTime, amplitude:!!draft.linkAmplitude, frequency:!!draft.linkFrequency, magnitude:!!draft.linkMagnitude };
    return {
      time:!!(settings.screenValue ? settings.screenValue("time.link_time") : settings.value ? settings.value("time.link_time") : false),
      amplitude:!!(settings.screenValue ? settings.screenValue("time.link_amplitude") : settings.value ? settings.value("time.link_amplitude") : false),
      frequency:!!(settings.screenValue ? settings.screenValue("spectrum.link_frequency") : settings.value ? settings.value("spectrum.link_frequency") : false),
      magnitude:!!(settings.screenValue ? settings.screenValue("spectrum.link_magnitude") : settings.value ? settings.value("spectrum.link_magnitude") : false)
    };
  }

  function spectralPaneDescriptor(pane, group) {
    var host=pane && activeDisplay() ? q("[data-pane-host='" + CSS.escape(paneRuntimeKey(activeDisplay().id, pane.id)) + "']") : null;
    var axis=host && host._fullLayout && host._fullLayout.xaxis;
    var unit=settings.screenValue ? settings.screenValue("spectrum.frequency_units") : settings.value("spectrum.frequency_units");
    var frequencyScale=settings.screenValue ? settings.screenValue("spectrum.frequency_scale") : settings.value("spectrum.frequency_scale");
    return Object.assign({}, pane || {}, {
      frequencyUnit:unit || "hertz",
      frequencyScale:axis && axis.type || frequencyScale || "linear",
      valueScale:group === "magnitude" ? "db" : undefined
    });
  }

  function queueLinkedSpectralRelayout(displayId, sourcePaneId, eventData) {
    var helper=task0141Controller(), sourcePane=paneById(sourcePaneId), links=currentScreenLinkFlags();
    if (!helper || !sourcePane || ["spectrum", "persistence"].indexOf(sourcePane.plot_type) < 0 || !links.frequency && !links.magnitude) return false;
    var previous=model.spectralLinkPending;
    var update=previous && previous.displayId === displayId && previous.sourcePaneId === sourcePaneId ? Object.assign({}, previous.update, eventData || {}) : Object.assign({}, eventData || {});
    var sourceFrequency=spectralPaneDescriptor(sourcePane, "frequency"), sourceMagnitude=spectralPaneDescriptor(sourcePane, "magnitude");
    var canFrequency=links.frequency && helper.linkedTargets("frequency", sourceFrequency, panes().map(function (pane) { return spectralPaneDescriptor(pane, "frequency"); })).some(function (target) { return !!helper.projectLinkedRelayout("frequency", sourceFrequency, target, update); });
    var canMagnitude=links.magnitude && helper.linkedTargets("magnitude", sourceMagnitude, panes().map(function (pane) { return spectralPaneDescriptor(pane, "magnitude"); })).some(function (target) { return !!helper.projectLinkedRelayout("magnitude", sourceMagnitude, target, update); });
    if (!canFrequency && !canMagnitude) return false;
    var token=++model.spectralLinkToken;
    model.spectralLinkPending={ displayId:displayId, sourcePaneId:sourcePaneId, update:update, token:token };
    if (model.spectralLinkFrame !== null) return true;
    model.spectralLinkFrame=window.requestAnimationFrame(function () {
      model.spectralLinkFrame=null;
      var pending=model.spectralLinkPending;
      model.spectralLinkPending=null;
      var display=activeDisplay(), currentLinks=currentScreenLinkFlags(), Plotly=window.Plotly;
      if (!pending || pending.token !== model.spectralLinkToken || !display || display.id !== pending.displayId || !Plotly || typeof Plotly.relayout !== "function") return;
      var currentSource=paneById(pending.sourcePaneId);
      if (!currentSource) return;
      panes().filter(function (pane) { return pane.id !== pending.sourcePaneId; }).forEach(function (pane) {
        var paneUpdate={};
        if (currentLinks.frequency) Object.assign(paneUpdate, helper.projectLinkedRelayout("frequency", spectralPaneDescriptor(currentSource, "frequency"), spectralPaneDescriptor(pane, "frequency"), pending.update) || {});
        if (currentLinks.magnitude) Object.assign(paneUpdate, helper.projectLinkedRelayout("magnitude", spectralPaneDescriptor(currentSource, "magnitude"), spectralPaneDescriptor(pane, "magnitude"), pending.update) || {});
        if (!Object.keys(paneUpdate).length) return;
        var runtimeKey=paneRuntimeKey(pending.displayId, pane.id), host=q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
        if (!host || host.dataset.plotReady !== "true") return;
        model.axisLinkSuppressByPane[runtimeKey]=true;
        try { Promise.resolve(Plotly.relayout(host, paneUpdate)).catch(function () { /* Keep one failed pane isolated. */ }).finally(function () { delete model.axisLinkSuppressByPane[runtimeKey]; }); }
        catch (_) { delete model.axisLinkSuppressByPane[runtimeKey]; }
      });
    });
    return true;
  }

  function queueLinkedTimeRelayout(displayId, sourcePaneId, eventData) {
    var sourcePane = paneById(sourcePaneId);
    var links = currentScreenLinkFlags();
    var update = linkedTimeRangeUpdate(eventData, links.time, links.amplitude);
    if (!update || !sourcePane || ["time", "spectrogram"].indexOf(sourcePane.plot_type) < 0) return false;
    if (sourcePane.plot_type !== "time") Object.keys(update).filter(function (key) { return key.indexOf("yaxis.") === 0; }).forEach(function (key) { delete update[key]; });
    if (!Object.keys(update).length) return false;
    var previous = model.axisLinkPending;
    if (previous && previous.displayId === displayId && previous.sourcePaneId === sourcePaneId) update = Object.assign({}, previous.update, update);
    var token = ++model.axisLinkToken;
    model.axisLinkPending = { displayId:displayId, sourcePaneId:sourcePaneId, update:update, token:token };
    if (model.axisLinkFrame !== null) return true;
    model.axisLinkFrame = window.requestAnimationFrame(function () {
      model.axisLinkFrame = null;
      var pending = model.axisLinkPending;
      model.axisLinkPending = null;
      var display = activeDisplay();
      if (!pending || pending.token !== model.axisLinkToken || !display || display.id !== pending.displayId) return;
      var currentLinks = currentScreenLinkFlags();
      var currentTime = currentLinks.time;
      var currentAmplitude = currentLinks.amplitude;
      var currentUpdate = Object.keys(pending.update).reduce(function (result, key) {
        if ((currentTime && key.indexOf("xaxis.") === 0) || (currentAmplitude && key.indexOf("yaxis.") === 0)) result[key] = pending.update[key];
        return result;
      }, {});
      if (!Object.keys(currentUpdate).length) return;
      var Plotly = window.Plotly;
      if (!Plotly || typeof Plotly.relayout !== "function") return;
      panes().filter(function (pane) { return pane.id !== pending.sourcePaneId && (pane.plot_type === "time" || pane.plot_type === "spectrogram" && currentTime); }).forEach(function (pane) {
        var paneUpdate = Object.keys(currentUpdate).reduce(function (result, key) {
          if (pane.plot_type === "time" || key.indexOf("xaxis.") === 0) result[key] = currentUpdate[key];
          return result;
        }, {});
        if (!Object.keys(paneUpdate).length) return;
        var runtimeKey = paneRuntimeKey(pending.displayId, pane.id);
        var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
        if (!host || host.dataset.plotReady !== "true") return;
        model.axisLinkSuppressByPane[runtimeKey] = true;
        try {
          Promise.resolve(Plotly.relayout(host, paneUpdate)).catch(function () { /* Keep one failed pane isolated. */ }).finally(function () { delete model.axisLinkSuppressByPane[runtimeKey]; });
        } catch (_) { delete model.axisLinkSuppressByPane[runtimeKey]; }
      });
    });
    return true;
  }

  function synchronizedRangeOptions(descriptor) {
    return {
      unit:descriptor.unitField ? settings.value(descriptor.unitField) : descriptor.kind === "density" ? "percent" : "linear",
      axisScale:descriptor.plotScaleField ? settings.value(descriptor.plotScaleField) : "linear"
    };
  }

  function synchronizedRangeRaw(projection) {
    return { min:projection && projection.min != null ? String(Number(Number(projection.min).toPrecision(12))) : "", max:projection && projection.max != null ? String(Number(Number(projection.max).toPrecision(12))) : "" };
  }

  function scheduleSynchronizedSettingsRender() {
    if (model.synchronizedSettingsFrame !== null) return;
    model.synchronizedSettingsFrame=window.requestAnimationFrame(function () {
      model.synchronizedSettingsFrame=null;
      if (activeDisplay()) renderSettings(activeDisplay());
    });
  }

  function projectPlotRangeToSettings(displayId, paneId, eventData, terminal) {
    var helper=synchronizedRangeController(), lifecycle=rangeLifecycleController(), pane=paneById(paneId);
    if (!helper || !lifecycle || !pane || model.activePane !== paneId || !activeDisplay() || activeDisplay().id !== displayId) return;
    helper.descriptors(pane.plot_type).forEach(function (descriptor) {
      var projection=helper.settingsProjection(eventData, descriptor, synchronizedRangeOptions(descriptor));
      if (!projection) return;
      var key=paneRuntimeKey(displayId,paneId)+"::"+descriptor.fieldId;
      var context=rangeLifecycleContext(displayId,paneId,descriptor), token=model.rangeLifecycleTokens[key];
      if (!token) { token=lifecycle.beginGraph(context); rememberRangeLifecycle(context,token); }
      lifecycle.projectGraph(token,eventData,terminal,synchronizedRangeOptions(descriptor));
      syncRangeLifecycleSelection(context);
    });
  }

  function rangeAxisDomain(descriptor) {
    var axis={time:"time",amplitude:"amplitude",frequency:"frequency",magnitude:"magnitude",power:"power",density:"density"}[descriptor.kind] || descriptor.kind;
    return screenRangeDomain(axis,screenDraftFor(activeDisplay()));
  }

  function queueSettingsRangeToPlot(detail) {
    if (!detail || detail.source === "plot") return;
    var helper=synchronizedRangeController(), display=activeDisplay(), pane=paneById(model.activePane);
    if (!helper || !display || !pane) return;
    var descriptor=helper.descriptors(pane.plot_type).filter(function (item) { return item.fieldId === detail.field_id; })[0];
    if (!descriptor) return;
    var value=detail.value, domain=rangeAxisDomain(descriptor), range;
    if (!value || value.min == null && value.max == null) range={auto:true,min:null,max:null};
    else range={auto:false,min:value.min == null && domain ? domain[0] : value.min,max:value.max == null && domain ? domain[1] : value.max};
    var update=helper.plotlyProjection(range,descriptor,synchronizedRangeOptions(descriptor));
    if (!update) return;
    var viewportKey=viewportRangeKey(display.id,pane.id,detail.field_id);
    if (range.auto) delete model.viewportRanges[viewportKey];
    else model.viewportRanges[viewportKey]={min:range.min,max:range.max,generation:0};
    rememberRangeBoundaryIntent(detail.field_id,"min",range.auto ? "" : range.min);
    rememberRangeBoundaryIntent(detail.field_id,"max",range.auto ? "" : range.max);
    var runtimeKey=paneRuntimeKey(display.id,pane.id);
    var liveHost=q("[data-pane-host='"+CSS.escape(runtimeKey)+"']"), livePlotly=window.Plotly;
    if (!liveHost || liveHost.dataset.plotReady !== "true" || !livePlotly || typeof livePlotly.relayout !== "function") return;
    model.synchronizedRangePending[runtimeKey]=Object.assign(model.synchronizedRangePending[runtimeKey] || {},update);
    if (model.synchronizedRangeFrame !== null) return;
    model.synchronizedRangeFrame=window.requestAnimationFrame(function () {
      model.synchronizedRangeFrame=null;
      var pending=model.synchronizedRangePending; model.synchronizedRangePending={};
      Object.keys(pending).forEach(function (key) {
        var host=q("[data-pane-host='"+CSS.escape(key)+"']"), Plotly=window.Plotly;
        if (!host || !Plotly || typeof Plotly.relayout !== "function") return;
        model.synchronizedRangeSuppressByPane[key]=true;
        try { Promise.resolve(Plotly.relayout(host,pending[key])).catch(function () {}).finally(function () { delete model.synchronizedRangeSuppressByPane[key]; }); }
        catch (_) { delete model.synchronizedRangeSuppressByPane[key]; }
      });
    });
  }

  function bindLinkedTimeHost(host, displayId, paneId) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    if (!host || typeof host.on !== "function" || host.dataset.axisLinkBound === runtimeKey) return;
    var zoomGesture = null;
    function graphZoomSurface(event) {
      var target = event && event.target;
      var surface = target && typeof target.closest === "function" ? target.closest(".nsewdrag") : null;
      return surface && (!host.contains || host.contains(surface)) ? surface : null;
    }
    function zeroAreaGesture(gesture) {
      return !gesture || Math.abs(gesture.x - gesture.startX) < 4 && Math.abs(gesture.y - gesture.startY) < 4;
    }
    function startingLinkedRange() {
      var layout = host._fullLayout || {}, payload = {};
      if (layout.xaxis && Array.isArray(layout.xaxis.range)) payload["xaxis.range"] = layout.xaxis.range.slice();
      if (layout.yaxis && Array.isArray(layout.yaxis.range)) payload["yaxis.range"] = layout.yaxis.range.slice();
      return payload;
    }
    function cancelPendingGesture() {
      var pending = model.axisLinkPending;
      if (!pending || pending.displayId !== displayId || pending.sourcePaneId !== paneId) return;
      model.axisLinkToken += 1;
      model.axisLinkPending = null;
    }
    function finishZoomGesture(event) {
      if (!zoomGesture || zoomGesture.pointerId !== undefined && event.pointerId !== undefined && zoomGesture.pointerId !== event.pointerId) return;
      removeGlobalZoomFinish();
      zoomGesture.x = event.clientX === undefined ? zoomGesture.x : event.clientX;
      zoomGesture.y = event.clientY === undefined ? zoomGesture.y : event.clientY;
      var cancelled = event.type === "pointercancel" || zeroAreaGesture(zoomGesture);
      var initial = zoomGesture.initial;
      zoomGesture = null;
      if (!cancelled) return;
      cancelPendingGesture();
      queueLinkedTimeRelayout(displayId, paneId, initial);
      queueLinkedSpectralRelayout(displayId, paneId, initial);
      reconcileCancelledZoom(host, displayId, paneId, true, true, initial);
    }
    function removeGlobalZoomFinish() {
      if (typeof window.removeEventListener !== "function") return;
      window.removeEventListener("pointerup", finishZoomGesture, true);
      window.removeEventListener("pointercancel", finishZoomGesture, true);
    }
    if (typeof host.addEventListener === "function") {
      host.addEventListener("pointerdown", function (event) {
        if ((event.button !== undefined && event.button !== 0) || !graphZoomSurface(event)) return;
        var dragmode = host._fullLayout && host._fullLayout.dragmode;
        if (dragmode && dragmode !== "zoom") return;
        removeGlobalZoomFinish();
        zoomGesture = { pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY, initial:startingLinkedRange(), propagated:false };
        if (typeof window.addEventListener === "function") {
          window.addEventListener("pointerup", finishZoomGesture, true);
          window.addEventListener("pointercancel", finishZoomGesture, true);
        }
      }, true);
      host.addEventListener("pointermove", function (event) {
        if (!zoomGesture || zoomGesture.pointerId !== undefined && event.pointerId !== undefined && zoomGesture.pointerId !== event.pointerId) return;
        zoomGesture.x = event.clientX;
        zoomGesture.y = event.clientY;
      }, true);
      host.addEventListener("pointerup", finishZoomGesture, true);
      host.addEventListener("pointercancel", finishZoomGesture, true);
    }
    var handler = function (eventData, terminal) {
      if (!model.synchronizedRangeSuppressByPane[runtimeKey]) projectPlotRangeToSettings(displayId,paneId,eventData,terminal);
      if (!model.axisLinkSuppressByPane[runtimeKey]) {
        if (queueLinkedTimeRelayout(displayId, paneId, eventData) && zoomGesture) zoomGesture.propagated = true;
        if (queueLinkedSpectralRelayout(displayId, paneId, eventData) && zoomGesture) zoomGesture.propagated = true;
        var links = currentScreenLinkFlags();
        var collapsedX = links.time && collapsedAxisRange(eventData, "xaxis");
        var collapsedY = links.amplitude && collapsedAxisRange(eventData, "yaxis");
        if (collapsedX || collapsedY) reconcileCancelledZoom(host, displayId, paneId, collapsedX, collapsedY);
      }
      syncAmplitudeSliderFromRelayout(host, runtimeKey, eventData);
      var cursors=paneGraphCursorController();
      if (cursors) cursors.update(runtimeKey);
      var correction = adjustRangeSliderFullRange(runtimeKey, eventData);
      if (!correction || model.rangeSliderAdjustByPane[runtimeKey]) return;
      var Plotly = window.Plotly;
      if (!Plotly || typeof Plotly.relayout !== "function") return;
      model.rangeSliderAdjustByPane[runtimeKey] = true;
      try {
        Promise.resolve(Plotly.relayout(host, correction)).catch(function () { /* Keep one full-range adjustment pane-local. */ }).finally(function () { delete model.rangeSliderAdjustByPane[runtimeKey]; });
      } catch (_) { delete model.rangeSliderAdjustByPane[runtimeKey]; }
    };
    host.on("plotly_relayouting", function (eventData) { handler(eventData,false); });
    host.on("plotly_relayout", function (eventData) { handler(eventData,true); });
    host.on("plotly_restyle", function () {
      window.requestAnimationFrame(function () {
        var cursors=paneGraphCursorController();
        if (!cursors) return;
        if (graphCursorEligible(displayId, paneId)) cursors.attach(runtimeKey, host);
        else cursors.update(runtimeKey);
        syncPaneMenuState();
      });
    });
    host.dataset.axisLinkBound = runtimeKey;
  }

  function rangeSliderEligible(displayId, paneId) {
    var display = activeDisplay(), pane = paneById(paneId), runtimeKey = paneRuntimeKey(displayId, paneId);
    var record = model.outputs[runtimeKey], host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    return !!(display && display.id === displayId && pane && ["time", "spectrum"].indexOf(pane.plot_type) >= 0 && paneHasSignals(pane) && record && record.output && record.output.isready && record.output.success && host && host.dataset.plotReady === "true" && currentReadyPlotHost(host, displayId));
  }

  var graphCursorController = null;
  function axisLabelsPolicy() { return window.SignalAnalyserAxisLabelsAndHover || null; }
  function russianPresenter() { return window.SignalAnalyserRussianLocalization || null; }
  function localizedPlotTitle(value) {
    var presenter=russianPresenter(),source=String(value == null ? "" : value).trim();
    if (!presenter || !source) return source;
    var exact=presenter.knownText(source);
    if (exact !== source) return exact;
    var parts=source.split(","),label=presenter.knownText(parts.shift().trim()),unit=parts.length ? presenter.unitLabel(parts.join(",").trim()) : "";
    return unit ? label+", "+unit : label;
  }
  function localizePlotPresentation(layout,traces) {
    var nextLayout=Object.assign({},layout || {});
    Object.keys(nextLayout).forEach(function (key) {
      if (!/^[xy]axis\d*$/.test(key) || !nextLayout[key]) return;
      var axis=Object.assign({},nextLayout[key]),title=axis.title;
      if (typeof title === "string") axis.title=localizedPlotTitle(title);
      else if (title && typeof title === "object") axis.title=Object.assign({},title,{text:localizedPlotTitle(title.text)});
      nextLayout[key]=axis;
    });
    var nextTraces=(traces || []).map(function (trace) {
      if (!trace || !trace.colorbar || !trace.colorbar.title) return trace;
      var next=Object.assign({},trace),colorbar=Object.assign({},trace.colorbar),title=colorbar.title;
      colorbar.title=typeof title === "string" ? localizedPlotTitle(title) : Object.assign({},title,{text:localizedPlotTitle(title.text)});
      next.colorbar=colorbar;
      return next;
    });
    return {layout:nextLayout,traces:nextTraces};
  }
  function axisLabelsController() {
    var helper=axisLabelsPolicy();
    if (!model.axisLabelsController && helper) model.axisLabelsController=helper.createController({
      relayout:function (key,update) { var host=q("[data-pane-host='"+CSS.escape(key)+"']"), Plotly=window.Plotly; if (host && Plotly && typeof Plotly.relayout === "function") Promise.resolve(Plotly.relayout(host,update)).catch(function () {}); },
      restyle:function (key,update,indexes) { var host=q("[data-pane-host='"+CSS.escape(key)+"']"), Plotly=window.Plotly; if (host && Plotly && typeof Plotly.restyle === "function") Promise.resolve(Plotly.restyle(host,update,indexes)).catch(function () {}); }
    });
    return model.axisLabelsController;
  }
  function showAxisLabelsValue(runtimeKey,paneId,controller) { if (paneId !== model.activePane) return controller ? controller.value(runtimeKey) : true; var value=settings.value("display.show_axis_labels"); return value === undefined || value === null ? true : !!value; }
  function applyAxisLabelsProjection(layout,traces,projection) {
    layout=layout || {};
    layout.xaxis=Object.assign({},layout.xaxis || {},{title:Object.assign({},layout.xaxis && layout.xaxis.title || {},{text:projection.layout["xaxis.title.text"]})});
    layout.yaxis=Object.assign({},layout.yaxis || {},{title:Object.assign({},layout.yaxis && layout.yaxis.title || {},{text:projection.layout["yaxis.title.text"]})});
    projection.traces.forEach(function (item) { var trace=traces[item.index]; if (!trace) return; trace.colorbar=Object.assign({},trace.colorbar || {},{title:Object.assign({},trace.colorbar && trace.colorbar.title || {},{text:item.update["colorbar.title.text"]})}); });
    return layout;
  }
  function measurementCursorColumnsHelper() { return window.SignalAnalyserMeasurementCursorColumns || null; }
  function measurementCursorColumnsController() {
    var helper=measurementCursorColumnsHelper();
    if (!model.measurementCursorController && helper) model.measurementCursorController=helper.createController({onVisibilityChange:function (key) { scheduleMeasurementCursorProjection(key); }});
    return model.measurementCursorController;
  }
  function scheduleMeasurementCursorProjection(key) {
    var display=activeDisplay(), activeKey=display && model.activePane ? paneRuntimeKey(display.id,model.activePane) : "";
    if (key !== activeKey || model.measurementCursorFrame !== null) return;
    model.measurementCursorFrame=window.requestAnimationFrame(function () {
      model.measurementCursorFrame=null;
      if (model.inspectorPage === "measurements") renderInspector();
      var menu=q("[data-testid='measurement-columns-menu']");
      if (menu && !menu.hidden) renderMeasurementMenu();
      projectSignalTrimActions();
    });
  }
  function acceptGraphCursorSnapshot(snapshot) {
    if (!snapshot || !snapshot.key) return;
    model.measurementCursorSnapshotByPane[snapshot.key]=snapshot;
    /* The trim action belongs to the pane that emitted this snapshot.  Do not
       gate its toolbar projection by the currently selected inspector pane:
       cursor mode can be changed from any pane menu before that pane becomes
       the active settings/Measurements context. */
    projectSignalTrimActions();
    scheduleMeasurementCursorProjection(snapshot.key);
  }
  function paneGraphCursorController() {
    if (!graphCursorController && window.SignalAnalyserGraphCursorUI) {
      graphCursorController = window.SignalAnalyserGraphCursorUI.createController();
    }
    if (graphCursorController && !model.measurementCursorUnsubscribe && typeof graphCursorController.subscribe === "function") model.measurementCursorUnsubscribe=graphCursorController.subscribe(acceptGraphCursorSnapshot);
    return graphCursorController;
  }

  var signalTrimMarkup=`<div class="modal-layer native-modal-layer" data-testid="signal-trim-layer" hidden>
  <section class="dialog-card signal-trim-dialog" role="dialog" aria-modal="true" aria-labelledby="signal-trim-title" data-testid="signal-trim-dialog">
    <header class="dialog-titlebar">
      <h2 id="signal-trim-title" tabindex="-1">Обрезать сигнал</h2>
      <button class="icon-button dialog-close" type="button" data-signal-trim-close aria-label="Закрыть обрезку сигнала"><img src="./icons/close.svg" alt=""></button>
    </header>
    <div class="dialog-body signal-trim-body" data-signal-trim-form></div>
    <footer class="dialog-footer">
      <button class="button" type="button" data-signal-trim-cancel>Отмена</button>
      <button class="button button-primary" type="button" data-signal-trim-submit disabled>Создать сигнал</button>
    </footer>
  </section>
</div>`;
  function ensureSignalTrimLayer() { var helper=signalTrimHelper(), layer=helper && q(helper.selectors.layer); if (!layer && helper) { document.body.insertAdjacentHTML("beforeend",signalTrimMarkup); layer=q(helper.selectors.layer); } return layer; }
  function signalTrimHelper() { return window.SignalAnalyserCursorTrimSignal || null; }
  function signalTrimContext(displayId,pane) {
    var helper=signalTrimHelper(), key=paneRuntimeKey(displayId,pane.id), snapshot=model.measurementCursorSnapshotByPane[key] || null;
    var host=snapshot && snapshot.host || q("[data-pane-host='"+CSS.escape(key)+"']"), title=host && host._fullLayout && host._fullLayout.xaxis && host._fullLayout.xaxis.title;
    var titleText=typeof title === "string" ? title : title && title.text || "", parts=String(titleText).split(",");
    var inventory=model.state && Array.isArray(model.state.signals) ? model.state.signals : [], bindings=Array.isArray(pane.signal_bindings) ? pane.signal_bindings : [];
    var eligibleSignals=inventory.filter(function (signal) { return bindings.some(function (binding) { return signalNameMatches(signal,binding); }); });
    return {displayId:displayId,paneId:pane.id,plotType:pane.plot_type,cursorSnapshot:snapshot,mainSignal:mainSignalForPane(pane),eligibleSignals:eligibleSignals,signalInventory:inventory,xUnit:parts.length>1 ? parts.slice(1).join(",").trim() : "с",stateRevision:model.revision,trimBusy:!!(model.signalTrimController && model.signalTrimController.isBusy()),helper:helper};
  }
  function signalTrimController() {
    var helper=signalTrimHelper();
    if (!model.signalTrimController && helper) model.signalTrimController=helper.createController({
      mount:function (markup,meta) { var layer=ensureSignalTrimLayer(), form=layer && layer.querySelector(helper.selectors.form), submit=layer && layer.querySelector(helper.selectors.submit); if (!layer || !form) return; form.innerHTML=markup; if (submit) submit.disabled=!!meta.submitDisabled; layer.hidden=false; q("[data-testid='app-shell']").inert=true; layer.setAttribute("aria-busy","false"); window.requestAnimationFrame(function () { var focus=layer.querySelector(meta.initialFocus); if (focus) focus.focus(); }); },
      sync:function (state) {
        var layer=q(helper.selectors.layer), form=layer && layer.querySelector(helper.selectors.form);
        if (!layer || !form) return;
        var source=form.querySelector(helper.selectors.source), name=form.querySelector(helper.selectors.name), overwriteRow=form.querySelector(helper.selectors.overwriteRow), overwrite=form.querySelector(helper.selectors.overwrite), message=form.querySelector("[data-signal-trim-name-message]"), submit=layer.querySelector(helper.selectors.submit);
        if (source && source.value !== state.draft.sourceId) source.value=state.draft.sourceId;
        if (name && document.activeElement !== name && name.value !== state.draft.name) name.value=state.draft.name;
        if (name) name.setAttribute("aria-invalid",String(["required","too_long","conflict"].indexOf(state.validation.reason) >= 0));
        if (message) { message.textContent=state.validation.reason === "source" || state.validation.reason === "interval" ? "" : state.validation.message; message.hidden=!message.textContent; }
        if (overwriteRow) overwriteRow.hidden=!state.validation.conflict;
        if (overwrite) overwrite.checked=!!state.draft.overwrite;
        if (submit) submit.disabled=!!state.submitDisabled;
      },
      close:function (meta) { var layer=q(helper.selectors.layer); if (layer) { layer.hidden=true; layer.setAttribute("aria-busy","false"); } q("[data-testid='app-shell']").inert=false; if (meta && meta.restoreFocus && meta.restoreFocus.isConnected) meta.restoreFocus.focus(); },
      setBusy:function (busy) { var layer=q(helper.selectors.layer); if (!layer) return; layer.setAttribute("aria-busy",String(!!busy)); Array.prototype.slice.call(layer.querySelectorAll("input,select,button")).forEach(function (node) { node.disabled=!!busy; }); if (!busy) { var snapshot=model.signalTrimController && model.signalTrimController.snapshot(); var submit=layer.querySelector(helper.selectors.submit); if (submit) submit.disabled=!!(snapshot && snapshot.validation && !snapshot.validation.valid); } },
      error:function (message,meta) { var layer=q(helper.selectors.layer), status=layer && layer.querySelector(helper.selectors.status), field=meta && meta.field && layer.querySelector(meta.field); if (!field && model.signalTrimLastError) { var typedFields=model.signalTrimLastError.payload && model.signalTrimLastError.payload.error && model.signalTrimLastError.payload.error.fields || {}; field=typedFields.target_name ? layer.querySelector(helper.selectors.name) : typedFields.source_signal_id ? layer.querySelector(helper.selectors.source) : null; } if (status) { status.hidden=false; status.textContent=message; } if (field) { field.setAttribute("aria-invalid","true"); field.focus(); } },
      createSignal:function (payload) { model.signalTrimLastError=null; return mutate(function () { return api.cropSignal(payload); },{preservePlots:true,skipSettings:true,skipOutput:true}).catch(function (error) { model.signalTrimLastError=error; throw error; }); },
      acceptSignal:function () { renderActivePaneContext(); }
    });
    return model.signalTrimController;
  }
  function reconcilePaneTrimAction(node,displayId,pane) {
    var helper=signalTrimHelper();
    if (!helper) return;
    var cluster=node.querySelector(".plot-control-cluster"), select=cluster && cluster.querySelector(".pane-select"), button=cluster && cluster.querySelector(helper.selectors.action);
    if (!button && cluster && select) { select.insertAdjacentHTML("beforebegin",helper.actionMarkup()); button=cluster.querySelector(helper.selectors.action); }
    if (button) { button.dataset.displayId=displayId; button.dataset.paneId=pane.id; helper.projectAction(button,signalTrimContext(displayId,pane)); }
  }
  function projectSignalTrimActions() { qa("[data-display-id][data-pane-id]").forEach(function (node) { var pane=paneById(node.dataset.paneId), display=activeDisplay(); if (pane && display && display.id === node.dataset.displayId) reconcilePaneTrimAction(node,display.id,pane); }); }
  function openSignalTrim(button) { var pane=paneById(button.dataset.paneId), display=activeDisplay(), controller=signalTrimController(); if (display && pane && display.id === button.dataset.displayId && controller) controller.open(signalTrimContext(display.id,pane),button); }
  function submitSignalTrim() { var controller=signalTrimController(); if (controller) controller.submit(); }

  function graphCursorEligible(displayId, paneId) {
    if (!rangeSliderEligible(displayId, paneId)) return false;
    var runtimeKey=paneRuntimeKey(displayId, paneId), host=q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    return !!(host && Array.isArray(host.data) && host.data.some(function (trace) {
      return trace && trace.visible !== false && trace.visible !== "legendonly" &&
        !(trace.meta && trace.meta.signal_analyser_peaks_overlay) &&
        Array.isArray(trace.x) && Array.isArray(trace.y) && trace.x.length && trace.y.length;
    }));
  }

  function syncPaneMenuState() {
    var menu = q("[data-testid='display-overflow-menu']");
    if (!menu || menu.hidden) return;
    var cursorMenuSupported=typeof menu.insertAdjacentHTML === "function" && typeof menu.querySelectorAll === "function";
    if (cursorMenuSupported && window.SignalAnalyserGraphCursorUI) window.SignalAnalyserGraphCursorUI.ensureMenuItems(menu);
    var display = activeDisplay(), paneId = menu.dataset.paneId, displayId = menu.dataset.displayId;
    var rangeAction = menu.querySelector("[data-plot-range-slider]"), amplitudeAction = menu.querySelector("[data-plot-amplitude-slider]");
    var pane = paneById(paneId), spectrum = !!pane && pane.plot_type === "spectrum";
    var eligible = !!display && display.id === displayId && rangeSliderEligible(displayId, paneId);
    if (rangeAction) {
      rangeAction.disabled = !eligible;
      rangeAction.setAttribute("aria-checked", String(rangeSliderEnabled(displayId, paneId)));
      rangeAction.querySelector("span:last-of-type").textContent = spectrum ? "Слайдер частоты" : "Слайдер диапазона";
      rangeAction.setAttribute("aria-label", eligible ? (spectrum ? "Слайдер частоты" : "Слайдер диапазона") : "Слайдер доступен только для загруженной области");
      rangeAction.title = eligible ? "" : "Доступно только для загруженной области";
    }
    if (amplitudeAction) {
      amplitudeAction.disabled = !eligible;
      amplitudeAction.setAttribute("aria-checked", String(amplitudeSliderEnabled(displayId, paneId)));
      amplitudeAction.querySelector("span:last-of-type").textContent = spectrum ? "Слайдер магнитуды" : "Слайдер амплитуды";
      amplitudeAction.setAttribute("aria-label", eligible ? (spectrum ? "Слайдер магнитуды" : "Слайдер амплитуды") : "Слайдер доступен только для загруженной области");
      amplitudeAction.title = eligible ? "" : "Доступно только для загруженной области";
    }
    var cursors=cursorMenuSupported && paneGraphCursorController(), cursorKey=paneRuntimeKey(displayId, paneId), cursorEligible=!!display && display.id === displayId && graphCursorEligible(displayId, paneId);
    if (cursors) {
      if (cursorEligible) cursors.attach(cursorKey, q("[data-pane-host='" + CSS.escape(cursorKey) + "']"));
      else cursors.update(cursorKey);
      cursors.syncMenu(menu, cursorKey, cursorEligible);
    }
  }

  function positionPaneMenu() {
    var menu = q("[data-testid='display-overflow-menu']"), trigger = model.paneMenuTrigger;
    if (!menu || menu.hidden || !trigger || !trigger.isConnected) return;
    var helper=task0141Controller(), shell=q("[data-testid='app-shell']");
    if (!helper || !shell) return;
    menu.style.maxHeight="";
    menu.style.overflowY="";
    var result=helper.anchoredMenuPosition(trigger.getBoundingClientRect(), { width:menu.offsetWidth || 224, height:menu.scrollHeight || menu.offsetHeight }, shell.getBoundingClientRect(), { width:window.innerWidth, height:window.innerHeight });
    if (result.close) return closePaneMenu(true);
    menu.style.position=result.position;
    menu.style.width=result.width + "px";
    menu.style.left=result.left + "px";
    menu.style.top=result.top + "px";
    menu.style.maxHeight=result.maxHeight + "px";
    menu.style.overflowY=result.overflowY;
  }

  function closeGraphHelp(restoreFocus) {
    var help = q("[data-testid='graph-help-overlay']");
    if (!help || help.hidden) return;
    var target = model.graphHelpRestoreTarget;
    help.hidden = true;
    if (target && target.isConnected) target.setAttribute("aria-expanded", "false");
    model.graphHelpRestoreTarget = null;
    if (restoreFocus && target && target.isConnected) target.focus();
  }

  function closePaneMenu(restoreFocus) {
    var menu = q("[data-testid='display-overflow-menu']");
    if (!menu || menu.hidden) return;
    closeGraphHelp(false);
    var trigger = model.paneMenuTrigger;
    menu.hidden = true;
    delete menu.dataset.paneId;
    delete menu.dataset.displayId;
    if (trigger && trigger.isConnected) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
    model.paneMenuTrigger = null;
  }

  function openPaneMenu(trigger) {
    var menu = q("[data-testid='display-overflow-menu']"), display = activeDisplay();
    if (!menu || !display) return;
    if (!menu.hidden && model.paneMenuTrigger === trigger) return closePaneMenu(true);
    closePaneMenu(false);
    closeColumnMenu(false);
    closeMeasurementMenu(false);
    model.paneMenuTrigger = trigger;
    menu.dataset.paneId = trigger.dataset.paneMenu;
    menu.dataset.displayId = display.id;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    syncPaneMenuState();
    positionPaneMenu();
    var first = menu.querySelector("button:not(:disabled)");
    if (first) first.focus();
  }

  function openGraphHelp(trigger) {
    var menu = q("[data-testid='display-overflow-menu']"), help = q("[data-testid='graph-help-overlay']");
    var pane = menu && q("[data-pane-id='" + CSS.escape(menu.dataset.paneId || "") + "']");
    var canvas = pane && pane.querySelector(".plot-canvas");
    if (!menu || menu.hidden || !help || !canvas) return;
    model.graphHelpRestoreTarget = trigger;
    trigger.setAttribute("aria-expanded", "true");
    help.hidden = false;
    var canvasRect = canvas.getBoundingClientRect(), width = help.offsetWidth, height = help.offsetHeight;
    var legend = canvas.querySelector(".legend"), legendBottom = legend ? legend.getBoundingClientRect().bottom : canvasRect.top;
    help.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, canvasRect.left + 8)) + "px";
    help.style.top = Math.min(window.innerHeight - height - 8, Math.max(8, legendBottom + 8)) + "px";
    var close = help.querySelector("[data-graph-help-close]");
    if (close) close.focus();
  }

  function rangeSliderRelayout(host, enabled) {
    var fullLayout = host && host._fullLayout || {}, runtimeKey = host && host.dataset && host.dataset.paneHost;
    var selectedRange = fullLayout.xaxis && Array.isArray(fullLayout.xaxis.range) ? fullLayout.xaxis.range : null;
    var fullRange = runtimeKey && rangeSliderFullRange(model.rangeSliderDataRangeByPane[runtimeKey], selectedRange);
    if (runtimeKey && fullRange) model.rangeSliderFullRangeByPane[runtimeKey] = fullRange;
    var update = {
      "xaxis.rangeslider.visible":enabled,
      "xaxis.rangeslider.thickness":0.15,
      "xaxis.rangeslider.bgcolor":"#ffffff",
      "xaxis.rangeslider.bordercolor":"#e1e1e1",
      "xaxis.rangeslider.borderwidth":1,
      "margin.b":enabled ? 34 : 30
    };
    if (enabled && fullRange) {
      update["xaxis.rangeslider.range"] = fullRange.slice();
      update["xaxis.rangeslider.autorange"] = false;
    }
    return update;
  }

  function togglePaneRangeSlider() {
    var menu = q("[data-testid='display-overflow-menu']"), display = activeDisplay();
    if (!menu || menu.hidden || !display) return;
    var displayId = menu.dataset.displayId, paneId = menu.dataset.paneId, runtimeKey = paneRuntimeKey(displayId, paneId);
    var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    if (display.id !== displayId || !rangeSliderEligible(displayId, paneId) || !host) return;
    var prior = rangeSliderEnabled(displayId, paneId), enabled = !prior;
    model.rangeSliderByPane[runtimeKey] = enabled;
    closePaneMenu(true);
    loadPlotly().then(function (Plotly) {
      if (!host.isConnected || !paneById(paneId)) return;
      return Plotly.relayout(host, rangeSliderRelayout(host, enabled)).then(function () { host.dataset.rangeSliderVisible = String(enabled); bindRangeSliderDoubleClick(host, runtimeKey); syncAmplitudeSlider(host, runtimeKey); if (model.settingsPage === "display") renderSettings(activeDisplay()); });
    }).catch(function () {
      if (prior) model.rangeSliderByPane[runtimeKey] = true; else delete model.rangeSliderByPane[runtimeKey];
      showToast("Не удалось изменить слайдер диапазона.", true);
    });
  }

  function amplitudeSliderRelayout(host, enabled) {
    var runtimeKey = host && host.dataset && host.dataset.paneHost;
    if (host && host.dataset && host.dataset.amplitudeBaseMarginRight === undefined) {
      var currentMargin = host._fullLayout && host._fullLayout.margin && Number(host._fullLayout.margin.r);
      host.dataset.amplitudeBaseMarginRight = String(Number.isFinite(currentMargin) ? currentMargin : 20);
    }
    var baseMargin = host && host.dataset ? Number(host.dataset.amplitudeBaseMarginRight) : 20;
    return { "margin.r":enabled ? Math.max(48, baseMargin) : baseMargin };
  }

  function togglePaneAmplitudeSlider() {
    var menu = q("[data-testid='display-overflow-menu']"), display = activeDisplay();
    if (!menu || menu.hidden || !display) return;
    var displayId = menu.dataset.displayId, paneId = menu.dataset.paneId, runtimeKey = paneRuntimeKey(displayId, paneId);
    var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    if (display.id !== displayId || !rangeSliderEligible(displayId, paneId) || !host) return;
    var prior = amplitudeSliderEnabled(displayId, paneId), enabled = !prior;
    model.amplitudeSliderByPane[runtimeKey] = enabled;
    if (enabled) {
      var currentRange = amplitudeRangeFromHost(host, runtimeKey);
      if (currentRange) model.amplitudeSelectedRangeByPane[runtimeKey] = currentRange;
    }
    closePaneMenu(true);
    loadPlotly().then(function (Plotly) {
      if (!host.isConnected || !paneById(paneId)) return;
      return Plotly.relayout(host, amplitudeSliderRelayout(host, enabled)).then(function () {
        host.dataset.amplitudeSliderVisible = String(enabled);
        syncAmplitudeSlider(host, runtimeKey); if (model.settingsPage === "display") renderSettings(activeDisplay());
      });
    }).catch(function () {
      if (prior) model.amplitudeSliderByPane[runtimeKey] = true; else delete model.amplitudeSliderByPane[runtimeKey];
      showToast("Не удалось изменить слайдер амплитуды.", true);
    });
  }

  function togglePaneGraphCursor(mode) {
    var menu=q("[data-testid='display-overflow-menu']"), display=activeDisplay(), cursors=paneGraphCursorController();
    if (!menu || menu.hidden || !display || !cursors) return;
    var displayId=menu.dataset.displayId, paneId=menu.dataset.paneId, runtimeKey=paneRuntimeKey(displayId, paneId);
    var host=q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    if (display.id !== displayId || !graphCursorEligible(displayId, paneId) || !host) return;
    cursors.setMode(runtimeKey, host, mode);
    closePaneMenu(true);
  }

  function setPaneSliderVisibility(displayId, paneId, axis, visible) {
    var pane=paneById(paneId), runtimeKey=paneRuntimeKey(displayId, paneId), host=q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    if (!pane || !host || !rangeSliderEligible(displayId, paneId)) return;
    var map=axis === "x" ? model.rangeSliderByPane : model.amplitudeSliderByPane;
    if (visible) map[runtimeKey]=true; else delete map[runtimeKey];
    loadPlotly().then(function (Plotly) { return Plotly.relayout(host, axis === "x" ? rangeSliderRelayout(host, visible) : amplitudeSliderRelayout(host, visible)); }).then(function () { host.dataset[axis === "x" ? "rangeSliderVisible" : "amplitudeSliderVisible"]=String(visible); if (axis === "y") syncAmplitudeSlider(host, runtimeKey); syncPaneMenuState(); }).catch(function () { if (visible) delete map[runtimeKey]; else map[runtimeKey]=true; });
  }

  function injectAreaRangeSliderSettings(display, pane) {
    if (!pane) return;
    var host=q("[data-testid='settings-content']"), draft=screenDraftFor(display), helper=task0153Controller() || task0141Controller();
    if (!host) return;
    if (pane.plot_type === "spectrum") {
      var group=document.createElement("section"); group.className="settings-group"; group.dataset.spectrumSliderControls="true";
      group.innerHTML="<button class='settings-group-title' type='button' aria-expanded='true' disabled><span>Параметры</span></button><div class='settings-group-fields'><label class='settings-field-row'><span class='settings-label'>Слайдер частоты</span><span class='settings-control-wrap checkbox-control'><input type='checkbox' data-spectrum-slider-axis='x'"+(rangeSliderEnabled(display.id, pane.id) ? " checked" : "")+"></span></label><label class='settings-field-row'><span class='settings-label'>Слайдер магнитуды</span><span class='settings-control-wrap checkbox-control'><input type='checkbox' data-spectrum-slider-axis='y'"+(amplitudeSliderEnabled(display.id, pane.id) ? " checked" : "")+"></span></label></div>";
      host.insertBefore(group, host.firstChild);
    }
    var links=currentScreenLinkFlags(), scale=pane.plot_type === "spectrum" ? settings.value("spectrum.scale") : pane.plot_type === "persistence" ? settings.value("persistence.scale") : "";
    var descriptors=helper ? helper.areaRanges(pane.plot_type, links, scale) : [];
    if (typeof settings.setExtraVisible === "function") settings.setExtraVisible(descriptors.map(function (item) { return item.fieldId; }));
    descriptors.forEach(function (item) {
      var selector="[data-testid='settings-field-" + CSS.escape(item.fieldId) + "']", row=host.querySelector(selector);
      if (!row) {
        host.insertAdjacentHTML("beforeend", screenSettingsGroup("local-" + item.fieldId.replace(/[^a-zA-Z0-9_-]/g, "-"), item.label, settings.renderRows([item.fieldId])));
        row=host.querySelector(selector);
      }
      if (row) row.insertAdjacentHTML("afterend", screenRangeSlider(item.fieldId, item.axis, draft));
      keepAutomaticRangeInputsEmpty(item.fieldId, item.axis, draft);
    });
  }

  function openPaneClearConfirm() {
    var menu = q("[data-testid='display-overflow-menu']"), layer = q("[data-testid='pane-clear-confirm-layer']"), display = activeDisplay();
    if (!menu || menu.hidden || !layer || !display) return;
    model.paneClearContext = { displayId:menu.dataset.displayId, paneId:menu.dataset.paneId, restoreTarget:model.paneMenuTrigger };
    closePaneMenu(false);
    layer.hidden = false;
    q("[data-testid='app-shell']").inert = true;
    var title = q("#pane-clear-confirm-title");
    if (title) title.focus();
  }

  function closePaneClearConfirm(restoreFocus) {
    var layer = q("[data-testid='pane-clear-confirm-layer']"), context = model.paneClearContext;
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    q("[data-testid='app-shell']").inert = false;
    model.paneClearContext = null;
    if (restoreFocus && context && context.restoreTarget && context.restoreTarget.isConnected) context.restoreTarget.focus();
  }

  function confirmPaneClear() {
    var context = model.paneClearContext, display = activeDisplay(), pane = context && paneById(context.paneId);
    if (!context || !display || display.id !== context.displayId || !pane) return closePaneClearConfirm(true);
    closePaneClearConfirm(false);
    postLayout({ operation:"update_pane", pane_id:pane.id, plot_type:pane.plot_type, signal_bindings:[] }).then(function () {
      var runtimeKey = paneRuntimeKey(context.displayId, context.paneId);
      delete model.rangeSliderByPane[runtimeKey];
      delete model.amplitudeSliderByPane[runtimeKey];
      delete model.amplitudeDataRangeByPane[runtimeKey];
      delete model.amplitudeFullRangeByPane[runtimeKey];
      delete model.amplitudeSelectedRangeByPane[runtimeKey];
      delete model.graphDefaultRangeByPane[runtimeKey];
      delete model.graphDefaultSignatureByPane[runtimeKey];
      var cursors=paneGraphCursorController();
      if (cursors) cursors.clear(runtimeKey);
      showToast("Область очищена", false);
      var target = q("[data-pane-id='" + CSS.escape(context.paneId) + "']");
      if (target) target.focus();
    }).catch(function (error) { showToast(safeErrorText(error, "Не удалось очистить область."), true); });
  }

  function enqueuePlot(displayId, pane, record) {
    var runtimeKey = paneRuntimeKey(displayId, pane.id);
    model.plotQueue[runtimeKey] = record;
    if (model.plotInFlight[runtimeKey]) return;
    model.plotInFlight[runtimeKey] = true;
    window.requestAnimationFrame(function () {
      var queued = model.plotQueue[runtimeKey];
      model.plotQueue[runtimeKey] = null;
      loadPlotly().then(function (Plotly) {
        if (!activeDisplay() || activeDisplay().id !== displayId) return;
        var host = q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
        if (!host || !queued || !hasPlotData(queued.output.data)) return;
        var payload = plotEnvelope(queued.output.data);
        var traces = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : [{ type: "heatmap", x: payload.x, y: payload.y, z: payload.z, colorscale: payload.colorscale }]);
        var sourceLayout = payload.layout || {};
        var localizedPlot=localizePlotPresentation(sourceLayout,traces); sourceLayout=localizedPlot.layout; traces=localizedPlot.traces;
        var labelsPolicy=axisLabelsPolicy();
        if (labelsPolicy) { var hoverSafe=labelsPolicy.suppressHover({data:traces,layout:sourceLayout}); traces=hoverSafe.data; sourceLayout=hoverSafe.layout; }
        var labelsController=axisLabelsController();
        if (labelsController) { var labelsVisible=showAxisLabelsValue(runtimeKey,pane.id,labelsController), labelsProjection=labelsController.capture(runtimeKey,pane.plot_type,sourceLayout,traces,labelsVisible); if (pane.id === model.activePane && labelsController.value(runtimeKey) !== labelsVisible) labelsProjection=labelsController.setVisible(runtimeKey,labelsVisible); sourceLayout=applyAxisLabelsProjection(sourceLayout,traces,labelsProjection); }
        var dataRange = pane.plot_type === "time" ? traceXDataRange(traces) : pane.plot_type === "spectrum" ? traceAxisDataRange(traces, "x") : null;
        var amplitudeDataRange = pane.plot_type === "time" ? traceYDataRange(traces) : pane.plot_type === "spectrum" ? traceAxisDataRange(traces, "y") : null;
        var outputIdentity=plotOutputIdentity(pane, queued);
        var defaultSignature = JSON.stringify({ outputIdentity:outputIdentity, xData:dataRange, yData:amplitudeDataRange, xaxis:sourceLayout.xaxis || null, yaxis:sourceLayout.yaxis || null });
        var defaultChanged = model.graphDefaultSignatureByPane[runtimeKey] !== defaultSignature;
        model.graphDefaultSignatureByPane[runtimeKey] = defaultSignature;
        if (defaultChanged) {
          delete model.rangeSliderFullRangeByPane[runtimeKey];
          delete model.amplitudeFullRangeByPane[runtimeKey];
          delete model.amplitudeSelectedRangeByPane[runtimeKey];
        }
        if (dataRange) model.rangeSliderDataRangeByPane[runtimeKey] = dataRange;
        else { delete model.rangeSliderDataRangeByPane[runtimeKey]; delete model.rangeSliderFullRangeByPane[runtimeKey]; }
        if (amplitudeDataRange) model.amplitudeDataRangeByPane[runtimeKey] = amplitudeDataRange;
        else { delete model.amplitudeDataRangeByPane[runtimeKey]; delete model.amplitudeFullRangeByPane[runtimeKey]; delete model.amplitudeSelectedRangeByPane[runtimeKey]; }
        var renderLayout=plotLayoutWithRangeSlider(sourceLayout, runtimeKey, defaultChanged ? null : host);
        return Plotly.react(host, traces, renderLayout, Object.assign({}, payload.config || {}, { displayModeBar:false, displaylogo:false, responsive:true, doubleClick:false })).then(function () {
          var currentPane=paneById(pane.id), currentRecord=model.outputs[runtimeKey], currentOutputIdentity=plotOutputIdentity(currentPane, currentRecord);
          if (currentPane && currentPane.plot_type === pane.plot_type && currentOutputIdentity === outputIdentity && (defaultChanged || !model.graphDefaultRangeByPane[runtimeKey] || !model.plotAutoscaleByPane[runtimeKey])) {
            var fullLayout = host._fullLayout || {}, xaxis = fullLayout.xaxis, yaxis = fullLayout.yaxis, autoscale=plotAutoscaleController();
            model.graphDefaultRangeByPane[runtimeKey] = {
              x:xaxis && Array.isArray(xaxis.range) ? xaxis.range.slice() : dataRange && dataRange.slice(),
              y:yaxis && Array.isArray(yaxis.range) ? yaxis.range.slice() : amplitudeDataRange && amplitudeDataRange.slice()
            };
            if (autoscale) model.plotAutoscaleByPane[runtimeKey]=autoscale.capture({ plotType:pane.plot_type, sourceLayout:renderLayout, fullLayout:fullLayout, outputIdentity:outputIdentity });
          }
          host.dataset.plotReady = "true"; host.dataset.rangeSliderVisible = String(rangeSliderEnabled(displayId, pane.id)); host.dataset.amplitudeSliderVisible = String(amplitudeSliderEnabled(displayId, pane.id)); bindLinkedTimeHost(host, displayId, pane.id); bindRangeSliderDoubleClick(host, runtimeKey); syncAmplitudeSlider(host, runtimeKey); updatePeaksMarkers(displayId, pane.id, model.peaksRecords[paneRuntimeKey(displayId, pane.id)]);
          var cursors=paneGraphCursorController();
          if (cursors) cursors.attach(runtimeKey, host);
        });
      }).catch(function () { /* The visible provider error is rendered on the next authoritative response. */ }).finally(function () {
        model.plotInFlight[runtimeKey] = false;
        if (model.plotQueue[runtimeKey]) enqueuePlot(displayId, pane, model.plotQueue[runtimeKey]);
      });
    });
  }

  function extremaTabsAvailable(pane) {
    return !!(pane && ["time", "spectrum"].indexOf(pane.plot_type) >= 0);
  }

  function contextTabAvailable(page, pane) {
    var signal=mainSignalForPane(pane);
    return page === "signal" ? !!signal : page === "samples" ? !!stableSignalId(signal) : page !== "peaks" || extremaTabsAvailable(pane);
  }

  function stableSignalId(signal) {
    return signal && typeof signal.id === "string" && signal.id.trim() ? signal.id : null;
  }

  function mainSignalForPane(pane) {
    var signals=model.state && Array.isArray(model.state.signals) ? model.state.signals : [];
    /* Membership controls graph visibility only.  A pane's persisted analysis
       source is authoritative even when it is currently unbound/hidden. */
    var hasPaneMain=!!pane && Object.prototype.hasOwnProperty.call(pane, "analysis_signal");
    var selected=hasPaneMain ? pane.analysis_signal : model.state && (model.state.selected_signal || model.state.analysis_signal || model.state.row_selected_signal);
    if (!String(selected == null ? "" : selected).trim()) selected=model.state && (model.state.selected_signal || model.state.analysis_signal || model.state.row_selected_signal);
    return signals.filter(function (signal) {
      return selected && (signal.name === selected || stableSignalId(signal) === selected);
    })[0] || null;
  }

  function selectedSignalName() {
    var paneMain=mainSignalForPane(paneById(model.activePane));
    return paneMain ? paneMain.name : "";
  }

  function signalNameMatches(signal, name) {
    return !!signal && !!name && (signal.name === name || stableSignalId(signal) === name);
  }

  function signalSettingsGroup(editor, key, title, body) {
    var collapsed = !!(editor.collapsed && editor.collapsed[key]);
    var bodyId = "signal-settings-" + editor.signalId.replace(/[^a-zA-Z0-9_-]/g, "-") + "-" + key;
    return "<section class='settings-group" + (collapsed ? " is-collapsed" : "") + "' data-signal-settings-group='" + esc(key) + "'><button class='settings-group-title' type='button' data-signal-settings-group-toggle='" + esc(key) + "' aria-expanded='" + String(!collapsed) + "' aria-controls='" + esc(bodyId) + "'><span>" + esc(title) + "</span></button><div class='settings-group-fields' id='" + esc(bodyId) + "'" + (collapsed ? " hidden" : "") + ">" + body + "</div></section>";
  }

  function activeSignalNameEditor() {
    var node=document.activeElement, editor=model.signalEditor;
    if (model.settingsPage !== "signal" || !node || !node.dataset || node.dataset.signalMetadata !== "name" || !editor || !editor.signalId || !editor.draft) return null;
    var pane=paneById(model.activePane), signal=mainSignalForPane(pane);
    if (!signal || stableSignalId(signal) !== editor.signalId) return null;
    return { node:node, signalId:editor.signalId, intent:editor.intent || 0 };
  }

  function releaseActiveSignalNameEditor() {
    var active=activeSignalNameEditor();
    if (active && active.node && typeof active.node.blur === "function") active.node.blur();
  }

  function ensureSignalSettingsTab() {
    var tabs=q("[data-testid='settings-tabs']");
    if (!tabs || q("[data-testid='settings-tab-signal']")) return;
    var button=document.createElement("button");
    button.id="settings-tab-signal"; button.type="button"; button.setAttribute("role", "tab"); button.dataset.settingsPage="signal"; button.dataset.testid="settings-tab-signal"; button.setAttribute("data-testid", "settings-tab-signal"); button.textContent="Сигнал";
    var display=q("[data-settings-page='display']"); tabs.insertBefore(button, display || tabs.firstChild);
  }

  function summaryTimeProjection(pane, summary) {
    var fieldId=pane && pane.plot_type === "spectrogram" ? "spectrogram.time_units" : pane && pane.plot_type === "persistence" ? "persistence.time_units" : "time.units";
    var unit=(typeof settings.value === "function" && settings.value(fieldId)) || "seconds";
    var maximumSeconds=Math.max(Math.abs(Number(summary && summary.region_end_s) || 0), Math.abs(Number(summary && summary.duration_s) || 0));
    var secondsPerUnit=screenTimeUnitFactor(unit, maximumSeconds || 1);
    var resolved=unit;
    if (unit === "auto") {
      var factors={ "1e-12":"picoseconds", "1e-9":"nanoseconds", "0.000001":"microseconds", "0.001":"milliseconds", "1":"seconds", "60":"minutes", "3600":"hours", "86400":"days", "31557600":"years" };
      resolved=factors[String(secondsPerUnit)] || "seconds";
    }
    var presenter=russianPresenter(),projected=presenter && typeof presenter.unitLabel === "function" ? presenter.unitLabel(resolved) : ({picoseconds:"пс",nanoseconds:"нс",microseconds:"мкс",milliseconds:"мс",seconds:"с",minutes:"мин",hours:"ч",days:"дн",years:"г"})[resolved];
    return { secondsPerUnit:secondsPerUnit, label:projected || "с" };
  }

  function summaryNumber(value) {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
    return measurementValue({ value:Number(value) }, "value");
  }

  function summaryTimeValue(value, projection, sampleIndex) {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
    var copy=summaryNumber(Number(value) / projection.secondsPerUnit) + " " + projection.label;
    return sampleIndex === null || sampleIndex === undefined ? copy : copy + " · индекс " + String(sampleIndex);
  }

  function signalSummaryMetrics(pane, signal, summary) {
    var projection=summaryTimeProjection(pane, summary), fields=task0126 && task0126.summaryFields || [];
    return fields.map(function (field) {
      var id=field[0], value;
      if (id === "sample_count") value=summary.sample_count == null ? signal.sample_count : summary.sample_count;
      else if (id === "data_type") value=summary.data_type || signal.data_type;
      else if (id === "duration") value=summaryTimeValue(summary.duration_s == null ? signal.duration_s : summary.duration_s, projection);
      else if (id === "region_start") value=summaryTimeValue(summary.region_start_s, projection);
      else if (id === "region_end") value=summaryTimeValue(summary.region_end_s, projection);
      else if (id === "minimum_position") value=summaryTimeValue(summary.minimum_time_s, projection, summary.minimum_sample_index);
      else if (id === "maximum_position") value=summaryTimeValue(summary.maximum_time_s, projection, summary.maximum_sample_index);
      else if (id === "peak_to_peak") value=summaryNumber(summary.peak_to_peak == null ? summary.range : summary.peak_to_peak);
      else value=summaryNumber(summary[id]);
      return [field[1], value == null || value === "" ? "—" : value];
    });
  }

  function renderSignalSettings(pane) {
    var host=q("[data-testid='settings-content']"), signal=mainSignalForPane(pane);
    if (!host) return;
    if (!signal) { host.innerHTML=""; return; }
    var signalId=stableSignalId(signal);
    if (!signalId) {
      host.innerHTML="<p class='status-note error' role='alert'>Для сигнала отсутствует постоянный идентификатор.</p>";
      return;
    }
    var editor=model.signalEditor;
    if (!editor.collapsed) editor.collapsed={ main:false, summary:false };
    if (editor.signalId !== signalId) {
      editor={ signalId:signalId, summary:null, loading:true, error:"", collapsed:{ main:false, summary:false }, applying:false, dirty:false, intent:0, saveQueued:false, draft:{ name:signal.name, color:signalColor(signal), sample_rate_hz:String(signal.sample_rate_hz == null ? "" : signal.sample_rate_hz) } };
      model.signalEditor=editor;
      boundedRequest(api.signalSummary(signalId), 10000).then(function (summary) {
        if (model.signalEditor !== editor) return;
        editor.loading=false; editor.summary=summary; renderSettings(activeDisplay());
      }).catch(function (error) {
        if (model.signalEditor !== editor) return;
        editor.loading=false; editor.error=safeErrorText(error, "Не удалось загрузить сводку."); renderSettings(activeDisplay());
      });
    }
    var d=editor.draft, rate=signalSampleRateValidation(d.sample_rate_hz), disabled=editor.applying ? " disabled" : "", s=(editor.summary && editor.summary.summary) || editor.summary || {}, metrics=signalSummaryMetrics(pane, signal, s);
    var noHistory=" autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'";
    var mainBody="<label class='settings-field-row'><span class='settings-label'>Имя</span><span class='settings-control-wrap'><input class='control' data-signal-metadata='name'"+noHistory+" value='"+esc(d.name)+"'"+disabled+"></span></label><label class='settings-field-row'><span class='settings-label'>Цвет</span><span class='settings-control-wrap color-field'><button class='color-swatch-button' type='button' data-signal-color-trigger aria-label='Цвет сигнала'"+disabled+"><i style='--signal-color:"+esc(d.color)+"'></i></button><input class='control' data-signal-metadata='color' data-signal-color-input"+noHistory+" value='"+esc(d.color)+"'"+disabled+"></span></label><label class='settings-field-row"+(rate.error ? " has-error" : "")+"' data-signal-metadata-row='sample_rate_hz'><span class='settings-label'>Дискретизация, Гц</span><span class='settings-control-wrap'><input class='control' type='text' data-signal-metadata='sample_rate_hz' inputmode='decimal'"+noHistory+" value='"+esc(d.sample_rate_hz)+"' aria-invalid='"+String(!!rate.error)+"'"+disabled+"></span><small class='field-message is-error' data-signal-metadata-error='sample_rate_hz'"+(rate.error ? "" : " hidden")+">"+esc(rate.error)+"</small></label>";
    var summaryBody="<div class='summary-grid'>"+metrics.map(function (item) { return "<div class='summary-item'><span>"+item[0]+"</span><strong>"+esc(item[1] == null ? "—" : item[1])+"</strong></div>"; }).join("")+"</div>"+(editor.loading ? "<p class='status-note info'>Загрузка сводки…</p>" : editor.error ? "<p class='status-note error'>"+esc(editor.error)+"</p>" : "");
    host.innerHTML=signalSettingsGroup(editor, "main", "Основное", mainBody) + signalSettingsGroup(editor, "summary", "Сводка", summaryBody);
    decorateNoHistory(host);
  }

  function showSignalSamples() {
    if (!syncSignalSamplesWithMain({ retry:true })) return;
    model.inspectorPage="samples";
    renderInspector();
    var tab=q("[data-bottom-tab='samples']");
    if (tab) tab.focus();
  }

  function signalSampleRateValidation(raw) {
    var parsed=numeric.parse(raw, "decimal");
    if (!parsed.valid) return { valid:false, value:null, error:parsed.error };
    if (parsed.value <= 0) return { valid:false, value:null, error:"Введите положительную частоту дискретизации." };
    return { valid:true, value:parsed.value, error:"" };
  }

  function projectSignalSampleRateValidation(input) {
    var validation=signalSampleRateValidation(input.value), row=input.closest("[data-signal-metadata-row]"), message=row && row.querySelector("[data-signal-metadata-error]");
    input.setCustomValidity(validation.error || "");
    input.setAttribute("aria-invalid", String(!validation.valid));
    if (row) row.classList.toggle("has-error", !validation.valid);
    if (message) { message.hidden=validation.valid; message.textContent=validation.error; }
    return validation;
  }

  function syncSignalSamplesWithMain() {
    var options=arguments[0], signal=mainSignalForPane(paneById(model.activePane)), tabs=q(".inspector-tabs"), tab=q("[data-bottom-tab='samples']");
    var signalId=stableSignalId(signal);
    if (!signal || !signalId) {
      if (tab) tab.remove();
      if (model.inspectorPage === "samples") model.inspectorPage="signals";
      model.signalSamples=createSignalSamplesState("", (model.signalSamples.token || 0) + 1, "");
      return false;
    }
    if (!tabs) return false;
    var state=model.signalSamples;
    if (state.signalId !== signalId) state=model.signalSamples=createSignalSamplesState(signalId, (state.token || 0) + 1, signal.name);
    if (!tab) { tab=document.createElement("button"); tab.type="button"; tab.setAttribute("role", "tab"); tab.dataset.bottomTab="samples"; tab.dataset.testid="inspector-tab-samples"; tab.setAttribute("data-testid", "inspector-tab-samples"); tabs.appendChild(tab); }
    tab.textContent=signal.name;
    if (options && options.retry && !state.rows.length && state.error) state.error="";
    if (!state.rows.length && !signalSamplesLoading(state) && !state.error && !state.firstBatchLoaded) loadSignalSamples("down");
    return true;
  }

  function signalSamplesController() {
    return window.SignalSamplesRowWindow || null;
  }

  function signalSamplesSearchHelper() {
    return window.SignalSamplesSearchMarkers || null;
  }

  function signalSamplesColumnsHelper() {
    return window.SignalSamplesCalculatedColumns || null;
  }

  function signalSamplesColumnVisibility() {
    var helper=signalSamplesColumnsHelper();
    if (!helper) return {};
    if (!model.sampleColumnsVisibility) model.sampleColumnsVisibility=helper.defaultVisibility();
    model.sampleColumnsVisibility=helper.normalizeVisibility(model.sampleColumnsVisibility);
    return model.sampleColumnsVisibility;
  }

  function createSignalSamplesState(signalId, token, signalName) {
    var controller=signalSamplesController(), state=controller ? controller.create(signalId, token) : { signalId:String(signalId || ""), token:Number(token) || 0, rows:[], startOffset:0, endOffset:0, total:0, firstBatchLoaded:false, pending:{ up:null, down:null }, error:"" };
    state.signalName=String(signalName || "");
    state.pending=state.pending || { up:null, down:null };
    state.pending.search=null;
    state.searchValue="";
    state.searchState="";
    state.searchMessage="";
    return state;
  }

  function signalSamplesLoading(state) {
    return !!(state && state.pending && (state.pending.up || state.pending.down || state.pending.search));
  }

  function normalizeSignalSamplesPage(page) {
    if (!page || !Array.isArray(page.rows)) return page;
    var startOffset=page.start_offset == null ? page.cursor : page.start_offset;
    var numericStart=Number(startOffset);
    return {
      signal_id:page.signal_id || page.signal && page.signal.id,
      signal:page.signal,
      start_offset:startOffset,
      end_offset:page.end_offset == null && Number.isSafeInteger(numericStart) ? numericStart + page.rows.length : page.end_offset,
      rows:page.rows,
      total:page.total
    };
  }

  function loadSignalSamples(direction) {
    var controller=signalSamplesController(), state=model.signalSamples;
    if (!controller || !state.signalId || state.pending && state.pending.search || state.firstBatchLoaded && !state.rows.length) return;
    var request=controller.begin(state, direction || "down");
    if (!request) return;
    var requestLimit=request.direction === "up" ? Math.min(request.limit, state.startOffset - request.startOffset) : request.limit;
    var scrollTop=signalSamplesScrollTop(), rowHeight=signalSamplesRenderedRowHeight();
    renderInspector(); restoreSignalSamplesScrollTop(scrollTop);
    boundedRequest(api.signalSamples(request.signalId, request.startOffset, requestLimit), 10000).then(function (page) {
      if (state !== model.signalSamples || request.token !== state.token) return;
      scrollTop=signalSamplesScrollTop(); rowHeight=signalSamplesRenderedRowHeight();
      var result=controller.apply(state, request, normalizeSignalSamplesPage(page));
      if (!result.accepted) {
        if (result.reason === "stale-token" || result.reason === "stale-request") return;
        var invalidPageMessage="Сервер вернул некорректную страницу значений сигнала.";
        if (!controller.reject(state, request, invalidPageMessage)) state.error=invalidPageMessage;
      }
      renderInspector(); restoreSignalSamplesScrollTop(scrollTop, result, rowHeight);
    }).catch(function (error) {
      if (state !== model.signalSamples || request.token !== state.token) return;
      scrollTop=signalSamplesScrollTop();
      if (controller.reject(state, request, safeErrorText(error, "Не удалось загрузить значения."))) { renderInspector(); restoreSignalSamplesScrollTop(scrollTop); }
    });
  }

  function focusSignalSampleSearchResult(result) {
    if (!result || !result.accepted || model.inspectorPage !== "samples") return;
    window.requestAnimationFrame(function () {
      if (model.inspectorPage !== "samples") return;
      var scroll=q("[data-testid='samples-table-scroll']");
      if (!scroll) return;
      if (result.scrollTop != null) scroll.scrollTop=result.scrollTop;
      if (!result.rowSelector) return;
      var row=scroll.querySelector(result.rowSelector);
      if (!row) return;
      try { row.focus({ preventScroll:true }); } catch (_) { row.focus(); }
      if (typeof row.scrollIntoView === "function") row.scrollIntoView({ block:"center", inline:"nearest" });
    });
  }

  function submitSignalSamplesSearch(rawValue) {
    var helper=signalSamplesSearchHelper(), state=model.signalSamples;
    if (!helper || !state || !state.signalId) return;
    state.searchValue=String(rawValue == null ? "" : rawValue);
    var started=helper.begin(state, state.searchValue);
    if (!started.accepted) {
      state.searchState=started.state || "error";
      state.searchMessage=started.message || "Не удалось перейти к точке.";
      renderInspector();
      window.requestAnimationFrame(function () { var input=q("[data-testid='sample-point-search-input']"); if (input) input.focus(); });
      return;
    }
    var request=started.request;
    state.searchState=started.state || "loading";
    state.searchMessage=started.message || "";
    renderInspector();
    boundedRequest(api.signalSamples(request.signalId, request.startOffset, request.limit), 10000).then(function (page) {
      if (state !== model.signalSamples || request.token !== state.token) return;
      var result=helper.apply(state, request, normalizeSignalSamplesPage(page));
      if (!result.accepted) {
        if (result.reason === "stale-token" || result.reason === "stale-request") return;
        helper.reject(state, request);
        state.searchState="error";
        state.searchMessage=state.error || "Сервер вернул некорректную страницу значений сигнала.";
        state.error="";
        renderInspector();
        return;
      }
      state.searchState=result.state || "success";
      state.searchMessage=result.message || "";
      renderInspector();
      focusSignalSampleSearchResult(result);
    }).catch(function (error) {
      if (state !== model.signalSamples || request.token !== state.token) return;
      if (!helper.reject(state, request)) return;
      state.searchState="error";
      state.searchMessage=safeErrorText(error, state.error || "Не удалось загрузить точку.");
      state.error="";
      renderInspector();
    });
  }

  function signalSamplesScrollTop() {
    if (model.inspectorPage !== "samples") return null;
    var scroll=q("[data-testid='samples-table-scroll']");
    return scroll ? scroll.scrollTop : null;
  }

  function signalSamplesRenderedRowHeight() {
    var scroll=q("[data-testid='samples-table-scroll']"), row=scroll && scroll.querySelector("tbody tr");
    if (!row) return 0;
    var rect=typeof row.getBoundingClientRect === "function" ? row.getBoundingClientRect() : null;
    return rect && Number(rect.height) > 0 ? Number(rect.height) : Number(row.offsetHeight) || 0;
  }

  function restoreSignalSamplesScrollTop(scrollTop, result, rowHeight) {
    if (scrollTop == null || model.inspectorPage !== "samples") return;
    var scroll=q("[data-testid='samples-table-scroll']"), controller=signalSamplesController();
    if (scroll) scroll.scrollTop=scrollTop + (controller ? controller.scrollCompensation(result, rowHeight) : 0);
  }

  function prefetchSignalSamples(scroll, state) {
    var controller=signalSamplesController();
    if (!controller || !scroll || !state.rows.length || state.error || signalSamplesLoading(state)) return;
    var firstRow=scroll.querySelector("tbody tr"), rowHeight=signalSamplesRenderedRowHeight();
    if (!firstRow || rowHeight <= 0) return;
    var rowsTop=Number(firstRow.offsetTop) || 0;
    var firstVisible=Math.max(0, Math.floor((scroll.scrollTop - rowsTop) / rowHeight));
    var lastVisible=Math.min(state.rows.length - 1, Math.max(firstVisible, Math.ceil((scroll.scrollTop + scroll.clientHeight - rowsTop) / rowHeight) - 1));
    controller.prefetchDirections(state, firstVisible, lastVisible).forEach(loadSignalSamples);
  }

  function renderSignalSamplesInspector(body) {
    var state=model.signalSamples, controller=signalSamplesController(), helper=signalSamplesSearchHelper(), columnsHelper=signalSamplesColumnsHelper();
    if (!state.signalId) { body.innerHTML="<div class='table-empty' role='status'>Выберите основной сигнал.</div>"; return; }
    if (!state.rows.length && !signalSamplesLoading(state) && !state.error && !state.firstBatchLoaded) loadSignalSamples("down");
    var display=activeDisplay(), pane=paneById(model.activePane), signal=mainSignalForPane(pane), runtimeKey=display && pane ? paneRuntimeKey(display.id, pane.id) : "";
    var markers=helper ? helper.markerMap({ record:runtimeKey ? model.peaksRecords[runtimeKey] : null, signalId:stableSignalId(signal), signalName:signal && signal.name, plotType:pane && pane.plot_type, displayId:display && display.id, paneId:pane && pane.id, signalMatches:function (candidate, expected) { return !!signal && signalNameMatches(signal, candidate) && signalNameMatches(signal, expected); } }) : {};
    var loading=signalSamplesLoading(state), slidingLoading=!!(state.pending && (state.pending.up || state.pending.down)), searchLoading=!!(state.pending && state.pending.search), searchDisabled=searchLoading || !state.firstBatchLoaded, footer=controller ? controller.footer(state) : "0–0 из 0";
    var searchMarkup=helper && helper.searchMarkup || { rowClass:"inspector-search-row samples-point-search-row", input:{ placeholder:"Введите номер точки", testid:"sample-point-search-input" }, status:{ testid:"sample-point-search-status", role:"alert", ariaLive:"assertive" } };
    var trigger=columnsHelper && columnsHelper.trigger || { testid:"sample-columns-menu-trigger", className:"inspector-action samples-columns-menu-trigger", icon:"more-vertical.svg", ariaLabel:"Выбрать отображаемые столбцы", tooltip:"Видимость столбцов" };
    var menu=ensureSampleColumnsMenu(), menuOpen=!!menu && !menu.hidden;
    var errorStatus=state.searchState === "error" && state.searchMessage ? "<span class='samples-point-search-status' data-testid='"+esc(searchMarkup.status.testid)+"' role='"+esc(searchMarkup.status.role || "alert")+"' aria-live='"+esc(searchMarkup.status.ariaLive || "assertive")+"' data-state='error'>"+esc(state.searchMessage)+"</span>" : "";
    var searchRow="<div class='"+esc(searchMarkup.rowClass)+"'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='"+esc(searchMarkup.input.type || "search")+"' inputmode='"+esc(searchMarkup.input.inputmode || "numeric")+"' data-testid='"+esc(searchMarkup.input.testid)+"' aria-label='Номер точки' placeholder='"+esc(searchMarkup.input.placeholder)+"' autocomplete='"+esc(searchMarkup.input.autocomplete || "off")+"' spellcheck='false' autocapitalize='off' autocorrect='off' value='"+esc(state.searchValue || "")+"'"+(searchDisabled ? " disabled" : "")+"></div>"+errorStatus+"<button class='"+esc(trigger.className)+"' type='button' data-testid='"+esc(trigger.testid)+"' data-tooltip='"+esc(trigger.tooltip)+"' aria-label='"+esc(trigger.ariaLabel)+"' aria-haspopup='menu' aria-expanded='"+String(menuOpen)+"'><img src='./icons/"+esc(trigger.icon)+"' alt=''></button></div>";
    var visibility=signalSamplesColumnVisibility(), visibleColumns=columnsHelper ? columnsHelper.visibleColumns(visibility) : [];
    var tableWidth=columnsHelper ? columnsHelper.minimumTableWidth(visibility) : 0;
    var headMarkup=visibleColumns.map(function (column) { return "<th data-sample-column='"+esc(column.id)+"'>"+esc(column.label)+"</th>"; }).join("");
    var rowsMarkup=state.rows.map(function (row) {
      var sampleIndex=row.sample_index == null ? row.index : row.sample_index, marker=markers[sampleIndex], markerMarkup="";
      if (marker) { var typeLabel=marker.type === "minimum" ? "Минимум" : "Максимум"; markerMarkup="<span class='extrema-table-marker is-"+esc(marker.type)+"' style='--marker-color:"+esc(marker.color)+"' data-marker-symbol='"+(marker.type === "minimum" ? "triangle-down" : "triangle-up")+"' aria-label='"+typeLabel+", метка "+esc(marker.graphNumber)+"'><i aria-hidden='true'></i><b>"+esc(marker.graphNumber)+"</b></span>"; }
      var projectedRow=Object.assign({}, row, { sample_index:sampleIndex, time:row.time == null ? row.time_s : row.time });
      var cells=columnsHelper ? columnsHelper.rowProjection(projectedRow, visibility) : [];
      return "<tr data-sample-index='"+esc(sampleIndex)+"' tabindex='-1'>"+cells.map(function (cell) {
        if (cell.id === "sample_index") return "<td data-sample-column='sample_index'><span class='sample-point-cell-content'><span class='sample-point-cell-number'>"+esc(cell.value)+"</span>"+markerMarkup+"</span></td>";
        return "<td data-sample-column='"+esc(cell.id)+"'>"+esc(cell.value)+"</td>";
      }).join("")+"</tr>";
    }).join("");
    body.innerHTML=searchRow+"<div class='signal-table-scroll' data-testid='samples-table-scroll'><table class='signal-table sample-table' data-calculated-columns style='--sample-table-min-width:"+esc(tableWidth)+"px'><thead><tr>"+headMarkup+"</tr></thead><tbody>"+rowsMarkup+"</tbody></table><div class='samples-footer'><span>"+esc(footer)+"</span></div>"+(slidingLoading ? "<div class='samples-loading' role='status'>Загрузка…</div>" : state.error ? "<div class='samples-loading' role='alert'>"+esc(state.error)+"</div>" : !state.rows.length && state.firstBatchLoaded && !loading ? "<div class='samples-loading' role='status'>У сигнала нет отсчётов.</div>" : "")+"</div>";
    var scroll=body.querySelector("[data-testid='samples-table-scroll']");
    if (scroll) scroll.addEventListener("scroll", function () { prefetchSignalSamples(scroll, state); }, { passive:true });
    if (menuOpen) { model.sampleColumnsMenuTrigger=body.querySelector("[data-testid='sample-columns-menu-trigger']"); renderSampleColumnsMenu(); positionMenu(menu, model.sampleColumnsMenuTrigger, 244); }
  }

  function screenDraftFor(display) {
    var authoritativeRows = model.layout && model.layout.rows || 1;
    var authoritativeColumns = model.layout && model.layout.columns || 1;
    var rawLinkTime = typeof settings.screenValue === "function" ? settings.screenValue("time.link_time") : typeof settings.value === "function" ? settings.value("time.link_time") : undefined;
    var rawLinkAmplitude = typeof settings.screenValue === "function" ? settings.screenValue("time.link_amplitude") : typeof settings.value === "function" ? settings.value("time.link_amplitude") : undefined;
    var rawLinkFrequency = typeof settings.screenValue === "function" ? settings.screenValue("spectrum.link_frequency") : typeof settings.value === "function" ? settings.value("spectrum.link_frequency") : undefined;
    var rawLinkMagnitude = typeof settings.screenValue === "function" ? settings.screenValue("spectrum.link_magnitude") : typeof settings.value === "function" ? settings.value("spectrum.link_magnitude") : undefined;
    var linksReady = rawLinkTime !== undefined && rawLinkAmplitude !== undefined && rawLinkFrequency !== undefined && rawLinkMagnitude !== undefined;
    if (!model.screenDraft || model.screenDraft.displayId !== display.id) {
      var linkTime = !!rawLinkTime;
      var linkAmplitude = !!rawLinkAmplitude;
      model.screenDraft = {
        displayId:display.id,
        rows:authoritativeRows,
        columns:authoritativeColumns,
        initialRows:authoritativeRows,
        initialColumns:authoritativeColumns,
        linkTime:linkTime,
        initialLinkTime:linkTime,
        linkAmplitude:linkAmplitude,
        initialLinkAmplitude:linkAmplitude,
        linkFrequency:!!rawLinkFrequency,
        initialLinkFrequency:!!rawLinkFrequency,
        linkMagnitude:!!rawLinkMagnitude,
        initialLinkMagnitude:!!rawLinkMagnitude,
        linksReady:linksReady,
        error:""
      };
    } else if (!model.screenApplying) {
      var draft = model.screenDraft;
      if (draft.rows === draft.initialRows) draft.rows = authoritativeRows;
      if (draft.columns === draft.initialColumns) draft.columns = authoritativeColumns;
      draft.initialRows = authoritativeRows;
      draft.initialColumns = authoritativeColumns;
      if (linksReady) {
        var timeDirty = draft.linkTime !== draft.initialLinkTime;
        var amplitudeDirty = draft.linkAmplitude !== draft.initialLinkAmplitude;
        var frequencyDirty = draft.linkFrequency !== draft.initialLinkFrequency;
        var magnitudeDirty = draft.linkMagnitude !== draft.initialLinkMagnitude;
        if (!timeDirty) draft.linkTime = !!rawLinkTime;
        if (!amplitudeDirty) draft.linkAmplitude = !!rawLinkAmplitude;
        if (!frequencyDirty) draft.linkFrequency = !!rawLinkFrequency;
        if (!magnitudeDirty) draft.linkMagnitude = !!rawLinkMagnitude;
        draft.initialLinkTime = !!rawLinkTime;
        draft.initialLinkAmplitude = !!rawLinkAmplitude;
        draft.initialLinkFrequency = !!rawLinkFrequency;
        draft.initialLinkMagnitude = !!rawLinkMagnitude;
        draft.linksReady = true;
      }
    }
    return model.screenDraft;
  }

  function screenDraftDirty(draft) {
    return !!draft && (draft.rows !== draft.initialRows || draft.columns !== draft.initialColumns || draft.linkTime !== draft.initialLinkTime || draft.linkAmplitude !== draft.initialLinkAmplitude || draft.linkFrequency !== draft.initialLinkFrequency || draft.linkMagnitude !== draft.initialLinkMagnitude);
  }

  function screenLimitFieldIds(draft) {
    var ids = [];
    if (draft && draft.linkTime) ids.push("time.units");
    if (draft && draft.linkFrequency) ids.push("spectrum.frequency_units");
    return ids;
  }

  function previewScreenLinks(draft) {
    if (typeof settings.setLinkPreview === "function") settings.setLinkPreview(draft && draft.linkTime, draft && draft.linkAmplitude, draft && draft.linkFrequency, draft && draft.linkMagnitude);
  }

  function areaScreenApplyState(draft) {
    var area = settings.state();
    var screen = typeof settings.stateFor === "function" ? settings.stateFor(screenLimitFieldIds(draft)) : { dirty:false, invalid:false, revision:area.revision };
    return {
      dirty:screenDraftDirty(draft) || area.dirty || screen.dirty,
      invalid:area.invalid || screen.invalid,
      areaDirty:area.dirty,
      screenFieldsDirty:screen.dirty,
      revision:Math.max(area.revision || 0, screen.revision || 0)
    };
  }

  function setScreenLayoutAxis(axis, selected) {
    var draft = activeDisplay() && screenDraftFor(activeDisplay());
    var value = Number(selected);
    if (!draft || ["rows", "columns"].indexOf(axis) < 0 || !Number.isInteger(value) || value < 1 || value > 10 || draft[axis] === value) return;
    draft[axis] = value;
    draft.error = "";
    renderScreenSettings(activeDisplay());
    scheduleScreenSettingsApply();
  }

  function scheduleScreenSettingsApply() {
    window.clearTimeout(model.screenApplyTimer);
    model.screenApplyTimer = window.setTimeout(function () {
      model.screenApplyTimer = null;
      applySettings();
    }, 150);
  }

  function publicationBatch(targetRevision) {
    return model.settingsPublishEvents.filter(function (event) { return event.revision <= targetRevision; });
  }

  function consumePublicationBatch(targetRevision) {
    model.settingsPublishEvents=model.settingsPublishEvents.filter(function (event) { return event.revision > targetRevision; });
  }

  function revertPublicationNamePreviews(batch) {
    if (typeof settings.releaseActiveNameEditor === "function") settings.releaseActiveNameEditor();
    (batch || []).forEach(function (event) {
      if (event.fieldId === "display.name" || event.fieldId === "pane.name") clearNamePreview(event.fieldId, event.displayId, event.paneId);
    });
    render();
  }

  function scheduleSettingsPublication(revision) {
    model.settingsPublishWanted=Math.max(model.settingsPublishWanted, Number(revision) || model.revision);
    if (model.settingsPublishing || model.screenApplying) return;
    window.clearTimeout(model.settingsPublishTimer);
    model.settingsPublishTimer=window.setTimeout(function () {
      model.settingsPublishTimer=null;
      if (model.settingsPublishing || model.screenApplying || model.settingsPublishWanted <= model.settingsPublishPublished) return;
      var targetRevision=model.settingsPublishWanted;
      var batch=publicationBatch(targetRevision);
      var noOutputOnly=batch.length > 0 && batch.every(function (event) { return event.fieldId === "display.name" || event.fieldId === "pane.name" || event.fieldId === "display.show_axis_labels"; });
      model.settingsPublishing=true;
      var areaLoads=[];
      batch.forEach(function (publication) {
        if (!publication.areaOutput || !publication.displayId || !publication.paneId) return;
        if (areaLoads.some(function (entry) { return entry.displayId === publication.displayId && entry.paneId === publication.paneId; })) return;
        areaLoads.push({ displayId:publication.displayId, paneId:publication.paneId, token:beginPaneLoading(publication.displayId, publication.paneId, "area-settings") });
      });
      boundedApply(settings.commit(), 10000).then(function (response) {
        if (response && response.success === false) throw new Error(response.error || "Сервер отклонил настройки.");
        model.revision=Math.max(model.revision, response && response.state_revision || model.revision);
        model.settingsCommittedRevision=Math.max(model.settingsCommittedRevision, response && response.state_revision || -1);
        model.settingsPublishPublished=Math.max(model.settingsPublishPublished, targetRevision);
        settings.setRevision(model.revision);
        if (response && response.settings && typeof settings.accept === "function") settings.accept(response.settings);
        consumePublicationBatch(targetRevision);
        return refreshSnapshot(render).catch(function () { render(); return null; }).then(function () {
          areaLoads.forEach(function (entry) { if (entry.token) armPaneLoading(entry.displayId, entry.paneId, entry.token); });
          if (!noOutputOnly) output(true);
          return response;
        });
      }).catch(function (error) {
        areaLoads.forEach(function (entry) { if (entry.token) settlePaneLoading(entry.displayId, entry.paneId, "error", entry.token); });
        batch.forEach(function (publication) { if (publication.fieldId && /limits$/.test(publication.fieldId)) releaseRangeLifecycle(publication.displayId,publication.paneId || model.activePane,"error"); });
        revertPublicationNamePreviews(batch);
        showToast(safeErrorText(error, "Не удалось применить настройки."), true);
      }).finally(function () {
        model.settingsPublishing=false;
        if (model.settingsPublishWanted > targetRevision) scheduleSettingsPublication(model.settingsPublishWanted);
      });
    }, 150);
  }

  function screenLayoutSegments(axis, selected, label) {
    return "<div class='segments screen-layout-segments' role='group' aria-label='" + label + "'>" + Array.from({ length:10 }, function (_, index) {
      var value = index + 1;
      return "<button class='segment" + (selected === value ? " is-selected" : "") + "' type='button' data-screen-layout-" + axis + "='" + value + "' data-testid='screen-layout-" + axis + "-" + value + "' aria-pressed='" + String(selected === value) + "'>" + value + "</button>";
    }).join("") + "</div>";
  }

  function screenSettingsGroup(key, title, body) {
    var collapsed = !!model.screenCollapsed[key];
    var bodyId = "screen-settings-group-" + key;
    return "<section class='settings-group screen-settings-group" + (collapsed ? " is-collapsed" : "") + "' data-screen-settings-group='" + key + "'>" +
      "<button class='settings-group-title' type='button' data-screen-settings-group-toggle='" + key + "' aria-expanded='" + String(!collapsed) + "' aria-controls='" + bodyId + "'><span>" + title + "</span></button>" +
      "<div class='settings-group-fields' id='" + bodyId + "'" + (collapsed ? " hidden" : "") + ">" + body + "</div>" +
    "</section>";
  }

  function screenTimeUnitFactor(unit, maximumSeconds) {
    var factors = { picoseconds:1e-12, nanoseconds:1e-9, microseconds:1e-6, milliseconds:1e-3, seconds:1, minutes:60, hours:3600, days:86400, years:31557600 };
    if (unit !== "auto") return factors[unit] || 1;
    var maximum = Math.abs(Number(maximumSeconds));
    var ordered = [1e-12, 1e-9, 1e-6, 1e-3, 1, 60, 3600, 86400, 31557600];
    for (var index=0; index<ordered.length; index++) {
      var rendered = maximum / ordered[index];
      if (rendered >= 1 && rendered < 1000) return ordered[index];
    }
    return maximum > 0 && maximum < 1e-12 ? 1e-12 : maximum > 0 ? 31557600 : 1;
  }

  function screenRangePanes(axis, draft) {
    var eligible = panes().filter(function (pane) {
      if (!paneHasSignals(pane)) return false;
      if (axis === "x" || axis === "time") return ["time", "spectrogram"].indexOf(pane.plot_type) >= 0;
      if (axis === "y" || axis === "amplitude") return pane.plot_type === "time";
      if (axis === "frequency") return ["spectrum", "spectrogram", "persistence"].indexOf(pane.plot_type) >= 0;
      if (axis === "magnitude") return ["spectrum", "persistence"].indexOf(pane.plot_type) >= 0;
      if (axis === "power") return ["spectrogram", "persistence"].indexOf(pane.plot_type) >= 0;
      return axis === "density" && pane.plot_type === "persistence";
    });
    var linked = axis === "x" || axis === "time" ? draft.linkTime : axis === "y" || axis === "amplitude" ? draft.linkAmplitude : axis === "frequency" ? draft.linkFrequency : axis === "magnitude" ? draft.linkMagnitude : false;
    if (axis === "frequency" && linked) eligible=eligible.filter(function (pane) { return ["spectrum", "persistence"].indexOf(pane.plot_type) >= 0; });
    return linked ? eligible : eligible.filter(function (pane) { return pane.id === model.activePane; });
  }

  function traceZDataRange(traces) {
    var domain=null;
    (traces || []).forEach(function (trace) {
      (Array.isArray(trace && trace.z) ? trace.z : []).forEach(function (row) {
        (Array.isArray(row) ? row : [row]).forEach(function (value) {
          value=Number(value);
          if (!Number.isFinite(value)) return;
          domain=domain ? [Math.min(domain[0], value), Math.max(domain[1], value)] : [value, value];
        });
      });
    });
    return domain;
  }

  function screenRangeDomain(axis, draft, fallback, intersection) {
    var targetPanes = screenRangePanes(axis, draft);
    if (axis === "x" || axis === "time") {
      var names = {};
      targetPanes.forEach(function (pane) { (pane.signal_bindings || []).forEach(function (name) { names[name] = true; }); });
      var maximumSeconds = (model.state.signals || []).reduce(function (maximum, signal) {
        return names[signal.name] ? Math.max(maximum, Number(signal.duration_s) || 0) : maximum;
      }, 0);
      if (!(maximumSeconds > 0)) return fallback === false ? null : [0, 1];
      var activePane=paneById(model.activePane);
      var unit = model.settingsPage === "screen" ? settings.screenValue("time.units") : activePane && activePane.plot_type === "spectrogram" ? settings.value("spectrogram.time_units") : settings.value("time.units") || "seconds";
      var factor = screenTimeUnitFactor(unit, maximumSeconds);
      return [0, maximumSeconds / factor];
    }
    var domain = null;
    targetPanes.forEach(function (pane) {
      var record = model.outputs[paneRuntimeKey(activeDisplay().id, pane.id)];
      var payload = record && record.output && plotEnvelope(record.output.data);
      var traces = Array.isArray(payload) ? payload : payload && payload.data;
      var range;
      if (axis === "frequency") range=pane.plot_type === "spectrogram" ? traceYDataRange(traces || []) : traceXDataRange(traces || []);
      else if (axis === "density" || axis === "power" && pane.plot_type === "spectrogram") range=traceZDataRange(traces || []);
      else range=traceYDataRange(traces || []);
      if (range) domain = domain ? intersection ? [Math.max(domain[0], range[0]), Math.min(domain[1], range[1])] : [Math.min(domain[0], range[0]), Math.max(domain[1], range[1])] : range;
    });
    return domain || (fallback === false ? null : [-1, 1]);
  }

  function settingsRangeDomains(draft) {
    var domains={}, axes={
      "time.x_limits":"x",
      "spectrum.frequency_limits":"frequency",
      "spectrogram.frequency_limits":"frequency",
      "persistence.frequency_limits":"frequency"
    };
    Object.keys(axes).forEach(function (fieldId) {
      var domain=screenRangeDomain(axes[fieldId], draft, false, axes[fieldId] === "frequency" && !!draft.linkFrequency);
      if (domain) domains[fieldId]=domain;
    });
    domains["persistence.density_limits"]=[0, 100];
    return domains;
  }

  function rangeBoundaryIntentKey(fieldId) {
    var display=activeDisplay(), scope=model.settingsPage === "screen" ? "screen" : "pane::" + String(model.activePane || "");
    return String(display && display.id || "") + "::" + scope + "::" + String(fieldId);
  }

  function viewportRangeKey(displayId, paneId, fieldId) {
    var scope=model.settingsPage === "screen" ? "screen" : "pane::" + String(paneId || "");
    return String(displayId || "") + "::" + scope + "::" + String(fieldId || "");
  }

  function viewportRangeValue(fieldId) {
    var display=activeDisplay(), key=viewportRangeKey(display && display.id,model.activePane,fieldId), stored=model.viewportRanges[key];
    if (stored) return {min:stored.min,max:stored.max};
    var minimum=rangeBoundaryIntent(fieldId,"min"),maximum=rangeBoundaryIntent(fieldId,"max");
    return minimum == null && maximum == null ? null : {min:minimum == null ? null : Number(minimum),max:maximum == null ? null : Number(maximum)};
  }

  function rangeBoundaryIntent(fieldId, boundary) {
    var entry=model.rangeBoundaryIntents[rangeBoundaryIntentKey(fieldId)];
    return entry && Object.prototype.hasOwnProperty.call(entry, boundary) ? entry[boundary] : null;
  }

  function rememberRangeBoundaryIntent(fieldId, boundary, value) {
    var key=rangeBoundaryIntentKey(fieldId), entry=model.rangeBoundaryIntents[key] || (model.rangeBoundaryIntents[key]={});
    if (value === null || value === undefined || String(value).trim() === "") delete entry[boundary];
    else entry[boundary]=String(value);
    if (!Object.keys(entry).length) delete model.rangeBoundaryIntents[key];
  }

  function screenRangeSlider(fieldId, axis, draft) {
    var domain = screenRangeDomain(axis, draft), current = viewportRangeValue(fieldId) || {};
    var minimumIntent=rangeBoundaryIntent(fieldId, "min"), maximumIntent=rangeBoundaryIntent(fieldId, "max");
    var minimum = current.min == null ? minimumIntent == null ? domain[0] : Number(minimumIntent) : Number(current.min);
    var maximum = current.max == null ? maximumIntent == null ? domain[1] : Number(maximumIntent) : Number(current.max);
    minimum = Math.max(domain[0], Math.min(minimum, domain[1]));
    maximum = Math.max(domain[0], Math.min(maximum, domain[1]));
    if (!(minimum < maximum)) { minimum = domain[0]; maximum = domain[1]; }
    var span = domain[1] - domain[0], step = span > 0 ? span / 1000 : 0.001;
    var left = span > 0 ? (minimum - domain[0]) / span * 100 : 0;
    var right = span > 0 ? (maximum - domain[0]) / span * 100 : 100;
    return "<div class='screen-range-slider' data-screen-range-slider='" + fieldId + "' data-full-min='" + domain[0] + "' data-full-max='" + domain[1] + "' data-testid='screen-range-slider-" + axis + "'>" +
      "<div class='screen-range-track'><span class='screen-range-selection' style='left:" + left + "%;right:" + (100-right) + "%'></span></div>" +
      "<input type='range' min='" + domain[0] + "' max='" + domain[1] + "' step='" + step + "' value='" + minimum + "' data-screen-range-input='min' aria-label='Минимум диапазона'>" +
      "<input type='range' min='" + domain[0] + "' max='" + domain[1] + "' step='" + step + "' value='" + maximum + "' data-screen-range-input='max' aria-label='Максимум диапазона'>" +
    "</div>";
  }

  function keepAutomaticRangeInputsEmpty(fieldId, axis, draft) {
    var row = q("[data-testid='settings-field-" + CSS.escape(fieldId) + "']");
    var current = viewportRangeValue(fieldId) || {};
    if (!row) return;
    var minimum = row.querySelector("[data-range-part='min']"), maximum = row.querySelector("[data-range-part='max']");
    var minimumIntent=rangeBoundaryIntent(fieldId, "min"), maximumIntent=rangeBoundaryIntent(fieldId, "max");
    if (minimum) minimum.value=current.min == null ? minimumIntent == null ? "" : minimumIntent : String(current.min);
    if (maximum) maximum.value=current.max == null ? maximumIntent == null ? "" : maximumIntent : String(current.max);
  }

  function keepVisibleAutomaticRangeInputsEmpty(draft) {
    if (!draft) return;
    keepAutomaticRangeInputsEmpty("time.x_limits", "x", draft);
    keepAutomaticRangeInputsEmpty("time.y_limits", "y", draft);
    keepAutomaticRangeInputsEmpty("spectrum.frequency_limits", "frequency", draft);
    keepAutomaticRangeInputsEmpty("spectrum.y_limits", "magnitude", draft);
  }

  function renderScreenSettings(display) {
    var content = q("[data-testid='settings-content']");
    if (!content) return;
    var draft = screenDraftFor(display);
    if (typeof settings.setRangeDomains === "function") settings.setRangeDomains(settingsRangeDomains(draft));
    if (typeof settings.setBusy === "function") settings.setBusy(model.settingsPublishing || model.screenApplying);
    previewScreenLinks(draft);
    settings.beginCustomRender();
    if (typeof settings.setExtraVisible === "function") settings.setExtraVisible(["display.name"]);
    if (typeof settings.setExtraItems === "function") settings.setExtraItems([{
      id:"display.name", kind:"text", label:"Имя экрана", value:displayPreviewName(display),
      enabled:true, visible:true, effect_status:"requires_apply"
    }]);
    var layoutFields = "<div class='screen-layout-options'>" +
      "<fieldset class='screen-layout-axis' data-testid='screen-layout-rows'><legend>Строки</legend>" + screenLayoutSegments("rows", draft.rows, "Количество строк") + "</fieldset>" +
      "<fieldset class='screen-layout-axis' data-testid='screen-layout-columns'><legend>Столбцы</legend>" + screenLayoutSegments("columns", draft.columns, "Количество столбцов") + "</fieldset>" +
    "</div>";
    var linkFields = "<div class='settings-field-row' data-testid='screen-link-time-row'><label class='settings-label' for='screen-link-time'>Связать время</label><div class='settings-control-wrap'><span class='checkbox-control'><input id='screen-link-time' type='checkbox' data-screen-link-time data-testid='screen-link-time'" + (draft.linkTime ? " checked" : "") + (draft.linksReady ? "" : " disabled") + "></span></div></div>" +
      "<div class='settings-field-row' data-testid='screen-link-amplitude-row'><label class='settings-label' for='screen-link-amplitude'>Связать амплитуду</label><div class='settings-control-wrap'><span class='checkbox-control'><input id='screen-link-amplitude' type='checkbox' data-screen-link-amplitude data-testid='screen-link-amplitude'" + (draft.linkAmplitude ? " checked" : "") + (draft.linksReady ? "" : " disabled") + "></span></div></div>" +
      "<div class='settings-field-row'><label class='settings-label' for='screen-link-frequency'>Связать частоты</label><div class='settings-control-wrap'><span class='checkbox-control'><input id='screen-link-frequency' type='checkbox' data-screen-link-frequency" + (draft.linkFrequency ? " checked" : "") + (draft.linksReady ? "" : " disabled") + "></span></div></div>" +
      "<div class='settings-field-row'><label class='settings-label' for='screen-link-magnitude'>Связать магнитуды</label><div class='settings-control-wrap'><span class='checkbox-control'><input id='screen-link-magnitude' type='checkbox' data-screen-link-magnitude" + (draft.linkMagnitude ? " checked" : "") + (draft.linksReady ? "" : " disabled") + "></span></div></div>";
    var parameterRows=(draft.linkTime ? settings.renderRows(["time.units"]) : "") + (draft.linkFrequency ? settings.renderRows(["spectrum.frequency_units"]) : "");
    var rangeRows=draft.linkTime ? settings.renderRows(["time.x_limits"]) + screenRangeSlider("time.x_limits", "x", draft) : "";
    if (draft.linkAmplitude) rangeRows += settings.renderRows(["time.y_limits"]) + screenRangeSlider("time.y_limits", "y", draft);
    if (draft.linkFrequency) rangeRows += settings.renderRows(["spectrum.frequency_limits"]) + screenRangeSlider("spectrum.frequency_limits", "frequency", draft);
    if (draft.linkMagnitude) rangeRows += settings.renderRows(["spectrum.y_limits"]) + screenRangeSlider("spectrum.y_limits", "magnitude", draft);
    var rangeGroups=(parameterRows ? screenSettingsGroup("parameters", "Параметры", parameterRows) : "") + (rangeRows ? screenSettingsGroup("ranges", "Диапазоны", rangeRows) : "");
    content.innerHTML = "<div class='screen-settings' data-testid='screen-settings'>" + screenSettingsGroup("screen-name", "Основное", settings.renderRows(["display.name"])) + screenSettingsGroup("layout", "Макет", layoutFields) + screenSettingsGroup("links", "Связь областей", linkFields) + rangeGroups + "</div>";
    keepVisibleAutomaticRangeInputsEmpty(draft);
    valueSelect.reconcile();
    decorateNoHistory(content);
  }

  function reconcileContextTabs(pane) {
    if (extremaTabsAvailable(pane)) return false;
    var wasPeaksActive = peaksSurfaceActive(), changed = false;
    if (model.settingsPage === "peaks") { model.settingsPage = "display"; changed = true; }
    if (model.inspectorPage === "peaks") { model.inspectorPage = "signals"; changed = true; }
    if (model.extremaTargetKey) { model.extremaTargetKey = null; changed = true; }
    if (wasPeaksActive) stopPeaksPolling("");
    return changed;
  }

  function renderSettings(display) {
    if (rangeLifecycleCurrentActive()) {
      restoreRangeLifecycleScroll();
      renderApply();
      return;
    }
    if (activeSignalNameEditor()) {
      renderApply();
      return;
    }
    if (typeof settings.activeNameEditor === "function" && settings.activeNameEditor()) {
      renderApply();
      return;
    }
    var pane = paneById(model.activePane);
    ensureSignalSettingsTab();
    reconcileContextTabs(pane);
    var context = q("[data-settings-context]");
    if (context) context.textContent = displayPreviewName(display) + " · " + panePreviewName(display.id, pane);
    qa("[data-settings-page]").forEach(function (button) { var available = contextTabAvailable(button.dataset.settingsPage, pane), active = available && button.dataset.settingsPage === model.settingsPage; button.hidden = !available; button.setAttribute("aria-hidden", String(!available)); button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1; });
    var content = q("[data-testid='settings-content']");
    if (content) content.setAttribute("aria-labelledby", "settings-tab-" + model.settingsPage);
    settings.setContext(display.id, model.revision);
    if (typeof settings.setExtraVisible === "function") settings.setExtraVisible([]);
    if (typeof settings.setExtraItems === "function") settings.setExtraItems([]);
    if (model.settingsPage === "signal") {
      renderSignalSettings(pane);
      renderApply();
      return;
    }
    if (model.settingsPage === "peaks") {
      renderPeaksSettings(display, pane, model.peaksRecords[peaksSettingsKey(display, pane)]);
      renderApply();
      return;
    }
    if (model.settingsPage === "screen") {
      settings.setView("screen", (pane && pane.plot_type) || "time");
      renderScreenSettings(display);
      renderApply();
      return;
    }
    settings.setView(model.settingsPage, (pane && pane.plot_type) || "time");
    if (typeof settings.setRangeDomains === "function") settings.setRangeDomains(settingsRangeDomains(screenDraftFor(display)));
    if (typeof settings.setBusy === "function") settings.setBusy(model.settingsPublishing || model.screenApplying);
    settings.render();
    if (model.settingsPage === "display") injectAreaRangeSliderSettings(display, pane);
    keepVisibleAutomaticRangeInputsEmpty(screenDraftFor(display));
    renderApply();
  }

  function renderApply() {
    var footer = q("[data-testid='settings-footer']");
    var status = q("[data-settings-status]");
    var values = q("[data-testid='extrema-values']");
    var signalValues = q("[data-testid='signal-values-action']");
    if (!footer || !status || !values) return;
    var regression=task0153Controller();
    if (regression && typeof regression.decorateFooter === "function") regression.decorateFooter(footer);
    footer.hidden = model.settingsPage !== "peaks" && model.settingsPage !== "signal";
    if (model.settingsPage === "signal") {
      values.hidden = true;
      if (signalValues) { signalValues.hidden = false; signalValues.disabled = !mainSignalForPane(paneById(model.activePane)); }
      footer.removeAttribute("aria-busy");
      footer.dataset.applyState = "pristine";
      status.classList.add("visually-hidden");
      return;
    }
    if (signalValues) signalValues.hidden = true;
    if (model.settingsPage === "peaks") return renderPeaksApply(footer, values, status);
    values.hidden = true;
    footer.removeAttribute("aria-busy");
    footer.dataset.applyState = "pristine";
    status.classList.add("visually-hidden");
  }

  function syncApplyLoader(button, footer, phase, episodeKey) {
    var applying = phase === "applying", pending = phase === "pending";
    if (applying) button.classList.add("is-applying");
    if (pending) button.classList.add("is-pending");
    if (!applying) button.classList.remove("is-applying");
    if (!pending) button.classList.remove("is-pending");
    if (applying || pending) {
      var key = episodeKey || "settings::pending";
      footer.dataset.loaderEpisodeKey = key;
      button.dataset.loaderEpisodeKey = key;
      button.setAttribute("aria-busy", "true");
    } else {
      delete footer.dataset.loaderEpisodeKey;
      delete button.dataset.loaderEpisodeKey;
      button.removeAttribute("aria-busy");
    }
  }

  function renderInspector() {
    var body = q("[data-inspector-content]");
    if (!body) return;
    var pane = paneById(model.activePane);
    if (model.inspectorPage !== "samples" && typeof closeSampleColumnsMenu === "function") closeSampleColumnsMenu(false);
    /* The samples tab follows main_signal, not the Values button and not the
       pane visibility checkbox. */
    if (typeof syncSignalSamplesWithMain === "function") syncSignalSamplesWithMain();
    reconcileContextTabs(pane);
    qa("[data-bottom-tab]").forEach(function (tab) { var available = contextTabAvailable(tab.dataset.bottomTab, pane), active = available && tab.dataset.bottomTab === model.inspectorPage; tab.hidden = !available; tab.setAttribute("aria-hidden", String(!available)); tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; });
    renderInspectorExtremaAction(pane);
    body.setAttribute("aria-labelledby", model.inspectorPage === "signals" ? "signals-tab" : model.inspectorPage === "measurements" ? "measurements-tab" : model.inspectorPage === "samples" ? "inspector-tab-samples" : "peaks-tab");
    body.dataset.testid = "inspector-pane-" + model.inspectorPage;
    body.classList.toggle("is-table-only", model.inspectorPage === "peaks");
    if (model.inspectorPage === "samples") return void renderSignalSamplesInspector(body);
    if (model.inspectorPage === "measurements") return void renderMeasurementsInspector(body);
    if (model.inspectorPage === "peaks") return void renderPeaksInspector(body);
    var addLayer = q("[data-testid='signal-add-layer']");
    var signalSearchInput = body.querySelector("[data-testid='signal-search-input']");
    if (!signalSearchInput || !body.querySelector("[data-signal-rows]") || !body.querySelector("[data-table-head]")) {
      body.innerHTML = "<div class='inspector-search-row'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='search' data-testid='signal-search-input' aria-label='Поиск сигналов' placeholder='Введите название' value='" + esc(model.inspectorSearch) + "'></div><div class='inspector-actions' aria-label='Действия с сигналами'><button class='inspector-action' type='button' data-testid='signals-add-action' data-tooltip='Добавить сигнал' aria-label='Добавить сигнал' aria-haspopup='dialog' aria-controls='signal-add-dialog' aria-expanded='" + String(!!addLayer && !addLayer.hidden) + "'><img src='./icons/plus.svg' alt=''></button><button class='inspector-action' type='button' data-testid='signal-columns-menu-trigger' data-tooltip='Другие действия' aria-label='Другие действия' aria-haspopup='menu' aria-expanded='false'><img src='./icons/more-vertical.svg' alt=''></button></div></div><div class='signal-table-scroll'><table id='signal-table' class='signal-table'><thead><tr data-table-head></tr></thead><tbody data-testid='signal-rows' data-signal-rows></tbody></table><div class='table-empty' role='status' data-testid='signal-search-empty' hidden>Сигналы не найдены</div></div>";
      signalSearchInput = body.querySelector("[data-testid='signal-search-input']");
    } else if (document.activeElement !== signalSearchInput && signalSearchInput.value !== model.inspectorSearch) {
      signalSearchInput.value = model.inspectorSearch;
    }
    var addTrigger = body.querySelector("[data-testid='signals-add-action']");
    if (addTrigger) addTrigger.setAttribute("aria-expanded", String(!!addLayer && !addLayer.hidden));
    var rows = q("[data-testid='signal-rows']"), head = q("[data-table-head]");
    if (!rows || !head) return;
    var search = model.inspectorSearch;
    var activePane = paneById(model.activePane);
    var bindings = activePane && Array.isArray(activePane.signal_bindings) ? activePane.signal_bindings : [];
    var signals = (model.state.signals || []).filter(function (signal) { return !search || String(signal.name).toLowerCase().indexOf(search.toLowerCase()) >= 0; });
    var columns = [{ id:"color", label:"Цвет" }, { id:"sample_rate", label:"Частота дискретизации" }, { id:"sample_count", label:"Отсчёты" }, { id:"duration", label:"Длительность" }, { id:"data_type", label:"Тип" }].filter(function (column) { return model.visibleColumns[column.id]; });
    var renderedColumns = [{ id:"name", label:"Имя" }].concat(columns);
    var signalNames = (model.state.signals || []).map(function (signal) { return signal.name; });
    var everySignalVisible = signalNames.length > 0 && signalNames.every(function (name) { return bindings.indexOf(name) >= 0; });
    head.innerHTML = "<th><input class='ui-checkbox' type='checkbox' data-visible-all-signals aria-label='Показывать все сигналы в активной области'" + (everySignalVisible ? " checked" : "") + "></th>" + renderedColumns.map(function (column) { return "<th>" + column.label + "</th>"; }).join("");
    /* Legacy snapshot fallback keeps this renderer independently executable;
       current snapshots replace it with the pane-local authoritative source. */
    var selectedSignal = model.state && (model.state.row_selected_signal || model.state.selected_signal || model.state.analysis_signal);
    var mainSignal = signals.filter(function (signal) {
      return selectedSignal && (signal.name === selectedSignal || signal.id === selectedSignal);
    })[0] || null;
    if (typeof mainSignalForPane === "function") mainSignal=mainSignalForPane(activePane);
    rows.innerHTML = signals.map(function (signal) {
      var values = { name:esc(signal.name), color:"<span class='color-swatch' data-testid='signal-color-" + esc(signal.name) + "' style='--swatch:" + esc(signalColor(signal)) + "' aria-label='Цвет " + esc(signal.name) + "'></span>", sample_rate:esc(signal.sample_rate_hz == null ? "—" : signal.sample_rate_hz), sample_count:esc(signal.sample_count == null ? "—" : signal.sample_count), duration:esc(signal.duration_s == null ? "—" : signal.duration_s), data_type:esc(signal.data_type || "—") };
      var selected = bindings.indexOf(signal.name) >= 0;
      var main = !!mainSignal && mainSignal.name === signal.name;
      var signalId = typeof signal.id === "string" && signal.id.trim() ? signal.id : null;
      var actions = "<span class='signal-row-actions" + (model.pendingMainSignal === signal.name ? " is-pinned" : "") + "'><button type='button' class='signal-row-action' data-signal-duplicate='" + esc(signal.name) + "' data-testid='signal-duplicate-" + esc(signal.name) + "' aria-label='Копировать " + esc(signal.name) + "'><img src='./icons/copy.svg' alt=''></button><button type='button' class='signal-row-action'" + (signalId ? " data-signal-operation='" + esc(signalId) + "'" : " disabled") + " data-testid='signal-operation-" + esc(signal.name) + "' aria-label='Операция над " + esc(signal.name) + "'><img src='./icons/function.svg' alt=''></button><button type='button' class='signal-row-action is-danger' data-signal-delete='" + esc(signal.name) + "' data-testid='signal-delete-" + esc(signal.name) + "' aria-label='Удалить " + esc(signal.name) + "'><img src='./icons/trash.svg' alt=''></button></span>";
      var cells = renderedColumns.map(function (column, index) {
        var last = index === renderedColumns.length - 1;
        var classes = (column.id === "color" ? "color-cell " : "") + (last ? "is-actions-host" : "");
        return "<td class='" + classes.trim() + "'><span class='signal-cell-value'>" + values[column.id] + "</span>" + (last ? actions : "") + "</td>";
      }).join("");
      return "<tr data-testid='signal-row-" + esc(signal.name) + "' data-signal-row data-signal-name='" + esc(signal.name) + "'" + (main ? " data-main-signal='true' class='is-main-signal'" : "") + "><td><input class='ui-checkbox' type='checkbox' data-visible-signal='" + esc(signal.name) + "' aria-label='Показывать " + esc(signal.name) + " в активной области'" + (selected ? " checked" : "") + "></td>" + cells + "</tr>";
    }).join("");
    var toggleAll = q("[data-visible-all-signals]");
    if (toggleAll) toggleAll.indeterminate = !everySignalVisible && bindings.length > 0;
    q("[data-testid='signal-search-empty']").hidden = signals.length > 0;
    setSignalTableMutationBusy(model.signalMembershipBusy || !!model.pendingMainSignal, model.pendingMainSignal);
    decorateNoHistory(body);
  }

  function measurementValue(item, key) {
    if (!item || item[key] === null || item[key] === undefined) return "—";
    var value = item[key];
    return typeof value === "number" ? String(Number(value.toPrecision(8))) : String(value);
  }

  function renderMeasurementsInspector(body) {
    var display = activeDisplay(), pane = paneById(model.activePane), record = model.measurementsRecord;
    var current = record && display && pane && record.displayId === display.id && record.paneId === pane.id;
    var menu = q("[data-testid='measurement-columns-menu']"), menuOpen = !!menu && !menu.hidden;
    var measurementSearchInput = body.querySelector("[data-testid='measurement-search-input']");
    var host = body.querySelector("[data-testid='measurement-table-scroll']");
    if (!measurementSearchInput || !host) {
      body.innerHTML = "<div class='inspector-search-row'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='search' data-testid='measurement-search-input' aria-label='Поиск измерений' placeholder='Введите название' value='" + esc(model.measurementSearch) + "'></div><div class='inspector-actions' aria-label='Действия с измерениями'><button class='inspector-action' type='button' data-testid='measurement-columns-menu-trigger' data-tooltip='Выбрать измерения' aria-label='Выбрать отображаемые измерения' aria-haspopup='menu' aria-expanded='" + String(menuOpen) + "'><img src='./icons/more-vertical.svg' alt=''></button></div></div><div class='signal-table-scroll measurement-table-scroll' data-testid='measurement-table-scroll'></div>";
      measurementSearchInput = body.querySelector("[data-testid='measurement-search-input']");
      host = body.querySelector("[data-testid='measurement-table-scroll']");
    } else if (document.activeElement !== measurementSearchInput && measurementSearchInput.value !== model.measurementSearch) {
      measurementSearchInput.value = model.measurementSearch;
    }
    var menuTrigger = body.querySelector("[data-testid='measurement-columns-menu-trigger']");
    if (menuTrigger) menuTrigger.setAttribute("aria-expanded", String(menuOpen));
    if (!current) { host.innerHTML = "<div class='inspector-empty' role='status'>Загрузка измерений…</div>"; return; }
    if (record.error) { host.innerHTML = "<div class='inspector-empty' data-testid='peaks-error' role='alert'>" + esc(record.error) + "</div>"; return; }
    var query = model.measurementSearch.trim().toLowerCase();
    var measurementRows = Array.isArray(record.measurementRows) ? record.measurementRows : (record.measurements ? [record.measurements] : []);
    var visibleRows = measurementRows.filter(function (measurements) {
      var signalName = measurements && measurements.signal_name || "";
      return !!signalName && (!query || String(signalName).toLowerCase().indexOf(query) >= 0);
    });
    var columns = [
      { id:"name", label:"Имя", width:120 },
      { id:"line", label:"Цвет", width:48, className:"measurement-line-cell" },
      { id:"roi_min", label:"Начало области", width:96 },
      { id:"roi_max", label:"Конец области", width:96 }
    ];
    var measurementColumns = {
      minimum:[{ id:"minimum_value", kind:"minimum", itemKey:"value", label:"Минимум", width:80 }, { id:"minimum_time", kind:"minimum", itemKey:"time_s", label:"Время минимума", width:112 }],
      maximum:[{ id:"maximum_value", kind:"maximum", itemKey:"value", label:"Максимум", width:88 }, { id:"maximum_time", kind:"maximum", itemKey:"time_s", label:"Время максимума", width:112 }],
      mean:[{ id:"mean", kind:"mean", itemKey:"value", label:"Среднее", width:80 }],
      median:[{ id:"median", kind:"median", itemKey:"value", label:"Медиана", width:80 }],
      peak_to_peak:[{ id:"peak_to_peak", kind:"peak_to_peak", itemKey:"value", label:"Размах", width:72 }],
      rms:[{ id:"rms", kind:"rms", itemKey:"value", label:"СКЗ", width:56 }]
    };
    var selectedKinds = Array.isArray(display.measurement_kinds) ? display.measurement_kinds : [];
    ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"].forEach(function (kind) {
      if (selectedKinds.indexOf(kind) >= 0) columns = columns.concat(measurementColumns[kind]);
    });
    var runtimeKey=paneRuntimeKey(display.id,pane.id), cursorSnapshot=model.measurementCursorSnapshotByPane[runtimeKey] || null;
    var cursorColumnsController=measurementCursorColumnsController(), cursorColumnsHelper=measurementCursorColumnsHelper();
    var cursorColumnState=cursorColumnsController && cursorColumnsHelper ? cursorColumnsController.reconcile(runtimeKey,cursorSnapshot,pane.plot_type) : null;
    if (cursorColumnState) columns=columns.concat(cursorColumnsHelper.headerColumns(cursorSnapshot,pane.plot_type,cursorColumnState.visible).map(function (column) {
      return {id:column.id,label:column.headerLabel,width:column.width,className:"measurement-cursor-cell",cursor:true};
    }));
    var tableWidth = columns.reduce(function (total, column) { return total + column.width; }, 0);
    var colgroup = "<colgroup>" + columns.map(function (column) { return "<col style='width:" + column.width + "px'>"; }).join("") + "</colgroup>";
    var headers = columns.map(function (column) { return "<th" + (column.className ? " class='" + column.className + "'" : "") + ">" + column.label + "</th>"; }).join("");
    var rows = visibleRows.map(function (measurements) {
      var signalName = measurements.signal_name || "";
      var items = {};
      (measurements.items || []).forEach(function (item) { items[item.id] = item; });
      var signal = (model.state.signals || []).filter(function (candidate) { return candidate.name === signalName; })[0] || {};
      var limits = measurements.time_limits || display.time_limits || {};
      var cursorValues=cursorColumnState ? cursorColumnsHelper.rowProjection(measurements,cursorSnapshot,pane.plot_type,cursorColumnState.visible) : {};
      var cells = columns.map(function (column) {
        var value = "—";
        if (column.id === "name") value = "<span class='signal-cell-value'>" + esc(signalName) + "</span>";
        else if (column.id === "line") value = "<span class='color-swatch measurement-color-swatch' style='--swatch:" + esc(signalColor(signal)) + "' aria-label='Цвет " + esc(signalName) + "'></span>";
        else if (column.id === "roi_min") value = esc(measurementValue({ value:limits.min_s }, "value"));
        else if (column.id === "roi_max") value = esc(measurementValue({ value:limits.max_s }, "value"));
        else if (column.cursor) value = "<span data-measurement-cursor-value='" + esc(column.id) + "'>" + esc(cursorValues[column.id] && cursorValues[column.id].text || "—") + "</span>";
        else value = esc(measurementValue(items[column.kind], column.itemKey));
        return "<td" + (column.className ? " class='" + column.className + "'" : "") + ">" + value + "</td>";
      }).join("");
      return "<tr data-testid='measurement-row-" + esc(signalName) + "'" + (measurements.error ? " class='has-measurement-error' title='" + esc(measurements.error) + "'" : "") + ">" + cells + "</tr>";
    }).join("");
    host.innerHTML = "<table class='signal-table measurement-table' data-testid='measurement-table' style='--measurement-table-width:" + tableWidth + "px'>" + colgroup + "<thead><tr>" + headers + "</tr></thead><tbody>" + rows + "</tbody></table><div class='table-empty' data-testid='measurement-search-empty' role='status'" + (visibleRows.length ? " hidden" : "") + ">" + (measurementRows.length ? "Измерения не найдены" : "Для активной области нет рассчитанных измерений") + "</div>";
  }

  function loadMeasurements() {
    if (model.inspectorPage !== "measurements") return Promise.resolve();
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane) return Promise.resolve();
    var displayId = display.id, paneId = pane.id, token = ++model.measurementsToken;
    model.measurementsRecord = null;
    renderInspector();
    return api.getFullState().then(function (snapshot) {
      if (token !== model.measurementsToken || model.inspectorPage !== "measurements" || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return;
      model.measurementsRecord = { displayId:displayId, paneId:paneId, revision:stateRevision(snapshot), measurements:snapshot.measurements || null, measurementRows:Array.isArray(snapshot.measurement_rows) ? snapshot.measurement_rows : (snapshot.measurements ? [snapshot.measurements] : []), error:null };
      renderInspector();
    }).catch(function (error) {
      if (token !== model.measurementsToken || model.inspectorPage !== "measurements") return;
      model.measurementsRecord = { displayId:displayId, paneId:paneId, error:safeErrorText(error, "Не удалось загрузить измерения.") };
      renderInspector();
    });
  }

  function extremaActionState(record) {
    if (record && record.pending) return "pending";
    if (record && record.error) return "error";
    if (record && record.calculated) {
      var rows=record.data && Array.isArray(record.data.rows) ? record.data.rows : [];
      return rows.length ? "ready" : "empty";
    }
    return "idle";
  }

  function extremaActionView(record) {
    var helper=extremaActionController(), state=extremaActionState(record);
    return helper && typeof helper.presentation === "function" ? helper.presentation(state) : {
      state:state,
      label:state === "pending" ? "Рассчитывается…" : state === "error" ? "Рассчитать ещё раз" : state === "ready" || state === "empty" ? "Пересчитать" : "Рассчитать",
      tooltip:state === "pending" ? "Расчёт экстремумов выполняется" : state === "error" ? "Повторить расчёт экстремумов" : state === "ready" || state === "empty" ? "Пересчитать для актуальных диапазонов" : "Рассчитать экстремумы",
      disabled:state === "pending",
      busy:state === "pending"
    };
  }

  var inspectorExtremaActionMarkup = `<button class="button button-primary inspector-extrema-action" type="button"
        data-extrema-action data-testid="extrema-header-action"
        data-extrema-action-state="idle" aria-busy="false"
        title="Рассчитать экстремумы" aria-label="Рассчитать экстремумы" hidden>Рассчитать</button>`;

  function ensureInspectorExtremaAction() {
    var button=q("[data-testid='extrema-header-action']");
    if (button) return button;
    var controls=q("[data-testid='inspector-state-controls']");
    if (!controls || !controls.parentNode) return null;
    controls.insertAdjacentHTML("beforebegin",inspectorExtremaActionMarkup);
    return q("[data-testid='extrema-header-action']");
  }

  function renderInspectorExtremaAction(pane) {
    var button=ensureInspectorExtremaAction();
    if (!button) return;
    var visible=model.inspectorPage === "peaks" && extremaTabsAvailable(pane);
    button.hidden=!visible;
    if (!visible) return;
    var display=activeDisplay(), record=display && pane && model.peaksRecords[paneRuntimeKey(display.id,pane.id)];
    var helper=extremaActionController(), state=extremaActionState(record), view=helper && typeof helper.project === "function" ? helper.project(button,state) : extremaActionView(record);
    if (!helper || typeof helper.project !== "function") {
      button.textContent=view.label;
      button.disabled=view.disabled;
      button.dataset.extremaActionState=view.state;
      button.setAttribute("aria-busy",String(view.busy));
      button.setAttribute("title",view.tooltip);
      button.setAttribute("aria-label",view.tooltip);
    }
  }

  function renderPeaksInspector(body) {
    var display = activeDisplay(), pane = paneById(model.activePane), record = display && pane && model.peaksRecords[paneRuntimeKey(display.id, pane.id)];
    var current = record && display && pane && record.displayId === display.id && record.paneId === pane.id;
    var host = body.querySelector("[data-testid='peaks-table-scroll']");
    if (!host || host.parentElement !== body) {
      body.innerHTML = "<div class='signal-table-scroll peaks-table-scroll' data-testid='peaks-table-scroll'></div>";
      host = body.querySelector("[data-testid='peaks-table-scroll']");
    }
    if (pane && !paneHasSignals(pane)) { host.innerHTML = "<div class='peaks-state' data-testid='peaks-no-signals' data-extrema-state='no-signals' role='status'><strong>Выберите сигнал для отображения</strong></div>"; return; }
    if (!extremaTabsAvailable(pane)) { host.innerHTML = "<div class='inspector-empty' role='status'>Экстремумы доступны для временной области и спектра</div>"; return; }
    if (!current || (!record.pending && !record.error && !record.calculated)) {
      var paneName = panePreviewName(display.id, pane);
      host.innerHTML = "<div class='peaks-state peaks-start' data-testid='extrema-start' data-extrema-state='start' role='status'><strong>Рассчитать экстремумы для области " + esc(paneName) + "</strong><div class='peaks-start-actions'><button class='button' type='button' data-testid='extrema-configure'>Настроить рассчет</button></div></div>";
      return;
    }
    if (record.pending) {
      var episodeKey = record.loading_episode || ("extrema::" + paneRuntimeKey(display.id, pane.id) + "::" + String(record.context_key == null ? "awaiting" : record.context_key) + "::" + String(record.calculation_revision == null ? "awaiting" : record.calculation_revision));
      var loading = host.firstElementChild;
      if (loading && loading.dataset.extremaState === "loading" && loading.dataset.loaderEpisodeKey === episodeKey) return;
      host.innerHTML = "<div class='peaks-state peaks-loading' data-testid='peaks-loader' data-extrema-state='loading' data-loader-episode-key='" + esc(episodeKey) + "' role='status' aria-live='polite'><span class='spinner' data-loader-spinner data-loader-episode-key='" + esc(episodeKey) + "' aria-hidden='true'></span><strong>Расчёт экстремумов…</strong></div>";
      return;
    }
    if (record.error) { host.innerHTML = "<div class='peaks-state peaks-error' data-testid='peaks-error' data-extrema-state='error' role='alert'><strong>Не удалось рассчитать экстремумы</strong><p>" + esc(record.error) + "</p></div>"; return; }
    var data = record.data || {}, rows = Array.isArray(data.rows) ? data.rows : [];
    if (!rows.length) { host.innerHTML = "<div class='peaks-state' data-testid='peaks-empty' data-extrema-state='empty' role='status'><strong>Экстремумы не найдены</strong><p>Для активной области нет значений, соответствующих настройкам.</p></div>"; return; }
    var spectrum = pane.plot_type === "spectrum";
    var colgroup = "<colgroup><col style='width:4.8%'><col style='width:28.4%'><col style='width:9.1%'><col style='width:12.3%'><col style='width:12.5%'><col style='width:12.5%'><col style='width:20.4%'></colgroup>";
    host.innerHTML = "<table class='signal-table peaks-table' data-testid='peaks-table' data-extrema-table='true'>" + colgroup + "<thead><tr><th>№</th><th>Сигнал</th><th>Цвет</th><th>Тип</th><th>" + (spectrum ? "Магнитуда" : "Значение") + "</th><th>" + (spectrum ? "Частота" : "Время") + "</th><th>Метка на графике</th></tr></thead><tbody>" + rows.map(function (row, index) {
      var type = row.type === "minimum" ? "minimum" : "maximum", typeLabel = type === "minimum" ? "Минимум" : "Максимум";
      var number = row.graph_number == null ? "" : row.graph_number;
      var coordinate = spectrum ? (row.frequency == null ? row.frequency_hz : row.frequency) : (row.time == null ? row.time_s : row.time);
      var rowSignal=(model.state.signals || []).filter(function (signal) { return signalNameMatches(signal, row.signal_name); })[0];
      var rowColor=row.signal_color || signalColor(rowSignal);
      return "<tr data-testid='extrema-row-" + esc(row.row_number == null ? index + 1 : row.row_number) + "'><td>" + esc(row.row_number == null ? index + 1 : row.row_number) + "</td><td>" + esc(row.signal_name || "") + "</td><td class='color-cell'><span class='peaks-color-swatch' style='--swatch:" + esc(rowColor) + "' aria-label='Цвет " + esc(row.signal_name || "") + "'></span></td><td data-testid='extrema-type-" + esc(row.row_number == null ? index + 1 : row.row_number) + "'>" + typeLabel + "</td><td>" + esc(measurementValue(row, "value")) + "</td><td>" + esc(coordinate == null ? "—" : coordinate) + "</td><td><span class='extrema-table-marker is-" + type + "' style='--marker-color:" + esc(rowColor) + "' data-marker-symbol='" + (type === "minimum" ? "triangle-down" : "triangle-up") + "' aria-label='" + typeLabel + ", метка " + esc(number) + "'><i aria-hidden='true'></i><b>" + esc(number) + "</b></span></td></tr>";
    }).join("") + "</tbody></table>";
  }

  function peaksSettingsKey(display, pane) { return display && pane ? paneRuntimeKey(display.id, pane.id) : ""; }
  function defaultPeaksSettings(settings) { return Object.assign({ mode:"maxima", number_of_peaks:5, maximum_cutoff:null, minimum_cutoff:null, minimum_distance_samples:1, threshold:0 }, settings || {}); }
  function activePeaksSettings(pane, record) {
    var responseSettings = record && record.data && record.data.settings;
    return defaultPeaksSettings(responseSettings || (pane && pane.peaks_settings));
  }
  function extremaModeLabel(mode) { return mode === "minima" ? "Минимумы" : mode === "all" ? "Все экстремумы" : "Максимумы"; }
  function activeExtremaHasComplexSignal(pane, record) {
    var bindings = pane && Array.isArray(pane.signal_bindings) ? pane.signal_bindings : [];
    var extremaSignals = record && record.data && Array.isArray(record.data.signals) ? record.data.signals : [];
    if (extremaSignals.some(function (signal) { return signal.ordinate === "magnitude"; })) return true;
    return (model.state && model.state.signals || []).some(function (signal) { return bindings.indexOf(signal.name) >= 0 && signal.data_type === "Комплексный"; });
  }
  function createPeaksDraft(display, pane, settings) {
    var source = defaultPeaksSettings(settings);
    return { key:peaksSettingsKey(display, pane), source:source, values:{ mode:source.mode, number_of_peaks:String(source.number_of_peaks), maximum_cutoff:source.maximum_cutoff == null ? "-Inf" : String(source.maximum_cutoff), minimum_cutoff:source.minimum_cutoff == null ? "Inf" : String(source.minimum_cutoff), minimum_distance_samples:String(source.minimum_distance_samples), threshold:String(source.threshold) }, invalid:{}, intent:0 };
  }
  function parsePeaksSettings(draft) {
    var raw = draft.values, settings = {}, invalid = {};
    var count = numeric.parse(raw.number_of_peaks, "integer"), distance = numeric.parse(raw.minimum_distance_samples, "integer"), threshold = numeric.parse(raw.threshold, "decimal");
    var maximumCutoff = numeric.parse(raw.maximum_cutoff, "decimal", { tokens:{ "":null, "-Inf":null } });
    var minimumCutoff = numeric.parse(raw.minimum_cutoff, "decimal", { tokens:{ "":null, "Inf":null } });
    if (["maxima", "minima", "all"].indexOf(raw.mode) < 0) invalid.mode = "Выберите режим расчёта."; else settings.mode = raw.mode;
    if (!count.valid || count.value < 1 || count.value > 1000) invalid.number_of_peaks = count.valid ? "Введите целое число от 1 до 1000." : count.error; else settings.number_of_peaks = count.value;
    var maximumActive = raw.mode === "maxima" || raw.mode === "all", minimumActive = raw.mode === "minima" || raw.mode === "all";
    if (!maximumCutoff.valid) {
      if (maximumActive) invalid.maximum_cutoff = maximumCutoff.error;
      settings.maximum_cutoff = draft.source.maximum_cutoff;
    } else settings.maximum_cutoff = maximumCutoff.value;
    if (!minimumCutoff.valid) {
      if (minimumActive) invalid.minimum_cutoff = minimumCutoff.error;
      settings.minimum_cutoff = draft.source.minimum_cutoff;
    } else settings.minimum_cutoff = minimumCutoff.value;
    if (!distance.valid || distance.value < 1) invalid.minimum_distance_samples = distance.valid ? "Введите целое число не меньше 1." : distance.error; else settings.minimum_distance_samples = distance.value;
    if (!threshold.valid) invalid.threshold = threshold.error;
    else if (threshold.value < 0) invalid.threshold = "Введите число не меньше 0.";
    else settings.threshold = threshold.value;
    draft.invalid = invalid;
    return Object.keys(invalid).length ? null : settings;
  }
  function peaksSettingsDirty(draft, settings) { return !!draft && JSON.stringify(settings) !== JSON.stringify(draft.source); }
  function renderPeaksSettings(display, pane, record, restoreFocus) {
    var host = q("[data-testid='settings-content']");
    if (!host) return;
    if (!display || !extremaTabsAvailable(pane)) { host.innerHTML = "<div class='inspector-empty' role='status'>Настройки доступны для временной области и спектра</div>"; valueSelect.reconcile(); return; }
    var settings = activePeaksSettings(pane, record);
    var key = peaksSettingsKey(display, pane);
    if (!model.peaksDraft || model.peaksDraft.key !== key) model.peaksDraft = createPeaksDraft(display, pane, settings);
    var draft = model.peaksDraft, parsed = parsePeaksSettings(draft), disabled = "", labels = [["number_of_peaks", "Количество экстремумов, всего"]];
    if (draft.values.mode !== "minima") labels.push(["maximum_cutoff", "Отсечка максимума"]);
    if (draft.values.mode !== "maxima") labels.push(["minimum_cutoff", "Отсечка минимума"]);
    labels.push(["minimum_distance_samples", "Минимальное расстояние, отсчёты", ""], ["threshold", "Порог", ""]);
    var modeError = draft.invalid.mode;
    var complexSignal = activeExtremaHasComplexSignal(pane, record);
    var modeSelectKey="extrema::" + display.id + "::" + pane.id + "::mode";
    var modeSelector=valueSelect.markup({
      key:modeSelectKey,
      value:draft.values.mode,
      label:extremaModeLabel(draft.values.mode),
      options:[{ value:"maxima", label:"Максимумы" }, { value:"minima", label:"Минимумы" }, { value:"all", label:"Все экстремумы" }],
      disabled:!!model.peaksApplying,
      className:"extrema-mode-trigger",
      testId:"extrema-mode-trigger",
      ariaLabel:"Режим расчёта",
      onSelect:chooseExtremaMode
    });
    var modeControl = "<label class='settings-field-row" + (modeError ? " has-error" : "") + "' data-testid='settings-field-mode'><span class='settings-label'><span>Режим расчёта</span></span><span class='settings-control-wrap'>" + modeSelector + "</span>" + (modeError ? "<small class='field-message is-error' role='alert'>" + esc(modeError) + "</small>" : "") + "</label><p class='extrema-magnitude-note" + (complexSignal ? " is-current" : "") + "' data-testid='extrema-magnitude-copy'><span>Для комплексных сигналов экстремумы рассчитываются по модулю |y|.</span>" + (complexSignal ? "<em>Активный сигнал комплексный · используется |y|.</em>" : "") + "</p>";
    host.innerHTML = "<section class='settings-group' data-testid='extrema-settings-group'><button class='settings-group-title' type='button' aria-expanded='true' disabled><span>Расчёт экстремумов</span></button><div class='settings-group-fields'>" + modeControl + labels.map(function (field) { var id=field[0], error=draft.invalid[id], integer=id === "number_of_peaks" || id === "minimum_distance_samples", helper=field[2] ? "<small class='field-message extrema-field-helper'>" + esc(field[2]) + "</small>" : ""; return "<label class='settings-field-row" + (error ? " has-error" : "") + "' data-testid='settings-field-" + id + "'><span class='settings-label' title='" + esc(field[1]) + "'><span>" + field[1] + "</span></span><span class='settings-control-wrap'><input class='control' type='text' inputmode='" + (integer ? "numeric" : "decimal") + "' step='" + (integer ? "1" : "any") + "' data-peaks-setting='" + id + "' value='" + esc(draft.values[id]) + "' aria-invalid='" + String(!!error) + "' aria-label='" + field[1] + "'" + disabled + "></span>" + (error ? "<small class='field-message is-error' role='alert'>" + esc(error) + "</small>" : "") + helper + "</label>"; }).join("") + "</div></section>";
    valueSelect.reconcile();
    decorateNoHistory(host);
    if (restoreFocus) { var input = host.querySelector("[data-peaks-setting='" + restoreFocus.id + "']"); if (input) { input.focus(); if (typeof input.setSelectionRange === "function") input.setSelectionRange(restoreFocus.start, restoreFocus.end); } }
  }

  function renderPeaksApply(footer, button, status) {
    var display = activeDisplay(), pane = paneById(model.activePane), draft = model.peaksDraft;
    var values = q("[data-testid='extrema-values']");
    var record = display && pane ? model.peaksRecords[paneRuntimeKey(display.id, pane.id)] : null;
    var actionState=extremaActionState(record), actionHelper=extremaActionController();
    var actionView=actionHelper && typeof actionHelper.project === "function" ? actionHelper.project(button, actionState) : extremaActionView(record);
    var parsed = draft && draft.key === peaksSettingsKey(display, pane) ? parsePeaksSettings(draft) : null;
    var invalid = !!draft && !parsed;
    var unavailable = !extremaTabsAvailable(pane) || !draft;
    var phase = model.peaksApplying || actionView.pending || actionView.busy ? "pending" : "pristine";
    footer.dataset.applyState = phase;
    footer.setAttribute("aria-busy", String(model.peaksApplying || actionView.busy));
    if (values) { values.hidden = false; values.disabled = !display || !pane; }
    status.classList.add("visually-hidden");
    button.disabled = unavailable || model.peaksApplying || invalid || actionView.disabled;
    syncApplyLoader(button, footer, phase, model.peaksApplyEpisodeKey || record && record.loading_episode);
    status.textContent = model.peaksMessage;
  }

  function applyPeaksSettings() {
    var display = activeDisplay(), pane = paneById(model.activePane), draft = model.peaksDraft;
    if (!display || !pane || !draft || draft.key !== peaksSettingsKey(display, pane) || model.settingsPage !== "peaks") return Promise.resolve();
    if (model.peaksApplying) { model.peaksApplyQueued = true; return; }
    var settingsPayload = parsePeaksSettings(draft);
    if (!settingsPayload || !peaksSettingsDirty(draft, settingsPayload)) return Promise.resolve();
    var displayId = display.id, paneId = pane.id;
    model.peaksApplying = true;
    model.peaksApplyQueued = false;
    model.peaksApplyEpisodeKey = "settings-extrema::" + paneRuntimeKey(displayId, paneId) + "::" + String(draft.intent || 0) + "::" + String(model.revision);
    model.peaksMessage = "Применяются настройки экстремумов";
    closeExtremaModeMenu(false);
    renderSettings(display);
    function samePeaksContext() { return activeDisplay() && activeDisplay().id === displayId && model.activePane === paneId && model.settingsPage === "peaks"; }
    function acceptPeaksResponse(response) {
      var snapshot = response && response.state ? response.state : response;
      if (!accept(snapshot)) return refreshSnapshot(renderActivePaneContext);
      renderActivePaneContext();
      return Promise.resolve(snapshot);
    }
    function rebasePeaksConflict(error) {
      var current = error && error.payload && (error.payload.current || error.payload.state);
      if (!current) return Promise.reject(error);
      if (accept(current)) { renderActivePaneContext(); return Promise.resolve(current); }
      return refreshSnapshot(renderActivePaneContext);
    }
    function persistLatest(retries) {
      if (!samePeaksContext() || !model.peaksDraft || model.peaksDraft.key !== peaksSettingsKey(activeDisplay(), paneById(paneId))) return Promise.reject(new Error("Контекст области изменился; повторите действие."));
      var currentDraft = model.peaksDraft, currentPayload = parsePeaksSettings(currentDraft);
      if (!currentPayload) return Promise.reject(new Error("Исправьте выделенные поля."));
      var intent = currentDraft.intent || 0;
      return api.updatePeaksSettings({ state_revision:model.revision, display_id:displayId, pane_id:paneId, settings:currentPayload }).then(function (response) {
        return acceptPeaksResponse(response).then(function () {
          var latest = model.peaksDraft;
          if (samePeaksContext() && latest && latest.key === currentDraft.key && ((latest.intent || 0) > intent || model.peaksApplyQueued)) {
            model.peaksApplyQueued = false;
            return persistLatest(0);
          }
          return response;
        });
      }).catch(function (error) {
        var latest = model.peaksDraft;
        if (samePeaksContext() && error && error.status === 409 && retries < 1) return rebasePeaksConflict(error).then(function () { return persistLatest(retries + 1); });
        if (samePeaksContext() && latest && latest.key === currentDraft.key && (latest.intent || 0) > intent) return persistLatest(0);
        throw error;
      });
    }
    return persistLatest(0).then(function () {
      if (!samePeaksContext()) return;
      var runtimeKey = paneRuntimeKey(displayId, paneId);
      model.peaksDraft = null;
      model.peaksMessage = "Настройки экстремумов применены";
      delete model.peaksRecords[runtimeKey];
      model.peaksRecord = null;
      clearPeaksMarkersForPane(displayId, paneId);
      renderInspector();
      return fetchActivePeaks(displayId, paneId, false, false);
    }).catch(function (error) {
      model.peaksMessage = safeErrorText(error, "Не удалось применить настройки экстремумов.");
      showToast(safeErrorText(error, "Не удалось применить настройки экстремумов."), true);
      throw error;
    }).finally(function () {
      model.peaksApplying = false;
      model.peaksApplyEpisodeKey = null;
      if (activeDisplay() && activeDisplay().id === displayId && model.activePane === paneId && model.settingsPage === "peaks") renderSettings(activeDisplay());
    });
  }

  function ownedPeakTraceIndexes(host) {
    return host && host.data ? host.data.reduce(function (indexes, trace, index) { if (trace && trace.meta && trace.meta.signal_analyser_peaks_overlay) indexes.push(index); return indexes; }, []) : [];
  }
  function clearPeaksMarkers() {
    if (!window.Plotly) return;
    qa(".plot-chart.js-plotly-plot").forEach(function (host) {
      var indexes = ownedPeakTraceIndexes(host);
      if (indexes.length) window.Plotly.deleteTraces(host, indexes);
    });
  }
  function clearPeaksMarkersForPane(displayId, paneId) {
    if (!window.Plotly) return;
    var host = q("[data-pane-host='" + CSS.escape(paneRuntimeKey(displayId, paneId)) + "']");
    var indexes = ownedPeakTraceIndexes(host);
    if (indexes.length) Promise.resolve(window.Plotly.deleteTraces(host, indexes)).catch(function () {});
  }
  function updatePeaksMarkers(displayId, paneId, record) {
    var pane = paneById(paneId), display = activeDisplay();
    if (!window.Plotly || !display || display.id !== displayId || !extremaTabsAvailable(pane) || !record || !record.data || !Array.isArray(record.data.rows)) return;
    var host = q("[data-pane-host='" + CSS.escape(paneRuntimeKey(displayId, paneId)) + "']");
    if (!host || !host.data) return;
    var grouped = {};
    record.data.rows.forEach(function (row) { var key=row.signal_name || ""; if (!key) return; (grouped[key] || (grouped[key]=[])).push(row); });
    var traces = Object.keys(grouped).map(function (name) { var rows=grouped[name], signal=(model.state.signals || []).filter(function (candidate) { return signalNameMatches(candidate, name); })[0], color=rows[0].signal_color || signalColor(signal); return { type:"scatter", mode:"markers+text", x:rows.map(function(row){return pane.plot_type === "spectrum" ? (row.frequency == null ? row.frequency_hz : row.frequency) : (row.time == null ? row.time_s : row.time);}), y:rows.map(function(row){return row.value;}), text:rows.map(function(row){return row.graph_number == null ? "" : String(row.graph_number);}), textposition:"top center", marker:{color:color,size:8,symbol:rows.map(function(row){ return row.type === "minimum" ? "triangle-down" : "triangle-up"; })}, hoverinfo:"skip", hovertemplate:null, showlegend:false, meta:{signal_analyser_peaks_overlay:true} }; });
    var existing = ownedPeakTraceIndexes(host), remove = existing.length ? window.Plotly.deleteTraces(host, existing) : Promise.resolve();
    Promise.resolve(remove).then(function () { if (traces.length && activeDisplay() && activeDisplay().id === displayId && model.activePane === paneId) return window.Plotly.addTraces(host, traces); }).catch(function () {});
  }

  function stopPeaksPolling(exceptKey) {
    Object.keys(model.peaksPollByPane).forEach(function (key) {
      if (key !== exceptKey) { window.clearTimeout(model.peaksPollByPane[key]); delete model.peaksPollByPane[key]; }
    });
  }

  function peaksResponseContextIsCurrent(response, displayId, paneId, token) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    if (token !== model.peaksTokens[runtimeKey] || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return false;
    if (!response || response.display_id !== displayId || response.pane_id !== paneId) return false;
    var prior = model.peaksRecords[runtimeKey];
    if (prior && prior.context_key && response.context_key !== prior.context_key && response.calculation_revision <= prior.calculation_revision) return false;
    return !(prior && typeof prior.calculation_revision === "number" && typeof response.calculation_revision === "number" && response.calculation_revision < prior.calculation_revision);
  }

  function peaksResponseIsCurrent(response, displayId, paneId, token) {
    var revision=stateRevision(response);
    if (!peaksResponseContextIsCurrent(response, displayId, paneId, token)) return false;
    if (revision === null || revision >= model.revision) return true;
    var prior=model.peaksRecords[paneRuntimeKey(displayId,paneId)];
    return !!(prior && prior.calculationRequested &&
      prior.context_key === response.context_key &&
      prior.calculation_revision === response.calculation_revision);
  }

  function schedulePeaksPoll(displayId, paneId) {
    var runtimeKey=paneRuntimeKey(displayId, paneId);
    window.clearTimeout(model.peaksPollByPane[runtimeKey]);
    model.peaksPollByPane[runtimeKey]=window.setTimeout(function () {
      delete model.peaksPollByPane[runtimeKey];
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return;
      fetchActivePeaks(displayId, paneId, true, true);
    }, 350);
  }

  function acceptPeaksPayload(response, displayId, paneId, token, calculationRequested, poll) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var prior = model.peaksRecords[runtimeKey];
    var requested = !!calculationRequested || !!(prior && prior.calculationRequested);
    if (!peaksResponseIsCurrent(response, displayId, paneId, token)) {
      var revision=stateRevision(response);
      if (poll && requested && revision !== null && revision < model.revision && peaksResponseContextIsCurrent(response, displayId, paneId, token)) schedulePeaksPoll(displayId, paneId);
      return null;
    }
    var pending = !response.isready && requested;
    model.revision = Math.max(model.revision, stateRevision(response) || model.revision);
    var record = {
      displayId:displayId,
      paneId:paneId,
      context_key:response.context_key,
      calculation_revision:response.calculation_revision,
      revision:stateRevision(response),
      calculationRequested:requested,
      calculated:!!response.isready,
      pending:pending,
      loading_episode:pending ? (prior && prior.pending && prior.loading_episode || ("extrema::" + runtimeKey + "::" + String(response.context_key == null ? "awaiting" : response.context_key) + "::" + String(response.calculation_revision == null ? "awaiting" : response.calculation_revision))) : null,
      error:response.isready && response.success === false ? response.error || "Не удалось рассчитать экстремумы." : null,
      data:response.data || null,
      peaks:response.peaks || null
    };
    model.peaksRecords[runtimeKey] = record;
    model.peaksRecord = record;
    if (model.inspectorPage === "peaks") renderInspector();
    if (model.settingsPage === "peaks") renderSettings(activeDisplay());
    if (response.isready && response.success !== false) updatePeaksMarkers(displayId, paneId, record);
    if (!response.isready && !requested) clearPeaksMarkersForPane(displayId, paneId);
    if (!response.isready && requested && poll) schedulePeaksPoll(displayId, paneId);
    return record;
  }

  function fetchActivePeaks(displayId, paneId, poll, calculationRequested, conflictRetries) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var rebaseAttempts = Number(conflictRetries) || 0;
    var token = (model.peaksTokens[runtimeKey] || 0) + 1;
    model.peaksTokens[runtimeKey] = token;
    window.clearTimeout(model.peaksPollByPane[runtimeKey]);
    return api.activePeaks(displayId, paneId).then(function (response) {
      return acceptPeaksPayload(response, displayId, paneId, token, calculationRequested, poll);
    }).catch(function (error) {
      if (token !== model.peaksTokens[runtimeKey] || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return null;
      var conflictState=error && error.status === 409 && error.payload && (error.payload.current && (error.payload.current.state || error.payload.current) || error.payload.state);
      if (conflictState && rebaseAttempts < 1) {
        var rebased=accept(conflictState) ? Promise.resolve(conflictState) : refreshSnapshot(renderActivePaneContext);
        return rebased.then(function () {
          renderActivePaneContext();
          if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return null;
          return fetchActivePeaks(displayId, paneId, poll, calculationRequested, rebaseAttempts + 1);
        });
      }
      var record = { displayId:displayId, paneId:paneId, calculationRequested:!!calculationRequested, calculated:false, error:safeErrorText(error, "Не удалось загрузить экстремумы."), pending:false };
      model.peaksRecords[runtimeKey] = record;
      model.peaksRecord = record;
      if (model.inspectorPage === "peaks") renderInspector();
      if (model.settingsPage === "peaks") renderSettings(activeDisplay());
      return record;
    });
  }

  function ensurePeaksEnabled(displayId, paneId) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var display = activeDisplay(), pane = paneById(paneId);
    if (!display || display.id !== displayId || !pane || pane.id !== model.activePane || !paneHasSignals(pane) || !extremaTabsAvailable(pane)) return Promise.reject(new Error("Контекст области изменился; повторите действие."));
    if (display.peaks_enabled) return Promise.resolve();
    if (model.peaksEnableByPane[runtimeKey]) return model.peaksEnableByPane[runtimeKey];
    model.peaksEnableByPane[runtimeKey] = mutate(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return Promise.reject(new Error("Контекст области изменился; повторите действие."));
      return api.view({ state_revision:model.revision, peaks_enabled:true });
    }, { preservePlots:true, skipOutput:true }).finally(function () { delete model.peaksEnableByPane[runtimeKey]; });
    return model.peaksEnableByPane[runtimeKey];
  }

  function canonicalAxisScale(unit, pane, displayedFullRange) {
    if (pane.plot_type === "time") {
      var maximumSeconds=(model.state.signals || []).reduce(function (maximum, signal) {
        return (pane.signal_bindings || []).indexOf(signal.name) >= 0 ? Math.max(maximum, Number(signal.duration_s) || 0) : maximum;
      }, 0);
      return screenTimeUnitFactor(unit, maximumSeconds || Math.max(Math.abs(Number(displayedFullRange && displayedFullRange[0]) || 0), Math.abs(Number(displayedFullRange && displayedFullRange[1]) || 1)));
    }
    return {
      cycles_per_year:1/31557600, cycles_per_day:1/86400, cycles_per_hour:1/3600, cycles_per_minute:1/60,
      millihertz:1e-3, hertz:1, kilohertz:1e3, megahertz:1e6, gigahertz:1e9, terahertz:1e12
    }[unit] || 1;
  }

  function currentPeaksVisibleRange(display, pane) {
    if (!display || !pane || ["time", "spectrum"].indexOf(pane.plot_type) < 0) return null;
    var runtimeKey=paneRuntimeKey(display.id, pane.id), host=q("[data-pane-host='" + CSS.escape(runtimeKey) + "']");
    var axis=host && host.dataset.plotReady === "true" && host._fullLayout && host._fullLayout.xaxis;
    if (!axis || !Array.isArray(axis.range) || axis.range.length !== 2) return null;
    var displayed=host._fullLayout.xaxis.range.map(Number);
    if (axis.type === "log") displayed=displayed.map(function (value) { return Math.pow(10, value); });
    if (!displayed.every(Number.isFinite) || displayed[0] === displayed[1]) return null;
    displayed=[Math.min(displayed[0], displayed[1]), Math.max(displayed[0], displayed[1])];
    var displayedFull=model.rangeSliderDataRangeByPane[runtimeKey];
    if (!displayedFull) {
      var record=model.outputs[runtimeKey], envelope=record && record.output && plotEnvelope(record.output.data);
      var traces=Array.isArray(envelope) ? envelope : envelope && envelope.data;
      displayedFull=traceXDataRange(traces || []);
    }
    var unit=pane.plot_type === "time" ? (settings.value("time.units") || "seconds") : (settings.value("spectrum.frequency_units") || "hertz");
    var helperSupported=["seconds","milliseconds","microseconds","nanoseconds","hertz","kilohertz","megahertz","gigahertz"].indexOf(unit) >= 0;
    var scale=canonicalAxisScale(unit, pane, displayedFull);
    var canonicalFull=displayedFull && displayedFull.length === 2 ? [Number(displayedFull[0]) * scale, Number(displayedFull[1]) * scale] : null;
    var canonical=task0126 && helperSupported ? task0126.effectiveViewport(displayed, unit, canonicalFull) : [displayed[0] * scale, displayed[1] * scale];
    if (canonicalFull && !helperSupported) canonical=[Math.max(Math.min(canonicalFull[0], canonicalFull[1]), canonical[0]), Math.min(Math.max(canonicalFull[0], canonicalFull[1]), canonical[1])];
    if (!canonical || !canonical.every(Number.isFinite) || !(canonical[0] < canonical[1])) return null;
    return pane.plot_type === "time" ? { min_s:canonical[0], max_s:canonical[1] } : { min_hz:canonical[0], max_hz:canonical[1] };
  }

  function calculatePeaks() {
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane || !extremaTabsAvailable(pane) || !paneHasSignals(pane)) return;
    var displayId = display.id, paneId = pane.id, runtimeKey = paneRuntimeKey(displayId, paneId);
    var existing = model.peaksRecords[runtimeKey];
    var actionHelper=extremaActionController(), actionState=extremaActionState(existing);
    var activation=actionHelper && typeof actionHelper.activation === "function" ? actionHelper.activation(actionState, function () { return currentPeaksVisibleRange(display, pane); }) : null;
    if (!actionHelper) {
      if (actionState === "pending") return;
      activation={ visible_range:currentPeaksVisibleRange(display, pane) };
    }
    if (!activation) return;
    var visibleRange=activation.visible_range;
    stopPeaksPolling(runtimeKey);
    var token = (model.peaksTokens[runtimeKey] || 0) + 1;
    model.peaksTokens[runtimeKey] = token;
    var prior = model.peaksRecords[runtimeKey];
    model.peaksRecords[runtimeKey] = {
      displayId:displayId,
      paneId:paneId,
      context_key:prior && prior.context_key,
      calculation_revision:prior && prior.calculation_revision,
      calculationRequested:true,
      calculated:false,
      pending:true,
      loading_episode:"extrema::" + runtimeKey + "::request::" + String(token),
      error:null,
      data:prior && prior.data || null
    };
    renderInspector();
    if (model.settingsPage === "peaks") renderApply();
    ensurePeaksEnabled(displayId, paneId).then(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return null;
      token = (model.peaksTokens[runtimeKey] || 0) + 1;
      model.peaksTokens[runtimeKey] = token;
      function requestCalculation(retries) {
        var payload={ state_revision:model.revision, display_id:displayId, pane_id:paneId };
        if (visibleRange) payload.visible_range=visibleRange;
        return api.calculateActivePeaks(payload).catch(function (error) {
          var current = error && error.payload && (error.payload.current || error.payload.state);
          if (!current || error.status !== 409 || retries >= 1 || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) throw error;
          var snapshot = current.state || current;
          return (accept(snapshot) ? Promise.resolve(snapshot) : refreshSnapshot(renderActivePaneContext)).then(function () {
            if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) throw new Error("Контекст области изменился; повторите действие.");
            renderActivePaneContext();
            return requestCalculation(retries + 1);
          });
        });
      }
      return requestCalculation(0).then(function (response) {
        return acceptPeaksPayload(response, displayId, paneId, token, true, true);
      });
    }).catch(function (error) {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return;
      model.peaksRecords[runtimeKey] = { displayId:displayId, paneId:paneId, calculationRequested:true, calculated:false, pending:false, error:safeErrorText(error, "Не удалось рассчитать экстремумы."), data:prior && prior.data || null };
      renderInspector();
      if (model.settingsPage === "peaks") renderApply();
    });
  }

  function loadPeaks() {
    if (!peaksSurfaceActive()) return Promise.resolve();
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane || !extremaTabsAvailable(pane) || !paneHasSignals(pane)) { stopPeaksPolling(""); model.peaksRecord = null; renderInspector(); return Promise.resolve(); }
    var displayId = display.id, paneId = pane.id, runtimeKey = paneRuntimeKey(displayId, paneId);
    stopPeaksPolling(runtimeKey);
    if (display.peaks_enabled) return fetchActivePeaks(displayId, paneId, false, false);
    return ensurePeaksEnabled(displayId, paneId).then(function () { return fetchActivePeaks(displayId, paneId, false, false); });
  }

  function targetActivePaneForExtrema() {
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !extremaTabsAvailable(pane)) return false;
    model.extremaTargetKey = paneRuntimeKey(display.id, pane.id);
    renderActivePaneContext();
    return true;
  }

  function configureActivePeaks() {
    if (!targetActivePaneForExtrema()) return;
    model.settingsPage = "peaks";
    renderActivePaneContext();
    loadPeaks();
    window.requestAnimationFrame(function () { var tab = q("[data-testid='settings-tab-peaks']"); if (tab) tab.focus(); });
  }

  function showActivePeaksValues() {
    if (!targetActivePaneForExtrema()) return;
    model.inspectorPage = "peaks";
    renderActivePaneContext();
    var display = activeDisplay(), pane = paneById(model.activePane);
    var draft = model.peaksDraft, parsed = draft && draft.key === peaksSettingsKey(display, pane) ? parsePeaksSettings(draft) : null;
    if (draft && !parsed) return;
    if (parsed && peaksSettingsDirty(draft, parsed)) {
      return void Promise.resolve(applyPeaksSettings()).then(function () { showActivePeaksValues(); }).catch(function () {});
    }
    var record = display && pane && model.peaksRecords[paneRuntimeKey(display.id, pane.id)];
    var readyForCurrentContext = !!(record && record.displayId === display.id && record.paneId === pane.id &&
      record.calculated && !record.pending && !record.error &&
      typeof record.context_key === "string" && record.context_key &&
      typeof record.calculation_revision === "number" && record.revision === model.revision);
    var pendingForCurrentContext = !!(record && record.displayId === display.id && record.paneId === pane.id && record.pending);
    if (!readyForCurrentContext && !pendingForCurrentContext) calculatePeaks();
    window.requestAnimationFrame(function () { var tab = q("[data-testid='inspector-tab-peaks']"); if (tab) tab.focus(); });
  }

  function peaksSurfaceActive() { return model.inspectorPage === "peaks" || model.settingsPage === "peaks"; }

  function signalAddLayer() { return q("[data-testid='signal-add-layer']"); }

  function signalAddSelected() {
    return signalAddVariables().filter(function (variable) { return !!model.signalAddSelection[variable.variable_id]; });
  }

  function signalAddVariables() {
    var supported = ["raw_vector", "raw_matrix", "timed_vector", "timed_matrix"];
    return model.signalAddCatalog && Array.isArray(model.signalAddCatalog.variables) ? model.signalAddCatalog.variables.filter(function (variable) {
      return variable && variable.selectable === true && supported.indexOf(variable.source_kind) >= 0 && ["required", "not_needed"].indexOf(variable.sample_rate_requirement) >= 0;
    }) : [];
  }

  function signalAddRateResult() {
    var layer = signalAddLayer(), input = layer && layer.querySelector("[data-signal-add-sample-rate]");
    return numeric.parse(input ? input.value : "", "decimal");
  }

  function updateSignalAddControls() {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    var selected = signalAddSelected();
    var requiresRate = selected.some(function (variable) { return variable.sample_rate_requirement === "required"; });
    var rate = layer.querySelector("[data-signal-add-sample-rate]");
    var submit = layer.querySelector("[data-signal-add-submit]");
    var rateResult = signalAddRateResult(), invalidRate = requiresRate && (!rateResult.valid || rateResult.value <= 0);
    var rateError = layer.querySelector(".signal-add-rate-error");
    if (rate) {
      rate.disabled = !requiresRate || model.signalAddSubmitting;
      rate.setAttribute("aria-invalid", String(invalidRate));
    }
    if (rateError) { rateError.hidden = !invalidRate; rateError.textContent = invalidRate ? (rateResult.valid ? "Введите число больше 0." : rateResult.error) : ""; }
    if (submit) submit.disabled = model.signalAddLoading || model.signalAddSubmitting || !selected.length || invalidRate;
    qa("[data-signal-add-variable], [data-signal-add-search], [data-signal-add-close], [data-signal-add-cancel]").forEach(function (control) { control.disabled = model.signalAddSubmitting || (control.dataset.signalAddSearch !== undefined && model.signalAddLoading); });
  }

  function workspaceVariableLength(variable) {
    var sampleCount = Number(variable && variable.sample_count);
    if (!Number.isSafeInteger(sampleCount) || sampleCount < 0) {
      sampleCount = Array.isArray(variable && variable.shape) && Number.isSafeInteger(Number(variable.shape[0])) ? Number(variable.shape[0]) : null;
    }
    return sampleCount == null ? "—" : sampleCount + " отсчётов";
  }

  function renderSignalAddCatalog() {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    var list = layer.querySelector("[data-testid='signal-add-variables']");
    var state = layer.querySelector("[data-testid='signal-add-state']");
    var error = layer.querySelector("[data-testid='signal-add-error']");
    var catalog = model.signalAddCatalog, search = model.signalAddSearch.toLocaleLowerCase("ru-RU");
    var searchInput = layer.querySelector("[data-signal-add-search]"), count = layer.querySelector("[data-signal-add-count]");
    error.hidden = true;
    if (searchInput) { searchInput.value = model.signalAddSearch; searchInput.disabled = model.signalAddLoading || model.signalAddSubmitting; }
    if (model.signalAddLoading) {
      if (catalog && list.querySelector("[data-signal-add-variable]")) {
        setCheckboxRegionBusy(list, true);
        state.hidden = false;
        state.textContent = "Обновляем переменные…";
        decorateNoHistory(layer);
        return updateSignalAddControls();
      }
      list.innerHTML = "<div class='signal-add-list-state'><span class='spinner'></span><span>Загрузка переменных…</span></div>";
      if (count) count.textContent = "0 переменных";
      state.hidden = false;
      state.textContent = "Загрузка переменных…";
      return updateSignalAddControls();
    }
    if (model.signalAddCatalogError) {
      if (catalog && list.querySelector("[data-signal-add-variable]")) {
        setCheckboxRegionBusy(list, false);
        state.hidden = false;
        state.textContent = "Не удалось обновить список";
        error.hidden = false;
        error.textContent = model.signalAddCatalogError;
        return updateSignalAddControls();
      }
      list.innerHTML = "<div class='signal-add-list-state'>Не удалось получить переменные рабочей области.<button class='button button-compact' type='button' data-signal-add-retry>Повторить</button></div>";
      state.hidden = true; error.hidden = false; error.textContent = model.signalAddCatalogError;
      if (count) count.textContent = "0 переменных";
      return updateSignalAddControls();
    }
    var allVariables = signalAddVariables();
    var variables = allVariables.filter(function (variable) { return !search || String(variable.name || "").toLocaleLowerCase("ru-RU").indexOf(search) >= 0; });
    list.innerHTML = variables.map(function (variable) {
      var checked = !!model.signalAddSelection[variable.variable_id];
      return "<label title='" + esc(variable.name + " · " + variable.type + " · " + workspaceVariableLength(variable)) + "'><input class='ui-checkbox' type='checkbox' data-signal-add-variable value='" + esc(variable.variable_id) + "' aria-label='Добавить " + esc(variable.name) + "'" + (checked ? " checked" : "") + (model.signalAddSubmitting ? " disabled" : "") + "><span class='workspace-variable-name'><strong>" + esc(variable.name) + "</strong><small>" + esc(variable.type || "Переменная") + "</small></span><small class='workspace-variable-meta'>" + esc(workspaceVariableLength(variable)) + "</small></label>";
    }).join("");
    setCheckboxRegionBusy(list, false);
    if (!variables.length) list.innerHTML = "<div class='signal-add-list-state'>" + (search && allVariables.length ? "Ничего не найдено." : "Поддерживаемые переменные не найдены.") + (!search ? "<button class='button button-compact' type='button' data-signal-add-retry>Повторить</button>" : "") + "</div>";
    if (model.signalAddResetScroll) { list.scrollTop = 0; model.signalAddResetScroll = false; }
    if (count) count.textContent = variables.length + (catalog && catalog.truncated && !search ? " из " + catalog.total : "") + " переменных";
    state.hidden = false;
    state.textContent = catalog && catalog.truncated && !search ? "Показаны первые 1000 совместимых переменных" : "Только совместимые переменные";
    decorateNoHistory(layer);
    updateSignalAddControls();
  }

  function loadSignalAddCatalog(preserveVisibleRows) {
    var token = ++model.signalAddToken;
    if (!preserveVisibleRows) model.signalAddCatalog = null;
    model.signalAddCatalogError = "";
    model.signalAddLoading = true;
    renderSignalAddCatalog();
    return api.workspaceVariables().then(function (catalog) {
      if (token !== model.signalAddToken) return;
      model.signalAddLoading = false;
      model.signalAddCatalog = catalog;
      model.signalAddResetScroll = true;
      if (signalAddLayer() && !signalAddLayer().hidden) renderSignalAddCatalog();
    }).catch(function (caught) {
      if (token !== model.signalAddToken) return;
      model.signalAddLoading = false;
      model.signalAddCatalogError = safeErrorText(caught, "Не удалось получить переменные рабочей области.");
      if (signalAddLayer() && !signalAddLayer().hidden) renderSignalAddCatalog();
    });
  }

  function openSignalAddDialog(trigger) {
    var layer = signalAddLayer();
    if (!layer || !layer.hidden) return;
    closeColumnMenu(false);
    model.signalAddTrigger = trigger;
    model.signalAddSubmitting = false;
    model.signalAddSearch = "";
    model.signalAddSelection = {};
    model.signalAddCatalogError = "";
    model.signalAddResetScroll = true;
    layer.hidden = false;
    q("[data-testid='app-shell']").inert = true;
    trigger.setAttribute("aria-expanded", "true");
    var rate = layer.querySelector("[data-signal-add-sample-rate]");
    if (rate) rate.value = "2048";
    var rateUnit=layer.querySelector("label[for='signal-add-sample-rate'] span"),presenter=russianPresenter();
    if (rateUnit && presenter) rateUnit.textContent=presenter.unitLabel("Hz");
    layer.querySelector("[data-signal-add-submit]").textContent = "Добавить";
    loadSignalAddCatalog();
    layer.querySelector("#signal-add-title").focus();
  }

  function closeSignalAddDialog(restoreFocus) {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    q("[data-testid='app-shell']").inert = false;
    var trigger = q("[data-testid='signals-add-action']") || model.signalAddTrigger;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
    model.signalAddTrigger = null;
    ++model.signalAddToken;
    model.signalAddCatalog = null;
    model.signalAddCatalogError = "";
    model.signalAddLoading = false;
    model.signalAddSubmitting = false;
  }

  function submitSignalAddDialog() {
    var layer = signalAddLayer(), catalog = model.signalAddCatalog;
    if (!layer || layer.hidden || !catalog || model.signalAddSubmitting) return;
    var selected = signalAddSelected(), rate = signalAddRateResult();
    if (!selected.length || selected.some(function (variable) { return variable.sample_rate_requirement === "required"; }) && (!rate.valid || rate.value <= 0)) return updateSignalAddControls();
    var selections = selected.map(function (variable) { return { variable_id:variable.variable_id, sample_rate_hz:variable.sample_rate_requirement === "required" ? rate.value : null }; });
    model.signalAddSubmitting = true;
    var submit = layer.querySelector("[data-signal-add-submit]");
    var error = layer.querySelector("[data-testid='signal-add-error']");
    submit.textContent = "Добавление…";
    error.hidden = true;
    setCheckboxRegionBusy(layer.querySelector("[data-testid='signal-add-variables']"), true);
    updateSignalAddControls();
    mutate(function () { return api.signals({ state_revision:model.revision, operation:"import_workspace_batch", catalog_revision:catalog.catalog_revision, selections:selections }); }).then(function () {
      model.signalAddSubmitting = false;
      setCheckboxRegionBusy(layer.querySelector("[data-testid='signal-add-variables']"), false);
      closeSignalAddDialog(true);
      showToast("Добавлено сигналов: " + selections.length, false);
    }).catch(function (caught) {
      model.signalAddSubmitting = false;
      setCheckboxRegionBusy(layer.querySelector("[data-testid='signal-add-variables']"), false);
      submit.textContent = "Добавить";
      error.hidden = false;
      error.textContent = safeErrorText(caught, "Не удалось добавить выбранные сигналы.");
      updateSignalAddControls();
    });
  }

  function renderColumnMenu() {
    var menu = q("[data-testid='signal-columns-menu']");
    if (!menu) return;
    menu.innerHTML = "<div class='inspector-menu-title'>Видимость столбцов</div>" +
      [{id:"color",label:"Цвет"},{id:"sample_rate",label:"Частота дискретизации"},{id:"sample_count",label:"Отсчёты"},{id:"duration",label:"Длительность"},{id:"data_type",label:"Тип"}].map(function (column) {
        var visible = model.visibleColumns[column.id]; return "<button type='button' role='menuitemcheckbox' aria-pressed='" + visible + "' aria-checked='" + visible + "' data-column-visible='" + column.id + "'><span>" + column.label + "</span><img src='" + (visible ? "./icons/eye.svg" : "./icons/eye-off.svg") + "' alt=''></button>";
      }).join("");
  }

  function renderMeasurementMenu() {
    var menu = q("[data-testid='measurement-columns-menu']"), display = activeDisplay();
    if (!menu) return;
    var selected = display && Array.isArray(display.measurement_kinds) ? display.measurement_kinds : [];
    var markup = "<div class='inspector-menu-title'>Видимость измерений</div>" + measurementOptions.map(function (measurement) {
      var visible = selected.indexOf(measurement.id) >= 0;
      return "<button type='button' role='menuitemcheckbox' aria-pressed='" + visible + "' aria-checked='" + visible + "' data-measurement-visible='" + measurement.id + "'><span>" + measurement.label + "</span><img src='" + (visible ? "./icons/eye.svg" : "./icons/eye-off.svg") + "' alt=''></button>";
    }).join("");
    var pane=paneById(model.activePane), helper=measurementCursorColumnsHelper(), controller=measurementCursorColumnsController();
    if (display && pane && helper && controller) {
      var key=paneRuntimeKey(display.id,pane.id), snapshot=model.measurementCursorSnapshotByPane[key] || null;
      markup+=helper.menuMarkup(controller.menuItems(key,snapshot,pane.plot_type),".");
    }
    menu.innerHTML=markup;
  }

  function ensureSampleColumnsMenu() {
    var helper=signalSamplesColumnsHelper(), menu=q("[data-testid='sample-columns-menu']");
    if (menu || !helper) return menu;
    menu=document.createElement("div");
    menu.className="menu inspector-menu sample-columns-menu";
    menu.setAttribute("role", "menu");
    menu.dataset.testid=helper.menu.testid;
    menu.setAttribute("data-testid", helper.menu.testid);
    menu.setAttribute("aria-label", helper.menu.title);
    menu.hidden=true;
    document.body.appendChild(menu);
    return menu;
  }

  function renderSampleColumnsMenu() {
    var helper=signalSamplesColumnsHelper(), menu=ensureSampleColumnsMenu();
    if (!helper || !menu) return;
    var visible=signalSamplesColumnVisibility();
    menu.innerHTML="<div class='inspector-menu-title'>"+esc(helper.menu.title)+"</div>"+helper.optionalColumns.map(function (column) {
      var checked=visible[column.id];
      return "<button type='button' role='menuitemcheckbox' aria-pressed='"+checked+"' aria-checked='"+checked+"' data-sample-column-visible='"+esc(column.id)+"'><span>"+esc(column.label)+"</span><img src='"+(checked ? "./icons/eye.svg" : "./icons/eye-off.svg")+"' alt=''></button>";
    }).join("");
  }

  function closeSampleColumnsMenu(restoreFocus) {
    var menu=q("[data-testid='sample-columns-menu']"), trigger=q("[data-testid='sample-columns-menu-trigger']") || model.sampleColumnsMenuTrigger;
    if (!menu || menu.hidden) return;
    menu.hidden=true;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus && trigger.isConnected !== false) trigger.focus();
    }
    model.sampleColumnsMenuTrigger=null;
  }

  function openSampleColumnsMenu(trigger) {
    var menu=ensureSampleColumnsMenu();
    if (!menu || !trigger) return;
    if (!menu.hidden) return closeSampleColumnsMenu(true);
    model.sampleColumnsMenuTrigger=trigger;
    renderSampleColumnsMenu();
    menu.hidden=false;
    trigger.setAttribute("aria-expanded", "true");
    positionMenu(menu, trigger, 244);
    var first=menu.querySelector("button:not(:disabled)");
    if (first) first.focus();
  }

  function toggleSampleColumn(columnId) {
    var helper=signalSamplesColumnsHelper(), menu=ensureSampleColumnsMenu(), scroll=q("[data-testid='samples-table-scroll']");
    if (!helper || !menu || menu.hidden) return;
    var scrollTop=scroll ? scroll.scrollTop : null;
    model.sampleColumnsVisibility=helper.toggle(signalSamplesColumnVisibility(), columnId);
    renderSignalSamplesInspector(q("[data-inspector-content]"));
    scroll=q("[data-testid='samples-table-scroll']");
    if (scroll && scrollTop != null) scroll.scrollTop=scrollTop;
    renderSampleColumnsMenu();
    var trigger=q("[data-testid='sample-columns-menu-trigger']");
    if (trigger) { model.sampleColumnsMenuTrigger=trigger; trigger.setAttribute("aria-expanded", "true"); positionMenu(menu, trigger, 244); }
    var restored=menu.querySelector("[data-sample-column-visible='"+CSS.escape(columnId)+"']");
    if (restored) restored.focus();
  }

  function updateMeasurementKinds(measurementKinds) {
    var display = activeDisplay(), targetDisplayId = display && display.id;
    if (!display) return Promise.reject(new Error("Активный экран не найден."));
    return mutate(function () {
      if (!activeDisplay() || activeDisplay().id !== targetDisplayId) return Promise.reject(new Error("Контекст экрана изменился; повторите действие."));
      return api.view({ state_revision:model.revision, measurement_kinds:measurementKinds });
    }, { preservePlots:true, skipOutput:true });
  }

  function positionMenu(menu, trigger, width) {
    if (!menu || !trigger || menu.hidden) return;
    var rect = trigger.getBoundingClientRect();
    var viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    var viewportHeight = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight, window.visualViewport ? window.visualViewport.height : window.innerHeight);
    var left = Math.min(viewportWidth - width - 8, Math.max(8, rect.right - width));
    menu.style.width = width + "px";
    menu.style.left = left + "px";
    menu.style.top = rect.bottom + 4 + "px";
    window.requestAnimationFrame(function () {
      if (menu.hidden) return;
      var menuRect = menu.getBoundingClientRect();
      if (menuRect.bottom > viewportHeight - 8) menu.style.top = Math.max(8, rect.top - menuRect.height - 4) + "px";
    });
  }

  function closeExtremaModeMenu(restoreFocus) {
    valueSelect.close(restoreFocus);
  }
  function chooseExtremaMode(mode) {
    if (!model.peaksDraft || ["maxima", "minima", "all"].indexOf(mode) < 0) return;
    if (model.peaksDraft.values.mode === mode) return;
    model.peaksDraft.values.mode = mode;
    model.peaksDraft.intent = (model.peaksDraft.intent || 0) + 1;
    if (model.peaksApplying) model.peaksApplyQueued = true;
    renderPeaksSettings(activeDisplay(), paneById(model.activePane), model.peaksRecords[peaksSettingsKey(activeDisplay(), paneById(model.activePane))]);
    renderApply();
  }

  function closeColumnMenu(restoreFocus) {
    var menu = q("[data-testid='signal-columns-menu']"), trigger = q("[data-testid='signal-columns-menu-trigger']");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
  }

  function closeMeasurementMenu(restoreFocus) {
    var menu = q("[data-testid='measurement-columns-menu']"), trigger = q("[data-testid='measurement-columns-menu-trigger']");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menu.classList.remove("is-stale");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
  }

  function paneHasSignals(pane) { return !!(pane && Array.isArray(pane.signal_bindings) && pane.signal_bindings.length); }
  function stopPaneOutput(displayId, paneId) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    model.outputTokens[runtimeKey] = (model.outputTokens[runtimeKey] || 0) + 1;
    window.clearTimeout(model.pollByPane[runtimeKey]);
    delete model.pollByPane[runtimeKey];
    delete model.plotQueue[runtimeKey];
    delete model.outputs[runtimeKey];
    markOutputTerminal(displayId, paneId, "empty");
  }
  function output(poll) {
    var display = activeDisplay();
    if (!display) return;
    panes().forEach(function (pane) {
      if (paneHasSignals(pane)) fetchPaneOutput(display.id, pane.id, poll);
      else stopPaneOutput(display.id, pane.id);
    });
  }
  function nextOutputPollDelay(delay) {
    if (delay < 100) return 100;
    if (delay < 200) return 200;
    return 350;
  }
  function schedulePaneOutputPoll(displayId, paneId, delay) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var currentDelay = typeof delay === "number" ? delay : 50;
    model.pollByPane[runtimeKey] = window.setTimeout(function () {
      fetchPaneOutput(displayId, paneId, true, nextOutputPollDelay(currentDelay));
    }, currentDelay);
  }
  function fetchPaneOutput(displayId, paneId, poll, pollDelay) {
    var display = activeDisplay();
    var pane = paneById(paneId);
    if (!display || display.id !== displayId || !pane) return;
    if (!paneHasSignals(pane)) { stopPaneOutput(displayId, paneId); return; }
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var token = (model.outputTokens[runtimeKey] || 0) + 1;
    model.outputTokens[runtimeKey] = token;
    window.clearTimeout(model.pollByPane[runtimeKey]);
    api.activeOutput(display.id, pane.id).then(function (response) {
      var prior = model.outputs[runtimeKey];
      var currentPane = paneById(paneId);
      if (!activeDisplay() || activeDisplay().id !== displayId || token !== model.outputTokens[runtimeKey] || !paneHasSignals(currentPane) || response.display_id !== display.id || response.pane_id !== pane.id || response.plot_type !== currentPane.plot_type || (prior && prior.context_key && response.context_key !== prior.context_key && response.calculation_revision < prior.calculation_revision)) return;
      model.revision = Math.max(model.revision, stateRevision(response) || model.revision);
      if (!response.isready && prior && prior.output && prior.output.isready && prior.output.success) {
        if (poll) schedulePaneOutputPoll(displayId, paneId, pollDelay);
        return;
      }
      model.outputs[runtimeKey] = { context_key: response.context_key, calculation_revision: response.calculation_revision, output: { isready: response.isready, success: response.success, error: response.error, data: response.data } };
      scheduleRender();
      if (response.isready) projectOutputTerminalAfterRender(displayId, paneId, response.success ? (hasPlotData(response.data) ? "ready" : "empty") : "error", token);
      if (!response.isready && poll) schedulePaneOutputPoll(displayId, paneId, pollDelay);
      if (response.isready && response.success) completePendingApply();
    }).catch(function (error) {
      if (activeDisplay() && activeDisplay().id === displayId && token === model.outputTokens[runtimeKey] && paneHasSignals(paneById(paneId))) {
        model.outputs[runtimeKey] = { output: { isready: true, success:false, error:"Не удалось построить график. Проверьте настройки области и повторите действие." } };
        scheduleRender();
        projectOutputTerminalAfterRender(displayId, paneId, "error", token);
      }
    });
  }

  function refreshSnapshot(renderAccepted) { return api.getState().then(function (snapshot) { if (!accept(snapshot)) throw new Error("Получен устаревший снимок состояния."); (renderAccepted || scheduleRender)(); return snapshot; }); }

  function signalNamesInInventoryOrder(names) {
    var requested=Object.create(null);
    (Array.isArray(names) ? names : []).forEach(function (name) { requested[String(name)]=true; });
    return (model.state && Array.isArray(model.state.signals) ? model.state.signals : []).map(function (signal) { return signal.name; }).filter(function (name) {
      return Object.prototype.hasOwnProperty.call(requested, name);
    });
  }

  function mutate(call, options) {
    var retried = false;
    var renderAccepted = options && options.preservePlots ? renderActivePaneContext : scheduleRender;
    function acceptMutation(response) {
      var snapshot = response && response.state ? response.state : response;
      if (!accept(snapshot)) return refreshSnapshot(renderAccepted);
      renderAccepted();
      return snapshot;
    }
    function attempt() {
      return call().then(acceptMutation).catch(function (error) {
        if (retried || error.status !== 409 || !error.payload || !error.payload.current) throw error;
        retried = true;
        var current = error.payload.current.state || error.payload.current;
        return (accept(current) ? Promise.resolve(current) : refreshSnapshot(renderAccepted)).then(function () { renderAccepted(); return attempt(); });
      });
    }
    return attempt().then(function (snapshot) {
      if (!options || !options.skipSettings) settings.load().catch(function () {});
      if (!options || !options.skipOutput) {
        if (options && options.outputPaneId) {
          var outputDisplay = activeDisplay(), outputPane = paneById(options.outputPaneId);
          if (outputDisplay && outputPane && paneHasSignals(outputPane)) fetchPaneOutput(outputDisplay.id, outputPane.id, true, 50);
          else if (outputDisplay) stopPaneOutput(outputDisplay.id, options.outputPaneId);
        } else output(true);
      }
      if (model.inspectorPage === "measurements") loadMeasurements();
      return snapshot;
    });
  }
  function postLayout(payload, options) {
    var targetDisplayId = activeDisplay() && activeDisplay().id;
    var mutationOptions = Object.assign({}, options || {});
    if (payload.operation === "update_pane") {
      payload=Object.assign({}, payload, { signal_bindings:signalNamesInInventoryOrder(payload.signal_bindings) });
      var previousPane = paneById(payload.pane_id);
      var plotTypeChanged = !previousPane || previousPane.plot_type !== payload.plot_type;
      var hadSignals = paneHasSignals(previousPane);
      var willHaveSignals = Array.isArray(payload.signal_bindings) && payload.signal_bindings.length > 0;
      mutationOptions.outputPaneId = payload.pane_id;
      mutationOptions.skipSettings = !plotTypeChanged;
      mutationOptions.preservePlots = hadSignals && willHaveSignals;
      /* Keep the previous contextual page visible while the mutation is in
         flight.  Area becomes active only after its authoritative snapshot
         has been accepted. */
      mutationOptions.focusAreaAfterPlotTypeChange = plotTypeChanged;
    }
    var paneLoadingToken=mutationOptions.focusAreaAfterPlotTypeChange ? beginPaneLoading(targetDisplayId, payload.pane_id, "plot-type") : null;
    var layoutLoadingToken=payload.operation === "resize" ? beginLayoutLoading(targetDisplayId) : null;
    var request = Object.assign({ display_id:targetDisplayId, version:1 }, payload);
    return mutate(function () {
      if (!targetDisplayId || !activeDisplay() || activeDisplay().id !== targetDisplayId) {
        var error = new Error("Контекст экрана изменился; повторите действие.");
        error.code = "display_context_changed";
        return Promise.reject(error);
      }
      var outgoing=Object.assign({}, request, { state_revision:model.revision });
      if (outgoing.operation === "update_pane") outgoing.signal_bindings=signalNamesInInventoryOrder(outgoing.signal_bindings);
      return api.layouts(outgoing);
    }, mutationOptions).then(function (snapshot) {
      if (layoutLoadingToken) acceptLayoutLoading(targetDisplayId, layoutLoadingToken);
      if (paneLoadingToken) armPaneLoading(targetDisplayId, payload.pane_id, paneLoadingToken);
      if (mutationOptions.focusAreaAfterPlotTypeChange) {
        var currentDisplay = activeDisplay(), currentPane = paneById(payload.pane_id);
        if (currentDisplay && currentPane && currentPane.plot_type === payload.plot_type) {
          model.settingsPage = "display";
          renderSettings(currentDisplay);
        }
      }
      if (peaksSurfaceActive()) loadPeaks();
      return snapshot;
    }).catch(function (error) {
      if (paneLoadingToken) settlePaneLoading(targetDisplayId, payload.pane_id, "error", paneLoadingToken);
      if (layoutLoadingToken) settleLayoutLoading(targetDisplayId, "error", layoutLoadingToken);
      throw error;
    });
  }

  function setActivePaneSignalMembership(signalName, checked, options) {
    var pane = paneById(model.activePane);
    if (!pane || model.signalMembershipBusy || model.pendingMainSignal) return Promise.resolve(null);
    var bindings = Array.isArray(pane.signal_bindings) ? pane.signal_bindings.slice() : [];
    var index = bindings.indexOf(signalName);
    if (checked && index < 0) bindings.push(signalName);
    if (!checked && index >= 0) bindings.splice(index, 1);
    if ((checked && index >= 0) || (!checked && index < 0)) return Promise.resolve(null);
    bindings=signalNamesInInventoryOrder(bindings);

    model.signalMembershipBusy = true;
    setSignalTableMutationBusy(true, "");
    var accepted = false;
    return postLayout({ operation:"update_pane", pane_id:pane.id, plot_type:pane.plot_type, signal_bindings:bindings }).then(function (snapshot) {
      accepted = true;
      return snapshot;
    }).catch(function (error) {
      showToast(safeErrorText(error, "Не удалось обновить состав области."), true);
      if (options && options.rethrow) throw error;
      return null;
    }).finally(function () {
      model.signalMembershipBusy = false;
      setSignalTableMutationBusy(false, "");
      if (!accepted) renderInspector();
    });
  }

  function setActivePaneMainSignal(signalName) {
    var pane = paneById(model.activePane);
    if (!pane || model.pendingMainSignal || model.signalMembershipBusy) return Promise.resolve(null);
    var bindings = Array.isArray(pane.signal_bindings) ? pane.signal_bindings : [];
    var alreadySelected = selectedSignalName() === signalName;
    if (alreadySelected && bindings.indexOf(signalName) >= 0) return Promise.resolve(null);
    model.pendingMainSignal = signalName;
    setSignalTableMutationBusy(true, signalName);
    return mutate(function () {
      var currentPane = paneById(model.activePane);
      if (!currentPane) {
        var error = new Error("Контекст области изменился; повторите действие.");
        error.code = "pane_context_changed";
        return Promise.reject(error);
      }
      var visibleSignals = Array.isArray(currentPane.signal_bindings) ? currentPane.signal_bindings.slice() : [];
      if (visibleSignals.indexOf(signalName) < 0) visibleSignals.push(signalName);
      visibleSignals=signalNamesInInventoryOrder(visibleSignals);
      return api.view({ state_revision:model.revision, row_selected_signal:signalName, analysis_signal:signalName, visible_signals:visibleSignals });
    }, { preservePlots:true }).then(function (snapshot) {
      syncSignalSamplesWithMain();
      model.pendingMainSignal = "";
      setSignalTableMutationBusy(false, "");
      return snapshot;
    }).catch(function (error) {
      model.pendingMainSignal = "";
      setSignalTableMutationBusy(false, "");
      showToast(safeErrorText(error, "Не удалось выбрать основной сигнал."), true);
      return null;
    });
  }

  function focusAreaSettings(paneId) {
    var pane = paneById(paneId);
    if (!pane) return;
    var display=activeDisplay();
    if (display && model.activePane) finishRangeLifecycleForNavigation(display.id,model.activePane);
    model.settingsPage = "display";
    if (pane.id === model.activePane) {
      renderSettings(activeDisplay());
      return;
    }
    postLayout({ operation: "select_pane", pane_id:pane.id }, { preservePlots:true, skipOutput:true }).catch(function (error) {
      showToast(safeErrorText(error, "Не удалось выбрать область."), true);
    });
  }

  function showToast(copy, warning) {
    var toast = q("[data-testid='layout-toast']");
    if (!toast) return;
    toast.hidden = false;
    toast.classList.toggle("is-warning", !!warning);
    toast.querySelector("[data-toast-copy]").textContent = copy;
    window.clearTimeout(model.toastTimer);
    model.toastTimer = window.setTimeout(function () { toast.hidden = true; }, 3500);
  }

  function applySettings() {
    var footer = q("[data-testid='settings-footer']");
    var display = activeDisplay();
    var draft = display && screenDraftFor(display);
    var state = areaScreenApplyState(draft);
    if (!footer || !display || !draft || draft.displayId !== display.id || model.screenApplying || state.invalid || !state.dirty) return;
    var displayId = display.id;
    var limitIds = screenLimitFieldIds(draft);
    var linkIds = ["time.link_time", "time.link_amplitude", "spectrum.link_frequency", "spectrum.link_magnitude"];
    var resize = draft.rows !== draft.initialRows || draft.columns !== draft.initialColumns;
    var linksDirty = draft.linkTime !== draft.initialLinkTime || draft.linkAmplitude !== draft.initialLinkAmplitude || draft.linkFrequency !== draft.initialLinkFrequency || draft.linkMagnitude !== draft.initialLinkMagnitude;
    var needsSettingsApply = state.areaDirty || state.screenFieldsDirty || linksDirty;
    var applyToken = ++model.screenApplyToken;
    var pageActivationToken = model.settingsPageActivationToken;
    model.screenApplying = true;
    draft.error = "";
    footer.dataset.phase = "applying";
    footer.dataset.loaderEpisodeKey = "settings-area-screen::" + displayId + "::" + String(model.revision);
    footer.dataset.message = "Применяем настройки области и экрана";
    renderApply();
    var publicationTarget=-1;
    function applyLatest(retries) {
      if (!activeDisplay() || activeDisplay().id !== displayId) return Promise.reject(new Error("Контекст экрана изменился; повторите действие."));
      publicationTarget=model.settingsPublishWanted;
      return settings.commit().catch(function (error) {
        var current = error && error.payload && (error.payload.current || error.payload.state);
        if (error && error.status === 409 && retries < 1 && current) {
          if (accept(current)) renderActivePaneContext();
          else if (typeof current.state_revision === "number") {
            model.revision = Math.max(model.revision, current.state_revision);
            settings.setRevision(current.state_revision);
          }
          return applyLatest(retries + 1);
        }
        throw error;
      });
    }
    var result = Promise.resolve();
    if (resize) result = result.then(function () {
      return postLayout({ operation:"resize", variant:draft.rows + "x" + draft.columns, rows:draft.rows, columns:draft.columns }, { skipSettings:true, skipOutput:true });
    });
    result = result.then(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId) throw new Error("Контекст экрана изменился; повторите действие.");
      return persistLayoutLinks(draft);
    }).then(function () {
      return settings.flush();
    }).then(function () {
      return needsSettingsApply ? applyLatest(0) : null;
    }).then(function (response) {
      if (response && response.success === false) throw new Error(response.error || "Сервер отклонил настройки.");
      if (response) {
        model.revision = Math.max(model.revision, response.state_revision || model.revision);
        model.settingsCommittedRevision = Math.max(model.settingsCommittedRevision, response.state_revision || -1);
        model.settingsPublishPublished = Math.max(model.settingsPublishPublished, publicationTarget);
        settings.setRevision(model.revision);
        if (response.settings && typeof settings.accept === "function") settings.accept(response.settings);
        consumePublicationBatch(publicationTarget);
      }
      return response;
    });
    boundedApply(result, 10000).then(function () {
      if (applyToken !== model.screenApplyToken) return;
      model.screenApplying = false;
      previewScreenLinks(null);
      model.screenDraft = null;
      footer.dataset.phase = "pristine";
      footer.dataset.message = "";
      settings.markApplied();
      if (pageActivationToken === model.settingsPageActivationToken) renderSettings(activeDisplay());
      else renderApply();
      showToast("Настройки применены", false);
      refreshSnapshot(render).catch(function () {});
      output(true);
      if (model.settingsPublishWanted > model.settingsPublishPublished) scheduleSettingsPublication(model.settingsPublishWanted);
    }).catch(function (error) {
      if (applyToken !== model.screenApplyToken) return;
      model.screenApplying = false;
      if (model.screenDraft && model.screenDraft.displayId === displayId) model.screenDraft.error = error.message || "Не удалось применить настройки.";
      footer.dataset.phase = error.status === 409 ? "stale" : "error";
      footer.dataset.message = error.message || "Не удалось применить настройки.";
      if (pageActivationToken === model.settingsPageActivationToken) renderSettings(activeDisplay());
      else renderApply();
      showToast(footer.dataset.message, true);
      if (model.settingsPublishWanted > model.settingsPublishPublished) scheduleSettingsPublication(model.settingsPublishWanted);
    });
  }

  function renderLayoutDraft() {
    var draft = model.layoutDraft;
    ["rows", "columns"].forEach(function (axis) {
      var holder = q("[data-layout-" + axis + "]");
      holder.innerHTML = Array.from({ length: 10 }, function (_, index) {
        var value = index + 1;
        return "<button class='segment" + (draft[axis] === value ? " is-selected" : "") + "' type='button' data-layout-" + axis + "='" + value + "' aria-pressed='" + (draft[axis] === value) + "'>" + value + "</button>";
      }).join("");
    });
    var preview = q(".layout-preview");
    preview.style.gridTemplateColumns = "repeat(" + draft.columns + ", minmax(0, 1fr))";
    preview.style.gridTemplateRows = "repeat(" + draft.rows + ", minmax(0, 1fr))";
    preview.innerHTML = Array.from({ length:draft.rows * draft.columns }, function () { return "<i></i>"; }).join("");
    q("[data-layout-warning]").hidden = draft.rows <= 4 && draft.columns <= 4;
  }
  function repositionLayout() {
    var popover = q("[data-testid='layout-popover']"), trigger = q("[data-testid='layout-trigger']");
    if (!popover || !trigger || popover.hidden) return;
    var rect = trigger.getBoundingClientRect(), width = popover.offsetWidth, height = popover.offsetHeight;
    popover.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width)) + "px";
    popover.style.top = Math.min(window.innerHeight - height - 8, Math.max(8, rect.bottom + 6)) + "px";
  }
  function openLayout(trigger) {
    if (!model.layout) return;
    if (model.layoutDraft) return closeLayout();
    model.layoutDraft = {
      rows:model.layout.rows,
      columns:model.layout.columns,
      trigger:trigger
    };
    renderLayoutDraft();
    q("[data-testid='layout-popover']").hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    repositionLayout();
    var close = q("[data-layout-close]");
    if (close) close.focus();
  }
  function closeLayout() {
    var popover = q("[data-testid='layout-popover']");
    var trigger = model.layoutDraft && model.layoutDraft.trigger;
    popover.hidden = true;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
    model.layoutDraft = null;
  }

  function persistLayoutLinks(draft) {
    var result = Promise.resolve();
    if (draft.linkTime !== draft.initialLinkTime) result = result.then(function () { return settings.setValue("time.link_time", draft.linkTime); });
    if (draft.linkAmplitude !== draft.initialLinkAmplitude) result = result.then(function () { return settings.setValue("time.link_amplitude", draft.linkAmplitude); });
    if (draft.linkFrequency !== draft.initialLinkFrequency) result = result.then(function () { return settings.setValue("spectrum.link_frequency", draft.linkFrequency); });
    if (draft.linkMagnitude !== draft.initialLinkMagnitude) result = result.then(function () { return settings.setValue("spectrum.link_magnitude", draft.linkMagnitude); });
    return result;
  }

  function openScreenSettingsFromLayout() {
    closeLayout();
    model.settingsPage = "screen";
    renderSettings(activeDisplay());
    window.requestAnimationFrame(function () {
      var tab = q("[data-testid='settings-tab-screen']");
      if (tab) tab.focus();
    });
  }

  function completePendingApply() {
    var footer = q("[data-testid='settings-footer']");
    if (!footer || footer.dataset.phase !== "pending") return;
    footer.dataset.phase = "pristine";
    footer.dataset.message = "";
    settings.markApplied();
    renderApply();
    showToast("График обновлён", false);
  }

  var signalOperationMarkup=`<div class="modal-layer native-modal-layer" data-testid="signal-operation-layer" hidden>
  <section class="dialog-card signal-operation-dialog" role="dialog" aria-modal="true" aria-labelledby="signal-operation-title" data-testid="signal-operation-dialog">
    <header class="dialog-titlebar">
      <h2 id="signal-operation-title" tabindex="-1">Операция над сигналом</h2>
      <button class="icon-button dialog-close" type="button" data-signal-operation-close aria-label="Закрыть операцию над сигналом"><img src="./icons/close.svg" alt=""></button>
    </header>
    <div class="dialog-body" data-signal-operation-form></div>
    <footer class="dialog-footer">
      <button class="button" type="button" data-signal-operation-cancel>Отмена</button>
      <button class="button button-primary" type="button" data-signal-operation-submit>Создать сигнал</button>
    </footer>
  </section>
</div>
<div class="modal-layer native-modal-layer signal-operation-error-layer" data-testid="signal-operation-error-layer" hidden>
  <section class="dialog-card signal-operation-error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="signal-operation-error-title" aria-describedby="signal-operation-error-message" data-testid="signal-operation-error-dialog">
    <header class="dialog-titlebar">
      <h2 id="signal-operation-error-title" tabindex="-1">Операция не выполнена</h2>
      <button class="icon-button dialog-close" type="button" data-signal-operation-error-close aria-label="Закрыть сообщение об ошибке"><img src="./icons/close.svg" alt=""></button>
    </header>
    <div class="dialog-body">
      <p id="signal-operation-error-message" class="signal-operation-error-message" data-signal-operation-error-message></p>
    </div>
    <footer class="dialog-footer">
      <button class="button button-primary" type="button" data-signal-operation-error-confirm>Понятно</button>
    </footer>
  </section>
</div>`;
  function ensureSignalOperationDialog() {
    var layer = q("[data-testid='signal-operation-layer']");
    if (layer) return layer;
    document.body.insertAdjacentHTML("beforeend", signalOperationMarkup);
    return q("[data-testid='signal-operation-layer']");
  }

  function preprocessOperation() { return window.SignalAnalyserPreprocessOperation || null; }
  function selectedOperationLabel(options,value) {
    var selected=(options || []).filter(function (option) { return option.value === value; })[0];
    return selected ? selected.label : "";
  }
  function signalOperationSupported(helper,operation) {
    return !!helper && helper.operationOptions().some(function (option) { return option.value === operation; });
  }
  function signalOperationStatusMarkup(state) {
    if (state.busy) return "<div class='operation-status status-note info operation-progress' role='status'><img src='./icons/Spinner.svg' alt=''><span>Выполняется преобразование и проверка результата…</span></div>";
    if (state.success) return "<div class='operation-status status-note success' role='status'><strong>Сигнал создан.</strong> Результат прошёл проверку и добавлен одной операцией.</div>";
    return "";
  }
  function signalOperationFieldMarkup(field,error,busy) {
    var value=field.value == null ? "" : field.value,disabled=busy || field.disabled,control;
    if (field.type === "select") {
      control="<select class='signal-operation-control' data-signal-operation-parameter='"+esc(field.id)+"' data-testid='"+esc(field.testid)+"' aria-invalid='"+String(!!error)+"'"+(disabled ? " disabled" : "")+">"+(field.options || []).map(function (option) { return "<option value='"+esc(option.value)+"'"+(option.value === value ? " selected" : "")+">"+esc(option.label)+"</option>"; }).join("")+"</select>";
    } else if (field.type === "textarea") {
      control="<textarea class='signal-operation-control' data-signal-operation-parameter='"+esc(field.id)+"' data-testid='"+esc(field.testid)+"' aria-invalid='"+String(!!error)+"' placeholder='Введите выражение' spellcheck='false'"+(disabled ? " disabled" : "")+">"+esc(value)+"</textarea>";
    } else {
      control="<input class='signal-operation-control' type='text' inputmode='"+(field.type === "number" ? "decimal" : "text")+"' value='"+esc(value)+"' data-signal-operation-parameter='"+esc(field.id)+"' data-testid='"+esc(field.testid)+"' aria-invalid='"+String(!!error)+"'"+(field.placeholder ? " placeholder='"+esc(field.placeholder)+"'" : "")+(disabled ? " disabled" : "")+" autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'>";
    }
    return "<div class='signal-operation-row"+(error ? " has-error" : "")+"' data-signal-operation-field='"+esc(field.id)+"'><label>"+esc(field.label)+"</label><div class='signal-operation-control-wrap'>"+control+(field.unit ? "<span class='signal-operation-unit'>"+esc(field.unit)+"</span>" : "")+"</div>"+(error ? "<p class='signal-operation-field-message' role='alert'>"+esc(error)+"</p>" : field.hint ? "<p class='signal-operation-field-hint'>"+esc(field.hint)+"</p>" : "")+"</div>";
  }

  function renderSignalOperation() {
    var state=model.signalOperation, layer=ensureSignalOperationDialog(), form=layer.querySelector("[data-signal-operation-form]"), helper=preprocessOperation(), operationState=state.operationState;
    if (!helper || !operationState) { layer.hidden=!state.open; return; }
    var busy=state.busy,operationOptions=helper.operationOptions();
    if (!signalOperationSupported(helper,operationState.operation)) {
      operationState=helper.createState(operationState.source);
      state.operationState=operationState;
      state.validation=null;
      state.success=false;
    }
    var operationSelect=valueSelect.markup({
      key:"signal-operation-type",value:operationState.operation,label:selectedOperationLabel(operationOptions,operationState.operation),options:operationOptions,
      testId:"signal-operation-select",ariaLabel:"Операция",disabled:busy,className:"settings-value-select",
      onSelect:function (value) { state.operationState=helper.switchOperation(operationState,value); state.success=false; state.validation=null; renderSignalOperation(); }
    });
    var validation=state.validation || {errors:{},availability:helper.availability(operationState)},fields=helper.schema(operationState);
    form.innerHTML="<div class='signal-operation-form' data-operation-section='preprocess'><div class='signal-operation-row'><span class='signal-operation-label'>Исходный сигнал</span><input class='signal-operation-control' data-testid='signal-operation-source' value='"+esc(operationState.source && operationState.source.name)+"' readonly></div><div class='signal-operation-row'><span class='signal-operation-label'>Операция</span><div>"+operationSelect+"</div></div><div class='signal-operation-parameter-list'>"+fields.map(function (field) { return signalOperationFieldMarkup(field,validation.errors[field.id],busy); }).join("")+"</div>"+(!validation.availability.available ? "<div class='signal-operation-availability' role='status'>"+esc(validation.availability.message)+"</div>" : "")+(fields.some(function (field) { return field.nullableAuto; }) ? "<p class='signal-operation-auto-note'>Пустое поле со значением «Авто» передаётся как автоматический параметр, а не как ноль.</p>" : "")+"<div class='signal-operation-row"+(validation.errors.target_name ? " has-error" : "")+"'><label for='signal-operation-name'>Имя нового сигнала</label><input id='signal-operation-name' class='signal-operation-control' data-signal-operation-name value='"+esc(operationState.targetName)+"' aria-invalid='"+String(!!validation.errors.target_name)+"'"+(busy ? " disabled" : "")+" autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'>"+(validation.errors.target_name ? "<p class='signal-operation-field-message' role='alert'>"+esc(validation.errors.target_name)+"</p>" : "")+"</div><div class='signal-operation-row signal-operation-overwrite-row'><span class='signal-operation-label'></span><label class='checkbox-field'><input type='checkbox' data-signal-operation-overwrite"+(operationState.overwrite ? " checked" : "")+(busy ? " disabled" : "")+"><span>Затирать сигнал с таким именем</span></label></div>"+signalOperationStatusMarkup(state)+"</div>";
    decorateNoHistory(form);
    layer.hidden=!state.open;
    var shell=q("[data-testid='app-shell']"); if (shell) shell.inert=state.open;
    layer.querySelector("[data-signal-operation-submit]").disabled=busy || state.success || !validation.availability.available;
    layer.querySelector("[data-signal-operation-cancel]").disabled=busy;
    layer.querySelector("[data-signal-operation-close]").disabled=busy;
    valueSelect.reconcile();
  }

  function openSignalOperation(trigger) {
    var helper=preprocessOperation(),selected=mainSignalForPane(paneById(model.activePane)),signalId=stableSignalId(selected);
    var source=(model.state && model.state.signals || []).filter(function (signal) { return stableSignalId(signal) === String(signalId); })[0];
    if (!helper || !source) return false;
    if (window.SignalAnalyserOperationErrorDialog) window.SignalAnalyserOperationErrorDialog.close();
    var restore=trigger && trigger.isConnected ? trigger : document.activeElement && document.activeElement.isConnected ? document.activeElement : q("[data-testid='app-shell']");
    var operationSource=Object.assign({},source,{sampling_kind:"uniform",complex:/комплекс|complex/i.test(String(source.data_type || ""))});
    model.signalOperation={open:true,source:source,operationState:helper.createState(operationSource),busy:false,success:false,validation:null,trigger:restore};
    renderSignalOperation();
    window.requestAnimationFrame(function () { var trigger=q("[data-testid='signal-operation-select']"); if (trigger) trigger.focus(); });
    return true;
  }

  function closeSignalOperation() {
    var state=model.signalOperation;
    if (state.busy) return false;
    if (window.SignalAnalyserOperationErrorDialog) window.SignalAnalyserOperationErrorDialog.close();
    state.open=false;
    valueSelect.close(false);
    renderSignalOperation();
    var restore=state.trigger; state.trigger=null;
    window.requestAnimationFrame(function () { if (restore && restore.isConnected && typeof restore.focus === "function") restore.focus(); });
    return true;
  }

  function submitSignalOperation() {
    var state=model.signalOperation,layer=q("[data-testid='signal-operation-layer']"),helper=preprocessOperation();
    if (!state.open || state.busy || !layer || !helper || !state.operationState) return;
    if (!signalOperationSupported(helper,state.operationState.operation)) {
      state.operationState=helper.createState(state.operationState.source);
      state.validation=null;
      state.success=false;
      renderSignalOperation();
      return;
    }
    var validation=helper.validate(state.operationState);
    state.validation=validation;
    if (!validation.valid) {
      renderSignalOperation();
      var invalid=layer.querySelector(".signal-operation-row.has-error input, .signal-operation-row.has-error select, .signal-operation-row.has-error textarea");
      if (invalid) invalid.focus();
      return;
    }
    var payload=Object.assign({state_revision:model.revision},helper.payload(state.operationState));
    state.busy=true; state.success=false; state.validation=null; renderSignalOperation();
    api.deriveSignal(payload).then(function (response) {
      var snapshot=response && (response.state || response); if (snapshot && snapshot.displays) accept(snapshot);
      state.busy=false; state.success=true; renderSignalOperation(); render();
    }).catch(function (error) {
      state.busy=false;
      var payloadError=error && error.payload && error.payload.error || {},fieldErrors=payloadError && payloadError.fields,visibleFields={target_name:true},localErrors={};
      helper.schema(state.operationState).forEach(function (field) { visibleFields[field.id]=true; });
      if (fieldErrors && typeof fieldErrors === "object") Object.keys(fieldErrors).forEach(function (key) { if (visibleFields[key]) localErrors[key]=fieldErrors[key]; });
      if (Object.keys(localErrors).length) {
        state.validation={errors:localErrors,availability:helper.availability(state.operationState)};
        renderSignalOperation();
        var invalid=layer.querySelector(".signal-operation-row.has-error input, .signal-operation-row.has-error select, .signal-operation-row.has-error textarea");
        if (invalid) invalid.focus();
        return;
      }
      renderSignalOperation();
      var errorDialog=window.SignalAnalyserOperationErrorDialog;
      if (errorDialog) errorDialog.open({status:error && error.status,code:payloadError.code},{submit:q("[data-signal-operation-submit]")});
    });
  }

  function openPreprocessFromHost(event) {
    var helper=preprocessOperation(),command=helper && helper.hostCommand;
    if (!command || !command.accepts(event)) return;
    var source=mainSignalForPane(paneById(model.activePane));
    if (!source || !stableSignalId(source)) {
      if (!model.signalOperation.open) showToast("Предобработка недоступна: выберите сигнал в таблице.",true);
      return;
    }
    openSignalOperation(document.activeElement);
  }
  window.addEventListener("signal-analyser:host-command",openPreprocessFromHost);
  document.addEventListener("keydown",function (event) {
    var state=model.signalOperation,layer=q("[data-testid='signal-operation-layer']"),errorLayer=q("[data-testid='signal-operation-error-layer']");
    if (!state.open || !layer || layer.hidden || errorLayer && !errorLayer.hidden || event.defaultPrevented) return;
    if (event.key === "Escape" && !state.busy) { event.preventDefault(); closeSignalOperation(); return; }
    if (event.key !== "Tab") return;
    var dialog=layer.querySelector("[data-testid='signal-operation-dialog']"),items=dialog ? qa("[data-testid='signal-operation-dialog'] button:not(:disabled), [data-testid='signal-operation-dialog'] input:not(:disabled), [data-testid='signal-operation-dialog'] select:not(:disabled), [data-testid='signal-operation-dialog'] textarea:not(:disabled), [data-testid='signal-operation-dialog'] [tabindex]:not([tabindex='-1'])") : [];
    if (!items.length) { event.preventDefault(); return; }
    var first=items[0],last=items[items.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  function applySignalMetadata() {
    var editor=model.signalEditor;
    if (!editor || !editor.signalId || !editor.draft || editor.applying || !editor.dirty) return;
    var sampleRate=signalSampleRateValidation(editor.draft.sample_rate_hz);
    if (!sampleRate.valid) { showToast(sampleRate.error, true); return; }
    var draft={ name:editor.draft.name, color:editor.draft.color, sample_rate_hz:editor.draft.sample_rate_hz };
    var submittedIntent=editor.intent || 0;
    editor.saveQueued=false;
    editor.applying=true; renderSettings(activeDisplay()); renderApply();
    mutate(function () {
      return api.updateSignalMetadata({ state_revision:model.revision, operation:"update_metadata", signal_id:editor.signalId, name:draft.name, color:draft.color, sample_rate_hz:sampleRate.value });
    }, { preservePlots:true, skipSettings:true }).then(function () {
      if (model.signalEditor !== editor) return;
      var newer=(editor.intent || 0) > submittedIntent || editor.saveQueued;
      editor.dirty=newer;
      editor.applying=false;
      editor.saveQueued=false;
      if (activeSignalNameEditor()) renderApply(); else render();
      if (newer) scheduleSignalMetadataSave();
    }).catch(function (error) {
      if (model.signalEditor !== editor) return;
      var newer=(editor.intent || 0) > submittedIntent || editor.saveQueued;
      editor.applying=false;
      editor.saveQueued=false;
      editor.dirty=true;
      releaseActiveSignalNameEditor();
      showToast(safeErrorText(error, "Не удалось обновить сигнал."), true);
      renderSettings(activeDisplay());
      renderApply();
      if (newer) scheduleSignalMetadataSave();
    });
  }

  function scheduleSignalMetadataSave() {
    var editor=model.signalEditor;
    if (!editor) return;
    window.clearTimeout(editor.saveTimer);
    editor.saveTimer=window.setTimeout(function () {
      editor.saveTimer=null;
      applySignalMetadata();
    }, 150);
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.paneTrimSignal !== undefined) return void openSignalTrim(button);
    if (button.dataset.signalTrimSubmit !== undefined) return void submitSignalTrim();
    if (button.dataset.signalTrimCancel !== undefined || button.dataset.signalTrimClose !== undefined) { var trimController=signalTrimController(); if (trimController) trimController.close(); return; }
    if (button.dataset.testid === "toolbar-import") return void openSessionFilePicker(button);
    if (button.dataset.testid === "toolbar-save") return void openSessionSave(button);
    if (button.dataset.inspectorStateAction) return void changeWorkspaceInspectorState(button);
    if (button.dataset.testid === "display-scroll-left") return void scrollDisplayTabs(-1);
    if (button.dataset.testid === "display-scroll-right") return void scrollDisplayTabs(1);
    if (button.dataset.displaySelect) { var selectedFrom=activeDisplay(); if (selectedFrom) finishRangeLifecycleForNavigation(selectedFrom.id,null); model.settingsPage="screen"; renderSettings(activeDisplay()); return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "select", display_id: button.dataset.displaySelect }); }); }
    if (button.dataset.displayClose) return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "close", display_id: button.dataset.displayClose }); });
    if (button.dataset.testid === "add-display") { model.settingsPage="screen"; renderSettings(activeDisplay()); return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "create" }); }); }
    if (button.dataset.testid === "layout-trigger") return void openLayout(button);
    if (button.dataset.layoutClose !== undefined || button.dataset.layoutCancel !== undefined) return void closeLayout();
    if (button.dataset.layoutRows || button.dataset.layoutColumns) { model.layoutDraft[button.dataset.layoutRows ? "rows" : "columns"] = Number(button.dataset.layoutRows || button.dataset.layoutColumns); return void renderLayoutDraft(); }
    if (button.dataset.layoutScreenSettings !== undefined) return void openScreenSettingsFromLayout();
    if (button.dataset.layoutApply !== undefined) { var draft = model.layoutDraft; var displayId = activeDisplay() && activeDisplay().id; closeLayout(); return void postLayout({ operation: "resize", variant: draft.rows + "x" + draft.columns, rows: draft.rows, columns: draft.columns }).then(function () { if (model.screenDraft && model.screenDraft.displayId === displayId) { model.screenDraft.rows = draft.rows; model.screenDraft.columns = draft.columns; model.screenDraft.initialRows = draft.rows; model.screenDraft.initialColumns = draft.columns; } else model.screenDraft = null; if (activeDisplay() && activeDisplay().id === displayId) showToast("Макет " + draft.rows + " × " + draft.columns + " применён", false); }).catch(function (error) { showToast(error.message || "Не удалось применить макет.", true); }); }
    if (button.dataset.screenLayoutRows !== undefined || button.dataset.screenLayoutColumns !== undefined) {
      var screenAxis = button.dataset.screenLayoutRows !== undefined ? "rows" : "columns";
      var screenValue = Number(button.dataset.screenLayoutRows !== undefined ? button.dataset.screenLayoutRows : button.dataset.screenLayoutColumns);
      setScreenLayoutAxis(screenAxis, screenValue);
      window.requestAnimationFrame(function () { var restored = q("[data-screen-layout-" + screenAxis + "='" + screenValue + "']"); if (restored) restored.focus(); });
      return;
    }
    if (button.dataset.screenSettingsGroupToggle) {
      var screenGroup = button.dataset.screenSettingsGroupToggle;
      model.screenCollapsed[screenGroup] = button.getAttribute("aria-expanded") === "true";
      renderScreenSettings(activeDisplay());
      window.requestAnimationFrame(function () { var restored = q("[data-screen-settings-group-toggle='" + screenGroup + "']"); if (restored) restored.focus(); });
      return;
    }
    if (button.dataset.signalSettingsGroupToggle) {
      var signalGroup = button.dataset.signalSettingsGroupToggle;
      if (model.signalEditor && model.signalEditor.collapsed) {
        model.signalEditor.collapsed[signalGroup] = button.getAttribute("aria-expanded") === "true";
        renderSignalSettings(paneById(model.activePane));
        window.requestAnimationFrame(function () { var restored = q("[data-signal-settings-group-toggle='" + signalGroup + "']"); if (restored) restored.focus(); });
      }
      return;
    }
    if (button.dataset.extremaAction !== undefined) return void calculatePeaks();
    if (button.dataset.testid === "extrema-configure") return void configureActivePeaks();
    if (button.dataset.testid === "extrema-values") return void calculatePeaks();
    if (button.dataset.testid === "signal-values-action") return void showSignalSamples();
    if (button.dataset.testid === "sample-columns-menu-trigger") return void openSampleColumnsMenu(button);
    if (button.dataset.sampleColumnVisible !== undefined) return void toggleSampleColumn(button.dataset.sampleColumnVisible);
    if (button.dataset.testid === "signals-add-action") return void openSignalAddDialog(button);
    if (button.dataset.signalAddClose !== undefined || button.dataset.signalAddCancel !== undefined) return void closeSignalAddDialog(true);
    if (button.dataset.signalAddRetry !== undefined) return void loadSignalAddCatalog(true);
    if (button.dataset.signalAddSubmit !== undefined) return void submitSignalAddDialog();
    if (button.dataset.signalDelete) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "delete", signal_name: button.dataset.signalDelete }); });
    if (button.dataset.signalDuplicate) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "duplicate", signal_name: button.dataset.signalDuplicate }); });
    if (button.dataset.signalOperation) return void openSignalOperation(button);
    if (button.dataset.signalOperationClose !== undefined || button.dataset.signalOperationCancel !== undefined) return void closeSignalOperation();
    if (button.dataset.signalOperationSubmit !== undefined) return void submitSignalOperation();
    if (button.dataset.settingsPage) {
      var requestedPage=button.dataset.settingsPage, available=contextTabAvailable(requestedPage,paneById(model.activePane)), regression=task0153Controller();
      var intent=regression && typeof regression.settingsTabIntent === "function" ? regression.settingsTabIntent(requestedPage,{available:available,applying:model.screenApplying,currentPage:model.settingsPage,activationToken:model.settingsPageActivationToken}) : {accepted:available,page:requestedPage,activationToken:model.settingsPageActivationToken + (available ? 1 : 0)};
      if (!intent.accepted) return;
      var settingsDisplay=activeDisplay();
      if (settingsDisplay) finishRangeLifecycleForNavigation(settingsDisplay.id,null);
      model.settingsPage=intent.page;
      model.settingsPageActivationToken=intent.activationToken;
      renderSettings(activeDisplay());
      if (model.settingsPage === "peaks") loadPeaks();
      return;
    }
    if (button.dataset.paneMenu) return void openPaneMenu(button);
    if (button.matches("[data-plot-clear]")) return void openPaneClearConfirm();
    if (button.dataset.plotRangeSlider !== undefined) return void togglePaneRangeSlider();
    if (button.dataset.plotAmplitudeSlider !== undefined) return void togglePaneAmplitudeSlider();
    if (button.dataset.plotCursorMode !== undefined) return void togglePaneGraphCursor(button.dataset.plotCursorMode);
    if (button.matches("[data-plot-help]")) return void (q("[data-testid='graph-help-overlay']").hidden ? openGraphHelp(button) : closeGraphHelp(true));
    if (button.dataset.graphHelpClose !== undefined) return void closeGraphHelp(true);
    if (button.dataset.paneClearCancel !== undefined) return void closePaneClearConfirm(true);
    if (button.dataset.paneClearConfirm !== undefined) return void confirmPaneClear();
    if (button.dataset.testid === "signal-columns-menu-trigger") { var columns = q("[data-testid='signal-columns-menu']"); if (!columns.hidden) return void closeColumnMenu(true); renderColumnMenu(); columns.hidden = false; button.setAttribute("aria-expanded", "true"); positionMenu(columns, button, 244); var firstColumn = columns.querySelector("button"); if (firstColumn) firstColumn.focus(); return; }
    if (button.dataset.columnVisible !== undefined) { var key = button.dataset.columnVisible; model.visibleColumns[key] = !model.visibleColumns[key]; renderInspector(); renderColumnMenu(); var menuTrigger = q("[data-testid='signal-columns-menu-trigger']"); if (menuTrigger) menuTrigger.setAttribute("aria-expanded", "true"); positionMenu(q("[data-testid='signal-columns-menu']"), menuTrigger, 244); return; }
    if (button.dataset.testid === "measurement-columns-menu-trigger") { var measurementsMenu = q("[data-testid='measurement-columns-menu']"); if (!measurementsMenu.hidden) return void closeMeasurementMenu(true); renderMeasurementMenu(); measurementsMenu.hidden = false; button.setAttribute("aria-expanded", "true"); positionMenu(measurementsMenu, button, 244); var firstMeasurement = measurementsMenu.querySelector("button"); if (firstMeasurement) firstMeasurement.focus(); return; }
    if (button.dataset.measurementCursorColumn !== undefined) {
      var cursorDisplay=activeDisplay(), cursorPane=paneById(model.activePane), cursorController=measurementCursorColumnsController();
      if (!cursorDisplay || !cursorPane || !cursorController) return;
      var cursorKey=paneRuntimeKey(cursorDisplay.id,cursorPane.id), cursorSnapshot=model.measurementCursorSnapshotByPane[cursorKey] || null;
      cursorController.toggle(cursorKey,button.dataset.measurementCursorColumn,cursorSnapshot,cursorPane.plot_type);
      renderMeasurementMenu();
      renderInspector();
      var cursorMenu=q("[data-testid='measurement-columns-menu']"), cursorTrigger=q("[data-testid='measurement-columns-menu-trigger']");
      if (cursorMenu && cursorTrigger) { cursorMenu.hidden=false; cursorTrigger.setAttribute("aria-expanded","true"); positionMenu(cursorMenu,cursorTrigger,244); var restoredCursor=cursorMenu.querySelector("[data-measurement-cursor-column='"+CSS.escape(button.dataset.measurementCursorColumn)+"']"); if (restoredCursor) restoredCursor.focus(); }
      return;
    }
    if (button.dataset.measurementVisible !== undefined) {
      var display = activeDisplay(), selected = display && Array.isArray(display.measurement_kinds) ? display.measurement_kinds.slice() : [], measurementKey = button.dataset.measurementVisible, measurementIndex = selected.indexOf(measurementKey);
      if (measurementIndex >= 0) selected.splice(measurementIndex, 1); else selected.push(measurementKey);
      var canonical = measurementOptions.map(function (measurement) { return measurement.id; }).filter(function (kind) { return selected.indexOf(kind) >= 0; });
      var measurementMenu = q("[data-testid='measurement-columns-menu']");
      measurementMenu.classList.add("is-stale");
      return void updateMeasurementKinds(canonical).then(function () {
        measurementMenu.classList.remove("is-stale");
        renderMeasurementMenu();
        var trigger = q("[data-testid='measurement-columns-menu-trigger']");
        if (trigger) trigger.setAttribute("aria-expanded", "true");
        positionMenu(measurementMenu, trigger, 244);
        var restored = measurementMenu.querySelector("[data-measurement-visible='" + measurementKey + "']");
        if (restored) restored.focus();
      }).catch(function (error) { measurementMenu.classList.remove("is-stale"); showToast(safeErrorText(error, "Не удалось изменить измерения."), true); });
    }
    if (button.dataset.bottomTab) { if (!contextTabAvailable(button.dataset.bottomTab, paneById(model.activePane))) return; closeColumnMenu(false); closeMeasurementMenu(false); closeSampleColumnsMenu(false); model.inspectorPage = button.dataset.bottomTab; if (model.inspectorPage === "samples") syncSignalSamplesWithMain({ retry:true }); renderInspector(); if (model.inspectorPage === "measurements") loadMeasurements(); if (model.inspectorPage === "peaks") loadPeaks(); return; }
    if (button.dataset.toastClose !== undefined) q("[data-testid='layout-toast']").hidden = true;
  });
  document.addEventListener("click", function (event) {
    var popover = q("[data-testid='layout-popover']"), trigger = q("[data-testid='layout-trigger']");
    if (!model.layoutDraft || !popover || !trigger) return;
    var path = typeof event.composedPath === "function" ? event.composedPath() : null;
    var fallbackOutside = !popover.contains(event.target) && !trigger.contains(event.target);
    var inside = path ? path.indexOf(popover) >= 0 || path.indexOf(trigger) >= 0 : !fallbackOutside;
    if (!inside) closeLayout();
  });
  document.addEventListener("pointerdown", function (event) {
    var menu = q("[data-testid='display-overflow-menu']"), help = q("[data-testid='graph-help-overlay']");
    if (menu && !menu.hidden && !menu.contains(event.target) && (!help || help.hidden || !help.contains(event.target)) && !event.target.closest("[data-pane-menu]")) closePaneMenu(true);
    if (help && !help.hidden && !help.contains(event.target) && (!menu || menu.hidden || !menu.contains(event.target))) closeGraphHelp(true);
  });
  document.addEventListener("click", function (event) { var menu=q("[data-testid='signal-columns-menu']"),trigger=q("[data-testid='signal-columns-menu-trigger']");if(!menu||menu.hidden||!trigger)return;var path=typeof event.composedPath==="function"?event.composedPath():null;var inside=path?path.indexOf(menu)>=0||path.indexOf(trigger)>=0:menu.contains(event.target)||trigger.contains(event.target);if(!inside)closeColumnMenu(false); });
  document.addEventListener("click", function (event) { var menu=q("[data-testid='measurement-columns-menu']"),trigger=q("[data-testid='measurement-columns-menu-trigger']");if(!menu||menu.hidden||!trigger)return;var path=typeof event.composedPath==="function"?event.composedPath():null;var inside=path?path.indexOf(menu)>=0||path.indexOf(trigger)>=0:menu.contains(event.target)||trigger.contains(event.target);if(!inside)closeMeasurementMenu(false); });
  document.addEventListener("click", function (event) { var menu=q("[data-testid='sample-columns-menu']"),trigger=q("[data-testid='sample-columns-menu-trigger']") || model.sampleColumnsMenuTrigger;if(!menu||menu.hidden||!trigger)return;var path=typeof event.composedPath==="function"?event.composedPath():null;var inside=path?path.indexOf(menu)>=0||path.indexOf(trigger)>=0:menu.contains(event.target)||trigger.contains(event.target);if(!inside)closeSampleColumnsMenu(false); });
  document.addEventListener("keydown", function (event) {
    var helper=signalTrimHelper(), layer=helper && q(helper.selectors.layer), controller=model.signalTrimController;
    if (!layer || layer.hidden || !controller) return;
    if (event.key === "Escape") { if (!controller.isBusy()) { event.preventDefault(); event.stopImmediatePropagation(); controller.close(); } return; }
    if (event.key !== "Tab") return;
    var focusable=Array.prototype.slice.call(layer.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex='-1'])"));
    if (!focusable.length) return;
    var first=focusable[0], last=focusable[focusable.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener("keydown", function (event) {
    var trigger=event.target.closest && event.target.closest("[data-testid='sample-columns-menu-trigger']");
    if (trigger && event.key === "ArrowDown") { event.preventDefault(); openSampleColumnsMenu(trigger); return; }
    var menu=event.target.closest && event.target.closest("[data-testid='sample-columns-menu']");
    if (!menu) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeSampleColumnsMenu(true); return; }
    if (event.key === "Tab") { closeSampleColumnsMenu(false); return; }
    if (["ArrowDown","ArrowUp","Home","End"].indexOf(event.key) < 0) return;
    var items=Array.prototype.slice.call(menu.querySelectorAll("button:not(:disabled)")), current=items.indexOf(document.activeElement), next=current;
    if (!items.length) return;
    if (event.key === "Home") next=0; else if (event.key === "End") next=items.length-1; else if (event.key === "ArrowDown") next=(current+1+items.length)%items.length; else next=(current-1+items.length)%items.length;
    event.preventDefault(); items[next].focus();
  });
  document.addEventListener("keydown", function (event) { var clearLayer=q("[data-testid='pane-clear-confirm-layer']"), help=q("[data-testid='graph-help-overlay']"), paneMenu=q("[data-testid='display-overflow-menu']"), addLayer=signalAddLayer(); if (event.key === "Escape" && model.sessionImport.open && !model.sessionImport.busy) { event.preventDefault(); closeSessionImport(true); return; } if (event.key === "Escape" && clearLayer && !clearLayer.hidden) { event.preventDefault(); closePaneClearConfirm(true); return; } if (event.key === "Escape" && help && !help.hidden) { event.preventDefault(); closeGraphHelp(true); return; } if (event.key === "Escape" && paneMenu && !paneMenu.hidden) { event.preventDefault(); closePaneMenu(true); return; } if (event.key === "Escape" && addLayer && !addLayer.hidden) { event.preventDefault(); if (model.signalAddSearch) { model.signalAddSearch=""; renderSignalAddCatalog(); var search=q("[data-signal-add-search]"); if(search)search.focus(); } else closeSignalAddDialog(true); return; } if (event.key === "Escape" && model.layoutDraft) closeLayout(); else if (event.key === "Escape" && q("[data-testid='measurement-columns-menu']") && !q("[data-testid='measurement-columns-menu']").hidden) closeMeasurementMenu(true); else if (event.key === "Escape") closeColumnMenu(true); var tab = event.target.closest && event.target.closest("[data-bottom-tab]"); if (tab && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].indexOf(event.key) >= 0) { var tabs=qa("[data-bottom-tab]").filter(function (item) { return !item.hidden; }), index=tabs.indexOf(tab); if(event.key === "Home") index=0; else if(event.key === "End") index=tabs.length-1; else index=(index+(["ArrowRight","ArrowDown"].indexOf(event.key)>=0 ? 1 : -1)+tabs.length)%tabs.length; event.preventDefault(); tabs[index].click(); tabs[index].focus(); } });
  document.addEventListener("keydown", function (event) { if (event.key !== "Enter" || !event.target || event.target.dataset.testid !== "sample-point-search-input") return; event.preventDefault(); submitSignalSamplesSearch(event.target.value); });
  document.addEventListener("keydown", function (event) { var menu=event.target.closest && event.target.closest("[data-testid='display-overflow-menu']"); if (!menu || ["ArrowDown","ArrowUp","Home","End"].indexOf(event.key)<0) return; var items=qa("[data-testid='display-overflow-menu'] button:not(:disabled)"), current=items.indexOf(document.activeElement), next=current; if(event.key==="ArrowDown") next=(current+1+items.length)%items.length; else if(event.key==="ArrowUp") next=(current-1+items.length)%items.length; else if(event.key==="Home") next=0; else next=items.length-1; event.preventDefault(); if(items[next]) items[next].focus(); });
  document.addEventListener("keydown", function (event) { var tab=event.target.closest && event.target.closest("[data-settings-page]"); if(tab && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].indexOf(event.key)>=0){var tabs=qa("[data-settings-page]").filter(function (item) { return !item.hidden; }),index=tabs.indexOf(tab);if(event.key==="Home")index=0;else if(event.key==="End")index=tabs.length-1;else index=(index+(["ArrowRight","ArrowDown"].indexOf(event.key)>=0?1:-1)+tabs.length)%tabs.length;event.preventDefault();tabs[index].click();tabs[index].focus();} });
  document.addEventListener("change", function (event) {
    var node = event.target;
    if (node.dataset.signalTrimSource !== undefined) { var trimSourceController=signalTrimController(); if (trimSourceController) trimSourceController.selectSource(node.value); return; }
    if (node.dataset.signalTrimOverwrite !== undefined) { var trimOverwriteController=signalTrimController(); if (trimOverwriteController) trimOverwriteController.setOverwrite(node.checked); return; }
    if (node.dataset.signalOperationOverwrite !== undefined && model.signalOperation.operationState) { model.signalOperation.operationState.overwrite=node.checked; model.signalOperation.validation=null; return; }
    if (node.dataset.signalOperationParameter !== undefined && model.signalOperation.operationState) { var operationHelper=preprocessOperation(); if (operationHelper) { model.signalOperation.operationState=operationHelper.updateParameter(model.signalOperation.operationState,node.dataset.signalOperationParameter,node.value); model.signalOperation.validation=null; model.signalOperation.success=false; renderSignalOperation(); } return; }
    if (node.dataset.settingId === "display.show_axis_labels") { var labelsDisplay=activeDisplay(), labelsPane=paneById(model.activePane), labelsController=axisLabelsController(); if (labelsDisplay && labelsPane && labelsController) labelsController.setVisible(paneRuntimeKey(labelsDisplay.id,labelsPane.id),node.checked); }
    if (node.dataset.spectrumSliderAxis) { var currentDisplay=activeDisplay(), currentPane=paneById(model.activePane); if (currentDisplay && currentPane) setPaneSliderVisibility(currentDisplay.id, currentPane.id, node.dataset.spectrumSliderAxis, node.checked); return; }
    if (node.dataset.screenLinkTime !== undefined && model.screenDraft) { model.screenDraft.linkTime = node.checked; model.screenDraft.error = ""; previewScreenLinks(model.screenDraft); renderScreenSettings(activeDisplay()); scheduleScreenSettingsApply(); window.requestAnimationFrame(function () { var restored=q("[data-testid='screen-link-time']"); if(restored)restored.focus(); }); return; }
    if (node.dataset.screenLinkAmplitude !== undefined && model.screenDraft) { model.screenDraft.linkAmplitude = node.checked; model.screenDraft.error = ""; previewScreenLinks(model.screenDraft); renderScreenSettings(activeDisplay()); scheduleScreenSettingsApply(); window.requestAnimationFrame(function () { var restored=q("[data-testid='screen-link-amplitude']"); if(restored)restored.focus(); }); return; }
    if (node.dataset.screenLinkFrequency !== undefined && model.screenDraft) { model.screenDraft.linkFrequency = node.checked; model.screenDraft.error = ""; renderScreenSettings(activeDisplay()); scheduleScreenSettingsApply(); return; }
    if (node.dataset.screenLinkMagnitude !== undefined && model.screenDraft) { model.screenDraft.linkMagnitude = node.checked; model.screenDraft.error = ""; renderScreenSettings(activeDisplay()); scheduleScreenSettingsApply(); return; }
    if (model.settingsPage === "screen" && ["time.x_limits", "time.y_limits", "spectrum.frequency_limits", "spectrum.y_limits"].indexOf(node.dataset.settingId) >= 0) {
      window.requestAnimationFrame(function () { if (model.settingsPage === "screen" && activeDisplay()) renderScreenSettings(activeDisplay()); });
    }
    if (node.dataset.testid === "native-local-file-input" || node.dataset.testid === "session-package-file-input") { readSessionDocument(node.files && node.files[0]); return; }
    if (node.dataset.visibleAllSignals !== undefined) { var allPane = paneById(model.activePane); if (allPane) return void postLayout({ operation:"update_pane", pane_id:allPane.id, plot_type:allPane.plot_type, signal_bindings:node.checked ? (model.state.signals || []).map(function (signal) { return signal.name; }) : [] }); }
    if (node.dataset.visibleSignal) {
      var activePane = paneById(model.activePane);
      /* Checkbox membership is intentionally independent from the main signal;
         the helper commits only this active pane with postLayout({ operation:"update_pane", pane_id:activePane.id, ... }). */
      if (activePane) return void setActivePaneSignalMembership(node.dataset.visibleSignal, node.checked);
    }
  });
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || target.closest("[data-value-select-key], .signal-row-actions, button, input, select, textarea, a, [contenteditable], .modebar")) return;
    var row = target.closest("[data-signal-row]");
    if (row) {
      var rowCheckbox = row.querySelector("[data-visible-signal]");
      if (rowCheckbox && !rowCheckbox.disabled) setActivePaneMainSignal(rowCheckbox.dataset.visibleSignal);
      return;
    }
    var pane = target.closest("[data-pane-id]");
    if (pane) focusAreaSettings(pane.dataset.paneId);
  });
  document.addEventListener("input", function (event) { if (event.target.dataset.signalTrimName !== undefined) { var trimNameController=signalTrimController(); if (trimNameController) trimNameController.editName(event.target.value); return; } if (model.signalOperation.operationState && event.target.dataset.signalOperationName !== undefined) { model.signalOperation.operationState.targetName=event.target.value; model.signalOperation.operationState.nameDirty=true; model.signalOperation.validation=null; model.signalOperation.success=false; return; } if (model.signalOperation.operationState && event.target.dataset.signalOperationParameter !== undefined && event.target.tagName !== "SELECT") { var operationHelper=preprocessOperation(); if (operationHelper) { model.signalOperation.operationState=operationHelper.updateParameter(model.signalOperation.operationState,event.target.dataset.signalOperationParameter,event.target.value); model.signalOperation.validation=null; model.signalOperation.success=false; } return; } if (event.target.dataset.testid === "signal-search-input") { model.inspectorSearch=event.target.value; renderInspector(); } if (event.target.dataset.testid === "measurement-search-input") { model.measurementSearch=event.target.value; renderInspector(); } if (event.target.dataset.signalMetadata && model.signalEditor.draft) { var metadataKey=event.target.dataset.signalMetadata; model.signalEditor.draft[metadataKey]=event.target.value; model.signalEditor.intent=(model.signalEditor.intent || 0) + 1; if (model.signalEditor.applying) model.signalEditor.saveQueued=true; if (metadataKey === "sample_rate_hz") projectSignalSampleRateValidation(event.target); model.signalEditor.dirty=true; scheduleSignalMetadataSave(); } if (event.target.dataset.peaksSetting && model.peaksDraft && event.target.tagName !== "SELECT") { var input=event.target; model.peaksDraft.values[input.dataset.peaksSetting]=input.value; model.peaksDraft.intent=(model.peaksDraft.intent || 0) + 1; if (model.peaksApplying) model.peaksApplyQueued=true; renderPeaksSettings(activeDisplay(), paneById(model.activePane), model.peaksRecords[peaksSettingsKey(activeDisplay(), paneById(model.activePane))], { id:input.dataset.peaksSetting, start:input.selectionStart, end:input.selectionEnd }); renderApply(); } });
  document.addEventListener("input", function (event) { if (!event.target || event.target.dataset.testid !== "sample-point-search-input") return; var state=model.signalSamples; state.searchValue=event.target.value; state.searchState=""; state.searchMessage=""; var status=q("[data-testid='sample-point-search-status']"); if (status) { status.dataset.state=""; status.textContent=""; } });
  document.addEventListener("input", function (event) {
    var input=event.target;
    if (!input || !input.dataset || input.dataset.rangePart === undefined || !input.dataset.settingId || typeof input.closest === "function" && input.closest("[data-screen-range-slider]")) return;
    rememberRangeBoundaryIntent(input.dataset.settingId, input.dataset.rangePart, input.value);
  }, true);
  document.addEventListener("pointerdown", function (event) {
    var input=event.target, slider=input && input.closest && input.closest("[data-screen-range-slider]");
    if (!slider || input.dataset.screenRangeInput === undefined) return;
    beginSettingsRangeLifecycle(slider);
  }, true);
  document.addEventListener("keydown", function (event) {
    var input=event.target, slider=input && input.closest && input.closest("[data-screen-range-slider]");
    if (!slider || input.dataset.screenRangeInput === undefined || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].indexOf(event.key) < 0) return;
    activeSettingsRangeLifecycle(slider);
  }, true);
  document.addEventListener("input", function (event) {
    var input = event.target, slider = input.closest && input.closest("[data-screen-range-slider]");
    if (!slider || input.dataset.screenRangeInput === undefined) return;
    var minimumInput = slider.querySelector("[data-screen-range-input='min']"), maximumInput = slider.querySelector("[data-screen-range-input='max']");
    var fullMinimum = Number(slider.dataset.fullMin), fullMaximum = Number(slider.dataset.fullMax), step = Number(input.step) || (fullMaximum-fullMinimum)/1000;
    var minimum = Number(minimumInput.value), maximum = Number(maximumInput.value);
    if (input.dataset.screenRangeInput === "min" && minimum >= maximum) minimum = maximum - step;
    if (input.dataset.screenRangeInput === "max" && maximum <= minimum) maximum = minimum + step;
    minimum = Math.max(fullMinimum, minimum); maximum = Math.min(fullMaximum, maximum);
    minimumInput.value = String(minimum); maximumInput.value = String(maximum);
    var span = fullMaximum-fullMinimum, selection = slider.querySelector(".screen-range-selection");
    if (selection && span > 0) { selection.style.left = ((minimum-fullMinimum)/span*100) + "%"; selection.style.right = ((fullMaximum-maximum)/span*100) + "%"; }
    var fieldId = slider.dataset.screenRangeSlider, row = q("[data-testid='settings-field-" + CSS.escape(fieldId) + "']");
    var minimumNode = row && row.querySelector("[data-range-part='min']"), maximumNode = row && row.querySelector("[data-range-part='max']");
    var minimumText = input.dataset.screenRangeInput === "min" ? String(Number(minimum.toPrecision(12))) : minimumNode && minimumNode.value || "";
    var maximumText = input.dataset.screenRangeInput === "max" ? String(Number(maximum.toPrecision(12))) : maximumNode && maximumNode.value || "";
    rememberRangeBoundaryIntent(fieldId, input.dataset.screenRangeInput, input.dataset.screenRangeInput === "min" ? minimumText : maximumText);
    if (row) {
      if (minimumNode) minimumNode.value = minimumText;
      if (maximumNode) maximumNode.value = maximumText;
    }
    var active=activeSettingsRangeLifecycle(slider), raw={min:minimumText,max:maximumText};
    if (active && rangeLifecycleController()) rangeLifecycleController().previewSettings(active.token,{min:minimum,max:maximum},active.context.projectionOptions);
    restoreRangeLifecycleScroll();
  });
  function finishSettingsRangeEvent(event) {
    var input=event.target, slider=input && input.closest && input.closest("[data-screen-range-slider]");
    if (!slider || input.dataset.screenRangeInput === undefined) return;
    settleSettingsRangeLifecycle(slider);
  }
  document.addEventListener("pointerup", finishSettingsRangeEvent, true);
  document.addEventListener("pointercancel", finishSettingsRangeEvent, true);
  document.addEventListener("change", finishSettingsRangeEvent, true);
  document.addEventListener("keyup", function (event) {
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].indexOf(event.key) >= 0) finishSettingsRangeEvent(event);
  }, true);
  document.addEventListener("dblclick", function (event) {
    var slider=event.target.closest && event.target.closest("[data-screen-range-slider]"), row=event.target.closest && event.target.closest(".settings-field-row[data-range-boundary-validation]");
    if (!slider && !row) return;
    event.preventDefault();
    var fieldId=slider ? slider.dataset.screenRangeSlider : row.querySelector("[data-setting-id][data-range-part]") && row.querySelector("[data-setting-id][data-range-part]").dataset.settingId;
    if (!fieldId) return;
    var display=activeDisplay(), target=rangeLifecycleDescriptor(fieldId);
    if (display && target) resetRangeLifecycle(display.id,target.paneId,[target.descriptor]);
  });
  document.addEventListener("change", function (event) { if (event.target.dataset.signalAddVariable !== undefined) { model.signalAddSelection[event.target.value]=event.target.checked; updateSignalAddControls(); } if (event.target.dataset.peaksSetting && model.peaksDraft && event.target.tagName === "SELECT") { var select=event.target; model.peaksDraft.values[select.dataset.peaksSetting]=select.value; model.peaksDraft.intent=(model.peaksDraft.intent || 0) + 1; if (model.peaksApplying) model.peaksApplyQueued=true; renderPeaksSettings(activeDisplay(), paneById(model.activePane), model.peaksRecords[peaksSettingsKey(activeDisplay(), paneById(model.activePane))], { id:select.dataset.peaksSetting }); renderApply(); } });
  document.addEventListener("input", function (event) { if (event.target.dataset.signalAddSampleRate !== undefined) updateSignalAddControls(); if (event.target.dataset.signalAddSearch !== undefined) { model.signalAddSearch=event.target.value; model.signalAddResetScroll=true; renderSignalAddCatalog(); var search=q("[data-signal-add-search]"); if(search){search.focus();search.setSelectionRange(model.signalAddSearch.length,model.signalAddSearch.length);} } });
  window.addEventListener("signal-apply-state", renderApply);
  window.addEventListener("signal-settings-loaded", function (event) { var display = activeDisplay(), detail = event.detail || {}; if (model.settingsPage === "screen" && display && detail.displayId === display.id) renderSettings(display); });
  window.addEventListener("signal-settings-state", function () { if (activeDisplay()) renderSettings(activeDisplay()); });
  window.addEventListener("signal-settings-range-preview", function (event) { queueSettingsRangeToPlot(event.detail || {}); });
  window.addEventListener("signal-settings-name-preview", function (event) { projectNamePreview(event.detail || {}); });
  window.addEventListener("signal-settings-save-failed", function (event) {
    var detail=event.detail || {}, displayId=detail.display_id || activeDisplay() && activeDisplay().id;
    releaseRangeLifecycle(displayId,model.activePane,"error");
    var paneId=model.namePreviewIntents[displayId + "::pane.name::" + String(detail.intent || 0)] || model.activePane;
    if (typeof settings.releaseActiveNameEditor === "function") settings.releaseActiveNameEditor();
    clearNamePreview(detail.field_id, displayId, paneId);
    render();
    showToast(safeErrorText(detail.error, "Не удалось сохранить имя."), true);
  });
  window.addEventListener("signal-settings-saved", function (event) {
    var detail=event.detail || {}, revision=detail.state && detail.state.state_revision;
    if (typeof revision !== "number") revision=detail.state_revision;
    if (typeof revision === "number") {
      var displayId=detail.display_id || activeDisplay() && activeDisplay().id;
      var paneId=detail.field_id === "pane.name" ? model.namePreviewIntents[displayId + "::pane.name::" + String(detail.intent || 0)] || model.activePane : "";
      var fieldId=detail.field_id || "";
      var areaOutput=model.settingsPage === "display" && fieldId !== "display.name" && fieldId !== "pane.name" && fieldId !== "display.show_axis_labels";
      if (areaOutput) paneId=model.activePane;
      model.settingsPublishEvents.push({ revision:revision, fieldId:fieldId, displayId:displayId, paneId:paneId, areaOutput:areaOutput });
      model.revision=Math.max(model.revision, revision);
      scheduleSettingsPublication(revision);
    }
  });
  window.addEventListener("signal-settings-plot-type", function (event) {
    var pane = paneById(model.activePane), plotType = event.detail && event.detail.plotType;
    if (pane && titles[plotType] && pane.plot_type !== plotType) postLayout({ operation:"update_pane", pane_id:pane.id, plot_type:plotType, signal_bindings:pane.signal_bindings || [] });
  });
  q("[data-testid='display-tabs']").addEventListener("scroll", function () { scheduleDisplayTabScrollUpdate(false); }, { passive: true });
  var workspaceSplitter = q("[data-testid='workspace-inspector-splitter']");
  if (workspaceSplitter) {
    workspaceSplitter.addEventListener("pointerdown", startWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("pointermove", moveWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("pointerup", stopWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("pointercancel", stopWorkspaceSplitDrag);
    workspaceSplitter.addEventListener("lostpointercapture", stopWorkspaceSplitDrag);
  }
  renderWorkspaceInspectorState();
  window.addEventListener("resize", function () { scheduleDisplayTabScrollUpdate(false); });
  window.addEventListener("resize", retainWorkspaceSplitOnResize);
  window.addEventListener("resize", repositionLayout);
  window.addEventListener("resize", function () { positionMenu(q("[data-testid='signal-columns-menu']"), q("[data-testid='signal-columns-menu-trigger']"), 244); positionMenu(q("[data-testid='measurement-columns-menu']"), q("[data-testid='measurement-columns-menu-trigger']"), 244); positionMenu(q("[data-testid='sample-columns-menu']"), q("[data-testid='sample-columns-menu-trigger']") || model.sampleColumnsMenuTrigger, 244); positionPaneMenu(); if (q("[data-testid='graph-help-overlay']") && !q("[data-testid='graph-help-overlay']").hidden && model.graphHelpRestoreTarget) openGraphHelp(model.graphHelpRestoreTarget); });
  document.addEventListener("scroll", positionPaneMenu, true);
  if (window.ResizeObserver) {
    model.displayTabsObserver = new window.ResizeObserver(function () { scheduleDisplayTabScrollUpdate(false); });
    model.displayTabsObserver.observe(q("[data-testid='display-tabs-wrap']"));
  }

  function safeErrorText(error, fallback) {
    var text="";
    if (error && typeof error.message === "string" && error.message) text=error.message;
    else if (error && error.payload && typeof error.payload.message === "string") text=error.payload.message;
    else if (error && error.payload && error.payload.error && typeof error.payload.error.message === "string") text=error.payload.error.message;
    else if (typeof error === "string" && error) text=error;
    return !text || internalErrorText(text) ? fallback : text;
  }
  function showBootstrapError(error) {
    var target = q("[data-testid='app-error']");
    var copy = q("[data-error-text]");
    if (!target || !copy) return;
    copy.textContent = safeErrorText(error, "Не удалось загрузить анализатор.");
    target.hidden = false;
  }
  function showSettingsLoadError(error) {
    var footer = q("[data-testid='settings-footer']");
    if (!footer) return;
    footer.dataset.phase = "error";
    footer.dataset.message = safeErrorText(error, "Не удалось загрузить настройки.");
    renderApply();
  }

  document.addEventListener("native-session-imported", function (event) {
    var snapshot=event && event.detail;
    if (!accept(snapshot)) return;
    var cursors=paneGraphCursorController();
    if (cursors) Object.keys(model.outputs).forEach(function (key) { cursors.clear(key); });
    model.rangeBoundaryIntents={};
    render();
    output(true);
    settings.load().then(render).catch(showSettingsLoadError);
  });
  document.addEventListener("click", function (event) {
    if (event.target && event.target.closest && event.target.closest("[data-signal-color-trigger], .settings-panel .color-swatch-button, [data-signal-color-input], [data-signal-metadata='color']")) {
      window.requestAnimationFrame(function () { decorateNoHistory(document); });
    }
  });

  function bootstrapAttempt(token) {
    var bootstrap=window.SignalAnalyserBootstrapLoading;
    function current() { var state=bootstrap && bootstrap.state(); return !!state && state.token === token && state.phase === "loading"; }
    return api.getState().then(function (snapshot) {
      if (!current()) return null;
      if (!accept(snapshot)) throw new Error("Получен устаревший снимок состояния.");
      bootstrap.acceptInitialState(token);
      render();
      return settings.load();
    }).then(function (documentValue) {
      if (!documentValue || !current()) return null;
      bootstrap.acceptActiveSettings(token);
      render();
      return new Promise(function (resolve) {
        window.requestAnimationFrame(function () {
          if (!current()) return resolve(null);
          bootstrap.commitInitialRender(token);
          output(true);
          schedulePlotlyIdlePreload();
          resolve(documentValue);
        });
      });
    }).catch(function () { if (bootstrap) bootstrap.fail(token,"request"); return null; });
  }
  window.addEventListener("signal-analyser:bootstrap-retry", function (event) { var token=event.detail && event.detail.token; if (token) bootstrapAttempt(token); });
  var bootstrapController=window.SignalAnalyserBootstrapLoading;
  bootstrapAttempt(bootstrapController.begin({ timeoutMs:bootstrapController.DEFAULT_TIMEOUT_MS }));
})(window, document);

(function registerSignalColorPicker(window, document) {
  "use strict";
  var palette = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];
  var picker = null, trigger = null, sourceInput = null, initialColor = "#2166df", busy = false;
  function normalize(value) { var raw = String(value || "").trim(); if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase(); if (/^[0-9a-f]{6}$/i.test(raw)) return ("#" + raw).toLowerCase(); return ""; }
  function tickAsset() { var base = window.SignalAnalyserUIBase || (window.SignalAnalyserUIDesign && window.SignalAnalyserUIDesign.assetBase) || "."; return String(base).replace(/\/$/, "") + "/icons/tick-figma.svg"; }
  function colorFrom(control, input) { var direct = normalize(input && input.value); if (direct) return direct; var chip = control && control.querySelector("i"); return normalize(chip && (chip.style.getPropertyValue("--signal-color") || chip.style.backgroundColor)) || "#2166df"; }
  function swatches() { return palette.map(function (color) { var light = color === "#ca8a04"; return "<button class='signal-color-picker-swatch' type='button' role='option' data-color='" + color + "' data-light='" + light + "' aria-label='Цвет " + color + "' aria-selected='false' style='--palette-color:" + color + "'><img src='" + tickAsset() + "' alt=''></button>"; }).join(""); }
  function markup() { return "<section class='signal-color-picker' role='dialog' aria-modal='false' aria-labelledby='signal-color-picker-title' data-testid='signal-color-picker' data-invalid='false' data-busy='false' hidden><div class='signal-color-picker-body'><h3 class='signal-color-picker-title' id='signal-color-picker-title'>Цвет сигнала</h3><label class='signal-color-picker-hex-label'><span>HEX</span><span class='signal-color-picker-hex-control'><i class='signal-color-picker-current' aria-hidden='true'></i><input class='signal-color-picker-hex' data-testid='signal-color-picker-hex' maxlength='7' spellcheck='false' autocomplete='off' aria-describedby='signal-color-picker-error'></span></label><p class='signal-color-picker-error' id='signal-color-picker-error' role='alert'></p><p class='signal-color-picker-section-title'>Палитра</p><div class='signal-color-picker-palette' role='listbox' aria-label='Палитра'>" + swatches() + "</div></div><footer class='signal-color-picker-footer'><button class='signal-color-picker-action' type='button' data-color-picker-cancel>Отмена</button><button class='signal-color-picker-action is-primary' type='button' data-color-picker-apply data-testid='signal-color-picker-apply'>Применить</button></footer></section>"; }
  function ensure() { if (!picker) { document.body.insertAdjacentHTML("beforeend", markup()); picker = document.querySelector("[data-testid='signal-color-picker']"); } return picker; }
  function provider() { return window.SignalColorPickerProvider || {}; }
  function preview(color, source) { picker.style.setProperty("--draft-color", color || initialColor); var chip = trigger && trigger.querySelector("i"); if (chip) { chip.style.background = color || initialColor; chip.style.setProperty("--signal-color", color || initialColor); } if (typeof provider().preview === "function") provider().preview({ color:color || initialColor, source:source || "picker" }); }
  function render() { var input = picker.querySelector("[data-testid='signal-color-picker-hex']"), valid = !!normalize(input.value); picker.dataset.invalid = String(!valid); picker.dataset.busy = String(busy); picker.querySelector("[data-color-picker-apply]").disabled = !valid || busy; picker.querySelector("[data-color-picker-cancel]").disabled = busy; picker.querySelector(".signal-color-picker-error").textContent = valid ? "" : "Введите HEX в формате #RRGGBB."; picker.querySelectorAll("[data-color]").forEach(function (swatch) { var selected = valid && swatch.dataset.color === normalize(input.value); swatch.classList.toggle("is-selected", selected); swatch.setAttribute("aria-selected", String(selected)); swatch.disabled = busy; }); }
  function position() { if (!picker || picker.hidden || !trigger) return; var rect = trigger.getBoundingClientRect(), left = Math.max(8, Math.min(window.innerWidth - picker.offsetWidth - 8, rect.right - picker.offsetWidth)), below = rect.bottom + 6, top = below + picker.offsetHeight <= window.innerHeight - 8 ? below : rect.top - picker.offsetHeight - 6; picker.style.left = left + "px"; picker.style.top = Math.max(8, Math.min(window.innerHeight - picker.offsetHeight - 8, top)) + "px"; }
  function close(commit) { if (!picker || picker.hidden || busy) return; if (!commit) { preview(initialColor, "cancel"); if (typeof provider().cancel === "function") provider().cancel({ color:initialColor }); } picker.hidden = true; if (trigger) trigger.setAttribute("aria-expanded", "false"); var restore = trigger; trigger = null; sourceInput = null; window.requestAnimationFrame(function () { if (restore && restore.isConnected) restore.focus(); }); }
  function open(control, input) { ensure(); if (!picker.hidden && trigger === control) return close(false); if (!picker.hidden) close(false); trigger = control; sourceInput = input; initialColor = colorFrom(control, input); busy = false; trigger.setAttribute("aria-haspopup", "dialog"); trigger.setAttribute("aria-expanded", "true"); picker.hidden = false; var hex = picker.querySelector("[data-testid='signal-color-picker-hex']"); hex.value = initialColor; preview(initialColor, "open"); render(); position(); window.requestAnimationFrame(function () { hex.focus(); hex.select(); }); }
  function commit() { var color = normalize(picker.querySelector("[data-testid='signal-color-picker-hex']").value); if (!color || busy) return; busy = true; render(); Promise.resolve(typeof provider().commit === "function" ? provider().commit({ color:color, input:sourceInput, trigger:trigger }) : null).then(function () { if (sourceInput) { sourceInput.value = color; sourceInput.dispatchEvent(new Event("input", { bubbles:true })); } initialColor = color; busy = false; close(true); }).catch(function () { busy = false; picker.dataset.invalid = "true"; picker.querySelector(".signal-color-picker-error").textContent = "Не удалось применить цвет."; render(); }); }
  document.addEventListener("click", function (event) { var control = event.target.closest("[data-signal-color-trigger], .settings-panel .color-swatch-button"), input = event.target.closest("[data-signal-color-input], [data-signal-metadata='color']"); if (control || input) { event.preventDefault(); event.stopPropagation(); var row = (control || input).closest(".color-field") || (control || input).parentElement; return open(control || row.querySelector(".color-swatch-button") || input, input || row.querySelector("[data-signal-color-input], [data-signal-metadata='color']")); } if (!picker || picker.hidden) return; var swatch = event.target.closest("[data-color]"); if (swatch) { var hex = picker.querySelector("[data-testid='signal-color-picker-hex']"); hex.value = swatch.dataset.color; preview(swatch.dataset.color, "palette"); return render(); } if (event.target.closest("[data-color-picker-cancel]")) return close(false); if (event.target.closest("[data-color-picker-apply]")) return commit(); if (!event.target.closest("[data-testid='signal-color-picker']")) close(false); }, true);
  document.addEventListener("input", function (event) { if (!event.target.matches("[data-testid='signal-color-picker-hex']")) return; var color = normalize(event.target.value); if (color) preview(color, "hex"); render(); });
  document.addEventListener("keydown", function (event) { if (!picker || picker.hidden) return; if (event.key === "Escape") { event.preventDefault(); close(false); } if (event.key === "Enter" && event.target.matches("[data-testid='signal-color-picker-hex']")) { event.preventDefault(); commit(); } }, true);
  window.addEventListener("resize", position); document.addEventListener("scroll", position, true);
  window.SignalColorPickerUI = { open:open, close:close, palette:palette.slice() };
}(window, document));

(function registerOperationErrorDialog(window,document) {
  "use strict";
  var SELECTORS={
    layer:"[data-testid='signal-operation-error-layer']",
    dialog:"[data-testid='signal-operation-error-dialog']",
    message:"[data-signal-operation-error-message]",
    close:"[data-signal-operation-error-close]",
    confirm:"[data-signal-operation-error-confirm]",
    submit:"[data-signal-operation-submit]"
  };
  var returnTarget=null;
  function sanitizedMessage(error) {
    var status=Number(error && (error.status || error.statusCode)),code=String(error && (error.code || error.kind) || "").toLowerCase();
    if (status === 400 || code === "invalid_operation") return "Проверьте параметры операции и повторите попытку.";
    if (status === 404 || code === "source_unavailable") return "Исходный сигнал больше недоступен. Закройте сообщение и выберите сигнал заново.";
    if (status === 409 || code === "conflict") return "Сигнал с таким именем уже существует или данные изменились. Проверьте имя и повторите попытку.";
    if (status === 422 || code === "invalid_result") return "Операция не вернула корректный сигнал. Проверьте параметры или тело операции.";
    if (status === 503 || code === "unavailable") return "Сервис вычислений временно недоступен. Повторите попытку позже.";
    return "Не удалось выполнить операцию над сигналом. Проверьте параметры и повторите попытку.";
  }
  function focusable(dialog) { return Array.prototype.slice.call(dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")); }
  function open(error,options) {
    options=options || {};
    var layer=document.querySelector(SELECTORS.layer),message=document.querySelector(SELECTORS.message),dialog=document.querySelector(SELECTORS.dialog);
    if (!layer || !message || !dialog) return sanitizedMessage(error);
    if (typeof options.endBusy === "function") options.endBusy({beforeAlert:true,preserveOperationForm:true});
    returnTarget=options.invalidField && options.invalidField.isConnected ? options.invalidField : options.submit && options.submit.isConnected ? options.submit : document.querySelector(SELECTORS.submit);
    message.textContent=sanitizedMessage(error);
    layer.hidden=false;
    dialog.setAttribute("aria-busy","false");
    var target=dialog.querySelector(SELECTORS.confirm) || dialog.querySelector(SELECTORS.close);
    if (target) target.focus();
    return message.textContent;
  }
  function close() {
    var layer=document.querySelector(SELECTORS.layer);
    if (!layer || layer.hidden) return false;
    layer.hidden=true;
    var target=returnTarget;
    returnTarget=null;
    if (target && target.isConnected && !target.disabled) target.focus();
    return true;
  }
  function keydown(event) {
    var layer=document.querySelector(SELECTORS.layer),dialog=layer && layer.querySelector(SELECTORS.dialog);
    if (!layer || layer.hidden || !dialog) return false;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return true; }
    if (event.key !== "Tab") return false;
    var items=focusable(dialog),first=items[0],last=items[items.length-1];
    if (!items.length) { event.preventDefault(); return true; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return true; }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); return true; }
    return false;
  }
  function click(event) {
    if (!event.target.closest) return;
    if (event.target.closest(SELECTORS.close+","+SELECTORS.confirm)) { event.preventDefault(); close(); }
  }
  document.addEventListener("click",click,true);
  document.addEventListener("keydown",keydown,true);
  window.SignalAnalyserOperationErrorDialog={
    selectors:SELECTORS,
    sanitizedMessage:sanitizedMessage,
    open:open,
    close:close,
    contract:{
      presentation:"Provider/runtime failure opens one standard aria-modal alertdialog above the still-mounted operation dialog; no inline terminal error block.",
      privacy:"Never render error.message, Julia/Engee/TypeError text, stack, binding names or raw provider payload.",
      lifecycle:"End busy first, preserve every operation form value, trap focus in the alertdialog, Escape/close/Понятно dismiss, then restore invalid field or operation submit.",
      stacking:"error layer is the topmost blocking owner; operation dialog remains mounted below and receives neither pointer nor focus until the error closes."
    }
  };
}(window,document));

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
  function createController() {
    var records={},listeners=[];
    function record(key) { return records[key] || (records[key]={mode:MODE_OFF,values:[],host:null,overlay:null}); }
    function snapshot(key) { var entry=record(key); return {key:key,mode:entry.mode,values:entry.values.slice(),host:entry.host,eligible:entry.mode !== MODE_OFF && !!entry.host && visibleTraces(entry.host).length > 0}; }
    function notify(key) { var value=snapshot(key); listeners.slice().forEach(function (listener) { listener(value); }); }
    function subscribe(listener) { if (typeof listener !== "function") return function () {}; listeners.push(listener); return function () { listeners=listeners.filter(function (candidate) { return candidate !== listener; }); }; }
    function removeOverlay(entry) { if (entry.overlay && entry.overlay.isConnected) entry.overlay.remove(); entry.overlay=null; entry.host=null; }
    function update(key) {
      var entry=record(key), host=entry.host;
      if (!host || !host.isConnected || entry.mode === MODE_OFF || !visibleTraces(host).length) { removeOverlay(entry); notify(key); return; }
      var domain=visibleDomain(host);
      if (!domain) { removeOverlay(entry); notify(key); return; }
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
      if (overlay.querySelectorAll(".plot-cursor-line").length !== entry.values.length) {
        overlay.innerHTML=entry.values.map(function (_,index) {
          return "<button class='plot-cursor-line' type='button' role='slider' data-cursor-index='"+index+"' data-cursor-label='"+(index+1)+"' aria-label='Курсор "+(index+1)+"'></button>";
        }).join("");
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
      notify(key);
    }
    function setMode(key, host, mode) {
      var entry=record(key), next=mode === entry.mode ? MODE_OFF : mode;
      entry.mode=next;
      entry.host=host || entry.host;
      if (next === MODE_OFF) { entry.values=[]; removeOverlay(entry); notify(key); }
      else { entry.values=initialValues(entry.host,next,entry.values); update(key); }
      return next;
    }
    function attach(key,host) { var entry=record(key); entry.host=host; if (entry.mode !== MODE_OFF) update(key); }
    function clear(key) { var entry=record(key); entry.mode=MODE_OFF; entry.values=[]; removeOverlay(entry); notify(key); }
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
    return { setMode:setMode, mode:mode, attach:attach, update:update, clear:clear, syncMenu:syncMenu, snapshot:snapshot, subscribe:subscribe };
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

(function registerSignalSamplesCalculatedColumns(window) {
  "use strict";

  var BASE_COLUMNS = [
    { id:"sample_index", label:"№ точки", field:"sample_index", optional:false, minWidth:112 },
    { id:"time", label:"Время", field:"time", optional:false, minWidth:170 },
    { id:"value", label:"Значение", field:"value", optional:false, minWidth:165 }
  ];
  var OPTIONAL_COLUMNS = [
    { id:"magnitude", label:"Модуль", field:"magnitude", optional:true, minWidth:165 },
    { id:"square", label:"Квадрат", field:"square", optional:true, minWidth:165 },
    { id:"signed_square_root_magnitude", label:"Корень из модуля × знак", field:"signed_square_root_magnitude", optional:true, minWidth:240 }
  ];

  function defaultVisibility() {
    return OPTIONAL_COLUMNS.reduce(function (result, column) { result[column.id]=false; return result; }, {});
  }

  function normalizeVisibility(value) {
    var next=defaultVisibility();
    OPTIONAL_COLUMNS.forEach(function (column) {
      if (value && typeof value[column.id] === "boolean") next[column.id]=value[column.id];
    });
    return next;
  }

  function visibleColumns(value) {
    var visible=normalizeVisibility(value);
    return BASE_COLUMNS.concat(OPTIONAL_COLUMNS.filter(function (column) { return visible[column.id]; }));
  }

  function toggle(value, id) {
    var visible=normalizeVisibility(value);
    if (!OPTIONAL_COLUMNS.some(function (column) { return column.id === id; })) return visible;
    visible[id]=!visible[id];
    return visible;
  }

  function minimumTableWidth(value) {
    return visibleColumns(value).reduce(function (sum, column) { return sum + column.minWidth; }, 0);
  }

  function rowProjection(row, value) {
    row=row || {};
    return visibleColumns(value).map(function (column) {
      var projected=row[column.field];
      return { id:column.id, label:column.label, value:projected === null || projected === undefined || projected === "" ? "—" : projected };
    });
  }

  window.SignalSamplesCalculatedColumns = {
    baseColumns:BASE_COLUMNS,
    optionalColumns:OPTIONAL_COLUMNS,
    defaultVisibility:defaultVisibility,
    normalizeVisibility:normalizeVisibility,
    visibleColumns:visibleColumns,
    toggle:toggle,
    minimumTableWidth:minimumTableWidth,
    rowProjection:rowProjection,
    trigger:{ testid:"sample-columns-menu-trigger", className:"inspector-action samples-columns-menu-trigger", icon:"more-vertical.svg", ariaLabel:"Выбрать отображаемые столбцы", tooltip:"Видимость столбцов", placement:"final search-row slot" },
    menu:{ testid:"sample-columns-menu", title:"Видимость столбцов", width:244, itemAttribute:"data-sample-column-visible" },
    searchRowRevision:{ standaloneAction:false, submit:"Enter on sample-point-search-input", persistentStatus:false, compactErrorOnly:true },
    visibilityScope:"one frontend-only preference shared by dynamic signal Values tabs for the current application lifetime",
    providerRule:"UI projects provider-authored fields only; it never calculates derived values",
    excluded:[
      { id:"square_root", reason:"removed from the Values UI and visibility menu by the user" },
      { id:"fft", reason:"explicitly excluded by the user" },
      { id:"multiply", reason:"requires a product decision for multiplier input and lifecycle" },
      { id:"custom", reason:"requires a product decision for operation body, naming and lifecycle" }
    ]
  };
}(window));

(function registerTask0139Inventory(window) {
  "use strict";

  function operationId(option) {
    if (typeof option === "string") return option;
    return option && (option.id || option.value || option.key || option.operation) || "";
  }
  function withoutFft(options) {
    return (options || []).filter(function (option) {
      return String(operationId(option)).trim().toLowerCase() !== "fft";
    });
  }

  window.SignalAnalyserTask0139Inventory={
    sampleOptionalColumns:["magnitude","square","signed_square_root_magnitude"],
    sampleOptionalDefaultVisibility:"all_hidden",
    sampleColumnRemoved:"square_root",
    withoutFft:withoutFft,
    signalOperationRemoved:"fft"
  };
}(window));

(function registerScopedOutputLoading(window, document) {
  "use strict";

  var paneRequests=Object.create(null);
  var layoutRequest=null;

  function clean(value) { return String(value == null ? "" : value); }
  function paneSelector(id) {
    if (window.CSS && typeof window.CSS.escape === "function") return "[data-pane-id='"+window.CSS.escape(clean(id))+"']";
    return "[data-pane-id='"+clean(id).replace(/[\\']/g,"\\$&")+"']";
  }
  function spinner(testid,label,className) {
    var overlay=document.createElement("div");
    overlay.className=className;
    overlay.dataset.testid=testid;
    overlay.setAttribute("role","status");
    overlay.setAttribute("aria-live","polite");
    overlay.setAttribute("aria-label",label);
    overlay.innerHTML="<span class='ui-loader-spinner' aria-hidden='true'></span>";
    return overlay;
  }
  function workspace(root) { return (root || document).querySelector("[data-testid='display-workspace']"); }
  function grid(root) {
    var owner=workspace(root);
    return owner && owner.querySelector("[data-testid='plot-grid'], .plot-grid");
  }
  function sync(root) {
    root=root || document;
    var owner=workspace(root), canvas=grid(root);
    if (!owner || !canvas) return;
    if (layoutRequest) {
      owner.dataset.layoutReconciling="true";
      owner.setAttribute("aria-busy","true");
      owner.querySelectorAll(".pane-output-loading-overlay").forEach(function (node) { node.remove(); });
      var layoutOverlay=canvas.querySelector(":scope > .display-canvas-loading-overlay");
      if (!layoutOverlay) {
        layoutOverlay=spinner("display-canvas-loading-overlay","Обновление макета экрана","display-canvas-loading-overlay");
        canvas.appendChild(layoutOverlay);
      }
      layoutOverlay.dataset.displayId=clean(layoutRequest.displayId);
      return;
    }
    delete owner.dataset.layoutReconciling;
    owner.removeAttribute("aria-busy");
    owner.querySelectorAll(".display-canvas-loading-overlay").forEach(function (node) { node.remove(); });
    Object.keys(paneRequests).forEach(function (id) {
      var pane=owner.querySelector(paneSelector(id));
      if (!pane) return;
      pane.setAttribute("aria-busy","true");
      var overlay=Array.prototype.find.call(pane.children,function (child) { return child.classList && child.classList.contains("pane-output-loading-overlay"); });
      if (!overlay) {
        overlay=spinner("pane-output-loading-overlay-"+id,"Обновление области","pane-output-loading-overlay");
        pane.appendChild(overlay);
      }
      overlay.dataset.paneId=id;
    });
    owner.querySelectorAll(".pane-output-loading-overlay").forEach(function (overlay) {
      if (!paneRequests[overlay.dataset.paneId]) overlay.remove();
    });
    owner.querySelectorAll("[data-pane-id][aria-busy='true']").forEach(function (pane) {
      if (!paneRequests[pane.dataset.paneId]) pane.removeAttribute("aria-busy");
    });
  }
  function beginPane(paneId,token) {
    paneId=clean(paneId);
    if (!paneId) return null;
    paneRequests[paneId]={token:clean(token || ("pane-"+Date.now())),terminal:null};
    sync();
    return paneRequests[paneId].token;
  }
  function settlePane(paneId,token,terminal) {
    paneId=clean(paneId);
    var current=paneRequests[paneId];
    if (!current || clean(token) !== current.token) return false;
    if (["ready","empty","error"].indexOf(terminal) < 0) return false;
    delete paneRequests[paneId];
    sync();
    return true;
  }
  function beginLayout(displayId,token) {
    layoutRequest={displayId:clean(displayId),token:clean(token || ("layout-"+Date.now()))};
    sync();
    return layoutRequest.token;
  }
  function settleLayout(displayId,token,terminal) {
    if (!layoutRequest || clean(displayId) !== layoutRequest.displayId || clean(token) !== layoutRequest.token) return false;
    if (["ready","empty","error"].indexOf(terminal) < 0) return false;
    layoutRequest=null;
    sync();
    return true;
  }
  function state() {
    return {layout:layoutRequest && {displayId:layoutRequest.displayId,token:layoutRequest.token},panes:Object.keys(paneRequests)};
  }

  window.SignalAnalyserScopedLoading={
    beginPane:beginPane,
    settlePane:settlePane,
    beginLayout:beginLayout,
    settleLayout:settleLayout,
    sync:sync,
    state:state,
    paneTerminalStates:["ready","empty","error"],
    layoutTerminalStates:["ready","empty","error"],
    lifecycle:{
      paneBegin:"accepted pane type change or valid Area settings commit immediately before mutation/output request",
      paneEnd:"matching current output reaches ready, empty or error; stale completions do not dismiss",
      layoutBegin:"display layout add/remove/rows/columns mutation start before pane DOM reconciliation",
      layoutEnd:"matching accepted layout and every initial pane output reach ready, empty or error",
      priority:"layout overlay suppresses every pane overlay beneath it"
    }
  };
}(window,document));

(function registerPlotAutoscaleContract(window) {
  "use strict";

  var PLOT_AXES={
    time:{xaxis:"time",yaxis:"amplitude"},
    spectrum:{xaxis:"frequency",yaxis:"magnitude"},
    spectrogram:{xaxis:"time",yaxis:"frequency"},
    persistence:{xaxis:"frequency",yaxis:"power"}
  };

  function cleanType(value) {
    value=String(value == null ? "" : value).toLowerCase();
    return PLOT_AXES[value] ? value : "";
  }

  function capture(options) {
    options=options || {};
    var plotType=cleanType(options.plotType);
    if (!plotType) return null;
    var source=options.sourceLayout || {},rendered=options.fullLayout || {},axes={};
    Object.keys(PLOT_AXES[plotType]).forEach(function (axisName) { axes[axisName]={semantic:PLOT_AXES[plotType][axisName]}; });
    var sourceSlider=source.xaxis && source.xaxis.rangeslider || {};
    var renderedSlider=rendered.xaxis && rendered.xaxis.rangeslider || {};
    return {
      plotType:plotType,
      outputIdentity:String(options.outputIdentity == null ? "" : options.outputIdentity),
      axes:axes,
      rangeSliderVisible:sourceSlider.visible === true || renderedSlider.visible === true
    };
  }

  function relayout(snapshot) {
    if (!snapshot || !PLOT_AXES[snapshot.plotType]) return null;
    var update={autosize:true};
    Object.keys(snapshot.axes || {}).forEach(function (axisName) { update[axisName+".autorange"]=true; });
    if (snapshot.rangeSliderVisible && snapshot.axes && snapshot.axes.xaxis) update["xaxis.rangeslider.autorange"]=true;
    return update;
  }

  window.SignalAnalyserPlotAutoscale={
    plotTypes:Object.keys(PLOT_AXES),
    axesByPlotType:PLOT_AXES,
    capture:capture,
    relayout:relayout,
    contract:{
      trigger:"double-click on the clicked ready Plotly graph surface",
      baseline:"ignore every mirrored/provider numeric range and request true Plotly autorange/full domain for both spatial axes",
      logSemantics:"Plotly owns autorange for current linear/log axes; never linearly infer the reset range from numeric mirrors or raw samples",
      isolation:"autorange the clicked pane then reuse existing enabled frontend link propagation for eligible axes; clear/reproject viewport mirrors; do not publish settings, change main signal or request backend/DSP",
      heatmapColor:"spectrogram power and persistence density color ranges remain unchanged"
    }
  };
}(window));

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
