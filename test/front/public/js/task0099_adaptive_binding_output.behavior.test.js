"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function pane(id, plotType, bindings) {
  return { id, plot_type: plotType, signal_bindings: bindings.slice() };
}

function snapshot(revision, panes, activePane) {
  return {
    state_revision: revision,
    active_display_id: "display-1",
    displays: [{ id: "display-1", measurement_kinds: [], peaks_enabled: false }],
    signals: [{ name: "A" }, { name: "B" }, { name: "C" }],
    layouts: [{
      display_id: "display-1",
      layout: { rows: 1, columns: panes.length, active_pane_id: activePane || panes[0].id, panes }
    }]
  };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

function outputResponse(revision, paneId, ready, calculationRevision, contextKey) {
  return {
    state_revision: revision,
    display_id: "display-1",
    pane_id: paneId,
    plot_type: "time",
    context_key: contextKey || `ctx-${paneId}`,
    calculation_revision: calculationRevision == null ? revision : calculationRevision,
    isready: ready,
    success: ready,
    error: "",
    data: ready ? [{ x: [0, 1], y: [0, 1] }] : []
  };
}

function element(extra) {
  const classValues = new Set();
  return Object.assign({
    dataset: {}, style: {}, classList: {
      toggle(value, force) { if (force === undefined ? !classValues.has(value) : force) classValues.add(value); else classValues.delete(value); },
      add(value) { classValues.add(value); }, remove(value) { classValues.delete(value); },
      contains(value) { return classValues.has(value); }
    },
    hidden: false, disabled: false, isConnected: true, offsetParent: {},
    setAttribute() {}, removeAttribute() {}, hasAttribute() { return false; }, getAttribute() { return null; }, addEventListener() {},
    querySelector() { return null; }, contains() { return false; }, focus() {},
    getBoundingClientRect() { return { width: 480, height: 260 }; }
  }, extra || {});
}

function createHarness(initialPanes) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace(
    "})(window, document);",
    "window.__task0099 = { model:model, accept:accept, mutate:mutate, postLayout:postLayout, output:output, fetchPaneOutput:fetchPaneOutput, stopPaneOutput:stopPaneOutput, renderGrid:renderGrid }; })(window, document);"
  );

  const layoutCalls = [];
  const outputCalls = [];
  const settingsLoads = [];
  const outputQueue = [];
  const layoutQueue = [];
  const timers = [];
  const cancelledTimers = new Set();
  const frames = [];
  const hosts = {};
  function outputChild(markup) {
    const state = (markup.match(/data-pane-output-state='([^']+)'/) || [])[1] || "";
    const episode = (markup.match(/data-loader-episode-key='([^']+)'/) || [])[1];
    const provisional = (markup.match(/data-loader-episode-provisional='([^']+)'/) || [])[1];
    const paneHost = (markup.match(/data-pane-host='([^']+)'/) || [])[1];
    const spinner = episode ? element({ dataset: { loaderEpisodeKey: episode } }) : null;
    const child = element({
      dataset: { paneOutputState: state },
      querySelector(selector) { return selector === "[data-loader-spinner]" ? spinner : null; }
    });
    if (episode) child.dataset.loaderEpisodeKey = episode;
    if (provisional) child.dataset.loaderEpisodeProvisional = provisional;
    if (paneHost) {
      child.dataset.paneHost = paneHost;
      child.dataset.plotReady = "false";
      hosts[paneHost] = child;
    }
    child.__spinner = spinner;
    return child;
  }
  function canvasElement() {
    let markup = "";
    let child = null;
    const canvas = element();
    Object.defineProperties(canvas, {
      innerHTML: { configurable: true, get() { return markup; }, set(value) {
        if (child) { child.isConnected = false; if (child.__spinner) child.__spinner.isConnected = false; }
        markup = value;
        child = value ? outputChild(value) : null;
      } },
      firstElementChild: { configurable: true, get() { return child; } }
    });
    return canvas;
  }
  function paneElement() {
    const title = element();
    const select = element({ options: [], value: "" });
    const menu = element();
    const canvas = canvasElement();
    let markup = "";
    const node = element({
      querySelector(selector) {
        if (selector === ".plot-pane-title") return title;
        if (selector === ".pane-select") return select;
        if (selector === ".plot-more") return menu;
        if (selector === ".plot-canvas") return canvas;
        return null;
      },
      remove() {
        if (node.parentElement) {
          const index = node.parentElement.children.indexOf(node);
          if (index >= 0) node.parentElement.children.splice(index, 1);
        }
        node.isConnected = false;
      }
    });
    Object.defineProperty(node, "innerHTML", { configurable: true, get() { return markup; }, set(value) { markup = value; } });
    node.__canvas = canvas;
    return node;
  }
  const grid = element({
    dataset: {},
    style: {},
    children: [],
    querySelector(selector) {
      const match = selector.match(/^\[data-pane-id='([^']+)'\]\[data-display-id='([^']+)'\]$/);
      return match ? this.children.find((node) => node.dataset.paneId === match[1] && node.dataset.displayId === match[2]) || null : null;
    },
    insertBefore(node, reference) {
      const current = this.children.indexOf(node);
      if (current >= 0) this.children.splice(current, 1);
      const target = reference ? this.children.indexOf(reference) : -1;
      if (target >= 0) this.children.splice(target, 0, node); else this.children.push(node);
      node.parentElement = this;
    }
  });
  Object.defineProperty(grid, "innerHTML", { configurable: true, get() { return this.children.map((node) => node.__canvas.innerHTML).join(""); } });
  const shell = element();
  const inspector = element();
  const tabs = element();
  const nodes = {
    "[data-testid='plot-grid']": grid,
    "[data-testid='app-shell']": shell,
    "[data-inspector-content]": inspector,
    "[data-testid='display-tabs']": tabs,
    "[data-testid='display-tabs-wrap']": element()
  };
  const document = {
    body: element(),
    querySelector(selector) {
      if (nodes[selector]) return nodes[selector];
      const hostMatch = selector.match(/^\[data-pane-host='(.+)'\]$/);
      return hostMatch ? (hosts[hostMatch[1]] || null) : null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement(tagName) { return tagName === "section" ? paneElement() : element(); },
    head: { appendChild() {} }
  };
  const window = {
    SignalAnalyserApi: {
      layouts(payload) {
        layoutCalls.push(payload);
        const result = layoutQueue.shift();
        return result && result.promise ? result.promise : Promise.resolve(result);
      },
      activeOutput(displayId, paneId) {
        outputCalls.push({ displayId, paneId });
        const result = outputQueue.shift();
        return result && result.promise ? result.promise : Promise.resolve(result);
      },
      getState() { return Promise.resolve(snapshot(999, initialPanes)); }
    },
    SignalAnalyserSettings: {
      setRevision() {}, setContext() {}, setView() {}, render() {}, markApplied() {},
      state() { return { dirty: false, invalid: false, revision: 1 }; },
      load() { settingsLoads.push(true); return Promise.resolve(); }
    },
    SignalAnalyserValueSelect: {
      configure(node, config) { node.__valueSelectConfig = config; return node; },
      markup(config) { return "<button data-value-select-key='" + config.key + "'><span>" + config.label + "</span></button>"; },
      reconcile() {}, close() {}
    },
    Plotly: { react() { return Promise.resolve(); } },
    addEventListener() {},
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    setTimeout(callback, delay) { const id = timers.length + 1; timers.push({ id, callback, delay }); return id; },
    clearTimeout(id) { cancelledTimers.add(id); }
  };
  vm.runInNewContext(source, {
    window, document, Promise, Error, Array, Object, String, Number, Boolean, Math,
    CSS: { escape(value) { return value; } }, isFinite
  }, { filename: "public/js/app.js" });
  const test = window.__task0099;
  test.accept(snapshot(1, initialPanes));
  return {
    test, layoutCalls, outputCalls, settingsLoads, outputQueue, layoutQueue,
    timers, cancelledTimers, frames, grid, hosts,
    async settle() { await Promise.resolve(); await Promise.resolve(); await new Promise((resolve) => setImmediate(resolve)); },
    runTimer(index) { const timer = timers[index]; if (!timer || cancelledTimers.has(timer.id)) throw new Error(`timer ${index} unavailable`); timer.callback(); },
    flushFrames() { while (frames.length) frames.shift()(); }
  };
}

module.exports = async function testTask0099AdaptiveBindingOutput(assert) {
  const p1 = pane("pane-1", "time", ["A"]), p2 = pane("pane-2", "time", ["B"]);

  const paneSelector = createHarness([p1, p2]);
  paneSelector.test.renderGrid();
  const paneConfig = paneSelector.grid.children[0].querySelector(".pane-select").__valueSelectConfig;
  assert(paneConfig && paneConfig.value === "time" && paneConfig.options.length === 4, "pane graph type must be wired through the shared value-selector configuration");
  paneSelector.layoutQueue.push(snapshot(2, [pane("pane-1", "spectrum", ["A"]), p2]));
  paneSelector.outputQueue.push(Promise.resolve(Object.assign(outputResponse(2, "pane-1", true), { plot_type: "spectrum" })));
  paneConfig.onSelect("spectrum");
  await paneSelector.settle();
  assert(paneSelector.layoutCalls.length === 1 && paneSelector.layoutCalls[0].operation === "update_pane" && paneSelector.layoutCalls[0].plot_type === "spectrum", "one pane selector choice must invoke the existing layout mutation exactly once");
  assert(paneSelector.settingsLoads.length === 1 && paneSelector.outputCalls.length === 1 && paneSelector.outputCalls[0].paneId === "pane-1", "one pane selector choice must preserve exactly one settings refresh and one target-pane output request");

  const binding = createHarness([p1, p2]);
  binding.test.model.outputs["display-1::pane-1"] = { context_key: "old", calculation_revision: 1, output: outputResponse(1, "pane-1", true, 1, "old") };
  const bindingReplacement = deferred();
  binding.layoutQueue.push(snapshot(2, [pane("pane-1", "time", ["A", "C"]), p2]));
  binding.outputQueue.push(bindingReplacement);
  await binding.test.postLayout({ operation: "update_pane", pane_id: "pane-1", plot_type: "time", signal_bindings: ["A", "C"] });
  assert(binding.settingsLoads.length === 0, "signal-binding-only update_pane must not reload settings");
  assert(binding.outputCalls.length === 1 && binding.outputCalls[0].paneId === "pane-1", "signal-binding-only update_pane must fetch only the exact changed pane");
  assert(binding.test.model.outputs["display-1::pane-1"].output.isready === true, "a nonempty-to-nonempty pending transition must retain the last ready output until replacement is accepted");
  bindingReplacement.resolve(outputResponse(2, "pane-1", true, 2, "new"));
  await binding.settle();
  assert(binding.test.model.outputs["display-1::pane-1"].context_key === "new", "the retained ready record must yield to the accepted exact-pane replacement");

  const plotType = createHarness([p1, p2]);
  plotType.layoutQueue.push(snapshot(2, [pane("pane-1", "spectrum", ["A"]), p2]));
  plotType.outputQueue.push(Promise.resolve(Object.assign(outputResponse(2, "pane-1", true), { plot_type: "spectrum" })));
  await plotType.test.postLayout({ operation: "update_pane", pane_id: "pane-1", plot_type: "spectrum", signal_bindings: ["A"] });
  await plotType.settle();
  assert(plotType.settingsLoads.length === 1, "plot-type-changing update_pane must reload settings once");
  assert(plotType.outputCalls.length === 1 && plotType.outputCalls[0].paneId === "pane-1", "plot-type-changing update_pane must still fetch only its exact pane");

  const resize = createHarness([p1, p2]);
  resize.layoutQueue.push(snapshot(2, [p1, p2]));
  resize.outputQueue.push(Promise.resolve(outputResponse(2, "pane-1", true)));
  resize.outputQueue.push(Promise.resolve(outputResponse(2, "pane-2", true)));
  await resize.test.postLayout({ operation: "resize", variant: "1x2", rows: 1, columns: 2 });
  await resize.settle();
  assert(resize.settingsLoads.length === 1, "resize must keep its full settings refresh");
  assert(resize.outputCalls.length === 2 && resize.outputCalls.map((call) => call.paneId).sort().join(",") === "pane-1,pane-2", "resize must refresh every nonempty pane, not only the active pane");

  const select = createHarness([p1, p2]);
  select.layoutQueue.push(snapshot(2, [p1, p2], "pane-2"));
  await select.test.postLayout({ operation: "select_pane", pane_id: "pane-2" }, { preservePlots: true, skipOutput: true });
  await select.settle();
  assert(select.settingsLoads.length === 1 && select.outputCalls.length === 0, "select_pane must refresh the selected settings context without re-fetching any graph output");

  const polling = createHarness([p1]);
  const firstPending = deferred();
  const activePending = deferred();
  polling.outputQueue.push(firstPending, activePending);
  polling.test.fetchPaneOutput("display-1", "pane-1", true, 50);
  polling.test.fetchPaneOutput("display-1", "pane-1", true, 50);
  assert(polling.outputCalls.length === 2, "a newer explicit fetch may supersede an in-flight request for the same pane");
  firstPending.resolve(outputResponse(1, "pane-1", false, 1, "stale"));
  await polling.settle();
  assert(polling.timers.length === 0, "a superseded response must not schedule a stale polling chain");
  activePending.resolve(outputResponse(1, "pane-1", false, 1, "ctx"));
  await polling.settle();
  assert(polling.timers.length === 1 && polling.timers[0].delay === 50, "the active polling chain must begin at 50 ms");
  polling.outputQueue.push(Promise.resolve(outputResponse(1, "pane-1", false, 1, "ctx")));
  polling.runTimer(0); await polling.settle();
  assert(polling.timers[1].delay === 100, "the second polling delay must back off to 100 ms");
  polling.outputQueue.push(Promise.resolve(outputResponse(1, "pane-1", false, 1, "ctx")));
  polling.runTimer(1); await polling.settle();
  assert(polling.timers[2].delay === 200, "the third polling delay must back off to 200 ms");
  polling.outputQueue.push(Promise.resolve(outputResponse(1, "pane-1", false, 1, "ctx")));
  polling.runTimer(2); await polling.settle();
  assert(polling.timers[3].delay === 350, "polling must reach the bounded 350 ms interval");
  polling.outputQueue.push(Promise.resolve(outputResponse(1, "pane-1", true, 2, "ctx")));
  polling.runTimer(3); await polling.settle();
  assert(polling.timers.length === 4, "a ready response must stop the polling chain without another timer");
  assert(polling.outputCalls.length === 6, "each scheduled step must issue exactly one request with no duplicate timer request");

  const fanout = createHarness([p1, p2]);
  const paneOneReady = deferred();
  const paneTwoPending = deferred();
  fanout.outputQueue.push(paneOneReady, paneTwoPending);
  fanout.test.model.revision = 10;
  fanout.test.output(true);
  assert(fanout.outputCalls.length === 2, "screen output refresh must start one independent request for every populated pane");
  paneOneReady.resolve(outputResponse(11, "pane-1", true, 11, "ctx-pane-1-new"));
  await fanout.settle();
  assert(fanout.test.model.revision === 11, "the first completed pane may advance the shared state revision");
  paneTwoPending.resolve(outputResponse(10, "pane-2", false, 10, "ctx-pane-2-new"));
  await fanout.settle();
  assert(fanout.test.model.outputs["display-1::pane-2"].context_key === "ctx-pane-2-new", "a still-current pane response must not be discarded only because another pane advanced the shared revision");
  assert(fanout.timers.length === 1 && fanout.timers[0].delay === 50, "the still-current pending pane must keep its own polling chain after another pane completes");

  const stale = createHarness([p1]);
  stale.test.model.outputs["display-1::pane-1"] = { context_key: "current", calculation_revision: 5, output: outputResponse(5, "pane-1", true, 5, "current") };
  stale.test.model.revision = 5;
  stale.outputQueue.push(Promise.resolve(outputResponse(4, "pane-1", true, 6, "newer-context")));
  stale.test.fetchPaneOutput("display-1", "pane-1", true, 50);
  await stale.settle();
  assert(stale.test.model.outputs["display-1::pane-1"].context_key === "newer-context", "a current per-pane request must be accepted even when its state revision trails an independently completed pane");
  stale.outputQueue.push(Promise.resolve(outputResponse(5, "pane-1", true, 4, "different-context")));
  stale.test.fetchPaneOutput("display-1", "pane-1", true, 50);
  await stale.settle();
  assert(stale.test.model.outputs["display-1::pane-1"].context_key === "newer-context", "a different context with an older calculation revision must be rejected");

  const transition = createHarness([pane("pane-1", "time", [])]);
  transition.test.renderGrid();
  assert(transition.grid.innerHTML.includes("pane-empty-pane-1"), "an empty pane must render its placeholder before binding");
  transition.layoutQueue.push(snapshot(2, [p1]));
  transition.outputQueue.push(Promise.resolve(outputResponse(2, "pane-1", false, 2, "ctx")));
  await transition.test.postLayout({ operation: "update_pane", pane_id: "pane-1", plot_type: "time", signal_bindings: ["A"] });
  await transition.settle();
  transition.flushFrames();
  assert(transition.grid.innerHTML.includes("pane-loader-pane-1"), "empty-to-bound must create the loader while the exact pane output is pending");
  transition.outputQueue.push(Promise.resolve(outputResponse(2, "pane-1", true, 3, "ctx")));
  transition.runTimer(0); await transition.settle();
  transition.flushFrames();
  assert(transition.grid.innerHTML.includes("data-pane-host='display-1::pane-1'"), "the same empty-to-bound pane must create a Plotly host when ready data arrives");
};
