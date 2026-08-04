(function registerApplicationToolbar(window, document) {
  "use strict";

  function readValue(source, vm, fallback) {
    var value = typeof source === "function" ? source(vm) : source;
    return value === undefined || value === null ? fallback : value;
  }

  function normalizeAction(action) {
    return Object.assign({
      id: "",
      label: "",
      icon: "",
      visible: false,
      disabled: false,
    }, action || {});
  }

  function createApplicationToolbar(options) {
    var config = options || {};
    var handlers = config.handlers || {};
    var icons = config.icons || {};

    function execute(vm, actionId, payload) {
      var handler = handlers[actionId];
      if (typeof handler !== "function") {
        throw new Error("Toolbar handler is not configured: " + actionId);
      }
      return handler.call(vm, payload);
    }

    return {
      state: function () {
        return {
          toolbarCapabilities: {
            import: { visible: false, disabled: false },
            export: {
              visible: false,
              disabled: false,
              default_operation: "",
              operations: [],
            },
            other_actions: [],
            help: { visible: false, disabled: false, href: "" },
          },
          toolbarExportMenuOpen: false,
          toolbarExportMenuStyle: {},
        };
      },
      computed: {
        toolbarAppName: function () {
          return String(readValue(config.appName, this, ""));
        },
        toolbarLogoPath: function () {
          return String(readValue(config.logoPath, this, "./icons/engee-logo.svg"));
        },
        toolbarImportAction: function () {
          return normalizeAction(Object.assign(
            { id: "import", label: "Импорт", icon: "./icons/import.svg" },
            this.toolbarCapabilities.import || {}
          ));
        },
        toolbarExportAction: function () {
          var action = normalizeAction(Object.assign(
            { id: "export", label: "Экспорт", icon: "./icons/save.svg" },
            this.toolbarCapabilities.export || {}
          ));
          action.operations = Array.isArray(action.operations) ? action.operations : [];
          return action;
        },
        toolbarExportHasMenu: function () {
          return this.toolbarExportAction.operations.length > 1;
        },
        toolbarOtherActions: function () {
          return (this.toolbarCapabilities.other_actions || [])
            .map(normalizeAction)
            .filter(function (action) { return action.visible; });
        },
        toolbarHelpAction: function () {
          return normalizeAction(Object.assign(
            { id: "help", label: "Справка", icon: "./icons/help-circle.svg", href: "" },
            this.toolbarCapabilities.help || {}
          ));
        },
      },
      methods: {
        applyToolbarCapabilities: function (payload) {
          var value = payload || {};
          this.toolbarCapabilities = {
            import: Object.assign({}, value.import || {}),
            export: Object.assign({}, value.export || {}, {
              operations: Array.isArray(value.export && value.export.operations) ?
                value.export.operations.slice() :
                [],
            }),
            other_actions: Array.isArray(value.other_actions) ?
              value.other_actions.slice() :
              [],
            help: Object.assign({}, value.help || {}),
          };
          this.closeToolbarExportMenu();
        },
        toolbarIconStyle: function (icon) {
          var path = icons[icon] || icon || "";
          return { "--icon": 'url("' + String(path) + '")' };
        },
        runToolbarImport: function () {
          if (this.toolbarImportAction.disabled) return;
          this.closeToolbarExportMenu();
          return execute(this, "import", null);
        },
        runDefaultToolbarExport: function () {
          if (this.toolbarExportAction.disabled) return;
          this.closeToolbarExportMenu();
          return execute(this, "export", {
            operation: this.toolbarExportAction.default_operation || "",
          });
        },
        runToolbarExportOperation: function (operation) {
          var item = operation || {};
          if (item.disabled) return;
          this.closeToolbarExportMenu();
          return execute(this, "export", { operation: item.id });
        },
        runToolbarOtherAction: function (action) {
          if (!action || action.disabled) return;
          this.closeToolbarExportMenu();
          return execute(this, action.id, null);
        },
        toggleToolbarExportMenu: function (event) {
          if (this.toolbarExportAction.disabled || !this.toolbarExportHasMenu) return;
          if (this.toolbarExportMenuOpen) {
            this.closeToolbarExportMenu();
            return;
          }

          var rect = event.currentTarget.getBoundingClientRect();
          this.toolbarExportMenuStyle = {
            top: rect.bottom + 8 + "px",
            right: Math.max(8, window.innerWidth - rect.right) + "px",
          };
          this.toolbarExportMenuOpen = true;
        },
        closeToolbarExportMenu: function () {
          this.toolbarExportMenuOpen = false;
        },
        onToolbarDocumentClick: function (event) {
          if (!event.target.closest("[data-toolbar-export]")) {
            this.closeToolbarExportMenu();
          }
        },
      },
      mounted: function () {
        this._toolbarCloseMenu = this.closeToolbarExportMenu.bind(this);
        this._toolbarDocumentClick = this.onToolbarDocumentClick.bind(this);
        document.addEventListener("click", this._toolbarDocumentClick);
        window.addEventListener("scroll", this._toolbarCloseMenu, true);
        window.addEventListener("resize", this._toolbarCloseMenu);
      },
      beforeUnmount: function () {
        document.removeEventListener("click", this._toolbarDocumentClick);
        window.removeEventListener("scroll", this._toolbarCloseMenu, true);
        window.removeEventListener("resize", this._toolbarCloseMenu);
      },
    };
  }

  window.GenieApplicationToolbar = {
    create: createApplicationToolbar,
  };
})(window, document);
