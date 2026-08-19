(function () {
  "use strict";
  var base = function () { return window.SignalAnalyserUIBase; };
  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]; }); }
  function activeDisplay(state) { return state.displays.find(function (item) { return item.id === state.activeDisplayId; }) || state.displays[0]; }
  function spectrumSvg() {
    return "<svg class='plot-svg' viewBox='0 0 100 60' preserveAspectRatio='none' aria-label='Спектр с тремя отмеченными экстремумами'>" +
      "<path class='plot-gridline' d='M0 15H100M0 30H100M0 45H100M25 0V60M50 0V60M75 0V60'/><path class='plot-axis' d='M0 0V60H100'/>" +
      "<path class='plot-line' d='M0 54 L6 51 L11 49 L18 46 L25 44 L31 40 L35 34 L39 8 L42 30 L46 41 L52 44 L58 46 L64 47 L70 48 L76 49 L82 50 L88 51 L94 51 L100 52'/>" +
      "<circle class='plot-peak' cx='39' cy='8' r='1.8'/><text class='plot-peak-label' x='41' y='7'>1</text><circle class='plot-peak' cx='62' cy='46.5' r='1.8'/><text class='plot-peak-label' x='64' y='45'>2</text><circle class='plot-peak' cx='82' cy='50' r='1.8'/><text class='plot-peak-label' x='84' y='48.5'>3</text></svg>";
  }
  function timeSvg() {
    return "<svg class='plot-svg' viewBox='0 0 100 60' preserveAspectRatio='none' aria-label='Временная область'>" +
      "<path class='plot-gridline' d='M0 15H100M0 30H100M0 45H100M25 0V60M50 0V60M75 0V60'/><path class='plot-axis' d='M0 0V60H100M0 30H100'/>" +
      "<path class='plot-line' d='M0 30 L5 12 L10 49 L15 13 L20 48 L25 12 L30 49 L35 13 L40 48 L45 12 L50 49 L55 13 L60 48 L65 12 L70 49 L75 13 L80 48 L85 12 L90 49 L95 13 L100 30'/></svg>";
  }
  function paneMarkup(pane, active) {
    var spectrum = pane.type === "spectrum";
    return "<article class='plot-pane" + (active ? " is-active" : "") + "' data-pane-id='" + esc(pane.id) + "' data-testid='plot-pane-" + esc(pane.id) + "' tabindex='0'>" +
      "<header class='plot-pane-header'><span class='plot-pane-name'>" + esc(pane.name) + "</span><button class='plot-type' type='button'>" + (spectrum ? "Спектр" : "Временная область") + "</button><button class='header-chrome-button' type='button' aria-label='Меню области'><img src='" + base() + "/icons/more-vertical.svg' alt=''></button></header>" +
      "<div class='plot-canvas'>" + (spectrum ? spectrumSvg() : timeSvg()) +
      "<span class='plot-axis-label x'>" + (spectrum ? "Частота, кГц" : "Время, мс") + "</span><span class='plot-axis-label y'>" + (spectrum ? "Магнитуда, dB" : "Амплитуда") + "</span>" +
      "<div class='plot-legend'><div class='legend-row'><i class='legend-line'></i><span>radarPulse</span></div></div>" +
      (spectrum && pane.frequencySlider ? "<div class='plot-horizontal-slider' data-testid='pane-frequency-slider'><i class='slider-track'></i><i class='slider-window'></i><button class='slider-handle min' aria-label='Минимальная частота'></button><button class='slider-handle max' aria-label='Максимальная частота'></button></div>" : "") +
      (spectrum && pane.magnitudeSlider ? "<div class='plot-vertical-slider' data-testid='pane-magnitude-slider'><i class='slider-track'></i><i class='slider-window'></i><button class='slider-handle max' aria-label='Максимальная магнитуда'></button><button class='slider-handle min' aria-label='Минимальная магнитуда'></button></div>" : "") +
      "</div></article>";
  }
  function render(state) {
    var tabs = document.querySelector("[data-testid='display-tabs']");
    tabs.innerHTML = state.displays.map(function (display) {
      var selected = display.id === state.activeDisplayId;
      return "<div class='display-tab-shell' aria-selected='" + selected + "'><button class='display-tab' type='button' role='tab' data-display-id='" + esc(display.id) + "' aria-selected='" + selected + "'><span>" + esc(display.name) + "</span></button><button class='display-tab-close' type='button' data-close-display='" + esc(display.id) + "' aria-label='Удалить " + esc(display.name) + "'><img src='" + base() + "/icons/close.svg' alt=''></button></div>";
    }).join("");
    var display = activeDisplay(state);
    document.querySelector("[data-testid='plot-grid']").innerHTML = display.panes.length ? display.panes.map(function (pane) { return paneMarkup(pane, pane.id === state.activePaneId); }).join("") : "<div class='status-note info'>В этом экране пока нет областей.</div>";
  }
  window.SignalAnalyserZones = window.SignalAnalyserZones || {};
  window.SignalAnalyserZones.workspace = { render: render, activeDisplay: activeDisplay };
}());
