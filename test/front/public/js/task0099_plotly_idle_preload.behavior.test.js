"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function element(extra) {
  return Object.assign({
    dataset: {}, style: {}, hidden: false, disabled: false, inert: false,
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {}, getAttribute() { return null; }, addEventListener() {},
    querySelector() { return null; }, contains() { return false; }, focus() {}
  }, extra || {});
}

function createHarness(useIdleCallback) {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("bootstrapAttempt(bootstrapController.begin({ timeoutMs:bootstrapController.DEFAULT_TIMEOUT_MS }));", "");
  source = source.replace(
    "})(window, document);",
    "window.__plotlyIdleTest = { model:model, load:loadPlotly, schedule:schedulePlotlyIdlePreload, markup:outputMarkup }; })(window, document);"
  );

  const scripts = [];
  const idleCalls = [];
  const timers = [];
  const apiCalls = [];
  const settingsCalls = [];
  const displayTabs = element();
  const document = {
    body: element(),
    querySelector(selector) {
      if (selector === "[data-testid='display-tabs']") return displayTabs;
      if (selector === "[data-testid='display-tabs-wrap']") return element();
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement(tagName) { return tagName === "script" ? { tagName: "SCRIPT" } : element(); },
    head: { appendChild(script) { scripts.push(script); } }
  };
  const api = new Proxy({}, {
    get(_target, property) {
      return function () { apiCalls.push(property); return Promise.resolve(); };
    }
  });
  const settings = new Proxy({}, {
    get(_target, property) {
      return function () { settingsCalls.push(property); return property === "state" ? { dirty:false, invalid:false } : Promise.resolve(); };
    }
  });
  const window = {
    SignalAnalyserApi: api,
    SignalAnalyserSettings: settings,
    addEventListener() {},
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; }, clearTimeout() {}
  };
  if (useIdleCallback) window.requestIdleCallback = function (callback, options) { idleCalls.push({ callback, options }); return idleCalls.length; };
  vm.runInNewContext(source, {
    window, document, Promise, Error, Array, Object, String, Number, Boolean, Math,
    CSS: { escape(value) { return value; } }, isFinite
  }, { filename: "public/js/app.js" });
  return { test:window.__plotlyIdleTest, window, scripts, idleCalls, timers, apiCalls, settingsCalls };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

module.exports = async function testTask0099PlotlyIdlePreload(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const scheduler = (source.match(/function schedulePlotlyIdlePreload\(\)[\s\S]*?\n  \}/) || [""])[0];
  const bootstrap = (source.match(/function bootstrapAttempt\(token\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/requestIdleCallback\(preload, \{ timeout:1500 \}\)/.test(scheduler), "idle preload must use requestIdleCallback with the exact 1500 ms timeout");
  assert(/else window\.setTimeout\(preload, 1000\)/.test(scheduler), "idle preload must retain the exact 1000 ms timer fallback");
  assert(/settings\.load\(\)[\s\S]*?bootstrap\.acceptActiveSettings\(token\)[\s\S]*?window\.requestAnimationFrame[\s\S]*?bootstrap\.commitInitialRender\(token\)[\s\S]*?schedulePlotlyIdlePreload\(\)/.test(bootstrap), "preload scheduling must occur only after accepted state/settings and the initial rAF render barrier");
  assert(!/Plotly\.(?:react|newPlot|relayout)|enqueuePlot|fetchPaneOutput|activeOutput|settings\.|api\./.test(scheduler), "the scheduler must only invoke the existing Plotly loader and must not render, fetch or mutate application settings");

  const idle = createHarness(true);
  const initialRevision = idle.test.model.revision;
  const initialOutputs = JSON.stringify(idle.test.model.outputs);
  idle.test.schedule();
  assert(idle.idleCalls.length === 1 && idle.idleCalls[0].options.timeout === 1500, "idle-capable browsers must register one callback with timeout 1500");
  assert(idle.scripts.length === 0, "scheduling alone must not synchronously append Plotly or create hidden plot work");
  assert(idle.apiCalls.length === 0 && idle.settingsCalls.length === 0 && idle.test.model.revision === initialRevision && JSON.stringify(idle.test.model.outputs) === initialOutputs, "scheduling must not call APIs or mutate state/output records");
  idle.idleCalls[0].callback();
  assert(idle.scripts.length === 1 && idle.scripts[0].src === "./js/vendor/plotly-cartesian-3.1.0.min.js" && idle.scripts[0].async === true, "the idle callback must append the existing local asynchronous Plotly asset exactly once");
  const onDemandRace = idle.test.load();
  assert(idle.scripts.length === 1, "an on-demand load racing the idle preload must reuse the same promise and script element");
  let reactCalls = 0, relayoutCalls = 0, newPlotCalls = 0;
  idle.window.Plotly = {
    react() { reactCalls += 1; }, relayout() { relayoutCalls += 1; }, newPlot() { newPlotCalls += 1; }
  };
  idle.scripts[0].onload();
  await onDemandRace;
  assert(reactCalls === 0 && relayoutCalls === 0 && newPlotCalls === 0, "successful preload must not render against a hidden or synthetic Plotly host");
  idle.test.schedule();
  idle.idleCalls[1].callback();
  await settle();
  assert(idle.scripts.length === 1, "repeated idle and loaded on-demand calls must remain deduplicated");

  const fallback = createHarness(false);
  fallback.test.schedule();
  assert(fallback.timers.length === 1 && fallback.timers[0].delay === 1000 && fallback.scripts.length === 0, "browsers without requestIdleCallback must defer preload through the exact 1000 ms fallback");
  fallback.timers[0].callback();
  assert(fallback.scripts.length === 1, "the fallback callback must invoke the same local Plotly loader");
  fallback.scripts[0].onerror();
  await settle();
  assert(fallback.test.model.plotlyPromise === null, "a caught idle preload failure must reset the shared promise for a real render retry");
  const retry = fallback.test.load();
  assert(fallback.scripts.length === 2, "an on-demand load after preload failure must append one fresh retry script");
  fallback.window.Plotly = {};
  fallback.scripts[1].onload();
  await retry;

  const emptyMarkup = idle.test.markup("display-1", { id:"pane-1", signal_bindings:[] }, null);
  assert(/pane-empty-pane-1/.test(emptyMarkup) && !/data-pane-host|plot-initial-loading|plot-chart/.test(emptyMarkup), "idle preloading must not change the empty-pane contract or introduce a plot host/axes/loader");
  assert(idle.apiCalls.length === 0 && fallback.apiCalls.length === 0, "preload and retry flows must never call activeOutput or another application API");
};
