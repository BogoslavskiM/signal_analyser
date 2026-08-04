(function registerSignalAnalyserLayouts(window, document) {
  "use strict";

  var PLOTS = ["time", "spectrum", "spectrogram", "persistence"];
  var TITLES = { time:"Time", spectrum:"Spectrum", spectrogram:"Spectrogram", persistence:"Persistence" };
  var api = window.SignalAnalyserApi;
  var root, grid, runtime, popover, activeHost;
  var layoutsByDisplay = {};
  var outputsByDisplay = {};
  var signalColors = {};
  var envelopeRevision = null;
  var activeDisplayId = "";
  var appRevision = null;
  var refreshRequestId = 0;
  var refreshPending = false;
  var pending = null;
  var toastTimer = null;
  var paneRenderGeneration = 0;
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
        !integer(layout.rows) || layout.rows < 1 || layout.rows > 4 ||
        !integer(layout.columns) || layout.columns < 1 || layout.columns > 4 ||
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

  function normalizeEnvelope(envelope) {
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
          !Array.isArray(entry.outputs) || entry.outputs.length !== entry.layout.panes.length ||
          !entry.outputs.every(function(record, index) { return validPaneOutput(record, entry.layout.panes[index], signalMap); })) return false;
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

  function acceptEnvelope(envelope, notifyApp) {
    var accepted = normalizeEnvelope(envelope);
    if (!accepted) return false;
    envelopeRevision = accepted.revision;
    activeDisplayId = accepted.activeDisplayId;
    layoutsByDisplay = accepted.layouts;
    outputsByDisplay = accepted.outputs;
    signalColors = accepted.colors;
    render();
    if (notifyApp) dispatchState(accepted.state);
    return true;
  }

  function returnRuntimeNodes() {
    if (!runtime) return;
    [document.querySelector(".plot-type-control"), node("display-overflow-trigger"), node("display-overflow-menu"), activeHost || node("active-plot-host")].forEach(function(control) {
      if (control && control.parentNode !== runtime) runtime.appendChild(control);
    });
  }

  function hasOutputData(record) {
    var data = record && record.output && record.output.data;
    if (record.plot_type === "time" || record.plot_type === "spectrum") return Array.isArray(data) && data.length > 0;
    return !!(data && Array.isArray(data.z) && data.z.length > 0);
  }

  function paneOutputMarkup(pane, index, isActive, record) {
    var prefix = "<div class='pane-output", suffix = "' data-testid='pane-output-" + esc(pane.id) + "'";
    if (!record.output.isready) return prefix + " pane-output-loading" + suffix + " data-pane-output-state='loading' role='status'><span class='spinner'></span><span>Loading Pane " + index + "…</span></div>";
    if (!record.output.success) return prefix + " pane-output-error" + suffix + " data-pane-output-state='error' role='alert'><strong>Pane " + index + " could not render</strong><span>" + esc(record.output.error) + "</span></div>";
    if (!pane.signal_bindings.length || !hasOutputData(record)) return prefix + " pane-output-empty" + suffix + " data-pane-output-state='empty'><strong>" + (!pane.signal_bindings.length ? "No signals bound" : "No renderable data") + "</strong><span>" + (!pane.signal_bindings.length ? "Use Signals checkboxes for this pane." : "Adjust this pane’s signals or settings.") + "</span></div>";
    return prefix + suffix + " data-pane-output-state='ready'>" + (isActive ? "" : "<div class='pane-plot-host' data-pane-plot-host='" + esc(pane.id) + "' data-testid='pane-plot-host-" + esc(pane.id) + "' role='img' aria-label='Pane " + index + " " + TITLES[pane.plot_type] + " plot'></div>") + "</div>";
  }

  function purgePaneHosts() {
    var Plotly = window.Plotly || window.moduleName;
    ++paneRenderGeneration;
    if (!Plotly || typeof Plotly.purge !== "function" || !grid) return;
    Array.prototype.slice.call(grid.querySelectorAll("[data-pane-plot-host]")).forEach(function(host) {
      try { Plotly.purge(host); } catch (ignored) {}
    });
  }

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
      showlegend:!heat && !compact,
      legend:{ orientation:"h", y:-.2 },
    };
  }

  function renderLocalPaneError(host, copy) {
    if (!host || !host.isConnected) return;
    var output = host.parentNode;
    output.classList.add("pane-output-error");
    output.dataset.paneOutputState = "error";
    output.innerHTML = "<strong>Pane could not render</strong><span>" + esc(copy) + "</span>";
  }

  function resizeActivePlot(host) {
    if (!host || typeof window.requestAnimationFrame !== "function") return;
    window.requestAnimationFrame(function() {
      var Plotly = window.Plotly || window.moduleName;
      if (!host.isConnected || !host.getBoundingClientRect().width || !Plotly || !Plotly.Plots || typeof Plotly.Plots.resize !== "function") return;
      try { Promise.resolve(Plotly.Plots.resize(host)).catch(function() {}); } catch (ignored) {}
    });
  }

  function renderPanePlots(layout, outputs) {
    var Plotly = window.Plotly || window.moduleName;
    var generation = ++paneRenderGeneration;
    if (!Plotly || typeof Plotly.react !== "function") {
      Array.prototype.slice.call(grid.querySelectorAll("[data-pane-plot-host]")).forEach(function(host) {
        renderLocalPaneError(host, "Plot renderer unavailable. Reload the application to retry.");
      });
      return;
    }
    outputs.forEach(function(record, index) {
      var renderPromise;
      if (record.pane_id === layout.active_pane_id || !record.output.isready || !record.output.success || !hasOutputData(record)) return;
      var host = grid.querySelector("[data-pane-plot-host='" + record.pane_id + "']");
      if (!host) return;
      try {
        renderPromise = Plotly.react(host, panePlotData(record), panePlotLayout(record, layout.rows === 4 && layout.columns === 4), { responsive:true, displaylogo:false, displayModeBar:false });
      } catch (error) {
        renderLocalPaneError(host, "Local renderer failed. Retry by changing this pane.");
        return;
      }
      Promise.resolve(renderPromise).then(function() {
        if (generation === paneRenderGeneration && host.isConnected) host.dataset.plotReady = "true";
      }, function() {
        if (generation !== paneRenderGeneration || !host.isConnected) return;
        renderLocalPaneError(host, "Local renderer failed for Pane " + (index + 1) + ". Retry by changing this pane.");
      });
    });
  }

  function renderGrid() {
    var layout = currentLayout();
    var outputs = currentOutputs();
    var plotControl = document.querySelector(".plot-type-control");
    var overflowTrigger = node("display-overflow-trigger");
    var overflowMenu = node("display-overflow-menu");
    var host = activeHost || node("active-plot-host");
    if (!grid) return;
    purgePaneHosts();
    [plotControl, overflowTrigger, overflowMenu, host].forEach(function(control) { if (control && control.parentNode) control.parentNode.removeChild(control); });
    if (!layout) {
      var loadingTrigger = node("layout-trigger");
      grid.dataset.layoutState = refreshPending ? "loading" : "error";
      grid.innerHTML = refreshPending ? "<div class='pane-grid-state' data-testid='layout-loading' role='status'><span class='spinner'></span><span>Loading layout…</span></div>" : "<div class='pane-grid-state is-error' data-testid='layout-load-error' role='alert'><span>Не удалось загрузить layout.</span><button type='button' data-testid='layout-retry'>Retry</button></div>";
      returnRuntimeNodes();
      if (loadingTrigger) loadingTrigger.disabled = true;
      if (node("layout-trigger-label")) node("layout-trigger-label").textContent = "—";
      [node("plot-type-select"), node("settings-view-select"), node("toggle-all-signals"), node("clear-display-action")].forEach(function(control) { setLayoutDisabled(control, true); });
      Array.prototype.slice.call(document.querySelectorAll("[data-signal-visibility]")).forEach(function(control) { setLayoutDisabled(control, true); });
      return;
    }
    grid.dataset.layoutState = pending ? "pending" : "ready";
    grid.dataset.layoutVariant = layout.variant;
    grid.dataset.activePaneId = layout.active_pane_id;
    grid.style.setProperty("--layout-rows", layout.rows);
    grid.style.setProperty("--layout-columns", layout.columns);
    grid.classList.toggle("is-compact", layout.rows === 4 && layout.columns === 4);
    grid.innerHTML = layout.panes.map(function(pane, offset) {
      var index = offset + 1;
      var isActive = pane.id === layout.active_pane_id;
      var panePending = pending && pending.paneId === pane.id;
      var select = isActive ? "" : "<select class='pane-type-select' data-pane-plot-type data-pane-id='" + esc(pane.id) + "' data-testid='pane-plot-type-" + esc(pane.id) + "' aria-label='Plot type for Pane " + index + "'" + (panePending ? " disabled aria-busy='true'" : "") + ">" + PLOTS.map(function(plot) { return "<option value='" + plot + "'" + (pane.plot_type === plot ? " selected" : "") + ">" + TITLES[plot] + "</option>"; }).join("") + "</select>";
      return "<article class='plot-pane" + (isActive ? " is-active" : "") + (panePending ? " is-pending" : "") + "' data-pane-id='" + esc(pane.id) + "' data-testid='plot-pane-" + esc(pane.id) + "' tabindex='0' aria-current='" + (isActive ? "true" : "false") + "' aria-busy='" + (panePending ? "true" : "false") + "' aria-label='Pane " + index + ", " + TITLES[pane.plot_type] + ", " + pane.signal_bindings.length + " bound signals'>" +
        "<header class='pane-header'><div class='pane-title'><strong>Pane " + index + "</strong><span class='pane-server-id'>" + esc(pane.id) + "</span>" + (isActive ? "<span class='pane-active-badge'>Active</span>" : "") + "</div><span class='pane-runtime-slot' data-pane-runtime-slot='" + (isActive ? "true" : "false") + "'>" + select + "</span></header>" + paneOutputMarkup(pane, index, isActive, outputs[offset]) + "</article>";
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
    if (host && activeOutput) { activeOutput.appendChild(host); resizeActivePlot(host); }
    else if (host && runtime && host.parentNode !== runtime) runtime.appendChild(host);
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
      node("layout-trigger-label").textContent = pretty(layout.rows, layout.columns);
    }
    if (title) title.textContent = "Pane " + index + " · " + TITLES[pane.plot_type];
    if (bindingTitle) bindingTitle.textContent = "Bindings for Pane " + index;
    if (bindingType) bindingType.textContent = TITLES[pane.plot_type];
    Array.prototype.slice.call(document.querySelectorAll("[data-signal-visibility]")).forEach(function(control) {
      var name = control.dataset.signalVisibility;
      var checked = pane.signal_bindings.indexOf(name) >= 0;
      control.checked = checked;
      control.setAttribute("aria-checked", checked ? "true" : "false");
      control.setAttribute("aria-label", (checked ? "Убрать " : "Добавить ") + name + " " + (checked ? "из" : "в") + " Pane " + index);
      setLayoutDisabled(control, !!(pending && pending.controlName === name));
    });
    var all = node("toggle-all-signals");
    var inventory = signalNames();
    if (all) {
      all.checked = inventory.length > 0 && pane.signal_bindings.length === inventory.length;
      all.indeterminate = pane.signal_bindings.length > 0 && pane.signal_bindings.length < inventory.length;
      setLayoutDisabled(all, !!(pending && pending.controlName === "*"));
      all.setAttribute("aria-label", "Bind all signals to Pane " + index);
    }
  }

  function renderDimensionOptions(testId, key, value) {
    var host = node(testId);
    if (!host) return;
    host.innerHTML = [1, 2, 3, 4].map(function(option) {
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
    node("layout-current-copy").textContent = "Current " + pretty(layout.rows, layout.columns);
    node("layout-draft-copy").textContent = "Draft " + pretty(ui.draftRows, ui.draftColumns);
    renderDimensionOptions("layout-row-options", "rows", ui.draftRows);
    renderDimensionOptions("layout-column-options", "columns", ui.draftColumns);
    node("layout-topology").textContent = ui.draftRows + " × " + ui.draftColumns;
    node("layout-pane-count").textContent = total + (total === 1 ? " pane" : " panes");
    preview = node("layout-preview");
    preview.style.setProperty("--preview-rows", ui.draftRows);
    preview.style.setProperty("--preview-columns", ui.draftColumns);
    preview.innerHTML = Array.from({ length:total }).map(function() { return "<span></span>"; }).join("");
    node("layout-preserve-copy").textContent = preserved === 1 ? "Pane 1 keeps its ID, type, and bindings." : "Panes 1–" + preserved + " keep IDs, types, and bindings.";
    var warning = node("layout-warning");
    warning.hidden = total >= oldTotal;
    if (total < oldTotal) {
      var firstDropped = total + 1;
      node("layout-warning-copy").textContent = "Panes " + firstDropped + (oldTotal > firstDropped ? "–" + oldTotal : "") + " are the ordered suffix and will be dropped." + (activePaneIndex(layout) > total ? " Active pane falls back to Pane 1." : "");
    }
    node("layout-conflict").hidden = !ui.conflict;
    node("layout-error").hidden = !ui.error;
    node("layout-error-copy").textContent = ui.error;
    [node("layout-cancel-close"), node("layout-cancel")].forEach(function(control) { if (control) control.disabled = !!pending; });
    apply = node("layout-apply");
    apply.disabled = !!pending || ui.conflict || (ui.draftRows === layout.rows && ui.draftColumns === layout.columns);
    apply.textContent = pending && pending.kind === "resize" ? "Applying…" : "Apply";
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
    node("layout-toast-icon").textContent = kind === "success" ? "✓" : kind === "warning" ? "!" : "×";
    node("layout-toast-copy").textContent = copy;
    toast.hidden = false;
    toastTimer = window.setTimeout(function() { toast.hidden = true; }, 5000);
  }

  function postLayout(payload, metadata) {
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
        showToast("success", "Layout " + pretty(applied.rows, applied.columns) + " applied. Pane IDs were preserved.");
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
          node("layout-conflict-copy").textContent = "Server state is now " + pretty(layout.rows, layout.columns) + ". The stale draft was discarded.";
        } else {
          showToast("warning", "Pane changed on the server. Current state was restored.");
        }
        return;
      }
      if (metadata.kind === "resize") {
        ui.error = message(error, "Server rejected the draft. Review dimensions and retry.");
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
    if (pending || (key !== "rows" && key !== "columns") || value < 1 || value > 4) return;
    if (key === "rows") ui.draftRows = value; else ui.draftColumns = value;
    ui.conflict = false;
    ui.error = "";
    renderPopover();
    if (focus) {
      var control = node("layout-" + key + "-" + value);
      if (control) control.focus();
    }
  }

  function refresh() {
    var requestId;
    if (!api || typeof api.layouts !== "function" || refreshPending) return;
    requestId = ++refreshRequestId;
    refreshPending = true;
    render();
    api.layouts().then(function(envelope) {
      if (requestId !== refreshRequestId) return;
      if (!acceptEnvelope(envelope, envelope.state_revision !== appRevision)) throw new Error("Некорректный layout snapshot.");
    }).catch(function() {
      if (requestId === refreshRequestId && !currentLayout()) render();
    }).finally(function() {
      if (requestId !== refreshRequestId) return;
      refreshPending = false;
      render();
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
    if (target.closest && target.closest("[data-testid='layout-toast-close']")) { node("layout-toast").hidden = true; return; }
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
      else if (event.key === "End") value = 4;
      else value = Math.max(1, Math.min(4, value + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1)));
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

  function onAppRendered(event) {
    var detail = event && event.detail || {};
    activeDisplayId = String(detail.activeDisplayId || root.dataset.activeDisplayId || activeDisplayId);
    appRevision = Number(detail.revision);
    window.Promise.resolve().then(function() {
      render();
      syncContext();
      if (integer(appRevision) && envelopeRevision !== appRevision && !refreshPending && !pending) refresh();
    });
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    root = node("app-shell");
    grid = node("pane-grid");
    runtime = node("active-pane-runtime");
    activeHost = node("active-plot-host");
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
  }

  window.SignalAnalyserLayouts = {
    refresh:refresh,
    acceptEnvelope:acceptEnvelope,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})(window, document);
