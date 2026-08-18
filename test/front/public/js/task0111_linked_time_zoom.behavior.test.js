"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = async function task0111LinkedTimeZoomBehavior(assert) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("})(window, document);", "window.__task0111 = { model:model, bind:bindLinkedTimeHost, queue:queueLinkedTimeRelayout, update:linkedTimeRangeUpdate }; })(window, document);");

  let linkTime = true;
  let linkAmplitude = false;
  const frames = [];
  const relayoutCalls = [];
  const hosts = Object.create(null);
  function host(key) {
    const handlers = Object.create(null);
    const domHandlers = Object.create(null);
    return hosts[key] = {
      dataset: { paneHost:key, plotReady:"true" },
      isConnected: true,
      _fullLayout: { xaxis:{}, yaxis:{} },
      on(name, handler) { (handlers[name] ||= []).push(handler); },
      emit(name, payload) { (handlers[name] || []).forEach((handler) => handler(payload)); },
      handlerCount(name) { return (handlers[name] || []).length; },
      addEventListener(name, handler) { (domHandlers[name] ||= []).push(handler); },
      emitDom(name, payload) { (domHandlers[name] || []).forEach((handler) => handler(payload)); },
      domHandlerCount(name) { return (domHandlers[name] || []).length; }
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
    SignalAnalyserSettings: { value(field) {
      if (field === "time.link_time") return linkTime;
      if (field === "time.link_amplitude") return linkAmplitude;
      return null;
    } },
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

  assert(api.update({ "yaxis.range[0]":-1, "yaxis.range[1]":1 }, true, false) === null, "Y-only changes must not enter the linked-time path");
  const parsed = api.update({ "xaxis.range[0]":2, "xaxis.range[1]":5, "yaxis.range[0]":-7, "yaxis.range[1]":9 }, true, false);
  assert(parsed["xaxis.range[0]"] === 2 && parsed["xaxis.range[1]"] === 5 && parsed["xaxis.autorange"] === false && Object.keys(parsed).every((key) => key.startsWith("xaxis.")), "linked updates must contain only the exact X range");
  const amplitudeParsed = api.update({ "xaxis.range[0]":2, "xaxis.range[1]":5, "yaxis.range[0]":-7, "yaxis.range[1]":9 }, false, true);
  assert(amplitudeParsed["yaxis.range[0]"] === -7 && amplitudeParsed["yaxis.range[1]"] === 9 && Object.keys(amplitudeParsed).every((key) => key.startsWith("yaxis.")), "Связать амплитуду must contain only the exact Y range");
  const bothParsed = api.update({ "xaxis.autorange":true, "yaxis.autorange":true }, true, true);
  assert(bothParsed["xaxis.autorange"] === true && bothParsed["yaxis.autorange"] === true, "both independent links must preserve both autorange resets");

  api.bind(sourceHost, "display-a", "time-1");
  api.bind(sourceHost, "display-a", "time-1");
  api.bind(targetHost, "display-a", "time-2");
  assert(sourceHost.handlerCount("plotly_relayouting") === 1 && sourceHost.handlerCount("plotly_relayout") === 1, "each ready Plotly host must bind each live/final event exactly once");
  assert(sourceHost.handlerCount("plotly_doubleclick") === 1 && sourceHost.domHandlerCount("dblclick") === 1, "each ready Plotly host must bind graph and range-slider double-click reset exactly once");

  linkTime = false;
  linkAmplitude = false;
  let prevented = 0, stopped = 0;
  sourceHost.emit("plotly_doubleclick", {});
  sourceHost.emitDom("dblclick", {
    target:{ closest(selector) { return selector === ".rangeslider-container" ? {} : null; } },
    preventDefault() { prevented++; },
    stopPropagation() { stopped++; }
  });
  assert(frames.length === 1, "graph and slider double-clicks in one gesture must coalesce into one reset frame");
  frames.shift()();
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].target === sourceHost, "double-click reset must relayout only its source host directly");
  assert(relayoutCalls[0].update["xaxis.autorange"] === true && relayoutCalls[0].update["yaxis.autorange"] === true, "double-click reset must restore the full default X and Y ranges");
  assert(prevented === 1 && stopped === 1, "range-slider reset must suppress the slider's native double-click side effects");
  relayoutCalls.length = 0;
  sourceHost.emitDom("dblclick", { target:{ closest() { return null; } }, preventDefault() {}, stopPropagation() {} });
  assert(frames.length === 0, "native graph double-click must be left to the Plotly double-click event instead of duplicating reset");

  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":1, "xaxis.range[1]":4 });
  assert(frames.length === 0 && relayoutCalls.length === 0, "disabled Связать время must keep zoom pane-local");

  linkTime = true;
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

  linkTime = false;
  linkAmplitude = true;
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":20, "xaxis.range[1]":30, "yaxis.range[0]":-4, "yaxis.range[1]":6 });
  assert(frames.length === 1, "live Y scaling must be coalesced through the same animation-frame path");
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 2 && relayoutCalls[1].target === targetHost, "another temporal pane must follow the amplitude source");
  assert(relayoutCalls[1].update["yaxis.range[0]"] === -4 && relayoutCalls[1].update["yaxis.range[1]"] === 6, "the follower must receive the latest live Y range");
  assert(!Object.keys(relayoutCalls[1].update).some((key) => key.startsWith("xaxis.")), "amplitude linking must leave every X axis independent");

  linkTime = true;
  targetHost.emit("plotly_relayout", { "xaxis.autorange":true, "yaxis.autorange":true });
  assert(frames.length === 1, "a later user reset on either temporal pane must become the new source");
  frames.shift()();
  await Promise.resolve();
  assert(relayoutCalls.length === 3 && relayoutCalls[2].target === sourceHost && relayoutCalls[2].update["xaxis.autorange"] === true && relayoutCalls[2].update["yaxis.autorange"] === true, "enabled X and amplitude resets must propagate back together");
};
