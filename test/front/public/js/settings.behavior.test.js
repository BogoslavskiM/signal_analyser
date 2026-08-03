"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function documentFor(displayId, revision, unit) {
  return {
    state_revision: revision,
    display_id: displayId,
    groups: [],
    sections: [],
    readouts: [],
    fields: [{ id: "time.units", value: unit, effect_status: "stored_only" }],
  };
}

module.exports = async function testSettingsLateResponseIsDisplayScoped(assert) {
  const listeners = {};
  const window = {
    addEventListener(type, listener) { (listeners[type] || (listeners[type] = [])).push(listener); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach((listener) => listener(event)); return true; },
  };
  window.window = window;
  const CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  window.CustomEvent = CustomEvent;
  const context = {
    window,
    document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } },
    CustomEvent,
    Promise,
    Map,
    Set,
    Object,
    Array,
    JSON,
    Number,
    String,
    Boolean,
    console,
  };
  context.globalThis = window;
  const root = path.resolve(__dirname, "../../../..");
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8"), context, { filename: "settings.js" });

  const seam = window.SignalAnalyserSettings.__test;
  assert(seam && typeof seam.setApi === "function" && typeof seam.save === "function", "settings module must expose its browserless seam");
  const revisions = [];
  const states = [];
  window.addEventListener("signal-analyser-settings-revision", (event) => revisions.push(event.detail));
  window.addEventListener("signal-analyser-settings-state", (event) => states.push(event.detail));

  const pending = deferred();
  seam.setApi({ updateSetting: () => pending.promise, settings: () => Promise.reject(new Error("unexpected refetch")) });
  const a42 = documentFor("display-a", 42, "seconds");
  const b42 = documentFor("display-b", 42, "hours");
  seam.seed("display-a", 42, a42);
  seam.seed("display-b", 42, b42);
  seam.context("display-a", 42);
  const savingA = seam.save("display-a", { id: "time.units", effect_status: "stored_only" }, "minutes");

  // The user leaves A while its request is pending.  A's accepted response
  // may advance the global revision but cannot render or overwrite B.
  seam.context("display-b", 42);
  pending.resolve({ state: { state_revision: 43 }, settings: documentFor("display-a", 43, "minutes") });
  await savingA;
  assert(revisions.some((detail) => detail === 43 || (detail && detail.state_revision === 43) || (detail && detail.revision === 43)), "accepted A response must publish revision 43");
  assert(states.length === 0, "stored-only save must not publish a render/state event");
  const bAfterA = seam.inspect("display-b");
  assert(bAfterA.document.fields[0].value === "hours", "A response must not leak its document into B");
  assert(bAfterA.globalRevision === 43, "B must inherit the globally accepted revision 43");
  const bPayloads = [];
  seam.setApi({
    updateSetting(payload) {
      bPayloads.push(payload);
      return Promise.resolve({ state: { state_revision: 43 }, settings: documentFor("display-b", 43, "minutes") });
    },
    settings: () => Promise.reject(new Error("unexpected refetch")),
  });
  await seam.save("display-b", { id: "time.units", effect_status: "stored_only" }, "minutes");
  assert(bPayloads.length === 1 && bPayloads[0].state_revision === 43, "B's next action must send revision 43");

  // A late older response cannot roll either context back below 43.
  seam.seed("display-a", 42, documentFor("display-a", 42, "seconds"));
  await seam.save("display-b", { id: "time.units", effect_status: "stored_only" }, "hours");
  assert(bPayloads[1].state_revision === 43, "late revision 42 must never lower B's subsequent request");

  // Resolution values are passed as one exact discriminated field value; the
  // catalog decides visibility/status, while the client must not synthesize
  // NFFT or run any DSP.
  const nfft = {
    id: "spectrum.nfft", group: "spectrum", section: "spectrum.window_options", label: "DFT Points",
    kind: "resolution", control_kind: "resolution", value: { mode: "auto", nfft: null }, default: { mode: "auto", nfft: null },
    units: "", min: 2, max: null, step: 1, options: [], checked_value: null, unchecked_value: null,
    visible: true, enabled: true, effect_status: "blocked_contract", effect_reason: "milestone_3_contract", error: "", warning: "",
  };
  seam.seed("display-nfft", 43, { state_revision: 43, display_id: "display-nfft", groups: [], sections: [], readouts: [], fields: [nfft] });
  seam.context("display-nfft", 43);
  await seam.save("display-nfft", nfft, { mode: "specified", nfft: 16 });
  const nfftPayload = bPayloads.at(-1);
  assert(JSON.stringify(nfftPayload) === JSON.stringify({ state_revision: 43, display_id: "display-nfft", field_id: "spectrum.nfft", value: { mode: "specified", nfft: 16 } }), "DFT Points must send one exact NFFT resolution payload");

  const timeFactors = {
    picoseconds: 1e-12, nanoseconds: 1e-9, microseconds: 1e-6, milliseconds: 1e-3,
    seconds: 1, minutes: 60, hours: 3600, days: 86400, years: 31556952,
  };
  const frequencyFactors = {
    cycles_per_year: 1 / 31556952, cycles_per_day: 1 / 86400, cycles_per_hour: 1 / 3600, cycles_per_minute: 1 / 60,
    millihertz: 1e-3, hertz: 1, kilohertz: 1e3, megahertz: 1e6, gigahertz: 1e9, terahertz: 1e12,
  };
  ["time.units", "spectrogram.time_units", "persistence.time_units"].forEach((fieldId) => Object.entries(timeFactors).forEach(([unit, factor]) => {
    assert(seam.unit(fieldId, unit).factor === factor, `${fieldId}/${unit} must expose its exact canonical factor`);
    assert(seam.canonical(fieldId, "2", unit) === factor * 2, `${fieldId}/${unit} must convert display input back to canonical seconds`);
    assert(seam.project(fieldId, factor * 2, unit) === "2", `${fieldId}/${unit} must project canonical seconds without drift`);
  }));
  ["spectrum.frequency_units", "spectrogram.frequency_units", "persistence.frequency_units"].forEach((fieldId) => Object.entries(frequencyFactors).forEach(([unit, factor]) => {
    assert(seam.unit(fieldId, unit).factor === factor, `${fieldId}/${unit} must expose its exact canonical factor`);
    assert(seam.canonical(fieldId, "2", unit) === factor * 2, `${fieldId}/${unit} must convert display input back to canonical Hz`);
    assert(seam.project(fieldId, factor * 2, unit) === "2", `${fieldId}/${unit} must project canonical Hz without drift`);
  }));
  assert(seam.canonical("time.units", "-0", "years") === 0, "display negative zero must serialize as canonical zero");
  const projected = seam.project("time.units", 1234567890123, "seconds");
  assert(projected.split(/[eE]/)[0].replace(/[+\-.]/g, "").length <= 12, "unit display must use no more than 12 significant digits");
  assert(seam.project("spectrogram.time_units", null, "years") === null && seam.project("persistence.frequency_units", null, "terahertz") === null, "Auto/null values must remain unprojected");
  assert(seam.project("time.units", 60, "seconds") === "60" && seam.project("spectrogram.time_units", 60, "minutes") === "1", "Time and Spectrogram alias projection must use the active menu unit");
};
