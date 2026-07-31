"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const bundles = [
  ["application-toolbar/assets/template.js", "GenieApplicationToolbar"],
  ["dialog-system/assets/template.js", "GenieDialogSystem"],
  ["file-browser-dialog/assets/template.js", "GenieFileBrowserDialog"],
  ["graph-output-zone/assets/template.js", "GenieGraphOutputZone"],
  ["inspector-ui/assets/template.js", "GenieInspectorUi"],
  ["multi-page-element/assets/template.js", "GenieMultiPageElement"],
  ["object-export-dialog/assets/template.js", "GenieObjectExportDialog"],
  ["session-import-export-ui/assets/template.js", "GenieSessionImportExportUi"],
  ["settings-controls/assets/template.js", "GenieSettingsControls"],
  ["style-system/assets/tooltip.js", "GenieTooltip"],
];

function fakeElement() {
  const listeners = new Map();
  return {
    innerHTML: "",
    textContent: "",
    className: "",
    style: {},
    dataset: {},
    parentElement: null,
    classList: {
      values: new Set(),
      add(value) { this.values.add(value); },
      remove(value) { this.values.delete(value); },
      toggle(value, enabled) { enabled ? this.values.add(value) : this.values.delete(value); },
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    querySelector() { return null; },
    setAttribute(name, value) { this[name] = String(value); },
    getAttribute(name) { return this[name] || ""; },
    getBoundingClientRect() { return { top: 0, bottom: 20, left: 0, width: 40, height: 20 }; },
    contains() { return true; },
    scrollBy() {},
    _listeners: listeners,
  };
}

function createEnvironment() {
  let tooltip = null;
  const body = fakeElement();
  body.appendChild = (element) => { tooltip = element; element.parentElement = body; };
  body.contains = () => true;
  const document = Object.assign(fakeElement(), {
    body,
    head: { appendChild() {} },
    createElement: fakeElement,
    querySelector(selector) { return selector === ".ui-tooltip" ? tooltip : null; },
  });
  const window = Object.assign(fakeElement(), {
    innerWidth: 1280,
    innerHeight: 720,
    document,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) { return setTimeout(callback, 0); },
    cancelAnimationFrame: clearTimeout,
  });
  window.window = window;
  return { window, document };
}

function loadBundle(relativePath, globalName) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  const environment = createEnvironment();
  const context = vm.createContext({
    window: environment.window,
    document: environment.document,
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Error,
    TypeError,
    Set,
    console,
  });
  vm.runInContext(source, context, { filename: relativePath });
  const exported = environment.window[globalName];
  assert(exported, `${relativePath}: ${globalName} was not registered`);
  assert.strictEqual(typeof exported.create, "function", `${relativePath}: create is required`);
  return { exported, environment, source };
}

function verifyContract(instance, relativePath, root) {
  assert(instance && typeof instance.state === "object", `${relativePath}: state object is required`);
  assert(instance.actions && typeof instance.actions === "object", `${relativePath}: actions object is required`);
  ["render", "mount", "unmount"].forEach((name) => {
    assert.strictEqual(typeof instance[name], "function", `${relativePath}: ${name} is required`);
  });
  assert.strictEqual(typeof instance.render(), "string", `${relativePath}: render must return HTML string`);
  assert.strictEqual(instance.mount(root), instance, `${relativePath}: mount must return the module`);
  instance.unmount();
  assert.strictEqual(root.innerHTML, "", `${relativePath}: unmount must clear its root`);
}

async function verifyBehavior(records) {
  let item = records.GenieApplicationToolbar;
  let instance = item.exported.create({ handlers: { import() { return "ok"; } } });
  instance.actions.configure({ import: { visible: true } });
  assert(instance.render().includes("toolbar-import"));
  assert.strictEqual(instance.actions.run("import"), "ok");

  item = records.GenieDialogSystem;
  instance = item.exported.create();
  instance.actions.showUnexpectedError(new Error("boom"));
  assert(instance.render().includes("boom"));
  assert.strictEqual(item.exported.shortErrorMessage("x"), "x");

  item = records.GenieFileBrowserDialog;
  let selectedPath = "";
  instance = item.exported.create({
    targets: { file: { mode: "file", getValue: () => "/tmp", setValue: (value) => { selectedPath = value; } } },
    api: {
      open: () => Promise.resolve({ open: true, current_path: "/tmp", entries: [{ name: "a", path: "/tmp/a", kind: "file" }] }),
      select: () => Promise.resolve({ value: "/normalized/a" }),
    },
  });
  await instance.actions.open("file");
  assert(instance.render().includes("/tmp/a"));
  instance.actions.selectEntry("/tmp/a");
  await instance.actions.confirm();
  assert.strictEqual(selectedPath, "/normalized/a");

  item = records.GenieGraphOutputZone;
  instance = item.exported.create();
  instance.actions.setPageState({ isready: true, success: false, error: "plot failed" });
  assert(instance.render().includes("plot failed"));
  instance.actions.setPageState({ isready: true, success: true, data: [{ data: [] }, { data: [] }] });
  assert.strictEqual((instance.render().match(/data-graph-plot/g) || []).length, 2);

  item = records.GenieInspectorUi;
  instance = item.exported.create();
  instance.actions.setTable({ rows: [{ id: "1", name: "Alpha" }], order: ["1"], columns: [] });
  assert(instance.render().includes("Alpha"));
  instance.actions.search("missing");
  assert(instance.render().includes("Таких элементов не найдено"));

  item = records.GenieMultiPageElement;
  instance = item.exported.create({ defaultPageId: "a", pages: { a: { render: () => "PAGE-A" } } });
  instance.actions.setPages({ pages: [{ id: "a", title: "A" }], order: ["a"], opened_pages: ["a"], main_page: "a" });
  assert(instance.render().includes("PAGE-A"));
  await instance.actions.close("a");
  assert.deepStrictEqual(Array.from(instance.state.opened_pages), ["a"]);

  item = records.GenieObjectExportDialog;
  instance = item.exported.create({ api: { open: () => Promise.resolve({ operations: [{ id: "julia", label: "Julia" }], active_operation: "julia" }) } });
  await instance.actions.open({ id: "object-1" });
  assert(instance.render().includes("Julia"));

  item = records.GenieSessionImportExportUi;
  instance = item.exported.create({ api: { openExport: () => Promise.resolve({ directory: "/tmp", file_name: "session.json" }) } });
  await instance.actions.openExport();
  assert(instance.render().includes("session.json"));

  item = records.GenieSettingsControls;
  instance = item.exported.create();
  instance.actions.configure({ fields: {
    rate: { label: "Rate", kind: "number", value: 1 },
    mode: { label: "Mode", kind: "select", value: 1, options: [{ value: 1, label: "One" }, { value: 2, label: "Two" }] },
  } });
  instance.actions.updateField("rate", "2.5");
  assert.strictEqual(instance.state.fields.rate.value, 2.5);
  instance.actions.selectEnum("mode", "2", "Two");
  assert.strictEqual(instance.state.fields.mode.value, 2);
  assert.strictEqual(item.exported.numericDraftResult("1e3", "float").valid, true);

  item = records.GenieTooltip;
  instance = item.exported.create({ delayMs: 0 });
  const root = item.environment.document;
  instance.mount(root);
  instance.actions.hide();
  assert.strictEqual(instance.state.visible, false);
  instance.unmount();
}

async function main() {
  const records = {};
  bundles.forEach(([relativePath, globalName]) => {
    const loaded = loadBundle(relativePath, globalName);
    assert(!/\b(?:Vue|createApp|computed|methods|mounted|beforeUnmount|watch)\s*[:.(]/.test(loaded.source),
      `${relativePath}: legacy framework contract found`);
    const instance = loaded.exported.create();
    verifyContract(instance, relativePath, fakeElement());
    records[globalName] = loaded;
  });

  const htmlFiles = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(ROOT, entry.name, "assets", "template.html"))
    .filter(fs.existsSync);
  htmlFiles.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert(!/(?:\bv-(?:if|for|model|else)|@[a-z]+|:[a-z-]+=|<component|<teleport)/.test(source),
      `${path.relative(ROOT, file)}: framework template syntax found`);
  });

  await verifyBehavior(records);
  console.log(`PASS vanilla frontend assets: ${bundles.length} bundles, ${htmlFiles.length} mount templates`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
