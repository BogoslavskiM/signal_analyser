"use strict";

const fs = require("fs");
const path = require("path");

function cssRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  if (!match) throw new Error(`missing CSS rule ${selector}`);
  return match[1];
}

function registeredBlock(source, name) {
  const start = source.indexOf(`(function ${name}`);
  const end = source.indexOf("}(window));", start);
  if (start < 0 || end < 0) throw new Error(`missing ${name}`);
  return source.slice(start, end + "}(window));".length);
}

module.exports = async function task0724V61UiRegressions(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const valueSelect = fs.readFileSync(path.join(root, "public/js/value-select.js"), "utf8");

  // The crop control is a true 28px header cell, joined directly to the type selector.
  const trim = cssRule(css, ".pane-trim-action");
  assert(/height:\s*28px/.test(trim) && /min-height:\s*28px/.test(trim) && /max-height:\s*28px/.test(trim), "trim action must be a 28px header-cell control");
  assert(/border-right:\s*0/.test(trim) && /border-radius:\s*var\(--control-radius, 6px\) 0 0 var\(--control-radius, 6px\)/.test(trim), "trim action must join the selector without a doubled middle divider");
  assert(/\.plot-control-cluster\s*\{[^}]*gap:\s*0/.test(css) && /select\.insertAdjacentHTML\("beforebegin",helper\.actionMarkup\(\)\)/.test(app), "trim action must be inserted as the first cell of the existing zero-gap header cluster");
  const joinedSelector = cssRule(css, ".plot-control-cluster > .pane-trim-action:not([hidden]) + .pane-select");
  assert(/border-left-color:\s*var\(--line\)/.test(joinedSelector) && /border-radius:\s*0/.test(joinedSelector), "the adjacent type selector must provide the single shared divider and squared join");

  // V67 keeps the crop cell vertically centered and makes the outer pane
  // selector its only chrome owner, preventing a nested input frame/gap.
  assert(/\.plot-control-cluster > \.pane-trim-action\s*\{[^}]*align-self:\s*center/.test(css), "trim must be vertically centered in the 32px pane header");
  const nestedInput = (css.match(/\.plot-control-cluster > \.pane-select > \.select-trigger-input\[data-dropdown-trigger\]\[role="combobox"\][\s\S]*?\n\}/) || [""])[0];
  assert(nestedInput, "the inner pane combobox neutralization rule must exist");
  assert(/height:\s*100%/.test(nestedInput) && /min-height:\s*0/.test(nestedInput) && /border:\s*0/.test(nestedInput) && /border-radius:\s*0/.test(nestedInput) && /outline:\s*0/.test(nestedInput) && /box-shadow:\s*none/.test(nestedInput), "the inner readonly pane combobox must be neutral semantic content without a second frame or rounding");

  // V68 removes tab-row text actions. Ready extrema rows reserve the final
  // table cell for icon-only clear/recalculate; no-table states stay centered.
  assert(!/extrema-header-actions|header-clear|header-action/.test(app), "legacy inspector tab-row Extrema actions must be absent");
  assert(/<col style='width:64px'><\/colgroup>/.test(app) && /var actions = tableActions\.headerActionsMarkup\("\.\/icons"\)/.test(app) && /<td aria-hidden='true'><\/td>/.test(app), "ready extrema tables must reserve a final 64px header/cell column for alignment");
  assert(/data-testid='extrema-table-clear'[\s\S]*?data-tooltip='Очистить экстремумы'[\s\S]*?trash-16\.svg[\s\S]*?data-testid='extrema-table-recalculate'[\s\S]*?data-tooltip='Пересчитать для актуальных диапазонов'[\s\S]*?refresh-16\.svg/.test(app), "ready extrema actions must be exact trash-left and reload-right icon controls");
  const actionCell = cssRule(css, ".extrema-table-actions-cell");
  const actionGroup = cssRule(css, ".extrema-table-actions");
  const actionButton = cssRule(css, ".extrema-table-icon-action");
  assert(/width:\s*64px/.test(actionCell) && /width:\s*64px/.test(actionGroup) && /grid-template-columns:\s*repeat\(2, 32px\)/.test(actionGroup) && /width:\s*32px/.test(actionButton) && /height:\s*31px/.test(actionButton) && /\.extrema-table-icon-action img\s*\{[^}]*width:\s*16px/.test(css), "V68 action geometry must be one 64px cell with two 32×31 targets and 16px icons");
  assert(/\.extrema-no-table-state\s*\{[^}]*place-items:\s*center[\s\S]*?\.extrema-surface-calculate\s*\{[^}]*display:\s*inline-flex[\s\S]*?\.extrema-calculate-spinner\[hidden\]/.test(css), "all no-table states must center the stable Calculate control and hide its spinner until pending");

  // Settings work only projects ranges; it can never create either in-plot slider.
  const window = {};
  require("vm").runInNewContext(registeredBlock(app, "registerSignalAnalyserTask0153"), { window, Object, String, Array, Number, Math, JSON });
  const ranges = window.SignalAnalyserTask0153;
  assert(ranges, "range regression controller must be registered");
  ["edit", "apply"].forEach((phase) => {
    const projection = ranges.settingsRangeProjection({ xRangeSliderVisible: false, yRangeSliderVisible: false }, phase);
    assert(projection.xRangeSliderVisible === false && projection.yRangeSliderVisible === false && projection.mountHorizontalPaneSlider === false && projection.mountVerticalPaneSlider === false && projection.sliderVisibilityMutation === false, `settings ${phase} must not enable an in-plot slider`);
  });
  const autoscale = ranges.plotDoubleClickProjection({ xRangeSliderVisible: false, yRangeSliderVisible: false });
  assert(autoscale.trueAutorange && autoscale.xRangeSliderVisible === false && autoscale.yRangeSliderVisible === false && autoscale.sliderVisibilityMutation === false, "graph double-click autoscale must not make a horizontal or vertical slider appear");

  // Every plot refresh writes an explicit false, preventing Plotly from retaining an old slider.
  const plotLayout = app.slice(app.indexOf("function plotLayoutWithRangeSlider"), app.indexOf("function amplitudeRangeFromHost"));
  assert(/result\.xaxis\.rangeslider\s*=\s*Object\.assign\([^;]*?\{ visible:enabled \}\)/.test(plotLayout), "plot layout must force rangeslider visible:false whenever its tool is off");

  // One visual selector owns the operation icon and label: no separator node or pseudo-divider.
  assert(/iconMarkup\(icon,"select-trigger-icon","data-value-select-trigger-icon"/.test(valueSelect) && /iconMarkup\(option\.icon,"select-option-icon","data-value-select-option-icon"/.test(valueSelect), "operation selector must render the selected and menu-option icons through the shared selector");
  assert(!/divider|separator/.test(valueSelect), "shared operation selector markup must not introduce an icon/text divider");
  const iconRule = cssRule(css, ".signal-operation-row .select-trigger-icon");
  assert(/border:\s*0/.test(iconRule) && /background:\s*transparent/.test(iconRule) && /box-shadow:\s*none/.test(iconRule), "operation trigger icon must be visually integrated rather than a separate boxed cell");
  assert(/\.signal-operation-row \.value-select-trigger\.has-leading-icon::before,[\s\S]*?content:\s*none/.test(css), "operation selector must neutralize inherited leading-icon pseudo separators");

  // Keep the supported preprocessing inventory and its semantic icon mapping exact.
  const operationBlock = registeredBlock(app, "registerSignalAnalyserPreprocessOperation");
  const expectedIcons = {
    bandpass: "operation-bandpass.svg",
    bandstop: "operation-bandstop.svg",
    highpass: "operation-highpass.svg",
    lowpass: "operation-lowpass.svg",
    detrend: "operation-detrend.svg",
    "fill-missing": "operation-fill-missing.svg",
    smooth: "operation-smooth.svg",
    envelope: "operation-envelope.svg",
    resample: "operation-resample.svg",
    "custom-preprocess": "operation-custom.svg"
  };
  const mappings = [...operationBlock.matchAll(/\{value:"([^"]+)",label:"[^"]+",engee:"[^"]+",iconAsset:"([^"]+)"\}/g)];
  assert(mappings.length === 10, "operation selector must expose exactly ten supported preprocessing operations");
  assert(JSON.stringify(Object.fromEntries(mappings.map((match) => [match[1], match[2]]))) === JSON.stringify(expectedIcons), "each preprocessing operation must retain its exact semantic icon asset");
  const distinctAssets = new Set(Object.values(expectedIcons));
  assert(distinctAssets.size === 10 && !operationBlock.includes("operation-filter.svg") && !operationBlock.includes("function.svg"), "operation choices must not fall back to generic filter/function imagery");
  distinctAssets.forEach((asset) => {
    const svg = fs.readFileSync(path.join(root, "public/icons", asset), "utf8");
    assert(/<svg\b[^>]*\bwidth="16"[^>]*\bheight="16"[^>]*\bviewBox="0 0 16 16"/.test(svg) && /<(?:path|circle|line|polyline)\b/.test(svg), `${asset} must be a compact semantic SVG icon`);
  });
};
