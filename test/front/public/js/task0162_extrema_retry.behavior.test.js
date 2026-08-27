"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function block(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`missing production block: ${startMarker}`);
  return source.slice(start, end);
}

function actionController(app, assert) {
  const start = app.indexOf("(function (root) {\n  \"use strict\";\n\n  var LABELS");
  const end = app.indexOf("}(typeof window !== \"undefined\" ? window : globalThis));", start);
  assert(start >= 0 && end >= 0, "shared extrema action controller must be registered");
  const window = {};
  vm.runInNewContext(app.slice(start, end) + "}(window));", { window, String, Object, Boolean, Promise }, { filename:"public/js/app.js:extrema-action" });
  return window.SignalAnalyserExtremaAction;
}

module.exports = async function task0162ExtremaRetryV63(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const valueSelect = fs.readFileSync(path.join(root, "public/js/value-select.js"), "utf8");
  const action = actionController(app, assert);

  [
    ["idle", "Рассчитать", "Рассчитать экстремумы", false],
    ["error", "Рассчитать ещё раз", "Повторить расчёт экстремумов", false],
    ["ready", "Пересчитать", "Пересчитать для актуальных диапазонов", false],
    ["empty", "Пересчитать", "Пересчитать для актуальных диапазонов", false],
    ["pending", "Рассчитывается…", "Расчёт экстремумов выполняется", true]
  ].forEach(([state, label, tooltip, disabled]) => {
    const view = action.presentation(state);
    assert(view.label === label && view.tooltip === tooltip && view.disabled === disabled, `V63 ${state} action must retain exact short label, full tooltip and pending-only disabled state`);
    const button = { textContent:"", disabled:false, dataset:{}, attributes:{}, setAttribute(name, value) { this.attributes[name] = value; } };
    action.project(button, state);
    assert(button.textContent === label && button.attributes.title === tooltip && button.attributes["aria-label"] === tooltip && button.disabled === disabled, `V63 ${state} action projection must update its existing button node`);
  });

  const header = block(app, "  var inspectorExtremaActionMarkup", "\n  function renderPeaksInspector");
  const inspector = block(app, "  function renderPeaksInspector", "\n  function peaksSettingsKey");
  assert(/data-testid="extrema-header-action"/.test(header) && /data-extrema-action/.test(header), "one semantic extrema action must be declared for the inspector header");
  assert(/controls\.insertAdjacentHTML\("beforebegin",inspectorExtremaActionMarkup\)/.test(header), "header action must be immediately before inspector collapse/state controls");
  assert(/model\.inspectorPage === "peaks" && extremaTabsAvailable\(pane\)/.test(header) && /button\.hidden=!visible/.test(header), "header action must be visible only on the available Extrema inspector page");
  assert(/function renderInspector\(\)[\s\S]*?renderInspectorExtremaAction\(pane\)/.test(app), "inspector refresh must project header action state without moving it into the body");
  assert(!/data-extrema-action|extrema-header-action|inspectorExtremaAction/.test(inspector), "Extrema table body must not render a duplicate calculation action");
  assert(/button\.dataset\.extremaAction !== undefined\) return void calculatePeaks\(\)/.test(app), "the header action must be handled by the normal clickable extrema calculation path");

  const responseGuard = block(app, "  function peaksResponseContextIsCurrent", "\n  function peaksResponseIsCurrent");
  const revisionGuard = block(app, "  function peaksResponseIsCurrent", "\n  function schedulePeaksPoll");
  const schedule = block(app, "  function schedulePeaksPoll", "\n  function acceptPeaksPayload");
  const fetch = block(app, "  function fetchActivePeaks", "\n  function ensurePeaksEnabled");
  const settingsTab = block(app, "    if (button.dataset.settingsPage)", "\n    if (button.dataset.paneMenu)");
  const inspectorTab = block(app, "    if (button.dataset.bottomTab)", "\n    if (button.dataset.toastClose");
  [responseGuard, schedule, fetch].forEach((source) => assert(!/peaksSurfaceActive/.test(source), "background extrema guards must not depend on the visible Settings/Inspector page"));
  assert(/token !== model\.peaksTokens\[runtimeKey\]/.test(responseGuard) && /activeDisplay\(\)\.id !== displayId/.test(responseGuard) && /model\.activePane !== paneId/.test(responseGuard), "background extrema response guard must retain token, display and pane identity checks");
  assert(/stateRevision\(response\)[\s\S]*?model\.revision/.test(revisionGuard), "background extrema response guard must retain state-revision protection");
  assert(/fetchActivePeaks\(displayId, paneId, true, true\)/.test(schedule), "pending context must continue passive polling by its immutable display/pane key");
  assert(!/stopPeaksPolling/.test(settingsTab) && !/stopPeaksPolling/.test(inspectorTab), "Settings and inspector tab activation must not cancel a pending extrema poll");

  const triggerMarkup = block(valueSelect, "  function triggerMarkup(config)", "\n  function setAttribute");
  const buttonBranch = block(triggerMarkup, "    if (config.buttonTrigger)", "\n    return \"<div class='value-select-trigger");
  const keyboard = block(valueSelect, "  document.addEventListener(\"keydown\"", "\n  window.addEventListener(\"resize\"");
  const choose = block(valueSelect, "  function choose(index)", "\n  document.addEventListener(\"click\"");
  assert(/buttonTrigger:config\.buttonTrigger === true \|\| key === "signal-operation-type"/.test(valueSelect), "only the operation selector must opt into the button trigger variant");
  assert(/return "<button class='value-select-trigger/.test(buttonBranch) && /role='combobox'/.test(buttonBranch) && /select-trigger-label/.test(buttonBranch) && /select-trigger-arrow/.test(buttonBranch), "operation selector must be one outer combobox button with label and decorative arrow");
  assert(!/<input|<button[^>]*select-trigger-arrow/.test(buttonBranch), "operation selector outer trigger must contain neither an input nor nested button");
  assert(/focusTargetFor\(key\)/.test(valueSelect) && /config && config\.buttonTrigger \? trigger : inputFor\(key\)/.test(valueSelect), "button trigger focus target must be the outer operation button");
  assert(/\["Enter", " ", "ArrowDown", "ArrowUp"\]/.test(keyboard) && /event\.key === "Escape"/.test(keyboard) && /event\.key === "Tab"/.test(keyboard), "operation trigger must retain keyboard open/select/close/Tab behavior");
  assert(/var original=focusTargetFor\(key\)/.test(choose) && /var replacement=focusTargetFor\(key\)/.test(choose) && /replacement\.focus\(\)/.test(choose), "operation selection must restore focus to the outer trigger");
};
