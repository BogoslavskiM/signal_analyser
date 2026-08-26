const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const helperSource = path.join(root, "frontend-source/integration/js/task-0135-sample-search-markers.js");
const windowSource = path.join(root, "frontend-source/integration/js/task-0134-sample-row-window.js");
const cssSource = path.join(root, "frontend-source/integration/css/task-0135-sample-search-markers.css");
const evidence = path.join(root, "evidence/interaction-regression-v40-sample-search-markers.json");
const context = { window:{} };
vm.runInNewContext(fs.readFileSync(windowSource, "utf8"), context, { filename:windowSource });
vm.runInNewContext(fs.readFileSync(helperSource, "utf8"), context, { filename:helperSource });
const helper = context.window.SignalSamplesSearchMarkers;
const rowWindow = context.window.SignalSamplesRowWindow;
const results = [];
const total = 100000001;

function assert(condition, detail) { if (!condition) throw new Error(detail); }
function check(id, run) {
  try { results.push({ id, passed:true, detail:run() || null }); }
  catch (error) { results.push({ id, passed:false, error:error.message }); }
}
function page(request) {
  const end=Math.min(request.startOffset + request.limit, total);
  return {
    signal_id:request.signalId,
    start_offset:request.startOffset,
    end_offset:end,
    total,
    rows:Array.from({ length:end - request.startOffset }, (_, i) => ({ sample_index:request.startOffset + i }))
  };
}

check("55-exact-server-point-search", () => {
  assert(helper.PAGE_SIZE === 500 && helper.CENTER_BEFORE === 250, "constants");
  assert(helper.centeredStart(0, total) === 0, "lower clamp");
  assert(helper.centeredStart(1000, total) === 750, "centered start");
  assert(helper.centeredStart(total - 1, total) === total - 500, "upper clamp");
  assert(helper.intent("-1", total).valid === false, "negative accepted");
  assert(helper.intent("1.5", total).valid === false, "decimal accepted");
  assert(helper.intent(String(total), total).message === "Доступны номера от 0 до 100000000.", "range status");
  assert(helper.intent("", total).kind === "reset", "empty explicit reset");

  const state=rowWindow.create("signal-radar", 3);
  state.total=total;
  state.pending.down="obsolete";
  const started=helper.begin(state, "1000");
  assert(started.accepted && started.request.startOffset === 750 && started.request.limit === 500, "request");
  assert(state.token === 4 && state.pending.down === null, "token invalidation");
  const applied=helper.apply(state, started.request, page(started.request));
  assert(applied.accepted && state.startOffset === 750 && state.endOffset === 1250 && state.rows.length === 500, "replace window");
  assert(applied.rowSelector === "tr[data-sample-index=\"1000\"]" && applied.scroll === "focus-and-center", "focus target");
  const sliding=rowWindow.begin(state, "down");
  assert(sliding && sliding.startOffset === 1250, "sliding resumes");

  const staleState=rowWindow.create("signal-radar", 10);
  staleState.total=total;
  assert(helper.apply(staleState, started.request, page(started.request)).reason === "stale-token", "stale guard");
  assert(helper.searchMarkup.input.placeholder === "Введите номер точки", "placeholder");
  assert(/Clearing input alone does not request/.test(helper.clearingRule), "clear rule");
  return { formula:"clamp(target-250, 0, total-500)", request:{ start_offset:750, limit:500 }, replaced_range:"751–1250", target:1000, clear:"no request until explicit Enter/action; empty submit resets 1–500" };
});

check("56-time-extrema-marker-projection", () => {
  const record={
    calculated:true,
    pending:false,
    error:"",
    displayId:"display-1",
    paneId:"pane-time",
    data:{ rows:[
      { signal_name:"radarPulse", sample_index:1000, type:"minimum", graph_number:5, signal_color:"#2563eb" },
      { signal_name:"radarPulse", sample_index:1000, type:"maximum", graph_number:2, signal_color:"#dc2626" },
      { signal_name:"radarPulse", sample_index:1000, type:"minimum", graph_number:2, signal_color:"#16a34a" },
      { signal_name:"other", sample_index:1001, type:"maximum", graph_number:1, signal_color:"#9333ea" },
      { signal_name:"radarPulse", type:"maximum", graph_number:1, signal_color:"#9333ea" }
    ] }
  };
  const active={ plotType:"time", signalId:"signal-radar", signalName:"radarPulse", displayId:"display-1", paneId:"pane-time", record };
  const markers=helper.markerMap(active);
  assert(markers[1000].graphNumber === 2 && markers[1000].type === "maximum" && markers[1000].color === "#dc2626", "deterministic winner");
  assert(Object.keys(helper.markerMap({ ...active, plotType:"spectrum" })).length === 0, "spectrum mapping");
  assert(Object.keys(helper.markerMap({ ...active, signalName:"other" })).length === 1 && helper.markerMap({ ...active, signalName:"other" })[1001], "row signal filter");
  assert(Object.keys(helper.markerMap({ ...active, paneId:"other-pane" })).length === 0, "active pane guard");
  const css=fs.readFileSync(cssSource, "utf8");
  assert(/width:\s*1%/.test(css) && /min-width:\s*112px/.test(css), "first column width");
  assert(/\.extrema-table-marker/.test(css), "canonical marker class");
  return { eligibility:"successful calculated TIME record + exact active display/pane + row signal_name match + sample_index", signal_match:"optional production signalNameMatches callback; exact-name fallback", color:"row.signal_color", multiple:"lowest finite graph_number; provider response order breaks ties", spectrum_bins:"never projected", point_cell_order:"number then marker", first_column:{ preferred:"1%", min_px:112 } };
});

const output={ design_version:40, source:[path.relative(root, helperSource), path.relative(root, cssSource)], passed:results.filter(r => r.passed).length, failed:results.filter(r => !r.passed).length, results };
fs.writeFileSync(evidence, JSON.stringify(output, null, 2) + "\n");
process.stdout.write(JSON.stringify(output, null, 2));
if (output.failed) process.exitCode=1;
