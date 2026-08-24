(function () {
  "use strict";
  var config = window.SignalAnalyserUIDesign || {};
  var base = String(config.assetBase || ".").replace(/\/$/, "");
  var bootstrap = window.SignalAnalyserBootstrapLoading;
  var assetsPromise = null;
  window.SignalAnalyserUIBase = base;

  var views = [
    ["[data-zone-slot='toolbar']", "html/zones/toolbar/view.html"],
    ["[data-zone-slot='workspace']", "html/zones/workspace/view.html"],
    ["[data-zone-slot='settings']", "html/zones/settings/view.html"],
    ["[data-zone-slot='inspector']", "html/zones/inspector/view.html"],
    ["[data-dialog-slot='signal-operation']", "html/dialogs/signal-operation/view.html"]
  ];
  var scripts = [
    "js/ui/components/value-select.js",
    "js/ui/zones/toolbar/ui.js",
    "js/ui/zones/workspace/ui.js",
    "js/ui/zones/settings/ui.js",
    "js/ui/zones/inspector/ui.js",
    "js/ui/dialogs/signal-operation.js",
    "js/ui/app.js"
  ];

  function get(path) {
    return fetch(base + "/" + path).then(function (response) {
      if (!response.ok) throw new Error("Design view unavailable");
      return response.text();
    });
  }
  function loadScript(path) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = base + "/" + path;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
  function ensureAssets() {
    if (assetsPromise) return assetsPromise;
    assetsPromise=Promise.all(views.map(function (entry) {
      return get(entry[1]).then(function (html) { document.querySelector(entry[0]).innerHTML = html; });
    })).then(function () {
      document.querySelectorAll("[data-asset]").forEach(function (node) { node.src = base + "/" + node.dataset.asset; });
      return scripts.reduce(function (chain, path) { return chain.then(function () { return loadScript(path); }); }, Promise.resolve());
    }).catch(function (error) { assetsPromise=null; throw error; });
    return assetsPromise;
  }
  function requiredData(provider,token) {
    var state;
    return Promise.resolve(provider.getState ? provider.getState() : null).then(function (nextState) {
      state=nextState;
      bootstrap.acceptInitialState(token);
      var displayId=state && (state.activeDisplayId || state.active_display_id);
      return provider.getActiveSettings ? provider.getActiveSettings(displayId) : Promise.resolve(null);
    }).then(function () {
      bootstrap.acceptActiveSettings(token);
      return state;
    });
  }
  function commit(token) {
    return new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        bootstrap.commitInitialRender(token);
        resolve();
      });
    });
  }
  function run(token) {
    var provider=window.SignalAnalyserProvider || {};
    return Promise.all([ensureAssets(),requiredData(provider,token)]).then(function (values) {
      return window.SignalAnalyserUI.init(provider,values[1]);
    }).then(function () { return commit(token); }).catch(function () { bootstrap.fail(token,"request"); });
  }

  window.addEventListener("signal-analyser:bootstrap-retry",function (event) { run(event.detail && event.detail.token); });
  run(bootstrap.begin());
}());
