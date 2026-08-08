"use strict";

const fs = require("fs");
const path = require("path");

// This is deliberately a source/DOM-contract test.  Pixel overlap and actual
// pointer hit-testing are owned by E2E; the checks below make the required
// layering and lifecycle implementation reviewable without starting an app.
module.exports = async function testOverlayStackingStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const theme = fs.readFileSync(path.join(root, "public/css/theme.css"), "utf8");
  const appCss = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const layoutsCss = fs.readFileSync(path.join(root, "public/css/layouts.css"), "utf8");
  const layouts = fs.readFileSync(path.join(root, "public/js/layouts.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const failures = [];
  const expect = (condition, requirement) => { if (!condition) failures.push(requirement); };
  const token = (name, value) => new RegExp(`--${name}:\\s*${value}\\s*;`).test(theme);

  // The complete pinned matrix is intentionally asserted as values, rather
  // than merely checking that a few named CSS variables exist.
  [
    ["layer-sticky", 100], ["layer-layout-popover", 1000], ["layer-passive-toast", 1050],
    ["layer-menu", 1100], ["layer-graph-help", 1200], ["layer-tooltip", 90000],
    ["layer-main-modal-backdrop", 94990], ["layer-main-modal", 95000],
    ["layer-main-modal-tooltip", 95100], ["layer-screen-delete-backdrop", 95990],
    ["layer-screen-delete", 96000], ["layer-nested-confirmation-backdrop", 96990],
    ["layer-nested-confirmation", 97000], ["layer-critical", 98000],
  ].forEach(([name, value]) => expect(token(name, value), `missing pinned ${name}=${value} token`));
  expect(/--layer-sticky:\s*100[\s\S]*--layer-layout-popover:\s*1000[\s\S]*--layer-passive-toast:\s*1050[\s\S]*--layer-menu:\s*1100[\s\S]*--layer-graph-help:\s*1200[\s\S]*--layer-tooltip:\s*90000[\s\S]*--layer-main-modal-backdrop:\s*94990[\s\S]*--layer-main-modal:\s*95000[\s\S]*--layer-main-modal-tooltip:\s*95100[\s\S]*--layer-screen-delete-backdrop:\s*95990[\s\S]*--layer-screen-delete:\s*96000[\s\S]*--layer-nested-confirmation-backdrop:\s*96990[\s\S]*--layer-nested-confirmation:\s*97000[\s\S]*--layer-critical:\s*98000/.test(theme), "layer tokens are not declared in strictly ascending pinned order");

  expect(/\.display-overflow-menu\{[^}]*z-index:var\(--layer-menu\)/.test(appCss), "pane menu must use the named menu layer");
  expect(/\.signal-columns-menu\{[^}]*z-index:var\(--layer-menu\)/.test(layoutsCss), "inspector menu must use the named menu layer");
  expect(/\.graph-help-overlay\{[^}]*position:absolute[^}]*z-index:var\(--layer-graph-help\)/.test(layoutsCss), "graph help must be its own graph-help overlay layer");
  expect(!/\b(?:compact-legend|plot-legend)\b/.test(`${layoutsCss}\n${layouts}`), "custom compact/plot legend overlays must stay absent from the graph stack");
  expect(layouts.includes("showlegend:legendVisibilityByDisplay[activeDisplayId] !== false") && layouts.includes('legend:{ orientation:"v", x:.99, y:.99, xanchor:"right", yanchor:"top", font:{ family:"Roboto, Arial, sans-serif", size:12 }, bgcolor:"rgba(255,255,255,.86)", borderwidth:0 }'), "Show Legend must configure Plotly's native vertical paper-anchored Roboto legend inside the plot zone");
  expect(/\.signals-toolbar-error\{[^}]*z-index:var\(--layer-passive-toast\)/.test(appCss), "passive toast must use the passive-toast layer");
  expect(/\.signals-dialog-layer\{[^}]*z-index:var\(--layer-main-modal-backdrop\)/.test(appCss) && /\.signals-dialog\{[^}]*z-index:var\(--layer-main-modal\)/.test(appCss), "main dialog/backdrop must use the pinned main-modal layers");
  expect(/\.screen-delete-layer\{[^}]*z-index:var\(--layer-screen-delete-backdrop\)/.test(layoutsCss) && /\.screen-delete-card\{[^}]*z-index:var\(--layer-screen-delete\)/.test(layoutsCss), "screen-delete confirmation must use the pinned delete layers");
  expect(/\.screen-delete-layer[^{]*\{[^}]*background:rgba\(26,36,49,\.42\)/.test(layoutsCss), "screen-delete backdrop must dim stale modeless underlays at the required .42 opacity");
  expect(/tooltip/.test(appCss + layoutsCss + app), "tooltip layer is declared but no Frontend tooltip owner implements the required pointer-inert coexistence contract");
  expect(/nested(?:Confirmation|Confirm|confirmation)/.test(appCss + layoutsCss + app), "nested confirmation layer is declared but no Frontend nested blocker implements its focus/stack contract");

  expect(/data-testid="graph-help-action"/.test(html) && /data-testid="display-overflow-menu"[^>]*role="menu"/.test(html), "graph-help action must remain in the pane menu");
  expect(app.includes("graphHelpOpen = true") && app.includes("data-testid='graph-help-close'") && app.includes("graphHelpAction.focus()"), "graph help must open a close control and restore focus to its menu item");
  expect(/graphHelpOpen[\s\S]*event\.key !== "Escape"[\s\S]*closeGraphHelp\(\)/.test(app), "Escape must dismiss graph help before the underlying pane menu");
  expect(/graphHelpOpen[\s\S]*document\.addEventListener\("click"[\s\S]*closeGraphHelp\(/.test(app), "outside click must dismiss graph help deterministically");
  expect(/function closeGraphHelp\(\)[\s\S]*graphHelpOpen = false[\s\S]*overflowOpen = true/.test(app), "closing graph help must leave its pane menu open for the second Escape");
  expect(/function closeGraphHelp\(\)[\s\S]*Plotly\.(?:react|relayout|Plots\.resize)/.test(app) === false, "opening/closing graph help must not trigger Plotly resize/render work");

  expect(/function (?:acquire|release|push|pop)[A-Za-z]*Overlay/.test(app) && /(?:overlayStack|activeOverlay|modalDepth)/.test(app), "one overlay-stack coordinator must arbitrate newest-first Escape, inert, scroll lock, and focus restoration across all layers");
  expect(/document\.body\.style\.overflow|document\.documentElement\.style\.overflow|classList\.add\([^)]*scroll/.test(app), "blocking overlay ownership must lock and restore document scroll exactly once");
  expect(app.includes("root.inert = true") && app.includes("root.inert = false"), "blocking screen-delete dialog must acquire and release app inert ownership");
  expect(/openScreenDelete[\s\S]*graphHelpOpen = false/.test(app) && /openScreenDelete[\s\S]*overflowOpen = false/.test(app), "screen-delete must dismiss stale pane help/menu before owning focus");
  expect(/openScreenDelete[\s\S]*addEventListener\("keydown"[\s\S]*event\.key === "Tab"/.test(app), "screen-delete confirmation must implement the single active Tab/Shift+Tab focus trap");
  expect(/openScreenDelete[\s\S]*dialog\.addEventListener\("click"[\s\S]*closeScreenDelete/.test(app), "screen-delete outside/backdrop click must dismiss only the newest blocker");
  expect(/closeScreenDelete\(\)[\s\S]*screenDeleteRestore\.focus\(\)/.test(app), "screen-delete cancel/close must restore focus to the originating tab close control");
  expect(/screen-delete-confirm[\s\S]*displayMutation\("close", target\)/.test(app), "screen-delete confirm must retain the authoritative screen-close mutation path");
  expect(/function setSignalsModalBackground\(disabled\)[\s\S]*root\.inert/.test(app), "main dialogs must share inert ownership rather than only visual stacking");
  expect(/setSignalsModalBackground\(false\)[\s\S]*(?:overlayStack|modalDepth|activeOverlay)/.test(app), "closing an older main dialog must not release inert while a newer delete/nested blocker remains active");
  expect(/function trapSignalsKeyboard[\s\S]*e\.key !== "Tab"[\s\S]*e\.shiftKey/.test(app), "main dialogs must retain deterministic Tab and Shift+Tab trapping");
  expect(/overflow(?:Open)?[\s\S]*event\.key === "Escape"/.test(app), "pane/inspector menu Escape dismissal must be explicit and newest-first");
  expect(/screenDeleteRestore[\s\S]*displayMutation\("close", target\)[\s\S]*(?:focusDisplayTab|surviv(?:or|ing))/ .test(app), "confirmed screen deletion must focus the deterministic adjacent surviving tab, not its removed trigger");

  assert(failures.length === 0, `TASK-0062 overlay contract failures (${failures.length}):\n- ${failures.join("\n- ")}`);
};
