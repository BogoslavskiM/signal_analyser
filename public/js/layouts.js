(function registerSignalAnalyserLayouts(window, document) {
  "use strict";

  var PLOTS = ["time", "spectrum", "spectrogram", "persistence"];
  var TITLES = { time:"Временная область", spectrum:"Спектр", spectrogram:"Спектрограмма", persistence:"Спектр персистентности" };
  var api = window.SignalAnalyserApi;
  var root, grid, runtime, popover, activeHost, plotControl, overflowTrigger, overflowMenu;
  var layoutsByDisplay = {};
  var outputsByDisplay = {};
  var signalColors = {};
  var envelopeRevision = null;
  var activeDisplayId = "";
  var appRevision = null;
  var refreshRequestId = 0;
  var refreshPending = false;
  var refreshQueued = false;
  var pending = null;
  var toastTimer = null;
  var paneRenderGeneration = 0;
  // Payloads are active-pane only.  Keep the last accepted payload per pane so
  // changing the active pane never turns an already live Plotly graph into an
  // image or a synthetic browser-side plot.
  var panePayloadCache = {};
  var paneRenderQueue = {};
  var paneResizeObservers = {};
  var mounted = false;
  var ui = {
    open:false,
    draftRows:1,
    draftColumns:1,
    conflict:false,
    error:"",
    returnFocus:null,
  };

  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function exactKeys(value, keys) { return !!(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(function(key) { return own(value, key); })); }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function(character) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[character]; }); }
  function integer(value) { return typeof value === "number" && isFinite(value) && Math.floor(value) === value; }
  function currentLayout() { return layoutsByDisplay[activeDisplayId] || null; }
  function currentOutputs() { return outputsByDisplay[activeDisplayId] || []; }
  function paneCount(layout) { return layout ? layout.rows * layout.columns : 0; }
  function activePane(layout) { return layout && layout.panes.filter(function(pane) { return pane.id === layout.active_pane_id; })[0] || null; }
  function activePaneIndex(layout) { var pane = activePane(layout); return pane ? layout.panes.indexOf(pane) + 1 : 0; }
  function variant(rows, columns) { return String(rows) + "x" + String(columns); }
  function pretty(rows, columns) { return String(rows) + "×" + String(columns); }
  function node(testId) { return document.querySelector("[data-testid='" + testId + "']"); }
  function setText(testId, value) { var target = node(testId); if (target) target.textContent = value; return target; }
  function setHidden(testId, hidden) { var target = node(testId); if (target) target.hidden = hidden; return target; }
  function removeGeneratedModebar(host) { if (!host || typeof host.querySelectorAll !== "function") return; Array.prototype.slice.call(host.querySelectorAll(".modebar, .modebar-container")).forEach(function(node) { if (node && typeof node.remove === "function") node.remove(); else if (node && node.parentNode) node.parentNode.removeChild(node); }); }
  function setLayoutDisabled(control, disabled) {
    if (!control) return;
    if (disabled) {
      if (!control.disabled) control.dataset.layoutDisabled = "true";
      control.disabled = true;
    } else if (control.dataset.layoutDisabled === "true") {
      control.disabled = false;
      delete control.dataset.layoutDisabled;
    }
  }
  function signalNames() { return Array.prototype.slice.call(document.querySelectorAll("[data-signal-visibility]")).map(function(control) { return control.dataset.signalVisibility; }).filter(Boolean); }
  function message(error, fallback) { var payload = error && error.payload || {}, inner = payload.error || {}, fields = inner.fields || {}; return fields.body || fields.signal_bindings || fields.plot_type || fields.pane_id || fields.rows || fields.columns || inner.message || payload.message || fallback; }
  function sameStrings(left, right) { return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every(function(value, index) { return value === right[index]; }); }

  function validPane(pane, knownBindings) {
    var bindingsSeen = {};
    return !!(pane && typeof pane === "object" && !Array.isArray(pane) &&
      typeof pane.id === "string" && /^pane-\d+$/.test(pane.id) &&
      typeof pane.plot_type === "string" && PLOTS.indexOf(pane.plot_type) >= 0 &&
      Array.isArray(pane.signal_bindings) && pane.signal_bindings.every(function(binding) {
        if (typeof binding !== "string" || !binding || bindingsSeen[binding]) return false;
        bindingsSeen[binding] = true;
        return !knownBindings || !!knownBindings[binding];
      }));
  }

  function validLayout(layout, knownBindings) {
    var paneIds = {};
    if (!layout || typeof layout !== "object" || Array.isArray(layout) || layout.version !== 1 ||
        !integer(layout.rows) || layout.rows < 1 || layout.rows > 10 ||
        !integer(layout.columns) || layout.columns < 1 || layout.columns > 10 ||
        layout.variant !== variant(layout.rows, layout.columns) ||
        !integer(layout.next_pane_number) || layout.next_pane_number < 2 ||
        !Array.isArray(layout.panes) || layout.panes.length !== paneCount(layout)) return false;
    if (!layout.panes.every(function(pane) {
      if (!validPane(pane, knownBindings) || paneIds[pane.id]) return false;
      paneIds[pane.id] = true;
      return true;
    })) return false;
    return typeof layout.active_pane_id === "string" && !!paneIds[layout.active_pane_id];
  }

  function validOutputData(record, pane) {
    var data = record.output.data;
    if (pane.plot_type === "time" || pane.plot_type === "spectrum") {
      if (!record.output.isready || !record.output.success) return Array.isArray(data) && data.length === 0;
      return Array.isArray(data) && data.length === pane.signal_bindings.length && data.every(function(trace, index) {
        return trace && typeof trace === "object" && !Array.isArray(trace) && trace.signal === pane.signal_bindings[index] && Array.isArray(trace.x) && Array.isArray(trace.y);
      });
    }
    return !!(data && typeof data === "object" && !Array.isArray(data) && data.type === "heatmap" &&
      data.signal === record.analysis_signal && Array.isArray(data.x) && Array.isArray(data.y) && Array.isArray(data.z));
  }

  function validPaneOutput(record, pane, knownBindings) {
    var output;
    if (!exactKeys(record, ["pane_id", "plot_type", "signal_bindings", "analysis_signal", "output"]) ||
        record.pane_id !== pane.id || record.plot_type !== pane.plot_type ||
        !sameStrings(record.signal_bindings, pane.signal_bindings) ||
        !(record.analysis_signal === null || typeof record.analysis_signal === "string") ||
        (record.analysis_signal !== null && (!knownBindings[record.analysis_signal] || pane.signal_bindings.indexOf(record.analysis_signal) < 0))) return false;
    output = record.output;
    return exactKeys(output, ["isready", "success", "error", "data"]) &&
      typeof output.isready === "boolean" && typeof output.success === "boolean" && typeof output.error === "string" &&
      (output.success ? output.error === "" : output.error.length > 0) && validOutputData(record, pane);
  }

  function legacyNormalizeEnvelope(envelope) {
    var state = envelope && envelope.state;
    var signalMap = {};
    var displayIds = [];
    var seenDisplays = {};
    var normalized = {};
    var normalizedOutputs = {};
    var colors = {};
    if (!envelope || envelope.ok !== true || !integer(envelope.state_revision) ||
        typeof envelope.active_display_id !== "string" || !envelope.active_display_id ||
        !state || !Array.isArray(state.signals) || !Array.isArray(state.displays) || !Array.isArray(envelope.layouts)) return null;
    state.signals.forEach(function(signal) { if (signal && typeof signal.name === "string" && signal.name) { signalMap[signal.name] = true; colors[signal.name] = typeof signal.color === "string" && signal.color ? signal.color : "#1676e6"; } });
    displayIds = state.displays.map(function(display) { return display && display.id; });
    if (displayIds.some(function(id) { return typeof id !== "string" || !id || seenDisplays[id] ? true : !(seenDisplays[id] = true); })) return null;
    if (state.state_revision !== envelope.state_revision || state.active_display_id !== envelope.active_display_id || !seenDisplays[envelope.active_display_id] || envelope.layouts.length !== displayIds.length) return null;
    if (!envelope.layouts.every(function(entry) {
      if (!exactKeys(entry, ["display_id", "layout", "outputs"]) || typeof entry.display_id !== "string" || !seenDisplays[entry.display_id] || own(normalized, entry.display_id) || !validLayout(entry.layout, signalMap) ||
          !Array.isArray(entry.outputs)) return false;
      // TASK-0070: only the active Display has exactly its active pane output;
      // inactive Displays deliberately carry an empty array.
      if (entry.display_id === envelope.active_display_id) {
        if (entry.outputs.length !== 1 || !validPaneOutput(entry.outputs[0], activePane(entry.layout), signalMap)) return false;
      } else if (entry.outputs.length !== 0) return false;
      normalized[entry.display_id] = entry.layout;
      normalizedOutputs[entry.display_id] = entry.outputs;
      return true;
    })) return null;
    if (displayIds.some(function(id) { return !own(normalized, id); })) return null;
    return { revision:envelope.state_revision, activeDisplayId:envelope.active_display_id, layouts:normalized, outputs:normalizedOutputs, colors:colors, state:state };
  }

  function dispatchState(snapshot) {
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new window.CustomEvent("signal-analyser-settings-state", { detail:snapshot }));
    }
  }

  function latestKnownRevision() {
    var revisions = [envelopeRevision, appRevision].filter(integer);
    return revisions.length ? Math.max.apply(null, revisions) : null;
  }

  function legacyAcceptEnvelope(envelope, notifyApp) {
    var accepted = normalizeEnvelope(envelope), revisionFloor = latestKnownRevision();
    if (!accepted) return false;
    if (revisionFloor !== null && accepted.revision < revisionFloor) return false;
    envelopeRevision = accepted.revision;
    activeDisplayId = accepted.activeDisplayId;
    layoutsByDisplay = accepted.layouts;
    outputsByDisplay = accepted.outputs;
    accepted.outputs[accepted.activeDisplayId].forEach(function(record) {
      if (record.output && record.output.isready && record.output.success && hasOutputData(record)) {
        panePayloadCache[record.pane_id] = record;
      }
    });
    signalColors = accepted.colors;
    render();
    if (notifyApp) dispatchState(accepted.state);
    return true;
  }

  function returnRuntimeNodes() {
    if (!runtime) return;
    [plotControl, overflowTrigger, overflowMenu, activeHost].forEach(function(control) {
      if (control && control.parentNode !== runtime) runtime.appendChild(control);
    });
  }

  function legacyHasOutputData(record) {
    var data = record && record.output && record.output.data;
    if (record.plot_type === "time" || record.plot_type === "spectrum") return Array.isArray(data) && data.length > 0;
    return !!(data && Array.isArray(data.z) && data.z.length > 0);
  }

  function legacyPaneOutputMarkup(pane, index, isActive, record) {
    var prefix = "<div class='pane-output", suffix = "' data-testid='pane-output-" + esc(pane.id) + "'";
    record = record || panePayloadCache[pane.id] || null;
    if (!record) return prefix + " pane-output-empty" + suffix + " data-pane-output-state='empty'><strong>Нет данных области</strong><span>Выберите область, чтобы загрузить её график.</span></div>";
    if (!record.output.isready) return prefix + " pane-output-loading" + suffix + " data-pane-output-state='loading' role='status'><span class='spinner'></span><span>Обновление графика…</span></div>";
    if (!record.output.success) return prefix + " pane-output-error" + suffix + " data-pane-output-state='error' role='alert'><strong>График не обновлён</strong><span>" + esc(record.output.error) + "</span></div>";
    if (!pane.signal_bindings.length || !hasOutputData(record)) return prefix + " pane-output-empty" + suffix + " data-pane-output-state='empty'><strong>Нет видимых сигналов</strong><span>Выберите сигналы для активной области.</span></div>";
    return prefix + suffix + " data-pane-output-state='ready'>" + (isActive ? "" : "<div class='pane-plot-host' data-pane-plot-host='" + esc(pane.id) + "' data-testid='pane-plot-host-" + esc(pane.id) + "' role='img' aria-label='График области " + index + "'></div>") + "</div>";
  }

  function purgePaneHosts() { ++paneRenderGeneration; }

  function panePlotData(record) {
    var data = record.output.data;
    if (record.plot_type === "time" || record.plot_type === "spectrum") {
      return data.map(function(trace) {
        var name = String(trace.signal || "");
        return Object.assign({}, trace, { type:trace.type === "line" || !trace.type ? "scatter" : trace.type, mode:trace.mode || "lines", name:name, line:Object.assign({}, trace.line || {}, { color:(trace.line || {}).color || trace.color || signalColors[name] || "#1676e6" }) });
      });
    }
    var rendered = record.plot_type === "spectrogram" ? data.power_limits && data.power_limits.rendered : data.density_limits && data.density_limits.rendered;
    var trace = { type:"heatmap", x:data.x, y:data.y, z:data.z, colorscale:data.colorscale || "Jet", colorbar:{ title:{ text:data.color_label || "" }, thickness:10, len:.78 } };
    if (rendered && typeof rendered.min === "number" && typeof rendered.max === "number") { trace.zauto = false; trace.zmin = rendered.min; trace.zmax = rendered.max; }
    else trace.zauto = true;
    return [trace];
  }

  function panePlotLayout(record, compact) {
    var data = record.output.data;
    var metadata = Array.isArray(data) ? data[0] || {} : data;
    var heat = record.plot_type === "spectrogram" || record.plot_type === "persistence";
    var frequencyScale = heat && metadata.frequency_scale && metadata.frequency_scale.effective;
    return {
      autosize:true,
      margin:compact ? { l:28, r:heat ? 34 : 8, t:4, b:22 } : { l:44, r:heat ? 54 : 12, t:8, b:36 },
      paper_bgcolor:"#fff",
      plot_bgcolor:"#fff",
      font:{ family:"Roboto, Arial, sans-serif", color:"#202938", size:compact ? 8 : 10 },
      xaxis:{ title:{ text:compact ? "" : metadata.x_label || "" }, gridcolor:"#e7edf3", type:record.plot_type === "spectrum" && metadata.frequency_scale === "log" ? "log" : undefined },
      yaxis:{ title:{ text:compact ? "" : metadata.y_label || "" }, gridcolor:"#e7edf3", type:frequencyScale === "log" ? "log" : undefined },
      dragmode:"zoom",
      showlegend:!heat && !compact,
      legend:{ orientation:"h", x:.99, y:.99, xanchor:"right", yanchor:"top", font:{ size:10 }, bgcolor:"rgba(255,255,255,.78)", borderwidth:0 },
    };
  }

  function renderLocalPaneError(host, copy) {
    if (!host || !host.isConnected) return;
    var output = host.parentNode;
    output.classList.add("pane-output-error");
    output.dataset.paneOutputState = "error";
    output.innerHTML = "<strong>Не удалось отрисовать область</strong><span>" + esc(copy) + "</span>";
  }

  function resizeActivePlot(host) {
    if (!host || typeof window.requestAnimationFrame !== "function") return;
    window.requestAnimationFrame(function() {
      var Plotly = window.Plotly || window.moduleName;
      if (!host.isConnected || !host.getBoundingClientRect().width || !Plotly || !Plotly.Plots || typeof Plotly.Plots.resize !== "function") return;
      try { Promise.resolve(Plotly.Plots.resize(host)).catch(function() {}); } catch (ignored) {}
    });
  }

  function legacyQueuePaneRender(host, record, compact) {
    var key = record.pane_id;
    if (!paneResizeObservers[key] && window.ResizeObserver) {
      paneResizeObservers[key] = new window.ResizeObserver(function() {
        var task = paneRenderQueue[key];
        if (!task || task.resizeQueued) return;
        task.resizeQueued = true;
        window.requestAnimationFrame(function() { task.resizeQueued = false; resizeActivePlot(task.host); });
      });
      paneResizeObservers[key].observe(host);
    }
    paneRenderQueue[key] = { host:host, record:record, compact:compact };
    if (paneRenderQueue[key].scheduled || paneRenderQueue[key].inFlight) return;
    paneRenderQueue[key].scheduled = true;
    window.requestAnimationFrame(function renderLatestPane() {
      var task = paneRenderQueue[key], Plotly = window.Plotly || window.moduleName;
      if (!task) return;
      task.scheduled = false;
      if (task.inFlight) return;
      if (!Plotly || typeof Plotly.react !== "function" || !task.host.isConnected || !task.host.getBoundingClientRect().width || !task.host.getBoundingClientRect().height) return;
      task.inFlight = true;
      Promise.resolve(Plotly.react(task.host, panePlotData(task.record), panePlotLayout(task.record, task.compact), { responsive:true, displaylogo:false, displayModeBar:false, showTips:false })).then(function() {
        removeGeneratedModebar(task.host);
        task.host.dataset.plotReady = "true";
      }, function() { renderLocalPaneError(task.host, "Не удалось обновить интерактивный график."); }).finally(function() {
        task.inFlight = false;
        if (paneRenderQueue[key] !== task) window.requestAnimationFrame(renderLatestPane);
      });
    });
  }

  function legacyRenderPanePlots(layout, outputs) {
    var activeRecord = outputs[0];
    if (activeRecord && activeRecord.output && activeRecord.output.isready && activeRecord.output.success && hasOutputData(activeRecord)) panePayloadCache[activeRecord.pane_id] = activeRecord;
    layout.panes.forEach(function(pane) {
      var record = pane.id === layout.active_pane_id ? activeRecord : panePayloadCache[pane.id];
      var host = pane.id === layout.active_pane_id ? activeHost : grid.querySelector("[data-pane-plot-host='" + pane.id + "']");
      if (record && host) queuePaneRender(host, record, layout.rows * layout.columns > 16);
    });
  }

  function renderGrid() {
    var layout = currentLayout();
    var outputs = currentOutputs();
    var host = activeHost;
    if (!grid) return;
    purgePaneHosts();
    [plotControl, overflowTrigger, overflowMenu, host].forEach(function(control) { if (control && control.parentNode) control.parentNode.removeChild(control); });
    if (!layout) {
      var loadingTrigger = node("layout-trigger");
      grid.dataset.layoutState = refreshPending ? "loading" : "error";
      grid.innerHTML = refreshPending ? "<div class='pane-grid-state' data-testid='layout-loading' role='status'><span class='spinner'></span><span>Загрузка макета…</span></div>" : "<div class='pane-grid-state is-error' data-testid='layout-load-error' role='alert'><span>Не удалось загрузить макет.</span><button type='button' data-testid='layout-retry'>Повторить</button></div>";
      returnRuntimeNodes();
      if (loadingTrigger) loadingTrigger.disabled = true;
      setText("layout-trigger-label", "—");
      [node("plot-type-select"), node("settings-view-select"), node("toggle-all-signals"), node("clear-display-action")].forEach(function(control) { setLayoutDisabled(control, true); });
      Array.prototype.slice.call(document.querySelectorAll("[data-signal-visibility]")).forEach(function(control) { setLayoutDisabled(control, true); });
      return;
    }
    grid.dataset.layoutState = pending ? "pending" : "ready";
    grid.dataset.layoutVariant = layout.variant;
    grid.dataset.activePaneId = layout.active_pane_id;
    grid.style.setProperty("--layout-rows", layout.rows);
    grid.style.setProperty("--layout-columns", layout.columns);
    grid.classList.toggle("is-compact", layout.rows * layout.columns > 16);
    grid.innerHTML = layout.panes.map(function(pane, offset) {
      var index = offset + 1;
      var isActive = pane.id === layout.active_pane_id;
      var panePending = pending && pending.paneId === pane.id;
      var select = isActive ? "" : "<select class='pane-type-select' data-pane-plot-type data-pane-id='" + esc(pane.id) + "' data-testid='pane-plot-type-" + esc(pane.id) + "' aria-label='Тип графика области " + index + "'" + (panePending ? " disabled aria-busy='true'" : "") + ">" + PLOTS.map(function(plot) { return "<option value='" + plot + "'" + (pane.plot_type === plot ? " selected" : "") + ">" + TITLES[plot] + "</option>"; }).join("") + "</select>";
      return "<article class='plot-pane" + (isActive ? " is-active" : "") + (panePending ? " is-pending" : "") + "' data-pane-id='" + esc(pane.id) + "' data-testid='plot-pane-" + esc(pane.id) + "' tabindex='0' aria-current='" + (isActive ? "true" : "false") + "' aria-busy='" + (panePending ? "true" : "false") + "' aria-label='Область " + index + ", " + TITLES[pane.plot_type] + "'>" +
        "<header class='pane-header'><div class='pane-title'><strong>Область " + index + "</strong><span class='pane-server-id'>" + esc(pane.id) + "</span>" + (isActive ? "<span class='pane-active-badge'>Активная</span>" : "") + "</div><span class='pane-runtime-slot' data-pane-runtime-slot='" + (isActive ? "true" : "false") + "'>" + select + "</span></header>" + paneOutputMarkup(pane, index, isActive, isActive ? outputs[0] : panePayloadCache[pane.id]) + "</article>";
    }).join("");
    var activeSlot = grid.querySelector("[data-pane-runtime-slot='true']");
    var activeOutput = grid.querySelector("[data-pane-id='" + layout.active_pane_id + "'] [data-pane-output-state='ready']");
    var active = activePane(layout);
    if (plotControl && activeSlot) {
      plotControl.dataset.paneId = active.id;
      plotControl.setAttribute("data-pane-plot-type", "");
      plotControl.querySelector("select").value = active.plot_type;
      activeSlot.appendChild(plotControl);
    }
    if (overflowTrigger && activeSlot) activeSlot.appendChild(overflowTrigger);
    if (overflowMenu && activeSlot) activeSlot.appendChild(overflowMenu);
    if (host && activeOutput && host.parentNode !== activeOutput) activeOutput.appendChild(host);
    var activeTypePending = !!(pending && pending.kind === "update_pane" && pending.paneId === active.id && pending.controlName === "plot_type");
    setLayoutDisabled(plotControl && plotControl.querySelector("select"), activeTypePending);
    setLayoutDisabled(node("settings-view-select"), activeTypePending);
    setLayoutDisabled(node("clear-display-action"), !!(pending && pending.paneId === active.id));
    renderPanePlots(layout, outputs);
  }

  function syncContext() {
    var layout = currentLayout();
    var pane = activePane(layout);
    var index = activePaneIndex(layout);
    var trigger = node("layout-trigger");
    var title = node("pane-settings-context");
    var bindingTitle = node("pane-binding-title");
    var bindingType = node("pane-binding-type");
    if (!layout || !pane) return;
    root.dataset.activePaneId = pane.id;
    root.dataset.layoutVariant = layout.variant;
    if (trigger) {
      trigger.disabled = !!pending;
      trigger.setAttribute("aria-expanded", ui.open ? "true" : "false");
      setText("layout-trigger-label", pretty(layout.rows, layout.columns));
    }
    if (title) title.textContent = "Область " + index + " · " + TITLES[pane.plot_type];
    if (bindingTitle) bindingTitle.textContent = "Связи области " + index;
    if (bindingType) bindingType.textContent = TITLES[pane.plot_type];
    Array.prototype.slice.call(document.querySelectorAll("[data-signal-visibility]")).forEach(function(control) {
      var name = control.dataset.signalVisibility;
      var checked = pane.signal_bindings.indexOf(name) >= 0;
      control.checked = checked;
      control.setAttribute("aria-checked", checked ? "true" : "false");
      control.setAttribute("aria-label", (checked ? "Убрать " : "Добавить ") + name + " " + (checked ? "из" : "в") + " области " + index);
      setLayoutDisabled(control, !!(pending && pending.controlName === name));
    });
    var all = node("toggle-all-signals");
    var inventory = signalNames();
    if (all) {
      all.checked = inventory.length > 0 && pane.signal_bindings.length === inventory.length;
      all.indeterminate = pane.signal_bindings.length > 0 && pane.signal_bindings.length < inventory.length;
      setLayoutDisabled(all, !!(pending && pending.controlName === "*"));
      all.setAttribute("aria-label", "Связать все сигналы с областью " + index);
    }
  }

  function renderDimensionOptions(testId, key, value) {
    var host = node(testId);
    if (!host) return;
    host.innerHTML = Array.from({ length:10 }, function(_, index) { return index + 1; }).map(function(option) {
      return "<button type='button' data-layout-dimension='" + key + "' data-layout-value='" + option + "' data-testid='layout-" + key + "-" + option + "' aria-pressed='" + (option === value ? "true" : "false") + "' class='" + (option === value ? "is-selected" : "") + "'" + (pending ? " disabled" : "") + ">" + option + "</button>";
    }).join("");
  }

  function renderPopover() {
    var layout = currentLayout();
    var total, oldTotal, preserved, preview, apply;
    if (!popover || !layout) return;
    popover.hidden = !ui.open;
    if (!ui.open) return;
    total = ui.draftRows * ui.draftColumns;
    oldTotal = paneCount(layout);
    preserved = Math.min(oldTotal, total);
    setText("layout-current-copy", "Текущий макет " + pretty(layout.rows, layout.columns));
    setText("layout-draft-copy", "Черновик " + pretty(ui.draftRows, ui.draftColumns));
    renderDimensionOptions("layout-row-options", "rows", ui.draftRows);
    renderDimensionOptions("layout-column-options", "columns", ui.draftColumns);
    setText("layout-topology", ui.draftRows + " × " + ui.draftColumns);
    setText("layout-pane-count", total + " " + (total === 1 ? "область" : "областей"));
    preview = node("layout-preview");
    if (preview) {
      preview.style.setProperty("--preview-rows", ui.draftRows);
      preview.style.setProperty("--preview-columns", ui.draftColumns);
      preview.innerHTML = Array.from({ length:total }).map(function() { return "<span></span>"; }).join("");
    }
    setText("layout-preserve-copy", preserved === 1 ? "Область 1 сохраняет идентификатор, тип и привязки." : "Области 1–" + preserved + " сохраняют идентификаторы, типы и привязки.");
    var warning = node("layout-warning");
    if (warning) warning.hidden = total >= oldTotal && total <= 16;
    if (total > 16) {
      setText("layout-warning-copy", "Макет больше 4 × 4 может снизить читаемость графиков. Применение остаётся доступно.");
    } else if (total < oldTotal) {
      var firstDropped = total + 1;
      setText("layout-warning-copy", "Области " + firstDropped + (oldTotal > firstDropped ? "–" + oldTotal : "") + " являются конечной частью макета и будут удалены." + (activePaneIndex(layout) > total ? " Активной станет область 1." : ""));
    }
    setHidden("layout-conflict", !ui.conflict);
    setHidden("layout-error", !ui.error);
    setText("layout-error-copy", ui.error);
    [node("layout-cancel-close"), node("layout-cancel")].forEach(function(control) { if (control) control.disabled = !!pending; });
    apply = node("layout-apply");
    if (apply) {
      apply.disabled = !!pending || ui.conflict || (ui.draftRows === layout.rows && ui.draftColumns === layout.columns);
      apply.textContent = pending && pending.kind === "resize" ? "Применение…" : "Применить";
    }
    positionPopover();
  }

  function render() {
    if (!root || !grid) return;
    renderGrid();
    syncContext();
    renderPopover();
  }

  function positionPopover() {
    var trigger = node("layout-trigger");
    var anchor, bounds, margin = 8, gap = 6, left, top;
    if (!ui.open || !trigger || !popover || popover.hidden) return;
    popover.style.visibility = "hidden";
    popover.style.left = "0px";
    popover.style.top = "0px";
    anchor = trigger.getBoundingClientRect();
    bounds = popover.getBoundingClientRect();
    left = anchor.right - bounds.width;
    top = anchor.bottom + gap;
    if (top + bounds.height > window.innerHeight - margin) top = anchor.top - bounds.height - gap;
    left = Math.max(margin, Math.min(left, window.innerWidth - bounds.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - bounds.height - margin));
    popover.style.left = Math.round(left) + "px";
    popover.style.top = Math.round(top) + "px";
    popover.style.visibility = "visible";
  }

  function openPopover(trigger) {
    var layout = currentLayout();
    if (!layout || pending) return;
    ui.open = true;
    ui.draftRows = layout.rows;
    ui.draftColumns = layout.columns;
    ui.conflict = false;
    ui.error = "";
    ui.returnFocus = trigger || document.activeElement;
    render();
    window.dispatchEvent(new window.CustomEvent("signal-analyser-layout-popover", { detail:{ open:true, node:popover, trigger:ui.returnFocus } }));
    window.requestAnimationFrame(function() {
      positionPopover();
      var close = node("layout-cancel-close");
      if (close) close.focus();
    });
  }

  function closePopover(restoreFocus) {
    if (pending) return;
    var layout = currentLayout();
    ui.open = false;
    ui.conflict = false;
    ui.error = "";
    if (layout) { ui.draftRows = layout.rows; ui.draftColumns = layout.columns; }
    render();
    window.dispatchEvent(new window.CustomEvent("signal-analyser-layout-popover", { detail:{ open:false } }));
    if (restoreFocus !== false) {
      var focus = ui.returnFocus || node("layout-trigger");
      if (focus && typeof focus.focus === "function") focus.focus();
    }
  }

  function showToast(kind, copy) {
    var toast = node("layout-toast");
    if (!toast) return;
    if (toastTimer) window.clearTimeout(toastTimer);
    toast.className = "layout-toast is-" + kind;
    setText("layout-toast-icon", kind === "success" ? "✓" : kind === "warning" ? "!" : "×");
    setText("layout-toast-copy", copy);
    toast.hidden = false;
    toastTimer = window.setTimeout(function() { toast.hidden = true; }, 5000);
  }

  function legacyPostLayout(payload, metadata) {
    if (!api || typeof api.layouts !== "function" || pending || !currentLayout()) return;
    pending = metadata;
    render();
    api.layouts(Object.assign({ state_revision:envelopeRevision, display_id:activeDisplayId, version:1 }, payload)).then(function(envelope) {
      if (!acceptEnvelope(envelope, true)) throw new Error("Сервер вернул некорректный layout snapshot.");
      if (metadata.kind === "resize") {
        var applied = currentLayout();
        ui.open = false;
        ui.conflict = false;
        ui.error = "";
        showToast("success", "Макет " + pretty(applied.rows, applied.columns) + " применён. Идентификаторы областей сохранены.");
      }
    }).catch(function(error) {
      if (error && error.status === 409 && error.payload && error.payload.current && acceptEnvelope(error.payload.current, true)) {
        if (metadata.kind === "resize") {
          var layout = currentLayout();
          ui.open = true;
          ui.draftRows = layout.rows;
          ui.draftColumns = layout.columns;
          ui.conflict = true;
          ui.error = "";
          setText("layout-conflict-copy", "Состояние сервера: " + pretty(layout.rows, layout.columns) + ". Устаревший черновик отброшен.");
        } else {
          showToast("warning", "Область изменилась на сервере. Восстановлено текущее состояние.");
        }
        return;
      }
      if (metadata.kind === "resize") {
        ui.error = message(error, "Сервер отклонил черновик. Проверьте размеры и повторите попытку.");
        ui.open = true;
      } else {
        showToast("error", message(error, "Не удалось обновить pane."));
      }
    }).finally(function() {
      var wasResize = pending && pending.kind === "resize";
      pending = null;
      render();
      if (wasResize && !ui.open) {
        var trigger = node("layout-trigger");
        if (trigger && typeof trigger.focus === "function") trigger.focus();
      }
    });
  }

  function updatePane(pane, plotType, bindings, controlName) {
    if (!pane || PLOTS.indexOf(plotType) < 0 || !Array.isArray(bindings)) return;
    postLayout({ operation:"update_pane", pane_id:pane.id, plot_type:plotType, signal_bindings:bindings.slice() }, { kind:"update_pane", paneId:pane.id, controlName:controlName || "" });
  }

  function selectPane(paneId) {
    var layout = currentLayout();
    if (!layout || layout.active_pane_id === paneId) return;
    var pane = layout.panes.filter(function(item) { return item.id === paneId; })[0];
    if (!pane) return;
    postLayout({ operation:"select_pane", pane_id:pane.id }, { kind:"select_pane", paneId:pane.id });
  }

  function applyDraft() {
    var layout = currentLayout();
    if (!layout || ui.conflict || (ui.draftRows === layout.rows && ui.draftColumns === layout.columns)) return;
    postLayout({ operation:"resize", variant:variant(ui.draftRows, ui.draftColumns), rows:ui.draftRows, columns:ui.draftColumns }, { kind:"resize" });
  }

  function changeDimension(key, value, focus) {
    if (pending || (key !== "rows" && key !== "columns") || value < 1 || value > 10) return;
    if (key === "rows") ui.draftRows = value; else ui.draftColumns = value;
    ui.conflict = false;
    ui.error = "";
    renderPopover();
    if (focus) {
      var control = node("layout-" + key + "-" + value);
      if (control) control.focus();
    }
  }

  function legacyRefresh() {
    var requestId;
    if (!api || typeof api.layouts !== "function") return;
    if (refreshPending) { refreshQueued = true; return; }
    requestId = ++refreshRequestId;
    refreshPending = true;
    refreshQueued = false;
    render();
    window.Promise.resolve().then(function() { return api.layouts(); }).then(function(envelope) {
      if (requestId !== refreshRequestId) return;
      if (integer(appRevision) && integer(envelope && envelope.state_revision) && envelope.state_revision < appRevision) {
        refreshQueued = true;
        return;
      }
      if (!acceptEnvelope(envelope, envelope.state_revision !== appRevision)) throw new Error("Некорректный layout snapshot.");
      refreshQueued = false;
    }).catch(function() {
      if (requestId === refreshRequestId && !currentLayout()) render();
    }).finally(function() {
      if (requestId !== refreshRequestId) return;
      refreshPending = false;
      render();
      if (refreshQueued) { refreshQueued = false; refresh(); }
    });
  }

  function handleClick(event) {
    var target = event.target;
    var trigger = target.closest && target.closest("[data-testid='layout-trigger']");
    var pane = target.closest && target.closest("[data-pane-id]");
    var dimension = target.closest && target.closest("[data-layout-dimension]");
    if (trigger) { event.preventDefault(); ui.open ? closePopover(true) : openPopover(trigger); return; }
    if (target.closest && target.closest("[data-testid='layout-retry']")) { refresh(); return; }
    if (dimension) { changeDimension(dimension.dataset.layoutDimension, Number(dimension.dataset.layoutValue), false); return; }
    if (target.closest && target.closest("[data-testid='layout-apply']")) { applyDraft(); return; }
    if (target.closest && target.closest("[data-testid='layout-cancel'],[data-testid='layout-cancel-close']")) { closePopover(true); return; }
    if (target.closest && target.closest("[data-testid='layout-toast-close']")) { setHidden("layout-toast", true); return; }
    if (pane && !target.closest("select,button") && !pending) selectPane(pane.dataset.paneId);
  }

  function handleChange(event) {
    var target = event.target;
    var layout = currentLayout();
    var pane = activePane(layout);
    if (!layout || !pane || pending) return;
    if (target.matches("[data-pane-plot-type] select,[data-pane-plot-type], [data-testid='settings-view-select']")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var requestedPlot = target.value;
      var targetPaneId = target.dataset.paneId || target.closest("[data-pane-id]") && target.closest("[data-pane-id]").dataset.paneId || pane.id;
      var targetPane = layout.panes.filter(function(item) { return item.id === targetPaneId; })[0];
      if (!targetPane || PLOTS.indexOf(requestedPlot) < 0) return;
      target.value = targetPane.plot_type;
      if (requestedPlot !== targetPane.plot_type) updatePane(targetPane, requestedPlot, targetPane.signal_bindings, "plot_type");
      return;
    }
    if (target.matches("[data-signal-visibility]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var name = target.dataset.signalVisibility;
      var wanted = target.checked;
      var bindings = pane.signal_bindings.slice();
      target.checked = bindings.indexOf(name) >= 0;
      if (wanted && bindings.indexOf(name) < 0) bindings.push(name);
      if (!wanted) bindings = bindings.filter(function(binding) { return binding !== name; });
      setLayoutDisabled(target, true);
      updatePane(pane, pane.plot_type, bindings, name);
      return;
    }
    if (target.matches("[data-testid='toggle-all-signals']")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var bindAll = target.checked;
      target.checked = pane.signal_bindings.length === signalNames().length && signalNames().length > 0;
      setLayoutDisabled(target, true);
      updatePane(pane, pane.plot_type, bindAll ? signalNames() : [], "*");
    }
  }

  function handleCaptureChange(event) {
    var target = event.target;
    if (!target || typeof target.matches !== "function") return;
    if (target.matches("[data-pane-plot-type] select,[data-pane-plot-type],[data-testid='settings-view-select'],[data-signal-visibility],[data-testid='toggle-all-signals']")) handleChange(event);
  }

  function handleCaptureClick(event) {
    var clear = event.target && event.target.closest && event.target.closest("[data-testid='clear-display-action']");
    var layout = currentLayout();
    var pane = activePane(layout);
    if (!clear || !pane || pending) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    updatePane(pane, pane.plot_type, [], "*");
  }

  function handleKeydown(event) {
    var pane = event.target.closest && event.target.closest("[data-pane-id]");
    var dimension = event.target.closest && event.target.closest("[data-layout-dimension]");
    if (pane && event.target === pane && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectPane(pane.dataset.paneId); return; }
    if (dimension && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].indexOf(event.key) >= 0) {
      event.preventDefault();
      var value = Number(dimension.dataset.layoutValue);
      if (event.key === "Home") value = 1;
      else if (event.key === "End") value = 10;
      else value = Math.max(1, Math.min(10, value + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1)));
      changeDimension(dimension.dataset.layoutDimension, value, true);
      return;
    }
    if (!ui.open) return;
    if (event.key === "Escape") { event.preventDefault(); closePopover(true); return; }
    if (event.key !== "Tab" || pending) return;
    var controls = Array.prototype.slice.call(popover.querySelectorAll("button:not([disabled])"));
    if (!controls.length) return;
    var current = controls.indexOf(document.activeElement);
    if (event.shiftKey && current <= 0) { event.preventDefault(); controls[controls.length - 1].focus(); }
    else if (!event.shiftKey && current === controls.length - 1) { event.preventDefault(); controls[0].focus(); }
  }

  function legacyOnAppRendered(event) {
    var detail = event && event.detail || {};
    activeDisplayId = String(detail.activeDisplayId || root.dataset.activeDisplayId || activeDisplayId);
    appRevision = Number(detail.revision);
    window.Promise.resolve().then(function() {
      render();
      syncContext();
      if (integer(appRevision) && envelopeRevision !== appRevision && !pending) refresh();
    });
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    root = node("app-shell");
    grid = node("pane-grid");
    runtime = node("active-pane-runtime");
    activeHost = node("active-plot-host");
    plotControl = document.querySelector(".plot-type-control");
    overflowTrigger = node("display-overflow-trigger");
    overflowMenu = node("display-overflow-menu");
    popover = node("layout-popover");
    if (!root || !grid || !runtime || !popover) return;
    popover.id = "layout-popover";
    document.addEventListener("click", handleClick);
    document.addEventListener("click", handleCaptureClick, true);
    document.addEventListener("change", handleCaptureChange, true);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("pointerdown", function(event) {
      var trigger = node("layout-trigger");
      if (ui.open && !pending && !popover.contains(event.target) && !(trigger && trigger.contains(event.target))) closePopover(true);
    });
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    window.addEventListener("signal-analyser-rendered", onAppRendered);
    render();
    refresh();
  }

  window.SignalAnalyserLayouts = {
    refresh:refresh,
    acceptEnvelope:acceptEnvelope,
    closePopover:function() { closePopover(true); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
  // TASK-0060 active-output data path.  State-lite is the sole metadata
  // snapshot; Plotly arrays are requested only for its authoritative pane.
  var ACTIVE_OUTPUT_PATH = "./api/outputs/active?display_id=";
  var activeOutputPollTimer = null, activeOutputRequestId = 0, activeOutputContext = "";
  var lazyPlotlyPromise = null;

  function ensureLocalPlotly() {
    if (!window.Plotly && window.moduleName && typeof window.moduleName.react === "function") window.Plotly = window.moduleName;
    if (window.Plotly && typeof window.Plotly.react === "function") return Promise.resolve(window.Plotly);
    if (lazyPlotlyPromise) return lazyPlotlyPromise;
    lazyPlotlyPromise = new Promise(function(resolve, reject) {
      var script = document.createElement("script");
      script.src = "./js/vendor/plotly-cartesian-3.1.0.min.js";
      script.async = true;
      script.onload = function() { if (!window.Plotly && window.moduleName && typeof window.moduleName.react === "function") window.Plotly = window.moduleName; if (window.Plotly && typeof window.Plotly.react === "function") resolve(window.Plotly); else reject(new Error("Локальная библиотека Plotly не зарегистрирована.")); };
      script.onerror = function() { lazyPlotlyPromise = null; reject(new Error("Не удалось загрузить локальную библиотеку Plotly.")); };
      document.head.appendChild(script);
    });
    return lazyPlotlyPromise;
  }

  function liteOutputRecord(status, pane) {
    if (!status || status.display_id !== activeDisplayId || status.pane_id !== pane.id || status.plot_type !== pane.plot_type ||
        !integer(status.calculation_revision) || typeof status.context_key !== "string" || !status.context_key ||
        typeof status.isready !== "boolean" || typeof status.success !== "boolean" || typeof status.error !== "string") return null;
    return { pane_id:pane.id, plot_type:pane.plot_type, signal_bindings:pane.signal_bindings.slice(), analysis_signal:status.analysis_signal, calculation_revision:status.calculation_revision, context_key:status.context_key, output:{ isready:status.isready === true, success:status.success === true, error:String(status.error || ""), data:[] } };
  }
  function normalizeEnvelope(snapshot) {
    var signalMap = {}, seen = {}, layouts = {}, outputs = {}, colors = {}, activeEntry;
    if (!snapshot || !integer(snapshot.state_revision) || !integer(snapshot.calculation_revision) || !Array.isArray(snapshot.signals) || !Array.isArray(snapshot.displays) || !Array.isArray(snapshot.layouts) || typeof snapshot.active_display_id !== "string") return null;
    snapshot.signals.forEach(function(signal) { if (signal && typeof signal.name === "string" && signal.name) { signalMap[signal.name] = true; colors[signal.name] = signal.color || "#1676e6"; } });
    if (!snapshot.displays.length || snapshot.displays.some(function(display) { return !display || typeof display.id !== "string" || !display.id || seen[display.id] || !(seen[display.id] = true); })) return null;
    if (!seen[snapshot.active_display_id] || snapshot.layouts.length !== snapshot.displays.length) return null;
    if (!snapshot.layouts.every(function(entry) {
      if (!entry || typeof entry.display_id !== "string" || !seen[entry.display_id] || layouts[entry.display_id] || !validLayout(entry.layout, signalMap) || !Array.isArray(entry.outputs)) return false;
      if (entry.display_id !== snapshot.active_display_id && entry.outputs.length !== 0) return false;
      if (entry.display_id === snapshot.active_display_id && entry.outputs.length !== 1) return false;
      layouts[entry.display_id] = entry.layout;
      outputs[entry.display_id] = entry.display_id === snapshot.active_display_id ? [liteOutputRecord(entry.outputs[0], activePane(entry.layout))].filter(Boolean) : [];
      if (entry.display_id === snapshot.active_display_id) activeEntry = entry;
      return entry.display_id !== snapshot.active_display_id || outputs[entry.display_id].length === 1;
    })) return null;
    if (!activeEntry) return null;
    return { revision:snapshot.state_revision, activeDisplayId:snapshot.active_display_id, layouts:layouts, outputs:outputs, colors:colors, state:snapshot };
  }
  function stopActiveOutputPoll() {
    activeOutputRequestId += 1;
    if (activeOutputPollTimer) { window.clearTimeout(activeOutputPollTimer); activeOutputPollTimer = null; }
    activeOutputContext = "";
  }
  function activeOutputIdentity() {
    var layout = currentLayout(), pane = activePane(layout), record = outputsByDisplay[activeDisplayId] && outputsByDisplay[activeDisplayId][0];
    return layout && pane && record ? activeDisplayId + "|" + pane.id + "|" + envelopeRevision + "|" + record.calculation_revision + "|" + record.context_key : "";
  }
  function validActiveOutput(response, displayId, paneId, revisionFloor, expectedCalculationRevision, expectedContextKey) {
    return !!(response && response.display_id === displayId && response.pane_id === paneId && PLOTS.indexOf(response.plot_type) >= 0 && integer(response.state_revision) && response.state_revision >= revisionFloor && response.calculation_revision === expectedCalculationRevision && response.context_key === expectedContextKey && typeof response.isready === "boolean" && typeof response.success === "boolean" && typeof response.error === "string" && Array.isArray(response.data) && (!response.isready ? response.data.length === 0 : response.success ? response.data.every(function(plot) { return plot && typeof plot === "object" && Array.isArray(plot.data) && plot.layout && typeof plot.layout === "object" && plot.config && typeof plot.config === "object"; }) : response.data.length === 0));
  }
  function scheduleActiveOutputPoll(delay) {
    var identity = activeOutputIdentity(), requestId, displayId, paneId, revisionFloor, expectedCalculationRevision, expectedContextKey;
    if (!identity || !api || typeof api.activeOutput !== "function") return;
    if (activeOutputContext !== identity) stopActiveOutputPoll();
    activeOutputContext = identity;
    if (activeOutputPollTimer) window.clearTimeout(activeOutputPollTimer);
    activeOutputPollTimer = window.setTimeout(function() {
      var layout = currentLayout(), pane = activePane(layout), expected = outputsByDisplay[activeDisplayId] && outputsByDisplay[activeDisplayId][0], responseRevision;
      activeOutputPollTimer = null;
      if (!pane || !expected || activeOutputIdentity() !== identity) return;
      requestId = ++activeOutputRequestId; displayId = activeDisplayId; paneId = pane.id; revisionFloor = latestKnownRevision() || 0; expectedCalculationRevision = expected.calculation_revision; expectedContextKey = expected.context_key;
      api.activeOutput(displayId, paneId).then(function(response) {
        if (requestId !== activeOutputRequestId || activeOutputIdentity() !== identity || !validActiveOutput(response, displayId, paneId, revisionFloor, expectedCalculationRevision, expectedContextKey)) return;
        responseRevision = response.state_revision;
        if (responseRevision < (latestKnownRevision() || 0)) return;
        envelopeRevision = Math.max(envelopeRevision || 0, responseRevision);
        outputsByDisplay[displayId] = [{ pane_id:paneId, plot_type:response.plot_type, signal_bindings:pane.signal_bindings.slice(), analysis_signal:null, calculation_revision:response.calculation_revision, context_key:response.context_key, output:{ isready:response.isready, success:response.success, error:response.error, data:response.data } }];
        render();
        if (!response.isready) scheduleActiveOutputPoll(150);
      }).catch(function(error) {
        var current = error && error.payload && (error.payload.current || error.payload.state);
        if (requestId !== activeOutputRequestId || activeOutputIdentity() !== identity) return;
        if (error && error.status === 409 && error.payload && (error.payload.code === "inactive_output" || error.payload.error && error.payload.error.code === "inactive_output")) {
          if (current) acceptEnvelope(current, true);
          else refresh();
          return;
        }
        outputsByDisplay[displayId] = [{ pane_id:paneId, plot_type:pane.plot_type, signal_bindings:pane.signal_bindings.slice(), analysis_signal:null, output:{ isready:true, success:false, error:message(error, "Не удалось загрузить активный график."), data:[] } }];
        render();
      });
    }, delay || 0);
  }
  function acceptEnvelope(snapshot, notifyApp) {
    var accepted = normalizeEnvelope(snapshot), revisionFloor = latestKnownRevision();
    if (!accepted || revisionFloor !== null && accepted.revision < revisionFloor) return false;
    stopActiveOutputPoll();
    envelopeRevision = accepted.revision; activeDisplayId = accepted.activeDisplayId;
    layoutsByDisplay = accepted.layouts; outputsByDisplay = accepted.outputs; signalColors = accepted.colors;
    render();
    if (notifyApp) dispatchState(accepted.state);
    scheduleActiveOutputPoll(0);
    return true;
  }
  function hasOutputData(record) { return !!(record && record.output && Array.isArray(record.output.data) && record.output.data.length); }
  function paneOutputMarkup(pane, index, isActive, record) {
    var prefix = "<div class='pane-output", suffix = "' data-testid='pane-output-" + esc(pane.id) + "'";
    if (!isActive) return prefix + " pane-output-empty" + suffix + " data-pane-output-state='empty'><strong>Нет данных области</strong><span>Выберите область, чтобы загрузить её график.</span></div>";
    if (!record || !record.output.isready) return prefix + " pane-output-loading" + suffix + " data-pane-output-state='loading' role='status'><span class='spinner'></span><span>Обновление графика…</span></div>";
    if (!record.output.success) return prefix + " pane-output-error" + suffix + " data-pane-output-state='error' role='alert'><strong>График не обновлён</strong><span>" + esc(record.output.error) + "</span></div>";
    if (!hasOutputData(record)) return prefix + " pane-output-empty" + suffix + " data-pane-output-state='empty'><strong>Нет видимых сигналов</strong><span>Выберите сигналы для активной области.</span></div>";
    return prefix + suffix + " data-pane-output-state='ready'><div class='pane-plot-host' data-pane-plot-host='" + esc(pane.id) + "' data-testid='pane-plot-host-" + esc(pane.id) + "' role='img' aria-label='График области " + index + "'></div></div>";
  }
  function renderPanePlots(layout, outputs) {
    var record = outputs[0], pane = activePane(layout), host = activeHost;
    if (record && pane && host && record.pane_id === pane.id && record.output.isready && record.output.success && hasOutputData(record)) {
      queuePaneRender(host, record);
    }
  }
  function postLayout(payload, metadata) {
    if (!api || typeof api.layouts !== "function" || pending || !currentLayout()) return;
    pending = metadata; render();
    api.layouts(Object.assign({ state_revision:envelopeRevision, display_id:activeDisplayId, version:1 }, payload)).then(function(snapshot) { if (!acceptEnvelope(snapshot, true)) throw new Error("Сервер вернул некорректное лёгкое состояние."); if (metadata.kind === "resize") { ui.open = false; showToast("success", "Макет применён. Идентификаторы областей сохранены."); } }).catch(function(error) { if (error && error.status === 409 && error.payload && error.payload.current && acceptEnvelope(error.payload.current, true)) { showToast("warning", "Область изменилась на сервере. Восстановлено текущее состояние."); } else if (metadata.kind === "resize") { ui.error = message(error, "Сервер отклонил черновик. Проверьте размеры и повторите попытку."); ui.open = true; } else showToast("error", message(error, "Не удалось обновить pane.")); }).finally(function() { pending = null; render(); });
  }
  function onAppRendered(event) {
    var detail = event && event.detail || {};
    appRevision = Number(detail.revision);
    if (typeof detail.activeDisplayId === "string" && detail.activeDisplayId) activeDisplayId = detail.activeDisplayId;
    if (detail.snapshot) acceptEnvelope(detail.snapshot, false);
    else if (integer(appRevision) && appRevision > (envelopeRevision || -1)) refresh();
  }
  function queuePaneRender(host, record) {
    var key = record.pane_id, resizeEntry = paneResizeObservers[key], previous = paneRenderQueue[key], task = { host:host, record:record, scheduled:false, inFlight:false, resizeQueued:false };
    if (window.ResizeObserver && (!resizeEntry || resizeEntry.host !== host)) {
      if (resizeEntry && resizeEntry.observer && typeof resizeEntry.observer.disconnect === "function") resizeEntry.observer.disconnect();
      resizeEntry = { host:host, observer:new window.ResizeObserver(function() {
        var latest = paneRenderQueue[key];
        if (!latest || latest.resizeQueued) return;
        latest.resizeQueued = true;
        window.requestAnimationFrame(function() { latest.resizeQueued = false; resizeActivePlot(latest.host); });
      }) };
      paneResizeObservers[key] = resizeEntry;
      resizeEntry.observer.observe(host);
    }
    host.dataset.plotReady = "false";
    paneRenderQueue[key] = task;
    if (previous && previous.inFlight) return;
    task.scheduled = true;
    window.requestAnimationFrame(function renderLatestPane() {
      var current = paneRenderQueue[key], plot;
      if (!current || current.inFlight || !current.host || !current.host.isConnected || !current.host.getBoundingClientRect().width || !current.host.getBoundingClientRect().height) return;
      current.scheduled = false; plot = current.record.output.data[0];
      if (!plot) return;
      current.inFlight = true;
      ensureLocalPlotly().then(function(Plotly) {
        if (!current.host.isConnected || paneRenderQueue[key] !== current) return null;
        return Plotly.react(current.host, plot.data, plot.layout, Object.assign({ responsive:true, displaylogo:false, displayModeBar:false, showTips:false }, plot.config || {}));
      }).then(function(result) { if (result !== null && paneRenderQueue[key] === current) { removeGeneratedModebar(current.host); current.host.dataset.plotReady = "true"; } }, function() { if (paneRenderQueue[key] === current) renderLocalPaneError(current.host, "Не удалось обновить интерактивный график."); }).finally(function() {
        var latest = paneRenderQueue[key];
        current.inFlight = false;
        if (paneRenderQueue[key] !== current) { latest.inFlight = false; latest.scheduled = true; window.requestAnimationFrame(renderLatestPane); }
      });
    });
  }
  function refresh() {
    // The app coordinator owns cold startup.  A layout retry is allowed only
    // after it has published an authoritative state revision.
    if (!integer(appRevision) || !api || typeof api.getState !== "function" || refreshPending) return;
    refreshPending = true; render();
    window.Promise.resolve().then(function() { return api.getState(); }).then(function(snapshot) { acceptEnvelope(snapshot, true); }).catch(function() { if (!currentLayout()) render(); }).finally(function() { refreshPending = false; render(); });
  }
})(window, document);
