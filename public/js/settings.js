(function registerSignalAnalyserSettings(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var timer;
  var context = {
    displayId: "", revision: 0, document: null, drafts: {}, pending: {}, loadToken: 0,
    page: "display", plotType: "time", collapsed: {}, renderedFields: {}
  };
  var plotOptions = [
    { value: "time", label: "Временная область" },
    { value: "spectrum", label: "Спектр" },
    { value: "spectrogram", label: "Спектрограмма" },
    { value: "persistence", label: "Спектр персистентности" }
  ];
  var ru = {
    "display.plot_type": "Тип графика", "display.show_legend": "Показывать легенду",
    "time.normalize_y": "Нормировать Y", "time.show_markers": "Показывать маркеры", "time.units": "Единицы времени", "time.x_limits": "Пределы X", "time.y_limits": "Пределы Y", "time.link_time": "Связать время", "time.not_applicable": "Применимость",
    "spectrum.frequency_units": "Единицы частоты", "spectrum.frequency_limits": "Пределы частоты", "spectrum.y_limits": "Пределы Y", "spectrum.frequency_scale": "Шкала частоты", "spectrum.scale": "Спектр в dB", "spectrum.resolution_type": "Тип разрешения", "spectrum.leakage": "Утечка", "spectrum.rbw": "Полоса разрешения", "spectrum.window_length": "Длина окна", "spectrum.window": "Окно", "spectrum.sidelobe_attenuation_db": "Подавление боковых лепестков", "spectrum.overlap_percent": "Перекрытие", "spectrum.nfft": "Точки DFT", "spectrum.frequency_resolution": "Частотное разрешение",
    "spectrogram.time_units": "Единицы времени", "spectrogram.frequency_units": "Единицы частоты", "spectrogram.frequency_limits": "Пределы частоты", "spectrogram.power_limits": "Пределы мощности", "spectrogram.frequency_scale": "Шкала частоты", "spectrogram.scale": "Спектр в dB", "spectrogram.leakage": "Утечка", "spectrogram.time_resolution": "Разрешение по времени", "spectrogram.overlap_percent": "Перекрытие", "spectrogram.reassign": "Переназначение", "spectrogram.actual_rbw": "Фактическая RBW",
    "persistence.time_units": "Единицы времени", "persistence.frequency_units": "Единицы частоты", "persistence.frequency_limits": "Пределы частоты", "persistence.power_limits": "Пределы мощности", "persistence.density_limits": "Пределы плотности", "persistence.frequency_scale": "Шкала частоты", "persistence.scale": "Спектр в dB", "persistence.leakage": "Утечка", "persistence.time_resolution": "Разрешение по времени", "persistence.overlap_percent": "Перекрытие", "persistence.power_bins": "Интервалы мощности", "persistence.rbw": "RBW"
  };

  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[character]; }); }
  function fields() { return context.document && Array.isArray(context.document.fields) ? context.document.fields : []; }
  function readouts() { return context.document && Array.isArray(context.document.readouts) ? context.document.readouts : []; }
  function sourceItem(id) {
    var found = fields().filter(function (item) { return item.id === id; })[0];
    if (found) return found;
    var readout = readouts().filter(function (item) { return item.id === id; })[0];
    return readout ? Object.assign({}, readout, { kind:"readout", readonly:true, enabled:false }) : null;
  }
  function value(item) { return context.drafts[item.id] && context.drafts[item.id].value !== undefined ? context.drafts[item.id].value : item.value; }
  function label(item) { return ru[item.id] || item.label || item.id; }
  function isApply(item) { return item && !item.pseudo && item.effect_status === "requires_apply"; }
  function optionLabel(option) {
    var raw = typeof option === "object" ? option.value : option;
    return { seconds:"s", milliseconds:"ms", microseconds:"μs", nanoseconds:"ns", picoseconds:"ps", minutes:"мин", hours:"ч", days:"дн", years:"г", hertz:"Hz", kilohertz:"kHz", megahertz:"MHz", gigahertz:"GHz", terahertz:"THz", linear:"Линейная", log:"Логарифмическая", db:"dB", leakage:"По утечке", rbw:"По RBW", window_length:"По длине окна" }[raw] || (typeof option === "object" && option.label) || raw;
  }
  function pseudo(id, kind, current, extra) { return Object.assign({ id:id, kind:kind, value:current, enabled:true, visible:true, pseudo:true }, extra || {}); }
  function actual(id, forceVisible) {
    var item = sourceItem(id);
    if (!item || (!forceVisible && item.visible === false)) return null;
    return item;
  }
  function group(key, title, items) { return { key:key, title:title, items:items.filter(Boolean) }; }
  function inventory() {
    var type = context.plotType;
    if (context.page === "time") {
      if (type === "time") {
        var linkTime = actual("time.link_time", true);
        if (linkTime && linkTime.visible === false) linkTime = Object.assign({}, linkTime, { enabled:false });
        return [
          group("parameters", "Параметры", [actual("time.normalize_y", true), actual("time.show_markers", true)]),
          group("time-limits", "Пределы времени", [actual("time.units", true), actual("time.x_limits", true)]),
          group("y-limits", "Пределы оси Y", [actual("time.y_limits", true)]),
          group("area-link", "Связь областей", [linkTime])
        ];
      }
      if (type === "spectrogram") return [group("time-limits", "Пределы времени", [actual("time.x_limits", true)])];
      return [group("not-applicable", "Временные настройки", [pseudo("time.not_applicable", "readout", "Не применяется", { readonly:true, enabled:false, message:"У этого типа графика нет собственных полей страницы «Время»." })])];
    }

    var graph = group("graph", "График", [
      pseudo("display.plot_type", "enum", type, { action:"plot-type", options:plotOptions }),
      actual("display.show_legend", true)
    ]);
    if (type === "time") return [graph];
    if (type === "spectrum") {
      return [
        graph,
        group("frequency-axis", "Частотная ось", [actual("spectrum.frequency_units", true), actual("spectrum.frequency_limits", true), actual("spectrum.frequency_scale", true), actual("spectrum.y_limits", true)]),
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
      group("frequency-axis", "Частотная ось", [actual("persistence.time_units", true), actual("persistence.frequency_units", true), actual("persistence.frequency_limits", true), actual("persistence.frequency_scale", true)]),
      group("density-power", "Плотность и мощность", [actual("persistence.power_limits", true), actual("persistence.density_limits", true), actual("persistence.scale", true), actual("persistence.leakage", true), actual("persistence.time_resolution", true), actual("persistence.overlap_percent", true), actual("persistence.power_bins", true), actual("persistence.rbw")])
    ];
  }

  function parse(item, raw) {
    if (item.kind === "boolean") return !!raw;
    if (item.kind === "enum") return raw;
    if (item.kind === "range" || item.kind === "optional_range") {
      var minimum = raw && raw.min, maximum = raw && raw.max;
      if (minimum === "" && maximum === "" && item.kind === "optional_range") return null;
      minimum = Number(minimum); maximum = Number(maximum);
      return isFinite(minimum) && isFinite(maximum) && minimum < maximum ? { min:minimum, max:maximum } : null;
    }
    if (item.kind === "number" || item.kind === "integer") {
      var number = Number(raw);
      return isFinite(number) && (item.kind !== "integer" || Math.floor(number) === number) ? number : null;
    }
    if (item.kind === "resolution" || item.kind === "power_bins") {
      if (!raw || raw.mode === "auto") { var automatic = { mode:"auto" }; automatic[raw.key] = null; return automatic; }
      var specified = Number(raw.value);
      if (!isFinite(specified)) return null;
      var resolution = { mode:"specified" }; resolution[raw.key] = specified; return resolution;
    }
    return String(raw);
  }

  function resolutionKey(item, current) {
    var existing = current && Object.keys(current).filter(function (key) { return key !== "mode"; })[0];
    if (existing) return existing;
    return item.id === "spectrum.rbw" ? "hz" : item.id === "spectrum.window_length" ? "samples" : item.id === "spectrum.nfft" ? "nfft" : item.id === "persistence.power_bins" ? "count" : "seconds";
  }

  function control(item, current, id) {
    var disabled = item.enabled === false ? " disabled" : "";
    var checkbox = item.kind === "boolean" || item.control_kind === "checkbox";
    if (checkbox) {
      var checked = item.kind === "enum" ? current === item.checked_value : !!current;
      return "<span class='checkbox-control'><input id='"+id+"' data-setting-id='"+esc(item.id)+"' type='checkbox'"+(checked ? " checked" : "")+disabled+"></span>";
    }
    if (item.kind === "enum") {
      return "<select class='control' id='"+id+"' data-setting-id='"+esc(item.id)+"'"+disabled+">"+(item.options || []).map(function (option) { var optionValue=typeof option === "object" ? option.value : option; var optionDisabled=typeof option === "object" && option.disabled; return "<option value='"+esc(optionValue)+"'"+(optionValue === current ? " selected" : "")+(optionDisabled ? " disabled" : "")+">"+esc(optionLabel(option))+"</option>"; }).join("")+"</select>";
    }
    if (item.kind === "range" || item.kind === "optional_range") {
      var range = current && typeof current === "object" ? current : {};
      return "<span class='range-control'><input class='control' inputmode='decimal' data-setting-id='"+esc(item.id)+"' data-range-part='min' placeholder='Мин.' aria-label='"+esc(label(item))+": минимум' value='"+esc(range.min == null ? "" : range.min)+"'"+disabled+"><input class='control' inputmode='decimal' data-setting-id='"+esc(item.id)+"' data-range-part='max' placeholder='Макс.' aria-label='"+esc(label(item))+": максимум' value='"+esc(range.max == null ? "" : range.max)+"'"+disabled+"></span>";
    }
    if (item.kind === "resolution" || item.kind === "power_bins") {
      var resolution = current && typeof current === "object" ? current : { mode:"auto" };
      var mode = resolution.mode || "auto", key = resolutionKey(item, resolution), amount = resolution[key];
      return "<span class='resolution-control'><select class='control resolution-mode' data-setting-id='"+esc(item.id)+"' data-resolution-mode data-resolution-key='"+esc(key)+"'"+disabled+"><option value='auto'"+(mode === "auto" ? " selected" : "")+">Авто</option><option value='specified'"+(mode !== "auto" ? " selected" : "")+">Задать</option></select><input class='control' inputmode='decimal' data-setting-id='"+esc(item.id)+"' data-resolution-value data-resolution-key='"+esc(key)+"' value='"+esc(amount == null ? "" : amount)+"'"+(disabled || mode === "auto" ? " disabled" : "")+"></span>";
    }
    if (item.kind === "readout" || item.readonly) return "<span class='readonly-control'>"+esc(current == null || current === "" ? "—" : current)+(item.units ? " "+esc(item.units) : "")+"</span>";
    return "<input class='control' id='"+id+"' data-setting-id='"+esc(item.id)+"' type='number' value='"+esc(current == null ? "" : current)+"'"+(item.min != null ? " min='"+esc(item.min)+"'" : "")+(item.max != null ? " max='"+esc(item.max)+"'" : "")+(item.step != null ? " step='"+esc(item.step)+"'" : "")+disabled+">";
  }

  function renderField(item) {
    var draft = context.drafts[item.id], invalid = draft && draft.error;
    var warning = item.warning || item.message || "";
    var id = "setting-" + item.id.replace(/[^a-zA-Z0-9_-]/g, "-");
    var current = value(item);
    context.renderedFields[item.id] = item;
    return "<label class='settings-field-row"+(invalid ? " has-error" : "")+(warning ? " has-warning" : "")+"' data-testid='settings-field-"+esc(item.id)+"'><span class='settings-label'><span>"+esc(label(item))+"</span>"+(item.units ? "<span class='unit'>"+esc(item.units)+"</span>" : "")+"</span><span class='settings-control-wrap'>"+control(item, current, id)+"</span>"+(invalid ? "<small class='field-message is-error' role='alert'>"+esc(draft.error)+"</small>" : warning ? "<small class='field-message is-warning'>"+esc(warning)+"</small>" : "")+"</label>";
  }

  function render() {
    var host = document.querySelector("[data-testid='settings-content']") || document.querySelector("[data-settings-content]");
    if (!host) return;
    /* Pane-scoped Peaks is owned by app.js: it uses its independent GET/POST
       lifecycle and must not be replaced by this display-settings inventory. */
    if (context.page === "peaks") return;
    if (!context.document) { host.innerHTML = ""; return; }
    context.renderedFields = {};
    host.innerHTML = inventory().filter(function (item) { return item.items.length; }).map(function (item) {
      var collapseKey = context.page + "|" + context.plotType + "|" + item.key;
      var collapsed = !!context.collapsed[collapseKey];
      var bodyId = "settings-group-" + collapseKey.replace(/[^a-zA-Z0-9_-]/g, "-");
      return "<section class='settings-group"+(collapsed ? " is-collapsed" : "")+"' data-settings-group='"+esc(item.key)+"'><button class='settings-group-title' type='button' data-settings-group-toggle='"+esc(collapseKey)+"' aria-expanded='"+String(!collapsed)+"' aria-controls='"+esc(bodyId)+"'><span>"+esc(item.title)+"</span></button><div class='settings-group-fields' id='"+esc(bodyId)+"'"+(collapsed ? " hidden" : "")+">"+item.items.map(renderField).join("")+"</div></section>";
    }).join("");
  }

  function rawFor(item, node) {
    if (item.kind === "range" || item.kind === "optional_range") {
      var row = node.closest(".settings-field-row");
      return { min:row.querySelector("[data-range-part='min']").value, max:row.querySelector("[data-range-part='max']").value };
    }
    if (item.kind === "resolution" || item.kind === "power_bins") {
      var resolution = node.closest(".resolution-control");
      var modeNode = resolution.querySelector("[data-resolution-mode]");
      var valueNode = resolution.querySelector("[data-resolution-value]");
      return { mode:modeNode.value, value:valueNode.value, key:modeNode.dataset.resolutionKey || valueNode.dataset.resolutionKey };
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
    if (item.pseudo) return updatePseudo(item, raw);
    var parsed = parse(item, raw), draft = context.drafts[item.id] || {};
    if (parsed === null && !(item.kind === "optional_range" && raw.min === "" && raw.max === "")) {
      draft.value = raw; draft.error = "Введите корректное значение."; context.drafts[item.id] = draft;
      render(); window.dispatchEvent(new CustomEvent("signal-apply-state")); return;
    }
    draft.value = parsed; draft.error = ""; context.drafts[item.id] = draft;
    if (item.kind === "resolution" || item.kind === "power_bins") render();
    window.dispatchEvent(new CustomEvent("signal-apply-state"));
    if (isApply(item)) {
      clearTimeout(timer);
      timer = window.setTimeout(function () { send(item); }, 150);
    } else send(item).catch(function () {});
  }

  function send(item) {
    if (!item || item.pseudo || !context.displayId || !context.drafts[item.id] || context.drafts[item.id].error) return Promise.resolve();
    clearTimeout(timer);
    var draftValue = context.drafts[item.id].value, epoch = context.revision;
    context.pending[item.id] = true;
    return api.updateSetting({ state_revision:epoch, display_id:context.displayId, field_id:item.id, value:draftValue }).then(function (response) {
      if (response && response.settings) context.document = response.settings;
      if (response && response.state && typeof response.state.state_revision === "number") context.revision = response.state.state_revision;
      delete context.pending[item.id];
      render();
      window.dispatchEvent(new CustomEvent("signal-settings-saved", { detail:response }));
    }).catch(function (error) {
      delete context.pending[item.id];
      if (error.payload && error.payload.settings) context.document = error.payload.settings;
      context.drafts[item.id].error = (error.payload && (error.payload.message || error.payload.error && error.payload.error.message)) || error.message || "Не удалось сохранить черновик.";
      render();
      throw error;
    });
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
    if (item) update(item, rawFor(item, node));
  });

  window.SignalAnalyserSettings = {
    setContext:function (id, revision) {
      if (context.displayId && context.displayId !== id) { clearTimeout(timer); context.drafts={}; context.pending={}; context.document=null; }
      context.displayId=id; context.revision=Math.max(context.revision, revision || 0);
    },
    setView:function (page, plotType) {
      context.page=page || "display"; context.plotType=plotType || "time";
    },
    load:function () {
      var id=context.displayId, token=++context.loadToken;
      return api.settings(id).then(function (documentValue) {
        if (token !== context.loadToken || id !== context.displayId || (typeof documentValue.state_revision === "number" && documentValue.state_revision < context.revision)) return context.document;
        context.document=documentValue; context.revision=documentValue.state_revision || context.revision; render(); return documentValue;
      });
    },
    render:render,
    flush:function () { clearTimeout(timer); return Promise.all(fields().filter(isApply).map(send)); },
    markApplied:function () { context.drafts={}; render(); },
    state:function () { var all=Object.keys(context.drafts).map(function (key) { return context.drafts[key]; }); return { dirty:all.some(function (draft) { return !draft.error; }), invalid:all.some(function (draft) { return draft.error; }), displayId:context.displayId, revision:context.revision }; },
    setRevision:function (revision) { if (typeof revision === "number" && revision >= context.revision) context.revision=revision; }
  };
})(window, document);
