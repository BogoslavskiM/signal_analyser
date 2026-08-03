(function registerGenieSettingsControls(window) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function numericDraftResult(rawValue, kind) {
    var text = String(rawValue == null ? "" : rawValue).trim();
    var pattern = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;
    var value;
    if (!text || !pattern.test(text)) return {
      valid: false, error: kind === "int" ? "Значение должно быть целым числом" : "Значение должно быть числом",
    };
    value = Number(text);
    if (!Number.isFinite(value) || (kind === "int" && !Number.isSafeInteger(value))) return {
      valid: false, error: kind === "int" ? "Значение должно быть целым числом" : "Значение должно быть конечным числом",
    };
    return { valid: true, value: value, error: "" };
  }

  function createSettingsControls(options) {
    var config = options || {};
    var root = null;
    var state = {
      title: config.title || "Настройки",
      fields: {},
      groups: Array.isArray(config.groups) ? config.groups.map(function (group) { return Object.assign({}, group); }) : [],
      applyPending: false,
      localErrors: {},
      enumQueries: {},
      enumOpen: {},
      enumActiveIndex: {},
      enumMenuStyles: {},
    };

    function fieldLabel(field) {
      var label = typeof config.labelText === "function" ? config.labelText(field.label) : field.label;
      return escapeHtml(label);
    }

    function message(field, id) {
      var error = state.localErrors[id] || field.error || "";
      var warning = !error ? field.warning || "" : "";
      var text = error || warning;
      if (!text) return "";
      return '<span class="settings-field-status-icon ' + (error ? "settings-field-error-icon" : "settings-field-warning-icon") +
        '" data-tooltip="' + escapeHtml(text) + '" aria-label="' + escapeHtml(text) + '"></span>' +
        '<p class="settings-inline-message ' + (error ? "settings-inline-error" : "settings-inline-warning") + '">' +
        escapeHtml(text) + "</p>";
    }

    function renderField(id) {
      var field = state.fields[id] || {};
      var kind = field.kind || "string";
      var disabled = field.readonly === true;
      var testId = "setting-" + id;
      var control;
      if (field.visible === false) return "";
      if (kind === "readonly") {
        control = '<div class="settings-readonly-control"><output id="' + escapeHtml(testId) +
          '" class="settings-readonly-value">' + escapeHtml(field.value) + "</output></div>";
      } else if (kind === "boolean") {
        control = '<span class="settings-checkbox-control"><input id="' + escapeHtml(testId) +
          '" class="settings-checkbox" type="checkbox" data-setting-field="' + escapeHtml(id) + '"' +
          (field.value === true ? " checked" : "") + (disabled ? " disabled" : "") + "></span>";
      } else if (kind === "select") {
        var normalizedOptions = (field.options || []).map(function (option) {
            var value = option && typeof option === "object" ?
              (Object.prototype.hasOwnProperty.call(option, "value") ? option.value : option.id) : option;
            var label = option && typeof option === "object" ? option.label : option;
            return { value: value, label: String(label == null ? "" : label) };
          });
        var selectedOption = normalizedOptions.find(function (option) { return String(option.value) === String(field.value); });
        var query = Object.prototype.hasOwnProperty.call(state.enumQueries, id) ? state.enumQueries[id] :
          (selectedOption ? selectedOption.label : "");
        var filtered = normalizedOptions.filter(function (option) {
          return !query || option.label.toLowerCase().includes(String(query).toLowerCase());
        });
        var list = state.enumOpen[id] ? '<div class="settings-search-combobox-dropdown" role="listbox" style="' +
          escapeHtml(state.enumMenuStyles[id] || "") + '">' + filtered.map(function (option, index) {
          return '<button class="settings-search-combobox-option' + (state.enumActiveIndex[id] === index ? " active" : "") +
            (String(option.value) === String(field.value) ? " selected" : "") +
            '" type="button" role="option" data-setting-enum-option="' + escapeHtml(id) + '" data-setting-enum-value="' +
            escapeHtml(option.value) + '" data-setting-enum-label="' + escapeHtml(option.label) + '"><span class="settings-search-combobox-option-check"></span>' +
            '<span class="settings-search-combobox-option-label">' + escapeHtml(option.label) + "</span></button>";
        }).join("") + (!filtered.length ? '<div class="settings-search-combobox-empty">Нет вариантов</div>' : "") +
          "</div>" : "";
        control = '<div class="settings-search-combobox"><input id="' + escapeHtml(testId) + '" class="settings-form-field settings-search-combobox-input" type="text"' +
          ' autocomplete="off" role="combobox" data-setting-enum-query="' + escapeHtml(id) + '" value="' + escapeHtml(query) +
          '" aria-expanded="' + String(state.enumOpen[id] === true) + '"' + (disabled ? " disabled" : "") + ">" + list + "</div>";
      } else {
        control = '<input id="' + escapeHtml(testId) + '" class="settings-form-field" type="text" autocomplete="off" data-setting-field="' +
          escapeHtml(id) + '" value="' + escapeHtml(field.value) + '"' + (disabled ? " disabled" : "") +
          (state.localErrors[id] || field.error ? ' aria-invalid="true"' : "") + ">";
      }
      return '<div class="settings-field-row"><label class="settings-label settings-field-label" for="' + escapeHtml(testId) +
        '" data-tooltip="' + escapeHtml(field.label) + '"><span class="settings-label-text">' + fieldLabel(field) +
        '</span>' + (field.units ? '<span class="settings-unit-inline">' + escapeHtml(field.units) + "</span>" : "") +
        '</label><div class="settings-form-control-with-message' +
        (state.localErrors[id] || field.error ? " has-error" : (field.warning ? " has-warning" : "")) + '">' +
        control + message(field, id) + "</div></div>";
    }

    function render() {
      var groups = state.groups.length ? state.groups : [{
        id: "main", title: "Основные",
        fields: Array.isArray(config.fieldIds) ? config.fieldIds.slice() : [], open: true,
      }];
      var body = groups.map(function (group) {
        return '<section class="settings-section' + (group.open === false ? " collapsed" : "") + '"><button class="settings-section-title"' +
          ' type="button" data-settings-group="' + escapeHtml(group.id) + '" aria-expanded="' + String(group.open !== false) + '">' +
          '<span class="settings-section-arrow" aria-hidden="true"></span><span class="settings-section-title-text">' +
          escapeHtml(group.title) + '</span><span class="settings-section-line"></span></button><div class="settings-section-body">' +
          (group.open === false ? "" : (group.fields || []).map(renderField).join("")) + "</div></section>";
      }).join("");
      var invalid = Object.keys(state.localErrors).some(function (id) { return Boolean(state.localErrors[id]); });
      var html = '<aside class="settings-panel"><div class="settings-scroll-content"><h2 class="settings-panel-title">' +
        escapeHtml(state.title) + "</h2>" + body + '</div><div class="settings-apply-block"><button class="settings-apply-button"' +
        ' type="button" data-settings-apply' + (state.applyPending || invalid ? " disabled" : "") + ">Применить</button></div></aside>";
      if (root) root.innerHTML = html;
      return html;
    }

    function typedValue(field, raw) {
      if (field.kind === "boolean") return raw === true;
      if (field.kind === "number" || field.kind === "int" || field.kind === "float") {
        return numericDraftResult(raw, field.kind === "int" ? "int" : "float");
      }
      return { valid: true, value: raw, error: "" };
    }

    var actions = {
      configure: function (payload) {
        var value = payload || {};
        state.title = String(value.title || state.title);
        state.fields = Object.assign({}, value.fields || {});
        state.localErrors = {}; state.enumQueries = {}; state.enumOpen = {}; state.enumActiveIndex = {}; render();
      },
      updateField: function (id, raw) {
        var field = state.fields[id];
        var result;
        if (!field || field.readonly) return;
        result = typedValue(field, raw);
        state.localErrors[id] = result.valid ? "" : result.error;
        field.value = result.valid ? result.value : raw;
        field.error = "";
        field.warning = "";
        if (typeof config.onTypedChange === "function") config.onTypedChange({ id: id, value: field.value, valid: result.valid });
        render();
      },
      toggleGroup: function (id) {
        var group = state.groups.find(function (item) { return String(item.id) === String(id); });
        if (group) group.open = group.open === false; render();
      },
      searchEnum: function (id, query, rect) {
        if (rect) state.enumMenuStyles[id] = "top:" + (rect.bottom + 4) + "px;left:" + rect.left + "px;width:" + rect.width + "px";
        state.enumQueries[id] = String(query || ""); state.enumOpen[id] = true; state.enumActiveIndex[id] = 0; render();
        if (root && window.requestAnimationFrame) window.requestAnimationFrame(function () {
          var input = root && root.querySelector ? root.querySelector('[data-setting-enum-query="' + id + '"]') : null;
          if (input && typeof input.focus === "function") {
            input.focus();
            if (typeof input.setSelectionRange === "function") input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      },
      closeEnum: function (id) {
        var field = state.fields[id] || {};
        var selected = (field.options || []).map(function (option) {
          return option && typeof option === "object" ? option : { value: option, label: option };
        }).find(function (option) { return String(option.value == null ? option.id : option.value) === String(field.value); });
        state.enumQueries[id] = selected ? String(selected.label) : "";
        state.enumOpen[id] = false; state.enumActiveIndex[id] = 0; render();
      },
      selectEnum: function (id, value, label) {
        var field = state.fields[id] || {};
        var match = (field.options || []).map(function (option) {
          return option && typeof option === "object" ? option : { value: option, label: option };
        }).find(function (option) {
          return String(option.value == null ? option.id : option.value) === String(value);
        });
        var typedValue = match ? (match.value == null ? match.id : match.value) : value;
        state.enumQueries[id] = String(label || ""); state.enumOpen[id] = false; state.enumActiveIndex[id] = 0;
        actions.updateField(id, typedValue);
      },
      apply: function () {
        if (state.applyPending || Object.keys(state.localErrors).some(function (id) { return Boolean(state.localErrors[id]); })) return Promise.resolve(null);
        if (typeof config.onApply !== "function") return Promise.reject(new Error("Settings onApply action is not configured"));
        state.applyPending = true; render();
        var payload = {};
        Object.keys(state.fields).forEach(function (id) { payload[id] = state.fields[id].value; });
        return Promise.resolve(config.onApply(payload)).then(function (response) {
          if (response && response.fields) actions.configure(response);
          return response;
        }).catch(function (error) {
          if (typeof config.reportError === "function") { config.reportError(error, "settings-apply"); return null; }
          throw error;
        }).finally(function () { state.applyPending = false; render(); });
      },
    };

    function onChange(event) {
      var id = event.target.getAttribute("data-setting-field");
      if (id != null) actions.updateField(id, event.target.type === "checkbox" ? event.target.checked : event.target.value);
    }
    function onInput(event) {
      var id = event.target.getAttribute("data-setting-enum-query");
      if (id != null) actions.searchEnum(id, event.target.value, event.target.getBoundingClientRect());
    }
    function onKeyDown(event) {
      var id = event.target.getAttribute("data-setting-enum-query");
      var field;
      var options;
      var index;
      if (id == null) return;
      field = state.fields[id] || {};
      options = (field.options || []).map(function (option) {
        return option && typeof option === "object" ? option : { value: option, label: option };
      }).filter(function (option) {
        return String(option.label || "").toLowerCase().includes(String(state.enumQueries[id] || "").toLowerCase());
      });
      index = Number(state.enumActiveIndex[id] || 0);
      if (event.key === "Escape") { event.preventDefault(); return actions.closeEnum(id); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); state.enumOpen[id] = true;
        state.enumActiveIndex[id] = Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
        return render();
      }
      if (event.key === "Enter" && state.enumOpen[id] && options[index]) {
        event.preventDefault();
        return actions.selectEnum(id, options[index].value == null ? options[index].id : options[index].value, options[index].label);
      }
    }
    function onClick(event) {
      var group = event.target.closest("[data-settings-group]");
      var option = event.target.closest("[data-setting-enum-option]");
      if (option) return actions.selectEnum(option.getAttribute("data-setting-enum-option"),
        option.getAttribute("data-setting-enum-value"), option.getAttribute("data-setting-enum-label"));
      var enumInput = event.target.closest("[data-setting-enum-query]");
      if (enumInput) return actions.searchEnum(enumInput.getAttribute("data-setting-enum-query"),
        state.enumOpen[enumInput.getAttribute("data-setting-enum-query")] ? enumInput.value : "",
        enumInput.getBoundingClientRect());
      if (group) return actions.toggleGroup(group.getAttribute("data-settings-group"));
      if (event.target.closest("[data-settings-apply]")) actions.apply();
    }
    function mount(element) {
      if (!element) throw new Error("Settings mount root is required"); if (root) unmount(); root = element;
      root.addEventListener("change", onChange); root.addEventListener("input", onInput);
      root.addEventListener("keydown", onKeyDown); root.addEventListener("click", onClick); render(); return module;
    }
    function unmount() {
      if (!root) return; root.removeEventListener("change", onChange); root.removeEventListener("input", onInput);
      root.removeEventListener("keydown", onKeyDown); root.removeEventListener("click", onClick);
      root.innerHTML = ""; root = null;
    }
    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieSettingsControls = { create: createSettingsControls, numericDraftResult: numericDraftResult };
})(window);
