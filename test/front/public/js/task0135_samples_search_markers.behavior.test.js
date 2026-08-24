"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function source() {
  return fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/js/app.js"), "utf8");
}

function helper(text) {
  const begin = text.indexOf("(function registerSignalSamplesSearchMarkers(window) {");
  const end = text.indexOf("}(window));", begin);
  if (begin < 0 || end < 0) throw new Error("SignalSamplesSearchMarkers seam is missing");
  const window = {};
  vm.runInNewContext(text.slice(begin, end + "}(window));".length), { window, Number, String, Array, Math }, { filename: "app.js:task0135-search" });
  return window.SignalSamplesSearchMarkers;
}

function rows(start, count) {
  return Array.from({ length: count }, (_unused, index) => ({ sample_index: start + index }));
}

function page(signalId, start, count, total) {
  return { signal: { id: signalId }, start_offset: start, end_offset: start + count, rows: rows(start, count), total };
}

module.exports = async function task0135SamplesSearchMarkers(assert) {
  const app = source();
  const css = fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/css/app.css"), "utf8");
  const search = helper(app);

  // Search is server-paged, zero-based, and exact: malformed/out-of-range
  // input has a visible typed error before any request can be constructed.
  assert(search.PAGE_SIZE === 500 && search.CENTER_BEFORE === 250, "point search must use exact 500-row pages centered 250 rows before target");
  assert(search.intent("0", 1000).valid && search.intent("0", 1000).startOffset === 0, "point number zero must be a valid first sample");
  ["-1", "1.5", "1e2", "text"].forEach((value) => assert(!search.intent(value, 1000).valid, "only exact nonnegative integer point numbers are valid: " + value));
  assert(!search.intent("1000", 1000).valid && /0 до 999/.test(search.intent("1000", 1000).message), "out-of-range point must return a visible zero-based range error");
  assert(search.intent("", 1000).kind === "reset" && search.intent("", 1000).startOffset === 0, "an explicit empty search must reset to the first page");
  assert(search.centeredStart(250, 100000) === 0 && search.centeredStart(99999, 100000) === 99500 && search.centeredStart(9, 100) === 0, "centered target cursor must clamp at first, last, and sub-page ranges");

  const state = { signalId: "sig", token: 8, rows: rows(500, 500), startOffset: 500, endOffset: 1000, total: 100000, firstBatchLoaded: true, pending: { up: "old", down: "old", search: null }, error: "old" };
  const started = search.begin(state, "750");
  assert(started.accepted && started.request.startOffset === 500 && started.request.limit === 500 && state.token === 9 && !state.pending.up && !state.pending.down && state.pending.search, "accepted search must invalidate old window requests and request the centered 500-row replacement");
  const accepted = search.apply(state, started.request, page("sig", 500, 500, 100000));
  assert(accepted.accepted && state.rows.length === 500 && state.startOffset === 500 && accepted.rowSelector === 'tr[data-sample-index="750"]' && accepted.scroll === "focus-and-center", "accepted search must replace rows and expose focus/center target, not append a full payload");

  const staleState = { signalId: "sig", token: 2, rows: [], startOffset: 0, endOffset: 0, total: 1000, pending: {} };
  const staleStart = search.begin(staleState, "20");
  staleState.token += 1;
  assert(search.apply(staleState, staleStart.request, page("sig", 0, 500, 1000)).reason === "stale-token", "ordinary page responses after a search-token change must be ignored");
  const wrong = { signalId: "sig", token: 4, rows: [], startOffset: 0, endOffset: 0, total: 1000, pending: {} };
  const wrongStart = search.begin(wrong, "2");
  assert(search.apply(wrong, wrongStart.request, page("other", 0, 500, 1000)).reason === "signal-mismatch", "wrong stable-id search response must not replace the signal window");

  // The real UI uses both Enter and the compact action; editing/clearing alone
  // preserves DOM input state without rerender or request.
  assert(/button\.dataset\.testid === "sample-point-search-action"[\s\S]*?submitSignalSamplesSearch\(/.test(app) && /event\.key !== "Enter"[\s\S]*?sample-point-search-input[\s\S]*?submitSignalSamplesSearch\(event\.target\.value\)/.test(app), "point search must be callable from both the action and Enter");
  assert(/searchDisabled=searchLoading \|\| !state\.firstBatchLoaded[\s\S]*?\(searchDisabled \? " disabled" : ""\)[\s\S]*?\(searchDisabled \? " disabled" : ""\)/.test(app), "point input and action must remain disabled before authoritative first page/total, then stay enabled during ordinary window pagination");
  const inputHandler = (app.match(/document\.addEventListener\("input", function \(event\) \{ if \(!event\.target \|\| event\.target\.dataset\.testid !== "sample-point-search-input"\)[\s\S]*?\n  \}\);/) || [""])[0];
  assert(/state\.searchValue=event\.target\.value[\s\S]*?status\.textContent=""/.test(inputHandler) && !/renderInspector\(/.test(inputHandler) && !/api\.signalSamples/.test(inputHandler), "typing or clearing search must preserve the input node and make no request until explicit Enter/action");
  assert(/if \(!started\.accepted\)[\s\S]*?renderInspector\(\)[\s\S]*?input\.focus\(\)/.test(app), "invalid/out-of-range search must visibly report its error and restore input focus without API work");

  // Existing v39 window pagination remains intact after a search replacement.
  assert(/requestLimit=request\.direction === "up" \? Math\.min\(request\.limit, state\.startOffset - request\.startOffset\) : request\.limit/.test(app) && /api\.signalSamples\(request\.signalId, request\.startOffset, requestLimit\)/.test(app), "ordinary pagination must continue using bounded 500-row cursor requests after a search");

  const base = { calculated: true, pending: false, error: "", displayId: "display-1", paneId: "pane-1", data: { rows: [
    { signal_name: "main", sample_index: 4, type: "maximum", graph_number: 4, signal_color: "#d00" },
    { signal_name: "main", sample_index: 4, type: "minimum", graph_number: 2, signal_color: "#0d0" },
    { signal_name: "other", sample_index: 8, type: "maximum", graph_number: 1, signal_color: "#00d" }
  ] } };
  const options = { record: base, signalId: "main-id", signalName: "main", plotType: "time", displayId: "display-1", paneId: "pane-1", signalMatches: (candidate, expected) => candidate === expected };
  const markers = search.markerMap(options);
  assert(markers[4].graphNumber === 2 && markers[4].type === "minimum" && markers[4].color === "#0d0" && !markers[8], "TIME marker map must keep only active same-signal extrema, resolve duplicate sample index by lowest graph number, and retain row color/type");
  assert(Object.keys(search.markerMap(Object.assign({}, options, { plotType: "spectrum" }))).length === 0 && Object.keys(search.markerMap(Object.assign({}, options, { record: Object.assign({}, base, { paneId: "other" }) }))).length === 0, "spectrum, wrong pane/display, pending, or failed extrema records must never project markers");
  assert(!/calculatePeaks|api\.peaks/.test((app.match(/function renderSignalSamplesInspector\(body\)[\s\S]*?\n  \}/) || [""])[0]), "rendering sample markers must not trigger extrema calculation");

  assert(/body\.classList\.toggle\("is-table-only", model\.inspectorPage === "peaks"\)/.test(app), "Samples must not collapse into the Peaks-only table layout");
  assert(/\.inspector-body\[data-testid="inspector-pane-samples"\][\s\S]*?grid-template-rows:\s*32px minmax\(0,\s*1fr\)/.test(css) && /\.samples-point-search-row[\s\S]*?min-height:\s*32px/.test(css), "Samples needs a 32px search row followed by the scroll table");
  assert(/\.sample-table \{ table-layout: auto; \}/.test(css) && /min-width:\s*112px[\s\S]*?text-align:\s*left/.test(css), "point column must be compact auto-layout, left-aligned, and retain a 112px minimum");
  assert(/<th>№ точки<\/th><th>Время<\/th><th>Значение<\/th><th>Модуль<\/th><th>Квадрат<\/th>/.test(app) && /sample-point-cell-number[\s\S]*?markerMarkup/.test(app), "the established five-column table must put point number first, left of its marker");
};
