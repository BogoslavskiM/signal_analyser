"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadApplyComponent(options) {
  let component;
  const shell = { dataset: {} };
  const window = {
    Vue: { createApp(config) { component = config; return { mount() {} }; } },
    SignalAnalyserApi: { applySettings: options.applySettings },
    SignalAnalyserModules: { settings: options.settings, output: options.output },
  };
  const document = {
    getElementById() { return {}; },
    querySelector() { return shell; },
    addEventListener() {},
  };
  const source = fs.readFileSync(path.resolve(__dirname, "../../../../public/js/components/explicit-apply.js"), "utf8");
  vm.runInNewContext(source, { window, document, Promise, Error, setTimeout, clearTimeout });
  const state = Object.assign(component.data(), component.methods);
  // Vue exposes computed members through its component proxy.  Mirror that
  // essential behavior in this VM harness so `apply` exercises the same
  // disabled-state guard as production rather than an object missing `disabled`.
  Object.keys(component.computed || {}).forEach((name) => {
    if (Object.prototype.hasOwnProperty.call(state, name)) return;
    Object.defineProperty(state, name, {
      enumerable: true,
      get() { return component.computed[name].call(state); },
    });
  });
  return { component, state, shell };
}

module.exports = async function explicitApplyBehavior(assert) {
  const calls = [];
  const settings = {
    flushForApply() { calls.push("flush"); return Promise.resolve(); },
    getState() { return { displayId: "display-1", revision: 7, invalid: false }; },
  };
  const output = { refreshAfterApply(revision) { calls.push(["output", revision]); } };
  const accepted = loadApplyComponent({
    settings,
    output,
    applySettings(payload) { calls.push(["apply", payload]); return Promise.resolve({ success: true, state_revision: 8 }); },
  });
  accepted.state.setContext({ displayId: "display-1", revision: 7 });
  accepted.state.receiveDraft({ displayId: "display-1", revision: 7, dirty: true, invalid: false });
  accepted.state.apply();
  assert(accepted.state.phase === "applying" && accepted.shell.dataset.applyBusy === "true", "Apply must enter busy applying before its flush resolves");
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert(JSON.stringify(calls) === JSON.stringify(["flush", ["apply", { state_revision: 7, display_id: "display-1" }], ["output", 8]]), "Apply must flush first, send only revision/display_id, then refresh only after accepted response");
  assert(accepted.state.phase === "pending" && accepted.state.dirty === false && accepted.state.revision === 8, "accepted Apply must become pending without a fake ready state");

  const semantic = loadApplyComponent({
    settings,
    output,
    applySettings() { return Promise.resolve({ success: false, error: "spectrum.leakage: invalid" }); },
  });
  semantic.state.setContext({ displayId: "display-1", revision: 7 });
  semantic.state.receiveDraft({ displayId: "display-1", revision: 7, dirty: true, invalid: false });
  semantic.state.apply();
  await new Promise((resolve) => setImmediate(resolve));
  assert(semantic.state.phase === "error" && semantic.state.dirty === true && semantic.shell.dataset.applyBusy === "false", "semantic rejection must preserve retryable draft and release busy state");

  const stale = loadApplyComponent({
    settings,
    output,
    applySettings() { return Promise.reject({ status: 409 }); },
  });
  stale.state.setContext({ displayId: "display-1", revision: 7 });
  stale.state.receiveDraft({ displayId: "display-1", revision: 7, dirty: true, invalid: false });
  stale.state.apply();
  await new Promise((resolve) => setImmediate(resolve));
  assert(stale.state.phase === "stale" && stale.state.dirty === true, "409 response must preserve the draft in a retryable stale state");

  let forbiddenApplyCalls = 0;
  const invalid = loadApplyComponent({
    settings,
    output,
    applySettings() { forbiddenApplyCalls += 1; return Promise.resolve({ success: true, state_revision: 8 }); },
  });
  invalid.state.setContext({ displayId: "display-1", revision: 7 });
  invalid.state.receiveDraft({ displayId: "display-1", revision: 7, dirty: true, invalid: true });
  invalid.state.apply();
  assert(invalid.state.phase === "invalid" && invalid.state.disabled === true && forbiddenApplyCalls === 0, "local-invalid draft must keep Apply visible but disabled without an Apply API call");
};
