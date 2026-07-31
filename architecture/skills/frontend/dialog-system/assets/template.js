(function registerGenieDialogSystem(window) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function shortErrorMessage(error) {
    var message = typeof error === "string" ? error : error && error.message;
    return String(message || "Неизвестная ошибка").slice(0, 1000);
  }

  function createDialogSystem(options) {
    var config = options || {};
    var root = null;
    var state = { dialogs: [] };

    function normalize(spec) {
      return Object.assign({
        id: "dialog", title: "", text: "", size: "form", level: "primary",
        busy: false, bodyHtml: "", actions: [],
      }, spec || {});
    }

    function renderDialog(dialog) {
      var body = dialog.bodyHtml || '<p class="dialog-message">' + escapeHtml(dialog.text) + "</p>";
      var buttons = dialog.actions.map(function (action) {
        return '<button class="dialog-button' + (action.primary ? " dialog-button-primary" : "") +
          '" type="button" data-dialog-action="' + escapeHtml(action.id) + '" data-dialog-id="' +
          escapeHtml(dialog.id) + '"' + (dialog.busy || action.disabled ? " disabled" : "") + ">" +
          escapeHtml(action.label) + "</button>";
      }).join("");
      return '<div class="dialog-overlay dialog-level-' + escapeHtml(dialog.level) + '" data-testid="' +
        escapeHtml(dialog.id) + '" role="dialog" aria-modal="true" aria-labelledby="' +
        escapeHtml(dialog.id) + '-title"><section class="dialog-card dialog-size-' + escapeHtml(dialog.size) + '">' +
        '<header class="dialog-titlebar"><h2 id="' + escapeHtml(dialog.id) + '-title" class="dialog-title">' +
        escapeHtml(dialog.title) + '</h2><button class="dialog-close-button" type="button" data-dialog-close="' +
        escapeHtml(dialog.id) + '"' + (dialog.busy ? " disabled" : "") +
        ' aria-label="Закрыть" data-tooltip="Закрыть"><span class="visually-hidden">Закрыть</span></button></header>' +
        '<div class="dialog-body">' + body + '</div><footer class="dialog-actions">' + buttons +
        "</footer></section></div>";
    }

    function render() {
      var html = state.dialogs.map(renderDialog).join("");
      if (root) root.innerHTML = html;
      return html;
    }

    function find(id) {
      return state.dialogs.find(function (dialog) { return dialog.id === String(id); });
    }

    var actions = {
      open: function (spec) {
        var dialog = normalize(spec);
        actions.close(dialog.id, true);
        state.dialogs.push(dialog);
        render();
        return dialog;
      },
      close: function (id, force) {
        var dialog = find(id);
        if (dialog && dialog.busy && !force) return false;
        state.dialogs = state.dialogs.filter(function (item) { return item.id !== String(id); });
        render();
        return true;
      },
      setBusy: function (id, busy) {
        var dialog = find(id);
        if (dialog) dialog.busy = busy === true;
        render();
      },
      showUnexpectedError: function (error, context) {
        if (typeof config.reportError === "function") config.reportError(error, context || "unexpected-error");
        return actions.open({
          id: "unexpected-error", title: "Ошибка", level: "error", size: "message",
          text: shortErrorMessage(error),
          actions: [{ id: "ok", label: "Ок", primary: true }],
        });
      },
      showSuccess: function (title, text) {
        return actions.open({
          id: "success", title: title, text: text, size: "message",
          actions: [{ id: "ok", label: "Ок", primary: true }],
        });
      },
    };

    function onClick(event) {
      var close = event.target.closest("[data-dialog-close]");
      var button = event.target.closest("[data-dialog-action]");
      var dialog;
      var handler;
      if (close) return actions.close(close.getAttribute("data-dialog-close"));
      if (!button) return;
      dialog = find(button.getAttribute("data-dialog-id"));
      handler = config.onAction;
      if (typeof handler === "function") {
        handler(button.getAttribute("data-dialog-action"), dialog, api);
      } else {
        actions.close(dialog && dialog.id);
      }
    }

    function mount(element) {
      if (!element) throw new Error("Dialog system mount root is required");
      if (root) unmount();
      root = element;
      root.addEventListener("click", onClick);
      render();
      return api;
    }

    function unmount() {
      if (!root) return;
      root.removeEventListener("click", onClick);
      root.innerHTML = "";
      root = null;
    }

    var api = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return api;
  }

  window.GenieDialogSystem = { create: createDialogSystem, shortErrorMessage: shortErrorMessage };
})(window);
