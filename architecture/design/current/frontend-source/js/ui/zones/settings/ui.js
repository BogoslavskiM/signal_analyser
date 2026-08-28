(function () {
  "use strict";
  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]; }); }
  var noHistory = " autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'";
  function group(id, title, body, collapsed) {
    return "<section class='settings-group" + (collapsed ? " is-collapsed" : "") + "' data-settings-group='" + id + "'><button class='settings-group-title' type='button' data-group-toggle aria-expanded='" + (!collapsed) + "'><span>" + title + "</span></button><div class='settings-group-body'>" + body + "</div></section>";
  }
  function row(label, control, title) { return "<div class='settings-row'><label class='settings-label'" + (title ? " title='" + title + "'" : "") + ">" + label + "</label><div>" + control + "</div></div>"; }
  function check(id, label, checked) { return "<label class='checkbox-field'><input type='checkbox' data-setting-toggle='" + id + "' " + (checked ? "checked" : "") + "><span>" + label + "</span></label>"; }
  function unitRow(kind) {
    if (kind === "frequency") return row("Единицы частоты", "<select class='field'><option value='auto'>Авто</option><option>Гц</option><option selected>кГц</option><option>МГц</option></select>");
    return row("Единицы времени", "<select class='field'><option value='auto'>Авто</option><option>с</option><option selected>мс</option><option>мкс</option><option>нс</option></select>");
  }
  function limits(id, title, unit, min, max) {
    var canonical = id.indexOf("frequency") >= 0 ? "hertz" : id.indexOf("time") >= 0 ? "seconds" : "axis";
    return "<div class='range-control' data-range-control='" + id + "' data-range-reset='double-click' data-canonical-unit='" + canonical + "' data-projected-unit='" + unit + "'><div class='settings-row range-control-label'><span class='settings-label'>" + title + "</span></div><div class='range-fields' data-range-boundary-validation><input class='field' type='text' inputmode='decimal' placeholder='Мин.' value='" + (min || "") + "' aria-label='Минимум' aria-invalid='false' data-range-part='min'" + noHistory + "><input class='field' type='text' inputmode='decimal' placeholder='Макс.' value='" + (max || "") + "' aria-label='Максимум' aria-invalid='false' data-range-part='max'" + noHistory + "></div><small class='range-boundary-message' role='alert' data-range-boundary-message hidden></small><div class='range-slider' role='group' aria-label='" + title + "'><i class='range-slider-track'></i><i class='range-slider-fill'></i><button class='range-slider-thumb min' type='button' role='slider' aria-label='Минимум'></button><button class='range-slider-thumb max' type='button' role='slider' aria-label='Максимум'></button></div><div class='range-caption'><span>полный диапазон</span><span>" + unit + "</span></div></div>";
  }
  function signalPage(state) {
    var s = state.signal;
    var main = row("Имя", "<input class='field' data-dirty-input data-signal-name value='" + esc(s.name) + "'" + noHistory + ">") +
      row("Цвет", "<div class='color-field'><button class='color-swatch-button' type='button' data-signal-color-trigger aria-label='Выбрать цвет'><i style='background:" + s.color + "'></i></button><input class='field' data-dirty-input data-signal-color-input data-signal-metadata='color' value='" + s.color + "'" + noHistory + "></div>") +
      row("Дискретизация, Гц", "<input class='field' type='text' inputmode='decimal' data-dirty-input data-signal-sample-rate data-signal-metadata='sample_rate_hz' value='" + s.sampleRate + "' aria-describedby='signal-sample-rate-error'" + noHistory + "><small id='signal-sample-rate-error' class='field-message is-error' role='alert' hidden>Введите положительное число через точку.</small>", "Дискретизация, Гц");
    var summaryMetrics = [
      ["Отсчёты", s.samples], ["Тип", s.type], ["Длительность", s.duration],
      ["Начало области", s.regionStart], ["Конец области", s.regionEnd],
      ["Минимум", s.minimum], ["Время минимума", s.minimumTime],
      ["Максимум", s.maximum], ["Время максимума", s.maximumTime],
      ["Среднее", s.mean], ["Медиана", s.median], ["Размах", s.peakToPeak], ["СКЗ", s.rms]
    ];
    var summary = "<div class='summary-grid'>" + summaryMetrics.map(function (metric) { return "<div class='summary-item' data-signal-summary-key='" + esc(metric[0]) + "'><span>" + esc(metric[0]) + "</span><strong>" + esc(metric[1] == null ? "—" : metric[1]) + "</strong></div>"; }).join("") + "</div>";
    return group("signal-main", "Основное", main) + group("signal-summary", "Сводка", summary);
  }
  function areaPage(state, pane) {
    var spectrum = pane.type === "spectrum";
    var main = row("Имя области", "<input class='field' data-dirty-input data-pane-name value='" + esc(pane.name) + "'" + noHistory + ">") + row("Тип графика", "<select class='field'><option>" + (spectrum ? "Спектр" : "Временная область") + "</option></select>");
    var params = row("Показывать легенду", check("legend", "", true)) + (spectrum ? unitRow("frequency") + row("Слайдер частоты", check("frequencySlider", "", pane.frequencySlider)) + row("Слайдер магнитуды", check("magnitudeSlider", "", pane.magnitudeSlider)) : unitRow("time") + row("Слайдер диапазона", check("timeSlider", "", true)) + row("Слайдер амплитуды", check("amplitudeSlider", "", true)));
    var result = group("area-main", "Основное", main) + group("area-params", "Параметры", params);
    var rangeBody="";
    if (spectrum) {
      if (!state.links.spectrumFrequency) rangeBody += limits("area-frequency", "Пределы частоты", "кГц", "", "");
      if (!state.links.spectrumMagnitude) rangeBody += limits("area-magnitude", "Пределы магнитуды", "дБ", "−120", "");
      if (rangeBody) result += group("area-ranges", "Диапазоны", rangeBody);
      result += group("spectrum-analysis", "Спектральный анализ", row("Шкала", "<select class='field'><option>Децибелы</option><option>Линейная</option></select>") + row("Частотная шкала", "<select class='field'><option>Линейная</option><option>Логарифмическая</option></select>") + row("Окно", "<select class='field'><option>Ханна</option><option>Хэмминга</option><option>Блэкмана</option></select>") + row("Точки ДПФ", "<input class='field' type='number' value='4096'>") + row("Перекрытие", "<div class='unit-control'><input class='field' type='number' value='50'><span class='unit'>%</span></div>"), true);
    } else {
      if (!state.links.time) rangeBody += limits("area-time", "Пределы времени", "мс", "", "");
      if (!state.links.amplitude) rangeBody += limits("area-amplitude", "Пределы амплитуды", "", "−1", "1");
      if (rangeBody) result += group("area-ranges", "Диапазоны", rangeBody);
    }
    return result;
  }
  function screenPage(state, display) {
    var main = row("Имя экрана", "<input class='field' data-dirty-input data-display-name value='" + esc(display.name) + "'" + noHistory + ">");
    var links = row("Связать время", check("time", "", state.links.time)) + row("Связать амплитуду", check("amplitude", "", state.links.amplitude)) + row("Связать частоты спектров", check("spectrumFrequency", "", state.links.spectrumFrequency), "Связать частоты спектров") + row("Связать магнитуды спектров", check("spectrumMagnitude", "", state.links.spectrumMagnitude), "Связать магнитуды спектров");
    var units=(state.links.time ? unitRow("time") : "") + (state.links.spectrumFrequency ? unitRow("frequency") : "");
    var result = group("screen-main", "Основное", main) + group("layout", "Макет", "<div class='settings-row'><span class='settings-label'>Строки × столбцы</span><button class='field' type='button'>1 × 2</button></div>", true) + (units ? group("screen-params", "Параметры", units) : "") + group("screen-links", "Связь областей", links);
    var rangeBody="";
    if (state.links.time) rangeBody += limits("screen-time", "Пределы времени", "мс", "", "");
    if (state.links.amplitude) rangeBody += limits("screen-amplitude", "Пределы амплитуды", "", "−1", "1");
    if (state.links.spectrumFrequency) rangeBody += limits("screen-frequency", "Пределы частоты", "кГц", "0", "800");
    if (state.links.spectrumMagnitude) rangeBody += limits("screen-magnitude", "Пределы магнитуды", "дБ", "−120", "");
    if (rangeBody) result += group("screen-ranges", "Диапазоны", rangeBody);
    return result;
  }
  function peaksPage() {
    return group("peaks-calculation", "Расчёт экстремумов", row("Режим расчёта", "<select class='field'><option>Максимумы</option><option>Минимумы</option><option>Все экстремумы</option></select>") + row("Количество", "<input class='field' type='number' value='5'>") + row("Отсечка", "<div class='unit-control'><input class='field' type='text' value='−90'><span class='unit'>дБ</span></div>") + row("Мин. расстояние", "<div class='unit-control'><input class='field' type='text' value='12'><span class='unit'>бин</span></div>") + row("Порог", "<div class='unit-control'><input class='field' type='text' value='0'><span class='unit'>дБ</span></div>")) + group("peaks-presentation", "Отображение", row("Метки на графике", check("showPeakMarkers", "", true)) + "<div class='settings-row'><span class='settings-label'>Координата</span><span class='helper'>Частота выводится в выбранных единицах оси.</span></div>");
  }
  function render(state) {
    var display = window.SignalAnalyserZones.workspace.activeDisplay(state);
    var pane = display.panes.find(function (item) { return item.id === state.activePaneId; }) || display.panes[0];
    document.querySelector("[data-settings-context]").textContent = display.name + " · " + (pane ? pane.name : "Нет области");
    document.querySelectorAll("[data-settings-page]").forEach(function (tab) { var selected = tab.dataset.settingsPage === state.settingsPage; tab.setAttribute("aria-selected", String(selected)); tab.tabIndex = selected ? 0 : -1; tab.hidden = tab.dataset.settingsPage === "signal" && !pane; });
    var content = document.querySelector("[data-testid='settings-content']");
    if (!pane) content.innerHTML = "<p class='status-note info'>Добавьте область, чтобы открыть настройки.</p>";
    else if (state.settingsPage === "signal") content.innerHTML = signalPage(state);
    else if (state.settingsPage === "display") content.innerHTML = areaPage(state, pane);
    else if (state.settingsPage === "screen") content.innerHTML = screenPage(state, display);
    else content.innerHTML = peaksPage();
    document.querySelector("[data-testid='signal-values-action']").hidden = state.settingsPage !== "signal";
    var extremaActions=document.querySelector("[data-testid='settings-extrema-actions']");
    var extremaAction=document.querySelector("[data-testid='extrema-values']");
    var extremaClear=document.querySelector("[data-testid='extrema-clear']");
    extremaActions.hidden = state.settingsPage !== "peaks";
    if (window.SignalAnalyserExtremaAction) {
      window.SignalAnalyserExtremaAction.project(extremaAction, state.extremaCalculationStatus || (state.extrema && state.extrema.length ? "ready" : "idle"));
    }
    if (window.SignalAnalyserPaneExtrema) {
      window.SignalAnalyserPaneExtrema.projectClear(extremaClear,pane,state.extremaCalculationStatus === "pending");
    }
    document.querySelector("[data-testid='settings-footer']").hidden = state.settingsPage !== "peaks" && state.settingsPage !== "signal";
    document.querySelector("[data-testid='settings-panel']").dataset.applyState = state.dirty ? "dirty" : "pristine";
  }
  window.SignalAnalyserZones = window.SignalAnalyserZones || {};
  window.SignalAnalyserZones.settings = { render: render, limits: limits };
}());
