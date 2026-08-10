(function signalAnalyserApp(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var settings = window.SignalAnalyserSettings;
  var titles = { time: "Временная область", spectrum: "Спектр", spectrogram: "Спектрограмма", persistence: "Спектр персистентности" };
  var measurementOptions = [
    { id:"minimum", label:"Минимум" }, { id:"maximum", label:"Максимум" },
    { id:"mean", label:"Среднее" }, { id:"median", label:"Медиана" },
    { id:"peak_to_peak", label:"Размах" }, { id:"rms", label:"Среднеквадратичное" }
  ];
  var model = {
    state: null, revision: -1, layout: null, activePane: null,
    settingsPage: "display", inspectorPage: "signals", inspectorSearch:"", visibleColumns: { color:true, sample_rate:true, sample_count:true, duration:true, data_type:true }, outputs: {}, outputTokens: {}, pollByPane: {},
    plotQueue: {}, plotInFlight: {}, plotResizeFrames: {}, toastTimer: null,
    layoutDraft: null, renderFrame: null, plotlyPromise: null,
    displayTabsFrame: null, revealDisplayTab: false, renderedDisplayId: null, displayTabsObserver: null,
    measurementSearch: "", measurementsRecord: null, measurementsToken: 0, peaksRecord: null, peaksToken: 0, peaksRecords: {}, peaksTokens: {}, peaksPollByPane: {}, peaksDraft: null,
    signalAddCatalog: null, signalAddTrigger: null, signalAddToken: 0, signalAddLoading: false, signalAddSubmitting: false
  };

  function q(selector) { return document.querySelector(selector); }
  function qa(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]; }); }
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
    settings.setRevision(r);
    updateLayout(snapshot);
    var display = activeDisplay();
    if (display) {
      cancelInactiveDisplayWork(display.id);
      stopPeaksPolling(model.inspectorPage === "peaks" && model.activePane ? paneRuntimeKey(display.id, model.activePane) : "");
      settings.setContext(display.id, r);
    }
    return true;
  }

  function updateLayout(snapshot) {
    var source = (snapshot.layouts || []).filter(function (item) { return item.display_id === snapshot.active_display_id; })[0];
    model.layout = source ? source.layout : snapshot.layout;
    model.activePane = model.layout && model.layout.active_pane_id;
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
  }

  function renderTabs() {
    var tablist = q("[data-testid='display-tabs']");
    if (!tablist) return;
    var activeId = model.state.active_display_id;
    var revealActive = model.renderedDisplayId !== activeId;
    tablist.innerHTML = (model.state.displays || []).map(function (display, index) {
      var selected = display.id === model.state.active_display_id;
      return "<div class='display-tab-shell" + (selected ? " is-selected" : "") + "' data-screen-id='" + esc(display.id) + "'>" +
        "<button class='display-tab' type='button' role='tab' data-display-select='" + esc(display.id) + "' data-testid='display-tab-" + esc(display.id) + "' aria-selected='" + selected + "'><span>Экран " + (index + 1) + "</span></button>" +
        "<button class='display-tab-close' type='button' data-display-close='" + esc(display.id) + "' data-testid='display-close-" + esc(display.id) + "' aria-label='Удалить экран " + (index + 1) + "' data-tooltip='Удалить экран " + (index + 1) + "'" + (model.state.displays.length === 1 ? " disabled" : "") + "><img src='./icons/close.svg' alt=''></button>" +
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

  function outputMarkup(displayId, pane, output) {
    if (!pane.signal_bindings || !pane.signal_bindings.length) return "<div class='plot-empty' data-testid='pane-empty-" + esc(pane.id) + "'><span class='visually-hidden' role='status'>В области нет видимых сигналов</span></div>";
    if (!output || !output.isready) return "<div class='plot-initial-loading' data-testid='pane-loader-" + esc(pane.id) + "' role='status' aria-label='Загрузка графика'><span class='spinner'></span><span>Загрузка графика</span></div>";
    if (!output.success) return "<div class='plot-error' data-testid='pane-error-" + esc(pane.id) + "' role='alert'>" + esc(output.error || "Не удалось загрузить график.") + "</div>";
    return "<div class='plot-chart' data-pane-host='" + esc(paneRuntimeKey(displayId, pane.id)) + "' data-testid='plot-host-" + esc(pane.id) + "' data-plot-ready='false'></div>";
  }

  function renderGrid() {
    var grid = q("[data-testid='plot-grid']");
    if (!grid) return;
    grid.style.gridTemplateColumns = "repeat(" + model.layout.columns + ", minmax(0, 1fr))";
    grid.style.gridTemplateRows = "repeat(" + model.layout.rows + ", minmax(0, 1fr))";
    var display = activeDisplay();
    if (!display) return;
    grid.innerHTML = panes().map(function (pane, index) {
      var runtimeKey = paneRuntimeKey(display.id, pane.id);
      var output = model.outputs[runtimeKey] && model.outputs[runtimeKey].output;
      var selected = pane.id === model.activePane;
      return "<section class='plot-pane" + (selected ? " is-active" : "") + "' tabindex='0' data-pane-id='" + esc(pane.id) + "' data-testid='plot-pane-" + esc(pane.id) + "' aria-label='Область " + (index + 1) + (selected ? ", активная" : "") + "'>" +
        "<header class='plot-pane-header'><span class='plot-pane-title'>Область " + (index + 1) + "</span><div class='plot-control-cluster'><select class='pane-select' data-pane-type='" + esc(pane.id) + "' data-testid='pane-type-" + esc(pane.id) + "' aria-label='Тип графика области " + (index + 1) + "'>" +
        Object.keys(titles).map(function (kind) { return "<option value='" + kind + "'" + (pane.plot_type === kind ? " selected" : "") + ">" + titles[kind] + "</option>"; }).join("") +
        "</select><button class='plot-more' type='button' data-pane-menu='" + esc(pane.id) + "' data-testid='pane-menu-" + esc(pane.id) + "' aria-label='Действия области " + (index + 1) + "' aria-haspopup='menu' aria-expanded='false'><img src='./icons/more-vertical.svg' alt=''></button></div></header>" +
        "<div class='plot-canvas' aria-label='График области " + (index + 1) + "'>" + outputMarkup(display.id, pane, output) + "</div></section>";
    }).join("");
    panes().forEach(function (pane) {
      var record = model.outputs[paneRuntimeKey(display.id, pane.id)];
      if (record && record.output && record.output.isready && record.output.success && hasPlotData(record.output.data)) enqueuePlot(display.id, pane, record);
    });
  }

  function renderActivePaneContext() {
    var display = activeDisplay();
    if (!display || !model.layout) return;
    var shell = q("[data-testid='app-shell']");
    if (shell) {
      shell.dataset.stateRevision = String(model.revision);
      shell.dataset.activePane = model.activePane || "";
    }
    qa("[data-pane-id]").forEach(function (node, index) {
      var selected = node.dataset.paneId === model.activePane;
      node.classList.toggle("is-active", selected);
      node.setAttribute("aria-label", "Область " + (index + 1) + (selected ? ", активная" : ""));
    });
    renderSettings(display);
    renderInspector();
  }

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
      script.onerror = function () { reject(new Error("Не удалось загрузить библиотеку графиков.")); };
      document.head.appendChild(script);
    });
    return model.plotlyPromise;
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
        return Plotly.react(host, traces, Object.assign({ paper_bgcolor: "#ffffff", plot_bgcolor: "#ffffff", showlegend: true, margin: { l: 44, r: 12, t: 12, b: 34 } }, payload.layout || {}), Object.assign({ displayModeBar: false, displaylogo: false, responsive: true }, payload.config || {})).then(function () { host.dataset.plotReady = "true"; updatePeaksMarkers(displayId, pane.id, model.peaksRecords[paneRuntimeKey(displayId, pane.id)]); });
      }).catch(function () { /* The visible provider error is rendered on the next authoritative response. */ }).finally(function () {
        model.plotInFlight[runtimeKey] = false;
        if (model.plotQueue[runtimeKey]) enqueuePlot(displayId, pane, model.plotQueue[runtimeKey]);
      });
    });
  }

  function renderSettings(display) {
    var pane = paneById(model.activePane);
    var context = q("[data-settings-context]");
    if (context) context.textContent = "Область " + (panes().indexOf(pane) + 1) + " · " + titles[(pane && pane.plot_type) || "time"];
    qa("[data-settings-page]").forEach(function (button) { button.setAttribute("aria-selected", String(button.dataset.settingsPage === model.settingsPage)); });
    settings.setContext(display.id, model.revision);
    settings.setView(model.settingsPage, (pane && pane.plot_type) || "time");
    settings.render();
    renderApply();
  }

  function renderApply() {
    var footer = q("[data-testid='settings-footer']");
    var button = q("[data-testid='settings-apply']");
    var status = q("[data-settings-status]");
    if (!footer || !button || !status) return;
    var state = settings.state();
    var phase = footer.dataset.phase || "pristine";
    var disabled = !state.dirty || state.invalid || phase === "applying" || phase === "pending";
    var label = phase === "error" || phase === "stale" ? "Повторить" : phase === "applying" ? "Применение…" : phase === "pending" ? "Ожидание…" : "Применить";
    footer.dataset.applyState = phase;
    button.disabled = disabled;
    button.textContent = label;
    button.classList.toggle("is-applying", phase === "applying");
    button.classList.toggle("is-pending", phase === "pending");
    status.textContent = footer.dataset.message || (state.invalid ? "Исправьте выделенные поля" : "");
  }

  function renderInspector() {
    var body = q("[data-inspector-content]");
    if (!body) return;
    qa("[data-bottom-tab]").forEach(function (tab) { var active = tab.dataset.bottomTab === model.inspectorPage; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; });
    body.dataset.testid = "inspector-pane-" + model.inspectorPage;
    body.classList.toggle("is-table-only", model.inspectorPage === "peaks");
    if (model.inspectorPage === "measurements") return void renderMeasurementsInspector(body);
    if (model.inspectorPage === "peaks") return void renderPeaksInspector(body);
    var addLayer = q("[data-testid='signal-add-layer']");
    body.innerHTML = "<div class='inspector-search-row'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='search' data-testid='signal-search-input' aria-label='Поиск сигналов' placeholder='Введите название' value='" + esc(model.inspectorSearch) + "'></div><div class='inspector-actions' aria-label='Действия с сигналами'><button class='inspector-action' type='button' data-testid='signals-add-action' data-tooltip='Добавить сигнал' aria-label='Добавить сигнал' aria-haspopup='dialog' aria-controls='signal-add-dialog' aria-expanded='" + String(!!addLayer && !addLayer.hidden) + "'><img src='./icons/plus.svg' alt=''></button><button class='inspector-action' type='button' data-testid='signal-columns-menu-trigger' data-tooltip='Другие действия' aria-label='Другие действия' aria-haspopup='menu' aria-expanded='false'><img src='./icons/more-vertical.svg' alt=''></button></div></div><div class='signal-table-scroll'><table id='signal-table' class='signal-table'><thead><tr data-table-head></tr></thead><tbody data-testid='signal-rows' data-signal-rows></tbody></table><div class='table-empty' role='status' data-testid='signal-search-empty' hidden>Сигналы не найдены</div></div>";
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
    rows.innerHTML = signals.map(function (signal) {
      var values = { name:esc(signal.name), color:"<span class='color-swatch' data-testid='signal-color-" + esc(signal.name) + "' style='--swatch:" + esc(signal.color || "#1686c3") + "' aria-label='Цвет " + esc(signal.name) + "'></span>", sample_rate:esc(signal.sample_rate_hz == null ? "—" : signal.sample_rate_hz), sample_count:esc(signal.sample_count == null ? "—" : signal.sample_count), duration:esc(signal.duration_s == null ? "—" : signal.duration_s), data_type:esc(signal.data_type || "—") };
      var selected = bindings.indexOf(signal.name) >= 0;
      var actions = "<span class='signal-row-actions'><button type='button' class='signal-row-action' data-signal-duplicate='" + esc(signal.name) + "' data-testid='signal-duplicate-" + esc(signal.name) + "' aria-label='Копировать " + esc(signal.name) + "'><img src='./icons/copy.svg' alt=''></button><button type='button' class='signal-row-action is-danger' data-signal-delete='" + esc(signal.name) + "' data-testid='signal-delete-" + esc(signal.name) + "' aria-label='Удалить " + esc(signal.name) + "'><img src='./icons/trash.svg' alt=''></button></span>";
      var cells = renderedColumns.map(function (column, index) {
        var last = index === renderedColumns.length - 1;
        var classes = (column.id === "color" ? "color-cell " : "") + (last ? "is-actions-host" : "");
        return "<td class='" + classes.trim() + "'><span class='signal-cell-value'>" + values[column.id] + "</span>" + (last ? actions : "") + "</td>";
      }).join("");
      return "<tr data-testid='signal-row-" + esc(signal.name) + "' class='" + (selected ? "is-selected" : "") + "'><td><input class='ui-checkbox' type='checkbox' data-visible-signal='" + esc(signal.name) + "' aria-label='Показывать " + esc(signal.name) + " в активной области'" + (selected ? " checked" : "") + "></td>" + cells + "</tr>";
    }).join("");
    var toggleAll = q("[data-visible-all-signals]");
    if (toggleAll) toggleAll.indeterminate = !everySignalVisible && bindings.length > 0;
    q("[data-testid='signal-search-empty']").hidden = signals.length > 0;
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
    body.innerHTML = "<div class='inspector-search-row'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='search' data-testid='measurement-search-input' aria-label='Поиск измерений' placeholder='Введите название' value='" + esc(model.measurementSearch) + "'></div><div class='inspector-actions' aria-label='Действия с измерениями'><button class='inspector-action' type='button' data-testid='measurement-columns-menu-trigger' data-tooltip='Выбрать измерения' aria-label='Выбрать отображаемые измерения' aria-haspopup='menu' aria-expanded='" + String(menuOpen) + "'><img src='./icons/more-vertical.svg' alt=''></button></div></div><div class='signal-table-scroll measurement-table-scroll' data-testid='measurement-table-scroll'></div>";
    var host = q("[data-testid='measurement-table-scroll']");
    if (!current) { host.innerHTML = "<div class='inspector-empty' role='status'>Загрузка измерений…</div>"; return; }
    if (record.error) { host.innerHTML = "<div class='inspector-empty' data-testid='peaks-error' role='alert'>" + esc(record.error) + "</div>"; return; }
    var query = model.measurementSearch.trim().toLowerCase();
    var measurementRows = Array.isArray(record.measurementRows) ? record.measurementRows : (record.measurements ? [record.measurements] : []);
    var visibleRows = measurementRows.filter(function (measurements) {
      var signalName = measurements && measurements.signal_name || "";
      return !!signalName && (!query || String(signalName).toLowerCase().indexOf(query) >= 0);
    });
    var columns = [
      { id:"name", label:"Имя", width:220 },
      { id:"line", label:"Цвет", width:96, className:"measurement-line-cell" },
      { id:"roi_min", label:"Начало области", width:110 },
      { id:"roi_max", label:"Конец области", width:110 }
    ];
    var measurementColumns = {
      minimum:[{ id:"minimum_value", kind:"minimum", itemKey:"value", label:"Минимум", width:160 }, { id:"minimum_time", kind:"minimum", itemKey:"time_s", label:"Время минимума", width:150 }],
      maximum:[{ id:"maximum_value", kind:"maximum", itemKey:"value", label:"Максимум", width:160 }, { id:"maximum_time", kind:"maximum", itemKey:"time_s", label:"Время максимума", width:150 }],
      mean:[{ id:"mean", kind:"mean", itemKey:"value", label:"Среднее", width:150 }],
      median:[{ id:"median", kind:"median", itemKey:"value", label:"Медиана", width:150 }],
      peak_to_peak:[{ id:"peak_to_peak", kind:"peak_to_peak", itemKey:"value", label:"Размах", width:150 }],
      rms:[{ id:"rms", kind:"rms", itemKey:"value", label:"СКЗ", width:120 }]
    };
    var selectedKinds = Array.isArray(display.measurement_kinds) ? display.measurement_kinds : [];
    ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"].forEach(function (kind) {
      if (selectedKinds.indexOf(kind) >= 0) columns = columns.concat(measurementColumns[kind]);
    });
    var tableWidth = columns.reduce(function (total, column) { return total + column.width; }, 0);
    var colgroup = "<colgroup>" + columns.map(function (column) { return "<col style='width:" + column.width + "px'>"; }).join("") + "</colgroup>";
    var headers = columns.map(function (column) { return "<th>" + column.label + "</th>"; }).join("");
    var rows = visibleRows.map(function (measurements) {
      var signalName = measurements.signal_name || "";
      var items = {};
      (measurements.items || []).forEach(function (item) { items[item.id] = item; });
      var signal = (model.state.signals || []).filter(function (candidate) { return candidate.name === signalName; })[0] || {};
      var limits = measurements.time_limits || display.time_limits || {};
      var cells = columns.map(function (column) {
        var value = "—";
        if (column.id === "name") value = "<span class='signal-cell-value'>" + esc(signalName) + "</span>";
        else if (column.id === "line") value = "<span class='measurement-line-swatch' style='--swatch:" + esc(signal.color || "#1686c3") + "' aria-label='Цвет " + esc(signalName) + "'></span>";
        else if (column.id === "roi_min") value = esc(measurementValue({ value:limits.min_s }, "value"));
        else if (column.id === "roi_max") value = esc(measurementValue({ value:limits.max_s }, "value"));
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

  function renderPeaksInspector(body) {
    var display = activeDisplay(), pane = paneById(model.activePane), record = display && pane && model.peaksRecords[paneRuntimeKey(display.id, pane.id)];
    var current = record && display && pane && record.displayId === display.id && record.paneId === pane.id;
    body.innerHTML = "<div class='peaks-split' data-testid='peaks-split'><section class='peaks-table-zone'><div class='signal-table-scroll peaks-table-scroll' data-testid='peaks-table-scroll'></div></section><aside class='peaks-settings-panel' aria-labelledby='peaks-settings-title'><h3 id='peaks-settings-title'>Настройки расчёта пиков</h3><div class='peaks-settings-fields' data-testid='peaks-settings-fields'></div><footer class='peaks-settings-footer'><button class='button button-primary' type='button' data-testid='peaks-settings-apply' disabled>Применить</button></footer></aside></div>";
    var host = q("[data-testid='peaks-table-scroll']");
    renderPeaksSettings(display, pane, record);
    if (!pane || pane.plot_type !== "time") { host.innerHTML = "<div class='inspector-empty' role='status'>Пики доступны для временной области</div>"; return; }
    if (!current || record.pending) { host.innerHTML = "<div class='inspector-empty' data-testid='peaks-loader' role='status'>Расчёт пиков…</div>"; return; }
    if (record.error) { host.innerHTML = "<div class='inspector-empty' data-testid='peaks-error' role='alert'>" + esc(record.error) + "</div>"; return; }
    var data = record.data || {}, rows = Array.isArray(data.rows) ? data.rows : [];
    if (!data.signals || !data.signals.length) { host.innerHTML = "<div class='inspector-empty' data-testid='peaks-no-signals' role='status'>В активной области нет сигналов</div>"; return; }
    if (!rows.length) { host.innerHTML = "<div class='inspector-empty' data-testid='peaks-empty' role='status'>Пики не найдены</div>"; return; }
    host.innerHTML = "<table class='signal-table peaks-table' data-testid='peaks-table'><thead><tr><th>№</th><th>Сигнал</th><th>Цвет</th><th>Значение</th><th>Время, с</th><th>Метка на графике</th></tr></thead><tbody>" + rows.map(function (row, index) {
      return "<tr><td>" + esc(row.row_number == null ? index + 1 : row.row_number) + "</td><td>" + esc(row.signal_name || "") + "</td><td class='color-cell'><span class='peaks-color-swatch' style='--swatch:" + esc(row.signal_color || "#1686c3") + "' aria-label='Цвет " + esc(row.signal_name || "") + "'></span></td><td>" + esc(measurementValue(row, "value")) + "</td><td>" + esc(measurementValue(row, "time_s")) + "</td><td>" + esc(row.graph_number == null ? "" : row.graph_number) + "</td></tr>";
    }).join("") + "</tbody></table>";
  }

  function peaksSettingsKey(display, pane) { return display && pane ? paneRuntimeKey(display.id, pane.id) : ""; }
  function defaultPeaksSettings(settings) { return Object.assign({ number_of_peaks:99, minimum_height:null, minimum_distance_samples:1, threshold:0 }, settings || {}); }
  function createPeaksDraft(display, pane, settings) {
    var source = defaultPeaksSettings(settings);
    return { key:peaksSettingsKey(display, pane), source:source, values:{ number_of_peaks:String(source.number_of_peaks), minimum_height:source.minimum_height == null ? "−∞" : String(source.minimum_height), minimum_distance_samples:String(source.minimum_distance_samples), threshold:String(source.threshold) }, invalid:{} };
  }
  function parsePeaksSettings(draft) {
    var raw = draft.values, settings = {}, invalid = {};
    var count = Number(raw.number_of_peaks), distance = Number(raw.minimum_distance_samples), threshold = Number(raw.threshold), height = raw.minimum_height.trim();
    if (!isFinite(count) || Math.floor(count) !== count || count < 1 || count > 1000) invalid.number_of_peaks = "Введите целое число от 1 до 1000."; else settings.number_of_peaks = count;
    if (height === "" || height === "−∞" || height === "-∞") settings.minimum_height = null;
    else if (!isFinite(Number(height))) invalid.minimum_height = "Введите число или −∞."; else settings.minimum_height = Number(height);
    if (!isFinite(distance) || Math.floor(distance) !== distance || distance < 1) invalid.minimum_distance_samples = "Введите целое число не меньше 1."; else settings.minimum_distance_samples = distance;
    if (!isFinite(threshold)) invalid.threshold = "Введите число.";
    else if (threshold < 0) invalid.threshold = "Введите число не меньше 0.";
    else settings.threshold = threshold;
    draft.invalid = invalid;
    return Object.keys(invalid).length ? null : settings;
  }
  function peaksSettingsDirty(draft, settings) { return !!draft && JSON.stringify(settings) !== JSON.stringify(draft.source); }
  function renderPeaksSettings(display, pane, record) {
    var host = q("[data-testid='peaks-settings-fields']"), button = q("[data-testid='peaks-settings-apply']");
    if (!host || !button) return;
    var settings = record && record.data && record.data.settings;
    if (!display || !pane || pane.plot_type !== "time" || !settings) { host.innerHTML = "<div class='inspector-empty' role='status'>Настройки доступны для временной области</div>"; button.disabled = true; return; }
    var key = peaksSettingsKey(display, pane);
    if (!model.peaksDraft || model.peaksDraft.key !== key) model.peaksDraft = createPeaksDraft(display, pane, settings);
    var draft = model.peaksDraft, parsed = parsePeaksSettings(draft), labels = [
      ["number_of_peaks", "Количество пиков"], ["minimum_height", "Минимальная высота"], ["minimum_distance_samples", "Минимальное расстояние, отсчёты"], ["threshold", "Порог"]
    ];
    host.innerHTML = labels.map(function (field) { var id=field[0], error=draft.invalid[id]; return "<label class='settings-field-row" + (error ? " has-error" : "") + "'><span class='settings-label'><span>" + field[1] + "</span></span><span class='settings-control-wrap'><input class='control' type='text' inputmode='decimal' data-peaks-setting='" + id + "' value='" + esc(draft.values[id]) + "' aria-label='" + field[1] + "'></span>" + (error ? "<small class='field-message is-error' role='alert'>" + esc(error) + "</small>" : "") + "</label>"; }).join("");
    button.disabled = !parsed || !peaksSettingsDirty(draft, parsed) || button.dataset.pending === "true";
  }

  function applyPeaksSettings() {
    var display = activeDisplay(), pane = paneById(model.activePane), draft = model.peaksDraft, button = q("[data-testid='peaks-settings-apply']");
    if (!display || !pane || !draft || draft.key !== peaksSettingsKey(display, pane) || !button) return;
    var settingsPayload = parsePeaksSettings(draft);
    if (!settingsPayload || !peaksSettingsDirty(draft, settingsPayload) || button.dataset.pending === "true") return;
    var displayId = display.id, paneId = pane.id;
    clearPeaksMarkers();
    button.dataset.pending = "true";
    renderPeaksSettings(display, pane, model.peaksRecords[paneRuntimeKey(displayId, paneId)]);
    mutate(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return Promise.reject(new Error("Контекст области изменился; повторите действие."));
      return api.updatePeaksSettings({ state_revision:model.revision, display_id:displayId, pane_id:paneId, settings:settingsPayload });
    }, { preservePlots:true, skipOutput:true }).then(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return;
      model.peaksDraft = null;
      return fetchActivePeaks(displayId, paneId, true);
    }).catch(function (error) {
      button.dataset.pending = "false";
      showToast(safeErrorText(error, "Не удалось применить настройки пиков."), true);
      renderPeaksSettings(display, pane, model.peaksRecords[paneRuntimeKey(displayId, paneId)]);
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
  function updatePeaksMarkers(displayId, paneId, record) {
    var pane = paneById(paneId), display = activeDisplay();
    if (!window.Plotly || !display || display.id !== displayId || !pane || pane.plot_type !== "time" || !record || !record.data || !Array.isArray(record.data.rows)) return;
    var host = q("[data-pane-host='" + CSS.escape(paneRuntimeKey(displayId, paneId)) + "']");
    if (!host || !host.data) return;
    var grouped = {};
    record.data.rows.forEach(function (row) { var key=row.signal_name || ""; if (!key) return; (grouped[key] || (grouped[key]=[])).push(row); });
    var traces = Object.keys(grouped).map(function (name) { var rows=grouped[name], color=rows[0].signal_color || "#1686c3"; return { type:"scatter", mode:"markers+text", x:rows.map(function(row){return row.time_s;}), y:rows.map(function(row){return row.value;}), text:rows.map(function(row){return row.graph_number == null ? "" : String(row.graph_number);}), textposition:"top center", marker:{color:color,size:8}, hoverinfo:"skip", showlegend:false, meta:{signal_analyser_peaks_overlay:true} }; });
    var existing = ownedPeakTraceIndexes(host), remove = existing.length ? window.Plotly.deleteTraces(host, existing) : Promise.resolve();
    Promise.resolve(remove).then(function () { if (traces.length && activeDisplay() && activeDisplay().id === displayId && model.activePane === paneId) return window.Plotly.addTraces(host, traces); }).catch(function () {});
  }

  function stopPeaksPolling(exceptKey) {
    Object.keys(model.peaksPollByPane).forEach(function (key) {
      if (key !== exceptKey) { window.clearTimeout(model.peaksPollByPane[key]); delete model.peaksPollByPane[key]; }
    });
  }

  function fetchActivePeaks(displayId, paneId, poll) {
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var token = (model.peaksTokens[runtimeKey] || 0) + 1;
    model.peaksTokens[runtimeKey] = token;
    window.clearTimeout(model.peaksPollByPane[runtimeKey]);
    return api.activePeaks(displayId, paneId).then(function (response) {
      var prior = model.peaksRecords[runtimeKey];
      if (token !== model.peaksTokens[runtimeKey] || model.inspectorPage !== "peaks" || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId || (stateRevision(response) !== null && stateRevision(response) < model.revision) || response.display_id !== displayId || response.pane_id !== paneId || (prior && prior.context_key && response.context_key !== prior.context_key && response.calculation_revision <= prior.calculation_revision) || (prior && typeof prior.calculation_revision === "number" && typeof response.calculation_revision === "number" && response.calculation_revision < prior.calculation_revision)) return null;
      model.revision = Math.max(model.revision, stateRevision(response) || model.revision);
      var record = { displayId:displayId, paneId:paneId, context_key:response.context_key, calculation_revision:response.calculation_revision, revision:stateRevision(response), pending:!response.isready, error:response.success === false ? response.error || "Не удалось рассчитать пики." : null, data:response.data || null, peaks:response.peaks || null };
      model.peaksRecords[runtimeKey] = record;
      model.peaksRecord = record;
      renderInspector();
      if (response.isready && response.success !== false) updatePeaksMarkers(displayId, paneId, record);
      if (!response.isready && poll) model.peaksPollByPane[runtimeKey] = window.setTimeout(function () { fetchActivePeaks(displayId, paneId, true); }, 350);
      return record;
    }).catch(function (error) {
      if (token !== model.peaksTokens[runtimeKey] || model.inspectorPage !== "peaks" || !activeDisplay() || activeDisplay().id !== displayId || model.activePane !== paneId) return null;
      var record = { displayId:displayId, paneId:paneId, error:safeErrorText(error, "Не удалось загрузить пики."), pending:false };
      model.peaksRecords[runtimeKey] = record;
      model.peaksRecord = record;
      renderInspector();
      return record;
    });
  }

  function loadPeaks() {
    if (model.inspectorPage !== "peaks") return Promise.resolve();
    var display = activeDisplay(), pane = paneById(model.activePane);
    if (!display || !pane || pane.plot_type !== "time") { stopPeaksPolling(""); model.peaksRecord = null; renderInspector(); return Promise.resolve(); }
    var displayId = display.id, paneId = pane.id, runtimeKey = paneRuntimeKey(displayId, paneId);
    stopPeaksPolling(runtimeKey);
    clearPeaksMarkers();
    model.peaksRecord = { displayId:displayId, paneId:paneId, pending:true };
    renderInspector();
    var request = display.peaks_enabled ? Promise.resolve() : mutate(function () {
      if (!activeDisplay() || activeDisplay().id !== displayId) return Promise.reject(new Error("Контекст экрана изменился; повторите действие."));
      return api.view({ state_revision:model.revision, peaks_enabled:true });
    }, { preservePlots:true, skipOutput:true });
    return request.then(function () { return fetchActivePeaks(displayId, paneId, true); });
  }

  function signalAddLayer() { return q("[data-testid='signal-add-layer']"); }

  function signalAddSelected() {
    var layer = signalAddLayer();
    return layer ? qa("[data-signal-add-variable]:checked") : [];
  }

  function updateSignalAddControls() {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    var selected = signalAddSelected();
    var requiresRate = selected.some(function (input) { return input.dataset.sampleRateRequirement === "required"; });
    var rate = layer.querySelector("[data-signal-add-sample-rate]");
    var submit = layer.querySelector("[data-signal-add-submit]");
    var value = Number(rate && rate.value);
    if (rate) {
      rate.disabled = !requiresRate;
      rate.setAttribute("aria-invalid", String(requiresRate && (!isFinite(value) || value <= 0)));
    }
    if (submit) submit.disabled = model.signalAddLoading || model.signalAddSubmitting || !selected.length || (requiresRate && (!isFinite(value) || value <= 0));
  }

  function workspaceVariableDescription(variable) {
    var parts = [variable.type || "Переменная"];
    if (typeof variable.sample_count === "number") parts.push(variable.sample_count + " отсчётов");
    if (!variable.selectable && variable.reason) parts.push(variable.reason);
    return parts.join(" · ");
  }

  function renderSignalAddCatalog() {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    var list = layer.querySelector("[data-testid='signal-add-variables']");
    var state = layer.querySelector("[data-testid='signal-add-state']");
    var error = layer.querySelector("[data-testid='signal-add-error']");
    var catalog = model.signalAddCatalog;
    error.hidden = true;
    if (model.signalAddLoading) {
      list.innerHTML = "";
      state.hidden = false;
      state.textContent = "Загрузка переменных…";
      return updateSignalAddControls();
    }
    var variables = catalog && Array.isArray(catalog.variables) ? catalog.variables : [];
    list.innerHTML = variables.map(function (variable) {
      var disabled = !variable.selectable;
      return "<label" + (disabled ? " class='is-disabled'" : "") + "><span><strong>" + esc(variable.name) + "</strong><small>" + esc(workspaceVariableDescription(variable)) + "</small></span><input class='ui-checkbox' type='checkbox' data-signal-add-variable value='" + esc(variable.variable_id) + "' data-sample-rate-requirement='" + esc(variable.sample_rate_requirement || "not_needed") + "' aria-label='Добавить " + esc(variable.name) + "'" + (disabled ? " disabled" : "") + "></label>";
    }).join("");
    state.hidden = false;
    state.textContent = variables.length ? "Доступно переменных: " + variables.filter(function (variable) { return variable.selectable; }).length : "Поддерживаемые переменные не найдены.";
    updateSignalAddControls();
  }

  function loadSignalAddCatalog() {
    var token = ++model.signalAddToken;
    model.signalAddCatalog = null;
    model.signalAddLoading = true;
    renderSignalAddCatalog();
    return api.workspaceVariables().then(function (catalog) {
      if (token !== model.signalAddToken || !signalAddLayer() || signalAddLayer().hidden) return;
      model.signalAddLoading = false;
      model.signalAddCatalog = catalog;
      renderSignalAddCatalog();
    }).catch(function (caught) {
      if (token !== model.signalAddToken || !signalAddLayer() || signalAddLayer().hidden) return;
      model.signalAddLoading = false;
      var layer = signalAddLayer(), list = layer.querySelector("[data-testid='signal-add-variables']"), state = layer.querySelector("[data-testid='signal-add-state']"), error = layer.querySelector("[data-testid='signal-add-error']");
      list.innerHTML = "";
      state.hidden = true;
      error.hidden = false;
      error.innerHTML = esc(safeErrorText(caught, "Не удалось получить переменные рабочей области.")) + " <button class='button button-compact' type='button' data-signal-add-retry>Повторить</button>";
      updateSignalAddControls();
    });
  }

  function openSignalAddDialog(trigger) {
    var layer = signalAddLayer();
    if (!layer || !layer.hidden) return;
    closeColumnMenu(false);
    model.signalAddTrigger = trigger;
    model.signalAddSubmitting = false;
    layer.hidden = false;
    q("[data-testid='app-shell']").inert = true;
    trigger.setAttribute("aria-expanded", "true");
    var rate = layer.querySelector("[data-signal-add-sample-rate]");
    if (rate) rate.value = "1000000";
    layer.querySelector("[data-signal-add-submit]").textContent = "Добавить";
    loadSignalAddCatalog();
    layer.querySelector("#signal-add-title").focus();
  }

  function closeSignalAddDialog(restoreFocus) {
    var layer = signalAddLayer();
    if (!layer || layer.hidden) return;
    ++model.signalAddToken;
    layer.hidden = true;
    q("[data-testid='app-shell']").inert = false;
    var trigger = q("[data-testid='signals-add-action']") || model.signalAddTrigger;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
    model.signalAddCatalog = null;
    model.signalAddTrigger = null;
    model.signalAddLoading = false;
    model.signalAddSubmitting = false;
  }

  function submitSignalAddDialog() {
    var layer = signalAddLayer(), catalog = model.signalAddCatalog;
    if (!layer || layer.hidden || !catalog || model.signalAddSubmitting) return;
    var selected = signalAddSelected(), rate = Number(layer.querySelector("[data-signal-add-sample-rate]").value);
    if (!selected.length) return;
    var selections = selected.map(function (input) { return { variable_id:input.value, sample_rate_hz:input.dataset.sampleRateRequirement === "required" ? rate : null }; });
    model.signalAddSubmitting = true;
    var submit = layer.querySelector("[data-signal-add-submit]");
    var error = layer.querySelector("[data-testid='signal-add-error']");
    submit.textContent = "Добавление…";
    error.hidden = true;
    updateSignalAddControls();
    mutate(function () { return api.signals({ state_revision:model.revision, operation:"import_workspace_batch", catalog_revision:catalog.catalog_revision, selections:selections }); }).then(function () {
      closeSignalAddDialog(true);
      showToast("Добавлено сигналов: " + selections.length, false);
    }).catch(function (caught) {
      model.signalAddSubmitting = false;
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
    menu.innerHTML = "<div class='inspector-menu-title'>Видимость измерений</div>" + measurementOptions.map(function (measurement) {
      var visible = selected.indexOf(measurement.id) >= 0;
      return "<button type='button' role='menuitemcheckbox' aria-pressed='" + visible + "' aria-checked='" + visible + "' data-measurement-visible='" + measurement.id + "'><span>" + measurement.label + "</span><img src='" + (visible ? "./icons/eye.svg" : "./icons/eye-off.svg") + "' alt=''></button>";
    }).join("");
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

  function output(poll) { var display = activeDisplay(); if (display) panes().forEach(function (pane) { fetchPaneOutput(display.id, pane.id, poll); }); }
  function fetchPaneOutput(displayId, paneId, poll) {
    var display = activeDisplay();
    var pane = paneById(paneId);
    if (!display || display.id !== displayId || !pane) return;
    var runtimeKey = paneRuntimeKey(displayId, paneId);
    var token = (model.outputTokens[runtimeKey] || 0) + 1;
    model.outputTokens[runtimeKey] = token;
    window.clearTimeout(model.pollByPane[runtimeKey]);
    api.activeOutput(display.id, pane.id).then(function (response) {
      var prior = model.outputs[runtimeKey];
      if (!activeDisplay() || activeDisplay().id !== displayId || token !== model.outputTokens[runtimeKey] || (stateRevision(response) !== null && stateRevision(response) < model.revision) || response.display_id !== display.id || response.pane_id !== pane.id || response.plot_type !== pane.plot_type || (prior && prior.context_key && response.context_key !== prior.context_key && response.calculation_revision < prior.calculation_revision)) return;
      model.revision = Math.max(model.revision, stateRevision(response) || model.revision);
      if (!response.isready && prior && prior.output && prior.output.isready && prior.output.success) {
        if (poll) model.pollByPane[runtimeKey] = window.setTimeout(function () { fetchPaneOutput(displayId, paneId, true); }, 350);
        return;
      }
      model.outputs[runtimeKey] = { context_key: response.context_key, calculation_revision: response.calculation_revision, output: { isready: response.isready, success: response.success, error: response.error, data: response.data } };
      scheduleRender();
      if (!response.isready && poll) model.pollByPane[runtimeKey] = window.setTimeout(function () { fetchPaneOutput(displayId, paneId, true); }, 350);
      if (response.isready && response.success) completePendingApply();
    }).catch(function (error) {
      if (activeDisplay() && activeDisplay().id === displayId && token === model.outputTokens[runtimeKey]) {
        model.outputs[runtimeKey] = { output: { isready: true, success: false, error: error.message || "Не удалось загрузить график." } };
        scheduleRender();
      }
    });
  }

  function refreshSnapshot(renderAccepted) { return api.getState().then(function (snapshot) { if (!accept(snapshot)) throw new Error("Получен устаревший снимок состояния."); (renderAccepted || scheduleRender)(); return snapshot; }); }
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
    return attempt().then(function (snapshot) { settings.load().catch(function () {}); if (!options || !options.skipOutput) output(true); if (model.inspectorPage === "measurements") loadMeasurements(); return snapshot; });
  }
  function postLayout(payload, options) {
    var targetDisplayId = activeDisplay() && activeDisplay().id;
    var request = Object.assign({ display_id:targetDisplayId, version:1 }, payload);
    return mutate(function () {
      if (!targetDisplayId || !activeDisplay() || activeDisplay().id !== targetDisplayId) {
        var error = new Error("Контекст экрана изменился; повторите действие.");
        error.code = "display_context_changed";
        return Promise.reject(error);
      }
      return api.layouts(Object.assign({}, request, { state_revision:model.revision }));
    }, options);
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
    var state = settings.state();
    if (!footer || state.invalid || !state.dirty) return;
    footer.dataset.phase = "applying";
    footer.dataset.message = "Применяем сохранённый черновик";
    renderApply();
    settings.flush().then(function () { return api.applySettings({ state_revision: settings.state().revision, display_id: activeDisplay().id }); }).then(function (result) {
      if (result.success === false) throw new Error(result.error || "Сервер отклонил настройки.");
      model.revision = Math.max(model.revision, result.state_revision || model.revision);
      footer.dataset.phase = "pending";
      footer.dataset.message = "Обновляется активная область";
      renderApply();
      output(true);
    }).catch(function (error) {
      footer.dataset.phase = error.status === 409 ? "stale" : "error";
      footer.dataset.message = error.message || "Не удалось применить настройки.";
      renderApply();
      showToast(footer.dataset.message, true);
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
    model.layoutDraft = { rows: model.layout.rows, columns: model.layout.columns, trigger: trigger };
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

  function completePendingApply() {
    var footer = q("[data-testid='settings-footer']");
    if (!footer || footer.dataset.phase !== "pending") return;
    footer.dataset.phase = "pristine";
    footer.dataset.message = "";
    settings.markApplied();
    renderApply();
    showToast("График обновлён", false);
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.testid === "display-scroll-left") return void scrollDisplayTabs(-1);
    if (button.dataset.testid === "display-scroll-right") return void scrollDisplayTabs(1);
    if (button.dataset.displaySelect) return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "select", display_id: button.dataset.displaySelect }); });
    if (button.dataset.displayClose) return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "close", display_id: button.dataset.displayClose }); });
    if (button.dataset.testid === "add-display") return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "create" }); });
    if (button.dataset.testid === "layout-trigger") return void openLayout(button);
    if (button.dataset.layoutClose !== undefined || button.dataset.layoutCancel !== undefined) return void closeLayout();
    if (button.dataset.layoutRows || button.dataset.layoutColumns) { model.layoutDraft[button.dataset.layoutRows ? "rows" : "columns"] = Number(button.dataset.layoutRows || button.dataset.layoutColumns); return void renderLayoutDraft(); }
    if (button.dataset.layoutApply !== undefined) { var draft = model.layoutDraft; var displayId = activeDisplay() && activeDisplay().id; closeLayout(); return void postLayout({ operation: "resize", variant: draft.rows + "x" + draft.columns, rows: draft.rows, columns: draft.columns }).then(function () { if (activeDisplay() && activeDisplay().id === displayId) showToast("Макет " + draft.rows + " × " + draft.columns + " применён", false); }).catch(function (error) { showToast(error.message || "Не удалось применить макет.", true); }); }
    if (button.dataset.testid === "settings-apply") return void applySettings();
    if (button.dataset.testid === "signals-add-action") return void openSignalAddDialog(button);
    if (button.dataset.signalAddClose !== undefined || button.dataset.signalAddCancel !== undefined) return void closeSignalAddDialog(true);
    if (button.dataset.signalAddRetry !== undefined) return void loadSignalAddCatalog();
    if (button.dataset.signalAddSubmit !== undefined) return void submitSignalAddDialog();
    if (button.dataset.signalDelete) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "delete", signal_name: button.dataset.signalDelete }); });
    if (button.dataset.signalDuplicate) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "duplicate", signal_name: button.dataset.signalDuplicate }); });
    if (button.dataset.settingsPage) { model.settingsPage = button.dataset.settingsPage; return void renderSettings(activeDisplay()); }
    if (button.dataset.paneMenu) { var menu = q("[data-testid='display-overflow-menu']"); menu.hidden = !menu.hidden; menu.dataset.paneId = button.dataset.paneMenu; button.setAttribute("aria-expanded", String(!menu.hidden)); return; }
    if (button.dataset.testid === "signal-columns-menu-trigger") { var columns = q("[data-testid='signal-columns-menu']"); if (!columns.hidden) return void closeColumnMenu(true); renderColumnMenu(); columns.hidden = false; button.setAttribute("aria-expanded", "true"); positionMenu(columns, button, 244); var firstColumn = columns.querySelector("button"); if (firstColumn) firstColumn.focus(); return; }
    if (button.dataset.columnVisible !== undefined) { var key = button.dataset.columnVisible; model.visibleColumns[key] = !model.visibleColumns[key]; renderInspector(); renderColumnMenu(); var menuTrigger = q("[data-testid='signal-columns-menu-trigger']"); if (menuTrigger) menuTrigger.setAttribute("aria-expanded", "true"); positionMenu(q("[data-testid='signal-columns-menu']"), menuTrigger, 244); return; }
    if (button.dataset.testid === "measurement-columns-menu-trigger") { var measurementsMenu = q("[data-testid='measurement-columns-menu']"); if (!measurementsMenu.hidden) return void closeMeasurementMenu(true); renderMeasurementMenu(); measurementsMenu.hidden = false; button.setAttribute("aria-expanded", "true"); positionMenu(measurementsMenu, button, 244); var firstMeasurement = measurementsMenu.querySelector("button"); if (firstMeasurement) firstMeasurement.focus(); return; }
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
    if (button.dataset.bottomTab) { closeColumnMenu(false); closeMeasurementMenu(false); if (button.dataset.bottomTab !== "peaks") { stopPeaksPolling(""); clearPeaksMarkers(); } model.inspectorPage = button.dataset.bottomTab; renderInspector(); if (model.inspectorPage === "measurements") loadMeasurements(); if (model.inspectorPage === "peaks") loadPeaks(); return; }
    if (button.dataset.testid === "peaks-settings-apply") return void applyPeaksSettings();
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
  document.addEventListener("click", function (event) { var menu=q("[data-testid='signal-columns-menu']"),trigger=q("[data-testid='signal-columns-menu-trigger']");if(!menu||menu.hidden||!trigger)return;var path=typeof event.composedPath==="function"?event.composedPath():null;var inside=path?path.indexOf(menu)>=0||path.indexOf(trigger)>=0:menu.contains(event.target)||trigger.contains(event.target);if(!inside)closeColumnMenu(false); });
  document.addEventListener("click", function (event) { var menu=q("[data-testid='measurement-columns-menu']"),trigger=q("[data-testid='measurement-columns-menu-trigger']");if(!menu||menu.hidden||!trigger)return;var path=typeof event.composedPath==="function"?event.composedPath():null;var inside=path?path.indexOf(menu)>=0||path.indexOf(trigger)>=0:menu.contains(event.target)||trigger.contains(event.target);if(!inside)closeMeasurementMenu(false); });
  document.addEventListener("keydown", function (event) { var addLayer=signalAddLayer(); if (event.key === "Escape" && addLayer && !addLayer.hidden) { event.preventDefault(); closeSignalAddDialog(true); return; } if (event.key === "Escape" && model.layoutDraft) closeLayout(); else if (event.key === "Escape" && q("[data-testid='measurement-columns-menu']") && !q("[data-testid='measurement-columns-menu']").hidden) closeMeasurementMenu(true); else if (event.key === "Escape") closeColumnMenu(true); var tab = event.target.closest && event.target.closest("[data-bottom-tab]"); if (tab && ["ArrowLeft","ArrowRight","Home","End"].indexOf(event.key) >= 0) { var tabs=qa("[data-bottom-tab]"), index=tabs.indexOf(tab); if(event.key === "Home") index=0; else if(event.key === "End") index=tabs.length-1; else index=(index+(event.key === "ArrowRight" ? 1 : -1)+tabs.length)%tabs.length; event.preventDefault(); tabs[index].click(); tabs[index].focus(); } });
  document.addEventListener("keydown", function (event) { var tab=event.target.closest && event.target.closest("[data-settings-page]"); if(tab && ["ArrowLeft","ArrowRight","Home","End"].indexOf(event.key)>=0){var tabs=qa("[data-settings-page]"),index=tabs.indexOf(tab);if(event.key==="Home")index=0;else if(event.key==="End")index=tabs.length-1;else index=(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;event.preventDefault();tabs[index].click();tabs[index].focus();} });
  document.addEventListener("change", function (event) {
    var node = event.target;
    if (node.dataset.paneType) { var pane = paneById(node.dataset.paneType); return void postLayout({ operation: "update_pane", pane_id: pane.id, plot_type: node.value, signal_bindings: pane.signal_bindings || [] }); }
    if (node.dataset.visibleAllSignals !== undefined) { var allPane = paneById(model.activePane); if (allPane) return void postLayout({ operation:"update_pane", pane_id:allPane.id, plot_type:allPane.plot_type, signal_bindings:node.checked ? (model.state.signals || []).map(function (signal) { return signal.name; }) : [] }); }
    if (node.dataset.visibleSignal) { var activePane = paneById(model.activePane), bindings = activePane && Array.isArray(activePane.signal_bindings) ? activePane.signal_bindings.slice() : [], index = bindings.indexOf(node.dataset.visibleSignal); if (node.checked && index < 0) bindings.push(node.dataset.visibleSignal); if (!node.checked && index >= 0) bindings.splice(index, 1); if (activePane) return void postLayout({ operation:"update_pane", pane_id:activePane.id, plot_type:activePane.plot_type, signal_bindings:bindings }); }
  });
  document.addEventListener("click", function (event) { var pane = event.target.closest("[data-pane-id]"); if (pane && pane.dataset.paneId !== model.activePane) postLayout({ operation: "select_pane", pane_id: pane.dataset.paneId }, { preservePlots:true, skipOutput:true }); });
  document.addEventListener("input", function (event) { if (event.target.dataset.testid === "signal-search-input") { model.inspectorSearch=event.target.value; renderInspector(); } if (event.target.dataset.testid === "measurement-search-input") { model.measurementSearch=event.target.value; renderInspector(); } if (event.target.dataset.peaksSetting && model.peaksDraft) { model.peaksDraft.values[event.target.dataset.peaksSetting]=event.target.value; renderPeaksSettings(activeDisplay(), paneById(model.activePane), model.peaksRecords[peaksSettingsKey(activeDisplay(), paneById(model.activePane))]); } });
  document.addEventListener("change", function (event) { if (event.target.dataset.signalAddVariable !== undefined) updateSignalAddControls(); });
  document.addEventListener("input", function (event) { if (event.target.dataset.signalAddSampleRate !== undefined) updateSignalAddControls(); });
  window.addEventListener("signal-apply-state", renderApply);
  window.addEventListener("signal-settings-saved", function (event) { var revision = event.detail && event.detail.state && event.detail.state.state_revision; if (typeof revision === "number") model.revision = Math.max(model.revision, revision); });
  window.addEventListener("signal-settings-plot-type", function (event) {
    var pane = paneById(model.activePane), plotType = event.detail && event.detail.plotType;
    if (pane && titles[plotType] && pane.plot_type !== plotType) postLayout({ operation:"update_pane", pane_id:pane.id, plot_type:plotType, signal_bindings:pane.signal_bindings || [] });
  });
  q("[data-testid='display-tabs']").addEventListener("scroll", function () { scheduleDisplayTabScrollUpdate(false); }, { passive: true });
  window.addEventListener("resize", function () { scheduleDisplayTabScrollUpdate(false); });
  window.addEventListener("resize", repositionLayout);
  window.addEventListener("resize", function () { positionMenu(q("[data-testid='signal-columns-menu']"), q("[data-testid='signal-columns-menu-trigger']"), 244); positionMenu(q("[data-testid='measurement-columns-menu']"), q("[data-testid='measurement-columns-menu-trigger']"), 244); });
  if (window.ResizeObserver) {
    model.displayTabsObserver = new window.ResizeObserver(function () { scheduleDisplayTabScrollUpdate(false); });
    model.displayTabsObserver.observe(q("[data-testid='display-tabs-wrap']"));
  }

  function safeErrorText(error, fallback) {
    if (error && typeof error.message === "string" && error.message) return error.message;
    if (error && error.payload && typeof error.payload.message === "string") return error.payload.message;
    if (error && error.payload && error.payload.error && typeof error.payload.error.message === "string") return error.payload.error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
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

  refreshSnapshot().then(function () {
    render();
    output(true);
    return settings.load().then(function () { render(); }).catch(showSettingsLoadError);
  }).catch(showBootstrapError);
})(window, document);
