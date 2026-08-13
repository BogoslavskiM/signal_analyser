"use strict";

const fs = require("fs");
const path = require("path");

function functionBlock(source, name, nextName) {
  const expression = new RegExp("function " + name + "\\([\\s\\S]*?(?=\\n  function " + nextName + "\\(|\\n  document\\.addEventListener)");
  return (source.match(expression) || [""])[0];
}

module.exports = async function testTask0102LowerInspectorStatesStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const css = read("public/css/app.css");
  const app = read("public/js/app.js");

  assert(/<div class="workspace-inspector-stack"[^>]*data-testid="workspace-inspector-stack"[^>]*data-inspector-state="split"/.test(html), "a reload must start from the non-persisted split state");
  assert(/workspaceInspectorState:\s*"split", workspaceSplitRatio:\s*null/.test(app), "runtime state must independently default to split and an unset session ratio");
  assert(!/localStorage|sessionStorage/.test(functionBlock(app, "workspaceInspectorContract", "renderLayoutTrigger")), "state and saved ratio must remain page-session only");

  const controlMarkup = (html.match(/<button class="inspector-state-toggle"[\s\S]*?<\/button>/) || [""])[0];
  const controlRule = (css.match(/\.inspector-state-toggle\s*\{[^}]*\}/) || [""])[0];
  assert(/data-testid="inspector-state-toggle"/.test(controlMarkup) && /data-current-state="split"/.test(controlMarkup) && /inspector-state-triangle is-up/.test(controlMarkup), "the lower header must own one far-right split/up state control");
  assert(/width:\s*32px/.test(controlRule) && /height:\s*31px/.test(controlRule) && /flex:\s*0 0 32px/.test(controlRule) && /border-left:\s*1px solid var\(--line\)/.test(controlRule) && /background:\s*var\(--surface\)/.test(controlRule), "state control must be the exact 32x31 white far-right target with a left divider");
  assert(/\.inspector-state-toggle:hover\s*\{[^}]*background:\s*var\(--surface-muted\)[^}]*color:\s*var\(--accent\)/s.test(css) && /\.inspector-state-toggle:active\s*\{[^}]*background:\s*var\(--button-active\)/s.test(css) && /\.inspector-state-toggle:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)[^}]*outline-offset:\s*-3px/s.test(css), "toggle must expose distinct hover, pressed and unclipped keyboard-focus states");
  assert(/\.inspector-state-triangle\.is-up\s*\{[^}]*border-width:\s*0 5px 7px/s.test(css) && /\.inspector-state-triangle\.is-down\s*\{[^}]*border-width:\s*7px 5px 0/s.test(css) && /\.inspector-state-triangle\.is-left\s*\{[^}]*border-width:\s*5px 7px 5px 0/s.test(css), "the one target must provide exact up, down and left CSS triangles without a new image asset");

  assert(/\.workspace-inspector-stack\s*\{[^}]*grid-template-rows:\s*minmax\(440px,\s*var\(--workspace-main-track,\s*4fr\)\)\s+8px\s+minmax\(180px,\s*1fr\)/s.test(css), "split must retain the saved-variable 440/8/180 track contract");
  assert(/\.workspace-inspector-stack\[data-inspector-state="collapsed"\]\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+8px\s+42px/s.test(css), "collapsed must use exactly 1fr/8/42 tracks");
  assert(/\.workspace-inspector-stack\[data-inspector-state="expanded"\]\s*\{[^}]*grid-template-rows:\s*74px\s+8px\s+minmax\(0,\s*1fr\)/s.test(css), "expanded must use exactly 74/8/1fr tracks");
  assert(/data-inspector-state="collapsed"\] \.inspector\s*\{[^}]*grid-template-rows:\s*32px[^}]*padding:\s*8px 8px 0/s.test(css), "collapsed lower panel must allocate only its tab header without a blank body row");
  assert(/data-inspector-state="collapsed"\] \.inspector-body,[\s\S]*?data-inspector-state="collapsed"\] \.inspector-actions,[\s\S]*?data-inspector-state="expanded"\] \.plot-grid,[\s\S]*?data-inspector-state="expanded"\] \.settings-scroll,[\s\S]*?data-inspector-state="expanded"\] \.settings-apply-block\s*\{\s*display:\s*none/s.test(css), "collapsed must hide body/actions and expanded must hide plot/settings bodies/footer");
  assert(/data-inspector-state="expanded"\] \.workspace,[\s\S]*?data-inspector-state="expanded"\] \.settings-panel\s*\{[^}]*grid-template-rows:\s*42px 32px/s.test(css), "expanded must retain the display/settings headings and tab strips as the exact 74px upper track");
  ["display-tabs", "settings-tabs", "inspector-tab-signals", "inspector-tab-measurements", "inspector-tab-peaks"].forEach((testId) => assert(html.includes(`data-testid="${testId}"`), `${testId} must remain in the invariant DOM across all three states`));

  const contract = functionBlock(app, "workspaceInspectorContract", "renderWorkspaceInspectorState");
  const renderState = functionBlock(app, "renderWorkspaceInspectorState", "closeWorkspaceInspectorMenus");
  const closeMenus = functionBlock(app, "closeWorkspaceInspectorMenus", "setWorkspaceInspectorState");
  const setState = functionBlock(app, "setWorkspaceInspectorState", "cycleWorkspaceInspectorState");
  const cycle = functionBlock(app, "cycleWorkspaceInspectorState", "workspaceSplitNodes");
  const sizing = functionBlock(app, "setWorkspaceSplitHeight", "retainWorkspaceSplitOnResize");
  const move = functionBlock(app, "moveWorkspaceSplitDrag", "renderLayoutTrigger");
  assert(/expanded[\s\S]*?icon:"is-down"[\s\S]*?Свернуть нижнюю зону/.test(contract) && /collapsed[\s\S]*?icon:"is-left"[\s\S]*?Вернуть средний размер/.test(contract) && /icon:"is-up"[\s\S]*?Развернуть нижнюю зону/.test(contract), "split/up, expanded/down and collapsed/left must expose the exact tooltip contract");
  assert(/split" \? "expanded"[^\n]*expanded" \? "collapsed" : "split"/.test(cycle), "one button must cycle exactly split to expanded to collapsed to saved split");
  assert(/toggle\.focus\(\{ preventScroll:true \}\)/.test(cycle) && /toggle\.focus\(\)/.test(cycle), "the connected state button must retain focus after every transition");
  assert(/valueSelect\.close\(false\)/.test(closeMenus) && /closePaneMenu\(false\)/.test(closeMenus) && /closeColumnMenu\(false\)/.test(closeMenus) && /closeMeasurementMenu\(false\)/.test(closeMenus) && /closeLayout\(\)/.test(closeMenus), "state transition must close all value/action/layout menus through existing controllers");
  assert(/if \(state === "split"\) retainWorkspaceSplitOnResize\(\)/.test(setState) && !/workspaceSplitRatio\s*=/.test(setState + cycle), "fixed modes must never overwrite the saved split ratio and returning split must restore it");
  assert(/Math\.max\(440, Math\.min\(maximum, requestedHeight\)\)/.test(sizing) && /Math\.abs\(event\.clientY - drag\.startY\) < 4/.test(move) && /setWorkspaceInspectorState\("split", false\)/.test(move), "a fixed-state drag must remain inert below 4px, then enter split and clamp to inherited minima");
  assert(/pointercancel", stopWorkspaceSplitDrag/.test(app) && /event\.type === "pointerup"/.test(functionBlock(app, "stopWorkspaceSplitDrag", "startWorkspaceSplitDrag")), "pointer cancellation must clean drag state without scheduling its settle autoscale");

  const layoutOnly = [renderState, closeMenus, setState, cycle, sizing, move].join("\n");
  assert(!/api\.|fetch\(|state_revision|revision\s*[+=]|calculate|output\(|Plotly\.(?:react|newPlot)|renderGrid\(|renderSettings\(|renderInspector\(|createPaneNode\(/.test(layoutOnly), "all state transitions must be layout-only: no API, revision, calculation, Plotly remount or pane/table rerender");
  assert(/queueWorkspaceSplitAutoscale\(\)/.test(setState) && /Plotly\.relayout\(host, update\)/.test(functionBlock(app, "queueWorkspaceSplitAutoscale", "stopWorkspaceSplitDrag")), "state settles must reuse only the existing visible-ready Plotly relayout autoscale lifecycle");

  assert(/html,\s*\nbody\s*\{[^}]*min-width:\s*920px[^}]*min-height:\s*680px[^}]*overflow:\s*auto/s.test(css), "undersized viewports must keep the 920x680 canvas and use document scrolling");
  assert(/\.app-shell\s*\{[^}]*min-width:\s*920px[^}]*min-height:\s*680px[^}]*grid-template-rows:\s*44px minmax\(628px,\s*1fr\)/s.test(css) && /\.main-stage\s*\{[^}]*grid-template-columns:\s*minmax\(612px,\s*3fr\) minmax\(300px,\s*1fr\)/s.test(css), "all three states must preserve application, stack and horizontal minima without breakpoint recomposition");
  assert(!/@media[^\{]*\{[\s\S]*?(?:workspace-inspector-stack|main-stage|inspector-state-toggle)/.test(css), "no responsive breakpoint may reorder or replace the three-state composition");
};
