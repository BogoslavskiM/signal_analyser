"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0126IntegratedRegression(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const expectedJet = ["#000080", "#0000d1", "#0010ff", "#0058ff", "#00a4ff", "#06ecf1", "#40ffb7", "#7dff7a", "#b7ff40", "#f1fc06", "#ffb900", "#ff7300", "#ff3000", "#d10000", "#800000"];

  const paletteLiterals = app.match(/var (?:jetPalette|palette) = \[([^\]]+)\]/g) || [];
  assert(paletteLiterals.length >= 2 && paletteLiterals.every((literal) => expectedJet.every((color) => literal.includes(`"${color}"`)) && (literal.match(/#[0-9a-f]{6}/gi) || []).length === expectedJet.length), "the Signal settings picker and its fallback must use the exact approved 15-color Jet identity");
  assert(/var summaryFields = \[[\s\S]*?\["sample_count", "Отсчёты"\][\s\S]*?\["region_start", "Начало области"\][\s\S]*?\["minimum_position", "Время минимума"\][\s\S]*?\["maximum_position", "Время максимума"\][\s\S]*?\["median", "Медиана"\][\s\S]*?\["peak_to_peak", "Размах"\][\s\S]*?\["rms", "СКЗ"\]/.test(app) && /function signalSummaryMetrics\([\s\S]*?minimum_sample_index[\s\S]*?maximum_sample_index[\s\S]*?summary\.peak_to_peak == null \? summary\.range/.test(app), "Signal summary must render complete returned metrics, positions/indices and range fallback");
  assert(/var noHistory=" autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'"/.test(app) && /data-signal-metadata='name'"\+noHistory[\s\S]*?data-signal-metadata='color'[\s\S]*?data-signal-metadata='sample_rate_hz'/.test(app) && /function decorateNoHistory\(root\)[\s\S]*?input\.setAttribute\("autocomplete", "off"\)/.test(app), "Signal inputs must opt out of autocomplete/history both explicitly and after dynamic render");
  assert(/function projectNamePreview\(detail\)[\s\S]*?model\.namePreview\.displays[\s\S]*?model\.namePreview\.panes/.test(app) && /signal-settings-name-preview/.test(app) && /signal-settings-save-failed[\s\S]*?clearNamePreview/.test(app) && /reconcileNamePreviews\(snapshot\)/.test(app), "Screen and Area names must render optimistically then reconcile accepted snapshots or revert failures");
  assert(/function canonicalFromVisible\(value, unit\)[\s\S]*?helper\.toCanonical/.test(settings) && /function visibleFromCanonical\(value, unit\)[\s\S]*?helper\.projectCanonical/.test(settings) && /reprojectRangeForUnitChange[\s\S]*?current\.min == null \? ""[\s\S]*?current\.max == null \? ""/.test(settings), "unit changes must preserve canonical bounds, round-trip projected inputs, and retain empty automatic endpoints");
  assert(app.includes("function currentPeaksVisibleRange") && app.includes("host._fullLayout.xaxis.range") && app.includes("task0126.effectiveViewport") && app.includes("min_s:canonical[0]") && app.includes("max_s:canonical[1]") && app.includes("min_hz:canonical[0]") && app.includes("max_hz:canonical[1]") && app.includes("var payload={ state_revision:model.revision, display_id:displayId, pane_id:paneId };") && app.includes("if (visibleRange) payload.visible_range=visibleRange;") && app.includes("api.calculateActivePeaks(payload)"), "TIME and SPECTRUM extrema requests must send the current Plotly X viewport as canonical visible_range");
  assert(/function setBusyPreservingCheckboxes\(root, busy\)[\s\S]*?input\[type='checkbox'\][\s\S]*?checkbox\.disabled=true[\s\S]*?wasDisabledBeforeBusy/.test(app) && /function setCheckboxRegionBusy\(root, busy\)[\s\S]*?task0126\.setBusyPreservingCheckboxes/.test(app) && /setCheckboxRegionBusy\(region, busy\)/.test(app) && /setCheckboxRegionBusy\(layer\.querySelector\("\[data-testid='signal-add-variables'\]"\), true\)/.test(app), "Signal and Engee-add checked controls must remain rendered/checked while loading or mutating");
};
