"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function source() {
  return fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/js/app.js"), "utf8");
}

function functionSource(text, name, nextName) {
  const begin = text.indexOf("  function " + name + "(");
  const end = text.indexOf("\n  function " + nextName + "(", begin);
  if (begin < 0 || end < 0) throw new Error("missing function " + name);
  return text.slice(begin, end);
}

function membershipHarness(text) {
  const calls = [];
  const pane = { id:"pane-1", plot_type:"time", signal_bindings:[] };
  const context = {
    model:{
      state:{ signals:[{name:"harmonic"}, {name:"variable"}] }, activePane:"pane-1",
      signalMembershipBusy:false, pendingMainSignal:""
    },
    Object, Array, String, Promise,
    paneById() { return pane; },
    setSignalTableMutationBusy() {}, renderInspector() {}, showToast() {}, safeErrorText() { return "error"; },
    postLayout(payload) { calls.push(payload); return Promise.resolve({}); }
  };
  vm.runInNewContext(
    functionSource(text, "signalNamesInInventoryOrder", "mutate") +
      functionSource(text, "setActivePaneSignalMembership", "setActivePaneMainSignal"),
    context,
    { filename:"public/js/app.js:task0131-membership" },
  );
  return { context, calls, pane };
}

function mainHarness(text) {
  const calls = [];
  const pane = { id:"pane-1", plot_type:"time", signal_bindings:["variable"] };
  const context = {
    model:{
      state:{ signals:[{name:"harmonic"}, {name:"variable"}] }, activePane:"pane-1",
      revision:17, signalMembershipBusy:false, pendingMainSignal:""
    },
    Object, Array, String, Promise,
    paneById() { return pane; }, selectedSignalName() { return "variable"; },
    setSignalTableMutationBusy() {}, syncSignalSamplesWithMain() {}, renderInspector() {},
    showToast() {}, safeErrorText() { return "error"; },
    api:{ view(payload) { calls.push(payload); return Promise.resolve({ state_revision:18 }); } },
    mutate(call) { return call(); }
  };
  vm.runInNewContext(
    functionSource(text, "signalNamesInInventoryOrder", "mutate") +
      functionSource(text, "setActivePaneMainSignal", "focusAreaSettings"),
    context,
    { filename:"public/js/app.js:task0131-main" },
  );
  return { context, calls, pane };
}

module.exports = async function task0131BindingOrderBehavior(assert) {
  const app = source();

  const membership = membershipHarness(app);
  // The user checks variable first; inventory order still has harmonic first.
  await membership.context.setActivePaneSignalMembership("variable", true);
  assert(membership.calls.length === 1, "a checkbox membership click must issue one layout mutation");
  assert(JSON.stringify(membership.calls[0].signal_bindings) === JSON.stringify(["variable"]), "the first checked signal must stay the only binding");
  membership.pane.signal_bindings = ["variable"];
  await membership.context.setActivePaneSignalMembership("harmonic", true);
  assert(JSON.stringify(membership.calls[1].signal_bindings) === JSON.stringify(["harmonic", "variable"]), "checkbox membership must canonicalize a reverse click order to authoritative inventory order before the layout payload");

  const main = mainHarness(app);
  // A plain row click on harmonic is one atomic main/view mutation. It adds
  // harmonic to an already variable-bound pane but preserves inventory order.
  await main.context.setActivePaneMainSignal("harmonic");
  assert(main.calls.length === 1, "plain-row main selection must issue exactly one view mutation");
  assert(main.calls[0].analysis_signal === "harmonic" && main.calls[0].row_selected_signal === "harmonic", "plain-row mutation must retain the requested harmonic main signal");
  assert(JSON.stringify(main.calls[0].visible_signals) === JSON.stringify(["harmonic", "variable"]), "plain-row atomic main payload must canonicalize visible signals independently of prior binding click order");

  const busy = functionSource(app, "setSignalTableMutationBusy", "displayPreviewName");
  const checked = { checked:true, disabled:false };
  const region = { checked };
  const rows = { closest(selector) { return selector === ".signal-table-scroll" ? region : null; } };
  let receivedRegion = null;
  const pinned = { classList:{ remove() {}, add() {} } };
  // The function declaration is exposed on the VM global context.
  const busyContext = {};
  vm.runInNewContext(busy, Object.assign(busyContext, {
    q(selector) { return selector === "[data-signal-rows]" ? rows : null; },
    qa() { return [pinned]; }, CSS:{escape(value) { return value; }},
    setCheckboxRegionBusy(node, isBusy) { receivedRegion = node; node.busy = isBusy; },
  }), { filename:"public/js/app.js:task0131-checkbox-continuity-call" });
  busyContext.setSignalTableMutationBusy(true, "harmonic");
  // The handler must delegate to the persistent table region rather than
  // rebuilding the row/checkbox while the request is pending.
  assert(receivedRegion === region && region.busy === true && checked.checked === true, "pending table state must be delegated to the existing checkbox region without replacing or clearing its checked node");
};
