"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = async function (assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const window = {};
  vm.runInNewContext(app.slice(0, app.indexOf("(function registerMeasurementCursorColumns")), {
    window,
    document: { addEventListener() {}, querySelector() { return null; } }
  });

  const feature = window.SignalAnalyserTask0153;
  assert(feature, "TASK-0153 UI regression helper must be registered before the application bootstrap");
  assert(feature.areaRanges("persistence").map((item) => item.fieldId).join(",") === "persistence.frequency_limits,persistence.power_limits,persistence.density_limits", "Persistence Area must retain all three stable range controls");
  assert(feature.areaRanges("spectrogram").length === 3 && feature.areaRanges("spectrum").length === 2 && feature.areaRanges("time").length === 2, "every plot type must expose its complete stable Area range inventory");

  const graphReset = feature.plotDoubleClickProjection({ xRangeSliderVisible: true, yRangeSliderVisible: true });
  assert(graphReset.trueAutorange && graphReset.sliderVisibilityMutation === false && graphReset.paneMenuMutation === false && graphReset.settingsPageMutation === false, "graph double-click must autoscale without creating, hiding, or opening independent controls");
  assert(feature.doubleClickIntent({ closest: (selector) => selector === ".nsewdrag, .plotly, .plot-container, .svg-container" ? {} : null }, { contains: () => true }) === "plot_autoscale", "a graph surface double-click must remain a graph autoscale gesture");
  assert(feature.doubleClickIntent({ closest: (selector) => selector === "[data-screen-range-slider], .settings-field-row[data-range-boundary-validation]" ? {} : null }, { contains: () => true }) === "settings_range_reset", "a settings range double-click must stay a local range reset");
  assert(feature.settingsTabIntent("display", { applying: true, activationToken: 4 }).accepted && feature.settingsTabIntent("display", { applying: true, activationToken: 4 }).blockedByApply === false, "the Screen settings tab must activate while a prior save is applying");
  const settingsTabClick = app.slice(app.indexOf("if (button.dataset.settingsPage)"), app.indexOf("if (button.dataset.paneMenu)"));
  assert(/finishRangeLifecycleForNavigation\(settingsDisplay\.id,null\)[\s\S]*?model\.settingsPage=intent\.page[\s\S]*?renderSettings\(activeDisplay\(\)\)/.test(settingsTabClick), "explicit Settings tab navigation must finish the current range lifecycle before synchronously rendering the requested page");
  assert(/function commitRangeLifecycle[\s\S]*?completeRangeLifecycleKey\(key,"committed",false\)/.test(app), "a local range viewport commit must release its render guard without waiting for a backend output terminal");
  assert(/RANGE_LIFECYCLE_MAX_ACTIVE_MS=30000[\s\S]*?pruneRangeLifecycles\(\)/.test(app), "disconnected or abandoned range interactions require a bounded frontend-only cleanup guard");

  assert(!/inspector-menu-title[^]*?Видимость столбцов/.test(app.slice(app.indexOf("function menuMarkup"), app.indexOf("function menuMarkup") + 900)), "cursor measurement columns must be appended to the existing flat visibility menu without a second heading");
  assert(/aria-disabled='"\+\(!item\.enabled\)\+"'[^]*?disabled/.test(app), "unavailable cursor columns must remain explicitly disabled rather than disappear");
  assert(/\[data-testid="measurement-columns-menu"\] \[data-measurement-cursor-column\]:disabled/.test(css), "disabled measurement-column controls require a stable disabled visual state");
  assert(/signal-values-action[^]*?background:\s*var\(--accent\)/.test(css) && /extrema-values[^]*?background:\s*var\(--accent\)/.test(css), "Values and Calculate footer actions must use the shared Primary MD color");
};
