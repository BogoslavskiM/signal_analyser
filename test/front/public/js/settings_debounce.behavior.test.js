"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, at: now + Number(delay || 0) });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    tick(milliseconds) {
      const target = now + milliseconds;
      while (true) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].callback();
      }
      now = target;
    },
  };
}

function settingsDocument(displayId, revision) {
  return {
    display_id: displayId,
    state_revision: revision,
    groups: [], sections: [], readouts: [],
    fields: [
      { id: "spectrum.overlap_percent", kind: "number", value: 0, effect_status: "stored_only" },
      { id: "display.show_legend", kind: "boolean", value: true, effect_status: "effective_presentation" },
    ],
  };
}

function fakeHost() {
  const listeners = {};
  const attributes = {};
  return {
    hidden: false,
    innerHTML: "",
    parentNode: null,
    setAttribute(name, value) { attributes[name] = String(value); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null; },
    addEventListener(type, listener) { (listeners[type] || (listeners[type] = [])).push(listener); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    fire(type, target, extra) {
      const event = Object.assign({
        type,
        target,
        key: "",
        prevented: false,
        preventDefault() { this.prevented = true; },
      }, extra || {});
      (listeners[type] || []).forEach((listener) => listener(event));
      return event;
    },
  };
}

function input(fieldId, value) {
  return {
    dataset: { settingField: fieldId },
    value: String(value),
    checked: false,
    closest() { return null; },
  };
}

module.exports = async function testSettingsDebounceBehavior(assert) {
  const clock = fakeClock();
  const listeners = {};
  const host = fakeHost();
  const window = {
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    addEventListener(type, listener) { (listeners[type] || (listeners[type] = [])).push(listener); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach((listener) => listener(event)); return true; },
  };
  window.window = window;
  const CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  window.CustomEvent = CustomEvent;
  const document = {
    activeElement: null,
    addEventListener() {},
    querySelector(selector) { return selector === "[data-testid='settings-catalog-panel']" ? host : null; },
    querySelectorAll() { return []; },
  };
  const context = {
    window,
    document,
    CustomEvent, Promise, Map, Set, Object, Array, JSON, Number, String, Boolean, console,
  };
  context.globalThis = window;
  const root = path.resolve(__dirname, "../../../..");
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8"), context, { filename: "settings.js" });

  const seam = window.SignalAnalyserSettings && window.SignalAnalyserSettings.__test;
  assert(seam && typeof seam.setApi === "function" && typeof seam.context === "function", "settings must expose its existing browserless setup seam");

  const calls = [];
  seam.setApi({
    updateSetting(payload) {
      calls.push(payload);
      return new Promise(() => {});
    },
    settings() { return new Promise(() => {}); },
  });
  seam.seed("display-a", 41, settingsDocument("display-a", 41));
  seam.context("display-a", 41);
  const continuous = input("spectrum.overlap_percent", 10);

  host.fire("input", continuous);
  clock.tick(100);
  continuous.value = "20";
  host.fire("input", continuous);
  clock.tick(149);
  assert(calls.length === 0, "continuous settings edits must remain queued through 149 ms of their final window");
  clock.tick(1);
  assert(calls.length === 1 && calls[0].value === 20, "the latest valid input must dispatch exactly once at t=250, 150 ms after the t=100 edit");

  // The timer-fired mutation remains unresolved. A browser change/blur commit
  // for the same value must recognize it as already in flight and not send it
  // a second time.
  host.fire("change", continuous);
  assert(calls.length === 1, "change after the timer fired must not duplicate the same unresolved mutation");

  continuous.value = "30";
  host.fire("input", continuous);
  host.fire("change", continuous);
  assert(calls.length === 2 && calls[1].value === 30, "a change/blur commit must flush the latest queued value immediately");
  clock.tick(150);
  assert(calls.length === 2, "a change/blur flush must cancel its timer and never duplicate the mutation");

  continuous.value = "40";
  host.fire("input", continuous);
  const enter = host.fire("keydown", continuous, { key: "Enter" });
  assert(enter.prevented && calls.length === 3 && calls[2].value === 40, "Enter must flush the latest queued value immediately");
  clock.tick(150);
  assert(calls.length === 3, "an Enter flush must issue exactly one mutation");

  const checkbox = input("display.show_legend", "");
  checkbox.checked = false;
  host.fire("change", checkbox);
  assert(calls.length === 4 && calls[3].value === false, "checkbox semantic actions must bypass the continuous-edit debounce");
  clock.tick(150);
  assert(calls.length === 4, "an immediate checkbox action must issue exactly one mutation");

  continuous.value = "50";
  host.fire("input", continuous);
  seam.context("display-b", 42);
  clock.tick(150);
  assert(calls.length === 4, "a queued edit must be cancelled when its authoritative display context changes");

  seam.seed("display-a", 42, settingsDocument("display-a", 42));
  seam.context("display-a", 42);
  continuous.value = "60";
  host.fire("input", continuous);
  seam.context("display-a", 43);
  clock.tick(150);
  assert(calls.length === 4, "a queued edit must be rejected when its authoritative state revision changes");
};
