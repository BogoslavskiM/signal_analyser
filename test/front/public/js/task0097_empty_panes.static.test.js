"use strict";

const fs = require("fs");
const path = require("path");

function block(source, name, nextName) {
  const expression = new RegExp("function " + name + "\\([\\s\\S]*?(?=\\n  function " + nextName + "\\(|\\n  document\\.addEventListener)");
  return (source.match(expression) || [""])[0];
}

module.exports = async function testTask0097EmptyPaneStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const markup = block(app, "outputMarkup", "createPaneNode");
  const reconcileOutput = block(app, "reconcilePaneOutput", "reconcilePaneNode");
  const paneSignals = block(app, "paneHasSignals", "stopPaneOutput");
  const stopOutput = block(app, "stopPaneOutput", "output");
  const output = block(app, "output", "fetchPaneOutput");
  const fetchOutput = block(app, "fetchPaneOutput", "refreshSnapshot");
  const renderGrid = block(app, "renderGrid", "renderActivePaneContext");
  const autoscale = block(app, "queueWorkspaceSplitAutoscale", "stopWorkspaceSplitDrag");
  const visibleChange = (app.match(/document\.addEventListener\("change", function \(event\) \{[\s\S]*?\n  \}\);/) || [""])[0];

  assert(/if \(!pane\.signal_bindings \|\| !pane\.signal_bindings\.length\) return/.test(markup), "an empty pane must take its placeholder branch before loader, error, or plot-host markup");
  assert(/data-testid='pane-empty-/.test(markup) && /Выберете сигнал для отображения/.test(markup), "the empty pane must show the exact requested signal-selection copy");
  assert(/plot-chart/.test(markup) && /plot-initial-loading/.test(markup) && /plot-error/.test(markup), "the empty early branch must be distinct from the existing chart, loader, and error branches");
  assert(/function paneHasSignals\(pane\).*signal_bindings.*length/.test(paneSignals), "empty classification must be based only on the pane bindings");
  assert(/delete model\.plotQueue\[runtimeKey\]/.test(stopOutput) && /delete model\.outputs\[runtimeKey\]/.test(stopOutput), "clearing an empty pane must cancel its queued client output and forget stale output state");
  assert(/if \(paneHasSignals\(pane\)\) fetchPaneOutput[\s\S]*else stopPaneOutput/.test(output), "normal output refresh must not request an API output for an empty pane");
  assert(/if \(!paneHasSignals\(pane\)\) \{ stopPaneOutput\(displayId, paneId\); return; \}/.test(fetchOutput), "direct stale fetch attempts for an empty pane must stop locally before api.activeOutput");
  assert(/api\.activeOutput/.test(fetchOutput), "bound panes must retain their normal active-output API call");
  assert(!/Plotly\.(?:react|relayout|newPlot)|loadPlotly\(|api\./.test(markup), "empty markup must not load Plotly or request any API");
  assert(/canvas\.innerHTML = outputMarkup\(displayId, pane, record\)/.test(reconcileOutput) && /reconcilePaneNode\(node, display\.id, pane, index, model\.outputs\[runtimeKey\]\)/.test(renderGrid) && /record && record\.output && record\.output\.isready && record\.output\.success && hasPlotData\(record\.output\.data\)/.test(renderGrid), "grid reconciliation must retain the empty markup branch, while Plotly enqueueing remains gated on a successful nonempty output record");
  assert(/\.plot-chart\[data-pane-host\]\[data-plot-ready='true'\]/.test(autoscale), "splitter autoscale must only visit rendered ready plot hosts, excluding empty placeholders");
  assert(/node\.dataset\.visibleSignal/.test(visibleChange) && /activePane = paneById\(model\.activePane\)/.test(visibleChange) && /postLayout\(\{ operation:"update_pane", pane_id:activePane\.id/.test(visibleChange), "signal selection must bind only the current active pane");
  assert(/\.plot-empty\s*\{[\s\S]*?display:\s*grid[\s\S]*?place-items:\s*center/s.test(css), "the empty-state text must remain centered in the pane surface");
};
