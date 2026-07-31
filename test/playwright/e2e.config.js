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
      displayTabs: "display-tabs",
      addDisplay: "add-display",
      displayCanvas: "display-canvas",
      displayPlotTitle: "display-plot-title",
      activePlotHost: "active-plot-host",
      plotErrorState: "plot-error-state",
      findPeaksAction: "find-peaks-action",
      plotTypeSelect: "plot-type-select",
      settingsViewSelect: "settings-view-select",
      toggleAllSignals: "toggle-all-signals",
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
      signalVisibilityCheckboxPrefix: "signal-visibility-checkbox-",
      signalVisibilityStatePrefix: "signal-visibility-state-",
      activePlotFieldPrefix: "active-plot-field-",
      // Kept only so disabled legacy four-card specs still load for syntax.
      // Current DEC-009 runtime uses activePlotHost exclusively.
      plotHostPrefix: "plot-host-",
      measurements: {
        signalsTab: "signal-panel-tab-signals",
        measurementsTab: "signal-panel-tab-measurements",
        panel: "measurements-panel",
        signalName: "measurements-signal-name",
        table: "measurements-table",
        rows: {
          minimum: "measurement-row-minimum",
          maximum: "measurement-row-maximum",
          mean: "measurement-row-mean",
        },
      },
      peaks: {
        tab: "peaks-panel-tab",
        panel: "peaks-panel",
        signalName: "peaks-signal-name",
        table: "peaks-table",
        loading: "peaks-loading-state",
        error: "peaks-error-state",
        empty: "peaks-empty-state",
        rowPrefix: "peak-row-",
      },
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
    // Cascade 3 P0: authoritative state snapshots expose selected-visible raw
    // statistics; the bottom-tab switch itself remains entirely local.
    "measurements-statistics": true,
    "peaks": true,
    "inspector-ui": true,
    "multi-page-element": true,
    "graph-output-zone": true,
    "output-loading-flow": true,
    "dialog-system": false,
    "file-browser-dialog": false,
    "session-import-export-ui": false,
    "object-export-dialog": false,
    "reference-scenarios": true,
    // The legacy four-card specs remain loadable but must not run against the
    // single-graph-per-Display workflow.
    "legacy-fixed-workspace": false,
    "signal-analyser-displays": true,
  },
};
