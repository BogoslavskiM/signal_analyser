(function registerSignalAnalyserImportMenuLifecycle(window,document) {
  "use strict";

  var silentFocusTrigger=null;

  function isExplicitIntent(kind) {
    return kind === "pointerenter" || kind === "click" || kind === "keyboard";
  }

  function closeImmediately(parts,setOpen,sync) {
    if (typeof setOpen === "function") setOpen(false);
    if (typeof sync === "function") sync();
    if (parts && parts.menu) parts.menu.hidden=true;
    if (parts && parts.trigger) parts.trigger.setAttribute("aria-expanded","false");
  }

  function beforeRelatedOverlay(parts,clearTimers,setOpen,sync) {
    if (typeof clearTimers === "function") clearTimers();
    closeImmediately(parts,setOpen,sync);
    silentFocusTrigger=parts && parts.trigger || null;
  }

  function restoreTriggerSilently(trigger,focus) {
    silentFocusTrigger=trigger || null;
    if (typeof focus === "function") focus(trigger);
    else if (trigger && typeof trigger.focus === "function") trigger.focus();
  }

  function acceptsOpenIntent(kind,trigger,overlayOpen) {
    if (overlayOpen) return false;
    if (kind === "focus" && trigger && trigger === silentFocusTrigger) return false;
    if (!isExplicitIntent(kind) && kind !== "focus") return false;
    if (isExplicitIntent(kind)) silentFocusTrigger=null;
    return true;
  }

  function onTriggerBlur(trigger) {
    if (trigger && trigger === silentFocusTrigger) silentFocusTrigger=null;
  }

  window.SignalAnalyserImportMenuLifecycle=Object.freeze({
    beforeRelatedOverlay:beforeRelatedOverlay,
    restoreTriggerSilently:restoreTriggerSilently,
    acceptsOpenIntent:acceptsOpenIntent,
    onTriggerBlur:onTriggerBlur,
    contract:Object.freeze({
      selectors:Object.freeze({control:"[data-native-import-control]",trigger:"[data-testid='toolbar-import']",menu:"[data-testid='toolbar-import-menu']",item:"[data-native-import-source]"}),
      geometry:Object.freeze({width:196,padding:4,border:1,radius:6,itemHeight:32,itemPaddingX:8,gap:4}),
      opensOn:Object.freeze(["pointerenter","click","keyboard Enter/Space/ArrowDown/ArrowUp","ordinary non-restoration focus"]),
      closesOn:Object.freeze(["selection-before-child-open","related popup/dialog open","outside pointerdown","Escape","scroll","focus leaves control"]),
      restoration:"Closing any related popup/dialog restores only trigger focus. It never restores menu-open state; reopening requires a new explicit hover/click/keyboard intent."
    })
  });
}(window,document));

(function registerNativeSessionIo(window, document) {
  "use strict";

  var state = {
    save: false,
    import: false,
    message: null,
    trigger: null,
    saveType: "workspace",
    busy: false,
    options: null,
    revision: null,
    saveDraft: { scope: "signal", signalNames: [], target: "", overwrite: false },
    signalPicker: { open: false, query: "", activeIndex: 0 },
    importDraft: { path: "", replace: true },
    browserState: {
      open: false,
      root_path: "/user",
      current_path: "/user",
      parent_path: "/user",
      selected_path: "",
      sort_ascending: true,
      entries: [],
      target: "",
      mode: "file",
      allowed_extensions: [".jld2"],
      busy: false,
      busy_action: "",
      error: ""
    },
    requestToken: 0,
    flowGeneration: 0,
    optionsToken: 0
  };
  var labels = {
    workspace: "В рабочую область Engee",
    function: "Julia-функция .jl",
    jld2: "Данные сигнала JLD2 .jld2",
    session: "Полная сессия JLD2 .jld2"
  };
  var importMenuOpen = false;
  var importMenuActiveIndex = 0;
  var importMenuOpenTimer = 0;
  var importMenuCloseTimer = 0;
  var importChildActive = false;
  var localPickerPending = false;
  var sessionImportDialogWasOpen = false;

  function q(selector) { return document.querySelector(selector); }
  function qa(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function setPrimaryBusy(button,busy) { var helper=window.SignalAnalyserPrimaryProcessing; if (helper) helper.setBusy(button,!!busy); else if (button) button.setAttribute("aria-busy",String(!!busy)); return button; }
  function dropdownTooltipAudit() { return window.SignalAnalyserDropdownTooltipAudit || null; }
  function reconcileDropdownTooltip(root) { var audit=dropdownTooltipAudit(); if (audit) audit.reconcile(root || document); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[character];
    });
  }
  function text(value) { return typeof value === "string" ? value.trim() : ""; }
  function errorText(error, fallback) {
    var payload = error && error.payload;
    var nested = payload && payload.error;
    return text(error && error.message) || text(payload && payload.message) ||
      text(nested && nested.message) || text(nested) || fallback;
  }
  function errorCode(error) {
    var payload = error && error.payload;
    var nested = payload && payload.error;
    return text(error && error.code) || text(payload && payload.code) ||
      text(nested && nested.code) || "";
  }
  function setMessage(title, value, kind, code) {
    var normalizedTitle = text(title);
    var normalizedText = text(value);
    state.message = normalizedTitle && normalizedText ? {
      title: normalizedTitle,
      text: normalizedText,
      kind: kind || "alert-error",
      code: text(code)
    } : null;
  }
  function active(generation) { return generation === state.flowGeneration; }
  function beginFlow() {
    state.flowGeneration += 1;
    state.requestToken += 1;
    state.optionsToken += 1;
    state.message = null;
    state.busy = false;
    state.browserState.busy = false;
    state.browserState.busy_action = "";
    state.browserState.error = "";
    return state.flowGeneration;
  }
  function dismissTransient() {
    [
      q("[data-testid='overlay-tooltip']"),
      q("[data-testid='display-overflow-menu']"),
      q("[data-testid='signal-columns-menu']"),
      q("[data-testid='measurement-columns-menu']")
    ].forEach(function (node) { if (node) node.hidden = true; });
  }
  function focus(node) {
    window.requestAnimationFrame(function () { if (node && node.isConnected) node.focus(); });
  }
  function restore() {
    var target = state.trigger;
    state.trigger = null;
    if (target && target.matches && target.matches("[data-testid='toolbar-import']")) {
      importChildActive = false;
      window.SignalAnalyserImportMenuLifecycle.restoreTriggerSilently(target, focus);
    } else focus(target);
  }
  function topOpen() {
    return (state.message && text(state.message.title) && text(state.message.text)) ||
      state.browserState.open || state.save || state.import;
  }

  function importMenuParts() {
    return {
      control: q("[data-native-import-control]"),
      trigger: q("[data-testid='toolbar-import']"),
      menu: q("[data-testid='toolbar-import-menu']"),
      items: qa("[data-native-import-source]")
    };
  }
  function clearImportMenuTimers() {
    window.clearTimeout(importMenuOpenTimer);
    window.clearTimeout(importMenuCloseTimer);
    importMenuOpenTimer = 0;
    importMenuCloseTimer = 0;
  }
  function setImportMenuOpen(value) { importMenuOpen = value === true; }
  function beginImportChild(trigger) {
    importChildActive = true;
    window.SignalAnalyserImportMenuLifecycle.beforeRelatedOverlay(
      importMenuParts(), clearImportMenuTimers, setImportMenuOpen, syncImportMenu
    );
    state.trigger = trigger || null;
  }
  function finishImportChild(trigger) {
    importChildActive = false;
    localPickerPending = false;
    window.SignalAnalyserImportMenuLifecycle.restoreTriggerSilently(trigger || state.trigger, focus);
  }
  function positionImportMenu() {
    var parts = importMenuParts();
    if (!importMenuOpen || !parts.trigger || !parts.menu) return;
    var audit=dropdownTooltipAudit();
    if (audit) return void audit.positionPopup(parts.trigger,parts.menu,196);
    var rect = parts.trigger.getBoundingClientRect();
    var width = 196;
    parts.menu.style.left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width)) + "px";
    var below = rect.bottom + 4;
    var above = rect.top - parts.menu.offsetHeight - 4;
    parts.menu.style.top = Math.max(8, below + parts.menu.offsetHeight <= window.innerHeight - 8 ? below : above) + "px";
  }
  function syncImportMenu() {
    var parts = importMenuParts();
    if (!parts.trigger || !parts.menu) return;
    parts.menu.hidden = !importMenuOpen;
    parts.trigger.setAttribute("aria-expanded", String(importMenuOpen));
    parts.items.forEach(function (item, index) {
      item.tabIndex = importMenuOpen && index === importMenuActiveIndex ? 0 : -1;
    });
    if (importMenuOpen) {
      document.dispatchEvent(new CustomEvent("signal-analyser:overlay-open"));
      dismissTransient();
      positionImportMenu();
    }
  }
  function openImportMenu(delay, intent) {
    var parts = importMenuParts();
    if (!window.SignalAnalyserImportMenuLifecycle.acceptsOpenIntent(intent || "focus", parts.trigger, importChildActive || topOpen())) return;
    window.clearTimeout(importMenuCloseTimer);
    if (importMenuOpen) return;
    window.clearTimeout(importMenuOpenTimer);
    importMenuOpenTimer = window.setTimeout(function () {
      if (!window.SignalAnalyserImportMenuLifecycle.acceptsOpenIntent(intent || "focus", parts.trigger, importChildActive || topOpen())) return;
      importMenuOpen = true;
      importMenuActiveIndex = 0;
      syncImportMenu();
    }, Math.max(0, delay || 0));
  }
  function closeImportMenu(restoreFocus, delay) {
    window.clearTimeout(importMenuOpenTimer);
    window.clearTimeout(importMenuCloseTimer);
    importMenuCloseTimer = window.setTimeout(function () {
      var parts = importMenuParts();
      importMenuOpen = false;
      syncImportMenu();
      if (restoreFocus && parts.trigger) {
        window.SignalAnalyserImportMenuLifecycle.restoreTriggerSilently(parts.trigger, focus);
      }
    }, Math.max(0, delay || 0));
  }
  function focusImportMenuItem(index) {
    var parts = importMenuParts();
    if (!parts.items.length) return;
    importMenuActiveIndex = (index + parts.items.length) % parts.items.length;
    syncImportMenu();
    focus(parts.items[importMenuActiveIndex]);
  }
  function focusImportTriggerSilently(trigger) {
    if (!trigger) return;
    window.SignalAnalyserImportMenuLifecycle.restoreTriggerSilently(trigger);
  }

  function saveTypeSelect() {
    var select = window.SignalAnalyserValueSelect;
    var options = (state.options && state.options.operations || []).map(function (item) {
      return { value:item.id, label:item.label };
    });
    if (!options.length) {
      options = Object.keys(labels).filter(function (key) { return key !== "function"; }).map(function (key) { return { value:key, label:labels[key] }; });
    }
    return select && select.markup ? select.markup({
      key: "native-save-type",
      value: state.saveType,
      label: (options.filter(function (item) { return item.value === state.saveType; })[0] || options[0]).label,
      options: options,
      testId: "native-save-type",
      ariaLabel: "Тип сохранения",
      onSelect: function (value) {
        state.saveType = value;
        state.signalPicker.open = false;
        state.signalPicker.query = "";
        applySaveDefaults();
        render();
      }
    }) : "";
  }
  function applySaveDefaults() {
    var defaults = state.options && state.options.defaults || {};
    var count = (state.saveDraft.signalNames || []).length;
    var scope = count === 1 ? "signal" : "library";
    state.saveDraft.scope = state.saveType === "session" ? "session" : scope;
    var prefix = state.saveType === "workspace" ? "workspace_" : state.saveType + "_";
    state.saveDraft.target = defaults[prefix + (scope === "signal" ? "signal_target" : "library_target")] ||
      (state.saveType === "session" ? defaults.session_target : state.saveDraft.target);
  }
  function signalPickerLabel() {
    var names = state.saveDraft.signalNames || [];
    return names.length ? names.join(", ") : "Выберите сигналы";
  }
  function signalPickerEntries() {
    var query = String(state.signalPicker.query || "").toLocaleLowerCase("ru-RU");
    return (state.options && state.options.signal_names || []).map(function (name, index) {
      return { name:name, index:index };
    }).filter(function (item) {
      return !query || item.name.toLocaleLowerCase("ru-RU").indexOf(query) >= 0;
    });
  }
  function signalPickerMarkup() {
    var open = state.signalPicker.open;
    var entries = signalPickerEntries();
    var names = state.saveDraft.signalNames || [];
    var activeEntry = entries[state.signalPicker.activeIndex];
    return "<div class='value-select-trigger select-trigger native-signal-select" + (open ? " is-open" : "") + "' data-testid='native-save-signals' aria-expanded='" + open + "'>" +
      "<input id='native-save-signals-input' class='select-trigger-input value-select-input' data-native-signals-input data-testid='save-signals-input' type='text' value='" + esc(open ? state.signalPicker.query : signalPickerLabel()) + "'" + (open ? " placeholder='Поиск'" : " readonly") + " autocomplete='off' spellcheck='false' role='combobox' aria-autocomplete='list' aria-haspopup='listbox' aria-expanded='" + open + "' aria-controls='native-save-signals-listbox' aria-label='Сигнал(ы)' aria-invalid='" + (names.length === 0) + "' title='" + esc(signalPickerLabel()) + "'>" +
      "<button class='select-trigger-arrow' type='button' tabindex='-1' data-native-signals-toggle data-testid='save-signals-arrow' aria-label='" + (open ? "Закрыть" : "Открыть") + " список: Сигнал(ы)' aria-expanded='" + open + "'></button></div>" +
      (open ? "<div class='value-select-popup native-signal-popup is-modal-owned' data-native-signals-popup data-testid='save-signals-menu'><div class='select-options' id='native-save-signals-listbox' role='listbox' aria-label='Сигнал(ы)'>" +
        (entries.length ? entries.map(function (item) {
          var selected = names.indexOf(item.name) >= 0;
          var isActive = activeEntry && activeEntry.index === item.index;
          return "<button class='select-option" + (selected ? " is-selected" : "") + (isActive ? " is-active" : "") + "' type='button' role='option' tabindex='-1' data-native-signal-index='" + item.index + "' data-testid='save-signals-option-" + item.index + "' aria-selected='" + selected + "'><span class='select-option-check' aria-hidden='true'></span><span class='select-option-label'>" + esc(item.name) + "</span></button>";
        }).join("") : "<div class='select-empty value-select-empty' data-testid='save-signals-empty' role='status'>Ничего не найдено</div>") +
        "</div></div>" : "");
  }
  function positionSignalPicker() {
    var popup = q("[data-native-signals-popup]");
    var trigger = q("[data-testid='native-save-signals']");
    if (!popup || !trigger) return;
    var audit=dropdownTooltipAudit();
    if (audit) return void audit.positionPopup(trigger,popup,trigger.getBoundingClientRect().width);
    var rect = trigger.getBoundingClientRect();
    var inset = 8;
    var width = Math.min(rect.width, Math.max(0, window.innerWidth - inset * 2));
    var left = Math.min(window.innerWidth - inset - width, Math.max(inset, rect.right - width));
    popup.style.width = width + "px";
    popup.style.left = left + "px";
    popup.style.top = rect.bottom + 4 + "px";
    var measured = popup.getBoundingClientRect();
    var top = rect.bottom + 4;
    if (top + measured.height > window.innerHeight - inset) top = rect.top - measured.height - 4;
    popup.style.top = Math.max(inset, top) + "px";
  }
  function closeSignalPicker(restoreFocus) {
    if (!state.signalPicker.open) return;
    state.signalPicker.open = false;
    state.signalPicker.query = "";
    render();
    if (restoreFocus) focus(q("[data-testid='save-signals-input']"));
  }
  function typeFields() {
    if (state.saveType === "workspace") {
      return "<div class='native-dialog-row'><label for='native-variable-name'>Имя переменной</label><input id='native-variable-name' class='control native-field' data-testid='native-save-variable-name' value='" + esc(state.saveDraft.target) + "' aria-describedby='native-variable-error'><small id='native-variable-error' class='native-field-error' hidden></small></div><label class='native-check'><input type='checkbox'" + (state.saveDraft.overwrite ? " checked" : "") + " data-testid='native-save-overwrite'> Перезаписывать переменные</label>";
    }
    return "<div class='native-dialog-row'><label for='native-save-directory'>Путь</label><div class='native-path'><input id='native-save-directory' class='control native-field' data-testid='native-save-directory' value='" + esc(state.saveDraft.target) + "'><button type='button' class='icon-button' data-native-browser-open='native-save-target' data-testid='native-save-browse' aria-label='Выбрать папку'><img src='./icons/folder-browser.svg' alt=''></button></div></div><label class='native-check'><input type='checkbox'" + (state.saveDraft.overwrite ? " checked" : "") + " data-testid='native-save-overwrite'> Перезаписать существующий файл</label>";
  }
  function layer(kind, title, body, footer, testid, attributes) {
    return "<div class='modal-layer native-modal-layer " + kind + "' data-testid='" + testid + "'" + (attributes || "") + "><section class='dialog-card native-dialog " + kind + "-dialog' role='dialog' aria-modal='true' aria-labelledby='" + kind + "-title'><header class='dialog-titlebar'><h2 id='" + kind + "-title' tabindex='-1'>" + title + "</h2><button type='button' class='icon-button dialog-close' data-native-close aria-label='Закрыть'><img src='./icons/close.svg' alt=''></button></header><div class='dialog-body native-dialog-body'>" + body + "</div><footer class='dialog-footer'>" + footer + "</footer></section></div>";
  }

  function browserExpandedPaths() {
    return state.browserState.entries.filter(function (entry) {
      return entry.kind === "directory" && entry.expanded === true;
    }).map(function (entry) { return String(entry.path || ""); }).filter(Boolean);
  }
  function browserEntryMarkup(entry) {
    var browser = state.browserState;
    var path = String(entry.path || "");
    var name = String(entry.name || "");
    var kind = entry.kind === "directory" ? "directory" : "file";
    var depth = Math.max(0, Number(entry.depth) || 0);
    var selectable = entry.selectable !== false;
    var isParent = kind === "directory" && name === "..";
    var selected = kind === "file" && browser.selected_path === path;
    var caret = kind === "directory" && !isParent ?
      "<button class='browser-caret" + (entry.expanded ? " is-expanded" : "") + "' type='button' data-native-browser-caret='" + esc(path) + "' data-testid='native-file-browser-caret' data-path='" + esc(path) + "' aria-label='" + (entry.expanded ? "Свернуть" : "Развернуть") + " папку " + esc(name) + "' aria-expanded='" + (entry.expanded === true) + "'" + (!selectable || browser.busy ? " disabled" : "") + "></button>" :
      "<span class='browser-caret-placeholder' aria-hidden='true'></span>";
    var icon = kind === "directory" ? "folder.svg" : (/\.jld2$/i.test(name) ? "jld2-file.svg" : "file.svg");
    return "<div class='browser-row is-" + kind + (selected ? " is-selected" : "") + (!selectable ? " is-disabled" : "") + "' style='padding-left:" + (16 + depth * 24) + "px' data-path='" + esc(path) + "'>" +
      caret +
      "<img src='./icons/" + icon + "' alt=''>" +
      "<button class='browser-entry-button' type='button' data-native-browser-entry='" + esc(path) + "' data-testid='native-file-browser-entry' data-path='" + esc(path) + "' title='" + esc(path) + "'" + (!selectable || browser.busy ? " disabled" : "") + ">" + esc(name) + "</button></div>";
  }
  function browserMarkup() {
    var browser = state.browserState;
    var rows = browser.entries.map(browserEntryMarkup).join("");
    if (!rows) rows = "<p class='browser-empty' data-testid='native-file-browser-empty'>В этой папке нет элементов</p>";
    if (browser.error) {
      rows = "<div class='browser-error' data-testid='native-file-browser-error'>" + esc(browser.error) + " <button class='button' type='button' data-native-browser-retry data-testid='native-file-browser-retry'" + (browser.busy ? " disabled" : "") + ">Повторить</button></div>";
    }
    return "<div class='file-browser-layer native-file-browser-layer' data-testid='native-file-browser'><section class='file-browser-card' role='dialog' aria-modal='true' aria-labelledby='native-browser-title' data-testid='file-browser-dialog'><h2 id='native-browser-title' class='visually-hidden' tabindex='-1'>Файлы Engee</h2><div class='file-browser-top-gap'></div>" +
      "<button class='file-browser-heading' type='button' data-native-browser-sort data-testid='native-file-browser-sort'" + (browser.busy ? " disabled" : "") + "><span>Имя</span><span aria-hidden='true'>" + (browser.sort_ascending ? "↑" : "↓") + "</span></button>" +
      "<div class='file-browser-list-wrap'><div class='file-browser-list' data-testid='native-file-browser-list' aria-busy='" + browser.busy + "'>" + rows + "</div>" +
      (browser.busy ? "<div class='file-browser-loading' data-testid='native-file-browser-loading'><img src='./icons/Spinner.svg' alt=''>Загрузка…</div>" : "") + "</div>" +
      "<div class='file-browser-current-path'><img src='./icons/folder.svg' alt=''><span data-testid='file-browser-path' title='" + esc(browser.current_path) + "'>" + esc(browser.current_path) + "</span></div>" +
      "<footer class='file-browser-actions'><button class='button' type='button' data-native-browser-cancel data-testid='native-file-browser-cancel'" + (browser.busy ? " disabled" : "") + ">Отменить</button><button class='button button-primary' type='button' data-native-browser-select data-testid='native-file-browser-select'" + ((!browser.busy && (browser.mode === "directory" || browser.selected_path)) ? "" : " disabled") + ">Выбрать</button></footer></section></div>";
  }

  function render() {
    var root = q("[data-testid='runtime-dialog-root']");
    if (!root) return;
    var previousBrowser = q("[data-testid='native-file-browser']");
    var previousList = q("[data-testid='native-file-browser-list']");
    var previousScroll = previousList ? previousList.scrollTop : 0;
    var previousFocus = document.activeElement && document.activeElement.dataset ? {
      testid: document.activeElement.dataset.testid || "",
      path: document.activeElement.dataset.path || ""
    } : null;
    dismissTransient();
    if (window.SignalAnalyserValueSelect) window.SignalAnalyserValueSelect.close(false);
    var html = "";
    if (state.save) {
      var names = state.saveDraft.signalNames || [];
      var functionMode = state.saveType === "function";
      var saveReady = typeof state.revision === "number" && !!String(state.saveDraft.target || "").trim() &&
        (state.saveType === "session" || names.length > 0);
      html += layer("native-save", functionMode ? "Генерация функции" : "Сохранение", "<div class='native-form'>" +
        (functionMode ? "" : "<div class='native-dialog-row'><span class='native-label'>Тип</span>" + saveTypeSelect() + "</div>") +
        (state.saveType === "session" || functionMode ? "" : "<div class='native-dialog-row native-signals-row'><label class='native-label' for='native-save-signals-input'>Сигнал(ы)</label>" + signalPickerMarkup() + "</div>" + (names.length ? "" : "<small class='native-field-error native-signal-error' data-testid='save-signals-error'>Выберите хотя бы один сигнал.</small>")) +
        typeFields() + "</div>", "<button class='button' data-native-close data-testid='native-save-cancel'>Отмена</button><button class='button button-primary'" + (!saveReady || state.busy ? " disabled" : "") + " data-testid='native-save-submit'>" + (functionMode ? "Сгенерировать" : "Сохранить") + "</button>", "native-save-dialog");
    }
    if (state.import) {
      var importReady = /\.jld2$/i.test(state.importDraft.path) && state.importDraft.replace;
      html += layer("native-import", "Импорт", "<div class='native-dialog-row native-import-path'><label for='native-import-file-path'>Файл</label><div class='native-path'><input id='native-import-file-path' class='control native-field' data-testid='native-import-path' value='" + esc(state.importDraft.path) + "'><button type='button' class='icon-button' data-native-browser-open='native-import-file' data-testid='native-import-path-browse' aria-label='Выбрать файл'><img src='./icons/folder-browser.svg' alt=''></button></div></div><label class='native-check'><input type='checkbox'" + (state.importDraft.replace ? " checked" : "") + " data-native-replace data-testid='native-import-replace'> Заменить текущую сессию</label>",
        "<button class='button' data-native-close data-testid='native-import-cancel'>Отмена</button><button class='button button-primary'" + (!importReady || state.busy ? " disabled" : "") + " data-testid='native-import-submit'>Импортировать</button>", "native-import-dialog");
    }
    if (state.browserState.open) html += browserMarkup();
    if (state.message && text(state.message.title) && text(state.message.text)) {
      html += layer("native-message", state.message.title, "<div class='alert " + state.message.kind + "'><p>" + esc(state.message.text) + "</p></div>", "<button class='button button-primary' data-native-message-close data-testid='native-message-close'>Понятно</button>", "native-message-dialog", state.message.code ? " data-error-code='" + esc(state.message.code) + "'" : "");
    }
    if (html) document.dispatchEvent(new CustomEvent("signal-analyser:overlay-open"));
    root.innerHTML = html;
    setPrimaryBusy(q("[data-testid='native-file-browser-select']"),state.browserState.busy && state.browserState.busy_action === "select");
    setPrimaryBusy(q("[data-testid='native-save-submit']"),state.save && state.busy);
    setPrimaryBusy(q("[data-testid='native-import-submit']"),state.import && state.busy);
    if (window.SignalAnalyserTask0126 && typeof window.SignalAnalyserTask0126.decorateNoHistory === "function") window.SignalAnalyserTask0126.decorateNoHistory(root);
    var parent = q("[data-testid='native-save-dialog'], [data-testid='native-import-dialog']");
    if (parent && (state.browserState.open || (state.message && text(state.message.title) && text(state.message.text)))) {
      parent.inert = true;
      parent.setAttribute("aria-hidden", "true");
      parent.classList.add("is-inert-parent");
    }
    bind(root);
    positionSignalPicker();
    reconcileDropdownTooltip(root);
    if (previousBrowser && state.browserState.open) {
      var nextList = q("[data-testid='native-file-browser-list']");
      if (nextList) nextList.scrollTop = previousScroll;
      if (previousFocus && previousFocus.testid) {
        var selector = "[data-testid='" + previousFocus.testid + "']" + (previousFocus.path ? "[data-path='" + window.CSS.escape(previousFocus.path) + "']" : "");
        focus(q(selector));
      }
    } else if (state.signalPicker.open) {
      focus(q("[data-testid='save-signals-input']"));
    } else {
      var top = q("[data-testid='native-message-dialog'], [data-testid='native-file-browser'], [data-testid='native-save-dialog'], [data-testid='native-import-dialog']");
      focus(top && top.querySelector("h2"));
    }
  }

  function applyFileBrowserState(payload) {
    var next = payload || {};
    state.browserState.open = next.open === true;
    state.browserState.root_path = String(next.root_path || "");
    state.browserState.current_path = String(next.current_path || "");
    state.browserState.parent_path = String(next.parent_path || "");
    state.browserState.selected_path = String(next.selected_path || "");
    state.browserState.sort_ascending = next.sort_ascending !== false;
    state.browserState.entries = Array.isArray(next.entries) ? next.entries.slice() : [];
  }
  function fileBrowserPayload(action, patch) {
    return Object.assign({
      action: action,
      file_browser_target: state.browserState.target,
      mode: state.browserState.mode,
      allowed_extensions: state.browserState.allowed_extensions.slice(),
      root_path: state.browserState.root_path,
      current_path: state.browserState.current_path,
      selected_path: state.browserState.selected_path,
      sort_ascending: state.browserState.sort_ascending,
      expanded_paths: browserExpandedPaths()
    }, patch || {});
  }
  function runFileBrowserAction(action, patch) {
    var browser = state.browserState;
    var api = window.SignalAnalyserApi;
    if (browser.busy) return Promise.resolve(null);
    if (!api || typeof api.nativeFileBrowserAction !== "function") {
      return Promise.reject(new Error("File browser API action is not configured"));
    }
    var token = ++state.requestToken;
    var generation = state.flowGeneration;
    browser.busy = true;
    browser.busy_action = action;
    browser.error = "";
    render();
    return api.nativeFileBrowserAction(fileBrowserPayload(action, patch)).then(function (payload) {
      if (token !== state.requestToken || !active(generation)) return null;
      applyFileBrowserState(payload);
      return payload;
    }).catch(function (error) {
      if (token === state.requestToken && active(generation)) {
        browser.error = errorText(error, "Не удалось получить содержимое папки.");
      }
      return null;
    }).finally(function () {
      if (token === state.requestToken && active(generation)) {
        browser.busy = false;
        browser.busy_action = "";
        render();
      }
    });
  }
  function browserTargetValue(target) {
    if (target === "native-import-file") return state.importDraft.path;
    return state.saveDraft.target;
  }
  function openFileBrowser(target) {
    var browser = state.browserState;
    browser.target = target;
    browser.mode = target === "native-import-file" ? "file" : "directory";
    browser.allowed_extensions = browser.mode === "file" ? [".jld2"] : [];
    browser.selected_path = "";
    browser.open = true;
    browser.entries = [];
    browser.error = "";
    return runFileBrowserAction("open", { initial_path:String(browserTargetValue(target) || "") });
  }
  function commitBrowserSelection(payload) {
    if (!payload || payload.open !== false) return;
    var selected = String(payload.selected_path || "");
    if (state.browserState.target === "native-import-file") {
      state.importDraft.path = selected;
    } else {
      var current = String(state.saveDraft.target || "");
      var fileName = current.split("/").pop();
      state.saveDraft.target = selected.replace(/\/$/, "") + (fileName ? "/" + fileName : "");
    }
  }

  function bind(root) {
    root.querySelectorAll("[data-native-close]").forEach(function (button) {
      button.onclick = function () {
        if (state.busy || state.browserState.busy) return;
        beginFlow();
        state.save = false;
        state.import = false;
        state.browserState.open = false;
        render();
        restore();
      };
    });
    var signalsInput = q("[data-native-signals-input]");
    var signalsToggle = q("[data-native-signals-toggle]");
    function openSignals() {
      state.signalPicker.open = true;
      state.signalPicker.query = "";
      state.signalPicker.activeIndex = 0;
      render();
    }
    if (signalsInput) {
      signalsInput.onclick = function () { if (!state.signalPicker.open) openSignals(); };
      signalsInput.oninput = function () {
        state.signalPicker.query = this.value;
        state.signalPicker.activeIndex = 0;
        render();
      };
      signalsInput.onkeydown = function (event) {
        var entries = signalPickerEntries();
        if (!state.signalPicker.open && ["Enter", " ", "ArrowDown", "ArrowUp"].indexOf(event.key) >= 0) {
          event.preventDefault();
          openSignals();
          return;
        }
        if (!state.signalPicker.open) return;
        if (event.key === "Escape") {
          event.preventDefault();
          closeSignalPicker(true);
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          state.signalPicker.activeIndex = (state.signalPicker.activeIndex + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % Math.max(entries.length, 1);
          render();
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          state.signalPicker.activeIndex = event.key === "Home" ? 0 : Math.max(0, entries.length - 1);
          render();
        } else if (event.key === "Enter") {
          event.preventDefault();
          var entry = entries[state.signalPicker.activeIndex];
          if (entry) toggleSignal(entry.index);
        }
      };
    }
    if (signalsToggle) signalsToggle.onclick = function () { state.signalPicker.open ? closeSignalPicker(true) : openSignals(); };
    function toggleSignal(index) {
      var name = (state.options && state.options.signal_names || [])[index];
      var names = state.saveDraft.signalNames || [];
      var at = names.indexOf(name);
      if (at >= 0) names.splice(at, 1); else names.push(name);
      state.saveDraft.signalNames = names;
      applySaveDefaults();
      render();
    }
    root.querySelectorAll("[data-native-signal-index]").forEach(function (option) {
      option.onclick = function () { toggleSignal(Number(option.dataset.nativeSignalIndex)); };
    });
    var importPath = q("[data-testid='native-import-path']");
    if (importPath) importPath.oninput = function () {
      state.importDraft.path = this.value;
      var submit = q("[data-testid='native-import-submit']");
      if (submit) submit.disabled = !(/\.jld2$/i.test(state.importDraft.path) && state.importDraft.replace && !state.busy);
    };
    var replace = q("[data-native-replace]");
    if (replace) replace.onchange = function () { state.importDraft.replace = replace.checked; render(); };
    root.querySelectorAll("[data-native-browser-open]").forEach(function (button) {
      button.onclick = function () { openFileBrowser(button.dataset.nativeBrowserOpen); };
    });
    var cancel = q("[data-native-browser-cancel]");
    if (cancel) cancel.onclick = function () {
      var target = state.browserState.target;
      runFileBrowserAction("cancel").then(function (payload) {
        if (!payload) return;
        focus(q(target === "native-import-file" ? "[data-testid='native-import-path-browse']" : "[data-testid='native-save-browse']"));
      });
    };
    var sort = q("[data-native-browser-sort]");
    if (sort) sort.onclick = function () {
      runFileBrowserAction("sort", { sort_ascending:!state.browserState.sort_ascending });
    };
    var retry = q("[data-native-browser-retry]");
    if (retry) retry.onclick = function () {
      runFileBrowserAction("path", { current_path:state.browserState.current_path });
    };
    var browserSelect = q("[data-native-browser-select]");
    if (browserSelect) browserSelect.onclick = function () {
      var target = state.browserState.target;
      runFileBrowserAction("select").then(function (payload) {
        if (!payload) return;
        commitBrowserSelection(payload);
        render();
        focus(q(target === "native-import-file" ? "[data-testid='native-import-path-browse']" : "[data-testid='native-save-browse']"));
      });
    };
    root.querySelectorAll("[data-native-browser-caret]").forEach(function (button) {
      button.onclick = function () {
        runFileBrowserAction("toggle", { toggle_path:button.dataset.nativeBrowserCaret });
      };
    });
    root.querySelectorAll("[data-native-browser-entry]").forEach(function (button) {
      button.onclick = function () {
        var path = button.dataset.nativeBrowserEntry;
        var entry = state.browserState.entries.filter(function (item) { return item.path === path; })[0];
        if (!entry || entry.selectable === false || state.browserState.busy) return;
        if (entry.kind === "directory") {
          runFileBrowserAction("path", { current_path:path });
        } else {
          state.browserState.selected_path = path;
          render();
        }
      };
    });
    var submit = q("[data-testid='native-save-submit']");
    if (submit) submit.onclick = function () {
      var target = q("[data-testid='native-save-variable-name'],[data-testid='native-save-directory']");
      var generation = state.flowGeneration;
      if (target) state.saveDraft.target = target.value;
      state.saveDraft.overwrite = !!q("[data-testid='native-save-overwrite']").checked;
      state.busy = true;
      render();
      window.SignalAnalyserApi.nativeSave({
        state_revision: state.revision,
        operation: state.saveType,
        scope: state.saveDraft.scope,
        signal_names: state.saveDraft.signalNames,
        target: state.saveDraft.target,
        overwrite: state.saveDraft.overwrite
      }).then(function (data) {
        if (!active(generation)) return;
        var generatedFunction = state.saveType === "function";
        state.save = false;
        setMessage(generatedFunction ? "Функция сгенерирована" : "Сохранение завершено", text(data && data.message) || text(data && data.target) || "Операция выполнена.", "alert-success");
      }).catch(function (error) {
        if (active(generation)) handleError(error, generation);
      }).finally(function () {
        if (active(generation)) { state.busy = false; render(); }
      });
    };
    var importSubmit = q("[data-testid='native-import-submit']");
    if (importSubmit) importSubmit.onclick = function () {
      var generation = state.flowGeneration;
      if (!/\.jld2$/i.test(state.importDraft.path) || !state.importDraft.replace) return;
      state.busy = true;
      render();
      window.SignalAnalyserApi.nativeImportSession({
        state_revision: state.revision,
        path: state.importDraft.path,
        replace: true
      }).then(function (data) {
        if (!active(generation)) return;
        state.revision = data.state_revision;
        document.dispatchEvent(new CustomEvent("native-session-imported", { detail:data }));
        state.import = false;
        setMessage("Импорт завершён", text(data && data.message) || text(data && data.path) || "Операция выполнена.", "alert-success");
      }).catch(function (error) {
        if (active(generation)) handleError(error, generation);
      }).finally(function () {
        if (active(generation)) { state.busy = false; render(); }
      });
    };
    var close = q("[data-native-message-close]");
    if (close) close.onclick = function () {
      state.message = null;
      var restoreImportTrigger = !state.save && !state.import && !state.browserState.open && importChildActive;
      render();
      if (restoreImportTrigger) restore();
    };
  }

  function acceptOptions(data) {
    state.options = data;
    state.revision = data.state_revision;
  }
  function loadOptions() {
    var api = window.SignalAnalyserApi;
    var token = ++state.optionsToken;
    var generation = state.flowGeneration;
    if (!api) return Promise.resolve(null);
    return api.nativeSaveOptions().then(function (data) {
      if (token !== state.optionsToken || !active(generation)) return null;
      acceptOptions(data);
      state.saveType = data.default_operation || "workspace";
      state.saveDraft.signalNames = data.selected_signal ? [data.selected_signal] : [];
      applySaveDefaults();
      render();
      return data;
    }).catch(function (error) {
      if (token !== state.optionsToken || !active(generation)) return null;
      setMessage("Ошибка", errorText(error, "Не удалось загрузить параметры сохранения."), "alert-error");
      render();
      return null;
    });
  }
  function openEngeeImport(trigger) {
    beginImportChild(trigger);
    beginFlow();
    state.trigger = trigger;
    state.save = false;
    state.import = false;
    state.browserState.open = false;
    state.signalPicker.open = false;
    focusImportTriggerSilently(trigger);
    var token = ++state.optionsToken;
    var generation = state.flowGeneration;
    var api = window.SignalAnalyserApi;
    if (!api) return;
    api.nativeSaveOptions().then(function (data) {
      if (token !== state.optionsToken || !active(generation)) return;
      acceptOptions(data);
      var defaults = data.defaults || {};
      state.importDraft.path = String(defaults.import_session_target || defaults.session_target || "");
      state.importDraft.replace = defaults.replace !== false;
      state.import = true;
      render();
    }).catch(function (error) {
      if (token !== state.optionsToken || !active(generation)) return;
      setMessage("Ошибка", errorText(error, "Не удалось загрузить параметры импорта."), "alert-error");
      render();
    });
  }
  function openSignalFunction(signalName, trigger) {
    beginFlow();
    state.trigger = trigger || null;
    state.save = true;
    state.import = false;
    state.browserState.open = false;
    state.signalPicker.open = false;
    state.signalPicker.query = "";
    state.saveType = "function";
    render();
    var token = ++state.optionsToken;
    var generation = state.flowGeneration;
    var api = window.SignalAnalyserApi;
    if (!api) return;
    api.nativeSaveOptions().then(function (data) {
      if (token !== state.optionsToken || !active(generation)) return;
      acceptOptions(data);
      if ((data.signal_names || []).indexOf(signalName) < 0) throw new Error("Сигнал не найден");
      state.saveType = "function";
      state.saveDraft.signalNames = [signalName];
      applySaveDefaults();
      render();
    }).catch(function (error) {
      if (token !== state.optionsToken || !active(generation)) return;
      setMessage("Ошибка", errorText(error, "Не удалось открыть генерацию функции."), "alert-error");
      render();
    });
  }
  function openLocalImport(trigger) {
    beginImportChild(trigger);
    beginFlow();
    state.trigger = trigger;
    state.save = false;
    state.import = false;
    state.browserState.open = false;
    render();
    localPickerPending = true;
    window.addEventListener("focus", function settleLocalPickerReturn() {
      window.setTimeout(function () {
        var dialog = q("[data-testid='session-package-import-dialog']");
        if (localPickerPending && !dialog) finishImportChild(trigger);
      }, 0);
    }, { once:true });
    if (typeof window.SignalAnalyserOpenSessionFilePicker === "function") {
      window.SignalAnalyserOpenSessionFilePicker(trigger);
      return;
    }
    var input = q("[data-testid='native-local-file-input'],[data-testid='session-package-file-input']");
    if (input) {
      input.value = "";
      input.click();
    }
  }
  function handleError(error, generation) {
    if (!active(generation)) return;
    var code = errorCode(error);
    if (error && error.status === 409 && code === "stale_state") {
      loadOptions();
      setMessage("Состояние обновлено", "Данные изменились. Проверьте форму и повторите действие.", "alert-warning", code);
    } else if (error && error.status === 409 && code === "target_exists") {
      var workspace = state.saveType === "workspace";
      setMessage(workspace ? "Переменная уже существует" : "Файл уже существует", workspace ?
        "Укажите другое имя переменной или включите перезапись и повторите сохранение." :
        "Укажите другой путь или включите перезапись и повторите сохранение.", "alert-warning", code);
    } else {
      setMessage("Ошибка", errorText(error, "Операция не выполнена."), "alert-error", code);
    }
    render();
  }

  document.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "touch") return;
    if (event.target.closest && event.target.closest("[data-native-import-control]")) openImportMenu(120, "pointerenter");
  }, true);
  document.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "touch") return;
    var control = event.target.closest && event.target.closest("[data-native-import-control]");
    if (control && (!event.relatedTarget || !control.contains(event.relatedTarget))) closeImportMenu(false, 180);
  }, true);
  document.addEventListener("focusin", function (event) {
    if (event.target.closest && event.target.closest("[data-testid='toolbar-import']")) openImportMenu(0, "focus");
  }, true);
  document.addEventListener("focusout", function (event) {
    var control = event.target.closest && event.target.closest("[data-native-import-control]");
    if (control && (!event.relatedTarget || !control.contains(event.relatedTarget))) {
      closeImportMenu(false, 0);
      if (!importChildActive) window.SignalAnalyserImportMenuLifecycle.onTriggerBlur(importMenuParts().trigger);
    }
  }, true);
  document.addEventListener("pointerdown", function (event) {
    if (state.signalPicker.open && !event.target.closest("[data-testid='native-save-signals'], [data-native-signals-popup]")) closeSignalPicker(false);
    if (importMenuOpen && !event.target.closest("[data-native-import-control]")) closeImportMenu(false, 0);
  }, true);
  document.addEventListener("change", function (event) {
    var input = event.target && event.target.closest && event.target.closest("[data-testid='native-local-file-input'],[data-testid='session-package-file-input']");
    if (!input || !localPickerPending) return;
    localPickerPending = false;
    importChildActive = true;
    window.SignalAnalyserImportMenuLifecycle.beforeRelatedOverlay(
      importMenuParts(), clearImportMenuTimers, setImportMenuOpen, syncImportMenu
    );
  }, true);
  document.addEventListener("cancel", function (event) {
    var input = event.target && event.target.closest && event.target.closest("[data-testid='native-local-file-input'],[data-testid='session-package-file-input']");
    if (input && localPickerPending) finishImportChild(state.trigger || importMenuParts().trigger);
  }, true);
  document.addEventListener("click", function (event) {
    var source = event.target.closest && event.target.closest("[data-native-import-source]");
    if (source) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var trigger = q("[data-testid='toolbar-import']");
      if (source.dataset.nativeImportSource === "engee") openEngeeImport(trigger);
      else openLocalImport(trigger);
      return;
    }
    var button = event.target.closest && event.target.closest("[data-testid='toolbar-save'],[data-testid='toolbar-import']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.dataset.testid === "toolbar-import") {
      clearImportMenuTimers();
      if (!window.SignalAnalyserImportMenuLifecycle.acceptsOpenIntent("click", button, importChildActive || topOpen())) return;
      importMenuOpen = true;
      importMenuActiveIndex = 0;
      syncImportMenu();
      focusImportMenuItem(0);
      return;
    }
    closeImportMenu(false, 0);
    beginFlow();
    state.trigger = button;
    state.save = true;
    state.import = false;
    state.browserState.open = false;
    state.saveType = "workspace";
    state.signalPicker.open = false;
    state.signalPicker.query = "";
    render();
    loadOptions();
  }, true);
  document.addEventListener("keydown", function (event) {
    var parts = importMenuParts();
    var inImportControl = event.target.closest && event.target.closest("[data-native-import-control]");
    if (inImportControl && (importMenuOpen || event.target === parts.trigger)) {
      if (event.key === "Escape" && importMenuOpen) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeImportMenu(true, 0);
        return;
      }
      if (event.target === parts.trigger && ["Enter", " "].indexOf(event.key) >= 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!window.SignalAnalyserImportMenuLifecycle.acceptsOpenIntent("keyboard", parts.trigger, importChildActive || topOpen())) return;
        clearImportMenuTimers();
        importMenuOpen = true;
        importMenuActiveIndex = 0;
        syncImportMenu();
        focusImportMenuItem(0);
        return;
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].indexOf(event.key) >= 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!importMenuOpen) {
          if (!window.SignalAnalyserImportMenuLifecycle.acceptsOpenIntent("keyboard", parts.trigger, importChildActive || topOpen())) return;
          clearImportMenuTimers();
          importMenuOpen = true;
          importMenuActiveIndex = event.key === "ArrowUp" || event.key === "End" ? 1 : 0;
          syncImportMenu();
        } else if (event.key === "Home") importMenuActiveIndex = 0;
        else if (event.key === "End") importMenuActiveIndex = parts.items.length - 1;
        else importMenuActiveIndex += event.key === "ArrowDown" ? 1 : -1;
        focusImportMenuItem(importMenuActiveIndex);
        return;
      }
    }
    if (event.key !== "Escape" || !topOpen() || state.busy || state.browserState.busy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state.message) {
      state.message = null;
    } else if (state.browserState.open) {
      var browserTarget = state.browserState.target;
      runFileBrowserAction("cancel").then(function (payload) {
        if (payload) focus(q(browserTarget === "native-import-file" ? "[data-testid='native-import-path-browse']" : "[data-testid='native-save-browse']"));
      });
      return;
    } else if (state.signalPicker.open) {
      closeSignalPicker(true);
      return;
    } else {
      beginFlow();
      state.save = false;
      state.import = false;
      restore();
    }
    render();
  }, true);
  window.addEventListener("resize", function () { positionSignalPicker(); positionImportMenu(); });
  window.addEventListener("scroll", function () { positionSignalPicker(); if (importMenuOpen) closeImportMenu(false, 0); }, true);
  syncImportMenu();
  if (window.MutationObserver) {
    new window.MutationObserver(function () {
      var dialogOpen = !!q("[data-testid='session-package-import-dialog']");
      if (dialogOpen) {
        localPickerPending = false;
        importChildActive = true;
        window.SignalAnalyserImportMenuLifecycle.beforeRelatedOverlay(
          importMenuParts(), clearImportMenuTimers, setImportMenuOpen, syncImportMenu
        );
      } else if (sessionImportDialogWasOpen) finishImportChild(state.trigger || importMenuParts().trigger);
      sessionImportDialogWasOpen = dialogOpen;
    }).observe(document.body, { childList:true, subtree:true });
  }
  window.SignalAnalyserNativeSessionIo = {
    state: state,
    render: render,
    openSignalFunction: openSignalFunction,
    showMessage: function (title, value, kind) { setMessage(title, value, kind); render(); }
  };
})(window, document);
