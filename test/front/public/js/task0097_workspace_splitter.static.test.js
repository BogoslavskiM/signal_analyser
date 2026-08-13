"use strict";

const fs = require("fs");
const path = require("path");

function block(source, name, nextName) {
  const expression = new RegExp("function " + name + "\\([\\s\\S]*?(?=\\n  function " + nextName + "\\(|\\n  document\\.addEventListener)");
  return (source.match(expression) || [""])[0];
}

module.exports = async function testTask0097WorkspaceInspectorSplitterStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const css = read("public/css/app.css");
  const app = read("public/js/app.js");

  assert(/\.app-shell\s*\{[^}]*grid-template-rows:\s*44px\s+minmax\(628px,\s*1fr\)[^}]*gap:\s*8px/s.test(css), "v11 shell must retain the 44px toolbar, outer 8px gap and 628px minimum stack");
  assert(/\.workspace-inspector-stack\s*\{[^}]*--workspace-main-track:\s*calc\(80%\s*-\s*62\.4px\)/s.test(css), "the unset split must distribute only excess height at 4:1 instead of letting the 180px lower minimum consume its fraction");
  assert(/\.workspace-inspector-stack\s*\{[^}]*grid-template-rows:\s*minmax\(440px,\s*var\(--workspace-main-track,\s*4fr\)\)\s+8px\s+minmax\(180px,\s*1fr\)/s.test(css), "workspace stack must start at a 4:1 excess-height ratio with 440px/180px minima");

  const stack = (html.match(/<div class="workspace-inspector-stack"[\s\S]*?<\/div>\s*<\/main>/) || [""])[0];
  assert(/<section class="main-stage"/.test(stack) && /<div class="workspace-inspector-splitter"[^>]*data-testid="workspace-inspector-splitter"[^>]*aria-hidden="true"[^>]*><\/div>\s*<section class="inspector/.test(stack), "the 8px splitter must be an in-flow, aria-hidden sibling between main stage and inspector");
  assert(!/workspace-inspector-splitter[^>]*tabindex|workspace-inspector-splitter[^>]*role=/.test(html), "the pointer-only splitter must not enter the sequential keyboard focus order");
  assert(/\.workspace-inspector-splitter\s*\{[^}]*min-height:\s*8px[^}]*cursor:\s*row-resize[^}]*touch-action:\s*none/s.test(css), "splitter must expose the exact 8px row-resize touch-safe hit target");
  assert(/\.workspace-inspector-splitter::before\s*\{[^}]*height:\s*1px[^}]*background:\s*var\(--line\)/s.test(css), "idle splitter line must be the neutral 1px line");
  assert(/\.workspace-inspector-splitter:hover::before,\s*\.workspace-inspector-splitter\.is-dragging::before\s*\{[^}]*height:\s*2px[^}]*background:\s*var\(--accent\)/s.test(css), "hover and drag states must promote the splitter to a 2px accent line");
  assert(/body\.is-resizing-workspace,\s*body\.is-resizing-workspace \*\s*\{[^}]*cursor:\s*row-resize !important/s.test(css), "dragging must promote the row-resize cursor to the whole document");

  const autoscaleCancel = block(app, "cancelWorkspaceSplitAutoscale", "currentReadyPlotHost");
  const readyHost = block(app, "currentReadyPlotHost", "plotAutorangeUpdate");
  const autorange = block(app, "plotAutorangeUpdate", "queueWorkspaceSplitAutoscale");
  const autoscale = block(app, "queueWorkspaceSplitAutoscale", "stopWorkspaceSplitDrag");
  const start = block(app, "startWorkspaceSplitDrag", "moveWorkspaceSplitDrag");
  const move = block(app, "moveWorkspaceSplitDrag", "renderLayoutTrigger");
  const stop = block(app, "stopWorkspaceSplitDrag", "startWorkspaceSplitDrag");
  const resize = block(app, "retainWorkspaceSplitOnResize", "stopWorkspaceSplitDrag");
  const sizing = block(app, "setWorkspaceSplitHeight", "retainWorkspaceSplitOnResize");
  assert(/event\.button !== 0 \|\| !event\.isPrimary/.test(start) && /setPointerCapture\(event\.pointerId\)/.test(start) && /is-dragging/.test(start), "only the initiating primary pointer may start the drag and must be captured");
  assert(/event\.pointerId !== drag\.pointerId/.test(move) && /event\.preventDefault\(\)/.test(move) && /setWorkspaceSplitHeight\(drag\.startMainHeight \+ event\.clientY - drag\.startY\)/.test(move), "only the captured pointer may move the split using its vertical delta");
  assert(/releasePointerCapture\(drag\.pointerId\)/.test(stop) && /classList\.remove\("is-dragging"\)/.test(stop) && /body\.classList\.remove\("is-resizing-workspace"\)/.test(stop) && /workspaceSplitDrag = null/.test(stop), "every drag end must release capture and clean every temporary state");
  assert(/Math\.max\(440, Math\.min\(maximum, requestedHeight\)\)/.test(sizing) && /workspaceSplitRatio = \(height - 440\) \/ excess/.test(sizing), "drag height must clamp to both minima and retain the resulting ratio");
  assert(/workspaceSplitRatio === null/.test(resize) && /440 \+ model\.workspaceSplitRatio \* \(maximum - 440\)/.test(resize), "window resize must retain the last user ratio without creating a default preference");
  assert(/pointerdown", startWorkspaceSplitDrag[\s\S]*pointermove", moveWorkspaceSplitDrag[\s\S]*pointerup", stopWorkspaceSplitDrag[\s\S]*pointercancel", stopWorkspaceSplitDrag[\s\S]*lostpointercapture", stopWorkspaceSplitDrag/.test(app), "splitter must wire capture, movement and every terminal pointer event");
  assert(/window\.addEventListener\("resize", retainWorkspaceSplitOnResize\)/.test(app), "window resize must use the splitter's retention helper");
  assert(/workspaceSplitAutoscaleFrame:\s*null, workspaceSplitAutoscaleToken:\s*0/.test(app), "v12 must retain a cancellable latest-only autoscale request in model state");
  assert(/workspaceSplitAutoscaleToken \+= 1/.test(autoscaleCancel) && /cancelAnimationFrame\(model\.workspaceSplitAutoscaleFrame\)/.test(autoscaleCancel), "starting a newer drag must invalidate and cancel the queued autoscale pass");
  assert(/event\.type === "pointerup"/.test(stop) && /Math\.abs\([\s\S]*?\) > 0\.5\) queueWorkspaceSplitAutoscale\(\)/.test(stop), "only a meaningful primary drag completion may queue autoscale; moves, cancellation and zero movement must not");
  assert(/cancelWorkspaceSplitAutoscale\(\)/.test(start), "each new primary drag must cancel an obsolete queued pass");
  assert(/requestAnimationFrame\(/.test(autoscale) && /token !== model\.workspaceSplitAutoscaleToken/.test(autoscale), "autoscale must wait for the next animation frame and reject stale queued work");
  assert(/host\.dataset\.plotReady !== "true"/.test(readyHost) && /host\.isConnected/.test(readyHost) && /host\.offsetParent === null/.test(readyHost) && /rect\.width > 0 && rect\.height > 0/.test(readyHost), "autoscale must target only connected, ready, visible nonzero plot hosts");
  assert(/host\.dataset\.paneHost/.test(readyHost) && /String\(displayId\) \+ "::"/.test(readyHost), "autoscale must keep to the current active display's pane hosts");
  assert(/\{ autosize:true \}/.test(autorange) && /\^\[xy\]axis/.test(autorange) && /\[key \+ "\.autorange"\] = true/.test(autorange), "each live x/y axis must receive autorange together with Plotly autosize");
  assert(/Plotly\.relayout\(host, update\)/.test(autoscale) && /forEach\(function \(host\)/.test(autoscale) && /catch\(function \(\) \{ \/\* A single host must not block/.test(autoscale), "a relayout failure for one host must remain isolated from every other host");
  assert(!/localStorage|sessionStorage|fetch\(|api\.|output\(|Plotly\.(?:react|newPlot)|renderInspector|focus\(|showToast/.test([autoscaleCancel, readyHost, autorange, autoscale, start, move, stop, resize, sizing].join("\n")), "splitter autoscale must not persist, call APIs, render plots/tables, focus controls or show a toast");
};
