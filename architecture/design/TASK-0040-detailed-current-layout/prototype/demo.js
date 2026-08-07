(() => {
  const root = document.querySelector("[data-demo-root]");
  const stateButtons = Array.from(document.querySelectorAll("[data-demo-state]"));
  const overlaySelect = document.querySelector("[data-demo-overlay]");
  const controls = document.querySelector(".demo-controls");
  const closeControls = document.querySelector(".demo-controls-close");
  const query = new URLSearchParams(window.location.search);

  const refs = {
    displayMenu: document.querySelector(".display-overflow-menu"),
    displayTrigger: document.querySelector(".display-menu-trigger"),
    addMenu: document.querySelector(".signals-add-menu"),
    addTrigger: document.querySelector(".signals-add-trigger"),
    columnsMenu: document.querySelector(".signal-columns-menu"),
    columnsTrigger: document.querySelector(".columns-menu-trigger"),
    infoPopover: document.querySelector(".signal-info-card"),
    infoTrigger: document.querySelector(".signal-info-trigger"),
    enumMenu: document.querySelector(".settings-enum-options"),
    enumInput: document.querySelector("#view-combobox"),
    tooltip: document.querySelector(".toolbar-tooltip"),
    tooltipTrigger: document.querySelector(".toolbar-import"),
    sessionDialog: document.querySelector(".session-dialog-overlay"),
    workspaceDialog: document.querySelector(".workspace-dialog-overlay"),
    deleteDialog: document.querySelector(".delete-dialog-overlay"),
    successDialog: document.querySelector(".success-dialog-overlay"),
    toast: document.querySelector(".app-toast"),
    toastCopy: document.querySelector(".toast-copy"),
    toastIcon: document.querySelector(".toast-icon"),
    firstRow: document.querySelector(".signal-row"),
    rows: document.querySelector(".signal-rows"),
    emptyRows: document.querySelector(".signals-empty"),
    signalCount: document.querySelector(".bottom-tab.is-active span"),
    toggleAll: document.querySelector(".signal-table thead input"),
    plotLoading: document.querySelector(".plot-loading"),
    plotEmpty: document.querySelector(".plot-empty"),
    plotError: document.querySelector(".plot-error"),
    plotWarning: document.querySelector(".plot-warning"),
    fieldError: document.querySelector(".field-error"),
    fieldWarning: document.querySelector(".field-warning"),
    fieldSuccess: document.querySelector(".field-success"),
    timeMin: document.querySelector(".time-min"),
    timeMax: document.querySelector(".settings-range label:nth-of-type(2) input"),
    permanentHelp: document.querySelector(".toolbar-actions .icon-button:last-of-type")
  };

  const transientControls = Array.from(document.querySelectorAll(
    ".plot-type-control select, .display-settings input, .display-settings button, .signals-add-trigger, .signal-row-actions button, .signal-info-trigger"
  ));

  const anchoredSurfaces = [
    refs.displayMenu,
    refs.addMenu,
    refs.columnsMenu,
    refs.infoPopover,
    refs.enumMenu,
    refs.tooltip
  ];

  const dialogSurfaces = [
    refs.sessionDialog,
    refs.workspaceDialog,
    refs.deleteDialog,
    refs.successDialog
  ];

  function hide(node) {
    if (node) node.hidden = true;
  }

  function show(node) {
    if (node) node.hidden = false;
  }

  function clearPosition(node) {
    if (!node) return;
    node.style.left = "";
    node.style.top = "";
    node.style.visibility = "";
  }

  function place(anchor, surface, options = {}) {
    if (!anchor || !surface) return;
    const side = options.side || "bottom";
    const align = options.align || "end";
    const gap = options.gap == null ? 6 : options.gap;
    const margin = 8;

    surface.hidden = false;
    surface.style.visibility = "hidden";
    surface.style.left = "0px";
    surface.style.top = "0px";

    const anchorRect = anchor.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    let resolvedSide = side;
    let top = side === "top"
      ? anchorRect.top - surfaceRect.height - gap
      : anchorRect.bottom + gap;

    if (side === "top" && top < margin) {
      resolvedSide = "bottom";
      top = anchorRect.bottom + gap;
    } else if (side === "bottom" && top + surfaceRect.height > window.innerHeight - margin) {
      resolvedSide = "top";
      top = anchorRect.top - surfaceRect.height - gap;
    }

    let left = align === "start"
      ? anchorRect.left
      : anchorRect.right - surfaceRect.width;

    left = Math.min(Math.max(left, margin), window.innerWidth - surfaceRect.width - margin);
    top = Math.min(Math.max(top, margin), window.innerHeight - surfaceRect.height - margin);

    surface.dataset.resolvedSide = resolvedSide;
    surface.style.left = `${Math.round(left)}px`;
    surface.style.top = `${Math.round(top)}px`;
    surface.style.visibility = "visible";
  }

  function resetVisuals() {
    anchoredSurfaces.forEach((node) => {
      hide(node);
      clearPosition(node);
    });
    dialogSurfaces.forEach(hide);
    [refs.plotLoading, refs.plotEmpty, refs.plotError, refs.plotWarning].forEach(hide);
    [refs.fieldError, refs.fieldWarning, refs.fieldSuccess].forEach(hide);
    hide(refs.toast);

    refs.toast.className = "app-toast";
    refs.toastIcon.className = "toast-icon";
    refs.toastIcon.textContent = "";
    refs.firstRow.classList.remove("is-demo-hovered", "is-demo-focused");
    refs.tooltipTrigger.classList.remove("is-demo-hovered");
    refs.displayTrigger.classList.remove("is-demo-active");
    refs.enumInput.classList.remove("is-demo-focused");
    refs.timeMin.classList.remove("is-demo-focused", "has-error");
    refs.timeMax.classList.remove("has-warning", "has-success");
    refs.enumMenu.querySelectorAll("button").forEach((button) => button.classList.remove("is-demo-focused"));

    refs.rows.hidden = false;
    refs.emptyRows.hidden = true;
    refs.signalCount.textContent = "4 signals";
    refs.toggleAll.checked = true;
    transientControls.forEach((control) => {
      control.disabled = false;
      control.removeAttribute("aria-busy");
    });
    refs.permanentHelp.disabled = true;
    refs.enumInput.setAttribute("aria-expanded", "false");
  }

  function showToast(kind, copy) {
    refs.toast.classList.add(`is-${kind}`);
    refs.toastCopy.textContent = copy;
    refs.toastIcon.textContent = kind === "loading" ? "" : kind === "success" ? "✓" : kind === "warning" ? "!" : "×";
    if (kind === "loading") refs.toastIcon.className = "toast-icon spinner";
    show(refs.toast);
  }

  function applyState(state) {
    resetVisuals();
    root.dataset.state = state;
    stateButtons.forEach((button) => {
      button.classList.toggle("is-current", button.dataset.demoState === state);
    });

    switch (state) {
      case "hover":
        refs.firstRow.classList.add("is-demo-hovered");
        refs.tooltipTrigger.classList.add("is-demo-hovered");
        requestAnimationFrame(() => {
          place(refs.infoTrigger, refs.infoPopover, { side: "top", align: "end" });
          place(refs.tooltipTrigger, refs.tooltip, { side: "bottom", align: "end", gap: 8 });
        });
        break;
      case "focus":
        refs.enumInput.classList.add("is-demo-focused");
        refs.enumInput.setAttribute("aria-expanded", "true");
        refs.enumMenu.querySelector("button").classList.add("is-demo-focused");
        requestAnimationFrame(() => place(refs.enumInput, refs.enumMenu, { side: "bottom", align: "end", gap: 4 }));
        break;
      case "active":
        refs.displayTrigger.classList.add("is-demo-active");
        requestAnimationFrame(() => place(refs.displayTrigger, refs.displayMenu, { side: "bottom", align: "end", gap: 4 }));
        break;
      case "disabled":
        transientControls.forEach((control) => { control.disabled = true; });
        break;
      case "loading":
        show(refs.plotLoading);
        transientControls.forEach((control) => {
          control.disabled = true;
          control.setAttribute("aria-busy", "true");
        });
        showToast("loading", "Обновление данных Display…");
        break;
      case "empty":
        refs.rows.hidden = true;
        refs.emptyRows.hidden = false;
        refs.signalCount.textContent = "0 signals";
        refs.toggleAll.checked = false;
        show(refs.plotEmpty);
        break;
      case "error":
        show(refs.plotError);
        refs.timeMin.classList.add("has-error");
        show(refs.fieldError);
        showToast("error", "Не удалось применить настройки Display.");
        break;
      case "warning":
        show(refs.plotWarning);
        refs.timeMax.classList.add("has-warning");
        show(refs.fieldWarning);
        showToast("warning", "Проверьте диапазон времени перед продолжением.");
        break;
      case "success":
        refs.timeMax.classList.add("has-success");
        show(refs.fieldSuccess);
        showToast("success", "Сессия сохранена. Все изменения применены.");
        break;
      default:
        break;
    }
  }

  function applyOverlay(overlay) {
    dialogSurfaces.forEach(hide);
    if (overlay !== "display-menu" && root.dataset.state !== "active") hide(refs.displayMenu);
    if (overlay !== "add-menu") hide(refs.addMenu);
    if (overlay !== "columns-menu") hide(refs.columnsMenu);
    if (overlay !== "info-popover" && root.dataset.state !== "hover") hide(refs.infoPopover);

    switch (overlay) {
      case "display-menu":
        requestAnimationFrame(() => place(refs.displayTrigger, refs.displayMenu, { side: "bottom", align: "end", gap: 4 }));
        break;
      case "add-menu":
        requestAnimationFrame(() => place(refs.addTrigger, refs.addMenu, { side: "bottom", align: "end", gap: 4 }));
        break;
      case "columns-menu":
        requestAnimationFrame(() => place(refs.columnsTrigger, refs.columnsMenu, { side: "bottom", align: "end", gap: 4 }));
        break;
      case "info-popover":
        requestAnimationFrame(() => place(refs.infoTrigger, refs.infoPopover, { side: "top", align: "end", gap: 6 }));
        break;
      case "session-dialog": show(refs.sessionDialog); break;
      case "workspace-dialog": show(refs.workspaceDialog); break;
      case "delete-dialog": show(refs.deleteDialog); break;
      case "success-dialog": show(refs.successDialog); break;
      default: break;
    }
  }

  function setState(state, updateUrl = false) {
    const valid = stateButtons.some((button) => button.dataset.demoState === state);
    const next = valid ? state : "default";
    applyState(next);
    applyOverlay(overlaySelect.value);
    if (updateUrl) {
      query.set("state", next);
      query.set("overlay", overlaySelect.value);
      history.replaceState(null, "", `${location.pathname}?${query.toString()}`);
    }
  }

  function setOverlay(overlay, updateUrl = false) {
    overlaySelect.value = Array.from(overlaySelect.options).some((option) => option.value === overlay) ? overlay : "none";
    applyState(root.dataset.state || "default");
    applyOverlay(overlaySelect.value);
    if (updateUrl) {
      query.set("state", root.dataset.state || "default");
      query.set("overlay", overlaySelect.value);
      history.replaceState(null, "", `${location.pathname}?${query.toString()}`);
    }
  }

  stateButtons.forEach((button) => {
    button.addEventListener("click", () => setState(button.dataset.demoState, true));
  });

  overlaySelect.addEventListener("change", () => setOverlay(overlaySelect.value, true));
  closeControls.addEventListener("click", () => { controls.hidden = true; });

  document.querySelectorAll(".dialog-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) setOverlay("none", true);
    });
  });

  document.querySelectorAll(".dialog-close, .dialog-actions button").forEach((button) => {
    button.addEventListener("click", () => setOverlay("none", true));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOverlay("none", true);
  });

  window.addEventListener("resize", () => {
    applyState(root.dataset.state || "default");
    applyOverlay(overlaySelect.value);
  });

  if (query.get("chrome") === "0") document.body.classList.add("capture-mode");
  overlaySelect.value = query.get("overlay") || "none";
  setState(query.get("state") || "default");
})();
