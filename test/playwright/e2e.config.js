"use strict";

module.exports = {
  app: {
    // Frontend → E2E handoff. Keep the selector contract in this one place.
    readyTestId: "app-shell",
    loaderTestId: "app-loading",
    errorTestId: "app-error",
    pageUrlMatch: "/user/apps/signal_analyser",
    testIds: {
      shell: "app-shell",
      plotGrid: "plot-grid",
      plotCards: {
        time: "plot-card-time",
        spectrum: "plot-card-spectrum",
        spectrogram: "plot-card-spectrogram",
        persistence: "plot-card-persistence",
      },
      plotTitles: {
        time: "Время",
        spectrum: "Спектр",
        spectrogram: "Спектрограмма",
        persistence: "Спектр персистентности",
      },
      activePlotPanel: "active-plot-panel",
      activePlotTitle: "active-plot-title",
      signalTable: "signal-table",
      signalRowPrefix: "signal-row-",
      activePlotFieldPrefix: "active-plot-field-",
    },
    api: {
      state: "/api/state",
      view: "/api/view",
    },
    // Signal rows are buttons; selection is their native pressed state.
    selectedState: ["aria-pressed"],
    // The active plot card exposes pressed state and the application styling class.
    activeClass: "is-active",
    activeState: ["aria-pressed"],
  },
  features: {
    "layout-geometry": true,
    "style-system": false,
    "frontend-state-management": true,
    "settings-controls": false,
    "inspector-ui": true,
    "multi-page-element": false,
    "graph-output-zone": true,
    "output-loading-flow": true,
    "dialog-system": false,
    "file-browser-dialog": false,
    "session-import-export-ui": false,
    "object-export-dialog": false,
    "reference-scenarios": true,
  },
};
