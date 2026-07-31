(function signalAnalyserApp(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var PLOT_ORDER = ["time", "spectrum", "spectrogram", "persistence"];
  var PLOT_TITLES = {
    time: "Время",
    spectrum: "Спектр",
    spectrogram: "Спектрограмма",
    persistence: "Спектр персистентности",
  };
  var state = null;
  var intendedView = null;
  var mutationInFlight = false;
  var plotlyPromise = null;
  var PLOTLY_LOCAL_FILE = "vendor/plotly-cartesian-3.1.0.min.js";
  var PLOTLY_CDN_URL = "https://cdn.plot.ly/plotly-3.1.0.min.js";
  var applicationScriptUrl = document.currentScript && document.currentScript.src;
  var resizeObserver = null;
  var root = document.querySelector("[data-testid='app-shell']");
  var loading = document.querySelector("[data-testid='app-loading']");
  var loadingText = document.querySelector("[data-loading-text]");
  var errorPanel = document.querySelector("[data-testid='app-error']");
  var errorText = document.querySelector("[data-error-text]");

  function isObject(value) { return value && typeof value === "object"; }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'\"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character];
    });
  }
  function safeName(name) {
    var normalized = String(name || "").trim().toLowerCase().normalize("NFKD")
      .replace(/[^a-z0-9_]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || ("signal-" + encodeURIComponent(String(name || "unknown")).replace(/[^a-z0-9]/gi, "").toLowerCase());
  }
  function signalName(signal) { return String(signal && signal.name || ""); }
  function signalNames(signals) {
    return (Array.isArray(signals) ? signals : []).map(signalName).filter(Boolean);
  }
  function orderedExistingNames(names, signals) {
    var requested = {};
    (Array.isArray(names) ? names : []).forEach(function (name) { if (name) requested[String(name)] = true; });
    return signalNames(signals).filter(function (name) { return requested[name]; });
  }
  function namesFromSnapshot(next) {
    var direct = Array.isArray(next.visible_signals) ? next.visible_signals
      : Array.isArray(next.visible_signal_names) ? next.visible_signal_names
        : Array.isArray(next.visibleSignals) ? next.visibleSignals : null;
    var signals = Array.isArray(next.signals) ? next.signals : [];
    var hasVisibility = signals.some(function (signal) { return signal && typeof signal.visible === "boolean"; });
    var explicit = signals.filter(function (signal) { return signal && signal.visible !== false; }).map(signalName).filter(Boolean);
    if (direct) return direct;
    if (hasVisibility) return explicit;
    return signalNames(signals);
  }
  function normalizeVisible(names, signals) {
    var ordered = orderedExistingNames(names, signals);
    if (ordered.length) return ordered;
    var all = signalNames(signals);
    return all.length ? [all[0]] : [];
  }
  function normalizeSelected(selected, visible) {
    var value = String(selected || "");
    return visible.indexOf(value) >= 0 ? value : (visible[0] || value);
  }
  function normalizeSnapshot(snapshot) {
    var next = isObject(snapshot) ? snapshot : {};
    var signals = Array.isArray(next.signals) ? next.signals : [];
    var hasTopLevelVisible = Array.isArray(next.visible_signals) || Array.isArray(next.visible_signal_names) || Array.isArray(next.visibleSignals);
    var visible = normalizeVisible(namesFromSnapshot(next), signals);
    return {
      state_revision: next.state_revision,
      visibility_contract: hasTopLevelVisible,
      active_plot: PLOT_ORDER.indexOf(next.active_plot) >= 0 ? next.active_plot : "time",
      selected_signal: normalizeSelected(next.selected_signal, visible),
      visible_signals: visible,
      signals: signals,
      plots: isObject(next.plots) ? next.plots : {},
      plot_payload: isObject(next.plot_payload) ? next.plot_payload : {},
      panel: isObject(next.panel) ? next.panel : { title: "Параметры отображения", active_plot: "time", fields: [] },
    };
  }
  function showLoading(visible, text) {
    loading.hidden = !visible;
    if (text) loadingText.textContent = text;
    root.setAttribute("aria-busy", visible ? "true" : "false");
  }
  function showError(message) {
    errorText.textContent = message || "Не удалось загрузить данные анализатора.";
    errorPanel.hidden = false;
  }
  function clearError() { errorPanel.hidden = true; errorText.textContent = ""; }
  function humanError(error) {
    if (error && error.status === 422) return "Сервер отклонил параметры отображения. Проверьте состояние сигнала.";
    return "Не удалось синхронизировать состояние анализатора. Повторите попытку.";
  }
  function plotlyInstance() {
    var plotly = window.Plotly;
    if (!plotly && window.moduleName && typeof window.moduleName.react === "function") {
      plotly = window.moduleName;
      window.Plotly = plotly;
    }
    return plotly;
  }
  function hasPlotly() {
    var plotly = plotlyInstance();
    return Boolean(plotly && typeof plotly.react === "function");
  }
  function plotlyLocalUrl() {
    if (applicationScriptUrl && window.URL) return new window.URL(PLOTLY_LOCAL_FILE, applicationScriptUrl).href;
    return "./js/" + PLOTLY_LOCAL_FILE;
  }
  function loadPlotlyScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = function () { hasPlotly() ? resolve(window.Plotly) : reject(new Error("Plotly не зарегистрирован")); };
      script.onerror = function () { reject(new Error("Не удалось загрузить Plotly")); };
      document.head.appendChild(script);
    });
  }
  function ensurePlotly() {
    if (hasPlotly()) return Promise.resolve(window.Plotly);
    if (plotlyPromise) return plotlyPromise;
    plotlyPromise = loadPlotlyScript(plotlyLocalUrl()).catch(function () {
      return loadPlotlyScript(PLOTLY_CDN_URL);
    }).catch(function (error) { plotlyPromise = null; throw error; });
    return plotlyPromise;
  }
  function plotPlaceholder(host, message, error) {
    clearPlotPlaceholders(host);
    host.setAttribute("data-plot-ready", "false");
    host.setAttribute("data-plot-state", error ? "error" : "placeholder");
    var placeholder = document.createElement("div");
    placeholder.className = "plot-placeholder" + (error ? " is-error" : "");
    placeholder.textContent = message;
    host.appendChild(placeholder);
  }
  function clearPlotPlaceholders(host) {
    if (!host || typeof host.querySelectorAll !== "function") return;
    Array.prototype.slice.call(host.querySelectorAll(".plot-placeholder")).forEach(function (placeholder) {
      placeholder.parentNode.removeChild(placeholder);
    });
  }
  function markPlotReady(host) {
    host.setAttribute("data-plot-ready", "true");
    host.setAttribute("data-plot-state", "ready");
  }
  function signalByName(name) {
    return (state.signals || []).filter(function (signal) { return signalName(signal) === name; })[0] || {};
  }
  function visibleSignals() {
    return normalizeVisible(state && state.visible_signals, state && state.signals);
  }
  function isVisibleSignal(name) {
    return visibleSignals().indexOf(String(name || "")) >= 0;
  }
  function traceSignalName(item) {
    return String(item && (item.signal || item.signal_name || item.name || item.label) || "");
  }
  function seriesFromMap(map, xMap) {
    if (!isObject(map)) return [];
    return Object.keys(map).map(function (name) {
      var value = map[name];
      if (isObject(value) && (Array.isArray(value.y) || Array.isArray(value.z))) {
        return Object.assign({ name: name, signal: name }, value);
      }
      return { name: name, signal: name, x: isObject(xMap) ? xMap[name] : undefined, y: value };
    });
  }
  function plotSeries(plot) {
    if (Array.isArray(plot.traces)) return plot.traces;
    if (Array.isArray(plot.series)) return plot.series;
    if (Array.isArray(plot.signals)) return plot.signals;
    if (isObject(plot.signals)) return seriesFromMap(plot.signals, plot.x_by_signal);
    if (isObject(plot.y_by_signal)) return seriesFromMap(plot.y_by_signal, plot.x_by_signal);
    if (isObject(plot.z_by_signal)) return seriesFromMap(plot.z_by_signal, plot.x_by_signal);
    return [];
  }
  function isPlotlyTrace(trace) {
    return isObject(trace) && (trace.type || trace.mode || Array.isArray(trace.y) || Array.isArray(trace.z));
  }
  function lineTraces(plot) {
    var visible = visibleSignals();
    var data = Array.isArray(plot.data) && plot.data.every(isPlotlyTrace) ? plot.data : null;
    var series = data || plotSeries(plot);
    var byName = {};
    series.forEach(function (item) {
      var name = traceSignalName(item);
      if (name) byName[name] = item;
    });
    var traces = visible.map(function (name) {
      var item = byName[name];
      var signal = signalByName(name);
      if (!item || !Array.isArray(item.y)) return null;
      if (data) {
        return Object.assign({}, item, {
          name: name,
          showlegend: true,
          line: Object.assign({}, item.line || {}, { color: (item.line && item.line.color) || signal.color || "#1676e6" }),
        });
      }
      return {
        type: "scatter",
        mode: "lines",
        x: Array.isArray(item.x) ? item.x : Array.isArray(plot.x) ? plot.x : [],
        y: item.y,
        line: { color: item.color || signal.color || "#1676e6", width: 1.4 },
        name: name,
        showlegend: true,
        hovertemplate: "%{x}<br>%{y}<extra>" + escapeHtml(name) + "</extra>",
      };
    }).filter(Boolean);
    if (!traces.length && Array.isArray(plot.y) && isVisibleSignal(state.selected_signal)) {
      var selected = signalByName(state.selected_signal);
      traces.push({ type: "scatter", mode: "lines", x: Array.isArray(plot.x) ? plot.x : [], y: plot.y, line: { color: selected.color || "#1676e6", width: 1.4 }, name: state.selected_signal || "Сигнал", showlegend: true, hovertemplate: "%{x}<br>%{y}<extra></extra>" });
    }
    return traces;
  }
  function selectedHeatmapPayload(plot) {
    var selected = normalizeSelected(state.selected_signal, visibleSignals());
    var series = plotSeries(plot);
    var direct = null;
    series.forEach(function (item) {
      if (!direct && traceSignalName(item) === selected && Array.isArray(item.z)) direct = item;
    });
    if (direct) return direct;
    return Array.isArray(plot.z) ? plot : null;
  }
  function renderPayload(plotId) {
    var plots = state && isObject(state.plots) ? state.plots : {};
    var base = isObject(plots[plotId]) ? plots[plotId] : {};
    var payload = state && isObject(state.plot_payload) ? state.plot_payload : {};
    if (plotId === "time" && Array.isArray(payload.time_traces)) {
      return Object.assign({}, base, { traces: payload.time_traces });
    }
    if (plotId === "spectrum" && Array.isArray(payload.spectrum_traces)) {
      return Object.assign({}, base, { traces: payload.spectrum_traces });
    }
    if ((plotId === "spectrogram" || plotId === "persistence") && isObject(payload[plotId])) {
      return Object.assign({}, base, payload[plotId]);
    }
    return base;
  }
  function plotDefinition(plotId, payload) {
    var plot = isObject(payload) ? payload : {};
    var isHeatmap = plot.type === "heatmap" || plotId === "spectrogram" || plotId === "persistence";
    var baseLayout = {
      margin: { l: 58, r: isHeatmap ? 62 : 18, t: 12, b: isHeatmap ? 46 : 56 },
      paper_bgcolor: "#ffffff", plot_bgcolor: "#ffffff", font: { family: "Roboto, Arial, sans-serif", size: 12, color: "#1f2937" },
      xaxis: { title: { text: plot.x_label || "" }, gridcolor: "#e8edf2", zerolinecolor: "#d9e0e7", automargin: true },
      yaxis: { title: { text: plot.y_label || "" }, gridcolor: "#e8edf2", zerolinecolor: "#d9e0e7", automargin: true },
      showlegend: !isHeatmap,
      legend: { orientation: "h", x: 0, y: -0.22, xanchor: "left", yanchor: "top" },
    };
    if (!isHeatmap) {
      var traces = lineTraces(plot);
      return traces.length ? { data: traces, layout: Object.assign({}, baseLayout, plot.layout || {}, { showlegend: true, legend: baseLayout.legend }) } : null;
    }
    var heatmap = selectedHeatmapPayload(plot);
    if (heatmap) {
      return { data: [{ type: "heatmap", x: Array.isArray(heatmap.x) ? heatmap.x : Array.isArray(plot.x) ? plot.x : [], y: Array.isArray(heatmap.y) ? heatmap.y : Array.isArray(plot.y) ? plot.y : [], z: heatmap.z, colorscale: heatmap.colorscale || "Jet", colorbar: { title: { text: plot.color_label || heatmap.color_label || "" }, thickness: 12, len: 0.86 }, name: state.selected_signal || "Сигнал", hovertemplate: "x: %{x}<br>y: %{y}<br>z: %{z}<extra></extra>" }], layout: Object.assign({}, baseLayout, plot.layout || {}, { showlegend: false }) };
    }
    return null;
  }
  function renderPlots() {
    PLOT_ORDER.forEach(function (plotId) {
      var host = document.querySelector("[data-plot-host='" + plotId + "']");
      var payload = renderPayload(plotId);
      var definition = plotDefinition(plotId, payload);
      if (!host) return;
      if (!definition || !payload) {
        plotPlaceholder(host, "Нет данных для отображения.");
        return;
      }
      if (!hasPlotly()) {
        plotPlaceholder(host, "Подготовка графика…");
        return;
      }
      if (host.clientWidth <= 0 || host.clientHeight <= 0) return;
      clearPlotPlaceholders(host);
      window.Plotly.react(host, definition.data, Object.assign(definition.layout, { width: host.clientWidth, height: host.clientHeight, autosize: false }), { responsive: true, displaylogo: false, displayModeBar: true })
        .then(function () { clearPlotPlaceholders(host); markPlotReady(host); })
        .catch(function () { plotPlaceholder(host, "Не удалось отобразить график.", true); });
    });
  }
  function renderCards() {
    PLOT_ORDER.forEach(function (plotId) {
      var card = document.querySelector("[data-plot='" + plotId + "']");
      var active = state.active_plot === plotId;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  function formatValue(field) {
    var value = field && field.value;
    var raw = value == null || value === "" ? "—" : String(value);
    return field && field.unit ? raw + " " + field.unit : raw;
  }
  function renderPanel() {
    var panel = state.panel || {};
    var title = panel.title || PLOT_TITLES[state.active_plot] || "Параметры отображения";
    var fields = Array.isArray(panel.fields) ? panel.fields : [];
    document.querySelector("[data-testid='active-plot-title']").textContent = title;
    document.querySelector("[data-panel-fields]").innerHTML = fields.length ? fields.map(function (field) {
      var id = safeName(field.id || field.label);
      return "<div class=\"plot-field\" data-testid=\"active-plot-field-" + id + "\"><dt>" + escapeHtml(field.label || field.id || "Параметр") + "</dt><dd data-testid=\"active-plot-field-value-" + id + "\">" + escapeHtml(formatValue(field)) + "</dd></div>";
    }).join("") : "<div class=\"panel-empty\">Для этого отображения нет доступных параметров.</div>";
  }
  function formatRate(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat("ru-RU").format(Number(value)) + " Гц" : "—"; }
  function formatSamples(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat("ru-RU").format(Number(value)) : "—"; }
  function formatDuration(value) { return Number.isFinite(Number(value)) ? Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 6 }) + " с" : "—"; }
  function renderSignals() {
    var rows = state.signals || [];
    var visible = visibleSignals();
    var lastVisible = visible.length <= 1;
    document.querySelector("[data-signal-count]").textContent = rows.length ? rows.length + " " + (rows.length === 1 ? "сигнал" : "сигналов") + ", видно " + visible.length : "";
    document.querySelector("[data-signal-rows]").innerHTML = rows.length ? rows.map(function (signal) {
      var name = signalName(signal);
      var selected = name === state.selected_signal;
      var checked = visible.indexOf(name) >= 0;
      var id = safeName(name);
      var disabled = checked && lastVisible;
      return "<tr tabindex=\"0\" role=\"button\" aria-label=\"Выбрать сигнал " + escapeHtml(name) + "\" aria-pressed=\"" + selected + "\" class=\"signal-row" + (selected ? " is-selected" : "") + "\" data-signal=\"" + escapeHtml(name) + "\" data-visible=\"" + checked + "\" data-testid=\"signal-row-" + id + "\"><td class=\"visibility-cell\"><label class=\"visibility-control\" data-signal-visibility-control><input type=\"checkbox\" data-signal-visibility=\"" + escapeHtml(name) + "\" data-testid=\"signal-visibility-checkbox-" + id + "\" " + (checked ? "checked " : "") + (disabled ? "disabled " : "") + "aria-label=\"Видимость сигнала " + escapeHtml(name) + "\"><span data-testid=\"signal-visibility-state-" + id + "\">" + (checked ? "Виден" : "Скрыт") + "</span></label></td><td>" + escapeHtml(name) + "</td><td><span class=\"color-swatch\" style=\"--signal-color:" + escapeHtml(signal.color || "#8a98a5") + "\" aria-label=\"Цвет сигнала\"></span></td><td>" + formatRate(signal.sample_rate_hz) + "</td><td>" + formatSamples(signal.sample_count) + "</td><td>" + formatDuration(signal.duration_s) + "</td><td>" + escapeHtml(signal.data_type || "—") + "</td></tr>";
    }).join("") : "<tr><td class=\"signal-empty\" colspan=\"7\">Нет доступных сигналов.</td></tr>";
  }
  function applySnapshot(snapshot, preserveView) {
    state = normalizeSnapshot(snapshot);
    if (preserveView) {
      state.active_plot = preserveView.active_plot;
      state.visible_signals = normalizeVisible(preserveView.visible_signals, state.signals);
      state.selected_signal = normalizeSelected(preserveView.selected_signal, state.visible_signals);
      state.visibility_contract = state.visibility_contract || preserveView.include_visible_signals;
    }
    renderCards(); renderPanel(); renderSignals(); renderPlots();
    ensurePlotly().then(renderPlots).catch(function () {
      PLOT_ORDER.forEach(function (plotId) {
        var host = document.querySelector("[data-plot-host='" + plotId + "']");
        if (host) plotPlaceholder(host, "Не удалось загрузить библиотеку графиков.", true);
      });
    });
  }
  function currentView() {
    return {
      active_plot: state && state.active_plot || "time",
      selected_signal: state && state.selected_signal || "",
      visible_signals: visibleSignals(),
      include_visible_signals: Boolean(state && state.visibility_contract),
    };
  }
  function canonicalTarget(target) {
    var next = {
      active_plot: PLOT_ORDER.indexOf(target.active_plot) >= 0 ? target.active_plot : "time",
      visible_signals: normalizeVisible(target.visible_signals, state && state.signals),
      selected_signal: target.selected_signal,
      include_visible_signals: Boolean(target.include_visible_signals),
    };
    next.selected_signal = normalizeSelected(next.selected_signal, next.visible_signals);
    return next;
  }
  function nextTarget(change) {
    var source = intendedView || currentView();
    return canonicalTarget({
      active_plot: change.active_plot || source.active_plot,
      selected_signal: change.selected_signal || source.selected_signal,
      visible_signals: Array.isArray(change.visible_signals) ? change.visible_signals : source.visible_signals,
      include_visible_signals: Boolean(source.include_visible_signals || Array.isArray(change.visible_signals)),
    });
  }
  function applyOptimisticView(target) {
    state.active_plot = target.active_plot;
    state.visible_signals = target.visible_signals;
    state.selected_signal = target.selected_signal;
    state.visibility_contract = state.visibility_contract || target.include_visible_signals;
    renderCards(); renderPanel(); renderSignals(); renderPlots();
  }
  function requestView(target, retryCount) {
    var payload = { state_revision: state && state.state_revision };
    if (target.active_plot) payload.active_plot = target.active_plot;
    if (target.selected_signal) payload.selected_signal = target.selected_signal;
    if (target.include_visible_signals || state && state.visibility_contract) payload.visible_signals = target.visible_signals || [];
    return api.view(payload).catch(function (error) {
      var current = error && error.payload && error.payload.current;
      if (error && error.status === 409 && current && retryCount < 1) {
        var newestTarget = intendedView || target;
        intendedView = null;
        applySnapshot(current, newestTarget);
        return requestView(newestTarget, retryCount + 1);
      }
      if (error && error.status === 409 && current) applySnapshot(current, intendedView);
      throw error;
    });
  }
  function drainMutationQueue() {
    var target;
    if (mutationInFlight || !intendedView) return;
    target = intendedView;
    intendedView = null;
    mutationInFlight = true;
    clearError(); showLoading(true, "Синхронизация выбора…");
    requestView(target, 0).then(function (snapshot) { applySnapshot(snapshot, intendedView); }).catch(function (error) { showError(humanError(error)); }).finally(function () {
      mutationInFlight = false;
      showLoading(false);
      drainMutationQueue();
    });
  }
  function choose(change) {
    if (!state) return;
    intendedView = nextTarget(change);
    applyOptimisticView(intendedView);
    drainMutationQueue();
  }
  function changeVisibility(name, checked) {
    var visible = visibleSignals();
    var nextVisible = checked ? visible.concat([name]).filter(function (value, index, list) { return list.indexOf(value) === index; })
      : visible.filter(function (value) { return value !== name; });
    nextVisible = orderedExistingNames(nextVisible, state.signals);
    if (!nextVisible.length) {
      showError("Нельзя скрыть последний видимый сигнал.");
      renderSignals();
      return;
    }
    choose({ visible_signals: nextVisible, selected_signal: normalizeSelected(state.selected_signal, nextVisible) });
  }
  function loadState() {
    clearError(); showLoading(true, "Загрузка данных анализатора…");
    api.getState().then(function (snapshot) { applySnapshot(snapshot); }).catch(function (error) { showError(humanError(error)); }).finally(function () { showLoading(false); });
  }
  function bindEvents() {
    document.querySelector("[data-testid='plot-grid']").addEventListener("click", function (event) {
      var card = event.target.closest("[data-plot]");
      if (card) choose({ active_plot: card.getAttribute("data-plot") });
    });
    document.querySelector("[data-testid='plot-grid']").addEventListener("keydown", function (event) {
      var card = event.target.closest("[data-plot]");
      if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); choose({ active_plot: card.getAttribute("data-plot") }); }
    });
    document.querySelector("[data-signal-rows]").addEventListener("click", function (event) {
      if (event.target.closest("[data-signal-visibility], [data-signal-visibility-control]")) { event.stopPropagation(); return; }
      var row = event.target.closest("[data-signal]"); if (row) choose({ selected_signal: row.getAttribute("data-signal") });
    });
    document.querySelector("[data-signal-rows]").addEventListener("change", function (event) {
      var checkbox = event.target.closest("[data-signal-visibility]");
      if (!checkbox) return;
      event.stopPropagation();
      changeVisibility(checkbox.getAttribute("data-signal-visibility"), checkbox.checked);
    });
    document.querySelector("[data-signal-rows]").addEventListener("keydown", function (event) {
      if (event.target.closest("[data-signal-visibility], [data-signal-visibility-control]")) return;
      var row = event.target.closest("[data-signal]"); if (row && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); choose({ selected_signal: row.getAttribute("data-signal") }); }
    });
    document.querySelector("[data-retry]").addEventListener("click", loadState);
    if (window.ResizeObserver) {
      resizeObserver = new window.ResizeObserver(function () { if (state && hasPlotly()) renderPlots(); });
      resizeObserver.observe(document.querySelector("[data-testid='plot-grid']"));
    }
    window.addEventListener("beforeunload", function () {
      if (resizeObserver) resizeObserver.disconnect();
      document.querySelectorAll("[data-plot-host]").forEach(function (host) { if (hasPlotly()) window.Plotly.purge(host); });
    });
  }
  bindEvents();
  loadState();
})(window, document);
