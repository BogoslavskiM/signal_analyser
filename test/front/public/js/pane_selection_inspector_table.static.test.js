"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testPaneSelectionAndInspectorTable(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

  const paneContext = (app.match(/function renderActivePaneContext\(\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/classList\.toggle\("is-active", selected\)/.test(paneContext), "pane selection must update the active pane surface in place");
  assert(/renderSettings\(display\)[\s\S]*renderInspector\(\)/.test(paneContext), "pane selection must refresh settings and signal checkboxes");
  assert(!/renderGrid\(|output\(/.test(paneContext), "pane selection must not rebuild or reload Plotly panes");
  assert(/operation: "select_pane"[\s\S]*\{ preservePlots:true, skipOutput:true \}/.test(app), "select_pane must preserve plot DOM and skip output polling");
  assert(/if \(!options \|\| !options\.skipOutput\) \{[\s\S]*?\} else output\(true\)/.test(app), "mutation completion must honor the no-output selection path while allowing an exact-pane refresh");

  assert(/var renderedColumns = \[\{ id:"name", label:"Имя" \}\]\.concat\(columns\)/.test(app), "the inspector must build one ordered list of visible data columns");
  assert(/index === renderedColumns\.length - 1[\s\S]*last \? "is-actions-host"[\s\S]*last \? actions/.test(app), "row actions must overlay whichever data column is last visible");
  assert(!/\+ "<th aria-label='Действия'><\/th>"/.test(app), "the inspector must not render a separate blank actions column");
  assert(/data-visible-all-signals/.test(app), "the design header checkbox must be present in the visibility column");
  assert(/function positionMenu\(menu, trigger, width\)[\s\S]*document\.documentElement\.clientWidth[\s\S]*window\.visualViewport[\s\S]*menuRect\.bottom > viewportHeight - 8[\s\S]*rect\.top - menuRect\.height - 4/.test(app), "the column menu must clamp to the real visual viewport and flip above its trigger when it would leave it");
  assert(/signal-columns-menu-trigger[\s\S]*positionMenu\(columns, button, 244\)/.test(app), "opening the column menu must position it from its toolbar trigger");

  const inspector = (css.match(/\.inspector\s*\{[^}]*\}/g) || []).find((rule) => /grid-template-rows/.test(rule)) || "";
  const header = (css.match(/\.inspector-header\s*\{[^}]*\}/g) || [""])[0];
  const headerEdge = (css.match(/\.inspector-header::before\s*\{[^}]*\}/g) || [""])[0];
  const body = (css.match(/\.inspector-body\s*\{[^}]*\}/g) || []).find((rule) => /grid-template-rows/.test(rule)) || "";
  const tabs = (css.match(/\.inspector-header\s*>\s*\.inspector-tabs\s*\{[^}]*\}/g) || [""])[0];
  const tabButtons = (css.match(/\.inspector-header\s*>\s*\.inspector-tabs button\s*\{[^}]*\}/g) || [""])[0];
  const inspectorHeaderHtml = (html.match(/<header class="inspector-header">[\s\S]*?<\/header>/) || [""])[0];
  const inspectorSearchHtml = (html.match(/<div class="inspector-search-row">[\s\S]*?<\/div>\s*<\/div>/) || [""])[0];
  assert(/grid-template-rows:\s*32px/.test(inspector), "inspector tab strip must remain one 32px row");
  assert(/padding:\s*8px/.test(inspector) && /background:\s*var\(--app-bg\)/.test(inspector), "the inspector must use the same full-zone underlay as the plot grid and leave a top inset around tabs");
  assert(/border-radius:\s*var\(--control-radius\) var\(--control-radius\) 0 0/.test(header) && /inset:\s*0/.test(headerEdge) && /inset 0 1px 0 var\(--line-strong\)/.test(headerEdge), "the tab strip must align with one stable full-width rounded overlay edge");
  assert(/padding:\s*0/.test(body), "the inspector body must join the inset tab, search and table surfaces without a second offset");
  assert(/signals-add-action[\s\S]*signal-columns-menu-trigger/.test(inspectorSearchHtml) && !/inspector-actions/.test(inspectorHeaderHtml), "signal actions must live at the right edge of the search row, not the tab strip");
  assert(/inspector-search-field[\s\S]*signal-search-input[\s\S]*inspector-actions/.test(inspectorSearchHtml), "the Signals search field and its action buttons must be separate siblings");
  assert(/\.inspector-search-field:focus-within\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--accent\)/.test(css), "the active search border must belong only to the search field");
  assert(!/\.inspector-search-row:focus-within/.test(css), "the active search border must not surround the Signals action buttons");
  assert(/height:\s*100%/.test(tabs) && !/(?:min-|max-)?height:\s*32px/.test(tabs), "the lower inspector tabs must fill the exact 32px grid row without duplicating its dimensions");
  assert(/overflow-x:\s*hidden/.test(tabs) && /overflow-y:\s*hidden/.test(tabs), "the lower inspector tabs must explicitly forbid horizontal and vertical scrolling");
  assert(/height:\s*100%/.test(tabButtons) && /line-height:\s*20px/.test(tabButtons) && !/(?:min-|max-)?height:\s*32px/.test(tabButtons), "lower tab buttons must fill the tab row without duplicated height declarations");
  assert(/\.inspector-header\s*>\s*\.inspector-tabs button:focus-visible\s*\{[^}]*outline-offset:\s*-3px/.test(css), "the lower tab focus ring must remain inset");
  assert(/\.signal-table-scroll\s*\{[^}]*overflow:\s*auto/.test(css), "table scrolling must remain on the table body below the fixed lower tabs");
  assert(/\.signal-table th:first-child,[\s\S]*width:\s*42px/.test(css), "visibility column width must match the design");
  assert(/\.signal-table th:nth-child\(2\)\s*\{\s*width:\s*28%/.test(css), "name column width must match the design");
  assert(/\.color-cell\s*\{[^}]*text-align:\s*left\s*!important/.test(css), "signal Color cells must align their swatches to the left edge");
};
