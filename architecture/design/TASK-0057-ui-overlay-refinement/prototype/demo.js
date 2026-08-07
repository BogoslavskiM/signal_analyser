(function () {
  "use strict";

  var PLOT_OPTIONS = [
    { value: "time", label: "Временная область" },
    { value: "spectrum", label: "Спектр" },
    { value: "spectrogram", label: "Спектрограмма" },
    { value: "persistence", label: "Спектр персистентности" }
  ];

  var PANE_ORDER = ["pane-time", "pane-spectrum", "pane-spectrogram", "pane-persistence"];
  var COLUMN_DEFINITIONS = [
    { id: "name", label: "Имя", width: "28%" },
    { id: "color", label: "Цвет" },
    { id: "sample_rate", label: "Частота дискретизации" },
    { id: "samples", label: "Отсчёты" },
    { id: "duration", label: "Длительность" },
    { id: "type", label: "Тип" }
  ];
  var SIGNALS = [
    { name: "radarPulse", color_name: "Синий", color_token: "accent", sample_rate: "1 MHz", samples: "12 000", duration: "12 ms", type: "Временной ряд", visible: true },
    { name: "echoComplex", color_name: "Тёмный", color_token: "text", sample_rate: "1 MHz", samples: "8 192", duration: "8,19 ms", type: "Комплексный массив", visible: true },
    { name: "referenceWave", color_name: "Светло-голубой", color_token: "accent-soft", sample_rate: "500 kHz", samples: "6 000", duration: "12 ms", type: "Временной ряд", visible: false },
    { name: "noiseFloor", color_name: "Охра", color_token: "warning", sample_rate: "500 kHz", samples: "6 000", duration: "12 ms", type: "Временной ряд с очень длинным описанием для проверки крайней ячейки", visible: true }
  ];

  var state = {
    activePane: "pane-time",
    paneTypes: {
      "pane-time": "time",
      "pane-spectrum": "spectrum",
      "pane-spectrogram": "spectrogram",
      "pane-persistence": "persistence"
    },
    settingsPage: "display",
    inspectorPage: "signals",
    visibleColumns: ["name", "color", "sample_rate", "samples", "duration", "type"],
    search: "",
    busy: false,
    errors: {},
    plotStatus: {},
    values: {
      "display.show_legend": true,
      "time.normalize_y": false,
      "time.show_markers": false,
      "time.units": "seconds",
      "time.link_time": false,
      "spectrum.frequency_units": "hertz",
      "spectrum.frequency_scale": "linear",
      "spectrum.scale": true,
      "spectrum.resolution_type": "leakage",
      "spectrum.leakage": "0.5",
      "spectrum.rbw": "100",
      "spectrum.window_length": "1024",
      "spectrum.window": "hamming",
      "spectrum.sidelobe_attenuation_db": "60",
      "spectrum.overlap_percent": "50",
      "spectrum.nfft": "2048",
      "spectrogram.time_units": "seconds",
      "spectrogram.frequency_units": "hertz",
      "spectrogram.frequency_scale": "linear",
      "spectrogram.scale": true,
      "spectrogram.leakage": "0.5",
      "spectrogram.time_resolution": "0.001",
      "spectrogram.overlap_percent": "50",
      "spectrogram.reassign": false,
      "persistence.time_units": "seconds",
      "persistence.frequency_units": "hertz",
      "persistence.frequency_scale": "linear",
      "persistence.scale": true,
      "persistence.leakage": "0.5",
      "persistence.time_resolution": "0.001",
      "persistence.overlap_percent": "50",
      "persistence.power_bins": "256",
      "measurement.minimum": true,
      "measurement.maximum": true,
      "measurement.mean": true,
      "measurement.median": false,
      "measurement.peak_to_peak": false,
      "measurement.rms": false,
      "peaks_enabled": false
    },
    ranges: {
      "time.x_limits": ["0", "0.2495"],
      "time.y_limits": ["", ""],
      "spectrum.frequency_limits": ["0", "500000"],
      "spectrum.y_limits": ["", ""],
      "spectrogram.frequency_limits": ["0", "500000"],
      "spectrogram.power_limits": ["-120", "0"],
      "persistence.frequency_limits": ["0", "500000"],
      "persistence.power_limits": ["-120", "0"],
      "persistence.density_limits": ["0", "100"]
    },
    resolutionModes: {
      "spectrum.rbw": "auto",
      "spectrum.window_length": "auto",
      "spectrum.nfft": "auto",
      "spectrogram.time_resolution": "auto",
      "persistence.time_resolution": "auto",
      "persistence.power_bins": "auto"
    },
    layoutRows: 1,
    layoutColumns: 2,
    appliedRows: 1,
    appliedColumns: 2,
    confirmMode: null,
    restoreTarget: null,
    tooltipTarget: null,
    tooltipLocked: false,
    suppressTooltipUntil: 0,
    selectContext: null,
    displayCount: 1,
    rowActionBusy: null,
    activePlotMenuPane: null,
    graphHelpPane: null,
    graphHelpRestoreTarget: null,
    screenDeleteTarget: null,
    screenDeleteShell: null
  };

  var app = document.querySelector("[data-design-id='app-shell']");
  var plotGrid = document.querySelector("[data-design-id='plot-grid']");
  var settingsContent = document.querySelector("[data-settings-content]");
  var settingsStatus = document.querySelector("[data-settings-status]");
  var settingsApply = document.querySelector("[data-design-id='settings-apply']");
  var selectMenu = document.querySelector("[data-design-id='select-menu']");
  var plotMenu = document.querySelector("[data-design-id='plot-menu']");
  var inspectorMenu = document.querySelector("[data-design-id='inspector-menu']");
  var overflowTrigger = document.querySelector("[data-design-id='signals-overflow']");
  var addTrigger = document.querySelector("[data-design-id='signals-add']");
  var displayAddTrigger = document.querySelector("[data-design-id='display-add']");
  var displayTablist = document.querySelector("[data-design-id='display-tablist']");
  var displayScrollLeft = document.querySelector("[data-design-id='display-scroll-left']");
  var displayScrollRight = document.querySelector("[data-design-id='display-scroll-right']");
  var layoutTrigger = document.querySelector("[data-design-id='layout-trigger']");
  var layoutPopover = document.querySelector("[data-design-id='layout-popover']");
  var toast = document.querySelector("[data-design-id='success-toast']");
  var tooltip = document.querySelector("[data-design-id='tooltip']");
  var graphHelp = document.querySelector("[data-design-id='graph-help']");
  var addLayer = document.querySelector("[data-design-id='add-dialog-layer']");
  var nestedLayer = document.querySelector("[data-design-id='nested-confirm-layer']");
  var screenDeleteLayer = document.querySelector("[data-design-id='screen-delete-layer']");
  var screenDeleteTitle = screenDeleteLayer.querySelector("#screen-delete-title");
  var screenDeleteCopy = screenDeleteLayer.querySelector("#screen-delete-copy");
  var screenDeleteConfirm = screenDeleteLayer.querySelector("[data-screen-delete-confirm]");
  var addDialogCard = addLayer.querySelector(".dialog-card");
  var addClose = addLayer.querySelector("[data-add-close]");
  var addSubmit = addLayer.querySelector("[data-add-submit]");
  var confirmTitle = nestedLayer.querySelector("#confirm-title");
  var confirmCopy = nestedLayer.querySelector("#confirm-copy");
  var confirmStay = nestedLayer.querySelector("[data-confirm-stay]");
  var confirmLeave = nestedLayer.querySelector("[data-confirm-leave]");
  var pendingTimer = null;
  var plotRenderPromise = Promise.resolve();

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function plotLabel(value) {
    var option = PLOT_OPTIONS.find(function (item) { return item.value === value; });
    return option ? option.label : value;
  }

  function activePlotType() {
    return state.paneTypes[state.activePane];
  }

  function visiblePaneIds() {
    var count = state.appliedRows * state.appliedColumns;
    var ids = PANE_ORDER.slice(0, Math.min(PANE_ORDER.length, count));
    for (var index = ids.length; index < count; index += 1) ids.push("pane-" + (index + 1));
    ids.forEach(function (paneId, index) {
      if (!state.paneTypes[paneId]) state.paneTypes[paneId] = PLOT_OPTIONS[index % PLOT_OPTIONS.length].value;
    });
    return ids;
  }

  function plotMarkup(paneId, type) {
    return "<div class='plot-chart plotly-host' data-plotly-pane='" + escapeHtml(paneId) + "' data-plotly-type='" + escapeHtml(type) + "' role='application' aria-label='Интерактивный график: " + escapeHtml(plotLabel(type)) + "'></div>";
  }

  function plotlyData(type, colors) {
    var x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (type === "time") {
      return [
        { type: "scatter", mode: "lines", x: x, y: [0.1, 0.82, -0.28, 0.58, -0.12, 0.96, -0.42, 0.44, -0.18, 0.7, 0.08], line: { color: colors.accent, width: 2 }, hovertemplate: "t=%{x}<br>radarPulse=%{y:.2f}<extra></extra>" },
        { type: "scatter", mode: "lines", x: x, y: [-0.18, 0.12, -0.22, 0.24, -0.1, 0.18, -0.16, 0.22, -0.08, 0.14, -0.12], line: { color: colors.warning, width: 2 }, hovertemplate: "t=%{x}<br>echoComplex=%{y:.2f}<extra></extra>" }
      ];
    }
    if (type === "spectrum") {
      return [{ type: "scatter", mode: "lines", x: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500], y: [-82, -78, -70, -62, -48, -16, -52, -68, -76, -80, -84], fill: "tozeroy", fillcolor: colors.accentSoft, line: { color: colors.accent, width: 2 }, hovertemplate: "%{x} kHz<br>%{y} dB<extra></extra>" }];
    }
    var z = [
      [0.08, 0.14, 0.2, 0.36, 0.64, 0.92, 0.58, 0.3, 0.18, 0.1],
      [0.12, 0.2, 0.34, 0.6, 0.88, 0.72, 0.42, 0.24, 0.16, 0.08],
      [0.06, 0.12, 0.28, 0.52, 0.78, 0.94, 0.62, 0.32, 0.14, 0.06],
      [0.04, 0.1, 0.2, 0.4, 0.7, 0.84, 0.48, 0.22, 0.1, 0.04],
      [0.02, 0.06, 0.14, 0.3, 0.54, 0.68, 0.38, 0.18, 0.08, 0.02]
    ];
    return [{ type: "heatmap", x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], y: type === "spectrogram" ? [0, 125, 250, 375, 500] : [-100, -80, -60, -40, -20], z: z, showscale: false, colorscale: [[0, colors.surface], [0.35, colors.accentSoft], [0.7, colors.accent], [1, colors.accentActive]], hovertemplate: type === "spectrogram" ? "t=%{x}s<br>f=%{y}kHz<br>%{z:.2f}<extra></extra>" : "f=%{x}kHz<br>P=%{y}dB<br>%{z:.2f}<extra></extra>" }];
  }

  function renderInteractivePlots() {
    var rootStyle = getComputedStyle(document.documentElement);
    var colors = {
      accent: rootStyle.getPropertyValue("--accent").trim(),
      accentActive: rootStyle.getPropertyValue("--accent-active").trim(),
      accentSoft: rootStyle.getPropertyValue("--accent-soft").trim(),
      warning: rootStyle.getPropertyValue("--warning").trim(),
      surface: rootStyle.getPropertyValue("--surface").trim(),
      text: rootStyle.getPropertyValue("--text").trim(),
      muted: rootStyle.getPropertyValue("--muted").trim(),
      line: rootStyle.getPropertyValue("--line").trim()
    };
    var promises = Array.from(plotGrid.querySelectorAll("[data-plotly-pane]")).map(function (host) {
      var type = host.getAttribute("data-plotly-type");
      var heatmap = type === "spectrogram" || type === "persistence";
      var layout = {
        autosize: true,
        dragmode: "zoom",
        hovermode: "closest",
        showlegend: false,
        margin: { l: 42, r: 12, t: 12, b: 30, pad: 0 },
        paper_bgcolor: colors.surface,
        plot_bgcolor: colors.surface,
        font: { family: "Roboto, Arial, sans-serif", size: 10, color: colors.text },
        xaxis: { title: { text: heatmap ? (type === "spectrogram" ? "Время, s" : "Частота, kHz") : (type === "time" ? "Время, s" : "Частота, kHz"), standoff: 4 }, automargin: false, fixedrange: false, gridcolor: colors.line, linecolor: colors.muted, linewidth: 1, zeroline: false, tickfont: { size: 10 } },
        yaxis: { title: { text: type === "time" ? "Амплитуда" : type === "spectrum" ? "Мощность, dB" : type === "spectrogram" ? "Частота, kHz" : "Мощность, dB", standoff: 4 }, automargin: false, fixedrange: false, gridcolor: colors.line, linecolor: colors.muted, linewidth: 1, zeroline: false, tickfont: { size: 10 } }
      };
      var config = { displayModeBar: false, displaylogo: false, showTips: false, responsive: true, scrollZoom: false, doubleClick: "reset+autosize", doubleClickDelay: 300 };
      return Plotly.newPlot(host, plotlyData(type, colors), layout, config).then(function () {
        host.querySelectorAll(".modebar-container, .modebar").forEach(function (element) { element.remove(); });
        host.setAttribute("data-plotly-ready", "true");
      });
    });
    plotRenderPromise = Promise.all(promises);
    return plotRenderPromise;
  }

  function plotStatusMarkup(paneId) {
    var status = state.plotStatus[paneId];
    if (status === "loading") {
      return "<div class='plot-state-overlay' role='status'><span class='spinner' aria-hidden='true'></span><span>Обновление графика…</span></div>";
    }
    if (status === "empty") {
      return "<div class='plot-state-overlay' role='status'><strong>Нет видимых сигналов</strong><span>Добавьте сигнал или включите его видимость в таблице.</span></div>";
    }
    if (status === "error") {
      return "<div class='plot-state-overlay is-error' role='alert'><strong>График не обновлён</strong><span>Исправьте значения в настройках.</span></div>";
    }
    return "";
  }

  function renderPlots() {
    var paneIds = visiblePaneIds();
    if (paneIds.indexOf(state.activePane) < 0) state.activePane = paneIds[0];
    var largeLayout = state.appliedRows > 4 || state.appliedColumns > 4;
    var denseLayout = state.appliedRows > 2 || state.appliedColumns > 2;
    plotGrid.classList.toggle("is-large-layout", largeLayout);
    plotGrid.classList.toggle("is-dense-layout", denseLayout);
    plotGrid.style.gridTemplateColumns = "repeat(" + state.appliedColumns + ", minmax(" + (denseLayout ? "260px" : "0") + ", 1fr))";
    plotGrid.style.gridTemplateRows = "repeat(" + state.appliedRows + ", minmax(" + (denseLayout ? "170px" : "0") + ", 1fr))";
    layoutTrigger.querySelector("span:last-child").textContent = state.appliedRows + " × " + state.appliedColumns;
    plotGrid.innerHTML = paneIds.map(function (paneId, index) {
      var type = state.paneTypes[paneId];
      var active = paneId === state.activePane;
      var legend = state.values["display.show_legend"]
        ? "<div class='plot-legend' aria-label='Легенда: radarPulse — основной широкополосный сигнал" + (type === "time" ? ", echoComplex — опорный комплексный сигнал" : "") + "'><span><i></i><b>radarPulse — основной широкополосный сигнал</b></span>" + (type === "time" ? "<span><i></i><b>echoComplex — опорный комплексный сигнал</b></span>" : "") + "</div>"
        : "";
      return "<section class='plot-pane" + (active ? " is-active" : "") + "' tabindex='0' data-pane-id='" + paneId + "' data-design-id='" + paneId + "' aria-label='Область " + (index + 1) + ", " + escapeHtml(plotLabel(type)) + (active ? ", активная" : "") + "'>" +
        "<header class='plot-pane-header'><span class='plot-pane-title'>Область " + (index + 1) + "</span>" +
        "<div class='plot-control-cluster'>" + selectButton("plot:" + paneId, type, PLOT_OPTIONS, "pane-select", "Тип графика области " + (index + 1), "plot-type-" + paneId) +
        "<button class='plot-more' type='button' data-plot-menu-trigger='" + paneId + "' aria-label='Действия области " + (index + 1) + "' aria-haspopup='menu' aria-expanded='false'><img src='../assets/icons/more-vertical.svg' alt=''></button></div></header>" +
        "<div class='plot-canvas' aria-label='График области " + (index + 1) + "'>" + plotMarkup(paneId, type) + legend + plotStatusMarkup(paneId) + "</div></section>";
    }).join("");

    plotGrid.querySelectorAll(".plot-pane").forEach(function (pane) {
      pane.addEventListener("pointerdown", function (event) {
        if (!event.target.closest("[data-plotly-pane]")) return;
        var paneId = pane.getAttribute("data-pane-id");
        if (state.activePane === paneId) return;
        state.activePane = paneId;
        plotGrid.querySelectorAll(".plot-pane").forEach(function (item) { item.classList.toggle("is-active", item === pane); });
        renderSettings();
      }, true);
      pane.addEventListener("click", function (event) {
        if (event.target.closest("button, [data-plotly-pane]")) return;
        activatePane(pane.getAttribute("data-pane-id"));
      });
      pane.addEventListener("keydown", function (event) {
        if (event.target !== pane || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        activatePane(pane.getAttribute("data-pane-id"));
      });
    });
    bindSelectTriggers(plotGrid);
    plotGrid.querySelectorAll("[data-plot-menu-trigger]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        var paneId = button.getAttribute("data-plot-menu-trigger");
        if (state.activePane !== paneId) {
          state.activePane = paneId;
          closeGraphHelp(false);
          renderPlots();
          renderSettings();
          openPlotMenu(plotGrid.querySelector("[data-plot-menu-trigger='" + paneId + "']"));
        } else {
          openPlotMenu(button);
        }
      });
    });
    renderInteractivePlots();
  }

  function activatePane(paneId) {
    state.activePane = paneId;
    closePlotMenu();
    closeGraphHelp(false);
    renderPlots();
    renderSettings();
  }

  function group(title, fields) {
    return { title: title, fields: fields };
  }

  function field(id, label, type, options) {
    return Object.assign({ id: id, label: label, type: type }, options || {});
  }

  function settingsInventory(page, type) {
    if (page === "measurements") {
      var measurementGroups = [group("Статистики", [
        field("measurement.minimum", "Минимум", "checkbox"),
        field("measurement.maximum", "Максимум", "checkbox"),
        field("measurement.mean", "Среднее", "checkbox"),
        field("measurement.median", "Медиана", "checkbox"),
        field("measurement.peak_to_peak", "Размах", "checkbox"),
        field("measurement.rms", "Среднеквадратичное", "checkbox", { unit: "RMS" })
      ])];
      if (type === "time") measurementGroups.push(group("Пики", [field("peaks_enabled", "Искать пики", "checkbox")]));
      return measurementGroups;
    }

    if (page === "time") {
      if (type === "time") {
        return [
          group("Параметры", [
            field("time.normalize_y", "Нормировать Y", "checkbox"),
            field("time.show_markers", "Показывать маркеры", "checkbox")
          ]),
          group("Пределы времени", [
            field("time.units", "Единицы времени", "select", { options: timeUnitOptions() }),
            field("time.x_limits", "Пределы X", "range", { unit: "s" })
          ]),
          group("Пределы оси Y", [
            field("time.y_limits", "Пределы Y", "range")
          ]),
          group("Связь экранов", [
            field("time.link_time", "Связать время", "checkbox", { disabled: true, message: "Доступно при нескольких экранах." })
          ])
        ];
      }
      if (type === "spectrogram") {
        return [group("Пределы времени", [field("time.x_limits", "Пределы X", "range", { unit: "s" })])];
      }
      return [group("Временные настройки", [
        field("time.not_applicable", "Применимость", "readonly", { value: "Не применяется", message: "У этого типа графика нет собственных полей страницы «Время»." })
      ])];
    }

    var common = [
      field("display.plot_type", "Тип графика", "select", { value: type, options: PLOT_OPTIONS }),
      field("display.show_legend", "Показывать легенду", "checkbox")
    ];
    if (type === "time") {
      return [group("График", common)];
    }
    if (type === "spectrum") {
      var resolutionType = state.values["spectrum.resolution_type"];
      var spectrumAnalysis = [
        field("spectrum.scale", "Спектр в dB", "checkbox"),
        field("spectrum.resolution_type", "Тип разрешения", "select", { options: resolutionTypeOptions() })
      ];
      if (resolutionType === "leakage") {
        spectrumAnalysis.push(field("spectrum.leakage", "Утечка", "number", { min: 0, max: 1, step: 0.01 }));
      } else {
        if (resolutionType === "rbw") spectrumAnalysis.push(field("spectrum.rbw", "Полоса разрешения", "resolution", { unit: "Hz", disabled: true, warning: "Ограничение контракта: значение сохраняется без применения." }));
        if (resolutionType === "window_length") spectrumAnalysis.push(field("spectrum.window_length", "Длина окна", "resolution", { unit: "отсчёты", disabled: true, warning: "Ограничение контракта: значение сохраняется без применения." }));
        spectrumAnalysis.push(field("spectrum.window", "Окно", "select", { options: windowOptions() }));
        if (["chebyshev", "kaiser"].indexOf(state.values["spectrum.window"]) >= 0) spectrumAnalysis.push(field("spectrum.sidelobe_attenuation_db", "Подавление боковых лепестков", "number", { unit: "dB" }));
        spectrumAnalysis.push(field("spectrum.overlap_percent", "Перекрытие", "number", { unit: "%", min: 0, max: 100, step: 1 }));
        if (resolutionType === "window_length") spectrumAnalysis.push(field("spectrum.nfft", "Точки DFT", "resolution", { disabled: true, warning: "Ограничение контракта: значение сохраняется без применения." }));
      }
      spectrumAnalysis.push(field("spectrum.frequency_resolution", "Частотное разрешение", "readonly", { value: "488.28 Hz" }));
      return [
        group("График", common),
        group("Частотная ось", [
          field("spectrum.frequency_units", "Единицы частоты", "select", { options: frequencyUnitOptions() }),
          field("spectrum.frequency_limits", "Пределы частоты", "range", { unit: "Hz" }),
          field("spectrum.frequency_scale", "Шкала частоты", "select", { options: scaleOptions(true) }),
          field("spectrum.y_limits", "Пределы Y", "range")
        ]),
        group("Спектральный анализ", spectrumAnalysis)
      ];
    }
    if (type === "spectrogram") {
      return [
        group("График", common),
        group("Частотная ось", [
          field("spectrogram.time_units", "Единицы времени", "select", { options: timeUnitOptions() }),
          field("spectrogram.frequency_units", "Единицы частоты", "select", { options: frequencyUnitOptions() }),
          field("spectrogram.frequency_limits", "Пределы частоты", "range", { unit: "Hz" }),
          field("spectrogram.frequency_scale", "Шкала частоты", "select", { options: scaleOptions(true) })
        ]),
        group("Мощность", [
          field("spectrogram.power_limits", "Пределы мощности", "range", { unit: "dB" }),
          field("spectrogram.scale", "Спектр в dB", "checkbox"),
          field("spectrogram.leakage", "Утечка", "number", { min: 0, max: 1, step: 0.01 }),
          field("spectrogram.time_resolution", "Разрешение по времени", "resolution", { unit: "s", disabled: true, warning: "Provider blocker ENGEE-20260801-003 сохранён." }),
          field("spectrogram.overlap_percent", "Перекрытие", "number", { unit: "%", min: 0, max: 75, step: 1 }),
          field("spectrogram.reassign", "Переназначение", "checkbox", { disabled: true, warning: "Недоступно у текущего поставщика: ENGEE-20260801-004." }),
          field("spectrogram.actual_rbw", "Фактическая RBW", "readonly", { value: "976.56 Hz" })
        ])
      ];
    }
    return [
      group("График", common),
      group("Частотная ось", [
        field("persistence.time_units", "Единицы времени", "select", { options: timeUnitOptions() }),
        field("persistence.frequency_units", "Единицы частоты", "select", { options: frequencyUnitOptions() }),
        field("persistence.frequency_limits", "Пределы частоты", "range", { unit: "Hz", disabled: true, warning: "Ожидает выполнение prerequisite DEC-20260801-027." }),
        field("persistence.frequency_scale", "Шкала частоты", "select", { options: scaleOptions() })
      ]),
      group("Плотность и мощность", [
        field("persistence.power_limits", "Пределы мощности", "range", { unit: "dB" }),
        field("persistence.density_limits", "Пределы плотности", "range", { unit: "%" }),
        field("persistence.scale", "Спектр в dB", "checkbox"),
        field("persistence.leakage", "Утечка", "number", { min: 0, max: 1, step: 0.01 }),
        field("persistence.time_resolution", "Разрешение по времени", "resolution", { unit: "s", disabled: true, warning: "Ограничение контракта сохранено." }),
        field("persistence.overlap_percent", "Перекрытие", "number", { unit: "%", disabled: true, warning: "Сохраняется, но пока не применяется: DEC-20260801-026." }),
        field("persistence.power_bins", "Интервалы мощности", "resolution", { min: 20, max: 1024, step: 1 }),
        field("persistence.rbw", "RBW", "readonly", { value: "976.56 Hz" })
      ])
    ];
  }

  function timeUnitOptions() {
    return [
      { value: "picoseconds", label: "ps" }, { value: "nanoseconds", label: "ns" },
      { value: "microseconds", label: "μs" }, { value: "milliseconds", label: "ms" },
      { value: "seconds", label: "s" }, { value: "minutes", label: "мин" },
      { value: "hours", label: "ч" }, { value: "days", label: "дн" },
      { value: "years", label: "г" }
    ];
  }

  function frequencyUnitOptions() {
    return [
      { value: "cycles_per_year", label: "cycles/year" }, { value: "cycles_per_day", label: "cycles/day" },
      { value: "cycles_per_hour", label: "cycles/hour" }, { value: "cycles_per_minute", label: "cycles/minute" },
      { value: "millihertz", label: "mHz" }, { value: "hertz", label: "Hz" },
      { value: "kilohertz", label: "kHz" }, { value: "megahertz", label: "MHz" },
      { value: "gigahertz", label: "GHz" }, { value: "terahertz", label: "THz" }
    ];
  }

  function scaleOptions(disableLog) {
    return [{ value: "linear", label: "Линейная" }, { value: "log", label: "Логарифмическая", disabled: !!disableLog }];
  }

  function resolutionTypeOptions() {
    return [
      { value: "leakage", label: "По утечке" },
      { value: "rbw", label: "По RBW" },
      { value: "window_length", label: "По длине окна" }
    ];
  }

  function windowOptions() {
    return [
      { value: "blackman_harris", label: "Blackman-Harris" }, { value: "chebyshev", label: "Chebyshev" },
      { value: "flat_top", label: "Flat-top" }, { value: "hamming", label: "Hamming" },
      { value: "hann", label: "Hann" }, { value: "kaiser", label: "Kaiser" },
      { value: "rectangular", label: "Rectangular" }
    ];
  }

  function selectButton(key, value, options, extraClass, ariaLabel, designId) {
    var selected = options.find(function (option) { return option.value === value; }) || options[0];
    return "<button class='select-trigger " + (extraClass || "") + "' type='button' data-select-key='" + escapeHtml(key) + "' data-select-options='" + escapeHtml(JSON.stringify(options)) + "' aria-label='" + escapeHtml(ariaLabel) + "' aria-haspopup='listbox' aria-expanded='false'" + (designId ? " data-design-id='" + escapeHtml(designId) + "'" : "") + "><span>" + escapeHtml(selected.label) + "</span></button>";
  }

  function renderField(item) {
    var value = Object.prototype.hasOwnProperty.call(item, "value") ? item.value : state.values[item.id];
    var disabled = !!item.disabled || state.busy;
    var warning = item.warning;
    var error = state.errors[item.id];
    var rowClass = "settings-field-row" + (error ? " has-error" : warning ? " has-warning" : "");
    var control = "";
    if (item.type === "checkbox") {
      control = "<label class='checkbox-control'><input type='checkbox' data-field-checkbox='" + escapeHtml(item.id) + "'" + (value ? " checked" : "") + (disabled ? " disabled" : "") + " aria-label='" + escapeHtml(item.label) + "'></label>";
    } else if (item.type === "select") {
      control = selectButton("field:" + item.id, value, item.options, "", item.label, "field-" + item.id) .replace("<button", "<button" + (disabled ? " disabled" : ""));
    } else if (item.type === "number") {
      control = "<input class='control' type='number' data-field-input='" + escapeHtml(item.id) + "' value='" + escapeHtml(value) + "'" + (item.min !== undefined ? " min='" + item.min + "'" : "") + (item.max !== undefined ? " max='" + item.max + "'" : "") + (item.step !== undefined ? " step='" + item.step + "'" : "") + (disabled ? " disabled" : "") + " aria-label='" + escapeHtml(item.label) + "'>";
    } else if (item.type === "range") {
      var range = state.ranges[item.id] || ["", ""];
      control = "<div class='range-control'><input class='control' type='text' inputmode='decimal' data-range-field='" + escapeHtml(item.id) + "' data-range-index='0' value='" + escapeHtml(range[0]) + "' placeholder='Мин.'" + (disabled ? " disabled" : "") + " aria-label='Минимум: " + escapeHtml(item.label) + "'><input class='control' type='text' inputmode='decimal' data-range-field='" + escapeHtml(item.id) + "' data-range-index='1' value='" + escapeHtml(range[1]) + "' placeholder='Макс.'" + (disabled ? " disabled" : "") + " aria-label='Максимум: " + escapeHtml(item.label) + "'></div>";
    } else if (item.type === "resolution") {
      var mode = state.resolutionModes[item.id] || "auto";
      var modeOptions = [{ value: "auto", label: "Авто" }, { value: "specified", label: "Задать" }];
      control = "<div class='range-control'>" + selectButton("resolution:" + item.id, mode, modeOptions, "", "Режим: " + item.label, "resolution-mode-" + item.id).replace("<button", "<button" + (disabled ? " disabled" : "")) + "<input class='control' type='text' inputmode='decimal' data-field-input='" + escapeHtml(item.id) + "' value='" + escapeHtml(value || "") + "'" + ((disabled || mode === "auto") ? " disabled" : "") + " aria-label='Значение: " + escapeHtml(item.label) + "'></div>";
    } else {
      control = "<div class='readonly-control'>" + escapeHtml(value || "—") + "</div>";
    }
    var message = error || warning || item.message || "";
    return "<div class='" + rowClass + "' data-design-id='settings-field-" + escapeHtml(item.id) + "'><div class='settings-label'><span>" + escapeHtml(item.label) + "</span>" + (item.unit ? "<span class='unit'>" + escapeHtml(item.unit) + "</span>" : "") + "</div><div class='settings-control-wrap'>" + control + "</div>" + (message ? "<p class='field-message" + (error ? " is-error" : warning ? " is-warning" : "") + "'>" + escapeHtml(message) + "</p>" : "") + "</div>";
  }

  function renderSettings() {
    var type = activePlotType();
    var groups = settingsInventory(state.settingsPage, type);
    settingsContent.innerHTML = groups.map(function (item) {
      return "<section class='settings-group'><h3 class='settings-group-title'>" + escapeHtml(item.title) + "</h3>" + item.fields.map(renderField).join("") + "</section>";
    }).join("");
    document.querySelectorAll("[data-settings-page]").forEach(function (button) {
      var selected = button.getAttribute("data-settings-page") === state.settingsPage;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    settingsApply.disabled = state.busy;
    settingsApply.textContent = state.busy ? "Применение…" : "Применить";
    settingsStatus.textContent = state.busy ? "Обновляется активная область" : Object.keys(state.errors).length ? "Исправьте выделенные поля" : "";
    bindSelectTriggers(settingsContent);
    settingsContent.querySelectorAll("[data-field-checkbox]").forEach(function (input) {
      input.addEventListener("change", function () {
        state.values[input.getAttribute("data-field-checkbox")] = input.checked;
        if (input.getAttribute("data-field-checkbox") === "display.show_legend") renderPlots();
      });
    });
    settingsContent.querySelectorAll("[data-field-input]").forEach(function (input) {
      input.addEventListener("input", function () { state.values[input.getAttribute("data-field-input")] = input.value; });
    });
    settingsContent.querySelectorAll("[data-range-field]").forEach(function (input) {
      input.addEventListener("input", function () {
        var id = input.getAttribute("data-range-field");
        state.ranges[id][Number(input.getAttribute("data-range-index"))] = input.value;
      });
      input.addEventListener("blur", function () {
        validateRange(input.getAttribute("data-range-field"));
        renderSettings();
      });
    });
  }

  function validateRange(id) {
    var range = state.ranges[id];
    if (!range || range[0] === "" || range[1] === "") {
      delete state.errors[id];
      return true;
    }
    var minimum = Number(String(range[0]).replace(",", "."));
    var maximum = Number(String(range[1]).replace(",", "."));
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum) {
      state.errors[id] = "Минимум должен быть меньше максимума.";
      return false;
    }
    delete state.errors[id];
    return true;
  }

  function validateVisibleSettings() {
    var valid = true;
    settingsContent.querySelectorAll("[data-range-field]").forEach(function (input) {
      if (!validateRange(input.getAttribute("data-range-field"))) valid = false;
    });
    return valid;
  }

  function bindSelectTriggers(root) {
    root.querySelectorAll("[data-select-key]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        if (button.disabled) return;
        openSelect(button);
      });
    });
  }

  function openSelect(trigger) {
    closePlotMenu();
    closeInspectorMenu();
    var key = trigger.getAttribute("data-select-key");
    var options = JSON.parse(trigger.getAttribute("data-select-options"));
    var current;
    if (key.indexOf("plot:") === 0) current = state.paneTypes[key.slice(5)];
    else if (key.indexOf("field:") === 0) current = state.values[key.slice(6)];
    else current = state.resolutionModes[key.slice(11)];
    state.selectContext = { key: key, trigger: trigger, options: options };
    selectMenu.innerHTML = options.map(function (option) {
      var selected = option.value === current;
      return "<button type='button' role='option' aria-selected='" + selected + "' data-option-value='" + escapeHtml(option.value) + "' class='" + (selected ? "is-selected" : "") + "'" + (option.disabled ? " disabled aria-disabled='true'" : "") + "><span class='select-option-check' aria-hidden='true'></span><span class='select-option-label'>" + escapeHtml(option.label) + "</span></button>";
    }).join("");
    selectMenu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    positionMenu(selectMenu, trigger, key.indexOf("plot:") === 0 ? Math.max(244, trigger.getBoundingClientRect().width) : Math.max(180, trigger.getBoundingClientRect().width));
    selectMenu.querySelectorAll("[data-option-value]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.disabled) return;
        setSelectValue(key, button.getAttribute("data-option-value"));
        closeSelect(true);
      });
    });
    (selectMenu.querySelector(".is-selected") || selectMenu.querySelector("button")).focus();
  }

  function setSelectValue(key, value) {
    if (key.indexOf("plot:") === 0) {
      var paneId = key.slice(5);
      state.paneTypes[paneId] = value;
      state.activePane = paneId;
      renderPlots();
      renderSettings();
      return;
    }
    if (key.indexOf("field:") === 0) {
      var fieldId = key.slice(6);
      if (fieldId === "display.plot_type") {
        state.paneTypes[state.activePane] = value;
        renderPlots();
        renderSettings();
        return;
      }
      state.values[fieldId] = value;
      renderSettings();
      return;
    }
    state.resolutionModes[key.slice(11)] = value;
    renderSettings();
  }

  function closeSelect(restore) {
    if (selectMenu.hidden) return;
    var trigger = state.selectContext && state.selectContext.trigger;
    selectMenu.hidden = true;
    if (trigger && document.contains(trigger)) trigger.setAttribute("aria-expanded", "false");
    state.selectContext = null;
    if (restore && trigger && document.contains(trigger)) trigger.focus();
  }

  function positionMenu(menu, trigger, width) {
    var rect = trigger.getBoundingClientRect();
    var left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width));
    var top = rect.bottom + 4;
    menu.style.width = width + "px";
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    requestAnimationFrame(function () {
      var menuRect = menu.getBoundingClientRect();
      if (menuRect.bottom > window.innerHeight - 8) menu.style.top = Math.max(8, rect.top - menuRect.height - 4) + "px";
    });
  }

  function openPlotMenu(trigger) {
    closeSelect(false);
    closeGraphHelp(false);
    plotMenu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    plotMenu.dataset.triggerPane = trigger.getAttribute("data-plot-menu-trigger");
    plotMenu.dataset.triggerIndex = PANE_ORDER.indexOf(plotMenu.dataset.triggerPane);
    plotMenu._trigger = trigger;
    positionMenu(plotMenu, trigger, 224);
    var pane = trigger.closest(".plot-pane");
    var canvas = pane && pane.querySelector(".plot-canvas");
    plotMenu.dataset.placement = canvas && canvas.getBoundingClientRect().height < 190 ? "above" : "below";
    if (plotMenu.dataset.placement === "above") {
      plotMenu.style.top = Math.max(8, trigger.getBoundingClientRect().top - plotMenu.offsetHeight - 4) + "px";
    }
    plotMenu.querySelector("button").focus();
  }

  function closePlotMenu(restore) {
    if (plotMenu.hidden) return;
    closeGraphHelp(false);
    var trigger = plotMenu._trigger;
    plotMenu.hidden = true;
    if (trigger && document.contains(trigger)) trigger.setAttribute("aria-expanded", "false");
    if (restore && trigger && document.contains(trigger)) trigger.focus();
  }

  function openGraphHelp(trigger) {
    state.graphHelpPane = plotMenu.dataset.triggerPane;
    state.graphHelpRestoreTarget = trigger;
    trigger.setAttribute("aria-expanded", "true");
    graphHelp.hidden = false;
    var pane = plotGrid.querySelector("[data-pane-id='" + state.graphHelpPane + "']");
    var canvasRect = pane.querySelector(".plot-canvas").getBoundingClientRect();
    var legendRect = pane.querySelector(".plot-legend").getBoundingClientRect();
    var width = graphHelp.offsetWidth;
    graphHelp.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, canvasRect.left + 8)) + "px";
    graphHelp.style.top = Math.min(window.innerHeight - graphHelp.offsetHeight - 8, legendRect.bottom + 8) + "px";
    graphHelp.querySelector("[data-graph-help-close]").focus();
  }

  function closeGraphHelp(restore) {
    if (graphHelp.hidden) return;
    var target = state.graphHelpRestoreTarget;
    graphHelp.hidden = true;
    if (target && document.contains(target)) target.setAttribute("aria-expanded", "false");
    state.graphHelpPane = null;
    state.graphHelpRestoreTarget = null;
    hideTooltip(true);
    if (restore && target && document.contains(target)) target.focus();
  }

  function renderInspectorMenu() {
    inspectorMenu.innerHTML = "<div class='inspector-menu-title'>Видимость столбцов</div>" + COLUMN_DEFINITIONS.filter(function (column) { return column.id !== "name"; }).map(function (column) {
      var visible = state.visibleColumns.indexOf(column.id) >= 0;
      return "<button type='button' role='menuitem' aria-pressed='" + visible + "' data-column-id='" + column.id + "' data-tooltip='" + (visible ? "Скрыть" : "Показать") + " столбец «" + escapeHtml(column.label) + "»'><span>" + escapeHtml(column.label) + "</span><img src='../assets/icons/" + (visible ? "eye.svg" : "eye-off.svg") + "' alt=''></button>";
    }).join("");
    inspectorMenu.querySelectorAll("[data-column-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-column-id");
        var index = state.visibleColumns.indexOf(id);
        if (index >= 0) state.visibleColumns.splice(index, 1); else state.visibleColumns.push(id);
        renderSignals();
        renderInspectorMenu();
        positionMenu(inspectorMenu, overflowTrigger, 244);
      });
    });
  }

  function openInspectorMenu() {
    closeSelect(false);
    closePlotMenu(false);
    renderInspectorMenu();
    inspectorMenu.hidden = false;
    overflowTrigger.setAttribute("aria-expanded", "true");
    positionMenu(inspectorMenu, overflowTrigger, 244);
    inspectorMenu.querySelector("button").focus();
  }

  function closeInspectorMenu(restore) {
    if (inspectorMenu.hidden) return;
    hideTooltip(true);
    inspectorMenu.hidden = true;
    overflowTrigger.setAttribute("aria-expanded", "false");
    if (restore) overflowTrigger.focus();
  }

  function renderSignals() {
    var head = document.querySelector("[data-table-head]");
    var body = document.querySelector("[data-table-body]");
    var empty = document.querySelector("[data-table-empty]");
    if (!head || !body) return;
    if (state.visibleColumns.indexOf("name") < 0) state.visibleColumns.unshift("name");
    var visibleDefinitions = COLUMN_DEFINITIONS.filter(function (column) { return state.visibleColumns.indexOf(column.id) >= 0; });
    head.innerHTML = "<th><input type='checkbox' checked aria-label='Показать все сигналы'></th>" + visibleDefinitions.map(function (column) { return "<th>" + escapeHtml(column.label) + "</th>"; }).join("");
    var query = state.search.trim().toLocaleLowerCase("ru");
    var filtered = SIGNALS.filter(function (signal) { return !query || signal.name.toLocaleLowerCase("ru").indexOf(query) >= 0; });
    body.innerHTML = filtered.map(function (signal, index) {
      var busy = state.rowActionBusy === signal.name;
      var actions = "<div class='signal-row-actions' aria-label='Действия с сигналом " + escapeHtml(signal.name) + "'>" +
        "<button class='signal-row-action is-copy' type='button' data-signal-row-action='duplicate' data-signal-name='" + escapeHtml(signal.name) + "' data-design-id='signal-duplicate-" + escapeHtml(signal.name) + "' data-tooltip='Дублировать' aria-label='Дублировать сигнал " + escapeHtml(signal.name) + "'" + (busy ? " disabled aria-busy='true'" : "") + "><img src='../assets/icons/copy.svg' alt=''></button>" +
        "<button class='signal-row-action is-danger' type='button' data-signal-row-action='delete' data-signal-name='" + escapeHtml(signal.name) + "' data-design-id='signal-delete-" + escapeHtml(signal.name) + "' data-tooltip='Удалить' aria-label='Удалить сигнал " + escapeHtml(signal.name) + "'" + (busy ? " disabled aria-busy='true'" : "") + "><img src='../assets/icons/trash.svg' alt=''></button>" +
        "</div>";
      var cells = visibleDefinitions.map(function (column, columnIndex) {
        var last = columnIndex === visibleDefinitions.length - 1;
        var cellClass = (column.id === "color" ? " color-cell" : "") + (last ? " is-actions-host" : "");
        var value;
        if (column.id === "color") {
          value = "<button class='color-swatch' type='button' style='--swatch: var(--" + escapeHtml(signal.color_token) + ")' data-color-swatch='" + escapeHtml(signal.name) + "' data-tooltip='Цвет: " + escapeHtml(signal.color_name) + "' aria-label='Цвет сигнала " + escapeHtml(signal.name) + ": " + escapeHtml(signal.color_name) + "'></button>";
        } else {
          value = "<span class='signal-cell-value' data-tooltip='" + escapeHtml(signal[column.id]) + "'>" + escapeHtml(signal[column.id]) + "</span>";
        }
        return "<td class='" + cellClass.trim() + "'>" + value + (last ? actions : "") + "</td>";
      }).join("");
      return "<tr data-signal-row='" + escapeHtml(signal.name) + "' class='" + (index === 0 ? "is-selected" : "") + "'><td><input type='checkbox' data-signal-visible='" + escapeHtml(signal.name) + "' aria-label='Показать сигнал " + escapeHtml(signal.name) + "'" + (signal.visible ? " checked" : "") + "></td>" + cells + "</tr>";
    }).join("");
    empty.hidden = filtered.length !== 0;
    body.querySelectorAll("tr").forEach(function (row) {
      row.addEventListener("click", function (event) {
        if (event.target.closest("input, button")) return;
        body.querySelectorAll("tr").forEach(function (item) { item.classList.toggle("is-selected", item === row); });
      });
    });
    body.querySelectorAll("[data-color-swatch]").forEach(function (swatch) {
      swatch.addEventListener("click", function () {
        var row = swatch.closest("tr");
        body.querySelectorAll("tr").forEach(function (item) { item.classList.toggle("is-selected", item === row); });
      });
    });
    body.querySelectorAll("[data-signal-visible]").forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        var signal = SIGNALS.find(function (item) { return item.name === checkbox.getAttribute("data-signal-visible"); });
        if (signal) signal.visible = checkbox.checked;
      });
    });
    body.querySelectorAll("[data-signal-row-action]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        var signalName = button.getAttribute("data-signal-name");
        var action = button.getAttribute("data-signal-row-action");
        if (state.rowActionBusy) return;
        state.rowActionBusy = signalName;
        renderSignals();
        setTimeout(function () {
          var signalIndex = SIGNALS.findIndex(function (signal) { return signal.name === signalName; });
          if (action === "duplicate" && signalIndex >= 0) {
            var duplicate = Object.assign({}, SIGNALS[signalIndex], { name: signalName + "_copy" });
            SIGNALS.splice(signalIndex + 1, 0, duplicate);
          }
          if (action === "delete" && signalIndex >= 0 && SIGNALS.length > 1) SIGNALS.splice(signalIndex, 1);
          state.rowActionBusy = null;
          renderSignals();
          showToast(action === "duplicate" ? "Сигнал " + signalName + " дублирован" : "Сигнал " + signalName + " удалён");
        }, 520);
      });
    });
  }

  function renderInspectorPage() {
    var content = document.querySelector("[data-inspector-content]");
    document.querySelectorAll("[data-inspector-page]").forEach(function (button) {
      var selected = button.getAttribute("data-inspector-page") === state.inspectorPage;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (state.inspectorPage === "signals") {
      content.innerHTML = "<div class='inspector-search-row'><span class='search-icon' aria-hidden='true'></span><input type='search' data-design-id='signals-search' aria-label='Поиск сигналов' placeholder='Введите название' value='" + escapeHtml(state.search) + "'></div><div class='signal-table-scroll'><table class='signal-table'><thead><tr data-table-head></tr></thead><tbody data-table-body></tbody></table><div class='table-empty' role='status' data-table-empty hidden>Сигналы не найдены</div></div>";
      var search = content.querySelector("[data-design-id='signals-search']");
      search.addEventListener("input", function () { state.search = search.value; renderSignals(); });
      renderSignals();
      return;
    }
    if (state.inspectorPage === "measurements") {
      content.innerHTML = "<div class='table-empty'><strong>Измерения активной области</strong><p>Минимум: −0,98 · Максимум: 1,00 · Среднее: 0,04</p></div>";
      return;
    }
    content.innerHTML = "<div class='table-empty'><strong>Пики не рассчитаны</strong><p>Выберите действие поиска пиков для активной области.</p></div>";
  }

  function showToast(copy) {
    toast.querySelector("[data-toast-copy]").textContent = copy;
    toast.hidden = false;
  }

  function hideToast() {
    toast.hidden = true;
  }

  function openLayoutPopover() {
    renderLayoutSegments();
    layoutPopover.hidden = false;
    layoutTrigger.setAttribute("aria-expanded", "true");
    var rect = layoutTrigger.getBoundingClientRect();
    var width = layoutPopover.offsetWidth;
    layoutPopover.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width)) + "px";
    layoutPopover.style.top = Math.min(window.innerHeight - layoutPopover.offsetHeight - 8, rect.bottom + 6) + "px";
    layoutPopover.querySelector("[data-layout-close]").focus();
  }

  function closeLayoutPopover(restore) {
    if (layoutPopover.hidden) return;
    closeSelect(false);
    layoutPopover.hidden = true;
    layoutTrigger.setAttribute("aria-expanded", "false");
    if (restore) layoutTrigger.focus();
  }

  function renderLayoutSegments() {
    ["rows", "columns"].forEach(function (kind) {
      var host = layoutPopover.querySelector("[data-layout-" + kind + "]");
      var current = kind === "rows" ? state.layoutRows : state.layoutColumns;
      host.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (value) {
        return "<button class='segment" + (current === value ? " is-selected" : "") + "' type='button' aria-pressed='" + (current === value) + "' data-layout-kind='" + kind + "' data-layout-value='" + value + "'>" + value + "</button>";
      }).join("");
      host.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          if (kind === "rows") state.layoutRows = Number(button.getAttribute("data-layout-value"));
          else state.layoutColumns = Number(button.getAttribute("data-layout-value"));
          renderLayoutSegments();
        });
      });
    });
    var preview = layoutPopover.querySelector(".layout-preview");
    var paneCount = state.layoutRows * state.layoutColumns;
    preview.style.gridTemplateColumns = "repeat(" + state.layoutColumns + ", minmax(0, 1fr))";
    preview.style.gridTemplateRows = "repeat(" + state.layoutRows + ", minmax(0, 1fr))";
    preview.innerHTML = Array.from({ length: paneCount }, function () { return "<i></i>"; }).join("");
    var notRecommended = state.layoutRows > 4 || state.layoutColumns > 4;
    var warning = layoutPopover.querySelector("[data-layout-warning]");
    warning.hidden = !notRecommended;
    if (notRecommended) warning.querySelector("span").textContent = "Для читаемости используйте не более 4 × 4. Выбран " + state.layoutRows + " × " + state.layoutColumns + "; его можно применить.";
  }

  function openAddDialog() {
    closeInspectorMenu(false);
    if (!selectMenu.hidden) {
      selectMenu.classList.add("is-stale");
      selectMenu.inert = true;
    }
    if (!plotMenu.hidden) {
      plotMenu.classList.add("is-stale");
      plotMenu.inert = true;
    }
    if (!graphHelp.hidden) {
      graphHelp.classList.add("is-stale");
      graphHelp.inert = true;
    }
    if (!tooltip.hidden) {
      tooltip.classList.add("is-stale");
      state.tooltipLocked = true;
    }
    state.restoreTarget = addTrigger;
    addLayer.hidden = false;
    app.inert = true;
    addLayer.querySelectorAll("[data-dialog-signal]").forEach(function (input) { input.checked = false; });
    addSubmit.disabled = true;
    addSubmit.textContent = "Добавить";
    addLayer.querySelector("#add-dialog-title").focus();
  }

  function dialogDirty() {
    return Array.from(addLayer.querySelectorAll("[data-dialog-signal]")).some(function (input) { return input.checked; });
  }

  function requestCloseAdd() {
    if (dialogDirty()) {
      openConfirm("dirty", addClose);
      return;
    }
    closeAddDialog(true);
  }

  function closeAddDialog(restore) {
    if (addLayer.hidden) return;
    hideTooltip(true);
    addLayer.hidden = true;
    app.inert = false;
    addDialogCard.inert = false;
    selectMenu.classList.remove("is-stale");
    selectMenu.inert = false;
    plotMenu.classList.remove("is-stale");
    plotMenu.inert = false;
    graphHelp.classList.remove("is-stale");
    graphHelp.inert = false;
    state.tooltipLocked = false;
    closeSelect(false);
    closePlotMenu(false);
    closeGraphHelp(false);
    state.suppressTooltipUntil = Date.now() + 250;
    if (restore && state.restoreTarget) state.restoreTarget.focus();
  }

  function openConfirm(mode, restoreTarget) {
    state.confirmMode = mode;
    state.restoreTarget = restoreTarget;
    if (mode === "dirty") {
      confirmTitle.textContent = "Закрыть без добавления?";
      confirmCopy.textContent = "Выбранные сигналы не будут добавлены.";
      confirmStay.textContent = "Остаться";
      confirmLeave.textContent = "Закрыть";
      addDialogCard.inert = true;
      if (!tooltip.hidden) {
        tooltip.classList.add("is-stale");
        state.tooltipLocked = true;
      }
    } else {
      confirmTitle.textContent = "Очистить активную область?";
      confirmCopy.textContent = "График останется без видимых сигналов, пока вы не включите их снова.";
      confirmStay.textContent = "Отмена";
      confirmLeave.textContent = "Очистить";
      app.inert = true;
    }
    nestedLayer.hidden = false;
    confirmTitle.focus();
  }

  function closeConfirm(restore) {
    if (nestedLayer.hidden) return;
    nestedLayer.hidden = true;
    addDialogCard.inert = false;
    state.tooltipLocked = false;
    hideTooltip(true);
    if (state.confirmMode === "clear") app.inert = false;
    var target = state.restoreTarget;
    state.confirmMode = null;
    state.suppressTooltipUntil = Date.now() + 250;
    if (restore && target && document.contains(target)) target.focus();
  }

  function confirmLeaveAction() {
    if (state.confirmMode === "dirty") {
      closeConfirm(false);
      closeAddDialog(true);
      return;
    }
    var paneId = state.activePane;
    closeConfirm(false);
    state.plotStatus[paneId] = "empty";
    renderPlots();
    showToast("Активная область очищена");
    var pane = plotGrid.querySelector("[data-pane-id='" + paneId + "']");
    if (pane) pane.focus();
  }

  function showTooltip(target) {
    if (!target || !target.getAttribute("data-tooltip")) return;
    if (Date.now() < state.suppressTooltipUntil) return;
    if (state.tooltipLocked) return;
    state.tooltipTarget = target;
    tooltip.textContent = target.getAttribute("data-tooltip");
    tooltip.classList.toggle("is-modal-child", !!target.closest(".primary-modal-layer"));
    tooltip.classList.remove("is-stale");
    tooltip.hidden = false;
    var rect = target.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var left = Math.min(window.innerWidth - tipRect.width - 8, Math.max(8, rect.left + rect.width / 2 - tipRect.width / 2));
    var top = rect.bottom + 6;
    if (top + tipRect.height > window.innerHeight - 8) top = rect.top - tipRect.height - 6;
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip(force) {
    if (state.tooltipLocked && !force) return;
    tooltip.hidden = true;
    tooltip.classList.remove("is-stale", "is-modal-child");
    state.tooltipTarget = null;
  }

  function focusableWithin(root) {
    return Array.from(root.querySelectorAll("button:not([disabled]), input:not([disabled]), [tabindex='0']")).filter(function (element) { return !element.hidden && element.offsetParent !== null; });
  }

  function trapTab(event, root) {
    var items = focusableWithin(root);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function selectDisplayTab(button) {
    displayTablist.querySelectorAll(".display-tab").forEach(function (tab) {
      var selected = tab === button;
      tab.closest(".display-tab-shell").classList.toggle("is-selected", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    button.scrollIntoView({ block: "nearest", inline: "nearest" });
    updateDisplayScroll();
  }

  function bindDisplayTab(shell) {
    var button = shell.querySelector(".display-tab");
    var closeButton = shell.querySelector("[data-screen-close]");
    button.addEventListener("click", function () { selectDisplayTab(button); });
    closeButton.addEventListener("click", function (event) {
      event.stopPropagation();
      openScreenDelete(closeButton);
    });
  }

  function createDisplayTab(number) {
    var shell = document.createElement("div");
    shell.className = "display-tab-shell";
    shell.setAttribute("data-screen-id", String(number));
    shell.innerHTML = "<button class='display-tab' type='button' role='tab' aria-selected='false' tabindex='-1'><span>Экран " + number + "</span></button>" +
      "<button class='display-tab-close' type='button' data-screen-close aria-label='Удалить экран " + number + "' data-tooltip='Удалить экран " + number + "'><img src='../assets/icons/close.svg' alt=''></button>";
    bindDisplayTab(shell);
    return shell;
  }

  function openScreenDelete(closeButton) {
    var shell = closeButton.closest(".display-tab-shell");
    var name = shell.querySelector(".display-tab span").textContent;
    state.screenDeleteTarget = closeButton;
    state.screenDeleteShell = shell;
    screenDeleteTitle.textContent = "Удалить «" + name + "»?";
    var onlyScreen = displayTablist.querySelectorAll(".display-tab-shell").length === 1;
    screenDeleteCopy.textContent = onlyScreen ? "Нельзя удалить единственный экран. Сначала добавьте другой." : "Экран и его текущий макет будут удалены.";
    screenDeleteConfirm.disabled = onlyScreen;
    if (!plotMenu.hidden) { plotMenu.classList.add("is-stale"); plotMenu.inert = true; }
    if (!graphHelp.hidden) { graphHelp.classList.add("is-stale"); graphHelp.inert = true; }
    if (!tooltip.hidden) { tooltip.classList.add("is-stale"); state.tooltipLocked = true; }
    screenDeleteLayer.hidden = false;
    app.inert = true;
    screenDeleteTitle.focus();
  }

  function closeScreenDelete(restore) {
    if (screenDeleteLayer.hidden) return;
    var target = state.screenDeleteTarget;
    screenDeleteLayer.hidden = true;
    app.inert = false;
    plotMenu.classList.remove("is-stale");
    plotMenu.inert = false;
    graphHelp.classList.remove("is-stale");
    graphHelp.inert = false;
    state.tooltipLocked = false;
    hideTooltip(true);
    closeGraphHelp(false);
    closePlotMenu(false);
    state.screenDeleteShell = null;
    state.screenDeleteTarget = null;
    state.suppressTooltipUntil = Date.now() + 250;
    if (restore && target && document.contains(target)) target.focus();
  }

  function confirmScreenDelete() {
    var shell = state.screenDeleteShell;
    if (!shell || screenDeleteConfirm.disabled) return;
    var wasSelected = shell.classList.contains("is-selected");
    var nextShell = shell.nextElementSibling || shell.previousElementSibling;
    var name = shell.querySelector(".display-tab span").textContent;
    screenDeleteLayer.hidden = true;
    app.inert = false;
    plotMenu.classList.remove("is-stale");
    plotMenu.inert = false;
    graphHelp.classList.remove("is-stale");
    graphHelp.inert = false;
    closeGraphHelp(false);
    closePlotMenu(false);
    shell.remove();
    state.screenDeleteShell = null;
    state.screenDeleteTarget = null;
    if (wasSelected && nextShell) selectDisplayTab(nextShell.querySelector(".display-tab"));
    var selected = displayTablist.querySelector(".display-tab[aria-selected='true']") || displayTablist.querySelector(".display-tab");
    if (selected) selected.focus();
    updateDisplayScroll();
    showToast(name + " удалён");
  }

  function updateDisplayScroll() {
    var overflow = displayTablist.scrollWidth > displayTablist.clientWidth + 1;
    var atLeft = displayTablist.scrollLeft <= 1;
    var atRight = displayTablist.scrollLeft + displayTablist.clientWidth >= displayTablist.scrollWidth - 1;
    displayScrollLeft.hidden = !overflow || atLeft;
    displayScrollRight.hidden = !overflow || atRight;
    displayScrollLeft.disabled = !overflow;
    displayScrollRight.disabled = !overflow;
  }

  function scrollDisplayTabs(direction) {
    var amount = Math.max(160, Math.min(220, Math.floor(displayTablist.clientWidth * 0.35)));
    displayTablist.scrollBy({ left: direction * amount, behavior: "smooth" });
    setTimeout(updateDisplayScroll, 180);
  }

  document.querySelectorAll("[data-settings-page]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.settingsPage = button.getAttribute("data-settings-page");
      renderSettings();
    });
  });

  document.querySelectorAll("[data-inspector-page]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.inspectorPage = button.getAttribute("data-inspector-page");
      renderInspectorPage();
    });
  });

  displayTablist.querySelectorAll(".display-tab-shell").forEach(bindDisplayTab);
  displayTablist.addEventListener("scroll", updateDisplayScroll);
  displayScrollLeft.addEventListener("click", function () { scrollDisplayTabs(-1); });
  displayScrollRight.addEventListener("click", function () { scrollDisplayTabs(1); });

  displayAddTrigger.addEventListener("click", function () {
    state.displayCount += 1;
    var shell = createDisplayTab(state.displayCount);
    displayTablist.appendChild(shell);
    selectDisplayTab(shell.querySelector(".display-tab"));
    displayTablist.scrollLeft = displayTablist.scrollWidth;
    updateDisplayScroll();
    showToast("Экран " + state.displayCount + " добавлен");
  });

  settingsApply.addEventListener("click", function () {
    if (!validateVisibleSettings()) {
      state.plotStatus[state.activePane] = "error";
      renderPlots();
      renderSettings();
      var errorInput = settingsContent.querySelector(".has-error input");
      if (errorInput) errorInput.focus();
      return;
    }
    delete state.plotStatus[state.activePane];
    state.busy = true;
    state.plotStatus[state.activePane] = "loading";
    renderPlots();
    renderSettings();
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(function () {
      state.busy = false;
      delete state.plotStatus[state.activePane];
      renderPlots();
      renderSettings();
      showToast("Настройки применены");
    }, 900);
  });

  overflowTrigger.addEventListener("click", function (event) {
    event.stopPropagation();
    if (inspectorMenu.hidden) openInspectorMenu(); else closeInspectorMenu(true);
  });

  addTrigger.addEventListener("click", openAddDialog);
  addClose.addEventListener("click", requestCloseAdd);
  addLayer.querySelector("[data-add-cancel]").addEventListener("click", requestCloseAdd);
  addLayer.querySelectorAll("[data-dialog-signal]").forEach(function (input) {
    input.addEventListener("change", function () { addSubmit.disabled = !dialogDirty(); });
  });
  addSubmit.addEventListener("click", function () {
    var count = Array.from(addLayer.querySelectorAll("[data-dialog-signal]:checked")).length;
    addSubmit.disabled = true;
    addSubmit.textContent = "Добавление…";
    setTimeout(function () {
      closeAddDialog(true);
      showToast("Добавлено сигналов: " + count);
    }, 700);
  });

  confirmStay.addEventListener("click", function () { closeConfirm(true); });
  confirmLeave.addEventListener("click", confirmLeaveAction);
  screenDeleteLayer.querySelector("[data-screen-delete-cancel]").addEventListener("click", function () { closeScreenDelete(true); });
  screenDeleteLayer.querySelector("[data-screen-delete-close]").addEventListener("click", function () { closeScreenDelete(true); });
  screenDeleteConfirm.addEventListener("click", confirmScreenDelete);

  plotMenu.querySelector("[data-plot-clear]").addEventListener("click", function () {
    var restoreTarget = plotMenu._trigger;
    closePlotMenu(false);
    openConfirm("clear", restoreTarget);
  });
  plotMenu.querySelector("[data-plot-help]").addEventListener("click", function () {
    if (graphHelp.hidden) openGraphHelp(plotMenu.querySelector("[data-plot-help]")); else closeGraphHelp(true);
  });
  graphHelp.querySelector("[data-graph-help-close]").addEventListener("click", function () { closeGraphHelp(true); });

  layoutTrigger.addEventListener("click", function (event) {
    event.stopPropagation();
    if (layoutPopover.hidden) openLayoutPopover(); else closeLayoutPopover(true);
  });
  layoutPopover.querySelector("[data-layout-close]").addEventListener("click", function () { closeLayoutPopover(true); });
  layoutPopover.querySelector("[data-layout-cancel]").addEventListener("click", function () { closeLayoutPopover(true); });
  layoutPopover.querySelector("[data-layout-apply]").addEventListener("click", function () {
    state.appliedRows = state.layoutRows;
    state.appliedColumns = state.layoutColumns;
    renderPlots();
    renderSettings();
    closeLayoutPopover(true);
    showToast("Макет " + state.layoutRows + " × " + state.layoutColumns + " применён");
  });

  toast.querySelector("[data-toast-close]").addEventListener("click", hideToast);

  document.addEventListener("pointerover", function (event) {
    var target = event.target.closest("[data-tooltip]");
    if (target && target !== state.tooltipTarget) showTooltip(target);
  });
  document.addEventListener("pointerout", function (event) {
    var target = event.target.closest("[data-tooltip]");
    if (target && !target.contains(event.relatedTarget)) hideTooltip(false);
  });
  document.addEventListener("focusin", function (event) {
    var target = event.target.closest && event.target.closest("[data-tooltip]");
    if (target) showTooltip(target);
  });
  document.addEventListener("focusout", function (event) {
    var target = event.target.closest && event.target.closest("[data-tooltip]");
    if (target && !target.contains(event.relatedTarget)) hideTooltip(false);
  });

  document.addEventListener("pointerdown", function (event) {
    var opensBlockingDialog = addTrigger.contains(event.target);
    var opensScreenDelete = !!event.target.closest("[data-screen-close]");
    if (!selectMenu.hidden && !selectMenu.contains(event.target) && !event.target.closest("[data-select-key]") && !opensBlockingDialog) closeSelect(false);
    if (!plotMenu.hidden && !plotMenu.contains(event.target) && !graphHelp.contains(event.target) && !event.target.closest("[data-plot-menu-trigger]") && !opensScreenDelete) closePlotMenu(false);
    if (!graphHelp.hidden && !graphHelp.contains(event.target) && !plotMenu.contains(event.target) && !opensScreenDelete) closeGraphHelp(false);
    if (!inspectorMenu.hidden && !inspectorMenu.contains(event.target) && event.target !== overflowTrigger) closeInspectorMenu(false);
    if (!layoutPopover.hidden && !layoutPopover.contains(event.target) && !layoutTrigger.contains(event.target) && !event.target.closest("[data-select-key]")) closeLayoutPopover(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Tab") {
      if (!screenDeleteLayer.hidden) trapTab(event, screenDeleteLayer);
      else if (!nestedLayer.hidden) trapTab(event, nestedLayer);
      else if (!addLayer.hidden) trapTab(event, addLayer);
      return;
    }
    if (event.key !== "Escape") return;
    if (!screenDeleteLayer.hidden) { closeScreenDelete(true); return; }
    if (!nestedLayer.hidden) { closeConfirm(true); return; }
    if (!addLayer.hidden) { requestCloseAdd(); return; }
    if (!graphHelp.hidden) { closeGraphHelp(true); return; }
    if (!selectMenu.hidden) { closeSelect(true); return; }
    if (!inspectorMenu.hidden) { closeInspectorMenu(true); return; }
    if (!plotMenu.hidden) { closePlotMenu(true); return; }
    if (!layoutPopover.hidden) closeLayoutPopover(true);
  });

  window.addEventListener("resize", function () {
    closeSelect(false);
    closePlotMenu(false);
    closeInspectorMenu(false);
    closeGraphHelp(false);
    if (!layoutPopover.hidden) openLayoutPopover();
    hideTooltip(true);
    updateDisplayScroll();
  });

  window.__TASK0057_DESIGN__ = {
    state: state,
    waitForPlots: function () { return plotRenderPromise; },
    render: function () { renderPlots(); renderSettings(); renderInspectorPage(); },
    resetTransient: function () {
      closeSelect(false); closePlotMenu(false); closeInspectorMenu(false); closeLayoutPopover(false);
      closeGraphHelp(false); closeScreenDelete(false); closeConfirm(false); closeAddDialog(false); hideTooltip(true); hideToast();
      state.busy = false; state.errors = {}; state.plotStatus = {};
      renderPlots(); renderSettings(); renderInspectorPage();
    }
  };

  renderPlots();
  renderSettings();
  renderInspectorPage();
  renderLayoutSegments();
  selectDisplayTab(displayTablist.querySelector(".display-tab"));
  requestAnimationFrame(updateDisplayScroll);
}());
