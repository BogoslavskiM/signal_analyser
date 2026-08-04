(function registerGenieSessionImportExportUi(window) {
  "use strict";

  function createSessionImportExportUi(options) {
    var config = options || {};
    var api = config.api || {};

    function callGlobalLoader(vm, active) {
      var method = active ? config.startGlobalLoading : config.stopGlobalLoading;
      var fallbackName = active ? "startGlobalLoading" : "stopGlobalLoading";
      if (typeof method === "function") {
        method.call(vm);
      } else if (typeof vm[fallbackName] === "function") {
        vm[fallbackName]();
      }
    }

    function reportError(vm, error, context) {
      if (typeof vm.showUnexpectedError === "function") {
        vm.showUnexpectedError(error, context);
        return;
      }
      throw error;
    }

    function showSuccess(vm, title, message) {
      if (typeof vm.showSuccessDialog === "function") {
        vm.showSuccessDialog(title, message);
      }
    }

    var module = {
      state: function () {
        return {
          sessionExportDialog: {
            open: false,
            busy: false,
            directory: "",
            file_name: "",
            overwrite: false,
          },
          sessionImportDialog: {
            open: false,
            busy: false,
            file_path: "",
            replace_current: true,
          },
        };
      },
      methods: {
        applySessionExportDefaults: function (payload) {
          var value = payload || {};
          this.sessionExportDialog.directory = String(value.directory || "");
          this.sessionExportDialog.file_name = String(value.file_name || "");
          this.sessionExportDialog.overwrite = value.overwrite === true;
        },
        applySessionImportDefaults: function (payload) {
          var value = payload || {};
          this.sessionImportDialog.file_path = String(value.file_path || "");
          this.sessionImportDialog.replace_current = value.replace_current !== false;
        },
        openSessionExportDialog: function () {
          var self = this;
          callGlobalLoader(this, true);
          return Promise.resolve()
            .then(function () {
              if (typeof api.openExport !== "function") throw new Error("Session openExport API is not configured");
              return api.openExport.call(self);
            })
            .then(function (payload) {
              self.applySessionExportDefaults(payload);
              self.sessionExportDialog.open = true;
              return payload;
            })
            .catch(function (error) {
              reportError(self, error, "session-export-open");
              return null;
            })
            .finally(function () {
              callGlobalLoader(self, false);
            });
        },
        closeSessionExportDialog: function () {
          if (!this.sessionExportDialog.busy) this.sessionExportDialog.open = false;
        },
        exportSession: function () {
          var self = this;
          var payload;
          if (this.sessionExportDialog.busy) return Promise.resolve(null);
          if (typeof api.exportSession !== "function") {
            return Promise.reject(new Error("Session export API is not configured"));
          }

          payload = {
            directory: this.sessionExportDialog.directory,
            file_name: this.sessionExportDialog.file_name,
            overwrite: this.sessionExportDialog.overwrite,
          };
          this.sessionExportDialog.busy = true;
          callGlobalLoader(this, true);

          return Promise.resolve()
            .then(function () {
              return api.exportSession.call(self, payload);
            })
            .then(function (response) {
              self.sessionExportDialog.open = false;
              showSuccess(self, "Экспорт сессии", String((response && response.message) || ""));
              return response;
            })
            .catch(function (error) {
              reportError(self, error, "session-export");
              return null;
            })
            .finally(function () {
              self.sessionExportDialog.busy = false;
              callGlobalLoader(self, false);
            });
        },
        openSessionImportDialog: function () {
          var self = this;
          callGlobalLoader(this, true);
          return Promise.resolve()
            .then(function () {
              if (typeof api.openImport !== "function") throw new Error("Session openImport API is not configured");
              return api.openImport.call(self);
            })
            .then(function (payload) {
              self.applySessionImportDefaults(payload);
              self.sessionImportDialog.open = true;
              return payload;
            })
            .catch(function (error) {
              reportError(self, error, "session-import-open");
              return null;
            })
            .finally(function () {
              callGlobalLoader(self, false);
            });
        },
        closeSessionImportDialog: function () {
          if (!this.sessionImportDialog.busy) this.sessionImportDialog.open = false;
        },
        importSession: function () {
          var self = this;
          var payload;
          var applyBackendState = config.applyBackendState || this.applyBackendState;
          if (this.sessionImportDialog.busy) return Promise.resolve(null);
          if (typeof api.importSession !== "function") {
            return Promise.reject(new Error("Session import API is not configured"));
          }

          payload = {
            file_path: this.sessionImportDialog.file_path,
            replace_current: this.sessionImportDialog.replace_current,
          };
          this.sessionImportDialog.busy = true;
          callGlobalLoader(this, true);

          return Promise.resolve()
            .then(function () {
              return api.importSession.call(self, payload);
            })
            .then(function (response) {
              if (typeof applyBackendState !== "function") {
                throw new Error("Session applyBackendState is not configured");
              }
              applyBackendState.call(self, response);
              self.sessionImportDialog.open = false;
              showSuccess(self, "Импорт сессии", String((response && response.message) || ""));
              return response;
            })
            .catch(function (error) {
              reportError(self, error, "session-import");
              return null;
            })
            .finally(function () {
              self.sessionImportDialog.busy = false;
              callGlobalLoader(self, false);
            });
        },
      },
    };

    module.fileBrowserTargets = {
      "session-export-directory": {
        mode: "directory",
        allowedExtensions: [],
        getValue: function () {
          return this.sessionExportDialog.directory;
        },
        setValue: function (value) {
          this.sessionExportDialog.directory = String(value || "");
        },
      },
      "session-import-file": {
        mode: "file",
        allowedExtensions: [".jld2"],
        getValue: function () {
          return this.sessionImportDialog.file_path;
        },
        setValue: function (value) {
          this.sessionImportDialog.file_path = String(value || "");
        },
      },
    };

    return module;
  }

  window.GenieSessionImportExportUi = {
    create: createSessionImportExportUi,
  };
})(window);
