"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSignalAnalyserDisplayStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");

  ["app-shell", "display-tabs", "display-canvas", "active-plot-host", "plot-type-select", "settings-view-select", "signal-table", "toggle-all-signals", "bottom-panel-signals", "measurements-panel", "display-count-status", "active-display-status"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `missing stable Display UI selector ${id}`)
  );
  assert((html.match(/data-testid="active-plot-host"/g) || []).length === 1, "each active Display must own one graph host");
  assert(!html.includes("plot-grid") && !html.includes("layout-chooser"), "MVP must not render a multi-layout plot grid");
  assert(html.includes("data-signal-rows") && app.includes("data-signal-visibility"), "signal list must contain per-signal checkbox controls at runtime");
  assert(/<script\b[^>]*src=["']\.\/js\/api\.js["']/.test(html) && /<script\b[^>]*src=["']\.\/js\/app\.js["']/.test(html), "Genie-relative API and app scripts must be registered");
  assert(!/\b(?:href|src)\s*=\s*["']\/(?:css|js)\//i.test(html), "frontend assets must remain Genie-relative, not root-absolute");
  assert(html.includes('./js/vendor/plotly-cartesian-3.1.0.min.js'), "Plotly must be loaded from the pinned local vendor asset before the app");
  assert(html.indexOf('./js/vendor/plotly-cartesian-3.1.0.min.js') < html.indexOf('./js/app.js'), "local Plotly must load before app.js");

  assert(api.includes('request("./api/state")'), "state API must use ./api/state");
  assert(api.includes('request("./api/view", {'), "view API must use ./api/view");
  assert(api.includes('request("./api/displays", {'), "Display lifecycle API must use ./api/displays");
  assert((api.match(/method: "POST"/g) || []).length >= 2, "view and displays mutations must POST JSON");

  ["active_display_id", "displays", "visible_signals", "selected_signal", "displayMutation", "addDisplay", "selectDisplay", "closeDisplay", "pendingAction"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Display state contract term ${term}`)
  );
  assert(app.includes('displayMutation("create"') && app.includes('displayMutation("select"') && app.includes('displayMutation("close"'), "frontend must emit create/select/close Display operations");
  assert(app.includes("data-testid='close-display-"), "close controls must have stable per-display test IDs");
  assert(app.includes("data-signal-visibility") && app.includes("visible_signals"), "checkbox actions must update active Display membership");
  assert(app.includes("payload.current") && app.includes("status===409"), "stale API responses must canonicalize from the authoritative snapshot");
  assert(app.includes("moduleName") && app.includes("window.Plotly"), "the local Plotly UMD moduleName export must normalize before rendering");
  assert(!/grid-template-(?:columns|rows)\s*:\s*repeat\(2/i.test(css), "MVP styling must not retain a fixed four-plot grid");
};
