(function signalAnalyserApp(window, document) {
  "use strict";

  var api = window.SignalAnalyserApi;
  var settings = window.SignalAnalyserSettings;
  var titles = { time: "Временная область", spectrum: "Спектр", spectrogram: "Спектрограмма", persistence: "Спектр персистентности" };
  var model = {
    state: null, revision: -1, layout: null, activePane: null,
    settingsPage: "display", inspectorPage: "signals", inspectorSearch:"", visibleColumns: { color:true, sample_rate:true, sample_count:true, duration:true, data_type:true }, outputs: {}, outputTokens: {}, pollByPane: {},
    plotQueue: {}, plotInFlight: {}, plotResizeFrames: {}, toastTimer: null,
    layoutDraft: null, renderFrame: null, plotlyPromise: null
  };

  function q(selector) { return document.querySelector(selector); }
  function qa(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]; }); }
  function stateRevision(value) { return value && typeof value.state_revision === "number" ? value.state_revision : null; }
  function activeDisplay() { return model.state && (model.state.displays || []).filter(function (display) { return display.id === model.state.active_display_id; })[0]; }
  function panes() { return model.layout && Array.isArray(model.layout.panes) ? model.layout.panes : []; }
  function paneById(id) { return panes().filter(function (pane) { return pane.id === id; })[0]; }

  function accept(snapshot) {
    var r = stateRevision(snapshot);
    if (!snapshot || r === null || r<model.revision || !Array.isArray(snapshot.displays) || !snapshot.displays.length) return false;
    model.state = snapshot;
    model.revision = r;
    settings.setRevision(r);
    updateLayout(snapshot);
    var display = activeDisplay();
    if (display) settings.setContext(display.id, r);
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
  }

  function renderTabs() {
    var tablist = q("[data-testid='display-tabs']");
    if (!tablist) return;
    tablist.innerHTML = (model.state.displays || []).map(function (display, index) {
      var selected = display.id === model.state.active_display_id;
      return "<div class='display-tab-shell" + (selected ? " is-selected" : "") + "' data-screen-id='" + esc(display.id) + "'>" +
        "<button class='display-tab' type='button' role='tab' data-display-select='" + esc(display.id) + "' data-testid='display-tab-" + esc(display.id) + "' aria-selected='" + selected + "'><span>Экран " + (index + 1) + "</span></button>" +
        "<button class='display-tab-close' type='button' data-display-close='" + esc(display.id) + "' data-testid='display-close-" + esc(display.id) + "' aria-label='Удалить экран " + (index + 1) + "' data-tooltip='Удалить экран " + (index + 1) + "'" + (model.state.displays.length === 1 ? " disabled" : "") + "><img src='./icons/close.svg' alt=''></button>" +
        "</div>";
    }).join("");
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

  function outputMarkup(pane, output) {
    if (!pane.signal_bindings || !pane.signal_bindings.length) return "<div class='plot-empty' data-testid='pane-empty-" + esc(pane.id) + "'><span class='visually-hidden' role='status'>В области нет видимых сигналов</span></div>";
    if (!output || !output.isready) return "<div class='plot-initial-loading' data-testid='pane-loader-" + esc(pane.id) + "' role='status' aria-label='Загрузка графика'><span class='spinner'></span><span>Загрузка графика</span></div>";
    if (!output.success) return "<div class='plot-error' data-testid='pane-error-" + esc(pane.id) + "' role='alert'>" + esc(output.error || "Не удалось загрузить график.") + "</div>";
    return "<div class='plot-chart' data-pane-host='" + esc(pane.id) + "' data-testid='plot-host-" + esc(pane.id) + "' data-plot-ready='false'></div>";
  }

  function renderGrid() {
    var grid = q("[data-testid='plot-grid']");
    if (!grid) return;
    grid.style.gridTemplateColumns = "repeat(" + model.layout.columns + ", minmax(0, 1fr))";
    grid.style.gridTemplateRows = "repeat(" + model.layout.rows + ", minmax(0, 1fr))";
    grid.innerHTML = panes().map(function (pane, index) {
      var output = model.outputs[pane.id] && model.outputs[pane.id].output;
      var selected = pane.id === model.activePane;
      return "<section class='plot-pane" + (selected ? " is-active" : "") + "' tabindex='0' data-pane-id='" + esc(pane.id) + "' data-testid='plot-pane-" + esc(pane.id) + "' aria-label='Область " + (index + 1) + (selected ? ", активная" : "") + "'>" +
        "<header class='plot-pane-header'><span class='plot-pane-title'>Область " + (index + 1) + "</span><div class='plot-control-cluster'><select class='pane-select' data-pane-type='" + esc(pane.id) + "' data-testid='pane-type-" + esc(pane.id) + "' aria-label='Тип графика области " + (index + 1) + "'>" +
        Object.keys(titles).map(function (kind) { return "<option value='" + kind + "'" + (pane.plot_type === kind ? " selected" : "") + ">" + titles[kind] + "</option>"; }).join("") +
        "</select><button class='plot-more' type='button' data-pane-menu='" + esc(pane.id) + "' data-testid='pane-menu-" + esc(pane.id) + "' aria-label='Действия области " + (index + 1) + "' aria-haspopup='menu' aria-expanded='false'><img src='./icons/more-vertical.svg' alt=''></button></div></header>" +
        "<div class='plot-canvas' aria-label='График области " + (index + 1) + "'>" + outputMarkup(pane, output) + "</div></section>";
    }).join("");
    panes().forEach(function (pane) {
      var record = model.outputs[pane.id];
      if (record && record.output && record.output.isready && record.output.success && hasPlotData(record.output.data)) enqueuePlot(pane, record);
    });
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

  function enqueuePlot(pane, record) {
    model.plotQueue[pane.id] = record;
    if (model.plotInFlight[pane.id]) return;
    model.plotInFlight[pane.id] = true;
    window.requestAnimationFrame(function () {
      var queued = model.plotQueue[pane.id];
      model.plotQueue[pane.id] = null;
      loadPlotly().then(function (Plotly) {
        var host = q("[data-pane-host='" + CSS.escape(pane.id) + "']");
        if (!host || !queued || !hasPlotData(queued.output.data)) return;
        var payload = plotEnvelope(queued.output.data);
        var traces = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : [{ type: "heatmap", x: payload.x, y: payload.y, z: payload.z, colorscale: payload.colorscale }]);
        return Plotly.react(host, traces, Object.assign({ paper_bgcolor: "#ffffff", plot_bgcolor: "#ffffff", showlegend: true, margin: { l: 44, r: 12, t: 12, b: 34 } }, payload.layout || {}), Object.assign({ displayModeBar: false, displaylogo: false, responsive: true }, payload.config || {})).then(function () { host.dataset.plotReady = "true"; });
      }).catch(function () { /* The visible provider error is rendered on the next authoritative response. */ }).finally(function () {
        model.plotInFlight[pane.id] = false;
        if (model.plotQueue[pane.id]) enqueuePlot(pane, model.plotQueue[pane.id]);
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
    if (model.inspectorPage !== "signals") { body.innerHTML = "<div class='inspector-empty' data-testid='inspector-pane-" + model.inspectorPage + "' role='status'>" + (model.inspectorPage === "measurements" ? "Измерения для активной области пока не рассчитаны" : "Пики для активной области пока не рассчитаны") + "</div>"; return; }
    body.innerHTML = "<div class='inspector-search-row'><span class='search-icon' aria-hidden='true'></span><input type='search' data-testid='signal-search-input' aria-label='Поиск сигналов' placeholder='Введите название' value='" + esc(model.inspectorSearch) + "'></div><div class='signal-table-scroll'><table id='signal-table' class='signal-table'><thead><tr data-table-head></tr></thead><tbody data-testid='signal-rows' data-signal-rows></tbody></table><div class='table-empty' role='status' data-testid='signal-search-empty' hidden>Сигналы не найдены</div></div>";
    var rows = q("[data-testid='signal-rows']"), head = q("[data-table-head]");
    if (!rows || !head) return;
    var search = model.inspectorSearch;
    var signals = (model.state.signals || []).filter(function (signal) { return !search || String(signal.name).toLowerCase().indexOf(search.toLowerCase()) >= 0; });
    var columns = [{ id:"color", label:"Цвет" }, { id:"sample_rate", label:"Частота дискретизации" }, { id:"sample_count", label:"Отсчёты" }, { id:"duration", label:"Длительность" }, { id:"data_type", label:"Тип" }].filter(function (column) { return model.visibleColumns[column.id]; });
    head.innerHTML = "<th aria-label='Видимость'></th><th>Имя</th>" + columns.map(function (column) { return "<th>" + column.label + "</th>"; }).join("") + "<th aria-label='Действия'></th>";
    rows.innerHTML = signals.map(function (signal) {
      var values = { color:"<span class='color-swatch' data-testid='signal-color-" + esc(signal.name) + "' style='--swatch:" + esc(signal.color || "#1686c3") + "' aria-label='Цвет " + esc(signal.name) + "'></span>", sample_rate:esc(signal.sample_rate_hz == null ? "—" : signal.sample_rate_hz), sample_count:esc(signal.sample_count == null ? "—" : signal.sample_count), duration:esc(signal.duration_s == null ? "—" : signal.duration_s), data_type:esc(signal.data_type || "—") };
      return "<tr data-testid='signal-row-" + esc(signal.name) + "' class='" + (signal.visible !== false ? "is-selected" : "") + "'><td><input class='ui-checkbox' type='checkbox' data-visible-signal='" + esc(signal.name) + "' aria-label='Показывать " + esc(signal.name) + "'" + (signal.visible !== false ? " checked" : "") + "></td><td><span class='signal-cell-value'>" + esc(signal.name) + "</span></td>" + columns.map(function (column) { return "<td class='" + (column.id === "color" ? "color-cell" : "") + "'><span class='signal-cell-value'>" + values[column.id] + "</span></td>"; }).join("") + "<td class='is-actions-host'><span class='signal-row-actions'><button type='button' class='signal-row-action' data-signal-duplicate='" + esc(signal.name) + "' data-testid='signal-duplicate-" + esc(signal.name) + "' aria-label='Копировать " + esc(signal.name) + "'><img src='./icons/copy.svg' alt=''></button><button type='button' class='signal-row-action is-danger' data-signal-delete='" + esc(signal.name) + "' data-testid='signal-delete-" + esc(signal.name) + "' aria-label='Удалить " + esc(signal.name) + "'><img src='./icons/trash.svg' alt=''></button></span></td></tr>";
    }).join("");
    q("[data-testid='signal-search-empty']").hidden = signals.length > 0;
  }

  function renderColumnMenu() {
    var menu = q("[data-testid='signal-columns-menu']");
    if (!menu) return;
    menu.innerHTML = "<div class='inspector-menu-title'>Видимость столбцов</div>" +
      [{id:"color",label:"Цвет"},{id:"sample_rate",label:"Частота дискретизации"},{id:"sample_count",label:"Отсчёты"},{id:"duration",label:"Длительность"},{id:"data_type",label:"Тип"}].map(function (column) {
        var visible = model.visibleColumns[column.id]; return "<button type='button' role='menuitemcheckbox' aria-pressed='" + visible + "' aria-checked='" + visible + "' data-column-visible='" + column.id + "'><span>" + column.label + "</span><img src='" + (visible ? "./icons/eye.svg" : "./icons/eye-off.svg") + "' alt=''></button>";
      }).join("");
  }

  function output(poll) { panes().forEach(function (pane) { fetchPaneOutput(activeDisplay().id, pane.id, poll); }); }
  function fetchPaneOutput(displayId, paneId, poll) {
    var display = activeDisplay();
    var pane = paneById(paneId);
    if (!display || display.id !== displayId || !pane) return;
    var token = (model.outputTokens[pane.id] || 0) + 1;
    model.outputTokens[pane.id] = token;
    window.clearTimeout(model.pollByPane[pane.id]);
    api.activeOutput(display.id, pane.id).then(function (response) {
      var prior = model.outputs[pane.id];
      if (token !== model.outputTokens[pane.id] || (stateRevision(response) !== null && stateRevision(response) < model.revision) || response.display_id !== display.id || response.pane_id !== pane.id || response.plot_type !== pane.plot_type || (prior && prior.context_key && response.context_key !== prior.context_key && response.calculation_revision < prior.calculation_revision)) return;
      model.revision = Math.max(model.revision, stateRevision(response) || model.revision);
      if (!response.isready && prior && prior.output && prior.output.isready && prior.output.success) {
        if (poll) model.pollByPane[pane.id] = window.setTimeout(function () { fetchPaneOutput(displayId, paneId, true); }, 350);
        return;
      }
      model.outputs[pane.id] = { context_key: response.context_key, calculation_revision: response.calculation_revision, output: { isready: response.isready, success: response.success, error: response.error, data: response.data } };
      scheduleRender();
      if (!response.isready && poll) model.pollByPane[pane.id] = window.setTimeout(function () { fetchPaneOutput(displayId, paneId, true); }, 350);
      if (response.isready && response.success) completePendingApply();
    }).catch(function (error) {
      if (token === model.outputTokens[pane.id]) {
        model.outputs[pane.id] = { output: { isready: true, success: false, error: error.message || "Не удалось загрузить график." } };
        scheduleRender();
      }
    });
  }

  function refreshSnapshot() { return api.getState().then(function (snapshot) { if (!accept(snapshot)) throw new Error("Получен устаревший снимок состояния."); scheduleRender(); return snapshot; }); }
  function mutate(call) {
    return call().then(function (response) {
      var snapshot = response && response.state ? response.state : response;
      if (!accept(snapshot)) return refreshSnapshot();
      scheduleRender();
      return snapshot;
    }).catch(function (error) {
      if (error.status === 409 && error.payload && error.payload.current) { accept(error.payload.current.state || error.payload.current); scheduleRender(); return error.payload.current; }
      throw error;
    }).then(function (snapshot) { settings.load().catch(function () {}); output(true); return snapshot; });
  }
  function postLayout(payload) { return mutate(function () { return api.layouts(Object.assign({ state_revision: model.revision, display_id: activeDisplay().id, version: 1 }, payload)); }); }

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
    preview.style.setProperty("--rows", draft.rows);
    preview.style.setProperty("--columns", draft.columns);
    q("[data-layout-warning]").hidden = draft.rows <= 4 && draft.columns <= 4;
  }
  function openLayout(trigger) {
    if (!model.layout) return;
    model.layoutDraft = { rows: model.layout.rows, columns: model.layout.columns, trigger: trigger };
    renderLayoutDraft();
    q("[data-testid='layout-popover']").hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }
  function closeLayout() {
    var popover = q("[data-testid='layout-popover']");
    popover.hidden = true;
    if (model.layoutDraft && model.layoutDraft.trigger) {
      model.layoutDraft.trigger.setAttribute("aria-expanded", "false");
      model.layoutDraft.trigger.focus();
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
    if (button.dataset.displaySelect) return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "select", display_id: button.dataset.displaySelect }); });
    if (button.dataset.displayClose) return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "close", display_id: button.dataset.displayClose }); });
    if (button.dataset.testid === "add-display") return void mutate(function () { return api.displays({ state_revision: model.revision, operation: "create" }); });
    if (button.dataset.testid === "layout-trigger") return void openLayout(button);
    if (button.dataset.layoutClose !== undefined || button.dataset.layoutCancel !== undefined) return void closeLayout();
    if (button.dataset.layoutRows || button.dataset.layoutColumns) { model.layoutDraft[button.dataset.layoutRows ? "rows" : "columns"] = Number(button.dataset.layoutRows || button.dataset.layoutColumns); return void renderLayoutDraft(); }
    if (button.dataset.layoutApply !== undefined) { var draft = model.layoutDraft; closeLayout(); return void postLayout({ operation: "resize", variant: draft.rows + "x" + draft.columns, rows: draft.rows, columns: draft.columns }); }
    if (button.dataset.testid === "settings-apply") return void applySettings();
    if (button.dataset.signalDelete) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "delete", signal_name: button.dataset.signalDelete }); });
    if (button.dataset.signalDuplicate) return void mutate(function () { return api.signals({ state_revision: model.revision, operation: "duplicate", signal_name: button.dataset.signalDuplicate }); });
    if (button.dataset.settingsPage) { model.settingsPage = button.dataset.settingsPage; return void renderSettings(activeDisplay()); }
    if (button.dataset.paneMenu) { var menu = q("[data-testid='display-overflow-menu']"); menu.hidden = !menu.hidden; menu.dataset.paneId = button.dataset.paneMenu; button.setAttribute("aria-expanded", String(!menu.hidden)); return; }
    if (button.dataset.testid === "signal-columns-menu-trigger") { var columns = q("[data-testid='signal-columns-menu']"); columns.hidden = !columns.hidden; button.setAttribute("aria-expanded", String(!columns.hidden)); return; }
    if (button.dataset.columnVisible !== undefined) { var key = button.dataset.columnVisible; model.visibleColumns[key] = !model.visibleColumns[key]; renderInspector(); renderColumnMenu(); return; }
    if (button.dataset.bottomTab) { model.inspectorPage = button.dataset.bottomTab; return void renderInspector(); }
    if (button.dataset.toastClose !== undefined) q("[data-testid='layout-toast']").hidden = true;
  });
  document.addEventListener("click", function (event) { var popover = q("[data-testid='layout-popover']"); if (model.layoutDraft && !popover.contains(event.target) && !q("[data-testid='layout-trigger']").contains(event.target)) closeLayout(); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape" && model.layoutDraft) closeLayout(); var tab = event.target.closest && event.target.closest("[data-bottom-tab]"); if (tab && ["ArrowLeft","ArrowRight","Home","End"].indexOf(event.key) >= 0) { var tabs=qa("[data-bottom-tab]"), index=tabs.indexOf(tab); if(event.key === "Home") index=0; else if(event.key === "End") index=tabs.length-1; else index=(index+(event.key === "ArrowRight" ? 1 : -1)+tabs.length)%tabs.length; event.preventDefault(); tabs[index].click(); tabs[index].focus(); } });
  document.addEventListener("change", function (event) {
    var node = event.target;
    if (node.dataset.paneType) { var pane = paneById(node.dataset.paneType); return void postLayout({ operation: "update_pane", pane_id: pane.id, plot_type: node.value, signal_bindings: pane.signal_bindings || [] }); }
    if (node.dataset.visibleSignal) { var display = activeDisplay(), visible = (display.visible_signals || []).slice(), index = visible.indexOf(node.dataset.visibleSignal); if (node.checked && index < 0) visible.push(node.dataset.visibleSignal); if (!node.checked && index >= 0) visible.splice(index, 1); return void mutate(function () { return api.view({ state_revision: model.revision, active_plot: display.active_plot, row_selected_signal: node.checked ? node.dataset.visibleSignal : null, analysis_signal: node.checked ? node.dataset.visibleSignal : null, visible_signals: visible, time_limits: display.time_limits, measurement_kinds: display.measurement_kinds, spectrum_settings: display.spectrum_settings, spectrogram_settings: display.spectrogram_settings, persistence_settings: display.persistence_settings, peaks_enabled: display.peaks_enabled || false }); }); }
  });
  document.addEventListener("click", function (event) { var pane = event.target.closest("[data-pane-id]"); if (pane && pane.dataset.paneId !== model.activePane) postLayout({ operation: "select_pane", pane_id: pane.dataset.paneId }); });
  document.addEventListener("input", function (event) { if (event.target.dataset.testid === "signal-search-input") { model.inspectorSearch=event.target.value; renderInspector(); } });
  window.addEventListener("signal-apply-state", renderApply);
  window.addEventListener("signal-settings-saved", function (event) { var revision = event.detail && event.detail.state && event.detail.state.state_revision; if (typeof revision === "number") model.revision = Math.max(model.revision, revision); });

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
