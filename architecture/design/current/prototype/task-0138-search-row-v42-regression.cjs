const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const searchPath = path.join(root, "frontend-source/integration/js/task-0135-sample-search-markers.js");
const columnsPath = path.join(root, "frontend-source/integration/js/task-0138-values-columns.js");
const inspectorPath = path.join(root, "frontend-source/js/ui/zones/inspector/ui.js");
const searchCssPath = path.join(root, "frontend-source/integration/css/task-0135-sample-search-markers.css");
const columnsCssPath = path.join(root, "frontend-source/integration/css/task-0138-values-columns.css");
const providerPath = path.join(root, "mock/mock-provider.js");
const bridgePath = path.join(root, "prototype/task-0138-values-columns-bridge.js");
const evidencePath = path.join(root, "evidence/interaction-regression-v42-sample-search-row.json");
const context = { window: {}, Promise };

vm.runInNewContext(fs.readFileSync(searchPath, "utf8"), context, { filename: searchPath });
vm.runInNewContext(fs.readFileSync(columnsPath, "utf8"), context, { filename: columnsPath });
vm.runInNewContext(fs.readFileSync(providerPath, "utf8"), context, { filename: providerPath });

const search = context.window.SignalSamplesSearchMarkers;
const columns = context.window.SignalSamplesCalculatedColumns;
const inspector = fs.readFileSync(inspectorPath, "utf8");
const searchCss = fs.readFileSync(searchCssPath, "utf8");
const columnsCss = fs.readFileSync(columnsCssPath, "utf8");
const bridge = fs.readFileSync(bridgePath, "utf8");
const results = [];

function assert(condition, detail) { if (!condition) throw new Error(detail); }
function check(id, run) {
  try { results.push({ id, passed: true, detail: run() || null }); }
  catch (error) { results.push({ id, passed: false, error: error.message }); }
}

check("60-enter-only-search", () => {
  assert(search.searchMarkup.submit.event === "keydown" && search.searchMarkup.submit.key === "Enter", "Enter contract missing");
  assert(!search.searchMarkup.action, "standalone action remains in helper");
  assert(!/samples-point-search-action/.test(inspector), "standalone action remains in renderer");
  assert(!/\.samples-point-search-action/.test(searchCss), "standalone action remains in CSS");
  return { submit: "Enter", standalone_action: false };
});

check("61-error-only-feedback", () => {
  const state = { signalId: "signal-radar", total: 1000, token: 0, pending: {} };
  const started = search.begin(state, "500");
  const rows = Array.from({ length: 500 }, (_, index) => ({ sample_index: 250 + index }));
  const applied = search.apply(state, started.request, { signal_id: "signal-radar", start_offset: 250, end_offset: 750, total: 1000, rows });
  assert(applied.accepted && applied.state === "ready" && applied.message === "", "success copy remains");
  assert(search.searchMarkup.status.errorOnly === true && search.searchMarkup.status.role === "alert", "error-only status contract missing");
  assert(!/data-state="success"/.test(searchCss), "success CSS remains");
  return { success_copy: false, compact_error_only: true };
});

check("62-standard-final-three-dot-trigger", () => {
  assert(columns.trigger.className === "inspector-action samples-columns-menu-trigger", "standard action class missing");
  assert(columns.trigger.placement === "final search-row slot", "placement contract missing");
  assert(/class='inspector-action samples-columns-menu-trigger'/.test(inspector), "renderer trigger is not standard");
  assert(/more-vertical\.svg/.test(inspector) && !/width:\s*32px/.test(columnsCss), "trigger duplicates standard geometry");
  assert(/\.samples-point-search-action/.test(bridge) && /:not\(\[data-state='error'\]\)/.test(bridge), "prototype cleanup missing");
  return { trigger: "more-vertical", menu_width: columns.menu.width, standard_action_reused: true };
});

check("63-authoritative-page-offsets", () => {
  return context.window.SignalAnalyserProvider.getState().then((state) => {
    const page = state.samplePage;
    assert(page.start_offset === 0 && page.end_offset === 12 && page.next_cursor === 12 && page.total === 400000, "authoritative offsets missing");
    assert(page.cursor === undefined && page.nextCursor === undefined, "legacy cursor aliases remain");
    assert(/page\.start_offset/.test(inspector) && /page\.end_offset/.test(inspector), "renderer ignores authoritative offsets");
    return { page };
  });
});

Promise.all(results.map(async (result) => {
  if (result.detail && typeof result.detail.then === "function") {
    try { result.detail = await result.detail; }
    catch (error) { result.passed = false; delete result.detail; result.error = error.message; }
  }
})).then(() => {
  const output = {
    design_version: 42,
    method: "bounded source/controller regression; no browser",
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results
  };
  fs.writeFileSync(evidencePath, JSON.stringify(output, null, 2) + "\n");
  process.stdout.write(JSON.stringify(output, null, 2));
  if (output.failed) process.exitCode = 1;
});
