(function registerSignalAnalyserValueSelect(window, document) {
  "use strict";

  var registry = {};
  var state = { key:null, query:"", activeIndex:-1, restoreKey:null };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character];
    });
  }

  function popup() { return document.querySelector("[data-value-select-popup]"); }
  function searchInput() { var node=popup(); return node && node.querySelector("[data-value-select-search]"); }
  function optionsHost() { var node=popup(); return node && node.querySelector("[data-value-select-options]"); }
  function currentConfig() { return state.key && registry[state.key]; }
  function normalize(value) { return String(value == null ? "" : value).toLocaleLowerCase("ru-RU"); }
  function triggerFor(key) {
    return Array.prototype.slice.call(document.querySelectorAll("[data-value-select-key]")).filter(function (node) {
      return node.dataset.valueSelectKey === key;
    })[0] || null;
  }
  function stableId(key) { return String(key).replace(/[^a-zA-Z0-9_-]/g, "-"); }

  function register(config) {
    if (!config || !config.key) throw new Error("Value selector requires a stable key.");
    registry[config.key] = {
      key:String(config.key),
      value:String(config.value == null ? "" : config.value),
      label:String(config.label == null ? "" : config.label),
      options:(config.options || []).map(function (option) {
        return typeof option === "object" ? {
          value:String(option.value == null ? "" : option.value),
          label:String(option.label == null ? option.value : option.label),
          disabled:!!option.disabled
        } : { value:String(option), label:String(option), disabled:false };
      }),
      disabled:!!config.disabled,
      className:config.className || "",
      testId:config.testId || ("value-select-trigger-" + stableId(config.key)),
      ariaLabel:config.ariaLabel || config.label || "Выбор значения",
      onSelect:typeof config.onSelect === "function" ? config.onSelect : function () {}
    };
    if (state.key === config.key) renderOptions();
    return registry[config.key];
  }

  function applyTrigger(node, config) {
    node.type = "button";
    node.className = ("value-select-trigger select-trigger " + (config.className || "")).trim();
    node.dataset.valueSelectKey = config.key;
    node.dataset.testid = config.testId;
    node.setAttribute("aria-haspopup", "listbox");
    node.setAttribute("aria-controls", "value-select-listbox");
    node.setAttribute("aria-expanded", String(state.key === config.key));
    node.setAttribute("aria-label", config.ariaLabel + ": " + config.label);
    node.title = config.label;
    node.disabled = config.disabled;
    node.innerHTML = "<span>" + esc(config.label) + "</span>";
    return node;
  }

  function configure(node, config) { return applyTrigger(node, register(config)); }

  function markup(config) {
    var registered = register(config);
    return "<button class='value-select-trigger select-trigger " + esc(registered.className) + "' type='button' data-value-select-key='" + esc(registered.key) + "' data-testid='" + esc(registered.testId) + "' aria-haspopup='listbox' aria-controls='value-select-listbox' aria-expanded='" + String(state.key === registered.key) + "' aria-label='" + esc(registered.ariaLabel + ": " + registered.label) + "' title='" + esc(registered.label) + "'" + (registered.disabled ? " disabled" : "") + "><span>" + esc(registered.label) + "</span></button>";
  }

  function filteredOptions() {
    var config = currentConfig(), query = normalize(state.query);
    if (!config) return [];
    return config.options.map(function (option, index) { return { option:option, index:index }; }).filter(function (entry) {
      return !query || normalize(entry.option.label).indexOf(query) >= 0;
    });
  }

  function enabledFiltered() { return filteredOptions().filter(function (entry) { return !entry.option.disabled; }); }
  function selectedEnabledIndex(config) {
    var found = config.options.map(function (option, index) { return { option:option, index:index }; }).filter(function (entry) {
      return entry.option.value === config.value && !entry.option.disabled;
    })[0];
    return found ? found.index : -1;
  }

  function setActive(index, scroll) {
    state.activeIndex = typeof index === "number" ? index : -1;
    var input = searchInput(), host = optionsHost();
    if (input) {
      if (state.activeIndex >= 0) input.setAttribute("aria-activedescendant", "value-select-option-" + state.activeIndex);
      else input.removeAttribute("aria-activedescendant");
    }
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll("[data-value-select-option-index]"), function (node) {
      var active = Number(node.dataset.valueSelectOptionIndex) === state.activeIndex;
      node.classList.toggle("is-active", active);
      if (active && scroll) node.scrollIntoView({ block:"nearest" });
    });
  }

  function renderOptions() {
    var config = currentConfig(), host = optionsHost();
    if (!config || !host) return;
    var entries = filteredOptions();
    if (!entries.length) {
      host.innerHTML = "<div class='value-select-empty' data-testid='value-select-empty' role='status'>Ничего не найдено</div>";
      setActive(-1, false);
      return;
    }
    host.innerHTML = entries.map(function (entry) {
      var option=entry.option, selected=option.value === config.value;
      return "<button type='button' role='option' tabindex='-1' id='value-select-option-" + entry.index + "' data-value-select-option-index='" + entry.index + "' data-testid='value-select-option-" + entry.index + "' aria-selected='" + String(selected) + "' title='" + esc(option.label) + "' class='" + (selected ? "is-selected" : "") + "'" + (option.disabled ? " disabled aria-disabled='true'" : "") + "><span class='select-option-check' aria-hidden='true'></span><span class='select-option-label'>" + esc(option.label) + "</span></button>";
    }).join("");
    if (!entries.some(function (entry) { return entry.index === state.activeIndex && !entry.option.disabled; })) {
      var first = enabledFiltered()[0];
      state.activeIndex = first ? first.index : -1;
    }
    setActive(state.activeIndex, false);
  }

  function position() {
    var menu=popup(), trigger=state.key && triggerFor(state.key);
    if (!menu || menu.hidden || !trigger) return;
    var rect=trigger.getBoundingClientRect(), visual=window.visualViewport;
    var viewportLeft=visual ? visual.offsetLeft : 0, viewportTop=visual ? visual.offsetTop : 0;
    var viewportWidth=visual ? visual.width : Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    var viewportHeight=visual ? visual.height : Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
    var inset=8, width=Math.min(Math.max(rect.width, 244), Math.max(0, viewportWidth - inset * 2));
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

  function close(options) {
    var menu=popup(), key=state.key;
    if (!key) return;
    state.key=null; state.query=""; state.activeIndex=-1;
    if (menu) { menu.hidden=true; menu.style.left=""; menu.style.top=""; menu.style.width=""; }
    var trigger=triggerFor(key);
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (options && options.restoreFocus && trigger) trigger.focus();
  }

  function open(trigger, direction) {
    var key=trigger && trigger.dataset.valueSelectKey, config=key && registry[key];
    if (!config || config.disabled || trigger.disabled) return;
    if (state.key === key) { close({ restoreFocus:true }); return; }
    if (state.key) close({ restoreFocus:false });
    state.key=key; state.restoreKey=key; state.query="";
    var selected=selectedEnabledIndex(config), enabled=config.options.map(function (option,index) { return { option:option,index:index }; }).filter(function (entry) { return !entry.option.disabled; });
    state.activeIndex=direction === "up" ? (enabled.length ? enabled[enabled.length - 1].index : -1) : (selected >= 0 ? selected : (enabled[0] ? enabled[0].index : -1));
    var menu=popup();
    if (!menu) return;
    menu.innerHTML="<div class='value-select-search-row'><span class='value-select-search-icon' aria-hidden='true'></span><input class='value-select-search' type='search' autocomplete='off' spellcheck='false' placeholder='Поиск' aria-label='Поиск: " + esc(config.ariaLabel) + "' role='combobox' aria-autocomplete='list' aria-expanded='true' aria-controls='value-select-listbox' data-value-select-search data-testid='value-select-search'></div><div class='value-select-options' id='value-select-listbox' role='listbox' aria-label='" + esc(config.ariaLabel) + "' data-value-select-options data-testid='value-select-options'></div>";
    menu.hidden=false;
    trigger.setAttribute("aria-expanded", "true");
    renderOptions(); position();
    var input=searchInput();
    if (input) input.focus();
    window.requestAnimationFrame(function () { var current=searchInput(); if(current && document.activeElement !== current) current.focus(); });
  }

  function move(kind) {
    var enabled=enabledFiltered();
    if (!enabled.length) return setActive(-1, false);
    if (kind === "home") return setActive(enabled[0].index, true);
    if (kind === "end") return setActive(enabled[enabled.length - 1].index, true);
    var current=enabled.map(function (entry) { return entry.index; }).indexOf(state.activeIndex);
    var next=kind === "up" ? (current - 1 + enabled.length) % enabled.length : (current + 1 + enabled.length) % enabled.length;
    setActive(enabled[next].index, true);
  }

  function choose(index) {
    var config=currentConfig(), option=config && config.options[index];
    if (!config || !option || option.disabled) return;
    var key=config.key, value=option.value;
    config.value=value;
    config.label=option.label;
    var currentTrigger=triggerFor(key);
    if (currentTrigger) applyTrigger(currentTrigger, config);
    close({ restoreFocus:false });
    config.onSelect(value);
    window.requestAnimationFrame(function () { var trigger=triggerFor(key); if(trigger) trigger.focus(); });
  }

  function continueTabOrder(key, backwards) {
    var trigger=triggerFor(key);
    if (!trigger) return;
    var nodes=Array.prototype.slice.call(document.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")).filter(function (node) {
      return !node.closest("[hidden]") && node.getAttribute("aria-hidden") !== "true" && node.getClientRects().length > 0;
    });
    var index=nodes.indexOf(trigger), next=index + (backwards ? -1 : 1);
    if (next >= 0 && next < nodes.length) nodes[next].focus();
  }

  document.addEventListener("click", function (event) {
    var trigger=event.target.closest && event.target.closest("[data-value-select-key]");
    if (trigger) { event.preventDefault(); open(trigger, "down"); return; }
    var option=event.target.closest && event.target.closest("[data-value-select-option-index]");
    if (option && popup() && popup().contains(option)) { event.preventDefault(); choose(Number(option.dataset.valueSelectOptionIndex)); }
  });
  document.addEventListener("input", function (event) {
    if (!event.target.matches || !event.target.matches("[data-value-select-search]")) return;
    state.query=event.target.value; renderOptions(); position();
  });
  document.addEventListener("pointermove", function (event) {
    var option=event.target.closest && event.target.closest("[data-value-select-option-index]");
    if (option && !option.disabled && popup() && popup().contains(option)) setActive(Number(option.dataset.valueSelectOptionIndex), false);
  });
  document.addEventListener("pointerdown", function (event) {
    var menu=popup(), trigger=event.target.closest && event.target.closest("[data-value-select-key]");
    if (state.key && menu && !menu.contains(event.target) && !trigger) close({ restoreFocus:false });
  });
  document.addEventListener("keydown", function (event) {
    var trigger=event.target.closest && event.target.closest("[data-value-select-key]");
    if (trigger && ["Enter", " ", "ArrowDown", "ArrowUp"].indexOf(event.key) >= 0) {
      event.preventDefault(); open(trigger, event.key === "ArrowUp" ? "up" : "down"); return;
    }
    if (!state.key || event.target !== searchInput()) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowUp" ? "up" : "down"); }
    else if (event.key === "Home" || event.key === "End") { event.preventDefault(); move(event.key.toLowerCase()); }
    else if (event.key === "Enter") { event.preventDefault(); if(state.activeIndex >= 0) choose(state.activeIndex); }
    else if (event.key === "Escape") { event.preventDefault(); close({ restoreFocus:true }); }
    else if (event.key === "Tab") { var key=state.key; event.preventDefault(); close({ restoreFocus:false }); continueTabOrder(key, event.shiftKey); }
  });
  window.addEventListener("resize", position);
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", position); window.visualViewport.addEventListener("scroll", position); }

  window.SignalAnalyserValueSelect = {
    register:register,
    configure:configure,
    markup:markup,
    close:function (restoreFocus) { close({ restoreFocus:!!restoreFocus }); },
    reposition:position,
    reconcile:function () {
      if(state.key && !triggerFor(state.key)) close({ restoreFocus:false });
      Object.keys(registry).forEach(function (key) { if(!triggerFor(key) && key !== state.key) delete registry[key]; });
    },
    state:function () { return { key:state.key, query:state.query, activeIndex:state.activeIndex }; }
  };
})(window, document);
