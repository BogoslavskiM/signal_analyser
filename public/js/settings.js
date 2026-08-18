(function registerSignalAnalyserSettings(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var valueSelect = window.SignalAnalyserValueSelect;
  var numeric = window.SignalAnalyserNumeric;
  var context = {
    displayId: "", revision: 0, document: null, drafts: {}, pending: {}, timers: {}, requestQueue: Promise.resolve(), intent: 0, contextToken: 0, loadToken: 0,
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
    "time.normalize_y": "Нормировать Y", "time.show_markers": "Показывать маркеры", "time.units": "Единицы времени", "time.x_limits": "Пределы X", "time.y_limits": "Пределы Y", "time.link_time": "Связать время", "time.link_amplitude": "Связать амплитуду",
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
  function booleanValue(id) { var item = sourceItem(id); return !!(item && value(item)); }
  function label(item) { return ru[item.id] || item.label || item.id; }
  function isApply(item) { return item && !item.pseudo && item.effect_status === "requires_apply"; }
  function optionLabel(option) {
    var raw = typeof option === "object" ? option.value : option;
    return { seconds:"s", milliseconds:"ms", microseconds:"μs", nanoseconds:"ns", picoseconds:"ps", minutes:"мин", hours:"ч", days:"дн", years:"г", hertz:"Hz", kilohertz:"kHz", megahertz:"MHz", gigahertz:"GHz", terahertz:"THz", linear:"Линейная", log:"Логарифмическая", db:"dB", leakage:"По утечке", rbw:"По RBW", window_length:"По длине окна" }[raw] || (typeof option === "object" && option.label) || raw;
  }
  function pseudo(id, kind, current, extra) { return Object.assign({ id:id, kind:kind, value:current, enabled:true, visible:true, pseudo:true }, extra || {}); }
  function actual(id) {
    var item = sourceItem(id);
    if (!item || item.visible === false) return null;
    return item;
  }
  function group(key, title, items) { return { key:key, title:title, items:items.filter(Boolean) }; }
  function displayInventory(type) {
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

  function timeInventory(type) {
    var linkTime = booleanValue("time.link_time");
    var linkAmplitude = booleanValue("time.link_amplitude");
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
    return inventory().reduce(function (items, section) {
      return items.concat(section.items.filter(function (item) { return item && !item.pseudo && item.visible !== false; }));
    }, []);
  }

  function numericKind(item, key) {
    return item.kind === "integer" || item.kind === "power_bins" || ["count", "nfft", "samples"].indexOf(key) >= 0 ? "integer" : "decimal";
  }
  function numericResult(item, raw, key) { return numeric.parse(raw, numericKind(item, key)); }
  function numericError(item, raw) {
    var values = item.kind === "range" || item.kind === "optional_range" ? [raw && raw.min, raw && raw.max] :
      item.kind === "resolution" || item.kind === "power_bins" ? [raw && raw.value] : [raw];
    for (var index=0; index<values.length; index++) {
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
      var minimumResult = numericResult(item, minimum), maximumResult = numericResult(item, maximum);
      return minimumResult.valid && maximumResult.valid && minimumResult.value < maximumResult.value ? { min:minimumResult.value, max:maximumResult.value } : null;
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

  function control(item, current, id) {
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
        onSelect:function (selected) { if (selected !== enumCurrent) update(item, selected); }
      });
    }
    if (item.kind === "range" || item.kind === "optional_range") {
      var range = current && typeof current === "object" ? current : {};
      return "<span class='range-control'><input class='control' type='text' inputmode='decimal' step='"+esc(item.step == null ? "any" : item.step)+"' data-setting-id='"+esc(item.id)+"' data-range-part='min' placeholder='Мин.' aria-label='"+esc(label(item))+": минимум' value='"+esc(range.min == null ? "" : range.min)+"'"+disabled+"><input class='control' type='text' inputmode='decimal' step='"+esc(item.step == null ? "any" : item.step)+"' data-setting-id='"+esc(item.id)+"' data-range-part='max' placeholder='Макс.' aria-label='"+esc(label(item))+": максимум' value='"+esc(range.max == null ? "" : range.max)+"'"+disabled+"></span>";
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
      return "<span class='resolution-control' data-resolution-current-mode='"+esc(normalizedMode)+"'>"+resolutionMarkup+"<input class='control' type='text' inputmode='"+(resolutionNumericKind === "integer" ? "numeric" : "decimal")+"' step='"+(resolutionNumericKind === "integer" ? "1" : esc(item.step == null ? "any" : item.step))+"' data-setting-id='"+esc(item.id)+"' data-resolution-value data-resolution-key='"+esc(key)+"' value='"+esc(amount == null ? "" : amount)+"'"+(disabled || normalizedMode === "auto" ? " disabled" : "")+"></span>";
    }
    if (item.kind === "readout" || item.readonly) return "<span class='readonly-control'>"+esc(current == null || current === "" ? "—" : current)+(item.units ? " "+esc(item.units) : "")+"</span>";
    var scalarKind=numericKind(item);
    return "<input class='control' id='"+id+"' data-setting-id='"+esc(item.id)+"' type='text' inputmode='"+(scalarKind === "integer" ? "numeric" : "decimal")+"' step='"+(scalarKind === "integer" ? "1" : esc(item.step == null ? "any" : item.step))+"' value='"+esc(current == null ? "" : current)+"'"+disabled+">";
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
    var parsed = parse(item, raw), draft = context.drafts[item.id] || {};
    if (parsed === null && !(item.kind === "optional_range" && raw.min === "" && raw.max === "")) {
      draft.value = raw; draft.error = numericError(item, raw); context.drafts[item.id] = draft;
      render(); window.dispatchEvent(new CustomEvent("signal-apply-state")); return Promise.resolve();
    }
    draft.value = parsed; draft.error = ""; draft.intent = ++context.intent; context.drafts[item.id] = draft;
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
    return state && typeof state.state_revision === "number" ? state.state_revision : null;
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
        window.dispatchEvent(new CustomEvent("signal-settings-saved", { detail:response }));
        return response;
      }).catch(function (error) {
        if (!sameContext(token, displayId)) return;
        var latest = context.drafts[item.id];
        if (error && error.status === 409 && retries < 1 && rebaseConflict(error, token, displayId)) return persistLatest(retries + 1);
        if (latest && !latest.error && (latest.intent || 0) > intent) return persistLatest(0);
        if (latest) latest.error = (error.payload && (error.payload.message || error.payload.error && error.payload.error.message)) || error.message || "Не удалось сохранить черновик.";
        render();
        throw error;
      });
    }
    var pending = enqueue(function () { return persistLatest(0); });
    context.pending[item.id] = pending;
    return pending.finally(function () { if (context.pending[item.id] === pending) delete context.pending[item.id]; });
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
      if (context.displayId && context.displayId !== id) {
        Object.keys(context.timers).forEach(function (key) { clearTimeout(context.timers[key]); });
        context.contextToken++; context.drafts={}; context.pending={}; context.timers={}; context.document=null;
      }
      context.displayId=id; context.revision=Math.max(context.revision, revision || 0);
    },
    setView:function (page, plotType) {
      context.page=page || "display"; context.plotType=plotType || "time";
    },
    beginCustomRender:function () { context.renderedFields={}; },
    renderRows:function (ids) {
      return (ids || []).map(function (id) { var item=sourceItem(id); return item ? Object.assign({}, item, { visible:true }) : null; }).filter(Boolean).map(renderField).join("");
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
    render:render,
    flush:function () {
      Object.keys(context.timers).forEach(function (key) { clearTimeout(context.timers[key]); delete context.timers[key]; });
      return Promise.all(visibleItems().filter(isApply).map(send));
    },
    markApplied:function () { context.drafts={}; render(); },
    state:function () { var visible=visibleItems().reduce(function(ids,item){ids[item.id]=true;return ids;},{}), all=Object.keys(context.drafts).filter(function(key){return visible[key];}).map(function (key) { return context.drafts[key]; }); return { dirty:all.some(function (draft) { return !draft.error; }), invalid:all.some(function (draft) { return draft.error; }), displayId:context.displayId, revision:context.revision }; },
    value:function (id) { var item=sourceItem(id); return item ? value(item) : undefined; },
    setValue:function (id, raw) { var item=sourceItem(id); return item ? update(Object.assign({}, item, { visible:true }), raw) : Promise.reject(new Error("Настройка недоступна: " + id)); },
    setRevision:function (revision) { if (typeof revision === "number" && revision >= context.revision) context.revision=revision; }
  };
})(window, document);
