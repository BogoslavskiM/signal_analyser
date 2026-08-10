"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testPaneSelectionAndInspectorTable(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  const paneContext = (app.match(/function renderActivePaneContext\(\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/classList\.toggle\("is-active", selected\)/.test(paneContext), "pane selection must update the active pane surface in place");
  assert(/renderSettings\(display\)[\s\S]*renderInspector\(\)/.test(paneContext), "pane selection must refresh settings and signal checkboxes");
  assert(!/renderGrid\(|output\(/.test(paneContext), "pane selection must not rebuild or reload Plotly panes");
  assert(/operation: "select_pane"[\s\S]*\{ preservePlots:true, skipOutput:true \}/.test(app), "select_pane must preserve plot DOM and skip output polling");
  assert(/if \(!options \|\| !options\.skipOutput\) output\(true\)/.test(app), "mutation completion must honor the no-output selection path");

  assert(/var renderedColumns = \[\{ id:"name", label:"Имя" \}\]\.concat\(columns\)/.test(app), "the inspector must build one ordered list of visible data columns");
  assert(/index === renderedColumns\.length - 1[\s\S]*last \? "is-actions-host"[\s\S]*last \? actions/.test(app), "row actions must overlay whichever data column is last visible");
  assert(!/\+ "<th aria-label='Действия'><\/th>"/.test(app), "the inspector must not render a separate blank actions column");
  assert(/data-visible-all-signals/.test(app), "the design header checkbox must be present in the visibility column");
  assert(/function positionMenu\(menu, trigger, width\)[\s\S]*window\.innerWidth - width - 8[\s\S]*menuRect\.bottom > window\.innerHeight - 8[\s\S]*rect\.top - menuRect\.height - 4/.test(app), "the column menu must clamp horizontally and flip above its trigger when it would leave the viewport");
  assert(/signal-columns-menu-trigger[\s\S]*positionMenu\(columns, button, 244\)/.test(app), "opening the column menu must position it from its toolbar trigger");

  const inspector = (css.match(/\.inspector\s*\{[^}]*\}/g) || []).find((rule) => /grid-template-rows/.test(rule)) || "";
  const header = (css.match(/\.inspector-header\s*\{[^}]*\}/g) || []).find((rule) => /border-top/.test(rule)) || "";
  const tabs = (css.match(/\.inspector-tabs\s*\{[^}]*\}/g) || []).find((rule) => /overflow-x:\s*hidden/.test(rule)) || "";
  assert(/grid-template-rows:\s*32px/.test(inspector), "inspector tab strip must remain one 32px row");
  assert(/margin:\s*0 8px/.test(header), "inspector tabs/actions must align with the inset search and table zone");
  assert(/border-top:\s*1px solid var\(--line\)/.test(header) && /border-bottom:\s*1px solid var\(--line\)/.test(header), "inspector tab strip must have matching thin top and bottom separators");
  assert(/overflow-x:\s*hidden/.test(tabs), "the three inspector tabs must not become a scrolling multi-page history");
  assert(/\.signal-table th:first-child,[\s\S]*width:\s*42px/.test(css), "visibility column width must match the design");
  assert(/\.signal-table th:nth-child\(2\)\s*\{\s*width:\s*28%/.test(css), "name column width must match the design");
};
