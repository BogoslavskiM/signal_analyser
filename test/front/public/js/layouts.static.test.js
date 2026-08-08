"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testMultiLayoutStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const source = fs.readFileSync(path.join(root, "public/js/layouts.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const appCss = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const layoutCss = fs.readFileSync(path.join(root, "public/css/layouts.css"), "utf8");
  const compactCss = layoutCss.replace(/\s+/g, " ");
  const canonicalCss = layoutCss.replace(/\s+/g, "");

  assert(/<link[^>]+href="\.\/css\/layouts\.css"/.test(html), "multi-pane stylesheet must remain registered through a relative asset URL");
  assert(source.includes("data-pane-plot-host") && source.includes("Plotly.react(task.host") && source.includes("queuePaneRender") && source.includes("paneRenderQueue"), "ready panes must render through serialized, latest-only Plotly.react tasks");
  assert(source.includes('dragmode:"zoom"') && source.includes("displayModeBar:false") && source.includes("displaylogo:false") && source.includes("showTips:false"), "pane Plotly configuration must preserve native zoom/pan/double-click behavior while modebar and tips are hidden");
  assert((source.match(/removeGeneratedModebar\([^)]*host[^)]*\)/g) || []).length >= 2 && (source.match(/removeGeneratedModebar\(/g) || []).length >= 3, "both legacy and active Plotly.react completion paths must remove generated modebar DOM after rendering");
  ["staticPlot", "fixedrange", "Plotly.newPlot", "Plotly.toImage", "backgroundImage"].forEach((term) => assert(!source.includes(term), `pane source must not introduce ${term} fallback or interaction lock`));
  assert(source.includes("scheduleVisiblePaneOutputLoads") && source.includes("outputsByDisplay[activeDisplayId]") && source.includes("layout.panes.forEach(function(pane)"), "every visible pane must independently consume its own current output");
  assert(!/\.modebar(?:,|\{|\s)/.test(layoutCss) && layoutCss.includes(".graph-help-overlay{position:absolute;z-index:var(--layer-graph-help)") && !/\b(?:compact-legend|plot-legend)\b/.test(`${source}\n${layoutCss}`) && source.includes("showlegend:legendVisibilityByDisplay[activeDisplayId] !== false") && source.includes('legend:{ orientation:"v", x:.99, y:.99, xanchor:"right", yanchor:"top", font:{ family:"Roboto, Arial, sans-serif", size:12 }, bgcolor:"rgba(255,255,255,.86)", borderwidth:0 }'), "graph help must preserve a live viewport while the native vertical Plotly legend remains enabled and modebar is disabled at source");
  assert(/\.pane-header \.pane-type-select,\.pane-header \.plot-type-control select\{(?=[^}]*width:212px)(?=[^}]*height:28px)/.test(layoutCss) && /\.pane-header \.more-button\{(?=[^}]*width:32px)(?=[^}]*height:28px)/.test(layoutCss), "contiguous pane control cluster must retain its exact v2 dimensions");
  assert(/<link[^>]+href="\.\/css\/layouts\.css"/.test(html), "TASK-0031 must register layouts.css through a relative asset URL");
  const scriptOrder = ["./js/api.js", "./js/settings.js", "./js/layouts.js", "./js/app.js"].map((asset) => html.indexOf(asset));
  assert(scriptOrder.every((position) => position >= 0) && scriptOrder.every((position, index) => index === 0 || scriptOrder[index - 1] < position), "layouts.js must load after API/settings and before app.js");
  assert(api.includes('request("./api/layouts", payload ? {') && api.includes('method: "POST"') && api.includes('cache: "no-store"'), "layout API adapter must share one relative GET/POST endpoint with no-store GET");

  [
    "pane-grid", "active-pane-runtime", "layout-trigger",
    "layout-popover", "layout-row-options", "layout-column-options", "layout-preview",
    "layout-warning", "layout-error", "layout-conflict", "layout-apply", "layout-cancel",
    "layout-toast", "pane-settings-context", "toggle-all-signals",
  ].forEach((id) => assert(
    html.includes(`data-testid="${id}"`) || app.includes(`data-testid='${id}'`),
    `multi-layout UI must expose stable selector ${id}`,
  ));
  assert(/data-testid="layout-popover"[^>]*role="dialog"[^>]*aria-modal="false"/.test(html), "layout selector must remain an anchored non-modal dialog");
  assert(/data-testid='layout-trigger'[^>]*aria-haspopup='dialog'[^>]*aria-controls='layout-popover'/.test(app), "layout trigger must expose its controlled-dialog semantics");

  ["normalizeEnvelope", "validLayout", "validPaneOutput", "validOutputData", "exactKeys", "sameStrings"].forEach((term) =>
    assert(source.includes(term), `strict layout envelope validation must retain ${term}`)
  );
  assert(
    source.includes("entry.outputs.length !== entry.layout.panes.length") &&
      source.includes("entry.outputs.map(function(status, index) { return liteOutputRecord(status, entry.layout.panes[index]); }).filter(Boolean)") &&
      source.includes("outputs[entry.display_id].length === entry.layout.panes.length") &&
      source.includes("entry.outputs.length !== 0"),
    "v5 state-lite envelopes must require one ordered lightweight status per active-display pane and no inactive-display statuses",
  );
  assert(
    source.includes("status.display_id !== activeDisplayId") &&
      source.includes("status.pane_id !== pane.id") &&
      source.includes("status.plot_type !== pane.plot_type") &&
      source.includes("!integer(status.calculation_revision)") &&
      source.includes('typeof status.context_key !== "string"') &&
      source.includes('typeof status.isready !== "boolean"') &&
      source.includes('typeof status.success !== "boolean"') &&
      source.includes('typeof status.error !== "string"'),
    "each lightweight pane status must preserve strict display/pane/plot/revision/context and typed terminal-state identity",
  );
  assert(source.includes('if (!record.output.isready || !record.output.success) return Array.isArray(data) && data.length === 0;'), "failed/not-ready line outputs must accept only typed empty arrays");
  assert(source.includes("data.length === pane.signal_bindings.length") && source.includes("trace.signal === pane.signal_bindings[index]"), "successful line output must retain strict binding/trace parity");
  assert(source.includes('PLOTS = ["time", "spectrum", "spectrogram", "persistence"]'), "all four pane renderer types must remain canonical");

  ["openPopover", "closePopover", "applyDraft", "changeDimension", "postLayout", "selectPane", "updatePane", "handleKeydown"].forEach((term) =>
    assert(source.includes(`function ${term}`), `multi-layout transient lifecycle must retain ${term}`)
  );
  assert(source.includes('operation:"resize"') && source.includes('operation:"select_pane"') && source.includes('operation:"update_pane"'), "frontend must emit only the three accepted layout operations");
  assert(source.includes("error.status === 409") && source.includes("acceptEnvelope(error.payload.current, true)") && source.includes("Область изменилась на сервере. Восстановлено текущее состояние."), "409 must consume current and discard stale pane mutations with Russian feedback");
  assert(source.includes("ui.error = message(error") && source.includes("ui.open = true"), "422/network resize failures must retain the draft dialog with recoverable error feedback");
  assert(source.includes("if (detail.snapshot) acceptEnvelope(detail.snapshot, false)") && source.includes("if (!integer(appRevision) || !api || typeof api.getState !== \"function\" || refreshPending) return"), "app-published state-lite must own cold startup while metadata refresh remains revision-gated");
  assert(source.includes("window.Promise.resolve().then(function() { return api.getState(); })"), "revision-gated layout refresh must normalize synchronous state-lite adapter failures into its cleanup path");
  assert(source.includes('event.key === "Escape"') && source.includes("ui.returnFocus") && source.includes("button:not([disabled])"), "Cancel/Escape/focus containment and restoration must remain explicit");
  assert(source.includes("target.checked = bindings.indexOf(name) >= 0") && source.includes("bindings.push(name)") && source.includes("bindings.filter"), "active-pane checkbox changes must avoid optimistic state and preserve ordered bindings");

  assert(source.includes('grid.style.setProperty("--layout-rows", layout.rows)') && source.includes('grid.style.setProperty("--layout-columns", layout.columns)') && canonicalCss.includes(".pane-grid{display:grid") && canonicalCss.includes("grid-template-columns:repeat(var(--layout-columns),minmax(0,1fr))") && canonicalCss.includes("grid-template-rows:repeat(var(--layout-rows),minmax(0,1fr))"), "pane grid must use server rows/columns and bounded minmax tracks for every supported variant");
  assert(canonicalCss.includes(".main-stage{") && canonicalCss.includes("grid-template-columns:minmax(612px,3fr)minmax(300px,1fr)"), "v5 must preserve the proportional 3:1 workspace/settings tracks with only readable minima");
  assert(canonicalCss.includes(".display-workspace{display:grid;grid-template-rows:42px32pxminmax(0,1fr)"), "v5 Display workspace must retain its 42px title, 32px tabs, and flexible canvas rows");
  assert(!/(?:html\s*,\s*body|html,body|\.signal-analyser)\s*\{[^}]*\bmax-(?:width|height)\s*:/i.test(layoutCss) && canonicalCss.includes(".signal-analyser{width:100%;height:100%;min-width:920px;min-height:680px") && canonicalCss.includes("html,body{width:100%;height:100%;min-width:0;min-height:0") && canonicalCss.includes("overflow:auto"), "v5 page/app shells must fill the viewport, use only readable minima, and fall back to document scrolling");
  assert(canonicalCss.includes(".display-tab-scroll{display:flex;flex:1 1 auto") && canonicalCss.includes("overflow:auto") && canonicalCss.includes(".display-zone-actions{display:flex;flex:0 0 auto"), "Display tabs must own horizontal scroll while layout/add actions stay fixed");
  assert(canonicalCss.includes(".pane-grid.is-compact{") && canonicalCss.includes("grid-template-rows:28px minmax(0,1fr)") && canonicalCss.includes("font-size:9px"), "high-density layouts must retain compact header/select geometry");
  assert(canonicalCss.includes(".plot-pane.is-active{") && canonicalCss.includes("border-color:#1b84b8") && canonicalCss.includes(".plot-pane:focus-visible{outline:2px solid #1b84b8"), "active and keyboard-focused panes must remain visually distinct");
  ["pane-output-loading", "pane-output-empty", "pane-output-error", "layout-warning", "layout-toast"].forEach((state) =>
    assert(layoutCss.includes(`.${state}`), `pane/layout state styling must retain ${state}`)
  );
  assert(canonicalCss.includes(".layout-popover{position:fixed;z-index:var(--layer-layout-popover);box-sizing:border-box;width:372px;max-width:372px"), "v5 layout popover must remain a fixed 372px tokenized overlay at every supported viewport width");
  assert(source.includes("data-pane-plot-host") && source.includes("Plotly.react(current.host") && source.includes("outputs.filter(function(item) { return item && item.pane_id === pane.id; })[0]") && source.includes("pane.id === layout.active_pane_id ? activeHost") && source.includes("activeHost = node(\"active-plot-host\")"), "simultaneous ready panes must resolve records by pane identity and use independent real Plotly hosts while the active host remains app-owned");
};
