(function registerGenieGraphOutputZone(window, document) {
  "use strict";

  var scriptPromises = {};

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function loadScript(src) {
    if (!src) return Promise.resolve();
    if (scriptPromises[src]) return scriptPromises[src];
    scriptPromises[src] = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src; script.async = true; script.onload = resolve;
      script.onerror = function () {
        delete scriptPromises[src];
        reject(new Error("Не удалось загрузить локальный ресурс: " + src));
      };
      document.head.appendChild(script);
    });
    return scriptPromises[src];
  }

  function createGraphOutputZone(options) {
    var config = options || {};
    var root = null;
    var resizeObserver = null;
    var state = {
      page: { data: null, isready: false, success: false, error: "" },
      renderToken: 0,
    };

    function plotSpecs() {
      if (Array.isArray(state.page.data)) return state.page.data;
      if (state.page.data && state.page.data.plot) return [state.page.data.plot];
      return [];
    }

    function ensurePlotly() {
      return (window.Plotly ? Promise.resolve() : loadScript(config.plotlySrc || "./vendor/plotly/plotly.min.js"))
        .then(function () { return loadScript(config.localeSrc || "./vendor/plotly/plotly-locale-ru.js"); })
        .then(function () {
          if (!window.Plotly) throw new Error("Локальная библиотека Plotly не зарегистрирована");
          return window.Plotly;
        });
    }

    function renderPlots() {
      var token = ++state.renderToken;
      var elements = root && root.querySelectorAll ? Array.from(root.querySelectorAll("[data-graph-plot]")) : [];
      if (!elements.length || !state.page.isready || !state.page.success) return Promise.resolve(null);
      return ensurePlotly().then(function (Plotly) {
        if (!root || token !== state.renderToken) return null;
        return Promise.all(elements.map(function (element, index) {
          var spec = plotSpecs()[index] || {};
          return Plotly.react(element, spec.data || [], spec.layout || {}, Object.assign({
            responsive: false, locale: "ru", displaylogo: false,
          }, spec.config || {}));
        }));
      }).catch(function (error) {
        if (typeof config.reportError === "function") config.reportError(error, "graph-render");
        else throw error;
        return null;
      });
    }

    function render() {
      var controls = typeof config.renderControls === "function" ? config.renderControls(state, module) : "";
      var body;
      if (!state.page.isready) {
        body = '<div class="graph-output-overlay" role="status"><span class="graph-output-spinner"></span></div>';
      } else if (!state.page.success) {
        body = '<div class="graph-output-overlay graph-output-error" role="alert">' +
          escapeHtml(state.page.error || "Не удалось получить данные") + "</div>";
      } else {
        body = plotSpecs().map(function (_, index) {
          return '<div class="graph-output-frame"><div class="graph-output-plot" data-graph-plot="' + index + '"></div></div>';
        }).join("");
      }
      var html = '<section class="graph-output-zone"><div class="graph-output-controls">' + controls +
        '</div><div class="graph-output-canvas ' + escapeHtml(config.gridClass || "graph-output-grid") + '">' + body + "</div></section>";
      if (root) {
        root.innerHTML = html;
        renderPlots();
      }
      return html;
    }

    var actions = {
      setPageState: function (payload) {
        state.page = Object.assign({ data: null, isready: false, success: false, error: "" }, payload || {});
        render();
      },
      resize: function () {
        var elements = root && root.querySelectorAll ? root.querySelectorAll("[data-graph-plot]") : [];
        Array.from(elements).forEach(function (element) {
          if (window.Plotly && window.Plotly.Plots) window.Plotly.Plots.resize(element);
        });
      },
      refresh: renderPlots,
    };

    function mount(element) {
      if (!element) throw new Error("Graph output mount root is required");
      if (root) unmount();
      root = element;
      if (window.ResizeObserver) {
        resizeObserver = new window.ResizeObserver(actions.resize);
        resizeObserver.observe(root);
      }
      window.addEventListener("resize", actions.resize);
      render();
      return module;
    }

    function unmount() {
      var plots = root && root.querySelectorAll ? root.querySelectorAll("[data-graph-plot]") : [];
      state.renderToken += 1;
      window.removeEventListener("resize", actions.resize);
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = null;
      if (window.Plotly && typeof window.Plotly.purge === "function") {
        Array.from(plots).forEach(function (plot) { window.Plotly.purge(plot); });
      }
      if (root) root.innerHTML = "";
      root = null;
    }

    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieGraphOutputZone = { create: createGraphOutputZone, loadScript: loadScript };
})(window, document);
