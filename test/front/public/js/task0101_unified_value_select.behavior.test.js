"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function classList(initial) {
  const values = new Set(initial || []);
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    toggle(value, force) { if (force === undefined ? !values.has(value) : force) values.add(value); else values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function createComponentHarness(source, filename) {
  const listeners = {};
  const windowListeners = {};
  const triggers = [];
  const attributes = (node) => node.__attributes || (node.__attributes = {});

  function node(extra) {
    const value = Object.assign({
      dataset: {}, style: {}, hidden: false, disabled: false, isConnected: true,
      classList: classList(), parentElement: null, parentNode: null, children: [], value: "", title: "", tagName: "DIV",
      setAttribute(name, raw) {
        attributes(this)[name] = String(raw);
        if (name === "disabled") this.disabled = true;
      },
      removeAttribute(name) { delete attributes(this)[name]; },
      getAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes(this), name) ? attributes(this)[name] : null; },
      hasAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes(this), name); },
      focus() { document.activeElement = this; this.focusCount = (this.focusCount || 0) + 1; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      getClientRects() { return this.hidden || !this.isConnected ? [] : [{}]; },
      scrollIntoView() { this.scrolled = true; },
      getBoundingClientRect() { return this.rect || { left: 20, right: 140, top: 20, bottom: 52, width: 120, height: 32 }; },
      contains(candidate) { return candidate === this || candidate && candidate.parentElement === this; },
      closest(selector) {
        if (selector === "[data-value-select-key]" && this.dataset.valueSelectKey !== undefined) return this;
        if (selector === "[data-value-select-option-index]" && this.dataset.valueSelectOptionIndex !== undefined) return this;
        if (selector === "[data-value-select-input]" && this.dataset.valueSelectInput !== undefined) return this;
        if (selector === "[data-value-select-arrow]" && this.dataset.valueSelectArrow !== undefined) return this;
        if (selector === "[hidden]") return this.hidden ? this : null;
        return this.parentElement && this.parentElement.closest ? this.parentElement.closest(selector) : null;
      },
      matches(selector) { return selector === "[data-value-select-input]" && this.dataset.valueSelectInput !== undefined; },
      querySelector() { return null; }, querySelectorAll() { return []; }
    }, extra || {});
    return value;
  }

  const optionsHost = node({ dataset: { valueSelectOptions: "" } });
  Object.defineProperty(optionsHost, "innerHTML", {
    get() { return this.__html || ""; },
    set(markup) {
      this.__html = markup;
      this.children = [];
      const pattern = /<button([^>]*)>([\s\S]*?)<\/button>/g;
      let match;
      while ((match = pattern.exec(markup))) {
        const attrs = match[1];
        const index = Number((attrs.match(/data-value-select-option-index='(\d+)'/) || [])[1]);
        const option = node({
          dataset: { valueSelectOptionIndex: String(index) },
          disabled: /\sdisabled(?:\s|>)/.test(attrs + ">"),
          title: (attrs.match(/title='([^']*)'/) || [])[1] || "",
          parentElement: optionsHost,
          classList: classList(/class='[^']*is-selected/.test(attrs) ? ["is-selected"] : [])
        });
        option.setAttribute("aria-selected", (attrs.match(/aria-selected='([^']+)'/) || [])[1] || "false");
        if (/aria-disabled='true'/.test(attrs)) option.setAttribute("aria-disabled", "true");
        this.children.push(option);
      }
    }
  });
  optionsHost.querySelectorAll = function (selector) { return selector === "[data-value-select-option-index]" ? this.children.slice() : []; };

  const popup = node({ hidden: true, dataset: { valueSelectPopup: "" } });
  Object.defineProperty(popup, "innerHTML", {
    get() { return this.__html || ""; },
    set(markup) {
      this.__html = markup;
      optionsHost.parentElement = this;
      this.children = markup ? [optionsHost] : [];
    }
  });
  popup.querySelector = function (selector) {
    if (selector === "[data-value-select-options]") return optionsHost;
    return null;
  };
  popup.getBoundingClientRect = function () { return { left: Number.parseFloat(this.style.left) || 0, top: Number.parseFloat(this.style.top) || 0, width: Number.parseFloat(this.style.width) || 244, height: 150 }; };
  popup.contains = function (candidate) { return candidate === this || candidate === optionsHost || optionsHost.children.includes(candidate); };

  const successor = node();
  const document = {
    activeElement: null,
    documentElement: { clientWidth: 320, clientHeight: 200 },
    querySelector(selector) { return selector === "[data-value-select-popup]" ? popup : null; },
    querySelectorAll(selector) {
      if (selector === "[data-value-select-key]") return triggers.filter((trigger) => trigger.isConnected);
      if (selector.startsWith("button:not(:disabled)")) return triggers.filter((trigger) => !trigger.disabled && trigger.isConnected).concat(successor);
      return [];
    },
    addEventListener(type, callback) { (listeners[type] || (listeners[type] = [])).push(callback); }
  };
  const window = {
    innerWidth: 320, innerHeight: 200,
    addEventListener(type, callback) { (windowListeners[type] || (windowListeners[type] = [])).push(callback); },
    requestAnimationFrame(callback) { callback(); return 1; }
  };
  vm.runInNewContext(source, { window, document, String, Number, Array, Object, Math, Error }, { filename });

  function trigger(config, rect) {
    const control = node({ rect: rect || { left: 20, right: 140, top: 20, bottom: 52, width: 120, height: 32 } });
    const input = node({ tagName: "INPUT", dataset: { valueSelectInput: "" }, parentElement: control, parentNode: control });
    const arrow = node({ tagName: "BUTTON", dataset: { valueSelectArrow: "" }, parentElement: control, parentNode: control });
    control.children = [input, arrow];
    control.querySelector = function (selector) {
      if (selector === "[data-value-select-input]") return input;
      if (selector === "[data-value-select-arrow]") return arrow;
      return null;
    };
    control.input = input;
    control.arrow = arrow;
    triggers.push(control);
    window.SignalAnalyserValueSelect.configure(control, config);
    return control;
  }
  function dispatch(type, target, extra) {
    const event = Object.assign({ target, key: "", shiftKey: false, prevented: false, preventDefault() { this.prevented = true; } }, extra || {});
    (listeners[type] || []).forEach((callback) => callback(event));
    return event;
  }
  return { window, document, popup, optionsHost, triggers, successor, trigger, dispatch, node };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

module.exports = async function testTask0101UnifiedValueSelect(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const component = read("public/js/value-select.js");
  const app = read("public/js/app.js");
  const settings = read("public/js/settings.js");
  const css = read("public/css/app.css");
  const html = read("public/index.html");
  const service = read("lib/services/signal_settings_service.jl");

  assert(/<script src="\.\/js\/value-select\.js"><\/script>[\s\S]*?<script src="\.\/js\/settings\.js"><\/script>/.test(html), "the shared selector component must load before every settings/app consumer");
  assert((html.match(/data-value-select-popup/g) || []).length === 1, "production HTML must own exactly one shared selector popup");
  assert(!/<select\b/i.test(html + app + settings) && !/createElement\(["']select/i.test(app + settings), "non-vendor production source must create no native select element");
  assert(!/data-pane-type|data-resolution-mode/.test(app + settings), "removed native pane/resolution selector hooks must not survive");

  const enumIds = [
    "time.units", "spectrum.frequency_units", "spectrum.frequency_scale", "spectrum.resolution_type", "spectrum.window",
    "spectrogram.time_units", "spectrogram.frequency_units", "spectrogram.frequency_scale",
    "persistence.time_units", "persistence.frequency_units", "persistence.frequency_scale"
  ];
  const resolutionIds = ["spectrum.rbw", "spectrum.window_length", "spectrum.nfft", "spectrogram.time_resolution", "persistence.time_resolution", "persistence.power_bins"];
  enumIds.forEach((id) => assert(new RegExp('"' + id.replace(".", "\\.") + '"[^;]+"enum"').test(service), `${id} must remain a backend enum routed through the generic shared selector`));
  resolutionIds.forEach((id) => assert(new RegExp('"' + id.replace(".", "\\.") + '"[^;]+"(?:resolution|power_bins)"').test(service), `${id} must remain a backend mode selector routed through the shared component`));
  ["spectrum.scale", "spectrogram.scale", "persistence.scale"].forEach((id) => assert(service.includes(`"${id}"`) && service.includes("SIGNAL_SETTINGS_ENUM_CHECKBOX_IDS"), `${id} must remain explicitly checkbox-backed, not a dropdown`));
  assert(/pseudo\("display\.plot_type", "enum"/.test(settings), "the Display plot type must use the generic enum selector path");
  assert(/if \(item\.kind === "enum"\)[\s\S]*?valueSelect\.markup/.test(settings), "all backend combobox enums must use the shared selector");
  assert(/item\.kind === "resolution" \|\| item\.kind === "power_bins"[\s\S]*?valueSelect\.markup/.test(settings), "all resolution and power-bin modes must use the shared selector");
  assert(/valueSelect\.configure\(select,[\s\S]*?testId:"pane-type-"/.test(app), "every pane plot-type trigger must use the shared selector");
  assert(/testId:"extrema-mode-trigger"[\s\S]*?onSelect:chooseExtremaMode/.test(app), "Extrema mode must use the same selector and existing draft callback");
  assert(/data-testid="display-overflow-menu"/.test(html) && /data-testid="signal-columns-menu"/.test(html) && !/valueSelect\.(?:markup|configure)[\s\S]{0,100}(?:column|layout|overflow)/.test(app), "action, layout and eye-state menus must remain excluded from the value selector");

  const triggerRule = (css.match(/\.control,\s*\n\.select-trigger\s*\{[^}]*\}/) || [""])[0];
  const paneRule = (css.match(/\.plot-control-cluster \.pane-select\s*\{[^}]*\}/) || [""])[0];
  const popupRule = (css.match(/\.value-select-popup\s*\{[^}]*\}/) || [""])[0];
  const inputRule = (css.match(/(?:^|\n)\.select-trigger-input\s*\{[^}]*\}/) || [""])[0];
  const arrowRule = (css.match(/(?:^|\n)\.select-trigger-arrow\s*\{[^}]*\}/) || [""])[0];
  const arrowGlyphRule = (css.match(/(?:^|\n)\.select-trigger-arrow::after\s*\{[^}]*\}/) || [""])[0];
  const openArrowRule = (css.match(/(?:^|\n)\.select-trigger\.is-open \.select-trigger-arrow::after\s*\{[^}]*\}/) || [""])[0];
  const optionRule = (css.match(/\.select-options button\s*\{[^}]*\}/) || [""])[0];
  assert(/height:\s*32px/.test(triggerRule) && /border:\s*1px solid var\(--line\)/.test(triggerRule) && /border-radius:\s*var\(--control-radius\)/.test(triggerRule), "settings triggers must retain exact 32px framed geometry");
  assert(/height:\s*28px/.test(paneRule), "pane triggers must retain exact 28px joined geometry");
  assert(/position:\s*fixed/.test(popupRule) && /z-index:\s*var\(--layer-dropdown\)/.test(popupRule) && /max-height:\s*min\(240px/.test(popupRule) && /padding:\s*0/.test(popupRule) && /border:\s*0/.test(popupRule) && /background:\s*var\(--surface\)/.test(popupRule), "options-only popup must be fixed, white, layered, borderless, unpadded and 240px bounded");
  assert(/height:\s*100%/.test(inputRule) && /text-overflow:\s*ellipsis/.test(inputRule) && /width:\s*24px/.test(arrowRule), "the original frame must contain the full-height inline query and exact 24px arrow target");
  assert(/open \? state\.query : config\.selectedLabel/.test(component) && /open \? " placeholder='Поиск'" : " readonly"/.test(component), "the same original input must switch from readonly selected label to editable empty inline query");
  assert(/menu\.innerHTML="<div class='select-options'/.test(component) && !/value-select-search|select-search/.test(component), "popup markup must begin with options and must not create a second search row or input");
  assert(!/SignalAnalyserApi|Plotly|state_revision|calculation|renderGrid|createPaneNode/.test(component), "inline query/filter/navigation must stay isolated from API, revision, calculation and pane-remount work");
  assert(/height:\s*34px/.test(optionRule) && /min-height:\s*34px/.test(optionRule) && /gap:\s*12px/.test(optionRule), "options must retain standard 34px geometry");
  assert(/button\.is-selected \{ background: var\(--surface\)/.test(css) && /button\.is-selected \.select-option-check::after \{ border-color: var\(--success\)/.test(css), "selected option must stay white and expose the green success check");
  assert(/button:not\(:disabled\):hover,[\s\S]*?button\.is-active \{ background: #f5f5f5/.test(css), "pointer hover and keyboard-active option must use the same gray background");
  assert(/width:\s*24px/.test(arrowRule) && /chevron-down-fill-16\.svg/.test(arrowGlyphRule) && /transform:\s*translateY\(-50%\)/.test(arrowGlyphRule) && !/rotate\(/.test(arrowGlyphRule), "the closed framed trigger must keep the exact 24px target and point the local chevron straight down");
  assert(/transform:\s*translateY\(-50%\)\s*rotate\(180deg\)/.test(openArrowRule), "the open framed trigger must point the same chevron straight up at exactly 180 degrees");
  assert(!/transition\s*:/.test(arrowGlyphRule + openArrowRule), "the v18 arrow direction must switch immediately without a transform transition through a transient left-pointing frame");
  assert(/text-overflow:\s*ellipsis/.test(optionRule + inputRule) && /title='" \+ esc\(option\.label\)/.test(component), "long trigger/option labels must ellipsize visually while retaining their full title");

  const harness = createComponentHarness(component, path.join(root, "public/js/value-select.js"));
  const selected = [];
  const first = harness.trigger({
    key: "first", value: "b", label: "Бета",
    options: [{ value: "a", label: "Альфа" }, { value: "b", label: "Бета" }, { value: "x", label: "Недоступно", disabled: true }, { value: "long", label: "Очень длинное полное название параметра" }],
    ariaLabel: "Первый", onSelect(value) { selected.push(value); }
  }, { left: 210, right: 310, top: 170, bottom: 198, width: 100, height: 28 });
  const second = harness.trigger({ key: "second", value: "1", label: "Один", options: [{ value: "1", label: "Один" }, { value: "2", label: "Два" }], ariaLabel: "Второй", onSelect(value) { selected.push(value); } });
  const disabled = harness.trigger({ key: "disabled", value: "1", label: "Один", options: [{ value: "1", label: "Один" }], disabled: true, onSelect(value) { selected.push(value); } });

  harness.dispatch("click", disabled.input);
  assert(harness.popup.hidden && disabled.getAttribute("aria-expanded") === "false", "disabled trigger must retain geometry but never open");
  assert(disabled.input.readOnly && disabled.input.disabled && disabled.input.value === "Один" && disabled.arrow.disabled, "disabled original input/arrow must preserve the selected display while remaining non-interactive");
  const originalInput = first.input;
  harness.dispatch("click", first.input);
  assert(!harness.popup.hidden && first.getAttribute("aria-expanded") === "true" && harness.document.activeElement === originalInput, "click must open one popup and focus the same original inline input");
  assert(first.input === originalInput && !first.input.readOnly && first.input.value === "" && first.input.getAttribute("placeholder") === "Поиск" && first.input.selectionStart === 0, "opening must make the original field editable, empty only its visible query and place the caret at zero");
  assert(harness.popup.children.length === 1 && harness.popup.children[0] === harness.optionsHost, "the open popup must contain the options listbox only");
  assert(harness.popup.style.width === "100px" && Number.parseFloat(harness.popup.style.left) === 210 && Number.parseFloat(harness.popup.style.top) === 16, `popup width must exactly match its 100px trigger with no legacy 244px minimum while preserving the above flip (got ${harness.popup.style.width}/${harness.popup.style.left}/${harness.popup.style.top})`);
  assert(harness.optionsHost.children.length === 4 && harness.optionsHost.children[1].classList.contains("is-selected") && harness.optionsHost.children[1].getAttribute("aria-selected") === "true", "opening must render all options and retain the selected row");
  assert(harness.window.SignalAnalyserValueSelect.state().activeIndex === 1 && selected.length === 0, "opening must activate the selected enabled row without selecting or writing");

  first.input.value = "длинное";
  harness.dispatch("input", first.input);
  assert(harness.document.activeElement === originalInput && harness.optionsHost.children.length === 1 && harness.optionsHost.children[0].title === "Очень длинное полное название параметра" && selected.length === 0, "inline search must match the full long label without changing selection or moving focus");
  first.input.value = "отсутствует";
  harness.dispatch("input", first.input);
  assert(/Ничего не найдено/.test(harness.optionsHost.innerHTML) && harness.window.SignalAnalyserValueSelect.state().activeIndex === -1, "empty search must expose the canonical empty state");
  harness.dispatch("keydown", first.input, { key: "Enter" });
  assert(selected.length === 0 && first.getAttribute("aria-expanded") === "true", "Enter in empty search must perform no selection or close");
  first.input.value = "";
  harness.dispatch("input", first.input);
  assert(harness.optionsHost.children[1].classList.contains("is-selected") && harness.window.SignalAnalyserValueSelect.state().selectedValue === "b", "clearing the inline query must restore the selected green-check row without mutating its value");
  harness.dispatch("keydown", first.input, { key: "End" });
  assert(harness.window.SignalAnalyserValueSelect.state().activeIndex === 3, "End must choose the last enabled filtered row and skip disabled options");
  assert(first.input.getAttribute("aria-activedescendant") === "value-select-option-first-3", "keyboard-active option must be exposed by the focused inline combobox");
  harness.dispatch("keydown", first.input, { key: "ArrowDown" });
  assert(harness.window.SignalAnalyserValueSelect.state().activeIndex === 0, "ArrowDown must wrap across enabled options");
  harness.dispatch("keydown", first.input, { key: "ArrowUp" });
  assert(harness.window.SignalAnalyserValueSelect.state().activeIndex === 3, "ArrowUp must wrap across enabled options");
  harness.dispatch("keydown", first.input, { key: "Home" });
  assert(harness.window.SignalAnalyserValueSelect.state().activeIndex === 0, "Home must activate the first enabled option");
  harness.dispatch("pointermove", harness.optionsHost.children[1]);
  assert(harness.window.SignalAnalyserValueSelect.state().activeIndex === 1, "pointer hover must update the keyboard-active row without selecting it");
  harness.dispatch("keydown", first.input, { key: "Escape" });
  assert(harness.popup.hidden && harness.document.activeElement === originalInput && first.input.readOnly && first.input.value === "Бета" && first.input.getAttribute("placeholder") === null && selected.length === 0, "Escape must close without change and restore selected display/focus in the same logical input");

  harness.dispatch("keydown", first.input, { key: "ArrowUp" });
  assert(harness.window.SignalAnalyserValueSelect.state().activeIndex === 3, "ArrowUp on a closed trigger must open at the last enabled row");
  harness.dispatch("keydown", first.input, { key: "Enter" });
  assert(selected.join(",") === "long" && harness.popup.hidden && harness.document.activeElement === first.input && first.input.value === "Очень длинное полное название параметра" && first.input.readOnly, "Enter must select exactly once, close, restore the selected display and focus the original field");
  harness.dispatch("keydown", first.input, { key: " " });
  assert(!harness.popup.hidden && harness.document.activeElement === first.input && first.input.value === "", "Space must open with the same inline-search behavior");
  harness.dispatch("click", second.input);
  assert(first.getAttribute("aria-expanded") === "false" && second.getAttribute("aria-expanded") === "true" && !harness.popup.hidden, "opening another selector must close the prior one and keep exactly one popup open");
  assert(first.input.value === "Очень длинное полное название параметра" && second.input.value === "" && harness.document.activeElement === second.input, "another selector must restore the prior selected display without focus bounce and focus the new inline input");
  harness.dispatch("pointerdown", harness.node());
  assert(harness.popup.hidden && second.getAttribute("aria-expanded") === "false" && second.input.value === "Один" && selected.join(",") === "long", "outside pointerdown must restore selected display without fabricating a selection");

  harness.dispatch("click", second.arrow);
  assert(!harness.popup.hidden && harness.document.activeElement === second.input && second.input.value === "", "the dedicated arrow target must open and focus the original inline input");
  harness.dispatch("click", second.arrow);
  assert(harness.popup.hidden && harness.document.activeElement === second.input && second.input.value === "Один" && second.input.readOnly, "the open arrow must close without commit and restore the selected display/focus");

  const viewportWide = harness.trigger({ key: "viewport-wide", value: "1", label: "Один", options: [{ value: "1", label: "Один" }] }, { left: -40, right: 360, top: 20, bottom: 52, width: 400, height: 32 });
  harness.dispatch("click", viewportWide.input);
  assert(harness.popup.style.width === "304px" && Number.parseFloat(harness.popup.style.left) === 8, `only a trigger wider than the viewport may use the viewport-minus-16 exception (got ${harness.popup.style.width}/${harness.popup.style.left})`);
  harness.dispatch("click", viewportWide.arrow);

  harness.dispatch("keydown", second.input, { key: "Enter" });
  harness.dispatch("keydown", second.input, { key: "Tab" });
  harness.successor.focus();
  assert(harness.popup.hidden && harness.document.activeElement === harness.successor, "Tab must close and continue normal focus order to the next enabled logical position");

  let rerenderSelection = 0;
  let replacement;
  const rerender = harness.trigger({ key: "rerender", value: "old", label: "Старое", options: [{ value: "old", label: "Старое" }, { value: "new", label: "Новое" }], onSelect() {
    rerenderSelection += 1;
    rerender.isConnected = false;
    replacement = harness.trigger({ key: "rerender", value: "new", label: "Новое", options: [{ value: "old", label: "Старое" }, { value: "new", label: "Новое" }], onSelect() {} });
  } });
  harness.dispatch("click", rerender.input);
  harness.dispatch("click", harness.optionsHost.children[1]);
  assert(rerenderSelection === 1 && replacement && harness.document.activeElement === replacement.input && replacement.input.value === "Новое" && replacement.input.readOnly, "selection must invoke the existing lifecycle exactly once and restore selected display/focus on the replacement inline input after a DOM rerender");

  const settingsConfigs = {};
  const settingsCalls = [];
  const settingsEvents = [];
  const firstSetting = deferred();
  const secondSetting = deferred();
  const settingResponses = [firstSetting, secondSetting];
  const settingsFields = enumIds.map((id) => ({ id, kind: "enum", control_kind: "combobox", value: id === "time.units" ? "seconds" : "first", enabled: true, visible: true, options: id === "time.units" ? ["seconds", "milliseconds", "microseconds"] : ["first", "second"], effect_status: "effective_presentation" })).concat(
    resolutionIds.map((id) => ({ id, kind: id === "persistence.power_bins" ? "power_bins" : "resolution", control_kind: id === "persistence.power_bins" ? "power_bins" : "resolution", value: { mode: "auto" }, enabled: true, visible: true, effect_status: "effective_presentation" }))
  );
  const settingsHost = { innerHTML: "" };
  const settingsWindow = {
    SignalAnalyserApi: {
      settings() { return Promise.resolve({ state_revision: 1, fields: settingsFields, readouts: [] }); },
      updateSetting(payload) { settingsCalls.push(payload); return settingResponses.shift().promise; }
    },
    SignalAnalyserValueSelect: {
      markup(config) { settingsConfigs[config.key] = config; return `<button data-value-select-key='${config.key}'></button>`; },
      reconcile() {}
    },
    dispatchEvent(event) { settingsEvents.push(event); }, addEventListener() {},
    setTimeout(callback) { callback(); return 1; }, clearTimeout() {}, requestAnimationFrame(callback) { callback(); return 1; }
  };
  const settingsDocument = { querySelector(selector) { return selector === "[data-testid='settings-content']" ? settingsHost : null; }, querySelectorAll() { return []; }, addEventListener() {} };
  vm.runInNewContext(settings, { window: settingsWindow, document: settingsDocument, Promise, Error, Array, Object, String, Number, Boolean, Math, CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }, isFinite, clearTimeout() {} }, { filename: path.join(root, "public/js/settings.js") });
  settingsWindow.SignalAnalyserSettings.setContext("display-1", 1);
  settingsWindow.SignalAnalyserSettings.setView("display", "time");
  await settingsWindow.SignalAnalyserSettings.load();
  assert(settingsConfigs["setting::display-1::display.plot_type"] && settingsConfigs["setting::display-1::time.units"], "Display plot type and backend TIME enum must instantiate the same component");
  ["spectrum", "spectrogram", "persistence"].forEach((plotType) => { settingsWindow.SignalAnalyserSettings.setView("display", plotType); settingsWindow.SignalAnalyserSettings.render(); });
  const expectedSettingKeys = ["setting::display-1::display.plot_type"].concat(enumIds.map((id) => `setting::display-1::${id}`), resolutionIds.map((id) => `setting::display-1::${id}::mode`));
  expectedSettingKeys.forEach((key) => assert(settingsConfigs[key], `${key} must instantiate the one shared selector in its applicable graph inventory`));
  assert(expectedSettingKeys.length === 18 && expectedSettingKeys.length + 2 === 20, "inventory must retain exactly 20 value-selector categories: eighteen settings, pane plot type and Extrema mode");
  settingsWindow.SignalAnalyserSettings.setView("display", "time");
  settingsWindow.SignalAnalyserSettings.render();
  settingsConfigs["setting::display-1::time.units"].onSelect("milliseconds");
  await settle();
  assert(settingsCalls.length === 1 && settingsCalls[0].field_id === "time.units" && settingsCalls[0].value === "milliseconds", "a generic selector choice must invoke its existing settings update lifecycle exactly once");
  settingsConfigs["setting::display-1::time.units"].onSelect("microseconds");
  await settle();
  assert(settingsCalls.length === 1, "a rapid newer selector choice must queue behind the in-flight write rather than duplicate it");
  firstSetting.resolve({ state: { state_revision: 2 }, settings: { fields: [], readouts: [] } });
  await settle();
  assert(settingsCalls.length === 2 && settingsCalls[1].value === "microseconds" && settingsCalls[1].state_revision === 2, "native-replacement selector latest-wins must send only the newest choice with the accepted revision");
  secondSetting.resolve({ state: { state_revision: 3 }, settings: { fields: [], readouts: [] } });
  await settle();
  assert(settingsEvents.filter((event) => event.type === "signal-apply-state").length === 2, "two explicit generic choices must emit exactly two existing draft/apply-state transitions");
  settingsConfigs["setting::display-1::display.plot_type"].onSelect("spectrum");
  assert(settingsCalls.length === 2 && settingsEvents.filter((event) => event.type === "signal-settings-plot-type").length === 1, "Display plot-type choice must use its existing pane event exactly once without a settings API write");
};
