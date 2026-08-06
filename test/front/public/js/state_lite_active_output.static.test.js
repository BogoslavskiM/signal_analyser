"use strict";

const fs = require("fs");
const path = require("path");

function definitions(source, name) {
  return (source.match(new RegExp(`\\bfunction\\s+${name}\\s*\\(`, "g")) || []).length;
}

module.exports = async function testStateLiteActiveOutputStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const layouts = fs.readFileSync(path.join(root, "public/js/layouts.js"), "utf8");

  const lifecycleFunctions = ["normalizeEnvelope", "acceptEnvelope", "queuePaneRender", "renderPanePlots", "refresh", "postLayout", "onAppRendered"];
  const ambiguous = lifecycleFunctions.filter((name) => definitions(layouts, name) !== 1).map((name) => `${name}=${definitions(layouts, name)}`);
  assert(ambiguous.length === 0, `TASK-0060 lifecycle must have one unambiguous definition per function; found ${ambiguous.join(", ")}`);

  assert(api.includes('request("./api/state-lite"') && api.includes("activeOutput: function"), "startup must use state-lite metadata and expose the active-output adapter");
  assert(!api.includes('request("./api/state"'), "the obsolete eager state route must not remain callable");
  assert(layouts.includes("./api/outputs/active?display_id=") && layouts.includes("activeOutputIdentity") && layouts.includes("stopActiveOutputPoll"), "only the current display/pane context may request and retain active output");
  assert(layouts.includes("inactive_output") && layouts.includes("acceptEnvelope(current, true)") && layouts.includes("responseRevision < (latestKnownRevision() || 0)"), "409 reconciliation and stale state-revision rejection must be explicit");
  assert(layouts.includes("!response.isready") && layouts.includes("pane-output-loading") && layouts.includes("pane-output-error") && layouts.includes("pane-output-state='ready'"), "pending, error, and ready output states must remain distinct and lightweight");
  assert(layouts.includes("window.clearTimeout(activeOutputPollTimer)") && layouts.includes("activeOutputRequestId += 1"), "pane/display/plot lifecycle changes must cancel obsolete polling before it can render");
  assert(layouts.includes("ensureLocalPlotly") && layouts.includes("document.createElement(\"script\")") && layouts.includes("./js/vendor/plotly-cartesian-3.1.0.min.js"), "Plotly must load lazily from the package-local artifact");
  assert(!html.includes("plotly-cartesian-3.1.0.min.js"), "index.html must not eagerly load Plotly");
  assert(!app.includes("Plotly.react") && !app.includes("loadPlotlyScript"), "app.js must not retain a competing eager Plotly lifecycle");
  ["staticPlot", "fixedrange", "Plotly.newPlot", "Plotly.toImage", "backgroundImage"].forEach((term) => assert(!layouts.includes(term), `live Plotly must not use ${term}`));
  assert(layouts.includes('dragmode:"zoom"') && layouts.includes("displayModeBar:false") && layouts.includes("Plotly.react("), "ready output must use live zoom/pan/autoscale-capable Plotly.react with a hidden modebar");
  assert(layouts.includes("requestAnimationFrame(function renderLatestPane") && layouts.includes("current.inFlight") && layouts.includes("paneRenderQueue[key] !== current"), "latest-only rendering must be serialized through a single rAF lifecycle");
};
