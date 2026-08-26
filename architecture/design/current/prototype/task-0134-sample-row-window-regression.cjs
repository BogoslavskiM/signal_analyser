const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "frontend-source/integration/js/task-0134-sample-row-window.js");
const evidence = path.join(root, "evidence/interaction-regression-v39-sample-row-window.json");
const context = { window:{} };
vm.runInNewContext(fs.readFileSync(source, "utf8"), context, { filename:source });
const controller = context.window.SignalSamplesRowWindow;
const total = 100000001;
const results = [];

function assert(condition, detail) { if (!condition) throw new Error(detail); }
function page(start, signalId = "signal-radar") {
  const end = Math.min(start + controller.API_BATCH_SIZE, total);
  return {
    signal_id:signalId,
    start_offset:start,
    end_offset:end,
    total,
    rows:Array.from({ length:end - start }, (_, index) => ({ sample_index:start + index }))
  };
}
function applyDirection(state, direction) {
  const request=controller.begin(state, direction);
  assert(request, "request absent: " + direction);
  const result=controller.apply(state, request, page(request.startOffset));
  assert(result.accepted, JSON.stringify(result));
  return result;
}
function check(id, run) {
  try { results.push({ id, passed:true, detail:run() || null }); }
  catch (error) { results.push({ id, passed:false, error:error.message }); }
}

check("54-sample-window-constants-and-bidirectional-sliding", () => {
  assert(controller.API_BATCH_SIZE === 500, "batch");
  assert(controller.MAX_DOM_ROWS === 1000, "DOM cap");
  assert(controller.PREFETCH_THRESHOLD_ROWS === 100, "prefetch threshold");
  const state=controller.create("signal-radar", 9);
  const first=applyDirection(state, "down");
  const second=applyDirection(state, "down");
  const third=applyDirection(state, "down");
  assert(first.footer === "1–500 из 100000001", first.footer);
  assert(second.footer === "1–1000 из 100000001", second.footer);
  assert(third.footer === "501–1500 из 100000001", third.footer);
  assert(third.scrollDeltaRows === -500 && controller.scrollCompensation(third, 32) === -16000, "down compensation");
  assert(state.rows.length === 1000 && state.startOffset === 500 && state.endOffset === 1500, "down window");
  assert(controller.prefetchDirections(state, 100, 120).includes("up"), "up threshold");
  const up=applyDirection(state, "up");
  assert(up.footer === "1–1000 из 100000001", up.footer);
  assert(up.scrollDeltaRows === 500 && controller.scrollCompensation(up, 32) === 16000, "up compensation");
  assert(state.rows.length === 1000 && state.startOffset === 0 && state.endOffset === 1000, "up window");
  assert(controller.prefetchDirections(state, 850, 899).includes("down"), "down threshold");

  const request=controller.begin(state, "down");
  assert(request && controller.begin(state, "down") === null, "duplicate down request");
  const fresh=controller.create("signal-radar", 10);
  assert(controller.apply(fresh, request, page(request.startOffset)).reason === "stale-token", "token guard");
  assert(controller.apply(state, request, page(request.startOffset, "other-signal")).reason === "signal-mismatch", "signal guard");

  return {
    constants:{ api_batch:500, max_dom_rows:1000, prefetch_threshold_rows:100 },
    ranges:[first.footer, second.footer, third.footer, up.footer],
    scroll_compensation_px_at_32px_row:[-16000, 16000],
    authoritative_offsets:{ start:state.startOffset, end:state.endOffset, convention:"zero-based half-open; footer is one-based inclusive" },
    total,
    guards:["stable signal", "stable token", "duplicate direction"]
  };
});

const output = {
  design_version:39,
  source:"frontend-source/integration/js/task-0134-sample-row-window.js",
  passed:results.filter(item => item.passed).length,
  failed:results.filter(item => !item.passed).length,
  results
};
fs.writeFileSync(evidence, JSON.stringify(output, null, 2) + "\n");
process.stdout.write(JSON.stringify(output, null, 2));
if (output.failed) process.exitCode=1;
