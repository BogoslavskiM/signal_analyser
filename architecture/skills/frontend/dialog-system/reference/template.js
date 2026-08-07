(function registerGenieDialogSystem(window) {
  "use strict";

  function shortErrorMessage(error) {
    var message;
    if (typeof error === "string") {
      message = error;
    } else if (error && typeof error.message === "string") {
      message = error.message;
    } else {
      message = "Неизвестная ошибка";
    }
    return String(message || "Неизвестная ошибка").slice(0, 1000);
  }

  var BaseDialog = {
    props: {
      open: { type: Boolean, default: false },
      title: { type: String, default: "" },
      titleId: { type: String, required: true },
      size: { type: String, default: "form" },
      level: { type: String, default: "primary" },
      busy: { type: Boolean, default: false },
      testId: { type: String, default: "" },
    },
    emits: ["close"],
    methods: {
      requestClose: function () {
        if (!this.busy) this.$emit("close");
      },
    },
    template:
      '<div v-if="open" class="dialog-overlay" :class="\'dialog-level-\' + level" :data-testid="testId || titleId" role="dialog" aria-modal="true" :aria-labelledby="titleId">' +
        '<section class="dialog-card" :class="\'dialog-size-\' + size">' +
          '<header class="dialog-titlebar">' +
            '<h2 :id="titleId" class="dialog-title">{{ title }}</h2>' +
            '<button class="dialog-close-button" type="button" :data-testid="(testId || titleId) + \'-close\'" :disabled="busy" aria-label="Закрыть" data-tooltip="Закрыть" @click="requestClose">' +
              '<span class="visually-hidden">Закрыть</span>' +
            '</button>' +
          '</header>' +
          '<div class="dialog-body"><slot></slot></div>' +
          '<footer class="dialog-actions"><slot name="actions"></slot></footer>' +
        '</section>' +
      '</div>',
  };

  function state() {
    return {
      unexpectedErrorDialog: {
        open: false,
        text: "",
      },
      successDialog: {
        open: false,
        title: "",
        text: "",
      },
    };
  }

  function methods(options) {
    var config = options || {};
    return {
      showUnexpectedError: function (error, context) {
        var text = shortErrorMessage(error);
        this.unexpectedErrorDialog.text = text;
        this.unexpectedErrorDialog.open = true;
        if (typeof config.reportError === "function") {
          config.reportError.call(this, error, context || "showUnexpectedError");
        }
      },
      closeUnexpectedError: function () {
        this.unexpectedErrorDialog.open = false;
        this.unexpectedErrorDialog.text = "";
      },
      showSuccessDialog: function (title, text) {
        this.successDialog.title = String(title || "");
        this.successDialog.text = String(text || "");
        this.successDialog.open = true;
      },
      closeSuccessDialog: function () {
        this.successDialog.open = false;
        this.successDialog.title = "";
        this.successDialog.text = "";
      },
    };
  }

  window.GenieDialogSystem = {
    components: {
      "base-dialog": BaseDialog,
    },
    state: state,
    methods: methods,
    shortErrorMessage: shortErrorMessage,
  };
})(window);
