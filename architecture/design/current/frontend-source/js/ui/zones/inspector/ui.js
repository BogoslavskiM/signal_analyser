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
    var helper=window.SignalAnalyserExtremaTableActions;
    var status=state.extremaCalculationStatus || (state.extrema.length ? "ready" : "idle");
    var view=helper ? helper.presentation(status,state.extrema.length) : {layout:state.extrema.length?"table":"surface"};
    if (view.layout === "surface") return helper ? helper.surfaceMarkup(status,true) : "";
    var actions=helper ? helper.headerActionsMarkup(base()+"/icons") : "";
    return "<div class='data-table-wrap extrema-table-wrap' style='height:100%' data-testid='peaks-table'><table class='data-table'><thead><tr><th style='width:6%'>№</th><th style='width:24%'>Сигнал</th><th style='width:8%'>Цвет</th><th style='width:14%'>Тип</th><th style='width:16%'>Магнитуда</th><th style='width:18%'>Частота</th><th style='width:14%'>Метка</th>"+actions+"</tr></thead><tbody>" + state.extrema.map(function (x) { return "<tr><td>" + x.n + "</td><td>" + x.signal + "</td><td><i class='table-swatch' style='background:" + x.color + "'></i></td><td>" + x.type + "</td><td>" + x.value + "</td><td>" + x.position + "</td><td class='extrema-marker-cell'>" + x.marker + "</td><td aria-hidden='true'></td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function samples(state) {
    var page=state.samplePage || { start_offset:0, end_offset:state.sampleRows.length, next_cursor:null, total:state.sampleRows.length };
    var start=Number.isSafeInteger(Number(page.start_offset)) ? Number(page.start_offset) : 0;
    var end=Number.isSafeInteger(Number(page.end_offset)) ? Number(page.end_offset) : start + state.sampleRows.length;
    var searchError=String(state.sampleSearchError || "");
    var helper=window.SignalSamplesCalculatedColumns;
    var visible=helper ? helper.normalizeVisibility(state.sampleColumnVisibility) : {magnitude:false,square:false,signed_square_root_magnitude:false};
    var columns=helper ? helper.visibleColumns(visible) : [{id:"sample_index",label:"№ точки"},{id:"time",label:"Время"},{id:"value",label:"Значение"}];
    var width=helper ? helper.minimumTableWidth(visible) : 447;
    return "<div class='samples-point-search-row'><div class='inspector-search-field'><span class='search-icon' aria-hidden='true'></span><input type='search' inputmode='numeric' data-testid='sample-point-search-input' aria-label='Перейти к номеру точки' placeholder='Введите номер точки' autocomplete='off'></div>"+(searchError ? "<span class='samples-point-search-status' data-state='error' data-testid='sample-point-search-status' role='alert'>"+esc(searchError)+"</span>" : "")+"<button class='inspector-action samples-columns-menu-trigger' type='button' data-testid='sample-columns-menu-trigger' data-tooltip='Видимость столбцов' aria-label='Выбрать отображаемые столбцы' aria-haspopup='menu' aria-controls='sample-columns-menu' aria-expanded='false'><img src='"+base()+"/icons/more-vertical.svg' alt=''></button></div><div class='data-table-wrap' style='height:100%;position:relative'><table class='data-table sample-table' data-calculated-columns style='--sample-table-min-width:"+width+"px'><thead><tr>"+columns.map(function(column){return "<th data-sample-column='"+column.id+"'>"+column.label+"</th>";}).join("")+"</tr></thead><tbody>" + state.sampleRows.map(function (row) { return "<tr>" + columns.map(function (column) { return "<td data-sample-column='"+column.id+"'>"+(row[column.id] == null ? "—" : row[column.id])+"</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table><div class='samples-footer'><span>" + (start+1) + "–" + end + " из " + page.total + "</span></div></div>";
  }
  function render(state) {
    document.querySelector("[data-testid='inspector-tabs']").innerHTML = tabs(state);
    var display=window.SignalAnalyserZones.workspace.activeDisplay(state);
    var activePane=display && (display.panes.find(function (item) { return item.id === state.activePaneId; }) || display.panes[0]);
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
