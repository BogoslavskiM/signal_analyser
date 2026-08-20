"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0119SignalFlowStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  // A plot-type mutation is context changing: it may retain Plotly while in
  // flight, but its accepted snapshot must put Area settings on screen.
  assert(/mutationOptions\.focusAreaAfterPlotTypeChange = plotTypeChanged/.test(app), "plot-type changes must mark the successful Area-focus transition");
  assert(/if \(mutationOptions\.focusAreaAfterPlotTypeChange\)[\s\S]*?currentPane\.plot_type === payload\.plot_type[\s\S]*?model\.settingsPage = "display"[\s\S]*?renderSettings\(currentDisplay\)/.test(app), "only the accepted plot-type snapshot may switch to Area settings");

  // The main signal owns a stable values tab without requiring the Values
  // button. Its removal is reserved for an absent main signal, not an empty
  // page or a checkbox visibility change.
  assert(/function syncSignalSamplesWithMain\(openInspector\)[\s\S]*?if \(!signal\) \{[\s\S]*?tab\.remove\(\)[\s\S]*?model\.inspectorPage === "samples"[\s\S]*?model\.inspectorPage="signals"/.test(app), "sample tab must disappear only when there is no main signal");
  assert(/if \(!tab\) \{ tab=document\.createElement\("button"\)[\s\S]*?tab\.dataset\.bottomTab="samples"[\s\S]*?tab\.textContent=signal\.name/.test(app), "a main signal must create and name the stable sample tab automatically");
  assert(/renderInspector\(\)[\s\S]*?syncSignalSamplesWithMain\(false\)/.test(app), "ordinary inspector renders must keep the sample tab synchronized without Values");
  assert(/data-testid='samples-table-scroll'[\s\S]*?<th>№ точки<\/th><th>Время<\/th><th>Значение<\/th><th>Модуль<\/th><th>Квадрат<\/th>[\s\S]*?state\.rows\.map/.test(app), "selected sample tab must visibly render all five columns and received rows");
  assert(/if \(!state\.rows\.length && !state\.loading\) loadSignalSamples\(\)/.test(app), "an empty main-signal page must request its first page rather than remain blank");

  // Metadata editing is strict and local until the shared Apply action. Bad
  // decimal text must disable Apply and cannot reach the metadata API.
  assert(/function signalSampleRateValidation\(raw\)[\s\S]*?numeric\.parse\(raw, "decimal"\)[\s\S]*?parsed\.value <= 0/.test(app), "sample rate must use strict decimal parsing and reject non-positive values");
  assert(/data-signal-metadata='sample_rate_hz'[\s\S]*?aria-invalid/.test(app), "the sample-rate control must expose immediate invalid state");
  assert(/if \(!sampleRate\.valid\) \{ showToast\(sampleRate\.error, true\); return; \}/.test(app), "invalid sample rate must stop Signal autosave before an API request");
  const apply = (app.match(/function applySignalMetadata\(\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/var sampleRate=signalSampleRateValidation\(editor\.draft\.sample_rate_hz\);[\s\S]*?if \(!sampleRate\.valid\) \{ showToast[\s\S]*?return;[\s\S]*?api\.updateSignalMetadata\([\s\S]*?sample_rate_hz:sampleRate\.value/.test(apply), "metadata API must execute only after the parsed rate is valid");

  // The overwrite option must be a complete standard checkbox row, never a
  // clipped label embedded in the 32px checkbox target.
  assert(/label class='operation-overwrite-control'[\s\S]*?<span class='checkbox-control'><input type='checkbox' data-signal-operation-overwrite/.test(app), "operation overwrite must expose a standalone checkbox control");
  assert(/\.operation-overwrite-control \{[^}]*min-height:\s*32px[^}]*display:\s*inline-flex[^}]*align-items:\s*center/.test(css), "operation overwrite must retain a full aligned control row");

  // The compact picker is deliberately a Signal-draft editor: exact Jet
  // palette, no extra chart controls, and no metadata API until normal Apply.
  const jet = ["#000080", "#0000d1", "#0010ff", "#0058ff", "#00a4ff", "#06ecf1", "#40ffb7", "#7dff7a", "#b7ff40", "#f1fc06", "#ffb900", "#ff7300", "#ff3000", "#d10000", "#800000"];
  const picker = (app.match(/\(function registerSignalColorPicker[\s\S]*?\}\(window, document\)\);/) || [""])[0];
  assert(jet.every((color) => picker.includes(`"${color}"`)), "picker must contain the exact fifteen-color Jet palette");
  assert((picker.match(/#[0-9a-f]{6}/gi) || []).filter((color) => jet.includes(color.toLowerCase())).length === 15, "picker must not duplicate or omit a Jet swatch");
  assert(/data-testid='signal-color-picker'[\s\S]*?Палитра Jet[\s\S]*?data-color-picker-cancel[\s\S]*?data-color-picker-apply/.test(picker), "picker must expose compact Jet palette plus Cancel/Apply actions");
  assert(/width:\s*var\(--signal-color-picker-width\)/.test(css) && /--signal-color-picker-width:\s*284px/.test(css), "picker width must remain the approved 284px");
  assert(/function close\(commit\)[\s\S]*?if \(!commit\) \{ preview\(initialColor, "cancel"\)/.test(picker), "Cancel must restore the pre-open draft color");
  assert(/function commit\(\)[\s\S]*?sourceInput\.value = color; sourceInput\.dispatchEvent\(new Event\("input", \{ bubbles:true \}\)\)/.test(picker), "picker Apply must update only the existing Signal draft through its normal input seam");
  assert(!/updateSignalMetadata|\/api\/signals/.test(picker), "picker must not bypass the normal Signal Apply API boundary");

  // Extrema surfaces are intentionally limited to Time and Spectrum; the
  // area settings page itself stays available for every plot kind.
  assert(/function extremaTabsAvailable\(pane\)[\s\S]*?\["time", "spectrum"\]/.test(app), "Extrema must be available for Time and Spectrum only");
  assert(/function contextTabAvailable\(page, pane\) \{\s*return page === "signal" \? !!mainSignalForPane\(pane\) : page !== "peaks" \|\| extremaTabsAvailable\(pane\);/.test(app), "only Extrema tabs may disappear for Spectrogram; Area/Screen remain available and Signal follows main signal");
};
