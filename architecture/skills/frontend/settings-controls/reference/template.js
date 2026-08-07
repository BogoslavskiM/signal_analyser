(function registerGenieSettingsControls(window, document) {
  "use strict";

  function normalizeOption(option) {
    var value;
    var label;

    if (option && typeof option === "object") {
      value = Object.prototype.hasOwnProperty.call(option, "value") ? option.value :
        (Object.prototype.hasOwnProperty.call(option, "id") ? option.id : option.label);
      label = Object.prototype.hasOwnProperty.call(option, "label") ? option.label : value;
    } else {
      value = option;
      label = option;
    }

    return {
      value: value,
      label: String(label == null ? "" : label),
      key: String(value == null ? "" : value),
    };
  }

  function numericDraftResult(rawValue, kind) {
    var text = String(rawValue == null ? "" : rawValue).trim();
    var completeNumber = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;
    var value;

    if (!text) {
      return { valid: false, error: "Значение не может быть пустым" };
    }
    if (!completeNumber.test(text)) {
      return {
        valid: false,
        error: kind === "int" ? "Значение должно быть целым числом" : "Значение должно быть числом",
      };
    }

    value = Number(text);
    if (!Number.isFinite(value)) {
      return { valid: false, error: "Значение должно быть конечным числом" };
    }
    if (kind === "int" && !Number.isSafeInteger(value)) {
      return { valid: false, error: "Значение должно быть целым числом" };
    }

    return { valid: true, value: value, error: "" };
  }

  function fieldTestId(fieldId) {
    return "setting-" + String(fieldId || "field");
  }

  function createSettingsControls(options) {
    var labelText = options && typeof options.labelText === "function" ?
      options.labelText :
      function (label) { return label; };

    var StringSetting = {
      props: {
        modelValue: { default: "" },
        fieldId: { type: String, required: true },
        label: { type: String, required: true },
        units: { type: String, default: "" },
        error: { type: String, default: "" },
        warning: { type: String, default: "" },
        disabled: { type: Boolean, default: false },
      },
      emits: ["update:modelValue", "typed-change"],
      computed: {
        displayLabel: function () {
          return labelText(this.label);
        },
        validationMessage: function () {
          return this.error || this.warning || "";
        },
        testId: function () {
          return fieldTestId(this.fieldId);
        },
      },
      methods: {
        onInput: function (event) {
          var value = event.target.value;
          this.$emit("update:modelValue", value);
          this.$emit("typed-change", { id: this.fieldId, value: value });
        },
      },
      template:
        '<div class="settings-field-row">' +
        '<label class="settings-label settings-field-label" :for="testId" :data-tooltip="label">' +
        '<span class="settings-label-text">{{ displayLabel }}</span>' +
        '<span v-if="units" class="settings-unit-inline">{{ units }}</span>' +
        '</label>' +
        '<div class="settings-form-control-with-message" :class="{ \'has-error\': error, \'has-warning\': !error && warning }">' +
        '<input :id="testId" class="settings-form-field" type="text" autocomplete="off" :data-testid="testId" :value="modelValue" :disabled="disabled" :aria-invalid="error ? \'true\' : \'false\'" @input="onInput">' +
        '<span v-if="validationMessage" class="settings-field-status-icon" :class="error ? \'settings-field-error-icon\' : \'settings-field-warning-icon\'" :data-tooltip="validationMessage" :aria-label="validationMessage" tabindex="0"></span>' +
        '<p v-if="validationMessage" class="settings-inline-message" :class="error ? \'settings-inline-error\' : \'settings-inline-warning\'">{{ validationMessage }}</p>' +
        '</div>' +
        '</div>',
    };

    var NumberSetting = {
      props: {
        modelValue: { default: "" },
        fieldId: { type: String, required: true },
        label: { type: String, required: true },
        kind: { type: String, default: "float" },
        units: { type: String, default: "" },
        min: { default: null },
        max: { default: null },
        step: { default: null },
        error: { type: String, default: "" },
        warning: { type: String, default: "" },
        disabled: { type: Boolean, default: false },
      },
      emits: ["update:modelValue", "typed-change", "validity-change"],
      data: function () {
        return { localError: "" };
      },
      computed: {
        displayLabel: function () {
          return labelText(this.label);
        },
        displayError: function () {
          return this.localError || this.error || "";
        },
        validationMessage: function () {
          return this.displayError || this.warning || "";
        },
        testId: function () {
          return fieldTestId(this.fieldId);
        },
      },
      methods: {
        onInput: function (event) {
          var rawValue = event.target.value;
          var allowedDraft = /^[+\-]?(?:(?:\d*(?:\.\d*)?)?)(?:[eE][+\-]?\d*)?$/;
          var result;

          if (rawValue.indexOf(",") !== -1 || /[dD]/.test(rawValue) || !allowedDraft.test(rawValue)) {
            event.target.value = String(this.modelValue == null ? "" : this.modelValue);
            return;
          }

          result = numericDraftResult(rawValue, this.kind);
          this.localError = result.error || "";
          this.$emit("update:modelValue", rawValue);
          this.$emit("validity-change", {
            id: this.fieldId,
            valid: result.valid,
            error: result.error || "",
          });
          if (result.valid) {
            this.$emit("typed-change", {
              id: this.fieldId,
              value: result.value,
              rawDraft: rawValue,
            });
          }
        },
      },
      template:
        '<div class="settings-field-row">' +
        '<label class="settings-label settings-field-label" :for="testId" :data-tooltip="label">' +
        '<span class="settings-label-text">{{ displayLabel }}</span>' +
        '<span v-if="units" class="settings-unit-inline">{{ units }}</span>' +
        '</label>' +
        '<div class="settings-form-control-with-message" :class="{ \'has-error\': displayError, \'has-warning\': !displayError && warning }">' +
        '<input :id="testId" class="settings-form-field" type="text" inputmode="decimal" autocomplete="off" :data-testid="testId" :data-min="min" :data-max="max" :data-step="step" :value="modelValue" :disabled="disabled" :aria-invalid="displayError ? \'true\' : \'false\'" @input="onInput">' +
        '<span v-if="validationMessage" class="settings-field-status-icon" :class="displayError ? \'settings-field-error-icon\' : \'settings-field-warning-icon\'" :data-tooltip="validationMessage" :aria-label="validationMessage" tabindex="0"></span>' +
        '<p v-if="validationMessage" class="settings-inline-message" :class="displayError ? \'settings-inline-error\' : \'settings-inline-warning\'">{{ validationMessage }}</p>' +
        '</div>' +
        '</div>',
    };

    var SearchCombobox = {
      props: {
        modelValue: { default: "" },
        fieldId: { type: String, required: true },
        options: { type: Array, default: function () { return []; } },
        invalid: { type: Boolean, default: false },
        warning: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
      },
      emits: ["choose"],
      data: function () {
        return {
          open: false,
          searchText: "",
          activeIndex: -1,
          dropdownStyle: {},
        };
      },
      computed: {
        normalizedOptions: function () {
          var selectedValue = String(this.modelValue == null ? "" : this.modelValue);
          return (this.options || []).map(function (option) {
            var normalized = normalizeOption(option);
            normalized.selected = normalized.key === selectedValue;
            return normalized;
          });
        },
        selectedLabel: function () {
          var selected = this.normalizedOptions.find(function (option) {
            return option.selected;
          });
          return selected ? selected.label : "";
        },
        filteredOptions: function () {
          var query = String(this.searchText || "").toLowerCase();
          if (!query) return this.normalizedOptions;
          return this.normalizedOptions.filter(function (option) {
            return option.label.toLowerCase().includes(query) || option.key.toLowerCase().includes(query);
          });
        },
        testId: function () {
          return fieldTestId(this.fieldId);
        },
      },
      watch: {
        modelValue: function () {
          if (!this.open) this.searchText = this.selectedLabel;
        },
        options: function () {
          if (!this.open) this.searchText = this.selectedLabel;
        },
        filteredOptions: function () {
          this.activeIndex = this.filteredOptions.length ? 0 : -1;
        },
      },
      mounted: function () {
        this.searchText = this.selectedLabel;
        window.addEventListener("resize", this.updateDropdownStyle);
        window.addEventListener("scroll", this.updateDropdownStyle, true);
        document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
      },
      beforeUnmount: function () {
        window.removeEventListener("resize", this.updateDropdownStyle);
        window.removeEventListener("scroll", this.updateDropdownStyle, true);
        document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
      },
      methods: {
        openSearch: function () {
          if (this.disabled) return;
          this.searchText = "";
          this.open = true;
          this.activeIndex = this.filteredOptions.length ? 0 : -1;
          this.$nextTick(this.updateDropdownStyle);
        },
        cancelSearch: function () {
          this.open = false;
          this.searchText = this.selectedLabel;
          this.activeIndex = -1;
          this.dropdownStyle = {};
        },
        chooseOption: function (option) {
          if (!option) return;
          this.$emit("choose", option.value);
          this.searchText = option.label;
          this.open = false;
          this.activeIndex = -1;
          this.dropdownStyle = {};
        },
        onDocumentPointerDown: function (event) {
          var root = this.$refs && this.$refs.root;
          var dropdown = this.$refs && this.$refs.dropdown;
          var target = event && event.target;

          if (!this.open || !target) return;
          if ((root && root.contains(target)) || (dropdown && dropdown.contains(target))) return;
          this.cancelSearch();
        },
        onFocusOut: function () {
          var self = this;
          window.setTimeout(function () {
            var root = self.$refs && self.$refs.root;
            var dropdown = self.$refs && self.$refs.dropdown;
            var focused = document.activeElement;

            if ((root && root.contains(focused)) || (dropdown && dropdown.contains(focused))) return;
            self.cancelSearch();
          }, 0);
        },
        onKeydown: function (event) {
          var lastIndex;

          if (event.key === "Escape") {
            event.preventDefault();
            this.cancelSearch();
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!this.open) this.openSearch();
            lastIndex = this.filteredOptions.length - 1;
            if (lastIndex < 0) return;
            this.activeIndex = event.key === "ArrowDown" ?
              Math.min(this.activeIndex + 1, lastIndex) :
              Math.max(this.activeIndex - 1, 0);
            return;
          }
          if (event.key === "Enter" && this.open && this.activeIndex >= 0) {
            event.preventDefault();
            this.chooseOption(this.filteredOptions[this.activeIndex]);
          }
        },
        updateDropdownStyle: function () {
          var input = this.$refs && this.$refs.input;
          var rect;
          var viewportHeight;
          var spaceBelow;
          var spaceAbove;
          var openUp;
          var availableHeight;

          if (!this.open || !input) return;
          rect = input.getBoundingClientRect();
          viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
          spaceBelow = viewportHeight - rect.bottom - 4;
          spaceAbove = rect.top - 4;
          openUp = spaceBelow < 96 && spaceAbove > spaceBelow;
          availableHeight = Math.max(48, Math.min(180, (openUp ? spaceAbove : spaceBelow) - 4));
          this.dropdownStyle = {
            left: Math.round(rect.left) + "px",
            top: Math.round(openUp ? rect.top - availableHeight - 4 : rect.bottom + 4) + "px",
            width: Math.round(rect.width) + "px",
            maxHeight: Math.round(availableHeight) + "px",
          };
        },
      },
      template:
        '<div ref="root" class="settings-search-combobox" @focusout="onFocusOut">' +
        '<input ref="input" class="settings-search-combobox-input" :class="{ \'has-error\': invalid, \'has-warning\': !invalid && warning }" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" :aria-expanded="open ? \'true\' : \'false\'" :data-testid="testId" :value="searchText" :placeholder="selectedLabel" :disabled="disabled" @focus="openSearch" @click="openSearch" @input="searchText = $event.target.value" @keydown="onKeydown">' +
        '<div v-if="open" ref="dropdown" class="settings-search-combobox-dropdown" :style="dropdownStyle" role="listbox">' +
        '<button v-for="(option, index) in filteredOptions" :key="option.key" type="button" class="settings-search-combobox-option" :class="{ selected: option.selected, active: index === activeIndex }" role="option" :aria-selected="option.selected ? \'true\' : \'false\'" @pointerdown.prevent="chooseOption(option)">' +
        '<span class="settings-search-combobox-option-check" aria-hidden="true"></span>' +
        '<span class="settings-search-combobox-option-label">{{ option.label }}</span>' +
        '</button>' +
        '<div v-if="filteredOptions.length === 0" class="settings-search-combobox-empty">Таких вариантов не найдено</div>' +
        '</div>' +
        '</div>',
    };

    var SelectSetting = {
      components: { "settings-search-combobox": SearchCombobox },
      props: {
        modelValue: { default: "" },
        fieldId: { type: String, required: true },
        label: { type: String, required: true },
        options: { type: Array, default: function () { return []; } },
        error: { type: String, default: "" },
        warning: { type: String, default: "" },
        disabled: { type: Boolean, default: false },
      },
      emits: ["update:modelValue", "typed-change"],
      computed: {
        displayLabel: function () {
          return labelText(this.label);
        },
        validationMessage: function () {
          return this.error || this.warning || "";
        },
      },
      methods: {
        choose: function (value) {
          this.$emit("update:modelValue", value);
          this.$emit("typed-change", { id: this.fieldId, value: value });
        },
      },
      template:
        '<div class="settings-field-row">' +
        '<span class="settings-label settings-field-label" :data-tooltip="label"><span class="settings-label-text">{{ displayLabel }}</span></span>' +
        '<div class="settings-form-control-with-message" :class="{ \'has-error\': error, \'has-warning\': !error && warning }">' +
        '<settings-search-combobox :field-id="fieldId" :options="options" :model-value="modelValue" :invalid="Boolean(error)" :warning="!error && Boolean(warning)" :disabled="disabled" @choose="choose"></settings-search-combobox>' +
        '<span v-if="validationMessage" class="settings-field-status-icon" :class="error ? \'settings-field-error-icon\' : \'settings-field-warning-icon\'" :data-tooltip="validationMessage" :aria-label="validationMessage" tabindex="0"></span>' +
        '<p v-if="validationMessage" class="settings-inline-message" :class="error ? \'settings-inline-error\' : \'settings-inline-warning\'">{{ validationMessage }}</p>' +
        '</div>' +
        '</div>',
    };

    var BooleanSetting = {
      props: {
        modelValue: { type: Boolean, default: false },
        fieldId: { type: String, required: true },
        label: { type: String, required: true },
        error: { type: String, default: "" },
        warning: { type: String, default: "" },
        disabled: { type: Boolean, default: false },
      },
      emits: ["update:modelValue", "typed-change"],
      computed: {
        displayLabel: function () {
          return labelText(this.label);
        },
        validationMessage: function () {
          return this.error || this.warning || "";
        },
        testId: function () {
          return fieldTestId(this.fieldId);
        },
      },
      methods: {
        onChange: function (event) {
          var value = Boolean(event.target.checked);
          this.$emit("update:modelValue", value);
          this.$emit("typed-change", { id: this.fieldId, value: value });
        },
      },
      template:
        '<div class="settings-field-row settings-checkbox-row">' +
        '<label class="settings-label settings-field-label" :for="testId">{{ displayLabel }}</label>' +
        '<div class="settings-form-control-with-message">' +
        '<label class="settings-checkbox-control" :class="{ \'has-error\': error, \'has-warning\': !error && warning }">' +
        '<input :id="testId" class="settings-checkbox" type="checkbox" :data-testid="testId" :checked="modelValue" :disabled="disabled" :aria-invalid="error ? \'true\' : \'false\'" @change="onChange">' +
        '</label>' +
        '<span v-if="validationMessage" class="settings-field-status-icon" :class="error ? \'settings-field-error-icon\' : \'settings-field-warning-icon\'" :data-tooltip="validationMessage" :aria-label="validationMessage" tabindex="0"></span>' +
        '<p v-if="validationMessage" class="settings-inline-message" :class="error ? \'settings-inline-error\' : \'settings-inline-warning\'">{{ validationMessage }}</p>' +
        '</div>' +
        '</div>',
    };

    var ReadonlySetting = {
      props: {
        fieldId: { type: String, required: true },
        label: { type: String, required: true },
        value: { default: "" },
        units: { type: String, default: "" },
      },
      computed: {
        displayLabel: function () {
          return labelText(this.label);
        },
        testId: function () {
          return fieldTestId(this.fieldId);
        },
      },
      template:
        '<div class="settings-field-row settings-readonly-row">' +
        '<span class="settings-label settings-field-label" :data-tooltip="label">' +
        '<span class="settings-label-text">{{ displayLabel }}</span>' +
        '<span v-if="units" class="settings-unit-inline">{{ units }}</span>' +
        '</span>' +
        '<div class="settings-readonly-control" :data-testid="testId"><span class="settings-readonly-value">{{ value }}</span></div>' +
        '</div>',
    };

    var SettingsGroup = {
      props: {
        modelValue: { type: Boolean, default: true },
        title: { type: String, required: true },
      },
      emits: ["update:modelValue"],
      methods: {
        toggle: function () {
          this.$emit("update:modelValue", !this.modelValue);
        },
      },
      template:
        '<section class="settings-section" :class="{ collapsed: !modelValue }">' +
        '<button class="settings-section-title" type="button" :aria-expanded="modelValue ? \'true\' : \'false\'" @click="toggle">' +
        '<span class="settings-section-arrow" aria-hidden="true"></span>' +
        '<span class="settings-section-title-text">{{ title }}</span>' +
        '<span class="settings-section-line" aria-hidden="true"></span>' +
        '</button>' +
        '<div v-if="modelValue" class="settings-section-body"><slot></slot></div>' +
        '</section>',
    };

    return {
      StringSetting: StringSetting,
      NumberSetting: NumberSetting,
      SearchCombobox: SearchCombobox,
      SelectSetting: SelectSetting,
      BooleanSetting: BooleanSetting,
      ReadonlySetting: ReadonlySetting,
      SettingsGroup: SettingsGroup,
    };
  }

  window.GenieSettingsControls = {
    create: createSettingsControls,
    numericDraftResult: numericDraftResult,
  };
})(window, document);
