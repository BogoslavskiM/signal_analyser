"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testV5CleanFrontendContracts(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const css = `${read("public/css/theme.css")}\n${read("public/css/app.css")}`;
  const app = read("public/js/app.js");
  const api = read("public/js/api.js");
  const settings = read("public/js/settings.js");

  [
    "app-shell", "display-workspace", "display-tabs", "layout-trigger",
    "layout-popover", "plot-grid", "settings-panel", "settings-catalog-panel",
    "explicit-apply-root", "bottom-panel-signals", "signal-search-input",
    "signal-rows", "signal-columns-menu", "overlay-tooltip", "runtime-dialog-root",
  ].forEach((id) => assert(html.includes(`data-testid=\"${id}\"`), `v5 shell must expose ${id}`));
  assert(!/\.\.?\/assets\/|design\.css|demo\.js/.test(html), "production shell must not retain prototype-relative assets or demo runtime");
  assert(/\.\/css\/theme\.css/.test(html) && /\.\/css\/app\.css/.test(html), "production shell must load its local v5 CSS");
  ["roboto-v51-cyrillic-regular.ttf", "roboto-v51-cyrillic-medium.ttf", "roboto-v51-latin-regular.ttf", "roboto-v51-latin-medium.ttf"].forEach((asset) => {
    assert(css.includes(asset) && fs.existsSync(path.join(root, "public/fonts", asset)), `local Roboto asset ${asset} must be declared and present`);
  });
  ["eye.svg", "eye-off.svg", "engee-logo.svg", "chevron-down-fill-16.svg"].forEach((asset) => assert(fs.existsSync(path.join(root, "public/icons", asset)), `canonical local SVG ${asset} must exist`));
  assert(!/https?:\/\//.test(html + css + app), "clean frontend must not add runtime CDN assets");
  assert(/min-width:\s*920px/.test(css) && /min-height:\s*680px/.test(css), "v5 shell must retain the 920×680 minimum");
  assert(/grid-template-rows:\s*44px\s+minmax\(440px,\s*calc\(80%\s*-\s*104px\)\)\s+minmax\(180px,\s*calc\(20%\s*\+\s*44px\)\)/.test(css), "v5 shell must retain 44/440/180 4:1 vertical sizing");
  assert(/grid-template-columns:\s*minmax\(612px,\s*3fr\)\s+minmax\(300px,\s*1fr\)/.test(css), "v5 main stage must retain 612/300 3:1 columns");
  const selectedUnderline = (css.match(/\.display-tab-shell\.is-selected::after[^{]*\{[^}]*\}/s) || [""])[0];
  assert(/left:\s*0/.test(selectedUnderline) && /right:\s*0/.test(selectedUnderline) && /bottom:\s*0/.test(selectedUnderline) && /height:\s*3px/.test(selectedUnderline), "selected Display shell must own its continuous 3px underline");
  assert(/\.layout-popover[^{]*\{[^}]*width:\s*372px/.test(css), "layout dialog must be the fixed 372px v5 surface");
  assert(!/(?:filter|backdrop-filter)\s*:\s*[^;}]*blur/i.test(css), "empty/loading/ready/error panes must not blur graphs");
  assert(/\.layout-grid-icon[^{]*\{[^}]*width:\s*16px[^}]*height:\s*16px/s.test(css), "the copied TASK-0044 grid vector must render at 16×16px");
  assert(/<svg class="layout-grid-icon" viewBox="0 0 24 24"[^>]*><rect x="3" y="3" width="7" height="7" rx="1"><\/rect><rect x="14" y="3" width="7" height="7" rx="1"><\/rect><rect x="3" y="14" width="7" height="7" rx="1"><\/rect><rect x="14" y="14" width="7" height="7" rx="1"><\/rect><\/svg>/.test(html), "layout trigger must retain the exact four-rectangle TASK-0044 inline SVG");
  assert((html.match(/data-testid="explicit-apply-root"/g) || []).length === 1, "v5 shell must expose exactly one explicit Apply root");
  assert((html.match(/data-settings-content/g) || []).length === 1, "v5 shell must expose exactly one canonical settings-content subtree");

  assert(api.includes('"./api/state-lite"') && !api.includes('"./api/state"'), "bootstrap must use state-lite rather than eager graph state");
  ["./api/outputs/active?display_id=", "./api/settings/apply", "./api/layouts", "./api/view", "./api/displays", "./api/signals", "./api/session"].forEach((route) => assert(api.includes(route), `normal API adapter must retain ${route}`));
  assert(/setTimeout\(function \(\) \{ send\(item\); \},\s*150\)/.test(settings), "valid Apply-bound settings fields must use the exact 150ms debounce");
  assert(/function output\(poll\)[\s\S]*panes\(\)\.forEach/.test(app), "every visible pane must request an output independently");
  assert(/function paneRuntimeKey\(displayId, paneId\)[\s\S]*?String\(displayId\) \+ "::" \+ String\(paneId\)/.test(app) && /outputTokens\[runtimeKey\]/.test(app), "each Display/pane output must have an isolated supersession token");
  assert(/calculation_revision/.test(app) && /context_key/.test(app), "pane output acceptance must guard calculation revision and context key");
  assert(/pollByPane\[runtimeKey\]/.test(app), "pending output polling must use independent Display/pane timers");
  assert(/Plotly\.react\(/.test(app) && /requestAnimationFrame/.test(app), "Plotly rendering must remain lazy and serialized through rAF and react");
  assert(/function accept\(snapshot\)[\s\S]*r<model\.revision/.test(app), "state snapshots older than state_revision must be rejected");
  assert(/<span class='layout-current'>/.test(app), "runtime layout trigger must retain the live v5 layout-current label class");
  assert(!/pop\.innerHTML\s*=/.test(app), "runtime must populate the authored v5 layout dialog rather than replace its prototype DOM");
  assert(/eye\.svg/.test(app) && /eye-off\.svg/.test(app), "signal-column visibility state must use the local eye and eye-off icons");
};
