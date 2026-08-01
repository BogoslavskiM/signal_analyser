"use strict";

module.exports = {
  target: {
    // Copy the project [engee_target].base_url origin here only when the shell
    // cannot read architecture/agents/manifest.toml. An empty list is a hard
    // configuration error unless PLAYWRIGHT_ALLOWED_ORIGINS is provided.
    allowedOrigins: [],
  },
  app: {
    readyTestId: "app-ready",
    loaderTestId: "app-loader",
    pageUrlMatch: "/genie/",
  },
  features: {
    // Universal frontend-skill capabilities. Add project-specific product
    // capability ids only in the target application's copied config.
    "layout-geometry": false,
    "style-system": false,
    "frontend-state-management": false,
    "settings-controls": false,
    "inspector-ui": false,
    "multi-page-element": false,
    "graph-output-zone": false,
    "output-loading-flow": false,
    "dialog-system": false,
    "file-browser-dialog": false,
    "session-import-export-ui": false,
    "object-export-dialog": false,
    "reference-scenarios": false,
  },
};
