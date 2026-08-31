"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function snapshot(revision) {
  return {
    state_revision: revision,
    active_display_id: "display-1",
    displays: [{ id: "display-1" }],
    layouts: [{ display_id: "display-1", layout: { active_pane_id: "pane-1", panes: [{ id: "pane-1", plot_type: "time" }] } }],
    signals: []
  };
}

function stale(revision, message) {
  const error = new Error(message || "Конфликт ревизий");
  error.status = 409;
  error.payload = { current: snapshot(revision) };
  return error;
}

function createApp(layoutResponses) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("bootstrapAttempt(bootstrapController.begin({ timeoutMs:bootstrapController.DEFAULT_TIMEOUT_MS }));", "");
  source = source.replace("})(window, document);", "window.__layoutRetryTest = { accept: accept, model: model }; })(window, document);");

  const clicks = [];
  const toastCopy = { textContent: "" };
  const toast = { hidden: true, classList: { toggle() {} }, querySelector() { return toastCopy; } };
  const popover = { hidden: false };
  const tabs = { addEventListener() {} };
  const nodes = {
    "[data-testid='layout-toast']": toast,
    "[data-testid='layout-popover']": popover,
    "[data-testid='display-tabs']": tabs,
    "[data-testid='display-tabs-wrap']": {}
  };
  const calls = [];
  const window = {
    SignalAnalyserApi: {
      layouts(payload) {
        calls.push(payload);
        const next = layoutResponses.shift();
        return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
      },
      getState() { return Promise.resolve(snapshot(1)); },
      activeOutput() { return Promise.resolve({ isready: true, success: true, display_id: "display-1", pane_id: "pane-1", plot_type: "time" }); }
    },
    SignalAnalyserSettings: { setRevision() {}, setContext() {}, load() { return Promise.resolve(); }, state() { return { dirty: false, invalid: false }; } },
    addEventListener(type, listener) { if (type === "click") clicks.push(listener); },
    clearTimeout() {}, setTimeout() { return 0; }, requestAnimationFrame() { return 0; }
  };
  const document = {
    readyState: "loading",
    querySelector(selector) { return nodes[selector] || null; },
    querySelectorAll() { return []; },
    addEventListener(type, listener) { if (type === "click") clicks.push(listener); },
    createElement() { return {}; },
    head: { appendChild() {} }
  };
  vm.runInNewContext(source, { window, document, Promise, Error, Array, Object, String, Number, Boolean, Math, CSS: { escape(value) { return value; } } }, { filename: "public/js/app.js" });
  window.__layoutRetryTest.accept(snapshot(1));
  window.__layoutRetryTest.model.layoutDraft = { rows: 2, columns: 3, trigger: { setAttribute() {}, focus() {} } };
  return { clicks, calls, toast, toastCopy };
}

function applyEvent() {
  const style={ removeProperty() {} };
  const button={
    dataset:{ layoutApply:"" },style,disabled:false,
    setAttribute() {},getBoundingClientRect() { return {width:96}; }
  };
  return { target: { closest() { return button; } } };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

module.exports = async function testLayoutResizeStaleRetry(assert) {
  const retry = createApp([stale(2), snapshot(3)]);
  retry.clicks[0](applyEvent());
  await settle();
  assert(retry.calls.length === 2, "a layout resize conflicted once by 409 must be retried exactly once");
  assert(retry.calls[0].state_revision === 1 && retry.calls[1].state_revision === 2, "retry must use the current snapshot revision accepted from the 409 payload");
  assert(retry.calls.every((call) => call.display_id === "display-1" && call.operation === "resize" && call.variant === "2x3" && call.rows === 2 && call.columns === 3), "retry must preserve the original Display and exact resize intent");
  assert(retry.toastCopy.textContent === "Макет 2 × 3 применён" && retry.toast.hidden === false, "only the accepted retried resize may show the success toast");

  const exhausted = createApp([stale(2), stale(3, "Повторный конфликт")]);
  exhausted.clicks[0](applyEvent());
  await settle();
  assert(exhausted.calls.length === 2, "a repeated 409 must stop after the bounded single retry");
  assert(exhausted.calls[0].state_revision === 1 && exhausted.calls[1].state_revision === 2, "the bounded retry still must use the refreshed revision before surfacing failure");
  assert(exhausted.toastCopy.textContent === "Повторный конфликт", "a repeated 409 must surface its error instead of a false resize success toast");
  assert(exhausted.toastCopy.textContent !== "Макет 2 × 3 применён", "repeated 409 must never report the resize as applied");
};
