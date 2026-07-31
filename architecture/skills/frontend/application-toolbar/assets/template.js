(function registerApplicationToolbar(window, document) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function normalizeAction(action, fallback) {
    return Object.assign({
      id: "", label: "", icon: "", visible: false, disabled: false,
    }, fallback || {}, action || {});
  }

  function createApplicationToolbar(options) {
    var config = options || {};
    var handlers = config.handlers || {};
    var root = null;
    var state = {
      appName: String(config.appName || ""),
      appVersion: String(config.appVersion || ""),
      logoPath: String(config.logoPath || "./icons/engee-logo.svg"),
      capabilities: {
        import: { visible: false, disabled: false },
        export: { visible: false, disabled: false, default_operation: "", operations: [] },
        other_actions: [],
        help: { visible: false, disabled: false, href: "" },
      },
      exportMenuOpen: false,
      exportMenuStyle: "",
    };

    function iconStyle(icon) {
      var path = (config.icons || {})[icon] || icon || "";
      return "--icon:url(&quot;" + escapeHtml(path) + "&quot;)";
    }

    function actionButton(action, testId) {
      if (!action.visible) return "";
      return '<button class="application-toolbar-button application-toolbar-icon" type="button"' +
        ' style="' + iconStyle(action.icon) + '"' +
        (action.disabled ? " disabled" : "") +
        ' data-tooltip="' + escapeHtml(action.label) + '" aria-label="' + escapeHtml(action.label) + '"' +
        ' data-testid="' + escapeHtml(testId) + '" data-toolbar-action="' + escapeHtml(action.id) + '"></button>';
    }

    function render() {
      var importAction = normalizeAction(state.capabilities.import, {
        id: "import", label: "Импорт", icon: "./icons/import.svg",
      });
      var exportAction = normalizeAction(state.capabilities.export, {
        id: "export", label: "Экспорт", icon: "./icons/save.svg",
      });
      var operations = Array.isArray(exportAction.operations) ? exportAction.operations : [];
      var other = (state.capabilities.other_actions || []).map(function (action) {
        var item = normalizeAction(action);
        return actionButton(item, "toolbar-action-" + item.id);
      }).join("");
      var help = normalizeAction(state.capabilities.help, {
        id: "help", label: "Справка", icon: "./icons/help-circle.svg",
      });
      var menu = state.exportMenuOpen ?
        '<div class="application-toolbar-export-menu" role="menu" data-toolbar-export data-testid="toolbar-export-menu" style="' +
        escapeHtml(state.exportMenuStyle) + '">' +
        operations.map(function (operation) {
          return '<button class="application-toolbar-export-item" type="button" role="menuitem"' +
            (operation.disabled ? " disabled" : "") + ' data-export-operation="' + escapeHtml(operation.id) +
            '" data-testid="toolbar-export-' + escapeHtml(operation.id) + '">' +
            '<span class="application-toolbar-export-item-icon application-toolbar-icon" style="' +
            iconStyle(operation.icon) + '" aria-hidden="true"></span>' +
            '<span class="application-toolbar-export-item-label">' + escapeHtml(operation.label) + "</span></button>";
        }).join("") + "</div>" : "";
      var exportBlock = exportAction.visible ?
        '<div class="application-toolbar-export" data-toolbar-export>' +
        '<button class="application-toolbar-button application-toolbar-icon application-toolbar-export-primary' +
        (operations.length > 1 ? "" : " application-toolbar-export-single") + '" type="button" style="' +
        iconStyle(exportAction.icon) + '"' + (exportAction.disabled ? " disabled" : "") +
        ' data-toolbar-action="export" data-testid="toolbar-export-primary" aria-label="' +
        escapeHtml(exportAction.label) + '"></button>' +
        (operations.length > 1 ? '<button class="application-toolbar-button application-toolbar-export-arrow" type="button"' +
          (exportAction.disabled ? " disabled" : "") + ' data-toolbar-export-toggle aria-haspopup="menu" aria-expanded="' +
          String(state.exportMenuOpen) + '" data-testid="toolbar-export-toggle"><span aria-hidden="true"></span></button>' : "") +
        menu + "</div>" : "";
      var helpBlock = help.visible ?
        (help.disabled ? actionButton(help, "toolbar-help") :
          '<a class="application-toolbar-button application-toolbar-icon" style="' + iconStyle(help.icon) +
          '" href="' + escapeHtml(help.href) + '" target="_blank" rel="noopener noreferrer" data-tooltip="' +
          escapeHtml(help.label) + '" aria-label="' + escapeHtml(help.label) + '" data-testid="toolbar-help"></a>') : "";
      var html = '<header class="application-toolbar" data-testid="app-toolbar"><div class="application-toolbar-brand">' +
        '<img class="application-toolbar-logo" src="' + escapeHtml(state.logoPath) + '" alt="Engee">' +
        '<h1 class="application-toolbar-title">' + escapeHtml(state.appName) + '</h1>' +
        '<span class="application-toolbar-separator" aria-hidden="true"></span>' +
        '<span class="application-toolbar-version">Версия ' + escapeHtml(state.appVersion) + '</span></div>' +
        '<div class="application-toolbar-actions">' + actionButton(importAction, "toolbar-import") + exportBlock +
        other + helpBlock + "</div></header>";
      if (root) root.innerHTML = html;
      return html;
    }

    function execute(actionId, payload) {
      var handler = handlers[actionId];
      if (typeof handler !== "function") throw new Error("Toolbar handler is not configured: " + actionId);
      state.exportMenuOpen = false;
      var result = handler(payload);
      render();
      return result;
    }

    var actions = {
      configure: function (payload) {
        var value = payload || {};
        state.capabilities = {
          import: Object.assign({}, value.import || {}),
          export: Object.assign({}, value.export || {}, {
            operations: Array.isArray(value.export && value.export.operations) ? value.export.operations.slice() : [],
          }),
          other_actions: Array.isArray(value.other_actions) ? value.other_actions.slice() : [],
          help: Object.assign({}, value.help || {}),
        };
        state.exportMenuOpen = false;
        render();
      },
      closeMenu: function () { state.exportMenuOpen = false; render(); },
      toggleMenu: function (rect) {
        state.exportMenuOpen = !state.exportMenuOpen;
        if (state.exportMenuOpen && rect) {
          state.exportMenuStyle = "top:" + (rect.bottom + 8) + "px;right:" + Math.max(8, window.innerWidth - rect.right) + "px";
        }
        render();
      },
      run: execute,
    };

    function onClick(event) {
      var toggle = event.target.closest("[data-toolbar-export-toggle]");
      var operation = event.target.closest("[data-export-operation]");
      var action = event.target.closest("[data-toolbar-action]");
      if (toggle) return actions.toggleMenu(toggle.getBoundingClientRect());
      if (operation) return execute("export", { operation: operation.getAttribute("data-export-operation") });
      if (action) {
        var id = action.getAttribute("data-toolbar-action");
        var defaultOperation = id === "export" ? state.capabilities.export.default_operation || "" : null;
        return execute(id, id === "export" ? { operation: defaultOperation } : null);
      }
    }

    function onDocumentClick(event) {
      if (root && !root.contains(event.target)) actions.closeMenu();
    }

    function mount(element) {
      if (!element) throw new Error("Application toolbar mount root is required");
      if (root) unmount();
      root = element;
      root.addEventListener("click", onClick);
      document.addEventListener("click", onDocumentClick);
      render();
      return api;
    }

    function unmount() {
      if (!root) return;
      root.removeEventListener("click", onClick);
      document.removeEventListener("click", onDocumentClick);
      root.innerHTML = "";
      root = null;
    }

    var api = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return api;
  }

  window.GenieApplicationToolbar = { create: createApplicationToolbar };
})(window, document);
