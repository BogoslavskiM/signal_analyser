(function registerGenieSessionImportExportUi(window) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function createSessionImportExportUi(options) {
    var config = options || {};
    var apiActions = config.api || {};
    var root = null;
    var state = {
      exportDialog: { open: false, busy: false, directory: "", file_name: "", overwrite: false },
      importDialog: { open: false, busy: false, file_path: "", replace_current: true },
    };

    function report(error, context) {
      if (typeof config.reportError === "function") { config.reportError(error, context); return null; }
      throw error;
    }

    function call(name, payload, dialog, context) {
      if (typeof apiActions[name] !== "function") return Promise.reject(new Error("Session API is not configured: " + name));
      dialog.busy = true; render();
      if (typeof config.startGlobalLoading === "function") config.startGlobalLoading();
      return Promise.resolve(apiActions[name](payload)).catch(function (error) {
        return report(error, context);
      }).finally(function () {
        dialog.busy = false;
        if (typeof config.stopGlobalLoading === "function") config.stopGlobalLoading();
        render();
      });
    }

    function exportMarkup(dialog) {
      if (!dialog.open) return "";
      return '<div class="dialog-overlay dialog-level-primary" role="dialog" aria-modal="true" aria-labelledby="session-export-title">' +
        '<section class="dialog-card dialog-size-form"><header class="dialog-titlebar"><h2 id="session-export-title" class="dialog-title">Экспорт сессии</h2>' +
        '<button class="dialog-close-button" type="button" data-session-close="export"' + (dialog.busy ? " disabled" : "") + ' aria-label="Закрыть"></button></header>' +
        '<div class="dialog-body"><div class="session-dialog-fields"><label class="session-dialog-row"><span class="session-dialog-label">Папка</span>' +
        '<span class="path-input-control"><input class="dialog-text-input path-input-field" data-session-field="directory" value="' +
        escapeHtml(dialog.directory) + '"' + (dialog.busy ? " disabled" : "") + '><button class="path-input-browse" type="button" data-session-browse="directory"' +
        (dialog.busy ? " disabled" : "") + ' aria-label="Выбрать путь"></button></span></label>' +
        '<label class="session-dialog-row"><span class="session-dialog-label">Имя файла</span><input class="dialog-text-input" data-session-field="file_name" value="' +
        escapeHtml(dialog.file_name) + '"' + (dialog.busy ? " disabled" : "") + '></label>' +
        '<label class="session-dialog-checkbox-row"><input type="checkbox" data-session-field="overwrite"' +
        (dialog.overwrite ? " checked" : "") + (dialog.busy ? " disabled" : "") + '><span>Перезаписывать существующий файл</span></label>' +
        '</div></div><footer class="dialog-actions"><button class="dialog-button" data-session-close="export" type="button">Отмена</button>' +
        '<button class="dialog-button dialog-button-primary" data-session-submit="export" type="button"' + (dialog.busy ? " disabled" : "") + ">" +
        (dialog.busy ? "Сохранение..." : "Сохранить") + "</button></footer></section></div>";
    }

    function importMarkup(dialog) {
      if (!dialog.open) return "";
      return '<div class="dialog-overlay dialog-level-primary" role="dialog" aria-modal="true" aria-labelledby="session-import-title">' +
        '<section class="dialog-card dialog-size-form"><header class="dialog-titlebar"><h2 id="session-import-title" class="dialog-title">Импорт сессии</h2>' +
        '<button class="dialog-close-button" type="button" data-session-close="import"' + (dialog.busy ? " disabled" : "") + ' aria-label="Закрыть"></button></header>' +
        '<div class="dialog-body"><div class="session-dialog-fields"><label class="session-dialog-row"><span class="session-dialog-label">Файл</span>' +
        '<span class="path-input-control"><input class="dialog-text-input path-input-field" data-session-field="file_path" value="' +
        escapeHtml(dialog.file_path) + '"' + (dialog.busy ? " disabled" : "") + '><button class="path-input-browse" type="button" data-session-browse="file"' +
        (dialog.busy ? " disabled" : "") + ' aria-label="Выбрать файл"></button></span></label>' +
        '<label class="session-dialog-checkbox-row"><input type="checkbox" data-session-field="replace_current"' +
        (dialog.replace_current ? " checked" : "") + (dialog.busy ? " disabled" : "") + '><span>Заменить текущую сессию</span></label>' +
        '</div></div><footer class="dialog-actions"><button class="dialog-button" data-session-close="import" type="button">Отмена</button>' +
        '<button class="dialog-button dialog-button-primary" data-session-submit="import" type="button"' + (dialog.busy ? " disabled" : "") + ">" +
        (dialog.busy ? "Импорт..." : "Импортировать") + "</button></footer></section></div>";
    }

    function render() {
      var html = exportMarkup(state.exportDialog) + importMarkup(state.importDialog);
      if (root) root.innerHTML = html;
      return html;
    }

    var actions = {
      openExport: function () {
        return call("openExport", null, state.exportDialog, "session-export-open").then(function (payload) {
          if (payload) Object.assign(state.exportDialog, {
            directory: String(payload.directory || ""), file_name: String(payload.file_name || ""),
            overwrite: payload.overwrite === true, open: true,
          });
          render(); return payload;
        });
      },
      openImport: function () {
        return call("openImport", null, state.importDialog, "session-import-open").then(function (payload) {
          if (payload) Object.assign(state.importDialog, {
            file_path: String(payload.file_path || ""), replace_current: payload.replace_current !== false, open: true,
          });
          render(); return payload;
        });
      },
      close: function (kind) {
        var dialog = kind === "import" ? state.importDialog : state.exportDialog;
        if (!dialog.busy) { dialog.open = false; render(); }
      },
      update: function (field, value) {
        var dialog = field === "file_path" || field === "replace_current" ? state.importDialog : state.exportDialog;
        dialog[field] = value; render();
      },
      browse: function (kind) {
        if (typeof config.openFileBrowser === "function") {
          return config.openFileBrowser(kind === "file" ? "session-import-file" : "session-export-directory");
        }
      },
      exportSession: function () {
        var dialog = state.exportDialog;
        return call("exportSession", {
          directory: dialog.directory, file_name: dialog.file_name, overwrite: dialog.overwrite,
        }, dialog, "session-export").then(function (payload) {
          if (payload) { dialog.open = false; if (typeof config.showSuccess === "function") config.showSuccess("Экспорт сессии", payload.message || ""); }
          render(); return payload;
        });
      },
      importSession: function () {
        var dialog = state.importDialog;
        return call("importSession", {
          file_path: dialog.file_path, replace_current: dialog.replace_current,
        }, dialog, "session-import").then(function (payload) {
          if (payload) {
            dialog.open = false;
            if (typeof config.applyBackendState === "function") config.applyBackendState(payload);
            if (typeof config.showSuccess === "function") config.showSuccess("Импорт сессии", payload.message || "");
          }
          render(); return payload;
        });
      },
    };

    function onClick(event) {
      var close = event.target.closest("[data-session-close]");
      var submit = event.target.closest("[data-session-submit]");
      var browse = event.target.closest("[data-session-browse]");
      if (close) return actions.close(close.getAttribute("data-session-close"));
      if (browse) return actions.browse(browse.getAttribute("data-session-browse"));
      if (submit) return submit.getAttribute("data-session-submit") === "import" ? actions.importSession() : actions.exportSession();
    }
    function onChange(event) {
      var field = event.target.getAttribute("data-session-field");
      if (field) actions.update(field, event.target.type === "checkbox" ? event.target.checked : event.target.value);
    }
    function mount(element) {
      if (!element) throw new Error("Session UI mount root is required"); if (root) unmount(); root = element;
      root.addEventListener("click", onClick); root.addEventListener("change", onChange); render(); return module;
    }
    function unmount() {
      if (!root) return; root.removeEventListener("click", onClick); root.removeEventListener("change", onChange);
      root.innerHTML = ""; root = null;
    }
    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieSessionImportExportUi = { create: createSessionImportExportUi };
})(window);
