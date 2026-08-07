(function registerGenieGraphOutputZone(window, document) {
  "use strict";

  var scriptPromises = {};

  function loadScript(src) {
    if (!src) return Promise.resolve();
    if (scriptPromises[src]) return scriptPromises[src];

    scriptPromises[src] = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () {
        delete scriptPromises[src];
        reject(new Error("Не удалось загрузить локальный ресурс: " + src));
      };
      document.head.appendChild(script);
    });

    return scriptPromises[src];
  }

  function clone(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
  }

  function createGraphOutputZone(options) {
    var config = options || {};
    var plotlySrc = config.plotlySrc || "./vendor/plotly/plotly.min.js";
    var localeSrc = config.localeSrc || "./vendor/plotly/plotly-locale-ru.js";
    var plotlyPromise = null;

    function ensurePlotly() {
      if (plotlyPromise) return plotlyPromise;

      plotlyPromise = (window.Plotly ? Promise.resolve() : loadScript(plotlySrc))
        .then(function () {
          if (!window.Plotly) throw new Error("Локальная библиотека Plotly не зарегистрирована");
          return loadScript(localeSrc);
        })
        .then(function () {
          return window.Plotly;
        })
        .catch(function (error) {
          plotlyPromise = null;
          throw error;
        });

      return plotlyPromise;
    }

    var PlotlyOutput = {
      props: {
        plot: {
          type: Object,
          default: function () {
            return { data: [], layout: {}, config: {} };
          },
        },
      },
      template: '<div class="graph-output-frame"><div ref="plot" class="graph-output-plot"></div></div>',
      mounted: function () {
        this.plotUnmounted = false;
        this.renderQueued = false;
        this.renderInFlight = null;
        this.lastSize = null;
        this.startResizeObserver();
        window.addEventListener("resize", this.handleResize);
        this.scheduleRender();
      },
      watch: {
        plot: function () {
          this.scheduleRender();
        },
      },
      beforeUnmount: function () {
        this.plotUnmounted = true;
        window.removeEventListener("resize", this.handleResize);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.renderFrame) window.cancelAnimationFrame(this.renderFrame);
        if (this.resizeFrame) window.cancelAnimationFrame(this.resizeFrame);
        if (window.Plotly && this.$refs.plot) {
          try {
            window.Plotly.purge(this.$refs.plot);
          } catch (error) {
            this.reportError(error);
          }
        }
      },
      methods: {
        reportError: function (error) {
          if (this.$root && typeof this.$root.showFrontendError === "function") {
            this.$root.showFrontendError(error);
            return;
          }
          throw error;
        },
        plotSize: function () {
          var element = this.$refs.plot;
          var rect = element && element.getBoundingClientRect ? element.getBoundingClientRect() : {};
          return {
            width: Math.floor((element && element.clientWidth) || rect.width || 0),
            height: Math.floor((element && element.clientHeight) || rect.height || 0),
          };
        },
        startResizeObserver: function () {
          var self = this;
          if (!window.ResizeObserver || !this.$refs.plot) return;
          this.resizeObserver = new window.ResizeObserver(function () {
            self.handleResize();
          });
          this.resizeObserver.observe(this.$refs.plot.parentElement || this.$refs.plot);
        },
        handleResize: function () {
          var self = this;
          var size;
          if (this.plotUnmounted || !this.$refs.plot) return;
          size = this.plotSize();
          if (size.width <= 0 || size.height <= 0) return;
          if (!this.lastSize ||
              this.lastSize.width !== size.width ||
              this.lastSize.height !== size.height) {
            this.scheduleRender();
            return;
          }
          if (this.renderInFlight) return;
          if (this.resizeFrame) window.cancelAnimationFrame(this.resizeFrame);
          this.resizeFrame = window.requestAnimationFrame(function () {
            self.resizeFrame = null;
            if (!self.plotUnmounted && window.Plotly && self.$refs.plot) {
              window.Plotly.Plots.resize(self.$refs.plot);
            }
          });
        },
        scheduleRender: function () {
          var self = this;
          if (this.plotUnmounted) return;
          if (this.renderInFlight) {
            this.renderQueued = true;
            return;
          }
          if (this.renderFrame) window.cancelAnimationFrame(this.renderFrame);
          this.renderFrame = window.requestAnimationFrame(function () {
            self.renderFrame = null;
            self.renderPlot();
          });
        },
        finishRender: function () {
          this.renderInFlight = null;
          if (this.plotUnmounted) return;
          if (this.renderQueued) {
            this.renderQueued = false;
            this.scheduleRender();
          }
        },
        renderPlot: function () {
          var self = this;
          var size = this.plotSize();
          var plot = this.plot || {};
          var layout;
          var plotConfig;

          if (!this.$refs.plot || size.width <= 0 || size.height <= 0) return;

          layout = clone(plot.layout || {}, {});
          layout.width = size.width;
          layout.height = size.height;
          layout.autosize = false;
          layout.paper_bgcolor = "#ffffff";
          layout.plot_bgcolor = "#ffffff";
          layout.modebar = Object.assign({}, layout.modebar || {}, {
            bgcolor: "#ffffff",
            color: "#b8b8b8",
            activecolor: "#5f5f5f",
          });
          plotConfig = Object.assign({
            responsive: true,
            displaylogo: false,
            displayModeBar: true,
            locale: "ru",
          }, clone(plot.config || {}, {}));

          this.renderInFlight = ensurePlotly()
            .then(function (Plotly) {
              if (self.plotUnmounted || !self.$refs.plot) return null;
              self.lastSize = size;
              return Plotly.react(
                self.$refs.plot,
                clone(plot.data || [], []),
                layout,
                plotConfig
              );
            })
            .catch(function (error) {
              self.reportError(error);
            })
            .finally(function () {
              self.finishRender();
            });
        },
      },
    };

    var GraphOutputZone = {
      components: {
        "plotly-output": PlotlyOutput,
      },
      props: {
        pageState: {
          type: Object,
          default: function () {
            return { data: [], isready: true, success: true, error: "" };
          },
        },
        gridClass: {
          type: String,
          default: "",
        },
      },
      computed: {
        plots: function () {
          return Array.isArray(this.pageState.data) ? this.pageState.data : [];
        },
        loading: function () {
          return this.pageState.isready === false;
        },
        calculationError: function () {
          return this.pageState.isready === true && this.pageState.success === false ?
            String(this.pageState.error || "Не удалось отобразить график") :
            "";
        },
      },
      template:
        '<section class="graph-output-zone" data-testid="graph-output-zone">' +
          '<div class="graph-output-canvas">' +
            '<div class="graph-output-grid" :class="gridClass">' +
              '<plotly-output v-for="(plot, index) in plots" :key="index" :data-testid="\'graph-output-plot-\' + index" :plot="plot"></plotly-output>' +
            '</div>' +
            '<div v-if="loading" class="graph-output-overlay" data-testid="graph-output-loading" role="status" aria-label="Загрузка графиков">' +
              '<span class="graph-output-spinner" aria-hidden="true"></span>' +
            '</div>' +
            '<div v-else-if="calculationError" class="graph-output-overlay graph-output-error" data-testid="graph-output-error" role="alert">' +
              '{{ calculationError }}' +
            '</div>' +
          '</div>' +
          '<fieldset class="graph-output-controls" data-testid="graph-output-controls" :disabled="loading">' +
            '<slot name="controls"></slot>' +
          '</fieldset>' +
        '</section>',
    };

    return {
      components: {
        "graph-output-zone": GraphOutputZone,
        "plotly-output": PlotlyOutput,
      },
      ensurePlotly: ensurePlotly,
    };
  }

  window.GenieGraphOutputZone = {
    create: createGraphOutputZone,
  };
})(window, document);
