(function registerSignalAnalyserTask0142(window) {
  "use strict";

  var MESSAGES = {
    min: {
      number:"Введите число для минимума.",
      finite:"Минимум должен быть конечным.",
      domain:"Минимум вне допустимого диапазона.",
      order:"Минимум должен быть меньше максимума.",
      unit:"Минимум нельзя представить в выбранных единицах."
    },
    max: {
      number:"Введите число для максимума.",
      finite:"Максимум должен быть конечным.",
      domain:"Максимум вне допустимого диапазона.",
      order:"Максимум должен быть больше минимума.",
      unit:"Максимум нельзя представить в выбранных единицах."
    }
  };

  function boundaryName(value) { return value === "max" ? "max" : "min"; }

  function boundaryResult(boundary, result) {
    boundary=boundaryName(boundary);
    result=result || { valid:true };
    var invalid=result.valid === false;
    var reason=invalid && MESSAGES[boundary][result.reason] ? result.reason : invalid ? "number" : "";
    return {
      boundary:boundary,
      invalid:invalid,
      ariaInvalid:String(invalid),
      reason:reason,
      message:invalid ? MESSAGES[boundary][reason] : ""
    };
  }

  function projectPair(results) {
    results=results || {};
    var minimum=boundaryResult("min", results.min);
    var maximum=boundaryResult("max", results.max);
    var first=minimum.invalid ? minimum : maximum.invalid ? maximum : null;
    return {
      min:minimum,
      max:maximum,
      message:first ? first.message : "",
      messageBoundary:first ? first.boundary : "",
      hasError:!!first,
      pairBorder:false,
      rowBorder:false
    };
  }

  function endpointDisabled(state) {
    state=state || {};
    return state.applicable === false || state.busy === true;
  }

  function enabledContract(state) {
    state=state || {};
    return {
      minDisabled:endpointDisabled(state),
      maxDisabled:endpointDisabled(state),
      ignoredDisableReasons:["automatic", "slider", "linked"]
    };
  }

  window.SignalAnalyserTask0142 = {
    messages:MESSAGES,
    boundaryResult:boundaryResult,
    projectPair:projectPair,
    endpointDisabled:endpointDisabled,
    enabledContract:enabledContract,
    contract: {
      validationInput:"Existing production numeric/unit/domain/order validators return only {valid, reason}; raw provider/backend exception text is never accepted as a field message.",
      priority:"Both boundaries keep independent invalid state and red borders. One message is rendered: minimum first, otherwise maximum.",
      enabled:"Visible applicable range inputs stay editable in automatic mode and regardless of slider/link state; only true inapplicability or current settings busy state disables them.",
      blank:"An untouched blank endpoint remains valid automatic state and retains its placeholder."
    }
  };
}(window));

(function registerSignalAnalyserSettings(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var valueSelect = window.SignalAnalyserValueSelect;
  var numeric = window.SignalAnalyserNumeric;
  var context = {
    displayId: "", revision: 0, document: null, drafts: {}, pending: {}, timers: {}, requestQueue: Promise.resolve(), intent: 0, contextToken: 0, loadToken: 0,
    page: "display", plotType: "time", collapsed: {}, renderedFields: {}, linkPreview: null, extraVisible: {}, extraItems: {}, rangeDomains: {}, busy: false
  };
  var plotOptions = [
    { value: "time", label: "Временная область" },
    { value: "spectrum", label: "Спектр" },
    { value: "spectrogram", label: "Спектрограмма" },
    { value: "persistence", label: "Спектр персистентности" }
  ];
  var ru = {
    "display.plot_type": "Тип графика", "display.show_legend": "Показывать легенду", "display.name":"Имя экрана", "pane.name":"Имя области",
    "time.normalize_y": "Нормировать Y", "time.show_markers": "Показывать маркеры", "time.units": "Единицы времени", "time.x_limits": "Пределы X", "time.y_limits": "Пределы Y", "time.link_time": "Связать время", "time.link_amplitude": "Связать амплитуду",
    "spectrum.frequency_units": "Единицы частоты", "spectrum.frequency_limits": "Пределы частоты", "spectrum.y_limits": "Пределы магнитуды", "spectrum.link_frequency":"Связать частоты", "spectrum.link_magnitude":"Связать магнитуды", "spectrum.frequency_scale": "Шкала частоты", "spectrum.scale": "Спектр в dB", "spectrum.resolution_type": "Тип разрешения", "spectrum.leakage": "Утечка", "spectrum.rbw": "Полоса разрешения", "spectrum.window_length": "Длина окна", "spectrum.window": "Окно", "spectrum.sidelobe_attenuation_db": "Подавление боковых лепестков", "spectrum.overlap_percent": "Перекрытие", "spectrum.nfft": "Точки DFT", "spectrum.frequency_resolution": "Частотное разрешение",
    "spectrogram.time_units": "Единицы времени", "spectrogram.frequency_units": "Единицы частоты", "spectrogram.frequency_limits": "Пределы частоты", "spectrogram.power_limits": "Пределы мощности", "spectrogram.frequency_scale": "Шкала частоты", "spectrogram.scale": "Спектр в dB", "spectrogram.leakage": "Утечка", "spectrogram.time_resolution": "Разрешение по времени", "spectrogram.overlap_percent": "Перекрытие", "spectrogram.reassign": "Переназначение", "spectrogram.actual_rbw": "Фактическая RBW",
    "persistence.time_units": "Единицы времени", "persistence.frequency_units": "Единицы частоты", "persistence.frequency_limits": "Пределы частоты", "persistence.power_limits": "Пределы мощности", "persistence.density_limits": "Пределы плотности", "persistence.frequency_scale": "Шкала частоты", "persistence.scale": "Спектр в dB", "persistence.leakage": "Утечка", "persistence.time_resolution": "Разрешение по времени", "persistence.overlap_percent": "Перекрытие", "persistence.power_bins": "Интервалы мощности", "persistence.rbw": "RBW"
  };

  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[character]; }); }
  function nameField(id) { return id === "display.name" || id === "pane.name"; }
  function activeNameEditor() {
    var node=document.activeElement;
    var id=node && node.dataset && node.dataset.settingId;
    if (!nameField(id) || !context.renderedFields[id]) return null;
    return { node:node, fieldId:id, intent:context.drafts[id] && context.drafts[id].intent || 0 };
  }
  function noHistory() { return " autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'"; }
  function decorateNoHistory(root) {
    var helper=window.SignalAnalyserTask0126;
    var target=root || document;
    if (target && typeof target.querySelectorAll === "function" && helper && typeof helper.decorateNoHistory === "function") helper.decorateNoHistory(target);
  }
  function fields() { return context.document && Array.isArray(context.document.fields) ? context.document.fields : []; }
  function readouts() { return context.document && Array.isArray(context.document.readouts) ? context.document.readouts : []; }
  function sourceItem(id) {
    if (context.extraItems[id]) return context.extraItems[id];
    var found = fields().filter(function (item) { return item.id === id; })[0];
    if (found) return found;
    var readout = readouts().filter(function (item) { return item.id === id; })[0];
    return readout ? Object.assign({}, readout, { kind:"readout", readonly:true, enabled:false }) : null;
  }
  function rangeItem(item) { return !!item && (item.kind === "range" || item.kind === "optional_range"); }
  function rangeApplicable(item) { return !rangeItem(item) || item.enabled !== false; }
  function screenValue(item) {
    if (context.drafts[item.id] && context.drafts[item.id].value !== undefined) return context.drafts[item.id].value;
    var screen = context.document && context.document.screen;
    return screen && Object.prototype.hasOwnProperty.call(screen, item.id) ? screen[item.id] : item.value;
  }
  function value(item) { return context.page === "screen" ? screenValue(item) : context.drafts[item.id] && context.drafts[item.id].value !== undefined ? context.drafts[item.id].value : item.value; }
  function booleanValue(id) { var item = sourceItem(id); return !!(item && value(item)); }
  function label(item) { return ru[item.id] || item.label || item.id; }
  function isApply(item) { return item && !item.pseudo && item.effect_status === "requires_apply"; }
  function optionLabel(option) {
    var raw = typeof option === "object" ? option.value : option;
    return { auto:"Авто", seconds:"s", milliseconds:"ms", microseconds:"μs", nanoseconds:"ns", picoseconds:"ps", minutes:"мин", hours:"ч", days:"дн", years:"г", hertz:"Hz", kilohertz:"kHz", megahertz:"MHz", gigahertz:"GHz", terahertz:"THz", linear:"Линейная", log:"Логарифмическая", db:"dB", leakage:"По утечке", rbw:"По RBW", window_length:"По длине окна" }[raw] || (typeof option === "object" && option.label) || raw;
  }
  function rangeForUnitField(id) {
    return { "time.units":"time.x_limits", "spectrum.frequency_units":"spectrum.frequency_limits", "spectrogram.frequency_units":"spectrogram.frequency_limits", "persistence.frequency_units":"persistence.frequency_limits" }[id] || "";
  }
  function unitScale(unit) {
    return {
      picoseconds:1e-12, nanoseconds:1e-9, microseconds:1e-6, milliseconds:1e-3, seconds:1, minutes:60, hours:3600, days:86400, years:31557600,
      cycles_per_year:1/31557600, cycles_per_day:1/86400, cycles_per_hour:1/3600, cycles_per_minute:1/60, millihertz:1e-3,
      hertz:1, kilohertz:1e3, megahertz:1e6, gigahertz:1e9, terahertz:1e12
    }[unit] || 1;
  }
  function helperUnitSupported(unit) { return ["seconds", "milliseconds", "microseconds", "nanoseconds", "hertz", "kilohertz", "megahertz", "gigahertz"].indexOf(unit) >= 0; }
  function canonicalFromVisible(value, unit) {
    if (value === null || value === undefined || value === "") return null;
    var helper=window.SignalAnalyserTask0126;
    if (helper && helperUnitSupported(unit)) return helper.toCanonical(value, unit);
    return Number(value) * unitScale(unit);
  }
  function visibleFromCanonical(value, unit) {
    if (value === null || value === undefined || value === "") return "";
    var helper=window.SignalAnalyserTask0126;
    if (helper && helperUnitSupported(unit)) return helper.projectCanonical(value, unit);
    return Number(value) / unitScale(unit);
  }
  function unitFromRenderedLabel(labelValue, fallback) {
    var key=String(labelValue || "").trim();
    return { ps:"picoseconds", ns:"nanoseconds", "μs":"microseconds", us:"microseconds", ms:"milliseconds", s:"seconds", Hz:"hertz", kHz:"kilohertz", MHz:"megahertz", GHz:"gigahertz", THz:"terahertz" }[key] || fallback;
  }
  function automaticTimeUnit(maximumSeconds) {
    var value=Math.abs(Number(maximumSeconds));
    var choices=[["picoseconds",1e-12],["nanoseconds",1e-9],["microseconds",1e-6],["milliseconds",1e-3],["seconds",1],["minutes",60],["hours",3600],["days",86400],["years",31557600]];
    for (var index=0; index<choices.length; index++) { var rendered=value/choices[index][1]; if (rendered >= 1 && rendered < 1000) return choices[index][0]; }
    return value > 0 && value < 1e-12 ? "picoseconds" : value > 0 ? "years" : "seconds";
  }
  function reprojectRangeForUnitChange(item, nextUnit, previousUnit) {
    var rangeId=rangeForUnitField(item.id), rangeItem=rangeId && sourceItem(rangeId);
    if (!rangeItem) return Promise.resolve();
    var current=value(rangeItem);
    if (!current || typeof current !== "object" || current.min == null && current.max == null) return Promise.resolve();
    var currentUnit=String(previousUnit || value(item) || ""), renderedUnit=currentUnit === "auto" ? unitFromRenderedLabel(rangeItem.units, "seconds") : currentUnit;
    var canonical={ min:canonicalFromVisible(current.min, renderedUnit), max:canonicalFromVisible(current.max, renderedUnit) };
    var projectedUnit=nextUnit === "auto" ? automaticTimeUnit(Math.max(Math.abs(canonical.min || 0), Math.abs(canonical.max || 0))) : nextUnit;
    return update(rangeItem, {
      min:current.min == null ? "" : String(visibleFromCanonical(canonical.min, projectedUnit)),
      max:current.max == null ? "" : String(visibleFromCanonical(canonical.max, projectedUnit))
    });
  }
  function pseudo(id, kind, current, extra) { return Object.assign({ id:id, kind:kind, value:current, enabled:true, visible:true, pseudo:true }, extra || {}); }
  function actual(id) {
    var item = sourceItem(id);
    if (!item || item.visible === false || !rangeApplicable(item)) return null;
    return item;
  }
  function group(key, title, items) { return { key:key, title:title, items:items.filter(Boolean) }; }
  function displayInventory(type) {
    var linkFrequency = context.linkPreview ? context.linkPreview.linkFrequency : booleanValue("spectrum.link_frequency");
    var linkMagnitude = context.linkPreview ? context.linkPreview.linkMagnitude : booleanValue("spectrum.link_magnitude");
    var graph = group("graph", "График", [
      actual("pane.name"), pseudo("display.plot_type", "enum", type, { action:"plot-type", options:plotOptions }),
      actual("display.show_legend", true)
    ]);
    if (type === "time") return [graph];
    if (type === "spectrum") {
      return [
        graph,
        group("frequency-axis", "Частотная ось", [actual("spectrum.frequency_units", true), actual("spectrum.frequency_scale", true)]),
        group("spectrum-analysis", "Спектральный анализ", [actual("spectrum.scale", true), actual("spectrum.resolution_type", true), actual("spectrum.leakage"), actual("spectrum.rbw"), actual("spectrum.window_length"), actual("spectrum.window"), actual("spectrum.sidelobe_attenuation_db"), actual("spectrum.overlap_percent"), actual("spectrum.nfft"), actual("spectrum.frequency_resolution")])
      ];
    }
    if (type === "spectrogram") {
      return [
        graph,
        group("frequency-axis", "Частотная ось", [actual("spectrogram.time_units", true), actual("spectrogram.frequency_units", true), actual("spectrogram.frequency_limits", true), actual("spectrogram.frequency_scale", true)]),
        group("power", "Мощность", [actual("spectrogram.power_limits", true), actual("spectrogram.scale", true), actual("spectrogram.leakage", true), actual("spectrogram.time_resolution", true), actual("spectrogram.overlap_percent", true), actual("spectrogram.reassign", true), actual("spectrogram.actual_rbw")])
      ];
    }
    return [
      graph,
      group("frequency-axis", "Частотная ось", [actual("persistence.time_units", true), actual("persistence.frequency_units", true), linkFrequency ? null : actual("persistence.frequency_limits", true), actual("persistence.frequency_scale", true)]),
      group("density-power", "Плотность и мощность", [linkMagnitude ? null : actual("persistence.power_limits", true), actual("persistence.density_limits", true), actual("persistence.scale", true), actual("persistence.leakage", true), actual("persistence.time_resolution", true), actual("persistence.overlap_percent", true), actual("persistence.power_bins", true), actual("persistence.rbw")])
    ];
  }

  function timeInventory(type) {
    var linkTime = context.linkPreview ? context.linkPreview.linkTime : booleanValue("time.link_time");
    var linkAmplitude = context.linkPreview ? context.linkPreview.linkAmplitude : booleanValue("time.link_amplitude");
    if (type === "time") {
      return [
        group("parameters", "Параметры", [actual("time.normalize_y"), actual("time.show_markers")]),
        linkTime ? null : group("time-limits", "Пределы времени", [actual("time.units"), actual("time.x_limits")]),
        linkAmplitude ? null : group("y-limits", "Пределы оси Y", [actual("time.y_limits")])
      ].filter(Boolean);
    }
    if (type === "spectrogram" && !linkTime) return [group("time-limits", "Пределы времени", [actual("time.x_limits")])];
    return [];
  }

  function inventory() {
    var type = context.plotType;
    return displayInventory(type).concat(timeInventory(type));
  }

  function visibleItems() {
    var items=inventory().reduce(function (items, section) {
      return items.concat(section.items.filter(function (item) { return item && !item.pseudo && item.visible !== false; }));
    }, []);
    Object.keys(context.extraVisible).forEach(function (id) { var item=sourceItem(id); if (item && item.visible !== false && rangeApplicable(item) && !items.some(function (candidate) { return candidate.id === id; })) items.push(item); });
    return items;
  }

  function numericKind(item, key) {
    return item.kind === "integer" || item.kind === "power_bins" || ["count", "nfft", "samples"].indexOf(key) >= 0 ? "integer" : "decimal";
  }
  function numericResult(item, raw, key) { return numeric.parse(raw, numericKind(item, key)); }
  function rangeBoundaryValidation(item, boundary, raw) {
    var automatic=item.kind === "optional_range" && (raw === "" || raw == null);
    if (automatic) return { valid:true, value:null };
    var parsed=numericResult(item, raw);
    if (!parsed.valid) return { valid:false, reason:/конеч|Специальн/i.test(parsed.error || "") ? "finite" : "number", value:null };
    var unitField=item.id === "time.x_limits" ? "time.units" : /frequency_limits$/.test(item.id) ? item.id.replace(/frequency_limits$/, "frequency_units") : "";
    var unitItem=unitField && sourceItem(unitField), unit=unitItem && value(unitItem);
    if (unit && unit !== "auto" && !Number.isFinite(canonicalFromVisible(parsed.value, unit))) return { valid:false, reason:"unit", value:parsed.value };
    var domain=context.rangeDomains[item.id], lower=domain && Number(domain[0]), upper=domain && Number(domain[1]);
    var definitionMinimum=Number(item.min), definitionMaximum=Number(item.max);
    if (item.min != null && Number.isFinite(definitionMinimum) && parsed.value < definitionMinimum || item.max != null && Number.isFinite(definitionMaximum) && parsed.value > definitionMaximum) return { valid:false, reason:"domain", value:parsed.value };
    if (domain && Number.isFinite(lower) && Number.isFinite(upper) && (parsed.value < lower || parsed.value > upper)) return { valid:false, reason:"domain", value:parsed.value };
    return { valid:true, value:parsed.value };
  }
  function rangeValidation(item, raw) {
    var helper=window.SignalAnalyserTask0142;
    var minimum=rangeBoundaryValidation(item, "min", raw && raw.min), maximum=rangeBoundaryValidation(item, "max", raw && raw.max);
    if (minimum.valid && maximum.valid && minimum.value !== null && maximum.value !== null && minimum.value >= maximum.value) {
      minimum={ valid:false, reason:"order", value:minimum.value };
      maximum={ valid:false, reason:"order", value:maximum.value };
    }
    return helper.projectPair({ min:minimum, max:maximum });
  }
  function numericError(item, raw) {
    var values = item.kind === "range" || item.kind === "optional_range" ? [raw && raw.min, raw && raw.max] :
      item.kind === "resolution" || item.kind === "power_bins" ? [raw && raw.value] : [raw];
    for (var index=0; index<values.length; index++) {
      if ((item.kind === "optional_range") && (values[index] === "" || values[index] == null)) continue;
      var result = numericResult(item, values[index], raw && raw.key);
      if (!result.valid) return result.error;
    }
    return "Введите корректное значение.";
  }
  function parse(item, raw) {
    if (item.kind === "boolean") return !!raw;
    if (item.kind === "enum") return raw;
    if (item.kind === "range" || item.kind === "optional_range") {
      var minimum = raw && raw.min, maximum = raw && raw.max;
      if (minimum === "" && maximum === "" && item.kind === "optional_range") return null;
      var minimumResult = minimum === "" && item.kind === "optional_range" ? { valid:true, value:null } : numericResult(item, minimum);
      var maximumResult = maximum === "" && item.kind === "optional_range" ? { valid:true, value:null } : numericResult(item, maximum);
      if (!minimumResult.valid || !maximumResult.valid) return null;
      if (minimumResult.value !== null && maximumResult.value !== null && minimumResult.value >= maximumResult.value) return null;
      return { min:minimumResult.value, max:maximumResult.value };
    }
    if (item.kind === "number" || item.kind === "integer") {
      var number = numericResult(item, raw);
      return number.valid ? number.value : null;
    }
    if (item.kind === "resolution" || item.kind === "power_bins") {
      if (!raw || raw.mode === "auto") { var automatic = { mode:"auto" }; automatic[raw.key] = null; return automatic; }
      var specified = numericResult(item, raw.value, raw.key);
      if (!specified.valid) return null;
      var resolution = { mode:"specified" }; resolution[raw.key] = specified.value; return resolution;
    }
    return String(raw);
  }

  function resolutionKey(item, current) {
    var existing = current && Object.keys(current).filter(function (key) { return key !== "mode"; })[0];
    if (existing) return existing;
    return item.id === "spectrum.rbw" ? "hz" : item.id === "spectrum.window_length" ? "samples" : item.id === "spectrum.nfft" ? "nfft" : item.id === "persistence.power_bins" ? "count" : "seconds";
  }

  function control(item, current, id, rangeState) {
    var disabled = item.enabled === false ? " disabled" : "";
    var checkbox = item.kind === "boolean" || item.control_kind === "checkbox";
    if (checkbox) {
      var checked = item.kind === "enum" ? current === item.checked_value : !!current;
      return "<span class='checkbox-control'><input id='"+id+"' data-setting-id='"+esc(item.id)+"' type='checkbox'"+(checked ? " checked" : "")+disabled+"></span>";
    }
    if (item.kind === "enum") {
      var enumOptions=(item.options || []).map(function (option) { return { value:typeof option === "object" ? option.value : option, label:optionLabel(option), disabled:typeof option === "object" && option.disabled }; });
      var enumCurrent=String(current == null ? "" : current);
      var enumSelected=enumOptions.filter(function (option) { return String(option.value) === enumCurrent; })[0];
      var enumKey="setting::" + context.displayId + "::" + item.id;
      return valueSelect.markup({
        key:enumKey,
        value:enumCurrent,
        label:enumSelected ? enumSelected.label : optionLabel(current),
        options:enumOptions,
        disabled:item.enabled === false,
        className:"settings-value-select",
        testId:"setting-select-" + item.id.replace(/[^a-zA-Z0-9_-]/g, "-"),
        ariaLabel:label(item),
        onSelect:function (selected) {
          if (selected === enumCurrent) return;
          update(item, selected);
          var reproject=rangeForUnitField(item.id) ? reprojectRangeForUnitChange(item, selected, enumCurrent) : Promise.resolve();
          reproject.catch(function () {});
        }
      });
    }
    if (item.kind === "range" || item.kind === "optional_range") {
      var range = current && typeof current === "object" ? current : {};
      var enablement=window.SignalAnalyserTask0142.enabledContract({ applicable:item.enabled !== false, busy:context.busy || !!context.pending[item.id] });
      var projected=rangeState || window.SignalAnalyserTask0142.projectPair();
      return "<span class='range-control' data-range-boundary-validation><input class='control' type='text' inputmode='decimal'"+noHistory()+" step='"+esc(item.step == null ? "any" : item.step)+"' data-setting-id='"+esc(item.id)+"' data-range-part='min' placeholder='Мин.' aria-label='"+esc(label(item))+": минимум' aria-invalid='"+projected.min.ariaInvalid+"' value='"+esc(range.min == null ? "" : range.min)+"'"+(enablement.minDisabled ? " disabled" : "")+"><input class='control' type='text' inputmode='decimal'"+noHistory()+" step='"+esc(item.step == null ? "any" : item.step)+"' data-setting-id='"+esc(item.id)+"' data-range-part='max' placeholder='Макс.' aria-label='"+esc(label(item))+": максимум' aria-invalid='"+projected.max.ariaInvalid+"' value='"+esc(range.max == null ? "" : range.max)+"'"+(enablement.maxDisabled ? " disabled" : "")+"></span>";
    }
    if (item.kind === "resolution" || item.kind === "power_bins") {
      var resolution = current && typeof current === "object" ? current : { mode:"auto" };
      var mode = resolution.mode || "auto", key = resolutionKey(item, resolution), amount = resolution[key];
      var normalizedMode=mode === "auto" ? "auto" : "specified";
      var resolutionSelectKey="setting::" + context.displayId + "::" + item.id + "::mode";
      var resolutionMarkup=valueSelect.markup({
        key:resolutionSelectKey,
        value:normalizedMode,
        label:normalizedMode === "auto" ? "Авто" : "Задать",
        options:[{ value:"auto", label:"Авто" }, { value:"specified", label:"Задать" }],
        disabled:item.enabled === false,
        className:"resolution-mode settings-value-select",
        testId:"setting-resolution-mode-" + item.id.replace(/[^a-zA-Z0-9_-]/g, "-"),
        ariaLabel:label(item) + ": режим",
        onSelect:function (selected) {
          if (selected === normalizedMode) return;
          var trigger=Array.prototype.slice.call(document.querySelectorAll("[data-value-select-key]")).filter(function (node) { return node.dataset.valueSelectKey === resolutionSelectKey; })[0];
          var resolutionNode=trigger && trigger.closest(".resolution-control");
          var valueNode=resolutionNode && resolutionNode.querySelector("[data-resolution-value]");
          update(item, { mode:selected, value:valueNode ? valueNode.value : (amount == null ? "" : amount), key:key });
        }
      });
      var resolutionNumericKind=numericKind(item, key);
      return "<span class='resolution-control' data-resolution-current-mode='"+esc(normalizedMode)+"'>"+resolutionMarkup+"<input class='control' type='text' inputmode='"+(resolutionNumericKind === "integer" ? "numeric" : "decimal")+"'"+noHistory()+" step='"+(resolutionNumericKind === "integer" ? "1" : esc(item.step == null ? "any" : item.step))+"' data-setting-id='"+esc(item.id)+"' data-resolution-value data-resolution-key='"+esc(key)+"' value='"+esc(amount == null ? "" : amount)+"'"+(disabled || normalizedMode === "auto" ? " disabled" : "")+"></span>";
    }
    if (item.kind === "readout" || item.readonly) return "<span class='readonly-control'>"+esc(current == null || current === "" ? "—" : current)+(item.units ? " "+esc(item.units) : "")+"</span>";
    var scalarKind=numericKind(item);
    return "<input class='control' id='"+id+"' data-setting-id='"+esc(item.id)+"' type='text' inputmode='"+(scalarKind === "integer" ? "numeric" : "decimal")+"'"+noHistory()+" step='"+(scalarKind === "integer" ? "1" : esc(item.step == null ? "any" : item.step))+"' value='"+esc(current == null ? "" : current)+"'"+disabled+">";
  }

  function renderField(item) {
    var draft = context.drafts[item.id], isRange=rangeItem(item), rangeState=isRange && draft && draft.rangeValidation || isRange && window.SignalAnalyserTask0142.projectPair(), invalid = draft && draft.error;
    var warning = item.warning || item.message || "";
    var id = "setting-" + item.id.replace(/[^a-zA-Z0-9_-]/g, "-");
    var current = value(item);
    context.renderedFields[item.id] = item;
    return "<label class='settings-field-row"+(invalid ? isRange ? " has-range-error" : " has-error" : "")+(warning ? " has-warning" : "")+"'"+(isRange ? " data-range-boundary-validation" : "")+" data-testid='settings-field-"+esc(item.id)+"'><span class='settings-label'><span>"+esc(label(item))+"</span>"+(item.units ? "<span class='unit'>"+esc(item.units)+"</span>" : "")+"</span><span class='settings-control-wrap'>"+control(item, current, id, rangeState)+"</span>"+(invalid ? "<small class='"+(isRange ? "range-boundary-message" : "field-message is-error")+"' role='alert'>"+esc(draft.error)+"</small>" : warning ? "<small class='field-message is-warning'>"+esc(warning)+"</small>" : "")+"</label>";
  }

  function render(force) {
    if (!force && activeNameEditor()) return;
    if (context.page === "screen") return;
    var host = document.querySelector("[data-testid='settings-content']") || document.querySelector("[data-settings-content]");
    if (!host) return;
    /* Pane-scoped Peaks is owned by app.js: it uses its independent GET/POST
       lifecycle and must not be replaced by this display-settings inventory. */
    if (context.page === "peaks") return;
    if (!context.document) { host.innerHTML = ""; valueSelect.reconcile(); return; }
    context.renderedFields = {};
    host.innerHTML = inventory().filter(function (item) { return item.items.length; }).map(function (item) {
      var collapseKey = context.page + "|" + context.plotType + "|" + item.key;
      var collapsed = !!context.collapsed[collapseKey];
      var bodyId = "settings-group-" + collapseKey.replace(/[^a-zA-Z0-9_-]/g, "-");
      return "<section class='settings-group"+(collapsed ? " is-collapsed" : "")+"' data-settings-group='"+esc(item.key)+"'><button class='settings-group-title' type='button' data-settings-group-toggle='"+esc(collapseKey)+"' aria-expanded='"+String(!collapsed)+"' aria-controls='"+esc(bodyId)+"'><span>"+esc(item.title)+"</span></button><div class='settings-group-fields' id='"+esc(bodyId)+"'"+(collapsed ? " hidden" : "")+">"+item.items.map(renderField).join("")+"</div></section>";
    }).join("");
    valueSelect.reconcile();
    decorateNoHistory(host);
  }

  function rawFor(item, node) {
    if (item.kind === "range" || item.kind === "optional_range") {
      var row = node.closest(".settings-field-row");
      return { min:row.querySelector("[data-range-part='min']").value, max:row.querySelector("[data-range-part='max']").value };
    }
    if (item.kind === "resolution" || item.kind === "power_bins") {
      var resolution = node.closest(".resolution-control");
      var valueNode = resolution.querySelector("[data-resolution-value]");
      return { mode:resolution.dataset.resolutionCurrentMode, value:valueNode.value, key:valueNode.dataset.resolutionKey };
    }
    if (node.type === "checkbox") return item.kind === "enum" ? (node.checked ? item.checked_value : item.unchecked_value) : node.checked;
    return node.value;
  }

  function updatePseudo(item, raw) {
    if (item.action === "plot-type") {
      context.plotType = raw;
      render();
      window.dispatchEvent(new CustomEvent("signal-settings-plot-type", { detail:{ plotType:raw } }));
      return;
    }
  }

  function update(item, raw) {
    if (item.pseudo) { updatePseudo(item, raw); return Promise.resolve(); }
    var parsed = parse(item, raw), draft = context.drafts[item.id] || {}, validation=rangeItem(item) ? rangeValidation(item, raw) : null;
    if (validation && validation.hasError || parsed === null && !(item.kind === "optional_range" && raw.min === "" && raw.max === "")) {
      clearTimeout(context.timers[item.id]); delete context.timers[item.id];
      draft.value = raw; draft.rangeValidation=validation; draft.error = validation && validation.message || numericError(item, raw); context.drafts[item.id] = draft;
      if (context.page === "screen") window.dispatchEvent(new CustomEvent("signal-settings-state")); else render();
      window.dispatchEvent(new CustomEvent("signal-apply-state")); return Promise.resolve();
    }
    draft.value = parsed; draft.rangeValidation=validation; draft.error = ""; draft.intent = ++context.intent; context.drafts[item.id] = draft;
    if (item.id === "display.name" || item.id === "pane.name") window.dispatchEvent(new CustomEvent("signal-settings-name-preview", { detail:{ field_id:item.id, value:parsed, display_id:context.displayId, intent:draft.intent } }));
    if (item.kind === "resolution" || item.kind === "power_bins") render();
    window.dispatchEvent(new CustomEvent("signal-apply-state"));
    if (isApply(item)) {
      clearTimeout(context.timers[item.id]);
      context.timers[item.id] = window.setTimeout(function () { send(item); }, 150);
      return Promise.resolve();
    }
    return send(item);
  }

  function sameContext(token, displayId) { return token === context.contextToken && displayId === context.displayId; }
  function responseRevision(response) {
    var state = response && response.state;
    return state && typeof state.state_revision === "number" ? state.state_revision : response && typeof response.state_revision === "number" ? response.state_revision : null;
  }
  function adoptAuthoritative(response, token, displayId) {
    if (!sameContext(token, displayId)) return false;
    var revision = responseRevision(response);
    if (revision !== null && revision < context.revision) return false;
    if (response && response.settings) context.document = response.settings;
    if (revision !== null) context.revision = revision;
    return true;
  }
  function rebaseConflict(error, token, displayId) {
    var payload = error && error.payload || {}, current = payload.current || payload.state;
    if (!sameContext(token, displayId)) return false;
    if (payload.settings) context.document = payload.settings;
    var revision = current && typeof current.state_revision === "number" ? current.state_revision : null;
    if (revision !== null) context.revision = Math.max(context.revision, revision);
    return revision !== null;
  }
  function enqueue(task) {
    var queued = context.requestQueue.catch(function () {}).then(task);
    context.requestQueue = queued.catch(function () {});
    return queued;
  }

  function validVisibleDraftItems() {
    return visibleItems().filter(function (item) {
      var draft = context.drafts[item.id];
      return !!draft && !draft.error;
    });
  }

  function clearCommittedDrafts(capturedIntents) {
    Object.keys(capturedIntents || {}).forEach(function (id) {
      var draft = context.drafts[id];
      if (draft && !draft.error && draft.intent <= capturedIntents[id]) delete context.drafts[id];
    });
  }

  function flushVisibleDrafts() {
    Object.keys(context.timers).forEach(function (key) { clearTimeout(context.timers[key]); delete context.timers[key]; });
    return Promise.all(validVisibleDraftItems().map(send));
  }

  function send(item) {
    if (!item || item.pseudo || item.visible === false || !context.displayId || !context.drafts[item.id] || context.drafts[item.id].error) return Promise.resolve();
    clearTimeout(context.timers[item.id]);
    delete context.timers[item.id];
    if (context.pending[item.id]) return context.pending[item.id];
    var displayId = context.displayId, token = context.contextToken;
    function persistLatest(retries) {
      var draft = context.drafts[item.id];
      if (!sameContext(token, displayId) || !draft || draft.error) return Promise.resolve();
      var intent = draft.intent || 0, value = draft.value, revision = context.revision;
      return api.updateSetting({ state_revision:revision, display_id:displayId, field_id:item.id, value:value }).then(function (response) {
        if (!sameContext(token, displayId)) return response;
        adoptAuthoritative(response, token, displayId);
        var latest = context.drafts[item.id];
        if (latest && !latest.error && (latest.intent || 0) > intent) return persistLatest(0);
        render();
        window.dispatchEvent(new CustomEvent("signal-settings-saved", { detail:Object.assign({}, response || {}, { field_id:item.id, value:value, display_id:displayId, intent:intent }) }));
        return response;
      }).catch(function (error) {
        if (!sameContext(token, displayId)) return;
        var latest = context.drafts[item.id];
        if (error && error.status === 409 && retries < 1 && rebaseConflict(error, token, displayId)) return persistLatest(retries + 1);
        if (latest && !latest.error && (latest.intent || 0) > intent) return persistLatest(0);
        if (latest && !rangeItem(item)) {
          var providerMessage=(error.payload && (error.payload.message || error.payload.error && error.payload.error.message)) || error.message || "";
          latest.error=/ArgumentError|TypeError|MethodError|Stacktrace|Settings Signal Analyser|\bat\s+\S+\s*\(/i.test(String(providerMessage)) ? "Не удалось сохранить черновик." : providerMessage || "Не удалось сохранить черновик.";
        }
        render(true);
        window.dispatchEvent(new CustomEvent("signal-settings-save-failed", { detail:{ field_id:item.id, display_id:displayId, intent:intent, error:error } }));
        throw error;
      });
    }
    var pending = enqueue(function () { return persistLatest(0); });
    context.pending[item.id] = pending;
    if (rangeItem(item)) { if (context.page === "screen") window.dispatchEvent(new CustomEvent("signal-settings-state")); else render(true); }
    return pending.finally(function () { if (context.pending[item.id] === pending) delete context.pending[item.id]; if (rangeItem(item)) { if (context.page === "screen") window.dispatchEvent(new CustomEvent("signal-settings-state")); else render(true); } });
  }

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest && event.target.closest("[data-settings-group-toggle]");
    if (!toggle) return;
    var key = toggle.dataset.settingsGroupToggle;
    context.collapsed[key] = toggle.getAttribute("aria-expanded") === "true";
    render();
    window.requestAnimationFrame(function () {
      var restored = Array.prototype.slice.call(document.querySelectorAll("[data-settings-group-toggle]")).filter(function (candidate) { return candidate.dataset.settingsGroupToggle === key; })[0];
      if (restored) restored.focus();
    });
  });
  document.addEventListener("change", function (event) {
    var node = event.target;
    var item = node && node.dataset && context.renderedFields[node.dataset.settingId];
    if (item && ["display.name", "pane.name"].indexOf(item.id) < 0) update(item, rawFor(item, node));
  });
  document.addEventListener("input", function (event) {
    var node=event.target, item=node && node.dataset && context.renderedFields[node.dataset.settingId];
    if (item && ["display.name", "pane.name"].indexOf(item.id) >= 0) update(item, rawFor(item, node));
  });

  window.SignalAnalyserSettings = {
    setContext:function (id, revision) {
      if (context.displayId && context.displayId !== id) {
        Object.keys(context.timers).forEach(function (key) { clearTimeout(context.timers[key]); });
        context.contextToken++; context.drafts={}; context.pending={}; context.timers={}; context.document=null; context.linkPreview=null;
      }
      context.displayId=id; context.revision=Math.max(context.revision, revision || 0);
    },
    setView:function (page, plotType) {
      context.page=page || "display"; context.plotType=plotType || "time";
    },
    setRangeDomains:function (domains) { context.rangeDomains=domains || {}; },
    setBusy:function (busy) { context.busy=!!busy; },
    setExtraVisible:function (ids) { context.extraVisible={}; (ids || []).forEach(function (id) { context.extraVisible[id]=true; }); },
    setExtraItems:function (items) { context.extraItems={}; (items || []).forEach(function (item) { if (item && item.id) context.extraItems[item.id]=item; }); },
    setLinkPreview:function (linkTime, linkAmplitude, linkFrequency, linkMagnitude) {
      context.linkPreview = typeof linkTime === "boolean" && typeof linkAmplitude === "boolean" ? { linkTime:linkTime, linkAmplitude:linkAmplitude, linkFrequency:!!linkFrequency, linkMagnitude:!!linkMagnitude } : null;
    },
    beginCustomRender:function () { context.renderedFields={}; },
    renderRows:function (ids) {
      return (ids || []).map(function (id) { var item=sourceItem(id); return item ? Object.assign({}, item, { visible:true }) : null; }).filter(function (item) { return !!item && rangeApplicable(item); }).map(renderField).join("");
    },
    stateFor:function (ids) {
      var drafts=(ids || []).map(function (id) { return context.drafts[id]; }).filter(Boolean);
      return { dirty:drafts.some(function (draft) { return !draft.error; }), invalid:drafts.some(function (draft) { return !!draft.error; }), revision:context.revision };
    },
    flushFields:function (ids) {
      return Promise.all((ids || []).map(function (id) { var item=sourceItem(id); return item ? Object.assign({}, item, { visible:true }) : null; }).filter(isApply).map(send));
    },
    load:function () {
      var id=context.displayId, token=++context.loadToken;
      return api.settings(id).then(function (documentValue) {
        if (token !== context.loadToken || id !== context.displayId || (typeof documentValue.state_revision === "number" && documentValue.state_revision < context.revision)) return context.document;
        context.document=documentValue; context.revision=documentValue.state_revision || context.revision; render(); window.dispatchEvent(new CustomEvent("signal-settings-loaded", { detail:{ displayId:id, stateRevision:context.revision } })); return documentValue;
      });
    },
    accept:function (documentValue) {
      if (!documentValue || documentValue.display_id !== context.displayId || (typeof documentValue.state_revision === "number" && documentValue.state_revision < context.revision)) return false;
      context.document=documentValue;
      context.revision=documentValue.state_revision || context.revision;
      render();
      window.dispatchEvent(new CustomEvent("signal-settings-loaded", { detail:{ displayId:context.displayId, stateRevision:context.revision } }));
      return true;
    },
    render:render,
    flush:function () {
      return flushVisibleDrafts();
    },
    commit:function () {
      var displayId=context.displayId, token=context.contextToken;
      function publish(retries) {
        if (!sameContext(token, displayId)) return Promise.resolve();
        return api.applySettings({ state_revision:context.revision, display_id:displayId }).then(function (response) {
          adoptAuthoritative(response, token, displayId);
          return response;
        }).catch(function (error) {
          if (error && error.status === 409 && retries < 1 && rebaseConflict(error, token, displayId)) return publish(retries + 1);
          throw error;
        });
      }
      return flushVisibleDrafts().then(function () {
        if (!sameContext(token, displayId)) return;
        var capturedIntents={};
        validVisibleDraftItems().forEach(function (item) { capturedIntents[item.id]=context.drafts[item.id].intent || 0; });
        return enqueue(function () {
          return publish(0).then(function (response) {
            if (response && response.success === false) return response;
            if (sameContext(token, displayId)) {
              clearCommittedDrafts(capturedIntents);
              render();
            }
            return response;
          });
        });
      });
    },
    markApplied:function () { context.drafts={}; render(); },
    state:function () { var visible=visibleItems().reduce(function(ids,item){ids[item.id]=true;return ids;},{}), all=Object.keys(context.drafts).filter(function(key){return visible[key];}).map(function (key) { return context.drafts[key]; }); return { dirty:all.some(function (draft) { return !draft.error; }), invalid:all.some(function (draft) { return draft.error; }), displayId:context.displayId, revision:context.revision }; },
    value:function (id) { var item=sourceItem(id); return item ? value(item) : undefined; },
    screenValue:function (id) { var item=sourceItem(id); return item ? screenValue(item) : undefined; },
    setValue:function (id, raw) { var item=sourceItem(id); return item ? update(Object.assign({}, item, { visible:true }), raw) : Promise.reject(new Error("Настройка недоступна: " + id)); },
    setRevision:function (revision) { if (typeof revision === "number" && revision >= context.revision) context.revision=revision; },
    activeNameEditor:activeNameEditor,
    releaseActiveNameEditor:function () { var editor=activeNameEditor(); if (editor && editor.node && typeof editor.node.blur === "function") editor.node.blur(); }
  };
})(window, document);
