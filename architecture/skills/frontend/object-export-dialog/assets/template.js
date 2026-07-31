(function registerGenieObjectExportDialog(window) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function createObjectExportDialog(options) {
    var config = options || {};
    var apiActions = config.api || {};
    var forms = config.forms || {};
    var root = null;
    var state = {
      open: false, busy: false, context: null, operations: [], active_operation: "",
      operation_state: {}, field_errors: {},
    };

    function applyPayload(payload) {
      var value = payload || {};
      state.operations = Array.isArray(value.operations) ? value.operations.slice() : [];
      state.active_operation = String(value.active_operation || "");
      state.operation_state = Object.assign({}, value.operation_state || {});
      state.field_errors = Object.assign({}, value.field_errors || {});
      render();
    }

    function report(error, context) {
      if (typeof config.reportError === "function") { config.reportError(error, context); return null; }
      throw error;
    }

    function run(name, payload) {
      if (typeof apiActions[name] !== "function") return Promise.reject(new Error("Object export API is not configured: " + name));
      state.busy = true; render();
      return Promise.resolve(apiActions[name](payload)).catch(function (error) {
        return report(error, "object-export-" + name);
      }).finally(function () { state.busy = false; render(); });
    }

    function render() {
      if (!state.open) { if (root) root.innerHTML = ""; return ""; }
      var form = forms[state.active_operation];
      var formHtml = typeof form === "function" ? form({
        state: state.operation_state, errors: state.field_errors, busy: state.busy,
      }) : '<div class="object-export-form-missing">Frontend form для выбранной операции не зарегистрирован</div>';
      var html = '<div class="dialog-overlay dialog-level-primary" role="dialog" aria-modal="true" aria-labelledby="object-export-title">' +
        '<section class="dialog-card dialog-size-form"><header class="dialog-titlebar"><h2 id="object-export-title" class="dialog-title">Экспорт</h2>' +
        '<button class="dialog-close-button" type="button" data-export-close' + (state.busy ? " disabled" : "") + ' aria-label="Закрыть"></button></header>' +
        '<div class="dialog-body"><div class="object-export-fields"><label class="object-export-row" for="object-export-operation"><span>Тип экспорта</span>' +
        '<select id="object-export-operation" class="object-export-select" data-export-operation' +
        (state.busy || state.operations.length <= 1 ? " disabled" : "") + ">" +
        state.operations.map(function (operation) {
          return '<option value="' + escapeHtml(operation.id) + '"' +
            (String(operation.id) === state.active_operation ? " selected" : "") + ">" + escapeHtml(operation.label) + "</option>";
        }).join("") + '</select></label><div class="object-export-operation-form">' + formHtml +
        '</div></div></div><footer class="dialog-actions"><button class="dialog-button" data-export-close type="button"' +
        (state.busy ? " disabled" : "") + '>Отмена</button><button class="dialog-button dialog-button-primary" data-export-submit type="button"' +
        (state.busy || !state.active_operation ? " disabled" : "") + ">" + (state.busy ? "Экспорт..." : "Экспортировать") +
        "</button></footer></section></div>";
      if (root) root.innerHTML = html;
      return html;
    }

    var actions = {
      open: function (context) {
        state.context = context;
        if (typeof config.startGlobalLoading === "function") config.startGlobalLoading();
        return run("open", { context: context }).then(function (payload) {
          if (payload) { applyPayload(payload); state.open = true; render(); }
          return payload;
        }).finally(function () { if (typeof config.stopGlobalLoading === "function") config.stopGlobalLoading(); });
      },
      close: function () { if (!state.busy) { state.open = false; render(); } },
      changeOperation: function (id) {
        id = String(id || "");
        if (!id || id === state.active_operation || state.busy) return Promise.resolve(null);
        return run("changeOperation", { context: state.context, operation: id }).then(function (payload) {
          if (payload) applyPayload(payload); return payload;
        });
      },
      updateField: function (id, value) {
        state.operation_state = Object.assign({}, state.operation_state, { [String(id)]: value }); render();
      },
      submit: function () {
        return run("exportObject", {
          context: state.context, operation: state.active_operation,
          operation_state: Object.assign({}, state.operation_state),
        }).then(function (payload) {
          if (!payload) return null;
          if (payload && payload.field_errors) { applyPayload(payload); return payload; }
          state.open = false; render();
          if (typeof config.showSuccess === "function") config.showSuccess(payload);
          return payload;
        });
      },
      applyPayload: applyPayload,
    };

    function onClick(event) {
      if (event.target.closest("[data-export-close]")) return actions.close();
      if (event.target.closest("[data-export-submit]")) return actions.submit();
    }
    function onChange(event) {
      if (event.target.matches("[data-export-operation]")) actions.changeOperation(event.target.value);
      var field = event.target.getAttribute("data-export-field");
      if (field != null) actions.updateField(field, event.target.type === "checkbox" ? event.target.checked : event.target.value);
    }
    function mount(element) {
      if (!element) throw new Error("Object export mount root is required"); if (root) unmount(); root = element;
      root.addEventListener("click", onClick); root.addEventListener("change", onChange); render(); return module;
    }
    function unmount() {
      if (!root) return; root.removeEventListener("click", onClick); root.removeEventListener("change", onChange);
      root.innerHTML = ""; root = null;
    }
    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieObjectExportDialog = { create: createObjectExportDialog };
})(window);
