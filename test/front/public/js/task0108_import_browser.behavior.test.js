"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = async function task0108ImportBrowserBehavior(assert) {
  const rootDir = path.resolve(__dirname, "../../../..");
  const source = fs.readFileSync(path.join(rootDir, "public/js/native-session-io.js"), "utf8");
  const listeners = Object.create(null);
  const timers = [];
  let nextTimer = 1;

  class FakeElement {
    constructor(kind, dataset = {}) {
      this.kind = kind;
      this.dataset = dataset;
      this.hidden = kind === "menu";
      this.style = {};
      this.attributes = {};
      this.tabIndex = -1;
      this.offsetHeight = 68;
      this.isConnected = true;
      this.value = "";
      this.checked = false;
      this.disabled = false;
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    getBoundingClientRect() { return { left: 800, right: 836, top: 8, bottom: 40, width: 36, height: 32 }; }
    focus() { document.activeElement = this; }
    contains(node) { return node === this || (node && node.parentControl === this); }
    querySelector(selector) { return selector === "h2" ? new FakeElement("heading") : null; }
    closest(selector) {
      if (selector.includes("[data-native-import-control]") && ["control", "trigger", "menu", "source"].includes(this.kind)) return control;
      if (selector.includes("[data-testid='toolbar-import']") && this.kind === "trigger") return this;
      if (selector.includes("[data-native-import-source]") && this.kind === "source") return this;
      if (selector.includes("[data-testid='toolbar-save']") && this.kind === "save") return this;
      if (selector.includes("[data-testid='toolbar-import']") && selector.includes("[data-testid='toolbar-save']") && ["trigger", "save"].includes(this.kind)) return this;
      return null;
    }
  }

  const control = new FakeElement("control");
  const trigger = new FakeElement("trigger", { testid: "toolbar-import" });
  const saveTrigger = new FakeElement("save", { testid: "toolbar-save" });
  const menu = new FakeElement("menu", { testid: "toolbar-import-menu" });
  const engeeSource = new FakeElement("source", { nativeImportSource: "engee" });
  const localSource = new FakeElement("source", { nativeImportSource: "local" });
  [trigger, menu, engeeSource, localSource].forEach((node) => { node.parentControl = control; });

  class RuntimeRoot extends FakeElement {
    constructor() {
      super("root");
      this._html = "";
      this.single = Object.create(null);
      this.multiple = Object.create(null);
    }
    set innerHTML(value) {
      this._html = value;
      this.single = Object.create(null);
      this.multiple = Object.create(null);
      const add = (selector, element) => { this.single[selector] = element; return element; };
      const addMany = (selector, elements) => { this.multiple[selector] = elements; };
      addMany("[data-native-close]", []);
      addMany("[data-native-signal-index]", []);
      addMany("[data-native-browser-open]", []);
      addMany("[data-native-browser-caret]", []);
      addMany("[data-native-browser-entry]", []);

      if (value.includes("native-import-dialog")) {
        add("[data-testid='native-import-dialog']", new FakeElement("dialog"));
        const pathInput = add("[data-testid='native-import-path']", new FakeElement("input", { testid: "native-import-path" }));
        pathInput.value = ((value.match(/data-testid='native-import-path' value='([^']*)'/) || [])[1] || "");
        const browse = add("[data-testid='native-import-path-browse']", new FakeElement("browse", { nativeBrowserOpen: "native-import-file", testid: "native-import-path-browse" }));
        addMany("[data-native-browser-open]", [browse]);
        const replace = add("[data-native-replace]", new FakeElement("checkbox"));
        replace.checked = value.includes("data-native-replace data-testid='native-import-replace'>") && value.includes("type='checkbox' checked");
        add("[data-testid='native-import-submit']", new FakeElement("submit"));
      }
      if (value.includes("native-save-dialog")) {
        add("[data-testid='native-save-dialog']", new FakeElement("dialog"));
        const target = add("[data-testid='native-save-variable-name']", new FakeElement("input", { testid: "native-save-variable-name" }));
        target.value = ((value.match(/data-testid='native-save-variable-name' value='([^']*)'/) || [])[1] || "");
        const overwrite = add("[data-testid='native-save-overwrite']", new FakeElement("checkbox"));
        overwrite.checked = /type='checkbox' checked data-testid='native-save-overwrite'/.test(value);
        add("[data-testid='native-save-submit']", new FakeElement("submit"));
      }
      if (value.includes("native-file-browser")) {
        add("[data-testid='native-file-browser']", new FakeElement("browser"));
        const list = add("[data-testid='native-file-browser-list']", new FakeElement("list", { testid: "native-file-browser-list" }));
        list.scrollTop = 0;
        add("[data-native-browser-cancel]", new FakeElement("cancel"));
        add("[data-native-browser-sort]", new FakeElement("sort"));
        add("[data-native-browser-select]", new FakeElement("select"));
        const carets = [...value.matchAll(/data-native-browser-caret='([^']+)'[^>]*data-testid='native-file-browser-caret'/g)].map((match) => new FakeElement("caret", { nativeBrowserCaret: match[1], testid: "native-file-browser-caret", path: match[1] }));
        const entries = [...value.matchAll(/data-native-browser-entry='([^']+)'[^>]*data-testid='native-file-browser-entry'/g)].map((match) => new FakeElement("entry", { nativeBrowserEntry: match[1], testid: "native-file-browser-entry", path: match[1] }));
        addMany("[data-native-browser-caret]", carets);
        addMany("[data-native-browser-entry]", entries);
      }
      if (value.includes("native-message-dialog")) {
        add("[data-testid='native-message-dialog']", new FakeElement("message"));
        add("[data-native-message-close]", new FakeElement("message-close"));
      }
    }
    get innerHTML() { return this._html; }
    querySelector(selector) {
      if (this.single[selector]) return this.single[selector];
      if (selector.includes("native-save-variable-name") && this.single["[data-testid='native-save-variable-name']"]) return this.single["[data-testid='native-save-variable-name']"];
      if (selector.includes("native-save-dialog") && this.single["[data-testid='native-save-dialog']"]) return this.single["[data-testid='native-save-dialog']"];
      if (selector.includes("native-import-dialog") && this.single["[data-testid='native-import-dialog']"]) return this.single["[data-testid='native-import-dialog']"];
      if (selector.includes("native-message-dialog") && this.single["[data-testid='native-message-dialog']"]) return this.single["[data-testid='native-message-dialog']"];
      if (selector.includes("native-file-browser") && this.single["[data-testid='native-file-browser']"]) return this.single["[data-testid='native-file-browser']"];
      return null;
    }
    querySelectorAll(selector) { return this.multiple[selector] || []; }
  }
  const runtimeRoot = new RuntimeRoot();

  const document = {
    activeElement: null,
    addEventListener(type, callback) { (listeners[type] ||= []).push(callback); },
    dispatchEvent() {},
    querySelector(selector) {
      if (selector === "[data-native-import-control]") return control;
      if (selector === "[data-testid='toolbar-import']") return trigger;
      if (selector === "[data-testid='toolbar-import-menu']") return menu;
      if (selector === "[data-testid='runtime-dialog-root']") return runtimeRoot;
      if (selector.includes("overlay-tooltip") || selector.includes("display-overflow-menu") || selector.includes("columns-menu")) return null;
      return runtimeRoot.querySelector(selector);
    },
    querySelectorAll(selector) {
      if (selector === "[data-native-import-source]") return [engeeSource, localSource];
      return runtimeRoot.querySelectorAll(selector);
    }
  };

  let optionsCalls = 0;
  let browserCalls = [];
  let localPickerCalls = 0;
  let saveFailure = null;
  const options = {
    state_revision: 7,
    default_operation: "workspace",
    selected_signal: "Сигнал 1",
    signal_names: ["Сигнал 1"],
    operations: [{ id: "workspace", label: "Workspace" }],
    defaults: {
      workspace_signal_target: "signal_1",
      import_session_target: "/user/signal-analyser-session.jld2",
      session_target: "/user/fallback.jld2",
      replace: true
    }
  };
  const browserResponse = (payload) => {
    if (payload.action === "cancel") return { ok:true, open:false, root_path:"/user", current_path:payload.current_path, parent_path:"/user", selected_path:"", sort_ascending:payload.sort_ascending, entries:[] };
    if (payload.action === "select") return { ok:true, open:false, root_path:"/user", current_path:payload.current_path, parent_path:"/user", selected_path:payload.selected_path, sort_ascending:payload.sort_ascending, entries:[] };
    if (payload.action === "path") return { ok:true, open:true, root_path:"/user", current_path:payload.current_path, parent_path:"/user", selected_path:"", sort_ascending:payload.sort_ascending, entries:[] };
    if (payload.action === "toggle") return { ok:true, open:true, root_path:"/user", current_path:"/user", parent_path:"/user", selected_path:"", sort_ascending:payload.sort_ascending, entries:[
      { name:"sessions", path:"/user/sessions", kind:"directory", depth:0, expanded:true, selectable:true },
      { name:"nested.jld2", path:"/user/sessions/nested.jld2", kind:"file", depth:1, expanded:false, selectable:true }
    ] };
    return { ok:true, open:true, root_path:"/user", current_path:"/user", parent_path:"/user", selected_path:"", sort_ascending:true, entries:[
      { name:"sessions", path:"/user/sessions", kind:"directory", depth:0, expanded:false, selectable:true },
      { name:"session.jld2", path:"/user/session.jld2", kind:"file", depth:0, expanded:false, selectable:true },
      { name:"notes.txt", path:"/user/notes.txt", kind:"file", depth:0, expanded:false, selectable:false }
    ] };
  };
  const window = {
    innerWidth: 1200,
    innerHeight: 800,
    CSS: { escape: (value) => String(value).replace(/'/g, "\\'") },
    SignalAnalyserApi: {
      nativeSaveOptions() { optionsCalls += 1; return Promise.resolve(options); },
      nativeFileBrowserAction(payload) { browserCalls.push(payload); return Promise.resolve(browserResponse(payload)); },
      nativeSave() { return Promise.reject(saveFailure); },
      nativeImportSession() { return Promise.resolve({ state_revision:8, path:"/user/session.jld2" }); }
    },
    SignalAnalyserValueSelect: { close() {}, markup() { return "<div></div>"; } },
    SignalAnalyserOpenSessionFilePicker() { localPickerCalls += 1; },
    addEventListener(type, callback) { (listeners[`window:${type}`] ||= []).push(callback); },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback, delay) { const item = { id:nextTimer++, callback, delay, cleared:false }; timers.push(item); return item.id; },
    clearTimeout(id) { const item = timers.find((timer) => timer.id === id); if (item) item.cleared = true; }
  };
  const context = vm.createContext({ window, document, console, Promise, CustomEvent:function CustomEvent() {} });
  vm.runInContext(source, context, { filename:"native-session-io.js" });
  const state = window.SignalAnalyserNativeSessionIo.state;
  const fire = (type, event) => (listeners[type] || []).forEach((callback) => callback(event));
  const eventFor = (target, extra = {}) => Object.assign({ target, relatedTarget:null, pointerType:"mouse", key:"", preventDefault() {}, stopImmediatePropagation() {} }, extra);
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

  fire("pointerenter", eventFor(trigger, { pointerType:"touch" }));
  assert(timers.length === 0, "touch pointerenter must not synthesize hover menu work");
  fire("pointerenter", eventFor(trigger));
  const hoverTimer = timers.find((timer) => !timer.cleared && timer.delay === 120);
  assert(!!hoverTimer, "mouse hover must schedule the exact 120ms opening delay");
  assert(optionsCalls === 0 && browserCalls.length === 0, "hovering/opening the source menu must not call any API");
  hoverTimer.callback();
  assert(menu.hidden === false && trigger.getAttribute("aria-expanded") === "true", "hover delay must expose the same menu and expanded state");
  fire("pointerleave", eventFor(control, { relatedTarget:null }));
  assert(timers.some((timer) => !timer.cleared && timer.delay === 180), "menu pointerleave must schedule the 180ms grace close");

  fire("click", eventFor(trigger));
  await flush();
  assert(optionsCalls === 1 && state.import === true, "direct Import click must open the Engee session form by default");
  assert(browserCalls.length === 0 && state.importDraft.path === "/user/signal-analyser-session.jld2", "direct Import click must keep the browser closed and show the authoritative Engee path");

  fire("click", eventFor(engeeSource));
  await flush();
  assert(optionsCalls === 2, "explicit Engee source must fetch authoritative defaults once for its own flow");
  assert(browserCalls.length === 0, "Engee source must not call a file-browser action before the folder button");
  assert(state.import === true && state.browserState.open === false, "Engee source must open only the parent Import dialog");
  assert(state.importDraft.path === "/user/signal-analyser-session.jld2", "Import path must be initialized from import_session_target");
  assert(runtimeRoot.innerHTML.includes("/user/signal-analyser-session.jld2"), "default Import path must be visible in the rendered input");

  const initialPath = state.importDraft.path;
  runtimeRoot.multiple["[data-native-browser-open]"][0].onclick();
  assert(browserCalls.length === 1 && browserCalls[0].action === "open", "folder button must be the first file-browser action");
  assert(browserCalls[0].initial_path === initialPath, "file browser open must receive the current input path");
  await flush();
  assert(state.browserState.open && state.browserState.entries.length === 3, "open response must replace the complete browser state");
  assert(state.browserState.entries[2].selectable === false, "wrong-extension files must remain visible and disabled");

  const caret = runtimeRoot.multiple["[data-native-browser-caret]"][0];
  caret.onclick();
  await flush();
  assert(browserCalls.at(-1).action === "toggle" && browserCalls.at(-1).toggle_path === "/user/sessions", "caret must issue toggle without path navigation");
  assert(state.browserState.entries[1].depth === 1, "toggle response must expose an inline nested child");
  const directoryName = runtimeRoot.multiple["[data-native-browser-entry]"].find((entry) => entry.dataset.nativeBrowserEntry === "/user/sessions");
  directoryName.onclick();
  await flush();
  assert(browserCalls.at(-1).action === "path" && browserCalls.at(-1).current_path === "/user/sessions", "directory name must navigate separately from its caret");
  assert(state.browserState.entries.length === 0 && state.browserState.selected_path === "", "path response must reset expansion rows and selection");

  state.importDraft.path = initialPath;
  runtimeRoot.single["[data-native-browser-cancel]"].onclick();
  await flush();
  assert(browserCalls.at(-1).action === "cancel", "Cancel must use the backend action contract");
  assert(state.importDraft.path === initialPath, "Cancel must not mutate the Import path field");

  fire("click", eventFor(localSource));
  assert(localPickerCalls === 1, "local source must invoke the .sazip file picker directly");
  assert(optionsCalls === 2 && browserCalls.at(-1).action === "cancel", "local source must not load Engee options or browser data");

  fire("click", eventFor(saveTrigger));
  await flush();
  assert(optionsCalls === 3 && state.save, "Save must still load typed options and open its dialog");
  const saveTarget = runtimeRoot.single["[data-testid='native-save-variable-name']"];
  saveTarget.value = "existing_signal";
  runtimeRoot.single["[data-testid='native-save-overwrite']"].checked = false;
  saveFailure = { status:409, payload:{ code:"target_exists", error:{ code:"target_exists", message:"already exists" } } };
  runtimeRoot.single["[data-testid='native-save-submit']"].onclick();
  await flush();
  assert(optionsCalls === 3, "target_exists must not reload options or reset the form");
  assert(state.saveDraft.target === "existing_signal" && state.saveDraft.overwrite === false, "target_exists must preserve the attempted target and overwrite choice");
  assert(state.message && state.message.code === "target_exists" && state.message.title === "Переменная уже существует", "workspace conflict must show the explicit variable-exists message");
  assert(state.message.text.includes("включите перезапись"), "workspace conflict must tell the user how to enable overwrite");

  state.message = null;
  window.SignalAnalyserNativeSessionIo.render();
  runtimeRoot.single["[data-testid='native-save-variable-name']"].value = "stale_form_value";
  saveFailure = { status:409, payload:{ code:"stale_state", error:{ code:"stale_state", message:"stale" } } };
  runtimeRoot.single["[data-testid='native-save-submit']"].onclick();
  await flush();
  assert(optionsCalls === 4, "stale_state, unlike target_exists, must refresh authoritative options");
  assert(state.message && state.message.code === "stale_state" && state.message.title === "Состояние обновлено", "stale_state must retain its distinct refresh warning");
};
