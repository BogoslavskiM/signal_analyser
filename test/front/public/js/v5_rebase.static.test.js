"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testV5RebaseStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const app = read("public/js/app.js");
  const layouts = read("public/js/layouts.js");
  const settings = read("public/js/settings.js");
  const css = [read("public/css/theme.css"), read("public/css/app.css"), read("public/css/settings.css"), read("public/css/layouts.css")].join("\n");

  // The eight v5 findings are source/contract checks only. Viewport pixels,
  // hit targets and actual Plotly canvas remain E2E-owned.
  assert(/\.signal-analyser\{[^}]*min-width:920px[^}]*min-height:680px[^}]*grid-template-rows:44px minmax\(440px,4fr\) minmax\(180px,1fr\)/.test(css), "v5 shell must retain 920×680 and 44/440/180px 4:1 vertical geometry");
  assert(/\.main-stage\{[^}]*grid-template-columns:minmax\(612px,3fr\) minmax\(300px,1fr\)/.test(css), "v5 main stage must retain 612/300px 3:1 columns without a third rail");
  assert(!/\b(?:filter|backdrop-filter)\s*:\s*[^;}]*blur/i.test(css), "v5 empty/loading/ready/error surfaces must not blur plots");
  assert(/\.pane-output-loading \.spinner\{[^}]*width:28px[^}]*height:28px/.test(css), "only the v5 pending surface may use the exact 28px loader");
  assert(/\.pane-output-empty\{[^}]*background:#fff[^}]*color:transparent/.test(css) && /\.pane-output-empty>\*\{[^}]*display:none/.test(css), "v5 empty panes must remain literally blank white with no visible copy or loader");
  assert(/\.display-tab-shell\.is-active::after\{(?=[^}]*left:0)(?=[^}]*right:0)(?=[^}]*bottom:0)(?=[^}]*height:3px)/.test(css), "selected Display shell must own its continuous full-width 3px underline");
  assert(/\.layout-popover\{[^}]*width:372px[^}]*max-width:372px/.test(css), "layout popover must be the exact fixed 372px v5 surface");
  assert(app.includes("viewBox='0 0 24 24'") && ["x='3' y='3' width='7' height='7' rx='1'", "x='14' y='3' width='7' height='7' rx='1'", "x='3' y='14' width='7' height='7' rx='1'", "x='14' y='14' width='7' height='7' rx='1'"].every((rect) => app.includes(rect)), "layout trigger must retain the exact four-rectangle 24px grid SVG");
  assert(app.includes("layoutLabel(activeDisplayId)") && !app.includes("layoutLabel = \"1 × 1\""), "layout trigger label must derive from authoritative state, never a seeded 1×1 value");

  assert(!html.includes('id="display-settings-panel"') && !html.includes('id="time-settings-panel"') && !html.includes('id="measurements-settings-panel"'), "v5 must remove legacy static settings panels rather than render a duplicate subtree beside the canonical settings catalog");
  assert((html.match(/data-testid="settings-catalog-panel"/g) || []).length === 1 && settings.includes("settings-catalog-panel"), "v5 must keep exactly one canonical settings render root");
  assert(!/aria-controls="(?:display|time|measurements)-settings-panel"/.test(html), "v5 settings tabs must not retain ARIA references to removed legacy panels");
  assert(!app.includes("show-legend-checkbox") && !app.includes("normalize-y-checkbox") && !app.includes("spectrum-frequency-min-input"), "app.js must not bind legacy duplicate settings controls after the v5 catalog takes ownership");

  assert(!layouts.includes("scheduleActiveOutputPoll") && !layouts.includes("activeOutputIdentity") && !layouts.includes("outputsByDisplay[activeDisplayId][0]"), "v5 must remove obsolete active-only polling and index-zero pane assumptions");
  assert(layouts.includes("scheduleVisiblePaneOutputLoads") && layouts.includes("layout.panes.forEach(function(pane)") && layouts.includes("visibleOutputRequestIds[key]"), "every active-display pane must independently schedule, dedupe and retain its own output request");
  assert(layouts.includes("response.state_revision < (latestKnownRevision() || 0)") && layouts.includes("queuePaneRender") && layouts.includes("Plotly.react(") && layouts.includes("requestAnimationFrame(function renderLatestPane"), "all-pane rendering must reject stale revisions and stay lazy/latest-only/serialized through Plotly.react");
  assert(!app.includes("Plotly.react") && !app.includes("loadPlotlyScript"), "app.js must remain outside Plotly ownership");
  assert(settings.includes("statistics-option-") && settings.includes('"minimum","Минимум"') && settings.includes('"maximum","Максимум"') && settings.includes('"mean","Среднее"') && settings.includes("data-settings-measurement-kind") && settings.includes("find-peaks-checkbox") && settings.includes("data-settings-peaks"), "v5 canonical settings tree must dynamically own Measurements and time-only Peaks controls");
  assert(settings.includes("signal-analyser-settings-view-action") && app.includes("signal-analyser-settings-view-action") && app.includes("measurement_kinds") && app.includes("peaksEnabled"), "Measurements/Peaks semantic events must adapt through the normal app view mutation boundary");
};
