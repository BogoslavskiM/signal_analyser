"use strict";

const fs = require("fs");
const path = require("path");

function lastDeclaration(source, selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  const values = blocks.map((match) => {
    const declaration = new RegExp(`${property}\\s*:\\s*([^;}]*)`, "g").exec(match[1]);
    return declaration && declaration[1].trim();
  }).filter(Boolean);
  return values.at(-1);
}

function includesAll(source, values) {
  return values.every((value) => source.includes(value));
}

// This protects the source-derived design-v2 contract. Browser geometry,
// hit-testing and rendered Plotly pixels remain explicitly owned by E2E.
module.exports = async function testDesignV2StaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const theme = read("public/css/theme.css");
  const appCss = read("public/css/app.css");
  const settingsCss = read("public/css/settings.css");
  const layoutsCss = read("public/css/layouts.css");
  const app = read("public/js/app.js");
  const layouts = read("public/js/layouts.js");
  const settings = read("public/js/settings.js");
  const css = `${theme}\n${appCss}\n${settingsCss}\n${layoutsCss}`;
  const failures = [];
  const expect = (condition, contract) => { if (!condition) failures.push(contract); };

  // Shared pinned profile: local typography/assets and canonical controls.
  ["roboto-v51-cyrillic-regular.ttf", "roboto-v51-cyrillic-medium.ttf", "roboto-v51-latin-regular.ttf", "roboto-v51-latin-medium.ttf"].forEach((asset) => {
    expect(theme.includes(asset) && fs.existsSync(path.join(root, "public/fonts", asset)), `local Roboto asset ${asset} must be declared and present`);
  });
  ["engee-logo.svg", "import.svg", "save.svg", "help-circle.svg", "plus.svg", "more-vertical.svg"].forEach((asset) => {
    expect(html.includes(`./icons/${asset}`) || app.includes(`./icons/${asset}`) || layouts.includes(`./icons/${asset}`), `local SVG ${asset} must remain the only UI asset owner`);
    expect(fs.existsSync(path.join(root, "public/icons", asset)), `local SVG ${asset} must exist`);
  });
  expect(!/https?:\/\/(?:[^"']+\.)?(?:googleapis|gstatic|cdnjs|unpkg|jsdelivr)\./i.test(html + css + app + layouts), "design-v2 shell must not introduce runtime CDN assets");
  expect(/html\s*,\s*body\s*\{(?=[^}]*\bwidth\s*:\s*100%)(?=[^}]*\bheight\s*:\s*100%)/.test(layoutsCss), "page shell must fill its available viewport/container without a minimum canvas lock");
  expect(/\.signal-analyser\s*\{(?=[^}]*\bwidth\s*:\s*100%)(?=[^}]*\bheight\s*:\s*100%)/.test(layoutsCss), "application shell must fill its containing block rather than a checkpoint-sized canvas");
  expect(!/(?:html\s*,\s*body|html,body|\.signal-analyser)\s*\{[^}]*(?:(?<!min-)(?:width|height|max-width|max-height)\s*:\s*\d+(?:\.\d+)?px)/i.test(layoutsCss), "page and application shells may retain readable minimums but must not use fixed or max pixel canvas locks that prevent filling a larger container");
  expect(lastDeclaration(css, ".app-toolbar", "height") === "44px", "zone 1 toolbar must finish at exactly 44px");
  expect(lastDeclaration(css, ".display-workspace", "grid-template-rows") === "42px 32px minmax(0,1fr)", "zone 2 workspace/title/navigation rows must finish at exactly 42px/32px");
  expect(lastDeclaration(css, ".display-tabs", "height") === "32px", "zone 2 Display navigation must finish at exactly 32px");
  expect(lastDeclaration(css, ".pane-header", "height") === "32px", "zone 3 pane header must finish at exactly 32px");
  expect(lastDeclaration(css, ".pane-header .plot-type-control select", "height") === "28px", "zone 3 plot-type control must finish at exactly 28px");
  expect(lastDeclaration(css, ".pane-header .more-button", "width") === "32px" && lastDeclaration(css, ".pane-header .more-button", "height") === "28px", "zone 3 pane menu trigger must remain 32×28px");

  // Five zones must remain structurally reachable from the public shell.
  [
    ["app-toolbar", "zone 1 application toolbar"],
    ["workspace-titlebar", "zone 2 workspace title"],
    ["data-testid=\"pane-grid\"", "zone 3 plot workspace"],
    ["data-testid=\"display-settings\"", "zone 4 settings"],
    ["class=\"bottom-zone\"", "zone 5 inspector"],
  ].forEach(([needle, label]) => expect(html.includes(needle), `${label} must remain in the public shell`));
  expect(/data-settings-tab="display"[\s\S]*data-settings-tab="time"[\s\S]*data-settings-tab="measurements"/.test(html), "zone 4 must expose exactly the approved Display, Time, and Measurements settings pages in order");
  expect(lastDeclaration(settingsCss, ".display-settings select,.settings-scalar input,.settings-enum input", "height") === "32px", "zone 4 general controls must finish at exactly 32px");
  expect(lastDeclaration(settingsCss, ".display-settings select,.settings-scalar input,.settings-enum input", "border-radius") === "6px", "zone 4 general controls must finish with 6px radii");
  expect(lastDeclaration(settingsCss, ".settings-enum-options button", "height") === "34px", "zone 4 select options must finish at exactly 34px");
  expect(includesAll(settingsCss, [":hover:not(:disabled)", ":active", ":focus-visible", ":disabled"]), "zone 4 controls must retain distinct hover/pressed/focus-visible/disabled selectors");
  expect(settings.includes("aria-selected='") && /\.settings-enum-options button\[aria-selected=["']true["']\]\{[^}]*background:#e6f5fc/.test(settingsCss), "zone 4 selected menu options must visibly map aria-selected=true to the pinned #e6f5fc state");
  expect(lastDeclaration(css, ".signal-table th,.signal-table td", "height") === "32px", "zone 5 inspector table rows must finish at exactly 32px");
  expect(lastDeclaration(css, ".signal-columns-menu", "width") === "244px", "zone 5 column menu must finish at exactly 244px");
  expect(lastDeclaration(css, ".signal-columns-menu", "padding") === "4px", "zone 5 column menu must finish with 4px padding");
  expect(lastDeclaration(css, ".color-swatch", "width") === "16px" && lastDeclaration(css, ".color-swatch", "height") === "16px" && lastDeclaration(css, ".color-swatch", "border") === "0", "zone 5 swatch must finish as a borderless 16×16px control");
  expect(app.includes("eye.svg") && app.includes("eye-off.svg") && !/data-signal-column-toggle[\s\S]{0,300}tick-figma\.svg/.test(app), "zone 5 column visibility must use eye/eye-off, never a checkmark");
  expect(/function renderSignalColumnMenu\([\s\S]*names = \{ color:"Цвет", "sample-rate":"Частота дискретизации", samples:"Отсчёты", duration:"Длительность", type:"Тип" \}/.test(app), "zone 5 must never offer the required Name column for hiding");

  // All requested popup layers must retain named priority ownership.
  const overlayOwners = [
    ["layout-popover", "--layer-layout-popover", "layout popover"],
    ["layout-toast", "--layer-passive-toast", "layout toast"],
    ["display-overflow-menu", "--layer-menu", "pane menu"],
    ["signal-columns-menu", "--layer-menu", "inspector menu"],
    ["graph-help-overlay", "--layer-graph-help", "graph help"],
    ["overlay-tooltip", "--layer-tooltip", "tooltip"],
    ["signals-dialog-layer", "--layer-main-modal-backdrop", "primary dialog backdrop"],
    ["screen-delete-layer", "--layer-screen-delete-backdrop", "screen-delete backdrop"],
    ["nested-confirmation-layer", "--layer-nested-confirmation-backdrop", "nested confirmation backdrop"],
  ];
  overlayOwners.forEach(([selector, layer, label]) => {
    expect(css.includes(`.${selector}`) && css.includes(layer), `${label} must retain a named overlay layer`);
  });
  expect(/\.overlay-tooltip\{[^}]*pointer-events:none/.test(layoutsCss), "tooltips must be pointer-inert");
  expect(/\.graph-help-overlay\{[^}]*position:absolute/.test(layoutsCss), "graph help must stay overlayed rather than enter plot flow");
  expect(/\.layout-toast\{[^}]*pointer-events:none/.test(layoutsCss), "passive toast must not steal pointer ownership");
  expect(/pushOverlay\([\s\S]*activeOverlay\([\s\S]*handleOverlayKeydown[\s\S]*trapOverlayFocus/.test(app), "one stack coordinator must own newest-first overlay focus and Escape handling");
  expect(/function syncOverlayOwnership\([\s\S]*setSignalsModalBackground\(modalDepth > 0\)/.test(app) && /function setSignalsModalBackground\([\s\S]*root\.inert = true[\s\S]*root\.inert = false/.test(app), "blocking dialogs must make lower application surfaces inert until the stack clears");
  expect(/graphHelpOpen[\s\S]*event\.key !== "Escape"[\s\S]*closeGraphHelp\(\)/.test(app) && /function closeGraphHelp\([\s\S]*overflowOpen = true/.test(app), "graph-help Escape must close help first and restore its parent menu state");
  expect(/openScreenDelete[\s\S]*graphHelpOpen = false[\s\S]*overflowOpen = false/.test(app), "screen delete must dismiss stale modeless pane layers before taking focus");
  expect(/openNestedConfirmation[\s\S]*blocking:true[\s\S]*onEscape:function\(\) \{ closeNestedConfirmation\(true\); \}/.test(app), "nested confirmation must be the newest blocking Escape owner and restore the main dialog");
  expect(/function closeScreenDelete\([\s\S]*screenDeleteRestore\.focus\(\)/.test(app), "screen delete cancel/close must restore focus to its originating close control");
  expect(/function closeGraphHelp\([\s\S]*Plotly\./.test(app) === false && /function (?:open|close)(?:LayoutPopover|Signals|ScreenDelete)[\s\S]{0,500}Plotly\.(?:react|relayout|Plots\.resize)/.test(app) === false, "modeless and blocking overlays must not trigger Plotly render or resize work");

  // Preserve the performance/mutation contracts while the visual shell changes.
  expect(layouts.includes("./api/outputs/active?display_id=") && layouts.includes("activeOutputIdentity") && layouts.includes("stopActiveOutputPoll"), "active-output-only polling must remain scoped to the current pane");
  expect(layouts.includes("responseRevision < (latestKnownRevision() || 0)") && layouts.includes("state_revision"), "stale state_revision responses must remain rejected");
  expect(layouts.includes("ResizeObserver") && layouts.includes("Plotly.react(") && layouts.includes("requestAnimationFrame(function renderLatestPane"), "live Plotly must retain lazy serialized rAF rendering and resize observation");
  expect(app.includes("displayMutation(") && fs.existsSync(path.join(root, "test/front/public/js/state_lite_active_output.static.test.js")) && fs.existsSync(path.join(root, "test/front/public/js/app.behavior.test.js")), "the existing strict state-lite/live-Plotly/mutation suites must remain part of the frontend corpus");

  assert(failures.length === 0, `TASK-0074 design-v2 static contract failures (${failures.length}):\n- ${failures.join("\n- ")}`);
};
