"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSignalAnalyserDisplayStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const plotlyPath = path.join(root, "public/js/vendor/plotly-cartesian-3.1.0.min.js");
  const plotlyLicensePath = path.join(root, "public/js/vendor/plotly-cartesian-3.1.0.LICENSE");
  const plotly = fs.readFileSync(plotlyPath);
  const license = fs.readFileSync(plotlyLicensePath, "utf8");
  const crypto = require("crypto");

  ["app-shell", "display-tabs", "display-canvas", "active-plot-host", "plot-type-select", "settings-view-select", "signal-table", "toggle-all-signals", "bottom-panel-signals", "measurements-panel", "display-count-status", "active-display-status"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `missing stable Display UI selector ${id}`)
  );
  assert((html.match(/data-testid="active-plot-host"/g) || []).length === 1, "each active Display must own one graph host");
  assert(/data-testid="active-plot-host"[^>]*role="region"[^>]*aria-labelledby="display-plot-title"/.test(html), "the active graph host must expose its labelled region semantics");
  assert(/data-bottom-tab="signals"[^>]*role="tab"[^>]*aria-controls="bottom-panel-signals"[^>]*aria-selected="true"[^>]*tabindex="0"/.test(html), "Signals must initialize as the sole roving-tabindex tab");
  assert(/data-bottom-tab="measurements"[^>]*role="tab"[^>]*aria-controls="measurements-panel"[^>]*aria-selected="false"[^>]*tabindex="-1"/.test(html), "Measurements must initialize outside the tab sequence");
  assert(/id="bottom-panel-signals"[^>]*role="tabpanel"[^>]*aria-labelledby="signal-panel-tab-signals"/.test(html), "Signals panel must be labelled by its tab");
  assert(/id="measurements-panel"[^>]*role="tabpanel"[^>]*aria-labelledby="signal-panel-tab-measurements"/.test(html), "Measurements panel must be labelled by its tab");
  assert(!html.includes("plot-grid") && !html.includes("layout-chooser"), "MVP must not render a multi-layout plot grid");
  assert(html.includes("data-signal-rows") && app.includes("data-signal-visibility"), "signal list must contain per-signal checkbox controls at runtime");
  assert(/<script\b[^>]*src=["']\.\/js\/api\.js["']/.test(html) && /<script\b[^>]*src=["']\.\/js\/app\.js["']/.test(html), "Genie-relative API and app scripts must be registered");
  assert(!/\b(?:href|src)\s*=\s*["']\/(?:css|js)\//i.test(html), "frontend assets must remain Genie-relative, not root-absolute");
  assert(html.includes('./js/vendor/plotly-cartesian-3.1.0.min.js'), "Plotly must be loaded from the pinned local vendor asset before the app");
  assert(html.indexOf('./js/vendor/plotly-cartesian-3.1.0.min.js') < html.indexOf('./js/app.js'), "local Plotly must load before app.js");
  assert(crypto.createHash("sha256").update(plotly).digest("hex") === "c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38", "the bundled Plotly artifact must retain its reviewed SHA-256");
  assert(license.includes("MIT License") && license.includes("Plotly Technologies Inc."), "the bundled Plotly artifact must retain its matching MIT license notice");

  assert(api.includes('request("./api/state")'), "state API must use ./api/state");
  assert(api.includes('request("./api/view", {'), "view API must use ./api/view");
  assert(api.includes('request("./api/displays", {'), "Display lifecycle API must use ./api/displays");
  assert((api.match(/method: "POST"/g) || []).length >= 2, "view and displays mutations must POST JSON");

  ["active_display_id", "displays", "visible_signals", "row_selected_signal", "analysis_signal", "selected_signal", "displayMutation", "addDisplay", "selectDisplay", "closeDisplay", "pendingAction"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Display state contract term ${term}`)
  );
  assert(app.includes('displayMutation("create"') && app.includes('displayMutation("select"') && app.includes('displayMutation("close"'), "frontend must emit create/select/close Display operations");
  assert(app.includes("data-testid='close-display-"), "close controls must have stable per-display test IDs");
  assert(app.includes("data-signal-visibility") && app.includes("visible_signals"), "checkbox actions must update active Display membership");
  assert(/data-testid="display-overflow-trigger"[^>]*aria-haspopup="menu"[^>]*aria-controls="display-overflow-menu"/.test(html), "Display overflow must expose the accessible Clear Display menu trigger");
  assert(/data-testid="display-overflow-menu"[^>]*role="menu"[^>]*hidden/.test(html), "Display overflow menu must start hidden");
  assert(/data-testid="clear-display-action"[^>]*role="menuitem"/.test(html), "Clear Display must be a semantic menu action");
  ["row_selected_signal", "analysis_signal", "clear-display-action", "display-overflow-trigger"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 5 state/control term ${term}`)
  );
  assert(app.includes("payload.current") && app.includes("status===409"), "stale API responses must canonicalize from the authoritative snapshot");
  assert(app.includes("moduleName") && app.includes("window.Plotly"), "the local Plotly UMD moduleName export must normalize before rendering");
  assert(app.includes("loadPlotlyScript(localPlotlyUrl())"), "Plotly recovery must address only the pinned local artifact");
  assert(!/https?:\/\/|cdn\./i.test(app), "Plotly runtime must not load a CDN asset");
  assert(app.includes("activeBottomTab") && !app.includes("api.bottom"), "bottom Signals/Measurements tabs must remain frontend-local state");
  ["ArrowLeft", "ArrowRight", "Home", "End"].forEach((key) => assert(app.includes(`"${key}"`), `bottom tab keyboard navigation must support ${key}`));
  assert(app.includes("function activateBottomTab(tabId, focus)") && app.includes('tab.setAttribute("tabindex", selected ? "0" : "-1")') && app.includes("target.focus()"), "bottom tabs must apply roving tabindex through the shared activator and move focus to the selected tab");
  assert(/data-testid="find-peaks-action"[^>]*aria-pressed="false"[^>]*aria-controls="peaks-panel"/.test(html), "Find Peaks must expose a controlled capability toggle");
  assert(/data-testid="signal-statistics-action"[^>]*aria-controls="measurements-panel"[^>]*aria-label="Открыть измерения активного Display"/.test(html), "Signal statistics must expose its local Measurements destination accessibly");
  assert(/data-testid="time-min-input"[^>]*inputmode="decimal"/.test(html) && /data-testid="time-max-input"[^>]*inputmode="decimal"/.test(html), "Time Limits must expose typed seconds inputs");
  assert(/data-testid="time-limits-error"[^>]*role="alert"[^>]*hidden/.test(html), "Time Limits must reserve an accessible inline validation state");
  assert(/data-testid="peaks-panel-tab"[^>]*data-bottom-tab="peaks"[^>]*role="tab"[^>]*aria-controls="peaks-panel"[^>]*hidden/.test(html), "the local Peaks tab must start hidden and retain tab semantics");
  assert(/id="peaks-panel"[^>]*role="tabpanel"[^>]*aria-labelledby="peaks-panel-tab"[^>]*hidden/.test(html), "the Peaks table panel must be labelled by its local tab");
  ["peaks_enabled", "peaksBusyDisplayId", "peaksFor", "peakMarkerTrace", "find-peaks-action"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve the authoritative Peaks contract term ${term}`)
  );
  assert(!api.includes("./api/peaks") && !/findpeaks\s*\(/i.test(app), "frontend must not create a Peaks endpoint or calculate peaks in JavaScript");
  assert(app.includes("signal-statistics-action") && app.includes('activateBottomTab("measurements", true)'), "Signal statistics must activate and focus the local Measurements tab");
  assert(app.includes("p.items.map") && app.includes("item.time_s") && app.includes("item.value"), "peak markers must consume backend-provided peak items only");
  ["traceScale", "normalizedValues", "display.normalizeY", "display.showMarkers", "show-markers-checkbox", "normalize-y-checkbox"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 6 Time presentation term ${term}`)
  );
  assert(app.includes("plot === \"time\" && display.normalizeY") && app.includes("plot === \"time\" && display.showMarkers"), "normalization and ordinary markers must be constrained to Time traces");
  assert(app.includes("peakMarkerTrace(display, sourceScale)") && app.includes("normalizedValues(p.items.map"), "Peaks markers must align to the analysis-source normalization scale");
  assert(app.includes("analysis-source-affine-unclipped") && app.includes("plot-invalid-data-state") && app.includes("clearPlotHost()"), "Time presentation must retain unclipped Peak provenance and the stable invalid-data host state");
  assert(app.includes('plot === "time" && d.normalizeY ? true : undefined'), "Normalize-specific y-axis layout must be constrained to Time");
  assert(app.includes("Object.keys(change).every") && app.includes("showLegend") && app.includes("normalizeY") && app.includes("showMarkers"), "presentation toggles must remain local rather than create a view mutation");
  ["time_limits", "time-min-input", "time-max-input", "time-limits-error"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 7 Time Limits term ${term}`)
  );
  ["measurement_kinds", "statistics-settings-tab", "statistics-controls", "statistics-selection-error", "statistics-option-minimum", "statistics-option-maximum", "statistics-option-mean", "statistics-option-median", "statistics-option-peak_to_peak", "statistics-option-rms"].forEach((term) =>
    assert(html.includes(term) || app.includes(term), `frontend must preserve Cascade 8 selectable Statistics term ${term}`)
  );
  assert(/data-testid="statistics-controls"[^>]*role="group"/.test(html), "Statistics controls must expose an accessible native-checkbox group");
  assert((html.match(/data-testid="statistics-option-/g) || []).length === 6, "Statistics settings must expose exactly six stable metric controls");
  assert(app.includes("MEASUREMENT_KINDS") && app.includes("measurementKinds") && app.includes("measurementKindsCommit"), "Statistics must be canonicalized and revisioned by frontend state rather than calculated locally");
  assert(app.includes("measurementKindsErrors") && app.includes("fields.measurement_kinds"), "nested measurement_kinds validation errors must have a dedicated inline rollback path");
  ["spectrum-settings", "spectrum-scale-select", "spectrum-frequency-scale-select", "spectrum-leakage-input", "spectrum-settings-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Spectrum settings must expose stable selector ${id}`)
  );
  assert(/data-testid="spectrum-settings-error"[^>]*role="alert"[^>]*hidden/.test(html), "Spectrum settings must reserve an accessible inline validation state");
  assert(/data-testid="spectrum-leakage-input"[^>]*type="range"[^>]*min="0"[^>]*max="1"/.test(html), "Spectrum leakage must expose its bounded numeric control");
  ["spectrum-frequency-min-input", "spectrum-frequency-max-input", "spectrum-frequency-limits-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Frequency Limits must expose stable selector ${id}`)
  );
  assert(/data-testid="spectrum-frequency-min-input"[^>]*inputmode="decimal"/.test(html) && /data-testid="spectrum-frequency-max-input"[^>]*inputmode="decimal"/.test(html), "Frequency Limits must expose typed Hz inputs");
  assert(/data-testid="spectrum-frequency-limits-error"[^>]*role="alert"[^>]*hidden/.test(html), "Frequency Limits must reserve an accessible inline validation state");
  assert((html.match(/data-settings-tab=/g) || []).length === 3 && (html.match(/data-settings-panel=/g) || []).length === 3, "Frequency Limits must remain in the existing three settings tabs");
  ["spectrum_settings", "spectrumSettingsErrors", "bindSpectrumSettings", "renderSpectrumSettings", "frequency_scale", "hasVisibleComplexSignal"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 9 Spectrum settings term ${term}`)
  );
  assert(app.includes('xaxis.type = spectrumSettings(d.spectrum_settings).frequency_scale'), "Spectrum frequency scale must map to Spectrum x-axis layout only");
  assert(app.includes('option.value === "log") option.disabled = complex'), "Log Spectrum frequency scale must be unavailable with a visible complex signal");
  ["frequency_limits", "spectrumFrequencyLimits", "spectrum-frequency-min-input", "spectrum-frequency-max-input", "spectrum-frequency-limits-error"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 10 Frequency Limits term ${term}`)
  );
  assert(!/log[-_ ]?floor/i.test(html) && !/log[-_ ]?floor/i.test(app), "Cascade 10 must not add a Log-floor field or client-side floor calculation");
  ["spectrogram-time-resolution", "spectrogram-frequency-limits"].forEach((term) =>
    assert(!html.includes(term) && !app.includes(term), `Cascade 11 must not add unaccepted Spectrogram controls (${term})`)
  );
  assert((html.match(/data-settings-tab=/g) || []).length === 3, "Cascade 11 must preserve exactly three settings tabs");
  assert(!api.includes("spectrogram"), "Cascade 11 must not add a Spectrogram-specific route");
  assert(html.includes('data-testid="spectrogram-overlap-percent-input"'), "Cascade 12 must expose the stable Overlap input selector");
  assert(/data-testid="spectrogram-overlap-percent-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 12 must reserve an accessible Overlap inline error");
  assert(/data-testid="spectrogram-leakage-input"[^>]*type="range"[^>]*min="0"[^>]*max="1"[^>]*step="0\.01"/.test(html), "Cascade 13 must expose normalized Leakage range control");
  assert(/data-testid="spectrogram-leakage-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 13 must reserve an accessible Leakage inline error");
  ["spectrogram_settings", "overlap_percent", "leakage", "spectrogram-overlap-percent-input", "spectrogram-overlap-percent-error", "spectrogram-leakage-input", "spectrogram-leakage-error"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 13 Spectrogram settings term ${term}`)
  );
  assert((html.match(/data-settings-tab=/g) || []).length === 3, "Cascade 13 Leakage must remain inside exactly three settings tabs");
  assert(!api.includes("overlap") && !api.includes("leakage") && !api.includes("spectrogram_settings"), "Cascade 13 must reuse /api/view rather than add a Spectrogram settings route");
  assert(!/fft|stft|window\(/i.test(app), "Cascade 13 must not add client-side DSP");
  assert((app.match(/function renderStatisticsControls\(/g) || []).length === 1, "Statistics settings must have exactly one render function");
  assert((app.match(/function render\(/g) || []).length === 1, "frontend must retain exactly one render declaration");
  assert(!app.includes("function bindStatisticsShortcut("), "Statistics shortcut must not retain a dead duplicate binding path");
  [
    ["display-settings-tab", "display-settings-panel"],
    ["time-settings-tab", "time-settings-panel"],
    ["statistics-settings-tab", "measurements-settings-panel"],
  ].forEach(([tab, panel]) => {
    assert(new RegExp(`id="${tab}"[^>]*role="tab"[^>]*aria-controls="${panel}"`).test(html), `${tab} must own an accessible settings tab`);
    assert(new RegExp(`id="${panel}"[^>]*role="tabpanel"[^>]*aria-labelledby="${tab}"`).test(html), `${panel} must be the labelled panel for its settings tab`);
  });
  assert((html.match(/data-settings-panel=/g) || []).length === 3 && (html.match(/data-settings-tab=/g) || []).length === 3, "settings must expose exactly three tab/panel sections");
  assert(app.includes("[data-settings-panel]") && app.includes("panel.hidden = panel.dataset.settingsPanel !== activeSettingsTab"), "settings navigation must hide whole sections rather than only individual controls");
  assert(app.includes("bindSettingsKeyboard") && app.includes("ArrowLeft") && app.includes("ArrowRight") && app.includes('tabindex", on ? "0" : "-1"'), "settings tabs must support roving keyboard navigation");
  assert(/<section id="statistics-controls"[^>]*data-testid="statistics-controls"(?![^>]*\bhidden\b)/.test(html), "Statistics controls must not carry a literal hidden attribute once their Measurements tabpanel is selected");
  const displayPanelAt = html.indexOf('id="display-settings-panel"');
  const timePanelAt = html.indexOf('id="time-settings-panel"');
  const analysisAt = html.indexOf('data-display-settings-actions');
  assert(displayPanelAt >= 0 && analysisAt > displayPanelAt && analysisAt < timePanelAt, "Analysis actions must belong exclusively to the Display settings panel");
  assert(!/https?:\/\/|cdn\./i.test(app), "Peaks integration must not add a CDN dependency");
  assert(!/grid-template-(?:columns|rows)\s*:\s*repeat\(2/i.test(css), "MVP styling must not retain a fixed four-plot grid");
};
