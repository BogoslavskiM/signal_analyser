(() => {
  const app = document.querySelector("[data-app]");
  const paneGrid = document.querySelector("[data-pane-grid]");
  const layoutTrigger = document.querySelector(".layout-trigger");
  const layoutLabel = document.querySelector("[data-layout-label]");
  const popover = document.querySelector(".layout-popover");
  const rowOptions = document.querySelector("[data-row-options]");
  const columnOptions = document.querySelector("[data-column-options]");
  const preview = document.querySelector("[data-topology-preview]");
  const currentLayoutCopy = document.querySelector("[data-current-layout]");
  const draftLayoutCopy = document.querySelector("[data-draft-layout]");
  const topologyLabel = document.querySelector("[data-topology-label]");
  const paneCount = document.querySelector("[data-pane-count]");
  const preserveCopy = document.querySelector("[data-preserve-copy]");
  const dropWarning = document.querySelector(".drop-warning");
  const dropCopy = document.querySelector("[data-drop-copy]");
  const conflictBanner = document.querySelector(".conflict-banner");
  const applyError = document.querySelector(".apply-error");
  const applyButton = document.querySelector(".apply-button");
  const cancelButton = document.querySelector(".cancel-button");
  const closeButton = document.querySelector(".popover-close");
  const settingsType = document.querySelector("[data-settings-type]");
  const signalRows = document.querySelector("[data-signal-rows]");
  const signalsEmpty = document.querySelector(".signals-empty");
  const allSignals = document.querySelector("[data-all-signals]");
  const toast = document.querySelector(".toast");
  const toastCopy = document.querySelector("[data-toast-copy]");
  const demoControls = document.querySelector(".demo-controls");
  const popoverSelect = document.querySelector("[data-popover]");
  const query = new URLSearchParams(location.search);

  const plotTypes = ["Time", "Spectrum", "Spectrogram", "Persistence"];
  const signals = [
    { id: "sin_1k", name: "sin_1k", color: "#1676e6", rate: "2048 Hz", samples: "2048", duration: "0.9995 s", type: "real double" },
    { id: "chirp", name: "chirp_with_a_deliberately_long_signal_name", color: "#ea7a28", rate: "4096 Hz", samples: "8192", duration: "1.9998 s", type: "real double" },
    { id: "echo", name: "complex_echo", color: "#2d9b68", rate: "1000000 Hz", samples: "32000", duration: "0.031999 s", type: "complex double" },
    { id: "noise", name: "noise_floor", color: "#9169cf", rate: "2048 Hz", samples: "2048", duration: "0.9995 s", type: "real single" }
  ];

  const bindingPresets = [
    ["sin_1k", "chirp"], ["sin_1k", "echo"], ["chirp"], ["echo", "noise"],
    ["sin_1k"], ["chirp", "noise"], ["echo"], [],
    ["sin_1k", "noise"], ["chirp"], ["echo", "sin_1k"], ["noise"],
    ["sin_1k"], ["chirp", "echo"], [], ["noise", "sin_1k"]
  ];

  let current = { rows: 2, columns: 2 };
  let draft = { ...current };
  let activePane = 2;
  let state = "default";
  let popoverOpen = false;
  let applying = false;
  let lastFocused = null;
  let paneData = [];
  let nextPaneNumber = 1;

  function variant(layout = current) { return `${layout.rows}x${layout.columns}`; }
  function pretty(layout = current) { return `${layout.rows}×${layout.columns}`; }
  function paneTotal(layout = current) { return layout.rows * layout.columns; }
  function bindingsFor(index) { return [...(bindingPresets[index - 1] || [])]; }

  function createPaneData(layout) {
    const total = paneTotal(layout);
    const previous = paneData;
    paneData = Array.from({ length: total }, (_, index) => {
      const number = index + 1;
      const existing = previous[index];
      if (existing) return existing;
      const pane = { id: `pane-${nextPaneNumber}`, type: plotTypes[index % plotTypes.length], bindings: bindingsFor(number) };
      nextPaneNumber += 1;
      return pane;
    });
    if (activePane > total) activePane = 1;
    if (total === 1) activePane = 1;
  }

  function plotMarkup(type, index) {
    const grid = `<path class="plot-grid-line" d="M26 8V92M26 92H198M26 64H198M26 36H198M83 8V92M141 8V92M198 8V92"/>`;
    if (type === "Spectrogram") {
      return `<svg viewBox="0 0 210 100" preserveAspectRatio="none" aria-label="Spectrogram mock"><defs><linearGradient id="heat-${index}" x1="0" x2="1"><stop stop-color="#173b7a"/><stop offset=".45" stop-color="#2db7b0"/><stop offset=".72" stop-color="#f5c04a"/><stop offset="1" stop-color="#c53b36"/></linearGradient></defs>${grid}<rect class="heat" x="27" y="9" width="170" height="82" fill="url(#heat-${index})" opacity=".82"/><path class="trace-c" d="M27 78C54 72 58 24 89 28s37 50 68 32 22-30 40-38"/></svg>`;
    }
    if (type === "Persistence") {
      return `<svg viewBox="0 0 210 100" preserveAspectRatio="none" aria-label="Persistence plot mock">${grid}<path class="trace-a" opacity=".22" d="M26 55C48 15 66 92 88 50s40-25 58 3 31 24 52-16"/><path class="trace-a" opacity=".38" d="M26 58C48 19 66 88 88 52s40-30 58 2 31 20 52-14"/><path class="trace-a" d="M26 56C48 22 66 84 88 53s40-28 58 3 31 18 52-13"/></svg>`;
    }
    if (type === "Spectrum") {
      return `<svg viewBox="0 0 210 100" preserveAspectRatio="none" aria-label="Spectrum mock">${grid}<path class="trace-a" d="M26 88L39 82 50 86 59 70 65 20 72 75 86 80 97 58 103 35 109 74 126 83 143 78 158 88 176 80 198 87"/><path class="trace-b" d="M26 90L54 85 82 83 110 80 138 77 166 73 198 68"/></svg>`;
    }
    return `<svg viewBox="0 0 210 100" preserveAspectRatio="none" aria-label="Time plot mock">${grid}<path class="trace-a" d="M26 50C38 8 50 8 62 50s24 42 36 0 24-42 36 0 24 42 36 0 18-42 28 0"/><path class="trace-b" d="M26 50C38 27 50 27 62 50s24 23 36 0 24-23 36 0 24 23 36 0 18-23 28 0"/></svg>`;
  }

  function stateOverlay(index, pane) {
    if (state === "loading" && index === activePane) return `<div class="pane-state" role="status"><span class="spinner"></span><strong>Updating pane…</strong><span>Other panes stay interactive.</span></div>`;
    if (state === "empty" && index === activePane) return `<div class="pane-state"><strong>No signals bound</strong><span>Use Signals checkboxes for this pane.</span></div>`;
    if (state === "error" && index === 3) return `<div class="pane-state is-error" role="alert"><strong>Plot unavailable</strong><span>Pane 3 settings were not changed.</span></div>`;
    if (state === "warning" && index === activePane) return `<div class="pane-state is-warning"><strong>Local warning</strong> One bound signal has stale samples.</div>`;
    return "";
  }

  function renderPanes() {
    createPaneData(current);
    paneGrid.style.setProperty("--rows", current.rows);
    paneGrid.style.setProperty("--columns", current.columns);
    app.dataset.layout = variant(current);
    layoutLabel.textContent = pretty(current);
    paneGrid.innerHTML = paneData.map((pane, offset) => {
      const index = offset + 1;
      const active = index === activePane;
      const bindingCount = state === "empty" && active ? 0 : pane.bindings.length;
      const options = plotTypes.map(type => `<option${type === pane.type ? " selected" : ""}>${type}</option>`).join("");
      return `<article class="plot-pane${active ? " is-active" : ""}${state === "hover" && index === Math.min(3, paneData.length) ? " is-demo-hovered" : ""}" data-pane="${index}" tabindex="0" aria-label="Pane ${index}, ${pane.type}, ${bindingCount} bound signals" aria-current="${active ? "true" : "false"}">
        <header class="pane-header"><div class="pane-title"><strong>Pane ${index}</strong><span>${pane.id}</span>${active ? '<span class="active-badge">Active</span>' : ""}</div><select class="pane-type" aria-label="Plot type for Pane ${index}"${state === "loading" && active ? " disabled" : ""}>${options}</select></header>
        <div class="plot-area">${plotMarkup(pane.type, index)}${stateOverlay(index, pane)}</div>
      </article>`;
    }).join("");

    paneGrid.querySelectorAll(".plot-pane").forEach(pane => {
      pane.addEventListener("click", event => {
        if (event.target.closest("select")) return;
        selectPane(Number(pane.dataset.pane));
      });
      pane.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target === pane) { event.preventDefault(); selectPane(Number(pane.dataset.pane)); }
      });
    });
    paneGrid.querySelectorAll(".pane-type").forEach(select => {
      select.addEventListener("click", event => event.stopPropagation());
      select.addEventListener("change", event => {
        const number = Number(event.target.closest(".plot-pane").dataset.pane);
        paneData[number - 1].type = event.target.value;
        activePane = number;
        renderAll();
      });
    });
    renderContext();
  }

  function selectPane(number) {
    if (app.classList.contains("is-disabled")) return;
    activePane = number;
    renderAll();
  }

  function renderContext() {
    const pane = paneData[activePane - 1];
    if (!pane) return;
    const shownBindings = state === "empty" ? [] : pane.bindings;
    document.querySelector("[data-settings-context]").textContent = `Pane ${activePane} · ${pane.type}`;
    document.querySelector("[data-type-tab]").textContent = pane.type;
    document.querySelector("[data-presentation-title]").textContent = `${pane.type} presentation`;
    document.querySelector("[data-binding-count]").textContent = shownBindings.length;
    document.querySelector("[data-pane-id]").textContent = pane.id;
    document.querySelector("[data-binding-context]").textContent = `Bindings for Pane ${activePane}`;
    document.querySelector("[data-binding-type]").textContent = pane.type;
    settingsType.value = pane.type;
    renderSignals(shownBindings);
  }

  function renderSignals(bindings) {
    signalsEmpty.hidden = state !== "empty" || signals.length > 0;
    signalRows.hidden = false;
    signalRows.innerHTML = signals.map((signal, index) => {
      const checked = bindings.includes(signal.id);
      const pending = state === "loading";
      return `<tr class="${checked ? "is-selected" : ""}${state === "hover" && index === 1 ? " is-demo-hovered" : ""}"><td><input type="checkbox" data-signal="${signal.id}" aria-label="Bind ${signal.name} to Pane ${activePane}"${checked ? " checked" : ""}${pending || state === "disabled" ? " disabled" : ""}></td><td title="${signal.name}">${signal.name}</td><td><span class="swatch" style="background:${signal.color}"></span></td><td>${signal.rate}</td><td>${signal.samples}</td><td>${signal.duration}</td><td>${signal.type}</td><td><span class="row-actions"><button aria-label="Duplicate ${signal.name}"><svg><use href="#i-copy"/></svg></button><button aria-label="Delete ${signal.name}"><svg><use href="#i-trash"/></svg></button></span></td></tr>`;
    }).join("");
    allSignals.checked = bindings.length === signals.length;
    allSignals.indeterminate = bindings.length > 0 && bindings.length < signals.length;
    allSignals.disabled = state === "loading" || state === "disabled";
    signalRows.querySelectorAll("input[data-signal]").forEach(input => input.addEventListener("change", () => {
      const pane = paneData[activePane - 1];
      if (input.checked && !pane.bindings.includes(input.dataset.signal)) pane.bindings.push(input.dataset.signal);
      if (!input.checked) pane.bindings = pane.bindings.filter(id => id !== input.dataset.signal);
      renderAll();
    }));
  }

  function makeDimensionButtons(host, key) {
    host.innerHTML = [1,2,3,4].map(value => `<button type="button" data-dimension="${key}" data-value="${value}">${value}</button>`).join("");
    host.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        if (state === "conflict") {
          state = "default";
          app.dataset.state = "default";
          conflictBanner.hidden = true;
          document.querySelectorAll(".demo-controls [data-state]").forEach(control => control.classList.toggle("is-current", control.dataset.state === state));
        }
        draft[key] = Number(button.dataset.value);
        updateDraft();
      });
      button.addEventListener("keydown", event => {
        const buttons = [...host.querySelectorAll("button")];
        let index = buttons.indexOf(event.currentTarget);
        if (event.key === "ArrowRight" || event.key === "ArrowDown") index = Math.min(3, index + 1);
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") index = Math.max(0, index - 1);
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = 3;
        else return;
        event.preventDefault();
        buttons[index].focus(); buttons[index].click();
      });
    });
  }

  function updateDraft() {
    const total = paneTotal(draft);
    const oldTotal = paneTotal(current);
    rowOptions.querySelectorAll("button").forEach(button => button.classList.toggle("is-selected", Number(button.dataset.value) === draft.rows));
    columnOptions.querySelectorAll("button").forEach(button => button.classList.toggle("is-selected", Number(button.dataset.value) === draft.columns));
    currentLayoutCopy.textContent = `Current ${pretty(current)}`;
    draftLayoutCopy.textContent = `Draft ${pretty(draft)}`;
    topologyLabel.textContent = `${draft.rows} × ${draft.columns}`;
    paneCount.textContent = `${total} pane${total === 1 ? "" : "s"}`;
    preview.style.setProperty("--pr", draft.rows);
    preview.style.setProperty("--pc", draft.columns);
    preview.innerHTML = Array.from({ length: total }, () => "<span></span>").join("");
    const preserved = Math.min(oldTotal, total);
    preserveCopy.textContent = preserved === 1 ? "Pane 1 keeps its ID, type, and bindings." : `Panes 1–${preserved} keep IDs, types, and bindings.`;
    dropWarning.hidden = total >= oldTotal;
    if (total < oldTotal) {
      const firstDropped = total + 1;
      dropCopy.textContent = `Panes ${firstDropped}${oldTotal > firstDropped ? `–${oldTotal}` : ""} are the ordered suffix and will be dropped.${activePane > total ? " Active pane falls back to Pane 1." : ""}`;
    }
    const changed = draft.rows !== current.rows || draft.columns !== current.columns;
    applyButton.disabled = !changed || applying || state === "conflict";
    applyButton.textContent = applying ? "Applying…" : "Apply";
    [...rowOptions.querySelectorAll("button"), ...columnOptions.querySelectorAll("button"), cancelButton, closeButton].forEach(control => control.disabled = applying);
  }

  function positionPopover() {
    if (!popoverOpen) return;
    popover.style.visibility = "hidden";
    popover.style.left = "0px"; popover.style.top = "0px";
    const a = layoutTrigger.getBoundingClientRect();
    const p = popover.getBoundingClientRect();
    const margin = 8, gap = 6;
    let left = a.right - p.width;
    let top = a.bottom + gap;
    if (top + p.height > innerHeight - margin) top = a.top - p.height - gap;
    left = Math.max(margin, Math.min(left, innerWidth - p.width - margin));
    top = Math.max(margin, Math.min(top, innerHeight - p.height - margin));
    popover.style.left = `${Math.round(left)}px`; popover.style.top = `${Math.round(top)}px`;
    popover.style.visibility = "visible";
  }

  function openPopover(mode = "draft") {
    if (state === "disabled") return;
    lastFocused = document.activeElement;
    popoverOpen = true;
    popover.hidden = false;
    layoutTrigger.setAttribute("aria-expanded", "true");
    conflictBanner.hidden = state !== "conflict";
    applyError.hidden = state !== "error";
    if (mode === "draft" && state !== "conflict" && state !== "warning") {
      draft = { rows: Math.min(4, current.rows + 1), columns: current.columns };
    }
    updateDraft();
    requestAnimationFrame(() => { positionPopover(); rowOptions.querySelector("button.is-selected")?.focus(); });
    popoverSelect.value = "open";
  }

  function closePopover(restoreFocus = true) {
    if (applying) return;
    draft = { ...current };
    popoverOpen = false;
    popover.hidden = true;
    layoutTrigger.setAttribute("aria-expanded", "false");
    popoverSelect.value = "none";
    if (restoreFocus) (lastFocused || layoutTrigger).focus();
  }

  function applyDraft() {
    if (applyButton.disabled) return;
    applying = true; updateDraft();
    setTimeout(() => {
      current = { ...draft };
      if (activePane > paneTotal(current)) activePane = 1;
      applying = false;
      closePopover(false);
      renderAll();
      showToast("success", `Layout ${pretty(current)} applied.`);
      layoutTrigger.focus();
    }, 650);
  }

  function showToast(kind, copy) {
    toast.className = `toast${kind === "success" ? "" : ` is-${kind}`}`;
    toast.querySelector(".toast-icon").textContent = kind === "success" ? "✓" : kind === "warning" ? "!" : "×";
    toastCopy.textContent = copy;
    toast.hidden = false;
  }

  function resetStateVisuals() {
    toast.hidden = true;
    popover.hidden = true;
    popoverOpen = false;
    applying = false;
    layoutTrigger.setAttribute("aria-expanded", "false");
    layoutTrigger.classList.remove("is-demo-hovered", "is-demo-focused");
    app.classList.remove("is-disabled");
    document.querySelector(".layout-stage").classList.remove("is-disabled-surface");
    document.querySelectorAll(".display-settings input,.display-settings select,.display-settings button").forEach(el => el.disabled = false);
  }

  function applyState(next) {
    resetStateVisuals();
    state = next;
    app.dataset.state = state;
    if (state === "warning") { current = { rows: 4, columns: 4 }; draft = { rows: 2, columns: 2 }; activePane = 14; }
    if (state === "conflict") { current = { rows: 2, columns: 2 }; draft = { ...current }; activePane = 2; }
    if (state === "empty") activePane = Math.min(2, paneTotal(current));
    renderAll();
    if (state === "hover") layoutTrigger.classList.add("is-demo-hovered");
    if (state === "focus") { layoutTrigger.classList.add("is-demo-focused"); openPopover("draft"); }
    if (state === "active") activePane = Math.min(4, paneTotal(current));
    if (state === "disabled") {
      app.classList.add("is-disabled"); document.querySelector(".layout-stage").classList.add("is-disabled-surface");
      document.querySelectorAll(".display-settings input,.display-settings select,.display-settings button").forEach(el => el.disabled = true);
    }
    if (state === "loading") {
      document.querySelectorAll(".display-settings input,.display-settings select,.display-settings button").forEach(el => el.disabled = true);
    }
    if (state === "warning" || state === "conflict") openPopover("fixed");
    if (state === "success") showToast("success", `Layout ${pretty(current)} applied. Pane IDs were preserved.`);
    if (state === "error") { showToast("error", "Pane 3 plot could not be rendered."); }
    renderAll();
    document.querySelectorAll(".demo-controls [data-state]").forEach(button => button.classList.toggle("is-current", button.dataset.state === state));
  }

  function renderAll() {
    renderPanes();
    if (popoverOpen) { updateDraft(); requestAnimationFrame(positionPopover); }
    document.querySelectorAll(".demo-controls [data-layout]").forEach(button => button.classList.toggle("is-current", button.dataset.layout === variant(current)));
  }

  makeDimensionButtons(rowOptions, "rows");
  makeDimensionButtons(columnOptions, "columns");

  layoutTrigger.addEventListener("click", () => popoverOpen ? closePopover() : openPopover("draft"));
  cancelButton.addEventListener("click", () => closePopover());
  closeButton.addEventListener("click", () => closePopover());
  applyButton.addEventListener("click", applyDraft);
  toast.querySelector("button").addEventListener("click", () => { toast.hidden = true; });
  settingsType.addEventListener("change", () => { paneData[activePane - 1].type = settingsType.value; renderAll(); });
  allSignals.addEventListener("change", () => { paneData[activePane - 1].bindings = allSignals.checked ? signals.map(s => s.id) : []; renderAll(); });
  document.querySelector(".demo-close").addEventListener("click", () => { demoControls.hidden = true; });

  document.querySelectorAll(".demo-controls [data-layout]").forEach(button => button.addEventListener("click", () => {
    const [rows, columns] = button.dataset.layout.split("x").map(Number);
    current = { rows, columns }; draft = { ...current }; activePane = paneTotal(current) === 1 ? 1 : Math.min(2, paneTotal(current));
    state = "default"; applyState("default"); updateUrl();
  }));
  document.querySelectorAll(".demo-controls [data-state]").forEach(button => button.addEventListener("click", () => { applyState(button.dataset.state); updateUrl(); }));
  popoverSelect.addEventListener("change", () => { popoverSelect.value === "open" ? openPopover("draft") : closePopover(); updateUrl(); });

  function updateUrl() {
    query.set("layout", variant(current)); query.set("state", state); query.set("popover", popoverOpen ? "open" : "none");
    history.replaceState(null, "", `${location.pathname}?${query.toString()}`);
  }

  document.addEventListener("keydown", event => {
    if (!popoverOpen) return;
    if (event.key === "Escape") { event.preventDefault(); closePopover(); return; }
    if (event.key === "Tab") {
      const focusable = [...popover.querySelectorAll("button:not(:disabled)")];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener("pointerdown", event => {
    if (popoverOpen && !popover.contains(event.target) && !layoutTrigger.contains(event.target)) closePopover();
  });
  window.addEventListener("resize", positionPopover);
  window.addEventListener("scroll", positionPopover, true);

  const initialLayout = /^(1x1|2x2|4x4)$/.test(query.get("layout") || "") ? query.get("layout") : "2x2";
  const [initialRows, initialColumns] = initialLayout.split("x").map(Number);
  current = { rows: initialRows, columns: initialColumns }; draft = { ...current };
  activePane = paneTotal(current) === 1 ? 1 : 2;
  if (query.get("chrome") === "0") document.body.classList.add("capture-mode");
  const validStates = ["default","hover","focus","active","disabled","loading","empty","error","warning","success","conflict"];
  applyState(validStates.includes(query.get("state")) ? query.get("state") : "default");
  if (query.get("popover") === "open" && !popoverOpen) openPopover("draft");
})();
