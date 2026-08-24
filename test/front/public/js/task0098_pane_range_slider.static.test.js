"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testTask0098PaneRangeSliderStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const app = read("public/js/app.js");
  const css = read("public/css/app.css");

  const menu = (html.match(/<div class="menu compact-menu plot-menu"[\s\S]*?<\/div>/) || [""])[0];
  const clearIndex = menu.indexOf("Очистить область");
  const rangeIndex = menu.indexOf("Слайдер диапазона");
  const amplitudeIndex = menu.indexOf("Слайдер амплитуды");
  const helpIndex = menu.indexOf("Управление графиком");
  assert(clearIndex >= 0 && rangeIndex > clearIndex && amplitudeIndex > rangeIndex && helpIndex > amplitudeIndex, "the pane menu must preserve Clear and Graph Help with independent range and amplitude sliders between them");
  assert((menu.match(/role="menuitem"/g) || []).length === 2, "Clear and Graph Help must remain ordinary menu actions");
  assert(/role="menuitemcheckbox"[^>]*data-plot-range-slider|data-plot-range-slider[^>]*role="menuitemcheckbox"/.test(menu), "Range Slider must be a persistent checked menu toggle");
  assert(/data-plot-range-slider[\s\S]*aria-checked="false"/.test(menu), "the authored Range Slider toggle must default off");
  assert(/role="menuitemcheckbox"[^>]*data-plot-amplitude-slider|data-plot-amplitude-slider[^>]*role="menuitemcheckbox"/.test(menu), "Amplitude Slider must be a persistent checked menu toggle");
  assert(/data-plot-amplitude-slider[\s\S]*aria-checked="false"/.test(menu), "the authored Amplitude Slider toggle must default off");

  assert(/rangeslider[\s\S]*visible/.test(app) && /thickness\s*:\s*0\.15/.test(app), "the toggle must use Plotly's native visible rangeslider with exact 15% thickness");
  assert(/rangeslider[\s\S]*(?:bgcolor|background)[\s\S]*#ffffff/i.test(app), "the native overview must retain the white plot canvas");
  assert(/rangeslider[\s\S]*borderwidth\s*:\s*1/.test(app), "the native overview must retain its one-pixel border");
  assert(/Plotly\.relayout\(/.test(app), "Range Slider must update the already mounted Plotly host with relayout");
  assert(/data-plot-range-slider/.test(app) && /aria-checked/.test(app), "menu rendering must publish the live checked state");
  assert(/function togglePaneAmplitudeSlider\(\)/.test(app) && /"yaxis\.range\[0\]"/.test(app) && /"yaxis\.range\[1\]"/.test(app), "Amplitude Slider must independently relayout the existing Y axis");
  assert(/function rangeSliderFullRange\([\s\S]*Math\.min\(dataRange\[0\], selectedRange\[0\]\)[\s\S]*Math\.max\(dataRange\[1\], selectedRange\[1\]\)/.test(app), "both sliders must keep a full range that includes signal data and dragged handles");
  assert(/slider\.addEventListener\("dblclick"[\s\S]*amplitudeDataRangeByPane[\s\S]*queueAmplitudeRange/.test(app), "double-clicking the amplitude slider must restore its full signal range");
  assert(/function bindRangeSliderDoubleClick\([\s\S]*\.rangeslider-container[\s\S]*resetHorizontalRange[\s\S]*addEventListener\("pointerdown"[\s\S]*previousPointerDown/.test(app) && /resetRangeLifecycle[\s\S]*auto:true/.test(app), "two nearby pointer-down events on the horizontal Plotly slider must perform the shared Auto reset without a competing pass");
  assert(/function resetGraphRange\([\s\S]*resetRangeLifecycle[\s\S]*stopImmediatePropagation/.test(app) && /function resetRangeLifecycle[\s\S]*auto:true[\s\S]*generation/.test(app), "the first graph double-click must create one atomic Auto-reset generation and suppress Plotly's competing pass");
  assert(/target\.closest\("\.nsewdrag"\)[\s\S]*pointerDown\.kind[\s\S]*resetGraphRange\(event\)/.test(app), "two primary pointer-downs on the Plotly graph surface must own the deterministic graph reset");
  assert(/Object\.assign\(\{\}, payload\.config \|\| \{\}, \{[^}]*doubleClick:false/.test(app), "every Plotly render must disable its competing built-in double-click autorange");
  assert(/Object\.assign\(\{ paper_bgcolor:"#ffffff", plot_bgcolor:"#ffffff", showlegend:true \}, source, \{ hovermode:false \}\)/.test(app), "every Plotly layout must suppress hover value/name labels while retaining graph interaction");
  assert(/graphDefaultSignatureByPane[\s\S]*defaultChanged[\s\S]*graphDefaultRangeByPane[\s\S]*fullLayout\.xaxis[\s\S]*fullLayout\.yaxis/.test(app), "each presentation signature must retain the exact rendered default axis ranges instead of recomputing a different first reset");
  assert(/result\.legend\s*=\s*Object\.assign\([\s\S]*x\s*:\s*0\.99[\s\S]*xanchor\s*:\s*"right"[\s\S]*y\s*:\s*0\.99[\s\S]*yanchor\s*:\s*"top"/.test(app), "Plotly legend placement must be forced inside the graph at top right");
  assert(/r\s*:\s*amplitudeEnabled\s*\?\s*48\s*:\s*12/.test(app), "the in-plot legend must remove the obsolete side-column margin while retaining the amplitude-slider margin");
  assert(/доступен только для загруженной области/.test(app), "disabled states must explain the ready Time or Spectrum pane requirement in Russian");

  assert(/\.plot-menu-check/.test(css), "the checked state must reserve a trailing canonical check affordance");
  assert(/\.range-slider-menu-icon/.test(css), "the toggle must retain a dedicated 16px overview glyph");
  assert(/\.amplitude-slider-menu-icon/.test(css), "the mirrored amplitude toggle must retain its own vertical overview glyph");
  assert(/\.amplitude-slider\s*\{[\s\S]*position\s*:\s*absolute[\s\S]*\.amplitude-slider-rail[\s\S]*\.amplitude-slider-window[\s\S]*\.amplitude-slider-handle/.test(css), "Amplitude Slider must be a compact in-plot vertical rail with a window and two handles");
  assert(/\.menu button:focus-visible/.test(css), "the Range Slider menu row must inherit an explicit keyboard focus state");
  assert(/\.menu button:disabled/.test(css) && /\[data-plot-range-slider\]:disabled/.test(css), "the unavailable Range Slider row and glyph must have explicit disabled selectors");
  assert(/\[data-plot-amplitude-slider\]:disabled/.test(css), "the unavailable Amplitude Slider row and glyph must have explicit disabled selectors");

  assert(/data-plot-clear/.test(app) && /data-plot-help/.test(app), "the retained Clear and Graph Help actions must have runtime handlers");
  assert(/data-graph-help-close/.test(app) && /Escape/.test(app), "Graph Help must retain close-button and Escape handling");
  assert(/operation\s*:\s*["']update_pane["'][\s\S]*signal_bindings\s*:\s*\[\]/.test(app), "Clear must use update_pane with an empty binding list");
  assert(/function positionPaneMenu\(\)[\s\S]*anchoredMenuPosition[\s\S]*shell\.getBoundingClientRect\(\)[\s\S]*window\.innerWidth[\s\S]*window\.innerHeight/.test(app), "the pane menu must retain shell-and-viewport clamped below-or-above placement");
};
