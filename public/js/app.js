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
  var intendedSelection = null;
  var mutationInFlight = false;
  var plotlyPromise = null;
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
  function normalizeSnapshot(snapshot) {
    var next = isObject(snapshot) ? snapshot : {};
    return {
      state_revision: next.state_revision,
      active_plot: PLOT_ORDER.indexOf(next.active_plot) >= 0 ? next.active_plot : "time",
      selected_signal: String(next.selected_signal || ""),
      signals: Array.isArray(next.signals) ? next.signals : [],
      plots: isObject(next.plots) ? next.plots : {},
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
  function hasPlotly() { return Boolean(window.Plotly && typeof window.Plotly.react === "function"); }
  function ensurePlotly() {
    if (hasPlotly()) return Promise.resolve(window.Plotly);
    if (plotlyPromise) return plotlyPromise;
    plotlyPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdn.plot.ly/plotly-3.1.0.min.js";
      script.async = true;
      script.onload = function () { hasPlotly() ? resolve(window.Plotly) : reject(new Error("Plotly не зарегистрирован")); };
      script.onerror = function () { reject(new Error("Не удалось загрузить Plotly")); };
      document.head.appendChild(script);
    }).catch(function (error) { plotlyPromise = null; throw error; });
    return plotlyPromise;
  }
  function plotPlaceholder(host, message, error) {
    host.innerHTML = "<div class=\"plot-placeholder" + (error ? " is-error" : "") + "\">" + escapeHtml(message) + "</div>";
  }
  function plotDefinition(plotId, payload) {
    var plot = isObject(payload) ? payload : {};
    var baseLayout = {
      margin: { l: 58, r: plot.type === "heatmap" ? 62 : 18, t: 12, b: 46 },
      paper_bgcolor: "#ffffff", plot_bgcolor: "#ffffff", font: { family: "Roboto, Arial, sans-serif", size: 12, color: "#1f2937" },
      xaxis: { title: { text: plot.x_label || "" }, gridcolor: "#e8edf2", zerolinecolor: "#d9e0e7", automargin: true },
      yaxis: { title: { text: plot.y_label || "" }, gridcolor: "#e8edf2", zerolinecolor: "#d9e0e7", automargin: true },
      showlegend: false,
    };
    if (plot.type === "line") {
      var selected = (state.signals || []).filter(function (signal) { return signal.name === state.selected_signal; })[0] || {};
      return { data: [{ type: "scatter", mode: "lines", x: Array.isArray(plot.x) ? plot.x : [], y: Array.isArray(plot.y) ? plot.y : [], line: { color: selected.color || "#1676e6", width: 1.4 }, name: state.selected_signal || "Сигнал", hovertemplate: "%{x}<br>%{y}<extra></extra>" }], layout: baseLayout };
    }
    if (plot.type === "heatmap") {
      return { data: [{ type: "heatmap", x: Array.isArray(plot.x) ? plot.x : [], y: Array.isArray(plot.y) ? plot.y : [], z: Array.isArray(plot.z) ? plot.z : [], colorscale: "Jet", colorbar: { title: { text: plot.color_label || "" }, thickness: 12, len: 0.86 }, hovertemplate: "x: %{x}<br>y: %{y}<br>z: %{z}<extra></extra>" }], layout: baseLayout };
    }
    return null;
  }
  function renderPlots() {
    PLOT_ORDER.forEach(function (plotId) {
      var host = document.querySelector("[data-plot-host='" + plotId + "']");
      var payload = state && state.plots ? state.plots[plotId] : null;
      var definition = plotDefinition(plotId, payload);
      if (!host) return;
      if (!definition || !payload || (!Array.isArray(payload.y) && !Array.isArray(payload.z))) {
        plotPlaceholder(host, "Нет данных для отображения.");
        return;
      }
      if (!hasPlotly()) {
        plotPlaceholder(host, "Подготовка графика…");
        return;
      }
      if (host.clientWidth <= 0 || host.clientHeight <= 0) return;
      window.Plotly.react(host, definition.data, Object.assign(definition.layout, { width: host.clientWidth, height: host.clientHeight, autosize: false }), { responsive: true, displaylogo: false, displayModeBar: true })
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
    document.querySelector("[data-signal-count]").textContent = rows.length ? rows.length + " " + (rows.length === 1 ? "сигнал" : "сигналов") : "";
    document.querySelector("[data-signal-rows]").innerHTML = rows.length ? rows.map(function (signal) {
      var selected = signal.name === state.selected_signal;
      return "<tr tabindex=\"0\" role=\"button\" aria-label=\"Выбрать сигнал " + escapeHtml(signal.name) + "\" aria-pressed=\"" + selected + "\" class=\"signal-row" + (selected ? " is-selected" : "") + "\" data-signal=\"" + escapeHtml(signal.name) + "\" data-testid=\"signal-row-" + safeName(signal.name) + "\"><td>" + escapeHtml(signal.name) + "</td><td><span class=\"color-swatch\" style=\"--signal-color:" + escapeHtml(signal.color || "#8a98a5") + "\" aria-label=\"Цвет сигнала\"></span></td><td>" + formatRate(signal.sample_rate_hz) + "</td><td>" + formatSamples(signal.sample_count) + "</td><td>" + formatDuration(signal.duration_s) + "</td><td>" + escapeHtml(signal.data_type || "—") + "</td></tr>";
    }).join("") : "<tr><td class=\"signal-empty\" colspan=\"6\">Нет доступных сигналов.</td></tr>";
  }
  function applySnapshot(snapshot) {
    state = normalizeSnapshot(snapshot);
    renderCards(); renderPanel(); renderSignals(); renderPlots();
    ensurePlotly().then(renderPlots).catch(function () {
      PLOT_ORDER.forEach(function (plotId) {
        var host = document.querySelector("[data-plot-host='" + plotId + "']");
        if (host) plotPlaceholder(host, "Не удалось загрузить библиотеку графиков.", true);
      });
    });
  }
  function latestTarget(change) {
    var source = intendedSelection || state || {};
    return { active_plot: change.active_plot || source.active_plot, selected_signal: change.selected_signal || source.selected_signal };
  }
  function requestView(target, retryCount) {
    var payload = { state_revision: state && state.state_revision };
    if (target.active_plot) payload.active_plot = target.active_plot;
    if (target.selected_signal) payload.selected_signal = target.selected_signal;
    return api.view(payload).catch(function (error) {
      var current = error && error.payload && error.payload.current;
      if (error && error.status === 409 && current && retryCount < 1) {
        var newestTarget = intendedSelection || target;
        intendedSelection = null;
        applySnapshot(current);
        return requestView(newestTarget, retryCount + 1);
      }
      if (error && error.status === 409 && current) applySnapshot(current);
      throw error;
    });
  }
  function drainMutationQueue() {
    var target;
    if (mutationInFlight || !intendedSelection) return;
    target = intendedSelection;
    intendedSelection = null;
    mutationInFlight = true;
    clearError(); showLoading(true, "Синхронизация выбора…");
    requestView(target, 0).then(function (snapshot) { applySnapshot(snapshot); }).catch(function (error) { showError(humanError(error)); }).finally(function () {
      mutationInFlight = false;
      showLoading(false);
      drainMutationQueue();
    });
  }
  function choose(change) {
    if (!state) return;
    intendedSelection = latestTarget(change);
    drainMutationQueue();
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
      var row = event.target.closest("[data-signal]"); if (row) choose({ selected_signal: row.getAttribute("data-signal") });
    });
    document.querySelector("[data-signal-rows]").addEventListener("keydown", function (event) {
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
