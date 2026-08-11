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
  assert(/\.workspace-inspector-stack\s*\{[^}]*grid-template-rows:\s*minmax\(440px,\s*var\(--workspace-main-track,\s*4fr\)\)\s+8px\s+minmax\(180px,\s*1fr\)/s.test(css), "workspace stack must start at a 4:1 excess-height ratio with 440px/180px minima");

  const stack = (html.match(/<div class="workspace-inspector-stack"[\s\S]*?<\/div>\s*<\/main>/) || [""])[0];
  assert(/<section class="main-stage"/.test(stack) && /<div class="workspace-inspector-splitter"[^>]*data-testid="workspace-inspector-splitter"[^>]*aria-hidden="true"[^>]*><\/div>\s*<section class="inspector/.test(stack), "the 8px splitter must be an in-flow, aria-hidden sibling between main stage and inspector");
  assert(!/workspace-inspector-splitter[^>]*tabindex|workspace-inspector-splitter[^>]*role=/.test(html), "the pointer-only splitter must not enter the sequential keyboard focus order");
  assert(/\.workspace-inspector-splitter\s*\{[^}]*min-height:\s*8px[^}]*cursor:\s*row-resize[^}]*touch-action:\s*none/s.test(css), "splitter must expose the exact 8px row-resize touch-safe hit target");
  assert(/\.workspace-inspector-splitter::before\s*\{[^}]*height:\s*1px[^}]*background:\s*var\(--line\)/s.test(css), "idle splitter line must be the neutral 1px line");
  assert(/\.workspace-inspector-splitter:hover::before,\s*\.workspace-inspector-splitter\.is-dragging::before\s*\{[^}]*height:\s*2px[^}]*background:\s*var\(--accent\)/s.test(css), "hover and drag states must promote the splitter to a 2px accent line");
  assert(/body\.is-resizing-workspace,\s*body\.is-resizing-workspace \*\s*\{[^}]*cursor:\s*row-resize !important/s.test(css), "dragging must promote the row-resize cursor to the whole document");

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
  assert(!/localStorage|sessionStorage|fetch\(|api\.|output\(|Plotly/.test([start, move, stop, resize, sizing].join("\n")), "splitter interaction must not persist, call an API, request output or render Plotly");
};
