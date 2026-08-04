(function registerGenieObjectExportDialog(window) {
  "use strict";

  var MissingExportForm = {
    props: ["operationState", "fieldErrors", "busy"],
    template: '<div class="object-export-form-missing">Frontend form для выбранной операции не зарегистрирован</div>',
  };

  function createObjectExportDialog(options) {
    var config = options || {};
    var api = config.api || {};
    var forms = config.forms || {};

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

    return {
      state: function () {
        return {
          objectExportDialog: {
            open: false,
            busy: false,
            context: null,
            operations: [],
            active_operation: "",
            operation_state: {},
            field_errors: {},
          },
        };
      },
      computed: {
        activeObjectExportForm: function () {
          return forms[this.objectExportDialog.active_operation] || MissingExportForm;
        },
        objectExportSelectorDisabled: function () {
          return this.objectExportDialog.busy || this.objectExportDialog.operations.length <= 1;
        },
      },
      methods: {
        applyObjectExportPayload: function (payload) {
          var value = payload || {};
          this.objectExportDialog.operations = Array.isArray(value.operations) ?
            value.operations.slice() :
            [];
          this.objectExportDialog.active_operation = String(value.active_operation || "");
          this.objectExportDialog.operation_state = Object.assign({}, value.operation_state || {});
          this.objectExportDialog.field_errors = Object.assign({}, value.field_errors || {});
        },
        openObjectExportDialog: function (context) {
          var self = this;
          this.objectExportDialog.context = context;
          callGlobalLoader(this, true);
          return Promise.resolve()
            .then(function () {
              if (typeof api.open !== "function") throw new Error("Object export open API is not configured");
              return api.open.call(self, { context: context });
            })
            .then(function (payload) {
              self.applyObjectExportPayload(payload);
              self.objectExportDialog.open = true;
              return payload;
            })
            .catch(function (error) {
              reportError(self, error, "object-export-open");
              return null;
            })
            .finally(function () {
              callGlobalLoader(self, false);
            });
        },
        closeObjectExportDialog: function () {
          if (!this.objectExportDialog.busy) this.objectExportDialog.open = false;
        },
        changeObjectExportOperation: function (operationId) {
          var self = this;
          var id = String(operationId || "");
          if (this.objectExportDialog.busy || id === this.objectExportDialog.active_operation) {
            return Promise.resolve(null);
          }
          if (typeof api.changeOperation !== "function") {
            return Promise.reject(new Error("Object export changeOperation API is not configured"));
          }

          this.objectExportDialog.busy = true;
          return Promise.resolve()
            .then(function () {
              return api.changeOperation.call(self, {
                context: self.objectExportDialog.context,
                operation: id,
              });
            })
            .then(function (payload) {
              self.applyObjectExportPayload(payload);
              return payload;
            })
            .catch(function (error) {
              reportError(self, error, "object-export-operation");
              return null;
            })
            .finally(function () {
              self.objectExportDialog.busy = false;
            });
        },
        updateObjectExportField: function (fieldId, value) {
          this.objectExportDialog.operation_state = Object.assign(
            {},
            this.objectExportDialog.operation_state,
            { [String(fieldId)]: value }
          );
        },
        submitObjectExport: function () {
          var self = this;
          if (this.objectExportDialog.busy) return Promise.resolve(null);
          if (typeof api.exportObject !== "function") {
            return Promise.reject(new Error("Object export API is not configured"));
          }

          this.objectExportDialog.busy = true;
          callGlobalLoader(this, true);
          return Promise.resolve()
            .then(function () {
              return api.exportObject.call(self, {
                context: self.objectExportDialog.context,
                operation: self.objectExportDialog.active_operation,
                values: Object.assign({}, self.objectExportDialog.operation_state),
              });
            })
            .then(function (payload) {
              if (payload && payload.success === false) {
                self.applyObjectExportPayload(payload);
                return payload;
              }
              self.objectExportDialog.open = false;
              if (typeof self.showSuccessDialog === "function") {
                self.showSuccessDialog("Экспорт", String((payload && payload.message) || ""));
              }
              return payload;
            })
            .catch(function (error) {
              reportError(self, error, "object-export");
              return null;
            })
            .finally(function () {
              self.objectExportDialog.busy = false;
              callGlobalLoader(self, false);
            });
        },
      },
    };
  }

  window.GenieObjectExportDialog = {
    create: createObjectExportDialog,
  };
})(window);
