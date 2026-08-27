(function registerSignalAnalyserValueSelect(window, document) {
  "use strict";

  var registry = {};
  var state = {
    logicalKey:null,
    query:"",
    activeValue:null,
    restoreKey:null,
    restoreNode:null
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character];
    });
  }

  function popup() { return document.querySelector("[data-value-select-popup]"); }
  function optionsHost() { var node=popup(); return node && node.querySelector("[data-value-select-options]"); }
  function currentConfig() { return state.logicalKey && registry[state.logicalKey]; }
  function normalize(value) { return String(value == null ? "" : value).toLocaleLowerCase("ru-RU"); }
  function stableId(key) { return String(key).replace(/[^a-zA-Z0-9_-]/g, "-"); }
  function optionId(key, index) { return "value-select-option-" + stableId(key) + "-" + index; }
  function triggerFor(key) {
    return Array.prototype.slice.call(document.querySelectorAll("[data-value-select-key]")).filter(function (node) {
      return node.dataset.valueSelectKey === key;
    })[0] || null;
  }
  function inputFor(key) {
    var trigger=triggerFor(key);
    return trigger && trigger.querySelector("[data-value-select-input]");
  }
  function focusTargetFor(key) {
    var config=registry[key], trigger=triggerFor(key);
    return config && config.buttonTrigger ? trigger : inputFor(key);
  }
  function optionIndex(config, value) {
    if (!config || value == null) return -1;
    for (var index=0; index<config.options.length; index++) {
      if (config.options[index].value === value) return index;
    }
    return -1;
  }

  function register(config) {
    if (!config || !config.key) throw new Error("Value selector requires a stable key.");
    var key=String(config.key);
    registry[key] = {
      logicalKey:key,
      selectedValue:String(config.value == null ? "" : config.value),
      selectedLabel:String(config.label == null ? "" : config.label),
      options:(config.options || []).map(function (option) {
        return typeof option === "object" ? {
          value:String(option.value == null ? "" : option.value),
          label:String(option.label == null ? option.value : option.label),
          disabled:!!option.disabled,
          icon:String(option.icon == null ? "" : option.icon)
        } : { value:String(option), label:String(option), disabled:false, icon:"" };
      }),
      disabled:!!config.disabled,
      buttonTrigger:config.buttonTrigger === true || key === "signal-operation-type",
      className:config.className || "",
      testId:config.testId || ("value-select-trigger-" + stableId(key)),
      ariaLabel:config.ariaLabel || config.label || "Выбор значения",
      onSelect:typeof config.onSelect === "function" ? config.onSelect : function () {}
    };
    if (state.logicalKey === key) renderOptions();
    return registry[key];
  }

  function inputMarkup(config, open) {
    var activeIndex=state.activeValue == null ? -1 : optionIndex(config, state.activeValue);
    var value=open ? state.query : config.selectedLabel;
    return "<input class='select-trigger-input value-select-input' type='text' value='" + esc(value) + "'" +
      (open ? " placeholder='Поиск'" : " readonly") + (config.disabled ? " disabled" : "") +
      " autocomplete='off' spellcheck='false' role='combobox' aria-autocomplete='list' aria-haspopup='listbox'" +
      " aria-expanded='" + String(open) + "' aria-controls='value-select-listbox'" +
      (open && activeIndex >= 0 ? " aria-activedescendant='" + optionId(config.logicalKey, activeIndex) + "'" : "") +
      " aria-label='" + esc(config.ariaLabel) + "' title='" + esc(config.selectedLabel) + "'" +
      " data-value-select-input data-testid='" + esc(config.testId) + "-input'>";
  }

  function selectedOption(config) {
    var index=optionIndex(config,config.selectedValue);
    return index >= 0 ? config.options[index] : null;
  }

  function iconMarkup(source,className,attribute,value) {
    if (!source) return "";
    return "<img class='" + esc(className) + "' src='" + esc(source) + "' alt='' aria-hidden='true' " + attribute + "='" + esc(value) + "'>";
  }

  function triggerMarkup(config) {
    var open=state.logicalKey === config.logicalKey, selected=selectedOption(config), icon=selected && selected.icon;
    if (config.buttonTrigger) {
      var activeIndex=state.activeValue == null ? -1 : optionIndex(config, state.activeValue);
      return "<button class='value-select-trigger select-trigger is-button-trigger " + esc(config.className) + (icon ? " has-leading-icon" : "") + (open ? " is-open" : "") + "' type='button'" +
        " data-value-select-key='" + esc(config.logicalKey) + "' data-value-select-disabled='" + String(config.disabled) + "'" +
        " data-testid='" + esc(config.testId) + "' role='combobox' aria-haspopup='listbox' aria-expanded='" + String(open) + "'" +
        " aria-controls='value-select-listbox' aria-label='" + esc(config.ariaLabel) + "' aria-disabled='" + String(config.disabled) + "'" +
        (open && activeIndex >= 0 ? " aria-activedescendant='" + optionId(config.logicalKey, activeIndex) + "'" : "") +
        " title='" + esc(config.selectedLabel) + "'" + (config.disabled ? " disabled" : "") + ">" +
        iconMarkup(icon,"select-trigger-icon","data-value-select-trigger-icon",selected ? selected.value : "") +
        "<span class='select-trigger-label' data-value-select-trigger-label>" + esc(config.selectedLabel) + "</span>" +
        "<span class='select-trigger-arrow' aria-hidden='true' data-value-select-arrow></span></button>";
    }
    return "<div class='value-select-trigger select-trigger " + esc(config.className) + (icon ? " has-leading-icon" : "") + (open ? " is-open" : "") + "'" +
      " data-value-select-key='" + esc(config.logicalKey) + "' data-value-select-disabled='" + String(config.disabled) + "'" +
      " data-testid='" + esc(config.testId) + "' aria-expanded='" + String(open) + "' aria-disabled='" + String(config.disabled) + "'" +
      " title='" + esc(config.selectedLabel) + "'>" + iconMarkup(icon,"select-trigger-icon","data-value-select-trigger-icon",selected ? selected.value : "") + inputMarkup(config, open) +
      "<button class='select-trigger-arrow' type='button' tabindex='-1' aria-label='" + esc((open ? "Закрыть список: " : "Открыть список: ") + config.ariaLabel) + "'" +
      " aria-expanded='" + String(open) + "' aria-controls='value-select-listbox' data-value-select-arrow data-testid='" + esc(config.testId) + "-arrow'" +
      (config.disabled ? " disabled" : "") + "></button></div>";
  }

  function setAttribute(node, name, value) {
    if (value == null || value === false) node.removeAttribute(name);
    else node.setAttribute(name, value === true ? "" : String(value));
  }

  function applyTrigger(node, config) {
    if (!node) return node;
    if (config.buttonTrigger) {
      if (String(node.tagName || "").toLowerCase() !== "button" && document.createElement && node.parentNode) {
        var buttonReplacement=document.createElement("button");
        node.parentNode.replaceChild(buttonReplacement, node);
        node=buttonReplacement;
      }
      var buttonOpen=state.logicalKey === config.logicalKey, buttonSelected=selectedOption(config), buttonIcon=buttonSelected && buttonSelected.icon;
      node.className=("value-select-trigger select-trigger is-button-trigger " + (config.className || "") + (buttonIcon ? " has-leading-icon" : "") + (buttonOpen ? " is-open" : "")).trim();
      node.type="button";
      node.disabled=config.disabled;
      node.dataset.valueSelectKey=config.logicalKey;
      node.dataset.valueSelectDisabled=String(config.disabled);
      node.setAttribute("data-testid", config.testId);
      node.setAttribute("role", "combobox");
      node.setAttribute("aria-haspopup", "listbox");
      node.setAttribute("aria-expanded", String(buttonOpen));
      node.setAttribute("aria-controls", "value-select-listbox");
      node.setAttribute("aria-label", config.ariaLabel);
      node.setAttribute("aria-disabled", String(config.disabled));
      node.title=config.selectedLabel;
      var buttonActiveIndex=state.activeValue == null ? -1 : optionIndex(config, state.activeValue);
      setAttribute(node, "aria-activedescendant", buttonOpen && buttonActiveIndex >= 0 ? optionId(config.logicalKey, buttonActiveIndex) : null);
      node.innerHTML=iconMarkup(buttonIcon,"select-trigger-icon","data-value-select-trigger-icon",buttonSelected ? buttonSelected.value : "") +
        "<span class='select-trigger-label' data-value-select-trigger-label>" + esc(config.selectedLabel) + "</span>" +
        "<span class='select-trigger-arrow' aria-hidden='true' data-value-select-arrow></span>";
      return node;
    }
    if (String(node.tagName || "").toLowerCase() === "button" && document.createElement && node.parentNode) {
      var replacement=document.createElement("div");
      node.parentNode.replaceChild(replacement, node);
      node=replacement;
    }
    var open=state.logicalKey === config.logicalKey, selected=selectedOption(config), iconSource=selected && selected.icon;
    node.className=("value-select-trigger select-trigger " + (config.className || "") + (iconSource ? " has-leading-icon" : "") + (open ? " is-open" : "")).trim();
    node.dataset.valueSelectKey=config.logicalKey;
    node.dataset.valueSelectDisabled=String(config.disabled);
    node.dataset.testid=config.testId;
    node.setAttribute("data-testid", config.testId);
    node.setAttribute("aria-expanded", String(open));
    node.setAttribute("aria-disabled", String(config.disabled));
    node.title=config.selectedLabel;
    var input=node.querySelector && node.querySelector("[data-value-select-input]");
    var arrow=node.querySelector && node.querySelector("[data-value-select-arrow]");
    if (!input || !arrow) {
      node.innerHTML=iconMarkup(iconSource,"select-trigger-icon","data-value-select-trigger-icon",selected ? selected.value : "") + inputMarkup(config, open) + "<button class='select-trigger-arrow' type='button' tabindex='-1' data-value-select-arrow></button>";
      input=node.querySelector("[data-value-select-input]");
      arrow=node.querySelector("[data-value-select-arrow]");
    }
    var icon=node.querySelector && node.querySelector("[data-value-select-trigger-icon]");
    if (iconSource && !icon && document.createElement) {
      icon=document.createElement("img");
      icon.className="select-trigger-icon";
      icon.alt="";
      icon.setAttribute("aria-hidden","true");
      icon.setAttribute("data-value-select-trigger-icon",selected ? selected.value : "");
      node.insertBefore(icon,input);
    }
    if (iconSource && icon) {
      icon.src=iconSource;
      icon.alt="";
      icon.setAttribute("aria-hidden","true");
      icon.setAttribute("data-value-select-trigger-icon",selected ? selected.value : "");
    } else if (!iconSource && icon && icon.parentNode) icon.parentNode.removeChild(icon);
    if (input) {
      var displayed=open ? state.query : config.selectedLabel;
      input.className="select-trigger-input value-select-input";
      input.dataset.testid=config.testId + "-input";
      input.setAttribute("data-testid", config.testId + "-input");
      input.disabled=config.disabled;
      input.readOnly=!open;
      input.autocomplete="off";
      input.spellcheck=false;
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-haspopup", "listbox");
      input.setAttribute("aria-expanded", String(open));
      input.setAttribute("aria-controls", "value-select-listbox");
      input.setAttribute("aria-label", config.ariaLabel);
      input.title=config.selectedLabel;
      setAttribute(input, "placeholder", open ? "Поиск" : null);
      var activeIndex=state.activeValue == null ? -1 : optionIndex(config, state.activeValue);
      setAttribute(input, "aria-activedescendant", open && activeIndex >= 0 ? optionId(config.logicalKey, activeIndex) : null);
      if (input.value !== displayed) input.value=displayed;
    }
    if (arrow) {
      arrow.className="select-trigger-arrow";
      arrow.type="button";
      arrow.tabIndex=-1;
      arrow.disabled=config.disabled;
      arrow.dataset.testid=config.testId + "-arrow";
      arrow.setAttribute("data-testid", config.testId + "-arrow");
      arrow.setAttribute("aria-label", (open ? "Закрыть список: " : "Открыть список: ") + config.ariaLabel);
      arrow.setAttribute("aria-expanded", String(open));
      arrow.setAttribute("aria-controls", "value-select-listbox");
    }
    return node;
  }

  function configure(node, config) { return applyTrigger(node, register(config)); }
  function markup(config) { return triggerMarkup(register(config)); }

  function filteredOptions() {
    var config=currentConfig(), query=normalize(state.query);
    if (!config) return [];
    return config.options.map(function (option, index) { return { option:option, index:index }; }).filter(function (entry) {
      return !query || normalize(entry.option.label).indexOf(query) >= 0;
    });
  }
  function enabledFiltered() { return filteredOptions().filter(function (entry) { return !entry.option.disabled; }); }
  function selectedEnabledValue(config) {
    var selected=config.options.filter(function (option) { return option.value === config.selectedValue && !option.disabled; })[0];
    return selected ? selected.value : null;
  }

  function setActive(value, scroll) {
    state.activeValue=value == null ? null : String(value);
    var config=currentConfig(), input=state.logicalKey && focusTargetFor(state.logicalKey), host=optionsHost();
    var activeIndex=optionIndex(config, state.activeValue);
    if (input) setAttribute(input, "aria-activedescendant", activeIndex >= 0 ? optionId(config.logicalKey, activeIndex) : null);
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll("[data-value-select-option-index]"), function (node) {
      var index=Number(node.dataset.valueSelectOptionIndex);
      var active=!!config && index >= 0 && config.options[index] && config.options[index].value === state.activeValue;
      node.classList.toggle("is-active", active);
      if (active && scroll) node.scrollIntoView({ block:"nearest" });
    });
  }

  function renderOptions() {
    var config=currentConfig(), host=optionsHost();
    if (!config || !host) return;
    var entries=filteredOptions();
    if (!entries.length) {
      host.innerHTML="<div class='select-empty value-select-empty' data-testid='value-select-empty' role='status'>Ничего не найдено</div>";
      setActive(null, false);
      return;
    }
    var enabled=entries.filter(function (entry) { return !entry.option.disabled; });
    var activeVisible=enabled.some(function (entry) { return entry.option.value === state.activeValue; });
    if (!activeVisible) state.activeValue=enabled[0] ? enabled[0].option.value : null;
    host.innerHTML=entries.map(function (entry) {
      var option=entry.option, selected=option.value === config.selectedValue;
      return "<button class='select-option" + (option.icon ? " has-leading-icon" : "") + (selected ? " is-selected" : "") + (option.value === state.activeValue ? " is-active" : "") + "'" +
        " type='button' role='option' tabindex='-1' id='" + optionId(config.logicalKey, entry.index) + "'" +
        " data-value-select-option-index='" + entry.index + "' data-testid='value-select-option-" + entry.index + "'" +
        " aria-selected='" + String(selected) + "' title='" + esc(option.label) + "'" +
        (option.disabled ? " disabled aria-disabled='true'" : "") +
        "><span class='select-option-check' aria-hidden='true'></span>" + iconMarkup(option.icon,"select-option-icon","data-value-select-option-icon",option.value) + "<span class='select-option-label'>" + esc(option.label) + "</span></button>";
    }).join("");
    setActive(state.activeValue, false);
  }

  function position() {
    var menu=popup(), trigger=state.logicalKey && triggerFor(state.logicalKey);
    if (!menu || menu.hidden || !trigger) return;
    var rect=trigger.getBoundingClientRect(), visual=window.visualViewport;
    var viewportLeft=visual ? visual.offsetLeft : 0, viewportTop=visual ? visual.offsetTop : 0;
    var viewportWidth=visual ? visual.width : Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    var viewportHeight=visual ? visual.height : Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
    var inset=8, availableWidth=Math.max(0, viewportWidth - inset * 2);
    var width=rect.width > availableWidth ? availableWidth : rect.width;
    var minLeft=viewportLeft + inset, maxLeft=viewportLeft + viewportWidth - inset - width;
    var left=Math.min(maxLeft, Math.max(minLeft, rect.right - width));
    menu.style.width=width + "px";
    menu.style.left=left + "px";
    menu.style.top=(rect.bottom + 4) + "px";
    var measured=menu.getBoundingClientRect(), bottom=viewportTop + viewportHeight - inset;
    var top=rect.bottom + 4;
    if (top + measured.height > bottom) top=rect.top - measured.height - 4;
    top=Math.min(bottom - measured.height, Math.max(viewportTop + inset, top));
    menu.style.top=top + "px";
  }

  function focusInput(key, clearRestore) {
    var input=focusTargetFor(key);
    if (!input) return false;
    input.focus();
    if (typeof input.setSelectionRange === "function" && state.logicalKey === key) input.setSelectionRange(input.value.length, input.value.length);
    if (clearRestore) { state.restoreKey=null; state.restoreNode=null; }
    return true;
  }

  function close(options) {
    var menu=popup(), key=state.logicalKey;
    if (!key) return;
    state.logicalKey=null;
    state.query="";
    state.activeValue=null;
    if (menu) {
      menu.hidden=true;
      menu.innerHTML="";
      menu.style.left="";
      menu.style.top="";
      menu.style.width="";
      menu.classList.remove("is-modal-owned");
    }
    var config=registry[key], trigger=triggerFor(key);
    if (trigger && config) applyTrigger(trigger, config);
    if (options && options.restoreFocus) focusInput(key, true);
    else if (!options || !options.keepRestore) { state.restoreKey=null; state.restoreNode=null; }
  }

  function open(trigger, direction) {
    var key=trigger && trigger.dataset.valueSelectKey, config=key && registry[key];
    if (!config || config.disabled) return;
    if (state.logicalKey === key) return;
    if (state.logicalKey) close({ restoreFocus:false });
    state.logicalKey=key;
    state.query="";
    state.restoreKey=null;
    state.restoreNode=null;
    var enabled=config.options.filter(function (option) { return !option.disabled; });
    var selected=selectedEnabledValue(config);
    state.activeValue=direction === "up" ? (enabled.length ? enabled[enabled.length - 1].value : null) : (selected != null ? selected : (enabled[0] ? enabled[0].value : null));
    applyTrigger(trigger, config);
    var menu=popup();
    if (!menu) return;
    menu.innerHTML="<div class='select-options' id='value-select-listbox' role='listbox' aria-label='" + esc(config.ariaLabel) + "' data-value-select-options data-testid='value-select-options'></div>";
    menu.classList.toggle("is-modal-owned", !!trigger.closest(".native-modal-layer"));
    menu.hidden=false;
    renderOptions();
    position();
    var input=focusTargetFor(key);
    if (input) {
      input.focus();
      if (typeof input.setSelectionRange === "function") input.setSelectionRange(0, 0);
    }
    window.requestAnimationFrame(function () {
      if (state.logicalKey !== key) return;
      var current=focusTargetFor(key);
      if (current && document.activeElement !== current) current.focus();
      if (current && typeof current.setSelectionRange === "function") current.setSelectionRange(0, 0);
    });
  }

  function move(kind) {
    var enabled=enabledFiltered();
    if (!enabled.length) return setActive(null, false);
    if (kind === "home") return setActive(enabled[0].option.value, true);
    if (kind === "end") return setActive(enabled[enabled.length - 1].option.value, true);
    var values=enabled.map(function (entry) { return entry.option.value; });
    var current=values.indexOf(state.activeValue);
    var next=kind === "up" ? (current - 1 + values.length) % values.length : (current + 1 + values.length) % values.length;
    setActive(values[next], true);
  }

  function choose(index) {
    var config=currentConfig(), option=config && config.options[index];
    if (!config || !option || option.disabled) return;
    var key=config.logicalKey, value=option.value;
    var original=focusTargetFor(key);
    config.selectedValue=value;
    config.selectedLabel=option.label;
    state.restoreKey=key;
    state.restoreNode=original;
    close({ restoreFocus:false, keepRestore:true });
    try {
      config.onSelect(value);
    } finally {
      window.requestAnimationFrame(function () {
        if (state.restoreKey !== key) return;
        var replacement=focusTargetFor(key);
        if (!replacement) return;
        replacement.focus();
        if (replacement !== state.restoreNode) { state.restoreKey=null; state.restoreNode=null; }
      });
    }
  }

  document.addEventListener("click", function (event) {
    var option=event.target.closest && event.target.closest("[data-value-select-option-index]");
    if (option && popup() && popup().contains(option)) {
      event.preventDefault();
      choose(Number(option.dataset.valueSelectOptionIndex));
      return;
    }
    var trigger=event.target.closest && event.target.closest("[data-value-select-key]");
    if (!trigger) return;
    var config=registry[trigger.dataset.valueSelectKey];
    if (!config || config.disabled) return;
    if (config.buttonTrigger) {
      event.preventDefault();
      if (state.logicalKey === config.logicalKey) close({ restoreFocus:true });
      else open(trigger, "down");
      return;
    }
    if (event.target.closest("[data-value-select-arrow]")) {
      event.preventDefault();
      if (state.logicalKey === config.logicalKey) close({ restoreFocus:true });
      else open(trigger, "down");
      return;
    }
    if (event.target.closest("[data-value-select-input]")) {
      if (state.logicalKey !== config.logicalKey) open(trigger, "down");
      return;
    }
    if (state.logicalKey !== config.logicalKey) open(trigger, "down");
  });

  document.addEventListener("input", function (event) {
    if (!event.target.matches || !event.target.matches("[data-value-select-input]")) return;
    var trigger=event.target.closest("[data-value-select-key]");
    if (!trigger || state.logicalKey !== trigger.dataset.valueSelectKey) return;
    state.query=event.target.value;
    renderOptions();
    position();
  });

  document.addEventListener("pointermove", function (event) {
    var option=event.target.closest && event.target.closest("[data-value-select-option-index]");
    if (!option || option.disabled || !popup() || !popup().contains(option)) return;
    var config=currentConfig(), index=Number(option.dataset.valueSelectOptionIndex);
    if (config && config.options[index]) setActive(config.options[index].value, false);
  });

  document.addEventListener("pointerdown", function (event) {
    var option=event.target.closest && event.target.closest("[data-value-select-option-index]");
    if (option && popup() && popup().contains(option)) event.preventDefault();
    var menu=popup(), trigger=event.target.closest && event.target.closest("[data-value-select-key]");
    if (state.restoreKey && (!trigger || trigger.dataset.valueSelectKey !== state.restoreKey)) { state.restoreKey=null; state.restoreNode=null; }
    if (state.logicalKey && menu && !menu.contains(event.target) && !trigger) close({ restoreFocus:false });
  });

  document.addEventListener("keydown", function (event) {
    var input=event.target.matches && event.target.matches("[data-value-select-input]") ? event.target : null;
    var trigger=input && input.closest("[data-value-select-key]");
    if (!trigger && event.target.matches && event.target.matches("[data-value-select-key].is-button-trigger")) trigger=event.target;
    if (!trigger) return;
    var configForTrigger=registry[trigger.dataset.valueSelectKey];
    if (!input && !(configForTrigger && configForTrigger.buttonTrigger)) return;
    var key=trigger.dataset.valueSelectKey;
    if (state.restoreKey && state.restoreKey !== key) { state.restoreKey=null; state.restoreNode=null; }
    if (state.logicalKey !== key) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].indexOf(event.key) >= 0) {
        event.preventDefault();
        open(trigger, event.key === "ArrowUp" ? "up" : "down");
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowUp" ? "up" : "down");
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      move(event.key.toLowerCase());
    } else if (event.key === "Enter" || (event.key === " " && configForTrigger && configForTrigger.buttonTrigger)) {
      event.preventDefault();
      var config=currentConfig(), index=optionIndex(config, state.activeValue);
      if (index >= 0) choose(index);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close({ restoreFocus:true });
    } else if (event.key === "Tab") {
      close({ restoreFocus:false });
    }
  });

  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", position);
    window.visualViewport.addEventListener("scroll", position);
  }

  window.SignalAnalyserValueSelect = {
    register:register,
    configure:configure,
    markup:markup,
    close:function (restoreFocus) { close({ restoreFocus:!!restoreFocus }); },
    reposition:position,
    reconcile:function () {
      if (state.logicalKey && !triggerFor(state.logicalKey)) close({ restoreFocus:false });
      Object.keys(registry).forEach(function (key) {
        var trigger=triggerFor(key);
        if (trigger) applyTrigger(trigger, registry[key]);
        else if (key !== state.logicalKey && key !== state.restoreKey) delete registry[key];
      });
      if (state.logicalKey) { renderOptions(); position(); }
      if (state.restoreKey) {
        var replacement=focusTargetFor(state.restoreKey);
        if (replacement && replacement !== state.restoreNode) {
          replacement.focus();
          state.restoreKey=null;
          state.restoreNode=null;
        }
      }
    },
    state:function () {
      var config=currentConfig();
      return {
        logicalKey:state.logicalKey,
        selectedValue:config ? config.selectedValue : null,
        query:state.query,
        activeValue:state.activeValue,
        key:state.logicalKey,
        activeIndex:optionIndex(config, state.activeValue)
      };
    }
  };
})(window, document);
