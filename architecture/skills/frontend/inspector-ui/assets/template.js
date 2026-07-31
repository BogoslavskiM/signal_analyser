(function registerGenieInspectorUi(window) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function significantNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (number === 0) return "0";
    return String(Number(number.toPrecision(5)));
  }

  function formatCell(row, column, tooltip) {
    var cells = row && row.cells && typeof row.cells === "object" ? row.cells : {};
    var cell = cells[column.id] && typeof cells[column.id] === "object" ? cells[column.id] : { value: null };
    var value = cell.value;
    var units = String(cell.units || "");
    var text;
    if (value == null) return tooltip ? "" : "—";
    if (tooltip) text = String(value);
    else if (typeof value === "number") text = significantNumber(value);
    else text = Object.prototype.hasOwnProperty.call(column.abbreviations || {}, String(value)) ?
      String(column.abbreviations[String(value)]) : String(value);
    return units ? text + " " + units : text;
  }

  function createInspectorUi(options) {
    var config = options || {};
    var handlers = config.actions || {};
    var root = null;
    var state = {
      title: config.title || "Объекты",
      description: config.description || "Выберите объекты для отображения:",
      searchQuery: "", visibleColumnIds: [], columnsMenuOpen: false, columnsMenuStyle: "",
      pendingActions: {}, columnsInitialized: false, knownColumnIds: [], requestId: 0,
      table: { name_label: "Name", columns: [], rows: [], order: [], main_object: "", selected_objects: [] },
    };

    function orderedRows() {
      var byId = {};
      state.table.rows.forEach(function (row) { byId[String(row.id)] = row; });
      return state.table.order.map(function (id) { return byId[String(id)]; }).filter(Boolean);
    }

    function filteredRows() {
      var query = state.searchQuery.trim().toLowerCase();
      return orderedRows().filter(function (row) {
        return !query || String(row.name || "").toLowerCase().includes(query);
      });
    }

    function visibleColumns() {
      return state.table.columns.filter(function (column) { return state.visibleColumnIds.includes(String(column.id)); });
    }

    function isPending(key) { return state.pendingActions[String(key)] === true; }
    function isSelected(id) {
      return String(state.table.main_object) === String(id) ||
        state.table.selected_objects.map(String).includes(String(id));
    }

    function run(name, payload, key) {
      var handler = handlers[name];
      var pendingKey = String(key || name);
      var requestId;
      if (isPending(pendingKey)) return Promise.resolve(null);
      if (typeof handler !== "function") return Promise.reject(new Error("Inspector action is not configured: " + name));
      requestId = ++state.requestId;
      state.pendingActions[pendingKey] = true; render();
      return Promise.resolve(handler(payload)).then(function (response) {
        if (requestId === state.requestId && response && response.table) actions.setTable(response.table);
        return response;
      }).catch(function (error) {
        if (typeof config.reportError === "function") { config.reportError(error, "inspector-" + name); return null; }
        throw error;
      }).finally(function () { delete state.pendingActions[pendingKey]; render(); });
    }

    function rowActions(row) {
      return '<div class="inspector-row-actions"><button class="inspector-row-action icon-copy" type="button"' +
        ' data-inspector-action="duplicate" data-row-id="' + escapeHtml(row.id) + '" aria-label="Дублировать"' +
        (isPending("duplicate:" + row.id) ? " disabled" : "") + '></button>' +
        '<button class="inspector-row-action inspector-action-danger icon-trash" type="button" data-inspector-action="delete"' +
        ' data-row-id="' + escapeHtml(row.id) + '" aria-label="Удалить"' +
        (isPending("delete:" + row.id) ? " disabled" : "") + "></button></div>";
    }

    function render() {
      var columns = visibleColumns();
      var rows = filteredRows();
      var tracks = ["minmax(34px,34px)", "minmax(170px,1.6fr)"].concat(columns.map(function (column) {
        return "minmax(" + String(column.min_width || "72px") + "," + String(column.max_width || "1fr") + ")";
      })).join(" ");
      var header = state.table.columns.length ? '<div class="inspector-row inspector-header" style="grid-template-columns:' +
        escapeHtml(tracks) + '" role="row"><div class="inspector-header-cell inspector-check-cell"><input class="inspector-checkbox"' +
        ' type="checkbox" data-inspector-select-all aria-label="Выбрать все найденные объекты"' +
        (rows.length && rows.every(function (row) { return isSelected(row.id); }) ? " checked" : "") + '></div>' +
        '<div class="inspector-header-cell inspector-name-cell">' + escapeHtml(state.table.name_label) + "</div>" +
        columns.map(function (column) { return '<div class="inspector-header-cell">' + escapeHtml(column.label) + "</div>"; }).join("") +
        "</div>" : "";
      var body = rows.map(function (row) {
        var cells = columns.map(function (column, index) {
          return '<div class="inspector-cell' + (index === columns.length - 1 ? " inspector-actions-host" : "") +
            '" data-tooltip="' + escapeHtml(formatCell(row, column, true)) + '"><span class="inspector-cell-value">' +
            escapeHtml(formatCell(row, column, false)) + "</span>" + (index === columns.length - 1 ? rowActions(row) : "") + "</div>";
        }).join("");
        return '<div class="inspector-row inspector-item' + (String(row.id) === String(state.table.main_object) ? " selected" : "") +
          '" style="grid-template-columns:' + escapeHtml(tracks) + '" role="row" data-inspector-row="' + escapeHtml(row.id) + '">' +
          '<div class="inspector-cell inspector-check-cell"><input class="inspector-checkbox" type="checkbox" data-inspector-select="' +
          escapeHtml(row.id) + '" aria-label="Выбрать ' + escapeHtml(row.name) + '"' + (isSelected(row.id) ? " checked" : "") +
          '></div><div class="inspector-cell inspector-name-cell' + (!columns.length ? " inspector-actions-host" : "") +
          '"><span class="inspector-name">' + escapeHtml(row.name) + "</span>" + (!columns.length ? rowActions(row) : "") +
          "</div>" + cells + "</div>";
      }).join("");
      var menu = state.columnsMenuOpen ? '<div class="inspector-columns-menu" data-inspector-columns-menu style="' +
        escapeHtml(state.columnsMenuStyle) + '"><div class="inspector-columns-menu-title">Скрыть/показать</div>' +
        state.table.columns.map(function (column) {
          return '<button class="inspector-columns-menu-item" type="button" data-inspector-column="' + escapeHtml(column.id) + '"><span>' +
            escapeHtml(column.label) + '</span><span class="inspector-columns-menu-state' +
            (state.visibleColumnIds.includes(String(column.id)) ? " visible" : "") + '"></span></button>';
        }).join("") + "</div>" : "";
      var html = '<section class="inspector-panel"><h2 class="inspector-title">' + escapeHtml(state.title) +
        '</h2><p class="inspector-description">' + escapeHtml(state.description) + '</p><div class="inspector-window">' +
        '<div class="inspector-toolbar"><div class="inspector-search-control"><span class="inspector-search-icon"></span>' +
        '<input class="inspector-search" type="search" data-inspector-search placeholder="Введите название" value="' +
        escapeHtml(state.searchQuery) + '">' + (state.searchQuery ? '<button class="inspector-search-clear" type="button" data-inspector-clear aria-label="Очистить поиск"></button>' : "") +
        '</div><div class="inspector-toolbar-actions"><button class="inspector-action-button icon-plus" type="button" data-inspector-action="create" aria-label="Добавить"></button>' +
        '<button class="inspector-action-button icon-copy" type="button" data-inspector-action="duplicate" data-row-id="' + escapeHtml(state.table.main_object) + '" aria-label="Дублировать"></button>' +
        '<button class="inspector-action-button inspector-action-danger icon-trash" type="button" data-inspector-action="delete" data-row-id="' + escapeHtml(state.table.main_object) + '" aria-label="Удалить"></button>' +
        (state.table.columns.length ? '<button class="inspector-action-button icon-more-vertical" type="button" data-inspector-columns-toggle aria-label="Настроить столбцы"></button>' : "") +
        menu + '</div></div><div class="inspector-scroll"><div class="inspector-table' +
        (state.table.columns.length ? "" : " inspector-headerless-list") + '">' + header + body +
        (state.searchQuery && !rows.length ? '<div class="inspector-filter-empty">Таких элементов не найдено</div>' : "") +
        "</div></div></div></section>";
      if (root) root.innerHTML = html;
      return html;
    }

    var actions = {
      setTable: function (table) {
        var previousKnown = state.knownColumnIds.slice();
        state.table = Object.assign({ name_label: "Name", columns: [], rows: [], order: [], main_object: "", selected_objects: [] }, table || {});
        state.knownColumnIds = state.table.columns.map(function (column) { return String(column.id); });
        if (!state.columnsInitialized) {
          state.visibleColumnIds = state.table.columns.filter(function (column) { return column.default_visible !== false; })
            .map(function (column) { return String(column.id); });
          state.columnsInitialized = true;
        } else {
          state.visibleColumnIds = state.visibleColumnIds.filter(function (id) { return state.knownColumnIds.includes(id); });
          state.table.columns.forEach(function (column) {
            var id = String(column.id);
            if (!previousKnown.includes(id) && column.default_visible !== false) state.visibleColumnIds.push(id);
          });
        }
        render();
      },
      search: function (value) { state.searchQuery = String(value || ""); render(); },
      toggleColumn: function (id) {
        id = String(id); state.visibleColumnIds = state.visibleColumnIds.includes(id) ?
          state.visibleColumnIds.filter(function (value) { return value !== id; }) : state.visibleColumnIds.concat(id); render();
      },
      create: function () { return run("create", null, "create"); },
      duplicate: function (id) { return run("duplicate", { id: id }, "duplicate:" + id); },
      remove: function (id) { return run("delete", { id: id }, "delete:" + id); },
      setMain: function (id) { return run("setMain", { id: id }, "main:" + id); },
      setSelected: function (id, selected) {
        return run("setSelected", { id: id, selected: selected }, "select:" + id);
      },
      setFilteredSelected: function (selected) {
        var ids = filteredRows().map(function (row) { return String(row.id); });
        return run("setBulkSelected", { ids: ids, selected: selected }, "bulk-select");
      },
    };

    function onInput(event) { if (event.target.matches("[data-inspector-search]")) actions.search(event.target.value); }
    function onChange(event) {
      var id = event.target.getAttribute("data-inspector-select");
      if (id != null) return actions.setSelected(id, event.target.checked);
      if (event.target.matches("[data-inspector-select-all]")) actions.setFilteredSelected(event.target.checked);
    }
    function onClick(event) {
      var node = event.target.closest("[data-inspector-action]");
      var row = event.target.closest("[data-inspector-row]");
      var column = event.target.closest("[data-inspector-column]");
      if (event.target.closest("[data-inspector-clear]")) return actions.search("");
      var toggle = event.target.closest("[data-inspector-columns-toggle]");
      if (toggle) {
        var rect = toggle.getBoundingClientRect();
        state.columnsMenuOpen = !state.columnsMenuOpen;
        state.columnsMenuStyle = "top:" + (rect.bottom + 6) + "px;right:" + Math.max(8, window.innerWidth - rect.right) + "px";
        return render();
      }
      if (column) return actions.toggleColumn(column.getAttribute("data-inspector-column"));
      if (node) {
        event.stopPropagation();
        if (node.dataset.inspectorAction === "create") return actions.create();
        if (node.dataset.inspectorAction === "duplicate") return actions.duplicate(node.dataset.rowId);
        if (node.dataset.inspectorAction === "delete") return actions.remove(node.dataset.rowId);
      }
      if (row && !event.target.matches("input,button")) actions.setMain(row.getAttribute("data-inspector-row"));
    }
    function onDocumentClick(event) {
      if (state.columnsMenuOpen && !event.target.closest("[data-inspector-columns-menu],[data-inspector-columns-toggle]")) {
        state.columnsMenuOpen = false; render();
      }
    }

    function mount(element) {
      if (!element) throw new Error("Inspector mount root is required"); if (root) unmount(); root = element;
      root.addEventListener("input", onInput); root.addEventListener("change", onChange); root.addEventListener("click", onClick);
      window.document.addEventListener("click", onDocumentClick);
      render(); return module;
    }
    function unmount() {
      if (!root) return; root.removeEventListener("input", onInput); root.removeEventListener("change", onChange);
      root.removeEventListener("click", onClick); root.innerHTML = ""; root = null;
      window.document.removeEventListener("click", onDocumentClick);
    }
    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieInspectorUi = { create: createInspectorUi, formatCell: formatCell };
})(window);
