(function () {
  "use strict";
  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]; }); }
  function group(id, title, body, collapsed) {
    return "<section class='settings-group" + (collapsed ? " is-collapsed" : "") + "' data-settings-group='" + id + "'><button class='settings-group-title' type='button' data-group-toggle aria-expanded='" + (!collapsed) + "'><span>" + title + "</span></button><div class='settings-group-body'>" + body + "</div></section>";
  }
  function row(label, control, title) { return "<div class='settings-row'><label class='settings-label'" + (title ? " title='" + title + "'" : "") + ">" + label + "</label><div>" + control + "</div></div>"; }
  function check(id, label, checked) { return "<label class='checkbox-field'><input type='checkbox' data-setting-toggle='" + id + "' " + (checked ? "checked" : "") + "><span>" + label + "</span></label>"; }
  function limits(id, title, unit, min, max) {
    var units = id.indexOf("frequency") >= 0 ? "<div class='range-unit-row'><span>Единицы</span><select class='field'><option>auto</option><option>Гц</option><option selected>кГц</option><option>МГц</option></select></div>" : id.indexOf("time") >= 0 ? "<div class='range-unit-row'><span>Единицы</span><select class='field'><option>auto</option><option>с</option><option selected>мс</option><option>мкс</option><option>нс</option></select></div>" : "";
    return group(id, title, "<div class='range-control' data-range-control='" + id + "'>" + units + "<div class='range-fields'><input class='field' type='text' inputmode='decimal' placeholder='Мин.' value='" + (min || "") + "' aria-label='Минимум'><input class='field' type='text' inputmode='decimal' placeholder='Макс.' value='" + (max || "") + "' aria-label='Максимум'></div><div class='range-slider' role='group' aria-label='" + title + "'><i class='range-slider-track'></i><i class='range-slider-fill'></i><button class='range-slider-thumb min' type='button' role='slider' aria-label='Минимум'></button><button class='range-slider-thumb max' type='button' role='slider' aria-label='Максимум'></button></div><div class='range-caption'><span>полный диапазон</span><span>" + unit + "</span></div></div>");
  }
  function signalPage(state) {
    var s = state.signal;
    var main = row("Имя", "<input class='field' data-dirty-input data-signal-name value='" + esc(s.name) + "'>") +
      row("Цвет", "<div class='color-field'><button class='color-swatch-button' type='button' aria-label='Выбрать цвет'><i style='background:" + s.color + "'></i></button><input class='field' data-dirty-input value='" + s.color + "'></div>") +
      row("Дискретизация, Гц", "<input class='field' type='text' inputmode='decimal' data-dirty-input value='" + s.sampleRate + "'>", "Дискретизация, Гц");
    var summary = "<div class='summary-grid'><div class='summary-item'><span>Отсчёты</span><strong>" + s.samples.toLocaleString("ru-RU") + "</strong></div><div class='summary-item'><span>Тип</span><strong>" + s.type + "</strong></div><div class='summary-item'><span>Длительность</span><strong>" + s.duration + "</strong></div><div class='summary-item'><span>Среднее</span><strong>" + s.mean + "</strong></div><div class='summary-item'><span>Минимум</span><strong>" + s.minimum + "</strong></div><div class='summary-item'><span>Максимум</span><strong>" + s.maximum + "</strong></div><div class='summary-item'><span>СКЗ</span><strong>" + s.rms + "</strong></div></div><button class='ui-button summary-action' type='button' data-testid='signal-values-action'>Значения</button>";
    return group("signal-main", "Основное", main) + group("signal-summary", "Сводка", summary);
  }
  function areaPage(state, pane) {
    var spectrum = pane.type === "spectrum";
    var main = row("Имя области", "<input class='field' data-dirty-input data-pane-name value='" + esc(pane.name) + "'>") + row("Тип графика", "<select class='field'><option>" + (spectrum ? "Спектр" : "Временная область") + "</option></select>");
    var params = row("Показывать легенду", check("legend", "", true)) + (spectrum ? row("Слайдер частоты", check("frequencySlider", "", pane.frequencySlider)) + row("Слайдер магнитуды", check("magnitudeSlider", "", pane.magnitudeSlider)) : row("Слайдер диапазона", check("timeSlider", "", true)) + row("Слайдер амплитуды", check("amplitudeSlider", "", true)));
    var result = group("area-main", "Основное", main) + group("area-params", "Параметры", params);
    if (spectrum) {
      if (!state.links.spectrumFrequency) result += limits("area-frequency", "Пределы частоты", "кГц", "", "");
      if (!state.links.spectrumMagnitude) result += limits("area-magnitude", "Пределы магнитуды", "dB", "−120", "");
      result += group("spectrum-analysis", "Спектральный анализ", row("Шкала", "<select class='field'><option>Децибелы</option><option>Линейная</option></select>") + row("Частотная шкала", "<select class='field'><option>Линейная</option><option>Логарифмическая</option></select>") + row("Окно", "<select class='field'><option>Хэнна</option><option>Хэмминга</option><option>Блэкмана</option></select>") + row("Точки DFT", "<input class='field' type='number' value='4096'>") + row("Перекрытие", "<div class='unit-control'><input class='field' type='number' value='50'><span class='unit'>%</span></div>"), true);
    } else {
      if (!state.links.time) result += limits("area-time", "Пределы времени", "мс", "", "");
      if (!state.links.amplitude) result += limits("area-amplitude", "Пределы амплитуды", "", "−1", "1");
    }
    return result;
  }
  function screenPage(state, display) {
    var main = row("Имя экрана", "<input class='field' data-dirty-input data-display-name value='" + esc(display.name) + "'>");
    var links = row("Связать время", check("time", "", state.links.time)) + row("Связать амплитуду", check("amplitude", "", state.links.amplitude)) + row("Связать частоты спектров", check("spectrumFrequency", "", state.links.spectrumFrequency), "Связать частоты спектров") + row("Связать магнитуды спектров", check("spectrumMagnitude", "", state.links.spectrumMagnitude), "Связать магнитуды спектров");
    var result = group("screen-main", "Основное", main) + group("layout", "Макет", "<div class='settings-row'><span class='settings-label'>Строки × столбцы</span><button class='field' type='button'>1 × 2</button></div>", true) + group("screen-links", "Связь областей", links);
    if (state.links.time) result += limits("screen-time", "Пределы времени", "мс", "", "");
    if (state.links.amplitude) result += limits("screen-amplitude", "Пределы амплитуды", "", "−1", "1");
    if (state.links.spectrumFrequency) result += limits("screen-frequency", "Пределы частоты", "кГц", "0", "800");
    if (state.links.spectrumMagnitude) result += limits("screen-magnitude", "Пределы магнитуды", "dB", "−120", "");
    return result;
  }
  function peaksPage() {
    return group("peaks-calculation", "Расчёт экстремумов", row("Режим расчёта", "<select class='field'><option>Максимумы</option><option>Минимумы</option><option>Все экстремумы</option></select>") + row("Количество", "<input class='field' type='number' value='5'>") + row("Отсечка", "<div class='unit-control'><input class='field' type='text' value='−90'><span class='unit'>dB</span></div>") + row("Мин. расстояние", "<div class='unit-control'><input class='field' type='text' value='12'><span class='unit'>бин</span></div>") + row("Порог", "<div class='unit-control'><input class='field' type='text' value='0'><span class='unit'>dB</span></div>")) + group("peaks-presentation", "Отображение", row("Метки на графике", check("showPeakMarkers", "", true)) + "<div class='settings-row'><span class='settings-label'>Координата</span><span class='helper'>Частота выводится в выбранных единицах оси.</span></div>");
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
    document.querySelector("[data-testid='extrema-values']").hidden = state.settingsPage !== "peaks";
    document.querySelector("[data-testid='settings-panel']").dataset.applyState = state.dirty ? "dirty" : "pristine";
    document.querySelector("[data-testid='settings-apply']").disabled = !state.dirty;
  }
  window.SignalAnalyserZones = window.SignalAnalyserZones || {};
  window.SignalAnalyserZones.settings = { render: render, limits: limits };
}());
