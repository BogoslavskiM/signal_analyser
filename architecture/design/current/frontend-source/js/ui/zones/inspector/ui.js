(function () {
  "use strict";
  var base = function () { return window.SignalAnalyserUIBase; };
  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]; }); }
  function tabs(state) {
    var items = [["signals","Сигналы"],["measurements","Измерения"],["peaks","Экстремумы"]];
    if (state.mainSignalName) items.push(["samples",state.signal.name]);
    return items.map(function (item) { var selected = state.inspectorPage === item[0]; return "<button type='button' role='tab' data-inspector-page='" + item[0] + "' aria-selected='" + selected + "' tabindex='" + (selected ? 0 : -1) + "'>" + esc(item[1]) + "</button>"; }).join("");
  }
  function signals(state) {
    var rows = state.signals.map(function (s) {
      var main=s.name === state.mainSignalName;
      return "<tr class='" + (main ? "is-main-signal" : "") + "' data-signal-row='" + esc(s.name) + "' data-main-signal='" + main + "' data-stable-row-key='" + esc(s.name) + "'" + (main ? " aria-current='true'" : "") + "><td><input class='ui-checkbox' type='checkbox' data-signal-visible='" + esc(s.name) + "' data-stable-checkbox-key='" + esc(s.name) + "' aria-label='Показывать " + esc(s.name) + "'" + (s.visible ? " checked" : "") + "></td><td><div class='row-name-cell'><span>" + esc(s.name) + "</span><span class='signal-row-actions'><button class='signal-row-action' type='button' aria-label='Дублировать " + esc(s.name) + "'><img src='" + base() + "/icons/copy.svg' alt=''></button><button class='signal-row-action operation' type='button' data-signal-operation='" + esc(s.name) + "' data-testid='signal-operation-" + esc(s.name) + "' aria-label='Операция над " + esc(s.name) + "'><img src='" + base() + "/icons/function.svg' alt=''></button><button class='signal-row-action' type='button' aria-label='Удалить " + esc(s.name) + "'><img src='" + base() + "/icons/trash.svg' alt=''></button></span></div></td><td><i class='table-swatch' style='background:" + s.color + "'></i></td><td>" + s.sampleRate + "</td><td>" + s.count + "</td><td>" + s.duration + "</td><td>" + s.type + "</td></tr>";
    }).join("");
    return "<div class='inspector-toolbar'><label class='inspector-search'><img src='" + base() + "/icons/search.svg' alt=''><input type='search' placeholder='Введите название' aria-label='Поиск сигналов' autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'></label><div class='inspector-actions'><button class='inspector-action' type='button' aria-label='Добавить сигнал'><img src='" + base() + "/icons/plus.svg' alt=''></button><button class='inspector-action' type='button' aria-label='Другие действия'><img src='" + base() + "/icons/more-vertical.svg' alt=''></button></div></div><div class='data-table-wrap' data-preserve-checkboxes aria-busy='false'><table class='data-table'><thead><tr><th style='width:42px'></th><th style='width:28%'>Имя</th><th style='width:8%'>Цвет</th><th style='width:16%'>Частота дискретизации</th><th style='width:14%'>Отсчёты</th><th style='width:14%'>Длительность</th><th style='width:14%'>Тип</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
  }
  function measurements(state) {
    return "<div class='data-table-wrap' style='height:100%'><table class='data-table'><thead><tr><th>Имя</th><th>Цвет</th><th>Начало области</th><th>Конец области</th><th>Минимум</th><th>Время минимума</th><th>Максимум</th><th>Время максимума</th><th>Среднее</th><th>Медиана</th><th>Размах</th><th>СКЗ</th></tr></thead><tbody><tr><td>" + esc(state.signal.name) + "</td><td><i class='table-swatch' style='background:" + esc(state.signal.color) + "'></i></td><td>" + state.signal.regionStart + "</td><td>" + state.signal.regionEnd + "</td><td>" + state.signal.minimum + "</td><td>" + state.signal.minimumTime + "</td><td>" + state.signal.maximum + "</td><td>" + state.signal.maximumTime + "</td><td>" + state.signal.mean + "</td><td>" + state.signal.median + "</td><td>" + state.signal.peakToPeak + "</td><td>" + state.signal.rms + "</td></tr></tbody></table></div>";
  }
  function peaks(state) {
    return "<div class='data-table-wrap' style='height:100%'><table class='data-table'><thead><tr><th style='width:6%'>№</th><th style='width:24%'>Сигнал</th><th style='width:8%'>Цвет</th><th style='width:14%'>Тип</th><th style='width:16%'>Магнитуда</th><th style='width:18%'>Частота</th><th style='width:14%'>Метка</th></tr></thead><tbody>" + state.extrema.map(function (x) { return "<tr><td>" + x.n + "</td><td>" + x.signal + "</td><td><i class='table-swatch' style='background:" + x.color + "'></i></td><td>" + x.type + "</td><td>" + x.value + "</td><td>" + x.position + "</td><td class='extrema-marker-cell'>" + x.marker + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function samples(state) {
    var page=state.samplePage || { cursor:0, limit:state.sampleRows.length, nextCursor:null, total:state.sampleRows.length };
    var end=page.cursor + state.sampleRows.length;
    return "<div class='data-table-wrap' style='height:100%;position:relative'><table class='data-table sample-table'><thead><tr><th>№ точки</th><th>Время</th><th>Значение</th><th>Модуль</th><th>Квадрат</th></tr></thead><tbody>" + state.sampleRows.map(function (row) { return "<tr>" + row.map(function (cell) { return "<td>" + cell + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table><div class='samples-footer'><span>Показаны строки " + (page.cursor+1) + "–" + end + "</span><span>" + page.total + " отсчётов · следующая страница с " + page.nextCursor + "</span></div></div>";
  }
  function render(state) {
    document.querySelector("[data-testid='inspector-tabs']").innerHTML = tabs(state);
    var body = document.querySelector("[data-testid='inspector-content']");
    if (state.inspectorPage === "signals" && body.dataset.inspectorPage === "signals" && state.signalMembershipBusy) {
      var stable=body.querySelector("[data-preserve-checkboxes]");
      if (stable) stable.setAttribute("aria-busy", "true");
      body.querySelectorAll("[data-stable-checkbox-key]").forEach(function (checkbox) { checkbox.disabled=true; });
      return;
    }
    body.innerHTML = state.inspectorPage === "signals" ? signals(state) : state.inspectorPage === "measurements" ? measurements(state) : state.inspectorPage === "peaks" ? peaks(state) : samples(state);
    body.dataset.inspectorPage = state.inspectorPage;
  }
  window.SignalAnalyserZones = window.SignalAnalyserZones || {};
  window.SignalAnalyserZones.inspector = { render: render };
}());
