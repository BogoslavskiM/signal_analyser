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
  const helpIndex = menu.indexOf("Управление графиком");
  assert(clearIndex >= 0 && rangeIndex > clearIndex && helpIndex > rangeIndex, "the pane menu must preserve Clear and Graph Help with Range Slider exactly between them");
  assert((menu.match(/role="menuitem"/g) || []).length === 2, "Clear and Graph Help must remain ordinary menu actions");
  assert(/role="menuitemcheckbox"[^>]*data-plot-range-slider|data-plot-range-slider[^>]*role="menuitemcheckbox"/.test(menu), "Range Slider must be a persistent checked menu toggle");
  assert(/data-plot-range-slider[\s\S]*aria-checked="false"/.test(menu), "the authored Range Slider toggle must default off");

  assert(/rangeslider[\s\S]*visible/.test(app) && /thickness\s*:\s*0\.15/.test(app), "the toggle must use Plotly's native visible rangeslider with exact 15% thickness");
  assert(/rangeslider[\s\S]*(?:bgcolor|background)[\s\S]*#ffffff/i.test(app), "the native overview must retain the white plot canvas");
  assert(/rangeslider[\s\S]*borderwidth\s*:\s*1/.test(app), "the native overview must retain its one-pixel border");
  assert(/Plotly\.relayout\(/.test(app), "Range Slider must update the already mounted Plotly host with relayout");
  assert(/data-plot-range-slider/.test(app) && /aria-checked/.test(app), "menu rendering must publish the live checked state");
  assert(/доступен только для загруженной временной области/.test(app), "disabled states must explain the ready temporal pane requirement in Russian");

  assert(/\.plot-menu-check/.test(css), "the checked state must reserve a trailing canonical check affordance");
  assert(/\.range-slider-menu-icon/.test(css), "the toggle must retain a dedicated 16px overview glyph");
  assert(/\.menu button:focus-visible/.test(css), "the Range Slider menu row must inherit an explicit keyboard focus state");
  assert(/\.menu button:disabled/.test(css) && /\[data-plot-range-slider\]:disabled/.test(css), "the unavailable Range Slider row and glyph must have explicit disabled selectors");

  assert(/data-plot-clear/.test(app) && /data-plot-help/.test(app), "the retained Clear and Graph Help actions must have runtime handlers");
  assert(/data-graph-help-close/.test(app) && /Escape/.test(app), "Graph Help must retain close-button and Escape handling");
  assert(/operation\s*:\s*["']update_pane["'][\s\S]*signal_bindings\s*:\s*\[\]/.test(app), "Clear must use update_pane with an empty binding list");
  assert(/function positionPaneMenu\(\)[\s\S]*window\.innerWidth[\s\S]*window\.innerHeight[\s\S]*rect\.top - height - 4/.test(app), "the pane menu must retain viewport-clamped below-or-above placement");
};
