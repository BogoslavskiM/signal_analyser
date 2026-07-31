"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSignalAnalyserDisplayStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const plotlyPath = path.join(root, "public/js/vendor/plotly-cartesian-3.1.0.min.js");
  const plotlyLicensePath = path.join(root, "public/js/vendor/plotly-cartesian-3.1.0.LICENSE");
  const plotly = fs.readFileSync(plotlyPath);
  const license = fs.readFileSync(plotlyLicensePath, "utf8");
  const crypto = require("crypto");

  ["app-shell", "display-tabs", "display-canvas", "active-plot-host", "plot-type-select", "settings-view-select", "signal-table", "toggle-all-signals", "bottom-panel-signals", "measurements-panel", "display-count-status", "active-display-status"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `missing stable Display UI selector ${id}`)
  );
  assert((html.match(/data-testid="active-plot-host"/g) || []).length === 1, "each active Display must own one graph host");
  assert(/data-testid="active-plot-host"[^>]*role="region"[^>]*aria-labelledby="display-plot-title"/.test(html), "the active graph host must expose its labelled region semantics");
  assert(/data-bottom-tab="signals"[^>]*role="tab"[^>]*aria-controls="bottom-panel-signals"[^>]*aria-selected="true"[^>]*tabindex="0"/.test(html), "Signals must initialize as the sole roving-tabindex tab");
  assert(/data-bottom-tab="measurements"[^>]*role="tab"[^>]*aria-controls="measurements-panel"[^>]*aria-selected="false"[^>]*tabindex="-1"/.test(html), "Measurements must initialize outside the tab sequence");
  assert(/id="bottom-panel-signals"[^>]*role="tabpanel"[^>]*aria-labelledby="signal-panel-tab-signals"/.test(html), "Signals panel must be labelled by its tab");
  assert(/id="measurements-panel"[^>]*role="tabpanel"[^>]*aria-labelledby="signal-panel-tab-measurements"/.test(html), "Measurements panel must be labelled by its tab");
  assert(!html.includes("plot-grid") && !html.includes("layout-chooser"), "MVP must not render a multi-layout plot grid");
  assert(html.includes("data-signal-rows") && app.includes("data-signal-visibility"), "signal list must contain per-signal checkbox controls at runtime");
  assert(/<script\b[^>]*src=["']\.\/js\/api\.js["']/.test(html) && /<script\b[^>]*src=["']\.\/js\/app\.js["']/.test(html), "Genie-relative API and app scripts must be registered");
  assert(!/\b(?:href|src)\s*=\s*["']\/(?:css|js)\//i.test(html), "frontend assets must remain Genie-relative, not root-absolute");
  assert(html.includes('./js/vendor/plotly-cartesian-3.1.0.min.js'), "Plotly must be loaded from the pinned local vendor asset before the app");
  assert(html.indexOf('./js/vendor/plotly-cartesian-3.1.0.min.js') < html.indexOf('./js/app.js'), "local Plotly must load before app.js");
  assert(crypto.createHash("sha256").update(plotly).digest("hex") === "c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38", "the bundled Plotly artifact must retain its reviewed SHA-256");
  assert(license.includes("MIT License") && license.includes("Plotly Technologies Inc."), "the bundled Plotly artifact must retain its matching MIT license notice");

  assert(api.includes('request("./api/state")'), "state API must use ./api/state");
  assert(api.includes('request("./api/view", {'), "view API must use ./api/view");
  assert(api.includes('request("./api/displays", {'), "Display lifecycle API must use ./api/displays");
  assert((api.match(/method: "POST"/g) || []).length >= 2, "view and displays mutations must POST JSON");

  ["active_display_id", "displays", "visible_signals", "row_selected_signal", "analysis_signal", "selected_signal", "displayMutation", "addDisplay", "selectDisplay", "closeDisplay", "pendingAction"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Display state contract term ${term}`)
  );
  assert(app.includes('displayMutation("create"') && app.includes('displayMutation("select"') && app.includes('displayMutation("close"'), "frontend must emit create/select/close Display operations");
  assert(app.includes("data-testid='close-display-"), "close controls must have stable per-display test IDs");
  assert(app.includes("data-signal-visibility") && app.includes("visible_signals"), "checkbox actions must update active Display membership");
  assert(/data-testid="display-overflow-trigger"[^>]*aria-haspopup="menu"[^>]*aria-controls="display-overflow-menu"/.test(html), "Display overflow must expose the accessible Clear Display menu trigger");
  assert(/data-testid="display-overflow-menu"[^>]*role="menu"[^>]*hidden/.test(html), "Display overflow menu must start hidden");
  assert(/data-testid="clear-display-action"[^>]*role="menuitem"/.test(html), "Clear Display must be a semantic menu action");
  ["row_selected_signal", "analysis_signal", "clear-display-action", "display-overflow-trigger"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 5 state/control term ${term}`)
  );
  assert(app.includes("payload.current") && app.includes("status===409"), "stale API responses must canonicalize from the authoritative snapshot");
  assert(app.includes("moduleName") && app.includes("window.Plotly"), "the local Plotly UMD moduleName export must normalize before rendering");
  assert(app.includes("loadPlotlyScript(localPlotlyUrl())"), "Plotly recovery must address only the pinned local artifact");
  assert(!/https?:\/\/|cdn\./i.test(app), "Plotly runtime must not load a CDN asset");
  assert(app.includes("activeBottomTab") && !app.includes("api.bottom"), "bottom Signals/Measurements tabs must remain frontend-local state");
  ["ArrowLeft", "ArrowRight", "Home", "End"].forEach((key) => assert(app.includes(`"${key}"`), `bottom tab keyboard navigation must support ${key}`));
  assert(app.includes("function activateBottomTab(tabId, focus)") && app.includes('tab.setAttribute("tabindex", selected ? "0" : "-1")') && app.includes("target.focus()"), "bottom tabs must apply roving tabindex through the shared activator and move focus to the selected tab");
  assert(/data-testid="find-peaks-action"[^>]*aria-pressed="false"[^>]*aria-controls="peaks-panel"/.test(html), "Find Peaks must expose a controlled capability toggle");
  assert(/data-testid="signal-statistics-action"[^>]*aria-controls="measurements-panel"[^>]*aria-label="Открыть измерения активного Display"/.test(html), "Signal statistics must expose its local Measurements destination accessibly");
  assert(/data-testid="peaks-panel-tab"[^>]*data-bottom-tab="peaks"[^>]*role="tab"[^>]*aria-controls="peaks-panel"[^>]*hidden/.test(html), "the local Peaks tab must start hidden and retain tab semantics");
  assert(/id="peaks-panel"[^>]*role="tabpanel"[^>]*aria-labelledby="peaks-panel-tab"[^>]*hidden/.test(html), "the Peaks table panel must be labelled by its local tab");
  ["peaks_enabled", "peaksBusyDisplayId", "peaksFor", "peakMarkerTrace", "find-peaks-action"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve the authoritative Peaks contract term ${term}`)
  );
  assert(!api.includes("./api/peaks") && !/findpeaks\s*\(/i.test(app), "frontend must not create a Peaks endpoint or calculate peaks in JavaScript");
  assert(app.includes("signal-statistics-action") && app.includes('activateBottomTab("measurements", true)'), "Signal statistics must activate and focus the local Measurements tab");
  assert(app.includes("p.items.map") && app.includes("item.time_s") && app.includes("item.value"), "peak markers must consume backend-provided peak items only");
  ["traceScale", "normalizedValues", "display.normalizeY", "display.showMarkers", "show-markers-checkbox", "normalize-y-checkbox"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 6 Time presentation term ${term}`)
  );
  assert(app.includes("plot === \"time\" && display.normalizeY") && app.includes("plot === \"time\" && display.showMarkers"), "normalization and ordinary markers must be constrained to Time traces");
  assert(app.includes("peakMarkerTrace(display, sourceScale)") && app.includes("normalizedValues(p.items.map"), "Peaks markers must align to the analysis-source normalization scale");
  assert(app.includes("analysis-source-affine-unclipped") && app.includes("plot-invalid-data-state") && app.includes("clearPlotHost()"), "Time presentation must retain unclipped Peak provenance and the stable invalid-data host state");
  assert(app.includes('plot === "time" && d.normalizeY ? true : undefined'), "Normalize-specific y-axis layout must be constrained to Time");
  assert(app.includes("Object.keys(change).every") && app.includes("showLegend") && app.includes("normalizeY") && app.includes("showMarkers"), "presentation toggles must remain local rather than create a view mutation");
  assert(!/https?:\/\/|cdn\./i.test(app), "Peaks integration must not add a CDN dependency");
  assert(!/grid-template-(?:columns|rows)\s*:\s*repeat\(2/i.test(css), "MVP styling must not retain a fixed four-plot grid");
};
