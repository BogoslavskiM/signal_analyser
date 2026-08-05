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

  assert(/<link[^>]+href="\.\/css\/layouts\.css"/.test(html), "multi-pane stylesheet must remain registered through a relative asset URL");
  assert(source.includes("data-pane-plot-host") && source.includes("Plotly.react(task.host") && source.includes("queuePaneRender") && source.includes("paneRenderQueue"), "ready panes must render through serialized, latest-only Plotly.react tasks");
  assert(source.includes('dragmode:"zoom"') && source.includes("displayModeBar:false") && source.includes("displaylogo:false") && source.includes("showTips:false"), "pane Plotly configuration must preserve native zoom/pan/double-click behavior while modebar and tips are hidden");
  ["staticPlot", "fixedrange", "Plotly.newPlot", "Plotly.toImage", "backgroundImage"].forEach((term) => assert(!source.includes(term), `pane source must not introduce ${term} fallback or interaction lock`));
  assert(source.includes("panePayloadCache") && source.includes("record = pane.id === layout.active_pane_id ? activeRecord : panePayloadCache[pane.id]"), "inactive panes may render only cached ready payloads while the active pane consumes the current output");
  assert(layoutCss.includes(".pane-plot-host .modebar,.pane-plot-host .modebar-container") && layoutCss.includes(".graph-help-overlay{position:absolute;z-index:var(--layer-graph-help)") && layoutCss.includes(".compact-legend{pointer-events:none"), "modebar, tokenized overlay, and legend source contracts must preserve a live unmoved graph viewport");
  assert(layoutCss.includes(".pane-header .pane-type-select,.pane-header .plot-type-control select{height:28px;width:212px") && layoutCss.includes(".pane-header .more-button{width:32px;height:28px"), "contiguous pane control cluster must retain its exact v2 dimensions");
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
  assert(source.includes('exactKeys(entry, ["display_id", "layout", "outputs"])') && source.includes("record.pane_id !== pane.id") && source.includes("entry.outputs.length !== 1") && source.includes("entry.outputs.length !== 0"), "active-output-only envelopes must preserve exact active pane identity and reject extra pane outputs");
  assert(source.includes('if (!record.output.isready || !record.output.success) return Array.isArray(data) && data.length === 0;'), "failed/not-ready line outputs must accept only typed empty arrays");
  assert(source.includes("data.length === pane.signal_bindings.length") && source.includes("trace.signal === pane.signal_bindings[index]"), "successful line output must retain strict binding/trace parity");
  assert(source.includes('PLOTS = ["time", "spectrum", "spectrogram", "persistence"]'), "all four pane renderer types must remain canonical");

  ["openPopover", "closePopover", "applyDraft", "changeDimension", "postLayout", "selectPane", "updatePane", "handleKeydown"].forEach((term) =>
    assert(source.includes(`function ${term}`), `multi-layout transient lifecycle must retain ${term}`)
  );
  assert(source.includes('operation:"resize"') && source.includes('operation:"select_pane"') && source.includes('operation:"update_pane"'), "frontend must emit only the three accepted layout operations");
  assert(source.includes("error.status === 409") && source.includes("acceptEnvelope(error.payload.current, true)") && source.includes("Устаревший черновик отброшен"), "409 must consume current and discard stale draft with Russian feedback");
  assert(source.includes("ui.error = message(error") && source.includes("ui.open = true"), "422/network resize failures must retain the draft dialog with recoverable error feedback");
  assert(source.includes("refreshQueued") && source.includes("render();\n    refresh();") && source.includes("envelope.state_revision < appRevision"), "bootstrap must start layouts at mount and queue one monotonic refresh when a delayed response is stale");
  assert(source.includes("window.Promise.resolve().then(function() { return api.layouts(); })"), "layout startup must normalize synchronous adapter failures into its cleanup path");
  assert(source.includes('event.key === "Escape"') && source.includes("ui.returnFocus") && source.includes("button:not([disabled])"), "Cancel/Escape/focus containment and restoration must remain explicit");
  assert(source.includes("target.checked = bindings.indexOf(name) >= 0") && source.includes("bindings.push(name)") && source.includes("bindings.filter"), "active-pane checkbox changes must avoid optimistic state and preserve ordered bindings");

  assert(compactCss.includes(".pane-grid { --layout-rows: 1; --layout-columns: 1;") && compactCss.includes("grid-template-columns: repeat(var(--layout-columns), minmax(0, 1fr));") && compactCss.includes("grid-template-rows: repeat(var(--layout-rows), minmax(0, 1fr));"), "pane grid must use bounded minmax tracks for every 1x1..4x4 variant");
  assert(compactCss.includes(".main-stage { grid-template-columns: minmax(0, 1fr) 370px;") && compactCss.includes("@media (max-width: 1280px) { .main-stage { grid-template-columns: minmax(0, 1fr) 340px;") && compactCss.includes("@media (max-width: 1080px) { .main-stage { grid-template-columns: minmax(0, 1fr) 300px;"), "design-v2 must retain 370/340/300 Settings widths at 1440/1280/1024");
  assert(/\.display-workspace\{[^}]*grid-template-rows:48px minmax\(0,1fr\)/.test(appCss) && /@media \(max-width:1080px\)\{[\s\S]*?\.display-workspace\{grid-template-rows:42px minmax\(0,1fr\)/.test(appCss), "design-v2 Display row must be 48px at 1280/1440 and 42px at 1024");
  assert(compactCss.includes("html, body { min-width: 1024px; min-height: 720px; overflow: hidden;") && compactCss.includes(".main-stage { grid-template-columns: minmax(0, 1fr) 370px; overflow: hidden;"), "required viewports must prevent document-level overflow and delegate overflow to components");
  assert(compactCss.includes(".display-tab-scroll") && compactCss.includes("overflow-x: auto;") && compactCss.includes(".display-zone-actions") && compactCss.includes("flex: 0 0 auto;"), "Display tabs must own horizontal scroll while layout/add actions stay fixed");
  assert(compactCss.includes(".pane-grid.is-compact { gap: 6px;") && compactCss.includes("grid-template-rows: 28px minmax(0, 1fr);") && compactCss.includes("font-size: 9px;"), "4x4 must retain compact header/select geometry");
  assert(compactCss.includes(".plot-pane.is-active { border: 2px solid var(--accent);") && compactCss.includes(".plot-pane:focus-visible { outline: 2px solid var(--accent);"), "active and keyboard-focused panes must remain visually distinct");
  ["pane-output-loading", "pane-output-empty", "pane-output-error", "layout-warning", "layout-toast"].forEach((state) =>
    assert(layoutCss.includes(`.${state}`), `pane/layout state styling must retain ${state}`)
  );
  assert(compactCss.includes(".layout-popover { position: fixed; z-index: var(--layer-layout-popover); width: 372px;") && compactCss.includes("@media (max-width: 1080px)") && compactCss.includes(".layout-popover { width: 354px;"), "layout popover must retain v2 desktop/1024 width and tokenized overlay layer");
  assert(source.includes("data-pane-plot-host") && source.includes("Plotly.react(task.host") && source.includes("pane.id === layout.active_pane_id ? activeRecord : panePayloadCache[pane.id]") && source.includes("activeHost = node(\"active-plot-host\")"), "simultaneous ready panes must use independent real Plotly hosts while the active host remains app-owned");
};
