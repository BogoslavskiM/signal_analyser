(function registerSignalColorPicker(window, document) {
  "use strict";

  var palette = [
    "#2563eb", "#dc2626", "#16a34a", "#9333ea",
    "#ea580c", "#0891b2", "#ca8a04", "#db2777"
  ];
  var picker = null;
  var trigger = null;
  var sourceInput = null;
  var initialColor = "#2166df";
  var busy = false;
  var errorMessage = "";

  function normalize(value) {
    var raw = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    if (/^[0-9a-f]{6}$/i.test(raw)) return ("#" + raw).toLowerCase();
    return "";
  }

  function tickAsset() {
    var base = window.SignalAnalyserUIBase || (window.SignalAnalyserUIDesign && window.SignalAnalyserUIDesign.assetBase) || ".";
    return String(base).replace(/\/$/, "") + "/icons/tick-figma.svg";
  }

  function colorFrom(control, input) {
    var direct = normalize(input && input.value);
    if (direct) return direct;
    var chip = control && control.querySelector("i");
    return normalize(chip && (chip.style.getPropertyValue("--signal-color") || chip.style.backgroundColor)) || "#2166df";
  }

  function swatches() {
    return palette.map(function (color) {
      var light = color === "#ca8a04";
      return "<button class='signal-color-picker-swatch' type='button' role='option' data-color='" + color + "' data-light='" + light + "' aria-label='Цвет " + color + "' aria-selected='false' style='--palette-color:" + color + "'><img src='" + tickAsset() + "' alt=''></button>";
    }).join("");
  }

  function markup() {
    return "<section class='signal-color-picker' role='dialog' aria-modal='false' aria-labelledby='signal-color-picker-title' data-testid='signal-color-picker' data-invalid='false' data-busy='false' hidden>" +
      "<div class='signal-color-picker-body'>" +
        "<h3 class='signal-color-picker-title' id='signal-color-picker-title'>Цвет сигнала</h3>" +
        "<label class='signal-color-picker-hex-label'><span>HEX</span><span class='signal-color-picker-hex-control'><i class='signal-color-picker-current' aria-hidden='true'></i><input class='signal-color-picker-hex' data-testid='signal-color-picker-hex' maxlength='7' spellcheck='false' autocomplete='off' aria-describedby='signal-color-picker-error'></span></label>" +
        "<p class='signal-color-picker-error' id='signal-color-picker-error' role='alert'></p>" +
        "<p class='signal-color-picker-section-title'>Палитра</p>" +
        "<div class='signal-color-picker-palette' role='listbox' aria-label='Палитра'>" + swatches() + "</div>" +
      "</div>" +
      "<footer class='signal-color-picker-footer'>" +
        "<button class='signal-color-picker-action' type='button' data-color-picker-cancel>Отмена</button>" +
        "<button class='signal-color-picker-action is-primary' type='button' data-color-picker-apply data-testid='signal-color-picker-apply'>Применить</button>" +
      "</footer>" +
    "</section>";
  }

  function ensure() {
    if (!picker) {
      document.body.insertAdjacentHTML("beforeend", markup());
      picker = document.querySelector("[data-testid='signal-color-picker']");
    }
    return picker;
  }

  function provider() { return window.SignalColorPickerProvider || {}; }

  function preview(color, source) {
    picker.style.setProperty("--draft-color", color || initialColor);
    var chip = trigger && trigger.querySelector("i");
    if (chip) {
      chip.style.background = color || initialColor;
      chip.style.setProperty("--signal-color", color || initialColor);
    }
    if (typeof provider().preview === "function") provider().preview({ color:color || initialColor, source:source || "picker" });
  }

  function render() {
    var input = picker.querySelector("[data-testid='signal-color-picker-hex']");
    var valid = !!normalize(input.value);
    var message = valid ? errorMessage : "Введите HEX в формате #RRGGBB.";
    picker.dataset.invalid = String(!!message);
    picker.dataset.busy = String(busy);
    picker.querySelector("[data-color-picker-apply]").disabled = !valid || busy;
    picker.querySelector("[data-color-picker-cancel]").disabled = busy;
    picker.querySelector(".signal-color-picker-error").textContent = message;
    picker.querySelectorAll("[data-color]").forEach(function (swatch) {
      var selected = valid && swatch.dataset.color === normalize(input.value);
      swatch.classList.toggle("is-selected", selected);
      swatch.setAttribute("aria-selected", String(selected));
      swatch.disabled = busy;
    });
  }

  function position() {
    if (!picker || picker.hidden || !trigger) return;
    var rect = trigger.getBoundingClientRect();
    var left = Math.max(8, Math.min(window.innerWidth - picker.offsetWidth - 8, rect.right - picker.offsetWidth));
    var below = rect.bottom + 6;
    var top = below + picker.offsetHeight <= window.innerHeight - 8 ? below : rect.top - picker.offsetHeight - 6;
    picker.style.left = left + "px";
    picker.style.top = Math.max(8, Math.min(window.innerHeight - picker.offsetHeight - 8, top)) + "px";
  }

  function close(commit) {
    if (!picker || picker.hidden || busy) return;
    if (!commit) {
      preview(initialColor, "cancel");
      if (typeof provider().cancel === "function") provider().cancel({ color:initialColor });
    }
    picker.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    var restore = trigger;
    trigger = null;
    sourceInput = null;
    window.requestAnimationFrame(function () { if (restore && restore.isConnected) restore.focus(); });
  }

  function open(control, input) {
    ensure();
    if (!picker.hidden && trigger === control) return close(false);
    if (!picker.hidden) close(false);
    trigger = control;
    sourceInput = input;
    initialColor = colorFrom(control, input);
    busy = false;
    errorMessage = "";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "true");
    picker.hidden = false;
    var hex = picker.querySelector("[data-testid='signal-color-picker-hex']");
    hex.value = initialColor;
    preview(initialColor, "open");
    render();
    position();
    window.requestAnimationFrame(function () { hex.focus(); hex.select(); });
  }

  function commit() {
    var color = normalize(picker.querySelector("[data-testid='signal-color-picker-hex']").value);
    if (!color || busy) return;
    busy = true;
    errorMessage = "";
    render();
    Promise.resolve(typeof provider().commit === "function" ? provider().commit({ color:color, input:sourceInput, trigger:trigger }) : null).then(function () {
      if (sourceInput) {
        sourceInput.value = color;
        sourceInput.dispatchEvent(new Event("input", { bubbles:true }));
      }
      initialColor = color;
      busy = false;
      close(true);
    }).catch(function () {
      busy = false;
      errorMessage = "Не удалось применить цвет.";
      render();
    });
  }

  document.addEventListener("click", function (event) {
    var control = event.target.closest("[data-signal-color-trigger], .settings-panel .color-swatch-button");
    var input = event.target.closest("[data-signal-color-input], [data-signal-metadata='color']");
    if (control || input) {
      event.preventDefault();
      event.stopPropagation();
      var row = (control || input).closest(".color-field") || (control || input).parentElement;
      return open(control || row.querySelector(".color-swatch-button") || input, input || row.querySelector("[data-signal-color-input], [data-signal-metadata='color']"));
    }
    if (!picker || picker.hidden) return;
    var swatch = event.target.closest("[data-color]");
    if (swatch) {
      var hex = picker.querySelector("[data-testid='signal-color-picker-hex']");
      hex.value = swatch.dataset.color;
      errorMessage = "";
      preview(swatch.dataset.color, "palette");
      return render();
    }
    if (event.target.closest("[data-color-picker-cancel]")) return close(false);
    if (event.target.closest("[data-color-picker-apply]")) return commit();
    if (!event.target.closest("[data-testid='signal-color-picker']")) close(false);
  }, true);

  document.addEventListener("input", function (event) {
    if (!event.target.matches("[data-testid='signal-color-picker-hex']")) return;
    errorMessage = "";
    var color = normalize(event.target.value);
    if (color) preview(color, "hex");
    render();
  });
  document.addEventListener("keydown", function (event) {
    if (!picker || picker.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); close(false); }
    if (event.key === "Enter" && event.target.matches("[data-testid='signal-color-picker-hex']")) { event.preventDefault(); commit(); }
  }, true);
  window.addEventListener("resize", position);
  document.addEventListener("scroll", position, true);

  window.SignalColorPickerUI = { open:open, close:close, palette:palette.slice() };
}(window, document));
