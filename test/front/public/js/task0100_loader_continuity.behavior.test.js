"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function classList(onMutation) {
  const values = new Set();
  function changed() { if (onMutation) onMutation(new Set(values)); }
  return {
    add(value) { values.add(value); changed(); },
    remove(value) { values.delete(value); changed(); },
    toggle(value, force) {
      if (force === undefined ? !values.has(value) : force) values.add(value); else values.delete(value);
      changed();
    },
    contains(value) { return values.has(value); }
  };
}

function element(extra) {
  const attributes = {};
  const node = {
    dataset: {}, style: {}, hidden: false, disabled: false, isConnected: true,
    classList: classList(), children: [], parentElement: null, textContent: "",
    setAttribute(name, value) { attributes[name] = String(value); },
    removeAttribute(name) { delete attributes[name]; },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null; },
    addEventListener() {}, querySelector() { return null; }, contains() { return false; }, focus() {},
    getBoundingClientRect() { return { width: 480, height: 260 }; }
  };
  return Object.assign(node, extra || {});
}

function outputChild(markup, hosts) {
  function decode(value) { return value && value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }
  const state = (markup.match(/data-pane-output-state='([^']+)'/) || [])[1] || "";
  const episode = decode((markup.match(/data-loader-episode-key='([^']+)'/) || [])[1]);
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

function stateChild(markup) {
  const state = (markup.match(/data-extrema-state='([^']+)'/) || [])[1] || "";
  const episode = (markup.match(/data-loader-episode-key='([^']+)'/) || [])[1];
  const spinner = episode ? element({ dataset: { loaderEpisodeKey: episode } }) : null;
  const child = element({
    dataset: { extremaState: state },
    querySelector(selector) { return selector === "[data-loader-spinner]" ? spinner : null; }
  });
  if (episode) child.dataset.loaderEpisodeKey = episode;
  child.__spinner = spinner;
  return child;
}

function htmlHost(parse) {
  let markup = "";
  let child = null;
  const host = element();
  Object.defineProperties(host, {
    innerHTML: {
      configurable: true,
      get() { return markup; },
      set(value) {
        if (child) {
          child.isConnected = false;
          if (child.__spinner) child.__spinner.isConnected = false;
        }
        markup = value;
        child = value ? parse(value) : null;
      }
    },
    firstElementChild: { configurable: true, get() { return child; } }
  });
  return host;
}

function paneNode(hosts) {
  const title = element();
  const select = element({ options: [], value: "" });
  const menu = element();
  const canvas = htmlHost((markup) => outputChild(markup, hosts));
  const node = element({
    querySelector(selector) {
      if (selector === ".plot-pane-title") return title;
      if (selector === ".pane-select") return select;
      if (selector === ".plot-more") return menu;
      if (selector === ".plot-canvas") return canvas;
      return null;
    },
    remove() {
      const index = node.parentElement ? node.parentElement.children.indexOf(node) : -1;
      if (index >= 0) node.parentElement.children.splice(index, 1);
      node.isConnected = false;
      const child = canvas.firstElementChild;
      if (child) { child.isConnected = false; if (child.__spinner) child.__spinner.isConnected = false; }
    }
  });
  node.__canvas = canvas;
  return node;
}

function snapshot(panes, activePane) {
  return {
    state_revision: 1,
    active_display_id: "display-1",
    displays: [{ id: "display-1", measurement_kinds: [], peaks_enabled: true }],
    signals: panes.map((pane, index) => ({ name: pane.signal_bindings[0] || `S${index + 1}` })),
    layouts: [{
      display_id: "display-1",
      layout: { rows: 2, columns: 2, active_pane_id: activePane || panes[0].id, panes }
    }]
  };
}

function pendingRecord(paneId, context, calculation) {
  return {
    context_key: context,
    calculation_revision: calculation,
    output: {
      state_revision: 1, display_id: "display-1", pane_id: paneId,
      context_key: context, calculation_revision: calculation,
      isready: false, success: false, error: "", data: []
    }
  };
}

function terminalRecord(paneId, context, calculation, success) {
  return {
    context_key: context,
    calculation_revision: calculation,
    output: {
      state_revision: 1, display_id: "display-1", pane_id: paneId,
      context_key: context, calculation_revision: calculation,
      isready: true, success, error: success ? "" : "failure",
      data: success ? [{ x: [0, 1], y: [0, 1] }] : []
    }
  };
}

function createHarness() {
  const root = path.resolve(__dirname, "../../../..");
  let source = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  source = source.replace(/\n  refreshSnapshot\(\)\.then\([\s\S]*?\n  \}\)\.catch\(showBootstrapError\);/, "");
  source = source.replace("bootstrapAttempt(bootstrapController.begin({ timeoutMs:bootstrapController.DEFAULT_TIMEOUT_MS }));", "");
  source = source.replace(
    "})(window, document);",
    "window.__task0100 = { model:model, accept:accept, renderGrid:renderGrid, reconcilePaneOutput:reconcilePaneOutput, renderPeaksInspector:renderPeaksInspector, syncApplyLoader:syncApplyLoader }; })(window, document);"
  );

  const hosts = {};
  const grid = element({ dataset: {}, style: {}, children: [] });
  grid.querySelector = function (selector) {
    const match = selector.match(/^\[data-pane-id='([^']+)'\]\[data-display-id='([^']+)'\]$/);
    return match ? grid.children.find((node) => node.dataset.paneId === match[1] && node.dataset.displayId === match[2]) || null : null;
  };
  grid.insertBefore = function (node, reference) {
    const current = grid.children.indexOf(node);
    if (current >= 0) grid.children.splice(current, 1);
    const target = reference ? grid.children.indexOf(reference) : -1;
    if (target >= 0) grid.children.splice(target, 0, node); else grid.children.push(node);
    node.parentElement = grid;
  };

  const tabs = element();
  const nodes = {
    "[data-testid='plot-grid']": grid,
    "[data-testid='display-tabs']": tabs,
    "[data-testid='display-tabs-wrap']": element()
  };
  const document = {
    body: element(),
    querySelector(selector) {
      if (nodes[selector]) return nodes[selector];
      const hostMatch = selector.match(/^\[data-pane-host='(.+)'\]$/);
      return hostMatch ? hosts[hostMatch[1]] || null : null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement(tagName) { return tagName === "section" ? paneNode(hosts) : element(); },
    head: { appendChild() {} }
  };
  const settings = {
    setRevision() {}, setContext() {}, setView() {}, render() {}, load() { return Promise.resolve(); },
    state() { return { dirty: false, invalid: false, revision: 1 }; }
  };
  const window = {
    SignalAnalyserApi: new Proxy({}, { get() { return function () { throw new Error("loader reconciliation must not call an API"); }; } }),
    SignalAnalyserSettings: settings,
    SignalAnalyserValueSelect: {
      configure(node, config) { node.__valueSelectConfig = config; return node; },
      markup(config) { return "<button data-value-select-key='" + config.key + "'><span>" + config.label + "</span></button>"; },
      reconcile() {}, close() {}
    },
    addEventListener() {}, clearTimeout() {}, setTimeout() { return 1; },
    requestAnimationFrame(callback) { if (callback) callback(); return 1; }, cancelAnimationFrame() {}
  };
  vm.runInNewContext(source, {
    window, document, Promise, Error, Array, Object, String, Number, Boolean, Math,
    CSS: { escape(value) { return value; } }, isFinite
  }, { filename: "public/js/app.js" });
  return { test: window.__task0100, grid, hosts };
}

function spinnerOf(host) {
  const child = host && host.firstElementChild;
  return child && child.querySelector("[data-loader-spinner]");
}

function block(source, start, next) {
  return (source.match(new RegExp("function " + start + "\\([\\s\\S]*?(?=\\n  function " + next + "\\()")) || [""])[0];
}

module.exports = async function testTask0100LoaderContinuity(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const appCss = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const themeCss = fs.readFileSync(path.join(root, "public/css/theme.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

  const graphReconcile = block(app, "reconcilePaneOutput", "reconcilePaneNode");
  const extremaRender = block(app, "renderPeaksInspector", "peaksSettingsKey");
  const applySync = block(app, "syncApplyLoader", "renderInspector");
  assert(!/api\.|setTimeout|fetch\(/.test(graphReconcile + extremaRender + applySync), "loader reconciliation must not change API calls, polling cadence, or data flow");
  assert(/current\.dataset\.loaderEpisodeKey === episode\.key/.test(graphReconcile) && /if \(sameEpisode\) return/.test(graphReconcile), "graph loading must be reconciled by the exact stable episode key");
  assert(/loading\.dataset\.loaderEpisodeKey === episodeKey\) return/.test(extremaRender), "Extrema loading must retain its exact node for the same loading episode");
  assert(/if \(pending\) button\.classList\.add\("is-pending"\)[\s\S]*if \(!applying\) button\.classList\.remove\("is-applying"\)/.test(applySync), "Apply must add the next busy phase before removing the prior phase so its pseudo-element has no gap");

  const paneSpinnerRule = (appCss.match(/\.plot-initial-loading \.spinner\s*\{[^}]*\}/) || [""])[0];
  const extremaSpinnerRule = (appCss.match(/\.peaks-loading \.spinner\s*\{[^}]*\}/) || [""])[0];
  const applySpinnerRule = (appCss.match(/\.settings-apply\.is-applying::before,[\s\S]*?\{[^}]*\}/) || [""])[0];
  const overlaySpinnerRule = (themeCss.match(/\.ui-loader-spinner\s*\{[^}]*\}/) || [""])[0];
  [paneSpinnerRule, extremaSpinnerRule].forEach((rule, index) => {
    assert(/width:\s*28px/.test(rule) && /height:\s*28px/.test(rule) && /border:\s*3px solid/.test(rule), `${index ? "Extrema" : "graph"} spinner must retain exact 28px/3px geometry`);
    assert(/box-sizing:\s*border-box/.test(rule) && /display:\s*block/.test(rule) && /opacity:\s*1/.test(rule) && /border-radius:\s*50%/.test(rule) && /transform-origin:\s*50% 50%/.test(rule), `${index ? "Extrema" : "graph"} spinner ring geometry must remain invariant`);
    assert(/animation:\s*loader-rotate 800ms linear infinite/.test(rule), `${index ? "Extrema" : "graph"} spinner must use the shared full-turn linear animation`);
  });
  assert(/width:\s*12px/.test(applySpinnerRule) && /height:\s*12px/.test(applySpinnerRule) && /border:\s*2px solid/.test(applySpinnerRule) && /display:\s*block/.test(applySpinnerRule) && /opacity:\s*1/.test(applySpinnerRule) && /transform-origin:\s*50% 50%/.test(applySpinnerRule) && /animation:\s*loader-rotate 800ms linear infinite/.test(applySpinnerRule), "Apply spinner must retain exact 12px/2px invariant full-turn geometry");
  assert(/width:\s*64px/.test(overlaySpinnerRule) && /height:\s*64px/.test(overlaySpinnerRule) && /border:\s*5px solid/.test(overlaySpinnerRule) && /display:\s*block/.test(overlaySpinnerRule) && /opacity:\s*1/.test(overlaySpinnerRule) && /transform-origin:\s*50% 50%/.test(overlaySpinnerRule) && /animation:\s*loader-rotate 800ms linear infinite/.test(overlaySpinnerRule), "theme overlay spinner must retain exact 64px/5px invariant full-turn geometry");
  [appCss, themeCss].forEach((css, index) => {
    const keyframes = (css.match(/@keyframes loader-rotate\s*\{[\s\S]*?\n\}/) || [""])[0];
    assert(/from\s*\{\s*transform:\s*rotate\(0deg\)/.test(keyframes) && /to\s*\{\s*transform:\s*rotate\(360deg\)/.test(keyframes), `${index ? "theme" : "app"} animation must explicitly cover one complete 0-to-360 degree turn`);
    assert(!/opacity|steps\(|alternate/.test(keyframes), `${index ? "theme" : "app"} keyframes must not blink, step, or reverse the fixed arc`);
  });
  const reducedApp = (appCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/) || [""])[0];
  const reducedTheme = (themeCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/) || [""])[0];
  assert(/\.plot-initial-loading \.spinner/.test(reducedApp) && /\.peaks-loading \.spinner/.test(reducedApp) && /\.settings-apply\.is-applying::before/.test(reducedApp) && /animation:\s*none/.test(reducedApp) && /transform:\s*rotate\(45deg\)/.test(reducedApp), "reduced motion must stop graph, Extrema, and Apply rotation at the visible 45-degree arc");
  assert(/\.ui-loader-spinner/.test(reducedTheme) && /animation:\s*none/.test(reducedTheme) && /transform:\s*rotate\(45deg\)/.test(reducedTheme), "reduced motion must stop the theme overlay at the visible 45-degree arc");
  const appLoading = (html.match(/<div data-testid="app-loading"[\s\S]*?<\/div>/) || [""])[0];
  assert(/<span data-loading-text>/.test(appLoading) && !/spinner|svg|img|progress/i.test(appLoading), "compact app-loading must remain text-only without a circular indicator");

  const panes = [1, 2, 3, 4].map((number) => ({ id: `pane-${number}`, plot_type: "time", signal_bindings: [`S${number}`] }));
  const harness = createHarness();
  harness.test.accept(snapshot(panes));
  panes.forEach((pane, index) => { harness.test.model.outputs[`display-1::${pane.id}`] = pendingRecord(pane.id, `ctx-${index}`, 1); });
  harness.test.renderGrid();
  assert(harness.grid.children.length === 4, "the 2x2 loading fixture must contain four independent pane nodes");
  const originals = harness.grid.children.map((node) => spinnerOf(node.__canvas));
  assert(originals.every((spinner) => spinner && spinner.isConnected), "all four 2x2 pane spinners must coexist as distinct connected nodes");
  assert(new Set(originals).size === 4, "each pane must own its own spinner object");

  for (let pass = 0; pass < 3; pass += 1) {
    harness.test.renderGrid();
    harness.grid.children.forEach((node, index) => {
      assert(spinnerOf(node.__canvas) === originals[index] && originals[index].isConnected, `pending parent render ${pass + 1} must retain pane ${index + 1} spinner identity`);
    });
  }
  harness.test.model.activePane = "pane-4";
  harness.test.renderGrid();
  harness.grid.children.forEach((node, index) => assert(spinnerOf(node.__canvas) === originals[index], `unrelated active-pane render must not restart pane ${index + 1}`));

  const firstCanvas = harness.grid.children[0].__canvas;
  harness.test.reconcilePaneOutput(firstCanvas, "display-1", panes[0], pendingRecord("pane-1", "ctx-0", 1));
  assert(spinnerOf(firstCanvas) === originals[0] && originals.slice(1).every((spinner, index) => spinnerOf(harness.grid.children[index + 1].__canvas) === spinner), "rerendering one 2x2 pane must preserve every independent spinner node");
  harness.test.reconcilePaneOutput(firstCanvas, "display-1", panes[0], pendingRecord("pane-1", "ctx-new", 1));
  const contextSpinner = spinnerOf(firstCanvas);
  assert(contextSpinner !== originals[0] && !originals[0].isConnected && contextSpinner.isConnected, "a genuine graph context change must replace the prior loading episode");
  harness.test.reconcilePaneOutput(firstCanvas, "display-1", panes[0], pendingRecord("pane-1", "ctx-new", 2));
  const calculationSpinner = spinnerOf(firstCanvas);
  assert(calculationSpinner !== contextSpinner && !contextSpinner.isConnected, "a genuine graph calculation revision change must replace the prior loading episode");
  const changedPane = { id: "pane-1", plot_type: "spectrum", signal_bindings: ["S1"] };
  harness.test.reconcilePaneOutput(firstCanvas, "display-1", changedPane, pendingRecord("pane-1", "ctx-new", 2));
  const stateSpinner = spinnerOf(firstCanvas);
  assert(stateSpinner !== calculationSpinner && !calculationSpinner.isConnected, "a genuine pane-state change must replace the prior loading episode");
  harness.test.reconcilePaneOutput(firstCanvas, "display-1", changedPane, terminalRecord("pane-1", "ctx-new", 2, true));
  assert(!stateSpinner.isConnected && firstCanvas.firstElementChild.dataset.paneOutputState === "ready" && !spinnerOf(firstCanvas), "ready graph state must remove the loading spinner");

  const terminalCanvas = htmlHost((markup) => outputChild(markup, harness.hosts));
  harness.test.reconcilePaneOutput(terminalCanvas, "display-1", panes[0], pendingRecord("pane-1", "error", 1));
  const errorSpinner = spinnerOf(terminalCanvas);
  harness.test.reconcilePaneOutput(terminalCanvas, "display-1", panes[0], terminalRecord("pane-1", "error", 1, false));
  assert(!errorSpinner.isConnected && terminalCanvas.firstElementChild.dataset.paneOutputState === "error" && !spinnerOf(terminalCanvas), "error graph state must remove the loading spinner");
  harness.test.reconcilePaneOutput(terminalCanvas, "display-1", panes[0], pendingRecord("pane-1", "empty", 1));
  const emptySpinner = spinnerOf(terminalCanvas);
  harness.test.reconcilePaneOutput(terminalCanvas, "display-1", { id: "pane-1", plot_type: "time", signal_bindings: [] }, null);
  assert(!emptySpinner.isConnected && terminalCanvas.firstElementChild.dataset.paneOutputState === "empty" && !spinnerOf(terminalCanvas), "empty pane state must remove the loading spinner");

  const extremaHost = htmlHost(stateChild);
  const extremaBody = element({ querySelector(selector) { return selector === "[data-testid='peaks-table-scroll']" ? extremaHost : null; } });
  extremaHost.parentElement = extremaBody;
  harness.test.model.activePane = "pane-1";
  const extremaKey = "display-1::pane-1";
  harness.test.model.peaksRecords[extremaKey] = { displayId: "display-1", paneId: "pane-1", pending: true, loading_episode: "extrema-episode-1", calculated: false, error: null };
  harness.test.renderPeaksInspector(extremaBody);
  const extremaSpinner = spinnerOf(extremaHost);
  for (let pass = 0; pass < 3; pass += 1) {
    harness.test.renderPeaksInspector(extremaBody);
    assert(spinnerOf(extremaHost) === extremaSpinner && extremaSpinner.isConnected, `Extrema pending render ${pass + 1} must retain its exact spinner object`);
  }
  harness.test.model.peaksRecords[extremaKey] = { displayId: "display-1", paneId: "pane-1", pending: true, loading_episode: "extrema-episode-2", calculated: false, error: null };
  harness.test.renderPeaksInspector(extremaBody);
  const nextExtremaSpinner = spinnerOf(extremaHost);
  assert(nextExtremaSpinner !== extremaSpinner && !extremaSpinner.isConnected, "a genuine Extrema calculation episode must replace the prior spinner");
  harness.test.model.peaksRecords[extremaKey] = { displayId: "display-1", paneId: "pane-1", pending: false, calculated: false, error: "failure" };
  harness.test.renderPeaksInspector(extremaBody);
  assert(!nextExtremaSpinner.isConnected && extremaHost.firstElementChild.dataset.extremaState === "error" && !spinnerOf(extremaHost), "terminal Extrema error must remove its spinner");

  const applyMutations = [];
  const applyButton = element();
  applyButton.classList = classList((values) => applyMutations.push(values.has("is-applying") || values.has("is-pending")));
  const applyFooter = element();
  harness.test.syncApplyLoader(applyButton, applyFooter, "applying", "settings-episode-1");
  const sameButton = applyButton;
  const transitionStart = applyMutations.length;
  harness.test.syncApplyLoader(applyButton, applyFooter, "pending", "settings-episode-1");
  assert(applyButton === sameButton && applyButton.classList.contains("is-pending") && !applyButton.classList.contains("is-applying"), "Apply applying-to-pending transition must reuse the same button/pseudo-element owner");
  assert(applyMutations.slice(transitionStart).every(Boolean), "Apply applying-to-pending class mutations must never expose a phase gap without its pseudo-element");
  assert(applyButton.dataset.loaderEpisodeKey === "settings-episode-1" && applyFooter.dataset.loaderEpisodeKey === "settings-episode-1" && applyButton.getAttribute("aria-busy") === "true", "Apply must retain the exact episode key and busy semantics across applying-to-pending");
  harness.test.syncApplyLoader(applyButton, applyFooter, "pristine", "settings-episode-1");
  assert(!applyButton.classList.contains("is-applying") && !applyButton.classList.contains("is-pending") && !applyButton.hasAttribute("aria-busy") && !applyButton.dataset.loaderEpisodeKey, "Apply terminal state must remove its spinner classes, episode key, and busy state");
};
