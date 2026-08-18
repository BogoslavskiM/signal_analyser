"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function classList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    toggle(value, force) { if (force === undefined ? !values.has(value) : force) values.add(value); else values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function element(extra) {
  const attributes = {};
  const eventListeners = {};
  return Object.assign({
    hidden: false,
    disabled: false,
    inert: false,
    isConnected: true,
    dataset: {},
    style: {},
    classList: classList(),
    offsetHeight: 92,
    offsetWidth: 292,
    offsetParent: {},
    focusCount: 0,
    setAttribute(name, value) { attributes[name] = String(value); },
    getAttribute(name) { return attributes[name]; },
    focus() { this.focusCount += 1; },
    addEventListener(type, listener) { (eventListeners[type] || (eventListeners[type] = [])).push(listener); },
    dispatch(type, event) { (eventListeners[type] || []).forEach((listener) => listener(event)); },
    contains(target) { return target === this; },
    querySelector() { return null; },
    getBoundingClientRect() { return { left: 100, right: 400, top: 100, bottom: 300, width: 300, height: 200 }; }
  }, extra || {});
}

function pane(id, plotType, bindings) {
  return { id, plot_type: plotType, signal_bindings: bindings.slice() };
}

function snapshot(revision, panes) {
  return {
    state_revision: revision,
    active_display_id: "display-a",
    displays: [{ id: "display-a", measurement_kinds: [], peaks_enabled: false }],
    signals: [{ name: "A" }, { name: "B" }],
    layouts: [{ display_id: "display-a", layout: { rows: 1, columns: panes.length, active_pane_id: panes[0].id, panes } }]
  };
}

function createHarness() {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("})(window, document);", "window.__task0098 = { model:model, accept:accept, eligible:rangeSliderEligible, sync:syncPaneMenuState, openMenu:openPaneMenu, closeMenu:closePaneMenu, toggle:togglePaneRangeSlider, bindRangeReset:bindRangeSliderDoubleClick, toggleAmplitude:togglePaneAmplitudeSlider, queueAmplitude:queueAmplitudeRange, layout:plotLayoutWithRangeSlider, enqueue:enqueuePlot, openHelp:openGraphHelp, closeHelp:closeGraphHelp, openClear:openPaneClearConfirm, closeClear:closePaneClearConfirm, confirmClear:confirmPaneClear }; })(window, document);");

  const listeners = {};
  const apiCalls = [];
  const relayoutCalls = [];
  const reactCalls = [];
  const frames = [];
  const shell = element();
  const rangeAction = element();
  const amplitudeAction = element();
  const clearAction = element();
  const helpAction = element();
  const menu = element({
    hidden: true,
    dataset: {},
    querySelector(selector) {
      if (selector === "[data-plot-range-slider]") return rangeAction;
      if (selector === "[data-plot-amplitude-slider]") return amplitudeAction;
      if (selector === "button:not(:disabled)") return clearAction;
      return null;
    }
  });
  const helpClose = element();
  const help = element({
    hidden: true,
    querySelector(selector) { return selector === "[data-graph-help-close]" ? helpClose : null; }
  });
  const clearTitle = element();
  const clearLayer = element({ hidden: true });
  const toastCopy = element();
  const toast = element({ hidden: true, querySelector(selector) { return selector === "[data-toast-copy]" ? toastCopy : null; } });
  const displayTabs = element();
  const tabsWrap = element();

  const hosts = {};
  const paneNodes = {};
  function addPlotPane(paneId) {
    const canvas = element({
      querySelector(selector) { return selector === ".legend" ? null : null; },
      getBoundingClientRect() { return { left: 40, right: 540, top: 80, bottom: 360, width: 500, height: 280 }; }
    });
    paneNodes[paneId] = element({
      dataset: { paneId },
      querySelector(selector) { return selector === ".plot-canvas" ? canvas : null; }
    });
    hosts[`display-a::${paneId}`] = element({
      dataset: { paneHost: `display-a::${paneId}`, plotReady: "true" },
      _fullLayout: { xaxis: { range:[0, 1] }, yaxis: { range:[-1, 1] }, yaxis2: {} },
      contains() { return true; },
      getBoundingClientRect() { return { width: 480, height: 260 }; }
    });
    return { canvas, host: hosts[`display-a::${paneId}`] };
  }
  addPlotPane("pane-1");
  addPlotPane("pane-2");

  const fixedNodes = {
    "[data-testid='display-overflow-menu']": menu,
    "[data-testid='graph-help-overlay']": help,
    "[data-testid='pane-clear-confirm-layer']": clearLayer,
    "[data-testid='app-shell']": shell,
    "#pane-clear-confirm-title": clearTitle,
    "[data-testid='layout-toast']": toast,
    "[data-testid='display-tabs']": displayTabs,
    "[data-testid='display-tabs-wrap']": tabsWrap
  };
  const document = {
    documentElement: { clientWidth: 1280, clientHeight: 800 },
    body: element(),
    querySelector(selector) {
      if (fixedNodes[selector]) return fixedNodes[selector];
      let match = selector.match(/^\[data-pane-host='(.+)'\]$/);
      if (match) return hosts[match[1]] || null;
      match = selector.match(/^\[data-pane-id='(.+)'\]$/);
      if (match) return paneNodes[match[1]] || null;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, listener) { (listeners[type] || (listeners[type] = [])).push(listener); },
    createElement() { return element(); },
    head: { appendChild() {} }
  };
  const window = {
    innerWidth: 1280,
    innerHeight: 800,
    SignalAnalyserApi: new Proxy({}, {
      get(_target, property) {
        return function (payload) {
          apiCalls.push({ property, payload });
          if (property === "layouts") {
            const empty = snapshot(8, [pane("pane-1", "time", []), pane("pane-2", "time", ["B"])]);
            return Promise.resolve(empty);
          }
          return Promise.resolve();
        };
      }
    }),
    SignalAnalyserSettings: {
      setRevision() {}, setContext() {}, setView() {}, render() {}, markApplied() {},
      state() { return { dirty: false, invalid: false, revision: 7 }; },
      load() { return Promise.resolve(); }
    },
    Plotly: {
      relayout(host, update) { relayoutCalls.push({ host, update }); return Promise.resolve(); },
      react(host, traces, layout, config) { reactCalls.push({ host, traces, layout, config }); return Promise.resolve(); }
    },
    getComputedStyle() { return { display: "block", visibility: "visible" }; },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    addEventListener() {}
  };
  vm.runInNewContext(source, {
    window, document, Promise, Error, Array, Object, String, Number, Boolean, Math,
    CSS: { escape(value) { return value; } }, isFinite
  }, { filename: "public/js/app.js" });
  return {
    test: window.__task0098, menu, rangeAction, amplitudeAction, clearAction, helpAction, help, helpClose, clearLayer, clearTitle, shell,
    hosts, paneNodes, apiCalls, relayoutCalls, reactCalls, listeners,
    async settle() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); },
    flushFrame() { const callback = frames.shift(); if (callback) callback(); }
  };
}

function trigger(paneId, rect) {
  return element({
    dataset: { paneMenu: paneId },
    getBoundingClientRect() { return rect || { left: 400, right: 432, top: 100, bottom: 132, width: 32, height: 32 }; }
  });
}

module.exports = async function testTask0098PaneRangeSliderBehavior(assert) {
  const h = createHarness();
  const p1 = pane("pane-1", "time", ["A"]), p2 = pane("pane-2", "time", ["B"]);
  h.test.model.state = snapshot(7, [p1, p2]);
  h.test.model.revision = 7;
  h.test.model.layout = h.test.model.state.layouts[0].layout;
  h.test.model.activePane = "pane-1";
  h.test.model.outputs["display-a::pane-1"] = { output: { isready: true, success: true, data: [{ x:[0, 1], y:[0, 1] }] } };
  h.test.model.outputs["display-a::pane-2"] = { output: { isready: true, success: true, data: [{ x:[0, 1], y:[1, 0] }] } };
  h.test.model.rangeSliderDataRangeByPane["display-a::pane-1"] = [0, 1];
  h.test.model.amplitudeDataRangeByPane["display-a::pane-1"] = [-2, 2];

  const firstTrigger = trigger("pane-1");
  h.test.openMenu(firstTrigger);
  assert(!h.menu.hidden && h.menu.dataset.displayId === "display-a" && h.menu.dataset.paneId === "pane-1", "opening an ellipsis must bind the menu to that exact Display/pane target");
  assert(!h.rangeAction.disabled && h.rangeAction.getAttribute("aria-checked") === "false", "a ready bound temporal pane must expose an enabled unchecked toggle");
  assert(!h.amplitudeAction.disabled && h.amplitudeAction.getAttribute("aria-checked") === "false", "a ready bound temporal pane must expose an independent amplitude toggle");
  assert(h.clearAction.focusCount === 1 && firstTrigger.getAttribute("aria-expanded") === "true", "menu open must initially focus the retained first Clear action");

  const revision = h.test.model.revision;
  h.test.toggle();
  await h.settle();
  assert(h.relayoutCalls.length === 1 && h.relayoutCalls[0].host === h.hosts["display-a::pane-1"], "enabling must relayout only the host whose ellipsis opened the menu");
  const on = h.relayoutCalls[0].update;
  assert(on["xaxis.rangeslider.visible"] === true && on["xaxis.rangeslider.thickness"] === 0.15 && on["xaxis.rangeslider.bgcolor"] === "#ffffff" && on["xaxis.rangeslider.borderwidth"] === 1, "enable relayout must use the exact native overview geometry");
  assert(!Object.keys(on).some((key) => /^yaxis.*\.fixedrange$/.test(key)), "enabling the X range slider must not block vertical scaling on any Y axis");
  assert(h.test.model.revision === revision && h.apiCalls.length === 0 && h.reactCalls.length === 0, "toggle must not change revision, call any API or remount/react Plotly");
  assert(h.test.model.rangeSliderByPane["display-a::pane-1"] === true && !h.test.model.rangeSliderByPane["display-a::pane-2"], "Range Slider preference must remain pane-local");
  h.test.bindRangeReset(h.hosts["display-a::pane-1"], "display-a::pane-1");
  let prevented = 0, stopped = 0;
  const sliderPointerEvent = () => ({
    button:0, pointerId:7, clientX:220, clientY:240,
    target:{ closest(selector) { return selector === ".rangeslider-container" ? element() : null; } },
    preventDefault() { prevented += 1; }, stopPropagation() { stopped += 1; }
  });
  h.hosts["display-a::pane-1"].dispatch("pointerdown", sliderPointerEvent());
  h.hosts["display-a::pane-1"].dispatch("pointerup", sliderPointerEvent());
  h.hosts["display-a::pane-1"].dispatch("pointerdown", sliderPointerEvent());
  h.hosts["display-a::pane-1"].dispatch("pointerup", sliderPointerEvent());
  await h.settle();
  const horizontalReset = h.relayoutCalls[1].update;
  assert(horizontalReset["xaxis.range"] === null && horizontalReset["xaxis.autorange"] === true && horizontalReset["xaxis.rangeslider.range"] === null && horizontalReset["xaxis.rangeslider.autorange"] === true, "double-clicking the horizontal slider must delegate the default X range to Plotly autorange without invented numeric bounds");
  assert(!Object.keys(horizontalReset).some((key) => key.indexOf("yaxis.") === 0) && prevented === 1 && stopped === 1, "horizontal slider reset must not alter Y and must consume the slider double-click");

  const secondTrigger = trigger("pane-2");
  h.test.openMenu(secondTrigger);
  assert(h.menu.dataset.paneId === "pane-2" && h.rangeAction.getAttribute("aria-checked") === "false", "a later ellipsis must expose only its own pane-local state");
  h.test.closeMenu(false);
  h.test.openMenu(firstTrigger);
  assert(h.rangeAction.getAttribute("aria-checked") === "true", "reopening the original pane must restore its checked state during the session");
  h.test.toggle();
  await h.settle();
  assert(h.relayoutCalls.length === 3 && h.relayoutCalls[2].update["xaxis.rangeslider.visible"] === false, "the checked action must disable the native overview on the same host");
  assert(!Object.keys(h.relayoutCalls[2].update).some((key) => /^yaxis.*\.fixedrange$/.test(key)) && h.test.model.rangeSliderByPane["display-a::pane-1"] === false, "disable must leave ordinary Y interaction untouched and retain off state");

  h.test.openMenu(firstTrigger);
  h.test.toggleAmplitude();
  await h.settle();
  assert(h.relayoutCalls.length === 4 && h.relayoutCalls[3].update["margin.r"] >= 48, "the amplitude toggle must reserve only its own narrow in-plot control margin");
  assert(h.test.model.amplitudeSliderByPane["display-a::pane-1"] === true && h.test.model.rangeSliderByPane["display-a::pane-1"] === false, "amplitude and range sliders must remain independently selectable");
  h.test.queueAmplitude(h.hosts["display-a::pane-1"], "display-a::pane-1", [-3, 1]);
  h.flushFrame();
  await h.settle();
  const amplitudeUpdate = h.relayoutCalls[4].update;
  assert(amplitudeUpdate["yaxis.range[0]"] === -3 && amplitudeUpdate["yaxis.range[1]"] === 1 && amplitudeUpdate["yaxis.autorange"] === false, "amplitude interaction must relayout only the Y range");
  assert(!Object.keys(amplitudeUpdate).some((key) => key.indexOf("xaxis.") === 0), "amplitude interaction must not change the independent X range");
  assert(JSON.stringify(h.test.model.amplitudeFullRangeByPane["display-a::pane-1"]) === "[-3,2]", "amplitude full range must include both selected handles and all signal values");

  const baseLayout = { xaxis:{ title:"Время" }, yaxis:{ title:"A" }, yaxis2:{ title:"B" }, margin:{ l:51, r:260 } };
  h.test.model.rangeSliderByPane["display-a::pane-1"] = true;
  const decorated = h.test.layout(baseLayout, "display-a::pane-1");
  assert(decorated !== baseLayout && decorated.xaxis !== baseLayout.xaxis && decorated.xaxis.rangeslider.visible === true && decorated.xaxis.rangeslider.thickness === 0.15, "ordinary Plotly refresh must reapply the current-session native slider without mutating provider layout");
  assert(decorated.yaxis.fixedrange === undefined && decorated.yaxis2.fixedrange === undefined && decorated.margin.l === 51 && decorated.margin.r === 48, "both slider decorations must preserve provider layout without blocking either Y axis");
  assert(JSON.stringify(decorated.yaxis.range) === "[-3,1]" && decorated.legend.x === 0.99 && decorated.legend.xanchor === "right" && decorated.legend.y === 0.99 && decorated.legend.yanchor === "top", "refresh must preserve amplitude selection and force the legend to overlay the plot at top right");
  h.test.model.amplitudeSliderByPane["display-a::pane-1"] = false;
  const overlayOnly = h.test.layout(baseLayout, "display-a::pane-1");
  assert(overlayOnly.margin.r === 12, "an in-plot legend must not retain the provider's old side-column margin");

  h.test.model.layout.panes[0].plot_type = "spectrum";
  h.test.openMenu(firstTrigger);
  assert(h.rangeAction.disabled && /доступен только для загруженной временной области/.test(h.rangeAction.getAttribute("aria-label")), "a non-time pane must keep a disabled toggle with the accessible reason");
  assert(h.amplitudeAction.disabled && /доступен только для загруженной временной области/.test(h.amplitudeAction.getAttribute("aria-label")), "a non-time pane must disable the mirrored amplitude control with the same reason");
  h.test.closeMenu(false);
  h.test.model.layout.panes[0].plot_type = "time";
  h.test.model.layout.panes[0].signal_bindings = [];
  h.test.openMenu(firstTrigger);
  assert(h.rangeAction.disabled, "an empty pane must keep the Range Slider action visible but disabled");
  h.test.closeMenu(false);

  h.test.model.layout.panes[0].signal_bindings = ["A"];
  h.test.model.rangeSliderByPane["display-a::pane-1"] = true;
  h.hosts["display-a::pane-1"].dataset.plotReady = "false";
  h.test.openMenu(firstTrigger);
  assert(h.rangeAction.disabled && h.rangeAction.getAttribute("aria-checked") === "true", "temporary loading must retain checked preference while disabling the action");
  h.test.closeMenu(false);
  h.hosts["display-a::pane-1"].dataset.plotReady = "true";

  h.test.openMenu(firstTrigger);
  h.test.openHelp(h.helpAction);
  assert(!h.help.hidden && h.helpClose.focusCount === 1, "Graph Help must open its retained nonmodal overlay and focus Close");
  h.test.closeHelp(true);
  assert(h.help.hidden && h.helpAction.focusCount === 1, "closing Graph Help must restore focus to its invoking menu action");
  h.test.closeMenu(true);
  assert(firstTrigger.focusCount >= 1, "closing the pane menu must restore focus to the exact ellipsis trigger");

  h.test.openMenu(firstTrigger);
  h.test.openClear();
  assert(!h.clearLayer.hidden && h.shell.inert && h.clearTitle.focusCount === 1, "Clear must retain its targeted confirmation and modal focus state");
  h.test.confirmClear();
  await h.settle();
  const layoutCalls = h.apiCalls.filter((call) => call.property === "layouts");
  assert(layoutCalls.length === 1, "Clear confirmation must issue exactly one layout mutation");
  assert(JSON.stringify(layoutCalls[0].payload.signal_bindings) === "[]" && layoutCalls[0].payload.pane_id === "pane-1" && layoutCalls[0].payload.plot_type === "time" && layoutCalls[0].payload.operation === "update_pane", "Clear must empty exactly the originally targeted pane with update_pane");
  assert(!h.test.model.rangeSliderByPane["display-a::pane-1"], "clearing a pane must remove its session-only slider preference");
  assert(!h.test.model.amplitudeSliderByPane["display-a::pane-1"], "clearing a pane must remove its session-only amplitude preference");

  h.test.model.rangeSliderByPane["display-a::pane-2"] = true;
  h.test.accept(snapshot(9, [pane("pane-1", "time", []), pane("pane-3", "time", ["A"])]));
  assert(!Object.prototype.hasOwnProperty.call(h.test.model.rangeSliderByPane, "display-a::pane-2"), "accepting a layout that removed a pane must clean up its slider preference");
};
