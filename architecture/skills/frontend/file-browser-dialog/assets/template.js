(function registerGenieFileBrowserDialog(window) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function createFileBrowserDialog(options) {
    var config = options || {};
    var apiActions = config.api || {};
    var targets = config.targets || {};
    var root = null;
    var state = {
      open: false, target: "", mode: "directory", allowed_extensions: [],
      root_path: "", current_path: "", parent_path: "", selected_path: "",
      sort_ascending: true, entries: [], busy: false, request_id: 0,
    };

    function applyPayload(payload) {
      var value = payload || {};
      ["root_path", "current_path", "parent_path", "selected_path"].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(value, key)) state[key] = String(value[key] || "");
      });
      if (Object.prototype.hasOwnProperty.call(value, "open")) state.open = value.open === true;
      if (Object.prototype.hasOwnProperty.call(value, "sort_ascending")) state.sort_ascending = value.sort_ascending !== false;
      if (Array.isArray(value.entries)) state.entries = value.entries.slice();
      render();
    }

    function payload(patch) {
      return Object.assign({
        file_browser_target: state.target, mode: state.mode,
        allowed_extensions: state.allowed_extensions.slice(), root_path: state.root_path,
        current_path: state.current_path, selected_path: state.selected_path,
        sort_ascending: state.sort_ascending,
      }, patch || {});
    }

    function run(name, patch) {
      var action = apiActions[name];
      var requestId;
      if (state.busy) return Promise.resolve(null);
      if (typeof action !== "function") return Promise.reject(new Error("File browser API action is not configured: " + name));
      requestId = ++state.request_id;
      state.busy = true;
      render();
      return Promise.resolve(action(payload(patch))).then(function (response) {
        if (requestId === state.request_id) applyPayload(response);
        return response;
      }).catch(function (error) {
        if (typeof config.reportError === "function") {
          config.reportError(error, "file-browser-" + name);
          return null;
        }
        throw error;
      }).finally(function () {
        if (requestId === state.request_id) state.busy = false;
        render();
      });
    }

    function canSelect() {
      return !state.busy && Boolean(state.mode === "file" ? state.selected_path : state.current_path);
    }

    function render() {
      if (!state.open) {
        if (root) root.innerHTML = "";
        return "";
      }
      var currentValue = state.mode === "file" && state.selected_path ? state.selected_path : state.current_path;
      var rows = state.entries.map(function (entry) {
        var disabled = entry.selectable === false;
        return '<div class="file-browser-row' + (entry.expanded ? " is-expanded" : "") +
          (state.selected_path === entry.path ? " is-selected" : "") + (disabled ? " is-disabled" : "") +
          '" style="padding-left:' + (12 + Number(entry.depth || 0) * 24) + 'px">' +
          '<button class="file-browser-caret" type="button" data-browser-toggle="' + escapeHtml(entry.path) +
          '"' + (state.busy || disabled || entry.kind !== "directory" ? " disabled" : "") +
          ' aria-label="' + (entry.expanded ? "Свернуть папку" : "Развернуть папку") + '"></button>' +
          '<button class="file-browser-entry" type="button" data-browser-entry="' + escapeHtml(entry.path) + '"' +
          (state.busy || disabled ? " disabled" : "") + ' title="' + escapeHtml(entry.path) +
          '"><span class="file-browser-entry-name">' + escapeHtml(entry.name) + "</span></button></div>";
      }).join("");
      var html = '<div class="dialog-overlay dialog-level-file-browser" role="dialog" aria-modal="true" aria-labelledby="file-browser-title">' +
        '<section class="dialog-card dialog-size-message"><header class="dialog-titlebar"><h2 id="file-browser-title" class="dialog-title">' +
        (state.mode === "file" ? "Выбор файла" : "Выбор папки") +
        '</h2><button class="dialog-close-button" type="button" data-browser-cancel' + (state.busy ? " disabled" : "") +
        ' aria-label="Закрыть"></button></header><div class="dialog-body"><div class="file-browser-layout">' +
        '<button class="file-browser-heading" data-browser-sort type="button"' + (state.busy ? " disabled" : "") +
        '><span>Имя</span><span aria-hidden="true">' + (state.sort_ascending ? "↑" : "↓") + "</span></button>" +
        '<div class="file-browser-list-wrap"><div class="file-browser-list">' +
        (state.current_path !== state.root_path ? '<div class="file-browser-row"><span></span><button class="file-browser-entry" data-browser-parent type="button">..</button></div>' : "") +
        rows + (!state.entries.length ? '<div class="file-browser-empty">В этой папке нет элементов</div>' : "") +
        '</div>' + (state.busy ? '<div class="file-browser-loading" role="status"><span class="file-browser-spinner"></span></div>' : "") +
        '</div><div class="file-browser-path"><span class="file-browser-path-text" title="' + escapeHtml(currentValue) + '">' +
        escapeHtml(currentValue) + '</span></div></div></div><footer class="dialog-actions">' +
        '<button class="dialog-button" data-browser-cancel type="button"' + (state.busy ? " disabled" : "") + '>Отменить</button>' +
        '<button class="dialog-button dialog-button-primary" data-browser-select type="button"' +
        (canSelect() ? "" : " disabled") + '>Выбрать</button></footer></section></div>';
      if (root) root.innerHTML = html;
      return html;
    }

    var actions = {
      open: function (targetId) {
        var target = targets[String(targetId || "")];
        if (!target) return Promise.reject(new Error("Unknown file browser target: " + targetId));
        state.target = String(targetId);
        state.mode = target.mode === "file" ? "file" : "directory";
        state.allowed_extensions = Array.isArray(target.allowed_extensions) ? target.allowed_extensions.slice() : [];
        state.current_path = String(typeof target.getValue === "function" ? target.getValue() || "" : target.value || "");
        state.selected_path = "";
        state.entries = [];
        state.open = true;
        render();
        return run("open");
      },
      cancel: function () {
        if (state.busy) return Promise.resolve(null);
        if (typeof apiActions.cancel === "function") {
          return run("cancel").then(function (response) {
            if (response !== null) { state.open = false; render(); }
            return response;
          });
        }
        state.open = false; render(); return Promise.resolve(null);
      },
      sort: function () { state.sort_ascending = !state.sort_ascending; return run("sort"); },
      changePath: function (path) { return run("path", { current_path: String(path || ""), selected_path: "" }); },
      togglePath: function (path) { return run("toggle", { path: String(path || "") }); },
      selectEntry: function (path) {
        var entry = state.entries.find(function (item) { return item.path === path; });
        if (!entry || entry.selectable === false) return;
        if (entry.kind === "directory") return actions.changePath(entry.path);
        state.selected_path = entry.path;
        render();
      },
      confirm: function () {
        var target = targets[state.target];
        if (!canSelect()) return null;
        return run("select").then(function (response) {
          if (!response) return null;
          var value = response && response.value != null ? String(response.value) :
            (state.mode === "file" ? state.selected_path : state.current_path);
          if (target && typeof target.setValue === "function") target.setValue(value);
          state.open = false; render(); return value;
        });
      },
      applyPayload: applyPayload,
    };

    function onClick(event) {
      var node;
      if (event.target.closest("[data-browser-cancel]")) return actions.cancel();
      if (event.target.closest("[data-browser-sort]")) return actions.sort();
      if (event.target.closest("[data-browser-parent]")) return actions.changePath(state.parent_path);
      if (event.target.closest("[data-browser-select]")) return actions.confirm();
      node = event.target.closest("[data-browser-toggle]");
      if (node) return actions.togglePath(node.getAttribute("data-browser-toggle"));
      node = event.target.closest("[data-browser-entry]");
      if (node) return actions.selectEntry(node.getAttribute("data-browser-entry"));
    }

    function mount(element) {
      if (!element) throw new Error("File browser mount root is required");
      if (root) unmount();
      root = element; root.addEventListener("click", onClick); render(); return module;
    }
    function unmount() {
      if (!root) return; root.removeEventListener("click", onClick); root.innerHTML = ""; root = null;
    }
    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieFileBrowserDialog = { create: createFileBrowserDialog };
})(window);
