"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = async function task0111LinkedTimeZoomBehavior(assert) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("})(window, document);", "window.__task0111 = { model:model, bind:bindLinkedTimeHost, queue:queueLinkedTimeRelayout, update:linkedTimeRangeUpdate }; })(window, document);");

  let linked = true;
  const frames = [];
  const relayoutCalls = [];
  const hosts = Object.create(null);
  function host(key) {
    const handlers = Object.create(null);
    return hosts[key] = {
      dataset: { paneHost:key, plotReady:"true" },
      isConnected: true,
      on(name, handler) { (handlers[name] ||= []).push(handler); },
      emit(name, payload) { (handlers[name] || []).forEach((handler) => handler(payload)); },
      handlerCount(name) { return (handlers[name] || []).length; }
    };
  }
  const sourceHost = host("display-a::time-1");
  const targetHost = host("display-a::time-2");
  host("display-a::spectrum-1");
  host("display-b::time-1");
  const displayTabs = { addEventListener() {} };

  const document = {
    body: { classList:{ add() {}, remove() {} } },
    activeElement: null,
    addEventListener() {},
    querySelector(selector) {
      if (selector === "[data-testid='display-tabs']") return displayTabs;
      const match = selector.match(/\[data-pane-host='([^']+)'\]/);
      return match ? hosts[match[1]] || null : null;
    },
    querySelectorAll() { return []; }
  };
  const window = {
    SignalAnalyserApi: {},
    SignalAnalyserSettings: { value(field) { return field === "time.link_time" ? linked : null; } },
    SignalAnalyserNumeric: {},
    SignalAnalyserValueSelect: { close() {} },
    CSS: { escape(value) { return String(value); } },
    Plotly: {
      relayout(target, update) {
        relayoutCalls.push({ target, update:Object.assign({}, update) });
        target.emit("plotly_relayout", update);
        return Promise.resolve();
      }
    },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    addEventListener() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    getComputedStyle() { return { display:"block", visibility:"visible" }; }
  };
  vm.runInContext(source, vm.createContext({ window, document, console, Promise, CSS:window.CSS, CustomEvent:function () {} }), { filename:"app.js" });
  const api = window.__task0111;
  api.model.state = { active_display_id:"display-a", displays:[{ id:"display-a" }] };
  api.model.layout = { rows:1, columns:3, active_pane_id:"time-1", panes:[
    { id:"time-1", plot_type:"time", signal_bindings:["A"] },
    { id:"time-2", plot_type:"time", signal_bindings:["A"] },
    { id:"spectrum-1", plot_type:"spectrum", signal_bindings:["A"] }
  ] };

  assert(api.update({ "yaxis.range[0]":-1, "yaxis.range[1]":1 }) === null, "Y-only changes must never enter the linked-time path");
  const parsed = api.update({ "xaxis.range[0]":2, "xaxis.range[1]":5, "yaxis.range[0]":-7, "yaxis.range[1]":9 });
  assert(parsed["xaxis.range[0]"] === 2 && parsed["xaxis.range[1]"] === 5 && parsed["xaxis.autorange"] === false && Object.keys(parsed).every((key) => key.startsWith("xaxis.")), "linked updates must contain only the exact X range");
  assert(api.update({ "xaxis.autorange":true, "yaxis.autorange":true })["xaxis.autorange"] === true, "X autorange reset must be linkable without Y autorange");

  api.bind(sourceHost, "display-a", "time-1");
  api.bind(sourceHost, "display-a", "time-1");
  api.bind(targetHost, "display-a", "time-2");
  assert(sourceHost.handlerCount("plotly_relayouting") === 1 && sourceHost.handlerCount("plotly_relayout") === 1, "each ready Plotly host must bind each live/final event exactly once");

  linked = false;
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":1, "xaxis.range[1]":4 });
  assert(frames.length === 0 && relayoutCalls.length === 0, "disabled Связать время must keep zoom pane-local");

  linked = true;
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":1, "xaxis.range[1]":4 });
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":3, "xaxis.range[1]":8 });
  assert(frames.length === 1, "frequent pan/zoom events must coalesce into one animation frame");
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].target === targetHost, "only another temporal pane in the active Display must follow the source");
  assert(relayoutCalls[0].update["xaxis.range[0]"] === 3 && relayoutCalls[0].update["xaxis.range[1]"] === 8, "the follower must receive the latest live X range");
  assert(!Object.keys(relayoutCalls[0].update).some((key) => key.startsWith("yaxis.")), "linked zoom must leave every Y axis independent");
  assert(frames.length === 0, "programmatic follower relayout must be suppressed instead of creating an event loop");

  targetHost.emit("plotly_relayout", { "xaxis.autorange":true, "yaxis.autorange":true });
  assert(frames.length === 1, "a later user reset on either temporal pane must become the new source");
  frames.shift()();
  await Promise.resolve();
  assert(relayoutCalls.length === 2 && relayoutCalls[1].target === sourceHost && relayoutCalls[1].update["xaxis.autorange"] === true, "X reset must propagate back to the other temporal pane only");
};
