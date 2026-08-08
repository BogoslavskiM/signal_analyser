(function explicitApplyRoot(window, document) {
  "use strict";
  var mount = document.getElementById("explicit-apply-vue-root");
  if (!mount || !window.Vue || !window.SignalAnalyserApi) return;
  window.Vue.createApp({
    data: function () { return { displayId:"", revision:null, dirty:false, invalid:false, disabled:true, phase:"pristine", message:"" }; },
    computed: {
      label: function () { return this.phase === "applying" ? "Применение…" : this.phase === "pending" ? "Ожидание…" : (this.phase === "error" || this.phase === "stale") ? "Повторить" : "Применить"; },
    },
    methods: {
      receiveDraft: function (detail) { if (!detail || !detail.displayId || detail.displayId !== this.displayId) return; this.revision = detail.revision; this.invalid = detail.invalid === true; this.dirty = detail.dirty === true; if (this.phase !== "applying" && this.phase !== "pending") { this.phase = this.invalid ? "invalid" : this.dirty ? "dirty" : "pristine"; this.message = this.invalid ? "Исправьте выделенные поля" : ""; this.disabled = this.invalid || !this.dirty; } },
      setContext: function (detail) { if (!detail || !detail.displayId) return; this.displayId = detail.displayId; this.revision = detail.revision; this.dirty = false; this.invalid = false; this.disabled = true; this.phase = "pristine"; this.message = ""; },
      apply: function () {
        var self = this, settings = window.SignalAnalyserModules && window.SignalAnalyserModules.settings, output = window.SignalAnalyserModules && window.SignalAnalyserModules.output, shell = document.querySelector("[data-testid='app-shell']");
        if (this.disabled || !settings || !this.displayId) return;
        this.phase = "applying"; this.disabled = true; this.message = "Применяем сохранённый черновик"; if (shell) shell.dataset.applyBusy = "true";
        Promise.resolve(settings.flushForApply()).then(function () { var context = settings.getState(); if (!context || context.displayId !== self.displayId || context.invalid) throw new Error("Исправьте выделенные поля"); return window.SignalAnalyserApi.applySettings({ state_revision:context.revision, display_id:context.displayId }); }).then(function (response) {
          if (!response || response.success !== true || typeof response.state_revision !== "number") throw { message:applyError(response && response.error) };
          self.revision = response.state_revision; self.dirty = false; self.disabled = true; self.phase = "pending"; self.message = "Обновляется активная область";
          if (output) output.refreshAfterApply(response.state_revision);
        }).catch(function (error) { self.phase = error && error.status === 409 ? "stale" : "error"; self.dirty = true; self.disabled = false; self.message = self.phase === "stale" ? "Состояние изменилось. Повторите применение." : (error && error.message) || "Не удалось применить настройки."; if (shell) shell.dataset.applyBusy = "false"; }).finally(function () { if (shell && self.phase !== "pending") shell.dataset.applyBusy = "false"; });
      },
    },
    mounted: function () { var self = this; window.addEventListener("signal-analyser-settings-context", function (event) { self.setContext(event.detail || {}); }); window.addEventListener("signal-analyser-apply-state", function (event) { self.receiveDraft(event.detail || {}); }); window.addEventListener("signal-analyser-output-terminal", function (event) { var detail = event.detail || {}, shell = document.querySelector("[data-testid='app-shell']"); if (self.phase !== "pending" || detail.revision < self.revision) return; self.phase = detail.success ? "pristine" : "error"; self.disabled = detail.success ? true : false; self.message = detail.success ? "" : (detail.error || "График не обновлён."); if (shell) shell.dataset.applyBusy = "false"; }); },
    template: `<div class="explicit-apply-footer"><p v-if="message" data-testid="settings-apply-status" role="status" aria-live="polite">{{ message }}</p><button type="button" data-testid="settings-apply" class="explicit-apply-button" :disabled="disabled" :aria-busy="phase === 'applying' || phase === 'pending'" @click="apply"><span v-if="phase === 'applying' || phase === 'pending'" class="spinner" aria-hidden="true"></span>{{ label }}</button></div>`,
  }).mount(mount);

  function applyError(error) {
    if (typeof error === "string" && error) return error;
    if (error && typeof error.message === "string" && error.message) return error.message;
    return "Сервер отклонил сохранённый черновик.";
  }
})(window, document);
