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
      contains() { return true; },
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
  assert(api.update({ "xaxis.range[0]":3, "xaxis.range[1]":3 }, true, false) === null, "a zero-width zoom range must be treated as a cancelled gesture");
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
  assert(sourceHost.handlerCount("plotly_doubleclick") === 0 && sourceHost.domHandlerCount("dblclick") === 0, "the linked-axis binding must not add a second graph or range-slider double-click handler");

  const graphTarget = { closest(selector) { return selector === ".nsewdrag" ? this : null; } };
  sourceHost._fullLayout = { dragmode:"zoom", xaxis:{ range:[0,10] }, yaxis:{ range:[-1,1] } };
  sourceHost.emitDom("pointerdown", { type:"pointerdown", button:0, pointerId:4, clientX:20, clientY:20, target:graphTarget });
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":2, "xaxis.range[1]":8 });
  sourceHost.emitDom("pointerup", { type:"pointerup", pointerId:4, clientX:20, clientY:20, target:graphTarget });
  assert(frames.length === 1 && relayoutCalls.length === 0, "a zero-area LMB zoom must replace its pending linked update before the animation frame paints");
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].update["xaxis.range[0]"] === 0 && relayoutCalls[0].update["xaxis.range[1]"] === 10, "a zero-area LMB zoom must leave the linked neighbor at the source pre-gesture range");
  relayoutCalls.length = 0;

  sourceHost.emitDom("pointerdown", { type:"pointerdown", button:0, pointerId:41, clientX:20, clientY:20, target:graphTarget });
  sourceHost.emitDom("pointermove", { type:"pointermove", pointerId:41, clientX:44, clientY:20, target:graphTarget });
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":1, "xaxis.range[1]":6 });
  sourceHost.emitDom("pointerup", { type:"pointerup", pointerId:41, clientX:44, clientY:20, target:graphTarget });
  assert(frames.length === 1, "a horizontal-only zoom must remain valid for Связать время");
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].update["xaxis.range[0]"] === 1, "a horizontal-only zoom must reach the linked time pane");
  relayoutCalls.length = 0;

  linkTime = false;
  linkAmplitude = true;
  sourceHost.emitDom("pointerdown", { type:"pointerdown", button:0, pointerId:42, clientX:20, clientY:20, target:graphTarget });
  sourceHost.emitDom("pointermove", { type:"pointermove", pointerId:42, clientX:20, clientY:44, target:graphTarget });
  sourceHost.emit("plotly_relayouting", { "yaxis.range[0]":-0.5, "yaxis.range[1]":0.5 });
  sourceHost.emitDom("pointerup", { type:"pointerup", pointerId:42, clientX:20, clientY:44, target:graphTarget });
  assert(frames.length === 1, "a vertical-only zoom must remain valid for Связать амплитуду");
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].update["yaxis.range[0]"] === -0.5, "a vertical-only zoom must reach the linked amplitude pane");
  relayoutCalls.length = 0;
  linkTime = true;
  linkAmplitude = false;

  sourceHost.emitDom("pointerdown", { type:"pointerdown", button:0, pointerId:5, clientX:20, clientY:20, target:graphTarget });
  sourceHost.emitDom("pointermove", { type:"pointermove", pointerId:5, clientX:40, clientY:40, target:graphTarget });
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":2, "xaxis.range[1]":8 });
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  sourceHost.emitDom("pointermove", { type:"pointermove", pointerId:5, clientX:20, clientY:20, target:graphTarget });
  sourceHost.emitDom("pointerup", { type:"pointerup", pointerId:5, clientX:20, clientY:20, target:graphTarget });
  assert(frames.length === 1, "returning a box zoom to zero area must schedule restoration of any already-updated neighbors");
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 2 && relayoutCalls[1].target === targetHost && relayoutCalls[1].update["xaxis.range[0]"] === 0 && relayoutCalls[1].update["xaxis.range[1]"] === 10, "a cancelled box zoom must restore the neighbor to the source's pre-gesture range");
  relayoutCalls.length = 0;

  linkTime = false;
  linkAmplitude = false;
  api.model.rangeSliderByPane["display-a::time-1"] = true;
  api.model.rangeSliderDataRangeByPane["display-a::time-1"] = [0, 10];
  api.model.rangeSliderFullRangeByPane["display-a::time-1"] = [0, 10];
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":-3, "xaxis.range[1]":4 });
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].target === sourceHost, "a slider drag outside signal data must update the full range on its source host");
  assert(relayoutCalls[0].update["xaxis.rangeslider.range"][0] === -3 && relayoutCalls[0].update["xaxis.rangeslider.range"][1] === 10, "the full-range minimum must be the lesser of the selected handle and signal minimum");
  relayoutCalls.length = 0;
  await Promise.resolve();
  sourceHost.emit("plotly_relayout", { "xaxis.range[0]":7, "xaxis.range[1]":14 });
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].update["xaxis.rangeslider.range"][0] === 0 && relayoutCalls[0].update["xaxis.rangeslider.range"][1] === 14, "the full-range maximum must be the greater of the selected handle and signal maximum");
  relayoutCalls.length = 0;
  await Promise.resolve();
  sourceHost.emit("plotly_relayout", { "xaxis.range[0]":2, "xaxis.range[1]":8 });
  await Promise.resolve();
  assert(relayoutCalls.length === 1 && relayoutCalls[0].update["xaxis.rangeslider.range"][0] === 0 && relayoutCalls[0].update["xaxis.rangeslider.range"][1] === 10, "handles inside signal extents must restore the signal min/max as the full range");
  relayoutCalls.length = 0;
  await Promise.resolve();
  delete api.model.rangeSliderByPane["display-a::time-1"];

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
  await Promise.resolve();
  await Promise.resolve();

  const spectrogramHost = hosts["display-a::spectrum-1"];
  api.model.layout.panes[2].plot_type = "spectrogram";
  api.bind(spectrogramHost, "display-a", "spectrum-1");
  linkTime = true;
  linkAmplitude = true;
  sourceHost.emit("plotly_relayouting", { "xaxis.range[0]":4, "xaxis.range[1]":7, "yaxis.range[0]":-2, "yaxis.range[1]":2 });
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 5, "one TIME source must update the other TIME pane and the Spectrogram pane");
  assert(relayoutCalls[3].target === targetHost && relayoutCalls[3].update["yaxis.range[0]"] === -2, "TIME followers must receive linked X and amplitude ranges");
  assert(relayoutCalls[4].target === spectrogramHost && relayoutCalls[4].update["xaxis.range[0]"] === 4 && !Object.keys(relayoutCalls[4].update).some((key) => key.startsWith("yaxis.")), "Spectrogram followers must receive only the linked time range");

  spectrogramHost.emit("plotly_relayout", { "xaxis.range[0]":8, "xaxis.range[1]":11, "yaxis.range[0]":20, "yaxis.range[1]":30 });
  frames.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert(relayoutCalls.length === 7 && relayoutCalls.slice(5).every((call) => !Object.keys(call.update).some((key) => key.startsWith("yaxis."))), "a Spectrogram source must drive X on TIME followers without ever driving amplitude");
};
