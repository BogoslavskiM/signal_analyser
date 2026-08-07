(function registerGenieInspectorUi(window, document) {
  "use strict";

  function significantNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (number === 0) return "0";
    return String(Number(number.toPrecision(5)));
  }

  function cellObject(row, columnId) {
    var cells = row && row.cells && typeof row.cells === "object" ? row.cells : {};
    var cell = cells[columnId];
    return cell && typeof cell === "object" ? cell : { value: null, units: "" };
  }

  function formatCell(row, column) {
    var cell = cellObject(row, column.id);
    var value = cell.value;
    var units = String(cell.units || "");
    var abbreviations = column.abbreviations || {};
    var displayValue;

    if (value == null) return "—";
    if (typeof value === "number") {
      displayValue = significantNumber(value);
    } else {
      displayValue = Object.prototype.hasOwnProperty.call(abbreviations, String(value)) ?
        abbreviations[String(value)] :
        String(value);
    }

    return units ? displayValue + " " + units : displayValue;
  }

  function cellTooltip(row, column) {
    var cell = cellObject(row, column.id);
    var units = String(cell.units || "");
    if (cell.value == null) return "";
    return units ? String(cell.value) + " " + units : String(cell.value);
  }

  function createInspectorUi(options) {
    var config = options || {};
    var actions = config.actions || {};
    var readContextKey = typeof config.contextKey === "function" ?
      config.contextKey :
      function () { return ""; };

    function action(name) {
      return typeof actions[name] === "function" ? actions[name] : function () {
        return Promise.reject(new Error("Inspector action is not configured: " + name));
      };
    }

    return {
      state: function () {
        return {
          inspectorUi: {
            title: config.title || "Объекты",
            description: config.description || "Выберите объекты для отображения:",
            searchQuery: "",
            visibleColumnIds: [],
            knownColumnIds: [],
            columnsInitialized: false,
            columnsMenuOpen: false,
            columnsMenuStyle: {},
            pendingActions: {},
            tableRequestId: 0,
          },
        };
      },
      computed: {
        inspectorTable: function () {
          return this.inspector && this.inspector.table ? this.inspector.table : {
            name_label: "Name",
            columns: [],
            rows: [],
            order: [],
            main_object: "",
            selected_objects: [],
          };
        },
        inspectorHasHeaders: function () {
          return Array.isArray(this.inspectorTable.columns) && this.inspectorTable.columns.length > 0;
        },
        orderedInspectorRows: function () {
          var rows = Array.isArray(this.inspectorTable.rows) ? this.inspectorTable.rows : [];
          var order = Array.isArray(this.inspectorTable.order) ? this.inspectorTable.order : [];
          var byId = {};
          rows.forEach(function (row) {
            byId[String(row.id)] = row;
          });
          return order.map(function (id) {
            return byId[String(id)];
          }).filter(Boolean);
        },
        filteredInspectorRows: function () {
          var query = String(this.inspectorUi.searchQuery || "").trim().toLowerCase();
          if (!query) return this.orderedInspectorRows;
          return this.orderedInspectorRows.filter(function (row) {
            return String(row.name || "").toLowerCase().includes(query);
          });
        },
        visibleInspectorColumns: function () {
          var visible = this.inspectorUi.visibleColumnIds || [];
          return (this.inspectorTable.columns || []).filter(function (column) {
            return visible.includes(column.id);
          });
        },
        allFilteredInspectorRowsChecked: function () {
          var self = this;
          return this.filteredInspectorRows.length > 0 && this.filteredInspectorRows.every(function (row) {
            return self.isInspectorRowChecked(row.id);
          });
        },
        inspectorGridStyle: function () {
          var tracks = ["minmax(34px, 34px)", "minmax(170px, 1.6fr)"];
          this.visibleInspectorColumns.forEach(function (column) {
            tracks.push(
              "minmax(" + String(column.min_width || "72px") + ", " +
              String(column.max_width || "1fr") + ")"
            );
          });
          return { gridTemplateColumns: tracks.join(" ") };
        },
      },
      watch: {
        "inspector.table.columns": {
          handler: function () {
            this.syncInspectorVisibleColumns();
          },
          deep: true,
        },
      },
      methods: {
        syncInspectorVisibleColumns: function () {
          var columns = this.inspectorTable.columns || [];
          var ids = columns.map(function (column) { return column.id; });
          var known = this.inspectorUi.knownColumnIds || [];
          var visible = this.inspectorUi.visibleColumnIds || [];

          if (!this.inspectorUi.columnsInitialized) {
            visible = columns.filter(function (column) {
              return column.default_visible !== false;
            }).map(function (column) {
              return column.id;
            });
          } else {
            columns.forEach(function (column) {
              if (!known.includes(column.id) && column.default_visible !== false) {
                visible.push(column.id);
              }
            });
            visible = visible.filter(function (id) {
              return ids.includes(id);
            });
          }

          this.inspectorUi.visibleColumnIds = Array.from(new Set(visible));
          this.inspectorUi.knownColumnIds = ids;
          this.inspectorUi.columnsInitialized = true;
        },
        isInspectorRowChecked: function (rowId) {
          var id = String(rowId || "");
          return id === String(this.inspectorTable.main_object || "") ||
            (this.inspectorTable.selected_objects || []).map(String).includes(id);
        },
        inspectorActionPending: function (key) {
          return Boolean((this.inspectorUi.pendingActions || {})[key]);
        },
        runInspectorAction: function (key, name, payload) {
          var self = this;
          var pending;
          var requestId;
          var requestContextKey;

          if (this.inspectorActionPending(key)) return Promise.resolve(null);
          requestId = Number(this.inspectorUi.tableRequestId || 0) + 1;
          requestContextKey = String(readContextKey.call(this, this) || "");
          this.inspectorUi.tableRequestId = requestId;
          pending = Object.assign({}, this.inspectorUi.pendingActions || {});
          pending[key] = true;
          this.inspectorUi.pendingActions = pending;

          return Promise.resolve()
            .then(function () {
              return action(name).call(self, payload);
            })
            .then(function (response) {
              var table = response && response.table ? response.table : response;
              if (self.inspectorUi.tableRequestId !== requestId ||
                  String(readContextKey.call(self, self) || "") !== requestContextKey) {
                return null;
              }
              if (table && Array.isArray(table.rows)) {
                self.inspector.table = table;
              }
              return response;
            })
            .catch(function (error) {
              if (self.inspectorUi.tableRequestId !== requestId ||
                  String(readContextKey.call(self, self) || "") !== requestContextKey) {
                return null;
              }
              if (typeof self.showFrontendError === "function") {
                self.showFrontendError(error);
                return null;
              }
              throw error;
            })
            .finally(function () {
              var nextPending = Object.assign({}, self.inspectorUi.pendingActions || {});
              delete nextPending[key];
              self.inspectorUi.pendingActions = nextPending;
            });
        },
        createInspectorObject: function () {
          return this.runInspectorAction("create", "create");
        },
        duplicateInspectorObject: function (rowId) {
          return this.runInspectorAction("duplicate:" + rowId, "duplicate", { object_id: rowId });
        },
        deleteInspectorObject: function (rowId) {
          return this.runInspectorAction("delete:" + rowId, "delete", { object_id: rowId });
        },
        setMainInspectorObject: function (rowId) {
          if (String(rowId) === String(this.inspectorTable.main_object || "")) return Promise.resolve(null);
          return this.runInspectorAction("main:" + rowId, "setMain", { object_id: rowId });
        },
        setInspectorObjectSelected: function (rowId, selected) {
          return this.runInspectorAction("select:" + rowId, "setSelected", {
            object_id: rowId,
            selected: Boolean(selected),
          });
        },
        setFilteredInspectorObjectsSelected: function (selected) {
          return this.runInspectorAction("bulk-select", "setBulkSelected", {
            object_ids: this.filteredInspectorRows.map(function (row) { return row.id; }),
            selected: Boolean(selected),
          });
        },
        toggleInspectorColumn: function (columnId, visible) {
          var ids = (this.inspectorUi.visibleColumnIds || []).slice();
          var index = ids.indexOf(columnId);
          if (visible && index < 0) ids.push(columnId);
          if (!visible && index >= 0) ids.splice(index, 1);
          this.inspectorUi.visibleColumnIds = ids;
        },
        toggleInspectorColumnsMenu: function (event) {
          var button = event && event.currentTarget;
          var rect = button && button.getBoundingClientRect ? button.getBoundingClientRect() : null;
          this.inspectorUi.columnsMenuOpen = !this.inspectorUi.columnsMenuOpen;
          if (this.inspectorUi.columnsMenuOpen && rect) {
            this.inspectorUi.columnsMenuStyle = {
              position: "fixed",
              top: Math.round(rect.bottom + 6) + "px",
              right: Math.round(Math.max(8, window.innerWidth - rect.right)) + "px",
            };
          }
        },
        closeInspectorColumnsMenu: function () {
          this.inspectorUi.columnsMenuOpen = false;
          this.inspectorUi.columnsMenuStyle = {};
        },
        handleInspectorDocumentClick: function (event) {
          var target = event.target;
          if (!target || typeof target.closest !== "function") return;
          if (target.closest("[data-inspector-columns-menu]") ||
              target.closest("[data-inspector-columns-toggle]")) return;
          this.closeInspectorColumnsMenu();
        },
        inspectorCellValue: function (row, column) {
          return formatCell(row, column);
        },
        inspectorCellTooltip: function (row, column) {
          return cellTooltip(row, column);
        },
      },
      mounted: function () {
        this.syncInspectorVisibleColumns();
        document.addEventListener("mousedown", this.handleInspectorDocumentClick);
      },
      beforeUnmount: function () {
        document.removeEventListener("mousedown", this.handleInspectorDocumentClick);
      },
    };
  }

  window.GenieInspectorUi = {
    create: createInspectorUi,
    formatCell: formatCell,
    cellTooltip: cellTooltip,
  };
})(window, document);
