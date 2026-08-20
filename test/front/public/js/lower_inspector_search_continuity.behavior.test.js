"use strict";

const fs = require("fs");
const path = require("path");

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return "";
  const brace = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") { quote = character; continue; }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  return "";
}

function compile(source, name, names, values) {
  return Function(...names, `"use strict"; ${source}; return ${name};`)(...values);
}

function inputNode(testid) {
  return { dataset:{ testid }, value:"", selectionStart:0, selectionEnd:0 };
}

module.exports = async function testLowerInspectorSearchContinuity(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const signalSource = functionSource(app, "renderInspector");
  const measurementSource = functionSource(app, "renderMeasurementsInspector");

  assert(/if \(!signalSearchInput \|\| !body\.querySelector\("\[data-signal-rows\]"\) \|\| !body\.querySelector\("\[data-table-head\]"\)\) \{[\s\S]*?body\.innerHTML\s*=/.test(signalSource), "Signals may build the lower surface only when its stable input/table nodes are absent");
  assert(/else if \(document\.activeElement !== signalSearchInput && signalSearchInput\.value !== model\.inspectorSearch\)/.test(signalSource), "Signals must never overwrite the value/caret of the focused search input");
  assert(/if \(!measurementSearchInput \|\| !host\) \{[\s\S]*?body\.innerHTML\s*=/.test(measurementSource), "Measurements may build the lower surface only when its stable input/table host is absent");
  assert(/else if \(document\.activeElement !== measurementSearchInput && measurementSearchInput\.value !== model\.measurementSearch\)/.test(measurementSource), "Measurements must never overwrite the value/caret of the focused search input");
  assert(/event\.target\.dataset\.testid === "signal-search-input"[\s\S]*?model\.inspectorSearch=event\.target\.value; renderInspector\(\)/.test(app), "every Signals input event must update the authoritative query before rendering filtered rows");
  assert(/event\.target\.dataset\.testid === "measurement-search-input"[\s\S]*?model\.measurementSearch=event\.target\.value; renderInspector\(\)/.test(app), "every Measurements input event must update the authoritative query before rendering filtered rows");

  const document = { activeElement:null };
  const signalInput = inputNode("signal-search-input");
  const signalRows = { innerHTML:"" };
  const signalHead = { innerHTML:"" };
  const signalEmpty = { hidden:false };
  let signalSurfaceBuilds = 0;
  const signalBody = {
    dataset:{}, classList:{ toggle() {} }, setAttribute() {},
    querySelector(selector) {
      if (selector.includes("signal-search-input")) return signalSurfaceBuilds ? signalInput : null;
      if (selector.includes("data-signal-rows")) return signalSurfaceBuilds ? signalRows : null;
      if (selector.includes("data-table-head")) return signalSurfaceBuilds ? signalHead : null;
      return null;
    },
    set innerHTML(value) { signalSurfaceBuilds += 1; this.markup = value; },
    get innerHTML() { return this.markup || ""; }
  };
  const signalModel = {
    inspectorPage:"signals", inspectorSearch:"", activePane:"pane-1",
    visibleColumns:{ color:true, sample_rate:true, sample_count:true, duration:true, data_type:true },
    state:{ signals:[{ name:"Гармонический сигнал", color:"#1686c3" }, { name:"Белый шум", color:"#999999" }] }
  };
  const signalQ = (selector) => {
    if (selector === "[data-inspector-content]") return signalBody;
    if (selector === "[data-testid='signal-rows']") return signalRows;
    if (selector === "[data-table-head]") return signalHead;
    if (selector === "[data-testid='signal-search-empty']") return signalEmpty;
    return null;
  };
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, "");
  const renderSignals = compile(signalSource, "renderInspector",
    ["q", "qa", "model", "document", "paneById", "esc", "renderMeasurementsInspector", "renderPeaksInspector", "reconcileContextTabs", "contextTabAvailable", "peaksSurfaceActive", "stopPeaksPolling", "setSignalTableMutationBusy", "decorateNoHistory", "signalColor"],
    [signalQ, () => [], signalModel, document, () => ({ plot_type:"time", signal_bindings:[] }), esc, () => {}, () => {}, () => false, () => true, () => false, () => {}, () => {}, () => {}, (signal) => signal.color]);
  renderSignals();
  document.activeElement = signalInput;
  const signalIdentity = signalInput;
  for (let length = 1; length <= "гармонический".length; length += 1) {
    const query = "гармонический".slice(0, length);
    signalInput.value = query;
    signalInput.selectionStart = signalInput.selectionEnd = query.length;
    signalModel.inspectorSearch = signalInput.value;
    renderSignals();
    assert(signalBody.querySelector("[data-testid='signal-search-input']") === signalIdentity && document.activeElement === signalIdentity, `Signals input identity/focus must survive character ${length}`);
    assert(signalInput.selectionStart === query.length && signalInput.selectionEnd === query.length, `Signals caret must survive character ${length}`);
    assert(signalModel.inspectorSearch === query && /Гармонический сигнал/.test(signalRows.innerHTML) && !/Белый шум/.test(signalRows.innerHTML), `Signals query and rows must update at character ${length}`);
  }
  assert(signalSurfaceBuilds === 1, "Signals body.innerHTML must not rebuild after the initial lower surface");

  const measurementInput = inputNode("measurement-search-input");
  const measurementHost = { innerHTML:"" };
  let measurementSurfaceBuilds = 0;
  const measurementBody = {
    querySelector(selector) {
      if (selector.includes("measurement-search-input")) return measurementSurfaceBuilds ? measurementInput : null;
      if (selector.includes("measurement-table-scroll")) return measurementSurfaceBuilds ? measurementHost : null;
      return null;
    },
    set innerHTML(value) { measurementSurfaceBuilds += 1; this.markup = value; },
    get innerHTML() { return this.markup || ""; }
  };
  const display = { id:"display-1", measurement_kinds:[], time_limits:{ min_s:0, max_s:1 } };
  const pane = { id:"pane-1" };
  const measurementModel = {
    activePane:"pane-1", measurementSearch:"", state:{ signals:[{ name:"Гармонический сигнал", color:"#1686c3" }, { name:"Белый шум", color:"#999999" }] },
    measurementsRecord:{ displayId:"display-1", paneId:"pane-1", measurementRows:[{ signal_name:"Гармонический сигнал", items:[] }, { signal_name:"Белый шум", items:[] }] }
  };
  const renderMeasurements = compile(measurementSource, "renderMeasurementsInspector",
    ["activeDisplay", "paneById", "model", "q", "document", "esc", "measurementValue", "signalColor"],
    [() => display, () => pane, measurementModel, () => null, document, esc, (item, key) => item && item[key] != null ? String(item[key]) : "—", (signal) => signal.color]);
  renderMeasurements(measurementBody);
  document.activeElement = measurementInput;
  const measurementIdentity = measurementInput;
  for (let length = 1; length <= "гармонический".length; length += 1) {
    const query = "гармонический".slice(0, length);
    measurementInput.value = query;
    measurementInput.selectionStart = measurementInput.selectionEnd = query.length;
    measurementModel.measurementSearch = measurementInput.value;
    renderMeasurements(measurementBody);
    assert(measurementBody.querySelector("[data-testid='measurement-search-input']") === measurementIdentity && document.activeElement === measurementIdentity, `Measurements input identity/focus must survive character ${length}`);
    assert(measurementInput.selectionStart === query.length && measurementInput.selectionEnd === query.length, `Measurements caret must survive character ${length}`);
    assert(measurementModel.measurementSearch === query && /Гармонический сигнал/.test(measurementHost.innerHTML) && !/Белый шум/.test(measurementHost.innerHTML), `Measurements query and rows must update at character ${length}`);
  }
  assert(measurementSurfaceBuilds === 1, "Measurements body.innerHTML must not rebuild after the initial lower surface");

  assert(/\.inspector-search-field:focus-within\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--accent\)/.test(css) && !/\.inspector-search-row:focus-within/.test(css), "the lower search focus ring must exclude sibling action buttons");
  assert(/\.search-icon::before\s*\{/.test(css) && /\.search-icon::after\s*\{/.test(css), "the custom lower search icon must remain visible");
  assert(/\.inspector-body \.inspector-search-field input\[type="search"\]::-(?:webkit-search-cancel-button|webkit-search-decoration)[\s\S]*?display:\s*none/.test(css), "native WebKit search cancel/decoration controls must be hidden only inside the lower inspector");
  assert(/\.inspector-body \.inspector-search-field input\[type="search"\]::-ms-clear,[\s\S]*?::-ms-reveal\s*\{[^}]*display:\s*none[^}]*width:\s*0[^}]*height:\s*0/.test(css), "native MS clear/reveal controls must be hidden only inside the lower inspector");
  assert(!/(?:^|\n)\s*(?:input|input\[type="search"\])::-(?:webkit-search-cancel-button|ms-clear)/.test(css), "native search controls must not be globally disabled outside the lower inspector");
};
