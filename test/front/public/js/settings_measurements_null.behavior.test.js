"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = async function testMeasurementsRenderWithoutSettingsDocument(assert) {
  const listeners = {};
  const host = {
    hidden: true,
    innerHTML: "",
    dataset: {},
    setAttribute() {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const window = {
    addEventListener(type, listener) { (listeners[type] || (listeners[type] = [])).push(listener); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach((listener) => listener(event)); },
    clearTimeout() {},
  };
  window.window = window;
  const CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  window.CustomEvent = CustomEvent;
  const document = {
    addEventListener() {},
    querySelector(selector) {
      if (selector === "[data-testid='settings-catalog-panel']") return host;
      return null;
    },
    querySelectorAll() { return []; },
  };
  const context = { window, document, CustomEvent, Promise, Map, Set, Object, Array, JSON, Number, String, Boolean, console };
  context.globalThis = window;
  const root = path.resolve(__dirname, "../../../..");
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8"), context, { filename: "settings.js" });

  // The Measurements page is usable before its optional settings schema has
  // loaded. It must show its locally derived controls, never dereference doc.
  window.dispatchEvent(new CustomEvent("signal-analyser-settings-page", { detail:{ page:"measurements" } }));
  assert(host.hidden === false && host.innerHTML.includes("data-testid='statistics-controls'"), "Measurements must render locally before the per-Display settings document is available");
};
