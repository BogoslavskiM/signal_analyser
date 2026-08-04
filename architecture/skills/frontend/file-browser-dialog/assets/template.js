(function registerGenieFileBrowserDialog(window) {
  "use strict";

  var PathInput = {
    props: {
      modelValue: { type: String, default: "" },
      disabled: { type: Boolean, default: false },
      inputId: { type: String, required: true },
    },
    emits: ["update:modelValue", "browse"],
    template:
      '<span class="path-input-control">' +
        '<input class="dialog-text-input path-input-field" type="text" :id="inputId" :data-testid="inputId" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)">' +
        '<button class="path-input-browse" type="button" :data-testid="inputId + \'-browse\'" :disabled="disabled" aria-label="Выбрать путь" data-tooltip="Выбрать путь" @click="$emit(\'browse\')">' +
          '<span class="visually-hidden">Выбрать путь</span>' +
        '</button>' +
      '</span>',
  };

  function createFileBrowserDialog(options) {
    var config = options || {};
    var api = config.api || {};
    var targets = config.targets || {};

    function emptyState() {
      return {
        open: false,
        root_path: "",
        current_path: "",
        parent_path: "",
        selected_path: "",
        sort_ascending: true,
        entries: [],
      };
    }

    return {
      components: {
        "path-input": PathInput,
      },
      state: function () {
        return {
          fileBrowser: Object.assign(emptyState(), {
            target: "",
            mode: "directory",
            allowed_extensions: [],
            busy: false,
            request_id: 0,
          }),
        };
      },
      computed: {
        fileBrowserTitle: function () {
          return this.fileBrowser.mode === "file" ? "Выбор файла" : "Выбор папки";
        },
        fileBrowserAtRoot: function () {
          return this.fileBrowser.current_path === this.fileBrowser.root_path;
        },
        fileBrowserCanSelect: function () {
          if (this.fileBrowser.busy) return false;
          if (this.fileBrowser.mode === "directory") return Boolean(this.fileBrowser.current_path);
          return Boolean(this.fileBrowser.selected_path);
        },
      },
      methods: {
        fileBrowserTarget: function () {
          return targets[this.fileBrowser.target] || null;
        },
        applyFileBrowserState: function (payload) {
          var next = payload || {};
          this.fileBrowser.open = next.open === true;
          this.fileBrowser.root_path = String(next.root_path || "");
          this.fileBrowser.current_path = String(next.current_path || "");
          this.fileBrowser.parent_path = String(next.parent_path || "");
          this.fileBrowser.selected_path = String(next.selected_path || "");
          this.fileBrowser.sort_ascending = next.sort_ascending !== false;
          this.fileBrowser.entries = Array.isArray(next.entries) ? next.entries.slice() : [];
        },
        fileBrowserPayload: function (patch) {
          return Object.assign({
            file_browser_target: this.fileBrowser.target,
            mode: this.fileBrowser.mode,
            allowed_extensions: this.fileBrowser.allowed_extensions.slice(),
            root_path: this.fileBrowser.root_path,
            current_path: this.fileBrowser.current_path,
            selected_path: this.fileBrowser.selected_path,
            sort_ascending: this.fileBrowser.sort_ascending,
          }, patch || {});
        },
        runFileBrowserAction: function (actionName, patch) {
          var self = this;
          var action = api[actionName];
          var requestId;

          if (this.fileBrowser.busy) return Promise.resolve(null);
          if (typeof action !== "function") {
            return Promise.reject(new Error("File browser API action is not configured: " + actionName));
          }

          requestId = this.fileBrowser.request_id + 1;
          this.fileBrowser.request_id = requestId;
          this.fileBrowser.busy = true;

          return Promise.resolve()
            .then(function () {
              return action.call(self, self.fileBrowserPayload(patch));
            })
            .then(function (payload) {
              if (self.fileBrowser.request_id !== requestId) return null;
              self.applyFileBrowserState(payload);
              return payload;
            })
            .catch(function (error) {
              if (self.fileBrowser.request_id !== requestId) return null;
              if (typeof self.showUnexpectedError === "function") {
                self.showUnexpectedError(error, "file-browser-" + actionName);
                return null;
              }
              throw error;
            })
            .finally(function () {
              if (self.fileBrowser.request_id === requestId) self.fileBrowser.busy = false;
            });
        },
        openFileBrowser: function (targetId) {
          var target = targets[String(targetId || "")];
          var initialPath;

          if (!target) {
            return Promise.reject(new Error("Unknown file browser target: " + targetId));
          }

          initialPath = typeof target.getValue === "function" ?
            target.getValue.call(this) :
            "";
          this.fileBrowser.target = String(targetId);
          this.fileBrowser.mode = target.mode === "file" ? "file" : "directory";
          this.fileBrowser.allowed_extensions = Array.isArray(target.allowedExtensions) ?
            target.allowedExtensions.slice() :
            [];
          this.fileBrowser.selected_path = "";

          return this.runFileBrowserAction("open", {
            initial_path: String(initialPath || ""),
            expanded_paths: [],
          });
        },
        changeFileBrowserPath: function (path) {
          return this.runFileBrowserAction("path", {
            current_path: String(path || ""),
          });
        },
        toggleFileBrowserPath: function (path) {
          return this.runFileBrowserAction("toggle", {
            toggle_path: String(path || ""),
          });
        },
        toggleFileBrowserSort: function () {
          return this.runFileBrowserAction("sort", {
            sort_ascending: !this.fileBrowser.sort_ascending,
          });
        },
        selectFileBrowserEntry: function (entry) {
          if (!entry || entry.selectable === false || this.fileBrowser.busy) return;
          if (entry.kind === "directory") {
            this.changeFileBrowserPath(entry.path);
            return;
          }
          if (this.fileBrowser.mode === "file") {
            this.fileBrowser.selected_path = String(entry.path || "");
          }
        },
        selectFileBrowserValue: function () {
          var self = this;
          var target = this.fileBrowserTarget();
          if (!target || !this.fileBrowserCanSelect) return Promise.resolve(null);

          return this.runFileBrowserAction("select")
            .then(function (payload) {
              if (!payload) return null;
              if (typeof target.setValue === "function") {
                target.setValue.call(
                  self,
                  self.fileBrowser.mode === "file" ?
                    String(payload.selected_path || "") :
                    String(payload.current_path || "")
                );
              }
              return payload;
            });
        },
        cancelFileBrowser: function () {
          return this.runFileBrowserAction("cancel");
        },
      },
    };
  }

  window.GenieFileBrowserDialog = {
    create: createFileBrowserDialog,
  };
})(window);
